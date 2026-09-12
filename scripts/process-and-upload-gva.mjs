import fs from "node:fs";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";

// Load .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.trim().split("=");
  if (k && v.length) env[k] = v.join("=");
});

const accountId = env.R2_ACCOUNT_ID;
const bucket = env.R2_BUCKET_NAME;
const accessKeyId = env.R2_ACCESS_KEY_ID;
const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
const publicBase = (env.NEXT_PUBLIC_MEDIA_URL || "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev").replace(/\/+$/, "");

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 credentials in .env.local");
  process.exit(1);
}

const BASE_DIR = "C:/Users/ghddl/Downloads/중등영어독해(1~200)";

function sha256(val) {
  return createHash("sha256").update(val).digest("hex");
}
function hmac(key, val, enc) {
  return createHmac("sha256", key).update(val).digest(enc);
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

async function uploadToR2(objectKey, body, contentType, retries = 8) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const signed = signingHeaders("PUT", objectKey, body, contentType);
      const res = await fetch(signed.url, { method: "PUT", headers: signed.headers, body });
      if (res.ok) return true;
      if (attempt === retries) {
        throw new Error(`Upload failed ${res.status}: ${await res.text()}`);
      }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`재시도 ${attempt}/${retries}: ${objectKey} (${err?.cause?.code || err?.message || err})`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function objectExists(objectKey) {
  try {
    const response = await fetch(`${publicBase}/${objectKey}`, { method: "HEAD" });
    return response.ok && Number(response.headers.get("content-length") || 0) > 0;
  } catch {
    return false;
  }
}

// 1. Find all 200 GDB files
function getGdbFiles() {
  const result = new Map(); // number -> filePath

  function scan(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        scan(full);
      } else if (item.endsWith(".gdb")) {
        const m = item.match(/(\d{3})\.gdb$/);
        if (m) {
          const num = parseInt(m[1], 10);
          result.set(num, full);
        }
      }
    }
  }

  scan(BASE_DIR);
  return result;
}

function parseArchive(buf) {
  if (buf.subarray(0, 4).toString("latin1") !== "GDB\0") {
    throw new Error("Invalid GVA archive magic");
  }

  const dataBase = 0x108 + buf.readUInt32LE(0xb0);
  const entries = [];
  for (let pos = 0x109; pos + 15 < dataBase; ) {
    const nameLength = buf.readUIntLE(pos, 3);
    if (nameLength === 0) break;
    const offset = buf.readUInt32LE(pos + 3);
    const size = buf.readUInt32LE(pos + 7);
    const name = new TextDecoder("euc-kr").decode(
      buf.subarray(pos + 15, pos + 15 + nameLength),
    );
    const start = dataBase + offset;
    const end = start + size;
    if (end > buf.length) throw new Error(`Archive entry out of bounds: ${name}`);
    entries.push({ name, data: buf.subarray(start, end) });
    pos += 16 + nameLength;
  }
  return entries;
}

function parseMp3Header(buf, pos) {
  if (pos + 4 > buf.length || buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) return null;
  const version = (buf[pos + 1] >> 3) & 3;
  const layer = (buf[pos + 1] >> 1) & 3;
  const bitrateIndex = (buf[pos + 2] >> 4) & 15;
  const sampleRateIndex = (buf[pos + 2] >> 2) & 3;
  const padding = (buf[pos + 2] >> 1) & 1;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const mpeg1Bitrates = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const mpeg2Bitrates = [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const bitrate = (version === 3 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex - 1] * 1000;
  const sampleRate = [44100, 48000, 32000][sampleRateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
  const frameLength = Math.floor(((version === 3 ? 144 : 72) * bitrate) / sampleRate) + padding;
  return {
    frameLength,
    duration: (version === 3 ? 1152 : 576) / sampleRate,
    signature: buf.subarray(pos, pos + 3).toString("hex"),
  };
}

// GVA2000 stores valid MPEG frames with small proprietary bytes inserted
// between some frames. Rebuilding the MP3 frame-by-frame prevents browser
// decoders from stalling or clicking at those boundaries.
function extractAudioBuffer(buf) {
  const audioEntry = parseArchive(buf).find((entry) => entry.name.toLowerCase().endsWith(".audio"));
  if (!audioEntry) throw new Error("Audio entry missing");
  const source = audioEntry.data;

  let start = -1;
  let signature = "";
  for (let pos = 0; pos < source.length - 4; pos++) {
    const header = parseMp3Header(source, pos);
    if (!header) continue;
    const expected = pos + header.frameLength;
    let hasNext = false;
    for (let next = expected; next <= Math.min(expected + 256, source.length - 4); next++) {
      const nextHeader = parseMp3Header(source, next);
      if (nextHeader?.signature === header.signature) {
        hasNext = true;
        break;
      }
    }
    if (hasNext) {
      start = pos;
      signature = header.signature;
      break;
    }
  }
  if (start < 0) throw new Error("MPEG audio frames not found");

  const frames = [];
  let duration = 0;
  let pos = start;
  let maxSkippedBytes = 0;
  while (pos >= 0 && pos < source.length - 4) {
    const header = parseMp3Header(source, pos);
    if (!header || header.signature !== signature || pos + header.frameLength > source.length) break;
    frames.push(source.subarray(pos, pos + header.frameLength));
    duration += header.duration;

    const expected = pos + header.frameLength;
    let nextPos = -1;
    for (let next = expected; next <= Math.min(expected + 4096, source.length - 4); next++) {
      const nextHeader = parseMp3Header(source, next);
      if (nextHeader?.signature === signature) {
        nextPos = next;
        maxSkippedBytes = Math.max(maxSkippedBytes, next - expected);
        break;
      }
    }
    if (nextPos < 0) break;
    pos = nextPos;
  }

  if (frames.length < 1000) throw new Error(`Too few MPEG frames: ${frames.length}`);
  return { buffer: Buffer.concat(frames), duration: Math.round(duration), frameCount: frames.length, maxSkippedBytes };
}

function extractSlides(buf) {
  return parseArchive(buf)
    .filter((entry) => /\.jpe?g$/i.test(entry.name))
    .map((entry) => Buffer.from(entry.data));
}

async function main() {
  console.log("=== K-IG GVA 200강 R2 자동 업로드 & 메타데이터 파이프라인 시작 ===");

  const gdbMap = getGdbFiles();
  console.log(`발견된 GDB 강의 파일: ${gdbMap.size}개`);
  const missing = Array.from({ length: 200 }, (_, index) => index + 1).filter((num) => !gdbMap.has(num));
  if (gdbMap.size !== 200 || missing.length > 0) throw new Error(`GDB 파일 누락: ${missing.join(", ")}`);

  // Extract slides:
  // 1~100 slides from middle 001
  // 101~200 slides from high 101
  console.log("\n[1단계] 교재 슬라이드 200장 추출 시작...");
  const middleBuf = fs.readFileSync(gdbMap.get(1));
  const middleSlides = extractSlides(middleBuf);
  console.log(`중등 독해 1~100 슬라이드 추출 완료: ${middleSlides.length}장`);

  const highBuf = fs.readFileSync(gdbMap.get(101));
  const highSlides = extractSlides(highBuf);
  console.log(`고등 독해 101~200 슬라이드 추출 완료: ${highSlides.length}장`);

  // Upload slides
  console.log("\n[2단계] 교재 슬라이드 Cloudflare R2 업로드 중...");
  for (let num = 1; num <= 200; num++) {
    const slideBuf = num <= 100 ? middleSlides[num - 1] : highSlides[num - 101];
    const key = `gva/slides/gva-${String(num).padStart(3, "0")}.jpg`;
    if (!(await objectExists(key))) await uploadToR2(key, slideBuf, "image/jpeg");
    if (num % 25 === 0 || num === 200) {
      console.log(`슬라이드 업로드 진행: ${num}/200 완료`);
    }
  }
  console.log("✓ 슬라이드 200장 R2 업로드 100% 완료!");

  // Extract and upload audio for each lecture
  console.log("\n[3단계] 1~200강 육성 오디오 추출 및 R2 업로드 시작 (200개 파일)...");
  const lessons = [];

  const CONCURRENCY = 3;
  const queue = [];
  for (let num = 1; num <= 200; num++) {
    queue.push(num);
  }

  let completedAudio = 0;

  async function worker() {
    while (queue.length > 0) {
      const num = queue.shift();
      const filePath = gdbMap.get(num);
      if (!filePath) {
        console.error(`오류: ${num}강 파일 누락`);
        continue;
      }

      const fileBuf = fs.readFileSync(filePath);
      const audio = extractAudioBuffer(fileBuf);
      const audioKey = `gva/audio/gva-${String(num).padStart(3, "0")}.mp3`;
      const slideKey = `gva/slides/gva-${String(num).padStart(3, "0")}.jpg`;

      if (!(await objectExists(audioKey))) await uploadToR2(audioKey, audio.buffer, "audio/mpeg");

      lessons.push({
        id: `gva-${String(num).padStart(3, "0")}`,
        number: num,
        level: num <= 100 ? "middle" : "high",
        levelLabel: num <= 100 ? "중등 독해" : "고등 독해",
        title: num <= 100 ? `중등 영어독해 ${num}강` : `고등 영어독해 ${num}강`,
        passageNumber: num <= 100 ? num : num - 100,
        audioKey,
        slideKey,
        audioUrl: `${publicBase}/${audioKey}?v=20260912-gdb-clean`,
        slideUrl: `${publicBase}/${slideKey}?v=20260912-gdb-clean`,
        durationSeconds: audio.duration,
        durationFormatted: `${Math.floor(audio.duration / 60)}분 ${audio.duration % 60}초`,
        chapter: Math.ceil(num / 10),
        chapterLabel: `CHAPTER ${String(Math.ceil(num / 10)).padStart(2, "0")}`,
        chapterRange: `${Math.floor((num - 1) / 10) * 10 + 1}~${Math.ceil(num / 10) * 10}강`,
        chapterSubtopic: `${num <= 100 ? "중등" : "고등"} 영어독해 ${Math.floor((num - 1) / 10) * 10 + 1}~${Math.ceil(num / 10) * 10}강`,
        chapterEnSubtopic: "English Reading Lecture",
        chapterDesc: "교재 지문과 실제 강의 음성을 함께 보며 독해 흐름과 문장 구조를 학습합니다.",
        sourceFrameCount: audio.frameCount,
        sourceMaxSkippedBytes: audio.maxSkippedBytes,
      });

      completedAudio++;
      if (completedAudio % 10 === 0 || completedAudio === 200) {
        console.log(`오디오 업로드 진행: ${completedAudio}/200 완료 (${Math.round((completedAudio / 200) * 100)}%)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Sort lessons by number
  lessons.sort((a, b) => a.number - b.number);

  // Save metadata
  const contentDir = path.resolve("content");
  if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
  const metaPath = path.join(contentDir, "gva-lessons.json");
  fs.writeFileSync(metaPath, JSON.stringify(lessons, null, 2), "utf8");
  console.log(`\n✓ 메타데이터 생성 완료: ${metaPath} (총 ${lessons.length}개 강의)`);
  console.log("=== 모든 200강 R2 업로드 및 전처리 완료! ===");
}

main().catch((err) => {
  console.error("실행 중 오류 발생:", err);
  process.exit(1);
});
