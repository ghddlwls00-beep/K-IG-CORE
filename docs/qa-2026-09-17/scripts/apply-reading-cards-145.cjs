#!/usr/bin/env node
/**
 * READING vocabulary cards pr145–pr160 (ISS-10: RV-16, RV-17, RV-18; R-00). Read card by card
 * against each corrected passage — see apply-reading-cards-001.cjs. Wrong senses fixed (united /
 * states cut from "United States", openly ≠ 열다, shop = 쇼핑하다, fails = 고장 나다, warming =
 * 온난화), placeholders written (consumer-driven, insecure), "isn't" and cards from the summary
 * sentence removed with pr159's exam line (experience, influence) replaced. pr151's 14 cards were
 * written with its new passage (R-64) and are kept.
 *   node apply-reading-cards-145.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr145", "e26b132e4d", [
  "society|society|n.|사회", "complex|complex|adj.|복잡한", "culture|culture|n.|문화", "created|create|v.|만들다", "improving|improve|v.|개선하다",
  "consumer-driven|consumer-driven|adj.|소비가 이끄는", "helpless|helpless|adj.|무력한", "insecure|insecure|adj.|불안한", "superhuman|superhuman|adj.|초인적인",
  "economy|economy|n.|경제", "shop|shop|v.|쇼핑하다", "harsh|harsh|adj.|가혹한", "consume|consume|v.|소비하다", "lot|lot|n.|처지, 운명 (our lot 우리의 처지)",
]);
cards("pr146", "482a7b9c77", [
  "encourage|encourage|v.|부추기다", "invented|invent|v.|발명하다", "save|save|v.|(돈을) 아껴 주다", "fails|fail|v.|고장 나다", "disposable|disposable|adj.|일회용의",
  "reuse|reuse|v.|재사용하다", "razors|razor|n.|면도기", "repair|repair|v.|수리하다", "manufacturers|manufacturer|n.|제조업체", "attitude|attitude|n.|태도",
  "recycle|recycle|v.|재활용하다", "discarded|discard|v.|버리다 (be discarded 버려지다)", "filled|fill|v.|(be filled with) ~로 가득하다", "items|item|n.|물품",
]);
cards("pr147", "82f476c971", [
  "developed|develop|v.|발전시키다", "countries|country|n.|나라", "achieved|achieve|v.|이루다", "providing|provide|v.|제공하다", "improved|improve|v.|개선하다",
  "overcrowded|overcrowded|adj.|인구 과밀의", "incentives|incentive|n.|유인책, 장려책", "rural|rural|adj.|농촌의", "sanitation|sanitation|n.|위생 (시설)",
  "poverty|poverty|n.|빈곤", "urban|urban|adj.|도시의", "foster|foster|v.|키우다, 조성하다", "facilities|facility|n.|시설", "unemployment|unemployment|n.|실업",
]);
cards("pr148", "6315f7827f", [
  "allow|allow|v.|~할 수 있게 하다", "caused|cause|v.|일으키다", "solve|solve|v.|해결하다", "computers|computer|n.|컴퓨터", "unwanted|unwanted|adj.|쓸모없어진, 원치 않는",
  "thrown|throw|v.|(throw away) 버리다", "recycled|recycle|v.|재활용하다", "million|million|n.|백만", "dump|dump|n.|쓰레기 매립장", "industry|industry|n.|산업",
  "concluded|conclude|v.|결론을 내리다", "changes|change|n.|변화", "parts|part|n.|부품", "built|build|v.|만들다, 조립하다",
]);
cards("pr149", "f196c3fa44", [
  "countries|country|n.|나라", "narrow-mindedness|narrow-mindedness|n.|편협함", "fear|fear|n.|두려움", "results|result|n.|결과", "believe|believe|v.|믿다",
  "society|society|n.|사회", "deeply|deeply|adv.|깊이 (deeply held beliefs 깊이 뿌리박힌 신념)", "greed|greed|n.|탐욕", "intolerance|intolerance|n.|불관용 (religious intolerance 종교적 불관용)",
  "destructive|destructive|adj.|파괴적인", "simplistic|simplistic|adj.|지나치게 단순한", "turned|turn|v.|(turn into) ~으로 변하다", "religious|religious|adj.|종교적인", "crises|crisis|n.|위기",
]);
cards("pr150", "31acdbaa0b", [
  "improve|improve|v.|개선하다", "earth|earth|n.|지구", "environment|environment|n.|환경", "created|create|v.|만들어 내다", "changed|change|v.|바꾸다",
  "modern|modern|adj.|현대의 (modern humans 현생 인류)", "lived|live|v.|살다", "planet|planet|n.|행성", "already|already|adv.|이미", "warming|warming|n.|온난화 (global warming 지구 온난화)",
  "action|action|n.|행동 (take action 행동에 나서다)", "traffic|traffic|n.|교통 (traffic pollution 교통 공해)", "serious|serious|adj.|심각한", "pollution|pollution|n.|오염, 공해",
]);
cards("pr151", "80536d3c40", ["=striking", "=similarities", "=musical", "=instrument", "=require", "=daily", "=practice", "=careful", "=courage", "=mistakes", "=fact", "=easier", "=rhythm", "=stress"]);
cards("pr152", "54c01b434f", [
  "support|support|n.|지지, 응원", "honest|honest|adj.|솔직한", "remarks|remark|n.|말 (positive remarks 긍정적인 말)", "approval|approval|n.|인정, 칭찬", "ask|ask|v.|(ask for) 구하다",
  "painting|painting|n.|그림", "openly|openly|adv.|드러내 놓고", "therefore|therefore|adv.|그러므로", "forget|forget|v.|잊다", "praise|praise|v.|칭찬하다",
  "need|need|n.|필요, 욕구 (need for support 지지받고 싶은 마음)", "child|child|n.|아이", "grown-up|grown-up|n.|어른", "adults|adult|n.|성인",
]);
cards("pr153", "26d4cea1ca", [
  "music|music|n.|음악", "sounding|sound|v.|울리다 (sounding together 함께 울림)", "creates|create|v.|만들어 내다", "different|different|adj.|여러, 다른", "produce|produce|v.|만들어 내다",
  "purpose|purpose|n.|목적", "result|result|n.|결과", "symphony|symphony|n.|교향곡 (symphony orchestra 교향악단)", "composers|composer|n.|작곡가", "art|art|n.|예술 (works of art 예술 작품)",
  "section|section|n.|(악단의) 파트 (section by section 파트별로)", "together|together|adv.|함께", "instruments|instrument|n.|악기", "orchestra|orchestra|n.|오케스트라, 관현악단",
]);
cards("pr154", "62006eca86", [
  "suggest|suggest|v.|말하다, 시사하다", "difficulties|difficulty|n.|어려움", "complex|complex|adj.|복잡한", "stronger|strong|adj.|더 질긴 (strong의 비교급)", "process|process|n.|과정",
  "branches|branch|n.|나뭇가지", "flexible|flexible|adj.|유연한", "disciplined|disciplined|adj.|단련된", "overcoming|overcome|v.|극복하다", "paper|paper|n.|종이",
  "hand-made|hand-made|adj.|손으로 만든", "beaten|beat|v.|두들기다 (be beaten 두들겨지다)", "steamed|steam|v.|찌다 (be steamed 쪄지다)", "reflects|reflect|v.|반영하다",
]);
cards("pr155", "87c7fee03a", [
  "nature|nature|n.|자연", "remains|remain|v.|~인 채로 남다 (remain constant 일정하게 유지되다)", "changing|change|v.|변하다", "observe|observe|v.|관찰하다",
  "organisms|organism|n.|생물, 유기체", "discover|discover|v.|알게 되다", "tension|tension|n.|긴장", "constant|constant|adj.|끊임없는; 일정한",
  "replaced|replace|v.|대체하다 (be replaced 새것으로 바뀌다)", "continually|continually|adv.|계속해서", "forest|forest|n.|숲", "nourishes|nourish|v.|영양분을 주다",
  "constantly|constantly|adv.|끊임없이", "elements|element|n.|요소",
]);
cards("pr156", "de86d4f47f", [
  "knowledge|knowledge|n.|지식", "understanding|understand|v.|이해하다", "solving|solve|v.|풀다, 해결하다", "proof|proof|n.|증명 (doing a proof 증명하기)", "language|language|n.|언어",
  "important|important|adj.|중요한", "abstract|abstract|adj.|추상적인", "learning|learning|n.|학습, 배움", "soak|soak|v.|(soak up) 흡수하다", "sponges|sponge|n.|스펀지",
  "principles|principle|n.|원리", "apply|apply|v.|적용하다", "turns|turn|v.|(turn out to be) ~으로 드러나다", "formal|formal|adj.|형식적인, 체계적인",
]);
cards("pr157", "467387478b", [
  "society|society|n.|사회", "expected|expect|v.|예상하다", "produce|produce|v.|만들어 내다", "prescient|prescient|adj.|선견지명이 있는", "fulfillment|fulfillment|n.|실현",
  "clamor|clamor|n.|아우성, 떠들썩한 요구", "nation|nation|n.|국가", "liberty|liberty|n.|자유", "faction|faction|n.|파벌, 당파", "numberless|numberless|adj.|무수한",
  "factionalism|factionalism|n.|파벌주의", "desires|desire|n.|바람, 욕구", "insistent|insistent|adj.|끈질긴, 집요한", "pressing|press|v.|(press for) ~을 강하게 요구하다",
]);
cards("pr158", "b7121f7063", [
  "conscious|conscious|adj.|의식하는, 알고 있는 (be conscious of/that)", "control|control|v.|통제하다", "truth|truth|n.|진실", "different|different|adj.|다른",
  "distinguish|distinguish|v.|구별하다 (distinguish between)", "behave|behave|v.|행동하다", "stone|stone|n.|돌", "possibilities|possibility|n.|가능성", "ethics|ethics|n.|윤리",
  "options|option|n.|선택지", "capable|capable|adj.|~할 수 있는 (be capable of)", "difference|difference|n.|차이", "genuine|genuine|adj.|진정한", "alternatives|alternative|n.|선택지, 대안",
]);
cards("pr159", "56c79689bf", [
  "friend|friend|n.|친구", "remembered|remember|v.|기억하다", "seascape|seascape|n.|바다 풍경(화)", "reactions|reaction|n.|반응", "reminded|remind|v.|(remind A of B) A에게 B를 떠올리게 하다",
  "fear|fear|n.|두려움", "mind|mind|n.|마음", "different|different|adj.|다른", "painting|painting|n.|그림", "enormous|enormous|adj.|거대한", "dark|dark|adj.|어두운",
  "negative|negative|adj.|부정적인", "sailing|sail|v.|항해하다", "violent|violent|adj.|거센, 격렬한",
]);
cards("pr160", "2cf4e663d9", [
  "creates|create|v.|만들어 내다", "animals|animal|n.|동물", "higher|high|adv.|더 높이", "provide|provide|v.|주다, 제공하다", "hand|hand|n.|(on the other hand) 반면에",
  "young|young|adj.|어린 (young trees 어린나무)", "deeper|deep|adj.|더 깊은", "causes|cause|v.|~하게 하다 (cause A to do)", "easier|easy|adj.|더 쉬운", "snow|snow|n.|눈",
  "winter|winter|n.|겨울", "woodland|woodland|n.|숲, 삼림 지대", "advantages|advantage|n.|이점", "piles|pile|v.|(pile up) 쌓이다",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
