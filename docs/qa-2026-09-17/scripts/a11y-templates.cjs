#!/usr/bin/env node
/**
 * Phase 6 — accessibility of each lesson TEMPLATE (the 7 lesson views), plus the
 * home page and a course list. Paid lessons use the same components as the free
 * ones, so the free lesson of each course is used here (a fresh profile — the
 * licensed audit profile is busy with the sweep). The per-lesson checks that do
 * depend on content (overflow, unlabeled fields, small targets, alt text) are in
 * the licensed sweep.
 *
 * Per page × {desktop 1366, mobile 390} × {light, dark}:
 *   contrast   — every visible text node's colour against its effective
 *                background (first opaque ancestor background); WCAG AA 4.5:1,
 *                3:1 for large text (≥24px, or ≥18.66px bold). Gradients/images
 *                behind text are reported as "unknown", not as pass.
 *   names      — buttons/links/inputs with no accessible name, or a name made
 *                only of emoji/symbols (a screen reader reads "speaker" or nothing)
 *   structure  — <html lang>, <title>, <main>, one <h1>
 *   keyboard   — 30 Tab presses: does focus move, land on visible elements, and
 *                show a visible indicator (outline or box-shadow change)
 *
 * Output: out/a11y-templates.json and a summary table.
 */
const fs = require("fs");
const path = require("path");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const BASE = "https://k-ig-core.vercel.app";

const PAGES = ["/", "/reading", "/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001", "/cnn/cnn001"];

const AUDIT = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  // Any CSS colour (rgb, lab, oklch, color-mix…) → sRGB via a 1×1 canvas; alpha read separately.
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => { if (!c || c === 'transparent') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== 'none') return 'image'; const c = parse(s.backgroundColor); if (c && c.a >= 0.95) return c; } return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; };
  const fails = []; let checked = 0; let unknown = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t || !/[\\p{L}\\p{N}]/u.test(t)) continue;
    const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el);
    const s = getComputedStyle(el); const fg = parse(s.color); if (!fg) continue;
    const bg = bgOf(el); if (bg === 'image' || fg.a < 0.95) { unknown++; continue; }
    checked++;
    const size = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r < need) fails.push({ text: t.slice(0, 40), ratio: Math.round(r * 100) / 100, need, size, cls: (el.className && el.className.toString ? el.className.toString() : '').split(' ').filter((c) => /text-|opacity/.test(c)).slice(0, 4).join(' ') });
  }
  const controls = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')].filter(vis);
  const nameOf = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.innerText) || el.innerText || el.value || el.getAttribute('title') || el.getAttribute('placeholder') || (el.querySelector('img[alt]') || {}).alt || '').trim();
  const noName = controls.filter((el) => !nameOf(el)).map((el) => el.outerHTML.slice(0, 90));
  const symbolOnly = controls.filter((el) => { const nm = nameOf(el); return nm && !/[\\p{L}\\p{N}]/u.test(nm); }).map((el) => nameOf(el).slice(0, 12));
  return {
    lang: document.documentElement.lang, title: document.title, mains: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length,
    contrast: { checked, unknown, failCount: fails.length, samples: fails.slice(0, 8) },
    controls: controls.length, noName: noName.slice(0, 6), noNameCount: noName.length, symbolOnly: [...new Set(symbolOnly)].slice(0, 10), symbolOnlyCount: symbolOnly.length,
  };
})()`;

const FOCUS = `(() => { const el = document.activeElement; if (!el || el === document.body) return null; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { tag: el.tagName, name: (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 24), visible: r.width > 0 && r.height > 0 && r.bottom > -1 && r.top < innerHeight * 3, outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== 'none' }; })()`;

(async () => {
  const browser = await launch({ port: 9367 });
  const tab = await Tab.open(browser.port);
  const results = [];
  for (const url of PAGES) {
    for (const viewport of ["desktop", "mobile"]) {
      for (const scheme of ["light", "dark"]) {
        await tab.viewport(viewport);
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
        await tab.send("Page.navigate", { url: "about:blank" });
        await sleep(300);
        await tab.send("Page.navigate", { url: BASE + url });
        const end = Date.now() + 30000;
        while (Date.now() < end) { if (await tab.eval(`location.href.startsWith(${JSON.stringify(BASE + url)}) && document.readyState === 'complete' && !!document.querySelector('main')`).catch(() => false)) break; await sleep(200); }
        await sleep(1800);
        const audit = await tab.eval(AUDIT).catch((e) => ({ error: e.message }));
        let keyboard = null;
        if (scheme === "light") {
          await tab.eval("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)").catch(() => {});
          const stops = [];
          for (let i = 0; i < 30; i++) { await tab.key("Tab"); await sleep(60); stops.push(await tab.eval(FOCUS).catch(() => null)); }
          const real = stops.filter(Boolean);
          keyboard = { stops: real.length, distinct: new Set(real.map((s) => s.tag + s.name)).size, invisible: real.filter((s) => !s.visible).length, noIndicator: real.filter((s) => !s.outline && !s.shadow).length, noIndicatorSamples: [...new Set(real.filter((s) => !s.outline && !s.shadow).map((s) => `${s.tag}:${s.name}`))].slice(0, 6) };
        }
        results.push({ url, viewport, scheme, audit, keyboard });
        console.log(`${url} ${viewport} ${scheme}: contrast fail ${audit.contrast ? audit.contrast.failCount + "/" + audit.contrast.checked : audit.error} · noName ${audit.noNameCount} · symbolOnly ${audit.symbolOnlyCount}${keyboard ? ` · tab stops ${keyboard.stops} noIndicator ${keyboard.noIndicator} invisible ${keyboard.invisible}` : ""}`);
      }
    }
  }
  fs.writeFileSync(path.join(__dirname, "../out/a11y-templates.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
  await tab.close();
  browser.proc.kill();
})();
