#!/usr/bin/env node
/**
 * Counts finding IDs by severity in every audit document, so the issue register
 * and the final report quote numbers that come from the files, not from memory.
 *
 * A finding row is a markdown table row whose first cell is an ID (G1-09, R-34,
 * RV-05, L-64, S-06, V-01, SEC-01, ADM-01, LX-01, …). Rows marked "(추가 위치)"
 * add locations to an ID already counted. Severity = first of Critical/High/Medium/Low
 * found in the row. Output: out/findings-count.json and a printed table.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const files = [
  ...fs.readdirSync(path.join(ROOT, "content-review")).filter((f) => f.endsWith(".md") && !f.includes("status")).map((f) => `content-review/${f}`),
  ...fs.readdirSync(ROOT).filter((f) => /^phase\d.*\.md$/.test(f)),
];
const out = {};
const all = {};
for (const f of files) {
  const text = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ids = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*(?:\*\*)?([A-Z]{1,4}\d?-\d{2}[a-z]?)(?:\*\*)?\s*(\(추가 위치\))?\s*\|/);
    if (!m) continue;
    const sev = (line.match(/\b(Critical|High|Medium|Low)\b/) || [])[1] || "unrated";
    const id = m[1];
    if (!ids.has(id)) ids.set(id, sev);
  }
  const counts = {};
  for (const sev of ids.values()) counts[sev] = (counts[sev] || 0) + 1;
  out[f] = { ids: ids.size, ...counts };
  for (const [k, v] of Object.entries(counts)) all[k] = (all[k] || 0) + v;
}
out.TOTAL = all;
fs.writeFileSync(path.join(ROOT, "out/findings-count.json"), JSON.stringify(out, null, 1));
console.table(out);
