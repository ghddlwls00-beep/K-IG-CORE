#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 확인(그 조각을 본 일꾼과 다른 일꾼). 대상: '제대로 · 괜찮음' 이 아닌 것 전부 + 제대로 · 괜찮음 10%(최소 2 · 해시로 고정).
 *   node 수정확인-확인.cjs <조각> --pick | <결과.json> [--replace] | --status
 * 결과.json = { "결과": [ { "key": "<id>", "결론": "동의|뒤집음", "까닭": "…", (뒤집음이면) "바른 판정": "…" } ], "메모": "…" }
 */
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "../수정확인");
const [chunk, arg, ...rest] = process.argv.slice(2);
const SRC = path.join(OUT, `판정-${chunk}.json`), F = path.join(OUT, `확인-${chunk}.json`), LOG = path.join(OUT, `기록-${chunk}-확인.md`);
if (!chunk || !arg || !fs.existsSync(SRC)) { console.error("쓰는 법: node 수정확인-확인.cjs <조각> --pick | <결과.json> | --status (먼저 적기가 끝나야 함)"); process.exit(2); }
const h01 = (s) => { let h = 2166136261 >>> 0; for (const ch of "c" + s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h / 4294967296; };
let state = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, "utf8")) : null;
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
if (arg === "--pick") {
  if (!state) {
    const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
    const all = Object.values(src.결과);
    const bad = all.filter((r) => !["제대로", "괜찮음"].includes(r.판정));
    const good = all.filter((r) => ["제대로", "괜찮음"].includes(r.판정)).sort((a, b) => h01(a.id) - h01(b.id));
    const sample = good.slice(0, Math.max(2, Math.ceil(good.length * 0.1)));
    state = { 조각: chunk, 뽑은때: stamp, 대상: [...bad.map((r) => ({ key: r.id, 까닭: "제대로 · 괜찮음이 아님 — 전부", 주장: r })), ...sample.map((r) => ({ key: r.id, 까닭: "제대로 · 괜찮음 10%", 주장: r }))], 결과: [] };
    fs.writeFileSync(F, JSON.stringify(state, null, 1));
  }
  const by = {};
  for (const t of state.대상) by[t.까닭] = (by[t.까닭] || 0) + 1;
  console.log(`확인 대상 ${state.대상.length}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  for (const t of state.대상) console.log(`${t.key} · ${t.까닭} · ${t.주장.판정}`);
  process.exit(0);
}
if (!state) { console.error("먼저 --pick"); process.exit(2); }
const done = new Map(state.결과.map((r) => [r.key, r]));
if (arg === "--status") { const left = state.대상.filter((t) => !done.has(t.key)); console.log(`${chunk} 확인 ${state.대상.length - left.length}/${state.대상.length}${left.length ? ` · 남음 ${left.map((t) => t.key).join(" ")}` : " ✔"}`); process.exit(left.length ? 1 : 0); }
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const targets = new Set(state.대상.map((t) => t.key));
const errs = [], out = [];
for (const [i, r] of (batch.결과 || []).entries()) {
  const w = `결과[${i}] ${r.key}`;
  if (!targets.has(r.key)) { errs.push(`${w}: 대상이 아님`); continue; }
  if (done.has(r.key) && !rest.includes("--replace")) errs.push(`${w}: 이미 적음`);
  if (!["동의", "뒤집음"].includes(r.결론)) errs.push(`${w}: 결론은 동의|뒤집음`);
  if (!r.까닭 || !String(r.까닭).trim()) errs.push(`${w}: 까닭 없음`);
  if (r.결론 === "뒤집음" && !r["바른 판정"]) errs.push(`${w}: 뒤집음이면 '바른 판정'`);
  out.push({ ...r, 때: stamp });
}
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of out) done.set(r.key, r);
state.결과 = [...done.values()];
fs.writeFileSync(F, JSON.stringify(state, null, 1));
const c = {};
for (const r of out) c[r.결론] = (c[r.결론] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 관문 15 고침 다시 보기 — ${chunk} 확인\n\n`);
const line = `- ${stamp} · +${out.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${state.결과.length}/${state.대상.length}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
