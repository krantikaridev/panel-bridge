# M1 results — Earth Game ch.1 (Naver, titleId 817032, no 1)

Reproduce: `npm run demo:m1` (lane Chrome on CDP 9303). Output lands in the gitignored
`work/` dir. **The outlined chapter screenshots are NOT committed** — this repo is public
and the README forbids rehosting publisher pages / shipping episode bytes. `work/proof/section-*.png`
holds the full scrolled-section sheets for a human who can open the page; the numbers below are
what the run produced. The committable, non-copyrighted proof is `m1/fixtures/legend-outlined.png`.

## Bubble types → outline colors

| Type | Color | Meaning |
| --- | --- | --- |
| 1 | cyan `#00E5FF` | black bubble, rough / gradient-faded edge |
| 2 | red `#FF3B30` | white bubble, black text |
| 3 | yellow `#FFD60A` | black bubble, white text |
| 4 | green `#34C759` | text painted on the art, no bubble |

All four appear in ch.1. See `m1/fixtures/legend-outlined.png` for a synthetic example of each.

## Found vs by-eye (sampled audit)

134 cuts, 222 bubbles found. Sections are 8 cuts each. By-eye is an agent audit of the
outlined section sheets (the full per-cut table is written to `work/counts.md` on every run).

| Section | t1 | t2 | t3 | t4 | found | by-eye | note |
| --- | -- | -- | -- | -- | ----- | ------ | ---- |
| 6 | 1 | 17 | 1 | 0 | 19 | ~20 | dense dialogue page; recall high, SFX ignored |
| 9 | 11 | 1 | 0 | 0 | 12 | ~12 | fuzzy/gradient black balloons (type 1) nailed; SFX ignored |
| 12 | 0 | 0 | 0 | 33 | 33 | ~3 | system-UI / narration page; **type 4 over-counts on stylized UI text** |

Chapters 5, 8, 10–11, 13–16 are dialogue/action pages where types 1–3 track closely to by-eye
(typically ±1–2 per section). The intro (sections 1–4) and the system-window pages (12, 14) are
where type 4 is least reliable.

## Honest limits (this is a demo, not a shipped detector)

- **Type 4 (text on art) is the weak path.** It over-counts on glowing system-UI and
  flat-colour panels, and misses white-with-black-outline narration sitting on dark art.
  Classic enclosed balloons (types 1–3) are detected well.
- Type 1 vs type 3 is an edge-quality split (gradient/rough vs crisp); both are "black bubble";
  a fuzzy black balloon with white text can land as either.
- A couple of stray type-2 hits appear on plain narration words with no real balloon (a known
  `findWhite` false positive in `marker/bubbles.ts`, left untouched per the 8 Oct handoff).
- No OCR / translation — that is the next milestone, deliberately not started (handoff rule).

## Tool-first (R21)

OpenCV/MSER was run in Docker (R22) on the same cuts and compared; see
[m1-detector-trials.md](m1-detector-trials.md). It yields 11.3 raw text boxes/cut with no bubble
type, which is why the demo builds on the existing balloon geometry instead.
