/* Verify the 15 REAL corpus detached-determiner rows resolve correctly. */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const src = fs.readFileSync(path.join(__dirname, "report-kig006.cjs"), "utf8")
  .split("/* ------------------------------------------------------- prescribed repairs */")[0]
  + "\nmodule.exports={propose,tokenizeParens,isDetachedDeterminer,isInsertableDeterminer,determinersSane,wordCount};\n";
const ENG = path.join(__dirname, "_eng-tmp.cjs");
fs.writeFileSync(ENG, src);
const E = require(ENG);

const EXPOSURE = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/kig006-exposure.json"), "utf8")
);
const DET = /\(\s*(the|a|an|this|that|these|those|my|your|his|her|its|our|their|some|any|no|every|each|both|all)\s*\)/i;

// Unique sentences carrying a detached determiner, with their Korean prompt.
const rows = [];
const seen = new Set();
for (const r of EXPOSURE) {
  if (!r.en || !DET.test(r.en)) continue;
  if (seen.has(r.en)) continue;
  seen.add(r.en);
  rows.push({ page: r.page, n: r.n, en: r.en, ko: r.ko || "" });
}

let fail = 0;
console.log("page          #n    primary".padEnd(120) + " | alternatives | KO");
console.log("-".repeat(160));
for (const r of rows) {
  const p = E.propose("SUBSTITUTE", r.en);
  const text = p.text || "";
  const alts = p.alternatives || [];
  const flags = [];
  if (text.includes("(") || text.includes("\uD639")) flags.push("RESIDUE");
  if (alts.some((a) => a.includes("("))) flags.push("ALT-RESIDUE");
  // OPTIONAL-INSERT rule: an alternative produced by ADDING a parenthesised word
  // may never be shorter than the primary. A phrase->phrase SUBSTITUTION
  // ("take part(participate)") is a different operation and is exempt — it
  // legitimately swaps a longer phrase for a shorter one.
  const isSubstitution = /[A-Za-z]\(/.test(r.en.replace(/\s+\(/g, " ("));
  const pw = E.wordCount(text);
  if (!isSubstitution) {
    for (const a of alts) if (E.wordCount(a) < pw) flags.push("SHORTER");
  }
  // Determiners must be sane.
  if (!E.determinersSane(text)) flags.push("DET-INSANE");
  // No lowercased sentence head.
  if (/^[a-z]/.test(text)) flags.push("LOWERCASE-HEAD");
  for (const a of alts) if (/^[a-z]/.test(a)) flags.push("ALT-LOWERCASE-HEAD");
  if (flags.length) fail++;
  const line = (r.page + " #" + r.n).padEnd(14) + JSON.stringify(text);
  console.log((flags.length ? "FAIL " : "ok   ") + line);
  console.log("     alts: " + JSON.stringify(alts) + (flags.length ? "   >>> " + flags.join(",") : ""));
  if (r.ko) console.log("     KO  : " + r.ko.slice(0, 90));
}
console.log("\nrows: " + rows.length + "   failing: " + fail);

// Never leave the generated shim behind (it is gitignored, but keep the tree clean).
try { fs.unlinkSync(ENG); } catch {}
if (fail) process.exitCode = 1;
