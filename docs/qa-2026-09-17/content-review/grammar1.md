# GRAMMAR I — 내용 점검 (전 문항 읽기)

원본: `out/content/grammar1.tsv` (`scripts/dump-grammar.cjs`, 1,611문항 + 문법 확인 문제).
기준: 교재가 아니라 **실제로 맞는지** (소유자 지시). 화면 표시는 `cleanText` 가 앞 번호 `1.` 을 지우고 `/` 를 공백으로 바꿈.
심각도: Critical 틀린 것을 가르침 · High 핵심 개념 왜곡/채점 불가 · Medium 혼란·부당 채점 · Low 표기.

## 레슨별 상태

| 레슨(한/영) | 문항 | 상태 | 이슈 |
|---|---|---|---|
| gh1-006 / 007 | 42 | FAIL | G1-01 G1-02 |
| gh1-008 / 009 | 42 | FAIL | G1-03 G1-04 G1-05 (#3 마침표·#25 girl friend 는 소유자 결정으로 유지) |
| gh1-010 / 011 | 46 | FAIL | G1-06 |
| gh1-012 / 013 | 35 | FAIL | G1-07 |
| gh1-014 / 015 | 43 | FAIL | G1-08 G1-09 G1-10 G1-11 G1-12 |
| gh1-016 / 017 | 33 | FAIL | G1-13 G1-14 G1-15 |
| gh1-020 / 021 (문법 확인) | 8 | FAIL | G1-16 G1-17 |
| gh1-022 / 023 | 25 | FAIL | G1-18 |
| gh1-024 / 025 | 25 | FAIL | G1-17 |
| gh1-026 / 027 | 25 | PASS | |
| gh1-028 / 029 | 25 | PASS | |
| gh1-030 / 031 | 25 | PASS | |
| gh1-032 / 033 | 25 | FAIL | G1-20 |
| gh1-034 / 035 | 25 | PASS | |
| gh1-036 / 037 | 27 | FAIL | G1-17 G1-21 |
| gh1-038 / 039 | 25 | FAIL | G1-09 G1-17 G1-22 G1-23 |
| gh1-040 / 041 | 25 | FAIL | **G1-25** |
| gh1-042 / 043 | 40 | PASS | |
| gh1-044 / 045 | 40 | FAIL | G1-09 G1-17 G1-21 G1-23 |
| gh1-046 / 047 | 37 | FAIL | G1-09 G1-17 G1-23 G1-26 G1-27 |
| gh1-050 / 051 | 42 | FAIL | G1-28 |
| gh1-052 / 053 | 40 | FAIL | G1-29 |
| gh1-054 / 055 | 46 | PASS | |
| gh1-056 / 057 | 35 | FAIL | G1-02 |
| gh1-058 / 059 | 37 | FAIL | G1-09 G1-11 G1-17 |
| gh1-060 / 061 | 32 | FAIL | G1-13 G1-30 |
| gh1-062 / 063 | 26 | FAIL | G1-05 G1-07 G1-31 |
| gh1-064 / 065 | 27 | PASS | |
| gh1-066 / 067 | 25 | FAIL | G1-07 G1-32 |
| gh1-068 / 069 | 27 | FAIL | G1-07 G1-13 G1-33 G1-34 G1-35 G1-36 |
| gh1-072 / 073 | 14 | FAIL | G1-05 |
| gh1-074 / 075 | 29 | FAIL | G1-05 |
| gh1-076 / 077 | 28 | FAIL | G1-05 G1-06 |
| gh1-078 / 079 | 44 | FAIL | G1-07 G1-09 G1-35 G1-37 G1-38 G1-39 G1-40 |
| gh1-080 / 081 | 39 | FAIL | G1-41 G1-42 |
| gh1-082 / 083 | 32 | FAIL | G1-36 G1-43 G1-44 |
| gh1-084 / 085 | 31 | FAIL | G1-07 G1-41 |
| gh1-088 / 089 | 19 | FAIL | G1-41 |
| gh1-090 / 091 | 20 | FAIL | G1-41 G1-47 |
| gh1-092 / 093 | 19 | FAIL | G1-35 G1-36 G1-45 G1-46 G1-47 |
| gh1-094 / 095 | 19 | FAIL | G1-32 G1-41 G1-48 G1-58 |
| gh1-096 / 097 | 19 | FAIL | G1-13 G1-41 |
| gh1-098 / 099 | 19 | FAIL | G1-41 G1-53 G1-58 |
| gh1-100 / 101 | 19 | FAIL | G1-07 G1-09 G1-34 G1-49 G1-58 |
| gh1-102 / 103 | 19 | FAIL | G1-07 G1-55 G1-58 |
| gh1-106 / 107 | 35 | FAIL | G1-35 G1-56 G1-58 |
| gh1-108 / 109 | 35 | FAIL | G1-09 G1-17 G1-41 G1-58 |
| gh1-110 / 111 | 38 | FAIL | G1-07 G1-41 G1-52 G1-57 G1-58 |
| gh1-112 / 113 | 37 | FAIL | G1-07 G1-09 G1-58 |
| gh1-116 / 117 | 37 | FAIL | G1-07 G1-41 G1-51 G1-58 |
| gh1-118 / 119 | 37 | FAIL | G1-07 G1-34 G1-41 G1-58 |
| gh1-120 / 121 | 37 | FAIL | G1-07 G1-50 |
| gh1-122 / 123 | 38 | FAIL | G1-07 G1-44 G1-54 G1-57 |

## 발견 사항

| ID | 위치 | 심각도 | 분류 | 현재 | 문제 | 고칠 방향 |
|---|---|---|---|---|---|---|
| G1-01 | gh1-006 #5 KO | Low | 표기 | `우리(들은)는 학생(들)이다.` | 괄호가 조사까지 삼킴 | `우리(들)는 학생(들)이다.` |
| G1-02 | gh1-006 #3 KO, gh1-022 #13 KO | Low | 표기 | `당신은 미국인이다` | 마침표 누락 (다른 문항과 불일치) | 마침표 |
| G1-03 | gh1-008 #19 alternatives | **Medium** | 답안 데이터 | 다른 정답 = `family name: last name` | 문장이 아니라 **어휘 메모**가 "다른 정답"으로 화면에 표시되고 채점 기준으로도 쓰임 | alternatives 에서 제거 (필요하면 해설로) |
| G1-04 | gh1-008 #19 KO | Low | 번역 | `그녀의 성은 무엇이었니? (결혼하기 전의).` | maiden name 의미가 괄호로 뒤에 붙고 마침표 이중 | `결혼 전 그녀의 성은 무엇이었니?` |
| G1-05 | gh1-008 #16 #36 KO | Low | 표기 | `부유했니(부자였니?)`, `어땠니? (안녕하셨니)?` | 물음표 위치 | `부유했니? (부자였니?)` |
| G1-06 | gh1-010 #27 KO | Low | 번역 | `내가 너를 아니 (댁에서 나를 아세요?)` | `댁에서` 는 "당신 집에서" 로 읽힘, 물음표 누락 | `내가 너를 아니? (저를 아세요?)` |
| G1-07 | gh1-012 #35 KO | Low | 맞춤법 | `그는 무엇 이였니?` | `이였니` 는 틀린 표기 | `그는 무엇이었니?` |
| G1-08 | gh1-014 #11 alternatives | **Medium** | 답안 데이터 | 다른 정답 = `Which What book do you want?` | 비문이 "다른 정답"으로 표시되고 정답 처리됨 | `What book do you want?` |
| G1-09 | gh1-014 #13 EN | **High** | 문법 오류 | `This is your book. isn't this?` | 부가의문문은 대명사 `it` 으로 받음 (this/that → it). 마침표·소문자도 틀림. **틀린 부가의문문을 모범 답안으로 가르침** | `This is your book, isn't it?` |
| G1-10 | gh1-014 #23 | **Medium** | 답안-문제 불일치 | KO `그녀는 아름답지?` / EN `She looks beautiful, doesn't she?` | 한국어에 "~해 보인다" 가 없음. `She is beautiful, isn't she?` 라고 쓰면 오답 처리 | 모범 답안 `She is beautiful, isn't she?`, 기존 문장은 다른 정답 |
| G1-11 | gh1-014 #16 EN | Low | 자연스러움 | `He wants much money, doesn't he?` | 긍정문의 `much money` 는 어색 (현대 영어는 `a lot of`) | 다른 정답 `He wants a lot of money, doesn't he?` 추가 |
| G1-12 | gh1-014 #28 EN | Low | 의미 | `누구라도 (Anybody)그것을 좋아한다.` / `Anybody likes it.` | 긍정문 `Anybody likes it` 은 "아무나 좋아한다(누구든 좋아할 것)" 로 어색. 괄호 뒤 띄어쓰기 누락 | 한국어 `누구든 그것을 좋아한다.` 로 의미 명확화 |
| G1-13 | gh1-016 #5, #7 | **Medium** | 문법(부분부정) | `All boys do not receive a prize.` / `All of them didn't come.` | `All … not` 은 전체부정으로도 읽혀 모호함. 표준적인 부분부정은 `Not all boys receive a prize.` / `Not all of them came.` — 이렇게 쓰면 **오답 처리됨** | 모범 답안을 `Not all …` 로, 기존 문장은 다른 정답 |
| G1-14 | gh1-016 #32 EN | **Medium** | 표기·채점 | `How many days were you in the U. S. A?` | `U. S. A` 띄어쓰기·마침표 누락. `the USA?` / `the U.S.A.?` 로 쓰면 토큰이 달라 감점 | `… in the USA?` + 다른 정답 `the U.S.A.?` `the United States?` |
| G1-15 | gh1-016 #30 KO | Low | 표기 | `지불했니(누가 냈나?)` | 물음표 위치 | `지불했니? (누가 냈니?)` |
| G1-16 | gh1-020 문법 확인 (2) | **High** | 사실 오류 | `"이다, 있다, --하다"에 해당되는 영어 단어는? 답: am, is, are` | be동사는 "이다·있다" 이지 "하다" 가 아님. "하다" 는 일반동사 | 문제·답에서 `--하다` 삭제 |
| G1-17 | gh1-020 (8), gh1-024 #41 alternatives | **Medium** | 비표준 영어 | `isn't, aren't, ain't`, 다른 정답 `Ain't I a boy?` | `ain't` 는 비표준(구어·방언). 표준 축약은 `Aren't I a boy?` 인데 **이게 없어 오답 처리** | (8) 에서 `ain't` → `aren't I` 설명, #41 다른 정답을 `Aren't I a boy?` 로 |
| G1-18 | gh1-020 끝 | Low | 표기 | `…순서로 한다.“` | 끝에 짝 없는 따옴표 | 삭제 |
| G1-19 | (결번 — G1-17 에 통합) | — | — | — | — | — |
| G1-20 | gh1-032 #36–#39 | **High** | 데이터 손상 | EN #36 `Don't I love her? 37.This is mine.`, #37 **빈칸**, #38 `It is yours. 39.Those are theirs.`, #39 **빈칸** | 두 문항이 한 줄로 합쳐짐 → #37 #39 는 **모범 답안이 없어 채점 불가**, #36 #38 은 정답을 써도 길이 초과로 오답. 다른 정답도 같은 손상 | #36 `Don't I love her?` / #37 `This is mine.` / #38 `It is yours.` / #39 `They are theirs.` (KO `그들은`) + 다른 정답 `Those are theirs.` |
| G1-09 (추가 위치) | gh1-038 #5 #17, gh1-044 #80, gh1-058 #12 (`isn't this/that?`), gh1-038 #7 #19, gh1-046 #82 (`aren't these?`), gh1-046 #100 (`is this?`), #102 (`are these?`) | **High** | 문법 오류 | `This is a pen, isn't this?` `These are pens, aren't these?` | 부가의문문의 주어는 대명사: this/that → **it**, these/those → **they**. 과 전체가 부가의문문 훈련인데 틀린 형태가 모범 답안. 다른 정답 `are these not?` 도 같음 | `…, isn't it?` / `…, aren't they?` / `…, is it?` / `…, are they?` |
| G1-17 (추가 위치) | gh1-038 #1 #9 #13, gh1-046 #84 (`ain't I?`), gh1-036 #43, gh1-044 #70, gh1-058 #37 (다른 정답 `Ain't I …?`) | **High** | 비표준 영어 | `I am a boy, ain't I?` | 표준 부가의문문은 `I am a boy, **aren't I**?` — 표준형으로 쓰면 오답 처리되고, 비표준 `ain't` 를 모범으로 가르침 | 모범 답안 `aren't I?`, 다른 정답 `Aren't I studying English?` 등 |
| G1-21 | gh1-036 #49, gh1-044 #76 EN·다른 정답 | Low | 표기 | `Were you not studying English.` | 의문문 끝이 마침표 | `?` |
| G1-22 | gh1-038 #2 KO | Low | 데이터 | `너는 소녀이지? 3` | 다음 문항 번호가 붙어 들어옴 | 끝의 ` 3` 삭제 |
| G1-23 | gh1-038 #1–#9, gh1-044 #80, gh1-046 #81 다른 정답 | **Medium** | 답안 데이터 | 다른 정답 `I am a boy?` `This is a pen?` `It is a book?` | 부가의문문 훈련인데 부가의문문 없는 평서문+물음표를 **만점 처리** | 이 다른 정답들 삭제 |
| G1-25 | gh1-040 #26–#40 | **High** | 데이터 손상 (문제-답 어긋남) | KO #26 `너는 한국에 있지 않지?` ↔ EN #26 `I love you, don't I?` … KO #39 `너는 나의 누이를 사랑하지?` ↔ EN #39 `They don't love you, do they?` | **15문항**의 영어 모범 답안이 전혀 다른 문장. 학습자가 맞게 써도 0점, 틀린 답을 보고 외움. (#41–#50 은 맞음) | KO 에 맞춰 EN 재작성: #26 `You are not in Korea, are you?` #27 `He is not in Korea, is he?` #28 `She is not in Korea, is she?` #29 `I am not a boy, am I?` #30 `You are not a girl, are you?` #31 `He is not a boy, is he?` #32 `She is not a girl, is she?` #33 `This is not a pen, is it?` #34 `It is not a book, is it?` #35 `These are not pens, are they?` #36 `Those are not books, are they?` #37 `You are not happy, are you?` #38 `She is not happy, is she?` #39 `You love my sister, don't you?` #40 `He loves me, doesn't he?` |
| G1-26 | gh1-046 #103 EN | **High** | 문법 오류 | `Those are not book, are those?` | 복수 `books` 누락 + 부가의문문 주어 오류 | `Those are not books, are they?` |
| G1-27 | gh1-046 #111 EN | **High** | 문법 오류 | `He loves her sister, doesn't she?` | 주어 He 인데 `doesn't she` | `He loves her sister, doesn't he?` |
| G1-28 | gh1-050 #32 다른 정답 | **Medium** | 답안 데이터 | `Is it that mine?` | 비문이 다른 정답으로 표시·만점 처리 | `Is that mine?` |
| G1-29 | gh1-052 #17 KO, #39 KO | Low | 맞춤법 | `차가왔니?`, `아니 어제는` | `차가웠니?`, `아니, 어제는` | |
| G1-13 (추가 위치) | gh1-060 #31 `All of them don't like it.`, gh1-068 #79–#83 | **Medium** | 문법(부분부정) | | 같은 부분부정 모호성 | `Not all of them like it.` 등 |
| G1-30 | gh1-060 #7, #26 | Low | 답안 보강 | `He has more money than I.` / `Who loves you more than I?` | 격식체만 정답. 흔히 쓰는 `than I do` 는 다른 정답에 없음 | 다른 정답 `than I do` 추가 (`than me` 는 #26 에서 뜻이 달라지므로 #7 에만) |
| G1-31 | gh1-062 #11 | **Medium** | 답안-문제 불일치 | KO `오늘 따뜻한가?` / EN `Is it warm ?` | 한국어의 "오늘" 이 영어에 없음 → `Is it warm today?` 라고 쓰면 길이 초과로 감점·오답. 물음표 앞 공백 | `Is it warm today?` |
| G1-07 (추가 위치) | gh1-062 #18 KO `집이였니`, gh1-078 #13 #14 KO `어제 밤`, gh1-068 #104 KO `회수`, gh1-066 #56 KO `한사람`, gh1-084 #1 KO `있 다` | Low | 맞춤법 | | | `집이었니` `어젯밤` `횟수` `한 사람` `있다` |
| G1-32 | gh1-066 #76 #77 | Low | 답안 보강 | `Every boy received a prize, didn't he?` | 현대 영어는 `didn't they?` 가 더 흔함 — 없음 | 다른 정답 `didn't they?` |
| G1-33 | gh1-068 #80 EN | **High** | 데이터 손상 | `Each boy didn't receive a prize, did he? Not each boy` | 모범 답안 끝에 **조각 문장 `Not each boy`** 가 붙어 화면에 그대로 나오고, 맞게 써도 길이 초과로 오답 | `Not every boy received a prize, did he?` (each 는 부분부정에 쓰지 않음) + KO 괄호 `(every)` |
| G1-34 | gh1-068 #82 #83 EN | **Medium** | 답안 데이터 | `All of them don't come. Not all of them come.` | **두 문장이 한 답안 칸에** 들어 있어 어느 하나만 쓰면 오답 | 모범 `Not all of them come.` / 다른 정답 `All of them don't come.` (#83 도 같게) |
| G1-35 | gh1-068 #95, gh1-078 #30, gh1-092 #55 EN | Low | 표기 | `You paid for lunch didn't you?` `You met someone. didn't you?` `this month. doesn't it?` | 부가의문문 앞 쉼표 | `…, didn't you?` |
| G1-36 | gh1-068 instr, gh1-082 instr | Low | 데이터 | `Page 068]` | 추출 잔재 | 삭제 |
| G1-05 (추가 위치) | gh1-062 #10, gh1-072 #7 `(cute)?.`, gh1-074 #9 `(nickname)?`, gh1-076 #2 `(solutions)?` | Low | 표기 | | 물음표·마침표 중복 | |
| G1-09 (추가 위치) | gh1-078 #7 | **High** | 문법 오류 | `This is a very important problem, isn't this?` | 부가의문문 this → it | `…, isn't it?` |
| G1-37 | gh1-078 #1 #2 | Low | 자연스러움 | `Why did you beat him?` | `beat` 는 "여러 번 두들겨 패다". "때리다" 일반은 `hit` | 다른 정답 `hit` |
| G1-38 | gh1-078 #19 | Low | 시제 | `We didn't see each other for a long time, did we?` | "오랫동안 못 봤지?" 는 현재완료가 자연스러움 | 다른 정답 `We haven't seen each other for a long time, have we?` |
| G1-39 | gh1-078 #34 다른 정답 | Low | 자연스러움 | `does he or she?` | 부가의문문에 `he or she` 는 부자연 | `do they?` |
| G1-40 | gh1-078 #40 | Low | 번역 불일치 | KO `나는 바쁜 여자다.` / EN `I am a busy girl.` | 여자 ≠ girl | 다른 정답 `I am a busy woman.` |
| G1-41 | gh1-080 #2, gh1-084 #11, gh1-088 #5, gh1-090 #39 / gh1-092 #39 다른 정답 | **Medium** | 답안 데이터 | `Is your a rich man?` `The She received a letter.` `Are they police policemen?` `Why does it take happen outside the border?` | 비문이 "다른 정답"으로 표시·만점 처리 | `Is your father a rich man?` `She received a letter.` `Are they policemen?` `Why does it happen outside the border?` |
| G1-42 | gh1-080 #6 EN | **High** | 데이터 손상 | `The police arrested 15 people, didn't they? (police, people, children은 항상 복수)` | **한국어 문법 메모가 영어 모범 답안 안에** 들어 있음 → 화면에 섞여 나오고, 음성이 이 메모까지 읽으며, 맞게 써도 길이 부족으로 감점 | 답안 `The police arrested 15 people, didn't they?`, 메모는 KO 쪽 괄호로 |
| G1-43 | gh1-082 #15 #16 | **Medium** | 문법 오류 | `They didn't spend some time on an island, did they?` / `They were not spending some time on an island.` | 부정문에서는 `some` 이 아니라 `any` | `…didn't spend any time…` / `…were not spending any time…` |
| G1-44 | gh1-082 #31 | Low | 철자 변형 | `cancelling` | 미국식 `canceling` 으로 쓰면 오타 감점 | 다른 정답 `canceling` |
| G1-45 | gh1-092 #48 EN·다른 정답 | **Medium** | 문법(전치사) | `Why do they buy it in a black market?` / `in the black market` | 관용 표현은 **on the black market** | `Why do they buy it on the black market?` |
| G1-46 | gh1-092 #49 #54 | Low | 표기 | `to the congress`, `The congress approved` | 미국 의회는 고유명사 `Congress` (관사 없음) | `to Congress`, `Congress approved the bill, didn't it?` |
| G1-47 | gh1-090 #39 = gh1-092 #39 | Low | 중복 | 같은 문항이 두 페이지에 | 번호 39 가 두 번 | 한 쪽 정리 |
| G1-09 (추가 위치) | gh1-100 #118 `is this?`, gh1-108 #39 `isn't this?`, gh1-112 #110 `isn't this?` | **High** | 문법 오류 | | 부가의문문 this → it | `…, is it?` / `…, isn't it?` |
| G1-17 (추가 위치) | gh1-108 #57 `I am extremely tall, ain't I?` | **High** | 비표준 영어 | | | `…, aren't I?` |
| G1-41 (추가 위치) | gh1-094 #62 `taking participating`, #74 `All the boys Each boy, Every boy ignored`, gh1-096 #85 `Nobody No one`, gh1-098 #97 `took participated`, gh1-108 #38 `going will take`, #65 `is going will give`, gh1-110 #88 `have must deal`, gh1-116 #6 `killed the him`, gh1-118 #41 `was able could obtain` (모두 다른 정답) | **Medium** | 답안 데이터 | | 괄호 대안을 잘못 합쳐 만든 **비문 9개**가 다른 정답으로 표시·만점 처리 | 각각 올바른 한 문장으로 (`participating in` / `Each boy ignored…` + `Every boy ignored…` / `No one ignores it.` / `participated in` / `will take` / `will give` / `must deal` / `killed him` / `could obtain`) |
| G1-48 | gh1-094 #67 #70–#74 | **Medium** | 답안 보강 | KO `(3가지로)` / 모범·다른 정답 합계 1~2개 | "3가지로" 쓰라 해 놓고 세 번째 형태는 정답 목록에 없음 → 예: #71 `Every boy gets a tour of the center.` 는 오답 처리 | 세 형태(every / each / all) 모두 정답 목록에 |
| G1-34 (추가 위치) | gh1-100 #115 `Isn't it out of the question? Isn't it impossible?`, gh1-118 #57 `What would you like? What do you want?` | **Medium** | 답안 데이터 | | 두 문장이 한 답안 칸 | 하나는 모범, 하나는 다른 정답 |
| G1-49 | gh1-100 #131 EN | **Medium** | 철자 | `let her in to your strange little world` | 여기서는 `into` (한 단어). 학습자가 맞게 `into` 로 쓰면 띄어쓰기 규칙상 감점 | `let her into your strange little world` |
| G1-50 | gh1-120 #17 EN | **Medium** | 사실 오류(인명) | `Secretary of State Collin Powell … his Mid East trip` | 전 국무장관 이름은 **Colin** Powell. `Mid East` 는 `Middle East` | `Colin Powell`, `Middle East` |
| G1-51 | gh1-116 #7 EN | **Medium** | 문법 오류 | `The current available vaccine is effective` | 형용사를 수식하는 건 부사: `currently available` | `The currently available vaccine is effective, isn't it?` |
| G1-52 | gh1-110 #107 다른 정답 | **Medium** | 문법 오류 | `Did you reach there on time?` | `reach` 는 타동사라 `reach there` 는 틀림 | 다른 정답 `Did you arrive there on time?` 로 교체 |
| G1-53 | gh1-098 #110 다른 정답 | Low | 용법 | `He is not a Japanese, is he?` | `a Japanese`(명사)는 어색·결례로 여겨짐 | 이 다른 정답 삭제 (`a Korean` `an American` `a Filipino` 는 유지 가능) |
| G1-54 | gh1-122 #38 EN | Low | 의미 | `The vision includes an Israeli and Palestinian state.` | 두 국가 구상인데 한 국가로 읽힘 | `…an Israeli state and a Palestinian state.` |
| G1-55 | gh1-102 #146 EN | Low | 어순 | `Haven't they yet emerged?` | 자연스러운 어순은 `Haven't they emerged yet?` | 모범 교체, 기존은 다른 정답 |
| G1-56 | gh1-106 #10 EN | Low | 수일치 | `Who were killed and captured?` | 의문사 who 주어는 보통 단수 동사 | 다른 정답 `Who was killed and captured?` |
| G1-57 | gh1-110-1 #90 KO, gh1-123-2 #58 EN | Low | 분할 페이지 불일치 | 본문 `그 정부가 어떻게 판매를 올렸나?` ↔ 분할 `정부는 어떻게 그것의 판매를 촉진시켰나?` / `It'll be a little harder.` ↔ `It'll be a bit more difficult.` | 같은 문항이 본문 페이지와 분할 페이지에서 다름 | 본문과 같게 |
| G1-58 | 여러 곳 (gh1-094 #65 `most of the girls`, gh1-098 #98 #100 #103 #105 #107, gh1-100 #116, gh1-102 #143 #145, gh1-106 #2 #18 #28 #33, gh1-108 #40 #44 #65, gh1-110 #90 #100, gh1-112 #115 #119, gh1-116 #14 #16 #23, gh1-118 #45) | Low | 표기·자연스러움 | `next door neighbor` `interior department` `Atlanta based` `Some day,` `isn't it?.` `Mcarthy` `its sale` `Coca Cola also is` `pay-raise` `The Operation` `?.` `on line` `its limit` `North and South` `defeat adversaries` `arraigned`↔`소환` | 하이픈·대소문자·이중 문장부호·관용 표현 | `next-door` `Interior Department` `Atlanta-based` `Someday` `?` `McCarthy` `its sales` `Coca-Cola is also` `pay raise` `operation` `online` `its limits` `North and South Korea` `defeat the enemy` / KO `기소 인부 절차에 회부되지` |
| G1-07 (추가 위치) | gh1-102 #138 `꺼지`, gh1-110 #80 `꺼야` #91 `게제`, gh1-112 #113 `안 난 다`, gh1-116 #25 `아프간인 이`, gh1-118 #58 `덴마크인 이` #66 `할꺼야` #71 `카버 하겠지`, gh1-120 #19 `무바락크`, gh1-122 #57 #62 `꺼야` #64 `국적인 이` #75 `파키스탄인 들이`, gh1-100 #127 괄호 미닫힘 | Low | 맞춤법 | | | `거지` `거야` `게재` `안 난다` `아프간인이` `할 거야` `커버하겠지` `무바라크` … |
