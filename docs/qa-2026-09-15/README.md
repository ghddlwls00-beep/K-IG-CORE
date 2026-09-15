# K-IG CORE 출시 전 QA 수정 인수인계서

> 이 문서 하나만 읽고도 전체 수정 작업을 수행할 수 있도록 작성되었습니다.
> 감사일 2026-09-15 · 대상 빌드 `a986d9f` · 운영 <https://k-ig-core.vercel.app>
> 감사 범위: **STUDENT · VOCA · GRAMMAR I · GRAMMAR II · LISTENING · READING (905개 레슨 전수)**
> 범위 밖: CNN NEWS, GVA 독해, 결제/관리자 기능
> 최종 판정: **COMMERCIAL RELEASE: NO-GO** (PASS 198 / FAIL 707 / 905)

---

## 0. 작업자(AI)를 위한 규칙

1. **한 번에 한 이슈**씩 처리한다. 이슈 ID(`KIG-00x`) 단위로 수정 → 검증 → 커밋.
2. 커밋 메시지는 `fix(KIG-001): ...` 형식으로 이슈 ID를 포함한다.
3. **검증 없이 완료 보고 금지.** 각 이슈의 "완료 조건"에 적힌 명령/확인 절차를 실제로 실행하고 결과를 남긴다.
4. **콘텐츠를 임의로 지워서 "해결"하지 않는다.** 데이터가 틀렸으면 고치거나, 고칠 수 없으면 해당 기능을 비노출 처리하고 이유를 기록한다.
5. **운영 데이터에 쓰기 금지.** Cloudflare R2(라이선스/진도 버킷), 운영 Vercel 환경변수는 건드리지 않는다. 로컬 검증은 `docs/qa-2026-09-15/scripts/make-fixture.cjs`로 만든 임시 이용권을 쓴다(작업 후 `data/*.json` 삭제).
6. `.env.local`, `.vercel/`에는 비밀값이 있다. **절대 커밋·출력 금지.**
7. `main`에 push하면 Vercel이 자동으로 프로덕션 배포한다. P0 수정은 배포 후 반드시 운영에서 재확인한다.

### 필수 사전 지식 — 이 제품의 구조

| 항목 | 내용 |
|---|---|
| 스택 | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vercel 배포 |
| 콘텐츠 | DB 없음. `content/` 아래 JSON이 데이터 레이어 (빌드 타임 파일 읽기) |
| 과정 인덱스 | `content/courses/{ld,reading,student,phonics,grammar1,grammar2}.json` — `lessons[]`, `groups[]` |
| 레슨 본문 | `content/lessons/<course>/<id>.json` — `blocks[]`(heading/instruction/hints/sentences/paragraph/choice/dictation/wordgrid), `audio[]`, `readingSentences[]`, `readingVocabulary[]` |
| 보조 데이터 | `content/ld_english_scripts.json`(듣기 영문 스크립트), `content/voca_dictionary.json`(단어 3,877개 뜻), `src/lib/readingSentences.json`, `src/lib/readingVocabulary.json` |
| 라우트 | `/[course]` 목록, `/[course]/[lesson]` 레슨, `/student/[lesson]` 학생 전용(서버 게이팅 있음), `/t/[tab]` 섹션 소개 |
| 화면 컴포넌트 | 과정별 전용 뷰: `StudentLearningView` `PhonicsLearningView`(VOCA) `GrammarLearningView` `LdLearningView` `ReadingLearningView` — 모두 `LessonBody.tsx`가 분기 |
| 음성 | 전 과정이 사전 생성된 Azure Ava TTS 클립(`/audio/azure-ava/v1/<hash>.mp3`)을 재생. 해시 계산은 `src/lib/unifiedSpeech.ts`. 원본 MP3는 R2에 있으나 UI가 사용하지 않음(KIG-009) |
| 이용권 | 서명 토큰(HMAC) → `localStorage` + `kig_license_session` 쿠키. 검증 `src/lib/serverLicense.ts`, `src/lib/licenseSession.ts`, 기기 등록 `src/lib/deviceStorage.ts` |

---

## 1. 우선순위 작업 목록

| ID | 심각도 | 제목 | 유형 | 영향 |
|---|---|---|---|---|
| KIG-001 | **P0** | 잠금 레슨 본문이 비로그인 HTML에 노출 | 코드 | 814 레슨 |
| KIG-002 | P1 | READING 48개가 원본과 다른 지문 | 데이터 | 48 |
| KIG-003 | P1 | LISTENING 영어 스크립트 기계 역번역·문장 절단 | 데이터 | 119 |
| KIG-004 | P1 | VOCA 단어 뜻 361개 오류 | 데이터 | 175 |
| KIG-005 | P1 | GRAMMAR 채점: 한 글자에 70점 | 코드 | 97 |
| KIG-006 | P1 | GRAMMAR 대안 정답 오답 처리 / 영어 답에 한글 | 데이터+코드 | 13 |
| KIG-007 | P1 | gh1-020 모범답안 8개 누락 + 음원 404 | 데이터 | 1 |
| KIG-008 | P1 | READING/LISTENING 퀴즈 정답 키가 내용과 무관 | 코드 | 462 |
| KIG-009 | P1 | "원어민 음성" 표기 vs 실제 TTS | 정책 결정 | 905 |
| KIG-010 | P1 | STUDENT s19-3 레슨 누락 | 데이터 | 1 |
| KIG-011 | P1 | 검증 실패 시 localStorage 이용권 신뢰 | 코드 | 전체 |
| KIG-012 | P1 | VOCA 예문·연어가 템플릿 문장 | 데이터 | 195 |
| KIG-013~024 | P2 | 아래 §3 참조 | | |
| KIG-025~036 | P3 | 아래 §4 참조 | | |

---

## 2. P0 · P1 상세 작업 지시

### KIG-001 (P0) — 잠금 레슨 본문이 결제 없이 HTML에 포함됨

**증상**
비로그인 상태로 `https://k-ig-core.vercel.app/ld/d276`을 GET하면 화면엔 페이월이 보이지만, **응답 HTML 안에 전체 영어 스크립트·한국어 번역·어휘가 그대로 들어 있다.** 즉 결제 없이 전 콘텐츠를 긁어갈 수 있다.

**증거**
`evidence/prod-crawl-summary.json` → `lockedLessonsWithBodyInHtml`:
```
phonics 192, grammar1 50, grammar2 41, ld 274, reading 251  (+ 따옴표 이스케이프로 탐지 누락 5건, gh1-020 별도 확인) = 814
lockedLessonsWithoutBodyInHtml: student 79   ← STUDENT만 정상
```
직접 재현:
```bash
curl -s https://k-ig-core.vercel.app/grammar1/gh1-020 | grep -c "평서문"   # 1 이상 = 노출됨
curl -s https://k-ig-core.vercel.app/ld/d276 | grep -c "precious possessions"
```

**원인**
- `src/app/[course]/[lesson]/page.tsx` — `generateStaticParams()`로 전 레슨을 **정적 생성**하고, 잠금은 클라이언트 컴포넌트 `src/components/LessonClientGate.tsx`가 **화면만 가림**. 본문은 이미 RSC 페이로드에 직렬화되어 전송됨.
- 반대로 `src/app/student/[lesson]/page.tsx`는 **서버에서 쿠키를 검증**하고 권한이 없으면 `LessonPaywall`만 렌더링 → 본문이 HTML에 없음. **이 파일이 정답 레퍼런스다.**

**수정 지시**
1. `src/app/[course]/[lesson]/page.tsx`를 `student` 라우트와 같은 방식으로 바꾼다.
   - `import { cookies } from "next/headers"`, `verifyLicenseSessionToken`, `LICENSE_SESSION_COOKIE_NAME`(`@/lib/licenseSession`), `isStudentOnlyPlan`(`@/lib/license`), `LessonPaywall` 추가.
   - `lesson` 조회와 grammar1 리다이렉트 처리 **직후**, 본문용 데이터(`menTranslations`, `vocaDictionary`, `fallbackSentences`, `topLevelAudio` 등)를 계산하기 **전에** 접근 판정:
     ```ts
     const isFree = isFreePreviewLessonServer(course, lesson.id);
     let accessAllowed = isFree;
     if (!isFree) {
       const session = await verifyLicenseSessionToken(
         (await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value,
       );
       if (session) {
         accessAllowed = isStudentOnlyPlan(session.payload.plan)
           ? course === "student"      // STUDENT 전용권은 student 과정만
           : true;                     // 1M / 1Y / LIFE 올패스
       }
     }
     ```
   - `accessAllowed === false`면 `student` 라우트처럼 상단 네비 + `<LessonPaywall .../>`만 렌더링하고 **early return**. 레슨 `blocks`·스크립트·어휘가 JSX에 절대 들어가지 않게 할 것.
   - 권한이 있으면 기존 본문을 렌더링하되 `LessonClientGate` 래퍼는 제거(서버에서 이미 판정했으므로 불필요하고, 하이드레이션 전 스켈레톤 깜빡임만 유발).
2. `src/components/LicenseProvider.tsx` — 이용권 활성화/검증 성공 후 쿠키가 생긴 상태로 **서버 재렌더링**이 필요하다. 현재 reload 로직이 `/student/`에만 걸려 있다(파일 내 `window.location.pathname.startsWith("/student")` 2곳). 이를 레슨 경로 전체로 확장:
   ```ts
   const LESSON_PATH = /^\/(ld|reading|phonics|grammar1|grammar2|cnn|student)\/[^/]+$/;
   ```
   기존 `sessionStorage` 가드(`kig:license-cookie:<token 뒤 16자>`)를 그대로 유지해 **무한 새로고침이 생기지 않게** 할 것.
3. `generateStaticParams`는 남겨도 되지만, `cookies()` 사용으로 라우트가 동적 렌더링된다. 정적 생성 손실은 의도된 트레이드오프다. 목록 페이지(`/[course]`)는 정적 유지.

**주의(회귀 방지)**
- `src/app/student/[lesson]/page.tsx`는 내부에서 `LessonPage`를 호출한다. 새 게이트가 student 흐름을 막지 않는지 확인(무료 s1-1/s1-2, LIFE, STU 플랜 각각).
- CNN도 같은 라우트를 쓴다. 무료 `cnn001/cnn002` 외에는 잠기는 게 정상.

**완료 조건**
```bash
node docs/qa-2026-09-15/scripts/crawl-prod.cjs      # 경로 상수 수정 후 실행
# prod-crawl 요약에서 lockedLessonsWithBodyInHtml 의 모든 과정이 0 이어야 한다
curl -s https://k-ig-core.vercel.app/ld/d276 | grep -c "precious possessions"   # → 0
curl -s https://k-ig-core.vercel.app/ld/d001 | grep -c "Mrs. Watson"            # → 1 이상 (무료 레슨은 그대로)
```
추가로 `/student/s1-1`(무료), `/phonics/mv1-01`(무료), 이용권 등록 후 `/phonics/mv1-03`(유료) 정상 학습 확인.

---

### KIG-011 (P1) — 검증 실패 시 localStorage 이용권을 그대로 신뢰
`src/components/LicenseProvider.tsx:126-130`
```ts
.catch(() => {
  // Offline fallback: allow only if valid token string exists
  setStored(parsed);        // ← 서버 검증 실패인데 권한 부여
});
```
`/api/license/verify` 요청이 실패하거나 JSON이 아닌 응답이면 저장된 값을 그대로 활성화한다. 요청을 차단하면 위조 토큰이 통과할 수 있다.
**수정**: `catch`에서 권한을 주지 말고 잠금 유지(`setStored(null)` 또는 상태 미변경 + 재시도). 오프라인 사용성이 필요하면 "직전 성공 검증 시각"을 저장해 짧은 유예(예: 24h) 안에서만 허용하도록 명시적으로 구현.
**완료 조건**: DevTools에서 `/api/license/verify`를 차단(Network → Block request URL)한 뒤 새로고침 → 유료 레슨이 잠겨 있어야 한다.

---

### KIG-002 (P1) — READING 48개 레슨이 원본과 다른 지문을 표시

**증거**: `evidence/reading-divergence.json` (레슨별 `kind`, 유사도 `dEn`/`dKo`, 원본 앞부분 `legacyStart`, 화면 표시 `alignedStart`)

| 유형 | 수 | 의미 |
|---|---|---|
| `DIFFERENT_PASSAGE_NOT_IN_ARCHIVE` | 41 | 원본 아카이브 어디에도 없는 **창작 지문**이 표시됨 |
| `TRUNCATED_OR_PARTIAL` | 6 | 원본의 30~60%만 남거나 다른 글로 대체 |
| `SHOWS_PASSAGE_OF_pr187` | 1 | `pr080`이 **pr187의 지문**을 표시 |

예 (`pr026`):
- 원본 `content/lessons/reading/pr026.json` → `The average brain is naturally lazy and tends to take the line of least resistance…`
- 화면 표시(`src/lib/readingSentences.json` / 레슨 JSON의 `readingSentences`) → `The history of the telephone is a fascinating story…` (번역 유사도 9%)

대상 48개:
```
pr026 pr030 pr046 pr047 pr048 pr056 pr076 pr077 pr078 pr079 pr080 pr081 pr083 pr086 pr087
pr090 pr093 pr097 pr098 pr104 pr118 pr130 pr131 pr138 pr139 pr143 pr145 pr150 pr152 pr159
pr161 pr162 pr164 pr170 pr171 pr172 pr173 pr178 pr188 pr193 pr195 pr198 pr199 pr211 pr236
pr237 pr241 pr242
```

**원인**: `scripts/build-reading-aligned.mjs`가 외부 정렬 배치(`.../brain/.../batch*-alignments.cjs`, 현재 접근 불가)에서 문장쌍을 가져와 `src/lib/readingSentences.json`과 각 레슨 JSON의 `readingSentences`를 만들었는데, 일부가 원본이 아닌 생성 텍스트다.

**수정 지시**
1. 진실의 기준은 **레슨 JSON의 `blocks` 안 원본 지문**(`instruction` 블록, 영문) + `pr###-1.json`의 한국어 지문이다.
2. 48개 레슨에 대해 원본 영문을 문장 단위로 분할하고, `pr###-1`의 한국어와 1:1 정렬하여 `readingSentences`를 재생성한다. 정렬은 기존 `alignSentences`/`alignDP`(`src/components/ReadingLearningView.tsx` 하단) 로직을 재사용 가능.
3. `readingVocabulary`(14개)도 새 지문 기준으로 재생성해야 한다(현재 값은 교체된 지문 기준이라 본문에 없는 단어가 섞임).
4. 두 저장소(`src/lib/readingSentences.json`과 레슨 JSON)가 **동일**해야 한다. 재생성 후 `probe3.cjs`로 전수 재확인.

**완료 조건**
```bash
node docs/qa-2026-09-15/scripts/probe3.cjs
# 출력에서 DIFFERENT_PASSAGE_NOT_IN_ARCHIVE / TRUNCATED_OR_PARTIAL / SHOWS_OTHER_LESSON_PASSAGE 가 모두 0건
```

---

### KIG-003 (P1) — LISTENING 영어 스크립트 품질 (119개 레슨)

**증거**: `evidence/ld-transcript-quality.json` (레슨별 문장 수, 절단 문장, 원본 힌트 누락 목록)

두 종류의 결함:
1. **문장 절단** 99개 레슨 / 136개 문장 — 딕테이션 대상 문장이 문장 중간에서 끊긴다.
   예 `d010` #1 `"…She didn't know any of the African languages"` (마침표 없음) → #2가 `"They were able to get by just fine."`로 시작.
2. **원본 음성과 불일치** 47개 레슨 — 원본 레슨 페이지의 어휘 힌트(그 음성에서 실제로 들리는 고유명사·단어)의 절반 이상이 스크립트에 없다.
   예 `d166`: 힌트 `Samuel Langorne Clemens`인데 스크립트는 `"I later adopted the pen name Mark Tuen"` (3인칭 전기를 1인칭으로 오역, 이름 철자 오류).
   예 `d241`: 힌트 `hopelessly beaten`, `to date` 없음. `skill`을 `technology`로 오역(`build up enough technology`).

**판단**: `content/ld_english_scripts.json`은 **한국어 대본을 기계로 영어 역번역한 것**으로 보인다. 원본 레거시 페이지(`LD/d###.htm`)에는 영어 본문이 없고 힌트+받아쓰기 칸만 있으므로, 영어는 나중에 생성된 것이 맞다.

**수정 지시 (택1)**
- **A안(권장)**: 원본 음성 `https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev/audio/ld/d###.mp3`를 STT로 전사한 뒤 원어민이 검수하여 `ld_english_scripts.json`을 교체. 한국어는 `d###-1.json`의 원본 번역을 사용해 1:1 정렬.
- **B안(임시)**: 최소한 절단 문장 136개만이라도 문장 경계를 복원하고, 힌트 불일치 47개는 "검수 필요"로 표시하여 해당 레슨의 딕테이션/섀도잉 단계를 비노출.

**완료 조건**
```bash
node docs/qa-2026-09-15/scripts/probe5.cjs
# unterminated(문장 절단) 0, hintMiss50(힌트 50% 이상 누락) 0
```

---

### KIG-004 (P1) — VOCA 단어 뜻 361개 오류 (175개 레슨)

**증거**: `evidence/voca-meaning-defects.json` — 단어별 `{word, lessons[], shown(현재 뜻), class, suggested(권장 뜻)}`
전체 3,874개 단어·뜻 목록은 `evidence/voca-all-word-meanings.txt` (형식 `레슨|단어|뜻`).

| 분류 | 수 | 예 |
|---|---|---|
| `TRANSLITERATION` (음차: 뜻이 아니라 영어 발음의 한글 표기) | 177 | live→"라이브", build→"빌드", push→"푸시", feed→"피드", cast→"캐스트" |
| `WRONG_SENSE` (다의어 오선택/문맥 부적합) | 145 | notebook→"노트북"(공책), conceive→"임신하다"(생각해내다), store→"저장"(가게), march→"행진"(3월, 월 이름 레슨 안에서), disinterested→"무관심한"(사심 없는) |
| `POS` (품사 오도) | 31 | tend→"경향"(경향이 있다), synonymous→"동의어"(같은 뜻의) |
| `MALFORMED` (데이터 손상) | 5 | `ancesto`(단어 철자 잘림), `gray(grey)`→"회색회색", `autumn(=fall)`→"가을=가을", `calender`(철자 오류), `"insistence,-cy"` |
| `INAPPROPRIATE` (학습 부적합) | 3 | gay→"게이", affair→"불륜", ecstasy→"엑스터시" |

**수정 지시**
1. `content/voca_dictionary.json`을 교재 기준으로 교정한다. `voca-meaning-defects.json`의 `suggested`를 출발점으로 쓰되, **교재 원본 뜻이 있으면 그것이 우선**이다.
2. `MALFORMED` 5건은 단어 자체를 고쳐야 한다 — `content/lessons/phonics/*.json`의 `wordgrid` 셀과 사전 키를 함께 수정(`ancesto`→`ancestor`, `calender`→`calendar`, `gray(grey)`/`autumn(=fall)`/`"insistence,-cy"`는 표기 규칙을 정해 통일).
3. 단어 셀을 바꾸면 **Ava 음성 파일명 해시가 바뀐다.** `scripts/generate-azure-ava.mjs`를 다시 돌려 새 텍스트의 클립을 생성·업로드해야 한다(미생성 시 브라우저 TTS로 폴백되어 음색이 달라짐).
4. 361개 외에도 같은 성격의 오류가 더 있을 수 있다. 가능하면 3,877개 전수 재검수.

**완료 조건**: `voca-flags.cjs`를 수정된 사전으로 다시 실행해 플래그 0건, 그리고 `mv1-03`, `mv2-11`(월 이름), `hv-16`(혼동 어휘쌍) 화면 육안 확인.

---

### KIG-005 (P1) — GRAMMAR 종합평가가 한 글자에 70점을 준다

`src/components/GrammarLearningView.tsx:403`
```ts
} else if (user.replace(/\s/g, "") === model.replace(/\s/g, "") || model.includes(user)) {
  partialMatches++;      // ← 모범답안이 사용자 입력을 "포함"하기만 하면 부분정답
```
`a`, `e`, `you` 한 글자/한 단어도 부분정답(70점). 실측: GRAMMAR I 1,628문항 중 **1,171개**, GRAMMAR II 796문항 중 **668개**가 `"a"` 입력만으로 부분점수를 받는다.

**재현**: `/grammar1/gh1-006` → Step 4 → 5번 `a`, 6번 `e` 입력 → 채점 → 둘 다 `△ 부분 정답 (70점)`.

**수정 지시**: 부분점수를 **단어 단위 유사도**로 계산한다. 예)
```ts
const uw = normalizeForComparison(user).split(" ").filter(Boolean);
const mw = normalizeForComparison(model).split(" ").filter(Boolean);
const hit = uw.filter((w) => mw.includes(w)).length;
const ratio = mw.length ? hit / mw.length : 0;
// exact: 문자열 일치, partial: ratio >= 0.7 && uw.length >= mw.length * 0.6, 그 외 incorrect
```
임계값은 조정 가능하나 **한두 단어 입력이 부분정답이 되어선 안 된다.**

**완료 조건**: `gh1-006` Step 4에서 `a` → 오답(0점), 모범답안 그대로 → 정답(100점), 단어 하나 틀린 문장 → 부분정답.

---

### KIG-006 (P1) — 대안 정답이 오답 처리되고 영어 답에 한글이 섞임

**데이터 결함**: 영어 모범답안 칸에 한국어 "(혹은 …)"과 두 개의 답이 함께 들어 있다. 91개 문항(GRAMMAR I 12개 레슨) + `gh2-037`.
```
gh1-010 #8  "They have dreams (혹은 a dream.)"
gh1-016 #2  "Each boy receives a prize(혹은 prizes)."
gh1-024 #16 "Am I not a boy(혹은 Ain't I a boy)?"
```
결과: ① 정답을 입력해도 exact 불일치 ② Ava TTS가 "혹은"을 영어 발음으로 읽음 ③ 괄호 대안 표기(`Those(They) are their pens.`)는 어느 쪽을 써도 오답.

**재현**: `/grammar1/gh1-006` Step 4 → 9번에 `Those are their pens.` → `✕ 오답 (0점)`.

**수정 지시**
1. 데이터: 대안 답을 한 칸에 담지 말고 **배열로 분리**한다. `content/lessons/grammar1/*.json`의 해당 문항을 `text`(주 답) + `alternatives[]`로 나누는 스키마 확장을 권장(`src/lib/types.ts`의 `SentenceItem`에 `alternatives?: string[]` 추가).
2. 코드: 채점 시 `alternatives` 중 하나와 일치하면 정답. 괄호형 `A(B)`도 파싱해 `A`, `AB`, `B` 조합을 허용.
3. TTS로 읽을 문장에서는 한국어 주석과 괄호 대안을 제거한 **주 답**만 사용.
   전체 목록: `evidence/data-audit-raw.json` → `issues[]` 중 `code === "ANSWER_HAS_KOREAN"`.

---

### KIG-007 (P1) — gh1-020 이론 문항 답 8개 누락 + 음원 404

- `content/lessons/grammar1/gh1-020.json` / `gh1-021.json`은 `(1)…(16)` 형태의 문법 이론 문답인데, **16문항 중 8문항의 답이 비어 있다.** 모범답안을 그대로 입력해도 종합평가 최고점이 50점.
- `/audio/grammar1/gh1-020.mp3`, `/audio/grammar1/gh1-021.mp3` → R2 **404** (`evidence/media-check-summary.json` → `originalMp3.missing`).
- 답 문장 9개는 Ava 클립도 없음(`evidence/media-check-summary.json` → `avaMissingContent`).

**수정**: 원본 교재에서 답 8개를 채우고, 음원을 업로드하거나 해당 레슨의 음성 버튼을 숨긴다. 답을 채운 뒤 `generate-azure-ava.mjs` 재실행.

---

### KIG-008 (P1) — 퀴즈 "정답"이 지문/스크립트 내용과 무관

**READING** — `src/lib/readingUtils.ts:402-683` `generateReadingQuiz()`
정답 보기가 **키워드 부분일치**로 결정된다. `tEn.includes("art")`는 `start`·`part`·`heart`에, `tEn.includes("air")`는 `chair`·`fair`에, `tKo.includes("법")`은 `방법`에 걸린다. 그 결과:

| 판정 | 수 | 근거 |
|---|---|---|
| 지문 주제와 맞음 | 48 | — |
| **오답** | 170 | 예: `pr020`(흙·식물·생태) → 정답 "예술 및 음악의 본질적 표현력" / `pr100`(새끼원숭이 실험) → 같은 음악·예술 보기 |
| **비문 폴백** | 38 | `pr250` → "…가정해 보자의 중요성 및 실천적 의미" (첫 문장 + 접미사) |

**LISTENING** — `src/lib/listeningUtils.ts:332-428` `generateListeningContextQuiz()`
276개 중 **165개가 기본값** "화자가 자신의 신원, 가족 관계, 생활 환경을 차분히 들려주는 일상 소개 담화"로 고정. 실제로 내용과 맞는 건 22개뿐.
예: `d166`(마크 트웨인 전기), `d197`(서커스 광대), `d218`(수집벽 논설) 전부 같은 기본값.

전수 판정 결과는 `evidence/reading-q1-answer-keys.txt`, `evidence/ld-q1-answer-keys.txt` (형식 `레슨|배정된 정답 태그|지문 앞부분`).

**수정 지시 (택1)**
- **A안(권장)**: 레슨별로 검수된 문항/정답/해설 데이터를 만들어 `content/`에 두고 생성기를 제거한다. 생성 규칙으로는 정답을 만들 수 없다.
- **B안(임시)**: 해당 퀴즈 단계를 비노출 처리(READING Step 3의 객관식, LISTENING Step 1의 맥락 퀴즈). 클로즈 빈칸은 지문에서 직접 나오므로 유지 가능.

**절대 금지**: 임계값만 조정해 "고쳤다"고 처리하는 것. 정답 자체가 지문에서 도출되지 않는 구조다.

---

### KIG-009 (P1) — "원어민 음성" 표기와 실제 재생 불일치 (정책 결정 필요)

`src/components/AudioPlayer.tsx:62`
```ts
const isTtsMode =
  fallbackSentences.length > 0 && (shouldUseUnifiedSpeech(pathname) || missing || !src);
```
`shouldUseUnifiedSpeech()`(`src/lib/unifiedSpeech.ts:42`)는 **CNN을 제외한 모든 경로에서 true**. 따라서 원본 MP3는 한 번도 요청되지 않고 항상 Azure Ava TTS가 재생된다.
- 원본 MP3 2,510개는 R2에 정상 존재(`evidence/media-check-summary.json`).
- 그런데 화면에는 "🔊 원어민 음성", "원어민 분할 음원", "전문 나레이션" 문구가 있다.

**결정이 필요하다 — 제품 소유자 확인 후 진행**
- (a) 원본 녹음 재생을 복구 → `isTtsMode` 조건에서 원본이 있으면 원본 우선, 없을 때만 TTS 폴백.
- (b) AI 음성 사용을 유지 → 모든 "원어민" 표기를 실제 제공 방식에 맞게 수정(표시광고 정확성 문제).

---

### KIG-010 (P1) — STUDENT `s19-3` 누락
Chapter 19가 `s19-1, s19-2, s19-4`로 이어져 세 번째 카드가 "Part 4"로 표시된다. `/student/s19-3` → 404. `content/lessons/student/s19-3.json` 없음, `content/courses/student.json`의 19번째 그룹에도 없음.
**수정**: 원본 아카이브에서 `s19-3` 복원. 원본에 없다면 `s19-4`를 `s19-3`으로 재번호하고 인덱스·`menuLabel`·`part` 필드를 정리.

---

### KIG-012 (P1) — VOCA 예문·연어가 자동 생성 템플릿
`src/lib/vocaUtils.ts:243-255` `getCollocation()` — 프리셋 10개 단어를 제외한 **5,813칸**이 아래 형태로 표시된다.
```
"vital role of do"  →  do (하다)의 핵심적 역할
"Understanding the exact meaning of "do" is essential for daily conversation."
```
비문법적이고 학습 가치가 없다. 어원 카드(`analyzeEtymology`, 같은 파일 149-174행)도 1,100칸이 접두사 추정 규칙 결과(`under`→`un`+`der`, `problem`→`pro`+`blem` 등 오분해 포함).
**수정**: 실제 예문·연어 데이터를 확보해 단어별로 채우거나, 해당 카드(Step 1의 "실전 연어 덩어리", "어원 & 파닉스 분해")를 비노출.

---

## 3. P2 목록 (출시 전 처리 권장)

| ID | 제목 | 위치 / 증거 | 수정 요지 |
|---|---|---|---|
| KIG-013 | 잠긴 레슨도 "완료 체크" 가능 | `LessonActionButtons.tsx`, `ProgressProvider.tsx` | 권한 없는 레슨은 완료/북마크 토글 비활성화 |
| KIG-014 | 진도 API 한 번으로 20챕터 전체 해금 | `src/app/api/progress/student/route.ts`, `src/lib/studentProgress.ts:229-262` | 서버가 챕터 순서를 검증: 해금된 챕터의 레슨 완료만 반영 |
| KIG-015 | 연음 클리닉 음성 3,403개 결측 | `evidence/media-check-summary.json` → `avaMissingLiaison*` | `generate-azure-ava.mjs` 수집 대상에 `generateLiaisonPoints()` 산출 문구 추가 후 생성·업로드 |
| KIG-016 | READING 어휘 품사·뜻 불일치 303건/176레슨 | `evidence/reading-pos-flags.txt` | `readingVocabulary`의 `partOfSpeech`/`korean` 교정 (`prefer [n.] 선호하다` 등) |
| KIG-017 | READING 지문 5쌍 중복 | pr012=pr007, pr036=pr009, pr069=pr024, pr216=pr197, pr251=pr247 | 원본 중복 여부 확인 후 교체 또는 레슨 수 표기 정정 |
| KIG-018 | 클로즈 빈칸 10개 미생성(정답 노출) | `src/lib/readingUtils.ts:694-726` | 대상 단어에서 따옴표·세미콜론 등 구두점 제거 후 정규식 생성. 정규식 특수문자 이스케이프 필수 |
| KIG-019 | VOCA 퀴즈 복수정답 오채점 14레슨 | `src/lib/vocaUtils.ts:261-337` | 같은 뜻을 가진 단어를 오답 보기에서 제외 |
| KIG-020 | `gh2-046` 7번 문제가 "마찬가지." | `content/lessons/grammar2/gh2-046-1.json` | 원본 한국어 문장으로 교체 |
| KIG-021 | 한/영 정렬 의심 문항 | `gh1-122`, `gh2-036`, `gh2-047`, `gh2-046` | 번호·길이 불일치 문항 육안 검수 |
| KIG-022 | 검색이 STUDENT·본문을 못 찾음 | `scripts/buildSearchIndex.ts:5-12` | `courses` 배열에 student 추가, 본문 텍스트 색인 추가, "고등" 검색 시 중등 우선 문제(모든 phonics 레슨에 동일 키워드 주입) 해결 |
| KIG-023 | STUDENT `s1-2` 영어 문장에 한글 | `content/lessons/student/s1-2.json` | "I live at 한국Apartment." → 자리표시 문구 정리 (무료 체험 레슨이라 노출 큼) |
| KIG-024 | 타이핑 딕테이션이 공백 변형을 오답 처리 | `src/components/LdLearningView.tsx:273-277` | 비교 전 `replace(/\s+/g," ")`로 공백 정규화 |

---

## 4. P3 목록 (출시 후 가능)

| ID | 내용 | 위치 |
|---|---|---|
| KIG-025 | 한 레슨 내 중복 단어 (mv2-12 12개월 전부, hv-44 motive, hv-48 peer, hv-58 reside) | `content/lessons/phonics/*` |
| KIG-026 | `s13-2` 영어 문장에 한글 "(이순신)" | 데이터 |
| KIG-027 | READING 어휘 3개가 지문에 없음 (pr031 danger·equip, pr037 arrogant) | 데이터 |
| KIG-028 | 힌트 일부 누락 30레슨 / KIG-030 힌트 없는 23레슨 | `evidence/ld-transcript-quality.json` |
| KIG-029 | 번역이 원본 `-1` 페이지와 부분 상이 87레슨 | `evidence/reading-divergence.json` |
| KIG-031 | 레슨 하단 원본 경로 노출 "출처: Student/s1-1.html · euc-kr" | `src/app/[course]/[lesson]/page.tsx` 하단 footer |
| KIG-032 | "음절 수: N글자"가 실제로는 글자 수 | `PhonicsLearningView.tsx:518` |
| KIG-033 | "마스터 체크"를 3번 눌러야 마스터됨 | `PhonicsLearningView.tsx:536-546` (`updateLeitnerCard` streak 로직) |
| KIG-034 | 어휘 카드 번호가 `#010`, `#011` | `ReadingLearningView.tsx:785` |
| KIG-035 | 속독 WPM 상한 없음 (3초 완독 → 1680 WPM) | `ReadingLearningView.tsx` `WpmStopwatchBar` |
| KIG-036 | 모바일 375px 단계 탭 라벨 잘림 / 데스크톱 800px 상단 내비 잘림 | 각 View의 탭 그리드, `TabBar.tsx` |
| — | Step 1 "전체 정답 보기"가 Step 2 빈칸 정답까지 공개 | `GrammarLearningView.tsx` `revealedAnswers` 공유 |
| — | LISTENING Step 1 퀴즈는 정답 공개 후 선택 변경 가능 | `LdLearningView.tsx` |
| — | TTS 폴백이 `translate.google.com/translate_tts` 비공식 API 사용 | `src/lib/speech.ts:707` |
| — | 섹션 소개 페이지 레슨 수 이중 집계 (`/t/ld` 552, 실제 276) | `src/app/t/[tab]/page.tsx` + `course.lessonCount` |
| — | 운영 미디어가 `r2.dev` 공개 URL 의존(Cloudflare 문서상 rate-limit·운영 비권장) | `next.config.ts`, `src/lib/media.ts` |
| — | `/favicon.ico` 404 | `src/app/` |

---

## 5. 재검증 방법

`docs/qa-2026-09-15/scripts/` 안의 스크립트는 감사 당시 실제로 사용한 것이다. 파일 상단의 절대경로 상수 2개(레포 경로, 출력 디렉터리)만 바꾸면 그대로 돌아간다. Node 20+ 필요.

| 스크립트 | 검증 대상 | 성공 기준 |
|---|---|---|
| `audit-data.cjs` (+`tsload.cjs`) | 905개 레슨 데이터 무결성 (번호 연속·중복·빈 값·언어 슬롯·짝 페이지) | `summary`에 P0/P1 코드 0건 |
| `probe3.cjs` | READING 지문 원본 일치 | 비-MINOR 유형 0건 |
| `probe5.cjs` | LISTENING 스크립트 절단·힌트 불일치 | 둘 다 0건 |
| `probe7.cjs` | 퀴즈 정답 키 분포 덤프 | 사람이 검수 |
| `voca-flags.cjs` | VOCA 뜻 오류 | 플래그 0건 |
| `crawl-prod.cjs` | 운영 전 레슨 HTTP·**잠금 노출** | `lockedLessonsWithBodyInHtml` 전부 0 |
| `media-check.cjs` | 원본 MP3 + Ava 클립 존재 | 404 0건 (동시 요청 4 이하로 유지할 것) |
| `expected.cjs` → `ui-harness.cjs` → `aggregate.cjs` | 헤드리스 브라우저로 905개 레슨 렌더링·조작 | 예외 0, 재생 905/905 |
| `make-fixture.cjs` | 로컬 QA용 임시 이용권 생성 | 작업 후 `data/license-devices.json`, `data/student-progress.json` **삭제** |

**로컬 유료 레슨 테스트 절차** (운영에 침투하지 않는 방법)
```powershell
node docs/qa-2026-09-15/scripts/make-fixture.cjs     # QA 키/토큰 생성 (qa-secrets.json)
$env:R2_ACCOUNT_ID=' '; $env:R2_ACCESS_KEY_ID=' '; $env:R2_SECRET_ACCESS_KEY=' '; $env:R2_BUCKET_NAME=' '
$env:LICENSE_SECRET='<qa-secrets.json의 secret>'; $env:LICENSE_SALT='<salt>'
npx next dev -H 127.0.0.1 -p 3100
# 브라우저에서 localStorage에 kig:device:id:v1 / kig:license:v1 주입 후 /api/license/verify 호출 → 쿠키 발급
```
> R2 환경변수를 공백으로 덮어써야 운영 버킷 대신 로컬 파일 저장소가 쓰인다. 반드시 확인할 것.

---

## 6. 감사 결과 수치 (회귀 판단 기준선)

| 섹션 | 기대 | 발견 | 테스트 | PASS | FAIL |
|---|---:|---:|---:|---:|---:|
| STUDENT | 81 | 81 | 81 | 79 | 2 |
| VOCA | 195 | 195 | 195 | 18 | 177 |
| GRAMMAR I | 53 | 53 | 53 | 40 | 13 |
| GRAMMAR II | 44 | 44 | 44 | 42 | 2 |
| LISTENING | 276 | 276 | 276 | 11 | 265 |
| READING | 256 | 256 | 256 | 8 | 248 |
| **합계** | **905** | **905** | **905** | **198** | **707** |

레슨별 FAIL 사유는 `evidence/per-lesson-verdicts.json`(`lessons[].defects[]`)과 `evidence/fail-lists.txt`에 있다.
판정 규칙: 레슨 고유의 P0–P2 결함이 1건이라도 있으면 FAIL, P3만 있으면 PASS. 플랫폼 공통 결함(KIG-001·005·009 등)은 레슨 판정에 포함하지 않음.

**정상 동작이 확인된 것 (회귀시키지 말 것)**
- 네비게이션: 홈→섹션→레슨→다음/이전, 뒤로·앞으로, 새로고침, 섹션 경계 54곳, 없는 경로 25개 404, GRAMMAR I 홀수 페이지 307 리다이렉트
- 북마크 추가/유지/필터/해제, 진도 저장·서버 동기화, 학습 상태 localStorage 유지
- STUDENT 서버 게이팅, 순차 해금(5강+마지막 강의), STUDENT 전용권의 타 과정 차단
- 905개 레슨 렌더링에서 JS 예외 0건, 앱 네트워크 4xx/5xx 0건, 오디오 재생 905/905
- 모바일 375px 가로 넘침 없음

---

## 7. 사람이 볼 보고서
전체 판정 보고서(디자인 포함): <https://claude.ai/artifact/HgW1EJAj4F6TDiTNJJCmSo>
