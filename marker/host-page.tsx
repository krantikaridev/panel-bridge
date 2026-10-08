import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { findBubbles, probeBubble, type BubbleMap, type Raster } from "@/lib/bubbles";
import { drawDemoStrip } from "@/lib/demo-strip";

export const Route = createFileRoute("/")({ component: Home });

type Phase = "ask" | "looking" | "marked" | "empty" | "dismissed";

function Home() {
  const [raster, setRaster] = useState<Raster | null>(null);
  const [source, setSource] = useState<"sample" | "screenshot">("sample");
  const [phase, setPhase] = useState<Phase>("ask");
  const [found, setFound] = useState<BubbleMap | null>(null);
  const [probe, setProbe] = useState<{ x: number; y: number; on: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    drawDemoStrip()
      .then((next) => {
        if (!cancel) setRaster(next);
      })
      .catch(() => {
        if (!cancel) setError("Could not draw the sample strip.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!raster) return;
    const canvas = document.createElement("canvas");
    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancel = false;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0);
    canvas.toBlob((blob) => {
      if (cancel || !blob) return;
      const url = URL.createObjectURL(blob);
      setImgUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    });
    return () => {
      cancel = true;
    };
  }, [raster]);

  const resetAsk = useCallback(() => {
    setPhase("ask");
    setFound(null);
    setProbe(null);
  }, []);

  const mark = useCallback(() => {
    if (!raster) return;
    setPhase("looking");
    setProbe(null);
    window.setTimeout(() => {
      const map = findBubbles(raster);
      setFound(map);
      setPhase(map.bubbles.length ? "marked" : "empty");
    }, 30);
  }, [raster]);

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      setError(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const image = ctx.getImageData(0, 0, width, height);
        setRaster({ width, height, data: image.data });
        setSource("screenshot");
        resetAsk();
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setError("Could not read that image.");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [resetAsk],
  );

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((phase !== "marked" && phase !== "empty") || !found || !frameRef.current) {
      setProbe(null);
      return;
    }
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * (raster?.width ?? 1);
    const y = ((event.clientY - rect.top) / rect.height) * (raster?.height ?? 1);
    setProbe({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      on: probeBubble(found, x, y),
    });
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">Bubble</span>
          <span className="text-sm text-muted">Layer 1 · outline only</span>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-4 text-sm font-medium text-ink"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Screenshot
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </header>

      <div className="bg-bar text-bar-fg">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-sm font-medium">
            {source === "sample" ? "Sample strip" : "Your screenshot"}
          </p>
          <p className="hidden text-sm text-bar-fg/70 sm:block">Confirm before anything is marked</p>
        </div>
      </div>

      <p className="mx-auto w-full max-w-3xl px-4 py-3 text-sm leading-relaxed text-muted">
        Aimed at the Naver episode. That page cannot be framed here. Drop a screenshot of it, then say yes.
        Each dialogue bubble gets one outline. Sound effects stay unmarked.
      </p>

      {error ? <p className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-ink">{error}</p> : null}

      <div className="relative mx-auto w-full max-w-3xl px-3 pb-16">
        <div className="sticky top-3 z-20 mb-3 flex justify-center">
          <Pill
            phase={phase}
            count={found?.bubbles.length ?? 0}
            disabled={!raster}
            onYes={mark}
            onUndo={resetAsk}
            onDismiss={() => {
              setPhase("dismissed");
              setFound(null);
              setProbe(null);
            }}
            onShow={() => setPhase("ask")}
          />
        </div>

        <div
          ref={frameRef}
          className="relative mx-auto w-full max-w-xl overflow-hidden bg-paper shadow-sm"
          onPointerMove={onMove}
          onPointerLeave={() => setProbe(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onFile(event.dataTransfer.files?.[0]);
          }}
        >
          {imgUrl ? (
            <img src={imgUrl} alt="" className="block h-auto w-full" draggable={false} />
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-muted">Drawing the sample…</div>
          )}
          {raster && found && (phase === "marked" || phase === "empty") ? (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${raster.width} ${raster.height}`}
              aria-hidden="true"
            >
              {found.bubbles.map((bubble) => (
                <polygon
                  key={bubble.id}
                  points={bubble.polygon.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="#1c1b19"
                  strokeWidth={raster.width * 0.012}
                  strokeLinejoin="round"
                />
              ))}
              {found.bubbles.map((bubble) => (
                <polygon
                  key={`${bubble.id}-mark`}
                  points={bubble.polygon.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={raster.width * 0.007}
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          ) : null}
          {probe && phase === "marked" ? (
            <div
              className="pointer-events-none absolute z-10 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-bar-fg"
              style={{ left: probe.x + 14, top: probe.y + 14 }}
            >
              {probe.on ? "yes" : "no"}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Pill({
  phase,
  count,
  disabled,
  onYes,
  onUndo,
  onDismiss,
  onShow,
}: {
  phase: Phase;
  count: number;
  disabled: boolean;
  onYes: () => void;
  onUndo: () => void;
  onDismiss: () => void;
  onShow: () => void;
}) {
  if (phase === "dismissed") {
    return (
      <button
        type="button"
        onClick={onShow}
        className="pointer-events-auto h-11 rounded-full bg-green px-4 text-sm font-medium text-green-ink"
      >
        Mark bubbles
      </button>
    );
  }

  const label =
    phase === "looking"
      ? "Looking"
      : phase === "marked"
        ? count === 1
          ? "1 bubble marked"
          : `${count} bubbles marked`
        : phase === "empty"
          ? "No dialogue bubbles"
          : "Mark bubbles?";

  return (
    <div
      role="group"
      aria-label="Bubble marker"
      data-phase={phase}
      data-bubble-count={phase === "marked" || phase === "empty" ? count : undefined}
      className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-green pr-1.5 pl-4 text-green-ink shadow-sm"
    >
      <span className="text-sm font-medium">{label}</span>
      {phase === "ask" || phase === "looking" ? (
        <button
          type="button"
          disabled={disabled || phase === "looking"}
          onClick={onYes}
          className="h-9 rounded-full bg-green-ink px-4 text-sm font-semibold text-green disabled:opacity-60"
        >
          Yes
        </button>
      ) : (
        <button
          type="button"
          onClick={onUndo}
          className="h-9 rounded-full border border-green-ink/40 px-4 text-sm font-medium text-green-ink"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="grid size-9 place-items-center rounded-full text-green-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
