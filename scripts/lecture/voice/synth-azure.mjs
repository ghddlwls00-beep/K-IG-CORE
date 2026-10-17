#!/usr/bin/env node
/**
 * LECTURE voice — 길 2: synthesise the transcript piece by piece with Azure Speech, each piece made to the length the
 * teacher took, placed at the time the teacher started it; then one voice.mp3 on the original timeline.
 *
 *   node scripts/lecture/voice/synth-azure.mjs --ids lm001[,…] [--voice ko-KR-HyunsuMultilingualNeural] [--until <sec>] [--dry-run] [--force]
 *
 *   --until  only the pieces that start before this second (a voice SAMPLE for the owner to compare: the lecture's first
 *            minute in each candidate voice). Output then goes to <id>/azure-<voice>/ with that many pieces.
 *
 * Text: .lecture-media/voice/<id>/segments.edited.json when it exists (step E — the corrected transcript, same shape as
 * segments.json `pieces` with `text`), else segments.json pieces' words joined (raw transcript). A piece with no text
 * stays silent. SSML per piece: <voice name=…><mstts:audioduration value="<speech length>ms"/>text</voice> — the
 * service fits 0.5–2× (clamps beyond; 300 s max) — then fit.mjs trims/pads to the exact sample count and records the
 * stretch (check-voice ③ fails any outside 0.8–1.25). Output format riff-24khz-16bit-mono-pcm.
 * Files: <id>/azure/piece-N.wav · fit.wav · parts.json · voice.segments.json · voice.mp3 (+ check.json).
 *
 * --dry-run: characters and the cost at $15 per 1M characters (standard Neural, pricing page 2026-10-17); no request.
 * Key: AZURE_SPEECH_KEY · AZURE_SPEECH_REGION (.env.local / KIG_ENV_LOCAL) — never printed.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fitToLength } from "./fit.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const IDS = arg("--ids", "").split(",").filter(Boolean);
const VOICE_NAME = arg("--voice", "ko-KR-HyunsuMultilingualNeural");
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const UNTIL = Number(arg("--until", 0)) || 0;
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const SR = 24000;
const PRICE_PER_MCHAR = 15;

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
const KEY = process.env.AZURE_SPEECH_KEY, REGION = process.env.AZURE_SPEECH_REGION;
if (!IDS.length) throw new Error("--ids lm001[,…] is required");
if (!DRY && !(KEY && REGION)) throw new Error("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required — or --dry-run");

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ssml = (text, ms) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="ko-KR"><voice name="${VOICE_NAME}"><mstts:audioduration value="${Math.round(ms)}ms"/>${escapeXml(text)}</voice></speak>`;

async function synthesize(text, ms, attempt = 1) {
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "K-IG-CORE-Lecture-Voice" },
    body: ssml(text, ms),
  });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return synthesize(text, ms, attempt + 1);
  }
  throw new Error(`Azure ${res.status}: ${detail}`);
}

let totalChars = 0;
for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const edited = path.join(dir, "segments.edited.json");
  const seg = JSON.parse(fs.readFileSync(fs.existsSync(edited) ? edited : path.join(dir, "segments.json"), "utf8"));
  const pieces = seg.pieces.filter((p) => !UNTIL || p.speechStart < UNTIL).map((p) => ({ ...p, text: (p.text ?? (p.words || []).join(" ")).trim() }));
  const chars = pieces.reduce((n, p) => n + p.text.length, 0);
  totalChars += chars;
  console.log(`${id}: ${pieces.length} pieces · ${pieces.filter((p) => p.text).length} with text · ${chars} chars · $${((chars / 1e6) * PRICE_PER_MCHAR).toFixed(3)}${fs.existsSync(edited) ? " (edited transcript)" : " (raw transcript)"}`);
  if (DRY) continue;
  const out = path.join(dir, UNTIL ? `azure-${VOICE_NAME.replace(/^ko-KR-/, "")}` : "azure");
  fs.mkdirSync(out, { recursive: true });
  const parts = [], fitted = [];
  for (const [n, p] of pieces.entries()) {
    if (!p.text) continue;
    const want = p.speechEnd - p.speechStart;
    const wav = path.join(out, `piece-${n}.wav`), fitWav = path.join(out, `piece-${n}.fit.wav`);
    if (!fs.existsSync(wav) || FORCE) fs.writeFileSync(wav, await synthesize(p.text, want * 1000));
    const fit = fitToLength(wav, want, fitWav, { sr: SR });
    fitted.push({ piece: n, start: p.speechStart, end: p.speechEnd, chars: p.text.length, ...fit });
    parts.push({ start: p.speechStart, file: fitWav });
  }
  fs.writeFileSync(path.join(out, "parts.json"), JSON.stringify(parts, null, 1));
  fs.writeFileSync(path.join(out, "voice.segments.json"), JSON.stringify({ id, method: "azure-tts-fit", voice: VOICE_NAME, segments: fitted }, null, 1));
  const outside = fitted.filter((f) => f.stretch < 0.8 || f.stretch > 1.25).length;
  console.log(`  pieces made ${fitted.length} · stretch outside 0.8–1.25: ${outside}`);
  execFileSync("node", [path.join(import.meta.dirname, "assemble.mjs"), "--id", id, "--parts", path.join(out, "parts.json"), "--out", path.join(out, "voice.mp3")], { stdio: "inherit" });
  execFileSync("node", [path.join(import.meta.dirname, "check-voice.mjs"), "--id", id, "--new", path.join(out, "voice.mp3"), "--json", path.join(out, "check.json")], { stdio: "inherit" });
}
console.log(`total ${totalChars} chars · $${((totalChars / 1e6) * PRICE_PER_MCHAR).toFixed(3)}${DRY ? " (dry run — nothing sent)" : ""}`);
