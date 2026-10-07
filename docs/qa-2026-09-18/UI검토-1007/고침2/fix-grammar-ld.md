# 고침2 — fix-grammar-ld (GRAMMAR I · II · LISTENING)

- 근거: `UI검토-1007/결과.md` 3장 '그 밖 전부' — 사장님 결정 "결과에 따라 수정"(2026-10-07).
- 내 몫 파일: `src/components/GrammarLearningView.tsx` · `src/components/GrammarDiffLine.tsx` · `src/components/LdLearningView.tsx` · `src/lib/ldLearning.ts`(글만).
- 바꾼 파일: `GrammarLearningView.tsx` · `LdLearningView.tsx` 두 개. `GrammarDiffLine.tsx` · `ldLearning.ts` 는 고칠 것이 없어 그대로.
- 개발 서버 · 브라우저는 띄우지 않았습니다(통합 일꾼이 한 번에 봄). 화면 모양은 **코드로만** 맞췄고 눈으로 보지 않았습니다.
- 커밋 · 푸시 없음. 같은 AI 계열 — **독립 검수 아님**.

## 번호마다

| # | 결과 | 파일 · 줄(고친 뒤) | 무엇 |
|---|---|---|---|
| 20 | 고침(절반) · 나머지 '다음 묶음' | GrammarLearningView 1461~1490 · 2165~2180 | 위쪽 묶음 줄에서 '다음 묶음 →' 를 뺌(남는 것: '문제 n–m / N' · '← 이전 묶음'). '다음 묶음' 은 묶음 끝 막대 하나. 1 · 2 · 3단계 모두 같은 부품이라 함께. **'다음 Step' 낮추기**는 그 단추가 `LessonStepNavigation.tsx`(내 몫 아님)에 있어 표지만 달았음: 남은 묶음이 있는 동안 화면 뿌리에 `data-bundles-left`. 아래 '남의 몫' 1 |
| 21 | 고침 | GrammarLearningView 1735 | 1단계 '확인' 6개를 2단계 '확인' 과 같은 옅은 테두리 단추(`outlineButton` — border-line)로. 진한 테두리(line-strong) 없앰 |
| 22 | 고침 | GrammarLearningView 1902~1990(2단계) · 2035~2057(3단계) | 640px 이상: 2단계는 빈칸 문장 왼쪽 · '확인 · 정답 보기 · 다시 풀기' 같은 줄 오른쪽(최대 45%). 3단계는 문장 · 해석 왼쪽, '문장 듣기 · 따라 말했어요 · n/3회' 오른쪽(두 줄에 걸침), 마이크 확인은 왼쪽 아래. 640px 미만은 예전 한 줄 차례 그대로 |
| 58 | 고침 | GrammarLearningView 1699~1738 | 640px 미만: 영작 칸이 한 줄 전체, 마이크 · '확인' 은 아랫줄 오른쪽. 640px 이상은 예전처럼 한 줄 |
| 51 | 고침 | GrammarLearningView 1716(1단계 칸) · 1955(2단계 빈칸, 채점 전) · 2122(4단계 칸, 채점 전) / LdLearningView 1110(2단계 빈칸 직접 쓰기) · 1275(쓰기 칸) · 1781(5단계 청취 메모) | 테두리 `border-line` → `border-line-input`. 채점 뒤 색(맞음 · 틀림 · 부분)은 그대로 |
| 55 | 고침 | GrammarLearningView 2396~2412 | '전체 시험 채점하기' → `btn-filled`(크기 · 모서리 · 글 크기만 내가 줌, 색은 클래스). 꺼진 때는 `aria-disabled`(그대로) — 누르면 '답을 하나 이상 쓴 뒤 채점하세요.' 안내(FUN-05)가 나와야 해서 `disabled` 로 바꾸지 않음. `btn-filled[aria-disabled="true"]` 가 globals.css 에 있음을 확인 |
| 26 | 고침 | LdLearningView 1713~1722 | 5단계 가린 줄은 번호 · 소리 단추 · 점선 자리만(화면 읽기에는 '가린 문장'). 까닭은 위 상자 한 번('아직 받아쓰기 전인 문장 N개는 가려 두었어요') |
| 27 | 고침 | LdLearningView 1572~1640 | 4단계: '문장 n / N' 줄을 안내 줄 바로 아래로(2 · 3단계와 같음 — 예전엔 문장 아래 · 마이크 위). '글 가리기' 는 안내 줄 가운데에서 '문장 듣기' 줄 오른쪽 끝으로(2단계 '빈칸에 직접 쓰기' 자리와 같음) |
| 28 | 고침 | LdLearningView 1361~1371 · 1321(이 단계는? 설명) | '직접 쓰기' → '빈칸에 직접 쓰기' |
| 29 | 고침 | LdLearningView 1081~1083 | 640px 이상에서 빈칸 줄(보기 셋씩)을 2열로 |
| 56 | 고침 | LdLearningView 1362 · 1620 · 1674 | 스위치 셋('빈칸에 직접 쓰기' · '글 가리기' · '해석 모두 보기')을 공통 `Toggle`(fix-frame)로. `data-action` · `aria-checked` 그대로 단추에 붙음. GRAMMAR 에는 스위치 없음 |
| 61 | 안 고침(해당 없음) | — | 내 몫 세 파일의 직접 색 0(검사기 directColor 0, `#hex` · `white/black/gray-` 검색 0) |

## 바꾸지 않은 것(지시대로)

- 채점(`grammarGrading` · `gradeExam`) · 받아쓰기 조립(`ldDictation`) · 완료 조건 · 저장 형식 — 손대지 않음.
- data-* 표지: 없어진 것 0(아래 검사). 새로 단 것 1(`data-bundles-left`, 20번).
- 단추 글 '확인' · '다음 묶음 →' · '전체 시험 채점하기' · aria-label · 'Step N · 이름' 탭 글 · 'N단계' 안내 글('1단계 새로 풀기' · '1단계에 쓴 답과는 따로…' 등) 그대로.

## 남의 몫(적기만)

1. **20번 '다음 Step' 낮추기** — `LessonStepNavigation.tsx` 또는 `globals.css` 몫. GRAMMAR 화면이 남은 묶음이 있는 동안 `[data-grammar-view][data-bundles-left]` 를 답니다. 예:
   ```css
   main:has([data-grammar-view][data-bundles-left]) nav[aria-label="학습 단계 이동"] > button:last-child {
     border-color: transparent; background-color: transparent; font-weight: 500; color: var(--ink-soft);
   }
   ```
   (또는 LessonStepNavigation 이 `document.querySelector("main [data-bundles-left]")` 를 보고 '다음 Step' 을 조용한 단추 꼴로.) 이 규칙이 들어가기 전까지 '다음 Step' 은 예전 그대로입니다.

## '다음 묶음'(이번에 안 함 — 점검 도구가 읽는 것)

- 17번: GRAMMAR '1단계 새로 풀기' · '1단계 답을 비우고…' · '1단계에 쓴 답과는 따로 저장됩니다' 의 'N단계' → 'Step N'. 도구가 읽을 수 있어 이번엔 그대로.
- 59번: '이 강의 학습 완료' 단추 이름 — 끝 막대(내 몫 아님).

## 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 오류 0(Toggle 붙인 뒤 다시 돌림) |
| `check-design-rules.cjs` 내 몫 3파일 `--zero` 7칸 | 모두 0 · exit 0. `--selftest-break` 로 7칸 모두 잡는 것 확인(exit 1) |
| data-* · aria-label · data-action 비교(HEAD ↔ 작업 사본, 작은 node 시험 — 스크래치패드 `check-markers.cjs`) | 없어진 것 0 · 새로 단 것 `data-bundles-left` 1. GRAMMAR `data-set-next` 단추 2 → 1(HEAD 는 2라 이 칸이 실패할 수 있음). 일부러 `data-action="hide-text"` 를 지운 사본은 FAIL(깨기 증명) |
| 점검 도구가 읽는 곳 대조 | `g1-page.cjs` · `g2-driver.cjs` 의 `setNext` 는 보이는 `[data-set-next]` 를 고름 → 묶음 끝 막대 것이 남아 있음. `setInfo` 는 `[data-set-nav]` 의 `p` → 그대로. `ld-page-helpers.js` 는 `[data-action='hide-text' / 'show-all-ko']` 의 `aria-checked`, `[data-blank-rows] > li[data-blank]`, `[data-line-no]` → 모두 그대로. '직접 쓰기' · '가려 두었어요' 글을 읽는 도구 없음 |

## 알아 둘 것

- 화면을 눈으로 보지 않았습니다. 특히 22번(데스크톱 2 · 3단계 오른쪽 칸 폭)과 29번(2열에서 긴 보기 낱말이 줄바꿈하는지), 27번(360에서 '문장 듣기 · 최고 점수 · 글 가리기' 한 줄이 두 줄로 꺾일 때 '글 가리기' 가 오른쪽에 가는지)은 통합 일꾼의 사진 확인이 필요합니다.
- 3단계 오른쪽 칸이 두 줄에 걸치므로(문장 · 해석 줄과 마이크 줄), 오른쪽 단추 줄이 문장 · 해석보다 높으면 마이크 줄 위가 조금 벌어질 수 있습니다.
- 같은 AI 계열이 고치고 검사했습니다. 독립 검수가 아닙니다.
