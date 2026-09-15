# 5차 세션 작업 지시 (2026-09-16)

> 새 AI는 `PROMPT.md` → `PROGRESS.md` → **이 문서** 순서로 읽고 시작하세요.
> 이 문서는 4차 세션(WorkBuddy) 결과를 소유자 측이 검수한 **피드백**과 **다음 작업 목록**입니다.
> PROGRESS.md 와 이 문서가 충돌하면 **이 문서가 우선**입니다.

---

## 0-Z. 🔴 지금 작업 대기열 — 새 세션은 여기부터 (2026-09-16 08:40 기준)

> 이 절이 현재 작업 지시입니다. 아래 §0-A·§A·§B 는 지난 세션들의 기록입니다.
> **작업 트리는 깨끗하고 `main` 은 `f0d8475` 로 푸시되어 있습니다.** 반쯤 된 변경은 없습니다.

### 직전 세션들이 끝낸 것 (다시 하지 마세요)

| 커밋 | 내용 |
|---|---|
| `9e65501` `6f7f43d` | **RE-016 완료** — 없는 주소가 404 + 실제 화면. 7개 형태 운영 확인. proxy 는 2세그먼트 경로에만 |
| `8c59d82` | **RE-006** — CSP 를 **Report-Only 로** 배포. 강제 모드 전환은 아직 |
| `a54e427` | `getCollocation` 시그니처 변경의 `.cjs/.mjs` 호출부 추적 |
| `c930694` | 추출기 CESU-8 디코더 — 8바이트 때문에 페이지 전체가 EUC-KR 로 잘못 읽히던 문제 |
| `1a64d41` | 교재 원본 대조 결과 5개 레슨 복구. `content/` 깨진 문자 **0** |
| `2a681ea` | **`s19-3` 레슨 복원** — 2009년판에만 있던 것. STUDENT 81 → 82 |
| `f0d8475` | **KIG-006 이식 완료** — 408문장, 음성 재생성 포함 |

**원본 아카이브 대조가 끝났습니다.** `content/` 쓰기 금지는 **해제되었습니다.**
대조 결과는 `evidence/archive-comparison.json`, 소유자 판단이 필요한 82건은
`evidence/textbook-defects.json` 에 있습니다.

### 할 일 — 이 순서로

**[1] RE-004 🔴 — 폐지 과정 음원 1,463개가 인증 없이 받아집니다**

`src/lib/mediaAccess.ts` 의 `unclaimed → allowed: true` 기본값 때문입니다.
허용 목록(allow-list) 방식으로 바꾸세요.

⚠️ 좁히다가 현행 과정 음원을 막으면 **유료 회원 음성이 끊깁니다.**
완료 조건 — 전부 운영에서 확인:
- 폐지 과정(GVA 등) 음원 표본 → 403
- 무료 레슨 음원 → 200
- Ava 클립(`/audio/azure-ava/...`) → 200
- 구간 재생(Range) → 206
- `/api/media-health` 정상

**[2] KIG-008 마무리 — 주석 처리를 플래그로**

`f820a77` 이 `questions`/`contextQuizzes` 를 빈 배열로 두고 JSX 를 `/* */` 로 감쌌습니다.
동작은 맞지만 주석 코드는 썩습니다.

```ts
// 자동 생성 정답이 틀려(KIG-008) 검수 문항이 생길 때까지 비노출.
const SHOW_GENERATED_QUIZ = false;
```

JSX 는 `{SHOW_GENERATED_QUIZ && ( … )}` 로 감싸고 생성 함수 호출도 그 뒤로 보내세요.
죽은 코드가 아니라 꺼진 기능이 되고, 나중에 상수 하나만 바꾸면 됩니다.

**[3] RE-008 — 사이트맵에서 잠긴 레슨 약 1,700 URL 제외**

완료 조건: 사이트맵의 모든 URL 이 비로그인 200 + 본문 있음.

**[4] RE-005 — VOCA 괄호가 음성으로 읽힘**

`colo(u)r` · `gray(grey)` 등 14건. 표시용/합성용 문자열을 분리하세요.
⚠️ **텍스트가 바뀌면 음성 클립 재생성 필수**(클립 키가 텍스트 해시).
바꾼 건수와 `generate-azure-ava.mjs --dry-run` 의 `pending` 을 같이 보고하세요.

**[5] RE-006 마무리 — CSP 를 강제 모드로**

지금은 Report-Only 라 아무것도 막지 않습니다. `next.config.ts` 의
`CSP_REPORT_ONLY` 를 `false` 로 바꾸기 **전에**, 운영의 주요 라우트에서
콘솔 CSP 위반이 0건인지 확인하세요. 음성(`/audio`)·폰트·Next 인라인 스크립트가
막히면 사이트가 깨집니다.

### 🔴 새 레슨을 추가하거나 id 를 바꾸면

`src/lib/generated/validRoutes.json` 을 반드시 다시 만드세요. proxy 가 이걸 읽습니다.

```bash
node scripts/buildValidRoutes.mjs
```

`prebuild` 가 해 주지만 **`npx next build` 는 `prebuild` 를 돌리지 않습니다.**
`s19-3` 을 복원했을 때 이 목록이 낡아서 새 레슨이 통째로 404 였습니다.

### 검증 공통 규칙 — 오늘 실제로 난 실패에서 나온 것

- **상태 코드가 아니라 실제로 렌더링된 텍스트로 판정하세요.**
  `<body>` → `<script>` 제거 → 태그 제거 → 남은 글자 수.
  404 수정이 "5개 경로 통과"로 보고됐지만 서버 HTML 은 비어 있었습니다.
- **프로브의 검사 축을 늘리세요.** 경로 수만 늘리면 같은 실수가 반복됩니다.
- **TS 함수 시그니처를 바꾸면 `.cjs`/`.mjs` 호출부를 grep 하세요.** 타입 검사가 안 잡습니다.
  `getCollocation` 인자 변경이 데이터 감사 도구를 죽이고 음성 수집기를
  **에러 없이 0개**로 만들었습니다. 후자가 더 위험합니다.
- **개수가 아니라 내용을 보세요.** `gh1-033` 이 "우리가 망가뜨린 것"으로 분류됐던 이유는
  항목 수가 23 vs 25 였기 때문인데, 실제로는 교재가 원래 두 문항을 한 줄에 쓴 것이었고
  차이는 끝에 붙은 가짜 2개였습니다.
- 커밋 전 반드시 `npx tsc --noEmit` 과 `npx next build`.
- 각 건마다 운영 실측값을 숫자로 보고하세요.

### 🔴 절대 하지 말 것

- **`git add -A` / `git add .` 금지.** 파일을 이름으로 지정해서만 add 하세요.
- `git stash` 금지 (이 저장소에서 `fatal: unable to read tree` 이력).
- **`content/lessons/student/` 의 괄호를 대안으로 분리하지 마세요.** 빈칸 자리표시자입니다.
  `apply-kig006.cjs` 의 `EXCLUDED_COURSES` 로 막혀 있습니다. 플래그로 풀지 마세요.
- CNN·GVA 건드리기 — 폐지 대상입니다.
- UI 문구에 음성 출처 언급 — "원어민 음성"도 "AI 음성"도 쓰지 마세요. 기능만 설명하세요.

### 남은 것 중 소유자 몫 (AI 가 손대지 말 것)

- **법적 문서 6종** — `/terms` `/privacy` `/refund` 등. 유일한 출시 차단 요인입니다.
- **결제 수단 결정**
- **`evidence/textbook-defects.json` 82건** — 교재 자체의 결함이라 아카이브로 못 풉니다.
- **VOCA 뜻 507건** — 교재에 한글 뜻이 아예 없었습니다. AI 생성물이라 별도 검수가 필요합니다.

---

## 0-A. ✅ 완료 — RE-016 백지 (기록 보존용, 지시 아님)

> **`9e65501` + `6f7f43d` 에서 해결되었습니다.** 운영에서 7개 형태 전부 404 + 화면 정상.
> 아래는 그 과정에서 **시도해 실패한 두 가지**의 기록입니다. 같은 길을 다시 파지 마세요.
> 맨 아래 "proxy 안으로 진행하세요"는 **이미 진행되어 끝났습니다.**

`/x/y` · `/ld/x` · `/t/x` · `/reading/nope` · `/student/nope` 이 404 는 맞지만 본문이 빈 문제입니다.
2026-09-16 새벽에 아래 두 가설을 **로컬 빌드로 끝까지 실측**했습니다. 둘 다 실패했습니다.

### ❌ 가설 1 — `generateStaticParams` 를 세그먼트별 형태로

부모 `[course]/page.tsx` 가 이미 `generateStaticParams` 를 가지므로 자식은 `{ lesson }` 만
반환해야 한다고 보았습니다. **틀렸습니다.** 이 라우트의 `generateStaticParams` 는
**부모 파라미터를 전혀 받지 않습니다** — `course` 가 `undefined` 로 들어옵니다
(빌드에 `throw` 를 넣어 확인). 그 결과 필터가 아무것도 못 맞춰 레슨이 0개 생성되고,
`dynamicParams = false` 가 **실제 레슨까지 전부 404** 로 만들었습니다 (`/ld/d001` 404 확인).

> 부수 소득: 이때 `/[course]/[lesson]` 이 프리렌더 매니페스트에 `fallback:false` 로 **나타났습니다.**
> 즉 매니페스트에 항목이 생기는 것은 **수정이 맞다는 증거가 아닙니다.** 파라미터 공간이
> 비어도 항목은 생깁니다. `/ld/d001` 이 200 인지를 봐야 합니다.

### ❌ 가설 2 — `generateMetadata` 에서 `notFound()`

메타데이터는 셸이 나가기 전에 처리되므로 거기서 던지면 응답을 통째로 바꿀 수 있다고
보았습니다. **효과 없음** — 빌드·실측 결과 5개 경로 전부 그대로 백지였습니다.

### 확인된 원인

이 라우트는 **이용권 쿠키를 읽으므로(KIG-001) 강제로 동적**입니다. 그래서 프리렌더
매니페스트의 dynamic routes 에 애초에 들어가지 못하고, `dynamicParams = false` 가
붙을 자리가 없습니다. `/x` 와 `/x/y/z` 만 되는 이유도 이것입니다 — 전자는 쿠키를 읽지 않는
`[course]` 세그먼트이고, 후자는 어떤 라우트에도 매칭되지 않아 라우터가 직접 처리합니다.

### → 그러므로 `proxy` 안이 맞습니다. 진행하세요.

Next 16 문서가 지시하는 해법이고, 더 싼 길 두 개를 실측으로 배제했습니다.
진행할 때 아래를 지켜 주세요:

1. **유효 경로 목록은 빌드 타임 생성.** `scripts/buildSearchIndex.ts` 가 선례입니다.
   런타임에 `content/` 를 읽지 마세요.
2. **실패 모드를 먼저 정하세요.** proxy 가 던지면 사이트 전체가 죽습니다.
   목록 로드에 실패하면 **통과**시키는 쪽으로(fail-open) 하세요 — 백지 404 보다
   나쁜 것은 전체 장애입니다.
3. **지연 측정.** 수정 전후로 `/`, `/ld`, `/ld/d001` 응답 시간을 재서 보고하세요.
   현재 홈이 1.5초입니다.
4. 완료 조건은 5개 경로 전부 `404` + 서버 렌더 텍스트 200자 이상, 그리고
   `/ld/d001` · `/reading/pr001` · `/` 가 여전히 200 인 것입니다.

`/student/nope` 도 같은 증상이므로 함께 처리하세요.

---

## 0. ✅ 완료 — KIG-006 이식 (기록 보존용, 지시 아님)

> **`f0d8475` 에서 이식이 끝났습니다.** 408문장 + 음성 재생성 완료, `pending: 0`.
> 아래 "실행하면 안 됩니다"는 **당시의 차단 사유**이고 지금은 해제되었습니다.
> 다만 두 가지는 **여전히 유효한 규칙**입니다:
> ① STUDENT 는 `EXCLUDED_COURSES` 로 영구 제외 — 플래그로 풀지 마세요.
> ② 엔진은 "치환이어야 할 괄호를 삽입"하는 버그가 남아 있습니다. `kig006-decisions.json`
>    의 12건이 그 회귀 테스트 케이스입니다.

`apply-kig006.cjs --write` 를 **지금 상태로 실행하면 안 됩니다.** 실제로 확인한 방법은
`content/` 를 임시 폴더로 복사한 뒤 그 복사본에 `--write` 를 돌려 결과물을 전수로 읽는 것이었습니다.
작업 트리는 건드리지 않았습니다. 발견은 두 가지입니다.

### 0-1. STUDENT 25건은 레인 자체가 틀렸습니다 — 이미 코드로 차단해 두었습니다

STUDENT 의 괄호는 **대안 정답이 아니라 학습자가 채우는 빈칸**입니다.

| 원문 | 적용 결과 |
|---|---|
| `My favorite food is (bulgogi).` | `My favorite food is.` |
| `His/Her name is (friend's name).` | `His/Her name is.` |
| `There are (4) people in my family: …` | `There are people in my family: …` |
| `He/She is about (age) years old.` | `He/She is about years old.` |
| `My best friend is (name), and I have known him/her for 3 years.` | `My best friend is, and I have known him/her for 3 years.` |

생성된 대안도 같이 깨집니다 — `Their names names.` · `My favorite food bulgogi.` ·
`My teacher's name is Mr./MSurnameeacher's name is Mr./Ms.`

**25건 중 정상 0건입니다.** 게다가 `text` 가 바뀌므로 이 깨진 문장 25개로 **음성 클립이 합성·배포**됩니다.

→ `apply-kig006.cjs` 에 `EXCLUDED_COURSES = new Set(["student"])` 를 넣어 두었습니다.
`--course student` 로도 우회되지 않습니다. 이식 대상은 **429 → 404건**(grammar1 374 · grammar2 30).
**플래그를 추가해 이 차단을 풀지 마세요.** STUDENT 는 괄호를 "자리표시자"로 분류만 하고
`text` 를 건드리지 않는 **별도 레인**이 필요합니다.

### 0-2. GRAMMAR 대안에 비문이 섞여 있고, 검증기 4종이 전부 놓칩니다

`verify-kig006-multiparen` / `-determiners` / `-proposals` / `-insert-semantics` 는
이 시점에 전부 통과(14/14, 47행 0실패, 19/19, 17/17)로 나오는데 아래를 하나도 잡지 못했습니다.

```
Please keep (be) quiet.
  → 대안 "Please keep be quiet."                    (비문)
May I have the day off tomorrow(have tomorrow off)?
  → 대안 "May I have have tomorrow off?"            (have 중복)
What was her maiden name(family name: last name)?
  → 대안 "family name: last name"                   (문장이 아니라 주석)
Were they policemen(police officers)?
  → 대안 "Were they policemen police officers?"     (치환이 아니라 삽입)
```

전수 스캔으로 **명백한 파손 12건**을 확인했지만, `keep be quiet` 처럼 문법만 틀린 것은
자동으로 잡히지 않습니다. 404건의 실제 불량률은 이보다 높습니다.

**→ 가드와 검수표는 이미 만들어 두었습니다: `scripts/review-kig006.cjs`**

```bash
node docs/qa-2026-09-15/scripts/review-kig006.cjs
  → evidence/kig006-review-table.md   (content/ 에 쓰지 않음)
```

현재 출력: **검수 대상 239문장 · 가드 적발 19행 · 버린 대안 15개 · 남은 대안 242개**

가드는 4겹입니다. 각각 실제로 통과해 버린 행이 있어서 만든 것이고, 주석에 그 행을 적어 두었습니다.

| 가드 | 잡는 것 | 예 |
|---|---|---|
| G1 `isGloss` | 괄호 안이 답이 아니라 설명, 또는 종결부호 소실 | `family name: last name` |
| G2 `hasDoubledRun` | 같은 단어·구 연속 중복 | `May I have have tomorrow off?` |
| G2b `isAppendNotSubstitute` | **치환이어야 할 것이 삽입됨** — 주정답이 대안 안에 통째로 살아 있음 | `Were they policemen police officers?` · `I don't either, Neither do I.` · `…airsick or seasick aboard a ship.` |
| G3 `looksUngrammatical` | 동사 연속·한 단어짜리 | `Please keep be quiet.` · `Speaking.` |
| (행 단위) `primaryDoubt` | 괄호 안이 **완전한 문장**이라 주정답 규칙이 뒤집힐 수 있는 행 | `I think it the best way to success to work hard. (I think the best way to success is to work hard.)` ← 주정답이 비문으로 남음 |

### 0-3. ✅ 검수 완료 — 소유자가 19행을 전부 판정했습니다 (2026-09-16)

결정은 **`docs/qa-2026-09-15/kig006-decisions.json`** 에 있습니다.
`review-kig006.cjs` 와 `apply-kig006.cjs` 가 **같은 파일을 읽으므로** 검수표와 기록 결과가 어긋날 수 없습니다.

| 판정 | 건수 | 내용 |
|---|---|---|
| 엔진 결과 유지 | 6 | 둘 다 정문이고 배치도 맞음 |
| 사람이 뒤집음 | 13 | `decisions[]` — 각 항목에 `reason` 포함 |

뒤집은 것 중 **반드시 알아야 할 2건**:

1. `gh1-037` — 원문에 물음표가 두 개라 엔진이 문장을 잃고 **주정답이 `?` 한 글자**가 됐습니다.
   → `Isn't he studying English?` / 대안 `Is he not studying English?`
2. `gh2-032` — **"괄호 밖이 주정답" 규칙의 유일한 예외입니다.** 괄호 밖이 비문이고
   교재가 괄호 안에 고친 문장을 적어 두었습니다. → 괄호 안을 주정답으로, 비문은 대안으로도 남기지 않음.

나머지 11건은 전부 같은 원인입니다 — **괄호가 "치환"이어야 하는데 엔진이 "삽입"했습니다.**
(`Were they policemen police officers?` · `Please keep be quiet.` · `May I have have tomorrow off?` …)

**검증 결과** (`content/` 복사본에 `--write` 후 전수 확인):

```
소유자 결정 13건 기록 : 13 / 13 통과
단어 중복이 남은 대안 : 0개
STUDENT 변경 파일     : 0개
```

**남은 할 일**

1. 🔴 **`--write` 는 원본 아카이브 대조 이후에 실행합니다 — 소유자 결정 (2026-09-16).**
   지금 `content/` 를 바꾸면 내일 `compare-archive.cjs` 결과에 404건의 "의도된 차이"가 섞여
   진짜 불일치와 구분이 어려워집니다. 순서는 **대조 먼저, 이식 나중**입니다.
   실행할 때는 **음성 클립 404개 재생성을 같은 변경에 묶으세요** (`PROGRESS.md` §3).
   묶지 않으면 404문장이 무음이 됩니다 — 괄호가 보이는 것보다 나쁜 상태입니다.
2. §2 의 220행은 아직 사람이 보지 않았습니다. 가드는 **기계적으로 보이는 것만** 잡습니다 —
   의미가 틀린 대안은 사람만 잡을 수 있습니다.
3. 가드 4겹과 결정표를 `report-kig006.cjs` 본체에도 반영해, 엔진 자체가 삽입/치환을 구분하게
   만드세요. 지금은 `review-kig006.cjs` 와 `apply-kig006.cjs` 에만 있습니다.
   `decisions[]` 의 13건이 그대로 **회귀 테스트 케이스**입니다.
4. 검증기 4종이 왜 위 7건을 전부 통과시켰는지 원인을 적고, 대안의 **문법**을 보는 검사를 신설하세요.
   지금 검증기는 전부 GRAMMAR 표본만 보고 있어 STUDENT 100% 실패도 한 건 감지하지 못했습니다.

### 0-3. 참고

- 이 검증은 `content/` 를 **쓰지 않았습니다**. §C "`content/` 쓰기 금지" 는 그대로 유효합니다.
- 위 두 파일(`NEXT-SESSION.md` · `apply-kig006.cjs`)은 **커밋되지 않은 상태**로 작업 트리에 있습니다.
  ~~확인한 뒤 당신 커밋에 함께 넣어 주세요.~~
  **정정 (2026-09-16 06:20):** 넣지 마세요. 이 문장은 §0-Z 의 "절대 하지 말 것" 목록과
  모순되며, **목록이 우선입니다.** 두 파일은 다른 세션이 아직 작업 중입니다.
  (이 모순은 8차 세션이 지적해 정정했습니다.)

---

## A. 4차 세션 결과 검수 — 반드시 먼저 바로잡을 것

> ### ✅ 2026-09-16 (6차 세션) — §A 는 전부 처리되었습니다. 아래 본문은 원래 지시문이며 기록으로 남깁니다.
>
> | 항목 | 상태 | 커밋 |
> |---|---|---|
> | A-1 클립 영향 오기 | ✅ 완료 — `PROGRESS.md` §3 정정 + 작성기가 `text 변경`/`대안만`을 분리 출력 | `ca3a7ba` |
> | A-2 주정답 규칙 | ✅ 완료 — `build(new Set())`. 검증 (8) 신설 | `7d2a073` |
> | A-3 종결부호 | ✅ 완료 — **원인은 `clean()` 이었습니다** (아래 본문의 `/[.?!]$/` 지목은 틀렸습니다). 전수 게이트 신설 | `f84678a` |
> | A-4 `isEnglish()` | ⏸️ **착수 불가** — `gh1-081 #6` 의 한국어 주석 때문에 KIG-006 이식 후에만 가능 | — |
> | A-5 `/t/[tab]` canonical+OG | ✅ 5차 세션 완료 | `fd5acf0` |
> | A-6 스크립트 정리 | ✅ 완료 — 임시파일 3종 제거(메모리 평가로 전환) + `scripts/README.md` 색인 | `817b7a7` |
>
> **추가 발견 2건** (§A 검수 중): ① `isEnglishAnswer` 가 `(혹은 …)` 셀 132건을 "한국어"로 오판해
> 전부 건너뛰고 있었습니다(괄호가 화면·TTS 로 그대로 나감). ② `propose()` 가 마커 셀을
> `parseAltMarker` 로 보내지 않아 문장부호가 깨지고 마커가 대안에 유출됐습니다.
> 둘 다 커밋 `3e82465` 에서 수정 — 이식 대상이 **297 → 429건**으로 늘었습니다.
> 상세는 `PROGRESS.md` §1-F.

### 🔴 A-1. "KIG-006 은 주정답 텍스트 변화 0건 → 음성 클립 영향 없음" 은 **틀렸습니다**

`PROGRESS.md` §3 "KIG-006 이식 절차" 가 한 문단 안에서 모순됩니다.

> `content/` 텍스트가 바뀌므로 음성 클립 재생성이 필요합니다
> 단 KIG-006 은 대안 정답만 추가하는 것이라 주정답 텍스트 변화는 0건입니다 → 클립 영향 없음.

그런데 `docs/qa-2026-09-15/scripts/apply-kig006.cjs:178` 은

```js
item.text = split.text;
```

**주정답 텍스트를 직접 덮어씁니다.** `He is (a) Korean, isn't he?` → `He is Korean, isn't he?` 처럼 297건의
`text` 가 바뀝니다. 클립 키는 `text` 의 해시이므로 **이식 직후 297문장이 무음**이 됩니다.
KIG-002 가 READING 음성을 40.6%까지 떨어뜨린 것과 정확히 같은 사고입니다.

**할 일**
1. `PROGRESS.md` §3 의 해당 문장을 바로잡으세요 ("클립 영향 없음" 삭제).
2. 이식 절차에 음성 재생성을 **필수 단계**로 넣으세요:
   ```bash
   node docs/qa-2026-09-15/scripts/apply-kig006.cjs --write
   node scripts/generate-azure-ava.mjs --dry-run      # pending 이 약 297 근처인지 확인
   node scripts/generate-azure-ava.mjs --concurrency 4
   node scripts/upload-azure-ava-r2.mjs
   node scripts/generate-azure-ava.mjs --dry-run      # pending: 0 확인
   ```
3. `apply-kig006.cjs` dry-run 출력에 **"text 가 바뀌는 건수"** 를 따로 찍게 하세요.
   "대안만 추가"와 "text 변경"을 구분해서 보고해야 이런 오판이 재발하지 않습니다.

### 🔴 A-2. 주정답 규칙 위반 — `All (the) boys receive a prize(혹은 prizes).`

결과표: text `All boys receive prizes.`
합의된 규칙은 **"교재가 먼저 쓴 것(괄호 밖)이 주정답"** 입니다. `a prize` 가 괄호 밖이므로
text 는 `All boys receive a prize.`, `prizes` 쪽은 대안이어야 합니다.
한정사 레인(`resolveOptionalDeterminers`)과 `(혹은 …)` 레인이 합쳐질 때 우선순위가 뒤집힌 것으로 보입니다.
**교차곱으로 대안이 여러 개 생기는 행 전부**에서 text 가 "괄호 밖 선택지만으로 만든 문장"인지 assert 하세요.

### 🔴 A-3. 물음표가 마침표로 바뀜 — `Is that (the) car yours?`

결과표: text `Is that car yours.`
보고서는 "terminator 0" 이라고 했지만 결과표에 위반이 찍혀 있습니다. **검증이 이 경로를 못 보고 있습니다.**
원문 종결부호(`? . !`)가 text 와 모든 alternatives 에 **그대로 보존**되는지, 297건 전수 assert 를 추가하세요.
그리고 이 행이 왜 기존 terminator 검사를 통과했는지 원인을 적으세요.

### 🔴 A-4. KIG-006-a (`isEnglish()` 오판 16건) 미처리

`src/components/GrammarLearningView.tsx:46` 이 여전히

```ts
return latin >= hangul && latin > 0;
```

입니다. `그 폭풍(storm)은 3피트의(three feet of)눈을 쏟아 붓는다.(dump)` 같은 한국어 문제가
라틴 문자 수 때문에 **영어 답안 칸으로 올라갑니다** (16건).
`latin > hangul` 류 조건은 이 16건을 못 고칩니다. **`hangul === 0 && latin > 0`** 으로 판정하세요.
단, 영어 답안 속 한국어 주석(gh1-081 #6 등)은 KIG-006 이식에서 먼저 제거되어야 하므로 **이식 후** 적용합니다.
완료 조건: 16건 목록 → 전부 한국어 칸으로 가고, 짝 영어 칸에 영어 답안이 오는지 표로 제시.
`apply-kig006.cjs` 의 `isEnglishAnswer` 도 같은 기준인지 확인하세요.

### ✅ A-5. RE-011/012 가 `/t/[tab]` 에 적용 안 됨 — **완료 (5차, 커밋 `fd5acf0`)**

`/t/[tab]` 과 `/student/[lesson]` 이 `generateMetadata` 에서 `title` 만 반환해 **canonical 을 아예
내보내지 않던 문제**를 고쳤습니다. 운영 실측 14개 라우트 중 9개가 canonical 0개였고, 지금은 14/14 입니다.
검증: `node docs/qa-2026-09-15/scripts/verify/verify-metadata.cjs <base>` →
로컬 14/14(exit 0) / 수정 전 운영 5/14(exit 1) / 배포 후 운영 14/14.
상세는 `PROGRESS.md` §1-E.

> 남긴 것: 홈(`/`)은 layout 의 `openGraph` 를 상속하며 `og:url` 이 없습니다. 페이지 레벨 `openGraph` 는
> **병합이 아니라 교체**라 title·image 가 날아가므로 의도적으로 두었습니다(OG 스펙상 선택 항목).

### 🟡 A-6. 스크립트 정리

`verify-kig006-*.cjs` 가 늘어나며 런타임 shim(`_eng-tmp.cjs`)이 `git add -A` 에 딸려 들어간 적이 있습니다.
- 임시 파일은 스크래치 디렉터리에 만들고 스크립트 종료 시 삭제
- `docs/qa-2026-09-15/scripts/verify/` 로 옮기거나 `README` 한 줄 색인 추가

---

## B. 다음 작업 목록 (A 를 끝낸 뒤 이 순서로)

전부 `src/`·`scripts/` 만 건드리므로 원본 아카이브와 무관합니다. 상세는 `docs/qa-2026-09-15/REAUDIT-2026-09-16.md`.

| 순서 | ID | 내용 | 완료 조건 |
|---|---|---|---|
| 1 | ~~RE-009~~ | 검색 인덱스 STUDENT — **4차에서 완료** (944→1,025) | 재작업 금지 |
| 2 | ~~RE-011/012 잔여~~ | `/t/[tab]` canonical + OG (A-5) — **5차에서 완료, 커밋 `fd5acf0`** | 운영 14/14 PASS |
| 3 | ~~RE-014~~ | 홈 `h1` 없음 / `/ld/d001` `h1` 2개 → 페이지당 정확히 1개 — **7차 완료, 커밋 `bb4baf2`** | 운영 23/23 PASS (수정 전 20/23) |
| 4 | ~~RE-016~~ | `not-found.tsx` · `error.tsx` · `global-error.tsx` 추가 — **7차 완료, 커밋 `3705348`**. `loading.tsx` 는 **의도적 제외**(아래 참조) | 운영 5/5 PASS (수정 전 5/5 FAIL) |

> ### ⚠️ RE-016 — `loading.tsx` 는 넣지 마세요 (7차 실측)
> 루트 `loading.tsx` 는 모든 라우트를 Suspense 경계로 감싸고, 그 결과 Next 가 **404 를 발견하기 전에
> 200 을 먼저 flush** 합니다. 같은 빌드·같은 서버에서 측정한 값입니다:
>
> | 경로 | `loading.tsx` 있음 | 없음 |
> |---|---|---|
> | `/x` (→ `[course]`) | **200** (소프트 404) | 404 |
> | `/x/y` (→ `[course]/[lesson]`) | **200** (소프트 404) | 404 |
> | `/x/y/z` (미매칭) | 404 | 404 |
> | `/ld/x` | **200** (소프트 404) | 404 |
> | `/t/x` | **200** (소프트 404) | 404 |
>
> 소프트 404 는 기본 404 화면보다 **나쁩니다** — 색인되므로 잘못된 URL 과 죽은 링크가
> 전부 검색 결과에 남습니다(RE-008 이 다루는 문제). 404 상태 코드가 스피너보다 중요하므로 제외했습니다.
> 로딩 표시가 필요하면 **레슨 페이지 내부에서 `<Suspense fallback=…>`** 으로 감싸세요.
> 경계를 라우트 레벨에 두지 않으면 소프트 404 가 생기지 않습니다.

| 5 | RE-006 | `next.config.ts` 에 **CSP** 헤더 (나머지 5종은 있음) | 운영에서 콘솔 CSP 위반 0건. 음성(`/audio`)·폰트·Next 인라인 스크립트가 막히지 않을 것 |
| 6 | RE-008 | 사이트맵에서 잠긴 레슨 제외 **또는** 레슨별 고유 소개문 | 사이트맵 URL 이 전부 비로그인 200 + 본문 있음 |
| 7 | RE-004 🔴 | `src/lib/mediaAccess.ts:60` 의 `unclaimed → allowed:true` 기본값 때문에 **폐지 과정 음원 1,463개가 인증 없이 받아짐** → **허용 목록** 방식으로 | 알려진 과정·섹션 이미지 외 경로는 403. 폐지 과정 음원 표본 403, 무료 레슨·Ava 클립은 200 유지 |
| 8 | RE-005 | VOCA `colo(u)r` / `gray(grey)` 14건이 괄호째 TTS 로 넘어감 | TTS 입력 텍스트에 괄호 0건. **텍스트가 바뀌면 음성 재생성** |

> **5차 세션 메모**: 이 표는 "A 를 끝낸 뒤"라고 되어 있지만 A 는 아직 전부 미착수입니다.
> 5차는 §C(`content/` 금지) 때문에 `PROGRESS.md` §3 그룹 C 9건 중 8건이 착수 불가인 상태였고,
> 되돌리기 쉬운 이 표의 2번을 1건 처리했습니다. A 계열(엔진 의미론)은 한 커밋에 묶지 마세요.

**RE-006 주의**: CSP 는 틀리면 사이트 전체가 깨집니다. `Content-Security-Policy-Report-Only` 로 먼저 배포해
위반 로그를 확인한 뒤 강제 모드로 전환하세요.

**RE-004 주의**: 허용 목록을 좁히다가 **현행 과정 음원을 막으면 유료 회원 음성이 끊깁니다.**
변경 후 `/api/media-health` 와 과정별 무료/유료 음원 표본(비로그인 200/403)을 반드시 운영에서 확인하세요.

---

## C. 하지 말 것

- **실제 학습 흐름 브라우저 재확인** — 소유자가 직접 확인했고 문제 없었습니다. 다시 하지 마세요.
- **`content/` 쓰기** — 원본 아카이브 재추출 전까지 금지 (`PROGRESS.md` §3, `ARCHIVE-PLAN.md`).
- **gh1-032/033 재정렬** — 아카이브로 셀 대응 확정 전까지 보류.
- 그룹 E (KIG-003·004·007·008), CNN, GVA.

---

## D. 커밋·인계 규칙

- 이슈 하나 끝날 때마다 커밋하고 `git push origin main`.
- 푸시 확인은 **`git ls-remote origin refs/heads/main`** 으로. `git log origin/main` 은 이 환경에서 낡은 값을 보여줍니다.
- **git 은 한 AI만** 씁니다. 다른 도구와 동시에 커밋하면 저장소가 깨집니다(2026-09-15 실제 발생).
- `git stash` 금지 — 이 저장소에서 `fatal: unable to read tree` 발생 이력.
- 사용량이 떨어지기 전에 `PROGRESS.md` 에 완료 이슈·커밋 해시·검증 수치 / 작업 중이던 것 / 막힌 것 / 이어받을 지점을 적고 push.
