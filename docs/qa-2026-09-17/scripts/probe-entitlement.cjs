#!/usr/bin/env node
/**
 * Phase 3 — entitlement without a licence, READ-ONLY, over plain HTTP (no cookies).
 *
 * For one FREE and one PAID lesson of every course:
 *   - the HTML must not contain the lesson's own content (a sentence / word / answer
 *     taken from the data file) when the lesson is paid,
 *   - the RSC payload (`RSC: 1` header, what client navigation fetches) must not either,
 *   - the free lesson must contain it.
 * Also checks one gated media clip of a paid lesson without a cookie.
 *
 * Output: out/entitlement-probe.json and a printed table.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const lesson = (course, id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", course, `${id}.json`), "utf8"));

// A distinctive content string per lesson, read from the data file.
function needle(course, id) {
  const d = lesson(course, id);
  if (course === "reading") return (d.readingSentences || [])[1]?.english;
  if (course === "phonics") {
    // the whole first grid row joined the way React renders adjacent cells is not
    // stable; a rare word from the grid is distinctive enough on its own
    const words = (d.blocks.find((b) => b.type === "wordgrid")?.rows || []).flat().filter(Boolean);
    return words.sort((a, b) => b.length - a.length)[0];
  }
  if (course === "ld") {
    const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
    return (scripts[id] || []).map((r) => r.en).find((t) => t && t.length > 40);
  }
  if (course === "grammar1") {
    const texts = (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text));
    return texts.sort((a, b) => b.length - a.length)[0];
  }
  const s = JSON.stringify(d.blocks || d);
  const m = s.match(/"(?:text|en|english|sentence|answer)"\s*:\s*"([^"]{40,120})"/);
  return m ? m[1] : null;
}

// Free ids from src/lib/license.ts FREE_PREVIEW_LESSON_IDS; paid ids picked from the middle of each course.
const cases = [
  ["reading", "pr001", "free"], ["reading", "pr100", "paid"],
  ["grammar1", "gh1-006", "free"], ["grammar1", "gh1-058", "paid"],
  ["grammar2", "gh2-007", "free"], ["grammar2", "gh2-030", "paid"],
  ["student", "s1-1", "free"], ["student", "s10-1", "paid"],
  ["ld", "d001", "free"], ["ld", "d150", "paid"],
  ["phonics", "mv1-01", "free"], ["phonics", "hv-48", "paid"],
];

(async () => {
  const results = [];
  for (const [course, id, access] of cases) {
    let n;
    try { n = needle(course, id); } catch (e) { results.push({ course, id, access, error: `data: ${e.message}` }); continue; }
    if (!n) { results.push({ course, id, access, error: "no needle found in data file" }); continue; }
    const probe = n.replace(/\\"/g, '"').slice(0, 40);
    const html = await (await fetch(`${BASE}/${course}/${id}`)).text();
    const rsc = await (await fetch(`${BASE}/${course}/${id}`, { headers: { RSC: "1" } })).text();
    const inHtml = html.includes(probe);
    const inRsc = rsc.includes(probe);
    const pass = access === "free" ? inHtml || inRsc : !inHtml && !inRsc;
    results.push({ course, id, access, probe, inHtml, inRsc, htmlBytes: html.length, pass });
  }
  // gated media without cookie
  for (const url of ["/audio/ld/d150.mp3", "/audio/ld/d001.mp3"]) {
    const r = await fetch(BASE + url, { headers: { range: "bytes=0-1" } });
    await r.arrayBuffer().catch(() => {});
    results.push({ media: url, status: r.status, pass: url.includes("d001") ? r.status === 206 || r.status === 200 : r.status === 403 || r.status === 401 });
  }
  fs.writeFileSync(path.join(__dirname, "../out/entitlement-probe.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
  for (const r of results) console.log(JSON.stringify(r));
  console.log(`${results.filter((r) => r.pass).length} PASS / ${results.filter((r) => !r.pass).length} not PASS`);
})();
