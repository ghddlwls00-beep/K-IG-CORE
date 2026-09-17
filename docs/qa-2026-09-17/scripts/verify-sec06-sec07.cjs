#!/usr/bin/env node
/**
 * SEC-06 / SEC-07 — the shipped route handlers, transpiled and run with stand-ins for their
 * imports (no server, no storage, no licence). Date.now is moved forward by hand.
 *
 * SEC-06 src/app/api/media-health/route.ts
 *  - anonymous caller: the body is exactly { ok } — no credentialsConfigured / probe / s3Error
 *  - admin session: the full detail
 *  - five calls within a minute fetch the probe object once; after 61 s it is fetched again
 * SEC-07 src/app/api/progress/student/route.ts
 *  - the 121st save from one device within a minute is 429, the next minute it is allowed
 *  - 600 devices save, a minute passes, one more save: the finished windows are gone
 *    (read through a test-only export appended to the transpiled code, not in the app)
 *
 *   node verify-sec06-sec07.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));

let now = Date.parse("2026-09-17T12:00:00Z");
const realNow = Date.now;
Date.now = () => now;

class FakeResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; }
  async json() { return this.body; }
}
const NextResponse = { json: (body, init) => new FakeResponse(body, init) };
globalThis.Response = { json: (body, init) => new FakeResponse(body, init) };

function load(rel, stubs, extra = "") {
  const file = path.join(REPO, rel);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText + extra;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)((spec) => { if (!(spec in stubs)) throw new Error(`unexpected import ${spec}`); return stubs[spec]; }, mod, mod.exports);
  return mod.exports;
}

const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });

(async () => {
  // ── SEC-06 ──
  let fetches = 0;
  const health = load("src/app/api/media-health/route.ts", {
    "@/lib/adminAuth": { verifyAdminSession: (req) => req.admin === true },
    "@/lib/mediaOrigin": { HAS_S3_CREDENTIALS: true, fetchMediaObject: async () => { fetches++; return { status: 206 }; }, getLastS3Error: () => null },
  });
  const anon = await (await health.GET({ admin: false })).json();
  check("SEC-06 anonymous: body is exactly { ok }", JSON.stringify(Object.keys(anon)) === '["ok"]' && anon.ok === true, JSON.stringify(anon));
  const admin = await (await health.GET({ admin: true })).json();
  check("SEC-06 admin session: full detail", ["credentialsConfigured", "probe", "probeStatus", "s3Error", "readyForPrivateBucket"].every((k) => k in admin), JSON.stringify(admin));
  for (let i = 0; i < 3; i++) await health.GET({ admin: false });
  check("SEC-06 five calls within a minute fetch the probe object once", fetches === 1, String(fetches));
  now += 61_000;
  await health.GET({ admin: false });
  check("SEC-06 after 61 s the probe runs again", fetches === 2, String(fetches));

  // ── SEC-07 ──
  const progress = load("src/app/api/progress/student/route.ts", {
    "next/server": { NextResponse },
    "@/lib/licenseSession": { verifyLicenseSession: async (req) => ({ payload: { key: "K", deviceId: req.deviceId } }) },
    "@/lib/studentProgress": {
      getStudentChapters: () => [],
      getStudentProgress: async () => ({}),
      mergeLegacyStudentProgress: async () => ({}),
      updateStudentProgress: async () => ({ version: 1, lessons: {}, unlockedThrough: 1, lastLessonId: null, updatedAt: 0 }),
    },
  }, "\nmodule.exports.__windows = requestWindows;");
  const post = (deviceId) => progress.POST({ deviceId, json: async () => ({ lessonId: "s1-1", completed: true }) });
  const statuses = [];
  for (let i = 0; i < 121; i++) statuses.push((await post("one-device")).status);
  check("SEC-07 limit unchanged: saves 1-120 OK, 121st is 429", statuses.slice(0, 120).every((s) => s === 200) && statuses[120] === 429, statuses.slice(118).join(","));
  now += 61_000;
  check("SEC-07 the next minute the same device may save again", (await post("one-device")).status === 200);
  for (let i = 0; i < 600; i++) await post(`device-${i}`);
  const before = progress.__windows.size;
  now += 61_000;
  await post("late-device");
  const after = progress.__windows.size;
  check(`SEC-07 finished windows are dropped (${before} entries → ${after} after a minute)`, before >= 600 && after === 1, `${before} → ${after}`);

  Date.now = realNow;
  let fail = 0;
  for (const x of results) { if (!x.ok) fail++; console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.what}${x.ok || !x.detail ? "" : "\n      " + x.detail}`); }
  console.log(`\n${results.length - fail}/${results.length} checks pass`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
