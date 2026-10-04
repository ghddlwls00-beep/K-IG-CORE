# 회귀 점검 1002 · 단계 0 보충 · wrongspot-hangul — 틀린 곳 표시 · 해설 칸의 한국어 낱말 표기 (GRAMMAR II · PASS-OFF)

2026-10-04 · 작업 트리 `nostalgic-blackburn-048c73`(HEAD 7bfd5d7b = origin/main) · 대상 운영 https://k-ig-core.vercel.app · 데스크톱 1366×900 · 디버깅 포트 9875 · 9876 만 씀.
**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.**
내용 파일(content/ · src/) 변경 0 · 커밋 · 푸시 · R2 · 배포 0 · `git add -A` · `git stash` 0 · 이용권 코드 · PIN 타이핑 0 · /api/license/ · /api/admin/ 를 내가 부른 것 0 ·
원본 프로필은 열지도 지우지도 않음(`lib/harness.cjs startBrowser` 사본 `kig-audit-0918-rc1002-wrongspot-hangul` · `-brk` 만 — 끝난 뒤 지움, 남은 사본 0 · 남은 Edge 0) ·
이용권 토큰 · 요청 본문 · 쿠키 · localStorage 의 이용권 값은 찍지 않음. 브라우저는 한 번에 하나, 띄우기 전 남은 메모리 1GB 아래면 1분씩 기다림(도구 안에 넣음 — 실제로 1~6분 기다림).
다른 일꾼의 파일은 고치지 않음(require 만) — 새 파일 하나.
**멈춤 조건(이용권 없이 열린 유료 주소 · 유료 본문 유출)은 보이지 않음.**

## 한눈에

| 과정 | 자리 | 문항(줄) | 로마자 노출 | 'X(한글)' 꼴 | ③a 한글로 쓴 맞는 답 정답 | ③b 영어 철자 맞는 답 정답 | 판정 |
|---|---|---|---|---|---|---|---|
| GRAMMAR II | 1단계 영작 훈련 | 22 (16쪽) | **44번 · 22/22줄** | 0 | 22/22 | 22/22 | **FAIL 22** |
| GRAMMAR II | 4단계 종합 평가 | 22 (16쪽) | **44번 · 22/22줄** | 0 | 22/22 | 22/22 | **FAIL 22** |
| PASS-OFF | ④ 영작 | 17 (15강의) | 0 | 0 | 17/17 | 17/17 | PASS 17 |
| 합계 | | 61줄(39문항) | 88번 · 44줄 | 0 | 61/61 | 61/61 | FAIL 44 · PASS 17 · BLOCKED 0 |

- 대상은 표(`src/lib/koreanGloss.ts KOREAN_GLOSS_PAGES`)가 닿는 문항 **전부** — GRAMMAR II 16쪽 22문항(already-fixed.md 의 '16쪽 · 22문항'과 같음), PASS-OFF 15강의 17문항
  (passoff-sweep.md 의 '한글 꼴 문항 16' + 영어 모범 답에는 없고 허용 답(accept)에만 '서울'이 든 pg05-2:p24 1). PASS-OFF 는 모두 ④ — ⑤ · ③ 짧은 답에는 표가 닿는 문항 0.
- **GRAMMAR II 는 22문항 모두, 두 자리 모두에서 틀린 곳 표시에 로마자가 나온다** — 단계 1 표본의 gh2-033 하나가 아니라 표가 닿는 전부.
  ① 틀린 영어 답 → `고칠 낱말 Tokyo 맞는 꼴 → Busan …`(맞는 꼴이 로마자), ② 한글로 쓴 답 → `내 답: He went to Busan on.`(학생이 한글로 쓴 낱말이 로마자로 되돌려 보임). 같은 칸의 모범 답안 · 다른 정답 · 또는 은 모두 한글.
  ③ 맞는 답(한글 · 영어 철자)은 틀린 곳 줄이 안 나와 로마자 0 — 정답 처리 61/61.
- PASS-OFF 는 틀린 자리 줄(도움 1 · 2) · 단서 · 낱말 카드 · '정답 보기' 의 `내 답 … (틀림) → 서울` 까지 모두 한글 — 로마자 0.
- 4xx · 5xx 0 · 페이지 예외 0 · 자기 점검(칸에 쓴 글이 화면 글 읽기에 섞이지 않음) 통과.

## 원인 (코드 — 고치지 않음, 고칠 일꾼에게)

`src/components/GrammarLearningView.tsx` 570 `DiffLine({ tokens, show })` 는 `show`(= `koreanOnScreen`)를 **받기만 하고 쓰지 않는다** — 577 · 584 · 595 · 604 · 614 · 620 줄이
`token.text` · `token.expected` 를 그대로 그림. 1861(1단계) · 2171(종합 평가)에서 `show={gloss}` 를 넘기지만 효과 없음. 게다가 diff 는 `diffAgainstReferences(asWritten(value), …)`
(1697 · 2113)라 학생이 '부산' 으로 쓴 낱말이 'Busan' 으로 바뀐 뒤 그려진다(② 의 `내 답: … Busan`). 커밋 1568ee1f 가 `mergeSameKind` 로 '같은 종류 이웃을 묶어 그림' 까지는 했으나
`show(...)` 를 부르는 줄이 빠진 것으로 보임. PASS-OFF 쪽 `ComposeCard.tsx` 437 `DiffLine` 은 낱말마다 `show(t.text)` · `show(t.expected)` 를 불러 한글로 나옴(대조군).
고칠 안: GRAMMAR `DiffLine` 에서 `show(token.text)` · `show(token.expected)` 로 그리기. 다만 이름이 diff 토큰 둘로 갈리는 곳(gh2-012 `맞는 꼴 → Han 빠진 낱말 River` · gh2-029/045
`빠진 낱말 Mr Kim`)은 토큰마다 `show` 하면 'Han' → '한' + 'River' 처럼 반쪽만 바뀌므로, 맞는 꼴과 뒤따르는 빠진 낱말을 이어 그린 뒤 한 번에 `show` 하거나 표에 'River' 를
넣지 않는 방식으로 — 고친 뒤 이 도구를 다시 돌려 44줄이 PASS 인지 보면 됨. 소리 바뀜 없음(화면 글).

## 문항마다 (과정 · 강의 · 문항 · 자리 · 로마자 노출 N · 맞는 답 정답 여부)

'어디서' 는 로마자가 나온 화면 줄(틀린 곳 표시 — 화면에서는 '고칠 낱말 · 맞는 꼴 · 빠진 낱말' 이 색 · 밑줄 · 화면 읽기용 글자로 붙음).
① = 한국어 낱말을 Tokyo 로 바꾼 틀린 영어 답 · ② = 한국어 낱말은 한글, 다른 영어 낱말 하나를 뺀 틀린 답 · ③a / ③b = 맞는 답(한글 · 영어 철자).

| 과정 | 강의 | 문항 | 자리 | 로마자 노출 N | 어디서 (넣은 답 · 화면 글) | X(한글) 꼴 | ③a 한글 | ③b 영어 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| GRAMMAR II | gh2-011 | 14번 | 1단계 영작 훈련 | 2 | ① 'He lived in a village 10 miles north of 고칠 낱말 Tokyo. 맞는 꼴 → Seoul' · ② 'He lived in a village 10 miles north 빠진 낱말 of Seoul.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-011 | 14번 | 4단계 종합 평가 | 2 | ① 'He lived in a village 10 miles north of 고칠 낱말 Tokyo. 맞는 꼴 → Seoul' · ② 'He lived in a village 10 miles north 빠진 낱말 of Seoul.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-011-1 | 14번 | 1단계 영작 훈련 | 2 | ① 'He lived in a village 10 miles north of 고칠 낱말 Tokyo. 맞는 꼴 → Seoul' · ② 'He lived in a village 10 miles north 빠진 낱말 of Seoul.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-011-1 | 14번 | 4단계 종합 평가 | 2 | ① 'He lived in a village 10 miles north of 고칠 낱말 Tokyo. 맞는 꼴 → Seoul' · ② 'He lived in a village 10 miles north 빠진 낱말 of Seoul.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-012 | 11번 | 1단계 영작 훈련 | 2 | ① 'He swam across the 고칠 낱말 Tokyo. 맞는 꼴 → Han 빠진 낱말 River' · ② 'He swam across 빠진 낱말 the Han River.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-012 | 11번 | 4단계 종합 평가 | 2 | ① 'He swam across the 고칠 낱말 Tokyo. 맞는 꼴 → Han 빠진 낱말 River' · ② 'He swam across 빠진 낱말 the Han River.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-012-1 | 11번 | 1단계 영작 훈련 | 2 | ① 'He swam across the 고칠 낱말 Tokyo. 맞는 꼴 → Han 빠진 낱말 River' · ② 'He swam across 빠진 낱말 the Han River.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-012-1 | 11번 | 4단계 종합 평가 | 2 | ① 'He swam across the 고칠 낱말 Tokyo. 맞는 꼴 → Han 빠진 낱말 River' · ② 'He swam across 빠진 낱말 the Han River.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-016 | 7번 | 1단계 영작 훈련 | 2 | ① 'We were living in 고칠 낱말 Tokyo 맞는 꼴 → Seoul then.' · ② 'We were living in Seoul. 빠진 낱말 then' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-016 | 7번 | 4단계 종합 평가 | 2 | ① 'We were living in 고칠 낱말 Tokyo 맞는 꼴 → Seoul then.' · ② 'We were living in Seoul. 빠진 낱말 then' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-016-1 | 7번 | 1단계 영작 훈련 | 2 | ① 'We were living in 고칠 낱말 Tokyo 맞는 꼴 → Seoul then.' · ② 'We were living in Seoul. 빠진 낱말 then' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-016-1 | 7번 | 4단계 종합 평가 | 2 | ① 'We were living in 고칠 낱말 Tokyo 맞는 꼴 → Seoul then.' · ② 'We were living in Seoul. 빠진 낱말 then' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-020 | 25번 | 1단계 영작 훈련 | 2 | ① 'He left 고칠 낱말 Tokyo 맞는 꼴 → Seoul for New York.' · ② 'He left Seoul for New. 빠진 낱말 York' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-020 | 25번 | 4단계 종합 평가 | 2 | ① 'He left 고칠 낱말 Tokyo 맞는 꼴 → Seoul for New York.' · ② 'He left Seoul for New. 빠진 낱말 York' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-020-1 | 25번 | 1단계 영작 훈련 | 2 | ① 'He left 고칠 낱말 Tokyo 맞는 꼴 → Seoul for New York.' · ② 'He left Seoul for New. 빠진 낱말 York' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-020-1 | 25번 | 4단계 종합 평가 | 2 | ① 'He left 고칠 낱말 Tokyo 맞는 꼴 → Seoul for New York.' · ② 'He left Seoul for New. 빠진 낱말 York' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029 | 10번 | 1단계 영작 훈련 | 2 | ① 'May I speak to Mr. 고칠 낱말 Tokyo? 맞는 꼴 → Kim' · ② 'May I speak to 빠진 낱말 Mr Kim?' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029 | 8번 | 1단계 영작 훈련 | 2 | ① 'I'd like to know a phone number in 고칠 낱말 Tokyo, 맞는 꼴 → Seoul Korea.' · ② 'I'd like to know a phone number in Seoul. 빠진 낱말 Korea' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029 | 10번 | 4단계 종합 평가 | 2 | ① 'May I speak to Mr. 고칠 낱말 Tokyo? 맞는 꼴 → Kim' · ② 'May I speak to 빠진 낱말 Mr Kim?' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029 | 8번 | 4단계 종합 평가 | 2 | ① 'I'd like to know a phone number in 고칠 낱말 Tokyo, 맞는 꼴 → Seoul Korea.' · ② 'I'd like to know a phone number in Seoul. 빠진 낱말 Korea' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029-1 | 10번 | 1단계 영작 훈련 | 2 | ① 'May I speak to Mr. 고칠 낱말 Tokyo? 맞는 꼴 → Kim' · ② 'May I speak to 빠진 낱말 Mr Kim?' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029-1 | 8번 | 1단계 영작 훈련 | 2 | ① 'I'd like to know a phone number in 고칠 낱말 Tokyo, 맞는 꼴 → Seoul Korea.' · ② 'I'd like to know a phone number in Seoul. 빠진 낱말 Korea' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029-1 | 10번 | 4단계 종합 평가 | 2 | ① 'May I speak to Mr. 고칠 낱말 Tokyo? 맞는 꼴 → Kim' · ② 'May I speak to 빠진 낱말 Mr Kim?' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-029-1 | 8번 | 4단계 종합 평가 | 2 | ① 'I'd like to know a phone number in 고칠 낱말 Tokyo, 맞는 꼴 → Seoul Korea.' · ② 'I'd like to know a phone number in Seoul. 빠진 낱말 Korea' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-033 | 7번 | 1단계 영작 훈련 | 2 | ① 'He went to 고칠 낱말 Tokyo 맞는 꼴 → Busan on business.' · ② 'He went to Busan on. 빠진 낱말 business' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-033 | 7번 | 4단계 종합 평가 | 2 | ① 'He went to 고칠 낱말 Tokyo 맞는 꼴 → Busan on business.' · ② 'He went to Busan on. 빠진 낱말 business' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-033-1 | 7번 | 1단계 영작 훈련 | 2 | ① 'He went to 고칠 낱말 Tokyo 맞는 꼴 → Busan on business.' · ② 'He went to Busan on. 빠진 낱말 business' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-033-1 | 7번 | 4단계 종합 평가 | 2 | ① 'He went to 고칠 낱말 Tokyo 맞는 꼴 → Busan on business.' · ② 'He went to Busan on. 빠진 낱말 business' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038 | 15번 | 1단계 영작 훈련 | 2 | ① 'He put off going to 고칠 낱말 Tokyo. 맞는 꼴 → Busan' · ② 'He put off going 빠진 낱말 to Busan.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038 | 9번 | 1단계 영작 훈련 | 2 | ① 'She smiled to hear him talk in 고칠 낱말 Tokyo 맞는 꼴 → Gyeongsang-do dialect.' · ② 'She smiled to hear him talk in Gyeongsang-do. 빠진 낱말 dialect' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038 | 15번 | 4단계 종합 평가 | 2 | ① 'He put off going to 고칠 낱말 Tokyo. 맞는 꼴 → Busan' · ② 'He put off going 빠진 낱말 to Busan.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038 | 9번 | 4단계 종합 평가 | 2 | ① 'She smiled to hear him talk in 고칠 낱말 Tokyo 맞는 꼴 → Gyeongsang-do dialect.' · ② 'She smiled to hear him talk in Gyeongsang-do. 빠진 낱말 dialect' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038-1 | 15번 | 1단계 영작 훈련 | 2 | ① 'He put off going to 고칠 낱말 Tokyo. 맞는 꼴 → Busan' · ② 'He put off going 빠진 낱말 to Busan.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038-1 | 9번 | 1단계 영작 훈련 | 2 | ① 'She smiled to hear him talk in 고칠 낱말 Tokyo 맞는 꼴 → Gyeongsang-do dialect.' · ② 'She smiled to hear him talk in Gyeongsang-do. 빠진 낱말 dialect' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038-1 | 15번 | 4단계 종합 평가 | 2 | ① 'He put off going to 고칠 낱말 Tokyo. 맞는 꼴 → Busan' · ② 'He put off going 빠진 낱말 to Busan.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-038-1 | 9번 | 4단계 종합 평가 | 2 | ① 'She smiled to hear him talk in 고칠 낱말 Tokyo 맞는 꼴 → Gyeongsang-do dialect.' · ② 'She smiled to hear him talk in Gyeongsang-do. 빠진 낱말 dialect' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045 | 6번 | 1단계 영작 훈련 | 2 | ① 'I went to New York, where I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York, where I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045 | 7번 | 1단계 영작 훈련 | 2 | ① 'I went to New York last year, when I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York last year, when I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045 | 6번 | 4단계 종합 평가 | 2 | ① 'I went to New York, where I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York, where I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045 | 7번 | 4단계 종합 평가 | 2 | ① 'I went to New York last year, when I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York last year, when I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045-1 | 6번 | 1단계 영작 훈련 | 2 | ① 'I went to New York, where I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York, where I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045-1 | 7번 | 1단계 영작 훈련 | 2 | ① 'I went to New York last year, when I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York last year, when I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045-1 | 6번 | 4단계 종합 평가 | 2 | ① 'I went to New York, where I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York, where I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| GRAMMAR II | gh2-045-1 | 7번 | 4단계 종합 평가 | 2 | ① 'I went to New York last year, when I saw Mr. 고칠 낱말 Tokyo. 맞는 꼴 → Kim' · ② 'I went to New York last year, when I saw 빠진 낱말 Mr Kim.' | 0 | ✓ | ✓ | FAIL |
| PASS-OFF | pg01-1 | pg01-1:p13 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg01-3 | pg01-3:p1 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg03-3 | pg03-3:p3 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg05-1 | pg05-1:p19 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg05-2 | pg05-2:p24 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg05-2 | pg05-2:p6 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg06-1 | pg06-1:p8 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg08-2 | pg08-2:p1 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg09-1 | pg09-1:p12 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg10-1 | pg10-1:p19 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg11-1 | pg11-1:p1 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg11-1 | pg11-1:p2 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg11-3 | pg11-3:p11 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg12-1 | pg12-1:p3 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg12-3 | pg12-3:p6 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg13-1 | pg13-1:p16 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |
| PASS-OFF | pg16-3 | pg16-3:p5 | ④ 영작 | 0 | — | 0 | ✓ | ✓ | PASS |

## 찾은 것 (고치지 않음 — 표로 넘김)

| # | 과정 · 쪽 | 무엇 | 고칠 안 | 소리 바뀜 | 심각도 |
|---|---|---|---|---|---|
| 1 | GRAMMAR II · 표가 닿는 16쪽 22문항 전부(gh2-011 · 012 · 016 · 020 · 029 · 033 · 038 · 045 와 각 -1) · 1단계 영작 훈련 · 4단계 종합 평가 | 틀린 곳 표시의 '맞는 꼴' 과 '내 답' 에 로마자(Seoul · Han River · Kim · Busan · Gyeongsang-do) — 한글로 쓴 답도 로마자로 되돌려 보임. 88번 · 44줄 | 위 '원인' — `DiffLine` 이 `show` 를 쓰게(이름이 토큰 둘로 갈리는 곳 주의) | 없음 | 낮음~중간(사장님 규칙 '화면은 한글만' 위반 · 채점은 맞음) |
| 2 | PASS-OFF · 15강의 17문항 · ④ 영작 | 한글로 쓴 답을 칸에 치면 '확인' 전에 칸 아래에 **'한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.'** 가 뜸(34/34 — ② · ③a 마다). 확인을 누르면 정답으로 채점됨 — 화면대로 베낀 학생에게 틀렸다는 듯한 안내 | `ComposeCard.tsx` 265 · 297 `setHangul(hasHangul(…))` 를 `hasHangul(asWritten(…))` 로(표의 한글 낱말은 경고에서 뺌) | 없음 | 낮음(안내 글) |
| 3 | PASS-OFF · ④ 2단계 도움 '낱말의 첫 글자' | 로마자 낱말의 첫 글자와 글자 수가 나옴 — `I l___ i_ S____.` · `… a__ C______.` · `… A______ Y_ S__-___.` 등 17/17(완성된 로마자 낱말은 0) | 단계1 probes-browser.md 찾은 것 2 와 같음 — 사장님 판단(영어 자판으로 쓰는 칸이라 의도일 수 있음) | 없음 | 정보 |
| 4 | PASS-OFF · pg13-1:p16 | 한글이지만 이름이 쪼개져 보임: 틀린 자리 줄 `… Admiral 이 순신.`(띄어 씀), '정답 보기' 의 `Tokyo. (틀림) → 이`(맞는 꼴이 '이' 한 글자 — '순신' 은 안 보임). 로마자는 아님 | 이름 조각(Yi · Sun-sin)을 이어 그린 뒤 표기 | 없음 | 낮음 |

## 깨기 증명 (명령 · 깨진 결과 · 되돌린 결과)

| 깨기 | 명령 | 깨뜨린 것 | 깨진 결과 | 되돌린 결과(깨기 없이) |
|---|---|---|---|---|
| 판정: 로마자 기대 뒤집기 | `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --rejudge docs/qa-2026-09-18/out/wrongspot-hangul-1004.json --course passoff-grammar --break=expect-roman` | '로마자 0' 대신 '1 이상' 을 기대 | **PASS-OFF 17/17 FAIL · exit 1** ('로마자 1 이상을 기대했는데 0') | 같은 명령 `--break` 없이 → PASS 17 · exit 0 · 기록 때 판정과 다른 줄 0 |
| 판정: 같은 뒤집기(GRAMMAR) | 위 명령 `--course grammar2 --break=expect-roman` | 〃 | 지금 로마자가 나오는 44줄이 PASS 44 · exit 0(판정이 실제 로마자 수를 읽는다는 반대쪽 증명) | `--break` 없이 → FAIL 44 · exit 1(지금 결과 그대로) |
| 판정 함수에 로마자 끼우기 | 위 명령 `--break=roman-inject`(두 과정) | 판정이 받는 화면 글 사본마다 그 쪽 표의 첫 철자 `X(한글)` (예: `Hong Gil Dong(홍길동)`)을 끼움 | **61/61 FAIL · exit 1**(PASS-OFF 로마자 119 · 'X(한글)' 꼴 119) | `--break` 없이 → FAIL 44 · PASS 17 · 다른 줄 0 |
| 운영 화면: 한글 정답을 깨기 | `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --ids gh2-033,pg01-1 --break=hangul-answer --port 9876 --clone rc1002-wrongspot-hangul-brk` (+ pg01-1 은 `--merge` 로 다시 — 아래 '고친 것 2') | ③a 의 한글 낱말을 표에 없는 '가나다' 로('He went to 가나다 on business.' · 'I live in 가나다.') | **3/3 FAIL · exit 1** — gh2-033 1단계 · 종합 평가 ③a ✗(△/✕, 그 틀린 곳 줄에도 로마자 1 더 — 3번) · pg01-1 ③a ✗('한글이 섞여 있어요' — 앱이 채점을 거절) | 깨기 없는 본 실행의 같은 줄: gh2-033 ③a ✓ ×2 · pg01-1 ③a ✓ · PASS(로마자 0) |
| (양성 대조) 실제 로마자 | 본 실행 | — | GRAMMAR 44줄에서 실제 화면의 'Busan' · 'Seoul' … 을 잡음(같은 판정 · 같은 화면 읽기) — PASS-OFF 의 '0' 이 못 봐서 0 이 아님을 같은 도구가 보임 | — |

결과 파일: `out/wrongspot-hangul-1004.json`(본) · `out/wrongspot-hangul-1004-break-hangul-answer.json`(운영 깨기). 다시 판정 깨기는 파일을 만들지 않음(화면 출력만).

## 만들면서 고친 것 (도구 쪽 — 같은 파일)

1. GRAMMAR 1단계는 10문항 묶음이 모두 쪽에 있고 나머지는 `hidden` — 첫 실행에서 11번 이상(gh2-011 14 · 012 11 · 020 25 · 038 15)을 숨은 칸으로 찾아 8줄 BLOCKED.
   → 보이는 칸만 찾고 '다음 묶음 →'(보이는 것)을 누르게 고친 뒤 GRAMMAR 16쪽을 다시(`--course grammar2 --merge`) — BLOCKED 0.
2. PASS-OFF pg13-1 의 ②(낱말 하나 뺌)가 'Admiral' 을 빼서 허용 답(167개 중 하나)이라 첫 실행에서 정답 → 카드가 끝나 BLOCKED. → ①·② 를 넣기 전에 앱 채점기
   (`grammarGrading.ts gradeAgainstReferences` · `passoffGrading.ts gradeProduce` + `romanForGrading`)로 '오답' 인 꼴을 고르게 고침(`--dry-run` 이 미리 판정을 찍음 — ①② 오답 39/39 · ③ 정답 39/39), pg13-1 만 다시(`--merge`).
   운영 깨기에서 '한글이 섞여 있어요'(채점 거절)가 BLOCKED 로 나와 '채점됨 · 정답 아님' 으로 세게 고침.
   본 결과 파일의 PASS-OFF 14강의 16줄은 첫 실행(08:19) 그대로 — 그때의 ②도 운영 화면에서 모두 '틀린 자리를 표시했어요' 였음(파일 `merged` 칸에 적힘).

## 부수 효과 · 주의

- PASS-OFF 답(일부러 틀린 답 · 한글 꼴 포함)은 감사 이용권의 학습 기록(복습 · 오답노트)으로 서버에 쌓일 수 있다 — 이용권 상태 아님. 17문항 × 틀린 답 3번씩 + 넘긴 카드의 정답.
  `out/data-changes.jsonl` 에 강의마다 적음. '이 강의 학습 완료' · '내 답도 맞아요' · 마이크 · 북마크는 누르지 않음. GRAMMAR 답은 사본 localStorage 에만(방문마다 지움 · 사본 지움).
- 데스크톱 한 화면만(명령대로). 휴대폰 화면은 같은 컴포넌트라 같은 결과일 것이나 재지 않음.
- 쪽을 열 때 앱이 스스로 부르는 `/api/license/verify` 등은 앱 동작(내가 부른 것 아님).

## 증명 못 한 것 · 한계

- GRAMMAR 2단계 '빈칸 완성' · 3단계 '구문 각인' 의 틀린 곳 표시는 이 도구 범위 밖(명령의 '1단계 문항 칸 · 4단계 종합 평가' 만). 빈칸 문장 조각은 단계1 표본(gh2-033)에서 한글 확인.
- '틀린 답' 은 문항마다 두 꼴(①·②)만 — 다른 틀림(순서 바꿈 · 낱말 더함)의 '자리 바뀜 · 필요 없는 낱말' 표시는 GRAMMAR `DiffLine` 의 같은 코드라 같은 결과일 것이나 따로 넣지 않음.
- PASS-OFF 오늘 복습 · 오답노트 화면의 '내 답:'(`WrongNotes.tsx` 305 · `ReviewSession.tsx` 657 — 학생이 친 글 그대로)은 보지 않음.

## 전부 돌리는 명령과 걸릴 시간 (작업 트리 뿌리에서)

- 미리 보기(브라우저 없음 · 수 초): `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --dry-run` → 쪽 31 · 문항 39 · 꼴마다 앱 채점기 판정.
- 전부(운영 · 이용권 사본 · 데스크톱): `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --port 9875`
  → `out/wrongspot-hangul-1004.json` · 지금 기대: 줄 61 — FAIL 44(GRAMMAR, 로마자 88) · PASS 17(PASS-OFF) · exit 1(GRAMMAR 를 고치면 exit 0 이어야).
  **약 10분**(잰 것: GRAMMAR 16쪽 234초 = 쪽당 12~16초 · PASS-OFF 15강의 약 6분 = 강의당 14~40초, 브라우저 띄우기 · 사본 만들기 포함) + 메모리 기다림(이번 1~6분).
  과정 하나만: `--course grammar2`(약 4분) · `--course passoff-grammar`(약 6분). 몇 쪽만 다시: `--ids gh2-033,pg06-1 --merge`.
- 깨기(브라우저 없음 · 각 1~2초): `--rejudge docs/qa-2026-09-18/out/wrongspot-hangul-1004.json [--course passoff-grammar] --break=expect-roman` · `--break=roman-inject`.
  운영 깨기(약 1분): `--ids gh2-033,pg01-1 --break=hangul-answer --port 9876 --clone rc1002-wrongspot-hangul-brk` → exit 1 · ③a ✗ 3줄.
- 단계 1 ⑨ '틀린 곳 표시에도 로마자 0' 칸의 근거: 이 파일 — **GRAMMAR II 는 틀림(로마자 88번 · 44/44줄), PASS-OFF 는 0(17/17줄)**.
