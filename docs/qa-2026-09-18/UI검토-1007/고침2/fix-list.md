# UI검토-1007 고침 2차 — fix-list (3장 '그 밖 전부' 중 목록 · 잠김 · 이용권 창 · 장 듣기)

- 2026-10-07 밤 · 가지 `claude/regression-check-1002-8d4817` (HEAD da191e5e) · 커밋 · 푸시 안 함 · `git add` 안 함.
- **같은 AI 계열이 고치고 확인했습니다. 독립 검수가 아닙니다.**
- 개발 서버 · 브라우저 안 띄움(지시) — 확인은 코드 · `npx tsc --noEmit` · `check-design-rules` · 작은 node 시험만. 화면 사진은 통합 일꾼 몫.
- 바꾼 파일(7, 모두 내 몫): `src/components/CourseDashboard.tsx` · `LessonPaywall.tsx` · `LicenseModal.tsx` · `ChapterAudioBar.tsx` · `src/app/[course]/page.tsx` · `src/lib/courses.ts` · `src/lib/curriculumPresentation.ts`(글 한 줄). `src/app/[course]/[lesson]/page.tsx` 는 안 바꿈(25번 미룸).
- 새 파일: `고침2/fix-list-도구/check-fixlist2.cjs`(작은 node 시험 · 깨기 `--break=pad`).
- 점검 도구(`docs/qa-2026-09-18/scripts/*` · `docs/pass-off-grammar/검사/*` · `회귀점검-1002/*`) 손대지 않음. 도구가 읽는 글은 그대로 두고 아래 '다음 묶음' 에 적음.
- 공통 모양 약속: fix-frame 이 `globals.css` 에 만든 `--line-input`(`border-line-input`) · `--track`(`bg-track`) · `.btn-filled` 를 그 이름 그대로만 씀. 새 직접 색 · 이모지 · 고정폭 한글 0.

## 한눈에

| # | 무엇 | 결과 |
|---|---|---|
| 16 | 잠김 화면 · '이어서 학습' 에 장 번호 없음 | **고침(내 몫 부분)** — 목록 맨 위 단추 · 무료 체험 단추 · 잠김 화면 무료 바로가기를 끝 막대 꼴 'Ch 2-1 · Greeting (인사)' 로. 잠김 화면 **제목(h1)** 은 남의 파일 → 다음 묶음 |
| 18 | 같은 것을 여러 이름으로 | **일부 고침** — 목록 머리 'N구간' → STUDENT · ADULT 'N장' · PASS-OFF '대주제 N개', 장 듣기 오류 글 '챕터' → '장', 이용권 창 '받은 코드' → '받은 이용권 코드' · '슬롯' 없앰. 구간 머리 영어(Chapter · TOPIC · Section · Stage)는 사장님 판단이라 그대로. API · 다른 파일의 '챕터' 는 적기만 |
| 25 | 대본 쪽(-1) 끝 막대 이전 · 다음 | **안 고침 → 다음 묶음** — 점검 도구 셋이 지금 동작을 기대값으로 계산함(아래) |
| 33 | PASS-OFF 목록 '진행 0%' 두 번 · 강의 줄 번호 없음 | **고침** — 다 열린 때(LIFE) '진행 N%' 줄 뺌 · 강의 줄에 '1-1' 번호(STUDENT · ADULT 와 같은 왼쪽 칸) |
| 41 | 목록 글 합니다체 섞임 · '서버에 저장됨' | **일부 고침** — 해요체로 9줄. '서버에 저장됨' · '진도를 서버와 맞추는 중…' · 잠김 줄('N장을 마치면 열립니다' 등)은 도구가 읽어 그대로 → 다음 묶음 |
| 44 | GRAMMAR II '제 07과' · '제 7과' | **고침** — 강의 제목을 '제 7과 · 패턴 영작 훈련'(목록 머리 '제 7과 ~ 제 12과' 와 같은 꼴) |
| 54 | 이용권 창 어둠 테두리 | **고침** — 창 테두리 `border-line-input`(어둠 3.59 · 밝음 3.49 — fix-frame 값). 입력 칸 둘도 같은 색 |
| 57 | 0% 진도 막대가 안 보임 | **고침** — 막대 바탕 `bg-track`(fix-frame 토큰, 카드보다 한 단계 진함) |
| 61 | 내 몫 안 직접 색 | **이미 0** — 1차 고침(3 · 8번)이 이용권 창 색 점 · 점선 · 빨간 글, 장 듣기 상자 색을 다 없앴음. 규칙 검사 직접 색 0 확인 |
| (55) | 꺼진 채움 단추 — 내 파일 안 | **고침(내 파일 몫)** — 이용권 창 '등록' · '이용권 코드 등록하기' 를 공통 `.btn-filled` 로(꺼지면 테두리 + 흐린 글). 등록 동작 그대로 |

## 번호별

### 16 — 장 번호 머리
- 무엇: 잠긴 a2-1 제목과 무료 바로가기가 둘 다 'Part 1 · Greeting (인사)' 라 같은 강의처럼 보임.
- 고친 곳:
  - `CourseDashboard.tsx` 77~87 `nameOutsideChapter()` — STUDENT · ADULT 는 `${code} · ${제목에서 'Part N ·' 뺀 것}`(끝 막대 `LessonEndBar` 의 `named()` · `page.tsx` `neighbour()` 와 같은 규칙). 다른 과정은 제목 그대로.
    484줄(맨 위 '이어서 학습 · 다음 강의 · 처음부터' 단추) · 539줄(무료로 먼저 해 보기 단추 둘).
  - `LessonPaywall.tsx` 34~43 `freeLessonName()` · 164줄 — 잠김 화면 '이용권 없이 먼저 해 볼 수 있는 강의' 바로가기. 주소(`/adult/a1-1`)에서 장-강의 번호를 읽음(`freeLessonLinks.ts` 는 남의 몫이라 안 건드림).
  - 목록의 강의 줄은 이미 왼쪽 칸에 '2-1' 이 있어 그대로.
- 결과(시험): a2-1 → 'Ch 2-1 · Greeting (인사)', a1-1 → 'Ch 1-1 · Greeting (인사)' — 이제 다름. s12-1 → 'Ch 12-1 · School Vacations (방학맞이)'.
- 남은 것(남의 파일): 잠김 화면 **제목 h1** 은 `src/app/student/[lesson]/page.tsx` · `src/app/adult/[lesson]/page.tsx` 가 `pres.title` 로 그림 → 'Ch 2-1 · Greeting (인사)' 로 바꾸려면 그 두 파일(다음 묶음). 잠김 표시 글('순차 학습 잠금' 등)은 그대로.

### 18 — 화면 글 통일
- 고침:
  - `src/app/[course]/page.tsx` 152~162 — 머리 줄 '82개 강의 · 20구간' → STUDENT · ADULT '· 20장', PASS-OFF '· 대주제 20개', 나머지 과정 '· N구간' 그대로(장 · 대주제가 없는 과정).
  - `ChapterAudioBar.tsx` 35 · 187~218 — 장 전체 듣기 실패 글이 서버 글('올바른 챕터 번호가 필요합니다.' · '이 챕터는 이용권 등록 후…' · '이전 챕터를 완료하면…')을 그대로 보이던 것을, 응답 뜻대로 이 줄의 말로: 401 '이용권을 등록하면 이 장을 들을 수 있어요.' · 403 '앞 장을 마치면 이 장 전체 듣기가 열려요.' · 그 밖 '이 장의 소리를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.' 덤: JSON 이 아닌 답 · 오프라인이면 브라우저 영어 오류 글('Unexpected token…')이 보이던 것도 같은 한 줄로. 요청 · 재생 · 속도는 그대로.
  - `LicenseModal.tsx` 168 '받은 코드를 등록하면' → '받은 이용권 코드를 등록하면'. 117~118 해제 확인 '…해제하시겠습니까? (해제 시 새로운 기기를 등록할 수 있는 슬롯이 반환됩니다)' → '이 기기에서 이용권 등록을 해제할까요? 해제하면 다른 기기를 새로 등록할 수 있어요.'(해제 동작 그대로).
- 그대로 둔 것: 구간 머리 영어(Chapter · TOPIC · Section · Stage · Series) · 강의 부제 'Chapter N · …' — 사장님 판단(4장 8번). 'Ch 2-1' 번호 꼴 — 끝 막대와 같은 꼴(16번).
- 판단 거리(안 바꿈): 이용권 창 · 잠김 화면에 'STUDENT 패스'(창 제목 'STUDENT 패스 회원', 잠김 글 'STUDENT 패스(…)로 이용 중')와 'STUDENT 이용권' 이 섞임. 상품 이름이라 'VIP' 처럼 사장님께 여쭐 일이고, `docs/pass-off-grammar/검사/plan-access.cjs` 가 'STUDENT 패스 회원' 을 읽음.
- 남의 파일(적기만): `src/app/api/student/chapter-audio/route.ts` · `api/adult/chapter-audio/route.ts` 의 오류 글 '챕터' · 합니다체(이제 화면에는 안 보임 — 이 줄이 자기 말로 바꿔 보임). `LandingPage.tsx` aria-label '다음 코스로 이동'(첫 쪽 — 사장님 몫).

### 25 — 대본 쪽(-1) 끝 막대 → 안 고침, 다음 묶음
- 까닭: 점검 도구가 대본 쪽의 이전 · 다음을 **지금 앱 규칙 그대로**(대본 쪽은 모든 쪽 순서 → d001-1 의 이전 = d001) 계산해 견줌:
  `docs/qa-2026-09-18/scripts/lib/expectations.cjs` 62~75 `neighbours()`(drive-generic 1445~1447 이 'prev/next' PASS/FAIL) · `lib/g2-driver.cjs` 173~185 · `drive-reading.cjs` 227 · 692. 앱만 바꾸면 대본 쪽마다 FAIL — 지금 운영 확인이 이 도구를 쓰는 중이라 이번엔 안 바꿈.
- 다음 묶음에서 할 일(한 커밋): `src/app/[course]/[lesson]/page.tsx` 143줄 다음에 — `isScript && pair?.variant === "main" && id.startsWith(\`${pair.id}-\`)` 이면 `getLessonContext(course, pair.id)` 의 prev · next 를 끝 막대에 넘김(LISTENING · READING · GRAMMAR II 대본 쪽; GRAMMAR I 홀수 쪽은 이미 짝으로 넘어감). 같은 커밋에서 위 세 도구의 대본 쪽 기대값을 짝 강의 것으로 고치고, 깨기 시험(앱 옛 규칙으로 되돌리면 FAIL).

### 33 — PASS-OFF 목록
- `CourseDashboard.tsx` 625~626 — 대주제 줄: 모든 대주제가 열린 때(LIFE, `everyTopicOpen`) '진행 N%' 를 그리지 않음(옆 '0/3' 이 같은 말). 열린 대주제의 해금 기준 줄('진행 N% · 강의 N개와 마지막 강의를 마치면 다음 대주제')과 잠김 · 완료 · 확인 중 글은 그대로(도구가 읽음). STUDENT LIFE 줄이 비어 있는 것과 같아짐.
- `CourseDashboard.tsx` 146~149 — 강의 줄 왼쪽 번호 칸을 PASS-OFF 에도: code 'Topic 1-1' → '1-1'(STUDENT · ADULT 'Ch 2-1' → '2-1' 과 같은 칸 · 36px · 12px). 67강 모두 'T-L' 꼴(시험).
- 도구 영향 확인: `drive-topic-lock.cjs` 는 줄에 'TOPIC 1을 마치면 열림' 이 **들어 있는지**(includes)만 봄 — 번호가 앞에 붙어도 PASS. '진행' 을 읽는 검사 없음(grep).

### 41 — 목록 글 해요체
- 바꾼 것(`CourseDashboard.tsx`): 185 북마크 단추 title '이용권 등록 후 북마크할 수 있어요' · 508~510 '진도를 저장하는 중…' · '연결되면 자동으로 저장해요' · '저장하지 못했어요 · 연결되면 다시 저장해요' · 517~518 PASS-OFF 같은 두 줄 · 526 '이용권 없이 첫 두 강의를 끝까지 학습할 수 있어요.' · 565 · 569~570 빈 목록 '아직 북마크한 강의가 없어요.' · '조건에 맞는 강의가 없어요.' · '…북마크를 눌러 보세요.' · '모든 강의를 마쳤어요.'
- `courses.ts` 60~61 · 76 — 목록 머리 소개 글 둘만 합니다체였음: ADULT '…따라 말합니다.' → '…따라 말해요.', PASS-OFF '…익혀 통과합니다.' → '…익혀 통과해요.'(낱말 그대로, 끝만). CNN 은 폐지 과정이라 안 건드림.
- `ChapterAudioBar.tsx` 143 '음성을 재생하지 못했습니다. 네트워크 연결을…' → '소리를 재생하지 못했어요. 인터넷 연결을 확인해 주세요.'
- **그대로 둔 것(도구가 읽음 → 다음 묶음)**:
  - '서버에 저장됨'(→ '진도 저장됨' 이 결과.md 의 안) — `docs/pass-off-grammar/검사/drive-topic-lock.cjs` 340 · 359 · 364 · 500 · 532 · 555 · 591 · 600, `drive-topic-admin.cjs` 126 이 이 글을 기다림.
  - '진도를 서버와 맞추는 중…' — `drive-topic-lock.cjs` 539.
  - 잠김 줄: STUDENT '1장을 마치면 열립니다'(`drive-topic-admin.cjs` 135) · '…강과 마지막 강의를 마치면 다음 장'(같은 줄) · '앞 장을 마치면 열림' · PASS-OFF '이용권 등록 후 열림' · 'TOPIC N을 마치면 열림' · '대주제 완료' · '첫 두 강의 무료 체험' · '진도 확인 중'(`drive-topic-lock.cjs` 340 · 366 · 371 · 494 · 543~545). 같은 목록의 STUDENT '이용권 등록 후 열립니다' 는 도구가 안 읽지만 옆 잠김 줄과 말끝을 맞추려 함께 미룸.
  - 다음 묶음: 위 글을 해요체('진도 저장됨' · '1장을 마치면 열려요' …)로 바꾸면서 두 도구의 글을 같은 커밋에서 고치고 깨기 시험.
- 이용권 창 · 잠김 화면 본문의 합니다체('…학습할 수 있습니다' 등)는 41번 범위(목록 글) 밖이라 그대로.

### 44 — GRAMMAR II '제 07과'
- `curriculumPresentation.ts` 165~166 — 강의 제목 `제 ${lessonNum}과` → `제 ${Number(lessonNum) || lessonNum}과`. 'gh2-007' → '제 7과 · 패턴 영작 훈련'. 부제 · 1996년 메모 · code('Lesson 07') 그대로.
- 쓰는 곳: 목록 줄 · 강의 제목 · 쪽 제목(메타) · 끝 막대 이웃 이름 · 검색 색인. 도구 `lib/g2-driver.cjs` · `drive-reading.cjs` 는 제목을 이 파일에서 계산 → 따라 바뀜. 글자 '제 07과' 를 적어 둔 도구 없음(grep). 검색은 앞 0 을 무시(`searchMatch.ts` 26)해 '07' · '7' 둘 다 찾음.
- **`public/search-index.json` 은 안 만듦**(내 몫 아님) — `prebuild`(`scripts/buildSearchIndex.mjs`)가 다시 만듦. 통합 일꾼이 build 할 때 이 파일이 바뀌는 것이 맞음('제 07과' → '제 7과' 44줄).

### 54 — 이용권 창 어둠 테두리
- `LicenseModal.tsx` 144~146 — 창 `border-line` → `border-line-input`. 값은 fix-frame(`globals.css` `--line-input`: 밝음 #8A847C — surface 위 3.49, 어둠 #6E6A65 — surface 3.59 · 뒤 black/60 위 3.8). 창 바탕은 그대로.
- 244 · 291 — 입력 칸 둘(이용권 코드 · 올패스 업그레이드)도 `border-line-input`(51번의 '입력 칸 테두리 색'). 초점 때 `focus:border-ink` 그대로.

### 57 — 0% 진도 막대
- `CourseDashboard.tsx` 469(이용권 답 기다리는 자리) · 498~500(진도 막대) — 바탕 `bg-sunken` → `bg-track`(fix-frame 토큰: 밝음 #D6D0C6 — raised 위 1.53, 어둠 #3A3940 — raised 1.56). 채운 부분 `bg-ink` 그대로.

### 61 — 직접 색(내 몫)
- 고칠 것 없음: `check-design-rules --zero` 로 내 6 화면 파일 직접 색 0(1차 고침 3 · 8번이 이미 정리). `LicenseModal` 뒤 덮개 `bg-black/60` 은 규칙의 직접 색 목록 밖(어둠 · 밝음 같은 덮개)이라 둠.

### (55) 이용권 창의 꺼진 채움 단추
- 내 파일 안의 같은 문제라 함께 고침: `LicenseModal.tsx` 249~250 '등록'(업그레이드 칸 비었을 때 꺼짐) · 305 '이용권 코드 등록하기'(확인 중 꺼짐) — `bg-ink … disabled:opacity-40/50` → 공통 `.btn-filled`(켜짐: 검정 채움 · 꺼짐: `--line-input` 테두리 + 흐린 글). 글 · 크기 · `type="submit"` · `disabled` 조건 · `handleSubmit` 그대로.

## 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit -p .` | exit 0 |
| `node docs/qa-2026-09-18/scripts/check-design-rules.cjs <내 화면 파일 6> --zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion,emoji` | 모두 0 · exit 0 |
| 같은 도구 `--selftest-break` | 7칸 모두 잡음 · exit 1(실패해야 맞음) |
| `npx eslint <바꾼 7 파일>` | 오류 0(경고 3 — `[course]/page.tsx` 의 안 쓰는 import 둘 · 변수 하나, 전부터 있던 것) |
| `node 고침2/fix-list-도구/check-fixlist2.cjs <저장소>` | ALL PASS 13 — 44(GRAMMAR II 44강 제목에 '제 0N과' 0 · gh2-007 '제 7과 · 패턴 영작 훈련' · gh2-044 메모 그대로 · 구간 머리 앞 0 없음) · 16(a2-1 ≠ a1-1 · s1-1 · s12-1 · 두 도우미 같은 답 · 다른 과정 그대로) · 33(PASS-OFF 67강 번호 'T-L' · 첫 '1-1') |
| 같은 시험 `--break=pad`(옛 '제 07과' 를 메모리에서 되살림) | FAIL 2 · exit 1(실패해야 맞음) |
| 도구가 읽는 글 grep(`docs/**/*.{cjs,mjs,js}` · `scripts/**`) | 바꾼 글 중 도구가 읽는 것 0 — 읽는 것('서버에 저장됨' · '진도를 서버와 맞추는 중' · 잠김 줄 · 'STUDENT 패스 회원' · 대본 쪽 이웃)은 그대로 둠 |
| 음성 글 | 영어 · 학습 문장 바뀜 0(바꾼 것은 화면 한국어 · 제목뿐) → 소리 다시 만들 것 없음 |
| 유료 내용 | 공개 파일에 새로 들어간 학습 내용 0(제목 · 안내 글만) |

못 한 것: 화면으로 보는 확인(브라우저 금지) — 통합 일꾼이 볼 곳: STUDENT · ADULT 목록 맨 위 단추 · 무료 카드(360에서 'Ch 1-1 · …' 가 '…' 로 잘리는지), ADULT a2-1 잠김 화면 바로가기, PASS-OFF 목록(LIFE 사본 — '진행' 줄 없음 · '1-1' 번호 칸), 0% 목록의 진도 막대(밝음 · 어둠), 이용권 창 어둠 가장자리 · 빈 업그레이드 칸의 '등록' 테두리, GRAMMAR II 목록 · 강의 제목 '제 7과'.

## 다음 묶음(이번에 안 한 것)

1. **25** 대본 쪽 끝 막대 → 짝 강의의 이전 · 다음 — `[course]/[lesson]/page.tsx` + 도구 3(expectations.cjs · g2-driver.cjs · drive-reading.cjs) 같은 커밋 · 깨기 시험.
2. **41** '서버에 저장됨' → '진도 저장됨', '진도를 서버와 맞추는 중…', 목록 잠김 줄 해요체 — `CourseDashboard.tsx` + `docs/pass-off-grammar/검사/drive-topic-lock.cjs` · `drive-topic-admin.cjs` 같은 커밋.
3. **16** 잠김 화면 제목 h1 에 'Ch 2-1 ·' — `src/app/student/[lesson]/page.tsx` · `src/app/adult/[lesson]/page.tsx`(남의 파일). 도구 `check-progress-live.mjs` 등이 잠김 화면 글을 읽으니 같이 확인.
4. **18** 남은 이름: API 오류 글 '챕터'(chapter-audio route 둘 — 화면엔 안 보임), 'STUDENT 패스' ↔ 'STUDENT 이용권'(상품 이름 — 사장님께, `plan-access.cjs` 가 '패스 회원' 을 읽음). 구간 머리 영어는 사장님 판단(4장 8번).
5. `public/search-index.json` — 44 뒤 다시 만들기(통합 build 의 prebuild 가 함).
6. 17 · 59(도구가 읽는 'N단계' 안내 · '학습 완료 체크' 이름)는 내 몫 아님 — 지시대로 손대지 않음.
