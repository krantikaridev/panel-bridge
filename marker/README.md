# Marker (layer 1 only)

Screenshot bubble outliner. Not the browser extension. Not translation.

The owner tested the live preview on 2026-10-08 and it does **not** work. Leave the algorithm alone until a failing fixture is added. Do not rewrite it. Do not start OCR or translation.

## What this is

A confirm-first marker. The reader drops a screenshot because Naver cannot be framed. Nothing is drawn until they press Yes. Each accepted dialogue region gets one white outline (black understroke). Sound effects stay unmarked. A pointer probe answers yes/no.

Host page that ran in the Grok Build preview: [host-page.tsx](host-page.tsx). It imports the TanStack app alias `@/lib/bubbles` and will not run from this folder. The logic that must be hardened is [bubbles.ts](bubbles.ts).

## Test

From the repo root, Node 22+:

```
node --experimental-strip-types --test marker/bubbles.test.ts
```

Five tests passed in the sandbox on 2026-10-08. That is not owner acceptance.

## Do not

- Commit publisher episode images, panel crops, or character art.
- Iframe `comic.naver.com` or `m.comic.naver.com`.
- Auto-run detection on drop.
- Turn layer 1 into six model calls.
- Change the PolyForm Noncommercial license.

Full session record: [../docs/session-2026-10-08-handoff.md](../docs/session-2026-10-08-handoff.md).
