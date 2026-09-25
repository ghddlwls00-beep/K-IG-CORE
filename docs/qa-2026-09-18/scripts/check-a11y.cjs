#!/usr/bin/env node
/**
 * Phase 8 — accessibility measured in the real pages: colour contrast (light AND dark),
 * keyboard reachability and visible focus, touch-target size, headings and landmarks,
 * form labels and image alternatives.
 *
 * Contrast is computed from the pixels' own computed styles: the text colour against the
 * nearest non-transparent background, WCAG 2.1 ratio, with the 4.5:1 (3:1 for large text)
 * thresholds. Buttons and links are measured, not guessed.
 *
 *   node check-a11y.cjs [--pages /,/reading,/reading/pr001,...] [--port 9580]
 * Output: out/a11y.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PAGES = arg("--pages", "/,/reading,/student,/phonics,/grammar1,/grammar2,/ld,/reading/pr001,/reading/pr100,/student/s1-1,/phonics/mv1-01,/grammar1/gh1-006,/grammar2/gh2-007,/ld/d001,/ld/d150").split(",");
const PORT = Number(arg("--port", 9580));
// 2026-09-26 관문 뒤 다시: --out 따로 파일(9/18 a11y.json 을 덮지 않게) · --inject-css 일부러 깨기(이 브라우저 안에서만 글자색 · 초점 표시를 망가뜨림)
const OUTF = arg("--out", path.join(__dirname, "../out/a11y.json"));
const INJECT = arg("--inject-css", "");

const MEASURE = `(() => {
  const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.05) return c; n = n.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  const items = [...document.querySelectorAll('main button, main a[href], main [role=button], main p, main li, main h1, main h2, main h3, main span, header button, header a')].filter(vis).filter((el) => (el.innerText || '').trim().length > 0 && el.children.length === 0);
  const rows = [];
  for (const el of items.slice(0, 400)) {
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const r = ratio(fg, bg);
    const need = large ? 3 : 4.5;
    if (r < need) rows.push({ text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40), tag: el.tagName, ratio: r, need, size, color: cs.color, background: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'inherited' : cs.backgroundColor });
  }
  const controls = [...document.querySelectorAll('main button, main a[href], main input, main select, main textarea, main [role=button]')].filter(vis);
  const small = controls.map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24)).map(({ el, r }) => ({ text: (el.innerText || el.getAttribute('aria-label') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }));
  const unlabeled = controls.filter((el) => !(el.innerText || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby')).map((el) => el.tagName + '.' + String(el.className).slice(0, 30));
  const headings = [...document.querySelectorAll('h1, h2, h3, h4')].filter(vis).map((h) => h.tagName + ':' + (h.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 30));
  const landmarks = { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length, header: document.querySelectorAll('header').length, footer: document.querySelectorAll('footer').length };
  const imgs = [...document.querySelectorAll('img')].map((i) => ({ alt: i.getAttribute('alt'), src: (i.currentSrc || i.src || '').split('/').pop() }));
  return { lowContrast: rows.slice(0, 25), lowContrastCount: rows.length, measured: items.length, smallTargets: small.slice(0, 15), smallTargetCount: small.length, unlabeledControls: unlabeled.slice(0, 10), headings: headings.slice(0, 12), landmarks, imagesWithoutAlt: imgs.filter((i) => i.alt === null).length, images: imgs.length };
})()`;

async function keyboard(tab) {
  await tab.eval(`(() => { const el = document.querySelector('main'); if (el) el.setAttribute('tabindex', '-1'); document.body.focus(); })()`).catch(() => {});
  const seen = [];
  let noFocusRing = 0;
  for (let i = 0; i < 40; i++) {
    await tab.key("Tab");
    const info = await tab.eval(`(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 30), ring, inView: r.width > 0 && r.height > 0 };
    })()`).catch(() => null);
    if (!info) continue;
    seen.push(info);
    if (!info.ring) noFocusRing++;
  }
  return { stops: seen.length, withoutVisibleFocus: noFocusRing, sample: seen.slice(0, 10) };
}

(async () => {
  const browser = await H.startBrowser("a11y", PORT);
  const out = { at: new Date().toISOString(), pages: [] };
  try {
    const tab = await H.openTab(browser);
    if (INJECT) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(INJECT)}; document.head.appendChild(s); });` });
    for (const url of PAGES) {
      const course = url.split("/")[1];
      for (const theme of ["light", "dark"]) {
        // layout.tsx reads localStorage "kig:theme" BEFORE prefers-color-scheme, so emulating the
        // media feature alone does nothing when a theme is stored: set both.
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] }).catch(() => {});
        await tab.eval(`(() => { try { localStorage.setItem('kig:theme', ${JSON.stringify(theme)}); } catch (e) {} })()`).catch(() => {});
        await H.setViewport(tab, "desktop");
        await H.load(tab, url, { marker: H.MARKERS[course] || null });
        const applied = await tab.eval("document.documentElement.dataset.theme").catch(() => null);
        if (applied !== theme) { await tab.eval(`localStorage.setItem('kig:theme', ${JSON.stringify(theme)})`).catch(() => {}); await H.load(tab, url, { marker: H.MARKERS[course] || null }); }
        const m = await tab.eval(MEASURE).catch((e) => ({ error: String(e.message).slice(0, 120) }));
        m.themeApplied = await tab.eval("document.documentElement.dataset.theme").catch(() => null);
        const kb = theme === "light" ? await keyboard(tab) : null;
        await H.setViewport(tab, "mobile");
        await H.load(tab, url, { marker: H.MARKERS[course] || null });
        const mob = await tab.eval(MEASURE).catch(() => null);
        out.pages.push({ url, theme, desktop: m, mobile: mob ? { smallTargetCount: mob.smallTargetCount, smallTargets: mob.smallTargets.slice(0, 8), lowContrastCount: mob.lowContrastCount } : null, keyboard: kb });
        console.log(`${url} (${theme}, applied ${m.themeApplied}) — low contrast ${m.lowContrastCount ?? "?"} of ${m.measured ?? "?"} · <24px targets desktop ${m.smallTargetCount ?? "?"} / mobile ${mob ? mob.smallTargetCount : "?"} · unlabeled ${m.unlabeledControls ? m.unlabeledControls.length : "?"} · img no alt ${m.imagesWithoutAlt}/${m.images}` + (kb ? ` · keyboard stops ${kb.stops}, no focus ring ${kb.withoutVisibleFocus}` : ""));
      }
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  out.injectCss = INJECT || undefined;
  fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
  console.log(`→ ${OUTF}`);
  const worst = out.pages.flatMap((p) => (p.desktop.lowContrast || []).map((r) => ({ url: p.url, theme: p.theme, ...r }))).sort((a, b) => a.ratio - b.ratio).slice(0, 20);
  console.log("\nworst contrast:");
  for (const w of worst) console.log(`  ${w.ratio}:1 (needs ${w.need}) ${w.theme} ${w.url} · ${w.tag} "${w.text}" ${w.color} on ${w.background}`);
})();
