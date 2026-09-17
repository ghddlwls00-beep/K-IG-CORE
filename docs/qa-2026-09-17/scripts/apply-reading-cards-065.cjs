#!/usr/bin/env node
/**
 * READING vocabulary cards pr065–pr080 (ISS-10: RV-10, RV-11, RV-12; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Placeholders (RV-11:
 * illustration, within, happier, reality, strive, goals.stay, grandchildren, fueled, startled,
 * receptionist, hiccups, dissatisfied, gods, thinner, saddle, granted, big-league) written;
 * pr070/pr077 cards follow their rewritten passages; card taken from a play title
 * ("measure", RV-12) replaced.
 *   node apply-reading-cards-065.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr065", "88deaef8a2", [
  "clean|clean|adj.|깨끗한, 오염이 없는", "energy|energy|n.|에너지", "produce|produce|v.|만들어 내다, 생산하다", "find|find|v.|찾다",
  "greenhouse|greenhouse|n.|온실 (greenhouse effect 온실 효과)", "sources|source|n.|원천 (sources of energy 에너지원)", "order|order|n.|(in order to) ~하기 위해",
  "avoid|avoid|v.|피하다", "effect|effect|n.|효과", "used|use|v.|쓰이다 (be used to do ~하는 데 쓰이다)", "steps|step|n.|조치 (take steps 조치를 취하다)",
  "expensive|expensive|adj.|비싼", "solar|solar|adj.|태양의 (solar energy 태양 에너지)", "electricity|electricity|n.|전기",
]);
cards("pr066", "2e3e334e63", [
  "happiness|happiness|n.|행복", "believed|believe|v.|믿다 (be believed to ~한다고 여겨지다)", "health|health|n.|건강", "hand|hand|n.|손",
  "according|according|adv.|(according to) ~에 따르면", "reveal|reveal|v.|드러내다", "forecasts|forecast|v.|예고하다, 예측하다", "moles|mole|n.|(피부의) 점",
  "trustworthy|trustworthy|adj.|믿을 만한", "ancient|ancient|adj.|옛, 고대의", "superstitions|superstition|n.|미신", "character|character|n.|성격",
  "desired|desired|adj.|바라는 (the most desired 가장 바라는 것)", "eyebrow|eyebrow|n.|눈썹",
]);
cards("pr067", "0d97890e04", [
  "animal|animal|n.|동물 (animal space scientists 동물 우주 과학자들)", "proudly|proudly|adv.|자랑스럽게", "earth|earth|n.|지구", "meeting|meeting|n.|회의, 모임",
  "announced|announce|v.|알리다, 발표하다", "chimpanzee|chimpanzee|n.|침팬지", "sending|send|v.|보내다", "rocket|rocket|n.|로켓", "scientists|scientist|n.|과학자",
  "spaceship|spaceship|n.|우주선", "laughed|laugh|v.|웃다", "silly|silly|adj.|어리석은", "melt|melt|v.|녹다", "beat|beat|v.|이기다",
]);
cards("pr068", "7a768497ee", [
  "friend|friend|n.|친구", "decided|decide|v.|결정하다", "spend|spend|v.|(시간을) 보내다 (spend the rest of one's life 평생을 보내다)", "light|light|n.|신호등 (red light 빨간불)",
  "accident|accident|n.|사고", "later|later|adv.|나중에", "changed|change|v.|바꾸다", "learned|learn|v.|알게 되다; 배우다", "terrible|terrible|adj.|끔찍한",
  "wheelchair|wheelchair|n.|휠체어", "consciousness|consciousness|n.|의식 (lose consciousness 의식을 잃다)", "approached|approach|v.|다가가다",
  "intersection|intersection|n.|교차로", "costly|costly|adj.|대가가 큰, 값비싼",
]);
cards("pr069", "9be633047a", [
  "language|language|n.|언어", "increased|increase|v.|늘다, 증가하다", "culture|culture|n.|문화", "dramatically|dramatically|adv.|극적으로, 크게",
  "students|student|n.|학생", "offer|offer|v.|제공하다", "interested|interested|adj.|관심 있는", "growing|growing|adj.|커지는, 늘어나는", "imagined|imagine|v.|상상하다",
  "number|number|n.|수 (the number of ~의 수)", "firms|firm|n.|회사", "foreigners|foreigner|n.|외국인", "success|success|n.|성공", "overseas|overseas|adv.|해외에서",
]);
cards("pr070", "4b87c0e115", [
  "safe|safe|adj.|(it is not safe to conclude) 섣불리 ~라고 결론 내릴 수 없다", "sound|sound|v.|~하게 들리다 (how you sound 목소리가 어떻게 들리는지)",
  "voice|voice|n.|목소리 (tone of voice 목소리 톤)", "words|word|n.|말, 단어", "experiment|experiment|n.|실험", "psychology|psychology|n.|심리학",
  "appearance|appearance|n.|외모", "expression|expression|n.|표정 (facial expression 얼굴 표정)", "facial|facial|adj.|얼굴의", "impression|impression|n.|인상 (first impression 첫인상)",
  "judge|judge|v.|판단하다", "match|match|v.|서로 맞다, 일치하다", "conclude|conclude|v.|결론 내리다", "tone|tone|n.|어조, 톤",
]);
cards("pr071", "2ac18fe8fc", [
  "body|body|n.|몸", "feet|foot|n.|발", "exercise|exercise|n.|운동 (physical exercise 신체 운동)", "heart|heart|n.|심장 (heart rate 심박수)", "increases|increase|v.|높이다, 늘리다",
  "carried|carry|v.|(carry out) 실시하다", "effects|effect|n.|영향, 효과", "laughter|laughter|n.|웃음", "breathing|breathing|n.|호흡", "several|several|adj.|여러",
  "tests|test|n.|실험, 검사", "study|study|v.|연구하다", "muscles|muscle|n.|근육", "stomach|stomach|n.|배",
]);
cards("pr072", "2a85834353", [
  "succeed|succeed|v.|성공하다", "productive|productive|adj.|생산적인", "offer|offer|v.|제공하다, 내놓다", "representative|representative|n.|직원 (sales representative 영업 사원)",
  "choosing|choose|v.|고르다", "ability|ability|n.|능력", "competent|competent|adj.|유능한", "positive|positive|adj.|긍정적인", "attitude|attitude|n.|태도",
  "purely|purely|adv.|순전히", "interest|interest|n.|관심, 흥미", "zeal|zeal|n.|열의, 열정", "present|present|v.|(present oneself) 자신을 드러내 보이다", "adds|add|v.|덧붙여 말하다",
]);
cards("pr073", "84a8b41fff", [
  "heart|heart|n.|마음 (in your heart 마음속으로)", "fear|fear|n.|두려움", "sound|sound|adj.|건전한 (sound character 건전한 인격)", "honest|honest|adj.|정직한",
  "worry|worry|v.|걱정하다", "courage|courage|n.|용기", "dependable|dependable|adj.|믿을 만한", "matters|matter|v.|중요하다 (what matters 중요한 것)",
  "convictions|conviction|n.|신념, 확신", "caring|caring|adj.|남을 배려하는", "decent|decent|adj.|올바른, 품위 있는", "challenges|challenge|n.|도전, 어려움",
  "sincere|sincere|adj.|진실한", "head-on|head-on|adv.|정면으로",
]);
cards("pr074", "55f836f056", [
  "prime|prime|adj.|주요한, 최고의 (prime opportunity 절호의 기회)", "molded|mold|v.|빚다 (be molded out of ~로 빚어지다)", "helping|help|v.|돕다",
  "indeed|indeed|adv.|실로, 실제로", "amends|amends|n.|(make amends) 잘못을 바로잡다, 보상하다", "opportunity|opportunity|n.|기회", "faults|fault|n.|결점",
  "wrote|write|v.|쓰다", "bigger|big|adj.|더 큰 (the bigger ~, the better ~ 클수록 더 ~하다)", "blunder|blunder|n.|큰 실수", "chance|chance|n.|가능성",
  "self-improvement|self-improvement|n.|자기 계발", "bad|bad|adj.|나쁜", "better|good|adj.|더 나은 (good의 비교급)",
]);
cards("pr075", "0ba53a590c", [
  "caffeine|caffeine|n.|카페인", "conception|conception|n.|임신", "conceiving|conceive|v.|임신하다", "linked|link|v.|관련짓다 (link A to B)", "reviews|review|n.|(연구) 검토, 논평",
  "conflict|conflict|v.|서로 상충하다, 엇갈리다", "chances|chance|n.|가능성", "another|another|pron.|다른 하나 (another study)", "milligrams|milligram|n.|밀리그램",
  "study|study|n.|연구", "effect|effect|n.|영향, 효과", "delay|delay|n.|지연", "found|find|v.|알아내다, 발견하다 (find의 과거)", "daily|daily|adv.|매일, 하루에",
]);
cards("pr076", "23208b5bdf", [
  "goals|goal|n.|목표", "rig|rig|v.|(자기에게 유리하게) 조작하다 (rig the game)", "high|high|adj.|높은", "modest|modest|adj.|적당한, 소박한", "fail|fail|v.|실패하다",
  "grasp|grasp|n.|손이 닿는 범위 (within one's grasp 손이 닿는 곳에)", "set|set|v.|(목표를) 세우다", "within|within|prep.|~ 안에", "reach|reach|v.|이루다, 도달하다",
  "happier|happy|adj.|더 행복한 (happy의 비교급)", "unreachable|unreachable|adj.|이룰 수 없는", "reality|reality|n.|현실", "strive|strive|v.|애쓰다, 노력하다",
  "choosing|choose|v.|~하기로 하다 (choose to do)",
]);
cards("pr077", "d8f60bd65b", [
  "climate|climate|n.|기후", "increased|increased|adj.|늘어난", "atmosphere|atmosphere|n.|대기", "changes|change|n.|변화", "evidence|evidence|n.|증거",
  "according|according|adv.|(according to) ~에 따르면", "leaving|leave|v.|남기다 (leave A B A에게 B를 남기다)", "grandchildren|grandchild|n.|손주", "frightening|frightening|adj.|무서운",
  "bring|bring|v.|(bring about) 일으키다", "fueled|fuel|v.|부채질하다, 불붙이다", "so-called|so-called|adj.|이른바", "disastrous|disastrous|adj.|재앙을 부르는",
  "inheritance|inheritance|n.|유산",
]);
cards("pr078", "fee01e2767", [
  "appeared|appear|v.|나타나다", "happened|happen|v.|일어나다", "doctor|doctor|n.|의사", "startled|startled|adj.|깜짝 놀란", "stormed|storm|v.|(storm out) 화가 나서 뛰쳐나가다",
  "examining|examining|adj.|진찰하는 (examining room 진찰실)", "receptionist|receptionist|n.|접수 직원", "paying|pay|v.|(돈을) 내다", "replied|reply|v.|대답하다",
  "cured|cure|v.|낫게 하다", "hiccups|hiccups|n.|딸꾹질", "exclaimed|exclaim|v.|외치다", "course|course|n.|(of course) 물론", "pregnant|pregnant|adj.|임신한",
]);
cards("pr079", "50cab57cf6", [
  "wishes|wish|n.|소원", "remember|remember|v.|기억하다", "dissatisfied|dissatisfied|adj.|불만스러운", "merciful|merciful|adj.|자비로운",
  "satisfied|satisfied|adj.|만족한 (be satisfied with ~에 만족하다)", "gods|god|n.|신", "changed|change|v.|바꾸다 (change A into B)", "thinner|thin|adj.|더 가는 (thin의 비교급)",
  "horse|horse|n.|말", "saddle|saddle|n.|안장", "shocked|shock|v.|충격을 주다", "granted|grant|v.|(소원을) 들어주다 (be granted 이루어지다)", "features|feature|n.|특징",
  "creature|creature|n.|동물, 생물",
]);
cards("pr080", "53292894c2", [
  "followed|follow|v.|(소식을) 계속 지켜보다", "remembering|remember|v.|기억하다", "exists|exist|v.|존재하다", "habit|habit|n.|습관", "autograph|autograph|n.|사인",
  "unprepared|unprepared|adj.|준비가 안 된", "feet|foot|n.|피트 (길이 단위, 약 30cm)", "pencil|pencil|n.|연필", "pocket|pocket|n.|주머니", "devotion|devotion|n.|헌신, 열성",
  "tempted|tempted|adj.|~하고 싶은 (feel tempted to ~하고 싶어지다)", "empty-handed|empty-handed|adj.|빈손인", "shrugged|shrug|v.|(어깨를) 으쓱하다",
  "big-league|big-league|adj.|메이저리그의 (big-league game 메이저리그 경기)",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
