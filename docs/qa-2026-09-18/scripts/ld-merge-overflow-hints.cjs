#!/usr/bin/env node
/**
 * LISTENING 본 페이지(dNNN.json)의 힌트 줄이 옛 페이지를 옮길 때 두 줄 이상으로 갈라져, 첫 줄만 "hints" 블록이고
 * 나머지 줄은 "instruction" 블록으로 들어간 강의를 찾아 **첫 hints 블록 하나로 합친다**.
 * 앱의 힌트 칩은 첫 hints 블록만 쓴다(LdLearningView.tsx:59) — 넘친 줄의 낱말·숫자는 칩에 한 번도 뜨지 않았다.
 * (지적: 6-0012 · 6-0018 · 6-0040 · 6-0138 · 6-0225 · 6-0240 · 6-0279 · 6-0330 · 6-0339 · 6-0415 · 6-0471 …)
 *
 * 넘친 줄 = hints 블록 바로 뒤에 이어지는 instruction 블록들(받아쓰기 안내문 "…받아쓰기를…" 은 아님).
 * 합치는 법: hints 글 + " " + 넘친 줄들을 " " 로 — 옛 페이지에서 줄이 바뀐 자리가 한 구절의 가운데일 수 있어서
 * (d023 "…can break" / "Morton's alibi") 마침표를 새로 넣지 않는다.
 * 파일은 글자 그대로 고친다(hints 의 text 값만 바꾸고 넘친 블록을 들어냄) — 다시 읽어 기대한 모양과 같은지 확인.
 *
 *   node ld-merge-overflow-hints.cjs            미리보기(강의 · 합친 힌트)
 *   node ld-merge-overflow-hints.cjs --apply    씀
 *   node ld-merge-overflow-hints.cjs --check    넘친 줄이 남은 강의 수만 셈 (0 이 아니면 exit 1)
 *   node ld-merge-overflow-hints.cjs --check --rev f35e8be   일부러 깨기: 합치기 전 판으로 세면 104 가 나와야 한다('--rev HEAD' 는 합친 것이 커밋된 뒤 가짜, 7-1 n)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const ri = process.argv.indexOf("--rev");
const REV = ri > 0 ? process.argv[ri + 1] : null;
if (REV && APPLY) throw new Error("--rev 는 --check 와만");
const readLesson = (f) => (REV
  ? execFileSync("git", ["show", `${REV}:content/lessons/ld/${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(path.join(DIR, f), "utf8"));
const esc = (s) => JSON.stringify(s).slice(1, -1);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isGuide = (t) => /받아쓰기/.test(t);

const rows = [];
for (const f of fs.readdirSync(DIR).filter((f) => /^d\d{3}\.json$/.test(f)).sort()) {
  const raw = readLesson(f);
  const L = JSON.parse(raw.replace(/^﻿/, ""));
  const blocks = L.blocks || [];
  const h = blocks.findIndex((b) => b.type === "hints");
  if (h < 0) continue;
  const over = [];
  for (let i = h + 1; i < blocks.length && blocks[i].type === "instruction" && !isGuide(blocks[i].text || ""); i++) over.push(blocks[i]);
  if (over.length === 0) continue;
  const merged = [blocks[h].text.trim(), ...over.map((b) => String(b.text).trim())].join(" ");
  rows.push({ f, raw, L, h, over, merged });
}

if (CHECK) {
  console.log(`${REV ? `[${REV} 기준] ` : ""}넘친 힌트 줄이 남은 LISTENING 본 페이지: ${rows.length}`);
  for (const r of rows.slice(0, 10)) console.log(`  ${r.f}: ${r.over.map((b) => JSON.stringify(b.text)).join(" + ")}`);
  process.exit(rows.length ? 1 : 0);
}

let blocksOut = 0;
for (const r of rows) {
  console.log(`${r.f}  +${r.over.length}줄 → ${r.merged}`);
  if (!APPLY) continue;
  let raw = r.raw;
  const oldHint = `"text": "${esc(r.L.blocks[r.h].text)}"`;
  if (raw.split(oldHint).length - 1 !== 1) throw new Error(`${r.f}: hints text 가 한 번이 아님`);
  raw = raw.replace(oldHint, () => `"text": "${esc(r.merged)}"`);
  for (const b of r.over) {
    const re = new RegExp(`,\\s*\\{\\s*"type":\\s*"instruction",\\s*"text":\\s*"${reEsc(esc(b.text))}"\\s*\\}`);
    if (!re.test(raw)) throw new Error(`${r.f}: 넘친 블록을 글자에서 못 찾음 ${JSON.stringify(b.text)}`);
    raw = raw.replace(re, "");
    blocksOut++;
  }
  // 다시 읽어 기대한 모양과 같은지: blocks 에서 넘친 블록만 빠지고 hints 글만 바뀌었나
  const want = JSON.parse(JSON.stringify(r.L));
  want.blocks[r.h].text = r.merged;
  want.blocks.splice(r.h + 1, r.over.length);
  const got = JSON.parse(raw.replace(/^﻿/, ""));
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${r.f}: 고친 뒤 모양이 기대와 다름 — 쓰지 않음`);
  fs.writeFileSync(path.join(DIR, r.f), raw);
}
console.log(`\n강의 ${rows.length} · 넘친 블록 ${rows.reduce((n, r) => n + r.over.length, 0)}${APPLY ? ` — 씀 (들어낸 블록 ${blocksOut})` : " (미리보기 — --apply 로 씀)"}`);
