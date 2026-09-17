#!/usr/bin/env node
/**
 * READING vocabulary cards pr177–pr192 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong parts of speech fixed
 * (agree/punish/worry n. → v., family adv. → n.), wrong senses fixed (fixed 고치다 → 고정된, enforced
 * 집행하다 → 강요된, subject 주제 → ~을 겪기 쉬운, reproducing 재현하다 → 번식하다, shopping 가게,
 * minding 마음), the "quickening" placeholder written, the lemma "quickene" corrected, and
 * "united"/"states" cut from "United States" replaced. Cards no longer in the text after the
 * passage fixes (friend, month, running, record, least, agree, world) and the proper noun
 * "cremona" replaced.
 *   node apply-reading-cards-177.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr177", "d266c27077", [
  "agree|agree|v.|동의하다", "culture|culture|n.|문화 (from culture to culture 문화마다)", "punish|punish|v.|벌주다, 처벌하다", "spanking|spank|v.|(엉덩이를) 때리다",
  "differ|differ|v.|다르다 (differ from A to A A마다 다르다)", "believe|believe|v.|믿다", "difference|difference|n.|차이 (the difference between A and B)",
  "right|right|n.|옳은 것 (right and wrong 옳고 그름)", "wrong|wrong|n.|그른 것", "disagreement|disagreement|n.|의견 차이", "lesson|lesson|n.|교훈",
  "hit|hit|v.|때리다", "order|order|n.|(in order to) ~하기 위해", "parents|parent|n.|부모",
]);
cards("pr178", "78d29898bc", [
  "neighboring|neighboring|adj.|이웃한, 옆의", "happened|happen|v.|(happen to) 우연히 ~하다", "frankly|frankly|adv.|솔직히", "depressed|depressed|adj.|우울한",
  "remained|remain|v.|남다 (remain in my mind 기억에 남다)", "strengthened|strengthen|v.|강화하다, 굳히다", "belief|belief|n.|믿음, 생각", "proof|proof|n.|증거",
  "steadily|steadily|adv.|꾸준히", "childlike|childlike|adj.|아이다운", "uncommon|uncommon|adj.|드문", "adulthood|adulthood|n.|성인기, 어른이 됨",
  "quickening|quicken|v.|앞당기다, 빠르게 하다", "available|available|adj.|이용할 수 있는",
]);
cards("pr179", "0c421dddca", [
  "volunteers|volunteer|n.|자원봉사자", "devoted|devote|v.|(devote oneself to) ~에 헌신하다", "unpaid|unpaid|adj.|무보수의", "minding|mind|v.|(never minding) 개의치 않다",
  "appreciated|appreciate|v.|(진가를) 알아주다", "seldom|seldom|adv.|좀처럼 ~않다", "funds|fund|n.|자금", "achievements|achievement|n.|업적, 성과",
  "transformation|transformation|n.|변화, 탈바꿈", "involved|involve|v.|(be involved in) ~에 참여하다", "unskilled|unskilled|adj.|기술이 없는, 미숙련의",
  "acquire|acquire|v.|얻다, 쌓다", "considerable|considerable|adj.|상당한", "experience|experience|n.|경험",
]);
cards("pr180", "47836c04a3", [
  "illnesses|illness|n.|질병", "prejudiced|prejudiced|adj.|편견을 가진", "fear|fear|v.|두려워하다, 걱정하다", "outcasts|outcast|n.|버림받은 사람",
  "worships|worship|v.|숭배하다", "experience|experience|n.|경험", "courtesy|courtesy|n.|예의", "wisdom|wisdom|n.|지혜", "deserve|deserve|v.|~을 받을 만하다",
  "enforced|enforced|adj.|강요된 (enforced leisure 어쩔 수 없이 주어진 여가)", "fixed|fixed|adj.|고정된 (fixed income 고정 수입)", "continual|continual|adj.|계속되는",
  "leisure|leisure|n.|여가", "subject|subject|adj.|(subject to) ~을 겪기 쉬운",
]);
cards("pr181", "d2d7d05e00", [
  "believed|believe|v.|믿다", "happened|happen|v.|일어나다", "truth|truth|n.|진실", "photographs|photograph|n.|사진", "words|word|n.|말",
  "picture|picture|n.|사진, 그림", "simple|simple|adj.|단순한", "changed|change|v.|바꾸다 (be changed 조작되다)", "law|law|n.|법 (court of law 법정)",
  "courts|court|n.|법정", "worth|worth|adj.|(be worth) ~의 가치가 있는", "value|value|n.|가치", "false|false|adj.|거짓의, 가짜의", "matters|matter|n.|상황, 사정",
]);
cards("pr182", "8b2498052b", [
  "recently|recently|adv.|최근에 (until recently 최근까지)", "country|country|n.|나라", "season|season|n.|계절, 철", "orange|orange|n.|오렌지", "juice|juice|n.|주스",
  "available|available|adj.|구할 수 있는", "regardless|regardless|adv.|(regardless of) ~과 상관없이", "parts|part|n.|지역, 부분", "months|month|n.|달, 개월",
  "put|put|v.|(put up) (통조림 등으로) 저장하다", "cans|can|n.|통조림 깡통", "until|until|prep.|~까지", "during|during|prep.|~ 동안", "few|few|adj.|(a few) 몇몇의",
]);
cards("pr183", "d88d44b692", [
  "faster|fast|adv.|더 빨리", "minutes|minute|n.|분", "ran|run|v.|달리다", "today|today|adv.|오늘날", "runners|runner|n.|달리는 사람, 주자",
  "past|past|n.|과거 (in the past 과거에)", "mile|mile|n.|마일 (약 1.6km)", "under|under|prep.|~ 미만으로 (under four minutes 4분 안에)", "before|before|prep.|~ 이전에",
  "other|other|adj.|다른", "also|also|adv.|또한", "much|much|adv.|훨씬 (much faster 훨씬 더 빨리)", "many|many|adj.|많은", "ever|ever|adv.|(no one had ever) 지금까지 아무도",
]);
cards("pr184", "897a3c73b3", [
  "described|describe|v.|설명하다, 서술하다", "young|young|adj.|젊은", "studied|study|v.|연구하다", "important|important|adj.|중요한", "change|change|v.|바꾸다",
  "company|company|n.|회사", "professor|professor|n.|교수", "business|business|n.|경영(학) (professor of business 경영학 교수)", "employment|employment|n.|고용, 취업",
  "patterns|pattern|n.|양상, 방식", "frequently|frequently|adv.|자주", "differences|difference|n.|차이", "particular|particular|adj.|특별한 (pay particular attention 특히 주목하다)",
  "tended|tend|v.|(tend to) ~하는 경향이 있다",
]);
cards("pr185", "87d15a7610", [
  "music|music|n.|음악", "provide|provide|v.|제공하다", "achieve|achieve|v.|이루다", "classical|classical|adj.|고전의 (classical music 클래식 음악)",
  "variety|variety|n.|다양함 (a wide variety of 매우 다양한)", "genres|genre|n.|장르", "goal|goal|n.|목표", "control|control|n.|통제 (in control 주도권을 쥔)",
  "scores|score|n.|악보", "relied|rely|v.|(rely on) ~에 의존하다", "performance|performance|n.|연주, 공연", "improvise|improvise|v.|즉흥으로 연주하다",
  "encounters|encounter|v.|마주치다", "approaches|approach|n.|방식, 접근법",
]);
cards("pr186", "071167360f", [
  "art|art|n.|예술", "exist|exist|v.|존재하다", "side|side|n.|(side by side) 나란히", "spent|spend|v.|(시간을) 들이다", "onlooker|onlooker|n.|구경꾼",
  "observer|observer|n.|관찰자", "appreciation|appreciation|n.|감상, 진가를 알아봄", "appreciative|appreciative|adj.|감상할 줄 아는", "informed|informed|adj.|잘 아는, 식견 있는",
  "meaningful|meaningful|adj.|의미 있는", "aware|aware|adj.|(be aware of) ~을 알고 있는", "existence|existence|n.|존재", "elsewhere|elsewhere|adv.|다른 곳에",
  "difference|difference|n.|차이",
]);
cards("pr187", "52fba61bf0", [
  "reproducing|reproduce|v.|번식하다", "complex|complex|adj.|복잡한", "species|species|n.|(생물의) 종", "perform|perform|v.|하다, 수행하다",
  "engages|engage|v.|(engage in) ~을 하다, ~에 참여하다", "participate|participate|v.|(participate in) ~에 참가하다", "involved|involve|v.|(be involved in) ~에 휘말리다",
  "conflicts|conflict|n.|갈등, 충돌", "nervous|nervous|adj.|신경의 (nervous system 신경계)", "determines|determine|v.|결정하다", "complexity|complexity|n.|복잡성",
  "organisms|organism|n.|생물, 유기체", "behavior|behavior|n.|행동", "conduct|conduct|n.|행위, 행동 방식",
]);
cards("pr188", "139c88ab23", [
  "remembered|remember|v.|기억하다 (the remembered past 기억 속의 과거)", "comparing|compare|v.|비교하다", "wishes|wish|v.|바라다", "saving|save|v.|(돈을) 모으다, 저축하다",
  "worry|worry|v.|걱정하다", "happiness|happiness|n.|행복", "belong|belong|v.|(belong to) ~에 속하다", "carefree|carefree|adj.|근심 걱정 없는",
  "mature|mature|adj.|성숙한, 다 자란", "advancement|advancement|n.|승진, 출세", "leaks|leak|v.|(물이) 새다", "contractor|contractor|n.|(공사) 업자",
  "employ|employ|v.|고용하다", "salary|salary|n.|급여",
]);
cards("pr189", "cfa5b6a0c7", [
  "environment|environment|n.|환경", "habits|habit|n.|습관", "increases|increase|v.|높이다, 늘리다", "spend|spend|v.|(돈을) 쓰다", "soil|soil|n.|토양, 흙",
  "shopping|shopping|n.|쇼핑 (shopping habits 쇼핑 습관)", "international|international|adj.|국제적인", "considerable|considerable|adj.|상당한",
  "effects|effect|n.|영향 (have an effect on ~에 영향을 미치다)", "advertising|advertise|v.|광고하다", "packaging|package|v.|포장하다",
  "whether|whether|conj.|~인지 (아닌지)", "quality|quality|n.|질 (quality of life 삶의 질)", "product|product|n.|제품",
]);
cards("pr190", "1f8fb1942c", [
  "care|care|v.|(care about) ~에 관심을 두다", "social|social|adj.|사회적인", "remember|remember|v.|기억하다", "fact|fact|n.|사실 (in fact 사실은)", "hard|hard|adj.|어려운",
  "introduced|introduce|v.|소개하다 (be introduced to ~에게 소개되다)", "important|important|adj.|중요한", "moments|moment|n.|순간 (moments later 잠시 후에)",
  "manner|manner|n.|방식", "forget|forget|v.|잊다", "introduction|introduction|n.|소개", "relationships|relationship|n.|관계", "clear|clear|adj.|분명한",
  "unclear|unclear|adj.|불분명한",
]);
cards("pr191", "6bc15b3b90", [
  "believing|believe|v.|믿다 (the act of believing 믿는 행위)", "leads|lead|v.|이끌다", "generating|generate|v.|일으키다, 만들어 내다", "voicing|voice|n.|(소리 내어) 말함, 외침",
  "starting|start|adj.|시작하게 하는 (starting force 원동력)", "accomplishment|accomplishment|n.|성취", "force|force|n.|힘", "action|action|n.|행동",
  "beat|beat|v.|이기다, 물리치다", "command|command|n.|지휘 (in command 지휘하는)", "whether|whether|conj.|(whether A or B) A이든 B이든", "battlefield|battlefield|n.|전쟁터",
  "reverses|reverse|v.|뒤집다", "tide|tide|n.|흐름, 형세 (reverse the tide 형세를 뒤집다)",
]);
cards("pr192", "0c73552d6f", [
  "sound|sound|v.|(소리가) ~하게 들리다 (sound better 소리가 더 좋다)", "important|important|adj.|중요한", "prefer|prefer|v.|더 좋아하다", "violins|violin|n.|바이올린",
  "musicians|musician|n.|음악가", "special|special|adj.|특별한", "wood|wood|n.|나무, 목재", "ago|ago|adv.|~ 전에", "cut|cut|v.|자르다", "scientists|scientist|n.|과학자",
  "instruments|instrument|n.|악기", "makers|maker|n.|만드는 사람, 제작자", "answer|answer|n.|답", "age|age|n.|나이, 연대",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
