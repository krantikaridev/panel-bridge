// M1 detector: thin orchestrator over pure stages.
// Types and colors live in types.mts; classification in classify.mts;
// bare-text in bare-text.mts (next); enclosed balloons from marker/bubbles.ts.
import { findBubbles } from "../../marker/bubbles.ts";
import type { Raster, Pt } from "../../marker/bubbles.ts";
import { luma, chroma, px, bboxOf, pip } from "./preprocess.mts";
import { classify } from "./classify.mts";
import type { BubbleType, Detection } from "./types.mts";
import { TYPE_COLOR } from "./types.mts";

export type { BubbleType, Detection };
export { TYPE_COLOR, classify };

function covered(x: number, y: number, polys: Pt[][]) {
  for (const p of polys) if (pip(p, x, y)) return true;
  return false;
}

// Type 4: achromatic glyph strokes (black or white text) sitting on colourful art,
// outside any balloon. Achromatic-strong mask -> dilate -> components -> keep the ones
// whose padded neighbourhood is mostly colourful and that are text-shaped.
export function detectBareText(img: Raster, balloonPolys: Pt[][]): Detection[] {
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
