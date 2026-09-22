# GRAMMAR II (`grammar2`) — screen and feature map for the CDP drivers

> Stage 1 of the 2026-09-18 audit. **Source reading only.** Nothing here was run in a browser.
> Counts in §2 and the audio and grading facts in §5–6 were computed with node from `content/` and the shipped
> TS modules (via `docs/qa-2026-09-15/scripts/tsload.cjs`). Line numbers refer to the working tree at `main` = `9d6e15d`.
> Written and checked by the same agent (Claude). Nobody else has reviewed it. Items marked **UNVERIFIED** are code-reading hypotheses.

---

## 0. Summary for the driver author

- **Same component as GRAMMAR I.** `LessonBody` sends both `grammar1` and `grammar2` to `GrammarLearningView` (`src/components/LessonBody.tsx:152-163`). The four steps, the grader, the storage key scheme and every button label are shared. The differences are listed in §3.3.
- **No per-question navigation, and no hint button.** All items of a lesson are rendered as one scrolling list in each step. The "previous/next" controls are the **step** buttons (`← 이전 Step` / `다음 Step →`) and the **lesson** links (`이전 강의` / `다음 강의`).
- **The legacy `choice` (1–5번 radios) and `dictation` (10-row textarea) blocks are in all 88 JSON files but are never rendered.** `LessonBody` returns `GrammarLearningView` before `DictationPanel` is reached (`LessonBody.tsx:152` vs `:603`).
- **Nothing in the UI links to the 44 Korean-script pages `gh2-NNN-1`.** The course list hides them (`src/app/[course]/page.tsx:99-110`), the search index skips them (`scripts/buildSearchIndex.ts`, `variant === "script"` → continue), and a main page's prev/next only walks main pages (`src/lib/content.ts:128-129`). You can reach them only by direct URL, or with prev/next from another script page. They render **the same items** as their main page, but store work under a separate key.
- **All audio is pre-generated Azure "Ava" clips** (`/audio/azure-ava/v1/<key>.mp3`). The lesson's original MP3 (`/audio/grammar2/gh2-NNN.mp3`) is in the data but is never requested by the page (§6).
- **Server-side gate.** Free: `gh2-007`, `gh2-007-1`, `gh2-008`, `gh2-008-1`. Every other page renders the paywall unless the request carries a valid `kig_license_session` cookie (§8).

---

## 1. Routes and data sources

### 1.1 Routes

| Route | File | Notes |
|---|---|---|
| `/grammar2` | `src/app/[course]/page.tsx` + `src/components/CourseDashboard.tsx` | Course list: 6 accordions, 44 cards (main pages only) |
| `/grammar2/gh2-NNN` (NNN = 007..050) | `src/app/[course]/[lesson]/page.tsx` | Main page ("[ N과 영어 ]") |
| `/grammar2/gh2-NNN-1` | same | Script page ("[ N과 한글 ]"). Canonical → `/grammar2/gh2-NNN` (`page.tsx:78`, `content.ts:175-181`) |
| `/audio/azure-ava/v1/<key>.mp3` | `src/app/audio/[...path]/route.ts` → `src/lib/mediaRoute.ts` + `src/lib/mediaAccess.ts` | Speech clips. 403 `private, no-store` when locked (`mediaRoute.ts:40-43`) |
| `/audio/grammar2/gh2-NNN.mp3` | same | Original recording. Gated the same way. Not requested by the UI |
| Anything else under `/grammar2/…` | `src/proxy.ts:102-108,176-194` | Not on the `validRoutes.json` allow list → rewritten to the 404 page |

`src/lib/generated/validRoutes.json` → `lessons.grammar2` lists exactly the 88 ids (`gh2-007`, `gh2-007-1`, …, `gh2-050-1`), and `courses` contains `grammar2`.

**GRAMMAR II has no redirects.** The odd-page redirect exists only for `grammar1` (`page.tsx:129-137`, `content.ts:189-194`).

### 1.2 Course index — `content/courses/grammar2.json`

Top-level keys: `course` (`"grammar2"`), `tab` (`"grammar2"`), `lessonCount` (44), `groups[]`, `lessons[]`.

- `groups[i]` = `{ label: "[ 7과 - 14과 ]", lessons: ["gh2-007","gh2-007-1",…] }`
- `lessons[i]` (LessonSummary) = `{ id, title, label, series:"gh2", variant:"main"|"script", unit, part:null, order, hasAudio, menuLabel }`

The course metadata comes from `src/lib/courses.ts:78-89`:
- `title: "GRAMMAR II"`, `titleEn: "Grammar 2"`, `lessonNaming: "number"`
- `description: "심화 구문 및 패턴별 집중 영작 트레이닝. 고난도 문형과 어순 감각 완성."`

The page's `lessonCount` is recomputed as the number of `variant === "main"` lessons (`content.ts:52`).

### 1.3 Lesson file — `content/lessons/grammar2/<id>.json` (type `Lesson`, `src/lib/types.ts:173-215`)

All 88 files have exactly these keys: `id, course, series, variant, pairId, title, label, menuLabel, unit, part, order, audio, video, blocks, legacyPath, legacyEncoding`. There is no `chunkDrills`, `readingSentences` or `readingVocabulary`.

| Field | Main `gh2-007` | Script `gh2-007-1` |
|---|---|---|
| `variant` | `"main"` | `"script"` |
| `pairId` | `null` | `"gh2-007"` |
| `title` | `"::: K-IG 교육 영어듣기훈련프로그램 \| 기초2 \| 제 001 회 강의 :::"` (**same string in all 88 files**, legacy, not rendered) | same |
| `label` | `"[ Lesson 7 ]"` | same |
| `menuLabel` | `"[ 7과 영어 ]"` | `"[ 7과 한글 ]"` |
| `unit` | 7 | 7 |
| `order` | 0 (main = 2k, script = 2k+1) | 1 |
| `audio` | `[{src:"/audio/grammar2/gh2-007.mp3", legacySrc:"sounds/gh2-007.mp3", autoplay:true}]` | the same src |
| `video` | `[]` | `[]` |
| `legacyPath` | `"grammar2/gh2-007.htm"` | `"grammar2/gh2-007-1.htm"` |

`blocks[]` (type `Block`, `types.ts:114-132`). In block order:
1. `{type:"heading", text:"[ Lesson 7 ]"}`. Not rendered by `GrammarLearningView`.
2. One or more `{type:"sentences", items:[{n:"1", text:"…", alternatives?:["…"]}]}`. **This is the question data.** Main = English model answers. Script = Korean prompts. `alternatives` appear only on main items.
3. On 12 files, `{type:"paragraph", text:"…"}` blocks sit between sentences blocks (§2.4). Not rendered.
4. `{type:"choice", options:["1 번","2 번","3 번","4 번","5 번"]}`. Not rendered.
5. `{type:"dictation", rows:10}`. Not rendered.

**The expected item list for lesson NNN** (the same on both of its pages) is built the way `GrammarLearningView.tsx:156-217` builds it:
```
mainItems   = flatten(all "sentences" blocks of gh2-NNN).items      (English)
scriptItems = flatten(all "sentences" blocks of gh2-NNN-1).items    (Korean)
item[i] = { numberLabel: main[i].n, englishText: cleanText(main[i].text),
            koreanText: cleanText(script[i].text),
            alternatives: (main[i].alternatives||[]).map(cleanText).filter(Boolean) }
cleanText(t) = t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim()   // GrammarLearningView.tsx:54-60
```
Checked with node: no GRAMMAR II item starts with a number, contains a `/`, or has a double space. `cleanText` is therefore the identity after `trim()`, and the DOM text should equal the JSON string exactly.

On a script page the roles flip. `blocks` = Korean and `pairBlocks` = English, and the `isEnglish` test at `:183-199` swaps them back. The result is identical.

---

## 2. Counts, id sequence and data oddities (computed 2026-09-18 with node)

### 2.1 Ids and grouping
- Index: 88 entries = **44 main + 44 script**. `lessonCount` field = 44. There are 88 JSON files on disk, all in the index, with none extra and none missing.
- Main ids run **gh2-007 … gh2-050 with no gaps and no duplicates**. Each main is immediately followed by `<id>-1` in the index. `order` equals the index position (0..87). `unit`, `label` and `menuLabel` all match the id number.
- `groups` order equals index order, and all 88 ids are grouped exactly once.

| # | Raw label | Displayed (`formatGroupTitle`, `curriculumPresentation.ts:57-59`) | Mains | First → last |
|---|---|---|---|---|
| 1 | `[ 7과 - 14과 ]` | `제 7과 ~ 제 14과 핵심 패턴 영작` | 8 | gh2-007 → gh2-014 |
| 2 | `[ 15과 - 21과 ]` | `제 15과 ~ 제 21과 핵심 패턴 영작` | 7 | gh2-015 → gh2-021 |
| 3 | `[ 22과 - 28과 ]` | `제 22과 ~ 제 28과 핵심 패턴 영작` | 7 | gh2-022 → gh2-028 |
| 4 | `[ 29과 - 35과 ]` | `제 29과 ~ 제 35과 핵심 패턴 영작` | 7 | gh2-029 → gh2-035 |
| 5 | `[ 36과 - 42과 ]` | `제 36과 ~ 제 42과 핵심 패턴 영작` | 7 | gh2-036 → gh2-042 |
| 6 | `[ 43과 - 50과 ]` | `제 43과 ~ 제 50과 핵심 패턴 영작` | 8 | gh2-043 → gh2-050 |

### 2.2 Items per lesson (= "총 N개 문항"), alternatives, and the top player's sentence count

Total: **796 items** (795 distinct English sentences), **71 items with alternatives (94 alternative strings)**, **1,270 Step 2 blanks**.
Main and script item counts are equal in all 44 lessons, and every item's `n` runs `1..N` with no gaps. No text is empty.

| Lesson | Items | Items with alts (alt strings) | Top player M |
|---|---|---|---|
| gh2-007 | 16 | 0 | 16 |
| gh2-008 | 17 | 1 (1) | 17 |
| gh2-009 | 17 | 3 (3) | 17 |
| gh2-010 | 16 | 1 (1) | 16 |
| gh2-011 | 20 | 3 (3) | 20 |
| gh2-012 | 18 | 0 | 18 |
| gh2-013 | 23 | 5 (5) | 23 |
| gh2-014 | 15 | 0 | 15 |
| gh2-015 | 18 | 2 (2) | 18 |
| gh2-016 | 36 | 2 (3) | 36 |
| gh2-017 | 27 | 4 (6) | 27 |
| gh2-018 | 25 | 3 (4) | **13** |
| gh2-019 | 26 | 2 (3) | 26 |
| gh2-020 | 26 | 1 (1) | 26 |
| gh2-021 | 23 | 3 (3) | 23 |
| gh2-022 | 22 | 0 | 22 |
| gh2-023 | 20 | 0 | 20 |
| gh2-024 | 22 | 3 (5) | 22 |
| gh2-025 | 20 | 1 (1) | 20 |
| gh2-026 | 18 | 2 (4) | 18 |
| gh2-027 | 16 | 2 (4) | **12** |
| gh2-028 | 26 | 2 (3) | 26 |
| gh2-029 | 19 | 1 (1) | 19 |
| gh2-030 | 16 | 2 (2) | 16 |
| gh2-031 | 16 | 1 (2) | 16 |
| gh2-032 | 16 | 1 (1) | 16 |
| gh2-033 | 17 | 0 | 17 |
| gh2-034 | 15 | 1 (1) | 15 |
| gh2-035 | 12 | 2 (2) | 12 |
| gh2-036 | 15 | 1 (2) | 15 |
| gh2-037 | 18 | 3 (3) | 18 |
| gh2-038 | 19 | 2 (3) | 19 |
| gh2-039 | 14 | 2 (4) | 14 |
| gh2-040 | 10 | 3 (3) | 10 |
| gh2-041 | 15 | 0 | 15 |
| gh2-042 | 12 | 1 (1) | 12 |
| gh2-043 | 15 | 0 | 15 |
| gh2-044 | 12 | 0 | 12 |
| gh2-045 | 15 | 1 (1) | **1** |
| gh2-046 | 14 | 1 (2) | **3** |
| gh2-047 | 19 | 0 | 19 |
| gh2-048 | 16 | 8 (13) | **3** |
| gh2-049 | 14 | 1 (1) | 14 |
| gh2-050 | 10 | 0 | **9** |

"Top player M" is the number of sentences the `전체 듣기` player at the top of the page queues (the `i/M` counter). It is the same on the `-1` page. Bold marks lessons where M < items (§6.2, §12 S-1).

### 2.3 Other oddities found in the data
- **Duplicate English across lessons:** `gh2-022#5` = `gh2-025#6` = "Will you do me a favor?" (plausibly intentional).
- **All 88 `title` fields** read "영어듣기훈련프로그램 | 기초2 | 제 001 회 강의". This is legacy text and is not displayed.
- **Curly quotes in Korean prompts:** gh2-027-1#12, gh2-049-1 #1,3,5,7,9,11,13, and gh2-050-1 #1,3,5,7. They are displayed only, never graded.
- **English items with straight double quotes:** 12 items (gh2-027#12; gh2-049 #1,3,5,7,9,11,13; gh2-050 #1,3,5,7). See §5.4.
- **English items with a hyphenated word:** 15 items (gh2-024#22, 026#7, 026#14, 027#2, 027#3, 029#1, 032#15, 035#1, 035#3, 037#4, 037#14, 038#9, 040#2, 047#12, 048#11).
- **Multi-sentence or abbreviation items:** gh2-009#12 "U.S.", gh2-024#5 "No, not at all. Go ahead.", gh2-025#1 "a.m./p.m.", gh2-026#15 (two sentences), gh2-029#10 "Mr.", gh2-040#2, gh2-045#6/#7.
- **Model answers using `'d` (grader does not expand it):** gh2-022#20, gh2-029#7, gh2-029#8, gh2-037#13.
- **Model answer where `'s` means "has":** gh2-047#1 "He's just got divorced, so he's been a little short lately."

### 2.4 Leftover `paragraph` blocks (not rendered; they split the sentences blocks)

These are fragments left behind when the 2026-09-17 fix G2-23 (`docs/qa-2026-09-17/issues.md:76`) merged cut-off sentences back into their items.

| File | Block | Text | Effect |
|---|---|---|---|
| gh2-018 | blocks[2] | `The plan was opposed by the members.` | Splits sentences 13 \| 12 |
| gh2-022-1 | blocks[2] | `미국 사람은 네꺼 내꺼 철저히 따진다).` | Splits 16 \| 6 |
| gh2-024-1 | blocks[2] | `상관하시겠습니까(싫어하시겠습니까? 괜찮겠습니까)?` | Splits 4 \| 18 |
| gh2-027 / -1 | blocks[2] | `he'll get better grades maybe even straight A's next year.` / `어쩌면 심지어 "올 에이"까지 받을 것으로 확신한다.` | Splits 12 \| 4 |
| gh2-032-1 | blocks[2] | `않도록 해라. 나에게 신경 쓰지 말아라.)` | Splits 7 \| 9 |
| gh2-042-1 | blocks[2] | `마리화나 사용자로서 축출되었을 때 극적으로 나타났다.` | Splits 8 \| 4 |
| gh2-045 | blocks[2] | `never found out.` | Splits 1 \| 14 |
| gh2-046 | blocks[2] | `you at the station.` | Splits 3 \| 11 |
| gh2-048 | blocks[2,4,6] | `I would have given you a ring.` / `they would have had food and clothes.` / `they could not have been contaminated by the HIV virus.` | Splits 3 \| 6 \| 2 \| 5 |
| gh2-050 / -1 | blocks[2,4,5] | `Washington.` / `sale of unheated blood products, which resulted in the HIV infection of more than 1,800` / `hemophiliacs.` (+ Korean) | Splits 9 \| 1 |

The item list in §1.3 flattens all sentences blocks, so **the questions are complete**. The top audio player reads only the **first** sentences block (§6.2).

---

## 3. Components (file:line)

### 3.1 Render chain for `/grammar2/<id>`
1. `src/proxy.ts` checks the allow list (`validRoutes.json`), then `src/app/[course]/[lesson]/page.tsx`.
2. `page.tsx:116-117` `getLesson`. `:119` `getLessonContext` (prev/next/pair). `:148-182` server gate → `LessonPaywall`.
3. `page.tsx:264-326` top nav: course link, `LessonActionButtons`, prev/next lesson links.
4. `page.tsx:328-332` `<h1>` = `pres.title`.
5. `page.tsx:342-365` `AudioPlayer`. For grammar2, `topLevelAudio = lesson.audio`, one track. `fallbackSentences` comes from `extractSentencesForAudio` (`:428-530`).
6. `page.tsx:368-384` `LessonBody` (`src/components/LessonBody.tsx:152-163`) → `GrammarLearningView` (dynamic import with skeleton `:31-34`).
7. `page.tsx:398` `LessonStepNavigation` (`src/components/LessonStepNavigation.tsx`).

### 3.2 Modules
| Concern | File:lines |
|---|---|
| Item extraction | `src/components/GrammarLearningView.tsx:156-217` |
| Cloze builder | `GrammarLearningView.tsx:30-40` (keyword set), `:75-115` |
| State, storage, autosave | `GrammarLearningView.tsx:221-330` |
| Handlers | `GrammarLearningView.tsx:340-445` |
| Metrics / exam score | `GrammarLearningView.tsx:447-470` |
| Step 1 / 2 / 3 / 4 JSX | `:664-927` / `:932-1046` / `:1051-1160` / `:1165-1318` |
| Grader | `src/lib/grammarGrading.ts` (pure, no imports) |
| Mic tester | `src/components/VoiceSpeakingTester.tsx`, `src/lib/speechRecognition.ts` |
| Speech engine | `src/lib/speech.ts` (`speakText` `:1017`, `playSentenceQueue` `:1110`, `playUnifiedClip` `:755`), `src/lib/unifiedSpeech.ts` |
| Top player | `src/components/AudioPlayer.tsx` |
| Bookmark / complete | `src/components/LessonActionButtons.tsx`, `src/components/ProgressProvider.tsx` |
| Titles | `src/lib/curriculumPresentation.ts:141-152` |
| Free list | `src/lib/license.ts:81` |
| Course list page | `src/app/[course]/page.tsx`, `src/components/CourseDashboard.tsx` |
| Paywall | `src/components/LessonPaywall.tsx` |

### 3.3 GRAMMAR II vs GRAMMAR I — every difference found in code
| Aspect | GRAMMAR I | GRAMMAR II |
|---|---|---|
| Learning view | `GrammarLearningView` | **same** |
| Grader, steps, labels, storage key scheme | shared | **same** |
| Page pairing | even id = one side, odd id = the other; odd pages **redirect** to even (`page.tsx:129-137`, `content.ts:139-156`) | main `gh2-NNN` ↔ script `gh2-NNN-1` by suffix (`content.ts:134-137`); **no redirects** |
| Script pages | `-1`, `-2` | `-1` only |
| Top audio track | picks the odd-numbered (English) track (`page.tsx:239-245`) | `lesson.audio` as-is (one track). Either way TTS mode, so no MP3 is played |
| Header icon/title (`GrammarLearningView.tsx:498-504`) | `✍️` `Grammar 1 : 기초 영작 및 문법 훈련` | `🧩` `Grammar 2 : 문법 패턴 & 구문 직독직해` |
| Rule-summary `<details>` "📘 문법 확인 — be동사 규칙 …" (`:132-153`, `:637-659`) | only `grammar1/gh1-020`, `gh1-021` | never. Assert it is **absent** on gh2-020/021 (the old `includes("020")` bug, comment `:130`) |
| Lesson title (`curriculumPresentation.ts`) | `NN강 · 기초 영작 훈련` (`:117-139`) | `제 NN과 · 패턴 영작 훈련` (`:141-152`) |
| Group titles | `제 N단계 : … (Stage N)` map (`:45-55`) | regex → `제 A과 ~ 제 B과 핵심 패턴 영작` (`:57-59`) |
| Course list script hiding | also hides the `gh1-(n+1)` companion (`[course]/page.tsx:103-108`) | suffix rule only |
| Free lessons | 12 ids (`license.ts:75-80`) | 4 ids (`license.ts:81`) |

---

## 4. Every view and control

Default UI language is `ko` (`src/lib/i18n.ts:13`, stored in `localStorage["kig:lang"]` by `LanguageProvider.tsx:42`). **All `GrammarLearningView` strings are hard-coded Korean and ignore `kig:lang`.** Only the top `AudioPlayer`'s `t()` strings change. Leave `kig:lang` unset or set to `"ko"`.

### 4.1 Lesson page chrome (`page.tsx`)
| Control | Exact text / aria | Precondition | Effect / assertion |
|---|---|---|---|
| Nav container | `<nav aria-label="강의 이동">` | — | — |
| Course link | text `← GRAMMAR II 목록` (arrow in `aria-hidden` span), href `/grammar2` | — | Navigates to the list |
| Bookmark | aria-label `북마크 추가` / `북마크 해제`; text `☆북마크` / `★북마크됨` | — | Toggles `localStorage["kig:progress:bookmarks"]["grammar2:<id>"]` = true, or deletes the key (`ProgressProvider.tsx:224-236`) |
| Complete | aria-label `학습 완료 체크` / `학습 완료 취소`; text `완료 체크` / `✓학습 완료` | course ≠ student | Toggles `localStorage["kig:progress:completed"]["grammar2:<id>"]` (`:196-215`). No server call for grammar2 |
| Recent (automatic) | — | on mount | `localStorage["kig:progress:recent"]` = `{course:"grammar2", lessonId, title:"제 07과 · 패턴 영작 훈련", courseTitle:"GRAMMAR II", updatedAt}` (`LessonActionButtons.tsx:23-25`) |
| Prev lesson | `<a aria-label="이전 강의: <title>">` with `이전 강의` + title | `prev` exists | href `/grammar2/<prev.id>` |
| Next lesson | `<a aria-label="다음 강의: <title>">` with `다음 강의` + title | `next` exists | href `/grammar2/<next.id>` |
| H1 | `제 NN과 · 패턴 영작 훈련` (NN zero-padded to 2) | — | Same H1 on the main and `-1` pages |
| `<title>` | `제 NN과 · 패턴 영작 훈련 · K-IG 핵심 어학 마스터` (`layout.tsx:18`) | — | — |
| meta description | `[ N과 영어 ] — 제 NN과 · 패턴 영작 훈련. K-IG 핵심 어학 과정.` (script: `한글`) | — | — |
| robots | absent for the 4 free ids; `noindex, follow` otherwise (`page.tsx:93-98`) | — | — |

### 4.2 Top player — `AudioPlayer` (always in **TTS mode** on `/grammar2/*`)
`isTtsMode = fallbackSentences.length>0 && (shouldUseUnifiedSpeech(pathname) || …)` (`AudioPlayer.tsx:62-63`). `shouldUseUnifiedSpeech` is true for every non-CNN path (`unifiedSpeech.ts:42-47`), so no `<audio>` element is rendered.

| Control | Text / aria | Effect |
|---|---|---|
| Play/pause | aria `재생` / `일시정지` (`player.play/pause`), SVG icon | Idle: `playSentenceQueue(fallbackSentences, {rate, startIndex:0, gap:300})`. Speaking: `togglePauseSpeech` |
| Stop | aria `정지`, disabled when idle | `stopSpeech()` |
| Previous | text `이전`, aria `이전 문장` | Speaking: previous sentence. Idle: start at `max(0, i-1)` |
| Next | text `다음`, aria `다음 문장` | Speaking: next sentence. Idle: start at `min(M-1, i+1)` |
| Sentence slider | `<input type=range aria-label="문장 이동" aria-valuetext="k번째 문장 / 전체 M문장">`, opacity 0 | Jumps on pointerup/keyup/blur |
| Counter | `i/M` (i = queue index + 1; idle shows `1/M`) | M per §2.2 |
| Speed | label `속도`; buttons `0.8×`, `1×`, `1.2×` with `aria-pressed` | Sets the clip `playbackRate`. Restarts the queue at the current index if speaking |
| Status | `▶ 재생 버튼을 눌러 전체 듣기` / `🔊 음성 읽는 중…` / `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기` | — |
| Keyboard | Space toggles play (ignored while focus is in an input) (`:182-198`) | — |

### 4.3 `GrammarLearningView` header (always visible)
- Icon `🧩`. Title `Grammar 2 : 문법 패턴 & 구문 직독직해`. Counter **`총 N개 문항`** (N from §2.2).
- Saved stamp (only when `savedAt` is set): green dot + `<M. D. 오전/오후 h:mm> 자동 저장됨` (format `toLocaleString("ko-KR",{month,day,hour,minute:"2-digit"})`, `:66-73`). **It must not appear on first paint with empty storage** (FUN-07 fix, `:255`, `:307`).
- Step pills in `<nav aria-label="문법 4단계 학습 모드">`. Their `textContent` is `✍️Step 1 · 영작 훈련`, `🧩Step 2 · 빈칸 완성`, `⚖️Step 3 · 구문 각인`, `📝Step 4 · 종합 평가`. The active pill has class `bg-ink`. There is no aria-pressed.
- Voice speed: `1.0x` (title `음성 속도 1.0x`) and `0.85x` (title `음성 속도 0.85x (천천히)`), with `aria-pressed`. This sets `audioSpeed`, the rate for item playback in all steps. **Not persisted.**
- Font size: `기본` / `크게` / `특대` with `aria-pressed`. **Not persisted.** Expected computed font-size of the Korean prompt `<p>` in Step 1: 16px / 18px / 20px. English model answer: 16.5 / 18.5 / 21px. Step 1 input at ≥640px: 15 / 16.5 / 18px (below 640px: 16 / 17 / 18px) (`:473-489`).
- Default mode on every load = Step 1 (`composition`). The mode is not persisted.

### 4.4 Step 1 · 영작 훈련 (`studyMode === "composition"`, `:664-927`)

Dashboard (3 cards):
- `작성 진행률`: `{answered} / {N}` and `{round(answered/N*100)}%`. answered = items whose answer `.trim()` is non-empty (`:449-451`).
- `자가 채점 정답률`: `{correct} 개 맞음` and `{answered>0 ? round(correct/answered*100) : 0}%`. correct = items with `selfGrades[id] === true` (`:450-452`).
- `일괄 동작`:
  - `💡 전체 정답 보기` → for every item sets `revealedAnswers["composition:<id>"]=true`. Merged, so other modes are untouched (`:391-401`).
  - `🔒 전체 정답 가리기` → sets them all to false.
  - `↺ 모든 작성 내용 초기화` → `window.confirm("작성하신 모든 영작 내용과 자가 채점을 초기화하시겠습니까?")`. OK clears answers, selfGrades, clozeInputs, revealedAnswers, shadowingRepeats and examSubmitted, and removes the storage key. Cancel does nothing (`:403-417`). **The CDP driver must handle `Page.javascriptDialogOpening`.**

Per item card (in order of `n`):
| Element | Exact text / aria | Behaviour and state |
|---|---|---|
| Number badge | `{n}` | — |
| `🎯 정답 일치!` | badge | Shown live while `gradeAgainstReferences(answer, [english, ...alts]) === "exact"` (`:738-740`). **This is the only automatic answer check in Step 1.** There is no partial or incorrect badge |
| `✓ 학습 완료` | badge | when `selfGrades[id] === true` (card border emerald) |
| `↺ 복습 필요` | badge | when `selfGrades[id] === false` (card border amber) |
| Play button | text `🔊영어 정답 발음` / `⏹️정지`; title `정답 영어 발음 듣기` / `정지`; **no aria-label** | `playEnglish(englishText, id)`. A second click on the same item stops it (`:340-356`) |
| Korean prompt | `<p>` = `koreanText` | — |
| Answer input | `<input type=text aria-label="{n}번 영작 답안" placeholder="이곳에 영어 문장을 영작해보세요... (예: I am...)">` | Writes `answers[id]`. There is no submit; Enter does nothing |
| Clear | `✕`, title `지우기` | Visible while answered. Sets `answers[id]=""` |
| Mic | `VoiceSpeakingTester` label `마이크로 말해서 영작하기` (the `🎙️ ` prefix is stripped from the text and re-added as an icon span) | §4.8. On result: `answers[id]=transcript`; if score ≥ 80 → `toggleSelfGrade(id,true)` |
| Reveal | `💡 정답 확인` / `🔒 정답 가리기` | Toggles `revealedAnswers["composition:<id>"]` |
| Self-grade label | `자가 채점:` (hidden below sm) | — |
| `✓맞음` | button | `toggleSelfGrade(id,true)`: sets true, or **deletes** the key if already true (`:369-379`) |
| `↺다시 풀기` | button | `answers[id]=""`, `selfGrades[id]=false`, `revealedAnswers["composition:<id>"]=false` (`:385-389`) |
| Model answer card | only when revealed: label `모범 답안 (Model Answer)`, `문장 복사` / `✓ 복사됨`, `🔊 발음 듣기`, `<p>` = englishText, and (if alts) `다른 정답: {alts.join(" / ")}` | Copy → `navigator.clipboard.writeText(englishText)`. Label flips for 2 s |

### 4.5 Step 2 · 빈칸 완성 (`cloze`, `:932-1046`)
- The intro box begins `💡 문법 패턴 클로즈 퀴즈:`.
- Per item: number badge; `🔊전체 문장 듣기` → `playEnglish`; `<p>` koreanText; the cloze line; the `💡 빈칸 정답 확인` / `🔒 빈칸 가리기` button → toggles `revealedAnswers["cloze:<id>"]`.

**How to compute the cloze line** (`buildCloze`, `:75-115`):
```
tokens = englishText.split(/(\s+|[.,?!;:"'()]+)/)        // separators kept, "" tokens possible
cands  = indices i where GRAMMAR_KEYWORDS.has(tokens[i].toLowerCase().trim())
if none: cands = [first i where /^[A-Za-z]{3,}$/.test(tokens[i])]
blanks = cands.slice(0,2)            // partIdx = token index; answer = tokens[i] as written
```
- Every token becomes one `<span>` (or an input for a blank), so the `textContent` of the line with blanks revealed equals `englishText`.
- Blank input: `<input aria-label="{n}번 문장 빈칸" placeholder="___">`, width `max(answer.length*14, 58)px`. Writes `clozeInputs[id][partIdx]`.
- Correct = `gradeAnswer(value, answer) === "exact"` (`:978`). Case-insensitive; punctuation `.,?!;:"'()` and surrounding spaces ignored. Correct shows a green border plus `✓` (`role=status`).
- Wrong = not correct AND non-empty AND (the input was blurred OR `value.trim().length >= answer.length`). Wrong shows a red border plus `✗` (`role=status`, title `다시 확인해 보세요`). An untouched, shorter, partial value shows neither.
- Revealed: each blank is replaced by `<span>` = answer (emerald). The input disappears but its value stays in state.
- Totals: 474 items have 2 blanks, 219 have 1 keyword blank, 103 have a single fallback blank; 1,270 blanks overall.
- **22 blanks are word fragments before an apostrophe**, rendered as `[___]` `'` `t`. The answer is the fragment (`Don`, `don`, `didn`, `hasn`, `Let`, `What`): gh2-012#9, 016#13, 016#25, 016#30, 017#18, 020#18, 020#22, 020#23, 022#14, 022#18, 023#9, 023#12, 024#9, 024#12, 024#14, 025#10, 026#11, 028#5, 028#25, 028#26, 032#7, 039#4.
- Example gh2-007#1 "If you want to marry me, wait a little." → blanks partIdx 0 = `If`, partIdx 6 = `to`.

### 4.6 Step 3 · 구문 각인 (`shadowing`, `:1051-1160`)
- Intro `🗣️ 구문 섀도잉 훈련:` … and `목표: 각 문장 3회 이상 섀도잉`.
- Per item card (the whole card is clickable): `handleRepeatIncrement` → `shadowingRepeats[id]+=1` **and** `playEnglish`. Clicking the card while its own item is speaking **stops** playback and still increments.
- Counter pill: `{k}회 연습` (k = 0, 1, 2), then `✓ 3회 달성!` when k ≥ 3.
- Copy button: aria-label `문장 복사` / `복사됨`, text `📋` / `✓`.
- Play button: title `발음 듣기` / `발음 정지`, text `🔊` / `⏹️`, no aria-label. It plays without incrementing (stopPropagation).
- `<p>` englishText, then `<p>` koreanText.
- Mic: `VoiceSpeakingTester` label `내 발음 채점 및 섀도잉 검증`. If score ≥ 70 → repeats += 1.

### 4.7 Step 4 · 종합 평가 (`exam`, `:1165-1318`)
- Header `📝실전 영작 모의 시험`. The instruction text mentions `[전체 채점하기]`, but the actual button reads `🎯 전체 시험 채점하기`.
- Per item: `Q{n}.` + koreanText. Input `aria-label="{n}번 시험 답안" placeholder="답안을 입력하세요..."`, **bound to the same `answers[id]` as Step 1**, and `disabled` while submitted.
- Footer (sticky): `작성 완료: {answered} / {N} 문항`. When answered = 0 and not submitted: `작성한 문항이 없습니다. 답안을 입력한 뒤 채점하세요.` (`role=status`).
- `🎯 전체 시험 채점하기` is disabled when answered = 0. It sets `examSubmitted=true`.
- After submit:
  - Score box (`role=status`): `최종 획득 점수` `{score}점`, `정답 일치: {E}개`, `부분 일치: {P}개`.
  - Per item badge: `✓ 정답 (100점)` / `△ 부분 정답 (70점)` / `✕ 오답 (0점)`. Unanswered items get the 0 badge.
  - Model row: `모범 답안:` englishText, then `(또는: alt1 / alt2)` if alts, then `🔊 발음 청취` → `playEnglish`.
  - The button becomes `↺ 답안 다시 수정하기` → `examSubmitted=false`.
- **Score:** `round((E*1 + P*0.7) / N * 100)`, where each item's grade = `gradeAgainstReferences(answers[id]||"", [englishText, ...alternatives])` (`:455-470`).

### 4.8 `VoiceSpeakingTester` (Step 1 and Step 3)
- Unsupported (no `SpeechRecognition` / `webkitSpeechRecognition`): text `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`. In KakaoTalk or an in-app browser: `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` plus `🌐 Safari로 열기` / `🌐 Chrome으로 열기`.
- Button (title `마이크를 누르고 영어 문장을 소리내어 말해보세요.`): idle `🎙️<label>`, listening `⏹️듣고 있는 중... (말씀하세요)`, result `🎙️{score}점 ({ratingLabel})`.
- While listening: panel `실시간 음성 인식:` + interim text or `지금 영어로 말씀하세요...`, and a `완료` button.
- After a result: `↺ 다시 녹음` (title `다시 말하기`), and a result card: `{score}점`, rating label, `단어 일치 {matched}/{total}`, `인식된 내 음성:` `"transcript"`, `단어별 발음 일치도:` word chips, `💡 {feedback}`.
- Errors (Korean): `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.` / `마이크 접근 권한이 거부되었거나 차단되었습니다. …` / `음성 인식 오류: {code}`.
- Score = `round(wordAccuracy*65 + charSim*20 + lenRatio*15)` (`speechRecognition.ts:120-221`). Labels by score: ≥92 `🌟 모든 단어 일치 (Excellent!)`; ≥80 `👍 대부분 일치 (Good!)`; ≥60 `💪 거의 맞았어요 (Almost!)`; else `다시 시도 (Try Again)`. An empty transcript scores 0 with label `음성 감지 안 됨`.

### 4.9 Bottom step navigation (`LessonStepNavigation.tsx`)
- `<nav aria-label="학습 단계 이동">`: `← 이전 Step` (disabled at step 1), link `목록으로` → `/grammar2`, `다음 Step →` (disabled at step 4).
- It finds step buttons by scanning `main button` for `/\bStep\s*(\d+)\b/`, so maxStep = 4. Clicking prev/next clicks the corresponding pill and scrolls it into view.
- A capture-phase click listener keeps `currentStep` in sync when a pill is clicked directly.

### 4.10 Course list `/grammar2` (`[course]/page.tsx`, `CourseDashboard.tsx`)
- `← 홈으로 돌아가기`; `CORE TRACK · 총 44개 정규 레슨 · 6개 단계 구성`; H1 `GRAMMAR II`; the description.
- Progress: `학습 진도율: {c} / 44개 완료 ({pct}%)`, where c = count of `kig:progress:completed` keys starting with `grammar2:` (`CourseDashboard.tsx:213-221`). The bar width is clamped at 100%.
- Filters: `전체 (44)`, `★북마크 ({b})`, `미완료 ({max(0,44-c)})`. Empty states: `아직 북마크된 레슨이 없습니다.` / `조건에 해당하는 레슨이 없습니다.` + `전체 레슨 목록 보기`.
- Accordion headers are buttons with `aria-expanded`, text = group title + `총 {k}개 레슨` (+ `· {d}개 완료`) + `펼치기 ▼` / `접기 ▲` (sm+). All start collapsed.
- Card:
  - Code `Lesson NN`, badge `🎙️ 마이크 채점`, star button (aria `북마크 추가` / `북마크 해제`; locked: disabled, aria `잠긴 레슨은 북마크할 수 없습니다`).
  - Title link `제 NN과 · 패턴 영작 훈련`, subtitle `English Model Pattern`, footer id `gh2-NNN`.
  - Footer link `학습하기 →`. Unlicensed: `무료 보기 →` on the first 2 cards of group 1 (pill `무료 보기`), `올패스 열람 🔒` elsewhere (pill `🔒올패스`).

---

## 5. Answer checking and normalisation (`src/lib/grammarGrading.ts`)

### 5.1 Pipeline
```ts
// :84-91  literal form
text.toLowerCase().replace(/[’‘]/g,"'").replace(/[.,?!;:"'()]/g,"").replace(/\s+/g," ").trim()
// :93-99  expanded form = lower-case, ’‘→', CONTRACTIONS (:46-58) applied in order, then literal
[/\bcan't\b/g,"can not"], [/\bcannot\b/g,"can not"], [/\bwon't\b/g,"will not"], [/\bshan't\b/g,"shall not"],
[/n't\b/g," not"], [/\bi'm\b/g,"i am"], [/\b(you|we|they)'re\b/g,"$1 are"],
[/\b(i|you|we|they|could|would|should|might|must)'ve\b/g,"$1 have"], [/\b([a-z]+)'ll\b/g,"$1 will"],
[/\b(he|she|it|that|this|there|what|who|where|here|how|when)'s\b/g,"$1 is"], [/\blet's\b/g,"let us"]
// :185-190 gradeAnswer = best of gradeNormalized(expanded) and gradeNormalized(literal)
// :222-250 gradeNormalized(user, model):
//   "" → incorrect; equal → exact; same letters with only spaces moved → exact
//     (partial if a changed word is in MEANING_CHANGING_JOINS :198-203);
//   user ≤ 1 word → incorrect; LCS(words)/modelWords < 0.7 → incorrect;
//   userWords > modelWords*1.15 → incorrect;
//   each wrong/missing word pair must be (both FUNCTION_WORDS :65-81) or looksLikeSameWord
//     (edit distance ≤1, or ≤2 when ≥8 chars, or same first 4-5 letters) → partial, else incorrect
// :253-262 gradeAgainstReferences = best grade over [englishText, ...alternatives]
```
Where each grade is used: Step 1 badge (exact only), Step 2 blanks (`gradeAnswer` against a single token, exact only), Step 4 (exact / partial / incorrect → 100 / 70 / 0).

### 5.2 Expected grades, computed with the shipped grader (node, 2026-09-18)
| Input | Reference | Grade |
|---|---|---|
| `If you want to marry me, wait a little.` | gh2-007#1 | exact |
| `if you want to marry me wait a little` | gh2-007#1 | exact |
| `  If  you want to marry me ,  wait a little .  ` | gh2-007#1 | exact |
| `IF YOU WANT TO MARRY ME, WAIT A LITTLE!` | gh2-007#1 | exact |
| `If you want to marry me, wait a littel.` | gh2-007#1 | partial |
| `If you want to marry me, wait the little.` | gh2-007#1 | partial |
| `If you want to marry me, wait a banana.` | gh2-007#1 | incorrect |
| `If you wanna marry me, wait a little.` | gh2-007#1 | incorrect |
| `Wait a little.` | gh2-007#1 | incorrect |
| `wait` / empty | gh2-007#1 | incorrect |
| `Though I love you, I can't do this.` / `…can not…` / `…can’t…` (curly) | gh2-007#7 `…cannot…` | exact |
| `If you do not study hard, …` / `If you dont study hard, …` / `…you'll never…` | gh2-007#2 | exact |
| `She has been working in a bank since she left school` (no period) | gh2-007#4 | exact |
| `She's been working in a bank since she left school.` | gh2-007#4 | **partial** (see S-4) |
| `Young as I am, I know it.` | gh2-007#16 | exact |
| `Though I am young, I know it.` | gh2-007#16 | incorrect |
| `He felt tired; still, he continued his work.` | gh2-016#36 (alt) | exact |
| `We are going to have a three day weekend.` | gh2-024#22 | **partial** (hyphen not normalised) |
| `He said “I saw him steal the money yesterday.”` (curly double quotes) | gh2-050#5 | **partial** |
| `…control 90 percent of auto sales.` | gh2-030#15 | partial |
| `Call me between 9 am and 5 pm by day and between 8 and 11 pm by night.` | gh2-025#1 | exact |
| `I would like to have a phone installed in my apartment.` | gh2-037#13 `I'd like…` | **partial** |
| `He has got a C average.` vs `He's got a C average.` | (synthetic) | **partial** |
| Cloze `If`, `if`, `if,`, ` If ` | `If` | exact |
| Cloze `I`, `Iff` | `If` | incorrect |
| Cloze `Don` | `Don` | exact |
| Cloze `don't`, `dont` | `Don` | **incorrect** |
| Cloze `what's` | `What` | incorrect |

For more cases, reuse `docs/qa-2026-09-17/scripts/verify-grammar2-fixes.cjs` and `docs/qa-2026-09-15/scripts/verify/verify-grammar-grading.cjs`. Both load the shipped grader.

### 5.3 Deriving expected results for any input in the driver
Load `src/lib/grammarGrading.ts` with `docs/qa-2026-09-15/scripts/tsload.cjs` and call `gradeAgainstReferences(input, [item.englishText, ...item.alternatives])`. This is the same code the page runs, so a browser/node mismatch means a build/deploy drift or a DOM-binding bug.

### 5.4 Normalisation gaps worth asserting (valid answers not given full marks)
- Curly double quotes `“ ”` (iOS Smart Punctuation) are not stripped (`:87-88`). This affects the 12 quoted items in §2.3.
- Hyphens and `%` are not normalised.
- `'s` is always read as "is"; `'d` is never expanded (`:43-45` documents that choice).
- In Step 2, typing the full contraction (`don't`) into a fragment blank is marked wrong.

---

## 6. Audio

### 6.1 Clip URL
```
clean = normalizeUnifiedSpeechText(text)   // unifiedSpeech.ts:4-15: "/"→" ", drop [..], "::"→" ", "--"→" ", "…"→" ", "|"→", ", "()"→" ", collapse spaces, trim
key   = clean.length.toString(36) + "-" + hex8(fnv1a-ish first) + hex8(second)   // unifiedSpeech.ts:21-35
url   = "/audio/azure-ava/v1/" + key + ".mp3"
```
Example: gh2-007#1 "If you want to marry me, wait a little." → `/audio/azure-ava/v1/13-2f902d8b5ec11a5a.mp3`.

What is spoken:
- **Item buttons** (Step 1 `영어 정답 발음` and `🔊 발음 듣기`, Step 2 `전체 문장 듣기`, Step 3 card/`🔊`, Step 4 `🔊 발음 청취`) → `speakText(englishText, {lang:"en", rate:audioSpeed})` (`GrammarLearningView.tsx:349-355`). One clip, `playbackRate` = 1.0 or 0.85.
- **Top player** → `playSentenceQueue(fallbackSentences, {rate: 0.8|1|1.2, gap:300})`. One clip per sentence, in order.
- Alternatives and Korean text are never spoken. Neither are the leftover paragraph fragments.

Local evidence: all **795** distinct item clips and every top-player clip exist in `public/audio/azure-ava/v1` (50,383 files). Production serves them from R2, so the driver must confirm 200/206 on production. All clips for gh2-007/008 (both pages) are in `src/lib/generated/freeSpeechKeys.json`.

### 6.2 Top player sentence list (`page.tsx:428-530`)
For grammar2, `extractSentencesForAudio` takes the English side (main blocks; on a script page, `pairBlocks`). It then returns `sentBlock.items` of **the first `sentences` block only** (`page.tsx:482-485`). Expected M is in §2.2. It is short for gh2-018 (13/25), 027 (12/16), 045 (1/15), 046 (3/14), 048 (3/16) and 050 (9/10), and the same on their `-1` pages.

### 6.3 Fallback chain (`speech.ts`)
1. `playUnifiedClip` (`:755-841`) sets the shared `new Audio()` (not in the DOM) to the clip URL and plays it.
2. On error or a rejected `play()` → `startLegacyEngine` (`:966-1002`) → Web Speech synthesis if the engine has a voice for `en` and the browser is not KakaoTalk or in-app (`:948-955`). Otherwise `playChunkViaStream` (`:708-752`) retries the **same clip URL**.
3. If that also fails → `finishRun(err)` → the queue's `onError` resets the queue and the top player stops (`:1170-1176`). Item buttons return to idle.
   Headless Edge usually has no synthesis voices, so a missing clip there shows as "player stops", not as a spoken fallback.
4. The original MP3 `/audio/grammar2/gh2-NNN.mp3` is never used (`<audio>` is rendered only outside TTS mode, `AudioPlayer.tsx:205`).

### 6.4 Instrumentation for CDP
The shared audio element is not in the DOM. Inject before load (`Page.addScriptToEvaluateOnNewDocument`):
```js
window.__plays=[]; const P=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(){ window.__plays.push({src:this.currentSrc||this.src, rate:this.playbackRate, t:Date.now()}); const p=P.call(this); p&&p.catch&&p.catch(e=>window.__plays.push({err:String(e),src:this.src})); return p; };
```
Ignore the one-time `data:audio/wav` warm-up (`speech.ts:169-183`). Also watch `Network.responseReceived` for `/audio/azure-ava/v1/*` (expect 206/200, never 403/404). Launch with `--autoplay-policy=no-user-gesture-required`, or use `Input.dispatchMouseEvent` clicks, which count as a user gesture.

---

## 7. Persistence, completion and progress

| Key (localStorage) | Written by | Shape |
|---|---|---|
| `kig:grammar:work:grammar2/<id>` (separate for `gh2-NNN` and `gh2-NNN-1`) | `GrammarLearningView.tsx:257,296-330`, 400 ms debounce, only when the snapshot changed | `{answers:{[id]:string}, selfGrades:{[id]:bool}, clozeInputs:{[id]:{[partIdx]:string}}, revealedAnswers:{["composition:1"|"cloze:1"]:bool}, shadowingRepeats:{[id]:number}, examSubmitted:bool, at:"9. 18. 오후 3:04"}`. Item id = 1-based position (= n) |
| `kig:progress:completed` | `완료 체크` | `{"grammar2:gh2-007":true,…}` (the key is deleted on un-complete) |
| `kig:progress:bookmarks` | `북마크` | same shape |
| `kig:progress:recent` | lesson mount | `{course, lessonId, title, courseTitle, updatedAt}` |
| `kig:lang`, theme | LanguageProvider | — |

- Restore happens on mount (`:259-294`). `clozeTouched`, `fontSize`, `audioSpeed`, `studyMode` and `copiedId` are **not** persisted.
- There is **no server-side progress for grammar2.** `/api/progress/student` is used only when course = student (`ProgressProvider.tsx:206`).
- "Completion" in GRAMMAR II is only the manual `완료 체크` toggle. Nothing in the steps marks a lesson complete: exam score, self-grades and 3× shadowing do not feed it.
- The course list counts completed/bookmarked keys by prefix `grammar2:`, which includes `-1` pages (§12 S-2).

---

## 8. Locking and entitlement

- **Free** (no licence needed): `gh2-007`, `gh2-007-1`, `gh2-008`, `gh2-008-1` (`license.ts:81`). The suffix-stripping loop (`:106-125`) also makes their media free. The client list uses `sectionIndex===0 && lessonIndex<2` (`license.ts:112-114`), i.e. the first two cards of group 1 (the same lessons).
- **Server gate** (`page.tsx:148-182`): `verifyLicenseSessionToken(cookie "kig_license_session")`. A STU* plan → paywall for grammar2. 1M / 1Y / LIFE → allowed. When locked, **no lesson content is in the HTML/RSC payload** (the body is never built).
- **Paywall** (`LessonPaywall.tsx`): `data-kig-paywall="license"`, `🔒`, pill `ALL-PASS ONLY`.
  - The `<h2>` = the lesson title (the `title` prop is always passed, so the generic sentence at `:75` is not shown).
  - Text: `공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다.`
  - Buttons `🔑 이용권 코드 등록` and `🛒 구매 안내` both call `openModal`.
  - Link `← GRAMMAR II 전체 목록`, and `1~2강은 무료로 상시 체험 가능합니다`.
  - With a STU licence (client side): pill `VIP ALL-PASS REQUIRED`, heading `본 레슨은 VIP 올패스 전용 강좌입니다`.
- **Media gate** (`mediaAccess.ts:86-112`): an Ava clip is free if its key is in `freeSpeechKeys.json`, otherwise it needs a session. Note that a STU-only session **can** fetch any clip (`:79-85`, documented). `/audio/grammar2/<id>.mp3` → free-preview id, or a session with a non-STU plan.
- The audit profile is LIFE, so every one of the 88 pages should render the view (no `[data-kig-paywall]`), and every clip should answer 200/206.

---

## 9. Navigation and boundaries

`getLessonContext` (`content.ts:124-163`):
- **Main page:** prev/next walk the 44 mains. gh2-007: no prev (a single next cell, `grid-cols-1`). gh2-050: no next.
- **Script page:** prev/next walk the full 88-entry list. gh2-007-1: prev = gh2-007, next = gh2-008. gh2-050-1: prev = gh2-050, next = none. The prev link on a script page shows **the same title as the page itself** (`제 07과 · 패턴 영작 훈련`).
- Group boundaries to click through: 014→015, 021→022, 028→029, 035→036, 042→043, and 050 (end).
- **Negative routes** (expect the readable 404 from the proxy, not the paywall): `/grammar2/gh2-006`, `/grammar2/gh2-051`, `/grammar2/gh2-007-2`, `/grammar2/gh2-7`, `/grammar2/GH2-007`, `/grammar2/gh2-007/x`.
- Course list: 6 accordions. The card link `href` = `/grammar2/gh2-NNN`.
- Bottom `목록으로` and the top course link → `/grammar2`.
- Back/forward and refresh: the mode resets to Step 1. Answers, reveals, repeats and examSubmitted are restored from localStorage.

---

## 10. CDP driver recipe — one lesson, every feature (repeat for all 88 pages)

Setup:
- Clone the profile with `docs/qa-2026-09-18/scripts/lib/profile.cjs` `cloneProfile("grammar2")`. Headless Edge flag: `--autoplay-policy=no-user-gesture-required`.
- `Browser.grantPermissions(["clipboardReadWrite","clipboardSanitizedWrite"], origin)`.
- `Page.addScriptToEvaluateOnNewDocument`: the play hook from §6.4, and a **fake recogniser**:
  ```js
  window.__sttTranscript = null;
  class FakeSR { constructor(){this.onstart=this.onresult=this.onerror=this.onend=null;}
    start(){ setTimeout(()=>{ this.onstart&&this.onstart();
      const t=window.__sttTranscript; if(t==null){ this.onerror&&this.onerror({error:"no-speech"}); this.onend&&this.onend(); return; }
      const r=[{transcript:t}]; r.isFinal=true; const results=[r];
      this.onresult&&this.onresult({resultIndex:0, results}); this.onend&&this.onend(); },50); }
    stop(){} abort(){} }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeSR;
  ```
- Listen to `Runtime.consoleAPICalled`, `Runtime.exceptionThrown`, `Log.entryAdded`, `Network.loadingFailed` and `Network.responseReceived` (record status ≥ 400), and `Page.javascriptDialogOpening`.

Expected data: for page `P`, build `items[]` per §1.3, `N = items.length`, `M` per §6.2 (use §2.2), blanks per §4.5, and grades with the shipped grader (§5.3).

**A. Load and static content**
1. `localStorage.removeItem("kig:grammar:work:grammar2/"+P)` on the origin, then navigate to `/grammar2/P`. Wait for `nav[aria-label="문법 4단계 학습 모드"]`.
2. Assert: HTTP 200; no `[data-kig-paywall]`; `h1` = `제 NN과 · 패턴 영작 훈련`; `document.title` ends with `· K-IG 핵심 어학 마스터`; `link[rel=canonical]` = `/grammar2/gh2-NNN`.
3. Assert: header text contains `Grammar 2 : 문법 패턴 & 구문 직독직해` and `총 N개 문항`; no `자동 저장됨` stamp; no `<details>` containing `문법 확인`.
4. Assert no radio group `1 번…5 번` and no dictation textarea (records that the legacy blocks are unrendered).
5. Top player: counter text = `1/M`; `aria-label="문장 이동"` has `max = M-1`.
6. Prev/next links: aria-labels and hrefs per §9.

**B. Step 1 content and answers** (default mode)
1. Count cards = N. For each i: badge = `n`; Korean `<p>` = koreanText; input aria `"{n}번 영작 답안"` with the exact placeholder.
2. Dashboard reads `0 / N`, `0%`, `0 개 맞음`, `0%`.
3. Item 1, **incorrect**: type `wait` (`Input.insertText` after focusing). No `🎯 정답 일치!`. Dashboard `1 / N` and `round(100/N)%`. Wait 600 ms → localStorage `answers["1"]==="wait"` and the stamp appears.
4. Item 1, **partial**: replace with a one-letter typo of englishText. Still no badge (Step 1 shows exact only).
5. Item 1, **exact variants**: englishText; all lower-case with punctuation removed; extra spaces; and, where the item has one, an alternative and a contraction/expansion variant. Each shows `🎯 정답 일치!`. Record any valid variant that does not (§5.4).
6. `✕` (title `지우기`) clears the input; the dashboard drops back.
7. `💡 정답 확인` → model card text = englishText, and `다른 정답: a / b` if alts. The button reads `🔒 정답 가리기`; the key `composition:1` is true. Click again to hide.
8. `문장 복사` → `✓ 복사됨` for about 2 s; `navigator.clipboard.readText()` === englishText.
9. `🔊 발음 듣기` and `영어 정답 발음`: `__plays` gets the clip URL for englishText with rate 1; the button shows `⏹️정지`; the network status is 206/200. Click again → stops (label back).
   Set `0.85x` → play again → rate 0.85. Set back to `1.0x`.
10. `✓맞음` → badge `✓ 학습 완료`, dashboard `1 개 맞음`, and accuracy = round(1/answered*100). Click again → the badge disappears (toggle off).
11. `↺다시 풀기` → input empty, badge `↺ 복습 필요`, `selfGrades["1"]===false`, and the model card hidden.
12. **Accuracy overflow probe (S-3):** with only item 1 answered, click `✓맞음` on items 2 and 3 (unanswered). Expected by code: `3 개 맞음` and `300%`. Record the actual value.
13. `💡 전체 정답 보기` → N model cards visible. `🔒 전체 정답 가리기` → 0.
14. Mic (fake STT): `__sttTranscript = englishText` → click `마이크로 말해서 영작하기` → input = transcript, button `100점 (🌟 모든 단어 일치 (Excellent!))` (or the score `evaluatePronunciation` gives in node), result card visible, `✓ 학습 완료` set.
    Click `↺ 다시 녹음` with the same transcript → by code the self-grade **toggles off** (S-5). Record.
    `__sttTranscript = null` → error `음성이 감지되지 않았습니다. …`. `__sttTranscript = "hello"` → low score, no self-grade.
15. Fill every item with its englishText (the exact path) → dashboard `N / N`, `100%`. Save and reload → all values restored, mode = Step 1.

**C. Step 2**
1. Click the pill `Step 2 · 빈칸 완성`. `LessonStepNavigation` prev is now enabled.
2. Per item: Korean `<p>`; the line `textContent` minus inputs = tokens with blanks removed; the number of inputs = number of blanks; aria `"{n}번 문장 빈칸"`.
3. For one blank each:
   - Type the answer lower-cased → `✓` appears.
   - Type one wrong character shorter than the answer → no mark. Blur → `✗`.
   - Type a wrong word of length ≥ answer.length → `✗` without blur.
   - For a fragment item (e.g. gh2-020#22), type `don't` → `✗` (record).
4. `💡 빈칸 정답 확인` → the inputs are replaced by spans; line textContent === englishText; key `cloze:<id>` true. Toggle back → the typed values are still there.
5. Assert Step 1 reveal state is unaffected: switch to Step 1 and check model cards are hidden unless revealed there.
6. Top-level `🔊전체 문장 듣기` → clip for englishText.

**D. Step 3**
1. Per card: English `<p>` = englishText, Korean `<p>` = koreanText, pill `0회 연습`.
2. Click the card body 3× (wait for each play to start) → pill `1회 연습`, `2회 연습`, `✓ 3회 달성!`; `shadowingRepeats[id]===3`; `__plays` has 3 entries.
3. The `🔊` button → plays with no increment. The `📋` button → copy, aria `복사됨`.
4. Mic `내 발음 채점 및 섀도잉 검증`: transcript = englishText → +1. Transcript scoring < 70 → no change.

**E. Step 4**
1. With empty answers (after reset, F1): footer `작성 완료: 0 / N 문항` and `작성한 문항이 없습니다. …`; the submit button is disabled.
2. Type answers designed to give known grades. For example: item 1 exact, item 2 partial (one typo in a ≥5-letter content word), item 3 incorrect (`hello world`), the rest empty. Inputs share values with Step 1: assert Step 1 shows the same text.
3. Click `🎯 전체 시험 채점하기` → the score box shows `round((E + 0.7P)/N*100)점`, `정답 일치: E개`, `부분 일치: P개`; per-item badges; model rows `모범 답안:` + alts `(또는: …)`; all inputs disabled; `examSubmitted` true in storage.
4. `🔊 발음 청취` plays the clip.
5. Reload → still submitted with the same score.
6. `↺ 답안 다시 수정하기` → inputs enabled, badges gone.
7. Double-click the submit button quickly → a single stable result (no error).

**F. Reset and persistence**
1. Step 1 → `↺ 모든 작성 내용 초기화`. First dismiss the dialog (assert the message text) → nothing changes. Then accept → all inputs empty, repeats 0, examSubmitted false.
   Within 1 s the storage key reappears with empty maps (by code, S-6). Record.
2. Open `/grammar2/<P>-1` → items identical to the main page but **empty** (separate key). Record.

**G. Top player**
1. Click play (aria `재생`) → `__plays` gets clip(sentence 1); the status becomes `🔊 음성 읽는 중…`.
2. `다음` → sentence 2 clip; counter `2/M`. `이전` → `1/M`.
3. Speed `1.2×` → the next play has rate 1.2.
4. Pause (aria `일시정지`) → status `⏸ 일시정지됨 …`. Resume.
5. Stop (aria `정지`) → idle, counter `1/M`.
6. Let it run to the end once for a short lesson (gh2-040 M=10, gh2-050 M=9): assert M distinct clip URLs were requested in order, all 200/206.
7. On gh2-045 assert M = 1 against N = 15 (S-1).
8. Press Space with focus on the body → toggles; with focus in an answer input → does not.

**H. Chrome and navigation**
1. `북마크` → aria flips, localStorage key `grammar2:P` present; reload → still `북마크됨`. Go to `/grammar2` → `★북마크 (b)` includes it; filter shows the card (for a `-1` page it will not — S-2). Unbookmark.
2. `완료 체크` → `학습 완료`, key set; `/grammar2` progress increments. Undo. **Record exactly what was changed** (audit rule).
3. `다음 Step →` ×3 → pills 2, 3, 4 active; next disabled at 4. `← 이전 Step` ×3 → back to 1.
4. Next/prev lesson links → the correct URL and H1. Browser back/forward keeps the restored work.
5. Fonts `크게` / `특대` / `기본` → computed sizes per §4.3.

**I. Console and network gate**
Fail the page on any uncaught exception, React/hydration error, or request ≥ 400 other than an intended 404 probe. Note `Uncaught (in promise)` from clipboard (S-7).

---

## 11. Cannot be automated headless (or only with a mock)

- **Real microphone and speech recognition.** Headless has no mic, and cloud STT is not reachable deterministically. The recipe mocks `SpeechRecognition`, which tests the scoring and state wiring but not recognition quality or permission prompts. Needs a person with a real device.
- **Audible correctness of the clips.** CDP can prove the right URL was fetched, returned 200/206, and fired `ended`. It cannot prove the voice says the sentence. That needs listening or an offline STT comparison.
- **Web Speech synthesis fallback.** Headless Edge normally has no voices, so the fallback path differs from desktop and mobile.
- **iOS / Android keyboards.** Smart punctuation (curly quotes), autocapitalise and autocorrect behaviour can be emulated only by typing those characters, not by the real keyboard.
- **KakaoTalk / in-app browser** branches (`isKakaoTalk`, `openExternalBrowser` intents).
- **Clipboard on real devices** (permission prompts, iOS focus rules). Headless uses granted permissions.
- **Licence purchase / STU-only plan paywall variant.** The audit profile is LIFE, and typing codes is forbidden.
- **Visual judgement** (contrast in dark mode, overlap) needs screenshots and a human.

---

## 12. Suspicious code — possible defects (ALL UNVERIFIED on production)

- **S-1 (top player reads only part of 6 lessons).** `src/app/[course]/[lesson]/page.tsx:482-485` returns only the first `sentences` block. The leftover paragraph blocks (§2.4) split gh2-018 / 027 / 045 / 046 / 048 / 050 and their `-1` pages, so `전체 듣기` plays 13/25, 12/16, **1/15**, 3/14, 3/16 and 9/10 sentences. The leftover `paragraph` blocks are also dead data in the JSON.
- **S-2 (course progress can exceed 100%; bookmark count vs list).** `CourseDashboard.tsx:213-221` counts every `grammar2:*` key, including script pages (`gh2-NNN-1`) marked on their own page (`LessonActionButtons` is shown there, `page.tsx:273-278`). The total is 44, so `45 / 44개 완료 (102%)` is possible; `미완료` is clamped at 0. `★북마크 (1)` could show an empty filtered list when only a `-1` page is bookmarked (the list shows mains only, `:229-236`).
- **S-3 (Step 1 accuracy > 100%).** `GrammarLearningView.tsx:450-452`: `accuracyPercent = correct/answered`, but `✓맞음` can be pressed on unanswered items (`:859-871`). So 3 marked with 1 answered shows `300%`.
- **S-4 (valid answers not given full marks).** `grammarGrading.ts:56` expands `X's` only to "is", so `She's been…` for `She has been…` (gh2-007#4, 014#1, 014#4, 021#2) and `He has just got…` for gh2-047#1 are partial. `:43-45` leaves `'d` unexpanded, so `I would like…` for gh2-022#20, 029#7, 029#8 and 037#13 is partial. `:87-88` does not normalise curly `“ ”`, so iOS input on the 12 quoted items is partial. Hyphen / no hyphen (15 items) is partial.
- **S-5 (mic success toggles "맞음" off).** `GrammarLearningView.tsx:832-836` calls `toggleSelfGrade(id,true)`. A second successful recording (or a first one on an item already marked 맞음) deletes the mark (`:373`).
- **S-6 (reset re-writes the storage key).** `handleResetAll` removes the key (`:412`), but the autosave effect (`:297-330`) sees a changed snapshot and writes an empty record 400 ms later. `clozeTouched` is not reset (`:232`), so a blank blurred before the reset shows `✗` immediately on the next partial input.
- **S-7 (unhandled clipboard rejection).** `handleCopy` (`:419-425`) has no `.catch`, so a denied or unfocused clipboard gives `Uncaught (in promise) NotAllowedError` and no feedback.
- **S-8 (cloze fragments).** `buildCloze` (`:79`) splits on apostrophes, so 22 blanks ask for `Don`, `don`, `didn`, `hasn`, `Let`, `What`, shown before `'t` / `'s`. The natural answer `don't` is marked `✗`. The regression test "cloze single word without apostrophe" in `verify-grammar-grading.cjs:84` grades `dont` against `don't`, which is not what the UI asks.
- **S-9 (pronunciation normaliser strips apostrophes before expanding contractions).** `speechRecognition.ts:71` runs before `:72-89`, so none of those replacements can ever match. Saying "I do not know anything about it" for "I don't know anything about it." scores 42 (`다시 시도`). Node output: 42, matched 1/6.
- **S-10 (exam and Step 1 share answers).** `GrammarLearningView.tsx:1240-1241` and `:807-808` bind the same state. The exam result recomputes live if Step 1 is edited after submission (`:455-470` depends on `answers`), and Step 1 inputs are not disabled.
- **S-11 (script pages unreachable).** No UI link to `gh2-NNN-1` (`[course]/page.tsx:99-110`, `content.ts:128-129`, search index skips scripts). They duplicate the main page's items with a separate saved-work key, and their prev link carries the same title as the page.
- **S-12 (legacy answer form silently dropped).** `choice` (1–5번) and `dictation` blocks in all 88 files are never rendered for grammar2 (`LessonBody.tsx:152-163` returns before `:603-610`). This may be intended; record it as "data present, not reachable".
- **S-13 (label mismatch).** The Step 4 instruction says `[전체 채점하기]` (`GrammarLearningView.tsx:1175`), but the button is `🎯 전체 시험 채점하기` (`:1312`). The course header says `구문 직독직해` (`:504`), while the lessons are composition drills.
- **S-14 (dark-mode contrast).** The model answer `<p>` uses `text-emerald-900` with no `dark:` variant (`:912`), and the label uses `text-emerald-700` (`:892`). Possibly low contrast on a dark background.
- **S-15 (global speech state bleeds into the top player).** Item playback goes through the same engine snapshot, so while an item clip plays the top `AudioPlayer` shows `🔊 음성 읽는 중…` and the pause icon (`AudioPlayer.tsx:62-65,200-201`).
- **S-16 (unused import).** `Link` imported but unused (`GrammarLearningView.tsx:4`). Harmless.
