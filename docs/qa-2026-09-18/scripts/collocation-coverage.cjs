#!/usr/bin/env node
/**
 * BUG-021 자료 — VOCA STEP 1 의 "연어(콜로케이션)" 칸과 "어원" 칸이 실제로 몇 장의 낱말 카드에서 뜨는가.
 * 앱의 함수(src/lib/vocaUtils.ts getCollocation · analyzeEtymology)를 그대로 불러 195강 낱말표 전부에 돌린다.
 * 고치지 않는다 — 소유자 판단용 자료.
 *
 *   node collocation-coverage.cjs [--json]
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const voca = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const { FREE_PREVIEW_LESSON_IDS } = loadTs(path.join(REPO, "src/lib/license.ts"));
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const dir = path.join(REPO, "content/lessons/phonics");
const free = new Set(FREE_PREVIEW_LESSON_IDS.phonics || []);

let cards = 0, collCards = 0, etyCards = 0;
const collWords = new Map(), etyWords = new Map();
const lessonsWithColl = new Set(), lessonsWithEty = new Set();
const distinct = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const id = f.replace(/\.json$/, "");
  const grid = (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).blocks || []).find((b) => b.type === "wordgrid");
  for (const raw of grid ? grid.rows.flat() : []) {
    const w = String(raw || "").trim();
    if (!w) continue;
    cards++;
    distinct.add(w.toLowerCase());
    const entry = dict[w] || dict[w.toLowerCase()] || {};
    // PhonicsLearningView 와 같은 인자: 낱말과 사전의 searchWord
    if (voca.getCollocation(w, entry.searchWord)) {
      collCards++; lessonsWithColl.add(id);
      collWords.set(w.toLowerCase(), [...(collWords.get(w.toLowerCase()) || []), id]);
    }
    if (voca.analyzeEtymology(w)) {
      etyCards++; lessonsWithEty.add(id);
      etyWords.set(w.toLowerCase(), [...(etyWords.get(w.toLowerCase()) || []), id]);
    }
  }
}
const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const src = fs.readFileSync(path.join(REPO, "src/components/PhonicsLearningView.tsx"), "utf8");
const advertised = src.split(/\r?\n/).map((l, i) => [i + 1, l.trim()]).filter(([, l]) => /콜로케이션|Collocation/.test(l) && !/^\/\/|^\*|getCollocation|selectedCollocation\b(?!\.)/.test(l));
const out = {
  cards, distinctWords: distinct.size,
  collocation: { presets: collWords.size, cards: collCards, lessons: lessonsWithColl.size, freeLessonsWith: [...lessonsWithColl].filter((l) => free.has(l)), words: Object.fromEntries(collWords) },
  etymology: { presets: etyWords.size, cards: etyCards, lessons: lessonsWithEty.size, words: Object.fromEntries(etyWords) },
  advertised,
};
if (process.argv.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`VOCA 195강 · 낱말 카드 ${cards}장 (서로 다른 낱말 ${distinct.size}개)`);
console.log(`연어 칸이 뜨는 카드: ${collCards}장 (${pct(collCards, cards)}) · 낱말 ${collWords.size}개 · 강의 ${lessonsWithColl.size}개 · 무료 강의 중 ${out.collocation.freeLessonsWith.length}개`);
for (const [w, ls] of collWords) console.log(`   ${w}: ${ls.join(", ")}`);
console.log(`어원 칸이 뜨는 카드: ${etyCards}장 (${pct(etyCards, cards)}) · 낱말 ${etyWords.size}개 · 강의 ${lessonsWithEty.size}개`);
console.log(`화면 문구에서 연어를 내세우는 곳:`);
for (const [n, l] of advertised) console.log(`   PhonicsLearningView.tsx:${n}  ${l.slice(0, 90)}`);
