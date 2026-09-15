# K-IG CORE QA 작업 진행 상황

> 이 문서는 **세션이 바뀌어도 작업을 그대로 이어받기 위한** 인수인계 기록입니다.
> 작업 지시 원본은 `docs/qa-2026-09-15/README.md`, 재개용 프롬프트는 `PROMPT.md`를 보세요.
> 최종 갱신: 2026-09-15 (2차 세션 — 그룹 A 12건 중 11건 완료)

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

### 1차 세션

| 이슈 | 커밋 | 내용 | 검증 |
|---|---|---|---|
| KIG-001 (P0) | `984a553` | 잠금 레슨 본문이 비로그인 HTML에 노출되던 문제. `[course]/[lesson]/page.tsx`에 서버 게이트 추가, `LessonClientGate` 래퍼 제거 | 7개 코스 42/42 PASS, 이용권 경로 10/10 PASS, 전수 크롤 실제 누출 0건, 운영 재확인 완료 |
| KIG-002 (P1) | `37d2a26` | READING 85개 레슨의 `readingSentences`가 원본과 다른 지문/의역이던 문제. 리포 안 원본 지문에서 재생성 | `probe3.cjs` → `{}` (85건 → 0건), 세 저장소 불일치 0, 화면 7/7 문장 렌더. ⚠️ **부작용: 교체된 85레슨의 Ava 클립 510건이 무효화됨** → §2 신규 취약점 참조 |
| KIG-011 (P1) | `2f8a97e` | `/api/license/verify` 실패 시 `setStored(parsed)`로 권한을 부여하던 문제. 실패 시 잠금 유지로 변경 | CDP로 요청 차단 → 페이월 표시 PASS. 수정 되돌린 원본 코드에서는 노출되어 FAIL (테스트가 버그를 실제로 검출) |
| KIG-024 (P2) | `efe57da` | 타이핑 딕테이션이 공백 변형을 오답 처리하던 문제 | 실제 문장 277개 × 공백 변형 1,108건 → 수정 후 1,108/1,108 정답 |
| KIG-018 (P2) | `c50a9ea` | 클로즈 빈칸이 정답을 노출하던 문제 | 256개 레슨 전수. 정답 노출 16 → 0, 문항 수 748 동일 |
| KIG-013 (P2) | `e83b8ae` | 대시보드 카드 별 버튼 `disabled={!isUnlocked}` | 레슨 페이지는 운영 확인 완료. ⚠️ 대시보드 별 버튼은 UI 검증 보류 (§4) |

### 2차 세션 (그룹 A — 코드 소규모)

> 모든 항목을 **수정 되돌린 원본과 동일한 프로브로 양쪽을 실행**해 검출력을 확인했습니다.
> 아래 "운영" 수치는 수정 전 프로덕션에서 같은 스크립트를 돌린 결과입니다.

| 이슈 | 커밋 | 내용 | 검증 (로컬 vs 운영) |
|---|---|---|---|
| KIG-019 (P2) | `5bec3b9` | VOCA 4지선다 퀴즈가 **같은 뜻의 단어를 오답 보기로 제시**. `hv-15` "운이 좋은"에 `lucky`·`fortunate`가 함께 나와 하나를 고르면 오답 처리 | 195레슨 5,831단어 / 349,860문항 전수: 복수정답 레슨 **14 → 0**. 보기 4개·중복 0·플레이스홀더 0 유지. 리포 자체 감사(`audit-data.cjs`)에서도 `AMBIGUOUS_QUIZ` **15 → 0** |
| KIG-031 (P3) | `1283492` | 레슨 하단에 내부 아카이브 경로 노출 (`출처: LD/d001.htm · utf-8`) → footer 제거 | `/ld/d001`에서 `출처`/`euc-kr` **0건**. 운영은 동일 프로브에서 `출처: LD/d001.htm · utf-8` 검출 |
| KIG-032 (P3) | `d5a52da` | "음절 수: N글자"가 실제로는 글자 수 → 라벨을 `글자 수`로 정정 | `/phonics/mv1-01` 렌더 확인 (`글자 수: 2자`), `음절 수` 0건 |
| KIG-033 (P3) | `c57b7f3` | "마스터 체크"가 퀴즈 승급 로직을 타서 **3번 눌러야** 마스터됨. 겸사겸사 `updateLeitnerCard`가 **정답에 Box 3 → Box 2로 강등**시키던 버그도 수정 | git에서 수정 전 구현을 로드해 13/13 단언: 1클릭 마스터, 퀴즈 경로는 여전히 3연속, 정답은 강등하지 않음 |
| KIG-034 (P3) | `3f7fc04` | 어휘 카드 번호가 `#010` → `#01`~`#14` | 운영은 `#010`~`#014`(3자리 5건), 로컬은 3자리 0건 |
| KIG-035 (P3) | `afb573f` | 속독 WPM 상한 없음. 1초 만에 완독하면 **5,040 WPM**을 "최상위 속독 수준"으로 표시하고 **개인 최고 기록으로 저장** | 운영: 5,040 WPM 저장됨. 로컬: "측정값을 저장하지 않았습니다" 경고 + 미저장, 정상 16초 완독은 315 WPM으로 정상 채점 |
| KIG-036 (P3) | `ee3cbe0` | 상단 내비가 md부터 표시되어 768/800/1024px에서 **157/141/29px 넘침**(CNN NEWS·GVA 독해 도달 불가). 375px에서 STUDENT 3개·LISTENING 5개 단계 탭 라벨 잘림 | 768~1600px 전 구간: 행이 보이면 overflow 0, 숨겨지면 드로어에 8개 탭 전부. 375px 잘림 0. 운영은 768/800/1024에서 잘림, 375px 8개 라벨 전부 잘림 |
| favicon (§4) | `6af9c69` | `src/app/`에 아이콘이 없어 `/favicon.ico` 404 | 로컬 200 `image/x-icon` + `<link rel="icon">` 2개. 운영 404, 아이콘 링크 0개 |
| 레슨 수 이중집계 (§4) | `a088969` | 섹션 소개가 **페이지 수**를 레슨 수로 표시 (`/t/ld` 552 vs 276). `content.ts`가 저장 필드를 믿지 않고 index의 `main` variant에서 계산하도록 변경, `extract.mjs`도 동일하게, 영향받은 5개 index JSON의 필드도 정정 | 8개 섹션 페이지 전부 실제 레슨 수와 일치(81/195/53/44/276/256/120/200). 운영은 88/552/512 |
| GRAMMAR 정답 노출 (§4) | `1bec0f5` | Step 1 "전체 정답 보기"가 **Step 2 빈칸 정답까지 공개**(키가 모드 구분 없이 문항 번호). 역방향 누출도 동일 | 운영: Step 1 일괄 공개 → Step 2 빈칸 **42/42** 채워짐. 로컬: Step 2 입력칸 69개 유지, Step 1 복원 상태도 유지 |
| LISTENING 선택 변경 (§4) | `ca7ea4f` | Step 1 퀴즈가 정답 공개 후에도 선택 변경 가능 → 정답을 보고 답을 바꿀 수 있었음 | 운영: 2번째 클릭에 저장값 `0 → 1` 변경, 오답 표시 이동, 버튼 비활성 아님. 로컬: 변경 무시, `disabled` 전부 true |

**세션 전체 회귀 확인**: `audit-data.cjs`를 재실행해 기준선(`evidence/data-audit-raw.json`)과 대조했습니다.
개선 4건(`AMBIGUOUS_QUIZ` 15→0, `CLOZE_NOT_MASKED` 10→0, `PASSAGE_TEXT_DIVERGES` 59→6, `TRANSLATION_DIVERGES` 87→2).
증가한 항목(`KOREAN_IN_EN` +3, `TEXT_FLAG` +5, `DUPLICATE_LESSON_CONTENT` +1, `KO_NOT_KOREAN` +1)은 **전부 READING 레슨**이며
1차 세션 KIG-002 재생성분입니다 — 2차 세션 변경 파일 18개 중 READING 콘텐츠는 **0개**(`git diff --name-only 11ef719..HEAD`로 확인).
`tsc --noEmit`는 매 커밋마다 통과.

### KIG-001 이후 확인된 신규 취약점 (README에 없음)

- **GVA P0 — ✅ 해결됨 (2026-09-15, 커밋 `276630e`). 섹션 자체를 폐지.**
  - 증상이었던 것: `src/app/gva/[lesson]/page.tsx`가 `LessonClientGate`(클라이언트 게이트)를 써서
    비로그인 `/gva/3` 요청 하나에 **r2.dev MP3 직접 URL 400개**가 HTML로 나갔고, 그 파일들은
    인증 없이 HTTP 200으로 받아졌습니다. 실제 잠금 노출 규모는 814가 아니라 약 1,012레슨이었습니다.
  - 조치: 게이트를 고치는 대신 **제품 소유자 결정으로 GVA 섹션을 폐지**했습니다.
    라우트·대시보드·스트리밍 플레이어·콘텐츠 인덱스·업로드 스크립트 9개 삭제,
    탭/과정/라이선스/이미지 레지스트리 8개 파일에서 제외.
  - 검증: `tsc --noEmit` 통과, `next build` 성공, 리포 내 잔여 `gva` 참조 0건,
    운영에서 `/gva/3` `/gva/50` `/gva` `/t/gva` 전부 **404**, 다른 과정 6개 정상(200).
  - R2: `k-iglab` 버킷의 `gva/` 하위 3개 폴더(`audio/`, `audio-rnnoise-v2/`, `slides/`)를
    소유자가 대시보드에서 삭제. 실측으로 전부 **404** 확인, `audio/ld/*`·`audio/reading/*`는 200 유지.
    원본 강의 파일은 오프라인(외장하드)에 보관.
  - 복원이 필요하면 커밋 `ead6a01` 이전 이력을 참고. **R2 자산은 리포에 없으므로 재업로드 필요.**

- **R2 공개 버킷 — 코드 완료, 버킷 설정 1단계 남음 (2026-09-15)**

  문제였던 것: `pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev`가 인증 없이 응답하고 키가 순차적이라
  (`audio/ld/dNNN.mp3`, `audio/reading/prNNN.mp3`) 페이지를 한 번도 열지 않고 카탈로그 전체를
  걸어서 받아갈 수 있었습니다. KIG-001은 페이지만 막았지 파일은 막지 못했습니다.

  **조치 (커밋 `91cc15b` → `4d7a4f7`)**
  - `next.config.ts`의 `/audio/:path*`·`/video/:path*` fallback rewrite를 제거하고
    **라우트 핸들러**(`src/app/audio/[...path]/route.ts`, `video/`)로 교체.
    레슨 페이지와 **같은 쿠키·같은 규칙**을 적용합니다(`src/lib/mediaAccess.ts`).
  - 무료 체험 레슨은 그대로 공개. `audio/azure-ava/` 클립도 공개 — 키가 콘텐츠 해시라
    문장을 이미 아는 사람에게만 쓸모가 있고, 걸어다닐 카탈로그가 없습니다.
  - `src/lib/media.ts`의 `mediaUrl()`이 절대 r2.dev URL을 만들던 것을 **같은 도메인 상대경로**로
    변경. 이걸 안 고치면 브라우저가 버킷 직통 주소를 받아 **게이트를 통째로 우회**합니다.
  - `NEXT_PUBLIC_MEDIA_URL`(브라우저가 요청할 주소)과 `R2_PUBLIC_BASE_URL`(서버가 읽을 주소)을
    분리. 이 둘을 같은 변수로 쓴 것이 우회가 생긴 원인이었습니다.
  - **캐시**: 기존 `public, immutable`을 전 경로에서 제거. 유료 응답은 `private`이어야 하며,
    안 그러면 CDN이 구독자의 음성을 캐시해 다음 비로그인 방문자에게 그대로 내줍니다.
  - Range 요청(206) 보존 — 오디오 탐색이 여기에 의존합니다.
  - `src/lib/mediaOrigin.ts`: S3 자격증명이 있으면 S3 API로 읽어 **버킷을 비공개로 둘 수 있고**,
    없으면 공개 URL로 폴백합니다. S3 읽기가 실패해도 폴백하므로 설정 오류가 서비스를 죽이지 않습니다.
    SDK 기본 3회 재시도가 함수 타임아웃을 넘겼기 때문에 `maxAttempts: 1` + 4초 데드라인.
  - `/api/media-health`가 어느 경로로 읽고 있는지 보고합니다(불리언과 오류 이름만, 설정값 없음).
    **`readyForPrivateBucket: true`가 되기 전에는 버킷 공개를 끄면 안 됩니다.**

  **검증**: 비로그인 잠금 403 / 무료 200, LIFE는 ld·reading·phonics 전부 200,
  STUDENT 전용권은 ld·reading 403, Range 206, 렌더된 HTML에 r2.dev 0건 — 로컬·운영 모두 확인.

  **남은 1단계 (소유자 작업)**: Cloudflare R2 → `k-iglab` → Settings → Public Development URL → Disable.
  그 전에 Vercel의 `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`가 **`k-iglab`을 읽을 수 있어야** 합니다.
  2026-09-15 시점의 Vercel 키는 `k-ig-license-private` 전용이라 `AccessDenied`가 났고,
  `kig-reading-upload`(All buckets) 토큰 값이 `.env.local`에 있어 그것으로 교체하는 중입니다.
  `NEXT_PUBLIC_MEDIA_URL`은 Vercel에서 **삭제**해야 합니다(남아 있으면 게이트 우회).
- **🔴 KIG-002가 READING 음성 커버리지를 깨뜨렸다 (2차 세션 발견, 미처리)**
  - `readingSentences`를 정본 지문으로 교체했는데, **Ava 클립은 교체 전 문장으로 생성되어 있었습니다.** 그래서 새 문장에는 클립이 없습니다.
  - 운영 실측 (`scripts/verify/measure-tts-coverage.cjs`, `attribute-reading-gap.cjs`):
    | 구분 | 클립 존재 | 결측 |
    |---|---|---|
    | KIG-002가 바꾼 85개 레슨 | 349/859 (40.6%) | **510** |
    | 건드리지 않은 레슨 | 1,645/1,645 (100.0%) | 0 |
  - **귀속 100% 확정**: 결측 510건 전부가 KIG-002 레슨 안에 있고, 나머지 레슨은 완벽합니다. 즉 이건 새 버그가 아니라 **KIG-002 수정의 부작용**입니다.
  - 영향: 해당 85레슨은 브라우저 TTS 또는 **비공식 Google 엔드포인트**로 폴백 → 인앱 브라우저 사용자는 로봇 음성을 듣게 되는데 화면에는 "원어민 음성"이라 적혀 있습니다(KIG-009와 겹침).
  - 수정: KIG-015와 **같은 명령**(`scripts/generate-azure-ava.mjs` → `upload-azure-ava-r2.mjs`). 별도 작업이 아니라 같은 배치에 545건을 얹으면 됩니다.
  - ⚠️ **교훈**: 문장 텍스트를 바꾸는 수정(KIG-002 계열, 앞으로의 그룹 C/D 데이터 수정)은 **클립 재생성이 따라붙어야** 합니다. 텍스트 수정 후에는 위 커버리지 측정을 돌리세요.

---

## 1-B. 제품 소유자 결정이 내려진 항목 (2026-09-15)

> 아래는 **이미 결정이 끝났습니다.** 다시 묻지 말고 그대로 실행하세요.

### ✅ KIG-009 — 결정: AI 음성 유지 + "원어민" 표기 전면 삭제 (완료)

- **결정 내용**: 원본 녹음을 되살리지 않고 Azure Ava TTS를 계속 사용합니다.
  대신 **오디오를 원어민 녹음인 것처럼 설명하는 문구를 전부 제거**했습니다.
- **⚠️ 중요 — "AI 음성"이라는 표기도 넣지 않습니다.** 소유자가 명시적으로 지시했습니다.
  음성의 출처를 언급하지 말고 기능만 설명하세요(예: "🔊 음성 듣기", "발음 듣기", "낭독 듣기").
  앞으로 새 문구를 쓸 때도 이 규칙을 지키세요.
- 처리한 것 27곳: `curriculumPresentation.ts` 배지 4 + 부제 1, `courses.ts` 과정 설명 4,
  `LdLearningView` 6, `DialogueLearningView` 4, `CnnLearningView` 2, `ReadingLearningView` 2,
  `StudentLearningView` 2, `KakaoTalkNoticeBanner` 2, `GrammarLearningView`·`ChineseLearningView`·
  `DictationPanel`·`BasicsLearningView`·`speechRecognition.ts` 각 1.
- **일부러 남긴 5곳** — 이건 재생되는 오디오에 대한 주장이 아니라 **영어라는 언어에 대한 설명**입니다.
  지우면 학습 내용이 손상되므로 그대로 두세요.
  `vocaUtils.ts:180`(원어민 강세 위치), `LdLearningView.tsx:851`(원어민 소리의 법칙),
  `LdLearningView.tsx:1111`(실전 원어민 대화 속도), `DialogueLearningView.tsx:1260`(원어민 대화에서 자주 쓰는 표현),
  `listeningUtils.ts:130`(원어민 회화에서 out of 축약).

### ✅ GVA 섹션 폐지 (완료) — §1-A 참조

### 📌 KIG-008 (퀴즈 462레슨) — 다른 AI에게 위임됨

**출처 확인 (소유자 확인, 2026-09-15)**: 이 퀴즈들은 **교재에서 출제된 것이 아니라 AI가 생성한 것**입니다.
그래서 정답이 지문과 맞지 않습니다. 코드의 생성 규칙을 고친다고 해결되지 않으며,
**교재를 근거로 다시 출제하거나 해당 단계를 비노출하는 것** 외에 방법이 없습니다.

소유자가 이 작업을 **별도 AI에게 맡기기로** 했습니다. 인수받는 쪽이 알아야 할 것:

- **범위**: READING 208/256 + LISTENING 254/276 레슨의 1번 문항 정답 키가 지문·스크립트와 무관합니다.
- **원인 코드**: `src/lib/readingUtils.ts:402-683` `generateReadingQuiz()`,
  `src/lib/listeningUtils.ts:332-428` `generateListeningContextQuiz()`.
  정답을 **키워드 부분일치**로 고릅니다(`tEn.includes("art")`가 `start`·`part`·`heart`에 걸림).
  LISTENING은 276개 중 165개가 같은 기본값 하나로 고정됩니다.
- **증거**: `evidence/reading-q1-answer-keys.txt`, `evidence/ld-q1-answer-keys.txt`
  (형식 `레슨|배정된 정답 태그|지문 앞부분`). 전수 판정이 들어 있습니다.
- **⛔ 금지**: 임계값이나 키워드 목록만 손봐서 "고쳤다"고 하지 마세요.
  정답이 지문에서 도출되지 않는 **구조적 문제**입니다.
- **선택지**: (A) 레슨별 문항·정답·해설을 사람이 제작해 `content/`에 두고 생성기를 제거 (4~8주) ·
  (B) 해당 퀴즈 단계를 비노출 (하루). 클로즈 빈칸은 지문에서 직접 나오므로 유지 가능.
- **교재 원본이 Cloudflare R2에 올라가 있습니다** — §7 참조. 문항 제작 시 그 원본을 근거로 쓰세요.

---

## 1-C. 3차 세션 완료분 (2026-09-15)

### ✅ 그룹 A 잔여 1건 (TTS 비공식 API) — 완료 (커밋 `72048dd`)

인앱 브라우저(카카오톡 포함)의 실제 오디오 경로가 `translate.google.com/translate_tts`였습니다.
구글이 문서화도 지원도 하지 않는 엔드포인트를, 구글 자체 웹앱에서 따온 `client=tw-ob` 파라미터로
호출하고 있었습니다. 상용 제품의 소리가 언제 막힐지 모르는 제3자에 의존했고, 그 목소리는
같은 문장을 다른 브라우저에서 들을 때와 달랐습니다.

**해결**: 스트림 엔진이 자체 클립을 재생하고, 클립이 없으면 제3자를 부르는 대신 오류로 끝냅니다.
착수 전에 두 가지가 먼저 참이어야 했고, 지금은 참입니다.

1. **커버리지** — 콘텐츠 클립 1,158개(앞서) + **연음 클립 3,412개**(KIG-015, 아래). `pending: 0`.
2. **키 정합** — 스트림 엔진이 200자 단위로 쪼개 재생했습니다(옛 엔드포인트의 글자 수 상한 때문).
   클립은 **문장 전체** 기준으로 키가 만들어지므로 조각에는 클립이 없습니다.
   `ActiveRun.fullText`를 추가해 전체 문장 클립을 한 번 재생하도록 바꿨습니다.

### ✅ KIG-015 (연음 클리닉 음성) — 완료

연음 카드의 `🔊 소리 청취`는 카드의 `original`("one of", "pick up")을 말하는데, 이 구절 목록은
**어떤 파일에도 없습니다.** `generateLiaisonPoints()`의 런타임 산출물이라 생성 스크립트가 못 봤고,
그래서 3,412개가 클립 없이 브라우저 음성으로 떨어지고 있었습니다.

손으로 목록을 만들면 엔진이 바뀔 때 어긋나므로, `generate-azure-ava.mjs`가 **엔진 자체를 로드해**
(`listeningUtils.ts`를 transpile) 클리닉이 읽는 것과 같은 `ld_english_scripts.json`에 돌립니다.

부수적으로 `--dry-run`도 고쳤습니다. 전체 코퍼스(37,478개 · 126만 자)만 출력하고 **실제 생성 대상을
계산하기 전에 반환**했는데, F0 무료 티어가 월 50만 자 상한이라 그 숫자가 유일하게 중요한 값입니다.
이제 `pending` 개수와 그 글자 수를 먼저 출력합니다.

### ✅ CNN — 폐지 예정 (소유자 결정, 2026-09-15)

CNN은 `shouldUseUnifiedSpeech()`에서 제외되어 자체 클립이 없습니다. 따라서 인앱 브라우저에서
CNN 낭독 버튼은 이제 "음성 없음"이 됩니다(일반 브라우저는 자체 음성 합성으로 정상).

소유자가 **"CNN은 어차피 닫을 페이지"** 라고 확인했습니다. 따라서 이것은 고칠 결함이 아닙니다.
CNN 클립을 생성하지 마세요. CNN 관련 QA 시간도 쓰지 마세요.

### ⚠️ 비밀값 교체 필요 (미처리)

2026-09-15 작업 중 `.env.local`이 스크린샷으로 노출되었습니다. 아래 값이 대화 기록에 남았습니다.
**소유자가 교체해야 합니다.**

| 값 | 조치 |
|---|---|
| `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` (`kig-reading-upload`, All buckets R/W) | Cloudflare에서 토큰 재발급 후 `.env.local`·Vercel 갱신 |
| `ADMIN_PIN` · `ADMIN_SESSION_SECRET` | 새 값으로 교체 |

R2 토큰은 **모든 버킷 읽기·쓰기** 권한이라, 유출되면 방금 잠근 버킷이 무의미해집니다.

---

## 2. 남은 이슈 (19건)

### ✅ 그룹 A — 전부 완료 (2026-09-15, 3차 세션)

TTS 비공식 API(마지막 1건)가 해결되어 그룹 A는 남은 것이 없습니다. 상세는 §1-C를 보세요.

### 그룹 B — 코드 중규모 (4건)
KIG-005(GRAMMAR 채점 단어단위 유사도), KIG-006(대안 정답 스키마+채점), KIG-014(진도 API 챕터 검증), KIG-022(검색 인덱스)

### 그룹 C — 데이터 소규모 (9건, 리포 데이터만으로 가능)
KIG-010, 012, 017, 020, 021, 023, 025, 026, 027

### 그룹 D — 대량 육안검수 (3건)
KIG-016(어휘 품사·뜻 303건), KIG-028/030(힌트 누락 53레슨), KIG-029(번역 부분 상이 87레슨)

### 그룹 E — 사람·외부 의존 (3건 남음)
| 이슈 | 막히는 이유 |
|---|---|
| KIG-008 (462레슨 퀴즈 정답키) | 퀴즈가 **AI 생성물**이라 교재 기준 재출제가 필요합니다. **최대 병목** |
| KIG-003 (LISTENING 119레슨) | R2 음성으로 STT는 가능하나 **원어민 검수** 필요 |
| KIG-004 (VOCA 뜻 361개) · KIG-007 (gh1-020 답 8개) | **교재 원본** 필요 |

> **교재 원본은 Cloudflare에 없습니다 (2026-09-15 확인).** `k-iglab` 버킷 전체를 열거한 결과
> `audio/`, `video/`, `private/license-records/`(이용권 JSON 2개)뿐입니다.
> 소유자가 **2026-09-16에 별도 보관처에서 가져오기로** 했습니다. 그 전까지 KIG-004·007·008은 착수 불가.
> 도착하면 소유자와 함께 진행할 예정이므로, **인수받는 AI는 이 3건을 건드리지 마세요.**

> ~~KIG-009 (원어민 음성 표기)~~ → 완료 (§1-B)
> ~~KIG-015 (연음 음성 3,403개)~~ → 완료 (§1-C)

---

## 3. 다음 착수 순서 (권장)

> ### ⛔ 이미 완료된 이슈 — 재작업 금지
> 1차: `KIG-001`(984a553) · `KIG-002`(37d2a26) · `KIG-011`(2f8a97e) · `KIG-018`(c50a9ea) · `KIG-024`(efe57da) · `KIG-013`(e83b8ae)
> 2차: `KIG-019`(5bec3b9) · `KIG-031`(1283492) · `KIG-032`(d5a52da) · `KIG-033`(c57b7f3) · `KIG-034`(3f7fc04) · `KIG-035`(afb573f) · `KIG-036`(ee3cbe0) · favicon(6af9c69) · 레슨 수(a088969) · GRAMMAR 정답 노출(1bec0f5) · LISTENING 선택 변경(ca7ea4f)
> 3차: `KIG-009`(0335ab0) · `KIG-015`+그룹A 잔여(`72048dd`) · GVA 폐지(`276630e`) · 미디어 게이트(`91cc15b`…`4d7a4f7`) · Azure 클립(`bbae053`)
> 위 22건은 §1·§1-B·§1-C에 검증 결과까지 기록되어 있습니다. 다시 손대지 마세요.

### 남은 이슈 (19건)

1. **그룹 B** — KIG-005(채점) → KIG-006(스키마) → KIG-014(진도 API) → KIG-022(검색). **여기서 시작하세요.**
2. **그룹 C** — KIG-010, 012, 017, 020, 021, 023, 025, 026, 027. KIG-002와 같은 패턴이라 검증 스크립트 재사용 가능
3. **그룹 D** — KIG-016(303건), KIG-028/030(53레슨), KIG-029(87레슨). 자동화로 플래그 추출 후 사람 판단
4. **그룹 E** — KIG-003, 004, 007, 008. **착수 금지.** 교재 원본이 도착하면 소유자가 직접 진행합니다.

> README 규칙 2에 따라 이슈마다 확인을 받아야 합니다. 승인을 묶어주면(예: "B그룹 4건 진행") 훨씬 빠릅니다.

### ⚠️ 텍스트를 바꾸면 음성 클립도 다시 구워야 합니다

그룹 C·D는 문장·단어 텍스트를 건드립니다. 클립은 **텍스트 해시로 키가 정해지므로**, 텍스트가 바뀌면
그 문장의 클립은 존재하지 않게 됩니다. KIG-002가 정확히 이 방식으로 READING 음성을 40.6%까지
떨어뜨렸습니다. 텍스트를 수정한 커밋에서는 **반드시** 아래를 함께 실행하세요.

```bash
node scripts/generate-azure-ava.mjs --dry-run   # pending 확인 (F0 무료 티어: 월 50만 자)
node scripts/generate-azure-ava.mjs --concurrency 4
node scripts/upload-azure-ava-r2.mjs
```

`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`과 R2 자격증명은 `.env.local`에 있습니다(자동 로드되지
않으므로 셸에 넣어야 합니다). 끝나고 `--dry-run`이 `pending: 0`인지 확인하세요.

### ⚠️ 대시보드 UI 이슈는 자동 검증 불가
`/[course]` 목록 페이지의 카드가 headless 브라우저에서 렌더되지 않습니다(§4 참조). 대시보드 카드 관련 수정(KIG-013 완료분 포함)은 **사람이 직접 화면을 확인**해야 합니다. 자동화가 "수정 완료"로 보고해도 화면 확인은 별개입니다.

---

## 4. 환경 함정 (재발 방지 — 시간 절약용)

### 🔴 Tailwind 클래스가 CSS에 반영되지 않는다 (2차 세션에서 30분 소모)
**새로 추가한 Tailwind 유틸리티/변형(`xl:`, 새 arbitrary 값 등)이 dev 서버 CSS에 절대 나타나지 않습니다.**
Turbopack이 PostCSS(Tailwind) 변환 결과를 `globals.css`의 **내용 해시** 기준으로 캐시하기 때문으로 보입니다.
다른 파일(`.tsx`)만 바뀌면 Tailwind의 스캔 결과가 갱신되지 않습니다.

- 증상: 클래스는 HTML에 있는데 `getComputedStyle`은 이전 값을 반환. `xl:flex`를 넣었는데 `display: none` 그대로.
  (`xl:flex`가 CSS에 0건, `md:flex`는 2건 — 즉 이전 상태가 그대로 서빙됨)
- **`touch globals.css`는 효과 없습니다**(내용이 같으면 해시가 같음). dev 서버 재시작도 효과 없습니다.
- **해결: `globals.css`의 내용을 실제로 바꿔야 합니다.** (예: 주석 한 줄 추가 → 저장 → 확인 → 되돌리기)
  되돌리면 다시 재생성되므로, 최종 커밋에는 globals.css 변경이 남지 않습니다.
- 확인 방법: `curl -s http://localhost:3100/_next/static/chunks/<css>` 후 `grep -c 'xl\\:'`
- **주의**: 이미 다른 곳에서 쓰이는 클래스(`grid-cols-3`, `sm:grid-cols-5` 등)는 CSS에 이미 있으므로
  반영된 것처럼 보입니다. **정말 새로 만든 클래스로만** 캐시 여부를 판별하세요.

### ⚠️ 브라우저 검증 시 필수 — Next dev origin 제한
**dev 서버는 반드시 `http://localhost:<port>` 로 접속하세요. `http://127.0.0.1:<port>` 로 접속하면 Next 16의 dev origin 검사에 걸려 클라이언트 리소스가 로드되지 않고, React가 하이드레이션되지 않습니다.**

### ⚠️ 알려진 환경 제약 — headless 브라우저에서 대시보드 카드 목록이 렌더되지 않음
`/[course]` 목록 페이지의 레슨 카드가 headless Edge 에서 **DOM 에 생성되지 않습니다.** (§1 1차 세션 참조)

### ⚠️ dev 서버가 모든 라우트에 404 를 반환할 때
`.next` 캐시가 꼬이면 `/` 를 포함한 **모든 경로가 404** 가 됩니다 → `rm -rf .next` 후 재기동.

### 브라우저 검증 방법 (동작 확인됨)
`docs/qa-2026-09-15/scripts/ui-harness.cjs` 의 CDP `Tab` 패턴을 재사용하면 됩니다. headless Edge + `--remote-debugging-port`.
- **백그라운드 실행은 반드시 `run_in_background: true` 로.** `(cmd &)` 형태로 띄우면 툴 호출이 끝날 때 프로세스가 함께 죽어 다음 요청이 502가 됩니다.
- Node 22의 전역 `WebSocket`으로 CDP에 붙을 수 있습니다(별도 `ws` 패키지 불필요).
- 요청 차단은 CDP `Fetch.enable` + `Fetch.failRequest(errorReason: "BlockedByClient")`.
- **dev 모드는 라우트를 온디맨드 컴파일**하므로 검증 전에 대상 URL을 curl로 예열하고, 하이드레이션 대기를 넉넉히(15초 이상) 잡으세요.
- **검증 테스트는 "수정을 되돌리면 실패하는지"까지 확인하세요.** 2차 세션은 모든 항목을 **운영(수정 전 빌드)에 같은 프로브를 돌려** 검출력을 증명했습니다. 이 방법이 가장 빠르고 확실합니다.
- **`innerText`는 `text-transform`을 반영합니다.** `uppercase`가 걸린 라벨은 `모범 답안 (Model Answer)`가 아니라 `모범 답안 (MODEL ANSWER)`로 나옵니다(1회 오진).
- `getComputedStyle`/`innerText` 판정이 애매하면 `Page.captureScreenshot`.

### 검증 시 주의
- **probe3·crawl의 substring probe는 오탐이 난다.** (CSS 클래스명·meta 태그 충돌)
- **`build-reading-voca.mjs`는 256개 전부 재생성한다.** → 되돌릴 것
- **`-1` 레슨의 `id`는 `"pr026-1"`** (베이스 id 아님). 범위 판정 시 `id.replace(/-1$/,'')` 로 정규화할 것
- **레슨 수를 셀 때 `-1` 제거로 세면 안 된다.** `m1-1`처럼 `unit-part` 과정은 dash 뒤 숫자가 "스크립트 짝"이 아니라 "파트"다. **`variant === "main"` 으로 셀 것**
- 리포 JSON 관례: **끝에 개행 없음** (JSON 수정 시 원문 텍스트 치환으로 개행을 보존할 것)

### 빌드·설치
- **샌드박스는 pnpm 심볼릭 링크 생성을 차단한다.** → `pnpm install --force --config.node-linker=hoisted`
- **`pnpm run <script>`는 실행 전 자동 재설치로 링커 설정을 되돌린다.** → `./node_modules/.bin/next dev`
- **`.next`가 채워져 있으면 `next build`가 무한 대기한다.** → `rm -rf .next` 후 빌드 (삭제와 빌드를 **분리**)
- dev 서버를 강제 종료하면 `.next/dev/types/routes.d.ts`가 잘려 `tsc`가 깨짐 → 재기동으로 재생성
- **dev 서버가 종료되지 않고 포트를 계속 잡는 경우가 있다.** `netstat -ano | grep ":3000"` → `MSYS_NO_PATHCONV=1 taskkill /F /PID <pid>`
- **QA 스크립트의 하드코딩 경로**: `probe3.cjs`·`crawl-prod.cjs`의 출력 경로는 `C:/Users/ghddl/AppData/Local/Temp/kq/out` → **디렉터리를 미리 만들어두면 수정 없이 실행 가능**
- `crawl-prod.cjs`는 `docs/qa-2026-09-15/scripts/out/`에 결과를 씀 (mkdir을 안 함) → 미리 만들어둘 것
- `audit-data.cjs`는 `scripts/out/`에 직접 mkdir 하므로 그냥 실행 가능

---

## 5. 재사용 자산

### 1차 세션
> ⚠️ 1차 세션의 `.tmp-kig/`는 워크스페이스가 교체되면서 **소실**되었습니다. 아래는 기록만 남깁니다.

| 자산 | 위치 |
|---|---|
| KIG-001 검증 (7코스 42건) | `.tmp-kig/verify-kig001.cjs` (워크스페이스, 소실) |
| KIG-001 이용권 경로 검증 | `.tmp-kig/verify-licensed.cjs` (소실) |
| KIG-002 재생성 / 최종 / 화면 검증 | `.tmp-kig/rebuild-reading-sentences.cjs`, `verify-kig002-final.cjs`, `verify-kig002-visual.cjs` (소실) |
| KIG-001 크롤 증거 | `docs/qa-2026-09-15/scripts/out/prod-crawl.json` (미커밋) |

### 2차 세션 — **리포에 커밋됨** `docs/qa-2026-09-15/scripts/verify/`
> 1차 세션의 자산이 워크스페이스와 함께 사라진 것을 보고, 2차 세션 스크립트는 **리포에 커밋**했습니다.
> 상단 `REPO` 상수만 고치면 그대로 재사용 가능. 결과 JSON은 `docs/qa-2026-09-15/scripts/out/`에 씁니다.

| 자산 | 대상 | 실행 |
|---|---|---|
| `probe-kig019.cjs` | VOCA 퀴즈 복수정답 (전 레슨, 120회 반복 생성) | `node probe-kig019.cjs out.json` |
| `verify-kig019.cjs` | 195레슨 349,860문항 보기 4개/중복/플레이스홀더 전수 | `node verify-kig019.cjs` |
| `verify-kig033.cjs` | Leitner 상태기계 — **`11ef719`(수정 전) 구현을 git에서 로드해 양쪽 비교** | `node verify-kig033.cjs` |
| `verify-kig034-035.cjs` | 브라우저: WPM 상한 + 어휘 카드 번호 | `node verify-kig034-035.cjs <base>` |
| `verify-kig036.cjs` | 브라우저: 768~1600px 상단 내비 / 375px 단계 탭 잘림 | `node verify-kig036.cjs <base>` |
| `measure-kig036.cjs` / `sweep-kig036.cjs` | 레이아웃 잘림 계측기 (뷰포트별) | `node sweep-kig036.cjs <base>` |
| `verify-count.cjs` | 8개 섹션 페이지 레슨 수 | `node verify-count.cjs <base>` |
| `verify-grammar-reveal.cjs` | GRAMMAR Step1/Step2 정답 노출 격리 (3 시나리오) | `node verify-grammar-reveal.cjs <base>` |
| `verify-ld-quiz-lock.cjs` | LISTENING Step1 정답 공개 후 선택 잠금 | `node verify-ld-quiz-lock.cjs <base>` |
| `make-favicon.cjs` | `src/app/icon.svg` + `favicon.ico` 재생성 | `node make-favicon.cjs` |

> 모든 브라우저 프로브는 `<base>` 인자에 운영 URL을 넣어 **수정 전 빌드에서 실패하는지**를 함께 확인하도록 만들었습니다.
> 2차 세션은 전 항목을 이 방식으로 검증했고, 배포 후 운영 URL로 다시 돌려 10/10·5/5 통과를 확인했습니다.

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

### 무료 레슨 ID (검증 시 로그인 없이 사용)
`student: s1-1, s1-2` · `phonics: mv1-01, mv1-02` · `grammar1: gh1-006~009` · `grammar2: gh2-007, gh2-008` · `ld: d001, d002` · `reading: pr001, pr002` (+ 각 `-1`)

---

## 6. 배포·커밋 정보

- `main`에 push하면 Vercel이 자동 배포 (푸시 후 60초 내 반영 확인됨)
- git 자격증명이 저장되어 있어 push 가능 (`gh` CLI는 미로그인 상태지만 불필요)
- 샌드박스 특이사항: `.git/refs/remotes/origin/` 하위 파일 생성이 차단되어 `git status`가 `[gone]`으로 표시됨. **표시 문제일 뿐 push/fetch는 정상**
