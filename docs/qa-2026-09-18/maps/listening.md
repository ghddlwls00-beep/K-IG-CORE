# LISTENING (`ld`) — screen & feature map for the CDP driver

> Stage 1 of the 2026-09-18 audit. Read-only source reading at `main` = `9d6e15d`.
> Written and checked by the same agent (Claude). Nothing below was run in a browser.
> Counts in §2 were measured with node over `content/` (scripts kept in the session scratchpad, not in the repo).
> Everything in §12 is **unverified**: it is what the code appears to do, and each needs a live check.

---

## 1. Routes & data sources

### 1.1 Routes

| URL | What it is | Source |
|---|---|---|
| `/ld` | Course list (276 main cards in 5 accordion sections) | `src/app/[course]/page.tsx` → `CourseDashboard.tsx` |
| `/ld/dNNN` (d001…d276) | Main lesson page | `src/app/[course]/[lesson]/page.tsx` → `LessonBody.tsx:122-133` → `LdLearningView.tsx` |
| `/ld/dNNN-1` | "Script" companion page. It renders **the same LdLearningView body** (§4.9) | same |
| `/ld/LD_001` | **404.** The file exists but is not routable (§2.4) | `src/lib/content.ts:74`, `scripts/buildValidRoutes.mjs:103-106` |

- `src/proxy.ts:99-152` rewrites any one- or two-segment path that is not in `src/lib/generated/validRoutes.json` to a readable 404. `validRoutes.lessons.ld` has 552 ids (d001, d001-1 … d276, d276-1), and `LD_001` is not among them.
- The page is dynamic. It reads the `kig_license_session` cookie (`page.tsx:148-159`).
- Canonical URL: `/ld/dNNN` for both `dNNN` and `dNNN-1` (`page.tsx:78`, `content.ts:175-181`).
- Page `<title>`/h1: `formatLessonPresentation` (`src/lib/curriculumPresentation.ts:155-165`) gives `"{NNN}회 · 실전 듣기 평가"` for both variants. The subtitle is `"수능/토익 딕테이션 훈련"`, or `"한국어 번역 및 어순 대조"` for `-1`. It is only used on the list card, not on the lesson page. The code is `Round NNN` and the badge is `🔊 음성 듣기`.
- Meta description: `"{menuLabel} — {title}. K-IG 핵심 어학 과정."` (`page.tsx:80-82`). Locked lessons get `robots: noindex, follow` (`page.tsx:93-98`).

### 1.2 Which data is rendered

| Data | File | Used for |
|---|---|---|
| **English + Korean script rows** | `content/ld_english_scripts.json` → `{ "d001": [ {n, ko, en, answer?}, … ], … }` | **Everything the learner sees and hears in the body**: all 5 steps, the top player's sentence queue, and every clip key. Loaded by `getLdEnglishScript(id)` (`content.ts:235-241`), which strips `-1` from the id. On a `-1` page it falls back to `pair.id` (`page.tsx:184-186`). |
| Lesson JSON | `content/lessons/ld/dNNN.json`, `dNNN-1.json` | Only the page shell: `id`, `variant`, `audio[0].src` (which makes the top AudioPlayer appear), and `blocks.length > 0` (which makes LessonBody render). `hints` is read only by the disabled quiz. **No block is rendered by the LD view** (see §12 C-1). |
| Course index | `content/courses/ld.json` → `{course, tab, lessonCount, groups[{label, lessons[]}], lessons[LessonSummary]}` | List page, prev/next, pairing, free flag |
| Free ids | `src/lib/license.ts:82` → `ld: ["d001","d001-1","d002","d002-1"]` | Server gate, media gate, list chip |
| Free clip keys | `src/lib/generated/freeSpeechKeys.json` (built by `scripts/buildFreeSpeechKeys.mjs:145-158`) | Media gate for `/audio/azure-ava/v1/*` |
| i18n | `src/lib/i18n.ts` (default `ko`, `localStorage["kig:lang"]`) | Only the AudioPlayer strings (`player.play` "재생", `player.pause` "일시정지", `player.speed` "속도", `player.seek` "탐색", `player.back5` "5초 뒤로"). **LdLearningView calls `useLanguage()` but never calls `t()`**, so the whole LD body is Korean-only whatever the language setting. |

### 1.3 Schemas

`ld_english_scripts.json` row: `n: string` ("1"…), `ko: string`, `en: string`, `answer?: string` (riddle solution, 6 rows).

Lesson JSON (all 553 files have exactly these keys): `id, course, series, variant ("main"|"script"), pairId (null on main, "dNNN" on script), title, label, menuLabel, unit, part, order, audio[{src, legacySrc, autoplay}], video[], blocks[], legacyPath, legacyEncoding`.

- main `blocks`: `heading`, `instruction` ("다음에 나오는 고유 명사, 숫자, 어려운 단어를 참조하면서 영어로 받아쓰기를 하세요." plus extra hint-like instructions in some lessons), `hints` (253 of 276), `choice` (`["1 번".."5 번"]`), `dictation` (`rows: 10`). d122 also has a stray `sentences` block.
- script `blocks`: `heading`, `instruction` ("한글 대본을 보면서 말하고 영작해보세요." plus Korean sentence lines), a few `paragraph`/`sentences`, `choice`, `dictation`.
- `audio[0].src` = `/audio/ld/dNNN.mp3` for both variants. It is **never requested by the lesson page** (§6).

Course index `LessonSummary`: `id, title, label, series:"d", variant, unit, part:null, order, hasAudio:true, menuLabel`.

---

## 2. Counts & id sequences (measured)

### 2.1 Lessons / routes
- `content/lessons/ld/`: **553 files** = 276 main (`d001`…`d276`, no gaps) + 276 script (`d001-1`…`d276-1`, no gaps) + **`LD_001.json`**.
- `content/courses/ld.json`: 552 lessons, all unique, in strict order `d001, d001-1, d002, …` (`order` = index 0…551). `lessonCount: 276`.
- Groups (5), each holding main + script ids:

  | group label (raw) | ids | main cards shown | rendered section title (`curriculumPresentation.ts:61-68`) |
  |---|---|---|---|
  | `[ 001번 - 050번 ]` | 100 (d001…d050-1) | 50 | `Section 1 · 001회 ~ 050회 실전 리스닝` |
  | `[ 051번 - 100번 ]` | 100 | 50 | `Section 2 · 051회 ~ 100회 실전 리스닝` |
  | `[ 101번 - 150번 ]` | 100 | 50 | `Section 3 · 101회 ~ 150회 실전 리스닝` |
  | `[ 151번 - 200번 ]` | 100 | 50 | `Section 4 · 151회 ~ 200회 실전 리스닝` |
  | `[ 201번 - 276번 ]` | 152 | 76 | `Section 5 · 201회 ~ 276회 실전 리스닝` |

- `validRoutes.json` `lessons.ld`: 552 (LD_001 excluded). `public/search-index.json`: 276 ld entries (main only; no `-1`, no LD_001). Sitemap: only d001 and d002 (`src/app/sitemap.ts:57-68`).

### 2.2 Script rows (`ld_english_scripts.json`)
- 276 keys (`d001`…`d276`, none missing, none extra). **2,217 rows.** Rows per lesson: min 4, max 16. Histogram: 4:4, 5:23, 6:45, 7:53, 8:50, 9:36, 10:27, 11:18, 12:12, 13:6, 15:1, 16:1.
- Every row has `n`, `ko`, `en`, and `n === String(index+1)` everywhere. No empty `en` or `ko`. No non-ASCII characters in `en`. No duplicate `en` within a lesson. No leading "1." numbering.
- `answer` (riddle) rows: **6**. d171 #8, d177 #9, d180 #11, d183 #9, d187 #13, d191 #12. Each is the last row of its lesson.
- `en` with digits: 233 rows. With hyphenated words: 56. With `/`: 1 (d169 #4 `1 1/2 seconds`). `ko` containing Latin words (names left in English): 343 rows.
- Liaison cards (Step 3), computed with the real `generateLiaisonPoints`: **4,504 cards**, of which 215 are preset cards and **4,289 are the generic "(이어짐)" cards**. **241 sentences in 141 lessons have 0 cards** and show the empty-state message.
- Word bank (Step 2): every sentence gets exactly 2 distractors (0 sentences with fewer). Tile count = `dictationWords(en).length + 2`.

### 2.3 Data oddities (not rendered on the lesson page unless noted)
- `courses/ld.json` `title` is the constant `"수능영어 듣기 - 제 001 회"` for all 552 entries. It is not displayed; `formatLessonPresentation` ignores it.
- `d028` label `[ 제 027 회 ]`, and the heading block inside `d028.json` also says 027. Not displayed.
- `menuLabel` mismatches: `d158` → `[ D 159 ]`, `d263` (main) → `[ D 263-1 ]`. **Visible** in `<meta name="description">`.
- 23 mains have no `hints` block: d177 d180 d183 d186 d187 d191 d201 d207 d212 d219 d222 d225 d228 d230 d238 d240 d242 d247 d250 d258 d264 d265 d276.
- The Korean text in script-page blocks and `ld_english_scripts.json` `ko` are identical (whitespace-squashed) in only 103 of 276 lessons. **The rendered Korean is `ld_english_scripts.json`**, so compare against that file, not the `-1` JSON.

### 2.4 `LD_001.json` — the 553rd file
- `id: "LD_001"`, `series: null`, `menuLabel: null`, `order: 550`, title `"::: K-IG 교육 영어듣기훈련프로그램 | 기초1 | 제 001 회 강의 :::"`, audio `/audio/ld/LD_001.mp3`, three Korean dialogue instructions ("- 안녕, 레오. 내 이름은 주나야." …). It is a leftover page from a **different** legacy program (기초1), extracted into this folder.
- **Referenced nowhere at runtime.** It is not in `courses/ld.json`, `validRoutes.json`, `search-index.json` or the sitemap, and no source file names it. The only mention is a comment in `scripts/buildValidRoutes.mjs:103-106`, which says `getLesson`'s id pattern `/^[a-z0-9-]+$/i` (`content.ts:74`) rejects the underscore, so `/ld/LD_001` answers 404 in production. The proxy rewrites it to the 404 page first.
- Side effect: `scripts/generate-azure-ava.mjs:242-245` walks **every** JSON under `content/lessons`, so LD_001's Korean `text` values were in the clip-generation inventory (a few wasted clips; harmless).
- The driver should assert `/ld/LD_001` → 404 and `/ld/ld_001` → 404.

---

## 3. Components (file:line)

| Component | File | Role |
|---|---|---|
| `LessonPage` | `src/app/[course]/[lesson]/page.tsx:110-401` | Server gate (148-182), prev/next nav (264-326), h1 (328-332), top `AudioPlayer` (343-365), `LessonBody` (368-384), `LessonStepNavigation` (398) |
| `extractSentencesForAudio` | `page.tsx:428-530`, LD branch 438-449 | Top player queue = `ldEnglishScript.map(s => cleanText(s.en))`, falling back to hint words |
| `LessonBody` | `src/components/LessonBody.tsx:122-133` | `course === "ld"` → `<LdLearningView blocks pairBlocks lessonKey isScript audioTracks ldEnglishScript/>`. Returns before `DictationPanel`, so the legacy `choice`/`dictation` blocks are never rendered. |
| **`LdLearningView`** | `src/components/LdLearningView.tsx` (1,319 lines) | The 5-step LISTENING UI |
| `RiddleAnswer` | `LdLearningView.tsx:34-44` | `<details><summary>정답 보기</summary><p>{answer}</p></details>` |
| listening engine | `src/lib/listeningUtils.ts` | `generateLiaisonPoints` 182-235, `dictationWords` 241-243, `soundAlikeForm` 251-253, `expandSlashAlternatives` 281-309, `generateWordBank` 320-393, `verifyWordSequence` 398-403, `verifyAnyWordSequence` 406-408 (unused by LD), `generateListeningContextQuiz` 444-540 (disabled) |
| quiz flag | `src/lib/quizFlags.ts:26` | `SHOW_GENERATED_QUIZ = false` |
| `AudioPlayer` | `src/components/AudioPlayer.tsx` | Top "전체 듣기" sentence-queue player |
| speech engine | `src/lib/speech.ts` | `speakText` 1017, `playSentenceQueue` 1110, `playUnifiedClip` 755, `stopSpeech` 1223, pause/resume 1240-1316 |
| clip keys | `src/lib/unifiedSpeech.ts` | normalize 4-15, key 21-35, path 37-39, `shouldUseUnifiedSpeech` 42-47 |
| `VoiceSpeakingTester` | `src/components/VoiceSpeakingTester.tsx` | Mic button in Step 4 |
| STT + scoring | `src/lib/speechRecognition.ts` | `evaluatePronunciation` 120-221, `listenToSpeech` 231-321 |
| `LessonActionButtons` | `src/components/LessonActionButtons.tsx` | Bookmark / complete buttons (localStorage) |
| `LessonStepNavigation` | `src/components/LessonStepNavigation.tsx` | Bottom "← 이전 Step / 목록으로 / 다음 Step →" |
| `LessonPaywall` | `src/components/LessonPaywall.tsx` | Locked lesson body |
| `ProgressProvider` | `src/components/ProgressProvider.tsx` | Completed / bookmarks / recent keys |
| `CourseDashboard` | `src/components/CourseDashboard.tsx` | `/ld` list |
| media gate | `src/lib/mediaAccess.ts:72-113`, `src/lib/mediaRoute.ts:26-118`, `src/app/audio/[...path]/route.ts` | 403 / 404 / 200 / 206 |
| **`DialogueLearningView`** | `src/components/DialogueLearningView.tsx` | **NOT used by LISTENING.** It is routed only for `man/woman/adults-m/adults-w/adults` (`LessonBody.tsx:166`), and `getLesson` has no case for those slugs (`content.ts:76-100`), so it is unreachable on production. Ignore it. |

---

## 4. Every step / view and every control

Conventions: **L** = `LdLearningView.tsx` line. `N` = `rows.length`, `rows = ld_english_scripts[baseId]`, `i` = 0-based sentence index. "clip(x)" = `/audio/azure-ava/v1/${unifiedSpeechKey(x)}.mp3` (§6).
**CDP note:** several labels sit in `uppercase` CSS (`font-mono … uppercase`). Chrome's `innerText` applies `text-transform`, so read those with `textContent`: "Step 1", "Sentence 1 of 6", "Sound Decoding Clinic", "Sentence #1", "속도:", "조립된 문장 …", "단어 블록 뱅크 …".

### 4.0 Page shell (both variants)

| Control | Exact label / aria | Effect / state |
|---|---|---|
| Back link | text `← ` + `LISTENING 목록` (`page.tsx:266-272`) | → `/ld` |
| Bookmark | aria-label `북마크 추가` / `북마크 해제`; text `☆`+`북마크` / `★`+`북마크됨` (`LessonActionButtons.tsx:30-44`) | toggles `localStorage["kig:progress:bookmarks"]["ld:<id>"]` |
| Complete | aria-label `학습 완료 체크` / `학습 완료 취소`; text `완료 체크` / `✓`+`학습 완료` (`:47-67`) | toggles `localStorage["kig:progress:completed"]["ld:<id>"]`. No server sync for ld. |
| Recent (auto on mount) | — | writes `localStorage["kig:progress:recent"] = {course:"ld", lessonId, title:"NNN회 · 실전 듣기 평가", courseTitle:"LISTENING", updatedAt}` |
| Prev link | aria-label `이전 강의: {prevTitle}`; inner `이전 강의` + title | main: previous **main**; script page: previous entry in the mixed list (§9) |
| Next link | aria-label `다음 강의: {nextTitle}`; inner `다음 강의` + title | same rule |
| h1 | `{NNN}회 · 실전 듣기 평가` | |
| Bottom nav | `nav[aria-label="학습 단계 이동"]`: buttons `← 이전 Step`, `다음 Step →`, link `목록으로` → `/ld` (`LessonStepNavigation.tsx:64-89`) | Clicks the first `main button` whose textContent matches `/\bStep\s*(\d+)\b/` (the tab buttons). Initial `currentStep = 1`; `maxStep` = 5. `← 이전 Step` is disabled at 1, `다음 Step →` at 5. |

### 4.1 Top AudioPlayer ("전체 듣기" queue) — `AudioPlayer.tsx`

Rendered because `lesson.audio` has one entry (`page.tsx:343-354`) with `fallbackSentences = rows.map(r => cleanText(r.en))` and no label. On every non-CNN path `isTtsMode` is true (`AudioPlayer.tsx:62-63` + `unifiedSpeech.ts:42-47`). **No `<audio>` element is rendered**, and `/audio/ld/dNNN.mp3` is never requested.

| Control | Exact label | Precondition | Effect | Expected |
|---|---|---|---|---|
| Play/pause | `button[aria-label="재생"]` ↔ `"일시정지"` (i18n) (237-260) | idle → play; speaking → pause/resume | `unlockMobileAudio()`; idle: `playSentenceQueue(sentences,{rate, startIndex:0, gap:300})`; speaking: `togglePauseSpeech()` | request clip(rows[0].en), then the next rows after `ended` + 300 ms |
| Stop | `button[aria-label="정지"]` (263-273), `disabled` when not speaking | speaking | `stopSpeech()` | index → -1, counter `1/N`, button disabled |
| Prev sentence | text `이전`, aria-label `이전 문장` (277-284) | speaking: `previousSentence()` (restarts the queue at index-1); idle: `startQueue(max(0, ttsIndex-1))`, which **starts playback** | |
| Next sentence | text `다음`, aria-label `다음 문장` (286-293) | speaking: `nextSentence()`; idle: `startQueue(min(N-1, ttsIndex+1))` | | Does nothing when the engine is speaking a non-queue `speakText` (e.g. a Step button) |
| Sentence slider | `input[type=range][aria-label="문장 이동"]`, min 0, max N-1, `aria-valuetext="{k+1}번째 문장 / 전체 {N}문장"` (315-328) | — | `onChange` sets scrubIndex; commit on `pointerup`/`keyup`/`blur` → `jumpToQueueIndex(k)` if speaking, else `startQueue(k)` | clip(rows[k].en) |
| Counter | text `{ttsIndex+1}/{N}` (343-347) | | | |
| Speed | buttons `0.8×`, `1×`, `1.2×` (U+00D7), `aria-pressed` (355-370); label `속도` | | `setRate`; if speaking, restart the queue at the current index with the new rate | `audio.playbackRate` = r |
| Status text | `▶ 재생 버튼을 눌러 전체 듣기` / `🔊 음성 읽는 중…` / `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기` (373-381) | | | |
| Space key | window keydown `Space`, unless the target is input/textarea/contentEditable (182-198) | | `preventDefault()` + `toggle()` | see §12 A-1 |

The player reads the **global** speech snapshot, so it also shows "playing" while an LD step button plays (§12 A-2).

### 4.2 LD header (always visible)
- Badge `Acoustic Cognitive System`; `{N}개 문장 완성 코스웨어` (L407-412).
- h2 `5단계 음향 인지 리스닝 마스터리` (L419-421); paragraph `블라인드 청취 ➔ 스마트 탭-딕테이션 ➔ 연음 분해 클리닉 ➔ 실전 섀도잉 & 발음 테스트 ➔ 1.5배속 청취로 이어지는 실전 청취력 완성 시스템입니다.`
- Step tab bar `nav[aria-label="리스닝 5단계 학습 단계"]` (L428-471), 5 buttons, grid 3 columns below 640 px and 5 at 640 px and up. Each button shows `Step N`. The Step 2 badge `({doneCount}/{N})` is `hidden sm:inline-block`. The icon is followed by the full label at ≥768 px (`hidden md:inline`) or the short label below that:

  | id | stepNum | icon | full (md+) | short (<md) |
  |---|---|---|---|---|
  | step1_blind | Step 1 | 🎧 | 블라인드 리스닝 | 블라인드 |
  | step2_dictation | Step 2 | 🧩 | 탭-딕테이션 | 딕테이션 |
  | step3_liaison | Step 3 | 🔍 | 연음 & 소리 클리닉 | 소리클리닉 |
  | step4_shadowing | Step 4 | 🗣️ | 섀도잉 & 발음 테스트 | 실전섀도잉 |
  | step5_speed | Step 5 | ⚡ | 1.5배속 청취 & 대조 | 1.5배속 대조 |

  Click → `goToStep(id)` (L343-354): `setActiveTab`, `stopSpeech()`, `setSpeedPlaying(false)`, smooth-scroll to the nav − 70 px. The active tab has class `bg-ink`. **`activeTab` is not persisted**: a reload always opens Step 1.

### 4.3 Step 1 · 블라인드 리스닝 (L476-622)

Static text: pill `🎧 BLIND AUDIO` · `자막 없이 소리에만 귀 기울이기`; h2 `스크립트를 보지 않고 전체 음성을 처음부터 끝까지 청취하세요`; paragraph `자막을 보면 뇌는 시각 정보에 의존하여 청각 훈련을 멈춥니다. …`.

| Control | Label | Action | Expected / state |
|---|---|---|---|
| Big play | text `▶️ 전체 본문 듣기` ↔ `⏹️ 정지` (L495-501) | `toggleWholePassage(speedRate)` (L248-267). If playing: `stopSpeech()`, `speedPlaying=false`. Else: `playSentenceQueue(allEnglish, {rate: speedRate, startIndex: currentQueueIndex, onProgress: setCurrentQueueIndex, onEnd: reset to 0})`. Queue gap is the default **250 ms** (`speech.ts:1163`). | Clips for rows[startIndex..N-1].en in order, `playbackRate = speedRate`. **startIndex = where the last run stopped, not 0** (§12 A-4). |
| Speed pills | label `속도:`; buttons text `0.85x`, `1x`, `1.25x` (1.0 prints as `1x`) (L505-525) | `setSpeedRate(r)`; if playing, `toggleWholePassage(r)`, which **stops** playback (§12 A-3) | active pill class `bg-primary` |
| Quiz | — | `SHOW_GENERATED_QUIZ=false` → nothing rendered (L537-608). Assert that no `블라인드 리스닝 맥락 진단 퀴즈` or `Q1.` text exists. | |
| Next | text `다음: Step 2 탭-딕테이션 이동` `→` (L610-619) | `goToStep("step2_dictation")` | |

No transcript or translation is shown in Step 1 (by design).

### 4.4 Step 2 · 탭-딕테이션 (L627-893)

State: `dictationIndex` (0), `manualTypingMode` (false), `typedAnswer`, `assembledTiles`, `wordBank`, `dictationStatus` (idle | correct | incorrect), `dictationProgress` (persisted). The word bank is regenerated on every index change (L173-181), which also resets assembled tiles, status and typed text.

**Header card**
- `Sentence {i+1} of {N}` (textContent); h2 `음성을 듣고 단어 블록을 탭하여 문장을 완성하세요`.
- Mode toggle (L642-648): text `⌨️ 직접 키보드 타이핑 모드` (tile mode) ↔ `🧩 블록 탭 모드로 전환` (typing mode). Toggling does **not** reset status or typed text.
- `← 이전 문장` (L653-660): `disabled` when i = 0. `다음 문장 →` (L690-697): `disabled` when i = N-1.
- Sentence dots (L665-688): N buttons, `title="문장 {k+1}"`, `aria-label="문장 {k+1}"` or `"문장 {k+1} (완료)"` when `dictationProgress[k]`, `aria-current="step"` on the current one. Click → `setDictationIndex(k)`. Inner span class: current `w-5 bg-primary`, done `w-2 bg-emerald-500`, other `w-2 bg-line-strong/20`.

**Drill card**
- `#{i+1}`; caption `한글 번역 가이드`; `<p>` = `rows[i].ko`; `RiddleAnswer` (keyed by index) when `rows[i].answer`.
- `🔊 표준 속도` (L719-725) → `playText(en, 1.0)`; `🐢 0.85x 느리게` (`title="느린 배속으로 정밀 듣기"`, L726-733) → `playText(en, **0.82**)`.
- `playText` (L230-245) toggles: if `playingSentenceText === text`, it stops instead of playing. Clip = clip(rows[i].en).

*Tile mode* (L754-815)
- Caption `조립된 문장 (아래 단어 블록을 탭하여 순서대로 넣으세요):`. Assembled area is empty → italic `아래의 단어 블록을 클릭하여 문장을 만드세요...`; otherwise assembled tile buttons `title="클릭하여 되돌리기"`, text = word + `✕`. Click → back to the bank (appended at the end), status → idle.
- Caption `단어 블록 뱅크 (총 {bankCount}개):` + button `↺ 전체 초기화` (L789-795). Reset → `generateWordBank` again (new shuffle), assembled cleared, status idle. **Current sentence only; progress is untouched.**
- Bank tiles: buttons with **no title**, text = word. Click → moves to the end of the assembled row, status idle. An empty bank shows `모든 단어를 배치했습니다!`. With 2 distractors that only happens if the learner also places both distractors.

*Typing mode* (L738-753)
- Label `직접 듣고 영문 타이핑:`; `input[type=text][placeholder="들리는 영문장을 직접 입력하세요..."]`. `onChange` → `typedAnswer`, status idle. There is no Enter-to-submit.

*Feedback & check*
- `✓ 정답 채점하기` (L864-870) → `handleCheckDictation` (§5).
- Correct banner (L818-837): `🎉`, `정답입니다! 훌륭한 청취력입니다.`, then `rows[i].en` verbatim. If i < N-1 there is a button `다음 문장 풀기 →` → index+1.
- Incorrect banner (L839-852): `순서가 조금 다릅니다. 오디오를 다시 듣고 도전해 보세요!` + button `🔊 다시 듣기` → `playText(en, 0.85)`. Shown for every wrong answer, in both modes.
- `🔊 문장 다시 듣기` (L856-862) → `playText(en, 1.0)`.
- Footer: `← Step 1 블라인드` (L876-882), `다음: Step 3 소리 클리닉 이동` `→` (L883-890).

**Deriving the expected tile bank** (deterministic apart from the order). Run the real `listeningUtils.ts` in node (transpile with `typescript.transpileModule`, as `scripts/buildFreeSpeechKeys.mjs:64-74` does):
```js
const pool = [...new Set(rows.map(r=>r.en).filter(Boolean)
  .flatMap(s => s.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g,""))))].filter(Boolean); // L103-110
const wb = generateWordBank(rows[i].en, pool);   // L175 / L299
// expected multiset of bank tiles = wb.allTiles.map(t=>t.word)  (order is Math.random)
// bankCount label = wb.allTiles.length  = dictationWords(en).length + 2 for every LD row
// correct click order = wb.correctWords
```
Example, d001 (6 rows):

| # | correctWords (click order) | distractors | bank |
|---|---|---|---|
| 1 | I'm Mrs Watson My first name is Barbara I'm a nurse and I work in a hospital | married, to | 19 |
| 2 | I'm married to Robert Watson He is a scientist My husband and I live in Wisconsin | first, Mrs | 18 |
| 3 | That's one of the states in the United States We live in a house | Im, Mrs | 16 |
| 4 | Our house isn't new and it isn't large but we like it very much | Im, Mrs | 16 |
| 5 | We have one daughter Her name is Ellie Her room is upstairs | Im, Mrs | 14 |
| 6 | It isn't big but it's very nice We also have a young son His name is Tom | Im, Mrs | 19 |

Duplicate words (e.g. two `I'm` tiles) are interchangeable, because verification compares words, not tile ids.

### 4.5 Step 3 · 연음 & 소리 클리닉 (L898-1025)

- Header: `Sound Decoding Clinic`; h2 `한국인이 영어를 못 듣는 진짜 이유: 연음·탈락·플랩(Flap) 클리닉`; paragraph `스펠링대로 발음되지 않고 뭉개지는 …`.
- `문장 선택:` + `select[aria-label="소리 클리닉 문장 선택"]` (L916-927). Option `value = k`, text `#{k+1} {rows[k].en.slice(0,24)}...` ("..." is always appended). Change → `liaisonIndex`. For CDP, use the native `HTMLSelectElement.prototype` value setter + a bubbling `change` event.
- Sentence card: `Sentence #{k+1}`; button `🔊 문장 전체 발음` → `playText(en, 0.9)`; `<p>` en; `<p>` ko; `RiddleAnswer`.
- h3 `🔬` `이 문장에서 발생하는 핵심 소리 변이 현상 ({cards.length}개)`.
- 0 cards → `이 문장은 단어들이 비교적 독립적인 음소로 발음되는 문장입니다. [문장 전체 발음]을 청취하며 각 단어의 강세를 익혀보세요.`
- Each card (L965-1001): badge `typeLabel`; button `🔊 소리 청취` → `playText(card.original, 0.9)`; row `원문 스펠링:` `{original}`; row `실제 들리는 소리:` `{koreanSound} {phonetic}`; `<p>` rule.
- Expected cards = `generateLiaisonPoints(rows[k].en)` (`listeningUtils.ts:182-235`), in array order. Up to 4 preset cards; if fewer than 2 presets matched, the generic scanner adds cards until the total is 3.
  d001: #1 [work in, hospital], #2 [live in, married to], #3 [live in, one of, United States], #4 [like it, new and, and it], #5 [daughter, have one, upstairs], #6 [It isn, but it].
- Footer: `← Step 2 딕테이션`, `다음: Step 4 섀도잉 & 발음 테스트 이동` `→`.

### 4.6 Step 4 · 섀도잉 & 발음 테스트 (L1030-1155)

- Header: `Shadowing & Speech Match`; h2 `음성을 0.5초 차이로 그림자처럼 따라 말하세요 (Shadowing)`; stepper `← 이전` (disabled at 0), `{k+1} / {N}`, `다음 →` (disabled at N-1).
- Card: `Sentence #{k+1} Shadowing Target`; `<p>` en; `<p>` ko; `RiddleAnswer`.
- Step "1": `먼저 음성 듣기`, `음성의 억양과 끊어 읽는 리듬감을 귀로 확인하세요.`, button `🔊 소리 듣기` → `playText(en, 1.0)`.
- Step "2": `마이크를 누르고 섀도잉하여 말하기`, `말한 문장을 인식해 원문과의 단어 일치도를 점수로 보여줍니다.`, then `VoiceSpeakingTester targetText=en buttonLabel="🎙️ 마이크 켜고 소리내어 섀도잉 말하기"`. It is not keyed by index.
  - Unsupported (no `SpeechRecognition`/`webkitSpeechRecognition`): text `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`, or in Kakao/in-app browsers `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` + button `🌐 Safari로 열기` / `🌐 Chrome으로 열기` (`VoiceSpeakingTester.tsx:109-129`).
  - Idle button text `마이크 켜고 소리내어 섀도잉 말하기` (the 🎙️ prefix is stripped at :131, and 🎙️ is rendered in a separate span); `title="마이크를 누르고 영어 문장을 소리내어 말해보세요."`.
  - Listening: button `⏹️` `듣고 있는 중... (말씀하세요)`; panel `실시간 음성 인식:` + interim text or `지금 영어로 말씀하세요...` + button `완료` (stop).
  - Result: button `{score}점 ({ratingLabel})`; `↺ 다시 녹음` (`title="다시 말하기"`) → restarts listening; card with `{score}점`, `{ratingLabel}`, `단어 일치 {matched}/{total}`, `인식된 내 음성:` `"{transcript}"`, `단어별 발음 일치도:` word chips (`title` `정확히 일치한 발음` / `인식되지 않았거나 발음이 다른 단어`), `💡 {feedback}`.
  - Errors: `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.` (no-speech); `마이크 접근 권한이 거부되었거나 차단되었습니다. …` (not-allowed); `음성 인식 오류: {code}`.
  - `onSuccess(transcript, score)` → `shadowScores[k] = score` (persisted) → line `내 최고 점수: {score}점` (L1128-1132).
- Footer: `← Step 3 소리 클리닉`, `다음: Step 5 1.5배속 청취 & 대조 이동` `→`.

### 4.7 Step 5 · 1.5배속 청취 & 대조 (L1160-1316)

- Header: `⚡ Fast-Speed Ear Training`; h2 `1.5배속 초고속 청취 챌린지 (Fast-Speed Ear Training)`; paragraph `1.25x와 1.5x 빠른 음성에 익숙해지면, …`.
- Big button (L1178-1185): `⚡ {speedRate}x 배속 연속 청취` (default `⚡ 1x 배속 연속 청취`) ↔ `⏹️ 정지`. It calls the same `toggleWholePassage` as Step 1, and **shares `speedRate` and `currentQueueIndex` with Step 1**.
- Pills (L1192-1213), label `청취 난이도 선택:`: `🥉 1.0x 표준 속도` (1.0), `🥈 1.25x 실전 회화 속도` (1.25), `🥇 1.5x 초고속 청취` (1.5). Active class `bg-ink`. Same stop-on-change behaviour as Step 1.
- Transcript (L1220-1268): h3 `📖 원문 & 완역 1:1 대역 스크립트 ({N}문장)`, `클릭 시 개별 재생`. For each row: `#{k+1}`, `<p class="font-mono …">` en, `<p>` ko, `RiddleAnswer`, button `🔊 {speedRate}x` (`title="개별 문장 청취"`) → `playText(en, speedRate)`. The card is highlighted (`border-primary bg-primary/[0.06] … scale-[1.01]`) when `speedPlaying && currentQueueIndex === k`. **This is the best place for the 1:1 content comparison**: every en/ko/answer is in the DOM at once.
- Notes (L1271-1287): h3 `📝 스마트 청취 노트`, `자동 저장`, `textarea[aria-label="스마트 청취 노트"][placeholder="들리지 않았던 연음, 새로운 어휘, 섀도잉 발음 팁을 자유롭게 기록해 보세요..."]`, rows 14 → `notes` (persisted).
- Footer (L1291-1314): `← Step 4 섀도잉`, then either
  - `role="status"` `🎉 5단계 리스닝 마스터리 코스웨어 완료!` when `Object.keys(dictationProgress).length >= N`, or
  - `받아쓰기 {k}/{N} 완료 — 전부 맞히면 마스터리 배지가 표시됩니다.`

### 4.8 Transcript / translation toggles, show answer, riddles
- There is **no** transcript/translation toggle and **no** "show answer" control in LD. The English is hidden only in Steps 1 and 2 (Step 2 shows only the Korean, and the English appears in the green banner after a correct check). Steps 3, 4 and 5 always show en + ko.
- Riddle answer: `<details>` summary `정답 보기` in Steps 2, 3, 4 and 5 for the 6 answer rows. Closed by default; Steps 2, 3 and 4 remount it (closed) on index change.
- Generated quiz: disabled (§4.3). Persisted `selectedAnswers`/`quizSubmitted` are dead state.

### 4.9 What the `-1` script page renders
`/ld/dNNN-1`: `isScript = true` (`page.tsx:123`); `pair` = main `dNNN` (`content.ts:134-137`); `ldEnglishScript = getLdEnglishScript("dNNN-1")`, whose base id resolves to the **same rows**. LdLearningView swaps `mainBlocks`/`scriptBlocks` (L56-57), but they only feed the unused hints/Korean fallback. So:
- **The body is identical to the main page**: same 5 steps, en/ko, top player queue and clips. The h1 is the same `NNN회 · 실전 듣기 평가`, and the canonical is `/ld/dNNN`.
- Differences: `lessonKey = "ld/dNNN-1"`, which gives a separate `kig:ld:mastery:ld/dNNN-1` store and separate `ld:dNNN-1` bookmark/complete/recent. Prev/next come from the mixed list (§9). The free flag follows the base id.
- Driver assertion for all 276 pairs: the Step 5 DOM text of `dNNN-1` equals that of `dNNN`.

---

## 5. Answer checking / normalization

### 5.1 Typing mode — `LdLearningView.tsx:308-328`
```ts
const normalizeTyped = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const cleanUser = normalizeTyped(typedAnswer);
const cleanTarget = normalizeTyped(currentDictationItem.en);
if (cleanUser === cleanTarget) { setDictationStatus("correct"); setDictationProgress(p => ({...p, [dictationIndex]: true})); }
else setDictationStatus("incorrect");
```
Expected results (derive with this exact function):
- ACCEPT: any capitalisation; missing or extra punctuation; tabs, newlines and multiple spaces; `Im`/`I’m` for `I'm`; `am` for `a.m.`; `615` or `6:15` for `6:15`; `wellknown` or `well-known`; `dc` or `D.C.` for `D.C.`.
- REJECT: `I am` for `I'm`; `well known` for `well-known`; `6 15` for `6:15`; `d c` for `D.C.`; `1 1 2` vs target `1 1/2` → target normalizes to `1 12`, so only `1 12` / `1 1/2` pass; number words for digits; any word difference.
- Empty input → reject (no LD row has an empty `en`).

### 5.2 Tile mode — `LdLearningView.tsx:329-338` → `listeningUtils.ts:398-403`
```ts
const userWords = assembledTiles.map((t) => t.word);
const isCorrect = verifyWordSequence(userWords, wordBank.correctWords);
// verifyWordSequence: same length && every word equal case-insensitively, position by position
```
- `correctWords = dictationWords(expandSlashAlternatives(en)[0])`; `dictationWords = en.match(/[a-zA-Z0-9'’\-]+/g)` (`listeningUtils.ts:241-243`). Trailing punctuation is dropped; apostrophes and hyphens are kept inside tokens; `6:15` → `6`,`15`; `D.C.` → `D`,`C`; `Andrews'` keeps its trailing `'`.
- `acceptedWordSequences` is computed but **LD checks only `correctWords`** (§12 A-9). No LD row has a letter-slash alternative today, so there is no live effect.
- Distractors (`listeningUtils.ts:357-379`): the first 2 entries of `[...pool, "was","the","with","in","at","for","on","is","he","she","we","are","very"]` (deduplicated) whose lowercase is not a correct word, whose `soundAlikeForm` (lowercase, no apostrophes, trailing `s` removed) is not a correct word's form, and whose length is ≥ 2.
- Wrong-answer cases to drive: (a) empty assembly; (b) all correct words with two adjacent **different** words swapped; (c) correct words + 1 distractor; (d) correct words minus the last word. All give the same red banner.

### 5.3 Step 4 scoring — `speechRecognition.ts:68-92, 120-221`
```ts
normalizeText = t.toLowerCase().replace(/[.,?!;:"'()]/g, "")      // apostrophe removed FIRST
   .replace(/\bi'm\b/g,"i am") … .replace(/\bhadn't\b/g,"had not") // never match (see §12 S-1)
   .replace(/\s+/g," ").trim();
// empty transcript → score 0, label "음성 감지 안 됨"
// per target word: look at spoken[ptr .. ptr+1]; exact → matched; len>=5 && levenshtein==1 → partial 0.7
score = round(65*wordAccuracy + 20*charSim + 15*lenRatio)
>=92 "🌟 모든 단어 일치 (Excellent!)"; >=80 "👍 대부분 일치 (Good!)"; >=60 "💪 거의 맞았어요 (Almost!)"; else "다시 시도 (Try Again)"
```
Measured with node on d001 #1: transcript = en → `100`, `17/17`. Transcript `I am Mrs Watson my first name is Barbara I am a nurse and I work in a hospital` → `36`, `1/17`. Transcript `hello` → `1`.

---

## 6. Audio: what is spoken, clip URL, fallback

### 6.1 What each control speaks
| Control | Text | Rate |
|---|---|---|
| Top player queue | `cleanText(rows[k].en)` (`page.tsx:421-426`, strips a leading `N.`/`N)` and turns `/` into a space) | 0.8 / 1 / 1.2, gap 300 ms |
| Step 1 / Step 5 big button | `rows[k].en` for k ≥ startIndex (`allEnglishSentences`, L103) | speedRate, gap 250 ms |
| Step 2 `🔊 표준 속도` / `🔊 문장 다시 듣기` | `rows[i].en` | 1.0 |
| Step 2 `🐢 0.85x 느리게` | `rows[i].en` | 0.82 |
| Step 2 `🔊 다시 듣기` (wrong banner) | `rows[i].en` | 0.85 |
| Step 3 `🔊 문장 전체 발음` | `rows[k].en` | 0.9 |
| Step 3 `🔊 소리 청취` | `card.original` | 0.9 |
| Step 4 `🔊 소리 듣기` | `rows[k].en` | 1.0 |
| Step 5 `🔊 {r}x` | `rows[k].en` | speedRate |

Korean is never spoken in LD.

### 6.2 Clip URL — `unifiedSpeech.ts`
```ts
normalize = t.replace(/\s*\/\s*/g," ").replace(/\[[^\]]*\]/g," ").replace(/:{2,}/g," ").replace(/-{2,}/g," ")
             .replace(/[…]+/g," ").replace(/\s*\|\s*/g,", ").replace(/\(\s*\)/g," ").replace(/\s+/g," ").trim();
key = `${clean.length.toString(36)}-${hex(fnv1a-ish first)}${hex(second)}`   // lines 21-35
url = `/audio/azure-ava/v1/${key}.mp3`                                          // same origin
```
Import `unifiedSpeechKey` from the transpiled module instead of re-implementing it. d001 examples:
- #1 `/audio/azure-ava/v1/28-a4336ef6b8d3141e.mp3`, #2 `2c-b9655418be7cc1d6`, #3 `1u-758bb30df19c7a5e`, #4 `1t-94fdaa14edbb9f7e`, #5 `1q-87c8fbabe19367fd`, #6 `23-b4d8e8df4bcb179c`
- cards: `work in` `7-060fe6ffb6b98754`, `hospital` `8-4f9cd7b36f3eceb5`, `live in` `7-412204f644b20737`, `married to` `a-fef16c94cb441861`, `one of` `6-ea0fe5f03ba17e99`, `United States` `d-1c3065ac07ed2335`, `like it` `7-5ee02c7f34bdd1e4`, `new and` `7-ab9c6934d7fcb083`, `and it` `6-65cccc2f22cbcd0d`, `daughter` `8-0ba811914d7b878a`, `have one` `8-2c28db0bf76854aa`, `upstairs` `8-899d0d0e2cd0b713`, `It isn` `6-bb999ae2c4af13b5`, `but it` `6-f9ebaa195caf9c85`

Voice: `en-US-AvaMultilingualNeural` (`scripts/generate-azure-ava.mjs:12`). Inventory: every `row.en` (`:266-277`) plus every liaison `original` from `generateLiaisonPoints` over the script strings with more than 2 words (`:164-184, 296`). Measured: no LD row with ≤ 2 words produces a card, so that filter drops nothing.

### 6.3 Playback path — `speech.ts`
1. `speakText` (1017-1031) / `playSentenceQueue` (1110-1133): bump the token, cancel anything playing, `unlockMobileAudio()` (the first call plays a silent `data:audio/wav` on the shared element; ignore that `play()`).
2. `playUnifiedClip` (755-841), when `shouldUseUnifiedSpeech()` (every non-CNN path): the shared, non-DOM `new Audio()` gets `src = clip url`, `playbackRate = clamp(rate, 0.5, 2)`, then `play()`. `ended` → `finishRun` → `onEnd`.
3. On `error` or a rejected `play()` → `failAvaPlayback` → `startLegacyEngine` (966-1002): Web Speech synthesis with an en-US voice, 200-character chunks, rate clamped to 0.5–1.6. It switches to the "stream" engine (`playChunkViaStream` 708-752, which requests **the same clip URL again**) when there is no speechSynthesis, in Kakao/in-app browsers, when no voice exists, when synthesis errors, or when the 1.5 s watchdog (912-926) finds it silent. A second failure → `finishRun(error)` → `onError`. For a queue that aborts the rest of the queue (1170-1176).
4. **Headless Chrome** usually has `getVoices() == []`. `hasVoiceFor` then returns `true` ("unknown", line 309), synthesis stays silent, and after 1.5 s the watchdog falls back to the stream → the error path. So in headless a **missing clip ends as an error after about 1.5 s**, and a present clip plays normally.
5. `pagehide`, and `visibilitychange` → hidden while speaking, call `stopSpeech()` (258-263). Keep the driven tab visible and focused, or playback stops.

### 6.4 Original recordings
`/audio/ld/dNNN.mp3` (lesson `audio[0].src`) is **never requested** by the lesson page: TTS mode is forced (`AudioPlayer.tsx:62-63`, 205). The media route would serve it (free for d001/d002, licence for the rest). The owner keeps these recordings on purpose.

### 6.5 Media gate for clips — `mediaAccess.ts:86-91`, `mediaRoute.ts:39-45, 110-115`
- Key in `freeSpeechKeys.json` → 200/206 for anyone, `Cache-Control: private, max-age=31536000, immutable`.
- Otherwise a valid `kig_license_session` → 200/206 with `private, max-age=3600, no-transform`; none → **403 `License required`**, `private, no-store`.
- Not in R2 → 404 `Not found`, `no-store`. Origin failure → 502 `Media unavailable`.
- Measured: every d001/d002 sentence and card key is in the free list (0 missing).

---

## 7. Persistence, completion, progress

| Key | Written by | Shape | When |
|---|---|---|---|
| `localStorage["kig:ld:mastery:ld/<id>"]` (`<id>` = `d001` or `d001-1`) | `LdLearningView.tsx:191-227` | `{dictationProgress:{"0":true,…}, shadowScores:{"0":100,…}, selectedAnswers:{}, quizSubmitted:{}, notes:""}` | Debounced 400 ms after any change **and once on mount**. Restored on mount (L192-206). |
| `localStorage["kig:progress:completed"]` | `ProgressProvider.tsx:196-215` | `{"ld:d001": true, …}` (the key is deleted when toggled off) | `완료 체크` button |
| `localStorage["kig:progress:bookmarks"]` | `:224-236` | `{"ld:d001": true}` | bookmark button, list-card star |
| `localStorage["kig:progress:recent"]` | `:238-258` | `{course, lessonId, title, courseTitle, updatedAt}` | every lesson mount |
| `localStorage["kig:lang"]`, `["kig:theme"]` | LanguageProvider | | |
| `localStorage["kig:license:v1"]`, `sessionStorage["kig:license-cookie:<last16>"]`, cookies `kig_license_session`, `kig_device` | LicenseProvider / server | | Do not modify |

- Not persisted: active step, dictation index, typing mode, assembled tiles, liaison/shadow index, speedRate, queue position.
- **In-lesson completion** = the Step 5 mastery badge (`Object.keys(dictationProgress).length >= N`). It does **not** set `kig:progress:completed`; the two are independent.
- There is no server-side progress for LD (`/api/progress/student` is STUDENT-only).
- List page (`CourseDashboard.tsx:213-221, 274`): `학습 진도율: {completedCount} / 276개 완료 ({pct}%)`. `completedCount` counts **every** `ld:` key, including `ld:dNNN-1` (§12 N-3). Filters: `전체 (276)`, `★ 북마크 ({k})`, `미완료 ({276-completed})`. Section header `총 50개 레슨` (76 for Section 5), plus `· {n}개 완료`. Card chip `✓ 완료`.
- Per the audit rules, the driver must log every localStorage change it makes (`out/data-changes.md`) and restore it afterwards.

---

## 8. Locking / entitlement

- **Server gate** (`page.tsx:148-182`): free if `isFreePreviewLesson("ld", id)` (`license.ts:106-125`, which also strips trailing `-N`). So d001, d001-1, d002 and d002-1 are free; d003…d276 and their `-1` pages are locked.
  Otherwise the page needs a valid `kig_license_session`. A STUDENT-only plan (`STU*`) is denied for ld. 1M/1Y/LIFE pass.
- Locked render: back link `← LISTENING`, h1 `{NNN}회 · 실전 듣기 평가`, `LessonPaywall` (`data-kig-paywall="license"`). Badge `ALL-PASS ONLY`; h2 = the lesson title; text `공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다.`; buttons `🔑 이용권 코드 등록`, `🛒 구매 안내` (both open the licence modal); link `← LISTENING 전체 목록`; `1~2강은 무료로 상시 체험 가능합니다`. With a STUDENT pass already stored client-side, the badge is `VIP ALL-PASS REQUIRED` and the h2 is `본 레슨은 VIP 올패스 전용 강좌입니다`. No top player, no body, no LessonStepNavigation. The RSC payload must not contain any `en` of that lesson (KIG-001), so assert by grepping the HTML.
- Client reload (PERF-01, `LicenseProvider.tsx:83-88, 193-201`): if the server rendered the paywall but localStorage holds a licence that verifies, the page reloads once per tab (sessionStorage guard).
- List page: without access, d001/d002 cards show the chip `무료 보기` and the link `무료 보기 →`; other cards show `🔒 올패스` and the link `올패스 열람 🔒`, with the bookmark star disabled (`aria-label="잠긴 레슨은 북마크할 수 없습니다"`). With access, the link reads `학습하기 →`.
- Media: §6.5.

---

## 9. Navigation & boundaries

- `getLessonContext` (`content.ts:124-163`):
  - **Main page**: list = mains only. d001 → prev none (a single-column grid with only the next link), next d002. d276 → prev d275, next none.
  - **Script page**: list = **all 552** in index order. d001-1 → prev **d001**, next **d002** (a main page). d276-1 → prev d276, next none. You can go from a script page to a main page but never back.
- **No UI path leads to a `-1` page.** It is absent from the list (`[course]/page.tsx:99-110` hides scripts that have a main), the search index (`scripts/buildSearchIndex.ts:39`) and the sitemap, and the lesson page has no link. i18n `lesson.viewScript` "한글 대본 보기" exists but is unused. Reachable only by typing the URL.
- In-lesson boundaries: Step 2 `← 이전 문장` disabled at 0 and `다음 문장 →` at N-1; the `다음 문장 풀기 →` banner button is not rendered on the last sentence. Step 4 `← 이전`/`다음 →` disabled at the bounds. Step 3 select has 0…N-1. Bottom `← 이전 Step` disabled at Step 1 and `다음 Step →` at Step 5 (tracked by the last clicked "Step N" button).
- Invalid routes: `/ld/d000`, `/ld/d277`, `/ld/d001-2`, `/ld/LD_001` → 404 via the proxy.

---

## 10. CDP driver recipe (one lesson, exhaustive)

Example `d001` (free, 6 rows). For each lesson, all expected values come from `ld_english_scripts[id]` plus the transpiled `listeningUtils.ts` and `unifiedSpeech.ts`.

**0. Setup**
- Launch Chrome with a copy of the licensed profile. Flags: `--autoplay-policy=no-user-gesture-required`, `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`. Keep the target tab foregrounded (§6.3.5): one window per page, or `Emulation.setFocusEmulationEnabled`.
- `Network.enable`; record every request whose URL contains `/audio/`, with status and `Range`.
- `Page.addScriptToEvaluateOnNewDocument` with the instrumentation below (it must be installed before hydration, because `VoiceSpeakingTester` checks support in a mount effect):
  ```js
  window.__plays = [];
  const P = HTMLMediaElement.prototype, op = P.play;
  P.play = function () {
    if (!String(this.src).startsWith("data:")) {
      const rec = { src: this.src, rate: this.playbackRate, t: Date.now() };
      window.__plays.push(rec);
      this.addEventListener("ended", () => (rec.ended = Date.now()), { once: true });
      this.addEventListener("error", () => (rec.error = true), { once: true });
    }
    return op.apply(this, arguments);
  };
  // Fake STT for Step 4 (set window.__fakeTranscript before clicking the mic)
  window.__fakeTranscript = null;
  class FakeRec { start() { setTimeout(() => { this.onstart && this.onstart();
      const t = window.__fakeTranscript; if (t == null) { this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); return; }
      const res = [{ 0: { transcript: t }, isFinal: true, length: 1 }];
      this.onresult && this.onresult({ resultIndex: 0, results: res }); this.onend && this.onend(); }, 50); }
    stop() {} abort() {} }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
  ```
- Precompute for the lesson: `rows`; `N`; `pool`; for each i `wb_i = generateWordBank(rows[i].en, pool)`, `cards_i = generateLiaisonPoints(rows[i].en)`, `clip(rows[i].en)`, `clip(card.original)`.
- Snapshot, then remove, `localStorage["kig:ld:mastery:ld/d001"]`; record the change.

**1. Load & shell**
- Navigate `/ld/d001`. Wait for `nav[aria-label="리스닝 5단계 학습 단계"]` (a pulse skeleton shows first).
- Assert: h1 `001회 · 실전 듣기 평가`; no `[data-kig-paywall]`; textContent contains `6개 문장 완성 코스웨어`; no `<audio>` element in the DOM; top player counter `1/6`, `button[aria-label="정지"]` disabled; no `이전 강의` link; `a[aria-label="다음 강의: 002회 · 실전 듣기 평가"]` exists; `link[rel=canonical]` ends with `/ld/d001`.
- Assert no generated-quiz text (`블라인드 리스닝 맥락 진단 퀴즈`, `Q1.`).

**2. Top player**
- Click `button[aria-label="재생"]` → within 3 s `__plays[-1].src` ends with clip(rows[0].en), a request answers 200/206, aria-label becomes `일시정지`, status reads `🔊 음성 읽는 중…`.
- Wait for `ended` → the next play is clip(rows[1].en), at least 300 ms later.
- Click `일시정지` → status `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기`; the element is paused. Click `재생` → resumes (same src, no new request needed).
- Click `다음 문장` → counter increments, new src = next row. Click `이전 문장` → back.
- Click `1.2×` → `aria-pressed="true"`, the current sentence restarts with `rate 1.2`.
- Slider: set value 3 via the native setter + `input` event, then dispatch `pointerup` → counter `4/6`, src = clip(rows[3].en).
- Click `정지` → counter `1/6`, stop disabled, no further plays.
- Negative: while idle, click `다음 문장` → playback **starts** at row 1. Record the behaviour.

**3. Step 1**
- Click `▶️ 전체 본문 듣기` → label `⏹️ 정지`; plays rows 0…N-1 in order at rate 1; after the last `ended` the label returns to `▶️ 전체 본문 듣기`.
- Start again, and during row 2 click `1.25x` → expect (code) playback **stops**; label `▶️ 전체 본문 듣기`; pill `1.25x` active. Record it (§12 A-3).
- Click play again → the first src is **row 2** (resume index), rate 1.25 (§12 A-4).
- While playing, click the top player's `정지` → assert whether the Step 1 label stays `⏹️ 정지` (§12 A-5).
- Click `다음: Step 2 탭-딕테이션 이동` → Step 2 visible; no audio playing.

**4. Step 2, for every i in 0…N-1** (navigate with the dot `button[aria-label^="문장 {i+1}"]`)
- Assert: textContent `Sentence {i+1} of {N}`, `#{i+1}`, the ko `<p>` === rows[i].ko (whitespace-normalized); `정답 보기` details present iff rows[i].answer, and when opened the text === answer; `aria-current="step"` on dot i.
- Assert the bank label `단어 블록 뱅크 (총 {wb_i.allTiles.length}개):` and that the sorted bank words === sorted `wb_i.allTiles.map(w=>w.word)`.
- Click `🔊 표준 속도` → src clip(en), rate 1.0. Click it again while playing → stops. Click `🐢 0.85x 느리게` → rate **0.82**.
- Wrong (a): click `✓ 정답 채점하기` with nothing assembled → red banner `순서가 조금 다릅니다. 오디오를 다시 듣고 도전해 보세요!`; click `🔊 다시 듣기` → rate 0.85; dot aria-label has no `(완료)`.
- Wrong (b): tap the correct words with the first two different adjacent words swapped → check → red.
- Remove a tile: click one `button[title="클릭하여 되돌리기"]` → it disappears from the assembly, the bank count grows by 1, the banner is gone.
- `↺ 전체 초기화` → the placeholder `아래의 단어 블록을 클릭하여 문장을 만드세요...` shows and the bank multiset is unchanged.
- Wrong (c): correct words + 1 distractor → red.
- Correct: for each w in `wb_i.correctWords`, click a bank button (not titled) whose trimmed textContent === w → check → green `정답입니다! 훌륭한 청취력입니다.` followed by the exact rows[i].en. The dot aria-label becomes `문장 {i+1} (완료)`. After 500 ms, `JSON.parse(localStorage["kig:ld:mastery:ld/d001"]).dictationProgress[i] === true`. If i < N-1, `다음 문장 풀기 →` exists; click it and assert index i+1.
- Typing mode (on at least 2 sentences, including one with digits, a contraction or a hyphen): click `⌨️ 직접 키보드 타이핑 모드` → the input with placeholder `들리는 영문장을 직접 입력하세요...` appears and the button reads `🧩 블록 탭 모드로 전환`. Use `Input.insertText` after focusing:
  - `hello` → red. Typing again → banner disappears (status idle).
  - `rows[i].en.toUpperCase()` with punctuation removed and doubled spaces → green.
  - contraction expanded (`I am` for `I'm`) → red (expected by code).
  - `Im` for `I'm` → green.
  - hyphen split into a space → red; digits `6 15` for `6:15` → red.
  - Toggle back to tile mode.
- Boundaries: at i=0, `← 이전 문장` has `disabled`; at i=N-1, `다음 문장 →` has `disabled`.
- Footer buttons `← Step 1 블라인드` / `다음: Step 3 소리 클리닉 이동` switch tabs.

**5. Step 3, for every k**
- Set `select[aria-label="소리 클리닉 문장 선택"]` to k. Assert option k text `#{k+1} {en.slice(0,24)}...`; `Sentence #{k+1}`; en === rows[k].en; ko === rows[k].ko; riddle details.
- Assert the h3 count `({cards_k.length}개)`. With 0 cards, assert the empty message. Otherwise, for each card j: badge === typeLabel; `원문 스펠링:` value === original; `실제 들리는 소리:` value === `${koreanSound} ${phonetic}`; rule text === rule.
- Click `🔊 문장 전체 발음` → clip(en) rate 0.9. For each card, click `🔊 소리 청취` → clip(original) rate 0.9, and wait for `ended` (or the error path) before the next click.

**6. Step 4, for every k** (stepper `다음 →`)
- Assert `{k+1} / {N}`, `Sentence #{k+1} Shadowing Target`, en, ko, riddle.
- `🔊 소리 듣기` → clip(en) rate 1.0.
- `__fakeTranscript = rows[k].en` → click the button whose text contains `마이크 켜고 소리내어 섀도잉 말하기` → the button shows `100점 (🌟 모든 단어 일치 (Excellent!))`; the card shows `단어 일치 {n}/{n}`; `내 최고 점수: 100점`; storage `shadowScores[k]===100`.
- `__fakeTranscript = "hello"` → click `↺ 다시 녹음` → low score; check whether `내 최고 점수` drops (§12 A-7).
- `__fakeTranscript = null` → error `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.`
- Click `다음 →` → check whether the previous result card is still shown for the new sentence (§12 A-8).
- Boundaries: `← 이전` disabled at 0, `다음 →` at N-1.

**7. Step 5**
- Assert h3 `📖 원문 & 완역 1:1 대역 스크립트 ({N}문장)`. For each card k: `#{k+1}`, the font-mono `<p>` === rows[k].en, the next `<p>` === rows[k].ko, and `정답 보기` → answer. **This is the 1:1 content check.**
- Pills: click `🥈 1.25x 실전 회화 속도` → big button `⚡ 1.25x 배속 연속 청취`, per-row buttons `🔊 1.25x`; click `🔊 1.25x` on row 3 → clip(rows[3].en) rate 1.25.
- Big button → queue from `currentQueueIndex`; while it plays, assert the highlighted card index === the index of the playing src; `⏹️ 정지` stops.
- Notes: focus `textarea[aria-label="스마트 청취 노트"]`, insert `QA-NOTE-<ts>` → after 500 ms storage `notes` matches.
- Footer: if all N dictations were done in step 4 → `[role=status]` `🎉 5단계 리스닝 마스터리 코스웨어 완료!`, else `받아쓰기 {k}/{N} 완료 — 전부 맞히면 마스터리 배지가 표시됩니다.` (also test the partial state before finishing Step 2).

**8. Persistence**
Reload. Assert: Step 1 active; Step 2 badge (≥640 px) `({N}/{N})`; Step 2 dots all `(완료)`; Step 4 `내 최고 점수` for the tested k; Step 5 notes restored; mastery badge shown.

**9. Shell & navigation**
- Bookmark → `☆`→`★ 북마크됨`, storage `kig:progress:bookmarks["ld:d001"]`; toggle back.
- `완료 체크` → `✓ 학습 완료`, storage; toggle back.
- Bottom nav: `다음 Step →` ×4 walks Steps 2…5, and `← 이전 Step` goes back; `목록으로` → `/ld`.
- `다음 강의` → `/ld/d002`.

**10. Script page**
Navigate `/ld/d001-1`. Assert the Step 5 DOM text equals d001's; canonical `/ld/d001`; `이전 강의: 001회 · 실전 듣기 평가` → `/ld/d001`; `다음 강의: 002회 · 실전 듣기 평가` → `/ld/d002`; the storage key used is `kig:ld:mastery:ld/d001-1`.

**11. Negative / gate** (separate profile with no licence)
- `/ld/d003` → paywall (texts in §8); HTML contains no rows[0].en of d003.
- `GET` clip(d003 row 1) → 403 `License required`.
- `/ld/d001` works; its clips answer 200/206.
- `/ld/LD_001`, `/ld/d277`, `/ld/d001-2` → 404.

**12. Fault injection**
- `Fetch.enable` on `*azure-ava*`; fail the clip for rows[1] with 404 → the top player queue: expect the synthesis fallback, then an error after about 1.5 s in headless, and the player back to idle.
- Step 1 queue: check whether the label stays `⏹️ 정지` (§12 A-5).
- Step 2 single play of a failing clip: the button returns to a playable state.

Record every storage key touched and restore it at the end.

---

## 11. Cannot be automated headless (and why)
1. **Real speech recognition** (Step 4). Chrome's `webkitSpeechRecognition` needs a microphone and Google's online service. Headless can only exercise the scoring and UI with a faked recognizer, not real recognition accuracy or the permission prompt.
2. **Whether each Ava clip actually says the sentence**, with correct pronunciation and numbers (e.g. d169 `1 1/2`). CDP can verify status, content-type, `duration` and that `ended` fires, but not the spoken content. That needs a human or an offline STT pass.
3. **Web Speech synthesis fallback voice.** Headless has no voices (`getVoices()` is empty), so the fallback's audible behaviour on real devices cannot be observed.
4. **Real mobile engines**: iOS Safari/WKWebView gesture unlock, Android `speechSynthesis.pause()` = cancel (`speech.ts:1254-1266`), KakaoTalk/in-app browser branches. A UA spoof exercises the code path, not the webview. The `kakaotalk://` / `intent://` "open in browser" buttons navigate to app schemes.
5. **Audible playback quality**, rate/pitch perception, and whether the Step 5 highlight feels in sync.
6. **App switching / screen lock** stopping audio (`pagehide`/`visibilitychange`). It can be approximated with `Page.setWebLifecycleState`, but that is not the real OS behaviour.
7. **The purchase flow behind `🛒 구매 안내`** and licence-code entry (forbidden to the audit anyway).

---

## 12. Suspicious code (possible defects) — ALL UNVERIFIED

### A. LdLearningView / player behaviour
- **A-1 Space key hijack.** `AudioPlayer.tsx:182-198`: a window-level `Space` toggles the top player unless focus is in input/textarea/contentEditable. On a focused button (tile, tab, dot) or the Step 3 `<select>`, Space toggles audio and `preventDefault()` suppresses the control's own keyboard activation. An a11y and keyboard-use defect.
- **A-2 Player coupling.** `AudioPlayer.tsx:56-65, 200-201` reads the global speech snapshot. While any LD step button plays, the top player shows the pause icon and `🔊 음성 읽는 중…`, and its pause/stop act on that playback. `다음 문장` does nothing during non-queue playback (`speech.ts:1199-1202`).
- **A-3 Changing speed while playing stops playback.** `LdLearningView.tsx:511-514` and `1200-1203` call `toggleWholePassage(r)` while `speedPlaying` is true, which takes the stop branch (L249-253) instead of restarting at the new rate.
- **A-4 "▶️ 전체 본문 듣기" does not start from the beginning.** `L260` uses `startIndex: currentQueueIndex`, which keeps the last index after a manual stop; only a natural end resets it (L263-264). There is no "처음부터" control. Steps 1 and 5 share the index.
- **A-5 Stuck `⏹️ 정지`.** `L257-266` passes no `onError`, and the external stops `stopSpeech()` (top player `정지`, `visibilitychange`, `pagehide`) and `speakText()` (Step 5 `🔊 {r}x` at L1258) do not call `onEnd`. `speedPlaying` stays true: the label is wrong, the next click is a silent "stop", and the Step 5 highlight stays on a sentence.
- **A-6 Stale `playingSentenceText`.** `L230-245`: after an external stop (e.g. `goToStep` → `stopSpeech`), `playingSentenceText` keeps the text, so the first click on the same sentence's button later "stops" and plays nothing. The same toggle happens when switching `🔊 표준 속도` ↔ `🐢` on one sentence while playing.
- **A-7 "Best score" is the last score.** `L1122-1124` overwrites `shadowScores[k]` with the latest score, but `L1130` labels it `내 최고 점수`.
- **A-8 Stale mic result.** `L1119-1125`: `VoiceSpeakingTester` is not keyed by `shadowIndex`, so its `result` state (score card, word chips for the previous sentence) stays visible after `다음 →`.
- **A-9 Accepted alternatives ignored.** `L141-144, 331` check only `wordBank.correctWords`, not `verifyAnyWordSequence(…, acceptedWordSequences)` (`listeningUtils.ts:406-408`). No LD row has a letter slash today, so the effect is latent.
- **A-10 Label/rate mismatch.** `L728` vs `L732`: the button says `🐢 0.85x 느리게` but plays at 0.82.
- **A-11 Misleading wrong-answer text.** `L842`: `순서가 조금 다릅니다` is shown for missing or extra words and for typing-mode spelling errors, not only for order.
- **A-12 `↺ 전체 초기화` resets only the current sentence's tiles** (`L297-305`), despite "전체".
- **A-13 Shared speedRate.** `L507` pills `[0.85,1,1.25]` and `L1192-1196` pills `[1.0,1.25,1.5]` share `speedRate`. After choosing 0.85 in Step 1 no Step 5 pill is active, and after 1.5 in Step 5 no Step 1 pill is active. `L522` prints `1x`, not `1.0x`.
- **A-14 Option text.** `L924` always appends `...`, even when `en` is shorter than 24 characters.
- **A-15 Mastery badge brittle to data changes.** `L1300` uses `Object.keys(dictationProgress).length >= N`, keyed by index. Stored progress from before the row counts changed (L-64, `c3a44d3`/`1adc2f5` restored sentences) can over- or under-count. The mastery badge also never marks the lesson `완료` on the list.
- **A-16 Malformed distractor tiles.** `L107` strips every non-letter from pool words, so tiles appear that are not words: `Im`, `Its`, `dont`, `didnt`, `youve`, `Heres`, `am` (from `a.m.`), `th` (from `20th`), `st` (from `31st`), `highpowered`, `DW`, … **35 distinct forms** over the corpus (e.g. d001 #3–#6 all offer `Im`).
- **A-17 Separate progress per variant.** `L191`: `ld/dNNN` and `ld/dNNN-1` keep separate progress for one lesson.
- **A-18 Hints not rendered.** `L59-67`: the lesson's `hints` block (proper nouns and numbers the legacy instruction says to use for dictation) is not rendered in any step; it only feeds the disabled quiz. The main-page instruction `다음에 나오는 고유 명사, 숫자, 어려운 단어를 참조하면서 영어로 받아쓰기를 하세요.` is also dropped. A possible learning-aid regression.

### C. Content generation (listeningUtils.ts)
- **C-1 Contraction fragments.** `listeningUtils.ts:184` replaces apostrophes with spaces before the liaison scan, producing cards and clips for fragments: `It isn` (d001 #6), `is Isn` (d036 #2), `business isn` (d061 #1), `packages aren` (d084 #6), `ll all` (d099 #6, d133 #7), `photos aren` (d111 #9). 7 occurrences.
- **C-2 Generic cards.** `listeningUtils.ts:222-226`: the scanner writes `koreanSound = "{w1}_{w2} (이어짐)"` under the label `실제 들리는 소리:` and a synthetic phonetic such as `[ne-wand]`. It treats `w`/`y` as consonants (`new and`). **4,289 of 4,504 cards (95%)** are these generic cards.
- **C-3 Split tokens.** `listeningUtils.ts:242`: `6:15` → tiles `6`,`15`; `D.C.` → `D`,`C`; `$4.95`-style prices split. 48 sentences have tile tokens that differ from the typing-mode normalization.

### S. Scoring (speechRecognition.ts)
- **S-1 Dead contraction expansion.** `speechRecognition.ts:71` removes `'` before the `\bi'm\b`… replacements (72-89), so they can never match. A recognizer that returns `I am` scores 36 against `I'm` (measured: d001 #1, 1/17 words).
- **S-2 Cascading misses.** `:153-170`: a 2-word look-ahead window means one inserted or misrecognised early word can cascade into many misses.
- **S-3 Label alignment.** `:140, 172, 219`: word chips use `originalTargetWords[i]` indexed by the normalized word index, and `totalWords` counts the original tokens. They misalign if a token is punctuation-only (0 such LD rows today).

### P. Page / audio / data
- **P-1 "1 1/2" read as "1 1 2".** `page.tsx:421-426` and `unifiedSpeech.ts:6` turn `/` into a space, so d169 #4 `1 1/2 seconds` is keyed and synthesized as `1 1 2 seconds`. The clip probably says "one one two".
- **P-2 Recordings never played.** `AudioPlayer.tsx:62-63, 205` + `unifiedSpeech.ts:42-47`: the original `/audio/ld/dNNN.mp3` is never played. Intentional per the owner, but `hasAudio`/`lesson.audio` only toggles the player's presence.
- **P-3 Queue aborts on one bad clip.** `speech.ts:1170-1176`: one clip that fails both the Ava and fallback engines aborts the rest of the queue silently (no UI message in LD or the player).
- **P-4 Metadata mismatches.** `content/courses/ld.json` + lesson JSON: `d158` menuLabel `[ D 159 ]` and `d263` menuLabel `[ D 263-1 ]` appear in `<meta description>`; `d028` label/heading `027`; the constant `title` `수능영어 듣기 - 제 001 회` on all 552 index rows (not rendered).
- **P-5 Stray block.** `content/lessons/ld/d122.json` has a stray `sentences` block containing hint text (not rendered).

### N. Navigation / progress
- **N-1 Script pages orphaned.** No link to `dNNN-1` pages exists anywhere in the UI. The `[course]/page.tsx:95-97` comment says a "View the Korean script" button exists; i18n `lesson.viewScript` is defined but unused. 276 routes are reachable only by URL.
- **N-2 Mixed prev/next on script pages.** `content.ts:129`: on a script page prev/next walk the mixed list, so `다음 강의` from `d001-1` lands on main `d002`, and the learner can never reach `d002-1` by navigation.
- **N-3 Progress over-count.** `CourseDashboard.tsx:213-215`: `completedCount` counts `ld:dNNN-1` keys as well, so `학습 진도율: X / 276` can exceed 276 or double-count one lesson. `미완료` is clamped at 0.
- **N-4 Fragile step detection.** `LessonStepNavigation.tsx:8-15, 36-40` finds steps by the regex `Step\s*\d` over all `main button` text. It works for LD today, but any future button text containing "Step N" hijacks it.
- **N-5 Dead component.** `DialogueLearningView.tsx` (1,353 lines) is unreachable for every served course, since `getLesson` has no `man/woman/adults*` case.
