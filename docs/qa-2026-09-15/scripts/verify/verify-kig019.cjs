// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-019 verification: after the fix, every VOCA recall question must have
// exactly one correct option, 4 distinct options, and no placeholder filler.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const vocaUtils = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const vocaDict = JSON.parse(
  fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"),
);

function getMeaning(word) {
  if (!word) return "";
  const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
  return vocaDict[word]?.meaning || vocaDict[clean]?.meaning || "단어";
}

const dir = path.join(REPO, "content/lessons/phonics");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !/-1\.json$/.test(f));

const problems = [];
const placeholderLessons = new Set();
let questions = 0;

for (const f of files.sort()) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const grid = (lesson.blocks || []).find((b) => b.type === "wordgrid");
  const words = (grid?.rows ?? []).flat().map((w) => (w || "").trim()).filter(Boolean);
  if (!words.length) continue;
  const dictMap = {};
  for (const w of words) dictMap[w.toLowerCase().trim()] = { meaning: getMeaning(w) };

  const seen = new Set();
  for (let run = 0; run < 60; run++) {
    for (const q of vocaUtils.generateActiveRecallQuizzes(words, dictMap)) {
      questions++;
      const key = `${q.id}|${q.options.join("\u0001")}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (q.options.length !== 4) {
        problems.push({ lesson: f, id: q.id, why: `options=${q.options.length}` });
      }
      if (new Set(q.options).size !== q.options.length) {
        problems.push({ lesson: f, id: q.id, why: "duplicate option", options: q.options });
      }
      if (q.options[q.correctIndex] !== (q.questionType === "ko-to-en" ? q.word : q.correctMeaning)) {
        problems.push({ lesson: f, id: q.id, why: "correctIndex mismatch", options: q.options });
      }
      const correctText = q.options[q.correctIndex];
      const nCorrect =
        q.questionType === "ko-to-en"
          ? q.options.filter((o) => getMeaning(o) === q.correctMeaning).length
          : q.options.filter((o) => o === correctText).length;
      if (nCorrect !== 1) {
        problems.push({
          lesson: f,
          id: q.id,
          why: `${nCorrect} correct options`,
          options: q.options,
          meaning: q.correctMeaning,
        });
      }
      if (q.options.some((o) => /^vocab\d+$/.test(o) || /^단어 의미 \d+$/.test(o))) {
        placeholderLessons.add(f);
      }
    }
  }
}

console.log("lessons:", files.length, "questionInstances:", questions);
console.log("problems:", problems.length);
if (problems.length) console.log(JSON.stringify(problems.slice(0, 8), null, 1));
console.log("lessonsStillUsingPlaceholderOptions:", placeholderLessons.size);
if (placeholderLessons.size) console.log([...placeholderLessons].join(", "));

// The 14 lessons the audit flagged must now offer a *real* alternative.
const flagged = [
  "hv-02", "hv-09", "hv-11", "hv-15", "hv-27", "hv-29", "hv-32", "hv-33",
  "hv-55", "hv-66", "hv-67", "hv-71", "mv1-03", "mv2-32",
];
for (const id of flagged) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8"));
  const grid = (lesson.blocks || []).find((b) => b.type === "wordgrid");
  const words = (grid?.rows ?? []).flat().map((w) => (w || "").trim()).filter(Boolean);
  const dictMap = {};
  for (const w of words) dictMap[w.toLowerCase().trim()] = { meaning: getMeaning(w) };
  const qs = vocaUtils.generateActiveRecallQuizzes(words, dictMap);
  const ko = qs.filter((q) => q.questionType === "ko-to-en").map((q) => `${q.correctMeaning}: ${q.options.join(" / ")}`);
  console.log(`  ${id}: ${ko.join(" | ")}`);
}
