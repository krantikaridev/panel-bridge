// M1 detector: thin orchestrator over pure stages.
// Enclosed balloons come from marker/bubbles.ts (stable public surface).
// Classification and bare-text are pure stages; merge/dedupe is the final sort.
import { findBubbles } from "../../marker/bubbles.ts";
import type { Raster } from "../../marker/bubbles.ts";
import { bboxOf } from "./preprocess.mts";
import { classify } from "./classify.mts";
import { detectBareText } from "./bare-text.mts";
import type { BubbleType, Detection } from "./types.mts";
import { TYPE_COLOR } from "./types.mts";

export type { BubbleType, Detection };
export { TYPE_COLOR, classify, detectBareText };

export function detect(img: Raster): Detection[] {
  const map = findBubbles(img);
  const dets: Detection[] = [];
  for (const b of map.bubbles) {
    const bbox = bboxOf(b.polygon);
    dets.push({ type: classify(img, b.polygon), polygon: b.polygon, bbox });
  }
  const balloonPolys = map.bubbles.map((b) => b.polygon);
  dets.push(...detectBareText(img, balloonPolys));
  // Final merge/dedupe: reading-order sort only (no spatial NMS yet; behavior preserved).
  dets.sort((a, b) => (a.bbox.y + a.bbox.h / 2) - (b.bbox.y + b.bbox.h / 2));
  return dets;
}
