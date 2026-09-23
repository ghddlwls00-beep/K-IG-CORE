#!/usr/bin/env node
/**
 * 같은 VOCA 강의 두 낱말의 뜻 조각이 '~히' / '~하게' 로만 다른 쌍 (6-0917: exactly '정확히' · correctly '정확하게').
 * 같은 말의 두 꼴인데 퀴즈 규칙(vocaUtils.ts sharesSense)은 글자가 같을 때만 막으므로, 한쪽이 다른 쪽 문제의 '오답' 으로 나온다.
 * 사전 전체에서 1쌍뿐이어서 규칙을 바꾸지 않고 뜻을 고쳤다 — exactly 에 같은 말의 다른 꼴 '정확하게' 를 참뜻으로 더해 두 낱말이
 * 같은 조각을 나눔(3차 점검 #7 ③ — 처음엔 correctly 에서 '정확하게' 를 뺐다가 되돌림). 이 검사가 새로 생기는 것을 잡는다. 0 이 아니면 exit 1.
 *
 *   node check-voca-hi-hage.cjs            지금 파일
 *   node check-voca-hi-hage.cjs --break    일부러 깨기: 메모리에서 고치기 전 두 뜻으로(1 이어야 함)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const D = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
if (process.argv.includes("--break")) {
  D.correctly = { ...D.correctly, meaning: "올바르게, 정확하게" };
  D.exactly = { ...D.exactly, meaning: "정확히, 꼭" };
}
// vocaUtils.ts senseSegments 와 같은 쪼개기
const seg = (m) => String(m || "").replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ").split(/[;,/·]|\s+또는\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const norm = (s) => s.replace(/하게$/, "히");
const dir = path.join(REPO, "content/lessons/phonics");
const seen = new Set();
const hits = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (L.blocks || []).find((b) => b.type === "wordgrid");
  const ws = g ? [...new Set(g.rows.flat().filter(Boolean).map((x) => x.toLowerCase().trim()))] : [];
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    const a = seg((D[ws[i]] || {}).meaning), b = seg((D[ws[j]] || {}).meaning);
    if (a.some((x) => b.includes(x))) continue; // 규칙이 이미 막음
    if (!a.some((x) => b.some((y) => norm(x) === norm(y)))) continue;
    const k = [ws[i], ws[j]].sort().join("/");
    if (seen.has(k)) continue;
    seen.add(k);
    hits.push(`${f.slice(0, -5)} ${ws[i]} = ${D[ws[i]].meaning} | ${ws[j]} = ${D[ws[j]].meaning}`);
  }
}
console.log(`${process.argv.includes("--break") ? "[일부러 깨기] " : ""}'~히 / ~하게' 로만 다른 뜻 조각을 가진 같은 강의 쌍 ${hits.length}${hits.length ? "\n  " + hits.join("\n  ") : ""}`);
process.exit(hits.length ? 1 : 0);
