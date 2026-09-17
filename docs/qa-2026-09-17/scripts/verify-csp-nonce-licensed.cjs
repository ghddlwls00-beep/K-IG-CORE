#!/usr/bin/env node
/**
 * SEC-05 — the nonce policy on the LICENSED lesson views, which a local `next start` cannot open
 * (durable storage is blanked, so a licence cannot be activated there; see verify-csp-nonce.cjs).
 *
 * Runs an ISOLATED `next dev` (port 3219): durable storage blanked, random LICENSE_* /
 * ADMIN_SESSION_SECRET, no PIN; stops before any write unless the admin list starts empty; a test
 * licence from `serverLicense.generateLicenseKey("1Y")` is registered through the paywall like a
 * learner would, and the local data files are removed afterwards.
 *
 * Headless Edge with a `securitypolicyviolation` listener installed before any page script, plus CDP
 * Audits CSP issues. One paid lesson per course: opened, the play button pressed, then every study
 * step clicked. Pass = the dev policy is the nonce policy (plus `'unsafe-eval'`, dev only), every
 * lesson opened licensed, and zero violations anywhere.
 *
 * Dev differs from production in one directive (`'unsafe-eval'`) and in the dev runtime's own
 * scripts; the production walk is verify-csp-nonce.cjs. Written and checked by the same agent.
 *
 *   node verify-csp-nonce-licensed.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3219;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "../out");
const DATA_FILES = ["data/license-devices.json", "data/student-progress.json"].map((f) => path.join(REPO, f));
for (const f of DATA_FILES) if (fs.existsSync(f)) { console.error(`STOP: ${f} exists`); process.exit(2); }

const secrets = { LICENSE_SALT: crypto.randomBytes(24).toString("hex"), LICENSE_SECRET: crypto.randomBytes(24).toString("hex"), ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex") };
const childEnv = { ...process.env, ...secrets, NODE_ENV: "development", PORT: String(PORT) };
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"]) childEnv[k] = " ";
delete childEnv.VERCEL;
Object.assign(process.env, secrets);
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const adminAuth = loadTs(path.join(REPO, "src/lib/adminAuth.ts"));
const serverLicense = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const adminCookie = `${adminAuth.ADMIN_COOKIE_NAME}=${adminAuth.createAdminSessionToken()}`;

const PAID = ["/ld/d150", "/reading/pr100", "/grammar1/gh1-058", "/grammar1/gh1-020", "/grammar2/gh2-030", "/phonics/hv-48", "/student/s1-3"];

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });

const LISTENER = `(() => {
  window.__cspv = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspv.push({ d: e.effectiveDirective, b: String(e.blockedURI).slice(0, 80), s: String(e.sample || '').slice(0, 60) }), true);
})();`;

const STEP_LABELS = `(() => {
  const main = document.querySelector('main');
  if (!main) return [];
  return [...new Set([...main.querySelectorAll('button')]
    .filter((b) => b.offsetParent && /^\\S*\\s*(step|STEP)\\s*\\d/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))
    .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()))]
    .filter((l) => !/^(다음|←|→|이전)/.test(l) && !/(이동|하러 가기)\\s*→?$/.test(l)).slice(0, 8);
})()`;

(async () => {
  const next = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  next.stdout.on("data", (d) => (log += d));
  next.stderr.on("data", (d) => (log += d));
  let browser;
  const walk = {};
  try {
    for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/api/admin/check`)).ok) break; } catch {} await sleep(1000); }
    const guard = await fetch(`${BASE}/api/license/status`, { headers: { cookie: adminCookie } });
    const gbody = await guard.json().catch(() => ({}));
    const isolated = guard.status === 200 && gbody.records && Object.keys(gbody.records).length === 0;
    check("isolated server (admin list starts empty)", isolated, `status ${guard.status}`);
    if (!isolated) throw new Error("not isolated — stopping before any write");

    // the dev policy, as served
    const res = await fetch(`${BASE}/ld/d001`);
    const html = await res.text();
    const csp = res.headers.get("content-security-policy") || "";
    const nonce = (csp.match(/'nonce-([A-Za-z0-9+/_=-]+)'/) || [])[1];
    const tags = html.match(/<script\b[^>]*>/gi) || [];
    const scriptSrc = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src"));
    check(`dev policy: ${scriptSrc}`, /^script-src 'self' 'nonce-[^']+' 'strict-dynamic' 'unsafe-eval'$/.test(scriptSrc || "") && (csp.match(/default-src/g) || []).length === 1, csp);
    check(`dev /ld/d001: ${tags.filter((t) => nonce && t.includes(`nonce="${nonce}"`)).length}/${tags.length} <script> tags carry the nonce`, nonce && tags.length > 0 && tags.every((t) => t.includes(`nonce="${nonce}"`)), tags.filter((t) => !t.includes(`nonce="${nonce}"`)).slice(0, 3).join(" "));

    browser = await launch({ port: 9384 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("desktop");
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: LISTENER });
    const issues = [];
    await tab.send("Audits.enable");
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Audits.issueAdded" && msg.params?.issue?.code === "ContentSecurityPolicyIssue") {
        const d = msg.params.issue.details?.contentSecurityPolicyIssueDetails || {};
        issues.push(`${d.violatedDirective || ""} ${d.contentSecurityPolicyViolationType || ""} ${d.blockedURL || ""}`.trim());
      }
      orig(msg);
    };

    let registered = false;
    for (const p of PAID) {
      const row = { opened: false, steps: [], violations: [], issues: [], played: null };
      await tab.send("Page.navigate", { url: "about:blank" });
      await sleep(200);
      await tab.send("Page.navigate", { url: `${BASE}${p}` });
      let s = "";
      for (let i = 0; i < 240 && !s; i++) {
        await sleep(500);
        s = await tab.eval(`document.querySelector('[data-kig-paywall="license"]') ? 'paywall' : (document.readyState === 'complete' && document.querySelector('main') && (document.querySelector('main').innerText || '').length > 300 ? 'open' : '')`).catch(() => "");
      }
      if (s === "paywall" && !registered) {
        await sleep(1500);
        await tab.eval(`(() => { const b = [...document.querySelectorAll('[data-kig-paywall] button')].find((x) => x.textContent.includes('이용권 코드 등록')); b && b.click(); })()`);
        for (let i = 0; i < 20 && !(await tab.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
        const key = serverLicense.generateLicenseKey("1Y");
        await tab.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
        registered = true;
        s = "";
        for (let i = 0; i < 120 && s !== "open"; i++) { await sleep(500); s = await tab.eval(`!document.querySelector('[data-kig-paywall="license"]') && (document.querySelector('main')?.innerText || '').length > 300 ? 'open' : ''`).catch(() => ""); }
      }
      await sleep(2000);
      row.opened = s === "open" && !(await tab.eval(`!!document.querySelector('[data-kig-paywall]')`).catch(() => true));
      if (row.opened) {
        tab.events.requests = [];
        row.played = await tab.eval(`(() => { const b = [...document.querySelectorAll('main button[aria-label="재생"]')].find((x) => x.offsetParent) || [...document.querySelectorAll('main button')].find((x) => x.textContent.includes('전체 본문 듣기')); if (!b) return false; b.click(); return true; })()`).catch(() => false);
        await sleep(2000);
        row.audioRequests = tab.events.requests.filter((u) => u.includes("/audio/")).length;
        await tab.eval(`(() => { const b = [...document.querySelectorAll('main button[aria-label="일시정지"], main button[aria-label="정지"]')].find((x) => x.offsetParent) || [...document.querySelectorAll('main button')].find((x) => x.textContent.includes('전체 정지')); b && b.click(); })()`).catch(() => {});
        const labels = (await tab.eval(STEP_LABELS).catch(() => [])) || [];
        for (const label of labels) {
          const clicked = await tab.eval(`(() => { const b = [...document.querySelectorAll('main button')].find((x) => (x.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)}); if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; })()`).catch(() => false);
          await sleep(1200);
          row.steps.push({ label, clicked });
        }
      }
      row.violations = (await tab.eval(`window.__cspv || null`).catch(() => null)) || ["listener missing"];
      row.issues = issues.splice(0);
      row.exceptions = tab.events.exceptions.slice(0, 3);
      tab.resetEvents();
      walk[p] = row;
    }
    await tab.close();

    for (const [p, row] of Object.entries(walk)) {
      check(`${p}: opened with the test licence, play ${row.played ? `pressed (${row.audioRequests} clip requests)` : "button not found"}, ${row.steps.length} study step(s) clicked — ${row.violations.length} CSP violation(s), ${row.issues.length} CSP issue(s)`,
        row.opened && row.violations.length === 0 && row.issues.length === 0 && row.steps.every((x) => x.clicked),
        JSON.stringify({ violations: row.violations.slice(0, 3), issues: row.issues.slice(0, 3), steps: row.steps, exceptions: row.exceptions }));
    }
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    next.kill();
    await sleep(1500);
    for (const f of DATA_FILES) fs.rmSync(f, { force: true });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "csp-nonce-licensed-server.log"), log.replace(/[A-Za-z0-9+/=_-]{20,}/g, "[redacted]"));
    fs.writeFileSync(path.join(OUT, "csp-nonce-licensed.json"), JSON.stringify({ at: new Date().toISOString(), results, walk }, null, 2));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
