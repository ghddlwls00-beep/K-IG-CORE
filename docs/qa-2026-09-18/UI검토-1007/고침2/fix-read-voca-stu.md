# fix-read-voca-stu — UI검토-1007 3장 고침 (READING · VOCA · STUDENT · ADULT)

- 2026-10-07 밤. 가지 `claude/regression-check-1002-8d4817`(HEAD da191e5e) 작업 트리. 커밋 · 푸시 안 함.
- 같은 AI 계열이 고치고 확인했습니다. **독립 검수가 아닙니다.**
- 개발 서버 · 브라우저는 띄우지 않았습니다(지시대로). 화면 확인은 통합 일꾼 몫 — 아래 '통합 때 볼 것'.
- 고친 파일: `src/components/ReadingLearningView.tsx` · `src/components/PhonicsLearningView.tsx` · `src/components/StudentLearningView.tsx`
- 손대지 않은 내 몫 파일: `src/components/AdultWordsStep.tsx` · `src/lib/readingLearning.ts` · `src/lib/vocaLearning.ts`(고칠 것이 없었음 — 아래 61 · 17)
- 공통 부품은 fix-frame 것을 가져다 씀: `src/components/Toggle.tsx`(56) · `border-line-input`(51, globals.css `--line-input`).

## 번호별

| # | 결과 | 파일 · 줄(고친 뒤) | 무엇 |
|---|---|---|---|
| 32 | 고침 | ReadingLearningView.tsx 924 · 1257 · 1302 · 1513 · 1614 | 지문(1 · 4단계) · 빈칸 문장 · 채운 문장 · 원문 대조 영어 줄 · 소리 내어 읽기 문장의 `font-serif` 5곳을 뺌 → 공통 글꼴(`--font-sans`). 영어 속 한글('한지')도 같은 글꼴로 나옴(세리프 영어 글꼴에 한글이 없어 다른 글꼴로 떨어지던 것) |
| 60 | 고침 | ReadingLearningView.tsx 1746~1749 | 4단계 '다시 읽고 재기' 위쪽 줄: 바깥 줄을 꺾이지 않게(`flex-wrap` 뺌 · `items-start`), 왼쪽 묶음('읽기 시작' · 'N단어 · N문장 · 목표 약 N초')만 `flex-1 min-w-0 flex-wrap min-h-11` 로 줄어들고 꺾임 → 'Aa' 는 늘 오른쪽 위. `data-passage-meta="timed"` 그대로 |
| 30 | 고침 | PhonicsLearningView.tsx 858~860 · 871 · 986~995 · (옛 1028~1032 지움) | ① 1단계 맨 아래 '단어 옆 동그라미는 …' 줄을 위 안내 줄로 옮김: '단어를 누르면 소리가 나요. 옆 동그라미는 ‘안다고 표시’예요 — 표시해도 2단계 퀴즈에는 그대로 나와요.'(단어가 없으면 앞 문장만). 안내 줄은 꺾이지 않게 하고 '뜻 가리기' 스위치는 줄 오른쪽 ② 마우스를 올릴 때 회색 바탕을 단어 단추에서 카드(li) 전체로 옮김(동그라미 칸까지) — 소리 나는 중(검정 카드)에는 바탕 그대로. '2단계' 낱말은 17번 몫이라 그대로 |
| 31 | 고침 | StudentLearningView.tsx 1317~1325 | STUDENT 3단계 · ADULT 5단계(섀도잉 & 낭독): 영어 문장을 누르면 '듣기' 와 같은 소리가 나던 단추를 글(`p > span[data-en]`)로 바꿈. 소리는 아래 '듣기'(`data-action="play"`) 하나. 1단계 '먼저 듣기'(`data-reveal="locked"`)는 그대로. 맨 위 설명 주석도 맞춤(32줄) |
| 36 | 고침 | StudentLearningView.tsx 1577~1581 · 1585~1586 · 1620 | ADULT 3단계(끊어 읽기): 안내 줄을 꺾이지 않게 해서 '뜻 모두 보기' 가 줄 오른쪽에 붙음(전에는 다음 줄 왼쪽에 혼자). 문장 번호 줄 간격 4px → 2px — 44px 번호 7개가 360(내용 폭 328px) 한 줄에 들어감(7×44 + 6×2 = 320). 같은 모양인 탭 딕테이션 번호 줄(STUDENT 2단계 · ADULT 4단계)도 같이 2px. 번호 크기 44px 그대로 |
| 39 | 고침 | StudentLearningView.tsx 1542 · 1580 (+ 주석 11줄) | '회색 칸' → '점선 칸' 두 곳(1단계 '먼저 듣고, 점선 칸을 눌러 확인하세요.' · ADULT 3단계). 칸은 밝음 · 어둠 모두 `border-dashed` 라 맞는 말 |
| 51 | 고침 | ReadingLearningView.tsx 1636 · PhonicsLearningView.tsx 1363 | READING 3단계 '메모' 칸과 VOCA 철자 칸('영어 단어 쓰기', `data-spelling-input`)의 테두리 `border-line` → `border-line-input`(초점 때 `border-ink` 그대로). VOCA 칸은 결과.md 51번 목록에 없었으나 같은 원인(카드와 같은 바탕 · 테두리 1.1 안팎)이라 같이 고침. STUDENT · ADULT 는 쓰는 칸 없음 |
| 56 | 고침 | ReadingLearningView.tsx 326~334 · PhonicsLearningView.tsx 996~1006 · StudentLearningView.tsx 1655~1664 | 스위치 3곳을 `Toggle` 로: READING 'Aa' 메뉴 '문장 번호'(`labelFirst` · `w-full justify-between`) · VOCA '뜻 가리기' · STUDENT/ADULT '영어 가리기'. `data-action`(toggle-numbers · hide-meanings · hide-en) · `role="switch"` · `aria-checked` · 누르는 동작 그대로. 내 파일에 손으로 그린 스위치 0 |
| 61 | 해당 없음 | — | 내 몫 6파일에서 직접 색(hex · rgba · amber/red/… · white/black) 0곳(검색 · check-design-rules 모두 0). 고칠 것 없음 |

## 검사

- `npx tsc --noEmit` — 0(오류 없음).
- `node docs/qa-2026-09-18/scripts/check-design-rules.cjs` — ReadingLearningView · PhonicsLearningView · StudentLearningView · AdultWordsStep · Toggle 모두 7칸 0.
- 작은 node 시험(스크래치 `check-rvs.cjs`, 소스를 읽어 14항목): 지금 트리 **14/14 PASS**. **깨기 시험** — 같은 시험을 HEAD(da191e5e) 세 파일에 돌리면 바뀐 것을 보는 11항목이 FAIL, '그대로 둬야 할 것'(`data-passage-meta="timed"` · '먼저 듣기' · Toggle 모양) 3항목만 PASS → 시험이 고침을 실제로 가려냄.
- 점검 도구가 읽는 것을 찾아 대조: `data-action="toggle-numbers"`(drive-reading 850) · `data-passage-meta`(reading-page · drive-reading) · `data-action="play"`(check-student-0927 214) · `[data-en]` · `aria-checked`(containers · ld-page-helpers) 모두 남음. 지운 `title="눌러서 듣기"` · 바꾼 '회색 칸' · '단어 옆 동그라미' 를 읽는 도구 · 시험 0곳(scripts · docs/qa-2026-09-18/scripts · src 검색).
- 도구 파일(`docs/qa-2026-09-18/scripts/*`)은 손대지 않음. 음성 글(영어 문장) · 받아쓰기 · 채점 · 소리 키 · 저장 키 · 잠김 표시 글 바뀜 0.

## 통합 때 볼 것(브라우저로 — 이 단계에서는 못 봄)

1. READING pr154 4단계 360: 'Aa' 가 오른쪽 위, '읽기 시작' 아래로 숫자 줄이 꺾임. pr001 · 390 · 데스크톱은 한 줄 그대로.
2. READING 지문 · 3단계 줄이 다른 과정과 같은 글꼴, '한지' 같은 한글 낱말이 영어와 같은 글꼴 계열로.
3. VOCA 1단계 데스크톱 마우스 올림: 카드 전체가 회색. 위 안내 줄이 360에서 두세 줄로 꺾이고 '뜻 가리기' 는 오른쪽에 붙음.
4. ADULT a1-2 3단계 360: '뜻 모두 보기' 오른쪽, 번호 1~7 한 줄. 4단계(탭 딕테이션) 번호 줄도.
5. STUDENT 3단계 · ADULT 5단계: 영어 문장을 눌러도 소리 없음, '듣기' 로만.
6. 어둠 360: 세 스위치의 꺼진 길이 보임(Toggle), READING 메모 칸 테두리가 보임.

## 다음 묶음(이번에 안 함)

- **17 · 59 — 도구가 읽는 'N단계' 안내 글 · 단추 이름**: VOCA 1단계 안내 '2단계 퀴즈'(PhonicsLearningView 안내 줄)와 `VOCA_GATE_REASON` '2단계 퀴즈를 한 번 끝까지 풀면 …'(src/lib/vocaLearning.ts 33), READING `READING_GATE_REASON`(readingLearning.ts) 등 강의 안 순서를 'N단계' 로 부르는 글 — 점검 도구와 같은 커밋에서 'Step N' 으로. 단추 이름 '학습 완료 체크' · 'Step N · 이름' 탭 글은 내 파일에 없음(끝 막대 · StepTabs).
- **55 와 같은 모양 — VOCA 철자 '확인'(PhonicsLearningView 1366 근처 `data-action="check-spelling"`)**: 글을 쓰기 전 `disabled` 인 채움 단추가 40% 흐린 검정(어둠에서 회색 막대). 내 번호가 아니라 그대로 둠 — `btn-filled` 로 바꾸려면 이 줄의 `filledButton`(bg-ink · text-surface · disabled:opacity-40 유틸리티가 컴포넌트 층을 이김) 대신 btn-filled 를 쓰는 클래스 묶음이 필요.
- READING 2단계 · ADULT 2단계(AdultWordsStep 381~393)의 '알아요 … · 남은 단어 N' 줄과 '뜻 모두 보기' 도 `flex-wrap` 이라 아주 좁으면 36번처럼 왼쪽에 떨어질 수 있음 — 360에서 실제로 떨어지는지 사진으로 본 뒤.
- 'Aa' 메뉴 '문장 번호' 줄 안쪽 여백이 Toggle 기본(px-2)이 되어 전(px-1)보다 4px 넓음 — 문제 되면 Toggle 쪽 className 덮어쓰기 규칙을 fix-frame 과 정함.
