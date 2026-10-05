# 회귀 점검 1002 · 고침 — fix-app-core (A1 · A2 · A8 · A9)

2026-10-05 · 작업 트리 `nostalgic-blackburn-048c73`(가지 claude/regression-check-1002-8d4817 · HEAD 5cc17f4f) · 일꾼 fix-app-core.
**같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**
커밋 · 푸시 · R2 · 음성 생성 0 · `git add -A` · `git stash` 0 · `.env.local` 값 출력 0 · CNN · GVA 0 · content/ 바뀜 0.
개발 서버는 포트 3321 하나(끝난 뒤 끔) · 브라우저 창 하나(끝난 뒤 닫음) · 이용권 없는 로컬 무료 강의만.

## 고친 것

| # | 무엇 | 파일 | 전 → 뒤 | 소리 바뀜 |
|---|---|---|---|---|
| A1 | GRAMMAR II 영작 '틀린 곳 표시'(1단계 영작 · 4단계 종합 평가)에 로마자 | `src/components/GrammarDiffLine.tsx`(새 파일 — `DiffLine` · `mergeSameKind` 를 옮기고 `drawnDiffTokens` 더함) · `src/components/GrammarLearningView.tsx`(옛 `DiffLine` 지우고 새 파일에서 불러옴) | 전: `DiffLine` 이 받은 `show`(koreanOnScreen)를 안 쓰고 `token.text` · `token.expected` 를 그대로 그림 → '고칠 낱말 Tokyo → Busan' · 한글로 쓴 답도 '내 답 … Busan'. 뒤: 모든 조각을 `show` 로 그림 → 'Tokyo → 부산' · '내 답 … 부산'. 이름이 '고칠 낱말의 맞는 꼴 + 빠진 낱말' 로 갈린 곳(gh2-012 'Tokyo → Han' + 빠진 'River')은 맞는 꼴에 이름에 필요한 낱말만 붙여 한 번에 그림 → 'Tokyo → 한강'(붙여 그렸을 때 그림이 달라지는 가장 짧은 낱말 수만 가져가고 나머지는 '빠진 낱말' 그대로). Mr Kim 은 'Mr' 가 영어라 'Mr 김' · 'Mr. 김'. 채점 · diff 는 그대로(`diffAgainstReferences(romanForGrading(…))`) | 없음(화면 글) |
| A2 | STUDENT '완료 취소' 가 다른 기기에서 되살아남 | `src/components/ProgressProvider.tsx` · `src/lib/studentProgress.ts` | 전: 서버 진도를 적용하면 서버 완료를 이 기기 `kig:progress:completed` 에 적는데, 다음 쪽을 열 때 그것을 '이 기기의 옛 완료'로 읽어(옮김 표시 `kig:student:migrated:<id>` 가 없는 기기) `legacyCompletedLessonIds` 로 보냄 → 서버 `mergeLegacyStudentProgress` 가 `completed: false`(취소한 강의)를 다시 true 로. 뒤: ① 기기 — 서버 진도를 적용할 때 그 완료 목록을 `kig:student:server-completed:v1` 에 함께 적고, 옛 완료는 그 목록에 없는 것만(서버 사본은 옛 완료가 아님). ② 서버 — 옛 완료 옮기기는 기록에 **아무 상태도 없는** 강의만 채움(완료든 취소(false)든 상태가 있으면 그대로) — 이미 현장에 있는, 표시 없는 낡은 기기가 보내도 되살아나지 않음. 둘 중 하나만으로도 막힘(아래 시험). ADULT 는 옮기기 자체가 없어 손대지 않음 | 없음 |
| A8 | VOCA 줄 '이어 듣기' 중 지금 나오는 카드를 누르면 소리는 멈추는데 줄 단추가 '정지' 로 남음 | `src/components/PhonicsLearningView.tsx` (`playWord` 의 같은 낱말 다시 누름 갈래) | 전: `stopSpeech()` · `setWordPlaying(null)` 만 → 줄 상태(rowPlayingRef · activeRow)가 남아 단추 '정지' · 다시 들으려면 두 번. 뒤: 그 갈래에서 `stopRow()` 를 먼저 부름 → 단추 '듣기', 한 번 누르면 바로 이어 듣기 | 없음 |
| A9 | LISTENING · READING 목록 진행률이 1개 완료로 0% | `src/lib/shownPercent.ts`(새 파일) · `src/components/CourseDashboard.tsx` | 전: `Math.round(완료/전체*100)` → '1 / 276개 완료 (0%)' · '1 / 256개 완료 (0%)'. 뒤: `shownPercent` — 0개면 0 · 다 했으면 100 · 그 사이는 반올림하되 1~99 안으로(1개 이상이면 1% 이상 · 다 안 했으면 100% 아님: 275/276 은 99%). 같은 목록 화면이 모든 과정에 쓰여 8과정 모두 같은 규칙. 섹션의 '진행 N%' 중 화면이 셈하는 쪽(서버 값이 없을 때)도 같은 함수 | 없음 |

### 강의 제목 · 화면 문구 바꿈 (전 → 뒤)

화면에 나오는 글자가 바뀐 곳은 아래뿐입니다(문구 자체는 그대로, 들어가는 값만).

| 곳 | 전 | 뒤 |
|---|---|---|
| GRAMMAR II 틀린 곳 표시 · 맞는 꼴 (22문항 × 1 · 4단계) | `→ Busan` · `→ Seoul` · `→ Han` + 빠진 `River` · `→ Kim` · `→ Gyeongsang-do` | `→ 부산` · `→ 서울` · `→ 한강` · `→ 김` · `→ 경상도` |
| GRAMMAR II 틀린 곳 표시 · 내 답 줄 | `He went to Busan on.` · `… Mr Kim?` | `He went to 부산 on.` · `… Mr 김?` |
| 과정 목록 '학습 진도율' (예) | `1 / 276개 완료 (0%)` · `275 / 276개 완료 (100%)` | `1 / 276개 완료 (1%)` · `275 / 276개 완료 (99%)` |
| VOCA 줄 단추 (카드로 멈춘 뒤) | `정지` | `듣기` |

## 안 고친 것과 까닭

- A6(P1) · A10(P4) — 사장님 판단 필요(명령대로 고치지 않음).
- GRAMMAR 2단계 빈칸의 정답 조각(`part.answer` — 그대로 그림): 표가 닿는 22문항 모두 빈칸이 한국어 낱말에 떨어지지 않음(빈칸 = to · in · on · for · swam … — 셈 0/22) → 지금 화면 틀림 없음, 손대지 않음. 빈칸 규칙이 바뀌면 `gloss` 를 거쳐야 함.
- '빠진 낱말 + 같은 낱말' 로 이름이 갈리는 경우(학생이 'Han' 만 빼고 'the River' 라고 쓴 경우 → '빠진 낱말 한 · River')는 붙여 그리면 '빠진' 표시를 잃어 그대로 둠 — 점검 꼴(①②)과 실제 한글 · 영어 철자 답에서는 생기지 않음.
- 서버가 보내는 장(STUDENT · ADULT · PASS-OFF 대주제)의 percent(`studentProgress.ts` 283 등)는 장이 강의 2~6개라 0%/100% 어긋남이 생기지 않아 그대로.

## 바꾼 소리 글

**없음.** 영어 · 한국어 강의 글(content/)을 하나도 바꾸지 않았고, 화면이 소리 내는 곳(`scripts/lib/spoken-texts.cjs` 정의)도 바꾸지 않음 — 새 클립 0.

## 돌린 검사 (작업 트리 뿌리에서 · 시험 파일은 `고침/fix-app-core/`)

| 검사 | 고친 뒤 | 깨기(고치기 전 판) |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | — |
| A1 컴포넌트 렌더 시험 `node docs/qa-2026-09-18/회귀점검-1002/고침/fix-app-core/test-a1.cjs` — 진짜 `GrammarDiffLine.tsx` 를 react-dom/server 로 그림 · 표가 닿는 GRAMMAR II 16쪽 22문항 × 틀린 답 3꼴(① 한국어 낱말 → Tokyo · ② 한글 답에서 영어 낱말 하나 뺌 · ③ 영어 철자 그대로 다른 낱말 틀림 — ①② 는 check-wrongspot-hangul-1004 와 같은 꼴) · 판정은 그 도구의 `romanOnScreen` | 줄 66 · 로마자 0 · 이름 반쪽 0 · exit 0 (예: 'He swam across the Tokyo. → 한강' · 'He went to 부산 on. business') | `--old`(HEAD 의 GrammarLearningView 에서 옛 DiffLine 을 뽑아 그림) → 로마자 있는 줄 **66/66** · exit 1 |
| A2 두 기기 시험 `…/test-a2.cjs` — 진짜 `ProgressProvider.tsx` 를 React(effect 까지)로 그리고 서버는 진짜 `route.ts` GET · POST(이용권 확인만 가짜 · 진도는 임시 폴더). 같은 이용권 · 기기 A · B: A 완료 s1-2 → B 첫 쪽 → A 완료 취소 → B 둘째 쪽 → 서버 · B 화면. + 진짜 옛 완료(이용권 없이 한 s1-1)는 새 이용권으로 옮겨지는지 | 6/6 PASS · B 가 보낸 옛 완료 [] · 서버 s1-2 false · exit 0 | `--client=head --server=head` → **s1-2 가 true 로 되살아남**(B 가 옛 완료 ['s1-2'] 보냄) · 실패 2/6 · exit 1. 한쪽만 고친 판: `--client=head`(서버만 고침) 6/6 · `--server=head`(기기만 고침) 6/6 — 둘 다 따로도 막음 |
| `node docs/qa-2026-09-18/scripts/prove-life-completion.cjs`(옛 완료 옮기기를 쓰는 기존 시험) | 9/9 PASS · exit 0 | — |
| A8 로컬 화면(개발 서버 3321 · VOCA 무료 mv1-01 · 데스크톱): 1–6번 '이어 듣기' → 0.12초 뒤 지금 카드(do) 누름 → 2.5초 뒤 줄 단추 | '1–6번 이어 듣기' · aria-pressed false · 카드 불 0 · 한 번 더 누르면 바로 '정지'(이어 듣기 시작) · 또 누르면 '듣기' | 고친 줄(`stopRow()`)을 잠깐 빼고 같은 순서 → 단추 **'정지' · aria-pressed true · 카드 불 0**(소리 없이 정지로 남음 — 재현) → 되돌림 |
| A9 로직 `…/test-a9.cjs`(12경우) | 12/12 · exit 0 | `--old`(Math.round) → 실패 4(1/276 · 1/512 · 2/512 → 0% · 275/276 → 100%) · exit 1 |
| A9 로컬 화면(이용권 없음 · 이 기기 완료 1개를 저장소에 넣고 목록) | /ld '학습 진도율: 1 / 276개 완료 (1%)' · 미완료 (275) · /reading '1 / 256개 완료 (1%)' (넣은 값은 끝난 뒤 지움) | 고치기 전 판은 운영에서 '1 / 276개 완료 (0%)'(단계 3 기록) |
| `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --dry-run --course grammar2` | 대상 22문항 · exit 0(꼴 미리 판정 바뀜 없음 — 채점 그대로) | — |
| `node docs/qa-2026-09-18/scripts/check-student-original.mjs` | 설명 없음 0 · exit 0 | — |

- 운영 확인(배포 뒤 · 주 세션 몫): `node docs/qa-2026-09-18/scripts/check-wrongspot-hangul-1004.cjs --course grammar2 --port <포트>` → GRAMMAR II 44줄 PASS · exit 0 이어야(고치기 전 FAIL 44 · 로마자 88).
- 로컬에는 이용권이 없어 GRAMMAR II 의 한국어 낱말 문항(모두 유료 쪽)과 STUDENT 서버 동기화는 브라우저로 못 봄 → 위 렌더 · 두 기기 로직 시험으로 대신함.

## 남의 몫에서 찾은 것 (고치지 않음)

1. **drive-common-0926.cjs 162 · 173**(옛 6과정 도구 — T16): 진행률 기대를 `Math.round(done/total*100)` 로 셈. 이제 화면은 `shownPercent` 라, 감사 이용권의 서버 완료가 1개뿐인 LISTENING(1/276) · READING(1/256) 목록에서 화면 1% ≠ 기대 0% 로 거짓 FAIL 이 날 수 있음 → 도구도 `src/lib/shownPercent.ts` 를 불러 쓰게(fix-tools).
2. **감사 도구 T17**(사본 프로필끼리 완료를 되살림): 이번 서버 고침(옛 완료는 상태 없는 강의만)으로 앱 쪽에서는 더 생기지 않음 — 도구 쪽 사본 되돌리기는 그대로 두어도 됨(확인은 fix-tools).
3. A7(PASS-OFF pg13-1 '이 순신' 쪼개짐)은 fix-app-passoff 몫 — 이번 GRAMMAR 쪽 이어 그리기(`drawnDiffTokens`)와 같은 생각(맞는 꼴 + 빠진 낱말을 이어 그린 뒤 한 번에)을 쓸 수 있음. `src/lib/koreanGloss.ts` 는 건드리지 않음.
