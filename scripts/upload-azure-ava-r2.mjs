#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, createHmac } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const SOURCE = path.join(PUBLIC, "audio", "azure-ava", "v1");
const CHECKPOINT = path.join(SOURCE, ".r2-uploaded.json");
const CONCURRENCY = Math.max(1, Math.min(32, Number(process.env.R2_UPLOAD_CONCURRENCY) || 16));

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function uriEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function signingHeaders(method, objectKey, body) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${uriEncode(bucket)}/${objectKey.split("/").map(uriEncode).join("/")}`;
  const payloadHash = sha256(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Type": "audio/mpeg",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT)) return new Set();
  try {
    return new Set(JSON.parse(fs.readFileSync(CHECKPOINT, "utf8")));
  } catch {
    return new Set();
  }
}

function saveCheckpoint(uploaded) {
  const temporary = `${CHECKPOINT}.part`;
  fs.writeFileSync(temporary, JSON.stringify([...uploaded].sort()));
  fs.renameSync(temporary, CHECKPOINT);
}

function filesToUpload() {
  if (!fs.existsSync(SOURCE)) return [];
  return fs
    .readdirSync(SOURCE, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mp3"))
    .map((entry) => {
      const full = path.join(SOURCE, entry.name);
      return {
        full,
        key: path.relative(PUBLIC, full).split(path.sep).join("/"),
        size: fs.statSync(full).size,
      };
    });
}

function human(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)}${units[unit]}`;
}

async function upload(file, attempt = 1) {
  const body = fs.readFileSync(file.full);
  const signed = signingHeaders("PUT", file.key, body);
  const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body });
  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      return upload(file, attempt + 1);
    }
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`R2 ${response.status}: ${detail}`);
  }
}

async function main() {
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required",
    );
  }

  const files = filesToUpload();
  const uploaded = loadCheckpoint();
  const pending = files.filter((file) => !uploaded.has(file.key));
  const totalBytes = pending.reduce((sum, file) => sum + file.size, 0);
  console.log(`found      : ${files.length.toLocaleString("en-US")} Ava files`);
  console.log(`pending    : ${pending.length.toLocaleString("en-US")}, ${human(totalBytes)}`);
  if (pending.length === 0) return;

  let cursor = 0;
  let completed = 0;
  let sent = 0;
  let checkpointAt = 0;
  const failures = [];
  const started = Date.now();

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const file = pending[index];
      try {
        await upload(file);
        uploaded.add(file.key);
        sent += file.size;
      } catch (error) {
        failures.push({ key: file.key, message: error instanceof Error ? error.message : String(error) });
      }
      completed += 1;
      if (completed - checkpointAt >= 100 || completed === pending.length) {
        checkpointAt = completed;
        saveCheckpoint(uploaded);
        const elapsed = Math.max(1, (Date.now() - started) / 1000);
        console.log(
          `${completed}/${pending.length} (${Math.round((completed / pending.length) * 100)}%) · ${human(sent)} · ${(completed / elapsed).toFixed(1)} items/s`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  if (failures.length) {
    console.error(`failed     : ${failures.length}`);
    for (const failure of failures.slice(0, 10)) console.error(`- ${failure.key}: ${failure.message}`);
    process.exitCode = 1;
  } else {
    console.log(`uploaded   : ${pending.length.toLocaleString("en-US")} files, ${human(sent)}`);
  }
}

main().catch((error) => {
  console.error(`upload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
