# 회귀 점검 1002 두 번째 고침 — fix2-adult (성인반)

- 날짜: 2026-10-05 저녁 · 가지 claude/regression-check-1002-8d4817 (HEAD 13b05515 위, 커밋 안 함 · 운영은 54345a4b)
- 근거: `작업기록.md` '20:3x 사장님 판단 28건 답' — 고침 9 중 성인반 몫(J01 · J12 · J15 · J16 · 새 빈칸 의심 3). '그대로' 목록 ·
  F27 · F28 · F29 · F67 은 안 건드림.
- 고친 곳: `scripts/build-adult-content.mjs`(표) → `node scripts/build-adult-content.mjs` 로 다시 만든 `content/lessons/adult/` 8파일
  (a1-6 · a5-2 · a5-4 · a6-3 · a6-5 · a7-2 · a7-3 · a8-3) · `docs/adult/README.md` · 빈칸 검사 도구 `고침/check-adult-blank-choices.cjs`
  의 KNOWN_FITS(5줄 더함). `content/courses/adult.json` 은 바뀌지 않음(제목 그대로). 강의 파일은 손으로 고치지 않았습니다.
  빌드가 55파일을 모두 LF 로 다시 쓰므로, 내용이 같은 18파일은 `git checkout` 으로 되돌림(내용 같음 · `--check` 가 CRLF 를 무시).
- 커밋 · 푸시 · R2 · 음성 생성 안 함(주 세션 몫). 도는 스윕 · `docs/qa-2026-09-18/scripts/drive-*.cjs` · `lib/*` 안 건드림. 브라우저 · 개발 서버 안 띄움.
- **같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**

## 1. 고친 것 (전 → 뒤)

### J01 — a1-6 #1 'I like to help other people, individually.' (영어 그대로)

| 칸 | 전 | 뒤 | 소리 |
|---|---|---|---|
| 낱말 individually 뜻 (품사 '부사' 그대로) | 개인적으로, 개별적으로 | 한 사람 한 사람 개별적으로 | 없음 |
| 한국어 줄 | 저는 개인적으로 다른 사람들을 돕는 것을 좋아합니다. | 저는 다른 사람들을 한 사람 한 사람 개별적으로 돕는 것을 좋아합니다. | **바뀜** |
| 덩어리 2 'individually.' 한국어 | 개인적으로. | 한 사람 한 사람 개별적으로. | 없음 |
| 덩어리 1 'I like to help other people,' 한국어 | 저는 다른 사람들을 돕는 것을 좋아합니다, | 그대로 (help 의 뜻이 그 덩어리에 — J16 규칙에 맞음) | — |

빈칸 보기 'I like to help other people, ___.' — pretty / especially / makes me happy: 셋 다 문장 끝 부사 자리에 안 들어감
(especially 는 뒤에 꾸밀 말이 있어야 함 · pretty 는 형용사 · 부사 앞에만). 그대로 둠.
표: `WORD_FIX` "1과.pptx" individually · `KO_LINE_FIX` "1과.pptx" 23 · `CHUNK_KO_FIX` "1과.pptx" 23.

### J12 — 단어 카드 3 더함 (문장 그대로 · `EXTRA_WORDS` 방식)

| 강의 · 문장 | 카드 word | 품사 | 뜻 | 밑줄(문장에 쓰인 꼴) | 낱말 소리(say) | 빈칸 보기 |
|---|---|---|---|---|---|---|
| a7-2 #2 '신라 conquered the other two kingdoms and unified most of the peninsula.' | unify | 동사 | 통일하다, 하나로 합치다 | unified | unify | hosted / accomplished / century (`CHOICE_FIX`) |
| a7-3 #5 'The Korean War broke out in 1950 when …' | break out | 구동사 | (전쟁 등이) 일어나다, 발발하다 | broke out | break out | especially / proud of / nation (규칙이 고른 그대로) |
| a8-3 #1 '… and it is often referred to as the Korean Thanksgiving.' | be referred to as | 표현 | ~라고 불리다 | referred to as | be referred to as | tombs / relatives / ancestors (규칙이 고른 그대로) |

- 뜻은 PPT 의 같은 자리 낱말(unite '통일하다, 하나가 되다' · also known as '~라고도 알려진')의 꼴을 따름. 세 카드 모두 다른 카드와 밑줄이 겹치지 않음.
- 보기 따짐: a7-2 규칙 보기(ruled / liberated / invaded)는 '… and **ruled** most of the peninsula' 가 그대로 들어맞음(invaded 도 문법 · 뜻이 됨)
  → CHOICE_FIX 로 hosted · accomplished · century(반도를 '개최' · '성취'하지 않음 · century 는 동사 자리에 안 됨 — F35 와 같은 보기).
  a7-3 '___ in 1950' 에 especially · proud of · nation 안 들어감. a8-3 'it is often ___ the Korean Thanksgiving' 에 tombs · relatives · ancestors 안 들어감.
- **딸린 바뀜 막음**: 새 꼴 'unified' 가 7과 보기 후보에 들어와 규칙이 a7-2 #1 divide('was ___ into three kingdoms')의 보기를
  ruled/liberated/invaded → unified/ruled/liberated, a7-4 #4 accomplish 를 founded/divided/ruled → founded/divided/unified 로 바꾸려 함
  → 두 빈칸은 감사 때 보기 그대로 `CHOICE_FIX` 로 묶음(그래서 a7-4 파일은 안 바뀜). 8과는 새 카드가 들어와도 다른 빈칸 보기가 안 바뀜(전 · 뒤 대조).
- `WORDS_GONE`(빠진 PPT 낱말 9)은 그대로 — 새 카드는 그 자리를 채우는 문장 자신의 낱말.

### J15 — a6-5 #2 목록을 한 덩어리로 (`6과(남성용).pptx` #20 · 새 표 `CHUNK_BREAK_FIX`)

| | 전 | 뒤 |
|---|---|---|
| 덩어리 1 | These visits have been taking place for nearly a decade, = 이런 만남은 거의 10년째 이어져 오고 있는데, | 그대로 |
| 덩어리 2 | and they have seen us through job changes, = 덕분에 우리는 이직과 | and they have seen us through = 덕분에 우리는 함께 겪어 왔습니다 |
| 덩어리 3 | house moves, and several family milestones. = 이사, 여러 가족 대소사를 함께 겪어 왔습니다. | job changes, house moves, and several family milestones. = 이직과 이사, 여러 가족 대소사를. |

영어 덩어리를 이으면 문장과 글자까지 같음(빌드 검사). 한국어 줄은 그대로. 낱말 milestone 밑줄은 덩어리 3 안.
`CHUNK_BREAK_FIX`: 영어가 PPT 그대로인 문장의 끊는 자리를 옮기는 표 — PPT 와 같은 끊음 · 문장과 다른 영어 · CHUNK_FIX/KO_FIX 문장 ·
CHUNK_KO_FIX 와 겹침 · 안 쓰인 줄이면 멈춤.

### 새 빈칸 의심 3 → `CHOICE_FIX`

| 강의 · 빈칸 (정답) | 전 | 뒤 | 따진 것 |
|---|---|---|---|
| a5-2 #2 'building the kind of ___ habits that keep a team moving in one direction' (collaborative) | close-knit / supportive / demanding | rushed / efficiently / tackle | supportive 가 들어맞음 · close-knit 도 그럴듯함 → rushed habits 는 쓰지 않는 말이고 뜻이 반대, efficiently(부사) · tackle(동사)은 자리에 안 됨 |
| a6-3 #5 'turned a routine chore into a ___ family activity' (collaborative) | close-knit / supportive / home-cooked | home-cooked / attentively / occasionally | supportive · close-knit(가족 활동) 들어맞음 → 활동은 '집에서 만든' 것이 아님 · 부사 둘은 a + 명사 앞에 안 됨 |
| a5-4 #1 "the day's most ___ tasks" (demanding) | dedicated / rushed / collaborative | close-knit / efficiently / fatigue | collaborative · rushed · dedicated 모두 most + 형용사로 들어감 → close-knit 은 일(task)에 안 씀 · efficiently(부사) · fatigue(명사) 안 됨 |

## 2. J16 — 덩어리 규칙 (`docs/adult/README.md` '끊어 읽기')

적은 규칙: ① 뜻 단위로 끊음(목록 · 한 동사의 목적어 묶음을 가운데서 안 자름) ② **영어 덩어리 안 동사 · 명사의 뜻은 그 덩어리의 한국어에**
③ 이음말 끝(-지만 · -는데 등)은 앞 덩어리에 붙어도 됨 ④ 영어 덩어리를 이으면 문장과 같아야 함(빌드) · 영어 덩어리는 소리가 있어 끊는 자리를 옮기면 새 클립.

**자동 검사는 못 넣음**: 규칙 ② 는 품사 · 뜻을 알아야 함. 어림으로 '낱말 카드 뜻(앞 두 글자)이 그 카드가 든 덩어리 한국어에 있나' 를 돌려 보니
321장 중 103장이 안 겹침 — 거의 다 같은 뜻을 다른 말로 옮긴 것(예: tackle '착수해 처리하다' ↔ '처리하려고')이라 거짓 경보가 너무 많음. 그래서 사람이 읽음.

**228문장을 읽은 결과 — 규칙에 어긋나는 것 3 (고치지 않음 · 주 세션 · 사장님 판단 거리, 한국어 덩어리만 고치면 됨 · 소리 없음)**:

| 강의 · 문장 | 덩어리 | 지금 한국어 | 어긋남 | 고친다면(안) |
|---|---|---|---|---|
| a1-4 #1 | My hobbies include | 제 취미는 | include 의 뜻이 끝 덩어리 '…운동하기입니다' 에 | '제 취미에는 이런 것들이 있습니다' 꼴, 또는 그대로(취미 소개의 흔한 옮김) |
| a10-2 #2 (STUDENT 와 같은 영어) | Such places include | 그런 곳으로는 | include 의 뜻이 끝 덩어리 '…있습니다' 에 | '그런 곳에는 이런 곳들이 있습니다' 꼴 |
| a8-1 #3 (STUDENT 와 같은 영어) | We celebrate 설날, Liberation Day, Children's Day, | 우리는 설날, 광복절, 어린이날, | celebrate 의 뜻 '기념합니다' 가 다음 덩어리에 · 목록도 가운데서 끊김(규칙 ①) | 'We celebrate / 설날, … and many more.' 로 다시 끊기(영어 덩어리 소리 새로) 또는 덩어리 1 = '우리는 기념합니다 — 설날, 광복절, 어린이날,' |

경계에 있지만 어긋남으로 세지 않은 것: a12-3 #4 'and those who cannot.' = '그렇지 못한 가정 사이의 격차입니다'(between 의 '사이' 가 뒤로 · 격차를 한 번 더 —
명사 뜻은 앞 덩어리에도 있음) · a3-4 #1 '…and singing.' = '…노래도 잘합니다'(영어에 없는 '잘합니다' — 앞 덩어리 gifted 를 받음) ·
a8-3 #1 새 카드 'referred to as' 의 밑줄이 덩어리 두 개에 걸침(덩어리 'and it is often referred to' | 'as the Korean Thanksgiving.' — PPT 의 끊음 · 화면은 덩어리와 밑줄을 따로 씀).

## 3. 바꾼 소리 글 (spoken-texts.cjs 정의 — `고침/adult-spoken-diff.cjs`) — 새로 6 · 안 쓰게 된 것 3

| 강의 | 종류 | 새 글 |
|---|---|---|
| a1-6 | 한국어 줄 | 저는 다른 사람들을 한 사람 한 사람 개별적으로 돕는 것을 좋아합니다. |
| a6-5 | 덩어리 영어 | and they have seen us through |
| a6-5 | 덩어리 영어 | job changes, house moves, and several family milestones. |
| a7-2 | 낱말 | unify |
| a7-3 | 낱말 | break out |
| a8-3 | 낱말 | be referred to as |

안 쓰게 된 것: a1-6 한국어 줄 '저는 개인적으로 다른 사람들을 돕는 것을 좋아합니다.' · a6-5 덩어리 'and they have seen us through job changes,' ·
'house moves, and several family milestones.'
- 영어 문장 · 낱말 'individually' 소리는 그대로. 빈칸 보기 · 뜻 · 품사 · 한국어 덩어리는 소리를 안 냄.
- 낱말 셋은 VOCA 등에 이미 클립이 있을 수 있음 — 주 세션의 `node scripts/generate-azure-ava.mjs --dry-run` 이 셈.
- 무료 강의(a1-1 · a1-2) 안 바뀜 → `buildFreeSpeechKeys.mjs --check` exit 0. STUDENT 와 같이 쓰는 영어(7~10과) 안 바뀜.
- 영어 속 한국어 낱말(신라 · 추석 · 송편 …) 표기 · 소리 규칙 그대로 — 새 카드 say 에 한국어 낱말 없음.

## 4. 돌린 검사

| 검사 | 결과 | 깨기 |
|---|---|---|
| `node scripts/build-adult-content.mjs --check` | exit 0 — 55강의 · 12장 | 스크래치 사본으로 10가지 모두 멈춤: CHUNK_BREAK_FIX 가 PPT 끊음과 같음 · 영어가 문장과 다름 · 안 쓰인 줄(#99) · CHUNK_KO_FIX 와 겹침 · divide 보기 묶음 빼면 a7-2 가 달라짐(--check exit 1) · EXTRA_WORDS 쓰임이 문장에 없음 · J01 KO_LINE_FIX 바꿀 말 없음 · J01 WORD_FIX 안 쓰임 · 새 CHOICE_FIX 보기가 정답 |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/check-adult-blank-choices.cjs` | PASS — 빈칸 321 · (1) 0 · (2) 0 · (3) 0 (알려진 들어맞음 45/45) | HEAD 사본 `--dir` → (3) 8 FAIL(a5-2 · a5-4 · a6-3 의 들어맞는 보기 7 + a7-2 unify 없음) · `--break=same` (1) FAIL · `--break=lemma` (2) FAIL |
| `node docs/adult/korean-words-on-screen.cjs` | PASS — 글 칸 85,878 | `--break` exit 1 |
| `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course adult` | PASS (228문장 · 거꾸로 앞부분 228 · 첫 타일 뒤 힌트 228) | — |
| `node scripts/buildFreeSpeechKeys.mjs --check` | exit 0 (32 무료 강의 · 315 키) | — |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/adult-spoken-diff.cjs` | 새 소리 글 6 · 없어진 3 (5쪽) | (도구 깨기는 첫 고침 때 확인) |
| 다른 소비자 | 검색 색인은 제목만(안 바뀜) · adult.json 안 바뀜 · 카드 수 · 덩어리 수를 박아 둔 코드 없음(321 · 713 grep) | — |

tsc · next build 안 돌림(TS 파일 안 바꿈).

## 5. 주 세션에 남기는 것

- 음성: 위 6글 — `generate-azure-ava.mjs --dry-run` → 생성 → R2 먼저 → 푸시(rc2 스윕 뒤).
- 운영 확인 거리: a1-6 한국어 줄 소리 · 단어 카드 뜻 · a6-5 끊어 읽기 덩어리 2 · 3 소리 · a7-2 · a7-3 · a8-3 새 카드(밑줄 · 뜻 · 소리 · 빈칸 보기) ·
  a5-2 · a5-4 · a6-3 빈칸 보기.
- 판단 거리: J16 규칙에 어긋나는 3문장(2장 표) — 한국어 덩어리만이면 소리 없음, a8-1 #3 을 다시 끊으면 덩어리 소리 새로.
