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

  function show(index) {
    if (!shots.length) return;
    current = (index + shots.length) % shots.length;
    const shot = shots[current];
    lightboxImg.src = shot.src;
    lightboxImg.alt = shot.alt || shot.caption || "";
    lightboxCaption.textContent = shot.caption || "";
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

  function buildShot(item, index) {
    const button = el("button", "shot");
    button.type = "button";
    button.setAttribute("aria-label", (item.caption || "사진") + " 크게 보기");

    const img = document.createElement("img");
    // 그리드 칸에는 작게 자른 사진(thumb)이 있으면 그걸 씁니다.
    img.src = item.thumb || item.src;
    img.alt = item.alt || item.caption || "";
    img.loading = index < 3 ? "eager" : "lazy";
    img.decoding = "async";
    // 외부 사진이 깨지면 빈 칸 대신 그 사진만 뺍니다.
    img.addEventListener("error", function () {
      dropShot(item, button);
    });

    button.appendChild(img);

    if (item.caption) {
      button.appendChild(el("span", "shot__caption", "")).textContent = item.caption;
    }

    button.addEventListener("click", function () {
      open(shots.indexOf(item));
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

    galleryTarget = target;
    target.innerHTML = "";
    shots.forEach(function (item, index) {
      target.appendChild(buildShot(item, index));
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
