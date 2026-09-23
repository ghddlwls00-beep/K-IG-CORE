#!/usr/bin/env node
/**
 * READING 글 고치기 계획 만들기 — 문장 안의 일부만 적으면, 문장 통째를 from/to 로 하고 사본 수(expect)를 세어
 * replace-in-lessons.cjs 계획 줄을 만든다. 사본: 강의 파일 readingSentences · 지문 블록(prNNN.json · prNNN-1.json) +
 * 빌드·검사용 중앙 파일 src/lib/readingSentences.json (6단계 READING — 배치 5 가 중앙 파일을 빼먹은 뒤로 늘 넣음).
 *
 *   node make-reading-plan.cjs <입력.json> <출력 계획.json>
 *   입력 한 줄 = { item, id: "reading-005-s001", field: "english" | "korean", from: "문장 안 글", to: "바꿀 글" }
 *   같은 문장에 여러 줄이면 차례로 적용해 한 줄로 합친다. from 이 그 문장에 정확히 한 번이 아니면 멈춘다.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const [inPath, outPath] = process.argv.slice(2);
const input = JSON.parse(fs.readFileSync(path.resolve(inPath), "utf8").replace(/^﻿/, ""));
const esc = (s) => JSON.stringify(s).slice(1, -1);
const merged = new Map(); // id|field → { items, before, after, files }
for (const l of input) {
  const unit = (l.id.match(/reading-(\d{3})-s\d{3}/) || [])[1];
  if (!unit) throw new Error(`id 꼴이 아님: ${l.id}`);
  const main = `content/lessons/reading/pr${unit}.json`;
  const key = `${l.id}|${l.field}`;
  if (!merged.has(key)) {
    const s = JSON.parse(fs.readFileSync(path.join(REPO, main), "utf8")).readingSentences.find((x) => x.id === l.id);
    if (!s) throw new Error(`${l.id} 없음`);
    merged.set(key, { items: [], before: s[l.field], after: s[l.field], files: [main, `content/lessons/reading/pr${unit}-1.json`, "src/lib/readingSentences.json"] });
  }
  const m = merged.get(key);
  if (m.after.split(l.from).length !== 2) throw new Error(`${l.id} ${l.field}: '${l.from}' 가 문장에 한 번이 아님`);
  m.after = m.after.replace(l.from, l.to);
  m.items.push(l.item);
}
const plan = [];
for (const [key, m] of merged) {
  const expect = m.files.reduce((n, f) => n + fs.readFileSync(path.join(REPO, f), "utf8").split(esc(m.before)).length - 1, 0);
  if (expect < 3) throw new Error(`${key}: 사본이 ${expect}곳뿐 — 손으로 확인`);
  plan.push({ item: m.items.join(" · "), files: m.files, from: m.before, to: m.after, expect });
  console.log(`${key} ×${expect}\n  - ${m.before}\n  + ${m.after}`);
}
fs.writeFileSync(path.resolve(outPath), "[\n" + plan.map((p) => " " + JSON.stringify(p)).join(",\n") + "\n]\n");
console.log(`\n계획 ${plan.length}줄 → ${outPath}`);
