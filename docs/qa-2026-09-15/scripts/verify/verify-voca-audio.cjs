#!/usr/bin/env node
/**
 * Does every word on the VOCA screen have its own Ava clip in the bucket?
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-voca-audio.cjs
 *
 * Needs R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
 * It checks R2, not public/audio, because R2 is what the site actually serves —
 * a clip sitting on this machine and missing from the bucket plays as the
 * browser's own voice, which is the failure this is looking for.
 *
 * WHAT THE VOCA SCREEN SPEAKS. PhonicsLearningView has exactly three play
 * paths and all three pass English:
 *
 *   line 141  speakText(word)                      — tapping one word
 *   line 181  speakText(w)                         — playing a row
 *   line 594  speakText(selectedCollocation.phrase) — the collocation card
 *
 * The Korean meaning is rendered as text and never spoken here, so it is not
 * part of this check. The words come from the lesson's `wordgrid` block, the
 * same `rows.flat().map(trim).filter(Boolean)` the component uses — NOT from
 * the dictionary's key list, because the two are not the same set.
 *
 * The collocation phrase is taken from the component's own getCollocation
 * rather than rebuilt here. Rebuilding it is how 26 cards went silent once:
 * the function lowercases the word, so "vital role of English" was generated
 * while "vital role of english" was played.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../../..");
const PHONICS = path.join(ROOT, "content/lessons/phonics");
const PREFIX = "audio/azure-ava/v1/";

/* ------------------------------------- the key the browser will ask for --- */
// Kept in step with src/lib/unifiedSpeech.ts.
function normalize(text) {
  return String(text)
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
  const clean = normalize(text);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  const hex = (v) => (v >>> 0).toString(16).padStart(8, "0");
  return `${clean.length.toString(36)}-${hex(first)}${hex(second)}`;
}

/* ------------------------------------------- the component's own module --- */
function loadTs(relative) {
  const ts = require(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, require);
  return mod.exports;
}

/* ----------------------------------------------- what VOCA actually says --- */
const dictionary = JSON.parse(fs.readFileSync(path.join(ROOT, "content/voca_dictionary.json"), "utf8"));
const { getCollocation } = loadTs("src/lib/vocaUtils.ts");
if (typeof getCollocation !== "function") throw new Error("getCollocation not found");

/** text -> why it is spoken, so a miss can be named. */
const spoken = new Map();
const add = (text, source) => {
  const clean = normalize(text);
  if (clean && !spoken.has(clean)) spoken.set(clean, source);
};

let lessons = 0;
let wordCells = 0;
for (const file of fs.readdirSync(PHONICS).sort()) {
  if (!file.endsWith(".json")) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(PHONICS, file), "utf8"));
  const grid = (lesson.blocks || []).find((b) => b.type === "wordgrid");
  if (!grid) continue;
  lessons += 1;
  for (const word of (grid.rows || []).flat().map((w) => String(w ?? "").trim()).filter(Boolean)) {
    wordCells += 1;
    add(word, `${file.replace(".json", "")} 단어`);
    // The collocation card keys off the selected word, via the dictionary's
    // searchWord when it has one.
    const entry = dictionary[word] || dictionary[word.toLowerCase().trim()];
    const collocation = getCollocation(word, entry?.searchWord);
    if (collocation?.phrase) add(collocation.phrase, `${word} 연어`);
  }
}

/* ------------------------------------------------------ what R2 holds --- */
async function bucketKeys() {
  const need = ["R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
  const missing = need.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.error(`R2 열쇠가 없습니다: ${missing.join(", ")}`);
    console.error("버킷을 못 보면 '다 있다'고 말할 수 없으므로 중단합니다.");
    process.exit(1);
  }
  const { S3Client, ListObjectsV2Command } = require(
    path.join(ROOT, "node_modules", "@aws-sdk", "client-s3"),
  );
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    },
  });
  const keys = new Set();
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME.trim(),
        Prefix: PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const object of page.Contents || []) {
      if (object.Key.endsWith(".mp3")) keys.add(object.Key.slice(PREFIX.length, -4));
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

(async () => {
  const inBucket = await bucketKeys();
  const missing = [];
  for (const [text, source] of spoken) {
    if (!inBucket.has(speechKey(text))) missing.push({ text, source });
  }

  console.log(`VOCA 강의            : ${lessons}`);
  console.log(`단어 칸              : ${wordCells.toLocaleString("en-US")}`);
  console.log(`실제로 소리 내는 문구 : ${spoken.size.toLocaleString("en-US")} (중복 제거)`);
  console.log(`버킷의 Ava 클립      : ${inBucket.size.toLocaleString("en-US")}`);
  console.log("");
  if (missing.length === 0) {
    console.log("✅ VOCA 에서 소리 내는 문구 전부 버킷에 클립이 있습니다. 빠진 것 0개.");
    return;
  }
  console.log(`🔴 클립이 없는 문구 ${missing.length}개 — 이 단어들은 브라우저 기본 목소리로 납니다.`);
  for (const m of missing.slice(0, 40)) {
    console.log(`  ${m.source.padEnd(24)} "${m.text}"   key=${speechKey(m.text)}`);
  }
  if (missing.length > 40) console.log(`  … 그 외 ${missing.length - 40}개`);
  process.exitCode = 1;
})();
