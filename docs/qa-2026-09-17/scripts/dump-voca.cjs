#!/usr/bin/env node
/**
 * Phase 5 — VOCA (course `phonics`): every lesson word and every dictionary entry,
 * for reading item by item, plus the mechanical checks that follow from how
 * `PhonicsLearningView.tsx` and `vocaUtils.ts` use the data.
 *
 *   - word shows the fallback "단어" (getMeaning finds nothing)
 *   - word is dropped from the quizzes / speed drill (they look up
 *     vocaDict[word.toLowerCase().trim()] without stripping ( ) " — getMeaning strips them)
 *   - Leitner card starts with "단어" (it looks up [clean] or [w], also unstripped)
 *   - two different words in one lesson carry the identical meaning string
 *     (speed drill: a "mismatch" item can then display the correct meaning)
 *   - word repeated inside one lesson
 *   - dictionary key ≠ its own searchWord, and dictionary entries no lesson uses
 *   - headword spelled differently from the same word elsewhere (edit distance 1, same meaning)
 *
 * Output: out/content/voca-lessons.tsv, out/content/voca-dictionary.tsv, out/content/voca-checks.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const dir = path.join(REPO, "content/lessons/phonics");

const checks = {};
const flag = (name, where) => (checks[name] ||= []).push(where);
const getMeaning = (w) => {
  const clean = w.toLowerCase().replace(/[()"]/g, "").trim();
  return dict[w]?.meaning || dict[clean]?.meaning || "단어";
};

const used = new Map(); // key -> lessons
const lessonLines = ["lesson\ttitle\trow\tcol\tword\tmeaning"];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
let words = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const id = d.id;
  const grid = (d.blocks || []).find((b) => b.type === "wordgrid");
  if (!grid) {
    flag("lesson without wordgrid", id);
    continue;
  }
  const seen = new Map();
  const meaningToWords = new Map();
  grid.rows.forEach((row, r) =>
    row.forEach((raw, c) => {
      const w = (raw || "").trim();
      if (!w) {
        flag("empty grid cell", `${id} r${r + 1}c${c + 1}`);
        return;
      }
      words++;
      const m = getMeaning(w);
      lessonLines.push([id, (d.title || "").replace(/\s+/g, " "), r + 1, c + 1, w, m].join("\t"));
      const lower = w.toLowerCase().trim();
      const key = dict[w] ? w : lower.replace(/[()"]/g, "").trim();
      if (!used.has(key)) used.set(key, new Set());
      used.get(key).add(id);
      if (m === "단어") flag("no meaning — shows fallback 단어", `${id} ${w}`);
      if (m !== "단어" && !dict[lower]?.meaning) flag("has meaning but dropped from quiz/speed drill (lookup not stripped)", `${id} ${w}`);
      if (seen.has(lower)) flag("word repeated in lesson", `${id} ${w}`);
      seen.set(lower, true);
      if (m !== "단어") {
        if (!meaningToWords.has(m)) meaningToWords.set(m, new Set());
        meaningToWords.get(m).add(lower);
      }
      if (/[^A-Za-z '\-.()"/]/.test(w)) flag("non-letter characters in word", `${id} ${w}`);
    }),
  );
  for (const [m, ws] of meaningToWords) if (ws.size > 1) flag("different words, identical meaning in one lesson", `${id} [${[...ws].join(", ")}] = ${m}`);
}

const dictLines = ["key\tsearchWord\tmeaning\tlessons"];
for (const [k, v] of Object.entries(dict).sort((a, b) => a[0].localeCompare(b[0]))) {
  const ls = used.get(k);
  dictLines.push([k, v.searchWord ?? "", (v.meaning || "").replace(/\s+/g, " "), ls ? [...ls].join(" ") : "(unused)"].join("\t"));
  if (!ls) flag("dictionary entry no lesson uses", k);
  if (v.searchWord && v.searchWord !== k) flag("searchWord differs from key", `${k} → ${v.searchWord}`);
  if (!v.meaning) flag("dictionary entry without meaning", k);
}
// near-duplicate spellings: same meaning, edit distance 1
const lev1 = (a, b) => {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
};
const keys = Object.keys(dict);
const byMeaning = new Map();
for (const k of keys) {
  const m = dict[k].meaning;
  if (!byMeaning.has(m)) byMeaning.set(m, []);
  byMeaning.get(m).push(k);
}
for (const [m, ks] of byMeaning) for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (lev1(ks[a], ks[b])) flag("same meaning, spelling differs by one letter (possible typo)", `${ks[a]} / ${ks[b]} = ${m}`);

fs.writeFileSync(path.join(OUT, "voca-lessons.tsv"), lessonLines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "voca-dictionary.tsv"), dictLines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "voca-checks.json"), JSON.stringify(checks, null, 1));
console.log(`VOCA: ${files.length} lessons, ${words} grid words, ${keys.length} dictionary entries`);
for (const [name, list] of Object.entries(checks)) console.log(`${String(list.length).padStart(5)}  ${name}   e.g. ${list.slice(0, 4).join(" | ")}`);
