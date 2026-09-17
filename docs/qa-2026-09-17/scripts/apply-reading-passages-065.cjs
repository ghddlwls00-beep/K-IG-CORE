#!/usr/bin/env node
/**
 * READING passages pr065–pr096 — every audit finding in this range (R-22 … R-29, R-31, R-32,
 * R-33, R-41, R-42, R-44, R-45, R-46 parts) plus the same kinds of error found while reading.
 *
 *  - pr066 (R-22) was a damaged copy of pr085's mole passage: rebuilt from pr085 (R-01 pair).
 *  - pr067 (R-23) lost the pig's first line and had the fox claim the sun trip, which breaks
 *    the joke ("it will melt"); the fox now boasts of Mars and the pig's line is restored.
 *  - pr070 (R-25) taught Mehrabian's 55/38/7 figures as a rule for all first impressions and
 *    misquoted them (35/10). Rewritten to say what the experiment actually measured.
 *  - pr077 (R-26) said science is split on global warming; rewritten to the current consensus
 *    (IPCC AR6: human influence has "unequivocally" warmed the climate).
 *  - pr081 (R-31): sentence order restored (intro → claim → "An example…" → the example).
 *  - pr090 (R-24): the missing "the child influences both mother and father" restored and the
 *    one-word fragments joined, so English and Korean rows match.
 *  - pr092: warts are caused by a virus; "caused by fear" softened to what stress can do.
 *  - pr078 (a nun joke, R-32) and pr080 (Paul Auster, R-29/R-43) keep their content for the
 *    owner/lawyer; only typos, the exam answer "답 2 5" and row alignment are fixed.
 *
 *   node apply-reading-passages-065.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

ko("pr065", 3, "과학자들은 한가지 그러한 에너지는 태양열 에너지라고 생각한다.", "과학자들은 그런 에너지원 중 하나가 태양 에너지라고 생각한다.");
ko("pr065", 4, "그것은 전기를 생산하는데 사용될수 있고 그것은 그리고 나서 차를 운행하고 비행기를 날리는데 사용될수 있다.", "태양 에너지로 전기를 만들 수 있고, 그 전기로 자동차를 움직이고 비행기를 띄울 수 있다.");
ko("pr065", 5, "지금은 우리는 청정 에너지를 찾기 위해 조치를 취해야만 한다.", "이제 우리는 청정 에너지를 찾기 위한 조치를 취해야 한다.");
const MOLES = [
  ["According to ancient superstitions, moles reveal a person’s character.", "옛 미신에 따르면 점은 사람의 성격을 드러낸다."],
  ["For example, a mole on one’s nose means that he or she is strong-willed and trustworthy.", "예를 들어 코에 있는 점은 그 사람이 의지가 강하고 믿을 만하다는 뜻이다."],
  ["Moles are also believed to foretell the future.", "점은 미래를 예언한다고도 여겨진다."],
  ["Having a mole over one’s right eyebrow means he or she will be lucky with money and have a successful career.", "오른쪽 눈썹 위에 점이 있으면 돈복이 있고 직업에서 성공한다는 뜻이다."],
  ["A mole on the hand, however, is the most desired.", "그러나 사람들이 가장 바라는 것은 손에 있는 점이다."],
  ["It forecasts talent, health, and happiness.", "그것은 재능과 건강과 행복을 예고한다."],
];
sentences("pr066", "c2ee49ecfc", MOLES, "R-22 rebuilt from pr085 (R-01)");
sentences("pr085", "7d81224078", [
  ["Moles are dark spots on human skin.", "점은 사람 피부에 있는 짙은 반점이다."],
  ["They can vary in color from light to dark brown or black.", "점의 색은 옅은 갈색에서 짙은 갈색이나 검은색까지 다양하다."],
  ["Almost everyone has at least one mole.", "거의 모든 사람이 적어도 점 하나는 갖고 있다."],
  ...MOLES,
]);
// R-23
sentences("pr067", "47c3fc3735", [
  [`In a meeting of animal space scientists, the chimpanzee proudly announced, "We sent a rocket to the moon. It stayed there for a whole month before making the long trip back to Earth."`,
    `동물 우주 과학자 회의에서 침팬지가 자랑스럽게 말했다. "우리는 달에 로켓을 보냈어. 그 로켓은 한 달 내내 거기 머물다가 지구로 긴 귀환 여행을 했지."`],
  [`"That's nothing," said the fox. "We already sent our spaceship to Mars."`, `"그건 아무것도 아니야." 여우가 말했다. "우리는 벌써 화성에 우주선을 보냈거든."`],
  [`"We can beat you both," said the pig. "We're going to send a rocket straight to the sun."`, `"우리는 너희 둘 다 이길 수 있어." 돼지가 말했다. "우리는 태양으로 곧장 로켓을 보낼 거야."`],
  [`The chimpanzee and the fox laughed loudly and said, "Don't be silly. The rocket will melt before it gets there."`, `침팬지와 여우는 큰 소리로 웃으며 말했다. "어리석은 소리 마. 로켓은 거기 닿기도 전에 녹아 버릴 거야."`],
  [`"No, it won't," said the pig. "We're sending it up at night."`, `"아니, 안 녹아." 돼지가 말했다. "우리는 밤에 보낼 거니까."`],
], "R-23");
ko("pr068", 6, "추돌 했다는", "충돌했다는");
// R-25
sentences("pr070", "26cefbc530", [
  ["A famous psychology experiment is often said to show that your appearance makes up 55% of a first impression.",
    "유명한 심리학 실험 하나가 외모가 첫인상의 55%를 차지한다는 것을 보여 준다고 흔히들 말한다."],
  ["The experiment, however, was not about first impressions.", "그러나 그 실험은 첫인상에 관한 것이 아니었다."],
  ["It looked at how listeners judge a speaker's feelings when the words, the tone of voice, and the facial expression do not match.",
    "그 실험은 말의 내용, 목소리 톤, 얼굴 표정이 서로 맞지 않을 때 듣는 사람이 말하는 사람의 감정을 어떻게 판단하는지를 살펴보았다."],
  ["In that special case, facial expression counted for 55%, tone of voice for 38%, and the actual words for only 7%.",
    "그런 특수한 경우에는 얼굴 표정이 55%, 목소리 톤이 38%, 실제 말의 내용은 7%만 차지했다."],
  ["So it is not safe to conclude that what you say hardly matters; how you look, how you sound, and what you say all work together.",
    "그러므로 무슨 말을 하는지는 거의 중요하지 않다고 결론 내리는 것은 옳지 않다. 어떻게 보이는지, 어떻게 들리는지, 무슨 말을 하는지가 모두 함께 작용한다."],
], "R-25");
// R-32, R-18 boundary
sentences("pr071", "48aabecd75", [
  ["Tests were carried out to study the effects of laughter on the body.", "웃음이 몸에 미치는 영향을 연구하기 위해 실험이 이루어졌다."],
  ["People watched funny movies, while doctors checked their heart rate, blood pressure, breathing, and muscles.", "사람들이 재미있는 영화를 보는 동안 의사들은 그들의 심박수, 혈압, 호흡, 근육을 확인했다."],
  ["It was found that laughter has similar effects to physical exercise.", "웃음이 신체 운동과 비슷한 효과를 낸다는 것이 밝혀졌다."],
  ["It increases blood pressure and the rate of breathing, and it also works several groups of muscles in the face, the stomach, and even the feet.",
    "웃음은 혈압과 호흡수를 높이고, 얼굴과 배, 심지어 발의 여러 근육도 움직이게 한다."],
], "R-32");
ko("pr072", 3, "판매 책임자인", "영업 사원인");
ko("pr072", 4, "성공하기 위해 당신이 알 필요가 있는게 뭔지는 회사가 가르켜 줄 수 있지만, 회사가 자세까지 가르켜 주진 못한다.", "회사는 성공하는 데 필요한 지식은 가르쳐 줄 수 있지만, 태도까지 가르쳐 줄 수는 없습니다.");
ko("pr072", 5, "열정을 갖은", "열정을 가진");
// R-32 — the Jefferson attribution cannot be traced
en("pr073", 1, "Thomas Jefferson once said that what matters is the courage of one's convictions.", "It is often said that what matters is the courage of one's convictions.");
ko("pr073", 1, "토마스 제퍼슨이, 중요한 건 자신의 확신에 대한 용기이다라고 말한 적이 있다.", "중요한 것은 자기 신념대로 행동하는 용기라는 말이 있다.");
en("pr073", 4, "a good and decent Person,", "a good and decent person,");
ko("pr073", 4, "정면으로 다 대처할 수 있다.", "정면으로 맞설 수 있다.");
// R-28 blunder, R-33
sentences("pr074", "31b6713471", [
  [`"They say best men are molded out of faults," wrote Shakespeare in Measure for Measure, "and, for the most part, become much more the better for being a little bad."`,
    `"사람들 말로는 가장 훌륭한 사람은 결점으로 빚어지며, 대개 조금 나빴던 덕분에 훨씬 더 나은 사람이 된다고 한다."라고 셰익스피어는 Measure for Measure에서 썼다.`],
  ["Thus, each mistake can be seen as a prime opportunity for self-improvement.", "그러므로 모든 실수는 자기 계발의 좋은 기회로 볼 수 있다."],
  ["Indeed, the bigger the blunder, the better its chance of helping you become a better person ― if you know how to make amends.",
    "실제로 실수가 클수록 당신이 더 나은 사람이 되도록 도와줄 가능성도 커진다. 잘못을 바로잡는 법을 안다면 말이다."],
], "R-28, R-33");
sentences("pr075", "1111f2171b", [
  ["Reviews on caffeine and conception conflict.", "카페인과 임신에 관한 연구 결과들은 서로 엇갈린다."],
  ["One study of 2,817 women found no effect of caffeine on their chances of conceiving, while another of 1,909 women linked more than 300 milligrams of caffeine daily to a delay in conception.",
    "2,817명의 여성을 대상으로 한 연구에서는 카페인이 임신 가능성에 아무 영향도 주지 않았지만, 1,909명을 대상으로 한 다른 연구에서는 하루 300밀리그램이 넘는 카페인이 임신 지연과 관련이 있었다."],
], "Korean order matched to the English");
// R-28 rig the game / no happier / goals. Stay (RV-11 card "goals.stay")
sentences("pr076", "3c3245c381", [
  ["People who are happy don't get everything they want, but they want most of what they can get.", "행복한 사람들은 원하는 것을 다 얻지는 못하지만, 얻을 수 있는 것 대부분을 원한다."],
  ["In other words, they rig the game in their favor by choosing to value things that are within their grasp.", "다시 말해, 그들은 손이 닿는 범위 안에 있는 것을 소중히 여기기로 함으로써 게임을 자기에게 유리하게 만든다."],
  ["People who find themselves dissatisfied in life often set unreachable goals for themselves, setting themselves up to fail.", "삶에 불만을 느끼는 사람들은 흔히 이룰 수 없는 목표를 세워 스스로 실패할 수밖에 없게 만든다."],
  ["People who set high goals for themselves and try to reach them are no happier than people who set and reach more modest goals.",
    "스스로 높은 목표를 세우고 그것을 이루려고 애쓰는 사람들이, 더 적당한 목표를 세우고 이루는 사람들보다 더 행복한 것은 아니다."],
  ["Stay within reality and strive to make things better.", "현실의 테두리 안에 머물면서 상황을 더 낫게 만들려고 노력하라."],
], "R-28");
// R-26
sentences("pr077", "967b9e2c27", [
  ["According to scientists, we are leaving our children and grandchildren a frightening inheritance: an increased accumulation of so-called greenhouse gases in the atmosphere and the potentially disastrous climate changes that this increase may bring about.",
    "과학자들에 따르면 우리는 자녀와 손주들에게 무서운 유산을 남기고 있다. 대기 중에 이른바 온실가스가 점점 더 쌓이고, 그로 인해 재앙이 될 수도 있는 기후 변화가 일어나는 것이다."],
  ["Today, almost all climate scientists agree that human activity is warming the planet.", "오늘날 거의 모든 기후 과학자들은 인간 활동이 지구를 덥히고 있다는 데 동의한다."],
  ["A few critics still question how serious the effects will be, but the evidence for global warming is now very strong.", "효과가 얼마나 심각할지에 의문을 제기하는 비판자도 일부 있지만, 지구 온난화의 증거는 이제 매우 확실하다."],
  ["The scientific debate has moved on to how fast the climate will change and what the effects will be.", "과학계의 논의는 기후가 얼마나 빨리 변할지, 그 영향이 어떠할지로 옮겨 갔다."],
  ["It has also fueled a political controversy about what measures should be taken to address the problem of climate change.", "이 문제는 기후 변화에 대처하기 위해 어떤 조치를 취해야 하는지를 둘러싼 정치적 논쟁에도 불을 붙였다."],
], "R-26");
// typos only — content waits for the owner (R-32)
sentences("pr078", "a763193584", [
  ["The doctor's receptionist was startled when a nun stormed out of the examining room and left without paying.", "의사의 접수 직원은 한 수녀가 진찰실에서 뛰쳐나와 진료비도 내지 않고 가 버리자 깜짝 놀랐다."],
  [`When the doctor appeared she asked what had happened. "Well," said the doctor, "I examined her and told her she was pregnant." "Doctor!" exclaimed the receptionist.`,
    `의사가 나타나자 그녀는 무슨 일이 있었느냐고 물었다. "글쎄요," 의사가 말했다. "진찰하고 나서 임신이라고 말해 줬어요." "선생님!" 접수 직원이 소리쳤다.`],
  [`"That can't be!" "Of course not," he replied, "but it sure cured her hiccups."`, `"그럴 리가 없잖아요!" "물론 아니죠." 의사가 대답했다. "하지만 확실히 딸꾹질은 멈췄어요."`],
], "typos/quotes only (R-32 content: owner)");
sentences("pr079", "ad88fedc18", [
  ["A long time ago, a dissatisfied horse asked the gods for longer, thinner legs, a neck like a swan, and a saddle that would grow upon him.",
    "옛날에 불만이 많은 말 한 마리가 신들에게 더 길고 가는 다리, 백조 같은 목, 그리고 몸에서 자라나는 안장을 달라고 빌었다."],
  ["Right away, the merciful gods changed him into a creature having all the new features.", "자비로운 신들은 곧바로 그를 그 새로운 특징을 모두 가진 동물로 바꾸어 주었다."],
  ["But although they had looked attractive separately, the entire assembly shocked him, for he found that he had been changed into an ugly camel.",
    "그러나 하나하나는 멋져 보였던 것들이 모두 합쳐지자 그는 충격을 받았다. 자신이 못생긴 낙타로 변해 버렸기 때문이다."],
  ["“There now,” said the gods, “all your wishes are granted, and you will now live as you’ve wished all your life.”", "“자, 이제 네 소원은 모두 이루어졌으니, 평생 바라던 대로 살게 될 것이다.”라고 신들이 말했다."],
  ["Remember! Not all change is good.", "기억하라! 모든 변화가 좋은 것은 아니다."],
  ["You should be satisfied with what you have.", "가진 것에 만족해야 한다."],
]);
// R-29 exam answer removed, #17/#18 Korean realigned (content/copyright: owner/lawyer, R-43)
en("pr080", 18, "taught me this:If", "taught me this: If");
ko("pr080", 1, "그 해 봄, 나는 처음으로 빅 리그 경기에 데려가졌다.", "그해 봄, 나는 처음으로 메이저리그 경기를 보러 갔다.");
ko("pr080", 2, "시합이 끝난 후에, 우리가 막 출구에 도달했을 때, 나는 Willie Mays를 찾아냈다.", "경기가 끝나고 우리가 막 출구에 다가갔을 때, 나는 Willie Mays를 보았다.");
ko("pr080", 4, "“물론이지, 꼬마야.", "그가 말했다. “물론이지, 꼬마야.");
ko("pr080", 5, "연필 있니?” 그가 대답했다. 나는 주머니에 연필이 없었다.", "연필 있니?” 내 주머니에는 연필이 없었다.");
ko("pr080", 11, "진정한 신봉자의 열렬한 애착으로 검은색과 오렌지색의 모자를 쓴 사람들이 하는 일들을 따라했다.", "진정한 신자처럼 열렬하게 검은색과 주황색 모자를 쓴 그 선수들의 소식을 하나하나 챙겨 보았다.");
ko("pr080", 16, "그것은 내가 그 연필에 대한 특별한 계획을 가지고 있어서가 아니라, 내가 준비되지 않은 채로 있기를 원하지 않기 때문이다.", "연필로 무엇을 하려는 특별한 계획이 있었던 것은 아니지만, 준비 없이 있고 싶지는 않았다.");
ko("pr080", 17, "나는 한 번 빈손으로 있다가 만났고, 나는 그 일이 다시 일어나게 하지 않을 참이다. 적어도 그 세월들이 나를 이처럼 가르쳤다.", "한 번 빈손으로 당한 적이 있었고, 그런 일이 다시 일어나게 둘 생각은 없었다.");
ko("pr080", 18, "만약 너의 주머니에 연필이 있다면, 언젠가 그것을 사용하기 시작할 마음이 들 것이다. 답 2 5", "적어도 세월은 내게 이것을 가르쳐 주었다. 주머니에 연필이 있으면, 언젠가 그것을 쓰기 시작하고 싶어질 가능성이 크다는 것이다.");
// R-31 — original order restored
sentences("pr081", "0216f4609a", [
  ["Everyone makes decisions every day.", "누구나 매일 결정을 내린다."],
  ["What clothes should you wear?", "어떤 옷을 입어야 할까?"],
  ["Should you go out tonight or stay home and study?", "오늘 밤 외출할까, 아니면 집에서 공부할까?"],
  ["Most of the decisions people make are based on what they feel will be the best solution.", "사람들이 내리는 결정 대부분은 무엇이 최선의 해결책일 것 같다는 느낌에 바탕을 둔다."],
  ["Feelings and judgments of how others feel toward you play a major role in how you choose to solve your day-to-day problems.",
    "다른 사람들이 당신을 어떻게 느끼는지에 대한 느낌과 판단은 당신이 일상의 문제를 어떻게 해결할지 정하는 데 큰 역할을 한다."],
  ["True problem solving, however, goes beyond feelings.", "그러나 진정한 문제 해결은 느낌을 넘어선다."],
  ["To solve a problem, you must look beyond how you feel and combine information that you already know with new observations.",
    "문제를 해결하려면 자신의 느낌 너머를 보고, 이미 알고 있는 정보를 새로 관찰한 것과 결합해야 한다."],
  ["Then, on the basis of your knowledge of the situation, you can evaluate the problem and come up with the best way to solve it.",
    "그런 다음 상황에 대해 아는 것을 바탕으로 문제를 평가하고 가장 좋은 해결 방법을 찾아낼 수 있다."],
  ["An example will make this point clear.", "예를 하나 들면 이 점이 분명해질 것이다."],
  ["Imagine that it’s Saturday and you are to meet your friends at the mall at 12:00.", "토요일이고, 12시에 쇼핑몰에서 친구들을 만나기로 했다고 상상해 보라."],
  ["You’ve been busy all morning, and suddenly you notice it is 11:45.", "아침 내내 바빴는데, 문득 보니 11시 45분이다."],
  ["You hurry to get ready and then jump in the car.", "서둘러 준비를 하고 차에 올라탄다."],
  ["What route is probably the fastest?", "어느 길이 가장 빠를까?"],
  ["You know where the mall is, and you choose the best route based on what you know about the distance, the number of stop lights, and the amount of traffic.",
    "당신은 쇼핑몰이 어디 있는지 알고, 거리와 신호등 수와 교통량에 대해 아는 것을 바탕으로 가장 좋은 길을 고른다."],
  ["In short, you make observations and make your best guesses based on what you know and have observed.", "요컨대 당신은 관찰을 하고, 알고 있는 것과 관찰한 것을 바탕으로 최선의 추측을 한다."],
], "R-31");
// R-27 mad = angry, R-33
sentences("pr082", "7bbb47d5d4", [
  ["You can see and feel exactly what this teenage girl is going through.", "이 십대 소녀가 무엇을 겪고 있는지 정확히 보고 느낄 수 있다."],
  ["I can remember feeling very frustrated and confused sometimes in my teens.", "나도 십대 시절 가끔 몹시 좌절하고 혼란스러워했던 것이 기억난다."],
  ["I can also remember my emotions swinging from one extreme to another.", "내 감정이 한 극단에서 다른 극단으로 오락가락했던 것도 기억난다."],
  ["So, for example, I would get incredibly mad about something, usually something silly.", "예를 들면, 나는 어떤 일에, 대개는 사소한 일에 엄청나게 화를 내곤 했다."],
  ["Then I would get mad at myself about being so angry, and then get mad again about what made me angry.", "그러고는 그렇게 화낸 나 자신에게 화가 났고, 다시 나를 화나게 한 일 때문에 또 화가 나곤 했다."],
  ["I seemed to have absolutely no control over these feelings.", "나는 이런 감정을 전혀 다스리지 못하는 것 같았다."],
], "R-27, R-33");
// R-33
sentences("pr083", "a6d09b7722", [
  ["Some people carry on active social lives with computers - their own or the ones available at terminals in public places like cafes, social centers, libraries, etc.",
    "어떤 사람들은 컴퓨터로 활발한 사교 생활을 한다. 자기 컴퓨터를 쓰기도 하고, 카페나 사교 센터, 도서관 같은 공공장소의 단말기를 쓰기도 한다."],
  [`Communicating with others on "bulletin boards", they get to know people they might never meet in the traditional way.`, `"게시판"에서 다른 사람들과 소통하면서, 그들은 전통적인 방법으로는 결코 만나지 못했을 사람들을 알게 된다.`],
  [`For example, a graduate student in San Francisco, California, has made more than fifty "net friends", including a homeless vegetarian who gets around on roller-blades, an HIV-positive police officer, some members of an Iranian family, an 80-year-old detective, and a medical geneticist who studies DNA.`,
    `예를 들어 캘리포니아주 샌프란시스코의 한 대학원생은 롤러블레이드를 타고 다니는 노숙인 채식주의자, HIV 양성인 경찰관, 이란인 가족 몇 명, 80세 탐정, DNA를 연구하는 의학 유전학자를 포함해 50명이 넘는 "인터넷 친구"를 사귀었다.`],
  [`She has gone out on dates with about ten of her "network contacts".`, `그녀는 "인터넷에서 알게 된 사람" 가운데 열 명쯤과 데이트를 했다.`],
  ["In fact, she almost married one.", "실제로 그중 한 명과는 결혼할 뻔했다."],
  ["The romance didn't last.", "그 연애는 오래가지 않았다."],
  ["However, she doesn't blame the computer for breaking up the relationship.", "그러나 그녀는 관계가 깨진 것을 컴퓨터 탓으로 돌리지 않는다."],
], "R-33");
en("pr084", 7, "fit your expectation", "fit your expectation.");
ko("pr084", 5, "전혀 정당하지 않을 수도 있다.", "그저 불공정한 것일 수도 있다.");
// R-27 months ≠ minutes, R-32
sentences("pr086", "0935addd6f", [
  ["Perhaps the greatest thing about being a devoted operagoer is that there is so much room for growth.", "열성적인 오페라 관객이 되는 것의 가장 좋은 점은 아마 성장할 여지가 아주 많다는 것이다."],
  ["Although you have heard an opera once, you can still hear it five or twenty times more.", "한 번 들은 오페라라도 다섯 번, 스무 번 더 들을 수 있다."],
  ["I have heard at least twenty performances of my favorite operas, and I would happily hear them twenty more times.", "나는 좋아하는 오페라의 공연을 적어도 스무 번은 들었고, 기꺼이 스무 번 더 듣겠다."],
  ["With each rehearing, you refine what you know.", "다시 들을 때마다 당신은 알고 있는 것을 다듬게 된다."],
  ["The better you know an opera, the more you will be challenged by the ideas of new singers, conductors, directors, and designers.", "오페라를 잘 알수록 새로운 가수, 지휘자, 연출가, 디자이너의 해석에 더 많은 자극을 받는다."],
  ["Your first experience with Rigoletto and Tosca is only your introduction to those masterpieces.", "Rigoletto와 Tosca를 처음 접하는 것은 그 걸작들에 입문하는 것일 뿐이다."],
  ["Each time you hear a different singer in any of the key roles, you are hearing a new interpretation.", "주요 배역을 다른 가수가 부를 때마다 당신은 새로운 해석을 듣는 것이다."],
  ["Even the same singer will vary on two different occasions.", "같은 가수라도 공연할 때마다 다를 것이다."],
  ["Artists grow and change in their approach to a character based on their own life experiences and their moods.", "예술가들은 자신의 삶의 경험과 기분에 따라 배역에 접근하는 방식이 성장하고 변한다."],
  ["For example, I saw a famous soprano from Eastern Europe sing Tosca twice within ten months.", "예를 들어 나는 동유럽 출신의 유명한 소프라노가 10개월 사이에 Tosca를 두 번 부르는 것을 보았다."],
  ["The first time was a good, honest performance that pleased the audience.", "첫 번째는 관객을 만족시킨 훌륭하고 충실한 공연이었다."],
  ["The second was impressive. Between the performances, the singer’s husband had suddenly died.", "두 번째는 인상적이었다. 두 공연 사이에 그 가수의 남편이 갑자기 세상을 떠났던 것이다."],
  ["The love scenes in the second performance seemed much more moving, and her response to the death of her lover was undeniably heartbreaking.",
    "두 번째 공연의 사랑 장면은 훨씬 더 감동적이었고, 연인의 죽음에 대한 그녀의 반응은 부정할 수 없을 만큼 가슴을 아프게 했다."],
], "R-27, R-32");
// R-32 bigger stores do not save shoppers time
en("pr088", 5, "Also, they have made their stores bigger to minimize time spent shopping.", "Also, they have made their aisles wider to minimize time spent shopping.");
ko("pr088", 5, "또 쇼핑하는 데 걸리는 시간을 최소화하기 위해 매장들의 규모를 확대해 왔다.", "또 쇼핑하는 데 드는 시간을 줄이기 위해 매장 통로를 넓혀 왔다.");
sentences("pr089", "13c14eb73e", [
  ["Competition implies a set of rules that govern the conduct of the opposed parties.", "경쟁에는 맞서는 양쪽의 행동을 규율하는 일련의 규칙이 전제되어 있다."],
  ["In all cases, tricks and physical threats are prohibited.", "어떤 경우든 속임수와 신체적 위협은 금지된다."],
  ["For instance, when two soccer teams play against one another, each team tries to score more goals than the other.", "예를 들어 두 축구팀이 경기를 하면, 각 팀은 상대보다 더 많은 골을 넣으려고 한다."],
  ["But goals can be scored only in a limited number of right ways, and the game is governed by a set of rules.", "그러나 골은 정해진 몇 가지 올바른 방법으로만 넣을 수 있고, 경기는 일련의 규칙에 따라 진행된다."],
], "R-33");
// R-24
sentences("pr090", "1e35aa8734", [
  ["Consider the relationships within a family unit made up of a husband, a wife, and a child.", "남편, 아내, 자녀 한 명으로 이루어진 가족 안의 관계를 생각해 보자."],
  ["The husband influences his wife and child.", "남편은 아내와 자녀에게 영향을 준다."],
  ["The wife influences her husband and child.", "아내는 남편과 자녀에게 영향을 준다."],
  ["The child influences both mother and father.", "자녀는 어머니와 아버지 모두에게 영향을 준다."],
  ["Add another child, a grandparent, an aunt, and an uncle.", "여기에 자녀 한 명, 조부모, 이모와 삼촌을 더해 보자."],
  ["Add a cousin, a neighbor, and friends.", "사촌, 이웃, 친구들도 더해 보자."],
  ["If we were to make this list longer, we would end up with an entire society.", "이 목록을 더 늘려 나간다면 결국 사회 전체가 될 것이다."],
  ["A society is a network of relationships among individuals.", "사회란 개인들 사이의 관계로 이루어진 그물망이다."],
  ["Each will influence the others, and each will be influenced by the others.", "각자가 다른 사람들에게 영향을 주고, 또 다른 사람들에게서 영향을 받는다."],
], "R-24");
// R-46; warts are caused by a virus, so "caused by fear" is softened to what stress does
sentences("pr092", "fb8a22d493", [
  ["Many teenagers dread and fear warts and pimples.", "많은 십대들이 사마귀와 여드름을 몹시 두려워한다."],
  ["A dermatologist, or skin doctor, says that stress and fear may actually make a lot of these skin problems worse.", "피부과 의사는 스트레스와 두려움이 실제로 이런 피부 문제의 상당수를 악화시킬 수 있다고 말한다."],
  ["Dr. Hilton Kline has done studies indicating that, in some cases, warts and pimples get worse with anxiety.", "Hilton Kline 박사는 어떤 경우에는 불안하면 사마귀와 여드름이 심해진다는 것을 보여 주는 연구를 했다."],
  ["According to one of his studies, college students are more likely to break out in pimples just before a big exam.", "그의 한 연구에 따르면 대학생들은 중요한 시험 직전에 여드름이 더 잘 난다."],
  ["He's also shown that warts can be cured through hypnosis, by having the patient imagine that the warts are falling off.", "그는 또 환자가 사마귀가 떨어져 나가는 것을 상상하게 하는 최면으로 사마귀를 치료할 수 있다는 것도 보여 주었다."],
  ["In other words, the mind may play a bigger part in clear skin than we think.", "다시 말해, 깨끗한 피부에는 우리가 생각하는 것보다 마음이 더 큰 역할을 할지도 모른다."],
], "R-46; warts are viral");
// R-41, R-42
sentences("pr093", "9e00522998", [
  ["Killing animals for their fur is wrong.", "모피를 얻으려고 동물을 죽이는 것은 잘못이다."],
  ["Consider the cute mink, the cuddly raccoon, the lovable harp seal.", "귀여운 밍크, 껴안고 싶은 너구리, 사랑스러운 하프물범을 생각해 보라."],
  ["These animals haven't hurt us, so why should we savagely murder these adorable creatures?", "이 동물들은 우리를 해치지 않았는데, 왜 우리가 이 사랑스러운 동물들을 잔인하게 죽여야 하는가?"],
  ["Think of a puppy.", "강아지를 생각해 보라."],
  ["Picture its soulful trusting eyes.", "감정이 가득 담긴, 믿음 어린 그 눈을 떠올려 보라."],
  ["Would you want to wear Spot's hide on your back?", "Spot의 가죽을 등에 걸치고 싶은가?"],
  [`The answer, from any thoughtful individual, must be a resounding "No."`, `생각이 깊은 사람이라면 누구든 대답은 우렁찬 "아니요"일 것이다.`],
], "R-41, R-42");
// R-41 slat → salt, R-44 chance level
sentences("pr094", "9d363945c1", [
  ["Research was done to examine the difference in taste between bread with standard and reduced salt content.", "소금 함량이 보통인 빵과 줄인 빵의 맛 차이를 알아보는 연구가 이루어졌다."],
  ["Three types of bread were prepared, the same in all respects except for salt content.", "소금 함량만 빼고 모든 면에서 똑같은 세 종류의 빵을 준비했다."],
  ["One loaf contained the usual amount, one loaf 10% less, one 20% less.", "한 덩어리에는 보통 양의 소금을, 한 덩어리에는 10% 적게, 한 덩어리에는 20% 적게 넣었다."],
  ["Sixty people were asked if they could tell any difference in taste.", "60명에게 맛의 차이를 구별할 수 있는지 물었다."],
  ["They had to guess which loaf contained the usual amount of salt, 10% less, or 20% less.", "그들은 어느 빵에 보통 양의 소금이 들었고, 어느 빵이 10%, 20% 적은지 추측해야 했다."],
  ["The result showed that only 30% of the guesses were correct, which is not different from what would be expected by chance.", "결과는 추측의 30%만 맞았다는 것을 보여 주었는데, 이는 우연히 맞힐 때와 다르지 않은 수준이다."],
  ["The taste of bread is not necessarily dependent upon the salt content in the bread.", "빵의 맛이 반드시 빵에 든 소금의 양에 좌우되는 것은 아니다."],
], "R-41, R-44");
// R-45 — a 1998 news item: dated as such
en("pr095", 1, "The International Monetary Fund (IMF) said", "In 1998, the International Monetary Fund (IMF) said");
ko("pr095", 1, "국제 통화 기금(IMF)은", "1998년에 국제 통화 기금(IMF)은");
ko("pr095", 2, "그렇지만 그들은 과거의 높은 경제 성장률을 포기해야 한다고 경고했다.", "그러나 IMF는 그 나라들이 과거의 높은 경제 성장률은 포기해야 한다고 경고했다.");
ko("pr095", 5, "달려 있다고 한다", "달려 있다고 한다.");
// R-42 actuation → activation, R-46
sentences("pr096", "c8aeb27555", [
  ["Plants are known to react to environmental pressures such as wind, rain, and even human touch.", "식물은 바람, 비, 심지어 사람의 손길 같은 환경의 압력에 반응한다고 알려져 있다."],
  ["Coastal trees, for example, become shorter and stronger in response to strong winds and heavy rainfall.", "예를 들어 해안의 나무들은 강한 바람과 많은 비에 반응해 키가 더 작고 튼튼해진다."],
  ["In a laboratory study conducted at Stanford University, the same changes in plant growth patterns were brought about by touching plants twice a day.",
    "스탠퍼드 대학교의 실험실 연구에서는 하루에 두 번 식물을 만지는 것만으로 식물의 성장 방식에 같은 변화가 일어났다."],
  ["The researchers also found that these growth changes resulted from gene activation.", "연구자들은 이런 성장 변화가 유전자 활성화 때문이라는 것도 알아냈다."],
  ["Their findings indicate that this gene activation did not occur unless there was direct stimulation.", "그들의 연구 결과는 직접적인 자극이 없으면 이런 유전자 활성화가 일어나지 않았다는 것을 보여 준다."],
], "R-42, R-46");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
