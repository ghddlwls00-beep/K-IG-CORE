/**
 * Shared CDP harness for the 2026-09-18 audit drivers.
 *
 * Built on docs/qa-2026-09-15/scripts/verify/cdp.cjs (headless Edge, console/network capture).
 * Adds:
 *   - licensed profile CLONES (lib/profile.cjs) so drivers run in parallel without
 *     sharing localStorage
 *   - an audio/TTS hook injected before any page script: every HTMLMediaElement.play()
 *     call, its promise result and the element's playing/ended/error/pause events, plus
 *     every window.speechSynthesis.speak() call (= the app fell back to browser TTS,
 *     which would hide a missing clip)
 *   - desktop / tablet / mobile viewports
 *   - TRUSTED input: mouse clicks at the element's centre (Input.dispatchMouseEvent) and
 *     typing via Input.insertText, so React handlers see real user events
 *   - robust page load (blank first, wait for URL + course marker, settle one reload)
 *   - resumable JSONL output
 *   - the app's own speech key function (src/lib/unifiedSpeech.ts via tsload)
 */
const fs = require("fs");
const path = require("path");
const { launch, Tab, sleep } = require("../../../qa-2026-09-15/scripts/verify/cdp.cjs");
const { cloneProfile } = require("./profile.cjs");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");

const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../../out");
const unified = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));

const MARKERS = {
  phonics: "VOCA 목록",
  student: "STUDENT 목록",
  reading: "READING 목록",
  ld: "LISTENING 목록",
  grammar1: "GRAMMAR I 목록",
  grammar2: "GRAMMAR II 목록",
};
// LessonPaywall.tsx: licence paywall markers + the STUDENT sequential-progress lock heading
const PAYWALL_RE = /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED|순차 학습 잠금/;
const KEEP_KEYS = ["kig:license:v1", "kig:device:id:v1", "kig:device:name:v1", "kig:theme", "kig:lang"];

const AUDIO_HOOK = `(() => {
  if (window.__kigHook) return; window.__kigHook = true;
  // Several audit tabs share one browser, and only one of them is the "visible" tab. The app
  // stops speech when its tab is hidden (speech.ts visibilitychange handler) — correct for a
  // learner, but it made background audit tabs look silent. Every audit tab is a foreground tab.
  try {
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'visible' });
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false });
    window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
    document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
    window.addEventListener('pagehide', (e) => { if (!e.persisted) return; e.stopImmediatePropagation(); }, true);
  } catch (e) {}
  const log = (window.__kigAudio = []);
  const push = (e) => { e.t = Math.round(performance.now()); log.push(e); if (log.length > 4000) log.shift(); };
  const P = HTMLMediaElement.prototype;
  const origPlay = P.play;
  const watched = new WeakSet();
  const srcOf = (el) => el.currentSrc || el.src || (el.getAttribute && el.getAttribute('src')) || '';
  const watch = (el) => {
    if (watched.has(el)) return; watched.add(el);
    for (const ev of ['playing', 'ended', 'error', 'pause', 'loadedmetadata']) {
      el.addEventListener(ev, () => push({ ev, src: srcOf(el), dur: isFinite(el.duration) ? Math.round(el.duration * 1000) / 1000 : null, ct: Math.round(el.currentTime * 1000) / 1000, err: el.error ? el.error.code : null, rate: el.playbackRate, tag: el.tagName }));
    }
  };
  P.play = function () {
    watch(this);
    // at play() time currentSrc can still be the PREVIOUS clip; the src attribute is the new one
    const src = this.src || srcOf(this);
    let r;
    try { r = origPlay.apply(this, arguments); } catch (e) { push({ ev: 'play-threw', src, msg: String(e && e.message).slice(0, 120) }); throw e; }
    push({ ev: 'play()', src, rate: this.playbackRate });
    if (r && typeof r.then === 'function') r.then(() => push({ ev: 'play-resolved', src: srcOf(this) }), (e) => push({ ev: 'play-rejected', src: srcOf(this), name: e && e.name, msg: String(e && e.message).slice(0, 120) }));
    return r;
  };
  try {
    const s = window.speechSynthesis;
    if (s) { const orig = s.speak.bind(s); s.speak = (u) => { push({ ev: 'tts.speak', text: String((u && u.text) || '').slice(0, 300), lang: u && u.lang }); return orig(u); }; }
  } catch (e) {}
  // Stop everything without pressing UI buttons — used by drivers to move on as soon as
  // a clip has proven it plays, instead of waiting for it to finish.
  window.__kigStop = () => {
    try { document.querySelectorAll('audio, video').forEach((a) => { try { a.pause(); } catch (e) {} }); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  };
})()`;

/**
 * Clears everything but the licence before a page's own scripts run, so no lesson inherits
 * another lesson's answers — EXCEPT while sessionStorage "kig:audit:keep" is "1", which the
 * driver sets around persistence tests (bookmark / completion must survive a reload).
 */
const CLEAN_STORAGE = `(() => { try { if (sessionStorage.getItem("kig:audit:keep") === "1") return; const keep = new Set(${JSON.stringify(KEEP_KEYS)}); for (const k of Object.keys(localStorage)) if (!keep.has(k)) localStorage.removeItem(k); for (const k of Object.keys(sessionStorage)) if (!k.startsWith("kig:license-cookie:")) sessionStorage.removeItem(k); } catch (e) {} })()`;

const SNAPSHOT = `(() => {
  const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const main = document.querySelector('main') || document.body;
  const fields = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')].filter(vis);
  const unlabeled = fields.filter((f) => !(f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || (f.id && document.querySelector('label[for="' + CSS.escape(f.id) + '"]')) || f.closest('label')));
  const text = (main.innerText || '').replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();
  const leak = text.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|\\bnull\\b).{0,30}/);
  const W = window.innerWidth;
  const offscreen = [...main.querySelectorAll('button, a[href], input, select, textarea, [role=button]')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > W + 1 || r.left < -1); }).map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40)).slice(0, 10);
  const small = [...main.querySelectorAll('button, a[href], input, select, textarea, [role=button]')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); }).length;
  const clipped = [...main.querySelectorAll('h1,h2,h3,p,li,button,span,div')].filter(vis).filter((el) => { const cs = getComputedStyle(el); return (cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && (el.innerText || '').trim().length > 0 && cs.textOverflow !== 'ellipsis'; }).map((el) => (el.innerText || '').trim().slice(0, 40)).slice(0, 10);
  return {
    href: location.href,
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).slice(0, 2),
    textLength: text.length,
    text,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    viewport: [window.innerWidth, window.innerHeight],
    buttons: [...main.querySelectorAll('button')].filter(vis).length,
    links: [...main.querySelectorAll('a[href]')].filter(vis).length,
    fields: fields.length,
    unlabeledFields: unlabeled.length,
    smallTargets: small,
    offscreenControls: offscreen,
    clippedText: clipped,
    imagesNoAlt: [...main.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    brokenImages: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
    paywall: ${PAYWALL_RE}.test(text),
    leak: leak ? leak[0] : null,
    // "준비 중" also appears legitimately (a LISTENING quiz sentence); only a standalone notice counts
    placeholder: /(^|\\n)\\s*(콘텐츠|내용|강의|서비스)?\\s*준비\\s*중(입니다)?\\.?\\s*($|\\n)|구매 링크 준비 중/.test(text),
    errorScreen: /Application error|client-side exception|문제가 발생했습니다|오류가 발생했습니다|Something went wrong/.test(text),
    // not-found.tsx renders the h1 "찾는 페이지가 없습니다"
    notFound: /찾는 페이지가 없습니다|페이지를 찾을 수 없|^404/.test(((document.querySelector('h1') || {}).innerText || '') + ' ' + (main.innerText || '').slice(0, 200)),
  };
})()`;

async function waitFor(tab, expression, ms = 10000, every = 150) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expression).catch(() => false)) return true;
    await sleep(every);
  }
  return false;
}

/**
 * Launch headless Edge on a clone of the licensed profile. Same as cdp.cjs launch() plus the
 * flags that stop Chromium from throttling timers and media in background tabs, so a page in
 * the second or third audit tab behaves like the one a learner is looking at.
 */
async function startBrowser(name, port, { fresh = false } = {}) {
  const { spawn } = require("child_process");
  const profile = cloneProfile(name, { fresh });
  const EDGE = process.env.QA_EDGE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  const proc = spawn(EDGE, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--disable-extensions", "--disable-gpu", "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows", "--disable-background-media-suspend",
    "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return { proc, port, profile }; } catch {}
    await sleep(500);
  }
  proc.kill();
  throw new Error("headless Edge did not open its debugging port");
}

/**
 * Answer native dialogs (window.confirm / alert / prompt), once, for every tab.
 *
 * GRAMMAR lessons open `window.confirm("작성하신 모든 영작 내용과 자가 채점을 초기화하시겠습니까?")`
 * from the reset control (src/components/GrammarLearningView.tsx). A native dialog BLOCKS the
 * renderer, so every later CDP command (Emulation.*, Input.*) times out and the sweep records
 * nothing usable from that point on — which is exactly what happened to the GRAMMAR sweeps.
 *
 * Default is DISMISS: never let a sweep silently wipe the answers the learner just typed. A test
 * that means to go through with it sets `tab.dialogAccept = true` for that click.
 * Every dialog is recorded, because "this control opens a browser dialog" is itself an observation.
 */
{
  const original = Tab.prototype.onMessage;
  Tab.prototype.onMessage = function (msg) {
    if (msg.method === "Page.javascriptDialogOpening") {
      const p = msg.params || {};
      const accept = this.dialogAccept === true;
      (this.events.dialogs ||= []).push({ type: p.type, message: String(p.message || "").slice(0, 300), answered: accept ? "accept" : "dismiss" });
      // prompt() needs a text even when dismissed; alert() ignores accept:false and just closes.
      this.send("Page.handleJavaScriptDialog", { accept, promptText: "" }).catch(() => {});
      return;
    }
    if (msg.method === "Page.javascriptDialogClosed") return;
    return original.call(this, msg);
  };
}

/**
 * 7단계 7-1 a — 방문 하나의 사건(콘솔 · 예외 · 4xx/5xx · 실패한 요청 · 요청)을 끝까지 남긴다.
 * cdp.cjs 의 tab.resetEvents() 는 사건을 그냥 비우는데, 드라이버는 동작마다(문장 넘기기 등) 그것을 불러
 * 9/18 기록 5,530건 중 3,071건에 요청 기록이 하나도 없었다("서버 오류 판정 불가"). 비우기 전에 방문 누적(tab.visitEvents)에
 * 옮겨 두고, 새 방문(load)에서만 누적을 새로 시작한다. events(tab) 는 누적 + 지금 것을 돌려준다.
 * cdp.cjs 자체는 그대로(다른 날의 도구가 단계별로 비우는 뜻 그대로 쓰므로) — 이 하네스로 연 탭만.
 */
const emptyEvents = () => ({ console: [], exceptions: [], log: [], badResponses: [], failed: [], requests: [], dialogs: [] });
function mergeEvents(into, from) {
  for (const [k, v] of Object.entries(from || {})) if (Array.isArray(v)) (into[k] ||= []).push(...v);
  return into;
}
function keepVisitEvents(tab) {
  const clear = tab.resetEvents.bind(tab);
  tab.visitEvents = emptyEvents();
  tab.resetEvents = () => { mergeEvents(tab.visitEvents, tab.events); clear(); };
  tab.startVisit = () => { tab.visitEvents = emptyEvents(); clear(); };
}

/** Open an instrumented tab. opts.clean=true clears non-licence storage on every navigation. */
async function openTab(browser, { clean = false } = {}) {
  const tab = await Tab.open(browser.port);
  keepVisitEvents(tab);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: AUDIO_HOOK });
  if (clean) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: CLEAN_STORAGE });
  return tab;
}

const VIEWPORTS = {
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true, touch: true },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
};
async function setViewport(tab, kind) {
  const v = VIEWPORTS[kind];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}

/** Load a lesson (or any) URL robustly. Returns {navigated, rendered, href, reloads}. */
/**
 * opts.expectPath: the path the page should END on when the route redirects (e.g. GRAMMAR I odd
 * ids /grammar1/gh1-031 → /grammar1/gh1-030). Defaults to the requested path.
 */
async function load(tab, url, { marker = null, settle = 1200, expectPath = null } = {}) {
  const target = url.startsWith("http") ? url : `${BASE}${url}`;
  const finalUrl = expectPath ? `${BASE}${expectPath}` : target;
  await tab.send("Page.navigate", { url: "about:blank" }).catch(() => {});
  await waitFor(tab, `location.href === "about:blank"`, 10000);
  // 새 방문의 시작 — about:blank 까지의 사건은 버리고 방문 누적을 새로(7-1 a)
  if (tab.startVisit) tab.startVisit(); else tab.resetEvents();
  await tab.send("Page.navigate", { url: target });
  const navigated = await waitFor(tab, `location.href.split("?")[0].split("#")[0] === ${JSON.stringify(finalUrl.split("?")[0].split("#")[0])} && document.readyState === "complete"`, 45000);
  const markerExpr = marker ? `(() => { const m = document.querySelector("main"); return !!m && (m.innerText || "").includes(${JSON.stringify(marker)}); })()` : "true";
  let rendered = navigated ? await waitFor(tab, markerExpr, 25000) : false;
  let reloads = 0;
  for (let attempt = 0; rendered && attempt < 3; attempt++) {
    await tab.eval("window.__kigAuditStay = 1").catch(() => {});
    await sleep(settle);
    if (await tab.eval("window.__kigAuditStay === 1").catch(() => false)) break;
    reloads++;
    rendered = await waitFor(tab, markerExpr, 25000);
  }
  const href = await tab.eval("location.href").catch(() => null);
  return { navigated, rendered, href, reloads };
}

/**
 * Trusted click on the element returned by `elExpr` (a JS expression evaluating to an Element or null).
 * Scrolls it into view, clicks its centre. Returns {ok, text, rect} or {ok:false, reason}.
 */
async function click(tab, elExpr, { settle = 0 } = {}) {
  // Inline elements that wrap over several lines have a bounding box whose centre can fall
  // between line boxes (on the parent). Try the centre of each client rect (line box) and use
  // the first point where elementFromPoint is the element or inside it.
  const info = await tab.eval(`(() => { const el = (${elExpr}); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); const rects = [...el.getClientRects()].filter((x) => x.width > 0 && x.height > 0); const pts = rects.map((x) => [x.left + x.width / 2, x.top + x.height / 2]).concat(rects.map((x) => [x.left + Math.min(8, x.width / 2), x.top + x.height / 2])); pts.push([r.left + r.width / 2, r.top + r.height / 2]); let pick = null, top = null; for (const [x, y] of pts) { const t = document.elementFromPoint(x, y); if (t && (t === el || el.contains(t))) { pick = [x, y]; top = t; break; } } const fallback = pts[pts.length - 1]; const t2 = pick ? top : document.elementFromPoint(fallback[0], fallback[1]); const [cx, cy] = pick || fallback; return { x: cx, y: cy, w: r.width, h: r.height, text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 80), disabled: !!el.disabled, covered: !pick, coveredBy: !pick && t2 ? (t2.innerText || t2.tagName).trim().slice(0, 40) : null }; })()`).catch((e) => ({ error: e.message }));
  if (!info) return { ok: false, reason: "not found" };
  if (info.error) return { ok: false, reason: info.error };
  if (!(info.w > 0 && info.h > 0)) return { ok: false, reason: "zero size", ...info };
  await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: info.x, y: info.y });
  await tab.send("Input.dispatchMouseEvent", { type: "mousePressed", x: info.x, y: info.y, button: "left", clickCount: 1 });
  await tab.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: info.x, y: info.y, button: "left", clickCount: 1 });
  if (settle) await sleep(settle);
  return { ok: true, ...info };
}

/** Focus a field and replace its value by typing (trusted insertText). */
async function type(tab, elExpr, text) {
  const ok = await tab.eval(`(() => { const el = (${elExpr}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.focus(); if (typeof el.select === 'function') el.select(); return document.activeElement === el; })()`).catch(() => false);
  if (!ok) return false;
  // clear existing value
  await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  if (text) await tab.send("Input.insertText", { text });
  return true;
}

async function audioLog(tab, { clear = false } = {}) {
  const log = (await tab.eval(`(() => { const l = (window.__kigAudio || []).slice(); ${clear ? "if (window.__kigAudio) window.__kigAudio.length = 0;" : ""} return l; })()`).catch(() => [])) || [];
  return log.filter((e) => !/^data:/.test(e.src || ""));
}

/** Summarise an audio log: clip paths requested, whether each played, errors, TTS fallbacks. */
function summariseAudio(log) {
  const clips = {};
  for (const e of log) {
    if (!e.src && !e.ev.startsWith("tts")) continue;
    if (e.ev === "tts.speak") { (clips.__tts ||= []).push(e.text); continue; }
    const p = (() => { try { return new URL(e.src).pathname; } catch { return e.src; } })();
    const c = (clips[p] ||= { play: 0, resolved: 0, rejected: 0, playing: 0, ended: 0, error: 0, dur: null });
    if (e.ev === "play()") c.play++;
    if (e.ev === "play-resolved") c.resolved++;
    // An AbortError means a NEWER play() (or our own stop) interrupted this one — not a failure.
    if (e.ev === "play-rejected") { if (e.name === "AbortError") c.aborted = (c.aborted || 0) + 1; else { c.rejected++; c.rejectName = e.name; } }
    if (e.ev === "playing") c.playing++;
    if (e.ev === "ended") c.ended++;
    // media error code 1 is MEDIA_ERR_ABORTED (we stopped it); 2-4 are real failures
    if (e.ev === "error") { if (e.err === 1) c.aborted = (c.aborted || 0) + 1; else { c.error++; c.errCode = e.err; } }
    if (e.dur) c.dur = e.dur;
  }
  return clips;
}

const expectedClip = (text) => unified.unifiedSpeechPath(text);

/** Append-only JSONL with resume support. keyOf(record) identifies finished units. */
function jsonl(file, keyOf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const done = new Set();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (!r.visitError) done.add(keyOf(r)); } catch {}
    }
  }
  return { done, write: (rec) => fs.appendFileSync(file, JSON.stringify(rec) + "\n") };
}

/** Record a change the audit made to the audit licence's data (owner rule). */
function logDataChange(what) {
  const f = path.join(OUT, "data-changes.jsonl");
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(f, JSON.stringify({ at: new Date().toISOString(), ...what }) + "\n");
}

async function screenshot(tab, file, { fullPage = false } = {}) {
  const params = { format: "png" };
  if (fullPage) {
    const m = await tab.send("Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 12000), scale: 1 };
    params.captureBeyondViewport = true;
  }
  const shot = await tab.send("Page.captureScreenshot", params);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
}

function events(tab) {
  // 방문 누적 + 마지막으로 비운 뒤의 것(7-1 a) — 동작마다 비워도 방문의 4xx · 요청이 사라지지 않게
  const e = mergeEvents(mergeEvents(emptyEvents(), tab.visitEvents), tab.events);
  return {
    console: e.console.slice(0, 5),
    exceptions: e.exceptions.slice(0, 5),
    log: e.log.slice(0, 5),
    badResponses: e.badResponses.filter((r) => !/\/_vercel\/|favicon/.test(r.url)).slice(0, 10),
    failed: e.failed.slice(0, 5),
    requests: e.requests.length,
    dialogs: (e.dialogs || []).slice(0, 5),
  };
}

module.exports = { BASE, OUT, REPO, MARKERS, PAYWALL_RE, AUDIO_HOOK, SNAPSHOT, sleep, waitFor, startBrowser, openTab, setViewport, VIEWPORTS, load, click, type, audioLog, summariseAudio, expectedClip, jsonl, logDataChange, screenshot, events, loadTs, Tab };
