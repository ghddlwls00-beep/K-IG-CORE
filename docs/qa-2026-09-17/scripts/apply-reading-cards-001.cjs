#!/usr/bin/env node
/**
 * READING vocabulary cards pr001–pr016 (ISS-10: RV-00 part of speech, RV-01/02 meanings,
 * RV-03 words not in the passage, R-00 script-page copies). Every card was read against the
 * lesson's corrected passage; the meaning is the sense the passage uses, the part of speech is
 * the one it has in the passage. Cards whose word is no longer in the passage (the passage was
 * corrected) or that taught nothing are replaced with a key word from the same passage.
 * Format and checks: lib-reading-cards.cjs.   node apply-reading-cards-001.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr001", "7828fdcd77", [
  "fathers|father|n.|아버지", "create|create|v.|(문제를) 일으키다, 만들어 내다", "differently|differently|adv.|다르게", "mothers|mother|n.|어머니",
  "counsel|counsel|n.|조언, 충고", "doomed|doomed|adj.|~할 운명인 (be doomed to)", "miscommunicate|miscommunicate|v.|서로 뜻이 잘못 전해지다, 오해하다",
  "other-sex|other-sex|adj.|성별이 다른", "speaking|speaking|n.|말하기 (way of speaking 말하는 방식)", "parents|parent|n.|부모",
  "respect|respect|v.|존중하다", "girls|girl|n.|여자아이", "communication|communication|n.|의사소통, 대화", "successful|successful|adj.|성공적인",
]);
cards("pr002", "eca3cf6dd3", [
  "=poorer", "=cleaner", "=continued", "producing|produce|v.|(연기 등을) 내뿜다, 만들어 내다", "=dirty", "private|private|adj.|민간의 (private organizations 민간단체)",
  "=air", "trying|try|v.|애쓰다, 노력하다", "quality|quality|n.|질 (the quality of air 공기의 질)", "organizations|organization|n.|단체, 조직",
  "putting|put|v.|(~ 속으로) 내보내다, 넣다", "=oxygen", "chemicals|chemical|n.|화학 물질", "tank|tank|n.|(산소 등을 담는) 통, 탱크",
]);
cards("pr003", "e2f7bbe67c", [
  "plant|plant|n.|식물", "=nature", "healthy|healthy|adj.|건강한", "=environment", "=river", "=balance", "smallest|small|adj.|가장 작은 (small의 최상급)",
  "conditions|condition|n.|조건, 환경 (living conditions 생활 조건)", "unlivable|unlivable|adj.|생물이 살 수 없는", "change|change|n.|변화",
  "living|living|adj.|생활의, 살아가는", "fish|fish|n.|물고기", "dammed|dam|v.|댐으로 막다 (be dammed 댐으로 막히다)", "hurt|hurt|v.|해치다, 손상시키다",
]);
cards("pr004", "43a215c803", [
  "created|create|v.|만들다, 창작하다", "express|express|v.|표현하다", "country|country|n.|나라", "families|family|n.|가족", "sad|sad|adj.|슬픈",
  "origin|origin|n.|기원, 유래", "wanted|want|v.|원하다", "rhythms|rhythm|n.|리듬", "foreign|foreign|adj.|외국의", "used|use|v.|쓰이다, 사용되다 (was used)",
  "slaves|slave|n.|노예", "colder|cold|adj.|더 추운 (cold의 비교급)", "zones|zone|n.|지역, 지대", "missed|miss|v.|그리워하다",
]);
cards("pr005", "bb6d0adc3c", [
  "accepting|accept|v.|받아들이다", "ideas|idea|n.|생각, 의견", "begin|begin|v.|시작하다", "teenager|teenager|n.|십대", "sometimes|sometimes|adv.|때때로",
  "question|question|v.|의문을 제기하다, 의심하다", "instead|instead|adv.|대신에 (instead of ~ 대신에)", "adults|adult|n.|어른", "blindly|blindly|adv.|맹목적으로, 무턱대고",
  "gradually|gradually|adv.|점차", "unique|unique|adj.|독특한", "attitudes|attitude|n.|태도", "lifestyle|lifestyle|n.|생활 방식",
  "put|put|v.|말하다 (to put it another way 다시 말하면); (put together) 꾸리다",
]);
cards("pr006", "0553b71525", [
  "law|law|n.|법, 법칙", "=nature", "different|different|adj.|다른", "describe|describe|v.|설명하다, 묘사하다", "considered|consider|v.|~로 여기다 (be considered ~로 여겨지다)",
  "used|use|v.|쓰이다 (as used in ~에서 쓰인 대로)", "rules|rule|n.|규칙", "consciously|consciously|adv.|의식적으로", "term|term|n.|용어", "meaning|meaning|n.|의미",
  "phrases|phrase|n.|어구, 표현", "regularities|regularity|n.|규칙성", "certain|certain|adj.|일정한 (a certain number 일정한 수)", "unchangeable|unchangeable|adj.|바꿀 수 없는, 불변의",
]);
const MUSIC = [
  "music|music|n.|음악", "meaning|meaning|n.|의미", "difficulty|difficulty|n.|어려움", "words|word|n.|말 (in so many words 말로 분명하게)", "state|state|v.|말하다, 진술하다",
  "expressive|expressive|adj.|표현력 있는", "answer|answer|n.|대답", "certain|certain|adj.|어떤 (a certain meaning 어떤 의미)", "belief|belief|n.|믿음, 신념",
  "power|power|n.|힘 (expressive power 표현력)", "constitutes|constitute|v.|구성하다, ~을 이루다", "notes|note|n.|음, 음표", "therein|therein|adv.|거기에 (Therein lies ~ 바로 거기에 ~이 있다)",
  "asking|ask|v.|묻다",
];
cards("pr007", "468bd96845", MUSIC);
cards("pr012", "468bd96845", MUSIC);
cards("pr008", "c7cf231b31", [
  "brain|brain|n.|뇌, 두뇌", "naturally|naturally|adv.|선천적으로, 본래", "accepted|accept|v.|받아들이다", "world|world|n.|세계", "established|established|adj.|기존의, 확립된 (the established order 기존 질서)",
  "average|average|adj.|보통의, 평균적인", "resistance|resistance|n.|저항 (the line of least resistance 가장 쉬운 길)", "tends|tend|v.|~하는 경향이 있다", "hostile|hostile|adj.|적대적인",
  "familiar|familiar|adj.|익숙한", "questioning|questioning|n.|의심, 캐묻기 (without questioning 의심 없이)", "attached|attached|adj.|애착을 가진 (be attached to ~에 집착하다)",
  "instinctively|instinctively|adv.|본능적으로", "upset|upset|v.|뒤엎다, 어지럽히다",
]);
cards("pr009", "7ae81150a5", [
  "knowledge|knowledge|n.|지식", "brain|brain|n.|두뇌 (brain power 두뇌의 힘)", "natural|natural|adj.|자연의 (natural resources 천연자원)", "societies|society|n.|사회",
  "changing|change|v.|바뀌다 (change into ~로 바뀌다)", "far|far|adv.|훨씬 (far more 훨씬 더)", "economy|economy|n.|경제", "economic|economic|adj.|경제의",
  "based|base|v.|~에 바탕을 두다 (based on ~에 바탕을 둔)", "resourcefulness|resourcefulness|n.|지략, 수완", "industrial|industrial|adj.|산업의",
  "competition|competition|n.|경쟁", "technology|technology|n.|기술", "guarantee|guarantee|v.|보장하다",
]);
cards("pr010", "d284c0d5cf", [
  "creates|create|v.|일으키다, 만들어 내다", "protected|protect|v.|보호하다 (remain protected 계속 보호되다)", "safety|safety|n.|안전", "remain|remain|v.|계속 ~인 채로 있다",
  "internet|internet|n.|인터넷", "safe|safe|adj.|안전한", "challenges|challenge|n.|과제, 어려운 문제", "security|security|n.|보안", "important|important|adj.|중요한",
  "secrets|secret|n.|비밀", "rise|rise|n.|증가 (on the rise 늘고 있는)", "measures|measure|n.|조치 (take measures 조치를 취하다)", "businesses|business|n.|기업, 회사",
  "need|need|v.|~할 필요가 있다",
]);
cards("pr011", "6572965fb5", [
  "sightseeing|sightseeing|n.|관광", "help|help|v.|돕다", "future|future|n.|미래", "space|space|n.|우주", "extra|extra|adj.|추가의, 여분의", "perhaps|perhaps|adv.|아마",
  "trips|trip|n.|여행", "giant|giant|adj.|거대한", "bring|bring|v.|가져오다 (what the future will bring 미래에 일어날 일)", "power|power|n.|동력, 전력",
  "moon|moon|n.|달", "telescope|telescope|n.|망원경", "station|station|n.|발전소 (solar power station 태양광 발전소)", "flights|flight|n.|비행",
]);
cards("pr013", "b27b47c1b3", [
  "school|school|n.|학교", "students|student|n.|학생", "earlier|early|adv.|더 일찍, 그 이전에", "develop|develop|v.|키우다, 발전시키다",
  "considered|consider|v.|~로 여기다 (be considered good at ~을 잘한다고 여겨지다)", "required|require|v.|요구하다 (be required to ~하도록 요구받다)", "aptitudes|aptitude|n.|적성",
  "prepare|prepare|v.|준비시키다 (prepare A for B)", "results|result|n.|결과", "follow|follow|v.|추구하다, 좇다", "decide|decide|v.|결정하다", "excel|excel|v.|뛰어나다",
  "specialized|specialized|adj.|전문적인, 전문화된", "employment|employment|n.|취업, 고용",
]);
cards("pr014", "2a406de7c6", [
  "spent|spend|v.|(시간을) 보내다", "far|far|adv.|(far from it) 전혀 그렇지 않다, 오히려 그 반대다", "fear|fear|n.|두려움", "nature|nature|n.|본성 (human nature 인간 본성)",
  "hospital|hospital|n.|병원", "abandoned|abandon|v.|그만두다, 버리다", "regret|regret|v.|후회하다", "hiding|hide|v.|숨기다", "medical|medical|adj.|의학의, 의료의",
  "profession|profession|n.|직업, 전문직", "relief|relief|n.|안도 (with relief 안도하며)", "death|death|n.|죽음", "naked|naked|adj.|꾸밈없는, 적나라한", "generally|generally|adv.|대개",
]);
cards("pr015", "c83d9e9bdf", [
  "observed|observe|v.|알아차리다; (규칙을) 지키다", "worry|worry|n.|걱정", "causes|cause|n.|원인", "potent|potent|adj.|강력한", "unhappiness|unhappiness|n.|불행",
  "distributive|distributive|adj.|분배의 (distributive justice 분배의 공정성)", "unvarying|unvarying|adj.|한결같은", "envy|envy|n.|시기, 질투", "resented|resent|v.|분개하다, 불쾌하게 여기다",
  "probably|probably|adv.|아마", "justice|justice|n.|공정, 정의", "absolute|absolute|adj.|절대적인", "rigid|rigid|adj.|엄격한", "treated|treat|v.|다루다, 대하다",
]);
cards("pr016", "66515625c6", [
  "believe|believe|v.|믿다", "accept|accept|v.|받아들이다", "spend|spend|v.|(시간을) 보내다", "shame|shame|n.|부끄러움", "joys|joy|n.|기쁨", "living|live|v.|살다",
  "dread|dread|v.|몹시 두려워하다", "present|present|n.|현재 (the present)", "unrepeatable|unrepeatable|adj.|되풀이할 수 없는", "trick|trick|n.|비결, 요령",
  "minute|minute|n.|분, 순간", "miracle|miracle|n.|기적", "regret|regret|n.|후회", "long|long|v.|갈망하다 (long for)",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
