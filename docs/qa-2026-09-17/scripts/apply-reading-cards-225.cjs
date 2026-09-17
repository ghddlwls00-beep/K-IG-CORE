#!/usr/bin/env node
/**
 * READING vocabulary cards pr225–pr240 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (atmosphere
 * 분위기 → 대기, shanties 판잣집 → 뱃노래, figures 그림 → 인물, subjects 주제 → 피사체, sources 출처 →
 * 원천, construction 건설 → 구성물, provided 만약 ~라면 → 제공하다, wrestling 레슬링, heating/powering
 * 열/힘, crowded 군중, fire → 해고하다), placeholders written (worthless, junk, storage, ligament),
 * names and contractions removed (suilivan, palladium, peter, isn't, i'm, wimbledon), and cards
 * no longer in the text after the passage fixes (wishes, young, collectible.in, cause, hitting,
 * modifying, using, swing, perform, endorsed, proclaimed, issued) replaced.
 *   node apply-reading-cards-225.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr225", "7b48d890a7", [
  "suggest|suggest|v.|권하다, 제안하다", "believes|believe|v.|믿다", "calm|calm|v.|(calm down) 진정하다", "far|far|adv.|훨씬 (far more sensible 훨씬 더 현명한)",
  "love|love|n.|사랑 (love at first sight 첫눈에 반한 사랑)", "sight|sight|n.|봄 (at first sight 첫눈에)", "qualities|quality|n.|자질, 특성", "undesirable|undesirable|adj.|바람직하지 않은",
  "insist|insist|v.|(insist on) ~을 고집하다", "sensible|sensible|adj.|분별 있는, 현명한", "blind|blind|adj.|눈이 먼 (love is blind 사랑은 맹목적이다)",
  "durable|durable|adj.|오래가는", "attractive|attractive|adj.|매력적인", "formula|formula|n.|공식, 정해진 방식 (storybook formula 동화 같은 공식)",
]);
cards("pr226", "a64187c77d", [
  "science|science|n.|과학", "cause|cause|v.|일으키다", "solve|solve|v.|해결하다", "boast|boast|v.|자랑하다, 큰소리치다", "using|use|v.|사용하다, 활용하다",
  "needed|need|v.|필요로 하다 (be needed 필요하다)", "fullest|full|n.|(to the fullest) 최대한", "admirers|admirer|n.|찬미자", "cleverness|cleverness|n.|영리함",
  "sustain|sustain|v.|부양하다, 지탱하다", "modern|modern|adj.|현대의", "victims|victim|n.|희생자, 피해자", "precise|precise|adj.|정확한 (at the precise time 딱 필요한 때에)",
  "solutions|solution|n.|해결책",
]);
cards("pr227", "6a00c4e681", [
  "expecting|expect|v.|예상하다, 기대하다", "prevent|prevent|v.|(prevent A from -ing) A가 ~하지 못하게 막다", "body|body|n.|몸", "passing|pass|v.|지나가다, 통과하다",
  "accustomed|accustomed|adj.|(be accustomed to -ing) ~에 익숙한", "blankets|blanket|n.|담요", "surrounding|surround|adj.|주위의, 둘러싼", "warm|warm|adj.|따뜻한",
  "ice|ice|n.|얼음", "heat|heat|n.|열", "keeps|keep|v.|(keep A from -ing) A가 ~하지 못하게 하다", "colder|cold|adj.|더 차가운", "melting|melt|v.|녹다",
  "surprised|surprised|adj.|놀란",
]);
cards("pr228", "c5f9b5a3c1", [
  "easy|easy|adj.|쉬운", "difficult|difficult|adj.|어려운", "usher|usher|n.|(극장의) 좌석 안내원", "tired|tired|adj.|피곤한", "theater|theater|n.|극장",
  "intermission|intermission|n.|(공연의) 중간 휴식 시간", "aisle|aisle|n.|통로 (aisle seat 통로 쪽 좌석)", "job|job|n.|일, 직업", "sit|sit|v.|앉다", "stand|stand|v.|서 있다",
  "seat|seat|n.|좌석", "boss|boss|n.|상사", "fire|fire|v.|해고하다", "during|during|prep.|~ 동안",
]);
cards("pr229", "739a717321", [
  "connected|connect|v.|(be connected to) ~과 관련되다", "waste|waste|n.|낭비 (a waste of time 시간 낭비)", "spending|spend|v.|(시간을) 보내다",
  "dreaming|dream|n.|공상, 꿈꾸기", "practical|practical|adj.|실용적인", "pleasure|pleasure|n.|즐거움 (for pleasure 재미로)", "directly|directly|adv.|직접",
  "immediately|immediately|adv.|즉각, 당장", "implies|imply|v.|넌지시 드러내다, 암시하다", "somehow|somehow|adv.|어쩐지, 왠지", "idler|idler|n.|게으름뱅이",
  "unproductive|unproductive|adj.|비생산적인", "literature|literature|n.|문헌 (professional literature 전문 문헌)", "tone|tone|n.|어조, 말투",
]);
cards("pr230", "50f4ccb8e6", [
  "hard|hard|adj.|힘든", "comfort|comfort|n.|위안", "express|express|v.|표현하다", "simple|simple|adj.|소박한, 단순한", "sailors|sailor|n.|선원",
  "shanties|shanty|n.|뱃노래 (sea shanty 선원들의 노동요)", "aboard|aboard|adv.|(배에) 타고", "songs|song|n.|노래", "longing|longing|n.|그리움, 갈망",
  "valuable|valuable|adj.|소중한", "lasted|last|v.|계속되다, 살아남다", "boredom|boredom|n.|지루함", "loneliness|loneliness|n.|외로움", "complain|complain|v.|불평하다",
]);
cards("pr231", "2cee26dae7", [
  "music|music|n.|음악", "failed|fail|v.|(fail to) ~하지 못하다", "arts|art|n.|예술", "contemporary|contemporary|adj.|현대의, 동시대의", "offer|offer|v.|제공하다",
  "reflect|reflect|v.|반영하다", "choice|choice|n.|선택 (first choice 첫 번째 선택)", "turned|turn|v.|(turn to) ~으로 눈을 돌리다", "composer|composer|n.|작곡가",
  "hero|hero|n.|영웅", "interest|interest|n.|관심 (lose interest in ~에 흥미를 잃다)", "popular|popular|adj.|대중적인, 인기 있는", "figures|figure|n.|인물 (popular figures 인기 있는 인물)",
  "masterpiece|masterpiece|n.|걸작",
]);
cards("pr232", "5b747bd01a", [
  "spend|spend|v.|(시간을) 보내다", "destroys|destroy|v.|파괴하다", "causes|cause|v.|일으키다", "nature|nature|n.|자연", "atmosphere|atmosphere|n.|대기",
  "average|average|n.|평균 (an average of 평균 ~)", "harmful|harmful|adj.|해로운", "injured|injure|v.|다치게 하다 (be injured 부상을 입다)", "pumping|pump|v.|(펌프로) 뿜어 넣다",
  "crowded|crowded|adj.|붐비는", "quantities|quantity|n.|양 (huge quantities of 엄청난 양의)", "greenhouse|greenhouse|n.|온실 (greenhouse effect 온실 효과)",
  "costly|costly|adj.|대가가 큰", "lots|lot|n.|(parking lot) 주차장",
]);
cards("pr233", "47e1224298", [
  "truth|truth|n.|진실", "difficult|difficult|adj.|힘든", "democracy|democracy|n.|민주주의", "threatened|threaten|v.|위협하다 (be threatened 위협받다)",
  "fortune|fortune|n.|행운 (have the good fortune to ~하는 행운을 누리다)", "tell|tell|v.|말하다 (tell the truth 진실을 말하다)", "therefore|therefore|adv.|그러므로",
  "ready|ready|adj.|준비된", "fight|fight|v.|(fight for) ~을 위해 싸우다", "right|right|n.|권리", "freedom|freedom|n.|자유", "live|live|v.|살다",
  "decision-makers|decision-maker|n.|의사 결정자", "whenever|whenever|conj.|~할 때마다",
]);
cards("pr234", "228acc67c6", [
  "countries|country|n.|나라", "understanding|understand|v.|이해하다", "cultures|culture|n.|문화", "determine|determine|v.|결정하다", "caused|cause|v.|일으키다",
  "war|war|n.|전쟁 (post-cold war 냉전 이후의)", "complex|complex|adj.|복잡한", "civilizations|civilization|n.|문명", "facing|face|v.|직면하다", "among|among|prep.|~ 사이에",
  "differences|difference|n.|차이", "involving|involve|v.|관련시키다, 끌어들이다", "similarities|similarity|n.|유사점", "conflicts|conflict|n.|분쟁, 갈등",
]);
cards("pr235", "4e6888924b", [
  "remember|remember|v.|(remember to) 잊지 말고 ~하다", "recognized|recognize|v.|알아보다", "photographers|photographer|n.|사진가", "enough|enough|adv.|충분히 (close enough 충분히 가까운)",
  "mistake|mistake|n.|실수", "amateur|amateur|adj.|아마추어의", "subjects|subject|n.|(사진의) 피사체", "unwanted|unwanted|adj.|원치 않는", "physically|physically|adv.|물리적으로",
  "close|close|adj.|가까운", "photograph|photograph|v.|사진을 찍다", "exclude|exclude|v.|빼다, 배제하다", "objects|object|n.|물체, 사물", "frame|frame|n.|(사진의) 화면, 프레임",
]);
cards("pr236", "103bcb7070", [
  "appears|appear|v.|~처럼 보이다", "clean|clean|v.|(clean out) 깨끗이 치우다", "worthless|worthless|adj.|가치 없는", "valuable|valuable|adj.|귀중한", "junk|junk|n.|잡동사니, 폐물",
  "selling|sell|v.|팔다", "painted|paint|v.|그리다", "separate|separate|v.|(separate A from B) A를 B와 구분하다", "potential|potential|n.|가능성, 잠재력",
  "storage|storage|n.|보관 (storage room 창고)", "determine|determine|v.|알아내다, 판단하다", "collectible|collectible|n.|수집품", "antique|antique|adj.|골동품의 (antique dealer 골동품상)",
  "dealer|dealer|n.|상인, 중개상",
]);
cards("pr237", "2296c1b1ef", [
  "harder|hard|adv.|더 세게", "result|result|n.|결과 (as a result of ~의 결과로)", "speed|speed|n.|속도", "fastest|fast|adj.|가장 빠른", "reason|reason|n.|이유",
  "players|player|n.|선수", "favor|favor|n.|(in favor of) ~에 찬성하는", "ligament|ligament|n.|인대", "appeal|appeal|n.|매력", "dominated|dominate|v.|지배하다, 우위를 차지하다",
  "artistry|artistry|n.|예술적 기교", "ridiculous|ridiculous|adj.|터무니없는", "injuries|injury|n.|부상", "swung|swing|v.|(라켓을) 휘두르다",
]);
cards("pr238", "0e6b700a22", [
  "developed|develop|v.|개발하다", "civilization|civilization|n.|문명", "muscles|muscle|n.|근육", "purposes|purpose|n.|목적, 용도", "energy|energy|n.|에너지",
  "essential|essential|adj.|필수적인", "abundant|abundant|adj.|풍부한", "sources|source|n.|원천, 공급원", "provided|provide|v.|제공하다 (provided by ~이 제공하는)",
  "operating|operate|v.|가동하다", "heating|heat|v.|난방하다, 데우다", "powering|power|v.|동력을 공급하다", "scarcer|scarce|adj.|더 부족한, 더 귀한", "pollute|pollute|v.|오염시키다",
]);
cards("pr239", "082db4436d", [
  "illnesses|illness|n.|질병 (terminal illness 말기 질환)", "follow|follow|v.|따르다, 지키다", "refuse|refuse|v.|거부하다", "imprisoned|imprison|v.|투옥하다",
  "doctors|doctor|n.|의사", "guidelines|guideline|n.|지침", "terminal|terminal|adj.|말기의", "wrestling|wrestle|v.|(wrestle with) ~과 씨름하다", "question|question|n.|문제",
  "humane|humane|adj.|인간다운, 인도적인", "dilemma|dilemma|n.|딜레마", "lethal|lethal|adj.|치사의 (lethal injection 치사 주사)", "tolerate|tolerate|v.|용인하다",
  "euthanasia|euthanasia|n.|안락사",
]);
cards("pr240", "c185301c84", [
  "complex|complex|adj.|복잡한", "brain|brain|n.|뇌", "experience|experience|v.|겪다", "sound|sound|n.|소리", "fact|fact|n.|(in fact) 사실은",
  "evidenced|evidence|v.|입증하다 (be evidenced 입증되다)", "memory|memory|n.|기억", "construction|construction|n.|구성물, 짜 맞춘 것", "single|single|adj.|단 하나의",
  "breakdown|breakdown|n.|고장, 붕괴", "retrieves|retrieve|v.|(정보를) 불러오다", "extracted|extract|v.|뽑아내다, 추출하다", "region|region|n.|영역, 부위",
  "assembly|assembly|n.|조립, 결합",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
