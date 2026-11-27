/* ===========================================================
   gallery-from-album.mjs — 구글 포토 공유 앨범의 사진으로 data/gallery.json 을 만듭니다.
   배포 워크플로(.github/workflows/deploy-pages.yml)가 배포 직전에 실행하며,
   결과는 배포되는 사이트에만 들어가고 저장소에는 커밋하지 않습니다.

   - 구글 포토는 공유 앨범을 읽는 공식 방법이 없어, 앨범 페이지에 들어 있는
     사진 주소를 찾아 씁니다. 구글이 페이지 구조를 바꾸면 사진을 못 찾을 수 있습니다.
   - 사진을 못 찾으면 지금 사이트에 떠 있는 갤러리를 그대로 씁니다. 배포는 막지 않습니다.
   - 사진 파일은 받지 않고 주소만 씁니다. 사진은 방문자 브라우저가 구글 서버에서 불러옵니다.
   - 구글 서버는 주소 끝에 크기를 붙이면 그 크기로 줄여 줍니다. 그리드 칸용으로 여러 크기를
     적어 두면 브라우저가 화면에 맞는 것만 받습니다. 첫 장으로 WebP(더 가벼운 형식)가 되는지
     확인해서 되면 WebP 로 받습니다.

   환경 변수
     LIVE_GALLERY_URL   (선택) 지금 사이트의 data/gallery.json 주소. 실패 시 이걸 유지합니다.
     GALLERY_ALBUM_URL  (선택) 테스트용. 주면 club.json 대신 이 주소를 읽습니다.
   =========================================================== */

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CLUB_FILE = "data/club.json";
const GALLERY_FILE = "data/gallery.json";
const MAX_PHOTOS = 100;

// 그리드 칸(4:3 으로 자름) 가로 크기들. 브라우저가 칸 크기 × 화면 배율에 맞는 것을 고릅니다.
// 800 보다 크게는 두지 않습니다. 휴대폰(배율 3)에서도 800 이면 충분히 선명하고, 더 크면 느려집니다.
const TILE_WIDTHS = [400, 600, 800];
// 크게 보기 크기들 (가로·세로 이 안에 맞춤). 화면에 맞는 가장 작은 것을 씁니다.
const VIEW_SIZES = [1080, 1600];

// 일반 브라우저처럼 요청해야 사진 정보가 들어 있는 페이지를 받습니다.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

function warn(message) {
  console.log("::warning::" + message);
}

/* ---------- 앨범 주소 ---------- */

async function albumUrl() {
  const override = (process.env.GALLERY_ALBUM_URL || "").trim();
  if (override) return { url: override, checked: true };

  const club = JSON.parse(await readFile(CLUB_FILE, "utf8"));
  const url = String(club.galleryAlbumUrl || "").trim();
  const valid = /^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//.test(url);
  return { url, checked: valid };
}

/* ---------- 사진 찾기 ---------- */

/**
 * 앨범 페이지 안의 ["https://lh3.googleusercontent.com/pw/…", 가로, 세로 …] 묶음을 찾습니다.
 * /pw/ 가 아닌 주소(프로필 사진 등)는 제외하고, 같은 사진은 한 번만 씁니다.
 */
export function extractPhotos(html) {
  const pattern = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+)",(\d+),(\d+)/g;
  const seen = new Set();
  const photos = [];
  for (const [, url, width, height] of html.matchAll(pattern)) {
    if (seen.has(url)) continue;
    seen.add(url);
    photos.push({ url, width: Number(width), height: Number(height) });
  }
  return photos;
}

/**
 * webp 가 true 면 주소 끝에 -rw 를 붙여 WebP 로 받습니다.
 * src·thumb 는 늘 JPEG 입니다. 작은 사진이 실패하면 브라우저가 이것으로 다시 받습니다.
 */
export function toGallery(photos, { webp = false } = {}) {
  const format = webp ? "-rw" : "";
  return photos.slice(0, MAX_PHOTOS).map((photo, index) => ({
    // 크게 볼 때 기본: 가로·세로 1600px 안에 맞춤 (비율 유지)
    src: `${photo.url}=w1600-h1600`,
    // 그리드 칸 기본: 4:3 으로 잘라서
    thumb: `${photo.url}=w800-h600-c`,
    // 그리드 칸: 화면에 맞는 크기를 브라우저가 고름 (<img srcset>)
    thumbSrcset: TILE_WIDTHS.map(
      (width) => `${photo.url}=w${width}-h${(width * 3) / 4}-c${format} ${width}w`
    ).join(", "),
    // 크게 보기: 화면에 맞는 크기를 gallery.js 가 고름
    views: VIEW_SIZES.map((size) => ({ size, url: `${photo.url}=w${size}-h${size}${format}` })),
    alt: `KRAKEN 활동 사진 ${index + 1}`,
    caption: "",
  }));
}

/* ---------- WebP 확인 · 크기 비교 ---------- */

async function measure(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    const body = await res.arrayBuffer();
    return { ok: res.ok, type: res.headers.get("content-type") || "", bytes: body.byteLength };
  } catch (err) {
    return { ok: false, type: "", bytes: 0 };
  }
}

function kb(result) {
  if (!result.ok) return "실패";
  const format = /webp/i.test(result.type) ? "WebP" : /jpe?g/i.test(result.type) ? "JPEG" : result.type;
  return `${Math.round(result.bytes / 1024)}KB ${format}`;
}

/** 첫 장으로 WebP 가 되는지 보고, 예전 크기와 새 크기를 기록에 남깁니다. */
async function checkWebp(photo) {
  const [oldTile, tile400, tile800, oldView, view1080] = await Promise.all([
    measure(`${photo.url}=w800-h600-c`),
    measure(`${photo.url}=w400-h300-c-rw`),
    measure(`${photo.url}=w800-h600-c-rw`),
    measure(`${photo.url}=w1600-h1600`),
    measure(`${photo.url}=w1080-h1080-rw`),
  ]);
  console.log(
    `첫 장 크기 — 그리드 칸: 예전 ${kb(oldTile)} → 400px ${kb(tile400)} / 800px ${kb(tile800)}, ` +
      `크게 보기: 예전 ${kb(oldView)} → 1080px ${kb(view1080)}`
  );
  const webp = [tile400, tile800, view1080].every((r) => r.ok && /webp/i.test(r.type));
  if (!webp) warn("구글 사진 서버가 WebP 를 주지 않아 JPEG 로 받습니다. 크기 줄이기는 그대로 적용됩니다.");
  return webp;
}

/* ---------- 실패하면 지금 갤러리 유지 ---------- */

async function keepCurrent(reason) {
  warn(`앨범에서 사진을 가져오지 못했습니다 (${reason}). 지금 갤러리를 그대로 씁니다.`);

  const live = (process.env.LIVE_GALLERY_URL || "").trim();
  if (live) {
    try {
      const res = await fetch(live);
      const list = res.ok ? await res.json() : null;
      if (Array.isArray(list) && list.length) {
        await writeFile(GALLERY_FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
        console.log(`사이트에 떠 있던 갤러리 ${list.length}장을 유지합니다.`);
        return;
      }
    } catch (err) {
      // 사이트 갤러리도 못 읽으면 저장소 기본 갤러리를 씁니다.
    }
  }
  console.log("저장소의 기본 갤러리를 씁니다.");
}

/** 사진을 못 찾았을 때 원인을 짐작할 수 있도록 페이지 생김새만 남깁니다. */
function describePage(html) {
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "(제목 없음)";
  const lh3 = (html.match(/lh3\.googleusercontent\.com/g) || []).length;
  const pw = (html.match(/lh3\.googleusercontent\.com\/pw\//g) || []).length;
  console.log(`  페이지 제목: ${title.trim()} / 길이 ${html.length} / lh3 주소 ${lh3}개 (그중 /pw/ ${pw}개)`);
}

/* ---------- 실행 ---------- */

async function main() {
  const { url, checked } = await albumUrl();
  if (!url) {
    console.log("galleryAlbumUrl 이 비어 있어 저장소의 기본 갤러리를 씁니다.");
    return;
  }
  if (!checked) return keepCurrent("구글 포토 공유 앨범 주소가 아님");

  let res;
  try {
    res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  } catch (err) {
    return keepCurrent("앨범에 연결하지 못함: " + err.message);
  }
  const html = await res.text();
  if (!res.ok) return keepCurrent(`앨범 응답 ${res.status}`);

  const photos = extractPhotos(html);
  // 크기 정보 없이 주소만 있는 것까지 센 수. 이보다 찾은 사진이 크게 적으면 구조가 바뀐 것.
  const mentioned = new Set(html.match(/https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+/g) || []).size;
  console.log(
    `앨범 페이지(${new URL(res.url).host})에서 사진 ${photos.length}장을 찾았습니다 ` +
      `(페이지 안 사진 주소 ${mentioned}개).`
  );
  if (mentioned > photos.length + 1) {
    warn(`페이지에 사진 주소가 ${mentioned}개인데 ${photos.length}장만 찾았습니다. 앨범 구조가 바뀌었을 수 있습니다.`);
  }
  if (!photos.length) {
    describePage(html);
    return keepCurrent("사진 주소를 찾지 못함");
  }

  const webp = await checkWebp(photos[0]);
  const gallery = toGallery(photos, { webp });
  await writeFile(GALLERY_FILE, JSON.stringify(gallery, null, 2) + "\n", "utf8");
  console.log(`갤러리를 앨범 사진 ${gallery.length}장으로 채웠습니다${webp ? " (WebP)" : ""}.`);
}

// 테스트에서 import 할 때는 실행하지 않습니다.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => keepCurrent(err.message));
}
