# K-IG CORE QA 작업 진행 상황

> 이 문서는 **세션이 바뀌어도 작업을 그대로 이어받기 위한** 인수인계 기록입니다.
> 작업 지시 원본은 `docs/qa-2026-09-15/README.md`, 재개용 프롬프트는 `PROMPT.md`를 보세요.
> 최종 갱신: 2026-09-16 (6차 세션 — `NEXT-SESSION.md` §A 4건 완료 · 커밋 `3e82465`)
> ⚠️ `PROGRESS.md` 와 `NEXT-SESSION.md` 가 충돌하면 **`NEXT-SESSION.md` 가 우선**입니다.

---

## 0. 새 세션에서 재개하는 방법

이 작업은 **여러 AI가 이어서** 합니다. 대화 기록은 넘어가지 않고 **레포에 커밋된 것만 남습니다.**

### 이어받을 때 — 새 세션 첫 메시지

```
docs/qa-2026-09-15/PROMPT.md 를 읽고, 그 안에 적힌 지시대로 작업을 시작해줘.
읽은 내용을 먼저 요약해서 보여주고, 다음에 할 이슈의 계획을 코드 인용과 함께 제시한 다음 내 승인을 받아.
```

작업 사본 경로: `C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE` (음성 클립과 `.env.local`이 여기에만 있으므로 **새로 클론하지 말 것**)
운영: <https://k-ig-core.vercel.app>

### 넘겨줄 때 — 세션을 끝내기 전 마지막 메시지

```
작업을 다른 AI에게 넘겨야 해. 인수인계 정리해줘.
PROGRESS.md 에 (1) 이번에 완료한 이슈와 커밋 해시·검증 수치, (2) 작업 중이던 이슈와 어디까지 했는지,
(3) 새로 발견한 결함, (4) 막힌 것과 이유, (5) 다음 사람이 바로 이어받을 지점을 적어줘.
반쯤 고친 코드는 완성하거나 되돌리고, 검증 스크립트는 scripts/verify/ 에 커밋하고,
마지막에 git push origin main 까지 해줘.
```

푸시가 끝났는지 `git log --oneline origin/main -1`로 확인하세요. **푸시되지 않은 작업은 사라집니다.**

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

### ✅ 그룹 B 착수 — KIG-005 (GRAMMAR 채점) 완료

`GrammarLearningView.tsx`의 부분점수 판정이 `model.includes(user)`(부분문자열)이라
**한 글자 입력이 부분정답(70점)**이었습니다. 실제 데이터로 측정한 규모가 README 기재보다 훨씬 큽니다.

| 과정 | 문항 | `a` | `e` | `you` | 영향 레슨 |
|---|---:|---:|---:|---:|---:|
| GRAMMAR I | 4,082 | 1,497 | — | 536 | 93 / 148 |
| GRAMMAR II | 796 | 788 | — | 181 | **44 / 44 (전부)** |

**조치**: 부분점수를 **LCS(최장 공통 부분수열) 비율**로 계산하는 `gradeAnswer()` 도입.
```ts
const ratio = lcsRatio(uw, mw);
if (uw.length > 1 && ratio >= 0.7 && uw.length <= mw.length * MAX_ANSWER_LEN_RATIO) {
  return "partial";
}
return "incorrect";
```
- **`uw.length > 1`** — 한 단어/한 글자는 절대 부분정답 불가.
- **`MAX_ANSWER_LEN_RATIO = 1.15`** — 정답을 본 뒤 채워 넣는 것을 차단.
  실측: 1.4는 476건 통과, 1.15는 2건. 오타 유지 5,312건은 그대로.
- 집합 교집합을 쓰지 않은 이유: 집합은 **순서와 중복을 버려서** `"a a a a"` 도배와 어순 뒤섞기가 만점 처리됩니다.

**검증** (`docs/qa-2026-09-15/scripts/verify/`):
| 스크립트 | 내용 |
|---|---|
| `verify-kig005.cjs` | 모범답안 6,236개 전수. `GrammarLearningView.tsx`에서 **`gradeAnswer`를 소스 추출**해 검사하므로 로직 드리프트 시 실패. 공격 5종 + 오타 유지. |
| `verify-kig005-browser.cjs` | headless Edge. `/grammar1/gh1-006` Step 4 실조작. |

공격 5종 전부 **0건** (수정 전 → 현재):
`a` 4,696→0 · `e` 5,818→0 · `you` 1,578→0 · 단어도배 0→0 · 어순역순 0→0
오타 유지 5,312건 유지 · 모범답안 exact 실패 0건.

**검출력 증명**: 부분 판정을 `model.includes(user)`로 되돌리면 같은 스크립트가 **FAIL 7건, exit 1**
(`a` 4,696 / `e` 5,818 / `you` 1,578 / 오타 0건). 브라우저 프로브도 **5/5 PASS**.

⚠️ **참고 — 알려진 한계 2건 (수정 불가)**
- `어순 역순` 90/6,234건: `"i am not happy am i"` 같은 부호의문문은 **거의 회문**입니다.
  역순 입력이 실제로 원문 어순의 83%를 보존하므로, 어떤 순서 기반 지표도 정상 답안을 해치지 않고는 못 걸러냅니다.
- `모범답안+도배` 2/6,236건: 자기반복이 심한 장문에 정답 전문을 쓴 뒤 채운 경우. 정답을 이미 아는 입력이라 채점으로 막을 대상이 아닙니다.

**사운드 영향 없음** — 채점 로직만 변경, 텍스트 불변 → 클립 재생성 불필요.

**부수 발견 → README에 `KIG-006-a`로 등록**: `isEnglish()`가 라틴/한글 **문자 수 비교**라
괄호 안에 영어가 섞인 한국어 문장이 영어로 오판되고, 그 결과 **모범답안 자리에 한국어가 들어가는**
문항이 생깁니다. KIG-006(대안 정답 스키마)과 **같은 커밋**에서 처리하도록 지시를 적어 두었습니다.

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

## 1-D. 4차 세션 완료분 (2026-09-15~16) — 그룹 B 3건 + KIG-006 엔진 완성

> **⚠️ 이 세션의 가장 중요한 사실: `content/` 에 한 글자도 쓰지 않았습니다.**
> 내일(2026-09-16 이후) 원본 아카이브로 재추출하면 `scripts/extract.mjs:465` 가 레슨 JSON 을
> 통째로 덮어씁니다. 지금 `content/` 에 대안 정답을 심어봐야 **재추출 한 번에 전부 사라집니다.**
> 그래서 이번 세션은 **재실행 가능한 스크립트(`apply-kig006.cjs`)까지만** 만들고 멈췄습니다.
> → 아카이브 대조 계획은 `docs/qa-2026-09-15/ARCHIVE-PLAN.md` 참조.

### ✅ RE-009 — 검색 인덱스에 STUDENT 누락 (KIG-022) — 커밋 포함

`scripts/buildSearchIndex.ts` 의 `courses` 배열에 `{ slug: "student", title: "STUDENT" }` 추가 +
searchText 키워드 절 추가.

**검증 수치**: 인덱스 항목 **944 → 1,025** (정확히 +81 = STUDENT 레슨 81개 전체).
`public/search-index.json` 재생성 후 커밋.

### ✅ RE-010 — 진도 API 챕터 건너뛰기 (KIG-014) — 커밋 포함

`src/lib/studentProgress.ts` 에 `chapterIndexByLesson()` 추가. `updateStudentProgress` 와
`mergeLegacyStudentProgress` **양쪽 모두**에 도달 가능 챕터 상한을 강제했습니다.

```js
const chapterOf = chapterIndexByLesson();
const reachable = () => clampChapter(record.unlockedThrough) + 1;
...
if (chapter !== undefined && chapter > reachable()) continue;   // 상한 초과분 폐기
```

- `updateStudentProgress`: 갱신마다 창(window) 재계산 → 순차 해제 유지
- `mergeLegacyStudentProgress`: 임포트 **직전 스냅샷 1개**로 상한 고정 → 레거시 데이터가 앞질러도 차단

### ✅ RE-011 / RE-012 — canonical 중복 + OG 태그 부재 — 커밋 포함

canonical 이 전역 `"/"` 로 박혀 있어 **모든 페이지가 홈의 중복 문서**로 신고되고 있었습니다.

| 파일 | 변경 |
|---|---|
| `src/app/layout.tsx` | 전역 `alternates:{canonical:"/"}` **삭제**, `openGraph` + `twitter` 추가 |
| `src/app/page.tsx` | 홈 전용 `canonical:"/"` 명시 |
| `src/app/[course]/page.tsx` | 과정별 `canonical:"/${course}"` + OG/Twitter, `COURSE_OG_IMAGE` 맵 |
| `src/app/[course]/[lesson]/page.tsx` | 레슨별 `canonical:"${course}/${id}"` + OG/Twitter |

- OG 이미지는 `/images/sections/` 의 **실재하는** 파일만 사용 (참조하려던 `hero.jpg` 는 없었음)
- `COURSE_OG_IMAGE`: phonics→voca.jpg, grammar1→grammar1.jpg, grammar2, ld, reading, cnn, student→students.jpg, chinese

**검증**: `npx tsc --noEmit` clean · `pnpm run build` 성공 (4분 29초, 전 라우트 정상 생성)

### ✅ KIG-006 — 괄호 대안 정답 엔진 (선택 삽입 한정사 부류 완성)

> 이 세션의 본체. 사용자가 지적한 **4건이 깨져 있었고**, 원인은 3갈래였습니다.

**사용자가 보고한 4건 (수정 전 → 수정 후)**

| EN 원문 | 주정답 (전) | 문제 | 주정답 (후) | 대안 (후) |
|---|---|---|---|---|
| `He is (a) Korean, isn't he?` | `He is Korean, isn't he?` ✅ | 대안이 `He a Korean…` — **`is` 소실** | 동일 | `He is a Korean, isn't he?` |
| `She was (an) American, wasn't she?` | `She was American…` ✅ | 대안이 `She an American…` — **`was` 소실** | 동일 | `She was an American, wasn't she?` |
| `Is that (the) car yours?` | `Is that car yours?` ✅ | 대안 `Is the car yours?` — **`that` 이 `the` 로 치환** | 동일 | **없음** (`that`+`the` 비문) |
| `All (the) boys receive a prize(혹은 prizes).` | `All the boys receive a prize.` ❌ | `the` 잔존 | `All boys receive prizes.` | `All boys receive a prize.` / `All the boys receive a prize.` / `All the boys receive prizes.` |
| `(The) Palestinians and (the) Israelis must act.` | `The Palestinians and the Israelis must act.` ❌ | `the` 잔존 | `Palestinians and Israelis must act.` | 교차곱 3종 |

**원인 3갈래 (사용자 진단 정확했음)**

1. `resolveMultiParen` 은 **괄호 2개 이상** 경로만 처리 → 단일 괄호는 손대지 않음
2. 단일 괄호는 `propose()` 의 SUBSTITUTE 분기로 떨어져, span 정렬기가 **한 토큰 왼쪽으로 밀려 앞 단어를 삼킴**
3. `All (the) boys …(혹은 prizes)` 는 마커 때문에 `wasMarker=true` → `optionalDet` 조건 `!t.wasMarker` 에 걸려 미발동

**수정: 전용 레인 `resolveOptionalDeterminers(en)` 신설**

한정사 처리를 `propose()` · `resolveMultiParen` 에서 **분리해 단일 레인이 소유**하게 했습니다.
`resolveMultiParen` 진입부와 `propose()` **첫 분기**에 배선했습니다.

```js
function isDetachedDeterminer(t) {          // 띄어쓴 단일 한정사만 (접착형·2단어 제외)
  if (t.glued || !t.inner) return false;
  const words = t.alt.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return false;
  return DETERMINER.has(norm(words[0]));
}
```

- **주정답 = bare** (괄호 안 한정사를 뺀 형태). 저자의 괄호 표기는 "선택사항"이라는 뜻이므로
  한정사가 빠진 형태가 기본형입니다. 한국어 프롬프트가 이를 확증합니다.
- **대안 = 유지(kеep) 부분집합의 교차곱** — `detSubsets × otherSubsets`, **많이 유지한 것 우선**

```js
const ordered = [];
for (const dk of subsets(wantDet).sort((a,b)=>a.length-b.length))
  for (const ok of subsets(otherIs).sort((a,b)=>a.length-b.length)) ordered.push([...dk, ...ok]);
ordered.sort((a, b) => b.length - a.length);
```

> 이전 구현은 `detDrops.filter(d => d.length !== wantDet.length)` 로 **버리는 집합**을 인코딩해서
> `[]` 와 `[0]` 을 동시에 지웠습니다. 그래서 `All boys receive a prize.` 에 도달할 수 없었습니다.
> **버릴 것이 아니라 "무엇을 유지할지"의 교차곱**으로 뒤집어 해결했습니다.

**`isInsertableDeterminer` — 앞 단어가 한정사면 삽입 불가**

```js
function isInsertableDeterminer(t, en, start) {
  const before = en.slice(0, start).replace(/[\s([{]+$/, "");
  const prevWord = (before.match(/([A-Za-z']+)$/) || [])[1];
  if (!prevWord) return true;                      // 문두
  const prev = norm(prevWord);
  if (!DETERMINER.has(prev)) return true;          // 일반 명사/전치사 자리
  return PREDETERMINER.has(prev) && !POSSESSIVE.has(prev);
}
const PREDETERMINER = new Set(["all","both","half","such","quite","rather","exactly",
  "just","nearly","almost","many","most","few","fewer","several","enough"]);
const POSSESSIVE = new Set(["my","your","his","her","its","our","their","one's",
  "this","that","these","those"]);
```

- `All`(전치한정사) 뒤에는 `the` 삽입 **가능** → `All the boys`
- `that`(지시사) 뒤에는 `the` 삽입 **불가** → `Is that (the) car yours?` 는 대안 0건
- `some/any/no/every/each` 는 **전치한정사가 아님**(`some the people` 비문) → 의도적 제외

**부수 수정 — `auxBase` 접두 매칭 오류**

`She was an American, wasn't she?` 에서 `American` 의 접두 `am` 이 조동사로 오인되어
**거짓 AUX AGREEMENT FAIL** 이 났습니다. 양끝을 고정하고 축약형을 명시 매핑했습니다.

```js
const auxBase = (w) => {
  const raw = norm(w);
  const s = raw === "can't" ? "can" : raw === "won't" ? "will" : raw.replace(/n'?t$/, "");
  const m = s.match(/^(am|is|are|was|were|be|being|been|do|does|did|have|has|had|will|would|shall|should|can|could|may|might|must)$/);
  return m ? m[1] : null;
};
```

> `norm` 이 아포스트로피를 **보존**하므로 `/n'?t$/` 가 `can't` 에 안 걸립니다. `can't`/`won't` 는
> 불규칙이므로 명시 매핑했습니다.

**부수 수정 — 문두 대문자화 위치 이동**

`joinReplacement` 에 넣었던 대문자화 규칙이 `All` 의 `l` 을 먹어 `"T boys receive a prize."` 를
만들었습니다(`\s*` 가 **0칸**을 매칭). 규칙을 **삭제**하고, 치환이 모호하지 않은 `substitute()`
지점으로 옮겼습니다.

```js
const atHead = !head.trim();
const sub = atHead && /^[a-z]/.test(v) ? v[0].toUpperCase() + v.slice(1) : v;
```

### ✅ KIG-006 신규 검증 2종 (사용자 요구)

**(6) 선택 삽입 보존 (conservation)** — 사용자 지시: *"대안의 단어 수가 주정답보다 줄면 안 됨"*

**`9 alternatives, 0 shortenings.`** 띄어쓴 한정사(선택 삽입)에서 나온 대안은 주정답보다
**늘어나거나 같아야** 합니다. 줄어드는 대안이 하나도 없습니다.

> 주의: 이 규칙은 **띄어쓴 한정사에만** 적용됩니다. `take part(participate)` 처럼 **접착형**
> 다단어 치환은 구→구 치환이므로 단어 수가 줄 수 있고, 이는 정상입니다.

**(7) 주정답 ↔ 한국어 프롬프트 일치표** — 사용자 지시: *"주정답이 짝 페이지의 한국어와 일치하는지 표로 출력"*

`evidence/kig006-korean-concordance.md` 에 13행 표로 출력했습니다. 판정 보류(REVIEW) 7건은
사람이 검토했고, 표 하단에 판정 근거를 적었습니다.

**핵심 판별 규칙**: 한국어의 그/저 가 **한정사**(뒤에 명사)인지 **대명사**(그것·그가·그는·그들)인지.

```js
const KO_PRONOUN_TAIL = /^(것|가|는|를|들|녀|에게|와|과|도|만|곳|때|래|런|렇게|저|럼)/;
function koreanWantsDeterminer(ko) {          // 대명사 꼬리면 한정사 아님
  const s = (ko || "").replace(/\(.*?\)/g, "");
  const re = /(^|[^가-힣])(그|저|이|어느)([가-힣]*)/g;
  let m;
  while ((m = re.exec(s))) { if (!KO_PRONOUN_TAIL.test(m[3] || "")) return true; }
  return false;
}
```

> 처음엔 단순 정규식이라 `그것/그가` 의 `그` 를 한정사로 오인해 **거짓 REVIEW 9건**이 났습니다.
> 대명사 꼬리 목록으로 걸러 **7건**으로 줄였고, 7건 모두 **bare 주정답이 한국어와 일치**함을 확인했습니다.
> 한정사를 주정답에 넣어야 할 행은 **0건**입니다.

**4건이 깨진 진짜 이유 (요약)**: 괄호가 2개 이상인 경로만 고쳐졌고(단일 괄호 미처리),
선택 삽입 대안의 span 정렬기가 앞 단어를 삼켰습니다. 전용 레인 분리로 둘 다 해결했습니다.

### ✅ `apply-kig006.cjs` — 재실행 가능한 이식 스크립트 (사용자 지시)

> *"apply-kig006.cjs 로 재실행 가능한 스크립트만 남겨줘"*

**`docs/qa-2026-09-15/scripts/apply-kig006.cjs`** — 오늘 `content/` 에 쓰지 않기 위해 만든
유일한 이식 경로입니다.

| 항목 | 내용 |
|---|---|
| 기본 동작 | **dry-run (아무것도 쓰지 않음)** |
| 실행 | `node docs/qa-2026-09-15/scripts/apply-kig006.cjs` (확인) / `… --write` (적용) |
| 과정 필터 | `--course grammar1` 등 |
| 엔진 출처 | `report-kig006.cjs` 를 `(6) OPTIONAL-INSERT CONSERVATION` 지점에서 **슬라이스해 import** (구현 1벌 유지) |
| 대상 판정 | 한글 없는 영어 답 + 괄호 포함 |
| 테스트 훅 | `KIG_ROOT_OVERRIDE=<경로>` 로 복사본에 대고 쓸 수 있음 |

```js
const HAS_HANGUL = /[\uAC00-\uD7AF]/;
const isEnglishAnswer = (s) =>
  typeof s === "string" && s.length > 0 && !HAS_HANGUL.test(s) && hasParen(s);
```

**dry-run 결과 (재현 확인)**

```
lesson files read  : 3031
sentence items     : 12358
already clean      : 12061
items to rewrite   : 297
    grammar1     243
    grammar2     29
    student      25
```

**멱등성 검증**: 복사본에 1회 `--write` → 6건 기록, 2회차 → **0건 기록**, `md5sum` **바이트 동일**.
즉 여러 번 돌려도 안전합니다.

### ⏸️ gh1-032/033 재정렬 — 보류 (사용자 지시)

> *"gh1-032/033 재정렬도 내일까지 보류."*

**진단 문서만** 남기고 실제 이동은 하지 않았습니다:
`docs/qa-2026-09-15/evidence/gh1-032-033-realignment-diagnosis.md`

15칸 이동이 필요하다는 진단까지 나왔으나, 셀 대응 관계를 **아카이브로 확정하기 전에는
추론하지 않는다**는 규칙에 따라 멈췄습니다. 열린 질문 4건과 재개 지점을 문서에 적었습니다.

### 검증 총괄 (이 세션 최종 상태)

| 검증 | 결과 |
|---|---|
| multi-paren 행 | **14 / 14 pass** |
| expected-value 제안 | **19 / 19 pass** |
| 말뭉치 한정사 행 | **47 / 47 pass** |
| paren-residue (괄호 잔존) | **0** |
| terminator-consistency (문장부호) | **0** |
| auxiliary-agreement (조동사 일치) | **0** |
| **optional-insert conservation** | **9 alternatives, 0 shortenings** |
| **Korean concordance** | 13행, REVIEW 7건 → **전부 bare 주정답으로 판정** |
| fragment guard | 172행 × 6 프로브, **오수용 0** |
| `npx tsc --noEmit` | clean |
| `pnpm run build` | **성공** |
| `apply-kig006.cjs` dry-run | **297건**, 미해결 0 |
| **`content/` 변경** | **0건** ✅ |

---

## 1-E. 5차 세션 완료분 (2026-09-16)

> ⚠️ 이 세션은 **`NEXT-SESSION.md` 를 정본으로 따랐습니다.** 그 문서 §C 가 `content/` 쓰기를
> 금지하므로, `PROGRESS.md` §3 의 그룹 C(KIG-010·012·017·020·021·023·025·026·027) **9건 중 8건은
> 착수 불가**입니다(전부 `content/` 수정). 그래서 `NEXT-SESSION.md` §B 대기열의 첫 미착수 항목을
> 처리했습니다. 이 판단의 근거는 §3 머리의 표를 보세요.

### ✅ RE-011 / RE-012 잔여 — `/t/[tab]` · `/student/[lesson]` 의 canonical + OG (NEXT-SESSION A-5) — 커밋 `fd5acf0`

`REAUDIT-2026-09-16.md` 의 canonical/OG 수정은 `page.tsx`(홈)·`layout.tsx`·`[course]/page.tsx`·
`[course]/[lesson]/page.tsx` 에만 들어갔습니다. **`/t/[tab]` 과 `/student/[lesson]` 은
`generateMetadata` 가 `title` 만 반환**해서 canonical 을 **아예 내보내지 않았습니다.**
(운영 실측: 검사한 14개 라우트 중 **9개가 canonical 0개** — 탭 7개 + STUDENT 2개)

| 파일 | 변경 |
|---|---|
| `src/app/t/[tab]/page.tsx` | canonical `/t/${tab}`, 설명은 탭의 `blurb`, `og:image` 는 그 페이지가 배너로 쓰는 `TAB_IMAGES[tab].src`, `og:url`·Twitter 카드 추가 |
| `src/app/student/[lesson]/page.tsx` | 같은 처리. 이 라우트는 자체 `generateMetadata` 를 가지므로 공용 `[course]/[lesson]` 수정이 닿지 않았음 |

**검증**

| 검증 | 결과 |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | exit 0 |
| `./node_modules/.bin/next build` | 컴파일 성공, 정적 페이지 **1,778/1,778** 생성, TypeScript clean |
| 신규 프로브 `scripts/verify/verify-metadata.cjs` (로컬 고정 빌드) | **14/14 PASS**, exit 0 |
| 같은 프로브 (운영, 수정 전 빌드) | **5/14 PASS**, exit 1 — 실패 9건이 정확히 이 커밋이 고친 라우트, 전부 `canonical count = 0` |
| 운영 재확인 (푸시 75초 후) | **14/14 PASS**, exit 0 |
| 회귀 | `/t/nope` 404 유지, `/t/ld` 본문·h1 1개 정상, `/ld/d001`·`/student/s1-1` 200 |

> `verify-metadata.cjs` 는 canonical 을 **경로**로 비교합니다. canonical 의 origin 은
> `metadataBase` 때문에 항상 운영 도메인이라, **요청한 호스트와 비교하면 안 됩니다.**
> 첫 실행에서 이걸 잘못 짜서 14/14 실패로 나왔습니다(수정함).
>
> 홈(`/`)은 layout 의 `openGraph` 를 상속하며 `og:url` 이 없습니다 — 페이지 레벨 `openGraph` 는
> **병합이 아니라 교체**라 title·image 가 날아가므로 의도적으로 두었고, 프로브는 이를
> note 로만 보고합니다(OG 스펙상 `og:url` 은 선택).

---

## 1-F. 6차 세션 완료분 (2026-09-16) — `NEXT-SESSION.md` §A

> 정본은 `NEXT-SESSION.md` §A(4차 세션 검수 지적 6건)입니다. 승인 범위: **A-1·A-2·A-3·A-6.**
> A-5 는 5차 세션이 이미 완료(`fd5acf0`)했고, **A-4 는 착수 불가**(아래 참조).

| 이슈 | 커밋 | 내용 | 검증 |
|---|---|---|---|
| A-1 | `ca3a7ba` | `PROGRESS.md` §3 의 **"주정답 텍스트 변화 0건 → 클립 영향 없음"을 정정**. `apply-kig006.cjs` 가 `text 변경`과 `대안만`을 분리해 출력하고, `text` 가 바뀌면 음성 단계를 필수로 안내 | dry-run 이 `text changed 429 / alternatives 0` 을 분리 출력. 실측으로 **429건 전부가 `text` 를 바꿈** — "대안만 추가"는 0건이었습니다 |
| A-2 | `7d2a073` | `resolveOptionalDeterminers` 가 `text` 에 **마커 괄호까지 적용**하던 것을 `build(new Set())` 으로. 주정답이 교재의 괄호 밖 표현이 됩니다 | `All (the) boys receive a prize(혹은 prizes).` → text `All boys receive a prize.` (전: `All boys receive prizes.`). **검출력: 한 줄을 되돌리면 신설 check (8) 이 gh1-017 에서 FAIL 2건** |
| A-3 | `f84678a` | **원인은 문서가 지목한 `/[.?!]$/` 가 아니라 `clean()`** 이었습니다. 종결부호 중복 축약 규칙이 `U.S.` 의 마침표를 문장 종결로 보고 뒤의 `?` 를 삭제 | `gh1-081`/`081-2` #26 → text·alt 모두 `?` 보존. **검출력: 되돌리면 신설 게이트가 DRIFT(4)** |
| A-6 | `817b7a7` | 엔진 슬라이스를 **임시파일 대신 메모리에서 평가**(3개 스크립트). `apply-kig006.cjs` 의 슬라이스 지점을 "write out" 으로 옮겨 **dry-run 이 evidence 를 더럽히지 않게** 수정. `scripts/README.md` 색인 신설 | 5개 스크립트 실행 후 임시파일 0개, evidence `git diff` 0건. `--write` 경로를 복사본에서 확인(429건 → 97파일, 2회차 0건·바이트 동일) |

### 🔴 A-2 를 하는 과정에서 발견한 결함 2건 (README·NEXT-SESSION 에 없음)

**(1) `isEnglishAnswer` 가 `(혹은 …)` 셀 132건을 전부 건너뛰고 있었습니다** — 커밋 `3e82465` 로 수정.

`apply-kig006.cjs` 의 `isEnglishAnswer` 는 "한글이 있으면 한국어"로 판정합니다. 그런데 **마커 `혹은` 자체가 한글**이라,
`(혹은 …)` 가 들어간 셀은 **전부 한국어 문장으로 오판되어 이식 대상에서 빠졌습니다.**

- 규모: **132건** (grammar1 131 / grammar2 1) — 이 코퍼스의 모든 `(혹은 …)` 셀.
- 영향: 그 셀들은 **괄호가 그대로 남은 채** 화면에 나가고 TTS 가 괄호를 소리 내어 읽습니다.
  엔진이 "가장 나쁜 실패 모드"라고 부르는 바로 그 상태이며, 학습자가 올바른 문장을 써도 오답 처리됩니다.
- 즉 **A-2 의 수정은 `content/` 에 아무 영향을 주지 못하고 있었습니다** (해당 행이 애초에 처리되지 않으므로).
- 수정: 마커를 제거한 뒤 한글을 검사합니다(`withoutMarker`). 한국어 프롬프트는 마커를 지워도 한글이 남아 그대로 제외됩니다 —
  실제로 남은 `혹은` 7건은 전부 한국어 프롬프트였습니다.
- 결과: 이식 대상 **297 → 429건**.

**(2) `propose()` 가 마커 셀을 `parseAltMarker` 로 보내지 않아 문장부호와 대안이 깨졌습니다** — 같은 커밋.

필터를 고쳐 132건이 처음으로 처리되자 **종결부호 게이트가 13건의 DRIFT 를 잡았습니다.** 원인은 두 갈래였고, 둘 다 `parseAltMarker` 는
올바르게 처리하고 있었는데 `propose()` 가 그 레인을 건너뛰고 단일 괄호 분기로 보낸 탓입니다.

| 원문 | 잘못 나오던 값 | 수정 후 |
|---|---|---|
| `Isn't he a boy(혹은 Is he not a boy?)` | text `Isn't he a boy.` (물음표 소실) | text `Isn't he a boy?` / alt `Is he not a boy?` |
| `Didn't they have dreams? (혹은 a dream)?` | alt `혹은 a dream.` (**마커 유출**) | alt `Didn't they have a dream?` |
| `These are pens, aren't these(혹은 ---, are these not)?` | alt `… are these not.` | alt `… are these not?` |

수정: `propose()` 에 **마커 레인을 명시적으로 배선**하고, `parseAltMarker` 의 `substitute()`·`terminate()` 호출에
**주정답을 기준 종결부호로 전달**했습니다. 부수적으로 `kindFor` 를 `report-kig006.cjs` 로 옮겨
**작성기와 검증기 check (8) 이 같은 함수를 쓰도록** 했습니다(사본 드리프트 방지).

### 검증 총괄 (이 세션 최종 상태)

| 검증 | 결과 |
|---|---|
| `apply-kig006.cjs` dry-run | **429건 / text 변경 429 / 대안만 0 / DRIFT 0 / UNRESOLVED 0**, exit 0 |
| `report-kig006.cjs` | 검증 (1)~(8) 전부 `0 violations`, `primary=out-of-paren 8 rows, 0` |
| `verify/verify-kig006-terminator.cjs` | **PASS — 0 drift** (3031파일 / 12358항목) |
| `verify-kig006-multiparen.cjs` | **14 / 14** |
| `verify-kig006-determiners.cjs` | **rows 47, failing 0** |
| `verify-kig006-proposals.cjs` | **0 fragment wrongly accepted** |
| `verify-kig006-insert-semantics.cjs` | **rows with problems 0 / 17** |
| `--write` 경로 (복사본, `KIG_ROOT_OVERRIDE`) | 429건 → 97파일 기록, **2회차 0건 · 바이트 동일(멱등)** |
| 임시파일 · evidence 오염 | 스크립트 5개 실행 후 **0개 / `git diff` 0건** |
| **`content/` 변경** | **0건** ✅ (아카이브 재추출 전 금지 유지) |

### ⚠️ A-4 (`isEnglish()` 오판 16건) — 여전히 착수 불가

`src/components/GrammarLearningView.tsx:46` 은 아직 `return latin >= hangul && latin > 0;` 이며
`hangul === 0 && latin > 0` 으로 바꿔야 합니다. 다만 **게이트가 실물로 확인되었습니다**:

```
content/lessons/grammar1/gh1-081.json #6
  "The police arrested 15 people, didn't they? (police, people, children은 항상 복수)"
```

영어 답안 안에 한국어 주석이 있습니다. 판정을 지금 바꾸면 이 항목이 한국어 칸으로 갑니다.
**KIG-006 이식이 이 주석을 먼저 제거해야 하므로 A-4 는 이식 이후입니다.**

부수: `docs/qa-2026-09-15/scripts/verify/verify-kig005.cjs:29-34` 가 컴포넌트의 `isEnglish` 를 **그대로 복사**해 검사합니다.
A-4 를 적용할 때 **같은 커밋에서 함께 갱신**하지 않으면 구 로직을 계속 검증합니다.

### 다음 사람이 이어받을 지점

1. **`NEXT-SESSION.md` §A 는 이 세션으로 전부 끝났습니다** (A-1·A-2·A-3·A-6 완료, A-5 는 5차, A-4 는 이식 후).
2. 다음은 **`NEXT-SESSION.md` §B 대기열** 입니다 — `RE-014`(h1 개수) → `RE-016`(에러/로딩 페이지) →
   `RE-006`(CSP, Report-Only 먼저) → `RE-008`(사이트맵) → `RE-004`(미디어 허용 목록) → `RE-005`(VOCA 괄호 TTS).
   전부 `src/`·`scripts/` 만 건드리므로 아카이브와 무관합니다.
3. **`content/` 는 여전히 쓰기 금지**입니다. 아카이브가 도착하면 `ARCHIVE-PLAN.md` 를 따르고,
   재추출 **직후** 위 §3 이식 절차(429건)를 실행하세요.

---

## 2. 남은 이슈 (17건)

### ✅ 그룹 A — 전부 완료 (2026-09-15, 3차 세션)

TTS 비공식 API(마지막 1건)가 해결되어 그룹 A는 남은 것이 없습니다. 상세는 §1-C를 보세요.

### 그룹 B — ✅ 코드 작업 전부 완료 (4차 세션)
~~KIG-005(GRAMMAR 채점)~~ → **완료 (§1-C)**.
~~KIG-006(대안 정답 스키마 + KIG-006-a 언어 판정)~~ → **엔진·검증 완료 (§1-D). 이식은 아카이브 재추출 후.**
~~KIG-014(진도 API 챕터 검증)~~ → **완료 (§1-D, RE-010)**.
~~KIG-022(검색 인덱스)~~ → **완료 (§1-D, RE-009)**.

**그룹 B 는 코드 작업 기준으로 전부 완료되었습니다.** KIG-006 의 `content/` 이식만 남았고,
이는 아카이브 재추출 **이후**에 `apply-kig006.cjs --write` 로 처리합니다.

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
> 4차: `KIG-022/RE-009` · `KIG-014/RE-010` · `RE-011` canonical · `RE-012` OG (`f86d275` + 이번 커밋) · `KIG-006` 엔진
> 위 26건은 §1·§1-B·§1-C·§1-D에 검증 결과까지 기록되어 있습니다. 다시 손대지 마세요.
> 5차: `RE-011/012 잔여`(fd5acf0) — §1-E

> ### 🔴 2026-09-16 — `NEXT-SESSION.md` 가 이 §3 을 대체합니다
> `NEXT-SESSION.md` 서두에 **"PROGRESS.md 와 충돌하면 이 문서가 우선"** 이라고 명시되어 있습니다.
> 그 문서 §C 가 **`content/` 쓰기를 금지**하므로, 아래 그룹 C 9건 중 **8건은 아카이브 재추출 전까지
> 착수 불가**입니다(전부 `content/` 수정). 그래서 실제 대기열은 `NEXT-SESSION.md` §B 입니다.
>
> | 순서 | ID | 내용 | 상태 |
> |---|---|---|---|
> | 1 | RE-009 | 검색 인덱스 STUDENT | ✅ 4차 완료 (944→1,025) |
> | 2 | RE-011/012 잔여 | `/t/[tab]` canonical + OG (A-5) | ✅ **5차 완료 `fd5acf0`** (§1-E) |
> | 3 | RE-014 | 홈 `h1` 없음 / `/ld/d001` `h1` 2개 | ⬜ **다음** |
> | 4 | RE-016 | `not-found.tsx`·`error.tsx`·`global-error.tsx`·`loading.tsx` | ⬜ |
> | 5 | RE-006 | CSP 헤더 (**Report-Only 로 먼저 배포**) | ⬜ |
> | 6 | RE-008 | 사이트맵 잠긴 레슨 제외 또는 고유 소개문 | ⬜ |
> | 7 | RE-004 🔴 | `src/lib/mediaAccess.ts:60` `unclaimed → allowed:true` → 허용 목록 | ⬜ |
> | 8 | RE-005 | VOCA `colo(u)r`/`gray(grey)` TTS 괄호 (음성 재생성 동반) | ⬜ |
>
> **`NEXT-SESSION.md` §A(4차 세션 검수 지적 6건)는 아직 전부 미착수입니다.** 특히
> A-1(KIG-006 이식 시 클립 297문장 무음), A-2·A-3(주정답 규칙·종결부호 위반)은
> `apply-kig006.cjs --write` 전에 반드시 정리해야 합니다.
> 5차 세션은 §B 대기열을 따르라는 지시(§B 서두 "A 를 끝낸 뒤 이 순서로")와 §A 를 먼저 하라는
> 지시가 상충한다고 판단해, **되돌리기 쉬운 §B 항목을 1건** 처리했습니다. A 계열은 엔진 의미론을
> 바꾸는 작업이라 한 세션에 묶지 않는 편이 안전합니다.

### 남은 이슈 (17건)

1. **그룹 B** — ✅ **코드 작업 전부 완료** (§1-D). KIG-006 만 아카이브 재추출 후 `apply-kig006.cjs --write` 로 이식.
   → **다음 사람은 그룹 C 로 넘어가세요.**
2. **그룹 C** — KIG-010, 012, 017, 020, 021, 023, 025, 026, 027. KIG-002와 같은 패턴이라 검증 스크립트 재사용 가능
3. **그룹 D** — KIG-016(303건), KIG-028/030(53레슨), KIG-029(87레슨). 자동화로 플래그 추출 후 사람 판단
4. **그룹 E** — KIG-003, 004, 007, 008. **착수 금지.** 교재 원본이 도착하면 소유자가 직접 진행합니다.

> README 규칙 2에 따라 이슈마다 확인을 받아야 합니다. 승인을 묶어주면(예: "B그룹 4건 진행") 훨씬 빠릅니다.

### 🔴 원본 아카이브 — 도착 대기 중 (최대 병목)

소유자가 **2026-09-16에 별도 보관처에서 가져오기로** 한 상태입니다. 도착 전까지
**`content/` 에 아무것도 쓰지 마세요.** 이유:

- `scripts/extract.mjs:465` 가 레슨 JSON 을 **통째로 덮어씁니다**
- `extract.mjs` 는 `readingSentences`·`readingVocabulary` 를 **만들지 않습니다**
  → READING 256레슨의 문장 정렬 + 어휘 카드 7,168장이 **전부 소실됩니다**
- `extract.mjs --media` 로 돌리면 R2 음성과 어긋납니다 → **반드시 `--no-media`**

아카이브가 도착하면 **`docs/qa-2026-09-15/ARCHIVE-PLAN.md`** 를 그대로 따르세요.
대조 항목 원본은 `evidence/archive-checklist.json` (Tier1 의심 622건 + Tier2 전수 6개 영역) 입니다.

### ⚠️ KIG-006 이식 절차 (아카이브 재추출 **직후**)

```bash
# 1) 재추출 먼저 (복사본에서, --no-media)
# 2) 그 다음에 이식 — 반드시 --write 없이 먼저 확인
node docs/qa-2026-09-15/scripts/apply-kig006.cjs                 # dry-run: 429건 (text 변경 429 / 대안만 0)
node docs/qa-2026-09-15/scripts/apply-kig006.cjs --write         # 적용
# 3) 검증
npx tsc --noEmit
node docs/qa-2026-09-15/scripts/verify/verify-kig006-terminator.cjs  # PASS (종결부호 전수)
node docs/qa-2026-09-15/scripts/verify-kig006-multiparen.cjs     # 14/14
node docs/qa-2026-09-15/scripts/verify-kig006-determiners.cjs    # 47/47
node docs/qa-2026-09-15/scripts/verify-kig006-proposals.cjs      # 0 fragments
node docs/qa-2026-09-15/scripts/verify-kig006-insert-semantics.cjs   # 0/17 problems
# 4) 🔴 음성 클립 재생성 — 필수. 2)에서 무효화된 429문장이 여기서 되살아납니다.
node scripts/generate-azure-ava.mjs --dry-run                    # pending 이 429 근처인지 확인
node scripts/generate-azure-ava.mjs --concurrency 4
node scripts/upload-azure-ava-r2.mjs
node scripts/generate-azure-ava.mjs --dry-run                    # pending: 0 확인
```

> ⚠️ **2)는 `DRIFT 0` 과 `UNRESOLVED 0` 이 아니면 아무것도 쓰지 않고 exit 1 로 끝납니다.**
> 쓰기는 전 파일을 검사한 뒤로 미뤄져 있으므로, 중간에 실패해도 일부만 반영되는 일이 없습니다.

- 4)는 `.env.local`(`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` + R2 자격증명)이 있어야 합니다.
  **없으면 2)를 실행하지 마세요.** 무효화된 클립을 되살릴 수단 없이 `content/` 만 바꾸면
  그 429문장은 무음인 채로 배포됩니다.
- 4)의 `--dry-run` 에서 pending 이 429보다 **훨씬 크게**(예: 수만 건) 나오면 R2 자격증명이 없는 것입니다.
  그 상태로 생성을 돌리면 전 코퍼스를 다시 굽습니다. 경고를 무시하지 마세요 (§아래 경고).

- `apply-kig006.cjs` 는 **멱등**합니다 (2회차 0건, 바이트 동일). 중간에 죽어도 다시 돌리면 됩니다.
- `kig006-korean-concordance.md` 의 REVIEW 7건은 판정 완료했으나, **짝 한국어 페이지와
  아카이브 실물로 최종 확인**하는 것이 좋습니다.
- `content/` 텍스트가 바뀌므로 **음성 클립 재생성이 필수**입니다 (§아래 경고 참조).
  **이식은 아래 4) 음성 단계와 한 묶음입니다. 따로 하지 마세요.**
  - 클립 키는 `text` 의 해시이고, 이식은 `text` 를 **직접 덮어씁니다**(`apply-kig006.cjs` 의 `item.text = split.text`).
    실측: 이식 대상 **429건 전부가 `text` 를 바꿉니다**(대안만 추가되는 건 0건).
    따라서 **이식 직후 429문장이 무음**이 됩니다 — KIG-002 가 READING 음성을 40.6%까지 떨어뜨린 것과 같은 사고입니다.
  - ⚠️ 2026-09-16 이전에 이 자리에 "대안만 추가하므로 클립 영향 없음"이라고 적혀 있었습니다. **그 판단은 틀렸습니다.**
    `apply-kig006.cjs` 의 `changed` 카운터가 `text` 와 `alternatives` 를 한 숫자로 세고 있어서
    "대안만 추가"와 "text 변경"을 구별할 수 없었던 것이 원인입니다. 이제 리포트가 두 수를 분리해 출력합니다.
  - ⚠️ **429 = 297 + 132.** 원래 297 이었던 것은 `isEnglishAnswer` 가 `(혹은 …)` 셀을 전부 걸러냈기 때문입니다
    (`혹은` 자체가 한글이라 "한국어 문장"으로 판정). 그 132건은 **괄호가 그대로 남아 화면·TTS 로 나가고 있었습니다.**
    필터를 고쳐 함께 처리합니다 (§1-F 참조).

### ⏸️ gh1-032/033 재정렬 — 보류 상태

`evidence/gh1-032-033-realignment-diagnosis.md` 에 진단만 있습니다. 15칸 이동이 필요하나
**아카이브로 셀 대응을 확정하기 전에는 추론 금지**. 열린 질문 4건이 문서에 정리되어 있습니다.

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

> **⚠️ GitHub 클론에는 클립도 `.env.local`도 없습니다.**
> `.gitignore`가 `/public/audio`와 `.env*`를 제외하므로, 클론에는 클립이 **2개**뿐이고 비밀값도 없습니다.
> 그 상태로 생성을 돌리면 37,476개(126만 자)를 다시 구우려 하고, 무료 티어 월 50만 자를 2.5배
> 초과하며 전 객체를 불필요하게 재업로드합니다.
> 그래서 `generate-azure-ava.mjs`는 R2 자격증명이 있으면 **버킷을 조회해 실제 보유분을 인식**하고
> (`in bucket : 38,398`), 자격증명이 없으면 **경고를 출력**합니다. 경고가 보이면 생성하지 말고
> 소유자에게 `.env.local`을 요청하세요.

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

### 🔴 dev 서버가 Turbopack panic 으로 500 을 뱉는다 (5차 세션 2026-09-16 발생)
`./node_modules/.bin/next dev` 기동 자체는 되지만(`✓ Ready in 2.2s`), **라우트를 처음 컴파일할 때마다**
이렇게 죽고 그 라우트가 500 이 됩니다.

```
FATAL: An unexpected Turbopack error occurred.
Failed to write app endpoint /t/[tab]/page
Caused by:
- [project]/src/app/globals.css [app-client] (css)
- creating new process
- node process exited before we could connect to it with exit code: 0xc0000142
```

`0xc0000142` = `STATUS_DLL_INIT_FAILED`. **PostCSS 변환용 자식 node 프로세스를 띄우지 못하는 환경 문제**이고
코드 문제가 아닙니다. `/t/ld` 가 500, canonical 0개로 나와 **수정이 실패한 것처럼 보입니다.**

- **우회(동작 확인됨)**: `./node_modules/.bin/next build` → `./node_modules/.bin/next start -p 3100`.
  프로덕션 렌더 경로를 그대로 검증할 수 있고, dev 보다 오히려 정본에 가깝습니다.
- **주의**: 빌드 막바지 `Finalizing page optimization` 에서 CLI 의 safe-delete shim 이
  `.next/export-detail.json` 삭제를 막아 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 로 **exit≠0** 이 납니다.
  그래도 `routes-manifest.json`·`prerender-manifest.json`·`BUILD_ID` 는 이미 쓰였으므로
  **`next start` 는 정상 동작**합니다. 빌드 성공 판정은 마지막 줄이 아니라
  `✓ Generating static pages using 7 workers (N/N)` 줄로 하세요.
- 정적 프리렌더 결과만 보면 되면 파일로도 확인 가능합니다:
  `.next/server/app/t/ld.html`, `.next/server/app/[course]/[lesson]/d001.html`.
  단 **`cookies()` 를 쓰는 라우트(`/student/[lesson]`)는 프리렌더되지 않으므로** `next start` 가 필요합니다.

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

### 4차 세션 — KIG-006 대안 정답 엔진 (커밋됨 `docs/qa-2026-09-15/scripts/`)

| 스크립트 | 역할 | 기대 출력 |
|---|---|---|
| `report-kig006.cjs` | 엔진 본체 + 8종 검증 일괄 실행 | 아래 §검증 총괄 참조 |
| **`apply-kig006.cjs`** | **재실행 가능 이식기** (dry-run 기본, 임시파일 없음) | `429건` / `--write` 로 적용 |
| `verify/verify-kig006-terminator.cjs` | 원문 종결부호가 `text`·모든 대안에 보존되는지 (3031파일 전수) | `PASS — 0 drift` |
| `verify-kig006-multiparen.cjs` | 괄호 2개+ 경로 기대값 | `14 / 14` |
| `verify-kig006-determiners.cjs` | 말뭉치 한정사 47행 | `47 / 47` |
| `verify-kig006-proposals.cjs` | 제안 기대값 + 프래그먼트 가드 | `19 / 19`, 누출 0 |
| `verify-kig006-insert-semantics.cjs` | 선택 삽입 의미론 프로브 | 위반 0 |
| `evidence/kig006-korean-concordance.md` | 주정답↔한국어 일치표 | 13행 / REVIEW 7 = 판정 완료 |
| `evidence/gh1-032-033-realignment-diagnosis.md` | 보류된 재정렬 진단 | 이동 미실행 |
| `ARCHIVE-PLAN.md` + `evidence/archive-checklist.json` | 아카이브 대조 계획·항목 | Tier1 622 + Tier2 6영역 |

> `report-kig006.cjs` 는 `content/` 에 **쓰지 않습니다**(읽기 전용 + evidence 산출).
> 유일한 쓰기 경로는 `apply-kig006.cjs --write` 입니다.

### 5차 세션 — canonical/OG 프로브 (커밋됨 `docs/qa-2026-09-15/scripts/verify/`)

| 스크립트 | 역할 | 실행 / 기대 출력 |
|---|---|---|
| `verify-metadata.cjs` | 라우트별 canonical 1개(경로 일치) + `og:title`·`og:description`·`og:image`(절대 URL)·`twitter:card` 존재 | `node verify-metadata.cjs <base>` → `14/14 routes pass`, exit 0 |

```bash
node docs/qa-2026-09-15/scripts/verify/verify-metadata.cjs http://localhost:3100        # 로컬
node docs/qa-2026-09-15/scripts/verify/verify-metadata.cjs https://k-ig-core.vercel.app # 운영
```
- `<base>` 에 **수정 전 빌드**를 넣으면 `/t/*` 7개 + `/student/*` 2개가 `canonical count = 0` 으로 FAIL 합니다(검출력 확인 완료).
- 결과 JSON 은 `scripts/out/verify-metadata.json`.
- 검사 라우트 목록을 늘리려면 스크립트 상단 `ROUTES` 배열에 추가하세요. 새 라우트를 만들 때
  **canonical 을 빠뜨리면 이 프로브가 잡습니다.**

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
