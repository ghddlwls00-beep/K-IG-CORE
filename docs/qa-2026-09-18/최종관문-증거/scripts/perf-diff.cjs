// 관문 12 — 두 perf 파일을 쪽마다: LCP · FCP · TBT(자바스크립트가 막은 시간) · 옮긴 KB · JS KB · 요청 수 — 느려진 것이 '보낸 것이 늘어서' 인지 '같은 것을 더 느리게' 인지.
//   node perf-diff.cjs A.json B.json
const fs = require("fs");
const OUT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out/";
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(/[\\/]/.test(f) ? f : OUT + f, "utf8")));
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rows = [];
for (const ra of a.results) {
  const rb = b.results.find((x) => x.url === ra.url); if (!rb) continue;
  rows.push({ url: ra.url, paid: ra.paid, lcp: [ra.lcp, rb.lcp], fcp: [ra.fcp, rb.fcp], tbt: [ra.tbt, rb.tbt], kb: [ra.kb, rb.kb], js: [ra.jsKb, rb.jsKb], req: [ra.requests, rb.requests], ttfb: [ra.ttfb, rb.ttfb] });
}
console.log("쪽".padEnd(22), "LCP A→B", "FCP A→B", "TBT A→B", "KB A→B", "JS A→B", "요청 A→B", "TTFB A→B");
for (const r of rows) console.log(r.url.padEnd(22), r.lcp.join("→").padEnd(11), r.fcp.join("→").padEnd(11), r.tbt.join("→").padEnd(9), r.kb.join("→").padEnd(9), r.js.join("→").padEnd(9), r.req.join("→").padEnd(7), r.ttfb.join("→"));
for (const [name, f] of [["강의 쪽(목록 · 홈 뺌)", (r) => /\/[a-z0-9]+\/[a-z0-9-]+$/.test(r.url)], ["전체", () => true]]) {
  const s = rows.filter(f);
  const m = (k, i) => med(s.map((r) => r[k][i]));
  console.log(`${name} ${s.length}쪽 중앙값 — LCP ${m("lcp", 0)}→${m("lcp", 1)} · FCP ${m("fcp", 0)}→${m("fcp", 1)} · TBT ${m("tbt", 0)}→${m("tbt", 1)} · KB ${m("kb", 0)}→${m("kb", 1)} · JS KB ${m("js", 0)}→${m("js", 1)} · 요청 ${m("req", 0)}→${m("req", 1)} · TTFB ${m("ttfb", 0)}→${m("ttfb", 1)}`);
}
