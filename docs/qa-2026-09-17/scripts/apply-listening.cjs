#!/usr/bin/env node
/**
 * LISTENING — every finding in content-review/listening.md except L-64 (already deployed)
 * and the rows that wait for the owner's decision (L-74 d194/d196 "freaks", L-84 d232 #3,
 * d234, d255 #7, d256-d257, d215 #1/#3 wording). Typos inside those rows ARE fixed.
 *
 * The site reads each round's English AND Korean from content/ld_english_scripts.json
 * ({n, ko, en} rows); Azure Ava reads the English, so the English is both what a learner
 * hears and the dictation answer. Changing it needs new clips (generate-azure-ava.mjs).
 *
 * Rules used (owner: "the textbook is not the answer key — go with what is right"):
 *  - Names of invented people: the hint line's spelling (the author's), unless the hint
 *    itself is a typo (Eliss, Mcarthy, Cocoran, Willima, Everst). Real people and places:
 *    the real spelling (Wilbur Wright, Langhorne, Wark, Guadeloupe, Emmett Kelly, Hayward).
 *  - Outdated or wrong facts are corrected IN the sentence, because the site no longer plays
 *    the old recording: Ava reads the script, so a learner would hear the wrong fact as
 *    today's fact (Chicago, left-handers, languages, Ford, Griffith, Native American numbers,
 *    Telstar, Franklin, Yosemite/sequoia/bears, population growth, Jonker diamond ...).
 *  - Dictation progress is saved by row index, so rows are never inserted. One row is
 *    removed: d221 #5, a garbled repeat of #6 that the recording does not say (L-78).
 *  - Riddle answers that sat in Korean parentheses (L-71, L-80 d191) move to a new optional
 *    `answer` field, shown behind "정답 보기" in LdLearningView.
 *  - Korean: standard loanword spelling (L-00b) and PDF line-break spaces inside words
 *    (L-00c) by rule over every row; the dry run of both rules was read hit by hit.
 *
 * Every edit states the CURRENT text (a substring that must occur exactly once in that
 * field, or the whole field). If anything differs, the script stops and writes nothing.
 *
 *   node apply-listening.cjs            apply
 *   node apply-listening.cjs --dry-run  check every edit, print the counts, write nothing
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");
const LESSONS = path.join(REPO, "content/lessons/ld");
const DRY = process.argv.includes("--dry-run");

const ROWS = []; // [id, n, field, from, to]
const en = (id, n, from, to) => ROWS.push([id, String(n), "en", from, to]);
const ko = (id, n, from, to) => ROWS.push([id, String(n), "ko", from, to]);
const ANSWERS = []; // [id, n, koPartToRemove, answer]
const answer = (id, n, from, text) => ANSWERS.push([id, String(n), from, text]);
const HINTS = []; // [id, from, to, count]
const hint = (id, from, to, count = 1) => HINTS.push([id, from, to, count]);
const DROP_HINT_BLOCK = []; // [id, exact block text]

// ── L-01 … L-26: names, transcription, translation (d007–d056) ─────────────────────────
en("d007", 1, "John Wanger", "John Wenger");
en("d007", 3, "Mrs. Wanger", "Mrs. Wenger");
ko("d007", 5, "스위스 Berne에서", "스위스 베른에서");
hint("d007", "Berne, Switzerland", "Bern, Switzerland");
en("d009", 3, "Keith's A photographer", "Keith's a photographer");
ko("d009", 3, "슬라이드를 가져왔고", "슬라이드를 찍었고");
hint("d009", "interpretor", "interpreter");
en("d011", 2, "about six months ago, Thursday.", "about six months ago.");
ko("d011", 2, "편지를 쓰고 있다. 목요일,", "편지를 쓰고 있다.");
en("d011", 3, "Dear Laura, guess where I am?", "Thursday. Dear Laura, guess where I am?");
ko("d011", 3, "친애하는 Laura.", "목요일. 친애하는 Laura.");
en("d012", 1, "you can't be at the beach without a swimming suit, but Becky's mother took a shopping Monday night",
  "Well, you can't be at the beach without a swimming suit, but Becky's mother took us shopping Monday night");
ko("d012", 1, "글세,", "글쎄,");
en("d012", 6, "I was lucky and honest person found it.", "I was lucky an honest person found it.");
ko("d012", 8, "인명구조원으로써 잘 생기고", "인명구조원이고 잘생기고");
ko("d014", 2, "골프롤", "골프를");
en("d016", 1, "Peter Petralus", "Peter Patralis");
ko("d016", 1, "그녀는 새 집을", "그들은 새 집을");
en("d018", 8, "at the race track.", "at the racetrack.");
hint("d018", "photography race track,", "photography racetrack,");
hint("d018", " town suburbs?", "");
en("d020", 1, "I have been to Guadalupe.", "I have been to Guadeloupe.");
ko("d020", 1, "Guadaloupe는 가본 적이", "과들루프에는 가본 적이");
en("d020", 6, "$15 A day.", "$15 a day.");
en("d020", 12, "Guadalupe", "Guadeloupe");
ko("d020", 12, "Guadaloupe로", "과들루프로");
hint("d020", "Guadaloupe", "Guadeloupe");
ko("d021", 2, "흥분한 나머지", "속상한 나머지");
en("d023", 7, "Gilda Lilly", "Gilda Lily");
en("d025", 2, "around 10 A.m.", "around 10 a.m.");
en("d025", 10, "Carlos rode the boat", "Carlos rowed the boat");
en("d026", 3, "“I’m being dragged,” she said. Carlos tried to turn the boat.",
  "Carlos tried to turn the boat around. It was hard, but he did it.");
en("d027", 3, "Fernando Marcus", "Fernando Marcos");
ko("d027", 2, "스포츠 작가협회", "스포츠 기자협회");
ko("d028", 1, "Kevin taylor", "Kevin Taylor");
hint("d028", "swimming contest", "swimming competition");
ko("d029", 1, "Marta Perez가 2번 레인에서 그녀를 대신했습니다.", "Marta Perez가 2번 레인에 자리를 잡았습니다.");
ko("d029", 3, "33번 레인에서", "3번 레인에서");
ko("d029", 3, "Lakeside Spots Club", "Lakeside Sports Club");
en("d032", 2, "Willima Smith", "William Smith");
ko("d032", 2, "Jim Eliott와", "Jim Elliott와");
ko("d032", 5, "로프를 그의 허리에", "로프를 그녀의 허리에");
en("d032", 6, "Elliot, Smith, and Byram", "Elliott, Smith, and Byram");
en("d032", 6, "Elliot was only slightly injured.", "Elliott was only slightly injured.");
hint("d032", "Mt.Everst, Jim Eliott Willima Smith", "Mt. Everest, Jim Elliott William Smith");
// L-28 facts: New Orleans
en("d033", 1, "New Orleans is the second busiest seaport in the United States.", "New Orleans is one of the busiest seaports in the United States.");
ko("d033", 1, "뉴올린즈는 미국에서 두 번째로 바쁜 항구이다.", "뉴올리언스는 미국에서 가장 바쁜 항구 중 하나이다.");
en("d034", 6, "It's the world's largest indoor arena or stadium.", "It is one of the world's largest indoor arenas.");
ko("d034", 6, "그것은 세계 최대의 실내 경기장 혹은 스테디엄이다.", "그것은 세계에서 가장 큰 실내 경기장 중 하나이다.");
en("d034", 8, "The world's longest bridge, the Lake Pontchartrand Causeway, is in New Orleans.",
  "The world's longest continuous bridge over water, the Lake Pontchartrain Causeway, is near New Orleans.");
ko("d034", 8, "세계에서 가장 긴 다리인 the Lake Pontchartrain Causeway가 뉴 올린즈에 있다.",
  "물 위를 잇는 교량으로는 세계에서 가장 긴 Lake Pontchartrain Causeway가 뉴올리언스 근처에 있다.");
en("d034", 9, "over 47 kilometers long.", "over 38 kilometers long.");
ko("d034", 9, "47km 이상의", "38km 이상의");
hint("d034", "47 km", "38 km");
ko("d034", 10, "Mardi Grass", "Mardi Gras");
en("d036", 1, "about it. is true", "about it. It is true");
en("d037", 2, "The Dr. looked", "The doctor looked");
ko("d037", 9, "오, 의사, 당신은 정말 그렇게 생각하십니까?", "오, 선생님, 정말 그렇게 생각하세요?");
en("d038", 4, "You will be fine", "he will be fine");
en("d038", 6, "the Morton's boy", "the Mortons' boy");
en("d039", 3, "Herbie answers", "Herby answers");
en("d039", 6, "But not Herbie.", "But not Herby.");
en("d039", 9, "pull Herbie out", "pull Herby out");
ko("d039", 9, "침 대에서", "침대에서");
ko("d040", 6, "나는 그가 식물과", "나는 그녀가 식물과");
ko("d040", 6, "말하 는", "말하는");
hint("d040", "Miss Eliss", "Miss Ellis");
en("d042", 1, "Peter Wendell", "Pete Wendel");
ko("d042", 4, "리포트틀", "리포트를");
// L-27 Chicago has been the third largest US city since the 1990 census
en("d043", 1, "Chicago, the second largest city in the United States.", "Chicago, one of the largest cities in the United States.");
ko("d043", 1, "미국에서 두 번째로 큰 도시인 쉬카고로", "미국에서 가장 큰 도시 중 하나인 시카고로");
en("d044", 1, "John Kukoran", "John Corcoran");
ko("d044", 1, "John Cocoran", "John Corcoran");
hint("d044", "John Cocoran", "John Corcoran");
en("d045", 6, "a different examination", "a difficult examination");
ko("d045", 5, "Charles M. Mcarthy 교수", "Charles M. McCarthy 교수");
ko("d045", 6, "Mcarthy 교수는", "McCarthy 교수는");
hint("d045", "Mcarthy", "McCarthy");
ko("d046", 3, "Phil Stricklan는", "Phil Strickland는");
en("d046", 4, "in high school they used to meet", "in high school. They used to meet");
en("d047", 6, "shopping district he recommended", "shopping district. He recommended");
ko("d049", 2, "쉽게 화내낸 것처럼", "쉽게 화를 내는 것처럼");
ko("d050", 2, "돌보야야", "돌보아야");
en("d050", 8, "believes that he should stay home", "believes that she should stay home");
ko("d051", 7, "내보내낼지", "내보낼지");
// Wisconsin has about 15,000 lakes; "land of 10,000 lakes" is Minnesota
en("d052", 2, "northern Wisconsin, the land of 1000 lakes.", "northern Wisconsin, a land of thousands of lakes.");
ko("d052", 2, "천개의 호수의 땅인 Northern Wisconsin이다.", "수천 개의 호수가 있는 땅인 위스콘신 북부이다.");
ko("d052", 7, "캘핑", "캠핑");
en("d053", 6, "You see your husband's collection", "You see, her husband's collection");
ko("d053", 6, "그녀의 남편의 수집은 만불 가까운 가치가 있 다.", "보다시피 그녀의 남편의 수집품은 거의 만 달러의 가치가 있다.");
ko("d053", 7, "성냥곽", "성냥갑");
en("d055", 2, "everything insight.", "everything in sight.");
en("d056", 6, "Tony Sark grew", "Tony Sarg grew");
en("d056", 8, "Tony Sark had become", "Tony Sarg had become");

// ── L-28 … L-41 (d058–d089) ──────────────────────────────────────────────────────────────
// Henry Ford's mother died in 1876, when he was 13; the Model T was built 1908–1927
en("d058", 3, "died in 1875 when he was only 12.", "died in 1876 when he was only 13.");
ko("d058", 3, "그가 겨우 12살인 1875년에 죽었다.", "그가 겨우 13살이던 1876년에 돌아가셨다.");
en("d058", 7, "between 1908 and 1925.", "between 1908 and 1927.");
ko("d058", 7, "1908년부터 1925년 사이에", "1908년부터 1927년 사이에");
ko("d058", 9, "그는 자신이 필요로 하는 대부분의 것들 - 유리, 가죽, 나무-를 위한 자기 자신의 공장을 갖고 있었기 때문 에 포드의 차는 쌌다.",
  "그는 자신이 필요로 하는 대부분의 것, 즉 유리, 가죽, 나무를 만드는 자기 공장을 갖고 있었기 때문에 포드의 차는 쌌다.");
hint("d058", "mechanical 1875 12.", "mechanical 1876 13.");
hint("d058", "15 million 1908 1925.", "15 million 1908 1927.");
ko("d059", 1, "“The War of the World\"라는", "“The War of the Worlds”라는");
// The 1938 "mass panic" is now known to have been greatly exaggerated by newspapers
en("d060", 2, "more than 2 million thought it was a true news report.", "many thought it was a true news report.");
ko("d060", 2, "이백만명 이상이 그것이", "많은 사람이 그것이");
en("d060", 4, "Thousands left their homes to escape the Martian invaders.", "Some people even left their homes to escape the Martian invaders.");
ko("d060", 4, "수천명이 그 화성 침입자들을 피해서 달아나기 위하여 그들의 집을 떠났다.", "어떤 사람들은 화성 침입자들을 피해 달아나려고 집을 떠나기까지 했다.");
en("d060", 5, "It was many days before life was back to normal.", "Newspapers wrote about the panic for days.");
ko("d060", 5, "많은 날들이 지난 후에야 생활이 정상으로 돌아왔다.", "신문들은 며칠 동안 그 소동에 대해 썼다.");
ko("d060", 7, "살해되었다.", "죽었다.");
hint("d060", "six million more than two million Thousands Martian invaders. back to normal.", "six million Martian invaders. panic");
ko("d061", 2, "Tony Montag", "Taggy Montag");
en("d062", 7, "just to get my money away.", "just to give my money away.");
ko("d062", 7, "나는 단지 내 돈을 줘서 없애기 위하여 일하지는 않아.", "나는 내 돈을 남에게 줘 버리려고 일하는 게 아니야.");
ko("d063", 5, "알려주 었다(직역:방향을 주었다).", "알려주었다.");
hint("d063", "likeable", "likable");
ko("d064", 1, "사회적이 관습과", "사회적 관습과");
en("d064", 6, "Should you leave one hand in your lap or on the table? The important thing to remember about social customs is not to do anything that might make other people feel uncomfortable.",
  "Should you leave one hand in your lap or on the table?");
en("d066", 2, "so they called it light.", "so they called it Lite.");
en("d066", 4, "They said, light tastes soapy.", "They said, Lite tastes soapy.");
en("d066", 6, "talking about light beer", "talking about Lite beer");
en("d066", 7, "the light soap company.", "the Lite Soap Company.");
en("d067", 1, "Light Soap Company", "Lite Soap Company");
en("d067", 2, "Light Soap had", "Lite Soap had");
en("d067", 3, "the word light in", "the word Lite in");
en("d067", 5, "the light taste soapy ad since the public knew which light was which.", "the Lite tastes soapy ad since the public knew which Lite was which.");
en("d067", 6, "Mrs. Ascot was", "Mrs. Ascott was");
en("d067", 7, "read, light is wonderful", "read, Lite is wonderful");
ko("d069", 3, "그는 나에게 어떻게 운전하는지 보여주면 단지 너무 기쁠 것이라고 말했다.", "그는 기꺼이 나에게 운전하는 법을 가르쳐 주겠다고 말했다.");
en("d070", 3, "Mr. Huskison,", "Mr. Huskisson,");
en("d071", 1, "At 3 A.m.", "At 3 a.m.");
ko("d071", 1, "Jack Mill가", "Jack Mills가");
en("d071", 2, "made-up of", "made up of");
ko("d072", 4, "챠량", "차량");
ko("d074", 3, "콘스탄티노불", "콘스탄티노플");
ko("d074", 5, "착륙함 으로써", "착륙함으로써");
ko("d074", 7, "있다 는 것을", "있다는 것을");
en("d077", 1, "Gene and Oswald", "Jean and Oswald");
ko("d077", 2, "건축가로써", "건축가로서");
ko("d078", 3, "평가사로써", "평가사로서");
ko("d078", 7, "고용해도 좋다.", "고용하기도 한다.");
ko("d082", 1, "D.WGriffth는", "D.W. Griffith는");
en("d082", 4, "David War Griffith", "David Wark Griffith");
ko("d082", 4, "켄터키주, Floydsfo가에서", "켄터키주 Floyds Fork에서");
en("d082", 6, "His father became very poor", "His family became very poor");
hint("d082", "Floydsfork", "Floyds Fork");
// D. W. Griffith died on July 23, 1948 (the hint already says so)
en("d083", 12, "July 22nd, 1948.", "July 23rd, 1948.");
ko("d083", 12, "1948년 7월 22일", "1948년 7월 23일");
en("d084", 1, "Ren Computer Company", "Wren Computer Company");
ko("d084", 2, "컴퓨터들 은", "컴퓨터들은");
ko("d088", 3, "59초 내에 200미터를", "59초 동안 260미터를");
en("d088", 5, "Wilbert and Orville", "Wilbur and Orville");
ko("d088", 5, "Wilburt와", "Wilbur와");
ko("d088", 6, "1809년에", "1899년에");
en("d088", 9, "Wilbert built", "Wilbur built");
ko("d088", 9, "Wilburt는", "Wilbur는");
hint("d088", "Wilburt", "Wilbur");
ko("d089", 2, "KittyHawk", "Kitty Hawk");

// ── L-36 … L-63 (d092–d155) ──────────────────────────────────────────────────────────────
ko("d092", 8, "문학사나 공학사", "문학사나 이학사");
hint("d092", "law, medicine. l", "law, medicine.");
en("d095", 3, "at 8.40 A.m. on the 11th.", "at 8:40 a.m. on the 11th.");
en("d095", 9, "one meal A day.", "one meal a day.");
ko("d096", 3, "28명이 살해되었고", "28명이 사망했고");
en("d098", 7, "develop automobiles in factories that", "develop automobiles and factories that");
ko("d098", 5, "기계중 의", "기계 중의");
ko("d099", 3, "시장으로써", "시장으로서");
ko("d099", 5, "우리 는", "우리는");
ko("d099", 6, "나 는 직장을", "나는 직장을");
ko("d102", 1, "기사 보도를", "기상 보도를");
ko("d102", 5, "예언은", "예보는");
en("d103", 4, "The Idita Rod Trail is", "The Iditarod Trail Race is");
ko("d103", 5, "카버한다", "달린다");
en("d104", 4, "110 kilometers A day.", "110 kilometers a day.");
ko("d105", 4, "구체적안", "구체적인");
en("d106", 2, "worth 2 in the bush.", "worth two in the bush.");
ko("d107", 2, "그 는", "그는");
ko("d107", 4, "소년으로써 그는", "소년 시절 그는");
ko("d107", 5, "자시 자신의", "자기 자신의");
en("d108", 6, "worth 2 tomorrows.", "worth two tomorrows.");
// L-42 d109 #6 carried the whole next round (d110) after its first sentence
en("d109", 6, "Franklin also discovered ways to improve farming and health care. Franklin was a leader in his community. He was a good speaker and organizer. In Philadelphia, he organized the city's first police department, fire department, hospital, and library. He helped start a school that later became the University of Pennsylvania. Franklin also worked to improve the mail system in the United States and Canada. Later he became the United States representative to Great Britain and France. Benjamin Franklin died in 1790. Today he is remembered as one of the greatest Americans because he was able to do many things very well. He worked hard to improve life in his community and his country. His picture appears on United States postage stamps, coins, and paper money.",
  "Franklin also discovered ways to improve farming and health care.");
ko("d110", 3, "필라델피이에서", "필라델피아에서");
ko("d111", 2, "국민으로써", "국민으로서");
ko("d111", 7, "뽀족함", "뾰족함");
ko("d113", 3, "“포로는", "“포모족은");
en("d113", 10, "first residence.", "first residents.");
ko("d113", 10, "첫 주민들의 우리의 이해를", "첫 주민들에 대한 우리의 이해를");
// People reached the Americas at least ~15,000 years ago; "more than 25,000" is not established
en("d114", 5, "The first Indians were Native Americans probably came from Asia more than 25,000 years ago.",
  "The first Indians, or Native Americans, probably came from Asia more than 15,000 years ago.");
ko("d114", 5, "아마 25,000 년 이상 전에 아시아로부터 왔다.", "아마 15,000년도 더 전에 아시아로부터 왔을 것이다.");
ko("d114", 8, "인류학자들은 베링 해협 근처의 이 지역 중의 하나가 알라스카로 아시아와 연결되어 있었다고 믿는다.",
  "인류학자들은 베링 해협 근처의 이런 지역 중 하나가 아시아와 알래스카를 이어 주었다고 믿는다.");
hint("d114", "25,000", "15,000");
// Farming in Mesoamerica began long before the Maya
en("d115", 4, "and they were the first people on the continent to develop agriculture.", "and they were also skilled farmers.");
ko("d115", 4, "그들은 그 대륙에서 농업을 개발한 첫 번째 사람들이었다.", "뛰어난 농부이기도 했다.");
ko("d115", 5, "공동주책", "공동주택");
ko("d117", 3, "단풍 사탕", "메이플 슈거");
en("d117", 4, "in the spring for a few years, they lived", "in the spring. For a few years, they lived");
ko("d118", 10, "인디언들은 전에는 홍역, mumps, 유행성 이하선염, 천연두, 수두(chicken pox) 같은 질병에 전에는 결코 노출된 적이 없었다.",
  "인디언들은 홍역, 유행성 이하선염, 천연두, 수두 같은 질병에 전에는 결코 노출된 적이 없었다.");
en("d119", 7, "the long journey W. It wasn't long", "the long journey West. It wasn't long");
en("d119", 9, "moved W again the Indians protested,", "moved West. Again, the Indians protested,");
// L-49 2020 census: millions of Native Americans, a minority on reservations, 300+ reservations
en("d120", 8, "about 800,000 Native Americans", "several million Native Americans");
ko("d120", 8, "약 80만명의 미국 원주민들이", "수백만 명의 미국 원주민들이");
en("d120", 9, "Over half of them live on reservations.", "Many of them live on reservations.");
ko("d120", 9, "그들의 절반 이상이 보호구역에서 산다.", "그들 중 많은 사람이 보호구역에서 산다.");
en("d120", 10, "There are about 300 reservations located throughout 28 states.", "There are more than 300 reservations located throughout the United States.");
ko("d120", 10, "28개주에 걸쳐 위치한 약 300개의 보호구역이 있다.", "미국 전역에 300개가 넘는 보호구역이 있다.");
hint("d120", "800,000 three hundred located", "several million more than three hundred located");
hint("d120", "throughout twenty-eight states.", "throughout the United States.");
// World growth today is under 1 % a year (doubling time ~80 years at that rate)
en("d121", 7, "will double in 35 years.", "will double in about 80 years.");
ko("d121", 7, "35년 내에 두배가", "약 80년 뒤에 두 배가");
hint("d121", "double 35 years.", "double 80 years.");
en("d122", 1, "a much larger population of its resources or distribute equally.", "a much larger population if its resources were distributed equally.");
ko("d122", 1, "배부된다면", "분배된다면");
en("d122", 5, "Africa and South America have an annual population growth of 2.8%.", "Africa's population is growing by more than 2% a year.");
ko("d122", 5, "아프리카와 남미는 2.8%의 연인구 성장률을 갖고 있다.", "아프리카의 인구는 해마다 2퍼센트 넘게 늘고 있다.");
en("d122", 6, "Europe's population, however, is increasing at a rate of 0.6%.", "Europe's population, however, is hardly growing at all.");
ko("d122", 6, "그러나 유럽의 인구는 0.6 퍼센트의 비율로 성장하고 있다.", "그러나 유럽의 인구는 거의 늘지 않고 있다.");
en("d122", 7, "North America's population has been increasing by 0.9% each year, but 2% of that rate is the result of immigration.",
  "North America's population is growing slowly, and much of that growth is the result of immigration.");
ko("d122", 7, "북미의 인구는 매년 0.9 퍼센트 성장하고 있지만 그 비율의 2 퍼센트는 이민의 결과이다.",
  "북미의 인구는 천천히 늘고 있는데, 그 증가의 상당 부분은 이민에 따른 것이다.");
hint("d122", "resources Africa South America annual population growth 2.8 percent. Europe's population,",
  "resources distributed equally Africa annual population growth Europe's population, immigration");
ko("d123", 3, "침전 - 비와 눈 - 의 형태로", "강수, 즉 비와 눈의 형태로");
ko("d123", 5, "11만 입방 킬로미터의 침전을", "11만 입방 킬로미터의 강수를");
en("d124", 6, "and is free managing it, however,", "and is free. Managing it, however,");
en("d125", 1, "build dams and streams and rivers.", "build dams on streams and rivers.");
ko("d126", 2, "북극 대양, 남극 대양은", "북극해, 남극해는");
ko("d127", 5, "태양은 또", "대양은 또");
ko("d127", 8, "선업 폐기물", "산업 폐기물");
ko("d128", 4, "나는 그가 지금 쫌 85세쯤이 틀림없다고 생각한다.", "나는 그가 지금쯤 틀림없이 85세쯤 되었을 거라고 생각한다.");
en("d130", 3, "recreational facilities. Tennis courts,", "recreational facilities, tennis courts,");
en("d130", 3, "fishing streams make up the resort.", "fishing streams, make up the resort.");
ko("d130", 6, "커다른", "커다란");
en("d131", 5, "All the guests are served in the All the guests are served in the lodge dining room.", "All the guests are served in the lodge dining room.");
ko("d131", 8, "대학생들에 의하여 주로 그 직원이 구성한다.", "대학생들이 주로 직원으로 일한다.");
ko("d131", 9, "Hickaman", "Hickman");
en("d132", 4, "I don't know. some people who make up their minds right away.", "I don't know. I know some people who make up their minds right away.");
en("d132", 5, "Doesn't matter how complicated the problem is.", "It doesn't matter how complicated the problem is.");
en("d132", 7, "I am amazed that they can be so sure.", "I'm surprised that they can be so confident.");
ko("d132", 7, "나는 그들이 그렇게 확신할 수 있는 것에 놀란다.", "나는 그들이 그렇게 자신만만할 수 있다는 것이 놀랍다.");
en("d134", 6, "in the suitcase 1st and", "in the suitcase first and");
ko("d134", 9, "언제가", "언제나");
ko("d135", 3, "세일 중인 옷들을", "세일 중인 양복들을");
ko("d135", 5, "가벼운 회색 양복", "연한 회색 양복");
en("d136", 5, "every sweater and his size,", "every sweater in his size,");
ko("d140", 10, "젊었을 나는", "젊었을 때 나는");
en("d142", 6, "We made-up our minds", "We made up our minds");
en("d143", 5, "the patient's heart took his blood pressure", "the patient's heart, took his blood pressure");
en("d143", 11, "Dr. Johnson I was certain", "Dr. Johnson. I was certain");
ko("d147", 7, "선물로써", "선물로");
ko("d148", 7, "따리", "따라");
ko("d149", 6, "미국이 언어가", "미국의 언어가");
en("d151", 2, "several 1000 miles long.", "several thousand miles long.");
ko("d152", 2, "국민으로써", "국민으로서");
ko("d152", 3, "교육들 더", "교육을 더");
ko("d155", 2, "훙미", "흥미");
ko("d155", 5, "준비시켜도 좋다.", "준비시킬 수도 있다.");
en("d155", 6, "personal management", "personnel management");
en("d155", 8, "Teaching newspaper work, medicine, engineering, these", "Teaching, newspaper work, medicine, engineering, these");

// ── L-65 … L-73 (d156–d190) ──────────────────────────────────────────────────────────────
ko("d156", 6, "Knga와", "Inga와");
ko("d156", 8, "잰슨씨 부부는", "젠슨 씨 부부는");
ko("d157", 4, "지배인으로써", "지배인으로서");
ko("d160", 4, "수 는 없다", "수는 없다");
ko("d161", 2, "관객이 되는 것은 것을", "관객이 되는 것을");
ko("d161", 5, "장기, 화투 치기, 춤추기는", "체스, 카드놀이, 춤추기는");
ko("d162", 1, "유모어 배우", "유머 작가");
ko("d162", 9, "더 작은 신문들이 있고", "신문이 더 적고");
hint("d164", "means of radio. sections edition front page sports society", "means of radio."); // the rest is d163's hint
DROP_HINT_BLOCK.push(["d164", "page, comics, amusement business editorials."]);
ko("d165", 1, "그것의 출연 이래로", "그것이 등장한 이래로");
// Telstar (1962) is not "the most recent advancement"
en("d165", 4, "Perhaps the most recent advancement of significance has been Telstar.", "One important advancement was Telstar, a communications satellite launched in 1962.");
ko("d165", 4, "아마도 중요한 가장 최근의 진보는 “Telstar\"이었다.", "중요한 진보 중 하나는 1962년에 발사된 통신 위성 “Telstar”였다.");
en("d166", 1, "Samuel Langorn Clemens.", "Samuel Langhorne Clemens.");
ko("d166", 1, "더 잘 알려져 있거나 더 사랑받지 않는다.", "미국 문학에서 새뮤얼 랭혼 클레멘스보다 더 잘 알려지거나 더 사랑받는 작가는 없다.");
ko("d166", 2, "“마크 퉤인이라는 필명을", "“마크 트웨인”이라는 필명을");
hint("d166", "Langorne", "Langhorne");
ko("d171", 1, "그냥 웃으면서 그녀에게 걱정하지 말하라고 말했다.", "나의 사촌은 매우 당황했지만 다행히 친구들은 그냥 웃으면서 그녀에게 걱정하지 말라고 말했다.");
answer("d171", 8, " (그 고양이가 식중독에 걸린 것이 아니라 차에 치었다)", "고양이는 식중독이 아니라 차에 치였던 것이다.");
ko("d173", 1, "리타 헤이워즈 같은", "리타 헤이워스 같은");
en("d173", 2, "Susan Haywood.", "Susan Hayward.");
ko("d175", 1, "그는 “나는 기계가 나를 바보로 만들도록 허용하기 전에 내 손에 해머를 쥐고 죽겠다.”고 말했다.",
  "그는 자신이 어떤 기계보다도 더 열심히, 더 빨리 일할 수 있다고 주장했다. “기계가 나를 바보로 만들게 두느니 차라리 손에 해머를 쥔 채 죽겠다.”고 그는 말했다.");
answer("d177", 9, "(어디에 애들을 놔뒀는지 잊었다.)", "그는 아이들을 어디에 두고 왔는지 잊어버렸다.");
ko("d180", 5, "그가 자신의 길을 보는 것을", "그가 자기 쪽을 흘끗 보는 것을");
answer("d180", 11, " (또 다른 변장한 조종사)", "그 간호사도 변장한 조종사였다.");
ko("d181", 1, "왼손잡이들은 불신당하거나 불찬성과 함께 주시되었다.",
  "태초부터 많은 사람들은 왼손잡이에게 무언가 잘못된 것이 있다고 믿어 왔다. 왼손잡이들은 불신당하거나 못마땅한 눈길을 받았다.");
// About one person in ten is left-handed
en("d181", 4, "Roughly 1/3 of the world's population is left-handed.", "Roughly one in ten people in the world is left-handed.");
ko("d181", 4, "세계의 인구의 약 1/3이 왼손잡이다.", "세계 인구의 약 10분의 1이 왼손잡이다.");
en("d181", 7, "For A left-hander", "For a left-hander");
en("d181", 10, "Anything left-handed Limited is", "Anything Left-Handed Limited is");
ko("d181", 10, "Anything Left-Handed.Ltd.는", "Anything Left-Handed Limited는");
en("d181", 11, "at reasonable prices a specially designed, reliable products", "at reasonable prices specially designed, reliable products");
ko("d181", 12, "이 기계는", "이 가게에는");
en("d181", 13, "The owner of anything left-handed,", "The owner of Anything Left-Handed,");
ko("d181", 13, "Anything Left-handed의", "Anything Left-Handed의");
hint("d181", "Anything Lefthanded,Ltd., London. especially designed", "Anything Left-Handed Limited, London. specially designed");
en("d182", 5, "just like it. had to be exactly the same size and quality as she wanted", "just like it. It had to be exactly the same size and quality, as she wanted");
ko("d183", 1, "짝이 맞는 진주에 대하여 25,000불을 제의했다.", "그 백만장자는 보석상에게 신문에 광고를 내라고 고집했고 짝이 맞는 진주에 25,000달러를 내겠다고 했다.");
ko("d183", 9, "그러나 그 백만장자는 발견되도록 어디에도 있지 않앗다.", "그러나 그 백만장자는 어디에서도 찾을 수 없었다.");
answer("d183", 9, "(공범자)", "그 백만장자와 노부인은 한패(공범)였다.");
// Jonker diamond: Harry Winston paid about $700,000; Kaplan cut it into 13 gems (1 large + 12)
en("d184", 6, "this time for almost $800,000.", "this time for about $700,000.");
ko("d184", 6, "이번에는 거의 80만불에.", "이번에는 약 70만 달러에.");
hint("d184", "eight hundred thousand", "seven hundred thousand");
en("d185", 5, "There will be 1 exquisite diamond that will be comparable to any in the world, plus 11 small diamonds of first-class quality.",
  "There will be one exquisite diamond that will be comparable to any in the world, plus 12 smaller diamonds of first-class quality.");
ko("d185", 5, "일류 품질의 11개의 작은 다이아몬드가", "일류 품질의 작은 다이아몬드 12개가");
ko("d187", 9, "나는 경찰을 부르도록 강제당 할 것입습니다.”", "나는 경찰을 부를 수밖에 없습니다.”");
answer("d187", 13, "(수수료가 백불)", "변호사는 “제 수임료는 100달러입니다.”라고 대답했다.");
en("d188", 5, "They had a good farm.", "They had fine plantations.");
ko("d188", 5, "그들은 좋은 농장을 갖고 있었다.", "그들은 훌륭한 농장들을 갖고 있었다.");
ko("d188", 6, "많은 것을 복사했다.", "많은 것을 따라 했다.");
ko("d188", 7, "한 체로키 과학자인", "한 체로키 학자인");
en("d188", 11, "that made-up the language.", "that made up the language.");
en("d188", 13, "HIS alphabet", "His alphabet");
en("d190", 4, "their horn blowing", "their horns blowing");

// ── L-75 … L-92 (d191–d276) ──────────────────────────────────────────────────────────────
ko("d191", 7, "그라나", "그러나");
ko("d191", 10, "괘 잘", "꽤 잘");
ko("d191", 11, "끔직한", "끔찍한");
answer("d191", 12, " (소경)", "그녀는 앞을 보지 못하는 사람이었다. 그래서 안개 속에서도 길을 잘 알았다.");
// L-80 "Aborigine(s)" is now considered offensive; "Aboriginal" is the accepted term
en("d192", 1, "are called Aborigines.", "are called Aboriginal Australians.");
ko("d192", 1, "Aborigines라고 불린다.", "Aboriginal Australians라고 불린다.");
en("d192", 7, "an Aborigine has the eyes", "an Aboriginal tracker has the eyes");
en("d192", 8, "The Aborigine's astonishing skill", "The Aboriginal trackers' astonishing skill");
en("d192", 10, "an old Aborigine tracker", "an old Aboriginal tracker");
en("d192", 11, "in the dusty St. and said", "in the dusty street and said");
hint("d192", "Aborigine tracker", "Aboriginal tracker");
en("d193", 6, "Fewer and fewer Aborigines live", "Fewer and fewer Aboriginal people live");
ko("d193", 6, "Aborigine 사람들이", "원주민들이");
ko("d194", 4, "전에서는", "전에는");
ko("d194", 6, "쇼”이 시민들이다.", "쇼”의 시민들이다."); // typo only — the row's wording waits for the owner (L-74)
ko("d195", 2, "미끌어지면", "미끄러지면");
ko("d196", 2, "어던", "어떤"); // typo only (L-74)
ko("d197", 2, "모든 시대의 어린이들을", "남녀노소 모두를");
ko("d197", 6, "Emmet Kelly이다", "Emmett Kelly이다");
hint("d197", "Emmet Kely,", "Emmett Kelly,");
ko("d199", 3, "함게", "함께");
ko("d200", 3, "인물 증", "인물 중");
// Franklin showed that lightning is electricity; he did not "discover electricity"
en("d200", 5, "led him to discover electricity and to invent", "led him to prove that lightning is electricity and to invent");
ko("d200", 5, "그가 전기를 발견하고", "그가 번개가 전기라는 것을 증명하고");
ko("d200", 6, "자극햇다", "자극했다");
en("d203", 5, "excessive kindness become a vice.", "excessive kindness becomes a vice.");
ko("d204", 2, "하숙생들의 최상의 이익을 심장에 갖고 있었다.", "하숙생들을 진심으로 위했다.");
en("d204", 5, "to a new border,", "to a new boarder,");
ko("d205", 1, "친절로 살해하는 경우다", "친절로 죽이는 경우다");
ko("d206", 1, "실질적인 농답(짖궂은 장난)을", "짓궂은 장난을");
ko("d209", 4, "신고식을 통하여 놓여(부쳐)지는데", "신고식을 치르게 되는데");
ko("d210", 1, "통털어", "통틀어");
ko("d213", 2, "그들 자신의 권리로 매혹적이다.", "그들 나름대로 흥미롭다.");
en("d215", 1, "215 In addition", "In addition"); // round number only — wording waits for the owner
en("d216", 7, "old wives tales.", "old wives' tales.");
ko("d216", 7, "그들은 단지 그런 것들을 늙은 아낙네의 이야기들의 흥미있는 예로 단지 여긴다.", "그들은 그런 것들을 옛날부터 전해 오는 미신의 흥미로운 예로 여길 뿐이다.");
ko("d217", 3, "부적으로써", "부적으로");
en("d218", 5, "external world collecting things is", "external world. Collecting things is");
en("d218", 6, "a collector he collects", "a collector. He collects");
en("d219", 4, "strangest collections in history", "strangest collections in literature");
ko("d219", 4, "역사상 가장 이상한 수집품들의 하나는", "문학에서 가장 이상한 수집의 하나는");
// L-78 d221 #5 is deleted below; its Korean is the first half of #6's sentence
ko("d221", 6, "여행자들을 위하여 대부분의 주들은", "길을 가면서 캠핑하고 여행이 끝날 때 안락한 휴양지에서 일주일 정도를 보내기를 원하는 여행자들을 위하여 대부분의 주들은");
en("d223", 3, "historic St. Augustine", "historic Saint Augustine");
en("d223", 4, "the villages you will see along the way.", "the villages one will see along the way.");
ko("d225", 7, "중재자였던 것과", "중재자인 것과");
en("d229", 3, "like the gypsies of Europe.", "like modern nomads.");
ko("d229", 3, "유럽의 집시와 비슷하다.", "현대의 유목민과 비슷하다.");
en("d229", 5, "side by side for miniature cities.", "side by side to form miniature cities.");
// Yosemite's name comes from a Miwok word, not a waterfall; the bristlecone pine is older than the sequoia
en("d230", 2, "Yosemite is named for one of its breathtaking waterfalls, the highest in the United States.",
  "Yosemite is famous for its breathtaking waterfalls, some of the highest in North America.");
ko("d230", 2, "요세미티는 미국에서 가장 높은 것인 그것의 숨을 죽이게 하는 폭포들의 하나를 따서 이름지어져있다.",
  "요세미티는 북아메리카에서 가장 높은 축에 드는, 숨이 멎을 만큼 아름다운 폭포들로 유명하다.");
ko("d230", 3, "세콰이에 국립공원이 있는데 그것은 거기에서 발견되는 거대한 세콰이어 나무들을 따라서 이름지어져있다.",
  "세쿼이아 국립공원이 있는데 그 이름은 거기에서 자라는 거대한 세쿼이아 나무들에서 따온 것이다.");
en("d230", 4, "The sequoia tree is the largest and oldest living thing in the world today.",
  "The giant sequoia is the largest tree in the world, and some sequoias are among the oldest living things.");
ko("d230", 4, "세콰이어 나무는 오늘날 세상에서 가장 크고 가장 오랜 살아있는 물건이다.",
  "자이언트 세쿼이아는 세계에서 가장 큰 나무이며, 어떤 세쿼이아는 가장 오래 산 생물에 속한다.");
// Petrified Forest: logs buried by mud and volcanic ash over 200 million years ago. Feeding bears is forbidden.
en("d231", 2, "Thousands of years ago, this area was a dense forest, but a violent earthquake turned it into a large sea.",
  "Millions of years ago, this area was a dense forest, but the fallen trees were buried under mud and volcanic ash.");
ko("d231", 2, "수천년전에 이 지역은 울창한 숲이었으나 격렬한 지진이 그것을 큰 바다로 바꾸었다.",
  "수백만 년 전에 이 지역은 울창한 숲이었지만 쓰러진 나무들이 진흙과 화산재에 묻혔다.");
en("d231", 6, "Its many tame bears also prove to be a delight to tourists.", "Its bears also prove to be a delight to tourists.");
ko("d231", 6, "그것의 많은 순한 곰도", "그곳의 곰들도");
en("d231", 7, "The bears do not hesitate to join picnickers for lunch.", "But picnickers must never share their lunch with the bears.");
ko("d231", 7, "그 곰들은 관광객과 점심을 같이하는 것을 주저하지 않는다.", "그러나 소풍객들은 절대로 곰에게 점심을 나눠 주어서는 안 된다.");
en("d231", 8, "Park officials, however, discourage", "Park officials also discourage");
ko("d231", 8, "공원 관리들은 방문객들이", "공원 관리들은 또 방문객들이");
hint("d231", "tame bears picnickers", "bears picnickers");
// New York–San Francisco is about 6 hours by jet
en("d236", 1, "by plane in 10 hours.", "by plane in about 6 hours.");
ko("d236", 1, "비행기로 열 시간 내에 될 수 있다.", "비행기로 약 여섯 시간이면 할 수 있다.");
en("d236", 2, "In the near future, jet planes will make this journey even shorter.", "In pioneer days, the same journey took many months.");
ko("d236", 2, "가까운 장래에, 제트비행기가 이 여행을 심지어 더 짧게 만들 것이다.", "개척 시대에는 같은 여행에 여러 달이 걸렸다.");
en("d236", 6, "Thus A businessman", "Thus a businessman");
ko("d237", 4, "우르렁거리기", "우르릉거리기");
ko("d238", 3, "병드는 느낌", "메스꺼운 느낌");
ko("d239", 8, "불쌍한 패배자라고", "패배를 못 견디는 사람이라고");
// L-89 gender stereotypes ("a man's first duty", wives as golf widows)
en("d240", 1, "Some people say that they feel like widows even though they are married.", "Some people say that they feel lonely even though they are married.");
ko("d240", 1, "일부 여성들은 비록 결혼했지만 과부처럼 느낀다고 말한다.", "어떤 사람들은 결혼했는데도 외롭다고 말한다.");
en("d240", 2, "It seems that their husbands spend so much time on the golf course that their wives see them only occasionally.",
  "It seems that their husbands or wives spend so much time on the golf course that they see them only occasionally.");
ko("d240", 2, "그들의 남편들이 너무나 많은 시간을 골프장에서 보내서 그들의 아내들이 단지 이따금씩만 보는 것같다.",
  "그들의 남편이나 아내가 골프장에서 너무 많은 시간을 보내서 배우자를 이따금씩만 보는 것 같다.");
en("d240", 3, "such men carry", "such people carry");
en("d240", 5, "A man's first duty is to his home and family.", "Our first duty is to our home and family.");
ko("d240", 5, "남자의 첫 의무는 그의 가정과 가족에 대해서이다.", "우리의 첫 의무는 가정과 가족에 대한 것이다.");
en("d240", 6, "After he has attended to these duties, he can spend his leisure time in the pursuit of his favorite sport.",
  "After we have attended to these duties, we can spend our leisure time in the pursuit of our favorite sports.");
ko("d240", 6, "이런 의무를 다 한 후에 여가 시간을", "이런 의무를 다한 후에 우리는 여가 시간을");
ko("d241", 1, "에술가", "예술가");
ko("d242", 2, "미국 축구 게임은", "미식축구 경기는");
en("d242", 5, "go to football games many people, however,", "go to football games. Many people, however,");
ko("d243", 3, "이국풍의 의상을", "기상천외한 의상을");
en("d244", 4, "Yum, This is the song", "Yum, yum, yum! This is the song");
ko("d244", 4, "얌얌얌.", "냠냠냠!");
ko("d244", 8, "무죄하다.", "악의가 없다.");
ko("d245", 4, "큰 횃불을 불붙였다.", "큰 모닥불을 피웠다.");
ko("d246", 2, "첨럼", "처럼");
ko("d248", 6, "그녀의 얼굴을 새빨갛게", "그녀의 얼굴은 새빨갛게");
hint("d248", "laughing mater.", "laughing matter.");
hint("d251", "judgement", "judgment", 2);
ko("d252", 3, "예절의 규칙들은 면접을 위하여 자신을 내놓을 때봐다 결코 더 중요하지 않다.", "면접을 보러 갈 때만큼 기본 예절이 중요한 때는 없다.");
ko("d252", 5, "그 회사에 대한 재산으로", "그 회사에 대한 자산으로");
ko("d253", 1, "정확하고 솔직하게", "정직하고 솔직하게");
ko("d254", 1, "면접관이의", "면접관의");
ko("d254", 8, "고용주로써", "고용주로서");
ko("d256", 4, "때가지", "때까지"); // typo only (L-84)
ko("d258", 7, "그들은 병에 대한 가장 명백한 치료제는 단지 음식을 주이는 것이다.", "그들의 병에 대한 가장 명백한 치료법은 그저 음식을 줄이는 것이다.");
en("d260", 4, "on the worst end of the fight.", "on the worse end of the fight.");
ko("d260", 5, "이린이들", "어린이들");
ko("d267", 1, "일반적인 규칙으로써 여러 세대를 걸쳐 화가들은 다소 가난에 쪼달렸다.", "일반적으로 여러 시대에 걸쳐 화가들은 다소 가난에 쪼들렸다.");
en("d268", 6, "a modern artist his conception", "a modern artist. His conception");
ko("d270", 4, "휘젓는 애국가를", "불러일으키는 국가를");
ko("d270", 5, "도시의 마을들은", "도시와 마을들은");
ko("d270", 6, "자연스로운", "자연스러운");
en("d271", 6, "A 100 years from now,", "A hundred years from now,");
ko("d272", 4, "일부로써", "일부로서");
en("d272", 6, "Every family has a maiden aunt who looks down her nose at the young generation's interest in that barbaric racket, but she will listen with pleasure to some of the classical racket of men like Wagner.",
  "Every family has an older relative who looks down on the young generation's interest in that barbaric racket, but who will listen with pleasure to some of the classical racket of men like Wagner.");
ko("d272", 6, "모든 가족은 그 야만적인 소음에 대한 더 젊은 세대의 관심을 내려다보는 노처녀 이모가 있다. 그러나 그녀는",
  "어느 가족에나 젊은 세대가 좋아하는 그 야만적인 소음을 깔보는 나이 든 친척이 있다. 그러나 그 사람도");
// Genesis 11: the languages were confused and the building stopped; the tower does not collapse.
// About 7,000 languages are spoken today.
en("d273", 3, "As a punishment for their pride, the tower collapsed and the language of the workers became confused.",
  "As a punishment for their pride, the language of the workers became confused, and they could not finish the tower.");
ko("d273", 3, "그들의 교만에 대한 처벌로써 그 탑이 무너져서 근로자들의 언어가 혼돈되었다.", "그들의 교만에 대한 벌로 일꾼들의 언어가 뒤섞였고, 그들은 탑을 완성할 수 없었다.");
en("d273", 5, "more than 1,000 languages", "more than 7,000 languages");
ko("d273", 5, "천개 이상의 언어가", "7,000개가 넘는 언어가");
// English has many dialects and many ambiguities; the old claims are replaced by true reasons
en("d275", 2, "The few dialects in English give it the advantage of being a standard language.",
  "The spread of the British Empire and the power of the United States helped make English a common international language.");
ko("d275", 2, "영어에 방언이 적은 것이 그것이 표준 언어가 되기에 유리하게 해준다.", "대영 제국의 확장과 미국의 힘은 영어가 국제 공용어가 되는 데 도움이 되었다.");
en("d275", 3, "In addition, English is very exact. It has few of the ambiguities that are found in many other modern tongues.",
  "In addition, English grammar is fairly simple in some ways. For example, its nouns have no gender.");
ko("d275", 3, "게다가 영어는 매우 정확하다. 그것은 많은 다른 현대 언어에서 발견되는 애매모호한 것이 별로 없다.",
  "게다가 영어 문법은 어떤 면에서는 꽤 단순하다. 예를 들어 영어 명사에는 성(性)이 없다.");
en("d275", 4, "This makes it ideal for", "This makes it useful for");
ko("d275", 4, "이상적으로", "유용하게");
ko("d275", 5, "언어로써", "언어로서");
en("d276", 4, "speaks 2 languages", "speaks two languages");

// L-78: the one row removed (d221 #5, not in the recording)
const DELETE = [["d221", "5", "You just want to camp along the way and spend a week or so in a cozy retreat at the end of your trip."]];

// L-00b standard loanword spelling, every Korean row
const LOANWORDS = [
  [/폴튜갈 ?어/g, "포르투갈어"], [/폴튜갈/g, "포르투갈"], [/불란서/g, "프랑스"], [/와싱턴/g, "워싱턴"], [/구라파/g, "유럽"],
  [/폴랜드/g, "폴란드"], [/이태리/g, "이탈리아"], [/개스/g, "가스"], [/쥬스/g, "주스"], [/디스코택/g, "디스코텍"],
  [/텔레비젼/g, "텔레비전"], [/쉬카고/g, "시카고"], [/뉴 ?올린즈/g, "뉴올리언스"], [/샌프랜시스코/g, "샌프란시스코"],
  [/헐리웃/g, "할리우드"], [/네델란드/g, "네덜란드"], [/자마이카/g, "자메이카"], [/오스트렐리아/g, "오스트레일리아"],
  [/알라스카/g, "알래스카"], [/미네아폴리스/g, "미니애폴리스"], [/레크레이션/g, "레크리에이션"], [/밸라드/g, "발라드"],
  [/벤조/g, "밴조"], [/스테디엄/g, "스타디움"], [/펜실바니아/g, "펜실베이니아"], [/놀웨이/g, "노르웨이"],
  [/보스톤/g, "보스턴"], [/아리조나/g, "애리조나"], [/때대로/g, "때때로"], [/짖궂|짖꿎/g, "짓궂"], [/All Sants/g, "All Saints"],
];
// L-00c PDF line breaks left as a space inside a word (dry run: ko-spacing-dry, every hit read)
const END = "(?=[.,!?”\"’)\\]]|$)";
const SPACING = [
  [new RegExp(`([가-힣]) (다|니다|습니다|이다|었다|았다|였다|졌다|렸다|켰다|웠다|쳤다|혔다)${END}`, "g"), "$1$2"],
  [/([가-힣]) (을|를|에|에서|에게|으로|로|의|는|은)(?= )/g, "$1$2"],
  [/([가-힣]) 지 (않|못)/g, "$1지 $2"],
];

// ─────────────────────────────────────────────────────────────────────────────────────────
const problems = [];
const raw = fs.readFileSync(SCRIPTS, "utf8");
if (JSON.stringify(JSON.parse(raw), null, 1) !== raw) problems.push("ld_english_scripts.json does not round-trip with 1-space indent");
const s = JSON.parse(raw);
const counts = Object.fromEntries(Object.entries(s).map(([id, rows]) => [id, rows.length]));
const row = (id, n) => (s[id] || []).find((r) => r.n === n);
const occurrences = (text, sub) => (sub ? text.split(sub).length - 1 : 0);

for (const [id, n, field, from, to] of ROWS) {
  const r = row(id, n);
  if (!r) { problems.push(`${id} #${n} not found`); continue; }
  const k = occurrences(r[field], from);
  if (k !== 1) { problems.push(`${id} #${n} ${field}: "${from}" occurs ${k}× in ${JSON.stringify(r[field])}`); continue; }
  r[field] = r[field].replace(from, () => to);
}
for (const [id, n, from, text] of ANSWERS) {
  const r = row(id, n);
  if (!r) { problems.push(`${id} #${n} not found`); continue; }
  if (occurrences(r.ko, from) !== 1) { problems.push(`${id} #${n} ko: answer part "${from}" not exactly once in ${JSON.stringify(r.ko)}`); continue; }
  r.ko = r.ko.replace(from, "").trim();
  r.answer = text;
}
for (const [id, n, text] of DELETE) {
  const i = s[id].findIndex((r) => r.n === n);
  if (i < 0 || s[id][i].en !== text) { problems.push(`${id} #${n} to delete differs`); continue; }
  s[id].splice(i, 1);
  s[id].forEach((r, idx) => { r.n = String(idx + 1); });
  counts[id] -= 1;
}
let loanHits = 0, spaceHits = 0;
const loanByWord = {};
for (const rows of Object.values(s)) for (const r of rows) {
  for (const [re, to] of LOANWORDS) {
    r.ko = r.ko.replace(re, (m) => { loanHits++; loanByWord[m] = (loanByWord[m] || 0) + 1; return to; });
  }
  for (const [re, to] of SPACING) {
    r.ko = r.ko.replace(re, (...m) => { spaceHits++; return to.replace("$1", m[1]).replace("$2", m[2]); });
  }
}
for (const [id, n] of Object.entries(counts)) if (s[id].length !== n) problems.push(`${id} row count ${s[id].length}, expected ${n}`);

// hints in the lesson files (keep each file's exact format)
function formatOf(text) {
  return { crlf: text.includes("\r\n"), indent: (text.match(/^\{\r?\n( +)"/) || [, "  "])[1].length, trailing: /\r?\n$/.test(text) };
}
function serialize(data, f) {
  let out = JSON.stringify(data, null, f.indent);
  if (f.crlf) out = out.replace(/\n/g, "\r\n");
  if (f.trailing) out += f.crlf ? "\r\n" : "\n";
  return out;
}
const lessonWrites = new Map();
const lesson = (id) => {
  if (lessonWrites.has(id)) return lessonWrites.get(id);
  const file = path.join(LESSONS, `${id}.json`);
  const text = fs.readFileSync(file, "utf8");
  const data = JSON.parse(text);
  const f = formatOf(text);
  if (serialize(data, f) !== text) problems.push(`${id}.json format not reproducible`);
  const entry = { file, data, f };
  lessonWrites.set(id, entry);
  return entry;
};
const hintBlocks = (d) => (d.blocks || []).filter((b) => b.type === "hints" || b.type === "instruction");
for (const [id, from, to, count] of HINTS) {
  const { data } = lesson(id);
  const total = hintBlocks(data).reduce((a, b) => a + occurrences(b.text, from), 0);
  if (total !== count) { problems.push(`${id}.json hint "${from}" occurs ${total}×, expected ${count}`); continue; }
  for (const b of hintBlocks(data)) b.text = b.text.split(from).join(to);
}
for (const [id, text] of DROP_HINT_BLOCK) {
  const { data } = lesson(id);
  const i = data.blocks.findIndex((b) => b.type === "instruction" && b.text === text);
  if (i < 0) { problems.push(`${id}.json: block "${text}" not found`); continue; }
  data.blocks.splice(i, 1);
}

if (problems.length) {
  console.error(`STOP — nothing written (${problems.length}):\n  ` + problems.join("\n  "));
  process.exit(1);
}
const enChanged = ROWS.filter((r) => r[2] === "en").length;
console.log(`rows: ${ROWS.length} edits (${enChanged} English, ${ROWS.length - enChanged} Korean), ${ANSWERS.length} riddle answers moved, ${DELETE.length} row removed`);
console.log(`Korean rules: loanwords ${loanHits} (${Object.entries(loanByWord).map(([w, c]) => `${w}×${c}`).join(" ")}), spacing ${spaceHits}`);
console.log(`hints: ${HINTS.length} edits + ${DROP_HINT_BLOCK.length} block removed in ${lessonWrites.size} lesson files`);
if (DRY) { console.log("--dry-run: nothing written"); process.exit(0); }
fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
for (const { file, data, f } of lessonWrites.values()) fs.writeFileSync(file, serialize(data, f));
console.log("written");
