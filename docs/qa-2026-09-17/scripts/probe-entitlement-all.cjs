#!/usr/bin/env node
/**
 * Phase 3 — EVERY lesson route, no cookies, READ-ONLY (plain GET of the HTML).
 *
 *   paid lesson → the server-rendered paywall ("ALL-PASS ONLY" / "STUDENT PASS ONLY")
 *                 is in the HTML, and none of the lesson's own text is
 *   free lesson → no paywall, and the lesson's own text is in the HTML
 *
 * "Own text" = up to three distinctive strings read from the data file
 * (sentences, script lines, grid words, Korean prompts). A lesson whose file has
 * no usable string is checked on the paywall marker alone and says so.
 *
 * Free list = src/lib/license.ts FREE_PREVIEW_LESSON_IDS (read as text).
 * Routes    = src/lib/generated/validRoutes.json.
 * Output    = out/entitlement-all.json + summary.
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
const PAYWALL = /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED/;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function needles(course, id) {
  const file = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(file)) return [];
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  let c = [];
  if (course === "reading") c = (d.readingSentences || []).map((s) => s.english);
  if (course === "ld") c = (scripts[id.replace(/-1$/, "")] || []).map((r) => r.en);
  for (const b of d.blocks || []) {
    if (b.type === "sentences") c.push(...b.items.map((i) => i.text));
    if (b.type === "wordgrid") c.push(...b.rows.flat());
    if (typeof b.text === "string" && b.type !== "heading" && b.type !== "instruction") c.push(b.text);
  }
  c = c.filter((t) => typeof t === "string").map((t) => t.trim()).filter((t) => t.length >= 12 || (course === "phonics" && t.length >= 9));
  return [...new Set(c)].sort((a, b) => b.length - a.length).slice(0, 3).map((t) => t.slice(0, 32));
}

(async () => {
  const list = Object.entries(routes).flatMap(([course, ids]) => ids.map((id) => ({ course, id })));
  const results = [];
  let i = 0;
  async function worker() {
    for (;;) {
      const k = i++;
      if (k >= list.length) return;
      const { course, id } = list[k];
      const free = FREE.has(id);
      const ns = needles(course, id);
      let status = 0, html = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(`${BASE}/${course}/${id}`);
          status = r.status;
          html = await r.text();
          if (status < 500) break;
        } catch (e) { status = -1; }
        await new Promise((res) => setTimeout(res, 1500));
      }
      const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
      const paywall = PAYWALL.test(body);
      const found = ns.filter((n) => html.includes(n) || html.includes(esc(n)));
      const pass = status === 200 && (free ? !paywall && (ns.length === 0 || found.length > 0) : paywall && found.length === 0);
      results.push({ course, id, free, status, paywall, needles: ns.length, found, pass, bytes: html.length });
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  results.sort((a, b) => (a.course + a.id).localeCompare(b.course + b.id));
  fs.writeFileSync(path.join(__dirname, "../out/entitlement-all.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
  const by = {};
  for (const r of results) {
    const k = `${r.course} ${r.free ? "free" : "paid"}`;
    by[k] ||= { total: 0, pass: 0, noNeedle: 0 };
    by[k].total++;
    if (r.pass) by[k].pass++;
    if (!r.needles) by[k].noNeedle++;
  }
  console.log(by);
  const fails = results.filter((r) => !r.pass);
  console.log(`${results.length} routes: ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  for (const f of fails.slice(0, 40)) console.log(JSON.stringify(f));
})();
