#!/usr/bin/env node
/**
 * READING vocabulary cards pr113–pr128 (ISS-10: RV-13, RV-14, RV-15, RV-16; R-00). Read card by
 * card against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed
 * (walks = all walks of life, dropped ≠ 드롭, watched ≠ 시계, faced ≠ 얼굴, skilled ≠ 기술,
 * sharp slide = 급격한 하락, high-volume = 음량이 큰), placeholders written (torso, frequent),
 * cards gone with corrected text ("surrounding", "putting", "sixth", "producer", "decline")
 * replaced.
 *   node apply-reading-cards-113.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr113", "2b40673545", [
  "supported|support|v.|(재정적으로) 지원하다", "saving|saving|n.|절약, 절감", "natural|natural|adj.|천연의 (natural gas 천연가스)", "city|city|n.|도시",
  "building|building|n.|건축 (building codes 건축 법규)", "laws|law|n.|법", "proper|proper|adj.|적절한", "effect|effect|n.|효과 (come into effect 시행되다)",
  "recently|recently|adv.|최근에", "codes|code|n.|법규 (building codes)", "bicycle|bicycle|n.|자전거", "paths|path|n.|길 (bicycle paths 자전거 도로)",
  "escape|escape|v.|(열이) 빠져나가다", "twice|twice|adv.|두 배 (twice as many ~ as …보다 두 배 많은)",
]);
cards("pr114", "9f84e9461b", [
  "social|social|adj.|사회의 (social services 사회 서비스)", "happens|happen|v.|일어나다", "performed|perform|v.|수행하다", "deliver|deliver|v.|제공하다",
  "medicine|medicine|n.|의료, 의학", "influence|influence|v.|영향을 주다", "law|law|n.|법률", "bring|bring|v.|(bring about) 이루다, 일으키다", "abroad|abroad|adv.|해외에서",
  "organizations|organization|n.|단체 (non-governmental organizations 비정부 기구)", "citizens|citizen|n.|시민", "walks|walk|n.|(all walks of life) 각계각층",
  "governments|government|n.|정부", "tasks|task|n.|일, 과업",
]);
cards("pr115", "6b3bc034c5", [
  "body|body|n.|몸", "connected|connect|v.|연결하다 (be connected to ~에 이어져 있다)", "supported|support|v.|받치다, 지탱하다", "following|following|n.|(the following) 다음 것",
  "drawing|drawing|n.|그림 그리기", "hands|hand|n.|손", "feet|foot|n.|발", "satisfying|satisfying|adj.|만족스러운", "active|active|adj.|적극적인", "engagement|engagement|n.|참여, 몰입",
  "entire|entire|adj.|전체의", "expressive|expressive|adj.|표현력이 풍부한", "torso|torso|n.|몸통", "circles|circle|n.|원",
]);
cards("pr116", "12db19d605", [
  "quiet|quiet|adj.|조용한", "expecting|expect|v.|(전화 등을) 기다리다", "phone|phone|n.|전화", "important|important|adj.|중요한", "low|low|adv.|작게 (as low as practical 가능한 한 작게)",
  "extended|extended|adj.|긴, 오래 계속되는", "conversations|conversation|n.|대화, 통화", "riding|ride|v.|타다", "inappropriate|inappropriate|adj.|적절하지 않은",
  "vibrate|vibrate|v.|진동하다 (vibrate mode 진동 모드)", "leaving|leave|v.|나가다", "avoid|avoid|v.|피하다", "annoy|annoy|v.|짜증 나게 하다",
  "public|public|adj.|공공의 (public transportation 대중교통)",
]);
cards("pr117", "676704995c", [
  "follow|follow|v.|따르다", "simple|simple|adj.|간단한", "different|different|adj.|여러, 다른", "bookcase|bookcase|n.|책장", "steps|step|n.|단계", "furniture|furniture|n.|가구",
  "according|according|adv.|(according to) ~에 따라", "finishing|finishing|adj.|마무리의 (finishing touch 마무리 손질)", "painting|paint|v.|페인트칠하다",
  "piece|piece|n.|한 점 (a piece of furniture 가구 한 점)", "materials|material|n.|재료", "wood|wood|n.|목재", "glue|glue|n.|접착제", "suits|suit|v.|~에 맞다, 어울리다",
]);
cards("pr118", "25bea46a65", [
  "create|create|v.|일으키다, 만들어 내다", "danger|danger|n.|위험", "health|health|n.|건강", "exercise|exercise|n.|운동", "education|education|n.|교육",
  "cause|cause|v.|일으키다 (cause damage 해를 끼치다)", "staring|stare|v.|뚫어지게 보다", "damage|damage|n.|손상, 해", "computers|computer|n.|컴퓨터", "lonely|lonely|adj.|외로운",
  "serious|serious|adj.|심각한", "human|human|adj.|인간적인 (less human 덜 인간적인)", "frequent|frequent|adj.|잦은", "opportunities|opportunity|n.|기회",
]);
cards("pr119", "b95c90e7d8", [
  "fears|fear|n.|두려움", "experience|experience|v.|느끼다, 겪다", "dream|dream|v.|(wouldn't dream of ~ing) ~할 생각은 꿈에도 못 하다", "disappear|disappear|v.|사라지다",
  "happen|happen|v.|일어나다", "ghost|ghost|n.|유령, 귀신", "injuries|injury|n.|부상", "later|later|adv.|나중에 (years later 몇 년 뒤)", "child|child|n.|아이", "anxiety|anxiety|n.|불안",
  "petting|pet|v.|쓰다듬다", "strangers|stranger|n.|낯선 사람", "babies|baby|n.|아기", "reality|reality|n.|현실",
]);
cards("pr120", "d39d00f4b7", [
  "appearing|appear|v.|나타나다", "allowed|allow|v.|~할 수 있게 하다 (allow A to do)", "failed|fail|v.|~하지 못하다 (fail to do)", "clock|clock|n.|시계",
  "needed|need|v.|필요로 하다", "perfected|perfect|v.|완성하다", "accurate|accurate|adj.|정확한", "centuries|century|n.|세기", "sundials|sundial|n.|해시계",
  "precision|precision|n.|정확성", "inaccurately|inaccurately|adv.|부정확하게", "timekeeping|timekeeping|n.|시간 측정", "pendulum|pendulum|n.|추 (pendulum clock 추시계)",
  "revolutionizing|revolutionize|v.|혁신하다, 대변혁을 일으키다",
]);
cards("pr121", "3e6c854744", [
  "believe|believe|v.|믿다", "bodies|body|n.|몸", "illnesses|illness|n.|질병", "animals|animal|n.|동물", "spend|spend|v.|(시간을) 보내다", "resting|rest|v.|쉬게 하다",
  "curing|cure|v.|치료하다, 낫게 하다", "physical|physical|adj.|신체의", "wounds|wound|n.|상처", "condition|condition|n.|상태 (in good physical condition 몸 상태가 좋은)",
  "injured|injured|adj.|다친", "quite|quite|adv.|(quite a few) 꽤 많은", "sleepy|sleepy|adj.|졸린", "damage|damage|n.|손상",
]);
cards("pr122", "677b11d075", [
  "received|receive|v.|받다, 벌다", "encouraged|encourage|v.|권장하다 (encourage A to do)", "produced|produce|v.|생산하다", "countries|country|n.|나라",
  "exports|export|n.|수출, 수출품", "demand|demand|n.|수요", "self-sufficient|self-sufficient|adj.|자급자족하는", "coffee|coffee|n.|커피", "recent|recent|adj.|최근의",
  "crop|crop|n.|작물 (export crop 수출 작물)", "factors|factor|n.|요인", "dropped|drop|v.|줄다, 떨어지다", "farmers|farmer|n.|농민", "price|price|n.|가격",
]);
cards("pr123", "cebbe87116", [
  "blamed|blame|v.|탓하다 (be blamed for ~의 원인으로 지목되다)", "students|student|n.|학생", "universal|universal|adj.|널리 퍼진, 보편적인",
  "measure|measure|n.|척도 (the broadest measure 가장 폭넓은 척도)", "television|television|n.|텔레비전", "sharp|sharp|adj.|급격한", "early|early|adj.|초의 (the early 1960s 1960년대 초)",
  "scholastic|scholastic|adj.|학업의", "aptitude|aptitude|n.|적성", "declined|decline|v.|떨어지다, 감소하다", "traditional|traditional|adj.|전통적인", "scores|score|n.|점수",
  "learning|learning|n.|학습", "slide|slide|n.|하락",
]);
cards("pr124", "3a3c7cfabd", [
  "create|create|v.|만들어 내다", "compared|compare|v.|비교하다 (compared with ~와 비교해)", "atmosphere|atmosphere|n.|분위기", "natural|natural|adj.|자연스러운",
  "stronger|strong|adj.|더 강한 (strong의 비교급)", "vegetation|vegetation|n.|초목, 식물", "according|according|adv.|(according to) ~에 따르면", "violence|violence|n.|폭력",
  "buildings|building|n.|건물", "shade|shade|n.|그늘", "supervised|supervise|v.|보살피다, 감독하다", "watched|watch|v.|지키다, 감시하다", "trees|tree|n.|나무", "study|study|n.|연구",
]);
cards("pr125", "702019de6f", [
  "expected|expect|v.|예상하다 (be expected to ~할 것으로 예상되다)", "leading|leading|adj.|앞선, 선도하는", "countries|country|n.|나라", "competitiveness|competitiveness|n.|경쟁력",
  "car|car|n.|자동차", "manufactured|manufacture|v.|제조하다", "skilled|skilled|adj.|숙련된", "largest|large|adj.|가장 큰 (large의 최상급)", "forecasters|forecaster|n.|예측하는 전문가",
  "automobile|automobile|n.|자동차", "producers|producer|n.|생산국, 생산자", "workforce|workforce|n.|노동력, 인력", "grown|grow|v.|성장하다", "auto-making|auto-making|adj.|자동차를 만드는",
]);
cards("pr126", "4c4c67e4ca", [
  "noise|noise|n.|소음", "environments|environment|n.|환경", "disappeared|disappear|v.|사라지다", "noisy|noisy|adj.|시끄러운", "poor|poor|adj.|저조한 (poor performance 저조한 성과)",
  "solve|solve|v.|해결하다", "performance|performance|n.|수행, 성과", "effects|effect|n.|영향", "environmental|environmental|adj.|환경의", "unpredictable|unpredictable|adj.|예측할 수 없는",
  "high-volume|high-volume|adj.|소리가 큰, 음량이 큰", "psychologists|psychologist|n.|심리학자", "harmful|harmful|adj.|해로운", "terminate|terminate|v.|끝내다, 멈추게 하다",
]);
cards("pr127", "278f6f05b9", [
  "offer|offer|v.|제시하다", "intellect|intellect|n.|지성", "understandable|understandable|adj.|이해할 수 있는", "religion|religion|n.|종교", "capability|capability|n.|능력",
  "space|space|n.|공간", "therefore|therefore|adv.|그러므로", "outside|outside|prep.|~의 범위 밖에", "beyond|beyond|prep.|~을 넘어서", "something|something|pron.|어떤 것",
  "make|make|v.|~하게 하다 (make A understandable A를 이해할 수 있게 하다)", "way|way|n.|길, 방법", "time|time|n.|시간", "should|should|v.|~해야 한다 (조동사)",
]);
cards("pr128", "ed59a2312d", [
  "required|required|adj.|필요한", "expected|expect|v.|예상하다 (be expected to)", "demand|demand|n.|수요", "slow|slow|v.|(slow down) 늦추다", "e-business|e-business|n.|전자 상거래",
  "industry|industry|n.|산업", "faced|face|v.|(be faced with) ~에 직면하다", "labor|labor|n.|노동력, 인력", "changing|change|v.|바꾸다 (change A into B)", "shortage|shortage|n.|부족",
  "serious|serious|adj.|심각한", "experts|expert|n.|전문가", "competitively|competitively|adv.|앞다투어, 경쟁적으로", "supply|supply|n.|공급",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
