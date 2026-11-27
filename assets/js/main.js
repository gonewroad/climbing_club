/* ===========================================================
   main.js — 공용 헬퍼, 헤더/네비게이션, 동아리 정보·FAQ 렌더
   다른 스크립트보다 먼저 실행됩니다 (defer 순서 유지).
   =========================================================== */

(function () {
  "use strict";

  /* ---------- 공용 헬퍼 ---------- */

  /**
   * data/*.json 을 읽어옵니다.
   * 로컬에서 file:// 로 열면 fetch 가 막히므로 실패해도 페이지는 동작하도록
   * null 을 돌려주고, 호출한 쪽에서 안내 문구를 띄웁니다.
   */
  async function getJSON(path) {
    try {
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      return await res.json();
    } catch (err) {
      console.warn("[" + path + "] 불러오기 실패:", err.message);
      return null;
    }
  }

  /** 객체에서 "fee.amount" 같은 경로로 값을 꺼냅니다. */
  function pick(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  /** 태그·클래스·내용으로 요소를 만듭니다. */
  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  /** 데이터를 못 불러왔을 때 보여줄 안내 박스. */
  function showState(target, message) {
    if (!target) return;
    target.innerHTML = "";
    target.appendChild(el("p", "state", message));
  }

  window.App = {
    getJSON,
    pick,
    el,
    showState,
    // 여러 스크립트가 같은 동아리 정보를 쓰므로 한 번만 읽어 둡니다.
    club: getJSON("data/club.json"),
  };

  /* ---------- 헤더: 스크롤 상태 ---------- */

  const header = document.querySelector(".header");

  if (header) {
    const onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 모바일 네비게이션 ---------- */

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (toggle && nav) {
    const setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
    };

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    // 데스크톱 폭으로 넓어지면 열린 상태를 정리합니다.
    window.matchMedia("(min-width: 761px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- 현재 섹션 네비게이션 강조 ---------- */

  const sectionLinks = Array.from(
    document.querySelectorAll('.nav__link[href^="#"]')
  ).filter(function (link) {
    return link.hash.length > 1 && document.querySelector(link.hash);
  });

  if (sectionLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(
      sectionLinks.map(function (link) {
        return [link.hash.slice(1), link];
      })
    );

    const spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          sectionLinks.forEach(function (link) {
            link.classList.remove("is-active");
          });
          const active = byId.get(entry.target.id);
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    byId.forEach(function (_link, id) {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* ---------- 스크롤 등장 애니메이션 ---------- */

  const revealables = document.querySelectorAll(".reveal");

  if (revealables.length && "IntersectionObserver" in window) {
    const revealer = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealables.forEach(function (node) {
      revealer.observe(node);
    });
  } else {
    revealables.forEach(function (node) {
      node.classList.add("is-in");
    });
  }

  /* ---------- 동아리 정보 주입 ---------- */

  /**
   * HTML 안의 기본값을 data/club.json 값으로 덮어씁니다.
   *   <span data-club="area">서울 및 수도권, 인천</span>
   *   <a data-club-href="contact.instagramUrl" href="#">인스타그램</a>
   * JSON 을 못 읽어도 HTML 기본값이 그대로 보입니다.
   */
  /**
   * 글자를 넣습니다. 값 안의 {name} 은 동아리 이름으로 바꾸고 강조색(<em>)을 입힙니다.
   * 예: "클라이밍 연합동아리 {name} 입니다." → 클라이밍 연합동아리 <em>KRAKEN</em> 입니다.
   */
  function fillText(node, text, name) {
    if (text.indexOf("{name}") === -1) {
      node.textContent = text;
      return;
    }
    node.textContent = "";
    text.split("{name}").forEach(function (part, index) {
      if (index > 0) {
        const em = document.createElement("em");
        em.textContent = name || "";
        node.appendChild(em);
      }
      node.appendChild(document.createTextNode(part));
    });
  }

  async function applyClubInfo() {
    const club = await window.App.club;
    if (!club) return;

    document.querySelectorAll("[data-club]").forEach(function (node) {
      const value = pick(club, node.dataset.club);
      if (value != null && value !== "") fillText(node, String(value), club.name);
    });

    document.querySelectorAll("[data-club-href]").forEach(function (node) {
      const value = pick(club, node.dataset.clubHref);
      if (value) {
        node.href = value;
        return;
      }
      // 주소가 없으면 링크 자체를 감춥니다. 눌러도 아무 일이 없는 링크는
      // 방문자에게 고장난 것처럼 보입니다.
      (node.closest("li") || node).hidden = true;
    });

    // 값이 있을 때만 보이는 부분(data-club-if)과 값이 없을 때만 보이는 부분
    // (data-club-unless). 예: 정원이 비어 있으면 "정원 N명" 대신 "미정".
    document.querySelectorAll("[data-club-if]").forEach(function (node) {
      const value = pick(club, node.dataset.clubIf);
      node.hidden = value == null || value === "";
    });
    document.querySelectorAll("[data-club-unless]").forEach(function (node) {
      const value = pick(club, node.dataset.clubUnless);
      node.hidden = !(value == null || value === "");
    });

    const meetings = club.meetings || [];
    document.querySelectorAll("[data-club-meetings]").forEach(function (node) {
      if (!meetings.length) return;
      node.textContent = meetings
        .map(function (m) {
          // time 은 비워 둘 수 있습니다.
          return [m.day, m.time].filter(Boolean).join(" ");
        })
        .join(" · ");
    });

    if (club.recruit && club.recruit.open === false) {
      document.querySelectorAll("[data-recruit-open]").forEach(function (node) {
        node.textContent = "모집 마감";
        node.classList.add("badge--neutral");
      });
    }
  }

  /* ---------- FAQ ---------- */

  async function renderFAQ() {
    const target = document.querySelector("[data-faq]");
    if (!target) return;

    const items = await getJSON("data/faq.json");
    if (!items || !items.length) {
      showState(target, "FAQ를 불러오지 못했습니다. data/faq.json 을 확인해 주세요.");
      return;
    }

    target.innerHTML = "";

    items.forEach(function (item, index) {
      const details = el("details", "faq__item");
      if (index === 0) details.open = true;

      const summary = el("summary", "faq__q");
      summary.textContent = item.q;

      const answer = el("p", "faq__a");
      answer.textContent = item.a;

      details.append(summary, answer);
      target.appendChild(details);
    });
  }

  /* ---------- 올해 연도 ---------- */

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  /* ---------- 실행 ---------- */

  applyClubInfo();
  renderFAQ();
})();
