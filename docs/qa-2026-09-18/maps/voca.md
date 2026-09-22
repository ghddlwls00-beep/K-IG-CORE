# VOCA (slug `phonics`) — screen and feature map for the 2026-09-18 audit

Read-only source map, written on 2026-09-18 from `main` @ `9d6e15d`. The same agent (Claude) wrote this map and checked it; nobody else reviewed it.
Every count below was computed with node over `content/`. None were copied from comments.
Line numbers refer to the files as they are at that commit.

---

## 1. Routes and data sources

### 1.1 Routes

| URL | File | Notes |
|---|---|---|
| `/phonics` | `src/app/[course]/page.tsx` → `src/components/CourseDashboard.tsx` | Course list: 4 accordion sections, all collapsed at first |
| `/phonics/<id>` | `src/app/[course]/[lesson]/page.tsx:110-401` | Lesson page. `LessonBody` (`src/components/LessonBody.tsx:182-190`) hands off to `PhonicsLearningView` (dynamic import, SSR on, skeleton while loading, `LessonBody.tsx:39-42`) |
| `/t/voca` | `src/app/t/[tab]/page.tsx` | Legacy tab page (`src/lib/tabs.ts:34-40`, courses `["phonics"]`) |
| unknown id, e.g. `/phonics/mv4-01`, `/phonics/hv-76`, `/phonics/MV1-01` | `src/proxy.ts:117-152` | Not in `validRoutes.json` → rewritten to `/_kig/route-guard/not-found` (`proxy.ts:76`) → 404 page |
| media `/audio/phonics/<id>.mp3` | `src/app/audio/[...path]/route.ts` → `src/lib/mediaRoute.ts`, `src/lib/mediaAccess.ts:93-112` | Original recording. Referenced by the lesson but **never requested** by the VOCA page (see §6.4) |
| clips `/audio/azure-ava/v1/<key>.mp3` | same route, `mediaAccess.ts:86-91` | Free if the key is in `src/lib/generated/freeSpeechKeys.json` (532 keys), otherwise needs the `kig_license_session` cookie. Access is checked first: 403 `License required` (`mediaRoute.ts:41-43`). A missing object then returns 404 (`mediaRoute.ts:70`) |

`src/lib/generated/validRoutes.json` → `lessons.phonics` has 195 ids. It matches the files exactly (0 missing, 0 extra).

### 1.2 Lesson file schema: `content/lessons/phonics/<id>.json`

All 195 files have exactly these keys:
`id, course("phonics"), series("mv1"|"mv2"|"mv3"|"hv"), variant("main"), pairId(null), title, label(null), menuLabel("[ <id> ]"), unit(int), part(null), order(int), audio[{src:"/audio/phonics/<id>.mp3", legacySrc, autoplay:true}], video([]), blocks, legacyPath, legacyEncoding`.

Every file has `blocks` = `wordgrid, instruction, choice, dictation`, in that order:
- `{type:"wordgrid", rows: string[][]}`: **the only block VOCA renders**.
- `{type:"instruction", text:"[ <id> ]"}`, `{type:"choice", options:["1 번".."5 번"]}`, `{type:"dictation", rows:10}`: legacy blocks. `PhonicsLearningView` ignores them, so none of them appear on screen.
- `title` is the same legacy string in every file (`::: K-IG 교육 영어듣기훈련프로그램 | 기초1 | 제 001 회 강의 :::`). The page never shows it; titles come from `formatLessonPresentation` (§9).

### 1.3 Course index: `content/courses/phonics.json`

Top keys: `course, tab("voca"), lessonCount(195), groups, lessons`.
- `lessons[]`: `{id,title,label,series,variant,unit,part,order,hasAudio,menuLabel}`. There are 195 entries, all `variant:"main"`, in this order: mv1-01…mv1-40, mv2-01…mv2-40, mv3-01…mv3-40, hv-01…hv-75. This order drives prev/next.
- `groups[]` (4):
  - `"[ 중등01 ]"` holds mv1-01..40
  - `"[ 중등02 ]"` holds mv2-01..40
  - `"[ 중등03 ]"` holds mv3-01..40
  - `"[ 고등 단어 ]"` holds hv-01..75

  No lesson id is duplicated, missing or listed in two groups.
- On screen the group labels become (`src/lib/curriculumPresentation.ts:79-88`): `중등 단어 1단계 (MV1 Series)`, `중등 단어 2단계 (MV2 Series)`, `중등 단어 3단계 (MV3 Series)`, `고등 심화 단어 (HV Series)`.

### 1.4 Dictionary: `content/voca_dictionary.json`

- `Record<headword, {meaning: string, searchWord: string}>`. Every entry has both fields, as strings. No meaning is empty.
- **3,904 keys** (the task text and the `vocaUtils.ts` comments say 3,877). Lower-cased, that is 3,901, because of three case pairs: `Miss` "~양 (미혼 여성의 경칭)" / `miss` "그리워하다; 놓치다", `May` "5월" / `may` "~해도 된다; ~일지도 모른다", `March` "3월" / `march` "행진하다; 행진".
- 35 keys are not lower-case: proper nouns, month and day names, `Mr.`, `Miss`, `English`, `God` and so on.
- 13 keys contain brackets. For each, `searchWord` differs from the key: `judg(e)ment→judgement`, `medi(a)eval→mediaeval`, `marvel(l)ous→marvellous`, `enrol(l)→enroll`, `colo(u)r→colour`, `neighbo(u)r→neighbour`, `favo(u)r→favour`, `humo(u)r→humour`, `gray(grey)→graygrey`, `afterward(s)→afterwards`, `autumn(=fall)→autumn=fall`, `hono(u)r→honour`, `dialog(ue)→dialogue`. For every other key, `searchWord === key`.
- 2 keys are multi-word: `living room`, `pen pal`.
- One real meaning equals the view's fallback string: `word` means "단어" (see R-18).
- The dictionary has **no** part-of-speech, phonetics, example-sentence or example-translation fields. The VOCA screen shows none of those things. The only per-word fields on screen are headword and meaning, plus the etymology and collocation described below.
- The server trims the dictionary to the lesson's words before sending it: `getVocaDictionaryForWords` (`src/lib/content.ts:269-284`). For each trimmed word it stores `fullDict[written]` under `written` if that key exists, otherwise `fullDict[lower]` under `lower`. It is called at `page.tsx:216-221` and passed as the `vocaDictionary` prop.

### 1.5 Code-side data

| Data | Where | Content |
|---|---|---|
| `PREFIX_RULES` (etymology) | `src/lib/vocaUtils.ts:82-128` | **45** entries of `{prefix: <whole headword>, meaning: <explanation>}` (the comment at :138 says 46) |
| `COLLOCATION_PRESETS` | `vocaUtils.ts:161-222` | 10 words: predict, anticipate, produce, project, replace, recover, discover, transport, overcome, improve. Each has `{phrase, translation, exampleSentence, sentenceTranslation}` |
| `VOCA_SPEECH_FORMS` | `src/lib/vocaSpeech.ts:32-46` | Maps the 13 bracket headwords to their spoken form: judgment, medieval, marvelous, enroll, color, neighbor, favor, humor, gray, afterward, autumn, honor, dialogue |
| `MASTERY_STREAK = 3` | `vocaUtils.ts:71` | |
| Free preview ids | `src/lib/license.ts:74` | `phonics: ["mv1-01","mv1-02"]` |

---

## 2. Counts and id sequences (computed)

- Files: 195 = mv1 40 (01–40), mv2 40 (01–40), mv3 40 (01–40), hv 75 (01–75). **No gaps and no duplicates.** For every file, the file name equals `id` and `course` is `phonics`.
- The index and the files agree on ids. The only field that differs is `hasAudio`, which exists in the index but not in the files; that is harmless.
- `unit` equals the lesson number within its series. `order` runs mv1-01 = 0 … mv3-40 = 119, hv-01 = 120 … hv-75 = 194.
- **Word counts:** 194 lessons have 5 rows × 6 words = 30. **hv-75 has 2 rows (6 + 5) = 11 words.** In total there are 5,831 word cells, 3,904 distinct written forms and 3,901 distinct lower-cased forms. All 3,904 dictionary keys are used by at least one lesson, and 1,347 words appear in more than one lesson.
- Integrity checks over all 195 lessons:
  - 0 words have leading or trailing whitespace; 0 contain characters outside `[A-Za-z '-()=.]`.
  - 0 words are missing from the dictionary. A lookup under the written form or the lower-cased form always succeeds, so the client never falls back to "단어".
  - 0 lessons contain the same word twice, and 0 contain two words that differ only in case.
  - No lesson has two different words with an identical full meaning string.
  - **17 pairs in 16 lessons share one identical sense segment** after splitting the meaning on `,` or `;`. These can make a correct choice count as wrong (see R-7):
    hv-21 concept 개념 / conception 개념, 구상 · hv-23 critical 비판적인; 결정적인 / decisive 결정적인 · hv-23 accidental 우연한 / casual 우연한, 격식 없는 · hv-41 intermediate 중간의 / medium 중간의; 매체 · hv-43 eminent 저명한 / prominent 저명한; 눈에 띄는 · hv-43 committee 위원회 / commission 위원회; 위임 · hv-49 penalty 처벌, 벌금 / punishment 처벌 · hv-51 complicated (이해하기) 까다로운, 복잡한 / complex 복합적인, 복잡한 · hv-54 prime 주요한 / primary 주요한; 초등의 · hv-57 sense 감각; 의미 / sensation 감각 · mv2-09 hard 어려운; 열심히 / difficult 어려운 · mv3-02 wonderful 훌륭한, 멋진 / fancy 멋진 · mv3-08 almost 거의 / nearly 거의, 하마터면 · mv3-08 maybe 어쩌면 / perhaps 어쩌면, 아마 · mv3-16 stare 응시하다 / gaze 응시하다; 시선 · mv3-18 giant 거인; 거대한 / huge 거대한 · mv3-28 firm 확고한; 회사 / company 회사.
    A rough stemming heuristic (strip 하다/의/적인…) finds 345 derivation pairs such as 예측하다/예측, spread over 82 lessons. Those pairs differ in part of speech and are probably acceptable distractors.
- **Brackets** (13 lessons, one bracket headword each): hv-38 judg(e)ment, hv-41 medi(a)eval, hv-44 marvel(l)ous, hv-56 enrol(l), mv1-10 colo(u)r, mv1-23 neighbo(u)r, mv1-34 favo(u)r, mv1-37 humo(u)r, mv3-01 gray(grey), mv3-08 afterward(s), mv3-12 autumn(=fall), mv3-13 hono(u)r, mv3-14 dialog(ue). All 13 are in `VOCA_SPEECH_FORMS`.
- **Lessons that show a collocation card** (18 word-lesson pairs): hv-01 anticipate, predict, project, produce · hv-02 replace, recover, overcome · hv-52 transport · mv1-31 discover · mv2-23 discover · mv2-27 overcome · mv2-28 produce · mv2-34 transport · mv2-35 project · mv3-11 replace · mv3-20 project · mv3-25 produce · mv3-26 predict. `improve` is in no lesson.
- **Lessons that show an etymology box** (76 word-lesson pairs):
  - hv-01: ancestor, anticipate, antique, predict, forehead, forefather, foresee, foresight, preoccupy, precaution, preview, project, produce
  - hv-02: postwar, propose, postpone, postscript, replace, reproduce, revive, overlook, remove, overcome
  - hv-03 submarine; hv-04 export; hv-06 international, translate; hv-07 transform, transfer, disappear; hv-34 progress; hv-38 translate; hv-43 promote; hv-52 import, transport; hv-60 respect, expect, suspect, inspect; hv-63 substitute; hv-71 prevent; hv-73 interview
  - mv1-28 expect, international; mv1-31 discover, remove; mv1-37 disappear, subway
  - mv2-10 expect; mv2-23 discover; mv2-24 progress; mv2-25 disappear; mv2-26 promote, prevent; mv2-27 overcome; mv2-28 produce; mv2-30 respect; mv2-32 forehead; mv2-34 transport; mv2-35 remove, project; mv2-36 export; mv2-37 ancestor; mv2-38 translate
  - mv3-03 inspect; mv3-11 replace; mv3-13 respect; mv3-14 ancestor; mv3-15 expect; mv3-16 import; mv3-20 project; mv3-25 produce; mv3-26 predict, remove; mv3-27 international; mv3-31 subway

  Note that hv-01 contains `foremost` but shows no etymology box for it (the rule was deliberately removed, V-11).
- Free lessons (no licence): mv1-01 and mv1-02. The clip keys of all 60 of their words are in `freeSpeechKeys.json` (verified).
- The course list page says `총 195개 정규 레슨`, `4개 단계 구성`.

Reference data for the free lessons (word=meaning), usable as a smoke test:
- mv1-01:
  - row1 do=하다, can=할 수 있다, not=~아니다, ~않다, have=가지고 있다, say=말하다, go=가다
  - row2 come=오다, and=그리고, but=하지만, this=이, that=그, very=매우
  - row3 with=와, when=언제, where=어디서, what=무엇, how=어떻게, why=왜
  - row4 here=여기, there=거기, see=보다, as=~로, all=모두, so=그래서
  - row5 like=좋아하다; ~처럼, from=에서, get=얻다, think=생각하다, know=알다, about=~에 대하여; 약
- mv1-02:
  - row1 yes=네, 그렇다, day=날, 하루; 낮, school=학교, look=보다, time=시간, take=가져가다
  - row2 good=좋은, up=위로, out=밖으로, ask=묻다, man=남자, some=일부
  - row3 many=많은, now=지금, well=잘; 건강한; 우물, find=찾다, 발견하다, tell=말하다, make=만들다
  - row4 other=다른, thing=것, 물건, then=그때; 그러면, want=원하다, Mr.=~씨 (남성의 경칭), Miss=~양 (미혼 여성의 경칭)
  - row5 much=많이, if=만약에, English=영어, Korean=한국의; 한국인, German=독일의; 독일인, Japanese=일본의; 일본인

---

## 3. Components (file:line)

| Component | File | Role |
|---|---|---|
| `LessonPage` | `src/app/[course]/[lesson]/page.tsx:110-401` | Server-side licence gate (148-182), dictionary subset (216-221), top `AudioPlayer` (343-365), `LessonBody` (368-384), `LessonStepNavigation` (398) |
| `LessonActionButtons` | `src/components/LessonActionButtons.tsx:6-70` | Bookmark and complete buttons; records the recent lesson |
| `ProgressProvider` | `src/components/ProgressProvider.tsx` | localStorage progress (42-44, 196-258) |
| `AudioPlayer` | `src/components/AudioPlayer.tsx:29-391` | Top "play all" player; always in TTS/clip mode for VOCA |
| `LessonBody` | `src/components/LessonBody.tsx:182-190` | Routes to `PhonicsLearningView` |
| **`PhonicsLearningView`** | `src/components/PhonicsLearningView.tsx:26-1385` | The whole VOCA learning UI |
| `VoiceSpeakingTester` | `src/components/VoiceSpeakingTester.tsx:20-288` | Step 3 microphone test |
| `vocaUtils` | `src/lib/vocaUtils.ts` | Etymology (151-155), collocation (252-258), quiz generator (264-351), speed items (408-452), Leitner (458-535). `generateClozeQuestions` (367-402) is dead code with no caller |
| `vocaSpeech` | `src/lib/vocaSpeech.ts:32-57` | Display-to-spoken table |
| `speech` | `src/lib/speech.ts` | Playback engine: `speakText` 1017-1031, `playUnifiedClip` 755-841, legacy fallback 959-1007/937-956, queue 1110-1180, `stopSpeech` 1223-1233 |
| `unifiedSpeech` | `src/lib/unifiedSpeech.ts:1-47` | Clip URL and key |
| `speechRecognition` | `src/lib/speechRecognition.ts` | `isSpeechRecognitionSupported` 42-45, `evaluatePronunciation` 120-221, `listenToSpeech` 231-321 |
| `LessonStepNavigation` | `src/components/LessonStepNavigation.tsx:18-91` | Bottom "← 이전 Step / 목록으로 / 다음 Step →" |
| `LessonPaywall` | `src/components/LessonPaywall.tsx:15-137` | Shown to unlicensed visitors on paid lessons |
| `CourseDashboard` | `src/components/CourseDashboard.tsx:176-493` | `/phonics` list |
| `curriculumPresentation` | `src/lib/curriculumPresentation.ts:79-88, 181-206` | Titles |
| `content.ts` | `src/lib/content.ts:124-163` (prev/next), `269-284` (dictionary subset), `305-307` (free check) | |

---

## 4. Every view and control

VOCA UI text is hard-coded Korean and does not change with `kig:lang`. Only the top `AudioPlayer` uses `t()` (`src/lib/i18n.ts:51-60`, Korean defaults: `player.play` "재생", `player.pause` "일시정지", `player.seek` "탐색", `player.speed` "속도", `player.back5` "5초 뒤로").
There are no `data-testid` attributes; select by text or structure.

**Notation.**
- **W** = the lesson's word list: `rows.flat().map(trim).filter(Boolean)`, in order (`PhonicsLearningView.tsx:36-38`).
- **N** = `W.length`.
- **M(w)** = the meaning from `getMeaning`: `vocaDictionary[w].meaning || vocaDictionary[w.toLowerCase().replace(/[()"]/g,"").trim()].meaning || "단어"` (`:94-102`). Given the server subset (§1.4), this is effectively `dict[w] ?? dict[w.toLowerCase()]` for every current word.
- **S(w)** = `vocaSpeechForm(w)`: the table value, or `w` unchanged.
- **K(text)** = `unifiedSpeechKey(text)` (§6.2).

### 4.0 Page shell (licensed, or a free lesson)

| Element | Exact text / attributes | Behaviour and state |
|---|---|---|
| Back link | `← VOCA 목록` (the arrow is an `aria-hidden` span; the text span says `VOCA 목록`), href `/phonics` (`page.tsx:266-272`) | |
| Bookmark button | text `☆` + `북마크`, `aria-label="북마크 추가"`; when on: `★` + `북마크됨`, `aria-label="북마크 해제"` (`LessonActionButtons.tsx:30-44`) | Toggles `localStorage["kig:progress:bookmarks"]["phonics:<id>"]` (true, or the key deleted) (`ProgressProvider.tsx:224-236`). Local only, no server call |
| Complete button | `완료 체크`, `aria-label="학습 완료 체크"`; when on: `✓` + `학습 완료`, `aria-label="학습 완료 취소"` (`:47-67`) | Toggles `localStorage["kig:progress:completed"]["phonics:<id>"]` (`ProgressProvider.tsx:196-215`). Manual only: finishing the steps never marks a lesson complete |
| Recent lesson (automatic) | – | On mount writes `localStorage["kig:progress:recent"] = {course:"phonics", lessonId, title:<pres.title>, courseTitle:"VOCA", updatedAt}` (`LessonActionButtons.tsx:23-25`) |
| Prev/next card | `<a aria-label="이전 강의: <prev title>">` containing `이전 강의` + title; `<a aria-label="다음 강의: <next title>">` containing `다음 강의` + title (`page.tsx:281-325`) | Order from §1.3. mv1-01 has no prev (single column); hv-75 has no next; mv3-40 → hv-01 |
| h1 | `pres.title`: `중등 단어 {s}단계 · {nn}회` (mv) or `고등 단어 · {nn}회` (hv) | `document.title` = `<h1> · K-IG 핵심 어학 마스터` (`layout.tsx:16-19`) |
| Top AudioPlayer | see §4.6 | |
| Bottom nav | `← 이전 Step` (button), `목록으로` (link to `/phonics`), `다음 Step →` (button) (`LessonStepNavigation.tsx:64-89`) | Finds `main button` elements whose textContent matches `/\bStep\s*(\d+)\b/`, keeping the first per number (the header tabs). maxStep = 4. Previous is disabled at step 1 and next at step 4. Clicking either calls `.click()` on the tab button and scrolls to it. Clicking any button whose text contains `Step N` (such as the CTA) also updates the current step |

### 4.1 VOCA header (always visible)

`PhonicsLearningView.tsx:438-540`
- Kicker `K-IG VOCA COGNITIVE MASTERY`.
- Chips: `총 {N}단어`, `완전 마스터: {box3 count}개`, `집중 복습 필요: {box1 count}개`. The last chip appears only when the count is above 0, which happens after the Leitner load effect runs. On a fresh profile it reads **N**, because every card starts in Box 1.
- h2 `4단계 어휘 마스터리 — 소리 · 인출 · 발음 · 반사 드릴`.
- Speed: label `속도:` and buttons `0.8x`, `1x`, `1.2x` (`:464-480`). State `speed` defaults to 1.0. There is no aria-pressed; the selected button carries the classes `bg-surface … border`. The setting changes `playbackRate` of later word, row and collocation playback only. It is not persisted, and it is separate from the top player's `0.8× / 1× / 1.2×`.
- Step tabs (`:486-538`). Each button contains three spans:
  1. `Step 1` / `💡 덩어리 매트릭스` / `소리·어원·콜로케이션`
  2. `Step 2` / `⚡ 액티브 인출` / `테스트 효과 4지선다`
  3. `Step 3` / `🗣️ 발음 테스트 & 오답노트` / `망각곡선 라이트너 복습`
  4. `Step 4` / `⏱️ 60초 타임어택` / `두뇌 반사신경 드릴`

  A click calls `stopRowPlayback()` (which also calls `stopSpeech`) and then `setActiveTab`. The tab does **not** stop a running speed game. The active tab has the class `border-[#D4AF37]` and a ring; there is no `role`/`aria-selected`. The initial tab is `matrix`.

### 4.2 Step 1: matrix (`activeTab==="matrix"`, `:545-837`)

**Spotlight card** (`:548-679`), shown when `selectedWord` is non-empty. `selectedWord` starts as W[0].

| Element | Text | Behaviour and expected value |
|---|---|---|
| Word | `{selectedWord}` in the written form | |
| Meaning | `{M(selectedWord)}` | |
| Sub-line | `글자 수: {selectedWord.length}자 · 표준 미국식 발음` | Counts brackets and punctuation (R-14) |
| Play button | `🔊 발음 청취`; while this word is playing `⏹️ 정지` (`:568-578`) | `playWord(selectedWord)`. A second click while playing calls `stopSpeech` |
| Master button | `○ 마스터 체크`; when the card is in Box 3 `✓ 마스터 완료` (`:579-603`) | `setLeitnerMastery(cards, w, M(w), !isBox3)`. Mastered: box 3, `streak+1`, `lastTestedAt=now`. Un-mastered: box 1, streak 0. Saves the **whole** card map to `kig:voca:leitner:phonics/<id>`. The header chips and the grid badge update |
| Etymology box | Header `🧬 어원 분해 (Etymology Decoding)`; body `PREFIX_RULES[i].meaning` (`:612-623`) | Only when `analyzeEtymology(w)` is non-null: an exact lower-cased match on `prefix`. Expected presence per lesson: §2 |
| Collocation box | Header `🔗 실전 연어 덩어리 (Essential Collocation Chunk)`; button `청취 🔊`; `“{phrase}”`, `➔ {translation}`; italic `“{exampleSentence}” ({sentenceTranslation})` (`:632-665`) | Only when `getCollocation(w, dict[w]?.searchWord ‖ dict[lower]?.searchWord)` is non-null: key `(searchWord‖w).toLowerCase().replace(/[()]/g,"").trim()` looked up in `COLLOCATION_PRESETS`. The button calls `speakText(phrase,{lang:"en",rate:speed})` directly: it sets no active state and does not stop row playback (R-2) |
| CTA | `이 단어로 Step 2 액티브 인출 퀴즈 풀기` + `→` (`:668-677`) | `startRecallAt(w)`: finds the quiz index with the same lower-cased word (index i of W), resets score, streak, counts and wrong list, sets `recallIdx=i`, and switches to Step 2 |

**Cluster toolbar** (`:682-718`)
- Label `클러스터 선택 ({rows[0].length}단어 단위):` (6 for every lesson).
- One button per row, `Cluster #{r+1}`. A click sets `clusterIdx=r`, `showAllClusters=false` and `selectedWord=rows[r][0]`. It does **not** play.
- Toggle `전체 {N}단어 펼쳐보기` or `전체 펼쳐보기 닫기`.

**Grid** (`:721-835`). Shows the current cluster (default row 0), or every row when expanded. Each row panel has:
- Header `Word Cluster #{r+1}`, `({count}단어)`.
- Row button `▶ 이 행 {count}단어 연속 청취`; while playing `⏹ 이 행 재생 중지` (`:743-762`). It calls `playRow(r)`: each word in turn gets `speakText(S(w))`, with a 350 ms gap after each word ends or errors; the word becomes selected and highlighted as it plays. At the end, `stopRowPlayback`. Clicking the button again while playing stops.
- Word cards: a `<div onClick>` with no role and no tabIndex (`:775-827`). Each shows a `✓` badge (filled green when Box 3), a `🔊` glyph, the word (`span.font-mono.text-[16px]`) and M(w) (`span.text-[11.5px]`, `line-clamp-1`).

  A click runs `setSelectedWord(w)` and then `playWord(w)`, so the card becomes selected and plays. Clicking a word that is already playing stops it.

  CSS state classes: playing `bg-[#D4AF37] text-white scale-105`; selected `bg-[#D4AF37]/10 ring-2`; mastered `border-emerald-500/40`.

`playWord(w)` (`:130-155`):
1. If `activeWord===w`, call `stopSpeech()`, clear the active word and return. This check runs **before** the row-playback check (R-3).
2. If a row is playing, call `stopRowPlayback()`.
3. `stopSpeech()`; `activeWord=w`; `selectedWord=w`.
4. `speakText(S(w), {lang:"en", rate:speed, onEnd/onError → clear activeWord})`.

### 4.3 Step 2: active recall

**Question generation** (`vocaUtils.ts:264-351`, memoised once per mount at `PhonicsLearningView.tsx:211-222`)
- `dictMap = { w.toLowerCase().trim(): {meaning: M(w)} }` for w in W. `validWords` = W (every M is truthy), so there are **N questions in word order**. Question q (1-based) is about `W[q-1]`.
- **Type:** `idx % 2 === 0` gives `en-to-ko` (questions #1, 3, 5…); otherwise `ko-to-en` (#2, 4, 6…). This part is deterministic.
- **en-to-ko options.** The correct one is M(w). Distractors: the meanings of the other lesson words that are not equal to M(w), shuffled with `sort(()=>Math.random()-0.5)` and de-duplicated, first 3. If fewer than 3, the pool is filled from all lesson meanings and then with `단어 의미 1..3` (never reached with 11 or more words). The 4 options are shuffled randomly and `correctIndex = options.indexOf(M(w))`.
- **ko-to-en options.** The correct one is `w`. Distractors: lesson words whose lower-cased form differs from w **and** whose meaning string differs from M(w), shuffled, first 3, padded with `vocab1..` (never reached). Options shuffled.
- **No seed.** `Math.random` runs at mount, so the order is not reproducible. The driver must read the DOM and derive the correct option from data: en-to-ko → the option whose text equals M(W[q-1]); ko-to-en → the option whose text equals W[q-1]. Exactly one option matches (guaranteed by construction and verified for the data).
- `etymologyHint = analyzeEtymology(w)?.explanation`.

**Active question view** (`:913-1032`), when `!recallFinished`
- `Question #{recallIdx+1} / {N}`. `🔥 {streak} Streak!` appears when streak ≥ 2. `Score: {score} pts`.
- Prompt kicker: `영단어 ➔ 올바른 한국어 뜻 인출` (en-to-ko) or `한국어 뜻 ➔ 올바른 영단어 인출` (ko-to-en).
- Big text: `w` (en-to-ko) or `M(w)` (ko-to-en).
- en-to-ko only: a `🔊` button, `title="발음 청취"`, no aria-label, calling `playWord(w)`.
- Prompt line: `"{w}" 의 가장 알맞은 한국어 뜻은 무엇일까요?` or `[ {M(w)} ] 에 해당하는 올바른 영단어를 고르세요.`
- 4 option buttons, each `A.` / `B.` / `C.` / `D.` followed by the option text.

**Answering** (`handleAnswerRecall`, `:240-267`). A click on an option:
1. `isCorrect = optIdx === correctIndex`: plain index equality, no text normalisation.
2. Sets the answered state. All 4 buttons become `disabled`.
3. The correct option gets emerald classes and `✓`. A wrongly chosen option gets rose classes and `✗`. The others are dimmed with `opacity-50`.
4. Scoring:
   - Correct: `score += 10 + streak*2` using the old streak, then `streak++` and `correct++`.
   - Wrong: `streak = 0`; w is appended to the wrong list if not already there.
   - Every answer: `answered++`.
5. Leitner (`updateLeitnerCard`, `vocaUtils.ts:458-499`):
   - Correct: `streak+1`, `box = max(current box, streak≥3 ? 3 : 2)`.
   - Wrong: `box = 1`, `streak = 0`.
   - Both set `lastTestedAt = now` and save the whole map to `kig:voca:leitner:phonics/<id>`.

**Feedback panel** (`:1009-1027`)
- Header `💡 기억 각인 힌트 & 어원 풀이` when there is an etymology hint, otherwise `✅ 정답 확인`.
- Body: the hint, or `{w} = {M(w)}`.
- Button `다음 문제 풀기 →`, or `결과 보기 →` on the last question.
- The panel does not say "correct" or "wrong" in words.

**Next** (`:269-277`): clears the selection. On the last question `recallFinished=true`, otherwise `recallIdx++`.

**Results view** (`:842-911`)
- `role="status"`, `🏁`.
- h3 `{N}문항 완료`. If the run started part-way via the CTA: `{answered}문항 풀이 완료 (전체 {N}문항)`.
- Line `틀린 단어는 Step 3 오답노트의 Box 1(집중 복습)에 들어가 있습니다.`
- Tiles `최종 점수` {score} and `정답 / 푼 문항` `{correct} / {answered}`.
- `틀린 단어 {k}개` followed by a list of `{word}` and `{dictMap meaning}` in the order the words were missed; or, with none wrong, `모든 문항을 맞혔습니다!`.
- Buttons `처음부터 다시 풀기 ↺` → `resetRecall(0)` (same options as before, not regenerated) and `Step 3 오답노트 복습하러 가기 →` → Step 3.

**Expected scores.** All N correct: Σ_{k=0}^{N-1}(10+2k) = 10N + N(N−1). For N=30 that is **1170**; for N=11 (hv-75) **220**. Alternating correct and wrong starting with correct: every correct scores 10, so 15 correct give **150** for N=30.

**Leitner after quiz runs.** An all-correct run puts every card in Box 2 with streak 1. After three all-correct runs (without reloading, or across reloads) every card is in Box 3. One wrong answer puts that card in Box 1 with streak 0.

State lives in component memory only, apart from the Leitner storage. Reloading the page restarts the quiz at #1 with new random options.

### 4.4 Step 3: speaking and Leitner (`:1037-1224`)

**Section A**
- Kicker `Step 3 · Speaking & Pronunciation Tester`; h3 `직접 소리 내어 말해 본 단어가 더 오래 기억에 남습니다`; `선택 단어:` `{selectedWord}`.
- `VoiceSpeakingTester` with `targetText=S(selectedWord)` and `buttonLabel="\"{selectedWord}\" 발음 테스트"`. The label shows the written form; the target is the spoken form.
- The tester has no `key`, so its result survives a change of word (R-6).

`VoiceSpeakingTester` (`VoiceSpeakingTester.tsx`):
- **Unsupported** (no `window.SpeechRecognition` or `webkitSpeechRecognition`, checked in an effect after mount), `:109-129`:
  - Normal browser: `(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)`
  - KakaoTalk or another in-app browser (UA regex `speech.ts:64-72`): `⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다.` plus a button `🌐 Safari로 열기` (iOS) or `🌐 Chrome으로 열기`, which navigates to `intent://…` or `kakaotalk://web/openExternal?url=…`.
- **Idle button:** `🎙️` + `"{word}" 발음 테스트`, `title="마이크를 누르고 영어 문장을 소리내어 말해보세요."`.
- **Listening:** `listenToSpeech({lang:"en-US"})` with `continuous=false`, `interimResults=true`, `maxAlternatives=1`. The button reads `⏹️` + `듣고 있는 중... (말씀하세요)`. A panel shows `실시간 음성 인식:` + `{interim ‖ "지금 영어로 말씀하세요..."}` and a button `완료` that calls `recognition.stop()`. Clicking the main button again also stops.
- **Result:** button text `{score}점 ({ratingLabel})`, plus a button `↺ 다시 녹음` (`title="다시 말하기"`) that clears and listens again. The result card has:
  - a badge `{score}점` and `{ratingLabel}`
  - `단어 일치 {matchedCount}/{totalWords}`
  - `인식된 내 음성:` `"{transcript}"`
  - `단어별 발음 일치도:` followed by one span per target word (green when matched, red strike-through otherwise)
  - `💡 {feedback}`

  Card colour: ≥85 emerald, ≥60 amber, otherwise red. Button colour: ≥80 emerald, otherwise amber.
- **Errors** (`speechRecognition.ts:285-293`):
  - `no-speech` → `음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.`
  - `not-allowed` / `service-not-allowed` → `마이크 접근 권한이 거부되었거나 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요. (모바일 기기에서는 HTTPS 보안 연결이 필요할 수 있습니다)`
  - anything else → `음성 인식 오류: {code}`

  The error is shown with `⚠️` in an amber box; in-app browsers also get the open-external button.

**Scoring** (`evaluatePronunciation`, `speechRecognition.ts:120-221`).
- Normalisation: lower-case, strip `.,?!;:"'()`, expand 16 contractions, collapse spaces.
- Each target word is aligned with a search window of at most 2 spoken words ahead:
  - exact match → `matched++`;
  - a target word of 5+ letters at Levenshtein distance 1 → partial 0.7, shown as matched but **not** added to `matchedCount` (R-27).
- Score = `round(65·(matched+partial)/targetWords + 20·charSim + 15·lenRatio)`, where charSim = 1 − lev(normTarget, normSpoken)/maxLen and lenRatio = min/max word count.
- Ratings:
  - ≥92: `🌟 모든 단어 일치 (Excellent!)` / `문장의 단어가 어순대로 모두 인식되었습니다!`
  - ≥80: `👍 대부분 일치 (Good!)` / `대부분의 단어가 인식되었습니다. 빨간색으로 표시된 단어만 다시 또렷하게 말해보세요.`
  - ≥60: `💪 거의 맞았어요 (Almost!)` / `빨간색으로 표시된 단어를 빠뜨렸거나 발음이 다릅니다. 확인 후 다시 말해보세요.`
  - otherwise: `다시 시도 (Try Again)` / `문장을 처음부터 끝까지 조금 더 또렷하게 소리내어 읽어보세요.`
  - Empty normalised transcript: `음성 감지 안 됨`, score 0.
- Worked examples:
  - target `do` / spoken `do` → 100, `단어 일치 1/1`
  - target `do` / spoken `go` → 0 + 10 + 15 = **25** `다시 시도 (Try Again)`, `0/1`
  - target `color` (from colo(u)r) / spoken `colour` → 45.5 + 16.67 + 15 = **77** `💪 거의 맞았어요 (Almost!)`, word shown green but `0/1`
  - target `Mr.` / spoken `Mr.` → 100
  - `living room` has 2 target words.

**Section B: Leitner** (`:1075-1222`)
- Kicker `Ebbinghaus Spaced Repetition`; h3 `라이트너 3단계 스마트 망각곡선 단어장`.
- Filters: `전체 ({N})`, `Box 1 집중복습 ({b1})`, `Box 2 친숙 ({b2})`, `Box 3 마스터 ({b3})`. `전체` counts `words.length`; the others count cards. The filter is not persisted.
- **Card list.** Cards are built on mount (`:60-84`): one per W in word order, keyed `w.toLowerCase().trim()`.
  - Word and meaning always come from the current data.
  - `box`, `streak` and `lastTestedAt` come from the saved card with the same key, if one exists. Otherwise box 1, streak 0, `lastTestedAt` = now.
  - Saved cards for words no longer in the lesson are ignored and disappear on the next save.
- **Each card is a `<div onClick>`**, which selects and plays the word. It contains:
  - A badge: `Box 1 · 집중 복습`, `Box 2 · 익숙해지는 중` or `Box 3 · 마스터 완료`.
  - `{streak}회 연속 정답`.
  - The word (`span.font-mono.text-[18px]`) and its meaning (`span.text-[13.5px]`).
  - A button `🔊 발음`, which calls `playWord` and also selects the word.
  - A button `다음 Box로 승급 ↑`, or `Box 1로 내리기` when the card is in Box 3 (`:1199-1216`). It sets box 1→2, 2→3 or 3→1, keeps streak and `lastTestedAt` unchanged (R-5), and saves.

### 4.5 Step 4: 60-second drill (`:1229-1382`)

**Items** (`generateSpeedDrillItems`, `vocaUtils.ts:408-452`, memoised once per mount). For each word, `isMatch = Math.random() > 0.45`. When not a match, the displayed meaning is picked at random from the other lesson words whose meaning string differs from M(w); if there is none, the item becomes a match. The N items are then shuffled with no seed. Play cycles through them with `index % N`, so the same sequence repeats and **is not regenerated by "다시 도전하기"** (R-8).
- **Expected answer for the item on screen:** `⭕ 일치 (맞음)` if the text after `= ` equals M(word), otherwise `❌ 불일치 (다름)`.

**Intro screen**
- Kicker `Step 4 · Speed Reflex Drill`; h3 `60초 타임어택 스피드 드릴`; body `화면에 나타나는 영단어와 한국어 뜻이 일치하는지 0.5초 만에 판단하세요! 빠르고 정확하게 맞힐수록 콤보 보너스 점수가 폭증합니다.`
- When the saved high score is above 0: `🏆 현재 레슨 최고 점수: {n} pts`.
- Button `도전 시작하기 (60초 타이머) ⚡` → `startSpeedGame`: active, 60 s, index 0, all counters 0.

**Active screen**
- `⏳ {t}s`, `🔥 {combo} COMBO!` when combo ≥ 2, `Score: {score}`, and a progress bar at `width = t/60·100%`.
- Word (`text-[36px]`) and `= {displayedMeaning}`.
- Buttons `❌ 불일치 (다름)` → `handleSpeedAnswer(false)` and `⭕ 일치 (맞음)` → `handleSpeedAnswer(true)`.
- **Judging** (`:357-386`): `correct = userSaysMatch === item.isMatch`.
  - Correct: `combo++`, `maxCombo = max(maxCombo, combo)`, `score += 100 + 10·combo` with the new combo, `correct++`. If the new score beats the stored high score, `localStorage["kig:voca:speed_high:phonics/<id>"] = String(score)` is written at once.
  - Wrong: `combo = 0`, `wrong++`.
  - Either way the index advances.
- n correct in a row from 0 score `100n + 5n(n+1)`: 1 → 110, 2 → 230, 3 → 360, 10 → 1550.
- The timer is `setInterval(1000)` while active (`:328-343`). When t ≤ 1 the game becomes inactive and over, with t = 0. It keeps running if you change tab (R-9). Speed answers do not touch the Leitner boxes.

**Game-over screen**
- `🎉`, h3 `타임오버! 훈련 완료`, `반응 속도가 한층 빨라졌습니다!`.
- Tiles `최종 점수` {score}, `최대 콤보` {maxCombo}, `정답 / 오답` `{c} / {w}`.
- Buttons `다시 도전하기 ↺` (restart) and `Step 3 오답노트 복습하러 가기 →`.

### 4.6 Top AudioPlayer on VOCA lessons (`AudioPlayer.tsx`, fed at `page.tsx:343-355`)

- Each lesson has one audio track (`/audio/phonics/<id>.mp3`), so `topLevelAudio=[track]`, `label` is undefined and no label row is shown.
- `fallbackSentences` = the page's `cleanText(w)` over the grid (`page.tsx:459-462, 421-426`), which strips a leading `1.` and turns `/` into a space. **`vocaSpeechForm` is not applied** (R-1).
- `isTtsMode = true`, because `shouldUseUnifiedSpeech('/phonics/..')` is true. The `<audio>` element is never rendered and the original MP3 is never fetched.
- Controls:
  - Play/pause button: `aria-label="재생"` or `"일시정지"`. Not speaking: `playSentenceQueue(words, {rate, gap:300, startIndex:0})`. Speaking: `togglePauseSpeech()`.
  - Stop: `aria-label="정지"`, disabled unless speaking.
  - `이전` (`aria-label="이전 문장"`) and `다음` (`aria-label="다음 문장"`).
  - A hidden range input: `aria-label="문장 이동"`, `aria-valuetext="{i+1}번째 문장 / 전체 {N}문장"`. It commits on pointer-up, key-up or blur.
  - Counter `{i+1}/{N}`.
  - `속도` with `0.8×`, `1×`, `1.2×` (`aria-pressed`). Changing the rate while speaking restarts at the current item.
  - Status: `▶ 재생 버튼을 눌러 전체 듣기` / `🔊 음성 읽는 중…` / `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기`.
- A global `keydown` Space handler toggles the player unless the focus is in an input, textarea or contentEditable (`:182-198`).
- The player reads the global speech snapshot, so it also reacts to word playback from `PhonicsLearningView` (R-4).

---

## 5. Answer checking and normalisation (excerpts)

Quiz (`PhonicsLearningView.tsx:249`):
```ts
const isCorrect = optIdx === currentQ.correctIndex;
```
Distractor exclusion is by **exact meaning string** (`vocaUtils.ts:282, 330`):
```ts
.filter((m) => m && m !== correctMeaning);                    // en-to-ko
return (vocaDict[other]?.meaning || "") !== correctMeaning;   // ko-to-en (KIG-019)
```
Speed drill (`PhonicsLearningView.tsx:362`, `vocaUtils.ts:431-439`):
```ts
const isCorrect = userSaysMatch === cur.isMatch;
.filter((m) => m && m !== actualMeaning);   // "not a match" never shows the identical string
```
Meaning lookup (`PhonicsLearningView.tsx:94-102`):
```ts
const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
return vocaDictionary?.[word]?.meaning || vocaDictionary?.[clean]?.meaning || "단어";
```
Leitner keys are `word.toLowerCase().trim()` everywhere (`:76, 214, 582, 1206`; `vocaUtils.ts:464, 513`).
Pronunciation uses `normalizeText` and the score in `speechRecognition.ts:68-92, 120-221` (§4.4). Its target is `vocaSpeechForm(selectedWord)`.

---

## 6. Audio

### 6.1 What is spoken

| Trigger | Text passed to `speakText` / queue | File:line |
|---|---|---|
| Word card, spotlight `🔊 발음 청취`, quiz `🔊`, Leitner card, `🔊 발음` | `S(w)` = `vocaSpeechForm(w)` | `PhonicsLearningView.tsx:143` |
| Row play | `S(w)` for each word | `:183` |
| Collocation `청취 🔊` | `phrase` exactly as written (e.g. `predict the future outcome`) | `:641` |
| Top AudioPlayer | `cleanText(w)` (**no** vocaSpeechForm) | `page.tsx:459-462` |
| Meanings (Korean) | never spoken | – |

### 6.2 Clip URL

`speakText` → `speakWithToken` → `cleanText` = `normalizeUnifiedSpeechText` → `playUnifiedClip` → `audio.src = /audio/azure-ava/v1/{K}.mp3`, with `playbackRate` clamped to 0.5–2 (`speech.ts:813-814`). The same shared `new Audio()` element (not in the DOM) is reused.

```ts
// src/lib/unifiedSpeech.ts:4-35
normalize: replace(/\s*\/\s*/g," ") .replace(/\[[^\]]*\]/g," ") .replace(/:{2,}/g," ") .replace(/-{2,}/g," ")
           .replace(/[…]+/g," ") .replace(/\s*\|\s*/g,", ") .replace(/\(\s*\)/g," ") .replace(/\s+/g," ").trim()
key = `${clean.length.toString(36)}-${hex(fnv1a32(clean))}${hex(mix32(clean))}`
  first = 0x811c9dc5; second = 0x9e3779b9;
  for each UTF-16 code: first = imul(first ^ c, 0x01000193); second = imul(second ^ c, 0x85ebca6b); second ^= second >>> 13;
```
Samples: `do` → `2-621cd814878d81e3`, `Mr.` → `3-8c8390d0a178b93e`, `English` → `7-1b9ae0bb6049568c`, `predict the future outcome` → `q-2350789cd126123c`.

Bracket words. The **view** asks for the spoken key; the **top player** asks for the display key.

| headword | display key (top player) | spoken key (view) |
|---|---|---|
| judg(e)ment | b-65061a394c863286 | 8-807204117589b1ba |
| medi(a)eval | b-0eb440e877d4c21e | 8-e92af4e697cbf3b4 |
| marvel(l)ous | c-d25da1f20a833599 | 9-d02d3fc3c9ed0fad |
| enrol(l) | 8-b6953fb25929a4ed | 6-b8067665e58868a0 |
| colo(u)r | 8-58c8d2c604ba97cf | 5-3d7e6258f97c8688 |
| neighbo(u)r | b-efcef7ef6125ebd4 | 8-32319b2bf951ac5d |
| favo(u)r | 8-1c18b64baa5dc044 | 5-31d7a887792b1de7 |
| humo(u)r | 8-581cc54628d53452 | 5-657029d8109f39b4 |
| gray(grey) | a-8ecd0be8471d59c5 | 4-ba9ab39a67fca1d3 |
| afterward(s) | c-9b4d95495393d777 | 9-65d62c378eab4eeb |
| autumn(=fall) | d-2a15f4f4ace71c46 | 6-c5e12a133a8394d1 |
| hono(u)r | 8-0e4d5fe37c8df2f2 | 5-2c79840f6f0cb5cb |
| dialog(ue) | a-6689b1e4972007c9 | 8-ae3b29533ad93de3 |

The generator (`scripts/generate-azure-ava.mjs:313-317`) and the free-key builder (`scripts/buildFreeSpeechKeys.mjs:173-177`) pass every collected string through `vocaSpeechForm`. Neither produces a display-form key, so the display keys exist in R2 only if an older run (before RE-005) left a clip behind. Check this live.

Other collocation phrase keys:

| word | key |
|---|---|
| anticipate | `w-cda92e212ed6b1db` |
| produce | `t-66764e10eb40c3b4` |
| project | `r-fc81308d9060263a` |
| replace | `11-fef8f02e2c301982` |
| recover | `t-b182df2d948a9ade` |
| discover | `w-3f6940c63ea5f502` |
| transport | `u-31d176de1796e745` |
| overcome | `t-45e7f0296959d7f3` |
| improve | `10-6c3142fb3b62b07a` |

### 6.3 Fallback chain (`speech.ts`)

1. `playUnifiedClip` (755-841). If the clip errors (`onerror`) or `play()` rejects, `failAvaPlayback` runs the legacy engine.
2. Legacy engine (966-1002): split the text by language, then chunks of up to 200 characters.
3. `runCurrentChunk` (937-956):
   - `useStream` when there is no `speechSynthesis`, the browser is KakaoTalk or another in-app browser, or `!hasVoiceFor(lang)`. Note that `hasVoiceFor` returns **true** when the voice list is empty.
   - Stream: `playChunkViaStream` asks for **the same clip URL again**, and an error ends the run with `onError`.
   - Otherwise a Web Speech utterance (`rate` clamped 0.5–1.6). A 1,500 ms watchdog falls back to the stream if nothing is speaking.
4. Word-level `onError` clears the highlight. In a **queue** (top player), `onError` stops the entire queue (`speech.ts:1170-1176`).
5. `stopSpeech` (1223-1233) bumps a token. Every pending `onEnd`/`onError` from the old run is discarded, **not called**.
6. Global hooks (`speech.ts:252-263`): `pointerdown`/`touchend`/`keydown` unlock audio; `pagehide`/hidden visibility call `stopSpeech`.

### 6.4 Original recordings

The lesson's `audio[0].src` (`/audio/phonics/<id>.mp3`) sits behind the licence gate (free for mv1-01/02). It is never requested on the VOCA page, because the player is always in TTS mode. This matches the owner's decision to keep the recordings in storage without playing them.

---

## 7. Persistence, completion and progress

| Key | Storage | Written by | Shape |
|---|---|---|---|
| `kig:voca:leitner:phonics/<id>` | localStorage | quiz answer, master toggle, box button | `{ "<lower word>": {word, meaning, box:1\|2\|3, lastTestedAt:ms, streak} }` with **all** N words |
| `kig:voca:speed_high:phonics/<id>` | localStorage | speed drill, whenever the score beats the stored best | `"1550"` |
| `kig:progress:completed` | localStorage | complete button | `{ "phonics:<id>": true }` (key deleted when false) |
| `kig:progress:bookmarks` | localStorage | bookmark button on the page or the list star | same shape |
| `kig:progress:recent` | localStorage | every lesson page mount | `{course, lessonId, title, courseTitle, updatedAt}` |
| `kig:lang`, `kig:theme` | localStorage | global | |
| `kig:license:v1` (localStorage), `kig:license-cookie:<last16>` (sessionStorage), cookie `kig_license_session` | | licence (do not touch) | |

- No server API is called for VOCA progress. `/api/progress/student` is used by STUDENT only (`ProgressProvider.tsx:206, 253`).
- Quiz position, score, selected word, tab, filter, speed choice and speed game state are all memory only. A reload resets them.
- The `/phonics` dashboard shows:
  - `학습 진도율: {completed} / 195개 완료 ({pct}%)`;
  - filters `전체 (195)`, `★` `북마크 ({n})`, `미완료 ({195-n})`;
  - per section `총 {k}개 레슨` and `· {c}개 완료`;
  - per card `✓ 완료`, the star button (`aria-label` `북마크 추가`/`북마크 해제`, or `잠긴 레슨은 북마크할 수 없습니다` when locked), badge `🎙️ 발음 채점`, code `MV1-01`/`HV-01`, link text `학습하기` (or `무료 보기` / `올패스 열람` without a licence).
- Leitner progress is per lesson. Of the 1,347 words shared between lessons, none carries its progress from one lesson to another.

---

## 8. Locking and entitlement

- **Server gate** (`page.tsx:148-182`). The lesson is free when `isFreePreviewLesson("phonics", id)` returns true: exact id `mv1-01` or `mv1-02`, also trying the id with trailing `-<n>` segments removed (`license.ts:106-125`). Otherwise the page needs a valid `kig_license_session`. A STU* plan does not open VOCA; 1M, 1Y and LIFE do.
- **Denied response:** the same shell with a nav link `← VOCA`, the h1 title and `LessonPaywall` (`data-kig-paywall="license"`), which contains:
  - badge `ALL-PASS ONLY` (for a STUDENT-only licence: `VIP ALL-PASS REQUIRED` and h2 `본 레슨은 VIP 올패스 전용 강좌입니다`);
  - h2 = the lesson title;
  - text `공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이 학습하실 수 있습니다.`;
  - buttons `🔑 이용권 코드 등록` and `🛒 구매 안내` (both open the licence modal);
  - link `← VOCA 전체 목록` and the note `1~2강은 무료로 상시 체험 가능합니다`.

  **Do not enter codes.** The denied response contains no words and no dictionary in its RSC payload.
- **Metadata:** paid lessons carry `robots: noindex, follow`; free lessons have no robots key. Canonical is `/phonics/<id>`.
- **Clip gate:** see §1.1. The 532 free keys cover the 60 words of mv1-01/02 plus the other free courses' texts. Every other VOCA clip returns 403 without the cookie.
- **Client gate on the list** (`LicenseProvider.tsx:279-308`, `CourseDashboard.tsx:463-464`): free = section 0 and lesson index < 2, i.e. mv1-01 and mv1-02.

---

## 9. Navigation and boundaries

- Titles (`curriculumPresentation.ts:181-206`):
  - `mv{s}-{nn}` → title `중등 단어 {s}단계 · {nn}회`, subtitle `Middle School Vocabulary Series {s}`, code `MV{s}-{nn}`
  - `hv-{nn}` → `고등 단어 · {nn}회`, `High School Advanced Vocabulary`, `HV-{nn}`
  - every VOCA lesson has badge `🎙️ 발음 채점`
- Prev/next follow the §1.3 order:
  - first lesson mv1-01: next only (mv1-02)
  - mv1-40 → mv2-01
  - mv2-40 → mv3-01
  - mv3-40 → hv-01
  - last lesson hv-75: prev only (hv-74)
- Client-side `Link` navigation between lessons should remount `PhonicsLearningView`, because the App Router keys page segments by parameter. The initial `selectedWord = useState(words[0])` (`:47`) depends on that remount. **Assert** after prev/next that the spotlight shows the new lesson's W[0] (R-26).
- Invalid ids return 404 through the proxy. Also try `/phonics/mv1-1` and `/phonics/hv-75-1`: both are absent from `validRoutes` and should return 404.
- The site search (`public/search-index.json`) has 195 phonics entries. Their `searchText` holds the id, title and generic words (`중등 고등 단어 어휘 단어장 보카 voca matrix`) but **no headwords**, so searching an English word will not find its lesson.

---

## 10. CDP driver recipe for one lesson `L`

Use the licensed profile copy. Record every storage change in `out/data-changes.md`. The existing helper `docs/qa-2026-09-15/scripts/verify/cdp.cjs` (`launch`, `Tab.open`, `tab.eval`, `tab.send`, `tab.events`) is usable as a tool.

### 10.0 Pre-compute from data (node, no browser)

- `rows`, `W`, `N`, `M(w)` (`dict[w] ?? dict[w.toLowerCase()]`), `S(w)`, `K(S(w))`, `K(cleanText(w))` for the top player.
- Etymology set: `PREFIX_RULES` exact lower-case match. Load `src/lib/vocaUtils.ts` with a TS transpile, as `generate-azure-ava.mjs:120-131` does, so the rules are never copied by hand.
- Collocation per word via `getCollocation(w, entry.searchWord)`.
- `pres.title`, prev/next ids and titles.
- Import `evaluatePronunciation` the same way to compute expected mic scores.

### 10.1 Browser setup

- Flags: `--autoplay-policy=no-user-gesture-required`, `--mute-audio`.
- `Network.enable`: record every `/audio/azure-ava/v1/*.mp3` and `/audio/phonics/*` request with its status.
- `Page.addScriptToEvaluateOnNewDocument` with:
  - A `HTMLMediaElement.prototype.play` wrapper that pushes `{src: this.src, rate: this.playbackRate, t: performance.now()}` to `window.__kigPlays`. Also hook `ended` and `error` through `addEventListener` on first play.
  - `speechSynthesis.speak` and `speechSynthesis.cancel` wrappers that push `{text: u.text, rate: u.rate}` to `window.__kigSynth`. Any entry there means a clip was missing or failed.
  - A fake recogniser, `window.SpeechRecognition = window.webkitSpeechRecognition = FakeRec`. `start()` fires `onstart` asynchronously and then, depending on `window.__kigMic = {transcript} | {error:"no-speech"|"not-allowed"|"network"} | {hang:true}`:
    - a transcript: an `onresult` event `{resultIndex:0, results:[Object.assign([{transcript}], {isFinal:true})]}` followed by `onend`;
    - an error: `onerror({error})` followed by `onend`.
    - `stop()` fires `onend`.
  - **Do not** patch `Math.random`. Read the DOM instead, because the product is random.
- Save and later restore `kig:progress:*`. Remove `kig:voca:leitner:phonics/L` and `kig:voca:speed_high:phonics/L` before the run.

### 10.2 Shell

1. Navigate to `/phonics/L`. Wait until body text contains `4단계 어휘 마스터리`, and assert there is no `[data-kig-paywall]`.
2. Assert `document.title === pres.title + " · K-IG 핵심 어학 마스터"`, h1 = `pres.title`, the `VOCA 목록` link, and the prev/next `aria-label`s (§9).
3. Header: `총 {N}단어`, `완전 마스터: 0개`, and (after the effect) `집중 복습 필요: {N}개`.
4. Top player: counter `1/{N}`, status `▶ 재생 버튼을 눌러 전체 듣기`, stop button disabled.

### 10.3 Step 1

1. Spotlight: word W[0], meaning M(W[0]), `글자 수: {W[0].length}자 · 표준 미국식 발음`. The etymology and collocation boxes are present exactly when expected, with exact texts.
2. Toolbar label `클러스터 선택 (6단어 단위):`, buttons `Cluster #1..#rows.length`, toggle `전체 {N}단어 펼쳐보기`.
3. For each r:
   - Click `Cluster #r+1`. Assert spotlight = rows[r][0], the panel `Word Cluster #{r+1}` shows `({rows[r].length}단어)`, and the cards (word and meaning, in order) equal the data.
   - Assert that no play was logged by this click.
4. Click `전체 {N}단어 펼쳐보기`. Assert the button reads `전체 펼쳐보기 닫기` and there are N cards across all panels in data order. **This is the 1:1 content check.**
5. For each card, in order:
   - Click it. Assert the spotlight shows w and M(w), and the etymology and collocation boxes match the data.
   - Within 2 s, `__kigPlays` ends with `…/audio/azure-ava/v1/{K(S(w))}.mp3` at rate 1. The network status is 200 or 206 (never 403/404), and nothing was added to `__kigSynth`.
   - Wait for `ended`, then assert the card lost the playing class.
   - Also run the next click once while audio is still playing, to test interruption.
6. Spotlight `🔊 발음 청취`: assert the text becomes `⏹️ 정지` while playing. Click again: it returns to `🔊 발음 청취` and the clip is paused.
7. Speed: click `0.8x` and play (rate 0.8), `1.2x` (rate 1.2), then back to `1x`.
8. Collocation words only: click `청취 🔊` and assert the phrase key was played.
9. Rows:
   - Click `▶ 이 행 6단어 연속 청취`. Assert the text `⏹ 이 행 재생 중지`, 6 plays in row order with gaps of ≥350 ms, then the text reverts.
   - Start again and click the stop button mid-row: playback stops and the text reverts.
   - **R-3 probe:** start a row and click the card that is currently playing. Record whether the row button stays `⏹ 이 행 재생 중지` while nothing plays.
   - **R-2 probe:** start a row and click collocation `청취 🔊`. Record the same.
10. `○ 마스터 체크`:
    - Text becomes `✓ 마스터 완료`; the header reads `완전 마스터: 1개` and `집중 복습 필요: {N-1}개`; storage `[lower(w)]` has `{box:3, streak:1}`.
    - Click again: back to `○ 마스터 체크`, box 1, streak 0.
11. Select word index k (e.g. W[4]). Click `이 단어로 Step 2 액티브 인출 퀴즈 풀기`: Step 2 shows `Question #{k+1} / {N}`, score 0.

### 10.4 Step 2 (full run from #1)

1. If a partial run from step 10.3.11 is active, complete it first and assert the heading `{N-k}문항 풀이 완료 (전체 {N}문항)`. Then click `처음부터 다시 풀기 ↺`.
2. For q = 1..N, with w = W[q-1]:
   - Type: en-to-ko for odd q (kicker `영단어 ➔ 올바른 한국어 뜻 인출`, big text w, a `🔊` button). ko-to-en for even q (kicker `한국어 뜻 ➔ 올바른 영단어 인출`, big text M(w), no `🔊`).
   - Prompt: `"{w}" 의 가장 알맞은 한국어 뜻은 무엇일까요?` or `[ {M(w)} ] 에 해당하는 올바른 영단어를 고르세요.`
   - Options: 4 distinct texts with labels `A.`..`D.`, exactly one equal to the expected answer.
     - en-to-ko: the other 3 are meanings of other lesson words, all ≠ M(w).
     - ko-to-en: the other 3 are lesson words ≠ w whose meaning ≠ M(w).
     - Also flag any option that shares a sense segment with the answer (the R-7 pairs).
   - On en-to-ko questions, click `🔊` once and assert key K(S(w)).
   - Answer policy: correct for q in {1,2,3} (so the streak badge `🔥 2 Streak!` shows on #3 and `🔥 3 Streak!` on #4), wrong for q=4, then alternate. A wrong answer clicks the first option ≠ expected.
   - After each click:
     - All 4 buttons are disabled. The correct option has `✓`; a wrong pick has `✗`.
     - Feedback header is `💡 기억 각인 힌트 & 어원 풀이` if w has etymology, otherwise `✅ 정답 확인`. Body is the rule text or `{w} = {M(w)}`.
     - `Score: {expected} pts`.
     - Storage card = `updateLeitnerCard` applied to the previous card.
   - Button `다음 문제 풀기 →`, or `결과 보기 →` when q = N.
3. Results:
   - `{N}문항 완료`, `최종 점수` = the expected total, `{correct} / {N}`, `틀린 단어 {k}개` with each wrong word and M(w) in the order missed.
   - Click `처음부터 다시 풀기 ↺`: `Question #1 / {N}`, `Score: 0 pts`. Assert the options for #1 are **identical** to the first run (R-8 evidence).
4. Promotion: do 3 all-correct runs (or 2 more after the first). Step 3 then shows `Box 3 마스터 ({N})`.
5. Also test `Step 3 오답노트 복습하러 가기 →` from the results screen.

### 10.5 Step 3

1. `선택 단어:` shows the current selected word. The tester button reads `"{w}" 발음 테스트`.
2. Mic tests:
   - Set `__kigMic={transcript:S(w)}` and click. Expect the button `100점 (🌟 모든 단어 일치 (Excellent!))`, `단어 일치 {n}/{n}`, `인식된 내 음성:` `"{S(w)}"`, one green span per word, and the feedback text.
   - Set `__kigMic={transcript:"xyz"}` and click `↺ 다시 녹음`. The score must equal `evaluatePronunciation("xyz", S(w))`, with the matching label and colour.
   - `{error:"no-speech"}`, `{error:"not-allowed"}` and `{error:"network"}` must show the exact messages from §4.4.
   - `{hang:true}`: the button reads `듣고 있는 중... (말씀하세요)`, the panel shows `지금 영어로 말씀하세요...`, and clicking `완료` ends listening.
   - Unsupported: open a separate page load where the fake deletes both constructors. The message must be the §4.4 string. With a UA override containing `KAKAOTALK`, expect the Kakao message and `🌐 Chrome으로 열기`. Do not click it.
   - For the 13 bracket lessons: transcript = the spoken form must score 100. Also record the score for the British spelling.
   - **R-6 probe:** after a result for word A, click a Leitner card for word B. Record whether the tester still shows A's score.
3. Leitner:
   - Counts: `전체 ({N})`, `Box 1 집중복습 ({b1})`, `Box 2 친숙 ({b2})`, `Box 3 마스터 ({b3})` match storage.
   - Each filter shows exactly the cards with that box, in data order. Each card's word, meaning, badge text and `{streak}회 연속 정답` match storage and data.
   - Card click and `🔊 발음`: play key K(S(w)), and the selection changes (`선택 단어:`).
   - `다음 Box로 승급 ↑`: box 1→2→3, then the text is `Box 1로 내리기` → 1. Streak unchanged in storage (**R-5 evidence**).
   - Then answer w correctly once in Step 2 (use the CTA). Record whether the card jumps straight to Box 3.
4. Reload the page. Assert the boxes and streaks persist, and the header counts match.

### 10.6 Step 4

1. Intro: exact texts, and no `🏆` line on a fresh profile.
2. Click `도전 시작하기 (60초 타이머) ⚡`. Assert `⏳ 60s`, `Score: 0`.
3. Answering loop. For each item, read the word and the meaning text (strip `= `). Expected is `⭕ 일치 (맞음)` if the meaning equals M(word), otherwise `❌ 불일치 (다름)`.
   - Answer 5 correctly. After each, the score follows `100n+5n(n+1)`, the `🔥 {c} COMBO!` badge shows from c = 2, and `kig:voca:speed_high:phonics/L` equals the running score once it beats the stored best.
   - Answer 1 wrong: the combo disappears and the score is unchanged.
   - Continue until N+3 answers. Assert that item N+i repeats item i (word, displayed meaning).
   - Flag any displayed "non-match" meaning that shares a sense segment with M(word) (R-7).
4. Leave it idle until the timer ends (at most 60 s). Assert `타임오버! 훈련 완료`, `최종 점수`, `최대 콤보` = 5 (or the best), `정답 / 오답` = `{c} / {w}`.
5. `다시 도전하기 ↺`: 60 s, score 0, same first item (R-8). Test `Step 3 오답노트 복습하러 가기 →`.
6. Reload the page and open Step 4: `🏆 현재 레슨 최고 점수: {best} pts`.
7. **R-9 probe:** start the game, click `Step 1`, wait 61 s, click `Step 4`. Record whether the game-over screen shows.

### 10.7 Bottom nav, top player, bookmark and complete, navigation

1. Bottom nav: at Step 1, `← 이전 Step` is disabled. `다음 Step →` ×3 reaches Step 4, where it is disabled. `← 이전 Step` goes back. `목록으로` leads to `/phonics`.
2. Top player:
   - Click `재생`. Plays follow in order with keys `K(cleanText(w))`, and the counter advances. Test `다음` / `이전` (index ±1), `일시정지` (status `⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기`) and resume, `정지`, `0.8×` (`aria-pressed`), and range scrub.
   - **R-1 probe** on the 13 bracket lessons: the display key must not be 404/403 and no synth utterance of `colo(u)r` should appear. Record status, and whether the queue stops.
   - **R-4 probe:** click a word card, then immediately read the top player. Record whether it shows `일시정지` and `🔊 음성 읽는 중…`, and whether pressing it pauses the word instead of starting the queue.
   - Space-key probe: focus a Step 2 option button and press Space. Record whether the player toggled and whether the option was chosen (R-12).
3. `북마크` → `북마크됨` (`aria-label` `북마크 해제`), and `kig:progress:bookmarks["phonics:L"] === true`. On `/phonics`, open the section and assert the card star `★`; the `★ 북마크 (n)` filter lists L. Toggle back.
4. `완료 체크` → `학습 완료`, and `kig:progress:completed["phonics:L"]`. On `/phonics`, assert `✓ 완료`, `학습 진도율: {+1}`, and `미완료 ({-1})`. Toggle back and restore.
5. `kig:progress:recent.lessonId === L`.
6. Click `다음 강의`: the URL is next(L), h1 is next's title, and the spotlight shows next's W[0] (R-26).
7. Console: no uncaught exceptions. Only the expected 4xx.

### 10.8 Covering all 195 lessons

For every lesson, run 10.2, 10.3 steps 1–5 (all cards: data 1:1 plus one clip per word), 10.4 (one full mixed run), 10.5 step 3 (grid 1:1) and 10.6 steps 2–4 (≥N+3 answers plus the timeout).

The 60-second timer dominates the run time: 195 × ~75 s ≈ 4 h serial. Use parallel profile copies.

Run the full R-probes on the free lessons, on hv-01 (etymology and collocation), hv-75 (11 words), mv1-10 (bracket) and mv3-08 (R-7 pair almost/nearly).

---

## 11. What cannot be automated, and why

- **Real microphone speech recognition.** The browser recogniser needs a real microphone and Google's service; headless Chrome has neither a working recogniser nor audio input. The UI and scoring can be exercised with the fake recogniser, but whether a real learner's pronunciation is recognised, and how scores feel, needs a human on Chrome desktop or Android and on iOS Safari.
- **What the clip actually says.** CDP can prove that the right URL was fetched (200/206) and that `ended` fired. It cannot hear whether the Ava clip says the right word, for example `color` rather than `colo-u-r`. That needs a person listening, or offline speech-to-text on the downloaded MP3s.
- **iOS/Safari and KakaoTalk in-app behaviour.** This covers the audio unlock (`unlockMobileAudio`), WebView media rules, the `intent://` and `kakaotalk://web/openExternal` hand-offs, and the Web Speech fallback voices. A UA override only changes the branches; the real WebView is needed.
- **Browser TTS fallback quality.** Which voice speaks when a clip is missing depends on the device.
- **Perceived timing and animation.** The gold highlight, `animate-pulse`, 350 ms row gaps and `transition-all duration-1000` of the timer bar are visible to people but only loosely assertable.
- **Seeing whether options are fair.** The randomness can be observed but not controlled without patching `Math.random`, which changes the product. Judging whether a distractor is a real synonym is a content decision (Phase 7).
- **Real 60-second waits.** These are automatable but costly; virtual time (`Emulation.setVirtualTimePolicy`) would bypass the real interval and is not recommended for evidence.

---

## 12. Suspicious code (possible defects). NOT VERIFIED; each needs a live check

- **R-1** `src/app/[course]/[lesson]/page.tsx:459-462` with `AudioPlayer.tsx:79-87`. The top "play all" player sends bracket headwords without `vocaSpeechForm`, so it requests display-form clip keys (§6.2 table) that `generate-azure-ava.mjs:315` never generates. Possible outcomes:
  - a stale pre-RE-005 clip that reads the brackets aloud;
  - a 404, after which the browser TTS reads `colo(u)r`;
  - in KakaoTalk or on voiceless devices, the stream fallback fails too and the whole queue stops at that word (`speech.ts:1170-1176`).

  Affects 13 lessons: hv-38, hv-41, hv-44, hv-56, mv1-10, mv1-23, mv1-34, mv1-37, mv3-01, mv3-08, mv3-12, mv3-13, mv3-14.
- **R-2** `PhonicsLearningView.tsx:640-645`. The collocation `청취 🔊` calls `speakText` directly. During row playback it invalidates the row's pending `onEnd` (token bump), but `rowPlayingRef` and `activeRowIdx` stay set. The row button can stay on `⏹ 이 행 재생 중지` with nothing playing, and a word card stays highlighted.
- **R-3** `PhonicsLearningView.tsx:132-137`. `playWord` checks `activeWord === word` before `rowPlayingRef`. Clicking the word that is playing inside a row calls `stopSpeech()` without `stopRowPlayback()`, leaving the row stuck in the same way.
- **R-4** `AudioPlayer.tsx:56-65, 200-201` with `speech.ts:780, 1025`. The top player reads the global speech snapshot, so single-word playback from the VOCA view makes it show `일시정지` and `🔊 음성 읽는 중…`. Pressing it then pauses the word instead of starting "play all". Starting the top queue during a row also strands the row state (as R-2).
- **R-5** `PhonicsLearningView.tsx:1203-1211`. The manual box button changes only `box`. `streak` and `lastTestedAt` are untouched. A card demoted from Box 3 keeps `3회 연속 정답` and returns to Box 3 after a single correct quiz answer (`vocaUtils.ts:476-483`). This is inconsistent with `setLeitnerMastery`, which resets the streak.
- **R-6** `PhonicsLearningView.tsx:1067-1070` with `VoiceSpeakingTester.tsx:29`. The tester has no `key={selectedWord}`, so the previous word's result, score label and transcript stay on screen after another word is selected.
- **R-7** `vocaUtils.ts:282, 330, 434`. Distractors are excluded only on identical meaning strings. The 17 in-lesson pairs listed in §2 share a sense, so a correct choice can be marked wrong:
  - ko-to-en `[ 거의 ]` may offer `nearly`;
  - en-to-ko `almost` may offer `거의, 하마터면`;
  - the speed drill may show `almost = 거의, 하마터면` and expect `불일치`.
- **R-8** `PhonicsLearningView.tsx:220-222, 304-306, 279-289, 345-355`. Quiz options and speed items are generated once per mount. `처음부터 다시 풀기` and `다시 도전하기` replay the identical option order and match flags, and the speed drill repeats the same N items in a loop within the 60 s.
- **R-9** `PhonicsLearningView.tsx:328-343, 516-520`. The speed timer keeps running after leaving Step 4; the tab click only stops row audio.
- **R-10** `PhonicsLearningView.tsx:81, 451-455, 856, 1108`. Untested words start in Box 1. The header says `집중 복습 필요: 30개` on a first visit, and the Step 2 result claims wrong words are in Box 1 even though Box 1 also holds every untested word. No logic uses `lastTestedAt`, despite the "망각곡선" labels (no review schedule).
- **R-11** `PhonicsLearningView.tsx:775-790, 1160-1171`. Word cards and Leitner cards are `<div onClick>` with no role, tabIndex or key handler. The Step 1 grid cannot be used from the keyboard.
- **R-12** `AudioPlayer.tsx:182-198`. The window-level Space handler calls `preventDefault` and toggles the top player whenever focus is not in a text field. Space on a focused VOCA button (quiz option, `일치`) may toggle audio instead of activating the button.
- **R-13** `PhonicsLearningView.tsx:950-957, 466-479, 514-526, 985-1003`. Accessibility gaps:
  - the quiz `🔊` has only `title`, so its accessible name is the emoji;
  - the speed buttons have no `aria-pressed`;
  - the tabs have no `role="tab"`/`aria-selected`;
  - correct and wrong are shown only by colour and a ✓/✗ glyph, with no live region;
  - the timer is not announced.
- **R-14** `PhonicsLearningView.tsx:562`. `글자 수: {length}자` counts brackets, periods and spaces (`colo(u)r` 8자, `Mr.` 3자, `living room` 11자).
- **R-15** `src/lib/courses.ts:58`. The course description says `중등 1~4단계부터 고등 심화까지`, but only three middle-school series exist. `curriculumPresentation.ts:84` maps a non-existent `중등04`.
- **R-16** `vocaUtils.ts:138-141, 235-237`. The comments say 46 rules and 3,877 headwords; the data has 45 rules and 3,904 dictionary keys. The comments are stale; this is not a runtime issue.
- **R-17** `vocaUtils.ts:192-197`. The `recover` collocation was kept even though its etymology was removed as wrong. Its example sentence uses `recovery`, not the headword (hv-02). Content check.
- **R-18** `PhonicsLearningView.tsx:100`. The fallback meaning `"단어"` is also the real meaning of the headword `word`. Currently 0 words fall back (verified), so this is latent.
- **R-19** `PhonicsLearningView.tsx:76, 214`. `dictMap` and Leitner keys are lower-cased, so a lesson holding both `May` and `may` (or Miss/miss, March/march) would merge them into one card and one meaning. There are 0 such lessons now (verified); latent.
- **R-20** `PhonicsLearningView.tsx:1244`. The copy says `0.5초 만에 판단하세요`, but there is no per-item time limit. Speed-drill answers never feed the Leitner boxes, although the game-over CTA points to `Step 3 오답노트`.
- **R-21** `PhonicsLearningView.tsx:368-377`. The high-score write happens inside a `setSpeedScore` updater (a side effect) and compares against the closure `speedHighScore`. Low risk.
- **R-22** `page.tsx:459-462`, `AudioPlayer.tsx:62-63`. VOCA shows two independent speed controls (`1x` in the view, `1×` in the top player). The top player's label is absent, so its purpose ("play all 30 words") is not labelled.
- **R-23** Data: all 195 lesson files carry legacy `instruction`, `choice` (`1 번`…`5 번`) and `dictation` (10 rows) blocks that are never rendered. If they were meant as exercises, they are silently dropped. Phase 4 comparisons should ignore them.
- **R-24** `public/search-index.json`: the VOCA entries contain no headwords (§9).
- **R-25** `vocaUtils.ts:367-402`. `generateClozeQuestions` is dead code (no caller).
- **R-26** `PhonicsLearningView.tsx:47`. `selectedWord` is initialised only once. If a client-side prev/next navigation ever reused the component instance, Step 1 and Step 3 would show a word from the previous lesson. Expected to remount; assert it.
- **R-27** `speechRecognition.ts:164-167, 218`. A partial (Levenshtein-1) match is painted green in the word list but not counted in `matchedCount`. The card can therefore show a green word with `단어 일치 0/1` (e.g. `colour` against `color`).
