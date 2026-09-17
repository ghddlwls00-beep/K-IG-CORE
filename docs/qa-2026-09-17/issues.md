# 이슈 등록부 — 전체 출시 감사 (운영 `c14c03d`, 2026-09-17)

작업자 = 점검자 = Claude (독립 검수 없음). 숫자는 `scripts/count-findings.cjs` → `out/findings-count.json` 에서 옴.

**형식:** 명령의 ISSUE REPORT FORMAT 16개 항목을 **High 이상은 이슈마다 전부** 적음. 같은 원인의 여러 위치는 한 이슈로 묶고 위치 목록은 상세 표(링크)에 둠. Medium·Low 는 과정·영역별 묶음 이슈로 적고, 항목별 기대/실제/수정/근거는 상세 표에 있음 (표의 열이 같은 항목을 담음).

**심각도 기준:** Critical = 유료 핵심 기능·결제 접근·진도·개인정보를 믿을 수 없게 만들거나 데이터 손실 / High = 유료 학습자가 틀린 것을 배우거나 채점·진행이 막힘, 매출·운영에 직접 손실 / Medium = 학습 품질·사용성 저하, 우회 가능 / Low = 표기·완성도.

**집계 (ID 기준, 2026-09-17 10:1x KST, `count-findings.cjs`):** **Critical 1** · High 44 · Medium 195 · Low 137 (LX-02 는 SEC-02 와 같은 문제라 1건 중복). 이슈 묶음: Critical ISS-00, High ISS-01~16.

| 상세 표 | High | Medium | Low |
|---|---|---|---|
| `content-review/grammar1.md` | 8 | 18 | 30 |
| `content-review/grammar2.md` | 8 | 23 | 14 |
| `content-review/student.md` | 9 | 21 | 3 |
| `content-review/listening.md` | 2 | 56 | 38 |
| `content-review/reading.md` (R 80 · RV 28) | 12 | 64 | 32 |
| `content-review/voca.md` | 1 | 6 | 6 |
| `phase2-admin.md` | 1 | 3 | 3 |
| `phase3-learner.md` | 1 | 0 | 1 |
| `phase8-security.md` | 2 | 2 | 4 |

---

## Critical

### ISS-00 READING 유료 지문 254개 전체(영어·한국어·어휘 카드)가 누구나 받는 공개 JS 파일에 들어 있음 — ✅ 로컬 수정 완료, 배포 대기

> **수정 (2026-09-17):** `readingUtils.ts` 의 중앙 사본 import 와 조회 함수 2개 삭제, `ReadingLearningView.tsx` 대체 조회 삭제 (512개 레슨 파일 모두 자기 데이터 보유 확인), 꺼진 자동 퀴즈 코드 안의 pr081 한국어 문장 직접 인용 제거. **검증:** 새 스크립트 `scripts/scan-build-static.cjs` — 빌드 결과물 `.next/static` 전체에서 유료 문자열 6,263개 검색: 수정 전 빌드 **2,403건** → 수정 후 **0건**. 배포 후 `probe-bundle-leak-scope.cjs` 로 운영 재측정 필요.
- **분류** 보안·유료 접근 통제 · **심각도** Critical · **접근** 이용권 없는 방문자 누구나
- **위치** `src/components/ReadingLearningView.tsx:13-14,208,264` → `src/lib/readingUtils.ts:2-3` 가 `src/lib/readingSentences.json`·`readingVocabulary.json`(1.19 MB, 256지문 전부)을 클라이언트 번들로 가져옴. 운영 청크 `/_next/static/immutable/chunks/1adakktlfv_xs.js` (923 KB)
- **재현 조건** 쿠키 없음, 아무 브라우저 · **단계** 1) 무료 레슨 `/reading/pr001` 열기 2) 개발자 도구 네트워크 탭에서 923 KB JS 파일 열기 (또는 HTML 의 `/_next/static/…js` 주소를 직접 요청) 3) 유료 pr100 의 `Some of their artificial mothers were ma…` 검색
- **기대** 유료 지문 본문은 이용권 쿠키가 확인된 서버 응답에만 존재 · **실제** 공개 정적 파일에 254개 유료 지문의 영어 1,404/1,423문장, 한국어 1,401/1,423문장, 어휘 카드 약 3,171/3,556장
- **영향** 사업: READING 과정 전체를 돈 내지 않고 볼 수 있음, 쉽게 긁어 가 재배포 가능 / 학습자 공정성 / 이전 감사의 KIG-001(서버 잠금) 목적을 우회
- **증거** `scripts/probe-bundle-content.cjs` → `out/bundle-content.json`, `scripts/probe-bundle-leak-scope.cjs` → `out/bundle-leak-scope.json` (2026-09-17 10:0x KST, 쿠키 없는 Node fetch). 다른 과정 GRAMMAR I 295·GRAMMAR II 247·LISTENING 822·STUDENT 244·VOCA 193 유료 문자열 모두 **0건**, `search-index.json` 0건
- **추정 원인** 레슨 파일에 데이터가 없을 때를 대비한 "중앙 사본" 대체 조회가 클라이언트 컴포넌트에 남음. 이전 잠금 검사(`probe-entitlement-all.cjs`)는 HTML·RSC 만 봐서 못 잡음
- **권장 해결** 클라이언트 컴포넌트에서 `readingUtils` 대체 조회 제거 (512개 레슨 파일 모두 자기 `readingSentences`·`readingVocabulary` 보유 — `dump-reading.cjs` 확인), 필요하면 서버 컴포넌트에서만 조회해 해당 레슨 것만 props 로 전달. 배포 후 옛 청크는 해시가 바뀌어 새 페이지에서 참조되지 않음 (CDN 캐시에 남은 옛 파일 주소는 소유자가 Vercel 에서 확인)
- **검증 방법** 빌드 산출물 `.next/static` 전체에서 유료 문장 검색 0건 + 배포 후 `probe-bundle-leak-scope.cjs` READING `passagesWithLeakedText: 0` + 레슨 화면 스윕 오류 0
- **확신도** 높음 (운영 파일에서 직접 문자열 확인)

---

## High

### ISS-01 GRAMMAR I 부가의문문 모범 답안이 틀림 (this→it, these→they, ain't I, 주어 불일치)
- **분류** 교육 내용 — 문법 오류 · **심각도** High · **접근** 유료 (일부 무료 없음)
- **위치** G1-09: gh1-014 #13, gh1-038 #5 #7 #17 #19, gh1-044 #80, gh1-046 #82 #100 #102, gh1-058 #12, gh1-078 #7, gh1-100 #118, gh1-108 #39, gh1-112 #110 / G1-17: gh1-038 #1 #9 #13, gh1-046 #84, gh1-036 #43, gh1-044 #70, gh1-058 #37, gh1-108 #57 / G1-26 gh1-046 #103 / G1-27 gh1-046 #111 (`content-review/grammar1.md`)
- **재현 조건** LIFE 또는 VIP 이용권, 데스크톱·모바일 동일
- **재현 단계** 1) `/grammar1/gh1-038` 열기 2) 영작 단계에서 #5 에 `This is a pen, isn't it?` 입력 3) 채점·모범 답안 보기
- **기대** `This is a pen, isn't it?` 가 정답, 모범 답안도 같음
- **실제** 모범 답안 `This is a pen, isn't this?`; 표준형은 모범과 달라 감점. `I am a boy, ain't I?` 를 모범으로 제시
- **영향** 학습: 부가의문문 단원 전체가 틀린 형태를 외우게 함 / 사용자: 맞게 쓰면 오답 처리 / 사업: 문법 교재 신뢰 하락·환불 사유
- **증거** 데이터 파일 원문 인용(상세 표), 채점 로직은 `verify-grammar-grading.cjs` 와 같은 방식
- **추정 원인** 교재(아카이브) 원문의 오류를 그대로 옮김
- **권장 해결** 모범 답안·다른 정답을 `it/they`, `aren't I`, 주어 일치로 수정, 영어 변경분 음성 클립 재생성
- **검증 방법** 수정 후 채점 검증 스크립트에 해당 문항 기대값 추가 (`isn't it` 정답 / `isn't this` 오답), `generate-azure-ava.mjs --dry-run` pending 0
- **확신도** 높음 (영어 문법 규칙, 교재와 무관)

### ISS-02 GRAMMAR I 문제-답안 데이터 손상 (어긋남·합쳐짐·메모 혼입)
- **분류** 데이터 손상 · **심각도** High · **접근** 유료
- **위치** G1-25 gh1-040 #26–#40 (15문항 답안이 다른 문장) · G1-20 gh1-032 #36–#39 (두 문항이 한 칸, #37 #39 답안 없음) · G1-33 gh1-068 #80 (조각 `Not each boy` 붙음) · G1-42 gh1-080 #6 (한국어 메모가 영어 답안 안에)
- **재현 조건** 이용권, 모든 폭 · **재현 단계** `/grammar1/gh1-040` → #26 에 한국어 문제 `너는 한국에 있지 않지?` 의 정답 `You are not in Korea, are you?` 입력 → 채점
- **기대** 정답 처리 · **실제** 모범 답안 `I love you, don't I?` → 오답, #37·#39 는 모범 답안 빈칸이라 채점 불가
- **영향** 학습자가 맞게 써도 0점, 틀린 답을 외움. 음성이 메모까지 읽음
- **증거** 데이터 원문 (상세 표) · **추정 원인** 교재 PDF → JSON 변환 때 행 밀림·병합
- **권장 해결** 상세 표의 수정 문장으로 교체, 음성 재생성 · **검증** 채점 스크립트에 각 문항 정답 입력 → exact · **확신도** 높음

### ISS-03 GRAMMAR I be동사 뜻을 "하다" 로 가르침 (G1-16)
- **분류** 사실 오류 · **심각도** High · **접근** 유료 · **위치** gh1-020 문법 확인 (2)
- **재현** `/grammar1/gh1-020` 문법 확인 단계 → 문제 `"이다, 있다, --하다"에 해당되는 영어 단어는?` 답 `am, is, are`
- **기대** be동사 = 이다·있다 · **실제** "하다" 포함 · **영향** 일반동사와 be동사 구분이라는 기초 개념 혼동
- **증거** 데이터 원문 · **원인** 교재 원문 · **해결** `--하다` 삭제 · **검증** 렌더링 텍스트 확인 · **확신도** 높음

### ISS-04 GRAMMAR II 모범 답안의 문법 오류와 잘린 문장
- **분류** 교육 내용 · **심각도** High · **접근** 유료
- **위치** G2-06 gh2-020 #21 `I remember to see you tomorrow.` · G2-23 잘린 문장 8개 (gh2-027 #12, gh2-045 #1, gh2-046 #3, gh2-048 #3 #9 #11, gh2-050 #9 #10) · G2-24 gh2-048 #15 `Should I have been…` · G2-25 gh2-048 #16 중복·잘림 · G2-26 gh2-036 #2 `To do his best, he could not succeed.` · G2-27 gh2-037 #3 목적어 누락 · G2-28 gh2-031 #11 `likes it to read fictions` · G2-29 gh2-028 #20 `Can you see me?`(알아보다 오역)
- **재현** 이용권 → 해당 레슨 → 영작 입력·모범 답안 보기 · **기대** 원어민 표준 영어의 완결 문장 · **실제** 비문·미완성 문장이 정답
- **영향** 가정법·동명사/부정사 핵심 단원에서 틀린 규칙 학습, 올바른 답이 오답 처리
- **증거** 상세 표 · **원인** 교재 원문 오류 + PDF 줄바꿈 잘림 · **해결** 상세 표 수정문, 음성 재생성 · **검증** 채점 스크립트 기대값 추가 · **확신도** 높음 (G2-23 잘린 뒷부분 일부는 한국어 원문 끝까지 확인 필요 — 중간)

### ISS-05 STUDENT 사실·문법 오류 (광복 연도, 분단 원인, 한글 창제 연도, 비문)
- **분류** 사실 오류·문법 · **심각도** High · **접근** 유료
- **위치** S-01 s17-3 #4 `In 1948, Korea was librated from Japan.` · S-02 s17-3 #6 분단을 전쟁의 결과로 서술 · S-03 s19-4 #6 한글 1420년 · S-04 s19-4 #3 `they Chinese characters` · S-15 s2-4 #1 `my sister and I` (목적격) · S-16 s3-3 #3–#5 He/She 문장 동사 누락·성별 고정
- **재현** 이용권 → `/student/s17-3` 받아쓰기·섀도잉 문장 확인 · **기대** 1945년 광복 · **실제** 1948년
- **영향** 한국 학생이 자국사 사실을 틀리게 영어로 외움 — 신뢰·평판 위험 큼
- **증거** 상세 표 (Britannica 근거 링크) · **원인** 교재 원문 오류 · **해결** 상세 표 수정문 + 청크·음성 재생성 · **검증** 렌더링 텍스트·클립 존재 확인 · **확신도** 높음

### ISS-06 STUDENT s19-3 레슨에 받아쓰기 문장이 하나도 없음 (S-05)
- **분류** 데이터 손상 · **심각도** High · **접근** 유료 · **위치** `content/lessons/student/s19-3.json`
- **재현** 이용권 → `/student/s19-3` → 탭 딕테이션 · **기대** 문장별 받아쓰기 · **실제** 영어 문장 0개, `PASS-OFF FOR STUDENT` 자리표시자·제목 잔재
- **영향** 유료 레슨 하나가 학습 불가 · **원인** 변환 누락 · **해결** 상세 표의 영어 4문장 복원 + 음성 · **검증** 스윕 렌더링에서 딕테이션 단계 문장 수 > 0 · **확신도** 높음

### ISS-07 STUDENT 청크 연습이 다른 레슨 문장을 연습시킴·한영 뒤섞임 (S-06, S-07)
- **분류** 데이터 어긋남 · **심각도** High · **접근** 유료 (s1-4 등 일부는 무료 챕터 1 이지만 s1-1·s1-2 만 무료라 해당 레슨은 유료)
- **위치** 청크 일치율 0–31% 레슨 14개 (s1-4 s1-5 s1-6 s4-2 s4-6 s5-5 s7-3 s8-2 s9-1 s9-2 s11-1 s11-3 s11-4 s12-3), `TV` 분할 손상 s8-4 s9-3 s16-1 s11-3
- **재현** 이용권 → `/student/s1-4` 청크 연습 · **기대** 이 레슨 문장의 의미 단위 · **실제** 다음 레슨·없는 레슨 내용, 영어 칸에 한국어
- **영향** 학습 흐름 붕괴·혼란 · **증거** 일치율 계산 스크립트(scratchpad `drill-match.cjs`, 결과는 상세 표) · **원인** 청크 데이터가 다른 판본 기준 · **해결** 레슨 문장에서 재생성 후 일치율 100% 검사 · **검증** 같은 스크립트 0건 · **확신도** 높음

### ISS-08 LISTENING d109 받아쓰기 한 칸에 다음 회차 본문 10문장이 통째로 붙음 (L-42)
- **분류** 데이터 손상 · **심각도** High · **접근** 유료
- **위치** `content/ld_english_scripts.json` d109 #6
- **재현** 이용권 → `/ld/d109` → Step 2 탭-딕테이션 6번 · **기대** `Franklin also discovered ways…` 한 문장 · **실제** 그 뒤에 d110 본문 전체가 붙은 한 문단 (KO 는 첫 문장만)
- **영향** 그 문항은 풀 수 없고, 합성 음성·단어 타일도 한 문단 분량
- **증거** 데이터 원문 · **원인** 회차 경계 변환 오류 · **해결** 첫 문장만 남김, 클립 재생성 · **검증** 렌더링 텍스트·타일 수 확인 · **확신도** 높음
- **정정 (2026-09-17 09:xx):** 처음엔 L-64(원본 녹음에 있는 문장 34개가 대본에 없음)도 이 이슈에 묶어 "들리는 문장을 쓸 칸이 없다"고 적었으나, 운영 플레이어는 CNN 외 모든 과정에서 **원본 녹음을 틀지 않고 대본을 Azure 음성으로 읽음** (`src/lib/unifiedSpeech.ts:42-47`, `out/player-probe.json`). 그래서 L-64 는 **Medium (지문이 원문 일부를 잃어 앞뒤가 안 맞음)** 으로 낮춰 MED-L 묶음에 둠.

### ISS-09 READING 지문 데이터 손상 (주석·보기·발문 혼입, 순서 뒤섞임, 잘림) + 뜻 없는 문장
- **분류** 데이터 손상·사실 · **심각도** High · **접근** 유료 (pr001·pr002 제외)
- **위치** R-14 pr048 · R-21 pr056 · R-22 pr066 · R-23 pr067 · R-34 pr115 · R-47 pr164 · R-48 pr237 · R-49 pr246 · R-51 pr193 (연도 7904) · R-04 pr002 비문 · R-50 pr183 "하루 4분 달렸다"
- **재현** 이용권 → `/reading/pr237` → 본문·대조·음성 · **기대** 읽히는 순서의 완결 지문 · **실제** `*ligament: 인대`, `(a)`~`(e)`, 결론이 첫 문장
- **영향** 지문을 이해할 수 없고 영한 대조가 전부 어긋남, 음성이 주석·보기를 읽음
- **증거** `scripts/dump-reading.cjs` 덤프 원문 인용 · **원인** 시험지 PDF 그대로 변환 · **해결** 상세 표 · **검증** 재덤프 후 주석·보기 기호 검색 0건, 행 수 EN=KO · **확신도** 높음

### ISS-10 READING 어휘 카드: 문맥과 다른 뜻 213장, 뜻 없는 카드 69장, 스크립트 페이지 옛 뜻 510장, 품사 모순 1,020장+
- **분류** 교육 내용 · **심각도** High · **접근** 유료
- **위치** RV-01~RV-27, R-00 (`content-review/reading.md`)
- **재현** 이용권 → `/reading/pr024` 어휘 카드 → `firms` 뜻 보기 · **기대** 회사 · **실제** `확고한`; `/reading/pr087` `watching` → `시계`; `/reading/pr130` `boredom` → `boredom (핵심 어휘)`
- **영향** 학습자가 틀린 뜻을 외움 (카드 3,584장 중 약 6%)
- **증거** `scripts/dump-reading-vocab-context.cjs` (카드별 문맥), 324/328 단어가 레슨과 무관하게 같은 뜻 → 사전 첫 뜻 일괄 입력
- **원인** VOCA 사전 뜻을 문맥 확인 없이 복사 · **해결** 지문 문장 기준으로 뜻 재작성 (단어별 일괄 치환 금지), 스크립트 페이지·중앙 사본 동기화 · **검증** 재덤프 후 자리표시 0, R-00 불일치 0, 표본 아닌 전체 재대조 · **확신도** 높음

### ISS-11 VOCA 퀴즈·드릴이 `March`·`May`·`Miss` 를 다른 단어 뜻으로 채점, 대문자 단어 50칸은 퀴즈에서 빠짐
- **분류** 기능 (채점) · **심각도** High · **접근** mv1-02 **무료**, mv2-11·mv2-12 유료
- **위치** `src/lib/vocaUtils.ts:265,274,417` (소문자 조회) vs `PhonicsLearningView.tsx:94-102` (원형 조회)
- **재현** `/phonics/mv2-12` → STEP 2 액티브 인출 → `March` 문항 · **기대** 정답 `3월` · **실제** 정답 `행진하다; 행진` (코드상 확정, 출제 순서는 무작위)
- **영향** 달 이름 레슨 퀴즈가 틀린 뜻을 정답으로 강요, mv2-12 는 30칸 중 26칸이 퀴즈에서 빠짐
- **증거** `scripts/dump-voca.cjs` 대조 7건·50칸 · **원인** 조회 키 불일치 · **해결** 퀴즈·드릴도 `getMeaning` 사용 · **검증** 수정 후 스크립트 card≠quiz 0, dropped 0 · **확신도** 높음 (코드 경로 확정, 화면 재현은 무작위라 미실시)

### ISS-12 기간제 이용권이 코드를 다시 입력하면 기간이 새로 시작 (SEC-01) — ✅ 로컬 수정 완료, 배포 대기

> **소유자 결정 (2026-09-17):** 만료는 **첫 등록일 기준 고정**. 수정: 기록에 `firstActivatedAt` 저장 (옛 기록은 남아 있는 기기 중 가장 이른 등록일), 등록·재입력·새 기기 모두 그 날짜 기준 만료, 만료 뒤 재입력·새 기기 거부, 검증 API·레슨/음성/진도 잠금도 같은 날짜로 판단(예전 재입력으로 늦게 발급된 토큰도 잘림), 관리자 기기 초기화·환불 차단·기기 해제 때 시작일 보존, 브라우저 표시 만료일을 서버 값으로 맞춤. 검증 `scripts/verify-license-expiry.cjs` **14/14**, `tsc` 0, `pnpm build` 성공, `verify-speech-gate-rules.cjs` 13/13.
> **배포 시 영향:** 예전에 코드를 다시 넣어 기간이 늘어난 고객은 첫 등록일 기준으로 줄어듦. 이 수정 전에 관리자가 기기를 모두 초기화한 기간제 코드는 시작일 증거가 없어 **다음 등록 때부터** 기간이 시작됨 (되살릴 기록 없음).
- **분류** 상업·이용권 로직 · **심각도** High · **접근** 1M·1Y·STU1M·STU1Y 이용권 소지자
- **위치** `src/app/api/license/activate/route.ts:62-69`, `src/lib/deviceStorage.ts:255-305`
- **재현 조건** 1개월권 코드, 등록 기기 · **단계** 1) 코드 등록 (만료 D+30) 2) 30일 후 같은 기기에서 같은 코드 다시 입력
- **기대** "이용 기간 만료" · **실제** 코드상 새 토큰 만료 D'+30 발급
- **영향** 기간제 상품이 무기한이 됨 → 매출 손실
- **증거** 코드 인용 · **원인** 최초 등록·만료 시각을 기록에 저장하지 않음 · **해결** 최초 등록 시각 저장 후 만료 고정 — **기존 구매자 기간에 영향, 소유자 결정 필요** · **검증** 단위 시험(시각 주입) + 소유자 발급 테스트 코드로 재등록 시 `expiresAt` 불변 확인 · **확신도** 높음 (코드), 운영 재현 **Read-only verification required**

### ISS-13 iPhone Safari 7일 미사용 시 이용권·기기 ID 삭제 → 재등록마다 기기 칸 소모 (SEC-02, LX-02)
- **분류** 운영·사용성 · **심각도** High · **접근** 모든 iPhone/iPad Safari 학습자
- **위치** `src/lib/device.ts:22-30`, `LicenseProvider.tsx:104`, 기기 한도 `deviceStorage.ts:29`
- **재현 조건** iPhone Safari, 사이트를 7일 이상 사용 안 함 · **단계** 1) 등록 2) 7일간 Safari 로 다른 사이트만 사용 3) 재방문 → 이용권 없음 → 코드 재입력 (새 기기 ID) 4) 한 번 더 반복
- **기대** 같은 기기로 인식 · **실제** 두 번째 반복에서 "최대 기기 수 초과"
- **영향** 방학 후 복귀 학습자 대량 문의·환불 위험, 관리자 수동 처리 (ISS-14 때문에 다른 PC 에선 처리도 어려움)
- **증거** WebKit 공식 문서 https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (2026-09-17 열람) + 코드 · **원인** 식별 정보를 localStorage 에만 저장 · **해결** httpOnly 쿠키에 기기 ID 보관·복원, 또는 가장 오래된 기기 자가 교체 · **검증** 쿠키만 남긴 상태(localStorage 삭제)에서 재방문 시 같은 기기 ID 로 인식 — 브라우저 시험 · **확신도** 중간~높음 (실제 7일 경과 iPhone 시험 없음)

### ISS-14 관리자 목록이 발급한 브라우저의 기록만 보여 줌, 검색 없음 (ADM-01)
- **분류** 관리자·운영 · **심각도** High · **접근** 관리자
- **위치** `src/app/admin/license/page.tsx:715-721` (`history` = localStorage `kig:admin:history`)
- **재현** 다른 브라우저에서 관리자 로그인 → `/admin/license` · **기대** 발급된 모든 이용권 목록·검색 · **실제** "아직 발급된 내역이 없습니다" (운영에서 이 창 그대로 확인)
- **영향** 환불 고객 차단·기기 초기화·진도 조회를 할 수 없음 → 환불 후에도 계속 사용 가능
- **증거** 운영 화면 `find` 결과, 코드 · **원인** 발급 기록을 서버가 아닌 브라우저에 저장 · **해결** `license/status` 서버 기록으로 목록 구성 + 코드 검색 + 메모 서버 저장 · **검증** 새 프로필 관리자 로그인 시 기존 코드 표시 · **확신도** 높음

### ISS-15 사이트에 이용권 구매 경로 없음 — "구매 링크 준비 중" (COM-04) — DEFERRED — OWNER
- **분류** 상업 · **심각도** High (출시 차단 수준) · **접근** 모든 방문자
- **위치** `LicenseModal.tsx:6-7,321-335`, 빌드 환경변수 `NEXT_PUBLIC_PURCHASE_URL` 미설정
- **재현** 이용권 없는 새 브라우저 → `/reading/pr100` → `🛒 구매 안내` · **기대** 구매처 링크 · **실제** "구매 링크 준비 중"
- **영향** 신규 방문자가 살 방법이 없음 · **증거** 새 프로필 모바일 폭 캡처 텍스트 (2026-09-17) · **원인** 환경변수 미설정 · **해결** 소유자가 구매처 URL 결정·설정 (결제·환경변수 영역이라 Claude 는 수정 안 함) · **검증** 같은 절차로 링크 표시·새 창 열림 · **확신도** 높음

### ISS-16 다크 모드에서 재생·주요 버튼의 글자·아이콘이 거의 안 보임 (UX-01)
- **분류** UX·접근성 · **심각도** High · **접근** 모든 방문자(무료·유료), 시스템 다크 모드
- **위치** `bg-ink` + `text-white` 26곳 — `src/components/AudioPlayer.tsx:231`(모든 레슨 큰 재생 버튼), `LdLearningView.tsx` 12곳, `PhonicsLearningView.tsx` 4곳, `LandingPage.tsx:290`, `error.tsx:53`, `not-found.tsx:42`, `LicenseModal.tsx:232`, `ReadingLearningView.tsx:833`, 관리자 4곳; 색 정의 `src/app/globals.css:45,71`
- **재현 조건** 휴대폰·PC 시스템 설정 다크 모드 · **단계** `/reading/pr001` 열기 → 재생 버튼 보기
- **기대** 버튼 아이콘·글자가 배경과 뚜렷이 구분 (4.5:1 이상) · **실제** 흰 아이콘 on `#F5F3EF` 미색 원, 1.11:1
- **영향** 학습 시작·재생·다음 단계 조작을 찾기 어려움 → 핵심 학습 흐름 방해
- **증거** `out/a11y-shots/play-dark.png` vs `play-light.png`, `home-dark-start.png`, `ld-dark-step.png`, `voca-dark-listen.png`, 계산된 색 `bg rgb(245,243,239) / fill rgb(255,255,255)`
- **추정 원인** 다크 테마에서 반전되는 `bg-ink` 에 반전되지 않는 `text-white` 를 짝지음 · **해결** `text-white` → `text-surface` (26곳), hover 색 `hover:bg-black/90` 도 다크에서 확인
- **검증** `scripts/a11y-templates.cjs` 다크 모드 대비 미달 0 (해당 버튼), 같은 캡처 재촬영 · **확신도** 높음

---

## Medium · Low — 영역별 묶음

| 묶음 | 건수 (M/L) | 대표 항목 | 상세 |
|---|---|---|---|
| MED-G1 GRAMMAR I | 18 / 30 | 비문법적 "다른 정답"(G1-41), 채점 기준 불일치, 오역, 표기 | `content-review/grammar1.md` |
| MED-G2 GRAMMAR II | 23 / 14 | Dallas 남부(G2-02), 로써/로서(G2-03), would/shall(G2-04·05) | `content-review/grammar2.md` |
| MED-S STUDENT | 21 / 3 | 이순신 사실(S-08), 개요 페이지 s1–s5 목록 미노출·제목 불일치 | `content-review/student.md` |
| MED-L LISTENING | 56 / 38 | 전사 오류(Lite·Wilbur·Iditarod 등), 숫자 표기, 낡은 사실(L-27·49), **불쾌 표현**(L-74·84 freaks·minstrel·primitive tribes), 힌트-답 이름 불일치(L-00a) | `content-review/listening.md`, `listening-status.md` (PASS 64/FAIL 212) |
| MED-R READING 지문 | 64 / 32 | 영한 정렬 어긋남 다수, 오역(뜻 반대), 낡은 전망(2010·2025), 정치·고정관념 지문(R-64 노무현·차베스, R-65 식사법), 중복 지문 8쌍(R-01), 사실(재향군인병·마라톤·Purloined Letter·안락사법) | `content-review/reading.md` |
| MED-RV READING 어휘 | (ISS-10 에 포함) | | `content-review/reading.md` §어휘 카드 |
| MED-V VOCA | 6 / 6 | mv2-12 달 이름 반복(V-03), 같은 뜻 짝 드릴 채점(V-04), 철자 오류 6(V-05), `apparently` 분명히(V-06), 다의어 첫 뜻 누락(V-07) | `content-review/voca.md`, `voca-status.md` (PASS 102 · NOTE 42 · FAIL 51) |
| MED-ADM 관리자 | 3 / 3 | 테스트 등록이 고객 칸 차지(ADM-02), 한도·해금 드롭다운 즉시 저장(ADM-03·04), 81강 표기(ADM-05) | `phase2-admin.md` |
| MED-SEC 보안 | 2 / 4 | 기기 초기화 후 verify 불일치(SEC-03), CSP unsafe-inline(SEC-05), 메모리 요청 제한(SEC-07), 토큰 없이 기기 해제(SEC-04) | `phase8-security.md` |
| MED-UX 접근성 | 1 / 4 | 음성 플레이어 문장 점 버튼 1~5px 누를 수 없음(UX-05), 금색 작은 글자(UX-02), `🔁` 이름(UX-03), 17~21px 칩(UX-06) | `phase6-ux-a11y.md` |
| MED-PERF 성능 | 1 / 2 | 이용권 학습자 탭마다 자동 새로고침 — 4G 최종 화면 4.4~4.9 s(무이용권 2.0~3.0 s), 느린 3G 8.6~10.4 s(PERF-01, 원인 SEC-08) / READING JS 2배(PERF-02), 목록 TBT 434 ms(PERF-03) | `phase7-performance.md` |
| MED-F 기능 | 0 / 2 | 죽은 음성 주소 5건(F-01, 화면 영향 없음), 재생 안 되는 원본 녹음 3,187개 저장(F-02) | `phase4-functional.md` |
| 저작권 (현대 저작물 발췌: Russell·Auster·Adler·Diamond·Fulghum) | — | R-29·R-43·R-75 | **DEFERRED — OWNER/LAWYER** |

## DEFERRED — OWNER/LAWYER (소유자 지시로 이번 작업에서 수정 안 함)

법률 문서(개인정보처리방침·이용약관·쿠키 안내 404), 새 결제창·구매처(ISS-15), 관리자 2차 인증·PIN 정책(phase8 §3), 환불 규정, 현대 저작물 이용 허락.
