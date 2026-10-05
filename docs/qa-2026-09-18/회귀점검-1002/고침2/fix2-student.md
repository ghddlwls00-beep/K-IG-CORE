# 고침2 — fix2-student (2026-10-05)

맡은 것: 사장님 판단 28건 답(작업기록.md '20:3x' 줄)의 고침 9 중 **s6-2 '(age)' → '30' 되살림**(F73). 같은 AI 계열이 고치고 점검함 — 독립 검수 아님.
안 건드림: '그대로' 목록 전부 · F27 · F28 · F29 · F67 · 돌고 있는 rc2 스윕과 그 드라이버(drive-*.cjs · lib/*). 커밋 · 푸시 · R2 · 음성 생성 안 함.

## 고친 것

| 파일 | 바뀐 것 |
|---|---|
| `content/lessons/student/s6-2.json` | #3 영어 `He/She is about (age) years old.` → `He/She is about 30 years old.` · 한국어 줄 `그분은 약 (나이)세이십니다.` → `그분은 약 30세이십니다.` |
| `scripts/restore-sample-words.mjs` | RESTORE `student/s6-2` 에 3번 문장(en · ko 옛 글 → 새 글) 더함 · 머리말 13줄의 사실과 다른 까닭('the original had no sample word there either')을 바로잡음 — 남은 자리표시는 s9-1 #3 하나, s6-2 는 원본 한국어 줄이 '약 30세' 였음 |
| `src/lib/studentBlanks.ts` | EXTRA_BLANKS `s6-2` 에 `2: [{ text: "30", label: "선생님 나이" }]` · 머리 주석: 자리표시 1(s9-1) · 예시 낱말 25 = 26칸(20문장 · 14강 그대로) |
| `docs/qa-2026-09-18/scripts/check-student-dictation.cjs` | wantPlaced STUDENT 2 → 1 · `--break=placed` 더함(s6-2 #3 '30' 을 앱이 채우는 칸으로 셈 → 2칸 → FAIL) |
| `docs/qa-2026-09-18/student-original-exceptions.json` | s6-2 '짝'(`He/She is about (age) years old.`) 1줄 → '고침'(영어 #3, 원본 `(age)`) + '한국어'(#3, 원본 `그는/그녀는 약 30세 입니다.`) 2줄. 예외 289 → 290줄 |

## 한국어 줄 근거

원본 한국어는 `그는/그녀는 약 30세 입니다.`(예외 목록 s6-2 '짝' 항목의 why 에 적혀 있던 것 · check-student-original 이 swf 에서 읽은 원본과 같음).
'그는/그녀는' → '그분은 … 이십니다' 는 7단계 G14(소유자 결정 2026-09-23 — s6-2 #4~#6 이 이미 같은 꼴)라 그대로 두고, 나이만 원본 '30' 으로 되살림 → `그분은 약 30세이십니다.`
영어는 원본이 `(age)` 라 원본과 다름 — '고침' 예외로 적음(사장님 '30으로 되살림').

## 바뀐 소리 글 (클립 키가 바뀜 — 주 세션이 `node scripts/generate-azure-ava.mjs` 로 새로 만들어야 함)

1. STUDENT s6-2 #3 영어: `He/She is about 30 years old.` (옛 `He/She is about (age) years old.`)
2. STUDENT s6-2 #3 한국어 줄: `그분은 약 30세이십니다.` (옛 `그분은 약 (나이)세이십니다.`)

낱말 표현 · 덩어리 · 제목은 안 바뀜. 한국어 낱말 한글 표기(lessonSpeechForm · koreanGloss)는 이 문장에 해당 없음(한글 낱말 없음).

## 검사

| 명령 | 결과 |
|---|---|
| `node docs/qa-2026-09-18/scripts/check-student-original.mjs` | exit 0 · 설명됨 290 · 설명 없음 0 · 낡은 예외 0 (예외 290줄) — 고치기 직후(예외 고치기 전)는 설명 없음 2 · 낡은 예외 1 로 exit 1 이었음 |
| 같은 것 `--break=swap · order · drop · pair · edit · ko` | 6개 모두 exit 1 |
| `node scripts/restore-sample-words.mjs --check` | exit 0 · 18문장 (17 → 18) |
| `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course student` | PASS · 내 정보 칸 20문장 · 14강 · 앱이 채우는 칸 1문장(s9-1 #3 (dog’s name)) · s6-2 #3 칸은 '30'(조각으로 조립) |
| 같은 것 `--break=placed` (새) | exit 1 — `placeholders placed by the app: 2 (expected 1)` |
| `--break=judge · blank · fixedlist · hangul` | 모두 exit 1 (blank 는 앱이 채우는 칸 2 + 21문장으로 실패) |
| `--break=pool` | exit 0 (원래 보고만 하는 깨기 — 머리말대로) |
| `... --course adult` | PASS (바뀜 없음) |
| `node scripts/korean-words-hangul.mjs --check` | exit 0 · 32쪽 · 제목 8 |
| `node docs/adult/korean-words-on-screen.cjs` | PASS · 글 칸 85,863 |

브라우저 · 개발 서버는 띄우지 않음(필요 없음).

## 배포 뒤 운영에서 볼 것

- STUDENT 6-2 강의 2단계(조각 맞추기) 3번 문장: '30' 이 조각으로 나오고 앱이 미리 채운 칸이 없어야 함 · 정답 조립이 '맞음'.
- 같은 강의 3단계 '내 정보': 3번 문장에 '선생님 나이' 칸(예시 '30')이 보여야 함.
- 3번 문장 영어 · 한국어 소리가 새 글('about 30 years old' · '약 30세')로 나야 함(새 클립이 올라간 뒤).
- 앞서 '(age)' 칸에 적어 둔 값은 같은 저장 키(`s6-2#3:0`)라 그대로 보임.
