# 회귀 점검 1002 · 고침 — fix-tools (점검 도구 쪽 틀림 T1 · T3 · T4 · T5 · T6 · T7 · T8 · T10 · T14 + T13 · T18)

2026-10-05 · 작업 트리 `nostalgic-blackburn-048c73`(가지 claude/regression-check-1002-8d4817 · HEAD 5cc17f4f) · 일꾼 fix-tools.
**같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**
커밋 · 푸시 · R2 · 음성 생성 0 · `git add -A` · `git stash` 0 · `.env.local` 값 출력 0 · CNN · GVA 0 · content/ · src/ 바뀜 0(이 일꾼).
운영에 댄 실행: 이용권 **사본** `rc1002-fix-tools` · 포트 9910 · 브라우저 하나씩 · 기록은 스크래치(`--out-root`) — 아래 '운영 짧은 실행'. 코드 · PIN 타이핑 0 · /api/license · /api/admin 0.
고친 파일(이 일꾼 몫만): `docs/qa-2026-09-18/scripts/` 의 drive-generic · drive-reading · recheck-audio · build-coverage · check-grammar-cloze ·
check-ld-questions-1004 · proof-summary · prove-coverage-rules, `scripts/lib/` 의 harness · expectations · containers · **wpm-window(새 파일)**, `scripts/buildFreeSpeechKeys.mjs`(--check 비교만).

## 고친 것

| # | 무엇 | 파일 | 전 → 뒤 | 소리 바뀜 |
|---|---|---|---|---|
| T1 | 접힌 칸(`<details>`) 안 단추를 보이는 것으로 셈 · 덮인 자리를 누름 → GRAMMAR FAIL 46강 · '재생' RETEST · VOCA 구절 클립 잘못 적음 | drive-generic(`VIS` · `openPlayFolds` · `closeOpenedFolds` · 누를 때 `refuseCovered`) · lib/harness(`click` 의 `refuseCovered` · label 위 단추) | 전: 닫힌 칸 안 단추도 '보임' → 그 자리 위의 '이전 강의'(데스크톱) · '메뉴 열기'(360px)를 누름. 뒤: 닫힌 칸 안 단추는 안 보임 · 소리 단추가 든 칸만 학습자처럼 `<summary>` 를 눌러 열고 누른 뒤 다시 닫음 · 다른 것이 덮은 단추는 누르지 않음(소리 RETEST · 그 밖 BLOCKED 'covered by …') · `--break=fold-visible` = 옛 동작 | 없음 |
| T3 | GRAMMAR 2단계(빈칸) · 4단계(종합 평가) 'NA' 에 대신 본 도구 이름 없음 → BLOCKED 236강 | drive-generic(NA 에 `coveredBy: check-grammar-cloze / check-grammar-exam`) · build-coverage ⑩(그 도구의 **결과 파일**에서 그 강의 PASS 를 확인 · 옛 기록은 note 로 알아봄) · check-grammar-cloze(결과 `out/grammar-cloze.json` 을 씀 · `--rev <커밋>`) | 전: 같은 기록 안 PASS 만 찾아 늘 BLOCKED. 뒤: 결과 파일에 그 강의 PASS → 덮임 · FAIL → 강의 FAIL · 없음 → BLOCKED(사유). `--old` 결과 · 깨기 결과는 안 씀 · `--break=no-external-cover` = 옛 동작 | 없음 |
| T4 | GRAMMAR II 기대 글이 로마자 → 화면 글 '없음' 33 | lib/expectations(GRAMMAR 문항 글을 앱의 `koreanOnScreen` 으로 · 문항에 그 쪽 언어 `lang`) · lib/containers(`lang` 이 있으면 그 언어 목록에서 찾음) | 전: 'He went to Busan …' 를 찾고, 한글이 든 글은 한국어 목록에서 찾음. 뒤: 'He went to 부산 …' 를 영어 목록에서. 글자 수로 언어를 정하지 않음(한국어 문항 18개에 영어 힌트가 있어 거꾸로 감 — 셈으로 확인) · `KIG_BREAK_GLOSS=1` = 옛 동작 | 없음 |
| T5 | READING WPM 을 반올림된 시간(1ms)으로 다시 셈 → FAIL 9강 | lib/wpm-window(새) · drive-reading(`DRIVER_REV rd-0928-q1004-w1005`) · build-coverage ⑫(옛 기록을 기록 안의 낱말 수 · ms 로 다시 판정) | 전: 기대 = wordsPerMinute(낱말, 반올림 ms) 정확히. 뒤: ms ±0.5 창 안에서 나올 수 있는 값이면 PASS(창 밖은 FAIL) · `--break wpm-exact`(drive-reading) · `--break=wpm-exact`(build-coverage) = 옛 동작 | 없음 |
| T6 | 점검 기계 인터넷이 끊긴 방문의 소리 줄을 FAIL 로 | drive-generic(`OFFLINE_ERR` — 그 방문에 ERR_INTERNET_DISCONNECTED 등이 있으면 클립 오류 · 브라우저 음성 줄을 RETEST '연결 실패') · build-coverage ⑪(옛 기록도 같은 규칙 · 표 아래 '연결 실패로 따로' 한 줄) | 전: LISTENING d172 FAIL. 뒤: 따로 셈(강의 판정에 안 셈 · recheck-audio 로 다시 누를 것). 다른 글의 클립은 그대로 FAIL · `--break=offline-as-fail` = 옛 동작 | 없음 |
| T7 | VOCA '이어 듣기' 직후 그 줄 첫 카드를 눌러 '정지'(설계) → RETEST 1,940 | drive-generic(`pressAudio` — 소리 뒤 켜진 줄 단추 `[data-action="play-row"][aria-pressed="true"]` 를 학습자처럼 눌러 멈춤) | 전: 줄이 도는 채 다음 카드 → 요청 없음. 뒤: 줄을 멈춘 뒤 다음 단추 · `--break=no-row-stop` = 옛 동작 | 없음 |
| T8 | recheck-audio: 307 기다림 · 카드 찾기 · 기대 클립 · 답 보기 · LISTENING 줄 · `--from` 증명 기록 | recheck-audio(① 스윕 기록의 finalPath 로 열고 같은 쪽 · 단계 · 단추는 한 대상 · 대상 파일 주소는 미리 따라가 `expectPath` ② VOCA 카드를 낱말(`[data-word-play]` · `[data-word-text]`)로 ③ 기대 클립 = 단추 이름의 글(그 강의가 말하는 글일 때) · 덮인 누름의 클립은 안 씀 ④ 답 보기 '①~⑤' 뺌 ⑤ LISTENING 은 '그래도 보기' · '다음 문장' 으로 그 줄까지 ⑥ 와일드카드가 `-proof-` 파일을 안 읽음 · `--rejudge <결과>`(브라우저 없이 다시 판정) · `--break-t8` = 옛 동작) | 아래 증명 표 | 없음 |
| T10 | check-ld-questions 결과 파일 이름에 화면이 없어 `--fresh` 가 다른 화면 기록을 지움 | check-ld-questions-1004(`<조각>-<화면>.jsonl` · `--dry-run`) | 전: `shard1of4.jsonl`(세 화면 같은 이름). 뒤: `shard1of4-mobile` · `-desktop` · `-small` | 없음 |
| T13 | drive-generic 이 `--course passoff-grammar` 를 받아 기대 0/0 거짓 통과 | drive-generic | 전: 돌고 PASS. 뒤: exit 2 'drive-passoff.cjs 로' · 모르는 과정도 exit 2 | 없음 |
| T14 | `buildFreeSpeechKeys --check` 가 줄바꿈(CRLF)만 달라도 '오래됨' | scripts/buildFreeSpeechKeys.mjs(--check 비교만) | 전: exit 1. 뒤: 줄 끝을 맞춘 뒤 비교 → exit 0 '— CRLF line ends only' · `--break=crlf-strict` = 옛 비교 · `--break=one-key` = 키 하나 바꾼 비교 | 없음 |
| T18 | proof-summary 에 화면 고르는 인자 없음(작은 휴대폰 판정은 스크래치 사본으로) | proof-summary(`--viewports a,b`) | 전: 기본 세 화면만. 뒤: `--viewports small` · 그 화면 기록에 검사가 없는 시험은 '증명 안 됨'(못 잡음 · 통과가 아님) | 없음 |

강의 제목 · 화면 문구: **바꾼 것 없음**(도구만). 바꾼 소리 글: **0**.

## 깨기 증명 (같은 계열 — 독립 아님)

### 브라우저 없이 — 10/4 스윕 기록 54파일을 새 판정으로 다시 셈 (build-coverage `--files` 54 · `--screens desktop,mobile,small` · 종합 평가 결과 `단계2/grading-browser-cmd1-grammar-exam.json` · 빈칸 결과 `check-grammar-cloze --rev 7bfd5d7b`)

| 셈 | GRAMMAR I P/F/B | GRAMMAR II P/F/B | LISTENING P/F/B | READING P/F/B | 합계 P/F/B/NT |
|---|---|---|---|---|---|
| 10/4 결과.md (옛 판정) | 0/34/160 | 0/12/76 | 551/1/0 | 503/9/0 | 1,453/56/236/0 |
| **새 판정** | **160/34/0** | **76/12/0** | **552/0/0** (연결 실패로 따로 3줄 — d172) | **512/0/0** | **1,699/46/0/0** |
| `--break=no-external-cover` | 0/34/160 | 0/12/76 | 552/0/0 | 512/0/0 | 1,463/46/236/0 |
| `--break=offline-as-fail` | 160/34/0 | 76/12/0 | 551/1/0 | 512/0/0 | 1,698/47/0/0 |
| `--break=wpm-exact` | 160/34/0 | 76/12/0 | 552/0/0 | 503/9/0 | 1,690/55/0/0 |

- STUDENT 82 · ADULT 55 · PASS-OFF 67 · VOCA 195 는 모두 PASS 그대로.
- 남는 **GRAMMAR FAIL 46강(I 34 · II 12 · 50칸)** 은 T1 — 기록만으로는 다시 판정할 수 없음(브라우저가 실제로 다른 곳을 누른 기록) → **다시 돌려야 함**(아래 명령). 표본 5칸은 운영에서 다시 돌려 모두 넘어감 0(아래).
- **GRAMMAR II 화면 글 없음 33 → 0**: 같은 54파일의 GRAMMAR 기록(강의 × 화면 846 — I 582 · II 264) 화면 줄을 새 기대로 다시 대조 — 옛 기대 33 · 새 기대 0(GRAMMAR I 0 · 0).
- 진짜 틀림을 심은 사본(실제 기록 복사본에 하나씩) — 모두 여전히 잡음:

| 심은 것 | 기대 | 결과 |
|---|---|---|
| READING pr180-1 의 WPM 을 427 로(창 밖) | FAIL | FAIL |
| 같은 pr180-1 그대로(대조) | PASS | PASS |
| LISTENING d172 연결 실패 줄을 '다른 글의 클립' 으로 | FAIL | FAIL |
| LISTENING d172 의 연결 실패 기록(events.failed)을 지움 | FAIL | FAIL |
| GRAMMAR gh1-006-1 — 종합 평가 결과 사본에서 그 강의를 FAIL 로 | FAIL | FAIL |
| GRAMMAR II gh2-033 small 화면 줄의 '부산' 을 'Busan' 으로(로마자가 다시 화면에) | 없음 1 | 없음 1 |

- `prove-coverage-rules.cjs`: 옛 40 사례 + 새 11(AA~AK — ⑩ 덮임 · note 로 알아봄 · 도구 FAIL → 강의 FAIL · 결과에 없음 → BLOCKED · 깨기 · `--old` 결과 안 씀 · 연결 실패 · 다른 글 클립 FAIL · 연결 실패 없는 클립 오류 FAIL · WPM 경계 PASS · 깨기 · 창 밖 FAIL) **51/51 기대대로 · exit 0**.

### recheck-audio (T8)

- `--rejudge recheck-audio-rc1002-s1.jsonl`(10/5 의 1,051줄, 브라우저 없이):

| | 그때 | 새 판정 | `--break-t8`(옛 규칙) |
|---|---|---|---|
| GRAMMAR I | PASS 131 · BLOCKED 97 | PASS 228 (97 = 넘어간 쪽 같은 단추 PASS — 한 대상) | PASS 131 · 다시 돌려야 함 97 |
| GRAMMAR II | PASS 100 | PASS 100 | PASS 100 |
| VOCA | PASS 349 · FAIL 12 · BLOCKED 355 | PASS 361 · **다시 돌려야 함 355**(카드 찾기 — 브라우저) | PASS 349 · FAIL 12 · 다시 돌려야 함 355 |
| LISTENING | FAIL 4 · BLOCKED 3 | 뺌 4(답 보기) · **다시 돌려야 함 3** | FAIL 4 · 다시 돌려야 함 3 |

- VOCA PASS 346줄은 새 기대(단추 이름의 글)와 앱이 실제로 낸 클립이 **346/346 같음** — 새 기대 규칙이 맞는 클립을 고른다는 대조. FAIL 12 는 새 기대로 PASS(그 구절 자신의 클립 — triage 가 손으로 맞춘 w-cda92e… 등과 같음).
- 심은 틀림: PASS 줄 하나(ancestor)의 실제 클립을 다른 낱말(advantage)의 것으로 바꾼 사본 → **FAIL 1**(잡음).
- 대상 셈(`--dry-run`): 2,291 → **2,190**(넘어간 주소 합침 97 · 답 보기 7 뺌 · 증명 기록 16파일 안 읽음). 같은 결과 파일로 이어 가면 남은 것 **1,598**(VOCA 1,595 · LISTENING 3).

### 운영 짧은 실행 (이용권 사본 rc1002-fix-tools · 포트 9910 · 기록은 스크래치)

| 무엇 | 고친 도구 | 깨기(옛 동작) | 10/4 스윕 |
|---|---|---|---|
| drive-generic GRAMMAR I gh1-008 데스크톱 | 넘어감 0 · 소리 11/11 PASS('재생' 은 칸을 열고 PASS) · content 42/42 · NA 3 | `--break=fold-visible`: **'control navigated away: ? → /grammar1/gh1-006'** · RETEST 2 | FAIL(넘어감) |
| gh1-042 데스크톱 | 넘어감 0 · 소리 11 PASS | — | FAIL(넘어감) |
| gh1-082 작은 휴대폰 | 넘어감 0 · 소리 4 PASS | — | FAIL(넘어감) |
| GRAMMAR II gh2-007 · gh2-033 작은 휴대폰 | 넘어감 0 · content 16/16 · **17/17**(gh2-033 — T4 가 화면에서도) | — | gh2-007 FAIL · gh2-033 16/17 |
| VOCA hv-01 데스크톱 | 소리 **82 PASS · RETEST 0** (구절 w-cda92e… · q-2350789c… · r-fc81308d… 자기 클립) | `--break=no-row-stop`: **RETEST 10**(첫 카드 '요청 없음') | PASS 64 · RETEST 18 |
| recheck-audio VOCA hv-02 1단계 카드 7 · LISTENING d172 3단계 3 | **PASS 10/10** | `--break-t8`: BLOCKED 8('control not found') · FAIL 2(스윕의 잘못된 클립을 기대) | — |

- 이 다섯 칸을 54파일에 더해 세면 GRAMMAR I 162/32/0 · II 77/11/0(gh1-008 · gh1-042 · gh2-007 · gh2-033 PASS — gh1-082 는 데스크톱 칸이 아직 옛 기록이라 FAIL 그대로, 맞는 동작).
- 그 밖: `buildFreeSpeechKeys --check` exit 0(CRLF 만 다름) · `--break=crlf-strict` exit 1 · `--break=one-key` exit 1. `check-grammar-cloze` exit 0(282강 · 문제 강의 0) · `--old` exit 1(문제 강의 96). `proof-summary --md --prefix rcs- --viewports small` = 실패 잡음 16 · 증명 안 됨 1(ADULT 완료 — small 에 시험 없음) · PASS-OFF 4 는 그 실행에 없음(진행 중) = 단계0/proof-small.md 와 같음 · 인자 없이 = 21줄 모두 (진행 중)(옛 동작) · `--prefix rc-` 세 화면 21/21 그대로. `check-ld-questions-1004 --dry-run` 세 화면 = 세 파일 이름. `drive-generic --course passoff-grammar` exit 2. `check-student-original.mjs` exit 0(설명 없음 0).
- **증명 안 된 것**: drive-generic 의 T6 변환(실제 인터넷 끊김을 일부러 만들지 않음 — 같은 규칙의 build-coverage 쪽만 증명) · T1 의 '덮인 단추 → BLOCKED/RETEST' 가 운영에서 생기는 경우(이번 표본 6칸에서 0번).

## 다시 돌려야 함 (기록 재판정이 안 되는 것 — 주 세션 몫, 운영 · 이용권 사본 · 브라우저 하나)

1. **GRAMMAR FAIL 칸 46**(T1) — 고친 drive-generic 으로:
   - `node docs/qa-2026-09-18/scripts/drive-generic.cjs --course grammar1 --viewports desktop --suffix -rc1002-fix-d --tabs 2 --clone rc1002-fix-… --port … --ids gh1-006,gh1-010,gh1-012,gh1-014,gh1-016,gh1-036,gh1-044,gh1-046,gh1-050,gh1-052,gh1-054,gh1-056,gh1-058,gh1-060,gh1-062,gh1-064,gh1-068,gh1-074,gh1-076,gh1-078,gh1-080,gh1-082,gh1-084,gh1-106,gh1-108,gh1-110,gh1-112,gh1-116,gh1-118,gh1-120,gh1-122`(+ 이번에 본 gh1-008 · gh1-042 를 넣으면 33)
   - `… --course grammar1 --viewports small --suffix -rc1002-fix-s --ids gh1-084,gh1-094,gh1-118,gh1-122`
   - `… --course grammar2 --viewports desktop --suffix -rc1002-fix-d --ids gh2-016,gh2-017,gh2-019,gh2-020,gh2-028`
   - `… --course grammar2 --viewports small --suffix -rc1002-fix-s --ids gh2-008,gh2-009,gh2-031,gh2-032,gh2-041,gh2-047`
   - 어림: 데스크톱 쪽당 약 150초 · 작은 휴대폰 약 60초 → 약 1시간 40분. 그 뒤 build-coverage 를 54파일 + 이 기록으로(`--exam-from docs/qa-2026-09-18/회귀점검-1002/단계2/grading-browser-cmd1-grammar-exam.json`).
   - 주의: `--tabs 2` 는 북마크 · 완료 저장 시험을 끔(감사 사본 진도 안 바꿈). 단, 배포 뒤 운영이 바뀌면 그것은 '이번 스윕 재판정' 이 아니라 새 점검.
2. **recheck-audio 나머지 1,598**(VOCA 1,595 · LISTENING 3): `node docs/qa-2026-09-18/scripts/recheck-audio.cjs --from "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl" --suffix -rc1002-s1 --clone … --port …`(같은 결과 파일로 이어 감 — 끝난 592 는 건너뜀). 어림 쪽당 약 4초 → 약 1시간 50분(2시간 한도면 `--limit 800` 두 번).
3. 배포 뒤: `check-grammar-cloze`(--rev 없이 — 새 GrammarLearningView 로) · `check-grammar-exam` 을 다시 돌려 새 결과 파일로 셀 것(이번 결과 파일은 7bfd5d7b · 10/4 운영 것).

## 안 고친 것과 까닭

- **T2**(drive-generic `PLAY_RE` 가 'play' · '발음 · 듣기 · 한 문장' 을 소리 단추로 잡음) — 이번 명령의 고칠 목록에 없음. recheck-audio 는 답 보기(①~⑤)를 빼도록 고침(T8 ④) · 대본 줄 · 낱말 조각은 원래 뺌. drive-generic 쪽 RETEST(LISTENING 65 · STUDENT/ADULT 17)는 그대로 생김.
- **T9**(build-coverage 가 과정 × 화면 · 화면 글 · 4xx/5xx 표를 안 냄) · **T11**(drive-passoff 가 낱말 카드 낱말이 진짜 영어인지 안 봄) — 목록에 없음.
- **T12**(성인반 완료 시험 · 한글 조각 조립을 데스크톱에서만) — 작지 않음(완료 시험은 서버 기록을 바꾸는 시험이라 화면마다 더하려면 감사 이용권 진도 규칙부터 정해야 함). 적기만.
- **T15**(`docs/qa-2026-09-18/unreached-data-known.json` 낡은 줄 4: ld 대본 줄 n · passoff anchors/produce/transfer note) — 이 일꾼 몫 파일이 아님(scripts/ 밖). 성인반 안내 칸은 판단 P6. 지금도 `check-unreached-data` exit 1(새로 찾음 1 = 성인반 안내 · 낡은 줄 4).
- **T16**(옛 6과정 목록 도구 13곳) — 13파일을 고치고 각각 깨기 증명이 필요해 '작은 것' 이 아님. 적기만.
- **T17**(감사 사본끼리 완료가 되살아남) — 원인은 앱(A2 — fix-app-core 가 고침). 도구 쪽(사본 저장소 되돌리기)은 손대지 않음.
- 판단 필요(J01~J18 · P1~P7) · 그대로 넷(F27 · F28 · F29 · F67) — 도구 일꾼이라 해당 없음.

## 남의 몫에서 찾은 것

- **작업 트리 뿌리에 빈 파일 `drive-reading.cjs`(0바이트, 추적 안 됨)** — 이 일꾼의 PowerShell 명령 실수로 생김. 지우기가 막혀(권한) 남아 있음 → **주 세션이 지워 주세요**(add 하지 말 것).
- `docs/qa-2026-09-18/unreached-data-known.json` 낡은 줄 4(위 T15).
- `check-grammar-cloze.cjs` 를 --rev 없이 돌리면 지금 작업 트리의 GrammarLearningView.tsx(fix-app-core 가 고치는 중)로 셈 — 결과 파일의 `dirty: true` 로 표시됨.
- `out/grammar-cloze.json`(새 · --rev 7bfd5d7b) · `out/grammar-cloze-old.json` · `out/recheck-audio-fix1005-proof*.jsonl` 을 이 일꾼이 만듦(out/ 은 git 밖). 다른 운영 기록 파일은 안 건드림.

## 쓴 스크래치 스크립트 (재현용 — 저장소 밖)

`recount.cjs`(54파일 새 판정 · 깨기 셋 · 심은 사본 5) · `rejudge-content.cjs`(GRAMMAR 화면 줄 다시 대조 · 심은 사본) · `sumrec.cjs` — 이 세션 스크래치 폴더.
