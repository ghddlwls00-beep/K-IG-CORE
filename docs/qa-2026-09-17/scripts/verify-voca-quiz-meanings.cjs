#!/usr/bin/env node
/**
 * ISS-11 — for EVERY VOCA lesson, do the Step 2 quiz and the Step 4 speed drill teach the
 * same meaning as the word card the learner sees?
 *
 * Runs the shipped code where it is importable:
 *   - src/lib/content.ts getVocaDictionaryForWords(words)   (what the page passes down)
 *   - src/lib/vocaUtils.ts generateActiveRecallQuizzes, generateSpeedDrillItems
 * The map the component hands those generators lives inside PhonicsLearningView.tsx
 * (getMeaning + dictMap, lines 94-102 and 211-218 — identical in c14c03d), so it is
 * mirrored here line for line.
 *
 * RESULT 2026-09-17: 195 lessons, 5,831 words, every count 0 — ISS-11 / V-01 / V-02
 * were an audit error (the audit read vocaUtils' lower-case lookup without the map the
 * component builds). Kept as the regression check for that code path.
 *
 * Per lesson grid word (card meaning = exact key, then lower-cased stripped key):
 *   quizMismatch   — the quiz question for that word has a different correctMeaning
 *   quizMissing    — no quiz question for that word
 *   drillMismatch  — the drill item's actualMeaning differs from the card
 *   koToEnSameMeaning — a ko-to-en question offers another word with the same meaning
 * Random order is irrelevant: every question is checked. Exit 1 if any count > 0.
 *
 *   node verify-voca-quiz-meanings.cjs
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const content = loadTs(path.join(REPO, "src/lib/content.ts"));
const voca = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));

const cardMeaning = (dict, w) => {
  const clean = w.toLowerCase().replace(/[()"]/g, "").trim();
  return dict?.[w]?.meaning || dict?.[clean]?.meaning || "단어";
};
function meaningMap(words, dict) {
  const map = {};
  for (const w of words) map[w.toLowerCase().trim()] = { meaning: cardMeaning(dict, w) };
  return map;
}

const dir = path.join(REPO, "content/lessons/phonics");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const totals = { lessons: 0, words: 0, quizMismatch: 0, quizMissing: 0, drillMismatch: 0, koToEnSameMeaning: 0 };
const examples = { quizMismatch: [], quizMissing: [], drillMismatch: [], koToEnSameMeaning: [] };
const add = (k, v) => { totals[k]++; if (examples[k].length < 12) examples[k].push(v); };
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const grid = (d.blocks || []).find((b) => b.type === "wordgrid");
  if (!grid) continue;
  totals.lessons++;
  const words = grid.rows.flat().map((w) => w && w.trim()).filter(Boolean);
  const dict = content.getVocaDictionaryForWords(words);
  const map = meaningMap(words, dict);
  const quizzes = voca.generateActiveRecallQuizzes(words, map);
  const drill = voca.generateSpeedDrillItems(words, map);
  words.forEach((w, i) => {
    totals.words++;
    const card = cardMeaning(dict, w);
    // quizzes/drill keep the order of `words` except drill (shuffled): match by index for
    // quizzes (they map validWords in order) and by id suffix for drill.
    const q = quizzes.find((x) => x.word === w && x.id.endsWith(`-${i}`)) || quizzes.find((x) => x.word === w);
    if (!q) add("quizMissing", `${d.id} ${w}`);
    else if (q.correctMeaning !== card) add("quizMismatch", `${d.id} ${w}: card "${card}" quiz "${q.correctMeaning}"`);
    const s = drill.find((x) => x.word === w && x.id.endsWith(`-${i}`)) || drill.find((x) => x.word === w);
    if (s && s.actualMeaning !== card) add("drillMismatch", `${d.id} ${w}: card "${card}" drill "${s.actualMeaning}"`);
  });
  for (const q of quizzes.filter((x) => x.questionType === "ko-to-en")) {
    for (const opt of q.options) {
      if (opt === q.word || /^vocab\d$/.test(opt)) continue;
      if (cardMeaning(dict, opt) === q.correctMeaning) add("koToEnSameMeaning", `${d.id} [${q.correctMeaning}] ${q.word} vs ${opt}`);
    }
  }
}
console.log(totals);
for (const [k, v] of Object.entries(examples)) if (v.length) console.log(`  ${k}: ${v.join(" | ")}`);
process.exit(totals.quizMismatch + totals.quizMissing + totals.drillMismatch + totals.koToEnSameMeaning ? 1 : 0);
