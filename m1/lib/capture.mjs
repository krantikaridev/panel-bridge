// M1 capture: read the live Naver reader page through the lane's headless Chrome
// (CDP 127.0.0.1:9303) and screenshot each episode cut the page already loaded.
// No new chapter requests, no rehosting, no paywall bypass. Publisher bytes go to
// the gitignored work/ dir only.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const CDP = process.env.M1_CDP || "http://127.0.0.1:9303";

// Episode cuts on the desktop reader: image-comic.pstatic.net/webtoon/<titleId>/<no>/..._IMAG01_<k>.jpg
// The age-rating card and promos share the host, so match the webtoon path + _IMAG and a tall cut.
export function cutMatcher(titleId, no) {
  const re = new RegExp(`/webtoon/${titleId}/${no}/.*_IMAG01_\\d+\\.(jpe?g|png)$`);
  return (src) => re.test(src);
}

export async function captureChapter({ titleId, no, outDir, maxScroll = 120, settleMs = 250 }) {
  await mkdir(outDir, { recursive: true });
  const dir = resolve(outDir);
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 900, height: 1400 });
    const url = `https://comic.naver.com/webtoon/detail?titleId=${titleId}&no=${no}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const human = await page.evaluate(() => {
      // Gate check applies to the viewer area only — the page footer contains
      // legal text (전용상품권약관, 결제…) that would otherwise false-positive.
      const root = document.querySelector("#content") || document.querySelector("main") || document.body;
      const imgs = [...document.querySelectorAll("img")].filter((im) => /_IMAG01_\d+\.(jpe?g|png)$/.test(im.currentSrc || im.src));
      if (imgs.some((im) => im.naturalHeight > 400)) return false; // cuts rendered -> not gated
      return /captcha|비정상적인 접근|로그인 후 이용|이용권|결제가 필요|잠겨|locked/i.test(root.innerText || "");
    });
    if (human) throw new Error("WAIT: page looks gated or captcha'd — a human must look, not the lane");

    // Force every lazy cut to load by scrolling to the bottom of the infinite strip.
    const match = cutMatcher(titleId, no);
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

    const handles = await page.evaluateHandle((p) => {
      const re = new RegExp(p);
      return [...document.querySelectorAll("img")].filter(
        (im) => re.test(im.currentSrc || im.src) && im.naturalHeight > 400
      );
    }, match.source);
    const els = await handles.asElement() ? [handles] : []; // placeholder; replaced below
    void els;

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
