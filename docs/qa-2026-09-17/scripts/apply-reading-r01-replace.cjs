#!/usr/bin/env node
/**
 * READING R-01 — owner decision 2026-09-17 ("3번은 다른 지문으로 바꾸자"): of every pair of
 * lessons that carried the same passage, one gets a new passage.
 *   identical  pr007=pr012 · pr009=pr036 · pr024=pr069 · pr152=pr242 · pr190=pr244 ·
 *              pr197=pr216 · pr247=pr251                → the later lesson is replaced
 *   contained  pr008 ⊂ pr026 · pr066 ⊂ pr085           → the shorter copy is replaced,
 *                                                         so the complete passage stays
 *
 * The nine passages are written for this course (no third-party text, so no permission
 * question), each on a topic no other lesson covers, with facts that are well established:
 *   pr008 leap years (Gregorian rule) · pr012 the honeybee waggle dance (von Frisch, Nobel 1973)
 *   pr036 camel humps store fat, not water · pr066 octopus camouflage and problem solving
 *   pr069 Jikji (1377, Heungdeok Temple; Bibliothèque nationale de France; UNESCO Memory of the
 *         World 2001) · pr216 why leaves change colour · pr242 why the sky is blue
 *   pr244 the water cycle · pr251 the Great Wall is not visible from orbit with the naked eye
 *         (Yang Liwei 2003)
 * The cards follow in apply-reading-cards-r01.cjs (run after this).
 *   node apply-reading-r01-replace.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);

ed.sentences("pr008", "592f4a86d0", [
  ["It takes the Earth a little less than 365 and a quarter days to travel once around the Sun.", "지구가 태양 둘레를 한 바퀴 도는 데는 365와 4분의 1일보다 조금 짧은 시간이 걸린다."],
  ["A calendar year, however, has only 365 days, so the calendar and the seasons slowly drift apart.", "그러나 달력의 1년은 365일뿐이라서 달력과 계절이 조금씩 어긋나게 된다."],
  ["To fix this, an extra day, February 29, is added every four years.", "이를 바로잡기 위해 4년마다 2월 29일이라는 하루를 더한다."],
  ["These years are called leap years.", "이런 해를 윤년이라고 한다."],
  ["But adding a day every four years is slightly too much, because the real difference is a little less than six hours a year.", "하지만 실제 차이는 1년에 6시간보다 조금 적기 때문에 4년마다 하루를 더하면 약간 지나치게 된다."],
  ["So years that end in 00 are leap years only if they can be divided by 400.", "그래서 00으로 끝나는 해는 400으로 나누어떨어질 때만 윤년이다."],
  ["That is why 2000 was a leap year, but 1900 was not.", "그래서 2000년은 윤년이었지만 1900년은 윤년이 아니었다."],
], "R-01: replaces the shorter copy of pr026");

ed.sentences("pr012", "4aeb740ca9", [
  ["When a honeybee finds a good patch of flowers, it returns to the hive and shares the news with other bees.", "꿀벌은 꽃이 많은 좋은 곳을 찾으면 벌집으로 돌아와 다른 벌들에게 그 소식을 알린다."],
  ["It does this by performing a special movement called the waggle dance.", "꿀벌은 '8자 춤'이라는 특별한 움직임으로 이 일을 한다."],
  ["The bee runs forward in a straight line while shaking its body, then circles back and repeats the run.", "벌은 몸을 흔들며 직선으로 달린 다음, 원을 그리며 돌아와 그 달리기를 되풀이한다."],
  ["The direction of the straight run shows the direction of the flowers compared with the position of the sun.", "직선으로 달리는 방향은 해의 위치를 기준으로 꽃이 있는 방향을 나타낸다."],
  ["The length of the run tells the other bees how far away the flowers are.", "달리는 시간의 길이는 꽃이 얼마나 멀리 있는지를 다른 벌들에게 알려 준다."],
  ["The Austrian scientist Karl von Frisch studied this dance for many years, and in 1973 he shared the Nobel Prize for his work.", "오스트리아의 과학자 카를 폰 프리슈는 이 춤을 오랫동안 연구했고, 1973년에 그 공로로 노벨상을 공동 수상했다."],
], "R-01: pr007 keeps the music passage");

ed.sentences("pr036", "450b232ceb", [
  ["Many people believe that a camel stores water in its hump, but this is not true.", "많은 사람들이 낙타가 혹에 물을 저장한다고 믿지만 사실이 아니다."],
  ["The hump is actually made mostly of fat.", "혹은 사실 대부분 지방으로 이루어져 있다."],
  ["When food is hard to find, the camel can use this fat for energy, and the hump becomes smaller and may lean to one side.", "먹이를 구하기 어려울 때 낙타는 이 지방을 에너지로 쓸 수 있고, 그러면 혹이 작아지고 한쪽으로 처지기도 한다."],
  ["Camels can go a long time without drinking because their bodies lose very little water.", "낙타가 물을 마시지 않고 오래 버틸 수 있는 것은 몸에서 물이 아주 조금만 빠져나가기 때문이다."],
  ["They sweat very little, and on a hot day their body temperature can rise several degrees before they start to sweat.", "낙타는 땀을 아주 적게 흘리고, 더운 날에는 땀을 흘리기 시작하기 전에 체온이 몇 도나 오를 수 있다."],
  ["When a thirsty camel finally finds water, it can drink about 100 liters in ten minutes.", "목마른 낙타는 마침내 물을 찾으면 10분 만에 약 100리터를 마실 수 있다."],
], "R-01: pr009 keeps the passage");

ed.sentences("pr066", "2b83900b07", [
  ["The octopus is a master of disguise.", "문어는 변장의 달인이다."],
  ["Its skin contains many special cells that can change its color in less than a second.", "문어의 피부에는 1초도 안 되는 사이에 몸 색깔을 바꿀 수 있는 특별한 세포가 많이 있다."],
  ["It can also change the texture of its skin, making it look smooth like sand or bumpy like rock or coral.", "피부의 질감도 바꿀 수 있어서 모래처럼 매끄럽게, 또는 바위나 산호처럼 울퉁불퉁하게 보이게 만든다."],
  ["In this way, an octopus can hide from enemies such as sharks and wait for crabs and fish to come close.", "이렇게 해서 문어는 상어 같은 적에게서 숨고, 게나 물고기가 가까이 오기를 기다릴 수 있다."],
  ["If it is discovered, it can shoot out a cloud of dark ink and escape while the attacker cannot see.", "들키면 검은 먹물을 구름처럼 뿜어 공격자가 앞을 보지 못하는 사이에 달아날 수 있다."],
  ["Octopuses can also solve simple problems, such as opening a jar to get the food inside.", "문어는 병뚜껑을 열어 안에 든 먹이를 꺼내는 것 같은 간단한 문제도 풀 수 있다."],
  ["For this reason, scientists consider the octopus one of the most intelligent animals without a backbone.", "그래서 과학자들은 문어를 척추가 없는 동물 가운데 가장 영리한 동물 중 하나로 여긴다."],
], "R-01: replaces the shorter copy of pr085");

ed.sentences("pr069", "dc990b99af", [
  ["Many people think that printing with movable metal type began in Europe with Johannes Gutenberg in the 1450s.", "많은 사람들은 금속 활자 인쇄가 1450년대 유럽에서 요하네스 구텐베르크와 함께 시작되었다고 생각한다."],
  ["However, the oldest surviving book printed with movable metal type was made in Korea.", "하지만 금속 활자로 인쇄된 책 가운데 현재 남아 있는 가장 오래된 책은 한국에서 만들어졌다."],
  ["It is called Jikji, and it was printed at Heungdeok Temple in Cheongju in 1377.", "그 책은 '직지'로, 1377년 청주 흥덕사에서 인쇄되었다."],
  ["That is about 78 years before the Gutenberg Bible.", "이는 구텐베르크 성경보다 약 78년 앞선다."],
  ["Jikji is a collection of Buddhist teachings, and only the second of its two volumes survives today.", "직지는 불교의 가르침을 모은 책으로, 두 권 가운데 하권만 오늘날 남아 있다."],
  ["The book is kept at the National Library of France in Paris, and in 2001 it was added to UNESCO's Memory of the World Register.", "이 책은 파리의 프랑스 국립도서관에 보관되어 있으며, 2001년 유네스코 세계기록유산에 등재되었다."],
], "R-01: pr024 keeps the passage");

ed.sentences("pr216", "544b16acde", [
  ["In autumn, the leaves of many trees turn yellow, orange, and red.", "가을이 되면 많은 나무의 잎이 노란색, 주황색, 빨간색으로 변한다."],
  ["During spring and summer, leaves are green because they are full of chlorophyll, which plants use to make food from sunlight.", "봄과 여름에 잎이 초록색인 것은 식물이 햇빛으로 양분을 만드는 데 쓰는 엽록소가 가득하기 때문이다."],
  ["As the days get shorter and cooler, trees stop making chlorophyll, and the green color slowly disappears.", "낮이 짧아지고 서늘해지면 나무는 엽록소를 더 만들지 않고, 초록색이 서서히 사라진다."],
  ["Yellow and orange colors, which were in the leaves all along, can then be seen.", "그러면 줄곧 잎 속에 있던 노란색과 주황색이 보이게 된다."],
  ["Red colors are different: many trees produce them only in autumn, especially when the days are sunny and the nights are cool.", "빨간색은 다르다. 많은 나무가 가을에만 이 색을 새로 만들어 내는데, 특히 낮에 햇볕이 좋고 밤이 서늘할 때 그렇다."],
  ["That is why autumn reds are especially bright in years with many sunny days and cool nights.", "그래서 햇볕 좋은 낮과 서늘한 밤이 많은 해에는 가을 단풍의 붉은색이 특히 선명하다."],
], "R-01: pr197 keeps the passage");

ed.sentences("pr242", "8d5c22fe9a", [
  ["Sunlight looks white, but it is actually a mixture of all the colors of the rainbow.", "햇빛은 흰색으로 보이지만 사실은 무지개의 모든 색이 섞인 것이다."],
  ["Each color travels as a wave, and blue light has a shorter wavelength than red light.", "각 색은 파동으로 이동하는데, 파란빛은 빨간빛보다 파장이 짧다."],
  ["When sunlight enters the air, it hits tiny gas molecules.", "햇빛이 공기 속으로 들어오면 아주 작은 기체 분자들과 부딪친다."],
  ["These molecules scatter short blue waves much more strongly than long red waves.", "이 분자들은 짧은 파란 파동을 긴 빨간 파동보다 훨씬 강하게 흩뜨린다."],
  ["As a result, blue light is spread across the whole sky, and it reaches our eyes from every direction.", "그 결과 파란빛이 하늘 전체에 퍼져 모든 방향에서 우리 눈에 들어온다."],
  ["At sunset, sunlight passes through much more air before it reaches us, so most of the blue is scattered away and the sky looks red and orange.", "해 질 녘에는 햇빛이 우리에게 닿기 전에 훨씬 더 많은 공기를 지나기 때문에 파란빛은 대부분 흩어져 버리고 하늘은 붉은색과 주황색으로 보인다."],
], "R-01: pr152 keeps the passage");

ed.sentences("pr244", "6c993a48f5", [
  ["The water on Earth is always moving in a never-ending journey called the water cycle.", "지구의 물은 '물의 순환'이라는 끝없는 여행을 하며 늘 움직이고 있다."],
  ["The sun heats water in oceans, lakes, and rivers, and some of it turns into water vapor and rises into the air.", "태양이 바다, 호수, 강의 물을 데우면 그중 일부가 수증기로 변해 공기 중으로 올라간다."],
  ["Plants also release water vapor through their leaves.", "식물도 잎을 통해 수증기를 내보낸다."],
  ["As the vapor rises, it cools and forms tiny water droplets, which gather to make clouds.", "수증기는 올라가면서 식어 아주 작은 물방울이 되고, 이 물방울이 모여 구름이 된다."],
  ["When the droplets grow too heavy, they fall back to the ground as rain or snow.", "물방울이 너무 무거워지면 비나 눈이 되어 땅으로 떨어진다."],
  ["This water flows into rivers or soaks into the ground, and sooner or later it returns to the sea, where the cycle begins again.", "이 물은 강으로 흘러가거나 땅속으로 스며들었다가 언젠가 바다로 돌아가고, 그곳에서 순환이 다시 시작된다."],
], "R-01: pr190 keeps the passage");

ed.sentences("pr251", "2296e5e6d7", [
  ["It is often said that the Great Wall of China is the only human-made object that can be seen from space.", "만리장성이 우주에서 보이는 유일한 인공 구조물이라는 말이 흔히 있다."],
  ["This popular belief, however, is not true.", "그러나 이 널리 퍼진 믿음은 사실이 아니다."],
  ["The wall is very long, but in most places it is less than ten meters wide.", "장성은 매우 길지만 대부분의 구간에서 폭이 10미터도 되지 않는다."],
  ["It is also made of stone and earth that are similar in color to the land around it.", "게다가 주변 땅과 색이 비슷한 돌과 흙으로 만들어져 있다."],
  ["From the International Space Station, about 400 kilometers above the Earth, it is extremely hard to see with the naked eye.", "지상 약 400킬로미터 높이의 국제우주정거장에서도 맨눈으로는 보기가 극히 어렵다."],
  ["In fact, Yang Liwei, China's first astronaut, said after his flight in 2003 that he could not see it.", "실제로 중국 최초의 우주비행사 양리웨이는 2003년 비행을 마친 뒤 장성을 볼 수 없었다고 말했다."],
  ["On the other hand, the lights of large cities are easy to see from space at night.", "반면 큰 도시의 불빛은 밤에 우주에서 쉽게 보인다."],
], "R-01: pr247 keeps the passage");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const x of r.log) console.log("  " + x);
console.log(`${r.lessons} lessons — ${DRY ? "checked (--dry-run)" : "written"}`);
