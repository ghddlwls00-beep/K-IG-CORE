#!/usr/bin/env node
/**
 * Phase 8 — scope of the paid-content leak found by probe-bundle-content.cjs.
 * Anonymous (no cookie) downloads only.
 *
 *   1. READING: for all 254 PAID passages, is each English sentence, each Korean
 *      translation and each vocabulary card (word + Korean) inside the public JS
 *      chunks that /reading/pr001 (free) loads?
 *   2. Every other course: public JS of a free lesson + course list, searched for
 *      every PAID lesson's distinctive text (grammar answers, LISTENING script
 *      lines, STUDENT sentences, VOCA lesson word grids as ordered runs).
 *   3. /search-index.json (public): does it carry paid lesson body text?
 * Output: out/bundle-leak-scope.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = new Set([...freeBlock.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const L = (c, id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", c, `${id}.json`), "utf8"));
// JS string literals escape quotes/newlines/non-ASCII differently; compare on a
// normalised form: letters+digits+Hangul only.
const flat = (s) => (s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/[^A-Za-z0-9가-힣]+/g, "");

async function publicJs(pages) {
  const urls = new Set();
  for (const p of pages) {
    const html = await (await fetch(BASE + p)).text();
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+\.js/g)) urls.add(m[0]);
  }
  let all = "";
  for (const u of urls) all += "\n" + (await (await fetch(BASE + u)).text());
  return { urls: [...urls], text: flat(all) };
}

(async () => {
  const result = {};
  // 1. READING
  {
    const js = await publicJs(["/reading/pr001", "/reading"]);
    let passages = 0, en = 0, ko = 0, cards = 0, enTotal = 0, koTotal = 0, cardTotal = 0, anyLeak = 0;
    for (let u = 3; u <= 256; u++) {
      const id = `pr${String(u).padStart(3, "0")}`;
      const d = L("reading", id);
      passages++;
      let leaked = false;
      for (const s of d.readingSentences || []) {
        const e = flat(s.english), k = flat(s.korean);
        if (e.length > 15) { enTotal++; if (js.text.includes(e)) { en++; leaked = true; } }
        if (k.length > 8) { koTotal++; if (js.text.includes(k)) { ko++; leaked = true; } }
      }
      for (const v of d.readingVocabulary || []) {
        cardTotal++;
        if (js.text.includes(flat(v.word) + flat(v.lemma)) || (js.text.includes(flat(v.korean)) && js.text.includes(flat(v.word)))) cards++;
      }
      if (leaked) anyLeak++;
    }
    result.reading = { publicChunks: js.urls.length, paidPassages: passages, passagesWithLeakedText: anyLeak, englishSentences: `${en}/${enTotal}`, koreanSentences: `${ko}/${koTotal}`, vocabCardsLikelyPresent: `${cards}/${cardTotal}` };
    console.log("READING", result.reading);
  }
  // 2. other courses
  const others = {
    grammar1: ["/grammar1", "/grammar1/gh1-006"],
    grammar2: ["/grammar2", "/grammar2/gh2-007"],
    ld: ["/ld", "/ld/d001"],
    student: ["/student", "/student/s1-1"],
    phonics: ["/phonics", "/phonics/mv1-01"],
  };
  for (const [course, pages] of Object.entries(others)) {
    const js = await publicJs(pages);
    let checked = 0, found = 0;
    const examples = [];
    for (const id of routes[course]) {
      if (FREE.has(id)) continue;
      let texts = [];
      if (course === "ld") texts = (scripts[id] || []).map((r) => r.en);
      else if (course === "phonics") { const g = L(course, id).blocks.find((b) => b.type === "wordgrid"); texts = g ? [g.rows.flat().slice(0, 6).join(" ")] : []; }
      else texts = L(course, id).blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text));
      for (const t of texts.filter((x) => flat(x).length > 20).slice(0, 3)) {
        checked++;
        if (js.text.includes(flat(t))) { found++; if (examples.length < 3) examples.push(`${id}: ${t.slice(0, 50)}`); }
      }
    }
    result[course] = { publicChunks: js.urls.length, paidStringsChecked: checked, foundInPublicJs: found, examples };
    console.log(course, result[course]);
  }
  // 3. search index
  {
    const r = await fetch(BASE + "/search-index.json");
    const raw = await r.text();
    const t = flat(raw);
    const probe = { "reading pr100 EN": L("reading", "pr100").readingSentences[1].english, "ld d150 script": scripts.d150.map((x) => x.en).find((x) => x.length > 40) };
    result.searchIndex = { status: r.status, kb: Math.round(raw.length / 1024), contains: Object.fromEntries(Object.entries(probe).map(([k, v]) => [k, t.includes(flat(v))])) };
    console.log("search-index", result.searchIndex);
  }
  fs.writeFileSync(path.join(__dirname, "../out/bundle-leak-scope.json"), JSON.stringify({ at: new Date().toISOString(), result }, null, 1));
})();
