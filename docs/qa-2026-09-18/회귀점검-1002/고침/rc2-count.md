# 회귀 점검 1002 · 고침 · 두 번째 전 쪽 스윕(rc2) 마무리 셈 — 2026-10-05

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.**
운영(https://k-ig-core.vercel.app) 기록 37파일(`out/features/*-rc2-*.jsonl` · 2026-10-05 15:17:47 ~ 21:27:55 KST = 06:17Z ~ 12:27Z) · 3화면 desktop · mobile · small.
셈만 했음: 브라우저 0 · 운영 방문 0 · 도구 · 내용 파일 안 바꿈 · 커밋 · 푸시 · 배포 0 · 소리 다시 누르기 0.
새로 만든 파일: 이 문서 · `rc2-fails.json` · `rc2-coverage/coverage.md · coverage.json`(전부 이 폴더, 추적 안 됨). 쓴 임시 스크립트 · 결과는 이 세션 스크래치에만 있음.

## 0. 어떻게 셌나

```
node docs/qa-2026-09-18/scripts/build-coverage.cjs --files <state.json 의 files 37개> --screens desktop,mobile,small \
  --out-dir docs/qa-2026-09-18/회귀점검-1002/고침/rc2-coverage \
  --cloze-from <hopeful-joliot 작업 트리>/docs/qa-2026-09-18/out/grammar-cloze.json \
  --exam-from  <hopeful-joliot 작업 트리>/docs/qa-2026-09-18/out/grammar-exam-side1005.json
```

- 읽은 기록 2,367줄 = 방문 2,367(789쪽 × 3화면 · 같은 칸 두 기록 0 · 깨기 기록 0 · 로컬 기록 0 · 방문 오류 0 · 요청 기록 없는 쪽 0).
- **GRAMMAR 2단계(빈칸) · 4단계(종합 평가) 'NA'(=다른 도구가 봄)** 는 그 도구의 **결과 파일**에서 그 강의가 PASS 일 때만 덮이는 규칙(T3). 쓴 결과 파일은 옆 작업 트리(옆 세션)가 배포 뒤에 만든 것 — 빈칸 `grammar-cloze.json`(rev 54345a4b · 깨끗한 판 · 2026-10-05 15:32 KST · 282강 · 문제 강의 0) · 종합 평가 `grammar-exam-side1005.json`(운영 · 17:26 KST · 282쪽 PASS 282 · 파일 안 `allAlts` 칸은 false — 도구가 쓸 수 있는 꼴로 읽음). 읽기만 함.
  이 작업 트리 기본 결과 파일(빈칸 rev 7bfd5d7b · 종합 평가 10/4 운영)로 같은 명령을 돌려도 표가 똑같음(GRAMMAR I 194/0/0 · II 88/0/0 · 덮임 476 · 476).
- LISTENING · READING 은 **10강마다 1 표본**(색인 0 · 10 · 20 … — 도구의 쪽 목록 순서로 확인: LISTENING 552쪽 중 56 · READING 512쪽 중 52 · 기록된 쪽이 정확히 그 집합). 표본 밖 쪽은 도구 표에서 NOT TESTED(LISTENING 496 · READING 460)로 나오지만 **돌리지 않은 것**이지 실패가 아님. 아래 표는 표본 쪽 수로 적음.
- 과정 × 화면 표는 build-coverage 가 강의 단위 표만 내므로, 같은 파일을 읽는 **복사본**(스크래치 `bc-cell.cjs` = build-coverage.cjs 에 칸 셈만 끼운 것 — 판정 규칙 코드는 그대로 · 저장소 도구는 안 바꿈)으로 칸마다 셌음. 강의 합계가 도구 표와 같음을 확인(PASS 786 · FAIL 3 · BLOCKED 0 · NOT TESTED 956).

## 1. 강의 판정 (강의 하나 = 3화면 기록을 합친 판정 · 도구 표 그대로 — `rc2-coverage/coverage.md`)

| 과정 | 쪽 수 | 돌린 쪽 | PASS | FAIL | BLOCKED | 안 돌림(표본 밖) | 화면 3종 모두 기록 |
|---|---|---|---|---|---|---|---|
| STUDENT | 82 | 82 | 82 | 0 | 0 | 0 | 82/82 |
| ADULT | 55 | 55 | 52 | **3** | 0 | 0 | 55/55 |
| PASS-OFF GRAMMAR | 67 | 67 | 67 | 0 | 0 | 0 | 67/67 |
| VOCA | 195 | 195 | 195 | 0 | 0 | 0 | 195/195 |
| GRAMMAR I | 194 | 194 | 194 | 0 | 0 | 0 | 194/194 |
| GRAMMAR II | 88 | 88 | 88 | 0 | 0 | 0 | 88/88 |
| LISTENING | 552 | 56(10강마다 1) | 56 | 0 | 0 | 496 | 56/56 |
| READING | 512 | 52(10강마다 1) | 52 | 0 | 0 | 460 | 52/52 |
| **합계** | **1,745** | **789** | **786** | **3** | **0** | **956** | 789/789 |

실기기 몫(강의 판정에 안 셈): READING 3단계 실제 마이크 인식 — 기록 52(강의 52 · 데스크톱만 · 헤드리스로 못 봄).
연결 실패로 따로 센 것(강의 판정에 안 셈): 소리 줄 3 — GRAMMAR I gh1-068 작은 휴대폰(`ERR_ADDRESS_UNREACHABLE`) · LISTENING d091 작은 휴대폰(`ERR_INTERNET_DISCONNECTED` 2줄) — 모두 12:09Z 같은 시각(점검 기계 인터넷 끊김으로 보임).
NA 읽은 방식: GRAMMAR I 600줄 · GRAMMAR II 352줄이 다른 도구 결과로 덮임(안 덮임 0) · 표본 검사(새로고침) NA 는 그 과정에 새로고침 PASS 가 있어 모두 통과 · PASS-OFF 덮임 9 · READING '그 자리에 없음' 104(다른 자리 PASS 있음).

### 1-1. 과정 × 화면 (칸 하나 = 강의 × 화면)

| 과정 | 화면 | 칸 | PASS | FAIL | BLOCKED | NOT TESTED | 실기기 몫 |
|---|---|---|---|---|---|---|---|
| STUDENT | desktop | 82 | 82 | 0 | 0 | 0 | 0 |
| STUDENT | mobile | 82 | 82 | 0 | 0 | 0 | 0 |
| STUDENT | small | 82 | 82 | 0 | 0 | 0 | 0 |
| ADULT | desktop | 55 | 55 | 0 | 0 | 0 | 0 |
| ADULT | mobile | 55 | 54 | 1 | 0 | 0 | 0 |
| ADULT | small | 55 | 52 | 3 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | desktop | 67 | 67 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | mobile | 67 | 67 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | small | 67 | 67 | 0 | 0 | 0 | 0 |
| VOCA | desktop | 195 | 195 | 0 | 0 | 0 | 0 |
| VOCA | mobile | 195 | 195 | 0 | 0 | 0 | 0 |
| VOCA | small | 195 | 195 | 0 | 0 | 0 | 0 |
| GRAMMAR I | desktop | 194 | 194 | 0 | 0 | 0 | 0 |
| GRAMMAR I | mobile | 194 | 194 | 0 | 0 | 0 | 0 |
| GRAMMAR I | small | 194 | 194 | 0 | 0 | 0 | 0 |
| GRAMMAR II | desktop | 88 | 88 | 0 | 0 | 0 | 0 |
| GRAMMAR II | mobile | 88 | 88 | 0 | 0 | 0 | 0 |
| GRAMMAR II | small | 88 | 88 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | desktop | 56 | 56 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | mobile | 56 | 56 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | small | 56 | 56 | 0 | 0 | 0 | 0 |
| READING (표본) | desktop | 52 | 52 | 0 | 0 | 0 | 52 |
| READING (표본) | mobile | 52 | 52 | 0 | 0 | 0 | 0 |
| READING (표본) | small | 52 | 52 | 0 | 0 | 0 | 0 |
| **합계** | | **2367** | **2363** | **4** | **0** | **0** | **52** |

### 1-2. 화면에 있어야 할 글 · 네트워크

| 과정 | 화면 | 글 기대 | 있음 | **없음** | 없음 칸 | 4xx | 5xx | 요청 실패 | 연결 실패(소리 줄) | 예외 | 콘솔 오류 | 요청 기록 없는 쪽 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| STUDENT | desktop | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| STUDENT | mobile | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| STUDENT | small | 828 | 828 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | desktop | 1,715 | 1,715 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | mobile | 1,716 | 1,715 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ADULT | small | 1,718 | 1,713 | 5 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | desktop | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | mobile | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PASS-OFF GRAMMAR | small | 9,892 | 9,892 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | desktop | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | mobile | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VOCA | small | 5,831 | 5,831 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | desktop | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR I | mobile | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| GRAMMAR I | small | 5,002 | 5,002 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| GRAMMAR II | desktop | 1,592 | 1,592 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR II | mobile | 1,592 | 1,592 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GRAMMAR II | small | 1,592 | 1,592 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | desktop | 541 | 541 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | mobile | 541 | 541 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| LISTENING (표본) | small | 541 | 541 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 0 |
| READING (표본) | desktop | 2,022 | 2,022 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| READING (표본) | mobile | 2,022 | 2,022 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| READING (표본) | small | 2,022 | 2,022 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **합계** | | **82,273** | **82,267** | **6** | **5** | **0** | **0** | **4** | **3** | **0** | **0** | **0** |

합계: 글 기대 82,273 · 있음 82,267 · **없음 6**(ADULT 5칸 — 3-1 의 같은 원인) · 4xx **0** · 5xx **0** · 요청 실패 4(GRAMMAR I gh1-073 휴대폰 1 · gh1-068 작은 휴대폰 1 · LISTENING d091 작은 휴대폰 2 — 모두 12:09Z `ERR_*` 접속 끊김 · 4xx/5xx 아님) · 예외 0 · 콘솔 오류 0.
(이용권 사본 스윕이라 잠긴 유료 소리 403 같은 의도된 4xx 는 안 생김 — 첫 스윕과 같음.)

## 2. 첫 스윕과 나란히 (같은 칸이 고친 도구 · 고친 앱으로 어떻게 됐나)

세 줄로 비교함 — ① 첫 스윕(옛 도구 · 옛 앱 · 10/4~5, 판정 = 단계1 count.md) ② **같은 옛 기록을 고친 도구로 다시 셈**(도구 효과만 · fix-tools.md 와 같은 값을 다시 확인) ③ rc2(고친 도구 · 고친 앱).

| 처음의 문제 | ① 첫 스윕(옛 도구) | ② 옛 기록 + 고친 도구 | ③ rc2 (고친 도구 · 고친 앱) | 읽는 법 |
|---|---|---|---|---|
| GRAMMAR FAIL 46강 (I 34 · II 12) | FAIL 46 | FAIL 46 | **PASS 46/46**(다시 돌린 강의 46 모두) | 도구가 아니라 **다시 돌려서** 풀림 — 옛 기록은 도구를 고쳐도 FAIL 그대로(브라우저가 실제로 딴 곳을 누른 기록) |
| GRAMMAR BLOCKED 236강 (I 160 · II 76) | BLOCKED 236 | PASS 236 (T3) | **PASS 236/236** | 도구(T3)로 풀림, rc2 에서도 같음 · 덮은 결과 파일은 §0 |
| GRAMMAR II 화면 글 없음 33 (8강 × 3화면 · 11줄) | 33 | 0 (T4 — fix-tools.md 의 다시 대조 값 · 이 셈은 다시 안 함) | **0** (기대 1,592 · 있음 1,592 · 3화면 모두) | 도구(T4)로 풀림, rc2 에서도 0 |
| READING FAIL 9강 (WPM 1 차이) | FAIL 9 | PASS 9 (T5) | 표본에 든 3강(pr031 · pr051 · pr206) **PASS** · 표본 밖 6강(pr063 · pr063-1 · pr068 · pr127-1 · pr171-1 · pr180-1)은 **rc2 에서 안 돌림** | 6강은 도구 쪽 재판정(PASS)만 있고 새 기록은 없음 |
| LISTENING FAIL 1강(d172 · 인터넷 끊김) | FAIL 1(소리 3) | PASS · '연결 실패로 따로' 3줄(T6) | d172 는 표본 밖 — **rc2 에서 안 돌림** (대신 d091 작은 휴대폰에서 같은 꼴 연결 실패 2줄 · 따로 셈) | 같은 끊김이 rc2 에도 한 번 나옴(12:09Z) |
| VOCA 소리 RETEST 1,976(줄 첫 카드 → 정지, T7) | RETEST 1,976 | (기록으로 재판정 안 됨) | **RETEST 0** · 누름 15,641 모두 PASS | 도구(T7) 고침이 운영 새 기록으로 확인됨 |
| GRAMMAR '재생' RETEST (I 338 · II 188) | 338 · 188 | (안 됨) | I **1**(그 1 = 연결 실패) · II **0** | 도구(T1) 고침 확인 |

과정 × 화면 칸 단위로 본 첫 스윕 FAIL · BLOCKED(`단계1/cell-count.json`)과 rc2:

| 과정 · 화면 | 첫 스윕 FAIL / BLOCKED 칸 | rc2 FAIL / BLOCKED 칸 |
|---|---|---|
| GRAMMAR I desktop | 33 / 161 | 0 / 0 |
| GRAMMAR I mobile | 0 / 53 | 0 / 0 |
| GRAMMAR I small | 5 / 48 | 0 / 0 |
| GRAMMAR II desktop | 5 / 83 | 0 / 0 |
| GRAMMAR II mobile | 0 / 44 | 0 / 0 |
| GRAMMAR II small | 7 / 37 | 0 / 0 |
| LISTENING desktop | 1 / 0 (552칸) | 0 / 0 (표본 56칸) |
| READING desktop | 9 / 0 (512칸) | 0 / 0 (표본 52칸) |
| **새로 생긴 것** — ADULT mobile · small | 0 / 0 | **1 · 3 / 0** (아래 3-1) |

STUDENT · PASS-OFF GRAMMAR · VOCA 는 첫 스윕에도 rc2 에도 모든 칸 PASS(82 · 67 · 195 × 3화면).

## 3. 남은 FAIL · BLOCKED · 없음 · 4xx/5xx (한 줄씩 = `rc2-fails.json` — `lines` 17 · `refLines` 7 · `audioRetest` 28)

| 종류 | 줄 | 강의 | 과정 |
|---|---|---|---|
| FAIL | 8 | 3 (ADULT a7-2 small · a7-3 small · a8-3 mobile+small) | ADULT |
| BLOCKED(FAIL 칸 안의 '빈칸 채우기' 줄) | 4 | 3 (같은 3강) | ADULT |
| 화면 글 없음 | 5 | 4 (a6-5 small · a7-2 small · a7-3 small · a8-3 mobile+small) | ADULT |
| 4xx · 5xx | 0 | — | — |
| (참고) 요청 실패 4 · 연결 실패 소리 3 | 7 | gh1-073 · gh1-068 · d091 | GRAMMAR I · LISTENING |

### 3-1. ADULT 3강(a7-2 · a7-3 · a8-3) — 새로 생긴 FAIL, 원인 추정(강한 정황 · 운영 화면 쪽 문제로 단정 못 함)

- 줄 내용: 'adult words · Step 2 · 카드 수 — 카드 6 · 데이터 7'(a7-3 은 3 · 4) · a8-3 은 뜻 보기 · 낱말 소리 줄도 FAIL · 빈칸 채우기 BLOCKED('보기에 정답 … 없음'). 데스크톱 칸은 3강 모두 PASS.
- 정황: 스윕 때 이 작업 트리에서 **아직 커밋 안 된** `content/lessons/adult/a7-2.json · a7-3.json · a8-3.json` 이 각각 **낱말 1개를 더함**(unify · break out · be referred to as)으로 바뀌어 있고 파일 수정 시각(마지막 쓰기)이 2026-10-05 20:50:49 KST. FAIL 기록은 모두 그 시각대(a8-3 mobile 20:50:16 · a6-5 small 20:52:26 · a7-2 small 20:53:38 · a7-3 small 20:54:09 · a8-3 small 20:56:15)에 만들어졌고, 앞서 돈 데스크톱(15:17~17:06)은 바뀌기 전 내용으로 PASS. 점검 기대는 작업 트리의 내용 파일에서 나오는데 운영 화면은 낱말 6개 → **기대가 운영보다 앞선 것**으로 읽힘. 같은 시각 뒤 쪽 a6-5 small 의 화면 글 없음 2줄도 같은 까닭(a6-5.json 의 청크 줄 나눔이 바뀐 미커밋 변경 — 그 칸은 PASS).
- 이 원인 설명은 **파일 비교 · 시각으로만 확인**했고 운영 화면을 다시 보지 않았음. 확인법: 그 내용 파일이 배포돼 운영과 같아진 뒤 ADULT a7-2 · a7-3 · a8-3 (+ a6-5) 휴대폰 · 작은 휴대폰을 다시 돌려 PASS 가 되는지.
- 그 내용 파일들(그때 미커밋 12파일: ADULT 11 · STUDENT s6-2)은 이 셈을 하는 동안 `8cc38a87`(2026-10-05 22:10 KST, "회귀 점검 1002 두 번째 고침 — 사장님 판단 28건 답")로 커밋됨 — 내가 한 일이 아님 · 그 커밋이 배포됐는지는 확인 안 함. 그 변경이 rc2 가 도는 동안(20:47~20:50) 기대를 운영보다 앞서게 한 것으로 보임.

## 4. 소리 — 음성 버튼 누른 수 / 실패 수

명령: `node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc2-*.jsonl" --count` (exit 0 · 브라우저 0 · 강의×화면마다 가장 늦은 기록 2,367 · 깨기 0 · 다른 주소 0 · -pages 0 · 증명 기록 0).

| 과정 | 기록 | **누름** | PASS | **FAIL** | RETEST | (참고) 첫 스윕 누름 / FAIL / RETEST |
|---|---|---|---|---|---|---|
| STUDENT | 246 | 4,640 | 4,629 | 0 | 11 | 4,644 / 0 / 13 |
| ADULT | 165 | 4,250 | 4,247 | 0 | 3 | 4,254 / 0 / 4 |
| PASS-OFF GRAMMAR | 201 | 2,167 | 2,167 | 0 | 0 | 2,167 / 0 / 0 |
| VOCA | 585 | 15,641 | 15,641 | 0 | 0 | 15,644 / 0 / 1,976 |
| GRAMMAR I | 582 | 2,980 | 2,979 | 0 | 1 | 2,244 / 0 / 338 |
| GRAMMAR II | 264 | 1,624 | 1,624 | 0 | 0 | 1,260 / 0 / 188 |
| LISTENING (표본 168 · 첫 스윕 1,656) | 168 | 2,584 | 2,571 | 0 | 13 | 17,970 / 3 / 65 |
| READING (표본 156 · 첫 스윕 1,536 — 상태 칸 없는 드라이버라 재생 · 기대 클립 · 오류 · TTS 로 셈) | 156 | 1,756 | 1,756 | 0 | 0 | 17,650 / 0 / 0 |
| **합계** | 2,367 | **35,642** | 35,614 | **0** | **28** | 65,833 / 3 / 2,584 |

- 소리 FAIL **0**. RETEST 28줄은 전부 `rc2-fails.json` 의 `audioRetest` 에 한 줄씩. 다시 누를 대상(도구가 재생 버튼으로 보는 것)은 **3** — 위 '연결 실패'(GRAMMAR I gh1-068 small 1 · LISTENING d091 small 2). 나머지 25줄은 도구가 대상에서 뺌(대본 줄 · 낱말 타일 · 'play' 같은 낱말 조각이 '재생'으로 잡힌 21 + 문제의 답 보기 4 — 소리 안 나는 게 정상).
- 이 RETEST 25 가 어느 과정에 있나: STUDENT 11(타일 딕테이션 'play' · 'players' · 'playground' 등 낱말 조각) · ADULT 3(Step 4 'play') · LISTENING 11(Step 5 다시 듣기 · Step 1 블라인드 · Step 2 'play').
- **다시 누르기는 안 함**(지시 — 브라우저 안 씀). 첫 스윕의 다시 누르기에서 남은 것과 rc2 새 기록: VOCA 못 누른 1,240 · 구절 FAIL 12(hv-01 · hv-02 · hv-52) → rc2 VOCA 585기록 모두 PASS(RETEST 0 · hv-01 · hv-02 · hv-52 · hv-72 모두 PASS). LISTENING 다시 FAIL 4(d226 · d246 · d273 · d275 '블라인드 문장 듣기 소리 요청 없음') → d226 · d246 은 표본에 들어 rc2 에서 Step 1 블라인드 ① 줄이 RETEST(데스크톱 'no playing event' · 작은 휴대폰 'no audio request' — 위 25줄 안, 도구는 재생 버튼이 아닌 요소로 뺌) · d273 · d275 · d172 는 표본 밖이라 rc2 로 확인 안 됨.

## 5. 시각 확인

- 37파일 2,367기록 **모두 06:17:47Z(15:17:47 KST) 이후** — 06:16Z(=15:16 KST) 전 기록 **0**. 가장 이른 기록 2026-10-05 15:17:47 KST(ADULT desktop) · 가장 늦은 21:27:55 KST(LISTENING small). 파일 수정 시각도 15:50~21:28 KST.
- 운영 아닌 기록 **0**: 2,367줄 모두 `base = https://k-ig-core.vercel.app` · 깨기 기록 0 · 로컬(localhost) 기록 0 · 방문 오류 0.
- 드라이버 판: STUDENT · ADULT · VOCA · GRAMMAR I · II · LISTENING 모두 `7-1m-…-f1005`(고친 판) · READING `rd-0928-q1004-w1005`(고친 판) · PASS-OFF `passoff-1002a`.
- 과정별 기록 시각(KST · 가장 이른 ~ 늦은): 데스크톱 — ADULT 15:17~17:06 · STUDENT 15:18~16:44 · LISTENING 15:18~16:31 · VOCA 15:19~19:15 · GRAMMAR II 17:39~18:27 · GRAMMAR I 18:27~19:45 · READING 19:11~20:03 · PASS-OFF(세 화면 한 일꾼) 17:51~20:04 / 휴대폰 · 작은 휴대폰 — STUDENT 19:51~20:26 · GRAMMAR II 20:05~20:20 · VOCA 20:16~20:55 · ADULT 20:22~20:58 · GRAMMAR I 20:54~21:19 · LISTENING 20:57~21:27 · READING 19:12~20:05. ADULT 휴대폰 · 작은 휴대폰(20:22~20:58)이 내용 파일 수정 시각(20:50:49)과 겹침 — §3-1.
- 스윕 도는 동안 운영이 또 바뀌었는지(재배포)는 이번에 확인 안 함(`git fetch` 안 함 · 지시가 셈만). 기록의 의미가 달라졌는지는 별도 확인 필요.

## 6. 한계 · 주의

- rc2 의 LISTENING · READING 은 10강마다 1 표본 — 표본 밖 쪽(LISTENING 496 · READING 460)의 상태는 이번에 모름. 첫 스윕에서 FAIL 이던 READING 6강 · LISTENING d172 는 표본 밖이라 rc2 로는 확인 안 됨(도구 쪽 재판정 PASS 만 있음).
- 'GRAMMAR FAIL 46 → 0' 은 새로 돌려서 얻은 PASS 이고, 도구 · 앱 어느 쪽이 원인이었는지 가르는 증거는 이 셈만으로는 없음(옛 기록은 도구를 고쳐도 FAIL 그대로 · 새 기록은 도구와 앱이 같이 바뀐 뒤 것). fix-tools.md 는 T1 을 도구 탓으로 정리했고 이 셈은 그와 어긋나지 않음.
- 과정 × 화면 표는 복사본 도구(스크래치)로 셈 — 저장소 도구가 아님. 강의 합계가 저장소 도구 표와 같음은 확인했지만 칸 단위 숫자는 이 복사본만의 값.
- 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
