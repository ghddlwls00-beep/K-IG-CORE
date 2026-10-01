#!/usr/bin/env node
// Score a blind-guess run. Input: a JSON array of {id, pick, confidence, remaining} (or a workflow journal.jsonl whose result lines
// hold {items:[…]}) and the key from blind-packets.cjs. Writes guessable.json: ids answered right with 'sure'/'likely' or with two or
// fewer options left, plus the absolute-word cue ids (absolute words only in wrong options).
//   node blind-score.cjs <results.json|journal.jsonl> <key.json> [--out guessable.json]
const fs = require("fs");
const path = require("path");
const { allQuestions, ABS } = require("./lib.cjs");
const [src, keyFile] = process.argv.slice(2);
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "guessable.json";
const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
let items = [];
const raw = fs.readFileSync(src, "utf8");
if (src.endsWith(".jsonl")) {
  for (const l of raw.split(/\n/).filter(Boolean)) {
    const o = JSON.parse(l);
    if (o.type === "result" && o.result && Array.isArray(o.result.items)) items.push(...o.result.items);
  }
} else items = JSON.parse(raw);
const flagged = new Set();
for (const course of ["ld", "reading"]) {
  const list = items.filter((x) => key[x.id] !== undefined && (course === "reading") === x.id.startsWith("pr")).map((x) => ({ ...x, right: x.pick === key[x.id] }));
  const n = list.length || 1;
  const right = list.filter((x) => x.right).length;
  const narrow = list.filter((x) => x.right && x.remaining <= 2).length;
  console.log(`${course}: 받음 ${list.length} · 듣지(읽지) 않고 맞힘 ${right}(${Math.round((right / n) * 100)}%) · 둘 이하로 좁혀 맞힘 ${narrow}(${Math.round((narrow / n) * 100)}%)`);
  for (const x of list) if (x.right && (x.confidence === "sure" || x.confidence === "likely" || x.remaining <= 2)) flagged.add(x.id);
}
const absolute = [];
for (const { q } of allQuestions()) {
  const f = q.options.map((o) => ABS.test(o));
  if (!f[q.answer] && f.some((x, i) => x && i !== q.answer)) absolute.push(q.id);
}
const union = [...new Set([...flagged, ...absolute])];
console.log(`눈치로 풀림 ${flagged.size} · 극단적인 말이 오답에만 ${absolute.length} · 합친 문항 ${union.length}`);
fs.writeFileSync(OUT, JSON.stringify({ flagged: [...flagged], absolute, union }, null, 1));
