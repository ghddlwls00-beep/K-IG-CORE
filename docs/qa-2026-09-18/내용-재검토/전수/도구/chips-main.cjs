#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — main 판(스냅샷)의 대본 · 힌트 줄로, 새 칩 규칙(칭호 · 한 글자 머리글자 뒤 '. ' 은 안 나눔 — LdLearningView · main expectations.cjs 와 같은 정규식)
 * 으로 문장마다 칩을 보인다. 고칠 힌트 줄을 주면 main 칩과 나란히. 읽기만.
 *   node chips-main.cjs d172                 main 힌트 줄 · 청크 · 문장마다 칩
 *   node chips-main.cjs d172 <고칠-힌트.txt>  → main 칩 → 고친 뒤 칩(달라진 문장 ◆)
 */
const fs = require("fs");
const path = require("path");
const B = path.resolve(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(B, "수정확인", "기계.json"), "utf8"));
const SNAP = process.env.KIG_SNAP || R.스냅; // KIG_SNAP: 다른 판의 스냅샷(예: 수정 세션이 더 고친 main)
const WT = path.resolve(__dirname, "../../../../..");
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const E = L.loadExpectations(); // hintsForSentence 는 main 과 같은 함수(바뀐 것은 hintChunks 뿐 — git diff 로 확인)
const NEW = (t) => String(t || "").split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim()).filter((c, i, a) => c && a.indexOf(c) === i);
if (JSON.stringify(NEW("Mrs. Watson. 4,000 dollars. Dr. William N. Green")) !== JSON.stringify(["Mrs. Watson", "4,000 dollars", "Dr. William N. Green"])) { console.error("도구 확인 실패"); process.exit(3); }
console.log('도구 확인 ✔ "Mrs. Watson. 4,000 dollars. Dr. William N. Green" → [Mrs. Watson] [4,000 dollars] [Dr. William N. Green]');
const base = process.argv[2];
if (!/^d\d{3}$/.test(base || "")) { console.error("쓰는 법: node chips-main.cjs dNNN [고칠-힌트.txt]"); process.exit(2); }
const sc = JSON.parse(fs.readFileSync(path.join(SNAP, "content/ld_english_scripts.json"), "utf8"));
const lesson = JSON.parse(fs.readFileSync(path.join(SNAP, `content/lessons/ld/${base}.json`), "utf8"));
const hb = (lesson.blocks || []).find((b) => b.type === "hints");
const hints = hb ? hb.text : "";
console.log(`main 힌트 줄: ${JSON.stringify(hints)}`);
console.log(`main 청크: ${NEW(hints).map((c) => `[${c}]`).join(" ")}`);
let prop = null;
if (process.argv[3]) { prop = fs.readFileSync(path.resolve(process.argv[3]), "utf8").replace(/^﻿/, "").replace(/\r?\n$/, ""); console.log(`고칠 힌트 줄: ${JSON.stringify(prop)}`); console.log(`고친 청크: ${NEW(prop).map((c) => `[${c}]`).join(" ")}`); }
for (const r of sc[base] || []) {
  const a = E.hintsForSentence(String(r.en || ""), NEW(hints)).map((x) => `[${x}]`).join(" ") || "(칩 없음)";
  if (prop == null) { console.log(`n${r.n} ${a}   ← ${JSON.stringify(r.en)}`); continue; }
  const b = E.hintsForSentence(String(r.en || ""), NEW(prop)).map((x) => `[${x}]`).join(" ") || "(칩 없음)";
  console.log(`${a === b ? " " : "◆"} n${r.n} main ${a}  →  고친 뒤 ${b}   ← ${JSON.stringify(r.en)}`);
}
