#!/usr/bin/env node
/**
 * Focused check for the sweep's most repeated audio failure: the lesson page's top player
 * ("▶ 재생 버튼을 눌러 전체 듣기") requesting no clip at all on the first view.
 *
 * Presses it, waits 8 s, records every media request and TTS call, then presses it again.
 *   node check-top-player.cjs [--ids /reading/pr005,/ld/d005,...] [--port 9590]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const URLS = arg("--ids", "/reading/pr005,/reading/pr100,/ld/d005,/grammar2/gh2-010,/phonics/mv1-05,/student/s2-1,/grammar1/gh1-010").split(",");
const PORT = Number(arg("--port", 9590));

const BUTTON = `[...document.querySelectorAll('main button, header button')].find((b) => /재생/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`;
// 2026-09-27 (GRAMMAR 학습법 · 화면 고침 — GRM-L03 ④): in GRAMMAR the top player reads every English answer, so it waits folded
// under '정답 문장 전체 듣기' (details[data-answer-player]); its play button has no offsetParent until that is opened.
// UI검토-1007 4장 7 (2026-10-08 · tools-c): that page-level fold is hidden now (display:none); the view's own sits at the end of Step 3
// (and of Step 4 after grading) — GRAMMAR goes to Step 3 first and opens the view's fold (lib/ui-1008.cjs). It was
// `main details[data-answer-player]:not([open]) > summary` on the first screen. 깨기: KIG_BREAK_APP=1008 → no 재생 found (button null).
const UI = require("./lib/ui-1008.cjs");
const FOLDED_PLAYER = UI.GRAMMAR_PLAYER_FOLDED_SUMMARY;

(async () => {
  const browser = await H.startBrowser("topplayer", PORT);
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    for (const url of URLS) {
      const course = url.split("/")[1];
      await H.load(tab, url, { marker: H.MARKERS[course] });
      if (course === "grammar1" || course === "grammar2") await H.click(tab, `document.querySelector('main [data-step-tab="3"]')`, { settle: 600 });
      if (await tab.eval(`Boolean(${FOLDED_PLAYER})`).catch(() => false)) await H.click(tab, FOLDED_PLAYER, { settle: 300 });
      // 2026-09-28 (READING 순서 바꿈 — D31 다): READING's top player is hidden (A10, since 2026-09-27) and the view plays the same
      // sentences in 원문 대조 — Step 3 now (Step 1 has it only after '다 읽었어요') — so that is the player pressed here.
      if (course === "reading") await H.click(tab, `document.querySelector('main [data-step-tab="3"]')`, { settle: 600 });
      const label = await tab.eval(`(() => { const b = ${BUTTON}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim().slice(0, 60) : null; })()`).catch(() => null);
      const press = async () => {
        await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
        const c = await H.click(tab, BUTTON);
        await H.sleep(8000);
        const log = await H.audioLog(tab);
        return { clicked: c.ok, events: log.map((e) => `${e.ev}${e.src ? " " + e.src.replace(/^https?:\/\/[^/]+/, "") : ""}${e.text ? ' "' + e.text.slice(0, 30) + '"' : ""}`).slice(0, 8) };
      };
      const first = await press();
      const state = await tab.eval(`(() => { const b = ${BUTTON}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim().slice(0, 60) : null; })()`).catch(() => null);
      const second = await press();
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      rows.push({ url, button: label, first, buttonAfterFirst: state, second });
      console.log(JSON.stringify(rows[rows.length - 1], null, 1));
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  // 2026-10-08: --tag <이름> · KIG_BREAK_APP → a file of its own (it was always out/top-player.json)
  const tag = `${arg("--tag", "") ? "-" + arg("--tag", "") : ""}${process.env.KIG_BREAK_APP ? "-break-app" + process.env.KIG_BREAK_APP : ""}`;
  fs.writeFileSync(path.join(__dirname, `../out/top-player${tag}.json`), JSON.stringify({ at: new Date().toISOString(), base: H.BASE, rows }, null, 1));
})();
