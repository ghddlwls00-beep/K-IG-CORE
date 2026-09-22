#!/usr/bin/env node
/**
 * Did the content review actually look at every lesson, or only at some?
 *
 * The command forbids sampling, so this has to be checked rather than assumed. Each review unit
 * names the lessons it covered; this collects every lesson id mentioned anywhere in the saved
 * review results (unit scopes AND the findings themselves) and subtracts them from the full
 * lesson list of every in-scope course.
 *
 *   node check-review-coverage.cjs
 * Output: out/review-coverage.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");

const mentioned = new Set();
const files = fs.readdirSync(OUT).filter((f) => /^content-review-.*\.json$/.test(f));
const idRe = /\b(gh1-\d{3}(?:-\d)?|gh2-\d{3}(?:-\d)?|d\d{3}(?:-\d)?|pr\d{3}(?:-\d)?|s\d{1,2}-\d{1,2}|hv-\d{2}|mv\d-\d{2})\b/g;
for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { continue; }
  // a unit records what it was asked to cover; a finding records where it was found
  const blobs = [...(j.units || []).map((u) => JSON.stringify(u)), ...(j.findings || []).map((x) => `${x.lesson} ${x.file} ${x.locator}`)];
  for (const b of blobs) for (const m of String(b).match(idRe) || []) mentioned.add(m);
}

const report = {};
let total = 0, covered = 0;
for (const course of E.COURSES) {
  const ids = E.pages(course).map((p) => p.id);
  const missing = ids.filter((id) => !mentioned.has(id));
  total += ids.length;
  covered += ids.length - missing.length;
  report[course] = { lessons: ids.length, covered: ids.length - missing.length, missing };
}
fs.writeFileSync(path.join(OUT, "review-coverage.json"), JSON.stringify({ at: new Date().toISOString(), files, total, covered, report }, null, 1));

console.log(`교육내용 검토가 이름을 언급한 강의: ${covered} / ${total} (${((covered / total) * 100).toFixed(1)}%)`);
console.log(`입력 파일: ${files.join(", ")}\n`);
for (const [course, r] of Object.entries(report)) {
  console.log(`  ${course.padEnd(9)} ${String(r.covered).padStart(4)} / ${String(r.lessons).padStart(4)}  ${r.missing.length ? `안 다룬 강의 ${r.missing.length}개: ${r.missing.slice(0, 12).join(", ")}${r.missing.length > 12 ? " …" : ""}` : "전부"}`);
}
console.log(`\n→ ${path.join(OUT, "review-coverage.json")}`);
