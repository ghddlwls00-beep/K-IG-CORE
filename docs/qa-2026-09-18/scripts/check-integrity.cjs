#!/usr/bin/env node
/**
 * After an unexpected shutdown: is anything on disk damaged or lost?
 * Checks every audit output file for truncated/unparseable lines, counts usable records per
 * course against the expected visit count, and reports the review results saved so far.
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");
const FEAT = path.join(OUT, "features");

let bad = 0;
console.log("== sweep records (features/*.jsonl)");
const perCourse = {};
for (const f of fs.readdirSync(FEAT).filter((x) => x.endsWith(".jsonl"))) {
  const lines = fs.readFileSync(path.join(FEAT, f), "utf8").split("\n").filter((l) => l.trim());
  let ok = 0, broken = 0, errRec = 0;
  const keys = new Set();
  for (const l of lines) {
    try {
      const r = JSON.parse(l);
      if (r.visitError) errRec++;
      else { ok++; keys.add(`${r.url}|${r.viewport}`); }
    } catch { broken++; }
  }
  bad += broken;
  const course = f.replace(/(-s\d+)?\.jsonl$/, "");
  if (course !== "common") (perCourse[course] ||= new Set());
  if (course !== "common") for (const k of keys) perCourse[course].add(k);
  console.log(`  ${f.padEnd(16)} lines ${String(lines.length).padStart(5)} · usable ${String(ok).padStart(5)} · error-records ${String(errRec).padStart(4)} · UNPARSEABLE ${broken}`);
}
console.log("\n== coverage per course (unique page×viewport with a usable record)");
for (const c of E.COURSES) {
  const expected = E.pages(c).length * 3;
  const done = (perCourse[c] || new Set()).size;
  console.log(`  ${c.padEnd(10)} ${String(done).padStart(5)} / ${expected}  ${done === expected ? "완료" : ""}`);
}

console.log("\n== other outputs");
for (const f of ["inventory.json", "entitlement-all.json", "bundle-leak-all.json", "audio-inventory.json", "audio-check-anon.json", "grade-offline.json", "security-probe.json", "commercial.json", "a11y.json", "perf-anon.json", "perf-licensed.json", "content-review-pass1.json", "content-findings-unverified.json"]) {
  const p = path.join(OUT, f);
  if (!fs.existsSync(p)) { console.log(`  ${f.padEnd(34)} MISSING`); continue; }
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const size = (fs.statSync(p).size / 1024).toFixed(0);
    const extra = j.findings ? `findings ${j.findings.length}` : Array.isArray(j) ? `${j.length} entries` : j.results ? `results ${j.results.length}` : j.clips ? `clips ${j.clips.length}` : "";
    console.log(`  ${f.padEnd(34)} OK ${String(size).padStart(6)} KB  ${extra}`);
  } catch (e) {
    bad++;
    console.log(`  ${f.padEnd(34)} DAMAGED: ${e.message.slice(0, 60)}`);
  }
}
console.log(`\n손상된 파일/줄: ${bad}`);
