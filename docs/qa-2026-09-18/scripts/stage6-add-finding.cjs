#!/usr/bin/env node
/**
 * 6단계 작업 중 새로 찾은 문제를 6E 번호로 올린다 — 6단계-이월.json 에 항목을 더하고 6단계-진행.json 에 "미처리" 칸을 만든다.
 * 목록 1,759건에 없던 것을 말없이 고치지 않고 번호를 붙여 같은 기준으로 처리하기 위한 도구 (이월 대조의 "대조 중 발견" 과 같은 방식).
 *
 *   node stage6-add-finding.cjs <finding.json>   { course, lesson, file, locator, original, problem, evidence }
 */
const fs = require("fs");
const path = require("path");
const DIR = path.resolve(__dirname, "..");
const CARRY = path.join(DIR, "6단계-이월.json");
const PROG = path.join(DIR, "6단계-진행.json");
const f = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const k of ["course", "lesson", "file", "locator", "problem", "evidence"]) if (!f[k]) throw new Error(`${k} 없음`);
const carry = JSON.parse(fs.readFileSync(CARRY, "utf8"));
const n = Math.max(...carry.items.map((x) => Number(x.id.slice(3)))) + 1;
const id = `6E-${String(n).padStart(3, "0")}`;
carry.items.push({ id, source: "6단계 중 발견", from: [], ...f });
carry.count = carry.items.length;
fs.writeFileSync(CARRY, JSON.stringify(carry, null, 1) + "\n", "utf8");
const prog = JSON.parse(fs.readFileSync(PROG, "utf8"));
if (prog.items[id]) throw new Error(`${id} 이미 진행 기록에 있음`);
prog.items[id] = { status: "미처리", reason: "", files: [], clip: "", batch: null };
fs.writeFileSync(PROG, JSON.stringify(prog, null, 1) + "\n", "utf8");
console.log(`${id} 추가 — 이월 ${carry.count}개 · 진행 기록 ${Object.keys(prog.items).length}칸`);
