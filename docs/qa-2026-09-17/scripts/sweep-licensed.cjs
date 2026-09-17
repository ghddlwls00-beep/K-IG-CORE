#!/usr/bin/env node
/**
 * Phase 2/4/6 — every lesson opened WITH a licence, every step clicked,
 * desktop (1366×900) and mobile (390×844).
 *
 * Uses the audit profile the owner registered a LIFE licence in
 * (licensed-profile.cjs). The licence, device id, theme and language keys are
 * kept; every other localStorage key is cleared before each page so no lesson
 * inherits another lesson's saved answers.
 *
 * Per page × viewport × step it records: console errors, uncaught exceptions,
 * CSP/log errors, 4xx/5xx and failed requests, horizontal overflow, unlabeled
 * fields, paywall shown (a FAIL with a LIFE licence), rendered text length,
 * leaked "undefined"/"NaN"/"[object Object]", "준비 중" placeholders, error
 * screens, and control counts. On the first view it presses the main player's
 * 재생 button once so a clip request is made and its status recorded.
 *
 * Desktop step texts are saved to out/rendered/<course>/<id>.json so the content
 * review can compare what a learner SEES with the data files.
 *
 * Resumable: results append to out/sweep-licensed<suffix>.jsonl; finished
 * page×viewport pairs are skipped on the next run.
 *
 *   node sweep-licensed.cjs [--course reading] [--limit 20] [--workers 4] [--suffix -v2]
 *
 * v2 (2026-09-17): the first run (out/sweep-licensed.jsonl, kept as evidence) is
 * NOT usable — `Tab.goto` returned as soon as the OLD document reported
 * readyState "complete", so 1,110 of 3,496 records have no snapshot and at least
 * 31 desktop snapshots show another course's page (e.g. /phonics/hv-01 recorded
 * a STUDENT lesson). v2 blanks the tab first, waits until location.href is the
 * target URL AND the course's "<COURSE> 목록" back-link is rendered in <main>,
 * records href/marker per visit, and flags a visit that never loaded instead of
 * snapshotting whatever is on screen.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const PROFILE = path.join(os.tmpdir(), "kig-audit-licensed-profile");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SUFFIX = arg("--suffix", "");
const JSONL = path.join(OUT, `sweep-licensed${SUFFIX}.jsonl`);
const RENDERED = path.join(OUT, `rendered${SUFFIX}`);
// The back-link every lesson page renders inside <main> (seen in the rendered text).
const MARKERS = {
  phonics: "VOCA 목록",
  student: "STUDENT 목록",
  reading: "READING 목록",
  ld: "LISTENING 목록",
  grammar1: "GRAMMAR I 목록",
  grammar2: "GRAMMAR II 목록",
  cnn: "CNN NEWS 목록",
};
const ONLY_COURSE = arg("--course", null);
const LIMIT = Number(arg("--limit", 0)) || 0;
const WORKERS = Number(arg("--workers", 4));
const KEEP_KEYS = ["kig:license:v1", "kig:device:id:v1", "kig:device:name:v1", "kig:theme", "kig:lang"];
const PAYWALL_MARKERS = ["ALL-PASS ONLY", "STUDENT PASS ONLY", "VIP ALL-PASS REQUIRED"];

const validRoutes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));

function pageList() {
  const pages = [];
  for (const [course, ids] of Object.entries(validRoutes.lessons)) {
    if (ONLY_COURSE && course !== ONLY_COURSE) continue;
    for (const id of ids) pages.push({ course, id, url: `/${course}/${id}` });
  }
  return LIMIT ? pages.slice(0, LIMIT) : pages;
}

// sessionStorage keeps `kig:license-cookie:*`: LicenseProvider reloads a gated
// lesson once per tab session until that key exists (LicenseProvider.tsx:127-132).
// Clearing it made EVERY visit reload ~1.5 s after load, mid-snapshot.
const CLEAN = `(() => { try { const keep = new Set(${JSON.stringify(KEEP_KEYS)}); for (const k of Object.keys(localStorage)) if (!keep.has(k)) localStorage.removeItem(k); for (const k of Object.keys(sessionStorage)) if (!k.startsWith("kig:license-cookie:")) sessionStorage.removeItem(k); } catch (e) {} })()`;

const SNAPSHOT = `(() => {
  const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const main = document.querySelector('main') || document.body;
  const fields = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')].filter(vis);
  const unlabeled = fields.filter((f) => !(f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || (f.id && document.querySelector('label[for="' + CSS.escape(f.id) + '"]')) || f.closest('label')));
  const text = (main.innerText || '').replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();
  const leak = text.match(/.{0,30}(\\bundefined\\b|\\bNaN\\b|\\[object Object\\]).{0,30}/);
  const small = [...main.querySelectorAll('button, a[href], input, select, textarea, [role=button]')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); }).length;
  return {
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).slice(0, 2),
    textLength: text.length,
    text,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    buttons: [...main.querySelectorAll('button')].filter(vis).length,
    links: [...main.querySelectorAll('a[href]')].filter(vis).length,
    fields: fields.length,
    unlabeledFields: unlabeled.length,
    smallTargets: small,
    imagesNoAlt: [...main.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    brokenImages: [...main.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
    paywall: ${JSON.stringify(PAYWALL_MARKERS)}.some((m) => text.includes(m)),
    leak: leak ? leak[0] : null,
    placeholder: /준비 중/.test(text),
    errorScreen: /Application error|client-side exception|문제가 발생했습니다|오류가 발생했습니다/.test(text),
    notFound: /페이지를 찾을 수 없|404/.test((document.querySelector('h1') || {}).innerText || ''),
  };
})()`;

const STEP_LABELS = `(() => {
  const main = document.querySelector('main');
  if (!main) return [];
  return [...new Set([...main.querySelectorAll('button')]
    .filter((b) => b.offsetParent && /^\\S*\\s*(step|STEP)\\s*\\d/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))
    .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()))]
    .filter((l) => !/^(다음|←|→|이전)/.test(l) && !/(이동|하러 가기)\\s*→?$/.test(l)).slice(0, 8);
})()`;

function problemsOf(events, snap) {
  const p = [];
  if (events.exceptions.length) p.push(`exception: ${events.exceptions[0]}`);
  if (events.console.length) p.push(`console error: ${events.console[0]}`);
  if (events.log.length) p.push(`log error: ${events.log[0]}`);
  if (events.badResponses.length) p.push(`HTTP ${events.badResponses[0].status} ${events.badResponses[0].url}`);
  if (events.failed.length) p.push(`network failed: ${events.failed[0]}`);
  if (!snap) return p.concat("no snapshot");
  if (snap.overflowX) p.push(`horizontal overflow ${snap.scrollWidth}px`);
  if (snap.unlabeledFields) p.push(`${snap.unlabeledFields} unlabeled field(s)`);
  if (snap.paywall) p.push("paywall shown to a LIFE licence");
  if (snap.textLength < 150) p.push(`only ${snap.textLength} chars rendered`);
  if (snap.leak) p.push(`leaked value: ${snap.leak}`);
  if (snap.placeholder) p.push("'준비 중' placeholder");
  if (snap.errorScreen) p.push("error screen text");
  if (snap.notFound) p.push("404 heading");
  if (snap.brokenImages) p.push(`${snap.brokenImages} broken image(s)`);
  return p;
}

const strip = (snap) => (snap ? { ...snap, text: undefined } : snap);

async function waitFor(tab, expression, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expression).catch(() => false)) return true;
    await sleep(200);
  }
  return false;
}

async function load(tab, page) {
  const target = `${BASE}${page.url}`;
  await tab.send("Page.navigate", { url: "about:blank" }).catch(() => {});
  await waitFor(tab, `location.href === "about:blank"`, 10000);
  tab.resetEvents();
  // CLEAN runs before the page's own scripts on every navigation (see worker).
  await tab.send("Page.navigate", { url: target });
  const navigated = await waitFor(tab, `location.href.split("?")[0].split("#")[0] === ${JSON.stringify(target)} && document.readyState === "complete"`, 45000);
  const marker = MARKERS[page.course];
  const markerExpr = `(() => { const m = document.querySelector("main"); return !!m && (m.innerText || "").includes(${JSON.stringify(marker)}); })()`;
  let rendered = marker ? await waitFor(tab, markerExpr, 20000) : true;
  // Settle: the page may reload itself once (licence cookie). A flag set on the
  // window survives only if no reload happened in the next 2 s.
  let reloads = 0;
  for (let attempt = 0; rendered && attempt < 3; attempt++) {
    await tab.eval("window.__kigAudit = 1").catch(() => {});
    await sleep(2000);
    if (await tab.eval("window.__kigAudit === 1").catch(() => false)) break;
    reloads++;
    rendered = marker ? await waitFor(tab, markerExpr, 20000) : true;
  }
  const href = await tab.eval("location.href").catch(() => null);
  return { navigated, rendered, href, reloads };
}

async function visit(tab, page, viewport) {
  const rows = [];
  const rendered = [];
  await tab.viewport(viewport);
  const loaded = await load(tab, page);
  let snap = loaded.navigated ? await tab.eval(SNAPSHOT).catch((e) => { tab.events.exceptions.push(`SNAPSHOT failed: ${e.message}`.slice(0, 200)); return null; }) : null;
  const firstProblems = problemsOf(tab.events, snap);
  if (!loaded.navigated) firstProblems.push(`did not reach the URL (at ${loaded.href})`);
  else if (!loaded.rendered) firstProblems.push(`"${MARKERS[page.course]}" never rendered (h1: ${snap ? snap.h1.join(" / ") : "-"})`);
  rows.push({ step: "(initial)", href: loaded.href, loaded: loaded.navigated && loaded.rendered, snap: strip(snap), problems: firstProblems });
  if (snap) rendered.push({ step: "(initial)", text: snap.text });
  if (!loaded.navigated || !loaded.rendered) return { rows, rendered, audio: { played: null, requests: [] }, steps: [], loaded };

  // Press the main player's play button once: a clip request must succeed.
  tab.resetEvents();
  const played = viewport !== "desktop" ? null : await tab.eval(`(() => { const b = [...document.querySelectorAll('main button[aria-label="재생"]')].find((x) => x.offsetParent); if (!b) return false; b.click(); return true; })()`).catch(() => false);
  let audio = { played, requests: [] };
  if (played) {
    await sleep(1500);
    audio.requests = tab.events.requests.filter((u) => /\/audio\//.test(u)).slice(0, 3);
    const bad = tab.events.badResponses.filter((r) => /\/audio\//.test(r.url));
    audio.bad = bad.slice(0, 3);
    await tab.eval(`(() => { const b = [...document.querySelectorAll('main button[aria-label="일시정지"], main button[aria-label="정지"]')].find((x) => x.offsetParent); if (b) b.click(); })()`).catch(() => {});
  }

  const steps = (await tab.eval(STEP_LABELS).catch(() => [])) || [];
  for (const label of steps) {
    tab.resetEvents();
    const clicked = await tab.eval(`(() => {
      const b = [...document.querySelectorAll('main button')].find((x) => (x.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)});
      if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true;
    })()`).catch(() => false);
    await sleep(900);
    snap = await tab.eval(SNAPSHOT).catch((e) => { tab.events.exceptions.push(`SNAPSHOT failed: ${e.message}`.slice(0, 200)); return null; });
    const problems = problemsOf(tab.events, snap);
    if (!clicked) problems.push("step button disappeared before click");
    rows.push({ step: label, snap: strip(snap), problems });
    if (snap) rendered.push({ step: label, text: snap.text });
  }
  return { rows, rendered, audio, steps, loaded };
}

(async () => {
  fs.mkdirSync(RENDERED, { recursive: true });
  const done = new Set();
  if (fs.existsSync(JSONL)) {
    for (const line of fs.readFileSync(JSONL, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.visitError) done.add(`${r.url}|${r.viewport}`);
      } catch {}
    }
  }
  const queue = pageList()
    .flatMap((p) => [[p, "desktop"], [p, "mobile"]])
    .filter(([p, v]) => !done.has(`${p.url}|${v}`));
  console.log(`licensed sweep — ${queue.length} page×viewport visits to go (${done.size} already done), ${WORKERS} workers`);
  const browser = await launch({ port: 9361, profile: PROFILE });
  let cursor = 0;
  let finished = 0;
  const started = Date.now();

  // Refuse to run without a licence: a paywalled sweep would "pass" nothing useful.
  {
    const probe = await Tab.open(browser.port);
    await probe.goto(`${BASE}/`, 800);
    const plan = await probe.eval("(() => { try { return (JSON.parse(localStorage.getItem('kig:license:v1') || 'null') || {}).plan || null; } catch (e) { return null; } })()");
    await probe.close();
    if (!plan) {
      console.error("REFUSING: no licence in the audit profile (run licensed-profile.cjs first)");
      browser.proc.kill();
      process.exit(2);
    }
    console.log(`licence plan in profile: ${plan}`);
  }

  async function worker() {
    const tab = await Tab.open(browser.port);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: CLEAN });
    for (;;) {
      const i = cursor++;
      if (i >= queue.length) break;
      const [page, viewport] = queue[i];
      let record;
      try {
        const r = await visit(tab, page, viewport);
        record = { ...page, viewport, at: new Date().toISOString(), loaded: r.loaded, steps: r.steps, audio: r.audio, rows: r.rows };
        if (JSON.stringify(r.rows).includes("HTTP 429")) await sleep(4000); // the progress API rate-limits this IP
        if (viewport === "desktop") {
          const dir = path.join(RENDERED, page.course);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${page.id}.json`), JSON.stringify(r.rendered, null, 1));
        }
      } catch (err) {
        record = { ...page, viewport, at: new Date().toISOString(), visitError: err.message };
      }
      fs.appendFileSync(JSONL, JSON.stringify(record) + "\n");
      finished++;
      if (finished % 25 === 0) {
        const rate = (Date.now() - started) / finished;
        console.log(`  ${finished}/${queue.length}  eta ${Math.round(((queue.length - finished) * rate) / 60000)} min`);
      }
    }
    await tab.close();
  }
  try {
    await Promise.all(Array.from({ length: WORKERS }, worker));
  } finally {
    browser.proc.kill();
  }
  console.log(`done: ${finished} visits`);
})();
