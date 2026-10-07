# 고침3 — fix-c1 (흐름: 4장 6 · 7 · 3장 20 · 46 · 55 · 17 · 59 · 42)

- 근거: `UI검토-1007/결과.md`(4장 6 · 7 사장님 답 2026-10-07 23:01 · 3장 번호) · `고침2/통합.md` 2 · 6 · 7장 · `docs/디자인-규칙.md`.
- 가지 `claude/regression-check-1002-8d4817` · HEAD `dc68238e` 위 작업 트리. 커밋 · 푸시 · `git add` · `git stash` 안 함. `content/` · 점검 도구(`docs/qa-2026-09-18/scripts/*` · `docs/pass-off-grammar/검사/*`) 안 건드림(읽기만). 영어 글 바뀜 0. `.env.local` · 이용권 값 출력 0.
- **같은 AI 계열이 고치고 확인했습니다. 독립 검수가 아닙니다.**

## 1. 번호별

| # | 결과 | 무엇을 · 어디 |
|---|---|---|
| **4장 6** READING 4단계 이해 문제 | **고침** | `ReadingLearningView.tsx` 1675~1694. 문제는 4단계 '다 읽었어요'(`[data-action="finish-reading"]`)를 누른 뒤에 펼침. 그 전엔 문제 자리에 조용한 한 줄 '다시 읽고 '다 읽었어요'를 누르면 이해 문제가 나와요.'(`[data-comprehension="waiting"]`). **펼치는 조건(정함)**: ① 이번 방문에서 '다 읽었어요'를 누름(`outcome` — 너무 빨라 기록을 안 남긴 때도: 누른 것은 맞고, 위 안내가 까닭을 말함. 문제는 연습이지 완료 조건이 아님) 또는 ② 이 강의에 '읽음'이 남아 있음 = `gateReady`(4단계 시간 잰 기록 `speed.again` · 옛 기록 `speed.first` · 옛 최고 WPM · 강의 완료) — 이미 완료한 강의 · 기록이 있는 강의는 다시 들어오면 **바로 펼침**, 기록이 없으면 **접힘**. 재는 동안은 예전처럼 숨김. 문제 파일이 없는 강의는 예전처럼 빈 숨은 자리. 완료 조건(`readingGateOpen`) · 채점(`LessonQuestions`) · 문제 안내 글('다시 읽은 뒤 풀어 보세요…') 그대로 |
| **4장 7** GRAMMAR '정답 문장 전체 듣기' | **고침** | `GrammarLearningView.tsx` 591~613(플레이어 자료) · 1556~1572(`answerPlayerBox`) · 2356(3단계 끝) · 2479(4단계 — 채점 뒤에만) · 2227 · 2233(위 상자 숨김). 접힌 상자를 **3단계 끝**(다음 묶음 줄 아래 · '⋯ 더보기' 위)과 **4단계 채점 뒤 단계 끝**(채점 막대 아래 · '⋯ 더보기' 위)으로 옮김. 채점 전 4단계 · 1 · 2단계에는 없음. 플레이어는 page.tsx 것과 같은 입력(GRAMMAR I 영어 녹음 = 홀수 gh1 번호 · GRAMMAR II 트랙 · `extractSentencesForAudio`+`lessonSpeechForm` 대체 문장) — **말하는 글 바뀜 0**(소리 `--dry-run` pending 0). page.tsx 의 맨 위 `<details data-answer-player>`(main 바로 아래)는 **내 몫이 아니라 손대지 않고**, 이 화면이 그리는 `<style>main > details[data-answer-player]{display:none}</style>` 로 서버 첫 그림부터 숨김 → 단계 탭이 64px 올라감(390 · 1366 모두 253→189 · 281→217) |
| ↳ 1 · 2단계 | 적음(지시대로) | 옮기기 전 '맨 위 접힌 상자'는 단계와 상관없는 **한 자리(단계 탭 위)**라 1 · 2단계에서도 보였음. 사장님 답('3 · 4단계 채점 뒤로 옮기기')대로 옮겼으므로 1 · 2단계에서는 이제 없음. 1 · 2단계 안의 다른 정답 소리(1단계 '확인' 뒤 정답 칸 🔊 · 2단계 빈칸 공개 뒤 듣기 등)는 손대지 않음 |
| **20** '다음 Step' 낮추기 | **고침** | `LessonStepNavigation.tsx` 43~53 · 64~69 · 74 · 128~139. 화면에 `[data-bundles-left]`(GRAMMAR 1~3단계에 다음 묶음이 남은 동안)가 있으면 '다음 Step →' 를 조용한 모양으로(테두리 · 채움 없음 · `text-ink-soft` · 굵기 500 · 44px 그대로 · 누를 수 있음) + `data-quiet`. 표지는 뿌리 div 의 속성이라 MutationObserver 에 `attributes`(`data-bundles-left`)를 더함. 글 · 자리 그대로. 마지막 묶음 · 4단계 · 다른 과정은 예전 모양 |
| **46** ViewLoadingSkeleton | **고침(코드)** | `LessonBody.tsx` 13~19. 회색 뼈대 3개 + `animate-pulse` → `<div aria-busy="true" aria-label="강의를 불러오는 중" className="min-h-[60vh]" />`(조용한 빈 자리 · 아래 막대가 올라왔다 내려가지 않게 높이 둠). **알아 둘 것**: 8과정은 page.tsx 가 화면을 직접 그려(BUG-023 `DIRECT_VIEW_COURSES`) 이 길을 안 지남 — 이 뼈대는 LessonBody 를 거치는 CNN(폐지 · 손대지 않음) · 옛 과정에서만 보임. 그래서 사진은 없음. 같은 파일을 바꿨으므로 규칙 검사 `--zero` 를 맞추려고 **아무 과정도 닿지 않는 일반 그리기(LessonBody 248~ 의 '모드:' 줄 · 문장 카드 · 단어표 · 청크 칸)** 의 고정폭 · 자간 · 12px 미만 · 빨강 직접 색 · 이모지(👨 👩 👁️ 💬 ⏹️ 🔤 🧩 🔊)를 공통 토큰 · 선 아이콘으로 바꿈(전: 6·2·9·0·3·1·7 → 뒤 0). CNN 은 `CnnLearningView` 로 가므로 이 부분을 안 씀 |
| **55** VOCA 철자 '확인' | **고침** | `PhonicsLearningView.tsx` 1365~1375. 채움 단추 40% 흐림(`disabled:opacity-40`) → 공통 `btn-filled`(꺼짐 = 테두리 `--line-input` + 흐린 글, '이 강의 학습 완료' · GRAMMAR '전체 시험 채점하기'와 같음). 잰 값: 꺼짐 밝음 bg 투명 · 테두리 rgb(138,132,124) · 글 rgb(114,109,102) · 불투명 1 / 어둠 테두리 rgb(110,106,101) · 글 rgb(138,133,126) (전: 어둠 흰 채움 40%). 켜짐은 예전과 같은 검정(어둠 흰) 채움. 높이 44 |
| **17** 'N단계' → 'Step N' | **고침(내 몫 안)** | 아래 2장 표. 등급 뜻('중등 단어 1단계' · '제 1단계')과 개수 뜻('READING 4단계 학습' · '문법 4단계 학습 모드' · '네 단계' · 'LISTENING 5단계 학습' · 'VOCA 4단계 학습')은 그대로. '다음 단계에서…'(READING 1단계 끝) · '이 단계는?' · '…맞춰 보는 단계예요'(LISTENING)는 번호가 없어 그대로 |
| ↳ 내 몫 밖 | 적음 | 끝 막대 이유 줄의 'N단계'는 lib 파일(내 몫 아님): `src/lib/readingLearning.ts:277` '4단계에서 지문을 다시 읽고 시간을 한 번 재면 완료할 수 있어요.' · `src/lib/vocaLearning.ts:33` '2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요.' · `src/lib/passoffLearning.ts:42` '5단계를 모두 마치면 완료할 수 있어요.'(이건 '다섯 단계' 뜻일 수도) — 같은 화면에 'Step 1에서 …'(GRAMMAR)와 섞여 보임. `check-voca-0927.cjs:108` 가 VOCA 글을 읽음 |
| **59** 완료 단추 이름 | 해당 없음 | 내 몫 파일에 '학습 완료 체크' / '학습 완료 취소' 꼴 단추 없음(모두 `LessonEndBar` — fix-c3 몫) |
| **42** '1×' 칩 | 일부(내 몫) | 내 몫 파일의 속도 · 크기 칩은 이미 14px · 코딩 글꼴 아님(GRAMMAR '1.0× · 0.85×' · '기본 · 크게 · 특대', LISTENING '보통 1× · 느리게 0.75×'는 테두리 단추). GRAMMAR '⋯ 더보기' 안 고른 칩에 단계 탭과 같은 어둠 얇은 테두리(`dark:ring-1 dark:ring-line-input`, 1622 · 1644)만 더함. 리뷰의 '1×'(위 플레이어 속도)는 `AudioPlayer.tsx`(내 몫 아님) |

## 2. 도구가 읽는 글 · 이름 · 흐름 — 옛 → 새

### 2-1. 글 (17)

| 파일:줄(고친 뒤) | 옛 | 새 | 읽는 도구(찾은 것) |
|---|---|---|---|
| `GrammarLearningView.tsx:61` (끝 막대 이유 줄) | 1단계에서 한 문제를 확인하면 완료할 수 있어요. | Step 1에서 한 문제를 확인하면 완료할 수 있어요. | `UI검토-1007/고침/배포뒤-도구/verify-prod.cjs:77` · `고침/fix-lesson-도구/engine-check.cjs:44`(지난 검토 도구 — 다시 돌리면 FAIL) |
| `GrammarLearningView.tsx:99` (4단계 안내) | 모두 쓰고 채점하세요. 1단계에 쓴 답과는 따로 저장됩니다. | 모두 쓰고 채점하세요. Step 1에 쓴 답과는 따로 저장됩니다. | 못 찾음 |
| `GrammarLearningView.tsx:1590` (aria-label) | 1단계 새로 풀기 확인 | Step 1 새로 풀기 확인 | 못 찾음 |
| `GrammarLearningView.tsx:1592` | 1단계 답을 비우고 처음부터 풀까요? … | Step 1 답을 비우고 처음부터 풀까요? … | 못 찾음 |
| `GrammarLearningView.tsx:1603` (단추 `data-action="new-run"`) | 1단계 새로 풀기 | Step 1 새로 풀기 | `고침2/integrate-b-도구/markers-diff.cjs:16` 가 '단계 새로 풀기' 로 찾음 → **'Step 1 새로 풀기' 도 '단계 새로 풀기'를 포함하지 않으므로 줄어듦으로 셈** — 'Step 1 새로 풀기' 로 바꿀 것 |
| `PhonicsLearningView.tsx:991` | … 표시해도 2단계 퀴즈에는 그대로 나와요. | … 표시해도 Step 2 퀴즈에는 그대로 나와요. | 못 찾음 |
| `PhonicsLearningView.tsx:1493` | 2단계와 4단계에서 틀린 단어가 여기에 모여요. / 2단계 퀴즈를 풀면 틀린 단어가 여기에 모여요. | Step 2와 Step 4에서 틀린 단어가 여기에 모여요. / Step 2 퀴즈를 풀면 틀린 단어가 여기에 모여요. | 못 찾음 |

**주의 — 'Step N' 글의 단추**: '⋯ 더보기' 안 'Step 1 새로 풀기' 단추의 글이 `/\bStep\s*(\d+)\b/` 에 맞음. 단추 글로 단계 탭을 찾는 도구(`capture.cjs:85` · `capture-b.cjs:93` · `capture-prod-b.cjs:94` · `after-prod-capture.cjs:87` · `integrate-capture.cjs:90` · `g1-page.cjs:62` 의 첫 단추 검사)는 `[data-step-tab]` 을 먼저 쓰고 없을 때만 글로 찾거나(앞 넷), 보이는 것만 거름 — 접힌 '더보기' 안이라 보통은 안 걸리지만 **'더보기'를 연 채로 글 찾기를 하면 탭으로 잘못 셈**. 앱 쪽 `LessonStepNavigation` 은 이번에 `[data-step-tab]` 을 먼저 읽게 고쳐 영향 없음(아래 2-3).

### 2-2. 이름 · 표지(새로 · 바뀜)

| 무엇 | 옛 | 새 |
|---|---|---|
| READING 4단계 문제 자리, 읽기 전 | `[data-comprehension="questions"]` + `[data-lesson-questions]`(처음부터) | `[data-comprehension="waiting"]` + 한 줄(문제 없음). '다 읽었어요' 뒤 · 기록 있는 강의는 예전처럼 `="questions"` |
| GRAMMAR 정답 플레이어 | `main > details[data-answer-player]`(page.tsx, 단계 탭 위, 늘) | 그 상자는 DOM 에 남되 **보이지 않음**(display:none). 새 상자 `main [data-grammar-view] details[data-answer-player][data-answer-player-step="3"]`(3단계 탭일 때 늘) · `[data-answer-player-step="4"]`(4단계 · `[data-exam-summary]` 가 있을 때만). 화면 뿌리 `[data-grammar-view]` 에 `data-owns-answer-player` |
| '다음 Step →' | 늘 테두리 단추 | `[data-bundles-left]` 동안 `data-quiet` 붙은 조용한 단추(글 · 자리 · `nav[aria-label="학습 단계 이동"] button` 순서 그대로, 누를 수 있음) |
| VOCA 철자 '확인' | 클래스 `bg-ink … disabled:opacity-40` | `btn-filled …`(글 · `data-action="check-spelling"` · `disabled` 그대로) |
| LessonBody 뼈대 | 회색 상자 3 · animate-pulse | `div[aria-busy="true"][aria-label="강의를 불러오는 중"]` |
| LessonBody 일반 그리기 | '👨 남성 음성' · '👁️ 영어 확인하기' · '💬 …' · '🔤 발음 훈련 단어장' · '🧩 청크 …' · ⏹️ · 🔊 | 이모지 뺀 같은 글 · 선 아이콘(닿는 과정 없음) |

### 2-3. 흐름 — 도구 고칠 것(다음 단계 tools-c 몫)

**① READING 4단계(drive-reading.cjs · lib/reading-page.cjs · check-lesson-questions-0928.cjs)**

새 흐름(눌러야 할 순서):
1. `main [data-step-tab="4"]` → `[data-step-panel="4"] [data-comprehension="waiting"]` 가 있고 `[data-question]` 0개(빈 저장소 · 기록 없음일 때).
2. `[data-step-panel="4"] [data-action="start-reading"]` → (재는 동안 문제 자리 없음 — 예전과 같음) → `[data-step-panel="4"] [data-passage="timed"] [data-action="finish-reading"]`.
3. 그 뒤 `[data-step-panel="4"] [data-comprehension="questions"] [data-lesson-questions]`(너무 빠른 누름이어도 펼침).
4. 다시 불러오면: 4단계 시간 기록(`kig:reading:speed:v1:<id>` 의 `again`/`first`) · 옛 최고 WPM · 완료 중 하나라도 있으면 바로 `="questions"`, 없으면 `="waiting"`.

고칠 곳:
- `drive-reading.cjs` `step4Checks` 902~908: '읽기 시작' **전**에 문제가 보여야 PASS → 전에는 `kind === "waiting"` · 문제 0 · 글 '다 읽었어요' 포함으로, 문제 목록 · 순서 · 보기 4개 검사는 **too-fast 실행(912) 뒤**로 옮김(too-fast 뒤 펼쳐지므로 `questionChecks`(917 · 946)는 그대로 됨). 문제 파일 없는 강의(907)는 그대로.
- `check-lesson-questions-0928.cjs` R1 177~191: '재기 전 보임'을 '재기 전 waiting(문제 0) · 재는 동안 숨음 · 끝나면 보임'으로. R1 은 시작 직후 끝냄(너무 빠름) → 그래도 펼쳐지므로 R2 이하 그대로.
- 다시 들어오기 검사(새로 둘 만한 것): 실제 시간 기록 뒤 새로고침 → 4단계 `="questions"` 바로.
- 깨기 시험 제안: 앱의 `questionsOpen` 을 `true` 로 고정한 사본(또는 `--break=questions-before-read` 로 기대를 뒤집어) — '읽기 전 waiting' 칸이 FAIL 하는지.
- `lib/reading-page.cjs` `MEASURE_ONCE`(완료 열기)는 순서가 그대로라 고칠 것 없음.

**② GRAMMAR 정답 플레이어(g1-page.cjs · g2-driver.cjs · drive-common-0926.cjs · check-top-player.cjs · drive-generic.cjs)**

새 흐름: 플레이어를 들으려면 `main [data-step-tab="3"]` → `main [data-grammar-view] details[data-answer-player]:not([open]) > summary` 를 눌러 엶 → 그 안 `[aria-label="재생"]`. 4단계에서는 답을 쓰고 `[data-exam-submit]` 채점 뒤에만 `[data-answer-player-step="4"]`.

고칠 곳:
- `lib/g1-page.cjs:165` · `lib/g2-driver.cjs:370` `playerDetails` = `document.querySelector("main details[data-answer-player]")` → 이제 **숨은 page 상자**를 먼저 잡음. `main [data-grammar-view] details[data-answer-player]` 로 바꾸고, 플레이어를 보는 검사 전에 3단계 탭을 누름. '1단계에서 접혀 있음' 검사가 있으면 '1 · 2단계 · 채점 전 4단계엔 없음(보이는 상자 0)'으로.
- `drive-common-0926.cjs:282` · `check-top-player.cjs:19` `FOLDED_PLAYER`: 같은 선택자로 바꾸고 GRAMMAR 는 그 전에 `main [data-step-tab="3"]` 누름(READING 이 3단계로 가는 줄 바로 옆에 같은 꼴로).
- `drive-generic.cjs` `openPlayFolds`(253~): `main details:not([open])` 를 도는데 숨은 page 상자(display:none)의 summary 를 누르려다 '크기 0'으로 실패 → 그냥 넘어감(결과 영향 없음으로 보이나) `getClientRects().length === 0` 인 details 는 건너뛰게. 3단계에서는 새 상자가 잡혀 재생 검사에 들어감.
- `drive-generic.cjs:1381~1392` 완료 열기(1단계 한 문제 '확인')는 순서 그대로 — 고칠 것 없음.
- 소리 정의(`scripts/lib/spoken-texts.cjs` '위 전체 듣기')는 같은 함수 · 같은 입력이라 고칠 것 없음(pending 0 확인).
- 깨기 시험 제안: 채점 전 4단계에서 `[data-answer-player-step="4"]` 가 **없어야** PASS · 1단계에서 보이는 `details[data-answer-player]` 0 이어야 PASS — `<style>` 줄을 뺀 사본에서 1단계 칸이 FAIL 하는지.

**③ '다음 Step' 조용한 모양(20)** — 도구들은 `nav[aria-label="학습 단계 이동"] button` 순서 · '다음 Step' 글 · `disabled` 로 찾음 → 바뀐 것 없음. `verify-dark.cjs:271` 같이 '다음 Step' 의 테두리 · 대비를 재는 검토 도구는 GRAMMAR 묶음 중에는 테두리 없음(`data-quiet`)이 정상.

**④ LessonStepNavigation 단계 찾기** — `[data-step-tab]` 단추가 있으면 그것만으로 단계를 셈(없으면 예전처럼 'Step N' 글). 8과정 모두 `data-step-tab` 있음(StepTabs · GRAMMAR · PASS-OFF · LISTENING · VOCA · READING · STUDENT · ADULT). 도구 영향 없음.

## 3. 바꾼 파일

- `src/components/ReadingLearningView.tsx` (+18)
- `src/components/GrammarLearningView.tsx` (+64 −6)
- `src/components/LessonStepNavigation.tsx` (다시 씀 · 같은 겉 글)
- `src/components/PhonicsLearningView.tsx` (+10 −3)
- `src/components/LessonBody.tsx` (뼈대 + 닿지 않는 일반 그리기의 규칙 위반 정리)
- 이 문서. 사진은 git 밖.

**남의 몫에 적을 것**
- `src/app/[course]/[lesson]/page.tsx`(fix-c2 · 통합): GRAMMAR 의 `<details className="group mb-5" data-answer-player>…</details>`(427~442 근처, 손대지 않음)는 이제 화면에 안 보임 — 지우면 깔끔(그때 GrammarLearningView 의 `<style>` 한 줄은 할 일이 없어지나 남아도 무해). 지우면 `topPlayers` 를 GRAMMAR 에서 안 쓰게 됨.
- 위 1장 17 '내 몫 밖' 의 lib 이유 줄 셋.
- `globals.css` 로 옮기고 싶으면: `main:has([data-owns-answer-player]) > details[data-answer-player]{display:none}`(A10 과 같은 꼴) — 그러면 `<style>` 줄을 뺄 수 있음.

## 4. 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 |
| `check-design-rules.cjs` 바꾼 tsx 5 + LdLearningView `--zero` 7칸 | 모두 0 · exit 0 (LessonBody 전 6·2·9·0·3·1·7) |
| `KIG_ENV_LOCAL=… node scripts/generate-azure-ava.mjs --dry-run` | pending 0(8과정 · grammar1 1,454 · grammar2 795 · reading 3,873 · phonics 3,906) |
| 로컬 사진(390 · 1366 × 밝음 · 어둠, 빈 프로필 · 무료 강의) | 오류 · 예외 0. 잰 값은 `after/facts.json` · `before/facts.json` |
| READING pr001(4벌) | 읽기 전 `waiting` · 문제 0 → 실제 시간 잰 '다 읽었어요' 뒤 `questions` 2 → 새로고침 뒤 4단계 바로 `questions` 2 (전: 처음부터 `questions` 2) |
| GRAMMAR gh1-006(4벌) | 위 상자 보임 전 true → 뒤 false · 단계 탭 y 253→189(390) · 281→217(1366) · 3단계 상자 전 없음 → 뒤 있음(열면 플레이어 '1/42') · 4단계 채점 전 없음 · 채점 뒤 있음 · '다음 Step' 전 테두리 · 흰 바탕 · 굵기 600 → 뒤 테두리 · 바탕 투명 · ink-soft · 500 · 44px |
| VOCA mv1-01(4벌) | 철자 '확인' 꺼짐 전 채움 40% → 뒤 테두리 + 흐린 글 · 불투명 1 · 44px. 켜짐 같음 |

- 개발 서버: 처음엔 다른 일꾼의 `next dev`(3383)가 같은 폴더에서 돌고 있어 Next 16 이 두 번째 dev 를 막음 → 그 서버가 꺼진 뒤 **내 포트 3381** 로 띄움(빈 환경 — 미디어 · 이용권 값 없음, 소리 파일 502 는 그 탓). 브라우저는 내 몫 포트 9970(뒤) · 9971(전) 한 번에 하나, 빈 프로필. 띄우기 전 남은 메모리 1.2GB 아래일 땐 1분씩 기다림(여러 번). 다 쓴 뒤 dev 서버 · 브라우저 끔(남의 프로세스는 안 건드림).
- '전' 사진은 운영(https://k-ig-core.vercel.app — 묶음 표지 `data-bundles-left` 가 있어 2차 `dc68238e` 배포로 보임)에서, '뒤'는 로컬 3381 에서 같은 도구 · 같은 순서로 찍음.

## 5. 사진 (git 밖, `docs/qa-2026-09-18/out/ui-1007/c-fix-c1/`)

`before|after/<밝음|어둠>/<390|1366>/` 아래 같은 이름:

| # | 사진 이름 |
|---|---|
| 4장 6 | `reading-pr001-step4-start.png`(읽기 전) · `reading-pr001-step4-after-done.png`('다 읽었어요' 뒤) |
| 4장 7 | `grammar-gh1-006-step1-top.png`(맨 위 — 전: 상자 · 뒤: 없음) · `grammar-gh1-006-step3-end.png` · `grammar-gh1-006-step3-player-open.png`(뒤만) · `grammar-gh1-006-step4-graded.png` |
| 20 | `grammar-gh1-006-step1-nav.png`('다음 묶음' 검정 하나 · '다음 Step' 조용함) |
| 55 | `voca-mv1-01-step3-spell-off.png` · `voca-mv1-01-step3-spell-on.png` |
| 17 | `voca-mv1-01-step1-top.png`('Step 2 퀴즈') · `voca-mv1-01-step3-empty.png` · GRAMMAR 끝 막대 이유 줄은 `grammar-gh1-006-step1-nav.png` |
| 숫자 | `before/facts.json` · `after/facts.json` |

찍은 도구: 스크래치패드 `capture-c1.cjs`(`docs/qa-2026-09-15/scripts/verify/cdp.cjs` 를 읽어 씀 — 점검 도구는 안 바꿈).

## 6. 배포 뒤 운영에서 볼 것

1. READING 이용권 강의(예 pr154) 4단계: 처음 → waiting 한 줄 · 실제로 다 읽은 뒤 문제 · **이미 완료한 강의는 들어가자마자 문제**(이용권 진도의 완료로 `gateReady`) · 너무 빠른 '다 읽었어요' 뒤에도 문제가 펼쳐지는지(정한 대로).
2. GRAMMAR I · II 이용권 강의(예 gh1-116 · gh2-044 — 시대 메모가 제목 아래 있는 강의) 1단계 맨 위에 '정답 문장 전체 듣기'가 **깜빡이지도 않고** 없는지(서버 첫 그림의 `<style>`), 3단계 끝 · 4단계 채점 뒤 상자에서 재생 · 속도 · 이전/다음이 되는지, 4단계 채점 전 · 1 · 2단계에 없는지. GRAMMAR II 트랙이 여럿인 강의는 이름표가 붙는지.
3. GRAMMAR 묶음 중 '다음 Step' 조용함 → 마지막 묶음에서 다시 테두리 단추(밝음 · 어둠, 실제 휴대폰).
4. VOCA 3단계 철자 '확인' 꺼짐 · 켜짐(어둠).
5. 운영 드라이버(도구 고친 뒤): drive-reading pr001(데스크톱 · 폰), drive-generic gh1-006 · gh2-007 · mv1-01, check-lesson-questions-0928.

- 같은 AI 계열이 고치고 확인했습니다. 독립 검수가 아닙니다.
