# GRAMMAR II — 내용 점검 (전 문항 읽기)

원본: `out/content/grammar2.tsv` (796문항). 기준·심각도는 grammar1.md 와 같음.

> **✅ 수정 상태 (2026-09-17, 로컬 수정·검증, 배포 `619003e`):** G2-01~G2-45 **전부** `scripts/apply-grammar2.cjs` 로 반영 (63파일 131곳). G2-23 잘린 문장은 저장소 어디에도 뒷부분 원문이 없어(레슨 파일·09-15 증거 모두 같은 곳에서 잘림) 한국어 문제가 온전한 것은 한국어대로, 한국어도 잘린 3개는 문맥으로 복원: gh2-027 #12 `…but I am sure he will get better grades next year.`, gh2-050 #9 `…convene the summit in Washington.`(한국어에 워싱턴), gh2-050 #10 `…failing to prevent the spread of HIV among hemophiliacs.`(같은 단원 gh2-048 #11 의 일본 오염 혈액 사건). G2-35 성범죄 예문은 `I remember the girl he helped.` 로 교체. 유지 2건: G2-17 gh2-016 #27 `I want anything sweet.`(anything+형용사 = "달콤한 거면 뭐든", 한국어 뜻과 맞음), G2-43 gh2-032 #2 `I think it the best way to success to work hard.`(단원이 가르치는 가목적어 구문, 평이한 형태는 이미 다른 정답). **검증:** `dump-grammar.cjs` GRAMMAR II 기계 검사 전부 0 (괄호 짝 7→0, 물음표 불일치 1→0, 마침표 뒤 공백 3→0), `scripts/verify-grammar2-fixes.cjs` **76/76** (실제 채점기로 표준 답 만점·옛 비문 비만점 + 전 페이지 검사), `verify-grammar-grading.cjs` 36/36, 음성 115개 (버킷 44,989, pending 0).

## 발견 사항

| ID | 위치 | 심각도 | 분류 | 현재 | 문제 | 고칠 방향 |
|---|---|---|---|---|---|---|
| G2-01 | gh2-007 #7, gh2-013 #7, gh2-016 #14 EN | Low | 표기 | `I can not do this.` `I can not solve` `he can not buy it` | 표준 표기는 `cannot` (채점은 둘 다 인정하도록 이미 수정됨, 화면 모범만 비표준) | `cannot` |
| G2-02 | gh2-011 #15 | **Medium** | 사실 오류 | KO `남쪽 텍사스 도시 달라스` / EN `the southern Texas city of Dallas` | 댈러스는 텍사스 **북부**(North Texas) 도시 | `the northern Texas city of Dallas` / `북부 텍사스 도시 댈러스` (근거: https://en.wikipedia.org/wiki/Dallas — "in North Texas", 2026-09-17 확인) |
| G2-03 | gh2-013 #3 #5, gh2-018 #8 KO | **Medium** | 한국어 문법 | `기독교인으로써` `군인으로써` `수상으로써` | 자격·신분은 **로서**, 수단·도구가 로써. "as(자격)" 을 가르치는 문항인데 조사가 틀림 | `기독교인으로서` `군인으로서` `수상으로서` |
| G2-04 | gh2-013 #13 EN | **Medium** | 조동사 용법 | KO `내일 날씨가 좋을 것이다.` / EN `It would be fine tomorrow.` | 단순 미래 예측에 `would` 는 틀림(조건·간접화법 맥락 없음) | `It will be fine tomorrow.` |
| G2-05 | gh2-013 #15 EN | **Medium** | 조동사 용법 | `He shall be fifteen tomorrow.` | 3인칭 단순미래에 `shall` 은 고어·비표준 (현대 영어는 의지·규정에만) | `He will be fifteen tomorrow.` |
| G2-06 | gh2-020 #21 | **High** | 문법 오류 (핵심 개념) | KO `나는 내일 너를 볼 것을 기억한다.` / EN `I remember to see you tomorrow.` | 바로 앞 #20 `remember seeing`(과거 기억)과 대비시키는 문항인데, `remember to V` 는 "잊지 않고 ~하다" 라 **이 문장은 비문**. 동명사/부정사 대비라는 핵심 개념을 틀린 예문으로 가르침 | EN `I will remember to see you tomorrow.` / KO `나는 내일 잊지 않고 너를 만날 것이다.` |
| G2-07 | gh2-017 #13 | **Medium** | 문법(부분부정) | KO `둘 다 좋지는 않다.` / EN `Both are not good.` | 전체부정("둘 다 안 좋다")으로도 읽혀 모호 (G1-13 과 같은 문제) | `Not both are good.` 대신 표준형 `They are not both good.` / `Not both of them are good.` |
| G2-08 | gh2-017 #15 | Low | 번역 | KO `어느 것이나 좋다.` / EN `Anything is good.` | 둘(both/neither) 대비 문항 사이에 있어 `Either is good.` 가 기대되는 답. 쓰면 오답 | 다른 정답 `Either is good.` |
| G2-09 | gh2-018 #14 EN | Low | 어휘 | `The plant grows up fast.` | `grow up` 은 사람이 "자라다/어른이 되다". 식물은 `grows fast` | `The plant grows fast.` |
| G2-10 | gh2-024 #4 KO | **Medium** | 데이터 손상 | `만일 내가 한국 관습에 대하여 몇 가지 질문을 한다면 당신은` | 한국어 문제가 **중간에 잘림** | `…질문을 한다면 괜찮으시겠습니까?` + EN `…if I asked…` |
| G2-11 | gh2-024 #5 EN | **Medium** | 표기·응답 | `No, I don t. Go ahead.` | 아포스트로피 누락(`don t`) → 맞게 쓴 `don't` 가 감점. 또 `Would you mind…?` 에 대한 자연스러운 답은 `No, not at all.` | `No, not at all. Go ahead.` + 다른 정답 `No, I don't mind. Go ahead.` |
| G2-12 | gh2-024 #22 EN | **Medium** | 격식·채점 | `We are gonna have a three-day weekend.` | 구어 `gonna` 가 모범 답안. `going to` 로 쓰면 감점 | `We are going to have…` + 다른 정답 `gonna` |
| G2-13 | gh2-025 #2 EN | **Medium** | 오타 | `…studied at a library bynight.` | `by night` 붙어 있음 → 맞게 쓰면 감점, 음성도 `bynight` | `by night` |
| G2-14 | gh2-025 #9 EN | **Medium** | 문법 오류 | `He sounded alarm.` | 관사 누락: `sound the alarm` | `He sounded the alarm.` |
| G2-15 | gh2-025 #10 EN | **Medium** | 문법 오류 | `Don't take it personal.` | 부사여야 함: `take it personally` | `Don't take it personally.` |
| G2-16 | gh2-009 #11, #17 EN | Low | 자연스러움 | `On my arriving home, …` / `I used to major in architecture but I dropped it for I was not good at it.` | 고어체·어색 (`used to major`) | 다른 정답 `As soon as I arrived home, …` / `I once majored in architecture, but I dropped it because I wasn't good at it.` |
| G2-17 | gh2-016 #25 #27 #36, gh2-018 #12, gh2-021 #12 #13 #22 EN | Low | 자연스러움 | `I didn't see any person.` `I want anything sweet.` `He felt tired, still he continued` `You've changed much` `I must make you an apology.` `make you amends` `I felt myself guilty.` | 비문은 아니나 어색·고어 | 다른 정답 `I didn't see anyone.` `…tired; still, he…` `…changed a lot…` `I owe you an apology.` `…make amends to you…` `I felt guilty.` |
| G2-18 | gh2-013 #23, gh2-017 #4 | Low | 답안 보강 | `You need not study English.` / `He just arrived.` | 흔한 형태 `You don't need to study English.` `He has just arrived.` 가 오답 처리 | 다른 정답 추가 |
| G2-19 | gh2-010 #4 EN | Low | 수 | `control over his emotion` | 보통 복수 `emotions` | |
| G2-20 | gh2-019 #4 KO | Low | 부적절한 주석 | `미소 지었다(가슴 두근거리겠다).` | 문장 뜻과 무관한 농담성 괄호 | 괄호 삭제 |
| G2-21 | 한국어 표기 (gh2-010 #2 #4 마침표, gh2-013 #6, gh2-016 #9 #10 #15 #19 `있을 것이 다` `주시겠어 요` `없 었다` `범 법자`, gh2-019 #9 `어제 밤늦게` #19 `안된다`, gh2-022 #16 괄호, gh2-023 #12, gh2-024 #7 `안들 립니다` #21 `이 해에`) | Low | 맞춤법·띄어쓰기 | | PDF 줄바꿈이 띄어쓰기로 남음 등 | 붙여 쓰기·`어젯밤`·`안 된다`·`올해` |
| G2-22 | gh2-011 #9 `travelled`, gh2-015 #5 `theatre`, gh2-019 #26 `rumour`, gh2-011 #20 `drunken driving`, gh2-015 #2 `in the subway`, gh2-023 #17 `new year's` | Low | 철자·표현 | | 영국식 철자가 섞여 미국식으로 쓰면 감점, `drunk driving` `on the subway` `New Year's` 가 표준 | 다른 정답 추가·대문자 |
| G2-23 | gh2-027 #12, gh2-045 #1, gh2-046 #3, gh2-048 #3 #9 #11, gh2-050 #9 #10 | **High** | 데이터 손상 (문장 잘림) | `He got a "C" average on his report card but I am sure` / `The exact time when the murder had been committed was` / `…so that I can meet` / `If I had known your phone number,.` / `If they had had the ability to make money,.` / `If the blood products had been heat treated,.` / `…convene the summit in` / `…failing to prevent the` | 교재 PDF 줄바꿈에서 **문장 뒷부분이 잘림** (8문항, 일부는 한국어도 잘림). 가정법 주절이 통째로 없어 가정법 단원의 핵심 문장이 미완성. 채점·음성 모두 잘린 문장 기준 | 완결 문장 복원: `…but I am sure he will get better grades next year.` / `…was never discovered.` / `…so that I can meet you at the station.` / `…, I would have called you.` / `…, they would have had food and clothing.` / `…, they could not have been infected with HIV.` / `…in Washington.` / `…failing to prevent the …` (한국어 원문 끝까지 확인 후) |
| G2-24 | gh2-048 #15 EN | **High** | 문법 오류 (가정법 도치) | `Should I have been three minutes late, I should have missed the train.` | 과거 반대 가정의 도치는 `Had I been …`. `Should I have been` 은 비문 — **가정법 단원 모범 답안이 비문** | `Had I been three minutes late, I would have missed the train.` (다른 정답 `If I had been …`) |
| G2-25 | gh2-048 #16 EN | **High** | 데이터 손상 | `Should you not go, he would go. he would go.` / 다른 정답 `If you should not go,.` | 주절 중복, 다른 정답은 잘림 | `Should you not go, he would go.` / `If you should not go, he would go.` |
| G2-26 | gh2-036 #2 | **High** | 문법 오류 | KO `그의 최선을 다했지만 그는 성공할 수 없었다.` / EN `To do his best, he could not succeed.` | `To do his best` 는 양보("~했지만") 의미가 없음 — 원어민 영어에서 쓰지 않는 형태를 모범으로 가르침 | `Though he did his best, he could not succeed.` |
| G2-27 | gh2-037 #3 EN | **High** | 문법 오류 | `This is so heavy that I can not carry.` | so…that 절 안에서 `carry` 의 목적어 `it` 필수 | `This is so heavy that I cannot carry it.` |
| G2-28 | gh2-031 #11 EN | **High** | 문법 오류 | `He likes it very much to read fictions.` | `like it to V` 구조는 비표준, `fiction` 은 불가산 | `He likes reading fiction very much.` (또는 `He likes to read fiction very much.`) |
| G2-29 | gh2-028 #20 | **High** | 오역 | KO `당신은 저를 알아보시겠습니까?` / EN `Can you see me?` | `Can you see me?` 는 "내가 (눈에) 보이니?" — 뜻이 다름 | `Do you recognize me?` |
| G2-30 | gh2-029 #12 다른 정답 | **Medium** | 답안 데이터 | KO `당신은 틀린(올바른) 번호를…(전화 잘못 거셨습니다.)` / 다른 정답 `You have the right number.` | 괄호를 대안으로 풀어 **정반대 뜻** 문장이 만점 처리 | 다른 정답 삭제, KO 괄호 `(올바른)` 삭제 |
| G2-31 | gh2-031 #1, gh2-047 #10 EN | **Medium** | 오타 | `across theArctic Ocean`, `More than 24seamen` | 띄어쓰기 누락 → 채점 감점·음성 오독 | `the Arctic Ocean`, `24 seamen` |
| G2-32 | gh2-033 #14 EN | **Medium** | 문법 오류 | `I thought I had no choice but step on it.` | `no choice but to V` | 모범을 `…but to step on it.` 로 (다른 정답에만 있음) |
| G2-33 | gh2-048 #10 EN | **Medium** | 조동사 | `He should be in high school now if he had not flunked a grade.` | 혼합가정법 주절은 `would` (3인칭에 should 는 뜻이 "~해야 한다") | `He would be in high school now if he had not flunked a grade.` |
| G2-34 | gh2-050 #7 #8 | **Medium** | 사실 오류 | `Alexander conquered most of Europe.` | 알렉산드로스는 페르시아·이집트·인도 서부까지 정복했지 **유럽 대부분을 정복하지 않음** | `Alexander conquered the Persian Empire.` (근거: https://www.britannica.com/biography/Alexander-the-Great, 2026-09-17 확인) |
| G2-35 | gh2-039 #9 | **Medium** | 부적절한 예문 | KO `나는 그가 강간한 그 소녀를 동정한다.` / EN `I sympathize with the girl he raped.` | 문법 예문에 성범죄 소재 — 학생(STUDENT 과정 수강생 포함)에게 부적절 | 목적격 관계대명사 생략을 보여주는 중립적 예문으로 교체 (예: `I remember the girl he helped.`) |
| G2-36 | gh2-039 #8 KO | **Medium** | 띄어쓰기로 뜻 바뀜 | `이것이 내가 어제 산책이다.` | `산 책` 이 `산책(walk)` 으로 읽힘 | `이것이 내가 어제 산 책이다.` |
| G2-37 | gh2-038 #6 | **Medium** | 번역 불일치 | KO `그는 정확한 것을 자랑스러워한다.` / EN `He is proud of being punctual.` | punctual 은 "시간을 잘 지키는". "정확한"으로 번역하면 `accurate` 로 쓰게 됨 | KO `그는 시간을 잘 지키는 것을 자랑스러워한다.` |
| G2-38 | gh2-042 #8 KO, gh2-046 #7 KO | **Medium** | 데이터 손상 | `…기조 연설가 수전이 이전` (잘림) / `마찬가지.` | 번역할 한국어 문제가 불완전하거나 없음 | 완결 문장 / #6 과 같은 한국어 |
| G2-39 | gh2-042 #9 EN | **Medium** | 문법 오류 | `who will reach there first` | `reach` 타동사 — `get there first` | `The question is who will get there first.` |
| G2-40 | gh2-027 #2 #3 | **Medium** | 격식·채점 | `Are you gonna breast feed…` `I am gonna bottle feed…` | G2-12 와 같음 + `breast-feed` `bottle-feed` 하이픈 | `going to breast-feed` / `bottle-feed` |
| G2-41 | gh2-037 #16 다른 정답 | **Medium** | 답안 데이터 | `I had a little a few alterations made.` | 비문 대안 | `I had a few alterations made.` |
| G2-42 | gh2-029 #10, gh2-045 #6 #7 | Low | 표기 | `Mr.Kim` | 공백 누락 | `Mr. Kim` |
| G2-43 | gh2-026 #4 `a real good buy`, gh2-028 #4 `I'm treating.`, gh2-030 #10 `too bad of him`, gh2-032 #2 `I think it the best way to success to work hard.`, gh2-034 #14 `a wrong place`, gh2-035 #11 `When you happen to`, #12 `you've got divorced`, gh2-045 #11 `It was last year when`, gh2-046 #10 `used to come here last year`, gh2-049 #10 | Low | 자연스러움 | | 비표준·어색 | `a really good buy` `It's my treat.` `cruel of him` `…is to work hard` `the wrong place` `If you happen to` `you got divorced` `It was last year that` `He used to come here.` `it was … for my graduation` |
| G2-44 | 한국어 표기 (gh2-026 #3 `출납계 원` #17 `배멀미`, gh2-027 #14, gh2-029 #3 `죠지` #13, gh2-032 #6 #7, gh2-033 #13 #17 `들렸습니다`, gh2-034 #5, gh2-039 #14, gh2-040 #7, gh2-041 #2, gh2-042 #4 #5 `로스 앤젤리스` #10 `미스테리`, gh2-044 #3 `컨서트` #4 `도울`, gh2-047 #13 #19 `쉬카고`) | Low | 맞춤법 | | | `출납계원` `뱃멀미` `조지` `들렀습니다` `로스앤젤레스` `미스터리` `콘서트` `돌` `시카고` |
| G2-45 | gh2-043 #15, gh2-045 #15, gh2-046 #14 EN 마침표 누락 / gh2-029 #1 `first name basis`, gh2-032 #15 `duty free`, gh2-036 #11 `40 minute`, gh2-038 #9 `Kyungsangdo` | Low | 표기 | | | `first-name` `duty-free` `40-minute` `Gyeongsang-do` |

## 레슨별 상태

| 레슨 | 문항 | 상태 | 이슈 |
|---|---|---|---|
| gh2-007 | 16 | FAIL | G2-01 |
| gh2-008 | 17 | PASS | |
| gh2-009 | 17 | FAIL | G2-16 |
| gh2-010 | 16 | FAIL | G2-19 G2-21 |
| gh2-011 | 20 | FAIL | G2-02 G2-22 |
| gh2-012 | 18 | PASS | |
| gh2-013 | 23 | FAIL | G2-01 G2-03 G2-04 G2-05 G2-18 G2-21 |
| gh2-014 | 15 | PASS | |
| gh2-015 | 18 | FAIL | G2-22 |
| gh2-016 | 36 | FAIL | G2-01 G2-17 G2-21 |
| gh2-017 | 27 | FAIL | G2-07 G2-08 G2-18 |
| gh2-018 | 25 | FAIL | G2-03 G2-09 G2-17 |
| gh2-019 | 26 | FAIL | G2-20 G2-21 G2-22 |
| gh2-020 | 26 | FAIL | **G2-06** |
| gh2-021 | 23 | FAIL | G2-17 |
| gh2-022 | 22 | FAIL | G2-21 |
| gh2-023 | 20 | FAIL | G2-21 G2-22 |
| gh2-024 | 22 | FAIL | G2-10 G2-11 G2-12 G2-21 |
| gh2-025 | 20 | FAIL | G2-13 G2-14 G2-15 |
| gh2-026 | 18 | FAIL | G2-43 G2-44 |
| gh2-027 | 16 | FAIL | **G2-23** G2-40 G2-44 |
| gh2-028 | 26 | FAIL | **G2-29** G2-43 |
| gh2-029 | 19 | FAIL | G2-30 G2-42 G2-44 G2-45 |
| gh2-030 | 16 | FAIL | G2-43 |
| gh2-031 | 16 | FAIL | **G2-28** G2-31 |
| gh2-032 | 16 | FAIL | G2-43 G2-44 G2-45 |
| gh2-033 | 17 | FAIL | G2-32 G2-44 |
| gh2-034 | 15 | FAIL | G2-43 G2-44 |
| gh2-035 | 12 | FAIL | G2-43 |
| gh2-036 | 15 | FAIL | **G2-26** G2-45 |
| gh2-037 | 18 | FAIL | **G2-27** G2-41 |
| gh2-038 | 19 | FAIL | G2-37 G2-45 |
| gh2-039 | 14 | FAIL | G2-35 G2-36 G2-44 |
| gh2-040 | 10 | FAIL | G2-44 G2-22 |
| gh2-041 | 15 | FAIL | G2-44 |
| gh2-042 | 12 | FAIL | G2-38 G2-39 G2-44 |
| gh2-043 | 15 | FAIL | G2-45 |
| gh2-044 | 12 | FAIL | G2-44 |
| gh2-045 | 15 | FAIL | **G2-23** G2-42 G2-43 G2-45 |
| gh2-046 | 14 | FAIL | **G2-23** G2-38 G2-43 G2-45 |
| gh2-047 | 19 | FAIL | G2-31 G2-44 |
| gh2-048 | 16 | FAIL | **G2-23 G2-24 G2-25** G2-33 |
| gh2-049 | 14 | FAIL | G2-43 |
| gh2-050 | 10 | FAIL | **G2-23** G2-34 |
