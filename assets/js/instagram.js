/* ===========================================================
   instagram.js — data/instagram.json 을 인스타 섹션 그리드로 렌더
   data/instagram.json 과 사진은 GitHub Actions 가 주기적으로 갱신합니다
   (.github/workflows/sync-instagram.yml). 파일이 없거나 비어 있으면
   HTML 에 들어 있는 자리표시 그림을 그대로 둡니다.
   =========================================================== */

(function () {
  "use strict";

  const { getJSON } = window.App;

  const BADGES = {
    VIDEO: "영상",
    CAROUSEL_ALBUM: "여러 장",
  };

  function isSafe(post) {
    return (
      /^https:\/\/(www\.)?instagram\.com\//.test(post.permalink || "") &&
      /^assets\/img\/instagram\/[A-Za-z0-9_.-]+$/.test(post.image || "")
    );
  }

  function buildPost(post) {
    const link = document.createElement("a");
    link.className = "insta__post";
    link.href = post.permalink;
    link.target = "_blank";
    link.rel = "noopener";

    const img = document.createElement("img");
    img.src = post.image;
    img.alt = post.alt || "인스타그램 게시물";
    img.loading = "lazy";
    img.decoding = "async";
    link.appendChild(img);

    const badge = BADGES[post.type];
    if (badge) {
      const tag = document.createElement("span");
      tag.className = "insta__badge";
      tag.textContent = badge;
      link.appendChild(tag);
    }

    return link;
  }

  async function renderInstagram() {
    const target = document.querySelector("[data-instagram]");
    if (!target) return;

    const feed = await getJSON("data/instagram.json");
    const posts = feed && Array.isArray(feed.posts) ? feed.posts.filter(isSafe) : [];
    if (!posts.length) return;

    const limit = Number(target.dataset.limit) || posts.length;
    target.innerHTML = "";
    posts.slice(0, limit).forEach(function (post) {
      target.appendChild(buildPost(post));
    });
  }

  renderInstagram();
})();
