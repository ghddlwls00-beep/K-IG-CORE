# GRAMMAR I (grammar1) — screen & feature map for the 2026-09-18 audit

> Stage 1 (source reading only). Written and checked by the same agent (Claude). Nobody else has reviewed it.
> Every count below was computed with node from `content/` and the real TS modules
> (`docs/qa-2026-09-15/scripts/tsload.cjs`). Nothing was run against production.
> Line numbers are for the `main` checkout at `9d6e15d`.
> §12 lists possible defects. None of them has been reproduced.

---

## 1. Routes & data sources

### 1.1 Routes

| Route | File | What it does |
|---|---|---|
| `/grammar1` | `src/app/[course]/page.tsx` + `src/components/CourseDashboard.tsx` | Course list: 6 stage accordions, 53 lesson cards |
| `/grammar1/gh1-NNN` (NNN even) | `src/app/[course]/[lesson]/page.tsx` | Main lesson (53 of these) |
| `/grammar1/gh1-NNN-1`, `-2` (NNN even) | same page | "Script" pages. Each shows about half of the main lesson's items, with the same view (44 pages) |
| `/grammar1/gh1-NNN` or `gh1-NNN-k` (NNN odd) | same page, `page.tsx:128-137` | **307 redirect** to the even partner (`gh1-007`→`gh1-006`, `gh1-007-1`→`gh1-006-1`). The redirect happens **before** the licence check. |
| `/t/grammar1` | `src/app/t/[tab]/page.tsx` | Tab intro page (`tabs.ts:42-48`, label "GRAMMAR I") |
| Unknown ids (`/grammar1/gh1-018`, `/grammar1/gh1-006-3`) | `src/proxy.ts:117-152` | Rewritten to `/_kig/route-guard/not-found`, which returns a readable 404. The allow list is `src/lib/generated/validRoutes.json` → `lessons.grammar1` (194 ids). |
| Speech clips | `/audio/azure-ava/v1/<key>.mp3` → `src/app/audio/[...path]/route.ts` → `src/lib/mediaRoute.ts` | The only audio the GRAMMAR I UI requests |
| Original MP3s | `/audio/grammar1/gh1-NNN.mp3` | Listed in lesson JSON `audio[]`, but **never requested by the UI**: `AudioPlayer` is always in TTS mode for non-CNN paths (see §6) |

`generateStaticParams` in `page.tsx:23-25`. `dynamicParams=false` has no effect here; the proxy does the guarding instead.
`generateMetadata` (`page.tsx:65-108`) sets:
- `title` = presentation title
- canonical: a script page points at its main page, via `canonicalLessonId`, `content.ts:175-181`
- `robots: {index:false, follow:true}` on every non-free lesson

The sitemap lists only free, non-redirect, self-canonical lessons: `gh1-006` and `gh1-008` (`sitemap.ts:57-68`).

### 1.2 Data files

- **Course index:** `content/courses/grammar1.json`
  - keys: `course` ("grammar1"), `tab`, `lessonCount` (53), `groups[]`, `lessons[]`
  - `groups[]`: `{label, lessons: string[]}`
  - `lessons[]`: LessonSummary `{id, title, label, series:"gh1", variant:"main"|"script", unit, part:null, order, hasAudio, menuLabel}`
- **Lesson files:** `content/lessons/grammar1/<id>.json`, type `Lesson` in `src/lib/types.ts:173-215`
  - fields: `id, course, series, variant, pairId, title, label, menuLabel, unit, part, order, audio[], video[], blocks[], legacyPath, legacyEncoding`
  - `audio[]`: `{src, legacySrc, autoplay, label?}`
  - `blocks[]` types used in grammar1 (all 194 files): `heading` 191, `instruction` 332, `sentences` 214, `choice` 194, `dictation` 194, `paragraph` 19, `hints` 4
  - `sentences.items[]`: `SentenceItem {n: string, text: string, alternatives?: string[]}` (`types.ts:134-143`). No other keys occur.
  - **Even** file (`gh1-006`) = Korean prompts. **Odd** file (`gh1-007`) = English model answers, plus `alternatives` (all 453 alternatives live on the odd side).
  - The view **ignores** `heading`, `instruction` (except in 07강), `paragraph`, `hints`, `choice` and `dictation` blocks. The 19 `paragraph` blocks are leftover extraction fragments, e.g. `gh1-038` `"20그것들은 책들이지?"`, `gh1-100` `"않았니)?"`, `gh1-095` alternates. They are duplicates of item text or alternatives and are not rendered.
- **Course def:** `src/lib/courses.ts:66-77`
  - title "GRAMMAR I"
  - description "한국어 문장을 즉시 영어로 변환하는 기초 영작 훈련. 6단계 체계적 문장 구조 정복."
- **Titles:** `src/lib/curriculumPresentation.ts`
  - `G1_EVEN_PRIMARY_IDS` (lines 17-27) gives the lecture number
  - `formatGroupTitle` stage names (lines 45-55)
  - `formatLessonPresentation` (lines 117-139)
- **Free list:** `src/lib/license.ts:75-80`
- **Free speech keys:** `src/lib/generated/freeSpeechKeys.json`, built by `scripts/buildFreeSpeechKeys.mjs`
- **Local clip inventory** (a proxy for R2): `public/audio/azure-ava/v1/*.mp3`, 50,383 files
- **Search index:** `public/search-index.json` has 53 grammar1 entries (mains only). Built by `scripts/buildSearchIndex.ts:39`, which skips `variant==="script"`.

### 1.3 How a page's item list is built (runtime pairing)

`getLessonContext` (`content.ts:124-163`) pairs grammar1 pages **by number, not by the JSON `pairId`** (`content.ts:139-156`):
- even N → `gh1-(N+1)<same suffix>`, falling back to `gh1-(N+1)`
- odd N → `gh1-(N-1)<same suffix>`

The JSON `pairId` of every `-1`/`-2` file points at the **main** id (e.g. `gh1-006-1.pairId = "gh1-006"`), while code pairs it with `gh1-007-1`. Nothing reads the JSON field at runtime, so there is no runtime effect (86 files disagree).

The page passes `blocks` (own file) and `pairBlocks` (partner file) to `LessonBody` → `GrammarLearningView` (`LessonBody.tsx:152-163`). Items are built in `GrammarLearningView.tsx:156-217`:

```
mainSentences = all `sentences` blocks of own file, flattened (flatMap — ALL blocks)
pairSentences = same for partner
count = max(len)
for i: tM = main[i].text, tP = pair[i].text
  isEnglish(t) = latin>=hangul && latin>0          (42-47)
  if isEnglish(tM)&&!isEnglish(tP): en=tM, ko=tP, alt=main.alternatives
  elif !isEnglish(tM)&&isEnglish(tP): en=tP, ko=tM, alt=pair.alternatives
  elif hasKorean(tM): ko=tM, en=tP, alt=pair.alternatives   ("branch C")
  else: en=tM, ko=tP, alt=main.alternatives
  cleanText(x) = strip leading /^\s*\d+[.)]\s*/ , " / "→" ", trim   (54-60)
  item = {id: i+1, numberLabel: m.n || p.n || i+1, koreanText, englishText, alternatives (cleaned, non-empty), clozeParts, targetKeywords}
```

**Expected result from data:** item i on page P is the i-th entry of the flattened `sentences` items of P and of its partner.
- `id` is the **1-based index**. It is **not** `n`: on `gh1-024`, ids are 1..25 while labels are 26..50.
- "Branch C" occurs 23 times, e.g. `gh1-084 #1`: the Korean prompt has more Latin letters (English vocabulary hints) than Hangul. The en/ko sides still resolve correctly for all 2,501 items (checked: no English side contains Hangul, and every Korean side contains Hangul).

---

## 2. Counts & id sequences (computed)

- **Index:** 194 lessons = **53 main + 141 script**. 194 files on disk. No index/disk mismatch and no duplicate ids.
- **Script pages (141):**
  - 53 bare odd ids (`gh1-007` … `gh1-123`): answer sheets, **redirect**
  - 44 odd `-1/-2` pages: **redirect**
  - 44 even `-1/-2` pages: **render**
  - So **97 distinct rendered pages** = 53 main + 44 half-lesson pages.
- **Main ids (53):**
  - Stage 1: 006 008 010 012 014 016
  - Stage 2: 020 022 024 026 028 030 032 034 036 038 040 042
  - Stage 3: 044 046 050 052 054
  - Stage 4: 056 058 060 062 064 066 068 072 074 076 078
  - Stage 5: 080 082 084 088 090 092 094 096 098 100 102 106 108
  - Stage 6: 110 112 116 118 120 122
- **Number gaps:** 018/019, 048/049, 070/071, 086/087, 104/105, 114/115 do not exist (so they answer 404).
- **Groups** (`grammar1.json.groups`): 6 groups of 6/12/5/11/13/6 = 53.
  - Every main is grouped, and no group contains a non-main.
  - Labels `[ 제 1 단계 ]`…`[ 제 6 단계 ]` are rendered as:
    - "제 1단계 : 기본 문장 구조 훈련 (Stage 1)"
    - "제 2단계 : 어순 및 시제 훈련 (Stage 2)"
    - "제 3단계 : 조동사 & 수동태 훈련 (Stage 3)"
    - "제 4단계 : 의문사 & 부정구문 훈련 (Stage 4)"
    - "제 5단계 : 접속사 & 복문 확장 훈련 (Stage 5)"
    - "제 6단계 : 실전 고급 복합 구문 (Stage 6)"
- **Mains that have `-1`/`-2` pages (22):** 006 008 010 012 014 016 042 044 046 050 052 054 056 058 078 080 110 112 116 118 120 122.
- **Lesson titles:** `NN강 · 기초 영작 훈련`, where NN = index in `G1_EVEN_PRIMARY_IDS` + 1 (gh1-006=01강 … gh1-020=**07강** … gh1-084=37강 … gh1-122=53강).
  - `-1`/`-2` pages get the same title as their main.
  - Odd ids get `String(unit)`, e.g. "7강 · 기초 영작 훈련" / "123강 · 기초 영작 훈련". These titles only appear in script-page prev/next links (§9).
  - Subtitle: "제 k단계 (…)"; badge "🎙️ 마이크 채점"; code "Lesson NN".
- **Items:** 1,635 on the 53 mains; 866 on the 44 rendered script pages; total 2,501 rendered items.
  - Per main: 006:42 008:42 010:46 012:35 014:43 016:33 020:24 022-034:25 each, except 036:27 038:25 040:25 042:40 044:40 046:37 050:42 052:40 054:46 056:35 058:37 060:32 062:26 064:27 066:25 068:27 072:14 074:29 076:28 078:44 080:39 082:32 084:31 088:19 090:20 092-102:19 each 106:35 108:35 110:38 112:37 116-120:37 each 122:38
  - Label ranges continue across mains inside a stage. For example, 022 = n 1..25 and 024 = n 26..50; 044 = 41..80; 046 = 81..117; 092 = 39..57 (**39 is also the last label of 090**).
- **Split pages vs mains:** For 21 of the 22 mains, `-1` ∪ `-2` equals the main item set exactly, in order, with no duplicates.
  - **Exception `gh1-110`:** main has 38 items; `-1` has 20 (n 71..90) and `-2` has 19 (n 90..108). Item **#90 appears on both split pages**.
- **Alternatives:** 453 on rendered pages (305 on the 53 mains).
- **Cloze blanks:**
  - 1,158 items have 1 blank and 1,343 have 2 blanks, so 3,844 blank inputs across rendered pages.
  - 304 items have no keyword, so their blank is the first ≥3-letter word.
  - 0 items have no blank.
- **Short items:** 472 items have ≤3 words. On these, a single wrong or misspelled word can never earn partial credit (§5).
- **Korean prompts with English vocabulary hints** (Latin letters inside the Korean, e.g. "(leave)"): 83 on mains. Heaviest: gh1-066:12, gh1-084:11, gh1-082:9, gh1-072:8.
- **Numbered raw text** (stripped by `cleanText`): `gh1-009 #1 "1. I was poor."`, `gh1-009-1 #1`, `gh1-023 #1 "1.I am a boy."`.
- **Multiple `sentences` blocks in one file:** gh1-015 (2), gh1-015-2 (2), gh1-038 (2), gh1-047 (2), gh1-047-2 (2), gh1-067 (2), gh1-069 (4), gh1-095 (8), gh1-100 (2), gh1-116 (2), gh1-116-2 (2), gh1-123-2 (2). The view flattens them; the top player does not (§6, §12).
- **`order` oddities** in the index: gh1-008 has order 4 (the same as gh1-007-1); gh1-089 has order 135 (the same as gh1-088); **gh1-016-1 is the last array element** (order 190) instead of sitting after gh1-016. Array position drives script-page prev/next (§9).
- **JSON `audio[]` oddities:**
  - gh1-020 and gh1-021 have `audio: []`, so the top player shows the label "전체 듣기"
  - gh1-058 has only gh1-058.mp3; gh1-088 has only gh1-088.mp3; gh1-102 has only gh1-103.mp3
  - `-2` odd pages reuse the full odd mp3 (`gh1-007-2.audio = gh1-007.mp3`, legacyPath `gh1-007.htm`)
  - Cosmetic only, because the MP3s are never played.
- **Leftover instruction label:** `gh1-059` / `gh1-059-1` carry "영작문제 5" instead of "영작문제 5 답안", and `gh1-103` has "영작문제 2". Not rendered.

---

## 3. Components (file:line)

| Component | File | Role for GRAMMAR I |
|---|---|---|
| LessonPage | `src/app/[course]/[lesson]/page.tsx:110-401` | redirect (128-137), server licence gate (148-182), nav (264-326), h1 (328-332), top AudioPlayer (343-365), LessonBody (368-384), LessonStepNavigation (398), `extractSentencesForAudio` (428-530) |
| LessonBody | `src/components/LessonBody.tsx:31-34, 152-163` | dynamic import of GrammarLearningView; skeleton while loading (13-21) |
| **GrammarLearningView** | `src/components/GrammarLearningView.tsx` (1,322 lines) | the whole lesson UI: 4 steps, 07강 rule summary, storage |
| grammarGrading | `src/lib/grammarGrading.ts` | exam / "정답 일치" / cloze grading |
| VoiceSpeakingTester | `src/components/VoiceSpeakingTester.tsx` | mic button in Step 1 and Step 3 |
| speechRecognition | `src/lib/speechRecognition.ts` | Web Speech STT + `evaluatePronunciation` |
| speech / unifiedSpeech | `src/lib/speech.ts`, `src/lib/unifiedSpeech.ts` | Ava clip playback + browser TTS fallback |
| AudioPlayer | `src/components/AudioPlayer.tsx` | top "whole lesson" sentence player |
| LessonActionButtons | `src/components/LessonActionButtons.tsx` | 북마크 / 완료 체크, recent lesson |
| LessonStepNavigation | `src/components/LessonStepNavigation.tsx` | bottom ← 이전 Step / 목록으로 / 다음 Step → |
| ProgressProvider | `src/components/ProgressProvider.tsx` | localStorage progress/bookmarks/recent |
| LicenseProvider | `src/components/LicenseProvider.tsx` | client licence state, `isUnlocked` (279-308), reload after verify (193-201) |
| LessonPaywall | `src/components/LessonPaywall.tsx` | locked lesson body |
| CourseDashboard | `src/components/CourseDashboard.tsx` | course list page |
| media gate | `src/lib/mediaAccess.ts:86-91`, `src/lib/mediaRoute.ts` | clip access |
| proxy | `src/proxy.ts` | route allow list, CSP nonce |

GrammarLearningView does **not** use i18n: every string is hard-coded Korean. i18n (`kig:lang`, `src/lib/i18n.ts`, `LanguageProvider.tsx:42`) touches only `AudioPlayer` aria-labels and the speed label:
- `player.play` "재생"
- `player.pause` "일시정지"
- `player.back5` "5초 뒤로" (only in non-TTS mode, which never happens here)
- `player.seek` "탐색"
- `player.speed` "속도"

It also touches `lesson.notMigrated` (not reachable for grammar1). The unused props `isScript` and `audioTracks` are accepted (`GrammarLearningView.tsx:21-28`) and ignored (117-123).

---

## 4. Every view and control

Wait for hydration: the text `Step 1 · 영작 훈련` appears after the dynamic import (the skeleton shows first).

### 4.0 Page chrome (server-rendered, licensed or free)

| Control | Exact text / aria | Effect / state |
|---|---|---|
| Back link | "← GRAMMAR I 목록" (`page.tsx:266-272`), in `nav[aria-label="강의 이동"]` | navigates to `/grammar1` |
| Bookmark | aria-label "북마크 추가" / "북마크 해제"; text "☆"+"북마크" / "★"+"북마크됨" (`LessonActionButtons.tsx:30-44`) | toggles `localStorage["kig:progress:bookmarks"]["grammar1:<pageId>"]` (true, or key deleted) (`ProgressProvider.tsx:224-236`) |
| Complete | aria-label "학습 완료 체크" / "학습 완료 취소"; text "완료 체크" / "✓"+"학습 완료" (`LessonActionButtons.tsx:47-67`) | toggles `localStorage["kig:progress:completed"]["grammar1:<pageId>"]` (`ProgressProvider.tsx:196-215`). No server call (server sync is STUDENT only). |
| Recent (automatic) | none | on mount writes `localStorage["kig:progress:recent"] = {course:"grammar1", lessonId, title:"NN강 · 기초 영작 훈련", courseTitle:"GRAMMAR I", updatedAt}` (`LessonActionButtons.tsx:23-25`) |
| Prev lesson link | aria-label `이전 강의: <title>`; visible "이전 강의" + title | only if prev exists (§9) |
| Next lesson link | aria-label `다음 강의: <title>`; visible "다음 강의" + title | only if next exists |
| h1 | `NN강 · 기초 영작 훈련` | none |
| Bottom step nav | `nav[aria-label="학습 단계 이동"]`: buttons "← 이전 Step", "다음 Step →", link "목록으로" (`LessonStepNavigation.tsx:64-89`) | finds `main button` whose textContent matches `/\bStep\s*(\d+)\b/` (4 pills) and clicks the pill. Prev is disabled at step 1 and next at step 4. `currentStep` also follows clicks on the pills (36-40). |

### 4.1 Lesson header toolbar (`GrammarLearningView.tsx:494-635`)

- **Title:** "✍️" + `Grammar 1 : 기초 영작 및 문법 훈련` + `총 {N}개 문항` (N = items.length) (498-508).
- **Autosave badge:** `{savedAt} 자동 저장됨` (512-517). Visible only after a real change, or when a saved snapshot with `at` was restored.
  - Format from `formatSavedAt` (66-73): `toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit"})`, e.g. `9. 18. 오후 7:05`.
- **Step pills:** `nav[aria-label="문법 4단계 학습 모드"]` (521-579). Visible text (textContent includes the emoji span):
  - "✍️ Step 1 · 영작 훈련" → `studyMode="composition"` (default)
  - "🧩 Step 2 · 빈칸 완성" → `"cloze"`
  - "⚖️ Step 3 · 구문 각인" → `"shadowing"`
  - "📝 Step 4 · 종합 평가" → `"exam"`
  - The active pill has class `bg-ink text-surface`. The pills have no aria-pressed/aria-current. `studyMode` is **not persisted**: a reload returns to Step 1.
  - Layout: `grid-cols-2` under 640px, `sm:grid-cols-4` above.
- **Voice speed:** buttons "1.0x" (title "음성 속도 1.0x") and "0.85x" (title "음성 속도 0.85x (천천히)"), `aria-pressed` (586-605). Sets `audioSpeed`, which is passed as `rate` to every item playback and becomes `audio.playbackRate` (`speech.ts:814`). Not persisted.
- **Font size:** buttons "기본" / "크게" / "특대", `aria-pressed` (607-632). Switches the classes in `fontStyles` (473-489):
  - Korean text: `text-[16px]` / `text-[18px]` / `text-[20px]`
  - English text: `text-[16.5px]` / `text-[18.5px]` / `text-[21px]`
  - Input: `text-[16px] sm:text-[15px]` / `text-[17px] sm:text-[16.5px]` / `text-[18px]`
  - Not persisted.

### 4.2 07강 only: folded rule summary (`GrammarLearningView.tsx:132-153, 638-659`)

- **Condition:** `lessonKey` matches `/^grammar1\/gh1-02[01]$/`. Only `/grammar1/gh1-020` renders it (gh1-021 redirects).
- **Source:** `instruction` lines of gh1-020 and gh1-021.
  - It picks whichever side has `^답:\s*\S` lines (gh1-021).
  - Each `(n)` line becomes a question. The following lines up to the next `(n)` become the answer, with `답:` stripped.
- **Markup:** a `<details>`, closed on load, containing `<summary>`: `📘 문법 확인 — be동사 규칙 8문항 (영작 전에 먼저 읽어 보세요)` and "▾". When opened, `<ol>` has 8 `<li>`, each `Q{i}` + question and `답` + answer.
- **Expected content** (computed):
  1. Q1 평서문(나는 소년이다 등등)일 때 영어의 문장순서는? — 주어가 먼저 나오고 그 다음에 동사가 나온다.
  2. Q2 우리말로 “이다, 있다”에 해당되는 영어 단어는? — am, is, are(be동사라고 함)이다.
  3. Q3 주어가 1인칭 단수(I:나)일 때 그것에 맞춰서 써야하는 be동사는? — am이다.
  4. Q4 주어가 3인칭 단수(he, she, it, this 등)일 때 써야하는 be동사는? — is를 쓴다.
  5. Q5 주어가 그 이외의 것일 때 써야하는 be 동사는? (we, you, they, those 등) — are를 쓴다.
  6. Q6 부정문의 문장 순서는? — 주어 + 동사 + not + 주격보어
  7. Q7 긍정적인 의문문일 때(나는 소년이냐? 등등) 문장 순서는? — 동사가 먼저 나오고 그 다음에 주어가 나오고 그 다음에 주격보어가 온다.
  8. Q8 부정적인 의문문일 때(나는 소년이 아니냐? 등등) 문장 순서는? — 동사 + 주어 + not + 주격 보어, 혹은 동사와 not을 합친 축약어(isn't, aren't) + 주어 + 주격 보어의 순서로 한다. 주어가 I 일 때의 축약형은 Aren't I …? 이다 (ain't 는 표준 영어가 아님).
- **Body:** the 4 steps run on gh1-020's 24 `sentences` items with gh1-021's English (n 1..24: "I am a boy." … "Aren't I your friend?"), exactly like every other lesson (commit `ebed505`). There is no separate view.

### 4.3 Step 1 · 영작 훈련 (composition) (`GrammarLearningView.tsx:664-927`)

**Dashboard (667-730)**
- "작성 진행률": `{answeredCount} / {N}` and `{progressPercent}%` plus a bar.
  - `answeredCount` = items with `answers[id].trim()` non-empty.
  - `progressPercent = round(answered/N*100)` (448-451).
- "자가 채점 정답률": `{correctCount} 개 맞음` and `{accuracyPercent}%`.
  - `correctCount` = items with `selfGrades[id]===true`.
  - `accuracyPercent = answered>0 ? round(correct/answered*100) : 0`. **Can exceed 100**, see §12.
- "일괄 동작":
  - "💡 전체 정답 보기" → `handleBatchReveal(true)`: sets `revealedAnswers["composition:<id>"]=true` for every item (391-401)
  - "🔒 전체 정답 가리기" → sets those keys to `false`
  - "↺ 모든 작성 내용 초기화" → `handleResetAll` (403-417):
    - `window.confirm("작성하신 모든 영작 내용과 자가 채점을 초기화하시겠습니까?")`
    - on OK: clears answers, selfGrades, clozeInputs, revealedAnswers, shadowingRepeats and examSubmitted, then `localStorage.removeItem(storageKey)`
    - the autosave effect then **writes an empty snapshot back** after 400 ms (§12)

**Per-item card (734-924)**, one per item in data order. The card border reflects `selfGrades[id]`: true → `border-emerald-500/50`; false → `border-amber-500/50`.

| Element | Exact text / attributes | Behaviour | How to compute expected |
|---|---|---|---|
| Number badge | `{numberLabel}` | none | `n` of the item |
| "🎯 정답 일치!" badge | shown when `answer non-empty && gradeAgainstReferences(answer,[en,...alts])==="exact"` (738-740, 760-764) | updates live while typing | §5 grader |
| "✓ 학습 완료" badge | `selfGrades[id]===true` | none | none |
| "↺ 복습 필요" badge | `selfGrades[id]===false` | none | none |
| Pronounce button | text "🔊"+"영어 정답 발음", title "정답 영어 발음 듣기"; while speaking "⏹️"+"정지", title "정지" (778-791) | `playEnglish(englishText,id)`. A second press while this id is speaking stops it. | clip `/audio/azure-ava/v1/{unifiedSpeechKey(englishText)}.mp3` at playbackRate = audioSpeed |
| Korean prompt | `<p>` = `koreanText` (796-800) | none | cleaned Korean `text` |
| Answer input | `input[type=text]`, aria-label `{numberLabel}번 영작 답안`, placeholder `이곳에 영어 문장을 영작해보세요... (예: I am...)`, autoCapitalize none, autoCorrect off, spellCheck false (805-815) | `answers[id]=value`. **The same `answers` map feeds Step 4.** | none |
| Clear | text "✕", title "지우기" (no aria-label), only when the answer is non-empty (816-825) | `answers[id]=""` | none |
| Mic | VoiceSpeakingTester, label "🎙️ 마이크로 말해서 영작하기" (829-838) | on a recognised result: `answers[id]=transcript`; if score≥80, `toggleSelfGrade(id,true)` (**toggle**, §12) | §4.7 |
| Reveal | "💡 정답 확인" / "🔒 정답 가리기" (844-855) | toggles `revealedAnswers["composition:<id>"]` (365-367) | none |
| Self-grade ✓ | "자가 채점:" label (hidden on mobile) + button "✓"+"맞음" (859-871) | `toggleSelfGrade(id,true)`: if already true, deletes the key; otherwise sets true (369-379) | none |
| Retry | "↺"+"다시 풀기" (872-884) | `handleRetry` (385-389): `answers[id]=""`, `selfGrades[id]=false` (**sets false**, does not delete), `revealedAnswers["composition:<id>"]=false` | card turns amber and shows "↺ 복습 필요" |
| Model answer card | only when revealed (889-921): header "모범 답안 (Model Answer)" (CSS `uppercase`, so innerText reads "모범 답안 (MODEL ANSWER)"), buttons "문장 복사" (→ "✓ 복사됨" for 2 s) and "🔊 발음 듣기"; `<p>` englishText; if alternatives exist `다른 정답: {alts.join(" / ")}` | copy → `navigator.clipboard.writeText(englishText)` (419-425, no catch); 🔊 → same as the pronounce button | englishText = cleaned odd-side `text`; alts = cleaned `alternatives` |

### 4.4 Step 2 · 빈칸 완성 (cloze) (`GrammarLearningView.tsx:932-1046`)

**Intro box** (934-938): `💡 문법 패턴 클로즈 퀴즈:` + "각 문장에서 핵심이 되는 문법 요소(동사, 접속사, 조동사, 전치사)가 빈칸으로 제시됩니다. …[빈칸 정답 확인]을 눌러보세요."

**Per item:**
- **Number badge.**
- **Listen button:** "🔊"+"전체 문장 듣기" (952-959), calls `playEnglish(englishText,id)`.
- **Korean prompt:** `<p>` = koreanText (963-965).
- **Sentence line:** `clozeParts` rendered in a flex row (968-1029). Every token is its own `<span>`, so punctuation and contraction pieces appear as separate flex items with a 6 px gap (e.g. `o`,`'`,`clock`).
- **Blank construction** (`buildCloze`, 75-115):
  - `tokens = en.split(/(\s+|[.,?!;:"'()]+)/)` (separators kept)
  - candidates = token indices whose `toLowerCase().trim()` is in `GRAMMAR_KEYWORDS` (30-40)
  - if there are none, the first token matching `/^[A-Za-z]{3,}$/`
  - blanks = the **first two** candidates
  - blank `pIdx` = token index; `answer` = the token as written (capital letters included)
- **Blank input:** `input[type=text]`, aria-label `{numberLabel}번 문장 빈칸` (**both blanks of an item share the same aria-label**), placeholder `___`, inline width `max(answer.length*14, 58)px` (999-1018).
  - `onChange` → `clozeInputs[id][pIdx]=value` (428-436)
  - `onBlur` → `clozeTouched["id:pIdx"]=true` (in memory only, not persisted)
- **Correct:** `gradeAnswer(value, answer)==="exact"` (978). The input turns emerald and a `<span role="status">✓</span>` follows it.
- **Wrong:** `!correct && value.trim()!=="" && (touched || value.trim().length >= answer.length)` (980-984). The input turns red and `<span role="status" title="다시 확인해 보세요">✗</span>` follows.
- **Reveal button:** "💡 빈칸 정답 확인" / "🔒 빈칸 가리기" (1033-1039), toggles `revealedAnswers["cloze:<id>"]`. While revealed, each blank is replaced by `<span>` = answer (986-995); typed values are kept.
- There is **no** batch reveal, score, counter or retry in Step 2.

**Expected result:** compute the blanks with the algorithm above. A typed value is ✓ iff, after lower-casing, curly→straight apostrophes, removing `.,?!;:"'()` and collapsing spaces, it equals the answer (with contractions expanded on both sides also tried). §10 has a gh1-006 table.

### 4.5 Step 3 · 구문 각인 (shadowing) (`GrammarLearningView.tsx:1051-1160`)

**Intro** (1053-1061): `🗣️ 구문 섀도잉 훈련:` + "카드를 누르면 발음이 재생됩니다. 소리를 들으며 억양과 문법 어순을 그대로 따라 말해보세요. (3회 이상 반복 권장)"; right side "목표: 각 문장 3회 이상 섀도잉".

**Per item card:** a `div` with onClick, not a button and not focusable.

| Element | Text | Behaviour |
|---|---|---|
| Card click (anywhere outside inner controls) | none | `handleRepeatIncrement` (439-445): `shadowingRepeats[id]+=1`, then `playEnglish`. A click while this id is speaking **stops** the audio and still counts. |
| Counter badge | `{k}회 연습` for k<3; `✓ 3회 달성!` for k≥3 (1084-1095) | none |
| Copy | `📋` / `✓`, title "문장 복사", aria-label "문장 복사" / "복사됨" (1099-1110) | stopPropagation; copies englishText; state lasts 2 s |
| Play | `🔊` / `⏹️`, title "발음 듣기" / "발음 정지" (1111-1126), **no aria-label** | stopPropagation; `playEnglish` (no count) |
| English | `<p>` englishText (1130-1132) | none |
| Korean | `<p>` koreanText (1134-1136) | none |
| Mic | VoiceSpeakingTester "🎙️ 내 발음 채점 및 섀도잉 검증", wrapped in a div with stopPropagation (1138-1154) | if score ≥ **70**: `shadowingRepeats[id]+=1` |

The speaking card gets the class `border-primary … ring-1` (1074-1076).

### 4.6 Step 4 · 종합 평가 (exam) (`GrammarLearningView.tsx:1165-1318`)

**Header** (1168-1194): h3 "📝 실전 영작 모의 시험" + instructions "각 번호의 우리말을 읽고 … [전체 채점하기]를 누르면 자동으로 점수와 상세 오답 분석이 제공됩니다."
- Note: the text says [전체 채점하기] while the button says "🎯 전체 시험 채점하기".
- After submit, a box with `role="status"` shows "최종 획득 점수" `{score}점`, `정답 일치: {exact}개`, `부분 일치: {partial}개`.

**Per item** (1198-1281):
- **Question line:** `Q{numberLabel}.` + koreanText.
- **Answer input:** aria-label `{numberLabel}번 시험 답안`, placeholder `답안을 입력하세요...`. **Disabled after submit.** Its value is the same `answers[id]` as Step 1.
- **After submit:**
  - Badge: "✓ 정답 (100점)" / "△ 부분 정답 (70점)" / "✕ 오답 (0점)". Empty answers get "✕ 오답 (0점)".
  - The input border turns emerald, amber or red.
  - A row shows `모범 답안:` + englishText + `(또는: {alts.join(" / ")})` if alternatives exist, plus a button "🔊 발음 청취" (plays).

**Sticky footer** (1285-1316):
- Counter: `작성 완료: {answered} / {N} 문항`.
- When not submitted and answered==0: `<span role="status">작성한 문항이 없습니다. 답안을 입력한 뒤 채점하세요.</span>`.
- Submit button: "🎯 전체 시험 채점하기", `disabled` when answered===0. Sets `examSubmitted=true`.
- After submit: button "↺ 답안 다시 수정하기" sets `examSubmitted=false` (answers are kept).

**Score** (455-470), where `grade_i = gradeAgainstReferences(answers[id]||"", [en,...alts])`:

```
score = round((exact + 0.7*partial) / N * 100)
```

`examSubmitted` **is persisted**. After a reload, Step 4 still shows the results and disabled inputs.

### 4.7 VoiceSpeakingTester (mic) (`VoiceSpeakingTester.tsx`)

- **Supported** = `window.SpeechRecognition || window.webkitSpeechRecognition` (`speechRecognition.ts:42-45`), checked on mount (33-35).
- **Unsupported, normal browser:** `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`.
- **Unsupported, in-app browser** (UA matches KAKAOTALK / Line / NAVER / Instagram / FB / DaumApps): `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` + button `🌐 Chrome으로 열기` (`🌐 Safari로 열기` on iOS). The button navigates to an `intent://` or `kakaotalk://web/openExternal?url=` URL (95-107).
- **Idle button:** "🎙️" + label without the emoji (131, 137-162); title "마이크를 누르고 영어 문장을 소리내어 말해보세요."
- **Listening:**
  - Button "⏹️" + "듣고 있는 중... (말씀하세요)".
  - A panel shows `실시간 음성 인식:` + interim text or "지금 영어로 말씀하세요...", and a button "완료" that stops recognition (177-194).
- **Result:**
  - Button text `{score}점 ({ratingLabel})`; extra button "↺ 다시 녹음" (title "다시 말하기") restarts.
  - Result card (216-285): `{score}점`, ratingLabel, `단어 일치 {matched}/{total}`, `인식된 내 음성:` "transcript", `단어별 발음 일치도:` word chips, `💡 {feedback}`.
- **Errors** (`speechRecognition.ts:285-293`):
  - no-speech → "음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요."
  - not-allowed / service-not-allowed → "마이크 접근 권한이 거부되었거나 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요. (모바일 기기에서는 HTTPS 보안 연결이 필요할 수 있습니다)"
  - other → `음성 인식 오류: {error}`
  - All are shown as `⚠️ {msg}` (197-213).
- **Recognition settings:** lang "en-US", continuous false, interimResults true (254-259).
- **Scoring** (`evaluatePronunciation`, 120-221):

  ```
  score = round(65*wordAccuracy + 20*charSim + 15*lenRatio)
  ```

  Rating labels: ≥92 "🌟 모든 단어 일치 (Excellent!)"; ≥80 "👍 대부분 일치 (Good!)"; ≥60 "💪 거의 맞았어요 (Almost!)"; else "다시 시도 (Try Again)". Empty input gives "음성 감지 안 됨".
- **Computed examples:**

  | Transcript | Target | Score | Label |
  |---|---|---|---|
  | "I am Korean" | "I am Korean." | 100 | Excellent |
  | "I'm Korean" | "I am Korean." | **48** | Try Again (§12) |
  | "I am Korea" | "I am Korean." | 92 | none noted |
  | "are not i your friend" | "Aren't I your friend?" | 30 | none noted |

---

## 5. Answer checking / normalisation (`src/lib/grammarGrading.ts`)

It is used by three places:
- Step 1 "🎯 정답 일치!" (`GrammarLearningView.tsx:738-740`)
- Step 2 blanks (`:978`, `gradeAnswer` against the single blank token)
- Step 4 exam (`:462`)

The Step 1 **self-grade buttons do not grade**; they are manual.

```ts
// 84-91 literal
text.toLowerCase().replace(/[’‘]/g,"'").replace(/[.,?!;:"'()]/g,"").replace(/\s+/g," ").trim()

// 93-99 expanded: lower-case, curly→straight, then CONTRACTIONS (46-58), then literal
can't→can not; cannot→can not; won't→will not; shan't→shall not; n't→" not";
i'm→i am; (you|we|they)'re→$1 are; (i|you|we|they|could|would|should|might|must)'ve→$1 have;
X'll→X will; (he|she|it|that|this|there|what|who|where|here|how|when)'s→$1 is; let's→let us
// 'd is NOT expanded. Possessive 's is not expanded (mother's → mothers).
```

- **`gradeAnswer(user, model)`** (185-190): grade on the expanded forms first; if the result is not exact, also grade the literal forms and keep the better grade.
- **`gradeNormalized`** (222-250):
  1. Empty user → `incorrect`.
  2. `user===model` → `exact`.
  3. **Spacing-only difference** (211-220): if the two differ only in spaces → `exact`. The one exception is when a changed word is in `MEANING_CHANGING_JOINS` (198-203: maybe, everyday, sometime(s), anyone, … however), which gives `partial`.
  4. If user has ≤1 word, or the model is empty → `incorrect`.
  5. LCS over words (138-167). If `LCS/modelWords < 0.7` → `incorrect`.
  6. If `userWords > modelWords*1.15` (`MAX_ANSWER_LEN_RATIO`, 39) → `incorrect`.
  7. Pair the unmatched user words with the unmatched model words in order. Each pair must be either (both in `FUNCTION_WORDS`, 65-81) or `looksLikeSameWord` (121-128: edit distance ≤1, or ≤2 when the longer word is ≥8 chars, OSA transposition counts as 1; or a common prefix of ≥4 chars within the first 5). Any other pair → `incorrect`.
  8. Otherwise → `partial`. Extra unpaired words are allowed within the 1.15 cap.
- **`gradeAgainstReferences(user, [en,...alts])`** (253-262): best grade over the model and its alternatives.
- **Case:** insensitive. **Whitespace:** collapsed. **Punctuation removed:** `. , ? ! ; : " ' ( )`. **Not removed:** hyphen, slash, `…`, digits vs words ("7" ≠ "seven").

**Computed against gh1-006 (all verified with the real module):**

| Input | Reference(s) | Grade |
|---|---|---|
| `I am Korean.` / `i am korean` / `I'm Korean` / `"  I   am Korean  "` | I am Korean. | exact |
| `I am Korea.` | I am Korean. | **incorrect** (LCS 2/3 < 0.7; 3-word sentence) |
| `I am Japanese.` / `Korean` / `I Korean.` / `am I Korean` / `I am a Korean.` / `I am Korean too much.` | I am Korean. | incorrect |
| `They are their pens.` | Those are their pens. + alt They are their pens. | exact (alternative) |
| `These are their pens.` | same | partial |
| `It's seven o'clock.` / `It is seven oclock` | It is seven o'clock. | exact |
| `It is 7 o'clock.` | It is seven o'clock. | incorrect |
| `No, it isn't cold.` / `No it's not cold` | No, it is not cold. | exact |
| `Is she your girl friend?` | Is she your girlfriend? | exact (spacing) |
| `What is you name?` / `What your name?` | What is your name? | partial |
| `Where are you` | Where are you? | exact |
| `Where is you?` / `Who are you?` | Where are you? | incorrect |
| `Is he hapy?` / `He is happy?` | Is he happy? | incorrect |

| Cloze input | Answer | Grade |
|---|---|---|
| `am` `AM` `Am` `" am "` | am | exact (✓) |
| `is`, `a` | am | incorrect |
| `you` | your | incorrect |
| `dont` | don't | exact |

The existing regression script is `docs/qa-2026-09-15/scripts/verify/verify-grammar-grading.cjs` (29 cases, module-level).

---

## 6. Audio

### 6.1 Item audio (all four steps)

Item audio is `playEnglish(englishText, id)` (`GrammarLearningView.tsx:340-356`), which calls `speakText(text, {lang:"en", rate: audioSpeed})` (`speech.ts:1017-1031`).

1. `cleanText` = `normalizeUnifiedSpeechText` (`unifiedSpeech.ts:4-15`): " / "→space, removes `[...]`, `::`, `--`, `…`, "|"→", ", "()"→space, collapses spaces.
2. **Ava clip first** (`playUnifiedClip`, `speech.ts:755-841`), used whenever the path is not CNN (`unifiedSpeech.ts:42-47`). The shared `new Audio()` element (not in the DOM) gets `src = /audio/azure-ava/v1/{key}.mp3` and `playbackRate = clamp(rate, 0.5, 2)`.
3. **Key** (`unifiedSpeech.ts:21-35`) = `{clean.length base36}-{fnv1a32 hex8}{second32 hex8}`. For example, "I am Korean." → `c-27ec9a484c332e94` (§10 has all 42 keys of gh1-006).
4. **Fallback** on clip `error` or rejected `play()` → `startLegacyEngine` (966-1002):
   - The text is segmented by language.
   - If `speechSynthesis` exists and has a voice for the language (with 0 voices it assumes yes), it uses `SpeechSynthesisUtterance` (lang en-US, rate clamped 0.5-1.6, pitch 1.0 for neutral).
   - A 1.5 s watchdog applies; if nothing is speaking it tries the stream engine, which requests **the same clip URL again** (708-752).
   - Otherwise it fires `onError`. The button returns to "🔊" and **no message is shown to the learner**.
5. **Stops:** `stopSpeech()` on unmount (333-337), on `pagehide`, and when the tab is hidden (`speech.ts:257-263`).
6. **Access** (`mediaAccess.ts:86-91`): if the key is in `freeSpeechKeys.json` → allowed (reason `unified-speech`, `Cache-Control: private, max-age=31536000, immutable`). Otherwise the `kig_license_session` cookie is required → 206/200 with `private, max-age=3600, no-transform`; without it → **403 "License required"**. The session is not narrowed by course.
7. **Local clip inventory check** (`public/audio/azure-ava/v1`): 2,497 of the 2,501 item clips exist. **Missing locally:**
   - "I was poor." (gh1-008 #1, gh1-008-1 #1 — a free lesson)
   - "I am a boy." (gh1-020 #1, gh1-022 #1)
   - The R2/production state is **unverified**. Cause: the generator (`scripts/generate-azure-ava.mjs:238-319`) collects raw `text` including "1. I was poor." / "1.I am a boy.", while the view speaks the text with the number stripped. The gh1-021 wording was changed on 2026-09-17.

### 6.2 Top "whole lesson" player (`page.tsx:238-250, 253-260, 343-365`; `AudioPlayer.tsx`)

- **`topLevelAudio`:** for grammar1, the first `audio[]` entry whose number is odd, else the last entry.
  - Main pages: 1 entry, so the player has no label.
  - gh1-020 has `audio:[]`, so it renders `AudioPlayer label="전체 듣기"`.
- **TTS mode:** `isTtsMode = fallbackSentences.length>0 && shouldUseUnifiedSpeech(pathname)` is always true (`AudioPlayer.tsx:62-63`). The MP3 `src` is never loaded, and no `<audio>` element is rendered.
- **`fallbackSentences`** = `extractSentencesForAudio` (428-530). For grammar1:
  - `targetBlocks` = own blocks; if `isScript` and pair blocks exist, the pair's blocks.
  - Then: if the first item of the own file's **first** `sentences` block is `isEnglishText` (strict latin > hangul) use own blocks; else if the pair's first item is English, use the pair's blocks.
  - Returns the cleaned `text` of **only the first `sentences` block** of that file.
  - **Differs from the item list on 9 pages** (§12): gh1-014 (23 of 43), gh1-014-2 (1/21), gh1-046 (33/37), gh1-046-2 (14/18), gh1-066 (10/25), gh1-068 (1/27), gh1-094 (9/19), gh1-122-2 (2/19), and gh1-084, where all 31 sentences are **the Korean prompts**.
- **Controls:**
  - Play/pause: aria-label "재생" / "일시정지" (237-260). Starts `playSentenceQueue(sentences,{rate, startIndex:0, gap:300})`; pressing it while speaking toggles pause.
  - Stop: aria-label "정지", disabled when idle (263-273).
  - Previous sentence: text "이전", aria-label "이전 문장" (277-284).
  - Next sentence: text "다음", aria-label "다음 문장" (286-293).
  - Sentence slider: `input[type=range]` aria-label "문장 이동", `aria-valuetext="{i+1}번째 문장 / 전체 {M}문장"`, opacity 0 over the segment bar. It commits on pointerup/keyup/blur (315-328).
  - Counter: `{i+1}/{M}` (343-347).
  - Speed: label "속도", buttons "0.8×" "1×" "1.2×" with aria-pressed; changing speed while playing restarts at the current index (355-370, 174-179).
  - Status line: "▶ 재생 버튼을 눌러 전체 듣기" / "🔊 음성 읽는 중…" / "⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기" (373-381).
  - **Space key** anywhere except input/textarea/contenteditable toggles play and calls `preventDefault` (182-198).
- **Clip URL for sentence i:** `/audio/azure-ava/v1/{unifiedSpeechKey(fallbackSentences[i])}.mp3`.

---

## 7. Persistence, completion & progress

| Key | Written by | Shape |
|---|---|---|
| `kig:grammar:work:grammar1/<pageId>` | GrammarLearningView autosave, 400 ms debounce, only when the snapshot changed (297-330) | `{answers:{[itemId]:string}, selfGrades:{[itemId]:boolean}, clozeInputs:{[itemId]:{[pIdx]:string}}, revealedAnswers:{["composition:"+id \| "cloze:"+id]:boolean}, shadowingRepeats:{[itemId]:number}, examSubmitted:boolean, at:"9. 18. 오후 7:05"}` |
| `kig:progress:completed` | 완료 체크 | `{"grammar1:<pageId>": true}` |
| `kig:progress:bookmarks` | 북마크 (lesson page and course card ☆) | `{"grammar1:<pageId>": true}` |
| `kig:progress:recent` | lesson mount | `{course, lessonId, title, courseTitle, updatedAt}` |
| `kig:lang`, `kig:theme` | global | none |

- **Item id vs label:** `itemId` is the 1-based index, not `n`. `-1`, `-2` and main pages use **separate keys**, so work typed on `gh1-006-1` does not appear on `gh1-006`, and ids restart at 1 on `-2` pages.
- **Restore** (260-294) happens on mount. `studyMode`, font, voice speed and `clozeTouched` are not persisted.
- **Autosave badge:** a fresh profile shows no badge (FUN-07 fix). The first real change shows the badge.
- **No server-side progress** for grammar1. The only server call is the STUDENT sync.
- **"Completion"** is only the manual 완료 체크. Step results never mark a lesson complete.
- **Course dashboard** (`CourseDashboard.tsx:213-221, 274, 297-321`):
  - `학습 진도율: {completedCount} / 53개 완료 ({pct}%)`; filters "전체 (53)", "★"+"북마크 ({n})", "미완료 ({max(0,53-completed)})".
  - `completedCount` counts **every** `grammar1:*` key, including `-1`/`-2` pages (§12).
  - Card "✓ 완료" pill shows when `isCompleted("grammar1", card.id)` (mains only).

---

## 8. Locking & entitlement

- **Free** (`license.ts:75-80, 106-125`): gh1-006 and gh1-008 with their `-1`/`-2` pages, plus odd 007/009 (which redirect anyway). The id is tried with trailing `-\d+` removed, so `gh1-010` → `gh1` is not free.
- **Server gate** (`page.tsx:148-182`): non-free pages need a valid `kig_license_session` cookie; the plan must not be STUDENT-only (`STU*`).
  - Denied → `<main>` with the back link "← GRAMMAR I", h1 title and `LessonPaywall` (with `data-kig-paywall="license"`). No lesson data is in the payload.
  - Paywall text:
    - pill "ALL-PASS ONLY"
    - h2 = lesson title
    - body "공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다."
    - buttons "🔑 이용권 코드 등록" and "🛒 구매 안내" (**both** call `openModal`)
    - footer link "← GRAMMAR I 전체 목록" and "1~2강은 무료로 상시 체험 가능합니다"
  - For a STUDENT-only licence (client-known): pill "VIP ALL-PASS REQUIRED", h2 "본 레슨은 VIP 올패스 전용 강좌입니다", body mentions "STUDENT 전용 패스".
- **Client reload:** if a stored licence verifies while the paywall is shown, the page reloads once per token (`LicenseProvider.tsx:193-201`, sessionStorage `kig:license-cookie:<last16>`).
- **Course page:** `isUnlocked` (`LicenseProvider.tsx:279-308`) marks section 0 cards 0-1 as free, and any card as unlocked with an all-pass licence.
  - Locked card: pill "🔒"+"올패스"; link "올패스 열람" + "🔒"; star disabled with aria-label "잠긴 레슨은 북마크할 수 없습니다".
  - Free card without licence: pill "무료 보기", link "무료 보기 →".
  - Licensed: "학습하기 →".
- **Media:** see §6.1. Original `/audio/grammar1/*.mp3` are also gated (free for gh1-006…009 ids), but the UI never requests them.

---

## 9. Navigation & boundaries

- **Course list** (`[course]/page.tsx:99-125`):
  - Hides every script page (`hasEnglishPair`, including the grammar1 odd+1 rule at 103-108), which gives "총 53개 정규 레슨 · 6개 단계 구성".
  - Accordions start collapsed. Header button has `aria-expanded`, `{stage label}`, `총 N개 레슨` (+ `· k개 완료`) and "펼치기 ▼"/"접기 ▲".
  - Card: code `Lesson NN`, badge `🎙️ 마이크 채점`, title link, subtitle `제 k단계 (…)`, footer id `gh1-NNN`, link text.
- **Main pages:** prev/next walk the 53 mains in index order.
  - gh1-006 has no prev, so its nav grid has 1 column; gh1-122 has no next.
  - Stage boundaries are crossed freely (gh1-016 → gh1-020).
- **Script pages:** prev/next walk the **full 194-entry array** (`content.ts:128-129`):
  - `gh1-006-1`: prev gh1-006 "01강 · 기초 영작 훈련", next gh1-006-2.
  - `gh1-006-2`: next **gh1-007** labelled "7강 · 기초 영작 훈련", which 307-redirects back to gh1-006. The same pattern holds for every `-2` page (next = odd id, titled "{odd}강"; e.g. gh1-122-2 → "123강 · 기초 영작 훈련").
  - `gh1-016-1` is the last array element: prev **gh1-123-2** ("123강 · 기초 영작 훈련" → redirect to gh1-122-2), **no next**.
  - `gh1-016-2`: prev gh1-016, next gh1-017.
- **Script pages are orphaned:** no UI link leads to any `-1`/`-2` page. They are not in the course list, sitemap or search index, and have no "Korean script" button. They are reachable only by URL.
- **Redirects:** all 97 odd ids answer 307 to the even partner. This happens before the licence check.
- **404:** ids not in `validRoutes` (gap numbers, `-3`, typos) get the proxy sentinel 404 page.
- **Step navigation:** the four pills plus the bottom "← 이전 Step"/"다음 Step →". There are no per-question prev/next controls: all items render as one scrolling list.
- **Absent controls:** there are no hint buttons, no per-question counter like "3/42", no show-answer in Steps 3 or 4 before submit, and no Step 2 or Step 3 reset. The only reset is "↺ 모든 작성 내용 초기화" in Step 1, which clears all steps.

---

## 10. CDP driver recipe

The recipe uses **gh1-006**, which is free. It can be run anonymously first and then with the licensed profile. Repeat §10.9 for gh1-020 (07강) and one split page, and loop the data checks over all 97 pages.

### 10.0 Setup

- **Browser:** `docs/qa-2026-09-15/scripts/verify/cdp.cjs` → `launch({port, profile})`. It already passes `--autoplay-policy=no-user-gesture-required`, which is **needed**: the clicks are `element.click()` without a user gesture, so the Ava `play()` would otherwise be rejected and fall back.
- **Profile:** a copy of `%TEMP%\kig-audit-licensed-profile` → `%TEMP%\kig-audit-0918-grammar1`.
- **CDP domains:** `Network.enable`, `Page.enable`, `Runtime.enable`.
- **Clipboard:** `Browser.grantPermissions({origin:"https://k-ig-core.vercel.app", permissions:["clipboardReadWrite","clipboardSanitizedWrite"]})` and `Emulation.setFocusEmulationEnabled({enabled:true})`.
- **Instrumentation** via `Page.addScriptToEvaluateOnNewDocument`:

```js
window.__media=[]; const P=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(){const r=P.call(this);window.__media.push({src:this.currentSrc||this.src,rate:this.playbackRate,t:Date.now()});r&&r.catch&&r.catch(e=>window.__media.push({err:String(e)}));return r;};
window.__tts=[]; if(window.speechSynthesis){const S=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{window.__tts.push({text:u.text,lang:u.lang,rate:u.rate});return S(u);};}
window.__clip=[]; const W=navigator.clipboard&&navigator.clipboard.writeText.bind(navigator.clipboard); if(W) navigator.clipboard.writeText=t=>{window.__clip.push(t);return W(t);};
window.addEventListener('unhandledrejection',e=>(window.__rej=(window.__rej||[])).push(String(e.reason)));
```

- **Optional second pass (STT mock),** installed before load:

```js
window.__sttNext={transcript:"",error:null};
window.SpeechRecognition=class{start(){setTimeout(()=>{this.onstart&&this.onstart();const n=window.__sttNext; if(n.error){this.onerror&&this.onerror({error:n.error});} else {const res=[{transcript:n.transcript}]; res.isFinal=true; this.onresult&&this.onresult({resultIndex:0,results:[res]});} this.onend&&this.onend();},30);} stop(){} abort(){}};
```

- **Dialogs:** listen for `Page.javascriptDialogOpening`, then answer with `Page.handleJavaScriptDialog({accept})`.
- **Helper:** `click(text, scope="main button")` finds by `textContent.includes`.
- **Expected data:** build it in node with the §1.3 algorithm. For each page, compute `items[] {id,n,ko,en,alts,blanks[{pIdx,answer,width}],clipKey}` plus `fallbackSentences` and the ruleSummary. Load `src/lib/grammarGrading.ts` and `src/lib/unifiedSpeech.ts` through `tsload.cjs`.

### 10.1 Load & entitlement

1. **Route checks:** navigate to `/grammar1/gh1-007` and assert the redirect (`Network.responseReceived` status 307, Location `/grammar1/gh1-006`) and the final URL. Repeat for `/grammar1/gh1-007-1` → `/grammar1/gh1-006-1`. Check that `/grammar1/gh1-018` gives 404 with not-found text.
2. On `/grammar1/gh1-006`, poll until `main` innerText includes "Step 1 · 영작 훈련" and `[data-kig-paywall]` is absent. Then:
   - `h1` = "01강 · 기초 영작 훈련"
   - there is no `a[aria-label^="이전 강의"]`
   - `a[aria-label="다음 강의: 02강 · 기초 영작 훈련"]` exists
   - toolbar text includes "Grammar 1 : 기초 영작 및 문법 훈련" and "총 42개 문항"
   - `nav[aria-label="문법 4단계 학습 모드"] button` gives 4 texts (§4.1)
   - `details` containing "문법 확인" is absent (it only exists on gh1-020)
3. **Anonymous profile** (separate run): gh1-010 shows the paywall (h1 "03강 · 기초 영작 훈련", "ALL-PASS ONLY", 2 buttons, "1~2강은 무료로 상시 체험 가능합니다") and no "Step 1". Fetching a gh1-010 item clip (e.g. `/audio/azure-ava/v1/<key of gh1-011 #1>.mp3`) gives 403, while a gh1-006 clip gives 200/206. Do **not** click the licence buttons in the audit.
4. Clear the work key: `localStorage.removeItem("kig:grammar:work:grammar1/gh1-006")`, then reload. Assert no "자동 저장됨" text is visible.

### 10.2 One-to-one render check (every page, every step)

- **Step 1:** there are 42 inputs with `aria-label` `{n}번 영작 답안` in data order.
  - Each card's badge is `n`; its Korean `<p>` equals `ko`; the placeholder is exact.
  - Click "💡 전체 정답 보기": 42 "MODEL ANSWER" headers; each card's English `<p>` equals `en`; if alts exist, `다른 정답: alts.join(" / ")` (item 9: "다른 정답: They are their pens.").
  - Click "🔒 전체 정답 가리기": 0 headers.
- **Step 2:** click the "Step 2 · 빈칸 완성" pill.
  - The `input[placeholder="___"]` count equals Σ blanks (gh1-006: 69 = 15 one-blank items + 27 two-blank items).
  - Per item, the blanks are at the computed pIdx, and `style.width === max(len*14,58)+"px"`.
  - The concatenated non-blank tokens equal `en` with the blank tokens removed.
  - Korean `<p>` equals `ko`.
  - Assert that Step 1's reveal did not leak into Step 2 (see `verify-grammar-reveal.cjs`).
- **Step 3:** 42 cards; English `<p>` equals `en`; Korean `<p>` equals `ko`; badge "0회 연습".
- **Step 4:** 42 rows `Q{n}.` + `ko`; inputs `{n}번 시험 답안` with placeholder "답안을 입력하세요..."; footer "작성 완료: 0 / 42 문항" + "작성한 문항이 없습니다. 답안을 입력한 뒤 채점하세요."; "🎯 전체 시험 채점하기" is disabled.
- **Across widths:** repeat at 375 / 768 / 1280 (`tab.viewport`). Assert no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`) and 2-column pills at 375.

### 10.3 Step 1 controls (correct and incorrect)

Use the React-safe setter: `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}))`. Alternatively, focus the input and use `Input.insertText`.

1. **Type answers and check the "🎯 정답 일치!" badge:**

   | Item | Input | Badge expected? |
   |---|---|---|
   | #1 | "I'm Korean" | yes (exact) |
   | #9 | "They are their pens." | yes (alternative) |
   | #25 | "Is she your girl friend?" | yes |
   | #39 | "It's seven o'clock." | yes |
   | #41 | "No, it isn't cold." | yes |
   | #19 | "What is you name?" | **no** (partial) |
   | #20 | "Where is you?" | no |

   Then assert the "작성 진행률" card shows "7 / 42" and "17%".
2. **Clear:** on #20 click "✕" (title "지우기") → the input is empty and the counter shows 6. Retype it.
3. **Self-grade:**
   - Click "맞음" on #1, #9 and #25 → 3 cards emerald with "✓ 학습 완료"; "3 개 맞음" and `round(3/7*100)`=43%.
   - Click "맞음" on #1 again → the badge is removed and the count is 2 (toggle).
4. **Retry:** click "다시 풀기" on #20 → input "", amber border, "↺ 복습 필요", answered 6. Click it again → it stays "복습 필요" (not a toggle).
5. **Reveal one:** on #9 click "💡 정답 확인" → a card with "Those are their pens." + "다른 정답: They are their pens."; the button reads "🔒 정답 가리기".
   - "문장 복사" → `__clip` last equals "Those are their pens."; the button reads "✓ 복사됨" and reverts within ~2.1 s. Also check `__rej` is empty (it is not empty if the clipboard is denied, §12).
6. **Accuracy overflow probe:** click "맞음" on 8 **empty** items (e.g. #30-#37) → `correctCount` 10 with 6 answered → the card shows "167%" (a defect demo, §12). Undo by clicking again.
7. **Pronounce:**
   - Click "영어 정답 발음" on #1 → within 2 s `__media` has `src` ending `/audio/azure-ava/v1/c-27ec9a484c332e94.mp3` with `rate` 1. The button reads "⏹️정지" while playing and returns to "🔊영어 정답 발음" on end. `Network` shows status 206/200 for that URL.
   - Click it again while playing → it stops immediately.
   - Switch voice speed to "0.85x" (`aria-pressed=true`), play #2 → `rate` 0.85, key `f-8bcb68a93d9acb42`.
   - If a clip returns 404 (check gh1-008 #1 "I was poor."), assert the fallback: `__tts` gets an entry or the button resets. Record the status.
8. **Font:** click "크게" → the Korean `<p>` of #1 has class `text-[18px]`; "특대" → `text-[20px]`; "기본" → `text-[16px]`.
9. **Mic mock pass** (STT mock loaded):
   - `__sttNext={transcript:"I am Korean"}`, click "마이크로 말해서 영작하기" on #1 → input value "I am Korean", button text "100점 (🌟 모든 단어 일치 (Excellent!))", "✓ 학습 완료" shown.
   - Click "↺ 다시 녹음" with the same transcript → **"✓ 학습 완료" disappears** (toggle defect, §12). Record either way.
   - `__sttNext={transcript:"hello"}` on #2 → input "hello", score 7 "다시 시도 (Try Again)", no self-grade.
   - `__sttNext={error:"not-allowed"}` → the amber box text starts "⚠️" + "마이크 접근 권한이 거부되었거나…".
   - `__sttNext={error:"no-speech"}` → "음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요."
   - Unsupported: delete both constructors before load → the fallback text "(마이크 음성 인식이 지원되지 않는 브라우저입니다. …)". With a KAKAOTALK UA the Kakao text and "🌐 Chrome으로 열기" button appear (do not click).
10. **Autosave:** wait 600 ms, then parse `localStorage["kig:grammar:work:grammar1/gh1-006"]`:
    - `answers` keys "1","9","19","20"(""),"25","39","41"
    - `selfGrades` includes `{"9":true,"25":true,"20":false}`
    - `revealedAnswers["composition:9"]===true`
    - `at` matches `/^\d{1,2}\. \d{1,2}\. (오전|오후) \d{1,2}:\d{2}$/`
    - the visible badge equals `${at} 자동 저장됨`

### 10.4 Step 2 controls

1. Click the "Step 2 · 빈칸 완성" pill → the bottom "← 이전 Step" is enabled.
2. **#1 blank pIdx 2** (answer "am"): type "AM" → `<span role=status>✓` after the input; the input has class `border-emerald-500`.
3. **#2 blank** (answer "is"): type "am" (length 2 ≥ 2) → "✗" appears immediately.
4. **#7 blank pIdx 0** (answer "This"): type "th" → no mark; blur (`el.blur()` or focus another element) → "✗"; set to "this" → "✓".
5. **#3:** click "💡 빈칸 정답 확인" → its blank input disappears and `<span>` "are" appears; the button reads "🔒 빈칸 가리기". Click again → the input is back with its previous value.
6. Check that Step 1's reveal state is unchanged (go back to Step 1: #9 is still revealed, others are not).
7. **Storage:** `clozeInputs` equals `{"1":{"2":"AM"},"2":{"2":"am"},"7":{"0":"this"}}`; `revealedAnswers["cloze:3"]` is false after re-hiding.
8. "전체 문장 듣기" on #1 → the clip key for "I am Korean." is requested.

### 10.5 Step 3 controls

1. Click the "Step 3 · 구문 각인" pill (or "다음 Step →").
2. Click card #1's English `<p>` (not a button) → "1회 연습" and the clip is requested. Wait for the end (or `__media`), click twice more → "✓ 3회 달성!".
3. Click the 🔊 button (title "발음 듣기") on #2 → clip requested and the badge stays "0회 연습".
4. Click 📋 on #2 → `__clip` gets "He is Japanese."; aria-label "복사됨" and then "문장 복사".
5. **Mic mock:** `transcript:"He is Japanese"` on #2 via "내 발음 채점 및 섀도잉 검증" → badge "1회 연습" (score ≥70). `transcript:"hello"` → no change.
6. **Storage:** `shadowingRepeats` equals `{"1":3,"2":1}`.

### 10.6 Step 4 controls

1. Click the "Step 4 · 종합 평가" pill. The inputs already hold the Step 1 answers (shared `answers`). Assert #1 has "I'm Korean".
2. Leave #20 empty; the other 36 remain empty.
3. Click "🎯 전체 시험 채점하기". **Expected** (exact: #1, #9, #25, #39, #41 → 5; partial: #19 → 1):
   - `score = round((5+0.7)/42*100) = 14`
   - status box shows "14점", "정답 일치: 5개", "부분 일치: 1개"
   - badges: #1 "✓ 정답 (100점)", #19 "△ 부분 정답 (70점)", #20 and every empty item "✕ 오답 (0점)"
   - all inputs `disabled`
   - each row has "모범 답안:" + en; #9 also "(또는: They are their pens.)"
   - "🔊 발음 청취" on #19 plays key `i-bb1fc4f83ccc67d4`
4. Reload → Step 1 is shown. Click Step 4 → results are still shown (`examSubmitted` persisted).
5. Click "↺ 답안 다시 수정하기" → inputs enabled, the button reads "🎯 전체 시험 채점하기". Change #20 to "Where are you" and submit → exact 6, score `round(6.7/42*100)=16`.
6. **Empty-sheet case:** reset (§10.8), open Step 4 → the button is disabled and the warning is shown.

### 10.7 Page chrome, top player, navigation

1. **Top player:**
   - Initial state: `button[aria-label="재생"]`, counter "1/42", status "▶ 재생 버튼을 눌러 전체 듣기", `button[aria-label="정지"]` disabled.
   - Click play → `__media` src key `c-27ec9a484c332e94` (sentence 1 "I am Korean."); aria-label "일시정지"; status "🔊 음성 읽는 중…".
   - Click "다음" (aria "다음 문장") → counter "2/42", key `f-8bcb68a93d9acb42`.
   - Click "1.2×" → `aria-pressed=true` and `__media` rate 1.2.
   - Click pause → status "⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기". Click stop → counter "1/42" and stop disabled.
   - Focus the range `input[aria-label="문장 이동"]`, press ArrowRight ×4, keyup → counter "5/42" and the key for "She is Filipino." (`g-f0ae1e879a17ae6b`).
   - Press Space with focus on `body` → play toggles.
   - For each of the 97 pages, compare `aria-valuetext` total M with the item count N (mismatches listed in §12).
2. **Step nav:** "다음 Step →" ×3 → Step 4 active and the button disabled; "← 이전 Step" ×3 → Step 1 active and the button disabled. The "목록으로" href is `/grammar1`.
3. **Bookmark / complete:**
   - Click "북마크" → aria-label "북마크 해제", text "★북마크됨", `kig:progress:bookmarks["grammar1:gh1-006"]===true`.
   - Click "완료 체크" → "학습 완료", `kig:progress:completed["grammar1:gh1-006"]===true`.
   - Open `/grammar1`, expand "제 1단계 : 기본 문장 구조 훈련 (Stage 1)" → the gh1-006 card shows "✓ 완료" and "★"; header "학습 진도율: 1 / 53개 완료 (2%)"; "★ 북마크 (1)" filter shows 1 card; "미완료 (52)".
   - **Undo both** and record them in `out/data-changes.md`.
4. **Progress-inflation probe:** complete `/grammar1/gh1-006-1` → the course header shows "2 / 53" while only one card is ✓ (§12). Undo.
5. **Recent:** `kig:progress:recent.lessonId==="gh1-006"`, title "01강 · 기초 영작 훈련".
6. **Prev/next:** from gh1-006 click next → gh1-008 h1 "02강 · 기초 영작 훈련". On gh1-122 there is no next link. On gh1-006-2 the next link is `aria-label="다음 강의: 7강 · 기초 영작 훈련"` and it lands on /grammar1/gh1-006. On gh1-016-1 the prev link is "123강" and there is no next.
7. **State leak on client navigation:** type in gh1-006 Step 1 #1, click next (client-side Link) to gh1-008, and assert gh1-008 #1 is empty, Step 1 is active and the gh1-008 key does not receive gh1-006 data. This confirms remount per lesson (unverified in source; see §12).

### 10.8 Reset

1. Click "↺ 모든 작성 내용 초기화". On the dialog (message exactly "작성하신 모든 영작 내용과 자가 채점을 초기화하시겠습니까?") answer **cancel** → nothing changes.
2. Click again and **accept** → all inputs empty; counters 0 / 42 and 0%; cloze inputs empty; Step 3 badges "0회 연습"; Step 4 not submitted.
3. After 600 ms, assert `localStorage` key state and record it. Current code **re-creates** it with empty maps and a new `at` (§12). Also note that blurred blanks stay "touched".

### 10.9 Lesson-specific passes

- **gh1-020 (07강):**
  - `details` is closed with 8 `li`; open it (set `.open=true` or click `summary`) → Q1..Q8 text equals §4.2.
  - 24 items: #1 "나는 소년이다." / "I am a boy."; #24 "나는 네 친구가 아니니?" / "Aren't I your friend?".
  - The top player label is "전체 듣기" and its first clip key is `unifiedSpeechKey("I am a boy.")`. Record the status (the clip is missing locally).
- **Split page gh1-006-1 / -2:** 21 items each; labels 1..21 and 22..42; own storage key; title identical to the main.
- **gh1-110-1 / -2:** #90 appears on both.
- **gh1-084 (37강) top player:** the first clip requested is the key of the Korean prompt "수백 명의 군인들이(Hundreds of soldiers) 그 도시를 떠나고 있다. (leave)", not "Hundreds of soldiers are leaving the city." (§12).
- **All 97 pages (data sweep, no typing):**
  - N items, labels, ko/en/alts, blank counts, clip-key HEAD status (licensed)
  - top-player total M
  - no console errors except known 403/404

### 10.10 Expected data for gh1-006 (computed from gh1-006.json + gh1-007.json)

Columns:
- **id** = storage item id
- **n** = label
- **blanks** = `pIdx:answer(width px)`
- **clip key** → `/audio/azure-ava/v1/<key>.mp3`

| id | n | Korean prompt | English model | alternatives | blanks | clip key |
|---|---|---|---|---|---|---|
| 1 | 1 | 나는 한국인이다. | I am Korean. |  | 2:am(58) | c-27ec9a484c332e94 |
| 2 | 2 | 그는 일본인이다. | He is Japanese. |  | 2:is(58) | f-8bcb68a93d9acb42 |
| 3 | 3 | 당신은 미국인이다. | You are American. |  | 2:are(58) | h-7329814602456524 |
| 4 | 4 | 그녀는 필리핀 사람이다. | She is Filipino. |  | 2:is(58) | g-f0ae1e879a17ae6b |
| 5 | 5 | 우리(들)는 학생(들)이다. | We are students. |  | 2:are(58) | g-d16579e9909fe44c |
| 6 | 6 | 그들은 근로자들이다. | They are workers. |  | 2:are(58) | h-2c4571cc4d817026 |
| 7 | 7 | 이것은 나의 차다(내 차다). | This is my car. |  | 0:This(58), 2:is(58) | f-4e4854b93b370071 |
| 8 | 8 | 이것들은 너의 연필(들)이다. | These are your pencils. |  | 0:These(70), 2:are(58) | n-0163d67f546c485b |
| 9 | 9 | 그것들은 그들의 펜들이다. | Those are their pens. | They are their pens. | 0:Those(70), 2:are(58) | l-3905dca6cf5f3e67 |
| 10 | 10 | 나의 얼굴은 붉다. | My face is red. |  | 0:My(58), 4:is(58) | f-222fdcb3af0b5948 |
| 11 | 11 | 그것은 당신의 것이다. | It is yours. |  | 2:is(58), 4:yours(70) | c-4460b9ba3dc65940 |
| 12 | 12 | 이것은 나의 것이다. | This is mine. |  | 0:This(58), 2:is(58) | d-4bb990a82262a7eb |
| 13 | 13 | 내가 안전한가? | Am I safe? |  | 0:Am(58) | a-abf5e9764e79eaec |
| 14 | 14 | 그는 행복한가? | Is he happy? |  | 0:Is(58) | c-dffb87d357d5fcb0 |
| 15 | 15 | 그녀는 결혼했나? (기혼인가?) | Is she married? |  | 0:Is(58) | f-7c07a70c3ccad7c4 |
| 16 | 16 | 당신은 부유한가? | Are you rich? |  | 0:Are(58) | d-c80d87054aef26d7 |
| 17 | 17 | 나의 얼굴은 붉은가? | Is my face red? |  | 0:Is(58), 2:my(58) | f-bb9a5da208a22709 |
| 18 | 18 | 그들은 건강한가? | Are they healthy? |  | 0:Are(58) | h-a90e7941ee5a0cc0 |
| 19 | 19 | 너의 이름이 뭐냐? | What is your name? |  | 0:What(58), 2:is(58) | i-bb1fc4f83ccc67d4 |
| 20 | 20 | 너는 어디에 있니? | Where are you? |  | 0:Where(70), 2:are(58) | e-e819bb9afe7324d6 |
| 21 | 21 | 내가 어디에 있나? (여기가 어딘가?) | Where am I? |  | 0:Where(70), 2:am(58) | b-bb588fd65ef6c778 |
| 22 | 22 | 그는 어디 있나? | Where is he? |  | 0:Where(70), 2:is(58) | c-3503882800c3fc27 |
| 23 | 23 | 너는 누구냐? | Who are you? |  | 0:Who(58), 2:are(58) | c-304fa77b5746a395 |
| 24 | 24 | 그는 무엇이냐? (신분이나 직업을 묻는 말) | What is he? |  | 0:What(58), 2:is(58) | b-bb2e905571e3d7a6 |
| 25 | 25 | 그녀는 너의 여자 친구니? | Is she your girlfriend? |  | 0:Is(58), 4:your(58) | n-3f36f3c1103602eb |
| 26 | 26 | 그들은 너의 친구들이니? | Are they your friends? |  | 0:Are(58), 4:your(58) | m-2c01c6aa2ef58238 |
| 27 | 27 | 이 소년들은 너의 급우들이니? | Are these boys your classmates? |  | 0:Are(58), 2:these(70) | v-4216a9571e42d486 |
| 28 | 28 | 이것은 누구의 펜이니? | Whose pen is this? |  | 0:Whose(70), 4:is(58) | i-53536c4d40da36ee |
| 29 | 29 | 그녀는 아름답니? | Is she beautiful? |  | 0:Is(58) | h-fce2862dedbd0c04 |
| 30 | 30 | 이 펜은 너의 것이니? | Is this pen yours? |  | 0:Is(58), 2:this(58) | i-557eb30deb59a7fe |
| 31 | 31 | 이것들은 너의 것들이니? | Are these yours? |  | 0:Are(58), 2:these(70) | g-d2e4f6cb6bd21cf9 |
| 32 | 32 | 이것은 나의 것이니? | Is this mine? |  | 0:Is(58), 2:this(58) | d-f261a2936721cf66 |
| 33 | 33 | 그들은 어디 있나? | Where are they? |  | 0:Where(70), 2:are(58) | f-9fe11c41646148ce |
| 34 | 34 | 그녀는 어디에 있니? | Where is she? |  | 0:Where(70), 2:is(58) | d-3caad587316f94dd |
| 35 | 35 | 우리는 어디에 있니? (여기가 어디냐?) | Where are we? |  | 0:Where(70), 2:are(58) | d-a2e6527fc702e680 |
| 36 | 36 | 너의 어머니는 어떠시니? | How is your mother? |  | 0:How(58), 2:is(58) | j-20888c066994152d |
| 37 | 37 | 그는 너의 상사니? | Is he your boss? |  | 0:Is(58), 4:your(58) | g-48a3a39dd11d86bb |
| 38 | 38 | 몇 시니? | What time is it? |  | 0:What(58), 4:is(58) | g-1f73ce42cab88e77 |
| 39 | 39 | 7시이다. | It is seven o'clock. |  | 2:is(58) | k-f0851a2189357e80 |
| 40 | 40 | 날씨가 춥니? | Is it cold? |  | 0:Is(58) | b-88124aadeb2b9878 |
| 41 | 41 | 아니, 춥지 않아. | No, it is not cold. |  | 0:No(58), 6:is(58) | j-cce0ff300266a791 |
| 42 | 42 | 따뜻해. | It is warm. |  | 2:is(58) | b-7e4d2e4929eb3836 |

The top player's `fallbackSentences` for gh1-006 are the 42 English models above, in order, so M=42.

---

## 11. Features that cannot be automated (and why)

- **Real speech recognition accuracy** (both mics): headless Chrome has no microphone, and Google's recogniser needs real audio and network. Only the mocked `SpeechRecognition` paths (§10.3.9) are testable. Real Android/iOS permission prompts and HTTPS requirements need a device.
- **Audible correctness of Ava clips** (right sentence, right voice, pronunciation quality): CDP proves the URL, status, duration (via `Audio.duration` in a probe) and `playbackRate` only. Someone has to listen.
- **Browser `speechSynthesis` fallback voice:** headless has no system voices. The fallback path (clip 404) only shows the request sequence; what a real phone says is untested.
- **KakaoTalk / Line / Instagram in-app behaviour** ("🌐 Chrome으로 열기" → `intent://` / `kakaotalk://`): needs the real apps. UA spoofing only checks the text.
- **Clipboard on real devices** (iOS Safari permission and focus rules): headless is granted by CDP, so it does not reflect user conditions.
- **iOS audio unlock** (`unlockMobileAudio`, silent WAV primer) and the Android `speechSynthesis.pause` quirk: device-only.
- **Visual quality of the cloze token spacing,** font-size readability and animations: a screenshot can be taken, but judging them is manual.
- **Pedagogical correctness of prompts and answers** (e.g. gh1-069 #79 and #80 have the same English model): content review, not driver work.

---

## 12. Suspicious code (possible defects)

None of these has been reproduced. Each one needs production confirmation.

1. **Top player reads Korean prompts on 37강.** `page.tsx:470-478` decides the English side from the **first** item only with `isEnglishText` (latin>hangul). gh1-084 #1 "수백 명의 군인들이(Hundreds of soldiers) 그 도시를 떠나고 있다. (leave)" has more Latin than Hangul, so `mainIsEn=true` and all 31 top-player sentences are the Korean prompts. The clips exist locally, so Ava reads Korean where the lesson's English answers are expected.
2. **Top player truncated on 8 pages.** `page.tsx:482-485` uses `find` (the first `sentences` block only), while the view flattens all blocks (`GrammarLearningView.tsx:158-165`). The player's `M` vs the item count `N`:
   - gh1-014 23/43
   - gh1-014-2 **1/21**
   - gh1-046 33/37
   - gh1-046-2 14/18
   - gh1-066 10/25
   - gh1-068 **1/27**
   - gh1-094 9/19
   - gh1-122-2 2/19
3. **Missing Ava clips (local inventory).** "I was poor." (gh1-008 #1, a free lesson, including gh1-008-1) and "I am a boy." (gh1-020 #1, gh1-022 #1) are absent from `public/audio/azure-ava/v1`. The generator keys the numbered raw text (`scripts/generate-azure-ava.mjs:238-245`), while the view strips the number (`GrammarLearningView.tsx:54-60`). In production these would 404 and fall back to browser TTS, and the learner sees nothing.
4. **Accuracy can exceed 100 %.** `GrammarLearningView.tsx:449-452`: `correctCount` counts self-grades on items with **empty** answers, but the denominator is answered items only. The "자가 채점 정답률" can show e.g. 167 % or 500 %; the bar is clipped by `overflow-hidden`.
5. **A mic success can un-mark a self-grade.** `GrammarLearningView.tsx:832-837` calls `toggleSelfGrade(id,true)`, a toggle (369-379). A second ≥80 recording removes "✓ 학습 완료".
6. **STT contraction normalisation is dead code.** `speechRecognition.ts:71` strips apostrophes **before** the contraction replacements at 72-89, so "I'm Korean" vs "I am Korean." scores 48 "다시 시도". The word chips also misalign when normalisation changes the word count (`originalTargetWords[i]` at 140/150).
7. **Course progress counts script pages.** `CourseDashboard.tsx:213-221, 274, 320` counts every `grammar1:*` completed key. Completing `-1`/`-2` pages inflates "N / 53개 완료", the percentage can exceed 100, and "미완료" is clamped to 0, while cards never show ✓ for them.
8. **Script pages are orphaned and chain into odd ids.** No link reaches any of the 44 `-1`/`-2` pages (§9). From a `-2` page, "다음 강의" is labelled "7강 · 기초 영작 훈련" … "123강 · 기초 영작 훈련" and redirects back (`content.ts:128-129`, `curriculumPresentation.ts:118-120`). `gh1-016-1` sits at the end of the index (`grammar1.json` lessons[193]): prev is "123강", no next.
9. **`gh1-110-1` and `gh1-110-2` both contain item #90** (data). A learner doing both halves answers it twice.
10. **Reset does not leave storage empty.** `GrammarLearningView.tsx:403-417` removes the key, but the autosave effect (297-330) sees a changed snapshot and writes an empty snapshot with a new `at` 400 ms later. `clozeTouched` (232) is not reset. `savedAt` stays visible.
11. **Copy has no error handling.** `GrammarLearningView.tsx:419-425`: `navigator.clipboard.writeText(...).then(...)` has no `.catch`. A denied or unavailable clipboard (insecure context, unfocused document, some in-app browsers) gives an unhandled rejection and no feedback.
12. **Exam results change after submit.** `examResults` (455-470) recomputes from the shared `answers`. After submitting in Step 4, editing or "다시 풀기" in Step 1 changes the displayed score while `examSubmitted` stays true. Step 1 also shows "🎯 정답 일치!" live, which reveals exactness before the exam.
13. **Global Space key hijack.** `AudioPlayer.tsx:182-198` calls `preventDefault` on Space for any focused non-input element. Keyboard users pressing Space on a step pill or "✓ 맞음" toggle lesson audio instead of activating the button.
14. **Accessibility gaps:**
    - Shadowing cards are clickable `div`s with no role or tabindex (`GrammarLearningView.tsx:1069-1078`), so repeats can't be counted by keyboard.
    - Two blanks of one item share the same aria-label `{n}번 문장 빈칸` (1004).
    - The Step 3 play button has no aria-label (1111-1126).
    - The Step 1 clear button's accessible name is "✕" (816-825).
    - The step pills have no `aria-pressed`/`aria-current` (523-577).
15. **Short sentences can't earn partial credit.** `grammarGrading.ts:234`: with ≤3 words, one misspelling gives LCS 2/3 < 0.7, so the answer is `incorrect` ("I am Korea.", "Is he hapy?"). 472 rendered items are ≤3 words. Longer sentences keep typo credit. This may be intended, but it is inconsistent with the file's own header comment ("Typos keep their partial credit").
16. **Step 4 wording mismatch.** The instructions (1175-1176) say "[전체 채점하기]", but the button is "🎯 전체 시험 채점하기" (1312).
17. **Paywall buttons are identical.** "🔑 이용권 코드 등록" and "🛒 구매 안내" both call `openModal` (`LessonPaywall.tsx:105-119`).
18. **Canonical/SEO.** A `-1`/`-2` page declares its main page as canonical (`content.ts:175-181`), but it renders only half the items, so it is not the same body as the comment assumes.
19. **Data inconsistencies with no runtime effect:**
    - JSON `pairId` of the 86 `-N` files points at the main, while code pairs with odd `-N` (`content.ts:139-156`).
    - Index `order` duplicates (gh1-008=4 like gh1-007-1; gh1-089=135 like gh1-088).
    - Leftover `paragraph` fragments in 12 files.
    - gh1-059 / gh1-059-1 instruction "영작문제 5" should read "답안".
    - `audio[]` omissions on gh1-058, gh1-088, gh1-102; `audio:[]` on gh1-020 changes the top player label to "전체 듣기" there only.
20. **Possible state carry-over on client-side lesson navigation** (needs a runtime check). The restore effect (260-294) only **sets** state when saved data exists and never clears. If Next's App Router reuses the GrammarLearningView instance between `/grammar1/gh1-006` and `/grammar1/gh1-008` (same component at the same tree position), previous answers would stay on screen and autosave under the new key. The segment remount in App Router makes this unlikely; §10.7.7 checks it.
21. **Dead code.** `ruleSummary`'s regex allows `gh1-021` (133), which always redirects. The `isScript` and `audioTracks` props are unused, so `-1`/`-2` pages get no script-specific UI.
