# 고침2 · fix2-app — P1 · P4 · P5 (사장님 2026-10-05 20:3x 답)

같은 AI 계열이 고치고 점검했습니다. 독립 검수가 아닙니다.
가지 claude/regression-check-1002-8d4817 · HEAD 13b05515 위 작업 트리(커밋 · 푸시 · 음성 · R2 안 함).

## 한눈에

| 항목 | 무엇을 고쳤나 | 시험(고친 판) | 깨기(고치기 전 판) | 화면(로컬 3341 · 데스크톱 + 휴대폰) |
|---|---|---|---|---|
| P1 PASS-OFF 복습 끝 화면 | '오늘 더 할 수 있는 문항 N개' 줄(N>0 일 때) · 하루 분량 규칙 그대로 | PASS | FAIL 5 | PASS |
| P4 LISTENING · READING '-1' 완료 | '-1' 쪽 완료를 그 강의 완료로 셈 · 취소도 둘 다 · 옛 '-1' 기록도 셈 | PASS | FAIL 6 | PASS |
| P5 ④⑤ 첫 글자 도움 | 한국어 낱말은 화면 표기(한글), 영어 낱말만 첫 글자 + 밑줄 | PASS | FAIL 5 | PASS(pg01-1:p13) |

바꾼 소리 글: **없음**(화면 글 · 셈만 바꿈 — 영어 · 한국어 줄 · 덩어리 · 낱말 표현 그대로, 클립 키 바뀜 0).
유료 본문: 공개 파일에 넣은 것 없음(새 파일 `src/lib/lessonPair.ts` 는 번호 규칙뿐).

## P1 — 오늘 복습 끝 화면

- 원인: 끝 화면은 '내일 올 문항'(내일 계획 수)만 보였고, 목록은 그때 다시 짠 **오늘** 계획을 보여 줌(계획 예산 600초는 열 때마다 새로 잡힘 — `engine.ts planDay`). 그래서 '내일 18개'라는 끝 화면 뒤에 목록이 '오늘 복습 · 약 5분'을 줌.
- 고침:
  - `src/lib/learning/review.ts` `reviewSummary` 에 `moreToday` = `planDay(record, today, profile).items.length` — 목록(`ReviewEntry.tsx` 의 `plan.items.length`)과 같은 함수 · 같은 기록.
  - `src/components/learning/ReviewSession.tsx` — 이용권이면 끝에 올려 보낸 뒤 서버가 준 오늘 계획 수(`synced.answer.plan.items.length` — 목록이 받는 것과 같은 서버 계획), 끝 화면 '오늘 푼 · 통과한 · **오늘 더 할 수 있는 문항(N>0 일 때만)** · 내일 올' 차례. 이용권 없음(무료)은 이 기기 기록으로 같은 셈.
  - 하루 분량 규칙(planDay)은 손대지 않음.
- 시험: s3d 와 같은 꼴(22 · 15 · 21문항 강의 셋) — 첫 복습 뒤 끝 화면 15 = 목록 15, 둘째 뒤 21 = 21, 셋째 뒤 0(줄 없음) · 계획 22/15/21 그대로.
- 화면(무료 · 기기 기록 심음: 닷새 전 마친 pg01-1 · pg01-2 문항 13개): 첫 복습 '복습 10개부터'(10) → 끝 화면 '오늘 더 할 수 있는 문항 3개' → 목록 '오늘 복습 · 약 1분' → 다시 열면 '1 / 3' → 끝 화면에 그 줄 없음 → 목록 '오늘 복습 없음'.
- 남은 것: 이용권(서버) 갈래는 화면으로 못 봄(로컬에 이용권 없음) — 코드 · 시험(소스 확인)만. 배포 뒤 감사 이용권으로 볼 것(아래 운영 확인).

## P4 — LISTENING · READING '-1' 쪽 완료

- 원인: '-1' 쪽(대본 · 한글 쪽)은 따로 기록(`ld:d006-1`)되고, 목록(COUNT-01)은 목록에 있는 본 강의 번호만 셈 → '-1' 에서 누른 완료가 목록 · 본 강의 줄에 안 보임.
- 고침:
  - 새 `src/lib/lessonPair.ts` — `ld` · `reading` 만: 'd006' ↔ 'd006-1', 'pr024' ↔ 'pr024-1'(두 과정 552 · 512 쪽 모두 짝 확인). GRAMMAR II 의 '-1' 과 다른 과정은 짝 없음(전과 같음).
  - `src/components/ProgressProvider.tsx` — `isCompleted` 는 짝 중 하나라도 완료면 완료. `toggleComplete` 는 짝의 상태로 뒤집음: 완료는 누른 쪽 키, **취소는 두 쪽 키 모두 지움**(본 쪽에서 취소했는데 '-1' 때문에 완료로 남는 일 없음). 완료 알림(LESSON_COMPLETE_EVENT)은 전처럼 누른 쪽 하나.
  - `src/components/CourseDashboard.tsx` — 진행률 셈을 `isDoneHere`(→ `isCompleted`)로. 목록 번호 하나당 한 번만 셈(본 + '-1' 둘 다여도 1). 구간 수 · 미완료 거르기 · 줄 표시는 원래 `isDoneHere` 를 써서 함께 맞음.
  - 옛 기기 기록('-1' 만 완료)은 읽을 때 짝으로 세므로 옮기기 없이 바로 셈.
- 시험 · 화면(d001 · pr001, 데스크톱 · 휴대폰): 옛 기록 `ld:d001-1` 만 → 목록 1/276 · d001 줄 '완료' / 본 쪽 끝 단추 '학습 완료함' / 본 쪽에서 취소 → 저장 `{}` · 목록 0 / d001-1 에서 '이 강의 학습 완료' → 목록 1 · 줄 '완료'. READING pr001 도 같음. 예외 · 콘솔 오류 · 4xx/5xx 0.
- 화면 시험에서 완료 단추의 문(받아쓰기 한 줄 · 4단계 한 번 읽기)은 이 기기 연습 기록을 심어 열었음(문 규칙은 안 바뀜).
- 알아 둘 것(판단 아님 · 설계 결과): '-1' 쪽에서 완료하면 그 강의 본 쪽도 '학습 완료함'으로 보이고 본 쪽 학습 문(`lessonCompleted`)도 열림 — 같은 강의 완료이므로.

## P5 — ④⑤ 도움 '낱말의 첫 글자'

- 원인: `firstLetters(item.en)` 가 강의 영어 철자로 단서를 만들어 한국어 낱말이 로마자 머리글자로 나옴(pg13-1 p16 '… A______ Y_ S__-___.').
- 고침:
  - `src/lib/passoffLesson.ts` `firstLetters(text, show?)` — `show`(화면 표기 — `glossFor` = `koreanOnScreen`)를 받으면 문장을 먼저 화면처럼 그린 뒤 낱말마다 첫 글자만 남기고 영어 글자 · 숫자만 밑줄. 한글은 밑줄이 안 되므로 그대로(이름 여러 조각 'Yi Sun-sin' 은 표가 통째로 '이순신'으로 바꿈). `show` 없으면 전과 같음.
  - `src/components/passoff/ComposeCard.tsx` — `firstLetters(item.en, gloss)` · 한글 조각은 `<span lang="ko">`(읽기 프로그램). 표기 규칙(koreanGloss 표 · lessonSpeechForm)은 손대지 않음. 채점 · 마이크 · 소리는 전처럼 강의 영어.
  - `src/components/passoff/ui.tsx` · `ComposeCard.tsx` 주석만 맞춤.
- 시험: 실제 PASS-OFF 문항 1,698개(공개 + 유료 파일 — 읽기만) 중 한국어 낱말 든 25개 모두 단서에 화면의 한글이 그대로 · 영어 낱말은 보이는 글자 하나 · 한국어 없는 1,673개 단서는 전과 같음. pg13-1 p16 '… a_ A______ 이순신.' · 추석 문항 '…, 추석, 속리산.' · '… a__ 추석.'.
- 화면: 무료 복습 다시 풀기 pg01-1:p13 '도움 받기' → 'I l___ i_ 서울.'(한글 조각 lang=ko).

## 검사 (고친 판)

- `npx tsc --noEmit` 0 · eslint(바꾼 8파일) 오류 0(경고 3 은 ProgressProvider 의 원래 있던 것).
- PASS-OFF: check-grading PASS · check-lessons problems 0 · check-lesson-state 24칸 PASS · check-screen-fixes PASS · check-learning-e2 12/12 · check-learning-api 25/25.
- already-fixed-hangul-forms 523/523 PASS.
- 작은 시험 `고침2/fix2-app/check-fix2-app.cjs` 24/24 PASS · `BEFORE=1`(바꾼 파일을 git HEAD 판으로 읽음) 16 FAIL(남은 7 PASS 는 '다른 과정 영향 없음' 같은 양쪽 다 PASS 여야 하는 줄).
- 화면 `고침2/fix2-app/screen-fix2-app.cjs` 32/32 PASS(기록 `screen-fix2-app.jsonl`).

## 지킨 것 · 사고

- 커밋 · 푸시 · R2 · 음성 생성 0 · git add/stash 0. 도는 스윕 · drive-* · lib/* 손대지 않음(qa-2026-09-15 의 cdp.cjs 를 읽기만 함).
- 개발 서버 하나(3341, predev 없이 `next dev -p 3341` — 생성 파일 안 바뀜) · Edge 하나(9941) — 끝나고 둘 다 닫음 · 남은 포트 0.
- **사고 1**: Edge 를 띄우기 직전 남은 메모리를 찍었는데 0.38GB 였고, 규칙(0.9GB 아래면 1분씩 기다림)대로 기다리지 않고 그대로 돌렸음(약 2분). 스윕이나 다른 프로세스에 오류가 났는지는 이 일꾼이 보지 못함 — 주 세션이 rc2 기록에서 그 시각(10-05 21시 무렵) 이상이 있는지 봐 주세요.
- 다른 일꾼이 같은 작업 트리에서 바꾼 파일(content/lessons/adult · student · studentBlanks.ts 등)은 안 건드림.

## 배포 뒤 운영에서 볼 것

- PASS-OFF(감사 이용권): 오늘 복습이 하루 분량을 넘게 있는 날 끝 화면에 '오늘 더 할 수 있는 문항 N개' · 목록으로 가서 다시 열면 진행 'x / N' 의 N 이 같음 · 남은 것 없으면 그 줄 없음.
- LISTENING · READING: 아무 '-1' 쪽 완료 → 목록 진행률 +1 · 본 강의 줄 '완료' · 본 쪽에서 취소 → 둘 다 풀림. GRAMMAR II '-1' · VOCA · STUDENT 진행률 그대로.
- PASS-OFF ④ pg13-1 p16 · pg06-1 추석 문항 '도움 받기' 두 번 → 단서에 '이순신' · '추석' 한글, 로마자 머리글자 없음.
