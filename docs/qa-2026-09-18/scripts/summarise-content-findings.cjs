#!/usr/bin/env node
/**
 * Consolidates the saved content-review results into counts and a readable list of the
 * findings that SURVIVED adversarial verification. Refuted ones are counted, never listed
 * as problems.
 *   node summarise-content-findings.cjs [--severity Critical,High] [--limit 40]
 * Writes out/content-findings-summary.md and prints the same.
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SEV = new Set(arg("--severity", "Critical,High").split(","));
const LIMIT = Number(arg("--limit", 40));

const files = fs.readdirSync(OUT).filter((f) => /^content-review-.*\.json$/.test(f));
const all = [];
for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { continue; }
  for (const x of j.findings || []) all.push({ ...x, source: f });
}
const courseOf = (f) => {
  const s = `${f.lesson} ${f.file}`;
  if (/gh1-|grammar1/.test(s)) return "GRAMMAR I";
  if (/gh2-|grammar2/.test(s)) return "GRAMMAR II";
  if (/\bs\d+-\d|student/.test(s)) return "STUDENT";
  if (/\bd\d{3}|\/ld\/|ld_english/.test(s)) return "LISTENING";
  if (/pr\d{3}|reading/.test(s)) return "READING";
  if (/mv\d|hv-|voca|phonics/.test(s)) return "VOCA";
  return "기타";
};
const sev = (f) => (f.verification && f.verification.severity) || f.severity;
// A verification record with NO votes means every skeptic failed (usage limit) — that is
// "not verified yet", not "refuted". Counting those as refuted hid real findings.
const votesOf = (f) => (f.verification && f.verification.votes) || [];
const survived = all.filter((f) => f.verification && f.verification.survives && votesOf(f).length);
const refuted = all.filter((f) => f.verification && !f.verification.survives && votesOf(f).length);
const unverified = all.filter((f) => !f.verification || !votesOf(f).length);
fs.writeFileSync(path.join(OUT, "content-findings-unverified.json"), JSON.stringify(unverified, null, 1));

const table = {};
for (const f of survived) {
  const c = courseOf(f), s = sev(f);
  table[c] ||= { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 };
  table[c][s] = (table[c][s] || 0) + 1;
  table[c].total++;
}
const byCategory = {};
for (const f of survived) { const k = `${f.category}`; byCategory[k] = (byCategory[k] || 0) + 1; }

const lines = [];
lines.push(`# 교육 내용 지적 요약 (검증 통과분) — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`);
lines.push("");
lines.push(`검토자 보고 ${all.length}건 · 검증 통과 **${survived.length}건** · 기각 ${refuted.length}건 · **미검증 ${unverified.length}건** (검증 에이전트가 사용량 한도로 실행되지 못한 건 포함; 미검증 목록은 out/content-findings-unverified.json) (입력 파일: ${files.join(", ")})`);
{
  const us = {};
  for (const f of unverified) us[f.severity] = (us[f.severity] || 0) + 1;
  lines.push("");
  lines.push(`미검증 내역: ${JSON.stringify(us)}`);
}
lines.push("");
lines.push("| 과정 | 심각 | 높음 | 중간 | 낮음 | 합계 |");
lines.push("|---|---|---|---|---|---|");
for (const [c, t] of Object.entries(table).sort((a, b) => b[1].total - a[1].total)) lines.push(`| ${c} | ${t.Critical || 0} | ${t.High || 0} | ${t.Medium || 0} | ${t.Low || 0} | ${t.total} |`);
lines.push("");
lines.push("**유형별:** " + Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
lines.push("");
lines.push(`## ${[...SEV].join("/")} 지적 (검증 통과, 최대 ${LIMIT}건)`);
lines.push("");
for (const f of survived.filter((f) => SEV.has(sev(f))).slice(0, LIMIT)) {
  lines.push(`- **[${sev(f)}] ${courseOf(f)} ${f.lesson}** (${f.locator})`);
  lines.push(`  - 원문: ${String(f.original).replace(/\s+/g, " ").slice(0, 160)}`);
  lines.push(`  - 문제: ${String(f.problem).replace(/\s+/g, " ").slice(0, 300)}`);
  lines.push(`  - 수정안: ${String(f.correction).replace(/\s+/g, " ").slice(0, 200)}`);
}
const dest = path.join(OUT, "content-findings-summary.md");
fs.writeFileSync(dest, lines.join("\n"));
console.log(lines.slice(0, 20).join("\n"));
console.log(`\n→ ${dest} (${survived.filter((f) => SEV.has(sev(f))).length} ${[...SEV].join("/")} 건 포함)`);
