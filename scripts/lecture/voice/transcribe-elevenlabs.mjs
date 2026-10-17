#!/usr/bin/env node
/**
 * LECTURE voice — step C with ElevenLabs Scribe (speech-to-text, word timestamps): a second, usually better, transcript
 * of a noisy recording than faster-whisper gave (lh082 2026-10-17: whisper lost 5 stretches and mis-heard Korean).
 *
 *   node scripts/lecture/voice/transcribe-elevenlabs.mjs --ids lh082[,…] [--model scribe_v1] [--force]
 *
 * Input <id>/orig.wav (16 kHz mono) → POST /v1/speech-to-text (multipart: file · model_id · timestamps_granularity=word ·
 * language auto) → <id>/scribe.json as answered: { language_code, text, words: [{ text, start, end, type }] }.
 * Cost: $0.22/h API (Starter: credits). Key: ELEVENLABS_API_KEY. Paid content: stays in .lecture-media.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const IDS = arg("--ids", "").split(",").filter(Boolean);
const MODEL = arg("--model", "scribe_v1");
const FORCE = args.includes("--force");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY is required");
if (!IDS.length) throw new Error("--ids is required");

// --ids all: every lecture that has a clean original (extract-original.mjs); --concurrency N (default 4)
const all = IDS[0] === "all" ? fs.readdirSync(VOICE).filter((d) => /^l[mh]\d{3}$/.test(d) && fs.existsSync(path.join(VOICE, d, "orig.mp3"))).sort() : IDS;
const CONCURRENCY = Math.max(1, Number(arg("--concurrency", 4)) || 4);

async function one(id) {
  // the clean mp3 (markers removed) is enough — no 16 kHz wav needed for 200 lectures
  const wav = path.join(VOICE, id, "orig.wav"), mp3 = path.join(VOICE, id, "orig.mp3"), out = path.join(VOICE, id, "scribe.json");
  if (fs.existsSync(out) && !FORCE) return `${id}: exists`;
  const src = fs.existsSync(wav) ? { file: wav, type: "audio/wav", name: "orig.wav" } : { file: mp3, type: "audio/mpeg", name: "orig.mp3" };
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(src.file)], { type: src.type }), src.name);
  form.append("model_id", MODEL);
  form.append("timestamps_granularity", "word");
  form.append("diarize", "false");
  const t0 = Date.now();
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": KEY }, body: form });
    if (res.ok) {
      const j = await res.json();
      fs.writeFileSync(out, JSON.stringify(j, null, 1));
      const words = (j.words || []).filter((w) => w.type === "word");
      return `${id}: ${j.language_code} · words ${words.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`;
    }
    const detail = (await res.text()).slice(0, 200);
    if ((res.status === 429 || res.status >= 500) && attempt < 6) { await new Promise((r) => setTimeout(r, 5000 * attempt)); continue; }
    throw new Error(`${id}: Scribe ${res.status}: ${detail}`);
  }
}

let next = 0, done = 0;
const failed = [];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, all.length) }, async () => {
  for (;;) {
    const id = all[next++];
    if (!id) return;
    try { console.log(await one(id)); } catch (e) { failed.push(e.message); console.log(`FAIL ${e.message}`); }
    done++;
    if (done % 20 === 0) console.log(`— ${done}/${all.length}`);
  }
}));
console.log(`done ${done} · failed ${failed.length}`);
if (failed.length) process.exitCode = 1;
