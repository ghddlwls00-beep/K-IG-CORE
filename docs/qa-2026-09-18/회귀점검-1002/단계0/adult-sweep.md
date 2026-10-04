# 회귀 점검 1002 · 단계 0 — adult-sweep (전 쪽 × 3화면 스윕 드라이버 · 기대 글 · 집계)

2026-10-04 · 작업 트리 `nostalgic-blackburn-048c73` (HEAD 7bfd5d7b) · 포트 9710~9715 · 프로필 사본 `kig-audit-0918-rc1002-adult-sweep-1` 하나(한 번에 Edge 하나).
**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 내용 파일(content/ · src/) 안 바꿈 · 커밋 · 푸시 · R2 · 배포 안 함.

## 한 줄
스윕 드라이버가 이제 ADULT 5단계를 다 안다(모르는 단계는 BLOCKED). 운영 ADULT a1-2 · a6-2 · a12-3 × 데스크톱 · 휴대폰 · 작은 휴대폰 9방문 모두 PASS(글 408/408 · 소리 버튼 292/292),
STUDENT s1-1 · s20-5 × 3화면은 PASS — 단, 드라이버의 옛 완료 시험이 이미 완료된 s1-1 을 '미완료' 로 남긴 결함을 찾음(되돌려 놓고 드라이버를 고침, 아래 ⑤).

## 고친 파일 (줄은 지금 파일 기준)

| 파일 | 바뀐 것 |
|---|---|
| `scripts/drive-generic.cjs` | 93 `DRIVER_REV` → `…-a1002` (STUDENT · 다른 과정 동작은 아래 ⑤ · Hangul 말고 그대로). 1102 화면 `small`(작은 휴대폰)은 휴대폰과 같은 깊이. 526 `clickStudentTile` 의 낱말 열쇠에 가-힣(한글 조각을 못 누르던 것). 554~595 `solveStudentTiles` — 데스크톱에서 한글 조각이 든 문장도 따로 조립(item 에 '· 한글 조각'). 597~620 `STUDENT_TABS` · `practiseStudent(…, course)` — ADULT 는 4 · 5단계. 625~629 `ADULT_PANEL` · `ADULT_KNOWN`(아는 5단계) · `--break=forget-chunk`. 634~705 `adultWords`(2단계: 카드 수 · 뜻 보기 → 그 카드의 뜻 · 품사 · 몰라요 · 알아요 접힘 · 요약 · 낱말 소리 = 그 낱말의 클립 · 빈칸 5문제(첫 문제 = 몰라요 낱말, 둘째는 일부러 틀림, 빈칸 문장 · 채운 문장 · 한국어 줄 · 보기 4) · 결과 'N / 5 맞힘' · 탭 수 · 다시 풀기). 707~760 `adultChunks`(3단계: 덩어리 영어 · 뜻 가림 · 덩어리 소리 = 그 덩어리 · 그 덩어리 뜻만 열림 · 뜻 모두 → 문장 전체 해석 · 끊어 듣기 · 문장 듣기). 953 끊어 읽기의 '다음 문장' 은 받아쓰기 걷기에서 뺌. 1107~1162 방문: 탭 수 ≠ 5 → BLOCKED · 탭마다 '옮길 때 소리 없음'(로그 비우고 누른 뒤 play() 0) · 화면 이름이 아는 단계가 아니면 BLOCKED · 2 · 3단계 루틴 · 다섯 단계 중 안 열린 것 BLOCKED. 1191~1300 완료 시험: ADULT 는 Step 5 · `kig:adult:pending:v1` 을 기다림 · /api/progress/adult 로 갔는지(그리고 student 로 안 갔는지) 셈 · 누르기 전에 GET /api/progress/adult(읽기만)로 장이 영구히 열릴지 student-data 로 판단해 열리면 BLOCKED · 이용권 세션이 없으면(401/403 — 로컬) 서버 저장은 안 봄 · **1216~1225 이미 완료된 강의는 먼저 연습**(⑤) |
| `scripts/lib/expectations.cjs` | 41 `COURSES` 에 adult · 43 `STUDENT_VIEW`. 207~231 `adultData`(낱말 · 빈칸 정답 · 덩어리 · 소리 클립 경로). 343~374 STUDENT · ADULT: 문장 종류를 블록으로(한글 낱말 든 영어 문장을 'ko' 로 보고 answers 에서 빼던 것) · ADULT 기대 글 word-card ('표현 · 품사 · 뜻 · 문장' 한 줄) · chunk ('en · ko') · chunk-whole. 400~421 `tileWordsAll` — 문장 자리를 지킴(한글 든 문장을 빼서 뒤 문장이 한 칸씩 밀리던 것). 428 `tileAnswers` · 430 `adult` |
| `scripts/lib/containers.cjs` | 122 `adult-words`(2단계 카드 한 장 = 한 줄, 접힌 카드 펴고 뜻 모두 보기 → 읽고 되돌림) · 150 `adult-chunks`(문장 번호마다 열고 뜻 모두 보기 → 덩어리 'en · ko' + 문장 전체 해석) · 271~274 `CONTAINERS.adult` · 머리 주석의 '같은 선택자가 닿는 다른 곳' |
| `scripts/lib/harness.cjs` | 34 `MARKERS.adult = "ADULT 목록"`(없어서 빈 화면도 '그렸음') · 237 `VIEWPORTS.small` 360×780 |
| `scripts/lib/student-data.cjs` | 227~250 `chaptersOf(course)` · `completionWouldUnlockIn(course, id, lessons)` — ADULT 12장 규칙(STUDENT 내보내기 그대로) |
| `scripts/build-coverage.cjs` | 57 `COURSE_TABLE` 한 목록(ADULT 55 더함 · PASS-OFF 는 한 줄 주석 — proof 일꾼이 더함) · 69 표에 없는 과정은 '아직 세지 않음' 으로 적힘(전에는 PASS-OFF 67쪽이 이름 'undefined' 의 NOT TESTED) · 72 `--screens desktop,mobile,small` · `--break=no-adult` · 합계 기준은 표에서 계산 |
| `scripts/prove-coverage-rules.cjs` | 95~104 Q · R · S · T · U 다섯 경우 더함(ADULT 줄 · --screens · 기록 지운 판 NOT TESTED · no-adult 깨기 · PASS-OFF 안 셈) |
| `scripts/proof-tests.json` | 12개의 깨뜨릴 곳을 지금 코드의 파일:줄 + 바꿀 것(`break`)으로. 글이 바뀐 셋 고침(GRAMMAR II gh2-007-1 · STUDENT s1-1 한국어 · LISTENING 1번 문장 '바버라'). READING 한글 지문은 Step 3(9/28 순서 바꿈). ADULT 5개 더함(a1-1 · a1-2) |
| `scripts/proof-summary.cjs` | 34 `check` 시험(화면 글이 아니라 기록의 검사로 판정 — 받아쓰기 · 완료) · 시험별 `viewports` · `break` 출력 · small |
| `scripts/proof-run.cjs` | small 화면 글도 복사 |
| `scripts/recount-content.cjs` (새) | 저장된 운영 기록의 '화면에 있어야 할 글자' 를 브라우저 없이 다시 셈 · `--expectations <사본>` |

## 깨기 증명

| 도구 | 명령 | 깨뜨린 것 | 깨진 결과 | 되돌린 뒤 |
|---|---|---|---|---|
| 기대 글 대조(expectations + content-check, recount-content) | `node recount-content.cjs --files adult-rc1002-adultsweep.jsonl --expectations lib/expectations.break-adultsweep.cjs` | 사본에서 a6-2 첫 덩어리 기대 글 끝에 ' (깨기)' | a6-2 데 · 모 · 작 각 '없음 1'(46/47) · 합계 없음 3 · **exit 1** | 원본으로: 408/408 · 없음 0 · **exit 0** |
| 같은 도구 · 다른 두 종류 | 같은 명령(둘째 사본) | a12-3 첫 단어 카드 뜻 끝 'X' · a1-2 1번 문장 전체 해석 끝 'X' | a1-2 3화면 '없음 chunk-whole' · a12-3 3화면 '없음 word-card' · 없음 6 · **exit 1** | 원본 exit 0 (사본은 지움) |
| build-coverage (운영 기록) | `build-coverage --files adult-rc1002-adultsweep.jsonl --screens desktop,mobile,small` vs a6-2 줄을 지운 사본 | ADULT 기록 하나(a6-2 3화면) 지움 | ADULT PASS 2 · NOT TESTED 53 · a6-2 **NOT TESTED '셀 기록 없음'** | 원본: PASS 3 · NOT TESTED 52 · a6-2 PASS · 합계 일치 ✔ |
| build-coverage 과정 목록 | 같은 기록 `--break=no-adult`(10/4 전 목록) | ADULT 를 목록에서 뺌 | 기록 0 셈 · ADULT 줄 없음 · '아직 세지 않음: adult — 기록 9건 뺌' (옛 도구는 이것을 말없이 버렸음) | 목록 그대로: ADULT 줄 55 |
| prove-coverage-rules | `node prove-coverage-rules.cjs` | 깨기 판(ignore-blocked · merge-all · old-dictation-rule · grammar-any-note · **no-adult**)을 지금 규칙과 비교 | 각 깨기 판은 옛 동작(A · B · D · O · **T**) | 기대와 다름 0 · exit 0 (A~O2 25줄 + Q · R · S · T · U 5줄 = 30줄) |
| 드라이버 '모르는 단계' (운영 a1-1 휴대폰) | `drive-generic --course adult --ids a1-1 --viewports mobile --break=forget-chunk` | 드라이버가 '끊어 읽기' 를 모르게 | `adult step · Step 3 · 단계 알아봄` **BLOCKED** → build-coverage ADULT BLOCKED 1('모르는 단계 — 탭 3 … 끊어 읽기') | 깨기 없이: 39 PASS → build-coverage PASS 1 |
| 드라이버 완료 시험 (운영 STUDENT s1-1 데스크톱) | `--course student --ids s1-1 --viewports desktop` | 고치기 전 판(실제로 일어남 — 깨기가 아니라 발견) | 이미 완료된 강의: 취소 → 새로고침 → 단추 disabled → 되돌리지 못함 **FAIL** · 강의가 미완료로 남음 | 고친 판(먼저 연습): 취소 → 새로고침 → 다시 완료 **PASS** · 완료 상태 그대로 |

**지금 증명 못 한 것 (proof 일꾼 몫 — 앱을 깨뜨린 사본에서 proof-run)**: proof-tests.json 의 ADULT 5시험(a-base · a-broken · a-fixed · a-after)과 바뀐 12시험.
지금 판의 2 · 3단계 루틴 · 한글 조각 · ADULT 완료가 '앱이 틀리면 FAIL 을 내는지' 는 그 실행 전까지 PASS 가 아니다(운영 PASS 는 '돌았다' 만 증명).
proof-run 은 기본 화면(데스크톱 · 태블릿 · 휴대폰)으로 돈다 — 받아쓰기 · 완료 시험은 데스크톱만 읽게 `viewports: ["desktop"]`.
로컬 개발 서버는 이용권이 없어 ADULT 완료 시험이 GET /api/progress/adult 401 → '이 기기에만 저장' 으로 읽음(서버 저장은 운영 기록에서만 확인됨: +1 · student +0).

## 운영 표본 (이용권 사본 · 운영 https://k-ig-core.vercel.app · 2026-10-04 05:44~06:03Z)

기록: `out/features/adult-rc1002-adultsweep.jsonl` · `student-rc1002-adultsweep.jsonl` · `student-rc1002-adultsweep-s11fix.jsonl` · `adult-rc1002-adultsweep-forget(-ok).jsonl` · 화면 글 `out/rendered/{adult,student}/`.

| 강의 | 화면 | 검사 | 소리 | 글(있음/기대) | 문제 · 4xx | 한글 조각 받아쓰기 | 완료 |
|---|---|---|---|---|---|---|---|
| ADULT a1-2 (무료 · 내 정보 빈칸) | 데 · 모 · 작 | 268 · 40 · 40 PASS (NA 1 덮임) | 76 · 11 · 11 PASS | 36/36 × 3 | 0 · 0 | PASS "My name is 홍길동, but you can call me Mrs. 홍" 11/11 | PASS (Step 5 · adult +1 · student +0 · 연습 7/7) |
| ADULT a6-2 (유료 · 토요일 여성용 · 찜질방) | 데 · 모 · 작 | 277 · 39 · 39 PASS | 73 · 11 · 11 | 47/47 × 3 | 0 | PASS "…a 찜질방 we often talk through…" 25/25 (2부분) | PASS (연습 6/6) |
| ADULT a12-3 (유료 · 마지막 장 마지막 강의) | 데 · 모 · 작 | 299 · 39 · 39 PASS | 77 · 11 · 11 | 53/53 × 3 | 0 | PASS 34/34 (2부분) | 표본(10강마다) — 이 강의는 안 누름 |
| STUDENT s1-1 | 데 · 모 · 작 | 111+**FAIL 1** · 16 · 16 | 30 · 4 · 4 | 6/6 × 3 | 0 | (한글 없음) | **FAIL(드라이버 결함 ⑤)** → 고친 판 PASS |
| STUDENT s20-5 | 데 · 모 · 작 | 111 · 16 · 16 PASS | 57 · 4 · 4 | 12/12 × 3 | 0 | PASS "한라산 is the highest…" 16/16 · "…called 제주" 13/13 | PASS (연습 6/6) |

ADULT 단계별(9방문 모두): 탭 5개 · 단계 알아봄 5/5 · **옮길 때 소리 없음 5/5** · 단어 5검사 PASS(카드 수 · 뜻 보기/몰라요 · 알아요 접힘 · 낱말 소리 = 그 낱말 클립 · 빈칸 '1 / 2 맞힘'(a1-2) ·
'4 / 5 맞힘'(a6-2 · a12-3) · 탭 '단어 k/N' · 다시 풀기) · 끊어 읽기 5검사 PASS(덩어리 · 뜻 가림 · 덩어리 소리 = 그 덩어리 · 뜻 · 문장 전체 해석 · 끊어 듣기 = 첫 덩어리부터 · 문장 듣기 = 그 문장) · 받아쓰기 PASS · 콘솔 오류 0 · 4xx/5xx 0.
담는 곳에서 읽은 수(데스크톱): a1-2 student-cards 14 · adult-words 2 · adult-chunks 20 / a6-2 12 · 8 · 27 / a12-3 12 · 10 · 31.

### 속도 (쪽당 초 — 기록의 `at` 사이)
| | 지난번(관문 0 계획, gate0-sweep3b.cjs:26 · 39) | 이번 |
|---|---|---|
| 데스크톱 | STUDENT 240 (4분) | ADULT 161(표본 아님) · 172 · 199(완료 시험 쪽) — 평균 177 · STUDENT s20-5 113(완료 시험) · s1-1 63(연습 없이 — 옛 판) |
| 휴대폰 390 | STUDENT 30 | ADULT 33 · 37 · 36 · STUDENT 15 · 18 |
| 작은 휴대폰 360 | (없었음 — 태블릿 18) | ADULT 31 · 35 · ~35 · STUDENT 17 · ~18 |
| 강의 하나 × 3화면 | — | ADULT 약 245초(4.1분) → 55강 약 3.7시간(브라우저 하나) · STUDENT 약 100~150초 → 82강 약 2.5~3.4시간 |

## ⑤ 찾은 것 — 드라이버 완료 시험이 운영 이용권 기록을 바꿔 놓음 (고침 · 되돌림)
- 무엇: STUDENT s1-1 이 감사 이용권 기록에서 이미 '완료' 였음(누가 했는지는 모름). 옛 완료 시험은 취소 → 새로고침 → 다시 누르기인데, 새로고침 뒤에는 연습 기록이 없어 단추가 disabled(STU-U26 — 완료를 본 화면에서만 다시 누를 수 있음) → 되돌리지 못하고 **미완료로 남김**(05:59:48Z, out/data-changes.jsonl).
- 되돌림: 강의 화면에서 학습자처럼 연습 3/3 → '이 강의 학습 완료' → 저장 끝 → 새로고침 '학습 완료 취소'(= 완료) 확인(scratchpad restore-s1-1.cjs · data-changes.jsonl 에 적음). 이용권 · 관리자 API 안 씀.
- 고침: 드라이버 1216~1225 — 시작이 완료면 먼저 연습. 같은 s1-1 에서 PASS, 끝 상태 = 시작 상태(완료).
- 남는 것: 9/24~26 관문 스윕도 같은 판이라, 그때 '이미 완료' 였던 강의(10강마다 + 마지막)를 미완료로 남겼을 수 있음 — 그 기록의 completion FAIL 이 '취소|완료 취소 → … disabled' 꼴인 것을 찾아보면 됨(이 몫 밖 — 아래).

## 다른 몫에서 찾은 것 (고치지 않음)
1. `E.COURSES` 에 adult 가 들어감 → 그것을 도는 도구가 이제 ADULT 를 셈: audio-inventory · check-completeness · check-data-hygiene · check-data-integrity · check-integrity(돌려 봄: 손상 0 · exit 0) · check-review-coverage · drive-common(-0926) · progress(돌려 봄: adult 165 방문 줄). 각 주인이 숫자 · 깨기를 다시 봐야 함.
2. STUDENT 의 `answers` · `tileWordsAll` 이 한글 낱말 든 48문장만큼 늘어남(24강의 받아쓰기 낱말이 10/2 뒤로 한 칸씩 밀려 있었음 — s1-2 · s12-3 · s13-2 · s13-3 · s17-1~3 · s18-1~3 · s19-2~4 · s2-5 · s20-2~5 · s3-2 · s4-5 · s6-1~3 · s8-3). 이것을 읽는 grade-offline · check-dictation · compare-grading · prove-tile-slash 의 수가 바뀜.
3. 관문 스윕의 완료 시험 기록 점검(위 ⑤ 남는 것) — proof 일꾼 또는 주 세션.
4. PASS-OFF: build-coverage 의 `COURSE_TABLE` 에 한 줄(주석에 적어 둠)만 더하면 셈 — passoff-sweep 일꾼의 drive-passoff.cjs 증명 뒤 proof 일꾼이.
5. '3화면': 명령서는 '휴대폰 · 작은 휴대폰 · 데스크톱' 이고 관문 0 은 데스크톱 · 태블릿 · 휴대폰이었음. 하네스에 small(360) 을 더하고 기본값은 그대로 둠 — 단계 1 은 `--viewports desktop,mobile,small` + build-coverage `--screens desktop,mobile,small` 로 맞출 것(태블릿을 계속 볼지는 주 세션이 정함).

## 단계 1 에 쓸 명령
- `node docs/qa-2026-09-18/scripts/drive-generic.cjs --course adult --viewports desktop,mobile,small --suffix -rc1002-s1 --port 9711 --clone rc1002-<이름>-1 --redo` → `out/features/adult-rc1002-s1.jsonl` 165방문, 쪽마다 글 있음 = 기대(합 1,715 × 3), FAIL 0 기대, 약 3.7시간(브라우저 하나). 나누려면 `--shard 1/2` · `--suffix -rc1002-s1-1` 처럼 따로.
- STUDENT 같은 꼴 `--course student` (82쪽 · 글 828 × 3).
- `node docs/qa-2026-09-18/scripts/recount-content.cjs --files adult-rc1002-s1.jsonl` → 없음 0 · exit 0.
- `node docs/qa-2026-09-18/scripts/build-coverage.cjs --files <그 기록들> --screens desktop,mobile,small --out-dir <폴더>` → ADULT 55 = PASS+FAIL+BLOCKED+NOT TESTED, NOT TESTED 0.
- `node docs/qa-2026-09-18/scripts/prove-coverage-rules.cjs` → 기대와 다름 0 · exit 0.
