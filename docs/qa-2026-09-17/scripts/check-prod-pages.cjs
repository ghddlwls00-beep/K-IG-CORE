#!/usr/bin/env node
/**
 * Read-only look at paid production pages with the audit's licensed profile
 * (licensed-profile.cjs). Opens each path headless, waits for the lesson, prints whether it is
 * locked and the visible text (first N characters), saves a screenshot per page.
 *   node check-prod-pages.cjs /student/s19-3 /grammar1/gh1-020 [--chars 1500] [--mobile]
 * Screenshots: docs/qa-2026-09-17/out/prod-<path>.png
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const BASE = "https://k-ig-core.vercel.app";
const PROFILE = path.join(os.tmpdir(), "kig-audit-licensed-profile");
const args = process.argv.slice(2);
const CHARS = args.includes("--chars") ? Number(args[args.indexOf("--chars") + 1]) : 1500;
const MOBILE = args.includes("--mobile");
const CLICK = args.includes("--click") ? args[args.indexOf("--click") + 1] : null; // button text to press first
const paths = args.filter((a, i) => a.startsWith("/") && args[i - 1] !== "--chars" && args[i - 1] !== "--click");

(async () => {
  const browser = await launch({ port: 9390, profile: PROFILE });
  try {
    const tab = await Tab.open(browser.port);
    await tab.viewport(MOBILE ? "mobile" : "desktop");
    for (const p of paths) {
      await tab.send("Page.navigate", { url: BASE + p });
      let state = "";
      for (let i = 0; i < 80 && !state; i++) {
        await sleep(500);
        state = await tab.eval(`document.readyState === 'complete' && document.querySelector('main') ? (document.querySelector('[data-kig-paywall="license"]') ? 'locked' : 'open') : ''`).catch(() => "");
      }
      await sleep(3000);
      if (CLICK) {
        await tab.eval(`(() => { const b = [...document.querySelectorAll('main button')].find((x) => x.innerText.includes(${JSON.stringify(CLICK)})); if (b) b.click(); })()`).catch(() => {});
        await sleep(1000);
      }
      const text = await tab.eval(`(document.querySelector('main') || document.body).innerText`).catch(() => "");
      const shot = await tab.send("Page.captureScreenshot", { format: "png" });
      const file = path.join(__dirname, "../out", `prod-${p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}${MOBILE ? "-mobile" : ""}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log(`\n===== ${p}: ${state || "timeout"} (${text.length} chars) → ${path.basename(file)}\n${text.slice(0, CHARS)}`);
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
})();
