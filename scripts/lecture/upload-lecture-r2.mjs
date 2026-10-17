#!/usr/bin/env node
/**
 * LECTURE — uploads the page images and pen files that build-lecture.mjs wrote to .lecture-media/ into the
 * media bucket, under the same keys (audio/lecture/<id>/p<NN>.jpg · pen.json · voice.mp3). The bucket is private: the
 * browser reaches these only through /audio/[...path], which checks the licence (src/lib/mediaAccess.ts).
 *
 *   node scripts/lecture/upload-lecture-r2.mjs [--media <folder>] [--force]
 *
 * Re-runs skip what the checkpoint (<media>/.r2-uploaded.json, key → sha256) says is already there with
 * the same bytes; --force sends everything again. Credentials: R2_ACCOUNT_ID, R2_BUCKET_NAME,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY from the environment or .env.local (values never printed).
 * Signing is the same as scripts/upload-azure-ava-r2.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, createHmac } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const mediaArg = args.indexOf("--media");
const MEDIA = path.resolve(ROOT, mediaArg > -1 ? args[mediaArg + 1] : ".lecture-media");
const FORCE = args.includes("--force");
const CHECKPOINT = path.join(MEDIA, ".r2-uploaded.json");
const CONCURRENCY = 8;

function loadEnvLocal() {
  for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();
const { R2_ACCOUNT_ID: accountId, R2_BUCKET_NAME: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;

const sha256 = (v) => createHash("sha256").update(v).digest("hex");
const hmac = (k, v, enc) => createHmac("sha256", k).update(v).digest(enc);
const uriEncode = (v) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function signed(key, body, contentType) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const uri = `/${uriEncode(bucket)}/${key.split("/").map(uriEncode).join("/")}`;
  const payloadHash = sha256(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical = ["PUT", uri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const key4 = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), "auto"), "s3"), "aws4_request");
  return {
    url: `https://${host}${uri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${hmac(key4, toSign, "hex")}`,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

async function put(file, attempt = 1) {
  const body = fs.readFileSync(file.full);
  const s = signed(file.key, body, file.type);
  const res = await fetch(s.url, { method: "PUT", headers: s.headers, body });
  if (res.ok) return sha256(body);
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return put(file, attempt + 1);
  }
  throw new Error(`R2 ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) throw new Error("R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required");
  const base = path.join(MEDIA, "audio", "lecture");
  if (!fs.existsSync(base)) throw new Error(`nothing to upload in ${base} — run build-lecture.mjs first`);
  const files = [];
  for (const id of fs.readdirSync(base)) {
    for (const name of fs.readdirSync(path.join(base, id))) {
      const full = path.join(base, id, name);
      // voice.mp3: the lecture's AI voice (scripts/lecture/voice/, 2026-10-17) — never an original recording
      const type = name.endsWith(".jpg") ? "image/jpeg" : name.endsWith(".json") ? "application/json" : name === "voice.mp3" ? "audio/mpeg" : null;
      if (type) files.push({ full, key: `audio/lecture/${id}/${name}`, type });
    }
  }
  const done = !FORCE && fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, "utf8")) : {};
  const pending = files.filter((f) => done[f.key] !== sha256(fs.readFileSync(f.full)));
  console.log(`files ${files.length} · to send ${pending.length}`);
  let cursor = 0, sent = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
    for (;;) {
      const f = pending[cursor++];
      if (!f) return;
      try {
        done[f.key] = await put(f);
        sent += 1;
        if (sent % 50 === 0) {
          fs.writeFileSync(CHECKPOINT, JSON.stringify(done, null, 1));
          console.log(`${sent}/${pending.length}`);
        }
      } catch (e) {
        failures.push(`${f.key}: ${e.message}`);
      }
    }
  }));
  fs.writeFileSync(CHECKPOINT, JSON.stringify(done, null, 1));
  console.log(`sent ${sent} · failed ${failures.length}`);
  if (failures.length) {
    for (const f of failures.slice(0, 10)) console.error(f);
    process.exitCode = 1;
  }
}
main().catch((e) => {
  console.error(`upload failed: ${e.message}`);
  process.exit(1);
});
