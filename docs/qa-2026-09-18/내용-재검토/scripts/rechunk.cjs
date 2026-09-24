#!/usr/bin/env node
/**
 * 고친 것 다시 읽기(2026-09-25) — 분류.json 의 조각을 잰 속도로 다시 나눈다(메모리 '속도로 나누기': 일꾼 하나 약 20 ~ 30분).
 * 과정마다 강의 묶음 차례(번호)대로 판정할 줄을 쌓아 N 조각으로 고르게: 문법 I 3 · 문법 II 2 · 듣기 2 · 나머지(초등 · 단어 · 읽기) 1.
 *   KIG_SUB=고침확인 node rechunk.cjs
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const F = path.join(L.DIR, "분류.json");
const cls = JSON.parse(fs.readFileSync(F, "utf8"));
const PLAN = { grammar1: ["g1-1", "g1-2", "g1-3"], grammar2: ["g2-1", "g2-2"], ld: ["ld-1", "ld-2"] };
const courseOf = (chunk) => (/^grammar1/.test(chunk) ? "grammar1" : /^grammar2/.test(chunk) ? "grammar2" : /^ld/.test(chunk) ? "ld" : "etc");
const num = (g) => { const m = String(g).match(/(\d+)(?!.*\d)/); return m ? parseInt(m[1], 10) : 0; };
const groups = {};
for (const [id, c] of Object.entries(cls)) {
  const course = courseOf(c.조각);
  (groups[course] = groups[course] || new Map());
  const m = groups[course];
  if (!m.has(c.묶음)) m.set(c.묶음, 0);
  if (c.닿음) m.set(c.묶음, m.get(c.묶음) + 1);
}
const assign = new Map();
for (const [course, m] of Object.entries(groups)) {
  if (!PLAN[course]) { for (const g of m.keys()) assign.set(g, "etc"); continue; }
  const names = PLAN[course];
  const list = [...m].sort((a, b) => num(a[0]) - num(b[0]) || (a[0] < b[0] ? -1 : 1));
  const total = list.reduce((s, [, n]) => s + n, 0);
  let acc = 0;
  for (const [g, n] of list) { const k = Math.min(names.length - 1, Math.floor((acc / total) * names.length)); assign.set(g, names[k]); acc += n; }
}
const count = {};
for (const c of Object.values(cls)) { c.조각 = assign.get(c.묶음) || "etc"; if (c.닿음) count[c.조각] = (count[c.조각] || 0) + 1; }
fs.writeFileSync(F, JSON.stringify(cls, null, 0).replace(/},"G/g, '},\n"G'));
console.log(JSON.stringify(count));
