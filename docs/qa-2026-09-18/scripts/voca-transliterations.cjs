#!/usr/bin/env node
/**
 * VOCA 끝에 할 일 ① — 뜻풀이가 영어 소리를 한글로 옮긴 것뿐인 항목 (6-0657 '다이어그램' · 6-0957 '미스터리' · 6-1024 '서스펜스').
 * 뜻의 한 조각(쉼표·세미콜론으로 가른 것, 괄호 지움)이 표제어의 소리를 옮긴 한글과 비슷하면 센다.
 * 소리 옮김 판정은 어림이다: 영어 표제어를 로마자 → 한글 자모 규칙 없이, 조각의 한글을 로마자로 거칠게 읽어(자음 골격)
 * 표제어의 자음 골격과 견준다. 그래서 목록은 "사람이 판단할 후보" 이고, 판단(한국어에서 그 말이 표준인가 — 버스 · 피아노)은 사람이 한다.
 *
 *   node voca-transliterations.cjs              후보 목록 · 셈
 *   node voca-transliterations.cjs --only-sole  뜻 전체가 소리 옮김 한 조각뿐인 것만
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const D = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const dir = path.join(REPO, "content/lessons/phonics");
const inLessons = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (L.blocks || []).find((b) => b.type === "wordgrid");
  for (const w of g ? g.rows.flat().filter(Boolean) : []) {
    const k = w.toLowerCase().trim();
    if (!inLessons.has(k)) inLessons.set(k, []);
    inLessons.get(k).push(f.slice(0, -5));
  }
}
// 한글 음절 → 초성·종성 자음의 거친 로마자 골격
const CHO = ["g", "g", "n", "d", "d", "r", "m", "b", "b", "s", "s", "", "j", "j", "ch", "k", "t", "p", "h"];
const JONG = ["", "g", "g", "g", "n", "n", "n", "d", "r", "g", "m", "b", "s", "t", "p", "h", "m", "b", "b", "s", "s", "ng", "j", "ch", "k", "t", "p", "h"];
function hangulSkeleton(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) - 0xac00;
    if (c < 0 || c > 11171) continue;
    out += CHO[Math.floor(c / 588)] + JONG[c % 28];
  }
  return out;
}
// 영어 → 같은 거친 골격 (모음 지움, 비슷한 소리 묶음)
function englishSkeleton(w) {
  return w.toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/ph/g, "p").replace(/th/g, "s").replace(/sh/g, "s").replace(/ch/g, "ch").replace(/ck/g, "k")
    .replace(/qu/g, "k").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/f/g, "p").replace(/v/g, "b")
    .replace(/z/g, "j").replace(/l/g, "r").replace(/w/g, "").replace(/y/g, "").replace(/[aeiou]/g, "")
    .replace(/(.)\1+/g, "$1");
}
const norm = (s) => s.replace(/l/g, "r").replace(/ng/g, "n").replace(/(.)\1+/g, "$1");
function similar(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return false;
  if (a === b) return true;
  // 편집 거리 1 까지 (자음 골격이 4자 이상일 때)
  if (Math.min(a.length, b.length) < 3) return false;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 1) return false;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n] <= 1;
}
const seg = (m) => String(m || "").replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ").split(/[;,/·]|\s+또는\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const onlySole = process.argv.includes("--only-sole");
const rows = [];
for (const [w, v] of Object.entries(D)) {
  const key = w.toLowerCase();
  if (!inLessons.has(key)) continue;
  const es = englishSkeleton(w.replace(/\(.*?\)/g, ""));
  const segs = seg(v.meaning);
  const hits = segs.filter((s) => /^[가-힣 ]+$/.test(s) && similar(hangulSkeleton(s.replace(/\s/g, "")), es));
  if (!hits.length) continue;
  const sole = hits.length === segs.length;
  if (onlySole && !sole) continue;
  rows.push({ w, meaning: v.meaning, hits, sole, lessons: inLessons.get(key) });
}
rows.sort((a, b) => Number(b.sole) - Number(a.sole) || a.w.localeCompare(b.w));
for (const r of rows) console.log(`${r.sole ? "[뜻 전부]" : "[한 조각]"} ${r.w} = ${r.meaning}  ← ${r.hits.join(" · ")}  (${r.lessons.join(" ")})`);
console.log(`\n소리 옮김으로 보이는 조각이 있는 강의 낱말 ${rows.length} · 그중 뜻 전부가 소리 옮김 ${rows.filter((r) => r.sole).length}`);
