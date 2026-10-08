# panel-bridge

Working name. Rename later. This repository is the home for the reader extension; the MVP being built in the other thread can land here when it is ready.

A client-side browser extension that helps you read publisher pages you already have access to, in English, when the official English release is behind or missing.

Naver Webtoon is wave 0. The next targets are the platforms below, chosen because their English catalogues lag, shrink, or never existed.

## Why this exists

Official English is the bottleneck, not the art.

- Korean originals on Naver and Kakao update on a weekly cadence. English WEBTOON Fast Pass, Tappytoon, and the old Tapas / Kakao Webtoon storefronts trail that, and many series are never licensed.
- Kakao is shutting Tapas and Kakao Webtoon and folding the IP onto Korean KakaoPage by the end of 2026. The English door is closing; the Korean catalogue is not.
- Chinese manhua is the largest permanent hole. Bilibili Comics shut its international app in February 2024. Tencent Comics (ac.qq.com) has no English edition. Kuaikan's English slice on INKR is a rotating subset and is usually months behind.
- Japanese Jump flagships are often simulpub on Manga Plus and VIZ. The lag is in the rest of the catalogue: Jump+ series that drop mid-run, Rookie and one-shots without overseas consent, Magazine Pocket web originals, Tonari no Young Jump, and light-novel adaptations on KadoComi.

Seed titles from the original note: Hardcore Leveling Warrior / Earth Game, plus the series already followed by hand (One Piece, Hunter x Hunter, Berserk, Teenage Mercenary, and irregular Naver schedules).

Tracking issue: [krantikaridev/self#881](https://github.com/krantikaridev/self/issues/881).

## What it is

- A browser extension that runs on the publisher page the reader already opened.
- Text path: detect Hangul, Japanese, or Chinese in the DOM and replace it in place.
- Image path: speech bubbles are usually baked into images or canvas, so OCR plus translation is required. Cache by image hash so a chapter is not re-billed.
- Batching and a MutationObserver so infinite-scroll chapters do not translate the same panel twice.
- A source adapter per site. Naver is the MVP adapter. Everything else is a later adapter behind the same contract (`docs/adapter-contract.md`).

## What it is not

- Not a mirror, scraper farm, or chapter redistributor. Pages are not rehosted.
- Not a paywall bypass. If a chapter is locked, the extension does not unlock it.
- Not a replacement for simulpub. If Manga Plus or WEBTOON already has the chapter the same day, that is the preferred read.
- Not a commercial product under this license. See License.

Copyright in the comics stays with the publishers and creators. The extension translates a page the user is already entitled to view, in the user's browser. Rights, ToS, and login walls still have to be checked per adapter before that adapter is enabled.

## Source waves

Full notes, URLs, and why each one lags: [docs/SOURCES.md](docs/SOURCES.md).

| Wave | Sources | Why next |
| --- | --- | --- |
| 0, in progress | Naver Webtoon (`comic.naver.com`) | MVP in the other thread. Largest Korean free catalogue. English is a licensed slice plus Fast Pass. |
| 1 | KakaoPage, Kakao Webtoon | Naver's rival. English storefronts shutting down by end of 2026. Same-day Korean chapters, wait-or-pay. |
| 2 | Kuaikan, Tencent Comics (ac.qq), Bilibili Manhua | Biggest English hole. EN Bilibili app is gone. ac.qq has no English edition. |
| 3 | Shonen Jump+, Magazine Pocket, Tonari no Young Jump | Jump flagships are often simulpub. These cover the catalog gaps, Kodansha web originals, and Young Jump (One-Punch Man and company). |
| 4 | Lezhin KR, Ridibooks, Bomtoon, Sunday Webry, KadoComi, Pixiv Comic | Paid or niche catalogues where English is partial, late, or absent. |

Chapter notification (Idea 2 on the ticket) stays in scope, but it is a separate module: irregular schedules on Naver and these same sources, not a second product.

## Status

- 2026-10-08: vision repo opened. Source map and license landed.
- 2026-10-08 later: layer-1 marker committed under `marker/`. Owner tested the live preview and it does **not** work. Leave it. Next task is test and harden detection. Do not start translation and do not rewrite the detector. Record: [docs/session-2026-10-08-handoff.md](docs/session-2026-10-08-handoff.md).
- Name is a placeholder. The extension itself is still not in this repo.

## Layout

```
docs/SOURCES.md                         ranked target sources
docs/adapter-contract.md                interface later adapters share
docs/session-2026-10-08-handoff.md      marker slice, owner rejection, retro, next task
marker/                                 layer-1 detector and the preview page (not the extension)
extension/                              still empty
```

## License

PolyForm Noncommercial 1.0.0. See [LICENSE](LICENSE).

MIT was the first choice and was rejected on purpose. MIT allows selling the software. This project should stay forkable, modifiable, and usable for personal and noncommercial study, and closed to commercial use. PolyForm Noncommercial is the most flexible license that still draws that line: any noncommercial purpose is permitted, including changes and redistribution, and commercial use is not.

It is source-available, not an OSI-approved open-source license. That is the intended tradeoff.

Required Notice: Copyright (c) 2026 Madan Meena (https://github.com/krantikaridev)
