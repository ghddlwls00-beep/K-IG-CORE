#!/usr/bin/env node
/**
 * READING vocabulary cards pr193–pr208 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (treat
 * 대하다 → 간식, bill 계산서 → 법안, house 집 → 의회의 원, press 누르다 → 언론, regarding 존경하다 →
 * ~에 관한, dearly 친애하는 → 비싸게, qualifications 자격 → 단서, considerations 배려 → 고려 사항,
 * judging 판사, maintain 유지하다 → 주장하다), wrong parts of speech fixed, placeholders written or
 * replaced (ice-cream, cone, tumbles, york, p.m, thus), fragments and proper nouns replaced
 * (ice, cream, english, portuguese, friday, christmas, we've), and cards no longer in the text
 * after the passage fixes (invented, p.m, thus, flemish) replaced.
 *   node apply-reading-cards-193.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr193", "4c91c33f30", [
  "suggested|suggest|v.|제안하다", "selling|sell|v.|팔다", "delicious|delicious|adj.|맛있는", "favorite|favorite|adj.|가장 좋아하는", "cone|cone|n.|(아이스크림) 콘",
  "treat|treat|n.|간식, 특별히 즐기는 먹을거리", "summer|summer|n.|여름", "instant|instant|adj.|즉각적인 (instant success 곧바로 거둔 성공)", "success|success|n.|성공",
  "accident|accident|n.|(by accident) 우연히", "famous|famous|adj.|유명한", "seller|seller|n.|팔리는 상품 (big seller 잘 팔리는 상품)",
  "fair|fair|n.|박람회 (world's fair 세계 박람회)", "rolling|roll|v.|둥글게 말다",
]);
cards("pr194", "357325c01b", [
  "ripening|ripen|v.|익다", "crops|crop|n.|농작물", "turning|turn|v.|(색이) ~으로 변하다", "journey|journey|n.|여행", "pleased|please|v.|기쁘게 하다",
  "thoughts|thought|n.|생각", "raised|raise|v.|기르다", "ashamed|ashamed|adj.|부끄러운", "visited|visit|v.|찾아가다, 방문하다", "disappointed|disappoint|v.|실망시키다",
  "spent|spend|v.|(시간을) 보내다", "sixtieth|sixtieth|adj.|60번째의 (sixtieth birthday 환갑)", "alone|alone|adv.|혼자", "earlier|early|adv.|더 일찍 (a week earlier 일주일 전에)",
]);
cards("pr195", "ee4872b720", [
  "happened|happen|v.|일어나다", "earth|earth|n.|지구", "record|record|v.|기록하다", "suppose|suppose|v.|가정하다 (Suppose ~ ~라고 해 보자)", "football|football|n.|(미식)축구",
  "absolute|absolute|adj.|절대적인", "occurred|occur|v.|발생하다", "traveling|travel|v.|이동하다, 여행하다", "correct|correct|adj.|옳은, 정확한",
  "depends|depend|v.|(depend on) ~에 달려 있다", "explosion|explosion|n.|폭발", "universe|universe|n.|우주", "speed|speed|n.|속도",
  "relativity|relativity|n.|상대성 (theory of relativity 상대성 이론)",
]);
cards("pr196", "1f4d4cb05c", [
  "knowledge|knowledge|n.|지식", "improving|improve|v.|늘리다, 향상시키다", "depends|depend|v.|(depend upon) ~에 달려 있다", "developing|develop|v.|기르다, 개발하다",
  "thinking|think|n.|사고, 생각하기", "rousing|rouse|v.|불러일으키다 (rouse curiosity 호기심을 자극하다)", "curiosity|curiosity|n.|호기심", "necessary|necessary|adj.|필요한",
  "tempts|tempt|v.|~하고 싶게 만들다", "aware|aware|adj.|(be aware of) ~을 알고 있는", "areas|area|n.|영역, 분야", "thinker|thinker|n.|생각하는 사람",
  "techniques|technique|n.|기법, 방법", "necessarily|necessarily|adv.|(not necessarily) 반드시 ~인 것은 아닌",
]);
cards("pr197", "5c53752162", [
  "genuine|genuine|adj.|진정한", "produce|produce|v.|낳다, 일으키다", "later|later|adj.|나중의 (in later years 훗날에)", "increase|increase|n.|인상, 증가 (an increase in salary 급여 인상)",
  "happiness|happiness|n.|행복", "realizing|realize|v.|깨닫다, 의식하다", "earn|earn|v.|(돈을) 벌다", "follows|follow|v.|뒤따르다", "promotion|promotion|n.|승진",
  "success|success|n.|성공", "considerations|consideration|n.|고려 사항", "neglect|neglect|n.|소홀히 함", "frustration|frustration|n.|좌절감", "diligently|diligently|adv.|부지런히",
]);
cards("pr198", "52f4fc4a12", [
  "experiences|experience|n.|경험", "reason|reason|n.|이유", "young|young|adj.|어린 (start young 어릴 때 시작하다)", "feet|foot|n.|발", "humbling|humbling|adj.|자존심이 꺾이는",
  "crossed|cross|v.|엇갈리게 하다 (get skis crossed 스키가 꼬이다)", "adult|adult|n.|어른", "slips|slip|v.|미끄러지다", "undergo|undergo|v.|겪다",
  "trouble|trouble|n.|어려움 (have trouble -ing ~하는 데 애를 먹다)", "tumbles|tumble|v.|넘어지다, 구르다", "fool|fool|n.|바보", "skis|ski|n.|스키 (장비)", "somewhere|somewhere|adv.|어딘가로",
]);
cards("pr199", "dbcb1c365d", [
  "instincts|instinct|n.|본능, 직감", "trusted|trust|v.|믿다, 신뢰하다", "experience|experience|n.|경험", "following|follow|v.|따르다", "ignore|ignore|v.|무시하다",
  "sufficient|sufficient|adj.|충분한", "lead|lead|v.|(lead A to do) A가 ~하게 만들다", "requires|require|v.|필요로 하다", "support|support|v.|뒷받침하다",
  "dictate|dictate|v.|좌우하다, 지시하다", "impulsive|impulsive|adj.|충동적인", "regret|regret|v.|후회하다", "judging|judge|v.|판단하다", "inner|inner|adj.|내면의 (inner voice 내면의 목소리)",
]);
cards("pr200", "2377767551", [
  "happiness|happiness|n.|행복", "easier|easy|adj.|더 쉬운", "increasing|increase|v.|늘리다", "success|success|n.|성공",
  "purchased|purchase|v.|사다, 얻다 (too dearly purchased 너무 비싼 대가를 치르고 얻은)", "sacrificed|sacrifice|v.|희생하다", "deny|deny|v.|부인하다", "maintain|maintain|v.|주장하다",
  "ingredient|ingredient|n.|요소, 구성 요소", "obtain|obtain|v.|얻다", "dearly|dearly|adv.|비싸게, 큰 대가를 치르고", "point|point|n.|정도 (up to a certain point 어느 정도까지)",
  "obscure|obscure|adj.|무명의, 알려지지 않은", "recognition|recognition|n.|인정",
]);
cards("pr201", "21b3ec77e0", [
  "realize|realize|v.|깨닫다", "accept|accept|v.|받아들이다", "annoyed|annoyed|adj.|짜증이 난", "anger|anger|v.|화나게 하다", "disturb|disturb|v.|불쾌하게 하다, 방해하다",
  "values|value|n.|가치관", "disharmony|disharmony|n.|불화, 부조화", "relationships|relationship|n.|관계", "obligated|obligate|v.|(be obligated to) ~할 의무가 있다",
  "expectations|expectation|n.|기대", "objects|object|v.|(object to) ~에 반대하다", "indicates|indicate|v.|보여 주다, 나타내다",
  "impose|impose|v.|(impose A on B) A를 B에게 강요하다", "enters|enter|v.|들어오다, 생기다",
]);
cards("pr202", "0874fcfa94", [
  "country|country|n.|나라", "important|important|adj.|중요한", "history|history|n.|역사", "aware|aware|adj.|(be aware that) ~을 알고 있는", "press|press|n.|언론 (Korean press 한국 언론)",
  "forever|forever|adv.|영원히", "published|publish|v.|발행하다", "educate|educate|v.|교육하다, 계몽하다", "discontinued|discontinue|v.|중단하다 (be discontinued 중단되다)",
  "spite|spite|n.|(in spite of) ~에도 불구하고", "modern|modern|adj.|근대의", "effort|effort|n.|노력 (in an effort to ~하려고)", "readers|reader|n.|독자",
  "lack|lack|n.|부족 (lack of money 자금 부족)",
]);
cards("pr203", "b8b8322945", [
  "words|word|n.|단어, 말", "language|language|n.|언어", "different|different|adj.|다른", "meanings|meaning|n.|의미", "speaks|speak|v.|(언어를) 말하다",
  "importantly|importantly|adv.|중요하게 (more importantly 더 중요한 것은)", "particularly|particularly|adv.|특히", "exceptions|exception|n.|예외", "argument|argument|n.|논리, 주장",
  "switch|switch|v.|뒤바꾸다", "forth|forth|adv.|(and so forth) 기타 등등", "true|true|adj.|(be true of) ~에 해당하는", "quite|quite|adv.|(may quite well) 충분히 ~일 수 있다",
  "example|example|n.|예 (for example 예를 들어)",
]);
cards("pr204", "f683164237", [
  "heads|head|n.|머리 (two heads are better than one 백지장도 맞들면 낫다)", "cancel|cancel|v.|(cancel out) 상쇄하다", "applied|apply|v.|적용하다",
  "qualifications|qualification|n.|단서, 조건 (without qualifications 무조건)", "spoil|spoil|v.|망치다", "insightful|insightful|adj.|통찰력 있는", "popular|popular|adj.|널리 알려진",
  "sayings|saying|n.|속담, 격언", "correct|correct|adj.|옳은", "circumstances|circumstance|n.|상황, 처지", "instance|instance|n.|(for instance) 예를 들어",
  "cooks|cook|n.|요리사", "broth|broth|n.|수프, 국", "viewed|view|v.|보다, 여기다",
]);
cards("pr205", "c9dd5a8f51", [
  "believed|believe|v.|믿다", "cross|cross|n.|십자 (make the sign of a cross 십자를 긋다)", "hatched|hatch|v.|부화하다", "laid|lay|v.|(알을) 낳다", "spring|spring|n.|봄",
  "egg|egg|n.|달걀", "superstitious|superstitious|adj.|미신을 믿는", "superstition|superstition|n.|미신", "ladders|ladder|n.|사다리", "complexion|complexion|n.|안색, 피부",
  "beautify|beautify|v.|아름답게 하다", "regarding|regarding|prep.|~에 관한", "northern|northern|adj.|북쪽의", "shortly|shortly|adv.|(shortly before) 직전에",
]);
cards("pr206", "1026d8f9bc", [
  "share|share|n.|몫 (have one's share of ~을 적잖이 겪다)", "developed|develop|v.|발달하다, 생겨나다", "disease|disease|n.|질병", "support|support|v.|유지하다, 떠받치다",
  "booming|booming|adj.|급성장하는", "century|century|n.|세기", "garbage|garbage|n.|쓰레기", "cultural|cultural|adj.|문화의", "dwellers|dweller|n.|거주자 (city dwellers 도시 거주자)",
  "isolated|isolated|adj.|고립된", "entertainments|entertainment|n.|오락", "populations|population|n.|인구", "institutions|institution|n.|기관, 시설", "urbanization|urbanization|n.|도시화",
]);
cards("pr207", "565abe0e55", [
  "law|law|n.|법률", "congress|congress|n.|(미국) 의회", "president|president|n.|대통령", "overpowered|overpower|v.|압도하다, 뒤집다 (be overpowered 뒤집히다)",
  "rejects|reject|v.|거부하다", "rejection|rejection|n.|거부 (대통령의 거부권 행사)", "two-thirds|two-thirds|n.|3분의 2", "majority|majority|n.|다수 (two-thirds majority 3분의 2 찬성)",
  "bill|bill|n.|법안", "approved|approve|v.|승인하다, 통과시키다", "still|still|adv.|그래도, 여전히", "houses|house|n.|(의회의) 원 (both houses of Congress 상원과 하원)",
  "pass|pass|v.|(법을) 통과시키다, 제정하다", "least|least|n.|(at least) 적어도",
]);
cards("pr208", "159580986a", [
  "promised|promise|v.|약속하다", "factories|factory|n.|공장", "several|several|adj.|여러", "concerned|concerned|adj.|관련된 (the factories concerned 해당 공장들)",
  "install|install|v.|설치하다", "polluting|pollute|v.|오염시키다", "close|close|v.|닫다, 폐쇄하다", "warned|warn|v.|경고하다", "lose|lose|v.|잃다", "jobs|job|n.|일자리",
  "managers|manager|n.|관리자", "antipollution|antipollution|adj.|오염 방지의", "equipment|equipment|n.|장비", "afford|afford|v.|(afford to) ~할 (경제적) 여유가 있다",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
