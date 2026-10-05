// triage-voca-grammar: read-only inspection on production with the licensed clone (no clicks unless --click given).
const path = require("path");
const fs = require("fs");
const H = require(path.resolve("C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73/docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const [, , url, vp = "desktop", exprFile] = process.argv;
(async () => {
  const b = await H.startBrowser("rc1002-fin-triage-voca-grammar", 9996);
  const out = [];
  try {
    const tab = await H.openTab(b, { clean: true });
    await H.setViewport(tab, vp);
    const ld = await H.load(tab, url, {});
    out.push({ load: ld });
    const expr = fs.readFileSync(exprFile, "utf8");
    const r = await tab.eval(expr, { awaitPromise: true, timeout: 60000 }).catch((e) => ({ error: e.message }));
    out.push(r);
  } finally {
    try { b.proc.kill(); } catch {}
  }
  const o = process.env.OUT_FILE;
  fs.writeFileSync(o, JSON.stringify(out, null, 1));
  console.log("written", o);
  process.exit(0);
})();

