#!/usr/bin/env node
/**
 * READING passages pr161–pr192 — every audit finding in this range (R-47, R-50, R-52, R-54,
 * R-55, R-62, R-68, R-70, R-72, R-73, R-74, R-76, R-77 parts) plus the same kinds of error
 * found while reading each passage in full.
 *
 *  - pr164 #2 carried the exam question "Who take the strictest stand…?" (R-47): removed.
 *  - pr183 (R-50): "many runners also ran at least four minutes a day" is meaningless; the
 *    passage is about Roger Bannister's sub-four-minute mile (6 May 1954).
 *  - pr167 #5 was the exam's summary choice (R-70/R-72): removed, Korean realigned.
 *  - pr184 (R-55): "Koreans tend to have one job for their whole life" is no longer true;
 *    told in the past. pr192: "they even sound better than violins made today" is disputed
 *    (blind tests), so it is told as what many musicians believe.
 *  - pr161 (Fulghum), pr163 (Adler), pr169 (Diamond) keep their text for the lawyer (R-75);
 *    only typos and translation are fixed.
 *
 *   node apply-reading-passages-161.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const { sentences, en, ko } = ed;

// R-76
en("pr161", 1, "we learned in kindergarten including", "we learned in kindergarten, including");
en("pr161", 1, "Sadly, however, We don't apply", "Sadly, however, we don't apply");
// R-54
sentences("pr162", "1fdff58b2e", [
  ["Professional athletes do not agree on what their roles should be.", "프로 선수들은 자신의 역할이 무엇이어야 하는지에 대해 의견이 갈린다."],
  ["Some star players believe that their role is to be a great player, not a role model for young people.", "일부 스타 선수들은 자신의 역할이 젊은이들의 본보기가 되는 것이 아니라 훌륭한 선수가 되는 것이라고 믿는다."],
  ["They insist, “We’re not paid to be role models.” They strongly believe that what they do in their private lives is their own business.",
    "그들은 “우리는 본보기가 되라고 돈을 받는 게 아니다.”라고 주장한다. 그들은 사생활에서 무엇을 하든 자기 일이라고 굳게 믿는다."],
  ["On the other hand, other star players disagree.", "반면 다른 스타 선수들은 이에 동의하지 않는다."],
  ["They maintain that sports stars are role models for people even though they may not want to be.", "그들은 스포츠 스타는 원하지 않더라도 사람들의 본보기라고 주장한다."],
  ["They say, “We do not choose to be role models. We are chosen. Our choice is whether to be good role models or bad ones.”",
    "그들은 말한다. “우리가 본보기가 되기로 선택하는 것이 아니라, 본보기로 선택되는 것이다. 우리가 고를 수 있는 것은 좋은 본보기가 될지 나쁜 본보기가 될지뿐이다.”"],
], "R-54");
ko("pr163", 1, "당신이 즐거움을 위해 익는 책은 편안한 상태에서 읽어도 잃는 것도 아무것도 없다.", "즐거움을 위해 읽는 책은 편안한 상태에서 읽어도 잃는 것이 없다.");
ko("pr163", 2, "진지하고 근본적인 문제들은 제기하고 해결하려고 하는 책은 당신이 할 수 있는 한의 능동적인 독서를 요구한다.", "중대하고 근본적인 질문을 던지고 그에 답하려는 책은 당신이 할 수 있는 가장 능동적인 독서를 요구한다.");
ko("pr163", 3, "당신은 대중가요를 콧노래 부르듯이 책을 읽는 방식으로는 위대한 사상가의 생각을 흡수할 수 없다.", "대중 가수의 감미로운 노래를 받아들이듯 위대한 사상가의 생각을 받아들일 수는 없다.");
ko("pr163", 4, "그 책을 이해하려고 노력해야만 한다.", "그 생각에 닿으려고 손을 뻗어야 한다.");
ko("pr163", 5, "또 당신이 잠자고 있는 동안에도 그 것을 할 수 없다(항상 정신을 집중해서 읽어야 한다)", "잠든 채로는 그렇게 할 수 없다.");
// R-47
en("pr164", 2, " Who take the strictest stand to the genetically engineered products in the passage?", "");
ko("pr166", 4, "그림을 다시 만들었다.", "회화를 개혁했다.");
// R-70, R-72
sentences("pr167", "7a0eefc2f3", [
  ["Language is so much a part of our daily activities that some of us may come to look upon it as a more or less automatic and natural act like breathing or winking.",
    "언어는 일상 활동의 너무나 큰 부분이어서, 우리 중에는 언어를 숨쉬기나 눈 깜빡이기처럼 거의 자동적이고 자연스러운 행위로 여기게 되는 사람도 있을 것이다."],
  ["Of course, if we give the matter any thought at all, we must realize that there is nothing automatic about language.", "물론 이 문제를 조금이라도 생각해 보면 언어에는 자동적인 것이 전혀 없다는 것을 깨닫게 된다."],
  ["Children must be taught their native tongue and the necessary training takes a long time.", "아이들은 모국어를 배워야 하고, 그에 필요한 훈련에는 오랜 시간이 걸린다."],
  ["Language is not something that is inherited; it is an art that can be passed on from one generation to the next only by intensive education.",
    "언어는 물려받는 것이 아니다. 오직 집중적인 교육으로만 한 세대에서 다음 세대로 전해질 수 있는 기술이다."],
], "R-70, R-72");
en("pr168", 5, "Design, On the other hand,", "Design, on the other hand,");
sentences("pr169", "971b8a2b6a", [
  ["The old Sumerian cuneiform could not be used to write normal prose but was a mere telegraphic shorthand, whose vocabulary was restricted to names, numerals and units of measure.",
    "옛 수메르 쐐기 문자로는 보통의 산문을 쓸 수 없었다. 그것은 이름과 숫자와 측정 단위만 담을 수 있는, 전보문 같은 속기에 불과했다."],
  ["A related limitation was that few people ever learned to write this early script.", "이와 관련된 또 하나의 한계는 이 초기 문자를 쓸 줄 알게 된 사람이 거의 없었다는 것이다."],
  ["Knowledge of writing was confined to professionals who worked for the king or temple.", "문자에 관한 지식은 왕이나 신전을 위해 일하는 전문가들에게만 한정되었다."],
  ["In contrast, Greek alphabetic writing was a vehicle of poetry and humor, to be read in private homes.", "이와 달리 그리스 알파벳 문자는 개인 가정에서 읽히는 시와 유머의 수단이었다."],
  ["The first preserved example of Greek alphabetic writing, scratched onto an Athenian wine jar of about 740 B.C., is a line of poetry announcing a dancing contest: “Whoever of all dancers performs most gracefully will win this vase as a prize.”",
    "그리스 알파벳 문자의 가장 오래 보존된 예는 기원전 740년경 아테네의 포도주 항아리에 새겨진 것으로, 춤 경연을 알리는 시 한 줄이다. “모든 무용수 가운데 가장 우아하게 춤추는 사람이 이 항아리를 상으로 받으리라.”"],
]);
// R-62
sentences("pr171", "d62e9c5e23", [
  ["Like many other reformers, Alice Paul, author of the Equal Rights Amendment introduced in Congress in 1923, received little honor in her lifetime but has gained considerable fame posthumously.",
    "1923년 의회에 제출된 남녀평등 헌법 수정안(Equal Rights Amendment)을 작성한 앨리스 폴은, 다른 많은 개혁가처럼 생전에는 영예를 거의 얻지 못했지만 사후에 상당한 명성을 얻었다."],
], "R-62");
// R-70, R-76, R-77
sentences("pr172", "73bf65d24a", [
  ["It is common knowledge that ability to do a particular job and performance on the job do not always go hand in hand.", "어떤 일을 할 능력과 실제 업무 성과가 늘 함께 가는 것은 아니라는 것은 상식이다."],
  ["Persons with great potential abilities sometimes fall down on the job because of laziness or lack of interest in the job, while persons with mediocre talents have often achieved excellent results through their industry and their loyalty to the interests of their employers.",
    "잠재력이 뛰어난 사람도 게으르거나 일에 흥미가 없어 일을 제대로 해내지 못할 때가 있는 반면, 재능이 평범한 사람이 근면함과 고용주의 이익에 대한 충성심으로 뛰어난 성과를 낸 경우도 많다."],
  ["Therefore, the final test of any employee is his performance on the job.", "그러므로 직원에 대한 최종 평가 기준은 실제 업무 성과이다."],
], "R-70, R-76, R-77");
sentences("pr173", "76296e73c9", [
  ["Different groups develop ideas in different ways.", "그룹마다 아이디어를 발전시키는 방식이 다르다."],
  ["In successful groups, individuals are encouraged to produce imaginative and original ideas and share them with others.", "성공적인 그룹에서는 구성원들이 상상력 있고 독창적인 아이디어를 내어 다른 사람들과 나누도록 격려받는다."],
  ["In unsuccessful groups, individual members are not encouraged to do so. Instead, they are always expected to think as the group thinks.", "성공하지 못한 그룹에서는 구성원들이 그렇게 하도록 격려받지 못한다. 대신 늘 집단이 생각하는 대로 생각하기를 요구받는다."],
  ["In the beginning, there are no differences in the abilities and qualities among the members of these two kinds of groups.", "처음에는 이 두 종류의 그룹 구성원들 사이에 능력이나 자질의 차이가 없다."],
  ["However, in the end, the groups which encourage individual members to think creatively will prosper, whereas those which do not will fail.", "그러나 결국 구성원들이 창의적으로 생각하도록 격려하는 그룹은 번성하고, 그렇지 않은 그룹은 실패할 것이다."],
  ["Therefore, group leaders must learn this lesson and put it into practice in order to achieve productive and positive results.", "그러므로 그룹의 리더들은 이 교훈을 배우고, 생산적이고 긍정적인 결과를 얻기 위해 실천에 옮겨야 한다."],
]);
// R-74, R-77
ko("pr174", 4, "중고차를", "두 번째 차를");
ko("pr174", 5, "다른 유형의 소비자 행위, 즉 돈을 쓰는 다른 방식은 우리가 놀랄 일이 아니다.", "서로 다른 소비 행태, 즉 돈을 쓰는 다른 방식은 우리를 놀라게 하지 않는다.");
ko("pr174", 6, "우리는 성장하며 믿게 됬다.", "우리는 자라면서 믿게 되었다.");
ko("pr175", 3, "육체적 활동을 위한 근력을 얻기 위해", "신체 활동에 필요한 힘을 얻으려고");
// R-73
en("pr176", 3, "to lean new things.", "to learn new things.");
ko("pr176", 5, "나는 지침서 읽고서 컴퓨터 사용법을 배울 수 없다.", "나는 사용 설명서만 읽고서는 컴퓨터 사용법을 배울 수 없다.");
ko("pr176", 7, "사람들은 다양한 방식으로 일을 배운다.", "사람들은 저마다 다른 방식으로 배운다.");
ko("pr177", 2, "그들은 종종 아이들에게 벌을 준다.", "부모들은 때때로 아이들에게 벌을 준다.");
ko("pr177", 4, "아이들을 체벌하는 것이", "아이의 엉덩이를 때리는 것이");
// R-72, R-74, R-77
sentences("pr178", "fc6d742a57", [
  ["Recently, I was in a restaurant when a woman and a young boy sat down at the neighboring table.", "최근 내가 식당에 있을 때 한 여성과 어린 소년이 옆 테이블에 앉았다."],
  [`I happened to hear their conversation. The woman asked, "So, how have you been?"`, `우연히 그들의 대화를 듣게 되었는데, 여성이 물었다. "그래, 그동안 어떻게 지냈니?"`],
  [`And the boy, no more than seven or eight years old, replied, "Frankly, I've been a little depressed lately."`, `그러자 기껏해야 7~8세쯤 된 소년이 대답했다. "솔직히 요즘 좀 우울했어요."`],
  ["This remained in my mind because it strengthened my belief that children were changing.", "그 말이 기억에 남은 것은 아이들이 변하고 있다는 내 믿음을 굳혀 주었기 때문이다."],
  [`As I remember, my friends and I didn't realize we were "depressed" until high school.`, `내 기억으로는 친구들과 나는 고등학생이 되어서야 우리가 "우울하다"는 것을 알았다.`],
  ["The proof of a change in children has been increasing steadily.", "아이들이 변하고 있다는 증거는 꾸준히 늘고 있다."],
  ["Children don't seem childlike anymore.", "아이들은 더 이상 아이답지 않다."],
  ["Children speak, dress, and behave more like adults than in the past.", "아이들은 예전보다 더 어른처럼 말하고, 입고, 행동한다."],
  ["Little girls wearing earrings and designer dresses are not uncommon.", "귀걸이를 하고 디자이너 옷을 입은 어린 소녀도 드물지 않다."],
  ["Boys wearing hairstyles like movie stars aren't rare anymore.", "영화배우 같은 머리 모양을 한 소년들도 더 이상 드물지 않다."],
  ["These changes are not without reason.", "이런 변화에는 이유가 있다."],
  ["In the past, children learned the secrets of adulthood very slowly.", "예전에는 아이들이 어른 세계의 비밀을 아주 천천히 알게 되었다."],
  ["Today, however, TV, computers, and the media are pushing children into adult roles.", "그러나 오늘날에는 TV와 컴퓨터와 대중 매체가 아이들을 어른의 역할로 밀어 넣고 있다."],
  ["Indeed, the amount of information available to children is quickening the beginning of adulthood.", "실제로 아이들이 접할 수 있는 정보의 양이 어른이 되는 시기를 앞당기고 있다."],
], "R-72, R-74, R-77");
// R-76
en("pr179", 10, "from volunteer work The result", "from volunteer work. The result");
ko("pr179", 9, "훈련경험을 갖은", "훈련 경험을 가진");
// R-73
en("pr180", 4, "when I we growing up,", "when I was growing up,");
ko("pr180", 1, "나이든 사람들은 어쩔 수 없이 한가하게 고정 수입으로 살며, 계속되는 많은 질병에 영향을 받으며 산다.", "노인들은 어쩔 수 없는 여가 속에서 고정된 수입으로 살며, 끊이지 않는 여러 질병에 시달린다.");
ko("pr180", 3, "폐물처럼", "버림받은 사람처럼");
ko("pr180", 6, "나는 이따금 나의 세대가 나이를 먹는다는 것이 무엇인지를 아는 마지막 세대가 될까 두려워한다.", "나는 가끔 우리 세대가 나이 든다는 것이 무엇을 뜻하는지 아는 마지막 세대가 될까 봐 두렵다.");
en("pr181", 5, "photographs are sometimes false", "photographs are sometimes false.");
// R-73
en("pr182", 1, "during only a few month.", "during only a few months.");
// R-50
sentences("pr183", "7129cc9876", [
  ["Today, people run much faster than they did in the past.", "오늘날 사람들은 예전보다 훨씬 빨리 달린다."],
  ["Before 1954, no one had ever run a mile in under four minutes.", "1954년 이전에는 1마일을 4분 안에 달린 사람이 아무도 없었다."],
  ["In 1954, Roger Bannister ran a mile in under four minutes.", "1954년에 로저 배니스터가 1마일을 4분 안에 달렸다."],
  ["After that, many other runners also ran a mile in under four minutes.", "그 뒤로 다른 많은 선수들도 1마일을 4분 안에 달렸다."],
], "R-50");
// R-55
sentences("pr184", "8dcc8b6191", [
  ["A professor of business studied employment patterns in Korea and the United States.", "한 경영학 교수가 한국과 미국의 고용 형태를 연구했다."],
  ["She described in her book some important differences.", "그녀는 책에서 몇 가지 중요한 차이점을 설명했다."],
  ["Among them, she paid particular attention to the number of years a person stays with a job.", "그중에서도 그녀는 한 사람이 한 직장에 머무는 햇수에 특히 주목했다."],
  ["In the past, Koreans tended to have one job for their whole life.", "예전에 한국인들은 평생 한 직장에 다니는 경향이 있었다."],
  ["When they were young, they went to work for a company, and they stayed with that company.", "젊을 때 한 회사에 들어가면 그 회사에 계속 머물렀다."],
  ["In the United States, people move from one company to another.", "미국에서는 사람들이 이 회사에서 저 회사로 옮겨 다닌다."],
  ["They change jobs very frequently.", "그들은 직장을 매우 자주 바꾼다."],
], "R-55");
// R-72
sentences("pr185", "4489d4849f", [
  ["Upon entering a record store, one encounters a wide variety of genres from easy listening to jazz and classical music.", "음반 가게에 들어서면 이지 리스닝부터 재즈와 클래식 음악까지 다양한 장르를 만나게 된다."],
  ["Jazz and classical music have a number of things in common.", "재즈와 클래식 음악에는 공통점이 여럿 있다."],
  ["However, they also have a number of differences.", "그러나 차이점도 여럿 있다."],
  ["Before sound recording, classical music was passed down through written scores, whereas early jazz mainly relied on live performance.", "녹음이 생기기 전에 클래식 음악은 악보를 통해 전해진 반면, 초기 재즈는 주로 실제 연주에 의존했다."],
  ["The composers are in control in classical music; they write the musical notes along with detailed instructions.", "클래식 음악에서는 작곡가가 주도권을 쥔다. 작곡가는 자세한 지시와 함께 음표를 적는다."],
  ["In jazz, on the contrary, the performers often improvise their own melodies.", "반대로 재즈에서는 연주자가 흔히 자기 멜로디를 즉흥으로 만든다."],
  ["In sum, classical music and jazz both aim to provide a depth of expression and detail, but they achieve their goal through different approaches.", "요컨대 클래식 음악과 재즈는 모두 깊이 있는 표현과 섬세함을 추구하지만, 서로 다른 방식으로 그 목표를 이룬다."],
], "R-72");
// R-76, R-77
sentences("pr186", "0179b6a35b", [
  ["There is a difference between being an onlooker and being a true observer of art.", "그냥 구경하는 사람과 진정으로 예술을 감상하는 사람 사이에는 차이가 있다."],
  ["Onlookers just walk by a work of art, letting their eyes record it while their minds are elsewhere.", "구경꾼은 마음은 딴 데 둔 채 눈으로만 작품을 훑으며 그 옆을 지나간다."],
  ["They have no true appreciation of art.", "그들은 예술을 진정으로 감상하지 않는다."],
  ["Observers, on the other hand, are informed and appreciative. They have spent the time and energy to make art meaningful to themselves.", "반면 감상자는 아는 것이 많고 감상할 줄 안다. 그들은 예술이 자신에게 의미 있게 되도록 시간과 힘을 들였다."],
  ["They don't simply exist side by side with art. They are aware of its existence in even the smallest part of their daily life.", "그들은 그저 예술 곁에 있는 것이 아니다. 일상의 아주 작은 부분에서도 예술이 있다는 것을 알아차린다."],
], "R-76, R-77");
// R-68, R-70, R-72
sentences("pr188", "95973019a5", [
  ["The adult forgets the troubles of his youth.", "어른은 어린 시절의 고민을 잊는다."],
  ["Comparing the remembered carefree past with his immediate problems, the mature man thinks that troubles belong only to the present.", "걱정 없던 것으로 기억되는 과거와 눈앞의 문제를 비교하며, 어른은 고민이란 현재에만 있는 것이라고 생각한다."],
  ["The twelve-year-old, the adult thinks, does not worry about salary or professional advancement.", "어른은 열두 살짜리는 월급이나 승진을 걱정하지 않는다고 생각한다."],
  ["When the roof leaks, only the parent worries about what contractor to employ or about how he will repair it himself.", "지붕에 물이 새면 어느 업자를 부를지, 혹은 직접 어떻게 고칠지 걱정하는 것은 부모뿐이다."],
  ["To the adult, then, childhood is a time of freedom.", "그러니 어른에게 어린 시절은 자유의 시기다."],
  ["The child, however, wishes always to be a man.", "그러나 아이는 늘 어른이 되기를 바란다."],
  ["He finds freedom in the future.", "아이는 미래에서 자유를 찾는다."],
  ["To him, adulthood is a time of wealth, and his father or mother never needs to worry about saving to buy a bicycle.", "아이에게 어른 시절은 풍족한 시기이고, 아빠나 엄마는 자전거를 사려고 돈을 모을 걱정을 할 필요가 없다."],
  ["Happiness is too seldom found in the present; it is remembered as a thing of the past or looked forward to as a part of the future.", "행복은 현재에서 발견되는 일이 너무 드물다. 행복은 지나간 일로 기억되거나 앞으로 올 일로 기대될 뿐이다."],
], "R-68, R-70, R-72");
// R-73, R-01 (pr244 is the same passage — fixed in apply-reading-passages-225.cjs)
sentences("pr190", "05c8ffbd63", [
  ["How often are we introduced to someone only to forget his or her name moments later?", "누군가를 소개받고 불과 몇 순간 뒤에 그 사람의 이름을 잊어버리는 일이 얼마나 잦은가?"],
  ["In fact, many times we never knew the name.", "사실 우리는 애초에 이름을 제대로 알지도 못한 경우가 많다."],
  ["Today introductions are made in an unclear manner so that it is very hard to remember other people's names.", "오늘날에는 소개가 분명하지 않게 이루어져 다른 사람의 이름을 기억하기가 매우 어렵다."],
  ["Forgetting people's names often means we do not really care about them.", "사람의 이름을 잊는 것은 흔히 우리가 그 사람에게 진심으로 관심이 없다는 뜻이다."],
  [`When we know their names, we are saying, "You are important. I remember you."`, `이름을 알고 있다는 것은 "당신은 중요한 사람입니다. 나는 당신을 기억합니다."라고 말하는 것이다.`],
  ["A clear introduction should be made, therefore, if you want to build good social relationships with others.", "그러므로 다른 사람들과 좋은 관계를 맺고 싶다면 분명하게 소개해야 한다."],
], "R-73");
sentences("pr191", "66d32b498d", [
  [`How many times have you heard it said, "Just believe you can do it and you can!" It's the act of believing that is the starting force or generating action that leads great men and women to accomplishment.`,
    `"할 수 있다고 믿기만 하면 할 수 있어!"라는 말을 얼마나 많이 들어 보았는가? 위대한 사람들을 성취로 이끄는 출발의 힘, 행동을 낳는 힘은 바로 믿는 행위다.`],
  [`"Come on, men, we can beat them," shouts someone in command.`, `"힘내라, 제군들, 우리는 이길 수 있다!" 지휘하는 사람이 외친다.`],
  ["Whether in a game, or on a battlefield, that sudden voicing of belief reverses the tide.", "경기에서든 전쟁터에서든, 갑자기 소리 내어 외친 그 믿음이 흐름을 뒤집는다."],
  [`"I can do it... I can do it... I can do it!"`, `"나는 할 수 있다... 나는 할 수 있다... 나는 할 수 있다!"`],
]);
// R-52 realigned; the claim about old violins is disputed (blind tests), so it is told as belief
sentences("pr192", "496d75f2b4", [
  ["Many musicians believe that the world's best violins were made in Cremona, Italy, about 300 years ago.", "많은 음악가들은 세계 최고의 바이올린이 약 300년 전 이탈리아 크레모나에서 만들어졌다고 믿는다."],
  ["These violins are said to sound better than any others.", "이 바이올린들은 다른 어떤 바이올린보다 소리가 좋다고들 한다."],
  ["Many musicians say they sound better even than violins made today.", "많은 음악가들은 오늘날 만든 바이올린보다도 소리가 좋다고 말한다."],
  ["Violin makers and scientists now try to make instruments like the Italian violins, but they are not the same.", "지금 바이올린 제작자와 과학자들이 이탈리아 바이올린 같은 악기를 만들려고 애쓰지만 똑같지는 않다."],
  ["Many musicians still prefer the old ones.", "많은 음악가들은 여전히 옛 바이올린을 더 좋아한다."],
  ["Why are these old Italian violins so special?", "이 옛 이탈리아 바이올린은 왜 그렇게 특별할까?"],
  ["No one really knows, but many people think they have an answer.", "정말로 아는 사람은 없지만, 많은 사람이 답을 안다고 생각한다."],
  ["Some people think it is the age of the violins.", "어떤 사람들은 바이올린의 나이 때문이라고 생각한다."],
  ["Other people say that the kind of wood is not so important and that it is more important to cut the wood in a special way.", "또 어떤 사람들은 나무의 종류는 그리 중요하지 않고, 나무를 특별한 방식으로 자르는 것이 더 중요하다고 말한다."],
], "R-52");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const line of r.log) console.log(line);
console.log(`${r.lessons} lessons ${DRY ? "checked (--dry-run, nothing written)" : "written"}`);
