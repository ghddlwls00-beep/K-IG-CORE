#!/usr/bin/env node
/**
 * READING passages pr225–pr256 — every audit finding in this range (R-48, R-49, R-53, R-60,
 * R-61, R-63, R-68, R-69, R-70, R-71, R-73, R-74, R-76, R-77, R-79 parts) plus the same kinds
 * of error found while reading each passage in full.
 *
 *  - pr237 (R-48): sentence order restored, "*ligament: 인대" and the underline marks (a)–(e)
 *    removed, Korean realigned. It describes tennis around 2000 (bigger ball, Sampras then a
 *    six-time Wimbledon champion), so it is told in the past.
 *  - pr246 (R-49): conclusion moved after the evidence; "Darwin was the first" dropped
 *    (Lamarck explained the giraffe's neck earlier, R-79).
 *  - pr239 (R-60): Dutch euthanasia was tolerated under guidelines from the 1980s and became
 *    law in 2002; the Korean said doctors "were given 12-year sentences".
 *  - pr255 (R-61): "population +70 % by 2025" did not happen; UN projection to 2050 instead.
 *  - pr232 (R-63): hundreds of thousands injured "each day" overstated; cars are not a third
 *    of CO2.
 *  - pr242 = pr152 and pr244 = pr190 and pr251 = pr247 (R-01) get the same corrected text;
 *    pr247 #5 / pr251 #4 carried the exam summary sentence (R-70).
 *
 *   node apply-reading-passages-225.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-53
sentences("pr225", "90fb758150", [
  ["Some people insist on “love at first sight,” but I suggest that they calm down and take a second look.", "어떤 사람들은 “첫눈에 반하는 사랑”을 고집하지만, 나는 그들에게 진정하고 다시 한번 살펴보라고 권하고 싶다."],
  ["There is no such thing as love at first sight.", "첫눈에 반하는 사랑 같은 것은 없다."],
  ["Some of those attractive first-sight qualities may turn out to be genuine and durable, but don't count on the storybook formula.", "첫눈에 끌린 매력 가운데 일부는 진실하고 오래가는 것으로 드러날 수도 있지만, 동화 같은 공식을 믿지는 마라."],
  ["The other saying, “love is blind,” is far more sensible.", "또 다른 말인 “사랑은 눈이 멀었다”가 훨씬 더 일리가 있다."],
  ["Someone who believes they are in love often can't see the undesirable qualities in their partner because they wish not to see them.", "사랑에 빠졌다고 믿는 사람은 상대의 좋지 않은 점을 흔히 보지 못한다. 보고 싶지 않기 때문이다."],
], "R-53");
en("pr226", 3, "at the precise time if it is needed.", "at the precise time when it is needed.");
// R-77
ko("pr227", 2, "그래서 그들은 어름을 차갑게 유지시키고 어름이 녹는 것을 방지하기 위해 사용되어지는 담요들을 보고 놀란다.", "그래서 담요가 얼음을 차갑게 유지하고 녹지 않게 하는 데 쓰이는 것을 보면 놀란다.");
ko("pr227", 5, "따라서, 담요는 몸(물체)의 열이 그 것(그 물체)를 둘러싸고 있는 차가운 공기 안으로 흘러 들어가지 못하게 하고, 담요가 공기의 열이 차가운 얼음 속으로 들어오지 못하게 하는 것이다.", "그래서 담요는 몸의 열이 주변의 더 차가운 공기로 빠져나가지 못하게 하고, 공기의 열이 더 차가운 얼음으로 들어가지 못하게 한다.");
// R-76
sentences("pr228", "6c9b608bba", [
  [`"People often think that being an usher is an easy job, but it isn't," says Peter Sullivan, an usher at the Palladium theater.`, `"사람들은 흔히 안내원이 쉬운 일이라고 생각하지만 그렇지 않아요." 팔라디움 극장의 안내원 피터 설리번의 말이다.`],
  [`"It's difficult to stand so much!`, `"그렇게 오래 서 있는 건 힘들어요!`],
  [`When I'm tired, I sit in an aisle seat during intermission, but my boss could fire me for that."`, `피곤하면 휴식 시간에 통로 쪽 좌석에 앉기도 하는데, 그러다 사장님한테 해고당할 수도 있어요."`],
], "R-76");
// R-76, R-77
en("pr229", 4, "anyone with time to read book is", "anyone with time to read books is");
ko("pr229", 3, "예를 들면, 그들은 독서에 대해 질문을 받을 때, 어떤 경영자들은 흔히 “나는 전문적인 서적에는 뒤쳐지지 않지만, 책을 읽을 시간이 없습니다.”라고 대답한다.", "예를 들어 독서에 대해 물으면 어떤 사업가들은 흔히 “업무 관련 문헌은 꼬박꼬박 챙겨 읽지만, 책 읽을 시간은 없습니다.”라고 대답한다.");
ko("pr229", 2, "비생산적인 꿈이다.", "비생산적인 공상이다.");
// R-69
ko("pr230", 2, "그들은 그들의 배에서 부른 단순한 노래에서도 편안함은 거의 찾을 수 없었다.", "그들은 배 위에서 부르던 소박한 노래에서 흔치 않은 위안을 얻었다.");
ko("pr230", 3, "그 노래는 sea shanties라고 불린다.", "그 노래들은 뱃노래(sea shanty)라고 불린다.");
// R-74
ko("pr231", 4, "동시대의 예술 음악 세계가 인간의 업적에 영향을 끼칠 수 있는 작품들을 제시하지 못하는 것 같다.", "현대 미술과 음악계는 인간의 성취를 반영하는 작품을 사람들에게 내놓지 못한 것 같다.");
ko("pr231", 5, "자신의 역할 대상이 될 수 있는", "자신의 본보기가 될");
// R-63
sentences("pr232", "7ff46bd91d", [
  ["People all around the world spend an average of 1.1 hours on the road each day.", "전 세계 사람들은 하루 평균 1.1시간을 도로에서 보낸다."],
  ["Thousands of people are killed, and tens of thousands injured each day in car accidents.", "날마다 수천 명이 교통사고로 죽고 수만 명이 다친다."],
  ["We are pumping huge quantities of CO2 into the atmosphere, and a large share of it comes from cars.", "우리는 대기 중에 엄청난 양의 이산화탄소를 내뿜고 있으며, 그 상당 부분이 자동차에서 나온다."],
  ["We know that this gas causes a greenhouse effect.", "우리는 이 기체가 온실 효과를 일으킨다는 것을 안다."],
  ["Our roads are crowded no matter how many we build, and building them destroys nature.", "도로를 아무리 많이 지어도 붐비고, 도로를 짓는 일은 자연을 파괴한다."],
  ["Huge amounts of space are given over to parking lots rather than to trees and birds.", "엄청난 공간이 나무와 새가 아니라 주차장에 내주어진다."],
  ["Thus, we know of many ways in which car use is costly and harmful.", "이처럼 우리는 자동차 이용이 비용이 많이 들고 해로운 점을 여러 가지 알고 있다."],
], "R-63");
ko("pr233", 4, "진리를 말할 자유가", "진실을 말할 자유가");
// R-77
ko("pr234", 4, "종지와 적을", "동지와 적을");
ko("pr235", 4, "보는 사람들은 대상이란 작아야 하는 것이기 때문에 작은 것이라고 생각할지 모른다.", "보는 사람은 대상이 원래 작게 찍혀야 해서 작은 것이라고 생각할 수도 있다.");
ko("pr235", 6, "그 이미지의 전달에 기여한다.", "그 이미지가 전하려는 메시지에 기여해야 한다.");
// R-68, R-76
en("pr236", 1, "as a collectible.In fact,", "as a collectible. In fact,");
en("pr236", 3, "by famous painters.Therefore,", "by famous painters. Therefore,");
ko("pr236", 2, "수십, 수백만 달러로", "수십, 수백 달러에");
// R-48
sentences("pr237", "4904e1303c", [
  ["At the end of the 1990s, tennis was in some trouble.", "1990년대 말에 테니스는 어려움을 겪고 있었다."],
  ["People seemed to be losing interest in the game.", "사람들이 테니스에 흥미를 잃어 가는 것 같았다."],
  ["One major reason for this was that the men’s professional game had lost some of its appeal.", "그 주된 이유 하나는 남자 프로 경기가 매력을 어느 정도 잃었다는 것이었다."],
  ["The pro game had become a contest of strength, where powerful hitters with high-tech rackets dominated.", "프로 경기는 첨단 라켓을 든 강타자들이 지배하는 힘겨루기가 되어 있었다."],
  ["At Wimbledon, for example, Britain’s Greg Rusedski hit the ball at 138 mph, the fastest serve recorded at the tournament at the time.", "예를 들어 윔블던에서 영국의 그레그 루세드스키가 시속 138마일로 서브를 넣었는데, 당시 그 대회에서 기록된 가장 빠른 서브였다."],
  ["As a result of this speed, very few points lasted more than three shots―serve, return and winning point.", "이런 속도 때문에 서브, 리턴, 결정타의 세 번을 넘기는 랠리가 거의 없었다."],
  ["In short, the game had little action. According to studies at the time, top male players played for an average of only four minutes per hour on grass.", "요컨대 경기에 볼거리가 별로 없었다. 당시 연구에 따르면 잔디 코트에서 정상급 남자 선수들이 실제로 공을 주고받는 시간은 한 시간에 평균 4분밖에 되지 않았다."],
  ["The hope was that a new, bigger ball would slow the game down, so that first-class games would again be dominated by skill and artistry like that of Bjorn Borg, Jimmy Connors and John McEnroe.",
    "새로 도입된 더 큰 공이 경기 속도를 늦춰, 최고 수준의 경기가 다시 비외른 보리, 지미 코너스, 존 매켄로 같은 선수들의 기술과 예술성으로 채워지기를 기대했다."],
  ["Not everyone was in favor of the bigger ball, however. Some players, such as hard-hitting Pete Sampras, who had already won Wimbledon six times, called the change “simply ridiculous.”",
    "그러나 모두가 더 큰 공에 찬성한 것은 아니었다. 이미 윔블던에서 여섯 번 우승한 강타자 피트 샘프러스 같은 선수들은 그 변화를 “그야말로 터무니없다”고 했다."],
  ["There was also some concern that players might suffer arm and ligament injuries as they swung harder trying to get more speed out of the ball.", "또 선수들이 공의 속도를 더 내려고 더 세게 휘두르다가 팔과 인대를 다칠 수 있다는 우려도 있었다."],
], "R-48");
en("pr238", 2, "for hundreds of other purposes, Presently coal", "for hundreds of other purposes. Presently coal");
// R-60
sentences("pr239", "98983b2fd4", [
  ["Around the world, people are wrestling with the question of humane death - especially in the face of painful terminal illnesses.", "전 세계에서 사람들은 특히 고통스러운 불치병 앞에서 인간다운 죽음이라는 문제와 씨름하고 있다."],
  ["The dilemma has become more complicated in recent years, as advanced medical technology has enabled doctors to keep patients alive much longer in even the most extreme cases.",
    "첨단 의료 기술 덕분에 의사들이 가장 극단적인 경우에도 환자를 훨씬 더 오래 살려 둘 수 있게 되면서, 최근 이 딜레마는 더 복잡해졌다."],
  ["Of course, patients have the right to refuse medical treatment at any time; requesting lethal injections, however, is another matter.", "물론 환자에게는 언제든 치료를 거부할 권리가 있다. 그러나 목숨을 끊는 주사를 요청하는 것은 다른 문제다."],
  ["The Netherlands, for example, began to tolerate euthanasia under strict guidelines in the 1980s and made it legal in 2002, but doctors who do not follow the rules can still be imprisoned for up to 12 years.",
    "예를 들어 네덜란드는 1980년대부터 엄격한 지침 아래 안락사를 묵인하다가 2002년에 합법화했지만, 규정을 지키지 않은 의사는 지금도 최대 12년의 징역형을 받을 수 있다."],
], "R-60");
// R-70, R-71
sentences("pr240", "db1f1c01e5", [
  ["It is now evidenced that what seems to be a single memory is actually a complex construction.", "하나의 기억처럼 보이는 것이 실제로는 복잡한 구성물이라는 것이 이제 밝혀졌다."],
  ["For instance, when we think of a hammer, our brain hurriedly retrieves the tool's name, its appearance, its function, and the sound of its clang, each extracted from a different region of the brain.",
    "예를 들어 망치를 떠올리면 뇌는 그 도구의 이름, 생김새, 쓰임, 쾅 하는 소리를 재빨리 불러오는데, 이것들은 저마다 뇌의 다른 영역에서 꺼내 온 것이다."],
  ["Therefore, the weakening of memory is in fact the failure to put together separate parts of information stored in your brain.", "그러므로 기억력이 약해지는 것은 사실 뇌에 따로 저장된 정보의 조각들을 한데 모으지 못하는 것이다."],
  ["Many of us begin to experience the breakdown of that assembly process as early as in our 20s.", "많은 사람이 이르면 20대부터 그 조립 과정이 무너지는 것을 경험하기 시작한다."],
], "R-70, R-71");
sentences("pr241", "f6482a8149", [
  ["What is the purpose of education?", "교육의 목적은 무엇인가?"],
  ["It is to prepare the individual for the society in which he must live and to give him the power to change the society.", "그것은 개인이 살아가야 할 사회에 대비하게 하고, 그 사회를 바꿀 힘을 주는 것이다."],
  ["We should not overemphasize the value of the first part.", "우리는 앞부분의 가치를 지나치게 강조해서는 안 된다."],
  ["It should be one of the functions of education to preserve for the society all the values essential to it, but a more important one is to cut out the decayed values which would be harmful to a new society.",
    "사회에 꼭 필요한 가치를 모두 지키는 것도 교육의 기능 가운데 하나여야 하지만, 새로운 사회에 해가 될 낡은 가치를 잘라 내는 것이 더 중요한 기능이다."],
  ["Thus the school should be the inspiration for social change.", "그러므로 학교는 사회 변화에 영감을 주는 곳이어야 한다."],
  ["Education should play a role in changing society rather than in preserving its traditions.", "교육은 사회의 전통을 지키기보다 사회를 바꾸는 역할을 해야 한다."],
], "R-76");
// R-01 = pr152 (R-73)
sentences("pr242", "f37dc6702a", [
  [`A child will often ask for approval openly: "Look at my painting! Isn't it pretty?"`, `아이는 흔히 드러내 놓고 인정을 구한다. "내 그림 좀 보세요! 예쁘지 않아요?"`],
  ["But adults are generally less honest about their need for support.", "그러나 어른은 대개 지지받고 싶은 마음을 덜 솔직하게 드러낸다."],
  [`A grown-up who tried his or her best at something isn't likely to ask, "Didn't I do a good job?" But the adult needs to hear it all the same.`, `무언가에 최선을 다한 어른이 "나 잘하지 않았어요?"라고 묻지는 않겠지만, 그래도 어른 역시 그 말을 들을 필요가 있다.`],
  ["In other words, children and adults alike want to hear positive remarks.", "다시 말해 아이든 어른이든 긍정적인 말을 듣고 싶어 한다."],
  ["Therefore, don't forget to praise others when they need support.", "그러니 다른 사람이 지지를 필요로 할 때 칭찬하는 것을 잊지 마라."],
], "R-73 (same passage as pr152, R-01)");
// R-73
sentences("pr243", "55bac6e3f9", [
  ["Since the mid-1990s, teaching Korean to foreigners has made quick and steady progress.", "1990년대 중반 이후 외국인을 위한 한국어 교육은 빠르고 꾸준하게 발전해 왔다."],
  ["Many universities now offer Korean language programs in Korea and abroad, and many textbooks have been produced for learners of Korean.", "이제 많은 대학이 국내외에서 한국어 과정을 운영하고, 한국어 학습자를 위한 교재도 많이 만들어졌다."],
  ["Only a small number of foreigners, however, have benefited from this progress.", "그러나 이 발전의 혜택을 받은 외국인은 소수에 불과하다."],
  ["Most foreign workers are being taught by Korean coworkers or volunteers who have no or little teaching experience.", "대부분의 외국인 노동자는 가르쳐 본 경험이 없거나 거의 없는 한국인 직장 동료나 자원봉사자에게 배우고 있다."],
  ["Thus, it is necessary to establish better educational programs for teaching the Korean language to foreign workers.", "따라서 외국인 노동자에게 한국어를 가르치는 더 나은 교육 과정을 마련할 필요가 있다."],
], "R-73");
// R-01 = pr190 (R-73)
sentences("pr244", "8e9d5e4828", [
  ["How often are we introduced to someone only to forget his or her name moments later?", "누군가를 소개받고 불과 몇 순간 뒤에 그 사람의 이름을 잊어버리는 일이 얼마나 잦은가?"],
  ["In fact, many times we never knew the name.", "사실 우리는 애초에 이름을 제대로 알지도 못한 경우가 많다."],
  ["Today introductions are made in an unclear manner so that it is very hard to remember other people's names.", "오늘날에는 소개가 분명하지 않게 이루어져 다른 사람의 이름을 기억하기가 매우 어렵다."],
  ["Forgetting people's names often means we do not really care about them.", "사람의 이름을 잊는 것은 흔히 우리가 그 사람에게 진심으로 관심이 없다는 뜻이다."],
  [`When we know their names, we are saying, "You are important. I remember you."`, `이름을 알고 있다는 것은 "당신은 중요한 사람입니다. 나는 당신을 기억합니다."라고 말하는 것이다.`],
  ["A clear introduction should be made, therefore, if you want to build good social relationships with others.", "그러므로 다른 사람들과 좋은 관계를 맺고 싶다면 분명하게 소개해야 한다."],
], "R-73 (same passage as pr190, R-01)");
en("pr245", 13, "an essential skill to fulfill multiple social roles", "an essential skill to fulfill multiple social roles.");
ko("pr245", 6, "이러한 지식은 당신의 일상적인 상호 작용을 통해 당신을 지도한다.", "이런 지식은 일상의 여러 관계 속에서 당신을 이끌어 준다.");
// R-49, R-79
sentences("pr246", "579a79f7b8", [
  ["Charles Darwin suggested that long necks evolved in giraffes because they enabled the animals to eat the treetop leaves.", "찰스 다윈은 기린의 긴 목이 높은 나뭇잎을 먹을 수 있게 해 주었기 때문에 진화했다고 보았다."],
  ["This seemingly reasonable explanation has held up for over a century, but it is probably wrong, says Robert Simmons, a behavioral ecologist.", "그럴듯해 보이는 이 설명은 한 세기 넘게 받아들여져 왔지만, 행동 생태학자 로버트 시먼스는 아마 틀렸을 것이라고 말한다."],
  ["Simmons was studying eagles in Africa when he came across a pair of male giraffes locked in combat.", "시먼스는 아프리카에서 독수리를 연구하다가 서로 맞붙어 싸우는 수컷 기린 두 마리를 우연히 보았다."],
  ["He saw the male giraffes battling for mates by swinging their powerful necks, which were over six feet long and weighed more than 200 pounds.", "그는 수컷 기린들이 길이가 6피트가 넘고 무게가 200파운드가 넘는 강력한 목을 휘두르며 짝을 차지하려고 싸우는 것을 보았다."],
  ["He observed that in contests of this type, males with the longest, thickest necks usually won.", "그는 이런 싸움에서는 대개 목이 가장 길고 굵은 수컷이 이긴다는 것을 관찰했다."],
  ["So Simmons became convinced that this competition for mates, not stretching for treetop food, was what drove the evolution of the neck.", "그래서 시먼스는 목의 진화를 이끈 것이 높은 곳의 먹이를 향해 목을 뻗는 일이 아니라 바로 이 짝짓기 경쟁이라고 확신하게 되었다."],
], "R-49, R-79");
// R-70 summary sentence removed; pr251 is the same passage (R-01)
const IMPORTS = [
  ["The objective of some taxes on foreign imports is to protect an industry that produces goods vital to a nation's defense.", "외국 수입품에 매기는 일부 세금의 목적은 나라의 방위에 꼭 필요한 물품을 생산하는 산업을 보호하는 것이다."],
  ["The domestic oil, natural gas, or steel industry, for example, may require protection because of its importance to national defense.", "예를 들어 국내 석유, 천연가스, 철강 산업은 국방에 중요하기 때문에 보호가 필요할 수 있다."],
  ["Without protection, such industries might be weakened by foreign competition.", "보호하지 않으면 이런 산업은 외국과의 경쟁에 밀려 약해질 수 있다."],
  ["Then, in an international crisis, the nation might find itself in short supply of products essential to national security.", "그러면 국제적 위기가 닥쳤을 때 나라는 국가 안보에 꼭 필요한 물품이 부족한 처지에 놓일 수 있다."],
];
sentences("pr247", "d9200a80e0", IMPORTS, "R-70");
sentences("pr251", "705ba96a40", IMPORTS, "R-70 (same passage as pr247, R-01)");
// R-76, R-77
en("pr249", 7, "So, From the particular men and women", "So from the particular men and women");
ko("pr249", 1, "내 방아 앉아", "내 방에 앉아");
ko("pr249", 7, "특별정한", "특정한");
en("pr250", 5, "get its intended results", "get its intended results.");
// R-69, R-73
sentences("pr252", "4865a38729", [
  ["Market researchers often comment that the elderly think of themselves as being much younger than they actually are.", "시장 조사자들은 노인들이 자신을 실제보다 훨씬 젊게 생각한다고 흔히 말한다."],
  ["In fact, research confirms the public's belief that age is more a state of mind than of body.", "실제로 연구는 나이가 몸보다 마음의 상태라는 대중의 믿음을 뒷받침한다."],
  ["The level of a person’s mental outlook and activity has much more to do with quality of life than does actual age.", "사람의 정신적 태도와 활동 수준은 실제 나이보다 삶의 질과 훨씬 더 깊은 관련이 있다."],
  ["A recent study suggests that perceived age may be a more reliable predictor of marketing success on the gray market than actual age.", "최근 한 연구는 실버 시장에서 마케팅의 성공을 예측하는 데 실제 나이보다 스스로 느끼는 나이가 더 믿을 만한 지표일 수 있다고 시사한다."],
  ["For this reason, many marketers focus on perceived age in marketing campaigns.", "그래서 많은 마케터들이 마케팅 캠페인에서 스스로 느끼는 나이에 초점을 맞춘다."],
], "R-69, R-73");
en("pr253", 2, "a sudden change in food for cow,", "a sudden change in a cow's food,");
// R-77
en("pr254", 2, "in the same category as Dostoevski", "in the same category as Dostoevsky");
ko("pr254", 2, "뭇솔리니와 도스토에프스키를", "무솔리니와 도스토옙스키를");
ko("pr254", 3, "그렇지만 애들의 성장하는 머리 속에 수많은 기하학 문제와 세계의 강 이름으로 채우기를 더 원할 건가?", "그렇다고 자라나는 아이들의 머릿속을 수백 개의 기하학 문제나 세계의 모든 강 이름으로 채우고 싶은가?");
// R-61
sentences("pr255", "fd0c3fffac", [
  ["As many as 700 million people are chronically malnourished in the world today, and the global population is expected to grow from about 8 billion to nearly 10 billion by 2050.",
    "오늘날 세계에서 7억 명이나 되는 사람이 만성적인 영양실조에 시달리고 있으며, 세계 인구는 약 80억 명에서 2050년까지 100억 명 가까이로 늘어날 것으로 예상된다."],
  ["There is no question, then, that global food production must increase significantly over the next several decades to keep pace.", "그렇다면 이에 맞추려면 앞으로 수십 년 동안 세계 식량 생산이 크게 늘어야 한다는 데는 의심의 여지가 없다."],
  ["The question is, with modern crops already pushed close to maximum yields, where will those food production gains come from?", "문제는, 현대 작물이 이미 최대 수확량에 가까워진 지금, 그 식량 증산이 어디에서 나올 것인가이다."],
], "R-61");
// R-74, R-76, R-77
en("pr256", 1, "In the twentieth century, there have been many advances in technology.", "In the twentieth century, there were many advances in technology.");
ko("pr256", 5, "우리는 기술 덕분에 잘 살아가고 있다.", "우리는 기술 덕분에 크게 발전했다.");
ko("pr256", 7, "논의 되야 할 것 같다.", "논의되어야 할 것이다.");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
