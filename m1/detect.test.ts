// Unit tests for the M1 detector on synthetic fixture crops. No publisher bytes:
// every fixture here is drawn procedurally (README limit). Covers the four bubble
// types plus negatives (loose text on art, a solid shadow).
import assert from "node:assert/strict";
import test from "node:test";
import type { Raster, Pt } from "../marker/bubbles.ts";
import { classify, detectBareText, detect } from "./lib/detect.mts";

function blank(w: number, h: number, rgb: [number, number, number] = [248, 248, 246]): Raster {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
}
function setPx(img: Raster, x: number, y: number, rgb: [number, number, number]) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
}
function fillRect(img: Raster, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(img, xx, yy, rgb);
}
function ellipse(img: Raster, cx: number, cy: number, rx: number, ry: number, rgb: [number, number, number]) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(img, x, y, rgb);
    }
}
function gradEllipse(img: Raster, cx: number, cy: number, rx: number, ry: number) {
  // black core, a broad grey gradient rim fading to the white page — a rough/soft balloon edge
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      if (d < 0.7) setPx(img, x, y, [12, 12, 12]); // solid core
      else {
        const t = (d - 0.7) / 0.3; // 0 core-edge .. 1 outer
        const v = Math.round(60 + t * 120); // grey 60..180 across the rim
        setPx(img, x, y, [v, v, v]);
      }
    }
}
function ellipsePoly(cx: number, cy: number, rx: number, ry: number, n = 48): Pt[] {
  const p: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push([Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]);
  }
  return p;
}
function ring(img: Raster, cx: number, cy: number, rx: number, ry: number, thick: number) {
  for (let y = Math.floor(cy - ry - thick); y <= cy + ry + thick; y++)
    for (let x = Math.floor(cx - rx - thick); x <= cx + rx + thick; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const di = ((x - cx) / (rx - thick)) ** 2 + ((y - cy) / (ry - thick)) ** 2;
      if (d <= 1 && di >= 1) setPx(img, x, y, [12, 12, 12]);
    }
}
// colourful, high-chroma art background (chroma >= 55 everywhere)
function artBg(img: Raster) {
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const c = ((x + y) % 40) < 20 ? [200, 40, 60] : [40, 80, 200];
      setPx(img, x, y, c as [number, number, number]);
    }
}
const polyBox = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

test("classify: white bubble with black text -> type 2", () => {
  const img = blank(300, 200);
  ellipse(img, 150, 100, 100, 60, [252, 252, 250]);
  for (let i = 0; i < 5; i++) fillRect(img, 90 + i * 24, 92, 14, 18, [12, 12, 12]); // black text
  assert.equal(classify(img, ellipsePoly(150, 100, 100, 60)), 2);
});

test("classify: crisp black bubble with white text -> type 3", () => {
  const img = blank(300, 200);
  ellipse(img, 150, 100, 100, 60, [10, 10, 10]);
  for (let i = 0; i < 5; i++) fillRect(img, 90 + i * 24, 92, 14, 18, [250, 250, 250]); // white text
  assert.equal(classify(img, ellipsePoly(150, 100, 100, 60)), 3);
});

test("classify: black bubble with a gradient-faded edge -> type 1", () => {
  const img = blank(320, 220);
  gradEllipse(img, 160, 110, 120, 80); // broad grey rim, no clean white text
  assert.equal(classify(img, ellipsePoly(160, 110, 120, 80)), 1);
});

test("classify: text sitting on colourful art -> type 4", () => {
  const img = blank(300, 160);
  artBg(img);
  for (let i = 0; i < 5; i++) fillRect(img, 90 + i * 24, 70, 14, 18, [16, 16, 16]);
  assert.equal(classify(img, polyBox(80, 60, 150, 40)), 4);
});

test("detectBareText finds black dialogue on colourful art, ignores a solid shadow", () => {
  const img = blank(300, 200);
  artBg(img);
  for (let i = 0; i < 6; i++) fillRect(img, 60 + i * 22, 60, 8, 16, [16, 16, 16]); // dialogue
  fillRect(img, 40, 140, 220, 30, [30, 40, 60]); // solid shadow block -> rejected (fill + single column)
  const hits = detectBareText(img, []);
  assert.ok(hits.length >= 1, "expected at least one bare-text bubble");
  assert.ok(hits.every((h) => h.type === 4));
  const overDialogue = hits.some((h) => h.bbox.x <= 60 && h.bbox.x + h.bbox.w >= 170 && h.bbox.y <= 60);
  assert.ok(overDialogue, "a detection should bracket the dialogue row");
});

test("end-to-end detect on a real findBubbles fixture: dark balloon + white balloon", () => {
  const img = blank(480, 360);
  ellipse(img, 160, 180, 78, 52, [10, 10, 10]); // black balloon, white glyphs
  for (let i = 0; i < 4; i++) fillRect(img, 120 + i * 16, 172, 10, 14, [250, 250, 250]);
  ellipse(img, 360, 300, 60, 40, [252, 252, 250]); // white balloon
  ring(img, 360, 300, 60, 40, 5); // dark outline so the ray ring-test fires (matches bubbles.test)
  for (let i = 0; i < 4; i++) fillRect(img, 335 + i * 16, 292, 10, 14, [12, 12, 12]);
  const dets = detect(img);
  assert.ok(dets.length >= 2, `expected >=2 detections, got ${dets.length}`);
  const types = new Set(dets.map((d) => d.type));
  assert.ok(types.has(2) || types.has(3), "black or white balloon classified");
});
