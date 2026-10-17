#!/usr/bin/env node
/**
 * LECTURE voice — step C: transcribe an original recording with Azure Speech FAST TRANSCRIPTION (word times).
 *
 *   node scripts/lecture/voice/transcribe-azure.mjs --ids lm001[,lm057] [--voice <folder>] [--force]
 *
 * Input  <voice>/<id>/orig.wav (16 kHz mono — extract-original.mjs --wav)
 * Output <voice>/<id>/azure-fast.json — the service's answer as is: phrases[] with words[] (offsetMilliseconds ·
 *        durationMilliseconds · text), per-phrase locale (ko-KR / en-US — the teacher mixes Korean explanation
 *        and English passage reading) and confidence. Paid content: stays in .lecture-media (git-ignored).
 *
 * Credentials: AZURE_SPEECH_KEY · AZURE_SPEECH_REGION from the environment or .env.local / KIG_ENV_LOCAL
 * (values never printed). Billing: per second of audio (Fast Transcription line of the Speech pricing page).
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
const VOICE = path.resolve(ROOT, arg("--voice", ".lecture-media/voice"));
const IDS = arg("--ids", "").split(",").filter(Boolean);
const FORCE = args.includes("--force");
const API_VERSION = "2024-11-15";

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
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) throw new Error("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required (.env.local or KIG_ENV_LOCAL)");
if (!IDS.length) throw new Error("--ids lm001[,lm057] is required");

export async function transcribe(wavFile) {
  const form = new FormData();
  form.append("audio", new Blob([fs.readFileSync(wavFile)], { type: "audio/wav" }), path.basename(wavFile));
  // Korean explanation with English reading: let the service pick the language per phrase
  form.append("definition", JSON.stringify({ locales: ["ko-KR", "en-US"], profanityFilterMode: "None" }));
  const res = await fetch(`https://${REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": KEY },
    body: form,
  });
  if (!res.ok) throw new Error(`Azure fast transcription ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

for (const id of IDS) {
  const wav = path.join(VOICE, id, "orig.wav");
  const out = path.join(VOICE, id, "azure-fast.json");
  if (!fs.existsSync(wav)) throw new Error(`${wav} missing — run extract-original.mjs --ids ${id} --wav`);
  if (fs.existsSync(out) && !FORCE) {
    console.log(`${id}: azure-fast.json exists (use --force to transcribe again)`);
    continue;
  }
  const t0 = Date.now();
  const result = await transcribe(wav);
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  const phrases = result.phrases || [];
  const words = phrases.reduce((n, p) => n + (p.words || []).length, 0);
  const byLocale = phrases.reduce((a, p) => ((a[p.locale] = (a[p.locale] || 0) + 1), a), {});
  console.log(`${id}: audio ${(result.durationMilliseconds / 1000).toFixed(1)} s · phrases ${phrases.length} ${JSON.stringify(byLocale)} · words ${words} · ${((Date.now() - t0) / 1000).toFixed(1)} s → ${out}`);
}
