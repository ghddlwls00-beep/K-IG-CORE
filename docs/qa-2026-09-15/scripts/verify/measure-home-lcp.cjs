#!/usr/bin/env node
/**
 * PERF-01 — the home page on a slow phone, measured the way the audit did:
 * 390×844, 400 kbps down / 400 ms latency, CPU ×4 slower, cache disabled.
 * Reports FCP, LCP (the element and its resource), load, and bytes of section
 * photos transferred. Median of N runs.
 *
 *   node measure-home-lcp.cjs https://k-ig-core.vercel.app 3
 *   node measure-home-lcp.cjs http://localhost:3210 3
 */
const { launch, Tab, sleep } = require("./cdp.cjs");

const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");
const RUNS = Number(process.argv[3] || 3);

(async () => {
  const browser = await launch({ port: 9370 });
  const results = [];
  try {
    for (let i = 0; i < RUNS; i++) {
      const tab = await Tab.open(browser.port);
      await tab.viewport("mobile");
      await tab.send("Network.setCacheDisabled", { cacheDisabled: true });
      await tab.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 400,
        downloadThroughput: (400 * 1024) / 8,
        uploadThroughput: (400 * 1024) / 8,
      });
      await tab.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await tab.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `window.__lcp = null; new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__lcp = { t: e.startTime, url: (e.url || '').split('/').pop(), el: e.element ? e.element.tagName : null }; }).observe({ type: 'largest-contentful-paint', buffered: true });`,
      });
      await tab.send("Page.navigate", { url: `${BASE}/?run=${Date.now()}` });
      const end = Date.now() + 60000;
      while (Date.now() < end) {
        const ready = await tab.eval("document.readyState").catch(() => "");
        if (ready === "complete") break;
        await sleep(250);
      }
      await sleep(4000);
      const m = await tab.eval(`(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const photos = performance.getEntriesByType('resource').filter((r) => /images\\/sections\\//.test(r.name));
        return { fcp: fcp ? Math.round(fcp.startTime) : null, lcp: window.__lcp ? Math.round(window.__lcp.t) : null,
          lcpResource: window.__lcp?.url || window.__lcp?.el, load: Math.round(nav.loadEventEnd),
          photoKB: Math.round(photos.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024),
          photos: photos.map((r) => r.name.split('/').pop()).join(',') };
      })()`);
      results.push(m);
      console.log(`run ${i + 1}: ${JSON.stringify(m)}`);
      await tab.close();
    }
  } finally {
    browser.proc.kill();
  }
  const med = (k) => results.map((r) => r[k]).filter((v) => typeof v === "number").sort((a, b) => a - b)[Math.floor(results.length / 2)];
  console.log(`\n${BASE}  median of ${RUNS}: FCP ${med("fcp")} ms, LCP ${med("lcp")} ms, load ${med("load")} ms, section photos ${med("photoKB")} KB`);
})();
