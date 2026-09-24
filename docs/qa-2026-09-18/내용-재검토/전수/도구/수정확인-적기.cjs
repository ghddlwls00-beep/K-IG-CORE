#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 일꾼이 판정을 적는 길(읽을거리 조각: 줄-… · 칩-…).
 *   node 수정확인-적기.cjs <조각> <결과.json> [--replace]   검사 뒤 수정확인/판정-<조각>.json · 기록-<조각>.md
 *   node 수정확인-적기.cjs <조각> --status                  남은 id · exit 0 = 모두 적음
 * 줄 조각 결과.json = { "결과": [ { "id": "P12", "판정": "제대로|다르게 들어감|안 들어감|옆 글을 망침|모름",
 *                                  "main 글": "그 자리의 main 글(제대로가 아니면 꼭)", "까닭": "…", "고칠 것": "(제대로가 아니면) 수정 세션이 할 일" } ], "메모": "…" }
 * 칩 조각 결과.json = { "결과": [ { "id": "d172", "판정": "괜찮음|문제",
 *                                  "문제": [ { "n": "n3", "칩": "[…]", "무엇": "…", "고칠 글": "그 강의 힌트 줄 전체(고칠 때)" } ], "까닭": "…" } ], "메모": "…" }
 */
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "../수정확인");
const ids = JSON.parse(fs.readFileSync(path.join(OUT, "ids.json"), "utf8"));
const [chunk, arg, ...rest] = process.argv.slice(2);
if (!chunk || !arg || !ids[chunk]) { console.error(`쓰는 법: node 수정확인-적기.cjs <${Object.keys(ids).join("|")}> <결과.json> | --status`); process.exit(2); }
const F = path.join(OUT, `판정-${chunk}.json`), LOG = path.join(OUT, `기록-${chunk}.md`);
const state = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, "utf8")) : { 조각: chunk, 결과: {} };
const isChip = chunk.startsWith("칩-");
if (arg === "--status") {
  const left = ids[chunk].filter((id) => !state.결과[id]);
  const bad = Object.values(state.결과).filter((r) => !["제대로", "괜찮음"].includes(r.판정)).length;
  console.log(`${chunk} ${ids[chunk].length - left.length}/${ids[chunk].length} · 제대로/괜찮음 아님 ${bad}${left.length ? ` · 남음 ${left.join(" ")}` : " ✔"}`);
  process.exit(left.length ? 1 : 0);
}
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const OK = isChip ? ["괜찮음", "문제"] : ["제대로", "다르게 들어감", "안 들어감", "옆 글을 망침", "모름"];
const errs = [], add = [];
const seen = new Set();
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
for (const [i, r] of (batch.결과 || []).entries()) {
  const w = `결과[${i}] ${r.id}`;
  if (!ids[chunk].includes(r.id)) { errs.push(`${w}: 이 조각의 id 가 아님`); continue; }
  if (seen.has(r.id)) errs.push(`${w}: 두 번`);
  seen.add(r.id);
  if (state.결과[r.id] && !rest.includes("--replace")) errs.push(`${w}: 이미 적음 — 바꾸려면 --replace`);
  if (!OK.includes(r.판정)) errs.push(`${w}: 판정은 ${OK.join("|")}`);
  if (!r.까닭 || !String(r.까닭).trim()) errs.push(`${w}: 까닭 없음`);
  if (!isChip && r.판정 !== "제대로") { if (!r["main 글"]) errs.push(`${w}: 제대로가 아니면 'main 글'`); if (!r["고칠 것"] && r.판정 !== "모름") errs.push(`${w}: 제대로가 아니면 '고칠 것'`); }
  if (isChip && r.판정 === "문제") { if (!Array.isArray(r.문제) || !r.문제.length) errs.push(`${w}: 문제면 '문제' 목록`); else r.문제.forEach((p, j) => { for (const k of ["n", "칩", "무엇"]) if (!p[k]) errs.push(`${w} 문제[${j}]: '${k}' 없음`); }); }
  add.push({ ...r, 때: stamp });
}
if (!add.length && !errs.length) errs.push("결과가 하나도 없음");
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of add) state.결과[r.id] = r;
fs.writeFileSync(F, JSON.stringify(state, null, 1));
const left = ids[chunk].filter((id) => !state.결과[id]);
const c = {};
for (const r of add) c[r.판정] = (c[r.판정] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 관문 15 고침 다시 보기 — ${chunk}\n\n`);
const line = `- ${stamp} · +${add.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${ids[chunk].length - left.length}/${ids[chunk].length}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
