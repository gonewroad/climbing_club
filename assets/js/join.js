/* ===========================================================
   join.js — 가입 페이지 신청서 영역
   항목 안내 · 새 탭으로 열기 · 페이지 안에서 바로 작성 · QR · 링크 공유
   main.js 와 vendor/qrcode.js 다음에 실행됩니다 (defer 순서 유지).
   =========================================================== */

(function () {
  "use strict";

  const slot = document.querySelector("[data-form-slot]");
  if (!slot || !window.App) return;

  function find(selector) {
    return slot.querySelector(selector);
  }

  const ui = {
    title: find("[data-form-title]"),
    desc: find("[data-form-desc]"),
    fields: find("[data-form-fields]"),
    fieldList: find("[data-form-field-list]"),
    minutes: find("[data-form-minutes]"),
    actions: find("[data-form-actions]"),
    link: find("[data-form-link]"),
    embedToggle: find("[data-form-embed-toggle]"),
    share: find("[data-form-share]"),
    status: find("[data-form-status]"),
    qr: find("[data-form-qr]"),
    qrCode: find("[data-form-qr-code]"),
    qrSave: find("[data-form-qr-save]"),
    embed: find("[data-form-embed]"),
    frame: find("[data-form-embed-frame]"),
  };

  /* ---------- 값 정리 ---------- */

  function fieldsOf(recruit) {
    if (!Array.isArray(recruit.formFields)) return [];
    return recruit.formFields
      .map(function (name) {
        return String(name).trim();
      })
      .filter(Boolean);
  }

  function minutesOf(recruit) {
    return String(recruit.formMinutes || "").trim();
  }

  /**
   * 구글 폼을 페이지 안에 넣으려면 docs.google.com/forms/.../viewform 주소에
   * embedded=true 를 붙여야 합니다. forms.gle 단축 주소는 실제 주소를 알 수
   * 없어서 쓸 수 없으므로 formEmbedUrl 에 전체 주소를 받습니다.
   * formUrl 자체가 전체 주소라면 그것을 씁니다. 둘 다 아니면 빈 문자열.
   */
  function embedUrlOf(recruit) {
    const candidates = [recruit.formEmbedUrl, recruit.formUrl];
    for (let i = 0; i < candidates.length; i += 1) {
      if (!candidates[i]) continue;

      let url;
      try {
        url = new URL(candidates[i]);
      } catch (err) {
        continue;
      }

      const isGoogleForm =
        url.hostname === "docs.google.com" &&
        /^\/forms\/.+\/viewform$/.test(url.pathname);
      if (!isGoogleForm) continue;

      url.searchParams.set("embedded", "true");
      return url.toString();
    }
    return "";
  }

  /* ---------- 가입 절차 1단계 문구 ---------- */

  function applyInlineFields(recruit) {
    const fields = fieldsOf(recruit);
    const minutes = minutesOf(recruit);

    document.querySelectorAll("[data-form-fields-inline]").forEach(function (node) {
      if (fields.length) node.textContent = fields.join(", ");
    });
    document.querySelectorAll("[data-form-minutes-inline]").forEach(function (node) {
      if (minutes) node.textContent = minutes;
    });
  }

  /* ---------- 항목 안내 ---------- */

  function renderFields(recruit) {
    const fields = fieldsOf(recruit);
    if (!fields.length) return false;

    ui.fieldList.innerHTML = "";
    fields.forEach(function (name) {
      const item = document.createElement("li");
      item.textContent = name;
      ui.fieldList.appendChild(item);
    });

    const minutes = minutesOf(recruit);
    ui.minutes.textContent = minutes ? "약 " + minutes + "분" : "";
    ui.fields.hidden = false;
    return true;
  }

  /* ---------- 페이지 안에서 바로 작성 ---------- */

  function setupEmbed(url) {
    if (!url) return;

    ui.embedToggle.hidden = false;
    ui.embedToggle.addEventListener("click", function () {
      const open = ui.embedToggle.getAttribute("aria-expanded") !== "true";
      ui.embedToggle.setAttribute("aria-expanded", String(open));
      ui.embedToggle.textContent = open ? "접기" : "여기서 바로 작성";
      ui.embed.hidden = !open;

      if (!open) return;
      // 처음 펼칠 때 한 번만 불러옵니다. 가입 페이지를 열 때마다 구글 폼을
      // 미리 불러오지 않기 위해서입니다.
      if (!ui.frame.getAttribute("src")) ui.frame.src = url;
      ui.embed.scrollIntoView({ block: "start" });
    });
  }

  /* ---------- QR ---------- */

  const QR_MARGIN = 4; // QR 규격이 요구하는 바깥 여백(모듈 4칸)

  function makeQr(text) {
    if (typeof window.qrcode !== "function") return null;
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr;
    } catch (err) {
      console.warn("QR 생성 실패:", err.message);
      return null;
    }
  }

  function qrSvg(qr) {
    const count = qr.getModuleCount();
    const size = count + QR_MARGIN * 2;
    let path = "";
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          path += "M" + (col + QR_MARGIN) + " " + (row + QR_MARGIN) + "h1v1h-1z";
        }
      }
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + " " + size + '"' +
      ' shape-rendering="crispEdges" role="img" aria-label="신청서로 연결되는 QR 코드">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/>' +
      '<path d="' + path + '" fill="#000"/></svg>'
    );
  }

  /** 포스터에 쓸 수 있도록 1024px 안팎의 PNG 로 내려받습니다. */
  function saveQrPng(qr, fileName) {
    const count = qr.getModuleCount();
    const cells = count + QR_MARGIN * 2;
    const scale = Math.ceil(1024 / cells);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = cells * scale;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          ctx.fillRect((col + QR_MARGIN) * scale, (row + QR_MARGIN) * scale, scale, scale);
        }
      }
    }

    canvas.toBlob(function (blob) {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
      }, 1000);
    }, "image/png");
  }

  function renderQr(club) {
    const qr = makeQr(club.recruit.formUrl);
    if (!qr) return;

    ui.qrCode.innerHTML = qrSvg(qr);
    const name = String(club.name || "동아리").replace(/[\\/:*?"<>|\s]+/g, "-");
    ui.qrSave.addEventListener("click", function () {
      saveQrPng(qr, name + "-신청서-QR.png");
    });
    ui.qr.hidden = false;
  }

  /* ---------- 링크 공유 ---------- */

  let statusTimer = null;

  function flash(message) {
    ui.status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      ui.status.textContent = "";
    }, 4000);
  }

  /**
   * 신청서 주소가 아니라 이 가입 페이지 주소를 공유합니다. 받는 사람이
   * 모집 안내와 FAQ 를 함께 볼 수 있고, 다음 학기에 신청서가 바뀌어도
   * 공유한 링크가 계속 맞는 곳을 가리킵니다.
   */
  async function share(club) {
    const url = location.origin + location.pathname;
    const text = (club.name ? club.name + " " : "") + "클라이밍 신입 모집";

    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text: text, url: url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // 공유 창을 닫음
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      flash("링크를 복사했습니다. 카톡이나 문자에 붙여넣으세요.");
    } catch (err) {
      window.prompt("아래 링크를 복사해 주세요.", url);
    }
  }

  /* ---------- 상태별 화면 ---------- */

  function showClosed() {
    ui.title.textContent = "이번 모집은 마감되었습니다";
    ui.desc.textContent =
      "다음 모집 일정은 인스타그램에 가장 먼저 올라옵니다. 팔로우해 두시면 놓치지 않습니다.";
  }

  function showOpen(club) {
    const recruit = club.recruit;
    const embedUrl = embedUrlOf(recruit);
    const minutes = minutesOf(recruit);

    slot.classList.add("is-open");
    ui.title.textContent = "신청서 작성하기";

    const hasFields = renderFields(recruit);
    ui.desc.textContent =
      (embedUrl
        ? "새 탭에서 열거나 이 페이지에서 바로 작성할 수 있습니다."
        : "아래 버튼을 누르면 신청서가 새 탭에서 열립니다.") +
      (!hasFields && minutes ? " " + minutes + "분 정도면 끝납니다." : "");

    ui.link.href = recruit.formUrl;
    ui.actions.hidden = false;
    ui.share.addEventListener("click", function () {
      share(club);
    });

    setupEmbed(embedUrl);
    renderQr(club);
  }

  /* ---------- 실행 ---------- */

  window.App.club.then(function (club) {
    if (!club || !club.recruit) return;

    applyInlineFields(club.recruit);

    if (club.recruit.open === false) {
      showClosed();
      return;
    }
    if (club.recruit.formUrl) showOpen(club);
    // 둘 다 아니면 HTML 에 적힌 준비 중 안내를 그대로 둡니다.
  });
})();
