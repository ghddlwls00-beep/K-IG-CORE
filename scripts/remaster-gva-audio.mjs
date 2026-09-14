import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { promisify } from "node:util";

const BASE_DIR = "C:/Users/ghddl/Downloads/중등영어독해(1~200)";
const AUDIO_PREFIX = "gva/audio-rnnoise-v2";
const AUDIO_VERSION = "20260913-rnnoise-v2";
const CONCURRENCY = 2;
const execFileAsync = promisify(execFile);

const ffmpegPath = process.env.GVA_FFMPEG;
const rnnoiseModel = process.env.GVA_RNNOISE_MODEL;
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  throw new Error("GVA_FFMPEG must point to a working ffmpeg executable");
}
if (!rnnoiseModel || !fs.existsSync(rnnoiseModel)) {
  throw new Error("GVA_RNNOISE_MODEL must point to an RNNoise .rnnn model");
}

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const [key, ...value] = line.trim().split("=");
  if (key && value.length) env[key] = value.join("=");
}

const accountId = env.R2_ACCOUNT_ID;
const bucket = env.R2_BUCKET_NAME;
const accessKeyId = env.R2_ACCESS_KEY_ID;
const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
const publicBase = (env.NEXT_PUBLIC_MEDIA_URL || "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev").replace(/\/+$/, "");
if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing R2 credentials in .env.local");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function signingHeaders(method, objectKey, body, contentType) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeURIComponent(bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  const payloadHash = sha256(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
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
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

async function uploadToR2(objectKey, body, contentType, retries = 20) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const signed = signingHeaders("PUT", objectKey, body, contentType);
      const response = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body,
      });
      if (response.ok) return;
      if (attempt === retries) {
        throw new Error(`Upload failed ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`upload retry ${attempt}/${retries}: ${objectKey} (${error?.cause?.code || error?.message || error})`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, 1500 * attempt)));
  }
}

async function objectExists(objectKey) {
  try {
    const response = await fetch(`${publicBase}/${objectKey}`, { method: "HEAD", cache: "no-store" });
    return response.ok && Number(response.headers.get("content-length") || 0) > 0;
  } catch {
    return false;
  }
}

function getGdbFiles() {
  const result = new Map();
  function scan(directory) {
    for (const item of fs.readdirSync(directory)) {
      const fullPath = path.join(directory, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath);
        continue;
      }
      const match = item.match(/(\d{3})\.gdb$/i);
      if (match) result.set(Number(match[1]), fullPath);
    }
  }
  scan(BASE_DIR);
  return result;
}

function parseArchive(buffer) {
  if (buffer.subarray(0, 4).toString("latin1") !== "GDB\0") {
    throw new Error("Invalid GVA archive magic");
  }
  const dataBase = 0x108 + buffer.readUInt32LE(0xb0);
  const entries = [];
  for (let position = 0x109; position + 15 < dataBase; ) {
    const nameLength = buffer.readUIntLE(position, 3);
    if (nameLength === 0) break;
    const offset = buffer.readUInt32LE(position + 3);
    const size = buffer.readUInt32LE(position + 7);
    const name = new TextDecoder("euc-kr").decode(
      buffer.subarray(position + 15, position + 15 + nameLength),
    );
    const start = dataBase + offset;
    const end = start + size;
    if (end > buffer.length) throw new Error(`Archive entry out of bounds: ${name}`);
    entries.push({ name, data: buffer.subarray(start, end) });
    position += 16 + nameLength;
  }
  return entries;
}

function parseMp3Header(buffer, position) {
  if (position + 4 > buffer.length || buffer[position] !== 0xff || (buffer[position + 1] & 0xe0) !== 0xe0) return null;
  const version = (buffer[position + 1] >> 3) & 3;
  const layer = (buffer[position + 1] >> 1) & 3;
  const bitrateIndex = (buffer[position + 2] >> 4) & 15;
  const sampleRateIndex = (buffer[position + 2] >> 2) & 3;
  const padding = (buffer[position + 2] >> 1) & 1;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const mpeg1Bitrates = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const mpeg2Bitrates = [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const bitrate = (version === 3 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex - 1] * 1000;
  const sampleRate = [44100, 48000, 32000][sampleRateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
  const frameLength = Math.floor(((version === 3 ? 144 : 72) * bitrate) / sampleRate) + padding;
  return {
    frameLength,
    duration: (version === 3 ? 1152 : 576) / sampleRate,
    streamId: `${version}:${layer}:${bitrateIndex}:${sampleRateIndex}`,
  };
}

function extractAudioBuffer(gdbBuffer) {
  const audioEntry = parseArchive(gdbBuffer).find((entry) => entry.name.toLowerCase().endsWith(".audio"));
  if (!audioEntry) throw new Error("Audio entry missing");
  const source = audioEntry.data;

  let position = -1;
  let streamId = "";
  for (let cursor = 0; cursor < source.length - 4; cursor++) {
    const header = parseMp3Header(source, cursor);
    if (!header) continue;
    const expected = cursor + header.frameLength;
    for (let next = expected; next <= Math.min(expected + 256, source.length - 4); next++) {
      const nextHeader = parseMp3Header(source, next);
      if (nextHeader?.streamId === header.streamId) {
        position = cursor;
        streamId = header.streamId;
        break;
      }
    }
    if (position >= 0) break;
  }
  if (position < 0) throw new Error("MPEG audio frames not found");

  const frames = [];
  let duration = 0;
  while (position >= 0 && position < source.length - 4) {
    const header = parseMp3Header(source, position);
    if (!header || header.streamId !== streamId || position + header.frameLength > source.length) break;
    frames.push(source.subarray(position, position + header.frameLength));
    duration += header.duration;

    const expected = position + header.frameLength;
    let nextPosition = -1;
    for (let next = expected; next <= Math.min(expected + 4096, source.length - 4); next++) {
      const nextHeader = parseMp3Header(source, next);
      if (nextHeader?.streamId === streamId) {
        nextPosition = next;
        break;
      }
    }
    if (nextPosition < 0) break;
    position = nextPosition;
  }

  if (frames.length < 1000) throw new Error(`Too few MPEG frames: ${frames.length}`);
  return { buffer: Buffer.concat(frames), duration: Math.round(duration), frameCount: frames.length };
}

async function remasterAudio(inputBuffer, lessonNumber) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `gva-${String(lessonNumber).padStart(3, "0")}-`));
  const inputPath = path.join(temporaryDirectory, "source.mp3");
  const outputPath = path.join(temporaryDirectory, "remastered.mp3");
  fs.writeFileSync(inputPath, inputBuffer);

  try {
    const filter = `aresample=48000,arnndn=m=${path.basename(rnnoiseModel)}:mix=1,highpass=f=70,lowpass=f=11000,loudnorm=I=-18:TP=-2:LRA=11`;
    await execFileAsync(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-i", inputPath,
      "-af", filter,
      "-ar", "48000",
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      outputPath,
    ], {
      cwd: path.dirname(rnnoiseModel),
      maxBuffer: 64 * 1024 * 1024,
    });
    if (!fs.existsSync(outputPath)) throw new Error("ffmpeg did not create an output file");
    const output = fs.readFileSync(outputPath);
    if (output.length < 32_000) throw new Error(`Remastered output is unexpectedly small: ${output.length}`);

    await execFileAsync(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", outputPath,
      "-f", "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ], { maxBuffer: 64 * 1024 * 1024 });
    return output;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  console.log("=== GVA 200강 RNNoise 리마스터 시작 ===");
  console.log("원본 보존 / 무음 게이트 없음 / 48 kHz 128 kbps MP3");

  const gdbFiles = getGdbFiles();
  const missing = Array.from({ length: 200 }, (_, index) => index + 1).filter((number) => !gdbFiles.has(number));
  if (missing.length) throw new Error(`Missing GDB files: ${missing.join(", ")}`);
  console.log(`GDB 확인: ${gdbFiles.size}/200`);

  const queue = Array.from({ length: 200 }, (_, index) => index + 1);
  const results = new Map();
  let completed = 0;

  async function worker() {
    while (queue.length) {
      const number = queue.shift();
      const objectKey = `${AUDIO_PREFIX}/gva-${String(number).padStart(3, "0")}.mp3`;
      const source = extractAudioBuffer(fs.readFileSync(gdbFiles.get(number)));
      if (!(await objectExists(objectKey))) {
        const remastered = await remasterAudio(source.buffer, number);
        await uploadToR2(objectKey, remastered, "audio/mpeg");
      }
      results.set(number, { objectKey, duration: source.duration, frameCount: source.frameCount });
      completed++;
      if (completed % 5 === 0 || completed === 200) {
        console.log(`리마스터 및 업로드: ${completed}/200 (${Math.round((completed / 200) * 100)}%)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const metadataPath = path.resolve("content", "gva-lessons.json");
  const lessons = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  if (lessons.length !== 200) throw new Error(`Unexpected metadata count: ${lessons.length}`);
  for (const lesson of lessons) {
    const result = results.get(lesson.number);
    if (!result) throw new Error(`No processed result for lesson ${lesson.number}`);
    lesson.audioKey = result.objectKey;
    lesson.audioUrl = `${publicBase}/${result.objectKey}?v=${AUDIO_VERSION}`;
    lesson.durationSeconds = result.duration;
    lesson.durationFormatted = `${Math.floor(result.duration / 60)}분 ${result.duration % 60}초`;
    lesson.sourceFrameCount = result.frameCount;
    lesson.audioProcessing = {
      version: AUDIO_VERSION,
      source: "GDB embedded MPEG audio",
      denoise: "RNNoise standard model",
      sampleRate: 48000,
      bitrateKbps: 128,
      hardGate: false,
    };
  }
  fs.writeFileSync(metadataPath, `${JSON.stringify(lessons, null, 2)}\n`, "utf8");
  console.log(`메타데이터 갱신 완료: ${metadataPath}`);
  console.log("=== GVA 200강 RNNoise 리마스터 완료 ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
