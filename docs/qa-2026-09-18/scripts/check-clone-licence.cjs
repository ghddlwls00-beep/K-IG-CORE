#!/usr/bin/env node
/**
 * Proves a cloned audit profile is licensed: opens a PAID lesson (/reading/pr100)
 * headless and checks that the passage renders and no paywall marker is shown.
 * Reads only the licence PLAN name, never the code/token.
 *   node check-clone-licence.cjs <cloneName>
 */
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const { cloneProfile } = require("./lib/profile.cjs");
const name = process.argv[2] || "probe";
(async () => {
  const profile = cloneProfile(name);
  const browser = await launch({ port: 9390 + (name.length % 9), profile });
  try {
    const tab = await Tab.open(browser.port);
    await tab.goto("https://k-ig-core.vercel.app/reading/pr100", 6000);
    const r = await tab.eval(`(() => {
      const t = (document.querySelector('main') || document.body).innerText;
      let plan = null; try { plan = (JSON.parse(localStorage.getItem('kig:license:v1') || 'null') || {}).plan || null; } catch (e) {}
      return { plan, paywall: /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED/.test(t), passage: t.includes('baby monkeys were separated from their mothers'), chars: t.length };
    })()`);
    console.log(JSON.stringify({ profile, ...r }));
    await tab.close();
  } finally {
    browser.proc.kill();
  }
})();
