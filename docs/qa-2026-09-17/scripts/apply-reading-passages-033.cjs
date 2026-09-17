#!/usr/bin/env node
/**
 * READING passages pr033–pr064 — every audit finding in this range (R-12, R-13, R-14, R-15,
 * R-18, R-20, R-21, R-27, R-28, R-33, RV-04, RV-07, RV-09 passage parts) plus the same kinds of
 * error found while reading each passage in full.
 *
 *  - pr048 #7 was a vocabulary note ("*nearsighted: 근시안의") glued to the exam's summary
 *    sentence (R-14) and pr056 #5 was the exam's answer choices (R-21): both rows removed,
 *    and pr056's Korean, which had slid one row, realigned ("because it does" = 실제로 중요하니까,
 *    it had been translated as the opposite).
 *  - pr036 is the same passage as pr009 (R-01) and gets the same corrected text.
 *  - pr054 (a company's seminar advertisement, R-30) keeps its text: whether to replace it is
 *    for the owner/lawyer; only the Korean mistranslation is fixed.
 *
 *   node apply-reading-passages-033.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// RV-07 dash restored
sentences("pr033", "199e1be53e", [
  ["Nothing can take the place of reading—no lecture or image on a screen has the same power to enlighten.",
    "어떤 것도 독서를 대신할 수 없다. 어떤 강의나 화면 속 영상도 독서만큼 사람을 깨우치는 힘을 갖고 있지 않다."],
  ["Pictures are a most valuable means of illustrating a written text, but they hardly enable us to form general ideas.",
    "그림은 글을 설명하는 데 매우 귀중한 수단이지만, 우리가 일반적인 개념을 형성하는 데는 거의 도움이 되지 않는다."],
  ["Films, like the spoken word, flow by and are lost to us.", "영화는 입으로 한 말처럼 흘러가 버려 우리에게서 사라진다."],
  ["Books abide, as life-long companions.", "책은 평생의 동반자로 오래 남는다."],
], "RV-07");
ko("pr034", 1, "상식은 별도로 하더라도 , 사업에 있어서 가장 중요한 자산은, 자신이나 상황에 대해 웃을 수 있는 능력인, 유머감각이다.", "상식을 제외하면 사업에서 가장 중요한 자산은 유머 감각, 즉 자기 자신이나 상황을 보고 웃을 줄 아는 능력이다.");
ko("pr034", 5, "본적이", "본 적이");
// R-18 duplicated clause, R-20
sentences("pr035", "1031d90aec", [
  ["Science and technology have changed a great deal since the latter part of the nineteenth century.", "과학과 기술은 19세기 후반 이후로 크게 변했다."],
  ["The world has changed, too.", "세상도 변했다."],
  ["It has become more complex and increasingly specialized.", "세상은 더 복잡해지고 점점 더 전문화되었다."],
  ["There is much more to know in every field.", "모든 분야에서 알아야 할 것이 훨씬 더 많아졌다."],
  ["It is not only the scientist and the computer expert who need special training now, but also the government official and the business manager.",
    "이제 특별한 훈련이 필요한 사람은 과학자와 컴퓨터 전문가만이 아니라 정부 관리와 기업 경영자이기도 하다."],
  ["Besides, a rapid increase in the number of college graduates has made the competition for jobs much greater than it used to be.",
    "게다가 대학 졸업자 수가 급격히 늘어 일자리 경쟁이 예전보다 훨씬 치열해졌다."],
  ["The one best qualified, the expert, wins.", "가장 자격을 잘 갖춘 사람, 즉 전문가가 이긴다."],
], "R-18, R-20");
// R-01 same passage as pr009 — same corrected text (R-15)
sentences("pr036", "6ca07b5fae", [
  ["Today, the industrial economy is changing into a knowledge economy based on science and technology.",
    "오늘날 산업 경제는 과학과 기술에 바탕을 둔 지식 경제로 바뀌고 있다."],
  ["Clearly, modern societies are facing a major change into a new economic system where human resourcefulness counts far more than natural resources.",
    "분명히 현대 사회는 천연자원보다 인간의 지략이 훨씬 더 중요한 새로운 경제 체제로의 큰 변화에 직면하고 있다."],
  ["It is brain power that can guarantee our economic success in the midst of the fierce competition of the current free world market.",
    "오늘날 자유 세계 시장의 치열한 경쟁 속에서 우리의 경제적 성공을 보장할 수 있는 것은 바로 두뇌의 힘이다."],
], "R-15 (same passage as pr009, R-01)");
sentences("pr037", "35b16ee15b", [
  ["It is not knowledge, be it great or small, but the arrogance of knowledge, that misleads men.", "사람을 잘못 이끄는 것은 크든 작든 지식이 아니라 지식에 대한 오만이다."],
  ["The best remedy against this is not knowledge, but knowing something really well.", "이에 대한 가장 좋은 처방은 지식이 아니라, 무언가를 정말로 잘 아는 것이다."],
], "R-18 sentence boundary");
// R-12
sentences("pr038", "46ca6589bd", [
  ["It is people who turn a city from a collection of streets and buildings into a community.", "도시를 거리와 건물의 집합에서 공동체로 바꾸는 것은 바로 사람들이다."],
  ["No matter how well a city is designed, it will not ultimately come to life unless it inspires the love and loyalty of the people who live and work in it.",
    "도시가 아무리 잘 설계되어 있어도, 그곳에서 살고 일하는 사람들의 사랑과 애착을 불러일으키지 못하면 결국 생기를 띠지 못할 것이다."],
], "R-12");
// R-13 mistaken / police / advise
sentences("pr039", "23c08e871f", [
  ["The number of hunting accidents has increased sharply this year.", "올해 사냥 사고의 수가 급격히 늘었다."],
  ["The victims were mostly hunters and hikers who were mistaken for game.", "희생자는 대부분 사냥감으로 오인된 사냥꾼과 등산객이었다."],
  ["Questions have arisen from victims and their families about who is responsible for these avoidable accidents.", "피할 수 있었던 이 사고들의 책임이 누구에게 있느냐는 문제가 희생자와 그 가족들로부터 제기되었다."],
  ["They blame the police for not taking proper measures.", "그들은 적절한 조치를 취하지 않았다며 경찰을 비난한다."],
  ["In fact, the police do issue permits to qualified hunters and advise hikers to wear bright, colorful clothing during hunting season.",
    "사실 경찰은 자격을 갖춘 사냥꾼에게 허가증을 발급하고, 등산객에게는 사냥철에 밝고 눈에 띄는 색의 옷을 입으라고 권하고 있다."],
  ["Of course, the police should issue some additional warnings or take other preventive actions.", "물론 경찰도 추가로 경고하거나 다른 예방 조치를 취해야 한다."],
  ["It is the victims themselves, however, who are responsible for guaranteeing their own safety.", "그러나 자신의 안전을 지킬 책임이 있는 것은 희생자 자신이다."],
  ["They should not risk their own lives in deep forests when they are alone in plain clothes.", "그들은 평상복 차림으로 혼자 깊은 숲에 들어가 목숨을 위험에 빠뜨려서는 안 된다."],
], "R-13");
sentences("pr040", "7eca0335f6", [
  ["Our parents cast long shadows over our lives, and we become aware of their existence when we are infants.", "부모는 우리 삶에 긴 그림자를 드리우며, 우리는 갓난아기 때부터 그들의 존재를 알아차린다."],
  ["Parents first teach us essential ways of living by cautioning, “Don’t touch” or “It’s not nice to do that.” We may think that we learn these lessons through independent efforts, but it’s not the way we obtain them at all.",
    "부모는 먼저 “만지지 마라”, “그러면 못써” 하고 주의를 주며 기본적인 생활 방식을 가르친다. 우리는 이런 교훈을 스스로의 노력으로 배운다고 생각할지 모르지만, 결코 그렇게 얻는 것이 아니다."],
  ["It is our parents who have given us our sense of right and wrong, our understanding of love, and our knowledge of who we are.", "옳고 그름에 대한 감각, 사랑에 대한 이해, 우리가 누구인지에 대한 앎을 준 것은 바로 부모이다."],
  ["As we grow up, we see them less and less.", "자라면서 우리는 부모를 점점 덜 보게 된다."],
  ["We leave their homes, and we start new families of our own.", "우리는 부모의 집을 떠나 우리만의 새 가정을 꾸린다."],
  ["So sometimes we think that we can walk in the sun, free of the shadows.", "그래서 때로 우리는 그림자에서 벗어나 햇빛 속을 걸을 수 있다고 생각한다."],
  ["But still the shadows have not gone.", "그러나 그림자는 여전히 사라지지 않았다."],
  ["We carry their being with us all our lives in the sounds of our voices, the look and feel of our skin, and the warmth of our hands and our hearts.",
    "우리는 목소리, 피부의 모습과 감촉, 손과 마음의 따뜻함 속에 평생 그들의 존재를 지니고 다닌다."],
  ["It is only when they are gone and we never see them that we find that they and we are indivisible.", "그들이 세상을 떠나 다시는 볼 수 없게 되어서야 우리는 그들과 우리가 떼려야 뗄 수 없는 사이임을 깨닫는다."],
  ["In fact, we have not been able to separate ourselves from them our whole lives long.", "사실 우리는 평생 그들에게서 우리 자신을 떼어 놓을 수 없었다."],
  ["The shadows are still there, but they have never really blocked the light at all.", "그림자는 여전히 그곳에 있지만, 사실 한 번도 빛을 가린 적은 없었다."],
]);
// R-15
en("pr041", 2, "As youth, we need", "As young people, we need");
en("pr041", 3, "a personality that help us to fit in.", "a personality that helps us to fit in.");
ko("pr041", 5, "우리가 그 과정에서 상당히 많은 실수를 범하지 않고 배우기를 거의 기대할 수 없다.", "그 과정에서 꽤 많은 실수를 하지 않고 배우기를 기대하기는 어렵다.");
sentences("pr042", "12fc1c4e16", [
  ["Each of us has probably wanted to live another life, even if only for a brief time.", "우리는 저마다 잠시만이라도 다른 삶을 살아 보고 싶어 한 적이 있을 것이다."],
  ["It is not a matter of being dissatisfied with our own lives, but it is more a curiosity about the road not traveled.", "그것은 자기 삶에 불만이 있어서라기보다 가 보지 않은 길에 대한 호기심 때문이다."],
  ["Of course, one way of satisfying this curiosity is through travel.", "물론 이 호기심을 채우는 한 가지 방법은 여행이다."],
  ["Just as we may dream of being an actor on a stage, travel allows us to experience a different world.", "무대 위의 배우가 되기를 꿈꾸듯이, 여행은 우리가 다른 세상을 경험하게 해 준다."],
  ["Whether we dream of sitting in a cafe in Paris or on the back of an elephant in Southeast Asia, travel gives us the chance to do things we have only imagined.",
    "파리의 카페에 앉아 있기를 꿈꾸든 동남아시아에서 코끼리 등에 타기를 꿈꾸든, 여행은 상상만 해 온 일을 해 볼 기회를 준다."],
]);
ko("pr043", 1, "그림을 원상으로 복귀시키는 사람들은 그들의 기술이 고도로 훈련되어 있지만 그 작품을 갖고 어떻게 해야하는 가를 정확하게 알기 위해서는 원래의 화가가 되어야 할 것이다.", "그림 복원 전문가들은 고도로 훈련된 기술을 갖고 있지만, 맡은 작품을 어떻게 다뤄야 할지 정확히 알려면 그 그림을 그린 화가 본인이어야 할 것이다.");
ko("pr043", 3, "어떤 그림을 한 예술가의 원래 의도대로 복귀시키는 것이다.", "그림을 화가의 원래 의도대로 되돌리는 것이다.");
ko("pr043", 6, "시각적으로 긴밀히 결부된 예술 작품으로", "시각적으로 조화로운 예술 작품으로");
ko("pr044", 1, "성인뿐만 아니라 어린이에게도 건강 식품은 중요하다.", "건강한 식단은 어른뿐 아니라 아이들에게도 중요하다.");
ko("pr044", 4, "부모들이 건강 식품을 먹을 때 아이들은 그것이 맛있을 것이라고 생각할 것이다", "부모가 건강한 음식을 먹으면 아이들도 그 음식이 맛있다고 생각할 것이다.");
// R-17, R-15 (a shared line: "do not keep the telephone to yourself")
sentences("pr045", "9aa17ad86f", [
  ["Since so many of our conversations are held on the telephone, telephone calls are situations worthy of special consideration.", "우리 대화의 상당수가 전화로 이루어지므로, 전화 통화는 특별히 신경 쓸 만한 상황이다."],
  ["Good manners on the telephone, of course, are the same as good manners elsewhere.", "물론 전화 예절도 다른 곳에서의 예절과 같다."],
  ["What is more important is thoughtfulness for others.", "더 중요한 것은 다른 사람에 대한 배려이다."],
  ["But thoughtfulness for others in the use of the telephone is based on one important point.", "그러나 전화를 쓸 때 다른 사람을 배려하는 것은 한 가지 중요한 점에 바탕을 둔다."],
  ["Do not keep the telephone to yourself.", "전화를 혼자 독차지하지 마라."],
  ["Remember that it is shared by several people who have an equal right to its use.", "전화는 그것을 쓸 동등한 권리를 가진 여러 사람이 함께 쓴다는 것을 기억하라."],
], "R-17, R-15");
// R-20 doubled Korean
sentences("pr046", "2f47ac6903", [
  ["Touch is the first sense we develop, and we acquire it before birth.", "촉각은 우리가 가장 먼저 발달시키는 감각이며, 태어나기 전에 이미 갖게 된다."],
  ["We could not live without it.", "촉각이 없다면 우리는 살 수 없을 것이다."],
  ["Imagine being unable to sense the danger of hot water or to feel our way down a dark stairway.", "뜨거운 물의 위험을 느끼지 못하거나 어두운 계단을 더듬어 내려가지 못한다고 상상해 보라."],
  ["We tend to think of sight as our most important sense, yet we close our eyes in sleep for a third of each day.", "우리는 시각을 가장 중요한 감각으로 여기는 경향이 있지만, 하루의 3분의 1은 잠을 자느라 눈을 감고 있다."],
  ["Touch never blinks, never turns off its awareness of the world around us.", "촉각은 결코 깜빡이지 않으며, 우리 주변 세계에 대한 감지를 결코 멈추지 않는다."],
], "R-20");
ko("pr047", 7, "국민들의 많은 마음과 영혼을 잃게 될 것이다.", "국민의 마음과 영혼의 많은 부분을 잃게 될 것이다.");
// R-14 — #7 was a vocabulary note plus the exam's summary sentence
sentences("pr048", "181a918674", [
  ["People are often considered to be rude unintentionally.", "사람들은 종종 본의 아니게 무례하다는 오해를 받는다."],
  ["Absorbed in their own thoughts, people do not see the motions of someone trying to greet them.", "자기 생각에 빠져 있으면 누군가 인사하려는 몸짓을 보지 못한다."],
  ["They may walk right by a friend without noticing him or her.", "친구를 알아보지 못하고 바로 옆을 지나칠 수도 있다."],
  ["Others indeed do not see―they are without their contact lenses or are quite nearsighted.", "정말로 보지 못하는 사람들도 있다. 콘택트렌즈를 끼지 않았거나 근시가 심한 것이다."],
  ["It is important to take into consideration absent-mindedness or poor eyesight before believing that a friend is actually disregarding you.",
    "친구가 정말로 당신을 무시한다고 믿기 전에, 그가 딴생각을 하고 있거나 시력이 나쁜 것은 아닌지 고려하는 것이 중요하다."],
  ["One friendship I know of was tense for months because a woman thought she was being ignored by a friend who simply was not wearing her glasses and couldn’t see beyond her nose.",
    "내가 아는 어떤 우정은 몇 달 동안 서먹했는데, 한 여성이 친구에게 무시당한다고 생각했기 때문이다. 사실 그 친구는 안경을 쓰지 않아 코앞도 보지 못했을 뿐이었다."],
], "R-14");
ko("pr049", 6, "그러나 아무리 자질이 있더라도 집중을 못하면 자신의 자질을 최대한 이용하지 못할 것이다.", "아무리 자격을 갖춘 사람이라도 집중하지 못하면 자신의 자격을 최대한 활용하지 못할 것이다.");
ko("pr049", 7, "그는 결코 자질이 있는 사람이라고 불릴 수 없다.", "그런 사람은 자격을 갖추었다고 하기 어렵다.");
ko("pr050", 1, "언어가 결핍된 사회는 가장 단순한 협업이외의 어떤 일에 종사하는 것이 불가능할 것이다.", "언어가 없는 사회는 가장 단순한 협동 작업 말고는 어떤 일도 할 수 없을 것이다.");
ko("pr050", 2, "개인이나 개인의 집단은 그런 활동을 계획하거나 다른 이에게 그런 활동을 설명하거나 또는 공통의 목표를 향해 협업에 참가자들의 행위를 지도하는 어떤 방법을 가지지 않을 것이다.", "개인이든 집단이든 그런 활동을 계획하거나, 다른 사람에게 설명하거나, 협동 작업 참가자들의 행동을 공동 목표로 이끌 방법이 없을 것이다.");
ko("pr050", 3, "왜냐하면 각 개인은 다른 사람의 도움을 확보하는 방법이 없을 것이기 때문에 상당한 정도까지 자신의 힘과 능력에 의존적일 것이다.", "각 개인은 다른 사람의 도움을 얻을 수단이 없으므로 상당 부분 자신의 힘과 능력에 의지해야 할 것이다.");
// R-18 sentence boundary (Franklin, The Way to Wealth)
sentences("pr051", "0bcb3b606b", [
  ["The way to wealth, if you desire it, is as plain as the way to market.", "부자가 되는 길은, 당신이 원한다면, 시장으로 가는 길만큼이나 분명하다."],
  ["It depends chiefly on two words, diligence and thrift; that is, waste neither time nor money, but make the best use of both.",
    "그것은 주로 두 단어, 곧 근면과 절약에 달려 있다. 즉, 시간도 돈도 낭비하지 말고 둘 다 가장 잘 활용하라는 것이다."],
  ["Without diligence and thrift nothing will happen, and with them everything.", "근면과 절약이 없으면 아무것도 이루어지지 않고, 그것들이 있으면 모든 것이 이루어진다."],
  ["He who gets all he can honestly, and saves all he gets will certainly obtain his goal.", "정직하게 얻을 수 있는 것을 모두 얻고 얻은 것을 모두 모으는 사람은 틀림없이 목표를 이룰 것이다."],
], "R-18");
ko("pr052", 2, "옮은", "옳은");
ko("pr052", 5, "양심을 축적시키는 일은 우리들의 몫이 된다.", "양심을 키우는 일은 우리 몫이다.");
// R-27 (present, not future), R-33 educated guesses
ko("pr053", 1, "우리의 가장 많이 교육받은 사람들의 추측도 종종 비참하게 잘못될 수 있다.", "충분히 알고서 하는 추측조차 종종 크게 빗나간다.");
ko("pr053", 7, "그들은 우리를 무한히 가능한 미래를 하나, 혹은 적어도 몇 개로 좁히게 해주는데 도움을 준다.", "그들은 무한히 많은 가능한 미래를 하나, 또는 적어도 몇 개로 좁히도록 도와준다.");
ko("pr053", 8, "우리는 현재를 살펴보면서 미래를 보지만 그들은 미래의 씨앗들을 본다.", "우리는 현재를 보고 현재만 보지만, 그들은 미래의 씨앗을 본다.");
ko("pr053", 9, "그들은 앞으로의 세상을 돕기 위한 귀중한 정보를 가져오기 위해 비밀스럽게 경계선을 넘어 가는 우리의 정찰대이다.", "그들은 다가올 세상에 도움이 될 귀중한 정보를 가져오려고 몰래 국경을 넘는 우리의 선발 정찰대이다.");
ko("pr054", 4, "고객 마찰을 줄이면서 고객의 수를 증가시킬수 있다.", "고객 이탈을 줄이면서 고객 수를 늘릴 수 있다.");
ko("pr055", 7, "존경을 받고 지지받는다고", "존중받고 지지받는다고");
// R-21 — #5 was the exam's answer choices; Korean realigned; "because it does" was reversed
sentences("pr056", "02fc04bcb8", [
  ["The young should learn that no one can win all the time and that it's possible to enjoy a game even when they don't win.",
    "젊은이들은 누구도 늘 이길 수는 없으며, 이기지 못할 때에도 경기를 즐길 수 있다는 것을 배워야 한다."],
  ["A child who doesn't make the baseball team feels terrible.", "야구팀에 뽑히지 못한 아이는 몹시 속상해한다."],
  [`But parents should not offer a quick prize or say, "It doesn't matter," because it does.`,
    `그러나 부모는 서둘러 상을 주거나 "그건 중요하지 않아"라고 말해서는 안 된다. 실제로는 중요하기 때문이다.`],
  ["The youngster should be allowed to experience disappointment.", "아이가 실망을 경험하도록 해 주어야 한다."],
], "R-21");
ko("pr057", 3, "비상 연락 설명서를", "비상 연락처를");
ko("pr057", 5, "이러한 통지를 하지 않으면", "이 정보가 없으면");
// R-28
sentences("pr058", "dcd7e3efc0", [
  ["In educating students for adult work and adult life, American schools try, above all, to be practical.", "성인으로서 일하고 살아가도록 학생들을 교육하는 데 있어 미국 학교는 무엇보다도 실용적이려고 한다."],
  ["American education has been greatly influenced by the writings of a famous 20th-century philosopher named John Dewey.", "미국 교육은 John Dewey라는 20세기의 유명한 철학자의 저술에 크게 영향을 받아 왔다."],
  ["Dewey believed that the only worthwhile knowledge was knowledge that can be used in real life.", "Dewey는 가치 있는 지식은 실생활에 쓰일 수 있는 지식뿐이라고 믿었다."],
  ["He convinced educators that it was pointless to make students memorize useless facts that they would quickly forget.", "그는 학생들에게 금방 잊어버릴 쓸모없는 사실을 외우게 하는 것은 무의미하다고 교육자들을 설득했다."],
  ["Rather, schools should teach thinking processes and skills that affect how people live and work.", "오히려 학교는 사람들이 살고 일하는 방식에 영향을 주는 사고 과정과 기술을 가르쳐야 한다."],
], "R-28");
// RV-07 dash restored, R-33
sentences("pr059", "2814180096", [
  ["Some people become blind because a part of the eye called the cornea doesn't let in enough light.", "어떤 사람들은 각막이라는 눈의 한 부분이 빛을 충분히 들여보내지 못해 시력을 잃는다."],
  ["The cornea becomes clouded over.", "각막이 뿌옇게 흐려지는 것이다."],
  ["These people can be made to see again, however, if they are able to get clear corneas to let in the light.", "그러나 빛을 들여보낼 맑은 각막을 얻을 수 있다면 이 사람들은 다시 볼 수 있다."],
  ["The blind must get the corneas from people with healthy eyes—people who agree to let blind people use their eyes after they die.",
    "시각장애인은 건강한 눈을 가진 사람들, 즉 자신이 죽은 뒤 시각장애인이 자기 눈을 쓰도록 허락한 사람들에게서 각막을 받아야 한다."],
], "RV-07, R-33");
// R-28
en("pr061", 8, "you want to one.", "you want one.");
ko("pr061", 8, "비서에게 한 권 사기를 원한다는 것을 말씀하셔야 합니다.", "비서에게 한 권을 원한다고 말씀하셔야 합니다.");
sentences("pr062", "d0a9c99997", [
  ["No one has to let errors of the past destroy his present or cloud his future.", "누구도 과거의 잘못이 자신의 현재를 망치거나 미래를 흐리게 내버려 둘 필요는 없다."],
  ["The glorious fact is that we can always have a new beginning.", "멋진 사실은 우리가 언제든 새로 시작할 수 있다는 것이다."],
  ["Naturally, a wise person will try to avoid feelings of guilt by avoiding the acts that cause them.", "당연히 현명한 사람은 죄책감을 일으키는 행동을 피함으로써 죄책감을 피하려 할 것이다."],
  ["He will look and exercise his moral judgment before he leaps.", "그는 뛰어들기 전에 잘 살펴보고 도덕적 판단력을 발휘할 것이다."],
  ["But if he does something wrong, he must accept his errors frankly, make an effort to obtain forgiveness, and make compensation if that is possible.",
    "그러나 잘못을 저질렀다면 자기 잘못을 솔직히 인정하고, 용서를 구하려고 애쓰며, 가능하다면 보상해야 한다."],
  ["Then he can go his way with an untroubled mind.", "그러면 그는 거리낌 없는 마음으로 제 갈 길을 갈 수 있다."],
]);
// R-28 the war → the way
sentences("pr064", "585919b78c", [
  ["If you want to keep your job, remember these things.", "직장을 계속 다니고 싶다면 다음을 기억하라."],
  ["You should not stop every hour for coffee.", "커피를 마시려고 매시간 일을 멈춰서는 안 된다."],
  ["And you should not leave early too often.", "그리고 너무 자주 일찍 퇴근해서도 안 된다."],
  ["An important part of your job may be the way you work with other people.", "일에서 중요한 부분은 다른 사람들과 함께 일하는 방식일 수 있다."],
  ["If you are difficult to work with, you may have trouble.", "함께 일하기 어려운 사람이라면 곤란을 겪을 수 있다."],
  ["Or you may have trouble if you do not make friends with the other people at your job.", "또는 직장에서 다른 사람들과 친해지지 않으면 곤란을 겪을 수 있다."],
], "R-28");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
