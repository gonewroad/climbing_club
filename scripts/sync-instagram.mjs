/* ===========================================================
   sync-instagram.mjs — Feedframer 에서 최근 인스타 게시물을 받아
   data/instagram.json 과 assets/img/instagram/ 에 저장합니다.
   .github/workflows/sync-instagram.yml 이 실행합니다.

   - 인스타 이미지 주소는 하루 이틀이면 만료되므로 사진을 저장소에 받아 둡니다.
   - 받아오기에 실패하면 기존 파일을 건드리지 않고 오류로 끝냅니다.
     사이트에는 마지막으로 받은 게시물이 그대로 남습니다.
   - 게시물이 바뀌지 않았으면 파일을 다시 쓰지 않습니다. 그래야 커밋이
     필요할 때만 생깁니다.

   환경 변수
     FEEDFRAMER_API_KEY   (필수) Feedframer API 토큰. 저장소 Secret 에 둡니다.
     FEEDFRAMER_ENDPOINT  (선택) 테스트용으로 주소를 바꿀 때만 씁니다.
     INSTAGRAM_LIMIT      (선택) 저장할 게시물 수. 기본 6.
   =========================================================== */

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const API_KEY = (process.env.FEEDFRAMER_API_KEY || "").trim();
const ENDPOINT = process.env.FEEDFRAMER_ENDPOINT || "https://feedframer.com/api/v1/me";
const LIMIT = Number(process.env.INSTAGRAM_LIMIT) || 6;

const DATA_FILE = "data/instagram.json";
const IMAGE_DIR = "assets/img/instagram";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function fail(message) {
  // GitHub Actions 화면에 빨간 오류로 표시됩니다.
  console.error("::error::" + message);
  process.exit(1);
}

/* ---------- 받아오기 ---------- */

async function fetchFeed() {
  const url = new URL(ENDPOINT);
  url.searchParams.set("api_key", API_KEY);

  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    fail("Feedframer 에 연결하지 못했습니다: " + err.message);
  }

  const body = await res.text();
  if (!res.ok) fail(`Feedframer 응답 오류 ${res.status}: ${body.slice(0, 200)}`);

  try {
    return JSON.parse(body);
  } catch (err) {
    fail("Feedframer 응답이 JSON 이 아닙니다: " + body.slice(0, 200));
  }
}

/**
 * 응답의 생김새만 로그에 남깁니다(값은 남기지 않음).
 * 문서에 전체 응답 예시가 없어 첫 실행에서 실제 구조를 확인하려는 용도입니다.
 */
function shapeOf(value) {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value && typeof value === "object") {
    return "{ " + Object.keys(value).map((k) => `${k}: ${typeName(value[k])}`).join(", ") + " }";
  }
  return typeName(value);
}

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}

/** 게시물 배열을 찾아 돌려줍니다. 어디에도 없으면 null. */
function postsOf(feed) {
  const candidates = [feed?.posts, feed?.data?.posts, feed?.data, feed?.media?.data, feed?.media];
  return candidates.find(Array.isArray) || null;
}

function usernameOf(feed) {
  return (
    feed?.username ||
    feed?.data?.username ||
    feed?.account?.username ||
    feed?.profile?.username ||
    ""
  );
}

/* ---------- 게시물 하나 정리 ---------- */

function typeOf(post) {
  return String(post.mediaType || post.media_type || "").toUpperCase();
}

/** 사이트에 쓸 이미지 주소 후보를 좋은 순서대로 돌려줍니다. */
function imageCandidates(post) {
  const list = [];
  const sizes = post.sizes && typeof post.sizes === "object" ? post.sizes : null;
  if (sizes) {
    // Premium 플랜에만 있는 리사이즈 이미지. 인스타 섹션 칸이 작아 중간 크기면 충분합니다.
    for (const key of ["768", "960", "1200", "320"]) {
      const size = sizes[key];
      list.push(typeof size === "string" ? size : size?.url);
    }
  }
  if (typeOf(post) === "VIDEO") list.push(post.thumbnailUrl, post.thumbnail_url);
  list.push(post.mediaUrl, post.media_url, post.thumbnailUrl, post.thumbnail_url);
  return [...new Set(list.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)))];
}

function safeId(post, index) {
  const raw = String(post.id || post.igId || post.shortcode || post.permalink || index);
  return raw.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || String(index);
}

function altOf(post) {
  const caption = String(post.caption || "").replace(/\s+/g, " ").trim();
  if (!caption) return "인스타그램 게시물";
  return caption.length > 100 ? caption.slice(0, 99) + "…" : caption;
}

function permalinkOf(post) {
  const link = String(post.permalink || "");
  return /^https:\/\/(www\.)?instagram\.com\//.test(link) ? link : "";
}

/* ---------- 이미지 저장 ---------- */

async function existingImage(id) {
  const files = await readdir(IMAGE_DIR).catch(() => []);
  return files.find((name) => path.parse(name).name === id) || "";
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPES[type]) throw new Error("이미지가 아닌 응답: " + (type || "알 수 없음"));
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`너무 큰 파일: ${bytes.length} bytes`);
  return { bytes, ext: IMAGE_TYPES[type] };
}

/**
 * 게시물 사진은 올린 뒤에 바뀌지 않으므로, 이미 받아 둔 사진이 있으면
 * 다시 받지 않습니다. 같은 사진을 매번 받아 커밋이 생기는 일을 막습니다.
 */
async function saveImage(post, id) {
  const kept = await existingImage(id);
  if (kept) return kept;

  const errors = [];
  for (const url of imageCandidates(post)) {
    try {
      const { bytes, ext } = await download(url);
      const name = id + ext;
      await writeFile(path.join(IMAGE_DIR, name), bytes);
      return name;
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(" / ") || "이미지 주소가 없습니다");
}

/* ---------- 실행 ---------- */

async function readExisting() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (err) {
    return null;
  }
}

/** 시각(updatedAt)을 뺀 내용만 비교합니다. 시각만 바뀐 커밋이 생기지 않게 합니다. */
function sameContent(a, b) {
  if (!a || !b) return false;
  const strip = (feed) => JSON.stringify({ username: feed.username, posts: feed.posts });
  return strip(a) === strip(b);
}

async function main() {
  if (!API_KEY) {
    fail("FEEDFRAMER_API_KEY 가 비어 있습니다. 저장소 Settings → Secrets and variables → Actions 에 등록해 주세요.");
  }

  const feed = await fetchFeed();
  console.log("응답 구조:", shapeOf(feed));

  const posts = postsOf(feed);
  if (!posts) fail("응답에서 게시물 목록을 찾지 못했습니다. 위 '응답 구조' 를 확인해 주세요.");
  if (!posts.length) fail("게시물이 0개로 왔습니다. 기존 파일은 그대로 둡니다.");
  console.log("게시물 구조:", shapeOf(posts[0]));

  await mkdir(IMAGE_DIR, { recursive: true });

  const saved = [];
  for (const [index, post] of posts.entries()) {
    if (saved.length >= LIMIT) break;

    const permalink = permalinkOf(post);
    if (!permalink) {
      console.warn(`::warning::${index + 1}번째 게시물에 인스타 링크가 없어 건너뜁니다.`);
      continue;
    }

    const id = safeId(post, index);
    try {
      const file = await saveImage(post, id);
      saved.push({
        id,
        permalink,
        image: `${IMAGE_DIR}/${file}`,
        alt: altOf(post),
        type: typeOf(post) || "IMAGE",
        timestamp: post.timestamp || "",
      });
    } catch (err) {
      console.warn(`::warning::${index + 1}번째 게시물 사진을 받지 못해 건너뜁니다: ${err.message}`);
    }
  }

  if (!saved.length) fail("사진을 하나도 받지 못했습니다. 기존 파일은 그대로 둡니다.");

  // 목록에서 빠진 게시물의 사진은 지웁니다.
  const keep = new Set(saved.map((post) => path.basename(post.image)));
  for (const name of await readdir(IMAGE_DIR)) {
    if (!keep.has(name)) await rm(path.join(IMAGE_DIR, name));
  }

  const next = { username: usernameOf(feed), posts: saved };
  const prev = await readExisting();
  if (sameContent(prev, next)) {
    console.log(`바뀐 게시물이 없습니다 (${saved.length}개).`);
    return;
  }

  next.updatedAt = new Date().toISOString();
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`게시물 ${saved.length}개를 저장했습니다.`);
}

main().catch((err) => fail(err.stack || err.message));
