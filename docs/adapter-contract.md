# Adapter contract

The Naver MVP in the other thread should implement this shape when it lands. Later sources are new adapters, not forks of the Naver code.

```ts
export interface SourceAdapter {
  id: string;                 // "naver", "kakaopage", "kuaikan"
  wave: 0 | 1 | 2 | 3 | 4;
  hosts: string[];            // exact hosts the content script may run on
  label: string;
  officialEnglish?: {
    name: string;
    urlPattern: string;       // if this matches a current chapter, do not translate
  };

  match(url: URL): boolean;
  findTextNodes(root: ParentNode): TranslatableNode[];
  findBubbleImages(root: ParentNode): BubbleImage[];
  chapterKey(url: URL): string;   // cache scope, no image bytes stored off-device
}
```

Rules:

1. Host allow-list only. No generic "translate any comic site" mode in the default build.
2. Never request a chapter the page did not already load.
3. Cache translations by image hash and source text, in `chrome.storage` or IndexedDB, keyed by `chapterKey`.
4. If `officialEnglish` is current for this chapter, show a link and stay idle.
5. Login walls are the adapter's problem to detect, not to defeat.

Suggested commit from the MVP thread:

```
extension/manifest.json
extension/src/adapters/naver.ts
extension/src/translate.ts
extension/src/ocr.ts
```

Leave `docs/SOURCES.md` as the backlog. One adapter per pull request after Naver.
