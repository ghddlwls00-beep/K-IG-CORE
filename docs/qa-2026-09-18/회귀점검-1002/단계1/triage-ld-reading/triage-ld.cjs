// triage-ld-reading: re-open the LISTENING pages behind the sweep's FAIL / RETEST / network lines on production
// (licensed clone rc1002-fin-triage-ld-reading · one browser · port 9997). Reads + plays only; no completion pressed.
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const OUTF = process.argv[2];
const out = [];
const log = (o) => { out.push(o); console.log(JSON.stringify(o)); };

const STEP = (n) => `[...document.querySelectorAll('main button')].find((b) => new RegExp('^\\\\W*step\\\\s*${n}\\\\b', 'i').test((b.innerText || '').replace(/\\s+/g, ' ').trim()))`;
async function step(tab, n) { const r = await H.click(tab, STEP(n)); await H.sleep(900); return r.ok; }
async function peekIfHidden(tab, n) {
  const sel = `document.querySelector('[data-step-panel="${n}"] [data-action="peek"]')`;
  if (await tab.eval(`!!${sel}`)) { await H.click(tab, sel); await H.sleep(700); return true; }
  return false;
}
async function press(tab, expr, wantPath, waitMs = 6000) {
  await H.audioLog(tab, { clear: true });
  const c = await H.click(tab, expr);
  if (!c.ok) return { clicked: false, reason: c.reason };
  const end = Date.now() + waitMs;
  let clips = {};
  while (Date.now() < end) {
    clips = H.summariseAudio(await H.audioLog(tab));
    if (wantPath && clips[wantPath] && clips[wantPath].playing) break;
    await H.sleep(250);
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  return { clicked: true, text: c.text, clips };
}

(async () => {
  const b = await H.startBrowser("rc1002-fin-triage-ld-reading", 9997, { fresh: true });
  const tab = await H.openTab(b, { clean: true });
  try {
    // A. d172 desktop — Step 3 소리클리닉 cards 'dreamed of' · 'not in' · 'but in' (sweep: clip error 4 + ERR_INTERNET_DISCONNECTED)
    await H.setViewport(tab, "desktop");
    let L = await H.load(tab, "/ld/d172", { marker: H.MARKERS.ld });
    log({ t: "A load", L });
    await step(tab, 3);
    await peekIfHidden(tab, 3);
    const labels = ["dreamed of", "not in", "but in"];
    let found = false;
    for (let i = 0; i < 20; i++) {
      found = await tab.eval(`!!document.querySelector('[data-step-panel="3"] [data-action="play-card"][aria-label="dreamed of 듣기"]')`);
      if (found) break;
      const hidden = await tab.eval(`!!document.querySelector('[data-step-panel="3"] [data-action="peek"]')`);
      if (hidden) { await peekIfHidden(tab, 3); continue; }
      const nx = await H.click(tab, `document.querySelector('[data-step-panel="3"] [data-action="next-line"]:not([disabled])')`);
      if (!nx.ok) break;
      await H.sleep(500);
    }
    log({ t: "A cards found", found, line: await tab.eval(`(document.querySelector('[data-step-panel="3"] [data-en]')||{}).innerText || null`), cards: await tab.eval(`[...document.querySelectorAll('[data-step-panel="3"] [data-action="play-card"]')].map(b=>b.getAttribute('aria-label'))`) });
    for (const w of labels) {
      const want = new URL(H.BASE + "/audio/azure-ava/v1/x").pathname.replace("x", "") + path.basename(H.expectedClip(w));
      const r = await press(tab, `document.querySelector('[data-step-panel="3"] [data-action="play-card"][aria-label="${w} 듣기"]')`, H.expectedClip(w));
      log({ t: "A card", w, want: H.expectedClip(w), r });
    }
    log({ t: "A events", ev: H.events(tab) });

    // B. LISTENING Step 1 answer choices the sweep / recheck pressed as sound buttons — are they question options?
    const choices = [
      ["d226", "desktop", "마더 구스 동요는"], ["d246", "desktop", "자기 편 기사의 말조차"],
      ["d226", "small", "마더 구스 동요는"], ["d246", "small", "자기 편 기사의 말조차"],
      ["d273", "small", "어휘 일부는 라틴어에서"], ["d275", "small", "어려운 발음"], ["d105", "small", "사람들에게 익숙한 문장"],
    ];
    for (const [id, vp, needle] of choices) {
      await H.setViewport(tab, vp);
      L = await H.load(tab, `/ld/${id}`, { marker: H.MARKERS.ld });
      const info = await tab.eval(`(() => { const el = [...document.querySelectorAll('main button')].find(b => (b.innerText||'').includes(${JSON.stringify(needle)})); if (!el) return null; return { tag: el.tagName, dataOption: el.getAttribute('data-option'), inQuestion: !!el.closest('[data-question]'), q: (el.closest('[data-question]')||{}).getAttribute ? el.closest('[data-question]').getAttribute('data-question') : null, text: el.innerText.replace(/\\s+/g,' ').slice(0,80), aria: el.getAttribute('aria-label') }; })()`);
      const r = await press(tab, `[...document.querySelectorAll('main button')].find(b => (b.innerText||'').includes(${JSON.stringify(needle)}))`, null, 4000);
      const after = await tab.eval(`(() => { const el = [...document.querySelectorAll('main button')].find(b => (b.innerText||'').includes(${JSON.stringify(needle)})); const li = el && el.closest('[data-question]'); return li ? { verdict: li.getAttribute('data-verdict'), evidence: [...li.querySelectorAll('[data-action="play-evidence"]')].map(x => x.getAttribute('data-line')) } : null; })()`);
      let ev = null;
      if (after && after.evidence && after.evidence.length) {
        const n = after.evidence[0];
        const line = await tab.eval(`null`);
        ev = await press(tab, `(() => { const el = [...document.querySelectorAll('main button')].find(b => (b.innerText||'').includes(${JSON.stringify(needle)})); const li = el && el.closest('[data-question]'); return li ? li.querySelector('[data-action="play-evidence"]') : null; })()`, null, 6000);
      }
      const reqClips = Object.entries(r.clips || {}).filter(([k]) => k !== "__tts").map(([k, v]) => ({ k, ...v }));
      log({ t: "B choice", id, vp, L: L.rendered, info, clickClips: reqClips, tts: (r.clips || {}).__tts || [], after, evidencePress: ev ? { clicked: ev.clicked, clips: Object.entries(ev.clips || {}).map(([k, v]) => ({ k, play: v.play, resolved: v.resolved, playing: v.playing, error: v.error })) } : null });
    }

    // C. Step 5 sentence rows whose text has 'play' (d005 · d059 · d106) and Step 2 tile 'play' (d106) — what are those buttons?
    await H.setViewport(tab, "desktop");
    for (const [id, needle] of [["d005", "They play basketball"], ["d059", "The play started"], ["d106", "You can't teach an old dog"]]) {
      L = await H.load(tab, `/ld/${id}`, { marker: H.MARKERS.ld });
      await step(tab, 5);
      await peekIfHidden(tab, 5);
      const rowExpr = `[...document.querySelectorAll('[data-step-panel="5"] [data-script] button[data-en]')].find(b => (b.innerText||'').includes(${JSON.stringify(needle)}))`;
      const info = await tab.eval(`(() => { const el = ${rowExpr}; if (!el) return null; const li = el.closest('li'); return { aria: el.getAttribute('aria-expanded'), text: el.innerText.slice(0,120), line: li.getAttribute('data-line'), speaker: (li.querySelector('[data-action="play-row"]')||{}).getAttribute ? li.querySelector('[data-action="play-row"]').getAttribute('aria-label') : null }; })()`);
      const r = await press(tab, rowExpr, null, 3000);
      const afterAria = await tab.eval(`(() => { const el = ${rowExpr}; return el ? { expanded: el.getAttribute('aria-expanded'), ko: !!el.closest('li').querySelector('[data-ko]') } : null; })()`);
      const sp = await press(tab, `(() => { const el = ${rowExpr}; return el ? el.closest('li').querySelector('[data-action="play-row"]') : null; })()`, null, 6000);
      log({ t: "C step5 row", id, info, rowClickClips: Object.keys(r.clips || {}), afterAria, speaker: { clicked: sp.clicked, clips: Object.entries(sp.clips || {}).map(([k, v]) => ({ k, play: v.play, resolved: v.resolved, playing: v.playing, error: v.error })) } });
    }
    // Step 2 tiles 'play' · 'played' · 'plays' (d106-1 desktop)
    L = await H.load(tab, `/ld/d106-1`, { marker: H.MARKERS.ld });
    await step(tab, 2);
    const tiles = await tab.eval(`[...document.querySelectorAll('[data-step-panel="2"] button')].filter(b => /^plays?$|^played$/i.test((b.innerText||'').trim())).map(b => ({ text: b.innerText.trim(), action: b.getAttribute('data-action'), attrs: [...b.attributes].map(a => a.name).join(',') }))`);
    log({ t: "C step2 tiles d106-1", tiles });

    // D. d134-1 · d185-1 desktop — the pages with ERR_INTERNET_DISCONNECTED: load, all five steps, Step 3 cards on the first line
    for (const id of ["d134-1", "d185-1", "d172"]) {
      L = await H.load(tab, `/ld/${id}`, { marker: H.MARKERS.ld });
      const res = [];
      for (const n of [1, 2, 3, 4, 5]) { await step(tab, n); }
      await step(tab, 3);
      await peekIfHidden(tab, 3);
      const cards = await tab.eval(`[...document.querySelectorAll('[data-step-panel="3"] [data-action="play-card"]')].map(b=>b.getAttribute('aria-label'))`);
      for (let i = 0; i < cards.length; i++) {
        const w = cards[i].replace(/ 듣기$/, "");
        const r = await press(tab, `document.querySelectorAll('[data-step-panel="3"] [data-action="play-card"]')[${i}]`, H.expectedClip(w));
        const c = (r.clips || {})[H.expectedClip(w)] || null;
        res.push({ w, ok: !!(c && c.playing && !c.error), c });
      }
      log({ t: "D page", id, L: L.rendered, cards: res, ev: H.events(tab) });
    }
  } catch (e) {
    log({ t: "ERROR", msg: String(e && e.stack || e) });
  } finally {
    try { await tab.close?.(); } catch {}
    b.proc.kill();
    fs.writeFileSync(OUTF, out.map((o) => JSON.stringify(o)).join("\n") + "\n");
  }
})();
