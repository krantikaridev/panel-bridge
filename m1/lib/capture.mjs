// M1 capture: read the live Naver reader page in headless Chromium and screenshot
// each episode cut the page already loaded. If M1_CDP is set, attach to that running
// Chrome; otherwise launch our own headless browser (see package.json "postinstall"
// and `npx playwright-core install chromium`).
// No new chapter requests, no rehosting, no paywall bypass. Publisher bytes go to
// the gitignored work/ dir only.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

async function openContext() {
  const cdp = process.env.M1_CDP;
  if (cdp) {
    const browser = await chromium.connectOverCDP(cdp);
    // the attached Chrome already holds the logged-in context; reuse it
    return { browser, ctx: browser.contexts()[0] ?? (await browser.newContext()) };
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  return { browser, ctx: await browser.newContext() };
}

import { CURRENT } from "../config.mjs";

// Episode cuts on the desktop reader. Pattern and chapter URL come from config
// so a Kakao or Chinese-manhua page is a config change, not a code change.
export function cutMatcher(titleId, no, patternFn = CURRENT.cutPattern) {
  const re = patternFn(titleId, no);
  return (src) => re.test(src);
}

export async function captureChapter({
  titleId,
  no,
  outDir,
  maxScroll = 120,
  settleMs = 250,
  adapter = CURRENT,
}) {
  await mkdir(outDir, { recursive: true });
  const dir = resolve(outDir);
  const { browser, ctx } = await openContext();
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 900, height: 1400 });
    const url = adapter.chapterUrl(titleId, no);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const human = await page.evaluate((gateSrc) => {
      // Gate check applies to the viewer area only — the page footer contains
      // legal text (전용상품권약관, 결제…) that would otherwise false-positive.
      const root = document.querySelector("#content") || document.querySelector("main") || document.body;
      const imgs = [...document.querySelectorAll("img")].filter((im) => /_IMAG01_\d+\.(jpe?g|png)$/.test(im.currentSrc || im.src));
      if (imgs.some((im) => im.naturalHeight > 400)) return false; // cuts rendered -> not gated
      const gate = new RegExp(gateSrc, "i");
      return gate.test(root.innerText || "");
    }, adapter.gateSignals.source);
    if (human) throw new Error("WAIT: page looks gated or captcha'd — this run stops and asks a human, it does not push through");

    // Force every lazy cut to load by scrolling to the bottom of the infinite strip.
    const match = cutMatcher(titleId, no, adapter.cutPattern);
    let prev = -1, stable = 0;
    for (let i = 0; i < maxScroll; i++) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(settleMs);
      const count = await page.evaluate((p) => {
        const re = new RegExp(p);
        return [...document.querySelectorAll("img")].filter(
          (im) => re.test(im.currentSrc || im.src) && im.naturalHeight > 400
        ).length;
      }, match.source).catch(() => 0);
      if (count === prev) { if (++stable >= 6) break; } else { stable = 0; prev = count; }
    }

    const list = await page.evaluate((p) => {
      const re = new RegExp(p);
      const imgs = [...document.querySelectorAll("img")].filter(
        (im) => re.test(im.currentSrc || im.src) && im.naturalHeight > 400
      );
      // give each a stable data attr so we can screenshot in DOM order
      imgs.forEach((im, idx) => im.setAttribute("data-m1-cut", String(idx)));
      return imgs.map((im, idx) => ({
        idx,
        src: im.currentSrc || im.src,
        w: im.naturalWidth,
        h: im.naturalHeight,
      }));
    }, match.source);

    const cuts = [];
    for (const meta of list) {
      const el = page.locator(`img[data-m1-cut="${meta.idx}"]`);
      await el.scrollIntoViewIfNeeded().catch(() => {});
      const file = resolve(dir, `cut-${String(meta.idx).padStart(3, "0")}.png`);
      await el.screenshot({ path: file, timeout: 30000 });
      cuts.push({ idx: meta.idx, src: meta.src, w: meta.w, h: meta.h, file });
    }
    return { url, count: cuts.length, cuts };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
