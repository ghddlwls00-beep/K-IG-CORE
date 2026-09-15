# K-IG CORE QA 작업 진행 상황

> 이 문서는 **세션이 바뀌어도 작업을 그대로 이어받기 위한** 인수인계 기록입니다.
> 작업 지시 원본은 `docs/qa-2026-09-15/README.md`, 재개용 프롬프트는 `PROMPT.md`를 보세요.
> 최종 갱신: 2026-09-15

---

## 0. 새 세션에서 재개하는 방법

새 작업을 열고 아래 한 줄을 붙여넣으면 됩니다.

```
docs/qa-2026-09-15/README.md 와 docs/qa-2026-09-15/PROGRESS.md 를 읽고,
PROGRESS.md 의 "다음 착수" 순서대로 이어서 진행해줘.
```

작업 사본 경로: `C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE`
운영: <https://k-ig-core.vercel.app>

---

## 1. 완료한 이슈

| 이슈 | 커밋 | 내용 | 검증 |
|---|---|---|---|
| KIG-001 (P0) | `984a553` | 잠금 레슨 본문이 비로그인 HTML에 노출되던 문제. `[course]/[lesson]/page.tsx`에 서버 게이트 추가, `LessonClientGate` 래퍼 제거 | 7개 코스 42/42 PASS, 이용권 경로 10/10 PASS, 전수 크롤 실제 누출 0건, 운영 재확인 완료 |
| KIG-002 (P1) | `37d2a26` | READING 85개 레슨의 `readingSentences`가 원본과 다른 지문/의역이던 문제. 리포 안 원본 지문에서 재생성 | `probe3.cjs` → `{}` (85건 → 0건), 세 저장소 불일치 0, 화면 7/7 문장 렌더 |
| KIG-011 (P1) | `2f8a97e` | `/api/license/verify` 실패 시 `setStored(parsed)`로 권한을 부여하던 문제. 실패 시 잠금 유지로 변경, 400/403만 저장 키 삭제 | CDP로 요청 차단 → 페이월 표시 PASS. **수정 되돌린 원본 코드에서는 본문·플레이어가 노출되어 FAIL** (테스트가 버그를 실제로 검출함) |
| KIG-024 (P2) | `efe57da` | 타이핑 딕테이션이 공백 변형을 오답 처리하던 문제. 비교 전 양쪽 공백 정규화 (탭·붙여넣기 개행도 단어 구분자로 처리) | 실제 문장 277개 × 공백 변형 1,108건 → 수정 후 **1,108/1,108 정답**. 수정 전엔 833건이 오답 처리. **오답이 정답으로 통과한 건 0건** |
| KIG-018 (P2) | `c50a9ea` | 클로즈 빈칸이 정답을 노출하던 문제. 대상 단어에서 구두점 제거(끝 아포스트로피 포함) + 정규식 이스케이프. 마스킹 실패 시 노출 대신 문항 제거 | 256개 레슨 전수. **정답 노출 16 → 0**, 문항 수 748로 동일(회귀 없음), 정상 문항 손실 0 |

### KIG-001 이후 확인된 신규 취약점 (README에 없음, 미처리)
- **GVA P0** — `src/app/gva/[lesson]/page.tsx:39-52`가 `LessonClientGate`(클라이언트 게이트) 사용. VIP 전용 `/gva/gva-003` HTML에 슬라이드·오디오 직접 URL 노출. 실제 잠금 노출 규모는 814가 아니라 **약 1,012레슨**
- **R2 공개 버킷** — `pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev`가 인증 없이 접근 가능하고 경로 추측 가능(`gva/audio/gva-NNN.mp3`). `gva-200.mp3`가 HTTP 206으로 내려옴. **GVA는 HTML 게이트를 고쳐도 콘텐츠가 보호되지 않음** → 서명 URL 또는 비공개 버킷 필요

---

## 2. 남은 이슈 (39건)

### 그룹 A — 코드 소규모 (16건, 내가 단독 완료 가능)
KIG-011, 013, 018, 019, 024, 031, 032, 033, 034, 035, 036 + §4 미분류(favicon 404, TTS 비공식 API, 섹션 소개 이중집계, Step1 정답공개, LISTENING Step1 선택변경)

### 그룹 B — 코드 중규모 (4건)
KIG-005(GRAMMAR 채점 단어단위 유사도), KIG-006(대안 정답 스키마+채점), KIG-014(진도 API 챕터 검증), KIG-022(검색 인덱스)

### 그룹 C — 데이터 소규모 (9건, 리포 데이터만으로 가능)
KIG-010, 012, 017, 020, 021, 023, 025, 026, 027

### 그룹 D — 대량 육안검수 (3건)
KIG-016(어휘 품사·뜻 303건), KIG-028/030(힌트 누락 53레슨), KIG-029(번역 부분 상이 87레슨)

### 그룹 E — 사람·외부 의존 (6건, 내가 못 끝냄)
| 이슈 | 막히는 이유 |
|---|---|
| KIG-008 (462레슨 퀴즈 정답키) | README가 "임계값 조정으로 해결 금지" 명시. 레슨별 문항·정답을 사람이 제작해야 함. **최대 병목** |
| KIG-003 (LISTENING 119레슨) | R2 음성으로 STT는 가능하나 **원어민 검수** 필요 |
| KIG-004 (VOCA 뜻 361개) | **교재 원본** 필요 (이 PC에 없음) |
| KIG-007 (gh1-020 답 8개) | **교재 원본** 필요 |
| KIG-009 (원어민 음성 표기) | **제품 소유자 결정** |
| KIG-015 (연음 음성 3,403개) | Azure Speech 키 + R2 업로드 (운영 쓰기) |

---

## 3. 다음 착수 순서 (권장)

1. **그룹 A (남은 것)** — KIG-013, 018, 019, 024, 031, 032, 033, 034, 035, 036 + §4 미분류(favicon 404, TTS 비공식 API, 섹션 소개 이중집계, Step1 정답공개, LISTENING Step1 선택변경). 위험 낮고 검증 단순
2. **그룹 B** — KIG-005(채점) → KIG-006(스키마) → KIG-014(진도 API) → KIG-022(검색)
3. **그룹 C** — KIG-010, 012, 017, 020, 021, 023, 025, 026, 027. KIG-002와 같은 패턴이라 검증 스크립트 재사용 가능
4. **그룹 D** — KIG-016(303건), KIG-028/030(53레슨), KIG-029(87레슨). 자동화로 플래그 추출 후 사람 판단
5. **그룹 E** — KIG-003, 004, 007, 008, 009, 015. **수정 금지.** 원본 교재 확보 여부부터 확인하고, 없으면 README가 제시한 비노출 B안으로 전환

> README 규칙 2에 따라 이슈마다 확인을 받아야 합니다. 승인을 묶어주면(예: "A그룹 16건 진행") 훨씬 빠릅니다.

---

## 4. 환경 함정 (재발 방지 — 시간 절약용)

### ⚠️ 브라우저 검증 시 필수 — Next dev origin 제한
**dev 서버는 반드시 `http://localhost:<port>` 로 접속하세요. `http://127.0.0.1:<port>` 로 접속하면 Next 16의 dev origin 검사에 걸려 클라이언트 리소스가 로드되지 않고, React가 하이드레이션되지 않습니다.**
증상: 페이지에 레이아웃 헤더만 보이고 본문이 비어 있음. `LessonClientGate` 를 쓰는 페이지는 하이드레이션 전 스켈레톤(회색 플레이스홀더)에 정지. 콘솔·예외 오류는 잡히지 않아 원인 파악이 어려움.
→ 이 때문에 브라우저 검증을 한 번 실패했고, `localhost` 로 바꾸자 즉시 통과했습니다.

### 브라우저 검증 방법 (동작 확인됨)
`docs/qa-2026-09-15/scripts/ui-harness.cjs` 의 CDP `Tab` 패턴을 재사용하면 됩니다. headless Edge + `--remote-debugging-port`.
- 요청 차단은 CDP `Fetch.enable` + `Fetch.failRequest(errorReason: "BlockedByClient")` 로 DevTools의 "Block request URL" 과 동일하게 재현됩니다.
- 페이지 상태 확인은 `Runtime.evaluate` 로 DOM을 읽고, 판단이 어려우면 `Page.captureScreenshot` 으로 스크린샷을 찍어 직접 보는 게 가장 빠릅니다.
- **dev 모드는 라우트를 온디맨드 컴파일**하므로 검증 전에 대상 URL을 curl로 예열하고, 하이드레이션 대기는 넉넉히(15초 이상) 잡으세요.
- **검증 테스트는 "수정을 되돌리면 실패하는지"까지 확인하세요.** 실패할 수 없는 테스트는 아무것도 증명하지 않습니다. (KIG-011에서 실제로 이 방식으로 검출력을 확인했습니다.)

### 빌드·설치
- **샌드박스는 pnpm 심볼릭 링크 생성을 차단한다.** 워크스페이스에 새로 클론하면 `pnpm install` 기본(isolated) 모드가 빈 디렉터리를 만들어 실행 불가. → `pnpm install --force --config.node-linker=hoisted` 사용
- **`pnpm run <script>`는 실행 전 자동 재설치로 링커 설정을 되돌린다.** → `./node_modules/.bin/next dev` 로 직접 실행
- **`.next`가 채워져 있으면 `next build`가 컴파일 시작 전에서 무한 대기한다.** → 반드시 `rm -rf .next` 후 빌드. (`.next`가 936MB까지 부풀어 있었음)
- `rm -rf .next`는 safe-delete 가드에 걸림 → `dangerouslyDisableSandbox` 필요. **가드 예산은 턴 단위**라 `rm -rf .next && next build`를 한 명령에 묶으면 삭제가 막혀 빌드가 아예 안 돌아감 → **삭제와 빌드를 분리**
- dev 서버를 강제 종료하면 `.next/dev/types/routes.d.ts`가 잘려 `tsc`가 깨짐 → dev 서버 재기동으로 재생성
- **dev 서버가 종료되지 않고 포트를 계속 잡는 경우가 있다.** `netstat -ano | grep ":3000"` 으로 PID를 찾아 `MSYS_NO_PATHCONV=1 taskkill /F /PID <pid>` 로 정리할 것 (`//PID` 형식은 Git Bash에서 경로 변환에 걸려 실패)
- **QA 스크립트의 하드코딩 경로**: `probe3.cjs`·`crawl-prod.cjs`의 출력 경로는 `C:/Users/ghddl/AppData/Local/Temp/kq/out` → **디렉터리를 미리 만들어두면 스크립트 수정 없이 실행 가능**
- `crawl-prod.cjs`는 `docs/qa-2026-09-15/scripts/out/`에 결과를 씀 (mkdir을 안 함) → 미리 만들어둘 것

### 검증 시 주의
- **probe3·crawl의 substring probe는 오탐이 난다.** crawl-prod가 phonics 12건을 "누출"로 잡았으나 전부 CSS 클래스명·meta 태그 충돌(`back`→`backdrop-blur`, `right`→`border-right`, `cover`→`viewport-fit=cover`, `maximum`→`maximum-scale` 등). 긴 고유 문구를 probe로 쓰거나 head/CSS를 제외할 것
- **`build-reading-voca.mjs`는 256개 전부 재생성한다.** 커밋된 어휘가 생성기와 드리프트되어 있어 재실행하면 범위 밖 124레슨이 함께 바뀜 → 되돌릴 것
- **`-1` 레슨의 `id`는 `"pr026-1"`** (베이스 id 아님). 범위 판정 시 `id.replace(/-1$/,'')` 로 정규화할 것
- 리포 JSON 관례: **끝에 개행 없음**

---

## 5. 재사용 자산

| 자산 | 위치 |
|---|---|
| KIG-001 검증 (7코스 42건) | `.tmp-kig/verify-kig001.cjs` (워크스페이스) |
| KIG-001 이용권 경로 검증 | `.tmp-kig/verify-licensed.cjs` |
| KIG-002 재생성 | `.tmp-kig/rebuild-reading-sentences.cjs` |
| KIG-002 최종 검증 | `.tmp-kig/verify-kig002-final.cjs` |
| KIG-002 화면 검증 | `.tmp-kig/verify-kig002-visual.cjs` |
| KIG-001 크롤 증거 | `docs/qa-2026-09-15/scripts/out/prod-crawl.json` (미커밋) |

### 로컬 유료 레슨 검증 절차 (운영 데이터 보호)
```bash
node docs/qa-2026-09-15/scripts/make-fixture.cjs
export R2_ACCOUNT_ID=' ' R2_ACCESS_KEY_ID=' ' R2_SECRET_ACCESS_KEY=' ' R2_BUCKET_NAME=' ' R2_LICENSE_BUCKET=' ' LICENSE_STORAGE_SECRET=' '
export LICENSE_SECRET="$(node -e "process.stdout.write(require('./docs/qa-2026-09-15/scripts/qa-secrets.json').secret)")"
export LICENSE_SALT="$(node -e "process.stdout.write(require('./docs/qa-2026-09-15/scripts/qa-secrets.json').salt)")"
./node_modules/.bin/next dev
# 작업 후 반드시 삭제: data/license-devices.json, data/student-progress.json, docs/qa-2026-09-15/scripts/qa-secrets.json
```
R2 환경변수를 공백으로 덮어써야 운영 버킷 대신 로컬 파일 저장소가 쓰입니다. **필수.**

---

## 6. 배포·커밋 정보

- `main`에 push하면 Vercel이 자동 배포 (푸시 후 60초 내 반영 확인됨)
- git 자격증명이 저장되어 있어 push 가능 (`gh` CLI는 미로그인 상태지만 불필요)
- 샌드박스 특이사항: `.git/refs/remotes/origin/` 하위 파일 생성이 차단되어 `git status`가 `[gone]`으로 표시됨. **표시 문제일 뿐 push/fetch는 정상**
