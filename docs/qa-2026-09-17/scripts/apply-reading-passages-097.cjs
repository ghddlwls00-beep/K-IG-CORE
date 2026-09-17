#!/usr/bin/env node
/**
 * READING passages pr097–pr128 — every audit finding in this range (R-34, R-35, R-36, R-37,
 * R-39, R-40, R-41, R-42, R-44, R-45, R-46 parts) plus the same kinds of error found while
 * reading each passage in full.
 *
 *  - pr115 #8 was the vocabulary note "*torso: 몸통" (R-34): removed, Korean realigned.
 *  - pr118 (R-35) joined two exam passages with "(B)" in the Korean, which then slid a row.
 *  - pr123 #3 was an exam answer choice overstating #1 (R-39): removed.
 *  - pr125 (R-37) and pr128 (R-45) were forecasts for 2010 and 2005 written in the present;
 *    they are now reported as what was expected at the time (Korea made 4.3 million cars in
 *    2010 and ranked fifth, not 6.5 million / top four).
 *  - pr110: exercise slows bone loss; it does not "stop" osteoporosis (R-45).
 *
 *   node apply-reading-passages-097.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-36 realigned, R-46
sentences("pr097", "3763c5b953", [
  ["The introduction of unique products alone does not guarantee market success.", "독특한 제품을 내놓는 것만으로는 시장에서의 성공이 보장되지 않는다."],
  ["Another vital factor is increasing one’s responsiveness to the markets by providing products suited for the local communities that make up the market.",
    "또 하나의 핵심 요소는 시장을 이루는 지역 사회에 맞는 제품을 공급해 시장에 대한 대응력을 높이는 것이다."],
  ["This means understanding that each country, community and individual has unique characteristics and needs; it requires sensitivity to regional and individual differences.",
    "이는 각 나라와 지역 사회와 개인이 저마다 독특한 특성과 요구를 갖고 있음을 이해한다는 뜻이며, 지역과 개인의 차이에 민감해야 한다는 뜻이다."],
  ["In other words, one of the challenges is to avoid a one-size-fits-all strategy that places too much emphasis on the “global” aspect alone.",
    "다시 말해, 과제 중 하나는 “세계적” 측면만 지나치게 강조하는 획일적인 전략을 피하는 것이다."],
  ["Even categorizing countries as “developed” or “emerging” is dangerous.", "나라를 “선진국”이나 “신흥국”으로 분류하는 것조차 위험하다."],
  ["Upon closer analysis, “emerging” countries are not only vastly different from one another, they are also composed of numerous unique individuals and communities.",
    "자세히 분석해 보면 “신흥국”들은 서로 크게 다를 뿐 아니라, 각각 수많은 독특한 개인과 지역 사회로 이루어져 있다."],
], "R-36, R-46");
// R-42, R-46
sentences("pr098", "88380c750b", [
  ["Most helpful to the calm and peaceful atmosphere that the two-year-old child needs but cannot produce for himself or herself is the presence of comforting music, in almost any form.",
    "두 살배기 아이에게 필요하지만 스스로 만들어 내지 못하는 차분하고 평화로운 분위기에 가장 도움이 되는 것은, 거의 어떤 형태든 마음을 달래 주는 음악이다."],
  ["Mother’s singing can help.", "엄마의 노래가 도움이 될 수 있다."],
  ["Chanting a request, such as “Time to come to breakfast,” may be more effective than simply saying the request.", "“아침 먹을 시간이야” 같은 부탁을 노래하듯 말하는 것이 그냥 말하는 것보다 더 효과적일 수 있다."],
  ["Recordings, especially of nursery rhymes, are just the thing for those periods at the end of the morning or afternoon when children are often easily irritated.",
    "녹음된 음악, 특히 동요는 아이들이 쉽게 짜증을 내는 오전이나 오후가 끝나 갈 무렵에 딱 알맞다."],
  ["Some children, especially boys, like to have their own music players and may play these for very long periods of time.", "어떤 아이들, 특히 남자아이들은 자기만의 음악 플레이어를 갖고 싶어 하며, 아주 오랫동안 틀어 놓기도 한다."],
], "R-42, R-46");
// R-42, R-44 (unless)
sentences("pr099", "238de8ff8e", [
  [`An eighteenth-century scholar said, "Water, which is essential for life, costs nothing.`, `18세기의 한 학자는 이렇게 말했다. "생명에 꼭 필요한 물은 값이 들지 않는다.`],
  [`On the other hand, diamonds, which are essential for nothing, cost a lot."`, `반면 아무 데도 꼭 필요하지 않은 다이아몬드는 값이 매우 비싸다."`],
  ["Unfortunately, the world has changed considerably since that remark was made.", "유감스럽게도 그 말이 나온 이후 세상은 많이 변했다."],
  ["What was true over two hundred years ago is certainly no longer the case.", "200여 년 전에 사실이었던 것이 이제는 분명 더 이상 사실이 아니다."],
  [`What is still true, however, is a writer's comment, "When the well's dry, we know the worth of it."`, `그러나 여전히 맞는 것은 "우물이 말라야 물의 가치를 안다"는 한 작가의 말이다.`],
  ["That is, we ignore it when we have it - unless we have too much of it, of course.", "즉 우리는 물이 있을 때는 그것을 무시한다. 물론 물이 너무 많을 때는 예외지만."],
  ["Once there is a threat to its supply, however, water can quickly become the only thing that matters.", "그러나 일단 물 공급이 위협받으면 물은 금세 유일하게 중요한 것이 될 수 있다."],
  ["We know only too well that, without it, there can be no life.", "물이 없으면 생명도 있을 수 없다는 것을 우리는 너무도 잘 안다."],
], "R-42, R-44");
en("pr100", 1, "provided with artificial mother.", "provided with artificial mothers.");
en("pr100", 4, "This experiment suggest that", "This experiment suggests that");
ko("pr100", 4, "찾는다는 것을 보여 준다.", "찾았다는 것을 시사한다.");
// R-44
en("pr101", 3, "research that proves our mind affects", "research that shows our mind affects");
ko("pr101", 3, "증명하는 많은 연구가 있다.", "보여 주는 연구가 많이 나왔다.");
ko("pr101", 4, "환자의 반 이상이 어떤 신체 기관의 병을 가지고 있는 것이 아니라 심리적인 도움을 찾으려는 사람들이라고 보고했다.", "환자 가운데 상당 부분이 신체 기관에 병이 있는 것이 아니라 심리적인 도움을 구하는 사람들이라고 보고했다.");
ko("pr102", 6, "성공적으로 경쟁하지 못한 사람들에게는 그들 자신의 생존이 의문시 될 수 있다.", "경쟁에서 이기지 못하는 쪽은 생존 자체가 위태로워질 수 있다.");
ko("pr103", 2, "발전의 속도가 줄어들 조짐은 보이지 않았다.", "발전 속도가 느려질 조짐은 보이지 않는다.");
ko("pr103", 3, "농업은 주요하게 세 부문으로 계속 발전해 나갈 것이다.", "농업은 크게 세 가지 방향으로 계속 발전할 것이다.");
ko("pr103", 5, "컴퓨터에 의해 조정될 것이다.", "컴퓨터로 제어될 것이다.");
ko("pr103", 7, "세 번째로 농업 생산품은 여러 가지 면에서 사용될 것이다.", "세 번째로 농산물은 여러 용도로 쓰이게 될 것이다.");
// R-36 realigned (the Korean was one row ahead; "temperate climate" missing)
sentences("pr104", "ba3153a870", [
  ["Mexico attracts different types of visitors.", "멕시코에는 여러 부류의 방문객이 모여든다."],
  ["One group is composed of artists. As admirers of the Mexican culture, they want to be close to the subjects they are writing about or painting.",
    "한 부류는 예술가들이다. 멕시코 문화를 동경하는 그들은 자신이 글로 쓰거나 그리는 대상 가까이에 있고 싶어 한다."],
  ["Another group consists of retirees who also need to live on reduced incomes.", "또 한 부류는 줄어든 수입으로 살아야 하는 은퇴자들이다."],
  ["They like the unhurried way of life with its long afternoon nap and they enjoy the temperate climate.", "그들은 긴 낮잠을 즐기는 느긋한 생활 방식을 좋아하고 온화한 기후를 즐긴다."],
  ["The third group is attracted by the resort with its colorful night life.", "세 번째 부류는 화려한 밤 문화가 있는 휴양지에 끌린다."],
  ["In Acapulco, they can play all night, and swim in the warm ocean water.", "아카풀코에서 그들은 밤새 놀고 따뜻한 바닷물에서 수영할 수 있다."],
], "R-36");
sentences("pr105", "025d978ac2", [
  ["The primary aims of government should be three: security, justice, and conservation.", "정부의 주된 목표는 안전, 정의, 보전의 세 가지여야 한다."],
  ["These are things of the utmost importance to human happiness, and they are things that only government can bring about.", "이것들은 인간의 행복에 더없이 중요한 것들이며, 정부만이 이룰 수 있는 것들이다."],
  ["At the same time, no one of them is absolute; each may, in some circumstances, have to be sacrificed in some degree for the sake of a greater degree of some other good.",
    "동시에 그중 어느 것도 절대적이지 않다. 어떤 상황에서는 다른 좋은 것을 더 많이 얻기 위해 각각을 어느 정도 희생해야 할 수도 있다."],
  ["I shall say something about each in turn.", "각각에 대해 차례로 이야기하겠다."],
], "R-18 sentence boundary");
// R-42, R-44
sentences("pr106", "cdb6bff448", [
  ["For their own benefit, companies have various ways of offering lower prices.", "회사들은 자사의 이익을 위해 여러 방법으로 더 낮은 가격을 제시한다."],
  ["One way of doing this is a trade discount.", "그 한 가지 방법이 거래 할인이다."],
  ["It is offered to the shops or businesses that buy goods on a large scale and sell them.", "거래 할인은 상품을 대량으로 사서 되파는 상점이나 업체에 제공된다."],
  ["There is also a quantity discount, which is offered to individuals who order large quantities of a product.", "수량 할인도 있는데, 이는 한 제품을 대량으로 주문하는 개인에게 제공된다."],
  ["The company gives a price break to these buyers because they help cut the costs of selling, storing, shipping, and billing.", "회사가 이런 구매자에게 값을 깎아 주는 것은 그들 덕분에 판매, 보관, 배송, 청구에 드는 비용이 줄기 때문이다."],
  ["Finally, a cash discount is a lower price offered to people who pay in cash.", "마지막으로 현금 할인은 현금으로 지불하는 사람에게 제공되는 낮은 가격이다."],
], "R-42, R-44");
sentences("pr107", "9b7ef373db", [
  ["There are basically two types of magazines: news magazines and special-interest magazines.", "잡지에는 기본적으로 뉴스 잡지와 특별 관심사 잡지의 두 종류가 있다."],
  ["News magazines are a combination of newspaper and magazine.", "뉴스 잡지는 신문과 잡지를 합친 것이다."],
  ["Most news magazines are published weekly.", "대부분의 뉴스 잡지는 매주 발행된다."],
  ["They summarize the major world and national news stories.", "뉴스 잡지는 세계와 국내의 주요 뉴스를 요약한다."],
  ["They also report on important events in many subject areas.", "또한 여러 분야의 중요한 사건을 보도한다."],
  ["Special-interest magazines, on the other hand, deal mainly with one particular subject.", "반면 특별 관심사 잡지는 주로 한 가지 특정 주제를 다룬다."],
  ["Magazines of this type are usually published once a month.", "이런 종류의 잡지는 보통 한 달에 한 번 발행된다."],
], "R-18 sentence boundary");
// R-46
ko("pr108", 2, "첫 째는 물질적 문화인데, 그것 은 사람들이 만들서 의미를 부여한 모든 가시적 물체들로 이루어져 있다.", "첫째는 물질문화로, 사람들이 만들고 의미를 부여한 모든 물리적 사물로 이루어져 있다.");
ko("pr108", 4, "우리는 그 것들의 목적과와 의미에 대한 공감적 이해를 하고 있다.", "우리는 그것들의 목적과 의미를 함께 이해하고 있다.");
ko("pr108", 6, "관습이 있 다.", "관습이 있다.");
// R-41 feel, R-44 sometimes
en("pr109", 4, "possible to feet very lonely", "possible to feel very lonely");
ko("pr109", 1, "그러나 모든 프러스 요인에 비해 마이너스 요인도 있다.", "그러나 모든 장점에는 단점이 따른다.");
ko("pr109", 3, "대게는", "때때로");
// R-45 exercise slows bone loss
en("pr110", 3, "This can be stopped by regular exercise.", "This can be slowed by regular exercise.");
ko("pr110", 3, "이것은 규칙적인 운동에 의해 막을 수 있다.", "이 과정은 규칙적인 운동으로 늦출 수 있다.");
ko("pr110", 2, "규칙적으로 오랜 시간 동안만 행해진다면,", "규칙적으로 오랫동안 꾸준히 하면,");
ko("pr111", 3, "완전히 망각한 체,", "완전히 잊은 채,");
ko("pr111", 5, "짜증나 질 필요가 없다.", "방해받을 필요가 없다.");
// R-41, R-46
sentences("pr112", "1733a0298b", [
  ["As a result of the economy, there aren't many jobs available right now.", "경제 사정 때문에 지금 당장은 구할 수 있는 일자리가 많지 않다."],
  ["But don't be discouraged because there are some things you can try.", "그러나 해 볼 수 있는 일들이 있으니 낙심하지 마라."],
  ["Have you considered taking night classes to train for another kind of job?", "다른 직종을 준비하기 위해 야간 강좌를 듣는 것을 생각해 본 적이 있는가?"],
  ["Many workers learn new skills while keeping their regular jobs.", "많은 근로자들이 원래 일을 계속하면서 새로운 기술을 배운다."],
  ["Another possibility is looking for a different type of job in your present company.", "또 다른 방법은 지금 다니는 회사에서 다른 종류의 일을 찾아보는 것이다."],
  ["Finally, even if there are no other jobs around, be sure to relax.", "마지막으로, 주변에 다른 일자리가 없더라도 꼭 마음을 편히 가져라."],
  ["Take time out to do things you enjoy after work in order to reduce the stress you experience during your workday.", "일하는 동안 받은 스트레스를 줄이기 위해 퇴근 후에 즐기는 일을 할 시간을 내라."],
], "R-41, R-46");
ko("pr113", 1, "건축 규약이", "건축 법규가");
// R-42, R-44
en("pr114", 5, "what government do at", "what governments do at");
ko("pr114", 1, "시민단체가 바람직한 사회변화를 야기하기 위해 노력하면, 긍정적 사회변화가 일어난다.", "사회가 더 나은 쪽으로 바뀌는 것은 시민들이 모여 그런 변화를 이루려고 노력할 때이다.");
ko("pr114", 3, "사회봉사 활동을 한다.", "사회 서비스를 제공한다.");
ko("pr114", 7, "그 이유는 그들은 모든 분야의 사람을 이용할 수 있기 때문이다.", "그들은 각계각층의 사람들을 활용할 수 있기 때문이다.");
// R-34
sentences("pr115", "24e62ac1df", [
  ["The most satisfying and expressive drawing is done with the active engagement of the entire body.", "가장 만족스럽고 표현력이 풍부한 그림은 온몸을 적극적으로 쓰면서 그려진다."],
  ["Your hand is connected to your whole arm, the arm to the torso, supported by your feet on the floor.", "손은 팔 전체와, 팔은 몸통과 이어져 있고, 몸통은 바닥을 딛은 발이 받쳐 준다."],
  ["To awaken the active engagement of your whole body in drawing, try the following: Begin by drawing small circles in space with each of your fingers.",
    "그림을 그릴 때 온몸을 적극적으로 쓰는 감각을 깨우려면 다음과 같이 해 보라. 먼저 손가락 하나하나로 허공에 작은 원을 그린다."],
  ["Then move your hands in circles around the wrist.", "그다음 손목을 중심으로 손을 원을 그리며 돌린다."],
  ["Next, make bigger circles with your forearms.", "이어서 팔뚝으로 더 큰 원을 그린다."],
  ["And finally, make giant swinging arm circles.", "마지막으로 팔을 크게 휘둘러 커다란 원을 그린다."],
  ["Now you see how your entire body can be used in the activity of drawing.", "이제 그림 그리기에 온몸이 어떻게 쓰일 수 있는지 알게 되었을 것이다."],
], "R-34");
// R-40
sentences("pr116", "958d114c68", [
  ["When riding on buses, trains, and other public transportation, speak in a quiet or normal conversational tone, and try to avoid extended phone conversations.",
    "버스나 기차 같은 대중교통을 탈 때는 조용하거나 보통의 대화 목소리로 말하고, 긴 통화는 피하도록 하라."],
  ["Loud, animated conversations can annoy others.", "크고 들뜬 대화는 다른 사람들을 짜증 나게 할 수 있다."],
  ["Keep your wireless ringer as low as practical to avoid disturbing others.", "다른 사람을 방해하지 않도록 휴대 전화 벨소리를 가능한 한 작게 해 두라."],
  ["Keep your phone close and easily accessible if you're expecting an important call.", "중요한 전화를 기다리고 있다면 전화기를 가까이, 쉽게 꺼낼 수 있는 곳에 두라."],
  ["If you must take an important phone call but are in an inappropriate setting, such as during lectures and concerts, set the phone to vibrate mode and answer the phone only after leaving the room.",
    "중요한 전화를 받아야 하는데 강의나 공연 중처럼 적절하지 않은 곳에 있다면, 전화기를 진동으로 해 두었다가 밖으로 나간 뒤에 받으라."],
], "R-40");
// R-44, R-46
ko("pr117", 3, "책상용 나무를", "책장용 목재를");
ko("pr117", 5, "다름 단계는", "다음 단계는");
ko("pr117", 6, "목 작업물에 페인트칠을 함으로써 마지막 손질을 추가해라.", "목재에 페인트를 칠해 마무리하라.");
ko("pr117", 7, "갖게 됬다.", "갖게 되었다.");
// R-35
sentences("pr118", "1aea4f9035", [
  ["More frequent use of computers will create a serious danger to our health.", "컴퓨터를 더 자주 쓰면 건강에 심각한 위험이 생길 것이다."],
  ["First of all, more people will have to wear glasses, because always staring at computer screens is likely to damage our eyes.", "우선 컴퓨터 화면을 늘 쳐다보면 눈이 상하기 쉬우므로 안경을 써야 하는 사람이 더 많아질 것이다."],
  ["Sitting at computer desks for hours can also cause damage to our backs.", "몇 시간씩 컴퓨터 책상 앞에 앉아 있으면 허리에도 무리가 갈 수 있다."],
  ["In addition, we won't get enough exercise, for we will often be forced to spend a long period of time at the computers.", "게다가 컴퓨터 앞에서 오랜 시간을 보내야 하는 일이 잦아 운동도 충분히 하지 못할 것이다."],
  ["The future will be a lonely place to live because of computers.", "컴퓨터 때문에 미래는 외로운 곳이 될 것이다."],
  ["We won't be going to the supermarket, or even to school any more.", "우리는 더 이상 슈퍼마켓에도, 심지어 학교에도 가지 않을 것이다."],
  ["Everyday goods and even education will come to us on-line.", "생필품과 교육까지도 온라인으로 우리에게 올 것이다."],
  ["In addition, we will talk with one another using the computer.", "게다가 우리는 컴퓨터를 이용해 서로 대화할 것이다."],
  ["All of these will make us less human, in that the computer will take away our opportunities to meet for true human relationships.", "컴퓨터가 진정한 인간관계를 위해 만날 기회를 빼앗는다는 점에서, 이 모든 것은 우리를 덜 인간적으로 만들 것이다."],
], "R-35");
// R-41, R-44, R-46
sentences("pr119", "57fa7dcf14", [
  ["Babies experience anxiety when they see strangers.", "아기들은 낯선 사람을 보면 불안을 느낀다."],
  ["Children aged 2 through 6 show anxiety about things not based in reality such as ghosts.", "2~6세 아이들은 유령처럼 현실에 근거하지 않은 것에 불안을 보인다."],
  ["Kids aged 7 through 12 often fear real situations that may happen to them, such as injuries or accidents.", "7~12세 아이들은 다치거나 사고를 당하는 것처럼 실제로 일어날 수 있는 상황을 자주 두려워한다."],
  ["As a child grows, fears may disappear.", "아이가 자라면서 두려움은 사라질 수 있다."],
  ["For example, a child who couldn't sleep with the light off at age 5 may enjoy ghost stories years later.", "예를 들어 다섯 살 때 불을 끄고는 잠들지 못하던 아이가 몇 년 뒤에는 귀신 이야기를 즐길 수도 있다."],
  ["And some fears may extend only to one kind, as in the example of the child who wants to pet a lion at the zoo but wouldn't dream of petting the neighbor's dog.",
    "또 어떤 두려움은 한 종류에만 해당하기도 한다. 동물원의 사자는 쓰다듬고 싶어 하면서 옆집 개를 쓰다듬는 것은 꿈도 꾸지 못하는 아이가 그런 예다."],
], "R-41, R-44, R-46");
en("pr120", 4, "Dutch astronomer Christian Huygens", "Dutch astronomer Christiaan Huygens");
ko("pr120", 4, "네델란드의 천문학자 Christian Huygens가", "네덜란드의 천문학자 Christiaan Huygens가");
ko("pr120", 2, "기계 장치로 된 시계가 14세기에 이탈리아의 탑들 위에 나타나기 시작했지만 시간을 맞추는 것은 하루에 15분까지 틀렸기 때문에 시계의 모습보다는 덜 인상적이었다.", "기계식 시계는 14세기 이탈리아의 탑에 등장하기 시작했지만, 하루에 15분까지 틀려서 시간을 맞추는 능력은 겉모습만큼 인상적이지 못했다.");
ko("pr121", 1, "쉬게 함으로서,", "쉬게 함으로써");
ko("pr121", 4, "여러 질병들은, 우리 몸이 우리를 계속해서 치료하게 하도록, 우리를 졸리게 만든다.", "꽤 많은 질병은 우리 몸이 치료에 전념할 수 있도록 우리를 졸리게 만든다.");
// R-18 boundary, R-46
sentences("pr122", "cab991ede5", [
  ["In recent years, Colombia has not received much money from its exports.", "최근 몇 년 동안 콜롬비아는 수출로 많은 돈을 벌지 못했다."],
  ["Its major export crop is coffee but the demand for coffee in the world has dropped.", "콜롬비아의 주요 수출 작물은 커피인데 세계의 커피 수요가 줄었다."],
  ["Also, other countries have begun to export more coffee, so the price has fallen.", "또 다른 나라들이 커피를 더 많이 수출하기 시작해 가격이 떨어졌다."],
  ["Finally, the Colombian government has encouraged the farmers to produce more food so that the country can become self-sufficient in food; as a result, the farmers have produced less coffee.",
    "마지막으로 콜롬비아 정부가 식량을 자급할 수 있도록 농민들에게 식량을 더 많이 생산하라고 권장했고, 그 결과 농민들은 커피를 덜 생산하게 되었다."],
  ["Because of these factors, Colombia now gets much less cash from coffee exports than it did ten years ago.", "이런 요인들 때문에 콜롬비아가 지금 커피 수출로 버는 돈은 10년 전보다 훨씬 적다."],
], "R-46");
// R-39
sentences("pr123", "9e3195c22a", [
  ["Television is partly blamed for a sharp slide in traditional learning.", "텔레비전은 전통적인 학습 능력이 급격히 떨어진 원인 가운데 하나로 지목된다."],
  ["Since television became nearly universal in the early 1960s, average scores for high school students taking the Scholastic Aptitude test, the broadest measure of academic ability, have declined from 478 to 424 on the verbal exam and from 503 to 466 in mathematics.",
    "1960년대 초 텔레비전이 거의 모든 가정에 보급된 이후, 학업 능력을 가장 폭넓게 재는 SAT를 치른 고등학생들의 평균 점수는 언어 영역에서 478점에서 424점으로, 수학에서 503점에서 466점으로 떨어졌다."],
], "R-39 (#3 was an exam answer choice)");
ko("pr124", 1, "나무을", "나무를");
ko("pr124", 6, "아이들을 보다 잘 감시하고 건물들을 더 잘 살펴볼 수 있는 분위기를", "아이들이 더 잘 보살펴지고 건물이 더 잘 지켜지는 분위기를");
// R-37
sentences("pr125", "5f8532b6bb", [
  ["Since it manufactured its first car in 1955, Korea has grown to be one of the largest automobile producers in the world.", "1955년 첫 자동차를 만든 이후 한국은 세계에서 손꼽히는 자동차 생산국으로 성장했다."],
  ["In the early 2000s, it was expected to be among the world’s top four auto-making countries by 2010, because of its competitiveness in small car manufacturing, its skilled workforce, and its leading information technology.",
    "2000년대 초에는 소형차 생산의 경쟁력, 숙련된 인력, 앞선 정보 기술 덕분에 한국이 2010년까지 세계 4대 자동차 생산국에 들 것으로 예상되었다."],
  ["Forecasters said that, with a production of 6.5 million units in 2010, Korea would hold 10 percent of the global auto market.", "전문가들은 한국이 2010년에 650만 대를 생산해 세계 자동차 시장의 10퍼센트를 차지할 것이라고 내다보았다."],
], "R-37 (a 2010 forecast, now told as a forecast)");
// R-45
sentences("pr128", "316bba6db1", [
  ["Around the year 2000, the e-business industry was faced with a labor shortage.", "2000년 무렵 전자 상거래 산업은 인력 부족에 직면해 있었다."],
  ["Experts pointed out that this was a serious problem that could slow down the development of the economy.", "전문가들은 이것이 경제 발전을 늦출 수 있는 심각한 문제라고 지적했다."],
  ["Industries were competitively changing their businesses into e-businesses, and thus the demand for the required workforce was expected to grow.",
    "기업들은 앞다투어 사업을 전자 상거래로 바꾸고 있었고, 그에 따라 필요한 인력에 대한 수요는 늘어날 것으로 예상되었다."],
  ["A survey at the time showed that there was a gap between the labor supply and demand in the e-business industry.", "당시의 한 조사는 전자 상거래 산업에서 인력의 공급과 수요 사이에 격차가 있음을 보여 주었다."],
  ["This gap was not expected to close before 2005.", "이 격차는 2005년 이전에는 좁혀지지 않을 것으로 예상되었다."],
], "R-45 (a 2005 forecast, now told as a forecast)");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
