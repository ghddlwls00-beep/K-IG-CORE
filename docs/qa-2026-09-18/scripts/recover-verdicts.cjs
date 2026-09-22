#!/usr/bin/env node
/**
 * Rebuilds the verification verdicts from a workflow's journal, for a run that was stopped before
 * it could return its result. Every skeptic that finished is in the journal, so nothing they did
 * is lost just because the run did not reach the end.
 *
 * It applies the same rule the workflow applies: a Critical/High finding needs 2 of its 3 skeptics
 * to have answered before it counts as verified, and survives only if at least 2 of them did not
 * refute it. A Medium/Low finding is decided by its single batch skeptic.
 *
 *   node recover-verdicts.cjs <journal.jsonl> [--out out/recovered-verdicts.json]
 * Then feed the result to merge-verdicts.cjs.
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const src = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dest = arg("--out", path.join(OUT, "recovered-verdicts.json"));

const byIndex = {};
const seenKeys = new Set();
for (const line of fs.readFileSync(src, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.type !== "result" || !o.result) continue;
  if (seenKeys.has(o.key)) continue;           // a resumed run replays cached results
  seenKeys.add(o.key);
  // a single-finding skeptic returns one verdict; a batch skeptic returns {verdicts:[…]}
  const votes = Array.isArray(o.result.verdicts) ? o.result.verdicts : [o.result];
  for (const v of votes) {
    if (!v || typeof v.index !== "number" || !v.verdict) continue;
    (byIndex[v.index] ||= []).push(v);
  }
}

const verdicts = [];
for (const [idx, votes] of Object.entries(byIndex)) {
  const index = Number(idx);
  const heavy = votes.length > 1;              // 3-skeptic findings get more than one vote
  const real = votes.filter((v) => v.verdict !== "refuted");
  const s = real.map((v) => v.severity);
  const severity = heavy
    ? (s.filter((x) => x === "Critical").length >= 2 ? "Critical"
      : s.filter((x) => x === "Critical" || x === "High").length >= 2 ? "High"
      : s.filter((x) => x !== "Low").length >= 2 ? "Medium" : "Low")
    : votes[0].severity;
  const verified = heavy ? votes.length >= 2 : true;
  const survives = heavy ? votes.length >= 2 && real.length >= 2 : votes[0].verdict !== "refuted";
  verdicts.push({ index, method: heavy ? `${votes.length} skeptics` : "1 skeptic", votes, verified, survives, severity: survives ? severity : null });
}
verdicts.sort((a, b) => a.index - b.index);
fs.writeFileSync(dest, JSON.stringify({ verdicts }, null, 1));

const oneVoteOnly = verdicts.filter((v) => v.method === "1 skeptic").length;
console.log(`journal 에서 살린 판정: ${verdicts.length}건 (표 ${Object.values(byIndex).reduce((a, b) => a + b.length, 0)}개)`);
console.log(`  검증 성립 ${verdicts.filter((v) => v.verified).length} · 살아남음 ${verdicts.filter((v) => v.survives).length} · 기각 ${verdicts.filter((v) => v.verified && !v.survives).length}`);
console.log(`  회의론자 1명만 답한 건 ${oneVoteOnly} (일괄 검증분 포함)`);
console.log(`→ ${dest}`);
