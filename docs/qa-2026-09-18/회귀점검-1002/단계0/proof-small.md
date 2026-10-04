# 회귀 점검 1002 · 단계 0 보충 · 작은 휴대폰(small) 깨기 증명 (2026-10-04 20:0x~21:0x)

같은 AI 계열이 만들고 점검했습니다. 독립 검수가 아닙니다.

## 한 줄
- proof.md 의 drive-generic 시험 17개를 **작은 휴대폰(small · 360×780) 화면으로만** 다시 깨기 증명했습니다.
- **16개 '실패 잡음 확인'** 입니다. 깨진 앱의 small 에서는 없앤 글자가 '없음'(또는 BLOCKED)으로 나왔고, 되돌린 앱의 small 에서는 모두 통과했습니다.
- **1개 '증명 안 됨'** 입니다. ADULT 5단계 '완료' 시험은 드라이버가 small 에서 아예 하지 않습니다(데스크톱에서만). 그래서 small 에서는 깨진 앱도 되돌린 앱도 '검사 없음' 입니다. 까닭은 아래에 적었습니다.

## 고친 파일 (커밋 안 함)
| 파일 | 바뀐 것 |
|---|---|
| docs/qa-2026-09-18/scripts/proof-run.cjs | `--viewports <목록>` 인자를 더해 drive-generic 에 그대로 넘깁니다. 값은 desktop · tablet · mobile · small 만 받고, 다른 값이면 멈춥니다. **인자를 주지 않으면 전과 같습니다**(넘기지 않음 → 드라이버 기본 desktop,tablet,mobile). |
| docs/qa-2026-09-18/회귀점검-1002/단계0/proof-small.md | 새 파일 · 이 기록 |

- 이 작업 폴더의 content/ · src/ 는 바꾸지 않았습니다(`git status -- src content` 빈 것 확인). 깨뜨림은 떼어 낸 트리에서만 했습니다.
- proof-summary.cjs 는 고치지 않았습니다(명령이 proof-run 만 허락). 그래서 small 판정은 **스크래치 사본** `proof-summary-small.cjs` 로 냈습니다. 사본은 원본과 세 줄만 다릅니다.
  - OUT 경로를 절대 경로로 바꿈
  - proof-tests.json 경로를 절대 경로로 바꿈
  - `vpsOf` 를 모든 시험에서 `["small"]` 로 바꿈
  - 판정 계산(isMissingLine 시작 일치 · checkState)은 원본 그대로입니다.

## 방법 (proof.md 와 같게)
- 떼어 낸 작업 트리: `%TEMP%\kig-wt-proof1002s`(`git worktree add --detach`, HEAD **7af1b65e**).
  - node_modules 는 `pnpm install --offline --frozen-lockfile` 로 설치했습니다(43초).
  - public/audio 는 본 저장소 `K-IG-CORE\public\audio`(54,784개)에 디렉터리 연결(junction)로 이었습니다. 사본에는 원래 public/audio 가 없었습니다(이 작업 폴더의 382개는 git 이 관리하지 않는 파일).
- 깨뜨림: 스크래치 `apply-breaks-s.cjs`. proof.md 묶음 A 와 **같은 15곳**에 표시 `PROOF-BREAK 1002s` 를 달았습니다. 줄마다 원래 글이 맞는지 확인한 뒤 바꿨습니다(7af1b65e 에서 15곳 모두 줄 번호 그대로).
  - PhonicsLearningView:872
  - GrammarLearningView:1708 · 2073
  - StudentLearningView:947(student · adult) · 980(student) · 1254 · 1525(adult 완료 단추를 빈 동작으로)
  - AdultWordsStep:180
  - ReadingLearningView:960 · 1119 · 1154 · 1515
  - LdLearningView:1736(1번과 마지막 문장)
  - studentDictation.ts:31 · listeningUtils.ts:334(가-힣 지움)
  - 묶음 P(PASS-OFF)는 이번 일 밖입니다. PASS-OFF 4시험은 이미 small 로 증명됐습니다(proof.md).
- 개발 서버: 사본에서 `next dev -p 3311`(Turbopack). 띄운 뒤 쓸 강의 8개 주소를 미리 한 번씩 불러 200 을 확인했습니다.
- 드라이버는 깨지 않은 이 작업 폴더에서 돌렸습니다. **BASE=http://localhost:3311 을 실행마다 출력해 확인했습니다**(운영 0). proof-run 도 BASE 가 localhost 가 아니면 멈춥니다.
  - 깨진 앱: `node proof-run.cjs --phase rcs-fixed --port 9940 --clone rc1002-proof-a --viewports small phonics:mv1-01 grammar1:gh1-007 grammar1:gh1-006 grammar2:gh2-007 grammar2:gh2-007-1 student:s1-1 reading:pr001 reading:pr001-1 ld:d001-1 adult:a1-1 adult:a1-2`
    - 20:18:13 ~ 20:38:04 · 11쪽 모두 exit 0
  - 되돌림: 개발 서버 끔 → 사본에서 `git checkout -- src` → `git diff -- src` 0줄 · `git status --short -- src` 0줄 · src 안 `PROOF-BREAK` 0개 확인 → 사본의 `.next` 를 지움(깨진 코드의 컴파일 캐시가 남지 않게) → 개발 서버 다시 띄움.
  - 되돌린 앱: 같은 명령을 `--phase rcs-after` 로 돌렸습니다.
    - 20:40:11 ~ 21:00:07 · 11쪽 모두 exit 0
  - 이용권 사본은 proof.md 와 같은 `rc1002-proof-a`(이미 있던 사본)를 다시 썼습니다. 원본 프로필은 복사도 하지 않았습니다.
  - 브라우저는 한 번에 하나였습니다. 띄우기 전 남은 메모리가 0.69GB 여서 1분씩 기다렸고, 1.15GB 가 된 20:18 에 띄웠습니다. 되돌린 뒤에는 1.49GB 였습니다.
- 판정: `node proof-summary.cjs --md --prefix rcs-`(저장소 판)와 스크래치 small 판을 모두 돌렸습니다.
  - 저장소 판은 기본 화면(desktop · tablet · mobile)만 읽습니다. 그래서 small 만 있는 rcs- 기록에서는 21줄 모두 '(진행 중)' 이 나왔습니다. 판정에는 쓸 수 없습니다.
  - 아래 표는 스크래치 small 판의 결과입니다(기록에서 계산, 손으로 쓰지 않음).

## 결과 — 시험 17개 · small 화면
| 시험 | 강의 | 깨진 앱 small | 되돌린 앱 small | 판정 |
|---|---|---|---|---|
| VOCA | phonics/mv1-01 | 29/30✗ — 없음 'word: about' | 30/30 | 실패 잡음 확인 |
| GRAMMAR I 영어 | grammar1/gh1-007 | 41/42✗ — 'item: It is warm.' | 42/42 | 실패 잡음 확인 |
| GRAMMAR I 한국어 | grammar1/gh1-006 | 41/42✗ — 'item: 따뜻해.' | 42/42 | 실패 잡음 확인 |
| GRAMMAR II 영어 | grammar2/gh2-007 | 15/16✗ — 'item: Young as I am, I know it.' | 16/16 | 실패 잡음 확인 |
| GRAMMAR II 한국어 | grammar2/gh2-007-1 | 15/16✗ — 'item: 나는 젊지만(어리지만) 그것을 안다. …' | 16/16 | 실패 잡음 확인 |
| STUDENT | student/s1-1 | 4/6✗ — 'en: First of all …' · 'ko: 무엇보다도 …' | 6/6 | 실패 잡음 확인 |
| READING 지문 | reading/pr001 | 30/33✗ — 'en: Their communication …' | 33/33 | 실패 잡음 확인 |
| LISTENING 대본(마지막) | ld/d001-1 | 4/6✗ — 'ko-script: 그것은 크지 않지만 …' | 6/6 | 실패 잡음 확인 |
| LISTENING 대본 · 1번 문장 | ld/d001-1 | 4/6✗ — 'ko-script: 나는 왓슨 부인입니다 …' | 6/6 | 실패 잡음 확인 |
| READING 핵심 어휘 · 낱말 | reading/pr001 | 30/33✗ — 'word: successful' 줄이 따로 있음(시작 일치) | 33/33 | 실패 잡음 확인 |
| READING 핵심 어휘 · 뜻 | reading/pr001 | 30/33✗ — 'meaning: 성공적인' | 33/33 | 실패 잡음 확인 |
| READING 한글 지문 | reading/pr001-1 | 21/24✗ — 'ko-sentence: 부모가 성별이 다른 …' | 24/24 | 실패 잡음 확인 |
| ADULT 1단계 문장 | adult/a1-1 | 16/19✗ — 'en: First of all …' | 19/19 | 실패 잡음 확인 |
| ADULT 2단계 단어 뜻 | adult/a1-1 | 16/19✗ — 'word-card: introduce \| 동사 \| 소개하다 …' | 19/19 | 실패 잡음 확인 |
| ADULT 3단계 덩어리 한국어 | adult/a1-1 | 16/19✗ — 'chunk: to introduce myself. \| 제 소개를 할.' | 19/19 | 실패 잡음 확인 |
| ADULT 4단계 받아쓰기 한글 조각 | adult/a1-2 | tile dictation 'Step 4 · "My name is 홍길동, …" · 한글 조각' **BLOCKED** '8/9 tiles placed'(홍길동 조각 없음) | **PASS** '11/11 tiles placed … ✓ 정답입니다.' · 거꾸로 → 오답 | 실패 잡음 확인 |
| ADULT 5단계 완료 | adult/a1-1 | completion 검사 **없음** | completion 검사 **없음** | **증명 안 됨** |

같은 강의를 함께 깨뜨린 시험은 각자 제 '없음' 줄로 따로 판정했습니다(READING 3개 · ADULT 1~3단계 · LISTENING 2개). proof-summary 의 시작 일치 규칙을 그대로 썼습니다.

### ADULT 4단계가 small 에서 잡힌 까닭
- drive-generic 은 '한글 조각' 문장을 따로 조립하는 일을 데스크톱(depth full)에서만 합니다(solveStudentTiles 580).
- 그런데 a1-2 는 **화면에 처음 열리는 1번 문장**이 'My name is 홍길동, …' 입니다. 그래서 small 에서도 그 문장의 조립 결과에 '· 한글 조각' 이 붙어, 같은 check 로 판정됐습니다.
- 다른 강의에서 처음 문장에 한글이 없으면, small 에서는 한글 조각 판정이 생기지 않습니다(데스크톱에서만 봄).

### ADULT 5단계 '증명 안 됨' 의 까닭
- 완료 시험(누름 → 새로고침 → 되돌림)은 `viewport === "desktop" && persist` 일 때만 돕니다(drive-generic.cjs 1164).
- 그래서 small 기록에는 completion 검사가 깨진 앱 · 되돌린 앱 모두에 없습니다. 판정 도구는 이를 '못 잡음' 으로 계산했습니다.
- 이것은 거짓 PASS 가 아닙니다. small 에서는 완료를 **보지 않는다** 는 뜻입니다.
  - 전 쪽 스윕의 small 기록에도 completion 검사가 없습니다. 완료의 판정은 데스크톱 기록에서만 나옵니다. 데스크톱 깨기는 proof.md 에서 증명됐습니다(FAIL → PASS).
  - small 에서 완료 단추가 눌리는지까지 보려면 드라이버를 고쳐야 합니다. drive-generic 은 이번 일의 범위 밖이라 고치지 않았습니다(아래 '남의 몫').

## 치움
- 개발 서버(3311)를 두 번 모두 껐습니다. `next dev -p 3311` 부모 프로세스와 자식만 골라 껐습니다.
  - 확인: 3311 열림 0 · 사본 경로의 node 0 · `rc1002-proof-a` 를 쓰는 Edge 0.
  - 운영 스윕 브라우저 2개(`rc-slot1` · `rc-slot2`)는 건드리지 않았고, 끝난 뒤에도 돌고 있었습니다.
- 소리 폴더 연결은 **먼저 `rmdir`(/s 없이)로 연결만 끊었습니다**. 끊은 뒤 본 저장소 수가 그대로인 것을 확인했습니다.
  - 그다음 사본 안을 확인했습니다. node_modules 밖에는 바깥을 가리키는 연결이 0개였습니다. node_modules 안의 연결 1,393개(깊이 4까지)는 모두 사본 안을 가리켰습니다.
  - 그 뒤 사본을 지웠습니다(`cmd /c rmdir /s /q`). 이어서 `git worktree prune` 를 했고, `git worktree list` 에 사본이 없음을 확인했습니다.
- 소리 파일 수:

| 폴더 | 지우기 전 | 연결 끊은 뒤 | 사본 지운 뒤 |
|---|---|---|---|
| 본 저장소 public/audio | 54,784 | 54,784 | **54,784** |
| 이 작업 폴더 public/audio | 382 | — | **382** |

- 남김:
  - 이용권 사본 `%TEMP%\kig-audit-0918-rc1002-proof-a` 는 지우지 않았습니다. 원래 있던 것입니다.
  - 기록 파일(gitignore 된 out/):
    - `out/features/{phonics,grammar1,grammar2,student,reading,ld,adult}-proof-rcs-{fixed,after}.jsonl`
    - `out/proof/rcs-fixed/` · `out/proof/rcs-after/`
  - 스크래치: `apply-breaks-s.cjs` · `proof-summary-small.cjs` · `rcs-summary-small.md` · `rcs-summary-repo.md` · `dev-s-*.log`

## 속도 (쪽 = 강의 × 화면 한 번)
- 깨진 앱: 11쪽 1,191초 = **108초/쪽**. 되돌린 앱: 11쪽 1,196초 = **109초/쪽**(로컬 dev · small 하나 · 강의마다 드라이버 · 브라우저를 새로 띄움).
- proof.md 의 휴대폰 8초/쪽보다 훨씬 깁니다. 강의마다 브라우저를 새로 띄우고 첫 컴파일을 하기 때문입니다. small 한 화면만 도는 실행이라 그 고정 비용이 쪽마다 붙습니다.
- 이 일 전체는 약 1시간이었습니다. 사본 · 설치 2분, 메모리 기다림 6분, 깨진 앱 20분, 되돌린 앱 20분, 기록 · 치움 포함입니다.

## 남의 몫에서 찾은 것 (고치지 않음)
- **drive-generic.cjs**:
  - ADULT 완료 시험이 데스크톱에서만 돕니다(1164). small · mobile 에서 완료 단추를 보는 판정은 없습니다.
  - grammar2 gh2-007 small 에서 깨진 앱 · 되돌린 앱 모두 problem 1건이 나옵니다. 'control navigated away: 전체 (44) → /grammar2' 입니다.
    - proof.md 의 gh1-006 데스크톱 '다음 Step →' 과 같은 종류입니다(단추가 다른 쪽으로 넘어감을 문제로 적음).
    - 깨기 판정과는 관계없습니다. 다만 전 쪽 스윕에서 gh2-007 small 을 FAIL 로 셀 수 있습니다. 단계 1 에서 앱 동작인지 도구 탓인지 가려야 합니다.
- **proof-summary.cjs**:
  - 화면을 고르는 인자가 없습니다. 기본 desktop · tablet · mobile, 또는 시험의 `viewports` 만 읽습니다.
  - 그래서 small 만 돌린 단계는 저장소 판으로 판정할 수 없습니다('진행 중').
  - `--viewports` 를 더할지는 주 세션이 정하면 됩니다. 이번 판정은 위 스크래치 사본으로 냈습니다.

## 부록 — 스크래치 proof-summary-small.cjs --md --prefix rcs- (그대로)

| 시험 | 쓴 강의 | 깨뜨린 지점 | 깨뜨리기 전 | 깨뜨린 뒤 (옛 검사) | 검사 수정 후 · 앱은 깨진 채 | 되돌린 뒤 | 옛 검사 | 새 검사 |
|---|---|---|---|---|---|---|---|---|
| VOCA | `phonics/mv1-01` | PhonicsLearningView.tsx:871-873 renderWord (Step 1 [data-step-panel="1"] 983 · rows.map 1021) — 마지막 줄의 마지막 낱말 카드 [data-word-text] | — | — | 작 29/30✗ | 작 30/30 | — | 실패 잡음 확인 |
| GRAMMAR I · 영어 기대값 (gh1-007 → gh1-006 으로 넘어감, 짝=gh1-006) | `grammar1/gh1-007` | GrammarLearningView.tsx:2072-2074 renderShadowing (Step 3 구문 각인 [data-step-panel="3"] 2311 · 2318) — 마지막 문항의 영어 줄 [data-en] (영어 문장이 버튼 없이 보이는 유일한 곳) | — | — | 작 41/42✗ | 작 42/42 | — | 실패 잡음 확인 |
| GRAMMAR I · 한국어 기대값 (gh1-006, 짝=gh1-007) | `grammar1/gh1-006` | GrammarLearningView.tsx:1707-1709 renderComposition (Step 1 영작 훈련 [data-step-panel="1"] 2263 · 2276) — 마지막 문항 카드의 한국어 [data-ko] | — | — | 작 41/42✗ | 작 42/42 | — | 실패 잡음 확인 |
| GRAMMAR II · 영어 기대값 (gh2-007, 짝=gh2-007-1) | `grammar2/gh2-007` | GrammarLearningView.tsx:2072-2074 renderShadowing (Step 3 구문 각인) — 마지막 문항의 영어 줄 [data-en] | — | — | 작 15/16✗ | 작 16/16 | — | 실패 잡음 확인 |
| GRAMMAR II · 한국어 기대값 (gh2-007-1, 짝=gh2-007) | `grammar2/gh2-007-1` | GrammarLearningView.tsx:1707-1709 renderComposition (Step 1) — 마지막 문항 카드의 한국어 [data-ko] | — | — | 작 15/16✗ | 작 16/16 | — | 실패 잡음 확인 |
| STUDENT | `student/s1-1` | StudentLearningView.tsx:946-948 (영어 [data-en]) · 979-981 (한국어 [data-ko]) renderListenItem 901 (Step 1 블라인드 리스닝 [data-step-panel="1"] 1618) — 마지막 문장 카드 | — | — | 작 4/6✗ | 작 6/6 | — | 실패 잡음 확인 |
| READING | `reading/pr001` | ReadingLearningView.tsx:959-961 (Step 1 처음 읽기 [data-step-panel="1"] 1032 — 재지 않는 지문 [data-sentence-id] [data-en]; 920-930 은 Step 4 재는 지문) — 마지막 문장 | — | — | 작 30/33✗ | 작 33/33 | — | 실패 잡음 확인 |
| LISTENING 대본 | `ld/d001-1` | LdLearningView.tsx:1735-1737 (Step 5 다시 듣기 · 대본 확인 [data-step-panel="5"] 1654 — [data-line] [data-ko]) — 마지막 문장의 한국어 줄 | — | — | 작 4/6✗ | 작 6/6 | — | 실패 잡음 확인 |
| LISTENING 대본 · 1번 문장 | `ld/d001-1` | LdLearningView.tsx:1735-1737 (Step 5) — 1번 문장의 한국어 줄 (STEP 2~4 가 기본으로 보여주는 문장) | — | — | 작 4/6✗ | 작 6/6 | — | 실패 잡음 확인 |
| READING 핵심 어휘 · 낱말 (2026-09-23 추가, 클립 생성 전) | `reading/pr001` | ReadingLearningView.tsx:1118-1120 (Step 2 핵심 어휘 [data-step-panel="2"] 1368 — li[data-vocab] [data-word-text]; 접힌 카드는 1102) — 마지막 카드의 낱말 | — | — | 작 30/33✗ | 작 33/33 | — | 실패 잡음 확인 |
| READING 핵심 어휘 · 뜻 (2026-09-23 추가, 클립 생성 전) | `reading/pr001` | ReadingLearningView.tsx:1153-1155 (Step 2 핵심 어휘 — [data-meaning], 뜻 모두 보기 뒤) — 마지막 카드의 뜻 | — | — | 작 30/33✗ | 작 33/33 | — | 실패 잡음 확인 |
| READING 한글 지문 (2026-09-23 추가, 클립 생성 전) | `reading/pr001-1` | ReadingLearningView.tsx:1514-1516 (Step 3 원문 대조 [data-step-panel="3"] 1573 · [data-rows] 1599 — [data-ko]; 2026-09-28 에 Step 4 → 3) — 한글 완역의 마지막 문장 | — | — | 작 21/24✗ | 작 24/24 | — | 실패 잡음 확인 |
| ADULT 1단계 · 문장 (회귀 점검 1002 추가) | `adult/a1-1` | StudentLearningView.tsx:946-948 renderListenItem (ADULT Step 1 블라인드 리스닝 [data-step-panel="1"] 1618 — [data-en]) — 마지막 문장 카드의 영어 (lib/containers student-cards) | — | — | 작 16/19✗ | 작 19/19 | — | 실패 잡음 확인 |
| ADULT 2단계 · 단어 뜻 (회귀 점검 1002 추가) | `adult/a1-1` | AdultWordsStep.tsx:179-181 renderCard ([data-step-panel="2"] li[data-vocab] [data-meaning], 뜻 보기 뒤) — 마지막 카드 'introduce' 의 뜻 (lib/containers adult-words: 'word \| pos \| meaning \| sentence' 한 줄) | — | — | 작 16/19✗ | 작 19/19 | — | 실패 잡음 확인 |
| ADULT 3단계 · 덩어리 한국어 (회귀 점검 1002 추가) | `adult/a1-1` | StudentLearningView.tsx:1253-1255 renderChunks 1222 (ADULT Step 3 끊어 읽기 [data-step-panel="3"] 1653 — li[data-chunk] [data-ko], 뜻 보기 뒤) — 마지막 문장의 마지막 덩어리 (lib/containers adult-chunks: 'en \| ko') | — | — | 작 16/19✗ | 작 19/19 | — | 실패 잡음 확인 |
| ADULT 4단계 · 받아쓰기 한글 조각 (회귀 점검 1002 추가 — 화면 글이 아니라 조립 결과로 판정) | `adult/a1-2` | src/lib/studentDictation.ts:31 TOKEN · src/lib/listeningUtils.ts:334 DICTATION_TOKEN (가-힣 — 2026-10-02 '신라 블록이 없는데'의 고침) — ADULT Step 4 탭 딕테이션의 한글 낱말 조각('홍길동' · '홍' · '서울' · '부산'). 드라이버는 데스크톱에서 한글 조각 문장을 따로 조립(drive-generic solveStudentTiles '· 한글 조각') | — | — | 작 BLOCKED✗ | 작 PASS | — | 실패 잡음 확인 |
| ADULT 5단계 · 완료 (회귀 점검 1002 추가 — 완료 시험 결과로 판정) | `adult/a1-1` | StudentLearningView.tsx:1525 renderCompletion 1478 (ADULT Step 5 섀도잉 & 낭독 [data-step-panel="5"] 1725 — '이 강의 학습 완료' aria-label 학습 완료 체크). 드라이버: 80% 연습(practiseStudent 4 · 5단계) → 누름 → 새로고침 → 되돌림, kig:adult:pending:v1 을 기다림 | — | — | 작 검사 없음 | 작 검사 없음 | — | **못 잡음** |

(PASS-OFF T1~T4 줄은 이번 실행에 없어 '(진행 중)' 으로 나왔습니다. 그 넷은 proof.md 에서 small 을 포함해 증명됐습니다.)

이 점검은 같은 AI 계열이 만들고 점검했습니다 — 독립 검수가 아닙니다.
