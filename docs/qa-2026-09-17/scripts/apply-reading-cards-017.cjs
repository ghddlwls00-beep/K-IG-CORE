#!/usr/bin/env node
/**
 * READING vocabulary cards pr017–pr032 (ISS-10: RV-00, RV-01, RV-02, RV-03, RV-04; R-00).
 * Read card by card against each corrected passage — see apply-reading-cards-001.cjs.
 * pr031's passage has only 11 content words, so "so", "can" and "have" stay as cards;
 * pr031 "danger"/"equip" were not in the passage (RV-03). pr032's cards follow its corrected
 * sentence (noodles, not "smacking of lips").
 *   node apply-reading-cards-017.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr017", "a1263b9d5e", [
  "natural|natural|adj.|자연의", "believe|believe|v.|믿다", "slowed|slow|v.|늦추다 (slow down)", "destroy|destroy|v.|파괴하다",
  "reserved|reserved|adj.|(~만을 위해) 따로 정해진 (be reserved for)", "earth|earth|n.|지구", "substitute|substitute|v.|대신 쓰다 (substitute A for B B 대신 A를 쓰다)",
  "influence|influence|n.|영향", "society|society|n.|사회", "spiritual|spiritual|adj.|정신적인", "stillness|stillness|n.|고요함", "beauty|beauty|n.|아름다움",
  "pleasures|pleasure|n.|즐거움", "contact|contact|n.|접촉 (contact with ~와의 접촉)",
]);
cards("pr018", "6e2d3496c9", [
  "species|species|n.|(생물의) 종", "disappear|disappear|v.|사라지다", "knowledge|knowledge|n.|지식", "rumor|rumor|n.|소문",
  "prefer|prefer|v.|더 좋아하다 (prefer A to B B보다 A를 더 좋아하다)", "novelists|novelist|n.|소설가", "destined|destined|adj.|~할 운명인 (be destined to)",
  "preserved|preserve|v.|보존하다", "coming|coming|n.|도래, 등장 (the coming of ~의 등장)", "television|television|n.|텔레비전", "dying|dying|adj.|죽어 가는",
  "profound|profound|adj.|깊은, 심오한", "old-fashioned|old-fashioned|adj.|구식의", "extinct|extinct|adj.|멸종한",
]);
cards("pr019", "78308adfee", [
  "wisdom|wisdom|n.|지혜", "suffering|suffering|n.|고통", "far|far|adv.|멀리 (far from ~에서 멀리)", "joy|joy|n.|기쁨", "reached|reach|v.|이르다, 도달하다",
  "loneliness|loneliness|n.|고독, 외로움", "transformation|transformation|n.|탈바꿈, 변화", "great|great|adj.|거대한, 엄청난", "taste|taste|v.|맛보다",
  "butterfly|butterfly|n.|나비", "endures|endure|v.|견디다", "visitors|visitor|n.|방문객", "mankind|mankind|n.|인류", "companion|companion|n.|동반자, 벗",
]);
cards("pr020", "673c3f4592", [
  "plants|plant|n.|식물", "earth|earth|n.|지구", "supports|support|v.|부양하다, 살아가게 하다", "animal|animal|adj.|동물의 (animal life 동물들)",
  "harness|harness|v.|(에너지를) 이용하다", "remembers|remember|v.|기억하다", "depends|depend|v.|의지하다 (depend upon ~에 의지하다)", "exist|exist|v.|존재하다",
  "narrow|narrow|adj.|편협한, 좁은", "utility|utility|n.|쓸모, 유용성", "mantle|mantle|n.|덮개, 외투 (green mantle of plants 식물이라는 녹색 외투)", "green|green|adj.|녹색의",
  "undesirable|undesirable|adj.|바람직하지 않은", "destruction|destruction|n.|파괴",
]);
cards("pr021", "1f66022586", [
  "society|society|n.|사회", "obeyed|obey|v.|(법을) 지키다, 따르다", "leads|lead|v.|이끌다, ~하게 하다 (lead A to do)", "laws|law|n.|법",
  "organism|organism|n.|유기체 (여기서는 사회)", "conscience|conscience|n.|양심", "setting|set|v.|두다, 배치하다", "private|private|adj.|사적인",
  "according|according|adv.|(according to) ~에 따라", "effective|effective|adj.|효과적인", "self-preservation|self-preservation|n.|자기 보존",
  "function|function|n.|기능, 작용", "policeman|policeman|n.|경찰관", "remarkable|remarkable|adj.|놀라운, 주목할 만한",
]);
cards("pr022", "ee7031c25e", [
  "develop|develop|v.|키우다, 발전시키다", "brother|brother|n.|형제 (여기서는 같은 인간, 이웃)", "purpose|purpose|n.|목적, 쓸모 (serve a purpose 쓸모가 있다)", "love|love|n.|사랑",
  "helpless|helpless|adj.|무력한, 의지할 데 없는", "specific|specific|adj.|특정한", "relationship|relationship|n.|관계", "compassion|compassion|n.|연민",
  "beginning|beginning|n.|시작", "unfold|unfold|v.|펼쳐지다, 피어나다", "achievement|achievement|n.|성취, 대단한 일", "flesh|flesh|n.|살 (one's own flesh and blood 자기 혈육)",
  "brotherly|brotherly|adj.|형제 같은 (brotherly love 형제애)", "serve|serve|v.|(목적에) 쓸모가 있다 (serve a purpose)",
]);
cards("pr023", "eddda0eb2e", [
  "wish|wish|v.|빌다, 바라다 (wish you well 행복을 빌다)", "hope|hope|v.|바라다", "led|lead|v.|(결과로) 이어지다 (lead to ~로 이어지다)", "employee|employee|n.|직원",
  "executives|executive|n.|임원", "safe|safe|adj.|(it is safe to say) ~라고 해도 틀리지 않다", "respected|respected|adj.|존경받는", "valued|valued|adj.|소중한, 귀하게 여겨지는",
  "company|company|n.|회사", "well-earned|well-earned|adj.|노력해서 얻은, 받을 만한", "retirement|retirement|n.|은퇴", "contributions|contribution|n.|공헌",
  "promoted|promote|v.|승진시키다 (be promoted to ~로 승진하다)", "behalf|behalf|n.|(on behalf of) ~을 대표하여",
]);
cards("pr024", "9be633047a", [
  "language|language|n.|언어", "increased|increase|v.|늘다, 증가하다", "culture|culture|n.|문화", "dramatically|dramatically|adv.|극적으로, 크게",
  "students|student|n.|학생", "offer|offer|v.|제공하다", "interested|interested|adj.|관심 있는", "growing|growing|adj.|커지는, 늘어나는", "imagined|imagine|v.|상상하다",
  "number|number|n.|수 (the number of ~의 수)", "firms|firm|n.|회사", "foreigners|foreigner|n.|외국인", "success|success|n.|성공", "overseas|overseas|adv.|해외에서",
]);
cards("pr025", "3c9eb7e2da", [
  "anger|anger|n.|분노", "produced|produce|v.|일으키다, 생기게 하다", "healthy|healthy|adj.|건강한, 건강에 좋은", "share|share|v.|나누다", "ideas|idea|n.|생각",
  "tensions|tension|n.|긴장", "surprising|surprising|adj.|놀라운", "relieves|relieve|v.|풀어 주다, 덜어 주다", "feelings|feeling|n.|감정", "despair|despair|n.|절망",
  "restful|restful|adj.|편안한, 휴식이 되는", "act|act|v.|행동하다", "eased|ease|v.|누그러뜨리다 (be eased 누그러지다)", "upsets|upset|n.|동요, 속상함 (emotional upsets 정서적 동요)",
]);
cards("pr026", "c10fdc5dcd", [
  "brain|brain|n.|뇌, 두뇌", "naturally|naturally|adv.|선천적으로, 본래", "society|society|n.|사회", "accepted|accept|v.|받아들이다", "requiring|require|v.|필요로 하다",
  "inconsistent|inconsistent|adj.|일치하지 않는, 모순되는", "doubt|doubt|n.|의심 (cast doubt on ~에 의문을 던지다)", "laborious|laborious|adj.|힘든, 고된",
  "altered|alter|v.|바꾸다", "established|established|adj.|기존의, 확립된", "average|average|adj.|보통의", "beliefs|belief|n.|믿음",
  "resistance|resistance|n.|저항 (the line of least resistance 가장 쉬운 길)", "desirable|desirable|adj.|바람직한",
]);
cards("pr027", "59399788d8", [
  "wish|wish|v.|(wish ~ away) 헛되이 보내다", "achieve|achieve|v.|이루다, 달성하다", "remember|remember|v.|기억하다", "dreams|dream|n.|꿈", "worry|worry|v.|걱정하다",
  "goals|goal|n.|목표", "future|future|n.|미래", "plans|plan|n.|계획", "impossible|impossible|adj.|불가능한", "precious|precious|adj.|소중한",
  "realistic|realistic|adj.|현실적인", "present|present|n.|현재 (the present)", "anxieties|anxiety|n.|불안, 걱정", "pressure|pressure|v.|압력을 가하다 (pressure A into ~ing)",
]);
cards("pr028", "8d1f003ccf", [
  "reason|reason|n.|이성", "words|word|n.|말", "calm|calm|v.|(calm down) 마음을 가라앉히다", "regret|regret|v.|후회하다", "sometimes|sometimes|adv.|때때로",
  "emotion|emotion|n.|감정", "otherwise|otherwise|adv.|그렇지 않으면", "recalled|recall|v.|되돌리다, 취소하다 (can't be recalled 되돌릴 수 없다)", "bullets|bullet|n.|총알",
  "speak|speak|v.|말하다", "needlessly|needlessly|adv.|쓸데없이", "fired|fire|v.|(총을) 쏘다, 발사하다", "hurtful|hurtful|adj.|상처를 주는", "mean|mean|v.|의도하다, 진심으로 말하다",
]);
cards("pr029", "fa2909b45c", [
  "habit|habit|n.|습관", "improve|improve|v.|좋아지다, 나아지다", "remind|remind|v.|상기시키다, 일깨우다", "allow|allow|v.|~하게 하다, 허락하다", "direct|direct|adj.|직접적인",
  "result|result|n.|결과", "innocent|innocent|adj.|악의 없는", "noticing|notice|v.|알아차리다", "interrupting|interrupt|v.|(말을) 가로막다, 끼어들다",
  "communicate|communicate|v.|대화하다, 소통하다", "relaxed|relaxed|adj.|편안한", "listened|listen|v.|귀 기울이다 (be listened to 경청되다)", "patient|patient|adj.|참을성 있는",
  "interactions|interaction|n.|교류, 상호 작용",
]);
cards("pr030", "5c667c3869", [
  "letter|letter|n.|편지", "receiving|receive|v.|받다", "heartfelt|heartfelt|adj.|진심 어린", "simple|simple|adj.|단순한", "appreciation|appreciation|n.|감사",
  "gratitude|gratitude|n.|고마움", "purpose|purpose|n.|목적", "express|express|v.|표현하다", "blessed|blessed|adj.|축복받은", "amazed|amazed|adj.|놀란",
  "slows|slow|v.|(slow down) 속도를 늦추게 하다", "appear|appear|v.|(목록에) 오르다, 나타나다", "grateful|grateful|adj.|고마워하는", "chain|chain|n.|연쇄, 이어짐 (a chain of 일련의)",
]);
cards("pr031", "1a11f72801", [
  "dangerous|dangerous|adj.|위험한", "young|young|adj.|젊은 (the young 젊은이들)", "battle|battle|n.|싸움, 전투", "conscience|conscience|n.|양심", "friend|friend|n.|친구",
  "equipment|equipment|n.|장비, 갖춤", "enemy|enemy|n.|적", "bad|bad|adj.|나쁜", "best|best|adj.|가장 좋은 (good의 최상급)", "life|life|n.|삶",
  "good|good|adj.|좋은", "so|so|adv.|(no ~ so good as) ~만큼 그렇게", "can|can|v.|~할 수 있다 (조동사)", "have|have|v.|가지다",
]);
cards("pr032", "c08471846c", [
  "country|country|n.|나라 (from country to country 나라마다)", "noise|noise|n.|소리, 소음", "eating|eat|v.|먹다", "table|table|n.|식탁 (the dinner table)",
  "never|never|adv.|결코 ~않다 (never more true than ~만큼 잘 들어맞는 때가 없다)", "dinner|dinner|n.|저녁 식사", "utensils|utensil|n.|식기, 도구 (eating utensils 식사 도구)",
  "differ|differ|v.|다르다", "old|old|adj.|오래된 (old saying 옛말)", "true|true|adj.|들어맞는, 사실인", "slurping|slurp|v.|후루룩 소리 내며 먹다", "noodles|noodle|n.|국수",
  "western|western|adj.|서양의", "saying|saying|n.|속담, 격언",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
