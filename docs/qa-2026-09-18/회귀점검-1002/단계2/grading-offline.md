# 단계 2 · grading-offline (브라우저 없음) — 2026-10-04

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 도구 · 내용 파일 안 바꿈 · 커밋 · 푸시 · R2 · 배포 안 함 · 이용권 코드 · PIN 타이핑 0 · /api/license · /api/admin 호출 0.
운영에 대고 한 것은 마지막 probe-question-lock 의 GET(로그아웃, 읽기만) 하나뿐. 브라우저 · 프로필 사본 안 씀. 8개 모두 exit 0, 정답인데 오답 처리 0, 멈춤 조건 없음.
출력 파일: `docs/qa-2026-09-18/회귀점검-1002/단계2/grading-offline-logs/NN-….log` (명령마다 하나).

| # | 시각 | 명령 | exit | 검사 N | 정답인데 오답 N | 기대와 | 출력 |
|---|---|---|---|---|---|---|---|
| 1 | 16:44:24 (11초) | `check-ld-dictation-0927.cjs` | 0 PASS | LISTENING 276강 2,217줄 · 빈칸 7,903 · 블록 2,217 · 소리 카드 4,082 · STUDENT 366문장 대조(한글 문장 48) | 0 | 같음 | 01-ld-dictation.log |
| 2 | 16:44:35 (2초) | `check-student-dictation.cjs --course student` | 0 PASS | 414문장 · 451꼴 · 82강 · 거꾸로 앞부분 오답 확인 414 · 틀린 첫 타일 뒤 힌트 414 · 내 정보 20문장 14강 | 0 | 같음 | 02-…student.log |
| 3 | 16:44:37 (2초) | 같은 것 `--course adult` | 0 PASS | 228문장 · 228꼴 · 55강 · 오답 확인 228 · 힌트 228 · 내 정보 7문장 2강(a1-2 #1~4 · #6 · #7, a1-5 #3) | 0 | 같음 | 03-…adult.log |
| 4 | 16:44:39 (4초) | `단계0/already-fixed-hangul-forms.cjs` | 0 PASS | 한글로 베낀 답 523 = GRAMMAR II 시험 72(문항 22) + PASS-OFF 영작 451 + 짧은 답 0(해당 문항 없음) | 0 (523/523 정답) | 같음 | 04-hangul-forms.log |
| 5 | 16:45:02 (92초) | `pass-off-grammar/검사/check-grading.cjs` | 0 PASS | 레슨 67 · ④⑤ 문항 1,290 · ③ 609 · 화면 문항 2,092 · A 정답(모범 · 허용) 11,594 · G 한글 답 1,290 · F 짧은 답 51 | 0 (따로 센 60 은 채점 규칙상 의도된 것 — 실패 아님) | 같음 | 05-check-grading.log |
| 6 | 16:46:34 (4초) | `pass-off-grammar/검사/check-lessons.cjs` | 0 | 레슨 67(유료 복원 12) · 주제 20 | — (채점기 아님) problems 0 · warnings 0 | 같음 | 06-check-lessons.log |
| 7 | 16:46:38 (1초) | `check-new-questions.cjs --dir content/questions` | 0 PASS | 문항 1,268 · 정답 자리 A 308 B 319 C 322 D 319 · 길이 순위 25% 씩 · 정답이 혼자 가장 긴 것 179(14%) | 0 | 같음(1,268) | 07-check-new-questions.log |
| 8 | 16:46:39 (37초) | `probe-question-lock-0928.cjs` (운영 GET) | 0 PASS | 1,064쪽 · 유료 2,112 받음 · 무료 16 | 유료에 문제 글 0 · 잠금 표시 없음 0 · 무료인데 물음 없음 0 · HTTP 200 아님 0 | 같음 | 08-probe-question-lock.log |

## 기대 숫자 대조

- STUDENT 앱이 채우는 칸: 정확히 2문장 — s6-2 #3 `(age)` · s9-1 #3 `(dog's name)` (기대 둘뿐). ADULT 는 0문장 (기대 0).
- ADULT 1-2 '내 정보' 빈칸 문장 포함: 7문장 2강 (기대 7 · 2강) 모두 부분 조립으로 통과.
- 한글로 베낀 답 523/523 (단계 0 기록 523/523 과 같음).
- check-lessons: problems 0 · warnings 0 (기대와 같음). check-grading PASS (단계 0 의 V 2,092 · G 1,290 · F short 51 과 같음).
- check-new-questions 1,268 (기대 1,268). probe-question-lock 1,064쪽 · 유료 2,112 · 문제 글 0 · 무료 16 (단계 0 기록과 같음).

## 한계 (고치지 않고 적기만)

- 이 일꾼은 도구를 단계 0 에서 깨기로 증명된 그대로 돌렸을 뿐, 이번에 다시 깨 보지는 않았다 (증명은 단계 0 `already-fixed.md` 몫).
- #4 의 '짧은 답 0' — 한국어 낱말이 든 짧은 답 문항이 지금 없어 그 꼴은 잴 것이 없음 (단계 0 한계 3 과 같음).
- #7 은 보기 모양 · 정답 자리 형식 검사이고, 문항마다 정답 보기를 눌러 '맞음' 으로 채점되는지는 보지 않는다 (단계 0 한계 1 — 이용권 브라우저 도구 몫, 이 일꾼 범위 밖).
- #8 은 로그아웃 GET 이라 이용권 쪽 본문은 보지 않음 (이 검사의 목적 — 이용권 없이 유료 글이 안 보이는지 — 은 통과).
- 이 작업 트리에는 이 일꾼이 만든 것 외에 다른 파일 변경이 이미 있었음 (git status: scripts 변경 다수 · docs/adult/korean-words-on-screen.cjs — 단계 0 일꾼들의 몫, 이 일꾼은 안 건드림).
