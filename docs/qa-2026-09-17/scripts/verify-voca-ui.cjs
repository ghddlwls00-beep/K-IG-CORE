#!/usr/bin/env node
/**
 * VOCA — do the corrected word list and meanings reach a RETURNING learner?
 * The Step 3 Leitner grid used to be restored from the browser as it was saved, so a learner
 * who had opened mv2-12 kept seeing the old repeated month list and old meanings.
 * Real (headless Edge) browser against an ISOLATED `next dev` (port 3215): durable storage
 * blanked, random LICENSE_* / ADMIN_SESSION_SECRET, no PIN; stops before any write unless the
 * admin list starts empty. The licence code is generated for this run's random secret.
 *
 *  - progress saved the OLD way is put into localStorage first (mv2-12: November box 3 with
 *    4 correct in a row, March "행진하다; 행진"; hv-48: apparently "분명히" box 2)
 *  - mv2-12 Step 3 shows exactly the 30 new words with today's dictionary meanings, in order;
 *    November keeps Box 3 and its streak; no March
 *  - hv-48 Step 3: apparently shows 보아하니, 겉보기에는 and keeps Box 2
 *  - hv-66 Step 3 (nothing saved): technological 과학 기술의, technical 기술의, 기술적인
 *  - screenshot: docs/qa-2026-09-17/out/voca-leitner-mv2-12.png
 *
 *   node verify-voca-ui.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3215;
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

const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const wordsOf = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/phonics", `${id}.json`), "utf8")).blocks.find((b) => b.type === "wordgrid").rows.flat();
const meaningOf = (w) => (dict[w] || dict[w.toLowerCase().replace(/[()"]/g, "").trim()]).meaning;
const t = Date.now() - 86400000;
const OLD = {
  "kig:voca:leitner:phonics/mv2-12": {
    november: { word: "November", meaning: "11월", box: 3, lastTestedAt: t, streak: 4 },
    march: { word: "March", meaning: "행진하다; 행진", box: 2, lastTestedAt: t, streak: 1 },
    october: { word: "October", meaning: "10월", box: 1, lastTestedAt: t, streak: 0 },
  },
  "kig:voca:leitner:phonics/hv-48": {
    apparently: { word: "apparently", meaning: "분명히", box: 2, lastTestedAt: t, streak: 2 },
  },
};

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const clickText = (tab, selector, text) => tab.eval(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`);
const readGrid = (tab) => tab.eval(`[...document.querySelectorAll('div.rounded-2xl')].filter((d) => /회 연속 정답/.test(d.textContent) && d.querySelector('span.font-mono.text-\\\\[18px\\\\]')).map((d) => ({
  word: d.querySelector('span.font-mono.text-\\\\[18px\\\\]').textContent.trim(),
  meaning: d.querySelector('span.text-\\\\[13\\\\.5px\\\\]')?.textContent.trim(),
  box: (d.textContent.match(/Box (\\d)/) || [])[1],
  streak: (d.textContent.match(/(\\d+)회 연속 정답/) || [])[1],
}))`);

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

    browser = await launch({ port: 9380 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("desktop");
    await tab.send("Page.navigate", { url: `${BASE}/phonics` });
    await sleep(4000);
    await tab.eval(`(() => { const o = ${JSON.stringify(OLD)}; for (const k in o) localStorage.setItem(k, JSON.stringify(o[k])); return true; })()`);
    let registered = false;

    for (const id of ["mv2-12", "hv-48", "hv-66"]) {
      await tab.send("Page.navigate", { url: `${BASE}/phonics/${id}` });
      let state = "";
      for (let i = 0; i < 240 && !state; i++) {
        await sleep(500);
        state = await tab.eval(`document.querySelector('[data-kig-paywall="license"]') ? 'paywall' : (document.body.textContent.includes('발음 테스트 & 오답노트') ? 'open' : '')`).catch(() => "");
      }
      if (state === "paywall" && !registered) {
        await sleep(1500);
        await clickText(tab, "[data-kig-paywall] button", "이용권 코드 등록");
        for (let i = 0; i < 20 && !(await tab.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
        const key = serverLicense.generateLicenseKey("1Y");
        await tab.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
        registered = true;
        state = "";
        for (let i = 0; i < 120 && state !== "open"; i++) { await sleep(500); state = await tab.eval(`!document.querySelector('[data-kig-paywall="license"]') && document.body.textContent.includes('발음 테스트 & 오답노트') ? 'open' : ''`).catch(() => ""); }
      }
      check(`${id}: opens`, state === "open", state || "timeout");
      if (state !== "open") continue;
      await sleep(1500);
      await clickText(tab, "button", "발음 테스트 & 오답노트");
      await sleep(1000);
      const grid = await readGrid(tab);
      const words = wordsOf(id);
      const expected = words.map((w) => `${w}|${meaningOf(w)}`);
      const shown = grid.map((c) => `${c.word}|${c.meaning}`);
      const diff = expected.findIndex((e, i) => shown[i] !== e);
      check(`${id}: Step 3 grid = the lesson's ${words.length} words with today's meanings, in order`, grid.length === words.length && diff === -1, `shown ${grid.length}; first difference #${diff + 1}: screen "${shown[diff]}" vs data "${expected[diff]}"`);

      if (id === "mv2-12") {
        const nov = grid.find((c) => c.word === "November");
        check("mv2-12: November keeps the saved progress (Box 3, 4 in a row)", nov && nov.box === "3" && nov.streak === "4", JSON.stringify(nov));
        check("mv2-12: no March / October card and no 행진하다 from the old saved list", !grid.some((c) => /March|October/.test(c.word) || /행진/.test(c.meaning || "")), JSON.stringify(grid.slice(0, 3)));
        await tab.eval(`[...document.querySelectorAll('div.rounded-2xl')].find((d) => /회 연속 정답/.test(d.textContent))?.scrollIntoView({ block: 'start' })`);
        await sleep(400);
        const shot = await tab.send("Page.captureScreenshot", { format: "png" });
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, "voca-leitner-mv2-12.png"), Buffer.from(shot.data, "base64"));
      }
      if (id === "hv-48") {
        const a = grid.find((c) => c.word === "apparently");
        check("hv-48: apparently shows 보아하니, 겉보기에는 (saved 분명히 not shown) and keeps Box 2", a && a.meaning === "보아하니, 겉보기에는" && a.box === "2", JSON.stringify(a));
        check("hv-48: impartial replaces the second peer", grid.filter((c) => c.word === "peer").length === 1 && grid.some((c) => c.word === "impartial"));
      }
      if (id === "hv-66") {
        const tl = grid.find((c) => c.word === "technological"), tc = grid.find((c) => c.word === "technical");
        check("hv-66: technological 과학 기술의 ≠ technical", tl && tc && tl.meaning === "과학 기술의" && tc.meaning !== tl.meaning, JSON.stringify([tl, tc]));
      }
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
    fs.writeFileSync(path.join(OUT, "voca-ui-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
