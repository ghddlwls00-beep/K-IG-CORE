#!/usr/bin/env node
/**
 * ISS-13 · PERF-01 · SEC-03 — the learner's side, in a real (headless Edge) browser against an
 * ISOLATED `next dev` (port 3212): durable-storage settings blanked so the local file store
 * is used, random LICENSE_* and ADMIN_SESSION_SECRET, no PIN. It aborts before any write
 * unless the admin list of that server starts empty. The licence code is generated for
 * this run's random secret, so it is not valid on the real site.
 *
 * Every document load in a tab is counted (sessionStorage counter injected before page
 * scripts), so "reloaded itself" is measured, not guessed.
 *
 *   A  register a code in the modal on a paid lesson that shows the paywall
 *      → one reload, lesson body shown
 *   B  PERF-01: a NEW tab on another paid lesson with a valid cookie → no reload
 *   C  ISS-13: localStorage wiped (what Safari does after 7 days), cookies kept
 *      → licence and the SAME device ID restored, lesson shown, no reload, still 1 slot
 *   D  ISS-13: localStorage wiped AND session cookie gone, device cookie kept; the learner
 *      re-enters the code → still 1 slot (was a second slot)
 *   E  SEC-03: admin resets the devices → the page drops the licence and shows the paywall
 *
 *   node verify-license-restore-ui.cjs     exit 0 = every case as expected
 *
 * BUG-018 (2026-09-24 · 토큰 v2): case C checks the restored copy has the token and the masked code and NO "key" field
 * (it used to require the code back).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3212;
const BASE = `http://localhost:${PORT}`;
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
const licenseLib = loadTs(path.join(REPO, "src/lib/license.ts")); // BUG-018: maskLicenseKey — what the browser may keep
const adminCookie = `${adminAuth.ADMIN_COOKIE_NAME}=${adminAuth.createAdminSessionToken()}`;

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const admin = async (url, body) => {
  const res = await fetch(BASE + url, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", cookie: adminCookie }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const COUNT_LOADS = `try { sessionStorage.setItem('__kigLoads', String((Number(sessionStorage.getItem('__kigLoads')) || 0) + 1)); } catch (e) {}`;

async function openTab(browser) {
  const tab = await Tab.open(browser.port);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: COUNT_LOADS });
  await tab.viewport("desktop");
  return tab;
}
async function goto(tab, url, waitFor) {
  await tab.send("Page.navigate", { url: BASE + url });
  for (let i = 0; i < 240; i++) {
    const ok = await tab.eval(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(url)} && (${waitFor})`).catch(() => false);
    if (ok) return true;
    await sleep(500);
  }
  return false;
}
const state = (tab) => tab.eval(`({
  loads: Number(sessionStorage.getItem('__kigLoads')) || 0,
  paywall: !!document.querySelector('[data-kig-paywall="license"]'),
  licence: localStorage.getItem('kig:license:v1'),
  deviceId: localStorage.getItem('kig:device:id:v1'),
  text: document.body.innerText.slice(0, 4000),
})`);

(async () => {
  const next = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  next.stdout.on("data", (d) => (log += d));
  next.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/api/admin/check`)).ok) break; } catch {} await sleep(1000); }
    const guard = await admin("/api/license/status");
    const isolated = guard.status === 200 && guard.body.records && Object.keys(guard.body.records).length === 0;
    check("isolated server (admin list starts empty)", isolated, `status ${guard.status}`);
    if (!isolated) throw new Error("not isolated — stopping before any write");

    const key = serverLicense.generateLicenseKey("1Y");
    browser = await launch({ port: 9377 });

    // --- A: register in the modal on a paywalled lesson
    const tabA = await openTab(browser);
    check("A: paid lesson shows the paywall before registering", await goto(tabA, "/reading/pr100", `!!document.querySelector('[data-kig-paywall="license"]')`));
    await sleep(1500);
    const deviceA = (await state(tabA)).deviceId;
    await tabA.eval(`(() => { const b = [...document.querySelectorAll('[data-kig-paywall] button')].find((x) => x.textContent.includes('이용권 코드 등록')); b.click(); })()`);
    for (let i = 0; i < 20 && !(await tabA.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
    await tabA.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
    let sA;
    for (let i = 0; i < 60; i++) { await sleep(500); sA = await state(tabA).catch(() => null); if (sA && sA.loads >= 2 && !sA.paywall && sA.text.includes("READING 목록")) break; }
    check("A: one reload after registering, lesson shown", sA && sA.loads === 2 && !sA.paywall && !!sA.licence, JSON.stringify({ loads: sA && sA.loads, paywall: sA && sA.paywall }));
    await sleep(3000);
    check("A: no further reloads", (await state(tabA)).loads === 2);
    const rec1 = (await admin("/api/license/status")).body.records[key];
    check("A: 1 device registered with this browser's ID", rec1 && rec1.devices.length === 1 && rec1.devices[0].deviceId === deviceA);

    // --- B: PERF-01 — a new tab, valid cookie, already-verified licence → no reload
    const tabB = await openTab(browser);
    await goto(tabB, "/reading/pr101", `document.body.innerText.includes('READING 목록')`);
    await sleep(4000);
    const sB = await state(tabB);
    check("B: new tab on a paid lesson renders the lesson", !sB.paywall && sB.text.includes("READING 목록"));
    check("B: PERF-01 — no reload in a new tab (was 1 per tab)", sB.loads === 1, `loads ${sB.loads}`);
    await tabB.close();

    // --- C: Safari wiped localStorage; cookies survive
    await tabA.eval("localStorage.clear()");
    const tabC = await openTab(browser);
    await goto(tabC, "/reading/pr102", `document.body.innerText.includes('READING 목록')`);
    let sC;
    for (let i = 0; i < 20; i++) { await sleep(500); sC = await state(tabC); if (sC.licence) break; }
    await sleep(2500);
    sC = await state(tabC);
    check("C: lesson still opens from the server cookie", !sC.paywall && sC.text.includes("READING 목록"));
    // BUG-018 (2026-09-24, 토큰 v2): the restored copy holds the token and the MASKED code — no "key" field. This used to
    // require the code itself back (JSON.parse(sC.licence).key === key), exactly what BUG-018 removed.
    const restored = (() => { try { return JSON.parse(sC.licence || "null"); } catch { return null; } })();
    check("C: licence restored into localStorage (no code — masked code + token)", !!restored && !("key" in restored) && restored.maskedKey === licenseLib.maskLicenseKey(key) && typeof restored.token === "string" && restored.token.length > 0, restored ? `fields ${Object.keys(restored).sort().join(",")}` : "none");
    check("C: the SAME device ID restored", sC.deviceId === deviceA, `${sC.deviceId} vs ${deviceA}`);
    check("C: no reload", sC.loads === 1, `loads ${sC.loads}`);
    check("C: still 1 device slot", (await admin("/api/license/status")).body.records[key].devices.length === 1);
    await tabC.close();

    // --- D: localStorage wiped AND session cookie gone; device cookie kept; code re-entered
    await tabA.eval("localStorage.clear()");
    await tabA.send("Network.deleteCookies", { name: "kig_license_session", url: BASE });
    const tabD = await openTab(browser);
    await goto(tabD, "/reading/pr103", `!!document.querySelector('[data-kig-paywall="license"]')`);
    await sleep(2500);
    const beforeD = await state(tabD);
    check("D: without the session cookie the lesson is locked", beforeD.paywall);
    check("D: device ID taken back from the device cookie", beforeD.deviceId === deviceA, `${beforeD.deviceId} vs ${deviceA}`);
    await tabD.eval(`(() => { const b = [...document.querySelectorAll('[data-kig-paywall] button')].find((x) => x.textContent.includes('이용권 코드 등록')); b.click(); })()`);
    for (let i = 0; i < 20 && !(await tabD.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
    await tabD.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
    let sD;
    for (let i = 0; i < 60; i++) { await sleep(500); sD = await state(tabD).catch(() => null); if (sD && !sD.paywall && sD.text.includes("READING 목록")) break; }
    check("D: re-entered code opens the lesson", sD && !sD.paywall);
    const recD = (await admin("/api/license/status")).body.records[key];
    check("D: ISS-13 — still 1 device slot after re-entering (was a second slot)", recD.devices.length === 1 && recD.devices[0].deviceId === deviceA, JSON.stringify(recD.devices.map((d) => d.deviceId)));
    await tabD.close();

    // --- E: SEC-03 — admin resets the devices
    await admin("/api/license/reset", { key });
    const tabE = await openTab(browser);
    await goto(tabE, "/reading/pr104", `!!document.querySelector('[data-kig-paywall="license"]')`);
    let sE;
    for (let i = 0; i < 16; i++) { await sleep(500); sE = await state(tabE); if (!sE.licence) break; }
    check("E: SEC-03 — after admin reset the lesson is locked and the page drops the licence", sE.paywall && !sE.licence);
    await tabE.close();

    const errs = [...tabA.events.console, ...tabA.events.exceptions].filter((e) => !/Download the React DevTools|HMR|Fast Refresh|eval\(\) is not supported in this environment|Failed to load resource.*(403|404)|Server rejected license/.test(e));
    check("no unexpected console errors in tab A", errs.length === 0, errs.slice(0, 3).join(" | "));
    await tabA.close();
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    next.kill();
    await sleep(1500);
    for (const f of DATA_FILES) fs.rmSync(f, { force: true });
    fs.writeFileSync(path.join(__dirname, "../out/license-restore-ui-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
