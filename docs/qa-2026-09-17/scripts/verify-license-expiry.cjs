#!/usr/bin/env node
/**
 * SEC-01 — a fixed-term licence runs from its FIRST registration and never restarts.
 *
 * Loads the shipped modules (src/lib/deviceStorage.ts, serverLicense.ts,
 * licenseSession.ts) through tsload and runs them against the LOCAL file store
 * (no R2 variables set, NODE_ENV=test) inside a throw-away working directory, with
 * throw-away secrets generated here. Date.now is replaced so months pass instantly.
 * Nothing touches production.
 *
 *   node verify-license-expiry.cjs     exit 0 = every case as expected
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "kig-sec01-"));
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
const session = loadTs(path.join(REPO, "src/lib/licenseSession.ts"));

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });

(async () => {
  const oneMonth = server.generateLicenseKey("1M");
  const plan = server.validateLicenseKey(oneMonth).plan;
  check("generated 1M key validates", plan === "1M");

  // Day 0 — first registration on device A
  const a0 = await storage.registerDeviceForKey(oneMonth, plan, "dev-A", "A");
  const start = clock;
  check("day 0: device A registers", a0.success && a0.firstActivatedAt === start && a0.expiresAt === start + 30 * DAY, JSON.stringify(a0));
  const tokenA = server.issueLicenseToken(oneMonth, plan, "dev-A", a0.expiresAt);

  // Day 20 — device B registers: same end date
  clock = start + 20 * DAY;
  const b20 = await storage.registerDeviceForKey(oneMonth, plan, "dev-B", "B");
  check("day 20: device B gets the SAME expiry as A", b20.success && b20.expiresAt === start + 30 * DAY, `B expires ${new Date(b20.expiresAt).toISOString()}`);

  // Day 25 — re-enter the code on device A: no extension
  clock = start + 25 * DAY;
  const a25 = await storage.registerDeviceForKey(oneMonth, plan, "dev-A", "A");
  check("day 25: re-entry on A keeps the original expiry", a25.success && a25.expiresAt === start + 30 * DAY);
  check("day 25: session with A's token is valid", (await session.verifyLicenseSessionToken(tokenA)) !== null);

  // Day 31 — re-entry refused, sessions refused
  clock = start + 31 * DAY;
  const a31 = await storage.registerDeviceForKey(oneMonth, plan, "dev-A", "A");
  check("day 31: re-entry on A is refused as expired", !a31.success && a31.expired === true, a31.error);
  const c31 = await storage.registerDeviceForKey(oneMonth, plan, "dev-C", "C");
  check("day 31: a new device C is refused as expired", !c31.success && c31.expired === true);
  check("day 31: session with A's token is refused", (await session.verifyLicenseSessionToken(tokenA)) === null);

  // A token issued by the OLD rule (re-activation on day 25 -> day 55) is capped
  const legacyToken = server.issueLicenseToken(oneMonth, plan, "dev-A", start + 55 * DAY);
  clock = start + 40 * DAY;
  check("day 40: legacy token with a later date is refused (record wins)", (await session.verifyLicenseSessionToken(legacyToken)) === null);
  check("effectiveLicenseExpiry caps a later token date", storage.effectiveLicenseExpiry(await storage.getDeviceRecordForKey(oneMonth), plan, start + 55 * DAY) === start + 30 * DAY);

  // Admin reset keeps the start date
  const oneYear = server.generateLicenseKey("1Y");
  clock = start;
  await storage.registerDeviceForKey(oneYear, "1Y", "dev-Y", "Y");
  clock = start + 100 * DAY;
  await storage.resetAllDevicesForKey(oneYear);
  const rec = await storage.getDeviceRecordForKey(oneYear);
  check("admin reset keeps firstActivatedAt", rec.devices.length === 0 && rec.firstActivatedAt === start);
  const y2 = await storage.registerDeviceForKey(oneYear, "1Y", "dev-Z", "Z");
  check("after reset, new device keeps the original 1Y expiry", y2.success && y2.expiresAt === start + 365 * DAY);

  // Legacy record without firstActivatedAt: earliest registeredAt is the start
  const legacyKey = server.generateLicenseKey("1Y");
  const file = path.join(work, "data", "license-devices.json");
  const all = JSON.parse(fs.readFileSync(file, "utf8"));
  all[legacyKey] = { key: legacyKey, plan: "1Y", maxDevices: 2, devices: [
    { deviceId: "old-1", deviceName: "old", registeredAt: start - 200 * DAY, lastSeenAt: start - 10 * DAY },
    { deviceId: "old-2", deviceName: "old", registeredAt: start - 50 * DAY, lastSeenAt: start - 10 * DAY },
  ] };
  fs.writeFileSync(file, JSON.stringify(all));
  clock = start + 170 * DAY; // 370 days after the earliest registration
  const legacy = await storage.registerDeviceForKey(legacyKey, "1Y", "old-2", "old");
  check("legacy record: period counted from the earliest device registration", !legacy.success && legacy.expired === true && legacy.firstActivatedAt === start - 200 * DAY);

  // Lifetime plan never expires
  const life = server.generateLicenseKey("LIFE");
  clock = start;
  await storage.registerDeviceForKey(life, "LIFE", "dev-L", "L");
  clock = start + 5000 * DAY;
  const lifeAgain = await storage.registerDeviceForKey(life, "LIFE", "dev-L", "L");
  const lifeToken = server.issueLicenseToken(life, "LIFE", "dev-L", null);
  check("LIFE: still valid after 5,000 days", lifeAgain.success && lifeAgain.expiresAt === null && (await session.verifyLicenseSessionToken(lifeToken)) !== null);

  Date.now = realNow;
  let pass = 0;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `\n        ${r.detail}`}`);
    if (r.ok) pass++;
  }
  console.log(`\n${pass}/${results.length} pass`);
  process.chdir(os.tmpdir());
  fs.rmSync(work, { recursive: true, force: true });
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
