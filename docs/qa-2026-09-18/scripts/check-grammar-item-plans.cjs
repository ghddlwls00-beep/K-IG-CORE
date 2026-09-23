#!/usr/bin/env node
/**
 * 6단계 GRAMMAR 문항 글 · 대체 답안 계획(plans/stage6-grammar-items-*.json — set-grammar-items.cjs 로 적용)을 **지금 파일**에 다시 대어 본다.
 * 줄마다: text.to 가 있으면 그 파일 그 문항의 글이 to 와 똑같아야 하고, alternatives.to 가 있으면 대체 답안이 to 를 모두 담아야 하며
 * alternatives.from 에만 있고 to 에 없는 것(뺀 답)은 없어야 한다. 줄에 "supersededBy" 가 있으면 대지 않고 수만 센다.
 * 하나라도 어긋나면 exit 1.
 *
 *   node check-grammar-item-plans.cjs
 *   node check-grammar-item-plans.cjs --rev HEAD    # 일부러 깨기: 고치기 전 커밋의 파일에 대면 어긋나야 한다(exit 1)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(__dirname, "plans");
const ri = process.argv.indexOf("--rev");
const REV = ri >= 0 ? process.argv[ri + 1] : null;
const cache = new Map();
const load = (rel) => {
  if (!cache.has(rel)) {
    const raw = REV ? execFileSync("git", ["show", `${REV}:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }) : fs.readFileSync(path.join(REPO, rel), "utf8");
    cache.set(rel, JSON.parse(raw));
  }
  return cache.get(rel);
};
const items = (d) => d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);
const plans = fs.readdirSync(DIR).filter((f) => /^stage6-grammar-items-[a-z0-9]+\.json$/.test(f)).sort();
let lines = 0, superseded = 0;
const bad = [];
for (const f of plans) {
  for (const x of JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))) {
    if (x.supersededBy) { superseded++; continue; }
    lines++;
    const it = items(load(x.file)).find((i) => String(i.n) === String(x.n));
    if (!it) { bad.push(`${f}: ${x.file} #${x.n} 문항 없음`); continue; }
    if (x.text && it.text !== x.text.to) bad.push(`${f}: ${x.file} #${x.n} 글이 계획과 다름 — 지금 ${JSON.stringify(it.text)}`);
    if (x.alternatives) {
      const now = it.alternatives || [];
      const missing = x.alternatives.to.filter((a) => !now.includes(a));
      const removed = x.alternatives.from.filter((a) => !x.alternatives.to.includes(a) && now.includes(a));
      if (missing.length || removed.length) bad.push(`${f}: ${x.file} #${x.n} 대체 답안 — 없음 ${JSON.stringify(missing)} · 남음 ${JSON.stringify(removed)}`);
    }
  }
}
console.log(`${REV ? `[${REV} 에 댐] ` : ""}계획 ${plans.length}개 · 줄 ${lines} · 뒤 계획이 대신한 줄 ${superseded} · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 15)) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
