# 최종 출시 관문 — 증거 파일 (2026-09-24 ~ 26)

보고서 `../K-IG_Commercial_Release_Readiness_Report.md` 의 숫자가 나온 파일들입니다. 모두 **운영 사이트**에서 잰 것이고, 점검을 한 세션(같은 AI)이 만들었습니다 — 독립적인 검토가 아닙니다.
원래 자리는 세션 스크래치 폴더라 세션이 끝나면 없어지므로 여기에 옮겨 둡니다. 스윕 기록 원본(`../out/features/*-g0-* · *-g15-*.jsonl` 106개)은 `out/` 이 git 밖이라 이 컴퓨터에만 있습니다.

| 파일 | 관문 | 무엇 |
|---|---|---|
| `gate-count-final.txt` | 0 · 5 · 9 · 10 | 기록 파일 106개 목록(만든 날짜 · 배포 전 기록 0 · 운영 아닌 것 0) · 강의×화면 4,869/4,869 · 배포 셋 뒤 다시 볼 쪽 · 음성 누름 · 서버 응답 · 화면 글자 |
| `coverage-final.txt` | 6 · 11 | build-coverage — 강의 1,623 · PASS 1,619 · FAIL 4 · BLOCKED 0 · NOT TESTED 0 · FAIL 사유 |
| `analyze-final.txt` | 14 | 과정별 기능 집계(보고서 D절 표) |
| `gate7-final.txt` | 7 | [Critical] 3건(d024 · d058 · d192) × 3화면 — 새 글 · 새 클립 재생 · 옛 클립 요청 0 |
| `recheck-targets-final2.jsonl` · `recheck-count.json` | 5 | 한 번에 확인 안 된 진짜 재생 버튼 1,658곳(되살린 1,391 포함)과 새로 연 쪽에서 다시 누른 결과 — 1,658/1,658 소리 남 |
| `tile-live-main-*.txt` · `tile-live-check-*.json` | 6 · 4 | LISTENING 받아쓰기를 운영에서 문장마다 다시 풀기 — 본 쪽 8강 146문장 + 대본 쪽 2강 32문장 모두 정답 · 깨기(`-break`)는 스윕 FAIL 을 그대로 재현 |
| `new-clips-live*.json` | 15 · C절 | 관문 중 새로 만든 클립 131개를 운영에서 받아 바이트 대조 — 131/131 같음 · 깨기 잡음 |
| `ab-run.log` | 12 | 옛 판(d2b50ca) · 새 판(397f1e8 앱) 로컬 빌드 번갈아 두 번 + 운영 익명 — 관문 배포 탓 아님 |
| `gate-http-probes-deploy4.txt` | 1 · 2 · 3 | 유료 1,595 잠김 · 무료 28 · 무료 클립 264 · 유료 15,070 막힘 · 유출 0 |
| `gate13-full-deploy3.txt` | 13 | 6단계 검사 목록 본 32 · 깨기 23 |
| `post-final.log` · `after-ab.log` · `final-tail.json` | — | 스윕 뒤 순서를 돌린 기록(끝 다시 돌기 목록 0 등) |
| `owner-pending-0917-now.txt` | 13(고친 판) | 9/17 감사에서 사장님 결정으로 넘어간 L-74 · L-84 · L-80 · R-30 · R-32 문장의 지금 글(영어 · 한국어) — `scripts/l74-l84-now.cjs` |
| `verify-report-break-0917-before.txt` · `-after.txt` | 14(고친 판) | verify-report 의 새 검사 둘('결정 대기 셋을 적었나' · '결정 대기 0 만 쓴 줄') — 고치기 전 보고서 문제 2 · exit 1 · 고친 판 망가뜨린 사본 둘 각 exit 1 · 진짜 판 통과 44 · `-decided.txt`: 사장님 결정 '다 그대로' 뒤 검사를 '셋 + 결정' 으로 — 깨기 셋 모두 exit 1 · 진짜 판 통과 44 |
| `scripts/` | — | 위 파일을 만든 스크래치 도구 — 돌린 판 그대로(경로는 이 컴퓨터 기준이라 옮기면 고쳐야 함) |
