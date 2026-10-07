// UI검토-1007 fix-lesson: before/after shots of the four free lessons (s1-1 · a1-1 · gh1-006 · pr001), phone 390 + desktop 1366.
//   $env:BASE=...; $env:KIG_PROFILE_SOURCE=<empty dir>; $env:KIG_CLONE_PREFIX="kig-uifix-"; node shots.cjs <label> <port>
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const LABEL = process.argv[2] || "before";
const PORT = Number(process.argv[3] || 9961);
const OUT = path.join(REPO, "docs/qa-2026-09-18/UI검토-1007/고침/사진");
const ONLY_SUFFIX = process.env.SHOTS_ONLY ? `-${process.env.SHOTS_ONLY}` : '';
fs.mkdirSync(OUT, { recursive: true });

const END = `document.querySelector('section[aria-label="강의 마치기"]')`;
const STATE = `(() => {
  const end = ${END};
  const dark = (el) => { if (!el) return null; const c = getComputedStyle(el).backgroundColor; const m = c.match(/\\d+/g); return m ? (Number(m[0]) + Number(m[1]) + Number(m[2]) < 150 && (m[3] === undefined || Number(m[3]) > 0)) : false; };
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const main = document.querySelector('main');
  if (!main) return { noMain: true, href: location.href, body: (document.body ? document.body.innerText : '').slice(0, 200) };
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const filled = [...main.querySelectorAll('button, a')].filter((el) => vis(el) && onScreen(el) && dark(el)).map((el) => (el.getAttribute('aria-label') || el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 50) + (el.disabled ? ' (disabled)' : ''));
  const complete = [...main.querySelectorAll('button')].filter((b) => /^학습 완료 (체크|취소)$/.test(b.getAttribute('aria-label') || '')).map((b) => ({ where: b.closest('section[aria-label="강의 마치기"]') ? 'endbar' : (b.closest('[data-completion]') ? 'view-box' : 'other'), aria: b.getAttribute('aria-label'), text: (b.innerText || '').replace(/\\s+/g, ' ').trim(), disabled: b.disabled, filled: dark(b) }));
  const next = [...main.querySelectorAll('a')].filter((a) => /다음 강의/.test((a.getAttribute('aria-label') || '') + (a.innerText || ''))).map((a) => ({ where: a.closest('section[aria-label="강의 마치기"]') ? 'endbar' : (a.closest('[data-completion]') ? 'view-box' : 'other'), text: (a.getAttribute('aria-label') || a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60), filled: dark(a) }));
  const reason = end ? [...end.querySelectorAll('p')].map((p) => p.innerText.trim()).filter(Boolean) : [];
  const views = [...document.querySelectorAll('[aria-label="대조 보기"] button')].map((b) => ({ text: b.innerText.trim(), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width), over: b.scrollWidth > b.clientWidth + 1, lines: (() => { const rg = document.createRange(); rg.selectNodeContents(b); return new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size; })() }));
  return { complete, next, reason, filledVisibleInMain: filled, views, scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
})()`;

async function shot(tab, name) {
  const file = path.join(OUT, `${LABEL}_${name}.png`);
  await H.screenshot(tab, file);
  return path.relative(REPO, file).replace(/\\/g, "/");
}
async function endInView(tab) {
  await tab.eval(`(() => { const e = ${END}; if (e) e.scrollIntoView({ block: 'end' }); window.scrollBy(0, 24); })()`).catch(() => {});
  await H.sleep(500);
}

(async () => {
  const browser = await H.startBrowser(`shots-${LABEL}`, PORT, { fresh: true });
  const tab = await H.openTab(browser);
  const rows = [];
  try {
    const ONLY = process.env.SHOTS_ONLY || ""; for (const vp of (process.env.SHOTS_VPS || "mobile,desktop").split(",")) {
      await H.setViewport(tab, vp);
      for (const [course, id, lastTab] of [["student", "s1-1", 3], ["adult", "a1-1", 5]].filter((x) => !ONLY || ONLY === x[1])) {
        await H.load(tab, "/");
        await tab.eval(`localStorage.removeItem('kig:progress:completed')`).catch(() => {});
        console.log(JSON.stringify(await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] })));
        await H.click(tab, `document.querySelector('main [data-step-tab="${lastTab}"]')`, { settle: 900 });
        await endInView(tab);
        rows.push({ vp, id, state: "not completed (last step)", shot: await shot(tab, `${id}_${vp}_end`), ...(await tab.eval(STATE)) });
        // completed on this device (seeded the way ProgressProvider stores it)
        await tab.eval(`localStorage.setItem('kig:progress:completed', JSON.stringify({ '${course}:${id}': true }))`);
        console.log(JSON.stringify(await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] })));
        await H.click(tab, `document.querySelector('main [data-step-tab="${lastTab}"]')`, { settle: 900 });
        await endInView(tab);
        rows.push({ vp, id, state: "completed (last step)", shot: await shot(tab, `${id}_${vp}_end-done`), ...(await tab.eval(STATE)) });
        await tab.eval(`localStorage.removeItem('kig:progress:completed')`).catch(() => {});
      }
      // GRAMMAR I gh1-006 — the end bar before any answer, then after one Step 1 check
      if (!ONLY || ONLY === 'gh1-006') {
      await tab.eval(`(() => { for (const k of Object.keys(localStorage)) if (/^kig:grammar:work:|^kig-learning:/.test(k)) localStorage.removeItem(k); })()`).catch(() => {});
      await H.load(tab, `/grammar1/gh1-006`, { marker: H.MARKERS.grammar1 });
      await H.sleep(800);
      await endInView(tab);
      rows.push({ vp, id: "gh1-006", state: "nothing answered", shot: await shot(tab, `gh1-006_${vp}_end`), ...(await tab.eval(STATE)) });
      const box = `[...document.querySelectorAll('main [data-step-panel="1"] [data-item] textarea')].find((t) => t.offsetParent !== null)`;
      if (await H.type(tab, box, "I am a student")) await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
      await H.sleep(900);
      await endInView(tab);
      rows.push({ vp, id: "gh1-006", state: "one Step 1 item checked", shot: await shot(tab, `gh1-006_${vp}_end-checked`), ...(await tab.eval(STATE)) });
      await tab.eval(`(() => { for (const k of Object.keys(localStorage)) if (/^kig:grammar:work:|^kig-learning:/.test(k)) localStorage.removeItem(k); })()`).catch(() => {});
      }
      // READING pr001 Step 3 — the three view buttons
      if (ONLY && ONLY !== 'pr001') continue;
      await H.load(tab, `/reading/pr001`, { marker: H.MARKERS.reading });
      await H.click(tab, `document.querySelector('main [data-step-tab="3"]')`, { settle: 900 });
      await tab.eval(`(() => { const g = document.querySelector('[aria-label="대조 보기"]'); if (g) g.scrollIntoView({ block: 'center' }); })()`);
      await H.sleep(400);
      rows.push({ vp, id: "pr001", state: "Step 3 view buttons", shot: await shot(tab, `pr001_${vp}_step3`), ...(await tab.eval(STATE)) });
    }
  } finally {
    fs.writeFileSync(path.join(OUT, `${LABEL}${ONLY_SUFFIX}.json`), JSON.stringify({ base: H.BASE, at: new Date().toISOString(), rows }, null, 1));
    try { await tab.close?.(); } catch {}
    try { browser.proc.kill(); } catch {}
  }
  for (const r of rows) console.log(`${r.vp} ${r.id} ${r.state}: complete=${JSON.stringify(r.complete)} next=${JSON.stringify(r.next)} reason=${JSON.stringify(r.reason)} filled=${JSON.stringify(r.filledVisibleInMain)} views=${JSON.stringify(r.views)}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });



