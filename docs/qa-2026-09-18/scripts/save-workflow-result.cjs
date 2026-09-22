#!/usr/bin/env node
/**
 * Saves a finished content-review workflow's return value (units + findings with their
 * skeptic verdicts) from the Claude task output file into the repo, so the report and any later
 * session can read it without the workflow cache.
 *   node save-workflow-result.cjs <task-output-file> <dest.json>
 */
const fs = require("fs");
const [src, dest] = process.argv.slice(2);
const raw = fs.readFileSync(src, "utf8");
// the task output file is itself JSON: { summary, agentCount, logs, ..., result: {units, findings} }
try {
  const whole = JSON.parse(raw);
  const res = typeof whole.result === "string" ? JSON.parse(whole.result) : whole.result;
  if (res && res.units) {
    fs.writeFileSync(dest, JSON.stringify(res, null, 1));
    const f = res.findings || [];
    const verified = f.filter((x) => x.verification);
    console.log(JSON.stringify({ units: res.units.length, findings: f.length, verified: verified.length, survived: verified.filter((x) => x.verification.survives).length }));
    process.exit(0);
  }
} catch {}
const start = raw.indexOf('{"units"');
if (start < 0) throw new Error("no result JSON in the output file");
// the JSON object ends at the matching closing brace
let depth = 0, end = -1, inStr = false, esc = false;
for (let i = start; i < raw.length; i++) {
  const ch = raw[i];
  if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
  if (ch === '"') inStr = true;
  else if (ch === "{") depth++;
  else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
const obj = JSON.parse(raw.slice(start, end));
fs.writeFileSync(dest, JSON.stringify(obj, null, 1));
const f = obj.findings || [];
const verified = f.filter((x) => x.verification);
console.log(JSON.stringify({ units: (obj.units || []).length, findings: f.length, verified: verified.length, survived: verified.filter((x) => x.verification.survives).length }));
