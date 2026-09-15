// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const sc = JSON.parse(fs.readFileSync(`${REPO}/content/ld_english_scripts.json`, "utf8"));
const R = (id) => JSON.parse(fs.readFileSync(`${REPO}/content/lessons/ld/${id}.json`, "utf8"));
// Sentence-fragment artifact: a capitalised function word glued to a lowercase clause without terminal punctuation,
// the typical signature of sentence-by-sentence machine translation re-joined in a different order.
const FRAG = /(?<![.!?:;"“”'’)\]]) (?:[a-z]+|[a-z]+,) (He|She|It|They|This|That|There|The|A|An|We|You|Likewise|However|And|But|So|Then|In|On|At|For|From|When|If|As|His|Her|Their|Our|My)\s/g;
const rows = [];
let lessonsWithFrag = 0, totalFrags = 0;
for (let i = 1; i <= 276; i++) {
  const id = `d${String(i).padStart(3, "0")}`;
  const en = (sc[id] || []).map((s) => s.en);
  const frags = [];
  en.forEach((s, k) => { for (const m of s.matchAll(FRAG)) { const at = m.index; frags.push(`#${k + 1}: …${s.slice(Math.max(0, at - 30), at + 30)}…`); } });
  const hints = R(id).blocks.find((b) => b.type === "hints")?.text || "";
  const words = [...new Set(hints.split(/[\s,.;:()'"]+/).filter((w) => w.length >= 4 && !/^\d/.test(w)).map((w) => w.toLowerCase()))];
  const all = en.join(" ").toLowerCase();
  const miss = words.filter((w) => !all.includes(w));
  const hintMiss = words.length ? miss.length / words.length : 0;
  if (frags.length) { lessonsWithFrag++; totalFrags += frags.length; }
  rows.push({ id, sentences: en.length, fragments: frags.length, fragSamples: frags.slice(0, 3), hintWords: words.length, hintMissing: miss, hintMissRatio: +hintMiss.toFixed(2) });
}
const suspect = rows.filter((r) => r.fragments > 0 || r.hintMissRatio >= 0.5);
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/ld-transcript-quality.json", JSON.stringify(rows, null, 1));
console.log({ lessonsWithFrag, totalFrags, hintMiss50: rows.filter((r) => r.hintMissRatio >= 0.5).length, suspectLessons: suspect.length });
console.log(rows.filter((r) => r.fragments).slice(0, 25).map((r) => `${r.id} (${r.fragments}) ${r.fragSamples[0]}`).join("\n"));
