#!/usr/bin/env node
/**
 * LECTURE voice — 길 2-N (사장님 2026-10-17 "너 제안대로 해보자"): the corrected transcript is READ AT A NATURAL PACE in the
 * chosen voice, and the teacher's PEN is moved onto the new voice's timeline — not the other way round. The lecture's
 * length becomes whatever the reading takes; what must hold is that each stroke is drawn while the matching words
 * are said.
 *
 *   node scripts/lecture/voice/read-and-retime.mjs --ids lh082 --voice-id <id> [--model eleven_multilingual_v2]
 *        [--until <sec>] [--force] [--dry-run]
 *
 * Per lecture:
 *   1. pieces (segments.edited.json — text, wordsT = whisper word times) → ElevenLabs TTS with character timestamps
 *      (/text-to-speech/{voice}/with-timestamps, pcm 24 kHz); lead/trail silence trimmed to 0.1 s; cached per piece.
 *   2. new timeline: piece k starts where piece k−1's reading ended plus the teacher's own pause before it (the original
 *      gap — the time he spent writing stays); a piece with no text keeps a silent slot of its original length.
 *   3. time map orig → new, piecewise linear through anchors: every piece start and end, plus every WORD the teacher and
 *      the reader both said (normalised match, longest common subsequence; teacher's time from whisper, reader's from
 *      the alignment). Non-monotonic pairs dropped.
 *   4. pen.json → pen.retimed.json: every stroke time, page turn and scroll mapped through the time map (unitSec kept,
 *      lengthUnits = new length); voice.mp3 assembled (−16 LUFS); stats.json (anchors, local ratios, strokes).
 *   With --until only the pieces that start before that second are read; the voice ends 0.6 s after the last one and
 *   strokes after that are left out (a sample for listening).
 * Output: <id>/retime-<model>[-sample]/ … · credits measured. Never any original audio.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { ffmpeg, decode } from "./vad.mjs";
import { writeWav } from "./fit.mjs";

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
// the teacher's pauses are kept, but no longer than this (사장님 10-17 "중간에 끊기는 텀") — strokes inside a shortened
// pause are drawn faster, by the map
const MAX_GAP = Number(arg("--max-gap", 1.2)) || 1.2;
// the pen drawn this much EARLIER on the new timeline (사장님 10-17 "필기가 약간 느린 감") — applied to every anchor's new
// time but the first; the teacher's hand lagged his voice, and a reader's word starts a little after its anchor
const PEN_LEAD = Number(arg("--pen-lead", 0)) || 0;
// --engine azure: Azure Speech reads the pieces instead (ko-KR voice, --voice name) — Korean with English inside is far
// crisper there (사장님 10-17 "that이 → 탓이"). Azure's REST answer carries no word times, so the pen is moved on the
// piece anchors alone (pieces are ≤ 8 s). Key: AZURE_SPEECH_KEY · AZURE_SPEECH_REGION.
const ENGINE = arg("--engine", "elevenlabs");
const AZURE_VOICE = arg("--voice", "ko-KR-HyunsuMultilingualNeural");
const AZURE_RATE = arg("--rate", "1.0"); // <prosody rate> — Azure's Korean voices read slower than the teacher spoke (사장님 10-17 "너무 느리고")
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const MEDIA = path.join(ROOT, ".lecture-media", "audio", "lecture");
const SR = 24000;

for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const AZ_KEY = process.env.AZURE_SPEECH_KEY, AZ_REGION = process.env.AZURE_SPEECH_REGION;
if (!IDS.length) throw new Error("--ids is required");
if (!DRY && ENGINE === "elevenlabs" && !(KEY && VOICE_ID)) throw new Error("ELEVENLABS_API_KEY and --voice-id are required — or --dry-run");
if (!DRY && ENGINE === "azure" && !(AZ_KEY && AZ_REGION)) throw new Error("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required for --engine azure");

// --engine gemini: Google AI Studio's Gemini TTS (사장님 10-17 제안) — reads Korean with English inside the way a Korean
// speaker would, and takes a style line. Voice: --voice (Charon · Orus · Puck · Fenrir · Kore …). Key: GEMINI_API_KEY.
// Answer: inline PCM 24 kHz 16-bit mono, no word times → piece anchors only.
// the key as pasted may carry a repeated "GEMINI_API_KEY=" or quotes — the AIza… token inside is the key
// (keys are "AIza…" or, since 2025, "AQ.…"; a repeated "GEMINI_API_KEY=" prefix or quotes are stripped)
const GEMINI_KEY = ((process.env.GEMINI_API_KEY || "").match(/(AIza[A-Za-z0-9_-]{30,}|AQ\.[A-Za-z0-9_.-]{20,})/) || [(process.env.GEMINI_API_KEY || "").replace(/^(GEMINI_API_KEY=)+/, "").replace(/^["']|["']$/g, "")])[0];
const GEMINI_MODEL = arg("--gemini-model", "gemini-2.5-flash-preview-tts");
const GEMINI_STYLE = arg("--style", "다음은 한국어 영어 독해 강의입니다. 선생님처럼 자연스럽고 또렷하게, 조금 빠른 말투로 읽으세요. 영어 낱말은 영어 발음으로, 한국어는 한국어로. 덧붙이는 말 없이 글만 읽으세요.");
if (!DRY && ENGINE === "gemini" && !GEMINI_KEY) throw new Error("GEMINI_API_KEY is required for --engine gemini (.env.local)");
async function geminiTts(text, attempt = 1) {
  const body = {
    contents: [{ parts: [{ text: `${GEMINI_STYLE}\n\n${text}` }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: AZURE_VOICE } } } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, { method: "POST", headers: { "x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) {
    const j = await res.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error(`Gemini TTS: no audio in the answer (${JSON.stringify(j).slice(0, 200)})`);
    // mimeType "audio/L16;codec=pcm;rate=24000"
    const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
    let pcm = Buffer.from(part.inlineData.data, "base64");
    if (rate !== SR) {
      const tmp = path.join(os.tmpdir(), `gem-${process.pid}-${Date.now()}.pcm`);
      fs.writeFileSync(tmp, pcm);
      pcm = execFileSync(ffmpeg, ["-v", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", tmp, "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
      fs.rmSync(tmp, { force: true });
    }
    return { pcm, alignment: null };
  }
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise((r) => setTimeout(r, 5000 * attempt));
    return geminiTts(text, attempt + 1);
  }
  throw new Error(`Gemini TTS ${res.status}: ${detail}`);
}

// --engine openai: OpenAI gpt-4o-mini-tts (사장님 10-17, after Google's new "AQ." keys were refused everywhere) — reads mixed
// Korean/English the way a Korean speaker would and takes an instruction line. Voice: --voice (onyx · echo · ash · ballad ·
// fable · verse · alloy …). Key: OPENAI_API_KEY. Answer: raw PCM 24 kHz 16-bit mono (response_format "pcm"); no word times.
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = arg("--openai-model", "gpt-4o-mini-tts");
const OPENAI_INSTRUCTIONS = arg("--style", "You are an energetic Korean English-reading teacher in the middle of a lively lesson. Speak quickly and crisply with the natural rhythm of a Korean lecturer explaining a passage — not calm narration. Korean is Korean; English words and phrases are pronounced in clear English. Read exactly what is written, nothing added.");
const OPENAI_SPEED = Number(arg("--speed", "1.0")) || 1.0;
// --group-sec N: pieces the teacher spoke with only short pauses between (< 0.9 s) are read TOGETHER, up to N seconds
// of his speech per reading — one breath of intonation instead of a fresh start at every phrase (사장님 10-18 "더 사람같이").
// The pen is then moved on the group's boundaries (inside, in proportion). 0 = every piece on its own.
const GROUP_SEC = Number(arg("--group-sec", "0")) || 0;
const UNGROUP = new Set(arg("--ungroup", "").split(",").filter(Boolean).map(Number));
// --complete: original pieces whose reading uses the short "read every word" instruction (see COMPLETE_INSTRUCTIONS)
const COMPLETE = new Set(arg("--complete", "").split(",").filter(Boolean).map(Number));
/** A reading's cache key: its text and every setting that changes the sound (FNV-1a, base 36). */
function readingKey(text, complete = false) {
  const s = ["wav-v2", ENGINE, AZURE_VOICE, MODEL, VOICE_ID, OPENAI_SPEED, complete ? "complete" : OPENAI_INSTRUCTIONS, text].join("\u0001");
  let h = 0x811c9dc5, g = 0x9e3779b9;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); g = Math.imul(g ^ s.charCodeAt(i), 0x85ebca6b); }
  return (h >>> 0).toString(36) + (g >>> 0).toString(36);
}
// --align scribe: the MADE voice is transcribed by ElevenLabs Scribe (word times), its words matched to the teacher's
// words (scribe.json of the original), and those pairs become the anchors — word-level sync whatever the engine, no
// guessed offset (사장님 10-18 "음성에 따라서 정확하게 맞춰야"). Piece/group boundaries stay as anchors too.
const ALIGN = arg("--align", "none"); // /v1/audio/speech `speed` (0.25–4.0) — onyx read too slowly at 1.0 (사장님 10-17)
if (!DRY && ENGINE === "openai" && !OPENAI_KEY) throw new Error("OPENAI_API_KEY is required for --engine openai (.env.local)");
// the fallback instruction for a reading that kept dropping its last words: with the long style line gpt-4o-mini-tts
// sometimes stops early ("with the jeweler", "wish" — lh082 2026-10-18); without it, it read them every time
const COMPLETE_INSTRUCTIONS = "A friendly Korean English teacher explaining a passage. Read every single word to the very end — the last words too. Korean in Korean, English in clear English.";
async function openaiTts(text, attempt = 1, instructions = OPENAI_INSTRUCTIONS) {
  // WAV, not "pcm": the raw-PCM answer came back without its last second or two now and then — the tail words seemed
  // "dropped" (lm002 #12 "city가 나오고", lh082 #15 "with the jeweler"); the same text as WAV held them every time
  // (2026-10-18). The RIFF header is stripped here; the data chunk is 24 kHz 16-bit mono like the PCM answer.
  const res = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: OPENAI_MODEL, voice: AZURE_VOICE, input: text, instructions, response_format: "wav", speed: OPENAI_SPEED }) });
  if (res.ok) {
    const wav = Buffer.from(await res.arrayBuffer());
    const at = wav.indexOf("data");
    const rate = wav.readUInt32LE(24);
    if (at < 0 || rate !== SR) throw new Error(`OpenAI TTS: unexpected WAV (data chunk at ${at}, rate ${rate})`);
    return { pcm: wav.subarray(at + 8), alignment: null };
  }
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise((r) => setTimeout(r, 4000 * attempt));
    return openaiTts(text, attempt + 1, instructions);
  }
  throw new Error(`OpenAI TTS ${res.status}: ${detail}`);
}

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Azure: one piece as 24 kHz 16-bit mono PCM (riff header stripped) — no alignment. */
async function azureTts(text, attempt = 1) {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR"><voice name="${AZURE_VOICE}"><prosody rate="${AZURE_RATE}">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${AZ_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": AZ_KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "K-IG-CORE-Lecture-Voice" }, body: ssml });
  if (res.ok) {
    const riff = Buffer.from(await res.arrayBuffer());
    const dataAt = riff.indexOf("data") + 8;
    return { pcm: riff.subarray(dataAt), alignment: null };
  }
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise((r) => setTimeout(r, 3000 * attempt));
    return azureTts(text, attempt + 1);
  }
  throw new Error(`Azure TTS ${res.status}: ${detail}`);
}

// ---------------------------------------------------------------- ElevenLabs
async function tts(text, attempt = 1) {
  const body = { text, model_id: MODEL };
  if (MODEL !== "eleven_v3") body.voice_settings = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.0 };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=pcm_24000`, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) {
    const j = await res.json();
    return { pcm: Buffer.from(j.audio_base64, "base64"), alignment: j.alignment || j.normalized_alignment || null };
  }
  const detail = (await res.text()).slice(0, 300);
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    return tts(text, attempt + 1);
  }
  throw new Error(`ElevenLabs TTS ${res.status}: ${detail}`);
}
async function creditsUsed() {
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY } });
  return r.ok ? (await r.json()).character_count : null;
}

// ---------------------------------------------------------------- words and anchors
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
/** Word start times from the character alignment: word k starts at its first character. */
function synthWordTimes(text, alignment) {
  if (!alignment) return [];
  const chars = alignment.characters, starts = alignment.character_start_times_seconds;
  const words = [];
  let i = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    let k = i;
    while (k < chars.length && chars[k] !== w[0]) k++;
    if (k >= chars.length) break;
    words.push({ w, t: starts[k] });
    i = k + w.length;
  }
  return words;
}
/** Longest common subsequence of normalised words → [{word, orig, synth}] (absolute seconds on each side). */
function matchWords(origWordsT, synthWords) {
  const a = origWordsT.map(([t, , w]) => ({ t, k: norm(w) })).filter((x) => x.k);
  const b = synthWords.map((x) => ({ t: x.t, k: norm(x.w) })).filter((x) => x.k);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].k === b[j].k ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i].k === b[j].k) { pairs.push({ word: a[i].k, orig: a[i].t, synth: b[j].t }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}
/** Trim silence (< −45 dBFS, 10 ms frames) at both ends, leaving 0.1 s. Returns samples and how much lead was cut. */
function trimmed(samples) {
  const hop = SR / 100;
  const db = (i) => { let e = 0; for (let k = i; k < Math.min(samples.length, i + hop); k++) e += samples[k] * samples[k]; return 10 * Math.log10(e / hop + 1e-12); };
  let a = 0, b = samples.length;
  while (a + hop < samples.length && db(a) < -45) a += hop;
  while (b - hop > a && db(b - hop) < -45) b -= hop;
  a = Math.max(0, a - 10 * hop);
  b = Math.min(samples.length, b + 10 * hop);
  return { samples: samples.subarray(a, b), lead: a / SR };
}
/** Piecewise-linear map through sorted anchors [[orig, new], …]; outside, the nearest segment's line continues. */
function makeMap(anchors) {
  const k = anchors;
  return (t) => {
    if (t <= k[0][0]) return k[0][1] + (t - k[0][0]);
    for (let i = 0; i + 1 < k.length; i++) {
      if (t <= k[i + 1][0]) {
        const r = (k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]);
        return k[i][1] + (t - k[i][0]) * r;
      }
    }
    return k.at(-1)[1] + (t - k.at(-1)[0]);
  };
}

// ---------------------------------------------------------------- main
for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const seg = JSON.parse(fs.readFileSync(path.join(dir, fs.existsSync(path.join(dir, "segments.edited.json")) ? "segments.edited.json" : "segments.json"), "utf8"));
  let pieces = seg.pieces.filter((p) => !UNTIL || p.speechStart < UNTIL).map((p) => ({ ...p, text: (p.text ?? (p.words || []).join(" ")).trim() }));
  pieces = pieces.map((p, i) => ({ ...p, firstIndex: i, members: [i] }));
  if (GROUP_SEC) {
    const grouped = [];
    for (const p of pieces) {
      const last = grouped.at(-1);
      const gap = last ? p.speechStart - last.speechEnd : Infinity;
      // --ungroup: these original pieces are read on their own (a grouped reading of them kept dropping words)
      const kept = UNGROUP.has(p.firstIndex) || (last && last.members.some((m) => UNGROUP.has(m)));
      if (!kept && last && last.text && p.text && gap < 0.9 && p.speechEnd - last.speechStart <= GROUP_SEC) {
        // join: a comma where the teacher paused (no punctuation at the join already)
        const joiner = /[.?!,…]$/.test(last.text) ? " " : gap >= 0.4 ? ", " : " ";
        last.text = last.text + joiner + p.text;
        last.speechEnd = p.speechEnd;
        last.end = p.end;
        last.wordsT = [...(last.wordsT || []), ...(p.wordsT || [])];
        last.grouped = (last.grouped || 1) + 1;
        last.members = [...last.members, p.firstIndex];
      } else grouped.push({ ...p, members: [p.firstIndex] });
    }
    console.log(`  grouped ${pieces.length} pieces → ${grouped.length} readings (≤ ${GROUP_SEC} s each)`);
    pieces = grouped;
  }
  const chars = pieces.reduce((n, p) => n + p.text.length, 0);
  console.log(`${id}: ${pieces.length} pieces · ${pieces.filter((p) => p.text).length} read · ${chars} chars · model ${MODEL}${UNTIL ? ` · sample to ${UNTIL} s` : ""}`);
  if (DRY) continue;
  const out = path.join(dir, `retime-${ENGINE === "azure" ? `azure-${AZURE_VOICE.replace(/^ko-KR-/, "")}-r${AZURE_RATE}` : ENGINE === "gemini" ? `gemini-${AZURE_VOICE}` : ENGINE === "openai" ? `openai-${AZURE_VOICE}-s${OPENAI_SPEED}` : MODEL}${UNTIL ? "-sample" : ""}`);
  fs.mkdirSync(out, { recursive: true });
  const before = ENGINE === "elevenlabs" ? await creditsUsed() : null;

  // 1 · 2: read each piece, lay it on the new timeline
  const anchors = []; // [origSec, newSec]
  const laid = [];
  let cursor = pieces[0].speechStart; // the voice starts where the teacher started
  let wordPairs = 0;
  for (const [n, p] of pieces.entries()) {
    const origLen = p.speechEnd - p.speechStart;
    const gapBefore = n === 0 ? 0 : Math.min(MAX_GAP, p.speechStart - pieces[n - 1].speechEnd);
    cursor += gapBefore;
    if (!p.text) {
      anchors.push([p.speechStart, cursor], [p.speechEnd, cursor + origLen]);
      cursor += origLen;
      continue;
    }
    // cached BY CONTENT (text + engine settings), so a regrouped or corrected reading is made again and the rest reused;
    // make-voices.mjs deletes a cache entry (by this key) to get a fresh reading of one that failed the check
    const complete = (p.members || []).some((m) => COMPLETE.has(m));
    const cacheKey = readingKey(p.text, complete);
    const pcmFile = path.join(out, `r-${cacheKey}.pcm`), alnFile = path.join(out, `r-${cacheKey}.alignment.json`);
    if (!fs.existsSync(pcmFile) || !fs.existsSync(alnFile) || FORCE) {
      const r = ENGINE === "azure" ? await azureTts(p.text) : ENGINE === "gemini" ? await geminiTts(p.text) : ENGINE === "openai" ? await openaiTts(p.text, 1, complete ? COMPLETE_INSTRUCTIONS : OPENAI_INSTRUCTIONS) : await tts(p.text);
      fs.writeFileSync(pcmFile, r.pcm);
      fs.writeFileSync(alnFile, JSON.stringify(r.alignment));
    }
    const raw = fs.readFileSync(pcmFile);
    const all = new Float32Array(raw.length / 2);
    for (let i = 0; i < all.length; i++) all[i] = raw.readInt16LE(i * 2) / 32768;
    const { samples, lead } = trimmed(all);
    const newLen = samples.length / SR;
    const wavFile = path.join(out, `piece-${n}.wav`);
    writeWav(wavFile, samples, SR);
    const synthWords = synthWordTimes(p.text, JSON.parse(fs.readFileSync(alnFile, "utf8"))).map((w) => ({ ...w, t: cursor + (w.t - lead) }));
    let pairs = matchWords(p.wordsT || [], synthWords).filter((q) => q.orig > p.speechStart + 0.05 && q.orig < p.speechEnd - 0.05 && q.synth > cursor + 0.05 && q.synth < cursor + newLen - 0.05);
    // a word anchor that would bend the map more than 1.6× away from the piece's own pace is a mis-heard or
    // mis-matched word (whisper on a noisy recording): drop the worst until every local ratio is within range
    const pieceRatio = newLen / origLen;
    for (;;) {
      const ks = [[p.speechStart, cursor], ...pairs.map((q) => [q.orig, q.synth]), [p.speechEnd, cursor + newLen]];
      let worst = -1, worstScore = 1.6;
      for (let i = 0; i + 1 < ks.length; i++) {
        const r = ((ks[i + 1][1] - ks[i][1]) / Math.max(0.01, ks[i + 1][0] - ks[i][0])) / pieceRatio;
        const score = r < 1 ? 1 / Math.max(r, 1e-3) : r;
        if (score > worstScore) { worstScore = score; worst = i; }
      }
      if (worst < 0) break;
      // the segment worst runs between knots worst and worst+1: drop whichever of them is a word anchor
      const drop = worst > 0 ? worst - 1 : worst; // index into pairs (knot i = pair i−1)
      if (drop < 0 || drop >= pairs.length) break;
      pairs = pairs.filter((_, i) => i !== drop);
    }
    wordPairs += pairs.length;
    anchors.push([p.speechStart, cursor], ...pairs.map((q) => [q.orig, q.synth]), [p.speechEnd, cursor + newLen]);
    laid.push({ piece: n, members: p.members || [p.firstIndex ?? n], cacheKey, text: p.text, origStart: p.speechStart, origLen: +origLen.toFixed(3), newStart: +cursor.toFixed(3), newLen: +newLen.toFixed(3), ratio: +(newLen / origLen).toFixed(3), wordAnchors: pairs.length, file: wavFile });
    cursor += newLen;
  }
  const after = ENGINE === "elevenlabs" ? await creditsUsed() : null;
  let pronunciation = null;
  if (ALIGN === "scribe") {
    // the made voice, word by word: each READING is transcribed once and the result cached by its content key
    // (s-<key>.json) — a re-read reading is transcribed again, the others never (the whole-track transcription it
    // replaced ran up to 4 times per lecture and used up the month's ElevenLabs credits, 2026-10-18)
    async function scribeReading(file, attempt = 1) {
      const form = new FormData();
      form.append("file", new Blob([fs.readFileSync(file)], { type: "audio/wav" }), "reading.wav");
      form.append("model_id", "scribe_v1");
      form.append("timestamps_granularity", "word");
      form.append("diarize", "false");
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": KEY }, body: form });
      if (res.ok) return res.json();
      const detail = (await res.text()).slice(0, 200);
      if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        return scribeReading(file, attempt + 1);
      }
      throw new Error(`Scribe on the made voice: ${res.status} ${detail}`);
    }
    const queue = laid.slice();
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (;;) {
        const l = queue.shift();
        if (!l) return;
        const cache = path.join(out, `s-${l.cacheKey}.json`);
        if (!fs.existsSync(cache)) {
          const j = await scribeReading(l.file);
          fs.writeFileSync(cache, JSON.stringify((j.words || []).filter((w) => w.type === "word").map((w) => [w.start, w.text])));
        }
      }
    }));
    const newWords = laid.flatMap((l) => JSON.parse(fs.readFileSync(path.join(out, `s-${l.cacheKey}.json`), "utf8")).map(([t, w]) => ({ w, t: l.newStart + t }))).sort((a, b) => a.t - b.t);
    const origWords = pieces.flatMap((p) => p.wordsT || []).map(([t, , w]) => [t, 0, w]);
    const pairsAll = matchWords(origWords, newWords);
    // per piece/group: keep the pairs inside it, prune the ones that bend the map > 1.6× from the group's pace
    let kept = 0;
    for (const l of laid) {
      const o0 = l.origStart, o1 = l.origStart + l.origLen, n0 = l.newStart, n1 = l.newStart + l.newLen;
      let pairs = pairsAll.filter((q) => q.orig > o0 + 0.05 && q.orig < o1 - 0.05 && q.synth > n0 + 0.05 && q.synth < n1 - 0.05);
      const pieceRatio = l.newLen / l.origLen;
      for (;;) {
        const ks = [[o0, n0], ...pairs.map((q) => [q.orig, q.synth]), [o1, n1]];
        let worst = -1, worstScore = 1.6;
        for (let i = 0; i + 1 < ks.length; i++) {
          const r = ((ks[i + 1][1] - ks[i][1]) / Math.max(0.01, ks[i + 1][0] - ks[i][0])) / pieceRatio;
          const score = r < 1 ? 1 / Math.max(r, 1e-3) : r;
          if (score > worstScore) { worstScore = score; worst = i; }
        }
        if (worst < 0) break;
        const drop = worst > 0 ? worst - 1 : worst;
        if (drop < 0 || drop >= pairs.length) break;
        pairs = pairs.filter((_, i) => i !== drop);
      }
      kept += pairs.length;
      anchors.push(...pairs.map((q) => [q.orig, q.synth]));
    }
    wordPairs = kept;
    console.log(`  align: made voice ${newWords.length} words · matched ${pairsAll.length} · anchors kept ${kept}`);
    // PRONUNCIATION CHECK (기준 5): what the made voice says, heard back by Scribe, against the text it was given —
    // per reading, character-level similarity of the two (spaces · punctuation removed, digits ignored: Scribe writes
    // "백팔십이" as 182). Below 0.9 = a mis-read ("마데", "탓이") → listed for a re-read.
    const squash = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}\d]/gu, "");
    const lev = (a, b) => {
      const m = a.length, n = b.length;
      let prev = Array.from({ length: n + 1 }, (_, j) => j);
      for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[n];
    };
    // calibrated on lh082 (the owner-approved voice): a whole-reading similarity flags gross failures (a skipped sentence),
    // and the decisive test is per ENGLISH word — the mis-reads the owner heard ("made"→마데) come back from Scribe in
    // Hangul or as another word, so an English word of the text (3+ letters) missing from what was heard is a fail.
    // not checked: English number words (Scribe writes them as digits — "nineteen thirty-seven" → 1937) and capitalised
    // names (Scribe writes some in Hangul — Colorado → 콜로라도); lm002 2026-10-18
    const NUMBER_WORD = /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|twelfth|twentieth|thirtieth|o'clock|oclock)(-\w+)?$/;
    const engWords = (s) => (s.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).filter((w) => !/^[A-Z]/.test(w) || /^(I|The|A|An|And|But|He|She|It|They|We|You|This|That|What|When|Where|Why|How|After|Before|In|On|At|For|With|My|His|Her|Our|Their|Can|Do|Does|Did|Is|Are|Was|Were)$/.test(w)).map((w) => w.toLowerCase().replace(/[’']s$/, "").replace(/['’]/g, "")).filter((w) => !NUMBER_WORD.test(w));
    pronunciation = laid.map((l) => {
      const heardWords = newWords.filter((w) => w.t >= l.newStart - 0.05 && w.t < l.newStart + l.newLen + 0.05).map((w) => w.w);
      const heard = heardWords.join(" ");
      const a = squash(l.text), b = squash(heard);
      const sim = a.length ? 1 - lev(a, b) / Math.max(a.length, b.length) : 1;
      // English words looked up with 0.4 s more on each side: Scribe sometimes places a word on the next reading's
      // edge ("gi|ven name", lm002 #4)
      const near = newWords.filter((w) => w.t >= l.newStart - 0.4 && w.t < l.newStart + l.newLen + 0.4).map((w) => w.w).join(" ");
      // (the heard side keeps capitalised words: Scribe capitalises a word that starts its sentence — "Given name")
      const heardEng = new Set((near.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || []).map((w) => w.toLowerCase().replace(/[’']s$/, "").replace(/['’]/g, "")).flatMap((w) => [w, w.replace(/s$/, ""), `${w}s`]));
      const missingEnglish = engWords(l.text).filter((w) => !heardEng.has(w) && !heardEng.has(w.replace(/s$/, "")));
      return { piece: l.piece, members: l.members, cacheKey: l.cacheKey, sim: +sim.toFixed(3), missingEnglish, text: l.text, heard };
    });
    // whole-reading similarity only catches gross failures: number-heavy readings sit at 0.54–0.6 because Scribe writes
    // "천사백구십" as 1490 (lm002); half a reading lost would be well below 0.45
    for (const x of pronunciation) x.fail = x.sim < 0.45 || x.missingEnglish.length > 0;
    const below = pronunciation.filter((x) => x.fail);
    console.log(`  pronunciation: ${pronunciation.length - below.length}/${pronunciation.length} readings pass${below.length ? ` · fail: ${below.map((x) => `#${x.piece} ${x.sim}${x.missingEnglish.length ? ` [${x.missingEnglish.join(" ")}]` : ""}`).join(", ")}` : ""}`);
  }
  // keep the map monotonic
  anchors.sort((a, b) => a[0] - b[0]);
  const knots = [];
  for (const a of anchors) if (!knots.length || (a[0] > knots.at(-1)[0] + 0.01 && a[1] > knots.at(-1)[1] + 0.01)) knots.push(a);
  if (PEN_LEAD) for (let i = 1; i < knots.length; i++) knots[i] = [knots[i][0], Math.max(knots[i - 1][1] + 0.01, knots[i][1] - PEN_LEAD)];
  const map = makeMap(knots);
  const newTotal = cursor + 0.6;

  // voice.mp3 on the new timeline — each piece faded 15 ms in and out (no clicks at its edges), then ONE static gain to
  // −16 LUFS measured over the whole track (the earlier dynamic loudnorm breathed between pieces and lifted the synth's
  // faint hiss in the pauses — 사장님 10-18 "기계음, 잡음")
  const track = new Float32Array(Math.round(newTotal * SR));
  const edge = Math.round(0.015 * SR);
  for (const l of laid) {
    const s = decode(l.file, { sr: SR });
    const at = Math.round(l.newStart * SR), n = Math.min(s.length, track.length - at);
    for (let i = 0; i < n; i++) {
      const g = i < edge ? i / edge : n - 1 - i < edge ? (n - 1 - i) / edge : 1;
      track[at + i] = s[i] * g;
    }
  }
  const mp3 = path.join(out, "voice.mp3");
  // measure (ffmpeg prints loudnorm's json on stderr)
  const { spawnSync } = await import("node:child_process");
  const meas = spawnSync(ffmpeg, ["-v", "info", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1:print_format=json", "-f", "null", "-"], { input: Buffer.from(track.buffer), maxBuffer: 1 << 30 });
  const jsonText = (meas.stderr.toString().match(/\{[^{}]*"input_i"[^{}]*\}/) || ["{}"])[0];
  const li = Number(JSON.parse(jsonText).input_i), tp = Number(JSON.parse(jsonText).input_tp);
  let gain = Number.isFinite(li) ? -16 - li : 0;
  if (Number.isFinite(tp) && tp + gain > -1) gain = -1 - tp; // never past −1 dBTP
  execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", "-", "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "libmp3lame", "-b:a", "64k", "-ar", String(SR), mp3], { input: Buffer.from(track.buffer), maxBuffer: 1 << 30 });
  console.log(`  loudness ${Number.isFinite(li) ? li.toFixed(1) : "?"} LUFS → gain ${gain.toFixed(1)} dB (static) · mp3 64 kbps`);
  const back = decode(mp3, { sr: SR }).length / SR;

  // 4: the pen, moved — a preview copy only; the build applies the time map to the ORIGINAL pen itself. When pen.json is
  // already the build's retimed pen (a voice is listed), the stroke stats below use the time map alone.
  const pen = JSON.parse(fs.readFileSync(path.join(MEDIA, id, "pen.json"), "utf8"));
  const penIsOriginal = !pen.retimed;
  const u = pen.unitSec;
  const toNew = (units) => map(units * u) / u;
  const strokes = [];
  let kept = 0, dropped = 0;
  for (const s of pen.strokes) {
    const [t0, page, pen2, x0, y0, ...rest] = s;
    const times = [t0];
    let t = t0;
    for (let i = 0; i + 2 < rest.length; i += 3) { t += rest[i]; times.push(t); }
    const mapped = times.map((v) => Math.round(toNew(v)));
    if (mapped[0] * u > newTotal) { dropped++; continue; }
    const ns = [mapped[0], page, pen2, x0, y0];
    for (let i = 0; i + 2 < rest.length; i += 3) ns.push(Math.max(0, mapped[i / 3 + 1] - mapped[i / 3]), rest[i + 1], rest[i + 2]);
    strokes.push(ns);
    kept++;
  }
  if (penIsOriginal) {
    const penNew = { ...pen, lengthUnits: Math.ceil(newTotal / u), pageEvents: pen.pageEvents.map(([t, pg]) => [Math.round(toNew(t)), pg]), scrollEvents: (pen.scrollEvents || []).map(([t, y]) => [Math.round(toNew(t)), y]), strokes, retimed: { from: "voice", anchors: knots.length, wordAnchors: wordPairs } };
    fs.writeFileSync(path.join(out, "pen.retimed.json"), JSON.stringify(penNew));
  }
  // the TIME MAP is what the build applies to the original pen (주 세션 원칙 10-17: 옮긴 pen = 원본 pen + 시간 지도, 손 사본 금지):
  // anchors [original time units, new seconds], monotonic; numbers only, so it lives in the public repo
  // (docs/lecture/voice/<id>.timemap.json). The build takes durationSec from the manifest (= voice.mp3 length).
  const timemap = { id, unitSec: u, voiceSec: +back.toFixed(3), engine: ENGINE, model: ENGINE === "azure" ? AZURE_VOICE : ENGINE === "gemini" ? GEMINI_MODEL : ENGINE === "openai" ? OPENAI_MODEL : MODEL, voiceId: ENGINE === "elevenlabs" ? VOICE_ID : AZURE_VOICE, madeAt: new Date().toISOString().slice(0, 10), sample: UNTIL ? { untilSec: UNTIL } : undefined, anchors: knots.map(([o, nw]) => [+(o / u).toFixed(2), +nw.toFixed(3)]) };
  const mapDir = path.join(ROOT, "docs", "lecture", "voice");
  fs.mkdirSync(mapDir, { recursive: true });
  fs.writeFileSync(path.join(mapDir, `${id}.timemap.json`), JSON.stringify(timemap));

  // stats
  const ratios = knots.slice(1).map((k, i) => (k[1] - knots[i][1]) / (k[0] - knots[i][0]));
  const sorted = ratios.slice().sort((a, b) => a - b);
  const strokeStarts = penIsOriginal ? pen.strokes.map((s) => s[0] * u).filter((t) => !UNTIL || t < UNTIL) : [];
  const nearWord = strokeStarts.filter((t) => knots.some((k) => Math.abs(k[0] - t) <= 1)).length;
  const stats = {
    id, model: MODEL, voiceId: VOICE_ID, pieces: pieces.length, read: laid.length, chars, creditsUsed: before != null && after != null ? after - before : null,
    origSpan: +(pieces.at(-1).speechEnd - pieces[0].speechStart).toFixed(2), newSpan: +(cursor - pieces[0].speechStart).toFixed(2), voiceSec: +back.toFixed(3),
    anchors: knots.length, wordAnchors: wordPairs, localRatio: { median: +sorted[Math.floor(sorted.length / 2)].toFixed(3), min: +sorted[0].toFixed(3), max: +sorted.at(-1).toFixed(3) },
    strokes: { inSample: strokeStarts.length, kept, dropped, withinOneSecondOfAnchor: nearWord },
    pieceRatios: laid.map((l) => l.ratio),
  };
  stats.pronunciation = pronunciation ? { readings: pronunciation.length, below: pronunciation.filter((x) => x.fail).map((x) => x.piece), min: Math.min(...pronunciation.map((x) => x.sim)), missingEnglish: pronunciation.flatMap((x) => x.missingEnglish.map((w) => `#${x.piece}:${w}`)) } : null;
  stats.outDir = out;
  fs.writeFileSync(path.join(out, "stats.json"), JSON.stringify({ ...stats, laid, pronunciationDetail: pronunciation }, null, 1));
  console.log(JSON.stringify(stats));
  console.log(`  → ${mp3} · ${path.join(out, "pen.retimed.json")}`);
}
