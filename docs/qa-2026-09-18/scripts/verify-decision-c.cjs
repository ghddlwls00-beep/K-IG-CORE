#!/usr/bin/env node
/**
 * 관문 15 결정 C 검산 — 결정 A 표(전수 세션 f53d173 채점/판정.json 1,370줄)의 '더할것' 답마다, 고칠곳 문항에서 **앱과 똑같이** 채점해 만점인지.
 * 앱(GrammarLearningView 213 · 222 · 474): 참조 = [cleanText(모범), ...다른 정답.map(cleanText)] — cleanText 는 앞 번호를 지우고 빗금을 빈칸으로.
 * 학습자 답은 친 그대로(normalizeForComparison 만). 전에는 참조를 다듬지 않고 재서 'his/her' 다른 정답 6개가 '만점' 으로 보였다
 * (재점검 — 학습내용 나머지 전체, 2026-09-25: 앱에서는 'his/her' 0점 · 'his her' 만점 · 화면에 'his her'). 그 6개는 뺐고(관문15-고침/조작-C-빗금뺌.json)
 * 여기서는 '뺀 답' 으로 따로 센다.
 * 또 본다: 표의 답 가운데 다듬으면 글이 바뀌는 답(빗금 · 앞 번호) — 0 이어야.
 * --break: 앱의 cleanText 를 빼고 잼(옛 검산) → 뺀 6개가 '만점' 으로 돌아오지 않고, '앱과 다른 검산' 이라 찍혀야(exit 1).
 *   node docs/qa-2026-09-18/scripts/verify-decision-c.cjs [--break]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const g = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const BREAK = process.argv.includes("--break");
const cleanText = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : ""); // GrammarLearningView 60 과 같은 글
const J = JSON.parse(execFileSync("git", ["show", "f53d173:docs/qa-2026-09-18/내용-재검토/전수/채점/판정.json"], { cwd: REPO, encoding: "utf8", maxBuffer: 64e6 }).replace(/^﻿/, ""));
const removed = new Set(JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/관문15-고침/조작-C-빗금뺌.json"), "utf8")).flatMap((o) => o.remove));
const cache = new Map();
const lesson = (rel) => { if (!cache.has(rel)) cache.set(rel, JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8").replace(/^﻿/, ""))); return cache.get(rel); };
let n = 0, skipped = 0, dirty = 0; const bad = [];
for (const r of J.표) {
  const course = r.id.split("/")[0];
  for (const where of r.고칠곳) {
    const m = /^(\S+\.json)\s+\.blocks\[(\d+)\]\.items\[(\d+)\]\s*\(n=([^)]+)\)/.exec(where);
    const item = lesson(`content/lessons/${course}/${m[1]}`).blocks[Number(m[2])].items.find((x) => String(x.n) === m[4]);
    const refs = BREAK ? [item.text, ...(item.alternatives || [])] : [cleanText(item.text), ...(item.alternatives || []).map(cleanText)];
    for (const x of r.더할것) {
      if (cleanText(x.답) !== x.답.trim()) dirty++;
      if (removed.has(x.답)) { skipped++; continue; }
      n++;
      const gr = g.gradeAgainstReferences(x.답, refs);
      if (gr !== "exact") bad.push(`${r.id} ${m[1]} "${x.답}" → ${gr}`);
    }
  }
}
// 지금 파일의 다른 정답 가운데 다듬으면 바뀌는 것(빗금 · 앞 번호)
let dirtyNow = 0;
for (const c of ["grammar1", "grammar2"]) for (const f of fs.readdirSync(path.join(REPO, "content/lessons", c)).filter((x) => x.endsWith(".json"))) {
  const d = lesson(`content/lessons/${c}/${f}`);
  for (const b of d.blocks || []) if (b.type === "sentences") for (const it of b.items || []) for (const a of it.alternatives || []) if (/\//.test(a)) dirtyNow++;
}
console.log(`${BREAK ? "(깨기 — 앱의 cleanText 를 빼고 잼) " : ""}A 표 답(파일마다) ${n + skipped} · 채점 ${n} · 만점 아님 ${bad.length} · 빗금이라 뺀 답 ${skipped} · 표 답 중 다듬으면 바뀌는 것 ${dirty} · 지금 파일의 빗금 든 다른 정답 ${dirtyNow}`);
for (const b of bad.slice(0, 8)) console.log(`   ${b}`);
const ok = bad.length === 0 && dirtyNow === 0 && (BREAK ? false : true);
if (BREAK) console.log("깨기: 앱과 다른 방법으로 잰 검산은 믿지 않음 — exit 1");
process.exit(ok ? 0 : 1);
