// M1 detector: wraps marker/bubbles.ts findBubbles (types 1-3: enclosed balloons)
// and adds a bare-text pass (type 4: dialogue painted on the art with no balloon).
// bubbles.ts is NOT modified — this classifies its polygons and finds the missing 4th type.
import { findBubbles } from "../../marker/bubbles.ts";
import type { Raster, Pt } from "../../marker/bubbles.ts";

export type BubbleType = 1 | 2 | 3 | 4;

export type Detection = {
  type: BubbleType;
  polygon: Pt[];
  bbox: { x: number; y: number; w: number; h: number };
};

// Outline colors, one per type.
export const TYPE_COLOR: Record<BubbleType, [number, number, number]> = {
  1: [0, 229, 255], // cyan — black bubble, rough / gradient-faded edges
  2: [255, 59, 48], // red — white bubble, black text
  3: [255, 214, 10], // yellow — black bubble, white text
  4: [52, 199, 89], // green — text with no bubble, on the art
};

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function chroma(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}
function px(img: Raster, x: number, y: number) {
  const i = (y * img.width + x) * 4;
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] };
}
function bboxOf(poly: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
}
function pip(poly: Pt[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function sampleInterior(img: Raster, poly: Pt[], bbox: ReturnType<typeof bboxOf>) {
  const x0 = Math.max(0, bbox.x), y0 = Math.max(0, bbox.y);
  const x1 = Math.min(img.width - 1, bbox.x + bbox.w), y1 = Math.min(img.height - 1, bbox.y + bbox.h);
  let n = 0, light = 0, dark = 0, colorful = 0;
  const samples: { L: number }[] = [];
  const step = Math.max(1, Math.round(Math.sqrt((x1 - x0) * (y1 - y0) / 1200)));
  for (let y = y0; y <= y1; y += step)
    for (let x = x0; x <= x1; x += step) {
      if (!pip(poly, x, y)) continue;
      const { r, g, b } = px(img, x, y);
      const L = luma(r, g, b), C = chroma(r, g, b);
      n++; if (L > 150 && C < 55) light++; else if (L < 95 && C < 75) dark++;
      if (C >= 55) colorful++;
      if (samples.length < 2000) samples.push({ L });
    }
  return { n, light, dark, colorful, samples };
}

function perimeterPoints(poly: Pt[], per = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push([Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t)]);
    }
  }
  return out;
}

// Fraction of the boundary band that is mid-luminance — a gradient / rough edge
// fades through grey, a crisp black-on-white balloon steps straight past it.
function edgeFade(img: Raster, poly: Pt[]) {
  let tested = 0, faded = 0;
  for (const [x, y] of perimeterPoints(poly)) {
    for (let d = -4; d <= 4; d++) {
      const xx = Math.min(img.width - 1, Math.max(0, x + d));
      const yy = Math.min(img.height - 1, Math.max(0, y + d));
      const { r, g, b } = px(img, xx, yy);
      const L = luma(r, g, b);
      tested++; if (L > 90 && L < 185) faded++;
    }
  }
  return tested ? faded / tested : 0;
}

// White glyphs inside a dark balloon: a clear population of near-white achromatic pixels.
function whiteTextFrac(img: Raster, poly: Pt[], bbox: ReturnType<typeof bboxOf>) {
  const x0 = Math.max(0, bbox.x), y0 = Math.max(0, bbox.y);
  const x1 = Math.min(img.width - 1, bbox.x + bbox.w), y1 = Math.min(img.height - 1, bbox.y + bbox.h);
  let n = 0, white = 0;
  const step = Math.max(1, Math.round(Math.sqrt((x1 - x0) * (y1 - y0) / 1200)));
  for (let y = y0; y <= y1; y += step)
    for (let x = x0; x <= x1; x += step) {
      if (!pip(poly, x, y)) continue;
      const { r, g, b } = px(img, x, y);
      n++; if (luma(r, g, b) > 205 && chroma(r, g, b) < 40) white++;
    }
  return n ? white / n : 0;
}

export function classify(img: Raster, poly: Pt[]): BubbleType {
  const bbox = bboxOf(poly);
  const s = sampleInterior(img, poly, bbox);
  if (s.n === 0) return 2;
  const colorFrac = s.colorful / s.n;
  if (colorFrac > 0.45) return 4;
  const fillIsDark = s.dark > s.light;
  if (!fillIsDark) return 2; // white bubble, black text
  const fade = edgeFade(img, poly);
  // black bubble with a rough / gradient-faded edge => type 1
  if (fade > 0.3) return 1;
  // otherwise a clean black balloon: white text (type 3) if present, else rough-empty => type 1
  return whiteTextFrac(img, poly, bbox) > 0.02 ? 3 : 1;
}

function covered(x: number, y: number, polys: Pt[]) {
  for (const p of polys) if (pip(p, x, y)) return true;
  return false;
}

// Type 4: achromatic glyph strokes (black or white text) sitting on colourful art,
// outside any balloon. Achromatic-strong mask -> dilate -> components -> keep the ones
// whose padded neighbourhood is mostly colourful and that are text-shaped.
export function detectBareText(img: Raster, balloonPolys: Pt[]): Detection[] {
  const { width: W, height: H } = img;
  const strong = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const { r, g, b } = px(img, x, y);
      const L = luma(r, g, b), C = chroma(r, g, b);
      const achromatic = C < 45;
      if (achromatic && (L < 55 || L > 210) && !covered(x, y, balloonPolys)) strong[y * W + x] = 1;
    }

  // dilate to merge glyph runs into utterances. Horizontal reach is wide (letter/line
  // spacing), vertical reach is tighter so separate stacked bubbles stay distinct.
  const dil = new Uint8Array(W * H);
  const rx = 7, ry = 4;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!strong[y * W + x]) continue;
      for (let dy = -ry; dy <= ry; dy++)
        for (let dx = -rx; dx <= rx; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= H || xx >= W) continue;
          dil[yy * W + xx] = 1;
        }
    }

  const seen = new Uint8Array(W * H);
  const out: Detection[] = [];
  const stack: number[] = [];
  for (let i = 0; i < dil.length; i++) {
    if (!dil[i] || seen[i]) continue;
    seen[i] = 1; stack.push(i);
    let minX = W, minY = H, maxX = 0, maxY = 0, area = 0, glyph = 0;
    let sx0 = W, sy0 = H, sx1 = 0, sy1 = 0; // tight bbox over actual glyph pixels
    while (stack.length) {
      const p = stack.pop()!; area++;
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      if (strong[p]) {
        glyph++;
        if (x < sx0) sx0 = x; if (y < sy0) sy0 = y;
        if (x > sx1) sx1 = x; if (y > sy1) sy1 = y;
      }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= H || xx >= W) continue;
          const q = yy * W + xx;
          if (dil[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
    }
    const sw = sx1 - sx0, sh = sy1 - sy0;
    if (area < 90 || glyph < 40) continue;
    // Text runs are wide and short. Round/-square blobs (glowing art, highlights,
    // speed-line cores) are the main type-4 false positive — reject on aspect + size.
    if (sw < 40 || sh < 10 || sh > 90) continue;
    if (sw / sh < 1.4) continue;
    if (sw > W * 0.95 || sh > H * 0.5) continue;
    // solid-fill rejection: a filled shadow/box has ~all pixels dark, text has strokes and gaps
    const fill = glyph / Math.max(1, sw * sh);
    if (fill > 0.82 || fill < 0.05) continue;
    // require several glyph columns across the run (a real text line breaks up horizontally)
    let cols = 0, prevIn = false;
    for (let x = sx0; x <= sx1; x++) {
      let any = false;
      for (let y = sy0; y <= sy1; y += 2) if (strong[y * W + x]) { any = true; break; }
      if (any && !prevIn) cols++;
      prevIn = any;
    }
    if (cols < 4) continue;
    // colourful-art neighbourhood test (dialogue on the art, not on a white page)
    const pad = Math.max(6, Math.round(sh * 0.5));
    let nb = 0, colorfulNb = 0;
    for (let y = Math.max(0, sy0 - pad); y <= Math.min(H - 1, sy1 + pad); y += 2)
      for (let x = Math.max(0, sx0 - pad); x <= Math.min(W - 1, sx1 + pad); x += 2) {
        const { r, g, b } = px(img, x, y);
        nb++; if (chroma(r, g, b) >= 55) colorfulNb++;
      }
    if (nb === 0 || colorfulNb / nb < 0.55) continue;
    const poly: Pt[] = [
      [sx0, sy0], [sx1, sy0], [sx1, sy1], [sx0, sy1],
    ];
    out.push({ type: 4, polygon: poly, bbox: { x: sx0, y: sy0, w: sw, h: sh } });
  }
  return out;
}

export function detect(img: Raster): Detection[] {
  const map = findBubbles(img);
  const dets: Detection[] = [];
  for (const b of map.bubbles) {
    const bbox = bboxOf(b.polygon);
    dets.push({ type: classify(img, b.polygon), polygon: b.polygon, bbox });
  }
  const balloonPolys = map.bubbles.map((b) => b.polygon);
  dets.push(...detectBareText(img, balloonPolys));
  dets.sort((a, b) => (a.bbox.y + a.bbox.h / 2) - (b.bbox.y + b.bbox.h / 2));
  return dets;
}
