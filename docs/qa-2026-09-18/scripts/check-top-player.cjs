#!/usr/bin/env node
/**
 * Focused check for the sweep's most repeated audio failure: the lesson page's top player
 * ("▶ 재생 버튼을 눌러 전체 듣기") requesting no clip at all on the first view.
 *
 * Presses it, waits 8 s, records every media request and TTS call, then presses it again.
 *   node check-top-player.cjs [--ids /reading/pr005,/ld/d005,...] [--port 9590]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const URLS = arg("--ids", "/reading/pr005,/reading/pr100,/ld/d005,/grammar2/gh2-010,/phonics/mv1-05,/student/s2-1,/grammar1/gh1-010").split(",");
const PORT = Number(arg("--port", 9590));

const BUTTON = `[...document.querySelectorAll('main button, header button')].find((b) => /재생/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`;

(async () => {
  const browser = await H.startBrowser("topplayer", PORT);
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    for (const url of URLS) {
      const course = url.split("/")[1];
      await H.load(tab, url, { marker: H.MARKERS[course] });
      const label = await tab.eval(`(() => { const b = ${BUTTON}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim().slice(0, 60) : null; })()`).catch(() => null);
      const press = async () => {
        await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
        const c = await H.click(tab, BUTTON);
        await H.sleep(8000);
        const log = await H.audioLog(tab);
        return { clicked: c.ok, events: log.map((e) => `${e.ev}${e.src ? " " + e.src.replace(/^https?:\/\/[^/]+/, "") : ""}${e.text ? ' "' + e.text.slice(0, 30) + '"' : ""}`).slice(0, 8) };
      };
      const first = await press();
      const state = await tab.eval(`(() => { const b = ${BUTTON}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim().slice(0, 60) : null; })()`).catch(() => null);
      const second = await press();
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      rows.push({ url, button: label, first, buttonAfterFirst: state, second });
      console.log(JSON.stringify(rows[rows.length - 1], null, 1));
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  fs.writeFileSync(path.join(__dirname, "../out/top-player.json"), JSON.stringify({ at: new Date().toISOString(), rows }, null, 1));
})();
