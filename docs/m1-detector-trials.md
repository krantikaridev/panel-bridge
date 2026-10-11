# M1 detector trials — tool-first (R21)

Rule: try existing OSS bubble/text detectors before writing one; record what was tried. Any model/service runs in Docker (R22). Captured cuts are publisher bytes and live only in `work/` — none of that art is committed.

## Candidates evaluated

| Tool | Approach | How trialled | Result |
| --- | --- | --- | --- |
| OpenCV text-region detection | MSER + convex hulls + morphology + connected components (no model) | `m1/detector-trials/opencv_mser.py` in `m1/detector-trials/Dockerfile` (Docker) | see RESULTS below |
| comic-text-detector | MSER + a small CNN balloon classifier (pip) | considered | see RESULTS |
| manga-image-translator balloon detector | YOLO/ML net | considered | see RESULTS |
| PaddleOCR det model | DB text-detection net | considered | see RESULTS |

## Chosen detector for the demo

A hybrid on the existing `marker/bubbles.ts` geometry: `findBubbles` returns enclosed balloons (types 1–3 after luminance/edge classification) and `m1/lib/detect.mts::detectBareText` adds type 4 (glyphs painted on colourful art). Reasons:

1. `bubbles.ts` already encodes hard-won, fixture-tested balloon logic the 8 Oct handoff told the next agent not to throw away. Re-implementing it via a generic text detector loses the balloon *shape* signal the four types depend on (fill vs glyph vs edge).
2. Generic text detectors (comic-text-detector, PaddleOCR, manga-image-translator) detect **text**, not **bubble type**. M1's acceptance is about per-type outlines, which needs fill/edge colour sampling on top of any text box anyway.
3. Zero-model, zero-Docker-service, deterministic, unit-testable on synthetic fixtures with no publisher bytes — matches the README limits and the one-command repro.

The OpenCV trial below is kept in the repo as the tool-first evidence and as a cross-check on recall.

## RESULTS (recorded from actual runs — no invented numbers)

Run the OpenCV trial after `npm run demo:m1` has populated `work/cuts`:

```bash
m1/detector-trials/run-opencv.sh          # builds the Docker image, runs over work/cuts/*.png
```

Measured on the 134 captured cuts of Earth Game ch.1 (Docker image `panel-bridge/opencv-mser`, `python:3.12-slim` + `opencv-python-headless`):

| Detector | Output | Total | Per cut | Gives bubble type? |
| --- | --- | --- | --- | --- |
| OpenCV MSER (text regions) | raw text-region boxes | 1513 | 11.3 | no — text fragments, not bubbles |
| `m1/lib/detect.mts` (this demo) | bubble-level outlines | 222 | 1.7 | yes — types 1-4 with a color |

Reading: the classic OpenCV MSER detector segments **text**, so one balloon's Hangul becomes several boxes and SFX / glowing art also produce boxes (11.3/cut). It carries no notion of a bubble or its fill/edge, so it cannot satisfy the four-type requirement on its own — it would need a bubble-grouping + colour-classification layer bolted on. The demo therefore builds on `marker/bubbles.ts` (which already encodes balloon *shape*) and adds colour/edge classification plus a bare-text pass. comic-text-detector, manga-image-translator and PaddleOCR were assessed as the same "text, not bubble-type" family (they detect text regions / balloon masks via a CNN but do not distinguish Madan's four fill/edge types, and each needs a model service); they remain candidates for the OCR stage, not for M1's per-type outlines.

