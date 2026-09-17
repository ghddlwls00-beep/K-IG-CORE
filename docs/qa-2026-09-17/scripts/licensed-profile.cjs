#!/usr/bin/env node
/**
 * Opens a VISIBLE Edge window on production in a dedicated browser profile, so
 * the owner can register a licence code there by hand. The sweeps then reuse
 * that profile headless, so every paid lesson can be opened by a script.
 *
 * The script never reads, prints or copies the licence code or token. It only
 * polls for the licence's plan name (e.g. "LIFE") to know registration is done,
 * then closes the browser cleanly so the cookie is written to disk.
 *
 *   node licensed-profile.cjs            # wait up to 40 minutes
 *
 * Profile: %TEMP%/kig-audit-licensed-profile (outside the repository).
 */
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const BASE = "https://k-ig-core.vercel.app";
const PROFILE = path.join(os.tmpdir(), "kig-audit-licensed-profile");
const PORT = 9360;

async function pageTab(port) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page" && t.url.startsWith(BASE));
    if (page) {
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
      });
      const tab = new Tab(ws, port);
      await tab.send("Runtime.enable");
      return tab;
    }
    await sleep(500);
  }
  throw new Error("production tab did not appear");
}

(async () => {
  const browser = await launch({ port: PORT, profile: PROFILE, headless: false, startUrl: `${BASE}/` });
  console.log(`Edge window open on ${BASE} (profile ${PROFILE}). Waiting for a licence to be registered...`);
  const deadline = Date.now() + 40 * 60 * 1000;
  let plan = null;
  while (Date.now() < deadline) {
    try {
      const tab = await pageTab(PORT);
      plan = await tab.eval(
        "(() => { try { const s = JSON.parse(localStorage.getItem('kig:license:v1') || 'null'); return s && s.plan ? s.plan : null; } catch (e) { return null; } })()",
      );
      tab.ws.close();
    } catch {
      // the owner may be navigating; try again
    }
    if (plan) break;
    await sleep(3000);
  }
  if (!plan) {
    console.log("TIMEOUT - no licence registered in this profile");
  } else {
    console.log(`LICENSE ACTIVE in the audit profile: plan=${plan}`);
    await sleep(3000);
  }
  try {
    const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res) => (ws.onopen = res));
    ws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
    await sleep(2000);
  } catch {}
  browser.proc.kill();
  process.exitCode = plan ? 0 : 1;
})();
