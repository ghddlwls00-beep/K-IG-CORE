#!/usr/bin/env node
/**
 * READING vocabulary cards pr049–pr064 (ISS-10: RV-05 … RV-09; R-00). Read card by card against
 * each corrected passage — see apply-reading-cards-001.cjs. pr056's four cards taken from the
 * removed answer choices (misdeeds, delight, praises, patriotism — RV-06/RV-09) and pr059's
 * broken "eyes-people" (RV-07) replaced; pr054's "marketing" is 마케팅, not 시장.
 *   node apply-reading-cards-049.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr049", "dc1484cd25", [
  "succeeded|succeed|v.|성공하다", "poor|poor|adj.|부족한 (concentration is poor 집중력이 부족하다)", "produce|produce|v.|만들어 내다", "achieve|achieve|v.|이루다",
  "results|result|n.|성과, 결과", "concentration|concentration|n.|집중력", "qualified|qualified|adj.|자격을 갖춘", "owe|owe|v.|(owe A to B) A를 B 덕분으로 여기다",
  "easy|easy|adj.|쉬운", "qualifications|qualification|n.|자격, 능력", "called|call|v.|~라고 부르다 (be called ~라고 불리다)", "success|success|n.|성공 (make a success 성공하다)",
  "poetry|poetry|n.|시", "profession|profession|n.|직업, 전문직",
]);
cards("pr050", "c5a3100f6b", [
  "society|society|n.|사회", "language|language|n.|언어", "simplest|simple|adj.|가장 단순한 (simple의 최상급)", "explaining|explain|v.|설명하다",
  "directing|direct|v.|지휘하다, 이끌다", "goal|goal|n.|목표", "cooperative|cooperative|adj.|협동의", "engaging|engage|v.|(engage in) ~에 참여하다, 종사하다",
  "enterprises|enterprise|n.|사업, 일 (cooperative enterprises 협동 작업)", "individual|individual|n.|개인", "securing|secure|v.|확보하다, 얻다",
  "incapable|incapable|adj.|~할 수 없는 (be incapable of)", "lacking|lack|v.|~이 없다 (a society lacking language 언어가 없는 사회)", "dependent|dependent|adj.|의존하는 (dependent on)",
]);
cards("pr051", "3324a0d1c4", [
  "honestly|honestly|adv.|정직하게", "saves|save|v.|모으다, 저축하다", "goal|goal|n.|목표", "depends|depend|v.|(depend on) ~에 달려 있다", "diligence|diligence|n.|근면",
  "waste|waste|v.|낭비하다", "thrift|thrift|n.|절약", "plain|plain|adj.|분명한, 명백한", "wealth|wealth|n.|부, 재산", "desire|desire|v.|바라다, 원하다",
  "market|market|n.|시장", "chiefly|chiefly|adv.|주로", "certainly|certainly|adv.|틀림없이", "obtain|obtain|v.|얻다, 이루다",
]);
cards("pr052", "7aabeeeea4", [
  "develop|develop|v.|기르다, 발달시키다", "raise|raise|v.|(아이를) 키우다", "considerate|considerate|adj.|사려 깊은", "strong|strong|adj.|강한, 확고한", "accept|accept|v.|받아들이다",
  "character|character|n.|인격, 성품", "honest|honest|adj.|정직한", "voice|voice|n.|목소리 (inner voice 내면의 목소리)", "distinguish|distinguish|v.|구별하다 (distinguish A from B)",
  "conscience|conscience|n.|양심", "ethically|ethically|adv.|윤리적으로", "moral|moral|adj.|도덕적인", "right|right|adj.|옳은 (right from wrong 옳고 그름)", "essence|essence|n.|본질, 핵심",
]);
cards("pr053", "6df9629d12", [
  "highly|highly|adv.|매우, 고도로", "difficult|difficult|adj.|어려운", "narrow|narrow|v.|좁히다 (narrow down)", "educated|educated|adj.|근거 있는 (educated guess 지식에 근거한 추측)",
  "foretell|foretell|v.|예언하다", "bring|bring|v.|가져오다 (bring back 가지고 돌아오다)", "infinity|infinity|n.|무한", "predicting|predict|v.|예측하다", "guesses|guess|n.|추측",
  "future|future|n.|미래", "disastrously|disastrously|adv.|처참하게, 크게", "wrong|wrong|adv.|(go wrong) 빗나가다, 잘못되다", "advance|advance|adj.|앞서 가는, 선발의 (advance scouts 선발 정찰대)",
  "priceless|priceless|adj.|매우 귀중한",
]);
cards("pr054", "6c141377c8", [
  "explore|explore|v.|탐구하다", "reducing|reduce|v.|줄이다", "customers|customer|n.|고객", "increase|increase|v.|늘리다", "transform|transform|v.|바꾸다, 변환하다",
  "marketing|marketing|n.|마케팅", "attrition|attrition|n.|(고객의) 이탈, 감소", "database|database|n.|데이터베이스", "warehousing|warehousing|n.|저장 (data warehousing 데이터 웨어하우징)",
  "techniques|technique|n.|기법", "applied|applied|adj.|응용의 (applied analysis 응용 분석)", "data|data|n.|데이터, 자료", "statistical|statistical|adj.|통계의", "profits|profit|n.|이익, 수익",
]);
cards("pr055", "6c85aad4c0", [
  "school|school|n.|학교", "teachers|teacher|n.|교사", "students|student|n.|학생", "consider|consider|v.|고려하다", "develop|develop|v.|키우다", "supported|supported|adj.|지지받는",
  "belong|belong|v.|소속되다, 소속감을 느끼다", "community|community|n.|공동체", "affects|affect|v.|영향을 주다", "environment|environment|n.|환경", "trust|trust|n.|신뢰",
  "openness|openness|n.|솔직함, 개방성", "contribute|contribute|v.|기여하다", "involved|involved|adj.|관련된, 참여하는 (the people involved in ~에 관련된 사람들)",
]);
cards("pr056", "27006a441f", [
  "young|young|adj.|젊은 (the young 젊은이들)", "allowed|allow|v.|허락하다 (be allowed to ~하도록 허락되다)", "experience|experience|v.|겪다, 경험하다", "offer|offer|v.|주다, 제공하다",
  "disappointment|disappointment|n.|실망", "possible|possible|adj.|가능한", "win|win|v.|이기다", "enjoy|enjoy|v.|즐기다", "youngster|youngster|n.|아이, 청소년",
  "terrible|terrible|adj.|몹시 기분이 나쁜 (feel terrible 몹시 속상하다)", "matter|matter|v.|중요하다 (It doesn't matter 상관없다)", "team|team|n.|팀 (make the team 팀에 뽑히다)",
  "learn|learn|v.|배우다", "prize|prize|n.|상",
]);
cards("pr057", "079964a5a9", [
  "allowed|allow|v.|허락하다 (be allowed to)", "provide|provide|v.|제공하다 (provide A with B A에게 B를 주다)", "required|require|v.|요구하다 (be required to ~해야 한다)",
  "travel|travel|n.|여행", "illness|illness|n.|질병", "policy|policy|n.|보험 증권 (insurance policy)", "insurance|insurance|n.|보험", "adequate|adequate|adj.|적절한, 충분한",
  "ensure|ensure|v.|확실히 하다", "travellers|traveller|n.|여행자 (영국식 철자)", "depart|depart|v.|출발하다", "coverage|coverage|n.|(보험의) 보장",
  "arising|arise|v.|생기다 (arising from ~에서 생기는)", "covering|cover|v.|(보험이 기간을) 보장하다",
]);
cards("pr058", "aef421495c", [
  "schools|school|n.|학교", "students|student|n.|학생", "influenced|influence|v.|영향을 주다 (be influenced by ~의 영향을 받다)", "believed|believe|v.|믿다",
  "affect|affect|v.|영향을 주다", "knowledge|knowledge|n.|지식", "education|education|n.|교육", "facts|fact|n.|사실", "educating|educate|v.|교육하다",
  "philosopher|philosopher|n.|철학자", "practical|practical|adj.|실용적인", "worthwhile|worthwhile|adj.|가치 있는", "convinced|convince|v.|설득하다, 확신시키다", "memorize|memorize|v.|외우다",
]);
cards("pr059", "d80cdf4ae6", [
  "light|light|n.|빛", "healthy|healthy|adj.|건강한", "agree|agree|v.|동의하다", "eye|eye|n.|눈", "blind|blind|adj.|시력을 잃은 (the blind 시각장애인)",
  "called|call|v.|~라고 부르다 (called ~라고 불리는)", "cornea|cornea|n.|각막", "enough|enough|adj.|충분한", "clear|clear|adj.|맑은, 투명한",
  "clouded|cloud|v.|(be clouded over) 뿌옇게 흐려지다", "part|part|n.|부분", "use|use|v.|사용하다", "die|die|v.|죽다", "get|get|v.|얻다, 받다",
]);
cards("pr060", "450c3ac541", [
  "peace|peace|n.|평화 (peace of mind 마음의 평화)", "mind|mind|n.|마음", "promise|promise|v.|약속하다 (promise yourself 스스로 다짐하다)", "forgiveness|forgiveness|n.|용서",
  "sincere|sincere|adj.|진심 어린", "hurt|hurt|n.|상처, 해", "determination|determination|n.|결심", "emotion|emotion|n.|감정", "wronged|wrong|v.|부당하게 대하다, 해를 끼치다",
  "apologize|apologize|v.|사과하다", "suffered|suffer|v.|(suffer from) ~로 고통을 겪다", "sincerity|sincerity|n.|진심 (in all sincerity 진심으로)", "memory|memory|n.|기억",
  "aside|aside|adv.|(put ~ aside) 제쳐 두다, 떨쳐 버리다",
]);
cards("pr061", "a4174bb54c", [
  "school|school|n.|학교", "book|book|n.|책 (여기서는 졸업 앨범)", "pictures|picture|n.|사진", "student|student|n.|학생", "music|music|n.|음악 (music festivals 음악 축제)",
  "championships|championship|n.|선수권 대회", "reserve|reserve|v.|예약하다", "published|publish|v.|발행하다", "yearbook|yearbook|n.|졸업 앨범", "events|event|n.|행사",
  "recorded|record|v.|기록하다", "secretary|secretary|n.|비서, 사무 직원", "interesting|interesting|adj.|흥미로운", "attended|attend|v.|참석하다",
]);
cards("pr062", "5130f89f33", [
  "destroy|destroy|v.|망치다, 파괴하다", "mind|mind|n.|마음", "exercise|exercise|v.|(판단력을) 발휘하다", "naturally|naturally|adv.|당연히", "cause|cause|v.|일으키다",
  "accept|accept|v.|인정하다, 받아들이다", "glorious|glorious|adj.|멋진, 영광스러운", "wise|wise|adj.|현명한", "errors|error|n.|잘못, 실수", "guilt|guilt|n.|죄책감",
  "untroubled|untroubled|adj.|거리낌 없는, 평온한", "cloud|cloud|v.|흐리게 하다, 어둡게 하다", "compensation|compensation|n.|보상", "beginning|beginning|n.|시작",
]);
cards("pr063", "ae22c9a8e6", [
  "improve|improve|v.|개선하다", "poor|poor|adj.|질이 낮은, 형편없는", "explain|explain|v.|설명하다", "criticize|criticize|v.|비판하다", "quality|quality|n.|질",
  "writing|writing|n.|글", "inferior|inferior|adj.|질이 떨어지는", "piece|piece|n.|한 편 (a piece of writing 글 한 편)", "remedied|remedy|v.|바로잡다, 고치다",
  "merely|merely|adv.|단지", "effectively|effectively|adv.|효과적으로", "more|more|adv.|더 (do more than ~ 이상을 하다)", "work|work|n.|작품", "know|know|v.|알다",
]);
cards("pr064", "1c7c34b424", [
  "remember|remember|v.|기억하다", "friends|friend|n.|친구 (make friends with ~와 친해지다)", "difficult|difficult|adj.|까다로운 (difficult to work with 함께 일하기 어려운)",
  "job|job|n.|직장, 일자리", "early|early|adv.|일찍", "way|way|n.|방식 (the way you work 일하는 방식)", "trouble|trouble|n.|곤란, 문제", "important|important|adj.|중요한",
  "want|want|v.|원하다", "keep|keep|v.|(직장을) 계속 다니다", "often|often|adv.|자주", "coffee|coffee|n.|커피", "leave|leave|v.|(직장을) 나서다, 퇴근하다", "stop|stop|v.|멈추다",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
