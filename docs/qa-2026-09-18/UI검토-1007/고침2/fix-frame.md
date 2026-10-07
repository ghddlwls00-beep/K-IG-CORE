# 고침2 — fix-frame (공통 틀 · 토큰 · 검색 · 404) — 2026-10-07

- 근거: `UI검토-1007/결과.md` 3장 · 사장님 "결과에 따라 수정". 가지 `claude/regression-check-1002-8d4817`, HEAD `da191e5e` 위 작업 트리.
- 같은 AI 계열이 고치고 확인했습니다. **독립 검수가 아닙니다.** 개발 서버 · 브라우저는 띄우지 않았습니다(통합 일꾼이 한 번에 봄). 커밋 · 푸시 · `git add` 하지 않았습니다.
- 확인: `npx tsc --noEmit` 0 · `check-design-rules --zero …(7칸)` 내 몫 11파일 모두 0(고치기 전 합: 고정폭 한글 2 · 자간 5 · 12px 미만 16 · 직접 색 10 · 움직임 2 · 이모지 3) · 검사기 `--selftest-break` 7칸 모두 잡음 · LandingPage 는 알려진 예외 5건(자간 1 · 12px 미만 3 · bounce 1) 그대로 · eslint 0 오류(경고 5 — 모두 원래 있던 effect 안 setState 꼴, 내가 더한 것 없음).
- 작은 시험(scratchpad, 저장소 밖): ① Tailwind 를 이 저장소 설정으로 직접 컴파일해 새 클래스 14개가 나오는지(`bg-line-input` · `dark:ring-line-input` · `max-[379px]:hidden` · `max-md:truncate` · `.btn-filled`(components 층) · `scrollbar-gutter` · `html:has([data-full-screen])` · 토큰 값 …) PASS 14 · 깨기(없는 클래스) 잡음 ② 빈 검색어 결과 6경우 PASS · 깨기(옛 논리) 잡음 ③ 토큰 대비 계산 ④ 단계 탭 글 폭 — 이 PC 글꼴 파일(Segoe UI · Malgun Gothic)의 글자 폭 표로 계산, 결과.md 의 360 실측(5단계 17px · 1 · 4단계 3~4px)에 맞춰 보정(−12px).

## 번호별

| # | 고침 | 파일 · 줄 | 무엇 | 검사 |
|---|---|---|---|---|
| 11 | 고침 | `src/app/globals.css` 205 · 208 · `LandingPage.tsx` 287 | `html { scrollbar-gutter: stable }` — 스크롤 막대 자리를 늘 비워 둠. 첫 쪽은 문서가 스크롤되지 않는 전체 화면 슬라이드라 빈 띠가 생기지 않게 `main[data-full-screen]` 이 있으면 `auto`(첫 쪽 모양 그대로 — 속성 하나만 붙임) | Tailwind 컴파일 PASS. 메뉴 서랍 · 검색 창이 스크롤을 막을 때도 화면이 옆으로 안 밀림(덤) |
| 12 | 고침 | `SearchDialog.tsx` 133~139 · 220 · 결과 줄 | 결과 줄 꼬리표(🎙️ 발음 채점 · 📖 직독직해 …)를 그리지 않음. 안내글 '강의 제목이나 번호로 찾기'. 빈 검색어면 지금 과정 강의 10개부터(과정 밖 · `/t/…` 쪽은 예전처럼). 결과 없음 · 불러오는 중 글 해요체 | node 시험 6경우 PASS · 깨기 잡음. `searchMatch.ts`(점검 도구 check-search 가 그대로 씀)는 안 건드림 |
| 52 | 고침 | `SearchDialog.tsx` 186~ · 353 | 창을 `createPortal(…, document.body)` 로 머리줄 밖에 그림(메뉴 서랍처럼). 머리줄의 backdrop-blur 가 fixed 덮개를 머리줄 크기로 가두던 것이 원인. 덮개 z-[60](머리줄 · 서랍 z-50 위), 덮개를 누르면 닫힘 | tsc · 코드. 화면 확인은 통합 일꾼 |
| 53 | 고침 | `SearchDialog.tsx` 78 · 168 · 199~201 | 창(role=dialog)에 이름 '강의 검색'. Tab · Shift+Tab 은 창 안에서만 돎. Esc · 닫기 · 바깥 · ⌘K/Ctrl K 로 닫으면 검색 단추로 초점을 돌려줌. 열려 있는 동안 뒤 쪽 스크롤 막음. 단추에 `aria-haspopup="dialog"` | 코드. `[role="dialog"] input` 을 찾는 검토 도구(verify-dark) 그대로 맞음 |
| 19 | 고침 | `KakaoTalkNoticeBanner.tsx` 103~146 | 호박색 · 카카오 노랑 · 💬 🌐 📋 → 공통 색(bg-sunken · border-line · 글 ink), 글 14px, 단추 44px('Chrome으로 열기'/'Safari로 열기' 채움 하나 · '주소 복사' 테두리 · 닫기 44×44 선 아이콘), 쉬운 말('카카오톡 안에서 열었어요. 소리와 마이크는 Chrome에서 잘 돼요.'). **안드로이드 자동 Chrome 이동 · 단추 동작은 그대로**(4장 10번 사장님 판단) | 규칙 검사 0(전: 12px 미만 3 · 직접 색 10 · 이모지 3) |
| 23 | 고침 | `not-found.tsx` · `error.tsx` · `t/[tab]/page.tsx` | 404: '404 · NOT FOUND' 고정폭 대문자 빼고 h1 '찾는 페이지가 없습니다'(점검 harness 가 이 글로 404 를 앎 — 그대로) + 한 줄, 알약 → 공통 테두리 단추 '처음 화면으로', 과정 줄은 영어 홍보 문구 대신 그 과정의 한글 소개(`courses.ts` description), 누르면 `/t/` 를 거치지 않고 과정 목록으로 바로(서랍과 같은 규칙). 오류 화면: 같은 모양, '다시 시도' 채움(btn-filled) · '처음 화면으로' 테두리, 오류 코드만 고정폭. `/t/` 중간 쪽: 고정폭 대문자 '훈련' · 11px · 13.5px 없앰, 줄 44px+, '강의 N개'(옛 crawl-prod 정규식이 읽는 `tabular-nums text-ink-faint">N<` 는 남김) | 규칙 검사 0(전: 고정폭 한글 2 · 자간 4 · 12px 미만 7). drive-common · harness 의 404 판정 글 유지 |
| 24 | 고침 | `SearchDialog.tsx` 20~27 · 단추 | 단축키 표시를 이 컴퓨터대로: 맥 '⌘K', 그 밖 'Ctrl K'(하이드레이션 전엔 안 그림 — 서버 · 첫 그림 불일치 없음). title '강의 검색 (Ctrl K)' | tsc |
| 34 | 고침 | `StepTabs.tsx` 43~52 | `compact`(ADULT 5단계) 데스크톱(md+, 칸 728px)에서 이름 다섯 'Step N · 이름', 개수 배지 없음, 탭 안쪽 여백 px-2. 글 폭 계산: px-3 · 'Step N · 이름' 다섯은 ≈733~747px 라 안 들어감 → px-2 · 배지 없이 ≈693~705px(여유 23~35px). 640~767px 는 칸이 좁아 휴대폰 줄 그대로 | 글꼴 폭 계산. **맥 글꼴(SF · Apple SD Gothic Neo)은 재지 않음 — 통합 일꾼이 1366 에서 실제 폭 확인 필요** |
| 35 | 고침 | `StepTabs.tsx` 43~52 · 88 | `compact` 휴대폰: 탭 여백 px-2, 지금 탭의 개수 배지는 380px 이상에서만, 이름은 넘치면 '…'(안전망). 계산: 360 에서 5단계 17px 밖 → 17px 여유, 1단계 3~4px 밖 → 5px 여유. 다른 과정(compact 아님)은 그대로 | 글꼴 폭 계산(360 실측으로 보정) |
| 42 | 고침(내 몫) | `StepTabs.tsx` 88 | 어둠에서 지금 탭에 얇은 `ring-line-input` — 모든 과정 단계 탭. '전체' 거르기 · '1×' 속도 칩은 남의 파일 → 다음 묶음 | 컴파일 PASS |
| 43 | 고침 | `LandingPage.tsx` 343 · 413 | 꺼진 점에 `ring-1 ring-white/70`(어두운 사진 위에서도 보임). 과정 이름 링크 38px → inline-block + `py-1.5 -my-1.5` 로 누름 높이 46px, 자리는 한 픽셀도 안 움직임. **점의 누름 영역은 44×24 그대로** — 점 간격이 24px 라 44px 높이는 겹치거나 간격(모양)을 바꿔야 함(9/27 FRAME-U13 이 같은 까닭으로 24 를 고름, WCAG 2.5.8 24px 충족) | 규칙 검사: 알려진 예외 5건 그대로, 새 위반 0 |
| 46 | 일부 | `LessonClientGate.tsx` 18 · 49 | 이 파일은 아무도 안 씀 — 깜빡이는 뼈대를 조용한 빈 자리로 바꾸고 '안 씀 · 지울 것' 머리글. **파일 지우기는 자동 권한 판단이 막아 못 함**(사람이 지울 것). 실제로 강의를 열 때 깜빡이는 회색 뼈대는 `LessonBody.tsx` 13~21 `ViewLoadingSkeleton`(animate-pulse) — 남의 몫 → 다음 묶음 | 규칙 검사 0(전: 움직임 1) |
| 51 | 고침(토큰) | `globals.css` 61~63 · 85~94 · 130~136 | 토큰 `--line-input` → `border-line-input` · `bg-line-input` · `ring-line-input`. 밝음 #8A847C(surface 3.49 · raised 3.70 · sunken 3.23) · 어둠 #6E6A65(surface 3.59 · raised 3.33 · sunken 3.48 · 창 뒤 black/60 3.8). 내 몫 적용: btn-filled 꺼진 테두리 · Toggle 꺼진 길 · 단계 탭 어둠 테두리 · 검색 창 어둠 테두리. 입력 칸들(GRAMMAR · PASS-OFF · LISTENING · READING 메모)은 남의 파일 | 대비 계산 · 컴파일 PASS |
| 54 | 고침(토큰 + 검색 창) | `SearchDialog.tsx` 203 | 이용권 창은 fix-list 몫 — 토큰만(`dark:border-line-input` 쓰면 됨). 같은 문제인 검색 창 테두리는 어둠에서 `border-line-input` | 대비 3.8(창 뒤 덮개 위) |
| 55 | 고침 | `globals.css` 300~326 · `LessonEndBar.tsx` 147~149 | `.btn-filled`(@layer components — 같은 요소의 유틸리티가 이김): 켜짐 ink 채움 · 글 surface · hover 0.9, `:disabled`/`[aria-disabled=true]` 는 투명 바탕 + `--line-input` 테두리 + ink-faint 글(밝음 4.8 · 어둠 5.3). 끝 막대 '이 강의 학습 완료' 에 적용(글 · 크기 · aria-label · aria-pressed 그대로). 카카오 띠 · 오류 화면의 채움 단추도 이것 | 컴파일 PASS |
| 56 | 고침(부품) | 새 `src/components/Toggle.tsx` | `<Toggle checked … data-action=… onClick=…>글</Toggle>` — role=switch · aria-checked · 44px · 꺼진 길 `bg-line-input`(3:1 이상) · 손잡이 surface + 가는 테두리(두 테마 모두 길과 3.5:1 안팎) · 나머지 속성(data-* 포함)은 button 으로 그대로. `labelFirst` 는 READING 설정 줄 꼴(flex · justify-between · px-1). className 은 자리(ml-auto 등)만 — 여백 · display 는 부품이 정함 | tsc · 규칙 0. 6곳 바꿔 끼우기는 각 과정 일꾼 몫 |
| 57 | 고침(토큰) | `globals.css` 63 · 94 · 136 | `--track` → `bg-track`: 밝음 #D6D0C6(raised 1.53) · 어둠 #3A3940(raised 1.56) — 0% 막대가 보이는 한 단계. CourseDashboard 적용은 fix-list | 컴파일(토큰 값) PASS |
| 61 | 고침(내 몫) | 카카오 띠 · LessonClientGate · TabList · 404 · 오류 · `/t/` | 내 몫 파일 안 직접 색 · 12px 미만 · 고정폭 한글 0. TabList 도 안 쓰는 파일이라 규칙만 맞추고 '안 씀' 머리글(지우기는 46 과 같은 까닭으로 못 함) | 규칙 검사 11파일 0 |

## 안 고친 것 · 다음 묶음

- **17 · 59 (점검 도구가 읽는 글)** — 'N단계' 안내 글, '학습 완료 체크' / '학습 완료 취소' aria-label 과 aria-pressed 겹침: 지금 운영 확인이 `docs/qa-2026-09-18/scripts/*` 로 쓰는 중이라 이번에 안 바꿈. 도구와 같은 커밋 · 깨기 시험으로 다음 묶음.
- **46 실제 원인** — `src/components/LessonBody.tsx` 13~21 `ViewLoadingSkeleton`(animate-pulse · bg-black 직접 색)을 `<div aria-busy className="min-h-[60vh]" />` 같은 조용한 빈 자리로(LessonBody 담당).
- **파일 지우기(사람)** — `src/components/LessonClientGate.tsx` · `src/components/TabList.tsx`(가져다 쓰는 곳 0 — grep 확인). 자동 권한 판단이 '되돌릴 수 없는 삭제'로 막았으므로 사장님 · 통합 일꾼이 지우실 것. 61 의 옛 화면(DialogueLearningView · ChineseLearningView · BasicsLearningView — LessonBody 가 import 함)도 같은 때.
- **56 적용** — `<Toggle>` 로 바꿀 곳(각 과정 일꾼): `StudentLearningView.tsx` 1654~1669 '영어 가리기' · `LdLearningView.tsx` 1354~1369 '직접 쓰기'(className="ml-auto") · 1572~1587 '글 가리기' · 1671~1686 '해석 모두 보기' · `ReadingLearningView.tsx` 325~337 '문장 번호'(labelFirst) · `PhonicsLearningView.tsx` 989~1004 '뜻 가리기'. data-action 은 그대로 넘기면 도구가 그대로 찾음.
- **51 적용** — 입력 칸 `border-line` → `border-line-input`: GRAMMAR 1단계 영작 · 2단계 빈칸, PASS-OFF 4단계, LISTENING 5단계 '청취 메모', READING 3단계 '메모'. 38(PASS-OFF 구성도 놓을 칸 어둠 테두리)도 같은 색.
- **54** — `LicenseModal.tsx` 창 테두리에 `dark:border-line-input`(fix-list).
- **57** — `CourseDashboard.tsx` 진도 막대 바탕 → `bg-track`(fix-list).
- **42 나머지** — STUDENT · ADULT '전체' 거르기(`StudentLearningView.tsx` FILTERS 칩)와 위 플레이어 '1×' 속도(`AudioPlayer.tsx`) 고른 칸에 `dark:ring-1 dark:ring-line-input`.
- **12 남은 것** — 꼬리표 글은 화면에서 사라졌지만 `src/lib/curriculumPresentation.ts` 의 badge('🎙️ 발음 채점' · '📖 직독직해' …)가 `scripts/buildSearchIndex.ts` 를 거쳐 색인의 `badge` · `searchText` 에 남아 '발음'으로 찾으면 VOCA 가 나옴. 색인 만드는 `.ts` · curriculumPresentation 은 내 몫이 아니라 안 건드렸고 `public/search-index.json` 도 다시 만들지 않음. `/t/voca` 에서 빈 검색어는 과정을 몰라 예전처럼 STUDENT 부터.
- **43** — 점 누름 영역 44px 높이는 점 간격(모양)을 바꿔야 해 안 함(위 표). 바꿀지는 사장님 몫(첫 쪽 모양).
- **34 확인** — 맥 글꼴에서 ADULT 데스크톱 다섯 이름이 728px 안에 드는지는 통합 일꾼이 실제로 재 주세요(이 PC 글꼴 계산으로 여유 23~35px).
- **검토용 스크립트 영향(운영 확인 도구 아님)** — `UI검토-1007/verify-2.cjs` cf14 는 카카오 띠를 '카카오톡 브라우저 접속 중' 글과 `amber-50` 클래스로 찾으므로 새 띠를 못 찾음(다시 잴 때 고칠 것). `docs/qa-2026-09-15/scripts/crawl-prod.cjs` 의 `/t/` 강의 수 정규식은 맞게 남김.

## 바꾼 파일(내 몫만)

`src/app/globals.css` · `src/components/SearchDialog.tsx` · `src/components/StepTabs.tsx` · `src/components/LessonEndBar.tsx` · `src/components/KakaoTalkNoticeBanner.tsx` · `src/components/LandingPage.tsx`(43 + 11 의 속성 하나) · `src/app/not-found.tsx` · `src/app/error.tsx` · `src/app/t/[tab]/page.tsx` · `src/components/LessonClientGate.tsx` · `src/components/TabList.tsx` · 새 `src/components/Toggle.tsx` · 이 문서. `src/app/layout.tsx` · `scripts/buildSearchIndex.mjs` · `public/search-index.json` · `TabBar.tsx` 는 바꿀 일이 없어 그대로.
