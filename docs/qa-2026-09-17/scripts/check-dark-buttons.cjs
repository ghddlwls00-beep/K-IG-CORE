#!/usr/bin/env node
/**
 * ISS-16 / UX-01 — buttons and badges drawn with `bg-ink` (dark in light mode, LIGHT in
 * dark mode): is their own text and icon colour readable against that background?
 *
 * Opens each page in light and dark (prefers-color-scheme emulation), clicks through the
 * lesson's step tabs so every step's buttons render, and for every visible element whose
 * class list has the token `bg-ink`, measures the contrast of the element's text/icon
 * colour — and of every descendant that paints text or an SVG — against the element's
 * background. WCAG: text 4.5:1 (icons 3:1; this uses 4.5 for both, stricter).
 *
 *   node check-dark-buttons.cjs [--base http://localhost:3210]
 * Output: out/dark-buttons<-local|>.json. Exit 1 if any measured pair is below 4.5.
 * Not covered: the admin screen (needs the owner's PIN) and hover-only states — those
 * are checked in the source (no `bg-ink` element keeps `text-white`; hover backgrounds
 * are `hover:opacity-90`, so the colours do not change on hover).
 */
const fs = require("fs");
const path = require("path");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BASE = arg("--base", "https://k-ig-core.vercel.app");
const PAGES = ["/", "/reading/pr001", "/ld/d001", "/phonics/mv1-01", "/grammar1/gh1-006", "/student/s1-1", "/no-such-page-for-404-check"];

const MEASURE = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => { if (!c || c === 'transparent') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const out = [];
  for (const el of document.querySelectorAll('[class]')) {
    const cls = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
    if (!/(^|\\s)bg-ink(\\s|$)/.test(cls) || !vis(el)) continue;
    const bg = parse(getComputedStyle(el).backgroundColor);
    if (!bg || bg.a < 0.95) continue;
    const painters = [el, ...el.querySelectorAll('*')].filter((n) => vis(n) && (n.tagName === 'svg' || [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())));
    for (const n of painters) {
      const s = getComputedStyle(n);
      const colorStr = n.tagName === 'svg' ? (s.fill && s.fill !== 'none' ? s.fill : s.color) : s.color;
      const fg = parse(colorStr);
      if (!fg) continue;
      const r = ratio(blend(fg, bg), bg);
      out.push({ label: ((el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ')).slice(0, 30), part: n === el ? 'self' : n.tagName.toLowerCase(), bg: getComputedStyle(el).backgroundColor, fg: colorStr, ratio: Math.round(r * 100) / 100 });
    }
  }
  return { theme: document.documentElement.getAttribute('data-theme'), items: out };
})()`;

const STEP_TABS = `(() => [...document.querySelectorAll('button')].filter((b) => /STEP\\s*\\d|Step\\s*\\d/.test(b.textContent) && b.getBoundingClientRect().width > 0).map((b, i) => i))()`;
const CLICK_STEP = (i) => `(() => { const bs = [...document.querySelectorAll('button')].filter((b) => /STEP\\s*\\d|Step\\s*\\d/.test(b.textContent) && b.getBoundingClientRect().width > 0); if (bs[${i}]) { bs[${i}].click(); return true; } return false; })()`;

(async () => {
  const browser = await launch({ port: 9375 });
  const tab = await Tab.open(browser.port);
  const results = [];
  let fails = 0, measured = 0;
  try {
    for (const url of PAGES) {
      for (const scheme of ["light", "dark"]) {
        await tab.viewport("desktop");
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
        await tab.send("Page.navigate", { url: "about:blank" });
        await sleep(300);
        await tab.send("Page.navigate", { url: BASE + url });
        const end = Date.now() + 30000;
        while (Date.now() < end) { if (await tab.eval(`document.readyState === 'complete' && !!document.body`).catch(() => false)) break; await sleep(200); }
        await sleep(1800);
        const seen = new Map();
        const collect = async (where) => {
          const m = await tab.eval(MEASURE).catch((e) => ({ error: e.message, items: [] }));
          for (const it of m.items) {
            const key = `${it.label}|${it.part}|${it.fg}|${it.bg}`;
            if (!seen.has(key)) seen.set(key, { ...it, where, theme: m.theme });
          }
        };
        await collect("initial");
        const tabs = await tab.eval(STEP_TABS).catch(() => []);
        for (const i of tabs) {
          await tab.eval(CLICK_STEP(i)).catch(() => false);
          await sleep(700);
          await collect(`step ${i + 1}`);
        }
        const items = [...seen.values()];
        const bad = items.filter((x) => x.ratio < 4.5);
        measured += items.length;
        fails += bad.length;
        results.push({ url, scheme, theme: items[0] && items[0].theme, measured: items.length, min: items.length ? Math.min(...items.map((x) => x.ratio)) : null, bad });
        console.log(`${url} ${scheme}: bg-ink parts ${items.length}, min ${items.length ? Math.min(...items.map((x) => x.ratio)) : "-"}, below 4.5: ${bad.length}${bad.length ? " e.g. " + bad.slice(0, 3).map((b) => `${b.label}(${b.part}) ${b.ratio}`).join("; ") : ""}`);
      }
    }
  } finally {
    await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const suffix = BASE.includes("localhost") ? "-local" : "";
  fs.writeFileSync(path.join(__dirname, `../out/dark-buttons${suffix}.json`), JSON.stringify({ at: new Date().toISOString(), base: BASE, measured, fails, results }, null, 1));
  console.log(`measured ${measured}, below 4.5: ${fails}`);
  process.exit(fails ? 1 : 0);
})();
