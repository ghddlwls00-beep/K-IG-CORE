#!/usr/bin/env node
/**
 * Writes the skeptic verdicts produced by the re-verification workflow back onto the findings
 * they belong to, inside out/content-review-*.json.
 *
 * The workflow addresses findings by their INDEX in out/content-findings-unverified.json, so this
 * must run against the same copy of that file the workflow read. It matches each finding back to
 * its source file by content (lesson + locator + problem), never by position, and refuses to write
 * if a finding cannot be matched — a silently mis-attached verdict is worse than none.
 *
 *   node merge-verdicts.cjs <workflow-task-output.json> [--dry]
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const [src] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DRY = process.argv.includes("--dry");

const raw = fs.readFileSync(src, "utf8");
let result;
try {
  const whole = JSON.parse(raw);
  // either a workflow task-output file, or a plain {verdicts} file from recover-verdicts.cjs
  result = whole.verdicts ? whole : typeof whole.result === "string" ? JSON.parse(whole.result) : whole.result;
} catch {}
if (!result || !result.verdicts) {
  const i = raw.indexOf('{"verdicts"');
  if (i < 0) throw new Error("no {verdicts} in the workflow output");
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let k = i; k < raw.length; k++) {
    const ch = raw[k];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  result = JSON.parse(raw.slice(i, end));
}

const unverified = JSON.parse(fs.readFileSync(path.join(OUT, "content-findings-unverified.json"), "utf8"));
const key = (f) => `${f.lesson}|${f.locator}|${String(f.problem).slice(0, 120)}`;
const files = {};
const load = (name) => (files[name] ||= JSON.parse(fs.readFileSync(path.join(OUT, name), "utf8")));

let applied = 0, unmatched = 0, skipped = 0;
const survivors = [];
for (const v of result.verdicts) {
  if (!v || !v.verified) { skipped++; continue; }
  const f = unverified[v.index];
  if (!f) { unmatched++; console.log(`  index ${v.index} is past the end of the unverified list`); continue; }
  const j = load(f.source);
  const hit = (j.findings || []).find((x) => key(x) === key(f));
  if (!hit) { unmatched++; console.log(`  no match in ${f.source} for ${key(f).slice(0, 90)}`); continue; }
  hit.verification = { method: v.method, votes: v.votes || [], survives: !!v.survives, severity: v.severity, reverified: true };
  applied++;
  if (v.survives) survivors.push({ lesson: f.lesson, locator: f.locator, severity: v.severity, source: f.source });
}
if (!DRY) for (const [name, j] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), JSON.stringify(j, null, 1));

const bySev = {};
for (const s of survivors) bySev[s.severity] = (bySev[s.severity] || 0) + 1;
console.log(`\n${DRY ? "(dry run) " : ""}verdicts ${result.verdicts.length} · written ${applied} · unmatched ${unmatched} · still unverified ${skipped}`);
console.log(`surviving: ${JSON.stringify(bySev)}`);
console.log(`files touched: ${Object.keys(files).join(", ") || "(none)"}`);
