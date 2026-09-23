#!/usr/bin/env node
/**
 * 계획 파일의 줄에 표시 칸(supersededBy · revertedBy · movedTo 등)을 더함 — 파일 모양(한 줄 꼴 · 여러 줄 꼴)은 그대로.
 * 줄은 item 글(앞부분 일치)로 찾고, 딱 한 줄이어야 씀. 이미 같은 칸이 있으면 멈춤.
 *   node mark-plan-lines.cjs <표시 목록.json>           # 미리 보기
 *   node mark-plan-lines.cjs <표시 목록.json> --apply
 * 표시 목록: [{ "plan": "stage6-student-a.json", "item": "6-1625 s1-4 #2", "set": { "supersededBy": "student-restore-0923" } }, …]
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "plans");
const marks = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
const APPLY = process.argv.includes("--apply");
const byPlan = {};
for (const m of marks) (byPlan[m.plan] ||= []).push(m);
let done = 0;
for (const [plan, ms] of Object.entries(byPlan)) {
  const file = path.join(DIR, plan);
  let raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  for (const m of ms) {
    const hits = data.filter((l) => typeof l.item === "string" && l.item.startsWith(m.item));
    if (hits.length !== 1) throw new Error(`${plan}: '${m.item}' 로 시작하는 줄 ${hits.length}개(1 이어야 함)`);
    for (const k of Object.keys(m.set)) if (k in hits[0]) throw new Error(`${plan}: '${m.item}' 에 이미 ${k}`);
    // 글자 자리: 그 줄의 item 값 뒤 첫 "expect": N 뒤에 끼움
    const itemJson = JSON.stringify(hits[0].item);
    const at = raw.indexOf(`"item": ${itemJson}`) >= 0 ? raw.indexOf(`"item": ${itemJson}`) : raw.indexOf(`"item":${itemJson}`);
    if (at < 0) throw new Error(`${plan}: '${m.item}' 의 글자 자리를 못 찾음`);
    const ex = /"expect":\s*\d+/g; ex.lastIndex = at;
    const e = ex.exec(raw); if (!e) throw new Error(`${plan}: '${m.item}' 뒤 expect 못 찾음`);
    const end = e.index + e[0].length;
    const nl = raw.slice(end).match(/^\r?\n(\s*)\}/);
    const add = Object.entries(m.set).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`);
    const ins = nl ? `,${raw.includes("\r\n") ? "\r\n" : "\n"}${" ".repeat(Math.max(0, nl[1].length + 1))}${add.join(`,\n${" ".repeat(nl[1].length + 1)}`)}` : `, ${add.join(", ")}`;
    raw = raw.slice(0, end) + ins + raw.slice(end);
    JSON.parse(raw); // 깨지면 여기서 멈춤
    console.log(`${plan}: ${hits[0].item.slice(0, 70)} ← ${add.join(", ")}`);
    done++;
  }
  if (APPLY) fs.writeFileSync(file, raw);
}
console.log(`${APPLY ? "씀" : "미리 보기"} · 표시 ${done}줄`);
