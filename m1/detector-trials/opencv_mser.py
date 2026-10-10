#!/usr/bin/env python3
"""Tool-first (R21) trial: classic OpenCV text-region detection (MSER + morphology)
as a candidate speech-bubble/text detector, run in Docker (R22).
Reads PNG paths from argv, prints a JSON line per image: bounding boxes of text
regions + counts, so we can compare its recall against the JS detector in m1/lib/detect.mts.
No model download; pure OpenCV, small image.
"""
import sys, json
import cv2
import numpy as np


def text_regions(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mser = cv2.MSER_create()
    mser.setMinArea(60)
    mser.setMaxArea(int(gray.size * 0.02))
    regions, _ = mser.detectRegions(gray)
    if not regions:
        return []
    hulls = [cv2.convexHull(p.reshape(-1, 1, 2)) for p in regions]
    canvas = np.zeros(gray.shape, np.uint8)
    cv2.fillPoly(canvas, hulls, 255)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
    close = cv2.morphologyEx(canvas, cv2.MORPH_CLOSE, k)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(close, 8)
    boxes = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < 400 or w < 12 or h < 8:
            continue
        if w > gray.shape[1] * 0.95 or h > gray.shape[0] * 0.6:
            continue
        boxes.append([int(x), int(y), int(w), int(h)])
    return boxes


def main():
    out = []
    for path in sys.argv[1:]:
        img = cv2.imread(path)
        if img is None:
            out.append({"file": path, "error": "unreadable"})
            continue
        b = text_regions(img)
        out.append({"file": path, "count": len(b), "boxes": b})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
