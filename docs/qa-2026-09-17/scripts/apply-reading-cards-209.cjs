#!/usr/bin/env node
/**
 * READING vocabulary cards pr209–pr224 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (sentences
 * 문장 → 형벌, states 상태 → (미국의) 주, trials 시도/시련 → 재판, found 설립하다, figuring 그림,
 * tastes 맛이 나다 → 취향, smith 대장장이, along ~을 따라 → get along), placeholders written or
 * replaced (graying, disheveled), the misspelt card "howeve" and fragments (others-greater, us,
 * tv, united) removed, and cards no longer in the text after the passage fixes (customs,
 * appearances, increased, canario, appears, report, covering) replaced. pr216 is the same
 * passage as pr197 (R-01, owner decision pending) and gets the same 14 cards.
 *   node apply-reading-cards-209.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr209", "4626e918b2", [
  "light|light|n.|빛", "reputation|reputation|n.|평판", "opinion|opinion|n.|의견, 평가 (good opinion 좋은 평가)", "believes|believe|v.|믿다, 여기다",
  "character|character|n.|인격, 됨됨이", "desirable|desirable|adj.|바람직한", "harmony|harmony|n.|조화 (in harmony 조화를 이루는)", "opposite|opposite|adj.|정반대의",
  "darkness|darkness|n.|어둠", "despised|despise|v.|경멸하다, 업신여기다", "frequently|frequently|adv.|자주", "distinction|distinction|n.|차이, 구별",
  "associates|associate|n.|동료", "acquaintances|acquaintance|n.|아는 사람, 지인",
]);
cards("pr210", "d679a40a17", [
  "books|book|n.|책", "experience|experience|n.|경험", "suffered|suffer|v.|고통을 겪다", "sought|seek|v.|찾다, 추구하다", "shocked|shock|v.|충격을 주다 (be shocked 충격을 받다)",
  "indeed|indeed|adv.|정말로, 실은", "personal|personal|adj.|개인적인", "irresponsive|irresponsive|adj.|무반응의, 냉담한", "injustice|injustice|n.|불의, 부당함",
  "hardships|hardship|n.|고난", "thoroughly|thoroughly|adv.|철저히, 완전히", "lonely|lonely|adj.|외로운", "vast|vast|adj.|광대한", "learn|learn|v.|배우다, 알게 되다",
]);
cards("pr211", "365ec14b54", [
  "remember|remember|v.|떠올리다", "affected|affect|v.|영향을 미치다 (be affected by ~의 영향을 받다)", "younger|young|adj.|더 젊은", "scientific|scientific|adj.|과학의",
  "graying|gray|adj.|머리가 희끗희끗해지는", "public|public|adj.|대중에게 보이는 (public face 대중적 이미지)", "appearance|appearance|n.|외모", "genius|genius|n.|천재",
  "breakthroughs|breakthrough|n.|획기적 발견", "impossible|impossible|n.|(the impossible) 불가능한 일", "disheveled|disheveled|adj.|헝클어진", "dogma|dogma|n.|정설, 교리",
  "instinctively|instinctively|adv.|본능적으로", "authority|authority|n.|권위",
]);
cards("pr212", "7814ea005a", [
  "children|child|n.|아이, 자녀", "own|own|adj.|자기 자신의", "feel|feel|v.|느끼다", "love|love|n.|사랑", "parents|parent|n.|부모",
  "parental|parental|adj.|부모의 (parental love 부모의 사랑)", "general|general|n.|(in general) 일반적으로", "special|special|adj.|특별한",
  "referred|refer|v.|(refer to A as B) A를 B라고 부르다", "same|same|adj.|같은", "other|other|adj.|다른", "kind|kind|n.|종류", "true|true|adj.|사실인",
  "feeling|feeling|n.|감정",
]);
cards("pr213", "3956b58855", [
  "brother|brother|n.|형제 (big brother 형)", "delivered|deliver|v.|배달하다", "missed|miss|v.|거르다 (never missed a day 하루도 거르지 않았다)",
  "route|route|n.|배달 구역 (newspaper route 신문 배달 구역)", "confident|confident|adj.|자신감 있는", "hands|hand|n.|손 (take one's hands off ~에서 손을 떼다)",
  "balance|balance|v.|균형을 잡다", "customers|customer|n.|고객", "bike|bike|n.|자전거", "satisfied|satisfied|adj.|만족한", "newspaper|newspaper|n.|신문",
  "neighborhood|neighborhood|n.|동네", "disappoint|disappoint|v.|실망시키다", "fun|fun|n.|(make fun of) ~을 놀리다",
]);
cards("pr214", "8cde372a29", [
  "music|music|n.|음악", "depending|depend|v.|(depending upon) ~에 따라", "opinion|opinion|n.|의견", "completely|completely|adv.|완전히",
  "performing|perform|adj.|공연하는 (performing arts 공연 예술)", "improve|improve|v.|개선하다", "transform|transform|v.|바꾸다, 변형하다", "dismiss|dismiss|v.|무시하다, 일축하다",
  "control|control|n.|통제, 조작", "persuasive|persuasive|adj.|설득력 있는", "released|release|v.|발표하다, 공개하다", "contrary|contrary|adj.|(contrary to) ~과 반대로",
  "considerable|considerable|adj.|상당한", "tastes|taste|n.|취향",
]);
cards("pr215", "31fcb32c4f", [
  "happy|happy|adj.|기쁜 (be happy with ~에 만족하다)", "medicine|medicine|n.|의학", "worry|worry|v.|걱정하다", "advances|advance|n.|발전, 진보",
  "developments|development|n.|발전", "polluted|polluted|adj.|오염된", "impressed|impress|v.|감명을 주다 (be impressed by ~에 감명받다)",
  "frightened|frighten|v.|겁주다 (be frightened by ~에 겁을 먹다)", "excited|excite|v.|흥분시키다 (be excited by ~에 들뜨다)", "entered|enter|v.|들어가다",
  "undoubtedly|undoubtedly|adv.|의심할 여지 없이", "rapid|rapid|adj.|빠른", "agricultural|agricultural|adj.|농업의", "horrors|horror|n.|공포, 참상",
]);
cards("pr216", "5c53752162", [
  "genuine|genuine|adj.|진정한", "produce|produce|v.|낳다, 일으키다", "later|later|adj.|나중의 (in later years 훗날에)", "increase|increase|n.|인상, 증가 (an increase in salary 급여 인상)",
  "happiness|happiness|n.|행복", "realizing|realize|v.|깨닫다, 의식하다", "earn|earn|v.|(돈을) 벌다", "follows|follow|v.|뒤따르다", "promotion|promotion|n.|승진",
  "success|success|n.|성공", "considerations|consideration|n.|고려 사항", "neglect|neglect|n.|소홀히 함", "frustration|frustration|n.|좌절감", "diligently|diligently|adv.|부지런히",
]);
cards("pr217", "e79d69014c", [
  "words|word|n.|단어", "sound|sound|v.|~하게 들리다 (sound intellectual 유식하게 들리다)", "spend|spend|v.|(시간을) 쓰다", "prefer|prefer|v.|더 좋아하다", "readers|reader|n.|독자",
  "figuring|figure|v.|(figure out) 알아내다, 이해하다", "intellectual|intellectual|adj.|지적인, 유식한", "writer|writer|n.|글쓴이", "impress|impress|v.|깊은 인상을 주다",
  "impatient|impatient|adj.|참을성 없는", "struggle|struggle|v.|(struggle with) ~과 씨름하다", "clear|clear|adj.|명확한", "means|mean|v.|의미하다", "long|long|adj.|긴",
]);
cards("pr218", "5fee48030b", [
  "leading|lead|v.|(lead A to do) A가 ~하게 만들다", "harsher|harsh|adj.|더 가혹한", "picture|picture|n.|모습, 인상 (distorted picture 왜곡된 모습)",
  "sentences|sentence|n.|형벌, 선고 (pass a sentence 형을 선고하다)", "connected|connect|v.|(be connected to) ~과 관련되다", "provide|provide|v.|제공하다",
  "accurate|accurate|adj.|정확한", "coverage|coverage|n.|보도", "otherwise|otherwise|adv.|그렇지 않으면, 달리", "televising|televise|v.|텔레비전으로 방송하다",
  "distorted|distorted|adj.|왜곡된", "trials|trial|n.|재판", "witnesses|witness|n.|증인", "crucial|crucial|adj.|결정적인, 매우 중요한",
]);
cards("pr219", "2785391041", [
  "considered|consider|v.|여기다 (be considered ~으로 여겨지다)", "families|family|n.|가정", "developing|develop|adj.|성장하는, 발달 중인", "increases|increase|v.|높아지다, 늘다",
  "early|early|adj.|초기의 (early adolescence 청소년기 초기)", "arguing|argue|v.|말다툼하다, 논쟁하다", "argument|argument|n.|말다툼, 논쟁", "disrespectful|disrespectful|adj.|무례한",
  "rigid|rigid|adj.|엄격한", "decreases|decrease|v.|줄다", "adolescents|adolescent|n.|청소년", "normal|normal|adj.|정상적인", "adolescence|adolescence|n.|청소년기",
  "quantity|quantity|n.|양",
]);
cards("pr220", "8e57036cde", [
  "happy|happy|adj.|행복한", "creates|create|v.|만들어 내다", "social|social|adj.|사회의 (social groups 사회 집단)", "belong|belong|v.|(belong to) ~에 속하다",
  "common|common|adj.|흔한; 공통의 (common interest 공통 관심사)", "same|same|adj.|같은", "along|along|adv.|(get along) 사이좋게 지내다", "relationships|relationship|n.|관계",
  "harmonious|harmonious|adj.|화목한, 조화로운", "belief|belief|n.|믿음", "interest|interest|n.|관심사", "participating|participate|v.|(participate in) ~에 참여하다",
  "obviously|obviously|adv.|분명히", "alone|alone|adv.|(명사 뒤) ~만으로 (a common interest alone 공통 관심사만으로)",
]);
cards("pr221", "4fac4a37f0", [
  "named|name|v.|이름을 붙이다 (be named for ~의 이름을 따서 지어지다)", "islands|island|n.|섬", "birds|bird|n.|새", "word|word|n.|단어",
  "early|early|adj.|초기의 (early explorers 초기 탐험가들)", "wild|wild|adj.|야생의", "meaning|mean|v.|~을 뜻하는", "live|live|v.|살다", "explorers|explorer|n.|탐험가",
  "dogs|dog|n.|개", "latin|latin|adj.|라틴어의", "canary|canary|n.|카나리아(새)", "isle|isle|n.|섬", "comes|come|v.|(come from) ~에서 유래하다",
]);
cards("pr222", "ea11a76482", [
  "sharing|share|v.|공유하다", "assume|assume|v.|가정하다, 전제하다", "transmitting|transmit|v.|전송하다", "fundamentally|fundamentally|adv.|근본적으로",
  "information|information|n.|정보", "density|density|n.|밀도, 양", "misleading|misleading|adj.|오해를 부르는", "confirm|confirm|v.|굳혀 주다, 확인해 주다",
  "surprising|surprising|adj.|놀라운", "inhabited|inhabit|v.|~에 살다", "ancestors|ancestor|n.|조상", "valid|valid|adj.|타당한", "primitiveness|primitiveness|n.|원시성",
  "satellites|satellite|n.|인공위성",
]);
cards("pr223", "0fcd57ce4c", [
  "happy|happy|adj.|행복한", "value|value|v.|소중히 여기다", "family|family|n.|가족", "share|share|v.|함께 나누다", "sad|sad|adj.|슬픈", "happiness|happiness|n.|행복",
  "health|health|n.|건강", "hand|hand|n.|(on the other hand) 반면에", "communicate|communicate|v.|소통하다", "members|member|n.|구성원",
  "wealthy|wealthy|adj.|부유한", "tied|tie|v.|(be tied to) ~과 밀접하게 연결되다", "religion|religion|n.|종교", "intelligence|intelligence|n.|지성",
]);
cards("pr224", "69566b81d7", [
  "allow|allow|v.|허용하다", "trials|trial|n.|재판", "appear|appear|v.|출석하다, 나오다", "agree|agree|v.|동의하다", "witnesses|witness|n.|증인",
  "court|court|n.|법정 (court trial 법정 재판)", "cameras|camera|n.|카메라", "fictional|fictional|adj.|허구의", "inform|inform|v.|알리다", "states|state|n.|(미국의) 주",
  "reports|report|n.|보도", "coverage|coverage|n.|보도, 중계", "jurors|juror|n.|배심원", "distracted|distract|v.|주의를 흩뜨리다 (be distracted 산만해지다)",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
