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
    // exact: true — item 글이 통째로 같은 줄만(한 줄의 item 이 다른 줄 item 의 앞부분일 때: '드릴 7' · '드릴 7 영어')
    // to: "…" — item 글이 똑같은 줄이 둘 이상일 때 그 줄의 to 글로 가림(stage6-student-a 의 s8-3 두 줄)
    const hits = data.filter((l) => typeof l.item === "string" && (m.exact ? l.item === m.item : l.item.startsWith(m.item)) && (m.to === undefined || l.to === m.to));
    if (hits.length !== 1) throw new Error(`${plan}: '${m.item}' 로 시작하는 줄 ${hits.length}개(1 이어야 함)`);
    for (const k of Object.keys(m.set)) if (k in hits[0]) throw new Error(`${plan}: '${m.item}' 에 이미 ${k}`);
    // 글자 자리: 그 줄의 item 값 뒤 첫 "expect": N 뒤에 끼움
    const itemJson = JSON.stringify(hits[0].item);
    // 같은 item 글의 줄이 여럿이면 그 줄의 to 글이 뒤따르는 자리를 고름
    const toJson = JSON.stringify(hits[0].to);
    let at = -1;
    for (const key of [`"item": ${itemJson}`, `"item":${itemJson}`]) {
      for (let p = raw.indexOf(key); p >= 0 && at < 0; p = raw.indexOf(key, p + 1)) {
        const next = raw.indexOf(`"item"`, p + key.length);
        const body = raw.slice(p, next < 0 ? raw.length : next);
        if (m.to === undefined || body.includes(`"to": ${toJson}`) || body.includes(`"to":${toJson}`)) at = p;
      }
      if (at >= 0) break;
    }
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
