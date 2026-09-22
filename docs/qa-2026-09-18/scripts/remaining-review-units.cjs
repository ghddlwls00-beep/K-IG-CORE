#!/usr/bin/env node
/**
 * Which content-review units are still to do — so a NEW Claude session can continue the review
 * without the old session's workflow cache.
 *
 * Rebuilds the unit list exactly as scripts/workflows/content-review.js (labels) and
 * content-review-deep.js (keys) build it, then marks a unit done when a finished reviewer in
 * the old runs' journals reported coverage for that unit's first lesson id / line range.
 * Also counts results saved to out/content-review-*.json by later sessions.
 *
 *   node remaining-review-units.cjs            → prints JSON {pass1: [labels], deep: [keys], done: {...}}
 *   node remaining-review-units.cjs --write    → also writes out/remaining-review-units.json
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const A = JSON.parse(fs.readFileSync(path.join(OUT, "review-args.json"), "utf8"));
const JOURNALS = [
  "C:/Users/ghddl/.claude/projects/C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE/d2febf06-417e-4413-8931-61503e9f73e6/subagents/workflows/wf_47718ff2-021/journal.jsonl",
  "C:/Users/ghddl/.claude/projects/C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE/d2febf06-417e-4413-8931-61503e9f73e6/subagents/workflows/wf_09d9ffc2-30f/journal.jsonl",
];

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
// ---- pass-1 units (same order/labels as content-review.js) ----
const pass1 = [];
for (const ids of chunk(A.grammar1, 6)) pass1.push({ label: `grammar1 ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "grammar1" });
for (const ids of chunk(A.grammar2, 9)) pass1.push({ label: `grammar2 ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "grammar2" });
for (const ids of chunk(A.student, 12)) pass1.push({ label: `student ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "student" });
for (const ids of chunk(A.ld, 12)) pass1.push({ label: `ld ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "ld" });
for (const ids of chunk(A.reading, 10)) pass1.push({ label: `reading ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "reading" });
for (let start = 2; start <= A.vocaDictLines; start += 160) { const end = Math.min(A.vocaDictLines, start + 159); pass1.push({ label: `voca-dict lines ${start}-${end}`, first: `lines ${start}-`, course: "vocaDict" }); }
for (const ids of chunk(A.phonics, 65)) pass1.push({ label: `voca-lessons ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0], course: "vocaLessons", superseded: true });
// ---- deep units (same keys as content-review-deep.js) ----
const deep = [];
for (const ids of chunk(A.phonics, 10)) deep.push({ key: `voca-grid ${ids[0]}..${ids[ids.length - 1]}`, first: ids[0] });
const cardRows = fs.readFileSync(path.join(OUT, "content", "reading-vocab-context.tsv"), "utf8").trim().split("\n").length;
for (let start = 2; start <= cardRows; start += 150) { const end = Math.min(cardRows, start + 149); deep.push({ key: `reading-cards ${start}-${end}`, first: `${start}-` }); }

// ---- what finished reviewers covered ----
const covered = [];
for (const j of JOURNALS) {
  if (!fs.existsSync(j)) continue;
  const which = j.includes("09d9ffc2") ? "deep" : "pass1";
  for (const line of fs.readFileSync(j, "utf8").split("\n")) {
    if (!line.includes('"type":"result"') || !line.includes('"coverage"')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    for (const c of (r.result && r.result.coverage) || []) covered.push({ which, unit: String(c.unit || "") });
  }
}
for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((x) => /^content-review-.*\.json$/.test(x)) : []) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
    const which = /deep/.test(f) ? "deep" : "pass1";
    for (const u of j.units || []) for (const c of u.coverage || []) covered.push({ which, unit: String(c.unit || "") });
  } catch {}
}
const hit = (which, first) => covered.some((c) => c.which === which && (c.unit.includes(first) || c.unit.replace(/\s+/g, "").includes(first.replace(/\s+/g, ""))));
const remaining1 = pass1.filter((u) => !u.superseded && !hit("pass1", u.first)).map((u) => u.label);
const remainingDeep = deep.filter((u) => !hit("deep", u.first)).map((u) => u.key);
const result = {
  at: new Date().toISOString(),
  pass1: remaining1,
  deep: remainingDeep,
  done: { pass1: pass1.filter((u) => !u.superseded).length - remaining1.length, pass1Total: pass1.filter((u) => !u.superseded).length, deep: deep.length - remainingDeep.length, deepTotal: deep.length },
  note: "voca-lessons (3 coarse units) superseded by the 20 deep voca-grid units",
};
if (process.argv.includes("--write")) fs.writeFileSync(path.join(OUT, "remaining-review-units.json"), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
