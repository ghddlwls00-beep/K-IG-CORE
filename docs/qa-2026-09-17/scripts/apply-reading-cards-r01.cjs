#!/usr/bin/env node
/**
 * READING R-01 — 14 cards for each of the nine new passages written by
 * apply-reading-r01-replace.cjs (run that first). Words from the passage, meanings as used there.
 *   node apply-reading-cards-r01.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);
const { cards } = ed;

cards("pr008", "6073e31916", [
  "travel|travel|v.|이동하다, 돌다", "quarter|quarter|n.|4분의 1", "calendar|calendar|n.|달력 (calendar year 달력상의 1년)", "seasons|season|n.|계절",
  "slowly|slowly|adv.|서서히", "drift|drift|v.|(drift apart) 점점 어긋나다", "fix|fix|v.|바로잡다", "extra|extra|adj.|추가의",
  "added|add|v.|더하다 (be added 더해지다)", "leap|leap|n.|(leap year) 윤년", "slightly|slightly|adv.|약간", "real|real|adj.|실제의",
  "difference|difference|n.|차이", "divided|divide|v.|나누다 (be divided by ~으로 나누어떨어지다)",
]);
cards("pr012", "27e41ba688", [
  "honeybee|honeybee|n.|꿀벌", "patch|patch|n.|작은 구역 (a patch of flowers 꽃이 모여 핀 곳)", "hive|hive|n.|벌집", "shares|share|v.|나누다, 알리다",
  "performing|perform|v.|(동작을) 하다", "movement|movement|n.|움직임", "waggle|waggle|n.|흔들기 (waggle dance 8자 춤)", "straight|straight|adj.|곧은 (in a straight line 직선으로)",
  "shaking|shake|v.|흔들다", "circles|circle|v.|원을 그리며 돌다", "repeats|repeat|v.|되풀이하다", "direction|direction|n.|방향",
  "compared|compare|v.|(compared with) ~에 비해, ~을 기준으로", "position|position|n.|위치",
]);
cards("pr036", "a108c24251", [
  "believe|believe|v.|믿다", "stores|store|v.|저장하다", "hump|hump|n.|(낙타의) 혹", "actually|actually|adv.|사실은",
  "mostly|mostly|adv.|대부분", "fat|fat|n.|지방", "energy|energy|n.|에너지", "lean|lean|v.|기울다, 처지다",
  "drinking|drink|v.|마시다", "lose|lose|v.|잃다 (lose water 수분을 잃다)", "sweat|sweat|v.|땀을 흘리다", "temperature|temperature|n.|온도 (body temperature 체온)",
  "degrees|degree|n.|(온도의) 도", "thirsty|thirsty|adj.|목마른",
]);
cards("pr066", "83e44f23d3", [
  "octopus|octopus|n.|문어", "master|master|n.|달인, 명수", "disguise|disguise|n.|변장, 위장", "contains|contain|v.|들어 있다, 포함하다",
  "texture|texture|n.|질감", "smooth|smooth|adj.|매끄러운", "bumpy|bumpy|adj.|울퉁불퉁한", "coral|coral|n.|산호",
  "enemies|enemy|n.|적", "discovered|discover|v.|발견하다 (be discovered 들키다)", "escape|escape|v.|달아나다", "attacker|attacker|n.|공격자",
  "intelligent|intelligent|adj.|영리한, 지능이 높은", "backbone|backbone|n.|척추, 등뼈",
]);
cards("pr069", "4c04cd0ab3", [
  "printing|printing|n.|인쇄", "movable|movable|adj.|움직일 수 있는 (movable type 활자)", "type|type|n.|활자", "however|however|adv.|그러나",
  "surviving|survive|adj.|현존하는, 남아 있는", "printed|print|v.|인쇄하다", "temple|temple|n.|절, 사원", "collection|collection|n.|모음집",
  "Buddhist|buddhist|adj.|불교의", "teachings|teaching|n.|가르침", "volumes|volume|n.|(책의) 권", "library|library|n.|도서관",
  "register|register|n.|명부, 목록 (Memory of the World Register 세계기록유산 목록)", "added|add|v.|추가하다 (be added to ~에 등재되다)",
]);
cards("pr216", "735aa6e76b", [
  "autumn|autumn|n.|가을", "leaves|leaf|n.|잎 (leaf의 복수)", "during|during|prep.|~ 동안", "chlorophyll|chlorophyll|n.|엽록소",
  "sunlight|sunlight|n.|햇빛", "shorter|short|adj.|더 짧은", "cooler|cool|adj.|더 서늘한", "stop|stop|v.|(stop -ing) ~하기를 멈추다",
  "slowly|slowly|adv.|서서히", "disappears|disappear|v.|사라지다", "produce|produce|v.|만들어 내다", "especially|especially|adv.|특히",
  "sunny|sunny|adj.|햇볕이 좋은", "bright|bright|adj.|선명한, 밝은",
]);
cards("pr242", "eb0cc56398", [
  "sunlight|sunlight|n.|햇빛", "actually|actually|adv.|사실은", "mixture|mixture|n.|섞인 것, 혼합물", "rainbow|rainbow|n.|무지개",
  "travels|travel|v.|이동하다, 나아가다", "wave|wave|n.|파동", "wavelength|wavelength|n.|파장", "molecules|molecule|n.|분자",
  "scatter|scatter|v.|흩뜨리다", "strongly|strongly|adv.|강하게", "spread|spread|v.|퍼뜨리다 (be spread 퍼지다)", "direction|direction|n.|방향",
  "sunset|sunset|n.|해 질 녘", "passes|pass|v.|(pass through) 통과하다",
]);
cards("pr244", "ef45c0bfdd", [
  "cycle|cycle|n.|순환 (water cycle 물의 순환)", "never-ending|never-ending|adj.|끝없는", "journey|journey|n.|여행, 여정", "heats|heat|v.|데우다",
  "oceans|ocean|n.|바다, 대양", "vapor|vapor|n.|증기 (water vapor 수증기)", "rises|rise|v.|올라가다", "release|release|v.|내보내다",
  "cools|cool|v.|식다", "droplets|droplet|n.|작은 물방울", "gather|gather|v.|모이다", "heavy|heavy|adj.|무거운",
  "soaks|soak|v.|(soak into) 스며들다", "returns|return|v.|돌아가다",
]);
cards("pr251", "a9a0d238ec", [
  "often|often|adv.|흔히", "human-made|human-made|adj.|사람이 만든, 인공의", "object|object|n.|물체", "space|space|n.|우주",
  "popular|popular|adj.|널리 퍼진 (popular belief 통념)", "belief|belief|n.|믿음", "wide|wide|adj.|폭이 ~인", "similar|similar|adj.|(similar to) ~와 비슷한",
  "station|station|n.|정거장 (space station 우주정거장)", "extremely|extremely|adv.|극도로", "naked|naked|adj.|(with the naked eye) 맨눈으로",
  "astronaut|astronaut|n.|우주비행사", "flight|flight|n.|비행", "lights|light|n.|불빛",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
