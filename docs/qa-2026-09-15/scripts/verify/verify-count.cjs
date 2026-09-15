// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// Section-intro lesson count verification.
// Renders every /t/<tab> page and compares each course's displayed count with
// the number of real lessons (variant === "main") in its index.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const BASE = process.argv[2] || "http://localhost:3100";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));

const { TABS } = loadTs(path.join(REPO, "src/lib/tabs.ts"));
const { COURSES } = loadTs(path.join(REPO, "src/lib/courses.ts"));

const expected = {};
for (const c of COURSES) {
  const j = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", `${c.slug}.json`), "utf8"));
  expected[c.titleEn] = (j.lessons || []).filter((l) => l.variant === "main").length;
}

const PAGE = `(() => {
  const s = document.documentElement.innerHTML;
  const out = [];
  const re = /<span class="text-\\[16px\\] font-medium tracking-tight">([^<]+)<\\/span>[\\s\\S]*?tabular-nums text-ink-faint">([0-9]+)</g;
  let m;
  while ((m = re.exec(s))) out.push([m[1], Number(m[2])]);
  return out;
})()`;

(async () => {
  const { spawn } = require("child_process");
  const PORT = 9338;
  const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const proc = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=C:/Users/ghddl/AppData/Local/Temp/kqedge-kigcount`,
      "--no-first-run",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch {}
    await sleep(500);
  }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, timeout: 60000 });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");

  let bad = 0;
  const rows = [];
  for (const tab of TABS) {
    await send("Page.navigate", { url: `${BASE}/t/${tab.slug}` });
    await sleep(2000);
    let pairs = [];
    try {
      pairs = (await ev(PAGE)) || [];
    } catch {}
    if (!pairs.length) {
      // Fall back to a plain fetch + regex when the page has no client render.
      const html = await (await fetch(`${BASE}/t/${tab.slug}`)).text();
      const re = /text-\[16px\] font-medium tracking-tight">([^<]+)<\/span>[\s\S]*?tabular-nums text-ink-faint">(\d+)</g;
      let m;
      while ((m = re.exec(html))) pairs.push([m[1], Number(m[2])]);
    }
    for (const [titleEn, shown] of pairs) {
      const want = expected[titleEn];
      const ok = want === shown;
      if (!ok) bad++;
      rows.push(`${ok ? "PASS" : "FAIL"}  /t/${tab.slug.padEnd(9)} ${titleEn.padEnd(22)} shown=${String(shown).padEnd(5)} lessons=${want}`);
    }
  }
  rows.forEach((r) => console.log(r));
  console.log(`\n${rows.length - bad}/${rows.length} course counts correct`);
  proc.kill();
  process.exit(bad ? 1 : 0);
})();
