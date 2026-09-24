#!/usr/bin/env node
/**
 * 전수 읽기 LISTENING 일꾼용 — 힌트 줄(dNNN.json hints 블록)을 앱과 같은 규칙(expectations.cjs hintChunks · hintsForSentence
 * = LdLearningView 의 칩 규칙)으로 문장마다 칩으로 나눠 보인다. 고칠 힌트 줄을 주면 지금 칩과 나란히 — 고친 줄이 새 틀림을 안 만드는지 볼 때.
 * 저장소 파일은 읽기만(쓰지 않음).
 *
 *   node chips.cjs d010                      지금 힌트 줄 · 청크 · 문장마다 칩
 *   node chips.cjs d010 <고칠-힌트.txt>       (UTF-8 글 파일 하나 = 고칠 힌트 줄 전체) 지금 → 고친 뒤 칩, 달라진 문장에 ◆
 */
const fs = require("fs");
const path = require("path");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const Rn = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/render.cjs"));
const E = Rn.E;

// 도구 확인 — 약어 뒤 마침표는 경계로 읽혀 쪼개짐(알려진 동작) · 쉼표 천 단위는 안 쪼갬
const t1 = E.hintChunks("Mrs. Watson. 4,000 dollars");
if (JSON.stringify(t1) !== JSON.stringify(["Mrs", "Watson", "4,000 dollars"])) { console.error(`도구 확인 실패: ${JSON.stringify(t1)}`); process.exit(3); }
console.log('도구 확인 ✔ "Mrs. Watson. 4,000 dollars" → [Mrs] [Watson] [4,000 dollars]');

const base = process.argv[2];
if (!/^d\d{3}$/.test(base || "")) { console.error("쓰는 법: node chips.cjs dNNN [고칠-힌트.txt]"); process.exit(2); }
const now = Rn.ldLesson(L.HEAD, base);
console.log(`지금 힌트 줄: ${JSON.stringify(now.hints)}`);
console.log(`지금 청크: ${E.hintChunks(now.hints || "").map((c) => `[${c}]`).join(" ")}`);
let proposed = null;
if (process.argv[3]) {
  proposed = fs.readFileSync(path.resolve(process.argv[3]), "utf8").replace(/^\uFEFF/, "").replace(/\r?\n$/, "");
  console.log(`고칠 힌트 줄: ${JSON.stringify(proposed)}`);
  console.log(`고친 청크: ${E.hintChunks(proposed).map((c) => `[${c}]`).join(" ")}`);
}
const pc = proposed == null ? null : E.hintChunks(proposed);
for (const r of now.rows) {
  const a = r.chips.map((x) => `[${x}]`).join(" ") || "(칩 없음)";
  if (!pc) { console.log(`n${r.n} ${a}   ← ${JSON.stringify(r.en)}`); continue; }
  const b = E.hintsForSentence(String(r.en || ""), pc).map((x) => `[${x}]`).join(" ") || "(칩 없음)";
  console.log(`${a === b ? " " : "◆"} n${r.n} 지금 ${a}  →  고친 뒤 ${b}   ← ${JSON.stringify(r.en)}`);
}
