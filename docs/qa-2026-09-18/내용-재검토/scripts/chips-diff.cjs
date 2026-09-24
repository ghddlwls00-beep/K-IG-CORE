#!/usr/bin/env node
/**
 * 고친 것 다시 읽기(2026-09-25) — LISTENING 힌트 칩 규칙이 **코드로** 바뀐 영향(LdLearningView hintChunks · 601d0fa):
 * 같은 판(KIG_HEAD)의 힌트 줄 · 대본에 옛 규칙과 새 규칙을 각각 돌려 칩이 달라진 줄을 뽑는다.
 *   1) KIG_HEAD=cd679df node chips-diff.cjs --dump old.json                (이 작업 트리의 감사 도구 = 옛 규칙)
 *   2) KIG_HEAD=cd679df KIG_WT=<고친 판 폴더> node chips-diff.cjs --dump new.json   (고친 판의 감사 도구 = 새 규칙 — 앱과 같은 정규식)
 *   3) KIG_SUB=고침확인 node chips-diff.cjs --packet old.json new.json      → 읽을거리/ld-chips/NN.md · ids.json · 표본.json(쪽 = 강의, 글 = 칩이 바뀐 줄)
 * 힌트 줄 글 자체가 2a80bba 뒤 바뀐 강의는 여기서 뺀다(그 칩은 ld-1 · ld-2 읽을거리가 새 규칙으로 보여 줌).
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const a = process.argv.slice(2);
if (a[0] === "--dump") {
  const Rn = require("./render.cjs");
  const out = {};
  for (let i = 1; i <= 276; i++) { const base = `d${String(i).padStart(3, "0")}`; const x = Rn.ldLesson(L.HEAD, base); out[base] = { hints: x.hints, rows: x.rows.map((r) => ({ n: r.n, en: r.en, chips: r.chips })) }; }
  fs.writeFileSync(a[1], JSON.stringify(out));
  console.log(`칩 ${Object.keys(out).length}강 → ${a[1]} (감사 도구: ${L.WT})`);
  process.exit(0);
}
if (a[0] === "--packet") {
  const oldJ = JSON.parse(fs.readFileSync(a[1], "utf8")), newJ = JSON.parse(fs.readFileSync(a[2], "utf8"));
  const baseScripts = L.jsonAt(L.BASE, "content/ld_english_scripts.json");
  const dir = path.join(L.DIR, "읽을거리", "ld-chips");
  fs.mkdirSync(dir, { recursive: true });
  const pages = {};
  const sections = [];
  let rowsTotal = 0;
  for (const [base, nw] of Object.entries(newJ)) {
    const od = oldJ[base];
    const baseHints = ((L.jsonAt(L.BASE, `content/lessons/ld/${base}.json`) || { blocks: [] }).blocks.find((b) => b.type === "hints") || {}).text || null;
    if (baseHints !== nw.hints) continue; // 힌트 글이 바뀐 강의 — ld-1 · ld-2 가 봄
    const changed = nw.rows.map((r, i) => ({ r, o: od.rows[i] })).filter(({ r, o }) => JSON.stringify(r.chips) !== JSON.stringify(o.chips));
    if (!changed.length) continue;
    const lines = [`## ▣ ld-chips/${base} — 칩이 바뀐 줄 ${changed.length} · 힌트 줄(바뀌지 않음): ${JSON.stringify(nw.hints)}`];
    changed.forEach(({ r, o }, k) => lines.push(`- T${String(k + 1).padStart(2, "0")} [n${r.n}] EN: ${JSON.stringify(r.en)}\n     옛 칩: ${o.chips.map((c) => `[${c}]`).join(" ") || "(없음)"}\n     새 칩: ${r.chips.map((c) => `[${c}]`).join(" ") || "(없음)"}`));
    sections.push(lines.join("\n") + "\n");
    pages[`ld-chips/${base}`] = { 과정: "ld", 조각: "ld-chips", 글수: changed.length, 바뀐글: changed.length };
    rowsTotal += changed.length;
  }
  const batches = [];
  let cur = [], len = 0;
  for (const s of sections) { if (cur.length && len + s.length > 30000) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += s.length; }
  if (cur.length) batches.push(cur);
  batches.forEach((b, i) => fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, "0")}.md`), `# 칩 규칙(코드) 영향 ${String(i + 1).padStart(2, "0")}.md — 강의 ${b.length}\n\n각 강의를 '표본' 한 쪽처럼 적는다: {"쪽": "ld-chips/dNNN", "읽은 글": <그 강의의 T 수>, "틀림": [...]}\n\n${b.join("\n")}`));
  fs.writeFileSync(path.join(dir, "ids.json"), JSON.stringify({ reached: [], unreached: [], groups: {}, batches: {} }, null, 1));
  const sf = path.join(L.DIR, "표본.json");
  const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, "utf8")) : { 씨앗: null, 틀: {}, 뽑음: {}, 쪽: {} };
  for (const k of Object.keys(S.쪽)) if (k.startsWith("ld-chips/")) delete S.쪽[k];
  Object.assign(S.쪽, pages);
  fs.writeFileSync(sf, JSON.stringify(S, null, 1));
  console.log(`칩이 코드 때문에만 바뀐 강의 ${Object.keys(pages).length} · 줄 ${rowsTotal} · 읽을거리 ${batches.length}파일`);
}
