// integrate (2026-10-07): before (out/ui-1007/metrics.jsonl — 운영 970fa371) vs after-local (고침/사진/after-local/metrics.jsonl)
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const read = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && r.metrics && !r.metrics.error);
const before = read(path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/metrics.jsonl"));
const after = read(path.join(REPO, "docs/qa-2026-09-18/UI검토-1007/고침/사진/after-local/metrics.jsonl"));
const key = (r) => `${r.theme}|${r.vp}|${r.slug}|${r.state}`;
const B = new Map();
for (const r of before) if (r.vp === "phone" || r.vp === "desktop") { const k = key(r); if (!B.has(k) || r.mode === "free") B.set(k, r); }
const A = new Map();
for (const r of after) A.set(key(r), r); // last wins
const f = (m) => m ? { ox: m.overflowX ? 1 : 0, s44: m.small44 ? m.small44.count - (m.small44.inline || 0) : null, u12: m.text ? m.text.under12 : null, zoom: m.zoomFields, low: m.contrast ? m.contrast.low : null, scr: m.screens } : null;
const rows = [];
for (const [k, a] of A) {
  const b = B.get(k);
  const fa = f(a.metrics), fb = b ? f(b.metrics) : null;
  rows.push({ k, beforeMode: b ? b.mode : null, before: fb, after: fa, afterFiles: a.files, beforeFiles: b ? b.files : null, paywalled: a.paywalled, s44samples: a.metrics.small44 && a.metrics.small44.samples.slice(0, 4), tiny: a.metrics.text && a.metrics.text.tinySamples.slice(0, 4), low: a.metrics.contrast && a.metrics.contrast.samples.slice(0, 3), hscroll: a.metrics.hscroll });
}
const bad = rows.filter((r) => r.after && (r.after.ox || r.after.s44 > 0 || r.after.u12 > 0 || r.after.zoom > 0 || r.after.low > 0));
const worse = rows.filter((r) => r.before && r.after && (r.after.ox > r.before.ox || r.after.s44 > r.before.s44 || r.after.u12 > r.before.u12 || r.after.zoom > r.before.zoom || r.after.low > r.before.low));
const out = { after: A.size, matchedBefore: rows.filter((r) => r.before).length, totals: {
  after: rows.reduce((t, r) => { const a = r.after || {}; t.ox += a.ox || 0; t.s44 += a.s44 || 0; t.u12 += a.u12 || 0; t.zoom += a.zoom || 0; t.low += a.low || 0; return t; }, { ox: 0, s44: 0, u12: 0, zoom: 0, low: 0 }),
  beforeMatched: rows.filter((r) => r.before).reduce((t, r) => { const a = r.before; t.ox += a.ox || 0; t.s44 += a.s44 || 0; t.u12 += a.u12 || 0; t.zoom += a.zoom || 0; t.low += a.low || 0; return t; }, { ox: 0, s44: 0, u12: 0, zoom: 0, low: 0 }),
}, bad, worse: worse.map((r) => ({ k: r.k, before: r.before, after: r.after, s44samples: r.s44samples, tiny: r.tiny, low: r.low })) };
fs.writeFileSync(path.join(REPO, "docs/qa-2026-09-18/UI검토-1007/고침/사진/after-local/compare.json"), JSON.stringify({ ...out, rows }, null, 1));
console.log(JSON.stringify({ after: out.after, matchedBefore: out.matchedBefore, totals: out.totals, bad: bad.map((r) => ({ k: r.k, a: r.after, b: r.before, s44: r.s44samples, tiny: r.tiny, low: r.low, hs: r.hscroll })), worse: out.worse.map((w) => w.k) }, null, 1));
