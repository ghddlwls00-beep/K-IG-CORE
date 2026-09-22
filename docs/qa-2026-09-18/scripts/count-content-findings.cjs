#!/usr/bin/env node
/**
 * Counts content-review findings so far, straight from the workflow journals:
 * reviewer findings by course and severity, and the skeptics' verdicts (confirmed /
 * adjusted / refuted). Reviewer counts are BEFORE verification; the verdict tallies say how
 * many of the verified ones survived.
 */
const fs = require("fs");
const JOURNALS = {
  pass1: "C:/Users/ghddl/.claude/projects/C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE/d2febf06-417e-4413-8931-61503e9f73e6/subagents/workflows/wf_47718ff2-021/journal.jsonl",
  deep: "C:/Users/ghddl/.claude/projects/C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE/d2febf06-417e-4413-8931-61503e9f73e6/subagents/workflows/wf_09d9ffc2-30f/journal.jsonl",
};
const courseOf = (f) => {
  const s = `${f.lesson} ${f.file}`;
  if (/grammar1|gh1-/.test(s)) return "GRAMMAR I";
  if (/grammar2|gh2-/.test(s)) return "GRAMMAR II";
  if (/student|\bs\d+-\d/.test(s)) return "STUDENT";
  if (/\/ld\/|ld_english|\bd\d{3}/.test(s)) return "LISTENING";
  if (/reading|pr\d{3}/.test(s)) return "READING";
  if (/voca|phonics|mv\d|hv-/.test(s)) return "VOCA";
  return "기타";
};
for (const [name, j] of Object.entries(JOURNALS)) {
  if (!fs.existsSync(j)) continue;
  const bySev = {}, byCourse = {}, verdicts = { confirmed: 0, adjusted: 0, refuted: 0 };
  let findings = 0, units = 0;
  const seen = new Set();
  for (const line of fs.readFileSync(j, "utf8").split("\n")) {
    if (!line.includes('"type":"result"')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    const res = r.result || {};
    if (res.coverage) {
      units++;
      for (const f of res.findings || []) {
        findings++;
        bySev[f.severity] = (bySev[f.severity] || 0) + 1;
        const c = courseOf(f);
        byCourse[c] ||= {};
        byCourse[c][f.severity] = (byCourse[c][f.severity] || 0) + 1;
      }
    } else if (res.verdict) verdicts[res.verdict] = (verdicts[res.verdict] || 0) + 1;
    else if (res.verdicts) for (const v of res.verdicts) verdicts[v.verdict] = (verdicts[v.verdict] || 0) + 1;
  }
  console.log(`\n[${name}] units ${units} · reviewer findings ${findings} ${JSON.stringify(bySev)}`);
  for (const [c, s] of Object.entries(byCourse)) console.log(`   ${c.padEnd(11)} ${JSON.stringify(s)}`);
  const total = verdicts.confirmed + verdicts.adjusted + verdicts.refuted;
  console.log(`   skeptic verdicts: ${JSON.stringify(verdicts)} → upheld ${total ? Math.round(((verdicts.confirmed + verdicts.adjusted) / total) * 100) : "-"}%`);
}
