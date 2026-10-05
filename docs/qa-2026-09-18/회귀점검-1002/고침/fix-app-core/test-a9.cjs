// A9: course-list percent — 1 done of 276 / 512 must not read 0%. node test-a9.cjs [--old]
const path = require("path");
const REPO = path.resolve(__dirname, "../../../../..");
process.env.KIG_REPO = REPO;
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const OLD = process.argv.includes("--old");
const f = OLD ? (d, t) => (t > 0 ? Math.round((d / t) * 100) : 0) : loadTs(path.join(REPO, "src/lib/shownPercent.ts")).shownPercent;
// the listed totals of each course list (CourseDashboard counts the listed lessons)
const cases = [
  ["LISTENING 1/276", 1, 276, (p) => p >= 1], ["READING 1/512", 1, 512, (p) => p >= 1], ["READING 2/512", 2, 512, (p) => p >= 1],
  ["VOCA 1/195", 1, 195, (p) => p >= 1], ["0/276", 0, 276, (p) => p === 0], ["275/276", 275, 276, (p) => p === 99],
  ["276/276", 276, 276, (p) => p === 100], ["3/53 (old screen 6%)", 3, 53, (p) => p === 6], ["0/0", 0, 0, (p) => p === 0],
  ["PASS-OFF 1/67", 1, 67, (p) => p === 1], ["STUDENT 41/82", 41, 82, (p) => p === 50], ["section 1/4", 1, 4, (p) => p === 25],
];
let fail = 0;
for (const [name, d, t, ok] of cases) {
  const p = f(d, t);
  const good = ok(p);
  if (!good) fail++;
  console.log(`${good ? "PASS" : "FAIL"}  ${name} → ${p}%`);
}
console.log(`${OLD ? "고치기 전(Math.round)" : "고친 뒤(shownPercent)"} 실패 ${fail} / ${cases.length}`);
process.exit(fail ? 1 : 0);
