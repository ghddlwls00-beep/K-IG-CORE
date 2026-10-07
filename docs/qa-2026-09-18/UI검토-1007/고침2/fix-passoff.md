# fix-passoff — UI · UX 재검토(10-07) 3장 '그 밖 전부' 중 PASS-OFF 몫

- 기준: `결과.md` 3장 · 1장(바꾸지 말 것) · 2장(이미 고친 모양) · 4장(사장님 판단 — 안 건드림) · `docs/디자인-규칙.md`
- 가지 `claude/regression-check-1002-8d4817` · HEAD `da191e5e` 위 작업 트리. **커밋 · 푸시 안 함.** 개발 서버 · 브라우저 안 띄움(통합 일꾼 몫).
- 내 몫 파일만 바꿈: `src/components/PassoffLearningView.tsx` · `src/components/passoff/*` · `src/lib/passoffView.ts`(화면 글만). `src/app/passoff-grammar/**` 는 고칠 것이 없어 그대로.
- 학습법 · 채점 · 학습 엔진 · 음성 글 · 잠김 표시 글 · 점검 도구(`docs/qa-2026-09-18/scripts/*`) 안 건드림. 도구가 읽는 `data-*` · `section[aria-labelledby="passoff-step-N"]` · 'Step N · 이름' 탭 글 · '5단계를 모두 마쳤어요' 그대로.
- **같은 AI 계열이 고치고 검사했습니다. 독립 검수가 아닙니다.**

## 번호마다

| # | 결과 | 파일 · 줄 | 무엇 |
|---|---|---|---|
| 14 | 고침 | `PassoffLearningView.tsx` 458~471(새 줄) · 279(포커스) · 613~623(`StepHeading`) | 탭 아래 금색 'N단계' + 18px 제목 줄을 뺌. 그 줄이 맡던 것 — ① **'마침' 표시**: 탭 바로 아래 조용한 한 줄에 지금 단계가 끝났을 때만 '✓ 이 단계 마침'(초록 · 12px, 아이콘은 `IconCheck`) ② **글자 크기 · 문장 속도(Aa) 단추**: 같은 줄 오른쪽(44px, 펼침 판도 그 아래 하나 — 전에는 다섯 단계마다 따로 그림) ③ **포커스 자리**: 단계 안 단추('다음 단계: …' · '1단계로' · 'N단계로 가기')로 옮기면 포커스가 **새 단계의 탭**으로 감(이름 'Step 2 · 문법 설명' · 눌림 상태, 다음 Tab 은 그 단계 안으로). 전역 `button:focus-visible` 테두리가 보임. 단계 제목 `h2#passoff-step-N` 은 화면 읽기용(`sr-only`)으로 남김 — 섹션 이름이고, 도구가 `section[aria-labelledby="passoff-step-N"]` 로 찾고, `drive-topic-lock.cjs` 527줄이 본문 글 '예문 떠올리기'를 기다리므로 |
| 15 | 고침 | `passoff/AnchorsStep.tsx` 53~55 · 79 · 87 · 130 | 1단계 문장마다 테두리 카드(8개) → **한 목록 상자**(`rounded-card border bg-raised`)를 `divide-y divide-line` 선으로 나눔. '앞 문장을 연 뒤에 차례가 와요'(4~7번) → 지금 떠올릴 문장 **바로 다음 문장 한 곳에만** '이 문장부터는 앞 문장을 연 뒤에 차례가 와요.' 나머지 기다리는 문장은 번호 · 한국어만. 차례 · 2초 깨어남 · '영어 보기' 하나 · 포커스는 그대로 |
| 37 | **일부** — 표시 함수만, 그리는 곳은 남의 몫 | `src/lib/passoffView.ts` 38~49 `passoffSubtitle(title, subtitle)` | 제목 줄 부제는 `src/app/[course]/[lesson]/page.tsx` 414~415줄이 `lesson.subtitle` 을 그대로 그림(내 몫 아님). 그래서 화면 글만 만드는 함수를 내 몫 파일에 둠: 머리 '(1) ' 떼기 · 목록 가운데 '(2) '는 ' · '로 · 남은 글이 제목과 같으면(공백 · 대소문자 무시) `null`(숨김). 67강에 돌린 결과: **숨김 20**(pg13-1 '부정사' · pg03-1 · pg05-1 · pg11-1 …) · 바뀜 33(예 pg04-1 '문장의 종류 — 단문', pg15-2 '평서문 · 의문문 · 명령문 · 감탄문 · 기원문의 화법 전환') · 그대로 14. 강의 파일의 subtitle 은 안 바꿈 → **다음 묶음/남의 몫**에 적음 |
| 38 | 고침 | `passoff/MapRefill.tsx` 173 · 184 · 188 | 구성도 '빈 칸' → '빈칸'(칸 안 글 · 안내 글 두 곳). 놓을 칸(빈칸) 점선 테두리 `border-line` → `border-line-input`(어둠 · 밝음 3:1 — fix-frame 토큰). 칸 이름(aria-label '…번 칸: 비어 있음')은 도구(s3c.cjs)가 읽어 그대로 |
| 47 | 고침 | `passoff/RuleStep.tsx` 88 · 158~165 `withoutBoldCue` | 2단계 '먼저 찾아보기'에서 1단계를 아직 안 연 문장이 있어 굵은 글이 없을 때만, 질문 머리의 굵은 글 가리킴('굵게 표시된' · '굵게 표시한' · '굵은 낱말' · '굵은 부분')을 떼고 그린다 — 'My · I · We 는 누구를 가리킬까요?'. 해당 강의 5개(pg01-1 · pg01-3 · pg03-2 · pg03-3 · pg08-4) 모두 자연스러운 글로 남는 것을 확인. 다 열었으면 원래 질문 그대로. 강의 파일 · 답 · 채점 안 바뀜 |
| 51 | 고침 | `passoff/FormStep.tsx` 422 · `passoff/ComposeCard.tsx` 289 · `passoff/WrapUpStep.tsx` 154 | 글 쓰는 칸 셋(3단계 짧은 답 · 4 · 5단계 영작 · 5단계 '내 문장 만들기' 빈칸) 테두리 `border-line` → `border-line-input`. 초점 때 `focus:border-ink` 그대로. 덧붙여 4단계 낱말 카드의 '만든 문장' 놓는 자리(점선 · `ComposeCard.tsx` 359)도 38과 같은 까닭으로 `border-line-input` |
| 55 | 고침 | `passoff/ui.tsx` 108~124 `PrimaryButton` | 채움 단추를 공통 클래스 `btn-filled` 로(globals.css — fix-frame). 전에는 `bg-ink text-surface` + `disabled:opacity-40` · `aria-disabled:opacity-40`(반투명 채움). 이제 꺼지면(`disabled` 와 1단계 '영어 보기'의 2초 기다림 `aria-disabled`) 테두리 + 흐린 글 — `btn-filled` 가 두 경우를 다 맡고 hover · 손가락 모양도 맡으므로 단추 쪽 utility(`hover:opacity-90` 등)는 뺌(utility 가 components 층보다 이기므로). 쓰는 곳: 3단계 '확인' · 4단계 '확인/다시 확인' · 낱말 카드 '확인' · 구성도 '다음' · 1단계 '영어 보기' · 모든 '다음 단계: …' · '다음 세트' · '다음 문장'. 늘 켜져 있는 채움 링크 셋(TopicLock 178 · MapRefill 368 · WrapUpStep 191 — 꺼질 일 없음)은 그대로 |
| 56 | 해당 없음 | — | 내 몫 파일에 켜고 끄는 스위치(`role="switch"` · `aria-checked`)가 없음(검색 0). 바꿀 것 없음 |
| 61 | 해당 없음(이미 0) | — | 내 몫 16파일에 직접 색(amber · red … · white · black · gray · hex · rgba · style) 0. `check-design-rules` 직접 색 0 |

## 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 (오류 없음) |
| `node docs/qa-2026-09-18/scripts/check-design-rules.cjs src/components/PassoffLearningView.tsx src/components/passoff src/app/passoff-grammar --zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion` | 16파일 모든 칸 0 · exit 0 (도구 파일은 읽기만) |
| `node docs/pass-off-grammar/검사/check-lessons.cjs` | problems 0 · warnings 0 · exit 0 |
| `node docs/pass-off-grammar/검사/check-grading.cjs` | PASS · exit 0 |
| `check-screen-fixes.cjs` · `check-leak-fix.cjs`(passoffView.ts 를 읽는 검사) | 둘 다 PASS — 새 함수를 더해도 `viewBlocks` 결과 그대로 |
| 37 작은 node 시험(스크래치 `t37b.cjs` — 8가지 예 + 67강 모두 '(n)' 남지 않음) | PASS · **깨기**: 함수를 '그대로 돌려줌'으로 바꾸면 FAIL 56 · exit 1 |
| 47 작은 node 시험(67강 질문에 같은 정규식) | 바뀌는 질문 정확히 5개, 모두 뜻이 통하는 글 |

브라우저 · 화면 사진으로는 보지 않았습니다(이 단계 규칙). 통합 일꾼이 볼 곳: PASS-OFF 강의 1~5단계 맨 위(탭 아래 한 줄 · '이 단계 마침' · Aa), 1단계 목록 상자(밝음 · 어둠), 꺼진 '확인'(어둠), 4단계 입력 칸 테두리(어둠), 구성도 빈칸(어둠), 자판으로 '다음 단계: …' 를 눌렀을 때 새 탭에 초점 테두리.

## 다음 묶음 · 남의 몫 (이번에 안 바꾼 것)

1. **37 그리는 곳** — `src/app/[course]/[lesson]/page.tsx` 414~415줄(공통 강의 틀, 내 몫 아님): `lesson.subtitle` 대신 `passoffSubtitle(lesson.title, lesson.subtitle)`(`@/lib/passoffView`)을 그리고 `null` 이면 줄을 안 그리면 끝. 다른 곳(목록 · 검색 · 메타데이터)은 PASS-OFF 부제를 그리지 않음(검색 0).
2. **17 'N단계' 안내 글**(도구가 읽거나 같은 묶음으로 고칠 것 — 이번엔 안 바꿈): `RuleStep.tsx` 84 '1단계에서 먼저 떠올린 문장만 영어로 보여요.' · 85 '1단계로' · `WrapUpStep.tsx` 221 '{N}단계로 가기' · 166 · 212 '5단계를 모두 마쳤어요'(`drive-topic-lock.cjs` 270 · 회귀점검 `dp.cjs` 423/426 이 읽음) · `src/lib/passoffLearning.ts` `PASSOFF_GATE_REASON` '5단계를 모두 마치면 완료할 수 있어요.'(`drive-topic-lock.cjs` 433 이 읽음 · 내 몫 아님). 'Step N' 으로 바꿀 때 이 도구들과 같은 커밋 · 깨기 시험.
3. **59 완료 단추 이름**('학습 완료 체크') — `LessonEndBar`(공통) · 도구(`drive-topic-lock.cjs` 433 등)가 읽음. 내 몫 아님.
4. **14 의 탭 글** — 'Step N · 이름' 은 `StepTabs`(공통) 그대로. '마침'을 탭 배지로 옮기는 안은 탭 글(도구가 /Step\s*\d/ · 이름으로 셈 — `dp.cjs` '단계 탭 5개')이 바뀌어 쓰지 않음.
5. **13 Aa 공통화** — PASS-OFF 'Aa' 는 탭 아래 줄 오른쪽에 하나로 모았을 뿐, 공통 'Aa'(제목 줄)는 13번 몫.
6. 늘 켜진 채움 링크 셋(`TopicLock.tsx` 178 · `MapRefill.tsx` 368 · `WrapUpStep.tsx` 191)은 `bg-ink text-surface` 그대로 — 꺼질 일이 없어 55와 무관. 모양을 한 클래스로 모으려면 다음 정리 때 `btn-filled` 로.

## 의존

- `btn-filled` · `--color-line-input`(`border-line-input`)은 fix-frame 이 `src/app/globals.css` 에 만든 것을 그대로 씀(확인: 61~62 · 92 · 134 · 309~327줄). `btn-filled` 가 `:disabled` 와 `[aria-disabled="true"]` 둘 다 · hover 를 맡는 것을 읽고 맞춤.
