#!/usr/bin/env node
/**
 * LECTURE voice — 길 1a: the original recording, chunk by chunk, through ElevenLabs Voice Changer (speech-to-speech),
 * then back on the original timeline as one voice.mp3.
 *
 *   node scripts/lecture/voice/convert-elevenlabs.mjs --ids lm001[,…] --voice-id <id> [--model eleven_multilingual_sts_v2]
 *        [--no-noise-removal] [--until <sec>] [--dry-run] [--force]
 *
 *   --until  a SAMPLE: only the lecture's start up to the pause nearest below <sec> (one chunk), written to
 *            <id>/eleven-<voice-id>/ — for the owner to compare candidate voices before the full pilot.
 * Credits: the account's character_count is read before and after (/v1/user/subscription) and the difference
 * printed per lecture — the measured cost per minute of audio.
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
import { ffmpeg, decode, energyDb, speechMask } from "./vad.mjs";
import { fitToLength, writeWav } from "./fit.mjs";

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
const UNTIL = Number(arg("--until", 0)) || 0;
// --isolate: run each chunk through the Voice Isolator (POST /v1/audio-isolation, $0.12/min) BEFORE the voice change —
// a stronger clean-up than remove_background_noise alone (사장님 10-17 "소리가 지저분해"). Output folders get "-isolated".
const ISOLATE = args.includes("--isolate");
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

async function isolate(wavFile, attempt = 1) {
  const form = new FormData();
  form.append("audio", new Blob([fs.readFileSync(wavFile)], { type: "audio/wav" }), path.basename(wavFile));
  const res = await fetch("https://api.elevenlabs.io/v1/audio-isolation", { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  const text = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    return isolate(wavFile, attempt + 1);
  }
  throw new Error(`ElevenLabs audio-isolation ${res.status}: ${text}`);
}

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

/**
 * In the TEACHER's pauses (≥ 0.5 s between speech runs, 0.1 s guard each side) the changed voice is held down to the
 * recording's own level, frame by frame: the voice changer renders breaths and small room sounds as louder, voice-like
 * sounds (lm001 pilot: 42 frames above −40 dBFS in the original's 27 silences — check ④). Where the recording sat at
 * its noise floor the new voice is silent; where it had a small sound the new voice may be as loud as that, no louder.
 * A quiet word the speech mask missed keeps its original loudness — nothing is cut outright except true silence.
 */
function gateToOriginal(wavFile, chunkStart, speechRuns, origDb, origFloor) {
  const s = decode(wavFile, { sr: SR });
  const len = s.length / SR;
  const hop = Math.round(0.02 * SR); // the same 20 ms frames as origDb (16 kHz · 320) at this rate
  let ducked = 0, muted = 0, gaps = 0;
  const gain = new Float32Array(Math.ceil(s.length / hop)).fill(1);
  for (let i = -1; i < speechRuns.length; i++) {
    const from = i < 0 ? 0 : speechRuns[i][1] + 0.1;
    const to = Math.min(i + 1 < speechRuns.length ? speechRuns[i + 1][0] - 0.1 : Infinity, chunkStart + len);
    if (to - from < 0.3) continue;
    gaps++;
    // frame by frame: the new voice may never be louder here than the teacher's recording was (so a quiet word the
    // mask missed keeps its own loudness, while a breath the changer made louder comes down); where the teacher's
    // recording was at its noise floor (≤ floor + 3 dB) the new voice is silent
    for (let t = from; t < to; t += 0.02) {
      const fo = Math.round((t * SR16) / HOP16), fn = Math.round(((t - chunkStart) * SR) / hop);
      if (fo >= origDb.length || fn < 0 || fn >= gain.length) continue;
      const o = origDb[fo];
      if (o <= origFloor + 3) { gain[fn] = 0; muted += 0.02; continue; }
      let e = 0;
      const a0 = fn * hop, a1 = Math.min(s.length, a0 + hop);
      for (let k = a0; k < a1; k++) e += s[k] * s[k];
      const nDb = 10 * Math.log10(e / Math.max(1, a1 - a0) + 1e-12);
      if (nDb > o) { gain[fn] = Math.pow(10, (o - nDb) / 20); ducked += 0.02; }
    }
  }
  // apply with a linear ramp between frames so the gain never jumps
  for (let fn = 0; fn < gain.length; fn++) {
    const g0 = fn > 0 ? gain[fn - 1] : gain[fn], g1 = gain[fn];
    const a0 = fn * hop, a1 = Math.min(s.length, a0 + hop);
    for (let k = a0; k < a1; k++) s[k] *= g0 + ((g1 - g0) * (k - a0)) / hop;
  }
  writeWav(wavFile, s, SR);
  return { muted: +muted.toFixed(2), ducked: +ducked.toFixed(2), gaps, of: +len.toFixed(2) };
}
const SR16 = 16000, HOP16 = 320;

async function creditsUsed() {
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY } });
  if (!r.ok) return null;
  const j = await r.json();
  return j.character_count;
}

let totalMin = 0;
for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const seg = JSON.parse(fs.readFileSync(path.join(dir, "segments.json"), "utf8"));
  let chunks = seg.chunks;
  if (UNTIL) {
    // the start of the lecture up to the piece boundary (a pause) nearest below --until
    const cut = seg.pieces.filter((p) => p.start <= UNTIL).at(-1)?.start ?? UNTIL;
    chunks = [{ start: 0, end: cut }];
  }
  const out = path.join(dir, (UNTIL ? `eleven-${VOICE_ID || "sample"}` : "eleven") + (ISOLATE ? "-isolated" : ""));
  fs.mkdirSync(out, { recursive: true });
  const minutes = chunks.reduce((n, c) => n + (c.end - c.start), 0) / 60;
  totalMin += minutes;
  console.log(`${id}: ${chunks.length} chunks (${chunks.map((c) => (c.end - c.start).toFixed(0)).join("/")} s) · ${minutes.toFixed(1)} min · $${(minutes * PRICE_PER_MIN).toFixed(2)}`);
  if (DRY) continue;
  const before = await creditsUsed();
  const origDb = energyDb(decode(path.join(dir, "orig.mp3")));
  const origFloor = speechMask(origDb).floor;
  const parts = [], fitted = [];
  for (const [n, c] of chunks.entries()) {
    const inWav = path.join(out, `chunk-${n}.in.wav`), outPcm = path.join(out, `chunk-${n}.out.pcm`), fitWav = path.join(out, `chunk-${n}.fit.wav`);
    if (!fs.existsSync(outPcm) || FORCE) {
      execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "mp3", "-i", path.join(dir, "orig.mp3"), "-ss", String(c.start), "-to", String(c.end), "-ac", "1", "-ar", String(SR), inWav]);
      const t0 = Date.now();
      let sendWav = inWav;
      if (ISOLATE) {
        // the isolator answers with an audio file (mp3); decode it back to wav at the working rate for the voice change
        const isoFile = path.join(out, `chunk-${n}.isolated.mp3`), isoWav = path.join(out, `chunk-${n}.isolated.wav`);
        fs.writeFileSync(isoFile, await isolate(inWav));
        execFileSync(ffmpeg, ["-v", "error", "-y", "-i", isoFile, "-ac", "1", "-ar", String(SR), isoWav]);
        sendWav = isoWav;
        console.log(`  chunk ${n}: isolated (${(fs.statSync(isoFile).size / 1024).toFixed(0)} KB)`);
      }
      fs.writeFileSync(outPcm, await convert(sendWav));
      console.log(`  chunk ${n}: ${(c.end - c.start).toFixed(1)} s sent · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    // the answer is raw PCM 16-bit 24 kHz mono: wrap it so fit/decode can read it
    const pcm = fs.readFileSync(outPcm);
    const wav = path.join(out, `chunk-${n}.out.wav`);
    execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", outPcm, wav]);
    const fit = fitToLength(wav, c.end - c.start, fitWav, { sr: SR });
    const gate = gateToOriginal(fitWav, c.start, (seg.speech || []).filter(([a, b]) => b > c.start && a < c.end), origDb, origFloor);
    fitted.push({ chunk: n, start: c.start, end: c.end, ...fit, pausesMutedSec: gate.muted, pausesDuckedSec: gate.ducked, gaps: gate.gaps, bytes: pcm.length });
    parts.push({ start: c.start, file: fitWav });
    console.log(`  chunk ${n}: answer ${fit.inSec} s for ${(c.end - c.start).toFixed(3)} s · stretch ${fit.stretch} (${fit.method}) · pauses ${gate.gaps}: muted ${gate.muted} s · brought down ${gate.ducked} s`);
  }
  const after = await creditsUsed();
  const used = before != null && after != null ? after - before : null;
  console.log(`  credits used ${used ?? "?"} for ${minutes.toFixed(2)} min${used != null ? ` → ${(used / minutes).toFixed(0)} per minute` : ""}`);
  fs.writeFileSync(path.join(out, "parts.json"), JSON.stringify(parts, null, 1));
  fs.writeFileSync(path.join(out, "voice.segments.json"), JSON.stringify({ id, method: "elevenlabs-sts", model: MODEL, voiceId: VOICE_ID, noiseRemoval: NOISE_REMOVAL, creditsUsed: used, minutes: +minutes.toFixed(3), segments: fitted }, null, 1));
  if (UNTIL) {
    // a sample: just the converted minute as mp3 (loudness-matched), nothing assembled on the full timeline
    execFileSync(ffmpeg, ["-v", "error", "-y", "-i", parts[0].file, "-af", "loudnorm=I=-16:TP=-1:LRA=11", "-c:a", "libmp3lame", "-b:a", "48k", path.join(out, "sample.mp3")]);
    console.log(`  sample → ${path.join(out, "sample.mp3")}`);
    continue;
  }
  execFileSync("node", [path.join(import.meta.dirname, "assemble.mjs"), "--id", id, "--parts", path.join(out, "parts.json"), "--out", path.join(out, "voice.mp3")], { stdio: "inherit" });
  // the check's verdict is in check.json and on the console; a FAIL must not stop the next lecture's conversion
  try {
    execFileSync("node", [path.join(import.meta.dirname, "check-voice.mjs"), "--id", id, "--new", path.join(out, "voice.mp3"), "--json", path.join(out, "check.json")], { stdio: "inherit" });
  } catch {
    console.log(`  ${id}: check FAIL — see ${path.join(out, "check.json")}`);
  }
}
console.log(`total ${totalMin.toFixed(1)} min · $${(totalMin * PRICE_PER_MIN).toFixed(2)} at $${PRICE_PER_MIN}/min${DRY ? " (dry run — nothing sent)" : ""}`);
