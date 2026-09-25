// 되살린 대상(recheck-targets-revived.jsonl)의 STEP 5 문장 버튼 이름을 새로 연 쪽의 이름으로 — '🔊 {speedRate}x #k' 는 그때 고른 속도를 이름에 띄움
// (스윕은 1.25x · 0.85x 알약을 누른 뒤라 '🔊 1.25x #k'). 새로 연 쪽은 speedRate 기본 1.0 → '🔊 1x #k'(같은 버튼 · 같은 문장 · 같은 클립 — 속도는 재생 때만).
// 원래 이름은 sweepLabel 에 남김.   node revive-labels.cjs <in.jsonl> <out.jsonl>
const fs = require("fs");
const [src, dst] = process.argv.slice(2);
let changed = 0, n = 0;
const out = fs.readFileSync(src, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => {
  const t = JSON.parse(l); n++;
  const m = String(t.label || "").match(/^🔊 (\d+(?:\.\d+)?)x( #\d+)?$/);
  if (m && m[1] !== "1" && /STEP 5/.test(t.step)) { t.sweepLabel = t.label; t.label = `🔊 1x${m[2] || ""}`; changed++; }
  return JSON.stringify(t);
});
fs.writeFileSync(dst, out.join("\n") + "\n");
console.log(`대상 ${n} · STEP 5 버튼 이름을 새 쪽 이름(🔊 1x)으로 ${changed} → ${dst}`);
