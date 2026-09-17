#!/usr/bin/env node
/**
 * ISS-14 / ADM-02…06 — the admin licence page, rendered and clicked in a browser.
 *
 * ISOLATION (nothing here can reach production data or produce a real code):
 *   - starts `next dev` on port 3211 with the durable-storage settings overridden by
 *     blanks, so deviceStorage uses the local file data/license-devices.json (git-ignored;
 *     the script refuses to run if that file already exists and deletes it at the end)
 *   - LICENSE_SALT / LICENSE_SECRET / ADMIN_SESSION_SECRET are random for this run, so the
 *     codes it issues are not valid on the real site; ADMIN_PIN is blank (login disabled)
 *   - the admin session cookie is signed with that random secret and set through CDP —
 *     no PIN is typed anywhere
 *
 * Checks: every server record listed (count, keys, memo, "발급일 기록 없음" for a record
 * made the old way), device names, search, the browser-only history banner and import,
 * device-limit dropdown asks before saving (cancel = no request, value unchanged),
 * no test-register button, no hard-coded 81, no console errors. Screenshot to
 * out/admin-ui.png.
 *
 *   node verify-admin-ui.cjs     exit 0 = every case as expected
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3211;
const BASE = `http://localhost:${PORT}`;
const DATA_FILES = ["data/license-devices.json", "data/student-progress.json"].map((f) => path.join(REPO, f));
for (const f of DATA_FILES) {
  if (fs.existsSync(f)) {
    console.error(`STOP: ${f} already exists — not overwriting a local store this script did not create.`);
    process.exit(2);
  }
}

const secrets = {
  LICENSE_SALT: crypto.randomBytes(24).toString("hex"),
  LICENSE_SECRET: crypto.randomBytes(24).toString("hex"),
  ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
};
const blanks = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"];
const childEnv = { ...process.env, ...secrets, NODE_ENV: "development", PORT: String(PORT) };
for (const k of blanks) childEnv[k] = " ";
delete childEnv.VERCEL;

// Same env in this process so the shipped modules sign/generate with the run's secrets.
Object.assign(process.env, secrets);
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const adminAuth = loadTs(path.join(REPO, "src/lib/adminAuth.ts"));
const serverLicense = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const token = adminAuth.createAdminSessionToken();
const cookie = `${adminAuth.ADMIN_COOKIE_NAME}=${token}`;

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const api = async (url, body) => {
  const res = await fetch(BASE + url, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

(async () => {
  const next = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  next.stdout.on("data", (d) => (serverLog += d));
  next.stderr.on("data", (d) => (serverLog += d));
  let browser;
  try {
    for (let i = 0; i < 120; i++) {
      try { if ((await fetch(`${BASE}/api/admin/check`)).ok) break; } catch {}
      await sleep(1000);
    }
    const guard = await api("/api/license/status");
    check("isolated server: admin API answers with the run's session", guard.status === 200 && guard.body.success, `status ${guard.status}`);
    check("isolated server: store starts empty (not the real bucket)", guard.body.records && Object.keys(guard.body.records).length === 0, `records ${guard.body.records && Object.keys(guard.body.records).length}`);
    if (!(guard.status === 200 && guard.body.records && Object.keys(guard.body.records).length === 0)) throw new Error("not isolated — stopping before any write");

    // --- seed: 2 codes with a memo, 1 without, 1 made the old way (no issue time / memo)
    const g1 = await api("/api/admin/generate", { plan: "1M", quantity: 2, maxDevices: 3, memo: "스마트스토어 홍길동님 주문" });
    const g2 = await api("/api/admin/generate", { plan: "STU1Y", quantity: 1, maxDevices: 2 });
    const [k1, k2] = g1.body.keys;
    const k3 = g2.body.keys[0];
    const legacyKey = serverLicense.generateLicenseKey("1Y");
    await api("/api/license/update-limit", { key: legacyKey, maxDevices: 2 });
    const act = await fetch(`${BASE}/api/license/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k1, deviceId: "ui-test-device-1", deviceName: "민수의 아이폰" }) });
    check("seed: 4 records, one device registered", g1.body.success && g2.body.success && act.ok, `activate ${act.status}`);

    browser = await launch({ port: 9376 });
    const tab = await Tab.open(browser.port);
    await tab.send("Network.setCookie", { name: adminAuth.ADMIN_COOKIE_NAME, value: token, domain: "localhost", path: "/", httpOnly: true });
    await tab.viewport("desktop");
    const text = () => tab.eval("document.body.innerText");
    const open = async () => {
      await tab.send("Page.navigate", { url: `${BASE}/admin/license` });
      for (let i = 0; i < 180; i++) {
        const t = await text().catch(() => "");
        if (/전체 \d+건/.test(t)) return t;
        await sleep(500);
      }
      return text();
    };

    let t = await open();
    check("list title is the server list", t.includes("발급된 전체 이용권 및 기기 등록 현황"));
    check("count: 전체 4건 · 차단 0건", t.includes("전체 4건 · 차단 0건"), (t.match(/전체 \d+건[^\n]*/) || [""])[0]);
    check("every code is listed", [k1, k2, k3, legacyKey].every((k) => t.includes(k)));
    check("memo shown", (t.match(/스마트스토어 홍길동님 주문/g) || []).length === 2);
    check("old-style record says 발급일 기록 없음", t.includes("발급일 기록 없음"));
    check("registered device name shown", t.includes("민수의 아이폰"));
    check("ADM-02: no test-register button", !t.includes("내 기기에 등록 테스트"));
    check("ADM-05: no 81강", !t.includes("81강"));
    check("no browser-only banner when this browser has no old history", !t.includes("서버로 옮기기"));

    // --- search
    const setInput = (selector, value) => tab.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const set = Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
    await setInput('input[type="search"]', "민수");
    await sleep(400);
    t = await text();
    check("search by device name → 1 result", t.includes("검색 결과 1건") && t.includes(k1) && !t.includes(k3));
    await setInput('input[type="search"]', k2.replace(/-/g, "").slice(2, 10).toLowerCase());
    await sleep(400);
    t = await text();
    check("search by code without hyphens", t.includes(k2) && t.includes("검색 결과"));
    await setInput('input[type="search"]', "없는검색어zzz");
    await sleep(400);
    check("search with no match says so", (await text()).includes("와 일치하는 이용권이 없습니다"));
    await setInput('input[type="search"]', "");
    await sleep(300);

    // --- device limit dropdown asks first (row of k1: limit 3)
    const rowSelect = `(() => { const rows = [...document.querySelectorAll('div')].filter((d) => d.textContent.includes(${JSON.stringify(k1)}) && d.querySelector('select[title]')); const row = rows[rows.length - 1]; return row ? row.querySelector('select[title]') : null; })()`;
    await tab.eval("window.__confirms = []; window.confirm = (m) => { window.__confirms.push(m); return false; }; window.alert = () => {};");
    tab.resetEvents();
    await tab.eval(`(() => { const el = ${rowSelect}; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(el, '1'); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(800);
    const asked = await tab.eval("window.__confirms");
    const valueAfterCancel = await tab.eval(`${rowSelect}.value`);
    check("ADM-03: changing the limit asks first", asked.length === 1 && /3대 → 1대/.test(asked[0]), asked[0]);
    check("ADM-03: cancel sends nothing and keeps 3", !tab.events.requests.some((u) => u.includes("update-limit")) && valueAfterCancel === "3", `value ${valueAfterCancel}`);
    await tab.eval("window.confirm = (m) => { window.__confirms.push(m); return true; };");
    await tab.eval(`(() => { const el = ${rowSelect}; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(el, '2'); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(2500);
    const s2 = await api("/api/license/status");
    check("ADM-03: confirm saves the new limit", s2.body.records[k1].maxDevices === 2);

    // --- browser-only history from the old page → banner → import
    await tab.eval(`localStorage.setItem('kig:admin:history', JSON.stringify([{ key: ${JSON.stringify(legacyKey)}, plan: '1Y', createdAt: '2026. 9. 12. 오후 3:04:05', memo: '옛 브라우저 메모' }]))`);
    t = await open();
    check("old history: banner counts 1", t.includes("1건") && t.includes("서버로 옮기기"));
    check("old history: memo shown as browser-only", t.includes("옛 브라우저 메모 (이 브라우저에만 있음)"));
    await tab.eval("window.confirm = () => true; window.__alerts = []; window.alert = (m) => window.__alerts.push(m);");
    await tab.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('서버로 옮기기')).click()`);
    await sleep(2500);
    const s3 = await api("/api/license/status");
    const lr = s3.body.records[legacyKey];
    check("import: memo and 2026-09-12 15:04:05 KST saved on the server", lr.memo === "옛 브라우저 메모" && lr.createdAt === Date.UTC(2026, 8, 12, 6, 4, 5), JSON.stringify({ memo: lr.memo, createdAt: lr.createdAt }));
    check("import: this browser's copy removed", (await tab.eval("localStorage.getItem('kig:admin:history')")) === null);
    t = await open();
    check("after import: no banner, memo is a normal server memo", !t.includes("서버로 옮기기") && t.includes("옛 브라우저 메모") && !t.includes("(이 브라우저에만 있음)"));

    // --- a new browser (fresh profile, no localStorage) sees the same list
    const tab2 = await Tab.open(browser.port);
    await tab2.send("Storage.clearDataForOrigin", { origin: BASE, storageTypes: "local_storage" }).catch(() => {});
    await tab2.send("Page.navigate", { url: `${BASE}/admin/license` });
    let t2 = "";
    for (let i = 0; i < 120; i++) { t2 = await tab2.eval("document.body.innerText").catch(() => ""); if (/전체 \d+건/.test(t2)) break; await sleep(500); }
    check("ISS-14: a browser with no history still lists all 4 codes", t2.includes("전체 4건") && [k1, k2, k3, legacyKey].every((k) => t2.includes(k)));
    await tab2.close();

    const shot = await tab.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    fs.writeFileSync(path.join(__dirname, "../out/admin-ui.png"), Buffer.from(shot.data, "base64"));
    // Dev-server-only noise: React's development build wants eval() for debug call
    // stacks and the site's CSP (correctly) forbids it; production builds never ask.
    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/Download the React DevTools|HMR|Fast Refresh|eval\(\) is not supported in this environment/.test(e));
    check("no console errors or exceptions", errs.length === 0, errs.slice(0, 3).join(" | "));
    await tab.close();
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    next.kill();
    await sleep(1500);
    for (const f of DATA_FILES) fs.rmSync(f, { force: true });
    fs.writeFileSync(path.join(__dirname, "../out/admin-ui-server.log"), serverLog.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
