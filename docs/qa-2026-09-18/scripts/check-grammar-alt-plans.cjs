#!/usr/bin/env node
/**
 * GRAMMAR 대체 답안 계획(grammar-alternatives.cjs 로 적용한 꼴: { item, course?, base, n, add: [...], wrong: [...] })을 **지금 파일**에
 * 다시 대어 본다 — 적용한 AI 의 보고를 믿지 않고 다시 세기 위한 것. grammar-alternatives.cjs 를 미리보기로 돌려(파일은 안 씀) 줄마다:
 *   더함 → 지금 앱 채점기로 전부 exact 여야 하고(= 넣은 답이 파일에 있음),
 *   틀림 → 하나도 exact 가 아니어야 한다(= 채점이 헐거워지지 않음).
 * 하나라도 어긋나면 exit 1.
 * 계획은 **이름이 아니라 꼴로** 고른다(7단계 7-1 h — 전에는 이름 무늬 stage6-grammar-alts-*.json 만 봐서 4·5단계의
 * grammar-alts-31-40 · grammar-alts-41-50 을 세지 않았다). 센 계획이 0개면 exit 1.
 * 줄에 "supersededBy" 가 있으면(뒤 계획이 같은 문항을 다시 고침 — 예: 6-1461 이 의문문을 평서문으로) 그 줄의 답은 대지 않되,
 * supersededBy 가 가리키는 계획이 있고 그 안에 같은 문항 줄이 있는지는 본다(없으면 어긋남 — 7-1 d 와 같은 뜻: 사슬이 끊기면 안 됨).
 *
 *   node check-grammar-alt-plans.cjs            # 계획 전부
 *   node check-grammar-alt-plans.cjs --break    # 일부러 깨기: 계획마다 첫 줄의 '틀림' 을 '더함' 자리에 넣은 가짜 계획을 대어
 *                                               # 어긋남이 잡히는지(exit 1) 본다 — 검사가 실패할 수 있음을 보이는 것
 *   node check-grammar-alt-plans.cjs --plans-dir <폴더>   # 계획 폴더(기본: 이 도구 옆 plans/) — 0개 증명용
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const di = process.argv.indexOf("--plans-dir");
const DIR = path.resolve(di >= 0 ? process.argv[di + 1] : path.join(__dirname, "plans"));
const BREAK = process.argv.includes("--break");
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return null; } };
const isAltPlan = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.base === "string" && l.n !== undefined && Array.isArray(l.add));
const isItemPlan = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.file === "string" && l.n !== undefined && (l.text || l.alternatives));
const plans = (fs.existsSync(DIR) ? fs.readdirSync(DIR) : []).filter((f) => f.endsWith(".json") && isAltPlan(readJson(path.join(DIR, f)))).sort();
// supersededBy 가 가리키는 계획에 같은 문항 줄이 있는지(대체 답안 꼴이든 문항 꼴이든)
function successorHas(x) {
  const name = String(x.supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
  const a = readJson(path.join(DIR, `${name}.json`));
  const course = x.course || "grammar1";
  const hit = isAltPlan(a) ? a.some((l) => l.base === x.base && String(l.n) === String(x.n) && (l.course || "grammar1") === course)
    : isItemPlan(a) ? a.some((l) => String(l.n) === String(x.n) && new RegExp(`/${course}/${x.base}(-\\d+)?\\.json$`).test(l.file))
    : null;
  return hit === null ? `뒤 계획 '${name}' 이 없거나 GRAMMAR 계획 꼴이 아님` : hit ? null : `뒤 계획 '${name}' 에 ${x.base} #${x.n} 줄이 없음(사슬 끊김)`;
}
let lines = 0, adds = 0, wrongs = 0, superseded = 0;
const bad = [];
for (const f of plans) {
  let file = path.join(DIR, f);
  const all = JSON.parse(fs.readFileSync(file, "utf8"));
  const live = all.filter((x) => !x.supersededBy);
  superseded += all.length - live.length;
  for (const x of all.filter((y) => y.supersededBy)) { const p = successorHas(x); if (p) bad.push(`${f}: #${x.item} ${p}`); }
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
console.log(`${BREAK ? "[일부러 깸] " : ""}계획 ${plans.length}개 · 줄 ${lines} · 더한 답 ${adds} · 틀린 대조 ${wrongs} · 뒤 계획이 대신한 줄 ${superseded}(사슬 이어짐 확인) · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 20)) console.log(`  ${b}`);
if (!plans.length) { console.log(`대체 답안 계획이 0개(${DIR}) — 센 것 0 (7-1 h). exit 1`); process.exit(1); }
process.exit(bad.length ? 1 : 0);
