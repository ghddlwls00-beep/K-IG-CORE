#!/usr/bin/env node
/**
 * ISS-13 · SEC-03 · SEC-04 — licence routes, run as shipped (tsload) on the LOCAL file store
 * in a temp directory with random secrets. Nothing reaches production.
 *
 *   activate   sets the httpOnly device cookie next to the session cookie
 *   session    (new) hands back a still-valid session + device ID from cookies alone —
 *              what an iPhone has left after Safari cleared localStorage
 *   re-entering the code with the restored device ID keeps ONE slot (the ISS-13 failure
 *   was a second slot, then "최대 기기 수 초과")
 *   verify     SEC-03: rejects a device that is not on the record, including right after
 *              an admin reset (empty device list), like the lesson gate does
 *   deactivate SEC-04: needs a token signed for that code and device (cookie or body);
 *              an expired but genuine token still frees the slot
 *
 *   node verify-license-device.cjs     exit 0 = every case as expected
 *
 * BUG-018 (2026-09-24 · 토큰 v2): the session answer carries the masked code and an opaque licence id, not the code —
 * the 'valid from cookies alone' case checks that (it used to require the code back). The v2 token itself is proven by
 * docs/qa-2026-09-18/scripts/prove-license-token-v2.cjs.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "kig-iss13-"));
process.chdir(work);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"]) delete process.env[k];
process.env.NODE_ENV = "test";
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");

const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const realNow = Date.now;
let clock = Date.UTC(2026, 0, 1, 3, 0, 0);
Date.now = () => clock;
const DAY = 24 * 60 * 60 * 1000;

const storage = loadTs(path.join(REPO, "src/lib/deviceStorage.ts"));
const server = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const sessionLib = loadTs(path.join(REPO, "src/lib/licenseSession.ts"));
const activate = loadTs(path.join(REPO, "src/app/api/license/activate/route.ts"));
const verify = loadTs(path.join(REPO, "src/app/api/license/verify/route.ts"));
const deactivate = loadTs(path.join(REPO, "src/app/api/license/deactivate/route.ts"));
const session = loadTs(path.join(REPO, "src/app/api/license/session/route.ts"));

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const post = (handler, url, body, cookies = "") =>
  handler(new Request(`http://localhost${url}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookies ? { cookie: cookies } : {}) }, body: JSON.stringify(body) }));
const get = (handler, url, cookies = "") => handler(new Request(`http://localhost${url}`, { headers: cookies ? { cookie: cookies } : {} }));
const setCookies = (res) => {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  const map = {};
  for (const line of list) {
    const [pair, ...attrs] = line.split(";");
    const i = pair.indexOf("=");
    map[pair.slice(0, i).trim()] = { value: decodeURIComponent(pair.slice(i + 1)), attrs: attrs.map((a) => a.trim().toLowerCase()) };
  }
  return map;
};

(async () => {
  try {
    const key = server.generateLicenseKey("1Y");
    const phone = "dev_iphone01_abc";

    // --- first registration on the iPhone
    const a1 = await post(activate.POST, "/api/license/activate", { key, deviceId: phone, deviceName: "iPhone (Safari)" });
    const a1body = await a1.json();
    const c1 = setCookies(a1);
    check("activate: success, one slot", a1.status === 200 && a1body.registeredDevicesCount === 1);
    check("activate: httpOnly device cookie set", c1.kig_device && c1.kig_device.value === phone && c1.kig_device.attrs.includes("httponly") && c1.kig_device.attrs.some((a) => a.startsWith("max-age=") && Number(a.slice(8)) >= 399 * 86400), JSON.stringify(c1.kig_device));
    check("activate: session cookie set", c1.kig_license_session && c1.kig_license_session.value === a1body.licenseToken);
    const cookieJar = `kig_license_session=${encodeURIComponent(a1body.licenseToken)}; kig_device=${phone}`;

    // --- 8 days later Safari has wiped localStorage; only the server-set cookies are left
    clock += 8 * DAY;
    const s1 = await (await get(session.GET, "/api/license/session", cookieJar)).json();
    // BUG-018 (2026-09-24, 토큰 v2): the session hands back the MASKED code and an opaque id — never the code itself.
    // This check used to require s1.key === key, which is exactly what BUG-018 removed.
    const licenseModule = loadTs(path.join(REPO, "src/lib/license.ts"));
    check("session: valid from cookies alone (no code — masked code + opaque id)", s1.valid === true && s1.key === undefined && s1.maskedKey === licenseModule.maskLicenseKey(key) && s1.maskedKey !== key && typeof s1.licenseId === "string" && s1.licenseId.length > 0 && !String(s1.licenseId).includes(key.split("-")[2]) && s1.plan === "1Y" && s1.deviceId === phone && s1.token === a1body.licenseToken, `key ${s1.key === undefined ? "none" : "PRESENT"} · masked ${s1.maskedKey === licenseModule.maskLicenseKey(key)} · licenseId ${typeof s1.licenseId}`);
    check("session: expiry is the fixed period (first registration + 365 days)", s1.expiresAt === Date.UTC(2026, 0, 1, 3, 0, 0) + 365 * DAY, new Date(s1.expiresAt).toISOString());
    check("session: nothing without cookies", (await (await get(session.GET, "/api/license/session")).json()).valid === false);
    const onlyDevice = await (await get(session.GET, "/api/license/session", `kig_device=${phone}`)).json();
    check("session: device ID alone comes back when the session cookie is gone", onlyDevice.valid === false && onlyDevice.deviceId === phone);
    check("session: a malformed device cookie is ignored", (await (await get(session.GET, "/api/license/session", "kig_device=%3Cscript%3E")).json()).deviceId === undefined);

    // --- re-entering the code with the restored device ID keeps one slot
    for (let i = 0; i < 3; i++) await post(activate.POST, "/api/license/activate", { key, deviceId: phone, deviceName: "iPhone (Safari)" });
    const rec1 = await storage.getDeviceRecordForKey(key);
    check("re-entering the code 3× on the restored device keeps 1 slot", rec1.devices.length === 1);
    // what used to happen: a fresh random ID each time
    await post(activate.POST, "/api/license/activate", { key, deviceId: "dev_fresh1_x", deviceName: "iPhone (Safari)" });
    const a3 = await (await post(activate.POST, "/api/license/activate", { key, deviceId: "dev_fresh2_y", deviceName: "iPhone (Safari)" })).json();
    check("(the old failure, for reference) new IDs each time hit the limit", a3.success === false && /최대|초과|기기/.test(a3.error || ""), a3.error);
    await storage.unregisterDeviceFromKey(key, "dev_fresh1_x");

    // --- SEC-03: verify follows the lesson gate after an admin reset
    const v1 = await post(verify.POST, "/api/license/verify", { key, deviceId: phone, token: a1body.licenseToken });
    check("verify: registered device → valid", v1.status === 200 && (await v1.json()).valid === true);
    check("verify: also refreshes the device cookie", setCookies(await post(verify.POST, "/api/license/verify", { key, deviceId: phone, token: a1body.licenseToken })).kig_device?.value === phone);
    await storage.resetAllDevicesForKey(key);
    const v2 = await post(verify.POST, "/api/license/verify", { key, deviceId: phone, token: a1body.licenseToken });
    const v2body = await v2.json();
    check("SEC-03: after admin reset (0 devices) verify → 403, not valid", v2.status === 403 && v2body.valid === false, JSON.stringify(v2body));
    check("SEC-03: lesson gate agrees (session rejected)", (await sessionLib.verifyLicenseSessionToken(a1body.licenseToken)) === null);
    check("session API agrees after reset", (await (await get(session.GET, "/api/license/session", cookieJar)).json()).valid === false);
    const orphanKey = server.generateLicenseKey("1Y");
    const orphanToken = server.issueLicenseToken(orphanKey, "1Y", phone, null);
    const v3 = await post(verify.POST, "/api/license/verify", { key: orphanKey, deviceId: phone, token: orphanToken });
    check("SEC-03: a token whose code has no record → 403", v3.status === 403);

    // --- SEC-04: deactivate needs a token for that code and device
    const reg = await (await post(activate.POST, "/api/license/activate", { key, deviceId: phone, deviceName: "iPhone (Safari)" })).json();
    const other = "dev_ipad0001_zz";
    const regOther = await (await post(activate.POST, "/api/license/activate", { key, deviceId: other, deviceName: "iPad" })).json();
    check("setup: 2 devices registered", (await storage.getDeviceRecordForKey(key)).devices.length === 2 && reg.success && regOther.success);
    const d1 = await post(deactivate.POST, "/api/license/deactivate", { key, deviceId: other });
    check("SEC-04: code + device ID alone → 403, slot kept", d1.status === 403 && (await storage.getDeviceRecordForKey(key)).devices.length === 2);
    const d2 = await post(deactivate.POST, "/api/license/deactivate", { key, deviceId: other }, `kig_license_session=${encodeURIComponent(reg.licenseToken)}`);
    check("SEC-04: another device's session cannot free this device", d2.status === 403 && (await storage.getDeviceRecordForKey(key)).devices.length === 2);
    const forged = reg.licenseToken.split(".")[0] + ".AAAA";
    check("SEC-04: forged token → 403", (await post(deactivate.POST, "/api/license/deactivate", { key, deviceId: phone, token: forged })).status === 403);
    const d3 = await post(deactivate.POST, "/api/license/deactivate", { key, deviceId: other, token: regOther.licenseToken });
    check("SEC-04: own token in the body frees the slot", d3.status === 200 && (await storage.getDeviceRecordForKey(key)).devices.length === 1);
    const d4 = await post(deactivate.POST, "/api/license/deactivate", { key: key.toLowerCase(), deviceId: phone }, `kig_license_session=${encodeURIComponent(reg.licenseToken)}`);
    check("SEC-04: own session cookie frees the slot (code case-insensitive)", d4.status === 200 && (await storage.getDeviceRecordForKey(key)).devices.length === 0);

    // expired but genuine token still frees the slot
    const shortKey = server.generateLicenseKey("1M");
    const s = await (await post(activate.POST, "/api/license/activate", { key: shortKey, deviceId: phone, deviceName: "iPhone" })).json();
    clock += 40 * DAY;
    const d5 = await post(deactivate.POST, "/api/license/deactivate", { key: shortKey, deviceId: phone, token: s.licenseToken });
    check("SEC-04: an expired 1M token can still free its own slot", d5.status === 200 && (await storage.getDeviceRecordForKey(shortKey)).devices.length === 0);
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    Date.now = realNow;
    process.chdir(os.tmpdir());
    fs.rmSync(work, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
