#!/usr/bin/env node
/**
 * 6단계 GRAMMAR 대체 답안 계획(plans/stage6-grammar-alts-*.json)을 **지금 파일**에 다시 대어 본다 — 적용한 AI 의 보고를 믿지 않고
 * 다시 세기 위한 것. grammar-alternatives.cjs 를 미리보기로 돌려(파일은 안 씀) 줄마다:
 *   더함 → 지금 앱 채점기로 전부 exact 여야 하고(= 넣은 답이 파일에 있음),
 *   틀림 → 하나도 exact 가 아니어야 한다(= 채점이 헐거워지지 않음).
 * 하나라도 어긋나면 exit 1. 줄에 "supersededBy" 가 있으면(뒤 계획이 같은 문항을 다시 고침 — 예: 6-1461 이 의문문을 평서문으로)
 * 그 줄은 대지 않고 수만 센다 — 그런 줄은 supersededBy 가 가리키는 계획이 실제로 본다.
 *
 *   node check-grammar-alt-plans.cjs            # 계획 전부
 *   node check-grammar-alt-plans.cjs --break    # 일부러 깨기: 계획마다 첫 줄의 '틀림' 을 '더함' 자리에 넣은 가짜 계획을 대어
 *                                               # 어긋남이 잡히는지(exit 1) 본다 — 검사가 실패할 수 있음을 보이는 것
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const DIR = path.join(__dirname, "plans");
const BREAK = process.argv.includes("--break");
const plans = fs.readdirSync(DIR).filter((f) => /^stage6-grammar-alts-[a-z0-9]+\.json$/.test(f)).sort();
let lines = 0, adds = 0, wrongs = 0, superseded = 0;
const bad = [];
for (const f of plans) {
  let file = path.join(DIR, f);
  const all = JSON.parse(fs.readFileSync(file, "utf8"));
  const live = all.filter((x) => !x.supersededBy);
  superseded += all.length - live.length;
  if (live.length !== all.length) {
    file = path.join(os.tmpdir(), `live-${f}`);
    fs.writeFileSync(file, JSON.stringify(live));
  }
  if (BREAK) {
    const plan = live;
    const first = plan.find((x) => (x.wrong || []).length);
    if (!first) continue;
    const fake = [{ ...first, item: `${first.item} [일부러 깸]`, add: [first.wrong[0]], wrong: [] }];
    file = path.join(os.tmpdir(), `break-${f}`);
    fs.writeFileSync(file, JSON.stringify(fake));
  }
  const out = execFileSync("node", [path.join(__dirname, "grammar-alternatives.cjs"), file], { encoding: "utf8", maxBuffer: 1 << 26 });
  for (const line of out.split(/\r?\n/)) {
    const tokens = [...line.matchAll(/(더함|틀림):(exact|partial|incorrect)/g)];
    if (!tokens.length) continue;
    lines++;
    for (const [, kind, grade] of tokens) {
      if (kind === "더함") { adds++; if (grade !== "exact") bad.push(`${f}: ${line.trim().slice(0, 160)}`); }
      else { wrongs++; if (grade === "exact") bad.push(`${f}: ${line.trim().slice(0, 160)}`); }
    }
  }
}
console.log(`${BREAK ? "[일부러 깸] " : ""}계획 ${plans.length}개 · 줄 ${lines} · 더한 답 ${adds} · 틀린 대조 ${wrongs} · 뒤 계획이 대신한 줄 ${superseded} · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 20)) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
