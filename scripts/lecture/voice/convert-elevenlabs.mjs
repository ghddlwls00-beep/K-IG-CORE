#!/usr/bin/env node
/**
 * LECTURE voice — 길 1a: the original recording, chunk by chunk, through ElevenLabs Voice Changer (speech-to-speech),
 * then back on the original timeline as one voice.mp3.
 *
 *   node scripts/lecture/voice/convert-elevenlabs.mjs --ids lm001[,…] --voice-id <id> [--model eleven_multilingual_sts_v2]
 *        [--no-noise-removal] [--dry-run] [--force]
 *
 * Per lecture: segments.json `chunks` (≤ 280 s each, cut in pauses — segments.mjs) → each chunk cut from orig.mp3 as
 * 24 kHz mono wav → POST /v1/speech-to-speech/{voice_id}?output_format=pcm_24000 (multipart: audio · model_id ·
 * remove_background_noise) → the answer fitted to the chunk's exact length (fit.mjs: ≤ 40 ms → pad/trim, else atempo)
 * → assemble.mjs → voice.mp3 → check-voice.mjs. Files: .lecture-media/voice/<id>/eleven/chunk-N.{in.wav,out.pcm,fit.wav},
 * parts.json, voice.segments.json (stretch per chunk, read by check ③), voice.mp3 (NOT yet in audio/lecture/ — copy
 * there only after the checks and the owner's listening).
 *
 * --dry-run: prints the chunks, minutes and the cost at $0.12/min (API price page, 2026-10-17) and makes no request.
 * Key: ELEVENLABS_API_KEY from the environment or .env.local / KIG_ENV_LOCAL — never printed. Billed per minute of
 * audio sent (1,000 credits/min on plans). Nothing here uploads the original anywhere but this API call.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { ffmpeg } from "./vad.mjs";
import { fitToLength } from "./fit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const IDS = arg("--ids", "").split(",").filter(Boolean);
const VOICE_ID = arg("--voice-id");
const MODEL = arg("--model", "eleven_multilingual_sts_v2");
const NOISE_REMOVAL = !args.includes("--no-noise-removal");
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const SR = 24000;
const PRICE_PER_MIN = 0.12;

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
const KEY = process.env.ELEVENLABS_API_KEY;
if (!IDS.length) throw new Error("--ids lm001[,…] is required");
if (!DRY && !KEY) throw new Error("ELEVENLABS_API_KEY is required (.env.local or KIG_ENV_LOCAL) — or --dry-run");
if (!DRY && !VOICE_ID) throw new Error("--voice-id <ElevenLabs voice id> is required");

async function convert(wavFile, attempt = 1) {
  const form = new FormData();
  form.append("audio", new Blob([fs.readFileSync(wavFile)], { type: "audio/wav" }), path.basename(wavFile));
  form.append("model_id", MODEL);
  form.append("remove_background_noise", String(NOISE_REMOVAL));
  const res = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${VOICE_ID}?output_format=pcm_24000`, { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  const text = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    return convert(wavFile, attempt + 1);
  }
  throw new Error(`ElevenLabs ${res.status}: ${text}`);
}

let totalMin = 0;
for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const seg = JSON.parse(fs.readFileSync(path.join(dir, "segments.json"), "utf8"));
  const out = path.join(dir, "eleven");
  fs.mkdirSync(out, { recursive: true });
  const minutes = seg.totalSec / 60;
  totalMin += minutes;
  console.log(`${id}: ${seg.chunks.length} chunks (${seg.chunks.map((c) => (c.end - c.start).toFixed(0)).join("/")} s) · ${minutes.toFixed(1)} min · $${(minutes * PRICE_PER_MIN).toFixed(2)}`);
  if (DRY) continue;
  const parts = [], fitted = [];
  for (const [n, c] of seg.chunks.entries()) {
    const inWav = path.join(out, `chunk-${n}.in.wav`), outPcm = path.join(out, `chunk-${n}.out.pcm`), fitWav = path.join(out, `chunk-${n}.fit.wav`);
    if (!fs.existsSync(outPcm) || FORCE) {
      execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "mp3", "-i", path.join(dir, "orig.mp3"), "-ss", String(c.start), "-to", String(c.end), "-ac", "1", "-ar", String(SR), inWav]);
      const t0 = Date.now();
      fs.writeFileSync(outPcm, await convert(inWav));
      console.log(`  chunk ${n}: ${(c.end - c.start).toFixed(1)} s sent · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    // the answer is raw PCM 16-bit 24 kHz mono: wrap it so fit/decode can read it
    const pcm = fs.readFileSync(outPcm);
    const wav = path.join(out, `chunk-${n}.out.wav`);
    execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", outPcm, wav]);
    const fit = fitToLength(wav, c.end - c.start, fitWav, { sr: SR });
    fitted.push({ chunk: n, start: c.start, end: c.end, ...fit, bytes: pcm.length });
    parts.push({ start: c.start, file: fitWav });
    console.log(`  chunk ${n}: answer ${fit.inSec} s for ${(c.end - c.start).toFixed(3)} s · stretch ${fit.stretch} (${fit.method})`);
  }
  fs.writeFileSync(path.join(out, "parts.json"), JSON.stringify(parts, null, 1));
  fs.writeFileSync(path.join(out, "voice.segments.json"), JSON.stringify({ id, method: "elevenlabs-sts", model: MODEL, voiceId: VOICE_ID, noiseRemoval: NOISE_REMOVAL, segments: fitted }, null, 1));
  execFileSync("node", [path.join(import.meta.dirname, "assemble.mjs"), "--id", id, "--parts", path.join(out, "parts.json"), "--out", path.join(out, "voice.mp3")], { stdio: "inherit" });
  execFileSync("node", [path.join(import.meta.dirname, "check-voice.mjs"), "--id", id, "--new", path.join(out, "voice.mp3"), "--json", path.join(out, "check.json")], { stdio: "inherit" });
}
console.log(`total ${totalMin.toFixed(1)} min · $${(totalMin * PRICE_PER_MIN).toFixed(2)} at $${PRICE_PER_MIN}/min${DRY ? " (dry run — nothing sent)" : ""}`);
