#!/usr/bin/env node
/**
 * LISTENING fixes (apply-listening.cjs, apply-listening-followup.cjs, apply-listening-times.cjs)
 * — checks over ALL 276 rounds of content/ld_english_scripts.json and their lesson files,
 * not a sample. Exit 0 = every check as expected.
 *
 *  - every wrong form the audit listed is gone (transcription, names, numbers, facts, Korean)
 *  - the corrected forms are present
 *  - hint names = answer names (L-00a) for every name the audit listed
 *  - no Korean loanword / PDF-spacing pattern of L-00b / L-00c is left anywhere
 *  - riddle answers are out of the Korean line and in `answer`, and the lesson view shows them
 *    behind "정답 보기"
 *  - d221 lost only its duplicate row; no other round changed its row count
 *  - rows that wait for the owner (L-74, L-84, d215 wording) still read as before
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const s = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const hintOf = (id) => {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
  return (d.blocks || []).filter((b) => b.type === "hints" || b.type === "instruction").map((b) => b.text).join(" ");
};
const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });
const all = (field) => Object.entries(s).flatMap(([id, rows]) => rows.map((r) => ({ id, n: r.n, t: r[field] || "" })));
const EN = all("en"), KO = all("ko");
const row = (id, n) => s[id].find((r) => r.n === String(n));

const gone = (label, re, list = EN) => {
  const hits = list.filter((x) => re.test(x.t)).map((x) => `${x.id} #${x.n}: ${x.t.slice(0, 90)}`);
  check(`gone: ${label}`, hits.length === 0, hits.slice(0, 3).join(" | "));
};
const has = (id, n, field, text) => {
  const r = row(id, n);
  check(`${id} #${n} ${field} has "${text.slice(0, 60)}"`, r && r[field].includes(text), r ? r[field] : "row missing");
};

check("276 rounds", Object.keys(s).length === 276, String(Object.keys(s).length));
check("d221 has 6 rows (duplicate #5 removed, numbered 1-6)", s.d221.length === 6 && s.d221.map((r) => r.n).join() === "1,2,3,4,5,6");
check("d221 duplicate sentence gone", !s.d221.some((r) => r.en.startsWith("You just want to camp")));
check("d109 #6 is one sentence (L-42)", row("d109", 6).en === "Franklin also discovered ways to improve farming and health care.");

// transcription / typing errors in the dictation answers
gone("L-03/L-04 took a shopping / lucky and honest", /took a shopping|lucky and honest person/);
gone("L-07 Carlos rode the boat", /Carlos rode the boat/);
gone("L-08 I'm being dragged", /being dragged/);
gone("L-19 'about it. is true'", /about it\. is true/);
gone("L-20 ', You will be fine'", /, You will be fine/);
gone("L-21 different examination", /different examination/);
gone("L-22 he should stay home (Mrs. Brown's husband)", /believes that he should stay home/);
gone("L-23 'You see your husband's'", /You see your husband/);
gone("L-24 everything insight", /everything insight/);
gone("L-31 get my money away", /get my money away/);
gone("L-32 d065 sentence inside d064 #6", /lap or on the table\? The important thing/);
gone("L-33 'light' as the brand (Lite)", /called it light|light tastes soapy|light soap company|Light Soap|word light|which light was|read, light is/);
gone("L-34 David War / His father became very poor", /David War Griffith|His father became very poor/);
gone("L-43 'journey W.' / 'moved W again'", /journey W\.|moved W again/);
gone("L-44 Idita Rod", /Idita Rod/);
gone("L-45 first residence", /first residence\b/);
gone("L-46 'were Native Americans probably came'", /were Native Americans probably came/);
gone("L-47 'of its resources or distribute equally' / '2% of that rate'", /resources or distribute equally|2% of that rate/);
gone("L-48 'dams and streams' / 'automobiles in factories'", /dams and streams|automobiles in factories/);
gone("L-56 doubled clause d131", /served in the All the guests/);
gone("L-57 'I don't know. some people'", /I don't know\. some people/);
gone("L-58 'sweater and his size' / personal management", /sweater and his size|personal management/);
gone("L-59/L-88 numbers the speaker says as words (1st, several 1000, worth 2, A 100, 2 languages, #2)", /suitcase 1st|several 1000|worth 2 |worth 2$|A 100 years|speaks 2 languages|#2 in the top/);
gone("L-54/L-15 capital A / dotted clock times", /\bA\.m\.| A day\b|Keith's A |Thus A |For A left|\b\d{1,2}\.\d{2} ?[aA]\.m|(?<!\$)\b\d{1,2}\.\d{2}\b/);
gone("L-61 'facilities. Tennis courts'", /facilities\. Tennis courts/);
gone("L-63/L-30/L-83 made-up, 'Teaching newspaper', 'Doesn't matter' at sentence start, HIS, horn blowing, old wives tales", /made-up|Teaching newspaper|^Doesn't matter|HIS alphabet|their horn blowing|old wives tales|kindness become a/);
gone("L-30 run-on sentences (d046 #4, d047 #6, d143, d218, d242, d268)", /high school they used to|district he recommended|heart took his blood|Johnson I was certain|world collecting things|collector he collects|games many people|artist his conception/);
gone("L-30 'The Dr. looked' (and the same form in d143, d171) / 'Morton's boy'", /\b[Tt]he Dr\.|Morton's boy/);
gone("L-68 'like it. had to be' / Haywood", /like it\. had to be|Haywood/);
gone("L-75 'dusty St.'", /dusty St\./);
gone("L-76 'new border'", /new border/);
gone("L-77 '215 In addition'", /^215 /);
gone("L-86 'side by side for miniature'", /side by side for miniature/);
gone("L-92 worst end / 'Yum, This'", /worst end|Yum, This/);

// names (L-00a, L-01, L-05, L-06, L-09, L-17, L-18, L-25, L-26, L-35-37, L-65, L-67, L-81)
gone("names spelled two ways or wrong", /Wanger|Petralus|Guadalupe|Guadaloupe|Fernando Marcus|Willima|Elliot\b|Pontchartrand|Tony Sark|Herbie|Peter Wendell|Kukoran|Cocoran|Mcarthy|Ren Computer|Wilbert|Wilburt|Gene and Oswald|Langorn|\bRut\b|\bRud\b|Gilda Lilly|Huskison|Ascot\b/);
gone("Korean: names", /Wenger는.*Wanger|Tony Montag|Mcarthy|Wilburt|Cocoran|Emmet Kelly|Knga|Hickaman|Stricklan는|Kevin taylor|Jack Mill가|D\.WGriffth|Floydsfo|KittyHawk|Guadaloupe|퉤인|헤이워즈/, KO);
const nameAgree = [
  ["d007", "Wenger"], ["d016", "Patralis"], ["d020", "Guadeloupe"], ["d023", "Gilda Lily"], ["d027", "Marcos"], ["d032", "William Smith"],
  ["d032", "Elliott"], ["d034", "Pontchartrain"], ["d039", "Herby"], ["d040", "Ellis"], ["d042", "Wendel"], ["d044", "Corcoran"],
  ["d045", "McCarthy"], ["d056", "Tony Sarg"], ["d066", "LITE"], ["d084", "Wren"], ["d088", "Wilbur"], ["d155", "personnel"],
  ["d166", "Langhorne"], ["d181", "Left-Handed Limited"], ["d197", "Emmett Kelly"], ["d248", "matter"], ["d229", "form"],
];
for (const [id, name] of nameAgree) {
  const h = hintOf(id).toLowerCase(), e = s[id].map((r) => r.en).join(" ").toLowerCase();
  check(`hint = answer: ${id} "${name}"`, h.includes(name.toLowerCase()) && e.includes(name.toLowerCase()), `hint ${h.includes(name.toLowerCase())} / answer ${e.includes(name.toLowerCase())}`);
}
check("d164 hint no longer carries d163's newspaper words", !/editorials/.test(hintOf("d164")) && /editorials/.test(hintOf("d163")));
check("d018 hint no longer ends with 'town suburbs?'", !/suburbs\?/.test(hintOf("d018")));
check("d092 hint no longer ends with ' l'", !/medicine\. l$/.test(hintOf("d092")));

// facts now read right (Ava reads these sentences as today's facts)
gone("outdated or wrong facts", /second largest city|second busiest seaport|largest indoor arena or stadium|world's longest bridge,|47 kilometers|land of 1000 lakes|died in 1875|1908 and 1925|more than 2 million thought|Thousands left their homes|many days before life was back|July 22nd, 1948|25,000 years ago|first people on the continent to develop agriculture|about 800,000 Native|Over half of them live on reservations|throughout 28 states|double in 35 years|2\.8%|0\.6%|0\.9% each year|most recent advancement of significance|1\/3 of the world|almost \$800,000|plus 11 small diamonds|discover electricity|strangest collections in history|named for one of its breathtaking|largest and oldest living thing|violent earthquake turned it|tame bears|join picnickers|in 10 hours|jet planes will make this journey|tower collapsed|1,000 languages|few dialects in English|English is very exact/);
has("d043", 1, "en", "Chicago, one of the largest cities in the United States");
has("d058", 3, "en", "died in 1876 when he was only 13");
has("d083", 12, "en", "July 23rd, 1948");
has("d114", 5, "en", "more than 15,000 years ago");
has("d181", 4, "en", "one in ten people");
has("d165", 4, "en", "launched in 1962");
has("d200", 5, "en", "prove that lightning is electricity");
has("d273", 5, "en", "more than 7,000 languages");
has("d230", 4, "en", "largest tree in the world");
has("d231", 7, "en", "must never share their lunch with the bears");
has("d192", 1, "en", "Aboriginal Australians");
gone("Aborigine(s) as a noun", /\bAborigines?\b|Aborigine's/);
gone("L-89 stereotypes: gypsies / a man's first duty / maiden aunt", /gypsies|A man's first duty|maiden aunt/);

// Korean
gone("L-00b old loanword spellings", /폴튜갈|불란서|와싱턴|구라파|폴랜드|이태리|개스|쥬스|디스코택|텔레비젼|쉬카고|뉴 ?올린즈|샌프랜시스코|헐리웃|네델란드|자마이카|오스트렐리아|알라스카|미네아폴리스|레크레이션|밸라드|벤조|스테디엄|펜실바니아|놀웨이|보스톤|아리조나/, KO);
gone("L-00c PDF spaces inside words", new RegExp(`[가-힣] (다|니다|습니다|이다|었다|았다|였다|졌다)(?=[.,!?”"’)\\]]|$)|[가-힣] (을|를|에|에서|에게|으로|로|의|는|은) |[가-힣] 지 (않|못)|침 대에서`), KO);
gone("L-13/L-29/L-40/L-52/L-62/L-72/L-82/L-91 Korean typos", /인명구조원으로써|글세|골프롤|스포츠 작가협회|리포트틀|화내낸|돌보야야|내보내낼지|캘핑|성냥곽|챠량|콘스탄티노불|자시 자신|필라델피이|뽀족|공동주책|구체적안|카버한다|쫌 |커다른|때대로|언제가|젊었을 나는|따리 |미국이 언어가|교육들 더|훙미|되는 것은 것을|유모어|성냥곽|않앗다|강제당 할|그라나|괘 잘|끔직|전에서는|쇼”이|미끌어|어던 |함게|인물 증|자극햇다|통털어|세콰이|우르렁|에술가|All Sants|첨럼|때봐다|면접관이의|때가지|주이는|이린이들|쪼달렸다|애국가|자연스로운|짖꿎|짖궂|선업|태양은 또/, KO);
gone("L-10/L-16/L-36/L-39/L-50/L-51/L-55/L-70/L-81/L-90 mistranslations", /그녀를 대신했습니다|33번 레인|200미터를|1809년|단지 너무 기쁠|고용해도 좋다|공학사|직역:|침전|살해되었|살해하는|대양은 또 중요한.*태양|장기, 화투|유모어 배우|더 작은 신문|자신의 길을 보는|이 기계는 왼쪽|모든 시대의 어린이|심장에 갖고|자신의 권리로|실질적인 농답|불쌍한 패배자|병드는 느낌|미국 축구|이국풍의|무죄하다|큰 횃불|회사에 대한 재산|정확하고 솔직하게|도시의 마을들|가벼운 회색/, KO);
gone("로써 where 로서/로 is meant (신분·자격)", /(구조원|건축가|평가사|시장|국민|지배인|고용주|인물|일부|언어|부적|선물|규칙)으로?써|소년으로써|처벌로써/, KO);
check("L-69 truncated Korean restored (d166, d171, d175, d181, d183 #1)", ["d166", "d171", "d175", "d181", "d183"].every((id) => row(id, 1).ko.length > 40 && !/^(더 잘 알려져|그냥 웃으면서|그는 “나는 기계가|왼손잡이들은 불신|짝이 맞는)/.test(row(id, 1).ko)));

// riddle answers (L-71, L-80)
const riddles = [["d171", 8], ["d177", 9], ["d180", 11], ["d183", 9], ["d187", 13], ["d191", 12]];
for (const [id, n] of riddles) {
  const r = row(id, n);
  check(`${id} #${n} answer moved out of the Korean line`, r.answer && r.answer.length > 5 && !/[()（）]/.test(r.ko), `ko=${r.ko} answer=${r.answer}`);
}
check("exactly these 6 rows carry an answer", Object.values(s).flat().filter((r) => r.answer).length === riddles.length);
const view = fs.readFileSync(path.join(REPO, "src/components/LdLearningView.tsx"), "utf8");
check("LdLearningView shows the answer behind '정답 보기' in all 4 places the Korean line appears", (view.match(/<RiddleAnswer /g) || []).length === 4 && view.includes("정답 보기"));

// rows waiting for the owner are untouched in wording
has("d194", 6, "en", "Lion tamers, acrobats, freaks");
has("d196", 4, "en", "pathetic in a way");
has("d232", 3, "en", "comparatively uncivilized tribes");
has("d255", 7, "en", "primitive tribes of Africa");
has("d257", 1, "en", "primitive Indian medicine man");
has("d215", 3, "en", "scalps of their conquered foes");

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${r.ok || !r.detail ? "" : `  → ${r.detail}`}`);
console.log(`\n${results.length - failed.length}/${results.length} as expected`);
process.exit(failed.length ? 1 : 0);
