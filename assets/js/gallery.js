/* ===========================================================
   gallery.js — data/gallery.json 을 그리드로 렌더 + 라이트박스
   =========================================================== */

(function () {
  "use strict";

  const { getJSON, el, showState } = window.App;

  let shots = [];
  let galleryTarget = null;
  let current = 0;
  let lastFocused = null;
  let lightbox = null;
  let lightboxImg = null;
  let lightboxCaption = null;

  // 그리드 칸이 화면에서 차지하는 가로 크기. 좁은 화면은 한 줄에 한 칸, 그 외에는 칸이 360px 이하.
  // 브라우저는 이 값 × 화면 배율에 맞는 사진을 thumbSrcset 에서 고릅니다.
  const TILE_SIZES = "(max-width: 600px) 100vw, 360px";

  /* ---------- 라이트박스 ---------- */

  function buildLightbox() {
    const box = el("div", "lightbox");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "사진 크게 보기");

    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="닫기">✕</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="이전 사진">‹</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="다음 사진">›</button>' +
      '<figure class="lightbox__figure">' +
      '<img class="lightbox__img" alt="">' +
      '<figcaption class="lightbox__caption"></figcaption>' +
      "</figure>";

    document.body.appendChild(box);

    lightboxImg = box.querySelector(".lightbox__img");
    lightboxCaption = box.querySelector(".lightbox__caption");

    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__nav--prev").addEventListener("click", function () {
      step(-1);
    });
    box.querySelector(".lightbox__nav--next").addEventListener("click", function () {
      step(1);
    });

    // 사진·버튼 바깥(배경)을 누르면 닫습니다.
    box.addEventListener("click", function (event) {
      if (event.target === box) close();
    });

    return box;
  }

  /**
   * 크게 보기 사진 주소. views(여러 크기)가 있으면 화면을 채우는 가장 작은 것을 고릅니다.
   * 라이트박스 사진은 가로 최대 1080px, 세로 화면의 78% 까지 커집니다.
   */
  function viewUrl(item) {
    const views = item.views || [];
    if (!views.length) return item.src;
    const ratio = window.devicePixelRatio || 1;
    const needed = Math.max(Math.min(window.innerWidth, 1080), window.innerHeight * 0.78) * ratio;
    const fit = views.find(function (view) {
      return view.size >= needed;
    });
    return (fit || views[views.length - 1]).url;
  }

  /** 다음에 볼 것 같은 사진을 미리 받아 둡니다. */
  const warmed = new Set();
  function warm(item) {
    if (!item) return;
    const url = viewUrl(item);
    if (warmed.has(url)) return;
    warmed.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }

  function show(index) {
    if (!shots.length) return;
    current = (index + shots.length) % shots.length;
    const shot = shots[current];

    // 새 사진이 올 때까지 이전 사진을 흐리게 둡니다.
    lightboxImg.classList.add("is-loading");
    lightboxImg.onload = function () {
      lightboxImg.classList.remove("is-loading");
    };
    // 작은 사진(WebP 등)이 안 되면 기본 사진으로 한 번 더 시도합니다.
    let retried = false;
    lightboxImg.onerror = function () {
      if (retried || !shot.src) return;
      retried = true;
      lightboxImg.src = shot.src;
    };
    lightboxImg.src = viewUrl(shot);
    if (lightboxImg.complete && lightboxImg.naturalWidth) lightboxImg.classList.remove("is-loading");

    lightboxImg.alt = shot.alt || shot.caption || "";
    lightboxCaption.textContent = shot.caption || "";

    if (shots.length > 1) {
      warm(shots[(current + 1) % shots.length]);
      warm(shots[(current - 1 + shots.length) % shots.length]);
    }
  }

  function step(delta) {
    show(current + delta);
  }

  function open(index) {
    if (!lightbox) lightbox = buildLightbox();
    lastFocused = document.activeElement;
    show(index);
    lightbox.classList.add("is-open");
    document.body.classList.add("is-locked");
    lightbox.querySelector(".lightbox__close").focus();
  }

  function close() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  document.addEventListener("keydown", function (event) {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });

  /* ---------- 그리드 ---------- */

  function buildShot(item, eager) {
    const button = el("button", "shot is-loading");
    button.type = "button";
    button.setAttribute("aria-label", (item.caption || "사진") + " 크게 보기");

    const img = document.createElement("img");
    img.alt = item.alt || item.caption || "";
    // 화면 밖 사진은 스크롤해서 가까워질 때 받습니다.
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";

    img.addEventListener("load", function () {
      button.classList.remove("is-loading");
    });
    img.addEventListener("error", function () {
      // 작은 사진(WebP 등)이 안 되면 기본 사진으로 한 번 더 시도합니다.
      if (img.hasAttribute("srcset")) {
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.src = item.thumb || item.src;
        return;
      }
      // 그래도 깨지면 빈 칸 대신 그 사진만 뺍니다.
      dropShot(item, button);
    });

    // 여러 크기가 있으면 브라우저가 칸에 맞는 것만 받습니다. 없으면 thumb, 그것도 없으면 src.
    if (item.thumbSrcset) {
      img.sizes = TILE_SIZES;
      img.srcset = item.thumbSrcset;
    }
    img.src = item.thumb || item.src;

    button.appendChild(img);

    if (item.caption) {
      button.appendChild(el("span", "shot__caption", "")).textContent = item.caption;
    }

    button.addEventListener("click", function () {
      open(shots.indexOf(item));
    });
    // 마우스를 올리면 크게 볼 사진을 미리 받기 시작합니다.
    button.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") warm(item);
    });

    return button;
  }

  async function renderGallery() {
    const target = document.querySelector("[data-gallery]");
    if (!target) return;

    const items = await getJSON("data/gallery.json");
    if (!items || !items.length) {
      showState(target, "사진을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
      return;
    }

    const limit = Number(target.dataset.limit) || items.length;
    shots = items.slice(0, limit);

    // 갤러리 페이지는 첫 줄을 바로 받고, 메인 페이지는 갤러리가 아래쪽이라 모두 나중에 받습니다.
    const eagerCount = target.classList.contains("gallery--page") ? 3 : 0;

    galleryTarget = target;
    target.innerHTML = "";
    shots.forEach(function (item, index) {
      target.appendChild(buildShot(item, index < eagerCount));
    });
  }

  /** 깨진 사진을 그리드와 라이트박스 목록에서 뺍니다. */
  function dropShot(item, button) {
    const index = shots.indexOf(item);
    if (index !== -1) shots.splice(index, 1);
    button.remove();
    if (!shots.length && galleryTarget) {
      showState(galleryTarget, "사진을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
    }
  }

  renderGallery();
})();
