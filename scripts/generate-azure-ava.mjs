#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS = path.join(ROOT, "content", "lessons");
const OUTPUT = path.join(ROOT, "public", "audio", "azure-ava", "v1");
const VOICE = "en-US-AvaMultilingualNeural";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const SPEECH_KEYS = new Set([
  "text",
  "en",
  "ko",
  "english",
  "korean",
  "word",
  "lemma",
  "phrase",
  "meaning",
  "searchWord",
  "hanzi",
]);

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const DRY_RUN = process.argv.includes("--dry-run");
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

function collectValue(value, key, output, inWordGrid = false) {
  if (typeof value === "string") {
    if (SPEECH_KEYS.has(key) || inWordGrid) {
      output.add(value);
      if (value.includes("\n")) {
        for (const line of value.split(/\r?\n/)) output.add(line);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectValue(item, key, output, inWordGrid);
    return;
  }
  if (!value || typeof value !== "object") return;

  const wordGrid = inWordGrid || value.type === "wordgrid";
  for (const [childKey, childValue] of Object.entries(value)) {
    collectValue(childValue, childKey, output, wordGrid && childKey === "rows");
  }
}

function collectTexts() {
  if (SAMPLE) return [normalizeText(SAMPLE)].filter(Boolean);

  const raw = new Set();
  for (const file of jsonFiles(LESSONS)) {
    if (file.split(path.sep).some((part) => part.toLowerCase() === "cnn")) continue;
    collectValue(JSON.parse(fs.readFileSync(file, "utf8")), "", raw);
  }

  // Listening & Dictate renders its authentic English script from this
  // supplemental file rather than from content/lessons, so it must be part
  // of the same unified Ava inventory.
  const ldScriptsFile = path.join(ROOT, "content", "ld_english_scripts.json");
  if (fs.existsSync(ldScriptsFile)) {
    collectValue(JSON.parse(fs.readFileSync(ldScriptsFile, "utf8")), "", raw);
  }

  const dictionaryFile = path.join(ROOT, "content", "voca_dictionary.json");
  if (fs.existsSync(dictionaryFile)) {
    const dictionary = JSON.parse(fs.readFileSync(dictionaryFile, "utf8"));
    collectValue(dictionary, "", raw);
    for (const [word, entry] of Object.entries(dictionary)) {
      const spokenWord = entry?.searchWord || word;
      raw.add(spokenWord);
      raw.add(`vital role of ${spokenWord}`);
    }
  }

  const vocaUtils = path.join(ROOT, "src", "lib", "vocaUtils.ts");
  if (fs.existsSync(vocaUtils)) {
    const source = fs.readFileSync(vocaUtils, "utf8");
    for (const match of source.matchAll(/\bphrase:\s*"([^"]+)"/g)) raw.add(match[1]);
  }

  const normalized = new Set();
  for (const value of raw) {
    const clean = normalizeText(String(value));
    if (clean && isSpeakable(clean)) normalized.add(clean);
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

function ssml(text) {
  const body = languageRuns(text)
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
  console.log("CNN        : excluded");
  if (DRY_RUN) return;
  if (!KEY) throw new Error("AZURE_SPEECH_KEY is required");

  fs.mkdirSync(OUTPUT, { recursive: true });
  const pending = texts
    .map((text) => ({ text, file: path.join(OUTPUT, `${speechKey(text)}.mp3`) }))
    .filter((item) => !fs.existsSync(item.file));
  console.log(`pending    : ${pending.length.toLocaleString("en-US")}`);
  if (pending.length === 0) return;

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
