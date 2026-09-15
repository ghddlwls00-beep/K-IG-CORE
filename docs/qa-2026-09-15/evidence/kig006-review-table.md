# KIG-006 검수표 — 적용 전 승인용

> `apply-kig006.cjs --write` 를 실행하기 **전에** 이 표를 검수하고 승인해야 합니다.
> 이 스크립트는 `content/` 에 아무것도 쓰지 않습니다.
> STUDENT 과정은 제외되어 있습니다 — 그쪽 괄호는 대안이 아니라 빈칸입니다 (`NEXT-SESSION.md` §0).

생성: 2026-09-15T20:20:39.256Z

| | 건수 |
|---|---|
| 검수 대상 문장 (중복 제거) | 239 |
| ✅ 소유자가 결정한 행 | 12 |
| 🔴 가드에 걸린 행 (먼저 볼 것) | 0 |
| 버려진 대안 | 1 |
| 남은 대안 | 256 |

---

## 0. ✅ 소유자가 결정한 행 — 엔진 결과를 사람이 뒤집었습니다

`kig006-decisions.json` 에 기록되어 있습니다. `--write` 는 엔진이 아니라 아래 값을 기록합니다.

| # | 레슨 | 원문 | 주정답 (text) | 대안 | 뒤집은 이유 |
|---|---|---|---|---|---|
| 1 | gh1-015-2 | I don't either, (Neither do I). | I don't either. | Neither do I. | 괄호가 절 전체를 대체합니다. 엔진은 뒤에 이어 붙여 'I don't either, Neither do I.' 를 만들었습니다. |
| 2 | gh1-037 | Isn't he studying English?(혹은 Is he not studying English)? | Isn't he studying English? | Is he not studying English? | 원문에 물음표가 두 개(괄호 앞·뒤) 들어가 있어 엔진이 문장을 통째로 잃고 주정답이 '?' 한 글자가 됐습니다. 학습자 화면에 정답이 '?' 로 표시될 뻔한 행입니다. |
| 3 | gh1-061 | Why doesn't he (does he not) welcome me? | Why doesn't he welcome me? | Why does he not welcome me? | 축약형↔비축약형 치환인데 엔진이 삽입으로 처리했습니다. |
| 4 | gh1-065 | Don't your parents have a dream (dreams)? | Don't your parents have a dream? | Don't your parents have dreams? | 복수형이 관사까지 포함해 'a dream' 을 대체합니다. 엔진은 'a dreams' 를 만들었습니다. |
| 5 | gh1-065 | Doesn't your son have a dream (dreams)? | Doesn't your son have a dream? | Doesn't your son have dreams? | 위와 같은 행. |
| 6 | gh1-075 | Were they policemen (police officers)? | Were they policemen? | Were they police officers? | 동의어 치환인데 두 단어가 겹치지 않아 중복 검사에 걸리지 않고 'policemen police officers' 가 됐습니다. |
| 7 | gh1-079-2 | Your teacher does not understand you, does he (or she)? | Your teacher does not understand you, does he? | Your teacher does not understand you, does he or she? | 여기서는 괄호가 치환이 아니라 '덧붙이기'가 맞습니다. 자동 가드(G2b)에 걸렸지만 소유자가 살리기로 했습니다. |
| 8 | gh1-103 | You told me everything else(every other thing), didn't you? | You told me everything else, didn't you? | You told me every other thing, didn't you? | 'everything else' 두 단어를 대체해야 하는데 'everything' 만 남기고 삽입했습니다. |
| 9 | gh2-019 | Please keep (be) quiet. | Please keep quiet. | Please be quiet. | 괄호가 동사 keep 을 대체합니다. 엔진은 'Please keep be quiet.' 를 만들었습니다. |
| 10 | gh2-025 | May I have the day off tomorrow(have tomorrow off)? | May I have the day off tomorrow? | May I have tomorrow off? | 괄호가 'have the day off tomorrow' 전체를 대체합니다. 엔진은 'have' 를 남겨 'have have' 가 됐습니다. |
| 11 | gh2-026 | I never get carsick but I always get airsick (aboard a plane) or seasick (aboard a ship). | I never get carsick but I always get airsick or seasick. | I never get carsick but I always get airsick aboard a plane or seasick aboard a ship. / I never get carsick but I always get airsick aboard a plane or seasick. / I never get carsick but I always get airsick or seasick aboard a ship. | 괄호 두 개가 각각 앞 형용사에 붙는 선택 수식구입니다. 네 조합 중 셋이 정문이고, 엔진은 어느 쪽에 붙는지 몰라 뒤엉켰습니다. |
| 12 | gh2-029 | This is he.(Speaking.) | This is he. | Speaking. | 전화 영어의 정상적인 응답입니다. 한 단어라 자동 가드(G3)에 걸렸지만 소유자가 살리기로 했습니다. |

---

## 1. 🔴 가드에 걸린 행 — 사람이 판단해야 합니다

자동으로 버린 대안입니다. **버린 게 맞는지**, 그리고 **버린 자리에 올바른 대안이 필요한지** 봐주세요.

| # | 레슨 | 원문 | 주정답 (text) | 남은 대안 | 🔴 버린 대안 / 의심 (사유) |
|---|---|---|---|---|---|

---

## 2. 가드를 통과한 행

| # | 레슨 | 원문 | 주정답 (text) | 대안 |
|---|---|---|---|---|
| 1 | gh1-007-1 | Those(They) are their pens. | Those are their pens. | They are their pens. |
| 2 | gh1-009-1 | What was her maiden name(family name: last name)? | What was her maiden name? | — |
| 3 | gh1-011-1 | They have dreams (혹은 a dream.) | They have dreams. | They have a dream. |
| 4 | gh1-011-1 | Do they have dreams (혹은 a dream)? | Do they have dreams? | Do they have a dream? |
| 5 | gh1-011-2 | Did he like it(that)? | Did he like it? | Did he like that? |
| 6 | gh1-011-2 | Did they like it(that)? | Did they like it? | Did they like that? |
| 7 | gh1-011-2 | Wasn't there a boy? (Was there not a boy?) | Wasn't there a boy? | Was there not a boy? |
| 8 | gh1-011-2 | Weren't there boys? (Were there not boys?) | Weren't there boys? | Were there not boys? |
| 9 | gh1-011-2 | Didn't they have dreams? (혹은 a dream)? | Didn't they have dreams? | Didn't they have a dream? |
| 10 | gh1-011-2 | Didn't you like it(that)? | Didn't you like it? | Didn't you like that? |
| 11 | gh1-011-2 | Didn't he like it(that)? | Didn't he like it? | Didn't he like that? |
| 12 | gh1-011-2 | Didn't they like it(that)? | Didn't they like it? | Didn't they like that? |
| 13 | gh1-013-1 | Those(They) are your books. | Those are your books. | They are your books. |
| 14 | gh1-013-1 | Those (The) books are theirs. | Those books are theirs. | — |
| 15 | gh1-013-1 | That (The) house is mine. | That house is mine. | — |
| 16 | gh1-015-1 | Whose books are they(those)? | Whose books are they? | Whose books are those? |
| 17 | gh1-015-1 | Which (What) book do you want? | Which book do you want? | Which What book do you want? |
| 18 | gh1-015-1 | Which(What) do you want? | Which do you want? | What do you want? |
| 19 | gh1-015-1 | You didn't have (eat) lunch, did you? | You didn't have lunch, did you? | You didn't eat lunch, did you? |
| 20 | gh1-015-1 | I want apples (혹은 an apple). | I want apples. | I want an apple. |
| 21 | gh1-015-2 | I am, too.(So am I). | I am, too. | So am I. |
| 22 | gh1-015-2 | Each (Every) student has his own room. | Each student has his own room. | — |
| 23 | gh1-015-2 | He goes there each (every) year. | He goes there each year. | — |
| 24 | gh1-017-1 | Each boy receives a prize(혹은 prizes). | Each boy receives a prize. | Each boy receives prizes. |
| 25 | gh1-017-1 | Every boy receives a prize(혹은 prizes). | Every boy receives a prize. | Every boy receives prizes. |
| 26 | gh1-017-1 | All (the) boys receive a prize(혹은 prizes). | All boys receive a prize. | All the boys receive prizes. / All boys receive prizes. / All the boys receive a prize. |
| 27 | gh1-017-1 | All (the) boys do not receive a prize(혹은 prizes). | All boys do not receive a prize. | All the boys do not receive prizes. / All boys do not receive prizes. / All the boys do not receive a prize. |
| 28 | gh1-017-2 | How many girls were (there) in the classroom? | How many girls were in the classroom? | How many girls were there in the classroom? |
| 29 | gh1-017-2 | How much did you like it(that)? | How much did you like it? | How much did you like that? |
| 30 | gh1-023 | Those(they) are books. | Those are books. | They are books. |
| 31 | gh1-023 | They(those) are not books. | They are not books. | Those are not books. |
| 32 | gh1-025 | Are those(they) books? | Are those books? | Are they books? |
| 33 | gh1-025 | Am I not a boy(혹은 Ain't I a boy)? | Am I not a boy? | Ain't I a boy? |
| 34 | gh1-025 | Aren't you a girl(혹은 Are you not a girl)? | Aren't you a girl? | Are you not a girl? |
| 35 | gh1-025 | Isn't he a boy(혹은 Is he not a boy?) | Isn't he a boy? | Is he not a boy? |
| 36 | gh1-025 | Isn't she a girl(혹은 Is she not a girl)? | Isn't she a girl? | Is she not a girl? |
| 37 | gh1-025 | Isn't this a pen(혹은 Is this not a pen)? | Isn't this a pen? | Is this not a pen? |
| 38 | gh1-025 | Isn't it a book(혹은 Is it not a book)? | Isn't it a book? | Is it not a book? |
| 39 | gh1-025 | Aren't these pens(혹은 Are these not pens)? | Aren't these pens? | Are these not pens? |
| 40 | gh1-025 | Aren't those books(혹은 Are those not books)? | Aren't those books? | Are those not books? |
| 41 | gh1-025 | Aren't you happy(혹은 Are you not happy)? | Aren't you happy? | Are you not happy? |
| 42 | gh1-025 | Isn't she happy(혹은 Is she not happy)? | Isn't she happy? | Is she not happy? |
| 43 | gh1-027 | Those(they) were books. | Those were books. | They were books. |
| 44 | gh1-027 | They(those) were not books. | They were not books. | Those were not books. |
| 45 | gh1-029 | Were those(they) books? | Were those books? | Were they books? |
| 46 | gh1-029 | Was I not a boy(혹은 Wasn't I a boy)? | Was I not a boy? | Wasn't I a boy? |
| 47 | gh1-029 | Weren't you a girl(혹은 Were you not a girl)? | Weren't you a girl? | Were you not a girl? |
| 48 | gh1-029 | Wasn't he a boy(혹은 Was he not a boy?) | Wasn't he a boy? | Was he not a boy? |
| 49 | gh1-029 | Wasn't she a girl(혹은 Was she not a girl)? | Wasn't she a girl? | Was she not a girl? |
| 50 | gh1-029 | Wasn't this a pen(혹은 Was this not a pen)? | Wasn't this a pen? | Was this not a pen? |
| 51 | gh1-029 | Wasn't it a book(혹은 Was it not a book)? | Wasn't it a book? | Was it not a book? |
| 52 | gh1-029 | Weren't these pens(혹은 Were these not pens)? | Weren't these pens? | Were these not pens? |
| 53 | gh1-029 | Weren't those books(혹은 Were those not books)? | Weren't those books? | Were those not books? |
| 54 | gh1-029 | Weren't you happy(혹은 Were you not happy)? | Weren't you happy? | Were you not happy? |
| 55 | gh1-029 | Wasn't she happy(혹은 Was she not happy)? | Wasn't she happy? | Was she not happy? |
| 56 | gh1-033 | Don't I love you(혹은 Do I not ---)? | Don't I love you? | Do I not love you? |
| 57 | gh1-033 | Don't you love my sister(혹은 Do you not ---- )? | Don't you love my sister? | Do you not love my sister? |
| 58 | gh1-033 | Doesn't he love me(혹은 Does he not ---)? | Doesn't he love me? | Does he not love me? |
| 59 | gh1-033 | Doesn't she love your brother(혹은 Does she not ---)? | Doesn't she love your brother? | Does she not love your brother? |
| 60 | gh1-033 | Don't they love you(혹은 Do they not---)? | Don't they love you? | Do they not love you? |
| 61 | gh1-033 | Doesn't she love his brother(혹은 Does she not ---) ? | Doesn't she love his brother? | Does she not love his brother? |
| 62 | gh1-033 | Don't I love him(혹은 Do I not ---)? | Don't I love him? | Do I not love him? |
| 63 | gh1-033 | Doesn't he love her sister(혹은 Does he not --)? | Doesn't he love her sister? | Does he not love her sister? |
| 64 | gh1-033 | Don't I love her(Do I not ---)? 37.This is mine. | Don't I love her? 37.This is mine. | Do I not love her? 37.This is mine. |
| 65 | gh1-033 | It is yours. 39.Those(They) are theirs. | It is yours. 39.Those are theirs. | It is yours. They are theirs. |
| 66 | gh1-033 | Are those(they) theirs? | Are those theirs? | Are they theirs? |
| 67 | gh1-033 | Isn't this mine(혹은 Is this not mine?) | Isn't this mine? | Is this not mine? |
| 68 | gh1-033 | Isn't it yours(혹은 Is it not yours)? | Isn't it yours? | Is it not yours? |
| 69 | gh1-033 | Aren't they(those) yours(Are they not yours)? | Aren't they yours? | Are they not yours? |
| 70 | gh1-033 | Aren't these his?(Are these not his)? | Aren't these his? | Are these not his? |
| 71 | gh1-037 | Am I not studying English(혹은 Ain't I studying English)? | Am I not studying English? | Ain't I studying English? |
| 72 | gh1-037 | Aren't you studying English(혹은 Are you not studying English)? | Aren't you studying English? | Are you not studying English? |
| 73 | gh1-037 | Isn't she studying English(혹은Is she not studying English)? | Isn't she studying English? | Is she not studying English? |
| 74 | gh1-037 | Aren't they studying English(혹은 Are they not studying English)? | Aren't they studying English? | Are they not studying English? |
| 75 | gh1-037 | Was I not studying English(혹은 Wasn't I studying English)? | Was I not studying English? | Wasn't I studying English? |
| 76 | gh1-037 | Were you not studying English(혹은 Weren't you studying English) | Were you not studying English. | Weren't you studying English. |
| 77 | gh1-037 | Wasn't he studying English(혹은 Was he not studying English)? | Wasn't he studying English? | Was he not studying English? |
| 78 | gh1-037 | Wasn't she studying English(혹은 Was she not studying English)? | Wasn't she studying English? | Was she not studying English? |
| 79 | gh1-037 | Weren't they studying English(혹은 Were they not studying English)? | Weren't they studying English? | Were they not studying English? |
| 80 | gh1-039 | I am a boy, ain't I(혹은 I am a boy, am I not)? | I am a boy, ain't I? | I am a boy? |
| 81 | gh1-039 | You are a girl, aren't you(혹은 You are a girl, are you not)? | You are a girl, aren't you? | You are a girl? |
| 82 | gh1-039 | He is a boy, isn't he(혹은 He is a boy, is he not?) | He is a boy, isn't he? | He is a boy? |
| 83 | gh1-039 | She is a girl, isn't she(혹은 She is a girl, is she not)? | She is a girl, isn't she? | She is a girl? |
| 84 | gh1-039 | This is a pen, isn't this(혹은 This is a pen, is this not)? | This is a pen, isn't this? | This is a pen? |
| 85 | gh1-039 | It is a book, isn't it(혹은 It is a book, is it not?) | It is a book, isn't it? | It is a book? |
| 86 | gh1-039 | These are pens, aren't these(혹은 ---, are these not)? | These are pens, aren't these? | These are pens, are these not? |
| 87 | gh1-039 | Those(they) are books, aren't they(혹은 ---, are they not)? | Those are books, aren't they? | Those are books, are they not? / They are books, aren't they? / They are books, are they not? |
| 88 | gh1-039 | I am happy, ain't I(혹은 I am happy, am I not)? | I am happy, ain't I? | I am happy? |
| 89 | gh1-039 | They(those) are books, aren't they? | They are books, aren't they? | Those are books, aren't they? |
| 90 | gh1-043-2 | Those(They) are theirs. | Those are theirs. | They are theirs. |
| 91 | gh1-051-1 | This is my hat(cap). | This is my hat. | This is my cap. |
| 92 | gh1-051-1 | Those(They) are their guns. | Those are their guns. | They are their guns. |
| 93 | gh1-051-1 | It(That) is mine. | It is mine. | That is mine. |
| 94 | gh1-051-2 | Whose car is that(it)? | Whose car is that? | Whose car is it? |
| 95 | gh1-051-2 | Are they(those) yours? | Are they yours? | Are those yours? |
| 96 | gh1-051-2 | Is it (that) mine? | Is it mine? | Is it that mine? |
| 97 | gh1-053-1 | We were workers (laborers). | We were workers. | We were laborers. |
| 98 | gh1-053-1 | Those(They) were their cows. | Those were their cows. | They were their cows. |
| 99 | gh1-053-1 | It(That) was mine. | It was mine. | That was mine. |
| 100 | gh1-053-2 | Were those(they) hers? | Were those hers? | Were they hers? |
| 101 | gh1-053-2 | Was it(that) mine? | Was it mine? | Was that mine? |
| 102 | gh1-057-1 | Those(They) are her books. | Those are her books. | They are her books. |
| 103 | gh1-057-1 | Those(The) pencils are theirs. | Those pencils are theirs. | The pencils are theirs. |
| 104 | gh1-057-1 | It(That) is her car. | It is her car. | That is her car. |
| 105 | gh1-057-1 | It(That) is your dog. | It is your dog. | That is your dog. |
| 106 | gh1-057-1 | That(The) car is mine. | That car is mine. | The car is mine. |
| 107 | gh1-057-1 | Why did he study it(that)? | Why did he study it? | Why did he study that? |
| 108 | gh1-057-1 | Why were you not(weren't you) studying English? | Why were you not studying English? | Why weren't you studying English? |
| 109 | gh1-059-1 | Whose pencils are those(they)? | Whose pencils are those? | Whose pencils are they? |
| 110 | gh1-059-1 | That(It) is your car, isn't that(it)? | That is your car, isn't that? | It is your car, isn't it? |
| 111 | gh1-059-2 | Isn't he(Is he not) coming here? | Isn't he coming here? | Is he not coming here? |
| 112 | gh1-059-2 | Each(Every) student has his own idea. | Each student has his own idea. | Every student has his own idea. |
| 113 | gh1-059-2 | Does each(every) student have his own plan? | Does each student have his own plan? | Does every student have his own plan? |
| 114 | gh1-059-2 | Aren't you(Are you not) happy? | Aren't you happy? | Are you not happy? |
| 115 | gh1-059-2 | Didn't he(Did he not) give money to each of his sons? | Didn't he give money to each of his sons? | Did he not give money to each of his sons? |
| 116 | gh1-059-2 | Doesn't she(Does she not) give money to each of her daughters? | Doesn't she give money to each of her daughters? | Does she not give money to each of her daughters? |
| 117 | gh1-059-2 | Isn't he(Is he not) popular? | Isn't he popular? | Is he not popular? |
| 118 | gh1-059-2 | Weren't they(Were they not) popular? | Weren't they popular? | Were they not popular? |
| 119 | gh1-059-2 | Am I not(ain't I) famous? | Am I not famous? | Ain't I famous? |
| 120 | gh1-061 | How many boys were (there) in the library? | How many boys were in the library? | How many boys were there in the library? |
| 121 | gh1-063 | Is that (the) car yours? | Is that car yours? | — |
| 122 | gh1-063 | Do your son(s) and daughter(s) have a dream (dreams)? | Do your son and daughter have a dream? | Do your sons and daughter have a dream? / Do your son and daughters have a dream? / Do your sons and daughters have a dream? |
| 123 | gh1-065 | Are they(those) your sister's books? | Are they your sister's books? | Are those your sister's books? |
| 124 | gh1-073 | Those(They) are their gloves. | Those are their gloves. | They are their gloves. |
| 125 | gh1-075 | Those(They) were theirs. | Those were theirs. | They were theirs. |
| 126 | gh1-075 | It(That) was hers. | It was hers. | That was hers. |
| 127 | gh1-075 | Was he a good student(pupil)? | Was he a good student? | Was he a good pupil? |
| 128 | gh1-075 | Was that (the) land yours? | Was that land yours? | — |
| 129 | gh1-079-1 | You need that(the) special book, don't you? | You need that special book, don't you? | You need the special book, don't you? |
| 130 | gh1-081-1 | Is your father rich(a rich man)? | Is your father rich? | Is your a rich man? |
| 131 | gh1-081-1 | What time did you leave your home(house)? | What time did you leave your home? | What time did you leave your house? |
| 132 | gh1-081-2 | When does he return(go back) to the U.S.? | When does he return to the U.S.? | When does he go back to the U.S.? |
| 133 | gh1-081-2 | Are(Were) you mad (angry)? | Are you mad? | Were you mad? |
| 134 | gh1-085 | The woman(She) received a letter. | The woman received a letter. | The She received a letter. |
| 135 | gh1-085 | Is there no evidence(Isn't there any evidence)? | Is there no evidence? | Isn't there any evidence? |
| 136 | gh1-089 | Is this your homework (assignment)? | Is this your homework? | Is this your assignment? |
| 137 | gh1-091 | Do your son(s) and daughter(s) have pets(a pet)? | Do your son and daughter have pets? | Do your son and daughter have a pet? / Do your sons and daughter have pets? / Do your sons and daughter have a pet? / Do your son and daughters have pets? / Do your son and daughters have a pet? / Do your sons and daughters have pets? / Do your sons and daughters have a pet? |
| 138 | gh1-091 | Do they take airplanes frequently(often)? | Do they take airplanes frequently? | Do they take airplanes often? |
| 139 | gh1-091 | Why does it take place(happen) outside the border? | Why does it take place outside the border? | Why does it take happen outside the border? |
| 140 | gh1-093 | Why do they buy it in a(the) black market? | Why do they buy it in a black market? | Why do they buy it in the black market? |
| 141 | gh1-095 | Why was the vice president taking part(participating) in that project? | Why was the vice president taking part in that project? | Why was the vice president taking participating in that project? |
| 142 | gh1-095 | Everybody(everyone) likes the solution, don't they? | Everybody likes the solution, don't they? | Everyone likes the solution, don't they? |
| 143 | gh1-095 | Everybody(everyone) liked the contract, didn't they? | Everybody liked the contract, didn't they? | Everyone liked the contract, didn't they? |
| 144 | gh1-095 | Every(Each) agency increases security. | Every agency increases security. | Each agency increases security. |
| 145 | gh1-095 | Each(Every) boy gets a tour of the center. | Each boy gets a tour of the center. | Every boy gets a tour of the center. |
| 146 | gh1-095 | Each(Every) boy worries about his future. | Each boy worries about his future. | Every boy worries about his future. |
| 147 | gh1-095 | Every(Each) boy received a prize. | Every boy received a prize. | Each boy received a prize. |
| 148 | gh1-095 | All the boys (Each boy, Every boy) ignored the advice. | All the boys ignored the advice. | All the boys Each boy, Every boy ignored the advice. |
| 149 | gh1-095 | Each(Every) boy did his homework. | Each boy did his homework. | Every boy did his homework. |
| 150 | gh1-095 | Every(Each) priest attended the fundraiser, didn't he? | Every priest attended the fundraiser, didn't he? | Each priest attended the fundraiser, didn't he? |
| 151 | gh1-097 | Nobody(No one) called. | Nobody called. | No one called. |
| 152 | gh1-097 | Nobody (No one) ignores it. | Nobody ignores it. | Nobody No one ignores it. |
| 153 | gh1-097 | Nobody(No one) is buying it, are they? | Nobody is buying it, are they? | No one is buying it, are they? |
| 154 | gh1-097 | Nobody(No one) knows everything, do they? | Nobody knows everything, do they? | No one knows everything, do they? |
| 155 | gh1-099 | The company took part(participated) in the project, didn't it? | The company took part in the project, didn't it? | The company took participated in the project, didn't it? |
| 156 | gh1-099 | How fast(soon, quickly) does it become clear? | How fast does it become clear? | How soon does it become clear? / How quickly does it become clear? |
| 157 | gh1-099 | He is (a) Korean, isn't he? | He is Korean, isn't he? | He is a Korean, isn't he? |
| 158 | gh1-099 | He is not (a) Japanese, is he? | He is not Japanese, is he? | He is not a Japanese, is he? |
| 159 | gh1-099 | She was (an) American, wasn't she? | She was American, wasn't she? | She was an American, wasn't she? |
| 160 | gh1-099 | She was not (a) Filipino, was she? | She was not Filipino, was she? | She was not a Filipino, was she? |
| 161 | gh1-101 | Didn't(Hasn't) it become the symbol of the engagement policy? | Didn't it become the symbol of the engagement policy? | Hasn't it become the symbol of the engagement policy? |
| 162 | gh1-101 | How did it go(proceed)? | How did it go? | How did it proceed? |
| 163 | gh1-101 | We totally(completely) ignored market principles, didn't we? | We totally ignored market principles, didn't we? | We completely ignored market principles, didn't we? |
| 164 | gh1-101 | Didn't I share that(it) with you? | Didn't I share that with you? | Didn't I share it with you? |
| 165 | gh1-101 | Is that(it) a deal? | Is that a deal? | Is it a deal? |
| 166 | gh1-103 | Will the United States undoubtedly(without a doubt) face future terrorist threats? | Will the United States undoubtedly face future terrorist threats? | Will the United States without a doubt face future terrorist threats? |
| 167 | gh1-103 | When did our forces defeat adversaries(enemies)? | When did our forces defeat adversaries? | When did our forces defeat enemies? |
| 168 | gh1-103 | What was that(it) like then? | What was that like then? | What was it like then? |
| 169 | gh1-103 | Why don't you say that(it) again? | Why don't you say that again? | Why don't you say it again? |
| 170 | gh1-103 | Do you still see(meet) all of them? | Do you still see all of them? | Do you still meet all of them? |
| 171 | gh1-107 | Isn't that(it) strange? | Isn't that strange? | Isn't it strange? |
| 172 | gh1-107 | The CIA did not take part(participate) in that(the) raid, did it? | The CIA did not take part in that raid, did it? | The CIA did not participate in that raid, did it? |
| 173 | gh1-109 | When will they(are they going to) finish their freshman year? | When will they finish their freshman year? | When are they going to finish their freshman year? |
| 174 | gh1-109 | They will be(become) sophomores, won't they? | They will be sophomores, won't they? | They will become sophomores, won't they? |
| 175 | gh1-109 | It's going to(will) take time. | It's going to take time. | It's going will take time. |
| 176 | gh1-109 | It's nicer than my place(house). | It's nicer than my place. | It's nicer than my house. |
| 177 | gh1-109 | I've never seen your place(house). | I've never seen your place. | I've never seen your house. |
| 178 | gh1-109 | Professor Mcarthy is going to(will) give a difficult examination. | Professor Mcarthy is going to give a difficult examination. | Professor Mcarthy is going will give a difficult examination. |
| 179 | gh1-111-1 | When will(shall) we have a live report? | When will we have a live report? | When shall we have a live report? |
| 180 | gh1-111-1 | They have to(must) deal with the disaster. | They have to deal with the disaster. | They have must deal with the disaster. |
| 181 | gh1-111-1 | Which(what) company makes chewing tobacco? | Which company makes chewing tobacco? | What company makes chewing tobacco? |
| 182 | gh1-111-2 | When am I going to(shall I, will I) meet your friends and your brothers? | When am I going to meet your friends and your brothers? | When shall I meet your friends and your brothers? / When will I meet your friends and your brothers? |
| 183 | gh1-111-2 | Did you get(reach) there on time? | Did you get there on time? | Did you reach there on time? |
| 184 | gh1-113-1 | The novelist won(received) the Nobel Prize, didn't he? | The novelist won the Nobel Prize, didn't he? | The novelist received the Nobel Prize, didn't he? |
| 185 | gh1-113-2 | Will(would) you speak more slowly, please? | Will you speak more slowly, please? | Would you speak more slowly, please? |
| 186 | gh1-113-2 | Isn't he working for(at) a bank? | Isn't he working for a bank? | Isn't he working at a bank? |
| 187 | gh1-117-1 | When was the chopper(helicopter) hit by enemy fire? | When was the chopper hit by enemy fire? | When was the helicopter hit by enemy fire? |
| 188 | gh1-117-1 | Who dragged off and killed the man(him)? | Who dragged off and killed the man? | Who dragged off and killed the him? |
| 189 | gh1-117-1 | It could(can) be improved, couldn't(can't) it? | It could be improved, couldn't it? | It can be improved, can't it? |
| 190 | gh1-117-1 | Weren't the other two German(s)? | Weren't the other two Germans? | Weren't the other two German? |
| 191 | gh1-117-2 | Isn't the threat their way of retaliating(retaliation)? | Isn't the threat their way of retaliating? | Isn't the threat their way of retaliation? |
| 192 | gh1-117-2 | The servicemen(soldiers) died in two separate incidents, didn't they? | The servicemen died in two separate incidents, didn't they? | The soldiers died in two separate incidents, didn't they? |
| 193 | gh1-119-1 | The team was able to(could) obtain numerous samples, wasn't it? | The team was able to obtain numerous samples, wasn't it? | The team was able could obtain numerous samples, wasn't it? |
| 194 | gh1-119-1 | Is that less(smaller) than President Bush estimated? | Is that less than President Bush estimated? | Is that smaller than President Bush estimated? |
| 195 | gh1-119-2 | Who gave you a ride(lift)? | Who gave you a ride? | Who gave you a lift? |
| 196 | gh1-119-2 | We are going to(will) do that another time (some other time). | We are going to do that another time. | We are going to do that some other time. / We will do that another time. / We will do that some other time. |
| 197 | gh1-119-2 | Why didn't you take a cab(taxi)? | Why didn't you take a cab? | Why didn't you take a taxi? |
| 198 | gh1-121-1 | The company constructs(builds) the most moving memorial possible. | The company constructs the most moving memorial possible. | The company builds the most moving memorial possible. |
| 199 | gh1-121-1 | It will handle(deal with) redevelopment. | It will handle redevelopment. | It will deal with redevelopment. |
| 200 | gh1-121-2 | (The) Palestinians and (the) Israelis must act. | Palestinians and Israelis must act. | The Palestinians and the Israelis must act. / The Palestinians and Israelis must act. / Palestinians and the Israelis must act. |
| 201 | gh1-123-2 | Here's the (phone) number. | Here's the number. | Here's the phone number. |
| 202 | gh2-008 | In trying to improve his English, he is building (on) his vocabulary. | In trying to improve his English, he is building his vocabulary. | In trying to improve his English, he is building on his vocabulary. |
| 203 | gh2-009 | What do you do on Sunday(s)? | What do you do on Sundays? | What do you do on Sunday? |
| 204 | gh2-013 | You should(must) come here by ten o'clock. | You should come here by ten o'clock. | You must come here by ten o'clock. |
| 205 | gh2-013 | He will(would) solve the problem. | He will solve the problem. | He would solve the problem. |
| 206 | gh2-017 | The lights were all on.(All the lights were on.) | The lights were all on. | All the lights were on. |
| 207 | gh2-018 | The members opposed(objected to, were opposed to) the plan | The members opposed the plan. | The members objected to the plan. / The members were opposed to the plan. |
| 208 | gh2-029 | You have the wrong(right) number. | You have the wrong number. | You have the right number. |
| 209 | gh2-030 | It takes one hour for me to get here. (It takes me one hour to get here.) | It takes one hour for me to get here. | It takes me one hour to get here. |
| 210 | gh2-032 | I think it the best way to success to work hard. (I think the best way to success is to work hard.) | I think it the best way to success to work hard. | I think the best way to success is to work hard. |
| 211 | gh2-033 | Since I was in a hurry, I thought I had no choice but (to)step on it. | Since I was in a hurry, I thought I had no choice but step on it. | Since I was in a hurry, I thought I had no choice but to step on it. |
| 212 | gh2-037 | I'd like to have a phone installed(my phone disconnected) in my apartment. | I'd like to have a phone installed in my apartment. | I'd like to have my phone disconnected in my apartment. |
| 213 | gh2-037 | I had a little alteration(혹은 a few alterations) made. | I had a little alteration made. | I had a little a few alterations made. |
| 214 | gh2-038 | Did you see the boy stand(ing) over there? | Did you see the boy standing over there? | Did you see the boy stand over there? |
| 215 | gh2-039 | This is the book (which) I bought yesterday. | This is the book I bought yesterday. | This is the book which I bought yesterday. |
| 216 | gh2-039 | I sympathize with the girl (whom) he raped. | I sympathize with the girl he raped. | I sympathize with the girl whom he raped. |
| 217 | gh2-040 | A lot of people use a substance (which) we all say we abhor. | A lot of people use a substance we all say we abhor. | A lot of people use a substance which we all say we abhor. |
| 218 | gh2-040 | Complaining was just about all (that) the opposition could do to the President. | Complaining was just about all the opposition could do to the President. | Complaining was just about all that the opposition could do to the President. |
| 219 | gh2-040 | I want my lights and gas turned on(off). | I want my lights and gas turned on. | I want my lights and gas turned off. |
| 220 | gh2-048 | If I had enough money(Had I enough money), I would buy you a diamond ring. | If I had enough money, I would buy you a diamond ring. | Had I enough money, I would buy you a diamond ring. |
| 221 | gh2-048 | If I had known your phone number(Had I known your phone number), | If I had known your phone number,. | Had I known your phone number,. |
| 222 | gh2-048 | If they had had the ability to make money(Had they had the ability to make money), | If they had had the ability to make money,. | Had they had the ability to make money,. |
| 223 | gh2-048 | He should be in high school now if he had not flunked a grade. (Had he not flunked a grade, he should be in high school now.) | He should be in high school now if he had not flunked a grade. | Had he not flunked a grade, he should be in high school now. |
| 224 | gh2-048 | If the blood products had been heat treated(Had the blood product been heat treated), | If the blood products had been heat treated,. | Had the blood product been heat treated,. |
| 225 | gh2-048 | (Were it not for the sun,) nothing could live.(If it were not for the sun,) nothing could live. | Were it not for the sun, nothing could live. | If it were not for the sun, nothing could live. |
| 226 | gh2-048 | Should I have been(If I had been, had I been) three minutes late, I should have missed the train. | Should I have been three minutes late, I should have missed the train. | If I had been three minutes late, I should have missed the train. / Had I been three minutes late, I should have missed the train. |
| 227 | gh2-048 | Should you not go, he would go. (If you should not go,) he would go. | Should you not go, he would go. he would go. | If you should not go,. |
