# READING — feature and data map (source reading, 2026-09-18)

> Stage 1 of the 2026-09-18 commercial-release audit. **Read-only source reading** of `main` = `9d6e15d`
> (last code commit `cf18537`). Nothing here was run in a browser. Counts in §2 and the cloze/clip
> numbers in §5/§6/§12 were computed with node over `content/` and the real `src/lib/*.ts` functions
> (transpiled with the repo's own `typescript`), not measured on production.
> Written and checked by the same agent (Claude); nobody else has reviewed it. Treat every item in §12 as
> **UNVERIFIED** until a driver reproduces it on production.

Line numbers are 1-based as shown by the Read tool (PowerShell `Measure-Object -Line` under-counts
because it skips blank lines — do not use it to cite lines).

---

## 1. Routes and data sources

### 1.1 Routes

| URL | Renders | Source |
|---|---|---|
| `/reading` | course list (dashboard, 6 accordion sections, **main lessons only**) | `src/app/[course]/page.tsx:86-187`, `src/components/CourseDashboard.tsx` |
| `/reading/prNNN` (NNN = 001..256) | lesson page, `variant: "main"` | `src/app/[course]/[lesson]/page.tsx:110-401` |
| `/reading/prNNN-1` | "script" page, `variant: "script"` — **same view as main** (see §4.9) | same file |
| anything else under `/reading/…` with 1–2 segments | server-rendered 404 via proxy rewrite to `/_kig/route-guard/not-found` | `src/proxy.ts:117-152, 186-196`; allow list `src/lib/generated/validRoutes.json` (`lessons.reading` = 512 ids = the 512 files on disk) |
| `/audio/azure-ava/v1/<key>.mp3` | synthesized clip (Ava) for one sentence / word | `src/lib/mediaRoute.ts`, `src/lib/mediaAccess.ts:86-91` |
| `/audio/reading/prNNN.mp3` | original recording. **Referenced by lesson JSON but never requested by the READING page** (player is always in sentence/TTS mode, §6.1) | `mediaAccess.ts:93-112` |

`generateStaticParams` exists (`page.tsx:23-25`) but every page renders per request (root layout reads headers for the CSP nonce; `page.tsx:27-43`).

### 1.2 How the passage data reaches the client (ISS-00 state)

1. Server component `page.tsx` calls `getLesson("reading", id)` (`src/lib/content.ts:71-104`) → `fs.readFileSync(content/lessons/reading/<id>.json)` (cached in-process, `content.ts:22-36`). `import "server-only"` at `content.ts:1`.
2. **Licence check before any lesson data is assembled** (`page.tsx:148-182`): free ids (§8) pass; otherwise cookie `kig_license_session` is verified (`verifyLicenseSessionToken`); STUDENT-only plans are refused for READING. Denied → only `LessonPaywall` + h1 title are rendered; no sentences/vocabulary in the payload.
3. Allowed → the page passes plain props to client components:
   - `LessonBody` (`page.tsx:369-384`): `blocks` (this lesson's legacy blocks), `pairBlocks` (the paired page's blocks), `readingSentences={lesson.readingSentences ?? pairLesson?.readingSentences}`, `readingVocabulary={lesson.readingVocabulary ?? pairLesson?.readingVocabulary}`, `lessonKey="reading/<id>"`, `isScript`, `audioTracks`, `vocaDictionary=null`.
   - `AudioPlayer` (`page.tsx:343-356`): `src="/audio/reading/prNNN.mp3"` and `fallbackSentences` = every `readingSentences[].english` passed through `cleanText` (`page.tsx:421-426, 454-456`).
4. These props are serialized into the **RSC flight payload**: inline `self.__next_f.push(...)` `<script>` chunks in the HTML on a document load, and the `text/x-component` response of `?_rsc=` fetches on client-side `<Link>` navigation (prev/next). **There is no API endpoint for lesson data.**
5. `src/lib/readingSentences.json` and `src/lib/readingVocabulary.json` are **not imported by anything under `src/`** any more (grep: only `scripts/*` and `docs/qa-*` scripts). `readingUtils.ts:1-18` documents the removal. `ReadingLearningView` has a no-data fallback (sentence split + DP alignment, keyword extraction) that is never reached with current data (§2).

Consequences for a driver:
- The payload of an open lesson contains the English passage, the Korean passage (pair blocks), all 14 cards with `reason/score/examTags/freq` (not shown on screen), and the legacy `choice`/`dictation` blocks (not rendered). **"Present in HTML" ≠ "shown on screen"** — assert on `innerText` of the specific section after switching to the step.
- Expected values: read `content/lessons/reading/<id>.json` from the repo (same commit as production). A mismatch between DOM and local JSON means either a render defect or deploy drift — check the deployed commit first.
- Step 1 English is server-rendered (default tab). Korean text appears on screen only via hover/pin (Step 1 bar, Step 4 HUD) or Step 4 columns.

### 1.3 Schemas

**`content/courses/reading.json`** — keys `course`, `tab`, `lessonCount` (256), `groups[]`, `lessons[]`.
- `groups[i]`: `{ label: "[ 001~040번 ]", lessons: ["pr001","pr001-1",…] }`
- `lessons[i]`: `{ id, title, label, series:"pr", variant:"main"|"script", unit, part:null, order, hasAudio:true, menuLabel }`
  - e.g. `{"id":"pr001","title":"::: K-IG 교육 영어듣기훈련프로그램 | 기초2 | 제 001 회 강의 :::","label":"[ K-IG 교육 Reading 001 ]","series":"pr","variant":"main","unit":1,"part":null,"order":0,"hasAudio":true,"menuLabel":"[ pr001 ]"}`

**`content/lessons/reading/<id>.json`** (`src/lib/types.ts:145-215`):
- `id, course:"reading", series:"pr", variant, pairId` (main: `null`; script: `"prNNN"`), `title, label, menuLabel, unit, part, order`
- `audio: [{ src:"/audio/reading/prNNN.mp3", legacySrc:"sounds/prNNN.mp3", autoplay:true }]` (script page points at the **main** mp3)
- `video: []`
- `blocks`: always exactly `heading > instruction > choice > dictation`
  - `heading.text` = `"[ K-IG 교육 Reading 001 ]"` (script: `… 001-1 ]`)
  - `instruction.text` = whole English passage (main) / whole Korean passage (script) — equals `readingSentences` joined by a space (checked: 0 differences, 512 files)
  - `choice.options` = `["1 번","2 번","3 번","4 번","5 번"]` (legacy, **not rendered**)
  - `dictation.rows` = 10 (legacy, **not rendered**)
- `readingSentences: [{ id:"reading-001-s001", english, korean }]`
- `readingVocabulary: [{ word, lemma, partOfSpeech, korean, score, reason, examTags:[…], freq }]` (always 14)
- `legacyPath, legacyEncoding`

---

## 2. Counts, id sequences, oddities (computed with node, 2026-09-18)

| Item | Value |
|---|---|
| Index entries | 512 = 256 `main` + 256 `script`; ids `pr001, pr001-1, pr002, pr002-1 … pr256, pr256-1` in that exact order; `order` = array index for all; `unit` = number for all |
| Gaps / duplicates in 1..256 | none / none |
| Script without main / main without script | none / none |
| Lesson files on disk | 512, identical id set to the index and to `validRoutes.json` |
| Groups | 6, total 512 ids, every lesson in exactly one group |
| Group sizes (main lessons) | 001~040: 40 · 041~080: 40 · 081~120: 40 · 121~173: 53 · 174~223: 50 · 224~256: 33 |
| Section headings on `/reading` | `Section 1 · 001회 ~ 040회 원문 독해`, `Section 2 · 041회 ~ 080회 원문 독해`, `Section 3 · 081회 ~ 120회 원문 독해`, `Section 4 · 121회 ~ 173회 원문 독해`, `Section 5 · 174회 ~ 223회 원문 독해`, `Section 6 · 224회 ~ 256회 원문 독해` (`curriculumPresentation.ts:70-77`, section = `ceil(first/40)`) |
| Sentences (main pages) | 1,449 total; per lesson min 1, max 18. Histogram `{1:6, 2:7, 3:24, 4:40, 5:56, 6:52, 7:31, 8:18, 9:9, 10:3, 11:3, 12:1, 13:2, 14:1, 15:2, 18:1}` |
| Words per passage (`split(/\s+/)` of sentences joined) | min 24 (pr127), max 291 |
| Vocabulary cards | 3,584 = 256 × 14; every lesson exactly 14; no duplicate `word` inside a lesson; every `word` occurs (case-insensitive, whole word) in its passage; no empty field; no `(핵심 어휘)` placeholder |
| POS values (main) | `n.` 1624, `v.` 1020, `adj.` 730, `adv.` 180, `prep.` 15, `conj.` 9, `pron.` 6 |
| Main vs script page | `readingSentences` identical in all 256 pairs; `readingVocabulary` identical in all 256 pairs |
| Sentence ids | `reading-<NNN>-s<001..>` sequential in every file, no duplicates |
| Empty english/korean, Hangul in english, korean without Hangul | 0 / 0 / 0 / 0 |
| English sentence not ending in `. ? ! " ' ” ’ )` | 0 |
| Leading numbering / `/` / `[..]` inside english | 0 / 0 / 0 (so `cleanText` and `normalizeUnifiedSpeechText` do not change any sentence) |
| Sentences with curly quotes `‘’“”` | 86 |
| Cloze items the real `generateClozeItems` produces | 748: 242 lessons × 3, 8 × 2, 6 × 1; no lesson with 0 |
| Speech clips needed | 1,449 sentence keys + 3,584 word keys; **all present in the local `public/audio/azure-ava/v1` (50,383 files)** — that folder is gitignored and is not the R2 bucket; production must be probed (§6) |

Oddities:
- `pr126-1` has `menuLabel: "[ pr 126-1 ]"` (space) in both `content/courses/reading.json` and the lesson file; every other entry is `[ <id> ]`. Only visible in `<meta name="description">` (`page.tsx:80-82`).
- Every `title` field is the legacy `"::: K-IG 교육 영어듣기훈련프로그램 | 기초2 | 제 NNN 회 강의 :::"` (a listening title). Not shown: `formatLessonPresentation` ignores it for READING.
- Six lessons have a single "sentence": pr127, pr131, pr132, pr133, pr161, pr171 (header then says `1개 핵심 문장`, one cloze item). In pr131 and pr161 the single Korean entry holds two Korean sentences.
- 31 sentence entries contain a pattern `[a-z][.?!] [A-Z]` (possible merged sentences or quotes/abbreviations — content review): pr028#4, pr030#9, pr067#1, pr067#4, pr079#5, pr080#4, pr086#12, pr087#4, pr092#3, pr104#2, pr143#3, pr147#2, pr152#1, pr162#6, pr173#3, pr178#2, pr179#10, pr186#4, pr186#5, pr190#5, pr193#4, pr195#3, pr195#4, pr214#1, pr214#2, pr222#8, pr236#1, pr236#3, pr237#7, pr237#9 (first 30 of 31 printed; re-run the check for the last one).
- 80 lessons have a card `word` whose case differs from the passage (e.g. pr010 `internet`, pr028 `sometimes|otherwise|speak`). Cosmetic; cards show the lower-case word.
- The search index (`public/search-index.json`) has 256 READING entries, all main ids; **no script page is in search, sitemap, course list, or linked from any page** (§4.9).

---

## 3. Components and files

| File | Role | Key lines |
|---|---|---|
| `src/app/[course]/[lesson]/page.tsx` | server page: metadata, licence gate, prev/next, h1, top `AudioPlayer`, `LessonBody`, `LessonStepNavigation` | metadata 65-108 (canonical 78, description 80-82, robots 93-98); gate 148-182; nav 264-326; h1 329-331; player 343-365; body 368-384; step nav 398; `cleanText` 421-426; READING sentences for player 454-456 |
| `src/lib/content.ts` | file reads, prev/next/pair, canonical | `getLesson` 71-104; `getLessonContext` 124-163; `canonicalLessonId` 175-181 |
| `src/components/LessonBody.tsx` | dispatches `course === "reading"` → dynamic `ReadingLearningView` | dynamic import 27-30; dispatch 136-149 |
| `src/components/ReadingLearningView.tsx` | the whole READING learning UI (4 steps + notepad) | see §4 |
| `src/lib/readingUtils.ts` | fallback keyword extraction, passage join, (off) quiz generator, cloze generator | `STOP_WORDS` 162-184; `extractPassageKeywords` 218-280; `extractFullReadingPassage` 331-364; `generateReadingQuiz` 397-680; `generateClozeItems` 691-761 |
| `src/lib/quizFlags.ts` | `SHOW_GENERATED_QUIZ = false` | 26 |
| `src/components/VoiceSpeakingTester.tsx` | mic reading test in Step 3 | 20-288 |
| `src/lib/speechRecognition.ts` | Web Speech recognition + scoring | normalize 68-92; `evaluatePronunciation` 120-221; `listenToSpeech` 231-321 |
| `src/components/AudioPlayer.tsx` | top "whole passage" player (sentence queue) | 29-391 |
| `src/lib/speech.ts` | playback engine (Ava clip → Web Speech → clip stream) | unlock 163-213; global listeners 252-263; stream 708-752; `playUnifiedClip` 755-841; `speakWithToken` 959-1007; `speakText` 1017-1031; queue 1110-1180; `stopSpeech` 1223-1233; pause/resume 1240-1316 |
| `src/lib/unifiedSpeech.ts` | clip URL = hash of normalized text | 1-47 |
| `src/lib/mediaAccess.ts`, `src/lib/mediaRoute.ts` | clip/mp3 access and cache headers | `mediaAccess.ts:86-91`; `mediaRoute.ts:39-45, 110-115` |
| `src/lib/generated/freeSpeechKeys.json` | 532 clip keys open without licence (pr001/pr002 included) | built by `scripts/buildFreeSpeechKeys.mjs` |
| `src/components/LessonActionButtons.tsx` | 북마크 / 완료 체크 buttons + records "recent" | 23-25, 30-44, 47-66 |
| `src/components/ProgressProvider.tsx` | localStorage progress/bookmarks/recent | keys 42-45; restore 116-138; `toggleComplete` 196-215; `toggleBookmark` 224-236; `recordRecent` 238-258 |
| `src/components/LessonStepNavigation.tsx` | bottom "← 이전 Step / 목록으로 / 다음 Step →" | 6-16, 36-40, 49-57, 64-89 |
| `src/components/LessonPaywall.tsx` | locked page body | 15-137 |
| `src/components/CourseDashboard.tsx` | `/reading` list, filters, progress | cards 28-174; stats 211-221; filters 287-321; accordion 389-445; card loop 460-481 |
| `src/lib/curriculumPresentation.ts` | titles/codes | group 70-77; lesson 168-178 |
| `src/lib/license.ts` | free preview ids | 72-85 (`reading: ["pr001","pr001-1","pr002","pr002-1"]`), 106-125 |
| `src/components/LicenseProvider.tsx` | client licence state, reload after paywall | 28-29, 83-88, 279-308 |
| `src/lib/i18n.ts` | `kig:lang` strings (default `ko`, 13) — only the player uses them on this page | `player.*` 51-60 (ko) |

READING-view text is **hard-coded Korean** (not i18n). Only the `AudioPlayer` play/pause aria-label (`재생`/`일시정지`), `속도` label and `T` fallbacks come from `src/lib/i18n.ts` (`kig:lang` in localStorage; en = `Play`/`Pause`/`Speed`).

---

## 4. Every view and control

Abbreviations: **RLV** = `src/components/ReadingLearningView.tsx`. `n` = `readingSentences.length`, `S[i]` = `readingSentences[i]`, `V[i]` = `readingVocabulary[i]`, `wc` = word count (§4.2), `L` = lesson id.

### 4.1 Page shell (`page.tsx`)

| Control | Exact text / aria | Precondition | Effect / expected |
|---|---|---|---|
| Course link | `<a href="/reading">` with `←` (aria-hidden) + `READING 목록` | always | navigates to `/reading` (`page.tsx:266-272`) |
| Bookmark | text `☆`+`북마크`, aria-label `북마크 추가`; when on: `★`+`북마크됨`, aria-label `북마크 해제` | hydrated **and** ProgressProvider restore effect done (state starts `{}`; wait ~300 ms) | toggles `kig:progress:bookmarks["reading:<L>"]` (key deleted when off) (`LessonActionButtons.tsx:30-44`, `ProgressProvider.tsx:224-236`) |
| Complete | text `완료 체크`, aria-label `학습 완료 체크`; when on: `✓`+`학습 완료`, aria-label `학습 완료 취소` | same | toggles `kig:progress:completed["reading:<L>"]`; no server call for READING (`ProgressProvider.tsx:196-215`) |
| Recent | none (effect) | on mount | writes `kig:progress:recent = {course:"reading", lessonId:L, title, courseTitle:"READING", updatedAt}` (`LessonActionButtons.tsx:23-25`) |
| Prev | `<a aria-label="이전 강의: <title>">` with `이전 강의` + title | `prev` exists | `href="/reading/<prev>"` (`page.tsx:287-304`) |
| Next | `<a aria-label="다음 강의: <title>">` with `다음 강의` + title | `next` exists | `href="/reading/<next>"` (`page.tsx:306-323`); grid is `grid-cols-2` when both exist, else `grid-cols-1` |
| h1 | `NNN회 · 원문 독해 & 리스닝` (main **and** script page) | — | `curriculumPresentation.ts:168-178` |
| Bottom step nav | `<nav aria-label="학습 단계 이동">`: button `← 이전 Step`, link `목록으로` (`/reading`), button `다음 Step →` | `maxStep` = highest `Step N` found in `main button` text = 4 | moves by clicking the matching `Step N` tab button; `← 이전 Step` disabled when currentStep ≤ 1, `다음 Step →` disabled when currentStep ≥ 4 (`LessonStepNavigation.tsx:59-61`). currentStep is updated by a capture click listener on any button whose text matches `/\bStep\s*(\d+)\b/` |

Prev/next rules (`content.ts:124-163`):
- main page: list = main lessons only → `pr001` prev none/next `pr002`; `pr256` prev `pr255`/next none.
- script page: list = **all 512 entries** → `prNNN-1` prev `prNNN` (same h1 title), next `prNNN+1` (main); `pr256-1` next none; `pr001-1` prev `pr001`.
- `pair`: main → its `-1`; script → its main. `pairLesson.blocks` becomes `pairBlocks`.

Metadata: `<title>` = h1 text; `<link rel=canonical>` = `/reading/prNNN` for both main and `-1`; `robots: noindex, follow` on every paid id; free ids (pr001, pr001-1, pr002, pr002-1) have no robots meta; description `"<menuLabel> — <title>. K-IG 핵심 어학 과정."` (raw `[ pr001 ]`).

### 4.2 RLV header (always visible)

`RLV:465-527`
- Label `📖` + `Reading 독해 마스터리 코스웨어` (472).
- Stats line (476-480): `총 {wc}단어` · `{n}개 핵심 문장` · `권장 속독 시간 약 {expectedSeconds}초`
  - `wc = S.map(s=>s.english).join(" ").trim().split(/\s+/).filter(Boolean).length` (219-236)
  - `expectedSeconds = max(15, round(wc/180*60))` (239)
  - Examples: pr001 `총 76단어 · 5개 핵심 문장 · 권장 속독 시간 약 25초`; pr002 61/3/20; pr100 82/4/27; pr127 24/1/15; pr256 96/9/32.
- Number toggle (486-498): `<button title="문장 번호 표시 On/Off">` text `# 번호 ON` / `# 번호 OFF`. State `showNumbers` (default true, not persisted). Hides the `<sup>[i+1]</sup>` in Step 1 passage and both Step 4 columns. Does **not** hide the `[i+1]` badge in the Step 1 bar or `#i+1` in the Step 4 HUD.
- Font size (500-525): three buttons `보통`, `크게`, `특대`, each with `aria-pressed`. State `fontSize` (default `normal`, not persisted). Class on Step 1 passage container (682) and both Step 4 column containers (1120, 1165): `text-[16px] leading-relaxed` / `text-[18px] leading-relaxed` / `text-[20px] leading-loose` → assert computed `font-size` 16/18/20 px. Cloze, cards and notepad are not affected.

### 4.3 Step tabs

`<nav aria-label="리딩 4단계 학습 단계">` (530-588), four buttons (no aria-pressed; active one has class `bg-ink text-surface`):
`⏱️ Step 1 · 속독 챌린지` (speed, default) · `📚 Step 2 · 핵심 어휘` (voca) · `📝 Step 3 · 독해 퀴즈` (quiz) · `⚖️ Step 4 · 원문 대조` (dual).
Only the active section is mounted; all RLV state (answers, reveals, pin, playing flags, WPM result) lives in the parent and survives tab switches. `WpmStopwatchBar` internal timer state is lost when Step 1 unmounts (its `elapsed`/`running` are local, 57-58).

### 4.4 Step 1 — `section[aria-label="Speed Reading"]` (593-737)

**WPM stopwatch** (`WpmStopwatchBar`, 43-176)
- Texts: `속독 페이싱 훈련 (WPM Pacing)` (122); h2 `한국어 번역을 멈추고 영어 어순대로 눈을 빠르게 굴려 읽어보세요.` (125); p `글을 읽기 시작할 때 [속독 시작]을 누르고, 마지막 마침표를 읽는 순간 [완독 완료]를 눌러 WPM을 측정하세요.` (128); `경과 시간` + `MM:SS` (134-140).
- Start button (144-151): `⏱️` + `속독 측정 시작` (elapsed 0) or `다시 측정 시작` (elapsed > 0). Action: `unlockMobileAudio()`, `stopSpeech()`, elapsed=0, running. Timer ticks +1 every 1000 ms (61-76).
- Finish button (153-160, only while running, `animate-pulse`): `✓` + `완독 완료! (속도 측정)`. Action (85-106): `finalSeconds = max(1, elapsed)`; `wpm = round(wc / finalSeconds * 60)`.
  - `wpm > 1000` → no storage write; parent sets `wpmTooFast` → amber card (605-620): `측정값을 저장하지 않았습니다` and `{finalSeconds}초 만에 완독하면 1000 WPM을 넘어 실제 읽기 속도로 볼 수 없습니다. 지문을 끝까지 읽은 뒤 [완독 완료]를 눌러 주세요.`
  - else, if no best or `wpm > best` → `localStorage["kig:reading:wpm:reading/<L>"] = String(wpm)`; green card (623-658): `{wpm} WPM`, badge `🚀 최상위 속독 수준` (≥200) / `⚡ 권장 속도 완벽 마스터` (≥160) / `📖 양호한 독해 속도` (≥120) / `💡 직독직해 집중 훈련 권장` (<120); p `{wc}개 단어를 {finalSeconds}초 만에 완독하셨습니다. (내 최고 기록: {best} WPM)`; button `독해 이해도 퀴즈 풀기 ➔` → switches to Step 3 (650-656).
  - Smallest elapsed that is scored: pr001 5 s (912 WPM), pr002 4 s, pr100 5 s, pr127 2 s, pr256 6 s. Finishing at `00:00` or `00:01` is always "too fast" for every lesson (min wc 24 → 1,440 WPM).
- Reset `↺` (163-172, `title="타이머 초기화"`, shown when elapsed>0 and not running): elapsed 0, clears result card and too-fast card (parent `handleResetWpm` 325-329). Stored best untouched.
- Best restore: on mount reads `kig:reading:wpm:reading/<L>` (299-309). The best is **only displayed inside the result card**; there is no standalone "best" display.

**Passage board** (661-735)
- Badge `English Passage`; hint `단락 내 문장을 터치하면 즉시 발음이 재생됩니다`.
- Copy button (672-678): `지문 전체 복사` → `✓ 복사 완료` for 2000 ms. Writes `S.map(s=>s.english).join(" ")` to the clipboard (`navigator.clipboard.writeText`, no catch).
- Sentence spans (683-712): for each i, `<span data-sentence-id="<S[i].id>" title="터치하여 발음 청취 / 마우스 올려 번역 미리보기">` containing optional `<sup>[i+1]</sup>`, `<span>{S[i].english}</span>`, and a trailing space. Selector: `section[aria-label="Speed Reading"] [data-sentence-id]` (count n); exact English = `span[data-sentence-id] > span`.
  - mouseenter → `hoveredSentenceId = id` (class `bg-amber-200/80 … ring-1`); mouseleave → null.
  - click → `playSentenceEn(S[i].english, i)` (412-427): if this sentence is already `playingSentence` → `stopSpeech()` and clear; else `stopSpeech()`, mark playing (class `bg-red-500/15 text-red-600 … font-bold`), `speakText(english, {lang:"en", rate:0.95})`; cleared on clip end/error.
- Translation bar (716-734): if `activeSentence` (hovered, else pinned from Step 4) → `[i+1]`, `👉 {S[i].korean}`, `1:1 직독직해`; otherwise `문장에 마우스를 올리면(Hover) 한국어 직독직해 번역이 여기에 표시됩니다.`

### 4.5 Step 2 — `section[aria-label="Key Vocabulary"]` (742-848)

- h2 `📚 지문 필수 핵심 어휘 (Lexical Builder)`; p `본문에 등장한 핵심 단어의 발음과 의미를 먼저 파악하고, 단어 카드를 클릭하여 암기 상태를 확인하세요.`; count `총 14개 핵심 어휘`.
- Cards come from `readingVocabulary` **only when its length is exactly 14** (243-254), else `extractPassageKeywords` fallback (never with current data). Order = data order.
- Toggle-all button (757-779): `💡 전체 뜻 보기` → reveals all 14; when every card is revealed the text is `🙈 전체 뜻 가리기` → hides all. Reveal state keyed by `word`, not persisted.
- Card i (785-845), `div` (not a button, not focusable) with `onClick → playWordAudio(V[i].word)`:
  - POS span `{V[i].partOfSpeech}`; word span `{V[i].word}`; `#` + two-digit index (`#01`..`#14`).
  - `<button title="발음 듣기">` showing `🔊` (idle) / `⏹️` (playing, class `bg-red-500`); `stopPropagation`; `playWordAudio` (429-444): same toggle logic as sentences, `rate: 0.9`, text = `V[i].word`.
  - Meaning: `<button>💡 뜻 확인하기</button>` (828-837) → replaced by `<span>{V[i].korean}</span>` (824-826). Irreversible per card except via toggle-all hide.

### 4.6 Step 3 — `section[aria-label="Reading Quizzes"]` (853-1056)

- **Generated comprehension questions are OFF** (`SHOW_GENERATED_QUIZ=false`, `quizFlags.ts:26`): no banner, no `Q1.`/`Q2.` (862-953 not rendered). Assert that `독해력 실전 인출 테스트` and `Q1.` are absent.
- **Cloze** (956-1028), shown when ≥1 item (all 256 lessons):
  - h3 `🔤 핵심 키워드 클로즈(Cloze) 빈칸 완성`; p `지문의 문맥을 보고 빈칸에 들어갈 가장 알맞은 어휘를 고르세요.`; badge `{k}문항`.
  - Item: `<p>` masked sentence (981); option buttons (1001-1013, font-mono); after answering all options of the item are `disabled`; feedback (1018-1022) `✓ 정답입니다!` or `❌ 정답은 '{missingWord}' 입니다.`; correct option class `border-emerald-500 …`, chosen wrong option `border-red-500 … line-through`, others `opacity-50`. One attempt per item; state not persisted (reload = fresh, **re-shuffled**).
  - Generation: §5.1.
- **Mic reading test** (1031-1054), shown when `S[0]` exists:
  - h3 `🎙️ 지문 대표 문장 낭독 & 발음 채점`; p `직접 소리 내어 지문의 핵심 문장을 읽고, 인식된 문장이 원문과 얼마나 일치하는지 확인해보세요.`; target box = `S[0].english`.
  - `VoiceSpeakingTester` with `buttonLabel="🎙️ 마이크 켜고 소리 내어 읽기"` → button shows `🎙️` + `마이크 켜고 소리 내어 읽기` (label with the emoji prefix stripped, `VoiceSpeakingTester.tsx:131`), `title="마이크를 누르고 영어 문장을 소리내어 말해보세요."`.
  - Unsupported (`!window.SpeechRecognition && !window.webkitSpeechRecognition`): notice `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`, or in KakaoTalk/in-app `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` + `🌐 Safari로 열기`/`🌐 Chrome으로 열기` (109-129).
  - Listening: button `⏹️` `듣고 있는 중... (말씀하세요)`; panel `실시간 음성 인식:` + interim or `지금 영어로 말씀하세요...`; button `완료` (177-194).
  - Result: button `{score}점 ({ratingLabel})`; `↺ 다시 녹음` (`title="다시 말하기"`); card `{score}점`, rating label, `단어 일치 {matchedCount}/{totalWords}`, `인식된 내 음성:` `"{transcript}"`, `단어별 발음 일치도:` word chips (green matched / red line-through), `💡 {feedback}` (216-285).
  - Errors: `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.` (no-speech); `마이크 접근 권한이 거부되었거나 차단되었습니다. …` (not-allowed/service-not-allowed); `음성 인식 오류: {error}` (other) (`speechRecognition.ts:285-293`).
  - Score is set into RLV `readingScore` (1049-1051) but never displayed or stored.

### 4.7 Step 4 — `section[aria-label="Side-by-Side Dual Reading"]` (1062-1258)

- Bar: `⚖️` `영어 원문과 한글 완역 1:1 대조 리딩` + (≥sm) `· 문장을 탭하면 대응 번역이 실시간 동기화됩니다`; badge `{n}개 문장 1:1 정합`.
- View toggle `div[role=group][aria-label="대조 보기 선택"]` (1076-1101): `양방향` / `영어만` / `한글만` with `aria-pressed`. `영어만` adds class `hidden` to the KO column; `한글만` to the EN column; `양방향` shows both (two columns only at ≥lg / 1024 px, stacked below). Not persisted.
- EN column (1112-1154): badge `English Passage (영어 원문)`, hint `탭 발음 듣기 / 번역 확인`; spans `[data-sentence-id]` with optional `<sup>[i+1]</sup>` + `<span>{english}</span>`; hover as Step 1; click → toggle `pinnedSentence` (i ↔ null) **and** `playSentenceEn(english, i)`.
- KO column (1157-1198): badge `Korean Interpretation (한글 완역)`, hint `1:1 일치 단락`; spans with the **same** `data-sentence-id` + `<span>{korean}</span>`; hover as EN; click → toggle pin only (no audio).
- Highlight: a sentence is highlighted in both columns when pinned, hovered or playing (`bg-amber-200/90 … ring-1`).
- HUD (sticky bottom, 1202-1256): `activeSentence` = hovered ?? pinned.
  - Active: `#{i+1}`, `{english}`, `👉 {korean}`; button `🔊` (+ `발음` in a `hidden xs:inline` span — see §12) → `playSentenceEn`; button `✕` `aria-label="닫기"` `title="닫기"` → clears pin and hover.
  - Idle (hidden below sm): `💡` `영어 또는 한국어 문장에 마우스를 올리거나 탭하면 해당 문장의 1:1 번역이 여기에 표시됩니다.` and `클릭하면 문장 고정(Pin)`.
- Pin persists across tabs: a sentence pinned here keeps the Step 1 translation bar filled.

### 4.8 Notepad (always visible under every step) — `section[aria-label="Reading Notes"]` (1261-1287)

- Heading `📝 독해 핵심 메모 & 어휘 노트 (Reading Notepad)`; `자동 저장됨 ({at})` when saved; counter `{notes.length}자`.
- `<textarea rows=3 aria-label="독해 핵심 메모 & 어휘 노트" placeholder="지문의 핵심 주제문, 새로 배운 단어, 문법 포인트 등을 자유롭게 메모하세요... (실시간 자동 저장)">`.
- Restore on mount (367-382): `localStorage["kig:reading:notes:reading/<L>"]` = `{"notes": string, "at": string}` → textarea value and `자동 저장됨 (at)`; a fresh lesson shows no "자동 저장됨".
- Save (384-402): 400 ms after the last change, only if text ≠ last saved; `at = new Date().toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit"})` (e.g. `9. 18. 오후 3:05`). Clearing the text saves `{"notes":""}`.
- Main page and its `-1` page have **separate** notes (`reading/prNNN` vs `reading/prNNN-1`).

### 4.9 The `-1` script page

`isScript` is received but **never used** by RLV (182). The page renders exactly the main page UI from its own `readingSentences`/`readingVocabulary`, which are identical to the main file's (§2). The Korean `instruction` block (and the English pair block) only feed the no-data fallback. Differences from the main page: prev/next (§4.1), canonical → main, and all per-lesson storage keys (`kig:reading:wpm:reading/prNNN-1`, `kig:reading:notes:reading/prNNN-1`, `reading:prNNN-1` in bookmarks/completed). It is not reachable from any UI link (course page comment at `src/app/[course]/page.tsx:95-98` refers to a "View the Korean script" button that does not exist; `lesson.viewScript` i18n key is unused).

### 4.10 Course page `/reading` (for completion/bookmark assertions)

- Header: `CORE TRACK · 총 256개 정규 레슨 · 6개 단계 구성`, h1 `READING`, description `문장 낭독과 구문 분석이 결합된 원문 독해 훈련으로 문해력과 직독직해 능력을 완성합니다.`
- Dashboard: `학습 진도율: {completedCount} / 256개 완료 ({pct}%)`; filters `전체 (256)`, `★` `북마크 ({bookmarkCount})`, `미완료 ({256-completedCount})`. `completedCount`/`bookmarkCount` count **every** `reading:*` key, including `-1` pages (213-219).
- Sections start collapsed; header button (`aria-expanded`) text `펼치기 ▼`/`접기 ▲`, `총 {k}개 레슨`, `· {c}개 완료`.
- Card: code `Passage NNN`, `✓ 완료` when completed, lock chip `🔒 올패스` when locked, `무료 보기` chip for pr001/pr002 without licence, badge `📖 직독직해`, star button (aria-label `북마크 추가` / `북마크 해제` / `잠긴 레슨은 북마크할 수 없습니다` disabled), title link `NNN회 · 원문 독해 & 리스닝`, subtitle `Passage NNN · 음성 듣기`, footer id + link `학습하기` / `무료 보기` / `올패스 열람` + `→`/`🔒`.
- Empty bookmark filter: `아직 북마크된 레슨이 없습니다.` / `학습 중 중요하거나 복습이 필요한 레슨에서 [☆ 북마크]를 눌러보세요.` + `전체 레슨 목록 보기`.

---

## 5. Answer checking and normalization

### 5.1 Cloze (`readingUtils.ts:691-761`)

```ts
const candidates = sentences.filter((s) => s.en.split(/\s+/).length >= 6);          // 693
const stripEdgePunctuation = (w) => w.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9]+$/, "");
const passagePool = unique(allWords.map(strip).filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase())).map(w => w.toLowerCase()));
candidates.slice(0, 3).forEach((s, idx) => {
  const valid = s.en.split(/\s+/).map(strip).filter(Boolean).filter(w => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));
  const target = valid[Math.floor(valid.length / 2)];
  const masked = s.en.replace(new RegExp(`\\b${escape(target)}\\b`, "i"), "_______"); // first match only
  if (masked === s.en) return;
  const distractors = passagePool.filter(w => w !== target.toLowerCase())
    .map(w => ({ w, spread: Math.abs(w.length - target.length) + Math.random() }))
    .sort(...).slice(0, 3).map(c => c.w);
  const options = [target, ...distractors].sort(() => 0.5 - Math.random());
  result.push({ id: idx + 1, maskedSentence: masked, missingWord: target, options, answerIndex: options.indexOf(target) });
});
```

Deterministic (compute from data): which sentences (first 3 with ≥6 whitespace tokens), `missingWord`, `maskedSentence`, item ids, item count. Random per mount: the 3 distractors (ties broken by `Math.random`) and option order. Correctness check in UI is `selectedIdx === answerIndex` (option index), i.e. the **only correct option is the exact `missingWord` string** (original case; distractors are lower-cased). `STOP_WORDS`: `readingUtils.ts:162-184`.

Expected for pr001: (1) `Scientists say that their differences create _______ when mothers talk to sons and fathers talk to daughters.` → `problems`; (2) `For instance, a mother's good _______ may not work on her son, and a father's may not work on his daughter.` → `counsel`; (3) `That doesn't mean, though, that parents and their other-sex _______ are doomed to miscommunicate with each other.` → `children`.
pr002: `private`, `producing`, `wherever`. pr100: `mothers` (answer still visible later in the sentence), `others`, `chose`.
pr060: candidate 1 `Have you ever hurt another person?` has no word ≥5 chars outside `STOP_WORDS`, so items are ids 2 and 3 only.

Driver: import the real function (transpile `src/lib/readingUtils.ts` with the repo's `typescript`, as `scripts/buildFreeSpeechKeys.mjs:64-74` does) and compare `missingWord`/`maskedSentence`; read options from the DOM.

### 5.2 Pronunciation score (`speechRecognition.ts:68-221`)

```ts
normalize = lower → remove [.,?!;:"'()] → (contraction expansions: never match, apostrophes already removed) → collapse spaces
for each target word tw (normalized) at i: look at spoken[ptr .. ptr+1]:
   exact → matched (count 1); else if tw.length>=5 && levenshtein(tw,sw)===1 → matched (0.7)
wordAccuracy = (matched + 0.7*partial)/targetWords; lenRatio = min/max word counts;
charSim = 1 - lev(normTarget, normSpoken)/maxLen
score = round(65*wordAccuracy + 20*charSim + 15*lenRatio)   (0..100)
>=92 "🌟 모든 단어 일치 (Excellent!)"; >=80 "👍 대부분 일치 (Good!)"; >=60 "💪 거의 맞았어요 (Almost!)"; else "다시 시도 (Try Again)"
empty transcript → score 0, "음성 감지 안 됨"
totalWords shown = target.split(/\s+/).length (original)
```
Exact transcript = `S[0].english` → 100 / Excellent / `단어 일치 N/N` (pr001: `5/5`). Load the real function (no imports) to compute the expected value for a wrong transcript.

### 5.3 WPM — §4.4. No other answer checking exists on READING (no dictation, the legacy 5-choice block is not rendered).

---

## 6. Audio

### 6.1 What is spoken

| Trigger | Text | Rate | Engine call |
|---|---|---|---|
| Top player (`AudioPlayer`) | queue of `cleanText(S[i].english)` for i=0..n-1, 300 ms gap | 1 (or 0.8/1.2) | `playSentenceQueue` (`AudioPlayer.tsx:79-87`) |
| Step 1 sentence click / Step 4 EN click / Step 4 HUD `🔊` | `S[i].english` | 0.95 | `speakText` (RLV 412-427) |
| Step 2 card / `🔊` | `V[i].word` | 0.9 | `speakText` (RLV 429-444) |
| Korean | never spoken on READING | — | — |

The top player is always in sentence ("TTS") mode on READING: `isTtsMode = fallbackSentences.length>0 && (shouldUseUnifiedSpeech(pathname) || …)` and `shouldUseUnifiedSpeech` is true for every non-CNN path (`AudioPlayer.tsx:62-63`, `unifiedSpeech.ts:42-47`). So the `<audio src="/audio/reading/prNNN.mp3">` element is never rendered and the original recording is never requested. `label` is undefined (single track), so no `전체 듣기` caption.

### 6.2 Clip URL

`/audio/azure-ava/v1/<key>.mp3` where `key = unifiedSpeechKey(text)` (`unifiedSpeech.ts:21-39`): normalize (`/`→space, drop `[..]`, `::`, `--`, `…`, `|`→`, `, `()`, collapse spaces, trim), then `len.toString(36) + "-" + fnv1a32hex + mix32hex`. With current data, normalization changes nothing, so key(english) = key(cleanText(english)).
pr001 examples: S1 `/audio/azure-ava/v1/x-e425b87a51e89224.mp3`, S2 `32-d1c3e750d398efba`, S3 `2z-1b848964426cbdae`, S4 `36-c78119614cf2398a`, S5 `35-6cac604ddc08e335`; word `fathers` `7-b13ddf30722f3716`, `create` `6-26bb595d33389a26`, `respect` `7-6b68448dfb2ae3e5`, `other-sex` `9-f3587e1cd1541cba`.

Playback: one shared `new Audio()` element **not attached to the DOM** (`speech.ts:147-160`); `audio.src = clip`, `playbackRate = rate` (clamped 0.5–2), `play()`.

### 6.3 Fallback chain (`speech.ts:755-841, 959-1007, 937-956, 708-752`)

1. Ava clip. On `error` or rejected `play()` → 2.
2. Web Speech (`speechSynthesis`) if the browser has a voice for `en`, not KakaoTalk/in-app; watchdog 1500 ms → 3.
3. "Stream" = the same clip URL again; error → run ends with error → the view clears its playing flag; the top-player queue stops (`onError` resets the queue, `speech.ts:1170-1176`).
No third-party TTS is called.

### 6.4 Access and headers (`mediaAccess.ts:86-91`, `mediaRoute.ts:39-45, 110-115`)

- Key in `freeSpeechKeys.json` (all pr001/pr002 sentence and word keys — checked, 0 missing) → allowed anonymously, `Cache-Control: private, max-age=31536000, immutable`.
- Any other key → needs a valid `kig_license_session` cookie (any plan, not narrowed by course) → `private, max-age=3600, no-transform`; without it `403 License required` (`private, no-store`).
- Missing object → 404 `no-store`; origin failure → 502 `no-store`; Range → 206 with `Content-Range`, `Accept-Ranges: bytes`.

### 6.5 Player controls (`AudioPlayer.tsx`)

| Control | Text / aria | Effect |
|---|---|---|
| Play/pause | aria-label `재생` / `일시정지` (i18n) | not speaking → queue from 0; speaking → pause/resume (`togglePauseSpeech`) |
| Stop | aria-label `정지`, disabled unless speaking | `stopSpeech()`; counter back to `1/n` |
| Prev / Next | text `이전` / `다음`, aria-label `이전 문장` / `다음 문장` | speaking → jump ±1 (restarts clip); idle → start at index ±1 (from 0) |
| Sentence slider | `input[type=range][aria-label="문장 이동"]`, `aria-valuetext="{k}번째 문장 / 전체 {n}문장"`, opacity 0 over segment bar | commit on pointerup/keyup/blur → jump or start at index |
| Counter | `{index+1}/{n}` | index from engine snapshot |
| Speed | `0.8×`, `1×`, `1.2×` with `aria-pressed` (label `속도`) | sets rate; while speaking restarts the queue at the current index |
| Status | `▶ 재생 버튼을 눌러 전체 듣기` / `🔊 음성 읽는 중…` / `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기` | — |
| Space key | window keydown, ignored in input/textarea/contenteditable | `preventDefault()` + toggle play/pause |

Global side effects (`speech.ts:252-263`): `pointerdown`/`touchend`/`keydown` anywhere call `unlockMobileAudio()` (first call plays a silent WAV `data:` URI on the shared element); `pagehide` and `visibilitychange→hidden` call `stopSpeech()`. RLV unmount also stops speech (405-409).

---

## 7. Persistence, completion, progress

| Key (localStorage) | Written by | Shape |
|---|---|---|
| `kig:reading:wpm:reading/<L>` | Step 1 finish, only when scored and better | `"152"` |
| `kig:reading:notes:reading/<L>` | notepad, 400 ms debounce | `{"notes":"…","at":"9. 18. 오후 3:05"}` |
| `kig:progress:completed` | `완료 체크` | `{"reading:pr001":true, …}` (false → key deleted) |
| `kig:progress:bookmarks` | `북마크` on lesson page or star on course card | same shape |
| `kig:progress:recent` | every lesson mount | `{course,lessonId,title,courseTitle,updatedAt}` |
| `kig:lang`, `kig:theme` | site chrome | `"ko"` … |
| `kig:license:v1` | licence (do not touch) | — |

- No server progress for READING (`/api/progress/student` is used only when `course === "student"`).
- Not persisted: current step, font size, number toggle, dual view mode, pin, card reveals, cloze answers, mic result, the top player position.
- Completion is **manual only** — no step, quiz, WPM or audio action marks a lesson complete.
- sessionStorage: only `kig:license-cookie:<last16>` reload guard (`LicenseProvider.tsx:196-200, 359-362`).
- The audit profile is shared state: record every key before the run and restore it afterwards (`out/data-changes.md`).

---

## 8. Locking / entitlement

- Free: `pr001`, `pr001-1`, `pr002`, `pr002-1` (`license.ts:83`; suffix stripping `-\d+` means no paid id reduces to a free one).
- Server gate `page.tsx:148-182`; locked render = back link `← READING`, h1 title, `LessonPaywall` with `data-kig-paywall="license"`: `🔒`, chip `ALL-PASS ONLY` (or `VIP ALL-PASS REQUIRED` + `본 레슨은 VIP 올패스 전용 강좌입니다` for a STUDENT-only licence in the client), h2 = lesson title, p `공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다.`, buttons `🔑 이용권 코드 등록` and `🛒 구매 안내` (both open the licence modal — do not submit anything), link `← READING 전체 목록`, `1~2강은 무료로 상시 체험 가능합니다`. No prev/next nav, no action buttons, no step nav, no player.
- Client reload: if the server showed the paywall but the browser holds a verified licence, `LicenseProvider` reloads once per tab (`LicenseProvider.tsx:83-88, 191-200`).
- Media: §6.4. Course card lock state from `LicenseProvider.isUnlocked` (`279-308`): LIFE/1Y/1M → all READING unlocked.

---

## 9. Navigation and boundaries

| From | Prev | Next |
|---|---|---|
| `/reading/pr001` | — (single `다음 강의` cell) | `/reading/pr002` |
| `/reading/prNNN` (2..255) | `/reading/pr(NNN-1)` (main; a main page never links to a `-1` page) | `/reading/pr(NNN+1)` |
| `/reading/pr256` | `/reading/pr255` | — |
| `/reading/pr001-1` | `/reading/pr001` | `/reading/pr002` |
| `/reading/prNNN-1` | `/reading/prNNN` | `/reading/pr(NNN+1)` |
| `/reading/pr256-1` | `/reading/pr256` | — |

Negative URLs (expect server-rendered 404 with visible not-found text, not a white page): `/reading/pr000`, `/reading/pr257`, `/reading/pr001-2`, `/reading/pr1`, `/reading/PR001`, `/reading/pr001.html`, `/reading/pr001/x` (3 segments: router 404).
Step boundaries: `← 이전 Step` disabled on Step 1; `다음 Step →` disabled on Step 4 (only when the tabs were reached through tab buttons, see §12-5).
Client navigation via prev/next re-renders the page segment with new props; assert that step, notes, WPM timer and cloze state belong to the new lesson.

---

## 10. CDP driver recipe — one lesson, exhaustively

Use `docs/qa-2026-09-15/scripts/verify/cdp.cjs` (`launch` already passes `--autoplay-policy=no-user-gesture-required --mute-audio`; `tab.eval` uses `userGesture: true`) and `docs/qa-2026-09-18/scripts/lib/profile.cjs` `cloneProfile("reading-<n>")`. Base `https://k-ig-core.vercel.app`. Target `L` (run for pr001 as free, one paid, e.g. pr100, plus pr127 single-sentence, pr256 boundary, and the `-1` page of one of them).

### 10.0 Setup
1. Launch Edge on a cloned licensed profile. `Page.bringToFront`; `Emulation.setFocusEmulationEnabled({enabled:true})` (hidden page ⇒ `stopSpeech`).
2. `Browser.grantPermissions({origin: BASE, permissions:["clipboardReadWrite","clipboardSanitizedWrite"]})`.
3. `Page.addScriptToEvaluateOnNewDocument` with hooks:
   - Wrap `HTMLMediaElement.prototype.play`: push `{t:Date.now(), src:this.src, rate:this.playbackRate}` to `window.__kigPlays` (skip `data:`); on first sight add `ended`/`error`/`pause` listeners pushing `{type, src, code:this.error?.code}` to `window.__kigAudioEv` (the element is not in the DOM, so events must be hooked on the element).
   - Wrap `speechSynthesis.speak`: push `u.text` to `window.__kigSynth` (ignore the `" "` primer) — any non-empty entry means a clip failed.
   - Optional mic stub (only in the mic sub-test run): define `window.webkitSpeechRecognition` as a class whose `start()` fires `onstart`, then `onresult` with `{resultIndex:0, results:[Object.assign([{transcript: window.__kigSay}], {isFinal:true})]}`, then `onend`; `window.__kigSayError` makes it fire `onerror({error})` instead.
4. `Network.enable`; collect `responseReceived` for `/audio/` (url, status, `cache-control`, `content-range`) and every `status >= 400`; collect `Runtime.consoleAPICalled`/`exceptionThrown`.
5. Snapshot localStorage keys of §7 for `L` (and restore them at the end).

### 10.1 Load and shell
1. Navigate `BASE/reading/L`. Assert document 200, no `[data-kig-paywall]`, `h1` = `NNN회 · 원문 독해 & 리스닝`, `link[rel=canonical]` href ends `/reading/<main id>`, robots meta per §4.1.
2. Wait until `button` with text `Step 2 · 핵심 어휘` exists, then 500 ms more (hydration + progress restore).
3. Assert course link, prev/next hrefs and aria-labels (§9), bookmark/complete button aria-labels match the snapshot.
4. Header stats line equals §4.2 formula values.

### 10.2 Top player
1. Assert initial: aria `재생`, `정지` disabled, counter `1/n`, status `▶ 재생 버튼을 눌러 전체 듣기`, `1×` `aria-pressed=true`, range `aria-valuetext` `1번째 문장 / 전체 n문장`.
2. Click `재생` (trusted: `Input.dispatchMouseEvent` at the button centre). Expect `__kigPlays[last].src` ends with `key(S[0].english)`, network 200/206, aria `일시정지`, status `🔊 음성 읽는 중…`, `정지` enabled.
3. Wait for `ended` of S0 → within ~300–1000 ms a play of S1; counter `2/n`. Let the whole queue run once: assert plays are exactly S0..S(n-1) in order, each with `ended`, no `error`, `__kigSynth` empty, final status back to idle and counter `1/n`.
4. Start again; click `일시정지` → `__kigAudioEv` has `pause`, status `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기`; click again → resumes same src.
5. `다음` → new play of S(i+1); `이전` → S(i). Press `1.2×` while speaking → new play of current sentence with `rate 1.2`, `aria-pressed` moves. Restore `1×`.
6. `정지` → counter `1/n`, `정지` disabled. Idle `다음` → play of S1 (start index 1).
7. Focus the range (`aria-label="문장 이동"`), send ArrowRight ×2 then keyUp → play of S2.
8. Stop. Focus `body`, dispatch trusted Space → play starts; Space again → pause. Stop.
9. Pause timing edge: press pause 100 ms after an `ended` (inside the 300 ms gap) and record whether the next clip still starts (§12-13).

### 10.3 Step 1
1. `section[aria-label="Speed Reading"] [data-sentence-id]` count = n; for each i: `data-sentence-id` = `S[i].id`, `> span` text = `S[i].english`, `sup` text `[i+1]`.
2. For each i: `mouseMoved` to span centre → bar contains `[i+1]` and `👉 ` + `S[i].korean` exactly and `1:1 직독직해`; move to a blank area → placeholder text.
3. Click sentence 0 → play of key(S0) with rate 0.95; span class contains `bg-red-500/15`. Click it again before `ended` → `pause` event, class removed, no new play. Click sentence 1 and let it end → class removed.
4. Stuck-highlight probe: click sentence 0, then immediately switch to Step 2 and click card 0's `🔊`, return to Step 1 → record whether sentence 0 still has `bg-red-500/15` (§12-4). Same with `속독 측정 시작` while a sentence plays.
5. Copy: click `지문 전체 복사` → text `✓ 복사 완료`; `navigator.clipboard.readText()` = `S.map(e=>e.english).join(" ")`; after 2.1 s text `지문 전체 복사`.
6. `# 번호 ON` → `# 번호 OFF`, zero `sup` in Step 1; toggle back.
7. `크게`/`특대`/`보통` → `aria-pressed` and computed `font-size` 18/20/16 px on the passage container (`section[aria-label="Speed Reading"] .font-serif`).
8. WPM too-fast: `속독 측정 시작` → button `완독 완료! (속도 측정)`, timer `00:00`; click finish at once → card `측정값을 저장하지 않았습니다`, message with `1초`; localStorage wpm key unchanged; buttons `다시 측정 시작` and `↺` present.
9. `↺` → timer `00:00`, card gone, `속독 측정 시작`.
10. WPM valid: start; wait until the timer text reads `00:30` (poll the text), click finish immediately, read E from the timer (it stops on finish) → card `{round(wc/E*60)} WPM`, badge per thresholds, `{wc}개 단어를 {E}초 만에 완독하셨습니다. (내 최고 기록: {best} WPM)`; localStorage = new value if higher than snapshot.
11. Slower run (e.g. 60 s) → stored best unchanged; card `내 최고 기록` shows the higher value. Reload → run a 30 s measurement again and check `내 최고 기록` reflects the stored best.
12. Click `독해 이해도 퀴즈 풀기 ➔` → Step 3 section visible; then click bottom `다음 Step →` and record which section opens (§12-5).

### 10.4 Step 2
1. Click `Step 2 · 핵심 어휘`. `총 14개 핵심 어휘`. Cards = `section[aria-label="Key Vocabulary"] .grid > div` (14). For card i: first span = `V[i].partOfSpeech`, second = `V[i].word`, index `#01`… .
2. Card i `💡 뜻 확인하기` → span text = `V[i].korean` exactly (do all 14 individually on one load); after the 14th the toggle reads `🙈 전체 뜻 가리기`.
3. Toggle → 14 `💡 뜻 확인하기`, label `💡 전체 뜻 보기`; toggle again → all 14 meanings.
4. For each card: click `button[title="발음 듣기"]` → play of key(`V[i].word`) with rate 0.9, icon `⏹️` while playing, `🔊` after `ended`; network 200/206. Click the card body of one card → same clip. Click `🔊` twice fast → second click stops (pause event).

### 10.5 Step 3
1. Click `Step 3 · 독해 퀴즈`. Assert absent: `Q1.`, `독해력 실전 인출 테스트`.
2. Compute expected items with the real `generateClozeItems` (§5.1). Assert `{k}문항`, item count k, each `p` = `maskedSentence`, `_______` present, options include exactly one string === `missingWord`, other options are lower-case words of the passage, options unique.
3. Correct path: click the `missingWord` option in every item → `✓ 정답입니다!`, every option `disabled`, chosen has `border-emerald-500`.
4. Reload page, go to Step 3 again (options re-shuffled — re-read), click a wrong option in every item → `❌ 정답은 '{missingWord}' 입니다.`, chosen has `line-through`, the correct option has `border-emerald-500`, all disabled. Clicking again changes nothing.
5. Leak check per item: masked sentence must not contain `missingWord` as a whole word (case-insensitive); an option starting with a capital while others are lower-case = giveaway (§12-1, 12-2).
6. Mic: target box = `S[0].english`. Without stub record what headless shows (unsupported notice or `음성 인식 오류: …`). With stub: `__kigSay = S[0].english` → button `100점 (🌟 모든 단어 일치 (Excellent!))`, `단어 일치 N/N`, transcript quoted, all chips green, `↺ 다시 녹음` present. `__kigSay = "hello world"` → score from the real `evaluatePronunciation`, label per thresholds, red chips. `__kigSayError = "not-allowed"` → the permission message. `__kigSayError = "no-speech"` → `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.`

### 10.6 Step 4
1. Click `Step 4 · 원문 대조`. `{n}개 문장 1:1 정합`. EN spans n, KO spans n, same `data-sentence-id` order; EN `> span` = english, KO `> span` = korean (exact, every i).
2. `영어만` → KO column has class `hidden` (computed display none), `aria-pressed` true; `한글만` → EN hidden; `양방향` → both visible (side by side at 1366 px width).
3. Hover EN i → HUD `#{i+1}`, english, `👉 korean`; both column spans i highlighted. Hover KO j → HUD shows j.
4. Click EN i → play of key(S[i].english); move mouse away → HUD still shows i (pinned). Click KO j → HUD j, no new play. Click KO j again → unpinned, idle HUD text. Click EN i twice after the clip ended → record pin state and whether audio started again (§12-7).
5. With a pin, click HUD `🔊` → play of that sentence; `닫기` → idle HUD.
6. Pin a sentence, switch to Step 1 → the translation bar shows that sentence with the mouse outside (§12-6).
7. Number toggle and font size apply to both columns.

### 10.7 Notepad, bookmark, completion
1. Textarea (`aria-label="독해 핵심 메모 & 어휘 노트"`, placeholder exact). Type `QA 메모 0918 테스트` (trusted `Input.insertText`), wait 600 ms → `자동 저장됨 (…)`, counter `{len}자`, localStorage JSON `notes` equal. Reload → same text. Clear, wait 600 ms → stored `notes:""`. Restore the snapshot value.
2. `북마크` → `북마크됨`, aria `북마크 해제`, `kig:progress:bookmarks["reading:L"] === true`; open `/reading` → `★ 북마크 (x)` includes it, filter shows the card (open its section). Toggle back and verify key removed.
3. `완료 체크` → `학습 완료`, aria `학습 완료 취소`, `kig:progress:completed["reading:L"] === true`; `/reading` → `학습 진도율` count +1, card `✓ 완료`, section `· 1개 완료`. Toggle back. Repeat on `L-1` to record whether the course counter counts script pages (§12-10).

### 10.8 Step nav, prev/next, script page, mobile
1. Reload; bottom `← 이전 Step` disabled; `다음 Step →` three times → Steps 2,3,4, then disabled; `← 이전 Step` back to 3.
2. Click `다음 강의` → URL `/reading/<next>`; Step 1 active, timer `00:00`, notepad = next lesson's stored note, header stats of next lesson, cloze fresh.
3. Open `L-1`: same h1, same sentences/cards, prev/next per §9, canonical → main, notepad/WPM empty unless set for `-1`.
4. Mobile viewport (`tab.viewport("mobile")`, touch emulation): tap Step 1 sentence (`Input.dispatchTouchEvent`) → bar shows Korean and the clip plays; Step 4 idle HUD hidden; step tabs 2×2 grid; no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).
5. Negative URLs of §9 → 404 status and visible not-found text.
6. Anonymous (fresh profile, no cookie): `/reading/pr001` full; `/reading/pr003` paywall texts of §8; clip of pr003 S0 → 403; clip of pr001 S0 → 200/206 `private, max-age=31536000, immutable`.
7. End: console errors / exceptions / 4xx-5xx other than expected = 0; restore localStorage snapshot; write changes to `out/data-changes.md`.

---

## 11. Cannot be (fully) automated

| Feature | Why | What a driver can still do |
|---|---|---|
| Real microphone recognition (Step 3) | needs a microphone, a speaking person, and Google's recognition service; headless has neither | stub `webkitSpeechRecognition` and verify scoring/UI; record the unstubbed headless behaviour |
| Hearing the audio | `--mute-audio`, no ears; voice quality, pronunciation and sentence cut-offs need a listener | verify URL, status, `ended` without `error`, clip duration vs text length (`audio.duration`) |
| Web Speech fallback voices | headless Edge usually has no voices; a real device's fallback voice cannot be judged | detect fallback use through the `speechSynthesis.speak` hook |
| iPhone Safari / KakaoTalk in-app behaviour (unlock, `openExternalBrowser` intents, stream fallback) | real device/app required | none; list as a manual check for the owner |
| Touch-and-hold / real finger hover on phones | CDP touch emulation is not a real touch stack | emulate taps only |
| Reading-speed meaningfulness | timer measures clicks, not reading | arithmetic only |
| Translation / card correctness, pedagogy | human judgment | extract text for content review |
| Visual polish (animations use `animate-in`/`fade-in` classes; sticky HUD overlap) | needs eyes | screenshots at 3 widths |
| Clipboard on a real phone | permission UX differs | granted-permission check on desktop |

---

## 12. Suspicious code (possible defects) — ALL UNVERIFIED

1. **Cloze shows the answer when the word occurs twice in the sentence.** `readingUtils.ts:732-733` masks only the first case-insensitive match. Computed with the real function over the data: 18 items — pr006#3 `certain`, pr007#1 `music`, pr024#2 `Korean`, pr034#1 `sense`, pr054#1 `marketing`, pr058#1 `adult`, pr100#1 `mothers`, pr105#3 `degree`, pr107#1 `magazines`, pr134#3 `speed`, pr141#3 `bring`, pr143#3 `information`, pr145#3 `makes`, pr153#3 `choose`, pr177#3 `culture`, pr193#1 `cream`, pr198#2 `knows`, pr232#2 `thousands`.
2. **Capitalized answer gives itself away.** Distractors are lower-cased (`readingUtils.ts:719`), the answer keeps its case (731, 746). 21 items: pr008#3 `February`, pr024#2 `Korean`, pr069#1 `Europe`, pr069#3 `Heungdeok`, pr072#3 `Edward`, pr074#1 `Shakespeare`, pr120#3 `Pascal`, pr125#3 `Korea`, pr150#1 `Earth`, pr150#2 `Earth`, pr171#1 `Congress`, pr178#3 `Frankly`, pr183#3 `Bannister`, pr195#2 `London`, pr203#1 `Korean`, pr207#1 `Congress`, pr211#2 `Darwin's`, pr221#2 `Latin`, pr228#1 `Sullivan`, pr243#2 `Korea`, pr254#2 `Dostoevsky`.
3. **Cloze options are random per visit** (`Math.random` at `readingUtils.ts:741, 746`), and a distractor can be an inflection of the answer (two runs gave e.g. pr055 `relationships`~`relationship`, pr090 `influences`~`influenced`, pr149 `beliefs`~`believe`, pr207 `houses`~`house`, pr227 `blankets`~`blanket`) → two defensible options. Non-deterministic; must be sampled.
4. **"Playing" highlight can stick.** `stopSpeech()` never calls the old run's `onEnd` (`speech.ts:1223-1233`). `playWordAudio` clears only `playingWord`, `playSentenceEn` only `playingSentence` (RLV 412-444); the WPM start (RLV 78-83) and the top player also stop speech. Expected symptom: sentence stays red / card keeps `⏹️`; the next click on it "stops" silence instead of playing.
5. **Step nav desync.** `독해 이해도 퀴즈 풀기 ➔` (RLV 650-656) switches to Step 3 without "Step" in its text, so `LessonStepNavigation` (36-40) keeps currentStep 1: `다음 Step →` then opens Step 2 and `← 이전 Step` stays disabled while Step 3 is shown.
6. **Pin from Step 4 leaks into Step 1** (RLV 346-354, 716-734): the Step 1 bar keeps showing the pinned translation and Step 1 has no control to unpin.
7. **Step 4 EN click on the pinned sentence unpins but starts audio** when it is not playing (RLV 1133-1136): pin toggles off while `playSentenceEn` plays.
8. **HUD `발음` label never shows.** `hidden xs:inline` (RLV 1230) but no `xs` breakpoint exists (`src/app/globals.css` has no `--breakpoint-xs`; Tailwind v4 default has none). The button has no aria-label → accessible name is only `🔊`. Also `animate-in`, `fade-in`, `slide-in-from-top-2` utilities have no plugin imported (cosmetic no-op).
9. **Copy failure is silent**: `navigator.clipboard.writeText(...).then(...)` without catch (RLV 448-451) → unhandled rejection and no feedback when permission is denied or the API is missing.
10. **Course progress counts script pages.** The `-1` pages show `완료 체크`/`북마크`, keys `reading:prNNN-1`; `CourseDashboard.tsx:213-221` counts every `reading:*` key against `totalLessons` 256 → `x / 256` can exceed 256 or the percent can pass 100 %, `미완료 (256-x)` is wrong, and `★ 북마크 (x)` counts bookmarks the filtered list cannot show.
11. **256 script pages are orphaned duplicates**: no UI link, not in search or sitemap, `isScript` ignored (RLV 182), identical content, but separate notes/WPM/bookmark/complete keys; the `-1` page's "이전 강의" shows the same title as its own h1. The course page comment (`src/app/[course]/page.tsx:95-98`) promises a script button that does not exist.
12. **Pronunciation normalization.** `speechRecognition.ts:71` deletes `'` before the contraction rules (72-89), so those rules never match (`don't` vs spoken `do not` counts as wrong); curly `’ “ ”` are not stripped (first sentence of pr029, pr088, pr157, pr165, pr193, pr201, pr214, pr225, pr236 contains curly quotes) → a perfect reading may not reach 100.
13. **Pause inside the 300 ms queue gap is lost**: between clips `active` is null, so `pauseSpeech` (`speech.ts:1240-1273`) takes the synthesis branch, while the gap timer (`1164-1168`) still starts the next clip, and `playUnifiedClip` emits `paused:false` (780).
14. **Global Space shortcut** (`AudioPlayer.tsx:182-198`) calls `preventDefault` for Space on any focused element except inputs → keyboard users pressing Space on a step tab, cloze option, card button or the copy button toggle the top audio instead of activating the control.
15. **WPM re-measure keeps the old result visible** — `start()` (RLV 78-83) does not call `onReset`, so the previous result card / too-fast card stays on screen while the new run is timing.
16. **Dead state / dead bundle code**: `readingScore` set (RLV 339, 1050) never shown; the whole generated quiz (`readingUtils.ts:397-680`) and its Korean texts ship in the public client chunk although `SHOW_GENERATED_QUIZ=false` (`624` is a paraphrase written for pr081 — confirm it is not lesson text).
17. **Metadata description shows the raw code** (`page.tsx:80-82`): `[ pr001 ] — 001회 · 원문 독해 & 리스닝. K-IG 핵심 어학 과정.`; pr126-1 `[ pr 126-1 ]`.
18. **Progress restore race**: `ProgressProvider` starts with `{}` and restores in an effect (116-138); a toggle before that effect runs would write a map with only the new key and drop other bookmarks/completions. Low risk for humans; drivers must wait.
19. **Card `div` is clickable but not focusable** (RLV 790-794; no role/tabIndex): keyboard users can reach only the inner `🔊` and `💡 뜻 확인하기` buttons (acceptable, but note for a11y).
20. **Touch: Step 1 translation only through a tap that also plays audio** (RLV 691-693): on phones there is no way to see a sentence's Korean in Step 1 without triggering speech, and the hover state stays until another element is tapped.
21. **`visibilitychange → hidden` stops playback** (`speech.ts:259-263`): switching apps/tabs or locking the phone stops the whole-passage player (intended, but a background-listening user loses position — counter returns to `1/n`).
