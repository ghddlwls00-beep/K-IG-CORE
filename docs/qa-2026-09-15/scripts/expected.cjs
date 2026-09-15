// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Builds per-lesson expectations (from content/, via the app's real helpers) for the UI harness.
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("./tsload.cjs");
const listening = loadTs(`${REPO}/src/lib/listeningUtils.ts`);
const R = (c, id) => JSON.parse(fs.readFileSync(`${REPO}/content/lessons/${c}/${id}.json`, "utf8"));
const idx = (c) => JSON.parse(fs.readFileSync(`${REPO}/content/courses/${c}.json`, "utf8"));
const dict = JSON.parse(fs.readFileSync(`${REPO}/content/voca_dictionary.json`, "utf8"));
const ld = JSON.parse(fs.readFileSync(`${REPO}/content/ld_english_scripts.json`, "utf8"));
const out = [];
const isEnglish = (t) => { const l = (t.match(/[a-zA-Z]/g) || []).length, h = (t.match(/[가-힯ᄀ-ᇿ]/g) || []).length; return l >= h && l > 0; };
const hasKorean = (t) => /[가-힯ᄀ-ᇿ]/.test(t || "");
const clean = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");

for (const g of idx("student").groups) for (const id of g.lessons) {
  const L = R("student", id);
  const items = L.blocks.find((b) => b.type === "sentences")?.items || [];
  const ko = L.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text.trim());
  out.push({ section: "STUDENT", course: "student", id, url: `/student/${id}`, en: items.map((x) => x.text), ko, firstWords: listening.generateWordBank(items[0]?.text || "").correctWords });
}
for (const g of idx("phonics").groups) for (const id of g.lessons) {
  const words = R("phonics", id).blocks.find((b) => b.type === "wordgrid").rows.flat().map((w) => w?.trim()).filter(Boolean);
  out.push({ section: "VOCA", course: "phonics", id, url: `/phonics/${id}`, words });
}
function grammarExpect(course, id, pid) {
  const L = R(course, id), P = R(course, pid);
  const key = `${course}/${id}`;
  if (key.includes("020") || key.includes("021")) {
    const instrs = [...L.blocks, ...P.blocks].filter((b) => b.type === "instruction").map((b) => b.text.trim());
    const th = [];
    for (let i = 0; i < instrs.length; i++) if (/^\(\d+\)/.test(instrs[i])) { const qText = instrs[i]; let a = ""; const n = instrs[i + 1] || ""; if (n && !/^\(\d+\)/.test(n) && !n.includes("문법 확인")) { a = n.replace(/^답:\s*/, "").trim(); i++; } th.push({ ko: qText, en: a }); }
    if (th.length) return { theory: true, items: th };
  }
  const m = L.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items), p = P.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);
  const items = [];
  for (let i = 0; i < Math.max(m.length, p.length); i++) {
    const tm = m[i]?.text ?? "", tp = p[i]?.text ?? "";
    let en = "", ko = "";
    if (isEnglish(tm) && !isEnglish(tp)) { en = tm; ko = tp; } else if (!isEnglish(tm) && isEnglish(tp)) { en = tp; ko = tm; } else if (hasKorean(tm)) { ko = tm; en = tp; } else { en = tm; ko = tp; }
    items.push({ ko: clean(ko), en: clean(en) });
  }
  return { theory: false, items };
}
for (const g of idx("grammar1").groups) for (const id of g.lessons) {
  const e = grammarExpect("grammar1", id, `gh1-${String(parseInt(id.slice(4), 10) + 1).padStart(3, "0")}`);
  out.push({ section: "GRAMMAR I", course: "grammar1", id, url: `/grammar1/${id}`, ...e });
}
for (let i = 7; i <= 50; i++) {
  const id = `gh2-${String(i).padStart(3, "0")}`;
  out.push({ section: "GRAMMAR II", course: "grammar2", id, url: `/grammar2/${id}`, ...grammarExpect("grammar2", id, `${id}-1`) });
}
for (let i = 1; i <= 276; i++) {
  const id = `d${String(i).padStart(3, "0")}`;
  const s = ld[id] || [];
  out.push({ section: "LISTENING", course: "ld", id, url: `/ld/${id}`, en: s.map((x) => x.en), ko: s.map((x) => x.ko), firstWords: listening.generateWordBank(s[0]?.en || "").correctWords });
}
for (let i = 1; i <= 256; i++) {
  const id = `pr${String(i).padStart(3, "0")}`;
  const L = R("reading", id);
  const rs = L.readingSentences || [];
  out.push({ section: "READING", course: "reading", id, url: `/reading/${id}`, en: rs.map((x) => x.english), ko: rs.map((x) => x.korean), vocab: (L.readingVocabulary || []).map((v) => v.word) });
}
fs.writeFileSync(path.join(__dirname, "out", "expected.json"), JSON.stringify(out));
console.log("expected lessons:", out.length, Object.entries(out.reduce((m, x) => ((m[x.section] = (m[x.section] || 0) + 1), m), {})));
