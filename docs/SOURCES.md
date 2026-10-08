# Target sources

Naver is wave 0 and is not repeated here except as the baseline. These are the next adapter targets, ranked by how far official English lags and how much catalogue sits behind that lag.

Rule for every adapter: run only on a page the user already opened and is allowed to see. Do not unlock paid chapters, do not rehost images, do not prefer this path when a same-day official English chapter exists.

Status date: 2026-10-08.

## Wave 1 — Korean, after Naver

### KakaoPage — `https://page.kakao.com`

Priority: first adapter after Naver.

Kakao's flagship. Home of the webtoon adaptations that tend to blow up later in English (Solo Leveling started here). Wait-or-pay: one episode now, the next free after a timer, usually 12–72 hours. No English catalogue. In September 2026 Kakao Entertainment said it would shut Tapas and Kakao Webtoon and consolidate about 16,000 story IPs onto KakaoPage by the end of 2026. The English door is closing; the Korean original is becoming the only door.

English today: a licensed slice on Tappytoon, WEBTOON, Manta, Lezhin. Usually behind. Many series never leave Korean.

### Kakao Webtoon — `https://webtoon.kakao.com`

Separate catalogue from KakaoPage, same wait-or-pay model, merging into KakaoPage. One Kakao-family adapter with two host matchers is enough. Do not build a long-lived second stack.

### Lezhin Korea — `https://www.lezhin.com`

Lezhin runs a Korean store and an English store. The Korean side almost always has more chapters, earlier. Mature and BL heavy. Paid (coins). Useful when the English serialization is behind the Korean one, not when the reader has not bought the chapter.

### Ridibooks — `https://ridibooks.com`

Paid store. Strongest romance and BL catalogue, including webtoon editions of web novels. English releases are sparse.

### Bomtoon

BL-focused Korean platform. English is a thin licensed slice. Same pattern as Lezhin KR: ahead of, or instead of, English.

## Wave 2 — Chinese manhua

This is the largest English hole. Bilibili Comics shut its international app and site in February 2024 and took the licensed English chapters offline. What remains in English is INKR (a rotating Kuaikan slice), MangaToon, WebComics, and the occasional Lezhin pickup. Gaps of months are normal; most series are never licensed.

### Kuaikan Manhua — `https://www.kuaikanmanhua.com`

Largest modern manhua platform. Millions of monthly visitors, thousands of originals, romance and shoujo as well as action. Free chapters plus paid. English via INKR is a subset and lags.

### Tencent Comics / AC.QQ — `https://ac.qq.com`

Largest catalogue in China, tens of thousands of series. Action and cultivation heavy (The Outcast, Battle Through the Heavens, Fox Spirit Matchmaker). No English edition of the platform. Login is QQ or WeChat, which is an adapter risk, not a reason to skip the source. Some titles were licensed to Tapas (closing) or WebComics and stay behind the Chinese chapter count.

### Bilibili Manhua — `https://manga.bilibili.com`

The Chinese library behind the dead English app. Heaven Official's Blessing manhua lived here from 2019; after the 2024 shutdown the English path became a partial Lezhin license. The Chinese catalogue is bigger and faster.

Login and region walls are expected on all three. An adapter that cannot pass login is still documented; it is not silently scraped.

## Wave 3 — Japanese, Jump and the magazines around it

Do not treat "Jump" as one lag. Weekly Shonen Jump flagships (One Piece, and the current top of the magazine) are usually simulpub on Manga Plus and VIZ. The extension should detect that and get out of the way.

The lag is the rest of the building.

### Shonen Jump+ — `https://shonenjumpplus.com`

Shueisha's web magazine. Manga Plus simulpubs many new serializations and, since 2024, many one-shots, from Japanese into English. Still missing:

- series Shueisha marks Japan-only
- titles that lose English mid-run with no notice
- Jump Rookie and award excerpts
- free-window mismatches (free in Japan, locked or absent on Manga Plus)
- territory gaps (Manga Plus is not offered in Japan, China, or Korea; other languages are incomplete)

Adapter rule: if the same chapter is on Manga Plus in the user's language today, link there. Translate the Jump+ page only for the gap.

### Magazine Pocket — `https://pocket.shonenmagazine.com`

Kodansha. Weekly Shonen Magazine plus a large web-original catalogue. Free daily tickets. K MANGA carries a slice, and only in the US, Canada, Australia, New Zealand, and Singapore. Web originals and light-novel adaptations wait years or never leave Japanese.

### Tonari no Young Jump — `https://tonarinoyj.jp`

Shueisha free web magazine. One-Punch Man serializes here. Viz volume releases trail the web chapter. Choujin X is also here. Good Jump-adjacent target that is not covered by "just use Manga Plus."

### Also on the Japanese list, wave 4 overlap

- Sunday Webry (Shogakukan) — Weekly Shonen Sunday and originals, ticket model, thin English.
- Comic DAYS — Kodansha seinen (Morning, Afternoon, Evening). Almost no English simulpub.
- KadoComi / ComicWalker — `https://comic-walker.com`. Light-novel adaptations, the category that waits longest.
- Gangan Online and Manga UP! — Square Enix. English app exists and is incomplete.
- Pixiv Comic — indie and doujin. Official English is rare.

## Wave 4 — paid and niche

Lezhin KR, Ridibooks, Bomtoon, Sunday Webry, KadoComi, Pixiv Comic. Build these after the free-and-huge catalogues, because login and payment make the adapter cost higher per reader.

## Explicitly not targets

- Manga Plus, VIZ, K MANGA, WEBTOON English, Tappytoon, Lezhin English: these are the official English paths. Link to them when they are current.
- Tapas: closing with Kakao Webtoon. Not a raw source.
- Aggregator / scanlation sites: out of scope. Adapters name the publisher host only.

## Existing tools, so we do not pretend this is empty

Chapter trackers and AI readers already exist (publisher apps, Manga Plus, and third-party importers such as OpenToon and Madomi that accept a raw URL). The gap this repo is for: an extension on the publisher page itself, with per-site adapters, a local cache, and a noncommercial license. The MVP thread owns the Naver proof. This file owns the order of the next hosts.
