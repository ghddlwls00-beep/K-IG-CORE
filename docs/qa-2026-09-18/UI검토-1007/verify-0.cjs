#!/usr/bin/env node
/**
 * 2026-10-07 UI 검토 — verify-0(반박 점검) 도구. 앱 · 내용 파일을 고치지 않는다.
 * 감사 이용권 사본 'ui1007-verify-0' 하나로 운영을 읽기만 한다. /api/ 로 가는 GET 아닌 요청은 막는다
 * (예외: 앱이 스스로 하는 /api/license/verify · /session). 이용권 코드 · PIN 입력 0 · 토큰 · 쿠키 출력 0.
 * 이용권 없는 화면은 같은 브라우저 안 새 '격리 문맥'(빈 저장소)에서 연다 — 사본 프로필은 건드리지 않음.
 *
 *   node verify-0.cjs <probe.cjs>   (probe 는 module.exports = async (h) => { ... })
 * 결과: docs/qa-2026-09-18/out/ui-1007/verify/ (사진 · verify-0.jsonl)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const H = require("../scripts/lib/harness.cjs");

const ROOT = path.join(H.OUT, "ui-1007", "verify");
const LOG = path.join(ROOT, "verify-0.jsonl");
const PORT = 9975;
const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};

function guard(tab, tag) {
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    if (msg.method === "Fetch.requestPaused") {
      const q = msg.params, method = q.request.method;
      let pth = ""; try { pth = new URL(q.request.url).pathname; } catch {}
      const ok = /^(GET|HEAD|OPTIONS)$/.test(method) || (method === "POST" && /^\/api\/license\/(verify|session)$/.test(pth));
      if (ok) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
      else { fs.appendFileSync(path.join(ROOT, "blocked.jsonl"), JSON.stringify({ at: new Date().toISOString(), tag, method, path: pth }) + "\n"); tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
      return;
    }
    return orig(msg);
  };
  return tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
}

async function freeTab(port) {
  // 격리 문맥(빈 저장소) — 이용권 없는 사람의 화면
  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { bws.onopen = res; bws.onerror = rej; });
  let id = 0; const pend = new Map();
  bws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
  const bsend = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); bws.send(JSON.stringify({ id: i, method, params })); });
  const { browserContextId } = await bsend("Target.createBrowserContext", { disposeOnDetach: false });
  const { targetId } = await bsend("Target.createTarget", { url: "about:blank", browserContextId });
  const ws = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${targetId}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const { Tab } = H;
  const tab = new Tab(ws, port);
  tab.targetId = targetId;
  await tab.send("Page.enable"); await tab.send("Runtime.enable"); await tab.send("Network.enable");
  tab.resetEvents = tab.resetEvents || (() => {});
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: H.AUDIO_HOOK });
  await guard(tab, "free");
  tab.closeCtx = async () => { try { await bsend("Target.disposeBrowserContext", { browserContextId }); } catch {} try { bws.close(); } catch {} };
  return tab;
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const probeFile = path.resolve(process.argv[2]);
  const need = 1.2 * 1024 ** 3;
  for (let i = 0; i < 30 && os.freemem() < need; i++) { console.log("메모리 부족 — 1분 기다림"); await H.sleep(60000); }
  const browser = await H.startBrowser("ui1007-verify-0", PORT, { fresh: process.argv.includes("--fresh") });
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    await guard(tab, "lic");
    const h = {
      tab, H,
      async view(vp, theme = "light", t = tab) {
        const v = VIEW[vp];
        await t.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
        await t.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
        await t.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
      },
      async load(p, t = tab, settle = 900) { const l = await H.load(t, p, { marker: null, settle }); await H.sleep(500); await t.eval("window.__kigStop && window.__kigStop()").catch(() => {}); return l; },
      ev: (e, t = tab) => t.eval(e).catch((err) => ({ error: String(err && err.message).slice(0, 200) })),
      async shot(name, t = tab) { const r = await t.send("Page.captureScreenshot", { format: "jpeg", quality: 72 }); const f = path.join(ROOT, name + ".jpg"); fs.writeFileSync(f, Buffer.from(r.data, "base64")); return "docs/qa-2026-09-18/out/ui-1007/verify/" + name + ".jpg"; },
      click: (expr, opts = {}, t = tab) => H.click(t, expr, { settle: 800, refuseCovered: true, ...opts }),
      rec(r) { fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(JSON.stringify(r).slice(0, 3000)); },
      freeTab: () => freeTab(PORT),
      sleep: H.sleep,
    };
    await require(probeFile)(h);
    await tab.close();
  } finally {
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
