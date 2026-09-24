#!/usr/bin/env node
/**
 * Phase 8 (2026-09-18) — performance, MEASURED on production (no estimates).
 * Adapted from docs/qa-2026-09-17/scripts/measure-perf.cjs: CNN removed, course lists added,
 * licensed runs use a clone of the audit profile (lib/profile.cjs), output split anon/licensed.
 *
 * Pages: home, a course list, the free lesson of each of the 7 lesson views and,
 * with --licensed (audit profile, only when the sweep is not using it), one paid
 * lesson per course so the heavier licensed render is measured too.
 *
 * Conditions (each page, median of --runs, cache disabled, fresh tab):
 *   desktop  1366×900, no throttling
 *   4g-phone 390×844, 9 Mbps down / 1.5 Mbps up / 170 ms RTT, CPU ×4
 *   slow-3g  390×844, 400 kbps / 400 ms RTT, CPU ×4 (the earlier audit's PERF-01 profile)
 *
 * Metrics from the page's own Performance APIs: TTFB, FCP, LCP (+ element),
 * CLS (layout-shift sum without recent input), TBT (sum of long-task time over
 * 50 ms after FCP, until 5 s after load), load event, requests, transferred KB
 * (all / JS / media), and whether the page reloaded itself (licence cookie).
 *
 *   node measure-perf.cjs [--runs 3] [--licensed] [--only 4g-phone]
 * Output: out/perf.json and a table.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
// 7단계 7-3: BASE 로 로컬 운영 빌드(next build · next start)도 잰다 · --tag 로 결과 파일 이름을 따로(운영 기록을 덮지 않게)
const BASE = (process.env.BASE || "https://k-ig-core.vercel.app").replace(/\/$/, "");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const RUNS = Number(arg("--runs", 3));
const LICENSED = process.argv.includes("--licensed");
const ONLY = arg("--only", null);

const FREE = ["/", "/student", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading", "/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001"]; // CNN excluded (retired)
const PAID = ["/student/s10-1", "/phonics/hv-48", "/grammar1/gh1-058", "/grammar2/gh2-030", "/ld/d150", "/reading/pr100", "/student/s20-5", "/ld/d276", "/reading/pr256"];
const CONDITIONS = {
  desktop: { viewport: "desktop", net: null, cpu: 1 },
  "4g-phone": { viewport: "mobile", net: { latency: 170, downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (1500 * 1024) / 8 }, cpu: 4 },
  "slow-3g": { viewport: "mobile", net: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 }, cpu: 4 },
};

const OBSERVE = `(() => {
  window.__perf = { lcp: null, lcpEl: null, cls: 0, longTasks: [] };
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__perf.lcp = e.startTime; window.__perf.lcpEl = e.element ? (e.element.tagName + (e.element.id ? '#' + e.element.id : '') + ' ' + (e.element.innerText || e.url || '').slice(0, 30)) : (e.url || '').split('/').pop(); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.longTasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
})()`;

const COLLECT = `(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcpE = performance.getEntriesByName('first-contentful-paint')[0];
  const fcp = fcpE ? fcpE.startTime : null;
  const res = performance.getEntriesByType('resource');
  const kb = (list) => Math.round(list.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
  const tbt = window.__perf.longTasks.filter(([s]) => fcp === null || s >= fcp).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
  return {
    ttfb: Math.round(nav.responseStart), fcp: fcp && Math.round(fcp), lcp: window.__perf.lcp && Math.round(window.__perf.lcp), lcpEl: window.__perf.lcpEl,
    cls: Math.round(window.__perf.cls * 1000) / 1000, tbt: Math.round(tbt), load: Math.round(nav.loadEventEnd),
    requests: res.length + 1, kb: kb(res) + Math.round((nav.transferSize || 0) / 1024), jsKb: kb(res.filter((r) => /\\.js(\\?|$)/.test(r.name))), mediaKb: kb(res.filter((r) => /\\/(audio|media|images)\\//.test(r.name))),
    navType: nav.type,
    timeOrigin: Math.round(performance.timeOrigin),
  };
})()`;

async function measure(browser, url, cond) {
  const tab = await Tab.open(browser.port);
  await tab.viewport(cond.viewport);
  await tab.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (cond.net) await tab.send("Network.emulateNetworkConditions", { offline: false, ...cond.net });
  await tab.send("Emulation.setCPUThrottlingRate", { rate: cond.cpu });
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVE });
  let navigations = 0;
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (m) => { if (m.method === "Page.frameNavigated" && !m.params.frame.parentId) navigations++; orig(m); };
  tab.ws.onmessage = (ev) => tab.onMessage(JSON.parse(ev.data));
  const t0 = Date.now();
  await tab.send("Page.navigate", { url: BASE + url });
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    if (await tab.eval(`location.href.startsWith(${JSON.stringify(BASE + url)}) && document.readyState === 'complete'`).catch(() => false)) break;
    await sleep(250);
  }
  await sleep(5000); // LCP / long tasks settle; a licence-cookie reload would happen in here
  const m = await tab.eval(COLLECT).catch((e) => ({ error: e.message }));
  m.wall = Date.now() - t0;
  m.selfReloaded = navigations > 1;
  // LCP counted from the moment navigation was requested, INCLUDING a licence-cookie
  // reload (the final document's timeOrigin is later than t0 when the page reloaded).
  if (m.lcp && m.timeOrigin) m.lcpFromRequest = m.timeOrigin + m.lcp - t0;
  await tab.close();
  return m;
}

(async () => {
  const PAGES_ARG = arg("--pages", null); // comma list, e.g. "/,/reading/pr100"
  const pages = PAGES_ARG ? PAGES_ARG.split(",") : LICENSED ? [...FREE, ...PAID] : FREE;
  const browser = await launch({ port: 9371, profile: LICENSED ? require("./lib/profile.cjs").cloneProfile("perf") : undefined });
  const out = [];
  try {
    for (const [name, cond] of Object.entries(CONDITIONS)) {
      if (ONLY && ONLY !== name) continue;
      for (const url of pages) {
        const runs = [];
        for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, url, cond));
        const med = (k) => { const v = runs.map((r) => r[k]).filter((x) => typeof x === "number").sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
        const row = { condition: name, url, paid: PAID.includes(url), runs: RUNS, ttfb: med("ttfb"), fcp: med("fcp"), lcp: med("lcp"), cls: med("cls"), tbt: med("tbt"), load: med("load"), requests: med("requests"), kb: med("kb"), jsKb: med("jsKb"), mediaKb: med("mediaKb"), lcpFromRequest: med("lcpFromRequest"), lcpEl: runs.map((r) => r.lcpEl).filter(Boolean)[0] || null, selfReloaded: runs.some((r) => r.selfReloaded), raw: runs };
        out.push(row);
        console.log(`${name.padEnd(8)} ${url.padEnd(20)} TTFB ${row.ttfb} · FCP ${row.fcp} · LCP ${row.lcp} (${row.lcpEl}) · CLS ${row.cls} · TBT ${row.tbt} · load ${row.load} · ${row.requests} req · ${row.kb} KB (JS ${row.jsKb})${row.selfReloaded ? " · reloaded" : ""} · LCP from request ${row.lcpFromRequest}`);
      }
    }
  } finally {
    browser.proc.kill();
  }
  const TAG = arg("--tag", "");
  const outFile = path.join(__dirname, `../out/perf${LICENSED ? "-licensed" : "-anon"}${ONLY ? `-${ONLY}` : ""}${TAG ? `-${TAG}` : ""}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ at: new Date().toISOString(), base: BASE, licensed: LICENSED, results: out }, null, 1));
})();

