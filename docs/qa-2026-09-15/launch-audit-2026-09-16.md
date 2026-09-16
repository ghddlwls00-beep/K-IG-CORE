# 출시 감사 (2026-09-16) 대응 — 최종 검증 기록 (2026-09-17)

> 원본: 외부 감사 보고서 "K-IG CORE 출시 감사" (Critical 5 · High 8 · Medium 14 · Low 10).
> 이 문서는 그 37건과 이번 점검에서 새로 찾은 7건을 **운영 사이트 · 코드 · 실제 브라우저**에서
> 하나씩 다시 확인한 결과와, 무엇을 고쳤고 무엇을 왜 안 고쳤는지의 최종 기록입니다.
>
> **아무것도 커밋·배포하지 않았습니다.** 운영(`k-ig-core.vercel.app`)에는 아래 수정이 아직 없습니다.
> 단, RE-006(모바일 무음 준비 클립 CSP)은 다른 세션이 `fa80c93` 으로 배포했습니다 (§4).

## 0. 이번 점검의 제약 (소유자 지시, 2026-09-17)

다음은 **수정하지도 결정하지도 않았습니다** → `DEFERRED — OWNER AND LEGAL REVIEW`

결제·구매 수단 · 가격·구독·상품 구조·결제사 · 환불 · 푸터 법적 문구 · 개인정보처리방침·약관·면책 등 법률 문서 ·
CNN 과정의 저작권·상표·사용 결정 · **교재 문구를 유지할지 고칠지의 최종 결정** · 관리자 비밀번호 · 2단계 인증 ·
인증 공급자 · Vercel 인증/접근 제어 · 환경변수 · 관리자 보안 설정 · 로그인 정책

이 제약에 따라 **직전 세션에서 내가 만들었던 미커밋 변경 중 둘을 되돌렸습니다**:

| 되돌린 것 | 이유 |
|---|---|
| 교재 문구 13파일 — `girl friend`→`girlfriend`, 마침표 추가, `will`/`study` 대안 정답 추가, `모친의의`·`위스컨신`·`11살 입니다` 교정 | 교재 문구 결정은 소유자 몫. 전 파일 HEAD 와 동일 확인. 대신 **채점기**가 `girlfriend`(띄어쓰기 차이)와 `cannot` 을 정답 처리 |
| 관리자 로그인 시도 제한을 R2 에 저장하던 변경 (`adminAuth.ts`, `api/admin/login/route.ts`) | 로그인 정책 = 소유자 몫. 두 파일 HEAD 와 동일(줄바꿈만 다름) |

## 1. 검증 결과 한눈에

| 확인 | 명령 / 방법 | 운영 (수정 전) | 로컬 운영 빌드 (수정 후) |
|---|---|---|---|
| 감사 재현 하네스 (실제 브라우저) | `verify/verify-launch-audit.cjs <base>` | **3 PASS · 36 FAIL** · 6 INFO | **43 PASS · 0 FAIL** · 7 INFO |
| 접근 가능 페이지 전수 (47쪽 × 데스크톱/모바일 × 모든 Step) | `verify/sweep-inventory.cjs` | — | **334 / 334** (콘솔·네트워크 오류 0, 가로 넘침 0, 레이블 없는 입력 0) |
| 잠긴 레슨 전수 (1,718쪽 × 2) | `sweep-inventory.cjs --locked` | — | **3,436 / 3,436** (페이월·noindex·오류 0) |
| 실제 경로 전수 | `verify-proxy-allowlist.cjs` | — | **1,755 / 1,755** |
| 유료 음성 게이트 | `verify-speech-gate.cjs` | 잠긴 클립 206 | **9/9** (6개 과정 24/24 → 403) |
| 게이트 판정 (이용권 포함) | `verify-speech-gate-rules.cjs` | — | **13/13** |
| 우회 시도 16종 (HEAD·캐시버스터·인코딩 슬래시·대문자·`..`·/video·r2.dev·chapter API) | 스크래치 프로브 | 잠긴 클립 206 | 전부 **403** (r2.dev 401) |
| 채점 | `verify-grammar-grading.cjs` | — | **36/36** |
| 받아쓰기 대안·오답 타일 | `verify-dictation-alternatives.cjs` | — | **11/11** |
| RE-004 미디어 | `verify-media-access.cjs` | — | **24/24** |
| 사이트맵 · 메타 · 404 · h1 · 퀴즈 플래그 | 기존 프로브 5종 | — | 전부 통과 (6/6, —, 7/7+11/11, —, 3/3) |
| 느린 모바일 홈 LCP (390px, 400kbps, CPU×4, 3회 중앙값) | `measure-home-lcp.cjs` | **14,696 ms**, 사진 267 KB | **2,288 ms**, 사진 122 KB |
| 음성 클립 | `generate-azure-ava.mjs --dry-run` | — | 버킷 44,684, pending **0** |
| 타입 · 빌드 | `tsc --noEmit` · `next build` | — | 오류 0 · 1,779쪽 성공 |
| 린트 | `eslint src scripts` | 5 errors (기존) | 5 errors — **전부 기존**, 이번 변경 0 |

**독립 검수**: 다른 모델의 별도 에이전트가 이 대화의 추론을 보지 않고 전체 diff 를 검토했습니다.
확인된 지적 5건 + 제약 지적 1건을 전부 반영했습니다 (§5).

⚠️ **이 변경은 WorkBuddy 의 검수를 받지 않습니다** (소유자 결정, 2026-09-17).
그래서 이 작업의 확인 근거는 위의 독립 에이전트 검수 1회, 위 표의 스크립트 수치,
그리고 배포 후 운영에서 다시 잰 값(§6 마지막 줄)뿐입니다. 배포 후 운영 재측정을 건너뛰지 마세요.

## 2. 이슈 레지스터

표기: **운영** = 2026-09-17 `k-ig-core.vercel.app` 에서 실제 관측. **로컬** = 수정 빌드에서 관측.
증거 파일은 `scripts/out/launch-audit-{production,local}.json`, `inventory-{accessible,locked}.json` (gitignore).

### Critical

**SEC-01 · 보안 · 유료 원문이 공개 저장소에서 내려받아짐** — `BLOCKED (소유자 계정 조치)`
- 위치: GitHub `ghddlwls00-beep/K-IG-CORE` (visibility), `content/`
- 재현: 비로그인 GET `raw.githubusercontent.com/.../content/lessons/student/s20-5.json`
- 기대 404 / 실제: **200, 5,990 B**; API `visibility: public`
- 원인: 앱 저장소가 Public 이고 레슨 JSON 이 커밋됨
- 사용자·사업 영향: 유료 상품 텍스트 전체가 무료로 복제 가능
- 해결: 저장소 Private 전환(`gh repo edit ghddlwls00-beep/K-IG-CORE --visibility private`) — 계정 설정이라 소유자 조치. 이미 복제됐다고 가정할지 결정 필요
- 수용 기준: 로그아웃 상태 raw URL 404
- 참고: SEC-02 수정은 저장소 공개 여부와 무관하게 음성을 막음

**SEC-02 · 보안 · 잠긴 레슨의 음성 클립이 이용권 없이 제공됨** — `FIXED AND VERIFIED` (로컬, 배포 전)
- 위치: `src/lib/mediaAccess.ts` (`azure-ava` 무조건 허용), 그리고 **git 에 추적된 정적 클립 2개**
- 재현: 잠긴 레슨 문장 → `unifiedSpeechKey()` → `/audio/azure-ava/v1/<key>.mp3` Range 요청
- 기대 403 / 실제(운영): s20-5·gh2-030·pr050 **18/18 → 206**, `public, max-age=31536000, immutable`
- 원인 ①: "해시는 문장을 알아야 추측 가능" 이라는 전제 — 문장(SEC-01)과 해시 함수가 모두 공개
- 원인 ② (이번에 새로 찾음): `public/audio/azure-ava/v1/b-5e89d9dbb8adad0b.mp3` ("I am a boy.", **잠긴 gh1-023**) 가 git 에 추적돼 Vercel 이 **정적 파일로 게이트보다 먼저** 제공 — 운영 206
- 해결: ① 빌드 때 무료 레슨이 말하는 클립 키 목록(`scripts/buildFreeSpeechKeys.mjs` → `src/lib/generated/freeSpeechKeys.json`, 533개, `prebuild` 연결)을 만들고, 그 밖의 클립은 이용권 세션이 있을 때만 `private` 으로 제공 ② 추적된 클립 2개를 `public/audio` 에서 제거 (R2 에 동일 크기로 존재 확인 → 라우트로 제공됨)
- 수용 기준: 잠긴 문장 키 403·공유 캐시 불가, 무료 문장 키 200/206, 우회 경로 전부 403
- 증거(로컬): speech-gate 9/9 · 판정 13/13 · 우회 16종 403 · `b-5e89…` 403 · `b-bd8f…`("I was poor.", 무료) 206 · gh1-008 실제 재생 206

**COM-01 · 상업 · 구매 경로·가격 없음** — `DEFERRED — OWNER AND LEGAL REVIEW`
- 운영: 모달 "구매 링크 준비 중", `/pricing` **404**. 판매 채널·가격 결정 필요 (`NEXT_PUBLIC_PURCHASE_URL`)

**COM-02 · 상업/법률 · 약관·개인정보처리방침·환불·사업자 정보·문의 없음** — `DEFERRED — OWNER AND LEGAL REVIEW`
- 운영: `/terms` `/privacy` `/refund` **404**, 푸터 없음

**COM-03 · 상업 · 폐지된 CNN 과정 노출** — `DEFERRED — OWNER AND LEGAL REVIEW`
- 운영: 사이트맵 CNN URL 4, 검색 CNN 120건, `/cnn` 200. 노출 제거 여부와 방송 저작권은 소유자 결정. CNN 은 손대지 않음

### High

**CNT-01 · 학습 · s1-1 "(sir/ma'am)" 받아쓰기** — `FIXED AND VERIFIED`
- 위치: `/student/s1-1` Step 2 · `src/lib/listeningUtils.ts generateWordBank`
- 재현: sir 단독 / ma'am 단독 / 둘 다 → 정답 확인
- 기대: 단독 정답, 둘 다 오답 / 운영: **sir=오답 ma'am=오답 both=정답**
- 원인: `A/B` 를 두 토큰 모두 필수로 분해
- 해결: `expandSlashAlternatives` — 대명사 슬래시는 성별로 일치(he↔him, she↔her), 나머지 슬래시는 독립 조합. 텍스트는 바꾸지 않음
- 로컬: sir=정답 ma'am=정답 both=오답. STUDENT 슬래시 문장 전부 모든 형태가 타일로 조립 가능, s6-3 #7 "He … him" 정답(검수 지적 반영)

**CNT-02 · 학습 · GRAMMAR 자동 채점** — `FIXED AND VERIFIED`
- 위치: `GrammarLearningView.tsx` → 새 `src/lib/grammarGrading.ts`
- 운영: `I'm Korean.` **0점**, `I will`(모범 I'll) **70점**, `…into a banana.` **70점**
- 원인: 아포스트로피만 지우고 축약형 전개 없음 · 단어 70% 겹치면 부분 점수
- 해결: 축약형을 양쪽에서 전개(원문 표기로도 한 번 더 비교해 오타 보존) · 내용어를 엉뚱한 단어로 바꾸면 0점(오타·기능어 실수는 부분 점수 유지) · 띄어쓰기만 다른 합성어 동일 처리(`maybe/may be` 처럼 뜻이 바뀌는 것은 부분 점수)
- 로컬: 100 / 100 / **0**. 코퍼스 2,750 모범답안에 오타 1개씩 → 부분 점수 유지 2,707, 오답 1 (3단어 문장, 이전 채점기도 오답)
- ⚠️ 알려진 대가: 교재 답안에 없는 **올바른 동의어**는 0점 — 답안 키 보강은 소유자 결정 (아래 CNT-03 의 두 문항은 결정됨)

**CNT-03 · 학습 · 모범 답안 표기** — `FIXED AND VERIFIED` (소유자 결정 2026-09-17)
- 운영: `girlfriend` **0점**, `cannot` **70점**, `will`(키 would) 70점, `study`(키 work) 70점
- 원인: 교재 원문 그대로의 답안 키 (아카이브 대조상 불일치 없음 = 교재 표기)
- 해결(채점): `cannot`=`can not`, `girlfriend`=`girl friend`, 마침표 무시 → **100점**
- 소유자 결정: gh2-007 Q3 `work`→`study` (한글 문제 "공부하지"), gh2-008 Q2 `would`→`will` (한글 "할 것이다") — **모범 답안 교체**, 클립 2개 생성·업로드 (버킷 44,686, pending 0). gh1-009 #3 마침표·#25 `girl friend` 는 **교재 표기 유지** (채점으로 해결)
- 로컬: `study` 100점, `will` 100점 (`verify-grammar-grading.cjs` 36/36). 교재 원래 답 `work` 는 이제 0점

**CNT-04 · 학습 · VOCA "Miss" 뜻** — `FIXED AND VERIFIED`
- 위치: `/phonics/mv1-02` · `src/lib/content.ts getVocaDictionaryForWords`
- 운영: `Miss 그리워하다; 놓치다` / 로컬: `Miss ~양 (미혼 여성의 경칭)`
- 원인: 사전에 `Miss` 항목이 **있는데** 소문자 `miss` 를 먼저 조회 (데이터 아닌 조회 버그). 같은 수정으로 mv2 `March`·`May` 도 올바른 뜻

**CNT-05 · 학습 · READING pr002 비문 / pr001 논리 모순** — `DEFERRED — OWNER AND LEGAL REVIEW`
- 교재 원문 그대로 (아카이브 불일치 없음). 고치면 원본 녹음과도 어긋남

**CNT-06 · 학습 · READING 핵심 어휘 카드 품사·뜻** — pr001/pr002 `FIXED AND VERIFIED` / 나머지 254개 레슨 **미해결**
- 위치: `content/lessons/reading/pr001(-1).json`, `pr002(-1).json` `readingVocabulary` (교재 밖 생성 데이터 — 교재 문구 아님)
- 운영: `differently adv. 다른`, `prefer n.`, `successful n. 성공하다`, `poorer n. 가난한`, `cleaner n.`, `private v. 비공개`, `soon n.` …
- 해결: 카드 품사·뜻 교정 (한글만 바뀌어 영어 음성 영향 없음). 근거: Wiktionary — differently=Adverb "In a different way", prefer=Verb, successful=Adjective, continued=Adjective, poorer=comparative of poor, cleaner=Adjective comparative of clean, private=Adjective "belonging to … not the state", speaking=Noun, soon=Adverb, dirty=Adjective
- 로컬: `poorer 더 나쁜, 더 열악한 (poor의 비교급) adj.`
- 🔴 **미해결 — 같은 결함이 유료 레슨 전반에 있음** (전수 스캔, 3,584장): 뜻은 동사(`-하다`)인데 `n.` **282장**, 뜻은 형용사(`-한/-적인`)인데 `n.` **134장**, 비교급·부사 뜻 불일치 44장. 카드별 판단이 필요해 일괄 수정하지 않음

**CNT-07 · 문구 · 근거 없는 기능·과학 주장** — `FIXED AND VERIFIED` (법률 측면은 DEFERRED)
- 운영: VOCA `뇌과학, AI 발음` · LISTENING `AI가, 대원칙, 뇌 청각, 뇌 트레이닝` · READING `하버드, Evelyn`
- 원인: 채점은 인식 문장의 단어 일치도인데 "억양·연음 채점" 으로 표시
- 해결: 실제 동작만 서술 ("말한 문장을 인식해 원문과의 단어 일치도를 점수로 보여줍니다" 등)
- 로컬: 세 과정 모두 **0건**. 표시광고법·상표 판단은 소유자·법률 검토

**PRV-01 · 개인정보 · 마이크 음성 처리 고지 없음** — `DEFERRED — OWNER AND LEGAL REVIEW`
- 코드상 `window.SpeechRecognition` 사용(브라우저 벤더 서버 처리 가능). 고지·동의 문구는 법률 검토 대상

### Medium

**CNT-08 · "준비 중입니다" 자리표시자** — `FIXED AND VERIFIED`
- 운영: LD Step 1 표시 / 로컬: LD·READING **0건** (생성 문항 꺼진 동안 제목·안내 모두 숨김, 플래그 켜면 복원 — `verify-quiz-flag` 3/3)

**CNT-09 · VOCA 어원 템플릿 문장** — `FIXED AND VERIFIED`
- 운영: 모든 단어 "발음 음소 규칙: 영문 철자 […]" / 로컬: 저자가 쓴 48개 어원만 표시, 나머지 카드 숨김 (접두사 추측 `under=un+der` 도 제거)

**CNT-10 · 약한 오답 보기** — `FIXED AND VERIFIED`
- 운영: pr002 클로즈 보기가 pr001 단어(`communication/respect/problems`) / 로컬: 같은 지문 단어
- VOCA 한→영 오답 보기 (mv1-02, 20회 생성): 4종·상위 3개가 98% → **30종·최다 5.7%**

**CNT-11 · 한국어 번역 직역·오자** — `DEFERRED — OWNER AND LEGAL REVIEW`
- `모친의의`, `위스컨신`, `11살 입니다`, `한 집에서` 등 모두 교재 한국어. 직전 세션의 교정은 되돌림

**CNT-12 · s1-2 `한국Apartment` · 11살/4학년** — `DEFERRED — OWNER AND LEGAL REVIEW` (교재 예문)

**FUN-01 · STUDENT 받아쓰기 진행이 새로고침에 사라짐** — `FIXED AND VERIFIED`
- 운영: `(1/3)` → 새로고침 → `(0/3)` / 로컬: `(1/3)` 유지, 레슨 간 이동에도 레슨별로 보존

**FUN-02 · 완료 기준 없음 / 시작 전 "완료!" 배너** — `FIXED AND VERIFIED`
- 운영: 연습 0회로 완료 가능, LD Step 5 0/6 에서 배너 / 로컬: 완료 버튼 비활성→낭독 체크 1개 후 활성, 배너 없음(받아쓰기 전부 완료 시 표시)
- ⚠️ 이번 점검에서 잡은 **회귀**: 직전 세션의 완료 조건이 문장이 0개인 `s19-3` 을 영원히 완료 불가로 만들어 **챕터 20 해금을 막았을 것** (챕터 19는 4/4 완료 필요). 문장 없는 레슨은 조건 면제로 수정. 유료 레슨이라 브라우저 확인은 BLOCKED, 코드·데이터로 확인

**FUN-03 · VOCA 퀴즈 30번 후 1번으로 순환** — `FIXED AND VERIFIED`
- 운영: 마지막 후 `QUESTION #11/30` 식 순환 / 로컬: 결과 화면(점수·정답 수·틀린 단어). "이 단어로" 로 새로 시작하면 점수 초기화(검수 지적 반영, 88→0 확인)

**FUN-04 · "이 단어로 Step 2" 가 1번을 엶** — `FIXED AND VERIFIED`
- 운영: `#1 yes` / 로컬: `#15 well`

**LX-01 · 첫 방문자 안내 부재** — `DEFERRED — OWNER AND LEGAL REVIEW` (대상·가격·무료 범위·학습 목표 카피는 사업 결정)

**A11Y-01 · 이용권 대화상자 키보드** — `FIXED AND VERIFIED`
- 운영: Escape 무반응, Tab 2회째부터 밖으로, 포커스 복귀 없음, 레이블 없음 / 로컬: Escape 닫힘, Tab 4회 모두 안쪽, 여는 버튼으로 복귀, `label for`, 오류 `role=alert` (신뢰 키 이벤트로 확인)

**SEC-03 · 관리자 PIN 화면** — noindex `FIXED AND VERIFIED` / 나머지 `DEFERRED — OWNER AND LEGAL REVIEW`
- 운영: robots 메타 없음 / 로컬: `noindex, nofollow` (`src/app/admin/layout.tsx`)
- 위험만 기록: 시도 제한이 인스턴스 메모리 `Map` 이라 콜드스타트·다중 인스턴스마다 초기화되어 무차별 대입 제한이 약함. PIN 길이·2FA·Vercel 보호·IP 제한은 소유자 결정. PIN 입력칸에 `aria-label` 만 추가(접근성)

**SEO-01 · 검색 노출 설정** — `FIXED AND VERIFIED` (CNN 등재는 COM-03 에 종속, "gh1-006-2 제목 7강" 은 `NOT REPRODUCIBLE`)
- 운영: 사이트맵 45개 중 307 6개, 대본 페이지 self-canonical, og:image 1200×630 선언/실제 1000×1250
- 로컬: 29개 전부 200, `/reading/pr001-1` canonical → `/reading/pr001`, og 1000×525 선언 = 실제 1000×525 (`public/images/og/`)

**A11Y-02 · 대비·터치 영역·레이블·알림·main** — 대부분 `FIXED AND VERIFIED` / 44px 터치 영역 **미해결**
- 운영: `--ink-faint` 2.74:1, 홈 `<main>` 없음 / 로컬: **4.84:1**(다크 5.3:1), `<main>`, 답안·빈칸·노트·선택 상자 레이블(전수 스윕 0건), 채점 결과 `role=status`
- 미해결: 모바일 44px 터치 영역(버튼 다수 재설계 필요), 실제 스크린리더 청취 `BLOCKED`

### Low

| ID | 상태 | 운영 → 로컬 |
|---|---|---|
| FUN-05 빈 제출 | `FIXED AND VERIFIED` | 받아쓰기 "일치하지 않습니다" → "단어를 먼저 배열하세요"; 빈 시험 채점 가능 → 버튼 비활성 |
| FUN-06 빈칸 오답 신호 없음 | `FIXED AND VERIFIED` | 오답 표시 없음 → 빨간 ✗ (`dont`=`don't` 인정, 검수 지적 반영) |
| FUN-07 첫 로딩 "자동 저장됨" | `FIXED AND VERIFIED` | GRAMMAR·READING 표시됨 → 없음, 저장 시 날짜 포함 |
| FUN-08 READING 영어만/한글만 | `FIXED AND VERIFIED` | 1366px 에서 토글 자체가 없음 → 토글이 패널을 실제로 숨김 |
| FUN-09 검색 | 부분 `FIXED AND VERIFIED` | `1강` 6건(01·11·21…) → 1건; d150 잠금 표시 없음 → 🔒; placeholder 가 단어 검색을 약속 → 실제 범위로. **단어·문장 검색 기능은 미구현** |
| UX-01 용어·코드 형식 | 부분 | 코드 placeholder `KIG-1Y-XXXX-XXXX` → 실제 형식 `FIXED AND VERIFIED`. "수강권 열람" 라벨은 비로그인 화면에 없음 `NOT REPRODUCIBLE`; 상품 용어 통일은 소유자 결정이라 라벨 변경을 되돌림 |
| UX-02 다시 풀기 | `FIXED AND VERIFIED` | 입력 남음 → 비움 |
| CNT-13 CNN 데이터 | `DEFERRED — OWNER AND LEGAL REVIEW` | CNN 미수정 |
| CNT-14 소리가 같은 오답 타일 | 오답 타일 `FIXED AND VERIFIED` / 클리닉 커버리지 미해결 | LISTENING 단어 뱅크 2,218개 중 `Im`·`names` 류 **0**. 연음 카드가 0개인 문장은 규칙 엔진 확장 과제 |
| PERF-01 느린 모바일 홈 | `FIXED AND VERIFIED` | LCP **14.7 s → 2.29 s**, 사진 267 → 122 KB. 원인은 이미지 크기와 **첫 사진이 hydration 전까지 opacity 0** 이던 것 둘 다 |

## 3. 이번 점검에서 새로 찾은 것 (감사 보고서 밖)

| ID | 심각도 | 내용 | 상태 |
|---|---|---|---|
| NEW-01 | High | 직전 세션 완료 조건이 `s19-3`(문장 0개) 완료를 막아 **챕터 20 해금 불가** | `FIXED` (코드·데이터로 확인, 브라우저 BLOCKED — 유료) |
| NEW-02 | High | 잠긴 레슨 클립 1개가 git 추적 정적 파일이라 게이트 우회 (SEC-02 원인 ②) | `FIXED AND VERIFIED` (로컬 403) |
| NEW-03 | Medium | 레이블 없는 입력 4종 (LD 소리 클리닉 선택, LD·READING 노트, 관리자 PIN) | `FIXED AND VERIFIED` (스윕 0) |
| NEW-04 | Medium | 무료 gh1-008 이 "I was poor." 클립을 403 받음 — 번호 제거한 문장이 무료 목록에 없었음 (독립 검수 발견) | `FIXED AND VERIFIED` (206 재생) |
| NEW-05 | Medium | `s19-3` 이 문단 형식이라 STUDENT 화면에 문장이 하나도 안 나옴 (순서도 섞임) | `DEFERRED — OWNER` (교재 복원 데이터) |
| NEW-06 | Medium | READING 어휘 카드 품사 오류 전반 (CNT-06 미해결분 수치) | 미해결 |
| NEW-07 | Low | `pnpm lint` 가 설정 오류로 중단 (`docs/*.cjs`·`.claude/` 워크트리에 react-hooks 플러그인 미적용), 기존 린트 오류 5건 | 미해결 (제품 영향 없음) |

## 4. 모바일 음성 재생 (RE-006) — 다른 세션이 배포

`fa80c93` (다른 Claude 세션, 소유자 결정으로 교차 검수 없음, 소유자가 아이폰 실기기 확인)이
`media-src 'self' blob: data:` 로 무음 준비 클립 차단을 고쳤고 **운영에 배포됐습니다**.
이 작업 트리의 `next.config.ts` 는 그 커밋과 **동일**합니다.

이번에 추가로 확인: 운영 헤더 `media-src 'self' blob: data:`; 실제 브라우저 375px 에서 제목을 먼저
누른 뒤 재생 → 로컬 클립 **206**, CSP 위반 **0**. (헤드리스 Edge 는 수정 전 운영에서도 이 위반을
보고하지 않아 하네스에서는 INFO 로만 기록)

## 5. 독립 검수 반영

| 지적 | 조치 |
|---|---|
| (M) gh1-008 "I was poor." 클립 403 | 무료 목록에 번호 제거형 추가 (532→533), 게이트 프로브가 **화면이 말하는 문장**을 해시하도록 |
| (L) `audit-data.cjs` 가 `analyzeEtymology()` null 에서 충돌 | `ety?.prefix` |
| (L) s6-3 #7 "He … him" 오답 처리 | 대명사 성별 일치 방식으로 교체 + 회귀 테스트 |
| (L) 빈칸 `dont` 오답 | 시험과 같은 비교 사용 + 테스트 |
| (L) "이 단어로" 후 점수 누적 | 새 시작 시 초기화 |
| (제약) 잠금 버튼 문구 "이용권 필요" 는 구매 인접 문구 | HEAD 로 되돌림 |
| (주의) `public/audio` 추적 파일 삭제 표시 | 의도된 제거 2건만 남기고 폴더 복원 |

## 6. 커밋할 때 (소유자 또는 다른 AI)

- 🔴 로컬 `main` 은 `a951e43`, 원격은 `62af8bb`. 먼저 원격을 받으세요. `next.config.ts` 는 원격과 동일, `NEXT-SESSION.md` 는 원격 내용을 이미 병합해 두었습니다.
- 파일을 **이름으로** 추가하세요 (`git add -A` 금지). 새 파일: `src/lib/grammarGrading.ts`, `src/lib/generated/freeSpeechKeys.json`, `scripts/buildFreeSpeechKeys.mjs`, `src/app/admin/layout.tsx`, `public/images/og/*`, `public/images/sections/*-640.webp`·`*-1000.webp`, `docs/qa-2026-09-15/scripts/verify/` 의 새 스크립트 8개, 이 문서.
- 추적 클립 제거는 `git rm --cached public/audio/azure-ava/v1/b-5e89d9dbb8adad0b.mp3 public/audio/azure-ava/v1/b-bd8fc71b9dacaff6.mp3` (R2 에 동일 파일 있음).
- `src/lib/adminAuth.ts` 는 줄바꿈만 다릅니다 — 스테이징하지 마세요.
- 배포 후 운영에서 다시: `verify-launch-audit.cjs https://k-ig-core.vercel.app` (43 PASS 기대), `verify-speech-gate.cjs`, `verify-sitemap.cjs`, 잠긴 클립 캐시(§7).

## 7. 배포 캐시 위험 (조사 결과)

- 운영은 잠긴 클립을 `public, max-age=31536000, immutable` 로 내보내고 있고, **Vercel 엣지가 실제로 캐시합니다** (같은 클립 두 번째 요청 `x-vercel-cache: HIT`). Range 요청은 캐시되지 않습니다.
- Vercel 문서: 캐시 키에 **배포 URL** 이 포함되어 새 배포는 이전 배포의 캐시를 쓰지 않습니다 → 배포하면 엣지의 옛 클립은 새 운영에서 나가지 않습니다.
- 남는 위험: ① **이전 배포로 롤백**하면 옛 코드와 옛 캐시가 함께 돌아옴 ② 이미 받아 간 사람의 브라우저 캐시·파일은 회수 불가 ③ 옛 배포의 고유 URL(`*.vercel.app` 배포별 주소)이 공개 접근 가능하면 그 주소로는 계속 제공 — 배포 보호 설정은 소유자 몫.
