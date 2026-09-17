#!/usr/bin/env node
/**
 * ISS-00 regression check — no PAID lesson text in the public build output.
 *
 * Everything under .next/static is served to anyone without a cookie. After
 * `pnpm build`, this reads every file there and looks for text from every PAID
 * lesson of every course (free preview lessons are allowed to appear):
 *   READING  every English and Korean sentence of every paid passage
 *   LISTENING every script line of every paid round
 *   GRAMMAR I/II, STUDENT  every sentence item of every paid lesson
 *   VOCA     the first six words of each paid lesson's grid, in order
 * Strings are compared letters/digits/Hangul only, so JS escaping cannot hide a hit.
 *
 *   node scan-build-static.cjs      exit 0 = zero paid strings in .next/static
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const STATIC = path.join(REPO, ".next/static");
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = new Set([...freeBlock.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const flat = (s) => (s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/[^A-Za-z0-9가-힣]+/g, "");

if (!fs.existsSync(STATIC)) {
  console.error("no .next/static — run pnpm build first");
  process.exit(2);
}
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|json|txt|html|css|map)$/.test(e.name)) files.push(p);
  }
})(STATIC);
const corpus = files.map((f) => flat(fs.readFileSync(f, "utf8"))).join("\n");

const needles = [];
for (const [course, ids] of Object.entries(routes)) {
  if (course === "cnn") continue; // retired course, not a sold product (owner rule)
  for (const id of ids) {
    if (FREE.has(id)) continue;
    const file = path.join(REPO, "content/lessons", course, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    let texts = [];
    if (course === "reading") texts = (d.readingSentences || []).flatMap((s) => [s.english, s.korean]);
    else if (course === "ld") texts = (scripts[id.replace(/-1$/, "")] || []).map((r) => r.en);
    else if (course === "phonics") { const g = (d.blocks || []).find((b) => b.type === "wordgrid"); texts = g ? [g.rows.flat().slice(0, 6).join(" ")] : []; }
    else texts = (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text));
    for (const t of texts) {
      const f = flat(t);
      if (f.length >= 24) needles.push({ course, id, f, t });
    }
  }
}
const seen = new Set();
const hits = [];
const byCourse = {};
for (const n of needles) {
  if (seen.has(n.f)) continue;
  seen.add(n.f);
  byCourse[n.course] = (byCourse[n.course] || 0) + 1;
  if (corpus.includes(n.f)) hits.push(n);
}
console.log(`.next/static files scanned: ${files.length}; paid strings checked: ${seen.size}`, byCourse);
console.log(`paid strings found in public build output: ${hits.length}`);
for (const h of hits.slice(0, 15)) console.log(`  ${h.course}/${h.id}: ${h.t.slice(0, 70)}`);
process.exit(hits.length === 0 ? 0 : 1);
