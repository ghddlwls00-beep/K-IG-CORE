# 고침3 tools-c (점검 도구) — 2026-10-08

- 가지 `claude/regression-check-1002-8d4817` · HEAD `dc68238e` 위 작업 트리(fix-c1 · c2 · c3 의 앱 바뀜이 들어 있는 트리). **앱 파일 · `content/` 바뀜 0.** 커밋 · 푸시 · `git add` · `git stash` 안 함. 영어 글 바뀜 0. `.env.local` · 이용권 값 출력 0.
- 근거: `고침3/fix-c1.md` 2-3 · `fix-c2.md` 3장 · `fix-c3.md` 2 · 3장의 '도구 고칠 것'(옛 → 새) + 내 grep(옛 글 · 이름 · 흐름 전부).
- 로컬: `next build`(04:2x, 이 트리) → `next start -p 3384`(미디어 읽기 값 4개만 — `tools-c-도구/start-media-3384.cjs`, 값 안 찍음 · 이용권 · 진도 저장소 꺼짐). 브라우저는 빈 프로필(`KIG_PROFILE_SOURCE` = 빈 폴더 · `KIG_CLONE_PREFIX=kig-toolsc-`) · 디버깅 9980~9984 · 한 번에 하나 · 띄우기 전 남은 메모리 1.2GB 아래면 1분씩 기다림(`tools-c-도구/run.cjs` 가 모든 실행을 감쌈). 남의 프로세스는 건드리지 않음.
- **같은 AI 계열이 고치고 시험했습니다. 독립 검수가 아닙니다.**

## 0. 한눈에

| 번호 | 무엇이 바뀌었나(앱) | 도구 고침 | 로컬 깨기 시험 |
|---|---|---|---|
| 59 | 완료 단추 이름 '학습 완료 체크/취소' → 보이는 글 '이 강의 학습 완료' / '학습 완료함 · 취소하려면 누르세요', aria-pressed 없음 | 새 이름을 쓰게 고친 도구 15(그중 9 은 한 곳 `lib/ui-1008.cjs` 를 부름 — 쪽 안에 심는 lib · 사본 dp.cjs · PASS-OFF 이용권 도구는 글을 직접) + '이름 = 보이는 글 · aria-pressed 없음' 검사 칸 새로 | PASS → FAIL → PASS |
| 17 | PASS-OFF Step 5 '5단계를 모두 마쳤어요' → 'Step 1~5를 모두 마쳤어요' · 'TOPIC N 마무리' → '대주제 N 마무리' | drive-passoff · dp.cjs ×2 · wrongspot · drive-topic-lock | PASS → FAIL → PASS(drive-passoff) · topic-lock 은 정적 시험 |
| 8 | 장 이름 'Chapter 16. …' → '16장 · …' · 'TOPIC 1. 인칭' → '대주제 1 · 인칭' · 이웃 'Ch 1-2 · ' → '1-2 · ' | check-student-0927 C2 · drive-common 머리 찾기 · titles-live · drive-topic-lock D6a | PASS → FAIL → PASS |
| 41 | '서버에 저장됨' → '진도 저장됨' 등 해요체 | drive-topic-lock · drive-topic-admin · check-progress-live | 이용권 화면이라 로컬 불가 → 정적 시험(앱 글 = 도구 기대) PASS → FAIL(HEAD 앱) |
| 25 | 대본 쪽(-1) 끝 막대 이전 · 다음 = 본 강의 것 | lib/expectations `neighbours` · g2-driver · drive-reading | PASS → FAIL → PASS |
| 6 | READING 4단계 문제는 '다 읽었어요' 뒤 · 다시 오면 바로 | drive-reading step4 · check-lesson-questions-0928 R1 · R3(새) | PASS → FAIL → PASS |
| 7 | GRAMMAR '정답 문장 전체 듣기' 위 상자 숨김 → 3단계 끝 · 4단계 채점 뒤 | drive-generic(접힘 찾기 · '일시정지' 풀기 · 새 검사 칸) · g1-page · g2-driver · drive-common-0926 · check-top-player | PASS → FAIL → PASS |
| 35 | ADULT 360 지금 탭 'n/7' 배지 380px 미만 숨김(2차) — 10-08 운영 확인 FAIL 4 | drive-generic: 380px 미만에서는 탭의 DOM 글(textContent)로 개수를 읽음 | PASS → FAIL(옛 규칙) → PASS |

## 1. 새로 만든 것

| 파일 | 무엇 |
|---|---|
| `docs/qa-2026-09-18/scripts/lib/ui-1008.cjs` | 도구가 읽는 앱 이름 · 글을 **한 곳에**: `COMPLETE_TODO` '이 강의 학습 완료' · `COMPLETE_DONE` '학습 완료함 · 취소하려면 누르세요' · 선택자 · `COMPLETE_NAME_RE` · `COMPLETE_NAME_CHECK`(59: 이름 = 보이는 글 · aria-pressed 없음 · data-lesson-complete) · `PASSOFF_ALL_DONE` · `GRAMMAR_PLAYER(_FOLDED_SUMMARY)` · 옛 값 `OLD` · **`REVERT_1008`**(깨기 — 아래) |
| `lib/harness.cjs` (3줄) | `openTab`: `KIG_BREAK_APP=1008` 일 때만 `REVERT_1008` 를 모든 쪽 앞에 심음 — 쪽을 **10-08 전 앱으로 되돌림**(완료 단추 옛 이름 + aria-pressed · 옛 글('5단계를 모두 마쳤어요' · '서버에 저장됨' · 'TOPIC N 마무리' · '…열립니다/열림') · STUDENT 이웃 'Ch 1-2 · ' · GRAMMAR 위 상자 보이고 3 · 4단계 상자 숨김). 환경 변수가 없으면 아무 일 없음(평소 실행 바뀜 0). 앱 파일을 되돌렸다 빌드하는 대신 이것으로 '앱 글을 옛 것으로 되돌린' 깨기를 함(빌드 1회 · 메모리) |
| `UI검토-1007/고침3/tools-c-도구/` | `start-media-3384.cjs`(로컬 서버) · `run.cjs`(모든 실행 — 빈 프로필 · 내 사본 이름 · 메모리 기다림 · 기록) · `generic-runs.cjs` · `rest-runs.cjs`(실행 목록) · `lib-probe.cjs`(드라이버가 저장소에 없는 g1-page · g2-driver · student-page 를 실제 쪽에서 읽음) · `static-check.cjs`(로컬에서 못 도는 PASS-OFF 이용권 도구의 기대 글 = 앱 글인지, 도구 코드에 옛 글 0 인지 — `--break` 는 HEAD 의 앱 · 도구로) · `sum-generic.cjs`(기록 요약) |

## 2. 도구별 바꾼 것 — 옛 → 새

### 2-1. 59 완료 단추 이름(모든 과정)

| 도구 · 자리 | 옛 | 새 |
|---|---|---|
| `check-student-0927.cjs` C1 · C2 · C4 · G1 | `button[aria-label="학습 완료 체크"]` · `"학습 완료 취소"` | `U.COMPLETE_TODO_SEL` · `U.COMPLETE_DONE_SEL` + **C2b 새 칸**(완료 전 · 뒤 이름 = 보이는 글 · aria-pressed 없음) · `--port` 더함(기본 9594 그대로) · 깨기 결과 파일 따로 |
| `gap-checks-0926.cjs` P(121 · 132 · 146 · 153 · 154 · 161) | 같은 옛 이름 | 새 이름 · `--tag` · 깨기 기록 파일 따로 |
| `drive-reading.cjs` 658 · 718 · 1388 · 1464 · 1465 | 옛 이름 기대 | 새 이름 + '59: the name is the visible words · no aria-pressed' 칸 2개(완료 전 · 완료 뒤) · `DRIVER_REV` `…-u1008` |
| `drive-generic.cjs` 완료 찾기 | STUDENT · ADULT `/^학습 완료 (체크|취소)$/`, 다른 과정 `/학습 완료|완료 체크/`(이름 + 글) | 모든 과정 `COMPLETE_NAME_RE`(이름만) + 'completion · 59 · name = visible words · no aria-pressed' 칸 · `DRIVER_REV` `…-u1007-u1008` |
| `drive-passoff.cjs` END_BTN · 누름 | `button[aria-label^="학습 완료"]`(완료 전 새 이름 '이 강의 …' 에 안 맞음) | 새 두 이름 + `name59` · '처음엔 꺼짐' · '다섯 단계 뒤 켜짐' 이 name59 까지 봄 · `DRIVER_REV` `passoff-1002a-u1008` |
| `회귀점검-1002/단계3/s3b-…/dp.cjs` · `s3c-…/dp.cjs`(drive-passoff 사본) | 같음 | 같은 고침 |
| `check-voca-0927.cjs` 48(이 도구는 fix-c3 표에 없었음 — 내 grep 으로 찾음) | `/^학습 완료 (체크|취소)$/` | `COMPLETE_NAME_RE` · `--port` · 깨기 결과 파일 따로 |
| `lib/g1-page.cjs` actionBtn · `lib/g2-driver.cjs` chrome · chromeBtn · `lib/student-page.cjs` shadowing | 옛 이름(g2 는 '강의 이동' 머리줄에서 찾았는데 10-07 부터 끝 막대) | 새 이름 · g2 는 끝 막대(`section[aria-label="강의 마치기"]`)에서 |
| `docs/pass-off-grammar/검사/drive-topic-lock.cjs` END_BAR · pressComplete · D3d · D3f | 옛 이름 | 새 이름 |
| 설명 글만: `lib/reading-page.cjs` · `voca-page.cjs` · `ld-page.cjs` · `proof-tests.json:178` | 옛 이름 | 옛 → 새 함께 적음 |

그대로 맞는 것: `drive-generic` `/취소/` 판정(새 완료 이름에도 '취소') · `COMPLETE_RE`(다른 단추 누름에서 뺄 때 — '학습 완료' 포함).

### 2-2. 17 · 8 · 41 글

| 도구 · 줄 | 옛 | 새 |
|---|---|---|
| `drive-passoff.cjs` stepWrap · `dp.cjs` ×2 | `/5단계를 모두 마쳤어요/` | `'Step 1~5를 모두 마쳤어요'` |
| `check-wrongspot-hangul-1004.cjs` 409 | `/다음 단계: 마무리|5단계를 모두 마쳤어요/` | 'Step 1~5를 모두 마쳤어요' 더함(옛 것은 옛 빌드용으로 남김) |
| `check-student-0927.cjs` C2 | `/^다음 강의: Ch 1-2 · /` | `/^다음 강의: 1-2 · /` |
| `check-student-titles-live.cjs` | 목록 표지 `Chapter 16` · 장 label 칸을 원본 글 그대로 찾음 | 표지 `16장 · ` · 장 label 칸(`.label` · `.groups[].title`)은 앱 함수 `formatGroupTitle` 로 만든 화면 꼴('16장 · 또 다른 장래 희망 (통역사)')로 견줌(새 값 · 옛 값 둘 다) · `--pages` · `--break=raw-labels` |
| `drive-common.cjs` A · C 목록 머리 찾기 | `/(Chapter|단계|중등|고등|과|번|회)/` | `/(\d+장 · |대주제 \d|Chapter|단계|중등|고등|과|번|회)/` · `--break=group-old` · `--out`. **덤(내 첫 실행이 찾은 옛 도구 잘못 2 — 고침3 전에도 FAIL 이었을 것)**: ① 1장 머리가 '1·2강 무료' 글 때문에 안 열림(`무료` → `무료 체험` 만 뺌) ② 대본 쪽이 없는 과정(STUDENT · ADULT · PASS-OFF · VOCA)에서 맞는 진도 수를 '넘게 셈' 으로 FAIL(`scripts.length > 0` 일 때만) |
| `drive-topic-lock.cjs`(PASS-OFF · 이용권 로컬 서버용) | D1 `이용권 등록 후 열림` · `서버에 저장됨` 없음 / D2a · 359 · 500 · 532 · 555 · 591 · 600 `서버에 저장됨` / D2c `TOPIC 1을 마치면 열림` / D2d 줄 `TOPIC 1을 마치면 열림` / D3a `5단계를 모두 마쳤어요` / D3g `TOPIC 1 마무리` / D4a `TOPIC 2가 열렸어요.` / D4b · D8a · D8b `!/마치면 열림/` / D8a `진도를 서버와 맞추는 중` / D9a `TOPIC 1을 마치면 열림` / D6a `index.groups[1].label`('TOPIC 2. 동사의 현재형') | `이용권 등록 후 열려요` · `진도 저장됨` 없음 / `진도 저장됨` / `대주제 1을 마치면 열려요` / `대주제 1을 마치면 열림` / `Step 1~5를 모두 마쳤어요` / `대주제 1 마무리` / `대주제 2가 열렸어요.` / `!/마치면 열(림|려요)/`(안 그러면 늘 PASS) / `진도를 맞추는 중` / `대주제 1을 마치면 열려요` / `formatGroupTitle(…)` = '대주제 2 · 동사의 현재형'. **그대로**: 잠김 화면 'TOPIC 2를 마치면 열려요'(D6a · D9c) · 구성도 결과 'TOPIC 2가 열렸어요'(D3h) · '5단계를 모두 마치면 완료할 수 있어요.'(D3d) — 앱이 아직 그 글(`passoffUnlock.ts topicWithParticle` · `passoffLearning.ts` — 고침3 일꾼 몫 밖) |
| `drive-topic-admin.cjs` 126 · M1 | `서버에 저장됨` · `1장을 마치면 열립니다` | `진도 저장됨` · `1장을 마치면 열려요` |
| `check-progress-live.mjs` L14c | 구성도 쪽 `TOPIC 3은 아직 열리지 않았어요` | `대주제 3은 아직 열리지 않았어요`(L3 · L6c 잠김 화면 'TOPIC …' 은 그대로 — 위와 같은 까닭) |

### 2-3. 25 대본 쪽 끝 막대

| 도구 | 옛 | 새 |
|---|---|---|
| `lib/expectations.cjs` `neighbours(course)` | 대본 쪽 = 전체 목록(본 + 대본)에서 앞뒤 → d001-1 이전 d001 · 다음 d002 | GRAMMAR I 밖의 대본 쪽은 본 강의(`-N` 뗀 id, 있을 때)의 본 목록 앞뒤 → d001-1 이전 없음 · 다음 d002. `{ old: true }` 또는 `--break=neighbours-old` 로 옛 규칙. 이 함수를 쓰는 drive-generic · check-data-integrity(없는 주소 찾기 — 그대로 맞음) · check-student-unlock(STUDENT 는 대본 쪽 없음) |
| `lib/g2-driver.cjs` `neighbours(id)` | 같음(GRAMMAR II) | 같은 새 규칙 · `--break=neighbours-old` |
| `drive-reading.cjs` lessonData | `getLessonContext(COURSE, id)` 의 prev · next | `getLessonContext(COURSE, canonicalLessonId(COURSE, id))` · `--break neighbours-old` |

### 2-4. 6 READING 4단계(완료 시험 순서)

| 도구 | 옛 | 새 |
|---|---|---|
| `drive-reading.cjs` step4Checks | '읽기 시작' **전**에 문제(`[data-comprehension="questions"]`)가 보여야 PASS | 전: `[data-comprehension="waiting"]` · 문제 0 · '다 읽었어요' 안내 한 줄 → 너무 빠른 '다 읽었어요' **뒤**: 문제 · 차례 · 보기 4개 → 실제로 잰 뒤 새로고침하면 4단계 문제가 **바로**(새 칸). `--break questions-early` = 옛 기대 |
| `check-lesson-questions-0928.cjs` R1 · R3(새) | R1 '재기 전 보임' | R1 '재기 전 문제 없음(기다림 한 줄) · 재는 동안 숨음 · 다 읽었어요 뒤 보임' · R3 'MEASURE_ONCE 로 실제로 잰 뒤 다시 열면 바로 보임' · `--break early` |
| `lib/reading-page.cjs` MEASURE_ONCE | — | 순서 그대로라 고칠 것 없음(설명만) |

### 2-5. 7 GRAMMAR 정답 듣기 자리

| 도구 | 옛 | 새 |
|---|---|---|
| `drive-generic.cjs` openPlayFolds | `main details:not([open])` 를 모두 봄(이제 숨은 위 상자 포함) | ① 화면에 없는 접힘(getClientRects 0)은 건너뜀 ② 접힘 안 플레이어가 '일시정지' 로 남아 있으면(이 드라이버가 앞 소리를 `__kigStop` 으로 일찍 멈춰 앱이 '재생 중' 으로 앎 — 3단계 '문장 듣기' 뒤) 한 번 눌러 풀고 '재생' 을 누름 ③ 기록 `rec.folds`(단계마다 연 접힘 · 푼 것 · 못 연 까닭) ④ **새 칸** 'answer player · 4장 7 · Step 3 end only'(GRAMMAR 본 강의 데스크톱: 3단계 끝 '재생' PASS · 첫 화면 · 1 · 2단계에 없음). **알아 둘 것**: 처음 고친 판은 ②가 없어 3단계 상자의 '재생' 을 한 번도 누르지 못했음(옛 판은 첫 화면 위 상자를 눌렀음) — 내 기록에서 찾아 고침 |
| `lib/g1-page.cjs` · `lib/g2-driver.cjs` | `playerDetails` = `main details[data-answer-player]`(이제 숨은 위 상자) | `main [data-grammar-view] details[data-answer-player]` · `playerRoot`/`player` 를 그 상자 안에서 · `playerOnScreen()` 새로(1 · 2단계 · 채점 전 4단계 false) — 플레이어를 보려면 3단계 탭(pill(3) / pill(2)) 먼저 |
| `drive-common-0926.cjs` D | 1단계에서 `main details[data-answer-player]:not([open]) > summary` | GRAMMAR 는 3단계 탭 → 화면의 접힘을 엶(READING 이 3단계로 가는 줄 옆) · 폭풍 뒤에도 다시 · **못 열면 BLOCKED**(전에는 아무 재생 단추나 누름) |
| `check-top-player.cjs` | 같음 | GRAMMAR 3단계 → 화면의 접힘 · `--tag`(결과 파일 `out/top-player-<tag>.json`) |

### 2-6. 35 ADULT 360 개수 배지

`drive-generic.cjs` `tabText`: 380px 미만은 탭의 `textContent`(배지가 일부러 숨어도 DOM 에 있음), 380px 이상은 전처럼 `innerText`(보여야 함). `--break=badge-innertext` = 옛 규칙. 앱을 바꾸는 안(360 에서도 배지)은 사장님 판단으로 남음 — 이 고침은 어느 쪽이든 PASS(배지가 보이면 textContent 에도 있음).

### 2-7. 고치지 않은 것(까닭)

- `rc-sweep.cjs` · `check-design-rules.cjs`: 바뀐 글 · 이름을 읽지 않음(grep 0).
- 검토 기록 도구(지난 단계의 증거 — 다시 돌릴 일 없으면 그대로): `UI검토-1007/고침/fix-lesson-도구/engine-check.cjs` · `shots.cjs` · `고침/배포뒤-도구/verify-prod.cjs` · `고침2/integrate-b-도구/markers-diff.cjs` · `고침2/통합-도구/probe-c.cjs` · `고침2/fix-list-도구/check-fixlist2.cjs` · `고침2/배포뒤-도구/verify-prod-b.cjs` · `UI검토-1007/verify-dark.cjs` · `회귀점검-1002/단계3/…/s3-대본.cjs` · `s3b.cjs`(이 둘은 10-07 에 없어진 `[data-completion]` 를 읽어 이미 맞지 않음).
  - **통합에 알림**: `markers-diff.cjs` 를 지금 돌리면 '줄어든 표지 12'(서버에 저장됨 · 진도를 서버와 맞추는 중 · TOPIC · 5단계를 모두 마쳤어요 · 단계 새로 풀기 · '1단계 새로 풀기 확인' · 장 듣기 API 의 '이용권 등록') — 모두 고침3 의 뜻한 바뀜. 새 표지는 `lib/ui-1008.cjs` 의 글.
- `check-unlock.cjs` 553 · `check-progress-live.mjs` L3 · L6c · `drive-topic-lock` D6a · D9c · D3h: 앱의 `topicWithParticle`(TOPIC) 이 안 바뀌어 그대로 맞음. 앱이 '대주제' 로 바뀌면 같은 커밋에서 이 줄들도.

## 3. 깨기 시험(로컬 `next start` 3384 · 빈 프로필 · 무료 강의) — PASS → FAIL → PASS

기록: `docs/qa-2026-09-18/out/ui-1007/c-tools-c/logs/<이름>.log`(git 밖 — `out/` 은 .gitignore) · 결과 파일은 `out/features/*-toolsc-*.jsonl` · `out/student-0927/` · `out/voca-0927/` · `out/lesson-questions-0928/` · `out/ui-1007/c-tools-c/*.json` · `out/top-player-toolsc-*.json` · `out/student-titles-live-toolsc-*.json`.
깨기 방법: **앱** = `KIG_BREAK_APP=1008`(쪽을 10-08 전 앱으로 — 1장) · 그 밖은 도구의 `--break`(옛 기대).

| 도구 | ① PASS(로그) | ② 깨기 → 결과(로그) | ③ 다시 PASS(로그) |
|---|---|---|---|
| check-student-0927 (s1-1 · s1-2 · gh1-006) | 23/23 `student0927-pass` | 앱 → **17/23** — C1 · C2 · C2b · C3 · C4 · G1 FAIL `student0927-break` | 23/23 `student0927-repass` |
| gap-checks-0926 P (pr001 · d001 · mv1-01) | PASS 3 `gap-P-pass` | 앱 → **PASS 0 · BLOCKED 3** `gap-P-break` | PASS 3 `gap-P-repass` |
| drive-reading (pr001 · pr001-1 × 데스크톱 · 폰) | FAIL 0(4방문 · 363/82 칸) `reading-pass` | 앱 → pr001 **FAIL 13**(59 이름 · 완료 꺼짐 · 누름 …) `reading-break-app` · `--break questions-early` → **FAIL 1**(4단계 문제) `reading-break-questions` · `--break neighbours-old` pr001-1 → **FAIL 2**(이전 강의) `reading-break-neighbours` | FAIL 0 `reading-repass` |
| check-lesson-questions-0928 (d001 · d001-1 · pr001) | 11/11(R1 새 · R3 새) `questions-pass` | `--break early` → **10/11**(R1 FAIL) `questions-break-early` | 11/11 `questions-repass` |
| drive-generic ld (d001 · d001-1) | FAIL 0 · 59 칸 PASS · d001-1 이전 없음 PASS `gen-ld-pass` | 앱 d001 → completion **BLOCKED**(못 찾음) `gen-ld-break-app` · `--break=neighbours-old` d001-1 → navigation **FAIL** `gen-ld-break-neighbours` | FAIL 0 `gen-ld-repass` |
| drive-generic grammar1 (gh1-006) | FAIL 0 `gen-grammar1-pass`(이때는 3단계 '재생' 을 못 누름 — 2-5 ②를 고친 뒤 `gen-grammar1-folddbg`) | 앱 → 'answer player · 4장 7' **FAIL**(첫 화면 재생) · completion **BLOCKED** `gen-grammar1-break-app` | FAIL 0 · answer player PASS(3단계 재생 PASS · 첫 화면 없음) `gen-grammar1-repass` |
| drive-generic grammar2 (gh2-007 · gh2-007-1) | FAIL 0 `gen-grammar2-pass` | `--break=neighbours-old` gh2-007-1 → navigation **FAIL** `gen-grammar2-break-neighbours` | FAIL 0 · answer player PASS `gen-grammar2-repass` |
| drive-generic phonics · student (mv1-01 · s1-1) | FAIL 0 · 59 칸 PASS `gen-phonics-pass` · `gen-student-pass` | (59 깨기는 ld · grammar1 로 — 같은 코드 줄) | FAIL 0 `…-repass` |
| drive-generic adult (a1-2 데스크톱 · 360) | FAIL 0(360: 빈칸 채우기 · 뜻 보기 PASS) `gen-adult-pass` | `--break=badge-innertext` 360 → **FAIL 2**(빈칸 채우기 · 뜻 보기 — 10-08 운영 확인의 FAIL 그대로) `gen-adult-break-badge` | FAIL 0 `gen-adult-repass` |
| drive-passoff (pg01-1) | PASS(39 칸) `passoff-pass` | 앱 → **FAIL 3**(처음엔 꺼짐 · ①~⑤ 마침 표시 · 다섯 단계 뒤 켜짐) `passoff-break-app` | PASS `passoff-repass` |
| check-voca-0927 (mv1-01) | 8/8 `voca0927-pass` | 앱 → **6/8**(G1 · E1 FAIL) `voca0927-break-app` | 8/8 `voca0927-repass` |
| drive-common A (8과정 목록) | 첫 실행 FAIL 7(옛 도구 잘못 2 — 2-2) `common-A-pass` → 고침 | `--break=group-old` → STUDENT · ADULT · PASS-OFF 목록 **FAIL**(링크 18/82 · 2/55 · 2/67) `common-A-break-group2` | FAIL 0(16칸) `common-A-repass2` |
| drive-common-0926 D (--free 6쪽) | PASS 9 `c0926-D-pass` | 앱 → GRAMMAR 두 줄 **BLOCKED**(정답 플레이어 못 엶) `c0926-D-break-app` | PASS 9 `c0926-D-repass` |
| check-top-player (gh1-006 · gh2-007 — PASS/FAIL 없이 적기만 하는 도구) | 두 쪽 모두 play() → playing `topplayer-pass` | 앱 → 두 쪽 소리 사건 **0** `topplayer-break-app` | play() → playing `topplayer-repass` |
| check-student-titles-live (`--pages /student`) | 11/11 `titles-pass` | `--break=raw-labels` → **7/11**(장 label 4칸 '없음') `titles-break-raw` | 11/11 `titles-repass` |
| lib-probe (g1-page · g2-driver · student-page) | 8/8 `libprobe-pass` | 앱 → **1/8** `libprobe-break-app` · `--break=neighbours-old` → **7/8**(25 FAIL) `libprobe-break-neighbours` | 8/8 `libprobe-repass` |
| static-check (PASS-OFF 이용권 도구 3 + 도구 14의 옛 글) | 29/29 | `--break`(HEAD 의 앱 · 도구) → **2/29** | 29/29(마지막 고침 뒤) |

- 그대로 남은 BLOCKED: drive-reading 데스크톱 'mic'(머리 없는 브라우저에 마이크 없음 — 전부터).
- 실수 1건(적음): 디버깅용 짧은 스크립트(`scratchpad/dbg-fold.cjs`)를 `run.cjs` 없이 한 번 돌려, BASE 가 비어 **운영(k-ig-core.vercel.app) /grammar1/gh1-006(무료) 를 한 번 열었음** — 읽기 · 단계 탭 · 접힘 누르기 시도뿐(쓰기 0 · 완료 누름 0). 그때 harness 가 이용권 원본 프로필을 `%TEMP%\kig-audit-0918-dbgfold` 로 복사했고, 바로 그 사본 폴더를 지움(내가 만든 것만). 뒤로는 모두 `run.cjs` 로.

## 4. 끝내기 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 |
| `check-design-rules.cjs <바꾼 tsx>` | 바꾼 tsx **0개**(앱 파일 안 건드림) — 해당 없음 |
| `generate-azure-ava.mjs --dry-run`(KIG_ENV_LOCAL) | pending **0**(8과정 — student 826 · adult 1,430 · phonics 3,906 · grammar1 1,454 · grammar2 795 · ld 5,152 · reading 3,873 · passoff 1,281) |
| 바꾼 도구 코드 25개 `node --check` · `proof-tests.json` JSON 읽기 | 0 오류(바뀐 파일 26 + 새 `lib/ui-1008.cjs` — `git diff --stat` 357+ · 132−) |
| 사진 | 없음 — 이 일꾼은 화면을 바꾸지 않음(도구만). 로컬 화면은 fix-c1 · c2 · c3 사진 그대로 |
| 로컬 서버 · 브라우저 | 다 쓴 뒤 내 `next start`(3384)만 끔 · 내 사본 브라우저 0. `.next` 는 04:2x 에 이 트리로 다시 빌드했음(통합이 다시 빌드하면 됨) |

## 5. 배포 뒤 운영에서 볼 것(이용권 사본 · 도구와 앱이 **같은 커밋**으로 올라간 뒤)

1. **같은 커밋인지 먼저**: 59 · 17 · 8 · 41 · 6 · 7 · 25 의 도구 고침은 앱 고침3 과 함께 올라가야 함. 앱만 먼저 운영에 있으면 지금 운영(2차)은 옛 이름이라 이 도구들이 BLOCKED/FAIL 이 맞음(`KIG_BREAK_APP=1008` 이 바로 그 모양).
2. **drive-generic** 운영 7과정 표본(`--viewports desktop,mobile,small`): 59 칸 · GRAMMAR 'answer player · 4장 7'(gh1-116 · gh2-044 등 유료) · ld/reading/grammar2 대본 쪽 이전 · 다음(d001-1 · pr001-1 · gh2-007-1) · **ADULT 360 a1-2 · a6-2**(10-08 FAIL 4 가 0 이 되는지). STUDENT · ADULT 완료 누름은 서버 진도 — 되돌림까지 기록 확인(`H.logDataChange`).
3. **drive-reading** 운영 pr001 · pr154(유료 · 이미 완료한 강의면 4단계 문제가 바로 — 'after a reload … at once' 칸).
4. **drive-passoff** 유료 대주제 마지막 강의(pg01-3 등 — 'Step 1~5를 모두 마쳤어요' · name59). `--complete` 는 사장님 허락 때만.
5. **로컬에서 못 돈 PASS-OFF 이용권 도구**: `docs/pass-off-grammar/검사/drive-topic-lock.cjs`(이용권 · 관리자 시험 비밀값을 넣은 로컬 서버가 필요 — 이 일꾼은 이용권 값을 쓰지 않음) · `drive-topic-admin.cjs` · `check-progress-live.mjs` — 고친 글은 static-check 로만 봄(앱 글과 같음 · 옛 글 0). 처음 돌릴 때 D1 · D2a~d · D3a · D3g · D4a · D4b · D8a · D9a · M1 · L14c 가 PASS 인지, **D6a · D9c · D3h · L3 · L6c**(앱이 아직 'TOPIC N…' — topicWithParticle)는 앱이 그대로인 동안 PASS 가 맞음.
6. **check-student-titles-live** 운영 3화면(유료 강의 쪽까지 — `--pages` 없이).
7. **drive-common-0926** 운영(이용권) D · **check-top-player** 운영 GRAMMAR.

## 6. 남은 것 · 알림(앱 쪽 — 내 몫 아님)

- 앱이 아직 옛 꼴인 글(도구는 지금 앱에 맞춰 둠, 바뀌면 같은 커밋에서 도구도): `src/lib/passoffUnlock.ts topicWithParticle`('TOPIC 2를 마치면 열려요' · 'TOPIC 2가 열렸어요') · `src/lib/passoffLearning.ts`('5단계를 모두 마치면 완료할 수 있어요.') · `src/lib/vocaLearning.ts`('2단계 퀴즈를 …' — check-voca-0927 이 읽음) · `src/lib/readingLearning.ts`('4단계에서 …') · **`src/components/LessonPaywall.tsx:90` '{N}장은 앞 장을 마치면 열립니다'**(41 의 해요체가 이 잠김 화면에는 아직 — check-progress-live L10 이 이 글을 기대함).
- ADULT 360 배지(35): 도구는 어느 쪽이든 맞게 고침 — 앱에서 배지를 360 에도 보일지는 사장님 판단 그대로.
- `markers-diff.cjs`(고침2 통합 도구)를 고침3 통합에 다시 쓰면 '줄어든 표지 12' 가 나오는 것이 정상(2-7).
- 같은 AI 계열이 고치고 시험했습니다. 독립 검수가 아닙니다.
