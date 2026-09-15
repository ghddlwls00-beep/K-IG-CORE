# 5차 세션 작업 지시 (2026-09-16)

> 새 AI는 `PROMPT.md` → `PROGRESS.md` → **이 문서** 순서로 읽고 시작하세요.
> 이 문서는 4차 세션(WorkBuddy) 결과를 소유자 측이 검수한 **피드백**과 **다음 작업 목록**입니다.
> PROGRESS.md 와 이 문서가 충돌하면 **이 문서가 우선**입니다.

---

## A. 4차 세션 결과 검수 — 반드시 먼저 바로잡을 것

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
| 3 | RE-014 | 홈 `h1` 없음 / `/ld/d001` `h1` 2개 → 페이지당 정확히 1개 | 주요 라우트 전수 h1 개수 = 1 |
| 4 | RE-016 | `not-found.tsx` · `error.tsx` · `global-error.tsx` · `loading.tsx` 추가 | 없는 경로 404 화면이 사이트 디자인으로 표시, 빌드 성공 |
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
