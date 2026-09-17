# Phase 3 — 학습자 경험 (운영, 2026-09-17)

작업자 = 점검자 = Claude.

## 3-1. 이용권 없는 방문자 — 레슨 1,748개 전부 (`scripts/probe-entitlement-all.cjs` → `out/entitlement-all.json`)

쿠키 없이 모든 레슨 주소를 GET. 유료는 서버가 그린 잠금 화면(`ALL-PASS ONLY` / `STUDENT PASS ONLY`)이 있고 **그 레슨 데이터 파일의 문장·단어가 HTML 에 하나도 없어야** PASS, 무료는 잠금 없이 본문이 있어야 PASS.

| 과정 | 무료 | 유료 | 결과 |
|---|---|---|---|
| READING | 4 | 508 | 512 PASS |
| LISTENING | 4 | 548 | 552 PASS |
| GRAMMAR I | 12 | 182 | 194 PASS (본문 문자열을 못 뽑은 2개는 잠금 표시로만 판정) |
| GRAMMAR II | 4 | 84 | 88 PASS |
| STUDENT | 2 | 85 | 87 PASS |
| VOCA | 2 | 193 | 193 PASS + **2개 오탐 확인 후 PASS** — hv-46·mv3-21 의 단어 `pronunciation` 이 모든 페이지에 들어 있는 과정 소개 문구 "vocabulary matrix with pronunciation clinic" 에서 잡힘 (hv-48 에도 같은 2회, 잠금 화면 크기 동일 30.6 KB). 단어 1개짜리 칸이라 문자열을 못 뽑은 23개는 잠금 표시로만 판정 |
| CNN (폐지 과정, 노출만) | 2 | 118 | 120 PASS |
| **합계** | **30** | **1,718** | **1,748 / 1,748** |

같은 방식의 과정별 표본(HTML + RSC 응답 둘 다, `scripts/probe-entitlement.cjs`): 14/14 PASS. 유료 오디오 `audio/ld/d150.mp3` 쿠키 없이 **403**, 무료 `d001.mp3` 206.

잠금 화면 문구 확인 (READING pr100): "공식 판매처에서 발급받으신 인증 코드를 등록하시면 모든 유료 레슨을 제한 없이…", 버튼 `🔑 이용권 코드 등록` `🛒 구매 안내`, "1~2강은 무료로 상시 체험 가능합니다" — 무료 목록(`license.ts` FREE_PREVIEW_LESSON_IDS)과 일치 (GRAMMAR I 은 목록 순서상 gh1-006 = 1강, gh1-008 = 2강, 007·009 는 답안 쪽이라 일치 — `content/courses/grammar1.json`; STUDENT 잠금 화면은 `STUDENT PASS ONLY`).

## 3-2. 평생(LIFE) 이용권 — 레슨 1,748개 × 데스크톱·모바일 × 모든 단계

`scripts/sweep-licensed.cjs --suffix -v2` 완료 (상세 `phase4-functional.md` §4-1): 3,496 방문 중 3,302 정상 로딩 + 194 GRAMMAR I 설계상 이동, **LIFE 이용권에 잠금 화면이 뜬 레슨 0**, 단계 클릭 13,898회 동안 오류 0. 모든 방문이 주소 직접 입력(= 새로고침과 같은 전체 로드)이라 직접 URL·새로고침 복원은 전 레슨 확인됨. 뒤로 가기(브라우저 기록 이동)는 시험 안 함.

## 3-3. 발견 사항

| ID | 심각도 | 문제 | 근거 | 확인 |
|---|---|---|---|---|
| LX-01 | Low | 새 탭에서 처음 여는 유료 레슨이 약 1초 뒤 한 번 새로고침됨 | SEC-08 과 같음 | 운영 측정 |
| LX-02 | High | iPhone Safari 7일 미사용 → 이용권·기기 ID 삭제 → 재등록마다 기기 칸 소모 | SEC-02 | 설계 + WebKit 문서 |

## 3-4. 시험하지 않은 것 (이유)

- **진도·완료 저장**: 누르면 운영 데이터(감사용 LIFE 코드의 STUDENT 진도)가 바뀜 → **Read-only verification required**. 서버 코드(`api/progress/student`)와 관리자 조회로만 확인.
- **이용권 등록·해제 흐름**: 기기 칸을 씀 → 소유자 테스트 코드 필요 → **Unable to test**.
- **실제 결제**: 사이트 안 결제 없음 → NOT APPLICABLE (새 결제창은 DEFERRED — OWNER/LAWYER).
