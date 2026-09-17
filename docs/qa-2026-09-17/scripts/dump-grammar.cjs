#!/usr/bin/env node
/**
 * Phase 5 — GRAMMAR I/II content, one Korean prompt + English model answer per
 * line, for reading every item. Also runs the mechanical checks a reader would
 * otherwise have to do by eye, and prints each one's count:
 *
 *   - Korean prompt and English answer counts differ per lesson
 *   - a split page (-1/-2) disagrees with the main page's item
 *   - English field contains Hangul / Korean field has no Hangul
 *   - sentence-final punctuation disagrees (? vs .)
 *   - doubled spaces, spaces before punctuation, unbalanced brackets or quotes
 *
 * Output: out/content/grammar1.tsv, out/content/grammar2.tsv, out/content/grammar-checks.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });

const load = (course, id) => {
  const f = path.join(REPO, "content/lessons", course, `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
};
const items = (lesson) =>
  (lesson?.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
const instructions = (lesson) =>
  (lesson?.blocks || []).filter((b) => b.type === "instruction").map((b) => b.text || (b.items || []).join(" / "));
const hangul = /[가-힣]/;
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const endMark = (s) => (clean(s).match(/[?.!]$/) || [""])[0];

const checks = {};
const flag = (name, where) => {
  (checks[name] ||= []).push(where);
};

function lint(where, text, lang) {
  const t = text || "";
  if (/ {2,}/.test(t)) flag("double space", where);
  if (/\s[,.?!]/.test(t)) flag("space before punctuation", where);
  const pairs = [["(", ")"], ["[", "]"], ["“", "”"]];
  for (const [a, b] of pairs) if (t.split(a).length !== t.split(b).length) flag(`unbalanced ${a}${b}`, where);
  if ((t.match(/"/g) || []).length % 2) flag('odd number of "', where);
  if (lang === "en" && hangul.test(t)) flag("Hangul in English answer", where);
  if (lang === "ko" && t && !hangul.test(t)) flag("no Hangul in Korean prompt", where);
  if (lang === "en" && /[a-z]\.[A-Z]/.test(t)) flag("missing space after period", where);
}

function writeTsv(course, rows) {
  const lines = ["lesson\tn\tKO\tEN\talternatives"];
  for (const r of rows) lines.push([r.lesson, r.n, clean(r.ko), clean(r.en), (r.alts || []).map(clean).join(" | ")].join("\t"));
  fs.writeFileSync(path.join(OUT, `${course}.tsv`), lines.join("\n") + "\n");
}

// GRAMMAR I: even page = Korean prompts, next odd page = English answers.
{
  const idx = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/grammar1.json"), "utf8"));
  const mains = idx.lessons.filter((l) => l.variant === "main").map((l) => l.id);
  const rows = [];
  const evens = mains.filter((id) => parseInt(id.slice(4), 10) % 2 === 0);
  for (const ko of evens) {
    const num = parseInt(ko.slice(4), 10);
    const en = `gh1-${String(num + 1).padStart(3, "0")}`;
    const K = items(load("grammar1", ko));
    const E = items(load("grammar1", en));
    if (!load("grammar1", en)) flag("Korean page without English answer page", ko);
    if (K.length !== E.length) flag("prompt/answer count differs", `${ko} ${K.length} vs ${en} ${E.length}`);
    const byN = new Map(E.map((e) => [e.n, e]));
    for (const k of K) {
      const e = byN.get(k.n);
      const where = `${ko} #${k.n}`;
      if (!e) flag("prompt without answer", where);
      lint(where + " KO", k.text, "ko");
      lint(where + " EN", e?.text, "en");
      if (e && endMark(k.text) && endMark(e.text) && (endMark(k.text) === "?") !== (endMark(e.text) === "?")) flag("question mark mismatch", where);
      rows.push({ lesson: ko, n: k.n, ko: k.text, en: e?.text, alts: e?.alternatives });
    }
    for (const e of E) if (!K.some((k) => k.n === e.n)) flag("answer without prompt", `${en} #${e.n}`);
    // Split pages must repeat the main page's items exactly.
    for (const [main, list] of [[ko, K], [en, E]]) {
      for (const suffix of ["-1", "-2"]) {
        const part = load("grammar1", main + suffix);
        if (!part) continue;
        for (const it of items(part)) {
          const m = list.find((x) => x.n === it.n);
          if (!m) flag("split page item missing from main", `${main}${suffix} #${it.n}`);
          else if (clean(m.text) !== clean(it.text)) flag("split page text differs from main", `${main}${suffix} #${it.n}`);
        }
      }
    }
    const ins = [...instructions(load("grammar1", ko)), ...instructions(load("grammar1", en))];
    if (ins.length) rows.push({ lesson: ko, n: "instr", ko: ins.join(" ¦ "), en: "" });
  }
  writeTsv("grammar1", rows);
  console.log(`grammar1: ${evens.length} Korean pages, ${rows.filter((r) => r.n !== "instr").length} items`);
}

// GRAMMAR II: gh2-NNN = English, gh2-NNN-1 = Korean.
{
  const idx = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/grammar2.json"), "utf8"));
  const mains = idx.lessons.filter((l) => l.variant === "main").map((l) => l.id);
  const rows = [];
  for (const id of mains) {
    const E = items(load("grammar2", id));
    const K = items(load("grammar2", `${id}-1`));
    if (K.length !== E.length) flag("prompt/answer count differs", `${id} EN ${E.length} vs KO ${K.length}`);
    for (const e of E) {
      const k = K.find((x) => x.n === e.n);
      const where = `${id} #${e.n}`;
      if (!k) flag("answer without prompt", where);
      lint(where + " EN", e.text, "en");
      lint(where + " KO", k?.text, "ko");
      if (k && endMark(k.text) && endMark(e.text) && (endMark(k.text) === "?") !== (endMark(e.text) === "?")) flag("question mark mismatch", where);
      rows.push({ lesson: id, n: e.n, ko: k?.text, en: e.text, alts: e.alternatives });
    }
    const ins = [...instructions(load("grammar2", id)), ...instructions(load("grammar2", `${id}-1`))];
    if (ins.length) rows.push({ lesson: id, n: "instr", ko: ins.join(" ¦ "), en: "" });
  }
  writeTsv("grammar2", rows);
  console.log(`grammar2: ${mains.length} lessons, ${rows.filter((r) => r.n !== "instr").length} items`);
}

fs.writeFileSync(path.join(OUT, "grammar-checks.json"), JSON.stringify(checks, null, 1));
for (const [name, list] of Object.entries(checks)) console.log(`${String(list.length).padStart(5)}  ${name}   e.g. ${list.slice(0, 6).join(" | ")}`);
