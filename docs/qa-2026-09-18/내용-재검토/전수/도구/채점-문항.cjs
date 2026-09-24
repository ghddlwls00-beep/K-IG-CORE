#!/usr/bin/env node
/**
 * 결정 A(소유자 2026-09-24 "1,2,3 다 해") — 문법 '맞는 영작인데 0점 · 70점' 전부 재기: 문항 목록 · 읽을거리 만들기. 읽기만(내용 파일을 쓰지 않음).
 *  - 문항 = 화면이 채점하는 한 칸: 앱과 같은 짝(expectations pairOf) · 같은 줄 맞추기(render.cjs grammarPair = GrammarLearningView 168~226)
 *    · 같은 참조([정답, ...다른 정답] 을 앱의 cleanText 뒤 — GrammarLearningView 60 · 222 · 474).
 *  - 같은 묶음(강의) · 같은 번호 · 같은 한국어 · 같은 참조면 한 문항(쪽 여럿 — 본 쪽 · 나눈 쪽). 참조가 쪽마다 다르면 문항을 나누고 '쪽마다 참조가 다름' 으로 표시.
 *  - 고칠 곳 = 영어 쪽 파일 · 블록 · 칸 번호(n) — 그 문항이 나오는 파일 전부.
 *   node 채점-문항.cjs [--rev <판>] [문항수]   → 전수/채점/문항.json · 전수/채점/읽을거리/NN.md(약 90문항씩, 묶음을 쪼개지 않음)
 *   --rev: 글을 읽을 판(기본 = 도구의 지금 판 2a80bba). 3차 점검 요청(21:2x): 수정 세션 가지 gate15-fix 의 다른 정답을 반영한 판으로 재야 중복이 안 생김.
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const E = L.loadExpectations();
const Rn = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/render.cjs"));
const OUT = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/채점");
const argv = process.argv.slice(2);
const ri = argv.indexOf("--rev");
const REV = ri >= 0 ? String(L.git(["rev-parse", argv[ri + 1]])).trim() : L.HEAD;
if (ri >= 0) argv.splice(ri, 2);
const PER = Number(argv[0] || 90);
const cleanText = (t) => (t ? String(t).replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
const hasKo = (t) => /[가-힣]/.test(String(t || ""));
const num = (s) => { const m = String(s).match(/^gh[12]-(\d+)/); return m ? parseInt(m[1], 10) : 0; };
const groupOf = (c, id) => { const n = num(id); return c === "grammar1" ? `grammar1/gh1-${String(n % 2 === 1 ? n - 1 : n).padStart(3, "0")}` : `grammar2/gh2-${String(n).padStart(3, "0")}`; };
const itemsOf = (d) => (d && Array.isArray(d.blocks) ? d.blocks : []).flatMap((b, bi) => (b.type === "sentences" ? (b.items || []).map((it, ii) => ({ it, bi, ii })) : []));

// 그 판의 강의 파일을 한 번에(git cat-file --batch). lib.cjs jsonAt 은 두 판(9d6e15d · 2a80bba)만 읽어 다른 판이면 조용히 undefined — 쓰지 않음.
const FILES = new Map();
{
  const specs = [];
  for (const c of ["grammar1", "grammar2"]) for (const p of E.pages(c).map((x) => x.id)) for (const id of [p, E.pairOf(c, p)].filter(Boolean)) specs.push(`${REV}:content/lessons/${c}/${id}.json`);
  const uniq = [...new Set(specs)];
  L.catFiles(uniq).forEach((txt, i) => FILES.set(uniq[i], txt == null ? null : JSON.parse(txt)));
  const missing = uniq.filter((k) => FILES.get(k) == null);
  if (missing.length) { console.error(`판 ${REV} 에 없는 강의 파일 ${missing.length}: ${missing.slice(0, 5).join(" ")}`); process.exit(1); }
}
const lessonAt = (c, id) => FILES.get(`${REV}:content/lessons/${c}/${id}.json`) || null;
const items = new Map(); // key → { id, group, label, ko, refs, pages:Set, where:Set }
const titles = {};
for (const c of ["grammar1", "grammar2"]) {
  for (const p of E.pages(c).map((x) => x.id)) {
    const g = groupOf(c, p);
    const pair = E.pairOf(c, p);
    const m = lessonAt(c, p), q = pair ? lessonAt(c, pair) : null;
    if (!m) continue;
    if (!titles[g]) { const pres = Rn.curriculum.formatLessonPresentation(c, m); titles[g] = `${pres.title || ""}${pres.subtitle ? ` — ${pres.subtitle}` : ""}`; }
    const mi = itemsOf(m), qi = itemsOf(q);
    for (let i = 0; i < Math.max(mi.length, qi.length); i++) {
      const a = mi[i], b = qi[i];
      const aKo = a && hasKo(a.it.text);
      const [ko, en, enFile] = aKo ? [a, b, pair] : [b, a, p];
      if (!en || !ko) continue;
      const label = String((a && a.it.n) || (b && b.it.n) || i + 1);
      const refs = [en.it.text, ...(en.it.alternatives || [])].map(cleanText).filter(Boolean);
      const koText = cleanText(ko.it.text);
      const key = `${g}#${label}|${koText}|${JSON.stringify(refs)}`;
      if (!items.has(key)) items.set(key, { group: g, course: c, label, ko: koText, refs, pages: new Set(), where: new Set() });
      const x = items.get(key);
      x.pages.add(p);
      x.where.add(`${enFile}.json .blocks[${en.bi}].items[${en.ii}] (n=${en.it.n})`);
    }
  }
}
// 같은 묶음 · 번호인데 참조(또는 한국어)가 쪽마다 다른 문항
const byLabel = new Map();
for (const x of items.values()) { const k = `${x.group}#${x.label}`; if (!byLabel.has(k)) byLabel.set(k, []); byLabel.get(k).push(x); }
const list = [];
for (const [k, xs] of byLabel) xs.forEach((x, i) => list.push({ id: xs.length > 1 ? `${k}~${i + 1}` : k, group: x.group, course: x.course, label: x.label, ko: x.ko, refs: x.refs, pages: [...x.pages].sort(), where: [...x.where].sort(), split: xs.length > 1 }));
if (!list.length) { console.error("문항 0 — 판이나 파일 읽기가 틀림(조용히 빈 목록을 만들지 않음)"); process.exit(1); }
const order = (g) => { const m = /gh([12])-(\d+)/.exec(g); return (m[1] === "1" ? 0 : 1000) + parseInt(m[2], 10); };
list.sort((a, b) => order(a.group) - order(b.group) || (parseInt(a.label, 10) || 0) - (parseInt(b.label, 10) || 0) || a.id.localeCompare(b.id));
// 읽을거리 — 묶음을 쪼개지 않고 PER 문항 안팎
fs.mkdirSync(path.join(OUT, "읽을거리"), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, "읽을거리"))) fs.rmSync(path.join(OUT, "읽을거리", f), { force: true });
const groups = [...new Set(list.map((x) => x.group))];
const files = [];
let cur = [], n = 0;
for (const g of groups) {
  const gi = list.filter((x) => x.group === g);
  if (cur.length && n + gi.length > PER * 1.25) { files.push(cur); cur = []; n = 0; }
  cur.push(g); n += gi.length;
  if (n >= PER) { files.push(cur); cur = []; n = 0; }
}
if (cur.length) files.push(cur);
const q = (s) => JSON.stringify(s);
const packets = {};
files.forEach((gs, i) => {
  const name = `${String(i + 1).padStart(2, "0")}.md`;
  const its = list.filter((x) => gs.includes(x.group));
  const lines = [`# 채점 전수 읽을거리 ${name} — 묶음 ${gs.length} · 문항 ${its.length}`, ""];
  for (const g of gs) {
    lines.push(`## ▣ ${g} — ${titles[g] || ""}`);
    for (const x of its.filter((y) => y.group === g)) lines.push(`- ${x.id} · KO ${q(x.ko)} · 정답 ${q(x.refs[0])}${x.refs.length > 1 ? ` · 다른 정답 ${x.refs.slice(1).map(q).join(" / ")}` : ""}${x.split ? " · ⚠ 쪽마다 참조가 다름(쪽 " + x.pages.join(" ") + ")" : ""}`);
    lines.push("");
  }
  fs.writeFileSync(path.join(OUT, "읽을거리", name), lines.join("\n"));
  packets[name] = its.map((x) => x.id);
});
fs.writeFileSync(path.join(OUT, "문항.json"), JSON.stringify({ 만든때: "2026-09-24", 판: REV, 문항: list, 읽을거리: packets }, null, 1));
console.log(`판 ${REV}`);
const split = list.filter((x) => x.split);
console.log(JSON.stringify({ 문항: list.length, 문법I: list.filter((x) => x.course === "grammar1").length, 문법II: list.filter((x) => x.course === "grammar2").length, 묶음: groups.length, 쪽마다참조다름: split.length, 파일: files.length, 파일마다: Object.values(packets).map((v) => v.length).join(",") }, null, 1));
if (split.length) console.log("쪽마다 참조가 다른 문항:", split.slice(0, 20).map((x) => x.id).join(" "));
