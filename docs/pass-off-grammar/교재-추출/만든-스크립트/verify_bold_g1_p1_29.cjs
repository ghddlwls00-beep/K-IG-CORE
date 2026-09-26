// Compare every extracted bold[] array with the bold font spans in the PDF (pages 5-23).
// Usage: node verify_bold_g1_p1_29.cjs <spans.json> [extraction.json]   (exit 1 on mismatch)
const fs = require('fs');
const path = require('path');
const lines = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const doc = JSON.parse(fs.readFileSync(process.argv[3] || path.join(__dirname, 'out', 'g1-p1-29.json'), 'utf8'));
const norm = s => s.replace(/\s+/g, ' ').trim();
function boldSegments(spans) {
  const segs = []; let cur = null;
  for (const [t, b] of spans) {
    if (b) { cur = (cur == null ? '' : cur) + t; }
    else if (cur != null && !t.trim()) { cur += t; } // whitespace inside a bold run
    else { if (cur != null) segs.push(cur); cur = null; }
  }
  if (cur != null) segs.push(cur);
  return segs.map(s => norm(s).replace(/^\d+\)\s*/, '')).filter(Boolean); // drop review numbering "11)"
}
let fail = 0, checked = 0;
function check(page, rawText, bold, what) {
  const target = norm(rawText.replace(/\n/g, ' '));
  // find the PDF line(s) on that page whose text matches the raw (multi-line raws: match each part)
  const parts = rawText.split('\n').map(norm);
  // each part may match several PDF lines (same sentence printed in Pass-Off and Application on one page,
  // or overlaid duplicate text boxes on p6/p10): collect every candidate's bold segments per part
  let options = [[]];
  for (const part of parts) {
    const cand = lines.filter(l => l.page === page && (norm(l.text) === part || norm(l.text).replace(/^\d+\)\s*/, '') === part));
    if (!cand.length) { fail++; console.log(`NO PDF LINE p${page} [${what}]: ${part}`); return; }
    const next = [];
    for (const o of options) for (const c of cand) next.push(o.concat(boldSegments(c.spans)));
    options = next;
  }
  const want = (bold || []).map(norm);
  checked++;
  if (!options.some(segs => JSON.stringify(segs) === JSON.stringify(want))) { fail++; console.log(`BOLD MISMATCH p${page} [${what}] ${target}\n   pdf: ${JSON.stringify(options)}\n   json: ${JSON.stringify(want)}`); }
}
for (const t of doc.topics) for (const s of t.sections) {
  if (s.groups) for (const g of s.groups) for (const it of g.items) {
    if (it.page > 23) continue;
    // Pass-Off 8품사/구 lines on p15-16: category label may be on the same line (구) — raw already includes it
    check(it.page, it.raw, it.bold, s.kind);
  }
  if (s.tasks) for (const k of s.tasks) for (const it of k.items) {
    if (it.bold) check(it.page, it.n + ') ' + it.prompt, it.bold, 'review');
  }
}
console.log(fail ? `FAIL: ${fail} of ${checked} bold checks` : `PASS: ${checked} bold arrays match the PDF bold spans`);
process.exit(fail ? 1 : 0);
