셀 기록: --files adult-pd2.jsonl, adult-pd2r.jsonl, student-pd2.jsonl, passoff-grammar-pd2.jsonl, ld-pd2.jsonl, reading-pd2.jsonl, reading-pd2r.jsonl — 파일 7 · 기록 83 · 강의 × 화면마다 가장 늦은 기록
NA(해당 없음): ADULT — 다른 검사가 봄: 덮임 0 · 안 덮임 0 · 그 자리에 없음(다른 자리 PASS) 0 · 표본 검사 8(새로고침 PASS 있음) / LISTENING — 다른 검사가 봄: 덮임 0 · 안 덮임 0 · 그 자리에 없음(다른 자리 PASS) 0 · 표본 검사 2(새로고침 PASS 있음) / PASS-OFF GRAMMAR — 다른 검사가 봄: 덮임 3 · 안 덮임 0 · 그 자리에 없음(다른 자리 PASS) 0 · 표본 검사 2(새로고침 PASS 있음) / READING — 다른 검사가 봄: 덮임 0 · 안 덮임 0 · 그 자리에 없음(다른 자리 PASS) 8 · 표본 검사 0 / STUDENT — 다른 검사가 봄: 덮임 0 · 안 덮임 0 · 그 자리에 없음(다른 자리 PASS) 0 · 표본 검사 1(새로고침 PASS 있음)

### 강의 커버리지 (§17: PASS + FAIL + BLOCKED + NOT TESTED = DISCOVERED)

| 과정 | 명령서 기준(본강의) | 발견 본강의 | 발견 스크립트 | 발견 합계 | PASS | FAIL | BLOCKED | NOT TESTED | 합계 일치 |
|---|---|---|---|---|---|---|---|---|---|
| STUDENT | 81 | 82 | 0 | 82 | 3 | 0 | 0 | 79 | ✔ |
| ADULT | 55 | 55 | 0 | 55 | 12 | 0 | 0 | 43 | ✔ |
| PASS-OFF GRAMMAR | 67 | 67 | 0 | 67 | 4 | 0 | 0 | 63 | ✔ |
| VOCA | 195 | 195 | 0 | 195 | 0 | 0 | 0 | 195 | ✔ |
| GRAMMAR I | 53 | 53 | 141 | 194 | 0 | 0 | 0 | 194 | ✔ |
| GRAMMAR II | 44 | 44 | 44 | 88 | 0 | 0 | 0 | 88 | ✔ |
| LISTENING | 276 | 276 | 276 | 552 | 4 | 0 | 0 | 548 | ✔ |
| READING | 256 | 256 | 256 | 512 | 4 | 0 | 0 | 508 | ✔ |
| **합계** | **1027** | **1028** | **717** | **1745** | **27** | **0** | **0** | **1718** | ✔ |

**실기기 몫(강의 판정에 안 셈)**: READING 3단계 실제 마이크 인식 — headless 불가, 단계 3 · 실제 휴대폰 몫 — 기록 4(강의 4 · 화면 desktop)
**다른 도구가 본 NA(⑩ — 그 도구 결과 파일로)**: 0
**연결 실패로 따로(⑪ — 강의 판정에 안 셈 · recheck-audio 로 다시 누를 것)**: 0
**깨기 기록(셈에서 뺌)**: 0건 · 로컬(localhost) 기록 0건

### 항목 커버리지 (강의 수와 별도)

| 항목 | 확인 대상 | 확인함 | 방법 |
|---|---|---|---|
| 과정 (course) | 8 | 8 | STUDENT · ADULT · PASS-OFF GRAMMAR · VOCA · GRAMMAR I · GRAMMAR II · LISTENING · READING |
| 챕터·스테이지 (STUDENT) | 20 | 20 | scripts/check-student-unlock.cjs(out/student-unlock.json 2026-10-02T06:11:56.934Z) |
| 강의 (main + script) | 1745 | 27 | out/features/*.jsonl |
| 학습 단위 (화면에 나와야 할 문장·낱말) | 44928 | 1242 (기대 1242 중 있음 · 데스크톱 기록 27강) | 이 표가 센 기록 — 강의마다 데스크톱 가장 늦은 기록의 content: STUDENT 40/40(3강) · ADULT 355/355(12강) · PASS-OFF GRAMMAR 670/670(4강) · VOCA 셈 안 함(데스크톱 기록 없음) · GRAMMAR I 셈 안 함(데스크톱 기록 없음) · GRAMMAR II 셈 안 함(데스크톱 기록 없음) · LISTENING 25/25(4강) · READING 152/152(4강) |
| VOCA 낱말 | 5831 | 5831 | scripts/check-data-integrity.cjs |
| 채점 문항 | 11670 | 11670 | scripts/grade-offline.cjs + check-grammar-exam.cjs |
| 딕테이션 문장 | ? | ? | scripts/check-dictation.cjs |
| 음성 클립 | 17294 | undefined | audio-inventory + probe-missing-clips (전수는 대기열) |
| 음성 버튼 누름 | ? | ? | 실제 클릭 |
| 기능 확인 항목 | ? | 동일 | out/features-summary.json |
| 교육 내용 검토 대상 강의 | ? | ? | scripts/check-review-coverage.cjs |