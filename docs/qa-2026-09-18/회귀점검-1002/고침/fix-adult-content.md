# 회귀 점검 1002 고침 — fix-adult-content (성인반 글 · 빈칸 보기)

- 날짜: 2026-10-05 · 가지 claude/regression-check-1002-8d4817 (HEAD 5cc17f4f 위, 커밋 안 함)
- 근거: `결과.md` 2장(F02~F17) · `단계5-글읽기.md` 4장(F18~F72 중 성인반) · `작업기록.md` 10:1x~11:0x 사장님 결정
- 고친 곳: `scripts/build-adult-content.mjs`(표) → `node scripts/build-adult-content.mjs` 로 다시 만든 `content/lessons/adult/*`(35파일) ·
  `content/courses/adult.json` · `docs/adult/README.md`. 강의 파일은 손으로 고치지 않았습니다.
- 커밋 · 푸시 · R2 · 음성 생성은 하지 않았습니다(주 세션 몫).
- **같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**

## 1. 빌드에 더한 표

| 표 | 무엇 | 멈추는 경우 |
|---|---|---|
| `CHOICE_FIX` | 강의 → 카드 낱말 → 오답 보기 3개 (40빈칸) | 보기가 정답 · 정답의 낱말 · 같은 과 낱말이 아님 · 3개가 아님 · 규칙이 고른 것과 같음 · 그 카드가 강의에 없음 |
| `KO_LINE_FIX` | 파일 → 문장 번호 → [바꿀 말, 새 말] — 영어가 PPT 그대로인 문장의 한국어 줄 | 바꿀 말이 줄에 꼭 한 번 있지 않음 · 쓰이지 않은 줄 |
| `CHUNK_KO_FIX` | 파일 → 문장 번호 → {덩어리 번호: [그 덩어리 영어, 새 한국어]} | 그 덩어리 영어가 다름 · 한국어가 이미 같음 · 쓰이지 않은 줄 |
| `WORD_FIX` | 파일 → PPT 낱말 → {word, meaning} | PPT 에 그 낱말이 없음 |
| (넓힘) `EN_FIX` | 한국어 칸 `null` = PPT 의 한국어 줄 그대로 | 이미 같은 영어를 주면 |
| (넓힘) `TITLE_FIX` | 쓰이지 않는 제목 고침도 멈춤 | |

EN_FIX · KO_FIX · CHUNK_FIX 가 쓰는 문장에 KO_LINE_FIX · CHUNK_KO_FIX 를 걸면 멈춤(고칠 곳을 하나로). 문장과 덩어리가 글자까지 이어지는 검사는 그대로.

## 2. 고친 틀림 (전 → 뒤)

### 2-1. 단어 빈칸 보기 (소리 바뀜 없음 — 보기는 소리를 안 냄)

새 보기마다 그 빈칸에 넣어 보고 문법 또는 뜻으로 들어맞지 않음을 다시 따졌습니다. 감사가 낸 '고칠 보기'와 다르게 정한 것은 ★.

| # | 강의 · 빈칸 (정답) | 전 | 뒤 | 다시 따진 것 |
|---|---|---|---|---|
| F02 | a2-3 'gratitude and ___' (anticipation) | retirement age · peace of mind · refuge | retirement age · refuge · milestone | 'gratitude and milestone' — 관사 없는 셀 수 있는 명사 · 뜻 안 맞음 |
| F03 | a3-3 'with an ___, genuinely collaborative style' (outstanding) | outgoing · gifted at · introverted | gifted at · possess · decades | 셋 다 형용사 자리에 안 들어감 |
| F04 | a4-3 'isn't an ___ duty' (occasional) | paternal · maternal · unavoidable | paternal · maternal · eldest | paternal · maternal 은 'an' 뒤에 못 옴 · 'an eldest duty' 는 영어가 아님(eldest 는 사람 앞) |
| F05 | a5-3 'becomes a ___ one' (close-knit) | supportive · collaborative · demanding | demanding · ritual · tackle | 'a demanding one' 은 문법은 되나 앞(함께 밥 먹으며 대화)과 뜻이 반대 |
| F06 | a5-3 'kept our team remarkably ___' (supportive) | collaborative · close-knit · demanding | demanding · stretch · efficiently | keep + 목적어 + 형용사 — efficiently(부사) · stretch(명사) 안 됨, demanding 은 뜻이 반대 |
| F07 | a6-3 'a remarkably ___ network' (supportive) | collaborative · close-knit · home-cooked | home-cooked · attentively · every other | 모두 안 들어감 |
| F08 | a6-4 'a ___ extended family' (close-knit) | supportive · collaborative · home-cooked | home-cooked · occasionally · every other | 모두 안 들어감 |
| F09 ★ | a6-5 'over a ___ meal' (home-cooked) | balanced · supportive · collaborative | supportive · close-knit · attentively | 감사 안(supportive · collaborative · close-knit)의 collaborative 는 '함께 만든 식사'로 읽힐 수 있어 attentively 로 바꿈 |
| F10 | a8-2 'perform a ___ ceremony' (ritual) | traditional · upcoming · in honor of | privilege · upcoming · in honor of | 'a upcoming' 관사 · 뜻 안 맞음 |
| F11 | a9-4 'didn't have its own ___' (alphabet) | nobility · writing system · boiled rice | boiled rice · aspects · however | 문법은 되는 명사도 뜻이 안 됨(밥 · '면') |
| F12 | a9-4 'This ___ is known as 한글' (writing system) | boiled rice · alphabet · nobility | boiled rice · nobility · housing | 뜻 안 맞음 |
| F13 | a10-3 'you can ___ a traditional wedding ceremony' (witness) | regard 경주 as · contains · observe | regard 경주 as · contains · surrounded | can 뒤 contains · surrounded 안 됨, 'regard 경주 as a … ceremony' 는 뜻 안 됨 |
| F14 | a10-3 'a very popular ___ for … visitors' (attraction) | destination · capital · Dynasty | Dynasty · peninsula · remains | 민속촌은 반도 · 유적(복수 꼴)이 아님 |
| F15 | a11-3 'honest and ___' (accountable) | upright · authoritarian · nationwide | authoritarian · nationwide · reluctant | 민주 시민이 뽑을 지도자 자질이 아님 · nationwide 는 사람에 안 씀 |
| F16 | a12-1 'remarkably rapid ___, many of which' (transformations) | reforms · social classes · liberation | social classes · liberation · tutoring | many of which 는 복수 — liberation · tutoring 안 됨, social classes 는 뜻 안 됨 |
| F17 | a12-2 'a ___ social issue' (pressing) | lower-income · decent · fundamental | lower-income · decent · prestigious | 모두 뜻 안 맞음 |
| F31 | a4-3 'a shared commitment we ___ every day' (renew) | judge · pursue · awakening | judge · awakening · lately | 약속을 매일 '판단'하지 않음 — 'take for granted' 도 들어맞아 보기로 쓰지 않음 |
| F32 | a5-5 'with ___ effort' (dedicated) | rushed · collaborative · close-knit | rushed · close-knit · remarkably | 'rushed effort' 는 '그 시간을 지켜 옴'과 뜻이 반대 |
| F33 | a1-1(무료) 'It's a ___ to be with you' (pleasure) | chance · orphanage · hiking | orphanage · hiking · subjects | 모두 안 들어감 |
| F35 | a7-1 'the nation of Korea was ___' (founded) | divided · ruled · liberated | hosted · accomplished · century | 나라를 '개최' · '성취'하지 않음 |
| F36 | a7-2 'the Korean ___ was divided' (Peninsula) | century · Golden Age · nation | century · Golden Age · founder | 뜻 안 됨 |
| F37 | a7-3 'Korea was ___ by Japan from 1910 to 1945' (ruled) | liberated · invaded · developed | liberated · hosted · accomplished | liberated 는 사실과 반대 |
| F38 | a8-1 'the two largest ___ holidays' (traditional) | ritual · upcoming · custom | ritual · custom · privilege | 'ritual holidays' 는 쓰지 않는 말 |
| F39 | a8-2 'we ___ a ritual ceremony' (perform) | bow · celebrate · ritual | bow · ritual · upcoming | 타동사 자리에 안 됨 |
| F40 | a8-2 'in honor of our ___' (ancestors) | elders · blessings · tombs | blessings · tombs · rice cake | 뜻 안 됨 |
| F41 | a8-2 'bow to their ___' (elders) | blessings · tombs · relatives | blessings · gesture · rice cake | 뜻 안 됨 |
| F42 | a8-2 'a special honor and ___ of showing respect' (privilege) | rice cake · custom · memorial ceremony | rice cake · memorial ceremony · Thanksgiving | 뜻 안 됨 |
| F43 | a8-3 'play games with their ___' (relatives) | ancestors · elders · blessings | ancestors · blessings · tombs | 조상 · 복 · 무덤과는 놀 수 없음 |
| F44 | a8-3 '송편, … a traditional Korean ___' (rice cake) | custom · memorial ceremony · gesture | memorial ceremony · gesture · privilege | 송편은 음식 — offering 은 들어맞아 쓰지 않음 |
| F45 | a9-1 'many unique ___' (aspects) | ordinary occasions · costumes · side dishes | ordinary occasions · boiled rice · nobility | unique 와 ordinary 가 맞서고 boiled rice · nobility 는 many 와 안 됨 |
| F46 | a9-2 '___, on traditional holidays' (However) | finally · instead · include | include · alphabet · popular | 문장 앞 이음말 자리에 안 됨 |
| F47 | a9-4 '___, the Korean language …' (Finally) | instead · however · alphabet | instead · alphabet · popular | 강의 첫 문장 — instead 는 대신할 앞말이 없음 |
| F48 | a9-4 '___, Chinese characters were used' (Instead) | however · finally · nobility | nobility · popular · include | 모두 안 됨 |
| F49 | a10-4 'Many people ___ a museum without walls' (regard 경주 as) | contains · witness · surrounded | contains · filled with · geographical | people + contains 수 안 맞음 · 나머지는 동사 아님 (빈칸 범위는 판단 J13 이라 그대로) |
| F50 | a10-5 'many beautiful ___ to visit' (spots) | remains · peninsula · landscape | peninsula · landscape · vacation | many 뒤 단수 꼴 — 안 됨 |
| F51 | a11-1 'did the Games ___ Korea's rapid growth' (showcase) | dominate · function · represent | dominate · function · imprisoned | did 뒤 과거형 안 됨 · 성장을 '지배'하지 않음 |
| F52 | a11-2 'which many ___ regard as …' (political scientists) | principles · slogans · first-time voters | principles · slogans · repression | 사람이 아님 |
| F53 | a11-3 'rather than relying on ___' (slogans) | first-time voters · direct presidential elections · political scientists | first-time voters · direct presidential elections · repression | 후보를 고를 때 기대는 것으로 뜻 안 됨 |
| F54 | a12-1 'has been ___ so frequently' (revised) | administered · eased · climbing | climbing · unfold · narrow | 시험이 '오르지' 않음 · unfold · narrow 는 꼴이 안 맞음 |
| F55 | a12-1 'Although frequent ___ show …' (reforms) | social classes · transformations · consistency | social classes · consistency · poverty | 'frequent consistency' 모순 · poverty 는 show 와 수 안 맞음 |

### 2-2. 영어 문장 (소리 바뀜 있음)

| # | 강의 | 전 | 뒤 | 함께 바뀐 것 |
|---|---|---|---|---|
| F18 | a2-1 #2 | … deep emotion that we rarely **say** out loud? | … that we rarely **share** out loud? | 덩어리 'that we rarely share out loud?' (한국어 줄 · 덩어리 한국어 그대로) · 낱말 out loud 밑줄 자리 |
| F19 | a2-2 #1 | … all of us remarkably **close-knit**. | … all of us remarkably **close**. | 덩어리 'all of us remarkably close.' (한국어 그대로) |
| F24 | a4-3 #3 | **Watching her example**, … but a **collaborative** commitment we renew every day. | **Watching her**, … but a **shared** commitment we renew every day. | 한국어 줄 '어머니의 모범을 보며, … 매일 새롭게 다지는 협력적인 약속이라는' → '어머니를 지켜보며, … 매일 함께 새롭게 다지는 약속이라는' · 덩어리 첫 · 끝 · 낱말 밑줄 자리(F04 · F31 보기도 이 문장으로 다시 따짐) |
| F25 | a5-2 #3 | …, which **I've been trying** to tackle in order of priority. | …, which **I try** to tackle in order of priority. | 한국어 줄 '…처리하려고 꾸준히 노력해오고 있습니다.' → '…처리하려고 노력합니다.' · 덩어리 'which I try to tackle' = '그 일들을 처리하려고 노력합니다' |
| F30 | a12-1 #4 | … has been adjusted **almost** every few years since. | … has been adjusted every few years since. | 한국어 줄 '그 이후 거의 몇 년마다' → '그 이후 몇 년마다' · 덩어리 'every few years since.' = '그 이후 몇 년마다.' |

### 2-3. 한국어 줄 · 한국어 덩어리 (한국어 줄은 소리 바뀜, 덩어리 한국어는 없음)

| # | 강의 | 칸 | 전 | 뒤 |
|---|---|---|---|---|
| F20 | a3-3 #2 | 한국어 줄 · 덩어리 4 | …그를 누구보다도 신뢰합니다. / 누구보다도. | …그를 그 누구 못지않게 신뢰합니다. / 그 누구 못지않게. |
| F21 | a5-1 #3 | 한국어 줄 · 덩어리 1 | 아침 식사는 늘 시간에 쫓기지만, … | 아침 식사는 자주 시간에 쫓기지만, … |
| F22 | a6-2 #6 | 한국어 줄 · 덩어리 1 | 저는 운동과 장보기, 영어 연습을 할 시간도 따로 마련하는데, … | 저는 운동하고 볼일을 보고 영어를 연습할 시간도 따로 마련하는데, … |
| F23 | a6-5 #5 | 한국어 줄 · 덩어리 4 | …결코 가족을 희생시키는 대가가 되어서는 안 된다는 것을 … | …결코 가족을 희생하면서까지 이어져서는 안 된다는 것을 … |
| F65 | a5-3 #3 | 한국어 줄 · 덩어리 2 | 차를 한 잔 하며 | 차를 한잔하며 |
| F68 | a12-3 #2 | 한국어 줄 | …가운데에도 전혀 누그러지지 않았습니다. | …가운데에도 누그러지지 않았습니다. |
| F56 | a3-1 #2 | 덩어리 2 | 한때 저에게는 폭넓은 친구들이 있었지만, | 한때 저에게 폭넓은 친구들이 있었다는 것을 깨닫게 되는데, |
| F57 | a1-4 #3 | 덩어리 1~3 | 저는 차를 마시며 / 친구들과 이야기하는 것도 좋아합니다 / 커피숍에서. | 저는 차 마시는 것을 좋아합니다 / 그리고 친구들과 이야기하는 것도 / 커피숍에서 역시. |
| F58 | a5-2 #1 | 덩어리 3 · 4 | 목표를 세웁니다 / 업무 효율을 높이기 위한. | 높이기 위한 목표를 세웁니다 / 우리가 일하는 효율을. |
| F59 | a11-1 #1 | 덩어리 3 · 4 | 표현의 자유와 / 언론, 정치 집회의 자유를 엄격히 제한하던 정권이었습니다. | 그 정권은 표현의 자유를 엄격히 제한했고, / 언론과 정치 집회의 자유도 마찬가지였습니다. |
| F60 | a11-3 #2 | 덩어리 3 · 4 | 구호에 의존하거나 / 주변 사람들의 의견에 기대기보다는. | 구호에 기대기보다는, / 또는 주변 사람들의 의견에 기대기보다는. |
| F61 | a12-2 #2 | 덩어리 3 · 4 | 일상의 대화, / 뉴스 헤드라인, 정치 토론 어디에서나 등장하는 문제입니다. | 그 문제는 일상의 대화에 등장하고, / 뉴스 헤드라인과 정치 토론에도 똑같이 등장합니다. |
| F62 | a12-3 #5 | 덩어리 1 · 2 | 친구들이 포기하는 모습을 보며 자라 온 저로서는 / 경제적인 이유로 꿈을, | 친구들을 지켜보며 자라 온 저로서는, / 그 친구들이 경제적인 이유로 꿈을 포기하는 모습을, |
| F72 | a12-1 #6 | 덩어리 3 | …미쳐야 한다는 점입니다, | …미쳐야 한다는 점입니다 |

### 2-4. 낱말 카드

| # | 강의 | 칸 | 전 | 뒤 | 소리 |
|---|---|---|---|---|---|
| F69 | a2-5 #3 | word · say | contributing to (contribute to) · 말하기 'contributing to' | contribute to · 'contribute to' (밑줄 'contributing to' 그대로) | 바뀜(낱말 1) |
| F71 | a9-2 #2 | word · say | Western style | Western-style | 바뀜(낱말 1) |
| F34 | a8-2 #4 | meaning (ritual · 형용사) | 의식, 의례 | 의식의, 의례의 | 없음 |
| F70 | a8-3 #2 | meaning (offering) | 제물, (신께) 바치는 것 | 제물, (조상·신께) 바치는 것 | 없음 |

### 2-5. 강의 제목 (사장님 '틀린 강의 제목 · 화면 문구는 고쳐도 됨' — 소리 없음)

| # | 강의 | 칸 | 전 | 뒤 |
|---|---|---|---|---|
| F26 | a7-2 | title · menuLabel · 안내 칸 · adult.json | The Kingdoms Are Divided (삼국의 분열과 통일) · '7-2. The Kingdoms Are Divided' | The Three Kingdoms and Unification (삼국 시대와 통일) · '7-2. The Three Kingdoms and Unification' |
| F66 | a10-3 | title · 안내 칸 · adult.json | Korean Folk Village (한국 민속촌) | Korean Folk Village (한국민속촌) |

## 3. 바꾼 소리 글 (spoken-texts.cjs 정의 — `adult-spoken-diff.cjs` 로 셈) — 새로 22 · 안 쓰게 된 것 22

| 강의 | 종류 | 새 글 |
|---|---|---|
| a2-1 | 영어 문장 | Whenever we think about our families, don't most of us carry quiet stories of gratitude and deep emotion that we rarely share out loud? |
| a2-1 | 덩어리 | that we rarely share out loud? |
| a2-2 | 영어 문장 | I'm fortunate to have a wonderful family of four: my spouse, our son, our daughter, and myself, all of us remarkably close. |
| a2-2 | 덩어리 | all of us remarkably close. |
| a2-5 | 낱말 | contribute to |
| a3-3 | 한국어 줄 | 제가 도움이 필요할 때마다 그는 제 문제를 자기 일처럼 여기는데, 그래서 저는 그를 그 누구 못지않게 신뢰합니다. |
| a4-3 | 영어 문장 | Watching her, I've come to understand that caring for family isn't an occasional duty but a shared commitment we renew every day. |
| a4-3 | 덩어리 | Watching her, |
| a4-3 | 덩어리 | but a shared commitment we renew every day. |
| a4-3 | 한국어 줄 | 어머니를 지켜보며, 저는 가족을 돌보는 일이 가끔 하는 의무가 아니라 매일 함께 새롭게 다지는 약속이라는 것을 깨닫게 되었습니다. |
| a5-1 | 한국어 줄 | 아침 식사는 자주 시간에 쫓기지만, 저는 전통적인 한식이든 간단한 빵과 샐러드든 제대로 챙겨 먹으려고 합니다. |
| a5-2 | 영어 문장 | Once the meeting wraps up, I turn to the tasks I've set for the day, which I try to tackle in order of priority. |
| a5-2 | 덩어리 | which I try to tackle |
| a5-2 | 한국어 줄 | 회의가 끝나면 저는 그날 해야 할 일에 착수하는데, 그 일들을 우선순위에 따라 처리하려고 노력합니다. |
| a5-3 | 한국어 줄 | 점심값은 각자 계산하지만 우리는 늘 차를 한잔하며 마무리하는데, 이 작은 습관이 팀을 놀라울 만큼 서로 지지하게 만들어 주었습니다. |
| a6-2 | 한국어 줄 | 저는 운동하고 볼일을 보고 영어를 연습할 시간도 따로 마련하는데, 균형 잡힌 주말을 보내야 월요일을 훨씬 잘 맞을 수 있다는 것을 깨달았기 때문입니다. |
| a6-5 | 한국어 줄 | 우리가 도착할 때 부모님의 얼굴이 환해지는 것을 보면, 제가 일에 쏟는 성실함이 결코 가족을 희생하면서까지 이어져서는 안 된다는 것을 다시금 깨닫게 됩니다. |
| a9-2 | 낱말 | Western-style |
| a12-1 | 영어 문장 | The College Scholastic Ability Test, first administered in 1993, replaced the previous national exam, yet even this system has been adjusted every few years since. |
| a12-1 | 덩어리 | every few years since. |
| a12-1 | 한국어 줄 | 1993년에 처음 시행된 대학수학능력시험은 이전의 학력고사를 대체했지만, 이 제도조차 그 이후 몇 년마다 조정되어 왔습니다. |
| a12-3 | 한국어 줄 | 첫 번째는 명문대의 한정된 자리를 두고 벌어지는 치열한 경쟁인데, 이 경쟁은 학생 수가 줄어드는 가운데에도 누그러지지 않았습니다. |

- 영어 문장 5 · 덩어리 영어 6 · 한국어 줄 9 · 낱말 2. 이 중 이미 클립이 있는 글(예: VOCA 의 'contribute to')이 있을 수 있음 — 주 세션의 `generate-azure-ava.mjs --dry-run` 이 셈.
- 소리를 안 내는 것 확인: spoken-texts.cjs 는 STUDENT · ADULT 에서 `items[].text` · `chunks[].en` · `words[].say` · 한국어 `paragraph` 만 더함 —
  빈칸 보기(choices) · 뜻(meaning) · 품사(pos) · 덩어리 한국어(chunks[].ko) · 제목 · 안내 칸은 없음. 실제로 덩어리 한국어만 바꾼 a1-4 · a3-1 · a11-1 ·
  a11-3 · a12-2 와 보기 · 뜻만 바꾼 강의는 '소리 글이 바뀐 쪽'에 없음. 깨기: `--break=choice`(보기 바꿈) 새 글 22 그대로 · `--break=ko`(한국어 줄 바꿈) 23.
- 무료 강의 a1-1 · a1-2: a1-1 은 빈칸 보기만 바뀜 → 무료 소리 키 그대로(`buildFreeSpeechKeys.mjs --check` exit 0).
- STUDENT 와 같이 쓰는 영어(7~10과)는 하나도 안 바꿈 → STUDENT 클립 영향 없음.

## 4. 고치지 않은 것과 까닭

| 무엇 | 까닭 |
|---|---|
| F01 a1-6 individually | 판단 J01 (사장님 답 전) |
| F27 a10-4 · F28 a9-2 · F29 a9-1 · F67 a7-4 | STUDENT 와 같이 쓰는 문장 — 사장님 '4개다 그대로 두자' |
| J02~J18 에 걸린 것 | 판단 필요 — J03 a4-5 · J05 a10-4 · J06 a12-3 영어 · J08 a3-5 제목 · J10 hobby circle · J12 낱말 더하기 · J14 덩어리 부호 · J15 a6-5 끊기 · J16 규칙 등 손대지 않음. F49 는 보기만 고치고 빈칸 범위(J13)는 그대로, F62 는 덩어리 한국어만 고치고 영어(J06)는 그대로 |
| F63 · F64 · F73 · F74 | 성인반이 아님(다른 일꾼 몫) |
| 새로 본 빈칸 의심 3 (안 고침) | 감사가 읽고 통과시킨 빈칸이라 주 세션 판단으로 남김: a5-2 'building the kind of ___ habits'(collaborative) ← **supportive** 가 꽤 들어맞음 · a6-3 'into a ___ family activity'(collaborative) ← supportive 가 들어맞을 만함 · a5-4 'the day's most ___ tasks'(demanding) ← collaborative · rushed 가 문법상 들어감. 고치려면 `CHOICE_FIX` 에 한 줄씩 |
| a6-2 의 legacyPath 가 남성용 PPT 를 가리킴 | 화면 밖 칸 · 점검 틀림 목록에 없음 — 적기만 함 |

## 5. 돌린 검사

| 검사 | 결과 | 깨기 |
|---|---|---|
| `node scripts/build-adult-content.mjs --check` | exit 0 — 55강의 · 12장 | 새 표 깨기 11가지(보기가 정답 · 장 밖 낱말 · 없는 카드 · 규칙과 같음 · 한국어 줄에 없음 · 안 쓰인 줄 · 덩어리 영어 다름 · EN_FIX 문장에 덩어리 고침 · 안 쓰인 WORD_FIX · 같은 영어 · 안 쓰인 제목) 11/11 멈춤 (스크래치 사본으로 — 저장소 파일 안 바꿈) |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/check-adult-blank-choices.cjs` | PASS — 빈칸 318 · (1) 정답이 보기 0 · (2) 정답 낱말의 다른 꼴 0 · (3) 알려진 들어맞는 꼴 0 (40/40 빈칸) | HEAD 사본 `--dir` → (3) 57 FAIL · `--break=same` → (1) 1 FAIL · `--break=lemma` → (2) 1 FAIL |
| `node docs/adult/korean-words-on-screen.cjs` | PASS — 글 칸 85,863 | `--break` exit 1 (1곳) |
| `node docs/qa-2026-09-18/scripts/check-student-dictation.cjs --course adult` | PASS (228문장 · 거꾸로 놓은 앞부분 228 · 첫 타일 뒤 힌트 228) | (도구 자체의 깨기는 이번에 다시 안 돌림) |
| `node docs/qa-2026-09-18/scripts/check-student-original.mjs` | exit 0 — 설명 없음 0 · 낡은 예외 0 | — |
| `node scripts/buildFreeSpeechKeys.mjs --check` | exit 0 (32 무료 강의 · 315 키) | — |
| `node docs/qa-2026-09-18/회귀점검-1002/고침/adult-spoken-diff.cjs` | 새 소리 글 22 · 없어진 22 (13쪽) | `--break=choice` 22 그대로 · `--break=ko` 23 |
| `git diff --stat` | 내용이 바뀐 강의 파일 35 + adult.json (줄 끝만 바뀐 20파일은 `git checkout` 으로 되돌림 — 내용 같음) | — |

tsc · next build 는 안 돌림(TS 파일 안 바꿈 — 통합 일꾼 몫).

## 6. 남의 몫에서 찾은 것 (고치지 않음)

- **`public/search-index.json`** (git 에 있음): a7-2 · a10-3 제목이 옛 글로 남음 — `node scripts/buildSearchIndex.mjs` 로 다시 만들어야 함(prebuild 가 돌리지만 커밋된 파일도 맞춰야).
- 음성: 위 22글 — `node scripts/generate-azure-ava.mjs --dry-run` 으로 pending 확인 → 생성 → R2 먼저.
- 운영 확인 거리: a2-3 · a5-3 · a8-2 · a9-4 빈칸 보기, a7-2 메뉴 제목, a4-3 · a5-2 · a12-1 새 문장 소리 · 받아쓰기.
