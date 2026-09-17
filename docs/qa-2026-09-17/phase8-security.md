# Phase 8 — 보안 · 개인정보 · 상업 준비 (운영 `c14c03d`, 2026-09-17)

작업자 = 점검자 = Claude. **공격 시도 없음** — 읽기 전용 호출과 소스 코드 읽기만.
보내지 않은 요청: `/api/license/activate`, `/api/license/deactivate`, `/api/admin/login` (기기 칸을 쓰거나 로그인 시도 횟수를 올림), 관리자 화면의 모든 실행 버튼.

## 1. 운영 측정 — `scripts/probe-security.cjs` → `out/security-probe.json`

**24 PASS / 0 FAIL** (2026-09-17 03:4x KST):

| 구분 | 확인한 것 | 결과 |
|---|---|---|
| 관리자·이용권 관리 API 8개 (쿠키 없이) | `license/status` GET·POST, `admin/generate`, `admin/student-progress`, `license/reset` `revoke` `unrevoke` `update-limit` | 모두 **401**, 응답에 이용권 데이터 없음 |
| 관리자 세션 확인 | 쿠키 없음 / 위조 Bearer 토큰 | `authenticated:false` |
| 학습자 API (이용권 없이) | `progress/student` GET·POST, `chapter-audio?chapter=2` | **401** |
| 무료 챕터 음성 | `chapter-audio?chapter=1` | 200, `access=free`, 무료 레슨 `s1-1,s1-2` 만 |
| 위조 토큰 검증 | `license/verify` 에 서명 없는 토큰 | **403 tampered**, 세션 쿠키 안 줌 |
| 보안 헤더 (HTML·API·오디오·사이트맵 6경로) | HSTS(2년, preload), `nosniff`, `Referrer-Policy`, CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Permissions-Policy` | 전부 있음. `X-Powered-By` 없음 |
| 브라우저에 내려가는 JS 15개(713 KB) | 비밀키 이름, 예전 노출 기본값, AWS 키 모양, 개인키, 발급 코드 모양 | **없음** |

## 2. 발견 사항

| ID | 심각도 | 문제 | 근거 (파일:줄) | 사용자·사업 영향 | 권장 | 확인 상태 |
|---|---|---|---|---|---|---|
| **SEC-00** | **Critical** | **READING 유료 지문 254개 전체(영어·한국어·어휘)가 공개 JS 청크에 포함** | `ReadingLearningView.tsx:13-14` → `readingUtils.ts:2-3` → `readingSentences.json`·`readingVocabulary.json`; 운영 청크 923 KB (무료 `/reading/pr001` 이 로드) | 이용권 없이 READING 전 과정 열람·복제 가능 | 클라이언트의 중앙 사본 조회 제거 | **운영 확인** — 쿠키 없이 받은 청크에서 영어 1,404/1,423·한국어 1,401/1,423문장, 카드 약 3,171/3,556장 (`out/bundle-leak-scope.json`). 다른 과정·검색 색인 0건. 1절 "JS 비밀값 없음" 검사는 비밀키 모양만 찾아서 이 유출을 못 잡았음 |
| **SEC-01** | **High** | **기간제 이용권(1개월·1년)이 코드를 다시 넣을 때마다 기간이 새로 시작됨** | `api/license/activate/route.ts:62-69` 가 매번 `calculateExpiry(plan, now)` 로 만료일 계산 → 새 토큰. 기기 기록(`deviceStorage.ts:255-305`)에는 최초 등록일·만료일이 없고, 이미 등록된 기기면 그대로 성공(`:280-286`) | 1개월권 구매자가 만료 뒤 같은 기기에서 코드를 다시 입력하면 30일 더 사용 → 사실상 무기한. 두 번째 기기를 늦게 등록해도 그 기기만 기간이 뒤로 밀림 | 첫 등록 시각(또는 발급 시각)을 기록에 저장하고 만료일은 그 기준으로 고정. **기존 구매자 기간이 바뀌므로 소유자 결정 필요** | 코드 확인. 재현하려면 소유자가 1M 테스트 코드 발급 필요 → **Read-only verification required** |
| **SEC-02** | **High (운영)** — ✅ 수정 (ISS-13, 배포 `e4cc125`) | **iPhone Safari 에서 7일 이상 안 쓰면 이용권·기기 ID 가 지워져, 다시 등록할 때 기기 칸을 하나 더 씀** | 이용권(`kig:license:v1`)과 기기 ID(`kig:device:id:v1`)를 localStorage 에만 둠 (`device.ts:22-30`, `LicenseProvider.tsx:104`). Safari ITP 는 사이트와 상호작용 없이 Safari 를 7일 쓰면 LocalStorage 를 삭제 — https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (2026-09-17 열람). 기기 제한 2대(`deviceStorage.ts:29`), 학습자가 스스로 옛 기기를 해제할 방법 없음(옛 기기 ID 가 사라짐) | 방학 뒤 돌아온 학습자가 두 번째 재등록부터 "최대 기기 수 초과" → 관리자 수동 초기화 필요. 문의·환불 요구로 이어질 위험 | 기기 ID 를 서버가 심는 httpOnly 쿠키에도 저장해 복원, 또는 초과 시 가장 오래된 기기를 교체하는 자가 해제(쿨다운 포함). 홈 화면 추가 안내 | 설계 확인 + 공식 문서. 실제 iPhone 7일 경과 시험은 **미실시** |
| SEC-03 | Medium — ✅ 수정 (verify 도 목록에 없는 기기 거부, 배포 `e4cc125`) | 관리자 "기기 초기화" 뒤 옛 기기의 화면이 이용권 있음으로 보이는데 유료 레슨은 잠김 | `api/license/verify/route.ts:75` 는 등록 기기 목록이 **비어 있으면** 기기 확인을 건너뛰고 `valid:true` + 쿠키를 줌. 서버 잠금(`licenseSession.ts:30-33`)은 목록에 없으면 거부 | 초기화 직후 옛 기기: 상단은 "이용권 활성", 레슨은 결제 안내 → 혼란 (접근이 새지는 않음) | `verify` 도 목록에 없으면 거부 (`licenseSession` 과 같은 규칙) | 코드 확인 |
| SEC-04 | Low — ✅ 수정 (서명 토큰 필요, 배포 `e4cc125`) | 기기 해제 API 가 토큰 없이 코드+기기 ID 만으로 동작 | `api/license/deactivate/route.ts:8-17` | 코드를 아는 사람이 다른 사람의 기기 ID 를 알면 해제 가능. 기기 ID 는 `Math.random` 7자리+시각(`device.ts:24`)이라 추측은 어려움 | 세션 쿠키의 기기와 같을 때만 해제 | 코드 확인 |
| SEC-05 | Medium — ✅ 수정·**배포·운영 확인** (`9706a83`, 소유자 결정 2026-09-17 "보안 설정 강화(SEC-05) 진행하자", 배포 지시 "배포해줘"). **운영 측정 (배포 42초 후 적용 확인):** `verify-csp-nonce.cjs --base https://k-ig-core.vercel.app` **69/69** — 페이지 24형태 정책 1개·모든 스크립트에 nonce·요청마다 다른 값, 오타·404 형태 전부 읽히는 404 (`/ld/x.html` 0자 → 665자), 파일·API·음성 14개 `script-src 'none'`, 헤드리스 23회 방문 위반 0, **운영 페이지에 넣은 nonce 없는 스크립트·onload 차단 (변경 전 운영에선 실행됨)**, 실제 페이지 표본 69개 전부 nonce. **속도 (운영):** 서버 응답 홈 29→325 ms, 목록 31→500 ms, 무료 레슨 118→494 ms, 유료 레슨 331→324 ms (변화 없음). 화면 표시(FCP) 데스크톱 홈 324→456 ms · 무료 레슨 428~444→800~832 ms, 4G 휴대폰은 전후 차이가 측정 오차 안(`out/perf-*-before-sec05.json` 대 `out/perf-*.json`). 느려진 주된 원인은 함수가 미국 동부에서 돈다는 것 → PERF-04. **페이지:** `src/proxy.ts` 가 요청마다 새 nonce 를 만들어 `script-src 'self' 'nonce-…' 'strict-dynamic'` 를 요청·응답 양쪽에 (개발 서버만 `'unsafe-eval'` 추가), `layout.tsx` 가 테마 스크립트에 nonce 전달. **파일·API·음원·이미지:** `next.config.ts` 가 `script-src 'none'`. 두 경로 집합은 겹치지 않게 설계 → 한 응답에 정책이 둘 붙지 않으므로 Vercel 이 헤더 둘 중 무엇을 택하는지와 무관. `style-src 'unsafe-inline'` 은 유지 (nonce 를 넣으면 인라인 style 전부 무효). **대가:** 미리 만들어 두던 페이지 137개(홈·목록·무료 레슨·리다이렉트·404)가 전부 요청마다 서버 렌더링. 그 결과 라우터의 1단 404 보호가 사라져 proxy 가 1단 경로와 점(.) 들어간 오타(`/index.html`, `/.env`, `/ld/x.html`)까지 판정하도록 확장 — `/ld/x.html` 은 원래 빈 404 였는데 이번에 읽히는 404 로. **알려진 틈:** 렌더링 밖에서 난 오류 때 나오는 Next 기본 정적 500 쪽은 nonce 없음 (그 쪽의 Reload 는 스크립트 없이 동작하는 form). **검증 (같은 에이전트가 작성·확인, 독립 검수 아님):** `verify-csp-nonce.cjs` **80/80** (로컬 운영 빌드: 모든 페이지 형태에 정책 1개·nonce 가 모든 `<script>` 에·요청마다 다른 nonce, 파일 53개 응답 변경 없음·`script-src 'none'`, 헤드리스 23회 방문 위반 0, **주입한 nonce 없는 인라인 스크립트·onload 차단** — 변경 전 빌드에선 둘 다 실행됨, 실제 페이지 1,759개 전부 200·nonce, 404 형태 11개 읽힘), `verify-csp-nonce-licensed.cjs` **10/10** (이용권으로 유료 레슨 7개 열고 재생·학습 단계 전부 클릭, 위반 0), 반박형 리뷰 2회 (지적 8건 + 8건, 모두 반영 — 1차 결과로 페이지·비페이지 정책을 겹치지 않게 재설계, 2차의 중간 2건은 `.segments/` 가 들어간 오타 주소에 정책이 아예 없던 틈과 운영 점검의 Range 판정; 요청 헤더 하나로 정책을 건너뛸 수 있게 되는 수정안은 채택하지 않음). **미확인:** 실제 iPhone Safari·카카오톡 인앱 브라우저 (헤드리스 Edge 로만 확인) | CSP 가 `script-src 'unsafe-inline'` 허용 | 운영 응답 헤더 (위 표) | XSS 가 생기면 CSP 가 막아 주지 못함 (현재 XSS 는 발견 못 함) | Next.js nonce 기반 CSP | 운영 측정 → 로컬 측정 (`out/csp-nonce-after.json`, 변경 전 `out/csp-nonce-baseline.json`, 운영 변경 전 `out/csp-nonce-baseline-prod.json`) |
| SEC-06 | Low — ✅ 수정 (배포 `de4cbcf`): 누구나 → `{ok}` 만, 자세한 상태는 관리자 세션, R2 확인은 인스턴스당 1분에 1번. `verify-sec06-sec07.cjs` | `/api/media-health` 가 누구에게나 저장소 자격 증명 설정 여부·조회 성공 여부를 알려 줌 | 응답 `{"credentialsConfigured":true,…}` | 비밀값은 없음. 운영 내부 상태 노출 | 관리자 세션 요구 또는 배포 후 제거 | 운영 측정 |
| SEC-07 | Low — ✅ 일부 수정 (배포 `de4cbcf`): 진도 저장 제한의 끝난 기록 정리 (601 → 1), 제한 120회/분은 그대로. `verify-sec06-sec07.cjs` 7/7. **관리자 로그인 제한은 손대지 않음** (소유자 지시: 관리자 비밀번호·2차 인증은 보고만). 인스턴스 간 공유 제한은 공유 저장소(Redis 등)가 없어 불가 — 진도 저장은 유효 이용권 세션이 있어야 닿음 | 요청 제한이 서버 인스턴스 메모리에만 있음 (관리자 로그인 5회/5분, 진도 저장 120회/분) 이고 오래된 항목을 지우지 않음 | `adminAuth.ts:116`, `progress/student/route.ts:10-21` | 서버리스 인스턴스가 여러 개면 제한이 나뉘어 약해짐. 스윕(창 8개, 같은 기기 ID) 중 진도 저장 **429** 19회 관측 — 실제 학습자 1명은 도달하기 어려움 | 공유 저장소(KV) 기반 제한 | 운영 관측 + 코드 |
| SEC-08 | Low (성능·UX) — ✅ 수정 (PERF-01, 배포 `e4cc125`) | 이용권 확인 후 탭마다 첫 유료 레슨에서 페이지를 한 번 새로고침 | `LicenseProvider.tsx:127-132` | 새 탭에서 레슨을 열 때마다 약 1초 뒤 화면이 한 번 다시 그려짐 (스윕 측정: 첫 방문 `reloads:1`, 같은 탭 두 번째 `0`) | 쿠키가 이미 유효하면 새로고침 생략 (서버가 쿠키 유무를 알려 주면 됨) | 운영 측정 |

## 3. 관리자 인증 — **보고만 (소유자 지시: 관리자 비밀번호·2차 인증은 고치지 않음)**

- 관리자는 PIN 하나로 로그인 (10자 이상, 상수 시간 비교) — 2차 인증 없음 → **DEFERRED — OWNER/LAWYER**.
- 로그인 제한은 IP(`x-forwarded-for` 첫 값) 기준 5회/5분, 인스턴스 메모리 (SEC-07).
- 세션 토큰 24시간, 서버 쪽 무효화 수단 없음 (로그아웃은 쿠키만 지움). `Authorization: Bearer` 로도 받음.
- 발급한 코드 최대 100개가 관리자 **브라우저 localStorage** `kig:admin:history` 에 평문 저장 (관리자 PC 를 다른 사람이 쓰면 보임).

## 4. 개인정보

- 계정·이메일·이름·전화번호를 받지 않음. 서버 저장: 이용권 코드의 SHA-256 을 이름으로 한 **AES-256-GCM 암호화** 기록(`deviceStorage.ts:79-125`) — 기기 ID, 기기 이름(운영체제·브라우저 종류 수준, `device.ts:45-`), 등록·최근 사용 시각; STUDENT 진도.
- 제3자 추적 스크립트 없음 (CSP `connect-src 'self'`, JS 청크 검사).
- 개인정보처리방침·이용약관·쿠키 안내 페이지 없음(`/privacy` `/terms` 404) → **DEFERRED — OWNER/LAWYER**.

## 5. 상업 준비 (결제창·환불 규정·법률 문구 제외)

- 사이트 안 결제 없음, 코드는 관리자가 발급 → **새 결제창 = DEFERRED — OWNER/LAWYER**.
- **SEC-01 처리 (2026-09-17):** 소유자 결정 "첫 등록일 기준 고정" 으로 로컬 수정 완료, 배포 `822ec46` — `issues.md` ISS-12, 검증 `scripts/verify-license-expiry.cjs` 14/14.
- **COM-04 (출시 차단 수준, DEFERRED — OWNER, 소유자: 변호사 상의 후 결정)**: 잠금 화면의 `🛒 구매 안내` 는 이용권 등록 창을 열 뿐이고, 창 안의 구매 링크는 운영에서 **"구매 링크 준비 중"** (링크 없음). 원인: 빌드 환경변수 `NEXT_PUBLIC_PURCHASE_URL` 미설정 (`LicenseModal.tsx:6-7,321-335`). 처음 온 방문자가 이용권을 살 방법이 사이트에 전혀 없음. 환경변수·구매처는 소유자 영역이라 고치지 않음. 확인: 새 프로필(이용권 없음) 모바일 폭으로 `/reading/pr100` 에서 버튼 클릭 → 창 텍스트 캡처, `이용권 구매하기` 링크 없음 (2026-09-17).
- 고객 문의 연락처가 사이트에 없음 (Phase 1) — SEC-02 같은 기기 문제의 해결 경로가 없음 → 문의 창구 표시 권장 (법률 문구가 아닌 운영 정보).
- **COM-05 (출시 차단 수준, OWNER — 요금제 결정, 2026-09-18 소유자 확인 "hobby야")**: 운영이 **Vercel Hobby(무료)** 요금제. 문서·약관은 2026-09-17 열람, 작성·확인은 같은 에이전트이고 대시보드는 보지 않음.
  - **약관:** Hobby 는 비상업·개인 용도 전용. "financial gain" 을 위한 배포는 상업적 사용 (https://vercel.com/docs/limits/fair-use-guidelines, 갱신 2026-07-29). 이 사이트는 유료 레슨을 잠그고 이용권을 판매(스마트스토어·크몽 발급·환불, `src/app/admin/license/page.tsx:308,472`) → 해당. Vercel 은 Hobby 프로젝트를 예고 없이 중지·삭제할 수 있고(이용약관 §4), 도움말은 "Hobby 의 상업적 사용" 을 중지 사유로 자주 든다고 명시 (https://vercel.com/kb/guide/why-is-my-account-deployment-blocked). 실제로 이 사이트에 조치할지·언제일지는 미확인. Hobby 에서는 배포 내용(유료 레슨 포함)을 Vercel AI 학습에 쓸 수 있음 (이용약관 §3, 유료 Pro 는 기본 꺼짐).
  - **사용량 한도 (월, 추가 구매 불가):** 함수 실행 100만 · Edge 요청 100만 · 함수 경유 전송(Fast Origin Transfer) 10 GB · Active CPU 4시간 · 메모리 360 GB-시간. 넘으면 **팀 전체가 멈추고** 자동 복구되지 않음 (사용자 보고: 몇 달 지속); Pro 로 올리면 풀림 (https://vercel.com/docs/plans/hobby, /docs/plans/pro-plan/trials). **SEC-05 이후 모든 페이지 방문과 링크 미리 가져오기가 함수 실행**이고, 음성은 브라우저가 Range 로 요청해 CDN 캐시가 안 됨 → 사용량이 더 빨리 참. 코드 기준 추정(미측정): 월 20레슨 학습자 1명 ≈ 함수 720회·12 MB → **활동 학습자 약 550~2,000명/월**에서 한도 (크롤러·둘러보기 방문·아이폰은 이 수를 줄임).
  - **권장:** Pro ($20/월 + 세금 가능, 좌석 1개·사용 크레딧 $20·CDN 100만 요청/1 TB 포함). 추정으로 학습자 약 1,300명까지 $20, 그 위 CDN 단계 $40. 올린 뒤 Settings > Billing > Spend Management 에서 금액과 "자동 중지 vs 알림만" 결정. 결제·요금제 변경은 소유자만 가능 — 코드 변경 없음.
  - **1분 확인:** Vercel > Usage > "Last 30 days" 에서 Function Invocations · Edge Requests · Fast Origin Transfer · Fluid Active CPU · Provisioned Memory 가 위 한도의 몇 % 인지.
