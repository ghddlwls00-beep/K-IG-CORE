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

### KIG-001 이후 확인된 신규 취약점 (README에 없음, 미처리)
- **GVA P0** — `src/app/gva/[lesson]/page.tsx:39-52`가 `LessonClientGate`(클라이언트 게이트) 사용. VIP 전용 `/gva/gva-003` HTML에 슬라이드·오디오 직접 URL 노출. 실제 잠금 노출 규모는 814가 아니라 **약 1,012레슨**
- **R2 공개 버킷** — `pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev`가 인증 없이 접근 가능하고 경로 추측 가능(`gva/audio/gva-NNN.mp3`). `gva-200.mp3`가 HTTP 206으로 내려옴. **GVA는 HTML 게이트를 고쳐도 콘텐츠가 보호되지 않음** → 서명 URL 또는 비공개 버킷 필요
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

## 2. 남은 이슈 (28건)

### 그룹 A — 코드 소규모 (1건 남음, **결정 필요**)
- **TTS 비공식 API** — `src/lib/speech.ts:707`이 `translate.google.com/translate_tts`(비공식)로 MP3를 받아옵니다.
  - 이 경로는 `!hasSynthesis() || isKakaoTalk() || isInAppBrowser() || !hasVoiceFor(lang)`일 때 쓰입니다. 즉 **카카오톡 등 인앱 브라우저 사용자의 실제 오디오 경로**입니다.
  - 그대로 두면 문서화되지 않은 제3자 엔드포인트에 상용 제품이 의존하고(이용약관·가용성 리스크), 그냥 지우면 인앱 브라우저에서 오디오가 끊깁니다.
  - **그래서 임의로 지우거나 바꾸지 않았습니다.** README 규칙 4(콘텐츠/기능을 지워서 해결하지 않는다)에 해당.

  **측정치 (2차 세션, 운영 실측)**
  - 앱이 말하는 텍스트는 **19,495개로 유한**합니다(`speech-inventory.json`). `unifiedSpeechKey(text)`가 인벤토리 키와 **19,495/19,495 완전 일치** → **클라이언트가 텍스트만으로 클립 URL을 동기 계산할 수 있습니다**(매니페스트 불필요).
  - 자체 클립 적중률: **194/200 (97.0%)**. STUDENT·VOCA·GRAMMAR I/II·LISTENING은 100%, **READING만 79.6%(510/2,504 결측)**.
  - READING 결측은 전부 KIG-002 부작용입니다(위 신규 취약점 항목).
  - 클립 생성 대상은 이미 22,816건이며, 부족한 건 **545건(510 + 35)**뿐입니다.

  **권장: (b) → 그다음 엔드포인트 삭제. (a)는 불필요, (c)는 중립이 아님.**
  - **(b)를 먼저**: `playChunkViaStream`에서 자체 클립 URL을 먼저 시도하고 `audio.onerror`에서만 Google로 폴백. 즉시 97%가 자체 음성으로 바뀌고, 인앱 브라우저에서도 화면 표기("원어민 음성", KIG-009)와 실제 음색이 일치합니다. **키·비용·인프라 0.** 실패 키를 메모리에 캐시하면 반복 404도 없앨 수 있습니다.
  - **(a)는 이 제품에 맞지 않습니다**: 커리큘럼이 유한·불변인데 런타임 합성은 재생마다 과금되고 지연·신규 장애점이 생깁니다. **이미 22,816건을 사전 생성하고 있으므로 545건을 더 굽는 편이 런타임 라우트보다 싸고 음질도 일관됩니다.** (a)가 정당한 경우는 임의 사용자 입력을 읽어야 할 때인데, 이 제품에는 그런 경로가 없습니다.
  - **최종 목표는 폴백 제거**: (b) + 545건 재생성(KIG-015와 **같은 배치**)으로 커버리지가 ~100%가 되면 비공식 엔드포인트는 죽은 코드가 되어 **삭제**할 수 있습니다. 그게 이 이슈의 진짜 해결입니다.
  - **(c)는 리스크를 문서화할 뿐 아니라 품질 노출을 방치**합니다: KIG-002 레슨 85개의 커버리지가 40.6%이므로, 그 구간 인앱 브라우저 사용자는 절반 이상을 로봇 음성으로 듣습니다.
  - 진행하려면 **제품 소유자 승인 1건**이면 됩니다(키·비용이 없으므로 KIG-009·KIG-015와 달리 외부 의존이 없습니다).

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

> ### ⛔ 이미 완료된 이슈 — 재작업 금지
> 1차: `KIG-001`(984a553) · `KIG-002`(37d2a26) · `KIG-011`(2f8a97e) · `KIG-018`(c50a9ea) · `KIG-024`(efe57da) · `KIG-013`(e83b8ae)
> 2차: `KIG-019`(5bec3b9) · `KIG-031`(1283492) · `KIG-032`(d5a52da) · `KIG-033`(c57b7f3) · `KIG-034`(3f7fc04) · `KIG-035`(afb573f) · `KIG-036`(ee3cbe0) · favicon(6af9c69) · 레슨 수(a088969) · GRAMMAR 정답 노출(1bec0f5) · LISTENING 선택 변경(ca7ea4f)
> 위 17건은 §1 완료 표에 검증 결과까지 기록되어 있습니다. 다시 손대지 마세요.

### 남은 이슈 (28건)

1. **그룹 A 잔여 1건** — TTS 비공식 API. **결정 필요**(§2 참조). 결정 없이는 진행하지 마세요.
2. **그룹 B** — KIG-005(채점) → KIG-006(스키마) → KIG-014(진도 API) → KIG-022(검색)
3. **그룹 C** — KIG-010, 012, 017, 020, 021, 023, 025, 026, 027. KIG-002와 같은 패턴이라 검증 스크립트 재사용 가능
4. **그룹 D** — KIG-016(303건), KIG-028/030(53레슨), KIG-029(87레슨). 자동화로 플래그 추출 후 사람 판단
5. **그룹 E** — KIG-003, 004, 007, 008, 009, 015. **수정 금지.** 원본 교재 확보 여부부터 확인하고, 없으면 README가 제시한 비노출 B안으로 전환

> README 규칙 2에 따라 이슈마다 확인을 받아야 합니다. 승인을 묶어주면(예: "B그룹 4건 진행") 훨씬 빠릅니다.

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
