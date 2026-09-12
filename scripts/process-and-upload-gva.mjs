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
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

async function uploadToR2(objectKey, body, contentType, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const signed = signingHeaders("PUT", objectKey, body, contentType);
      const res = await fetch(signed.url, { method: "PUT", headers: signed.headers, body });
      if (res.ok) return true;
      if (attempt === retries) {
        throw new Error(`Upload failed ${res.status}: ${await res.text()}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
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

// Extract audio buffer from GDB
function extractAudioBuffer(buf) {
  // Find audio end from table
  const str = buf.toString("latin1");
  const audioIdx = str.indexOf(".audio");
  if (audioIdx === -1) return null;

  // Read end offset from table
  const nullIdx = buf.indexOf(0, audioIdx);
  const meta = buf.slice(nullIdx + 1, nullIdx + 17);
  const audioEnd = meta.readUInt32LE(3);

  // Audio start is after Page99.htm
  const page99Idx = str.indexOf("Page99.htm");
  if (page99Idx === -1) return null;
  const p99Null = buf.indexOf(0, page99Idx);
  const audioStartCandidate = buf.slice(p99Null + 1, p99Null + 17).readUInt32LE(3);

  // Scan for first MP3 sync word (0xFF 0x(E0..FF))
  let mp3Start = -1;
  for (let i = audioStartCandidate; i < Math.min(audioStartCandidate + 15000, buf.length - 4); i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      mp3Start = i;
      break;
    }
  }

  if (mp3Start === -1 || audioEnd <= mp3Start) return null;
  return buf.slice(mp3Start, audioEnd);
}

// Extract slide JPEG buffers from GDB (100 slides)
function extractSlides(buf) {
  let firstJpg = -1;
  for (let i = 280; i < 15000; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
      firstJpg = i;
      break;
    }
  }
  if (firstJpg === -1) throw new Error("Could not find first JPG in GDB");

  let p = 280;
  let lastOff = firstJpg;
  const slides = [];
  while (p < firstJpg) {
    const nullIdx = buf.indexOf(0, p);
    if (nullIdx === -1 || nullIdx >= firstJpg) break;
    const name = new TextDecoder("euc-kr").decode(buf.slice(p, nullIdx));
    const meta = buf.slice(nullIdx + 1, nullIdx + 17);
    const endOffset = meta.readUInt32LE(3);
    if (name.toLowerCase().endsWith(".jpg")) {
      const imgBuf = buf.slice(lastOff, endOffset);
      slides.push(imgBuf);
    }
    lastOff = endOffset;
    p = nullIdx + 17;
  }
  return slides;
}

// Estimate MP3 duration in seconds
function calculateMp3Duration(buf) {
  const bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  const sampleRates = [22050, 24000, 16000];

  let pos = 0;
  let duration = 0;

  while (pos < buf.length - 4) {
    if (buf[pos] === 0xff && (buf[pos + 1] & 0xe0) === 0xe0) {
      const h = buf.readUInt32BE(pos);
      const mpegVer = (h >> 19) & 3;
      const layer = (h >> 17) & 3;
      const bitrateIdx = (h >> 12) & 0xf;
      const sampleRateIdx = (h >> 10) & 3;
      const padding = (h >> 9) & 1;

      const br = bitrates[bitrateIdx] * 1000;
      const sr = sampleRates[sampleRateIdx];

      if (br > 0 && sr > 0) {
        const frameLen = Math.floor((72 * br) / sr) + padding;
        duration += 576 / sr;
        pos += frameLen;
        continue;
      }
    }
    pos++;
  }
  return Math.round(duration);
}

async function main() {
  console.log("=== K-IG GVA 200강 R2 자동 업로드 & 메타데이터 파이프라인 시작 ===");

  const gdbMap = getGdbFiles();
  console.log(`발견된 GDB 강의 파일: ${gdbMap.size}개`);
  if (gdbMap.size !== 200) {
    console.warn(`경고: 200개 중 ${gdbMap.size}개만 발견되었습니다.`);
  }

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
    await uploadToR2(key, slideBuf, "image/jpeg");
    if (num % 25 === 0 || num === 200) {
      console.log(`슬라이드 업로드 진행: ${num}/200 완료`);
    }
  }
  console.log("✓ 슬라이드 200장 R2 업로드 100% 완료!");

  // Extract and upload audio for each lecture
  console.log("\n[3단계] 1~200강 육성 오디오 추출 및 R2 업로드 시작 (200개 파일)...");
  const lessons = [];

  const CONCURRENCY = 6;
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
      const audioBuf = extractAudioBuffer(fileBuf);
      if (!audioBuf) {
        console.error(`오류: ${num}강 오디오 추출 실패`);
        continue;
      }

      const duration = calculateMp3Duration(audioBuf);
      const audioKey = `gva/audio/gva-${String(num).padStart(3, "0")}.mp3`;
      const slideKey = `gva/slides/gva-${String(num).padStart(3, "0")}.jpg`;

      await uploadToR2(audioKey, audioBuf, "audio/mpeg");

      lessons.push({
        id: `gva-${String(num).padStart(3, "0")}`,
        number: num,
        level: num <= 100 ? "middle" : "high",
        levelLabel: num <= 100 ? "중등 독해" : "고등 독해",
        title: num <= 100 ? `중등 영어독해 ${num}강` : `고등 영어독해 ${num}강`,
        passageNumber: num <= 100 ? num : num - 100,
        instructor: "강광진",
        audioKey,
        slideKey,
        audioUrl: `https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev/${audioKey}`,
        slideUrl: `https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev/${slideKey}`,
        durationSeconds: duration,
        durationFormatted: `${Math.floor(duration / 60)}분 ${duration % 60}초`,
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
