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
| 1과 영어 문장 속 한글(홍길동 · 서울 · 부산 · 한국 University) | STUDENT 1-2 처럼 로마자(Hong Gil Dong · Seoul · Busan · Hanguk) + '내 정보' 빈칸 10개 (`studentBlanks.ts` a1-2) |
| 메뉴 사진 | 남성 어른 사진(`TAB_IMAGES.men`) |

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

- 새 클립 354개(31,786자) 생성 — 나머지 96개는 STUDENT 와 같은 문장이라 이미 있는 클립을 씀. `--dry-run` pending 0.
- **R2 에는 아직 안 올림.** 파일은 이 작업 폴더와 원래 저장소의 `public/audio/azure-ava/v1/` 에 있음.
  배포 순서(AGENTS.md): `node scripts/upload-azure-ava-r2.mjs` → 그 뒤 푸시.

## 확인한 것 (같은 AI 가 만들고 확인함 — 독립 검수 아님)

- `npx tsc --noEmit` 0 · `npx next build` 통과 · `plan-access.cjs` PASS · `korean-names-in-speech.cjs` 판정 없는 낱말 0.
- 로컬 화면: /adult 목록(12장 · 1·2강 무료 · 나머지 잠금), a1-2 세 단계 · '내 정보' 빈칸 10 · 새 클립 재생, 잠긴 a2-1 은 내용 없이 잠금 화면,
  없는 주소 404, 장 듣기 API(무료 1장만 · 2장 401), 처음 화면 STAGE 02 ADULT. STUDENT 쪽 같은 확인 그대로.
- **못 한 것**: 이용권으로 장이 차례로 열리는지 브라우저 확인(이 작업 폴더에 이용권 비밀값이 없음). 규칙 코드는 STUDENT 것을 옮긴 것.

## PPT 글에서 본 것 (고치지 않음 — 사장님 판단)

- 1-2 #3 "I live at Busan apartment with my husband and 2 children." — 아파트 단지 이름이면 보통 "I live in Busan Apartments".
- 2-5 #2 "Our eldest son" — 2과 가족은 아들 하나 · 딸 하나라 eldest(셋 이상 중 맏이)가 어색함. "Our son" 이면 자연스러움.
