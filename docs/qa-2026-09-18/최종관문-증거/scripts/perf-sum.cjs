// 관문 12 — perf-*.json 한 장(또는 여럿)을 쪽마다 LCP(3번 중앙값) · 2.5초 넘는 쪽 · 전체 중앙값/최댓값으로.
//   node perf-sum.cjs out/perf-licensed-4g-phone-final.json [out/perf-licensed-4g-phone-g15b.json ...]
const fs = require("fs");
const OUT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out/";
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const files = process.argv.slice(2);
const tables = files.map((f) => { const p = /[\\/]/.test(f) ? f : OUT + f; return { f, j: JSON.parse(fs.readFileSync(p, "utf8")) }; });
const urls = [...new Set(tables.flatMap((t) => t.j.results.map((r) => r.url)))];
console.log(["쪽".padEnd(28), ...tables.map((t) => t.f.replace(/^.*perf-licensed-4g-phone-?/, "").replace(/\.json$/, "").padStart(10))].join(" "));
for (const u of urls) {
  const cells = tables.map((t) => { const r = t.j.results.find((x) => x.url === u); return r ? `${(r.lcp / 1000).toFixed(2)}${r.paid ? "" : "f"}`.padStart(10) : "-".padStart(10); });
  console.log([u.slice(0, 28).padEnd(28), ...cells].join(" "));
}
for (const t of tables) {
  const all = t.j.results.map((r) => r.lcp);
  const paid = t.j.results.filter((r) => r.paid).map((r) => r.lcp);
  const over = t.j.results.filter((r) => r.lcp > 2500).map((r) => `${r.url} ${(r.lcp / 1000).toFixed(2)}`);
  const selfRel = t.j.results.filter((r) => r.selfReloaded).length;
  console.log(`${t.f}: at ${t.j.at} · 쪽 ${all.length}(유료 ${paid.length}) · LCP 중앙값 ${(med(all) / 1000).toFixed(2)}s(유료 ${(med(paid) / 1000).toFixed(2)}s) · 최댓값 ${(Math.max(...all) / 1000).toFixed(2)}s · 2.5초 넘음 ${over.length}${over.length ? " — " + over.join(" · ") : ""} · 스스로 새로고침 ${selfRel}`);
}
