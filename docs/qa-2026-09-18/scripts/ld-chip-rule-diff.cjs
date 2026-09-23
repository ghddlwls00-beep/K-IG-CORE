#!/usr/bin/env node
/**
 * LISTENING 칩 규칙을 바꿀 때(6단계 3차 점검 #4 N1 — 천 단위 쉼표) 옛 규칙과 새 규칙(lib/expectations.cjs = 앱과 같은 규칙)으로
 * 과정 전체 2,217행의 칩을 둘 다 계산해 비교한다. 파일은 안 바꿈.
 *   - "숫자 조각 칩" (검사 세션 정의: 힌트에서 '<숫자>,' 바로 뒤이거나 ',<세 자리>' 바로 앞인 청크)이 뜨는 행 수 — 새 규칙 0 이어야 함
 *   - 칩이 바뀐 행을 종류별로
 *
 *   node ld-chip-rule-diff.cjs [--rows]
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const strip = (s) => String(s).replace(/^﻿/, "");
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
const ROWS = process.argv.includes("--rows");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 옛 규칙 — 6단계 전 앱과 같은 쪼개기(쉼표마다) · 문장 쉼표 그대로 비교
const oldChunks = (t) => String(t || "").split(/,|\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/[.,]+$/, "").trim()).filter((c, i, a) => c && a.indexOf(c) === i);
function oldFor(sentence, chunks) {
  const sq = String(sentence).toLowerCase().replace(/[^a-z0-9]/g, "");
  const rel = chunks.filter((chunk) => {
    const whole = chunk.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (whole.length >= 3 && sq.includes(whole)) return true;
    return chunk.split(/\s+/).some((token) => {
      const bare = token.replace(/[^A-Za-z0-9'’.]/g, "").replace(/[.'’]+$/, "");
      if (/^\d{2,}$/.test(bare)) return new RegExp(`(?<!\\d)${bare}(?!\\d)`).test(sentence);
      const letters = bare.replace(/[^A-Za-z]/g, "");
      if (letters.length < (/^[A-Z]/.test(bare) ? 3 : 5)) return false;
      return sq.includes(bare.toLowerCase().replace(/[^a-z0-9]/g, ""));
    });
  });
  if (rel.length) return rel;
  // 안전장치 — lib/expectations.cjs 와 같음
  if (/\d/.test(sentence)) return chunks;
  const hasName = sentence.split(/(?<=[.?!])\s+/).some((part) => part.trim().split(/\s+/).slice(1).some((w) => {
    const b = w.replace(/[^A-Za-z'’]/g, "");
    if (/^I(?:'m|'ve|'ll|'d)?$/.test(b)) return false;
    return /^[A-Z]/.test(b) && b.replace(/[^A-Za-z]/g, "").length > 1;
  }));
  return hasName ? chunks : [];
}
const pieceIn = (text) => (c) => (/^\d{3}(\s|$)/.test(c) && new RegExp(`\\d,${esc(c)}`).test(text)) || (/\d$/.test(c) && new RegExp(`${esc(c)},\\d{3}`).test(text));

let rows = 0, changed = 0, oldPieceRows = 0, newPieceRows = 0;
const kinds = {};
const out = [];
for (const f of fs.readdirSync(path.join(REPO, "content/lessons/ld")).filter((x) => /^d\d{3}\.json$/.test(x)).sort()) {
  const id = f.slice(0, -5);
  const L = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/lessons/ld", f), "utf8")));
  const text = ((L.blocks || []).find((b) => b.type === "hints") || {}).text || "";
  const oc = oldChunks(text), nc = E.hintChunks(text);
  const piece = pieceIn(text);
  for (const r of S[id] || []) {
    rows++;
    const a = oldFor(r.en, oc), b = E.hintsForSentence(r.en, nc);
    if (a.some(piece)) oldPieceRows++;
    if (b.some(piece)) newPieceRows++;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    changed++;
    const aAll = oc.length > 1 && a.length === oc.length, bAll = nc.length > 1 && b.length === nc.length;
    const k = aAll && !bAll ? "전체→행별" : !a.length && b.length ? "없음→행별" : a.length && !b.length ? "행별→없음" : !aAll && bAll ? "행별→전체" : "행별 바뀜";
    kinds[k] = (kinds[k] || 0) + 1;
    out.push(`${k.padEnd(6)} ${id}:${r.n}\n   옛: ${a.map((x) => `「${x}」`).join(" ") || "(없음)"}\n   새: ${b.map((x) => `「${x}」`).join(" ") || "(없음)"}`);
  }
}
console.log(`LISTENING ${rows}행 · 숫자 조각 칩이 뜨는 행: 옛 규칙 ${oldPieceRows} → 새 규칙 ${newPieceRows} · 칩이 바뀐 행 ${changed} ${JSON.stringify(kinds)}`);
if (ROWS) console.log(out.join("\n"));
process.exit(newPieceRows ? 1 : 0);
