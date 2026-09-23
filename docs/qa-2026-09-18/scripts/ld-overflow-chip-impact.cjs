#!/usr/bin/env node
/**
 * 넘친 힌트 줄을 합치면(ld-merge-overflow-hints.cjs) 받아쓰기 각 행의 힌트 칩이 어떻게 달라지는지 — 합치기 **전에**
 * 메모리에서만 계산한다(파일은 안 바꿈). 규칙은 앱의 hintChunks·pickHintsFor 와 같은 lib/expectations.cjs.
 * 합친 뒤에 돌리면 두 판이 같으므로 "바뀜 0" 이 나온다.
 *
 *   node ld-overflow-chip-impact.cjs [--rows]     --rows 면 바뀐 행을 하나씩 적는다
 *   node ld-overflow-chip-impact.cjs --json out.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const strip = (s) => String(s).replace(/^﻿/, "");
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
const ROWS = process.argv.includes("--rows");
const ji = process.argv.indexOf("--json");

const kinds = { "같음": 0, "전체→행별": 0, "없음→행별": 0, "행별+더함": 0, "행별 바뀜": 0, "전체→전체(더 김)": 0, "행별→전체": 0, "행별→없음": 0, "기타": 0 };
const out = [];
let lessons = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^d\d{3}\.json$/.test(f)).sort()) {
  const L = JSON.parse(strip(fs.readFileSync(path.join(DIR, f), "utf8")));
  const blocks = L.blocks || [];
  const h = blocks.findIndex((b) => b.type === "hints");
  if (h < 0) continue;
  const over = [];
  for (let i = h + 1; i < blocks.length && blocks[i].type === "instruction" && !/받아쓰기/.test(blocks[i].text || ""); i++) over.push(blocks[i]);
  if (!over.length) continue;
  lessons++;
  const id = f.slice(0, -5);
  const before = E.hintChunks(blocks[h].text);
  const after = E.hintChunks([blocks[h].text.trim(), ...over.map((b) => String(b.text).trim())].join(" "));
  for (const r of S[id] || []) {
    const b = E.hintsForSentence(r.en, before), a = E.hintsForSentence(r.en, after);
    const bAll = before.length > 1 && b.length === before.length, aAll = after.length > 1 && a.length === after.length;
    let k;
    if (JSON.stringify(a) === JSON.stringify(b)) k = "같음";
    else if (bAll && !aAll && a.length) k = "전체→행별";
    else if (!b.length && a.length && !aAll) k = "없음→행별";
    else if (bAll && aAll) k = "전체→전체(더 김)";
    else if (!bAll && aAll) k = "행별→전체";
    else if (b.length && !a.length) k = "행별→없음";
    else if (b.every((x) => a.includes(x))) k = "행별+더함";
    else if (b.length && a.length) k = "행별 바뀜";
    else k = "기타";
    kinds[k]++;
    if (k !== "같음") out.push({ key: `${id}:${r.n}`, kind: k, before: bAll ? ["[전체]"] : b, after: aAll ? ["[전체]"] : a, sentence: r.en });
  }
}
console.log(`강의 ${lessons} · 행 ${Object.values(kinds).reduce((x, y) => x + y, 0)} · ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
if (ROWS) for (const o of out) console.log(`${o.kind.padEnd(10)} ${o.key}\n   전: ${o.before.map((x) => `「${x}」`).join(" ") || "(없음)"}\n   후: ${o.after.map((x) => `「${x}」`).join(" ")}\n   문장: ${o.sentence}`);
if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(out, null, 1));
