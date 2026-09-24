#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 고친 결과(2a80bba → rev)에 '고치다 생긴 흔적' 이 있나 기계로 훑는다(기준 ⑦ · 판정 아님, 후보 목록).
 *   node scan-fix-artifacts.cjs <list-changes.cjs --base 2a80bba --head <rev> --out 로 만든 목록> [--rev main]
 * 보는 것(바뀜 · 새로 생김 글마다):
 *   설명문 새어 듦 — '모범(text)' · 'alternatives:' · '고칠 곳/글' · '(그리고 ' · ①② · '→' · '.json' · '.blocks[' · '분할본' · '새 항목' 같은 판정표 말
 *   겹친 낱말(영어 · 한글) · 두 칸 띄움 · 앞뒤 공백 · 빈 글 · 따옴표 · 괄호 짝
 *   GRAMMAR: 문항마다 다른 정답에 같은 글이 두 번 · 모범과 같은 다른 정답 · 영어 칸에 한글 / 한국어 칸에 한글 없음
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const listFile = process.argv[2];
const REV = process.argv.includes("--rev") ? process.argv[process.argv.indexOf("--rev") + 1] : "main";
const recs = fs.readFileSync(listFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const hits = {};
const add = (k, r, note) => { (hits[k] = hits[k] || []).push({ id: r.id, file: r.file.replace(/^content\//, ""), path: r.path, text: String(r.after).slice(0, 140), note }); };
const LEAK = /모범\s*\(text\)|alternatives\s*:|고칠 (곳|글)|\(그리고 |[①②③④⑤⑥]|→|\.json\b|\.blocks\[|분할본|새 항목|대체 답안|다른 정답|지금 있는|sentences 블록/;
const OK_DOUBLE_EN = new Set(["had had", "that that", "is is", "very very", "bye bye", "so so", "no no", "knock knock", "blah blah", "far far", "go go", "yeah yeah", "cha cha", "tut tut"]);
for (const r of recs) {
  if (r.after == null || !String(r.file).startsWith("content/")) continue;
  const t = String(r.after);
  if (!t.trim()) { add("빈 글", r); continue; }
  if (LEAK.test(t)) add("판정표 말이 새어 듦", r);
  const d = t.match(/\b([A-Za-z']+)\s+\1\b/i);
  if (d && !OK_DOUBLE_EN.has(`${d[1]} ${d[1]}`.toLowerCase())) add("겹친 영어 낱말", r, d[0]);
  const k = t.match(/(^|\s)([가-힣]{2,})\s+\2(?=\s|$|[.,!?])/);
  if (k) add("겹친 한글 낱말", r, k[0].trim());
  if (/ {2,}/.test(t)) add("두 칸 띄움", r);
  if (t !== t.trim()) add("앞뒤 공백", r);
  if ((t.match(/"/g) || []).length % 2) add("따옴표 짝 안 맞음(\")", r);
  if ((t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length) add("괄호 짝 안 맞음", r);
}
// GRAMMAR 문항 구조 — 바뀐 GRAMMAR 파일 전부
const gfiles = [...new Set(recs.map((r) => r.file).filter((f) => /lessons\/grammar[12]\//.test(f)))];
const texts = L.catFiles(gfiles.map((f) => `${REV}:${f}`));
gfiles.forEach((f, i) => {
  if (!texts[i]) return;
  const d = JSON.parse(texts[i]);
  for (const b of d.blocks || []) if (b.type === "sentences") for (const it of b.items || []) {
    const r = { id: `${path.basename(f, ".json")}#${it.n}`, file: f, path: `n=${it.n}`, after: it.text };
    const alts = (it.alternatives || []).map((a) => L.clean(a));
    const ko = /[가-힣]/.test(it.text);
    if (alts.length && new Set(alts).size !== alts.length) add("다른 정답에 같은 글 두 번", r, alts.find((a, j) => alts.indexOf(a) !== j));
    if (alts.includes(L.clean(it.text))) add("모범과 같은 다른 정답", r);
    if (!ko && alts.some((a) => /[가-힣]/.test(a))) add("영어 다른 정답에 한글", r, alts.find((a) => /[가-힣]/.test(a)));
    if (ko && alts.length) add("한국어 문항에 다른 정답", r, alts[0]);
  }
});
const summary = Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length]));
console.log(`고친 글 조각 ${recs.length} · GRAMMAR 파일 ${gfiles.length} 훑음 → ${JSON.stringify(summary)}`);
for (const [k, v] of Object.entries(hits)) { console.log(`== ${k} (${v.length})`); for (const x of v.slice(0, 12)) console.log(`  ${x.file} ${x.path} | ${x.text}${x.note ? ` | ${x.note}` : ""}`); }
