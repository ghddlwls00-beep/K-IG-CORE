# UI검토-1007 고침3 — fix-c2 (이름 · 목록)

- 2026-10-08 02:4x ~ 03:5x · 가지 `claude/regression-check-1002-8d4817` (HEAD dc68238e) · 커밋 · 푸시 · `git add` 안 함 · `git stash` 안 함.
- **같은 AI 계열이 고치고 확인했습니다. 독립 검수가 아닙니다.**
- `content/` · 점검 도구(`docs/qa-2026-09-18/scripts/*` · `docs/pass-off-grammar/검사/*`) · 남의 몫 파일 안 건드림. 영어 학습 글 바뀜 0(소리 키 그대로). `.env.local` · 이용권 값 출력 0.
- 브라우저: 포트 9973 하나 · 빈 프로필(이용권 없음) · 띄우기 전마다 남은 메모리 1.2GB 이상 확인(0.55~1.06GB 일 때 1분씩 기다림). 다 쓴 뒤 내 Edge · dev 서버 끔.
- dev 서버: 처음엔 같은 작업 트리에서 다른 일꾼의 dev 서버(3383)가 돌아 Next 가 두 번째 dev 서버를 거부함 → 그 서버로 '뒤' 를 찍던 중 그 서버가 꺼져(사진은 모두 버림) 내 포트 **3382** 로 dev 서버를 띄워 '뒤' 를 처음부터 다시 찍음. 남의 프로세스는 끄지 않음.

## 한눈에

| # | 무엇 | 결과 |
|---|---|---|
| 4장 8 | 구간 머리 영어 없애고 한글 하나('1장 · 자기소개' 꼴) | **고침** — `curriculumPresentation.ts` 한 곳에서 만들고 목록 · 강의 머리 · 잠김 화면 · 검색 · 끝 막대 · PASS-OFF 구성도 쪽 · 대주제 잠김 화면 이름이 그것을 씀. 데이터(content/ · 색인 원본) 그대로 |
| 16 | 잠김 화면 h1 'Part 1 · …' | **고침** — h1 '2-1 · Greeting (인사)' + 장 줄 '2장 · 가족 소개'(강의 쪽 머리와 같은 꼴). 무료 바로가기 '1-1 · Greeting (인사)' |
| 18 | 남은 이름 | **고침(내 몫)** — 구간 머리 · 'Ch' · 'Topic' · 'Part' · 'Section' · 'Series' · 'Stage' 화면에서 0, 장 듣기 API 오류 글 '챕터' → '장'. 남은 것: 'STUDENT 패스' ↔ '이용권'(상품 이름 — 사장님) · 관리자 화면 '챕터' · 'TOPIC'(사장님 화면 · 도구가 읽음) |
| 37 | `passoffSubtitle()` 그리기 | **고침** — `[course]/[lesson]/page.tsx` 가 그 함수로 그림(67강 중 33강 글이 바뀌고 20강은 제목과 같아 안 그림) |
| 41 | '서버에 저장됨' · 잠김 줄 합니다체 | **고침** — '진도 저장됨' · '진도를 맞추는 중…' · '…열려요'. 도구 고칠 곳은 아래 3장 |
| 12 | 색인 badge 가 searchText 에 섞여 '발음' 으로 VOCA 195강이 나옴 | **고침** — 색인에서 badge 뺌(searchText · 항목 둘 다), READING '직독직해' 낱말도 뺌. '발음' 결과 20 → 0. `--check` current |
| 25 | 대본 쪽(-1) 끝 막대 이전 · 다음 | **고침** — 짝(본 강의)의 이전 · 다음. 도구 셈 규칙은 아래 3장 |
| ③ | 이용권 판정 전 '0 / 82' · '이용권 등록' · '다음 강의' 깜빡임 | **일부 고침** — 목록의 진도 숫자 · 미완료 개수 · 장 머리 'n/N' · 진도 막대는 판정(이용권 · STUDENT/ADULT 장 기록 · PASS-OFF 답)이 올 때까지 자리만 두고 안 보임. 맨 위 '다음 강의' 는 이미 기다림(startPending). **머리줄 '이용권 등록' 단추는 `LicenseButton.tsx`(남의 몫)** — 적고 건너뜀 |
| 17 | 'N단계' → 'Step N'(내 몫 안) | **고침 1곳** — PASS-OFF 과정 소개 '… 마무리 5단계로' → '… 마무리 순서로'. 그 밖 내 몫 파일엔 강의 안 순서 'N단계' 없음(목록의 '중등 단어 1단계' · 'GRAMMAR I 제 1단계' 는 등급이라 그대로) |
| 59 | 완료 단추 이름 | **내 몫에 없음** — 이름은 `LessonEndBar.tsx`(남의 몫) |
| 42 | '전체' 거르기 칩 | **고침** — 고른 칩에 공통 모양(`bg-raised … shadow-2xs dark:ring-1 dark:ring-line-input` — StepTabs · GRAMMAR · PASS-OFF 칩과 같은 글자) |
| 40 | 목록 '자기소개 (Self-introduction)' ↔ 강의 'Self-Introduction (자기소개)' | 4장 8 로 함께 풀림 — 둘 다 '1장 · 자기소개'(82 + 55 강 · 색인 · 강의 파일 둘 다 같음, 시험 B) |

## 1. 화면 이름 — 옛 → 새 (모두 `src/lib/curriculumPresentation.ts`)

| 과정 | 자리 | 옛 | 새 |
|---|---|---|---|
| STUDENT · ADULT | 목록 구간 머리(`formatGroupTitle`) | `Chapter 1. 자기소개 (Self-introduction)` | `1장 · 자기소개` |
| STUDENT · ADULT | 강의 제목 `title`(강의 h1 · 잠김 h1 · 쪽 `<title>` · 끝 막대 이웃 · 목록 위 단추 · 무료 단추 · 검색 · 북마크 이름) | `Part 1 · Greeting (인사말)` | `1-1 · Greeting (인사말)` |
| STUDENT · ADULT | 장 줄 `subtitle`(강의 h1 아래 · 이제 잠김 h1 아래도) | `Chapter 1. Self-introduction (자기소개)`(강의 파일 label 그대로) | `1장 · 자기소개` |
| STUDENT · ADULT | `code` | `Ch 1-1` | `1-1` |
| STUDENT · ADULT | 새 칸 `name`(목록 줄 — 번호 칸 옆) | — | `Greeting (인사말)` |
| STUDENT · ADULT | 끝 막대 이웃(aria) | `다음 강의: Ch 1-2 · Name, School & Age (…)` | `다음 강의: 1-2 · Name, School & Age (…)` |
| PASS-OFF | 목록 구간 머리 | `TOPIC 1. 인칭` | `대주제 1 · 인칭` |
| PASS-OFF | `subtitle`(검색 · 색인) | `TOPIC 1. 인칭` | `대주제 1 · 인칭` |
| PASS-OFF | `code` | `Topic 1-1` | `1-1` |
| PASS-OFF | 잠김 화면(TopicLock)의 '지금 대주제' 이름(내 쪽 `passoff-grammar/[lesson]/page.tsx` 가 넘기는 label) | `TOPIC 2. 동사의 현재형` | `대주제 2 · 동사의 현재형` |
| PASS-OFF | 구성도 쪽 머리(`passoff-grammar/map/page.tsx`) | `TOPIC 1. 인칭` | `대주제 1 · 인칭` |
| LISTENING | 구간 머리 | `Section 1 · 001회 ~ 050회 실전 리스닝` | `001~050회 · 실전 듣기` |
| READING | 구간 머리 | `Section 1 · 001회 ~ 040회 원문 독해` | `001~040회 · 원문 독해` |
| VOCA | 구간 머리 | `중등 단어 1단계 (MV1 Series)` · `고등 심화 단어 (HV Series)` | `중등 단어 1단계` · `고등 심화 단어` |
| VOCA | `subtitle` | `Middle School Vocabulary Series 1` · `High School Advanced Vocabulary` · `Vocabulary & Pronunciation` | `중등 단어 1단계` · `고등 심화 단어` · `단어 훈련` |
| GRAMMAR I | 구간 머리 | `제 1단계 : 기본 문장 구조 훈련 (Stage 1)` | `제 1단계 · 기본 문장 구조 훈련` |
| GRAMMAR I | `subtitle`(강의 h1 아래 줄) | `제 1단계 (기본 문장 구조)` (+ 뉴스 메모) | `제 1단계 · 기본 문장 구조 훈련` (+ 뉴스 메모 그대로) — 목록 머리와 같은 이름(6단계 이름 표 하나 `G1_STAGE_NAMES`) |
| GRAMMAR II | 구간 머리 | `제 7과 ~ 제 14과 핵심 패턴 영작` | `제 7과 ~ 제 14과 · 핵심 패턴 영작` |
| 검색 결과 | 둘째 줄 | `STUDENT · Ch 1-1` + 제목 + `Chapter 1. Self-introduction (자기소개)` | `STUDENT` + `1-1 · Greeting (인사말)` + `1장 · 자기소개`(8과정 모두 '그 강의가 든 구간 머리' — 색인 `subtitle`). code(`Round 001` · `Passage 001` · `Lesson 01` · `MV1-01`)는 화면에서 뺌 · 찾기(searchText)엔 그대로 |
| 대주제 조사 | 목록 알림 · 잠김 줄 · 구성도 쪽 | `TOPIC 2가 열렸어요.` · `TOPIC 1을 마치면 열림` · `TOPIC 3은 아직 열리지 않았어요.` | `대주제 2가 열렸어요.` · `대주제 1을 마치면 열림` · `대주제 3은 아직 열리지 않았어요.` (`passoffTopicWithParticle` — 1~20 조사 시험 D) |

함수(새): `koreanHalf` · `chapterName` · `passoffTopicName` · `passoffTopicWithParticle` (curriculumPresentation.ts 34 · 56 · 66 · 74). `formatGroupTitle` 121~169 · `formatLessonPresentation` grammar1 197~210 · VOCA 259~283 · STUDENT/ADULT 342~357 · PASS-OFF 361~373. LISTENING · READING · GRAMMAR II 의 강의 `title` · `code` · `subtitle` 와 GRAMMAR I · II · VOCA 의 `title` · `code` 는 그대로(구간 머리가 아니고, drive-reading · g2-driver 가 제목을 읽음 — 그래도 이 함수에서 셈하므로 따라 바뀜).

## 2. 번호별

### 4장 8 · 16 · 18 · 40 — 한 곳에서 만든 이름을 모두가 씀
- `curriculumPresentation.ts`(위 1장). 쓰는 곳:
  - 목록 `CourseDashboard.tsx` — 구간 머리(`section.label` = formatGroupTitle) · 줄 번호 칸 `pres.code` 그대로(옛 'Ch' · 'Topic' 떼던 정규식 없앰 148) · 줄 글 `rowName`(번호 칸이 있는 STUDENT · ADULT · PASS-OFF 는 `name`, 83~86) · 맨 위 단추 · 무료 단추 `nameOutsideChapter` = `title`(83).
  - 잠김 화면 `LessonPaywall.tsx` 무료 바로가기 = `title`(옛 'Ch N-M · ' 붙이기 없앰) · `student|adult/[lesson]/page.tsx` 잠김 h1 아래 장 줄(강의 쪽과 같은 `text-caption text-ink-faint` 한 줄).
  - 강의 쪽 `[course]/[lesson]/page.tsx` — 끝 막대 이웃 `neighbour()` 는 모든 과정 `title` 하나(325 — 옛 STUDENT 는 `code` 를 따로 넘겨 끝 막대가 'Ch 1-2 · ' 를 붙임).
  - 검색 `scripts/buildSearchIndex.ts` — 항목 `subtitle` = 그 강의가 든 구간 머리(formatGroupTitle) · `SearchDialog.tsx` 는 과정 이름 · 제목 · 구간 줄(code 줄 뺌).
  - PASS-OFF `passoff-grammar/[lesson]/page.tsx`(잠김 화면에 넘기는 지금 대주제 label) · `passoff-grammar/map/page.tsx`(머리 · '대주제 N은 아직 …').
- 사진(밝음 휴대폰, 어둠 · 데스크톱도 같은 이름): 목록 `before|after/밝음/phone/student-list.jpg` · `-open.jpg`(8과정), 잠김 `adult_a2-1-lock.jpg` · `student_s2-1-lock.jpg`, 강의 머리 `student_s1-1-head.jpg` · `adult_a1-2-head.jpg` · `grammar1_gh1-006-head.jpg`, 검색 `search-empty.jpg`.
- 숫자(`facts.jsonl`): 전 → 뒤 그대로 옮김 — 예 a2-1 잠김 h1 'Part 1 · Greeting (인사)' + 바로가기 'Ch 1-1 · Greeting (인사)' → h1 '2-1 · Greeting (인사)' · 줄 '2장 · 가족 소개' · 바로가기 '1-1 · Greeting (인사)'.

### 37 — PASS-OFF 부제
- `[course]/[lesson]/page.tsx` 421~427: `lesson.subtitle` 대신 `passoffSubtitle(pres.title, lesson.subtitle)`. 67강 중 33강 글이 바뀜('(1) 문장의 종류 — 단문' → '문장의 종류 — 단문' · pg04-4 '… / (2) 부정문' → '… / 부정문'), 20강은 제목과 같아져 줄을 안 그림(pg13-1 '(1) 부정사' · pg05-1 · pg11-1 …, 처음부터 같던 pg02-2 · pg03-1~3 도). 무료 pg01-1 은 그대로('1인칭 단수 I 와 복수 We'). 바뀐 강의는 모두 유료라 사진은 운영(이용권)에서.

### 41 — 목록 글 해요체(`CourseDashboard.tsx`)
| 자리 | 옛 | 새 | 줄 |
|---|---|---|---|
| STUDENT · ADULT 진도 상태 | `서버에 저장됨` | `진도 저장됨` | 522 |
| PASS-OFF 진도 상태 | `서버에 저장됨` · `진도를 서버와 맞추는 중…` | `진도 저장됨` · `진도를 맞추는 중…` | 530 · 531 |
| STUDENT · ADULT 장 머리 줄(이용권 없음) | `이용권 등록 후 열립니다` | `이용권 등록 후 열려요` | 650 |
| STUDENT · ADULT 장 머리 줄(잠김) | `1장을 마치면 열립니다` | `1장을 마치면 열려요` | 652 |
| PASS-OFF 대주제 머리 줄(이용권 없음) | `이용권 등록 후 열림` | `이용권 등록 후 열려요`(STUDENT 와 같게) | 636 |
| PASS-OFF 대주제 머리 줄(잠김) | `TOPIC 1을 마치면 열림` | `대주제 1을 마치면 열려요` | 640 |
| PASS-OFF 잠긴 강의 줄 | `TOPIC 1을 마치면 열림` | `대주제 1을 마치면 열림`(STUDENT 줄 '앞 장을 마치면 열림' 과 같은 꼴 — 짧은 상태 글) | 631 |
| 그대로 | '1·2강 무료' · '첫 두 강의 무료 체험' · '이 장 완료' · '대주제 완료' · '진도 확인 중…' · '앞 장을 마치면 열림' · '…강과 마지막 강의를 마치면 다음 장' | — | |
- 덤(18 · 41, 화면엔 안 보이는 API 글): `api/student/chapter-audio/route.ts` · `api/adult/chapter-audio/route.ts` 오류 글 '챕터 … 합니다' → '장 … 해요'(ChapterAudioBar 는 자기 말을 보임 — 화면 변화 0, 도구가 읽는 곳 0).

### 12 — 검색 색인
- `scripts/buildSearchIndex.ts` 52~99: 항목에서 `badge` 뺌 · searchText 에서 `pres.badge` 뺌 · READING 낱말 '직독직해' 뺌 · 구간 머리를 searchText 에 더함 · 항목 `subtitle` = 구간 머리. `node scripts/buildSearchIndex.mjs` 로 다시 만듦(1028 항목 그대로) · `--check` current · 유출 검사 0(빌더 안 · `check-search.cjs` 2번 0줄) · `check-search.cjs` 이름 검색 20개 결과 바뀜 0 · PASS.
- '발음' 결과: 운영(전) 20 → 뒤 0(사진 `search-balum.jpg`).

### 25 — 대본 쪽(-1) 끝 막대
- `[course]/[lesson]/page.tsx` 150~156: 대본 쪽(`variant: "script"`)이면 `canonicalLessonId`(그 쪽의 본 강의 — 정식 주소가 이미 그리로 감)의 `getLessonContext` 로 이전 · 다음을 셈. **GRAMMAR I 은 뺌**(대본 쪽이 한 강의의 조각 gh1-006-1 · -2 라 지금처럼 전체 목록으로 걸음).
- 결과(로컬): d001-1 이전 d001 · 다음 d002 → **이전 없음 · 다음 d002**(= d001 의 끝 막대). pr001-1 도 같음(이전 pr001 → 없음). d050-1 은 이전 d049 · 다음 d051.
- 사진: `before|after/<테마>/<화면>/ld_d001-1-end.jpg` · `reading_pr001-1-end.jpg`.

### ③ 이용권 판정 전 깜빡임
- 원인 둘:
  1. 목록(`CourseDashboard.tsx`)이 이용권 답을 기다리는 동안에도 '학습 진도율: 0 / 82'(서버 첫 그림은 이 기기 기록을 못 읽어 0)과 '미완료 (82)' · 장 머리 '0/6' 을 그렸고, 이용권 답 뒤 STUDENT · ADULT 장 기록(서버)이 올 때까지 또 한 번 바뀜.
  2. 머리줄 '이용권 등록' 단추(데스크톱) — `LicenseButton.tsx` 가 `hasActiveLicense` 가 아직 거짓이면(이용권 확인 요청 중) '이용권 등록' 을 그림. **남의 몫 파일 → 건너뜀(아래 4장).**
- 고친 것(1): `countsPending = licenseUnknown || chapterRecordPending || passoffChecking`(363~364). 그동안 진도 문장(509 · 이용권 기다림 칸 475~479 은 늘)·막대 채움 0 · '북마크/미완료 (N)' 의 숫자(452) · 장 머리 'n/N'(696)를 `invisible`(자리 · 높이 그대로, 읽히는 글 없음)로 두고 답이 오면 한 번에 보임. 맨 위 '이어서 학습 / 다음 강의' 단추는 이미 `startPending` 으로 기다림(그대로). '전체 (N)' 은 늘 같은 수라 그대로 보임.
- 확인: 이용권 있는 쪽이라 로컬 빈 프로필로는 못 봄(이용권 값 쓰기 금지) → **배포 뒤 운영에서**(6장).

### 17 · 59 · 42
- 17: `courses.ts` 75~78 PASS-OFF 과정 소개 '… → 마무리 5단계로 문법 하나를 …' → '… → 마무리 순서로 문법 하나를 …'. 도구가 읽는 곳 0(grep).
- 59: 내 몫 파일에 완료 단추 이름 없음(`LessonEndBar.tsx` — c3 몫).
- 42: `CourseDashboard.tsx` 447 고른 거르기 칩 `dark:ring-1 dark:ring-line-input`(사진 `after/어둠/phone/passoff-grammar-list.jpg`). 덤: 개수를 한 상자에 넣어 '전체 (67)' 의 띄어쓰기를 지킴(flex 단추가 맨 띄어쓰기를 지워 '전체(67)' 로 보였던 것을 사진에서 찾아 고침).

## 3. 도구가 읽는 글 · 이름 · 흐름 — 옛 → 새 (도구 일꾼 몫 · 같은 커밋에서 고치고 깨기 시험)

| 도구 · 줄 | 지금 읽는 것(옛) | 앱의 새 것 | 고칠 것 |
|---|---|---|---|
| `docs/pass-off-grammar/검사/drive-topic-lock.cjs` 340 | D1 s1 `/이용권 등록 후 열림/` · 화면에 `서버에 저장됨` 없음 | 대주제 머리 줄 `이용권 등록 후 열려요` · `진도 저장됨` | `/이용권 등록 후 열려요/` · `'진도 저장됨'` |
| 같은 파일 359 · 364 · 500 · 532 · 555 · 591 · 600 | `서버에 저장됨` 을 기다림 | `진도 저장됨` | 글 바꿈 |
| 같은 파일 366 · 562 | 대주제 머리 줄 `/TOPIC 1을 마치면 열림/` | `대주제 1을 마치면 열려요` | `/대주제 1을 마치면 열려요/` |
| 같은 파일 371 | 잠긴 강의 줄 `TOPIC 1을 마치면 열림` | `대주제 1을 마치면 열림` | 글 바꿈 |
| 같은 파일 488 · 489 | 알림 `TOPIC 2가 열렸어요.` | `대주제 2가 열렸어요.` | 글 바꿈 |
| 같은 파일 340 · 494 · 537 · 540 · 545 | 없어야 하는 `/마치면 열림/` | 머리 줄은 이제 '…열려요' | `/마치면 열(림|려요)/` 로(안 그러면 늘 PASS — 깨기 시험) |
| 같은 파일 539 | `진도를 서버와 맞추는 중` | `진도를 맞추는 중…` | 글 바꿈 |
| 같은 파일 508 D6a | 잠김 화면에 `index.groups[1].label`('TOPIC 2. 동사의 현재형') | 잠김 화면의 지금 대주제 이름 `대주제 2 · 동사의 현재형`(내 page 가 넘김) | `formatGroupTitle("passoff-grammar", label)` 로 셈 |
| 같은 파일 508 · 571 | 잠김 화면 `TOPIC 2를 마치면 열려요` · `TOPIC 1을 마치면 열려요` | **그대로**(TopicLock → `passoffUnlock.ts topicWithParticle` — 남의 몫, 아래 4장) | 4장의 앱 고침과 함께 '대주제 N…' |
| `docs/pass-off-grammar/검사/drive-topic-admin.cjs` 126 | `서버에 저장됨` | `진도 저장됨` | 글 바꿈 |
| 같은 파일 134~135 M1 | `/1장을 마치면 열립니다/` | `1장을 마치면 열려요` | 글 바꿈(`앞 장을 마치면 열림` · `…강과 마지막 강의를 마치면 다음 장` · 'TOPIC' 없음 은 그대로 PASS) |
| `docs/pass-off-grammar/검사/check-progress-live.mjs` 217 L14c | 구성도 쪽 `TOPIC 3은 아직 열리지 않았어요` | `대주제 3은 아직 열리지 않았어요` | 글 바꿈(124 · 158 은 TopicLock — 4장) |
| `docs/qa-2026-09-18/scripts/check-student-0927.cjs` 188 C2 | `/^다음 강의: Ch 1-2 · /`(끝 막대 aria) | `다음 강의: 1-2 · Name, School & Age (…)` | `/^다음 강의: 1-2 · /` |
| `docs/qa-2026-09-18/scripts/check-student-titles-live.cjs` 49 | 목록 표지 `Chapter 16` | `16장 · 또 다른 장래 희망 (통역사)` | 표지 `16장 · ` |
| `docs/qa-2026-09-18/scripts/drive-common.cjs` 62 · 137 | 구간 머리 찾기 `/(Chapter\|단계\|중등\|고등\|과\|번\|회)/` | STUDENT · ADULT `N장 · …` · PASS-OFF `대주제 N · …` (나머지는 '회' · '단계' · '과' · '중등/고등' 그대로 걸림) | `장\|대주제` 더함 |
| `docs/qa-2026-09-18/scripts/lib/expectations.cjs` 62~75 `neighbours()` | 대본 쪽 = 전체 목록(본 + 대본)에서 앞뒤 → d001-1 이전 d001 · 다음 d002 | LISTENING · READING · GRAMMAR II 대본 쪽 = 그 본 강의(`id` 의 `-N` 뗀 것, 본 강의가 있을 때)의 본 목록 앞뒤 → d001-1 이전 없음 · 다음 d002. GRAMMAR I 은 옛 규칙 그대로 | 그 세 과정 대본 쪽만 새 규칙(drive-generic 1445~1447 이 이것으로 PASS/FAIL) |
| `docs/qa-2026-09-18/scripts/lib/g2-driver.cjs` 173~185 `neighbours()` | 같음(GRAMMAR II) | 같음 | 같음 |
| `docs/qa-2026-09-18/scripts/drive-reading.cjs` 198 · 227~228 | `content.getLessonContext(COURSE, id)` 의 prev · next(대본 쪽은 전체 목록) | 대본 쪽은 `getLessonContext(COURSE, canonicalLessonId(COURSE, id))` | 대본 쪽 ctx 를 본 강의로(692 끝 막대 비교가 이것을 씀) |
| `docs/qa-2026-09-18/UI검토-1007/고침2/integrate-b-도구/markers-diff.cjs` 14~15 | 표지 '서버에 저장됨' · '진도를 서버와 맞추는 중' · 'TOPIC' · '을 마치면 열림' · '1장을 마치면 열립니다' 수 | 줄어듦(위 새 글) | 통합이 '줄어든 표지' 로 보고하면 이 목록 때문 — 새 글로 |
| `docs/qa-2026-09-18/UI검토-1007/고침2/fix-list-도구/check-fixlist2.cjs` 31~46 | 16번 'Ch N-M · ' · `Part N ·` 규칙 | 제목 자체가 'N-M · …' | 2차 한때 시험 — 16 칸 FAIL 이 맞음(옛 규칙). 다시 돌릴 일 없으면 그대로 |
| `docs/qa-2026-09-18/UI검토-1007/고침2/배포뒤-도구/verify-prod-b.cjs` 219 · 280 | 줄 번호 `Topic N-M` · `Ch N-M` | `N-M` | 2차 운영 확인용 — 3차 운영 확인에서 쓰면 정규식에 이미 `\d+-\d+` 가 있어 280 은 PASS, 219(Topic 세기)는 0 이 맞음 |
| 제목을 이 파일에서 셈하는 도구(`lib/student-data.cjs` 134~175 · `lib/g1-data.cjs` 195~223 · `lib/g2-driver.cjs` 180~196 · `drive-reading.cjs` 225~228 · `check-grammar1-stages.cjs` 36) | `formatLessonPresentation` 그대로 불러 셈 | 따라 바뀜 | 고칠 것 없음. check-grammar1-stages `/제 (\d+)단계/` 은 '제 1단계 · …' 에도 맞음(돌려 봄: 아래 5장) |

검색 · 끝 막대 그 밖: `gap-checks-0926.cjs` 91 S 'Passage 100' 찾기 — code 는 searchText 에 그대로라 같음(`check-search.cjs` 이름 검색 20개 바뀜 0).

## 4. 남의 몫이라 적고 건너뛴 것(통합 · 다음 일꾼)

1. **③ 머리줄 '이용권 등록' 깜빡임** — `src/components/LicenseButton.tsx` 12~39: `hasActiveLicense` 가 거짓인 동안(저장된 이용권을 서버에 확인 중) '이용권 등록' 을 그림. 고칠 안: `useLicense()` 의 `licenseSettled`(이미 있음 — LicenseProvider 145 · 538)가 거짓이면 같은 크기의 빈 자리(`min-h-11` · `aria-hidden`)를 그리고 답 뒤 한 번에. 휴대폰 메뉴 서랍의 이용권 줄도 같은 까닭이면 같은 방식.
2. **PASS-OFF 'TOPIC' 남은 곳** — `src/lib/passoffUnlock.ts` 428~435 `topicWithParticle()` 가 `TOPIC ${topic}…` 을 만듦(잠김 화면 TopicLock 112~113 · MapRefill 350 · MapEntry 39 가 씀). 한 줄 고침: 머리를 `대주제` 로 — 또는 `curriculumPresentation.ts` 의 `passoffTopicWithParticle` 를 불러 씀(같은 조사 규칙 · 시험 D 1~20). 도구: `check-unlock.cjs` 553(조사 시험 'TOPIC N…' 기대) · 515(label 'TOPIC N' 시작 — 데이터라 그대로 PASS) · `check-progress-live.mjs` 124 · 158 · `drive-topic-lock.cjs` 508 · 571. (작업 트리를 보니 다른 일꾼이 TopicLock 180 · WrapUpStep 174 · 181 · MapEntry 35 의 `TOPIC {n}` 를 이미 `대주제 {n}` 으로 바꾸는 중 — 조사 붙는 곳만 남음.)
3. `src/lib/studentProgress.ts` 279 · `adultProgress.ts` 262 의 장 label 기본값 `Chapter ${chapter}` — 화면에 안 나옴(확인: 쓰는 곳 0). 손대지 않음.
4. 관리자 화면 `src/app/admin/license/page.tsx` 의 '챕터' · 'TOPIC'(내 몫 폴더지만 사장님 화면 · `drive-topic-admin` M2~M6 · `verify-admin-records.cjs` 140 이 읽음) — 학습자 화면이 아니라 그대로. 바꾸려면 도구와 함께.
5. 'STUDENT 패스'(이용권 창 · 잠김 화면 · 머리줄) ↔ 'STUDENT 이용권' — 상품 이름이라 사장님(2차 때와 같음).

## 5. 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 |
| `check-design-rules.cjs` 내가 바꾼 tsx 8(`CourseDashboard` · `LessonPaywall` · `SearchDialog` · `[course]/[lesson]/page` · `student/[lesson]/page` · `adult/[lesson]/page` · `passoff-grammar/[lesson]/page` · `passoff-grammar/map/page`) `--zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion,emoji` | 모두 0 · exit 0 |
| `KIG_ENV_LOCAL=… node scripts/generate-azure-ava.mjs --dry-run` | pending 0(8과정) — 영어 학습 글 바뀜 0 |
| `node scripts/buildSearchIndex.mjs --check` | current(1028) · 유출 0 |
| `node docs/qa-2026-09-18/scripts/check-search.cjs`(읽기만) | CNN 0 · 유료 0줄 · 이름 검색 20개 바뀜 0 · PASS |
| `node docs/qa-2026-09-18/scripts/check-grammar1-stages.cjs`(읽기만) | 194쪽 · 부제 단계 ≠ 목록 단계 0 · exit 0 |
| `git status` — `content/` · `docs/qa-2026-09-18/scripts` · `docs/pass-off-grammar` | 바뀜 0 |
| 내 시험 `고침3/fix-c2-도구/check-c2.cjs` | PASS 3456 · FAIL 0 (A 8과정 구간 머리 영어 0 · 꼴 / B 구간 줄 = 머리, 과정 색인 · 강의 파일 둘 다 / C STUDENT · ADULT 제목 · code · a2-1 ≠ a1-1 / D 대주제 조사 1~20 / E 색인 badge 0 · '발음' 0 · '직독직해' 0 · subtitle = 머리) |
| 같은 시험 깨기 `--break=english`(머리에 옛 'Stage' · 'Section' 을 메모리에서 붙임) · `--break=badge`(VOCA 색인에 badge 되살림) | FAIL 446 · FAIL 2 — 잡음 |
| `npx eslint` 바꾼 12파일 | 오류 0(경고 3 — 전부터 있던 SearchDialog setState-in-effect 등) |
| 화면 글(`facts.jsonl`, 전 = 운영 · 뒤 = 로컬 3382, 4벌 × 17쪽) | 위 1 · 2장 옛 → 새 그대로. '발음' 20 → 0. d001-1 · pr001-1 이전 링크 없음 |

## 6. 사진(git 밖) — `docs/qa-2026-09-18/out/ui-1007/c-fix-c2/`

- `before/`(운영 https://k-ig-core.vercel.app, 10-08 02:49~02:58) · `after/`(로컬 dev 3382, 03:3x) × `밝음|어둠` × `phone(390)|desktop(1366)` — 각 32장, 모두 256장. 숫자는 `before|after/facts.jsonl`.
- 쪽마다 같은 이름으로 짝: `<과정>-list.jpg`(데스크톱은 쪽 전체) · `<과정>-open.jpg`(첫 구간 펼침) · `adult_a2-1-lock.jpg` · `student_s2-1-lock.jpg` · `<강의>-head.jpg` · `<강의>-end.jpg`(student_s1-1 · adult_a1-2 · passoff-grammar_pg01-1 · grammar1_gh1-006 · ld_d001-1 · reading_pr001-1) · `search-empty.jpg` · `search-balum.jpg`.
- 번호별로 볼 짝: 8 · 18 · 40 `*/student-list.jpg` · `passoff-grammar-list.jpg` · `ld-list.jpg` · `grammar1-list.jpg` · `phonics-list.jpg` / 16 `adult_a2-1-lock.jpg` / 12 `search-balum.jpg` · `search-empty.jpg` / 25 `ld_d001-1-end.jpg` · `reading_pr001-1-end.jpg` / 42 `어둠/phone/passoff-grammar-list.jpg` / 41 `*/student-open.jpg`(장 머리 '이용권 등록 후 열려요').
- 로컬 사진 왼쪽 아래 동그란 'N' 은 Next dev 표시(운영에는 없음).
- 도구: `고침3/fix-c2-도구/capture-c2.cjs`(찍기) · `check-c2.cjs`(시험 · 깨기).

## 7. 배포 뒤 운영에서 볼 것

1. **③ 깜빡임(이용권 사본 · 0.1초 간격)**: /student · /adult · /passoff-grammar · /phonics 목록을 열 때 '학습 진도율: 0 / N' · '미완료 (N)' · 장 머리 '0/6' 이 맞는 숫자보다 먼저 보이지 않는지, 맨 위 단추가 빈 자리 → 맞는 강의 한 번인지. 데스크톱 머리줄 '이용권 등록' 은 4장 1 을 고칠 때까지 남음.
2. **41 · 8 이용권 쪽 글**: STUDENT · ADULT 목록 '진도 저장됨' · 잠긴 장 'N장을 마치면 열려요', PASS-OFF 목록 '진도 저장됨' · '대주제 N을 마치면 열려요' · 줄 '대주제 N을 마치면 열림' · 열림 알림 '대주제 N이 열렸어요.', 대주제 잠김 화면(pg03-1 등)의 지금 대주제 '대주제 2 · 동사의 현재형'(조사 문장은 4장 2 전까지 'TOPIC'), 구성도 쪽 머리 '대주제 1 · 인칭'.
3. **37**: 유료 PASS-OFF 강의 머리 — pg13-1(부제 줄 없음) · pg04-4('… / 부정문') · pg05-2('의문문의 대답').
4. **25**: 이용권으로 d001-1 · pr001-1 · gh2-007-1 끝 막대(이전 없음 · 다음 d002 · pr002 · gh2-008).
5. **검색**: 강의 쪽에서 빈 검색어 · '발음'(0) · '1장' · '대주제 3' · 'Passage 100'(pr100).
6. 도구(3장)를 고친 뒤 drive-topic-lock · drive-topic-admin · check-student-0927 · drive-generic(ld · reading · grammar2 대본 쪽) · drive-reading 을 운영에서 다시 — 앱만 먼저 올라가면 이 도구들은 3장 줄에서 FAIL 이 맞음.

## 8. 바꾼 파일(내 몫 13 + 새 도구 2 · 결과 1)

앱: `src/lib/curriculumPresentation.ts` · `src/lib/courses.ts` · `src/components/CourseDashboard.tsx` · `src/components/LessonPaywall.tsx` · `src/components/SearchDialog.tsx` · `src/app/[course]/[lesson]/page.tsx` · `src/app/student/[lesson]/page.tsx` · `src/app/adult/[lesson]/page.tsx` · `src/app/passoff-grammar/[lesson]/page.tsx` · `src/app/passoff-grammar/map/page.tsx` · `src/app/api/student/chapter-audio/route.ts` · `src/app/api/adult/chapter-audio/route.ts` · `scripts/buildSearchIndex.ts` · `public/search-index.json`(다시 만듦).
기록: `docs/qa-2026-09-18/UI검토-1007/고침3/fix-c2.md`(이 파일) · `고침3/fix-c2-도구/capture-c2.cjs` · `고침3/fix-c2-도구/check-c2.cjs`.
안 바꿈: `ChapterAudioBar.tsx` · `LicenseModal.tsx` · `LicenseProvider.tsx`(이미 장 · 이용권 코드 · 해요체 — 고칠 것 없음, ③ 원인은 LicenseButton) · `scripts/buildSearchIndex.mjs`.
