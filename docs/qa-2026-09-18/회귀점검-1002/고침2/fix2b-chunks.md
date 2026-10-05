# 회귀 점검 1002 두 번째 고침 b — J16 덩어리 규칙에 어긋난 3문장 (fix2b-chunks)

- 날짜: 2026-10-05 밤 · 가지 claude/regression-check-1002-8d4817 (HEAD 13b05515 위, 커밋 안 함)
- 근거: 사장님 2026-10-05 21:3x 결정 — `fix2-adult.md` 2장 · `통합.md` 의 J16 어긋남 3문장을 셋 다 고침. 규칙은 `docs/adult/README.md` '끊어 읽기'
  (① 목록을 가운데서 안 자름 ② 영어 덩어리 안 동사 · 명사의 뜻은 그 덩어리의 한국어에 ③ 이음말 끝은 앞 덩어리에 붙어도 됨 ④ 영어 덩어리를 이으면 문장 그대로).
- 고친 곳: `scripts/build-adult-content.mjs` 의 표만 → `node scripts/build-adult-content.mjs` 로 다시 만든 `content/lessons/adult/` 3파일
  (a1-4 · a10-2 · a8-1). 강의 파일은 손으로 안 고침. 빌드가 55파일을 LF 로 다시 쓰므로, 빌드 전 사본과 내용이 같은 52파일 · `content/courses/adult.json`
  은 사본 바이트로 되돌림(`git checkout` 은 안 씀 — 첫 고침의 8파일 바뀜이 작업 폴더에만 있어서).
- **영어 문장 · 한국어 줄(문장 전체 번역) 바뀜 0.** STUDENT 와 같이 쓰는 영어(a8-1 = s18-1 · a10-2 = s20-2) 그대로 · `content/lessons/student/` 안 건드림.
- 커밋 · 푸시 · 음성 생성 · 브라우저 안 함. `docs/adult/README.md` 는 고치지 않음(명령의 '이 파일들 밖' — 아래 5장 남김).
- **같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**

## 1. 고친 것 (전 → 뒤)

### ① a1-4 #1 (`1과.pptx` #16) — 한국어 덩어리만 · 표 `CHUNK_KO_FIX`

영어: My hobbies include reading books, listening to music, hiking, watching movies, and participating in sports. (그대로)
한국어 줄: 제 취미는 독서, 음악 감상, 등산, 영화 감상, 그리고 운동하기입니다. (그대로)

| 덩어리 | 영어 (그대로) | 전 | 뒤 |
|---|---|---|---|
| 1 | My hobbies include | 제 취미는 | **제 취미에는 이런 것들이 있습니다** |
| 2 | reading books, listening to music, hiking, | 독서, 음악 감상, 등산, | 그대로 |
| 3 | watching movies, and participating in sports. | 영화 감상, 그리고 운동하기입니다. | **영화 감상, 그리고 운동하기.** |

include 의 뜻('… 이 있다 · 들어 있다')이 덩어리 1 로 옴. 끝 덩어리의 '…입니다' 는 include 를 대신하던 말이라 뺌(목록만 남김 — J15 '이직과 이사, 여러 가족 대소사를.' 과 같은 꼴).

### ② a10-2 #2 (`10과.pptx` #4 · 영어는 STUDENT s20-2) — 한국어 덩어리만 · 표 `CHUNK_KO_FIX`

영어: Such places include 불국사, 속리산 National Park, and the Independence Hall of Korea. (그대로)
한국어 줄: 그런 곳으로는 불국사, 속리산 국립공원, 그리고 독립기념관이 있습니다. (그대로)

| 덩어리 | 영어 (그대로) | 전 | 뒤 |
|---|---|---|---|
| 1 | Such places include | 그런 곳으로는 | **그런 곳으로는 이런 곳들이 있습니다** |
| 2 | 불국사, 속리산 National Park, | 불국사, 속리산 국립공원, | 그대로 |
| 3 | and the Independence Hall of Korea. | 그리고 독립기념관이 있습니다. | **그리고 독립기념관.** |

fix2-adult 의 안은 '그런 곳에는 …' 이었으나 '그런 곳에는' 은 '그런 곳 안에는(장소)' 로 읽힐 수 있어, 한국어 줄과 같은 '그런 곳으로는' 을 살림.
이 문장은 PPT 의 영어('the Bulguk-Temple, Soungni-San …')가 STUDENT 영어로 바뀌어 PPT 의 끊는 자리를 옮겨 온 것(alignChunks)이고 EN_FIX · KO_FIX ·
CHUNK_FIX 에 없으므로 `CHUNK_KO_FIX` 가 받음(빌드가 덩어리 영어를 대조).

### ③ a8-1 #3 (`8과.pptx` #3 · 영어는 STUDENT s18-1) — 다시 끊기 · 표 `CHUNK_FIX` (CHUNK_BREAK_FIX 아님 — 아래)

영어: We celebrate 설날, Liberation Day, Children’s Day, Buddha’s Birthday, 추석, and many more. (그대로)
한국어 줄: 우리는 설날, 광복절, 어린이날, 부처님 오신 날, 추석 등 많은 날을 기념합니다. (그대로 — `KO_FIX` 8과 #3)

| | 전 | 뒤 |
|---|---|---|
| 덩어리 1 | We celebrate 설날, Liberation Day, Children’s Day, = 우리는 설날, 광복절, 어린이날, | **We celebrate = 우리는 기념합니다** |
| 덩어리 2 | Buddha’s Birthday, 추석, and many more. = 부처님 오신 날, 추석 등 많은 날을 기념합니다. | **설날, Liberation Day, Children’s Day, Buddha’s Birthday, 추석, and many more. = 설날, 광복절, 어린이날, 부처님 오신 날, 추석 등 많은 날을.** |

- celebrate 의 뜻이 덩어리 1 에(규칙 ②) · 목록 다섯과 'and many more' 를 한 덩어리로(규칙 ① — J15 와 같은 방법). 'and many more.' 만 따로 떼면 목록이 또 갈라져서 두 덩어리로 둠.
- 영어 덩어리를 이으면 문장과 글자까지 같음(빌드 검사 — 표에는 소리 꼴 Seollal · Chuseok 으로 쓰고 화면은 설날 · 추석).
- **표가 CHUNK_BREAK_FIX 가 아닌 까닭**: 이 문장은 PPT 영어('We celebrate Lunar New Year's, Independence Day, …')가 STUDENT 영어로 바뀌고 한국어 줄이
  `KO_FIX` 로 다시 쓰여 덩어리가 처음부터 `CHUNK_FIX` 에 직접 적혀 있었음. 빌드는 이런 문장에 `CHUNK_BREAK_FIX` · `CHUNK_KO_FIX` 를 쓰면 멈춤
  ("write it in CHUNK_FIX" — 아래 깨기 7 · 8 로 확인). 그래서 같은 `CHUNK_FIX` 줄을 고쳐 끊는 자리를 옮김(새 표 안 만듦 · 빌드 검사 그대로 받음).

## 2. 새 소리 글 (spoken-texts.cjs 정의 — `고침/adult-spoken-diff.cjs`, HEAD 대비)

이번 고침 몫(a8-1 만 — ① · ② 는 한국어 덩어리만이라 소리 바뀜 0, 도구로 확인):

| 강의 | 종류 | 새 글(클립 만들 것) |
|---|---|---|
| a8-1 | 덩어리 영어 | We celebrate |
| a8-1 | 덩어리 영어 | Seollal ⟨ˈsʌlˌlɑl⟩, Liberation Day, Children’s Day, Buddha’s Birthday, Chuseok ⟨ˈtʃuˌsʌk⟩, and many more. |

안 쓰게 된 것: a8-1 'We celebrate Seollal ⟨ˈsʌlˌlɑl⟩, Liberation Day, Children’s Day,' · 'Buddha’s Birthday, Chuseok ⟨ˈtʃuˌsʌk⟩, and many more.'

도구 전체 결과(첫 고침 fix2-adult 몫 6 · 3 과 합쳐): 새 소리 글 8 · 없어진 4+1=5, 바뀐 쪽 6(a1-6 · a6-5 · a7-2 · a7-3 · a8-1 · a8-3).
- 한국어 낱말(설날 · 추석)의 소리 꼴은 전 덩어리와 같은 규칙(로마자 + 발음 표시)으로 나옴 — 새 규칙 없음.
- 'We celebrate' 는 다른 과정에 이미 클립이 있을 수 있음 — 주 세션의 `node scripts/generate-azure-ava.mjs --dry-run` 이 셈.
- 무료 강의(a1-1 · a1-2) 안 바뀜 → `buildFreeSpeechKeys.mjs --check` exit 0.

## 3. 돌린 검사

| 검사 | 결과 | 깨기 |
|---|---|---|
| `node scripts/build-adult-content.mjs --check` | 고치기 전(표만 바꾼 뒤) exit 1 — a1-4 · a8-1 · a10-2 다름 → 빌드 뒤 exit 0 (55강의 · 12장 · 228문장) | 스크래치 사본 8가지 모두 멈춤(아래) |
| `node docs/adult/korean-words-on-screen.cjs` | PASS — 글 칸 85,878 | `--break` exit 1 |
| `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course adult` | PASS (228문장 · 거꾸로 앞부분 228 · 첫 타일 뒤 힌트 228) | — |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/check-adult-blank-choices.cjs` | PASS — 빈칸 321 · (1) 0 · (2) 0 · (3) 0 · 알려진 들어맞음 45/45 | (도구 깨기는 fix2-adult 때 확인 · 이번엔 빈칸 · 낱말 안 바뀜) |
| `node scripts/buildFreeSpeechKeys.mjs --check` | exit 0 (32 무료 강의 · 315 키) | — |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/adult-spoken-diff.cjs` | 2장대로 — a1-4 · a10-2 소리 바뀜 0 · a8-1 새 2 · 없어짐 2 | — |

깨기(빌드 스크립트 사본을 스크래치에서 고쳐 `--check`, 저장소 안 바뀜):
1. a8-1 덩어리 영어에서 쉼표 하나 뺌 → 멈춤 `CHUNK_FIX "…" is not "…"`
2. a8-1 덩어리 1 한국어를 바꿈 → `ADULT content differs: a8-1.json`
3. a1-4 덩어리 1 영어를 'includes' 로 → 멈춤 `CHUNK_KO_FIX chunk 0 is "My hobbies include", not …`
4. a1-4 덩어리 3 을 옛 한국어로 → 멈춤 `gives the Korean it already has`
5. a10-2 덩어리 자리 2 → 1 → 멈춤 `CHUNK_KO_FIX chunk 1 is …, not …`
6. a10-2 덩어리 3 한국어를 바꿈 → `ADULT content differs: a10-2.json`
7. a8-1 을 `CHUNK_BREAK_FIX` 에 씀 → 멈춤 `CHUNK_BREAK_FIX is for a sentence whose English and chunks are the PPT's — write it in CHUNK_FIX`
8. a8-1 을 `CHUNK_KO_FIX` 에 씀 → 멈춤 `a Korean fix for a sentence EN_FIX / KO_FIX / CHUNK_FIX already writes — fix it there`

다른 소비자: 덩어리 수는 a8-1 도 2 → 2 라 합계(713) 그대로 · src 의 덩어리 읽는 곳은 화면(`StudentLearningView`) · 소리(`speech.ts`)뿐이고 글이나 수를
박아 두지 않음 · 이 세 문장 글을 박아 둔 검사 도구 없음(grep — `docs/qa-2026-09-18/out/` 의 지난 스윕 결과물만 옛 글을 담고 있음, 다음 스윕이 새로 씀).
tsc · next build 안 돌림(TS 파일 안 바꿈).

## 4. 바뀐 파일

- `scripts/build-adult-content.mjs` — `CHUNK_KO_FIX` 에 "1과.pptx" 16 · "10과.pptx" 4 더함, `CHUNK_FIX` "8과.pptx" 3 다시 끊음(주석에 전 덩어리 남김)
- `content/lessons/adult/a1-4.json` · `a10-2.json` · `a8-1.json` (빌드가 씀 — 각 덩어리 2개씩만 바뀜)
- 이 기록

## 5. 주 세션에 남기는 것

- 음성: a8-1 덩어리 2글(2장) — `generate-azure-ava.mjs --dry-run` → 생성 → R2 먼저 → 푸시. 그 전까지 운영 소리 점검(audio-check)은 이 두 덩어리를 '클립 없음' 으로 셀 것.
- `docs/adult/README.md` '끊어 읽기' 94~97줄이 이 3문장을 '안 고침 — 판단 거리' 로 적고 있음 → '고침(fix2b-chunks.md)' 으로 바꿀 것. 또 82~84줄
  'CHUNK_KO_FIX … 13문장'(111줄 표) 이 이번 2문장을 더해 바뀜(1과 #23 J01 까지 세면 16문장) · '두 번째 고침' 표의 J16 줄 '(적기만)' 도 고칠 것.
- 운영 확인 거리: a1-4 · a10-2 끊어 읽기 '뜻 보기' 덩어리 1 · 3 · a8-1 덩어리 2개(글 · 소리 · '끊어 듣기').
