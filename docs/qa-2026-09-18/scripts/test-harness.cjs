#!/usr/bin/env node
// Smoke test of lib/harness.cjs: licensed clone, TRUSTED click on READING sentences,
// audio hook records the clip, and each clip path equals the app's key for that sentence.
const H = require("./lib/harness.cjs");
(async () => {
  const browser = await H.startBrowser("probe", 9401);
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    const l = await H.load(tab, "/reading/pr100", { marker: H.MARKERS.reading });
    const out = { load: l, tries: [] };
    const n = await tab.eval(`document.querySelectorAll('main span[data-sentence-id]').length`);
    for (let i = 0; i < n; i++) {
      const expr = `document.querySelectorAll('main span[data-sentence-id]')[${i}]`;
      const text = await tab.eval(`${expr}.innerText.replace(/^\\[\\d+\\]\\s*/, '').trim()`);
      const c = await H.click(tab, expr, { settle: 2500 });
      const audio = H.summariseAudio(await H.audioLog(tab, { clear: true }));
      out.tries.push({ i, covered: c.covered, expected: H.expectedClip(text), audio });
    }
    out.events = H.events(tab);
    console.log(JSON.stringify(out, null, 1));
    await tab.close();
  } finally {
    browser.proc.kill();
  }
})();
