#!/usr/bin/env node
/**
 * KIG-006 exposure measurement.
 *
 * Reproduces, faithfully, the exact pipeline a student's grammar screen runs:
 *   content/lessons/<course>/<file>.json
 *     -> getLessonContext() pairing (incl. the grammar1 even/odd special case)
 *     -> the odd->even redirect rule in src/app/[course]/[lesson]/page.tsx
 *     -> GrammarLearningView's isEnglish()/hasKorean() language resolution
 *     -> cleanText()
 *
 * It reports, for the text that ACTUALLY lands in the student-visible
 * `englishText` slot:
 *   A  (혹은 ...) alternative markers
 *   B/C any parenthetical
 *   D  Hangul inside what is presented as the English model answer
 *
 * Read-only. Writes a JSON dump to docs/qa-2026-09-15/evidence/kig006-exposure.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const LESSONS = path.join(ROOT, "content/lessons");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/kig006-exposure.json");

const PAD = (n) => String(n).padStart(3, "0");

function listLessons(course) {
  const dir = path.join(LESSONS, course);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { id: j.id, variant: j.variant };
    });
}

function load(course, id) {
  const f = path.join(LESSONS, course, id + ".json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
}

/** Port of getLessonContext() in src/lib/content.ts. */
function pairOf(course, id, list) {
  const current = list.find((l) => l.id === id);
  let pairId =
    current && current.variant === "main"
      ? (list.find((l) => l.variant === "script" && l.id.startsWith(id + "-")) || {}).id
      : (list.find((l) => l.variant === "main" && id.startsWith(l.id + "-")) || {}).id;

  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const sub = m[2] || "";
      if (num % 2 === 0) {
        const t = "gh1-" + PAD(num + 1) + sub;
        if (list.some((l) => l.id === t)) pairId = t;
        else if (list.some((l) => l.id === "gh1-" + PAD(num + 1))) pairId = "gh1-" + PAD(num + 1);
      } else {
        const t = "gh1-" + PAD(num - 1) + sub;
        if (list.some((l) => l.id === t)) pairId = t;
        else if (list.some((l) => l.id === "gh1-" + PAD(num - 1))) pairId = "gh1-" + PAD(num - 1);
      }
    }
  }
  return pairId || null;
}

/** Port of isEnglish() in src/components/GrammarLearningView.tsx. */
function isEnglish(text) {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}
function hasKorean(t) {
  return !t ? false : /[\uAC00-\uD7AF\u1100-\u11FF]/.test(t);
}
/** Port of cleanText() in the same component. */
function cleanText(t) {
  return !t ? "" : t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
}
function sentences(blocks) {
  return (blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
}

const rows = [];
for (const course of ["grammar1", "grammar2"]) {
  const list = listLessons(course);
  for (const l of list) {
    // The lesson page redirects odd grammar1 mains to their even pair, so an odd
    // main is never itself a rendered page.
    if (course === "grammar1" && l.variant === "main") {
      const m = l.id.match(/^gh1-(\d+)(-\d+)?$/);
      if (m && parseInt(m[1], 10) % 2 !== 0) continue;
    }
    const L = load(course, l.id);
    if (!L) continue;
    const pid = pairOf(course, l.id, list);
    const P = pid ? load(course, pid) : null;
    const main = sentences(L.blocks);
    const pr = P ? sentences(P.blocks) : [];
    const count = Math.max(main.length, pr.length);
    for (let i = 0; i < count; i++) {
      const textM = (main[i] && main[i].text) || "";
      const textP = (pr[i] && pr[i].text) || "";
      let en = "";
      let ko = "";
      if (isEnglish(textM) && !isEnglish(textP)) {
        en = textM;
        ko = textP;
      } else if (!isEnglish(textM) && isEnglish(textP)) {
        en = textP;
        ko = textM;
      } else if (hasKorean(textM)) {
        ko = textM;
        en = textP;
      } else {
        en = textM;
        ko = textP;
      }
      rows.push({
        course,
        page: l.id,
        variant: l.variant,
        pairId: pid,
        n: (main[i] && main[i].n) || String(i + 1),
        en: cleanText(en),
        ko: cleanText(ko),
        rawEn: en,
        rawKo: ko,
      });
    }
  }
}

const uniqBy = (arr, key) => {
  const m = {};
  arr.forEach((r) => {
    m[r[key]] = 1;
  });
  return Object.keys(m);
};
const byPage = (arr) => {
  const m = {};
  arr.forEach((r) => {
    m[r.page] = (m[r.page] || 0) + 1;
  });
  return m;
};

const A = rows.filter((r) => r.en.includes("혹은"));
const P = rows.filter((r) => /\([^)]*\)/.test(r.en) && !r.en.includes("혹은"));
const ALLP = rows.filter((r) => /\([^)]*\)/.test(r.en));
const D = rows.filter((r) => hasKorean(r.en));

const line = (label, arr) =>
  `${label}: rows=${arr.length} uniqueTexts=${uniqBy(arr, "en").length} pages=${new Set(arr.map((r) => r.page)).size}`;

console.log("RENDERED ITEMS TOTAL: " + rows.length);
console.log("");
console.log(line("A  (혹은 ...)        ", A));
console.log("   " + JSON.stringify(byPage(A)));
console.log(line("B/C parenthetical   ", P));
console.log(line("A+B/C all parens    ", ALLP));
console.log(line("D  Hangul in English", D));
console.log("   " + JSON.stringify(byPage(D)));

console.log("\n--- D rows (Hangul presented as the English model answer) ---");
D.forEach((r) =>
  console.log(`  [${r.page}/${r.n}] en="${r.en}"\n        ko="${r.ko}"`)
);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log("\nwrote " + path.relative(ROOT, OUT));
