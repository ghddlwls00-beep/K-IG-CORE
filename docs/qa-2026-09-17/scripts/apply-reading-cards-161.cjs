#!/usr/bin/env node
/**
 * READING vocabulary cards pr161–pr176 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong parts of speech fixed
 * (share/agree/believe n. → v., demands n. 수요 → v. 요구하다, officials adj. → n. 관리), wrong senses
 * fixed (training 기차, hand 손 in "on the other hand" / "hand in hand", application 신청, content
 * 내용 → 만족하는, author → 발의자), placeholders written (amendment, posthumously) or replaced
 * (you're, alice), and cards no longer in the text replaced (acquired, right). pr170's cards were
 * written with its rewritten passage (R-65) and are kept.
 *   node apply-reading-cards-161.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr161", "34ba34c1fb", [
  "kindergarten|kindergarten|n.|유치원", "share|share|v.|나누다", "fair|fair|adv.|공정하게 (play fair 정정당당하게 하다)", "sorry|sorry|adj.|미안한 (say you're sorry 사과하다)",
  "hurt|hurt|v.|아프게 하다, 상처를 주다", "including|include|prep.|~을 포함하여", "sadly|sadly|adv.|안타깝게도", "apply|apply|v.|적용하다", "rules|rule|n.|규칙",
  "government|government|n.|정부", "adults|adult|n.|어른, 성인", "learned|learn|v.|배우다", "family|family|n.|가족 (family life 가정생활)", "everything|everything|pron.|모든 것",
]);
cards("pr162", "acb191579c", [
  "agree|agree|v.|의견이 일치하다 (agree on ~에 대해 합의하다)", "believe|believe|v.|믿다", "disagree|disagree|v.|의견이 다르다", "young|young|adj.|젊은 (young people 젊은이들)",
  "strongly|strongly|adv.|강하게", "models|model|n.|본보기 (role model 롤 모델)", "role|role|n.|역할", "professional|professional|adj.|프로의, 직업의",
  "athletes|athlete|n.|운동선수", "whether|whether|conj.|~인지 (아닌지)", "private|private|adj.|사적인 (private life 사생활)", "choice|choice|n.|선택",
  "players|player|n.|선수", "maintain|maintain|v.|주장하다",
]);
cards("pr163", "a3072d76cd", [
  "active|active|adj.|능동적인, 적극적인", "demands|demand|v.|요구하다", "ideas|idea|n.|생각, 사상", "fundamental|fundamental|adj.|근본적인",
  "state|state|n.|상태 (in a state of relaxation 긴장을 푼 상태로)", "pleasure|pleasure|n.|즐거움 (for pleasure 재미로)", "relaxation|relaxation|n.|긴장 완화, 휴식",
  "raises|raise|v.|(질문을) 제기하다", "thinker|thinker|n.|사상가", "crooning|crooning|n.|감미롭게 부르는 노래", "asleep|asleep|adj.|잠든",
  "lost|lose|v.|잃다 (nothing is lost 잃는 것이 없다)", "absorb|absorb|v.|흡수하다, 받아들이다", "capable|capable|adj.|(be capable of) ~할 수 있는",
]);
cards("pr164", "02e2e302e5", [
  "engineered|engineer|v.|(유전자를) 조작하다 (genetically engineered 유전자 조작된)", "advocates|advocate|n.|옹호자 (consumer advocates 소비자 운동가)", "products|product|n.|제품",
  "genetically|genetically|adv.|유전적으로", "testing|test|n.|검사", "labeling|label|n.|표시, 라벨 부착", "stigmatize|stigmatize|v.|낙인찍다, 오명을 씌우다",
  "argued|argue|v.|주장하다", "additional|additional|adj.|추가의", "mandatory|mandatory|adj.|의무적인", "unfairly|unfairly|adv.|부당하게",
  "officials|official|n.|관리, 당국자 (administration officials 정부 관리들)", "crops|crop|n.|농작물", "administration|administration|n.|(미국) 행정부, 정부",
]);
cards("pr165", "a054108aa0", [
  "objective|objective|adj.|객관적인 (objective test 객관식 시험)", "essay|essay|n.|논술 (essay exam 논술형 시험)", "contrasting|contrasting|adj.|대조적인",
  "evaluation|evaluation|n.|평가", "grasp|grasp|n.|이해, 파악", "require|require|v.|요구하다", "demonstrate|demonstrate|v.|보여 주다, 입증하다", "mastery|mastery|n.|숙달, 완전한 이해",
  "leads|lead|v.|(lead to) ~으로 이어지다", "memorization|memorization|n.|암기 (rote memorization 기계적 암기)", "encouraged|encourage|v.|부추기다 (be encouraged to ~하도록 부추겨지다)",
  "knowledge|knowledge|n.|지식", "analytical|analytical|adj.|분석적인", "reduced|reduce|v.|줄이다 (be reduced to a minimum 최소한으로 줄다)",
]);
cards("pr166", "9a4cb5b4e7", [
  "portray|portray|v.|묘사하다, 그리다", "influenced|influence|v.|영향을 주다", "appeared|appear|v.|~으로 보이다 (as they appeared to the eye 눈에 보이는 대로)",
  "achieved|achieve|v.|이루어 내다", "resulted|result|v.|(result in) ~을 낳다", "accuracy|accuracy|n.|정확성", "mathematics|mathematics|n.|수학", "perspective|perspective|n.|원근법",
  "symbolic|symbolic|adj.|상징적인", "geometry|geometry|n.|기하학", "paintings|painting|n.|그림, 회화", "objects|object|n.|사물, 대상", "definitely|definitely|adv.|분명히",
  "application|application|n.|적용",
]);
cards("pr167", "7e651af912", [
  "language|language|n.|언어", "natural|natural|adj.|자연스러운", "realize|realize|v.|깨닫다", "education|education|n.|교육", "training|training|n.|훈련",
  "inherited|inherit|v.|물려받다 (be inherited 유전되다)", "art|art|n.|기술, 기예", "automatic|automatic|adj.|저절로 되는, 자동적인", "breathing|breathe|n.|숨쉬기, 호흡",
  "winking|wink|n.|눈 깜박이기, 윙크", "intensive|intensive|adj.|집중적인", "generation|generation|n.|세대", "thought|thought|n.|생각 (give the matter thought 그 문제를 생각해 보다)",
  "passed|pass|v.|(pass on) 물려주다, 전하다",
]);
cards("pr168", "421d3deccb", [
  "understood|understand|v.|이해하다", "social|social|adj.|사회적인", "solving|solve|n.|해결 (problem solving 문제 해결)", "styling|styling|n.|스타일링, 겉모양 꾸미기",
  "distinct|distinct|adj.|별개의, 뚜렷이 다른", "design|design|n.|디자인, 설계", "concerned|concerned|adj.|(be concerned with) ~을 다루다, ~과 관련이 있다",
  "economic|economic|adj.|경제의", "prevalence|prevalence|n.|널리 퍼짐, 유행", "technological|technological|adj.|기술의", "contexts|context|n.|맥락",
  "simplification|simplification|n.|단순화", "interrelated|interrelated|adj.|서로 관련된", "emphasized|emphasize|v.|강조하다",
]);
cards("pr169", "783ac05e39", [
  "performs|perform|v.|(춤을) 추다, 공연하다", "prose|prose|n.|산문", "early|early|adj.|초기의 (early script 초기 문자)", "writing|writing|n.|문자, 글쓰기",
  "restricted|restrict|v.|제한하다 (be restricted to ~으로 한정되다)", "alphabetic|alphabetic|adj.|알파벳의, 자모의", "preserved|preserve|v.|보존하다",
  "scratched|scratch|v.|긁어 새기다", "announcing|announce|v.|알리다", "dancing|dance|n.|춤 (dancing contest 춤 경연)", "prize|prize|n.|상, 상품",
  "telegraphic|telegraphic|adj.|전보 같은, 극도로 간결한", "poetry|poetry|n.|시", "confined|confine|v.|한정하다 (be confined to ~에 국한되다)",
]);
cards("pr170", "ffec7bfc36", ["=Western", "=knives", "=chopsticks", "=common", "=choice", "=traditional", "=dishes", "=follow", "=custom", "=utensils", "=cleaner", "=point", "=whether", "=history"]);
cards("pr171", "ba4bc7aee5", [
  "reformers|reformer|n.|개혁가", "author|author|n.|발의자, 작성자 (author of the amendment 개정안 발의자)", "equal|equal|adj.|평등한, 동등한",
  "rights|right|n.|권리 (Equal Rights 평등권)", "amendment|amendment|n.|(헌법) 수정안, 개정안", "introduced|introduce|v.|(법안을) 발의하다, 제출하다",
  "congress|congress|n.|(미국) 의회", "received|receive|v.|받다", "fame|fame|n.|명성", "honor|honor|n.|명예, 영예", "lifetime|lifetime|n.|생애, 평생",
  "gained|gain|v.|얻다", "considerable|considerable|adj.|상당한", "posthumously|posthumously|adv.|사후에",
]);
cards("pr172", "171b969a5b", [
  "performance|performance|n.|업무 수행, 성과", "knowledge|knowledge|n.|(common knowledge) 누구나 아는 사실, 상식", "hand|hand|n.|(go hand in hand) 함께 가다, 밀접하게 연관되다",
  "achieved|achieve|v.|이루다, 거두다", "results|result|n.|성과, 결과", "employee|employee|n.|직원", "employers|employer|n.|고용주", "ability|ability|n.|능력",
  "particular|particular|adj.|특정한", "potential|potential|adj.|잠재적인", "laziness|laziness|n.|게으름", "mediocre|mediocre|adj.|평범한, 그저 그런",
  "industry|industry|n.|근면, 부지런함", "loyalty|loyalty|n.|충성, 충실함",
]);
cards("pr173", "a6966acfd8", [
  "develop|develop|v.|발전시키다", "original|original|adj.|독창적인", "encouraged|encourage|v.|격려하다 (be encouraged to ~하도록 격려받다)", "practice|practice|n.|실행 (put into practice 실천하다)",
  "achieve|achieve|v.|이루다", "results|result|n.|결과", "imaginative|imaginative|adj.|상상력이 풍부한", "produce|produce|v.|만들어 내다", "productive|productive|adj.|생산적인",
  "share|share|v.|공유하다", "fail|fail|v.|실패하다", "prosper|prosper|v.|번영하다, 번창하다", "members|member|n.|구성원", "positive|positive|adj.|긍정적인",
]);
cards("pr174", "a739076b70", [
  "modes|mode|n.|방식 (modes of behavior 행동 방식)", "carpet|carpet|v.|카펫을 깔다", "spending|spend|v.|(돈을) 쓰다", "cottage|cottage|n.|작은 시골집, 별장",
  "save|save|v.|(돈을) 모으다, 저축하다", "interesting|interesting|adj.|흥미로운", "household|household|n.|가정 (household money 살림 돈)", "grown|grow|v.|(grow up) 자라다",
  "brought|bring|v.|(bring up) 기르다 (be brought up to ~하도록 길러지다)", "differences|difference|n.|차이", "seeking|seek|v.|찾다, 추구하다", "pleasures|pleasure|n.|즐거움",
  "vacation|vacation|n.|휴가", "content|content|adj.|(be content with) ~에 만족하다",
]);
cards("pr175", "32453bb5c1", [
  "athletic|athletic|adj.|운동의 (athletic ability 운동 능력)", "increase|increase|v.|높이다, 늘리다", "prepare|prepare|v.|(prepare A for B) A가 B에 대비하게 하다",
  "appointments|appointment|n.|약속, 만남 (business appointment 업무 약속)", "rich|rich|adj.|(rich in) ~이 풍부한", "choose|choose|v.|고르다", "eating|eat|n.|식사 (eating patterns 식습관)",
  "change|change|v.|바꾸다", "patterns|pattern|n.|양식, 패턴", "situations|situation|n.|상황", "romantic|romantic|adj.|낭만적인", "needs|need|n.|필요, 요구 (meet the needs 요구를 충족하다)",
  "fiber|fiber|n.|섬유질", "mood|mood|n.|기분 (in the mood for ~할 기분이 드는)",
]);
cards("pr176", "890f242246", [
  "language|language|n.|언어", "different|different|adj.|여러 가지의, 다른", "learn|learn|v.|배우다", "ears|ear|n.|귀", "eyes|eye|n.|눈", "hearing|hear|v.|듣다",
  "just|just|adv.|단지, 그저", "reading|read|v.|읽다", "trying|try|v.|해 보다, 시도하다", "foreign|foreign|adj.|외국의", "speak|speak|v.|말하다",
  "instruction|instruction|n.|사용 설명 (instruction manual 사용 설명서)", "computer|computer|n.|컴퓨터", "manual|manual|n.|설명서",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
