#!/usr/bin/env node
/**
 * Phase 4 — the 5 lesson recordings audio-check.cjs could not fetch with a LIFE
 * licence: what does the learner get when pressing the main play button?
 * Records the player's src, every audio/speech request with its status, and the
 * player's visible state 6 s after pressing play. READ-ONLY (play/stop only).
 * Output: out/missing-audio.json
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const BASE = "https://k-ig-core.vercel.app";
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ["/student/s10-4", "/student/s10-5", "/grammar1/gh1-020"];

(async () => {
  const browser = await launch({ port: 9374, profile: path.join(os.tmpdir(), "kig-audit-licensed-profile") });
  const tab = await Tab.open(browser.port);
  await tab.viewport("desktop");
  const statuses = [];
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (m) => {
    if (m.method === "Network.responseReceived" && /\/(audio|media)\//.test(m.params.response.url)) statuses.push([m.params.response.url.replace(BASE, ""), m.params.response.status]);
    orig(m);
  };
  tab.ws.onmessage = (ev) => tab.onMessage(JSON.parse(ev.data));
  const out = {};
  for (const url of PAGES) {
    statuses.length = 0;
    await tab.send("Page.navigate", { url: BASE + url });
    for (let i = 0; i < 150; i++) { if (await tab.eval(`location.href.startsWith(${JSON.stringify(BASE + url)}) && document.readyState === 'complete' && !!document.querySelector('main')`).catch(() => false)) break; await sleep(200); }
    await sleep(4000);
    const before = await tab.eval(`(() => { const a = [...document.querySelectorAll('main audio')].map(x => ({ src: x.currentSrc || x.src, error: x.error ? x.error.code : null, networkState: x.networkState })); const b = document.querySelector('main button[aria-label="재생"]'); return { audios: a, playButton: !!b, playerText: b ? (b.closest('div.rounded-3xl, div.rounded-2xl, section') || b.parentElement).innerText.replace(/\\s+/g,' ').slice(0, 200) : null }; })()`);
    await tab.eval(`(() => { const b = document.querySelector('main button[aria-label="재생"]'); if (b) b.click(); })()`);
    await sleep(6000);
    const after = await tab.eval(`(() => { const a = [...document.querySelectorAll('main audio')].map(x => ({ src: x.currentSrc || x.src, paused: x.paused, currentTime: x.currentTime, error: x.error ? x.error.code : null })); const stop = document.querySelector('main button[aria-label="일시정지"], main button[aria-label="정지"]'); const b = document.querySelector('main button[aria-label="재생"], main button[aria-label="일시정지"]'); return { audios: a, playingControlShown: !!stop, playerText: b ? (b.closest('div.rounded-3xl, div.rounded-2xl, section') || b.parentElement).innerText.replace(/\\s+/g,' ').slice(0, 200) : null }; })()`);
    await tab.eval(`(() => { const b = document.querySelector('main button[aria-label="일시정지"], main button[aria-label="정지"]'); if (b) b.click(); })()`).catch(() => {});
    out[url] = { before, after, mediaResponses: [...statuses] };
    console.log(url, JSON.stringify(out[url], null, 1));
  }
  fs.writeFileSync(path.join(__dirname, `../out/${process.argv.slice(2).length ? "player-probe" : "missing-audio"}.json`), JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
  await tab.close();
  browser.proc.kill();
})();
