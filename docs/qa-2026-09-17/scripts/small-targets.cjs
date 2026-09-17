#!/usr/bin/env node
/**
 * Phase 6 — WHICH controls are smaller than 24×24 CSS px (WCAG 2.2 SC 2.5.8
 * Target Size (Minimum)), per lesson template on a 390 px phone, every step.
 * The sweep only counts them; this names them. SC 2.5.8 exempts a target whose
 * 24 px circle does not overlap another target ("spacing" exception) and inline
 * text links — both are computed/flagged here rather than assumed.
 * Output: out/small-targets.json
 */
const fs = require("fs");
const path = require("path");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const BASE = "https://k-ig-core.vercel.app";
const PAGES = ["/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001"];

const LIST = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const els = [...document.querySelectorAll('main button, main a[href], main input:not([type=hidden]), main select, main textarea, main [role=button]')].filter(vis);
  const rects = els.map((el) => el.getBoundingClientRect());
  const out = [];
  els.forEach((el, i) => {
    const r = rects[i];
    if (r.width >= 24 && r.height >= 24) return;
    const inlineLink = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const crowded = rects.some((q, j) => j !== i && Math.hypot((q.x + q.width / 2) - cx, (q.y + q.height / 2) - cy) < 24);
    out.push({ label: ((el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || el.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), inlineLink, crowded });
  });
  return out;
})()`;

(async () => {
  const browser = await launch({ port: 9373 });
  const tab = await Tab.open(browser.port);
  await tab.viewport("mobile");
  const result = {};
  for (const url of PAGES) {
    await tab.send("Page.navigate", { url: BASE + url });
    for (let i = 0; i < 150; i++) { if (await tab.eval(`location.href.startsWith(${JSON.stringify(BASE + url)}) && document.readyState === 'complete' && !!document.querySelector('main')`).catch(() => false)) break; await sleep(200); }
    await sleep(2500);
    const steps = await tab.eval(`[...document.querySelectorAll('main button')].filter(b => b.offsetParent && /(step|STEP)\\s*\\d/i.test(b.innerText)).map(b => b.innerText.replace(/\\s+/g,' ').trim()).filter(l => !/^(다음|←|→|이전)/.test(l) && !/(이동|하러 가기)\\s*→?$/.test(l)).slice(0, 6)`).catch(() => []);
    const perStep = [{ step: "(initial)", items: await tab.eval(LIST).catch((e) => [{ error: e.message }]) }];
    for (const label of steps) {
      await tab.eval(`(() => { const b = [...document.querySelectorAll('main button')].find(x => x.innerText.replace(/\\s+/g,' ').trim() === ${JSON.stringify(label)}); if (b) b.click(); })()`).catch(() => {});
      await sleep(1200);
      perStep.push({ step: label, items: await tab.eval(LIST).catch((e) => [{ error: e.message }]) });
    }
    result[url] = perStep;
    const all = perStep.flatMap((s) => s.items);
    const groups = {};
    for (const it of all) { const k = `${it.label} ${it.w}×${it.h}${it.crowded ? " crowded" : ""}${it.inlineLink ? " inline" : ""}`; groups[k] = (groups[k] || 0) + 1; }
    console.log(`\n${url}: ${all.length} small (crowded ${all.filter((i) => i.crowded).length})`);
    for (const [k, n] of Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(n).padStart(3)} × ${k}`);
  }
  fs.writeFileSync(path.join(__dirname, "../out/small-targets.json"), JSON.stringify({ at: new Date().toISOString(), result }, null, 1));
  await tab.close();
  browser.proc.kill();
})();
