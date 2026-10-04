# 회귀 점검 1002 · 단계 0 · passoff-sweep — PASS-OFF GRAMMAR 전 쪽 스윕 드라이버 (2026-10-04)

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 포트 9720~9729 만 씀 · 브라우저(Edge) 한 번에 하나 · 이용권 코드 · PIN 타이핑 0 ·
/api/license/ 상태 바꾸는 호출 0 · /api/admin/ 0 · 내용(content/ · src/) 안 바꿈 · 커밋 · 푸시 · R2 · 배포 안 함 · '이 강의 학습 완료' 안 누름(서버 완료는 되돌릴 수 없음).

## 1. 먼저 있던 것 (조사)

| 도구 | 무엇을 보나 | 운영에 대고? | 전 쪽 × 3화면? | 깨기 기록 |
|---|---|---|---|---|
| `scripts/drive-generic.cjs --course passoff-grammar` | 쪽을 열고 단추를 한 번씩 누름 | 됨(MARKERS · validRoutes 에 있음 — dry-run 201 방문) | 열기만 | — |
| `docs/pass-off-grammar/검사/drive-focus.cjs` | 포커스 이동 · 단추 이름(F1~F5) | **안 됨** — 로컬만(`로컬 서버에만 씁니다` 로 멈춤) | 아님(390 하나) | 머리 주석 `--break=no-focus · same-name` |
| `검사/drive-review.cjs` | 오늘 복습 · 오답노트 · '내 답도 맞아요' 한 바퀴 | 로컬 운영 빌드(이용권 · R2 없이) | 아님 | `--break=no-seed · no-report` |
| `검사/check-learning-e2.cjs` | 학습 API · 연습 · 오답노트 · 구성도 채점(트랜스파일한 route) | 브라우저 없음 | — | `--break=` 15가지 · `--prove-breaks` |
| `검사/check-screen-fixes.cjs` | ④ 타일 · 보기 순서 · 짝 순서(67레슨 데이터) | 브라우저 없음 | — | `--prove-breaks` — **오늘 돌림: 안 깬 판 exit 0 · 깨기 5가지 모두 exit 1** |
| `검사/check-grading.cjs` · `check-lessons.cjs` | 채점기 · 레슨 데이터 | 브라우저 없음 | — | 오늘 돌림: 둘 다 PASS(exit 0) |
| `검사/coverage.cjs` | 교재 추출본의 한국어 번역 비율(만들 때 쓴 것) | 사이트 검사 아님 | — | — |

**drive-generic 이 이 과정을 '판정' 못 하는 까닭**: `lib/expectations.cjs` `expected()` 에 passoff-grammar 갈래가 없어 기대 글 0 · 정답 0
(그래서 돌리면 '글 0/0' — 거짓 통과가 됨). 또 ①~⑤ 를 차례로 끝내는 길(① '영어 보기' 2초 깸 · ③ 낱말 + 이름표 · 보기 · 짧은 칸 ·
④ 문장 줄 · 세트 · 되풀이 · ⑤ 규칙 다시 확인)이 없다. 위 도구들은 모두 로컬 · 데이터 쪽이라 **운영 화면을 전 쪽 × 화면으로 끝까지 본
도구는 없었다** → 새 드라이버를 만듦.

## 2. 만든 파일 (둘 다 새 파일 — 남의 파일은 안 고침)

- `docs/qa-2026-09-18/scripts/lib/passoff-expect.cjs` (170줄) — 기대: 레슨 파일 → (이용권) 유료 보충 `attachPaidItems` → `viewBlocks`
  (src/lib/passoffContent.ts 와 같은 차례) → 쪽마다 한글 표기 `koreanOnScreen`. 기대 글(단계 · 종류별), 넣을 답(레슨 철자 · 화면대로 한글 꼴),
  문항마다 소리 클립(speakAs|en → lessonSpeechForm → vocaSpeechForm → unifiedSpeechPath), 로마자 한국어 낱말 판정 `romanOnScreen`
  (그 쪽 표의 철자가 화면에 남음 · 어느 쪽이든 'Busan(부산)' 꼴), `judgeContent`. 앱 함수를 못 불러오면 멈춤(빈 기대로 통과 안 함).
- `docs/qa-2026-09-18/scripts/drive-passoff.cjs` (561줄) — 드라이버. 주요 자리: 소리 `pressAudio`(85) · 단계 옮김 + 저절로 소리 없음 `nextStep`(115) ·
  ① `stepAnchors`(147) · ② `stepRule`(176) · ③ `stepForms`(209) · ④⑤ `composeRun`(271) · ⑤ `stepWrap`(349) · 방문 `visit`(383) ·
  복습 · 오답노트 · 구성도 `visitExtra`(488) · 다시 판정 `rejudge`(510). 기록 꼴은 drive-generic 과 같음
  (`out/features/passoff-grammar<suffix>.jsonl` 한 줄 = 강의 × 화면 · checks · audio · problems · content{expected, found, present, missing, missingCount} ·
  steps · events(4xx/5xx) · verdict · ms) + `grading` 집계 · 본 글 `out/rendered/passoff-grammar/<id>.<화면><suffix>.json`.
  - 기본 화면 = 명령서의 '휴대폰 · 작은 휴대폰 · 데스크톱' = `desktop,mobile,small`(lib/harness.cjs VIEWPORTS 의 small 360×780 — adult-sweep 가 오늘 더함).
    관문 0 의 `tablet` 은 `--viewports` 로.
  - 한 방문에서 하는 것: 단계 탭 5개(모르는 탭 → BLOCKED) · 처음엔 '이 강의 학습 완료' 꺼짐 · ① 문장마다 한국어 → '영어 보기' → 영어 · 소리 ·
    ② 발견 질문 · 규칙 확인(데스크톱은 틀린 보기 먼저 → '다시 골라 보세요') · ③ 카드마다 문항을 데이터에서 찾아 정답(낱말 + 이름표 · 보기 · 짧은 답) →
    '맞았어요' · ④ ⑤ 문장마다 모범 답 → '맞았어요'(데스크톱: 레슨 철자 'I live in Seoul.' · 휴대폰 · 작은 휴대폰 · 태블릿: 화면대로 한글 'I live in 서울.'),
    데스크톱 첫 ④ 문장은 틀린 답(끝 낱말 뺌) 먼저 → 틀림이어야 · 맞힌 뒤 소리(데스크톱 전부 · 그 밖 단계별 첫 하나) · 세트 넘김 · ⑤ 규칙 다시 확인 ·
    '5단계를 모두 마쳤어요' · '이 강의 학습 완료' 켜짐(누르지 않음 — `--complete` 일 때만) · 단계 옮길 때 소리 저절로 0 · 화면 글 기대 대비 ·
    로마자 한국어 낱말 0 · 4xx/5xx · 가로 넘침 · 오류 화면 · 잡히지 않은 예외 · 데스크톱: 이전/다음 강의 · (표본) 북마크 넣기→새로고침→빼기→새로고침 ·
    `--extra-pages`: /passoff-grammar/review · review?notes=1 · map?topic=1 를 열어 읽기만(답하지 않음).
  - 깨기 · 로컬용: `--rejudge <jsonl> [--break=expect-text|gloss-off|roman-inject]`(기대 쪽 — 브라우저 없음) · `--licence no`(무료 판 기대 — 유료 문항 없이
    '이용권이 있으면 N문장 더' 안내를 봄) · `--no-audio`(로컬엔 R2 값이 없어 클립이 오류 — 로컬 깨기에만).
  - exit 0 = 모든 방문 PASS · 1 = FAIL 또는 BLOCKED · 2 = 잘못 부름.

## 3. 운영에 대고 잰 결과 (이용권 사본 `rc1002-passoff-sweep-*` — 원본 프로필은 안 열고 안 지움 · 새 기기 등록 0)

`out/features/passoff-grammar-rc1002-s0.jsonl`(desktop · tablet · mobile) + `-rc1002-s0small.jsonl`(small) + `-pages.jsonl`(복습 · 오답노트 · 구성도)

| 강의 | 화면 | 판정 | 초 | 화면 글 있음/기대 | ③ 정답 | ④⑤ 정답 | 한글 꼴 정답 | 소리 PASS |
|---|---|---|---|---|---|---|---|---|
| pg01-1(무료) | desktop · tablet · mobile · small | PASS ×4 | 54.3 · 37.7 · 34.9 · 34.9 | 114/114 ×4 | 6/6 | 17 · 16 · 16 · 16 | — · 1/1 · 1/1 · 1/1 | 22/22 · 3/3 · 3/3 · 3/3 |
| pg01-2(무료) | 〃 | PASS ×4 | 35.7 · 24.3 · 25.1 · 24.2 | 97/97 ×4 | 6/6 | 10 · 9 · 9 · 9 | — | 13/13 · 3 · 3 · 3 |
| pg06-1(유료) | 〃 | PASS ×4 | 58.6 · 47.6 · 43.4 · 40.0 | 136/136 ×4 | 6/6 | 16 · 15 · 15 · 15 | — · 1/1 · 1/1 · 1/1 | 23/23 · 3 · 3 · 3 |
| pg20-2(유료) | 〃 | PASS ×4 | 95.7 · 59.8 · 62.0 · 58.6 | 227/227 ×4 | 6/6 | 40 · 39 · 39 · 39 | — | 48/48 · 3 · 3 · 3 |
| pg10-2(유료 · 문장 116 — 가장 긴 강의) | desktop | PASS | 216.7 | 435/435 | 6/6 | 117/117 | — | 125/125 |
| 복습 · 오답노트 · 구성도 | 4화면 각각 | PASS ×12 | 2.5~3.3 | — | — | — | — | — |

- 16방문(s0 + small) 합계: 화면 글 기대 2,296 / 있음 2,296 / 없음 0 · 정답인데 오답 0(③ 96/96 · ④⑤ 정답 처리 모두) · 한글로 쓴 답 6/6 정답 ·
  소리 누름 142 / 실패 0 / 다시 볼 것(RETEST) 0 · 4xx/5xx 0 · 예외 0 · 로마자 한국어 낱말 · 'Busan(부산)' 꼴 0 · 단계 옮길 때 저절로 소리 0 ·
  '이 강의 학습 완료' 처음 꺼짐 → 다섯 단계 뒤 켜짐 모두 · 데스크톱 틀린 답 → 틀림 4/4 · 규칙 확인 틀린 보기 → '다시 골라 보세요' 4/4 · 북마크 4/4 · 이전/다음 4/4.
- 무료 판(이용권 없는 빈 프로필 사본 · `--licence no --no-audio`, mobile): pg01-1 · pg01-2 PASS — pg01-1 은 81/81 글 · '이용권이 있으면 8문장 더' 안내 확인 · 한글 꼴 1/1.
- 운영 화면에서 찾은 틀림: **없음**(이 표본 5강의).
- 감사용 이용권 쪽 데이터: 답이 학습 기록(복습 일정)으로 서버에 올라갈 수 있음 — 이용권 상태가 아님. 완료는 누르지 않음.

## 4. 깨기 증명

**기대 글 쪽 — 지금 깸(운영 기록을 같은 판정 함수로 다시 판정)**: `node drive-passoff.cjs --rejudge ../out/features/passoff-grammar-rc1002-s0.jsonl [--break=…]`

| 깨기 | 무엇을 깨뜨림 | 깨진 결과 | 되돌린 결과 |
|---|---|---|---|
| (없음) | — | — | 12방문 FAIL 0 · exit 0 (기록 때 숫자와 같음) |
| `--break=expect-text` | 첫 예문 한국어 기대에 ' (깨기)' | **12/12 FAIL · 없음 1씩 · exit 1** | exit 0 |
| `--break=gloss-off` | 한글 표기를 안 거친 기대(영어 철자) | **표기 표가 있는 pg01-1 · pg06-1 6방문 FAIL(없음 2 · 4) · 표 없는 pg01-2 · pg20-2 는 PASS · exit 1** | exit 0 |
| `--break=roman-inject` | 본 글 사본에 'I live in Seoul(서울).' | **12/12 FAIL — 로마자(pg01-1: romanized + 꼴 2) · 'Seoul(서울)' 꼴(그 밖 1) · exit 1** | exit 0 |

**앱 쪽(드라이버 판정의 진짜 깨기)** — 맡긴 대로 다음 proof 일꾼이 한 번에: `회귀점검-1002/단계0/passoff-proof-plan.json`
(T1 ui.tsx:78 한글 답 채점 끊기 → ④ pg01-1:p13 (한글 꼴) FAIL · T2 koreanGloss.ts:101 'Seoul(서울)' 꼴 되살림 → 표기 · 글 FAIL ·
T3 passoffGrading.ts:1378 보기 채점 뒤집기 → ③ pg01-2 보기 3문항 FAIL · 선택 T4 RuleStep.tsx:217 한국어와 다른 점 빼기 → 글 FAIL).
무료 판 · `--no-audio` 경로는 운영에 대고 미리 돌려 PASS(위 3절) — 그 일꾼이 쓸 플래그가 동작함은 확인.

## 5. 증명 못 한 것 · 까닭

- 드라이버의 **앱 쪽 판정**(채점 · 한글 표기 · 화면 글이 실제로 깨진 앱에서 FAIL 이 나는지): 앱을 깨뜨린 사본은 다음 proof 일꾼 몫(계획 파일). 그전까지 이 드라이버의 PASS 는 '증명 전'.
- **소리 판정**(다른 문장의 클립 · 오류 · TTS 로 샘 → FAIL)과 4xx/5xx · 북마크 · 이전/다음 · '처음엔 꺼짐/뒤에 켜짐' 판정은 깨기로 보이지 않았다.
  (로컬엔 R2 가 없어 소리 깨기는 로컬로 못 함 — 같은 판정 코드는 drive-generic pressAudio 를 옮긴 것, drive-generic 쪽 깨기 기록에 기댐 — 이 파일 것은 아님.)
- 한글 꼴 답은 문항의 **모범 답 하나만** 넣는다(허용 답 accept 의 한글 꼴 전부는 아님) — 과정 전체 16문항(④⑤ · 짧은 답) × 휴대폰 화면들. '한국어 낱말이 든 문항 전부를
  두 꼴로'(단계 2)는 check-grading 쪽 몫.
- 마이크 단추('먼저 말해 보기' · '마이크로 말해서 영작하기') · '내 답도 맞아요' · 구성도 다시 채우기 · 복습 답하기는 누르지 않음(서버 기록이 바뀜 · 단계 3 몫).
- '이 강의 학습 완료' 누름은 기본으로 안 함(서버 완료는 undo 없음) — 켜짐만 봄.

## 6. 속도 (쪽 = 강의 × 화면 하나)

- 지난번(최종 관문 9/24~26): PASS-OFF 는 없었음. 비슷한 STUDENT(drive-generic) — desktop 중앙값 216~220초 · mobile 32~36초 · tablet 5.4~5.8초(얕게).
- 이번(drive-passoff, 운영 · 이용권): desktop 평균 61.1초(35.7~95.7, 가장 긴 pg10-2 216.7) · mobile 41.3 · small 39.4 · tablet 42.4 · 16방문 평균 46.1초.
  휴대폰 화면도 ①~⑤ 를 끝까지 함(drive-generic 의 tablet 은 얕게).
- 단계 1 스윕 계획(67강의 × desktop · mobile · small = 201방문): 문장당 ≈ desktop 1.75초 · 휴대폰 1.2초 + 강의당 ≈ 14~18초로 셈 →
  desktop ≈ 58분 · mobile ≈ 42분 · small ≈ 42분 = **브라우저 하나로 ≈ 2시간 20분**. `--shard 1/3 · 2/3 · 3/3` 셋(포트 9720 · 9721 · 9722, 세 화면 모두)
  이면 각 ≈ 50분(pg10-2 가 든 샤드는 +4분). 이 기계는 Edge 동시 3 까지.

## 7. 남의 몫에서 찾은 것 (고치지 않음)

- `lib/expectations.cjs` expected() 에 passoff-grammar 갈래 없음 → `drive-generic --course passoff-grammar` 는 '글 0/0' 거짓 통과. 이 과정은
  drive-passoff 로 돌리고, drive-generic 은 이 과정을 거절(또는 drive-passoff 로 안내)하는 편이 안전(adult-sweep 몫).
- `build-coverage.cjs` COURSE_TABLE 에 passoff-grammar 가 아직 없음(주석에 예만) — 넣으면 `{ slug: "passoff-grammar", label: "PASS-OFF GRAMMAR", baselineMain: 67 }`.
  '학습 단위' 칸은 E.expected 로 세므로 이 과정은 0 — lib/passoff-expect.cjs `expectedPassoff(id).texts.length` 로 세야 맞음(67강의 합 9,892 — 이용권 판).
  drive-passoff 기록의 NA 줄은 build-coverage 규칙에 맞춤(처음엔 꺼짐 = NA coveredBy completion · 표본 북마크 = NA sampledBy).
- `src/components/PassoffLearningView.tsx:67-70` · `passoff/AnchorsStep.tsx:20` · `passoff/FormStep.tsx:105` · `passoff/RuleStep.tsx:21` · `ComposeCard.tsx:59` 의
  주석이 아직 옛 꼴('Chuseok(추석)' · 'Hong Gil Dong(홍길동)' · 'Songnisan(속리산)' · 'Seoul(서울)')을 설명 — 동작은 한글만(koreanGloss.ts). 주석만 낡음(내용 · 화면 영향 없음).
- 이용권 사본 폴더: `%TEMP%\kig-audit-0918-rc1002-passoff-sweep-*` 7개(70~450MB) — 지우지 않고 둠(원본 아님).
