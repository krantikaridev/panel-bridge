// Single source of site/chapter assumptions for the M1 demo.
// A new source (Kakao, Chinese manhua, …) is a new entry here plus a matching
// SourceAdapter implementation later; the detector stays unchanged.
// See docs/adapter-contract.md for the longer-term shape.

export const NAVER = {
  id: "naver",
  hosts: ["comic.naver.com", "image-comic.pstatic.net"],
  // URL template; {titleId} and {no} are filled by the caller.
  chapterUrl: (titleId, no) =>
    `https://comic.naver.com/webtoon/detail?titleId=${titleId}&no=${no}`,
  // Episode-cut image matcher. Age-rating cards and promos share the host,
  // so we require the webtoon path + _IMAG01_ and a tall cut in the caller.
  cutPattern: (titleId, no) =>
    new RegExp(`/webtoon/${titleId}/${no}/.*_IMAG01_\\d+\\.(jpe?g|png)$`),
  // Extra gate / captcha strings the capture layer checks before scrolling.
  gateSignals: /captcha|비정상적인 접근|로그인 후 이용|이용권|결제가 필요|잠겨|locked/i,
  defaultTitleId: process.env.M1_TITLE_ID || "817032", // 열렙전사 EARTH GAME
  defaultNo: process.env.M1_NO || "1",
};

// Default adapter used by the current demo. Swap this to add another source.
export const CURRENT = NAVER;
