// Generates a NON-copyrighted legend image: one synthetic example of each of the
// four bubble types, each drawn with its real outline color via the M1 renderer.
// Committed to git as the attachable PR proof (publisher bytes never leave work/).
import { writePng, blank, setPx } from "../lib/image.mjs";
import { classify, type BubbleType } from "../lib/detect.mts";
import { render } from "../lib/render.mts";
import { TYPE_COLOR } from "../lib/detect.mts";
import type { Raster, Pt } from "../../marker/bubbles.ts";

function ellipse(img: Raster, cx: number, cy: number, rx: number, ry: number, rgb: [number, number, number]) {
  for (let y = (cy - ry) | 0; y <= cy + ry; y++) for (let x = (cx - rx) | 0; x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) setPx(img, x, y, rgb);
  }
}
function ring(img: Raster, cx: number, cy: number, rx: number, ry: number, t: number) {
  for (let y = (cy - ry - t) | 0; y <= cy + ry + t; y++) for (let x = (cx - rx - t) | 0; x <= cx + rx + t; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, di = ((x - cx) / (rx - t)) ** 2 + ((y - cy) / (ry - t)) ** 2;
    if (d <= 1 && di >= 1) setPx(img, x, y, [12, 12, 12]);
  }
}
function poly(cx: number, cy: number, rx: number, ry: number, n = 48): Pt[] {
  const p: Pt[] = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push([Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]); } return p;
}
function text(img: Raster, x: number, y: number, rgb: [number, number, number]) { for (let i = 0; i < 4; i++) for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 8; xx++) setPx(img, x + i * 18 + xx, y + yy, rgb); }

const W = 640, H = 720;
const img = blank(W, H, [248, 248, 246]);
// type 1: gradient-faded black bubble
for (let y = 40; y <= 200; y++) for (let x = 40; x <= 280; x++) { const dx = (x - 160) / 120, dy = (y - 120) / 80, d = Math.sqrt(dx * dx + dy * dy); if (d > 1) continue; const v = d < 0.7 ? 12 : Math.round(60 + ((d - 0.7) / 0.3) * 120); setPx(img, x, y, [v, v, v]); }
text(img, 100, 112, [250, 250, 250]);
// type 2: white bubble black text
ellipse(img, 460, 120, 120, 80, [252, 252, 250]); ring(img, 460, 120, 120, 80, 5); text(img, 400, 112, [12, 12, 12]);
// type 3: crisp black bubble white text
ellipse(img, 160, 360, 120, 80, [10, 10, 10]); text(img, 100, 352, [250, 250, 250]);
// type 4: text on colourful art
for (let y = 280; y < 460; y++) for (let x = 340; x < 600; x++) setPx(img, x, y, ((x + y) % 40 < 20) ? [200, 40, 60] : [40, 80, 200]);
text(img, 380, 352, [16, 16, 16]);

const dets = [
  { type: classify(img, poly(160, 120, 120, 80)), polygon: poly(160, 120, 120, 80), bbox: { x: 40, y: 40, w: 240, h: 160 } },
  { type: classify(img, poly(460, 120, 120, 80)), polygon: poly(460, 120, 120, 80), bbox: { x: 340, y: 40, w: 240, h: 160 } },
  { type: classify(img, poly(160, 360, 120, 80)), polygon: poly(160, 360, 120, 80), bbox: { x: 40, y: 280, w: 240, h: 160 } },
  { type: 4 as BubbleType, polygon: [[360, 340], [560, 340], [560, 380], [360, 380]], bbox: { x: 360, y: 340, w: 200, h: 40 } },
];
const out = render(img, dets, 4);
// labels strip at bottom
for (let i = 0; i < 4; i++) { const c = TYPE_COLOR[(i + 1) as BubbleType]; for (let x = 0; x < 30; x++) for (let y = 500 + i * 40; y < 520 + i * 40; y++) setPx(out, 40 + x, y, c); }
await writePng(new URL("./legend-outlined.png", import.meta.url).pathname, out);
console.log("wrote m1/fixtures/legend-outlined.png types:", dets.map((d) => d.type).join(","));
