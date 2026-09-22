#!/usr/bin/env node
/**
 * The completeness pass lists speaker buttons whose clip file is not in the repo. Anonymously
 * those URLs answer 403, but the paywall answers 403 for a clip that does not exist either, so
 * anonymous probing cannot tell "missing" from "paid". This asks with the licence.
 *
 * It fetches from inside a page of the licensed profile clone, so the licence cookie is used by
 * the browser and never read by this script. Only status and byte length are taken — no content.
 *
 *   node probe-missing-clips.cjs [--port 9570] [--limit N]
 * Output: out/missing-clips-licensed.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9570));
const LIMIT = Number(arg("--limit", 0)) || 0;
const OUT = path.join(__dirname, "../out");
const comp = JSON.parse(fs.readFileSync(path.join(OUT, "completeness.json"), "utf8"));

const wanted = [];
const seen = new Set();
for (const [course, kinds] of Object.entries(comp.report)) {
  for (const e of kinds["missing-clip"] || []) {
    const url = e.detail.split(": ")[1];
    if (seen.has(url)) continue;
    seen.add(url);
    wanted.push({ course, url, lesson: e.where });
  }
}
const list = LIMIT ? wanted.slice(0, LIMIT) : wanted;
console.log(`clips to ask production about (with the licence): ${list.length} distinct, from ${wanted.length} references`);

(async () => {
  const browser = await H.startBrowser("probe-missing-clips", PORT);
  const tab = await H.openTab(browser);
  // a licensed lesson page, so the fetches below are same-origin and carry the licence cookie
  await H.load(tab, "/ld/d002", { marker: null });
  const href = await tab.eval("location.href");
  console.log(`asking from ${href}`);

  const results = await tab.eval(`(async () => {
    const urls = ${JSON.stringify(list.map((x) => x.url))};
    const out = [];
    for (let i = 0; i < urls.length; i += 8) {
      const part = await Promise.all(urls.slice(i, i + 8).map(async (u) => {
        try {
          const r = await fetch(u, { headers: { Range: "bytes=0-1" } });
          return { url: u, status: r.status, type: r.headers.get("content-type") || "", range: r.headers.get("content-range") || "" };
        } catch (e) { return { url: u, status: 0, type: "network error: " + e.message, range: "" }; }
      }));
      out.push(...part);
    }
    return out;
  })()`);

  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const missing = results.filter((r) => r.status === 404 || r.status === 0 || (r.status < 400 && !/audio/.test(r.type)));
  const ok = results.filter((r) => r.status === 200 || r.status === 206);

  const byLesson = {};
  for (const r of missing) {
    for (const w of list.filter((x) => x.url === r.url)) (byLesson[w.lesson] ||= []).push(r.url);
  }
  fs.writeFileSync(path.join(OUT, "missing-clips-licensed.json"), JSON.stringify({ at: new Date().toISOString(), asked: results.length, byStatus, missing, okCount: ok.length, byLesson }, null, 1));

  console.log(`\nstatus counts: ${JSON.stringify(byStatus)}`);
  console.log(`really served: ${ok.length} · really missing/broken: ${missing.length}`);
  console.log(`lessons affected: ${Object.keys(byLesson).length}`);
  for (const [lesson, urls] of Object.entries(byLesson).slice(0, 10)) console.log(`   ${lesson}: ${urls.length} clip(s), e.g. ${urls[0]}`);
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
