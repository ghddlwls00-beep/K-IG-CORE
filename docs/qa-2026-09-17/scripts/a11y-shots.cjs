#!/usr/bin/env node
/**
 * Phase 6 — screenshots of the elements the contrast scan flagged, so a person
 * (and this audit) can see whether the text is really unreadable or the scan's
 * background guess was wrong. Output: out/a11y-shots/*.png
 */
const fs = require("fs");
const path = require("path");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const BASE = "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out/a11y-shots");
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ["home-dark-start", "/", "dark", "학습 시작하기"],
  ["home-light-stage", "/", "light", "CURRICULUM"],
  ["voca-dark-listen", "/phonics/mv1-01", "dark", "발음 청취"],
  ["voca-light-gold", "/phonics/mv1-01", "light", "K-IG VOCA COGNITIVE MASTERY"],
  ["ld-dark-step", "/ld/d001", "dark", "전체 본문 듣기"],
  ["cnn-light-headline", "/cnn/cnn001", "light", "국문 헤드라인"],
  ["student-light-reveal", "/student/s1-1", "light", "클릭하여 보기"],
];

(async () => {
  const browser = await launch({ port: 9368 });
  const tab = await Tab.open(browser.port);
  await tab.viewport("desktop");
  for (const [name, url, scheme, text] of SHOTS) {
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    await tab.send("Page.navigate", { url: BASE + url });
    const end = Date.now() + 30000;
    while (Date.now() < end) { if (await tab.eval(`document.readyState === 'complete' && !!document.querySelector('main') && document.body.innerText.includes(${JSON.stringify(text)})`).catch(() => false)) break; await sleep(200); }
    await sleep(1500);
    const rect = await tab.eval(`(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.textContent.includes(${JSON.stringify(text)})) { const el = n.parentElement.closest('button, a, div, span, p') || n.parentElement; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: r.x, y: r.y, w: r.width, h: r.height, color: s.color, bg: s.backgroundColor, bgImage: s.backgroundImage.slice(0, 80), themeAttr: document.documentElement.getAttribute('data-theme'), htmlClass: document.documentElement.className }; } } return null; })()`);
    if (!rect) { console.log(name, "text not found"); continue; }
    await sleep(400);
    const r2 = await tab.eval(`(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.textContent.includes(${JSON.stringify(text)})) { const r = (n.parentElement.closest('button, a, div, span, p') || n.parentElement).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; } } return null; })()`);
    const pad = 40;
    const clip = { x: Math.max(0, r2.x - pad), y: Math.max(0, r2.y - pad), width: Math.min(1366, r2.w + pad * 2), height: Math.min(600, r2.h + pad * 2), scale: 1 };
    const shot = await tab.send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));
    console.log(name, JSON.stringify(rect));
  }
  await tab.close();
  browser.proc.kill();
})();
