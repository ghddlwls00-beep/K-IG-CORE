#!/usr/bin/env node
/**
 * LOCAL proof for map risk common R0 — a licence code with a space inside it.
 * Never touches production or R2: runs the app's REAL modules (tsload) with throwaway
 * secrets, no R2 env (deviceStorage falls back to a local JSON file) and process.cwd()
 * switched to a temporary folder so nothing is written into the repository.
 *
 * Flow, all through the same functions the API routes call:
 *   /api/license/activate  = validateLicenseKey(key) → registerDeviceForKey(key, plan, deviceId) → issueLicenseToken(key, …)
 *   lesson/media gate      = verifyLicenseSessionToken(token)            (src/lib/licenseSession.ts)
 *   admin refund block     = revokeLicenseKey(key)
 * The key string passed on is what LicenseProvider.tsx:325 sends: rawKey.trim().toUpperCase()
 * — inner spaces are kept by the client, stripped only inside validateLicenseKey.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kig-key-ws-"));
process.chdir(tmp);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET"]) delete process.env[k];
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");
process.env.NODE_ENV = "development";

const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const lic = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const dev = loadTs(path.join(REPO, "src/lib/deviceStorage.ts"));
const ses = loadTs(path.join(REPO, "src/lib/licenseSession.ts"));

const clientSends = (typed) => typed.trim().toUpperCase(); // LicenseProvider.tsx:325

async function activate(typed, deviceId) {
  const key = clientSends(typed);
  const v = lic.validateLicenseKey(key);
  if (!v.valid) return { ok: false, step: "validate", error: v.error };
  const reg = await dev.registerDeviceForKey(key, v.plan, deviceId, "local test");
  if (!reg.success) return { ok: false, step: "register", error: reg.error, devices: reg.devices.length, max: reg.maxDevices };
  const token = lic.issueLicenseToken(key, v.plan, deviceId, reg.expiresAt ?? null);
  const session = await ses.verifyLicenseSessionToken(token);
  return { ok: true, devicesOnThisRecord: reg.devices.length, max: reg.maxDevices, expiresAt: reg.expiresAt ?? null, lessonGateOpens: !!session };
}

(async () => {
  const out = { tmp, steps: [] };
  const step = (name, r) => { out.steps.push({ name, ...r }); console.log(name.padEnd(62), JSON.stringify(r)); };
  const key = lic.generateLicenseKey("1Y");
  const [kig, plan, nonce, sum] = key.split("-");
  const spaced1 = `${kig}-${plan}-${nonce.slice(0, 8)} ${nonce.slice(8)}-${sum}`;
  const spaced2 = `${kig}-${plan}-${nonce}-${sum.slice(0, 4)} ${sum.slice(4)}`;
  step("1 canonical code, device A", await activate(key, "dev_A"));
  step("2 canonical code, device B", await activate(key, "dev_B"));
  step("3 canonical code, device C (limit 2 → must fail)", await activate(key, "dev_C"));
  step("4 same code with a space inside, device C", await activate(spaced1, "dev_C"));
  step("5 same code with a space elsewhere, device D", await activate(spaced2, "dev_D"));
  const records = dev.loadDeviceRecords ? await dev.loadDeviceRecords() : {};
  step("6 server records for this ONE purchased code", { recordCount: Object.keys(records).length, recordKeys: Object.keys(records).map((k) => k.replace(/[A-F0-9]{16}/g, (m) => m.slice(0, 3) + "…")) });
  await dev.revokeLicenseKey(key, "refund test");
  step("7 admin revokes the canonical code (refund); canonical, device E", await activate(key, "dev_E"));
  step("8 after refund: code with a space inside, device F", await activate(`${kig}-${plan}-${nonce.slice(0, 3)} ${nonce.slice(3)}-${sum}`, "dev_F"));
  const pass = out.steps[2].ok === false && out.steps[3].ok === false && out.steps[4].ok === false && out.steps[6].ok === false && out.steps[7].ok === false;
  out.verdict = pass ? "NOT REPRODUCED — spaced variants share the canonical record" : "REPRODUCED — spaced variants bypass the device limit and/or the refund block";
  console.log("\nVERDICT:", out.verdict);
  const dest = path.join(__dirname, "../out/key-whitespace-local.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  process.chdir(REPO);
  fs.rmSync(tmp, { recursive: true, force: true });
})();
