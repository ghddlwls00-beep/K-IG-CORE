// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Re-verifies audio playback for lessons whose harness play-check timed out, using trusted
// (Input.dispatchMouseEvent) clicks like a real user, two attempts each.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const BASE = "http://127.0.0.1:3100";
const PORT = 9334;
const PLAN = "LIFE";
const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, "qa-secrets.json"), "utf8"));
const lic = secrets.tokens[PLAN];
const rows = fs.readFileSync(path.join(__dirname, "out", "ui-LIFE.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
const targets = rows.filter((r) => r.res && r.res.play && !r.res.play.ok);
const OUT = path.join(__dirname, "out", "play-verify.jsonl");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SELECTOR = {
  STUDENT: `document.querySelector('main button[title="문장 듣기"]')`,
  VOCA: `[...document.querySelectorAll('main div.cursor-pointer')].find(d => d.querySelector('span.font-mono.text-\\\\[16px\\\\]'))`,
  "GRAMMAR I": `[...document.querySelectorAll('main button')].find(b => b.textContent.includes('영어 정답 발음'))`,
  "GRAMMAR II": `[...document.querySelectorAll('main button')].find(b => b.textContent.includes('영어 정답 발음'))`,
  LISTENING: `[...document.querySelectorAll('main button')].find(b => b.textContent.includes('전체 본문 듣기'))`,
  READING: `document.querySelector('main [data-sentence-id]')`,
};
(async () => {
  const proc = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=C:/Users/ghddl/AppData/Local/Temp/kqedge-verify", "--mute-audio", "--no-first-run", "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(500); }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send("Network.enable"); await send("Runtime.enable"); await send("Page.enable");
  await send("Network.setCookie", { name: "kig_license_session", value: lic.token, domain: "127.0.0.1", path: "/", httpOnly: true });
  await send("Page.navigate", { url: BASE + "/robots.txt" }); await sleep(2500);
  await ev(`localStorage.setItem('kig:device:id:v1', ${JSON.stringify(lic.deviceId)}); localStorage.setItem('kig:license:v1', ${JSON.stringify(JSON.stringify({ maskedKey: lic.maskedKey, licenseId: lic.licenseId, plan: lic.plan, activatedAt: Date.now(), expiresAt: lic.expiresAt, token: lic.token }))}); sessionStorage.setItem('x','1'); 1`); // BUG-018: token + masked code, never the code
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__ev=[]; (()=>{const seen=new WeakSet(); const op=HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play=function(){const el=this; if(!seen.has(el)){seen.add(el); ['playing','error'].forEach(e=>el.addEventListener(e,()=>window.__ev.push(e+':'+(el.currentSrc||'').split('/').pop())));} window.__ev.push('play:'+(el.src||'').split('/').pop().slice(0,30)); return op.apply(this,arguments).catch(e=>{window.__ev.push('reject:'+String(e).slice(0,40)); throw e;});};})();` });
  for (const r of targets) {
    await send("Page.navigate", { url: BASE + r.url });
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) { await sleep(500); ready = await ev(`!!(${SELECTOR[r.section]})`); }
    await sleep(1500);
    const attempts = [];
    for (let a = 0; a < 2; a++) {
      const box = await ev(`(() => { const el = ${SELECTOR[r.section]}; if (!el) return null; el.scrollIntoView({block:'center'}); const b = el.getBoundingClientRect(); return {x: b.left + b.width/2, y: b.top + b.height/2}; })()`);
      if (!box) { attempts.push("no-element"); break; }
      await sleep(300);
      const n = await ev(`window.__ev.length`);
      for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
      let ok = false, seg = [];
      for (let i = 0; i < 40; i++) { await sleep(250); seg = await ev(`window.__ev.slice(${n})`); if (seg.some((s) => s.startsWith("playing:"))) { ok = true; break; } }
      attempts.push(ok ? "playing" : `no-playing ${seg.join(",").slice(0, 150)}`);
      if (ok) break;
      await sleep(1500);
    }
    fs.appendFileSync(OUT, JSON.stringify({ section: r.section, id: r.id, url: r.url, attempts }) + "\n");
  }
  proc.kill();
  console.log("verified", targets.length);
})();
