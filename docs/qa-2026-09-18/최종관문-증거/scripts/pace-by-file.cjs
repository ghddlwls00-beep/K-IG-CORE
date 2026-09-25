// 기록 파일마다 쪽당 걸린 분(이웃한 기록의 at 차이 중앙값 · 합) — 본 쪽(dNNN)과 대본 쪽(dNNN-1)을 나눠서.
//   node pace-by-file.cjs <정규식>   예: "^ld-g(0|15)-(tablet|mobile)"
const fs = require("fs");
const path = require("path");
const FEAT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out/features";
const re = new RegExp(process.argv[2] || "^ld-g");
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
for (const f of fs.readdirSync(FEAT).filter((x) => re.test(x) && x.endsWith(".jsonl")).sort()) {
  const rs = [];
  for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) { if (!l.trim()) continue; try { rs.push(JSON.parse(l)); } catch {} }
  rs.sort((a, b) => new Date(a.at) - new Date(b.at));
  const main = [], script = [];
  for (let i = 1; i < rs.length; i++) {
    const d = (new Date(rs[i].at) - new Date(rs[i - 1].at)) / 60000;
    if (d > 15) continue; // 멈춤 · 다시 켬 사이
    (/-\d+$/.test(rs[i].id) ? script : main).push(d);
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  console.log(`${f.padEnd(34)} 기록 ${String(rs.length).padStart(3)} · 본 쪽 ${String(main.length).padStart(3)} 중앙 ${med(main).toFixed(2)}분 · 대본 쪽 ${String(script.length).padStart(3)} 중앙 ${med(script).toFixed(2)}분 · 첫 ${rs[0] && rs[0].at.slice(11, 19)} 끝 ${rs.length && rs[rs.length - 1].at.slice(11, 19)}`);
}
