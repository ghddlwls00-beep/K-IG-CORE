#!/usr/bin/env node
/**
 * Copies the licence and progress records out of R2 to a local, dated folder.
 *
 * Those records are the only proof of who bought what. They live in one bucket
 * with no backup, so a mistaken delete or a corrupted write leaves no way to
 * tell a paying customer's device registration from a stranger's, and no basis
 * for a refund or a re-issue. Everything else in this product can be rebuilt
 * from the repository; this cannot.
 *
 *   node scripts/backup-license-data.mjs                     # 기본 위치에 백업
 *   node scripts/backup-license-data.mjs --out D:/kig-backup # 위치 지정
 *   node scripts/backup-license-data.mjs --verify            # 최근 백업 검증만
 *
 * Read-only against R2: it lists and gets, never puts or deletes. Run it before
 * any migration, any credential rotation, and on a schedule.
 *
 * Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and
 * R2_LICENSE_BUCKET. They are not read from .env.local automatically — export
 * them, or pass them in the environment of the scheduled job.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const VERIFY_ONLY = process.argv.includes("--verify");

// Default outside the repository: these are customer records, and a backup that
// lands in a working tree eventually lands in a commit.
const OUT_ROOT = path.resolve(arg("--out") || path.join(ROOT, "..", "kig-backups"));

/**
 * Refuse to write customer records anywhere inside the repository.
 *
 * The default is already outside it and 백업하기.bat only ever passes outside
 * paths, so this guards the one remaining way in: a hand-typed `--out`. The
 * failure it prevents is quiet and permanent — licence keys and device
 * registrations land in the working tree, ride along on the next `git add -A`,
 * and are then in the history and on GitHub, where deleting the file does not
 * remove them. Better to refuse the run than to make that recoverable.
 *
 * The comparison is on resolved paths with a separator appended, so a sibling
 * directory whose name merely starts with the repository's (…/K-IG-CORE-backups)
 * is not mistaken for something inside it.
 */
{
  const repo = path.resolve(ROOT) + path.sep;
  const dest = OUT_ROOT + path.sep;
  if (dest.startsWith(repo)) {
    console.error(
      `\n오류: 백업 위치가 저장소 안입니다.\n` +
      `  요청한 위치 : ${OUT_ROOT}\n` +
      `  저장소      : ${path.resolve(ROOT)}\n\n` +
      `고객의 이용권·진도 기록이므로 저장소 안에 두면 git 에 딸려 들어가고,\n` +
      `한 번 올라가면 파일을 지워도 기록에서 사라지지 않습니다.\n` +
      `저장소 밖 경로를 지정하세요 (예: D:\\kig-backup, %OneDrive%\\KIG-백업).`,
    );
    process.exit(1);
  }
}

/**
 * Falls back to .env.local for anything the environment did not supply.
 *
 * A backup only protects you if it runs unattended, and a scheduled task that
 * needs four secrets exported by hand does not run unattended. The credentials
 * are already in .env.local for local work, so read them from there and keep
 * the scheduled command to a single line.
 */
function loadEnvLocal() {
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue; // a real environment variable wins
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
// The licence bucket is separate from the media bucket and is not always set
// locally; default to the name this project uses.
const bucket = process.env.R2_LICENSE_BUCKET?.trim() || "k-ig-license-private";

function fail(message) {
  console.error(`\n오류: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- verify
function listBackups() {
  if (!fs.existsSync(OUT_ROOT)) return [];
  return fs
    .readdirSync(OUT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name)
    .sort();
}

function verifyBackup(dir) {
  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return { ok: false, why: "manifest.json 없음" };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let missing = 0;
  let sizeMismatch = 0;
  for (const o of manifest.objects) {
    const f = path.join(dir, "objects", o.key);
    if (!fs.existsSync(f)) { missing++; continue; }
    if (fs.statSync(f).size !== o.size) sizeMismatch++;
  }
  // A backup that restores nothing is worse than none, because it is trusted.
  return {
    ok: missing === 0 && sizeMismatch === 0 && manifest.objects.length > 0,
    count: manifest.objects.length,
    missing,
    sizeMismatch,
    at: manifest.backedUpAt,
  };
}

if (VERIFY_ONLY) {
  const backups = listBackups();
  if (!backups.length) fail(`백업이 없습니다: ${OUT_ROOT}`);
  console.log(`백업 위치: ${OUT_ROOT}\n`);
  for (const name of backups.slice(-10)) {
    const v = verifyBackup(path.join(OUT_ROOT, name));
    const mark = v.ok ? "✅" : "🔴";
    console.log(`  ${mark} ${name}  객체 ${v.count ?? "?"}개` +
      (v.missing ? ` · 파일 없음 ${v.missing}` : "") +
      (v.sizeMismatch ? ` · 크기 불일치 ${v.sizeMismatch}` : "") +
      (v.why ? ` · ${v.why}` : ""));
  }
  process.exit(0);
}

// ---------------------------------------------------------------- backup
if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  fail(
    "R2 자격증명이 없습니다. 아래를 환경변수로 넣고 다시 실행하세요.\n" +
    "  R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_LICENSE_BUCKET",
  );
}

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require(
  path.join(ROOT, "node_modules", "@aws-sdk", "client-s3"),
);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  maxAttempts: 3,
});

const stamp = new Date().toISOString().replace(/:/g, "").replace(/\..+/, "").replace("T", "-");
const DEST = path.join(OUT_ROOT, stamp);

async function readAll(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

(async () => {
  console.log(`백업 대상 : ${bucket}`);
  console.log(`저장 위치 : ${DEST}\n`);

  const objects = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const o of page.Contents || []) objects.push({ key: o.Key, size: o.Size, modified: o.LastModified });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  if (!objects.length) {
    fail(`버킷이 비어 있습니다. 버킷 이름이 맞는지 확인하세요: ${bucket}`);
  }
  console.log(`객체 ${objects.length}개 발견\n`);

  fs.mkdirSync(path.join(DEST, "objects"), { recursive: true });
  let done = 0;
  let bytes = 0;
  const failures = [];

  for (const o of objects) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: o.key }));
      const buf = await readAll(res.Body);
      const dest = path.join(DEST, "objects", o.key);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      bytes += buf.length;
      done += 1;
      if (done % 20 === 0 || done === objects.length) {
        process.stdout.write(`\r  ${done}/${objects.length} · ${(bytes / 1024).toFixed(0)}KB`);
      }
    } catch (err) {
      failures.push({ key: o.key, error: err?.name || String(err) });
    }
  }
  process.stdout.write("\n");

  fs.writeFileSync(
    path.join(DEST, "manifest.json"),
    JSON.stringify({ backedUpAt: new Date().toISOString(), bucket, objectCount: objects.length, bytes, objects, failures }, null, 1),
    "utf8",
  );

  // Verify what was just written, so a silent partial copy cannot pass as good.
  const v = verifyBackup(DEST);
  console.log(`\n${v.ok ? "✅ 백업 완료" : "🔴 백업 불완전"}  객체 ${done}/${objects.length} · ${(bytes / 1024).toFixed(0)}KB`);
  if (failures.length) {
    console.log(`🔴 실패 ${failures.length}건`);
    for (const f of failures.slice(0, 10)) console.log(`     ${f.key}  ${f.error}`);
  }
  if (!v.ok) process.exit(1);

  // Keep the last 30; older ones are noise, and these are small files.
  const all = listBackups();
  const old = all.slice(0, Math.max(0, all.length - 30));
  for (const name of old) fs.rmSync(path.join(OUT_ROOT, name), { recursive: true, force: true });
  if (old.length) console.log(`오래된 백업 ${old.length}개 정리 (최근 30개 보관)`);

  console.log(`\n복구 방법: ${path.join(DEST, "objects")} 의 파일을 같은 키로 버킷에 업로드`);
})();
