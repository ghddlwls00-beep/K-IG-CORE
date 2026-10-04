# ADULT 과정 (2026-10-02)

사장님 지시: "student 다음에 adult 섹션을 만들거야 학습자료는 위에 올려준걸로 하면되고 학습법은 student랑 완전히 똑같이 만들면 돼,
각 ppt의 본문만 잘 사용해도 만드는데 아무 문제 없을거야".

## 무엇으로 만들었나

- 원본: 바탕화면 `랩실 성인 학습 자료` 의 PPT 13개(1과~12과, 6과는 남성용 · 여성용).
- 쓴 것: 각 PPT 의 **English 슬라이드(▎ 소단원 · 번호 문장)** 와 **한글 번역 슬라이드** — 번호로 짝지음. 핵심 어휘 · 청크 끊어읽기
  슬라이드는 처음엔 안 썼다가 아래 '단어' · '끊어 읽기' 단계에 씀(2026-10-02).
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
| GRAMMAR II · PASS-OFF GRAMMAR | 한글만 — `부산` · `추석` (처음엔 `Busan(부산)` 덧붙임이었다가 같은 날 사장님 "한국어 로마식표기를 다 한국어로 바꿔" → "한글로만 바꾸기", 커밋 11a46e38) | 강의 파일 · 소리 · 정답 목록 · 마이크는 영어 철자 그대로 — 화면만 `koreanOnScreen`, 학생이 화면대로 한글로 쓴 답은 `romanForGrading` 으로 영어 철자처럼 채점(`src/lib/koreanGloss.ts`) |
| LISTENING · VOCA · GRAMMAR I | 해당 없음 — LISTENING 의 Kim 은 미국 사람 | — |

**한글로 바꾼 뒤 생긴 문제와 고침 (2026-10-02 밤, 사장님 "신라 블록이 없는데 … 이런 문제 있는곳 전체적으로 찾아서 수정해라")**
- 받아쓰기: 낱말 자르기 규칙 두 곳(`studentDictation.ts` TOKEN · `listeningUtils.ts` DICTATION_TOKEN)이 영어 글자만 낱말로 셈 →
  한글 낱말이 조각에서도 정답에서도 빠짐(STUDENT 39문장 · ADULT 45문장, 예: 'The 신라 Kingdom …' 이 'The Kingdom …' 11조각).
  한글을 낱말 글자로 넣음. LISTENING 2,217줄은 그대로(한글 없음 — check-ld-dictation-0927 의 바탕 대조 PASS).
  check-student-dictation.cjs 에 `--course adult` 와 '빠진 글자 0' 을 더함(깨기 `--break=hangul` 이 STUDENT 39 · ADULT 45 를 잡음).
- READING pr069: 'Heungdeok Temple' 을 통째로 '흥덕사' 로 바꿔 낱말 카드 'temple' 이 지문에서 사라짐 → '흥덕 Temple' 로.
  READING 목록의 낱말 수(readingLengths.ts)도 다시 셈.
- 검사 도구가 한글 문장을 로마자로 비교하도록: PASS-OFF 무료 강의 유출 검사(checkPassoffFreeLeak.mjs — 안 고치면 유출을 놓침) ·
  PASS-OFF check-lessons(STUDENT 와 같은 문장) · STUDENT 원본 대조(check-student-original.mjs — 설명 없음 0 · 낡은 예외 0).

새 음성 0 (dry-run pending 0). 검사: `node docs/adult/korean-words-on-screen.cjs`(모든 글 칸 · 깨기 `--break`),
`node scripts/korean-words-hangul.mjs --check`, `node scripts/build-adult-content.mjs --check`.

## ADULT 의 5단계 (2026-10-02)

1 블라인드 리스닝 → **2 단어** → **3 끊어 읽기** → 4 탭 딕테이션 → 5 섀도잉 & 낭독. 통으로 한 번 듣고, 낱말 → 문장 덩어리 순으로
뜻을 잡은 뒤, 받아쓰고 말한다(READING 의 '처음 읽기 → 핵심 어휘' 와 같은 자리). STUDENT 는 3단계 그대로(사장님 "스튜던트에는 청크 넣지마").
탭 다섯은 글자가 한 줄에 다 안 들어가서(강의 칸 최대 720px) 휴대폰과 같은 줄 — 번호 + 지금 단계 이름(`StepTabs` `compact`).

## 단어 — Step 2 (2026-10-02, 사장님 "어덜트 섹션에서 단어 학습법 만들자 적절한 순서로 들어가게")

- 학습법: READING 의 '핵심 어휘' 그대로(사이트의 단어 학습법 하나) — `src/components/AdultWordsStep.tsx`.
  카드: 표현 · 품사 · 그 낱말이 든 강의 문장(밑줄) → '뜻 보기' → 뜻 + 알아요 · 몰라요. 스피커는 낱말 소리.
  빈칸 채우기: 한 번에 5문제(몰라요 → 아직 못 맞힌 것 순), 보기 4개(정답 + 같은 과의 다른 표현 3 — 품사 · 끝(-ed/-ing/-s)이 같은 것 먼저),
  고르면 정답 · 문장 · 한국어 줄 · '문장 듣기'; '다른 빈칸으로 다시 풀기'. 탭 수 = 빈칸에서 맞힌 낱말(`practice.wordRight`, 이 기기). **완료 규칙 그대로**.
- 낱말: PPT 의 '핵심 어휘·표현' 슬라이드 — [`ppt-어휘.json`](ppt-어휘.json)(뽑기 `powershell -File docs/adult/extract-words.ps1`, 344개).
  `build-adult-content.mjs` 가 낱말마다 그 과에서 쓰인 문장을 찾아(PPT 의 쓰임 구절 → 낱말의 꼴 'unite'→'united' · '(A)' 자리) 문장의
  `words` 에 붙임: 303개(+ 아래 토요일 15 = 318). 6과 남성용 · 여성용은 같은 32개(공통 소단원 것)라 하나만 씀. **빠진 9개** — 7~10과가 STUDENT 감사 문장으로
  바뀌어 이제 본문에 없는 낱말: civil war · unite · gain power over · as a result · rapidly · also known as · in order to · royal ·
  ancient times(`WORDS_GONE` — 새로 빠지면 빌드가 멈춤, 깨기로 확인).
- **6-1 · 6-2(토요일)**: PPT 에 그 소단원 낱말이 없어 문장에서 골라 넣음(사장님 "둘다 오케이") — operate · slip away · sleep in ·
  unwind · relieve · talk through · balanced, 6-2 는 run errands 더해 8개(`EXTRA_WORDS` — 그 강의 문장에 없으면 빌드가 멈춤).
  그래서 55강의 모두 낱말이 있음(318개). 낱말 없는 강의의 안내문은 코드에만 대비용으로 있음 — READING 도 512쪽 모두 14개라 실제로 안 나옴.
- 소리: 낱말 새 클립 170개(토요일 6 포함)(나머지는 VOCA 등에 이미 있음) · R2 올림. 'bow'(절하다)는 /baʊ/ 로(`bow ⟨baʊ⟩` — VOCA 방식),
  '(A)' 자리는 'something' 으로 읽음('regard something as something'). 무료 a1-1 · a1-2 낱말 6개는 무료 소리 목록에.

## 끊어 읽기 — Step 3 (2026-10-02, 사장님 "어덜트 섹션에서 청크 학습법 하나 만들자 적절한 순서로 들어가게")

- 자리: 단어 다음, 받아쓰기 전 — 문장을 덩어리로 나눠 영어 순서대로 뜻을 잡는 자리.
- 화면(한 문장씩): 덩어리마다 영어(누르면 그 덩어리만 소리) + 회색 '뜻 보기'(누르면 한국어 덩어리). '끊어 듣기' 는 덩어리를 차례로
  사이를 두고, '문장 듣기' 는 문장 통째로. 뜻을 다 열면 '문장 전체 해석'(그 문장의 한국어 줄). 번호 단추 · '다음 문장' 은 덩어리를 차례로
  들려줌(단계를 옮길 때는 소리 없음 — 원래 규칙). 탭의 수 = 뜻을 다 연 문장(`practice.chunked`, 이 기기). **완료 규칙은 그대로**(받아쓰기 80% + 말하기 80%).
- 덩어리: PPT 의 '청크 단위 끊어읽기' 슬라이드 — [`ppt-청크.json`](ppt-청크.json)(뽑기 `powershell -File docs/adult/extract-chunks.ps1`,
  245문장 모두 PPT 본문과 글자까지 이어짐). `build-adult-content.mjs` 가 문장마다 `chunks: [{en, ko}]` 로 붙임 — 영어 덩어리를 이으면
  문장과 글자까지 같아야 함(아니면 멈춤). PPT 뒤에 고친 문장: 영어만 바뀐 26문장은 PPT 의 끊는 자리를 새 낱말로 옮김(한국어 덩어리 그대로),
  뜻이 바뀐 20문장(7~10과 KO_FIX · 1과 #21 '(2)' · 2과 #14 '아들은')은 `CHUNK_FIX` 에 직접 씀. 228문장 · 713덩어리.
- 소리: 덩어리마다 새 클립 574개(21,772자 — 나머지는 문장 · 다른 덩어리와 같은 글이라 이미 있음), R2 에 올림. 무료 a1-1 · a1-2 의 덩어리
  17개는 무료 소리 목록에 더해짐(`freeSpeechKeys.json`).
- **STUDENT 와 달라진 점**: STUDENT 는 덩어리 자료가 없어 3단계 그대로 — 두 과정의 학습법이 이 한 단계만큼 다르다.

## 학습법 — STUDENT 와 같은 것

- 강의 화면: `StudentLearningView` 그대로(1 블라인드 리스닝 · 2 탭 딕테이션 · 3 섀도잉 & 낭독, 완료 = 받아쓰기 80% + 말하기 80%) — 위 단어 · 끊어 읽기가 더해져 ADULT 는 5단계.
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

