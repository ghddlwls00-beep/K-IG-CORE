# ADULT 과정 (2026-10-02)

사장님 지시: "student 다음에 adult 섹션을 만들거야 학습자료는 위에 올려준걸로 하면되고 학습법은 student랑 완전히 똑같이 만들면 돼,
각 ppt의 본문만 잘 사용해도 만드는데 아무 문제 없을거야".

## 무엇으로 만들었나

- 원본: 바탕화면 `랩실 성인 학습 자료` 의 PPT 13개(1과~12과, 6과는 남성용 · 여성용).
- 쓴 것: 각 PPT 의 **English 슬라이드(▎ 소단원 · 번호 문장)** 와 **한글 번역 슬라이드** — 번호로 짝지음. 핵심 어휘 · 청크 끊어읽기 슬라이드는 쓰지 않음(본문만).
- 뽑은 그대로의 글: [`ppt-본문.json`](ppt-본문.json). 강의 파일은 `node scripts/build-adult-content.mjs` 가 이것에서 만든다
  (`--check` 는 디스크와 다르면 exit 1).
- 결과: 12과 · 55강의 · 228문장 — `content/lessons/adult/a<과>-<소단원>.json`, `content/courses/adult.json`.

## 사장님 결정 (2026-10-02)

| 질문 | 답 |
|---|---|
| 6과 남성용 / 여성용 | 다른 곳은 토요일 소단원의 세 문장뿐 → 6-1 토요일(남성용) · 6-2 토요일(여성용) · 6-3~6-5 공통 |
| 어떤 이용권으로 여나 | STUDENT 이용권도 연다 (`license.ts` STUDENT_PASS_COURSES · 이름 "STUDENT · PASS-OFF GRAMMAR · ADULT") |
| 7~10과 (STUDENT 17~20장의 옛 글) | STUDENT 처럼 고친다 — 영어는 STUDENT 가 감사 때 고친 문장 그대로, 한글은 뜻이 바뀐 줄만 고쳐 씀. 문장 수 · 소단원은 PPT 대로 |
| 1과 영어 문장 속 한글(홍길동 · 서울 · 부산 · 한국 University) | '내 정보' 빈칸 10개 (`studentBlanks.ts` a1-2). 처음엔 로마자로 바꿨다가 아래 '표기는 한국어로' 결정으로 다시 한글 |
| 메뉴 사진 | 남성 어른 사진(`TAB_IMAGES.men`) |
| 영어 속 한국어 낱말의 표기 (샘플을 들으신 뒤) | 발음은 좋다 · 표기는 한국어로 — 화면에는 한글(경주 · 서울 · 불고기 · 제주도 · 한라산 …), 소리는 만든 음성 그대로 (`lessonSpeechForm.ts` KOREAN_DISPLAY_PAGES: 소리 낼 때만 로마자로 되돌림 → 클립 이름 같음. 226문장 소리 그대로 확인) |
| PPT 문장 두 곳 | 추천대로 — 1-2 `I live in 부산 Apartments` · 2-5 `Our son`(한글 '아들은') — 새 음성 3 |

## 사이트 전체: 영어 속 한국어 낱말 (2026-10-02 "어 있는거 싹다 꼼꼼히 찾아서 다 작업해")

| 과정 | 화면 | 소리 · 채점 |
|---|---|---|
| ADULT · STUDENT · READING | 한글만 — 경주 · 불고기 · 제주도 · 한라산 · Admiral 이순신 · 직지 · 한성순보 …, STUDENT 제목 8개도(예: `Traditional Food (전통 음식 (불고기))`) | 그대로 — 소리 낼 때 `romanizedForm` 이 로마자로 되돌림(클립 이름 같음, 마이크도 로마자로 들음). STUDENT · READING 은 `node scripts/korean-words-hangul.mjs` 가 고침(27파일 95칸) |
| GRAMMAR II · PASS-OFF GRAMMAR | 영어 표기 + 한글 덧붙임 — `Busan(부산)` · `Chuseok(추석)` (사장님 선택: 학습자가 영어를 직접 쓰는 과정이라 철자는 그대로) | 그대로 — `src/lib/koreanGloss.ts` 는 그리는 글에만 |
| LISTENING · VOCA · GRAMMAR I | 해당 없음 — LISTENING 의 Kim 은 미국 사람 | — |

새 음성 0 (dry-run pending 0). 검사: `node docs/adult/korean-words-on-screen.cjs`(모든 글 칸 · 깨기 `--break`),
`node scripts/korean-words-hangul.mjs --check`, `node scripts/build-adult-content.mjs --check`.

## 학습법 — STUDENT 와 같은 것

- 강의 화면: `StudentLearningView` 그대로(1 블라인드 리스닝 · 2 탭 딕테이션 · 3 섀도잉 & 낭독, 완료 = 받아쓰기 80% + 말하기 80%).
  강의 키가 `adult/…` 이면 ADULT 의 진도 · 복습 기록(`kig-learning:adult`)을 쓴다.
- 장 순서 잠금: STUDENT 규칙 그대로 — 장의 강의 80%(올림) + 마지막 강의를 마치면 다음 장, LIFE 는 전부, 무료 체험 a1-1 · a1-2.
  서버 기록은 따로: `src/lib/adultProgress.ts` (R2 `private/progress/adult/…` — STUDENT 의 `private/progress/` 와 겹치지 않음),
  `/api/progress/adult` · `/api/adult/chapter-audio` · `/api/admin/adult-progress`, 강의 주소 `src/app/adult/[lesson]`.
  STUDENT 의 진도 코드(`studentProgress.ts` · 그 API)는 손대지 않았다.
- 화면 쪽: LicenseProvider(adultProgress) · ProgressProvider(ADULT 보내는 줄 `kig:adult:pending:v1`) · CourseDashboard · ChapterAudioBar ·
  LessonEndBar · LessonPaywall · 관리자 'ADULT 진도'.
- 소리: STUDENT 처럼 영어와 한국어 줄을 모두 읽는다(`spoken-texts.cjs`). 영어 속 로마자 한국어 낱말은 IPA 표시
  (`lessonSpeechForm.ts` "adult/…"). 새 낱말 다섯 — Hong · Minguk · jjimjilbang · Gwangju · hagwons — 은 사장님 들어 보실 샘플:
  https://claude.ai/artifact/Gp56cBCfcM75TxSCp1WoC5

## 음성

- 새 클립 354개(31,786자) + 고친 두 문장 3개 생성 — 나머지 96개는 STUDENT 와 같은 문장이라 이미 있는 클립을 씀. `--dry-run` pending 0.
- **배포됨 (2026-10-02, 사장님 "이거 너가해")**: R2 에 357개 먼저 올림(실패 0 · 버킷 53,680 → 54,037, 덮어쓰기 0) → `main` 푸시
  `91d9096b..bc43fb1a`. 운영 확인: /adult 목록 55강의 · 12장, /adult/a1-2 한글 표기 · 고친 3번 문장 새 음성 재생(206),
  /adult/a2-1 잠금 화면 · 본문 없음, /student/s1-2 '홍길동 · 서울', /student/s20-4 제목 '경주', /passoff-grammar/pg01-1
  'Hong Gil Dong(홍길동) … Seoul(서울)', 처음 화면 ADULT.

## 확인한 것 (같은 AI 가 만들고 확인함 — 독립 검수 아님)

- `npx tsc --noEmit` 0 · `npx next build` 통과 · `plan-access.cjs` PASS · `korean-names-in-speech.cjs` 판정 없는 낱말 0.
- 로컬 화면: /adult 목록(12장 · 1·2강 무료 · 나머지 잠금), a1-2 세 단계 · '내 정보' 빈칸 10 · 새 클립 재생, 잠긴 a2-1 은 내용 없이 잠금 화면,
  없는 주소 404, 장 듣기 API(무료 1장만 · 2장 401), 처음 화면 STAGE 02 ADULT. STUDENT 쪽 같은 확인 그대로.
- **못 한 것**: 이용권으로 장이 차례로 열리는지 브라우저 확인(이 작업 폴더에 이용권 비밀값이 없음). 규칙 코드는 STUDENT 것을 옮긴 것.

