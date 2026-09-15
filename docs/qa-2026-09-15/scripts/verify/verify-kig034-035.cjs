// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-034 / KIG-035 browser verification.
// Usage: node verify-kig034-035.cjs <base-url>
//   local build : http://localhost:3100
//   production  : https://k-ig-core.vercel.app   (old code, must FAIL)
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9334);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kig3435`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Tab {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  }
  static async open() {
    const t = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    return new Tab(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rej(new Error(`timeout ${method}`));
        }
      }, 120000);
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
      timeout: 90000,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const HELPERS = `
window.__q = (() => {
  const W = (ms) => new Promise(r => setTimeout(r, ms));
  const main = () => document.querySelector('main');
  const txt = () => (main()?.innerText || '');
  const click = (t) => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').includes(t)); if (!b) return false; b.click(); return true; };
  const waitFor = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (fn()) return true; } catch {} await W(300); } return false; };
  return { W, txt, click, waitFor, main };
})();`;

(async () => {
  const proc = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--autoplay-policy=no-user-gesture-required",
      "--mute-audio",
      "--no-first-run",
      "--disable-extensions",
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) {
        up = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  if (!up) throw new Error("edge did not start");

  const tab = await Tab.open();
  await tab.send("Page.enable");
  await tab.send("Runtime.enable");

  const url = `${BASE}/reading/pr001`;
  await tab.send("Page.navigate", { url });
  await sleep(3000);
  // Clear any stored personal best *before* the view mounts, otherwise the
  // restore effect seeds React state and the "is it a new best?" branch stays
  // shut for the rest of the session.
  await tab.eval(
    `Object.keys(localStorage).filter(k => k.startsWith('kig:reading:wpm:')).forEach(k => localStorage.removeItem(k))`,
  );
  await tab.send("Page.reload", { ignoreCache: false });
  await sleep(3000);
  await tab.eval(HELPERS);
  const hydrated = await tab.eval(
    `__q.waitFor(() => __q.txt().length > 300 && __q.main().querySelectorAll('button').length > 5, 60000)`,
  );
  console.log(`page        : ${url}`);
  console.log(`hydrated    : ${hydrated}`);
  if (!hydrated) {
    console.log("RESULT: could not hydrate, aborting");
    proc.kill();
    process.exit(2);
  }

  const out = { url, hydrated };

  // ---------------- KIG-035: WPM ceiling -------------------------------------
  await tab.eval(`__q.click('속독 챌린지')`);
  await sleep(600);
  // lessonKey is "<course>/<id>", so the stored-best key is nested.
  const readBest = `(() => { const k = Object.keys(localStorage).find(k => k.startsWith('kig:reading:wpm:')); return k ? [k, localStorage.getItem(k)] : null; })()`;
  await tab.eval(
    `Object.keys(localStorage).filter(k => k.startsWith('kig:reading:wpm:')).forEach(k => localStorage.removeItem(k))`,
  );

  const started = await tab.eval(`__q.click('속독 측정 시작')`);
  await sleep(1400); // let the 1s tick land so elapsed === 1
  const finished = await tab.eval(`__q.click('완독 완료')`);
  await sleep(800);

  // The result card is identified by its verdict badge, not by "N WPM" — the
  // warning message legitimately mentions the 1000 WPM ceiling.
  const VERDICT = `(t.match(/[0-9]+ WPM[\\s\\S]{0,60}?(?:원어민 최상위 속독 수준|권장 속도 완벽 마스터|양호한 독해 속도|직독직해 집중 훈련 권장)/) || [])[0] || null`;
  const after = await tab.eval(`(() => {
    const t = __q.txt();
    return {
      warning: t.includes('측정값을 저장하지 않았습니다'),
      resultCard: ${VERDICT},
      completionLine: (t.match(/[0-9]+개 단어를 [0-9]+초 만에 완독하셨습니다/) || [])[0] || null,
      storedBest: ${readBest},
      startBtnClicked: ${started},
      finishBtnClicked: ${finished},
    };
  })()`);
  out.kig035 = after;
  console.log("KIG-035 started/finished:", after.startBtnClicked, after.finishBtnClicked);
  console.log("KIG-035 warning shown     :", after.warning);
  console.log("KIG-035 result card       :", after.resultCard, "|", after.completionLine);
  console.log("KIG-035 stored best       :", JSON.stringify(after.storedBest));

  // A legitimate run must still be scored: wait long enough to be plausible.
  await tab.eval(`__q.click('다시 측정 시작') || __q.click('속독 측정 시작')`);
  await sleep(16000);
  await tab.eval(`__q.click('완독 완료')`);
  await sleep(800);
  const legit = await tab.eval(`(() => {
    const t = __q.txt();
    return {
      warning: t.includes('측정값을 저장하지 않았습니다'),
      resultCard: ${VERDICT},
      completionLine: (t.match(/[0-9]+개 단어를 [0-9]+초 만에 완독하셨습니다/) || [])[0] || null,
      storedBest: ${readBest},
    };
  })()`);
  out.kig035Legit = legit;
  console.log("KIG-035 legit run scored  :", legit.resultCard, "|", legit.completionLine, "| best:", JSON.stringify(legit.storedBest));

  // ---------------- KIG-034: vocabulary card numbers -------------------------
  await tab.eval(`__q.click('핵심 어휘')`);
  await sleep(1200);
  const nums = await tab.eval(`(() => {
    const main = __q.main();
    const all = [...main.querySelectorAll('span')].map(s => (s.textContent||'').trim());
    return all.filter(s => /^#\\d+$/.test(s));
  })()`);
  out.kig034 = nums;
  console.log("KIG-034 card numbers      :", JSON.stringify(nums));
  const threeDigit = nums.filter((n) => /^#\d{3,}$/.test(n));
  console.log("KIG-034 3-digit numbers   :", JSON.stringify(threeDigit));

  // ---------------- verdict --------------------------------------------------
  const pass035 = after.warning === true && after.resultCard === null && after.storedBest === null;
  const pass035b =
    legit.warning === false && Boolean(legit.resultCard) && Boolean(legit.storedBest);
  const pass034 = nums.length > 0 && threeDigit.length === 0;
  console.log("");
  console.log(`KIG-035 implausible run rejected : ${pass035 ? "PASS" : "FAIL"}`);
  console.log(`KIG-035 plausible run still scored: ${pass035b ? "PASS" : "FAIL"}`);
  console.log(`KIG-034 no 3-digit card numbers   : ${pass034 ? "PASS" : "FAIL"}`);

  fs.writeFileSync(
    path.join(__dirname, "..", "out", `kig034-035-${BASE.includes("vercel") ? "prod" : "local"}.json`),
    JSON.stringify(out, null, 2),
  );
  proc.kill();
  process.exit(pass035 && pass035b && pass034 ? 0 : 1);
})();
