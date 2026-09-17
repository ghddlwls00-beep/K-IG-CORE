#!/usr/bin/env node
/**
 * READING vocabulary cards pr097–pr112 (ISS-10: RV-13, RV-14, RV-15; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (composed
 * ≠ 작곡하다, provided ≠ 만약 ~라면, shipping ≠ 배, completely ≠ 완료, looking ≠ 봐, feet ← feel typo),
 * placeholders written (two-year-old, unhurried), function-word card "aren't" replaced.
 *   node apply-reading-cards-097.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr097", "97c3e189aa", [
  "countries|country|n.|나라", "providing|provide|v.|공급하다", "understanding|understand|v.|이해하다", "responsiveness|responsiveness|n.|대응력, 민감한 반응",
  "increasing|increase|v.|높이다, 늘리다", "dangerous|dangerous|adj.|위험한", "unique|unique|adj.|독특한", "requires|require|v.|필요로 하다", "different|different|adj.|다른",
  "sensitivity|sensitivity|n.|민감성, 세심함", "emerging|emerging|adj.|신흥의 (emerging countries 신흥국)", "products|product|n.|제품", "strategy|strategy|n.|전략",
  "composed|compose|v.|(be composed of) ~로 이루어지다",
]);
cards("pr098", "bd3e72ff5f", [
  "music|music|n.|음악", "comforting|comforting|adj.|마음을 달래 주는", "produce|produce|v.|만들어 내다", "atmosphere|atmosphere|n.|분위기", "calm|calm|adj.|차분한",
  "chanting|chant|v.|노래하듯 읊다", "periods|period|n.|시간, 시기", "especially|especially|adv.|특히", "helpful|helpful|adj.|도움이 되는", "peaceful|peaceful|adj.|평화로운",
  "two-year-old|two-year-old|adj.|두 살의", "presence|presence|n.|있음, 존재", "irritated|irritated|adj.|짜증이 난", "rhymes|rhyme|n.|동요 (nursery rhymes)",
]);
cards("pr099", "15cba9bc54", [
  "hand|hand|n.|(on the other hand) 반면에", "essential|essential|adj.|꼭 필요한", "water|water|n.|물", "changed|change|v.|변하다",
  "eighteenth-century|eighteenth-century|adj.|18세기의", "scholar|scholar|n.|학자", "cost|cost|v.|값이 ~이다 (cost nothing 공짜다)", "well|well|n.|우물",
  "supply|supply|n.|공급", "threat|threat|n.|위협", "considerably|considerably|adv.|상당히, 많이", "diamonds|diamond|n.|다이아몬드", "comment|comment|n.|말, 논평",
  "worth|worth|n.|가치 (the worth of ~의 가치)",
]);
cards("pr100", "6922abe1ba", [
  "mothers|mother|n.|어미 (여기서는 원숭이 어미)", "suggests|suggest|v.|시사하다", "comfort|comfort|n.|안락함, 위안", "monkeys|monkey|n.|원숭이", "experiment|experiment|n.|실험",
  "spend|spend|v.|(시간을) 보내다", "hard|hard|adj.|단단한", "soft|soft|adj.|부드러운", "baby|baby|n.|새끼 (baby monkeys 새끼 원숭이)", "artificial|artificial|adj.|인공의, 가짜의",
  "separated|separate|v.|떼어 놓다 (be separated from ~에게서 떨어지다)", "provided|provide|v.|제공하다 (be provided with ~을 받다)", "towel|towel|n.|수건", "cloth|cloth|n.|천",
]);
cards("pr101", "f6c4c889f0", [
  "health|health|n.|건강", "bodies|body|n.|몸", "disease|disease|n.|질병 (organic disease 기질성 질환)", "illness|illness|n.|병", "psychological|psychological|adj.|심리적인",
  "affects|affect|v.|영향을 주다", "mind|mind|n.|마음", "medical|medical|adj.|의학의, 의료의", "reported|report|v.|보고하다", "seeking|seek|v.|구하다, 찾다",
  "healing|healing|n.|치유", "physical|physical|adj.|신체의", "portion|portion|n.|부분, 비율", "tendency|tendency|n.|경향",
]);
cards("pr102", "4869bbb7f8", [
  "develop|develop|v.|개발하다", "fail|fail|v.|~하지 못하다 (fail to do)", "controls|control|v.|조절하다, 좌우하다", "athletic|athletic|adj.|운동의 (athletic performance 운동 능력)",
  "allows|allow|v.|~할 수 있게 하다", "ideas|idea|n.|아이디어", "competition|competition|n.|경쟁", "survival|survival|n.|생존", "performance|performance|n.|기량, 성과",
  "companies|company|n.|회사", "development|development|n.|발전", "compete|compete|v.|경쟁하다", "question|question|n.|(in question) 위태로운", "successfully|successfully|adv.|성공적으로",
]);
cards("pr103", "27f555e97a", [
  "developed|develop|v.|발전하다; 개발하다", "controlled|control|v.|제어하다 (be controlled by)", "continue|continue|v.|계속하다", "farming|farming|n.|농업, 농사",
  "slow|slow|v.|(slow down) 느려지다", "poor|poor|adj.|가난한", "rich|rich|adj.|부유한", "used|use|v.|쓰이다", "agricultural|agricultural|adj.|농업의",
  "efficient|efficient|adj.|효율적인", "agriculture|agriculture|n.|농업", "products|product|n.|생산물 (agricultural products 농산물)", "crops|crop|n.|농작물", "storing|store|v.|저장하다",
]);
cards("pr104", "5a65c20941", [
  "attracts|attract|v.|끌어들이다", "reduced|reduced|adj.|줄어든 (reduced incomes 줄어든 수입)", "climate|climate|n.|기후", "different|different|adj.|다른", "culture|culture|n.|문화",
  "admirers|admirer|n.|애호가, 동경하는 사람", "visitors|visitor|n.|방문객", "retirees|retiree|n.|은퇴자", "types|type|n.|유형, 종류", "composed|compose|v.|(be composed of) ~로 이루어지다",
  "painting|paint|v.|그리다", "unhurried|unhurried|adj.|느긋한", "temperate|temperate|adj.|온화한", "resort|resort|n.|휴양지",
]);
cards("pr105", "8bec560503", [
  "conservation|conservation|n.|보전, 보존", "happiness|happiness|n.|행복", "government|government|n.|정부", "primary|primary|adj.|주된, 주요한", "security|security|n.|안전",
  "justice|justice|n.|정의", "sacrificed|sacrifice|v.|희생하다", "bring|bring|v.|(bring about) 이루다", "aims|aim|n.|목표", "degree|degree|n.|정도 (in some degree 어느 정도)",
  "turn|turn|n.|(in turn) 차례로", "importance|importance|n.|중요성 (of the utmost importance 더없이 중요한)", "absolute|absolute|adj.|절대적인", "circumstances|circumstance|n.|상황, 사정",
]);
cards("pr106", "0c1dc5ad21", [
  "offered|offer|v.|제공하다, 제시하다", "lower|low|adj.|더 낮은 (low의 비교급)", "discount|discount|n.|할인", "various|various|adj.|여러 가지의",
  "price|price|n.|가격 (price break 가격 할인)", "benefit|benefit|n.|이익 (for one's own benefit 자기 이익을 위해)", "companies|company|n.|회사", "cash|cash|n.|현금",
  "selling|sell|v.|팔다", "storing|store|v.|보관하다", "shipping|shipping|n.|배송, 운송", "billing|billing|n.|대금 청구", "quantity|quantity|n.|수량 (quantity discount 수량 할인)",
  "trade|trade|n.|거래 (trade discount 거래 할인)",
]);
cards("pr107", "d09fe9d02a", [
  "magazines|magazine|n.|잡지", "stories|story|n.|기사 (news stories 뉴스 기사)", "published|publish|v.|발행하다", "hand|hand|n.|(on the other hand) 반면에",
  "important|important|adj.|중요한", "basically|basically|adv.|기본적으로", "types|type|n.|종류", "special-interest|special-interest|adj.|특별 관심사의",
  "summarize|summarize|v.|요약하다", "usually|usually|adv.|보통", "combination|combination|n.|결합", "subject|subject|n.|주제, 분야", "weekly|weekly|adv.|매주",
  "particular|particular|adj.|특정한",
]);
cards("pr108", "bf8f28b337", [
  "culture|culture|n.|문화", "languages|language|n.|언어", "understanding|understanding|n.|이해", "shared|shared|adj.|공유된", "purposes|purpose|n.|목적, 용도",
  "customs|custom|n.|관습", "objects|object|n.|사물", "nonmaterial|nonmaterial|adj.|비물질적인", "divided|divide|v.|나누다", "elements|element|n.|요소",
  "categories|category|n.|범주", "beliefs|belief|n.|믿음", "physical|physical|adj.|형태가 있는, 물질적인", "creations|creation|n.|창조물",
]);
cards("pr109", "6f3a26f095", [
  "afford|afford|v.|(~을 살) 여유가 있다", "dirty|dirty|adj.|더러운", "transportation|transportation|n.|교통 (public transportation 대중교통)", "despite|despite|prep.|~에도 불구하고",
  "possible|possible|adj.|가능한", "city|city|n.|도시", "crowded|crowded|adj.|붐비는", "still|still|adv.|그래도, 여전히", "lonely|lonely|adj.|외로운",
  "well-paid|well-paid|adj.|보수가 좋은", "living|living|n.|생활 (living in a city 도시 생활)", "expensive|expensive|adj.|비싼", "crowds|crowd|n.|인파, 군중",
  "minus|minus|n.|단점, 불리한 점 (plus 장점)",
]);
cards("pr110", "b0370f0dea", [
  "achieve|achieve|v.|얻다, 이루다", "increase|increase|v.|늘리다", "exercise|exercise|n.|운동", "prevent|prevent|v.|예방하다", "naturally|naturally|adv.|자연스럽게, 저절로",
  "osteoporosis|osteoporosis|n.|골다공증", "physical|physical|adj.|신체적인", "regularly|regularly|adv.|규칙적으로", "benefit|benefit|n.|이점",
  "preventive|preventive|adj.|예방의 (preventive measure 예방책)", "longer|long|adv.|더 오래 (take longer 시간이 더 걸리다)", "worth|worth|adj.|~할 가치가 있는 (worth the effort)",
  "effort|effort|n.|노력", "gradual|gradual|adj.|점진적인",
]);
cards("pr111", "bec7f81df5", [
  "clean|clean|adj.|깨끗한", "reason|reason|n.|이유", "animals|animal|n.|동물", "completely|completely|adv.|완전히", "sweet|sweet|adj.|감미로운, 듣기 좋은",
  "sounds|sound|n.|소리", "noisy|noisy|adj.|시끄러운", "peace|peace|n.|평화 (peace of mind 마음의 평화)", "wild|wild|adj.|야생의", "disturb|disturb|v.|방해하다",
  "mountains|mountain|n.|산", "forgetting|forget|v.|잊다", "entertained|entertain|v.|즐겁게 하다 (be entertained by)", "bothered|bother|v.|귀찮게 하다 (be bothered by ~에 방해받다)",
]);
cards("pr112", "7b4596131f", [
  "result|result|n.|(as a result of) ~ 때문에", "experience|experience|v.|겪다", "considered|consider|v.|생각해 보다", "reduce|reduce|v.|줄이다", "different|different|adj.|다른",
  "stress|stress|n.|스트레스", "jobs|job|n.|일자리", "available|available|adj.|구할 수 있는", "economy|economy|n.|경제", "regular|regular|adj.|원래의, 정규의 (regular jobs 원래 하던 일)",
  "workday|workday|n.|근무일", "discouraged|discouraged|adj.|낙심한", "keeping|keep|v.|계속 유지하다", "looking|look|v.|(look for) 찾다",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
