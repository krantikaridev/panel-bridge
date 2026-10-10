// npm run demo:m1 — one command, zero manual steps.
// Captures the live Naver chapter through the lane Chrome, detects + outlines every
// bubble in its type color, and writes proof section-sheets + a counts table to the
// gitignored work/ dir. Publisher bytes never leave work/.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { captureChapter } from "./lib/capture.mjs";
import { readPng, writePng } from "./lib/image.mjs";
import { detect, TYPE_COLOR, type BubbleType } from "./lib/detect.mts";
import { render, clone } from "./lib/render.mts";

const TITLE_ID = process.env.M1_TITLE_ID || "817032"; // 열렙전사 EARTH GAME
const NO = process.env.M1_NO || "1"; // chapter 1 (trust the URL no, per handoff)
const WORK = resolve(import.meta.dirname, "../work");
const CUTS = resolve(WORK, "cuts");
const OUT = resolve(WORK, "outlined");
const PROOF = resolve(WORK, "proof");

const TYPE_NAME: Record<BubbleType, string> = {
  1: "black bubble, rough/gradient edge",
  2: "white bubble, black text",
  3: "black bubble, white text",
  4: "text on art, no bubble",
};

function hex(c: [number, number, number]) {
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function main() {
  await mkdir(CUTS, { recursive: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(PROOF, { recursive: true });

  console.log(`panel-bridge M1 demo — titleId=${TITLE_ID} no=${NO}`);
  let cap;
  if (process.env.M1_REUSE === "1") {
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(CUTS)).filter((f) => /^cut-\d+\.png$/.test(f)).sort();
    cap = {
      url: `https://comic.naver.com/webtoon/detail?titleId=${TITLE_ID}&no=${NO} (reused)`,
      count: files.length,
      cuts: files.map((f) => ({ idx: Number(f.match(/(\d+)\.png/)![1]), src: f, file: resolve(CUTS, f) })),
    };
    console.log(`reusing ${cap.count} captured cuts (M1_REUSE=1)`);
  } else {
    cap = await captureChapter({ titleId: TITLE_ID, no: NO, outDir: CUTS });
  }
  console.log(`captured ${cap.count} cuts from ${cap.url}`);

  const perCut: { idx: number; counts: Record<BubbleType, number>; total: number }[] = [];
  const grand: Record<BubbleType, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const cut of cap.cuts) {
    const raster = await readPng(cut.file);
    const dets = detect(raster);
    const drawn = render(raster, dets, 3);
    const file = resolve(OUT, `cut-${String(cut.idx).padStart(3, "0")}.png`);
    await writePng(file, drawn);
    const counts: Record<BubbleType, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const d of dets) { counts[d.type]++; grand[d.type]++; }
    perCut.push({ idx: cut.idx, counts, total: dets.length });
  }

  // Section sheets: stitch outlined cuts vertically, downscaled, for the PR proof.
  const SECTIONS = Math.ceil(perCut.length / 8) || 1;
  for (let s = 0; s < SECTIONS; s++) {
    const group = cap.cuts.slice(s * 8, s * 8 + 8);
    if (!group.length) continue;
    const tiles = [];
    for (const g of group) tiles.push(await readPng(resolve(OUT, `cut-${String(g.idx).padStart(3, "0")}.png`)));
    const scaleW = 400;
    const laid = tiles.map((t) => {
      const h = Math.round((t.height * scaleW) / t.width);
      const out = clone({ width: scaleW, height: h, data: new Uint8ClampedArray(scaleW * h * 4) });
      for (let y = 0; y < h; y++)
        for (let x = 0; x < scaleW; x++) {
          const sx = Math.floor((x * t.width) / scaleW), sy = Math.floor((y * t.width) / scaleW);
          const si = (sy * t.width + sx) * 4, di = (y * scaleW + x) * 4;
          out.data[di] = t.data[si]; out.data[di + 1] = t.data[si + 1];
          out.data[di + 2] = t.data[si + 2]; out.data[di + 3] = 255;
        }
      return out;
    });
    const totalH = laid.reduce((a, b) => a + b.height, 0);
    const sheet = { width: scaleW, height: totalH, data: new Uint8ClampedArray(scaleW * totalH * 4) };
    let off = 0;
    for (const t of laid) {
      for (let y = 0; y < t.height; y++)
        for (let x = 0; x < scaleW; x++) {
          const si = (y * scaleW + x) * 4, di = ((off + y) * scaleW + x) * 4;
          sheet.data[di] = t.data[si]; sheet.data[di + 1] = t.data[si + 1];
          sheet.data[di + 2] = t.data[si + 2]; sheet.data[di + 3] = 255;
        }
      off += t.height;
    }
    await writePng(resolve(PROOF, `section-${String(s + 1).padStart(2, "0")}.png`), sheet);
  }

  const foundTotal = perCut.reduce((a, b) => a + b.total, 0);
  const lines = [
    `# M1 counts — titleId=${TITLE_ID} no=${NO} — ${cap.count} cuts, ${foundTotal} bubbles found`,
    ``,
    `| Type | Color | Meaning | Found |`,
    `| --- | --- | --- | --- |`,
    ...([1, 2, 3, 4] as BubbleType[]).map((t) => `| ${t} | ${hex(TYPE_COLOR[t])} | ${TYPE_NAME[t]} | ${grand[t]} |`),
    ``,
    `Per-cut found counts (by-eye column is filled when the section sheets are reviewed):`,
    ``,
    `| Cut | t1 | t2 | t3 | t4 | found | by-eye |`,
    `| --- | -- | -- | -- | -- | ----- | ------ |`,
    ...perCut.map((p) => `| ${p.idx} | ${p.counts[1]} | ${p.counts[2]} | ${p.counts[3]} | ${p.counts[4]} | ${p.total} |  |`),
    ``,
    `Legend colors used in outlined/ and proof/ PNGs:`,
    ...([1, 2, 3, 4] as BubbleType[]).map((t) => `- ${hex(TYPE_COLOR[t])} — type ${t}: ${TYPE_NAME[t]}`),
  ];
  const md = lines.join("\n") + "\n";
  await writeFile(resolve(WORK, "counts.md"), md);
  await writeFile(resolve(WORK, "counts.json"), JSON.stringify({ titleId: TITLE_ID, no: NO, url: cap.url, cuts: cap.count, grand, perCut, foundTotal }, null, 2));

  console.log(md);
  console.log(`proof sheets -> ${PROOF}`);
  console.log(`DONE exit=0`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
