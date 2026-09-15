// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
const fs = require("fs");
process.chdir("C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE");
const { loadTs } = require("./tsload.cjs");
const ru = loadTs("C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/src/lib/readingUtils.ts");
const R = (id) => JSON.parse(fs.readFileSync(`content/lessons/reading/${id}.json`, "utf8"));
const letters = (t) => (t || "").toLowerCase().replace(/[^a-z]/g, "");
const hang = (t) => (t || "").replace(/[^\uAC00-\uD7A3]/g, "");
const bigrams = (t) => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
const dice = (a, b) => { const A = bigrams(a), B = bigrams(b); let inter = 0, tot = 0; for (const [k, v] of A) { inter += Math.min(v, B.get(k) || 0); tot += v; } for (const [, v] of B) tot += v; return tot ? (2 * inter) / tot : 0; };
const ids = Array.from({ length: 256 }, (_, i) => `pr${String(i + 1).padStart(3, "0")}`);
const legacyEn = {}, legacyKo = {}, alignEn = {}, alignKo = {};
for (const id of ids) {
  const L = R(id), K = R(`${id}-1`);
  legacyEn[id] = ru.extractFullReadingPassage(L.blocks);
  legacyKo[id] = ru.extractFullReadingPassage(K.blocks);
  const rs = L.readingSentences || K.readingSentences || [];
  alignEn[id] = rs.map((s) => s.english).join(" ");
  alignKo[id] = rs.map((s) => s.korean).join(" ");
}
const rows = [];
for (const id of ids) {
  const dEn = dice(letters(legacyEn[id]), letters(alignEn[id]));
  const dKo = dice(hang(legacyKo[id]), hang(alignKo[id]));
  if (dEn > 0.97 && dKo > 0.9) continue;
  // which legacy passage does the aligned English match best?
  let best = null, bestD = 0;
  for (const other of ids) { const d = dice(letters(legacyEn[other]), letters(alignEn[id])); if (d > bestD) { bestD = d; best = other; } }
  // does legacy Korean page match legacy English? (translation pair integrity)
  let bestKo = null, bestKoD = 0;
  for (const other of ids) { const d = dice(hang(legacyKo[other]), hang(alignKo[id])); if (d > bestKoD) { bestKoD = d; bestKo = other; } }
  const legLen = letters(legacyEn[id]).length, alLen = letters(alignEn[id]).length;
  let kind;
  if (dEn < 0.5 && best !== id && bestD > 0.8) kind = `SHOWS_PASSAGE_OF_${best}`;
  else if (dEn < 0.5) kind = "DIFFERENT_PASSAGE_NOT_IN_ARCHIVE";
  else if (alLen < legLen * 0.85) kind = "TRUNCATED_OR_PARTIAL";
  else if (alLen > legLen * 1.15) kind = "EXTRA_TEXT";
  else kind = "MINOR_TEXT_DIFF";
  rows.push({ id, kind, dEn: +dEn.toFixed(2), dKo: +dKo.toFixed(2), legLen, alLen, bestEnMatch: `${best}:${bestD.toFixed(2)}`, bestKoMatch: `${bestKo}:${bestKoD.toFixed(2)}`, legacyStart: legacyEn[id].slice(0, 90), alignedStart: alignEn[id].slice(0, 90), legacyKoStart: legacyKo[id].slice(0, 60), alignedKoStart: alignKo[id].slice(0, 60) });
}
const byKind = {};
rows.forEach((r) => (byKind[r.kind.startsWith("SHOWS_") ? "SHOWS_OTHER_LESSON_PASSAGE" : r.kind] ||= []).push(r.id));
console.log(JSON.stringify(byKind, null, 1));
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/reading-divergence.json", JSON.stringify(rows, null, 1));
for (const r of rows.filter((x) => x.kind !== "MINOR_TEXT_DIFF").slice(0, 70)) console.log(`${r.id} ${r.kind} dEn=${r.dEn} dKo=${r.dKo} len ${r.legLen}/${r.alLen} best=${r.bestEnMatch} koBest=${r.bestKoMatch}\n   LEGACY: ${r.legacyStart}\n   SHOWN : ${r.alignedStart}\n   KO-LEG: ${r.legacyKoStart}\n   KO-SHN: ${r.alignedKoStart}`);
