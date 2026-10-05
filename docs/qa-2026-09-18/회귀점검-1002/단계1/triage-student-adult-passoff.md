# 단계 1 triage — STUDENT · ADULT · PASS-OFF GRAMMAR (2026-10-05)

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 일꾼: triage-student-adult-passoff(opus).
읽은 것: `단계1/count.md` · `단계1/fails.json` · 스윕 기록 10파일(student-rc-{desktop,mobile,small}-1of1 · adult-rc-{desktop,mobile,small}-1of1 ·
passoff-grammar-rc1002-g1-s1~s3 + 셈 밖의 -s1-pages) · 화면 스냅숏 `out/rendered/{student,adult}/<id>.<화면>.json` · 강의 파일 `content/lessons/{student,adult}` ·
앱 코드 `src/components/StudentLearningView.tsx` · 도구 `scripts/drive-generic.cjs` · `scripts/recheck-audio.cjs` · `out/recheck-audio-rc1002-s1-skipped.json`.
**운영 다시 열기 0 · 브라우저 0 · 프로필 사본 0**(기록 · 코드 · 강의 파일로 판정이 갈려 다시 열 필요가 없었음). 내용 · 도구 파일 안 바꿈. 커밋 · 푸시 0.

## 한눈에

- 세 과정 621칸(STUDENT 246 · ADULT 165 · PASS-OFF 201 + 셈 밖 PASS-OFF 복습 · 오답노트 · 구성도 9)을 기록에서 직접 다시 셈(가장 늦은 기록 · 같은 칸 두 기록 0 · 모두 운영 base).
- **FAIL 0 · BLOCKED 0 · NOT TESTED 0 · 화면 글 없음 0 · 4xx 0 · 5xx 0 · 요청 실패 0 · 예외 0 · 콘솔 오류 0 · 대화창 0 · 주소 되돌림(redirect) 0 · 안 열림 0 · 레이아웃(가로 넘침 · 잘림 · 작은 단추 · 이름 없는 칸 · 깨진 그림) 0** — `fails.json` 에도 세 과정 줄 0(count.md 표와 같음).
- 판정이 PASS 가 아닌 줄은 둘뿐: **소리 RETEST 17줄**(STUDENT 13 · ADULT 4) → **모두 도구 탓**(받아쓰기 낱말 조각 'play' 를 재생 단추로 잘못 집음) · **NA 223줄** → **알려진 것**(설계상 다른 줄이 봄 · 표본 검사).
- 소리 최종 미해결 FAIL: STUDENT 0 · ADULT 0 · PASS-OFF 0(누름 4,644 · 4,254 · 2,167).
- 멈춤 조건(유료 주소가 이용권 없이 열림 · 유료 본문 유출 · 결제/이용권 상태 바뀜) 없음.

## 표

| 과정 | 강의 | 화면 | 무엇 | 판정 | 근거 | 고칠 안 | 소리 바뀜 | 심각도 |
|---|---|---|---|---|---|---|---|---|
| STUDENT · ADULT | **9강 · 10칸 · 17줄** — STUDENT s1-4 · s7-1 · s7-2 · s8-2 · s15-2(데스크톱 각 2줄) · s8-2(휴대폰 1 · 작은 휴대폰 1) · s18-3(작은 휴대폰 1) / ADULT a3-3 · a5-1(데스크톱 각 2줄) | desktop · mobile · small | 소리 RETEST — 단추 이름 'play' · 'players' · 'role-playing' · 'playing', 'no playing event' / 'no audio request within 10 s' | **도구 탓** | ① 단추는 탭 딕테이션(STUDENT Step 2 · ADULT Step 4)의 **낱말 조각**: 강의 문장 'I like to play computer games as well.'(s1-4) · '…soccer players very hard.'(s15-2) · 'I love role-playing…'(s7-2) · 'After I play a little…'(s8-2) · '…most people play games…'(s18-3) · '…to play sports…'(a3-3) · '…sometimes playing an early round of golf.'(a5-1) 등 — 스냅숏 · 강의 파일에 같은 문장. ② 앱: 조각 단추는 `selectTile`/`removeTile`(StudentLearningView.tsx 657-665 · 1101 · 1173)로 칸에 놓기만 함 — 소리를 내지 않는 것이 설계. ③ 도구: `drive-generic.cjs:98` `PLAY_RE = /🔊\|▶\|재생\|듣기\|…\|play\|…/i` 가 낱말 경계 없이 'play' 를 찾아 조각을 재생 단추로 셈. 'no playing event' 줄에 붙은 클립(k-ff14a7… 등)은 바로 앞 'N번 우리말 듣기'(PASS · playing 1) 클립이 같은 시간 창에 잡힌 것(play 0). ④ 같은 기록에서 그 문장의 진짜 재생 단추('▶ 듣기' · '우리말 듣기')는 모두 PASS · 같은 칸의 'tile dictation' 검사도 PASS. ⑤ `recheck-audio.cjs:111 · 125` 가 이미 '재생 버튼이 아닌 요소' 로 뺌(skipped 96 중 이 17) → 다시 누르기 대상 0. | 앱: 없음. 도구(적기만): drive-generic `PLAY_RE` 에서 'play' 를 aria-label 의 `\bplay\b` 로만 보거나, 받아쓰기 조각(보관함 · 답 칸 단추)을 재생 후보에서 빼기 | 없음 | — (도구) |
| STUDENT · ADULT | STUDENT 14강(s1-2 · s2-2 · s2-5 · s3-2 · s4-3 · s4-4 · s4-5 · s16-1 …) · ADULT a1-2 · a1-5 | 3화면 | NA 48줄 'graded input · tile dictation' | **알려진 것**(설계) | 기록 문구: 'tile-based answering — answered by tapping tiles, not typing'. coveredBy='tile dictation' 이 있고 같은 기록의 tile dictation 검사가 PASS → build-coverage 가 'NA 덮임' 으로 셈(STUDENT 14 · ADULT 2 /화면 — count.md 1-2 표). 채점은 단계 2(STUDENT 414문장 · ADULT 228문장 PASS)에서 따로 봄. ADULT a1-2 · a1-5 는 '내 정보' 문장. | 없음 | 없음 | — |
| STUDENT · ADULT · PASS-OFF | STUDENT 72강 · ADULT 48강 · PASS-OFF 55강 | desktop | NA 175줄 'bookmark/completion · persistence' — 'exercised on the sampled lessons of this course (see --persist-every)' | **알려진 것**(표본 검사 설계) | 표본 칸은 모두 PASS: STUDENT 10강 bookmark add→reload→remove · completion Step 3 toggle→reload→untoggle 10/10 · ADULT 7강 둘 다 7/7(Step 5 완료) · PASS-OFF bookmark 12/12. PASS-OFF 완료 '처음엔 꺼짐' · '다섯 단계 뒤 켜짐' 은 표본이 아니라 **201/201칸 모두 PASS**. count.md 1-2 'NA 표본' 열(72 · 48 · 55)과 같음. | 없음 | 없음 | — |
| STUDENT · ADULT · PASS-OFF | 전부(82 · 55 · 67) | 3화면 | FAIL · BLOCKED · NOT TESTED · 화면 글 없음 · 4xx/5xx · 요청 실패 · 예외 · 콘솔 오류 | **해당 없음(0)** | 기록 직접 셈: 글 기대 = 있음(STUDENT 828 · ADULT 1,715 · PASS-OFF 9,892 /화면) · events 의 badResponses · failed · exceptions · console · dialogs 모두 빈 칸 · redirect null · load navigated/rendered 모두 true · reloads 0. PASS-OFF verdict 201/201 'PASS'. driverRev: STUDENT · ADULT `7-1m-g15-s0927-v0927-l0927-a1002` · PASS-OFF `passoff-1002a`(단계 0 증명 판). | 없음 | 없음 | — |
| PASS-OFF | 복습 · 오답노트 · 구성도(`-s1-pages`) | 3화면 × 3쪽 | 셈 밖 기록 9칸 | **PASS(참고)** | checks 27/27 PASS · events 0 · verdict PASS. count.md 는 이 파일을 셈에서 뺌(강의 주소가 아님). 답하는 흐름은 단계 3 보충(s3b · s3c · s3d)에서 봄. | 없음 | 없음 | — |

## 이 스윕이 잡지 못한 앞 단계 틀림 (같은 세 과정 — 이번 스윕 PASS 와 겹치지 않음 · 결과.md 에 따로)

스윕은 한 기기 · 한 번 방문이라 아래는 원래 볼 수 없는 종류다. 새로 찾은 것 아님 — 이름만 이어 둠.

| 과정 | 이름(앞 단계 기록) | 왜 스윕 PASS 와 안 부딪치나 |
|---|---|---|
| STUDENT | 단계3 틀림1 — 완료 취소가 다른 기기에서 되살아남(ProgressProvider.tsx 235-244 · 327-361 · `단계3/s3-student-adult-passoff.md` 113) | 스윕의 완료 검사는 한 기기에서 켜고 → 새로고침 → 끄기(10/10 PASS). 둘째 기기에서만 생김. |
| PASS-OFF | 단계3 틀림2 — 도움 '낱말 카드' 에 없는 영어 낱말(whens · hows …, passoffLesson.ts 98-108 · 같은 파일 114) | **도구 빈틈**: drive-passoff 가 카드 낱말이 진짜 영어인지 보지 않음 → 스윕 PASS 라도 이 틀림은 남음. |
| PASS-OFF | s3b 틀림1 — 완료한 강의를 다른 기기 · 비운 저장소에서 열면 '완료 안 함' 처럼(LessonEndBar.tsx 55 · `단계3/s3b-passoff-review.md` 10 · s3c 58) | 스윕은 한 기기에서 '다섯 단계 뒤 켜짐' 만 봄(201/201). |
| PASS-OFF | s3d 틀림1 한글로 쓴 맞는 답에 '영어 자판으로…' 경고 · 틀림2 끝 화면 '내일 N' 과 목록 오늘 문항 어긋남(`단계3/s3d-passoff-review-answer.md` 46-) | 복습 화면은 스윕 강의 주소가 아님. |
| PASS-OFF | probes-browser 찾은 것 2 — pg06-1 첫 글자 힌트 'C______'(`단계1/probes-browser.md` 75 · 사장님 판단 후보) | 화면 글 규칙상 로마자 낱말 0 이라 스윕 글 검사에 안 걸림. |
| ADULT | check-unreached-data 새로 1 — ADULT `instruction` 블록 55강의를 어느 화면도 안 읽음(`단계1/probes-nobrowser.md` 45) | 화면 글 기대에 그 블록이 없음(읽지 않는 데이터). |
| ADULT · STUDENT | 단계5 글 읽기 틀림 74(심각 1 · 높음 16 …, `단계5-글읽기.md`) | 글 내용 문제 — 스윕은 '화면에 그 글이 있나' 만 봄. |

## 도구 결함 (적기만 — 고치지 않음)

- `docs/qa-2026-09-18/scripts/drive-generic.cjs:98` — `PLAY_RE` 의 `play` 가 낱말 경계 · 위치 없이 맞아, 받아쓰기 낱말 조각('play' · 'players' · 'role-playing' · 'playing')을 재생 단추로 눌러 RETEST 17줄을 만듦(강의 판정은 PASS 그대로 · recheck-audio 가 뺌). 같은 도구의 다른 과정(조각에 'play' 가 든 영어 문장)에도 같은 꼴이 나올 수 있음.
- drive-passoff — 도움 '낱말 카드' 의 낱말이 영어 낱말인지 보지 않음(단계3 틀림2 를 스윕이 못 잡은 까닭).
- (count.md 와 같은 것) `recheck-audio --from "*-rc-*.jsonl"` 이 `*-proof-rc-after/fixed.jsonl` 같은 증명 기록도 읽음 — 이번엔 로컬 base 78줄을 걸러 셈에는 안 섞였음(skipped.json 의 from 목록에 보임).

## 판정 셈

| 판정 | 줄 | 강의 |
|---|---|---|
| 앱 틀림 | 0 | 0 |
| 도구 탓 | 17(소리 RETEST) | 9 |
| 알려진 것 | 223(NA — 덮임 48 · 표본 175) | STUDENT 82 · ADULT 55 · PASS-OFF 55 중 걸친 강의 |
| 모름 | 0 | 0 |
