// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Creates a local-only QA entitlement fixture for the dev harness.
// Uses a throwaway signing secret that exists only in this QA run.
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const secret = crypto.randomBytes(32).toString("hex");
const salt = crypto.randomBytes(32).toString("hex");
const now = Date.now();
const keys = [
  { key: "KIG-LIFE-QAAUDIT000000001", plan: "LIFE", deviceId: "dev_qa_life" },
  { key: "KIG-STU1Y-QAAUDIT00000002", plan: "STU1Y", deviceId: "dev_qa_stu" },
  { key: "KIG-1Y-QAAUDIT00000000003", plan: "1Y", deviceId: "dev_qa_vip" },
];
const records = {};
const tokens = {};
for (const k of keys) {
  const expiresAt = k.plan === "LIFE" ? null : now + 365 * 864e5;
  records[k.key] = { key: k.key, plan: k.plan, maxDevices: 2, devices: [{ deviceId: k.deviceId, deviceName: "QA harness", registeredAt: now, lastSeenAt: now }] };
  const payloadB64 = Buffer.from(JSON.stringify({ key: k.key, plan: k.plan, deviceId: k.deviceId, expiresAt, iat: now })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  tokens[k.plan] = { ...k, expiresAt, token: `${payloadB64}.${sig}` };
}
const dataDir = path.join(REPO, "data");
fs.mkdirSync(dataDir, { recursive: true });
for (const f of ["license-devices.json", "student-progress.json"]) {
  if (fs.existsSync(path.join(dataDir, f))) throw new Error(`${f} already exists — refusing to overwrite`);
}
fs.writeFileSync(path.join(dataDir, "license-devices.json"), JSON.stringify(records, null, 2));
fs.writeFileSync(path.join(__dirname, "qa-secrets.json"), JSON.stringify({ secret, salt, tokens }, null, 2));
console.log("fixture ok");
