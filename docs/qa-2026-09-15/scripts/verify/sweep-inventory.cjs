#!/usr/bin/env node
/**
 * Launch-audit inventory and checklist sweep.
 *
 * Opens EVERY page a visitor without a licence can reach — home, course pages,
 * section (tab) pages, every free preview lesson and script page, the admin
 * PIN screen and a 404 — at desktop (1366×900) and mobile (390×844), clicks
 * every learning step inside each lesson, and records for each page × step:
 *
 *   - the controls on screen: buttons (with labels), links, inputs, textareas,
 *     selects, dialogs, tabs, dropdowns (select/details/aria-haspopup)
 *   - horizontal overflow, unlabeled form fields, rendered-text length
 *   - console errors, uncaught exceptions, CSP/log errors, 4xx/5xx and failed
 *     network requests
 *
 * With `--locked` it instead opens every LOCKED lesson (1,627 of them) and
 * asserts the paywall rendered, the page is noindex, and nothing errored.
 *
 * Nothing is sampled: the page list is derived from validRoutes.json and
 * `isFreePreviewLesson`, so a lesson that exists is a lesson that is visited.
 *
 *   node sweep-inventory.cjs http://localhost:3210            # accessible pages
 *   node sweep-inventory.cjs http://localhost:3210 --locked   # paywalled pages
 *
 * Output: scripts/out/inventory-<accessible|locked>.json and a checklist row
 * per page × viewport × step with PASS / FAIL and the reason.
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");
const { launch, Tab, sleep } = require("./cdp.cjs");

const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");
const LOCKED_MODE = process.argv.includes("--locked");
const WORKERS = Number(process.env.QA_WORKERS || (LOCKED_MODE ? 6 : 3));
const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const PAYWALL_MARKERS = ["ALL-PASS ONLY", "STUDENT PASS ONLY", "VIP ALL-PASS REQUIRED"];

const validRoutes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const { isFreePreviewLesson } = loadTs(path.join(REPO, "src/lib/license.ts"));

function pageList() {
  const pages = [];
  if (!LOCKED_MODE) {
    pages.push({ kind: "home", url: "/" });
    for (const course of Object.keys(validRoutes.lessons)) pages.push({ kind: "course", url: `/${course}` });
    for (const tab of validRoutes.tabs) pages.push({ kind: "tab", url: `/t/${tab}` });
    pages.push({ kind: "admin", url: "/admin/license" });
    pages.push({ kind: "404", url: "/kig-inventory-missing-page" });
  }
  for (const [course, ids] of Object.entries(validRoutes.lessons)) {
    for (const id of ids) {
      const free = isFreePreviewLesson(course, id);
      if (free !== LOCKED_MODE) pages.push({ kind: free ? "free-lesson" : "locked-lesson", course, id, url: `/${course}/${id}` });
    }
  }
  return pages;
}

/** DOM snapshot run inside the page. */
const SNAPSHOT = `(() => {
  const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const root = document.querySelector('main') || document.body;
  const label = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const links = [...document.querySelectorAll('a[href]')].filter(vis);
  const fields = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')].filter(vis);
  const unlabeled = fields.filter((f) => !(f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || (f.id && document.querySelector('label[for="' + f.id + '"]')) || f.closest('label')));
  const text = root.innerText || '';
  return {
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).slice(0, 2),
    textLength: text.replace(/\\s+/g, ' ').trim().length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    buttons: buttons.length,
    buttonLabels: [...new Set(buttons.map(label).filter(Boolean))].slice(0, 80),
    links: links.length,
    linkHrefs: [...new Set(links.map((a) => a.getAttribute('href')))].slice(0, 120),
    inputs: fields.filter((f) => f.tagName === 'INPUT').length,
    textareas: fields.filter((f) => f.tagName === 'TEXTAREA').length,
    selects: fields.filter((f) => f.tagName === 'SELECT').length,
    unlabeledFields: unlabeled.length,
    dialogs: document.querySelectorAll('[role=dialog]').length,
    tabs: document.querySelectorAll('[role=tab]').length,
    dropdowns: document.querySelectorAll('select, details, [aria-haspopup]').length,
    robots: document.querySelector('meta[name=robots]')?.getAttribute('content') || null,
    paywall: ${JSON.stringify(PAYWALL_MARKERS)}.some((m) => text.includes(m)),
    notFound: /404|찾을 수 없/.test(text),
  };
})()`;

/**
 * Step buttons of the lesson views: "Step 1 ·", "STEP 2", "Step 3." inside
 * <main>. The "다음: Step 2 …" / "← Step 3 …" navigation buttons at the foot of
 * a step are not steps — they move to one, and disappear once it is shown.
 */
const STEP_LABELS = `(() => {
  const main = document.querySelector('main');
  if (!main) return [];
  return [...new Set([...main.querySelectorAll('button')]
    .filter((b) => b.offsetParent && /^\\S*\\s*(step|STEP)\\s*\\d/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))
    .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()))].slice(0, 8);
})()`;

function problemsOf(events, snap, page) {
  const problems = [];
  if (events.exceptions.length) problems.push(`exceptions: ${events.exceptions[0]}`);
  if (events.console.length) problems.push(`console errors: ${events.console[0]}`);
  // The 404 page's own status is the one 404 a 404 page is allowed to log.
  const ownStatus = page.kind === "404";
  const log = events.log.filter((l) => !(ownStatus && /status of 404/.test(l)));
  if (log.length) problems.push(`log errors: ${log[0]}`);
  const bad = events.badResponses.filter((r) => !(ownStatus && r.status === 404));
  if (bad.length) problems.push(`HTTP ${bad[0].status} ${bad[0].url}`);
  if (events.failed.length) problems.push(`network failed: ${events.failed[0]}`);
  if (snap.overflowX) problems.push(`horizontal overflow (${snap.scrollWidth}px)`);
  if (snap.unlabeledFields) problems.push(`${snap.unlabeledFields} unlabeled form field(s)`);
  if (page.kind === "locked-lesson") {
    if (!snap.paywall) problems.push("paywall not rendered");
    if (!/noindex/.test(snap.robots || "")) problems.push("locked lesson is not noindex");
  } else if (page.kind === "free-lesson" || page.kind === "course" || page.kind === "tab" || page.kind === "home") {
    if (snap.paywall) problems.push("paywall rendered on an accessible page");
    // A tab page is a section introduction: one heading, a blurb and its course
    // links (96–137 chars of <main> text measured). A lesson or course page
    // carries far more, and below 150 something did not render.
    const floor = page.kind === "tab" ? 60 : 150;
    if (snap.textLength < floor) problems.push(`only ${snap.textLength} chars rendered`);
    if (page.kind === "tab" && snap.h1.length !== 1) problems.push(`tab page has ${snap.h1.length} h1`);
  }
  if (page.kind === "404" && !snap.notFound) problems.push("404 page has no not-found text");
  return problems;
}

async function visit(tab, page, viewport) {
  const rows = [];
  await tab.viewport(viewport);
  tab.resetEvents();
  // A fresh start per page: no progress or answers carried over from a previous page.
  await tab.goto(`${BASE}/`, 50).catch(() => {});
  await tab.eval("try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}").catch(() => {});
  tab.resetEvents();
  await tab.goto(`${BASE}${page.url}`, LOCKED_MODE ? 700 : 1600);
  let snap = await tab.eval(SNAPSHOT);
  rows.push({ ...page, viewport, step: "(initial)", snap, problems: problemsOf(tab.events, snap, page) });

  if (page.kind === "free-lesson") {
    const steps = (await tab.eval(STEP_LABELS)).filter((l) => !/^(다음|←|→|이전)/.test(l) && !/이동\s*→?$/.test(l));
    for (const label of steps) {
      tab.resetEvents();
      const clicked = await tab.eval(`(() => {
        const b = [...document.querySelectorAll('main button')].find((x) => (x.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)});
        if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true;
      })()`);
      await sleep(700);
      snap = await tab.eval(SNAPSHOT);
      const problems = problemsOf(tab.events, snap, page);
      if (!clicked) problems.push("step button disappeared before it could be clicked");
      rows.push({ ...page, viewport, step: label, snap, problems });
    }
  }
  return rows;
}

(async () => {
  const pages = pageList();
  console.log(`${LOCKED_MODE ? "locked" : "accessible"} sweep — ${BASE} — ${pages.length} pages × 2 viewports, ${WORKERS} workers`);
  const browser = await launch({ port: LOCKED_MODE ? 9351 : 9350 });
  const results = [];
  const queue = pages.flatMap((p) => [
    [p, "desktop"],
    [p, "mobile"],
  ]);
  let cursor = 0;
  let done = 0;
  async function worker() {
    const tab = await Tab.open(browser.port);
    for (;;) {
      const index = cursor++;
      if (index >= queue.length) break;
      const [page, viewport] = queue[index];
      try {
        results.push(...(await visit(tab, page, viewport)));
      } catch (err) {
        results.push({ ...page, viewport, step: "(visit)", snap: null, problems: [`visit failed: ${err.message}`] });
      }
      done++;
      if (done % 50 === 0) console.log(`  ... ${done}/${queue.length}`);
    }
    await tab.close();
  }
  try {
    await Promise.all(Array.from({ length: WORKERS }, worker));
  } finally {
    browser.proc.kill();
  }

  results.sort((a, b) => (a.url + a.viewport + a.step).localeCompare(b.url + b.viewport + b.step));
  const failed = results.filter((r) => r.problems.length);
  const summary = {
    base: BASE,
    mode: LOCKED_MODE ? "locked" : "accessible",
    pages: pages.length,
    checks: results.length,
    pass: results.length - failed.length,
    fail: failed.length,
    totals: {
      buttons: results.reduce((s, r) => s + (r.snap?.buttons || 0), 0),
      links: results.reduce((s, r) => s + (r.snap?.links || 0), 0),
      inputs: results.reduce((s, r) => s + (r.snap?.inputs || 0), 0),
      textareas: results.reduce((s, r) => s + (r.snap?.textareas || 0), 0),
      selects: results.reduce((s, r) => s + (r.snap?.selects || 0), 0),
      dialogs: results.reduce((s, r) => s + (r.snap?.dialogs || 0), 0),
    },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `inventory-${summary.mode}.json`), JSON.stringify({ summary, results }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
  const byProblem = new Map();
  for (const r of failed) for (const p of r.problems) {
    const key = p.replace(/\d{3,}px|https?:\/\/\S+/g, "…").slice(0, 110);
    if (!byProblem.has(key)) byProblem.set(key, []);
    byProblem.get(key).push(`${r.url} [${r.viewport}] ${r.step}`);
  }
  for (const [p, where] of byProblem) console.log(`FAIL ×${where.length}  ${p}\n        e.g. ${where.slice(0, 4).join(" | ")}`);
  process.exitCode = failed.length ? 1 : 0;
})();
