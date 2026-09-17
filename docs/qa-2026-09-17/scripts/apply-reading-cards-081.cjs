#!/usr/bin/env node
/**
 * READING vocabulary cards pr081–pr096 (ISS-10: RV-10, RV-11, RV-12, RV-15; R-00). Read card by
 * card against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed
 * (watching ≠ 시계, shopping ≠ 가게, parties ≠ 파티, rights ≠ 맞아, falling ≠ 가을, content = 함량),
 * placeholders written (saturday, mall, teens, chatting, within, resounding, thoughtful, lovable,
 * adorable), cards left over from corrected text ("charming", "bigger", "points", "caused",
 * "diseases", "actuation") replaced.
 *   node apply-reading-cards-081.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr081", "d5a97c45d3", [
  "solve|solve|v.|해결하다", "friends|friend|n.|친구", "observed|observe|v.|관찰하다", "evaluate|evaluate|v.|평가하다", "fastest|fast|adj.|가장 빠른 (fast의 최상급)",
  "knowledge|knowledge|n.|지식, 앎", "lights|light|n.|신호등 (stop lights)", "based|base|v.|~에 바탕을 두다 (based on ~을 바탕으로)", "feelings|feeling|n.|느낌, 감정",
  "choose|choose|v.|정하다, 선택하다", "observations|observation|n.|관찰", "decisions|decision|n.|결정", "day-to-day|day-to-day|adj.|일상의", "traffic|traffic|n.|교통량",
]);
cards("pr082", "5ecf0eecff", [
  "control|control|n.|통제, 다스림 (have no control over ~을 다스리지 못하다)", "remember|remember|v.|기억하다", "angry|angry|adj.|화난", "going|go|v.|(go through) 겪다",
  "seemed|seem|v.|~인 것 같다", "teenage|teenage|adj.|십대의", "frustrated|frustrated|adj.|좌절한", "exactly|exactly|adv.|정확히", "feelings|feeling|n.|감정",
  "confused|confused|adj.|혼란스러운", "absolutely|absolutely|adv.|(no와 함께) 전혀", "swinging|swing|v.|오락가락하다, 흔들리다", "mad|mad|adj.|화가 난 (get mad 화내다)",
  "extreme|extreme|n.|극단 (from one extreme to another 한 극단에서 다른 극단으로)",
]);
cards("pr083", "84a2a61993", [
  "social|social|adj.|사교적인 (social lives 사교 생활)", "blame|blame|v.|탓하다 (blame A for B)", "student|student|n.|학생", "friends|friend|n.|친구",
  "vegetarian|vegetarian|n.|채식주의자", "romance|romance|n.|연애", "breaking|break|v.|(break up) 관계를 끝내다, 헤어지게 하다", "available|available|adj.|이용할 수 있는",
  "active|active|adj.|활발한", "computers|computer|n.|컴퓨터", "terminals|terminal|n.|단말기", "public|public|adj.|공공의 (public places 공공장소)",
  "detective|detective|n.|탐정", "libraries|library|n.|도서관",
]);
cards("pr084", "e2ab2bc7af", [
  "friend|friend|n.|친구", "influence|influence|v.|영향을 주다", "accept|accept|v.|받아들이다", "neighbor|neighbor|n.|이웃", "changed|change|v.|변하다",
  "impressions|impression|n.|인상 (first impressions 첫인상)", "stick|stick|v.|(stick to) 고수하다, 집착하다", "groundless|groundless|adj.|근거 없는", "interpret|interpret|v.|해석하다",
  "behavior|behavior|n.|행동", "expectation|expectation|n.|예상, 기대", "accurate|accurate|adj.|정확한", "saint|saint|n.|성인, 성자", "evaluation|evaluation|n.|평가",
]);
cards("pr085", "44d48296c3", [
  "dark|dark|adj.|짙은, 어두운 (dark brown 짙은 갈색)", "happiness|happiness|n.|행복", "believed|believe|v.|믿다 (be believed to ~한다고 여겨지다)", "health|health|n.|건강",
  "light|light|adj.|옅은 (light brown 옅은 갈색)", "hand|hand|n.|손", "moles|mole|n.|(피부의) 점", "spots|spot|n.|반점", "forecasts|forecast|v.|예고하다",
  "according|according|adv.|(according to) ~에 따르면", "foretell|foretell|v.|예언하다", "talent|talent|n.|재능", "reveal|reveal|v.|드러내다", "superstitions|superstition|n.|미신",
]);
cards("pr086", "62929abd88", [
  "performance|performance|n.|공연", "experience|experience|n.|경험", "happily|happily|adv.|기꺼이", "ideas|idea|n.|해석, 생각 (the ideas of new singers 새 가수들의 해석)",
  "honest|honest|adj.|충실한 (honest performance 충실한 공연)", "different|different|adj.|다른", "interpretation|interpretation|n.|해석", "devoted|devoted|adj.|열성적인",
  "heartbreaking|heartbreaking|adj.|가슴 아픈", "masterpieces|masterpiece|n.|걸작", "moving|moving|adj.|감동적인", "rehearing|rehearing|n.|다시 듣기",
  "refine|refine|v.|다듬다", "greatest|great|adj.|가장 좋은 (great의 최상급)",
]);
cards("pr087", "e77df00804", [
  "realize|realize|v.|깨닫다", "believing|believe|v.|믿다", "friends|friend|n.|친구", "self-conscious|self-conscious|adj.|남의 시선을 의식하는", "watching|watch|v.|지켜보다",
  "audiences|audience|n.|관객, 청중", "teenagers|teenager|n.|십대", "interested|interested|adj.|관심 있는", "surround|surround|v.|둘러싸다", "imaginary|imaginary|adj.|상상의",
  "unattractive|unattractive|adj.|매력 없는, 못생긴", "teens|teen|n.|십대", "behavior|behavior|n.|행동", "chatting|chat|v.|수다를 떨다",
]);
cards("pr088", "c939a2855a", [
  "increasing|increasing|adj.|커지는, 늘어나는", "spent|spend|v.|(시간을) 쓰다 (time spent shopping 쇼핑에 쓰는 시간)", "changing|change|v.|바꾸다", "shopping|shopping|n.|쇼핑",
  "easier|easy|adj.|더 쉬운 (easy의 비교급)", "aisles|aisle|n.|통로", "minimize|minimize|v.|최소화하다", "emphasis|emphasis|n.|강조", "consumers|consumer|n.|소비자",
  "behavior|behavior|n.|행동", "store|store|n.|매장, 가게", "value|value|n.|가치", "survey|survey|n.|설문 조사", "shoppers|shopper|n.|쇼핑객",
]);
cards("pr089", "877087ab86", [
  "rules|rule|n.|규칙", "set|set|n.|(a set of) 일련의", "opposed|opposed|adj.|맞서는 (opposed parties 맞서는 양측)", "govern|govern|v.|규율하다, 지배하다",
  "limited|limited|adj.|제한된, 정해진", "threats|threat|n.|위협", "scored|score|v.|(골을) 넣다, 득점하다", "goals|goal|n.|골", "competition|competition|n.|경쟁",
  "implies|imply|v.|내포하다, 전제로 하다", "conduct|conduct|n.|행동, 처신", "parties|party|n.|당사자, 편", "prohibited|prohibit|v.|금지하다", "tricks|trick|n.|속임수",
]);
cards("pr090", "4dbde6265b", [
  "influenced|influence|v.|영향을 주다 (be influenced by ~의 영향을 받다)", "consider|consider|v.|생각해 보다", "family|family|n.|가족", "society|society|n.|사회",
  "friends|friend|n.|친구", "grandparent|grandparent|n.|조부모", "cousin|cousin|n.|사촌", "relationships|relationship|n.|관계", "husband|husband|n.|남편", "wife|wife|n.|아내",
  "network|network|n.|그물망, 관계망", "within|within|prep.|~ 안의", "add|add|v.|더하다", "unit|unit|n.|단위 (family unit 가족 단위)",
]);
cards("pr091", "ef3ead1687", [
  "purpose|purpose|n.|목적", "protect|protect|v.|보호하다", "considered|consider|v.|~로 여기다 (be considered innocent 무죄로 여겨지다)", "crime|crime|n.|범죄",
  "court|court|n.|법원, 법정", "law|law|n.|법", "guilty|guilty|adj.|유죄인", "system|system|n.|제도 (court system 사법 제도)", "rights|right|n.|권리",
  "responsibility|responsibility|n.|책임", "according|according|adv.|(according to) ~에 따르면", "accused|accuse|v.|고발하다, 기소하다 (be accused of ~으로 기소되다)",
  "prove|prove|v.|증명하다", "innocent|innocent|adj.|무죄인",
]);
cards("pr092", "af72edd53d", [
  "worse|worse|adj.|더 나쁜 (make ~ worse 악화시키다)", "fear|fear|n.|두려움", "anxiety|anxiety|n.|불안", "mind|mind|n.|마음", "hypnosis|hypnosis|n.|최면",
  "students|student|n.|학생", "pimples|pimple|n.|여드름", "warts|wart|n.|사마귀", "skin|skin|n.|피부", "teenagers|teenager|n.|십대", "dread|dread|v.|몹시 두려워하다",
  "indicating|indicate|v.|보여 주다, 나타내다", "dermatologist|dermatologist|n.|피부과 의사", "falling|fall|v.|(fall off) 떨어져 나가다",
]);
cards("pr093", "5ac235a599", [
  "animals|animal|n.|동물", "trusting|trusting|adj.|믿음 어린", "consider|consider|v.|생각해 보다", "picture|picture|v.|떠올리다, 상상하다", "eyes|eye|n.|눈",
  "killing|kill|v.|죽이다", "resounding|resounding|adj.|우렁찬, 단호한", "thoughtful|thoughtful|adj.|생각이 깊은", "savagely|savagely|adv.|잔인하게", "wrong|wrong|adj.|잘못된",
  "hide|hide|n.|(동물의) 가죽", "fur|fur|n.|모피", "lovable|lovable|adj.|사랑스러운", "adorable|adorable|adj.|귀여운, 사랑스러운",
]);
cards("pr094", "35359f4d0d", [
  "reduced|reduced|adj.|줄인 (reduced salt content 소금 함량을 줄인)", "taste|taste|n.|맛", "prepared|prepare|v.|준비하다", "expected|expect|v.|예상하다",
  "content|content|n.|함량 (salt content 소금 함량)", "bread|bread|n.|빵", "result|result|n.|결과", "chance|chance|n.|(by chance) 우연히", "difference|difference|n.|차이",
  "salt|salt|n.|소금", "research|research|n.|연구", "examine|examine|v.|조사하다", "loaf|loaf|n.|(빵) 한 덩어리", "standard|standard|adj.|보통의, 표준의",
]);
cards("pr095", "07ae4ecff5", [
  "affecting|affect|v.|영향을 주다", "countries|country|n.|나라", "depend|depend|v.|(depend on) ~에 달려 있다", "economic|economic|adj.|경제의", "recover|recover|v.|회복하다",
  "hardships|hardship|n.|어려움, 곤경", "dealing|deal|v.|(deal with) 다루다, 대처하다", "fund|fund|n.|기금 (International Monetary Fund 국제 통화 기금)",
  "international|international|adj.|국제의", "monetary|monetary|adj.|통화의, 금융의", "trouble|trouble|n.|어려움", "effective|effective|adj.|효과적인",
  "growth|growth|n.|성장 (economic growth rates 경제 성장률)", "warned|warn|v.|경고하다",
]);
cards("pr096", "378ccf4d9f", [
  "plants|plant|n.|식물", "resulted|result|v.|(result from) ~에서 생기다", "direct|direct|adj.|직접적인", "stronger|strong|adj.|더 튼튼한 (strong의 비교급)",
  "heavy|heavy|adj.|많은 (heavy rainfall 많은 비)", "indicate|indicate|v.|보여 주다", "environmental|environmental|adj.|환경의", "changes|change|n.|변화",
  "pressures|pressure|n.|압력", "react|react|v.|반응하다", "touch|touch|n.|손길, 접촉", "findings|findings|n.|연구 결과", "activation|activation|n.|활성화 (gene activation 유전자 활성화)",
  "stimulation|stimulation|n.|자극",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
