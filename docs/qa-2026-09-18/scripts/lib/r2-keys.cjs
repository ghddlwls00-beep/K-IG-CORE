/**
 * R2 버킷의 음성 클립 키 목록 — **읽기만**(ListObjectsV2). 검사 도구가 "이 컴퓨터의 public/audio" 만이 아니라 사이트가 실제로
 * 소리를 받는 곳을 함께 보게 한다(7단계 7-1 g — public/audio 는 git 에 없어 컴퓨터마다 다르다).
 * .env.local 은 scripts/upload-azure-ava-r2.mjs 의 loadEnvLocal 과 같은 방식으로 읽는다: 진짜 환경변수가 이기고, 값은 어디에도 찍지 않는다.
 * 자격이 없으면 null — 부르는 쪽이 "로컬만 봄" 을 크게 찍어야 한다.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../../..");

function loadEnvLocal() {
  // KIG_ENV_LOCAL: 다른 파일(없는 경로 포함)을 가리켜 '자격 없음' 을 시험할 때만 — 평소엔 저장소의 .env.local
  const file = process.env.KIG_ENV_LOCAL || path.join(REPO, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}

const R2_NAMES = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const hasR2 = () => R2_NAMES.every((n) => (process.env[n] || "").trim());

/** R2 의 클립 키(확장자 뺀 이름) 집합, 자격이 없으면 null. prefix 는 버킷 안 경로. */
async function r2ClipKeys(prefix = "audio/azure-ava/v1/") {
  loadEnvLocal();
  if (!hasR2()) return null;
  const e = (n) => process.env[n].trim();
  const { S3Client, ListObjectsV2Command } = require(path.join(REPO, "node_modules", "@aws-sdk", "client-s3"));
  const s3 = new S3Client({ region: "auto", endpoint: `https://${e("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e("R2_ACCESS_KEY_ID"), secretAccessKey: e("R2_SECRET_ACCESS_KEY") } });
  const keys = new Set();
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: e("R2_BUCKET_NAME"), Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents || []) { const name = o.Key.slice(prefix.length); if (name.endsWith(".mp3")) keys.add(name.slice(0, -4)); }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

const LOCAL_ONLY_WARNING = "!!! R2 자격(.env.local 의 R2_*)이 없어 이 컴퓨터 파일만 봄 — '클립 없음' 숫자에 이미 R2 에 있는 클립이 섞일 수 있음 !!!";

module.exports = { loadEnvLocal, hasR2, r2ClipKeys, LOCAL_ONLY_WARNING, R2_NAMES };
