#!/usr/bin/env node
/**
 * LISTENING 받아쓰기 한 행에서 앱이 띄우는 힌트 칩 — src/components/LdLearningView.tsx 의 hintChunks·pickHintsFor 와 같은
 * 규칙(lib/expectations.cjs 가 옮겨 적은 것)을 지금 파일에 돌린다. 칩은 본 페이지의 **첫** hints 블록에서만 온다(59행).
 * 대본에 대문자 이름·숫자를 새로 넣거나 힌트를 바꾼 뒤, 그 행에서 칩이 어떻게 뜨는지 확인하는 데 쓴다(명령서 2절).
 *
 *   node ld-chips.cjs d060:1 d103:8 …                 지금 칩
 *   node ld-chips.cjs --save before.json d060:1 …      지금 칩을 파일로 (고치기 전)
 *   node ld-chips.cjs --diff before.json               저장한 행을 지금과 비교
 * 칩 전체가 뜨는 경우(짝을 못 찾아 안전장치가 강의 힌트 전부를 내놓음)는 "전체" 로 표시한다.
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const strip = (s) => String(s).replace(/^﻿/, "");
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
function chips(id, n) {
  const d = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8")));
  const hints = (d.blocks || []).find((b) => b.type === "hints");
  const chunks = E.hintChunks(hints ? hints.text : "");
  const row = (S[id] || []).find((r) => String(r.n) === String(n));
  if (!row) return { sentence: null, chips: [], all: false };
  const got = E.hintsForSentence(row.en, chunks);
  return { sentence: row.en, chips: got, all: chunks.length > 1 && got.length === chunks.length };
}
const args = process.argv.slice(2);
if (args[0] === "--dupes") {
  // 한 행에 같은 글자의 칩이 두 번 뜨는 행 수 (6단계: 앱 hintChunks 가 같은 청크를 한 번만 남기게 고침 → 0 이어야 함).
  // --old-rule 이면 고치기 전 규칙(중복 청크를 그대로 둠)으로 센다 — 일부러 깨기(8 이 나와야 함).
  const old = args.includes("--old-rule");
  const chunksOf = (t) => (old
    ? String(t || "").split(/,|\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/[.,]+$/, "").trim()).filter(Boolean)
    : E.hintChunks(t));
  let rows = 0, dup = 0;
  const ex = [];
  for (const f of fs.readdirSync(path.join(REPO, "content/lessons/ld")).filter((f) => /^d\d{3}\.json$/.test(f))) {
    const id = f.slice(0, -5);
    const d = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/lessons/ld", f), "utf8")));
    const chunks = chunksOf(((d.blocks || []).find((b) => b.type === "hints") || {}).text || "");
    for (const r of S[id] || []) {
      rows++;
      const got = E.hintsForSentence(r.en, chunks);
      if (new Set(got).size !== got.length) { dup++; if (ex.length < 5) ex.push(`${id}:${r.n}`); }
    }
  }
  console.log(`${old ? "[고치기 전 규칙] " : ""}LISTENING ${rows}행 중 같은 칩이 두 번 뜨는 행 ${dup}${ex.length ? ` (${ex.join(" ")})` : ""}`);
  process.exit(dup && !old ? 1 : 0);
}
const show =(k, c) => `${k.padEnd(9)} ${c.all ? "[전체] " : ""}${c.chips.length ? c.chips.map((x) => `「${x}」`).join(" ") : "(칩 없음)"}\n          ${c.sentence}`;
/** --all: 본 페이지(dNNN)마다 대본의 모든 행 — 7단계 7-5 가 2,217행 전후를 견줄 때 */
const allKeys = () => fs.readdirSync(path.join(REPO, "content/lessons/ld")).filter((f) => /^d\d{3}\.json$/.test(f)).sort()
  .flatMap((f) => (S[f.slice(0, 4)] || []).map((r) => `${f.slice(0, 4)}:${r.n}`));
const LONG = 5;
const wordsOf = (chip) => String(chip).split(/\s+/).filter(Boolean);
const key = (w) => String(w).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, "");
if (args[0] === "--diff") {
  const before = JSON.parse(fs.readFileSync(args[1], "utf8"));
  const SUMMARY = args.includes("--summary");
  // 기능어(관사 · 전치사 · 접속사 · 대명사 · be · 소사)는 힌트 항목이 아니라 구절의 이음새 — 따로 센다(0 이 아니어도 실패 아님)
  const FUNCTION = new Set("a an the of in on at to for from by with into onto and or but nor as is are was were be been it its his her their our your my him them this that these those up out off down over".split(" "));
  let same = 0, changed = 0, longRowsBefore = 0, longRowsAfter = 0, lostRows = 0, lostFnRows = 0;
  const lost = [];
  for (const [k, b] of Object.entries(before)) {
    const [id, n] = k.split(":");
    const a = chips(id, n);
    const isSame = JSON.stringify(a.chips) === JSON.stringify(b.chips);
    if (isSame) same++; else changed++;
    if (b.chips.some((c) => wordsOf(c).length >= LONG)) longRowsBefore++;
    if (a.chips.some((c) => wordsOf(c).length >= LONG)) longRowsAfter++;
    // 그 행 문장에 든 힌트 낱말이 전에는 칩으로 떴는데 이제 안 뜨는가 — 0 이어야 함(명령서 7-5)
    const sentence = new Set(wordsOf(a.sentence || "").map(key));
    const afterWords = new Set(a.chips.flatMap(wordsOf).map(key));
    const goneAll = [...new Set(b.chips.flatMap(wordsOf).map(key))].filter((w) => w && sentence.has(w) && !afterWords.has(w));
    const gone = goneAll.filter((w) => !FUNCTION.has(w));
    if (gone.length) { lostRows++; lost.push(`${k} 빠짐 ${gone.join(", ")}`); }
    else if (goneAll.length) lostFnRows++;
    if (!SUMMARY) console.log(`${isSame ? "같음" : "바뀜"}  ${k}\n   전: ${b.all ? "[전체] " : ""}${b.chips.map((x) => `「${x}」`).join(" ") || "(칩 없음)"}\n   후: ${a.all ? "[전체] " : ""}${a.chips.map((x) => `「${x}」`).join(" ") || "(칩 없음)"}\n   문장: ${a.sentence}`);
  }
  console.log(`${Object.keys(before).length}행 — 같음 ${same} · 바뀜 ${changed} · ${LONG}낱말 이상 칩이 뜨는 행 ${longRowsBefore} → ${longRowsAfter} · 문장에 든 힌트 낱말이 칩에서 빠진 행 ${lostRows} (기능어만 빠진 행 ${lostFnRows} — 따로 셈)`);
  for (const l of lost.slice(0, 40)) console.log(`  ${l}`);
  process.exit(lostRows ? 1 : 0);
} else {
  const save = args[0] === "--save" ? args[1] : null;
  const keys = save ? (args.includes("--all") ? allKeys() : args.slice(2)) : (args.includes("--all") ? allKeys() : args);
  const out = {};
  for (const k of keys) { const [id, n] = k.split(":"); out[k] = chips(id, n); if (!save) console.log(show(k, out[k])); }
  if (save) { fs.writeFileSync(save, JSON.stringify(out, null, 1)); console.log(`저장 ${keys.length}행 → ${save}`); }
}
