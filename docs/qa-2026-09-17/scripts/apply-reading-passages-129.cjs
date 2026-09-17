#!/usr/bin/env node
/**
 * READING passages pr129–pr160 — every audit finding in this range (R-38, R-42, R-44, R-46,
 * R-59, R-62, R-70, R-72, R-73, R-74, R-76, R-77, R-78 parts) plus the same kinds of error found
 * while reading each passage in full.
 *
 *  - pr129 (R-38): Legionnaires' disease is not carried by "heated air from heating pipes".
 *    Legionella grows in lukewarm water (hot-water systems set too low, cooling towers) and
 *    people catch it by breathing in water mist. Rewritten on the CDC / Philadelphia record
 *    (1976, 182 cases, 29 deaths).
 *  - pr150 (R-59): modern humans have existed for about 300,000 years, not 35,000.
 *  - pr138 (R-62): Poe's story is "The Purloined Letter"; the Korean had slid a row.
 *  - pr159 (R-70): the exam's summary sentence and "→ (A) (B)" removed.
 *  - pr160 (R-78): the passage stopped at "the situation is the opposite for deer"; one
 *    sentence says what the opposite is.
 *  - pr130 (Russell) keeps its text for the lawyer (R-43); only translation is fixed.
 *
 *   node apply-reading-passages-129.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-38
sentences("pr129", "cf14829040", [
  ["Changes in the water systems of buildings can also lead to disease.", "건물의 물 관련 설비가 바뀌어도 병이 생길 수 있다."],
  ["In the 1970s, there was a worldwide shortage of oil.", "1970년대에 전 세계적으로 석유가 부족했다."],
  ["To save energy, many buildings lowered the temperature of their hot water.", "에너지를 아끼려고 많은 건물이 온수의 온도를 낮추었다."],
  ["Water that is warm but not hot is just right for a deadly germ called Legionella.", "따뜻하지만 뜨겁지 않은 물은 레지오넬라라는 치명적인 세균이 자라기에 딱 알맞다."],
  ["The germ also grows in the water of air-conditioning cooling towers, and people become infected when they breathe in tiny drops of that water in mist or spray.",
    "이 세균은 에어컨 냉각탑의 물에서도 자라며, 사람은 그 물이 안개나 물보라가 되어 흩어진 작은 물방울을 들이마셔 감염된다."],
  ["In 1976, more than 180 people who had stayed at or visited a hotel in Philadelphia became ill, and 29 of them died.",
    "1976년 필라델피아의 한 호텔에 묵거나 그곳을 찾은 180여 명이 병에 걸렸고, 그중 29명이 목숨을 잃었다."],
], "R-38");
ko("pr130", 1, "일은 무엇보다도 지루함의 예방책으로써 바람직하다, 왜냐하면 사람이 흥미없는 일을 하고 있을 때 그 사람이 느끼는 지루함은 자신의 하루와 아무 관련이 없을 때 그가 느끼는 지루함에 비교하여 아무것도 아닌 것으로 간주되기 때문이다.",
  "일이 바람직한 것은 무엇보다 지루함을 막아 주기 때문이다. 재미없는 일을 할 때 느끼는 지루함은 하루하루 할 일이 없을 때 느끼는 지루함에 비하면 아무것도 아니기 때문이다.");
ko("pr130", 2, "또 다른 장점이 이러한 장점에 연결된다. 즉 일은 휴일이 올 때 휴일을 더욱 달콤하게 만든다.", "일의 이 장점에는 또 다른 장점이 따르는데, 일을 하면 휴일이 왔을 때 그 휴일이 훨씬 더 즐겁다는 것이다.");
ko("pr130", 3, "만약에 한 사람이 자신의 정력을 손상시킬 만큼 열심히 일해야만 하지 않는다면 그는 게으른 사람이 찾을 수 있는 여가 시간에 더욱 큰 열정을 찾을 것 같다.", "활력을 해칠 만큼 고되게 일할 필요만 없다면, 사람은 게으른 사람보다 여가에서 더 큰 즐거움을 찾을 것이다.");
ko("pr131", 1, "시간은 공간 보다 훨씬 일반적이다. 왜냐하면 시간은 어떤 공간적인 순서가 주어지지 않는 감동과 감명,그리고 사상의 세계로 적용되기 때문이다.", "시간은 공간보다 더 일반적이다. 공간적 질서를 부여할 수 없는 인상과 감정과 생각이라는 내면 세계에도 적용되기 때문이다.");
ko("pr132", 1, "언어 순수학자는 일부 언어가 다른 언어보다 낫거나 변화가 오염이 된다는 거릇된 믿음 때문에 언어의 변화나 방언의 차이를 저지하기를 원한다.", "언어 순수주의자들은 어떤 언어가 다른 언어보다 낫다거나 변화는 타락을 부른다는 그릇된 믿음 때문에 언어의 변화나 방언의 분화를 막고 싶어 한다.");
// R-42, R-46
en("pr134", 1, "in human lifetime.", "in a human lifetime.");
en("pr134", 6, "less than one percent the speed of light.", "less than one percent of the speed of light.");
en("pr134", 7, "all kinds of telescope.", "all kinds of telescopes.");
ko("pr134", 7, "관찰함으로서", "관찰함으로써");
// R-41 non-living, R-77 spacing
sentences("pr135", "baa0042a7b", [
  ["It is a human trait to try to define and classify the things we find in the world.", "세상에서 발견하는 것들을 정의하고 분류하려는 것은 인간의 특성이다."],
  ["But the world does not always seem to be made for this.", "그러나 세상이 늘 그렇게 되도록 만들어져 있는 것 같지는 않다."],
  ["As a result, we are often confused by fuzzy edges.", "그래서 우리는 흐릿한 경계 때문에 자주 혼란을 겪는다."],
  ["There are borderline cases that fit partly into one category and partly into another.", "일부는 한 범주에, 일부는 다른 범주에 들어맞는 경계선상의 사례들이 있다."],
  ["This is especially true when we attempt to define life.", "생명을 정의하려 할 때 특히 그렇다."],
  ["There are things in the world that cannot clearly be called either living or non-living.", "세상에는 살아 있다고도, 살아 있지 않다고도 분명히 말할 수 없는 것들이 있다."],
  ["One example is the virus - a particle that can be stored like chemicals in a bottle but, when inside a living cell, can reproduce more of itself.",
    "한 예가 바이러스다. 바이러스는 병 속의 화학 물질처럼 보관할 수 있지만, 살아 있는 세포 안에 들어가면 자신을 복제해 수를 늘릴 수 있는 입자다."],
  ["Although viruses can reproduce, they do not exhibit most of the other characteristics of life.", "바이러스는 번식할 수는 있지만, 생명의 다른 특성은 대부분 보이지 않는다."],
], "R-41, R-77");
ko("pr136", 3, "그 것들이 마치 우리들의 것인냥 느낀다.", "마치 우리 자신의 것인 양 느낀다.");
ko("pr136", 5, "시란 우리의 삶에서 우리가 놓치고 있는 것을 우리에게 제공한다.", "시는 우리 삶에 없는 것, 즉 상상의 즐거움이라는 경험을 준다.");
// R-77
sentences("pr137", "c7fe013c1d", [
  ["Many groups of young people volunteer to teach, without pay, the people of the poor communities how to read and write, how to take care of their water supply and how to better care for their farms and animals.",
    "많은 청년 단체가 보수 없이 자원하여 가난한 지역 사람들에게 읽고 쓰는 법, 식수원을 관리하는 법, 농장과 가축을 더 잘 돌보는 법을 가르친다."],
  ["Thus the formerly hopeless members of the communities see that all is not lost.", "그래서 희망을 잃었던 지역 주민들은 모든 것을 잃은 것은 아니라는 것을 알게 된다."],
  ["They become less discouraged when they realize that they themselves can help make a better future.", "자신들도 더 나은 미래를 만드는 데 힘을 보탤 수 있다는 것을 깨달으면 그들은 덜 낙담하게 된다."],
], "R-77");
// R-62, R-74, R-77 — Korean realigned
sentences("pr138", "0906eb1889", [
  ["The mosquito is the insect most willing to duel with man.", "모기는 인간과 가장 기꺼이 결투를 벌이려는 곤충이다."],
  ["At one time or another, we have all stood on a bed in our pajamas with a slipper in our hand and our eyes fixed on the ceiling.", "누구나 한 번쯤은 잠옷 차림으로 손에 슬리퍼를 들고 천장을 노려보며 침대 위에 서 있어 본 적이 있을 것이다."],
  ["Faced with man, the mosquito's strategy has evolved.", "인간과 맞서면서 모기의 전략은 진화해 왔다."],
  ["It has learned to be quicker, more inconspicuous and livelier on the takeoff.", "모기는 더 빠르고, 더 눈에 띄지 않으며, 날아오를 때 더 날렵해지는 법을 익혔다."],
  ["Some bold mosquitoes of the latest generation do not hesitate to hide under their victims' pillows.", "최신 세대의 대담한 모기들 중에는 희생자의 베개 밑에 숨기를 주저하지 않는 것도 있다."],
  ["They have discovered the principle of Edgar Allan Poe's “The Purloined Letter”: the best hiding place is the most obvious one, for we always think of looking farther away for something that is very near.",
    "그 모기들은 에드거 앨런 포의 “도둑맞은 편지”의 원리를 알아낸 것이다. 가장 좋은 숨을 곳은 가장 눈에 잘 띄는 곳이다. 우리는 아주 가까이 있는 것을 늘 더 먼 곳에서 찾으려 하기 때문이다."],
], "R-62, R-74, R-77");
// R-73, R-77
sentences("pr139", "7a8d1c1321", [
  ["Albert Einstein once attributed the creativity of a famous scientist to the fact that he never went to school, and therefore preserved the rare gift of thinking freely.",
    "알베르트 아인슈타인은 어느 유명한 과학자의 창의성을, 그가 학교에 다니지 않아 자유롭게 생각하는 드문 재능을 지킬 수 있었던 덕분으로 돌린 적이 있다."],
  ["There is undoubtedly truth in Einstein's observation: many artists and geniuses seem to view their schooling as a disadvantage.", "아인슈타인의 말에는 분명 진실이 있다. 많은 예술가와 천재들이 자신이 받은 학교 교육을 불리한 점으로 여기는 것 같기 때문이다."],
  ["But such a truth is not a criticism of schools.", "그러나 그런 진실이 학교에 대한 비판은 아니다."],
  ["It is the function of schools to civilize, not to train explorers.", "학교의 기능은 탐험가를 길러 내는 것이 아니라 사람을 교화하는 것이다."],
  ["The social order demands unity and widespread agreement, both characteristics that are destructive to creativity.", "사회 질서는 통일성과 폭넓은 합의를 요구하는데, 둘 다 창의성을 해치는 특성이다."],
  ["There will be conflict between the demands of society and the impulses of creativity and genius.", "사회의 요구와 창의성·천재성의 충동 사이에는 갈등이 있기 마련이다."],
], "R-73, R-77");
// R-77
sentences("pr140", "e535d59125", [
  ["Recognizing the healing power of humor, many hospitals are starting to take laughing matter seriously.", "유머의 치유력을 인정한 많은 병원이 웃음을 진지하게 받아들이기 시작했다."],
  ["For example, some doctors wheel around a 'laughmobile' cart.", "예를 들어 어떤 의사들은 ‘웃음 수레’를 끌고 병원을 돈다."],
  ["It is stocked with a variety of humorous books and monologues recorded by famous comedians.", "그 수레에는 여러 가지 유머 책과 유명 코미디언들의 독백을 녹음한 것이 가득 실려 있다."],
  ["This idea has met with considerable success.", "이 아이디어는 상당한 성공을 거두었다."],
  ["So it seems that at least to the health profession, laughter is no joke.", "그러니 적어도 의료계에서는 웃음이 농담이 아닌 것 같다."],
], "R-77");
// R-73, R-77
sentences("pr141", "149fa5fbc9", [
  ["Every parent knows how crucial the choice of friends is for every child.", "부모라면 누구나 친구 선택이 아이에게 얼마나 중요한지 안다."],
  ["Childhood friendships tell parents which ways their children are tending.", "어린 시절의 친구 관계를 보면 부모는 아이가 어느 쪽으로 기울고 있는지 알 수 있다."],
  ["They are important because good friendships bring you up, and bad friendships bring you down.", "좋은 우정은 사람을 끌어올리고 나쁜 우정은 끌어내리기 때문에 친구 관계는 중요하다."],
  ["So it matters who our children's friends are.", "그러니 우리 아이들의 친구가 누구인지는 중요하다."],
  ["And it matters, as an example to our children, who our friends are.", "그리고 아이들에게 본보기가 된다는 점에서 우리의 친구가 누구인지도 중요하다."],
  ["Friends should be allies of our better nature.", "친구는 우리의 더 나은 본성의 편이 되어야 한다."],
], "R-73, R-77");
// R-74, R-77
sentences("pr142", "4009f9378b", [
  ["To keep a pleasant working environment, employers cannot allow certain kinds of behaviors such as arriving late or bothering others.", "쾌적한 근무 환경을 유지하기 위해 고용주는 지각이나 남을 귀찮게 하는 것 같은 행동을 용납할 수 없다."],
  ["These behaviors may weaken the group work environment and decrease productivity.", "이런 행동은 함께 일하는 환경을 해치고 생산성을 떨어뜨릴 수 있다."],
  ["So employers always consider teamwork when they judge a worker's performance.", "그래서 고용주는 직원의 성과를 평가할 때 늘 팀워크를 고려한다."],
  ["They look for employees who support each other, take pride in their work, and encourage a pleasant working environment.", "그들은 서로 돕고, 자기 일에 자부심을 갖고, 쾌적한 근무 환경을 만드는 직원을 찾는다."],
  ["Respect, good manners, and thoughtful behaviors are keys to successful teamwork.", "존중, 좋은 매너, 사려 깊은 행동이 성공적인 팀워크의 열쇠다."],
  ["In fact, working well with others is one of the most important job skills.", "사실 다른 사람들과 잘 일하는 것은 가장 중요한 직무 능력 가운데 하나다."],
], "R-74, R-77");
// R-76, R-77
en("pr143", 3, "other devices, Thus, personal", "other devices. Thus, personal");
ko("pr143", 3, "증대됬다.", "커졌다.");
ko("pr143", 2, "무 제한적", "무제한적");
// R-74, R-77
sentences("pr144", "08bab45e16", [
  ["Crowding stresses us.", "혼잡함은 우리에게 스트레스를 준다."],
  ["The more crowded we feel, the more stressed we get.", "더 붐빈다고 느낄수록 스트레스도 더 받는다."],
  ["Work stresses us, too.", "일도 우리에게 스트레스를 준다."],
  ["Workers in manufacturing jobs are likely to suffer serious health problems as a result of the noise, or the stress of being paced by mechanical requirements of the assembly line.",
    "제조업 근로자들은 소음이나, 조립 라인의 기계적 속도에 맞춰야 하는 스트레스 때문에 심각한 건강 문제를 겪기 쉽다."],
  ["The amount of work involved, however, does not necessarily determine the level of stress.", "그러나 일의 양이 반드시 스트레스의 정도를 결정하는 것은 아니다."],
  ["Air traffic controllers, for instance, report that the long stretches of doing relatively little are at least as stressful as the times when they are handling many aircraft in the sky.",
    "예를 들어 항공 교통 관제사들은 비교적 할 일이 거의 없는 시간이 길게 이어지는 것이 하늘의 많은 항공기를 처리할 때 못지않게 스트레스를 준다고 말한다."],
], "R-74, R-77");
// R-72 boundary
sentences("pr145", "6884ccfd3b", [
  ["Our society is a consumer-driven culture.", "우리 사회는 소비가 이끄는 문화다."],
  ["What drives the consumer to consume?", "무엇이 소비자를 소비하게 만드는가?"],
  ["We seem to have created a society so harsh and complex that it makes us feel helpless and insecure and makes us long for improvement.", "우리는 너무 가혹하고 복잡해서 무력감과 불안을 느끼게 하고 나아지기를 갈망하게 만드는 사회를 만든 것 같다."],
  ["But truly improving ourselves or our lot is a superhuman task, so we do what we can instead: we shop.", "그러나 우리 자신이나 처지를 정말로 개선하는 것은 초인적인 일이어서, 우리는 대신 할 수 있는 일을 한다. 쇼핑을 하는 것이다."],
  ["The economy grows, the world gets more complex, we feel more helpless and insecure, so we shop still more.", "경제는 성장하고 세상은 더 복잡해지며, 우리는 더 무력하고 불안해져서 쇼핑을 더 많이 한다."],
], "R-72");
// R-74 napkins
en("pr146", 4, "There are not only Paper Plates and napkins,", "There are not only paper plates and napkins,");
ko("pr146", 4, "종이 접시와 앞치마 뿐아니라", "종이 접시와 냅킨뿐 아니라");
ko("pr146", 1, "자세를 조장한다.", "태도를 부추긴다.");
en("pr146", 8, "We don't reuse or recycle which would save us money.", "We don't reuse or recycle, which would save us money.");
en("pr147", 2, "from the rural areas, these people have become", "from the rural areas. These people have become");
ko("pr147", 2, "외곽 지역으로부터의 대규모의 인구유입에 기인하며,", "주로 많은 사람이 농촌 지역을 떠나온 데서 비롯되었다.");
en("pr147", 7, "The improvement for rural lives is doubly important,", "The improvement of rural life is doubly important,");
ko("pr147", 4, "왜냐하면 그것이 사람들이 거기에 머물도록 장려할 것이기 때문이다.", "그러면 사람들이 농촌에 머물고 싶어질 것이다.");
// R-73, RV-18 narrow-mindedness
en("pr149", 1, "narrow - mindedness, religious impatience,", "narrow-mindedness, religious intolerance,");
ko("pr149", 1, "편협함, 종교적 편협,", "편협함, 종교적 불관용,");
// R-59
sentences("pr150", "10e8f22f78", [
  ["Modern humans have lived on the Earth for only about 300,000 years, but we have changed our planet in many ways in that time.", "현생 인류가 지구에 산 것은 약 30만 년밖에 되지 않지만, 그동안 우리는 여러 방식으로 지구를 바꾸어 놓았다."],
  ["Many of the things that we have done are good, but many more are not good for the Earth.", "우리가 한 일 가운데 좋은 일도 많지만, 지구에 좋지 않은 일은 그보다 더 많다."],
  ["We have created traffic pollution, global warming, and acid rain.", "우리는 교통 공해, 지구 온난화, 산성비를 만들어 냈다."],
  ["These problems are very serious for our future.", "이런 문제들은 우리의 미래에 매우 심각하다."],
  ["But we can do something now!", "그러나 우리는 지금 무언가를 할 수 있다!"],
  ["In many places, people have already taken action to improve the environment.", "많은 곳에서 사람들이 이미 환경을 개선하기 위한 행동에 나섰다."],
], "R-59");
// R-73; quotation kept in one row; pr242 is the same passage (R-01) — fixed in apply-reading-passages-225.cjs
sentences("pr152", "392d191aac", [
  [`A child will often ask for approval openly: "Look at my painting! Isn't it pretty?"`, `아이는 흔히 드러내 놓고 인정을 구한다. "내 그림 좀 보세요! 예쁘지 않아요?"`],
  ["But adults are generally less honest about their need for support.", "그러나 어른은 대개 지지받고 싶은 마음을 덜 솔직하게 드러낸다."],
  [`A grown-up who tried his or her best at something isn't likely to ask, "Didn't I do a good job?" But the adult needs to hear it all the same.`, `무언가에 최선을 다한 어른이 "나 잘하지 않았어요?"라고 묻지는 않겠지만, 그래도 어른 역시 그 말을 들을 필요가 있다.`],
  ["In other words, children and adults alike want to hear positive remarks.", "다시 말해 아이든 어른이든 긍정적인 말을 듣고 싶어 한다."],
  ["Therefore, don't forget to praise others when they need support.", "그러니 다른 사람이 지지를 필요로 할 때 칭찬하는 것을 잊지 마라."],
], "R-73");
en("pr153", 3, "choose different color for", "choose different colors for");
ko("pr153", 4, "한 악절 한 악절을 연주하는 것이 아니다.", "파트별로 따로 연주하는 것이 아니다.");
ko("pr153", 5, "'교향곡'이이란 단어는 '함께 소리를 내는 것'을 의미한다.", "'교향곡(symphony)'이라는 말은 '함께 울림'을 뜻한다.");
// R-74 steamed
ko("pr154", 2, "사실, 사람들의 하루 하루의 일상은 이 종이를 만드는 과정과도 같다.", "사실 이 종이 만드는 과정에 사람들의 일상이 담겨 있다고 할 수도 있다.");
ko("pr154", 4, "그 나뭇가지들은 복잡한 과정을 거쳐서 질겨지고 유연해진다.", "그 가지들은 복잡한 과정을 거쳐 질기고 유연한 종이가 된다.");
ko("pr154", 5, "그것들은 삶아지고, 끓여지고", "가지는 쪄지고, 삶아지고,");
ko("pr154", 6, "상당한 시간 동안", "몇 시간 동안");
// R-74 tension between change and balance, broken down
ko("pr155", 2, "그러나 자연을 자세히 관찰하면 변화와 균형은 꾸준히 균형을 이룬다.", "그러나 자연을 자세히 관찰하면 변화와 균형 사이에 끊임없는 긴장이 있음을 알게 된다.");
ko("pr155", 5, "숲 속에 있는 개체의 죽은 본체는 쓰러지고 토양이 되지만 다른 개체에게 영양을 공급해 준다.", "숲속 생물의 사체는 분해되어 흙이 되고, 그 흙은 다시 다른 생물에게 양분을 준다.");
en("pr156", 4, "the most important of learning.", "the most important part of learning.");
ko("pr156", 2, "정규 기술을", "형식적인 기술을");
en("pr157", 1, "“Liberty is to faction what air is to fire.\"", "“Liberty is to faction what air is to fire.”");
ko("pr157", 1, "자유와 당파의 관계는 공기와 불의 관계이다.", "“자유와 당파의 관계는 공기와 불의 관계와 같다.”");
ko("pr157", 2, "제임스 매디선이 이러한 말을 했을 때 그는 분명히 당파가 무성한 국가가 이익을 위해서 끊임없이 압력을 가하는 특별 이익 단체를 만들어 낼 것을 분명히 예상했다.", "제임스 매디슨은 이 말을 쓸 때, 당파로 가득한 이 나라가 자기 이익을 위해 끊임없이 압력을 가하는 이익 단체들을 만들어 낼 것을 분명히 예상했다.");
ko("pr157", 4, "바램들을", "바람들을");
en("pr158", 5, "this kind of options", "this kind of option");
ko("pr158", 2, "거짓말을 말할 수 있다.", "거짓말을 할 수 있다.");
ko("pr158", 8, "진정한 양자 택일의 문제들에 직면해 있다는 것것을", "진정한 선택지 앞에 있다는 것을");
// R-70
en("pr159", 3, " Our experience may influence how we interpret paintings.", "");
ko("pr159", 3, "말했을지도 모른다 → 우리의 (A) 경험은 어떻게 (B) 그림을 해석할 지에 영향을 끼칠지도 모른다.", "말했을지도 모른다.");
// R-78 the passage stopped mid-thought
sentences("pr160", "e58a207870", [
  ["As the snow piles up higher in a woodland over the course of winter, it creates advantages and problems for animals.", "겨울 동안 숲에 눈이 점점 높이 쌓이면 동물들에게 좋은 점과 문제가 함께 생긴다."],
  ["For the rabbit, deep snow may provide food.", "토끼에게는 깊이 쌓인 눈이 먹이를 주기도 한다."],
  ["Since it feeds on the winter buds of young trees, the deeper icy snow helps the animal to reach more buds.", "토끼는 어린나무의 겨울눈을 먹고 사는데, 더 깊이 얼어붙은 눈을 밟고 올라서면 더 많은 눈에 닿을 수 있다."],
  ["What's more, sometimes the weight of the snow causes some trees to bend to the ground.", "게다가 때로는 눈의 무게 때문에 나무가 땅까지 휘기도 한다."],
  ["This means their tender tops are easier to reach for the rabbit.", "그러면 토끼가 나무의 연한 꼭대기에 더 쉽게 닿을 수 있다."],
  ["On the other hand, the situation is the opposite for deer.", "반면 사슴에게는 상황이 정반대다."],
  ["Deep snow makes it hard for deer to walk and to find food, so many of them go hungry.", "깊은 눈 때문에 사슴은 걷기도 먹이를 찾기도 어려워, 많은 사슴이 굶주린다."],
], "R-78");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
