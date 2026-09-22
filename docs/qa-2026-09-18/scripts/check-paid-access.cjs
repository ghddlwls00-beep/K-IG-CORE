#!/usr/bin/env node
/**
 * Quick proof that the licensed audit clone opens PAID lessons in every in-scope course:
 * no paywall marker, the course marker renders, and lesson text from the data is on screen
 * (clicking through the lesson's step buttons until the needle appears, since some courses
 * show a sentence only in a later step).
 *   node check-paid-access.cjs [cloneName]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const sentences = (d) => (d.blocks || []).flatMap((b) => (b.items || []).map((i) => i.text)).filter(Boolean);
const PAGES = [
  ["student", "s20-5", (d) => sentences(d).find((t) => t.length > 15)],
  ["phonics", "hv-75", (d) => (d.blocks.find((b) => b.type === "wordgrid") || { rows: [[]] }).rows.flat().find((w) => w && w.length > 6)],
  ["grammar1", "gh1-122", (d) => sentences(d).find((t) => t.length > 8)],
  ["grammar2", "gh2-050", (d) => sentences(d).find((t) => t.length > 15)],
  ["ld", "d276", () => JSON.parse(fs.readFileSync(path.join(H.REPO, "content/ld_english_scripts.json"), "utf8")).d276[0].en],
  ["reading", "pr256", (d) => d.readingSentences[0].english],
];
(async () => {
  const browser = await H.startBrowser(process.argv[2] || "probe", 9402);
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    for (const [course, id, pick] of PAGES) {
      const d = JSON.parse(fs.readFileSync(path.join(H.REPO, "content/lessons", course, `${id}.json`), "utf8"));
      const needle = String(pick(d) || "").slice(0, 30);
      const l = await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
      const has = `(() => { const t = document.body.innerText; return { paywall: ${H.PAYWALL_RE}.test(t), found: t.includes(${JSON.stringify(needle)}) }; })()`;
      let r = await tab.eval(has);
      let step = "(initial)";
      const labels = (await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => b.offsetParent && /step\\s*\\d|STEP\\s*\\d|단계/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).slice(0, 8)`)) || [];
      for (const label of labels) {
        if (r.found) break;
        await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => b.innerText.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)})`, { settle: 1200 });
        r = await tab.eval(has);
        step = label;
      }
      rows.push({ url: `/${course}/${id}`, loaded: l.navigated && l.rendered, paywall: r.paywall, found: r.found, foundAt: r.found ? step : "-", needle });
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  console.table(rows);
})();
