# COMMON FEATURES — screen & feature map for the 2026-09-18 audit

Scope: everything shared by the six live courses (STUDENT `student`, VOCA `phonics`, GRAMMAR I `grammar1`,
GRAMMAR II `grammar2`, LISTENING `ld`, READING `reading`). CNN/GVA are retired and out of scope. CNN is
still **routed and shown** (home stage 07, nav tab, sitemap, 120 search items), so it is mentioned only where it
changes a count.

How this was made: I read the source at `main` = `9d6e15d`. I computed the counts with read-only node scripts over
`content/`, `public/search-index.json` and `src/lib/generated/*.json`. For the search matcher, `evaluatePronunciation`,
the top-player sentence extraction and the section titles, I ran **the app's own functions** (transpiled with the repo's
TypeScript) or line-for-line replicas in node. **Nothing was run against production or in a browser.** Every
"expected" value below comes from source reading or those node runs, and every item in §12 is UNVERIFIED on
production. The same agent (Claude) wrote and checked this map; there was no independent review.

Existing harness this map is written against: `docs/qa-2026-09-18/scripts/lib/harness.cjs` (headless Edge, AUDIO_HOOK,
trusted clicks) and `lib/profile.cjs` (clones of `%TEMP%\kig-audit-licensed-profile`, **LIFE** plan).

---

## 1. Routes & data sources (with schema)

### 1.1 Page routes

| Route | File | Rendering / guard | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx:13` → `src/components/LandingPage.tsx:89` | per request (layout reads headers) | 7 snap-scroll stages from `getTabs()`; **no TabBar** (`TabBar.tsx:45-47` returns null on `/`) → no search, no licence button on home |
| `/t/[tab]` | `src/app/t/[tab]/page.tsx:64` | proxy allow-list (`validRoutes.tabs`) | tab slugs: `students, voca, grammar1, grammar2, ld, reading, cnn`. Only linked from `not-found.tsx:53` and the sitemap |
| `/[course]` | `src/app/[course]/page.tsx:86` | allow-list `validRoutes.courses` | course list + `CourseDashboard` |
| `/[course]/[lesson]` | `src/app/[course]/[lesson]/page.tsx:110` | allow-list `validRoutes.lessons[course]`; server licence gate `:148-182`; GRAMMAR I odd ids redirect `:129-137` | lesson page |
| `/student/[lesson]` | `src/app/student/[lesson]/page.tsx:82` | static segment wins over `[course]`; own gate + sequential lock `:95-133`, then renders `LessonPage` | every STUDENT link is `/student/<id>` |
| `/admin/license` | `src/app/admin/license/page.tsx:36` (+ `admin/layout.tsx` noindex) | client page, admin cookie | see §4.12 |
| 404 | `src/app/not-found.tsx:23` | proxy rewrites unknown 1–2-segment paths to `/_kig/route-guard/not-found` (`proxy.ts:76,176,194`) | |
| errors | `src/app/error.tsx:22`, `src/app/global-error.tsx:24` | | |
| metadata files | `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/icon.svg`, `favicon.ico` | | |
| media | `src/app/audio/[...path]/route.ts` (GET, HEAD), `src/app/video/[...path]/route.ts` → `src/lib/mediaRoute.ts:26` | licence gate `src/lib/mediaAccess.ts:72` | |

Root layout `src/app/layout.tsx:67-105`: `<html lang="ko" translate="no">`, inline theme script with nonce (`:86-88`),
providers nested `LanguageProvider > LicenseProvider > ProgressProvider`, then `KakaoTalkNoticeBanner`, `TabBar`,
`LicenseModal`, page. **There is no footer on any page** (no terms, privacy, contact or business info; grep for
footer/약관/개인정보/사업자 finds nothing).

### 1.2 Data files and schemas

- `content/courses/<slug>.json` → `{ course, tab, lessonCount, groups: [{label|title, lessons: string[]}], lessons: LessonSummary[] }`.
  `LessonSummary` = `{ id, title, label, series, variant: "main"|"script", unit, part, order, hasAudio, hasVideo?, menuLabel }` (`src/lib/types.ts:225-237`).
  STUDENT groups use **`title`**, not `label` (course page handles both: `[course]/page.tsx:118`).
- `content/lessons/<slug>/<id>.json` → `Lesson` (`types.ts:173-215`): `id, course, series, variant, pairId, title, label, menuLabel, unit, part, order, audio: [{src, legacySrc, autoplay, label?}], video, blocks: Block[], chunkDrills?, readingSentences?, readingVocabulary?, legacyPath, legacyEncoding`.
  `Block` = heading | instruction | hints | sentences{items:[{n,text,alternatives?}]} | paragraph{text,lang?} | choice{options} | dictation{rows} | wordgrid{rows}.
- `content/ld_english_scripts.json` → `{ [baseId]: [{n, ko, en, answer?}] }` (`content.ts:235-241`).
- `content/voca_dictionary.json` → `{ [word]: {meaning, searchWord?} }` (inspect with node only).
- `public/search-index.json` → `SearchItem[]` = `{ id, course, courseTitle, code, title, subtitle, badge?, searchText }` (built by `scripts/buildSearchIndex.ts`, **not** part of `prebuild`).
- `src/lib/generated/validRoutes.json` → `{ courses[], tabs[], staticRoutes[], files[], lessonCount, lessons: {course: id[]} }` (built by `scripts/buildValidRoutes.mjs` in `prebuild`).
- `src/lib/generated/freeSpeechKeys.json` → `{ lessons, count, keys: string[] }` (built by `scripts/buildFreeSpeechKeys.mjs` in `prebuild`).
- Course taxonomy: `src/lib/courses.ts:11-102` (slug, tab, title, titleEn, kind, description, series, lessonNaming).
  Tabs: `src/lib/tabs.ts:24-81` (slug, label, courses, blurb).
- Presentation (titles/codes/badges): `src/lib/curriculumPresentation.ts:102-324`; group titles `:42-97`.
- i18n dictionary: `src/lib/i18n.ts` (ko default, en, ja, zh).

### 1.3 Server-side state (not in the repo)

- Licence records: R2 `private/license-records/<sha256(trim+upper key)>.json`, AES-256-GCM (`src/lib/deviceStorage.ts:96,184-191`).
  Record: `{ key, plan, maxDevices?, devices:[{deviceId, deviceName, registeredAt, lastSeenAt}], isRevoked?, revokedAt?, revokeReason?, firstActivatedAt?, createdAt?, memo? }` (`:20-41`).
- STUDENT progress: R2 `private/progress/<sha256(key)>.json` (`src/lib/studentProgress.ts:15,64-67`).
  Record: `{ version:1, lessons:{[id]:{completed, updatedAt}}, unlockedThrough, manualUnlockedThrough?, lastLessonId?, lastLessonUpdatedAt?, updatedAt }`.

---

## 2. Counts & id sequences (computed with node, 2026-09-18)

| course | index lessons | main | script | groups | files on disk | `validRoutes` ids | listed on course page (`총 N개 정규 레슨`) | sections (`N개 단계 구성`) | search items |
|---|---|---|---|---|---|---|---|---|---|
| phonics | 195 | 195 | 0 | 4 | 195 | 195 | 195 | 4 | 195 |
| grammar1 | 194 | 53 | 141 | 6 | 194 | 194 | 53 | 6 | 53 |
| grammar2 | 88 | 44 | 44 | 6 | 88 | 88 | 44 | 6 | 44 |
| ld | 552 | 276 | 276 | 5 | **553** | 552 | 276 | 5 | 276 |
| reading | 512 | 256 | 256 | 6 | 512 | 512 | 256 | 6 | 256 |
| student | 82 | 82 | 0 | 20 | 82 | 82 | 82 | 20 | **81** |
| (cnn) | 120 | 120 | 0 | 2 | 120 | 120 | – | – | 120 |

Search index total 1,025 items, no duplicates, every item routable.

Oddities:
- **`content/lessons/ld/LD_001.json`** exists but is not in the index. `getLesson` rejects `_` (`content.ts:74`), so `/ld/LD_001` → 404.
- **`s19-3` is missing from `public/search-index.json`.** It was restored in commit `2a681ea`, and the index was not rebuilt (the index is not in `prebuild`). The index fields match the current `formatLessonPresentation` output for all 1,025 items (0 stale fields).
- No duplicate ids in any index. Every group id exists in its index, and every index id is in some group.
- Sequences with no gaps: `d001–d276` (each with `-1`), `pr001–pr256` (each with `-1`), `gh2-007–gh2-050` (each with `-1`), `mv1-01..40`, `mv2-01..40`, `mv3-01..40`, `hv-01..75`.
  STUDENT parts per chapter: 1:6 2:6 3:4 4:6 5:5 6:4 7:3 8:4 9:3 10:5 11:4 12:4 13:3 14:3 15:3 16:3 17:4 18:3 19:4 20:5.
- GRAMMAR I: mains are the 53 even ids in `G1_EVEN_PRIMARY_IDS` (`curriculumPresentation.ts:17-27`, verified equal to index mains). Numbers 18,19,48,49,70,71,86,87,104,105,114,115 do not exist. **97 ids redirect** (every odd `gh1-NNN[-k]` → `gh1-(NNN-1)[-k]`, `[course]/[lesson]/page.tsx:129-137`), so 97 GRAMMAR I pages render. The index order is not sorted: `gh1-016-1` is the **last** entry, which matters for prev/next on script pages (§9).
- STUDENT chapter titles for the dashboard come from `group.title` ("Chapter 1. 자기소개 (Self-introduction)" …). The server-side `getStudentChapters` reads `group.label`, which is absent, so it labels chapters "Chapter N" (`studentProgress.ts:272`); the UI does not show that label.
- Free preview (`src/lib/license.ts:72-85`): student `s1-1,s1-2`; phonics `mv1-01,mv1-02`; grammar1 `gh1-006(-1,-2), gh1-007(-1,-2), gh1-008(-1,-2), gh1-009(-1,-2)`; grammar2 `gh2-007(-1), gh2-008(-1)`; ld `d001(-1), d002(-1)`; reading `pr001(-1), pr002(-1)`.
  The dashboard's positional rule (section 0, index < 2, `license.ts:112-114`) gives the same visible cards for all six courses (`mv1-01/02`, `gh1-006/008`, `gh2-007/008`, `d001/002`, `pr001/002`, `s1-1/2`), so there is no mismatch today.
- `freeSpeechKeys.json`: 28 lessons, 532 keys. Every top-player sentence of every free lesson has its key in the list (0 missing, computed).
- Sitemap should list **29 URLs**: 1 home, 7 courses, 7 tabs, and 14 free lessons (`mv1-01, mv1-02, gh1-006, gh1-008, gh2-007, gh2-008, d001, d002, pr001, pr002, s1-1, s1-2, cnn001, cnn002`).

Section titles as rendered (`formatGroupTitle`, computed):
- phonics: `중등 단어 1단계 (MV1 Series)`[40] · `중등 단어 2단계 (MV2 Series)`[40] · `중등 단어 3단계 (MV3 Series)`[40] · `고등 심화 단어 (HV Series)`[75]
- grammar1: `제 1단계 : 기본 문장 구조 훈련 (Stage 1)`[6] · `제 2단계 : 어순 및 시제 훈련 (Stage 2)`[12] · `제 3단계 : 조동사 & 수동태 훈련 (Stage 3)`[5] · `제 4단계 : 의문사 & 부정구문 훈련 (Stage 4)`[11] · `제 5단계 : 접속사 & 복문 확장 훈련 (Stage 5)`[13] · `제 6단계 : 실전 고급 복합 구문 (Stage 6)`[6]
- grammar2: `제 7과 ~ 제 14과 핵심 패턴 영작`[8] · `제 15과 ~ 제 21과 …`[7] · `제 22과 ~ 제 28과 …`[7] · `제 29과 ~ 제 35과 …`[7] · `제 36과 ~ 제 42과 …`[7] · `제 43과 ~ 제 50과 …`[8]
- ld: `Section 1 · 001회 ~ 050회 실전 리스닝`[50] … `Section 4 · 151회 ~ 200회 실전 리스닝`[50] · `Section 5 · 201회 ~ 276회 실전 리스닝`[76]
- reading: `Section 1 · 001회 ~ 040회 원문 독해`[40] · `Section 2 · 041회 ~ 080회`[40] · `Section 3 · 081회 ~ 120회`[40] · `Section 4 · 121회 ~ 173회`[53] · `Section 5 · 174회 ~ 223회`[50] · `Section 6 · 224회 ~ 256회`[33]
- student: `Chapter N. …` × 20. The unlock threshold `requiredCount = max(1, ceil(n×0.8))`: n=6→5, 5→4, 4→4, 3→3.

Lesson title examples (`formatLessonPresentation`): ld `d001`/`d001-1` → `001회 · 실전 듣기 평가` (subtitles `수능/토익 딕테이션 훈련` / `한국어 번역 및 어순 대조`), code `Round 001`; reading `pr001` → `001회 · 원문 독해 & 리스닝`; grammar1 `gh1-006` → `01강 · 기초 영작 훈련` / `제 1단계 (기본 문장 구조)`; grammar2 `gh2-007-1` → `제 07과 · 패턴 영작 훈련` / `한국어 대조 스크립트`; phonics `mv1-01` → `중등 단어 1단계 · 01회`, `hv-05` → `고등 단어 · 05회`; student `s1-1` → `Part 1 · Greeting (인사말)` / `Chapter 1. Self-introduction (자기소개)` / code `Ch 1-1`.
`document.title` = `<title> · K-IG 핵심 어학 마스터` (template `layout.tsx:18`). Course page: `LISTENING · K-IG 교육 · K-IG 핵심 어학 마스터`. Home: `K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING)`.

---

## 3. Components (file:line)

| Component | File:line | Used by |
|---|---|---|
| LandingPage / SectionPhoto | `src/components/LandingPage.tsx:89` / `:39` | `/` |
| TabBar (header + mobile drawer) | `src/components/TabBar.tsx:23` | layout |
| SearchDialog | `src/components/SearchDialog.tsx:33` | TabBar |
| LicenseButton | `src/components/LicenseButton.tsx:10` | TabBar |
| LicenseModal | `src/components/LicenseModal.tsx:26` | layout |
| LicenseProvider / useLicense | `src/components/LicenseProvider.tsx:90` / `:440` | layout |
| ProgressProvider / useProgress | `src/components/ProgressProvider.tsx:54` / `:297` | layout |
| LanguageProvider / T / useTheme | `src/components/LanguageProvider.tsx:44` / `:134` / `:122` | layout |
| KakaoTalkNoticeBanner | `src/components/KakaoTalkNoticeBanner.tsx:9` | layout |
| NavigationScrollRestoration | `src/components/NavigationScrollRestoration.tsx:11` | layout (scroll to 0 on every pathname change) |
| CourseDashboard / DashboardLessonCard | `src/components/CourseDashboard.tsx:176` / `:28` | `/[course]` |
| ChapterAudioBar | `src/components/ChapterAudioBar.tsx:51` | CourseDashboard (student only, `:447-454`) |
| LessonActionButtons | `src/components/LessonActionButtons.tsx:6` | lesson page `:273` |
| LessonStepNavigation | `src/components/LessonStepNavigation.tsx:18` | lesson page `:398` |
| AudioPlayer (top player) | `src/components/AudioPlayer.tsx:29` | lesson page `:343-365` |
| LessonPaywall | `src/components/LessonPaywall.tsx:15` | lesson pages when locked |
| LessonBody (dispatcher) | `src/components/LessonBody.tsx:122-231` | per-course views (other maps) |
| VoiceSpeakingTester (shared mic scorer) | `src/components/VoiceSpeakingTester.tsx:20` | Phonics, Grammar, Ld, Reading, Student, Dialogue views |
| LessonClientGate | `src/components/LessonClientGate.tsx:22` | **unused** (no importer) |
| TabList | `src/components/TabList.tsx:16` | **unused** (no importer) |
| speech engine | `src/lib/speech.ts` | all audio |
| clip key | `src/lib/unifiedSpeech.ts` | speech.ts, build scripts |
| pronunciation scoring | `src/lib/speechRecognition.ts:120` | VoiceSpeakingTester |
| media gate | `src/lib/mediaAccess.ts:72`, `src/lib/mediaRoute.ts:26` | `/audio`, `/video` |
| proxy (404 + CSP nonce) | `src/proxy.ts:166` | every page |
| CSP | `src/lib/csp.ts`, `next.config.ts:99-131` | |

---

## 4. Every view and every control

Korean strings are copied verbatim from the JSX. Match innerText with `includes()`, because emoji and inline spans sit next to
each other. Prefer `aria-label` where one exists.

### 4.1 Home `/` (`LandingPage.tsx`)
- `<h1>` `K-IG 교육` (`:232-237`). There is no TabBar.
- One `<section>` per tab, in order STUDENT, VOCA, GRAMMAR I, GRAMMAR II, LISTENING, READING, CNN NEWS. Each has:
  - A pill `STAGE 0N · CURRICULUM` (`:262-266`).
  - `<h2>` containing a Link to `/${courses[0]}` with the tab label (`:272-279`). Targets: `/student /phonics /grammar1 /grammar2 /ld /reading /cnn`.
  - The blurb from `tabs.ts` (e.g. `Real Conversations. Pure Listening & Reading.`).
  - A Link `학습 시작하기 →` to the same course (`:288-294`).
  - On sections 1–6, a button with aria-label **`다음 코스로 이동`** (text `NEXT ↓`) that calls `scrollToTab(i+1)` (`:302-314`).
- Right-side dots nav, aria-label `Section Navigation`, with 7 buttons aria-labelled **`Scroll to section 0N (LABEL)`** (e.g. `Scroll to section 05 (LISTENING)`) (`:320-341`). The active dot has class `scale-140`.
- Keyboard on window: ArrowDown/PageDown/Space → next stage; ArrowUp/PageUp/Shift+Space → previous (`:173-183`). The wheel handler needs a delta ≥ 25 and has a 600 ms cooldown.
- Expected: after `scrollToTab(k)`, the container `scrollTop ≈ k × clientHeight` and dot k is active. Section photos come from `TAB_IMAGES` (`src/lib/tabImages.ts`); every `<img>` has `alt=""` (decorative, `aria-hidden` wrapper).

### 4.2 Header `TabBar` (every page except `/`)
- Logo Link `/`: text `K‑IG` (U+2011 non-breaking hyphen) + dot + `교육` (`:64-71`).
- Desktop nav (`hidden xl:flex`, visible at ≥1280 px), aria-label `Courses`, has 7 Links with the tab labels. Targets are `/${tab.courses[0]}`. The active link gets `aria-current="page"` (`:79-104`). Active tab = `t/<slug>`, or `courseTabs[segments[0]]` (`student→students, phonics→voca, …`).
- `LicenseButton` (`LicenseButton.tsx`):
  - Unlicensed: title `이용권 코드 등록`, text `🔑` + `이용권 등록`.
  - Licensed all-pass: title `VIP 이용권 상태 확인`, text `VIP 올패스` + `ACTIVE`.
  - STUDENT-only: title `STUDENT 패스 상태 확인`, text `STUDENT 패스` + `ACTIVE`.
  - Every state → `openModal()`.
- `SearchDialog` trigger: aria-label **`검색 (Cmd+K)`**, title `검색 (단축키: Cmd+K 또는 Ctrl+K)`, text `🔍 검색` (+ `⌘K` kbd at ≥768 px) (`SearchDialog.tsx:145-157`).
- Hamburger (`flex xl:hidden`): aria-label **`메뉴 열기`** / **`메뉴 닫기`**, with `aria-expanded` (`TabBar.tsx:113-137`).
- Drawer (open state, `:144-235`):
  - Header `전체 커리큘럼 메뉴`, close button aria-label **`닫기`**.
  - 7 Links. The active one shows `학습중 ●`.
  - Footer button text: `🔑 이용권 코드 등록` | `👑 VIP 올패스 회원 (확인)` | `🎓 STUDENT 패스 회원 (확인)` (closes the drawer and opens the modal).
  - Link `🏠 홈(대시보드)으로 이동`, then the text `K-IG Core Language Curriculum`.
  - Clicking the backdrop closes the drawer, and so does any route change (`:29-31`). While it is open, `document.body.style.overflow = "hidden"` (`:34-43`).
  - Two controls are labelled `닫기` (drawer close and modal close), but they are never open together.

### 4.3 Search dialog
- Open: click the trigger; press **Ctrl+K/Cmd+K** (toggle); or press **`/`** when focus is not in an input, textarea or contenteditable (`:60-83`). Close: Escape, click on the backdrop, the button aria-label **`창 닫기`** (text `✕ 닫기`), or the footer button `닫기 (ESC)`.
- The first open fetches `/search-index.json` once. The dialog shows `검색 인덱스를 불러오는 중입니다…` while loading. A failed fetch is silent: it just shows the empty state.
- Input placeholder: **`레슨 제목·번호·과정 검색 (예: 중등 단어, 1강, 수능 듣기, MV1)`** (`:180`). It is auto-focused after 50 ms. When non-empty it shows a clear button with title `검색어 지우기` (text `✕`).
- Empty query → the first 10 items (`s1-1 … s1-6, s2-1 … s2-4`). Non-empty → up to 20 matches (§5.1).
- Row (`:229-311`): a `<button>` with the course pill (`courseTitle`), `code`, `title`, `subtitle`, a **`🔒 이용권`** chip (title `이용권이 필요한 레슨`) when `!isUnlocked(course,id)` (ID rule, no section index), the badge (≥640 px) and `→`.
- Keys in the input: ArrowDown/ArrowUp wrap around, Enter → `router.push('/'+course+'/'+id)`; clicking a row does the same. Mouse hover moves the selection (`bg-primary` class).
- No results: `검색 결과가 없습니다.` + `'<query>'에 해당하는 학습 과정을 찾을 수 없습니다.` + `추천 검색어: 중등 단어, 고등, 1강, 패턴, 수능 듣기, 독해`.
- Footer text `↑↓ 탐색`, `↵ 선택 즉시 이동`.
- Expected results (node replica of `SearchDialog.tsx:13-20,98-110` over the committed index):

| query | total matches | shown / first results |
|---|---|---|
| `1강` / `01강` | 1 | grammar1/gh1-006 |
| `150` | 2 | ld/d150, reading/pr150 |
| `d150` | 1 | ld/d150 |
| `mv1` | 40 | 20 shown, mv1-01… |
| `MV1-01` | 1 | phonics/mv1-01 |
| `수능 듣기` | 276 | 20 shown, d001… |
| `패턴` | 44 | 20, gh2-007… |
| `독해` | 256 | 20, pr001… |
| `greeting` | 4 | s1-1, s2-1, s3-1, s4-1 |
| `Ch 19` | 7 | s19-1, s19-2, s19-4, mv1-19, mv2-19, mv3-19, hv-19 |
| `s19-2` | 1 | student/s19-2 |
| **`s19-3`** | **0** | a real lesson is not findable (stale index) |
| **`고등`** | 195 | the first 20 are all **mv1** (중등) lessons, **no hv lesson shown** |
| `zzzz` | 0 | empty state |

### 4.4 Licence modal (`LicenseModal.tsx`)
- `role="dialog" aria-modal="true" aria-labelledby="license-modal-title"`. Escape closes it; Tab/Shift+Tab stay inside the dialog; focus returns to the opener (`:47-82`). The backdrop click closes it. The close button has aria-label **`닫기`** and title `닫기 (ESC)`.
- Unlicensed view (`:270-342`):
  - `<h3>` `K-IG 이용권 등록`, sub `발급받으신 코드를 등록하여 학습을 시작하세요.`
  - `label[for=license-code]` `이용권 시리얼 코드`. `input#license-code`, placeholder **`KIG-1Y-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX`**, value forced to upper case on change.
  - Hint `현재 기기: <strong>{device name}</strong>` / `1인 최대 2대 기기 지원`.
  - Submit button `이용권 코드 등록하기` (`인증 확인 중…` while submitting; disabled only while submitting, **not when empty**).
  - Feedback `role="alert"`.
  - Purchase box: `💡 아직 이용권 코드가 없으신가요?`, `공식 판매처에서 이용권을 구매한 뒤 발급받은 인증 코드를 등록해 주세요.`, then either a Link `🛒 이용권 구매하기 →` (only if `NEXT_PUBLIC_PURCHASE_URL` starts with `https://`) or the chip `구매 링크 준비 중`.
  - Footer `※ 각 코스의 1~2강은 이용권 없이도 무료로 상시 체험하실 수 있습니다.`
- Active view (`:159-267`):
  - Title `올패스 VIP 회원` / `STUDENT 전용 회원`, sub `전체 유료 레슨이 활성화되어 있습니다.` / `STUDENT 이용권이 활성화되어 챕터 1부터 순차적으로 학습할 수 있습니다.`
  - Chip `ALL-PASS ACTIVE`/`STUDENT PASS ACTIVE`, `정상 이용 중`, `planLabel` (`getPlanLabel`: 1M `1개월 체험 패스`, 1Y `1년 VIP 올패스`, LIFE `평생 소장 VIP 패스`, STU1M `STUDENT 1개월 패스`, STU1Y/STU `STUDENT 1년 패스`, STULIFE `STUDENT 평생 소장 패스`), `코드: {key}`.
  - `등록 기기: {name}`, `기기 슬롯 정상 연동`, the note (`※ 최대 2대 기기까지 자동 연동되어 학습하실 수 있습니다.` or the STUDENT variant), `등록일: {ko-KR date}`, and `만료일: {date}` or `만료일: 평생 소장`.
  - STUDENT-only plans also get an upgrade form: `label[for=license-upgrade-code]` `👑 VIP 올패스로 업그레이드`, input with the same placeholder, submit `등록` (disabled when empty) / `확인 중`.
  - Buttons **`이 기기에서 등록 해제`** (opens `confirm("현재 기기에서 이용권 등록을 해제하시겠습니까?\n(해제 시 새로운 기기를 등록할 수 있는 슬롯이 반환됩니다)")` → POST `/api/license/deactivate` → removes localStorage → reloads on lesson paths) and `확인` (closes).
  - For the LIFE audit profile, **never click `이 기기에서 등록 해제`**: it frees the owner's device slot and the licence cannot be re-entered without typing the code.
- Client-side messages (`LicenseProvider.tsx:313-382`):
  - Empty or whitespace → `이용권 코드를 입력해 주세요.` (no request).
  - Network failure → `서버 통신 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.`
  - Success → `${planLabel}이 성공적으로 등록되었습니다! (기기 등록 현황: n/m대)`.
- Server messages (`serverLicense.ts:48-92`, `deviceStorage.ts:447-490`):
  - Wrong shape (≠4 parts or not `KIG`) → `올바른 형식의 이용권 코드가 아닙니다.`
  - Bad plan → `알 수 없는 이용권 플랜입니다.`
  - Non-16-hex segment → `유효하지 않은 이용권 코드입니다.`
  - Bad HMAC → `유효하지 않거나 검증에 실패한 이용권 코드입니다. 다시 확인해 주세요.`
  - Revoked → `환불 처리되어 사용이 영구 중지된 이용권입니다. (…)`
  - Expired → `이용 기간이 끝난 이용권입니다. (첫 등록 … · 만료 …)`
  - Device limit → `이용권 등록 가능한 최대 기기 수(N대)를 초과하였습니다. 기존 기기에서 등록을 해제하신 후 다시 시도해 주세요.`
  - Format and HMAC failures return 400 **before** `registerDeviceForKey` (`activate/route.ts:29-38`), so invalid strings cannot change server data.

### 4.5 Course list `/[course]` (`[course]/page.tsx` + `CourseDashboard.tsx`)
- Back Link `← 홈으로 돌아가기` (`:131-137`). Header pills `CORE TRACK`, **`총 {listed} 개 정규 레슨`** (text `총 {n}개 정규 레슨`), `{sections}개 단계 구성`. `<h1>` = course title (`VOCA`, `GRAMMAR I`, `GRAMMAR II`, `LISTENING`, `READING`, `STUDENT`). Description from `courses.ts`.
- Script pages are **not listed**: `hasEnglishPair` (`:100-110`) drops every `-N` page with a main, and every GRAMMAR I odd page.
- Dashboard card (`CourseDashboard.tsx:266-332`):
  - `Course Progress & Analytics`, `<h2>` **`학습 진도율: {completedCount} / {total}개 완료 ({percent}%)`**.
  - For STUDENT + licence, `aria-live` sync text: `✓ 서버에 저장됨` | `진도를 서버에 저장하는 중...` | `연결 복구 후 자동 저장 예정` | `저장 실패 · 연결되면 자동으로 다시 시도합니다`.
  - Filter buttons: **`전체 ({total})`**, **`★` `북마크 ({bookmarkCount})`**, **`미완료 ({max(0,total-completedCount)})`**. The active filter gets class `bg-raised … font-semibold`. There is no aria-pressed.
  - Progress bar width `min(100,max(0,percent))%`.
- Filters (`:224-240`):
  - `bookmarked` keeps cards with `bookmarks["course:id"]`; `incomplete` keeps cards without `completed["course:id"]`. Empty sections are dropped.
  - Nothing left → `📭`. Bookmarked: `아직 북마크된 레슨이 없습니다.` + `학습 중 중요하거나 복습이 필요한 레슨에서 [☆ 북마크]를 눌러보세요.`. Incomplete: `조건에 해당하는 레슨이 없습니다.` + `모든 레슨을 완료하셨습니다! 대단합니다!`. Plus the button `전체 레슨 목록 보기` (→ all).
- Section accordion (`:383-485`):
  - `div#section-{i}`. Header `<button aria-expanded>` with `▶` + section title + `총 {n}개 레슨` + (if >0) `· {k}개 완료` + `펼치기 ▼`/`접기 ▲` (hidden below 640 px).
  - **All sections start collapsed** (`:243-249`). Open state is keyed by the label and survives filter changes.
  - STUDENT only:
    - Status line: `1·2강 무료 체험` (no access, chapter 1) | `챕터 {i} 완료 후 해금` | `✓ 챕터 완료` | `진행률 {p}% · 해금 기준 {req}강 + 마지막 강의`.
    - Pill `완료` / `학습 가능` / `🔒 잠금`.
    - A `ChapterAudioBar` under every chapter header, rendered even when collapsed (§4.10).
- Lesson card (`:28-174`, visible only when the section is open):
  - `code`, `✓ 완료` if done.
  - Lock chip `🔒` + (`이전 챕터 완료 필요` for STUDENT with access but locked | `STUDENT` | `올패스`) when locked; otherwise `무료 보기` chip when `!hasCourseAccess && isFree`.
  - Badge (`🔊 음성 듣기`, `📖 직독직해`, `🎙️ 마이크 채점`, `🎙️ 발음 채점`, `🎙️ 실전 회화`).
  - Star `<button>`: aria-label **`북마크 추가`** / **`북마크 해제`** / (locked) **`잠긴 레슨은 북마크할 수 없습니다`** with `disabled`. Title `이용권 등록 후 북마크할 수 있습니다` when locked. Text `☆`/`★`.
  - Title Link and footer Link, both `/${course}/${id}`. The footer shows `id` and the link text `학습하기 →` | `무료 보기 →` | `올패스 열람 🔒` | `수강권 열람 🔒` | `해금 조건 보기 🔒`. Locked links are still clickable and land on the paywall.
- Unlock toast (STUDENT, non-LIFE, when `unlockedThrough` increases): `role="status"` `🎉 챕터 {n}가 열렸습니다.`, auto-hides after 5 s.

### 4.6 Lesson page `/[course]/[lesson]` (unlocked)
- `nav[aria-label="강의 이동"]` (`page.tsx:264-326`):
  - Back Link **`← {COURSE TITLE} 목록`** (`/${course}`).
  - `LessonActionButtons`:
    - Bookmark: aria-label **`북마크 추가`**/**`북마크 해제`**, text `☆ 북마크`/`★ 북마크됨`.
    - Completion (not on STUDENT): aria-label **`학습 완료 체크`**/**`학습 완료 취소`**, text `완료 체크`/`✓ 학습 완료`.
  - Prev Link aria-label **`이전 강의: {prev title}`** (label `이전 강의`); next Link aria-label **`다음 강의: {next title}`** (`다음 강의`). The grid has one column when only one of them exists, and the box is absent when both are absent.
- `<h1>` = `formatLessonPresentation(...).title`.
- Top `AudioPlayer` (§4.9): on every non-CNN lesson of phonics, grammar1, grammar2, ld and reading it is in **sentence (clip-queue) mode**. STUDENT lessons have **no top player** (`page.tsx:248-250,356`).
- Per-course body (other maps).
- `LessonStepNavigation` (`LessonStepNavigation.tsx:63-89`), `nav[aria-label="학습 단계 이동"]`:
  - Button `← 이전 Step`, Link `목록으로` (`/${course}`), button `다음 Step →`.
  - It finds step buttons by scanning every `main button` whose textContent matches `/\bStep\s*(\d+)\b/i`. Both buttons are disabled when fewer than 2 steps are found; prev is disabled at step 1 and next at the max step. Clicking them clicks the matching Step button and scrolls it into view.
  - `currentStep` follows any click on a button with `Step N` in its text (capture listener).

### 4.7 Locked lesson (server paywall)
- `[course]/[lesson]/page.tsx:161-182` renders only: Link `← {COURSE TITLE}` (**no** `목록`), `<h1>` title, and `LessonPaywall`. There is no action bar, prev/next, player or step nav, so the harness marker `… 목록` is absent by design.
- `LessonPaywall` licence variant (`data-kig-paywall="license"`):
  - Pill `ALL-PASS ONLY` (`STUDENT PASS ONLY` on STUDENT).
  - `<h2>` = the lesson title passed as `title`. On `/student/*` no title is passed, so the h2 reads `본 레슨은 STUDENT 이용권 등록 후 학습하실 수 있습니다`.
  - Paragraph: `공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다.` (STUDENT: `발급받으신 이용권 인증 코드를 등록하시면 STUDENT 과정을 제한 없이 학습하실 수 있습니다.`).
  - Buttons **`🔑 이용권 코드 등록`** and **`🛒 구매 안내`** (both open the modal). Link `← {courseTitle} 전체 목록`, text `1~2강은 무료로 상시 체험 가능합니다`.
- The client re-renders the paywall text with `licenseInfo`. STUDENT-only plan on a non-STUDENT lesson → `VIP ALL-PASS REQUIRED` / `본 레슨은 VIP 올패스 전용 강좌입니다` / `현재 STUDENT 전용 패스로 접속 중입니다. {courseTitle}을(를) 포함한 전체 과정을 이용하시려면 VIP 올패스 코드를 등록해 주세요.`
- Progress variant (STUDENT, valid session, chapter not unlocked, plan ≠ LIFE; **no `data-kig-paywall`**): pill `순차 학습 잠금`, `<h2>` `챕터 {n}은 이전 챕터 완료 후 열립니다`, `현재 학습 중인 챕터의 필수 강의 80%와 마지막 강의를 완료해 주세요. 조건을 충족하면 다음 챕터가 즉시 열립니다.`, Link `현재 학습 챕터로 돌아가기` → `/student`.
- Metadata: a locked lesson has `<meta name="robots" content="noindex, follow">`; free lessons have no robots meta.

### 4.8 Tab page `/t/[tab]`
- `<h1>` tab label, blurb, and one Link to `/${course}` with `titleEn`, kind label (`<T k="tab.drills">` = `훈련`), course description and `lessonCount` (main count: 82 / 195 / 53 / 44 / 276 / 256).

### 4.9 Top AudioPlayer controls (`AudioPlayer.tsx`)
Mode: `isTtsMode = fallbackSentences.length>0 && (shouldUseUnifiedSpeech(pathname) || missing || !src)` (`:62-63`). `shouldUseUnifiedSpeech` is true for every path without `/cnn`, so the native `<audio src=/audio/<course>/<id>.mp3>` (`:205-225`) is **never rendered** on the six courses. The original recordings are not requested by the top player.

| control | selector | condition | action → expected |
|---|---|---|---|
| Play/pause | button aria-label **`재생`** ↔ **`일시정지`** (i18n `player.play/pause`) | always | idle → `playSentenceQueue(sentences,{rate,startIndex:0,gap:300})`; speaking → `togglePauseSpeech()` |
| Stop | aria-label **`정지`** | disabled unless `speech.speaking` | `stopSpeech()`; counter back to `1/N` |
| Previous | aria-label **`이전 문장`**, text `이전` | – | speaking → `previousSentence()` (queue restart at i-1); idle → start at `max(0, i-1)` |
| Next | aria-label **`다음 문장`**, text `다음` | – | speaking → `nextSentence()`; idle → start at `min(N-1, i+1)` |
| Sentence slider | `input[type=range][aria-label="문장 이동"]`, `aria-valuetext="{k}번째 문장 / 전체 {N}문장"`, opacity 0 over the segment bar | – | the value changes on input; the jump happens on pointerup, keyup or blur (speaking → `jumpToQueueIndex`, idle → start there) |
| Counter | text `{i+1}/{N}` | – | `N = fallbackSentences.length` |
| Speed | 3 buttons text `0.8×`,`1×`,`1.2×` with `aria-pressed` | label `속도` | if speaking → restart the queue at the current index with the new rate; `audio.playbackRate = clamp(rate,0.5,2)` |
| Status | text | – | `▶ 재생 버튼을 눌러 전체 듣기` (idle) / `🔊 음성 읽는 중…` / `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기` |
| Space key | window keydown, not in input/textarea/contenteditable | – | `preventDefault()` + `toggle()` |

Label `전체 듣기` is shown when there is no `src`. Expected `fallbackSentences` per lesson: §6.2.

### 4.10 STUDENT chapter bar (`ChapterAudioBar.tsx`)
- Main button aria-label: **`챕터 {n} 전체 파트 듣기`** (idle), **`챕터 {n} 전체 듣기 일시정지`** (playing), **`챕터 {n} 전체 듣기 계속 재생`** (paused), **`챕터 {n} 전체 듣기 잠김`** (locked, disabled). Also disabled while loading.
- Text: `무료 파트 연속 듣기` / `챕터 전체 파트 듣기`, plus the second line `챕터 해금 후 이용할 수 있습니다` | `재생 목록을 준비하는 중...` | `▶ 재생 중: 파트 p/P · 문장 s/S` | `1·2강 연속 재생` | `{n}개 파트 연속 재생`.
- While playing or paused: a speed group `aria-label="재생 속도"` with `0.85×`,`1×`,`1.2×`, and a stop button aria-label **`챕터 전체 듣기 정지`** (text `■ 정지`).
- Error `role="alert"`: the server `error` string, or `음성을 재생하지 못했습니다. 네트워크 연결을 확인해 주세요.`
- Data: GET `/api/student/chapter-audio?chapter=n` → `items[]`. Each item is a `sentences`-block text of every lesson in `groups[n-1]`, restricted to `s1-1,s1-2` for anonymous chapter 1. The payload is cached per page load. Only one chapter plays at a time.

### 4.11 Shared mic scorer `VoiceSpeakingTester`
- Main button text: `buttonLabel` (default `마이크로 발음 테스트`, a leading `🎙️ ` is stripped), with icon `🎙️`. While listening: `⏹️` + `듣고 있는 중... (말씀하세요)`. After a result: `{score}점 ({ratingLabel})`. Title `마이크를 누르고 영어 문장을 소리내어 말해보세요.`
- While listening a panel appears: `실시간 음성 인식:` + interim text or `지금 영어로 말씀하세요...`, and a button **`완료`**.
- After a result: button `↺ 다시 녹음` (title `다시 말하기`), and a result card with score chip `{score}점`, `ratingLabel`, `단어 일치 {matched}/{total}`, `인식된 내 음성:`, `단어별 발음 일치도:` (spans, strikethrough when unmatched) and `💡 {feedback}`.
- Unsupported browser → `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`. In-app browsers → `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` + `🌐 Safari로 열기`/`🌐 Chrome으로 열기`.
- Errors: `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.` / `마이크 접근 권한이 거부되었거나 차단되었습니다. …` / `음성 인식 오류: {code}`.

### 4.12 Admin `/admin/license` (read-only for this audit; **do not click the mutating controls**)
- Before auth: `관리자 인증 확인 중...` → PIN form: `<h1>` `관리자 보안 인증`, `input[type=password][aria-label="관리자 암호(PIN)"]` placeholder `관리자 암호(PIN) 입력`, submit `관리자 모드 접속`. The audit must not type a PIN.
- After auth:

| control | text | API | mutates? |
|---|---|---|---|
| refresh | `🔄 기기 현황 새로고침` | GET `/api/license/status` | no |
| logout | `🚪 로그아웃` | POST `/api/admin/logout` | clears the admin cookie only |
| plan category | `👑 VIP 올패스 (전체 과정)` / `🎓 STUDENT 전용` | – | no (local state) |
| plan cards | `1개월 체험 패스` etc. | – | no |
| quantity / device limit / memo | selects and input (placeholder `예: 스마트스토어 홍길동님 주문`) | – | no |
| **generate** | `⚡ {planLabel} 코드 즉시 발급하기 (기기 N대 한도)` | POST `/api/admin/generate` | **YES** (creates records) |
| copy | `📋 전체 코드 한번에 복사`, `코드 복사` | clipboard | no |
| search | `input[type=search]` placeholder `코드 일부(하이픈 없이도 됨), 메모, 기기 이름, 이용권 종류로 찾기` | – | no |
| **import legacy** | `서버로 옮기기` | POST `/api/admin/record-meta` mode import | **YES** |
| **per-row device limit** select | `1대 제한` … `5대 제한` | POST `/api/license/update-limit` (after confirm) | **YES** |
| **memo** | `메모 추가`/`메모 수정` (prompt) | POST `/api/admin/record-meta` mode memo | **YES** |
| STUDENT progress | `STUDENT 진도` | POST `/api/admin/student-progress` action get | no |
| **manual unlock** select | `챕터 1…20` under `수동 해금` | action setChapter (after confirm) | **YES** |
| **progress reset** | `진도 초기화` (2 confirms) | action reset | **YES** |
| **device reset** | `기기 초기화` | POST `/api/license/reset` | **YES** |
| **revoke** | `🚫 환불 차단` (prompt) | POST `/api/license/revoke` | **YES** |
| **unrevoke** | `↺ 차단 해제` | POST `/api/license/unrevoke` | **YES** |

### 4.13 404 / error screens
- 404 (`not-found.tsx`): `404 · Not Found`, **`<h1>` `찾는 페이지가 없습니다`**, `주소가 바뀌었거나, 링크가 오래되었거나, 주소에 오타가 있을 수 있습니다. 아래에서 과정을 다시 골라 주세요.`, Link `홈으로 가기`, then `nav[aria-label="과정 목록"]` with 7 Links to `/t/<slug>`. Title `페이지를 찾을 수 없습니다 · K-IG 핵심 어학 마스터`, robots `noindex, nofollow`. The TabBar is shown.
- Route error: `Error · 일시적인 오류`, `<h1>` `화면을 불러오지 못했습니다`, buttons `다시 시도`, `홈으로 가기`, and `오류 코드: {digest}`.
- Global error: `<h1>` `사이트를 표시할 수 없습니다`.

### 4.14 In-app browser banner (`KakaoTalkNoticeBanner.tsx`)
- Shown when the UA matches `KAKAOTALK|Line/|NAVER|Instagram|FB_IAB|FBAN|FBAV|DaumApps` and sessionStorage `kig_iab_banner_dismissed_v1` ≠ `"true"`.
- Text: `카카오톡 브라우저 접속 중` or `인앱 브라우저 접속 중`, plus a hint.
- Buttons `🌐 Safari로 열기`/`🌐 Chrome으로 열기` (sets `location.href` to `kakaotalk://web/openExternal?url=…`, or an Android `intent://…`), `📋 링크 복사` (→ `✓ 복사됨!`, title `주소 복사`), and the close button aria-label **`안내 닫기`** (title `인앱에서 계속 학습`) → writes the dismiss key.
- Android + KakaoTalk on first load: an automatic `intent://` redirect, guarded by `kig_android_auto_escape_v1`.

### 4.15 Theme and language
- **There is no UI control for either.** `setLang`, `setTheme` and `toggleTheme` have no callers (grep).
- Theme: the inline script (`layout.tsx:87`) sets `html[data-theme]` and `style.colorScheme` from localStorage `kig:theme` (`light`|`dark`), or from `prefers-color-scheme`. `LanguageProvider.tsx:50-67` repeats this after mount. Dark CSS: `[data-theme="dark"]` in `globals.css:5,69`.
- Language: localStorage `kig:lang` ∈ `ko,en,ja,zh` (`i18n.ts:5-10`); the default is `ko`. It changes only `T`/`t()` strings (player aria-labels `Play/Pause/Seek`, `Speed`, tab kind labels, and so on) and sets `html.lang` (`zh` → `zh-Hans`). Lesson content and most Korean UI copy are hard-coded and do not change.

---

## 5. Answer checking / normalisation (shared logic)

### 5.1 Search matching (`SearchDialog.tsx:13-20,98-110`)
```ts
const numeric = token.match(/^(\d+)(\D*)$/);
if (!numeric) return text.includes(token);               // substring
const number = String(parseInt(numeric[1], 10));
const pattern = new RegExp(`(?:^|\\D)0*${number}${suffix ? suffix : "(?!\\d)"}`);
```
The query is `trim().toLowerCase()`, split on whitespace, and every token must match `searchText`, which is already lower-cased. `searchText` = `id courseTitle code title subtitle badge` + fixed course keywords. For phonics these are `중등 고등 단어 어휘 단어장 보카 voca matrix`, which is why `고등` matches every phonics item (`scripts/buildSearchIndex.ts:39-55`). Up to 20 results.
To reproduce: load `public/search-index.json` in node and apply the same function (see the table in §4.3).

### 5.2 Licence key validation
- Client: `rawKey.trim().toUpperCase()`; empty → no request (`LicenseProvider.tsx:313-315,325`).
- Server `validateLicenseKey` (`serverLicense.ts:53-89`): `cleaned = trim().toUpperCase().replace(/\s+/g,"")`, then split `-` into exactly 4 parts: `KIG`, a plan ∈ {1M,1Y,LIFE,STU1M,STU1Y,STULIFE,STU}, 16 hex, and 16 hex = `HMAC-SHA256(LICENSE_SALT, plan:nonce)[0..16].toUpperCase()`.
- **The record and the token use the un-cleaned key** (`deviceStorage.ts:184-186` only trims and upper-cases). See §12 R1.

### 5.3 Pronunciation score (`speechRecognition.ts:68-221`)
- `normalizeText`: lowercase → strip `[.,?!;:"'()]` → contraction expansions (these can never match, because `'` was already stripped) → collapse spaces.
- Alignment: for each target word it looks in the next 2 spoken words (`spokenPtr..spokenPtr+2`). A match is exact, or Levenshtein = 1 for target words of length ≥ 5 (counts 0.7). The pointer only advances on a match.
- `score = round(65·wordAccuracy + 20·charSim + 15·lenRatio)`. Ratings: ≥92 `🌟 모든 단어 일치 (Excellent!)`, ≥80 `👍 대부분 일치 (Good!)`, ≥60 `💪 거의 맞았어요 (Almost!)`, else `다시 시도 (Try Again)`. An empty transcript gives `음성 감지 안 됨`, score 0.
- Results of running the real function in node (not production):

| target | transcript | score | label | `단어 일치` |
|---|---|---|---|---|
| `I'm Korean.` | `I'm Korean` | 100 | Excellent | 2/2 |
| `I'm Korean.` | `I am Korean` | **26** | Try Again | **0/2** |
| `I’m Korean.` (curly) | `I'm Korean` | 66 | Almost | 1/2 |
| `I am a student.` | `I am a student` | 100 | Excellent | 4/4 |
| `Hello there.` | `hello there general kenobi` | 81 | Good | 2/2 |
| `Hello there.` | `` | 0 | 음성 감지 안 됨 | 0/2 |

  The six courses' lesson JSON contains 256 curly apostrophes (`’`) and 1,311 straight contractions.

### 5.4 STUDENT unlock rule (server)
- `getStudentChapters` (`studentProgress.ts:254-287`): a chapter is `complete` when `completedCount ≥ ceil(0.8·n)` **and** the last lesson of the chapter is completed. `unlockedThrough = max(chain of complete chapters + 1, manual, stored)`. It never decreases (`recalculate` uses `max`, `:289-295`).
- A completion POST is accepted only for a lesson in a chapter ≤ `unlockedThrough + 1` (`:326-337`).
- Page gate `isStudentLessonUnlocked`: `s1-1`, `s1-2`, or chapter ≤ `unlockedThrough` (`:416-424`). **LIFE bypasses it** (`student/[lesson]/page.tsx:105`, `LicenseProvider.tsx:296`, `chapter-audio/route.ts:48`). STULIFE, 1M and 1Y do not bypass it.

---

## 6. Audio

### 6.1 Clip key and URL (`src/lib/unifiedSpeech.ts`)
```ts
normalizeUnifiedSpeechText = t => t.replace(/\s*\/\s*/g," ").replace(/\[[^\]]*\]/g," ").replace(/:{2,}/g," ")
  .replace(/-{2,}/g," ").replace(/[…]+/g," ").replace(/\s*\|\s*/g,", ").replace(/\(\s*\)/g," ").replace(/\s+/g," ").trim();
key = `${clean.length.toString(36)}-${hex8(fnv1a32 variant)}${hex8(second hash)}`   // :21-35
url = `/audio/azure-ava/v1/${key}.mp3`                                               // :1,37-39
```
Use the harness's `expectedClip(text)`, which loads this exact file. Examples: `Hello.` → `6-a521c1ff96269a91`; `apple / banana` → normalised `apple banana` → `c-4d6673d83842cb43`. A leading item number is **not** stripped by the key function (`1. I was poor.` → `e-428b30dad2a4f433`); callers strip it first.

### 6.2 What the top player speaks (`[course]/[lesson]/page.tsx:428-530`)
Page-level `cleanText` = strip a leading `^\s*\d+[.)]\s*` and turn `/` into a space. Priority:
1. **ld**: `ld_english_scripts[baseId].en[]`, else `hints` split on `.`/`,`.
2. **reading**: `readingSentences[].english`.
3. A `wordgrid` → every cell (phonics: 30 words, e.g. `mv1-01` starts with `do`).
4. The `sentences` block. English is chosen between main and pair when one side is Korean (`:467-479`); GRAMMAR I main `gh1-006` → 42 sentences from the pair, starting with `I am Korean.`.
5. STUDENT paragraphs (unused: STUDENT has no top player).
6. reading `instruction` split into sentences.
7. `instruction`/`hints` blocks.
8. Paragraphs.

Computed over every page (node replica): phonics 195 pages (max 30 items); grammar1 97 rendered pages (max 46); grammar2 88 (max 36); ld 552 (max 16); reading 512 (max 18). All are in clip-queue mode, none in native mode, and none has an item that normalises to empty. STUDENT: 0 top players.

### 6.3 Engine flow and when it falls back to `speechSynthesis` (`src/lib/speech.ts`)
1. `playSentenceQueue` (`:1110`) / `speakText` (`:1017`): `unlockMobileAudio()`. The first gesture of every page load plays `data:audio/wav…` on the shared element **and** `speechSynthesis.speak(" ")` at volume 0 (`:163-213`; global listeners on pointerdown, touchend and keydown, `:252-255`). Then `startAfterCancel` runs immediately when idle, or 90 ms later when busy.
2. `speakWithToken` → `playUnifiedClip` (`:755-841`), always on non-CNN paths. It uses **one shared `new Audio()` that is not in the DOM** (`:147-160`): `src = /audio/azure-ava/v1/<key>.mp3`, `playbackRate = clamp(rate,0.5,2)`, then `play()`.
   - `ended` → run finished → queue waits `gap` ms (AudioPlayer 300, ChapterAudioBar 380, default 250) → next item.
   - An **`error` event (404/403/502/decode) OR a rejected `play()` (e.g. NotAllowedError)** → `failAvaPlayback` → `startLegacyEngine` (`:966-1002`).
3. Legacy engine: `segmentByLanguage` → chunks ≤200 chars → `runCurrentChunk` (`:937-956`):
   - `useStream = !('speechSynthesis' in window) || isKakaoTalk() || isInAppBrowser() || !hasVoiceFor(lang)`.
   - `hasVoiceFor` returns **true when the voice list is empty** (`:309`).
   - **Not stream → `window.speechSynthesis.speak(utterance)`** (`:845-927`). **This is the fallback that masks a missing clip** in a normal desktop or mobile browser.
     - After a 1,500 ms watchdog, if not `speaking||pending` → `playChunkViaStream`.
     - Utterance `onerror` (not canceled/interrupted) → `playChunkViaStream`.
   - Stream → `playChunkViaStream` (`:708-752`) sets the **same clip URL** again → error → `finishRun(err)`. In a queue, `onError` **aborts the whole queue** (`:1170-1176`): the player goes idle and the counter shows `1/N`.
4. Pause: stream → `sharedAudio.pause()`. Synthesis → `speechSynthesis.pause()`, or cancel on Android and re-speak on resume (`:1240-1306`).
5. `pagehide` and `visibilitychange→hidden` call `stopSpeech()` (`:258-263`).

**How a driver tells a clip from TTS.** Use the harness AUDIO_HOOK log plus CDP `Network.responseReceived`.
- **Clip played:** `play()` with src `…/audio/azure-ava/v1/<expectedKey>.mp3` → `play-resolved` → `playing` → `ended`. The network shows 206/200 `audio/mpeg`. **No** `tts.speak` with non-blank text.
- **Clip missing, masked by TTS:** the network answers 404 (`Not found`, `Cache-Control: no-store`) or 403 (`License required`) for that URL. The hook logs `error` (err code 4) for the src, then `tts.speak` whose text equals the normalised sentence (or its ≤200-char chunks or language segments). In a headful browser the learner hears a system voice, and the UI looks normal (`🔊 음성 읽는 중…`).
- **Headless or no voices:** the same as above, and then, 1.5 s later, a second `play()` of the same URL → `error` → the queue stops early. Assert `ended` count = N and zero `tts.speak` with text.
- Ignore `tts.speak` with blank text (the primer) and `data:` srcs (the harness already filters them).
- Launch with `--autoplay-policy=no-user-gesture-required` or use trusted clicks. Otherwise a rejected `play()` looks like a missing clip, and the network then shows **no** request for the clip.
- Expected cache headers (`mediaRoute.ts:110-115`):
  - Free clip (key in `freeSpeechKeys`) or free-lesson file → `private, max-age=31536000, immutable`.
  - Licensed → `private, max-age=3600, no-transform`.
  - Always `Accept-Ranges: bytes`. A Range request → **206** with `Content-Range`. A 200 answer to a Range request is the MEDIA-02 regression.

### 6.4 Media gate expectations (`mediaAccess.ts:72-113`)

| request | anonymous | LIFE session | STUDENT-only session |
|---|---|---|---|
| `/audio/azure-ava/v1/<key in freeSpeechKeys>.mp3` | 206 | 206 | 206 |
| `/audio/azure-ava/v1/<other key>.mp3` | **403** | 206 | 206 (any course, by design `:82-85`) |
| `/audio/ld/d001.mp3`, `/audio/student/s1-1-3.mp3` (free after suffix strip) | 206 | 206 | 206 |
| `/audio/ld/d003.mp3` | 403 | 206 | 403 |
| `/audio/student/s5-1-1.mp3` | 403 | 206 | 206 |
| `/audio/adults/am01.mp3` (folder not allowed) | 403 | 403 | 403 |
| key with `..` | 404 | 404 | 404 |
| missing object | 404 `no-store` | same | same |

---

## 7. Persistence, completion & progress

### 7.1 Every storage key
| store | key | writer (file:line) | shape / meaning |
|---|---|---|---|
| localStorage | `kig:license:v1` | `LicenseProvider.tsx:75,147,187,351`; removed `:209,232,401` | `{key, plan, activatedAt(ms), expiresAt(ms\|null), token}` |
| localStorage | `kig:device:id:v1` | `src/lib/device.ts:9,24-27,61` | `dev_<7 base36>_<ts base36>` |
| localStorage | `kig:device:name:v1` | `device.ts:10,32-38` | e.g. `Windows 데스크탑 (Chrome)` (Edge UA → `Windows 데스크탑 (Edge)`) |
| sessionStorage | `kig:license-cookie:<last16 of token>` | `LicenseProvider.tsx:196-199,359-362` | `"1"`: the reload-once guard |
| localStorage | `kig:progress:completed` | `ProgressProvider.tsx:42,151,202` | `{"<course>:<id>": true}` (false entries deleted) |
| localStorage | `kig:progress:bookmarks` | `ProgressProvider.tsx:43,230` | `{"<course>:<id>": true}` |
| localStorage | `kig:progress:recent` | `ProgressProvider.tsx:44,249` | `{course, lessonId, title, courseTitle, updatedAt ISO}`. **Written on every lesson view, shown nowhere** |
| localStorage | `kig:student:pending:v1` | `ProgressProvider.tsx:45,82,106` | queued `[{lessonId?, completed?, lastLessonId?, clientUpdatedAt}]` |
| localStorage | `kig:student:migrated:<last16 of key>` | `ProgressProvider.tsx:172-182` | `"1"` after the legacy STUDENT completion import |
| localStorage | `kig:theme` | `LanguageProvider.tsx:24,91,103`; read `layout.tsx:87` | `light`\|`dark` |
| localStorage | `kig:lang` | `LanguageProvider.tsx:42,78` | `ko`\|`en`\|`ja`\|`zh` |
| sessionStorage | `kig_iab_banner_dismissed_v1` | `KakaoTalkNoticeBanner.tsx:6,96` | `"true"` |
| sessionStorage | `kig_android_auto_escape_v1` | `KakaoTalkNoticeBanner.tsx:7,39` | `"true"` |
| localStorage | `kig:admin:history` | admin page `:23,80,258` (read and remove only) | legacy issued-code list |
| per-course localStorage (other maps) | `kig:voca:leitner:<course>/<id>`, `kig:voca:speed_high:…`, `kig:grammar:work:…`, `kig:ld:mastery:…`, `kig:reading:wpm:…`, `kig:reading:notes:…`, `kig:student:practice:…`, `kig:dialogue:work:…`, `kig:work:…` | | |
| cookie (httpOnly) | `kig_license_session` | `/api/license/activate`, `/verify` set it; `/deactivate` clears it | signed token; maxAge = until expiry, or 365 d |
| cookie (httpOnly) | `kig_device` | activate, verify | device id, 400 d |
| cookie (httpOnly) | `kig_admin_session` | admin login | 24 h |

### 7.2 Completion and bookmark
- `toggleComplete(course,id)` (`ProgressProvider.tsx:196-215`) flips `completed["course:id"]`. For STUDENT with a licence it also queues a server update (650 ms debounce → POST `/api/progress/student {updates:[…]}`). The lesson page shows the button for every course except STUDENT, whose completion lives in `StudentLearningView` (student map).
- `toggleBookmark` (`:224-236`) is localStorage only and never reaches the server.
- `recordRecent` runs on mount of every lesson page (`LessonActionButtons.tsx:23-25`). For **STUDENT with a licence it POSTs `lastLessonId` to the server**, so merely opening a STUDENT lesson with the audit licence is a server data change. Log it (`logDataChange`).
- When the server STUDENT progress arrives, `completed` drops **all** `student:*` keys and replaces them with the server set (`:140-158`).

### 7.3 Dashboard numbers — how to compute the expectation
Let `C = JSON.parse(localStorage["kig:progress:completed"])` and `B` = bookmarks.
- `completedCount = Object.keys(C).filter(k => k.startsWith(course+":") && C[k]).length`. This counts **any** id with that prefix, including script pages `ld:d001-1` and ids not listed.
- `total = listed.length` (table §2). `percent = round(completedCount/total·100)`. `미완료 = max(0,total−completedCount)`. `bookmarkCount` is computed like `completedCount`.
- The section line `· k개 완료` counts only listed lessons in that section.
- STUDENT, licensed: the chapter pill and percent come from GET `/api/progress/student` → `progress.chapters[n-1].{percent, requiredCount, complete}`.

---

## 8. Locking / entitlement

### 8.1 Server (authoritative)
- `[course]/[lesson]/page.tsx:148-159`: free by id (`isFreePreviewLesson` with suffix stripping, `license.ts:106-125`), or a cookie session verified by `verifyLicenseSessionToken` (`licenseSession.ts:50-70`). The session is verified by: HMAC signature (`LICENSE_SECRET`), the record exists and is not revoked, the token's deviceId is still in `record.devices`, and the fixed expiry (`effectiveLicenseExpiry`) has not passed.
  STUDENT-only plans (`STU*`) → STUDENT only; others → everything.
- `/student/[lesson]`: free `s1-1/s1-2`; LIFE → all; any other valid session → `isStudentLessonUnlocked`; otherwise the paywall (progress variant when a session exists).
- Media: §6.4. Chapter audio: anonymous chapter 1 only (free lessons); non-LIFE requires `chapter ≤ unlockedThrough` (403 `이전 챕터를 완료하면 전체 듣기가 열립니다.`); anonymous chapter > 1 → 401 `이 챕터는 이용권 등록 후 들을 수 있습니다.`

### 8.2 Client (`LicenseProvider.tsx`)
Mount sequence (`:112-239`):
1. `localStorage["kig:license:v1"]` **absent** → GET `/api/license/session`. `valid` → restore `{key,plan,activatedAt,expiresAt,token}` to localStorage. The device cookie can re-adopt the device id.
2. **Present with token** → POST `/api/license/verify {key, deviceId, token}`:
   - 200 `valid` → `setStored`; fix `expiresAt` from the server. **Reload once** if the page contains `[data-kig-paywall="license"]` on a path matching `^/(ld|reading|phonics|grammar1|grammar2|cnn|student)/[^/]+$` and the plan covers the course, guarded by sessionStorage `kig:license-cookie:<last16>`.
   - 400/403 → **localStorage licence removed** (message in console `Server rejected license:`).
   - 5xx / bad body / network → locked for this page, localStorage kept.
3. Present without token → removed.

Until verify resolves, `hasActiveLicense` is **false**. The header shows `이용권 등록` and the dashboard shows locks. Drivers must wait for the `/api/license/verify` response (200) before asserting licensed UI.

`isUnlocked(course,id,sec?,idx?)` (`:279-308`):
- Free rule first (positional when indices are given).
- Otherwise it needs `hasActiveLicense`.
- STUDENT: LIFE → true, else chapter ≤ `studentProgress.unlockedThrough || 1`.
- STUDENT-only plan → only `student`.
- Otherwise true.

With the **LIFE** audit profile every lesson is unlocked everywhere, so the lock chips, progress paywall, unlock toast and STUDENT-only views cannot be seen. Use a **fresh anonymous profile** for paywall and free-preview checks.

---

## 9. Navigation & boundaries

### 9.1 Prev/next source (`src/lib/content.ts:124-163`)
- Main page: `list = index.lessons.filter(variant==="main")` in **index order** (the same as the section order for all six courses; 0 mismatches computed).
- Script page (`-1`, `-2`): `list = index.lessons` (mains and scripts interleaved in index order).
- `prev = list[i-1]`, `next = list[i+1]`.

| page | expected prev | expected next |
|---|---|---|
| `/phonics/mv1-01` | none (box has 1 column) | `mv1-02` |
| `/phonics/mv1-40` | `mv1-39` | `mv2-01` (crosses series) |
| `/phonics/hv-75` | `hv-74` | none |
| `/grammar1/gh1-006` | none | `gh1-008` |
| `/grammar1/gh1-016` | `gh1-014` | `gh1-020` |
| `/grammar1/gh1-122` | `gh1-120` | none |
| `/grammar1/gh1-006-1` (script) | `gh1-006` | `gh1-006-2` |
| `/grammar1/gh1-016-1` (script, last in index) | `gh1-123-2` → which redirects to `gh1-122-2` | **none** |
| `/grammar1/gh1-007` | 307 → `/grammar1/gh1-006` | |
| `/grammar2/gh2-007` | none | `gh2-008` |
| `/grammar2/gh2-007-1` | `gh2-007` | `gh2-008` |
| `/grammar2/gh2-050` | `gh2-049` | none |
| `/ld/d001` | none | `d002` |
| `/ld/d001-1` | `d001` | `d002` |
| `/ld/d276` | `d275` | none |
| `/ld/d276-1` | `d276` | none |
| `/reading/pr001` | none | `pr002`; `/reading/pr256` next none |
| `/student/s1-1` | none | `/student/s1-2` |
| `/student/s1-6` | `s1-5` | `/student/s2-1` (crosses chapter; non-LIFE plans land on the progress paywall) |
| `/student/s20-5` | `s20-4` | none |

Titles in the aria-labels are `formatLessonPresentation(prev|next).title`. `d001` and `d001-1` have the same title (`001회 · 실전 듣기 평가`).

Script pages are **not linked from any page**: not the course list, not a main page's prev/next, not search. They are reachable by URL only.

### 9.2 404 behaviour (`src/proxy.ts:117-152`)
Paths with 1–2 segments must be in `validRoutes`, otherwise they are rewritten to the server-rendered 404. Expected:

| request | expected |
|---|---|
| `/ld`, `/student`, `/t/ld`, `/admin/license`, `/robots.txt`, `/sitemap.xml`, `/search-index.json`, `/icon.svg`, `/favicon.ico` | 200 |
| `/ld/d001`, `/student/s19-3` | 200 (paywall or lesson) |
| `/grammar1/gh1-007`, `/grammar1/gh1-009-2` | 307 → `gh1-006`, `gh1-008-2` |
| `/LD`, `/Ld/d001`, `/x`, `/t`, `/t/x`, `/admin`, `/ld/d277`, `/ld/d001-2`, `/student/s21-1`, `/ld/LD_001`, `/phonics/mv4-01` | **404** with h1 `찾는 페이지가 없습니다` in the server HTML (text length > 0 without JS) |
| `/index.html`, `/.env`, `/ld/d001.html` | 404 (second matcher) |
| `/a/b/c` | 404 (router) |
| `/api/nope`, `/API/x` | Next 404, CSP `script-src 'none'`, no nonce policy |
| `/cnn`, `/cnn/cnn001` | 200 (retired but still routed; out of scope) |

### 9.3 Sitemap, robots, metadata
- `robots.txt`: `User-agent: *`, `Allow: /`, `Disallow: /admin/`, `Disallow: /api/`, `Sitemap: https://k-ig-core.vercel.app/sitemap.xml`, `Host: …`.
- `sitemap.xml`: 29 `<url>` (§2).
- Canonicals:
  - Home `/`, course `/${course}`, tab `/t/${tab}`.
  - Lesson `/${course}/${canonicalLessonId}`: a script page points to its main page, e.g. `/ld/d001-1` → `/ld/d001` (`content.ts:175-181`).
  - STUDENT `/student/${id}`.
- OG image per course: `/images/og/{voca,grammar1,grammar2,ld,reading,students}.jpg`, 1000×525. OG type `article` for lessons and `website` otherwise. `locale ko_KR`.
- `<meta name="google" content="notranslate">`, `html translate="no"`.

### 9.4 Security headers and CSP (`next.config.ts:99-131`, `src/lib/csp.ts`, `proxy.ts:179-196`)
- Every response: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`. No `x-powered-by`.
- Pages: `content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-<24 base64>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'`. The nonce differs on every request. The `<script id="kig-theme">` carries a `nonce` attribute. There must be exactly **one** CSP header.
- Non-page paths (`/_next/*`, `/api/*`, `/audio/*`, `/video/*`, `/images/*`, `/.well-known/*`, root files): the same policy with `script-src 'none'`. `/images/*` also has `Cache-Control: public, max-age=31536000, immutable`.
- **Analytics and trackers: none.** No third-party script, no analytics package in `package.json`; `connect-src 'self'` would block one anyway. Expect zero requests to any other origin.

### 9.5 API routes

| route | method | auth | side effects |
|---|---|---|---|
| `/api/license/activate` | POST `{key, deviceId, deviceName}` | none | validates; **registers the device in the record** (sets `firstActivatedAt`, pushes the device or updates `lastSeenAt`); sets `kig_license_session` and `kig_device` cookies; returns `{success, plan, activatedAt, expiresAt, licenseToken, registeredDevicesCount, maxDevices}` |
| `/api/license/verify` | POST `{key, deviceId, token}` | token | none on the record; **re-sets both cookies**; 400 missing fields; 403 tampered / revoked / device not registered (`해당 기기의 이용권 등록이 관리자에 의해 초기화되었거나 해제되었습니다.`) / expired (`이용 기간이 만료되었습니다.`) |
| `/api/license/session` | GET | cookies | none; returns `{valid:false, deviceId?}` or `{valid:true, key, plan, deviceId, expiresAt, activatedAt, token}` (`no-store`) |
| `/api/license/deactivate` | POST `{key, deviceId, token}` | token signed for key+device (cookie or body) | **removes the device from the record**; clears the session cookie; 403 `이 기기에서 등록한 이용권만 해제할 수 있습니다.` |
| `/api/license/status` | GET, POST | admin | none (returns all records) |
| `/api/license/reset` | POST `{key}` | admin | **clears devices** |
| `/api/license/revoke` | POST `{key, reason}` | admin | **revokes and clears devices** (creates a record for an unknown key) |
| `/api/license/unrevoke` | POST `{key}` | admin | **un-revokes** |
| `/api/license/update-limit` | POST `{key, maxDevices, plan?}` | admin | **sets maxDevices** (creates a record for an unknown key) |
| `/api/admin/login` | POST `{pin}` | none; 5 failures per IP → 5 min block (in memory, per instance) | sets `kig_admin_session` (24 h) |
| `/api/admin/logout` | POST | none | clears the admin cookie |
| `/api/admin/check` | GET, POST | none | none (`{authenticated}`) |
| `/api/admin/generate` | POST `{plan, quantity≤100, maxDevices≤10, memo}` | admin | **creates records** |
| `/api/admin/record-meta` | POST `{mode:"memo",key,memo}` or `{mode:"import",items}` | admin | **updates memo / createdAt** |
| `/api/admin/student-progress` | POST `{key, action: get\|reset\|setChapter\|setLesson, chapter?, lessonId?, completed?}` | admin | get: none; others **mutate progress** (`setLesson` has no UI) |
| `/api/progress/student` | GET / POST `{updates:[…]}` or `{legacyCompletedLessonIds}` | licence cookie | POST **writes progress**; 120 writes/min per deviceId per instance (429) |
| `/api/student/chapter-audio?chapter=1..20` | GET | optional cookie | none (`private, no-store`) |
| `/api/media-health` | GET | optional admin | at most one R2 probe per minute per instance; anonymous gets `{ok}` |
| `/audio/[...path]`, `/video/[...path]` | GET, HEAD | optional cookie | none |

---

## 10. CDP driver recipe — common features, exhaustive

Rules from `README.md`: read-only audit; no licence code, PIN or password typing; **log every data change** (`logDataChange`); LIFE audit profile clones.
Use two browsers: **L** = licensed clone (`startBrowser('common-lic', port)`) and **A** = a fresh anonymous profile (`--user-data-dir` empty; not a clone).
On every tab: AUDIO_HOOK (harness), plus `Network.enable` to record the status, `cache-control`, `content-range` and `content-security-policy` of every response, plus `Runtime.consoleAPICalled`, `Runtime.exceptionThrown` and `Log.entryAdded` (a CSP violation shows there). Also handle `Page.javascriptDialogOpening`: **dismiss** (`accept:false`) every confirm or prompt, except where a step below says otherwise.

### 10.0 Pre-computation (node, before the run)
1. Load `content/courses/*.json`, `validRoutes.json`, `search-index.json` and `freeSpeechKeys.json`.
2. For every lesson compute: listed flag, section index and title, presentation (via `loadTs('src/lib/curriculumPresentation.ts')`), prev/next ids (§9.1 rule), canonical id, redirect flag, free flag.
3. Compute the top-player sentence list with the §6.2 rules. Replicate `extractSentencesForAudio`, or save the output of my replica script (scratchpad `top.cjs`, logic copied in this map) as `out/top-sentences.json`. Then compute the expected clip path per sentence with `expectedClip`.

### 10.1 Global pages (A and L, each at desktop 1366, tablet 768, mobile 390)
1. **Home `/`**
   - Assert no `header` TabBar (no element with aria-label `검색 (Cmd+K)`), `h1 === "K-IG 교육"`, 7 `section`s.
   - The stage pills read `STAGE 01`…`STAGE 07`. Each h2 link href is `/student /phonics /grammar1 /grammar2 /ld /reading /cnn`.
   - Click each dot `Scroll to section 0k (…)` and assert the scroll container `scrollTop ≈ (k-1)·clientHeight` after 700 ms.
   - Click `다음 코스로 이동` on stage 1 and assert stage 2. Press ArrowDown and assert +1; ArrowUp and assert −1.
   - Click `학습 시작하기` on stage 5 and assert the URL `/ld`.
   - Screenshot the dark theme: set `Emulation.setEmulatedMedia({features:[{name:"prefers-color-scheme",value:"dark"}]})`, reload, assert `html[data-theme="dark"]`. Then set localStorage `kig:theme="light"`, reload, and assert `light` even with dark emulation.
2. **Header (on `/ld`)**
   - At 1366: `nav[aria-label=Courses]` is visible with 7 links, and the `LISTENING` link has `aria-current="page"`. The hamburger is hidden.
   - At 768/390: the nav is hidden. Click `메뉴 열기`. Assert the drawer with `전체 커리큘럼 메뉴`, `body.style.overflow === "hidden"`, 7 links, and `학습중 ●` next to LISTENING. Click `닫기` → closed.
   - Reopen, click the backdrop → closed. Reopen, click the `READING` link → URL `/reading` and the drawer closed. Reopen, click `🏠 홈(대시보드)으로 이동` → `/`.
   - Reopen on L and click the footer licence button → the modal opens (text `👑 VIP 올패스 회원 (확인)` expected for LIFE).
   - Logo link → `/`.
3. **Search** (on `/ld`)
   - Press Ctrl+K → `div[role=dialog]` and the input focused (placeholder as §4.3). The empty query lists 10 rows (s1-1…s2-4).
   - For every query in the §4.3 table: type it, wait 100 ms, then assert the row count = `min(total,20)` and the order of the first rows (code and title text).
     - On A, rows other than the free ids show `🔒`. On L, no row shows `🔒`.
   - ArrowDown ×2 → the third row has class `bg-primary`. Enter → URL of that item.
   - Reopen with `/` (focus on body) and close with Escape. Reopen, type `zzzz` → `검색 결과가 없습니다.` and `'zzzz'에 해당하는 학습 과정을 찾을 수 없습니다.`.
   - The clear button `✕` (title `검색어 지우기`) empties the input. `창 닫기` closes. Clicking the backdrop closes.
   - **Negative:** `s19-3` → 0 rows. This is a defect: the page `/student/s19-3` exists.
4. **Licence modal** (on `/ld/d003`)
   - A: the page shows the paywall (h2 = `003회 · 실전 듣기 평가`, pill `ALL-PASS ONLY`, `[data-kig-paywall=license]`). There is no `LISTENING 목록` and no `이전 강의`/`다음 강의`.
   - A: click `🔑 이용권 코드 등록` → dialog `aria-labelledby=license-modal-title` with h3 `K-IG 이용권 등록`, input `#license-code` focused, `구매 링크 준비 중` or `🛒 이용권 구매하기` (record which one).
   - A: Tab cycling stays inside the dialog. Escape closes and focus returns to the opener. `🛒 구매 안내` opens the same modal.
   - A, **incorrect inputs** (these never reach device registration; still ask the owner once, because they type into the licence field):
     - Empty submit → alert `이용권 코드를 입력해 주세요.` and no network request.
     - `abc` → POST 400, alert `올바른 형식의 이용권 코드가 아닙니다.`, and the input shows `ABC` (upper-cased).
     - `KIG-9Z-0000000000000000-0000000000000000` → `알 수 없는 이용권 플랜입니다.`
     - `KIG-1Y-XYZ-123` → `유효하지 않은 이용권 코드입니다.`
     - `KIG-1Y-0000000000000000-0000000000000000` → `유효하지 않거나 검증에 실패한 이용권 코드입니다. 다시 확인해 주세요.`
     - After each: localStorage has no `kig:license:v1` and no `kig_license_session` cookie.
   - **Correct input: forbidden** (owner rule). The success path is covered by L being already active.
   - L: click `VIP 올패스ACTIVE` → h3 `올패스 VIP 회원`, `ALL-PASS ACTIVE`, `정상 이용 중`, `평생 소장 VIP 패스`, `만료일: 평생 소장`, a `코드: KIG-LIFE-…` prefix (do not record the full key), `등록 기기:`. Click `확인` → closed.
   - **Do not click `이 기기에서 등록 해제`.**
5. **Licence lifecycle on L** (observe only)
   - First load of any page → exactly one POST `/api/license/verify` → 200 `{valid:true, plan:"LIFE", expiresAt:null}`, then a `set-cookie` for `kig_license_session`.
   - Until then, the header shows `이용권 등록`. Assert it flips to `VIP 올패스` within 5 s.
   - Remove the cookie only (`Network.deleteCookies name=kig_license_session`), then load `/ld/d003`. The server renders the paywall, verify sets the cookie, and the page reloads **exactly once**: the harness `load().reloads === 1`, and sessionStorage has `kig:license-cookie:*`. The page then shows `LISTENING 목록`.
   - Load again in the same tab without deleting the cookie → `reloads === 0`.
6. **404 and headers**
   - Fetch every path in §9.2 with `fetch(url,{redirect:"manual"})` from the page context, and separately with node `https` (no JS): assert status, and that the server HTML contains `찾는 페이지가 없습니다`.
   - Navigate to `/ld/d999` and assert h1 `찾는 페이지가 없습니다`, the 7 `/t/*` links, and `document.title` starting `페이지를 찾을 수 없습니다`. **Note: harness `SNAPSHOT.notFound` tests the h1 for `/페이지를 찾을 수 없|404/`, which does not match this h1; use the rule above.**
   - For `/`, `/ld`, `/ld/d001`: one CSP header, containing `'nonce-`. The nonce differs between two requests and equals the `nonce` attribute of `script#kig-theme`. Zero `securitypolicyviolation` events: add a listener via addScriptToEvaluateOnNewDocument, then click the page **heading** first (the primer case in `next.config.ts:38-62`).
   - `/api/license/session`: `script-src 'none'`, `cache-control: no-store`.
   - `/robots.txt` text, and `/sitemap.xml` with 29 `<loc>` exactly as listed in §2.
   - Metadata per sample lesson: `link[rel=canonical]` (script page → main page), `meta[name=robots]` absent on free and `noindex, follow` on paid, `og:image`.
7. **Tab pages**: for each of the 7 slugs, h1 = label, one link `/${course}`, the lesson count as in §4.8, and the kind label `훈련`.
8. **Language**: set `localStorage.kig:lang="en"`, reload `/ld/d001`. Assert the play button aria-label `Play`, the speed label `Speed` and `html.lang==="en"`. Reset to `ko`. Also try `ja` (`再生`) and `zh` (`播放`).
9. **In-app banner** (A only): `Emulation.setUserAgentOverride` with an **iOS** KakaoTalk UA (`… iPhone … KAKAOTALK 10.0.0`), so the Android auto-intent is not triggered.
   - Assert `카카오톡 브라우저 접속 중` and `Safari로 열기`. Click `안내 닫기` → the banner is gone and sessionStorage has `kig_iab_banner_dismissed_v1="true"`. Reload → still gone.
   - Do not click `Safari로 열기` (it navigates to `kakaotalk://`).
   - Mic components on that UA show `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` (only where `webkitSpeechRecognition` is missing; Edge has it, so it may not appear).

### 10.2 Course list page (repeat for all 6 courses, A and L)
1. Load `/${course}`. Assert h1 = course title, `총 {listed}개 정규 레슨`, `{sections}개 단계 구성`, and the description.
2. Assert `학습 진도율: {completedCount} / {listed}개 완료 ({percent}%)` with values computed from localStorage (§7.3). Assert the buttons `전체 ({listed})`, `북마크 ({bookmarkCount})`, `미완료 ({max(0,listed-completedCount)})`.
3. Every section header button has `aria-expanded="false"` and no cards are rendered. The header text includes the §2 section title and `총 {n}개 레슨`. Click each header → `aria-expanded="true"` and card count = n. Then check, for each card:
   - `code`, title and subtitle = presentation; footer id; both links `/${course}/${id}`.
   - A: the free cards (section 0, idx 0–1) show `무료 보기` + footer `무료 보기`. The others show `🔒 올패스` (`🔒 STUDENT` on student), a footer `올패스 열람`/`수강권 열람`, and a star `disabled` with aria-label `잠긴 레슨은 북마크할 수 없습니다`.
   - L: no lock chip, footer `학습하기`, star enabled.
4. **Bookmark** (L; logs a local data change only):
   - Click the star (`북마크 추가`) on card 1 → aria-label `북마크 해제`, text `★`, button `북마크 (b+1)`, and localStorage `kig:progress:bookmarks["course:id"]===true`.
   - Filter `북마크` → exactly the bookmarked listed cards. Remove it → the empty state `아직 북마크된 레슨이 없습니다.` (if none left), then `전체 레슨 목록 보기` → all.
   - **Incorrect path:** on A, click a disabled star → no change.
5. **Completion via lesson page** (L, non-STUDENT): open lesson k, click `학습 완료 체크` → aria-label `학습 완료 취소`, text `학습 완료`, and localStorage `completed["course:id"]`. Back to the list → `✓ 완료` on the card, `· 1개 완료` on the section, and the header numbers +1. Filter `미완료` → that card gone.
   - **Boundary test (defect probe):** open the script page `/ld/d001-1` and click `학습 완료 체크` → the list header counts 2 of 276 while only 1 card shows `✓ 완료`. Undo both afterwards.
6. STUDENT only (L = LIFE):
   - Every chapter pill `학습 가능` or `완료`; the status line `진행률 {p}% · 해금 기준 {req}강 + 마지막 강의` with p and req from GET `/api/progress/student`; the sync text `✓ 서버에 저장됨`.
   - Chapter bar: click `챕터 1 전체 파트 듣기` → GET `/api/student/chapter-audio?chapter=1` 200. Items = all sentences of `s1-1…s1-6`. The aria-label becomes `챕터 1 전체 듣기 일시정지`, and the text `▶ 재생 중: 파트 1/6 · 문장 1/{n}`. The hook shows `play()` of `expectedClip(items[0].text)`.
   - Click again → `계속 재생` and `일시정지`. Click again → playing. Click `0.85×` → the queue restarts at the current index with `playbackRate 0.85`. Click `챕터 전체 듣기 정지` → idle.
   - Start chapter 2 while chapter 1 plays → chapter 1 goes idle.
   - A: only chapter 1 is enabled (`무료 파트 연속 듣기`, `1·2강 연속 재생`), items = `s1-1`+`s1-2` sentences only. Chapter 2's button is disabled with aria-label `챕터 2 전체 듣기 잠김` and text `챕터 해금 후 이용할 수 있습니다`. Calling `fetch('/api/student/chapter-audio?chapter=2')` directly → 401.

### 10.3 One lesson, exhaustive (repeat per lesson; shown for `/ld/d001`, L)
1. `load('/ld/d001', {marker:'LISTENING 목록'})`.
   - Assert `nav[aria-label="강의 이동"]`, back link href `/ld`, h1 `001회 · 실전 듣기 평가`, `document.title`, canonical `/ld/d001`.
   - Prev link absent; next link aria-label `다음 강의: 002회 · 실전 듣기 평가` with href `/ld/d002`.
   - localStorage `kig:progress:recent.lessonId==="d001"`.
2. **Bookmark:**
   - Click `북마크 추가` → `북마크 해제`/`북마크됨`, localStorage updated. Reload → still bookmarked. Click again → removed.
   - **Space-key probe:** focus the bookmark button with `el.focus()` and dispatch a trusted Space key. Expected by design: the bookmark toggles. Predicted by the code: the top audio starts and the bookmark does not toggle (§12 R7).
3. **Completion:** as in §10.2 step 5, then undo.
4. **Top player** (sentences `S[0..N-1]` from pre-computation; `d001`: N=6):
   - Idle: aria-label `재생`, counter `1/6`, status `▶ 재생 버튼을 눌러 전체 듣기`, `정지` disabled.
   - Click `재생` → the hook shows `play()` src = `expectedClip(S[0])`, then `playing`; status `🔊 음성 읽는 중…`; aria-label `일시정지`; `정지` enabled.
   - Wait for `ended` → after ≈300 ms `play()` of S[1], counter `2/6`, `input[aria-label="문장 이동"]` `aria-valuetext` `2번째 문장 / 전체 6문장`.
   - Click `일시정지` → the `pause` event, status `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기`, aria-label `재생`. Click again → `playing` (same src, `currentTime` continues).
   - Click `다음 문장` → the next `play()` is S[i+1] (≈90 ms restart). Click `이전 문장` → S[i].
   - Click `1.2×` → `aria-pressed=true`, the queue restarts at the current index with `playbackRate 1.2`. `0.8×` likewise.
   - Focus the range, press ArrowRight (key down + up) → a jump to index+1 with `play()` of that sentence.
   - Click `정지` → the `pause` event, the shared element `src` removed, counter `1/6`, status idle.
   - Let the whole queue finish → exactly N `ended` events, N distinct expected srcs in order, **0 `tts.speak` with non-blank text**, and every clip response 206 with `private, max-age=…`. The final state is idle.
   - **Negative / fallback probe** (verifies §6.3 detection): in a throwaway tab, `Fetch.enable` with a pattern `*/audio/azure-ava/v1/<key of S[0]>.mp3` and `Fetch.failRequest` (or fulfil 404). Click `재생`.
     - Expect `error` for that src, then `tts.speak` with text `S[0]`.
     - Headless with no voices: after ~1.5 s a second `play()` of the same src and `error`, then idle with counter `1/6` (queue aborted).
     - Headful: TTS speaks and the queue continues to S[1].
     - Record which one happens: this is the evidence of how a missing clip looks on this machine.
5. **Step navigation:**
   - Count buttons whose text matches `/\bStep\s*\d+/`. If ≥ 2: `← 이전 Step` is disabled. Click `다음 Step →` → the Step 2 button was clicked (the course view changes; see the course map) and prev is enabled. At the max step, next is disabled. `목록으로` → `/ld`.
   - If < 2: both are disabled.
6. **Next lesson:** click `다음 강의` → URL `/ld/d002`, scroll top 0 (NavigationScrollRestoration), the step nav reset (`← 이전 Step` disabled), and `speech` idle (no `play()` from the previous page continues).
7. **Keyboard:** press Ctrl+K on the lesson page → search opens. Escape → closed. Press Space with focus on `body` → the top player toggles (by design).
8. **Paywall view on A:** load `/ld/d003` → §10.1 step 4 assertions. Also `fetch('/audio/ld/d003.mp3',{headers:{Range:'bytes=0-1'}})` → 403. `fetch(expectedClip(S_d003[0]))` → 403. `/audio/ld/d001.mp3` Range → 206 with `content-range: bytes 0-1/…` and `private, max-age=31536000, immutable`.
9. **Console:** zero exceptions and zero CSP violations. Allowed: `License verification …` warnings only on A (A has none, because it holds no licence).

### 10.4 Data-change log for this map's drivers
Record in `out/data-changes.jsonl` with `logDataChange`:
- Every bookmark or completion toggle (localStorage of the clone).
- Every STUDENT lesson page view on L (server `lastLessonId` via POST `/api/progress/student`).
- Every STUDENT completion toggle (server).

Admin controls marked **YES** in §4.12 are never clicked.

---

## 11. Features that cannot be automated (and why)

- **Real audible output.** Headless Edge has no audio device, so we can only prove `playing`/`ended` events and byte ranges. The system TTS voice list differs per machine, so the TTS-masking symptom (§6.3) looks different headless than on a phone. Owner check (1 minute): on an iPhone, open `/ld/d001`, press ▶, and confirm a natural female voice (Ava) reads 6 sentences. A robotic system voice means a clip is missing.
- **Microphone scoring (VoiceSpeakingTester).** `webkitSpeechRecognition` sends audio to Google's service and needs a real mic permission prompt. `--use-fake-device-for-media-stream` feeds a tone, not speech, and recognition does not run headless. Only `evaluatePronunciation` can be tested, in node (§5.3).
- **Licence activation success, deactivation, device-limit and revoke paths.** These need a real code, and typing codes is forbidden by the owner rule. Deactivating would free the owner's slot. Admin actions need a PIN and mutate customer data.
- **STUDENT sequential lock, unlock toast, progress paywall and STUDENT-only plan views.** The audit licence is LIFE, which bypasses all of them. They need a non-LIFE test licence (owner decision).
- **Safari/ITP 7-day storage purge and the `/api/license/session` restore.** This can only be simulated by deleting localStorage while keeping cookies; real ITP behaviour needs an iPhone.
- **KakaoTalk / Android intent escape.** It navigates to `intent://` / `kakaotalk://` schemes that only exist in the real apps.
- **iOS gesture-unlock quirks** (`unlockMobileAudio`, silent-primer volume handling): these need a real iOS WebKit.
- **Clipboard copy** (banner `링크 복사`, admin copy): headless needs a permission grant. It is possible with `Browser.grantPermissions`, but it differs from a real device.
- **Wheel scroll feel on the home page and touch snap physics**: synthetic wheel events are possible, but snap behaviour is visual.

---

## 12. Suspicious code (possible defects) — ALL UNVERIFIED on production

Severity is my estimate. "Node-verified" means I ran the repo's own function in node, not the live site.

- **R1 (HIGH, security): whitespace inside a licence key creates a separate licence record**, which would bypass revocation, the device limit and the fixed paid period.
  `validateLicenseKey` strips all whitespace before the HMAC check (`src/lib/serverLicense.ts:53`), but `/api/license/activate` passes the raw key to `registerDeviceForKey` (`src/app/api/license/activate/route.ts:41-46`) and `issueLicenseToken`. `normalizeKey` only trims and upper-cases (`src/lib/deviceStorage.ts:184-191`).
  So `KIG-1Y-AAAA BBBB…-…` (a space inside the nonce) passes validation, but it is hashed to a **different record**: new `firstActivatedAt`, empty device list, not revoked. The token carries the spaced key, and `verifyLicenseSessionToken` loads that spaced record (`licenseSession.ts:57`).
  The client keeps inner spaces (`LicenseProvider.tsx:325`: trim + upper only). STUDENT progress is keyed the same way (`studentProgress.ts:60-67`).
  Test only locally with test secrets, never with a real code on production.
- **R2 (MED): pronunciation contraction handling is dead code.** Apostrophes are removed before the `i'm → i am` rules run (`src/lib/speechRecognition.ts:71-89`). Node-verified: target `I'm Korean.`, spoken `I am Korean` → 26 points, `0/2`. Curly apostrophes (`’`, 256 in lesson JSON) are never stripped, so `I’m` can never match (66 points).
  The look-ahead window does not advance on a miss (`:153-170`), so one extra spoken word can cascade into misses.
  `totalWords` uses the original word count while `matchedCount` uses the normalised words (`:140,218-219`), so `단어 일치 k/n` can disagree with the highlighted words.
- **R3 (MED): search index is stale.** `s19-3` is absent (0 results for `s19-3`); `scripts/buildSearchIndex.ts` is not in `prebuild` (`package.json`). Nothing fails when content changes.
- **R4 (MED): search `고등` never shows an HV lesson.** Every phonics item carries the keyword list `중등 고등 …` (`scripts/buildSearchIndex.ts`, phonics line), so `고등` matches all 195 items, and the first 20 are mv1 (node-verified). The placeholder and the no-result hint both suggest `고등`.
- **R5 (MED): course progress counts ids that are not listed.** `completedCount` and `bookmarkCount` count every `course:*` key (`src/components/CourseDashboard.tsx:213-219`), including script pages (`ld:d001-1`), where `LessonActionButtons` still shows `완료 체크` (`[course]/[lesson]/page.tsx:273-278`). So `학습 진도율` can exceed the number of ✓ cards, `percent` can pass 100 (the text is not clamped, `:221,274`), and `미완료 (n)` disagrees with the filtered list (`:320` vs `:233-235`).
- **R6 (MED): admin "수동 해금" cannot lower a chapter**, although the confirm dialog says chapters will re-lock (`src/app/admin/license/page.tsx:385-388`). `setManualStudentChapter` sets `unlockedThrough = max(old, manual)` (`src/lib/studentProgress.ts:403-404`) and `recalculate` only raises it (`:292`).
- **R7 (MED, a11y): the global Space handler in AudioPlayer calls `preventDefault()` for any focused element except input, textarea and contenteditable** (`src/components/AudioPlayer.tsx:182-198`). On every lesson with a top player, Space on a focused button (bookmark, Step buttons, links) toggles audio instead of activating the control, and Space no longer scrolls the page. This includes buttons inside the licence and search dialogs.
- **R8 (LOW-MED): the top player shares one global speech snapshot.** Any other speech on the page (word or sentence buttons in the course views use `speakText`) makes the top player show `🔊 음성 읽는 중…` and the pause icon. Pressing its ▶ then pauses that other clip instead of starting the lesson queue (`AudioPlayer.tsx:62-65,99-110`, `speech.ts:1025`).
- **R9 (LOW-MED): a missing or blocked clip is hidden by browser TTS** on desktop and mobile (`speech.ts:945-955`, `hasVoiceFor` returns true when the voice list is empty, `:309`), while in in-app browsers the same failure aborts the whole queue (`:1170-1176`). A missing clip therefore does not show up in normal use; only network logs reveal it.
- **R10 (LOW): the STUDENT progress queue flush can drop an update queued during the request.** `pendingRef.current.slice(updates.length)` after the await assumes the array was not rebuilt, but `queueStudentUpdate` replaces it (filter + push) (`src/components/ProgressProvider.tsx:81` vs `:96-104`).
- **R11 (LOW): theme and language have storage and providers but no UI** (`LanguageProvider.tsx:75-109`: `setLang`, `setTheme`, `toggleTheme` have no callers). Dark mode follows the OS only; en/ja/zh cannot be chosen.
- **R12 (LOW): `kig:progress:recent` is written on every lesson view but never displayed** (`ProgressProvider.tsx:238-258`; no consumer of `recent`).
- **R13 (LOW, commercial): no footer, legal pages, contact or business information anywhere.** No match in `src/` (owner/lawyer pending per `README.md`).
- **R14 (LOW): the home page has no header**, so no search and no licence entry until a course is opened (`TabBar.tsx:45-47`).
- **R15 (LOW): Korean copy uses fixed particles.**
  - `${planLabel}이 성공적으로 등록되었습니다!` → `1년 VIP 올패스이`, `평생 소장 VIP 패스이` (`LicenseProvider.tsx:369`).
  - `🎉 챕터 {n}가 열렸습니다.` is wrong for chapters read with a final consonant (1, 3, 6, 7, 8, 10, …) (`CourseDashboard.tsx:262`).
  - `챕터 {n}은` is wrong for 2, 4, 5, 9, … (`LessonPaywall.tsx:46`).
- **R16 (LOW): orphan script pages.** Script pages are reachable only by URL: not listed (`[course]/page.tsx:100-110`), not in main-page prev/next (`content.ts:128-129`), not in search. The comment at `[course]/page.tsx:95-97` mentions a "View the Korean script" button that no component renders (grep).
  On `/grammar1/gh1-016-1` prev/next follows the unsorted index (prev `gh1-123-2`, next none).
- **R17 (LOW): verify-pending flash.** Every page load of a licensed learner starts as unlicensed until POST `/api/license/verify` returns (`LicenseProvider.tsx:91,243`): header `이용권 등록`, lock chips, and disabled stars on the list for a moment. If verify fails with 5xx, the page stays client-locked while the server cookie still opens lessons (`:214-218`).
- **R18 (LOW): `/api/license/revoke` and `/api/license/update-limit` create a record for any string** (admin only) (`deviceStorage.ts:348-353,533-538`).
- **R19 (LOW): `/api/license/session` returns the signed token in JSON** (`src/app/api/license/session/route.ts:45`). Any same-origin script can read the value the httpOnly cookie was meant to hide (a trade-off accepted in ISS-13).
- **R20 (LOW): unused components** `LessonClientGate.tsx` and `TabList.tsx` (no importers).
- **R21 (tooling, not app): `harness.cjs` SNAPSHOT `notFound`** tests the h1 for `/페이지를 찾을 수 없|404/`, but the 404 h1 is `찾는 페이지가 없습니다` (`not-found.tsx:32`), so `notFound` is always false. `PAYWALL_RE` does not match the progress paywall (`순차 학습 잠금`).
- **R22 (observation): CNN is retired but still live**: home stage 07, nav tab, `/cnn` routes, sitemap (1 course + 1 tab + 2 lessons), and 120 search items (`src/lib/tabs.ts:73-80`, `courses.ts:90-101`). Out of scope for testing; listed so the owner knows it is still public.
