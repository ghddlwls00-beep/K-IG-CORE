# STUDENT course — feature map for the 2026-09-18 audit

The same agent (Claude) wrote this map and checked it. Nobody reviewed it independently.

- **How it was made:** by reading source at `main` = `9d6e15d`. The counts in §2 come from node one-liners run over `content/`. The dictation and scoring results in §5 come from transpiling the app's own `src/lib/listeningUtils.ts` and `src/lib/speechRecognition.ts` in memory and running them over all 402 sentences.
- **What was not done:** no browser was opened.
- **How to read §12:** every item there is a reading of the code that has **not been verified** on production.

Audit licence = **LIFE** (see `docs/qa-2026-09-18/README.md`, `scripts/lib/profile.cjs`). This matters a lot for STUDENT, because LIFE skips the sequential chapter lock everywhere (§8). As a result, the lock itself **cannot be exercised with the audit profile** (§11).

---

## 1. Routes & data sources

| URL | File | Notes |
|---|---|---|
| `/student` | `src/app/[course]/page.tsx` (no `src/app/student/page.tsx`) | Course dashboard → `CourseDashboard` (`src/components/CourseDashboard.tsx`). |
| `/student/<id>` | `src/app/student/[lesson]/page.tsx` | The static `student` segment beats `[course]`. The page gates access itself and then renders `LessonPage` from `src/app/[course]/[lesson]/page.tsx` (:135-139). `[course]/[lesson]` `generateStaticParams` excludes student (:23-25). |
| `/t/students` | `src/app/t/[tab]/page.tsx` | Tab landing (tab slug `students`, label `STUDENT`, `src/lib/tabs.ts:25-32`). |
| `GET/POST /api/progress/student` | `src/app/api/progress/student/route.ts` | Server progress (R2, encrypted). Requires a licence session cookie. |
| `GET /api/student/chapter-audio?chapter=N` | `src/app/api/student/chapter-audio/route.ts` | Sentence playlist for the chapter "continuous play" bar. |
| `POST /api/admin/student-progress` | `src/app/api/admin/student-progress/route.ts` | Admin only (reset / setChapter / setLesson). **Audit must not call it.** |
| `/audio/azure-ava/v1/<key>.mp3` | media route + `src/lib/mediaAccess.ts:86-91` | The only audio STUDENT actually plays (§6). |
| `/audio/student/<id>-<k>.mp3` | `src/lib/mediaAccess.ts:93-112` | The legacy recordings. Referenced in lesson JSON but **never requested by the STUDENT UI** on production (§6). |

Unknown ids are rejected by `src/proxy.ts` (allow-list `src/lib/generated/validRoutes.json` → `lessons.student`, 82 ids `s1-1` … `s20-5`). The old chapter-index pages `/student/s1` … `/student/s5` are gone, so they should 404.

### 1.1 `content/courses/student.json`
Keys are `course` ("student"), `tab` ("students"), `lessonCount` (82), `groups`, and `lessons`.

- **`groups[]`:** 20 entries of `{ title, lessons: string[] }`.
  - **NOTE:** the key is **`title`**, not `label`. `LessonGroup` in `src/lib/types.ts:275-279` declares `label`.
  - `[course]/page.tsx:118` reads `g.label || g.title`. `studentProgress.ts:272` and `chapter-audio/route.ts:97` read only `group.label` (§12 #2).
- **`lessons[]`:** 82 `LessonSummary` of `{ id, title, label, series:"s", variant:"main", unit, part, order, hasAudio, menuLabel }`.

### 1.2 `content/lessons/student/<id>.json` (82 files)

**Top-level fields:**

| Field | Value |
|---|---|
| `id`, `course`, `series` | `"s"` |
| `variant` | `"main"` |
| `pairId` | null |
| `title` | e.g. `"Greeting (인사말)"` |
| `label` | e.g. `"Chapter 1. Self-introduction (자기소개)"` |
| `menuLabel` | e.g. `"1-1. Greeting"` |
| `unit` | chapter number |
| `part` | position within the chapter |
| `order` | stale, unused (§2) |
| `audio[]` | `{src:"/audio/student/s1-1-1.mp3", legacySrc, autoplay:false}` |
| `video` | `[]` |
| `blocks[]` | see below |
| `legacyPath`, `legacyEncoding`, `legacyFlash` | legacy trace fields |
| `chunkDrills[]` | `{ko, en}`; never rendered for STUDENT (§12 #12) |

**`blocks[]`**, always in this order:
1. `{type:"instruction", text}`. The text is always exactly `` `${label} - ${title}` `` (verified for all 82).
2. **Exactly one** `{type:"sentences", items:[{n:"1", text}, …]}`. `n` is always `"1".."N"` in order.
3. N × `{type:"paragraph", lang:"ko", text}`. Korean paragraph *i* is the translation of sentence *i*.

For every lesson, the number of English sentences equals the number of Korean paragraphs (verified). There are no other block types and no non-ko paragraphs.

**Rendered data, one-to-one:**
- English sentence i = `blocks.sentences.items[i].text`, rendered **verbatim**. Curly `’ “ ”` and parentheses are kept.
- Korean i = `paragraph(lang=ko)[i].text.trim()`.
- The page h1 is `` `Part ${part} · ${title}` ``, where part comes from the id (`curriculumPresentation.ts:263-274`).
- The header h2 is the instruction text.
- The subtitle / card subtitle is `label`.
- The card code is `` `Ch ${chapter}-${part}` ``.
- The card badge is `🎙️ 실전 회화`.

---

## 2. Counts & id sequences (computed with node)

- 82 lessons, 20 chapters. Index `lessons[]` = union of `groups[].lessons` = files on disk = `validRoutes.lessons.student`. No gaps and no duplicate ids. Every `L.id === filename`, every `unit === chapter`, and every `part` matches its position in the chapter.
- **402 English sentences, 402 Korean paragraphs** in total. There are 1,640 `audio[]` references and 1,050 `chunkDrills`.

| Ch | Group title (`student.json`) | Lessons | Required to unlock (`max(1,ceil(n*0.8))`) + last lesson | Sentences (per lesson) |
|---|---|---|---|---|
| 1 | Chapter 1. 자기소개 (Self-introduction) | 6 | 5 + s1-6 | 22 (s1-1:3 s1-2:4 s1-3:5 s1-4:3 s1-5:3 s1-6:4) |
| 2 | Chapter 2. 가족 소개 (Family Introduction) | 6 | 5 + s2-6 | 30 (2,3,7,9,4,5) |
| 3 | Chapter 3. 친구 소개 (Friend Introduction) | 4 | 4 (all) | 22 (3,9,8,2) |
| 4 | Chapter 4. 친척 소개 (Relative Introduction) | 6 | 5 + s4-6 | 23 (2,3,5,4,3,6) |
| 5 | Chapter 5. 학교 갈 준비 및 학교생활 (…) | 5 | 4 + s5-5 | 23 (4,7,3,4,5) |
| 6 | Chapter 6. 우리 학교 선생님 (My School Teacher) | 4 | 4 | 27 (6,6,7,8) |
| 7 | Chapter 7. 학원 생활 (At the Academy) | 3 | 3 | 16 (5,4,7) |
| 8 | Chapter 8. 방과 후와 집에서의 일상 (…) | 4 | 4 | 20 (4,5,6,5) |
| 9 | Chapter 9. 나의 하루 일과 (…) | 3 | 3 | 22 (7,6,9) |
| 10 | Chapter 10. 평일 일과 (…) | 5 | 4 + s10-5 | 22 (3,4,5,6,4) |
| 11 | Chapter 11. 주말 일과 (…) | 4 | 4 | 21 (5,3,7,6) |
| 12 | Chapter 12. 방학 생활 (…) | 4 | 4 | 23 (6,6,6,5) |
| 13 | Chapter 13. 내가 존경하는 인물 (…) | 3 | 3 | 13 (4,4,5) |
| 14 | Chapter 14. 나의 미래 꿈 (교사) (…) | 3 | 3 | 16 (4,7,5) |
| 15 | Chapter 15. 내가 흠모하는 인물 (거스 히딩크) (…) | 3 | 3 | 13 (5,4,4) |
| 16 | Chapter 16. 또 다른 장래희망 (통역사) (…) | 3 | 3 | 18 (6,7,5) |
| 17 | Chapter 17. 한국의 역사 (History of Korea) | 4 | 4 | 21 (7,4,6,4) |
| 18 | Chapter 18. 한국의 전통 명절 (…) | 3 | 3 | 15 (4,6,5) |
| 19 | Chapter 19. 한국의 문화 (Korean Culture) | 4 | 4 | 17 (s19-1:3 s19-2:3 **s19-3:4** s19-4:7) |
| 20 | Chapter 20. 한국의 명소 (Famous Places in Korea) | 5 | 4 + s20-5 | 18 (2,2,3,5,6) |

**Oddities (data only):**
- **s19-3 is restored.** It has 4 sentences and 4 Korean paragraphs (title "Traditional Food (Bulgogi) (전통 음식 (불고기))") and 4 audio refs. The comment at `StudentLearningView.tsx:469-471` ("s19-3 is paragraphs only") is stale.
- **`order` field in the lesson files** has gaps at 7, 14, 19 and 26, and **80 is used twice** (s19-3 and s19-4). It disagrees with the index `order` from s2-1 onwards (the index runs 1..82). `order` is not read anywhere in `src/` (grep `.order` finds nothing). Navigation uses array order.
- **`audio[]` count ≠ sentence count** for 80 of 82 lessons. It is usually sentences+k and is legacy-cut, not sentence-aligned. **s10-4 and s10-5 have `audio: []`.** None of this affects the UI (§6).
- **Title language order differs.** Dashboard chapter headers read "Chapter 1. 자기소개 (Self-introduction)" (group title), while card subtitles and lesson instructions read "Chapter 1. Self-introduction (자기소개)" (lesson label).
- **Parentheses in English sentences: 25.** Placeholders or alternatives:
  - `(sir/ma’am)`, `(apartment name)`, `(school name)`, `(10)`, `(3, 4 or 5)`, `(4)`, `(School Name)`, `(names)`, `(name)`, `(two)`, `(uncle’s name)`, `(friend’s name)`, `(Club’s Name)`, `(Surname)`, `(age)`, `(Name)`, `(gray, black, white)`, `(biting his/her nails, …)`, `(green, red, …)`, `(red tie, …)`, `(bulgogi)`, `(sports)`, `(sports players)`, `(Happy)`, `(name) and (name)`, `(about 6,400 feet)`.
  - Found in s1-1#1, s1-2#2-4, s1-6#3, s2-2#2, s2-5#1, s3-2#3,#5, s4-3#1-2, s4-5#1, s5-5#3, s6-1#6, s6-2#2-3, s6-3#1,#4-6, s8-3#4, s8-4#3, s11-1#2, s16-1#1, s20-5#6.
- **Parentheses in Korean: 18 paragraphs.** s1-2#2-4, s2-2#2, s2-5#1, s3-2#3,#5, s4-5#1, s5-5#3, s6-2#2-3, s6-3#1,#4,#6, s8-3#4, s16-1#1, s20-3#1, s20-5#6.
  - **Mismatch:** s1-6#3 and s4-3#1-2 have English placeholders `(3, 4 or 5)` / `(two)`, but the Korean has no parentheses.
  - s2-5#1 English `(School Name)` vs Korean `(한국)`.
- **Slashes in 35 English sentences.** Mostly `He/She`, `his/her`, `him/her`, `her/him` (s6-3#7), `brother/sister`, `Mr./Ms.` (s6-2#2), `sir/ma’am`.
- **Curly apostrophe `’` in 25 English sentences.** Curly double quotes appear in s8-1#2 (`“Mom! I’m home,”`).
- **Numbers with commas:** s17-1#2 `5,000`, s17-3#1 `1,000`, s20-5#6 `2,000` / `6,400`. Times with colons: s5-3#1, s5-4#1, s9-1#1,#5, s9-2#1,#4, s9-3#9, s11-3#4.
- **No duplicate English sentence text** across the course.

---

## 3. Components (file:line)

| Concern | File:line |
|---|---|
| Student route gate | `src/app/student/[lesson]/page.tsx:82-139` (free :95, chapter from id :96, LIFE bypass :105, progress read :108-109, paywall :115-133) |
| Shared lesson shell | `src/app/[course]/[lesson]/page.tsx`: access recheck :148-159; audio dedupe :227; top AudioPlayer suppressed for student :248-250 and :356; nav :264-326; `LessonActionButtons` :273-278; prev/next :281-325; h1 :328-332; `LessonBody` :368-384 (passes `audioTracks=audio`, `chunkDrills`); `LessonStepNavigation` :398 |
| Course switch | `src/components/LessonBody.tsx:43-46` (dynamic import), :193-201 (student early return, so chunk drills :549-600 are never reached) |
| Learning view | `src/components/StudentLearningView.tsx` (1,258 lines; map in §4) |
| Mic tester | `src/components/VoiceSpeakingTester.tsx` (+ `src/lib/speechRecognition.ts`) |
| Dictation engine | `src/lib/listeningUtils.ts:241-243` `dictationWords`, :251-253 `soundAlikeForm`, :276-309 `expandSlashAlternatives`, :320-393 `generateWordBank`, :398-408 verify |
| Speech engine | `src/lib/speech.ts` (queue :1110-1180, unified clip :755-841, synthesis :845-927 (watchdog :912-926), stream :708-752, stop :1223-1233, pause/resume :1240-1316, visibility/pagehide stop :257-263) |
| Clip key | `src/lib/unifiedSpeech.ts:4-15` normalize, :21-35 key, :37-39 path, :42-47 `shouldUseUnifiedSpeech` (true on every non-CNN path) |
| Progress (client) | `src/components/ProgressProvider.tsx` (keys :42-45, flush :69-88, queue :90-113, restore :116-138, server overwrite :140-158, legacy migrate :168-187, toggleComplete :196-215, bookmark :224-236, recordRecent :238-258) |
| Licence (client) | `src/components/LicenseProvider.tsx` (`isUnlocked` :279-308, student branch :295-299; progress fetch :245-263; reload after verify :193-201) |
| Progress (server) | `src/lib/studentProgress.ts` (record :17-30, sanitize :144-174, chapters :254-287, recalc :289-295, update :301-365 with reachable guard :326/:337/:348, legacy merge :376-396, unlock check :416-424) |
| Progress API | `src/app/api/progress/student/route.ts` (rate limit :19-36, GET :49-59, POST :61-105) |
| Chapter audio API | `src/app/api/student/chapter-audio/route.ts:19-110` |
| Chapter audio bar | `src/components/ChapterAudioBar.tsx:51-331` |
| Dashboard | `src/components/CourseDashboard.tsx` (card :28-174, dashboard :176-493, ChapterAudioBar :447-454) |
| Paywall | `src/components/LessonPaywall.tsx:15-137` |
| Bookmark + recent | `src/components/LessonActionButtons.tsx:17-44`. No completion button for student (:46-47). |
| Bottom step nav | `src/components/LessonStepNavigation.tsx:6-89` |
| Free list | `src/lib/license.ts:72-73` (`student: ["s1-1","s1-2"]`), :106-125 |
| Media gate | `src/lib/mediaAccess.ts:51, 86-112` |
| Presentation | `src/lib/curriculumPresentation.ts:263-274` |

**i18n:** every STUDENT string below is **hard-coded Korean** in JSX. `kig:lang` (`LanguageProvider.tsx:42`, dictionary `src/lib/i18n.ts`) does not change the STUDENT view, dashboard, paywall or chapter bar. The lesson page itself uses `T` only for the "not migrated" fallbacks, which STUDENT never hits.

**textContent note:** adjacent `<span>`s have no whitespace between them, so button `textContent` concatenates. For example, `<span>🔊</span><span>듣기</span>` gives `"🔊듣기"`. The strings below are given as **textContent**. Match with `includes()` or normalise whitespace.

---

## 4. Every view and control

### 4.0 Lesson page shell (`[course]/[lesson]/page.tsx`)

**Top nav (`nav[aria-label="강의 이동"]`):**
- Link `href="/student"`, textContent `"←STUDENT 목록"`.
- Bookmark button: aria-label `"북마크 추가"` / `"북마크 해제"`, text `"☆북마크"` / `"★북마크됨"`. It toggles localStorage `kig:progress:bookmarks["student:<id>"]`. Local only; no server write.
- Prev link: aria-label `` `이전 강의: Part N · <title>` ``, inner text `"이전 강의"` + title.
- Next link: aria-label `` `다음 강의: …` ``, inner text `"다음 강의"` + title.
- **Boundaries:**
  - s1-1 has no prev (grid-cols-1).
  - **s20-5 has only the prev link**, to `/student/s20-4` "Part 4 · Historic City of Gyeongju (역사의 도시 경주)". There is no next link, no course-complete screen and no certificate.
  - Chapter boundaries are crossed freely: s1-6 → next is s2-1. For a non-LIFE learner that page may render the progress paywall.

**Header:**
- `h1` = `Part <part> · <title>`.
- On mount, `LessonActionButtons` calls `recordRecent`:
  - localStorage `kig:progress:recent = {course:"student", lessonId, title:"Part …", courseTitle:"STUDENT", updatedAt}`;
  - **plus, with an active licence, it queues a server POST `{lastLessonId}`** (§7).
- No top AudioPlayer is shown for STUDENT (`page.tsx:248-250` and :356).

**Bottom (`nav[aria-label="학습 단계 이동"]`):**
- Buttons `"← 이전 Step"` / `"다음 Step →"` plus a link `"목록으로"` → `/student`.
- The Step buttons are found by scanning `main button` textContent for `/\bStep\s*(\d+)\b/`, so `maxStep` = 3.
- "이전" is disabled at step 1 and "다음" is disabled at step 3. They click the matching Step tab.

### 4.1 StudentLearningView header (`StudentLearningView.tsx:477-607`)

**Title and full-play button:**
- `h2` = instruction text (fallback `"STUDENT 실전 듣기·읽기 완성 훈련"`, :65-67).
- Description `p`: "분할 음원과 탭 딕테이션, 섀도잉 훈련을 통해 실전 회화 순발력과 귀를 틔워보세요."
- **Full play** (:493-504): text `"▶️전체 본문 듣기"`, which becomes `"⏹️전체 정지"` (red) while playing. No aria-label.
  - Click while idle: `stopAll()` then `playFullTts(0)`. The mp3 branch :268-288 is dead on /student because `shouldUseUnifiedSpeech()` is true.
  - `playFullTts` calls `playSentenceQueue(allSentences, {lang:"en", rate:speed, gap:350, onProgress→fullIdx, onEnd→fullMode none})`.
  - Expected: English clips 1..N are requested in order, and the counter reads `"1/N"`, `"2/N"`, …
  - Click while playing: `stopAll`, and the transport disappears.

**Transport** (only while playing, :507-539):
- `aria-label="이전 문장"` (⏮️): in TTS mode, `previousSentence()` restarts the queue at max(0, i-1).
- `aria-label="일시정지"` (⏸️) ↔ `aria-label="이어 듣기"` (▶️): `togglePauseSpeech()`. The label follows `speech.paused`.
- `aria-label="다음 문장"` (⏭️): the queue at min(N-1, i+1). **At the last sentence it restarts the last sentence** instead of ending.
- Counter span `` `${fullIdx+1}/${N}` ``, only in TTS mode.
- The aria-labels `"5초 뒤로"` / `"5초 앞으로"` exist only for the dead mp3 mode.

**Speed pill** (:542-557):
- Buttons `"0.85x"`, `"1x"`, `"1.2x"`. Default is 1x (bold / `bg-surface`).
- Changing speed restarts whatever is playing at the new rate, from the current sentence (full) or the same sentence (single). The speed is **not persisted**.

**Step tabs** (`nav[aria-label="학습 단계"]`, :562-606, three buttons in DOM order):
1. `"🎧Step 1. 블라인드 리스닝"`
2. `` `🧩Step 2. 탭 딕테이션 (${solved}/${N})` ``
3. `"🗣️Step 3. 섀도잉 & 낭독"`

The active tab has class `text-primary` plus `ring-1`. A click calls `switchMode`, which runs `stopAll()` (silences audio) and then sets the mode. Default is Step 1. The step is not persisted.

### 4.2 Step 1 — 블라인드 리스닝 (:612-772)

**Filter bar:**
- Label `"대본 가림막(Blind) 필터:"`. Hint (≥sm only) `"귀로 먼저 듣고 점진적으로 텍스트를 확인하세요."`
- Four buttons with exact textContent. The active one gets `bg-primary`.
  - `"🙈 모두 가림 (순수 리스닝)"` (`hidden`, default)
  - `"🔤 영어만"` (`en_only`)
  - `"🇰🇷 해석만"` (`ko_only`)
  - `"👁️ 전체 보기"` (`all`)

**Cards:** one per sentence i. Find them with `span` textContent `/^Sentence #\d+$/` → `.closest('.rounded-2xl')`.

**Badge:** `item.n` ("1".."N") and `"Sentence #i+1"`.

**Visibility** (:658-660): `revealed = revealedItems[i] || filter==="all"`, `showEn = revealed || filter==="en_only"`, `showKo = revealed || filter==="ko_only"`.

| Filter | English shown | Korean shown | Reveal button |
|---|---|---|---|
| hidden | only if revealed | only if revealed | yes |
| en_only | yes | only if revealed earlier (§12 #10) | no |
| ko_only | only if revealed | yes | no |
| all | yes | yes | no |

When English is hidden, the card shows a clickable dashed div. Its textContent is `"🎧귀로 먼저 듣고 소리를 떠올려보세요 (클릭 시 텍스트 확인)클릭하여 보기 👁️"`, and clicking it toggles `revealedItems[i]`.

**Controls per card:**
- **Listen** (:684-696): `"🔊듣기"` (title `"문장 듣기"`) → `"⏹️정지"` (title `"발음 정지"`, red) while this card's single English play is speaking.
  - Action: `startSentence(text, i, "en", false)` → `playSentenceQueue([text], {lang:"en", rate, gap:250})`.
  - Clicking again while speaking calls `stopAll()`.
- **Loop** (:698-711): aria-label `"한 문장 반복 듣기"` → `"반복 정지"`. Text `"🔁반복"` → `"⏹️정지"` (the label span is `hidden sm:inline`). Title `"한 문장 무한 반복 듣기"` / `"반복 정지"`.
  - Action: the same clip with `loop:true`, gap 600 ms, repeated until stopped.
- **Reveal** (:713-723, only in `hidden` filter): `"👁️ 확인"` ↔ `"🔒 가림"`. Toggles `revealedItems[i]`.
- **Korean** (:748-766, when `showKo && ko`): `p` = ko. The button reads `"🔈 해석"` (title `"우리말 해석 듣기"`) → `"⏹️ 정지"` (title `"해석 정지"`).
  - Action: `startSentence(ko, i, "ko", false)`, i.e. the Korean Ava clip.

**Highlight:** the card has `border-primary` plus `ring-2` while its English single/loop is playing **or** when full TTS `fullIdx === i`.

**State written:** none persisted. `revealedItems` and `scriptFilter` are memory only.

### 4.3 Step 2 — 탭 딕테이션 (:777-1046)

**Header:**
- `"🧩"`, `` `문장 ${idx+1} / ${N}` ``, and the badge `` `완료: ${solvedCount}개` ``.
- Stepper `"◀️ 이전"` (disabled at idx 0) and `"다음 ▶️"` (disabled at idx N-1). Both call `goToDictation`, which does `stopAll`, clears tiles and clears feedback.
- Progress bar width = `(idx+1)/N*100%`.

**Context row:**
- Label `"우리말 상황 맥락"`, then `p` = `koParas[idx]` (fallback `"문장의 소리를 듣고 어순대로 조립하세요."`).
- Korean play button: text `"🔈"` → `"⏹️"`, title `"우리말 힌트 듣기"`, no aria-label.
- `"🔊문장 듣기"` → `"⏹️정지"`: plays English sentence idx.
- `"🔁무한 반복"` → `"⏹️반복 정지"` (title `"무한 반복 청취"`): loops English sentence idx.

**Assembled area:**
- Label span `"조립된 문장 (클릭하면 다시 단어 보관함으로 돌아갑니다)"` plus the counter span `` `${selected} / ${correctWords.length} 단어` ``.
- Container = `labelSpan.parentElement.nextElementSibling`.
- When empty it shows `"👇 아래 단어 블록을 탭하여 들리는 순서대로 완성하세요"`.
- Each selected tile is a button with textContent `` `${word}✕` ``. Clicking it removes the tile and clears feedback.

**Word bank:**
- Label span `"단어 보관함 (단어를 탭하세요):"`. Container = `labelSpan.nextElementSibling`.
- Each tile button's textContent is exactly the word.
- A selected tile gets `disabled` plus `opacity-20`. Clicking an enabled tile appends it to the selection and clears feedback.

**Actions:**
- `"💡한 단어 힌트"` (:447-463): if `selected.length < correctWords.length`, appends the first unselected tile whose word equals (case-insensitive) `correctWords[selected.length]`. If no such tile remains (the learner used it out of order), nothing happens. Feedback is cleared.
- `"🔄 초기화"` (:1001-1007): clears the tiles. **It does not clear feedback** (§12 #6).
- `"✅정답 확인"` (:427-445):
  - 0 tiles → feedback `empty`.
  - Match against any accepted sequence → feedback `correct`, `solvedSentences[idx]=true` (persisted, §7), and the sentence is auto-played.
  - Otherwise → feedback `wrong`.

**Feedback banners:**
- `empty`: `div[role=status]` with textContent `"👇단어를 먼저 배열하세요. 아래 단어 보관함의 단어를 들리는 순서대로 탭하면 됩니다."`
- `correct`: `div[role=status]` containing `"🎉정답입니다! 올바른 소리와 어순을 정확히 청취하셨습니다."`, plus the button `"다음 문장으로 ➡️"` when idx < N-1. That button goes to idx+1.
- `wrong`: `div[role=alert]` containing `"⚠️어순이나 단어가 일치하지 않습니다. 다시 소리를 듣고 배열해보세요!"`, plus the button `"🔊 다시 듣기"`, which replays the sentence.

**Pills** (:1022-1044): one button per sentence with `title="문장 #k"`. The text is `"✓"` if solved (even if current), else `"k"`. The current pill has `bg-primary`, solved pills have `bg-emerald-500/15`. A click jumps to that sentence.

**Expected tiles (derive in Node with the app's own module, §10.1):** `generateWordBank(text)` returns:
- `acceptedWordSequences` = `expandSlashAlternatives(text).map(dictationWords)`;
- `correctWords` = `[0]`;
- `allTiles` = correctWords + the extra words needed by the other alternatives + **2 distractors**. The distractors are the first two of `["was","the","with","in","at","for","on","is","he","she","we","are","very"]` that are not in the sentence and not sound-alike. Measured distribution: {was,the} 274, {was,with} 100, others 28.
- The multiset is deterministic; the order is shuffled randomly (per mount, fixed while mounted, :395-398).

### 4.4 Step 3 — 섀도잉 & 낭독 (:1051-1216) and completion (:1218-1254)

**Banner:**
- `h3` `"동시 낭독 & 섀도잉(Shadowing) 실전 훈련"`.
- Text `"소리를 듣고 0.5초 뒤에 억양, 호흡, 강세를 그대로 따라 읽으세요. [마이크 발음 테스트]를 통해 내 발음의 정확도를 실시간으로 점검할 수 있습니다."`
- Box `"완료도"` / `` `${completedCount} / ${N}` ``.

**Cards** (English is always shown). Controls per card:
- **Check toggle** (:1103-1116): empty text, or `"✓"` when done. Title `"낭독 완료 체크"` / `"완료 해제"`. Toggles `completedSentences[i]` (persisted). The card gets `border-emerald-500/30` when done.
- `"Sentence #i+1"`.
- `"🔊낭독 가이드 듣기"` → `"⏹️정지"`: English single play.
- **Loop** (:1137-1150): aria-label `"반복 루프 섀도잉"` → `"반복 정지"`, text `"🔁반복"` → `"⏹️정지"`.
- **Mic** (:1152-1166): textContent `"🎙️발음 테스트"` (label hidden below sm), title `"마이크로 발음 테스트"`, **no aria-label**. Toggles `openMicTesters[i]`. The open state gets `text-primary font-bold`.
- English `p` = text. The Korean `p` plus `"🔈 해석"` / `"⏹️ 정지"` work as in Step 1.
- When the mic is open: `VoiceSpeakingTester` with `targetText=text`, `compact`, `buttonLabel="🎙️ 지금 따라 말하기 (발음 채점)"`, and `onSuccess(score)` → if `score >= 70`, `completedSentences[i]=true`. It never sets false.

**VoiceSpeakingTester** (`VoiceSpeakingTester.tsx`):
- **Unsupported** (`!window.SpeechRecognition && !window.webkitSpeechRecognition`): shows text `"(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)"`. In KakaoTalk / in-app browsers it instead says `"⚠️ 카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다."` plus the button `"🌐 Chrome으로 열기"` / `"🌐 Safari로 열기"`.
- **Idle:** button textContent `"🎙️지금 따라 말하기 (발음 채점)"`, title `"마이크를 누르고 영어 문장을 소리내어 말해보세요."`. A click creates a recogniser with `lang="en-US"`, `continuous=false`, `interimResults=true`.
- **Listening:** the button reads `"⏹️듣고 있는 중... (말씀하세요)"`. A panel shows `"실시간 음성 인식:"` plus the interim text (or `"지금 영어로 말씀하세요..."`) and a button `"완료"` that calls `stop()`.
- **Result:** the button reads `` `${score}점 (${ratingLabel})` ``, plus `"↺ 다시 녹음"` (title `"다시 말하기"`).
  - The card shows the score badge `` `${score}점` ``, the rating label, `` `단어 일치 ${matched}/${total}` ``, `"인식된 내 음성:"` plus the quoted transcript, `"단어별 발음 일치도:"` with word chips (green = matched, red strike-through = not), and `💡` plus the feedback.
  - Rating labels: ≥92 `"🌟 모든 단어 일치 (Excellent!)"`, ≥80 `"👍 대부분 일치 (Good!)"`, ≥60 `"💪 거의 맞았어요 (Almost!)"`, else `"다시 시도 (Try Again)"`. An empty transcript gives score 0 and `"음성 감지 안 됨"`.
- **Errors:**
  - `no-speech` → `"음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요."`
  - `not-allowed` / `service-not-allowed` → `"마이크 접근 권한이 거부되었거나 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요. (모바일 기기에서는 HTTPS 보안 연결이 필요할 수 있습니다)"`
  - anything else → `` `음성 인식 오류: ${error}` ``

**Completion section** (only in Step 3, :1218-1254):
- Kicker `"Step 3 학습 마무리"`. `h3` `"섀도잉과 낭독을 마쳤다면 이 강의를 완료하세요."`
- `p` `` `문장 연습 ${completed}/${N} · 받아쓰기 ${solved}/${N} · 완료 기록은 진도율과 다음 챕터 해금에 반영됩니다.` ``
- Precondition: `canComplete = lessonCompleted || solved+completed > 0 || N === 0` (:472). When it is false:
  - `p[role=status]` `"받아쓰기 정답 또는 낭독 완료 체크를 1개 이상 하면 완료할 수 있습니다."`
  - The button is `disabled`.
- **Button:** aria-label `"학습 완료 체크"` → `"학습 완료 취소"`. textContent `"○이 강의 학습 완료"` → `"✓학습 완료됨"` (emerald).
- **Action:** `toggleComplete("student", id)`, which writes local state and, with a licence, POSTs to the server (§7). Un-completing is allowed (canComplete includes lessonCompleted).

### 4.5 Course dashboard `/student` (`[course]/page.tsx` + `CourseDashboard.tsx`)

**Hero:**
- `"CORE TRACK"`, `"총 82개 정규 레슨"`, `"20개 단계 구성"`.
- `h1` `"STUDENT"`, description `"일상 회화로 마스터하는 실전 듣기와 정독 훈련."`
- Back link `"←홈으로 돌아가기"`.

**Progress card:**
- `` `학습 진도율: ${done} / 82개 완료 (${pct}%)` ``, where `done` counts `kig:progress:completed` keys starting with `student:` and `pct = round(done/82*100)`.
- **Sync line** (licence only): `"✓ 서버에 저장됨"` / `"진도를 서버에 저장하는 중..."` / `"연결 복구 후 자동 저장 예정"` / `"저장 실패 · 연결되면 자동으로 다시 시도합니다"`. Nothing is shown in the `local` state.
- **Filters:** `"전체 (82)"`, `"★북마크 (n)"`, `` `미완료 (${82-done})` ``. With no results the empty state reads `"아직 북마크된 레슨이 없습니다."` / `"조건에 해당하는 레슨이 없습니다."`, plus the button `"전체 레슨 목록 보기"`.

**Chapter accordion** (20; all collapsed by default, not persisted). Header `button[aria-expanded]` contains:
- `▶`, the group title, and `` `총 ${n}개 레슨` `` (+ `` `· ${k}개 완료` ``).
- A STUDENT status line:
  - no course access and chapter 1 → `"1·2강 무료 체험"`
  - chapter locked → `` `챕터 ${index} 완료 후 해금` ``, i.e. the previous chapter number
  - chapter complete → `"✓ 챕터 완료"`
  - otherwise → `` `진행률 ${pct}%` `` + `` ` · 해금 기준 ${requiredCount}강 + 마지막 강의` `` (the suffix only when server progress is loaded)
- A badge `"완료"` / `"학습 가능"` / `"🔒 잠금"`, and `"펼치기 ▼"` / `"접기 ▲"` (≥sm).

**ChapterAudioBar** (under each header, always visible):
- **Main button** aria-label:
  - locked: `` `챕터 ${n} 전체 듣기 잠김` ``
  - idle: `` `챕터 ${n} 전체 파트 듣기` ``
  - playing: `` `챕터 ${n} 전체 듣기 일시정지` ``
  - paused: `` `챕터 ${n} 전체 듣기 계속 재생` ``
- **Icon:** `🔒`, `•••` (loading), `Ⅱ` (playing) or `▶`.
- **Title:** `"무료 파트 연속 듣기"` (previewOnly = no course access and chapter 1), else `"챕터 전체 파트 듣기"`.
- **Sub-line:**
  - locked: `"챕터 해금 후 이용할 수 있습니다"`
  - loading: `"재생 목록을 준비하는 중..."`
  - playing / paused: `` `▶ 재생 중: 파트 ${partNumber}/${partCount} · 문장 ${sentenceNumber}/${sentenceTotal}` `` (or `일시정지`)
  - previewOnly: `"1·2강 연속 재생"`
  - otherwise: `` `${n}개 파트 연속 재생` ``
- While playing / paused, it adds a group with aria-label `"재생 속도"` and buttons `"0.85×"`, `"1×"`, `"1.2×"` (× is U+00D7, unlike the lesson view's "x"), plus a stop button aria-label `"챕터 전체 듣기 정지"`, text `"■정지"`.
- **Error** `p[role=alert]` shows the server error or `"음성을 재생하지 못했습니다. 네트워크 연결을 확인해 주세요."`
- **Playback:** `fetch('/api/student/chapter-audio?chapter=N')`, then `playSentenceQueue(items.map(text), {lang:"en", gender:"female", gap:380})`. The payload is cached per chapter in module memory. Starting one chapter resets any other chapter bar.

**Lesson cards** (inside an open chapter):
- Code `"Ch 1-1"` and badge `"✓ 완료"`.
- Lock badge `"🔒이전 챕터 완료 필요"` (licensed, sequential) or `"🔒STUDENT"` (no licence). Free badge `"무료 보기"` (no access and free).
- Badge `"🎙️ 실전 회화"`. Star button: aria-label `"북마크 추가"` / `"북마크 해제"` / `"잠긴 레슨은 북마크할 수 없습니다"` (disabled when locked).
- Title link `"Part 1 · Greeting (인사말)"` → `/student/s1-1`, then the subtitle (lesson label) and the id.
- Footer link:
  - `"학습하기→"` when unlocked
  - `"무료 보기→"` when free with no access
  - `"해금 조건 보기🔒"` when licensed but sequentially locked
  - `"수강권 열람🔒"` when there is no licence
- **Unlock toast** (non-LIFE only, when `unlockedThrough` increases): `` `🎉 챕터 ${n}가 열렸습니다.` ``, shown for 5 s.

### 4.6 Paywall (`LessonPaywall.tsx`, on `/student/<id>`)

- **`lockReason="license"`** (no valid session): `data-kig-paywall="license"`.
  - Badge `"STUDENT PASS ONLY"`, h2 `"본 레슨은 STUDENT 이용권 등록 후 학습하실 수 있습니다"` (the student route passes no title).
  - Text `"발급받으신 이용권 인증 코드를 등록하시면 STUDENT 과정을 제한 없이 학습하실 수 있습니다."`
  - Buttons `"🔑 이용권 코드 등록"` and `"🛒 구매 안내"`. **Both only open the licence modal.**
  - Footer: link `"← STUDENT 전체 목록"` and `"1~2강은 무료로 상시 체험 가능합니다"`.
  - Page nav link `"← STUDENT"`.
- **`lockReason="progress"`** (session valid, non-LIFE, chapter locked): no `data-kig-paywall`.
  - Badge `"순차 학습 잠금"`, h2 `` `챕터 ${chapter}은 이전 챕터 완료 후 열립니다` ``.
  - Text `"현재 학습 중인 챕터의 필수 강의 80%와 마지막 강의를 완료해 주세요. 조건을 충족하면 다음 챕터가 즉시 열립니다."`
  - Link `"현재 학습 챕터로 돌아가기"` → `/student`.

---

## 5. Answer checking / normalisation

### 5.1 Dictation tokens (`listeningUtils.ts`)
```ts
function dictationWords(sentence) { return (sentence.match(/[a-zA-Z0-9'’\-]+/g) || []).map(w=>w.trim()).filter(Boolean); }
export function verifyWordSequence(u, t) { if (u.length !== t.length) return false; return u.every((w,i)=>w.toLowerCase()===t[i].toLowerCase()); }
export function verifyAnyWordSequence(u, accepted) { return accepted.some(t => verifyWordSequence(u, t)); }
```

**Tokenising:**
- Punctuation (`. , ! ? : ; ( ) / “ ”`) is dropped, and **the characters around it split the token**: `8:30` → `8`,`30`; `5,000` → `5`,`000`; `Mt.` → `Mt`.
- Apostrophes (straight or curly) and hyphens stay inside the word.
- The comparison is **case-insensitive, exact order, exact length**.

**Slash expansion** (:282): the regex is `/\(?([A-Za-z'’]+(?:\/[A-Za-z'’]+)+)\)?/g`.
- Pronoun groups (every option in he/him/his/himself or she/her/hers/herself) are resolved together by gender. That gives 2 variants: all-masculine and all-feminine. `"her/him"` in s6-3#7 is handled.
- Other groups (`brother/sister`, `sir/ma’am`) multiply, up to 16.
- **Computed: 34 sentences have 2 accepted sequences.** They are s1-1#1, s3-1#3, s3-2#5-9, s3-3#2-8, s3-4#1-2, s5-5#3, s6-1#4,#6, s6-2#3-6, s6-3#2-7, s6-4#3-6, s11-4#5. Every other sentence has exactly 1.
- **Not expanded:** `Mr./Ms.` (s6-2#2), because a letter must touch the slash. Tokens are `My|teacher’s|name|is|Mr|Ms|Surname`, so **both "Mr" and "Ms" are required** (§12 #7).
- **Placeholders are required words.** Examples: s1-2#4 `I|am|10|years|old`; s1-6#3 `…|for|3|4|or|5|years|so|far`; s6-2#3 `He|is|about|age|years|old`; s3-2#5 `My|best|friend|is|name|and|I|have|known|him|for|3|years`.
- **Examples:** s1-1#1 accepts `Nice to meet you sir` or `Nice to meet you ma’am`. Its tiles are {Nice,to,meet,you,sir,ma’am,+2 distractors} = 8 tiles, and the counter reads `x / 5 단어`.
- The largest tile count is 33.

### 5.2 Pronunciation score (`speechRecognition.ts:68-221`)
```ts
normalizeText = t.toLowerCase().replace(/[.,?!;:"'()]/g,"")   // straight ' removed FIRST
  .replace(/\bi'm\b/g,"i am") … /\bhadn't\b/ …               // → never match (apostrophe already gone)
  .replace(/\s+/g," ").trim();
```

**Alignment:**
- For each target word i, search the spoken words `[ptr, ptr+2)`.
- An exact match adds 1 and advances ptr.
- If the target word has length ≥5 and Levenshtein distance is 1, it adds 0.7 and advances ptr.
- **ptr does not advance on a miss.**

**Score:** `round(65*wordAcc + 20*charSim + 15*lenRatio)`.
- wordAcc = matches / target words.
- charSim = 1 − Levenshtein(normTarget, normSpoken) / maxLen.
- lenRatio = min / max word count.

**What never matches:**
- Curly `’ “ ”` and `/` are **not** stripped, so target tokens such as `it’s`, `he/she`, `(sir/ma’am)` → `sir/ma’am`, `“mom` and `home”` never match a recogniser transcript.
- `wordAnalysis[i].word` is `target.split(/\s+/)[i]`, the raw token with punctuation.

**Simulated with the app's function** (transcript = first slash variant, `’`→`'`, parentheses and quotes removed):
- The score distribution over 402 sentences is: 100: 345, 90s: 30, 80s: 23, 70s: 3, 40s: 1.
- **31 sentences cannot reach 92** (`"🌟 모든 단어 일치"`).
- **s8-1#2 scores 41** for a perfect reading, so the ≥70 auto-check can never fire there.
- Examples:
  - `"It's a pleasure to be with you today"` vs s1-1#2 → 91 (`It’s` unmatched).
  - `"Nice to meet you sir"` vs s1-1#1 → 82.
  - `"He is tall"` vs s6-3#3 → 73.

**Expected in a driver:** compute `evaluatePronunciation(fakeTranscript, text)` in Node from the same module. The mic tester then shows `` `${score}점 (${ratingLabel})` ``, and the Step 3 check turns on iff score ≥ 70.

---

## 6. Audio

**What STUDENT speaks:**
- Only pre-generated Azure "Ava" clips: `/audio/azure-ava/v1/<unifiedSpeechKey(text)>.mp3` (`speech.ts:755-841`), via `playSentenceQueue` → `speakWithToken` → `playUnifiedClip`.
- `shouldUseUnifiedSpeech()` is true for every path without `/cnn`, so **`lesson.audio[]` (`/audio/student/*.mp3`) is never requested**. The branch at `StudentLearningView.tsx:263-291` is dead on /student.
- A driver should assert that **zero** `/audio/student/` requests are made.

**Texts spoken:**
- English `items[i].text` (Step 1, 2 and 3 play/loop, dictation auto-play after a correct answer, full play, chapter bar).
- Korean `paragraph[i].text` (the "🔈 해석" buttons and the Step 2 "🔈" hint). **Generator:** `scripts/generate-azure-ava.mjs:262-265` states that STUDENT Korean is collected.
- Placeholders are spoken literally ("I live in (apartment name) Apartments.").

**Key derivation** (`unifiedSpeech.ts`). Keep it byte-identical in the driver:
```js
const norm = t => t.replace(/\s*\/\s*/g," ").replace(/\[[^\]]*\]/g," ").replace(/:{2,}/g," ").replace(/-{2,}/g," ")
  .replace(/[…]+/g," ").replace(/\s*\|\s*/g,", ").replace(/\(\s*\)/g," ").replace(/\s+/g," ").trim();
function key(text){ const c=norm(text); let a=0x811c9dc5,b=0x9e3779b9;
  for(let i=0;i<c.length;i++){const k=c.charCodeAt(i); a=Math.imul(a^k,0x01000193); b=Math.imul(b^k,0x85ebca6b); b^=b>>>13;}
  const h=v=>(v>>>0).toString(16).padStart(8,"0"); return `${c.length.toString(36)}-${h(a)}${h(b)}`; }
```

Computed examples for s1-1:
- `"Nice to meet you (sir/ma’am)."` → normalised `"Nice to meet you (sir ma’am)."` → `t-33e5cee3fef08f81`
- `"It’s a pleasure to be with you today."` → `11-28e0c5ec80ec0966`
- `"만나서 반갑습니다."` → `a-dbe96c1dc45decf0`

All 14 clips of s1-1 and s1-2 (English and Korean) are in `src/lib/generated/freeSpeechKeys.json`, which holds 532 keys. So they are open without a licence. Every other clip needs a licence session (`mediaAccess.ts:86-91`).

**Engine behaviour:**
- **Clip playback:** a detached shared `new Audio()` (not in the DOM), same-origin. The rate is clamped to 0.5–2. `speech.snapshot.speaking` becomes true immediately.
- **Fallback when a clip errors or `play()` rejects:**
  1. The legacy engine starts: `segmentByLanguage` → Web Speech synthesis (`playChunkViaSynthesis`), or the stream engine in in-app browsers, when there are no synthesis or no voices.
  2. The synthesis watchdog waits 1.5 s. If nothing is speaking, it calls `playChunkViaStream`, which **requests the same Ava URL again**.
  3. If that also fails, `finishRun(error)` runs. There is no third-party TTS.
- **Queue failure:** `onError` ends the whole queue (`speech.ts:1170-1176`). A single sentence then clears its target; the chapter bar shows its error; full lesson play has no `onError` (§12 #4).
- **Between queue items:** `speaking` is false during the gap (250 / 350 / 380 / 600 ms).
- **Stops:** `pagehide` and `visibilitychange→hidden` stop all speech (`speech.ts:257-263`).
- **Headless:** the shared launcher (`docs/qa-2026-09-15/scripts/verify/cdp.cjs:21-33`) already passes `--autoplay-policy=no-user-gesture-required` and `--mute-audio`. `ended` still fires after the real clip duration.

---

## 7. Persistence, completion, progress

### 7.1 localStorage / sessionStorage
| Key | Written by | Shape |
|---|---|---|
| `kig:student:practice:student/<id>` | `StudentLearningView.tsx:106-137` | `{"solved":{"<idx>":true},"completed":{"<idx>":true\|false}}`. Written on every change and restored on mount. Drives the Step 2 counter, the pills, the Step 3 checks and `canComplete`. **Never sent to the server.** |
| `kig:progress:completed` | `ProgressProvider.tsx:196-215` | `{"student:s1-1":true,…}`. The key is deleted when false. **Replaced from the server snapshot whenever one arrives (:140-158).** |
| `kig:progress:bookmarks` | :224-236 | `{"student:s1-1":true}`, local only |
| `kig:progress:recent` | :238-258 | `{course,lessonId,title,courseTitle,updatedAt}` |
| `kig:student:pending:v1` | :90-113, :69-88 | `[{lessonId?,completed?,lastLessonId?,clientUpdatedAt}]`, de-duplicated per `lesson:<id>` / `recent` |
| `kig:student:migrated:<last16 of key>` | :168-187 | `"1"` after a legacy import |
| `kig:license:v1` | LicenseProvider | read only by the driver; never print it |
| sessionStorage `kig:license-cookie:<last16 token>` | LicenseProvider :196-200 | reload guard |

### 7.2 Server progress
**Storage:**
- R2 object `private/progress/<sha256(KEY upper)>.json`, AES-256-GCM (`studentProgress.ts:60-66,106-142`).
- Record `{version:1, lessons:{"s1-1":{completed,updatedAt}}, unlockedThrough, manualUnlockedThrough?, lastLessonId?, lastLessonUpdatedAt?, updatedAt}`.
- `sanitize` accepts ids matching `/^s(?:[1-9]|1\d|20)-\d+$/`.

**`GET /api/progress/student`** (with the cookie `kig_license_session`):
- 200 `{success:true, progress:{version, lessons, unlockedThrough, lastLessonId, updatedAt, chapters:[{chapter,label,lessonIds,completedCount,requiredCount,percent,lastLessonCompleted,complete,unlocked}]}}`.
- 401 `{success:false,error:"유효한 이용권 인증이 필요합니다."}`.
- `label` is always `"Chapter N"` (§12 #2).
- GET does not write.

**`POST`:**
- **Body shapes:** `{updates:[…≤100]}`, a single update object, or `{legacyCompletedLessonIds:[…]}`.
- **Rate limit:** 120 per 60 s **per `deviceId` per server instance**. Exceeding it gives 429 `"진도 저장 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."`. All cloned audit profiles share one deviceId.
- **Server error:** 500 `"진도를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."`

**How the client triggers it:**
1. `toggleComplete` or `recordRecent` queues an update.
2. After a **650 ms debounce** the client sends `POST {updates}`.
3. On success, the pending queue is trimmed, `applyStudentProgress(response.progress)` runs, local `student:*` completions are rewritten from `response.progress.lessons`, and the status becomes `saved`.
4. On failure the status becomes `error` (online) or `pending` (offline). It retries on the `online` event or on the next queue.

`recordRecent` fires **on every lesson page mount**, so every licensed STUDENT page view is one R2 write.

**Merge rules** (`updateStudentProgress`, :301-365):
- Updates are serialised per key.
- `clientUpdatedAt` is clamped to [0, now+60 s]. An update wins if `>=` the stored `updatedAt`.
- **Reachable guard (RE-010):** a lesson in chapter c is applied only if `c <= clamp(unlockedThrough)+1`. Otherwise it is **silently skipped** and the response is still 200 (:337, :348). This applies to **every plan, including LIFE**.

**Chapter math** (`getStudentChapters`, :254-287):
- `requiredCount = max(1, ceil(n*0.8))`.
- `complete = completedCount >= requiredCount && last lesson completed`.
- `calculatedUnlocked` walks chapters 1..19 in order and increments while each is complete.
- `unlockedThrough = max(calculated, manual, stored)`. **It never decreases**: un-completing does not re-lock, and only the admin reset lowers it.
- `percent = round(completed/n*100)`.

**Expected after a driver action:** new `lessons[id]` = `{completed:bool, updatedAt≈clientUpdatedAt}`. Recompute the chapter fields with the formulas above and compare with `response.progress.chapters[c-1]`.

**Legacy import:** if the profile's `kig:progress:completed` has `student:*` keys and no migrated marker, the page POSTs `legacyCompletedLessonIds` once after the progress loads. It uses the same ceiling, computed once.

### 7.3 What an audit driver changes on the LIFE licence
- **Server:**
  - `lessons[id]` entries are created or updated. They cannot be deleted; "un-complete" leaves `completed:false`.
  - `lastLessonId` / `lastLessonUpdatedAt` change on every lesson visit.
  - `unlockedThrough` may rise, and that is irreversible without admin.
  - `updatedAt` changes.
  - Everything goes into `out/data-changes.md`.
- **Local (profile copy):** `kig:student:practice:*`, `kig:progress:completed` / `bookmarks` / `recent`, `kig:student:pending:v1`.
- **Parallel clones share the key.** One clone's completion arrives in another clone at its next GET and **overwrites** that clone's local `student:*` completions (:140-158). Serialise the STUDENT completion tests, or use a single profile.

---

## 8. Locking / entitlement

| Who | `/student/s1-1`, `s1-2` | Other `/student/<id>` | Chapter bar | `chapter-audio` API | Clips |
|---|---|---|---|---|---|
| No licence | open (free) | licence paywall | ch1 only: "무료 파트 연속 듣기" (s1-1 + s1-2); ch2-20 🔒 | ch1 → 200, `access:"free"`, partCount 2, sentenceCount 7; ch≠1 → 401 `"이 챕터는 이용권 등록 후 들을 수 있습니다."` | the 532 free keys only |
| LIFE (audit) | open | **all open** (`student/[lesson]/page.tsx:105`) | all 20 "챕터 전체 파트 듣기" | all 200, `access:"licensed"`, items = every sentence of the chapter | all |
| 1M / 1Y / STU1M / STU1Y / STU / STULIFE | open | open iff chapter ≤ `unlockedThrough`, else the **progress** paywall | unlocked iff chapter ≤ `unlockedThrough` (client default 1 before the fetch) | 403 `"이전 챕터를 완료하면 전체 듣기가 열립니다."` if chapter > `unlockedThrough` | all (`mediaAccess.ts:110-111`; STU passes are limited to the student folder, but hash clips are open to any session) |

- **API validation:** `chapter` must be an integer 1..20, otherwise 400 `"올바른 챕터 번호가 필요합니다."`. It returns 404 `"재생할 문장을 찾을 수 없습니다."` if there are no items (not reachable today).
- **Response:** `{success, chapter, chapterLabel (absent — undefined), access, partCount, sentenceCount, items:[{text, lessonId, lessonTitle, partNumber (index in group +1), sentenceNumber, sentenceTotal}]}`, with `Cache-Control: private, no-store`.
- **Expected LIFE `sentenceCount` per chapter** is the "Sentences" column in §2 (22, 30, 22, 23, 23, 27, 16, 20, 22, 22, 21, 23, 13, 16, 13, 18, 21, 15, 17, 18).
- **Free-preview predicate:** `isFreePreviewLesson` (`license.ts:106-125`) strips trailing `-\d+`. `s1-1-1` → `s1-1` is free (media), but `s1-10` → `s1` is not free.
- **Client `isUnlocked`** (`LicenseProvider.tsx:279-308`): free check first (using section and lesson index when given), then licence, then student (`LIFE` → true, else `chapter ≤ studentProgress.unlockedThrough || 1`).

---

## 9. Navigation & boundaries

- **Order:** `content/courses/student.json` `lessons[]` array order is s1-1 → … → s20-5 (`content.ts:124-163`). No script / pair pages. `canonical` = `/student/<id>`.
- **Page metadata:** free lessons have no `robots` key; the rest are `robots: noindex, follow`. `og:image` = `/images/og/students.jpg` (1000×525).
- **First and last:** s1-1 has no prev. **s20-5 has no next.** Completing s20-5 cannot raise `unlockedThrough` above 20 (`chapter < 20` at :267). There is no end-of-course UI.
- **Dashboard link:** each card links `/${courseSlug}/${id}` = `/student/<id>`.
- **Remount (unverified):** client navigation between two `/student/<id>` pages probably remounts the page. In the App Router the segment key includes the param. So Step, speed, filter and reveal state should reset, and `practice` state is re-read from localStorage. The comment at `StudentLearningView.tsx:102-105` assumes the opposite. The driver should assert what actually happens.
- **Things to probe:**
  - 404s: `/student/s1`, `/student/s21-1`, `/student/s1-7`, `/student/S1-1`, `/student/s1-1/extra`.
  - `/api/student/chapter-audio?chapter=0|21|1.5|abc`.

---

## 10. CDP driver recipe (one lesson, exhaustively)

Use `docs/qa-2026-09-15/scripts/verify/cdp.cjs` (`launch`, `Tab.open`, `tab.goto`, `tab.eval`) with a cloned LIFE profile (`docs/qa-2026-09-18/scripts/lib/profile.cjs`).

**Clicks:**
- Prefer real `Input.dispatchMouseEvent` at the element centre (it is a user gesture).
- `el.click()` via `eval` also works because the autoplay policy flag is set. Use `element.scrollIntoView({block:"center"})` first.

**Network:** enable the `Network` domain and log every request and response to `/audio/`, `/api/progress/student` and `/api/student/chapter-audio`.

### 10.1 Expected data (Node side, before the browser)
```js
// load the app's own pure modules (no imports) the way scripts/generate-azure-ava.mjs:120-131 does
const U = loadTs("src/lib/listeningUtils.ts"), R = loadTs("src/lib/speechRecognition.ts"), S = loadTs("src/lib/unifiedSpeech.ts");
const L = JSON.parse(fs.readFileSync(`content/lessons/student/${id}.json`));
const en = L.blocks.find(b=>b.type==="sentences").items;           // [{n,text}]
const ko = L.blocks.filter(b=>b.type==="paragraph"&&b.lang==="ko").map(p=>p.text.trim());
const exp = en.map((it,i)=>{ const wb=U.generateWordBank(it.text);
  return { n:it.n, text:it.text, ko:ko[i], enKey:S.unifiedSpeechKey(it.text), koKey:S.unifiedSpeechKey(ko[i]),
    correct:wb.correctWords, accepted:wb.acceptedWordSequences,
    tileMultiset: wb.allTiles.map(t=>t.word).sort(),   // distractors deterministic; compare as multiset
    fakeTranscript:U.expandSlashAlternatives(it.text)[0].replace(/’/g,"'").replace(/[()“”"]/g,""),
    fakeScore:R.evaluatePronunciation(U.expandSlashAlternatives(it.text)[0].replace(/’/g,"'").replace(/[()“”"]/g,""), it.text).score }; });
const title = `Part ${L.part} · ${L.title}`, N = en.length;
```

### 10.2 In-page helpers (`tab.eval`)
```js
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const tc = e => (e.textContent||"").replace(/\s+/g," ").trim();
const btn = (txt, r=document.querySelector("main")) => $$("button", r).find(b => tc(b).includes(txt));
const stepTabs = () => $$('nav[aria-label="학습 단계"] button');
const cards = () => $$("main span").filter(s=>/^Sentence #\d+$/.test(tc(s))).map(s=>s.closest(".rounded-2xl"));
const dropzone = () => $$("main span").find(s=>tc(s).startsWith("조립된 문장")).parentElement.nextElementSibling;
const pool = () => $$("main span").find(s=>tc(s)==="단어 보관함 (단어를 탭하세요):").nextElementSibling;
const practice = () => JSON.parse(localStorage.getItem("kig:student:practice:student/" + location.pathname.split("/").pop()) || "null");
```

**Setup before the lesson:**
1. Inject a fake recogniser with `Page.addScriptToEvaluateOnNewDocument` (§10.6).
2. Record `GET /api/progress/student` (the `unlockedThrough` and `lessons` snapshot) into `out/data-changes.md`.
3. For a clean run, remove `kig:student:practice:student/<id>`. That is local only and should be recorded.

### 10.3 Page shell
1. `goto /student/<id>`, then wait for `nav[aria-label="학습 단계"]` (a dynamic import).
2. **Assert:**
   - no `[data-kig-paywall]`;
   - `h1` = `title`;
   - `h2` in the view = `instruction`;
   - `"←STUDENT 목록"` link `href=/student`;
   - prev / next aria-labels match the neighbours in §2 order (s1-1: no prev; s20-5: no next);
   - a POST `/api/progress/student` with body `updates[*].lastLessonId === id` within about 2 s;
   - `localStorage kig:progress:recent.lessonId === id`;
   - **no request** to `/audio/student/`.
3. **Bookmark:**
   - click aria `"북마크 추가"` → the label becomes `"북마크 해제"` and `kig:progress:bookmarks["student:"+id] === true`, with no network call;
   - click again → the key is removed.

### 10.4 Step 1 (default)
1. **Initial state:** `stepTabs()[0]` is active. The filter `"🙈 모두 가림 (순수 리스닝)"` is active. `cards().length === N`.
   - For each card: the badge equals `exp[i].n`, the placeholder text is present, the English `p` is absent, the Korean is absent, and the `"👁️ 확인"` button is present.
2. **Reveal on card i:** click `"👁️ 확인"` → the English `p` equals `exp[i].text` exactly, the Korean `p` equals `exp[i].ko`, and the button reads `"🔒 가림"`. Click again → hidden.
   - Clicking the dashed placeholder div also reveals.
3. **Filters:**
   - `"🔤 영어만"` → all English shown and no Korean, except cards still revealed from step 2 (note §12 #10). No reveal buttons.
   - `"🇰🇷 해석만"` → all Korean shown with `"🔈 해석"`, and English placeholders.
   - `"👁️ 전체 보기"` → everything shown. Compare every English and Korean text one-to-one with `exp`.
4. **Listen (card i):**
   - click `"🔊듣기"` → the button reads `"⏹️정지"` within 300 ms, the card has class `ring-2`, and there is a request `/audio/azure-ava/v1/${exp[i].enKey}.mp3` with a 200/206 response and `audio/mpeg`;
   - click `"⏹️정지"` → back to `"🔊듣기"`;
   - start again and wait for the clip to end naturally → `"🔊듣기"`.
5. **Loop (card i):**
   - click aria `"한 문장 반복 듣기"` → aria `"반복 정지"`, and the same clip URL is requested again after each end (≥2 requests, or `ended` + replay);
   - click aria `"반복 정지"` **while speaking** → stops;
   - also try clicking during the 600 ms gap and record whether it stops or restarts (§12 #5).
6. **Korean (card i, "all" filter):** click `"🔈 해석"` → `"⏹️ 정지"` and a request for `…/${exp[i].koKey}.mp3`.
7. **Full play:**
   - click `"▶️전체 본문 듣기"` → `"⏹️전체 정지"`, the counter reads `"1/N"`, card 0 is highlighted, and there is a request for `exp[0].enKey`;
   - aria `"다음 문장"` → counter `"2/N"` and a request for `exp[1].enKey`;
   - aria `"이전 문장"` → `"1/N"`;
   - aria `"일시정지"` → aria becomes `"이어 듣기"` (the audio is paused, `currentTime` stops advancing);
   - aria `"이어 듣기"` → `"일시정지"`;
   - click `"1.2x"` → it is bold and the current sentence restarts;
   - let it run to the end → the button returns to `"▶️전체 본문 듣기"`, and the requests were `exp[0..N-1].enKey` in order;
   - **Negative case:** block one clip URL with `Fetch.enable`/`failRequest` → expect the queue to stop, and record whether the header stays `"⏹️전체 정지"` (§12 #4);
   - click `stepTabs()[1]` while playing → all audio stops.

### 10.5 Step 2 (for each sentence idx = 0..N-1)
1. Open `stepTabs()[1]`. Assert `"문장 1 / N"`, `"완료: 0개"` (if practice was cleared), `"◀️ 이전"` disabled, and N pills.
2. **Context:** the Korean `p` = `exp[idx].ko`. Click `"🔈"` → request `koKey`. Click `"🔊문장 듣기"` → request `enKey`. Click `"🔁무한 반복"` → `"⏹️반복 정지"`, then stop.
3. **Tiles:** the multiset of `tc` over `pool()` buttons equals `exp[idx].tileMultiset`. The counter reads `"0 / ${exp[idx].correct.length} 단어"`. The dropzone shows `"👇 아래 단어 블록을 탭하여…"`.
4. **Empty check:** click `"✅정답 확인"` → `div[role=status]` contains `"단어를 먼저 배열하세요."`.
5. **Wrong input A (all correct words, wrong order):** tap tiles for `correct.slice().reverse()`. Skip this when the reversed sequence equals an accepted one (a length-1 or palindromic sentence).
   - The tapped tiles become `disabled`. The dropzone shows each `word✕`. The counter reads `L / L 단어`.
   - Check → `div[role=alert]` contains `"어순이나 단어가 일치하지 않습니다."`, and `"🔊 다시 듣기"` replays `enKey`.
   - `practice().solved[idx]` stays absent.
6. **Wrong input B (distractor):** `"🔄 초기화"` → the dropzone is empty (record whether the alert is still shown, §12 #6). Tap `correct[0..L-2]` plus one distractor tile → check → alert.
7. **Remove tile:** click one `word✕` in the dropzone → it leaves, the pool tile is re-enabled, and the counter decreases.
8. **Correct via hint:** `"🔄 초기화"`, then click `"💡한 단어 힌트"` L times.
   - The dropzone words equal `exp[idx].correct` in order. An (L+1)-th hint does nothing.
   - Check → `div[role=status]` contains `"정답입니다!"`, a request for `enKey` (auto-play), the pill `title="문장 #${idx+1}"` shows `"✓"`, `"완료: k개"` increments, the Step 2 tab reads `"(k/N)"`, and `practice().solved[idx] === true`.
   - When idx < N-1, `"다음 문장으로 ➡️"` exists. Click it → `"문장 ${idx+2} / N"`, tiles are reset, and feedback is gone.
9. **Correct, alternative variant** (34 sentences where `accepted.length === 2`): on that sentence, tap `accepted[1]` word by word, choosing any enabled tile whose text equals the word case-insensitively → correct.
   - Also tap a **mixed** pronoun sentence, e.g. `He … her`, and expect wrong.
   - For s6-2#2 record that `Mr` **and** `Ms` are both required (§12 #7).
10. **Navigation:** `"다음 ▶️"` / `"◀️ 이전"` / pill `title="문장 #k"` → the header index follows, and at N-1 `"다음 ▶️"` is disabled.
11. **Persistence:** reload → Step 1 is shown by default. Open Step 2 → the tab reads `"(k/N)"` and the solved pills show `"✓"`.

### 10.6 Step 3
1. Open `stepTabs()[2]`. Assert N cards with English = `exp[i].text` and Korean = `exp[i].ko`, and `"완료도"` = `"${completedCount} / N"`.
2. **Before any practice** (practice cleared, lesson not completed):
   - the completion button (aria `"학습 완료 체크"`) is `disabled`;
   - `p[role=status]` reads `"받아쓰기 정답 또는 낭독 완료 체크를 1개 이상 하면 완료할 수 있습니다."`;
   - the summary reads `"문장 연습 0/N · 받아쓰기 0/N · …"`.
3. **Check toggle** (title `"낭독 완료 체크"`): click → text `"✓"`, title `"완료 해제"`, `"완료도"` +1, `practice().completed[i] === true`. Click again → `false` / count −1.
4. **`"🔊낭독 가이드 듣기"`** → request `enKey`. **Loop** aria `"반복 루프 섀도잉"` → `"반복 정지"`. **`"🔈 해석"`** → `koKey`.
5. **Mic, unsupported path:** run once without the fake → click `"🎙️발음 테스트"` → the tester shows either `"(마이크 음성 인식이 지원되지 않는 브라우저입니다…)"` or, if Edge exposes `webkitSpeechRecognition`, an error `"음성 인식 오류: …"` / `"마이크 접근 권한이…"`. Record which.
6. **Mic, fake recogniser** (addScriptToEvaluateOnNewDocument; it replaces the real one and **proves UI logic only, not speech**):
```js
window.__fakeSR = { transcript: "" };
window.webkitSpeechRecognition = window.SpeechRecognition = class { start(){ setTimeout(()=>{ this.onstart&&this.onstart();
  const r=[{transcript:window.__fakeSR.transcript}]; r.isFinal=true; const results=[r];
  this.onresult&&this.onresult({resultIndex:0, results}); this.onend&&this.onend(); }, 50); } stop(){} abort(){} };
```
   - For card i: set `__fakeSR.transcript = exp[i].fakeTranscript`, open the mic, and click `"🎙️지금 따라 말하기 (발음 채점)"`.
   - Expect the button text `` `${exp[i].fakeScore}점 (…)` ``, `"단어 일치 m/t"`, and the check on iff `fakeScore >= 70`.
   - Then set the transcript to `"banana"`: expect a low score, `"다시 시도 (Try Again)"`, and **the check unchanged**.
   - Then set it to `""`: expect `"0점 (음성 감지 안 됨)"`.
   - `"↺ 다시 녹음"` restarts the recogniser.
7. **Completion:** once any practice exists, the button is enabled. Click it:
   - text `"✓학습 완료됨"`, aria `"학습 완료 취소"`;
   - `kig:progress:completed["student:"+id] === true`;
   - after about 650 ms, `POST /api/progress/student` with body `{"updates":[{"lessonId":id,"completed":true,"clientUpdatedAt":<ms>}]}` (possibly batched with a `lastLessonId` item);
   - the 200 response has `progress.lessons[id].completed === true` **if** `chapter(id) <= unlockedThrough_before+1`;
   - `progress.chapters[c-1]` matches the §7.2 formulas.
   - **Otherwise** expect the silent drop and the button reverting to `"○이 강의 학습 완료"` (§12 #1). Log it either way.
   - Click again to un-complete: POST `completed:false`, and `unlockedThrough` does not decrease.
8. **Bottom nav:** `"다음 Step →"` is disabled on Step 3. `"← 이전 Step"` → Step 2 is active. `"목록으로"` → `/student`.

### 10.7 Dashboard and chapter audio (once per run, not per lesson)
1. `goto /student`. Assert:
   - `"총 82개 정규 레슨"`, `"20개 단계 구성"`;
   - 20 `button[aria-expanded="false"]` with group titles in §2 order;
   - `"학습 진도율: X / 82개 완료"` where X = count of `student:*` in `kig:progress:completed` = count of `completed:true` in the GET progress;
   - `"✓ 서버에 저장됨"`;
   - for LIFE, every chapter badge reads `"학습 가능"` or `"완료"` (`"완료"` iff `progress.chapters[c-1].complete`).
2. **Accordion:** expand chapter c → its lesson cards are `/student/<id>` links in group order, with codes `Ch c-p`, titles `Part p · title`, and footers `"학습하기→"`.
   - Star toggle → `kig:progress:bookmarks`.
   - Filters `"★북마크 (n)"` / `"미완료 (m)"` → the list is filtered accordingly.
3. **Chapter bar** (for c in 1..20, sequentially):
   - click aria `` `챕터 ${c} 전체 파트 듣기` `` → `GET /api/student/chapter-audio?chapter=c` 200;
   - `items.length === sentenceCount(c)` from §2; `items[k].text` equals the concatenated lesson sentences in order; `partNumber` / `sentenceNumber` are correct;
   - the sub-line reads `"▶ 재생 중: 파트 1/P · 문장 1/S"`, and the clip requests match `unifiedSpeechKey(items[k].text)`;
   - aria `…일시정지` → `…계속 재생`; `"0.85×"` resumes at the same item; stop aria `"챕터 전체 듣기 정지"` → idle;
   - starting chapter c+1 resets chapter c.
4. **API negatives** (in-page `fetch`): `chapter=0`, `21`, `1.5`, `abc` → 400. For no-cookie behaviour use a fresh profile without a licence: ch1 → `access:"free"`, 7 items (s1-1:3 + s1-2:4); ch2 → 401.

### 10.8 Whole course
- Repeat §10.3–10.6 for all 82 ids in §2 order.
- **Pace:** ≤ ~100 progress POSTs per minute across all clones (one per page view plus one per completion toggle).
- Compare every English and Korean text one-to-one and every clip key (402 English + 402 Korean).
- Record every server progress change.

---

## 11. Cannot be (fully) automated

- **Real microphone and speech recognition** (`VoiceSpeakingTester`). It needs a physical mic, a permission prompt and the browser's cloud recogniser (Google or Microsoft). Headless Edge has no mic, and the fake in §10.6 checks only the UI and scoring path.
- **Whether a real learner can hit ≥70** on slash, curly-quote or placeholder sentences can be simulated (§5.2) but not observed.
- **What the audio sounds like:** Ava's pronunciation, Korean voice quality, whether placeholders like "(apartment name)" sound acceptable, and loudness. Headless runs with `--mute-audio`, so only requests, status codes and durations can be checked.
- **Web Speech synthesis fallback voices** depend on the OS and device; headless usually has none.
- **Mobile-only paths:**
  - iOS / Android audio unlock (`unlockMobileAudio`) and Android `pause` = cancel handling (`speech.ts:1254-1266`);
  - KakaoTalk / in-app `"Chrome으로 열기"` / `"Safari로 열기"` intents;
  - the 375 px stacked Step tabs on a real iPhone (layout can be emulated; touch and audio cannot).
- **The sequential chapter lock and the progress paywall, and the chapter-audio 403.** The audit licence is LIFE, which bypasses them (`student/[lesson]/page.tsx:105`, `chapter-audio/route.ts:48`, `LicenseProvider.tsx:296`). Exercising them needs a non-LIFE STUDENT or all-pass licence, and the audit rules forbid typing licence codes. The unlock toast `"🎉 챕터 N가 열렸습니다."` is non-LIFE only.
- **Resetting progress** (admin `reset`, `setChapter`) is forbidden, so an `unlockedThrough` raise cannot be undone.
- **Real network loss:** offline / pending sync (`"연결 복구 후 자동 저장 예정"`) can be emulated with `Network.emulateNetworkConditions offline:true`, but real flaky mobile networks cannot.
- **Tab backgrounding** (`visibilitychange` stops speech) is only approximate in headless (e.g. `Emulation.setFocusEmulationEnabled` or a second tab brought forward).
- **Multi-device concurrent learners** on one key cannot be reproduced realistically; clones share the same deviceId.

---

## 12. Suspicious code (possible defects) — ALL UNVERIFIED

1. **LIFE / any-plan completions silently dropped out of reach.** `studentProgress.ts:326,337` skips completions for chapter > `unlockedThrough+1` for every plan, including LIFE (which the UI lets open every chapter), and still returns 200. `ProgressProvider.tsx:140-158` then rewrites local completions from the server, so the button flips back to "○이 강의 학습 완료" about 1 s later. The progress bar never counts that lesson. Reproduce on the audit licence by completing a lesson in chapter ≥ `unlockedThrough+2`.
2. **Chapter label always missing.** `content/courses/student.json` groups carry `title`, but `chapter-audio/route.ts:97` returns `chapterLabel: group.label` (undefined, dropped from JSON) and `studentProgress.ts:272` falls back to `"Chapter N"`. Unused in the learner UI, but wrong data in the API and admin view.
3. **Dashboard free-preview uses the filtered index.** `CourseDashboard.tsx:460-464` passes `lessonIdx` from the *filtered* list to `isFreePreviewLesson(slug,id,sectionIndex,lessonIdx)` / `isUnlocked`. With "미완료", a visitor without a licence who completed s1-1 sees s1-3 at index 1 as "무료 보기" and unlocked; the server still paywalls it.
4. **Full lesson play can get stuck "playing".** `StudentLearningView.tsx:238-248` and :343-353 (`playFullTts` and its speed-change restart) pass no `onError`. When a clip fails (`speech.ts:1170-1176` resets the queue) or speech is stopped by `visibilitychange` / `pagehide` (`speech.ts:257-263`), `fullMode` stays `"tts"`: the header keeps showing "⏹️전체 정지" and the transport, with nothing playing. `ChapterAudioBar` has the same issue for the visibility stop: status stays `"playing"`.
5. **Loop button flickers between repeats.** `speech.ts:681,1151,1163-1168` sets `speaking=false` during the gap between repeats (600 ms for loop). `isTargetPlaying` (`StudentLearningView.tsx:193-201`) then reports not playing, so the button shows "🔁반복"/"🔁무한 반복" for 0.6 s each cycle. A click in that window restarts the loop instead of stopping it.
6. **`"🔄 초기화"` leaves stale feedback.** `StudentLearningView.tsx:1003` resets the tiles but not `dictationFeedback`, so "정답입니다!" or "어순이나…" remains over an empty dropzone.
7. **`Mr./Ms.` not treated as alternatives.** `listeningUtils.ts:282` needs letters on both sides of the slash, so s6-2#2 requires both `Mr` and `Ms` tiles. It is the only unexpanded alternative in STUDENT.
8. **Placeholders treated as answer words.** Parenthesised placeholders are required dictation words (`age`, `name`, `Surname`, `10`, `3 4 or 5`, `gray black white`, …) and are spoken literally by Ava. `unifiedSpeech.ts:12` removes only empty `( )`. Pedagogy / content decision. Also, some English placeholders have no Korean counterpart in parentheses (s1-6#3, s4-3#1-2), and s2-5#1 is `(School Name)` vs `(한국)`.
9. **Pronunciation normalisation is broken.**
   - `speechRecognition.ts:71` strips `'` before the contraction rules at :72-89, which are therefore dead code.
   - Curly `’ “ ”` and `/` are not stripped, so those target words never match.
   - The search window at :154-170 does not advance on a miss, so misses cascade.
   - Simulated perfect reading: s8-1#2 = 41 (can never auto-check); 31 of 402 sentences can never reach 92.
   - The ratings (:196-208) therefore under-report correct speech on these sentences.
10. **Korean leaks into "영어만".** `StudentLearningView.tsx:658-660`: a card revealed in "모두 가림" stays revealed after switching to "🔤 영어만", so its Korean shows although the filter says English only.
11. **Stale comment.** `StudentLearningView.tsx:469-472`: "s19-3 is paragraphs only" is no longer true (4 sentences), so the `sentenceItems.length === 0` escape is dead.
12. **`chunkDrills` never rendered but still shipped.** 1,050 items: `LessonBody.tsx:193-201` returns before :549-600, yet `[course]/[lesson]/page.tsx:378` still passes them to a client component, so they are in every licensed STUDENT RSC payload. If "청크 연습" is advertised anywhere, STUDENT does not have it.
13. **Legacy mp3 path is dead.** `lesson.audio[]` (1,640 refs, 0 for s10-4/s10-5) and the mp3 branch `StudentLearningView.tsx:263-291` never run on /student. The header copy "분할 음원과…" (:487) describes split recordings that are not played.
14. **`order` field inconsistent.** Lesson file `order` has gaps and a duplicate (80 for s19-3/s19-4) and disagrees with the index. Unused by `src`, but misleading for tooling.
15. **Chapter title languages swapped.** Group titles are "한국어 (English)" while lesson labels and instructions are "English (한국어)" (§2), so the same chapter reads two ways on the dashboard header and on cards and lesson pages.
16. **Korean particle wrong for some numbers.**
    - `CourseDashboard.tsx:262` `` `챕터 ${n}가 열렸습니다` `` is wrong for 3, 6, 7, 8, 10, 11, 13, 16, 17, 18, 20 ("챕터 3가").
    - `LessonPaywall.tsx:46` `` `챕터 ${chapter}은` `` is wrong for 2, 4, 5, 9, 12, 14, 15, 19 ("챕터 2은").
17. **Plan rule may not match the label.** Only `LIFE` skips the sequential lock (`student/[lesson]/page.tsx:105`, `chapter-audio/route.ts:48`, `LicenseProvider.tsx:296`). 1M / 1Y "VIP 올패스" and STULIFE ("STUDENT 평생 소장 패스") are sequentially locked, while `[course]/[lesson]/page.tsx:157` calls 1M / 1Y / LIFE "all-pass". Confirm intent with the owner.
18. **Chapter-bar cache outlives licence changes.** `ChapterAudioBar.tsx:33,161-166` caches per chapter for the SPA lifetime, and there is no reload on `/student` after activation (`LicenseProvider.tsx:28-29,83-88`). A free chapter-1 payload (7 sentences) fetched before activating a licence is replayed afterwards under "6개 파트 연속 재생".
19. **One R2 write per page view.** Every licensed STUDENT page view POSTs `lastLessonId` (`LessonActionButtons.tsx:23-25` → `ProgressProvider.tsx:253-255`). The 120/min limit is per deviceId per instance (`route.ts:26-36`), and a 429 shows "저장 실패" on the dashboard.
20. **Accessibility names.**
    - The Step 3 mic button (`StudentLearningView.tsx:1152-1166`) has no aria-label, and its text label is `hidden` below sm, so its name is just "🎙️".
    - The Step 2 Korean hint button (:839-850) is named "🔈"/"⏹️".
    - The full-play transport has aria-labels, but the main full-play button changes meaning with no `aria-pressed`.
21. **Stored indices can over-count.** `StudentLearningView.tsx:465-466` counts every stored `solved`/`completed` key. If a lesson's sentence list shrinks, old indices can show e.g. "Step 2 (4/3)", and they can still satisfy `canComplete`.
22. **Pause ignored between sentences.** `speech.ts:1241` ignores pause when `speaking` is false, so ⏸️ pressed in the 350 ms gap between sentences during full play does nothing.
23. **Wrong paywall text flashes briefly.** `LessonPaywall.tsx:53-67`: on `/student/<id>` with a STUDENT-only licence in localStorage but no session cookie, the licence paywall reads "본 레슨은 VIP 올패스 전용 강좌입니다" (wrong for STUDENT) until `LicenseProvider` reloads.
24. **Remount assumption.** `StudentLearningView.tsx:102-105` assumes lesson-to-lesson navigation keeps the component mounted. In the App Router a param change most likely remounts the page (state reset). Harmless, but the driver should confirm (§9).
