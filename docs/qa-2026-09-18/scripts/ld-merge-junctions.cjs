#!/usr/bin/env node
/**
 * 6단계에서 넘친 힌트 줄을 첫 hints 블록에 합친 자리(ld-merge-overflow-hints.cjs 의 "이음매")를 모두 나열한다 — 3차 점검 #4 N2.
 * 합칠 때 앞 글이 . , 로 끝나지 않았으면 앞 줄의 마지막 항목과 뒤 줄의 첫 항목이 한 칩으로 붙는다.
 * 이음매마다 보여 주는 것:
 *   - 지금 글에서 그 자리가 앱의 칩 나누기(lib/expectations.cjs hintChunks = 앱과 같은 규칙)로 갈라지는지
 *   - 대본에 두 낱말이 바로 이어져 나오는지 (이어지면 한 구절이 줄에서 끊긴 것일 가능성이 큼 — 붙은 채로 둠)
 * 판단은 사람이 한다 — 이 도구는 파일을 고치지 않는다.
 * 합치기 전 판(8941bab — 6단계 커밋 86d9ac9 바로 전)의 hints + 넘친 줄로 이음매를 되살리고, 낱말 LCS 로 지금 글의 자리를 찾는다(합친 뒤 다른 계획이
 * 힌트 낱말을 고쳤어도 따라감 — 예: "eighteen" → "18").
 * 덧붙여, N1(천 단위 쉼표에서 안 자름) 뒤 "10,000 measure" 처럼 쉼표 숫자와 다음 낱말이 한 칩에 붙은 곳도 나열한다.
 *
 *   node ld-merge-junctions.cjs            목록 + 합계
 *   node ld-merge-junctions.cjs --joined   아직 붙은 이음매만
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DIR = "content/lessons/ld";
const JOINED_ONLY = process.argv.includes("--joined");
const strip = (s) => String(s).replace(/^﻿/, "");
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
// 합치기 전 판 = 6단계 합치기(86d9ac9)가 들어가기 바로 전 8941bab 로 고정 — 전에는 `HEAD:` 였는데 86d9ac9 가 커밋된 뒤로는 HEAD 가
// 합친 판이라 '이음매 0' 만 냈다(2026-09-24, prove-license-token-v2 의 같은 문제를 따라 형제를 봄).
const PRE_MERGE_REV = "8941bab";
const head = (f) => { try { return JSON.parse(strip(execFileSync("git", ["show", `${PRE_MERGE_REV}:${DIR}/${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }))); } catch { return null; } };
const isGuide = (t) => /받아쓰기/.test(t);
const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9]/g, "");
const tokens = (t) => [...t.matchAll(/\S+/g)].map((m) => ({ w: m[0], n: norm(m[0]), s: m.index, e: m.index + m[0].length }));
// = hintChunks 의 나누기 — 관문 15(C06113)부터 칭호 · 한 글자 머리글자 뒤 마침표에서는 안 자르고 칩 끝의 그 마침표는 남김(lib/expectations.cjs · 앱과 같음)
const SPLIT = /,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/g;
const chunkAt = (text, pos) => { let k = 0; for (const m of text.matchAll(SPLIT)) if (m.index < pos) k++; return k; };
const chunkText = (text, k) => (text.split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)[k] || "").trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim();
function lcsMap(a, b) { // a[i] → b[j] (정규화 낱말이 같고 비지 않은 것끼리)
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].n && a[i].n === b[j].n ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const map = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i].n && a[i].n === b[j].n) { map[i] = j; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return map;
}

let lessons = 0, junctions = 0, glued = 0, nowSplit = 0, nowJoined = 0, lost = 0;
const lines = [], numberJoins = [];
for (const f of fs.readdirSync(path.join(REPO, DIR)).filter((x) => /^d\d{3}\.json$/.test(x)).sort()) {
  const id = f.slice(0, 4);
  const cur = JSON.parse(strip(fs.readFileSync(path.join(REPO, DIR, f), "utf8")));
  const curText = String(((cur.blocks || []).find((b) => b.type === "hints") || {}).text || "");
  const script = " " + (S[id] || []).map((r) => r.en).join(" ").split(/\s+/).map(norm).filter(Boolean).join(" ") + " ";
  const ct = tokens(curText);
  // N1 뒤 쉼표 숫자 + 다음 낱말이 한 칩
  for (const m of curText.matchAll(/(?<![\d,])\d{1,3}(?:,\d{3})+(?!\d)/g)) {
    const i = ct.findIndex((t) => t.s <= m.index && m.index < t.e);
    if (i < 0 || i + 1 >= ct.length) continue;
    if (chunkAt(curText, ct[i].s) !== chunkAt(curText, ct[i + 1].s)) continue;
    const adj = script.includes(` ${ct[i].n} ${ct[i + 1].n} `);
    numberJoins.push(`${id}  「${ct[i].w} ${ct[i + 1].w}」 대본에 이어짐 ${adj ? "예" : "아니오"} · 칩 「${chunkText(curText, chunkAt(curText, ct[i].s))}」`);
  }
  const a = head(f);
  if (!a) continue;
  const blocks = a.blocks || [];
  const h = blocks.findIndex((b) => b.type === "hints");
  if (h < 0) continue;
  const over = [];
  for (let i = h + 1; i < blocks.length && blocks[i].type === "instruction" && !isGuide(blocks[i].text || ""); i++) over.push(blocks[i]);
  if (!over.length) continue;
  lessons++;
  const parts = [String(blocks[h].text).trim(), ...over.map((b) => String(b.text).trim())];
  const merged = parts.join(" ");
  const mt = tokens(merged);
  const map = lcsMap(mt, ct);
  let pos = 0;
  for (let p = 0; p < parts.length - 1; p++) {
    pos += parts[p].length;
    junctions++;
    const end = pos; pos += 1;
    if (/[.,]$/.test(parts[p])) continue; // 앞 글이 . , 로 끝남 → 합칠 때부터 갈라짐
    glued++;
    const li = mt.findLastIndex((t) => t.e <= end), ri = li + 1;
    let jl = map[li], jr = map[ri];
    if (jl < 0 && jr >= 0) jl = jr - 1;
    if (jr < 0 && jl >= 0) jr = jl + 1;
    if (jl < 0 || jr < 0 || jr >= ct.length) { lost++; lines.push(`${id}  「${mt[li].w}」+「${mt[ri].w}」  지금 글에서 자리를 못 찾음`); continue; }
    const split = chunkAt(curText, ct[jl].s) !== chunkAt(curText, ct[jr].s);
    if (split) nowSplit++; else nowJoined++;
    if (JOINED_ONLY && split) continue;
    const adj = script.includes(` ${ct[jl].n} ${ct[jr].n} `);
    const tailL = ct.slice(Math.max(0, jl - 3), jl + 1).map((t) => t.w).join(" ");
    const headR = ct.slice(jr, jr + 3).map((t) => t.w).join(" ");
    lines.push(`${id}  「…${tailL}」‖「${headR}…」  ${split ? "갈라짐" : "붙음"} · 대본에 이어짐 ${adj ? "예" : "아니오"}${split ? "" : ` · 칩 「${chunkText(curText, chunkAt(curText, ct[jl].s))}」`}`);
  }
}
console.log(lines.join("\n"));
console.log(`\nN1 뒤 쉼표 숫자와 다음 낱말이 한 칩인 곳 ${numberJoins.length}:\n${numberJoins.join("\n")}`);
console.log(`\n넘친 줄을 합친 LISTENING 본 페이지 ${lessons} · 이음매 ${junctions} · 앞 글이 . , 로 끝나지 않은 이음매 ${glued}` +
  ` → 지금 갈라짐 ${nowSplit} · 아직 붙음 ${nowJoined}${lost ? ` · 자리 못 찾음 ${lost}` : ""}`);
