#!/usr/bin/env node
/**
 * READING passages pr193–pr224 — every audit finding in this range (R-51, R-56, R-57, R-58,
 * R-66, R-67, R-72, R-73, R-74, R-76, R-77, R-78, R-79 parts) plus the same kinds of error
 * found while reading each passage in full.
 *
 *  - pr193 (R-51): Korean realigned and "7904년" → 1904. The cone was not invented at the
 *    1904 fair (cones existed before); the story is told as how it became famous.
 *  - pr195 (R-78): New York/London clock times do not show that "there is no absolute time";
 *    the passage now separates time zones from Einstein's relativity.
 *  - pr211 (R-57): "most breakthroughs by people in their 30s — including Einstein, Newton,
 *    Darwin" (Einstein 26, Newton 23) → "many … in their 20s and 30s"; broken noun phrases and
 *    exam brackets fixed.
 *  - pr222 (R-58): the marathon, not the Olympics, remembers the runner from Marathon.
 *  - pr215 (R-78): medicine lowers deaths, so the worry is population growth, not "births".
 *  - pr213 (R-66) holds two exam passages (Sue, Robert); both are about keeping at it, so they
 *    stay together, typos fixed ("customs" → customers, "Howeve").
 *  - pr197 is the same passage as pr216 (R-01); pr197's Korean had "not merely for rewards"
 *    reversed and now uses pr216's translation.
 *  - pr200 (Russell) keeps its text for the lawyer (R-75).
 *
 *   node apply-reading-passages-193.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-51
sentences("pr193", "0e47d67f66", [
  ["If you ask most children what their favorite treat is, they will answer “Ice cream!” There is nothing like a delicious ice-cream cone on a hot summer day.",
    "대부분의 아이들에게 가장 좋아하는 간식이 무엇이냐고 물으면 “아이스크림!”이라고 대답할 것이다. 더운 여름날 맛있는 아이스크림콘만 한 것은 없다."],
  ["Every year Americans eat more than four billion ice-cream cones.", "미국인들은 해마다 40억 개가 넘는 아이스크림콘을 먹는다."],
  ["Did you know that, according to a popular story, the ice-cream cone became famous by accident?", "널리 알려진 이야기에 따르면 아이스크림콘이 우연히 유명해졌다는 것을 알고 있는가?"],
  ["St. Louis was having a world’s fair in 1904.", "1904년 세인트루이스에서 세계 박람회가 열리고 있었다."],
  ["Ice cream was a big seller.", "아이스크림이 아주 잘 팔렸다."],
  ["One person selling ice cream ran out of dishes and didn't know what to do.", "아이스크림을 팔던 한 사람이 접시가 다 떨어져 어찌할 바를 몰랐다."],
  ["Luckily, a person nearby, who was selling waffles, suggested rolling a waffle and putting the ice cream inside.", "다행히 근처에서 와플을 팔던 사람이 와플을 말아 그 안에 아이스크림을 넣자고 제안했다."],
  ["It was an instant success.", "그것은 곧바로 큰 인기를 끌었다."],
], "R-51");
// R-56
ko("pr194", 1, "단풍이 드는 나무를 볼 수 있었다.", "기차 창밖으로 들판에서 곡식이 익어 가고 나무들이 붉고 노랗게 물드는 것이 보였다.");
ko("pr194", 2, "일주일전에 이 여행을 시작했더라면 이 모든 것이 내 시야를 즐겁게 했을 텐데.", "이 여행이 일주일만 일찍이었더라면 이 모든 풍경이 내 눈을 즐겁게 했을 것이다.");
ko("pr194", 3, "그러나 지금은 그것을 즐길 수 없다.", "그러나 지금은 그것을 즐길 수 없었다.");
ko("pr194", 5, "나를 20년 동안 길러 준 Uncle Joe에게 난 무엇을 해 주었나?", "나를 20년 동안 키워 주신 조 삼촌에게 나는 무슨 짓을 한 걸까?");
// R-78, R-73, R-74
sentences("pr195", "e9aeee27f9", [
  ["Suppose a football game begins at 1:00 p.m. in New York.", "뉴욕에서 미식축구 경기가 오후 1시에 시작한다고 해 보자."],
  ["It is then 6:00 p.m. in London.", "그때 런던은 오후 6시다."],
  ["Which time is correct? Both are, because the time on a clock depends on where you are.", "어느 시각이 맞을까? 둘 다 맞다. 시계의 시각은 어디에 있느냐에 따라 달라지기 때문이다."],
  ["Something similar happens in space. If an explosion occurred on a star, scientists on the earth would record the time it happened.", "우주에서도 비슷한 일이 일어난다. 어느 별에서 폭발이 일어나면 지구의 과학자들은 그것이 일어난 시각을 기록할 것이다."],
  ["But someone traveling through another part of the universe at a very different speed would record the time differently.", "그러나 우주의 다른 곳을 아주 다른 속도로 여행하는 사람은 그 시각을 다르게 기록할 것이다."],
  ["According to Einstein's theory of relativity, there is no single absolute time for everyone.", "아인슈타인의 상대성 이론에 따르면 모두에게 똑같은 절대적인 시간은 없다."],
], "R-78");
ko("pr196", 2, "많은 지식을 가진 사람이 반드시 좋은 사고가가 아닌 것은 사실이다.", "지식이 많은 사람이 반드시 생각을 잘하는 사람은 아닌 것이 사실이다.");
ko("pr196", 3, "그러나 사고를 위한 좋은 기술을 개발하고 있는 사람이 거의 지식을 가지지 않을 때 보다 많은 지식을 가지고 있다면 더욱 훌륭한 일을 해낼 것이라는 것 또한 사실이다.", "그러나 생각하는 좋은 기술을 익혀 가는 사람이라면 지식이 적을 때보다 많을 때 더 잘 해낸다는 것도 사실이다.");
ko("pr196", 4, "게다가 당신이 지식을 증진시키면 종종 당신이 호기심을 일깨우거나 사고가 필요한 분야를 더 잘 인식하게되고 더 많이 생각하도록 한다.", "게다가 지식을 늘리면 호기심이 일깨워지고 생각이 필요한 영역을 더 잘 알게 되어, 더 많이 생각하고 싶어지는 경우가 많다.");
// R-01 pr197 = pr216: pr216's (correct) Korean
ko("pr197", 1, "물론 얼마나 많이 벌 수 있느냐도 중요하지만, 그것을 무시하면 훗날 좌절감이 생길 수도 있는, 똑같이 중요한 다른 고려사항들도 있다.", "얼마를 벌 수 있는지는 물론 중요하지만, 소홀히 하면 훗날 좌절을 낳을 수 있는 똑같이 중요한 다른 고려사항들이 있다.");
ko("pr197", 2, "진정한 흥미가 있는 곳에서 사람들은 열심히 일한다는 것을 인식하지 않고도 열심히 일을 할 수 있으며, 그러한 상황에서 성공이 따른다.", "진정한 흥미가 있는 곳에서는 자기도 모르게 부지런히 일하게 되며, 그러한 상황에서는 성공이 뒤따른다.");
ko("pr197", 3, "일반적으로 승진이나 월급 인상을 의미하는 성공보다 더 중요한 것은 일이 가져오는 보상뿐만 아니라 사람들이 일 자체를 위해서 즐기는 일을 하는데서 발견되는 행복이다.", "일반적으로 승진이나 급여 인상을 의미하는 성공보다 더 중요한 것은, 일이 가져다주는 보상 때문만이 아니라 일 그 자체를 즐기는 데서만 발견될 수 있는 행복이다.");
ko("pr198", 4, "그리하여 보통 바보처럼 보이고 느끼게 된다.", "대체로 바보처럼 보이고 스스로도 바보가 된 것처럼 느낀다.");
// R-72, R-77
sentences("pr199", "9e2dad1d37", [
  ["Everyone has instincts, and listening to your inner voice is always a good idea.", "누구에게나 직감이 있고, 내면의 목소리에 귀 기울이는 것은 언제나 좋은 생각이다."],
  ["But when you’re making a decision, following your instincts is necessary but not sufficient.", "그러나 결정을 내릴 때 직감을 따르는 것은 필요하지만 충분하지는 않다."],
  ["Learning how to use your instincts as a guide in decision making requires effort.", "결정을 내릴 때 직감을 길잡이로 쓰는 법을 배우려면 노력이 필요하다."],
  ["After all, no one’s instincts are always correct, so how do you know when to follow them and when to ignore them?", "결국 누구의 직감도 늘 옳지는 않은데, 언제 직감을 따르고 언제 무시해야 하는지 어떻게 알 수 있을까?"],
  ["Following your instincts could lead you to make impulsive decisions that you may regret later.", "직감만 따르면 나중에 후회할 충동적인 결정을 내리게 될 수 있다."],
  ["The key is to learn how to use your instincts to support, not dictate, your decisions.", "핵심은 직감이 결정을 좌우하게 하지 말고 결정을 뒷받침하는 데 쓰는 법을 배우는 것이다."],
  ["Use your experience to analyze the situation.", "경험을 활용해 상황을 분석하라."],
  ["Your past experience gives you the basis for judging whether your instincts can be trusted.", "과거의 경험은 직감을 믿을 수 있는지 판단하는 근거가 된다."],
], "R-72, R-77");
ko("pr200", 3, "행복을 증가시키는 데 매우 유능하다는 점을", "행복을 크게 늘릴 수 있다는 점을");
ko("pr201", 3, "(가치관을) 바꿀 의무는 없다는", "행동을 바꿀 의무는 없다는");
// R-79 the first modern newspaper had a name
en("pr202", 2, "In that year the newspaper was first published in Korea in an effort to", "In that year Korea's first modern newspaper, Hanseong Sunbo, was published in an effort to");
ko("pr202", 2, "그 해에 한국에서 신문이 최초로 발간되었는데,", "그해 한국 최초의 근대 신문인 한성순보가 발간되었는데,");
// R-76, R-79 (Belgium also has German speakers)
en("pr203", 6, "if he is Belgian, he speaks Flemish or French;", "if he is Belgian, he speaks Dutch, French, or German;");
ko("pr203", 6, "벨기에인이라면 플랑드르어(네덜란드어)나 프랑스어를 쓰며,", "벨기에인이라면 네덜란드어나 프랑스어나 독일어를 쓰며,");
en("pr203", 7, `more importantly, we cannot switch the argument and say, " If he speaks German, he is German." He may quite well be a Swiss.`, `More importantly, we cannot switch the argument and say, "If he speaks German, he is German." He may quite well be Swiss.`);
sentences("pr204", "bb1c6a5755", [
  ["Many popular sayings are correct, even insightful, when applied to life's circumstances.", "많은 속담은 삶의 상황에 적용하면 옳고, 심지어 통찰력이 있기도 하다."],
  ["But when proverbs are viewed without qualifications, they can cancel each other out.", "그러나 단서를 달지 않고 속담을 보면 서로를 상쇄할 수 있다."],
  [`For instance, while it's often true that "too many cooks spoil the broth," there are times when "two heads are better than one."`, `예를 들어 "사공이 많으면 배가 산으로 간다"는 말이 맞을 때가 많지만, "백지장도 맞들면 낫다"는 말이 맞을 때도 있다.`],
]);
en("pr205", 3, "in the northen parts of Germany,", "in the northern parts of Germany,");
en("pr206", 3, "Cities-dwellers were less isolated", "City dwellers were less isolated");
ko("pr206", 1, "19C 후반에 떠오른 도시들은 범죄, 화재, 쓰레기, 질병 등과 같은 나름대로의 문제들이 있었다.", "19세기 후반 급성장한 도시들에는 범죄, 화재, 쓰레기, 질병 같은 나름의 문제가 있었다.");
ko("pr206", 5, "이러한 문화적 공공시설들이 도시화의 일부로 먼저 개발되었다.", "이런 문화 시설들은 도시화의 흐름 속에서 처음 발달했다.");
en("pr207", 2, "Before a bill become a law,", "Before a bill becomes a law,");
// R-73, R-78
sentences("pr209", "a0331f6664", [
  ["It is desirable to have a good reputation.", "좋은 평판을 얻는 것은 바람직하다."],
  ["The good opinion of our associates and acquaintances is not to be despised.", "동료와 지인들의 좋은 평가를 가볍게 여겨서는 안 된다."],
  ["But there is often a great distinction between character and reputation.", "그러나 인격과 평판 사이에는 흔히 큰 차이가 있다."],
  ["Reputation is what the world believes us to be for the time; character is what we truly are.", "평판은 세상이 한동안 우리를 어떤 사람이라고 믿는 것이고, 인격은 우리의 진짜 모습이다."],
  ["Reputation and character may be in harmony, but they frequently are as opposite as light and darkness.", "평판과 인격은 일치할 수도 있지만, 빛과 어둠처럼 정반대인 경우도 많다."],
], "R-73, R-78");
// R-73, RV-23
en("pr210", 2, "to know other people - or, indeed, himself -thoroughly.", "to know other people—or, indeed, himself—thoroughly.");
en("pr210", 3, "We all fell lonely", "We all feel lonely");
en("pr210", 5, "we learn that others-greater men than we - have suffered", "we learn that others—greater men than we—have suffered");
// R-57, R-77
sentences("pr211", "d293e588e1", [
  ["When we think of the public face of scientific genius, we often remember someone with an old and graying appearance.", "과학 천재의 대중적인 모습을 떠올리면 우리는 흔히 나이 들고 머리가 희끗한 사람을 기억한다."],
  ["For example, we think of Albert Einstein's disheveled hair, Charles Darwin's majestic beard, and Isaac Newton's wrinkled face.", "예를 들어 아인슈타인의 헝클어진 머리, 다윈의 위엄 있는 수염, 뉴턴의 주름진 얼굴을 떠올린다."],
  ["Yet the truth is that many of the scientific breakthroughs that have changed our lives were made by people in their 20s and 30s—and that includes Einstein, Newton and Darwin.",
    "그러나 사실 우리의 삶을 바꾼 과학의 획기적 발견 가운데 상당수는 20~30대의 사람들이 이루었고, 아인슈타인과 뉴턴과 다윈도 그랬다."],
  ["Indeed, not surprisingly, younger scientists are less affected by the intellectual dogma of the day than their elders.", "그러니 젊은 과학자들이 나이 든 과학자들보다 그 시대의 지적 통념에 덜 얽매이는 것은 놀랄 일이 아니다."],
  ["They question authority instinctively.", "그들은 본능적으로 권위에 의문을 품는다."],
  ["They do not believe it when they are told that a new idea is crazy, so they are free to do the impossible.", "새로운 생각이 터무니없다는 말을 들어도 믿지 않기에, 그들은 불가능한 일에 자유롭게 도전할 수 있다."],
], "R-57, R-77");
ko("pr212", 2, "이러한 감정은 종종 자식 사랑으로서 언급되어진다.", "이런 감정은 흔히 \"부모의 사랑\"이라고 불린다.");
ko("pr212", 3, "자신의 아이들에게 이러한 사랑을 느끼는 것이 아니라는 것은 사실이다.", "물론 모든 부모가 자기 아이에게 이런 사랑을 느끼는 것은 아니다.");
ko("pr212", 4, "그러나, 어떤 여성들은 그들이 자기 친자식에게 느끼는 것과 같은 자식사랑을 다른 아이들에게서도 느낀다.", "그러나 자기 아이에게 느끼는 것과 같은 부모의 사랑을 다른 아이들에게도 느끼는 여성들이 있다.");
// R-66 typos (both stories kept together)
en("pr213", 5, "Her customs were all satisfied", "Her customers were all satisfied");
en("pr213", 7, "Howeve, she delivered", "However, she delivered");
en("pr213", 8, "could not ride a bicycle,", "could not ride a bicycle.");
en("pr213", 9, "So, Robert wanted", "So Robert wanted");
en("pr213", 15, "Howeve, Robert kept trying", "However, Robert kept trying");
ko("pr213", 1, "Sue는 그녀의 이웃에서 신문을 돌렸었다.", "Sue는 동네에서 신문 배달을 했다.");
// R-74
ko("pr214", 1, "Smith 씨의 의견을 전적으로 수용하지 않는 바는 아니지만, 그의 논지는 그리 설득력 있지 않다.", "Smith 씨의 의견을 완전히 무시할 수는 없지만, 그의 주장은 설득력이 없다.");
ko("pr214", 3, "컴퓨터 기술은 예술 작품이 만들어지고, 알려지고, 경험을 통해 노련해지는 데 기여할 수 있다.", "컴퓨터 기술은 작품이 공연되고, 방송되고, 감상되는 방식을 개선할 수 있다.");
ko("pr214", 4, "구성하는 사람들이나, 수행하는 사람들 그리고 청중들 모두 그들 음악의 디지털적 통제권을 갖는다.", "작곡가, 연주자, 청중 모두 음악을 디지털로 다룰 수 있다.");
// R-78 medicine lowers deaths → population grows; R-76
sentences("pr215", "3871f957df", [
  ["People are happy with developments in medicine.", "사람들은 의학의 발전을 반긴다."],
  ["Then they worry about the rapid growth of the population.", "그러다가 빠르게 늘어나는 인구를 걱정한다."],
  ["Scientists make great advances in agricultural chemistry, greatly increasing our food supply.", "과학자들은 농화학에서 큰 진보를 이루어 식량 공급을 크게 늘린다."],
  ["Then our rivers become so polluted that we cannot even swim in them.", "그러다가 강이 너무 오염되어 수영조차 할 수 없게 된다."],
  ["We are happy with the developments in air transportation and impressed by the great airplanes.", "우리는 항공 교통의 발전을 반기고 거대한 비행기에 감탄한다."],
  ["Then we are frightened by the horrors of air crashes or air war.", "그러다가 비행기 추락이나 공중전의 참상에 겁을 먹는다."],
  ["We are excited by the fact that space can now be entered.", "이제 우주에 들어갈 수 있다는 사실에 우리는 들뜬다."],
  ["But we will undoubtedly see the other side there, too.", "그러나 분명 그곳에서도 우리는 다른 면을 보게 될 것이다."],
], "R-76, R-78");
ko("pr217", 2, "(그러나) 그것은 사실이 아니다.", "그렇지 않다.");
ko("pr217", 5, "그들은 조급하게 될 것이다.", "그들은 짜증을 낼 것이다.");
// R-78 — the conclusion now comes after both benefits
sentences("pr218", "98e07e8667", [
  ["In the United States, some people maintain that TV media will create a distorted picture of a trial, while leading some judges to pass harsher sentences than they otherwise might.",
    "미국에서는 TV가 재판의 모습을 왜곡하고, 일부 판사들이 그렇지 않았을 때보다 더 무거운 형을 선고하게 만들 것이라고 주장하는 사람들이 있다."],
  ["However, there are some benefits connected to the televising of trials.", "그러나 재판을 TV로 중계하는 데에는 몇 가지 이점이 있다."],
  ["It will serve to educate the public about the court process.", "재판 중계는 재판 절차에 대해 대중을 교육하는 역할을 할 것이다."],
  ["It will also provide full and accurate coverage of exactly what happens in any given case.", "또 각 사건에서 정확히 무슨 일이 일어나는지 빠짐없이 정확하게 보도할 것이다."],
  ["And, if trials are televised, a huge audience will be made aware of the case, and crucial witnesses who would otherwise have been ignorant of the case may play their potential role in it.",
    "그리고 재판이 방영되면 수많은 시청자가 그 사건을 알게 되어, 그렇지 않았다면 사건을 몰랐을 결정적인 증인이 제 역할을 할 수도 있다."],
  ["Therefore, it is necessary to televise trials to increase the chance of a fair trial.", "그러므로 공정한 재판의 가능성을 높이려면 재판을 TV로 중계할 필요가 있다."],
], "R-78");
ko("pr219", 1, "논쟁은 때때로 엄격한 집안에서는 무례한 행동으로 간주된다.", "엄격한 집안에서는 말대꾸하며 따지는 것을 흔히 무례하다고 여긴다.");
// R-72
sentences("pr220", "7e55a1439d", [
  ["A common belief is that if we find someone who likes to do the same things we do, then we will get along and we will be happy.", "흔한 믿음은 우리와 같은 일을 좋아하는 사람을 찾으면 잘 지내고 행복해질 것이라는 것이다."],
  ["Participating in activities together is a great start for relationships; however, I am sure you know people who like to do the same things but who don't get along.",
    "함께 활동하는 것은 관계의 좋은 출발점이지만, 같은 일을 좋아하면서도 사이가 좋지 않은 사람들을 여러분도 분명 알 것이다."],
  ["This is true with individuals who belong to the same social groups, companies, and teams, as well as other organizations.", "같은 모임이나 회사, 팀, 그 밖의 단체에 속한 사람들도 마찬가지다."],
  ["Obviously, it is not a common interest alone that creates harmonious relationships.", "분명 조화로운 관계를 만드는 것은 공통의 관심사만이 아니다."],
], "R-72");
// R-79 Pliny's name was Canaria
en("pr221", 5, `They named the islands "Canario,"`, `They named the islands "Canaria,"`);
ko("pr221", 5, "'Canario'라고", "'Canaria'라고");
// R-58
en("pr222", 4, "In fact, the Olympics celebrate the memory of the Greek soldier", "In fact, the marathon race celebrates the memory of the Greek soldier");
ko("pr222", 4, "사실 올림픽은 페르시아인에 대한 아테네의 승리의 소식을 가져온 그리스 병사를 기념하여 행해진다.", "사실 마라톤 경주는 아테네가 페르시아를 이겼다는 소식을 전한 그리스 병사를 기리는 것이다.");
ko("pr223", 3, "지식,", "지성,");
// R-67
sentences("pr224", "c416a1d27e", [
  ["Today, many states allow television news reports of court trials.", "오늘날 많은 주에서 재판을 TV 뉴스로 보도하는 것을 허용한다."],
  ["They seem to think that television coverage is the best way to inform the public about the court system.", "그들은 TV 보도가 사법 제도를 대중에게 알리는 가장 좋은 방법이라고 생각하는 것 같다."],
  ["But I don't agree with them.", "그러나 나는 그들에게 동의하지 않는다."],
  ["A fair trial isn't possible when TV cameras are rolling.", "TV 카메라가 돌아가는 동안에는 공정한 재판이 불가능하다."],
  ["Judges, jurors, and witnesses will be distracted by knowing that they are being taped for the local evening news.", "판사, 배심원, 증인은 자신이 지역 저녁 뉴스에 나갈 녹화를 하고 있다는 것을 알면 집중하지 못할 것이다."],
  ["Many witnesses will not want to appear in a trial on TV.", "많은 증인이 TV로 방송되는 재판에 나오고 싶어 하지 않을 것이다."],
  ["Let's use TV cameras for fictional trials, not real ones.", "TV 카메라는 실제 재판이 아니라 드라마 속 재판에 쓰자."],
], "R-67");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
