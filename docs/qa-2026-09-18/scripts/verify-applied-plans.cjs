#!/usr/bin/env node
/**
 * replace-in-lessons.cjs 로 적용한 계획 파일이 **지금 파일에 정말 들어가 있는지** 센다 — 적용한 AI 의 보고를 믿지 않고
 * 다시 세기 위한 것. 계획의 한 줄 { item, files, from, to, expect } 마다:
 *   to   가 그 파일들에 expect 번 이상 있어야 하고,
 *   from 은 0번이어야 한다 (to 가 from 을 품고 있으면 from 은 세지 않음).
 * 하나라도 어긋나면 exit 1. 줄에 "supersededBy" 가 있으면(뒤 계획이 같은 글을 다시 고침) to 는 세지 않고 from 0 만 본다.
 * 주의: "supersededBy" 가 있고 to 가 from 을 품은 줄은 **아무것도 세지 않는다**(어느 판에서도 통과) — 그런 줄은 그 뒤 계획
 *   (supersededBy 가 가리키는 계획)이 실제로 센다. 3차 점검 #4 지적(factual-ld-c #22, d245 hints).
 *
 *   node verify-applied-plans.cjs plans/stage6-factual-reading-c.json [다른 계획 …]
 *   node verify-applied-plans.cjs plans/….json --rev HEAD     일부러 깨기: 고치기 전(커밋된 판)으로 세면 어긋나야 한다
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const args = process.argv.slice(2);
const ri = args.indexOf("--rev");
const REV = ri >= 0 ? args[ri + 1] : null;
const plans = args.filter((a, i) => !a.startsWith("--") && !(ri >= 0 && i === ri + 1));
const esc = (s) => JSON.stringify(s).slice(1, -1);
const cache = new Map();
function text(f) {
  if (!cache.has(f)) {
    cache.set(f, REV
      ? execFileSync("git", ["show", `${REV}:${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 })
      : fs.readFileSync(path.join(REPO, f), "utf8"));
  }
  return cache.get(f);
}
const count = (files, s) => files.reduce((n, f) => n + text(f).split(s).length - 1, 0);

let lines = 0, bad = 0;
for (const p of plans) {
  const plan = JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
  if (!Array.isArray(plan) || !plan.every((l) => l && typeof l.from === "string" && typeof l.to === "string" && Array.isArray(l.files))) {
    console.log(`${path.basename(p)}: 바꾸기 계획 파일이 아님 — 건너뜀`);
    continue;
  }
  let pb = 0;
  for (const l of plan) {
    lines++;
    const from = l.raw ? l.from : esc(l.from), to = l.raw ? l.to : esc(l.to); // raw: replace-in-lessons 와 같게 파일 글자 그대로
    const nTo = count(l.files, to);
    const nFrom = to.includes(from) ? 0 : count(l.files, from);
    const ok = nFrom === 0 && (l.supersededBy ? true : nTo >= l.expect);
    if (!ok) { pb++; bad++; console.log(`  어긋남 ${path.basename(p)} #${l.item}: to ${nTo}곳(기대 ${l.expect}) · from ${nFrom}곳(기대 0)`); }
  }
  console.log(`${path.basename(p)}: ${plan.length}줄 중 어긋남 ${pb}`);
}
console.log(`${REV ? `[${REV} 기준] ` : ""}계획 ${plans.length}개 · ${lines}줄 · 어긋남 ${bad}`);
process.exit(bad ? 1 : 0);
