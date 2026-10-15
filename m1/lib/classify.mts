// Pure classifier for enclosed balloon polygons. Uses only the preprocess helpers.
import type { Raster, Pt } from "../../marker/bubbles.ts";
import { luma, chroma, px, bboxOf, pip } from "./preprocess.mts";
import type { BubbleType } from "./types.mts";

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
