// M1 renderer: draw each detection's polygon outline in its type color onto a copy of the raster.
import type { Raster, Pt } from "../../marker/bubbles.ts";
import { TYPE_COLOR, type Detection } from "./detect.mts";

function blend(img: Raster, x: number, y: number, rgb: [number, number, number], t: number) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = img.data[i] * (1 - t) + rgb[0] * t;
  img.data[i + 1] = img.data[i + 1] * (1 - t) + rgb[1] * t;
  img.data[i + 2] = img.data[i + 2] * (1 - t) + rgb[2] * t;
}

function line(img: Raster, a: Pt, b: Pt, rgb: [number, number, number], w: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  const half = Math.round(w / 2);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(a[0] + (dx * s) / steps);
    const y = Math.round(a[1] + (dy * s) / steps);
    for (let o = -half; o <= half; o++) {
      blend(img, x + o, y, rgb, 1);
      blend(img, x, y + o, rgb, 1);
    }
  }
}

export function clone(img: Raster): Raster {
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

export function render(img: Raster, dets: Detection[], strokeW = 3): Raster {
  const out = clone(img);
  for (const d of dets) {
    const c = TYPE_COLOR[d.type];
    const p = d.polygon;
    for (let i = 0; i < p.length; i++) line(out, p[i], p[(i + 1) % p.length], c, strokeW);
  }
  return out;
}
