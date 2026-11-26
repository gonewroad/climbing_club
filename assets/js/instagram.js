/* ===========================================================
   instagram.js — 인스타 섹션에 최근 게시물 표시
   방문자 브라우저가 Feedframer 에서 바로 불러옵니다. 사진을 저장소에
   저장하지 않으므로, 인스타에서 지운 게시물은 Feedframer 가 갱신되는 대로
   사이트에서도 사라집니다.

   - 키는 data/club.json 의 contact.instagramFeedKey 에 둡니다. Feedframer 키는
     이 계정의 공개 게시물을 읽는 것만 가능해서 페이지에 보여도 괜찮습니다.
   - 인스타 섹션 근처까지 스크롤했을 때만 불러옵니다 (원본 사진이 큼).
   - 키가 없거나 불러오기에 실패하면 HTML 의 자리표시 그림을 그대로 둡니다.
   =========================================================== */

(function () {
  "use strict";

  const FEED_ENDPOINT = "https://feedframer.com/api/v1/me";

  const BADGES = {
    VIDEO: "영상",
    CAROUSEL_ALBUM: "여러 장",
  };

  /* ---------- 게시물 정리 ---------- */

  function isInstagramLink(url) {
    return /^https:\/\/(www\.)?instagram\.com\//.test(url || "");
  }

  function isImageUrl(url) {
    if (!/^https:\/\//.test(url || "")) return false;
    try {
      // 여러 장 게시물의 첫 장이 영상이면 mediaUrl 이 영상 파일입니다.
      return !/\.(mp4|mov|webm)$/i.test(new URL(url).pathname);
    } catch (err) {
      return false;
    }
  }

  function imageOf(post) {
    const type = String(post.mediaType || "").toUpperCase();
    const candidates = type === "VIDEO" ? [post.thumbnailUrl] : [post.mediaUrl, post.thumbnailUrl];
    return candidates.find(isImageUrl) || "";
  }

  function altOf(post) {
    const text = String(post.altText || post.caption || "").replace(/\s+/g, " ").trim();
    if (!text) return "인스타그램 게시물";
    return text.length > 100 ? text.slice(0, 99) + "…" : text;
  }

  /* ---------- 불러오기 ---------- */

  async function fetchPosts(key) {
    const url = new URL(FEED_ENDPOINT);
    url.searchParams.set("api_key", key);
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const feed = await res.json();
      return Array.isArray(feed.posts) ? feed.posts : [];
    } catch (err) {
      console.warn("[인스타 피드] 불러오기 실패:", err.message);
      return [];
    }
  }

  /** 사진을 불러와 보고 성공한 것만 돌려줍니다. 실패하면 null. */
  function loadImage(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      // 인스타 쪽에 어느 페이지에서 왔는지 보내지 않습니다.
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = src;
    });
  }

  /**
   * 앞에서부터 limit 개를 불러오고, 실패한 칸만큼 다음 게시물로 채웁니다.
   * 순서(최신순)는 유지합니다.
   */
  async function loadTiles(posts, limit) {
    const tiles = [];
    let index = 0;
    while (tiles.length < limit && index < posts.length) {
      const batch = posts.slice(index, index + (limit - tiles.length));
      index += batch.length;
      const results = await Promise.all(
        batch.map(function (post) {
          return loadImage(imageOf(post)).then(function (img) {
            return img ? { post: post, img: img } : null;
          });
        })
      );
      results.forEach(function (tile) {
        if (tile) tiles.push(tile);
      });
    }
    return tiles;
  }

  /* ---------- 그리기 ---------- */

  function buildTile(post, img) {
    const link = document.createElement("a");
    link.className = "insta__post";
    link.href = post.permalink;
    link.target = "_blank";
    link.rel = "noopener";

    img.alt = altOf(post);
    link.appendChild(img);

    const badge = BADGES[String(post.mediaType || "").toUpperCase()];
    if (badge) {
      const tag = document.createElement("span");
      tag.className = "insta__badge";
      tag.textContent = badge;
      link.appendChild(tag);
    }
    return link;
  }

  async function render(target, key) {
    const posts = (await fetchPosts(key)).filter(function (post) {
      return isInstagramLink(post.permalink) && imageOf(post);
    });
    const limit = Number(target.dataset.limit) || 4;
    const tiles = await loadTiles(posts, limit);
    if (!tiles.length) return; // 하나도 못 불러오면 자리표시 그림 유지

    target.innerHTML = "";
    tiles.forEach(function (tile) {
      target.appendChild(buildTile(tile.post, tile.img));
    });
  }

  /** 화면 근처에 오면 한 번만 실행합니다. */
  function whenNear(node, callback) {
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        callback();
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(node);
  }

  /* ---------- 실행 ---------- */

  window.App.club.then(function (club) {
    const target = document.querySelector("[data-instagram]");
    const key = String((club && club.contact && club.contact.instagramFeedKey) || "").trim();
    if (!target || !key) return;

    whenNear(target, function () {
      render(target, key);
    });
  });
})();
