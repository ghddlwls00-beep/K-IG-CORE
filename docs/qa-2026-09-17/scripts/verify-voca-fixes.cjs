#!/usr/bin/env node
/**
 * VOCA fixes (apply-voca.cjs + src/lib/vocaUtils.ts) — checks over ALL 195 lessons and the whole
 * dictionary, running the shipped code where it is importable (content.ts, vocaUtils.ts).
 * Written and run by the same agent that made the fixes. Exit 0 = every check as expected.
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const content = loadTs(path.join(REPO, "src/lib/content.ts"));
const voca = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));

const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });
const cardMeaning = (d, w) => d?.[w]?.meaning || d?.[w.toLowerCase().replace(/[()"]/g, "").trim()]?.meaning || null;

const dir = path.join(REPO, "content/lessons/phonics");
const lessons = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (d.blocks || []).find((b) => b.type === "wordgrid");
  return { id: d.id, words: g ? g.rows.flat().map((w) => w && w.trim()).filter(Boolean) : [] };
}).filter((l) => l.words.length);
check("195 VOCA lessons, 5,831 cells", lessons.length === 195 && lessons.reduce((n, l) => n + l.words.length, 0) === 5831);

// every cell has its own dictionary meaning (not the "단어" fallback)
let bad = lessons.flatMap((l) => l.words.filter((w) => !cardMeaning(dict, w)).map((w) => `${l.id} ${w}`));
check("every cell has a dictionary meaning", bad.length === 0, bad.join(" "));
const used = new Set(lessons.flatMap((l) => l.words));
bad = Object.keys(dict).filter((k) => !used.has(k));
check("no dictionary headword that no lesson uses (removed misspellings are gone)", bad.length === 0, bad.slice(0, 10).join(" "));

// V-03 / V-10
bad = lessons.filter((l) => new Set(l.words.map((w) => w.toLowerCase())).size !== l.words.length).map((l) => l.id);
check("V-03/V-10: no word twice in any lesson (was mv2-12 ×18, hv-44, hv-48, hv-58)", bad.length === 0, bad.join(" "));
const mv212 = lessons.find((l) => l.id === "mv2-12").words;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October"];
check("V-03 mv2-12: 30 different words, November and December kept, no month mv2-11 already teaches", mv212.length === 30 && mv212.includes("November") && mv212.includes("December") && !mv212.some((w) => MONTHS.includes(w)), mv212.join(","));
check("V-03 mv2-12: all seven days of the week", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].every((w) => mv212.includes(w)));

// V-04 data: identical meaning inside a lesson (the meaning the card shows)
bad = [];
for (const l of lessons) {
  const d = content.getVocaDictionaryForWords(l.words);
  const by = new Map();
  for (const w of l.words) { const m = cardMeaning(d, w); by.set(m, [...(by.get(m) || []), w]); }
  for (const [m, ws] of by) if (ws.length > 1) bad.push(`${l.id} [${ws.join(", ")}] = ${m}`);
}
check("V-04 data: no two words with the identical meaning in one lesson (was 37 pairs)", bad.length === 0, bad.slice(0, 5).join(" | "));

// V-04 code: the drill never shows the correct meaning on a "does not match" item
const RUNS = 40;
let drillBad = 0, drillItems = 0;
for (const l of lessons) {
  const d = content.getVocaDictionaryForWords(l.words);
  const map = Object.fromEntries(l.words.map((w) => [w.toLowerCase().trim(), { meaning: cardMeaning(d, w) }]));
  for (let r = 0; r < RUNS; r++) for (const it of voca.generateSpeedDrillItems(l.words, map)) {
    drillItems++;
    if (!it.isMatch && it.displayedMeaning === it.actualMeaning) drillBad++;
    if (it.displayedMeaning === "다른 뜻") drillBad++;
  }
}
check(`V-04 code: drill items with "불일치" but the correct meaning shown — 0 (${drillItems.toLocaleString()} items, ${RUNS} runs per lesson)`, drillBad === 0, String(drillBad));
// the rule itself, independent of today's data: a lesson where every word has the same meaning
const same = { alpha: { meaning: "같은 뜻" }, beta: { meaning: "같은 뜻" }, gamma: { meaning: "같은 뜻" } };
let sameBad = 0;
for (let r = 0; r < 200; r++) for (const it of voca.generateSpeedDrillItems(["alpha", "beta", "gamma"], same)) if (!it.isMatch) sameBad++;
check("V-04 code: with only same-meaning words, no item is ever a \"불일치\" (200 runs)", sameBad === 0, String(sameBad));

// V-05
const OLD_SPELLING = ["ancesto", "calender", "scissor", "livingroom", "technologic", "\"insistence,-cy\""];
bad = lessons.flatMap((l) => l.words.filter((w) => OLD_SPELLING.includes(w)).map((w) => `${l.id} ${w}`)).concat(OLD_SPELLING.filter((w) => dict[w]));
check("V-05: misspelt words gone from cells and dictionary", bad.length === 0, bad.join(" "));
check("V-05: corrected words in place (hv-01 ancestor, mv1-38 calendar, hv-23 scissors, mv1-19 living room, hv-66 technological, hv-62 insistence)",
  [["hv-01", "ancestor"], ["mv1-38", "calendar"], ["hv-23", "scissors"], ["mv1-19", "living room"], ["hv-66", "technological"], ["hv-62", "insistence"]].every(([id, w]) => lessons.find((l) => l.id === id).words.includes(w)));
const speechTable = fs.readFileSync(path.join(REPO, "src/lib/vocaSpeech.ts"), "utf8");
bad = [...used].filter((w) => /[^A-Za-z .'-]/.test(w) && !speechTable.includes(JSON.stringify(w).slice(1, -1)));
check("V-05: no cell with stray symbols except the bracket forms the speech table maps", bad.length === 0, bad.join(" "));

// V-06 … V-09
check("V-06 apparently = 보아하니, 겉보기에는", dict.apparently.meaning === "보아하니, 겉보기에는", dict.apparently.meaning);
const HAS = { number: "수", call: "부르다", train: "훈련", poor: "형편없는", since: "때문에", day: "하루", old: "오래된", western: "서양", break: "깨다", rest: "나머지", still: "그런데도", study: "연구", right: "권리", left: "떠났다", foot: "피트", sentence: "형벌", source: "원천", quality: "자질", essential: "필수", demand: "요구", care: "돌봄", consideration: "고려", contact: "접촉", atmosphere: "대기" };
bad = Object.entries(HAS).filter(([w, part]) => !dict[w].meaning.includes(part)).map(([w]) => `${w}=${dict[w].meaning}`);
check("V-07: the 24 one-sense meanings now carry the basic sense", bad.length === 0, bad.join(" "));
check("V-08: emigrant ≠ immigrant ≠ migrant, presently 곧, incidentally 그런데, pastime 취미, prominent 저명한",
  new Set([dict.emigrant.meaning, dict.immigrant.meaning, dict.migrant.meaning]).size === 3 && dict.presently.meaning.startsWith("곧") && dict.incidentally.meaning.startsWith("그런데") && dict.pastime.meaning.startsWith("취미") && dict.prominent.meaning.startsWith("저명한"));
bad = Object.entries(dict).filter(([, v]) => /[가-힣](할|볼|믿을)만한|하게하다|인기있는|재치있는|하지 않는다$/.test(v.meaning)).map(([k, v]) => `${k}=${v.meaning}`);
check("V-09: no 할만한 / 하게하다 / 인기있는 / 않는다 spacing or form left", bad.length === 0, bad.join(" "));
check("V-09 pebbles = 조약돌", dict.pebbles.meaning.includes("조약돌"));

// V-11
const etym = ["recover", "foremost"].map((w) => voca.analyzeEtymology(w));
const kept = ["predict", "prevent", "ancestor", "transport", "overcome"].map((w) => voca.analyzeEtymology(w));
check("V-11: no etymology card for recover / foremost; the other breakdowns still there", etym.every((e) => e === null) && kept.every(Boolean));

// the existing regression check still passes
const { execFileSync } = require("child_process");
let quizOk = true, quizOut = "";
try { quizOut = execFileSync(process.execPath, [path.join(__dirname, "verify-voca-quiz-meanings.cjs")], { encoding: "utf8" }); } catch (e) { quizOk = false; quizOut = String(e.stdout || e); }
check("verify-voca-quiz-meanings.cjs (card = quiz = drill meaning) still exit 0", quizOk, quizOut.slice(0, 300));

let fail = 0;
for (const r of results) { if (!r.ok) fail++; console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${r.ok || !r.detail ? "" : "\n      " + r.detail}`); }
console.log(`\n${results.length - fail}/${results.length} checks pass`);
process.exit(fail ? 1 : 0);
