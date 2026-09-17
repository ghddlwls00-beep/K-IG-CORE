/**
 * Minimal headless-Edge driver over the Chrome DevTools Protocol, shared by the
 * launch-audit sweeps. No dependencies beyond Node 20+ (global fetch/WebSocket).
 *
 * Every tab records what a person reading the console and the network panel
 * would see — console errors, uncaught exceptions, CSP/log errors, and failed
 * or 4xx/5xx responses — so a page that "looks fine" but threw is not a pass.
 */
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const EDGE = process.env.QA_EDGE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `headless: false` opens a visible window — used once, so that a person can
 * register a licence in a profile the sweeps then reuse. The script never reads
 * or copies the licence; it only reuses the profile directory.
 */
async function launch({ port = 9340, profile, headless = true, startUrl = "about:blank" } = {}) {
  const userDir = profile || path.join(os.tmpdir(), `kig-cdp-${port}`);
  const proc = spawn(
    EDGE,
    [
      headless ? "--headless=new" : null,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDir}`,
      "--no-first-run",
      "--disable-extensions",
      headless ? "--disable-gpu" : null,
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      startUrl,
    ].filter(Boolean),
    { stdio: "ignore" },
  );
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return { proc, port };
    } catch {}
    await sleep(500);
  }
  proc.kill();
  throw new Error("headless Edge did not open its debugging port");
}

class Tab {
  constructor(ws, port) {
    this.ws = ws;
    this.port = port;
    this.id = 0;
    this.pending = new Map();
    this.events = { console: [], exceptions: [], log: [], badResponses: [], failed: [], requests: [] };
    ws.onmessage = (m) => this.onMessage(JSON.parse(m.data));
  }

  static async open(port) {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    const tab = new Tab(ws, port);
    tab.targetId = t.id;
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Log.enable");
    await tab.send("Network.enable");
    return tab;
  }

  onMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) {
      const { res, rej } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      return;
    }
    const p = msg.params || {};
    switch (msg.method) {
      case "Runtime.consoleAPICalled":
        if (p.type === "error" || p.type === "assert") {
          this.events.console.push((p.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
        }
        break;
      case "Runtime.exceptionThrown":
        this.events.exceptions.push(
          (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "").slice(0, 300),
        );
        break;
      case "Log.entryAdded":
        if (p.entry?.level === "error") this.events.log.push(`${p.entry.source}: ${p.entry.text}`.slice(0, 300));
        break;
      case "Network.requestWillBeSent":
        this.events.requests.push(p.request?.url || "");
        break;
      case "Network.responseReceived":
        if (p.response?.status >= 400) {
          this.events.badResponses.push({ url: p.response.url, status: p.response.status });
        }
        break;
      case "Network.loadingFailed":
        if (!p.canceled && p.errorText !== "net::ERR_ABORTED") this.events.failed.push(`${p.errorText} ${p.blockedReason || ""}`.trim());
        break;
      default:
    }
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
      }, 90000);
    });
  }

  async eval(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
      timeout: 60000,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result.value;
  }

  resetEvents() {
    this.events = { console: [], exceptions: [], log: [], badResponses: [], failed: [], requests: [] };
  }

  async viewport(kind) {
    if (kind === "mobile") {
      await this.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await this.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    } else {
      await this.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
      await this.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
  }

  /** Navigate and wait for load plus hydration time. */
  async goto(url, settleMs = 1200) {
    await this.send("Page.navigate", { url });
    const end = Date.now() + 30000;
    while (Date.now() < end) {
      const ready = await this.eval("document.readyState").catch(() => "");
      if (ready === "complete") break;
      await sleep(150);
    }
    await sleep(settleMs);
  }

  /**
   * A trusted key press (isTrusted === true in the page), unlike dispatchEvent.
   * Enter carries its text: a focused <button> is activated by the character,
   * not by the raw key-down alone.
   */
  async key(key, { shift = false } = {}) {
    const codes = { Tab: 9, Escape: 27, Enter: 13 };
    const base = { key, code: key, windowsVirtualKeyCode: codes[key] || 0, modifiers: shift ? 8 : 0 };
    if (key === "Enter") {
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", text: "\r", unmodifiedText: "\r", ...base });
    } else {
      await this.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    }
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  }

  async close() {
    try {
      await fetch(`http://127.0.0.1:${this.port}/json/close/${this.targetId}`);
    } catch {}
    try {
      this.ws.close();
    } catch {}
  }
}

module.exports = { launch, Tab, sleep };
