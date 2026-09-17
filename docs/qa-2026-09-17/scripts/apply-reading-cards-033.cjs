#!/usr/bin/env node
/**
 * READING vocabulary cards pr033–pr048 (ISS-10: RV-05 … RV-09; R-00). Read card by card against
 * each corrected passage — see apply-reading-cards-001.cjs. Broken card "reading-no" (RV-07),
 * placeholders "blinks" "nearsighted" "unintentionally" (RV-06), words not in the passage
 * ("arrogant", "policy", "artist" and those removed with pr048's exam note) replaced.
 *   node apply-reading-cards-033.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr033", "69fbf2741a", [
  "books|book|n.|책", "pictures|picture|n.|그림", "ideas|idea|n.|개념, 생각 (general ideas 일반 개념)", "word|word|n.|말 (the spoken word 입으로 한 말)",
  "enlighten|enlighten|v.|깨우치다, 계몽하다", "means|means|n.|수단", "lecture|lecture|n.|강의", "life-long|life-long|adj.|평생의", "image|image|n.|영상, 이미지",
  "screen|screen|n.|화면", "valuable|valuable|adj.|귀중한", "companions|companion|n.|동반자", "illustrating|illustrate|v.|(그림으로) 설명하다",
  "abide|abide|v.|오래 남다, 지속되다",
]);
cards("pr034", "66a0ad715c", [
  "calming|calm|v.|가라앉히다, 진정시키다", "fail|fail|v.|실패하다, 효과가 없다", "important|important|adj.|중요한", "share|share|v.|함께 느끼다, 나누다",
  "hand|hand|n.|(the upper hand) 우위, 주도권", "business|business|n.|사업, 비즈니스", "situation|situation|n.|상황", "sense|sense|n.|감각 (sense of humor 유머 감각, common sense 상식)",
  "ability|ability|n.|능력", "absurd|absurd|adj.|터무니없는, 우스꽝스러운", "aside|aside|adv.|~은 제쳐 두고 (common sense aside 상식을 빼면)", "asset|asset|n.|자산, 유용한 자질",
  "humor|humor|n.|유머", "constructive|constructive|adj.|건설적인",
]);
cards("pr035", "1befad6085", [
  "changed|change|v.|변하다", "complex|complex|adj.|복잡한", "increase|increase|n.|증가", "qualified|qualified|adj.|자격을 갖춘 (the best qualified 가장 적임자)",
  "nineteenth|nineteenth|adj.|19번째의 (the nineteenth century 19세기)", "expert|expert|n.|전문가", "science|science|n.|과학", "technology|technology|n.|기술",
  "latter|latter|adj.|후반의 (the latter part 후반부)", "century|century|n.|세기", "graduates|graduate|n.|졸업생", "competition|competition|n.|경쟁",
  "specialized|specialized|adj.|전문화된", "training|training|n.|훈련, 교육",
]);
cards("pr036", "7ae81150a5", [
  "knowledge|knowledge|n.|지식", "brain|brain|n.|두뇌 (brain power 두뇌의 힘)", "natural|natural|adj.|자연의 (natural resources 천연자원)", "societies|society|n.|사회",
  "changing|change|v.|바뀌다 (change into ~로 바뀌다)", "far|far|adv.|훨씬 (far more 훨씬 더)", "economy|economy|n.|경제", "economic|economic|adj.|경제의",
  "based|base|v.|~에 바탕을 두다 (based on ~에 바탕을 둔)", "resourcefulness|resourcefulness|n.|지략, 수완", "industrial|industrial|adj.|산업의",
  "competition|competition|n.|경쟁", "technology|technology|n.|기술", "guarantee|guarantee|v.|보장하다",
]);
cards("pr037", "3823d8057b", [
  "knowledge|knowledge|n.|지식", "misleads|mislead|v.|잘못 이끌다", "arrogance|arrogance|n.|오만", "great|great|adj.|큰 (be it great or small 크든 작든)",
  "small|small|adj.|작은", "remedy|remedy|n.|해결책, 처방", "really|really|adv.|정말로", "well|well|adv.|잘", "against|against|prep.|~에 대한, ~을 막는 (remedy against ~에 대한 처방)",
  "knowing|know|v.|알다", "something|something|pron.|무언가", "best|best|adj.|가장 좋은", "men|man|n.|사람 (men = people)", "be|be|v.|~이다 (be it A or B A이든 B이든)",
]);
cards("pr038", "3b95c9a99f", [
  "city|city|n.|도시", "designed|design|v.|설계하다", "collection|collection|n.|모음, 집합", "streets|street|n.|거리", "buildings|building|n.|건물",
  "community|community|n.|공동체", "inspires|inspire|v.|불러일으키다", "loyalty|loyalty|n.|애착, 충성심", "matter|matter|n.|(no matter how) 아무리 ~해도",
  "ultimately|ultimately|adv.|결국", "turn|turn|v.|바꾸다 (turn A into B)", "well|well|adv.|잘", "love|love|n.|사랑", "live|live|v.|살다",
]);
cards("pr039", "31c8bc9ba9", [
  "increased|increase|v.|늘다", "deep|deep|adj.|깊은", "families|family|n.|가족", "blame|blame|v.|탓하다, 비난하다 (blame A for B)", "bright|bright|adj.|밝은",
  "season|season|n.|철, 시기 (hunting season 사냥철)", "safety|safety|n.|안전", "hunting|hunting|n.|사냥", "mistaken|mistake|v.|(be mistaken for) ~로 오인되다",
  "accidents|accident|n.|사고", "permits|permit|n.|허가증", "victims|victim|n.|희생자, 피해자", "preventive|preventive|adj.|예방의", "avoidable|avoidable|adj.|피할 수 있는",
]);
cards("pr040", "98d0971153", [
  "understanding|understanding|n.|이해", "light|light|n.|빛", "shadows|shadow|n.|그림자", "knowledge|knowledge|n.|앎, 지식", "families|family|n.|가정, 가족",
  "existence|existence|n.|존재", "voices|voice|n.|목소리", "indivisible|indivisible|adj.|떼려야 뗄 수 없는", "hearts|heart|n.|마음", "parents|parent|n.|부모",
  "cautioning|caution|v.|주의를 주다", "blocked|block|v.|가리다, 막다", "still|still|adv.|여전히", "essential|essential|adj.|기본적인, 꼭 필요한",
]);
cards("pr041", "04003b1ebc", [
  "requires|require|v.|필요로 하다", "develop|develop|v.|기르다, 발전시키다", "expect|expect|v.|기대하다", "social|social|adj.|사회의", "easy|easy|adj.|쉬운",
  "mistakes|mistake|n.|실수", "general|general|n.|(in general) 일반적으로", "achievement|achievement|n.|성취", "personality|personality|n.|성격, 인격",
  "trial|trial|n.|시도 (trial and error 시행착오)", "error|error|n.|실수, 오류", "process|process|n.|과정", "ashamed|ashamed|adj.|부끄러워하는", "somewhat|somewhat|adv.|다소, 어느 정도",
]);
cards("pr042", "c8733c08e5", [
  "dream|dream|v.|꿈꾸다 (dream of ~을 꿈꾸다)", "experience|experience|v.|경험하다", "allows|allow|v.|~할 수 있게 하다 (allow A to do)", "different|different|adj.|다른",
  "travel|travel|n.|여행", "dissatisfied|dissatisfied|adj.|불만스러운", "curiosity|curiosity|n.|호기심", "imagined|imagine|v.|상상하다", "satisfying|satisfy|v.|만족시키다, 채우다",
  "stage|stage|n.|무대", "brief|brief|adj.|짧은", "probably|probably|adv.|아마", "whether|whether|conj.|~이든 (whether A or B A이든 B이든)", "elephant|elephant|n.|코끼리",
]);
cards("pr043", "b2ff30d36c", [
  "art|art|n.|예술 (work of art 예술 작품)", "highly|highly|adv.|고도로, 매우", "hand|hand|n.|(at hand) 맡은, 당면한", "goal|goal|n.|목표", "painting|painting|n.|그림",
  "difficult|difficult|adj.|어려운", "decide|decide|v.|결정하다", "original|original|adj.|원래의", "trained|trained|adj.|훈련된", "retouched|retouch|v.|손질하다, 덧칠하다",
  "intent|intent|n.|의도", "restorers|restorer|n.|복원 전문가", "techniques|technique|n.|기법, 기술", "coherent|coherent|adj.|조화로운, 일관성 있는",
]);
cards("pr044", "c373295f96", [
  "healthy|healthy|adj.|건강에 좋은", "children|child|n.|아이", "important|important|adj.|중요한", "habits|habit|n.|습관 (eating habits 식습관)",
  "poor|poor|adj.|나쁜 (poor eating habits 나쁜 식습관)", "adults|adult|n.|어른", "parents|parent|n.|부모", "tastes|taste|v.|~한 맛이 나다", "eat|eat|v.|먹다",
  "diet|diet|n.|식단, 식사", "well|well|adv.|(as well as) ~뿐만 아니라", "food|food|n.|음식", "usually|usually|adv.|대개", "same|same|adj.|같은",
]);
cards("pr045", "7f875d6d64", [
  "shared|share|v.|함께 쓰다, 공유하다", "remember|remember|v.|기억하다", "telephone|telephone|n.|전화", "important|important|adj.|중요한", "special|special|adj.|특별한",
  "conversations|conversation|n.|대화", "situations|situation|n.|상황", "worthy|worthy|adj.|~할 만한 (worthy of ~할 가치가 있는)", "consideration|consideration|n.|고려, 신경 씀",
  "several|several|adj.|여러", "manners|manners|n.|예절 (good manners)", "calls|call|n.|통화", "equal|equal|adj.|동등한", "thoughtfulness|thoughtfulness|n.|배려",
]);
cards("pr046", "0d5993998e", [
  "develop|develop|v.|발달시키다", "danger|danger|n.|위험", "touch|touch|n.|촉각", "dark|dark|adj.|어두운", "eyes|eye|n.|눈", "sense|sense|n.|감각",
  "never|never|adv.|결코 ~않다", "acquire|acquire|v.|얻다, 갖게 되다", "sight|sight|n.|시각", "stairway|stairway|n.|계단", "birth|birth|n.|출생 (before birth 태어나기 전에)",
  "awareness|awareness|n.|인식, 알아차림", "blinks|blink|v.|눈을 깜빡이다", "turns|turn|v.|(turn off) 끄다",
]);
cards("pr047", "7b49df149a", [
  "performing|performing|adj.|공연하는 (the performing arts 공연 예술)", "support|support|n.|지원", "arts|art|n.|예술", "emphasized|emphasize|v.|강조하다",
  "provide|provide|v.|제공하다", "recognized|recognize|v.|인정하다, 인식하다", "heart|heart|n.|마음 (heart and soul 마음과 영혼)", "achieve|achieve|v.|이루다",
  "government|government|n.|정부", "survive|survive|v.|살아남다", "soul|soul|n.|영혼", "excellence|excellence|n.|우수성, 탁월함", "financial|financial|adj.|재정의, 금전적인",
  "affect|affect|v.|영향을 주다",
]);
cards("pr048", "2bf288b37a", [
  "considered|consider|v.|~로 여기다 (be considered to be ~로 여겨지다)", "friend|friend|n.|친구", "believing|believe|v.|믿다", "rude|rude|adj.|무례한",
  "thoughts|thought|n.|생각", "friendship|friendship|n.|우정", "nearsighted|nearsighted|adj.|근시인", "poor|poor|adj.|나쁜 (poor eyesight 나쁜 시력)",
  "eyesight|eyesight|n.|시력", "unintentionally|unintentionally|adv.|본의 아니게, 무심코", "ignored|ignore|v.|무시하다", "disregarding|disregard|v.|무시하다, 신경 쓰지 않다",
  "absorbed|absorbed|adj.|몰두한 (absorbed in ~에 빠져)", "noticing|notice|v.|알아차리다",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
