#!/usr/bin/env node
/**
 * LECTURE voice — 길 2 with ElevenLabs text-to-speech: the corrected transcript read piece by piece in the chosen library
 * voice, each piece placed at the time the teacher started it and fitted to the time the teacher took. No original audio.
 *
 *   node scripts/lecture/voice/synth-elevenlabs.mjs --ids lh082 --voice-id <id> [--model eleven_multilingual_v2|eleven_v3]
 *        [--until <sec>] [--dry-run] [--force]
 *
 * Text: <id>/segments.edited.json when present (pieces with `text`; empty text = silent), else segments.json words.
 * Each piece: POST /v1/text-to-speech/{voice_id}?output_format=pcm_24000 {text, model_id, voice_settings} → wav →
 * fit.mjs to the piece's speech length (stretch recorded; check ③ fails outside 0.8–1.25; the 지시 asks 0.85–1.15 —
 * reported) → assemble → check. Output <id>/eleven-tts-<model>/ (…-sample when --until). Credits: 1 per character
 * (multilingual v2 · v3), measured before/after like convert-elevenlabs.mjs. Key: ELEVENLABS_API_KEY.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { ffmpeg, decode } from "./vad.mjs";
import { fitToLength, writeWav } from "./fit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const IDS = arg("--ids", "").split(",").filter(Boolean);
const VOICE_ID = arg("--voice-id");
const MODEL = arg("--model", "eleven_multilingual_v2");
const UNTIL = Number(arg("--until", 0)) || 0;
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const SR = 24000;

for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!IDS.length) throw new Error("--ids is required");
if (!DRY && !(KEY && VOICE_ID)) throw new Error("ELEVENLABS_API_KEY and --voice-id are required — or --dry-run");

/** Trim the silence ElevenLabs leaves at both ends of a piece (below −45 dBFS in 10 ms frames), keeping 30 ms. */
function trimSilence(wavIn, wavOut) {
  const s = decode(wavIn, { sr: SR });
  const hop = Math.round(SR / 100);
  const db = (i) => { let e = 0; for (let k = i; k < Math.min(s.length, i + hop); k++) e += s[k] * s[k]; return 10 * Math.log10(e / hop + 1e-12); };
  let a = 0, b = s.length;
  while (a + hop < s.length && db(a) < -45) a += hop;
  while (b - hop > a && db(b - hop) < -45) b -= hop;
  a = Math.max(0, a - 3 * hop);
  b = Math.min(s.length, b + 3 * hop);
  writeWav(wavOut, s.subarray(a, b), SR);
  return { trimmedSec: +((s.length - (b - a)) / SR).toFixed(3) };
}

async function tts(text, speed = 1.0, attempt = 1) {
  const body = { text, model_id: MODEL };
  // v3 takes no speed; multilingual v2 does (0.7–1.2) — used when a piece comes out much longer than the teacher's time
  if (MODEL !== "eleven_v3") body.voice_settings = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_24000`, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    return tts(text, speed, attempt + 1);
  }
  throw new Error(`ElevenLabs TTS ${res.status}: ${detail}`);
}
async function creditsUsed() {
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY } });
  return r.ok ? (await r.json()).character_count : null;
}

for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const edited = path.join(dir, "segments.edited.json");
  const seg = JSON.parse(fs.readFileSync(fs.existsSync(edited) ? edited : path.join(dir, "segments.json"), "utf8"));
  const pieces = seg.pieces.filter((p) => !UNTIL || p.speechStart < UNTIL).map((p) => ({ ...p, text: (p.text ?? (p.words || []).join(" ")).trim() }));
  const chars = pieces.reduce((n, p) => n + p.text.length, 0);
  console.log(`${id}: ${pieces.length} pieces · ${pieces.filter((p) => p.text).length} with text · ${chars} chars (${fs.existsSync(edited) ? "edited" : "raw"} transcript) · model ${MODEL}`);
  if (DRY) continue;
  const out = path.join(dir, `eleven-tts-${MODEL}${UNTIL ? "-sample" : ""}`);
  fs.mkdirSync(out, { recursive: true });
  const before = await creditsUsed();
  const parts = [], fitted = [];
  for (const [n, p] of pieces.entries()) {
    if (!p.text) continue;
    const want = p.speechEnd - p.speechStart;
    const pcm = path.join(out, `piece-${n}.pcm`), wav = path.join(out, `piece-${n}.wav`), trimWav = path.join(out, `piece-${n}.trim.wav`), fitWav = path.join(out, `piece-${n}.fit.wav`);
    const toWav = () => execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", pcm, wav]);
    if (!fs.existsSync(pcm) || FORCE) fs.writeFileSync(pcm, await tts(p.text));
    toWav();
    let trim = trimSilence(wav, trimWav);
    let speed = 1.0;
    // still much longer than the teacher's time: once more, faster (v2 only, up to 1.2×), then the rest by atempo
    let ratio = decode(trimWav, { sr: SR }).length / SR / want;
    if (MODEL !== "eleven_v3" && ratio > 1.15) {
      speed = Math.min(1.2, +ratio.toFixed(2));
      fs.writeFileSync(pcm, await tts(p.text, speed));
      toWav();
      trim = trimSilence(wav, trimWav);
    }
    const fit = fitToLength(trimWav, want, fitWav, { sr: SR });
    fitted.push({ piece: n, start: p.speechStart, end: p.speechEnd, chars: p.text.length, text: p.text, speed, ...trim, ...fit });
    parts.push({ start: p.speechStart, file: fitWav });
    console.log(`  piece ${n}: ${want.toFixed(2)} s wanted · got ${fit.inSec} s (trimmed ${trim.trimmedSec}, speed ${speed}) · stretch ${fit.stretch} (${fit.method}) · ${p.text.slice(0, 40)}`);
  }
  const after = await creditsUsed();
  const outside = fitted.filter((f) => f.stretch < 0.85 || f.stretch > 1.15);
  console.log(`  pieces ${fitted.length} · stretch outside 0.85–1.15: ${outside.length} (${outside.map((f) => `#${f.piece} ${f.stretch}`).join(", ")}) · credits ${before != null && after != null ? after - before : "?"}`);
  fs.writeFileSync(path.join(out, "parts.json"), JSON.stringify(parts, null, 1));
  fs.writeFileSync(path.join(out, "voice.segments.json"), JSON.stringify({ id, method: "elevenlabs-tts-fit", model: MODEL, voiceId: VOICE_ID, segments: fitted }, null, 1));
  if (UNTIL) {
    // a sample: the first --until seconds on the original timeline (assemble needs the full length; cut after)
    execFileSync("node", [path.join(import.meta.dirname, "assemble.mjs"), "--id", id, "--parts", path.join(out, "parts.json"), "--out", path.join(out, "voice-full.mp3")], { stdio: "inherit" });
    execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "mp3", "-i", path.join(out, "voice-full.mp3"), "-t", String(pieces.at(-1).end), "-c:a", "libmp3lame", "-b:a", "48k", path.join(out, "sample.mp3")]);
    console.log(`  sample → ${path.join(out, "sample.mp3")} (${pieces.at(-1).end} s)`);
    continue;
  }
  execFileSync("node", [path.join(import.meta.dirname, "assemble.mjs"), "--id", id, "--parts", path.join(out, "parts.json"), "--out", path.join(out, "voice.mp3")], { stdio: "inherit" });
  try {
    execFileSync("node", [path.join(import.meta.dirname, "check-voice.mjs"), "--id", id, "--new", path.join(out, "voice.mp3"), "--json", path.join(out, "check.json")], { stdio: "inherit" });
  } catch {
    console.log(`  ${id}: check FAIL — see ${path.join(out, "check.json")}`);
  }
}
