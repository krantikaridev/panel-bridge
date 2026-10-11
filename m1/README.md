# M1 — bubble detection demo (Feature [panel-bridge#2](https://github.com/krantikaridev/panel-bridge/issues/2))

Open chapter 1 of *Hardcore Leveling Warrior: Earth Game* on Naver, draw a colored outline around every speech bubble, and write proof images + a counts table. This is the milestone-1 demo: prove detection works on the live page before OCR/translation.

## Run it (one command, no manual steps)

```bash
npm install
npm run demo:m1
```

Requires the lane's headless Chrome already running on CDP `127.0.0.1:9303` (`agent-chrome.sh qoder start`). The demo attaches to that Chrome, never to Madan's `9222`. Override the target with `M1_TITLE_ID` / `M1_NO` / `M1_CDP`.

Output goes to `work/` (gitignored):

- `work/cuts/` — each episode cut the page loaded (publisher bytes, local only)
- `work/outlined/` — the same cuts with colored bubble outlines drawn on them
- `work/proof/` — downscaled section sheets for review
- `work/counts.md` / `work/counts.json` — bubbles found per cut and per type

If the page needs a human (captcha / SSO / a locked chapter), the demo stops and prints `WAIT: ...` and exits non-zero. It does not open a window and it does not bypass a paywall.

## The four bubble types and their outline colors

| Type | Color | Meaning |
| --- | --- | --- |
| 1 | cyan `#00E5FF` | black bubble, rough / gradient-faded edge |
| 2 | red `#FF3B30` | white bubble, black text |
| 3 | yellow `#FFD60A` | black bubble, white text |
| 4 | green `#34C759` | text painted on the art, no bubble |

## How it works

- `lib/capture.mjs` — Playwright-core over CDP: load the reader page, scroll to force every lazy cut to load, then screenshot each cut `<img>` element. It reads only images the page already requested (adapter-contract rule 2); it does not re-fetch or rehost.
- `lib/detect.mts` — wraps `marker/bubbles.ts` `findBubbles` (enclosed balloons, types 1–3) and adds `detectBareText` for type 4 (achromatic glyph strokes sitting on colourful art). `bubbles.ts` is not modified; classification samples fill vs glyph luminance and edge fade.
- `lib/render.mts` — draws each detection's outline in its type color.
- `demo.mts` — orchestrates capture → detect → render → proof sheets → counts.

## Tests

```bash
npm test
```

Synthetic fixtures only (procedural shapes in `m1/detect.test.ts`) — no publisher bytes in git. Covers all four types plus negatives (solid shadow, loose text).

## Limits (README)

No page rehosting, no paywall bypass, no episode images committed. Only code and synthetic fixtures live in git.
