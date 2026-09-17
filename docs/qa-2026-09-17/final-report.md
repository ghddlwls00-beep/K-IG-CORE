# K-IG CORE 전체 출시 감사 — 최종 보고 (운영 `c14c03d`, 2026-09-17)

> 작업자 = 점검자 = Claude. **독립 검수 없음** — 판단마다 스크립트·운영 측정·캡처·데이터 인용을 남김 (`scripts/`, `out/`).
> 소유자 지시로 **법률 문서, 새 결제창·구매처, 관리자 2차 인증은 DEFERRED — OWNER/LAWYER** (수정하지 않음, 남은 위험으로만 적음).
> 이 감사 동안 **운영·관리자에서 아무것도 바꾸지 않았고 코드도 고치지 않았음** (읽기 전용). 수정은 소유자 확인 후 다음 단계.
> 집계(ID 기준, `scripts/count-findings.cjs`): **Critical 1 · High 44 · Medium 196 · Low 139**.

## 1. 한 문장 결론

사이트는 레슨 1,748개가 모든 폭·단계에서 오류 없이 동작하고 HTML 잠금도 정확하지만, **READING 유료 지문 254개 전부가 누구나 받는 공개 JS 파일에 들어 있고**, 유료 학습 내용 곳곳에 틀린 모범 답안·사실 오류·데이터 손상이 있으며, 구매·관리자·이용권 기간 운영 경로가 준비되지 않아 **지금 출시하면 안 된다.**

## 2. 판정

**NO-GO** — Critical 1건(ISS-00 유료 콘텐츠 유출) + High 44건. 명령 규칙: Critical 이 하나라도 있거나 유료 접근이 믿을 수 없으면 NO-GO.

## 3. 점수 — 49 / 100

| 영역 (배점) | 점수 | 근거 |
|---|---|---|
| 교육 내용 정확성 (20) | **6** | 레슨 FAIL: GRAMMAR I 46/53쌍 · GRAMMAR II 41/44 · STUDENT 71/87 · LISTENING 212/276 · READING 250/256 · VOCA 51/195. 내용 High 39건 |
| 유료 과정 무결성 (15) | **4** | HTML·RSC 잠금 1,748/1,748, 유료 원본 음성 비인가 403 3,187건 (+) / **READING 유료 254지문 공개 JS 유출(Critical)**, s19-3 문장 0, VOCA 퀴즈 오답 강요, 기간제 재입력 무기한 (−) |
| 핵심 기능 (20) | **15** | 3,496방문·13,898단계 클릭·17,200스냅샷 오류 0, 음성 3,228/3,233 (+) / 손상된 답안으로 채점 불가, VOCA 조회 불일치, 문장 점 버튼 1~5px (−) |
| 학습 UX (15) | **8** | 다크 모드 재생·주요 버튼 1.11:1, 탭마다 자동 새로고침(4G +2초), iPhone 7일 후 기기 칸 소모, STUDENT 청크 뒤섞임 |
| 접근성·반응형 (10) | **7** | 넘침·라벨·대체텍스트 0, 키보드 정상 (+) / 다크 모드 대비, 금색 작은 글자, 누를 수 없는 점 버튼 (−) |
| 성능 (10) | **6** | TTFB 16~39 ms, desktop LCP 0.19~0.94 s, 4G LCP 0.58~1.74 s (+) / 이용권 학습자 4G 4.4~4.9 s·느린 3G 8.6~10.4 s(새로고침), 목록 TBT 434 ms, READING JS 2배 (−) |
| 보안·개인정보 (5) | **2** | 관리 API 401·위조 토큰 403·헤더·기록 암호화 (+) / 공개 번들 유료 본문(Critical), CSP unsafe-inline, 메모리 요청 제한 (−) |
| 상업 준비 (5) | **1** | 구매 링크 없음(DEFERRED), 관리자 목록 브라우저 한정, 기간제 재시작, 문의처 없음, 약관·개인정보 없음(DEFERRED) |

## 4. 가장 중요한 이슈 10개

1. **ISS-00 (Critical)** READING 유료 254지문(영어 1,404·한국어 1,401문장·카드 약 3,171장)이 공개 JS 923 KB 에 포함 — `ReadingLearningView.tsx:13-14`
2. **ISS-14** 관리자 목록이 발급한 브라우저 기록만 표시·검색 없음 → 다른 PC 에서 환불 차단 불가 (운영 확인)
3. **ISS-12** 기간제 이용권 재입력 시 기간 재시작 → 사실상 무기한 (코드 확정)
4. **ISS-15** 구매 링크 없음 "구매 링크 준비 중" (DEFERRED — OWNER, 운영 확인)
5. **ISS-01·02** GRAMMAR I 부가의문문 모범 답안 오류·문제-답 어긋남·답안 빈칸 → 맞게 써도 0점
6. **ISS-05** STUDENT 광복 1948년·한글 1420년·분단 원인 오류
7. **ISS-09** READING 지문에 어휘 주석·시험 보기·발문·밑줄 기호·1904→7904 (화면 노출 확인)
8. **ISS-10** READING 어휘 카드 뜻 오류 213장·자리표시 69장·스크립트 페이지 옛 뜻 510장
9. **ISS-16** 다크 모드에서 재생·주요 버튼이 거의 안 보임 (26곳, 캡처)
10. **ISS-13** iPhone Safari 7일 미사용 → 이용권·기기 ID 삭제 → 재등록마다 기기 칸 소모

## 5. 출시 차단 이슈

`issues.md` ISS-00 (Critical) 과 ISS-01~16 (High, ID 기준 44건) 전부.
- 코드로 바로 고칠 것: ISS-00 (클라이언트 중앙 사본 조회 제거), ISS-11 (VOCA 조회), ISS-16 (`text-white`→`text-surface` 26곳), ISS-14 (서버 기록 목록·검색), ISS-13 (기기 ID 쿠키)
- 소유자 결정이 필요한 코드: ISS-12 (만료 기준 — 기존 구매자 기간 영향)
- 내용 수정 (영어 변경분 음성 재생성): ISS-01~10
- 소유자 영역: ISS-15

## 6. 유료 과정 문제

- **유출:** READING 유료 전부 공개 JS (ISS-00). 다른 과정 유료 문자열 1,801개 검사 0건, 검색 색인 0건 (`out/bundle-leak-scope.json`)
- 잠금: HTML·RSC 1,748/1,748 정확, LIFE 잠금 오표시 0, 유료 원본 음성 3,187 비인가 403 (`phase3-learner.md`, `phase4-functional.md`)
- 내용 FAIL: GRAMMAR I 46쌍 · GRAMMAR II 41쌍 · STUDENT 71 · LISTENING 212회 · READING 250지문 · VOCA 51레슨 (`content-review/*-status.md`, 표)
- 학습 불가 레슨: STUDENT s19-3 (받아쓰기 문장 0), LISTENING d109 #6 (문항 하나에 다음 회차 본문 10문장)
- 이용권: SEC-01 기간 재시작, SEC-02 iPhone 기기 칸, SEC-03 기기 초기화 후 화면·잠금 불일치, PERF-01 탭마다 새로고침

## 7. 공개(무료) 콘텐츠 문제

- 무료 `/reading/pr001` 이 **유료 전체를 싣는 청크를 내려받게 함** (ISS-00)
- GRAMMAR I 무료 gh1-006~009 FAIL (G1-01~05) · VOCA 무료 mv1-02 FAIL (`Miss` 퀴즈 뜻, V-01) · READING 무료 pr001·pr002 FAIL (R-03, R-04 비문) · VOCA mv1-01 · STUDENT s1-1·s1-2 · LISTENING d001·d002 PASS
- 잠금 화면·구매 안내에 구매 링크 없음 (ISS-15)
- CNN(폐지)이 공개 목록·사이트맵에 남음 (이전 감사 COM-03, 소유자 결정)
- 숨은 콘텐츠 폴더 8개는 운영 404 (24개 주소 확인)

## 8. 관리자 시스템

`phase2-admin.md`: ADM-01 High(브라우저 한정 목록·검색 없음, 운영 확인) · ADM-02 "내 기기에 등록 테스트"가 고객 기기 칸 차지 · ADM-03 기기 한도 드롭다운 즉시 저장 · ADM-04 STUDENT 수동 해금 드롭다운 즉시 저장 · ADM-05 81강 표기(실제 82) · ADM-06 메모가 관리자 브라우저에만 · ADM-07 새로고침마다 전 기록 조회. 과정·가격·회원 관리 기능 없음(NOT APPLICABLE). 관리자 인증 위험(단일 PIN 등)은 보고만 — DEFERRED.

## 9. 기능 버그

ISS-00 공개 번들 유출 · ISS-11 VOCA 퀴즈·드릴 소문자 조회 (`March`→행진하다, 대문자 50칸 제외) · V-04 드릴이 같은 뜻 짝을 불일치로 채점 · UX-05 문장 점 버튼 1~5px · SEC-03 기기 초기화 후 verify·잠금 불일치 · PERF-01 탭마다 새로고침 · F-01 죽은 음성 주소 5건(화면 영향 없음).
**스윕으로 찾은 동작 오류는 0건** (콘솔 오류·예외·HTTP 오류·잠금 오표시·넘침·렌더링 누수, 3,496방문·13,898클릭).

## 10. 교육 내용 오류

`content-review/` 6개 파일, **High 39 · Medium 189 · Low 123**. 대표: GRAMMAR 부가의문문·가정법·동명사 모범 답안 비문과 문제-답 어긋남, STUDENT 역사 사실(1945 광복, 1443 한글), READING 지문 손상과 사실(배니스터 1954, 재향군인병은 냉방 냉각탑, 마라톤, The Purloined Letter, 네덜란드 안락사법 2002), 어휘 뜻 오류(READING 213장, VOCA `apparently`), LISTENING 원문 문장 34개 누락(L-64 — 플레이어는 대본 합성음을 재생하므로 Medium으로 정정), 불쾌 표현(L-74·84), 정치·고정관념 지문(R-64·65), 중복 지문 8쌍. 사실 근거 URL·열람일은 각 표에.

## 11. 학습 설계 개선

- STUDENT 청크 연습을 각 레슨 문장에서 다시 만들고 일치율 100% 검사 (ISS-07)
- READING 어휘 카드를 지문 문장 기준으로 다시 작성 — 3장 이상 나오는 단어 324/328개가 레슨과 무관하게 같은 뜻인 구조를 바꿈 (단어별 일괄 치환 금지)
- VOCA 같은 뜻 짝(`classic/classical`, `confusing/confused`, `electric/electrical`)을 구별되게 (V-04)
- READING 지문 속 요약 선지·빈칸 기호를 걷어 내고 "요약 문제"로 분리 (R-70)
- 중복 지문 8쌍 교체 (R-01), 정치·고정관념 지문 교체 여부 결정 (R-64·65)
- 원본 녹음 3,187개를 쓸지 결정 — 지금은 CNN 외 합성음만 재생 (F-02)

## 12. UX · 접근성

`phase6-ux-a11y.md`: **UX-01 High** 다크 모드 버튼 1.11:1 (26곳) · UX-02 금색 작은 글자 1.98~3.32:1 · UX-03 `🔁` 이름 · UX-05 Medium 문장 점 버튼 · UX-06 17~21px 높이 조작 요소 · 키보드 이동·포커스 표시 정상(CNN 영상 제외) · 전 레슨 17,200 스냅샷 넘침·라벨·대체 텍스트 0.

## 13. 모바일

390 px 로 1,748개 레슨 전 단계 가로 넘침 0. 모바일 전용 문제: UX-05 문장 점 버튼(누를 수 없음), UX-06 작은 칩, UX-03 `🔁`, ISS-13 iPhone Safari 저장소, PERF-01 4G 에서 새로고침으로 최종 화면까지 4.4~4.9 s.

## 14. 성능 (운영 측정 — `phase7-performance.md`)

- TTFB 16~39 ms (모든 화면·조건)
- desktop LCP: 무료 레슨 188~400 ms, 유료 레슨 820~936 ms, CNN 1,256 ms (영상)
- 4G 휴대폰(9 Mbps·170 ms·CPU×4) LCP: 레슨 584~1,576 ms, 홈 876 ms, READING 목록 1,740 ms (TBT 434 ms)
- **새로고침 비용**(같은 무료 레슨, 4G, 요청부터 최종 LCP): 이용권 없음 2,045~2,978 ms → LIFE 4,361~4,932 ms
- 느린 3G: 홈 2,031 ms, 유료 레슨 8,599~10,396 ms (새로고침 포함)
- 전송량 250~300 KB, READING 레슨만 457 KB (JS 411 KB — ISS-00 과 같은 원인)
- CLS 최대 0.082 (desktop VOCA), 4G 0.001
- 이슈: PERF-01 Medium, PERF-02·03 Low

## 15. 보안 · 개인정보

`phase8-security.md`: **SEC-00 Critical** 공개 JS 유료 본문 · 운영 탐침 24/24 PASS (관리 API 401, 위조 토큰 403·쿠키 없음, 보안 헤더 6경로, 번들 비밀값 0) · SEC-01 High 기간 재시작 · SEC-02 High iPhone · SEC-03 Medium · SEC-04 Low 토큰 없이 기기 해제 · SEC-05 Medium CSP unsafe-inline · SEC-06 Low media-health 공개 · SEC-07 Low 메모리 요청 제한 · SEC-08(→PERF-01).
개인정보: 계정·이메일 없음, 서버 기록 AES-256-GCM, 제3자 추적 없음, 관리자 브라우저에 발급 코드·메모 평문. 관리자 2FA·개인정보처리방침 → DEFERRED.

## 16. 상업·운영 위험

READING 전 과정 무료 열람·복제 가능(ISS-00) · 구매 링크 없음(ISS-15, DEFERRED) · 관리자 목록 브라우저 한정으로 환불 차단 불가(ISS-14) · 기간제 무기한화(ISS-12) · iPhone 기기 칸 소모로 문의 증가(ISS-13) · 고객 문의처 없음 · 약관·개인정보·환불 페이지 없음(DEFERRED) · 현대 저작물 발췌(Russell·Auster·Adler·Diamond·Fulghum — DEFERRED LAWYER) · 정치 지문 평판 위험(R-64) · 사용 안 하는 원본 녹음 저장 비용(F-02).

## 17. 시험하지 못한 영역

| 영역 | 이유 | 상태 |
|---|---|---|
| 실제 iPhone Safari·Android Chrome·카카오톡 인앱 브라우저 | 실기기 필요 | BLOCKED |
| 마이크 발음 평가 3종 | 실제 음성 입력 필요 | BLOCKED |
| 진도·완료·북마크 저장, 이용권 등록·해제, 관리자 실행 버튼 | 운영 데이터 변경 | Read-only verification required |
| 기간제 이용권 만료·재등록 (SEC-01 재현) | 소유자 1M 테스트 코드 필요 | Read-only verification required |
| iPhone 7일 저장소 삭제 (SEC-02 재현) | 실기기·7일 | BLOCKED |
| UI 언어 en·ja·zh | 한국어 UI 로만 스윕 | 미시험 |
| 브라우저 뒤로·앞으로 가기 | 직접 주소 로드만 | 미시험 |
| 결제 | 사이트에 결제 없음 | NOT APPLICABLE / DEFERRED |
| CNN 내용 | 폐지 과정 (소유자 규칙) | NOT APPLICABLE — 노출·기능만 (240방문 오류 0) |

## 18. 커버리지 통계

| 단계 | 대상 | 검사함 | 방법 | 결과 |
|---|---|---|---|---|
| 1 인벤토리 | 공개 라우트, 레슨 1,748, API 16, 관리자 기능, 숨은 폴더 8 | 전부 | 소스·운영 | `phase1-inventory.md` |
| 2 관리자 경로 | 관리자 화면 기능 전부 | 전부 (읽기) | DOM·소스 | ADM 7 |
| 3 학습자 경험 | 레슨 1,748 무이용권 GET · LIFE 3,496방문 · 공개 JS (13화면 청크) | 전부 | 스크립트 | HTML·RSC 잠금 1,748/1,748, **공개 JS READING 유출** |
| 4 기능 | 레슨 1,748 × 2폭 × 전 단계 · 음성 참조 3,233 · 플레이어 재생 7레슨 | 3,496방문·13,898클릭·17,200스냅샷 · 3,233 · 7 | CDP 스윕 | 동작 오류 0, 음성 실패 5(영향 없음) |
| 5 교육 내용 | GRAMMAR I 1,611문항 · GRAMMAR II 796 · STUDENT 87파일 · LISTENING 276회 2,218쌍+녹음 대조 · READING 1,446문장 · READING 카드 3,584 · VOCA 사전 3,877·단어칸 5,831 | **전부 한 항목씩** | 덤프·읽기·기계 검사 | High 39 · Medium 189 · Low 123 |
| 6 UX·접근성 | 템플릿 9화면 × 2폭 × 2테마, 작은 조작 요소 6화면 전 단계, 전 레슨 스윕 지표 | 전부 | 스크립트·캡처 | UX 6 |
| 7 성능 | 15화면 × desktop·4G × 3회 · 느린 3G 4화면 × 3회 · 새로고침 비교 3화면 × 2 × 3회 | 전부 | Performance API | PERF 3 |
| 8 보안·개인정보·상업 | API 16, 헤더 6경로, JS 15청크 비밀값, 공개 JS 유료 문자열 8,203개(READING 6,402 + 다른 과정 1,801), 소스 | 전부 (읽기) | 탐침·소스 | SEC 9, COM-04 |

**0 커버리지 확인:** 인벤토리의 7개 과정·1,748개 레슨·16개 API·관리자 기능이 위 표의 한 칸 이상에 있음. 검사하지 않은 것은 §17 에만 있음.
**감사 과정에서 바로잡은 내 판단:** v1 스윕 폐기(스크립트 결함), 대비 스크립트 색 파싱 수정 후 재측정, LX-03 철회(GRAMMAR I "1~2강" 문구는 맞음), L-64 High→Medium, 공개 JS 는 처음 "비밀값 모양"만 검사해 유출을 놓쳤다가 성능 수치(READING JS 2배)를 보고 추가 검사로 발견.

## 19. 최종 재시험 체크리스트 (수정 후)

1. `next build` 후 `.next/static` 전체에서 유료 READING 문장 0건 → 배포 후 `probe-bundle-content.cjs`·`probe-bundle-leak-scope.cjs` READING 0
2. `dump-grammar.cjs` 재덤프 → G1·G2 상세 표 위치 재대조, 채점 스크립트에 수정 문항 기대값
3. `dump-student.cjs` + 청크 일치율 100%, s19-3 문장 > 0
4. `check-listening-coverage.cjs` (L-64 목표치 소유자와 합의), d109 #6 한 문장
5. `dump-reading.cjs` → 주석·보기 기호 0, EN=KO 행, R-00 불일치 0 / `dump-reading-vocab-context.cjs` → 자리표시 0
6. `dump-voca.cjs` → card≠quiz 0, dropped 0, 같은 뜻 짝 0
7. 영어 변경분 `generate-azure-ava.mjs` → `upload-azure-ava-r2.mjs --dry-run` pending 0
8. `a11y-templates.cjs` 다크 모드 재생 버튼 4.5:1 이상, `a11y-shots.cjs` 재촬영, `small-targets.cjs` 문장 점 24px
9. `sweep-licensed.cjs --suffix -v3` → `analyze-sweep.cjs` 오류 0, `scan-rendered.cjs` 결함 패턴 0
10. `probe-entitlement-all.cjs` 1,748/1,748, `probe-security.cjs` 24/24, `measure-perf.cjs` 새로고침 비교에서 LIFE ≈ 무이용권
11. 소유자 1분 확인: 새 브라우저 관리자 로그인 시 기존 코드 목록(ISS-14), 1M 테스트 코드 재입력 시 만료일 불변(ISS-12), iPhone 다크 모드에서 재생 버튼 보임(ISS-16)

## 20. 우선 조치 10개

1. **READING 공개 번들 유출 차단** — 클라이언트의 `readingUtils` 중앙 사본 조회 제거 (ISS-00)
2. 관리자 목록을 서버 기록 + 코드 검색으로 (ISS-14)
3. 이용권 만료를 최초 등록 기준으로 고정 (ISS-12, **소유자 결정 후**)
4. 구매처 URL 결정·설정 (ISS-15, **소유자**)
5. 다크 모드 버튼 26곳 (ISS-16) · VOCA 퀴즈 조회 통일 (ISS-11)
6. GRAMMAR I·II 모범 답안·손상 문항 수정 + 음성 재생성 (ISS-01~04)
7. STUDENT 사실·문법 오류, s19-3, 청크 재생성 (ISS-05~07)
8. READING 지문 손상 복원 + 어휘 카드 뜻 재작성 (ISS-09·10)
9. 기기 ID 를 httpOnly 쿠키로 복원 (ISS-13) · 유효한 쿠키면 새로고침 생략 (PERF-01)
10. LISTENING d109 수정·원문 누락 처리 방침, 불쾌 표현·정치 지문 교체 결정 (ISS-08, L-64, R-64·65)

## 21. 증거 파일

`README.md`(체크포인트) · `issues.md` · `phase1-inventory.md` `phase2-admin.md` `phase3-learner.md` `phase4-functional.md` `phase6-ux-a11y.md` `phase7-performance.md` `phase8-security.md` · `content-review/*.md` · `scripts/*.cjs` · `out/`(git 제외 원자료: 스윕·렌더링·성능·음성·보안·잠금·번들 JSON, 캡처 PNG).
