import assert from "node:assert/strict";
import test from "node:test";
import { findBubbles, probeBubble, type Raster } from "./bubbles.ts";

function blank(w: number, h: number, rgb: [number, number, number] = [248, 248, 246]): Raster {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

function setPx(img: Raster, x: number, y: number, rgb: [number, number, number]) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0];
  img.data[i + 1] = rgb[1];
  img.data[i + 2] = rgb[2];
  img.data[i + 3] = 255;
}

function fillRect(
  img: Raster,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(img, xx, yy, rgb);
  }
}

function glyphs(img: Raster, x: number, y: number, n = 4) {
  for (let i = 0; i < n; i++) fillRect(img, x + i * 16, y, 10, 14, [250, 250, 250]);
}
function fillEllipse(
  img: Raster,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rgb: [number, number, number],
) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(img, x, y, rgb);
    }
  }
}

function ring(img: Raster, cx: number, cy: number, rx: number, ry: number, thick: number) {
  for (let y = Math.floor(cy - ry - thick); y <= cy + ry + thick; y++) {
    for (let x = Math.floor(cx - rx - thick); x <= cx + rx + thick; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      const dx2 = (x - cx) / (rx - thick);
      const dy2 = (y - cy) / (ry - thick);
      if (d <= 1 && dx2 * dx2 + dy2 * dy2 >= 1) setPx(img, x, y, [12, 12, 12]);
    }
  }
}

test("marks a dark dialogue bubble and ignores a white one and a shadow", () => {
  const img = blank(480, 360);
  fillEllipse(img, 160, 180, 78, 52, [10, 10, 10]);
  glyphs(img, 120, 172, 4);
  ring(img, 360, 80, 46, 34, 3);
  setPx(img, 352, 80, [8, 8, 8]);
  setPx(img, 368, 80, [8, 8, 8]);
  for (let y = 40; y < 120; y++) for (let x = 20; x < 70; x++) setPx(img, x, y, [8, 8, 10]);

  const map = findBubbles(img);
  assert.equal(map.bubbles.length, 1);
  assert.equal(probeBubble(map, 160, 180), true);
  assert.equal(probeBubble(map, 360, 80), false);
  assert.equal(probeBubble(map, 40, 80), false);
  assert.equal(probeBubble(map, 10, 10), false);
});

test("marks two separate dialogue bubbles", () => {
  const img = blank(400, 640);
  fillEllipse(img, 200, 140, 70, 46, [8, 8, 8]);
  glyphs(img, 160, 132, 4);
  fillEllipse(img, 180, 460, 84, 58, [6, 6, 6]);
  glyphs(img, 140, 444, 4);
  glyphs(img, 148, 466, 3);
  const map = findBubbles(img);
  assert.equal(map.bubbles.length, 2);
  assert.equal(probeBubble(map, 200, 140), true);
  assert.equal(probeBubble(map, 180, 460), true);
});

test("marks dialogue sitting on a dark panel", () => {
  const img = blank(520, 700, [36, 38, 46]);
  fillEllipse(img, 170, 180, 90, 56, [8, 8, 8]);
  glyphs(img, 120, 172, 5);
  fillEllipse(img, 320, 520, 110, 64, [6, 6, 6]);
  glyphs(img, 260, 500, 5);
  glyphs(img, 268, 522, 4);
  fillEllipse(img, 430, 70, 48, 32, [248, 248, 246]);
  const map = findBubbles(img);
  assert.equal(map.bubbles.length, 2);
  assert.equal(probeBubble(map, 170, 180), true);
  assert.equal(probeBubble(map, 320, 520), true);
  assert.equal(probeBubble(map, 430, 70), false);
});

test("marks a white outlined bubble and ignores loose text", () => {
  const img = blank(480, 340);
  fillEllipse(img, 190, 170, 100, 64, [252, 252, 250]);
  ring(img, 190, 170, 100, 64, 5);
  for (let i = 0; i < 5; i++) fillRect(img, 130 + i * 18, 150, 11, 16, [12, 12, 12]);
  for (let i = 0; i < 4; i++) fillRect(img, 130 + i * 18, 176, 11, 16, [12, 12, 12]);
  for (let i = 0; i < 4; i++) fillRect(img, 360 + i * 16, 40, 9, 14, [12, 12, 12]);
  const map = findBubbles(img);
  assert.equal(map.bubbles.length, 1);
  assert.equal(probeBubble(map, 190, 170), true);
  assert.equal(probeBubble(map, 380, 46), false);
});

test("marks a cropped narration box and a roomy white bubble", () => {
  const img = blank(480, 900);
  fillRect(img, 50, 0, 380, 118, [252, 252, 250]);
  fillRect(img, 50, 112, 380, 6, [12, 12, 12]);
  fillRect(img, 50, 0, 6, 118, [12, 12, 12]);
  fillRect(img, 424, 0, 6, 118, [12, 12, 12]);
  for (let i = 0; i < 6; i++) fillRect(img, 110 + i * 26, 32, 14, 18, [16, 16, 16]);
  for (let i = 0; i < 5; i++) fillRect(img, 120 + i * 26, 66, 14, 18, [16, 16, 16]);

  fillEllipse(img, 240, 520, 120, 86, [252, 252, 250]);
  ring(img, 240, 520, 120, 86, 6);
  for (let i = 0; i < 4; i++) fillRect(img, 200 + i * 20, 504, 12, 16, [16, 16, 16]);
  for (let i = 0; i < 4; i++) fillRect(img, 200 + i * 20, 530, 12, 16, [16, 16, 16]);

  const map = findBubbles(img);
  assert.equal(map.bubbles.length, 2);
  assert.equal(probeBubble(map, 200, 48), true);
  assert.equal(probeBubble(map, 240, 520), true);
  assert.equal(probeBubble(map, 30, 300), false);
});
