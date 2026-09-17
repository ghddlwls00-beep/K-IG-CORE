#!/usr/bin/env node
/**
 * READING passages pr001–pr032 — every audit finding in this range (R-03 … R-20 and the
 * matching parts of R-01, R-02, R-15, R-17, R-18, R-20) plus the same kinds of error found
 * while reading each passage in full (owner rule: judge by what is right, not by the book).
 *
 * Passages that are exam items keep only the passage: pr001 #5 ("children prefer to talk to
 * their other-sex parent") is the planted "irrelevant sentence" of a 무관한 문장 question —
 * it contradicts #4/#6 — and pr010 #6 ("Below are presented some methods…") points at a list
 * that is not in the lesson.
 * pr032 #2 claimed that noisy eating shows appreciation "in some parts of Korea" (R-19, not
 * true of Korean etiquette); it now uses the well-documented Japanese noodle example.
 * Duplicated passages (R-01: pr007 = pr012, pr008 ⊂ pr026, pr009 = pr036) get the same
 * corrections; whether one of each pair is replaced is the owner's decision.
 *
 * Each passage is checked against the hash of the text that was read (lib-reading-edit.cjs).
 *   node apply-reading-passages-001.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-03 — logic restored; #5 was the exam's irrelevant sentence
sentences("pr001", "be89e20349", [
  ["Boys and girls speak differently.", "남자아이와 여자아이는 말하는 방식이 다르다."],
  ["Scientists say that their differences create problems when mothers talk to sons and fathers talk to daughters.",
    "과학자들은 어머니가 아들에게, 아버지가 딸에게 말할 때 이 차이 때문에 문제가 생긴다고 말한다."],
  ["For instance, a mother's good counsel may not work on her son, and a father's may not work on his daughter.",
    "예를 들어, 어머니의 좋은 조언이 아들에게는 통하지 않고, 아버지의 조언이 딸에게는 통하지 않을 수 있다."],
  ["That doesn't mean, though, that parents and their other-sex children are doomed to miscommunicate with each other.",
    "하지만 그렇다고 해서 부모와 성별이 다른 자녀가 서로 의사소통에 실패할 운명이라는 뜻은 아니다."],
  ["Their communication will be more successful if parents respect their other-sex child's different way of speaking.",
    "부모가 성별이 다른 자녀의 다른 말하기 방식을 존중한다면 그들의 대화는 더 성공적일 것이다."],
], "R-03");
// R-04
en("pr002", 2, "dirty smoke of putting too chemicals into the air.", "dirty smoke and putting too many chemicals into the air.");
ko("pr002", 2, "(그러나) 계속된", "계속된");
sentences("pr003", "f1e084220c", [
  ["There is a balance in nature that can be hurt by the smallest change in living conditions.",
    "자연에는 생활 조건의 아주 작은 변화로도 깨질 수 있는 균형이 있다."],
  ["For example, in a healthy environment, the amount of plant food is just right for the number of fish in a river.",
    "예를 들어, 건강한 환경에서는 식물성 먹이의 양이 강에 사는 물고기의 수에 딱 알맞다."],
  ["However, when the river is dammed, the balance changes.", "그러나 강에 댐을 막으면 그 균형이 바뀐다."],
  ["Too many fish or too much plant life can make the river unlivable.",
    "물고기가 너무 많거나 식물이 너무 많으면 강은 생물이 살 수 없는 곳이 될 수 있다."],
]);
// R-16 — quote marks, spelling; the bambuco's origin is debated (Spanish, Indigenous, African)
sentences("pr004", "f2ef44e7b9", [
  ["Two Colombian rhythms have a foreign origin.", "콜롬비아의 두 리듬은 외국에서 유래했다."],
  ["The 'cumbia' was created by African slaves who were brought to the hot regions of the country to work in the gold mines.",
    "'cumbia'는 금광에서 일하도록 그 나라의 더운 지역으로 끌려온 아프리카 노예들이 만들었다."],
  ["It was a sad song of these people who missed their families.", "그것은 가족을 그리워한 이 사람들의 슬픈 노래였다."],
  ["In contrast, the 'bambuco' is often said to have a Spanish origin.", "이와 대조적으로 'bambuco'는 흔히 스페인에서 유래했다고 한다."],
  ["It was created in colder zones and used when the Spanish wanted to express love to their girlfriends.",
    "그것은 더 추운 지역에서 만들어졌고, 스페인 사람들이 여자 친구에게 사랑을 표현하고 싶을 때 쓰였다."],
]);
en("pr005", 1, "question adults' idea,", "question adults' ideas,");
// R-05, R-20
ko("pr006", 2, "그리스 민주주의는 사회가 의식적으로 새 법을 만들거나 구법을 바꿀 수 있다는 사실을 알게 됬다.", "그리스의 민주 국가들은 공동체가 의식적으로 새 법을 만들거나 옛 법을 바꿀 수 있다는 사실을 발견했다.");
ko("pr006", 3, "이것은 인간의 문법이 일정 시간에 걸쳐있는 일정 수의 사람에게만 유효한 규칙의 집합이라는 걸 의미한다.", "이것은 인간의 법이 일정 기간 동안 일정한 수의 사람들에게만 유효한 규칙의 집합이라는 뜻이다.");
// R-06 — split at the question/answer units so English and Korean rows match
const MUSIC = [
  ["My belief is that all music has an expressive power, some more and some less, but that all music has a certain meaning behind the notes.",
    "나는 모든 음악에 정도의 차이는 있어도 표현력이 있으며, 모든 음악의 음표 뒤에는 어떤 의미가 있다고 믿는다."],
  ["That meaning constitutes what the piece is saying.", "그 의미가 곡이 말하는 바를 이룬다."],
  [`This whole problem can be stated quite simply by asking, "Is there a meaning to music?" My answer to that would be, "Yes."`,
    `이 문제 전체는 "음악에 의미가 있는가?"라고 묻는 것으로 아주 간단히 말할 수 있다. 그 질문에 대한 내 대답은 "그렇다"이다.`],
  [`And "Can you state in so many words what the meaning is?" My answer to that would be, "No." Therein lies the difficulty.`,
    `그리고 "그 의미가 무엇인지 말로 분명히 표현할 수 있는가?"라는 질문에 대한 내 대답은 "아니다"이다. 바로 거기에 어려움이 있다.`],
];
sentences("pr007", "59a9d406db", MUSIC, "R-06");
sentences("pr012", "fedb67b546", MUSIC, "R-06 (same passage as pr007, R-01)");
// R-07 — "take the line of least resistance" = take the easiest way; sentence boundary restored
const BRAIN = [
  ["The average brain is naturally lazy and tends to take the line of least resistance.",
    "보통 사람의 두뇌는 선천적으로 게을러서 가장 저항이 적은, 즉 가장 쉬운 길을 택하는 경향이 있다."],
  ["The mental world of the ordinary man consists of beliefs which he has accepted without questioning and to which he is firmly attached.",
    "보통 사람의 정신세계는 의심하지 않고 받아들여 굳게 집착하고 있는 믿음들로 이루어져 있다."],
  ["He is instinctively hostile to anything which would upset the established order of this familiar world.",
    "그는 이 익숙한 세계의 기존 질서를 뒤엎을 만한 것이라면 무엇에든 본능적으로 적대감을 느낀다."],
];
sentences("pr008", "5e41ade3b2", BRAIN, "R-07");
sentences("pr026", "9885ff8014", [
  ...BRAIN,
  ["A new idea, inconsistent with some of the beliefs which he holds, means the necessity of rearranging his mind, and this process is laborious, requiring a painful expense of brain-energy.",
    "그가 가진 믿음 일부와 맞지 않는 새로운 생각은 머릿속을 다시 정리해야 한다는 뜻이고, 이 과정은 힘들어서 두뇌의 에너지를 고통스럽게 써야 한다."],
  ["To him and his fellows, who form the vast majority, new ideas and opinions which cast doubt on established beliefs and institutions seem evil just because they are disagreeable.",
    "대다수를 이루는 그와 그의 동료들에게는, 기존의 믿음과 제도에 의문을 던지는 새로운 생각과 의견이 단지 불쾌하다는 이유만으로 악한 것처럼 보인다."],
  ["It is desirable that this attitude should be altered for the progress of society.",
    "사회의 발전을 위해서는 이러한 태도가 바뀌는 것이 바람직하다."],
], "R-07 (same opening as pr008, R-01); 'options' → 'opinions'");
// R-15
const ECONOMY = [
  ["Today, the industrial economy is changing into a knowledge economy based on science and technology.",
    "오늘날 산업 경제는 과학과 기술에 바탕을 둔 지식 경제로 바뀌고 있다."],
  ["Clearly, modern societies are facing a major change into a new economic system where human resourcefulness counts far more than natural resources.",
    "분명히 현대 사회는 천연자원보다 인간의 지략이 훨씬 더 중요한 새로운 경제 체제로의 큰 변화에 직면하고 있다."],
  ["It is brain power that can guarantee our economic success in the midst of the fierce competition of the current free world market.",
    "오늘날 자유 세계 시장의 치열한 경쟁 속에서 우리의 경제적 성공을 보장할 수 있는 것은 바로 두뇌의 힘이다."],
];
sentences("pr009", "deec4c755d", ECONOMY, "R-15");
// pr036 is the same passage (R-01) — corrected in apply-reading-passages-033.cjs against its own hash
sentences("pr010", "6dbdf4d418", [
  ["The use of the Internet is on the rise every year, and this creates many challenges.", "인터넷 사용은 해마다 늘고 있으며, 이로 인해 많은 과제가 생기고 있다."],
  ["One of the biggest challenges in the Internet world is security or safety.", "인터넷 세계에서 가장 큰 과제 중 하나는 보안, 즉 안전이다."],
  ["Businesses, for example, need to make sure that their sites on the Internet are safe for their users.", "예를 들어, 기업들은 인터넷에 있는 자사 사이트가 사용자에게 안전한지 확인해야 한다."],
  ["They need to know who e-mail senders are and whether information coming and going is correct.", "그들은 이메일을 보내는 사람이 누구인지, 오가는 정보가 정확한지 알아야 한다."],
  ["Most important, they should take measures to be certain that company secrets remain protected.", "가장 중요한 것은, 회사의 비밀이 계속 보호되도록 확실한 조치를 취해야 한다는 것이다."],
], "#6 pointed at a list of methods that is not in the lesson (exam leftover)");
sentences("pr011", "235cbaefdf", [
  ["The Crane could help us in many ways in the future.", "Crane은 앞으로 여러 면에서 우리에게 도움이 될 수 있을 것이다."],
  ["It could help make a giant telescope.", "그것은 거대한 망원경을 만드는 데 도움이 될 수 있을 것이다."],
  ["We could then see seven times further into space.", "그러면 우리는 우주를 일곱 배나 더 멀리 볼 수 있을 것이다."],
  ["It could fly into space and back again and again.", "그것은 우주로 날아갔다가 돌아오기를 여러 번 되풀이할 수 있을 것이다."],
  ["It could also help build a solar power station in space.", "또한 우주에 태양광 발전소를 짓는 데 도움이 될 수 있을 것이다."],
  ["This would give it extra power for longer flights.", "이것은 더 긴 비행을 위한 추가 동력을 그것에 공급할 것이다."],
  ["Who knows what the future will bring?", "미래에 무슨 일이 일어날지 누가 알겠는가?"],
  ["Perhaps it will one day take people for sightseeing trips around the moon.", "아마 언젠가는 그것이 사람들을 태우고 달 주위를 도는 관광 여행을 하게 될 것이다."],
]);
// R-08 speaker labels, R-02 PDF spaces, R-20
sentences("pr013", "c089131cee", [
  ["Person A: Since people generally like what they are good at, I propose that our children focus on areas in which they excel.",
    "A: 사람들은 대개 자기가 잘하는 것을 좋아하므로, 나는 우리 아이들이 자신이 뛰어난 분야에 집중할 것을 제안한다."],
  ["To this end, we should test our children’s aptitudes in various subject areas during their last year of elementary school.",
    "이를 위해 우리는 초등학교 마지막 학년 동안 여러 교과 영역에서 아이들의 적성을 검사해야 한다."],
  ["For example, if a child scores well in science, he or she would then attend middle and high schools which specialize in science.",
    "예를 들어, 한 아이가 과학에서 좋은 점수를 받으면 그 아이는 과학을 전문으로 하는 중학교와 고등학교에 진학하게 될 것이다."],
  ["Such a system would prepare students for employment after high school as well as further specialized study at university.",
    "그러한 제도는 학생들이 대학에서 더 전문적인 공부를 하는 것뿐 아니라 고등학교 졸업 후 취업하는 것도 준비시킬 것이다."],
  ["There is plenty of time in life for people to follow other interests.", "사람들이 다른 관심사를 좇을 시간은 인생에 충분히 있다."],
  ["School should be a time for students to develop their strengths because today’s world requires specialists, not generalists.",
    "오늘날의 세계는 두루 아는 사람이 아니라 전문가를 필요로 하므로, 학교는 학생들이 자신의 강점을 키우는 시기여야 한다."],
  ["Person B: I think it is rather unfair to decide our children’s career paths based on the results of an aptitude test taken when they are 11 or 12 years old.",
    "B: 나는 아이들이 11~12세에 치른 적성 검사 결과로 진로를 정하는 것은 다소 불공평하다고 생각한다."],
  ["Areas which children are considered good at in sixth grade may not be the same ones in which they excel by the end of their senior year.",
    "6학년 때 아이들이 잘한다고 여겨지는 분야가 고등학교 마지막 학년이 끝날 무렵 뛰어난 분야와 같지 않을 수도 있다."],
  ["Secondary school should be a time for expanding horizons―not limiting them.", "중고등학교는 시야를 좁히는 시기가 아니라 넓히는 시기여야 한다."],
  ["The only thing students should be required to do is to study a broad range of subjects throughout middle and high school.",
    "학생들에게 요구해야 할 유일한 것은 중고등학교 내내 폭넓은 과목을 공부하는 것이다."],
  ["By the end of high school they would have a much better idea of what they would like to study at university.",
    "고등학교를 마칠 무렵이면 그들은 대학에서 무엇을 공부하고 싶은지 훨씬 더 잘 알게 될 것이다."],
  ["The time for specialized study is in university and graduate school, not earlier.", "전문적인 공부를 할 때는 대학과 대학원이지, 그 이전이 아니다."],
], "R-08, R-02");
// R-17 with relief = 안도하며; KO #2 was a doubled, garbled sentence
sentences("pr014", "f4c3129adb", [
  ["I abandoned the medical profession with relief but I do not regret the five years I spent at the hospital - far from it.",
    "나는 안도하며 의사라는 직업을 그만두었지만 병원에서 보낸 5년을 후회하지는 않는다. 후회하기는커녕 그 반대다."],
  ["They taught me pretty well all I know about human nature, for in a hospital you see it naked and raw.",
    "그 5년은 인간 본성에 대해 내가 아는 거의 모든 것을 가르쳐 주었다. 병원에서는 인간 본성을 꾸밈없이 있는 그대로 보게 되기 때문이다."],
  ["People in pain, people in fear of death do not try to hide anything from their doctor, and if they do, he can generally guess what they are hiding.",
    "고통 속에 있는 사람들, 죽음을 두려워하는 사람들은 의사에게 아무것도 숨기려 하지 않으며, 숨기려 해도 의사는 대개 그들이 무엇을 숨기는지 짐작할 수 있다."],
]);
// R-09
sentences("pr015", "f657456af3", [
  ["Next to worry, probably one of the most potent causes of unhappiness is envy.", "걱정 다음으로 불행의 가장 강력한 원인 중 하나는 아마 시기심일 것이다."],
  ["Envy is, I should say, one of the most universal and deep-seated of human passions.", "시기심은 인간의 감정 가운데 가장 보편적이고 뿌리 깊은 것 중 하나라고 나는 말하고 싶다."],
  ["It is very noticeable in children before they are a year old, and has to be treated with the most tender respect by every educator.",
    "시기심은 한 살이 되기 전의 아이들에게서도 매우 뚜렷이 나타나며, 모든 교육자가 더없이 세심하게 다루어야 한다."],
  ["The very slightest appearance of favoring one child at the expense of another is instantly observed and resented.",
    "다른 아이를 희생시켜 한 아이를 편애하는 기색이 아주 조금만 보여도 아이들은 즉시 알아채고 분개한다."],
  ["Distributive justice, absolute, rigid and unvarying, must be observed by anyone who has children to deal with.",
    "아이들을 돌보는 사람이라면 누구나 절대적이고 엄격하며 한결같은 분배의 공정함을 지켜야 한다."],
], "R-09");
sentences("pr016", "73f605dc02", [
  ["I believe that only one person in a thousand knows the trick of really living in the present.", "나는 천 명 중 단 한 명만이 진정으로 현재를 사는 비결을 안다고 믿는다."],
  ["Most of us spend 59 minutes an hour living in the past with regret for lost joys, or shame for things badly done or in a future which we either long for or dread.",
    "우리 대부분은 한 시간 중 59분을, 잃어버린 기쁨에 대한 후회나 잘못한 일에 대한 부끄러움 속에서 과거를 살거나, 갈망하거나 두려워하는 미래 속에서 산다."],
  ["The only way to live is to accept each minute as an unrepeatable miracle.", "살아가는 유일한 방법은 매 순간을 다시 오지 않을 기적으로 받아들이는 것이다."],
], "R-15");
ko("pr017", 1, "자연의 세계를 접하는 기쁨은 예술가를 위해서만 예비된 것이 아니다.", "자연 세계와 접하는 즐거움은 예술가들만의 것이 아니다.");
ko("pr017", 2, "그것들은, 한적한 산 정상이나 숲의 고요함의 영향하에 자신을 두고자 하는 어떤 사람에게도 이용될 수 있다.", "그 즐거움은 한적한 산꼭대기나 고요한 숲의 영향 아래 자신을 두려는 사람이라면 누구에게나 주어진다.");
ko("pr017", 3, "나는, 자연미가 어떤 개인 또는 어떤 사회의 정신적 발달에 필요한 공간을 가진다고 믿는다.", "나는 자연의 아름다움이 어떤 개인이나 사회의 정신적 성장에 꼭 필요한 자리를 차지한다고 믿는다.");
ko("pr017", 4, "지체시켜 오고 있다고 난 믿는다.", "늦춰 온 것이라고 나는 믿는다.");
// R-20
sentences("pr019", "694caca207", [
  ["An Eskimo once told European visitors that the only true wisdom lives far from mankind, out in the great loneliness, and can be reached only through suffering.",
    "한 에스키모인이 유럽에서 온 방문객들에게, 유일한 참된 지혜는 인간에게서 멀리 떨어진 거대한 고독 속에 살며 고통을 통해서만 이를 수 있다고 말한 적이 있다."],
  ["The great loneliness―like the loneliness a caterpillar endures when she wraps herself in a silky cocoon and begins the long transformation to butterfly.",
    "거대한 고독이란, 애벌레가 비단 같은 고치로 몸을 감싸고 나비가 되는 긴 변화를 시작할 때 견디는 외로움과 같다."],
  ["It seems that we too must go through such a time, when life as we have known it is over and yet we don’t know who we are supposed to become.",
    "우리가 알아 온 삶은 끝났지만 아직 우리가 어떤 사람이 되어야 할지 모르는, 그런 시기를 우리도 겪어야 하는 것 같다."],
  ["All we know is that something bigger is calling us to change.", "우리가 아는 것은 더 큰 무언가가 우리에게 변하라고 부르고 있다는 것뿐이다."],
  ["And though we must make the journey alone, and even if suffering is our only companion, soon enough we will become a butterfly, soon enough we will taste the joy of being alive.",
    "비록 그 여정을 혼자 가야 하고 고통이 유일한 동반자일지라도, 머지않아 우리는 나비가 되고, 머지않아 살아 있다는 기쁨을 맛보게 될 것이다."],
]);
// R-17 green mantle, sentence not in the original ("그런 바보 같은 짓을 한다")
sentences("pr020", "a7bb4393ca", [
  ["Water, soil, and the earth's green mantle of plants make up the world that supports the animal life of the earth.",
    "물과 흙, 그리고 식물이라는 지구의 녹색 외투가 지구의 동물들을 부양하는 세계를 이룬다."],
  ["Although modern man seldom remembers the fact, he could not exist without the plants that harness the sun's energy and manufacture the basic foodstuff he depends upon for life.",
    "현대인은 그 사실을 좀처럼 기억하지 못하지만, 태양 에너지를 이용해 인간이 생명을 의지하는 기본 식량을 만들어 내는 식물이 없다면 인간은 존재할 수 없을 것이다."],
  ["Our attitude toward plants is a singularly narrow one.", "식물에 대한 우리의 태도는 유난히 편협하다."],
  ["If we see any immediate utility in a plant we foster it.", "어떤 식물에서 당장의 쓸모를 발견하면 우리는 그것을 기른다."],
  ["If for any reason we find its presence undesirable or merely a matter of indifference, we may condemn it to destruction forthwith.",
    "어떤 이유로든 그 존재가 바람직하지 않거나 그저 관심 밖의 일이라고 여기면, 우리는 곧바로 그것을 없애 버리도록 선고할지도 모른다."],
], "R-17");
ko("pr021", 1, "양심의 기능은 사회가 자기 보존을 위해 만든 모든 법보다 더욱 효과적이다, 그로 인해 사회 법이 준수되는지를 보기 위해 모든 사람의 가슴안에 경찰을 두고 있다.",
  "사회가 자기 보존을 위해 만든 모든 법보다 더 효과적인 것은 양심의 작용이다. 양심은 모든 사람의 가슴속에 경찰관을 두어 사회의 법이 지켜지는지 살피게 한다.");
ko("pr021", 2, "심지어 사람이 사회가 어떠한 관심을 가지지 않는다고 상상할 수 있는 영역인 인간의 가장 사적인 일에서조차 양심은 사람을 자신의 외부의 이 유기체의 선함에 따라 행하도록 인도하는 것은 주목할 만하다.",
  "사회가 전혀 상관하지 않으리라 생각되는 사람의 가장 사적인 일에서조차, 양심이 그로 하여금 자기 밖에 있는 이 유기체, 곧 사회의 이익에 따라 행동하게 한다는 것은 놀라운 일이다.");
// R-10 flesh and blood = 혈육; the fourth sentence meant the opposite
sentences("pr022", "fac85f17b8", [
  ["Love is not a relationship with a specific person.", "사랑은 특정한 사람과의 관계가 아니다."],
  ["Love of the helpless one is the beginning of brotherly love.", "의지할 데 없는 사람에 대한 사랑이 형제애의 시작이다."],
  ["To love one's own flesh and blood is no achievement.", "자기 혈육을 사랑하는 것은 대단한 일이 아니다."],
  ["Only in the love of those who do not serve a purpose does love begin to unfold.", "아무 쓸모도 없는 사람들을 사랑할 때에야 비로소 사랑이 피어나기 시작한다."],
  ["By having compassion for the helpless one, man begins to develop love for his brother.", "무력한 사람에게 연민을 가짐으로써 사람은 형제를 향한 사랑을 키우기 시작한다."],
], "R-10");
// R-17 executive secretary = 임원 비서
sentences("pr023", "0b7a87b259", [
  ["For the past 25 years you have been a valued and respected employee of this company.", "지난 25년 동안 귀하는 이 회사의 소중하고 존경받는 직원이었습니다."],
  ["Since you started in the mail room in 1979, your contributions to this firm have been invaluable.", "1979년 우편실에서 일을 시작한 이래로 귀하가 이 회사에 한 공헌은 매우 귀중했습니다."],
  ["Your skills led to your being promoted to executive secretary in 1992.", "귀하는 그 능력 덕분에 1992년에 임원 비서로 승진했습니다."],
  ["Thus, it is safe to say that without your contributions over the years, we would not be as successful as we have been.",
    "그러므로 여러 해에 걸친 귀하의 공헌이 없었다면 우리가 지금만큼 성공하지 못했을 것이라고 말해도 좋을 것입니다."],
  ["On behalf of all the executives, we wish you well and hope you enjoy your well-earned retirement.",
    "모든 임원을 대표하여 귀하의 행복을 빌며, 그동안의 노고로 얻은 은퇴 생활을 즐기시기를 바랍니다."],
], "R-17");
ko("pr024", 5, "것은 당연하다", "것은 당연하다.");
sentences("pr025", "dfc42d8abe", [
  ["It is surprising how many times our feelings of despair and anger can be eased if we act instead of just thinking over problems.",
    "문제를 두고 생각만 하는 대신 행동을 하면 절망과 분노의 감정이 얼마나 자주 누그러질 수 있는지 놀라울 정도이다."],
  ["Play and work are healthy actions, relieving the tensions produced by our emotional upsets.", "놀이와 일은 건강한 행동으로, 정서적 동요로 생긴 긴장을 풀어 준다."],
  ["Play is physically restful and relieves tensions as we share our emotions with others.", "놀이는 몸을 쉬게 해 주며, 다른 사람들과 감정을 나누면서 긴장을 풀어 준다."],
  ["Work, too, is an effective means of working off anger and using overflowing energy.", "일 또한 분노를 풀고 넘치는 에너지를 쓰는 효과적인 수단이다."],
  ["Sometimes, ideas come as we begin to act.", "때로는 행동을 시작할 때 생각이 떠오른다."],
  ["Action relieves tensions and sets us free.", "행동은 긴장을 풀어 주고 우리를 자유롭게 한다."],
], "R-15");
sentences("pr027", "a2f8c0be17", [
  ["Don't wish your life away making impossible plans for your future.", "미래를 위한 불가능한 계획을 세우며 인생을 헛되이 보내지 마라."],
  ["Grand plans are fun, but not really helpful if you can't achieve them.", "원대한 계획은 재미있지만, 이룰 수 없다면 실제로는 도움이 되지 않는다."],
  ["And don't let other people pressure you into trying to achieve things that you know are not possible.", "또한 불가능하다고 알고 있는 일을 이루도록 다른 사람들이 당신에게 압력을 가하게 두지 마라."],
  ["You'll only worry about achieving them, and that will trigger a whole host of new anxieties.", "그것을 이루는 일을 걱정하게 될 뿐이고, 그 걱정은 수많은 새로운 불안을 불러일으킬 것이다."],
  ["Set yourself realistic goals, and aim to achieve them one step at a time.", "현실적인 목표를 세우고, 한 번에 한 걸음씩 그것을 이루도록 하라."],
  ["Remember that life is precious and you need to live in the present as well as hold on to your dreams for the future.",
    "인생은 소중하며, 미래에 대한 꿈을 간직하는 것과 함께 현재를 살아야 한다는 것을 기억하라."],
]);
// R-15, RV-04
sentences("pr028", "69792b3453", [
  ["Sometimes you say something you really don't mean.", "때때로 당신은 진심이 아닌 말을 한다."],
  ["But words once spoken, like bullets once fired, can't be recalled.", "그러나 한번 쏜 총알처럼, 한번 한 말은 되돌릴 수 없다."],
  ["Before you say something needlessly hurtful, calm down.", "쓸데없이 상처를 주는 말을 하기 전에 마음을 가라앉혀라."],
  ["Speak with reason, not just emotion. Otherwise, you may say something you'll always regret.", "감정만이 아니라 이성을 가지고 말하라. 그렇지 않으면 두고두고 후회할 말을 하게 될지도 모른다."],
], "R-15");
// R-17 catching yourself = 스스로 알아차리기, R-20
sentences("pr029", "2143b0958c", [
  ["When you begin noticing yourself interrupting others, you’ll see that this is nothing more than an innocent habit.",
    "다른 사람의 말에 끼어드는 자신을 알아차리기 시작하면, 이것이 그저 악의 없는 습관일 뿐이라는 것을 알게 될 것이다."],
  ["To correct it, all you have to do is to begin catching yourself when you forget.", "그것을 고치려면, 깜빡하고 끼어들 때 스스로 알아차리기 시작하기만 하면 된다."],
  ["Remind yourself to be patient and wait.", "참고 기다리라고 스스로에게 일깨워라."],
  ["Tell yourself to allow the other person to finish speaking before you take your turn.", "당신이 말할 차례가 되기 전에 상대방이 말을 끝내도록 하라고 스스로에게 말하라."],
  ["You’ll notice, right away, how much the interactions with the people in your life will improve as a direct result of this simple act.",
    "이 간단한 행동의 직접적인 결과로 당신 삶 속 사람들과의 관계가 얼마나 좋아지는지 곧바로 알게 될 것이다."],
  ["The people you communicate with will feel much more relaxed around you when they feel heard and listened to.",
    "당신과 대화하는 사람들은 자기 말이 들리고 경청되고 있다고 느낄 때 당신 곁에서 훨씬 더 편안함을 느낄 것이다."],
], "R-17, R-20");
// R-18 — the note's closing moves to the sentence it belongs to, so #10 and #11 line up again
sentences("pr030", "7f391978aa", [
  ["Once a week, write a heartfelt letter.", "일주일에 한 번, 진심을 담은 편지를 써라."],
  ["Taking a few minutes each week to do so does many things for you.", "매주 몇 분을 내어 그렇게 하면 당신에게 여러 가지로 도움이 된다."],
  ["Picking up a pen slows you down long enough to remember the beautiful people in your life.", "펜을 들면 당신은 삶 속의 고마운 사람들을 떠올릴 만큼 충분히 속도를 늦추게 된다."],
  ["The act of sitting down to write helps to fill your life with appreciation.", "앉아서 편지를 쓰는 행동은 당신의 삶을 감사로 채우는 데 도움이 된다."],
  ["Once you decide to try this, you’ll probably be amazed at how many people appear on your list.", "일단 이것을 해 보기로 하면, 당신의 명단에 얼마나 많은 사람이 오르는지 아마 놀라게 될 것이다."],
  ["The purpose of your letter is very simple: to express love and gratitude.", "편지의 목적은 아주 단순하다. 사랑과 감사를 표현하는 것이다."],
  ["Don’t worry if you’re not good at writing letters.", "편지를 잘 쓰지 못한다고 걱정하지 마라."],
  ["If you can’t think of much to say, start with short little notes like, “Dear Jasmine, How lucky I am to have friends like you in my life!",
    "할 말이 잘 떠오르지 않으면 이런 짧은 쪽지로 시작하라. “사랑하는 Jasmine, 내 삶에 너 같은 친구가 있다니 나는 얼마나 운이 좋은지!"],
  ["I am truly blessed, and I wish you all the happiness and joy that life can bring. Love, Richard.”",
    "나는 정말 축복받았어. 삶이 줄 수 있는 모든 행복과 기쁨이 너에게 있기를 바라. Richard가.”"],
  ["Not only does the act of writing a note like this focus your attention on what’s right in your life, but the person receiving it will be touched and grateful.",
    "이런 쪽지를 쓰는 행동은 당신 삶에서 좋은 것에 주의를 기울이게 해 줄 뿐 아니라, 쪽지를 받는 사람도 감동하고 고마워할 것이다."],
  ["Often this simple action starts a chain of loving actions whereby the person receiving your letter may decide to do the same thing to someone else, or perhaps will act and feel more loving toward others.",
    "흔히 이 간단한 행동은 사랑의 행동을 연달아 일으켜, 당신의 편지를 받은 사람이 다른 누군가에게 같은 일을 하기로 하거나, 다른 사람들에게 더 다정하게 행동하고 느끼게 될 수도 있다."],
], "R-18");
ko("pr031", 1, "가질수 있는", "가질 수 있는");
// R-11 (meaning reversed), R-19 (not true of Korean etiquette)
sentences("pr032", "062f499383", [
  [`The old saying "When in Rome, do as the Romans do" is never more true than when at the dinner table.`,
    `"로마에 가면 로마 사람들이 하는 대로 하라"는 옛말은 식탁에서만큼 잘 들어맞는 때가 없다.`],
  ["In Japan, for example, slurping noodles noisily is a way of showing that you are enjoying the meal.",
    "예를 들어 일본에서는 국수를 소리 내어 후루룩 먹는 것이 음식을 맛있게 먹고 있다는 표시이다."],
  ["But in most Western countries no noise should be made while eating.", "그러나 대부분의 서양 국가에서는 식사하는 동안 소리를 내서는 안 된다."],
  ["Eating utensils, too, differ from country to country.", "식사 도구 역시 나라마다 다르다."],
], "R-11, R-19");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
