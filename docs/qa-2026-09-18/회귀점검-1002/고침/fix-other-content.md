# 회귀 점검 1002 고침 — fix-other-content (2026-10-05)

맡은 것: `단계5-글읽기.md` 4장의 성인반이 아닌 틀림 — F63 · F64(PASS-OFF pg06-1 해설) · F73(STUDENT s6-2) · F74(studentBlanks.ts 머리 주석) · F65~F72 가운데 성인반이 아닌 것.
뺀 것(사장님 결정 · 판단): F67(STUDENT 와 같이 쓰는 문장 — '4개다 그대로 두자') · J17 · J18(판단 필요).

**같은 AI 계열이 고치고 점검함 — 독립 검수 아님.** 커밋 · 푸시 · 음성 생성 · R2 는 하지 않았습니다(주 세션 몫).

## 고친 것

| # | 무엇 | 파일 · 칸 | 전 | 뒤 | 소리 |
|---|---|---|---|---|---|
| F63 | PASS-OFF 해설이 화면과 안 맞음(화면엔 '속리산'인데 '대문자로 시작') | `content/lessons/passoff-grammar/pg06-1.json` `blocks[2].select[3].why` | Tom 과 Songnisan(속리산)은 하나뿐인 이름이라 고유명사(대문자로 시작), family 는 … | Tom 과 Songnisan(속리산)은 하나뿐인 이름이라 고유명사(영어로는 대문자로 시작), family 는 … | 없음 |
| F64 | 같은 흔적(화면엔 '추석은') | 같은 파일 `blocks[2].select[7].why` | Korea · Lunar New Year's Day · Buddha's Birthday · Chuseok은 하나뿐인 이름이라 고유명사(대문자로 시작), holidays 는 … | … Chuseok은 하나뿐인 이름이라 고유명사(영어로는 대문자로 시작), holidays 는 … | 없음 |
| F74 | 낡은 머리 주석(Hong Gil Dong · '(name)' · '(school name)' · '(two) brothers' 괄호 예시) | `src/lib/studentBlanks.ts` 1~20줄 주석만(코드 바뀜 0) | 되살리기 전 괄호 빈칸 설명 | 빈칸 두 가지: 남은 괄호 자리표시 2개(s6-2 #3 '(age)' · s9-1 #3 "(dog's name)" — 앱이 2단계 조각에 스스로 놓는 것은 이 둘뿐, check-student-dictation 이 둘을 기대) · 되살린 예시 낱말(EXTRA_BLANKS — 조각으로 조립, 3단계 '내 정보'). STUDENT 20문장 · 14강의 · 빈칸 26(자리표시 2 + 예시 낱말 24) · ADULT 는 EXTRA_BLANKS 만(a1-2 · a1-5, 7문장). 예시도 지금 낱말('한국' · 'two') | 없음(화면 밖) |

- 화면에서: PASS-OFF 해설은 `gloss()` → `koreanOnScreen` 으로 그려 'Songnisan(속리산)' · 'Chuseok은' 이 '속리산은' · '추석은' 으로 보입니다. 고친 뒤 화면 글: '속리산은 하나뿐인 이름이라 고유명사(영어로는 대문자로 시작)'.
- 주석의 숫자는 `blanksOf` 를 그대로 흉내 낸 셈으로 확인(STUDENT 20문장 · 14강의 · 26칸 · 그중 예시 낱말 24 · 못 찾은 EXTRA_BLANKS 0 / ADULT 7문장 · 2강의 · 11칸).

## 고치지 않은 것

| # | 까닭 |
|---|---|
| F73 (s6-2 '(age)' → '30') | **확정된 설계와 부딪쳐 고치지 않음.** STUDENT 에서 앱이 채우는 칸은 s6-2 '(age)' · s9-1 "(dog's name)" 둘이라는 것이 설계로 고정돼 있다 — `docs/qa-2026-09-18/scripts/check-student-dictation.cjs` 185~186줄(wantPlaced 2) · `scripts/restore-sample-words.mjs` 13줄 'Left as placeholders: s6-2 #3 "(age)" and s9-1 #3' · 결과.md 1-3 · 1-4(단계 3 확인). F73 대로 고치면 그 칸이 예시 낱말이 되어 앱이 채우는 칸이 1개가 되고, 그 검사가 깨진다. 또 고칠 곳 대부분이 이 몫 밖이다(check-student-dictation.cjs wantPlaced 2→1 · restore-sample-words.mjs RESTORE · `student-original-exceptions.json` s6-2 '짝' 항목). **사장님께 여쭐 것으로 올림**: restore-sample-words.mjs 가 남긴 까닭('the original had no sample word there either')은 사실과 다르다 — `docs/qa-2026-09-18/student-original-exceptions.json` s6-2 '짝' 항목에 원본 한국어 '그는/그녀는 약 30세 입니다.'가 적혀 있다(영어 원본은 '(age)'). 되살릴지(소리 2: 영어 'He/She is about 30 years old.' · 한국어 '그분은 약 30세이십니다.')는 J17(나이 '11')과 함께 사장님 판단 거리. |
| F65 · F66 · F68 · F69 · F70 · F71 · F72 | 모두 성인반(a5-3 · a10-3 · a12-3 · a2-5 · a8-3 · a9-2 · a12-1) — fix-adult-content 몫. F65~F72 가운데 성인반이 아닌 것은 F67 하나뿐이고 F67 은 사장님 '그대로'. |
| F67 · J17 · J18 | 사장님 결정('그대로') · 판단 필요 — 명령대로 뺌. |

## 바꾼 소리 글

**없음.** PASS-OFF 해설(why)은 소리 내지 않습니다 — `scripts/lib/spoken-texts.cjs` 141~148 의 PASS-OFF 소리는 anchors · drill(produce · transfer)의 speakAs/en 뿐. studentBlanks.ts 는 주석만 바뀜. STUDENT 강의 파일은 바꾸지 않았습니다.

## 돌린 검사

| 검사 | 결과 |
|---|---|
| `node docs/pass-off-grammar/검사/check-lessons.cjs` | exit 0 · problems 0 · warnings 0 |
| `node docs/pass-off-grammar/검사/check-grading.cjs` | PASS · exit 0 |
| `node docs/adult/korean-words-on-screen.cjs` | PASS · 글 칸 85,863 · exit 0 / 깨기 `--break=grammar` exit 1(검사가 살아 있음) |
| `node scripts/korean-words-hangul.mjs --check` | exit 0 (32쪽 · 제목 8) |
| `node docs/qa-2026-09-18/scripts/check-student-original.mjs` | exit 0 · 예외로 설명됨 289 · 설명 없음 0 · 낡은 예외 0 |
| `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course student` | PASS · exit 0(자리표시 2 그대로) |
| `npx tsc --noEmit` | exit 0 |
| 일회성 검사(스크래치 `scan-capital-hangul.cjs`): PASS-OFF 67강 모든 글 칸 46,329 을 `koreanOnScreen` 으로 화면 글로 바꾼 뒤, 한글로 바뀐 이름이 있고 '대문자'가 있는데 '영어로'가 없는 칸 | **깨기: HEAD(고치기 전) 3칸 exit 1** — pg06-1 select[3] · select[7](F63 · F64) + pg11-1 `produce[1].fix.why` / **고친 뒤 1칸** — pg11-1 `fix.why` 만. `fix` 는 화면에 안 나오는 칸(`src/lib/passoffView.ts` HIDDEN_ITEM_FIELDS)이라 틀림 아님 |

## 남의 몫에서 찾은 것

- `src/lib/studentBlanks.ts` 109줄(`Blank.text` 설명의 예시 `"Hong Gil Dong"`) · 187줄(micTargets 주석 `"Hong Gil Dong"`)에도 낡은 예시가 남아 있음 — 이 몫은 '머리 주석 F74 만'이라 안 고침. 화면 밖 · 동작 무관.
- F73 을 되살리기로 정하면 함께 고칠 곳: `scripts/restore-sample-words.mjs`(RESTORE s6-2 #3 · 13줄 머리말) · `docs/qa-2026-09-18/scripts/check-student-dictation.cjs` 185~186 · `docs/qa-2026-09-18/student-original-exceptions.json` s6-2 '짝' · studentBlanks.ts EXTRA_BLANKS · 머리 주석(이번에 쓴 '2 placeholders' 줄) · 새 소리 2.
