#!/usr/bin/env node
/**
 * L-71 / L-80 — the riddle answers that sat in the Korean line of LISTENING rounds now sit
 * behind "정답 보기". Checked in a real (headless Edge) browser against an ISOLATED `next dev`
 * (port 3213): durable storage blanked so the local file store is used, random LICENSE_* and
 * ADMIN_SESSION_SECRET, no PIN; stops before any write unless the admin list starts empty.
 * The licence code is generated for this run's random secret — not valid on the real site.
 *
 *  - d171 (paid) opens after registering the test code in the modal
 *  - Step 5 (full script): the Korean line of #8 has no answer in it; the answer is NOT on
 *    screen until "정답 보기" is tapped, and is on screen after
 *  - only the riddle row has the button (1 in the list)
 *  - Step 2 (dictation): #1 has no button, #8 has it, and it is closed again after moving on
 *  - screenshot: docs/qa-2026-09-17/out/ld-riddle-answer.png
 *
 *   node verify-ld-riddle-ui.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3213;
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

const script = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const row8 = script.d171.find((r) => r.n === "8");
const ANSWER = row8.answer;

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const clickText = (tab, selector, text) => tab.eval(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`);
const visibleText = (tab) => tab.eval("document.body.innerText");

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
    check("d171 #8 has an answer and its Korean line has none", !!ANSWER && !/[()]/.test(row8.ko), row8.ko);

    browser = await launch({ port: 9378 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("desktop");
    await tab.send("Page.navigate", { url: `${BASE}/ld/d171` });
    let paywall = false;
    for (let i = 0; i < 240 && !paywall; i++) { await sleep(500); paywall = await tab.eval(`!!document.querySelector('[data-kig-paywall="license"]')`).catch(() => false); }
    check("d171 is locked before registering", paywall);
    await sleep(1500);
    await clickText(tab, "[data-kig-paywall] button", "이용권 코드 등록");
    for (let i = 0; i < 20 && !(await tab.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
    const key = serverLicense.generateLicenseKey("1Y");
    await tab.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
    let open = false;
    for (let i = 0; i < 120 && !open; i++) { await sleep(500); open = await tab.eval(`!document.querySelector('[data-kig-paywall="license"]') && document.body.textContent.includes('1.5배속 대조')`).catch(() => false); }
    check("d171 opens after registering the test code", open);
    await sleep(1500);

    // Step 5 — full script list
    await clickText(tab, "button", "1.5배속 대조");
    await sleep(800);
    const listState = await tab.eval(`({
      buttons: [...document.querySelectorAll('details > summary')].filter((s) => s.textContent.includes('정답 보기')).length,
      openCount: [...document.querySelectorAll('details')].filter((d) => d.open).length,
    })`);
    let text = await visibleText(tab);
    check("Step 5: the Korean line of #8 is shown", text.includes(row8.ko));
    check("Step 5: exactly one '정답 보기' (only the riddle row)", listState.buttons === 1, JSON.stringify(listState));
    check("Step 5: the answer is not on screen before tapping", !text.includes(ANSWER));
    await clickText(tab, "details > summary", "정답 보기");
    await sleep(400);
    text = await visibleText(tab);
    check("Step 5: the answer is on screen after tapping", text.includes(ANSWER));
    await tab.eval(`[...document.querySelectorAll('details')].find((d) => d.open)?.scrollIntoView({ block: 'center' })`);
    await sleep(300);
    const shot = await tab.send("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "ld-riddle-answer.png"), Buffer.from(shot.data, "base64"));

    // Step 2 — dictation, sentence by sentence
    await clickText(tab, "button", "딕테이션");
    await sleep(800);
    const onFirst = await tab.eval(`[...document.querySelectorAll('details > summary')].filter((s) => s.textContent.includes('정답 보기')).length`);
    check("Step 2: #1 has no '정답 보기'", onFirst === 0, String(onFirst));
    for (let i = 0; i < 7; i++) { await clickText(tab, "button", "다음 문장"); await sleep(250); }
    const on8 = await tab.eval(`({ n: [...document.querySelectorAll('span')].some((s) => s.textContent.trim() === '#8'), buttons: [...document.querySelectorAll('details > summary')].filter((s) => s.textContent.includes('정답 보기')).length, open: [...document.querySelectorAll('details')].some((d) => d.open) })`);
    check("Step 2: #8 has '정답 보기', closed", on8.n && on8.buttons === 1 && !on8.open, JSON.stringify(on8));

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
    fs.writeFileSync(path.join(OUT, "ld-riddle-ui-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
