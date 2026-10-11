// PNG <-> Raster helpers (pngjs). Raster is { width, height, data:Uint8ClampedArray }
// with RGBA rows, the shape marker/bubbles.ts findBubbles expects.
import { PNG } from "pngjs";
import { readFile, writeFile } from "node:fs/promises";

export async function readPng(file) {
  const buf = await readFile(file);
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

export async function writePng(file, raster) {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data.buffer, raster.data.byteOffset, raster.data.length);
  await writeFile(file, PNG.sync.write(png));
}

export function blank(w, h, rgb = [255, 255, 255]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

export function setPx(img, x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0];
  img.data[i + 1] = rgb[1];
  img.data[i + 2] = rgb[2];
  img.data[i + 3] = a;
}

export function lumAt(img, x, y) {
  const i = (y * img.width + x) * 4;
  return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
}
