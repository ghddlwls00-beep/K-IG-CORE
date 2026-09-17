#!/usr/bin/env node
/**
 * READING vocabulary cards pr241–pr256 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (mine 광산 →
 * removed, elderly 장로 → 노인들, objective 객관적인 → 목적, defense 방어 → 국방, imports 수입 → 수입품,
 * heart 심장 → by heart, contests 콘테스트, battling n. → v., demands 수요 → 요구), placeholders
 * written (overemphasize), and cards no longer in the text after the passage fixes (tradition,
 * quite, propose, weaken, excessive, percents) replaced along with the name "simmons". Passages
 * that R-01 found twice (pr242 = pr152, pr244 = pr190, pr247 = pr251) get the same cards as
 * their twin, so the duplicate is at least consistent until the owner decides which one to replace.
 *   node apply-reading-cards-241.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

const TAXES = [
  "protect|protect|v.|보호하다", "produces|produce|v.|생산하다", "foreign|foreign|adj.|외국의", "natural|natural|adj.|천연의 (natural gas 천연가스)", "nation|nation|n.|국가",
  "require|require|v.|필요로 하다", "imports|import|n.|수입품", "industry|industry|n.|산업", "defense|defense|n.|국방, 방위",
  "weakened|weaken|v.|약화시키다 (be weakened 약해지다)", "objective|objective|n.|목적", "crisis|crisis|n.|위기", "vital|vital|adj.|필수적인", "domestic|domestic|adj.|국내의",
];

cards("pr241", "df69051b23", [
  "education|education|n.|교육", "society|society|n.|사회", "purpose|purpose|n.|목적", "traditions|tradition|n.|전통",
  "prepare|prepare|v.|(prepare A for B) A가 B에 대비하게 하다", "social|social|adj.|사회의 (social change 사회 변화)", "inspiration|inspiration|n.|원동력, 영감을 주는 것",
  "changing|change|v.|바꾸다", "preserving|preserve|v.|보존하다", "functions|function|n.|기능, 역할", "overemphasize|overemphasize|v.|지나치게 강조하다",
  "decayed|decayed|adj.|낡은, 썩은", "rather|rather|adv.|(rather than) ~라기보다는", "values|value|n.|가치, 가치관",
]);
cards("pr242", "54c01b434f", [
  "support|support|n.|지지, 응원", "honest|honest|adj.|솔직한", "remarks|remark|n.|말 (positive remarks 긍정적인 말)", "approval|approval|n.|인정, 칭찬", "ask|ask|v.|(ask for) 구하다",
  "painting|painting|n.|그림", "openly|openly|adv.|드러내 놓고", "therefore|therefore|adv.|그러므로", "forget|forget|v.|잊다", "praise|praise|v.|칭찬하다",
  "need|need|n.|필요, 욕구 (need for support 지지받고 싶은 마음)", "child|child|n.|아이", "grown-up|grown-up|n.|어른", "adults|adult|n.|성인",
]);
cards("pr243", "47f41f3f28", [
  "language|language|n.|언어", "teaching|teach|v.|가르치다", "produced|produce|v.|만들어 내다, 펴내다", "experience|experience|n.|경험", "offer|offer|v.|제공하다",
  "foreigners|foreigner|n.|외국인", "progress|progress|n.|발전, 진전", "programs|program|n.|프로그램, 과정", "foreign|foreign|adj.|외국의 (foreign workers 외국인 노동자)",
  "steady|steady|adj.|꾸준한", "abroad|abroad|adv.|해외에서", "educational|educational|adj.|교육의", "benefited|benefit|v.|(benefit from) ~의 혜택을 보다",
  "establish|establish|v.|마련하다, 세우다",
]);
cards("pr244", "e6b9608d59", [
  "care|care|v.|(care about) ~에 관심을 두다", "social|social|adj.|사회적인", "remember|remember|v.|기억하다", "fact|fact|n.|사실 (in fact 사실은)", "hard|hard|adj.|어려운",
  "introduced|introduce|v.|소개하다 (be introduced to ~에게 소개되다)", "important|important|adj.|중요한", "moments|moment|n.|순간 (moments later 잠시 후에)",
  "manner|manner|n.|방식", "forget|forget|v.|잊다", "introduction|introduction|n.|소개", "relationships|relationship|n.|관계", "clear|clear|adj.|분명한",
  "unclear|unclear|adj.|불분명한",
]);
cards("pr245", "19dd82725f", [
  "family|family|n.|가족", "citizen|citizen|n.|시민", "occupy|occupy|v.|차지하다", "positions|position|n.|위치, 지위", "structure|structure|n.|구조",
  "performing|perform|v.|수행하다", "expected|expect|v.|기대하다 (be expected of ~에게 기대되다)", "decide|decide|v.|결정하다", "demands|demand|n.|요구 (make demands on ~에게 요구하다)",
  "complex|complex|adj.|복잡한", "interactions|interaction|n.|상호 작용, 교류", "conflicting|conflicting|adj.|상충하는", "frustrated|frustrated|adj.|좌절한, 답답한",
  "fulfill|fulfill|v.|수행하다, 다하다",
]);
cards("pr246", "bf177b2489", [
  "evolved|evolve|v.|진화하다", "observed|observe|v.|관찰하다", "necks|neck|n.|목", "battling|battle|v.|싸우다", "giraffes|giraffe|n.|기린", "evolution|evolution|n.|진화",
  "enabled|enable|v.|(enable A to do) A가 ~할 수 있게 하다", "treetop|treetop|n.|나무 꼭대기 (treetop leaves 나무 꼭대기의 잎)", "competition|competition|n.|경쟁",
  "contests|contest|n.|겨루기, 싸움", "ecologist|ecologist|n.|생태학자", "combat|combat|n.|싸움 (locked in combat 맞붙어 싸우는)", "mates|mate|n.|짝",
  "convinced|convinced|adj.|확신하는 (become convinced that ~라고 확신하게 되다)",
]);
cards("pr247", "489024d841", TAXES);
cards("pr248", "fff5a2c963", [
  "plants|plant|n.|식물", "wild|wild|adj.|야생의 (wild plants 야생 식물)", "recognized|recognize|v.|인식하다, 알아보다", "species|species|n.|(생물의) 종",
  "discovering|discover|v.|알게 되다", "natural|natural|adj.|자연의 (natural habitats 자연 서식지)", "value|value|n.|가치", "efforts|effort|n.|노력", "precious|precious|adj.|소중한",
  "fascinated|fascinate|v.|매혹하다 (be fascinated by ~에 매료되다)", "conserve|conserve|v.|보전하다", "habitats|habitat|n.|서식지", "indifference|indifference|n.|무관심",
  "striven|strive|v.|애쓰다, 노력하다",
]);
cards("pr249", "3c5660f691", [
  "experience|experience|n.|경험", "depend|depend|v.|(depend on) ~에 달려 있다", "suppose|suppose|v.|가정하다", "day-to-day|day-to-day|adj.|일상의",
  "judgments|judgment|n.|판단", "guesses|guess|n.|추측", "taller|tall|adj.|키가 더 큰", "conclusion|conclusion|n.|결론 (draw a conclusion 결론을 내리다)",
  "absence|absence|n.|없음 (in the absence of ~이 없을 때)", "information|information|n.|정보", "conclude|conclude|v.|결론짓다", "particular|particular|adj.|특정한",
  "whole|whole|n.|(as a whole) 전체로서", "tend|tend|v.|(tend to) ~하는 경향이 있다",
]);
cards("pr250", "c594f67519", [
  "achieving|achieve|v.|이루다", "realizes|realize|v.|깨닫다", "goals|goal|n.|목표", "results|result|n.|결과", "performance|performance|n.|실적, 성과",
  "strategy|strategy|n.|전략", "intended|intended|adj.|의도한, 목표로 한", "consultant|consultant|n.|컨설턴트, 자문가", "objectives|objective|n.|목표",
  "effectively|effectively|adv.|효과적으로", "analyze|analyze|v.|분석하다", "efficient|efficient|adj.|효율적인", "recommend|recommend|v.|권고하다", "threats|threat|n.|위협",
]);
cards("pr251", "23ffd37eb1", TAXES);
cards("pr252", "aefaa1e9b5", [
  "perceived|perceive|v.|인식하다 (perceived age 스스로 느끼는 나이)", "younger|young|adj.|더 젊은", "reason|reason|n.|이유 (for this reason 이런 이유로)", "suggests|suggest|v.|시사하다",
  "marketing|marketing|n.|마케팅", "confirms|confirm|v.|확인하다, 뒷받침하다", "focus|focus|v.|(focus on) ~에 초점을 맞추다", "researchers|researcher|n.|연구자, 조사원",
  "comment|comment|v.|논평하다, 말하다", "elderly|elderly|n.|(the elderly) 노인들", "outlook|outlook|n.|사고방식, 관점", "reliable|reliable|adj.|믿을 만한",
  "predictor|predictor|n.|예측 지표", "campaigns|campaign|n.|캠페인",
]);
cards("pr253", "60f8b8410a", [
  "reasons|reason|n.|이유", "adapt|adapt|v.|(adapt to) ~에 적응하다", "slowly|slowly|adv.|천천히", "farmer|farmer|n.|농부", "changing|change|v.|바꾸다", "food|food|n.|먹이, 음식",
  "cow|cow|n.|소", "careful|careful|adj.|조심하는", "needs|need|v.|(need to) ~할 필요가 있다", "milk|milk|n.|우유 (give milk 젖을 내다)", "addition|addition|n.|(in addition) 게다가",
  "sudden|sudden|adj.|갑작스러운", "weight|weight|n.|체중 (lose weight 살이 빠지다)", "suddenly|suddenly|adv.|갑자기",
]);
cards("pr254", "2df1b5b99a", [
  "education|education|n.|교육", "language|language|n.|언어", "doubt|doubt|n.|의심 (There is no doubt that ~은 틀림없다)", "realize|realize|v.|깨닫다",
  "developing|develop|adj.|성장하는, 발달 중인", "heart|heart|n.|(by heart) 외워서", "prefer|prefer|v.|더 좋아하다", "minds|mind|n.|정신, 마음", "frustrate|frustrate|v.|좌절시키다, 가로막다",
  "standards|standard|n.|기준, 수준", "basic|basic|adj.|기본적인", "ignorant|ignorant|adj.|(be ignorant of) ~을 모르는", "recite|recite|v.|암송하다", "category|category|n.|범주",
]);
cards("pr255", "83dd6c06f4", [
  "expected|expect|v.|예상하다 (be expected to ~할 것으로 예상되다)", "increase|increase|v.|늘다", "significantly|significantly|adv.|상당히", "global|global|adj.|세계의",
  "question|question|n.|의문 (There is no question that ~은 확실하다)", "production|production|n.|생산", "pushed|push|v.|밀어붙이다, 끌어올리다",
  "malnourished|malnourished|adj.|영양실조의", "population|population|n.|인구", "chronically|chronically|adv.|만성적으로", "already|already|adv.|이미",
  "decades|decade|n.|10년", "pace|pace|n.|(keep pace) 보조를 맞추다", "yields|yield|n.|수확량",
]);
cards("pr256", "6ed9176477", [
  "decide|decide|v.|결정하다", "offered|offer|v.|주다, 제공하다", "created|create|v.|낳다, 만들어 내다", "technology|technology|n.|과학 기술", "hope|hope|n.|희망",
  "century|century|n.|세기", "advances|advance|n.|발전, 진보", "profoundly|profoundly|adv.|깊이, 크게", "ethical|ethical|adj.|윤리적인", "troubling|troubling|adj.|골치 아픈, 곤란한",
  "severely|severely|adv.|심하게 (severely ill 중병을 앓는)", "medical|medical|adj.|의학의 (medical treatments 치료법)", "technological|technological|adj.|과학 기술의",
  "limits|limit|n.|한계, 제한",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
