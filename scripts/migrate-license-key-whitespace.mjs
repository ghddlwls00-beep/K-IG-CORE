#!/usr/bin/env node
/**
 * SEC-KEY-01 / BUG-002 — one-off cleanup of licence records filed under a code
 * written with a space in it.
 *
 * WHY. Validation removed inner spaces while storage kept them, so
 * "KIG-1Y-AAAA BBBB-CCCC" was filed as a licence of its own: extra devices on a
 * two-device pass, a refunded code usable again, a fresh paid period per variant.
 * The app now spells a code one way everywhere (`normalizeLicenseKey`), and
 * reading already folds a stale record into the real one — so the site is correct
 * before this script runs. What this removes is the stale OBJECT, which would
 * otherwise put its devices back the next time an admin clears the record.
 *
 * A code with nothing to strip keeps the same object name, so a healthy bucket
 * reports zero entries and nothing is written.
 *
 *   node scripts/migrate-license-key-whitespace.mjs              # dry run (default)
 *   node scripts/migrate-license-key-whitespace.mjs --apply      # write and delete
 *
 * BEFORE --apply, take a backup: node scripts/backup-license-data.mjs <저장소 밖 경로>
 *
 * Credentials come from the environment, falling back to .env.local, exactly as
 * scripts/backup-license-data.mjs does. Codes are never printed in full.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Module from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");

/** Same reader as scripts/backup-license-data.mjs — a real environment variable wins. */
function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

/**
 * Loads the app's own deviceStorage module rather than re-implementing the
 * record format. The records are encrypted; only that module knows how to read
 * them, and a second implementation of a crypto envelope is how a migration
 * corrupts data.
 */
function makeTsLoader() {
  const require = Module.createRequire(path.join(ROOT, "package.json"));
  const ts = require("typescript");
  const cache = new Map();

  const resolve = (spec, fromDir) => {
    let p;
    if (spec.startsWith("@/")) p = path.join(ROOT, "src", spec.slice(2));
    else if (spec.startsWith(".")) p = path.join(fromDir, spec);
    else return null;
    for (const cand of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
    return p;
  };

  const load = (file) => {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      cache.set(file, { exports: data });
      return data;
    }
    const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: file,
    }).outputText;
    const mod = { exports: {} };
    cache.set(file, mod);
    const dir = path.dirname(file);
    const req = (spec) => {
      if (spec === "server-only") return {};
      const resolved = resolve(spec, dir);
      return resolved ? load(resolved) : require(spec);
    };
    new Function("require", "module", "exports", "__filename", "__dirname", js)(
      req, mod, mod.exports, file, dir,
    );
    return mod.exports;
  };
  return load;
}

const load = makeTsLoader();
const deviceStorage = load(path.join(ROOT, "src/lib/deviceStorage.ts"));

const usingR2 = Boolean(
  process.env.R2_ACCOUNT_ID?.trim() &&
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_LICENSE_BUCKET?.trim() &&
    process.env.LICENSE_STORAGE_SECRET?.trim(),
);

console.log(`저장소     : ${usingR2 ? "R2 (운영 기록)" : "로컬 파일 (data/license-devices.json)"}`);
console.log(`모드       : ${APPLY ? "적용 (쓰기·삭제)" : "확인만 (아무것도 바꾸지 않음)"}`);
if (APPLY && usingR2) {
  console.log("백업은 받으셨나요? node scripts/backup-license-data.mjs <저장소 밖 경로>\n");
}

const result = await deviceStorage.migrateWhitespaceKeyRecords({ apply: APPLY });

console.log(`\n읽은 기록   : ${result.scanned}개`);
console.log(`정리 대상   : ${result.entries.length}개`);

if (result.entries.length === 0) {
  console.log("\n공백이 들어간 이용권 기록은 없습니다. 바꿀 것이 없습니다.");
  process.exit(0);
}

let devicesBefore = 0;
let devicesAfter = 0;
console.log("");
for (const e of result.entries) {
  devicesBefore += e.devicesBefore.canonical + e.devicesBefore.stale;
  devicesAfter += e.devicesAfter;
  console.log(`  ${e.canonicalKeyMasked}`);
  console.log(`    기기 수 : 정상기록 ${e.devicesBefore.canonical}대 + 공백기록 ${e.devicesBefore.stale}대 → 합친 뒤 ${e.devicesAfter}대 (한도 ${e.maxDevices}대)${e.overLimit ? "  ⚠ 한도 초과" : ""}`);
  console.log(`    환불차단: 정상기록 ${e.revokedBefore.canonical ? "예" : "아니오"} · 공백기록 ${e.revokedBefore.stale ? "예" : "아니오"} → 합친 뒤 ${e.revokedAfter ? "예" : "아니오"}`);
}

console.log(`\n합계 기기 수: 병합 전 ${devicesBefore}대 → 병합 후 ${devicesAfter}대`);
const over = result.entries.filter((e) => e.overLimit);
if (over.length) {
  console.log(
    `\n⚠ 한도를 넘은 이용권 ${over.length}건이 있습니다. 기존 기기는 그대로 두었습니다 —\n` +
      `  돈을 낸 기기를 말없이 끊지 않기 위해서입니다. 새 기기 등록만 막힙니다.\n` +
      `  정리하시려면 /admin/license 에서 해당 이용권의 "기기 초기화" 를 누르시면 됩니다.`,
  );
}
if (!APPLY) console.log(`\n실제로 정리하려면: node scripts/migrate-license-key-whitespace.mjs --apply`);
