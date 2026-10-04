# 단계 0 — already-fixed (10/2 밤 이미 고친 도구 · 새 과정 세션의 검사 도구: 깨기 확인)

일꾼: already-fixed · 2026-10-04 · 작업 트리 `nostalgic-blackburn-048c73`(HEAD 7bfd5d7b = origin/main) · 디버깅 포트 9730~9731 만 씀 ·
이용권 사본 `kig-audit-0918-rc1002-already-fixed-exam`(GRAMMAR 시험) · 빈 사본 `…-rc1002-already-fixed-q`(무료 문제) — 둘 다 끝나고 지움. 원본 프로필 손대지 않음 · 새 기기 0 ·
코드 · 비밀번호 · PIN 타이핑 0 · /api/license · /api/admin 변경 호출 0 · 커밋 · 푸시 · R2 · 배포 0 · content/ · src/ 변경 0(깨기는 메모리 안 또는 스크래치 사본에서만).
**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.**

## 한눈에

| # | 도구 | 지금(통과 숫자) | 깨기(실패 숫자) | 판정 |
|---|---|---|---|---|
| ① | check-student-dictation.cjs `--course student` | PASS · 414문장 · 451꼴 · 82강 · 내 정보 20문장 14강 · 앱이 채우는 칸 2 | hangul FAIL 51(48문장) · judge FAIL 451 · blank FAIL 2 · fixedlist FAIL 1 — 모두 exit 1 | 증명됨 |
| ① | 같은 도구 `--course adult` | PASS · 228문장 · 55강 · 내 정보 7문장 2강(a1-2 6문장 10칸 + a1-5 #3) · 앱이 채우는 칸 0 | hangul FAIL 45(45문장) · judge FAIL 228 · fixedlist FAIL 1 · **blank FAIL 1(새로 더함)** | 증명됨 |
| ② | check-ld-dictation-0927.cjs | PASS · 276강 2,217줄 · STUDENT 366문장 대조(한글 문장 48 뺌) | nonword 297 · capital 253 · repeat 3,577 · distractor 556 · liaison 2 · migrate 2 · **identity: 고치기 전 PASS(죽은 깨기) → 고친 뒤 FAIL 1** | 증명됨(identity 는 고친 뒤) |
| ③ | docs/adult/korean-words-on-screen.cjs | PASS · 글 칸 85,863 | --break FAIL 1(STUDENT s20-4) · --break=grammar FAIL 5(gh2-033) · **--break=adult FAIL 1 · --break=passoff FAIL 56(새로 더함)** · 사본 깨기(a1-2 '서울'→'Seoul') FAIL 2 | 증명됨 |
| ③ | scripts/korean-words-hangul.mjs --check | exit 0 · 32쪽 · 제목 8 | 사본 s20-4 #1 '경주'→'Gyeongju' → exit 1 "still romanized" · 되돌림 exit 0 | 증명됨 |
| ③ | scripts/build-adult-content.mjs --check | exit 0 · 55강의 12장 | 사본 a1-2 #2 '서울'→'Seoul' → exit 1 "differs: a1-2.json" · 되돌림 exit 0 | 증명됨 |
| ④ | check-grammar-exam.cjs(운영 · 이용권 사본) | gh2-012 · gh2-033 `--hangul --all-alts` PASS — 다른 정답 116 읽음 · 한글 꼴 7/7 정답 · gh1-006(+gh1-007 넘어감) `--all-alts` PASS 29/29 | `--all-alts --break` exit 1(대체 1) · **`--hangul --break=hangul` exit 1('He swam across the 가나다.' → ✕ 오답 (0점)) — 새로 더함** | 증명됨 |
| ④ | check-grammar-exam-variants.cjs(운영) | gh1-006 be 4/4 기대대로 · gh1-096 scope 5/5 | **--break(새로 더함)** be exit 1 · scope exit 1('모범 답' 이 ✓ 정답 → ✗) | 증명됨 |
| ④ | 한글로 베낀 답(브라우저 없이 · 새 기록 도구 `단계0/already-fixed-hangul-forms.cjs`) | 523/523 정답(GRAMMAR II 시험 72 · PASS-OFF 영작 451 · 짧은 답 0) | --break=no-roman(romanForGrading 없이) 0/523 · exit 1 | 증명됨 |
| ⑤ | docs/pass-off-grammar/검사/check-grading.cjs | PASS(68초) · V 2,092 · G 한글 답 1,290 · F short 51 | 깨기 18개 모두 exit 1(targets 1 · targets-all 1 · fix 1 · accept 1 · view 1 · word-forms 3,649 · apostrophe 899 · inflection 59 · is-has 2 · ref-reading 1 · noun-s 248 · noun-s-end 16 · slash 388 · heard-as 1,234 · possessive-hint 186 · ref-noun-s 338 · word-forms-near 3,382 · memo-reason 1) | 증명됨 |
| ⑤ | docs/pass-off-grammar/검사/check-lessons.cjs | problems 0 · warnings 0(4초) | --selftest 34개 모두 '잡음'(hangulInEnglish · studentExactMismatch 포함, 382초) | 증명됨 |
| ⑥ | scripts/buildFreeSpeechKeys.mjs --check | **이 작업 트리에서는 exit 1(거짓 '오래됨' — 아래 찾은 것 1)** · 커밋된 파일(LF)로는 exit 0 · 32강 315키 · 미디어 34강 38키 | 사본 a1-1 #1 'Nice to meet you.' 바꿈 → exit 1 · a1-1 첫 덩어리만 바꿈 → exit 1 · 되돌림 exit 0 | 증명됨(사본 · LF 로) |
| ⑥ | check-new-questions.cjs `--dir content/questions` | PASS · 1,268문항(앱이 읽는 폴더 · 설계 폴더와 같음) | length · shape · evidence · rank · outlier · converge · chips 7개 모두 exit 1 | 증명됨 |
| ⑥ | check-lesson-questions-0928.cjs(운영 · 빈 브라우저) | 10/10 PASS(d001 · d001-1 · pr001 · 잠긴 d003 · pr003) | verdict · evidence · hide · engine · persist · lock 6개 모두 exit 1 | 증명됨 |
| ⑥ | probe-question-lock-0928.cjs(운영 · 로그아웃 GET) | PASS · 1,064쪽 · 유료 2,112 받음 · 문제 글 0 · 잠금 없음 0 · 무료 16 물음 다 있음 | --break=free exit 1(유료로 본 무료 쪽 문제 글 16 · 잠금 없음 8) | 증명됨 |
| ⑦ | prove-spoken-definition.cjs | PASS · 새 정의 17,292 · ADULT 낱말(say) · 덩어리(chunks.en) 포함 · 스윕 기록 10파일 185키 빠뜨림 0 | 스크래치 preload 로 ADULT 낱말 · 덩어리 소리를 정의에서 뺌 → exit 1(빠뜨림 12 — 'graduate from' · 'In my view,' …) | 증명됨 — 단, 스윕 기록에 ADULT 가 있을 때만(아래 찾은 것 4) |

## 고친 파일과 바뀐 것 (줄 번호는 고친 뒤)

1. `docs/qa-2026-09-18/scripts/check-student-dictation.cjs`
   - 21: 도움말에 ADULT `--break=blank` 설명.
   - 81~82: `--break=blank` 를 `--course adult` 에서도 — a1-2 #7 '내 정보' 칸을 빼고 셈(전에는 STUDENT s20-5 만 깨서 ADULT 쪽은 깨기가 아무것도 안 바꿔 PASS 였다).
2. `docs/qa-2026-09-18/scripts/check-ld-dictation-0927.cjs`
   - 323~325 · 330~331: `--break=identity` 가 `seed === 7` 하나만 깼는데, 10/2 밤 한글 낱말 문장을 건너뛰게 바뀐 뒤 seed 7 이 건너뛴 문장(s1-2 #1 홍길동) 몫이 되어
     **깨기가 아무것도 깨지 않고 PASS(exit 0)** 였다 → 실제로 비교하는 첫 문장(풀 있음)을 깨게 고침. 검사 자체는 그대로.
3. `docs/adult/korean-words-on-screen.cjs`
   - 17~18 도움말 · 26~29 `--break=adult`(a1-2 #2 '서울' → 'Seoul') · `--break=passoff`(pg06-1 을 koreanOnScreen 없이) · 90 · 107 깨기 자리.
4. `docs/qa-2026-09-18/scripts/check-grammar-exam.cjs`
   - 22~27 도움말 · 45~50 `--hangul` · `--break=hangul` · koreanGloss.ts 단독 불러오기 · 52 결과 파일 이름(grammar-exam-hangul.json · -hangul-break.json) ·
     129 · 137 한국어 낱말 문항이 있는 강의만 · 209~247 한글 꼴 채점 줄(모범 · 다른 정답 전부를 koreanOnScreen 꼴로 · 줄마다 ✓ 정답이어야) ·
     250~252 상태 · 268 결과 JSON · 272 · 276 요약 줄과 exit(`--hangul` 이면 문제 · 막힘 있으면 exit 1).
   - 영어 철자 꼴은 같은 실행의 모범 답안 줄(+ `--all-alts` 면 다른 정답 전부)이 그대로 넣는다 → 한 번 실행에 두 꼴.
5. `docs/qa-2026-09-18/scripts/check-grammar-exam-variants.cjs`
   - 12 도움말 · 46~49 `--break` · 117~120: 첫 강의의 '✕ 오답' 기대 문항에 바꾼 답 대신 모범 답안을 넣어 ✗ 가 잡히는지(깨기 인자가 없던 도구).
6. `docs/qa-2026-09-18/scripts/check-lesson-questions-0928.cjs`
   - 9 도움말 · 97~99: `--clone` · `--port`(기본 questions0928 · 9607 그대로). 포트 9607 이 박혀 있어 이 일꾼 범위(9730~)로 돌릴 수 없었음 — 동시 일꾼용.
7. 새 파일 `docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs` — 11a46e38 의 '한글로 베낀 답 487' 을 잰 도구가 저장소에 없어서
   같은 것을 앱 채점 함수 그대로 다시 세는 기록 도구(--break=no-roman 깨기 있음).

## 깨기 증명 (명령 · 깨뜨린 것 · 깨진 결과 · 되돌린 뒤)

모두 이 작업 트리에서 실제 검사와 같은 실행(같은 도구 · 같은 데이터 전부, 줄인 실행 아님). 운영 브라우저 검사만 몇 강.

- ① `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course adult --break=blank` → a1-2 #7 칸 뺌 → "blank sentences 6 in 2 lessons (expected 7 in 2)" FAIL 1 · exit 1 / 인자 없이 exit 0(7문장 · 2강).
  `--course adult --break=hangul` → FAIL 45(45문장, README 의 ADULT 45 그대로) · `--course student --break=hangul` → FAIL 51(48문장 — README 의 'STUDENT 39' 는 낡음: 10/2 밤 되살린 교재 예시 낱말로 한글 문장이 늘어 48).
- ② `node docs/qa-2026-09-18/scripts/check-ld-dictation-0927.cjs --break=identity` → 고치기 전 exit 0 PASS(죽은 깨기) · 고친 뒤 "generateWordBank changed: student s1-1 #1 (lesson pool)" FAIL 1 · exit 1 / 인자 없이 exit 0.
- ③ `node docs/adult/korean-words-on-screen.cjs --break=adult` → "adult/a1-2 … 'Seoul'" FAIL 1 · exit 1 · `--break=passoff` → 56 · exit 1 · `--break` 1 · `--break=grammar` 5 / 인자 없이 exit 0(85,863칸).
  사본(스크래치 rc1002-already-fixed-copy — content · src · scripts · docs/adult 복사, node_modules 연결)의 a1-2.json 을 실제로 바꿔: `build-adult-content.mjs --check` exit 1 ·
  `korean-words-on-screen.cjs` exit 1(2곳 — 문장과 덩어리) · s20-4.json 바꿔 `korean-words-hangul.mjs --check` exit 1 · 되돌리고 셋 다 exit 0.
- ④ `node docs/qa-2026-09-18/scripts/check-grammar-exam.cjs --course grammar2 --ids gh2-033,gh2-012 --hangul --all-alts --break=hangul --clone rc1002-already-fixed-exam --port 9730`
  → "(깨기) gh2-012 11번 한글 꼴 'He swam across the 한강.' → '… 가나다.'" → ✕ 오답 (0점) · FAIL 1 · exit 1 / `--break=hangul` 없이 2강 PASS · 한글 꼴 7/7 · exit 0(48초).
  `… --all-alts --break` → 대체 1 · exit 1. variants `--ids gh1-006 --break` → 기대와 다름 1 · exit 1 / 없이 0 · exit 0. `--ids gh1-096 --mode scope --break` → 1 · exit 1 / 없이 0.
  `node docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs --break=no-roman` → 정답 0/523 · exit 1 / 없이 523/523 · exit 0.
- ⑤ check-grading.cjs 깨기 18개 — 위 표의 숫자, 모두 exit 1(스크래치 node 구동기로 차례로, 18개 약 27분) / 인자 없이 PASS exit 0. check-lessons --selftest 34/34 잡음.
- ⑥ buildFreeSpeechKeys: 사본에 커밋된 생성 파일(`git show HEAD:…` — LF)을 두고 `--check` exit 0 → a1-1 #1 문장 바꿈 exit 1 → 되돌림 exit 0 → a1-1 첫 덩어리만 바꿈 exit 1 → 되돌림 exit 0.
  check-new-questions 7개 · check-lesson-questions-0928 6개(운영 `--allow-remote` · 빈 프로필 사본 · 포트 9731) · probe-question-lock `--break=free` — 표의 숫자.
- ⑦ `node -r <스크래치 drop-adult-sounds.cjs> docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs`(spoken-texts.cjs 의 spokenTexts 가 ADULT 문장의 words · chunks 를 못 보게 — 메모리만)
  → 새 정의 17,292 → 16,435 · "새 정의가 빠뜨림 12"(adult · word 'graduate from' · 'ease' … · adult · en 'In my view,' …) · exit 1 / 그대로 exit 0(10파일 185키 빠뜨림 0).

## 증명 못 한 것 · 한계와 까닭

1. **LISTENING · READING 새 문제 1,268 의 '정답 보기 → 맞음' 을 문항마다 누르는 도구는 없다.** check-lesson-questions-0928 은 무료 d001 · pr001 의 4문항만 누름(운영 10/10).
   채점은 `LessonQuestions.tsx` 93 · 132 의 `picked === q.answer`(번호 비교)뿐이고, 문항 모양 · 정답 번호 0~3 은 check-new-questions(1,268 PASS)가 봄 —
   이용권으로 전 문항을 누르는 것은 단계 2 몫(새 도구가 필요 — 이 일꾼 몫 아님).
2. **⑦ prove-spoken-definition 의 ADULT 증명은 스윕 기록에 기댄다.** 이 작업 트리의 `docs/qa-2026-09-18/out/` 는 git 밖이라 최종 관문 스윕 기록(본 폴더 288+15파일)이 없고,
   오늘 다른 일꾼이 쓴 10파일(ADULT `adult-rc1002-adultsweep*.jsonl` 포함)만 본다. 처음 돌렸을 때(7파일 · ADULT 없음)는 같은 깨기가 PASS 였을 것 —
   **단계 1 스윕(ADULT 2 · 3단계의 낱말 · 덩어리 소리 단추를 누르는)이 끝난 뒤 다시 돌려야** ADULT 쪽 PASS 가 PASS 다.
3. ⑤ '짧은 답의 한글 꼴': 한국어 낱말이 든 짧은 답(③ short) 문항이 지금 0개(PASS-OFF 전체 short 51 · 표에 든 강의 9) — 코드(FormStep.tsx 255 `gradeShort(item, gradedFor(lessonId)(text))`)는 있으나 잴 문항이 없음.
   check-grading.cjs 는 romanForGrading 을 거치지 않는다(G '한글 섞인 답 → hangul' 1,290 은 되돌림 없는 채점기 판정) — 화면의 한글 꼴 채점은 위 기록 도구 523/523 이 대신 봄.
4. GRAMMAR 시험의 한글 꼴은 운영 브라우저로 2강(gh2-012 · gh2-033)만 — 나머지 14쪽(gh2-011 · 016 · 020 · 029 · 038 · 045 와 그 -1)은 단계 2 몫.
   브라우저 없는 같은 셈(72/72)은 전부 함.
5. 11a46e38 의 '487' 은 다시 만들 수 없음(도구가 저장소에 없음 · 커밋 메시지뿐). 이번 셈은 523(GRAMMAR II 시험 72 + PASS-OFF 영작 451 — 셈 단위가 다름: 같은 한글 꼴이
   여러 참조 답에서 나오면 따로 셈). 둘 다 '모두 정답' 이고, 되돌림 없이는 0 — 결론은 같음.

## 지난번 잰 속도 / 이번에 잰 속도

| 도구 | 지난번 | 이번 |
|---|---|---|
| check-grammar-exam --all-alts(운영 282쪽) | 9/25 06:46~07:27 · 11:53~12:38 → 41~45분 = 쪽당 8.7~9.6초 | gh1-006 + 넘어간 gh1-007: 13초/2쪽(브라우저 띄우기 포함) · gh2 2쪽 `--hangul --all-alts` 48초 = 쪽당 약 21초(띄우기 5초 빼고) · `--all-alts` 만 30초/2쪽 |
| check-grammar-exam-variants(운영 1강) | 기록 없음 | 5~8초 |
| check-grading.cjs | 기록 없음 | 68초(깨기 하나 47~149초) |
| check-lessons --selftest | 기록 없음 | 382초 |
| prove-spoken-definition | 기록 없음 | 102~134초 |
| check-ld-dictation-0927 | 기록 없음 | 5~6초 |
| check-student-dictation | 기록 없음 | 1~4초 |
| korean-words-on-screen | 기록 없음 | 수 초 |
| check-lesson-questions-0928(운영) | 로컬만 | 39~46초 |
| probe-question-lock-0928(운영 1,064쪽 × 2) | 기록 없음 | 38~39초(쪽당 0.04초) |

## 전부 돌리는 명령 (단계 1 · 2 일꾼용 — 작업 트리 뿌리에서)

- `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course student` → exit 0 · 414문장 · 451꼴 · 82강 · 내 정보 20문장 14강 · 앱이 채우는 칸 2(s6-2 · s9-1) — 2초.
  `--course adult` → exit 0 · 228 · 55강 · 내 정보 7문장 2강(a1-2 #1~4 · #6 · #7 · a1-5 #3) · 앱이 채우는 칸 0 — 3초.
- `node docs/qa-2026-09-18/scripts/check-ld-dictation-0927.cjs` → PASS · 276강 2,217줄 · STUDENT 366문장 대조 · 한글 문장 48 — 6초.
- `node docs/adult/korean-words-on-screen.cjs` → PASS 글 칸 85,863 · `node scripts/korean-words-hangul.mjs --check` → exit 0(32쪽 · 제목 8) · `node scripts/build-adult-content.mjs --check` → exit 0(55강의 12장) — 각 수 초.
- `node scripts/buildFreeSpeechKeys.mjs --check` — 이 작업 트리에서는 CRLF 때문에 거짓 exit 1. 키가 같은지는:
  `node -e "const fs=require('fs'),cp=require('child_process');const a=JSON.parse(cp.execSync('git show HEAD:src/lib/generated/freeSpeechKeys.json'));const b=JSON.parse(fs.readFileSync('src/lib/generated/freeSpeechKeys.json','utf8'));console.log(JSON.stringify(a)===JSON.stringify(b)?'same as HEAD':'DIFFERS')"`
  로 작업 파일 = HEAD 를 보고, HEAD 가 내용과 맞는지는 스크래치 사본에서(content · src · scripts 복사 + node_modules 연결 + `git show HEAD:… >` 로 LF 파일) `--check` → exit 0 · 32강 315키 · 미디어 34강 38키.
- `node docs/qa-2026-09-18/scripts/check-grammar-exam.cjs --all-alts --clone rc1002-<이름>-exam --port <내 포트>` → 282쪽(GRAMMAR I 194 + II 88) 모두 PASS · 막힘 0 기대 — 45~60분(지난번 41~45분).
  `… --course grammar2 --hangul --all-alts --clone … --port …` → 16쪽 · 한국어 낱말 문항 22 · 한글 꼴 72 모두 ✓ 정답 · exit 0 — 약 6분.
  `node docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs` → 523/523 · exit 0 — 수 초.
- `node docs/qa-2026-09-18/scripts/check-grammar-exam-variants.cjs --ids gh1-006 --clone … --port …` → 4/4 · `--mode scope --ids gh1-016,gh1-060,gh1-068,gh1-096` → 기대와 다름 0 — 강의당 5~8초.
- `node docs/pass-off-grammar/검사/check-grading.cjs` → PASS — 70초 · `node docs/pass-off-grammar/검사/check-lessons.cjs` → problems 0 · warnings 0 — 4초.
- `node docs/qa-2026-09-18/scripts/check-new-questions.cjs --dir content/questions` → PASS 1,268 — 1초 · `node docs/qa-2026-09-18/scripts/probe-question-lock-0928.cjs`(운영) → PASS · 1,064쪽 · 문제 글 0 — 40초.
  `$env:BASE="https://k-ig-core.vercel.app"; $env:KIG_PROFILE_SOURCE="<빈 폴더>"; node docs/qa-2026-09-18/scripts/check-lesson-questions-0928.cjs --allow-remote --clone rc1002-<이름>-q --port <내 포트>` → 10/10 — 45초.
- 단계 1 스윕이 끝난 뒤: `node docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs` → exit 0 · 빠뜨림 0 · 둘 다 없음 0 — 2분, 그리고
  `node -r ./docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-drop-adult-sounds.cjs docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs` → exit 1 이어야(ADULT 낱말 · 덩어리 소리가 스윕 기록에 있다는 증명).

## 남의 몫에서 찾은 것 (고치지 않음 — 적기만)

1. **`scripts/buildFreeSpeechKeys.mjs --check` 가 Windows 체크아웃에서 거짓 '오래됨'(exit 1).** 이 작업 트리의 `src/lib/generated/freeSpeechKeys.json` 이 CRLF(core.autocrlf=true ·
   `git ls-files --eol` → i/lf w/crlf)라 175 `current !== json` 이 줄 끝만 다른데도 stale. 키 315개는 같음(재생성과 대조). build-adult-content.mjs 는 줄 끝을 맞춰 비교함.
   고칠 안: --check 에서 `current.replace(/\r\n/g, "\n")` 로 비교. (단계 1 ② 의 'exit 0' 칸이 이 때문에 거짓 실패로 나올 것 — 일꾼은 아래 howToRun 의 방법으로.)
2. `AGENTS.md` 96 줄이 낡음 — 'GRAMMAR II · PASS-OFF 는 … 화면만 Busan(부산) 으로 덧붙입니다' → 11a46e38 뒤로는 화면 한글만('부산'). `scripts/korean-words-hangul.mjs` 10~11 줄 주석도 같은 옛 설명.
3. `docs/adult/README.md` 39: '--break=hangul 이 STUDENT 39 · ADULT 45 를 잡음' → 지금 STUDENT 48문장(51꼴) · ADULT 45.
4. PASS-OFF 검사(check-grading.cjs)에는 화면의 한글 꼴(romanForGrading) 채점이 없다 — passoff-sweep 몫으로 적음(위 기록 도구가 브라우저 없이 451/451 확인).
5. `check-lesson-questions-0928.cjs` 는 로컬 빌드용으로 쓰였지만 운영 `--allow-remote` 로도 그대로 돔(빈 프로필 · 무료 강의 · 이 기기 저장소만 씀).
