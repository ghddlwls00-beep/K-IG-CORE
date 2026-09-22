#!/usr/bin/env node
/**
 * Phase 3 — EVERY in-scope lesson route with NO cookies, READ-ONLY (plain GET).
 * Adapted from docs/qa-2026-09-17/scripts/probe-entitlement-all.cjs:
 *   - CNN excluded (retired, owner rule)
 *   - each route is fetched twice: the HTML document AND the RSC flight payload
 *     (header `RSC: 1`) a client-side navigation would receive
 *
 *   paid lesson → paywall marker present, none of the lesson's own text
 *   free lesson → no paywall, lesson's own text present
 *
 * "Own text" = up to three distinctive strings from the data file. Strings that
 * also appear on the home page (site chrome) are dropped and recorded.
 *
 * Output: out/entitlement-all.json + printed summary.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");
const COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"];
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = {};
for (const line of freeBlock.split("\n")) {
  const m = line.match(/^\s*([a-z0-9]+):\s*\[/);
  if (m) FREE[m[1]] = new Set();
}
{
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(/^\s*([a-z0-9]+):\s*\[/);
    if (m) cur = m[1];
    if (cur) for (const x of line.matchAll(/"([a-z0-9-]+)"/g)) FREE[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
const isFree = (course, id) => {
  const set = FREE[course];
  if (!set) return false;
  let x = id;
  for (;;) {
    if (set.has(x)) return true;
    const s = x.replace(/-\d+$/, "");
    if (s === x) return false;
    x = s;
  }
};
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const PAYWALL = /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED/;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const jsonEsc = (s) => JSON.stringify(s).slice(1, -1);

function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}

function needles(course, id) {
  const file = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(file)) return [];
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  let c = [];
  if (course === "ld") c.push(...(scripts[id.replace(/-1$/, "")] || []).map((r) => r.en));
  collectStrings(d.blocks || d, c);
  if (course === "reading") c.push(...(d.readingSentences || []).map((s) => s.english));
  c = c.filter((t) => typeof t === "string").map((t) => t.trim())
    .filter((t) => !/^(https?:|\/)/.test(t))
    // lesson code titles like "[ mv1-03 ]" / "[ Page 042-1 ]" are shown on the paywall on purpose
    .filter((t) => !/^\[\s*[^\]]{1,20}\s*\]$/.test(t))
    .filter((t) => t.length >= 14 || (course === "phonics" && t.length >= 9));
  return [...new Set(c)].sort((a, b) => b.length - a.length).slice(0, 3).map((t) => t.slice(0, 32));
}

async function get1(url, headers) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers, redirect: "manual" });
      const text = await r.text();
      if (r.status < 500 && r.status !== 429) return { status: r.status, text, location: r.headers.get("location") };
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  return { status: -1, text: "", location: null };
}
// Follows redirects by hand so the chain is recorded (e.g. /grammar1/gh1-031 → /grammar1/gh1-030).
async function get(url, headers) {
  const chain = [];
  let cur = url;
  for (let hop = 0; hop < 5; hop++) {
    const r = await get1(cur, headers);
    if (r.status >= 300 && r.status < 400 && r.location) {
      chain.push(`${r.status} ${new URL(r.location, cur).pathname}`);
      cur = new URL(r.location, cur).href;
      continue;
    }
    return { ...r, chain, finalPath: new URL(cur).pathname };
  }
  return { status: -2, text: "", chain, finalPath: new URL(cur).pathname };
}

(async () => {
  const chrome = await (await fetch(`${BASE}/`)).text();
  const inChrome = (n) => chrome.includes(n) || chrome.includes(esc(n)) || chrome.includes(jsonEsc(n));
  const list = COURSES.flatMap((course) => (routes[course] || []).map((id) => ({ course, id })));
  const results = [];
  let i = 0;
  async function worker() {
    for (;;) {
      const k = i++;
      if (k >= list.length) return;
      const { course, id } = list[k];
      const free = isFree(course, id);
      const all = needles(course, id);
      const ns = all.filter((n) => !inChrome(n));
      const chromeNeedles = all.filter(inChrome);
      const url = `${BASE}/${course}/${id}`;
      const html = await get(url, {});
      const rsc = await get(url, { RSC: "1" });
      // HTML: paid → paywall marker in server HTML and no lesson text; free → no paywall and lesson text.
      // RSC: the paywall is a client component, so its marker text is not in the flight payload;
      //      paid → no lesson text; free → recorded only (lesson text may arrive as client props).
      const judge = (res, kind) => {
        const body = kind === "html" ? res.text.replace(/<script[\s\S]*?<\/script>/g, "") : res.text;
        const paywall = PAYWALL.test(body);
        const found = ns.filter((n) => res.text.includes(n) || res.text.includes(esc(n)) || res.text.includes(jsonEsc(n)));
        let pass;
        if (kind === "html") pass = res.status === 200 && (free ? !paywall && (ns.length === 0 || found.length > 0) : paywall && found.length === 0);
        else pass = res.status === 200 && (free ? true : found.length === 0);
        return { status: res.status, chain: res.chain, finalPath: res.finalPath, paywall, found, pass, bytes: res.text.length };
      };
      const h = judge(html, "html");
      const r = judge(rsc, "rsc");
      results.push({ course, id, free, needles: ns, ...(chromeNeedles.length ? { chromeNeedles } : {}), html: h, rsc: r, pass: h.pass && r.pass });
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  results.sort((a, b) => (a.course + a.id).localeCompare(b.course + b.id));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "entitlement-all.json"), JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 1));
  const by = {};
  for (const r of results) {
    const key = `${r.course} ${r.free ? "free" : "paid"}`;
    by[key] ||= { total: 0, pass: 0, htmlPass: 0, rscPass: 0, noNeedle: 0, redirected: 0 };
    by[key].total++;
    if (r.html.chain.length) by[key].redirected++;
    if (r.pass) by[key].pass++;
    if (r.html.pass) by[key].htmlPass++;
    if (r.rsc.pass) by[key].rscPass++;
    if (!r.needles.length) by[key].noNeedle++;
  }
  console.table(by);
  const fails = results.filter((r) => !r.pass);
  console.log(`${results.length} routes: ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  for (const f of fails.slice(0, 60)) console.log(JSON.stringify({ course: f.course, id: f.id, free: f.free, html: { ...f.html }, rsc: { ...f.rsc }, needles: f.needles }));
})();
