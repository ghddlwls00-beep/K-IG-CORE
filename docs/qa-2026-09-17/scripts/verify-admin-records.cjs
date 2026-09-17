#!/usr/bin/env node
/**
 * ISS-14 / ADM-02…06 — the admin licence list comes from the server records.
 *
 * Runs the shipped modules (tsload) against the LOCAL file store in a temp directory,
 * with random secrets — nothing touches the production R2 bucket or the owner's PIN:
 *   src/app/api/admin/generate/route.ts      issue codes (memo + issue time on the record)
 *   src/app/api/license/status/route.ts      the list the admin page reads
 *   src/app/api/admin/record-meta/route.ts   edit a memo / carry old browser history over
 *   src/lib/deviceStorage.ts                 registration still works on an issued record
 *   src/lib/adminLicenseList.ts              list order, search, legacy import count, old date text
 *
 *   node verify-admin-records.cjs     exit 0 = every case as expected
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "kig-iss14-"));
process.chdir(work);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"]) delete process.env[k];
process.env.NODE_ENV = "test";
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");
process.env.ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString("hex");

const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const adminAuth = loadTs(path.join(REPO, "src/lib/adminAuth.ts"));
const storage = loadTs(path.join(REPO, "src/lib/deviceStorage.ts"));
const serverLicense = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const list = loadTs(path.join(REPO, "src/lib/adminLicenseList.ts"));
const generate = loadTs(path.join(REPO, "src/app/api/admin/generate/route.ts"));
const status = loadTs(path.join(REPO, "src/app/api/license/status/route.ts"));
const meta = loadTs(path.join(REPO, "src/app/api/admin/record-meta/route.ts"));

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const token = adminAuth.createAdminSessionToken();
const req = (url, body, withSession = true) =>
  new Request(`http://localhost${url}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(withSession ? { cookie: `${adminAuth.ADMIN_COOKIE_NAME}=${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const json = async (res) => ({ status: res.status, body: await res.json() });

(async () => {
  try {
    // --- auth
    check("generate without admin session → 401", (await json(await generate.POST(req("/api/admin/generate", { plan: "1Y" }, false)))).status === 401);
    check("record-meta without admin session → 401", (await json(await meta.POST(req("/api/admin/record-meta", { mode: "memo", key: "X", memo: "y" }, false)))).status === 401);
    check("status without admin session → 401", (await json(await status.GET(req("/api/license/status", undefined, false)))).status === 401);

    // --- issue codes with a memo
    const before = Date.now();
    const g1 = await json(await generate.POST(req("/api/admin/generate", { plan: "1M", quantity: 2, maxDevices: 3, memo: "  스마트스토어   홍길동님 주문  " })));
    const after = Date.now();
    check("generate 1M ×2 succeeds", g1.status === 200 && g1.body.success && g1.body.keys.length === 2, JSON.stringify(g1.body).slice(0, 120));
    const [k1, k2] = g1.body.keys;
    const g2 = await json(await generate.POST(req("/api/admin/generate", { plan: "STU1Y", quantity: 1, maxDevices: 2 })));
    const k3 = g2.body.keys[0];

    // --- the list any browser reads
    const s1 = await json(await status.GET(req("/api/license/status")));
    const recs = s1.body.records;
    check("status lists every issued code (3)", s1.body.success && Object.keys(recs).length === 3);
    check("record keeps memo, whitespace collapsed", recs[k1].memo === "스마트스토어 홍길동님 주문" && recs[k2].memo === "스마트스토어 홍길동님 주문", recs[k1].memo);
    check("record keeps issue time", recs[k1].createdAt >= before && recs[k1].createdAt <= after);
    check("record keeps plan and device limit", recs[k1].plan === "1M" && recs[k1].maxDevices === 3 && recs[k3].plan === "STU1Y" && recs[k3].maxDevices === 2);
    check("code without memo has no memo", recs[k3].memo === undefined);
    check("issuing does not start the paid period", recs[k1].firstActivatedAt === undefined && recs[k1].devices.length === 0);

    // --- registration on an issued record still works (SEC-01 path)
    const plan1 = serverLicense.validateLicenseKey(k1).plan;
    const reg = await storage.registerDeviceForKey(k1, plan1, "dev-A", "민수의 아이폰");
    const afterReg = await storage.getDeviceRecordForKey(k1);
    check("registering a device works on an issued record", reg.success && afterReg.devices.length === 1 && typeof afterReg.firstActivatedAt === "number" && afterReg.memo === "스마트스토어 홍길동님 주문" && afterReg.maxDevices === 3);

    // --- memo edit
    const long = "가".repeat(260);
    const m1 = await json(await meta.POST(req("/api/admin/record-meta", { mode: "memo", key: k3, memo: long })));
    check("memo edit truncates to 200 characters", m1.body.success && m1.body.memo.length === 200);
    const m2 = await json(await meta.POST(req("/api/admin/record-meta", { mode: "memo", key: k3.toLowerCase(), memo: "" })));
    check("empty memo clears it (key case-insensitive)", m2.body.success && (await storage.getDeviceRecordForKey(k3)).memo === undefined);
    const unknownKey = serverLicense.generateLicenseKey("1Y");
    const m3 = await json(await meta.POST(req("/api/admin/record-meta", { mode: "memo", key: unknownKey, memo: "planted" })));
    check("memo on an unknown code → 404 and no record created", m3.status === 404 && (await storage.getDeviceRecordForKey(unknownKey)) === null);

    // --- carry old browser-only history over
    const koreanText = "2026. 9. 12. 오후 3:04:05";
    const parsed = list.parseKoreanDateTime(koreanText);
    check("old ko-KR date text parses to Korea time", parsed === Date.UTC(2026, 8, 12, 6, 4, 5), new Date(parsed).toISOString());
    check("오전 12시 is midnight", list.parseKoreanDateTime("2026. 1. 2. 오전 12:30:00") === Date.UTC(2026, 0, 1, 15, 30, 0));
    const imp = await json(await meta.POST(req("/api/admin/record-meta", {
      mode: "import",
      items: [
        { key: k1, memo: "브라우저 메모 (덮어쓰면 안 됨)", createdAt: parsed },
        { key: k3, memo: "옛 브라우저 메모", createdAt: parsed },
        { key: unknownKey, memo: "없는 코드" },
        { key: k2, createdAt: Date.now() + 86400000 },
      ],
    })));
    const r1 = await storage.getDeviceRecordForKey(k1);
    const r3 = await storage.getDeviceRecordForKey(k3);
    check("import: existing server memo and date are not overwritten", r1.memo === "스마트스토어 홍길동님 주문" && r1.createdAt >= before && r1.createdAt <= after);
    check("import: missing memo is filled", r3.memo === "옛 브라우저 메모");
    check("import: server date kept when present (k3 was issued with one)", r3.createdAt >= before);
    check("import: unknown code reported, not created", imp.body.unknown.length === 1 && (await storage.getDeviceRecordForKey(unknownKey)) === null);
    check("import: future date rejected", (await storage.getDeviceRecordForKey(k2)).createdAt <= after);
    check("import: counts only real changes", imp.body.updated === 1, `updated ${imp.body.updated}`);

    // legacy record with no createdAt at all (issued before this change) gets the old date
    const legacyKey = serverLicense.generateLicenseKey("1Y");
    await storage.setMaxDevicesForKey(legacyKey, 2, "1Y");
    await json(await meta.POST(req("/api/admin/record-meta", { mode: "import", items: [{ key: legacyKey, memo: "옛 코드", createdAt: parsed }] })));
    const rl = await storage.getDeviceRecordForKey(legacyKey);
    check("import: a pre-change record gets the old issue date and memo", rl.createdAt === parsed && rl.memo === "옛 코드");

    // --- list order, search, import count (what the page renders)
    const all = (await json(await status.GET(req("/api/license/status")))).body.records;
    const legacyHistory = [{ key: k2, memo: "k2 옛 메모" }, { key: legacyKey, memo: "옛 코드", createdAt: koreanText }];
    const rows = list.buildAdminLicenseRows(all, legacyHistory);
    check("list shows every server record", rows.length === 4);
    check("list is newest first; the old code is last", rows[rows.length - 1].record.key === legacyKey);
    check("server memo wins; a browser-only memo is shown separately", rows.find((r) => r.record.key === k2).memo === "스마트스토어 홍길동님 주문" && rows.find((r) => r.record.key === k2).legacyMemo === "");
    const compact = k1.replace(/-/g, "").slice(3, 11).toLowerCase();
    check("search by code without hyphens", list.filterAdminLicenseRows(rows, compact).some((r) => r.record.key === k1), compact);
    check("search by memo text", list.filterAdminLicenseRows(rows, "홍길동").length === 2);
    const byDevice = list.filterAdminLicenseRows(rows, "민수");
    check("search by device name", byDevice.length === 1 && byDevice[0].record.key === k1);
    check("search with no match is empty", list.filterAdminLicenseRows(rows, "zzzz-없음").length === 0);
    check("legacy import count ignores what the server already has", list.countLegacyToImport(all, legacyHistory) === 0);
    check("legacy import count sees a missing memo", list.countLegacyToImport(all, [{ key: k3.toLowerCase(), memo: "x" }]) === 0 && list.countLegacyToImport({ ...all, [k3]: { ...all[k3], memo: undefined } }, [{ key: k3, memo: "x" }]) === 1);

    // --- ADM-02..05 in the page source
    const page = fs.readFileSync(path.join(REPO, "src/app/admin/license/page.tsx"), "utf8");
    check("ADM-02: no test-register call on customer codes", !/api\/license\/activate/.test(page) && !/handleTestRegister/.test(page));
    check("ADM-03: device limit change asks first", /handleUpdateMaxDevices\(item\.key, itemLimit,/.test(page) && /기기 한도를 \$\{currentLimit\}대 → \$\{newLimit\}대로 바꿀까요/.test(page));
    check("ADM-04: STUDENT chapter change asks first", /handleSetStudentChapter\(/.test(page) && /STUDENT 해금을 챕터/.test(page));
    check("ADM-05: no hard-coded 81 lessons", !/81강|\/81\b/.test(page));
    check("ADM-06: page never writes the history key", !/localStorage\.setItem\(\s*LEGACY_HISTORY_KEY/.test(page) && !/GENERATED_HISTORY_KEY/.test(page));
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    process.chdir(os.tmpdir());
    fs.rmSync(work, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
