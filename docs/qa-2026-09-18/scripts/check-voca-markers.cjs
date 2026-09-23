#!/usr/bin/env node
/**
 * VOCA 사전 뜻풀이의 사용역 표시가 기준 2 의 네 가지(`(옛)` · `(모욕적)` · `(옛·모욕적)` · `(구어·낮춤)`)뿐인지 — 6단계 기준 11.
 * 괄호 속에 옛 · 모욕 · 구어 · 낮춤 · 문어 · 속어 · 비속 · 비하 · 격식 이 들어 있는데 네 가지가 아니면 '밖' 으로 센다. 밖이 0 이 아니면 exit 1.
 * (뜻 뒤에 붙은 표시도 센다 — 기준 11 은 '뜻 앞에' 를 요구하므로, 표시 바로 앞이 뜻 글자면 '자리 틀림' 으로 따로 셈)
 *
 *   node check-voca-markers.cjs              지금 사전
 *   node check-voca-markers.cjs --rev f35e8be   일부러 깨기: 6단계 전 판 → dumb '(구어)'(뜻 뒤) · gay '(옛 뜻)' 이 걸려야 함
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ri = process.argv.indexOf("--rev");
const REV = ri > 0 ? process.argv[ri + 1] : null;
const raw = REV
  ? execFileSync("git", ["show", `${REV}:content/voca_dictionary.json`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8");
const D = JSON.parse(raw.replace(/^﻿/, ""));
const ALLOWED = new Set(["(옛)", "(모욕적)", "(옛·모욕적)", "(구어·낮춤)"]);
const REGISTER = /옛|모욕|구어|낮춤|문어|속어|비속|비하|격식/;
let inside = 0;
const outside = [], misplaced = [];
for (const [w, v] of Object.entries(D)) {
  const m = String((v && v.meaning) || "");
  for (const x of m.matchAll(/\([^)]*\)/g)) {
    const p = x[0];
    if (!REGISTER.test(p)) continue;
    if (!ALLOWED.has(p)) { outside.push(`${w} ${p} — ${m}`); continue; }
    inside++;
    const before = m.slice(0, x.index).trim();
    if (before && !/[;,]$/.test(before)) misplaced.push(`${w} ${p} — ${m}`); // 표시가 뜻 뒤에 붙음
  }
}
console.log(`${REV ? `[${REV} 기준] ` : ""}VOCA 사전 ${Object.keys(D).length}항목 · 사용역 표시: 기준 2 안 ${inside} · 밖 ${outside.length} · 뜻 뒤에 붙은 것 ${misplaced.length}`);
for (const s of outside) console.log(`  밖: ${s}`);
for (const s of misplaced) console.log(`  자리: ${s}`);
process.exit(outside.length || misplaced.length ? 1 : 0);
