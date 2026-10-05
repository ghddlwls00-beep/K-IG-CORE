// triage-voca-grammar: preload (node -r) — wraps lib/harness.cjs click() to log what the trusted click actually hit.
// Tool files are not changed; this only patches the in-memory export object for this process.
const path = require("path");
const fs = require("fs");
const H = require(path.resolve("C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73/docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const LOG = process.env.SPY_LOG || path.join(__dirname, "click-spy.jsonl");
const orig = H.click;
const INSTALL = `(() => { if (window.__spyOn) return 1; window.__spyOn = 1; window.__spy = [];
  const d = (el) => { if (!el || !el.tagName) return String(el); const a = el.closest && el.closest('a[href]'); return el.tagName + ' "' + ((el.innerText||el.getAttribute('aria-label')||'').replace(/\\s+/g,' ').trim().slice(0,40)) + '"' + (a ? ' in A[' + a.getAttribute('href') + ' / ' + (a.getAttribute('aria-label')||'') + ']' : ''); };
  for (const t of ['pointerdown','click']) document.addEventListener(t, (e) => { window.__spy.push({ t, x: e.clientX, y: e.clientY, sy: Math.round(scrollY), target: d(e.target), path: location.pathname, ts: Math.round(performance.now()) }); }, true);
  return 1; })()`;
H.click = async function (tab, elExpr, opts) {
  await tab.eval(INSTALL).catch(() => {});
  const pre = await tab.eval(`({ sy: Math.round(scrollY), path: location.pathname, n: (window.__spy||[]).length })`).catch(() => null);
  const r = await orig.call(this, tab, elExpr, opts);
  const post = await tab.eval(`({ sy: Math.round(scrollY), path: location.pathname, spy: (window.__spy||[]).slice(-4) })`).catch(() => null);
  const rec = { at: new Date().toISOString(), picked: r && r.text, x: r && r.x, y: r && r.y, covered: r && r.covered, coveredBy: r && r.coveredBy, pre, post };
  fs.appendFileSync(LOG, JSON.stringify(rec) + "\n");
  return r;
};
