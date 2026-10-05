# 회귀 점검 1002 · 단계 2 · grading-browser (운영 · 이용권 사본 · 포트 9881~9884) — 2026-10-04

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 도구 · 내용 파일 안 바꿈 · 커밋 · 푸시 · R2 · 배포 0 · 이용권 코드 · PIN 타이핑 0 · /api/license · /api/admin 변경 호출 0 ·
원본 프로필 안 건드림(사본 `rc1002-s2-exam` · `-hangul` · `-var` · `-q` — 끝나고 지움). 브라우저 한 번에 하나. 🔴 멈춤 사유 없음.
기록 파일: 이 폴더 `grading-browser-cmd*.log` · `grading-browser-cmd1-grammar-exam.json` · `grading-browser-cmd2-grammar-exam-hangul.json`.

## 표

| # | 시각 | 명령 | exit | 쪽/문항 | 정답인데 오답 처리 | 기대와 |
|---|---|---|---|---|---|---|
| 1 | 16:52:46~17:34:54 (42분) | `check-grammar-exam.cjs --all-alts --clone rc1002-s2-exam --port 9881` | **0** | 282쪽 PASS 282(GRAMMAR I 194 + II 88) · 막힘 0 · 직접 채점한 185쪽(나머지 97쪽은 앞 강의와 '같은 답' 으로 넘어감) 4,093문항 · 다른 정답 7,827개 전부 읽음 | **0**(모범 0 · 대체 0) | 같음 |
| 2 | 17:35:31~17:40:15 (5분) | `check-grammar-exam.cjs --course grammar2 --hangul --all-alts --clone rc1002-s2-hangul --port 9882` | **0** | 16쪽 PASS 16 · 한국어 낱말 문항 22 · 한글 꼴 72개 중 채점 읽음 72 · 다른 정답 774 전부 읽음 | **0**(한글 꼴 정답 아님 0) | 같음(16쪽 · 22문항 · 72꼴) |
| 3a | 17:40:23 | `check-grammar-exam-variants.cjs --course grammar1 --ids gh1-006 --clone rc1002-s2-var --port 9883` | **0** | 1강 4문항: 'not' 넣음 ✕ 0점 · "n't" ✕ 0점 · 'a' 하나 더 △ 70점 · 모범 ✓ 100점 | — (기대한 오답 · 부분은 그대로, 모범은 ✓) | 같음 (기대와 다름 0) |
| 3b | 17:40:31 | `… --course grammar2 --ids gh2-007 …` | **1** | **강의 0 · 문항 0** — "gh2-007: 짧은 be 동사 문항이 0개뿐 — 건너뜀" | — | **다름**(아래 찾은 것) |
| 3c | 17:40:35 | `… --mode scope --ids gh1-016,gh1-060,gh1-068,gh1-096 …` | **0** | 4강 17문항: 일부→전체 부정 13개 모두 ✕ 0점 · 모범 4개 모두 ✓ 100점 | — | 같음 (기대와 다름 0) |
| 4 | 17:41:24~17:42:03 | `check-lesson-questions-0928.cjs --allow-remote --clone rc1002-s2-q --port 9884` (BASE=운영 · 빈 프로필 폴더) | **0** | 10/10 PASS (d003 · pr003 잠김 · d001 L1~L6 · pr001 R1 · R2) | — (정답 보기 → '맞았어요' R2 PASS · 오답 보기 → wrong L2 PASS) | 같음 |

검사 총량: 쪽 282 + 16 + 5강(3a · 3c) + 10단계 = 지시한 명령 전부 돌림. **정답인데 오답 처리 합계 0.** 실패 문항 0 — 적을 실패 문항(강의 · 문항 · 넣은 답 · 판정) 없음.

## 기대와 다른 것 1건 — 3b (고치지 않고 그대로 적음)

- 명령 3b `--course grammar2 --ids gh2-007` (기본 모드 be) 는 exit 1, 강의 0. 까닭은 이 모드가 '짧은 be 동사 문항 4개' 를 요구하는데 GRAMMAR II 에는 그런 문항이 없어서(도구 출력 그대로) 건너뜀 → 아무것도 시험하지 않음.
  거짓 통과가 아니라 '시험 못 함' 으로 exit 1 이 나온 것이라 도구가 정직하게 알린 것. 지시문의 gh2-007 은 be 모드 대상이 아님.
- 같은 강의를 맞는 모드로 보충 확인(`--mode prefix`, 지시 밖): `check-grammar-exam-variants.cjs --course grammar2 --ids gh2-007 --mode prefix …` → exit 0 · 3문항 기대대로
  (gh2-007 Q2 'If you study hard, …'(not 뺌) ✕ 오답(0점) · Q3 'If you study harder, …' ✕ 오답(0점) · Q1 모범 답안 ✓ 정답(100점)). 로그 `grading-browser-cmd3e-variants.log`.
- 보충으로 be 모드를 GRAMMAR II gh2-001~006 · 008~011 에도 돌려 봄(`cmd3d`): 모두 'be 동사 문항 0~1개 — 건너뜀', 강의 0. GRAMMAR II 는 be 모드로 시험할 강의가 없음.
  (GRAMMAR II 의 '반대말 · 부정' 채점은 `--mode prefix` 쪽이 맡음 — 위 보충 1강만 돌림. 전 강의 prefix 는 이 단계 몫이 아니라 돌리지 않음.)

## 그 밖에 본 것

- 3b 보충 실행(`cmd3d`) 끝에서 node 가 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c` 를 내며 exit -1073740791 로 끝남 — 이미 결과(강의 0 · 기대와 다름 0)를 다 낸 뒤 종료 때 Windows 의 libuv 오류.
  검사 결과와 무관. 정식 명령 1~4 · 3a · 3c · 3e 에는 없음.
- 명령 1 의 '와 같은 답' 97쪽(예: gh1-007 → gh1-006)은 도구가 같은 문항 데이터를 가진 강의를 한 번만 직접 채점하고 넘긴 것(최종 관문과 같은 방식). 쪽 수 282 는 모두 PASS 로 셈.
- 명령 4 는 빈 프로필(이용권 없음) 무료 강의만 눌렀음 — 정답 보기 → 맞음은 무료 d001 · pr001 의 4문항뿐. 유료 LISTENING · READING 새 문제 1,268 전 문항을 눌러 보는 도구는 없음(단계 0 already-fixed.md '증명 못 한 것' 1번 그대로 — 이 명령으로는 채워지지 않음).
- 속도: 명령 1 은 282쪽에 42분(쪽당 약 9초) — 지난번 41~45분과 같음.
