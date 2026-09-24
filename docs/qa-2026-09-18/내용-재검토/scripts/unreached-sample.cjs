#!/usr/bin/env node
/**
 * 학습 내용 재검토 1 — '안 닿음' 줄 가운데 20줄을 고정 씨앗(20260924)으로 뽑아 보여 준다.
 * 사람이(이 세션이) 한 줄씩 읽어 정말 화면 · 소리에 안 닿는지 확인하고 결과를 기록.md 에 적는다.
 *   node unreached-sample.cjs            뽑은 20줄
 */
const path = require("path");
const L = require("./lib.cjs");
const recs = L.readJsonl(path.join(L.DIR, "목록.jsonl"));
const cls = require(path.join(L.DIR, "분류.json"));
const un = recs.filter((r) => !cls[r.id].닿음);
// 씨앗: 첫 확인 20260924 · 규칙을 고친 뒤 다시 확인 20260925 (--seed N)
const si = process.argv.indexOf("--seed");
const SEED = si >= 0 ? Number(process.argv[si + 1]) : 20260924;
const rnd = L.rng(SEED);
const picked = new Set();
while (picked.size < 20) picked.add(Math.floor(rnd() * un.length));
const idx = [...picked].sort((a, b) => a - b);
for (const i of idx) {
  const r = un[i];
  const c = cls[r.id];
  console.log(`${r.id} ${r.kind} ${r.file.replace("content/lessons/", "")} ${r.path} | ${c.칸} | ${c.근거}`);
  console.log(`    전: ${JSON.stringify(r.before).slice(0, 200)}`);
  console.log(`    뒤: ${JSON.stringify(r.after).slice(0, 200)}`);
}
console.log(`안 닿음 줄 ${un.length} · 씨앗 ${SEED} · 뽑은 차례 ${idx.join(",")}`);
