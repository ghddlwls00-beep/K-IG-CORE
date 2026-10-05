# T2 고침 — 점검 도구가 받아쓰기 낱말 'play' 를 소리 단추로 알던 것 (2026-10-06)

같은 AI 계열이 고치고 같은 AI 계열이 확인함. **독립 검수가 아님.** 앱 · 내용 파일은 안 바꿈 · 커밋 · 푸시 안 함.

## 한 줄

🟢 고침. 도구가 소리 단추를 고르는 규칙을 바꿈. 받아쓰기 낱말 조각 · 조립 칸 · 문제 보기 · 대본 줄은 이제 소리 단추 후보가 아님.
진짜 소리 단추는 그대로 누름. 운영 a3-3 데스크톱에서 RETEST 2 → 0, 누른 진짜 소리 단추 44 → 44(같은 단추 · 같은 클립 12), FAIL 0.
옛 규칙으로 되돌리면(`--break=play-regex`) 같은 강에서 RETEST 2 가 다시 나옴.

## 무엇이 틀렸나

`drive-generic.cjs` 는 단추 글에 `play` 라는 **글자**가 들어 있기만 하면 소리 단추로 알고 눌렀음(`PLAY_RE` 의 `play`).
그래서 소리를 내지 않는 단추를 소리 단추로 누르고 'no audio request' RETEST 를 남김. rc2 · pd2 기록에서 RETEST 40 가운데 27 이 이것이었음.

- 받아쓰기 낱말 조각 `play` · `players` · `playground`(ADULT · STUDENT · LISTENING 의 `[data-word-bank]`). 조각을 누르면 조립 칸(`[data-assembly]`)으로 옮겨지고, 거기서 또 한 번 눌림.
- LISTENING Step 5 대본 줄(`button[data-en]` — 누르면 우리말 뜻이 열림): '… put on plays' · '… card playing …'
- LISTENING Step 1 문제 보기(`button[data-option]`): '… 영어 **발음**과 …' · '… 알아**듣기** …'

## 바꾼 것

| 파일 | 바꾼 것 |
|---|---|
| `docs/qa-2026-09-18/scripts/lib/play-control.cjs` (새 파일) | 규칙을 한 곳에 둠. `PLAY_RE`: `play` 를 **낱말로**만 셈 — `\bplay(?:s\|ing\|ed\|ers?)?\b`(그래서 'playground' 는 안 셈). `NOT_PLAY_CTX`: `[data-word-bank]` · `[data-assembly]` 안의 단추와 `[data-option]` · `[data-en]` 단추는 글이 무엇이든 소리 단추가 아님. `CTX_OF`: 누른 단추가 어디 있는지 적는 짧은 설명. |
| `docs/qa-2026-09-18/scripts/drive-generic.cjs` | 105행 `DRIVER_REV` 를 `…-f1005-p1006` 으로 올림(101~104행 설명) · 112~114행에서 새 규칙을 씀(`--break=play-regex` 면 옛 규칙) · `NEXT_CONTROL`(163 · 175행) · `COUNT_CONTROLS`(192행) · `openPlayFolds`(257행)가 같은 규칙을 씀 · `pressAudio`(288~297 · 356행): `NEXT_CONTROL` 로 누른 소리 줄마다 `ctx`(단추가 있는 곳)를 남김. |
| `docs/qa-2026-09-18/scripts/prove-play-control-t2.cjs` (새 파일) | 오프라인 증명 도구. 브라우저에 보내는 바로 그 함수 글을 node 에서 실행하고, rc2 · pd2 기록의 단추 글과 앱 소스에서 읽은 속성으로 판정함. `--break` 를 주면 옛 규칙을 씀. |

## 증명

### ① 기록으로 판정 — 가짜 소리 단추 줄이 후보에서 빠짐

`node prove-play-control-t2.cjs --json ../out/play-control-t2.json` → **exit 0 · PASS**

- 대상: `out/features` 의 `*-rc2-*` · `*-pd2*` 44개 파일, 소리 줄 35,332.
- 받아쓰기 조각 · 대본 줄 · 문제 보기에서 나온 RETEST **27줄**(조각 18 · 대본 줄 5 · 보기 4) → 새 규칙에서는 **27줄 모두 후보가 아님**(남는 줄 0).
  예: a3-3 데스크톱 'Step 4 ▶ play' 2 · a8-3 작은 휴대폰 'Step 4 ▶ play'(rc2 · pd2) · s9-1 휴대폰 'Step 2 ▶ playground'(rc2 · pd2) · s15-3 'players' 3 · d106 LISTENING 휴대폰 · 작은 휴대폰 'play' 2.
- 속성을 붙인 방법: 조각은 '받아쓰기 단계에서 영어 낱말 하나로 된 단추'(앱 `StudentLearningView` · `LdLearningView` 의 `[data-word-bank]`), 대본 줄은 'LISTENING Step 5 의 영어 문장 단추'(`button[data-en]`), 보기는 'LISTENING Step 1 에서 ①~⑤로 시작하는 단추'(`LessonQuestions` 의 `[data-option]`). 이 대응은 앱 소스를 읽고 내가 정함.
  운영 실행에서는 도구가 같은 단추의 실제 위치를 `ctx` 로 적었고, 그 값이 `word-bank` · `assembly` 로 나와 이 대응이 맞음을 보여 줌(③).

### ② 진짜 소리 단추는 그대로 후보

- 옛 규칙이 고른 진짜 단추 줄 **34,932** 가운데 **34,930** 이 여전히 후보. 놓친 클립 **0**.
- 빠진 2줄은 STUDENT s9-1 데스크톱(rc2 · pd2)의 Step 3 문장 단추 'I run to and from the **playground** five times.'
  이 단추는 실제로 소리를 냄(앱에 title '눌러서 듣기'가 있음). 옛 규칙이 이 단추를 고른 것도 문장에 'playground' 글자가 우연히 있어서였음. 같은 클립(`18-571e2e…`)은 같은 방문의 다른 줄이 재생했으므로 빠진 소리는 없음.
- 문장 단추가 소리 후보가 되는지는 지금도 문장에 'play' 가 들어 있는지에 달려 있음(T2 전부터 그랬음). 모든 문장 단추를 title 로 고르게 바꾸면 휴대폰에서 단계마다 첫 소리 단추 하나만 누르는 순서가 달라짐. 그래서 이번에는 안 바꿈. 바꿀지는 주 세션이 정할 일.
- 함께 빠진 PASS 3줄은 가짜 단추(대본 줄 1 · 보기 2)였음. 그 단추는 소리를 내지 않고, 앞서 재생하던 소리가 이어져 PASS 로 찍힌 것.

### ③ 운영에서 한 강 — 이용권 사본 `rc1002-t2` · 포트 9970 · 브라우저 하나 · 빈 메모리 1.0~2.5GB 에서 시작

| 실행 | 소리 줄 | RETEST 'play' | 진짜 단추 PASS | 검사 | FAIL |
|---|---|---|---|---|---|
| a3-3 데스크톱 고친 규칙(`--suffix -t2d`) | 44 | **0** | **44** | PASS 262 | **0** |
| a3-3 데스크톱 옛 규칙(`--suffix -t2dbreak --break=play-regex`) | 46 | **2** (ctx `word-bank` 1 · `assembly` 1) | 44 | PASS 260 | 0 |
| (참고) rc2 a3-3 데스크톱 | 46 | 2 | 44 | — | — |

- 고친 규칙과 옛 규칙이 누른 진짜 소리 단추 44개는 **이름까지 똑같음**. rc2 와도 같음. 재생된 클립도 12 = 12.
- 고친 규칙의 검사가 2 많은 이유: 그 두 조각이 이제 '그 밖의 단추'로 한 번씩 눌리고 검사됨.
- 휴대폰도 돌림: a3-3 · a8-3 × 휴대폰 · 작은 휴대폰(`--suffix -t2`). 4방문 모두 소리 11 PASS · RETEST 0 · 검사 FAIL 0 · 문제 0.
  옛 규칙으로 같은 4방문(`-t2break`)을 돌렸을 때는 **RETEST 가 나오지 않음**. 휴대폰은 단계마다 첫 소리 단추 하나만 누름. 이번 Step 4 에서는 그 첫 단추가 '듣기'였고, 그 앞에 'play' 조각이 없었음(rc2 · pd2 의 a8-3 작은 휴대폰에는 있었음).
  그래서 깨기 증명은 데스크톱 a3-3 으로 함. 명령서가 말한 a3-3 휴대폰으로는 깨기를 보일 수 없음.
- 오프라인 깨기: `prove-play-control-t2.cjs --break` → exit 1 · FAIL. 가짜 단추 RETEST 27줄 가운데 25줄이 다시 후보가 됨.
  남은 2줄은 기록의 단추 글이 60자에서 잘려 'play' 가 글에 안 보이는 대본 줄임.

## 남는 것 · 넘길 것

- 기존 rc2 · pd2 기록의 RETEST 27(가짜 단추)는 기록이므로 그대로 둠. 다음 스윕부터 새 규칙(`p1006`)이 적용됨.
- 문장 단추를 'play' 글자가 아니라 title('눌러서 듣기')로 고를지 정해야 함. 위 ②에 적었음. 주 세션이 정할 일.
- 새 기록: `out/features/adult-t2.jsonl` · `adult-t2break.jsonl` · `adult-t2d.jsonl` · `adult-t2dbreak.jsonl` · `out/play-control-t2.json` · `out/play-control-t2-break.json`.

## 지킨 것

앱 · 내용 파일 0 · 커밋 · 푸시 0 · `git add` · `git stash` 0 · 이용권 값 · 토큰 · 쿠키 출력 0(실행 기록에서 찾아도 0) · 원본 프로필은 열지 않음(사본 rc1002-t2 만 씀) · 브라우저는 한 번에 하나만 씀 · 끝난 뒤 9970 포트와 사본 브라우저 0.
