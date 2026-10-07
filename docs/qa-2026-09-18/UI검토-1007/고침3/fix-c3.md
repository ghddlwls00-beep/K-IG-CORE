# 고침3 fix-c3(공통 부품) — 2026-10-08

- 가지 `claude/regression-check-1002-8d4817` · HEAD `dc68238e` 위 작업 트리(다른 일꾼과 같은 트리 — 사진에는 그들의 바뀜도 함께 보임).
- 커밋 · 푸시 · `git add` · `git stash` 안 함. `content/` · 점검 도구(`docs/qa-2026-09-18/scripts/*` · `docs/pass-off-grammar/검사/*`) 안 건드림. 영어 글 바뀜 0. `.env.local` · 이용권 값 출력 0.
- 로컬 `next dev -p 3383`(미디어 · 이용권 · 진도 저장소 값 없음) · 브라우저 디버깅 9976 하나 · 띄우기 전 남은 메모리 1.2GB 아래면 1분씩 기다림(0.70~1.11GB 에서 5~6번 기다림). GET 아닌 `/api/` 요청 막음(막은 쓰기 0). 끝난 뒤 내 dev 서버만 끔.
- **같은 AI 계열이 고치고 검사했습니다. 독립 검수가 아닙니다.**

## 1. 번호별

| # | 결과 | 무엇 |
|---|---|---|
| 59 | **고침 ✓** | 끝 막대 '이 강의 학습 완료' 단추 이름 = 보이는 글. aria-pressed 뺌(상태는 이름 하나로만 읽힘). 도구용 표지 `data-lesson-complete` 더함. 6과정 · STUDENT · ADULT 모두 같은 부품(LessonEndBar) 하나라 한 번에 적용. 꺼진 때 이유 한 줄(`aria-describedby`)은 그대로 |
| 17 | **고침 ✓(내 몫 파일)** · 일부 남음 | 아래 3장 표. 남은 것: PASS-OFF 끝 막대 이유 줄 `'5단계를 모두 마치면 완료할 수 있어요.'`(`src/lib/passoffLearning.ts:42` — 내 몫 아님) · VOCA 이유 줄 `'2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요.'`(VOCA 파일 — 내 몫 아님) |
| 42 | **고침 ✓(내 몫 파일)** | STUDENT · ADULT 고른 칩('가림/영어/해석/모두' · '0.7×~1.2×')과 PASS-OFF 고른 칩('기본/크게/특대' · '1.0×/0.85×' — 강의 · 복습 둘 다)에 어둠 `ring-1 ring-line-input`(단계 탭과 같은 색 rgb(110,106,101)). 글은 14px(text-label) · 코딩 글꼴 아님 — 원래 그대로. '전체' 거르기 칩은 `CourseDashboard.tsx`(내 몫 아님) |
| 13 | 손대지 않음 | 지시대로(출시 뒤) |
| 4장 8 | **글만 고침**(내 몫 파일) | 'TOPIC N' 글 4곳 → '대주제 N'. `curriculumPresentation` 안 씀. 남은 것: `topicWithParticle()`(`src/lib/passoffUnlock.ts:432` — 'TOPIC 2가 열려요' · 'TOPIC 1을 마치면 열려요' 를 만듦, 내 몫 아님) · 잠금 화면 '지금 학습할 대주제' 아래 이름은 데이터(`current.label` = 'TOPIC 1. 인칭')라 손대지 않음 → fix-c2 의 함수가 맡을 일 |
| 7장 '앱만' | 내 몫 파일에 있는 것 = 42 하나(위) | 16 · 20 · 37 · 46 · 55 · 12 는 다른 파일(`[lesson]/page.tsx` · `LessonStepNavigation` · `LessonBody` · VOCA · 검색) |

## 2. 59 — 옛 이름 → 새 이름 (도구 고칠 때 이대로)

| 상태 | 옛 `aria-label` | 옛 `aria-pressed` | 새 `aria-label` | 새 `aria-pressed` | 새 `data-lesson-complete` |
|---|---|---|---|---|---|
| 완료 전(꺼짐 · 켜짐 둘 다) | `학습 완료 체크` | `"false"` | `이 강의 학습 완료` | **없음** | `todo` |
| 완료함(취소 가능) | `학습 완료 취소` | `"true"` | `학습 완료함 · 취소하려면 누르세요` | **없음** | `done` |
| PASS-OFF 완료함(`undo: false`) | 단추 없음 — `<p role="status">학습 완료함</p>` | — | 그대로(단추 없음) | — | 없음(단추가 아니라서) |

- 보이는 글은 그대로: '이 강의 학습 완료' / '✓ 학습 완료함 · 취소하려면 누르세요'. 꺼짐 · 테두리 모양(55)도 그대로.
- 위치: `src/components/LessonEndBar.tsx:24-25`(상수 `TODO_NAME` · `DONE_NAME`), 단추 `:156-157`(`aria-label` · `data-lesson-complete`), 보이는 글 `:171`.
- 왜 '이 강의 학습 완료 취소' 가 아닌가: 완료한 뒤 보이는 글이 '학습 완료함 · 취소하려면 누르세요' 라, 그 글로 시작하지 않는 이름은 다시 음성 조작이 실패함(같은 문제). 두 상태의 보이는 글이 이미 달라 이름만으로 상태가 읽히므로 aria-pressed 를 뺌.
- 도구가 찾기 쉬운 표지: `section[aria-label="강의 마치기"] button[data-lesson-complete="todo"|"done"]`(이름이 다시 바뀌어도 그대로).

### 이 이름으로 단추를 찾는 도구 — 다음 단계 일꾼이 같은 커밋에서 고칠 곳(파일:줄, 지금 글)

| 파일:줄 | 지금 | 바뀌면 |
|---|---|---|
| `docs/qa-2026-09-18/scripts/check-student-0927.cjs:167` | `button[aria-label="학습 완료 체크"]` | 못 찾음 |
| 같은 파일 `:188` · `:197` | `button[aria-label="학습 완료 취소"]` 개수 1 | 0 → FAIL |
| 같은 파일 `:233` · `:238` | `main button[aria-label="학습 완료 체크"]` / `"…취소"` 누름 | 못 누름 |
| `docs/qa-2026-09-18/scripts/gap-checks-0926.cjs:121` · `:132` · `:146` | `button[aria-label="학습 완료 체크"][disabled]` | 못 찾음(꺼짐 판정 틀림) |
| 같은 파일 `:153` · `:154` · `:161` | `"학습 완료 체크"` 누름 · `"학습 완료 취소"` 있음 · 누름 | P 항목 BLOCKED/FAIL |
| `docs/qa-2026-09-18/scripts/drive-reading.cjs:658` | `completeBtn` = 두 옛 이름 | null |
| 같은 파일 `:718` · `:1388` · `:1464` · `:1465` | 기대값 `"학습 완료 체크"` / `"학습 완료 취소"` | 새 이름으로 |
| `docs/qa-2026-09-18/scripts/drive-generic.cjs:1320` | STUDENT · ADULT: `/^학습 완료 (체크|취소)$/` 를 aria-label 에 | 못 찾음 |
| 같은 파일 `:1321` | 다른 과정: `/학습 완료|완료 체크/` 를 aria-label + 글에 | 그대로 맞음(새 이름에도 '학습 완료') |
| 같은 파일 `:1343` · `:1405` | `/취소/.test(…)` 로 '이미 완료' · '완료됨' 판정 | 새 완료 이름에도 '취소' 있음 — 그대로 맞음 |
| `docs/qa-2026-09-18/scripts/drive-passoff.cjs:114` · `:476` | `button[aria-label^="학습 완료"]` | 완료 전 이름이 '이 강의 …' 로 시작 → 못 찾음 |
| `docs/pass-off-grammar/검사/drive-topic-lock.cjs:163` · `:274` | 두 옛 이름 | 못 찾음 |
| 같은 파일 `:433` · `:443` | `button.label === "학습 완료 체크"` | 새 이름으로 |
| `docs/qa-2026-09-18/scripts/lib/g1-page.cjs:114` | 두 옛 이름 | null |
| `docs/qa-2026-09-18/scripts/lib/student-page.cjs:280` | `S.aria("학습 완료 체크") || S.aria("학습 완료 취소")` | null |
| `docs/qa-2026-09-18/scripts/proof-tests.json:178` · `lib/voca-page.cjs:4` · `lib/reading-page.cjs:4` · `lib/ld-page.cjs:4` · `drive-reading.cjs:15` · `drive-generic.cjs:1305 · 1307 · 1311` · `gap-checks-0926.cjs:115 · 128 · 140` | 설명 글의 옛 이름 | 글만 |
| 검토 기록 쪽(도구 아님, 다시 쓸 때만): `UI검토-1007/고침/fix-lesson-도구/engine-check.cjs:27-67` · `shots.cjs:22` · `고침2/integrate-b-도구/markers-diff.cjs:13`(표지 목록에 옛 이름 — 돌리면 '줄어든 것' 2로 셈) | | |

aria-pressed 를 끝 막대 단추에서 읽는 도구는 찾지 못함(`grep aria-pressed` — 모두 단계 탭 · 칩 · 재생 단추).

## 3. 17 · 4장 8 — 바뀐 화면 글 전부(옛 → 새)

| 파일:줄 | 옛 | 새 | 이 글을 읽는 도구 |
|---|---|---|---|
| `src/components/passoff/RuleStep.tsx:84` | 1단계에서 먼저 떠올린 문장만 영어로 보여요. | Step 1에서 먼저 떠올린 문장만 영어로 보여요. | 없음 |
| `RuleStep.tsx:85` | (단추) 1단계로 | Step 1로 | `UI검토-1007/고침2/통합-도구/probe-c.cjs:123`(검토 기록 — `innerText === '1단계로'`) |
| `src/components/passoff/WrapUpStep.tsx:166` | 강의 완료 — 5단계를 모두 마쳤어요. | 강의 완료 — Step 1~5를 모두 마쳤어요. | `drive-topic-lock.cjs:443`(`!step5.includes("강의 완료 —")` — 그대로 맞음) · `:449`('강의 완료' — 그대로 맞음) |
| `WrapUpStep.tsx:169` | …&lsquo;처음부터 다시 하기&rsquo;로 5단계를 다시 마치면 기록돼요. | …로 Step 1~5를 다시 마치면 기록돼요. | 없음 |
| `WrapUpStep.tsx:212` | 5단계를 모두 마쳤어요. | Step 1~5를 모두 마쳤어요. | **`drive-passoff.cjs:402`** `/5단계를 모두 마쳤어요/` · **`drive-topic-lock.cjs:270`** `includes('5단계를 모두 마쳤어요')`(166 줄 글도 이것으로 잡았음) · **`check-wrongspot-hangul-1004.cjs:409`** `/다음 단계: 마무리|5단계를 모두 마쳤어요/`(앞쪽 '다음 단계: 마무리' 는 그대로라 거기서 멈춤 — 영향 적음) · `markers-diff.cjs:14`(검토 기록) |
| `WrapUpStep.tsx:221` | (단추) {n}단계로 가기 | Step {n} 마저 하기 | 없음 |
| `WrapUpStep.tsx:174` · `:181` | TOPIC {n} 마무리 — 구성도 다시 채우기 | 대주제 {n} 마무리 — 구성도 다시 채우기 | **`drive-topic-lock.cjs:458`** `entry.text.includes("TOPIC 1 마무리")` |
| `src/components/passoff/TopicLock.tsx:166` | …그 강의 5단계 끝의 &lsquo;처음부터 다시 하기&rsquo;로… | …그 강의 Step 5 끝의 …로… | 없음 |
| `TopicLock.tsx:180` | (단추) TOPIC {n} 강의 보기 | 대주제 {n} 강의 보기 | 없음 |
| `src/components/passoff/MapEntry.tsx:35` | (목록 링크) TOPIC {n} 구성도 다시 채우기 | 대주제 {n} 구성도 다시 채우기 | 없음(`data-passoff-map-next` 로 찾음) |
| `src/components/StudentLearningView.tsx:1470` | 단계 탭 nav 이름 `STUDENT 3단계 학습` · `ADULT 5단계 학습` | `학습 단계`(PASS-OFF 와 같음) | 없음(`lib/student-page.cjs:125 · 161` 의 옛 `nav[aria-label="학습 단계"]` 가 이제 STUDENT 에도 맞음 — 옛 도우미) |
| `src/components/AdultWordsStep.tsx:373` | 이 강의에는 핵심 어휘가 없어요. 다음 단계로 넘어가세요. | …다음 Step으로 넘어가세요. | 없음 |

그대로 둔 것(숫자 없는 '단계' — 등급과 헷갈리지 않음, 도구가 읽음): `다음 단계: 문법 설명 · 형태 찾기 · 영작 · 마무리`(AnchorsStep · RuleStep · FormStep · ComposeStep — `drive-passoff.cjs:323` · `check-wrongspot-hangul-1004.cjs:409` 가 '다음 단계: 마무리' 를 읽음) · '이 단계 마침'(PassoffLearningView) · '강의를 마치려면 남은 단계를 끝내 주세요.' · '이 단계의 문장'(STUDENT 내 정보).

**내 몫 밖이라 건너뛴 것(제안 그대로 적음)**
- `src/lib/passoffLearning.ts:42` `PASSOFF_GATE_REASON = "5단계를 모두 마치면 완료할 수 있어요."` → `"Step 1~5를 모두 마치면 완료할 수 있어요."`(쓰는 곳은 PassoffLearningView 하나). 읽는 도구: `drive-topic-lock.cjs:433` · `markers-diff.cjs:14`. 지금은 PASS-OFF 끝 막대 이유 줄만 '5단계' 로 남음(Step 5 화면 글은 'Step 1~5').
- VOCA 이유 줄 '2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요.'(VOCA 쪽 파일).
- `src/lib/passoffUnlock.ts:432` `topicWithParticle()` — 'TOPIC N이/가 · 을/를 · 은/는'. 'TOPIC' → '대주제' 로 바꾸면 조사 규칙은 같음(숫자 읽기). 읽는 도구: `docs/pass-off-grammar/검사/check-unlock.cjs:553` · `drive-topic-lock.cjs:371 · 508 · 561` · `check-progress-live.mjs:217`.

## 4. 바꾼 파일(앱 8 · 모두 내 몫)

`src/components/LessonEndBar.tsx` · `src/components/StudentLearningView.tsx` · `src/components/AdultWordsStep.tsx`(StudentLearningView 안에서만 씀) · `src/components/passoff/RuleStep.tsx` · `src/components/passoff/WrapUpStep.tsx` · `src/components/passoff/TopicLock.tsx` · `src/components/passoff/MapEntry.tsx` · `src/components/passoff/ui.tsx`

안 바꿈: `StepTabs.tsx` · `PassoffLearningView.tsx` · `Toggle.tsx` · `learning/ReviewSession.tsx` · `src/lib/passoffView.ts` · `src/lib/lessonGate.ts`(바꿀 것 없음).

새 검토 기록: `docs/qa-2026-09-18/UI검토-1007/고침3/fix-c3.md`(이 문서) · `고침3/fix-c3-도구/probe-c3.cjs`.

## 5. 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0(고친 뒤 · 끝에 다시 — 다른 일꾼 바뀜 포함 트리) |
| `check-design-rules.cjs` 바꾼 tsx 8 `--zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion,emoji` | 모두 0 · exit 0 |
| `generate-azure-ava.mjs --dry-run`(KIG_ENV_LOCAL) | pending 0(8과정 모두 0) |
| `fix-c3-도구/probe-c3.cjs`(로컬 3383 · 빈 프로필) | **8/8 PASS** — 59 VOCA 꺼짐 · VOCA 완료(이 기기 기록) · STUDENT 꺼짐(이름 = 보이는 글 · aria-pressed 없음 · 이유 줄 그대로) / 17 STUDENT nav 이름 · PASS-OFF Step 2 글('N단계' 0) · 'Step 1로'(Enter → 초점 Step 1 탭, 14 동작 그대로) / 42 STUDENT · PASS-OFF 어둠 고른 칩 ring |
| 같은 도구 `--break`(읽기 직전 DOM 을 옛 모양으로: 옛 이름 + aria-pressed · 'STUDENT 3단계 학습' · ring 뺌 · '1단계로') | **0/8 PASS — 8칸 모두 FAIL**(검사가 실패할 수 있음) |
| 기록 | `out/ui-1007/c-fix-c3/뒤/probe-c3.json` · `break/probe-c3.json` |

못 본 것: 점검 도구(drive-generic · drive-reading · drive-passoff · drive-topic-lock · check-student-0927 · gap-checks)는 **돌리지 않음** — 지금 그대로 돌리면 2장 · 3장의 줄에서 FAIL/BLOCKED 가 나는 것이 정상(도구는 다음 단계 일꾼 몫). 이용권 쪽 화면(PASS-OFF Step 5 끝 · 구성도 줄 · 잠금 화면 · STUDENT 완료함)은 빈 프로필이라 사진 없음.

## 6. 사진(git 밖, `docs/qa-2026-09-18/out/ui-1007/c-fix-c3/`)

- **전** = `전/<밝음|어둠>/<phone|desktop>/…` — 통합(고침2)이 HEAD 와 같은 코드로 찍은 `after-local-b/` 사진을 복사(내가 HEAD 를 따로 띄우지 않음 · 메모리). 설정 칩(`passoff_pg01-1_settings`)은 전 사진 없음. VOCA 끝 막대 전은 완료 전 상태(`voca_mv1-01_endbar-todo`), 뒤는 완료한 상태(`voca_mv1-01_endbar-done`) — 59 는 화면 모양이 안 바뀌는 고침이라 사진보다 숫자(probe-c3.json)가 증거.
- **뒤** = `뒤/<밝음|어둠>/<phone|desktop>/…`(390 · 1366):

| # | 전 | 뒤 |
|---|---|---|
| 17 PASS-OFF Step 2 | `전/밝음/phone/passoff_pg01-1_step2.jpg` | `뒤/밝음/phone/passoff_pg01-1_step2.jpg`('Step 1에서 …' · 'Step 1로') |
| 42 PASS-OFF 칩(어둠) | — | `뒤/어둠/phone/passoff_pg01-1_settings.jpg` · `뒤/어둠/desktop/…_settings.jpg` |
| 42 STUDENT 칩(어둠) | `전/어둠/phone/student_s1-1_step1.jpg` | `뒤/어둠/phone/student_s1-1_step1.jpg`('1×' · '가림' 테두리) |
| 59 끝 막대 | `전/*/student_s1-1_endbar.jpg` · `전/*/voca_mv1-01_endbar-todo.jpg` | `뒤/*/student_s1-1_endbar.jpg` · `뒤/*/voca_mv1-01_endbar-done.jpg`(모양 같음) |
| 깨기 | | `break/…`(같은 쪽, 옛 DOM 으로 되돌린 뒤) |

사진 아래 왼쪽의 'N' 동그라미는 `next dev` 표시(운영에는 없음).

## 7. 배포 뒤 운영에서 볼 것

1. **도구와 같은 커밋인지**: 59 이름 · 17 글이 바뀌었으므로 2장 · 3장의 도구를 고친 커밋과 함께 올라가야 함. 그 전에 운영 드라이버를 돌리면 완료 단추 항목이 BLOCKED/FAIL.
2. 이용권 사본으로: STUDENT s1-1 · ADULT a1-2 · GRAMMAR · READING · LISTENING · VOCA 각 1강의 끝 막대 — 완료 전 이름 '이 강의 학습 완료', 누른 뒤 '학습 완료함 · 취소하려면 누르세요', aria-pressed 없음(접근성 트리), 다시 눌러 되돌림(STUDENT · ADULT 는 서버 진도 — 되돌림까지 확인).
3. PASS-OFF 이용권 쪽: 대주제 마지막 강의 Step 5 끝 '대주제 1 마무리 — 구성도 다시 채우기' · 'Step 1~5를 모두 마쳤어요' · 남은 단계 단추 'Step N 마저 하기' · 목록 '대주제 N 구성도 다시 채우기' · 잠금 화면 '대주제 N 강의 보기' · 'Step 5 끝의'. 이 화면에 'TOPIC N을 마치면 열려요'(topicWithParticle) 와 '대주제 N' 이 섞여 보이는 것은 남은 일(3장 끝).
4. 어둠 360 · 390: STUDENT · ADULT 고른 칩 · PASS-OFF 글자 크기 · 문장 속도 · 복습 화면 같은 칩에 얇은 테두리.
5. 실제 화면 읽기(VoiceOver · TalkBack) · 음성 조작으로 '이 강의 학습 완료' 를 말해 눌리는지(여기서는 흉내 · 속성만 봄).
