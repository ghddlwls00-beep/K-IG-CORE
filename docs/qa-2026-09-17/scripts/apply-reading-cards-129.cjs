#!/usr/bin/env node
/**
 * READING vocabulary cards pr129–pr144 (ISS-10: RV-15, RV-16, RV-17, RV-18; R-00). Read card by
 * card against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed
 * (regarded ≠ 존경하다, associated ≠ 동료, latest ≠ 늦게, handling ≠ 손잡이, appreciate = 감상하다,
 * right = 권리, works = 업적), placeholders written (boredom, uninteresting, impair, spatial,
 * willing, mosquito), pr129's cards follow its corrected Legionnaires' passage, "stolen" (from the
 * wrong story title) replaced.
 *   node apply-reading-cards-129.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr129", "ebe563e9c7", [
  "lead|lead|v.|(lead to) ~을 일으키다", "disease|disease|n.|질병", "hot|hot|adj.|뜨거운", "warm|warm|adj.|따뜻한", "save|save|v.|절약하다 (save energy 에너지를 아끼다)",
  "changes|change|n.|변화", "systems|system|n.|설비 (water systems 급수 설비)", "buildings|building|n.|건물", "germ|germ|n.|세균", "died|die|v.|죽다",
  "infected|infected|adj.|감염된 (become infected 감염되다)", "lowered|lower|v.|낮추다", "breathe|breathe|v.|(breathe in) 들이마시다", "temperature|temperature|n.|온도",
]);
cards("pr130", "52e398d1b5", [
  "hard|hard|adv.|고되게, 열심히", "boredom|boredom|n.|지루함, 권태", "uninteresting|uninteresting|adj.|재미없는", "regarded|regard|v.|여기다 (be regarded as ~로 여겨지다)",
  "provided|provided|conj.|~라면 (= if)", "desirable|desirable|adj.|바람직한", "preventive|preventive|n.|예방책 (a preventive of ~을 막는 것)",
  "foremost|foremost|adv.|(first and foremost) 무엇보다도", "comparison|comparison|n.|비교 (in comparison with ~와 비교하면)", "associated|associate|v.|연관 짓다 (be associated with ~와 연관되다)",
  "zest|zest|n.|즐거움, 열의", "impair|impair|v.|해치다, 손상시키다", "vigor|vigor|n.|활력", "delicious|delicious|adj.|즐거운, 달콤한",
]);
cards("pr131", "fa9c49a5a1", [
  "ideas|idea|n.|생각", "general|general|adj.|일반적인", "world|world|n.|세계 (inner world 내면 세계)", "spatial|spatial|adj.|공간의", "applies|apply|v.|적용되다 (apply to ~에 적용되다)",
  "impressions|impression|n.|인상", "emotions|emotion|n.|감정", "space|space|n.|공간", "inner|inner|adj.|내면의", "order|order|n.|질서, 순서", "given|give|v.|주다 (be given 부여되다)",
  "because|because|conj.|~ 때문에", "more|more|adv.|더", "time|time|n.|시간",
]);
cards("pr132", "892007c178", [
  "language|language|n.|언어", "leads|lead|v.|(lead to) ~로 이어지다", "wish|wish|v.|~하고 싶어 하다 (wish to do)", "dialect|dialect|n.|방언", "change|change|n.|변화",
  "stem|stem|v.|막다, 저지하다", "purists|purist|n.|순수주의자", "differentiation|differentiation|n.|분화", "corruption|corruption|n.|타락, 변질", "false|false|adj.|그릇된",
  "belief|belief|n.|믿음", "because|because|adv.|(because of) ~ 때문에", "better|good|adj.|더 나은 (good의 비교급)", "others|other|pron.|다른 것들",
]);
cards("pr133", "c98c7ffa0a", [
  "different|different|adj.|다른", "scorn|scorn|v.|경멸하다", "assume|assume|v.|당연하게 여기다, 가정하다", "past|past|n.|과거", "worthwhile|worthwhile|adj.|가치 있는",
  "present|present|n.|현재", "study|study|n.|연구", "usually|usually|adv.|대개", "entirely|entirely|adv.|완전히", "hence|hence|adv.|그러므로", "learn|learn|v.|배우다",
  "works|work|n.|업적, 작품 (the past and its works 과거와 그 업적)", "nothing|nothing|pron.|아무것도 ~않다", "people|people|n.|사람들",
]);
cards("pr134", "ab7233b19c", [
  "observing|observe|v.|관찰하다", "explore|explore|v.|탐험하다", "faster|fast|adv.|더 빠르게 (faster and faster 점점 더 빠르게)", "light|light|n.|빛 (the speed of light 광속)",
  "speed|speed|n.|속도", "travel|travel|v.|여행하다, 이동하다", "universe|universe|n.|우주", "nearest|near|adj.|가장 가까운 (near의 최상급)", "technology|technology|n.|기술",
  "lifetime|lifetime|n.|평생", "telescopes|telescope|n.|망원경", "spaceships|spaceship|n.|우주선", "star|star|n.|별", "limit|limit|n.|한계 (speed limit 속도 한계)",
]);
cards("pr135", "e9d4d6cb59", [
  "reproduce|reproduce|v.|번식하다, 자신을 복제하다", "particle|particle|n.|입자", "category|category|n.|범주", "classify|classify|v.|분류하다", "define|define|v.|정의하다",
  "trait|trait|n.|특성", "although|although|conj.|비록 ~이지만", "viruses|virus|n.|바이러스", "exhibit|exhibit|v.|나타내다, 보이다", "characteristics|characteristic|n.|특성",
  "living|living|adj.|살아 있는", "confused|confused|adj.|혼란스러운", "called|call|v.|~라고 부르다 (be called ~라고 불리다)", "borderline|borderline|adj.|경계선상의",
]);
cards("pr136", "31f530a4c8", [
  "created|create|v.|만들어 내다, 창조하다", "provides|provide|v.|주다 (provide A with B A에게 B를 주다)", "experience|experience|n.|경험", "receive|receive|v.|얻다, 받다",
  "poetry|poetry|n.|시", "triumphs|triumph|n.|승리", "fears|fear|n.|두려움", "struggles|struggle|n.|분투, 투쟁", "sympathize|sympathize|v.|공감하다 (sympathize with)",
  "appreciate|appreciate|v.|감상하다, 즐기다", "emotions|emotion|n.|감정", "imagination|imagination|n.|상상력", "moves|move|v.|(마음을) 움직이다 (move A to do A가 ~하게 하다)",
  "imaginative|imaginative|adj.|상상의",
]);
cards("pr137", "9e416c287a", [
  "realize|realize|v.|깨닫다", "animals|animal|n.|가축, 동물", "young|young|adj.|젊은", "poor|poor|adj.|가난한", "communities|community|n.|지역 사회", "discouraged|discouraged|adj.|낙담한",
  "volunteer|volunteer|v.|자원하다", "care|care|v.|(care for) 돌보다", "formerly|formerly|adv.|이전에", "hopeless|hopeless|adj.|희망이 없는", "teach|teach|v.|가르치다",
  "supply|supply|n.|공급 (water supply 식수원)", "water|water|n.|물", "farms|farm|n.|농장",
]);
cards("pr138", "ba1934ac3b", [
  "evolved|evolve|v.|진화하다", "discovered|discover|v.|알아내다", "principle|principle|n.|원리", "near|near|adj.|가까운", "latest|latest|adj.|최신의 (the latest generation 최신 세대)",
  "ceiling|ceiling|n.|천장", "inconspicuous|inconspicuous|adj.|눈에 띄지 않는", "willing|willing|adj.|기꺼이 ~하는 (be willing to)", "mosquito|mosquito|n.|모기",
  "strategy|strategy|n.|전략", "looking|look|v.|(look for) 찾다", "duel|duel|v.|결투하다", "hiding|hiding|adj.|숨는 (hiding place 숨는 곳)", "obvious|obvious|adj.|눈에 잘 띄는",
]);
cards("pr139", "0494e1c161", [
  "demands|demand|n.|요구", "school|school|n.|학교", "society|society|n.|사회", "creativity|creativity|n.|창의성", "truth|truth|n.|진실", "civilize|civilize|v.|교화하다",
  "social|social|adj.|사회의 (social order 사회 질서)", "preserved|preserve|v.|지키다, 보존하다", "agreement|agreement|n.|합의",
  "attributed|attribute|v.|(attribute A to B) A를 B 덕분으로 돌리다", "disadvantage|disadvantage|n.|불리한 점", "genius|genius|n.|천재성, 천재", "impulses|impulse|n.|충동",
  "therefore|therefore|adv.|그러므로",
]);
cards("pr140", "4c0a5ce445", [
  "recognizing|recognize|v.|인정하다", "health|health|n.|건강", "books|book|n.|책", "idea|idea|n.|아이디어", "starting|start|v.|시작하다",
  "laughing|laughing|adj.|웃기는 (laughing matter 웃을 일)", "healing|healing|adj.|치유의 (healing power 치유력)", "hospitals|hospital|n.|병원", "comedians|comedian|n.|코미디언",
  "humor|humor|n.|유머", "matter|matter|n.|일, 문제 (laughing matter 웃을 일)", "seriously|seriously|adv.|진지하게", "profession|profession|n.|직업 (health profession 의료계)",
  "laughter|laughter|n.|웃음",
]);
cards("pr141", "0e52faf657", [
  "friends|friend|n.|친구", "friendships|friendship|n.|우정, 친구 관계", "parent|parent|n.|부모", "nature|nature|n.|본성 (our better nature 우리의 더 나은 본성)",
  "example|example|n.|본보기", "important|important|adj.|중요한", "crucial|crucial|adj.|매우 중요한", "children|child|n.|아이",
  "bring|bring|v.|(bring up) 끌어올리다, (bring down) 끌어내리다", "choice|choice|n.|선택", "tending|tend|v.|(어떤 방향으로) 기울다", "allies|ally|n.|편, 협력자",
  "matters|matter|v.|중요하다", "childhood|childhood|n.|어린 시절",
]);
cards("pr142", "1a2935729b", [
  "environment|environment|n.|환경 (working environment 근무 환경)", "late|late|adv.|늦게", "allow|allow|v.|허용하다", "employers|employer|n.|고용주",
  "productivity|productivity|n.|생산성", "consider|consider|v.|고려하다", "support|support|v.|돕다, 지지하다", "encourage|encourage|v.|장려하다, 북돋우다",
  "important|important|adj.|중요한", "behaviors|behavior|n.|행동", "arriving|arrive|v.|도착하다 (arrive late 지각하다)", "bothering|bother|v.|귀찮게 하다",
  "pleasant|pleasant|adj.|쾌적한", "performance|performance|n.|업무 성과",
]);
cards("pr143", "4ae7c22742", [
  "causing|cause|v.|일으키다 (cause harm 해를 끼치다)", "increased|increase|v.|커지다, 늘다", "exercise|exercise|v.|(권리를) 행사하다", "control|control|n.|통제",
  "information|information|n.|정보", "capacity|capacity|n.|능력", "protect|protect|v.|보호하다", "right|right|n.|권리", "private|private|adj.|사적인", "personal|personal|adj.|개인의",
  "ensure|ensure|v.|보장하다", "distribution|distribution|n.|유포, 배포", "collected|collect|v.|수집하다", "distributed|distribute|v.|유포하다, 배포하다",
]);
cards("pr144", "917b6c2d29", [
  "health|health|n.|건강", "result|result|n.|(as a result of) ~의 결과로", "noise|noise|n.|소음", "crowding|crowding|n.|혼잡, 붐빔", "stresses|stress|v.|스트레스를 주다",
  "stretches|stretch|n.|(계속되는) 기간 (long stretches 오래 이어지는 시간)", "handling|handle|v.|처리하다, 다루다", "traffic|traffic|n.|교통 (air traffic 항공 교통)",
  "stressful|stressful|adj.|스트레스가 많은", "controllers|controller|n.|관제사 (air traffic controllers 항공 교통 관제사)", "instance|instance|n.|(for instance) 예를 들어",
  "aircraft|aircraft|n.|항공기", "manufacturing|manufacturing|n.|제조업", "involved|involved|adj.|해당하는 (the amount of work involved 해야 하는 일의 양)",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
