export type Raster = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type Pt = [number, number];

export type Bubble = {
  id: number;
  polygon: Pt[];
};

export type BubbleMap = {
  bubbles: Bubble[];
  scale: number;
  maskW: number;
  maskH: number;
  mask: Uint8Array;
};

const MAX_W = 420;

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type Comp = {
  id: number;
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function components(bin: Uint8Array, maskW: number, maskH: number): { labels: Int32Array; comps: Comp[] } {
  const labels = new Int32Array(bin.length);
  const comps: Comp[] = [];
  const stack: number[] = [];
  let nextId = 0;

  for (let i = 0; i < bin.length; i++) {
    if (!bin[i] || labels[i]) continue;
    nextId++;
    let area = 0;
    let minX = maskW;
    let minY = maskH;
    let maxX = 0;
    let maxY = 0;
    stack.push(i);
    labels[i] = nextId;
    while (stack.length) {
      const p = stack.pop() as number;
      area++;
      const x = p % maskW;
      const y = (p / maskW) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const tryPush = (n: number) => {
        if (bin[n] && !labels[n]) {
          labels[n] = nextId;
          stack.push(n);
        }
      };
      if (x > 0) tryPush(p - 1);
      if (x + 1 < maskW) tryPush(p + 1);
      if (y > 0) tryPush(p - maskW);
      if (y + 1 < maskH) tryPush(p + maskW);
    }
    comps.push({ id: nextId, area, minX, minY, maxX, maxY });
  }
  return { labels, comps };
}

function cross(o: Pt, a: Pt, b: Pt) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points;
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expand(points: Pt[], pad: number): Pt[] {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  cx /= points.length;
  cy /= points.length;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * pad, y + (dy / len) * pad] as Pt;
  });
}

function dilate(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (src[p]) {
        out[p] = 1;
        continue;
      }
      if (x > 0 && src[p - 1]) out[p] = 1;
      else if (x + 1 < w && src[p + 1]) out[p] = 1;
      else if (y > 0 && src[p - w]) out[p] = 1;
      else if (y + 1 < h && src[p + w]) out[p] = 1;
    }
  }
  return out;
}

function paintPolygon(mask: Uint8Array, maskW: number, maskH: number, polygon: Pt[]) {
  if (polygon.length < 3) return;
  let minY = maskH;
  let maxY = 0;
  for (const [, y] of polygon) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(maskH - 1, Math.ceil(maxY));
  const n = polygon.length;
  for (let y = y0; y <= y1; y++) {
    const hits: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x1, y1p] = polygon[i];
      const [x2, y2p] = polygon[(i + 1) % n];
      if ((y1p <= y && y2p > y) || (y2p <= y && y1p > y)) {
        const t = (y - y1p) / (y2p - y1p);
        hits.push(x1 + t * (x2 - x1));
      }
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const xa = Math.max(0, Math.ceil(hits[i]));
      const xb = Math.min(maskW - 1, Math.floor(hits[i + 1]));
      for (let x = xa; x <= xb; x++) mask[y * maskW + x] = 1;
    }
  }
}

type Candidate = { polygon: Pt[]; y: number };

function findDark(
  ink: Uint8Array,
  light: Uint8Array,
  maskW: number,
  maskH: number,
): Candidate[] {
  const { labels, comps } = components(ink, maskW, maskH);
  const found: Candidate[] = [];
  const imgN = maskW * maskH;

  for (const comp of comps) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    if (bw < 34 || bh < 26) continue;
    const sol = comp.area / (bw * bh);
    const asp = bw / bh;
    if (sol < 0.52 || asp > 2.7 || asp < 0.36) continue;
    if (comp.area > imgN * 0.2) continue;
    const touches =
      Number(comp.minX <= 1) +
      Number(comp.minY <= 1) +
      Number(comp.maxX >= maskW - 2) +
      Number(comp.maxY >= maskH - 2);
    if (touches >= 2) continue;

    const x0 = comp.minX;
    const y0 = comp.minY;
    const x1 = comp.maxX;
    const y1 = comp.maxY;
    const sw = x1 - x0 + 1;
    const sh = y1 - y0 + 1;
    const sub = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (labels[(y + y0) * maskW + (x + x0)] === comp.id) sub[y * sw + x] = 1;
      }
    }
    const ext = new Uint8Array(sw * sh);
    const stack: number[] = [];
    const seed = (x: number, y: number) => {
      const i = y * sw + x;
      if (sub[i] || ext[i]) return;
      ext[i] = 1;
      stack.push(i);
    };
    for (let x = 0; x < sw; x++) {
      seed(x, 0);
      seed(x, sh - 1);
    }
    for (let y = 0; y < sh; y++) {
      seed(0, y);
      seed(sw - 1, y);
    }
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % sw;
      const y = (p / sw) | 0;
      const step = (n: number, xx: number, yy: number) => {
        if (!sub[n] && !ext[n]) {
          ext[n] = 1;
          stack.push(n);
        }
        void xx;
        void yy;
      };
      if (x > 0) step(p - 1, x - 1, y);
      if (x + 1 < sw) step(p + 1, x + 1, y);
      if (y > 0) step(p - sw, x, y - 1);
      if (y + 1 < sh) step(p + sw, x, y + 1);
    }

    const hole = new Uint8Array(sw * sh);
    let holeN = 0;
    let hMinX = sw;
    let hMinY = sh;
    let hMaxX = 0;
    let hMaxY = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = y * sw + x;
        if (sub[i] || ext[i]) continue;
        const gp = (y + y0) * maskW + (x + x0);
        if (!light[gp]) continue;
        hole[i] = 1;
        holeN++;
        if (x < hMinX) hMinX = x;
        if (y < hMinY) hMinY = y;
        if (x > hMaxX) hMaxX = x;
        if (y > hMaxY) hMaxY = y;
        sumX += x;
        sumY += y;
      }
    }
    if (holeN < 36) continue;
    if (hMinX / bw < 0.05 || hMinY / bh < 0.04) continue;
    if ((bw - 1 - hMaxX) / bw < 0.05 || (bh - 1 - hMaxY) / bh < 0.04) continue;
    const cx = sumX / holeN / bw;
    const cy = sumY / holeN / bh;
    if (cx < 0.25 || cx > 0.75 || cy < 0.18 || cy > 0.82) continue;

    const hLabels = components(hole, sw, sh);
    let glyphs = 0;
    for (const g of hLabels.comps) if (g.area >= 5) glyphs++;
    if (glyphs < 3) continue;

    const pts: Pt[] = [];
    for (let y = 0; y < sh; y += 2) {
      for (let x = 0; x < sw; x += 2) {
        const i = y * sw + x;
        const on = sub[i] || (!ext[i] && !sub[i]);
        if (!on) continue;
        const edge =
          x === 0 ||
          y === 0 ||
          x + 1 >= sw ||
          y + 1 >= sh ||
          !sub[i - 1] && ext[i - 1] ||
          !sub[i + 1] && ext[i + 1] ||
          !sub[i - sw] && ext[i - sw] ||
          !sub[i + sw] && ext[i + sw];
        if (edge) pts.push([x + x0, y + y0]);
      }
    }
    if (pts.length < 6) continue;
    const polygon = expand(convexHull(pts), 3);
    if (polygon.length >= 3) {
      const yMean = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
      found.push({ polygon, y: yMean });
    }
  }
  return found;
}

type Glyph = Comp & { bw: number; bh: number };

function findWhite(
  L: Float32Array,
  glyph: Uint8Array,
  barrier: Uint8Array,
  clean: Uint8Array,
  maskW: number,
  maskH: number,
): Candidate[] {
  const { labels, comps } = components(glyph, maskW, maskH);
  const glyphs: Glyph[] = [];
  for (const comp of comps) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    if (comp.area < 8 || comp.area > 1800) continue;
    if (bw < 2 || bh < 5 || bh > 130) continue;
    if (bw / bh >= 8) continue;
    if (comp.area / (bw * bh) <= 0.14) continue;
    if (comp.minX <= 1 || comp.minY <= 1 || comp.maxX >= maskW - 2 || comp.maxY >= maskH - 2) continue;
    glyphs.push({ ...comp, bw, bh });
  }

  const parent = glyphs.map((_, i) => i);
  const find = (i: number) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const unite = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  };
  for (let i = 0; i < glyphs.length; i++) {
    const a = glyphs[i];
    for (let j = i + 1; j < glyphs.length; j++) {
      const b = glyphs[j];
      const overlapX = a.maxX >= b.minX && b.maxX >= a.minX;
      const overlapY = a.maxY >= b.minY && b.maxY >= a.minY;
      const gapX = overlapX ? 0 : Math.min(Math.abs(a.minX - b.maxX), Math.abs(b.minX - a.maxX));
      const gapY = overlapY ? 0 : Math.min(Math.abs(a.minY - b.maxY), Math.abs(b.minY - a.maxY));
      const mh = Math.max(6, Math.min(a.bh, b.bh));
      if ((gapY <= mh * 0.75 && gapX <= mh * 1.3) || (overlapX && gapY <= mh * 1.3)) unite(i, j);
    }
  }

  const groups = new Map<number, Glyph[]>();
  glyphs.forEach((g, i) => {
    const r = find(i);
    const list = groups.get(r);
    if (list) list.push(g);
    else groups.set(r, [g]);
  });

  const found: Candidate[] = [];
  const rayN = 32;
  for (const group of groups.values()) {
    if (group.length < 4) continue;
    let x0 = maskW;
    let y0 = maskH;
    let x1 = 0;
    let y1 = 0;
    for (const g of group) {
      if (g.minX < x0) x0 = g.minX;
      if (g.minY < y0) y0 = g.minY;
      if (g.maxX > x1) x1 = g.maxX;
      if (g.maxY > y1) y1 = g.maxY;
    }
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    if (bw < 32 || bh < 14 || bh > bw * 1.5) continue;

    const owned = new Uint8Array(maskW * maskH);
    for (const g of group) {
      for (let y = g.minY; y <= g.maxY; y++) {
        for (let x = g.minX; x <= g.maxX; x++) {
          const p = y * maskW + x;
          if (labels[p] === g.id) owned[p] = 1;
        }
      }
    }

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const maxD = Math.max(bw, bh) * 1.1 + 6;
    const hits: Pt[] = [];
    const pads: number[] = [];
    for (let i = 0; i < rayN; i++) {
      const ang = (i / rayN) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const exits: number[] = [];
      if (dx > 1e-6) exits.push((x1 + 1 - cx) / dx);
      if (dx < -1e-6) exits.push((x0 - 1 - cx) / dx);
      if (dy > 1e-6) exits.push((y1 + 1 - cy) / dy);
      if (dy < -1e-6) exits.push((y0 - 1 - cy) / dy);
      const edge = exits.length ? Math.min(...exits) : 0;
      let paper = false;
      const start = Math.floor(edge) + 2;
      for (let t = start; t < maxD; t++) {
        const x = Math.round(cx + dx * t);
        const y = Math.round(cy + dy * t);
        if (x < 0 || y < 0 || x >= maskW || y >= maskH) break;
        const p = y * maskW + x;
        if (owned[p]) continue;
        if (barrier[p] && paper) {
          hits.push([x, y]);
          pads.push(t - edge);
          break;
        }
        if (L[p] > 170 && !barrier[p]) paper = true;
      }
    }
    if (hits.length < rayN * 0.7) continue;
    const sorted = pads.slice().sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    if (med < 3 || med > 84) continue;
    const limit = Math.max(10, med * 2.2);
    const kept: Pt[] = [];
    const keptPads: number[] = [];
    for (let i = 0; i < hits.length; i++) {
      if (pads[i] <= limit) {
        kept.push(hits[i]);
        keptPads.push(pads[i]);
      }
    }
    if (kept.length < rayN * 0.62) continue;
    const mean = keptPads.reduce((s, v) => s + v, 0) / keptPads.length;
    let variance = 0;
    for (const v of keptPads) variance += (v - mean) * (v - mean);
    const cv = Math.sqrt(variance / keptPads.length) / Math.max(mean, 1);
    if (cv > 0.5) continue;
    const pad = Math.max(2, Math.round(med * 0.55));
    let inside = 0;
    let cleanN = 0;
    const ya = Math.max(0, y0 - pad);
    const yb = Math.min(maskH - 1, y1 + pad);
    const xa = Math.max(0, x0 - pad);
    const xb = Math.min(maskW - 1, x1 + pad);
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        const p = y * maskW + x;
        if (owned[p]) continue;
        inside++;
        if (clean[p]) cleanN++;
      }
    }
    if (inside < 24 || cleanN / inside < 0.72) continue;
    const polygon = expand(convexHull(kept), 2);
    if (polygon.length >= 3) {
      const yMean = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
      found.push({ polygon, y: yMean });
    }
  }
  return found;
}

function overlaps(a: Pt[], b: Pt[]) {
  let ax0 = Infinity;
  let ay0 = Infinity;
  let ax1 = -Infinity;
  let ay1 = -Infinity;
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (const [x, y] of a) {
    if (x < ax0) ax0 = x;
    if (y < ay0) ay0 = y;
    if (x > ax1) ax1 = x;
    if (y > ay1) ay1 = y;
  }
  for (const [x, y] of b) {
    if (x < bx0) bx0 = x;
    if (y < by0) by0 = y;
    if (x > bx1) bx1 = x;
    if (y > by1) by1 = y;
  }
  const ix0 = Math.max(ax0, bx0);
  const iy0 = Math.max(ay0, by0);
  const ix1 = Math.min(ax1, bx1);
  const iy1 = Math.min(ay1, by1);
  const iw = ix1 - ix0;
  const ih = iy1 - iy0;
  if (iw <= 0 || ih <= 0) return false;
  const inter = iw * ih;
  const aa = (ax1 - ax0) * (ay1 - ay0);
  const bb = (bx1 - bx0) * (by1 - by0);
  return inter / (aa + bb - inter) > 0.3;
}

function findEnclosed(
  paper: Uint8Array,
  wall: Uint8Array,
  glyph: Uint8Array,
  maskW: number,
  maskH: number,
): Candidate[] {
  const open = new Uint8Array(paper.length);
  for (let i = 0; i < open.length; i++) if (paper[i] && !wall[i]) open[i] = 1;
  const { labels, comps } = components(open, maskW, maskH);
  const glyphs = components(glyph, maskW, maskH).comps.filter((g) => g.area >= 8 && g.area <= 1800);
  const found: Candidate[] = [];
  const imgN = maskW * maskH;

  for (const comp of comps) {
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    const touches =
      Number(comp.minX <= 1) +
      Number(comp.minY <= 1) +
      Number(comp.maxX >= maskW - 2) +
      Number(comp.maxY >= maskH - 2);
    if (touches >= 2 || comp.minX <= 1 || comp.maxX >= maskW - 2) continue;
    if (bw < 48 || bh < 32) continue;
    if (comp.area < 900 || comp.area > imgN * 0.14) continue;
    if (comp.area / (bw * bh) < 0.62) continue;

    let gCount = 0;
    let gArea = 0;
    let sx = 0;
    let sy = 0;
    for (const g of glyphs) {
      if (g.maxX < comp.minX - 3 || g.minX > comp.maxX + 3 || g.maxY < comp.minY - 3 || g.minY > comp.maxY + 3) {
        continue;
      }
      let hit = false;
      const x0 = Math.max(0, g.minX - 2);
      const x1 = Math.min(maskW - 1, g.maxX + 2);
      const y0 = Math.max(0, g.minY - 2);
      const y1 = Math.min(maskH - 1, g.maxY + 2);
      for (let y = y0; y <= y1 && !hit; y++) {
        for (let x = x0; x <= x1; x++) {
          if (labels[y * maskW + x] === comp.id) {
            hit = true;
            break;
          }
        }
      }
      if (!hit) continue;
      gCount++;
      gArea += g.area;
      sx += ((g.minX + g.maxX) / 2) * g.area;
      sy += ((g.minY + g.maxY) / 2) * g.area;
    }
    if (gCount < 4 || gArea < 90) continue;
    const cx = sx / gArea;
    const cy = sy / gArea;
    if (cx < comp.minX + bw * 0.15 || cx > comp.maxX - bw * 0.15) continue;
    if (cy < comp.minY + bh * 0.15 || cy > comp.maxY - bh * 0.15) continue;

    const pts: Pt[] = [];
    for (let y = comp.minY; y <= comp.maxY; y += 2) {
      for (let x = comp.minX; x <= comp.maxX; x += 2) {
        const p = y * maskW + x;
        if (labels[p] !== comp.id) continue;
        const edge =
          x <= comp.minX + 1 ||
          y <= comp.minY + 1 ||
          x >= comp.maxX - 1 ||
          y >= comp.maxY - 1 ||
          labels[p - 1] !== comp.id ||
          labels[p + 1] !== comp.id ||
          labels[p - maskW] !== comp.id ||
          labels[p + maskW] !== comp.id;
        if (edge) pts.push([x, y]);
      }
    }
    if (pts.length < 6) continue;
    const polygon = expand(convexHull(pts), 3);
    if (polygon.length >= 3) {
      const yMean = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
      found.push({ polygon, y: yMean });
    }
  }
  return found;
}

export function findBubbles(src: Raster): BubbleMap {
  const maskW = Math.max(1, Math.min(MAX_W, src.width));
  const scale = src.width / maskW;
  const maskH = Math.max(1, Math.round(src.height / scale));
  const n = maskW * maskH;
  const ink = new Uint8Array(n);
  const light = new Uint8Array(n);
  const glyph = new Uint8Array(n);
  const thin = new Uint8Array(n);
  const clean = new Uint8Array(n);
  const paper = new Uint8Array(n);
  const wall = new Uint8Array(n);
  const L = new Float32Array(n);

  for (let y = 0; y < maskH; y++) {
    const sy = Math.min(src.height - 1, (y * scale + scale * 0.5) | 0);
    const sy0 = Math.min(src.height - 1, Math.floor(y * scale));
    const sy1 = Math.min(src.height - 1, Math.ceil((y + 1) * scale) - 1);
    const row = sy * src.width;
    for (let x = 0; x < maskW; x++) {
      const sx = Math.min(src.width - 1, (x * scale + scale * 0.5) | 0);
      const i = (row + sx) * 4;
      const r = src.data[i];
      const g = src.data[i + 1];
      const b = src.data[i + 2];
      const lum = luminance(r, g, b);
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const p = y * maskW + x;
      L[p] = lum;
      if (lum < 34 && chroma < 38) ink[p] = 1;
      if (lum > 176 && chroma < 70) light[p] = 1;
      if (lum < 40 && chroma < 45) glyph[p] = 1;
      if (lum < 100 && chroma < 80) thin[p] = 1;
      if (lum > 198 && chroma < 28) clean[p] = 1;
      if (lum > 188 && chroma < 36) paper[p] = 1;

      const sx0 = Math.min(src.width - 1, Math.floor(x * scale));
      const sx1 = Math.min(src.width - 1, Math.ceil((x + 1) * scale) - 1);
      let minLum = 255;
      let minChroma = 255;
      for (let yy = sy0; yy <= sy1; yy++) {
        const base = yy * src.width;
        for (let xx = sx0; xx <= sx1; xx++) {
          const j = (base + xx) * 4;
          const rr = src.data[j];
          const gg = src.data[j + 1];
          const bb = src.data[j + 2];
          const ll = luminance(rr, gg, bb);
          if (ll < minLum) {
            minLum = ll;
            minChroma = Math.max(rr, gg, bb) - Math.min(rr, gg, bb);
          }
        }
      }
      if (minLum < 70 && minChroma < 55) wall[p] = 1;
    }
  }

  const barrier = dilate(thin, maskW, maskH);
  const sealed = dilate(wall, maskW, maskH);
  const darks = findDark(ink, light, maskW, maskH);
  const whites = findWhite(L, glyph, barrier, clean, maskW, maskH);
  const boxes = findEnclosed(paper, sealed, glyph, maskW, maskH);
  const chosen = darks.concat(whites);
  for (const box of boxes) {
    if (chosen.some((item) => overlaps(item.polygon, box.polygon))) continue;
    chosen.push(box);
  }
  chosen.sort((a, b) => a.y - b.y);

  const mask = new Uint8Array(n);
  const bubbles: Bubble[] = [];
  for (const item of chosen) {
    const polygon = item.polygon.map(([x, y]) => [x * scale, y * scale] as Pt);
    if (polygon.length < 3) continue;
    paintPolygon(mask, maskW, maskH, item.polygon);
    bubbles.push({ id: bubbles.length + 1, polygon });
  }

  return { bubbles, scale, maskW, maskH, mask };
}

export function probeBubble(map: BubbleMap, x: number, y: number): boolean {
  const mx = Math.floor(x / map.scale);
  const my = Math.floor(y / map.scale);
  if (mx < 0 || my < 0 || mx >= map.maskW || my >= map.maskH) return false;
  return map.mask[my * map.maskW + mx] === 1;
}
