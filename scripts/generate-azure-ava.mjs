#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS = path.join(ROOT, "content", "lessons");
const OUTPUT = path.join(ROOT, "public", "audio", "azure-ava", "v1");
const VOICE = "en-US-AvaMultilingualNeural";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
// 7단계 7-2: 무엇을 소리 내는지는 scripts/lib/spoken-texts.cjs 한 곳에서 — 무료 소리 키 · 감사 도구와 같은 정의.
// 전에는 여기서 강의 JSON 의 text · en · ko · english · korean · word · lemma · phrase · meaning · searchWord 를 모두 모아,
// 앱이 부르지 않는 READING · GRAMMAR 한국어와 VOCA 뜻의 클립까지 만들었다(6단계 끝 pending 1,610 중 약 893).
const { SPOKEN_COURSES, spokenTexts, pairIdOf } = createRequire(import.meta.url)(path.join(ROOT, "scripts", "lib", "spoken-texts.cjs"));

/**
 * 7단계 7-2: .env.local 을 scripts/upload-azure-ava-r2.mjs 의 loadEnvLocal 과 같게 읽는다 — 진짜 환경변수가 이기고, 값은 찍지 않는다.
 * 전에는 읽지 않아 `node --env-file=.env.local` 을 빠뜨리면 R2 목록을 못 보고 이 컴퓨터 파일만 기준으로 전부 다시 만들 뻔했다.
 * KIG_ENV_LOCAL 은 '자격 없음' 을 시험할 때 다른(없는) 파일을 가리키게 하는 것.
 */
function loadEnvLocal() {
  const file = process.env.KIG_ENV_LOCAL || path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const DRY_RUN = process.argv.includes("--dry-run");
const ALLOW_LOCAL_ONLY = process.argv.includes("--allow-local-only");
const BATCH = process.argv.includes("--batch");
const RESUME_BATCH_PREFIX = arg("--resume-batch-prefix");
const SAMPLE = arg("--sample");
const LIMIT = Math.max(0, Number(arg("--limit", 0)) || 0);
const CONCURRENCY = Math.max(1, Math.min(8, Number(arg("--concurrency", 3)) || 3));
const REGION = process.env.AZURE_SPEECH_REGION || "koreacentral";
const KEY = process.env.AZURE_SPEECH_KEY;

/** Keep this normalization in sync with src/lib/unifiedSpeech.ts. */
function normalizeText(text) {
  return text
    .replace(/\s*\/\s*/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/:{2,}/g, " ")
    .replace(/-{2,}/g, " ")
    .replace(/[…]+/g, " ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speechKey(text) {
  const clean = normalizeText(text);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  const hex = (value) => (value >>> 0).toString(16).padStart(8, "0");
  return `${clean.length.toString(36)}-${hex(first)}${hex(second)}`;
}

function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...jsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

function isSpeakable(text) {
  return /[A-Za-z\u3131-\u318e\u3400-\u9fff\uac00-\ud7a3]/u.test(text);
}

/**
 * Loads a TypeScript module from src/ so this script can call the very function
 * the component calls.
 *
 * Reproducing a component's string here instead is how clips go missing: the
 * VOCA collocation card speaks `getCollocation(...).phrase`, which lowercases
 * the word, while this script used to rebuild the template from the raw
 * dictionary key. "vital role of English" was generated and "vital role of
 * english" was played, so 26 cards had no clip.
 *
 * Only modules without imports can be transpiled alone; if one gains an import
 * this throws rather than silently collecting nothing.
 */
function loadTsModule(relativePath) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) return null;
  const req = createRequire(import.meta.url);
  const ts = req(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", js)(module, module.exports, req);
  return module.exports;
}

/**
 * The clip keys already in R2, or null when the bucket cannot be listed.
 *
 * `public/audio` is gitignored, so "is the file on disk?" answers a different
 * question in a fresh clone than on the machine that generated the corpus.
 * Asking the bucket is the answer that holds either way. Acting on the local
 * view alone would spend the month's character budget several times over, so
 * main() stops (7단계 7-2) unless this is a --dry-run or --allow-local-only.
 */
async function listUploadedKeys() {
  const keys = new Set();
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  const { S3Client, ListObjectsV2Command } = createRequire(import.meta.url)(
    path.join(ROOT, "node_modules", "@aws-sdk", "client-s3"),
  );
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = "audio/azure-ava/v1/";
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const object of page.Contents || []) {
      const name = object.Key.slice(prefix.length);
      if (name.endsWith(".mp3")) keys.add(name.slice(0, -4));
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** Texts per course — for the --dry-run breakdown. */
const COLLECTED_BY_COURSE = {};

function collectTexts() {
  if (SAMPLE) return [normalizeText(SAMPLE)].filter(Boolean);

  // The functions the views call — the VOCA collocation card (getCollocation), the
  // Listening sound clinic (generateLiaisonPoints, KIG-015) and the VOCA spoken
  // form of a bracketed headword (vocaSpeechForm, RE-005 — `colo(u)r` → "color").
  // Asking the app's own functions keeps the generated clip and the requested clip
  // keyed off the identical string.
  const fns = {
    vocaSpeechForm: loadTsModule("src/lib/vocaSpeech.ts")?.vocaSpeechForm,
    getCollocation: loadTsModule("src/lib/vocaUtils.ts")?.getCollocation,
    generateLiaisonPoints: loadTsModule("src/lib/listeningUtils.ts")?.generateLiaisonPoints,
    // the lesson page's top player (page.tsx → AudioPlayer) — its own function
    extractSentencesForAudio: loadTsModule("src/lib/lessonAudioText.ts")?.extractSentencesForAudio,
    // BUG-028: a STUDENT sentence "He/She …" is spoken in its first form
    firstSlashAlternative: loadTsModule("src/lib/listeningUtils.ts")?.firstSlashAlternative,
    // 7-6: a VOCA word button — a heteronym as `<word> ⟨<ipa>⟩` (its own clip name), else vocaSpeechForm
    vocaWordSpeech: loadTsModule("src/lib/vocaSpeech.ts")?.vocaWordSpeech,
  };
  for (const [name, fn] of Object.entries(fns)) {
    if (typeof fn !== "function") throw new Error(`${name} did not load — the clip list would be wrong`);
  }
  const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {});
  const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json"));
  const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json"));

  // What each page can speak — scripts/lib/spoken-texts.cjs, the one definition the
  // free-clip list and the audit tools use too. A page's pair is the one the site
  // pairs it with (src/lib/content.ts getLessonContext).
  // Only pages that have an address (src/lib/generated/validRoutes.json) — a file the site
  // cannot serve (ld/LD_001: its id fails getLesson's pattern, the page 404s) speaks nothing.
  const routes = readJson(path.join(ROOT, "src", "lib", "generated", "validRoutes.json")).lessons || {};
  const raw = new Set();
  for (const course of SPOKEN_COURSES) {
    const mine = (COLLECTED_BY_COURSE[course] = new Set());
    const routed = new Set(routes[course] || []);
    if (!routed.size) throw new Error(`validRoutes.json has no ${course} pages — run node scripts/buildValidRoutes.mjs`);
    const index = readJson(path.join(ROOT, "content", "courses", `${course}.json`)).lessons || [];
    const lessons = new Map(jsonFiles(path.join(LESSONS, course)).map((file) => [path.basename(file, ".json"), JSON.parse(fs.readFileSync(file, "utf8"))]));
    for (const [id, lesson] of lessons) {
      if (!routed.has(id)) continue;
      const pairId = pairIdOf(course, id, index);
      const pair = pairId ? { id: pairId, ...(lessons.get(pairId) || {}) } : null;
      for (const text of spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns })) {
        raw.add(text);
        mine.add(text);
      }
    }
  }

  const normalized = new Set();
  for (const value of raw) {
    const clean = normalizeText(fns.vocaSpeechForm(String(value)));
    if (clean && isSpeakable(clean)) normalized.add(clean);
  }
  for (const [course, set] of Object.entries(COLLECTED_BY_COURSE)) {
    COLLECTED_BY_COURSE[course] = new Set([...set].map((v) => normalizeText(fns.vocaSpeechForm(String(v)))).filter((c) => c && isSpeakable(c)));
  }
  return [...normalized].sort((a, b) => a.localeCompare(b, "en"));
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function languageOf(char) {
  if (/[\u3131-\u318e\uac00-\ud7a3]/u.test(char)) return "ko-KR";
  if (/[\u3400-\u9fff]/u.test(char)) return "zh-CN";
  if (/[A-Za-z]/u.test(char)) return "en-US";
  return null;
}

function languageRuns(text) {
  const runs = [];
  let language = null;
  let buffer = "";
  for (const char of text) {
    const next = languageOf(char);
    if (next && language && next !== language) {
      runs.push({ language, text: buffer });
      buffer = char;
      language = next;
    } else {
      buffer += char;
      if (next) language = next;
    }
  }
  if (buffer) runs.push({ language: language || "en-US", text: buffer });
  return runs;
}

// 7단계 7-6: a VOCA heteronym's clip is named `<word> ⟨<ipa>⟩` (src/lib/vocaSpeech.ts vocaWordSpeech) —
// say the word with that pronunciation. The same parser as the app, so the name and the sound agree.
const { pronunciationTag } = loadTsModule("src/lib/vocaSpeech.ts") || {};

function ssml(text) {
  const tag = typeof pronunciationTag === "function" ? pronunciationTag(text) : null;
  if (!tag && /⟨/.test(text)) throw new Error(`pronunciation tag not parsed — would read the IPA aloud: ${text}`);
  const body = tag
    ? `<lang xml:lang="en-US"><phoneme alphabet="ipa" ph="${escapeXml(tag[1])}">${escapeXml(tag[0])}</phoneme></lang>`
    : languageRuns(text)
      .map((run) => `<lang xml:lang="${run.language}">${escapeXml(run.text)}</lang>`)
      .join("");
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${VOICE}">${body}</voice></speak>`;
}

async function synthesize(text, destination, attempt = 1) {
  const response = await fetch(
    `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
        "User-Agent": "K-IG-CORE-Ava-Generator",
      },
      body: ssml(text),
    },
  );

  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** attempt));
      return synthesize(text, destination, attempt + 1);
    }
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Azure ${response.status}: ${detail}`);
  }

  const temporary = `${destination}.part`;
  fs.writeFileSync(temporary, Buffer.from(await response.arrayBuffer()));
  fs.renameSync(temporary, destination);
}

function batchEndpoint(jobId) {
  return `https://${REGION}.api.cognitive.microsoft.com/texttospeech/batchsyntheses/${jobId}?api-version=2024-04-01`;
}

function batchRequest(inputs) {
  return {
    description: "K-IG CORE unified Ava multilingual audio",
    inputKind: "SSML",
    inputs: inputs.map((text) => ({ content: ssml(text) })),
    properties: {
      outputFormat: OUTPUT_FORMAT,
      concatenateResult: false,
      decompressOutputFiles: false,
      wordBoundaryEnabled: false,
      sentenceBoundaryEnabled: false,
      timeToLiveInHours: 168,
    },
  };
}

function splitBatches(items) {
  const batches = [];
  let current = [];
  let bytes = 300;
  for (const item of items) {
    const inputBytes = Buffer.byteLength(JSON.stringify({ content: ssml(item.text) })) + 1;
    if (current.length >= 9000 || (current.length > 0 && bytes + inputBytes > 1_800_000)) {
      batches.push(current);
      current = [];
      bytes = 300;
    }
    current.push(item);
    bytes += inputBytes;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Ocp-Apim-Subscription-Key": KEY,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Azure batch ${response.status}: ${detail}`);
  }
  return response.json();
}

function walkFiles(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(full));
    else output.push(full);
  }
  return output;
}

function extractZip(zipFile, destination) {
  fs.mkdirSync(destination, { recursive: true });
  if (process.platform === "win32") {
    const tar = path.join(process.env.WINDIR || "C:\\Windows", "System32", "tar.exe");
    execFileSync(tar, ["-xf", zipFile, "-C", destination], { stdio: "pipe" });
  } else {
    execFileSync("unzip", ["-q", zipFile, "-d", destination], { stdio: "pipe" });
  }
}

async function runBatchGeneration(pending, resumePrefix = null) {
  const batches = splitBatches(pending);
  const stamp = Date.now().toString(36);
  const prefix = resumePrefix || `kig-ava-${stamp}`;
  const jobs = batches.map((items, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    items,
    status: "NotStarted",
  }));
  console.log(`batch jobs : ${jobs.length}`);

  if (resumePrefix) {
    for (const job of jobs) {
      const result = await requestJson(batchEndpoint(job.id));
      job.status = result.status;
      job.resultUrl = result.outputs?.result;
      job.properties = result.properties;
      console.log(`resumed    : ${job.id} (${job.status})`);
    }
  } else {
    for (const job of jobs) {
      const body = JSON.stringify(batchRequest(job.items.map((item) => item.text)));
      const result = await requestJson(batchEndpoint(job.id), { method: "PUT", body });
      job.status = result.status;
      console.log(`submitted  : ${job.id} (${job.items.length.toLocaleString("en-US")} items)`);
    }
  }

  const deadline = Date.now() + 90 * 60 * 1000;
  while (jobs.some((job) => !["Succeeded", "Failed"].includes(job.status))) {
    if (Date.now() > deadline) throw new Error("batch synthesis timed out after 90 minutes");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    for (const job of jobs) {
      if (["Succeeded", "Failed"].includes(job.status)) continue;
      const result = await requestJson(batchEndpoint(job.id));
      job.status = result.status;
      job.resultUrl = result.outputs?.result;
      job.properties = result.properties;
    }
    console.log(`status     : ${jobs.map((job) => `${job.id}=${job.status}`).join(", ")}`);
  }

  const failedJobs = jobs.filter((job) => job.status !== "Succeeded");
  if (failedJobs.length) {
    throw new Error(`${failedJobs.length} batch job(s) failed: ${failedJobs.map((job) => job.id).join(", ")}`);
  }

  const workRoot = path.join(OUTPUT, ".batch-work");
  fs.mkdirSync(workRoot, { recursive: true });
  let mapped = 0;
  for (const job of jobs) {
    if (!job.resultUrl) {
      const result = await requestJson(batchEndpoint(job.id));
      job.resultUrl = result.outputs?.result;
    }
    if (!job.resultUrl) throw new Error(`missing result URL for ${job.id}`);

    const jobDir = path.join(workRoot, job.id);
    const zipFile = path.join(workRoot, `${job.id}.zip`);
    const response = await fetch(job.resultUrl, {
      headers: { "Ocp-Apim-Subscription-Key": KEY },
    });
    if (!response.ok) throw new Error(`result download ${response.status} for ${job.id}`);
    fs.writeFileSync(zipFile, Buffer.from(await response.arrayBuffer()));
    extractZip(zipFile, jobDir);

    const audioFiles = walkFiles(jobDir)
      .filter((file) => /\.(mp3|wav)$/i.test(file))
      .sort((left, right) => {
        const a = Number(path.basename(left).match(/^(\d+)/)?.[1] || Number.MAX_SAFE_INTEGER);
        const b = Number(path.basename(right).match(/^(\d+)/)?.[1] || Number.MAX_SAFE_INTEGER);
        return a - b || left.localeCompare(right);
      });
    if (audioFiles.length !== job.items.length) {
      throw new Error(
        `${job.id} returned ${audioFiles.length} audio files for ${job.items.length} inputs`,
      );
    }

    for (let index = 0; index < job.items.length; index += 1) {
      const destination = job.items[index].file;
      fs.copyFileSync(audioFiles[index], destination);
      mapped += 1;
    }
    fs.rmSync(jobDir, { recursive: true, force: true });
    fs.rmSync(zipFile, { force: true });
    console.log(`downloaded : ${job.id} (${job.items.length.toLocaleString("en-US")} files)`);
  }
  fs.rmSync(workRoot, { recursive: true, force: true });
  console.log(`generated  : ${mapped.toLocaleString("en-US")} files via batch synthesis`);
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

async function main() {
  // 7단계 7-2: R2 를 먼저 본다 — 못 보면 --dry-run 은 첫 줄에 크게 적고 계속, 생성은 --allow-local-only 없이는 멈춤(Azure 를 부르기 전).
  let uploaded;
  let r2Problem = null;
  try {
    uploaded = await listUploadedKeys();
    if (!uploaded) r2Problem = "R2 자격(R2_ACCOUNT_ID · R2_BUCKET_NAME · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY)이 없음 — .env.local 에도";
  } catch (error) {
    r2Problem = `R2 목록을 읽지 못함 (${error instanceof Error ? error.name : "error"})`;
    uploaded = null;
  }
  if (!uploaded) {
    if (DRY_RUN) {
      console.log(`!!! ${r2Problem} — R2 를 못 봐서 아래 숫자는 이 컴퓨터 파일 기준이다(이미 R2 에 있는 클립도 pending 으로 셈) !!!`);
    } else if (!ALLOW_LOCAL_ONLY) {
      console.error(`멈춤: ${r2Problem}. public/audio 는 git 밖이라 이 컴퓨터 파일만 보고 만들면 이미 있는 클립을 다시 만들어 한 달 문자 한도를 몇 배 쓴다.`);
      console.error("      .env.local 에 R2 자격을 두거나, 이 컴퓨터 기준으로 만들려면 이름이 분명한 --allow-local-only 를 준다. Azure 는 부르지 않았다.");
      process.exit(1);
    } else {
      console.log(`--allow-local-only: ${r2Problem} — 이 컴퓨터 파일만 있는 것으로 보고 만든다`);
    }
    uploaded = new Set();
  }

  const discovered = collectTexts();
  const texts = LIMIT ? discovered.slice(0, LIMIT) : discovered;
  const characters = texts.reduce((sum, text) => sum + text.length, 0);
  const hashes = new Map();
  for (const text of texts) {
    const key = speechKey(text);
    const previous = hashes.get(key);
    if (previous && previous !== text) throw new Error(`speech hash collision: ${key}`);
    hashes.set(key, text);
  }

  console.log(`voice      : ${VOICE}`);
  console.log(`items      : ${texts.length.toLocaleString("en-US")}`);
  console.log(`characters : ${characters.toLocaleString("en-US")}`);
  console.log(`courses    : ${SPOKEN_COURSES.join(" · ")} (scripts/lib/spoken-texts.cjs — CNN · 폐지 과정 없음)`);
  if (uploaded.size) console.log(`in bucket  : ${uploaded.size.toLocaleString("en-US")}`);

  // A clip already in the bucket must not be synthesized again just because
  // this checkout does not have it on disk. public/audio is gitignored, so a
  // fresh clone starts with two files, and without this check a run there
  // would rebuild the whole corpus -- 1.26M characters against a 500,000
  // character monthly tier, and a needless re-upload of every object.
  const pending = texts
    .map((text) => ({ text, key: speechKey(text), file: path.join(OUTPUT, `${speechKey(text)}.mp3`) }))
    .filter((item) => !fs.existsSync(item.file) && !uploaded.has(item.key));
  const pendingCharacters = pending.reduce((sum, item) => sum + item.text.length, 0);
  console.log(`pending    : ${pending.length.toLocaleString("en-US")}`);
  // The free tier bills by character and caps at 500,000 a month, so what a run
  // would actually synthesize is the number that decides whether it fits.
  console.log(`  characters: ${pendingCharacters.toLocaleString("en-US")}`);
  if (DRY_RUN && !SAMPLE) {
    const pendingTexts = new Set(pending.map((item) => item.text));
    for (const [course, set] of Object.entries(COLLECTED_BY_COURSE)) {
      const mine = [...set].filter((t) => pendingTexts.has(t));
      console.log(`  ${course.padEnd(9)}: items ${set.size.toLocaleString("en-US")} · pending ${mine.length.toLocaleString("en-US")}`);
    }
  }

  if (DRY_RUN) return;
  if (!KEY) throw new Error("AZURE_SPEECH_KEY is required");
  if (pending.length === 0) return;
  fs.mkdirSync(OUTPUT, { recursive: true });

  if (BATCH) {
    await runBatchGeneration(pending, RESUME_BATCH_PREFIX);
    return;
  }

  let cursor = 0;
  let completed = 0;
  let bytes = 0;
  const failures = [];
  const started = Date.now();

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const item = pending[index];
      try {
        await synthesize(item.text, item.file);
        bytes += fs.statSync(item.file).size;
      } catch (error) {
        failures.push({ text: item.text, message: error instanceof Error ? error.message : String(error) });
      }
      completed += 1;
      if (completed % 25 === 0 || completed === pending.length) {
        const elapsed = Math.max(1, (Date.now() - started) / 1000);
        process.stdout.write(
          `\r${completed}/${pending.length} (${Math.round((completed / pending.length) * 100)}%) · ${human(bytes)} · ${(completed / elapsed).toFixed(1)} items/s`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  process.stdout.write("\n");
  if (failures.length) {
    console.error(`failed     : ${failures.length}`);
    for (const failure of failures.slice(0, 10)) {
      console.error(`- ${failure.text.slice(0, 80)}: ${failure.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`generated  : ${pending.length.toLocaleString("en-US")} files, ${human(bytes)}`);
  }
}

main().catch((error) => {
  console.error(`generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
