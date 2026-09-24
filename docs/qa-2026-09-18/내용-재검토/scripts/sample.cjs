#!/usr/bin/env node
/**
 * 학습 내용 재검토 2 — 안 바뀐 강의 표본: 과정마다 쪽(주소)의 5%(최소 6쪽)를 고정 씨앗으로 뽑아
 * 그 쪽에서 학습자가 보고 듣는 글 전부를 번호(T01…)를 붙여 읽을거리로 만든다.
 *   STUDENT 82 → 6 · VOCA 195 → 10 · GRAMMAR I 194 → 10 · GRAMMAR II 88 → 6 · LISTENING 276강 → 14강(본 · 대본 28쪽) · READING 256강 → 13강 26쪽
 * 씨앗 20260924 하나로 과정 차례(student · phonics · grammar1 · grammar2 · ld · reading)대로 뽑는다(피셔-예이츠).
 * 글 하나가 9/18 뒤 바뀐 줄(목록.jsonl 의 닿는 줄)과 같으면 '바뀜 ◆id' 로 표시 — 찾은 틀림을 '바뀐 글' / '안 바뀐 글' 로 가를 때 씀.
 *   node sample.cjs     → 표본.json · 읽을거리/표본-<조각>/<쪽>.md
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const Rn = require("./render.cjs");
const E = Rn.E;
const q = Rn.q;
const SEED = 20260924;

const recs = L.readJsonl(path.join(L.DIR, "목록.jsonl"));
const cls = require(path.join(L.DIR, "분류.json"));
const reached = recs.filter((r) => cls[r.id].닿음 && r.after != null);
// 묶음 → (지금 글 → id들)
const changedByGroup = new Map();
for (const r of reached) {
  const g = cls[r.id].묶음;
  if (!changedByGroup.has(g)) changedByGroup.set(g, new Map());
  const k = L.clean(r.after);
  const m = changedByGroup.get(g);
  if (!m.has(k)) m.set(k, []);
  m.get(k).push(r.id);
}
const dictChanged = new Map(reached.filter((r) => r.file === "content/voca_dictionary.json" && /\.meaning$/.test(r.path)).map((r) => [r.path.replace(/^\.|\.meaning$/g, ""), r.id]));

const rnd = L.rng(SEED);
function pick(list, n) {
  const a = [...list];
  for (let i = 0; i < n; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n).sort();
}
const pages = (c) => E.pages(c).map((p) => p.id);
const lessonsOf = (c) => [...new Set(pages(c).map((id) => id.replace(/-1$/, "")))];
const plan = [
  ["student", "page", 6], ["phonics", "page", 10], ["grammar1", "page", 10], ["grammar2", "page", 6], ["ld", "lesson", 14], ["reading", "lesson", 13],
];
const picked = {};
const frames = {};
for (const [c, unit, n] of plan) {
  const frame = unit === "page" ? pages(c) : lessonsOf(c);
  frames[c] = { 단위: unit === "page" ? "쪽" : "강", 수: frame.length };
  const got = pick(frame, n);
  picked[c] = unit === "page" ? got : got.flatMap((id) => [id, `${id}-1`]).filter((id) => pages(c).includes(id));
}

const num = (s) => { const m = String(s).match(/^(?:gh[12]-|d|pr|hv-|mv\d-)?(\d+)/); return m ? parseInt(m[1], 10) : 0; };
function chunkOf(c, id) {
  if (c === "student") return "student";
  if (c === "phonics") return "voca";
  if (c === "grammar1") { const n = num(id); const b = n % 2 === 1 ? n - 1 : n; return b <= 62 ? "grammar1-a" : "grammar1-b"; }
  if (c === "grammar2") return "grammar2";
  if (c === "ld") return num(id) <= 138 ? "ld-a" : "ld-b";
  return num(id) <= 128 ? "reading-a" : "reading-b";
}
function groupOf(c, id) {
  if (c === "student") return `student/${id}`;
  if (c === "grammar1") { const n = num(id); const b = n % 2 === 1 ? n - 1 : n; return `grammar1/gh1-${String(b).padStart(3, "0")}`; }
  if (c === "grammar2") return `grammar2/gh2-${String(num(id)).padStart(3, "0")}`;
  if (c === "ld") return `ld/d${String(num(id)).padStart(3, "0")}`;
  if (c === "reading") return `reading/pr${String(num(id)).padStart(3, "0")}`;
  return null;
}

/** 쪽 하나의 글 단위 */
function unitsOf(c, id) {
  const U = [];
  const g = groupOf(c, id);
  const ch = g ? changedByGroup.get(g) : null;
  const mark = (t) => { if (!ch || t == null) return ""; const ids = ch.get(L.clean(t)) || ch.get(L.clean(L.cleanItemText(t))); return ids ? `  〔9/18 뒤 바뀜 ${ids.map((x) => `◆${x}`).join(" ")}〕` : ""; };
  const add = (kind, text, extra = "") => U.push({ kind, text, line: `${q(text)}${extra}${mark(text)}` });
  if (c === "student") {
    const s = Rn.student(L.HEAD, id);
    add("제목(h1)", s.h1); add("제목줄(h2)", s.instruction);
    s.rows.forEach((r) => { if (r.en != null) add(`EN #${r.n}`, r.en, r.spoken !== r.en ? `  (소리: ${q(r.spoken)})` : ""); if (r.ko != null) add("KO", r.ko); });
  } else if (c === "phonics") {
    for (const w of Rn.vocaLesson(L.HEAD, id)) {
      add("낱말", w.word, w.spoken !== w.word ? `  (소리: ${q(w.spoken)})` : "");
      const changed = w.key && dictChanged.get(w.key);
      U.push({ kind: "뜻", text: w.meaning, line: `${q(w.meaning)}${changed ? `  〔9/18 뒤 바뀜 ◆${changed}〕` : ""}` });
      if (w.collocation) add("연어", `${w.collocation.phrase} — ${w.collocation.translation} · ${w.collocation.exampleSentence} — ${w.collocation.sentenceTranslation}`);
      if (w.etymology) add("어원", w.etymology.explanation);
    }
  } else if (c === "grammar1" || c === "grammar2") {
    const pair = E.pairOf(c, id);
    const p = Rn.grammarPair(L.HEAD, c, id, pair);
    for (const r of p.rows) {
      add(`KO [번호 ${r.label}]`, r.ko);
      add(`EN [번호 ${r.label}]`, r.en, r.alts.length ? `  · 다른 정답: ${r.alts.map(q).join(" / ")}` : "");
      for (const a of r.alts) { const m = mark(a); if (m) U[U.length - 1].line += ` (다른 정답 ${q(a)}${m})`; }
    }
    if (p.ruleSummary.length) add("문법 확인 요약", p.ruleSummary.join(" / "));
  } else if (c === "ld") {
    const base = id.replace(/-1$/, "");
    const now = Rn.ldLesson(L.HEAD, base), old = Rn.ldLesson(L.BASE, base);
    const oldChips = new Map(old.rows.map((r) => [String(r.n), JSON.stringify(r.chips)]));
    if (/-1$/.test(id)) for (const r of now.rows) { add(`KO n${r.n}`, r.ko); add(`EN n${r.n}`, r.en); }
    else for (const r of now.rows) {
      add(`EN(받아쓰기 정답) n${r.n}`, r.en);
      if (r.chips.length) U.push({ kind: `칩 n${r.n}`, text: r.chips.join(" | "), line: `${r.chips.map((x) => `[${x}]`).join(" ")}${oldChips.get(String(r.n)) !== JSON.stringify(r.chips) ? "  〔9/18 뒤 바뀜 — 힌트 줄〕" : ""}` });
    }
  } else if (c === "reading") {
    const x = Rn.readingLesson(L.HEAD, id);
    for (const s of x.sentences) { add(`EN ${s.id.replace(/^reading-\d+-/, "")}`, s.en); add(`KO ${s.id.replace(/^reading-\d+-/, "")}`, s.ko); }
    for (const cd of x.cards) {
      const text = `${cd.word} (${cd.pos})${cd.lemma ? ` ← ${cd.lemma}` : ""} : ${cd.ko}`;
      const m = mark(cd.ko) || mark(cd.word);
      U.push({ kind: "카드", text, line: `${q(text)}${cd.spoken !== cd.word ? `  (소리: ${q(cd.spoken)})` : ""}${m}` });
    }
  }
  return U.filter((u) => u.text != null && String(u.text).trim());
}

const out = { 씨앗: SEED, 틀: frames, 뽑음: picked, 쪽: {} };
const OUT = path.join(L.DIR, "읽을거리");
for (const [c] of plan) {
  for (const id of picked[c]) {
    const units = unitsOf(c, id);
    const chunk = chunkOf(c, id);
    const url = c === "phonics" ? `/phonics/${id}` : `/${c}/${id}`;
    out.쪽[url] = { 과정: c, 조각: chunk, 글수: units.length, 바뀐글: units.filter((u) => /9\/18 뒤 바뀜/.test(u.line)).length };
    const dir = path.join(OUT, `표본-${chunk}`);
    fs.mkdirSync(dir, { recursive: true });
    const lines = [`# 표본 쪽 ${url} — 글 ${units.length} (그중 9/18 뒤 바뀐 글 ${out.쪽[url].바뀐글})`, "", "학습자가 이 쪽에서 보고 듣는 글 전부. 한 줄씩 읽고 틀림을 찾는다(기준 ①~⑦). T 번호로 적는다.", ""];
    units.forEach((u, i) => lines.push(`- T${String(i + 1).padStart(2, "0")} [${u.kind}] ${u.line}`));
    fs.writeFileSync(path.join(dir, `${id}.md`), lines.join("\n") + "\n");
  }
}
fs.writeFileSync(path.join(L.DIR, "표본.json"), JSON.stringify(out, null, 1));
const perCourse = {};
for (const [url, v] of Object.entries(out.쪽)) { const p = (perCourse[v.과정] = perCourse[v.과정] || { 쪽: 0, 글: 0, 바뀐글: 0 }); p.쪽++; p.글 += v.글수; p.바뀐글 += v.바뀐글; }
console.log(JSON.stringify({ 씨앗: SEED, 틀: frames, 뽑음: picked, 과정별: perCourse }, null, 1));
