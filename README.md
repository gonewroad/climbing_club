# climbing_club

클라이밍 연합동아리 웹사이트. 빌드 과정이 없는 정적 사이트로, GitHub Pages에
그대로 올려서 운영합니다.

사이트 주소: https://gonewroad.github.io/climbing_club/

## 구조

```
.
├── index.html          원페이지 메인 (소개 · 활동 · 초보 안내 · 일정 · 갤러리 · FAQ · 가입)
├── gallery.html        전체 사진 + 라이트박스
├── join.html           가입 안내 + 신청 폼 자리
├── assets/
│   ├── css/
│   │   ├── base.css    ← 디자인 토큰(색·폰트·여백). 전체 디자인은 여기서 바뀝니다
│   │   └── main.css    헤더, 섹션별 레이아웃, 갤러리, 푸터, 반응형
│   ├── js/
│   │   ├── main.js     공용 헬퍼, 헤더·모바일 메뉴, 동아리 정보 주입, FAQ 렌더
│   │   ├── schedule.js 일정 리스트 렌더
│   │   ├── gallery.js  갤러리 그리드 + 라이트박스 (깨진 사진은 자동으로 뺌)
│   │   ├── join.js     가입 페이지 신청서 영역 (항목 안내 · 바로 작성 · QR · 공유)
│   │   ├── instagram.js 인스타 섹션에 최근 게시물 표시 (Feedframer 에서 바로 불러옴)
│   │   └── vendor/
│   │       └── qrcode.js  QR 생성 라이브러리 (qrcode-generator 2.0.4, MIT)
│   └── img/            히어로 · 갤러리 이미지 (현재는 자리표시용 SVG)
├── scripts/
│   └── gallery-from-album.mjs  구글 포토 앨범 → 갤러리 (배포 때 실행)
└── data/               ← 내용 수정은 대부분 여기서만 하면 됩니다
    ├── club.json       동아리 기본 정보 (이름 · 암장 · 회비 · 모임 시간 · 연락처 · 모집)
    ├── schedule.json   일정
    ├── gallery.json    기본 사진 목록 — 구글 포토 앨범을 못 읽을 때만 쓰임
    └── faq.json        자주 묻는 질문
```

사이트는 세 층으로 나뉩니다. 고치려는 것이 어느 층인지 먼저 정하면 찾기 쉽습니다.

| 층 | 파일 | 바뀌는 것 |
| --- | --- | --- |
| 내용 | `data/*.json` | 이름, 회비, 일정, FAQ 같은 **값** |
| 구조 | `index.html` 등 | 섹션 순서, 문구, 어떤 요소가 있는지 |
| 디자인 | `assets/css/base.css` | **색 · 폰트 · 여백 — 사이트 전체** |
|  | `assets/css/main.css` | 섹션별 세부 레이아웃 |

## 어디서 고치나

개발 환경을 따로 갖추지 않아도 **GitHub 웹에서 바로** 고칠 수 있습니다.

1. 고칠 파일을 저장소에서 연 뒤 연필 아이콘(✏️)을 누릅니다.
   `data/club.json` 바로 가기: `github.com/gonewroad/climbing_club/edit/main/data/club.json`
2. 수정하고 오른쪽 위 **Commit changes...**
3. **Commit directly to the `main` branch** 가 선택된 채로 **Commit changes**

→ 30초~1분 뒤 사이트에 자동 반영됩니다. 진행 상황은 **Actions** 탭에서 초록 체크로
확인할 수 있습니다.

여러 파일을 한 번에 고치려면 저장소 메인 화면에서 키보드 **`.` (마침표)** 를 누르세요.
브라우저 안에서 VS Code가 열립니다.

### 망가뜨려도 괜찮습니다

**Commits** → 되돌릴 커밋 → **Revert** 버튼을 누르면 이전 상태로 돌아가고 자동으로
다시 배포됩니다. 부담 없이 시도해 보세요.

## 내용 바꾸기

HTML을 건드리지 않고 `data/*.json`만 고치면 사이트 전체에 반영됩니다.

| 하고 싶은 일 | 고칠 파일 |
| --- | --- |
| 동아리 이름 · 소속 · 암장 · 회비 · 인스타 계정 변경 | `data/club.json` |
| 모집 중 / 마감 전환 | `data/club.json` → `recruit.open` |
| 가입 신청 폼 연결 | `data/club.json` → `recruit.formUrl` |
| 일정 추가 · 삭제 | `data/schedule.json` |
| 갤러리 사진 추가 · 삭제 | **구글 포토 공유 앨범**에 올리거나 지우기 (아래 "갤러리" 참고) |
| FAQ 추가 | `data/faq.json` |

HTML 안에는 기본값이 들어 있고 JSON 값이 그 위를 덮어씁니다. 그래서 JSON에 오타가
있거나 값을 비워 둬도 **페이지가 깨지지는 않습니다.** 대신 고친 값이 반영되지
않으니, 편집기가 빨간 줄로 오류를 표시하면 고치고 저장하세요.

JSON에서 자주 실수하는 것:

```jsonc
"name": "KRAKEN",        // 값은 반드시 큰따옴표
"cohort": "2기",         // 숫자도 따옴표 (recruit.open 만 true/false)
"capacity": "15"         // 마지막 줄 뒤에는 쉼표를 쓰지 않습니다
```

지난 일정은 자동으로 숨겨지고, 가장 가까운 일정에 "다음 모임" 배지가 붙습니다.

### club.json 의 값이 사이트 어디에 나오나

| 키 | 보이는 곳 |
| --- | --- |
| `name` | 로고, 푸터 |
| `university` | 로고 옆 작은 글씨, 푸터 |
| `tagline` | 푸터 브랜드 아래 한 줄 |
| `intro` | 첫 화면 큰 제목 아래 설명문 |
| `cohort` | 소개 섹션 "기수" 카드 |
| `galleryAlbumUrl` | 갤러리에 쓸 구글 포토 공유 앨범 주소 |
| `homeGym.name` | 첫 화면 메타, 푸터, 가입 페이지 |
| `homeGym.address` / `.walk` | 푸터, 가입 페이지 |
| `fee.amount` / `.period` | 첫 화면 메타, 가입 페이지 |
| `fee.includes` | 가입 페이지 회비 설명 |
| `meetings` | 첫 화면 "정기 모임", 가입 페이지 |
| `contact.instagram` | 인스타 섹션 핸들 |
| `contact.instagramUrl` | 인스타 버튼 링크 (4곳) |
| `contact.instagramFeedKey` | **비워 두세요.** 배포할 때 GitHub Secret 의 키가 자동으로 들어갑니다 (아래 "인스타 피드" 참고) |
| `contact.openChatUrl` | 푸터 오픈채팅 링크 |
| `recruit.open` | `false` 로 바꾸면 배지가 "모집 마감"으로 |
| `recruit.nextPeriod` / `.capacity` | 가입 CTA, 가입 페이지 |
| `recruit.formUrl` | 가입 페이지 신청서 영역 — "신청서 열기" 버튼과 QR (아래 설명) |
| `recruit.formEmbedUrl` | "여기서 바로 작성" — 페이지 안에 펼쳐지는 구글 폼 (아래 설명) |
| `recruit.formFields` | "신청서에서 묻는 것" 목록, 가입 절차 1단계 문구 |
| `recruit.formMinutes` | 작성 시간 ("약 2분") |

가입 페이지의 신청서 영역은 세 가지 상태로 바뀝니다.

| 조건 | 화면 |
| --- | --- |
| `recruit.open` 이 `false` | "이번 모집은 마감되었습니다" · 버튼 없음 |
| `recruit.formUrl` 에 주소가 있음 | 신청서 안내 (아래) |
| 그 외 (주소 없음) | "신청서를 준비하고 있습니다" · 버튼 없음 |

신청서 주소가 있으면 다음이 나타납니다.

| 기능 | 동작 | 필요한 값 |
| --- | --- | --- |
| 항목 안내 | "신청서에서 묻는 것" 칩 + 작성 시간 | `formFields`, `formMinutes` |
| 신청서 열기 | 새 탭으로 폼 열기 | `formUrl` |
| 여기서 바로 작성 | 페이지 안에 구글 폼이 펼쳐짐 | `formEmbedUrl` (아래) |
| QR 코드 | PC 화면에서 폰으로 찍어 작성. "QR 이미지 저장" 으로 포스터용 PNG 저장 | `formUrl` |
| 링크 공유 | 폰은 공유 창, PC 는 링크 복사. **이 가입 페이지 주소**를 공유합니다 | — |

모바일에서는 QR 이 숨겨집니다. 이미 폰으로 보고 있으니 필요 없기 때문입니다.
공유 링크를 신청서가 아니라 가입 페이지로 한 이유는, 받는 사람이 모집 안내와
FAQ 를 함께 볼 수 있고 다음 학기에 신청서가 바뀌어도 링크가 계속 맞기 때문입니다.

**신청서 주소 넣기** — 구글 폼 편집 화면 **보내기 → 🔗 → URL 단축** 으로 복사해
`recruit.formUrl` 에 붙여넣습니다. 다른 폼 서비스 주소여도 동작합니다.

**"여기서 바로 작성" 켜기** — `forms.gle` 단축 주소로는 페이지 안에 넣을 수 없어서
전체 주소가 따로 필요합니다.

1. 구글 폼 편집 화면 → **보내기** → `< >` (HTML 삽입) 탭
2. 나오는 코드에서 `src="..."` 따옴표 안의 주소만 복사
   (`https://docs.google.com/forms/d/e/…/viewform?embedded=true` 모양)
3. `recruit.formEmbedUrl` 에 붙여넣기

`formUrl` 에 처음부터 `docs.google.com/forms/…/viewform` 전체 주소를 넣었다면
`formEmbedUrl` 은 비워 둬도 됩니다. 버튼을 눌러 펼칠 때만 구글 폼을 불러오므로
페이지가 느려지지 않습니다.

**신청서 항목을 바꿨다면** `recruit.formFields` 를 실제 질문에 맞게 고쳐 주세요.
화면의 "신청서에서 묻는 것" 과 가입 절차 1단계 문구가 함께 바뀝니다.

```jsonc
"formFields": ["이름", "학과", "학번", "연락처", "운동 경험"],
"formMinutes": "2"
```

주소가 비어 있는 링크는 화면에서 **자동으로 숨겨집니다.** 눌러도 아무 일이
없는 링크를 방문자에게 보이지 않기 위해서입니다. 푸터의 카카오 오픈채팅
링크가 지금 그런 상태입니다.

**아직 화면에 연결되지 않은 키**: `homeGym.mapUrl`, `contact.email`,
`recruit.period`. 채워도 어디에도 표시되지 않습니다.

### JSON에 없는 것

브라우저 탭 제목, 활동 4칸, "처음이신가요?" 문구, 난이도 색 표는 `index.html` 을
직접 고쳐야 합니다. `<!-- ===== 소개 ===== -->` 같은 주석으로 구역을 나눠놨습니다.

## 디자인 바꾸기

### 한 곳만 고치면 전체가 바뀝니다

`assets/css/base.css` 맨 위 `:root` 블록이 사이트 전체의 색·크기·폰트를 결정합니다.
이걸 디자인 토큰이라고 부릅니다.

```css
--accent: #ff6b2c;   /* 이 한 줄이 주황색 전부를 결정합니다 */
```

버튼, 로고 마름모, `ABOUT` 같은 라벨, 히어로의 "누구나 처음", FAQ의 `+` 기호,
"다음 모임" 배지가 모두 이 값에서 나옵니다.

| 토큰 | 담당하는 곳 |
| --- | --- |
| `--bg` | 페이지 전체 배경 (가장 어두운 색) |
| `--surface` | 한 칸 밝은 섹션 (소개 / 처음이신가요 / 갤러리) |
| `--surface-2` | 카드 배경 (통계 · 활동 · 일정 · FAQ 박스) |
| `--line` / `--line-strong` | 테두리 |
| `--text` / `--text-dim` / `--text-faint` | 본문 / 설명 / 작은 라벨 글자색 |
| `--accent` | **포인트 색 (주황)** |
| `--accent-soft` | 배지 배경 (accent 의 투명 버전) |
| `--accent-ink` | 주황 버튼 위에 올라가는 글자색 |
| `--lime` / `--sky` | 활동 카드 상단 띠, 난이도 표 |
| `--container` | 본문 최대 너비 (1140px) |
| `--radius-sm` / `--radius` / `--radius-lg` | 모서리 둥글기 |
| `--header-h` | 상단 바 높이 |
| `--font` | 글꼴 |
| `--ease` | 애니메이션 가속 곡선 |

### 실험은 브라우저에서, 반영은 파일에

고치고 커밋해서 확인하면 느립니다. **브라우저에서 실시간으로 바꿔보고 마음에 드는
값만 파일에 옮기세요.**

1. 사이트에서 **F12** (맥은 `Cmd+Option+I`)
2. **Elements** 탭 → 맨 위 `<html>` 줄 클릭
3. 오른쪽 **Styles** 패널에서 `:root` 블록을 찾습니다
4. `--accent` 옆 색깔 네모를 클릭하면 컬러 피커가 열립니다
5. 색을 바꾸면 사이트 전체가 즉시 바뀝니다
6. 마음에 드는 색 코드를 복사해 `base.css` 에 붙여넣고 커밋

개발자도구에서 바꾼 것은 새로고침하면 사라집니다. 실제 사이트에는 영향이 없으니
마음껏 시도해 보세요.

모바일 화면 확인은 개발자도구에서 `Ctrl+Shift+M` (맥 `Cmd+Shift+M`).

### 자주 하는 수정

**포인트 색 바꾸기** — `base.css`

```css
--accent: #ff6b2c;                      /* 원하는 색으로 */
--accent-soft: rgba(255, 107, 44, 0.14); /* 같은 색의 투명 버전도 함께 */
```

`--accent-soft` 를 같이 바꾸지 않으면 배지 색만 따로 놉니다.

**각진 디자인으로** — `base.css`

```css
--radius-sm: 0;
--radius: 0;
--radius-lg: 0;
```

**본문 폭 넓히기** — `base.css` 의 `--container` 를 `1280px` 등으로.

**글꼴 바꾸기** — `base.css` 맨 윗줄 `@import` 와 `--font` 를 함께 수정합니다.
한글 폰트는 https://fonts.google.com/?subset=korean 에서 고를 수 있습니다.

**섹션 순서 바꾸기** — `index.html` 에서 `<!-- ===== 소개 ===== -->` 처럼 주석으로
구분된 `<section>` 블록을 통째로 잘라 옮기면 됩니다.

## 로컬에서 보기

디자인을 본격적으로 손볼 때는 로컬이 가장 편합니다. 저장 → 새로고침이면 바로
보이고, 마음에 들 때만 푸시하면 되니 사이트에 영향이 없습니다.

`data/*.json` 을 `fetch` 로 읽기 때문에 **HTML 파일을 더블클릭해서 열면 일정·갤러리·FAQ가
비어 보입니다.** 간단한 웹 서버로 띄워주세요.

```bash
git clone https://github.com/gonewroad/climbing_club
cd climbing_club
python3 -m http.server 8000
# http://localhost:8000
```

## 배포 (GitHub Pages)

`.github/workflows/deploy-pages.yml` 이 `main` 푸시마다 사이트를 배포합니다.
빌드 과정이 없으므로 저장소 내용을 그대로 올립니다.

**최초 1회만** 저장소에서 Pages를 켜야 합니다. 워크플로의 기본 토큰에는
Pages 사이트를 새로 만들 권한이 없어서 자동화할 수 없습니다.

1. 저장소가 **공개(public)** 여야 합니다. 비공개 저장소의 Pages는 유료 플랜에서만
   동작합니다.
2. **Settings** → **Pages** → Build and deployment → Source 를 **GitHub Actions** 로
3. Actions 탭에서 `Deploy to GitHub Pages` 를 다시 실행 (Re-run jobs)

이후에는 `main` 에 푸시할 때마다 자동 배포됩니다.

워크플로 없이 가고 싶다면 Source 를 **Deploy from a branch** (`main` / `/ (root)`)
로 두어도 됩니다. 그때는 `.github/workflows/deploy-pages.yml` 을 지우세요.

## 갤러리 (구글 포토 앨범)

갤러리 사진은 **구글 포토 공유 앨범**에서 가져옵니다. 앨범에 사진을 올리면 사이트
갤러리에 자동으로 나타나고, 앨범에서 지우면 사이트에서도 빠집니다. 사진 파일은
저장소에 올리지 않습니다.

```
구글 포토 공유 앨범 ──▶ 배포 워크플로가 사진 주소만 뽑음 ──▶ 배포되는 사이트의 data/gallery.json
                                                     └──▶ 사진은 방문자 브라우저가 구글 서버에서 표시
```

- 앨범 주소는 `data/club.json` 의 `galleryAlbumUrl` 입니다.
- 배포 워크플로(`.github/workflows/deploy-pages.yml`)가 `scripts/gallery-from-album.mjs` 로
  앨범에서 사진 주소를 뽑아 **배포되는 사이트에만** 넣습니다. 저장소의
  `data/gallery.json` 은 바뀌지 않습니다.
- 사이트를 고쳐서 푸시할 때마다, 그리고 **6시간마다** 앨범을 다시 확인합니다. 6시간마다
  하는 확인은 사진이 바뀌었을 때만 다시 배포합니다.
- 그리드에는 4:3 으로 잘라 줄인 사진을, 크게 볼 때는 1600px 이하로 줄인 사진을 불러옵니다.
- 메인 페이지 미리보기는 앞의 8장, 갤러리 페이지는 전체(최대 100장)를 보여줍니다.

**사진을 바로 반영하려면** — Actions → **Deploy to GitHub Pages** → **Run workflow**

**앨범 공유 설정** — 공유 앨범은 링크만 알면 누구나 볼 수 있습니다. 앨범 설정에서
**공동작업(다른 사람이 사진 추가)** 은 꺼 두세요. 회원 얼굴이 나온 사진은 동의를 받고
올려 주세요.

**알아 둘 점** — 구글 포토는 공유 앨범을 읽는 공식 방법이 없어 앨범 페이지에 들어 있는
사진 주소를 찾아 씁니다. 구글이 페이지 구조를 바꾸면 사진을 못 찾을 수 있습니다.

| 증상 | 의미 |
| --- | --- |
| 배포 기록에 노란 경고 `앨범에서 사진을 가져오지 못했습니다` | 이번엔 앨범을 못 읽음. 지금 사이트의 갤러리를 그대로 유지했으니 사이트는 멀쩡함 |
| 같은 경고가 계속 남 | 구글 쪽 구조가 바뀌었을 가능성. 경고 아래의 페이지 제목·주소 개수를 보고 `scripts/gallery-from-album.mjs` 를 고쳐야 함 |
| 갤러리에서 사진 몇 장이 안 보임 | 깨진 사진은 자동으로 뺍니다. 앨범에서 지워졌거나 구글이 주소를 바꾼 경우 |
| 6시간마다 확인이 아예 안 돎 | 공개 저장소는 **60일 동안 활동이 없으면** 예약 실행이 꺼집니다. Actions 탭에서 다시 켜기 |

## 인스타 피드

메인 페이지 인스타 섹션의 사진 4장은 동아리 인스타(@takoyaki_climbing)의
최근 게시물입니다. **방문자 브라우저가 Feedframer 에서 바로 불러오며, 사진을
저장소에 저장하지 않습니다.**

```
방문자 브라우저 ──▶ Feedframer API ──▶ 최근 게시물 목록
               └──▶ Feedframer 사진 서버(cdn.feedframer.com) ──▶ 사진 표시
```

- 인스타 섹션 근처까지 스크롤했을 때만 불러옵니다. 원본 사진이 커서입니다.
- 사진을 다 불러온 뒤에 바꿔 끼웁니다. 키가 없거나 불러오기에 실패하면 자리표시
  그림이 그대로 보입니다.
- 인스타에서 게시물을 지우면 Feedframer 가 갱신되는 대로 사이트에서도 사라집니다.
  저장소에 남는 기록이 없습니다. 다만 사진 사본은 Feedframer 서버에 있으므로, 그쪽에서
  언제 지워지는지는 Feedframer 정책을 따릅니다.
- 화면에 보일 개수는 `index.html` 의 `data-instagram data-limit="4"` 에서 바꿉니다.

**키는 GitHub Secret 에 둡니다** — Feedframer 대시보드의 **API Token** 을 저장소
**Settings → Secrets and variables → Actions** 의 `FEEDFRAMER_API_KEY` 에 넣어 둡니다.
배포할 때 `.github/workflows/deploy-pages.yml` 이 이 키를 꺼내 **배포되는 사이트의**
`data/club.json` 에만 넣습니다. 저장소의 `club.json` 은 `instagramFeedKey` 가 빈 채로
그대로입니다.

`club.json` 에 키를 직접 적지 마세요. 저장소가 공개라서 커밋 기록에 영구히 남습니다.

키는 방문자 브라우저가 써야 하므로 배포된 사이트의 소스에는 보입니다. Feedframer 는
키로 할 수 있는 일이 **이 계정의 공개 게시물 읽기뿐**이라 브라우저에 노출해도 괜찮다고
안내합니다. 혹시 남용되는 것 같으면 Feedframer 대시보드에서 키를 새로 발급하고 Secret
을 바꾼 뒤 다시 배포(Actions → Deploy to GitHub Pages → Run workflow)하세요.

**새 게시물이 사이트에 뜨기까지** — Feedframer 무료 플랜은 하루 한 번 인스타를
확인합니다. 급하면 Feedframer 대시보드에서 새로고침하세요(하루 1회 가능).

**필요한 설정**

| 항목 | 위치 |
| --- | --- |
| Feedframer API 토큰 | 저장소 Secret `FEEDFRAMER_API_KEY` (배포 때 자동으로 사이트에 들어감) |
| 인스타 계정 연결 | Feedframer 대시보드. 계정은 프로페셔널(크리에이터·비즈니스)이어야 함 |

인스타 접근 토큰 갱신은 Feedframer 가 알아서 합니다.

**사진이 안 바뀌면**

| 증상 | 확인할 것 |
| --- | --- |
| 배포 기록에 노란 경고 `FEEDFRAMER_API_KEY 가 없어…` | Secret 이 없거나 이름이 다름 |
| 개발자도구(F12) Console 에 `[인스타 피드] 불러오기 실패` | 키가 틀림. Feedframer 에서 다시 복사해 Secret 갱신 후 재배포 |

**그만 쓰려면** — Secret `FEEDFRAMER_API_KEY` 를 지우고 다시 배포한 뒤, 인스타
**설정 → 웹사이트 권한** 에서 FeedFramer-IG 연결을 해제하세요.

## 아직 채워야 하는 것

아래 값은 **실제 정보가 아닌 자리표시용**입니다.

- [ ] 홈 암장 이름 · 주소 · 찾아오는 길 (`data/club.json` → `homeGym`)
- [ ] 회비에 실제로 포함되는 항목 (`fee.includes`)
- [ ] 카카오 오픈채팅 링크 (`contact.openChatUrl`)
- [ ] 모집 기간 · 정원 (`recruit.nextPeriod`, `recruit.capacity`)
- [ ] 신청서 항목이 실제 구글 폼과 맞는지 (`recruit.formFields`)
- [ ] "여기서 바로 작성" 용 전체 주소 (`recruit.formEmbedUrl`) — 선택
- [ ] 난이도 색 체계 — 암장마다 다르므로 홈 암장 기준으로 수정 (`index.html`)
- [ ] 일정 (`data/schedule.json`) — 현재는 예시 7건
- [ ] FAQ 중 신입 교육 관련 내용이 실제와 맞는지 확인 (`data/faq.json`)

`meetings` 에 토·일 두 개가 들어 있는데 소개 섹션에는 "주 1회"로 적혀 있습니다.
둘 중 하나를 실제에 맞게 고쳐야 합니다.

## 메모

- 다크 테마 전용입니다. 클라이밍 사진이 어두운 배경에서 가장 잘 보입니다.
- 외부 CDN 의존은 폰트(Pretendard) 하나뿐입니다. QR 생성 라이브러리는 CDN 대신
  `assets/js/vendor/` 에 직접 넣어 두었고, 가입 페이지에서만 불러옵니다.
- 인스타 피드는 외부 서비스 Feedframer 를 거칩니다. Feedframer 가 멈추면 인스타
  섹션에는 자리표시 그림이 보이고, 나머지 사이트는 영향이 없습니다.
- 헤더와 푸터는 세 페이지에 각각 들어 있습니다. 메뉴를 고칠 때는 세 파일을 모두
  수정해야 합니다. 페이지가 더 늘어나면 정적 사이트 생성기 도입을 고려하세요.
- 사진에 회원 얼굴이 들어가면 공개 사이트라 누구나 볼 수 있습니다. 올리기 전에
  동의를 받아 주세요.
