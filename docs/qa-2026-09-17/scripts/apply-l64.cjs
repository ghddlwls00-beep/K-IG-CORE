#!/usr/bin/env node
/**
 * L-64 (owner decision 2026-09-17): put back the sentences the original LISTENING
 * recordings say but the lesson script lost.
 *
 * The site reads each round's English AND Korean from content/ld_english_scripts.json
 * ({n, ko, en} rows) and Azure Ava reads the English, so the script is both what a
 * learner hears and the dictation answer. Dictation progress is saved per row index
 * (LdLearningView `dictationProgress[i]`), so NO row is inserted or removed:
 *
 *   A. First sentence lost (19 rounds): prepended to row #1, English and a new Korean
 *      translation. d164 and d177 are different: their #1/#2 were ONE sentence split
 *      in two (Korean #1 stops mid-sentence) with a garbled English #1, so #1 and #2
 *      are merged into #2 and the lost first sentence becomes #1.
 *   B. English lost mid-passage (7 rounds): appended to the same row; the Korean
 *      already carries the sentence.
 *   C. d071 #8 "It was a breakdown." (not natural English for a broken phone) -> the
 *      recording's "It was out of order." (Korean 고장이었다 fits both).
 *   D. d177 #2/#4 speech-to-text name errors "Rut"/"Rud" -> "Rudd" (d176 Richard Rudd).
 *   E. Hint typos shown to learners: d164 "Unties States", d148 "185,0000,000".
 *
 * Wording comes from the speech-to-text of the recording
 * (docs/qa-2026-09-15/evidence/ld-transcripts.json), checked against the round's hint
 * line where it has one (d169 "two and a half inches", d185 "twelve whole months").
 * d173: the recording says Los Angeles "was not even there in 1848"; it was founded in
 * 1781 (a small town in 1848), so the sentence is added in a factually correct form.
 *
 * Every edit states the exact current text; the script stops without writing if any
 * differs. English changes need new speech clips (generate-azure-ava.mjs).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");

// A — prepend to row #1: [id, current #1 en, new en, new ko]
const FIRST = [
  ["d119", "When the Native Americans objected, fighting usually began.",
    "As the settlers moved west, they took more and more land from the Native Americans.",
    "정착민들이 서쪽으로 이동하면서 미국 원주민들에게서 점점 더 많은 땅을 빼앗았다."],
  ["d143", "I was worried and nervous.",
    "I was waiting for the doctor to finish his examination.",
    "나는 의사가 진찰을 끝내기를 기다리고 있었다."],
  ["d148", "Its neighbors are Canada to the north and Mexico to the south.",
    "The United States covers a large part of the North American continent.",
    "미국은 북아메리카 대륙의 넓은 부분을 차지한다."],
  ["d165", "Since its appearance, TV has had a tremendous effect on the daily life of people everywhere.",
    "Television is another major instrument of communication, permitting us to see as well as to hear the performer.",
    "텔레비전은 공연자의 소리를 들을 뿐 아니라 모습도 볼 수 있게 해 주는 또 하나의 주요한 전달 수단이다."],
  ["d167", "He had fallen in love with her picture even before he met her.",
    "In 1870, Mark Twain married Olivia Langdon.",
    "1870년에 마크 트웨인은 올리비아 랭던과 결혼했다."],
  ["d169", "Then he took over a bankrupt casino and carried on full-scale experiments.",
    "Dexter returned to Arizona and began experimenting with model machines that could make waves two and a half inches high.",
    "Dexter는 애리조나로 돌아와 2인치 반 높이의 파도를 만들 수 있는 모형 기계로 실험을 시작했다."],
  ["d170", "To save herself some time and work, she ordered the food in advance.",
    "Not long ago a cousin of mine invited 10 guests for lunch.",
    "얼마 전 내 사촌이 점심 식사에 손님 10명을 초대했다."],
  ["d172", "There were a few Spanish missions, some ranchers and farmers, and of course dangerous bandits who robbed anybody they could find.",
    "In the 1840s, California was almost uninhabited.",
    "1840년대에 캘리포니아에는 사람이 거의 살지 않았다."],
  ["d173", "These were the days of the great stars, actors and actresses like Cary Grant and Rita Hayworth.",
    "Los Angeles, which had been only a small town in 1848, had become a huge city and the movie capital of the world.",
    "1848년에는 작은 마을에 불과했던 로스앤젤레스는 거대한 도시이자 세계 영화의 중심지가 되어 있었다."],
  ["d174", "He worked on the construction of the Chesapeake and Ohio railroad toward the end of the 19th century.",
    "John Henry is one of the great heroes of American folklore.",
    "John Henry는 미국 민간 설화의 위대한 영웅 중 한 명이다."],
  ["d176", "Richard Rudd was so forgetful that he sometimes forgot what he was talking about in the middle of a sentence.",
    "I once knew a man whose memory was very bad.",
    "나는 예전에 기억력이 아주 나쁜 한 남자를 알고 지냈다."],
  ["d178", "It shouldn't take you more than about 10 seconds.",
    "Read the following set of numbers.",
    "다음 숫자들을 읽어 보라."],
  ["d179", "Fortunately, he was saved from his burning plane by a group of nuns from a nearby convent.",
    "During the war, a fighter pilot was shot down over occupied enemy territory.",
    "전쟁 중에 한 전투기 조종사가 적의 점령 지역 상공에서 격추되었다."],
  ["d180", "He had to stay in a small room as much as possible.",
    "He was not allowed to talk with either the nuns or the nurses.",
    "그는 수녀들과도 간호사들과도 이야기하는 것이 허락되지 않았다."],
  ["d182", "He explained that he wished to buy a pearl for his wife's birthday.",
    "An elegantly dressed man entered a famous jewelry shop one day.",
    "어느 날 우아하게 차려입은 한 남자가 유명한 보석 가게에 들어왔다."],
  ["d184", "He never really had much luck, and the longer he prospected, the less he believed in ever making his fortune.",
    "Jacobus Jonker was a diamond prospector in South Africa.",
    "Jacobus Jonker는 남아프리카의 다이아몬드 탐광자였다."],
  ["d185", "When he felt he was ready to start work, he discovered a flaw.",
    "Kaplan, the cutter, studied the diamond for twelve whole months.",
    "보석 세공사 Kaplan은 꼬박 12개월 동안 그 다이아몬드를 연구했다."],
];

// A' — split sentence merged into #2, lost first sentence becomes #1
const MERGE = [
  {
    id: "d164",
    cur1: ["They have both become an essential part of our daily lives.", "그 둘 다 우리의 일상 생활의 필수적인 일부분이 되어서"],
    cur2: ["Both of them have become an essential part of our daily life, keeping us informed of the news of the day, instructing us in many fields of interest, and entertaining us with singing, dancing, and acting.",
      "우리가 계속해서 그날의 소식에 대하여 정보를 받게 해주고 많은 관심 분야에 있어서 우리를 가르쳐주고 노래, 춤, 연기로 우리를 즐겁게 해준다."],
    new1: ["There are few homes in the United States today that do not have either a radio or television set.",
      "오늘날 미국에는 라디오나 텔레비전이 없는 가정이 거의 없다."],
    new2: ["Both of them have become an essential part of our daily life, keeping us informed of the news of the day, instructing us in many fields of interest, and entertaining us with singing, dancing, and acting.",
      "그 둘 다 우리의 일상 생활의 필수적인 일부분이 되어서 우리가 계속해서 그날의 소식에 대하여 정보를 받게 해주고 많은 관심 분야에 있어서 우리를 가르쳐주고 노래, 춤, 연기로 우리를 즐겁게 해준다."],
  },
  {
    id: "d177",
    cur1: ["Unfortunately, by the time Rudd gets to the train stop, his poor forgetfulness is gone.", "불행히도 Rudd가 기차 정거장에 도착할 무렵에는 그 가련한 건망증이"],
    cur2: ["Unfortunately, by the time Rut had arrived at the train station, the poor forgetful man had forgotten the name of his destination himself.",
      "심한 사람은 그 자신이 그 목적지의 이름을 잊었다."],
    new1: ["To make the trip more interesting for his young children, he kept the name of the town a secret.",
      "어린 자녀들에게 여행을 더 재미있게 해 주려고 그는 그 도시의 이름을 비밀로 했다."],
    new2: ["Unfortunately, by the time Rudd had arrived at the train station, the poor forgetful man had forgotten the name of his destination himself.",
      "불행히도 Rudd가 기차역에 도착했을 무렵에는 건망증이 심한 그 가련한 사람이 자기 목적지의 이름을 스스로 잊어버렸다."],
  },
];

// B, C, D — replace one row's English: [id, n, current en, new en]
const ROW_EN = [
  ["d007", "5", "John's father was born in Bern, Switzerland on November 12, 1931.",
    "John's father was born in Bern, Switzerland on November 12, 1931. He speaks French, German, Italian, and English."],
  ["d014", "7", "He can speak, read, and write Russian and Portuguese.",
    "He can speak, read, and write Russian and Portuguese. He can speak German, but he can't read it."],
  ["d045", "7", "It's an elective. Bill has three English classes a week.",
    "It's an elective. Bill has three English classes a week. He'll get 3 credits for English."],
  ["d085", "1", "A computer is a machine that is able to handle information very quickly.",
    "A computer is a machine that is able to handle information very quickly. Computers use numbers to solve problems."],
  ["d091", "5", "The third level is secondary education. Junior high school is usually for students from age 12 to 14.",
    "The third level is secondary education. It is for junior and senior high school students. Junior high school is usually for students from age 12 to 14."],
  ["d123", "5", "They receive 110,000 cubic kilometers of precipitation each year.",
    "They receive 110,000 cubic kilometers of precipitation each year. The result is that 40,000 cubic kilometers of fresh water are transferred from the oceans to the continents each year."],
  ["d058", "9", "Ford's cars were cheap because he had his own factories for most things he needed.",
    "Ford's cars were cheap because he had his own factories for most things he needed: glass, leather, wood."],
  ["d071", "8", "It was a breakdown.", "It was out of order."],
  ["d177", "4", "He offered to take care of the children while Rud went back home to find out where he was going.",
    "He offered to take care of the children while Rudd went back home to find out where he was going."],
];

// E — hint typos in the main lesson file: [id, from, to]
const HINTS = [
  ["d164", "Unties States", "United States"],
  ["d148", "185,0000,000", "185,000,000"],
];

const fail = (msg) => { console.error("STOP (nothing written): " + msg); process.exit(1); };
const raw = fs.readFileSync(SCRIPTS, "utf8");
if (JSON.stringify(JSON.parse(raw), null, 1) !== raw) fail("ld_english_scripts.json does not round-trip with 1-space indent");
const s = JSON.parse(raw);
const row = (id, n) => s[id].find((r) => r.n === n) || fail(`${id} #${n} not found`);
const counts = Object.fromEntries(Object.entries(s).map(([id, rows]) => [id, rows.length]));

for (const [id, cur, en, ko] of FIRST) {
  const r = row(id, "1");
  if (r.en !== cur) fail(`${id} #1 en is ${JSON.stringify(r.en)}`);
  r.en = `${en} ${r.en}`;
  r.ko = `${ko} ${r.ko}`;
}
for (const m of MERGE) {
  const r1 = row(m.id, "1"), r2 = row(m.id, "2");
  if (r1.en !== m.cur1[0] || r1.ko !== m.cur1[1]) fail(`${m.id} #1 differs`);
  if (r2.en !== m.cur2[0] || r2.ko !== m.cur2[1]) fail(`${m.id} #2 differs`);
  [r1.en, r1.ko] = m.new1;
  [r2.en, r2.ko] = m.new2;
}
for (const [id, n, cur, en] of ROW_EN) {
  const r = row(id, n);
  if (r.en !== cur) fail(`${id} #${n} en is ${JSON.stringify(r.en)}`);
  r.en = en;
}
const hintWrites = [];
for (const [id, from, to] of HINTS) {
  const file = path.join(REPO, "content/lessons/ld", `${id}.json`);
  const text = fs.readFileSync(file, "utf8");
  if (text.split(from).length !== 2) fail(`${id}.json: "${from}" is not exactly once`);
  hintWrites.push([file, text.replace(from, to)]);
}
for (const [id, n] of Object.entries(counts)) if (s[id].length !== n) fail(`${id} row count changed`);

fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
for (const [file, text] of hintWrites) fs.writeFileSync(file, text);
console.log(`scripts: ${FIRST.length} first sentences, ${MERGE.length} merges, ${ROW_EN.length} row edits; hints: ${HINTS.length}; row counts unchanged`);
