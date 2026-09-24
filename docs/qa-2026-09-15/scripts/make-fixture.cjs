// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Creates a local-only QA entitlement fixture for the dev harness.
// Uses a throwaway signing secret that exists only in this QA run.
//
// BUG-018 (2026-09-24 · 토큰 v2): the codes and tokens are made by the APP's own functions
// (serverLicense.generateLicenseKey / issueLicenseToken — the code is sealed inside the token) instead of a
// copied v1 format, so the fixture always matches what the server issues. Each token entry also carries what the
// browser keeps since BUG-018 (maskedKey · licenseId — no code in localStorage); ui-harness.cjs and play-verify.cjs
// seed that shape. The dev server must run with LICENSE_SECRET / LICENSE_SALT from qa-secrets.json and the R2
// variables blank (local file store). qa-secrets.json holds throwaway values — never commit it (.gitignore here).
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const secret = crypto.randomBytes(32).toString("hex");
const salt = crypto.randomBytes(32).toString("hex");
process.env.LICENSE_SECRET = secret;
process.env.LICENSE_SALT = salt;
const { loadTs } = require("./tsload.cjs");
const server = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const license = loadTs(path.join(REPO, "src/lib/license.ts"));
const now = Date.now();
const plans = [
  { plan: "LIFE", deviceId: "dev_qa_life" },
  { plan: "STU1Y", deviceId: "dev_qa_stu" },
  { plan: "1Y", deviceId: "dev_qa_vip" },
];
const records = {};
const tokens = {};
for (const p of plans) {
  const key = server.generateLicenseKey(p.plan);
  if (!server.validateLicenseKey(key).valid) throw new Error(`generated ${p.plan} code does not validate`);
  const expiresAt = license.calculateExpiry(p.plan, now);
  records[key] = { key, plan: p.plan, maxDevices: 2, firstActivatedAt: now, createdAt: now, devices: [{ deviceId: p.deviceId, deviceName: "QA harness", registeredAt: now, lastSeenAt: now }] };
  tokens[p.plan] = {
    key, // only for this local run's own records — the harness never puts it in the browser
    plan: p.plan,
    deviceId: p.deviceId,
    expiresAt,
    token: server.issueLicenseToken(key, p.plan, p.deviceId, expiresAt),
    maskedKey: license.maskLicenseKey(key),
    licenseId: server.licenseIdFor(key),
  };
}
const dataDir = path.join(REPO, "data");
fs.mkdirSync(dataDir, { recursive: true });
for (const f of ["license-devices.json", "student-progress.json"]) {
  if (fs.existsSync(path.join(dataDir, f))) throw new Error(`${f} already exists — refusing to overwrite`);
}
fs.writeFileSync(path.join(dataDir, "license-devices.json"), JSON.stringify(records, null, 2));
fs.writeFileSync(path.join(__dirname, "qa-secrets.json"), JSON.stringify({ secret, salt, tokens }, null, 2));
console.log("fixture ok");
