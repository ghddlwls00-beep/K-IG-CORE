#!/usr/bin/env node
/**
 * ADM-07 — loadDeviceRecords() (the admin "기기 현황 새로고침") against a FAKE in-memory R2.
 * No network, no real bucket, no real secret: the shipped src/lib/deviceStorage.ts is
 * transpiled and handed a stand-in for @aws-sdk/client-s3 that counts requests and how
 * many downloads run at once. Records are written in the module's own envelope
 * (AES-256-GCM, key = sha256(LICENSE_STORAGE_SECRET)), and changed through the module's own
 * exported setMaxDevicesForKey, so a wrong format would fail to decrypt.
 *
 *  1. 1,000 records, first refresh: all 1,000 returned, ≤ 16 downloads at once
 *  2. second refresh, nothing changed: 0 downloads
 *  3. three records changed through the module: the next refresh downloads exactly 3 and
 *     returns the new values
 *  4. one record deleted: 999 returned
 *  5. callers do not share objects: changing a returned record does not change the next result
 *
 *   node verify-device-records-cache.cjs     exit 0 = every check as expected
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const ts = require(path.join(REPO, "node_modules/typescript"));

const SECRET = crypto.randomBytes(32).toString("hex");
Object.assign(process.env, { R2_ACCOUNT_ID: "fake", R2_ACCESS_KEY_ID: "fake", R2_SECRET_ACCESS_KEY: "fake", R2_LICENSE_BUCKET: "fake-bucket", LICENSE_STORAGE_SECRET: SECRET, NODE_ENV: "test" });
delete process.env.VERCEL;

// ── fake S3 ────────────────────────────────────────────────────────────────────────────────
const bucket = new Map(); // key -> { body, etag }
const stats = { list: 0, get: 0, put: 0, inFlight: 0, maxInFlight: 0 };
class ListObjectsV2Command { constructor(input) { this.input = input; } }
class GetObjectCommand { constructor(input) { this.input = input; } }
class PutObjectCommand { constructor(input) { this.input = input; } }
const etagOf = (body) => `"${crypto.createHash("md5").update(body).digest("hex")}"`;
class S3Client {
  async send(cmd) {
    if (cmd instanceof ListObjectsV2Command) {
      stats.list++;
      const keys = [...bucket.keys()].filter((k) => k.startsWith(cmd.input.Prefix)).sort();
      const start = cmd.input.ContinuationToken ? Number(cmd.input.ContinuationToken) : 0;
      const page = keys.slice(start, start + 1000); // R2/S3 pages hold up to 1,000 keys
      const more = start + 1000 < keys.length;
      return { Contents: page.map((Key) => ({ Key, ETag: bucket.get(Key).etag })), IsTruncated: more, NextContinuationToken: more ? String(start + 1000) : undefined };
    }
    if (cmd instanceof GetObjectCommand) {
      stats.get++; stats.inFlight++; stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      await new Promise((r) => setTimeout(r, 2));
      stats.inFlight--;
      const o = bucket.get(cmd.input.Key);
      if (!o) { const e = new Error("NoSuchKey"); e.name = "NoSuchKey"; throw e; }
      return { ETag: o.etag, Body: { transformToString: async () => o.body } };
    }
    if (cmd instanceof PutObjectCommand) {
      stats.put++;
      bucket.set(cmd.input.Key, { body: cmd.input.Body, etag: etagOf(cmd.input.Body) });
      return { ETag: etagOf(cmd.input.Body) };
    }
    throw new Error("unexpected command");
  }
}
const fakeS3 = { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand };

// ── load the shipped module with the fake ──────────────────────────────────────────────────
const file = path.join(REPO, "src/lib/deviceStorage.ts");
const js = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const mod = { exports: {} };
const req = (spec) => {
  if (spec === "server-only") return {};
  if (spec === "@aws-sdk/client-s3") return fakeS3;
  if (spec === "./serverLicense") return loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
  return Module.createRequire(file)(spec);
};
new Function("require", "module", "exports", js)(req, mod, mod.exports);
const storage = mod.exports;

// records in the module's envelope
const encKey = crypto.createHash("sha256").update(SECRET).digest();
const put = (record) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(record), "utf8"), c.final()]);
  const body = JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ciphertext: ct.toString("base64") });
  const key = `private/license-records/${crypto.createHash("sha256").update(record.key.trim().toUpperCase()).digest("hex")}.json`;
  bucket.set(key, { body, etag: etagOf(body) });
  return key;
};
const keys = [];
for (let i = 0; i < 1000; i++) {
  const k = `TEST-${String(i).padStart(4, "0")}-ABCD`;
  keys.push(k);
  put({ key: k, plan: "1Y", maxDevices: 2, devices: [] });
}

const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });
const reset = () => Object.assign(stats, { list: 0, get: 0, put: 0, maxInFlight: 0 });

(async () => {
  reset();
  let r = await storage.loadDeviceRecords();
  check("1. first refresh returns all 1,000 records", Object.keys(r).length === 1000, String(Object.keys(r).length));
  check(`1. downloads 1,000, at most 16 at once (was all at once)`, stats.get === 1000 && stats.maxInFlight <= 16, JSON.stringify(stats));

  reset();
  r = await storage.loadDeviceRecords();
  check("2. second refresh with nothing changed downloads 0 records", stats.get === 0 && Object.keys(r).length === 1000, JSON.stringify(stats));

  for (const k of keys.slice(0, 3)) await storage.setMaxDevicesForKey(k, 1);
  reset();
  r = await storage.loadDeviceRecords();
  const changed = keys.slice(0, 3).map((k) => r[k.toUpperCase()]?.maxDevices);
  check("3. after 3 records change through the module, the refresh downloads exactly 3 and shows the new limit", stats.get === 3 && changed.every((m) => m === 1), `${JSON.stringify(stats)} ${JSON.stringify(changed)}`);

  bucket.delete([...bucket.keys()].find((k) => k.startsWith("private/license-records/")));
  reset();
  r = await storage.loadDeviceRecords();
  check("4. a deleted record disappears from the list", Object.keys(r).length === 999 && stats.get === 0, `${Object.keys(r).length} ${JSON.stringify(stats)}`);

  const any = Object.keys(r)[10];
  r[any].maxDevices = 99;
  r[any].devices.push({ deviceId: "x", deviceName: "x", registeredAt: 1, lastSeenAt: 1 });
  const again = await storage.loadDeviceRecords();
  check("5. a caller changing a returned record does not change the next refresh", again[any].maxDevices !== 99 && again[any].devices.length === 0, JSON.stringify(again[any]));

  let fail = 0;
  for (const x of results) { if (!x.ok) fail++; console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.what}${x.ok || !x.detail ? "" : "\n      " + x.detail}`); }
  console.log(`\n${results.length - fail}/${results.length} checks pass`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
