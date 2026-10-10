#!/usr/bin/env bash
# R21 tool-first + R22 Docker: build the OpenCV/MSER trial detector and run it over
# the locally captured cuts (work/cuts/*.png — never committed). Prints JSON results.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CUTS="${1:-$ROOT/work/cuts}"
docker build -t panel-bridge/opencv-mser "$ROOT/m1/detector-trials"
docker run --rm -v "$CUTS:/cuts:ro" panel-bridge/opencv-mser /cuts/*.png
