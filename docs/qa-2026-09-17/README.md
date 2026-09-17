# 전체 출시 감사 (2026-09-17) — 진행 기록

> **재개하는 세션은 여기부터 읽으세요.** 이 파일이 체크포인트입니다.
> 대상: 운영 `https://k-ig-core.vercel.app` (배포 커밋 `c14c03d`).
> **상태: 감사 완료 (2026-09-17 10:2x KST) — 판정 NO-GO, 49/100.** 결과는 `final-report.md`, 이슈는 `issues.md`. **수정은 아직 하나도 안 함** (다음 단계, 소유자 확인 후).

## 소유자 지시 (그대로 지킬 것)

- 감사 명령 전문: 9개 역할 · 8단계 · 커버리지 체크리스트(PASS/FAIL/BLOCKED/NOT APPLICABLE) · 표본 금지 · 최종 보고 21항목.
- **제외 (변호사 논의 후 소유자 결정):** 법적 문제, 새 결제창 만들기, 관리자 2차 인증. → `DEFERRED — OWNER/LAWYER`
- 그 외 **모든 문제를 찾고 잡을 것.** 감사는 운영·관리자에서 **읽기 전용**, 수정은 소스 코드에서 하고 배포 전 소유자 확인.
- **교재(아카이브)는 정답이 아니다.** 사람이 만든 것이라 틀릴 수 있음. 가장 상식적으로 맞는 방향으로 판단.
- 작업자 = 점검자 = Claude. 독립 검수 없음 → 숫자·목록·스크립트로 증거를 남길 것.

## 접근 수단

| 수단 | 상태 | 비고 |
|---|---|---|
| 감사용 Edge 프로필 `%TEMP%/kig-audit-licensed-profile` | 평생(LIFE) 이용권 등록됨 (소유자가 직접 입력) | 스크립트가 headless 로 재사용. **동시에 두 스크립트가 쓰면 실행 실패** (프로필 잠금) |
| 앱 내 브라우저 창 (tabId `seed`) | 평생 이용권 + 관리자 PIN 입력됨 (소유자) | 관리자 화면 **읽기만** |

## 단계 결과

| 단계 | 결과 | 산출물 |
|---|---|---|
| 1 인벤토리 | 완료 | `phase1-inventory.md` |
| 2 관리자 경로 | ADM-01 High (목록이 발급 브라우저 한정·검색 없음, 운영 확인) 외 6 | `phase2-admin.md` |
| 3 학습자 경험 | HTML·RSC 잠금 1,748/1,748 · LIFE 잠금 오표시 0 · **공개 JS 로 READING 유료 254지문 유출 (Critical, ISS-00)** | `phase3-learner.md`, `scripts/probe-entitlement-all.cjs` `probe-bundle-content.cjs` `probe-bundle-leak-scope.cjs` |
| 4 기능 | v2 스윕 3,496방문·13,898클릭·17,200스냅샷 오류 0 (v1 은 스크립트 결함으로 폐기) · 음성 3,228/3,233 · 플레이어는 CNN 외 합성음 재생 | `phase4-functional.md`, `scripts/sweep-licensed.cjs` `analyze-sweep.cjs` `scan-rendered.cjs` `audio-check.cjs` `probe-missing-audio.cjs` |
| 5 교육 내용 | GRAMMAR I 1,611 · GRAMMAR II 796 · STUDENT 87 · LISTENING 276회 · READING 1,446문장+카드 3,584 · VOCA 사전 3,877 **전부** — High 39 · Medium 189 · Low 123 | `content-review/*.md`, `*-status.md` |
| 6 UX·접근성 | UX-01 High 다크 모드 버튼 1.11:1 · UX-05 Medium 문장 점 버튼 1~5px · 전 레슨 넘침·라벨·대체텍스트 0 | `phase6-ux-a11y.md` |
| 7 성능 | 운영 측정 3조건 — PERF-01 Medium 이용권 학습자 탭마다 새로고침 (4G 4.4~4.9 s vs 2.0~3.0 s) | `phase7-performance.md`, `scripts/measure-perf.cjs` |
| 8 보안·개인정보·상업 | SEC-00 Critical(=ISS-00) · SEC-01 High 기간 재시작 · SEC-02 High iPhone 기기 칸 · 탐침 24/24 · COM-04 구매 링크 없음 (DEFERRED) | `phase8-security.md`, `scripts/probe-security.cjs` |
| 이슈 등록부 | Critical 1 (ISS-00) · High 16개 이슈 (ISS-01~16, ID 44건) · Medium·Low 묶음 | `issues.md`, `scripts/count-findings.cjs` |
| 최종 보고 | **NO-GO · 49/100** · 21항목 | `final-report.md` |

## 다음 단계 (소유자 확인 필요)

1. 수정 범위·순서 확인 — 최우선 ISS-00 (코드 한 곳), 이어서 `final-report.md` §20
2. 소유자 결정: ISS-12 이용권 만료 기준, ISS-15 구매처 URL, R-64·65 지문 교체, L-64 원문 누락 처리 방침, F-02 원본 녹음 사용 여부
3. 수정 후 `final-report.md` §19 재시험 → 커밋(파일 이름 지정) → 소유자가 `git push`

## 감사 중 바로잡은 판단 (기록)

- v1 스윕 폐기: 이동 판단·sessionStorage 삭제·선택자 오류 (스크립트 결함)
- 대비 스크립트 `lab()` 색 파싱 실패 → 캔버스 변환으로 재측정, 캡처로 눈 확인
- LX-03 철회 (GRAMMAR I "1~2강 무료" 문구는 맞음)
- L-64 High→Medium (플레이어가 원본 녹음을 틀지 않음)
- 공개 JS 검사를 처음엔 "비밀값 모양"만 해서 유출을 놓침 → 성능 수치(READING JS 2배)에서 발견해 전수 확인
- 성능 JSON `perf-4g-phone.json` 은 비교 측정이 덮어써 4G 전체는 `out/perf-4g.log` 로만 남음
