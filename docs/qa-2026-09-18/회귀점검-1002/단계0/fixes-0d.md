# 단계 0 마무리 — fixes-0d (build-coverage · drive-passoff · recheck-audio) — 2026-10-04 18:0x~18:4x

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.**
작업 폴더: 작업 트리 `nostalgic-blackburn-048c73`. 내용 파일(content/ · src/) 안 바꿈(`git status -- content src` 빈 것) · 커밋 · 푸시 0 ·
이용권 코드 · PIN · 토큰 값 출력 · 타이핑 0 · /api/license/ · /api/admin/ 호출 0 · 원본 프로필 안 건드림(사본 `rc1002-0d-recheck` 만) ·
남의 프로세스 안 끔(rc-sweep pid 7448 · drive-generic 2개 · passoff-chain 의 drive-passoff 그대로) · drive-generic.cjs · drive-reading.cjs 안 고침.
운영 방문: recheck-audio 5번(브라우저 하나씩 차례로 · 포트 9890~9894 · 띄우기 전 남은 메모리 1.65~1.82GB) — 합 44버튼(강의 a1-2 · pg01-1 · gh2-016 · gh2-017 · gh2-025).
그 밖의 증명은 모두 브라우저 · 운영 0(기록 사본 · 가드).

## 고친 파일 · 줄 (이 일에서 바꾼 곳만 — 줄은 지금 파일 기준)

| 파일 | 줄 | 바뀐 것 |
|---|---|---|
| `docs/qa-2026-09-18/scripts/build-coverage.cjs` | 29-34 | 머리 주석 ⑦⑧⑨ |
| 〃 | 48-49 | `--break=` 에 `device-only-blocks` · `count-break-records` · `units-from-summary`(고치기 전 동작) |
| 〃 | 124-140 | ⑦ `DEVICE_ONLY` 표(READING `step3` · `mic` · note `^BLOCKED \(real microphone\)` 하나만) · `deviceOnlyOf` · `deviceOnly` 셈 |
| 〃 | 205-227 | ⑧ `counted` 에 `breakRecords` · `breakFiles` · `localRecords` · 깨기 기록(`break` 칸 · 파일 이름 `-break-`)과 로컬 기록(base localhost) 빼기 |
| 〃 | 238-247 | ⑨ `desktopLatest`(강의마다 데스크톱 가장 늦은 기록) |
| 〃 | 287-290 | ⑦ BLOCKED 갈래에서 실기기 몫이면 강의 BLOCKED 로 안 셈 |
| 〃 | 369-391 · 398 | ⑨ '학습 단위 · 확인함' 을 이 표가 센 기록의 content 로(과정별 — PASS-OFF 포함) · 못 세면 '셈 안 함(…)' |
| 〃 | 409-410 · 425-428 | coverage.json 에 `deviceOnly` · `unitsByCourse` · 표 아래 '실기기 몫' · '깨기 기록(셈에서 뺌) · 로컬 기록' 두 줄 |
| `docs/qa-2026-09-18/scripts/prove-coverage-rules.cjs` | 27-28 · 110-131 · 158-163 · 198-205 | 사례 X · X(깨기) · X2 · Y · Y(깨기) · Y2 · Z · Z(깨기) 더함 → **40사례** |
| `docs/qa-2026-09-18/scripts/drive-passoff.cjs` | 27-31 | 머리 주석(쓰임새 · --all · --dry-run) |
| 〃 | 50-89 | 인자 검사: 모르는 `--` 인자 · `--help`/`-h` · 값 빠짐 · 낱말 → 쓰임새 + exit 2 · 인자 없음 / 고르는 인자(--ids · --shard · --limit · --rejudge) 없음 → `--all` 없으면 exit 2 · `--shard` 꼴 · `--port` · `--licence` · `--resume`+`--redo` 검사 |
| 〃 | 589-598 | `--dry-run` 을 '이미 방문' 검사 · `--redo` 옮기기 앞으로(무엇을 돌릴지만 찍고 exit 0 · 파일 쓰기 · 브라우저 0). 옛 자리(브라우저 직전)의 --dry-run 줄은 지움 |
| `docs/qa-2026-09-18/scripts/recheck-audio.cjs` | 1-482 (거의 새로 씀 · HEAD 대비 +418/−110) | 아래 3절 |

교체 방법(drive-passoff): 돌고 있는 체인이 다음 조각에서 새 파일을 읽으므로 `drive-passoff.next-0d.cjs` 에서 고치고 증명한 뒤 `Move-Item` 으로 한 번에 바꿈(18:1x).
조각 1(pid 4028)은 옛 파일을 이미 읽어 그대로 돎.

## 1. build-coverage — 깨기 증명

### 1-1. 지금 out/features 기록 사본으로 (스크래치 `cov0d/feat` — reading-rc1002probe(21) · …-break-text(3) · 같은 깨기 기록을 늦은 시각 · 보통 이름으로 바꾼 사본(3) · passoff s0 · s0small · adult-rc1002-adultsweep), `--screens desktop,mobile,small`

| 고친 것 | 고치기 전 (스크래치 사본 `build-coverage.before-0d.cjs`) | 지금 | 지금 + `--break=<옛 동작>` |
|---|---|---|---|
| ⑦ 실제 마이크 (`--files reading-rc1002probe.jsonl`) | READING PASS/FAIL/BLOCKED **0/0/7** · pr001 BLOCKED · 실기기 몫 줄 없음 | **7/0/0** · pr001 PASS · '실기기 몫: READING 3단계 실제 마이크 인식 — 기록 7(강의 7 · 화면 desktop)' | `device-only-blocks` → 0/0/7 (옛 동작 재현) |
| ⑧ 깨기 파일 (`+ reading-rc1002probe-break-text.jsonl`) | **0/1/6 · pr001 FAIL**(깨기가 진짜 기록을 덮음) | 7/0/0 · pr001 PASS · '깨기 기록 3건(…-break-text.jsonl 3)' | — |
| ⑧ `break` 칸만 있는 늦은 기록(이름에 -break- 없음) | **0/1/6 · pr001 FAIL** | 7/0/0 · 뺀 깨기 3 | — |
| ⑧ `--since 2026-10-04T00:00:00Z`(사본 폴더 전부) | — | READING 7/0/0 · 뺀 깨기 6 | `count-break-records` → **6/1/0 · pr001 FAIL** |
| ⑨ 학습 단위 확인함 (`--files` passoff s0 · s0small · adult) | **'?'**(features-summary.json 없음 — 이 선택과 무관한 묶음) | **710 (기대 710 중 있음 · 데스크톱 기록 7강)** — ADULT 136/136(3강) · PASS-OFF GRAMMAR 574/574(4강) · 그 밖 과정 '셈 안 함(데스크톱 기록 없음)' | `units-from-summary` → '?' |

명령: `node <스크래치>/prove-cov-0d.cjs <스크래치>/build-coverage.before-0d.cjs docs/qa-2026-09-18/scripts/build-coverage.cjs` (결과 표는 스크래치 `cov0d/out/*`).

### 1-2. 진짜 out/features 를 `--since 2026-10-04T00:00:00Z` 로 (결과는 스크래치 `cov0d/since-{old,now}` — out/coverage.json 안 덮음)

| | 기록 | 뺀 것 | READING | VOCA | GRAMMAR I | 학습 단위 확인함 |
|---|---|---|---|---|---|---|
| 고치기 전 | 561 | (칸 없음) | 1/1/5/505 — **pr001 FAIL**(깨기 기록) | 0/0/1/194 — mv1-01 **BLOCKED**(로컬 증명 기록) | 0/1/1/192 — gh1-007 BLOCKED(로컬) | ? |
| 지금 | 462 | 깨기 21 · 로컬(localhost) 78 | 7/0/0/505 — pr001 PASS | 0/0/0/195 | 0/0/0/194 | 8303 (기대 8312 · 데스크톱 352강) |

→ ⑧ 은 명령의 '깨기 기록' 에 더해 **로컬(base localhost) 기록도 뺌** — proof 일꾼의 `*-proof-rc-{fixed,after}.jsonl`(깨뜨린 앱 사본에 대고 돈 기록)은 `break` 칸도 `-break-` 이름도 없어
`--since` 로 세면 아직 운영 스윕이 안 된 VOCA · GRAMMAR I 강의가 로컬 기록으로 BLOCKED/PASS 가 됐다(위 표). 작업기록 '기준'(로컬 결과는 근거가 아님)과 같은 원리라 같이 뺐다(사례 Y2).

### 1-3. prove-coverage-rules (운영 · 브라우저 0)

`node docs/qa-2026-09-18/scripts/prove-coverage-rules.cjs` → **40사례 기대대로 40 · 기대와 다름 0 · exit 0 (142초)**. 새 사례:

| 사례 | 만든 기록 | 지금 | 옛 동작(깨기) |
|---|---|---|---|
| X | READING pr002 데스크톱 `step3 · mic · BLOCKED (real microphone) — must be checked on a real device`(drive-reading.cjs:1229 그대로) | PASS · 실기기 몫 1기록(강의 1) | `device-only-blocks` → BLOCKED · 실기기 몫 0 |
| X2 | 같은 칸 · 다른 글 'tester did not open' | BLOCKED 그대로(넓게 안 잡음) | — |
| Y | s3-1 PASS + 이름에 `-break-` 든 늦은 FAIL · s3-2 PASS + 같은 파일 늦은 `break: "text"` FAIL | 둘 다 PASS · 뺀 깨기 2 | `count-break-records` → 둘 다 FAIL |
| Y2 | s3-3 운영 PASS + 늦은 localhost FAIL | PASS · 로컬 1건 뺌 | `count-break-records` → FAIL |
| Z | pg01-1 데스크톱 content 114/114 · a1-1 19/19 · pg01-2 content 없음 | 확인함 '133 (기대 133 중 있음 · 데스크톱 기록 2강)' · 'PASS-OFF GRAMMAR 114/114(1강) · content 없는 기록 1강' | `units-from-summary` → '?' |

### 1-4. 마이크 BLOCKED 를 어디까지 실기기 몫으로 보나 (기록을 보고 정함)

이 작업 트리 out/features 51파일 · 본 폴더 out/features 288파일의 BLOCKED 를 'mic · 마이크 · speech · recogni · real device' 로 찾음 → **READING `step3 · mic` 하나뿐**(이 작업 트리 14기록 · 본 폴더 25기록).
LISTENING 은 `lib/ld-fake-stt.js` 주석에 'Step 4 BLOCKED (real microphone)' 가 있지만 지금 드라이버(drive-generic)가 그 칸을 쓰지 않아 기록 0 — 그래서 넣지 않음(생기면 기록을 보고 한 줄).
STUDENT · ADULT · GRAMMAR · VOCA 의 마이크는 가짜 인식기로 화면 배선을 PASS/FAIL 로 적고 BLOCKED 를 쓰지 않음.

## 2. drive-passoff — 인자 검사 깨기 증명 (운영 방문 0)

가드 `no-visit-guard.cjs`(스크래치): `node -r` 로 걸면 `H.startBrowser`(사본 복사 → Edge) · 브라우저 실행 · fetch · http(s) · net 연결을 부르는 순간 그 이름을 찍고 exit 99 —
운영에 닿기 전에 멈추므로 고치기 전 판의 '전수 스윕 시작' 을 안전하게 재현한다. 명령: `node <스크래치>/prove-passoff-args.cjs <스크래치>/drive-passoff.before-0d.cjs docs/qa-2026-09-18/scripts/drive-passoff.next-0d.cjs`(교체 전 사본으로 · exit 0) — 교체 뒤 같은 dry-run 다시 확인.

| 판 | 인자 | exit | 브라우저 · 연결 시도 | 첫 줄 |
|---|---|---|---|---|
| 고치기 전 | `--help` | **99** | **H.startBrowser(rc1002-passoff-sweep-main, 9720)** | passoff-grammar: 201 방문(강의 67 × 화면 desktop·mobile·small) · base https://k-ig-core.vercel.app · 이용권 있음(사본) … |
| 고치기 전 | `--bogus` | **99** | 〃 | 〃 (07:17Z 사고와 같은 길) |
| 고치기 전 | (인자 없음) | **99** | 〃 | 〃 |
| 고치기 전 | `--shard 1/3 --suffix -rc1002-g1-s1 --port 9720 --extra-pages --dry-run` | 1 | 없음 | '이미 방문 29 — --resume …' (미리 보기가 '이미 방문' 검사 뒤에 있어 못 봄) |
| 지금 | `--help` | **2** | 없음 | drive-passoff: --help — 쓰임새만 찍고 끝냅니다(운영 방문 0) + 쓰임새 |
| 지금 | `--bogus` | **2** | 없음 | 모르는 인자 --bogus |
| 지금 | (인자 없음) | **2** | 없음 | 인자가 없음 — 전수 스윕은 --all 로만 시작합니다 |
| 지금 | `--suffix -x --port 9720`(고르는 인자 없음) | 2 | 없음 | 고르는 인자(--ids · --shard · --limit)가 없음 — 전수 스윕은 --all 로만 |
| 지금 | `--shard 1/3 --suffix -rc1002-g1-s1 --port 9720 --extra-pages --dry-run` | **0** | 없음 | 강의 23 × 3화면 = 69 · 이미 방문 29 · 실제로 돌면 '이미 방문' 으로 exit 1(--resume 필요) · clone rc1002-passoff-sweep-rc1002-g1-s1 · port 9720 · extra-pages 예 |
| 지금 | `--shard 2/3 --suffix -rc1002-g1-s2 --port 9721 --dry-run` | **0** | 없음 | 강의 22 × 3 = 66 · 이미 방문 0 · 실제로 돌면 66 방문 · port 9721 |
| 지금 | `--shard 3/3 --suffix -rc1002-g1-s3 --port 9722 --dry-run` | **0** | 없음 | 강의 22 × 3 = 66 · port 9722 |
| 지금 | `--all --dry-run` | 0 | 없음 | 67 × 3 = 201 |
| 지금 | `--rejudge …/passoff-grammar-rc1002-s0.jsonl` | 0 | — | 12방문 PASS(전과 같음) |

그 밖에 지금 판 exit 2: `-h` · `--shard`(값 없음) · `--shard 4/3` · `--shard 1/3 oops`(낱말). 체인(`out/rc1002/passoff-chain.ps1`)의 인자 `--shard i/3 --suffix -rc1002-g1-s<i> --port 972x [--extra-pages]` 는 그대로 받아들여짐(위 dry-run 셋).
**실제로도 확인**: 체인 로그 18:33:32 'exit passoff shard 1/3 code 0' → 'start passoff shard 2/3' — 새 파일로 뜬 조각 2(pid 6320, `--shard 2/3 --suffix -rc1002-g1-s2 --port 9721`)가 '66 방문(강의 22 × 화면 desktop·mobile·small) · clone rc1002-passoff-sweep-rc1002-g1-s2 · port 9721' 로 시작함.

## 3. recheck-audio (관문 5) — 고친 것 · 운영 확인 · 깨기

### 3-1. 고친 것

1. **--from 필수**(없으면 exit 2) — 지난 관문 함정 ①(--from 없이 out/features 옛 기록 전부 + 옛 recheck-audio*.jsonl 섞음). `--from` 은 쉼표 목록 · 이름만 주면 out/features · `*` 허용.
   읽은 파일에서도 **강의 × 화면마다 가장 늦은 기록만** · 깨기 파일(`-break-`) · `break` 칸 · **다른 주소(base ≠ 운영) 기록 · `-pages.jsonl` 은 뺌**(뺀 수를 찍음). '이미 함' 은 이 실행의 출력 파일만 · **--suffix 필수**.
2. **뺌 규칙은 버튼 이름에만**(함정 ② titleOnlyMic — 단계 이름 '섀도잉 & **발음 테스트**' · '1.5**배속** 청취' 때문에 진짜 재생 버튼을 뺐던 것). 속도 규칙은 이름이 🔊 · 🐢 로 시작하거나 '연속 청취' 면 재생 버튼으로 봄(작업기록 620 의 1,344곳).
   드라이버가 제 선택자로 누른 버튼(ADULT 낱말 · 덩어리 · 문장 · PASS-OFF 문장 듣기)은 이름에 '듣기' 가 없어도(덩어리 버튼 이름 = 덩어리 글) 빼지 않음.
3. **판정: 그 버튼의 클립이 재생돼야 PASS**(전에는 무엇이든 재생되면 PASS · 늘 exit 0). 기대 클립 = 대상 파일의 want → 지금 화면에서 정한 것(빈칸 문제는 새로 연 쪽의 data-order 문장) → 스윕 기록이 그 버튼에서 기대한 클립(`clips[].expected`) → 데이터(PASS-OFF `clipOf` · ADULT 낱말 say · 덩어리 · 문장). 다른 클립 → FAIL ·
   데이터로 정해지는 버튼은 기록의 클립이 데이터와 달라도 FAIL · 클릭이 다른 요소에 떨어지면(covered) FAIL 이 아니라 BLOCKED. **exit 1 = FAIL 또는 BLOCKED**.
4. **ADULT · PASS-OFF 의 그 자리까지 감**: ADULT 2단계 낱말 소리(그 낱말 카드) · 빈칸 문장 듣기(첫 보기 → 판정 → 문장 듣기) · 3단계 덩어리 소리 N · 끊어 듣기 · 문장 듣기(1번 문장 — 번호 단추는 누르면 그 문장 덩어리를 틀어서 이미 1번이면 안 누르고, 돌고 있으면 먼저 멈춤) /
   PASS-OFF ① 앞 문장부터 차례로 '영어 보기' → 그 문장 '문장 듣기' · ④ ⑤ 탭 → 앞 문장들을 모범 답(레슨 철자)으로 '맞았어요' → 그 문장도 맞힌 뒤 '문장 듣기'(스윕과 같은 일 — 감사 이용권 학습 기록에 남을 수 있음 · 완료는 안 누름).
5. **접힌 `<details>` 안 버튼은 `<summary>` 를 먼저 눌러 엶**(학습자처럼) — 아래 3-2 의 GRAMMAR '재생'.
6. `--count`(브라우저 없이 과정별 누른 수 · PASS/FAIL/RETEST · 다시 볼 대상 수) · `--dry-run` · `--status`(기본 RETEST,FAIL · `PASS` · `any`) · `--ids` · `--controls` · `--clone` · `--redo` · 모르는 인자 exit 2 ·
   브라우저 띄우기 전 남은 메모리 1GB 아래면 1분씩 기다림. READING(drive-reading)은 audio 에 상태 칸이 없어 '재생됨 · 기대 클립 요청 · 오류 없음 · TTS 없음' 으로 셈만(다시 누르기 대상 아님 — 그 실패는 같은 기록의 playProbe 검사 FAIL 로 강의 FAIL).

### 3-2. 운영에서 돌림 (이용권 사본 `rc1002-0d-recheck` · 브라우저 하나 · 차례로)

| # | 명령(작업 트리 `docs/qa-2026-09-18/scripts` 에서) | 결과 | exit |
|---|---|---|---|
| a | `--from adult-rc-desktop-1of1.jsonl,passoff-grammar-rc1002-g1-s1.jsonl,grammar2-rc-desktop-2of5.jsonl --ids a1-2,pg01-1,gh2-016,gh2-017 --status any --controls <ctl> --suffix -rc1002-0d-a --port 9890` | 18버튼: PASS 12 · **FAIL 5 · BLOCKED 1** — ADULT '끊어 듣기' FAIL · PASS-OFF ① a3 BLOCKED · GRAMMAR II '재생' 4 FAIL → **셋 다 도구 탓으로 밝혀 고침**(아래) | 1 |
| b | 같은 꼴 ADULT · PASS-OFF 만(`--ids a1-2,pg01-1 --controls <ctl-ap>`) `--suffix -rc1002-0d-b --port 9891` — **고친 뒤 · 원본 기록** | **14/14 PASS** — ADULT 9(전체 듣기 · 1단계 · 2단계 낱말 소리 · 빈칸 문장 듣기 · 2단계 낱말 '듣기' · 3단계 덩어리 소리 1 · 끊어 듣기 · 문장 듣기 · 1번째 덩어리) · PASS-OFF 5(① a1 · a3 · ④ p1 · p3 · ⑤ t1) — 모두 기대 클립 재생 | **0** |
| c | 같은 선택을 **깨기 사본**으로(`--from <스크래치>/rc0d/adult-rc-0d-otherclip.jsonl,<스크래치>/rc0d/passoff-grammar-rc1002-0d-otherclip.jsonl` — a1-2 · pg01-1 의 기대 클립 104곳을 같은 강의 다른 문장 클립으로) `--suffix -rc1002-0d-c-otherclip --port 9892` | **FAIL 13 · PASS 1** — 'asked for …/2f-b316….mp3 — this control's clip is …/1s-bc78….mp3' 꼴. PASS 1 = 빈칸 문장 듣기(기대 클립을 기록이 아니라 새로 연 화면의 문제에서 정함 — 사본의 영향 밖) | **1** |
| d | `--from grammar2-rc-desktop-2of5.jsonl --ids gh2-016 --suffix -rc1002-0d-d --port 9893`(진단 — 누른 요소 기록) | 2 FAIL · pressed '재생' · **covered=true**(클릭이 다른 요소에 떨어짐) | 1 |
| e | `--from grammar2-rc-desktop-2of5.jsonl,grammar2-rc-desktop-3of5.jsonl --ids gh2-016,gh2-017,gh2-025 --suffix -rc1002-0d-e --port 9894` — **오늘 스윕의 RETEST 5개**, `<details>` 고친 뒤 | **5/5 PASS**(그 강의 클립 재생 · covered 0) | **0** |

`<ctl>` = `^(\(initial\) ▶ 전체 듣기|Step 1 · 블라인드 리스닝 ▶ 듣기 1번|Step 2 · |Step 2 ▶ graduate|Step 3 · (덩어리|끊어|문장 듣기 ▶)|Step 3 ▶ My name|① pg01-1:a[13] ▶|④ pg01-1:p[13] ▶|⑤ pg01-1:t1 ▶|\(initial\) ▶ 재생$|Step 1 · 영작 훈련 ▶ 재생$)` (b · c 는 끝의 GRAMMAR 두 갈래 뺀 `<ctl-ap>`).
결과 파일: `docs/qa-2026-09-18/out/recheck-audio-rc1002-0d-{a,b,c-otherclip,d,e}.jsonl`(+ `-skipped.json`). 클립 바꾼 사본: 스크래치 `rc0d/`(만든 스크립트 `make-otherclip.cjs`).

a 에서 찾은 도구 탓 셋(모두 고친 뒤 b · e 로 PASS 확인):
- ADULT '끊어 듣기' 'no audio request' — 도구가 1번 문장으로 돌아가려고 번호 단추(`data-pill`)를 눌렀는데, 그 단추는 그 문장 덩어리를 틀고(StudentLearningView `openChunkSentence(i, true)`) 그다음 '끊어 듣기' 누름은 그 재생을 **끄기만** 함 → 1번이면 안 누르고, 돌고 있으면 먼저 멈춤.
- PASS-OFF ① a3 '영어 보기가 6초 안에 깨지 않음' — 문장은 차례로 열림 → 앞 문장부터 차례로 엶.
- GRAMMAR II '(initial) ▶ 재생' · 'Step 1 · 영작 훈련 ▶ 재생' — 위 재생기가 접힌 `<details data-answer-player>`('정답 문장 전체 듣기', `src/app/[course]/[lesson]/page.tsx:434`) 안에 있어 클릭이 다른 요소에 떨어짐(covered) → summary 를 먼저 엶. **스윕 쪽(drive-generic)도 같은 까닭으로 RETEST 를 남긴 것으로 보임**:
  오늘 GRAMMAR II 운영 기록의 RETEST 77 은 모두 이 '재생' 두 자리(본 폴더의 9/22~9/25 GRAMMAR I · II 기록은 같은 버튼 PASS 679 · FAIL 1 · 9/27 화면 고침 뒤 기록은 RETEST 만). drive-generic 은 돌고 있어 고치지 않음 — 단계 1 에서 recheck-audio 로 가림.

### 3-3. 고치기 전 동작 재현 (브라우저 · 운영 0 — `node <스크래치>/prove-recheck-traps.cjs <스크래치>/recheck-audio.before-0d.cjs docs/qa-2026-09-18/scripts/recheck-audio.cjs`)

| 함정 | 고치기 전 | 지금 |
|---|---|---|
| ① --from 없이 | 인자 없이 돌면 out/features 전부를 읽어 '재검사에서 제외 517 · re-checking **86** controls' 뒤 **H.startBrowser(recheck, 9600)**(가드 exit 99) — 86 중 오늘 운영 기록 대상은 77, 나머지는 로컬 증명 기록(localhost — grammar1-proof · phonics-proof) 대상(어림 9~13 — 같은 거르개로 따로 셈) | exit 2 '--from 이 필요합니다' |
| ② 마이크 규칙(최종 관문 5 대상 중 titleOnlyMic 47 — 'STEP 4 🗣️ 섀도잉 & 발음 테스트 ▶ 🔊 소리 듣기') | 47 중 다시 봄 **0** | **47** |
| ② 속도 규칙(speed-play 1,344 — '🔊 표준 속도' · '🔊 1x #0' · '🐢 …' · '연속 청취') | 1,344 중 **0** | **1,344** |
| ② 오늘 ADULT 기록 버튼 570(adult-rc-desktop-1of1) | 559 — '3단계 · 덩어리 소리 1 ▶ Nice to meet you.' 등 11 뺌 | 570 |
| 오늘 PASS-OFF 기록 버튼 621 | 621 | 621 |
| 진짜 마이크 · 속도 고르기 4(🎙️ 말하기 확인 · 0.85x · 🥉 1.0x 표준 속도 · 1번 문장 말하기) | 0(뺌) | **0(뺌 — 넓게 되살리지 않음)** |
| ③ 판정(다른 문장 클립) | 무엇이든 재생되면 PASS · exit 늘 0 | 3-2 c: FAIL 13 · exit 1 |

(고치기 전 판이 쓴 `out/recheck-audio-skipped.json` 은 이 증명이 만든 것이라 지움 — 그 전에는 없던 파일.)

### 3-4. 단계 1 ④ '음성 버튼 누른 수 / 실패 수(과정별)' — 명령

작업 트리 뿌리에서:
```powershell
# 셈만(브라우저 0) — 과정별 누름 · PASS · FAIL · RETEST(강의×화면마다 가장 늦은 기록) + 다시 볼 대상 수
node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl" --count
# 다시 누르기(운영 · 이용권 사본 · 브라우저 하나) — 대상 = 위의 RETEST · FAIL(재생 버튼만). exit 0 = 모두 PASS
node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl" --suffix -rc1002-s1 --port 9890 --clone rc1002-<이름>-recheck
```
- `*-rc-*` = rc-sweep 의 `<과정>-rc-<화면>-<i>of<n>(-r<k>).jsonl`(drive-generic — STUDENT · ADULT · VOCA · GRAMMAR I · II · LISTENING)과 `reading-rc-<i>of<n>.jsonl`(drive-reading). 같은 이름 꼴의 `*-proof-rc-*` 는 base localhost 라 빠짐(찍힘).
  `passoff-grammar-rc1002-g1-*` = 체인의 세 조각(`-pages.jsonl` 은 저절로 빠짐). 다른 기록(adult-rc1002-adultsweep 등 단계 0 기록)은 넣지 말 것.
- 이 시각(18:2x) `--count` 값(스윕 도는 중 — 참고): ADULT 7기록 · 누름 362 · PASS 362 / GRAMMAR II 72 · 770 · PASS 693 · **RETEST 77** / LISTENING 138 · 2,906 · RETEST 15 / STUDENT 82 · 3,988 · RETEST 10 / PASS-OFF 45 · 472 · PASS 472. FAIL 0.
  다시 볼 대상 77(모두 GRAMMAR II 위 재생기 — 3-2 e 로 5/5 PASS 확인한 꼴). LISTENING 15 · STUDENT 10 은 '재생 버튼 아님'(대본 줄 · 낱말 타일 — 클립이 걸렸지만 play() 0)으로 빠짐.
- 끊기면 같은 줄 다시(같은 --suffix — 출력 파일에서 BLOCKED 아닌 것은 건너뜀) · 처음부터는 `--redo`.

## 4. 셈 명령 (build-coverage)

```powershell
# 권하는 것: 스윕 파일을 이름으로 — passoff 는 -pages.jsonl 빼고
node docs/qa-2026-09-18/scripts/build-coverage.cjs --files <과정 기록들,…> --screens desktop,mobile,small --out-dir <폴더>
# 이제 --since 도 됨(깨기 기록 · 로컬 기록은 빠지고 수가 찍힘). 단계 1 스윕 시작 = 2026-10-04T06:19:23Z(rc-sweep state.json)
node docs/qa-2026-09-18/scripts/build-coverage.cjs --since 2026-10-04T06:19:00Z --screens desktop,mobile,small --out-dir <폴더>
```
- `--since` 주의: 그 시각 뒤의 **운영 기록이면 단계 0 일꾼 기록도 섞임**(adult-rc1002-adultsweep · passoff-grammar-rc1002-s0/anon/big · reading-rc1002probe · student-rc1002-adultsweep 등 — 깨기도 로컬도 아님).
  강의 × 화면마다 가장 늦은 기록이 이기므로 스윕 기록이 더 늦으면 덮이지만, 스윕이 아직 안 간 강의는 그 기록으로 셈 → 단계 1 숫자는 `--files` 로 낼 것.
- 표 아래 두 줄: '실기기 몫(강의 판정에 안 셈): READING 3단계 실제 마이크 인식 — 기록 N(강의 N · 화면 desktop)' · '깨기 기록(셈에서 뺌): N건(…) · 로컬(localhost) 기록 N건'.
- '학습 단위' 줄: 확인함 = 이 선택의 강의마다 데스크톱 가장 늦은 기록의 content 있음/기대, 방법 칸에 과정별(PASS-OFF 포함). 데스크톱 기록이 없거나 content 가 없으면 그 과정은 '셈 안 함(…)'.
- 확인: `node docs/qa-2026-09-18/scripts/prove-coverage-rules.cjs` → 40사례 기대와 다름 0 · exit 0.

## 5. 남은 것 · 한계 (이 일이 증명 못 한 것)

- recheck-audio: drive-generic 의 **진행에 따라 생기는 버튼**(ADULT 4단계 '7번 우리말 듣기' 처럼 앞 문장을 풀어야 나오는 것)은 새로 연 쪽에 없어 BLOCKED 가 될 수 있음 — 오늘 기록엔 그런 RETEST 0.
  빈칸 문장 듣기의 기대 클립은 새로 연 쪽의 문제로 정해서 '기록 사본' 깨기의 영향 밖(3-2 c 의 PASS 1). 휴대폰 · 작은 휴대폰에서만 RETEST 가 된 버튼은 그 화면으로 엶(오늘 운영 확인은 데스크톱만).
  LISTENING · STUDENT 의 RETEST 를 운영에서 다시 누른 것은 0(오늘 대상 0 — 모두 '재생 버튼 아님').
- drive-generic: GRAMMAR I · II 위 재생기(접힌 `<details>`) '재생' 을 접힌 채 눌러 RETEST 를 남김(9/27 화면 고침 뒤 모든 기록) — 돌고 있어 안 고침. 셈에는 영향 없음(RETEST 는 강의 FAIL 이 아님) · 단계 1 ④ 는 recheck-audio 로.
- `docs/qa-2026-09-18/최종관문-증거/scripts/gen-recheck-targets.cjs`(9/26 증거 스크립트)는 recheck-audio 의 옛 거르개 소스를 정규식으로 읽음 — 이제 '거르개를 못 찾음' 으로 exit 2(안전하게 멈춤). 지난 증거라 그대로 둠 — 새 recheck-audio 는 대상 뽑기를 스스로 함.
- 이용권 사본 폴더 `%TEMP%\kig-audit-0918-rc1002-0d-recheck` 남김(원본 아님 · 지워도 됨 — 주 세션 판단).
- 증명용 스크래치 파일(가드 · 고치기 전 사본 넷 · prove-*.cjs · cov0d · rc0d)은 이 세션 스크래치에만 있음(커밋 대상 아님).
