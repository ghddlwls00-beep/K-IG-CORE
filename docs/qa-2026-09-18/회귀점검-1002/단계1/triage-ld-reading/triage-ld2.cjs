// d172 desktop · Step 3: walk every line, press the 'dreamed of' · 'not in' · 'but in' cards (sweep: clip error 4 during the network drop)
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const OUTF = process.argv[2];
const out = [];
const log = (o) => { out.push(o); console.log(JSON.stringify(o)); };
const STEP = (n) => `[...document.querySelectorAll('main button')].find((b) => new RegExp('^\\\\W*step\\\\s*${n}\\\\b', 'i').test((b.innerText || '').replace(/\\s+/g, ' ').trim()))`;
(async () => {
  const b = await H.startBrowser("rc1002-fin-triage-ld-reading", 9997, { fresh: false });
  const tab = await H.openTab(b, { clean: true });
  try {
    await H.setViewport(tab, "desktop");
    const L = await H.load(tab, "/ld/d172", { marker: H.MARKERS.ld });
    await H.click(tab, STEP(3)); await H.sleep(900);
    const want = ["dreamed of", "not in", "but in"];
    const done = {};
    for (let i = 0; i < 30; i++) {
      if (await tab.eval(`!!document.querySelector('[data-step-panel="3"] [data-action="peek"]')`)) { await H.click(tab, `document.querySelector('[data-step-panel="3"] [data-action="peek"]')`); await H.sleep(600); }
      const line = await tab.eval(`(document.querySelector('[data-step-panel="3"] [data-en]')||{}).innerText || null`);
      const cards = await tab.eval(`[...document.querySelectorAll('[data-step-panel="3"] [data-action="play-card"]')].map(b=>b.getAttribute('aria-label'))`);
      for (const w of want) {
        if (done[w] || !cards.includes(`${w} 듣기`)) continue;
        await H.audioLog(tab, { clear: true });
        const c = await H.click(tab, `document.querySelector('[data-step-panel="3"] [data-action="play-card"][aria-label="${w} 듣기"]')`);
        const exp = H.expectedClip(w);
        let s = {};
        for (let k = 0; k < 24; k++) { s = H.summariseAudio(await H.audioLog(tab)); if (s[exp] && s[exp].playing) break; await H.sleep(250); }
        await tab.eval("window.__kigStop && window.__kigStop()");
        done[w] = { line, clicked: c.ok, exp, clip: s[exp] || null, tts: s.__tts || [] };
        log({ t: "card", w, ...done[w] });
      }
      if (want.every((w) => done[w])) break;
      const nx = await H.click(tab, `document.querySelector('[data-step-panel="3"] [data-action="next-line"]:not([disabled])')`);
      if (!nx.ok) break;
      await H.sleep(500);
    }
    log({ t: "summary", L: L.rendered, done: Object.fromEntries(want.map((w) => [w, !!(done[w] && done[w].clip && done[w].clip.playing && !done[w].clip.error)])), ev: H.events(tab) });
  } catch (e) { log({ t: "ERROR", msg: String(e && e.stack || e) }); }
  finally { b.proc.kill(); fs.writeFileSync(OUTF, out.map((o) => JSON.stringify(o)).join("\n") + "\n"); }
})();
