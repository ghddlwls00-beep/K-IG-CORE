# UI검토-1007 고침 — fix-list (4 · 6 · 7 · 8 · 10번)

- 2026-10-07 · 가지 `claude/regression-check-1002-8d4817` (HEAD 970fa371) · 커밋 · 푸시 안 함.
- **같은 AI 계열이 고치고 확인했습니다. 독립 검수가 아닙니다.**
- 사진 · 숫자: `docs/qa-2026-09-18/out/ui-1007/fix-list/before/` · `after/` (out/ 은 git 밖).

## 한눈에

| # | 무엇 | 결과 |
|---|---|---|
| 4 | STUDENT '무료로 먼저 해 보기' 단추가 카드 밖으로 넘침 | 고침 — 넘침 390: 19px → 0 · 360: 49px → 0, 긴 이름 '…', 높이 48px 그대로 |
| 6 | 맨 위 '처음부터'가 끝낸 강의를 가리킴 | 고침 — 이 기기 기록이 없으면 '다음 강의 · 아직 안 끝낸 첫 강의', 다 끝냈으면 '마지막 강의' |
| 7 | 과정 소개 글이 과장 · 사실과 다름 | 고침 — 6과정 한 줄, 하는 일대로(아래 표) |
| 8 | '챕터 전체 파트 듣기' 상자만 호박색 · 작은 글 | 고침 — 강의 줄과 같은 한 줄, 색 금색 하나, 12px 이상, 누르는 것 모두 44px 이상 |
| 10 | 이용권 있는 사람에게 목록이 잠깐 '무료 · 자물쇠' | 고침 — 서버가 이용권 쿠키를 본 사람은 답이 올 때까지 자리만 비워 둠. 이용권 없는 사람의 첫 그림은 그대로 |

## 4번 — 무료 체험 카드 단추 넘침

- 무엇: 카드 안 격자가 글 길이만큼 늘어나(격자 칸의 최소 폭 = 글 폭) 단추가 카드 밖으로 나갔음.
- 어떻게: 격자 `grid-cols-1`(= `minmax(0,1fr)`) · 단추 `min-w-0` · 이름 `min-w-0 truncate` · 화살표 `shrink-0`.
- 파일: `src/components/CourseDashboard.tsx` 514 · 519 · 523 · 524 줄.
- 검사(로컬, 이용권 없는 빈 사본, 단추 오른쪽 끝 − 카드 안쪽 끝):

| 화면 | 전 | 뒤 |
|---|---|---|
| 390 | +19px(카드 밖 3px) | −1px(카드 안) · 높이 48 |
| 360 | +49px(카드 밖 33px) | −1px · 높이 48 |
| 1366 | 안 넘침 | 안 넘침 |

  ADULT · PASS-OFF · VOCA 는 전 · 뒤 모두 넘침 0. 둘째 단추 'Part 2 · Name, School & Age (이름, …' 처럼 '…'.
- 사진: `before/student-small-0-server.jpg` → `after/student-small-0-server.jpg`(그 밖 `*-phone-*` · `*-desktop-*`).

## 6번 — 맨 위 단추

- 무엇: '이어서'를 이 기기 기록(최근 연 강의)으로만 정해, 기록이 없으면 늘 첫 강의 '처음부터'였음.
- 어떻게: 이 기기에 최근 강의가 있으면 전처럼 '이어서 학습'. 없으면 목록이 '완료'로 그리는 것과 같은 기준(`isDoneHere` — STUDENT · ADULT · PASS-OFF 는 이용권이 있을 때 서버 기록, 나머지는 이 기기 기록)으로 **아직 안 끝낸 첫 강의**:
  완료 0 → '처음부터 · 첫 강의'(전과 같음) · 하나라도 완료 → '다음 강의 · 그 강의' · 모두 완료 → '마지막 강의 · 마지막 강의'('복습하기' 꼴은 넣지 않음).
  서버 기록(STUDENT · ADULT 의 진도, PASS-OFF 의 대주제 답)이 아직 안 왔으면 단추 자리만 비워 둠 — 잠깐 엉뚱한 강의를 가리키지 않게.
- 파일: `src/components/CourseDashboard.tsx` 320~343(고르기) · 460~476(그리기).
- 검사(로컬, 이용권 흉내 · 서버 기록 흉내 — 아래 '시험 방법'):

| 경우 | 전 | 뒤 |
|---|---|---|
| STUDENT, 서버 기록 s1-1 완료, 이 기기 최근 없음 | '처음부터 · Part 1 · Greeting' → /student/s1-1 | '다음 강의 · Part 2 · Name, School & Age …' → /student/s1-2 |
| VOCA, 이 기기 완료 mv1-01 · 02 | '처음부터 · 중등 단어 1단계 · 01회' | '다음 강의 · 중등 단어 1단계 · 03회' |
| VOCA, 195강 모두 완료 | '처음부터 · 01회' | '마지막 강의 · 고등 단어 · 75회' |

  사진: `before/six-*.jpg` → `after/six-*.jpg` · 숫자 `before/six.json` · `after/six.json`.

## 7번 — 과정 소개 글

- 어디에 쓰이나(grep): `src/lib/courses.ts` 의 `description` 하나 → ① 과정 목록 머리(`src/app/[course]/page.tsx` 155~156줄) ② 목록 쪽 메타 설명 · 공유 카드(같은 파일 `generateMetadata`) ③ `/t/<탭>` 중간 쪽(`src/app/t/[tab]/page.tsx` 141줄). 첫 쪽은 `src/app/page.tsx` 가 값을 넘기기만 하고 `LandingPage.tsx` 는 그리지 않음(타입 13줄뿐) — **첫 쪽 모양 그대로**. 검색 색인(`public/search-index.json`)에는 소개 글이 없음(옛 글 0건) → 다시 만들 필요 없어 안 만듦.
- 파일: **`src/lib/courses.ts`** 23 · 35 · 46 · 86 · 102 · 114줄(소개 글 줄만). ⚠ 지시의 '네 몫' 목록에는 없던 파일입니다 — 지시가 짐작한 `content/courses/*.json` 에는 소개 글이 없고(8과정 모두 `course` 는 글자 'student' 같은 slug 뿐), 글이 이 파일에만 있어서 고쳤습니다. 고치기 전 `git status` 로 다른 일꾼이 손대지 않았음을 확인했고, `description` 줄 말고는 바꾸지 않았습니다(과정 이름 · 순서 · slug 그대로 — `buildValidRoutes.mjs` · `plan-access.cjs` 가 읽는 것 영향 없음).
- 근거(사실 확인): 단계 이름은 각 화면의 `STEPS`(VOCA `PhonicsLearningView.tsx` 104 · LISTENING `LdLearningView.tsx` 126 · READING `ReadingLearningView.tsx` 163 · STUDENT `StudentLearningView.tsx` 133 · GRAMMAR `GrammarLearningView.tsx` 78), 구간은 `content/courses/*.json` groups(VOCA 중등 01~03 + 고등 = 1~3단계, GRAMMAR I 6단계 이름은 `curriculumPresentation.ts` 46~54, STUDENT 20장 자기소개 ~ 한국의 명소), GRAMMAR II 는 44과 첫 세 문장을 모두 읽어 봄(조건문 · 전치사 · 부정사 · 관계사 · 가정법 · 화법 + 식당 · 전화 같은 생활 표현).

| 과정 | 전 | 뒤 |
|---|---|---|
| STUDENT | 일상 회화로 마스터하는 실전 듣기와 정독 훈련. | 자기소개부터 학교생활 · 꿈 · 한국 이야기까지, 학생 회화 문장을 먼저 듣고 받아쓰고 따라 말해요. |
| VOCA | 중등 1~4단계부터 고등 심화까지 필수 영단어 매트릭스 및 발음 정밀 클리닉. | 중등 1~3단계와 고등 심화 단어. 보고 듣기 → 뜻 고르기 → 틀린 단어 말하기 → 60초 풀기. |
| LISTENING | 실전 수능·토익 대비 받아쓰기 훈련. 고음질 음성과 딕테이션 훈련으로 완벽한 청취력을 완성합니다. | 듣기 지문을 먼저 들어 보고, 받아쓰고, 연음을 짚은 뒤 따라 말해요. |
| READING | 문장 낭독과 구문 분석이 결합된 원문 독해 훈련으로 문해력과 직독직해 능력을 완성합니다. | 영어 지문을 읽고, 핵심 어휘를 익히고, 우리말과 맞춰 본 뒤 다시 읽으며 속도를 재요. |
| GRAMMAR I | 한국어 문장을 즉시 영어로 변환하는 기초 영작 훈련. 6단계 체계적 문장 구조 정복. | 우리말을 보고 영어 문장을 써 봐요. 기본 문장 구조부터 접속사 · 복문까지 6단계. |
| GRAMMAR II | 심화 구문 및 패턴별 집중 영작 트레이닝. 고난도 문형과 어순 감각 완성. | 우리말을 보고 영어 문장을 써 봐요. 전치사 · 부정사 · 관계사 · 가정법 같은 구문과 생활 표현을 과마다 영작해요. |

- 안 한 것: ADULT · PASS-OFF 소개(결과.md 가 '하는 일대로'라 함 — 그래서 이 둘만 합니다체로 남음), CNN(폐지), 첫 쪽 · 404 의 영어 부제 'vocabulary matrix with pronunciation clinic'(첫 쪽 글이라 결과.md 가 따로 여쭙기로 함 — 내 몫 아님). '수능·토익 대비'는 근거를 찾지 못해 뺐습니다(목록 강의 부제 '수능/토익 딕테이션 훈련'은 `curriculumPresentation.ts` 179줄 — 화면에 쓰이지 않는 subtitle 이라 그대로).
- 사진: `after/*-0-server.jpg`(머리 소개 글) · 메타 설명은 `after/result.json` 의 `metaDesc`.

## 8번 — '이 장 전체 듣기' 줄

- 무엇(전): 살구색 바탕 · 호박색 테두리 상자, 11.5px 설명, 재생 중 코딩용 글꼴 10.5px 속도 칩(높이 24px) · 32px 정지 · 빨간 글, 잠김 '🔒' · '챕터 해금 후'. 디자인 검사로 12px 미만 5 · 직접 색 10 · 이모지 2.
- 어떻게(뒤): 강의 줄과 같은 한 줄 — 52px 높이, 같은 왼쪽 칸(아이콘 자리 = 강의 번호 자리), 14px 글, 마우스를 올리면 바탕만 옅게.
  '▶ 이 장 전체 듣기 · 강의 6개 이어서' / 무료(이용권 없이 1장): '무료 강의 이어 듣기 · 1·2강 이어서' / 재생 중: '‖ 재생 중 · 강의 1/2 · 문장 1/3' + 속도 0.85× · 1× · 1.2×(44×44, 목록 거르기와 같은 모양, `aria-pressed`, 고정폭 없음) + 정지 아이콘(44×44) / 잠김: 자물쇠 선 아이콘 · '이 장을 열면 들을 수 있어요' / 오류: `text-danger` 12px.
  아이콘은 `icons.tsx`(IconPlay · IconPause · IconStop · IconLock), 재생 중 아이콘만 금색(`text-primary`). 이모지 · 새 색 · 고정폭 0.
- 바꾸지 않은 것: 요청(`/api/<student|adult>/chapter-audio?chapter=N`) · 캐시 · 문장 → 소리 글(`lessonSpeechForm(… firstSlashAlternative(…))`) · 속도 값 · 다른 장과 하나만 재생 — 함수 부분은 손대지 않고 그리는 부분만 바꿈. 불러오기 실패 글만 '이 장의 소리를 불러오지 못했어요.'
- 파일: `src/components/ChapterAudioBar.tsx` 12(아이콘 가져옴) · 193 · 203(실패 글) · 227~319(그리기).
- 검사(로컬, 1장 펼쳐 줄을 누름 — 소리 파일은 로컬에 없어 무음 WAV 를 돌려줌):

| | 전 | 뒤 |
|---|---|---|
| 가장 작은 글 | 10.5px(속도) · 11.5px(설명) | 14px(줄) · 12px(속도) |
| 누름 영역 | 속도 45×24 · 28×24 · 39×24, 정지 57×32 | 속도 49×44 · 44×44 · 44×44, 정지 44×44, 줄 52px |
| 디자인 검사(`check-design-rules`) | 12px 미만 5 · 직접 색 10 · 이모지 2 | 0 · 0 · 0 |

  사진: `before/student-phone-2-chapter-audio.jpg` → `after/student-phone-2-chapter-audio.jpg`, 재생 중 `before|after/play-student-{phone,small,desktop}.jpg`(전 360 은 재생으로 바뀌기 전에 찍힘). 숫자 `before|after/play.json`.

## 10번 — 이용권 있는 사람에게 잠깐 보이던 '무료 · 자물쇠'

- 까닭: 목록의 첫 그림을 서버가 '이용권 없음'으로 그리고, 브라우저가 이용권을 확인한 뒤에야 바꿈. 확인 전에는 '무료로 먼저 해 보기 · 0/67', 장 머리 '이용권 등록 후 열립니다' · 자물쇠, 줄마다 '무료' · '이용권'.
- 어떻게:
  1. 서버(`src/app/[course]/page.tsx` 101 · 172 · 178~196 `licenceCookieOpens`): 요청에 이용권 쿠키(`kig_license_session`)가 있고, 이 서비스가 서명했고 기간이 남았고, 그 상품이 이 과정을 여는지(`planOpensCourse`) — 맞으면 `licenseHint` 를 목록에 넘김. **그리기 힌트일 뿐 열람 판정이 아님**(기기 기록 대조는 안 함 — 저장소를 불러야 해서). 쿠키 없음 · 틀림 · 오류 → false → 서버가 전처럼 무료 그림.
  2. 브라우저(`src/components/LicenseProvider.tsx` 48~60 · 144~147 · 208 · 296 · 301 · 306 · 328 · 336 · 351 · 359 · 538~541): '첫 답이 왔다'는 표지만 더함 — `licenseSettled`(이 기기 사본 확인 또는 쿠키 복구 확인이 끝남, 성공 · 실패 · 오류 모두), `studentProgressSettled` · `adultProgressSettled`(서버 장 기록의 첫 답). **`hasActiveLicense` · `isUnlocked` 판정은 한 글자도 안 바뀜.**
  3. 목록(`src/components/CourseDashboard.tsx` 230 `licenseUnknown` = 힌트 있음 · 이 과정 열람 아직 아님 · 답 아직 · 232 `chapterRecordPending` = 이용권 있음 · LIFE 아님 · STUDENT/ADULT 장 기록 답 아직): 그동안
     맨 위 카드는 같은 상자 · 같은 높이로 자리만(진도 문장 '학습 진도율: N / T개 완료'와 빈 막대는 둠 — 점검 도구가 읽음, 446~459) · 장 머리 설명 줄은 빈 칸(높이 유지, 643) · 장 머리 자물쇠 안 그림(653) · 장 듣기 줄 안 그림(665) · 줄의 '무료' · '이용권' · 자물쇠 · 흐린 북마크 안 그림('완료'는 그림, 89 · 104~119 · 177 · 697). 답이 오면 한 번에 그림.
     PASS-OFF 의 원래 '진도 확인 중…'(이용권은 확인됐고 대주제 답이 아직)은 그대로(`drive-topic-lock.cjs` D8b 가 읽음).
- 이용권 없는 사람: 쿠키가 없으니 힌트 false → **서버 첫 그림 · 그 뒤 모두 전과 같음**. 쿠키는 있는데 이용권이 아닌 사람(기기 해제 · 만료 · 취소)은 답이 오면 무료 카드가 꼭 나옴(아래 시험).
- 검사(로컬, 휴대폰 390 · 360 · 1366, 스크립트를 끈 서버 첫 그림 + 스크립트를 켜고 0.3 · 1 · 2.5 · 6초):

| 경우 | 전 | 뒤 |
|---|---|---|
| 이용권 없음(쿠키 없음) — 서버 첫 그림 | 무료 카드 · '1·2강 무료' · '이용권 등록 후 열립니다' · 자물쇠 | **같음**(소개 글 · 4번 단추만 다름) — `before|after/{student,adult,passoff-grammar,phonics}-{phone,small,desktop}-0-server.jpg` |
| 이용권 흉내(쿠키 + 이 기기 사본, 확인 답 0.7초 늦게) | STUDENT · PASS-OFF · VOCA: 0.3~2.5초 무료 카드(개발 서버라 느림, 6초에야 바뀌거나 STUDENT 는 6초에도 무료) — `before/*-sim-t*.jpg` | 4과정 × 3화면 12쪽 모든 장면에 무료 카드 · 무료 띠 · 자물쇠 0 → 6초 '처음부터 …' — `after/*-sim-*.jpg` · `after/sim.json` |
| 쿠키는 있는데 이용권이 아님(확인 답 403) | — | 빈 자리 → 답 뒤 무료 카드 나옴(STUDENT · PASS-OFF) — `after/*-sim403-*.jpg` · `after/sim403.json` |

## 검사 모음

- `npx tsc --noEmit` exit 0(작업 트리 전체 — 다른 일꾼 것 포함, 2번 돌림).
- `check-design-rules.cjs` 내 몫 5파일(`CourseDashboard` · `ChapterAudioBar` · `LicenseProvider` · `[course]/page.tsx` · `courses.ts`) `--zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion,emoji` → 모두 0 · exit 0. 검사가 실패할 수 있음: 옛 `ChapterAudioBar.tsx`(HEAD)는 같은 검사로 12px 미만 5 · 직접 색 10 · 이모지 2.
- `npx eslint`(내 5파일): 오류 0 · 경고 6 — 모두 전부터 있던 꼴(쓰지 않는 import 3 · effect 안 setState 3, 그중 2는 내가 고친 effect 의 원래 줄).
- `probe-bundle-leak-all.cjs --base http://localhost:3363`: **exit 1 — 유출로 센 6건, 모두 내 변경과 무관한 개발 빌드의 주석**. 6건의 글은 `src/lib/vocaSpeech.ts` 119 · `src/lib/studentDictation.ts` 62 · `src/lib/grammarGrading.ts` 195 · 271 의 **코드 주석**에 들어 있고(내가 손대지 않은 HEAD 파일), 개발 서버 묶음(`/_next/static/chunks/app/[course]/[lesson]/page.js`)이 주석을 지우지 않아 잡힌 것을 원문에서 확인함(운영 빌드는 주석을 지움). 소개 글 · 목록 · `/search-index.json` 에서는 0(inJson 0 · 목록 제목으로 뺀 210 · 앱 코드 4 는 전과 같은 규칙). 운영 빌드(`next build`)로는 다시 재지 않음 — 메모리가 모자람(아래).
- 소리 글: 바뀐 글은 소개 글(소리 내지 않음) · 화면 글뿐. `content/` · `src/lib/lessonSpeechForm.ts` · `scripts/lib/spoken-texts.cjs` 가 읽는 것 0 변경, 장 듣기의 소리 글 만드는 줄(`ChapterAudioBar.tsx` 114)은 그대로 → 클립 새로 만들 것 없음.

## 시험 방법(로컬) — 왜 이렇게 했나

- **같은 폴더에서 `next dev` 를 둘 띄울 수 없었음**: 다른 일꾼의 개발 서버(3362, PID 8128)가 이 작업 트리를 잡고 있어 3363 으로 띄우면 'Another next dev server is already running' 으로 멈춤. 그래서 HEAD 를 `git archive` 로 scratchpad 에 풀고(node_modules 는 연결) 내 파일만 그 위에 덮어 **3363 에 따로** 띄움(Turbopack 이 바깥 연결을 거부해 `--webpack`). 끝난 뒤 서버를 끄고 사본은 지움(연결 먼저 끊고).
- 이 시험 서버에만 **시험용 `LICENSE_SECRET`**(진짜 비밀 아님)을 줘서, 그 값으로 만든 시험 쿠키(가짜 코드 'TEST-UI1007-FIXLIST', LIFE)로 서버 힌트를 켬. 브라우저 쪽 `/api/license/verify` 는 도구가 가짜로 '유효'(또는 403)를 답하고, 그 밖의 `/api/` 는 403 으로 막음(장 듣기 GET 만 통과) — 진짜 이용권 · R2 기록 · `.env.local` 에 닿지 않음.
- 도구: scratchpad `cap.cjs`(전 · 뒤 · 흉내) · `six.cjs`(6번) · `play.cjs`(8번 재생 중) — 저장소에 넣지 않음.
- 규칙 어김 1번: 첫 '전' 사진(cap before)을 남은 메모리 0.90GB 에서 띄움(규칙 1.2GB). 그 뒤는 모두 1.2GB 넘을 때까지 1분씩 기다림.

## 드라이버 · 점검 도구 영향

- 바꾸지 않은 것: '학습 진도율: N / T개 완료 (P%)'(모든 상태에서 있음 — 이용권 확인 중에도) · '전체 (N)' · '북마크 (N)' · '미완료 (N)' · 장 머리 `aria-expanded` · `id="section-N"` · `data-lesson-id` · `aria-label="진도"` · `aria-label="무료 체험"` · PASS-OFF '진도 확인 중…' · 잠긴 화면 표시 글(손대지 않음).
- 바뀐 글: 맨 위 단추 머리 '처음부터' → 경우에 따라 '다음 강의' · '마지막 강의'(scripts/ 에서 목록의 이 글을 읽는 도구 0 — grep), 장 듣기의 글 · `aria-label`('챕터 N 전체 파트 듣기' → 'N장 전체 듣기' 등 — 읽는 도구 0, `UI검토-1007/capture.cjs` 93줄의 '전체 듣기' · '×' 맞춤은 그대로 맞음).
- 새 표지: `data-license-pending`(확인 중 카드) · `data-chapter-audio`(장 듣기 줄) — 앞으로 도구가 쓸 수 있게.
- 이용권 사본으로 운영을 도는 드라이버: 쿠키가 있으면 목록 첫 그림이 '빈 자리'가 되고 확인 뒤에 그려짐 — 목록 글을 곧바로 읽는 도구는 확인이 끝날 때까지 기다려야 함(지금 도구들은 `load` 뒤 settle 을 두고 읽음).

## 안 한 것

- 2 · 3 · 5번(사장님 결정분)과 1 · 9번 — 다른 일꾼 몫.
- 운영 빌드(`next build` + `next start`)로 유출 탐침 · 사진 다시 재기 — 남은 메모리가 0.3~1.2GB 를 오가 다른 일꾼과 겹치면 위험해서. 배포 전에 운영 빌드로 `probe-bundle-leak-all` 을 한 번 더 돌려 inJs 0 인지 보기를 권함.
- 10번의 STUDENT · ADULT 장 잠금 '진도 확인 중' 같은 글은 넣지 않음(자리만 비움 — 지시의 '자리만 비움'). PASS-OFF 의 기존 '진도 확인 중…'은 그대로.
