// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Manual full review of all 3,874 VOCA word→meaning pairs (reviewer: QA).
// Each entry: word -> [shown meaning issue class, suggested correct core meaning].
// Classes: WRONG_SENSE (primary/curricular sense missing, wrong sense shown), TRANSLITERATION (Korean loan-spelling of the English word, not a meaning),
// INAPPROPRIATE (sense unsuitable/offensive for school vocabulary), POS (wrong part of speech form that misleads), MALFORMED (broken data).
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const F = {
  see: ["WRONG_SENSE", "보다"], well: ["WRONG_SENSE", "잘; 건강한"], live: ["TRANSLITERATION", "살다"], put: ["WRONG_SENSE", "놓다, 두다"], let: ["WRONG_SENSE", "~하게 하다"],
  shall: ["WRONG_SENSE", "~할 것이다"], ever: ["WRONG_SENSE", "언젠가, 한 번이라도"], hit: ["TRANSLITERATION", "치다, 때리다"], wrong: ["POS", "잘못된, 틀린"],
  follow: ["TRANSLITERATION", "따르다, 따라가다"], rock: ["TRANSLITERATION", "바위"], few: ["WRONG_SENSE", "(수가) 적은, 몇몇의"], show: ["TRANSLITERATION", "보여주다"],
  wait: ["POS", "기다리다"], fly: ["WRONG_SENSE", "날다 (파리)"], listen: ["POS", "듣다"], cold: ["WRONG_SENSE", "추운 (감기)"], notebook: ["WRONG_SENSE", "공책 (노트북=laptop)"],
  store: ["WRONG_SENSE", "가게; 저장하다"], hold: ["WRONG_SENSE", "잡다, 들다"], build: ["TRANSLITERATION", "짓다, 세우다"], ride: ["POS", "타다"], cool: ["WRONG_SENSE", "시원한"],
  idle: ["WRONG_SENSE", "게으른, 한가한"], save: ["WRONG_SENSE", "구하다; 저축하다"], note: ["WRONG_SENSE", "메모, 쪽지"], push: ["TRANSLITERATION", "밀다"], lead: ["TRANSLITERATION", "이끌다"],
  blind: ["TRANSLITERATION", "눈이 먼"], burn: ["WRONG_SENSE", "타다, 태우다"], draw: ["WRONG_SENSE", "그리다; 끌다"], drop: ["TRANSLITERATION", "떨어뜨리다"], race: ["WRONG_SENSE", "경주 (인종)"],
  against: ["POS", "~에 반대하여 (전치사)"], blow: ["WRONG_SENSE", "불다"], bit: ["TRANSLITERATION", "조금"], lift: ["TRANSLITERATION", "들어 올리다"], bark: ["WRONG_SENSE", "짖다"],
  raise: ["WRONG_SENSE", "올리다, 기르다"], although: ["WRONG_SENSE", "비록 ~이지만"], hang: ["WRONG_SENSE", "걸다, 매달다"], feed: ["TRANSLITERATION", "먹이를 주다"], luck: ["WRONG_SENSE", "운, 행운"],
  count: ["TRANSLITERATION", "세다"], calender: ["MALFORMED", "철자 오류 (calendar)"], "well-done": ["WRONG_SENSE", "잘 익힌"], express: ["TRANSLITERATION", "표현하다"], stream: ["TRANSLITERATION", "개울, 시내"],
  enter: ["WRONG_SENSE", "들어가다"], merry: ["TRANSLITERATION", "즐거운"], lay: ["WRONG_SENSE", "놓다; 낳다"], bore: ["TRANSLITERATION", "지루하게 하다"], march: ["WRONG_SENSE", "3월 (월 이름 목록 안)"],
  may: ["WRONG_SENSE", "5월 (월 이름 목록 안) / ~해도 된다"], crop: ["WRONG_SENSE", "농작물"], saw: ["WRONG_SENSE", "톱 / see의 과거"], stand: ["TRANSLITERATION", "서다"], nail: ["TRANSLITERATION", "손톱; 못"],
  grand: ["TRANSLITERATION", "웅장한"], "gray(grey)": ["MALFORMED", "회색 (현재 '회색회색')"], "autumn(=fall)": ["MALFORMED", "가을 (현재 '가을=가을')"], gay: ["INAPPROPRIATE", "명랑한, 쾌활한"],
  affair: ["INAPPROPRIATE", "일, 사건 (현재 '불륜')"], swift: ["TRANSLITERATION", "빠른"], bush: ["TRANSLITERATION", "덤불"], log: ["TRANSLITERATION", "통나무"], interrupt: ["TRANSLITERATION", "방해하다"],
  compile: ["TRANSLITERATION", "편집하다, 모으다"], display: ["TRANSLITERATION", "전시하다"], dual: ["TRANSLITERATION", "이중의"], twist: ["TRANSLITERATION", "비틀다"], triple: ["TRANSLITERATION", "3배의"],
  account: ["WRONG_SENSE", "계좌; 설명"], outlet: ["WRONG_SENSE", "배출구, 판로"], union: ["WRONG_SENSE", "결합, 연합"], separation: ["WRONG_SENSE", "분리"], disposed: ["WRONG_SENSE", "~하는 경향이 있는"],
  disposition: ["WRONG_SENSE", "기질, 성향"], upside: ["WRONG_SENSE", "위쪽, 윗면"], constant: ["WRONG_SENSE", "끊임없는"], confirmed: ["WRONG_SENSE", "확고한, 상습적인"], determined: ["WRONG_SENSE", "단호한"],
  succeeding: ["WRONG_SENSE", "다음의, 계속되는"], advance: ["WRONG_SENSE", "전진하다"], cast: ["TRANSLITERATION", "던지다"], float: ["TRANSLITERATION", "뜨다"], guard: ["TRANSLITERATION", "지키다; 경비원"],
  prime: ["TRANSLITERATION", "주요한"], link: ["TRANSLITERATION", "연결하다"], splash: ["TRANSLITERATION", "튀기다"], tap: ["TRANSLITERATION", "가볍게 두드리다"], spin: ["TRANSLITERATION", "돌다"],
  creep: ["TRANSLITERATION", "기다"], grip: ["TRANSLITERATION", "꽉 잡다"], instance: ["TRANSLITERATION", "사례, 경우"], motion: ["TRANSLITERATION", "움직임"], hatch: ["TRANSLITERATION", "부화하다"],
  peak: ["TRANSLITERATION", "정상, 절정"], beat: ["WRONG_SENSE", "이기다; 치다"], means: ["WRONG_SENSE", "수단"], elementary: ["WRONG_SENSE", "기초의, 초보의"], found: ["WRONG_SENSE", "설립하다"],
  saying: ["WRONG_SENSE", "속담, 격언"], refresh: ["WRONG_SENSE", "상쾌하게 하다"], drag: ["TRANSLITERATION", "끌다"], slide: ["TRANSLITERATION", "미끄러지다"], bar: ["TRANSLITERATION", "막대; 술집"],
  volume: ["TRANSLITERATION", "책, 권; 음량"], label: ["TRANSLITERATION", "꼬리표"], ancesto: ["MALFORMED", "단어 철자 잘림 (ancestor)"], preoccupy: ["WRONG_SENSE", "몰두하게 하다"],
  postscript: ["TRANSLITERATION", "추신"], outgrow: ["WRONG_SENSE", "~보다 커지다, 벗어나다"], ashore: ["POS", "해안으로, 물가에"], enable: ["WRONG_SENSE", "가능하게 하다"], synonymous: ["POS", "같은 뜻의"],
  economical: ["WRONG_SENSE", "절약하는 (economic과 구별)"], disinterested: ["WRONG_SENSE", "사심 없는, 공평한 (uninterested와 구별)"], beneficent: ["WRONG_SENSE", "자선을 베푸는"],
  historic: ["WRONG_SENSE", "역사적으로 중요한 (historical과 구별)"], regretful: ["WRONG_SENSE", "후회하는 (regrettable과 구별)"], resolution: ["WRONG_SENSE", "결심, 결의; 해결"],
  commit: ["TRANSLITERATION", "저지르다; 약속하다"], escalate: ["TRANSLITERATION", "확대되다"], instant: ["TRANSLITERATION", "즉각적인"], ecstasy: ["INAPPROPRIATE", "황홀경 (현재 '엑스터시')"],
  digest: ["TRANSLITERATION", "소화하다"], genuine: ["WRONG_SENSE", "진짜의, 진실한"], integrity: ["WRONG_SENSE", "정직, 성실"], attachment: ["WRONG_SENSE", "애착; 부착"], release: ["TRANSLITERATION", "풀어주다, 발표하다"],
  relay: ["TRANSLITERATION", "중계하다, 전달하다"], directory: ["TRANSLITERATION", "명부"], probe: ["TRANSLITERATION", "조사하다"], implement: ["WRONG_SENSE", "실행하다; 도구"], utility: ["TRANSLITERATION", "유용성; 공공시설"],
  vocal: ["TRANSLITERATION", "목소리의"], viewer: ["TRANSLITERATION", "시청자"], venture: ["TRANSLITERATION", "모험(하다)"], convention: ["TRANSLITERATION", "관습; 대회"], suspension: ["TRANSLITERATION", "정지, 보류"],
  moving: ["WRONG_SENSE", "감동적인"], minor: ["WRONG_SENSE", "작은, 중요하지 않은"], ministry: ["WRONG_SENSE", "(정부의) 부처"], conceive: ["WRONG_SENSE", "생각해 내다, 품다"], conception: ["WRONG_SENSE", "개념, 구상"],
  bond: ["WRONG_SENSE", "유대, 결속"], bind: ["TRANSLITERATION", "묶다"], barrel: ["TRANSLITERATION", "통"], alien: ["WRONG_SENSE", "외국의, 이질적인"], concrete: ["WRONG_SENSE", "구체적인"],
  render: ["WRONG_SENSE", "~하게 만들다; 제공하다"], due: ["WRONG_SENSE", "~하기로 되어 있는; ~때문에"], tense: ["WRONG_SENSE", "긴장한"], tend: ["POS", "~하는 경향이 있다"], pant: ["WRONG_SENSE", "헐떡이다"],
  appeal: ["WRONG_SENSE", "호소하다; 매력"], ware: ["WRONG_SENSE", "제품, 상품"], capture: ["TRANSLITERATION", "붙잡다"], carrier: ["TRANSLITERATION", "운반인, 매개체"], casual: ["TRANSLITERATION", "우연한, 격식 없는"],
  process: ["TRANSLITERATION", "과정"], edition: ["TRANSLITERATION", "판(版)"], comment: ["TRANSLITERATION", "논평"], manual: ["TRANSLITERATION", "손으로 하는; 설명서"], mechanism: ["TRANSLITERATION", "구조, 기제"],
  promotion: ["TRANSLITERATION", "승진; 촉진"], commission: ["TRANSLITERATION", "위원회; 위임"], option: ["TRANSLITERATION", "선택권"], orientation: ["TRANSLITERATION", "방향, 성향"], penalty: ["TRANSLITERATION", "처벌, 벌금"],
  segment: ["TRANSLITERATION", "부분"], routine: ["TRANSLITERATION", "일상적인 일"], text: ["TRANSLITERATION", "본문"], tone: ["TRANSLITERATION", "어조"], terminal: ["TRANSLITERATION", "말기의; 종착역"],
  pose: ["TRANSLITERATION", "제기하다; 자세"], navigation: ["TRANSLITERATION", "항해, 항법"], messenger: ["TRANSLITERATION", "전달자"], sponsor: ["TRANSLITERATION", "후원자"], session: ["TRANSLITERATION", "회기, 시간"],
  initiative: ["TRANSLITERATION", "주도권, 계획"], curriculum: ["TRANSLITERATION", "교육과정"], recreation: ["TRANSLITERATION", "휴양, 오락"], graphic: ["TRANSLITERATION", "생생한; 도표의"], melody: ["TRANSLITERATION", "선율"],
  collection: ["TRANSLITERATION", "수집(품)"], mansion: ["TRANSLITERATION", "대저택"], lever: ["TRANSLITERATION", "지렛대"], container: ["TRANSLITERATION", "용기, 그릇"], entertainment: ["TRANSLITERATION", "오락, 대접"],
  fantasy: ["TRANSLITERATION", "공상"], pattern: ["TRANSLITERATION", "양식, 무늬"], ferry: ["TRANSLITERATION", "연락선"], "facsimile": ["TRANSLITERATION", "복제, 팩스"], influenza: ["TRANSLITERATION", "독감"],
  reception: ["TRANSLITERATION", "환영회; 접수"], discharge: ["WRONG_SENSE", "방출하다; 해고하다"], remote: ["WRONG_SENSE", "먼, 외딴"], moderate: ["WRONG_SENSE", "적당한, 온건한"], intermediate: ["WRONG_SENSE", "중간의"],
  resume: ["WRONG_SENSE", "재개하다"], estimate: ["WRONG_SENSE", "추정(하다)"], major: ["WRONG_SENSE", "주요한"], critical: ["WRONG_SENSE", "비판적인; 결정적인"], abstract: ["POS", "추상적인"],
  extract: ["WRONG_SENSE", "추출하다"], compound: ["WRONG_SENSE", "합성의; 복합체"], deposit: ["WRONG_SENSE", "맡기다; 퇴적물"], used: ["WRONG_SENSE", "익숙한; 중고의"], confident: ["POS", "자신 있는"],
  "insistence,-cy": ["MALFORMED", "insistence (따옴표/접미사 표기 포함)"], elaborate: ["POS", "정교한; 자세히 말하다"], appreciative: ["POS", "감사하는"], credulous: ["POS", "잘 믿는"],
  stop: ["WRONG_SENSE", "멈추다"], cut: ["WRONG_SENSE", "자르다"], cook: ["WRONG_SENSE", "요리하다"], cover: ["TRANSLITERATION", "덮다"], dance: ["TRANSLITERATION", "춤추다"], corner: ["TRANSLITERATION", "모퉁이"],
  course: ["TRANSLITERATION", "과정, 강좌"], turn: ["WRONG_SENSE", "돌다, 돌리다"], catch: ["POS", "잡다"], finish: ["WRONG_SENSE", "끝내다"], top: ["WRONG_SENSE", "꼭대기"], close: ["WRONG_SENSE", "닫다; 가까운"],
  print: ["WRONG_SENSE", "인쇄하다"], field: ["TRANSLITERATION", "들판; 분야"], "return": ["WRONG_SENSE", "돌아오다"], ready: ["POS", "준비된"], pull: ["POS", "당기다"], pass: ["WRONG_SENSE", "지나가다; 합격하다"],
  jump: ["TRANSLITERATION", "뛰다"], paint: ["WRONG_SENSE", "칠하다; 그리다"], shake: ["POS", "흔들다"], line: ["TRANSLITERATION", "선, 줄"], sign: ["WRONG_SENSE", "표지판; 서명하다"], treat: ["WRONG_SENSE", "대하다; 치료하다"],
  order: ["WRONG_SENSE", "명령; 순서; 주문"], notice: ["WRONG_SENSE", "알아차리다; 공고"], slow: ["POS", "느린"], mark: ["TRANSLITERATION", "표시"], point: ["TRANSLITERATION", "요점; 가리키다"], throw: ["POS", "던지다"],
  speaker: ["TRANSLITERATION", "연설자, 화자"], center: ["TRANSLITERATION", "중심"], cross: ["WRONG_SENSE", "건너다"], rise: ["WRONG_SENSE", "오르다"], set: ["TRANSLITERATION", "놓다; 한 벌"], case: ["TRANSLITERATION", "경우; 상자"],
  master: ["TRANSLITERATION", "주인; 숙달하다"], season: ["TRANSLITERATION", "계절"], control: ["WRONG_SENSE", "통제(하다)"], stamp: ["TRANSLITERATION", "우표"], hall: ["TRANSLITERATION", "회관, 복도"], gate: ["TRANSLITERATION", "문"],
  stick: ["TRANSLITERATION", "막대기; 붙이다"], host: ["TRANSLITERATION", "주인, 주최자"], event: ["TRANSLITERATION", "사건, 행사"], post: ["TRANSLITERATION", "우편; 기둥"], double: ["TRANSLITERATION", "두 배의"], knock: ["TRANSLITERATION", "두드리다"],
  recorder: ["TRANSLITERATION", "녹음기; 리코더(악기)"], cage: ["TRANSLITERATION", "새장, 우리"], band: ["TRANSLITERATION", "악단; 띠"], mail: ["TRANSLITERATION", "우편"], couple: ["TRANSLITERATION", "한 쌍, 부부"], trick: ["TRANSLITERATION", "속임수"],
  guide: ["TRANSLITERATION", "안내하다"], track: ["TRANSLITERATION", "자국; 경주로"], manager: ["TRANSLITERATION", "관리자"], main: ["TRANSLITERATION", "주요한"], community: ["TRANSLITERATION", "공동체"], base: ["TRANSLITERATION", "기초"],
  board: ["TRANSLITERATION", "판자; 게시판"], kick: ["TRANSLITERATION", "차다"], roll: ["TRANSLITERATION", "구르다"], flat: ["TRANSLITERATION", "평평한"], level: ["TRANSLITERATION", "수준"], item: ["TRANSLITERATION", "항목, 품목"],
  dash: ["TRANSLITERATION", "돌진하다"], section: ["TRANSLITERATION", "부분, 구역"], booth: ["TRANSLITERATION", "칸막이 공간"], uniform: ["TRANSLITERATION", "제복; 균일한"], single: ["TRANSLITERATION", "단 하나의; 독신의"],
  series: ["TRANSLITERATION", "연속"], premium: ["TRANSLITERATION", "보험료; 할증금"], design: ["TRANSLITERATION", "설계(하다)"], dart: ["TRANSLITERATION", "화살; 돌진하다"], stress: ["TRANSLITERATION", "압박; 강조"],
  miniature: ["TRANSLITERATION", "축소 모형"], inning: ["TRANSLITERATION", "(야구) 회"], site: ["TRANSLITERATION", "장소, 부지"], torch: ["TRANSLITERATION", "횃불"], pop: ["TRANSLITERATION", "펑 터지다"], pitch: ["TRANSLITERATION", "던지다; 음높이"],
  solution: ["TRANSLITERATION", "해결책; 용액"], lantern: ["TRANSLITERATION", "등불"], wagon: ["TRANSLITERATION", "마차"], scratch: ["TRANSLITERATION", "긁다"], coil: ["TRANSLITERATION", "고리; 감다"], ivy: ["TRANSLITERATION", "담쟁이덩굴"],
  sheet: ["TRANSLITERATION", "(종이) 한 장"], bundle: ["TRANSLITERATION", "묶음"], sample: ["TRANSLITERATION", "견본"], version: ["TRANSLITERATION", "판, 변형"], gallery: ["TRANSLITERATION", "화랑"], chain: ["TRANSLITERATION", "사슬"],
  privacy: ["TRANSLITERATION", "사생활"], military: ["POS", "군사의"], tire: ["WRONG_SENSE", "지치게 하다 (타이어)"], junior: ["WRONG_SENSE", "손아래의"], sink: ["WRONG_SENSE", "가라앉다"], press: ["WRONG_SENSE", "누르다"],
  private: ["WRONG_SENSE", "사적인, 개인의"], regular: ["WRONG_SENSE", "규칙적인, 정기적인"], correct: ["WRONG_SENSE", "정확한; 고치다"], current: ["WRONG_SENSE", "현재의; 흐름"], spot: ["WRONG_SENSE", "장소; 발견하다"],
  capital: ["WRONG_SENSE", "수도; 자본"], sight: ["WRONG_SENSE", "시야, 광경"], extra: ["WRONG_SENSE", "여분의"], furious: ["WRONG_SENSE", "격노한"], type: ["WRONG_SENSE", "유형; 타자치다"], relief: ["WRONG_SENSE", "안도"],
  view: ["WRONG_SENSE", "경치; 견해"], operation: ["WRONG_SENSE", "수술; 작전; 운영"], reverse: ["WRONG_SENSE", "뒤집다; 반대의"], hardness: ["WRONG_SENSE", "단단함"], bid: ["WRONG_SENSE", "명령하다; 입찰"], rear: ["WRONG_SENSE", "기르다; 뒤쪽"],
  primary: ["WRONG_SENSE", "주요한; 초등의"], rural: ["POS", "시골의"], independent: ["POS", "독립적인"], neutral: ["POS", "중립의"], civil: ["WRONG_SENSE", "시민의; 예의 바른"], quarter: ["WRONG_SENSE", "4분의 1"],
  meanly: ["WRONG_SENSE", "비열하게; 초라하게"], icy: ["POS", "얼음같이 찬"], terror: ["WRONG_SENSE", "공포"], trace: ["WRONG_SENSE", "흔적"], commercial: ["POS", "상업의; 광고"], advanced: ["WRONG_SENSE", "진보한; 고급의"],
  foremost: ["POS", "가장 중요한, 맨 앞의"], transform: ["WRONG_SENSE", "변형시키다"], transfer: ["WRONG_SENSE", "옮기다"], aboard: ["POS", "(탈것에) 타고"], occasional: ["POS", "가끔의"], behold: ["WRONG_SENSE", "보다"],
  abide: ["WRONG_SENSE", "참다; 준수하다"], comparative: ["POS", "비교의, 상대적인"], corresponding: ["WRONG_SENSE", "상응하는"], cooperative: ["WRONG_SENSE", "협력적인"], upset: ["WRONG_SENSE", "속상한"], owe: ["POS", "빚지다"],
  whisper: ["POS", "속삭이다"], surround: ["TRANSLITERATION", "둘러싸다"], review: ["WRONG_SENSE", "복습; 검토"], row: ["WRONG_SENSE", "줄, 열"], gamble: ["WRONG_SENSE", "도박하다"], constant_: null,
};
delete F.constant_;
const lines = fs.readFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/voca-meanings.txt", "utf8").split("\n").map((l) => l.split("|"));
const dict = JSON.parse(fs.readFileSync(`${REPO}/content/voca_dictionary.json`, "utf8"));
const idx = JSON.parse(fs.readFileSync(`${REPO}/content/courses/phonics.json`, "utf8"));
const occ = new Map();
for (const g of idx.groups) for (const id of g.lessons) {
  const L = JSON.parse(fs.readFileSync(`${REPO}/content/lessons/phonics/${id}.json`, "utf8"));
  for (const w of L.blocks.find((b) => b.type === "wordgrid").rows.flat().map((x) => x?.trim()).filter(Boolean)) {
    const k = w.toLowerCase(); if (!occ.has(k)) occ.set(k, []); occ.get(k).push(id);
  }
}
const out = [];
const byClass = {};
for (const [w, [cls, fix]] of Object.entries(F)) {
  const k = w.toLowerCase();
  if (!occ.has(k)) { console.log("not in lessons:", w); continue; }
  const shown = dict[k]?.meaning ?? dict[w]?.meaning;
  out.push({ word: w, lessons: [...new Set(occ.get(k))], shown, class: cls, suggested: fix });
  byClass[cls] = (byClass[cls] || 0) + 1;
}
const lessonsAffected = new Set(out.flatMap((o) => o.lessons));
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/voca-meaning-defects.json", JSON.stringify(out, null, 1));
console.log("flagged words", out.length, byClass, "cells", out.reduce((a, o) => a + occ.get(o.word.toLowerCase()).length, 0), "lessons affected", lessonsAffected.size);
