#!/usr/bin/env node
/**
 * ISS-09 / ISS-10 / R-00 — do the corrected READING passages and cards reach the screen?
 * Checked in a real (headless Edge) browser against an ISOLATED `next dev` (port 3214): durable
 * storage blanked so the local file store is used, random LICENSE_* and ADMIN_SESSION_SECRET, no
 * PIN; stops before any write unless the admin list starts empty. The licence code is generated
 * for this run's random secret — not valid on the real site.
 *
 * Lessons: pr237 (R-48 order/notes), pr122 (R-45 rewrite), pr024 (ISS-10 example `firms`),
 * pr087 (`watching`), pr130 (`boredom` placeholder), and the script pages pr237-1 and pr024-1
 * (R-00: the script page used to show older cards).
 *  - the lesson opens with the test licence
 *  - Step 1 shows every English sentence of the lesson data, in order, and no exam residue
 *  - Step 2 shows exactly the 14 cards of the data — part of speech, word and meaning, in order —
 *    after "전체 뜻 보기"; the old wrong meanings named in the audit are not on screen
 *  - Step 4 shows every Korean sentence
 *  - screenshot: docs/qa-2026-09-17/out/reading-cards-pr237.png
 *
 *   node verify-reading-ui.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3214;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "../out");
const DATA_FILES = ["data/license-devices.json", "data/student-progress.json"].map((f) => path.join(REPO, f));
for (const f of DATA_FILES) if (fs.existsSync(f)) { console.error(`STOP: ${f} exists`); process.exit(2); }

const secrets = {
  LICENSE_SALT: crypto.randomBytes(24).toString("hex"),
  LICENSE_SECRET: crypto.randomBytes(24).toString("hex"),
  ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
};
const childEnv = { ...process.env, ...secrets, NODE_ENV: "development", PORT: String(PORT) };
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"]) childEnv[k] = " ";
delete childEnv.VERCEL;
Object.assign(process.env, secrets);
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const adminAuth = loadTs(path.join(REPO, "src/lib/adminAuth.ts"));
const serverLicense = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const adminCookie = `${adminAuth.ADMIN_COOKIE_NAME}=${adminAuth.createAdminSessionToken()}`;

const lesson = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
// Old wrong meanings / residue the audit quoted for these lessons — must not be on screen.
const OLD = {
  pr237: ["*ligament", "(b)little", "히트", "열심히"],
  "pr237-1": ["*ligament", "(b)little"],
  pr122: ["In recent years, Colombia has not received", "demand for coffee in the world has dropped"],
  pr024: ["확고한"],
  "pr024-1": ["확고한"],
  pr087: ["시계"],
  pr130: ["(핵심 어휘)", "존경하다", "동료"],
};
const LESSONS = ["pr237", "pr122", "pr024", "pr087", "pr130", "pr237-1", "pr024-1"];

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const clickText = (tab, selector, text) => tab.eval(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`);
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
const inOrder = (hay, needles) => { let at = 0; for (const n of needles) { const i = hay.indexOf(squash(n), at); if (i < 0) return n; at = i + 1; } return null; };

(async () => {
  const next = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  next.stdout.on("data", (d) => (log += d));
  next.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/api/admin/check`)).ok) break; } catch {} await sleep(1000); }
    const guard = await fetch(`${BASE}/api/license/status`, { headers: { cookie: adminCookie } });
    const gbody = await guard.json().catch(() => ({}));
    const isolated = guard.status === 200 && gbody.records && Object.keys(gbody.records).length === 0;
    check("isolated server (admin list starts empty)", isolated, `status ${guard.status}`);
    if (!isolated) throw new Error("not isolated — stopping before any write");

    browser = await launch({ port: 9379 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("desktop");
    let registered = false;

    for (const id of LESSONS) {
      const data = lesson(id);
      await tab.send("Page.navigate", { url: `${BASE}/reading/${id}` });
      let state = "";
      for (let i = 0; i < 240 && !state; i++) {
        await sleep(500);
        state = await tab.eval(`document.querySelector('[data-kig-paywall="license"]') ? 'paywall' : (document.body.textContent.includes('Step 2 · 핵심 어휘') ? 'open' : '')`).catch(() => "");
      }
      if (state === "paywall" && !registered) {
        await sleep(1500);
        await clickText(tab, "[data-kig-paywall] button", "이용권 코드 등록");
        for (let i = 0; i < 20 && !(await tab.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
        const key = serverLicense.generateLicenseKey("1Y");
        await tab.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
        registered = true;
        state = "";
        for (let i = 0; i < 120 && state !== "open"; i++) { await sleep(500); state = await tab.eval(`!document.querySelector('[data-kig-paywall="license"]') && document.body.textContent.includes('Step 2 · 핵심 어휘') ? 'open' : ''`).catch(() => ""); }
      }
      check(`${id}: opens with the test licence`, state === "open", state || "timeout");
      if (state !== "open") continue;
      await sleep(1200);

      // Step 1 — English sentences in order
      await clickText(tab, "nav button", "Step 1");
      await sleep(600);
      let text = squash(await tab.eval("document.body.textContent"));
      const missingEn = inOrder(text, data.readingSentences.map((s) => s.english));
      check(`${id}: Step 1 shows all ${data.readingSentences.length} English sentences in order`, !missingEn, missingEn || "");

      // Step 2 — cards
      await clickText(tab, "nav button", "Step 2");
      await sleep(600);
      await clickText(tab, "section[aria-label='Key Vocabulary'] button", "전체 뜻 보기");
      await sleep(500);
      const shown = await tab.eval(`[...document.querySelectorAll("section[aria-label='Key Vocabulary'] div.rounded-2xl")].filter((card) => [...card.querySelectorAll('span')].some((s) => /^#\\d\\d$/.test(s.textContent.trim()))).map((card) => {
        const spans = [...card.querySelectorAll('span')];
        const meaning = spans.find((s) => s.className.includes('text-[13.5px]'));
        return [spans[0]?.textContent.trim(), spans[1]?.textContent.trim(), meaning ? meaning.textContent.trim() : null].join('|');
      })`);
      const expected = data.readingVocabulary.map((c) => [c.partOfSpeech, c.word, c.korean].join("|"));
      const firstDiff = expected.findIndex((e, i) => shown[i] !== e);
      check(`${id}: Step 2 shows the 14 cards of the data (pos|word|meaning, in order)`, shown.length === 14 && firstDiff === -1, `shown ${shown.length}; first difference #${firstDiff + 1}: screen "${shown[firstDiff]}" vs data "${expected[firstDiff]}"`);
      if (id === "pr237") {
        await tab.eval(`document.querySelector("section[aria-label='Key Vocabulary'] div.grid")?.scrollIntoView({ block: 'start' })`);
        await sleep(400);
        const shot = await tab.send("Page.captureScreenshot", { format: "png" });
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, "reading-cards-pr237.png"), Buffer.from(shot.data, "base64"));
      }
      text = squash(await tab.eval("document.body.innerText"));
      const cardText = squash(await tab.eval(`document.querySelector("section[aria-label='Key Vocabulary']")?.innerText || ''`));

      // Step 4 — Korean sentences
      await clickText(tab, "nav button", "Step 4");
      await sleep(800);
      const text4 = squash(await tab.eval("document.body.innerText"));
      const missingKo = data.readingSentences.map((s) => s.korean).find((k) => !text4.includes(squash(k)));
      check(`${id}: Step 4 shows all ${data.readingSentences.length} Korean sentences`, !missingKo, missingKo || "");

      // on screen = innerText; in the page data = everything the browser received (scripts included)
      const payload = squash(await tab.eval("document.documentElement.outerHTML"));
      const old = (OLD[id] || []).filter((w) => (/[가-힣]/.test(w) && !w.includes(" ") ? cardText : text + " " + text4).includes(w));
      check(`${id}: old wrong forms not on screen (${(OLD[id] || []).join(", ")})`, old.length === 0, old.join(", "));
      const residue = ["*ligament", "(b)little", "(핵심 어휘)", "*torso", "*nearsighted", "①"].filter((w) => payload.includes(w));
      check(`${id}: no exam notes / placeholders anywhere in the page data`, residue.length === 0, residue.join(", "));
    }

    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/Download the React DevTools|HMR|Fast Refresh|eval\(\) is not supported in this environment|Failed to load resource.*(403|404)|Server rejected license/.test(e));
    check("no unexpected console errors", errs.length === 0, errs.slice(0, 3).join(" | "));
    await tab.close();
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    next.kill();
    await sleep(1500);
    for (const f of DATA_FILES) fs.rmSync(f, { force: true });
    fs.writeFileSync(path.join(OUT, "reading-ui-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
