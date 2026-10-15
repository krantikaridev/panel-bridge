// Shared detector types. Kept tiny so stages can import without cycles.
import type { Pt } from "../../marker/bubbles.ts";

export type BubbleType = 1 | 2 | 3 | 4;

export type Detection = {
  type: BubbleType;
  polygon: Pt[];
  bbox: { x: number; y: number; w: number; h: number };
};

// Outline colors, one per type.
export const TYPE_COLOR: Record<BubbleType, [number, number, number]> = {
  1: [0, 229, 255], // cyan — black bubble, rough / gradient-faded edges
  2: [255, 59, 48], // red — white bubble, black text
  3: [255, 214, 10], // yellow — black bubble, white text
  4: [52, 199, 89], // green — text with no bubble, on the art
};
