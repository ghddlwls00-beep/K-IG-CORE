# 단계 1 — 마무리 셈 (count) — 2026-10-05

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 운영(https://k-ig-core.vercel.app) 전 쪽 스윕 기록 54파일(2026-10-04 15:19 ~ 10-05 09:38 KST) · 3화면 desktop · mobile · small.
내용 · 도구 파일 안 바꿈 · 커밋 · 푸시 · R2 · 배포 안 함 · 이용권 코드 · PIN 타이핑 0 · /api/license/ 상태 바꾸는 호출 0 · /api/admin/ 0 · CNN · GVA 0. 소리 다시 누르기 · LISTENING 새 문제 검사는 감사 이용권 **사본**(rc1002-fin-recheck · rc1002-fin-count)만 씀.

## 0. 스윕 중 운영이 바뀌었나

`git fetch` 뒤 `git log --format='%h %ci %s' 7bfd5d7b..origin/main` → **0건**. origin/main = 7bfd5d7b(2026-10-04 14:07:29 +0900) 그대로 — 스윕이 시작된 15:19 · 끝난 10-05 09:38 모두 같은 판. src/ · content/ 를 바꾼 커밋 0 → 기록의 의미가 달라진 것 없음.
(이 작업 트리 HEAD e38c5890 은 도구 · 기록만 바꾼 로컬 커밋 — 푸시 안 함 · `git status` 에 content/ · src/ 바뀜 0.)

## 1. 강의 × 화면 (build-coverage — `단계1/coverage/coverage.md · .json`)

명령: `node docs/qa-2026-09-18/scripts/build-coverage.cjs --files <54파일> --screens desktop,mobile,small --out-dir docs/qa-2026-09-18/회귀점검-1002/단계1/coverage` (exit 255 — 도구가 FAIL · BLOCKED 가 있으면 비영으로 끝남).
읽은 기록 5,235줄 = 방문 5,235(강의 1,745 × 3화면 — 과정별 82 · 55 · 67 · 195 · 194 · 88 · 552 · 512 × 3 모두 있음 · 같은 칸 두 기록 0 · 깨기 기록 0 · 로컬 기록 0). **방문 오류 · NOT TESTED 0.**

### 1-1. 강의 판정 (강의 하나 = 3화면 기록을 합친 판정 · 도구 표 그대로)

| 과정 | 강의 | PASS | FAIL | BLOCKED | NOT TESTED | 화면 3종 모두 기록 |
|---|---|---|---|---|---|---|
| STUDENT | 82 | 82 | 0 | 0 | 0 | 82/82 |
| ADULT | 55 | 55 | 0 | 0 | 0 | 55/55 |
| PASS-OFF GRAMMAR | 67 | 67 | 0 | 0 | 0 | 67/67 |
| VOCA | 195 | 195 | 0 | 0 | 0 | 195/195 |
| GRAMMAR I | 194 | 0 | 34 | 160 | 0 | 194/194 |
| GRAMMAR II | 88 | 0 | 12 | 76 | 0 | 88/88 |
| LISTENING | 552 | 551 | 1 | 0 | 0 | 552/552 |
| READING | 512 | 503 | 9 | 0 | 0 | 512/512 |
| **합계** | **1745** | **1453** | **56** | **236** | **0** | 1745/1745 |

실기기 몫(강의 판정에 안 셈): READING 3단계 실제 마이크 인식 — 데스크톱 512칸(헤드리스로 못 봄 · 가짜 인식기로 화면 배선은 같은 기록의 다른 칸이 PASS).

### 1-2. 과정 × 화면 (방문 칸 하나 = 강의 × 화면 · 도구 판정 규칙을 그대로 칸마다 적용 — 스크래치 cell-count.cjs 가 build-coverage.cjs 의 규칙 코드를 읽어 씀 · 강의 합계가 1-1 과 같음을 확인: GRAMMAR I 34 FAIL · 160 BLOCKED · GRAMMAR II 12 · 76 · LISTENING 1 FAIL · READING 9 FAIL)

(표의 NA 열은 NA 로 적힌 **확인 줄 수**이지 칸 수가 아님 — 한 칸에 여러 줄이 있을 수 있고, 'NA 미덮임' 줄이 있는 칸이 BLOCKED.)

| 과정 | 화면 | 칸 | PASS | FAIL | BLOCKED | NOT TESTED | NA 덮임 | NA 그 자리에 없음 | NA 표본 | **NA 미덮임(→BLOCKED)** | 실기기 몫 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| STUDENT | desktop | 82 | 82 | 0 | 0 | 0 | 14 | 0 | 72 | 0 | 0 |
| STUDENT | mobile | 82 | 82 | 0 | 0 | 0 | 14 | 0 | 0 | 0 | 0 |
| STUDENT | small | 82 | 82 | 0 | 0 | 0 | 14 | 0 | 0 | 0 | 0 |
| ADULT | desktop | 55 | 55 | 0 | 0 | 0 | 2 | 0 | 48 | 0 | 0 |
| ADULT | mobile | 55 | 55 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| ADULT | small | 55 | 55 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | desktop | 67 | 67 | 0 | 0 | 0 | 0 | 0 | 55 | 0 | 0 |
| PASS-OFF GRAMMAR | mobile | 67 | 67 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | small | 67 | 67 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | desktop | 195 | 195 | 0 | 0 | 0 | 0 | 0 | 173 | 0 | 0 |
| VOCA | mobile | 195 | 195 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | small | 195 | 195 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | desktop | 194 | 0 | 33 | 161 | 0 | 0 | 0 | 163 | 388 | 0 |
| GRAMMAR I | mobile | 194 | 141 | 0 | 53 | 0 | 0 | 0 | 0 | 106 | 0 |
| GRAMMAR I | small | 194 | 141 | 5 | 48 | 0 | 0 | 0 | 0 | 106 | 0 |
| GRAMMAR II | desktop | 88 | 0 | 5 | 83 | 0 | 0 | 0 | 73 | 176 | 0 |
| GRAMMAR II | mobile | 88 | 44 | 0 | 44 | 0 | 0 | 0 | 0 | 88 | 0 |
| GRAMMAR II | small | 88 | 44 | 7 | 37 | 0 | 0 | 0 | 0 | 88 | 0 |
| LISTENING | desktop | 552 | 551 | 1 | 0 | 0 | 552 | 0 | 488 | 0 | 0 |
| LISTENING | mobile | 552 | 552 | 0 | 0 | 0 | 276 | 0 | 0 | 0 | 0 |
| LISTENING | small | 552 | 552 | 0 | 0 | 0 | 276 | 0 | 0 | 0 | 0 |
| READING | desktop | 512 | 503 | 9 | 0 | 0 | 0 | 964 | 0 | 0 | 512 |
| READING | mobile | 512 | 512 | 0 | 0 | 0 | 0 | 28 | 0 | 0 | 0 |
| READING | small | 512 | 512 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 |

### 1-3. 화면에 있어야 할 글 · 네트워크 (칸마다 기록의 content · events)

| 과정 | 화면 | 글 기대 | 있음 | **없음** | 없음 칸 | 4xx | 5xx | 요청 실패(네트워크) | 예외 | 콘솔 오류 | **요청 기록 없는 쪽** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| STUDENT | desktop | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| STUDENT | mobile | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| STUDENT | small | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | desktop | 1,715 | 1,715 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | mobile | 1,715 | 1,715 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | small | 1,715 | 1,715 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | desktop | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | mobile | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | small | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | desktop | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | mobile | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | small | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | desktop | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | mobile | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | small | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR II | desktop | 1,592 | 1,581 | 11 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR II | mobile | 1,592 | 1,581 | 11 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR II | small | 1,592 | 1,581 | 11 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| LISTENING | desktop | 4,925 | 4,925 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| LISTENING | mobile | 4,925 | 4,925 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| LISTENING | small | 4,925 | 4,925 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| READING | desktop | 20,248 | 20,248 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| READING | mobile | 20,248 | 20,248 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| READING | small | 20,248 | 20,248 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

합계: 글 기대 150,099 · 있음 150,066 · **없음 33** · 4xx 0 · 5xx 0 · 요청 실패 6 · 예외 0 · 콘솔 오류 0 · 요청 기록 없는 쪽 0.
4xx · 5xx 는 **0** — 의도된 것(잠긴 유료 소리 403 · 이용권 없이 막힌 유료 주소)은 이 스윕(이용권 사본)에서는 안 생김 — 그 쪽은 단계 1 탐침에서 따로 셈(유료 소리 403 16,977/16,977).
요청 실패 6 = LISTENING 데스크톱 d134-1(1) · d172(3) · d185-1(2) 의 `net::ERR_INTERNET_DISCONNECTED` — 기록 시각 10-04 11:30 · 12:03 · 12:05Z(같은 시간대 연속 · 기계 인터넷 끊김으로 보임 · 4xx/5xx 아님). d172 는 같은 기록에 소리 FAIL 3(`clip error 4` — Step 3 소리클리닉 'dreamed of · not in · but in').

### 1-4. 화면 글 '없음' 33 = GRAMMAR II 8강 × 3화면 11줄 (화면 글 기대는 로마자 이름 · 화면은 한글로 바뀐 줄 — 앱 · 도구 판단은 triage 몫)

gh2-011 'He lived in a village 10 miles north of Seoul.' · gh2-012 'He swam across the Han River.' · gh2-016 'We were living in Seoul then.' · gh2-020 'He left Seoul for New York.' · gh2-029 'I'd like to know a phone number in Seoul, Korea.' · 'May I speak to Mr. Kim?' · gh2-033 'He went to Busan on business.' · gh2-038 'She smiled to hear him talk in Gyeongsang-do dialect.' · 'He put off going to Busan.' · gh2-045 'I went to New York, where I saw Mr. Kim.' · 'I went to New York last year, when I saw Mr. Kim.' — 세 화면 모두 같은 줄(데스크톱 · 휴대폰 · 작은 휴대폰). 다른 과정 · 줄은 없음 0.

### 1-5. BLOCKED · FAIL 사유 (도구가 적은 그대로 — 한 줄씩은 fails.json)

- **GRAMMAR I BLOCKED 160강 · GRAMMAR II BLOCKED 76강** — 사유 한 가지: 'graded input · step 2 / step 4 · NA 인데 대신 본 기록 없음 (coveredBy 없음)'. 드라이버가 GRAMMAR 영작 · 빈칸 칸을 NA 로 적는데 coveredBy 가 없어 도구가 '대신 본 기록 없음' 으로 BLOCKED 로 셈(NA 미덮임 GRAMMAR I 600 · GRAMMAR II 352줄). 이 칸의 채점은 단계 2 에서 따로 봄(종합 평가 282/282 · 한글 꼴 72/72).
- **GRAMMAR I FAIL 34강(데스크톱 33줄 + 작은 휴대폰 5줄 · 모두 problems)**: 'control navigated away: <단추> → <다른 강의 주소>'(데스크톱 33 — 예 gh1-006 '? → /grammar1/gh1-008' · gh1-008 '? → /grammar1/gh1-006' · gh1-014 '이전 문장 → /grammar1/gh1-012' · gh1-042 '다음 Step → → /grammar1/gh1-040') · 작은 휴대폰 5(gh1-082 · 084 · 094 · 118 · 122 '다음 묶음 → → /grammar2').
- **GRAMMAR II FAIL 12강**: 같은 꼴 — 데스크톱 5(gh2-016 · 017 · 019 · 020 · 028) · 작은 휴대폰 7(gh2-007 · 008 · 009 · 031 · 032 · 041 · 047 '다음 묶음 → → /grammar2' · '1번 말로 답하기 → /grammar2').
- **LISTENING FAIL 1강(d172 데스크톱)**: 소리 FAIL 3 — Step 3 소리클리닉 'dreamed of · not in · but in 듣기' `clip error 4`.
- **READING FAIL 9강(모두 데스크톱)**: 'wpm · again — WPM = words ÷ the timed minutes: expected N / actual N±1'(pr127-1 313/312 · pr051 412/411 · pr031 349/350 · pr206 420/421 · pr171-1 331/332 · pr068 425/426 · pr180-1 424/425 · pr063 367/368 · pr063-1 367/368) — 1 차이 · 반올림 경계로 보임(triage 몫).
- 도구 탓 목록(resolved) 로 PASS 처리된 줄 0 · 다시 돌려야 하는 도구 탓 줄 0.

## 2. fails.json — 한 줄씩 (`단계1/fails.json`)

스윕 기록에서 나온 줄 1053 + 소리 다시 누르기에서 안 맞은 줄 471. 줄마다 과정 · 강의 · 화면 · 기록 파일 · 항목 · 기록의 문구(note · record 에 기록 그대로).

| 과정 | FAIL 줄 | BLOCKED 줄 | 화면 글 없음 줄 | 4xx · 5xx | 요청 실패 | 줄 합계 | FAIL 강의 | BLOCKED 강의 |
|---|---|---|---|---|---|---|---|---|
| STUDENT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | 38 | 600 | 0 | 0 | 0 | 638 | 34 | 194 |
| GRAMMAR II | 12 | 352 | 24 | 0 | 0 | 388 | 12 | 88 |
| LISTENING | 3 | 0 | 0 | 0 | 6 | 9 | 1 | 0 |
| READING | 18 | 0 | 0 | 0 | 0 | 18 | 9 | 0 |

(READING FAIL 은 check 한 줄 + problems 한 줄로 두 번 적힘 → 줄 18 = 강의 9. GRAMMAR I BLOCKED 줄 600 = 'NA 미덮임' 줄.) 소리 다시 누르기 안 맞은 줄 471(FAIL 16 · BLOCKED 455) 은 `recheckLines` 로 같은 파일에.

## 3. 소리 — 음성 버튼 누른 수 / 실패 수

명령: `node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl" --count` (강의 × 화면마다 가장 늦은 기록 5,235 · 로컬 78 줄 · -pages 1 파일은 빠짐 · 재생 버튼 아닌 요소 96 은 다시 누르기 대상에서 뺌).

| 과정 | 기록 | **누름** | PASS | **FAIL** | RETEST |
|---|---|---|---|---|---|
| STUDENT | 246 | 4,644 | 4,631 | 0 | 13 |
| ADULT | 165 | 4,254 | 4,250 | 0 | 4 |
| PASS-OFF GRAMMAR | 201 | 2,167 | 2,167 | 0 | 0 |
| VOCA | 585 | 15,644 | 13,668 | 0 | 1,976 |
| GRAMMAR I | 582 | 2,244 | 1,906 | 0 | 338 |
| GRAMMAR II | 264 | 1,260 | 1,072 | 0 | 188 |
| LISTENING | 1656 | 17,970 | 17,902 | 3 | 65 |
| READING | 1536 | 17,650 | 17,650 | 0 | 0 |
| **합계** | 5235 | **65,833** | 63,246 | **3** | 2,584 |

READING 은 drive-reading 이 소리 줄에 상태 칸을 안 적음(표의 READING PASS 17,650 은 recheck-audio 의 셈) → recheck-audio --count 는 '재생됨 · 기대 클립 요청 · 오류 없음 · TTS 없음' 으로 세어 누름 17,650 · PASS 17,650 · FAIL 0 (다시 누르기 대상 아님 — 실패는 같은 기록의 playProbe 검사 FAIL 로 강의 FAIL 이 됨 · 그런 FAIL 은 위 READING 9강의 WPM 줄뿐).

### 3-1. 다시 누르기 (RETEST · FAIL 재생 버튼을 하나씩 — 운영 · 이용권 사본 rc1002-fin-recheck · 포트 9990)

명령: `node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl" --suffix -rc1002-s1 --port 9990 --clone rc1002-fin-recheck` → 대상 2,291 (grammar1 RETEST 228 · grammar2 RETEST 100 · ld FAIL 3 + RETEST 4 · phonics RETEST 1,956). 결과 `out/recheck-audio-rc1002-s1.jsonl`(+ -skipped.json).
**끝까지 못 함 — 백그라운드 명령이 시간 한도(2시간)에 걸려 중단됨**(09:45 ~ 11:45 KST · 하네스가 '한도 최대라 다시 시작하지 말라' 고 알려서 다시 안 띄움). 1,051 / 2,291 눌렀고 **1,240(모두 VOCA hv-72 뒤쪽 · 데스크톱)이 아직 안 눌림**.
이어 하는 법: 같은 줄을 다시 치면 결과 파일에서 BLOCKED 아닌 것은 건너뛰고 이어감(처음부터는 --redo). VOCA 는 PASS 한 줄에 약 2.4초(대략 50분).

| 과정 | 다시 누를 대상 | 눌렀음 | 다시 PASS | **다시 FAIL** | 다시 BLOCKED | 아직 안 누름 |
|---|---|---|---|---|---|---|
| GRAMMAR I | 228 | 228 | 131 | 0 | 97 | 0 |
| GRAMMAR II | 100 | 100 | 100 | 0 | 0 | 0 |
| LISTENING | 7 | 7 | 0 | 4 | 3 | 0 |
| VOCA | 1956 | 716 | 349 | 12 | 355 | 1240 |
| **합계** | 2,291 | 1,051 | 580 | **16** | 455 | 1,240 |

- **grammar1 BLOCKED 97 = 97강 모두 그 주소가 307 으로 앞 강의로 되돌려 보내는 쪽**(예: gh1-007 → gh1-006 · gh1-113 → gh1-112 — 스윕 기록의 redirect 칸에 같은 307 있음). 도구가 '페이지가 안 열림(열린 주소 ≠ 요청 주소)' 으로 BLOCKED(줄당 약 46초). 주소가 그대로 열린 쪽 131 은 PASS.
- **grammar2 100/100 PASS** — 접힌 `<details>` 정답 재생기를 먼저 열어 누르면 모두 PASS(단계 0 의 '도구 탓으로 보임' 과 같은 결과).
- **ld 7**: FAIL 4(d226 · d246 데스크톱 · d273 · d275 작은 휴대폰 — 1단계 블라인드 문장 듣기 '12 s 안에 소리 요청 없음') · BLOCKED 3(d172 Step 3 소리클리닉 단추 '못 찾음').
- **phonics 716 눌러 PASS 349 · FAIL 12 · BLOCKED 355**: BLOCKED 355 = 'Step 1 · 단어 보고 듣기 ▶ <낱말> 뜻 보기 <낱말> 듣기 · 뜻 보기' 단추를 새 화면에서 못 찾음 · FAIL 12 = hv-01 · hv-02 · hv-52 의 짧은 구절('anticipate future customer needs 듣기' 등)이 '앱이 요청한 클립 ≠ 이 단추의 클립(데이터가 정한 것)' (hv-01 6줄 · hv-02 4줄 · hv-52 2줄 — 클립 이름 쌍은 fails.json recheckLines). 앱 · 도구 판단은 triage 몫.

### 3-2. 최종 과정별 '누른 수 / 실패 수' (스윕 기록 + 다시 누르기 반영)

| 과정 | 스윕에서 누름 | 스윕 FAIL | 스윕 RETEST | 다시 눌러 PASS | 다시 눌러 FAIL | 다시 눌러 BLOCKED(못 누름) | 아직 안 누른 대상 | **최종 FAIL(미해결) = 스윕 FAIL + 다시 FAIL** |
|---|---|---|---|---|---|---|---|---|
| STUDENT | 4,644 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| ADULT | 4,254 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | 2,167 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | 15,644 | 0 | 1,976 | 349 | 12 | 355 | 1,240 | 12 |
| GRAMMAR I | 2,244 | 0 | 338 | 131 | 0 | 97 | 0 | 0 |
| GRAMMAR II | 1,260 | 0 | 188 | 100 | 0 | 0 | 0 | 0 |
| LISTENING | 17,970 | 3 | 65 | 0 | 4 | 3 | 0 | 7 |
| READING | 17,650 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

합계 최종 FAIL(미해결) 19 — 아직 안 누른 대상 1,240(VOCA)이 남아 있어 VOCA 숫자는 중간값.

(ld 스윕 FAIL 3 은 d172 소리클리닉 3줄 — 다시 누르기에서는 단추를 못 찾아 BLOCKED 3 이라 FAIL 그대로 · ld RETEST 4 는 다시 눌러 FAIL 4. 스윕 RETEST 2,584 중 다시 누르기 대상은 2,288 줄 + FAIL 3 = 2,291 — 같은 단추를 여러 화면에서 RETEST 한 것은 한 대상으로 합치고, 재생 버튼이 아닌 요소 96(대본 줄 · 낱말 타일 — STUDENT 13 · ADULT 4 포함)은 도구가 뺌.)

## 4. 소리 정의 증명 (prove-spoken-definition)

| 명령 | exit | 결과 |
|---|---|---|
| `node docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs` | **0** | 스윕 기록 117파일이 실제로 요청한 클립 13,410 — 새 정의 안 13,410 · **새 정의가 빠뜨림 0** · 둘 다 없음 0 · 까닭 없음 0 |
| `node -r ./docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-drop-adult-sounds.cjs docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs` (ADULT 낱말 · 덩어리를 빼고 일부러 틀리게) | **1** (기대대로) | 요청 클립 13,411 — 새 정의 안 13,090 · **새 정의가 빠뜨림 296** · 둘 다 없음 25 — 스윕 기록에 ADULT 낱말 · 덩어리 소리가 있다는 증명(첫 줄 `scratch break: ADULT words · chunks dropped from spokenTexts — 271 adult calls`) |

## 5. LISTENING 새 문제 — 데스크톱 · 작은 휴대폰 (check-ld-questions-1004.cjs)

| 화면 | 명령 | 강의 | 문항 | 정답 → 맞음 | 틀린 보기 → 틀림 표시 | 글 · 순서 같음 | 이용권 없이 잠김 | FAIL 강의 | 4xx/5xx · 예외 | 시간 | exit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| desktop | `--shard 1/1 --viewport desktop --port 9991 --clone rc1002-fin-count --fresh` | 276/276 | 756 | 756/756 | 756/756 | 756/756 | 274/274 | 0 | 0 · 0 | 강의당 1.9초 | **0** |
| small | `--shard 1/1 --viewport small --port 9991 --clone rc1002-fin-count --fresh` | 276/276 | 756 | 756/756 | 756/756 | 756/756 | 274/274 | 0 | 0 · 0 | 강의당 1.9초 | **0** |
| (참고) mobile — 단계 0 | `--shard 1/1 --port 9872` | 276/276 | 756 | 756/756 | 756/756 | 756/756 | 274/274 | 0 | 0 · 0 | 강의당 2.2초 | 0 |

결과 파일: `단계1/ld-questions/{desktop,small}.jsonl · -summary.json · .log`(복사본). 앱이 부른 API 는 /api/license/verify · /api/progress/student · /api/progress/adult 가 강의 수만큼(읽기 · 이용권 사본이 자기 상태를 확인하는 호출 — 상태 바꾸는 호출 0).
**도구 알림(고치지 않음)**: 이 도구의 결과 파일 이름에 화면이 없어(`shard1of1.jsonl`) `--fresh` 가 앞서 돌린 휴대폰 기록(단계 0 · 756/756)을 지움 → 돌리기 전에 복사해 두었다가 끝난 뒤 되돌림(해시 같음). 화면 이름을 파일에 넣는 것이 안전함.

## 6. 도구 · 운영 알림 (이 일에서 본 것 — 고치지 않음)

- build-coverage.cjs: 표가 과정 × 화면이 아니라 강의 단위 · 화면 글 · 4xx/5xx · 요청 기록 없는 쪽을 안 적음 → 이 문서 1-2 · 1-3 은 같은 규칙을 칸마다 적용해 따로 셈(스크래치 cell-count.cjs — 저장소 밖).
- recheck-audio.cjs: 307 로 앞 강의로 가는 GRAMMAR I 주소를 '페이지가 안 열림' 으로 46초씩 기다려 BLOCKED(97줄 = 약 75분) · VOCA '뜻 보기 · 듣기' 단추 355줄은 새 화면에서 못 찾음 → 다시 누르기 시간이 2시간을 넘음.
- 작업기록 단계 0 의 '도구 의심 1'(drive-generic grammar1 gh1-006 데스크톱 · gh2-007 작은 휴대폰 'control navigated away')이 이번 스윕에서 GRAMMAR I 데스크톱 33강 · 작은 휴대폰 5강 · GRAMMAR II 12강으로 나타남 — 앱 동작인지 도구 탓인지는 triage 에서 가림.
- 운영 데이터: 이 일은 감사 이용권 사본으로 읽기 · 소리 누르기 · 문제 풀어 보기만 함. 완료 · 이용권 상태 · 관리자 API 0.

