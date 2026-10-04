# 회귀 점검 1002 · 단계 0 · proof 일꾼 (2026-10-04)

같은 AI 계열이 만들고 점검했습니다. 독립 검수가 아닙니다.

## 한 줄
- build-coverage 에 PASS-OFF GRAMMAR 를 넣었습니다(67쪽).
- 앱을 일부러 깨뜨린 사본으로 시험 21개를 돌렸습니다. 지난 12개, ADULT 5개, PASS-OFF 4개입니다. **21개 모두 '실패 잡음 확인'** 입니다. 깨진 앱에서는 정해진 화면 모두에서 없음 또는 FAIL 이 나왔고, 되돌린 앱에서는 모두 통과했습니다.
- 증명하다가 도구 결함 2개를 찾아 고쳤습니다(proof-summary).
- **사고 1건이 있습니다.** drive-passoff.cjs 를 `--help` 로 부르자 운영 전수 스윕이 시작됐습니다. 운영 4방문 뒤 멈췄습니다(아래 '사고').

## 고친 파일 (커밋 안 함)
| 파일 | 줄 | 바뀐 것 |
|---|---|---|
| docs/qa-2026-09-18/scripts/build-coverage.cjs | 13 | 머리 주석: ADULT · PASS-OFF GRAMMAR 더함 |
| 〃 | 41 | `--break=no-passoff` 허용 |
| 〃 | 49-57 · 62 · 68 | COURSE_TABLE 에 `{ slug: "passoff-grammar", label: "PASS-OFF GRAMMAR", baselineMain: 67 }` · no-passoff 깨기(그 줄 빼기) |
| 〃 | 311-320 | '학습 단위' 칸: PASS-OFF 는 lib/passoff-expect.cjs expectedPassoff(id,{licensed:true}).texts 로 셈(expectations.cjs 엔 PASS-OFF 갈래가 없어 0 이었음) — 67강의 합 9,892. 못 읽으면 '못 셈' 이라고 적음 |
| docs/qa-2026-09-18/scripts/prove-coverage-rules.cjs | 99-102 · 106-110 · 131-132 · 165-167 | 사례 U(PASS-OFF 기록 → 67쪽 줄 · pg01-1 PASS · content FAIL 인 pg01-2 → FAIL) 를 '아직 안 셈' 에서 '셈' 으로 바꿈 · V(pg01-1 기록 지운 판 → NOT TESTED) · W(no-passoff → 줄 없음 · 6건 안 셈) 더함 |
| docs/qa-2026-09-18/scripts/proof-summary.cjs | 39-53 (isMissingLine · `--loose-match`) · 92 (md 판정) · 135-138 (esc) · 165 (md 아닌 출력) | ① 깨뜨린 글자 찾기: '없음' 줄 어디에든 앞 40자가 들어 있으면 잡음으로 셌음 → 줄의 글(‘en: ’ 같은 종류 머리 뒤)이 그 글로 **시작**해야 잡음. ② md 표: 칸 글의 `\|` 를 이스케이프(ADULT 2 · 3단계 줄이 'word \| pos …' 때문에 칸이 밀려 판정 칸을 잘못 읽었음) |
| docs/qa-2026-09-18/scripts/proof-tests.json | 183-226 | PASS-OFF T1~T4 시험 4개 더함(passoff-proof-plan.json 그대로 · check 판정 또는 글 판정 · 화면 지정) |
| docs/qa-2026-09-18/회귀점검-1002/단계0/proof.md | 새 파일 | 이 기록 |

내용 파일(content/ · src/)은 이 작업 폴더에서 바꾸지 않았습니다(`git status -- src content` 빈 것 확인).

## 깨기 증명

### (1) build-coverage.cjs — PASS-OFF 줄
| 명령 | 깨뜨린 것 | 깨진 결과 | 되돌린 뒤 |
|---|---|---|---|
| `node build-coverage.cjs --features-dir <스크래치>/covpg/feat --files nopg06-passoff-grammar-rc1002-s0.jsonl,nopg06-passoff-grammar-rc1002-s0small.jsonl --screens desktop,mobile,small` | passoff-sweep 의 **운영 기록**(s0 12방문 + s0small 4방문) 사본에서 pg06-1 의 기록 4줄을 지움 | PASS-OFF 67 = PASS 3 + NOT TESTED 64 · pg06-1 **NOT TESTED** '셀 기록 없음' · exit 0(표 도구라 판정은 숫자로) | 원본 두 파일: 기록 16 · PASS 4(pg01-1 · pg01-2 · pg06-1 · pg20-2) + NOT TESTED 63 · 합계 일치 ✔ |
| 같은 원본 + `--break=no-passoff` | 과정 표에서 PASS-OFF 를 뺌(10-04 전 표) | 기록 0 셈 · PASS-OFF 줄 없음 · '이 표가 아직 세지 않는 과정: passoff-grammar — 그 과정의 기록 16건은 셈에서 뺌' · 과정 8 중 7 | 위 원본 결과 — 과정 8/8 |
| `node prove-coverage-rules.cjs` | 사례 깨기 5종(ignore-blocked · merge-all · old-dictation-rule · grammar-any-note · no-adult) + 새 no-passoff | 깨기마다 옛 동작 재현(A · B · D · O · T · W) | 사례 32개 '기대와 다름 0' · exit 0 |

### (2) 앱을 깨뜨린 사본 — 시험 21개
방법(최종 관문 0-a 와 같음):
- 이 작업 폴더 HEAD 7bfd5d7b 에서 따로 떼어 낸 작업 트리 `%TEMP%\kig-wt-proof1002` 를 만들었습니다(`git worktree add --detach`).
  - node_modules 는 처음에 이 작업 폴더 것을 이었습니다. 그러자 Turbopack 이 '루트 밖을 가리키는 심볼릭 링크' 라며 거절했습니다. 그래서 `pnpm install --offline --frozen-lockfile` 로 설치했습니다(52초).
  - public/audio 는 **본 저장소**(`K-IG-CORE\public\audio`, 54,784개)에 디렉터리 연결로 이었습니다. 명령은 이 작업 폴더 것을 이으라고 했지만, 이 작업 폴더의 public/audio 에는 382개뿐이었습니다. 그래서 지난번 관문처럼 저장소 것을 썼습니다. 소리는 판정에 쓰지 않습니다.
- 그 트리에서만 'PROOF-BREAK 1002' 표시를 달고 깨뜨렸습니다. 깨뜨린 곳은 스크래치 `apply-breaks.cjs` 에 있고, 줄마다 원래 글이 맞는지 확인한 뒤 바꿨습니다.
  - 묶음 A(drive-generic 시험 17개): 15곳을 깨뜨렸습니다.
    - PhonicsLearningView:872
    - GrammarLearningView:1708 · 2073
    - StudentLearningView:947(student · adult) · 980(student) · 1254(덩어리) · 1525(adult 완료 단추를 빈 동작으로)
    - AdultWordsStep:180
    - ReadingLearningView:960 · 1119 · 1154 · 1515
    - LdLearningView:1736(1번과 마지막 문장)
    - studentDictation.ts:31 · listeningUtils.ts:334(가-힣 지움)
  - 묶음 P(drive-passoff 시험 4개):
    - passoff/ui.tsx:78(T1)
    - koreanGloss.ts:101(T2)
    - passoffGrading.ts:1378(T3)
    - passoff/RuleStep.tsx:217(T4)
  - P 를 A 와 따로 돌린 까닭: T2 의 koreanGloss 는 STUDENT · ADULT · GRAMMAR II 도 함께 씁니다. 같은 때에 깨뜨리면 ADULT 한글 조각 시험의 FAIL 이 어느 깨뜨림 때문인지 가를 수 없습니다.
- 개발 서버는 `next dev -p 3311`, BASE 는 http://localhost:3311 입니다. 드라이버는 깨지 않은 이 작업 폴더에서 돌렸습니다(기대값이 고친 코드를 읽어야 하기 때문입니다).
  - 묶음 A: `proof-run.cjs --phase rc-fixed --port 9740 --clone rc1002-proof-a` 로 강의 11개를 돌렸습니다. 드라이버 기본값 그대로 desktop · tablet · mobile 입니다.
  - 묶음 P: `drive-passoff.cjs --ids pg01-1,pg01-2 --viewports desktop,mobile,small --licence no --no-audio --suffix -proof-rc-fixed --port 9741 --clone rc1002-proof-p --redo` 를 돌렸습니다. exit 1, FAIL 6/6 이었습니다.
  - 그다음 되돌렸습니다. 사본 트리에서 `git checkout -- src` 를 한 뒤 `git diff -- src` 가 비어 있고 PROOF-BREAK 가 0개인 것을 확인했습니다.
  - 개발 서버를 다시 띄우고 `rc-after` 를 돌렸습니다. drive-passoff 는 exit 0, PASS 6/6 이었습니다.
  - 마지막으로 `proof-summary.cjs --md --prefix rc-` 를 돌렸습니다.
- 브라우저는 한 번에 하나만 띄웠습니다.

결과(판정은 기록에서 계산, 손으로 쓰지 않음): **21개 모두 '실패 잡음 확인'**
| 시험 | 강의 | 깨진 앱 | 되돌린 앱 |
|---|---|---|---|
| VOCA | phonics/mv1-01 | 데 · 태 · 모 29/30✗ | 30/30 ×3 |
| GRAMMAR I 영어 · 한국어 | grammar1/gh1-007 · gh1-006 | 41/42✗ ×3 · 41/42✗ ×3 | 42/42 ×3 |
| GRAMMAR II 영어 · 한국어 | grammar2/gh2-007 · gh2-007-1 | 15/16✗ ×3 · 15/16✗ ×3 | 16/16 ×3 |
| STUDENT | student/s1-1 | 4/6✗ ×3 | 6/6 ×3 |
| READING 지문 · 어휘 낱말 · 뜻 | reading/pr001 | 30/33✗ ×3 (셋을 같이 깨뜨림) | 33/33 ×3 |
| READING 한글 지문 | reading/pr001-1 | 21/24✗ ×3 | 24/24 ×3 |
| LISTENING 대본 마지막 · 1번 문장 | ld/d001-1 | 4/6✗ ×3 | 6/6 ×3 |
| ADULT 1단계 문장 · 2단계 단어 뜻 · 3단계 덩어리 한국어 | adult/a1-1 | 16/19✗ ×3 (셋을 같이 깨뜨림 — 없음 줄 'en: First of all…' · 'word-card: introduce \| 동사 \| 소개하다 …' · 'chunk: to introduce myself. \| 제 소개를 할.') | 19/19 ×3 |
| ADULT 4단계 받아쓰기 한글 조각 | adult/a1-2 (데스크톱) | tile dictation '· 한글 조각' **BLOCKED** '8/9 tiles placed'(홍길동 조각 없음) — 휴대폰도 BLOCKED | PASS '11/11 tiles placed … ✓ 정답입니다.' |
| ADULT 5단계 완료 | adult/a1-1 (데스크톱) | completion Step 5 **FAIL** — 눌러도 '학습 완료 체크' 그대로(연습 뒤라 단추는 켜져 있었음) | PASS — '학습 완료 취소' → 새로고침 뒤 유지 → 되돌림 |
| PASS-OFF T1 한글로 쓴 답 | passoff-grammar/pg01-1 (휴대폰 · 작은 휴대폰) | grading '④ pg01-1:p13 (한글 꼴)' **FAIL** — 'I live in 서울.' → '한글이 섞여 있어요' | PASS |
| PASS-OFF T2 화면 한글만 | pg01-1 (데 · 모 · 작) | korean words **FAIL** 'Hong Gil Dong(홍길동)' · 'Seoul(서울)' + content 없음(anchor-en · compose-en) | PASS |
| PASS-OFF T3 보기 채점 | pg01-2 (데 · 모 · 작) | grading ③ s3 · s4 · s6 choice **FAIL** '한 번 더 해 보세요' (pg01-1 s4 · s6 도) | PASS ③ 6/6 |
| PASS-OFF T4 문법 설명 글 | pg01-2 (데 · 모 · 작) | 93/97✗ — '2:rule-kodiff' 없음 | 97/97 |

전체 표(옛 검사 칸 포함): 이 파일 맨 아래 '부록'.

### 증명하다 찾은 도구 결함 (고침 · 증명함)
1. **proof-summary: 깨뜨린 글자를 '없음' 줄 어디서든 찾음.**
   - 한꺼번에 깨뜨리는 묶음에서는 READING '핵심 어휘 · 낱말' 시험('successful')이 같은 강의 지문 줄('en: Their communication will be more **successful** …')만 없어져도 '잡음' 으로 나왔습니다. 9/24 관문 0-a 표도 같은 방법이었습니다.
   - 깨기 증명: rc-fixed 기록의 사본에서 'word: successful' 줄만 지웠습니다(스크래치 `doctor-rcx.cjs`). 옛 규칙(`--loose-match`)은 '실패 잡음 확인'(거짓)을 냈고, 고친 규칙은 '**못 잡음**' 을 냈습니다.
   - 진짜 rc 기록에서는 'word: successful' 줄이 세 화면 모두에 있어, 고친 규칙으로도 '실패 잡음 확인' 입니다.
   - ADULT 1단계도 같은 사본으로 봤습니다. 단어 카드 줄이 잘려 있어 옛 규칙도 거짓으로 잡지 않았습니다('못 잡음').
2. **proof-summary --md: 칸 글의 '|' 를 이스케이프하지 않음.** 그래서 ADULT 2 · 3단계 줄의 판정 칸이 밀렸습니다(고치기 전에는 '새 검사' 칸에 다른 칸 글이 들어감). 고친 뒤에는 줄마다 칸 10개가 맞습니다.

### 증명 못 한 것 · 한계
- **ADULT 완료의 서버 저장**(/api/progress/adult +1 · student +0)은 판정에 넣지 않았습니다. 로컬엔 이용권 세션이 없어(401/403) 드라이버가 '이 기기에만 저장' 으로 적습니다. 운영 기록에서만 볼 수 있습니다.
- **소리**: 깨기 판정에 넣지 않았습니다. drive-generic 은 로컬에서 클립을 눌렀지만 판정은 화면 글과 검사 결과로만 했습니다. drive-passoff 는 `--no-audio` 로 돌렸습니다. 소리 판정 코드(다른 클립 · 오류 · 브라우저 TTS → FAIL)는 이번에 깨뜨리지 않았습니다.
- **로컬 앱과 운영 앱의 차이**: 증명은 로컬 `next dev`(Turbopack) 입니다. 판정 도구의 '실패 잡음' 증명으로는 맞지만 운영 동작의 근거는 아닙니다.
- **drive-passoff 의 다른 판정**은 깨기가 없습니다: 4xx/5xx · 북마크 · 이전/다음 · 완료 '처음엔 꺼짐 / 다섯 단계 뒤 켜짐' · 단계를 옮길 때 소리 없음.
- **ADULT 시험 3개**(1단계 · 2단계 · 3단계)는 같은 강의, 같은 실행에서 함께 깨뜨렸습니다. 각 시험은 제 '없음' 줄(시작 일치)로 판정했습니다. 셋 다 세 화면에서 따로 확인했습니다.
- 작은 휴대폰(small)은 drive-passoff 시험에만 있습니다. drive-generic 시험 17개는 드라이버 기본 화면(desktop · tablet · mobile)입니다. 명령의 '드라이버 기본값 그대로' 를 따랐습니다.

## 사고 — 운영 4방문 (내 잘못)
- 07:17Z(16:17 KST) 쯤, 드라이버 사용법을 보려고 `node drive-passoff.cjs --help` 를 쳤습니다. drive-passoff 는 `--help` 를 모르고 **기본값으로 운영 전수 스윕을 시작**했습니다.
  - 주소: https://k-ig-core.vercel.app
  - 이용권 사본: `rc1002-passoff-sweep-main`
  - 포트: 9720(passoff-sweep 몫 — 내 범위 밖)
- 출력 다섯 줄 뒤 파이프가 닫히면서 프로세스가 끝났습니다. 확인해 보니 node 와 Edge 모두 남지 않았습니다.
- 한 일: pg01-1 의 데스크톱 · 휴대폰 · 작은 휴대폰과 pg01-2 의 데스크톱, 모두 4방문 PASS 입니다.
  - 학습자처럼 답을 넣었습니다. 감사용 이용권의 학습 기록(복습 일정)이 서버에 올라갔을 수 있습니다.
  - '이 강의 학습 완료' 는 누르지 않았습니다. 처음엔 꺼짐, 다섯 단계 뒤 켜짐만 보는 판정입니다.
  - 이용권 · 관리자 API 는 부르지 않았고, 코드 · PIN 도 치지 않았습니다. 이벤트 기록상 4xx/5xx 는 0 입니다.
- 남은 것:
  - 그 기록은 `out/features/passoff-grammar.jsonl.stray-proof1002-accident-0717Z` 로 이름을 바꿔 두었습니다. 나중 실행이 그 파일을 '이미 함' 으로 읽지 않게 하려는 것입니다.
  - 이용권 사본 폴더 `%TEMP%\kig-audit-0918-rc1002-passoff-sweep-main`(431MB)은 그대로 두었습니다. 원래 있던 것인지 이번에 생긴 것인지 가를 수 없었습니다.
- 앞으로: 드라이버에 모르는 인자를 넣지 말고 머리 주석을 읽을 것. drive-passoff 가 모르는 `--` 인자를 거절하게 고치는 일은 passoff 드라이버 몫입니다(아래 '남의 몫').

## 치움
- 개발 서버(3311)를 껐습니다(포트 열림 없음 확인). 내 Edge 도 0개입니다.
- 소리 폴더 연결은 **먼저 `rmdir` 로 연결만 끊었습니다**. 그 뒤 사본 안에 바깥을 가리키는 연결이 0개인지 확인하고 사본을 지웠습니다(`cmd /c rmdir /s /q`). 이어서 `git worktree prune` 를 했고, 사본이 목록에 없음을 확인했습니다.
- 소리 파일 수:

| 폴더 | 지우기 전 | 지운 뒤 |
|---|---|---|
| 본 저장소 public/audio | 54,784 | **54,784** |
| 이 작업 폴더 public/audio | 382 | **382** |

- 이 작업 폴더의 node_modules(맨 위 17개)는 그대로입니다. 사본의 node_modules 는 따로 설치한 것이었습니다.
- 남김: 이용권 사본 폴더 3개를 지우지 않았습니다. 원본은 건드리지 않았습니다. 정리는 주 세션이 판단하면 됩니다.
  - `%TEMP%\kig-audit-0918-rc1002-proof-a`(300MB)
  - `%TEMP%\kig-audit-0918-rc1002-proof-p`(435MB)
  - `%TEMP%\kig-audit-0918-rc1002-passoff-sweep-main`(431MB)
- 기록 파일(gitignore 된 out/):
  - `out/features/{adult,student,phonics,grammar1,grammar2,reading,ld}-proof-rc-{fixed,after}.jsonl`
  - `out/features/passoff-grammar-proof-rc-{fixed,after}.jsonl`
  - `out/proof/rc-fixed/` · `out/proof/rc-after/`

## 속도 (쪽 = 강의 × 화면 한 번)
- **지난번**: 9/24 관문 0-a 의 도구 증명은 작업기록 20~40줄에 쪽당 시간을 적어 두지 않았습니다. 참고로 운영 스윕은 STUDENT 데스크톱 240초 · 태블릿 18초 · 휴대폰 30초였습니다(gate0-sweep3b · adult-sweep 인용).
- **이번 drive-generic**(로컬 dev, 3화면):
  - rc-fixed 는 2,454초 / 33쪽 = **74초/쪽**, rc-after 는 2,557초 / 33쪽 = **77초/쪽** 이었습니다.
  - 기록 시각 차로 화면별로 나누면 태블릿 평균 111초, 휴대폰 8초이고, 데스크톱은 나머지(강의당 약 50~120초)입니다.
  - ADULT 한 강의는 3화면에 260~297초가 걸렸습니다.
- **이번 drive-passoff**(로컬, 이용권 없음 · 소리 끔):
  - 깨진 앱은 45.6초/쪽, 되돌린 앱은 27초/쪽이었습니다.
  - 데스크톱 41.2초, 휴대폰 33.7초, 작은 휴대폰 33.8초였습니다(두 단계 평균).
- 이 일 전체는 약 3시간 10분이었습니다(사본 · 설치 10분 · 묶음 A 41분 · 묶음 P 5분 · 되돌린 뒤 46분 · 기록 · 치움).

## 남의 몫에서 찾은 것 (고치지 않음)
- **drive-passoff.cjs**(passoff-sweep):
  - 모르는 인자(`--help`)를 거절하지 않습니다. BASE 가 없으면 기본값인 **운영 · 이용권 사본 · 전 67강의 × 3화면** 으로 바로 시작합니다. 위 사고가 이것 때문에 생겼습니다.
  - 모르는 `--` 인자는 exit 2 로 거절하게 하는 편이 안전합니다. 인자 없이 운영 전수를 시작하는 것도 `--all` 같은 명시 인자를 요구하게 하는 편이 좋습니다.
- **drive-generic.cjs**(adult-sweep 몫): grammar1 gh1-006 데스크톱에서 깨진 앱 · 되돌린 앱 모두 problem 1건이 나옵니다. 'control navigated away: 다음 Step → → /grammar1/gh1-008' 입니다. 마지막 단계의 '다음 Step →' 이 다음 강의로 넘어가는 것을 문제로 적은 것입니다. 이 쪽은 깨기 판정과 관계없지만, 전수 스윕에서 gh1-006 을 FAIL 로 셀 수 있습니다. 앱 동작인지 도구 탓인지 단계 1 에서 가려야 합니다.
- **proof-run.cjs**(공용):
  - 드라이버 기본 화면(desktop · tablet · mobile)을 씁니다. 명령서의 3화면(휴대폰 · 작은 휴대폰 · 데스크톱)과 다릅니다.
  - proof-summary 의 기본 화면도 desktop · tablet · mobile 입니다.
  - 단계 1 의 3화면을 정하면, proof-run 에 `--viewports` 넘김을 더할지 주 세션이 정해야 합니다.
- **drive-passoff 의 '학습 단위'**: build-coverage 의 '학습 단위 · 확인함' 칸은 features-summary.json 에서 읽습니다. PASS-OFF 기록이 그 요약에 들어가는지는 요약을 만드는 도구 쪽에서 확인해야 합니다.

## 부록 — proof-summary.cjs --md --prefix rc- (그대로)

| 시험 | 쓴 강의 | 깨뜨린 지점 | 깨뜨리기 전 | 깨뜨린 뒤 (옛 검사) | 검사 수정 후 · 앱은 깨진 채 | 되돌린 뒤 | 옛 검사 | 새 검사 |
|---|---|---|---|---|---|---|---|---|
| VOCA | `phonics/mv1-01` | PhonicsLearningView.tsx:871-873 renderWord (Step 1 [data-step-panel="1"] 983 · rows.map 1021) — 마지막 줄의 마지막 낱말 카드 [data-word-text] | — | — | 데 29/30✗ · 태 29/30✗ · 모 29/30✗ | 데 30/30 · 태 30/30 · 모 30/30 | — | 실패 잡음 확인 |
| GRAMMAR I · 영어 기대값 (gh1-007 → gh1-006 으로 넘어감, 짝=gh1-006) | `grammar1/gh1-007` | GrammarLearningView.tsx:2072-2074 renderShadowing (Step 3 구문 각인 [data-step-panel="3"] 2311 · 2318) — 마지막 문항의 영어 줄 [data-en] (영어 문장이 버튼 없이 보이는 유일한 곳) | — | — | 데 41/42✗ · 태 41/42✗ · 모 41/42✗ | 데 42/42 · 태 42/42 · 모 42/42 | — | 실패 잡음 확인 |
| GRAMMAR I · 한국어 기대값 (gh1-006, 짝=gh1-007) | `grammar1/gh1-006` | GrammarLearningView.tsx:1707-1709 renderComposition (Step 1 영작 훈련 [data-step-panel="1"] 2263 · 2276) — 마지막 문항 카드의 한국어 [data-ko] | — | — | 데 41/42✗ · 태 41/42✗ · 모 41/42✗ | 데 42/42 · 태 42/42 · 모 42/42 | — | 실패 잡음 확인 |
| GRAMMAR II · 영어 기대값 (gh2-007, 짝=gh2-007-1) | `grammar2/gh2-007` | GrammarLearningView.tsx:2072-2074 renderShadowing (Step 3 구문 각인) — 마지막 문항의 영어 줄 [data-en] | — | — | 데 15/16✗ · 태 15/16✗ · 모 15/16✗ | 데 16/16 · 태 16/16 · 모 16/16 | — | 실패 잡음 확인 |
| GRAMMAR II · 한국어 기대값 (gh2-007-1, 짝=gh2-007) | `grammar2/gh2-007-1` | GrammarLearningView.tsx:1707-1709 renderComposition (Step 1) — 마지막 문항 카드의 한국어 [data-ko] | — | — | 데 15/16✗ · 태 15/16✗ · 모 15/16✗ | 데 16/16 · 태 16/16 · 모 16/16 | — | 실패 잡음 확인 |
| STUDENT | `student/s1-1` | StudentLearningView.tsx:946-948 (영어 [data-en]) · 979-981 (한국어 [data-ko]) renderListenItem 901 (Step 1 블라인드 리스닝 [data-step-panel="1"] 1618) — 마지막 문장 카드 | — | — | 데 4/6✗ · 태 4/6✗ · 모 4/6✗ | 데 6/6 · 태 6/6 · 모 6/6 | — | 실패 잡음 확인 |
| READING | `reading/pr001` | ReadingLearningView.tsx:959-961 (Step 1 처음 읽기 [data-step-panel="1"] 1032 — 재지 않는 지문 [data-sentence-id] [data-en]; 920-930 은 Step 4 재는 지문) — 마지막 문장 | — | — | 데 30/33✗ · 태 30/33✗ · 모 30/33✗ | 데 33/33 · 태 33/33 · 모 33/33 | — | 실패 잡음 확인 |
| LISTENING 대본 | `ld/d001-1` | LdLearningView.tsx:1735-1737 (Step 5 다시 듣기 · 대본 확인 [data-step-panel="5"] 1654 — [data-line] [data-ko]) — 마지막 문장의 한국어 줄 | — | — | 데 4/6✗ · 태 4/6✗ · 모 4/6✗ | 데 6/6 · 태 6/6 · 모 6/6 | — | 실패 잡음 확인 |
| LISTENING 대본 · 1번 문장 | `ld/d001-1` | LdLearningView.tsx:1735-1737 (Step 5) — 1번 문장의 한국어 줄 (STEP 2~4 가 기본으로 보여주는 문장) | — | — | 데 4/6✗ · 태 4/6✗ · 모 4/6✗ | 데 6/6 · 태 6/6 · 모 6/6 | — | 실패 잡음 확인 |
| READING 핵심 어휘 · 낱말 (2026-09-23 추가, 클립 생성 전) | `reading/pr001` | ReadingLearningView.tsx:1118-1120 (Step 2 핵심 어휘 [data-step-panel="2"] 1368 — li[data-vocab] [data-word-text]; 접힌 카드는 1102) — 마지막 카드의 낱말 | — | — | 데 30/33✗ · 태 30/33✗ · 모 30/33✗ | 데 33/33 · 태 33/33 · 모 33/33 | — | 실패 잡음 확인 |
| READING 핵심 어휘 · 뜻 (2026-09-23 추가, 클립 생성 전) | `reading/pr001` | ReadingLearningView.tsx:1153-1155 (Step 2 핵심 어휘 — [data-meaning], 뜻 모두 보기 뒤) — 마지막 카드의 뜻 | — | — | 데 30/33✗ · 태 30/33✗ · 모 30/33✗ | 데 33/33 · 태 33/33 · 모 33/33 | — | 실패 잡음 확인 |
| READING 한글 지문 (2026-09-23 추가, 클립 생성 전) | `reading/pr001-1` | ReadingLearningView.tsx:1514-1516 (Step 3 원문 대조 [data-step-panel="3"] 1573 · [data-rows] 1599 — [data-ko]; 2026-09-28 에 Step 4 → 3) — 한글 완역의 마지막 문장 | — | — | 데 21/24✗ · 태 21/24✗ · 모 21/24✗ | 데 24/24 · 태 24/24 · 모 24/24 | — | 실패 잡음 확인 |
| ADULT 1단계 · 문장 (회귀 점검 1002 추가) | `adult/a1-1` | StudentLearningView.tsx:946-948 renderListenItem (ADULT Step 1 블라인드 리스닝 [data-step-panel="1"] 1618 — [data-en]) — 마지막 문장 카드의 영어 (lib/containers student-cards) | — | — | 데 16/19✗ · 태 16/19✗ · 모 16/19✗ | 데 19/19 · 태 19/19 · 모 19/19 | — | 실패 잡음 확인 |
| ADULT 2단계 · 단어 뜻 (회귀 점검 1002 추가) | `adult/a1-1` | AdultWordsStep.tsx:179-181 renderCard ([data-step-panel="2"] li[data-vocab] [data-meaning], 뜻 보기 뒤) — 마지막 카드 'introduce' 의 뜻 (lib/containers adult-words: 'word \| pos \| meaning \| sentence' 한 줄) | — | — | 데 16/19✗ · 태 16/19✗ · 모 16/19✗ | 데 19/19 · 태 19/19 · 모 19/19 | — | 실패 잡음 확인 |
| ADULT 3단계 · 덩어리 한국어 (회귀 점검 1002 추가) | `adult/a1-1` | StudentLearningView.tsx:1253-1255 renderChunks 1222 (ADULT Step 3 끊어 읽기 [data-step-panel="3"] 1653 — li[data-chunk] [data-ko], 뜻 보기 뒤) — 마지막 문장의 마지막 덩어리 (lib/containers adult-chunks: 'en \| ko') | — | — | 데 16/19✗ · 태 16/19✗ · 모 16/19✗ | 데 19/19 · 태 19/19 · 모 19/19 | — | 실패 잡음 확인 |
| ADULT 4단계 · 받아쓰기 한글 조각 (회귀 점검 1002 추가 — 화면 글이 아니라 조립 결과로 판정) | `adult/a1-2` | src/lib/studentDictation.ts:31 TOKEN · src/lib/listeningUtils.ts:334 DICTATION_TOKEN (가-힣 — 2026-10-02 '신라 블록이 없는데'의 고침) — ADULT Step 4 탭 딕테이션의 한글 낱말 조각('홍길동' · '홍' · '서울' · '부산'). 드라이버는 데스크톱에서 한글 조각 문장을 따로 조립(drive-generic solveStudentTiles '· 한글 조각') | — | — | 데 BLOCKED✗ | 데 PASS | — | 실패 잡음 확인 |
| ADULT 5단계 · 완료 (회귀 점검 1002 추가 — 완료 시험 결과로 판정) | `adult/a1-1` | StudentLearningView.tsx:1525 renderCompletion 1478 (ADULT Step 5 섀도잉 & 낭독 [data-step-panel="5"] 1725 — '이 강의 학습 완료' aria-label 학습 완료 체크). 드라이버: 80% 연습(practiseStudent 4 · 5단계) → 누름 → 새로고침 → 되돌림, kig:adult:pending:v1 을 기다림 | — | — | 데 FAIL✗ | 데 PASS | — | 실패 잡음 확인 |
| PASS-OFF T1 · 한글로 쓴 답이 정답 (회귀 점검 1002 추가 — drive-passoff.cjs, 휴대폰 화면만: 데스크톱은 레슨 철자로 씀) | `passoff-grammar/pg01-1` | src/components/passoff/ui.tsx:78 (romanForGrading 연결 — 화면대로 '서울' 을 쳐도 Seoul 로 되돌려 채점) — ④ 영작 pg01-1:p13 'I live in 서울.' | — | — | 모 FAIL✗ · 작 FAIL✗ | 모 PASS · 작 PASS | — | 실패 잡음 확인 |
| PASS-OFF T2 · 화면은 한글만('Seoul(서울)' 꼴 되살림) (회귀 점검 1002 추가) | `passoff-grammar/pg01-1` | src/lib/koreanGloss.ts:101 koreanOnScreen (passoff/ui.tsx:69 gloss — 1 예문 · 4 영작 문장) — pg01-1 'My name is 홍길동, and I live in 서울.' | — | — | 데 FAIL✗ · 모 FAIL✗ · 작 FAIL✗ | 데 PASS · 모 PASS · 작 PASS | — | 실패 잡음 확인 |
| PASS-OFF T3 · 형태 찾기 보기 채점 (회귀 점검 1002 추가) | `passoff-grammar/pg01-2` | src/lib/passoffGrading.ts:1378 gradeChoice (passoff/FormStep.tsx:248) — ③ 찾기의 보기 문항 pg01-2 s3 · s4 · s6 | — | — | 데 FAIL✗ · 모 FAIL✗ · 작 FAIL✗ | 데 PASS · 모 PASS · 작 PASS | — | 실패 잡음 확인 |
| PASS-OFF T4 · 문법 설명 카드 글 (회귀 점검 1002 추가) | `passoff-grammar/pg01-2` | src/components/passoff/RuleStep.tsx:217 ({gloss(rule.koDiff)} — ② 문법 설명의 한국어와 다른 점) — pg01-2 rule-kodiff | — | — | 데 93/97✗ · 모 93/97✗ · 작 93/97✗ | 데 97/97 · 모 97/97 · 작 97/97 | — | 실패 잡음 확인 |

이 점검은 같은 AI 계열이 만들고 점검했습니다 — 독립 검수가 아닙니다.
