#!/usr/bin/env node
/**
 * 7단계 7-1 h 일부러 깨기 — 계획 확인 도구 다섯의 옛 판(034e91b)과 지금 판을
 *   (1) 계획 0개로 돌림: 옛 판은 exit 0("0개 · 0줄 · 어긋남 0" 통과), 지금 판은 exit 1 이어야 한다.
 *       인자로 계획을 받는 도구는 인자 없이, 폴더를 훑는 도구는 빈 plans/ 옆에 둔 사본으로.
 *   (2) 지금 계획으로 돌림: 두 판의 숫자를 나란히 찍는다(지금 판은 exit 0 이어야 함). 지금 판이 더 많이 세는 까닭은 그 줄에 적음.
 * 저장소 파일은 건드리지 않는다 — 옛 판 사본은 임시 폴더와 scripts/ 안 임시 이름(끝나면 지움)에만 둔다.
 *   node docs/qa-2026-09-18/scripts/prove-zero-plans.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OLD_REV = "034e91b";
const REL = "docs/qa-2026-09-18/scripts";
const PLANS = path.join(__dirname, "plans");
const oldSrc = (tool) => execFileSync("git", ["show", `${OLD_REV}:${REL}/${tool}`], { cwd: REPO, encoding: "utf8" });
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return null; } };
const every = (pred) => fs.readdirSync(PLANS).filter((f) => f.endsWith(".json") && !/^(marks|progress)-/.test(f)).filter((f) => { const a = readJson(path.join(PLANS, f)); return Array.isArray(a) && a.length > 0 && a.every((l) => l && pred(l)); }).map((f) => path.join(PLANS, f));
const replacePlans = every((l) => typeof l.from === "string" && typeof l.to === "string" && Array.isArray(l.files));
const vocaPlans = every((l) => typeof l.word === "string" && typeof l.from === "string" && typeof l.to === "string" && !l.files && !l.lessons);
const cardPlans = every((l) => Array.isArray(l.lessons) && l.word && l.field);
const TOOLS = [
  { tool: "verify-applied-plans.cjs", zeroArgs: [], realArgs: replacePlans, why: "지금 판은 뒤에 다시 고친 줄을 사슬 끝까지 셈(7-1 d)" },
  { tool: "set-voca-meanings.cjs", zeroArgs: ["--check"], realArgs: ["--check", ...vocaPlans], why: "지금 판은 supersededBy 줄을 사슬 끝 뜻과 대조(전에는 'from 이 아니기만')" },
  { tool: "set-reading-card.cjs", zeroArgs: ["--check"], realArgs: ["--check", ...cardPlans], why: "같은 숫자여야 함(0개 막기만 더함)" },
  { tool: "check-grammar-item-plans.cjs", zeroArgs: [], realArgs: [], dir: true, why: "지금 판은 이름이 아니라 꼴로 계획을 고름 — 전에 빠진 4개 162줄(grammar-owner-decisions-0923 · stage7 셋)을 더 셈" },
  { tool: "check-grammar-alt-plans.cjs", zeroArgs: [], realArgs: [], dir: true, why: "지금 판은 꼴로 고름 — 4·5단계 grammar-alts-31-40 · 41-50 을 더 셈" },
];
const run = (file, args) => {
  const r = spawnSync(process.execPath, [file, ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });
  const lines = (r.stdout || "").trim().split("\n");
  const sum = lines.filter((x) => /계획|카드|VOCA|0개/.test(x)).pop() || (r.stderr || "").trim().split("\n").slice(0, 2).join(" ");
  return { code: r.status, sum: sum.trim() };
};
let wrong = 0;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kig-prove-zero-"));
const tmpInScripts = [];
try {
  for (const t of TOOLS) {
    // 옛 판은 scripts/ 안 임시 이름으로(REPO · plans/ 가 지금 판과 같게)
    const oldHere = path.join(__dirname, `_old-${OLD_REV}-${t.tool}`);
    fs.writeFileSync(oldHere, oldSrc(t.tool));
    tmpInScripts.push(oldHere);
    // (1) 0개 — 인자로 계획을 받는 도구는 제자리에서 인자 없이, 폴더를 훑는 도구는 빈 plans/ 옆에 둔 사본으로
    const mk = (label, src) => {
      const d = path.join(tmpRoot, label, REL);
      fs.mkdirSync(path.join(d, "plans"), { recursive: true });
      fs.writeFileSync(path.join(d, t.tool), src);
      return path.join(d, t.tool);
    };
    const o0 = run(t.dir ? mk(`old-${t.tool}`, oldSrc(t.tool)) : oldHere, t.zeroArgs);
    const n0 = run(t.dir ? mk(`new-${t.tool}`, fs.readFileSync(path.join(__dirname, t.tool), "utf8")) : path.join(__dirname, t.tool), t.zeroArgs);
    const ok0 = o0.code === 0 && n0.code === 1;
    if (!ok0) wrong++;
    console.log(`${ok0 ? "기대대로" : "!! 기대와 다름"} · ${t.tool} 계획 0개\n   옛 판 exit ${o0.code} — ${o0.sum}\n   지금 판 exit ${n0.code} — ${n0.sum}`);
    // (2) 지금 계획
    const o1 = run(oldHere, t.realArgs), n1 = run(path.join(__dirname, t.tool), t.realArgs);
    const ok1 = n1.code === 0;
    if (!ok1) wrong++;
    console.log(`${ok1 ? "기대대로" : "!! 기대와 다름"} · ${t.tool} 지금 계획\n   옛 판 exit ${o1.code} — ${o1.sum}\n   지금 판 exit ${n1.code} — ${n1.sum}\n   (${t.why})`);
  }
} finally {
  for (const f of tmpInScripts) fs.rmSync(f, { force: true });
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
console.log(`\n도구 ${TOOLS.length}개 × 2 중 기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
