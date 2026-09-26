// Compare JSON bold[] arrays with bold font spans from the PDF (spans_g2_*.txt made by spans_g2_p1_27.py).
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const j = JSON.parse(fs.readFileSync(path.join(dir, 'out', 'g2-p1-27.json'), 'utf8'));
const spanText = ['spans_g2_p5_9.txt', 'spans_g2_p10_15.txt', 'spans_g2_p19_24.txt'].map(f => fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '')).join('\n');
// page -> list of {plain, bolds}
const pages = {};
let cur = null;
for (const line of spanText.split(/\r?\n/)) {
  const pm = line.match(/^===== PAGE (\d+) =====/);
  if (pm) { cur = Number(pm[1]); pages[cur] = pages[cur] || []; continue; }
  if (!cur || !/^\s*y=/.test(line)) continue;
  // span tag = optional "B" (bold flag) + font name; "Batang" itself starts with B, so test known font names.
  const parts = [...line.matchAll(/<([^|>]+)\|[\d.]+>([^<]*)/g)].map(([, tag, t]) => [null, /^B(MalgunGothic|Tahoma|Batang|HY)/.test(tag) ? 'B' : '', null, t]);
  if (!parts.length) continue;
  let plain = '', bolds = [], run = '';
  for (const [, b, , t] of parts) {
    plain += t;
    if (b) run += t; else { if (run.trim()) bolds.push(run); run = ''; }
  }
  if (run.trim()) bolds.push(run);
  const clean = s => s.replace(/^[\s,.;:!?]+|[\s,.;:!?]+$/g, '');
  pages[cur].push({ plain: plain.replace(/\s+/g, ' ').trim(), bolds: bolds.map(clean).filter(Boolean) });
}
let checked = 0, diffs = [];
function check(item, where) {
  const lines = pages[item.page];
  if (!lines) { diffs.push(`${where} p${item.page}: page not in span dumps`); return; }
  const L = lines.find(l => l.plain === item.raw.replace(/\s+/g, ' ').trim());
  if (!L) { diffs.push(`${where} p${item.page}: line not in spans: ${item.raw}`); return; }
  // whole-line bold (review prompts) is formatting, not focus
  checked++;
  const a = JSON.stringify(item.bold), b = JSON.stringify(L.bolds);
  if (a !== b) diffs.push(`${where} p${item.page} "${item.en}": json=${a} pdf=${b}`);
}
for (const t of j.topics) for (const s of t.sections) for (const g of (s.groups || [])) g.items.forEach((x, i) => check(x, `${t.title}/${s.kind}/${g.label || g.inferredSubPoint}#${i + 1}`));
console.log('lines checked:', checked);
console.log(diffs.length ? 'DIFFERENCES:\n' + diffs.join('\n') : 'no differences');
