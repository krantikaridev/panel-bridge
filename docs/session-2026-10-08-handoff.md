# Session handoff — 2026-10-08

Status: **stopped on purpose.** Owner tested the marker and it does not work. No further detector edits in this session. Next work is testing and hardening `marker/bubbles.ts`, then translation. Do not rework from a blank file.

Parent ticket: [krantikaridev/self#881](https://github.com/krantikaridev/self/issues/881).

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-10-08, publish ~22:30 IST |
| Owner | Madan Meena, GitHub `krantikaridev` only. Do not write this into MMM IITR surfaces. |
| Product repo | https://github.com/krantikaridev/panel-bridge |
| License | PolyForm Noncommercial 1.0.0. Do not switch to MIT. |
| Original read deadline | 2026-10-15 EOD IST, one episode in English. Superseded for sequencing: harden detection first, then translate. |
| Token note | Owner: this thread used **>10% of weekly** usage. Chat is not storage. Commit broken slices the same day. |
| Host that was previewed | Grok Build sandbox, React 19, TanStack Start **1.168.60** (CVE-2026-102989 floor; do not downgrade), Vite 8, Tailwind 4. Dev `0.0.0.0:8080`. Smoke preview `127.0.0.1:8081`. |
| Host app name | `app-builder-workspace`. Auth and db stay **off** for this product. The scaffold is not the product. |
| Where the code lived until this commit | Only in that sandbox. A compaction and a second thread could not see it. |

## Target episode (do not commit the art)

- Page: https://comic.naver.com/webtoon/detail?titleId=817032&no=156&week=fri
- Mobile host the owner actually opened: `m.comic.naver.com`
- Series: 열렙전사 EARTH GAME. 글·그림 김세훈.
- Naver title on the HTML: `155화 - 연료` while the query `no` is **156**. Trust the URL `no`, not the display number.
- `titleId` **817032**. Image host seen while tuning (do not refetch into git): `image-comic.pstatic.net/mobilewebimg/817032/156/`. About **74** cuts. Cut width seen **690** and **720**. Cut height about **1600**. Title raster **720×1559**.
- Official English exists and lags: WEBTOON serializes *Hardcore Leveling Warrior: Earth Game* (Sehoon Kim), Wednesday updates. This pipeline is for the Korean page the owner already opened, not a rehost of the English edition.
- Naver **cannot be iframed**. Input is a screenshot drop. That is a product constraint, not a bug to route around with a proxy.

## What the owner asked for

JAB layers, kept as a data contract, not six agents:

1. Bubble location.
2. Text inside it.
3. Speaker and intention (intention may be a side effect).
4. Other context.
5. Nuanced translation.
6. Render.

Slice that was actually built: **layer 1 only**. One encapsulating border per dialogue bubble. Skip sound effects, empty `!!` shouts, and figures. Google-Translate-style pill that **asks first** and does not auto-run. Probe chip after marking: yes if the pointer is inside a bubble, no otherwise.

Second design already on the ticket (do not flatten, do not rebuild): extension captures the strip only; a local worker does geometry, OCR, one structured translation call, and a local HTML reader. This commit is not that extension. It is the geometry experiment.

## Owner verdict

2026-10-08, after the preview: **"i tested it's not working, but leave it for now."**

Lab checks below are **not** acceptance. The next agent adds a fixture for what the owner saw, then hardens. It does not start translation, and it does not throw away `marker/bubbles.ts`.

## What landed in this repo

| Path | Role |
| --- | --- |
| `marker/bubbles.ts` | Detector. `findBubbles(raster) -> BubbleMap`, `probeBubble(map, x, y)`. |
| `marker/bubbles.test.ts` | 5 node tests. Synthetic shapes only. |
| `marker/demo-strip.ts` | Procedural stand-in strip. Not the episode. Uses `document` / canvas. Import patched to `./bubbles` for this folder. |
| `marker/host-page.tsx` | The preview page copied from `src/routes/index.tsx`. TanStack route. Will not compile in this repo. Documents the pill and the overlay. |

Run tests:

```
node --experimental-strip-types --test marker/bubbles.test.ts
```

Sandbox result before the owner rejection: **5 pass**. `tsc --noEmit` on the host app passed. `agent-browser` on the sample strip after Yes returned `marked 3 polys 6` (3 bubbles, each drawn twice: ink understroke + white stroke).

## UI contract (do not regress)

Phases: `ask | looking | marked | empty | dismissed`.

- Drop or the built-in sample does **not** mark.
- Yes runs `findBubbles` after a 30ms timeout (so the button can paint "Looking").
- Undo returns to ask and clears polygons.
- Dismiss hides the pill. "Mark bubbles" brings ask back.
- Overlay is SVG on an `<img>` blob URL. **No `<canvas>` in the live DOM** (offscreen canvas only). A live canvas trips the host brand check.
- Each bubble is two `<polygon>` elements: `#1c1b19` at `width * 0.012`, then `#ffffff` at `width * 0.007`.
- Probe uses `probeBubble` (mask lookup), not a fresh point-in-polygon.
- Screenshot path scales width down to **900** before detection.
- Attributes for tests: `data-phase`, `data-bubble-count` on the pill group.

## Detector as committed (do not retune from memory)

Downscale: `MAX_W = 420`. Raster is `{width, height, data: Uint8ClampedArray}`.

Sampling at the mask pixel center:

- ink: `L < 34` and chroma `< 38` (fuzzy black balloons)
- light (holes): `L > 176` and chroma `< 70`
- glyph: `L < 40` and chroma `< 45`
- thin barrier source: `L < 100` and chroma `< 80`, then 1px dilate
- clean paper: `L > 198` and chroma `< 28`

`findDark`: connected component of ink. Reject if box `< 34×26`, solidity `< 0.52`, aspect outside `0.36–2.7`, area `> 20%` of the mask, or it touches 2+ borders. Interior must be light holes: `>= 36` light pixels, inset about 5% / 4%, centroid in `x 0.25–0.75` and `y 0.18–0.82`, `>= 3` hole components with area `>= 5`. Convex hull expanded by 3 mask px.

`findWhite`: glyph components area `8–1800`, height `5–130`, fill `> 0.14`, not on the border. Group neighbors when the gap is within about `0.75–1.3×` the shorter height. Group needs `>= 4` glyphs, width `>= 32`, height `>= 14`, height `<= 1.5×` width. 32 rays start **after** the text box (`edge + 2`) so a second text line is not a fake ring. A hit is paper (`L > 170`, not barrier) then barrier. Need `>= 70%` rays, median padding `3–84` (was 48; raised because roomy balloons sat at ~51 and were dropped), inliers within `max(10, med * 2.2)` at `>= 62%` of rays, CV `<= 0.5`, clean-paper fraction of the padded text box `>= 0.72`. Hull of hit points expanded by 2.

`findEnclosed`: separate wall from the **darkest pixel in each downsample bin** (`L < 70`, chroma `< 60`), dilated once. Paper is `L > 188` and chroma `< 36` and not wall. Component may touch only the top or only the bottom (cropped narration boxes). Not the left or right edge, and not two edges. Area `900` to `14%` of the mask, solidity `>= 0.62`, width `>= 48`, height `>= 32`, `>= 4` glyphs whose neighborhood touches the component, glyph centroid inset 12%. Hull expanded by 2. Drop if box IoU with an earlier polygon `> 0.3`.

Sort by vertical center. Paint the probe mask in mask space. Polygons returned in source pixels.

## Lab counts (agent only, owner disagrees)

These used local copies of episode cuts that were **deleted** and must not be recommitted. Width 690 unless noted. Counts are from the final `findBubbles` in this commit.

| Cut | Count | What the agent thought it was |
| --- | --- | --- |
| title | 0 | No dialogue. Correct to mark nothing. |
| 8 | 0 | Miss: outlined sentence on speed lines, no balloon (`용서 할 수 없다.`). Yellow SFX correctly unmarked. |
| 12, 16, 28, 32 | 0 | SFX / action. Intended empty. |
| 20 | 1 | One black balloon. |
| 24 | 2 | Two black balloons, one outline each. Red skull not marked. |
| 36, 40 | 0 | SFX and a handwritten thud. Intended empty. |
| 44 | 1 | One white balloon. Cyan SFX not marked. |
| 48 | 2 | Round white balloon plus the rectangular narration box at the top. |
| 52 | 3 | Two black balloons plus the short jagged white shout. `훅!` / `파직` not marked. |

Demo strip: black oval, second black oval, white paper oval. Star and `!!` unmarked.

Why this table is not enough: the owner's screenshots were not saved as fixtures. The title shot they attached has no dialogue. Their earlier note was "picked few, not all." A later note is "not working." Assume both recall and precision can be wrong on the drops they actually used.

## Known failure modes already paid for

- Multi-line fuzzy black balloons used to split into overlapping fragments when the seed was the white glyphs. `findDark` seeds the black body instead. Do not go back to glyph-seeding for black balloons.
- White rays that start at the centroid hit the other text line and report a fake ring. Rays must start outside the text box.
- A 1px barrier dilation closed anti-aliased white outlines. Center sampling still drops 1px strokes at `MAX_W = 420`. The enclosed-region wall uses min-luminance in the bin for that reason. The ray barrier does not.
- Median padding cap of 48 dropped real white balloons whose text does not fill the balloon (measured medians **50.0** and **50.7** mask px). Cap in this commit is **84**.
- Eyes and armor looked like white bubbles until the clean-paper gate (`>= 0.72`). Do not remove it to chase recall.
- A solid dark shadow and a thin `!!` ring are in the unit tests as negatives.
- Floating dialogue with **no balloon** is still out of scope. Do not bolt it on while balloon recall is still failing the owner.
- Convex hulls over-cover spikes and tails. A tighter contour is a hardening task, not a rewrite.
- Narration rectangles fail the ray test (padding is not round; thin borders leak). `findEnclosed` was added for that. It may also be what the owner is seeing as a bad outline. Check before deleting it.

## Session damage (so the next agent does not repeat it)

- An edit with an empty `old_string` **wiped** `demo-strip.ts` and `bubbles.test.ts`. Both were rewritten from an earlier read. After any write, confirm the file is non-empty.
- A later edit dropped the `L` luminance buffer while inserting `clean`. Tests failed until both declarations were restored.
- Context was **compacted** after the detector had been verified in the sandbox and before the user-facing note was sent. The next turn opened the episode art again and kept tuning (padding cap, enclosed regions, narration boxes) instead of stopping.
- Owner hypothesis, treated as likely: the thread was moved under a project, then another thread was opened for research, and that interrupted this one. Evidence that fits: the same hour, a different thread commented on #881 and created this repo (vision, license, source list) while the marker still existed only in the sandbox. Two writers, one ticket, no shared tree.
- There was at least one lost-progress retry (the wiped files, plus the post-compaction retune).
- Cost drivers that are ours: full-panel vision in the thread, threshold logs, scope creep inside "it missed some," and no commit until the owner asked for publish.

## Rules that come out of the burn

1. First commit of a multi-hour build is the current tree plus a handoff, even if the owner will reject it. Chat and the sandbox are not the repo.
2. One ticket, one writer for the build. A research thread leaves a pointer. It does not re-derive the design in parallel.
3. After compaction, read this file. Do not re-download the episode. Do not retune unless the owner pasted a new failure.
4. One hypothesis, one numeric check, stop. No panel galleries in the thread.
5. Agent-green (unit tests, sample strip, 3 polygons) is not owner-green. The owner already said this build does not work.
6. If the slice is big enough to explain, publish it and stop. Do not spend another vision pass to finish.
7. Never ship episode bytes. Schema, code, and synthetic fixtures only.

## Next task — the only one

**Test and harden bubble detection. Then stop. Translation is the task after that, not part of this one.**

Done when all of these are true:

- A fixture set lives in git and contains **no** Naver bytes. Use the procedural strip plus small synthetic cases for: one black balloon, two black balloons, one white balloon, a roomy white balloon, a top-cropped narration rectangle, a short jagged white balloon, an empty `!!`, a solid shadow, an eye-like white disk with one dark pupil, and loose text with no outline.
- The owner's real failure is described in the issue with what was marked and what was missed. If they send screenshots, keep them **out of git** and record only counts and a sketch.
- `findBubbles` changes only to make those fixtures pass. No second detector family unless a fixture cannot be expressed with the three already here.
- SFX, figures, title cards, and empty shouts stay at zero bubbles.
- The pill still asks before marking.
- A short note in this file says which fixture was the owner's failure.

Not done if any of these happen:

- OCR, translation, speaker labels, or a rendered English line.
- A new extension manifest "while we are here."
- A from-scratch detector.
- Kakao or any later wave.

## Explicitly out of this commit

Notifier (idea 2 on #881). Overlay of English on the Naver page. Cache by image hash. `SourceAdapter` implementation. Those stay described in `docs/adapter-contract.md` and `docs/SOURCES.md`.
