#!/usr/bin/env node
/**
 * 다른 확인 도구가 세지 않던 계획 꼴 둘을 **지금 파일**에 다시 대어 본다(7단계 7-1 h 보탬 — 계획 폴더를 꼴로 훑어 보니
 * 어느 도구도 다시 세지 않던 꼴):
 *   READING 문장 가르기(split-reading-row.cjs 로 적용: { item, ids, rows: [{ en, ko }] } · 옛 꼴 { item, id, en: [..], ko: [..] })
 *     → 새 줄들이 사본 셋(prNNN.json · prNNN-1.json 의 readingSentences · src/lib/readingSentences.json 의 prNNN)에
 *       그 차례대로 이어서 있어야 한다(영어 · 한국어 모두).
 *   GRAMMAR 한국어 문제 문구(grammar-prompts.cjs 로 적용: { item, course, base, n, from, to })
 *     → base.json 의 n 번 문항 글이 to 와 같고, 같은 n 에 from 이 남은 분할본(base-N.json)이 없어야 한다.
 * 문장 가르기 줄에 "supersededBy": [뒤 계획 이름 …] 이 있으면(가른 뒤 그 줄의 글을 다른 바꾸기 계획이 다시 고침) 그 계획들의
 * READING 줄(from → to)을 새 줄들에 입힌 뒤 대어 본다 — 입힐 줄이 하나도 없으면 사슬 끊김으로 어긋남(7-1 d 와 같은 뜻).
 * GRAMMAR 문구 줄의 supersededBy 는 세지 않고 수만 적는다(아직 그런 줄 없음). 센 계획이 0개면 exit 1.
 *
 *   node check-other-plans.cjs
 *   node check-other-plans.cjs --rev 86d9ac9^   일부러 깨기: 적용 전 판에 대면 어긋나야 한다(exit 1)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv;
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const REV = opt("--rev");
const DIR = path.resolve(opt("--plans-dir") || path.join(__dirname, "plans"));
const cache = new Map();
const load = (rel) => {
  if (!cache.has(rel)) {
    let d = null;
    try {
      const raw = REV ? execFileSync("git", ["show", `${REV}:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 27, stdio: ["ignore", "pipe", "ignore"] }) : fs.readFileSync(path.join(REPO, rel), "utf8");
      d = JSON.parse(raw);
    } catch { d = null; }
    cache.set(rel, d);
  }
  return cache.get(rel);
};
const listFiles = (relDir) => {
  if (!REV) return fs.readdirSync(path.join(REPO, relDir));
  return execFileSync("git", ["ls-tree", "--name-only", `${REV}:${relDir}`], { cwd: REPO, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
};
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return null; } };
const isSplit = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && ((Array.isArray(l.ids) && Array.isArray(l.rows)) || (typeof l.id === "string" && Array.isArray(l.en) && Array.isArray(l.ko))));
const isPrompt = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.course === "string" && typeof l.base === "string" && l.n !== undefined && typeof l.from === "string" && typeof l.to === "string" && !l.add);
const files = (fs.existsSync(DIR) ? fs.readdirSync(DIR) : []).filter((f) => f.endsWith(".json") && !/^(marks|progress)-/.test(f)).sort();
const splitPlans = [], promptPlans = [];
for (const f of files) { const a = readJson(path.join(DIR, f)); if (isSplit(a)) splitPlans.push([f, a]); else if (isPrompt(a)) promptPlans.push([f, a]); }
const bad = [];
let splitLines = 0, promptLines = 0, superseded = 0, chained = 0;
const isReplacePlan = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.from === "string" && typeof l.to === "string" && Array.isArray(l.files));
const READING_FILE = /readingSentences\.json$|reading\/pr\d{3}(-1)?\.json$/;
/** 뒤 계획들의 READING 줄을 새 줄들(영어 · 한국어)에 입힘 */
function applySuccessors(rows, names) {
  const out = rows.map((r) => ({ ...r }));
  for (const name of [].concat(names)) {
    const n = String(name).trim().split(/\s/)[0].replace(/\.json$/, "");
    const a = readJson(path.join(DIR, `${n}.json`));
    if (!isReplacePlan(a)) return { problem: `뒤 계획 '${n}' 이 바꾸기 계획이 아니거나 없음` };
    let used = 0;
    for (const l of a) {
      if (!l.files.some((x) => READING_FILE.test(x))) continue;
      let from, to;
      try { from = l.raw ? JSON.parse(`"${l.from}"`) : l.from; to = l.raw ? JSON.parse(`"${l.to}"`) : l.to; } catch { continue; }
      for (const r of out) for (const side of ["en", "ko"]) if (from && r[side].includes(from)) { r[side] = r[side].split(from).join(to); used++; }
    }
    if (!used) return { problem: `뒤 계획 '${n}' 에 이 줄 글을 고친 READING 줄이 없음(사슬 끊김)` };
  }
  return { rows: out };
}

// READING 문장 가르기
for (const [f, plan] of splitPlans) {
  for (const l0 of plan) {
    splitLines++;
    const l = l0.ids ? { ...l0 } : { item: l0.item, ids: [l0.id], rows: [{ en: l0.en[0], ko: l0.ko[0] }, { en: l0.en[1], ko: l0.ko[1] }] };
    if (l0.supersededBy) {
      chained++;
      const e = applySuccessors(l.rows, l0.supersededBy);
      if (e.problem) { bad.push(`${f} #${l.item}: ${e.problem}`); continue; }
      l.rows = e.rows;
    }
    const unit = l.ids[0].match(/^reading-(\d{3})-s\d{3}$/)[1];
    const lesson = `pr${unit}`;
    const copies = [
      [`content/lessons/reading/${lesson}.json`, (d) => d && d.readingSentences],
      [`content/lessons/reading/${lesson}-1.json`, (d) => d && d.readingSentences],
      ["src/lib/readingSentences.json", (d) => d && d[lesson]],
    ];
    for (const [rel, pick] of copies) {
      const arr = pick(load(rel)) || [];
      const k = arr.findIndex((s) => s.english === l.rows[0].en);
      const ok = k >= 0 && l.rows.every((r, i) => arr[k + i] && arr[k + i].english === r.en && arr[k + i].korean === r.ko);
      if (!ok) bad.push(`${f} #${l.item}: ${rel} 에 새 줄 ${l.rows.length}개가 차례대로 없음${k < 0 ? "(첫 줄 영어부터 없음)" : ""}`);
    }
  }
}
// GRAMMAR 한국어 문제 문구
const itemsOf = (d) => (d ? d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items) : []);
for (const [f, plan] of promptPlans) {
  for (const p of plan) {
    if (p.supersededBy) { superseded++; continue; }
    promptLines++;
    const relDir = `content/lessons/${p.course}`;
    const main = itemsOf(load(`${relDir}/${p.base}.json`)).find((i) => String(i.n) === String(p.n));
    if (!main || main.text !== p.to) bad.push(`${f} #${p.item}: ${p.base} #${p.n} 글이 계획과 다름 — 지금 ${JSON.stringify(main && main.text)}`);
    for (const g of listFiles(relDir).filter((x) => new RegExp(`^${p.base}-\\d+\\.json$`).test(x))) {
      const it = itemsOf(load(`${relDir}/${g}`)).find((i) => String(i.n) === String(p.n));
      if (it && it.text === p.from) bad.push(`${f} #${p.item}: 분할본 ${g} #${p.n} 에 옛 문구가 남음`);
    }
  }
}
const planCount = splitPlans.length + promptPlans.length;
console.log(`${REV ? `[${REV} 에 댐] ` : ""}READING 문장 가르기 계획 ${splitPlans.length}개 · ${splitLines}줄(뒤 계획을 입혀 센 줄 ${chained}) · GRAMMAR 문제 문구 계획 ${promptPlans.length}개 · ${promptLines}줄${superseded ? ` · 뒤 계획이 대신한 줄 ${superseded}` : ""} · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 20)) console.log(`  ${b}`);
if (!planCount) { console.log(`계획이 0개(${DIR}) — 센 것 0 (7-1 h). exit 1`); process.exit(1); }
process.exit(bad.length ? 1 : 0);
