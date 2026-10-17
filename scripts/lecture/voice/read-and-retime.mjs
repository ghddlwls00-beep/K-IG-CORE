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
if (!IDS.length) throw new Error("--ids is required");
if (!DRY && !(KEY && VOICE_ID)) throw new Error("ELEVENLABS_API_KEY and --voice-id are required — or --dry-run");

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
  const pieces = seg.pieces.filter((p) => !UNTIL || p.speechStart < UNTIL).map((p) => ({ ...p, text: (p.text ?? (p.words || []).join(" ")).trim() }));
  const chars = pieces.reduce((n, p) => n + p.text.length, 0);
  console.log(`${id}: ${pieces.length} pieces · ${pieces.filter((p) => p.text).length} read · ${chars} chars · model ${MODEL}${UNTIL ? ` · sample to ${UNTIL} s` : ""}`);
  if (DRY) continue;
  const out = path.join(dir, `retime-${MODEL}${UNTIL ? "-sample" : ""}`);
  fs.mkdirSync(out, { recursive: true });
  const before = await creditsUsed();

  // 1 · 2: read each piece, lay it on the new timeline
  const anchors = []; // [origSec, newSec]
  const laid = [];
  let cursor = pieces[0].speechStart; // the voice starts where the teacher started
  let wordPairs = 0;
  for (const [n, p] of pieces.entries()) {
    const origLen = p.speechEnd - p.speechStart;
    const gapBefore = n === 0 ? 0 : p.speechStart - pieces[n - 1].speechEnd;
    cursor += gapBefore;
    if (!p.text) {
      anchors.push([p.speechStart, cursor], [p.speechEnd, cursor + origLen]);
      cursor += origLen;
      continue;
    }
    const pcmFile = path.join(out, `piece-${n}.pcm`), alnFile = path.join(out, `piece-${n}.alignment.json`);
    if (!fs.existsSync(pcmFile) || !fs.existsSync(alnFile) || FORCE) {
      const r = await tts(p.text);
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
    laid.push({ piece: n, text: p.text, origStart: p.speechStart, origLen: +origLen.toFixed(3), newStart: +cursor.toFixed(3), newLen: +newLen.toFixed(3), ratio: +(newLen / origLen).toFixed(3), wordAnchors: pairs.length, file: wavFile });
    cursor += newLen;
  }
  const after = await creditsUsed();
  // keep the map monotonic
  anchors.sort((a, b) => a[0] - b[0]);
  const knots = [];
  for (const a of anchors) if (!knots.length || (a[0] > knots.at(-1)[0] + 0.01 && a[1] > knots.at(-1)[1] + 0.01)) knots.push(a);
  const map = makeMap(knots);
  const newTotal = cursor + 0.6;

  // 4: the pen, moved
  const pen = JSON.parse(fs.readFileSync(path.join(MEDIA, id, "pen.json"), "utf8"));
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
  const penNew = { ...pen, lengthUnits: Math.ceil(newTotal / u), pageEvents: pen.pageEvents.map(([t, pg]) => [Math.round(toNew(t)), pg]), scrollEvents: (pen.scrollEvents || []).map(([t, y]) => [Math.round(toNew(t)), y]), strokes, retimed: { from: "voice", anchors: knots.length, wordAnchors: wordPairs } };
  fs.writeFileSync(path.join(out, "pen.retimed.json"), JSON.stringify(penNew));

  // voice.mp3 on the new timeline
  const track = new Float32Array(Math.round(newTotal * SR));
  for (const l of laid) {
    const s = decode(l.file, { sr: SR });
    track.set(s.subarray(0, Math.min(s.length, track.length - Math.round(l.newStart * SR))), Math.round(l.newStart * SR));
  }
  const mp3 = path.join(out, "voice.mp3");
  execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1:LRA=11", "-c:a", "libmp3lame", "-b:a", "48k", "-ar", String(SR), mp3], { input: Buffer.from(track.buffer), maxBuffer: 1 << 30 });
  const back = decode(mp3, { sr: SR }).length / SR;

  // stats
  const ratios = knots.slice(1).map((k, i) => (k[1] - knots[i][1]) / (k[0] - knots[i][0]));
  const sorted = ratios.slice().sort((a, b) => a - b);
  const strokeStarts = pen.strokes.map((s) => s[0] * u).filter((t) => !UNTIL || t < UNTIL);
  const nearWord = strokeStarts.filter((t) => knots.some((k) => Math.abs(k[0] - t) <= 1)).length;
  const stats = {
    id, model: MODEL, voiceId: VOICE_ID, pieces: pieces.length, read: laid.length, chars, creditsUsed: before != null && after != null ? after - before : null,
    origSpan: +(pieces.at(-1).speechEnd - pieces[0].speechStart).toFixed(2), newSpan: +(cursor - pieces[0].speechStart).toFixed(2), voiceSec: +back.toFixed(3),
    anchors: knots.length, wordAnchors: wordPairs, localRatio: { median: +sorted[Math.floor(sorted.length / 2)].toFixed(3), min: +sorted[0].toFixed(3), max: +sorted.at(-1).toFixed(3) },
    strokes: { inSample: strokeStarts.length, kept, dropped, withinOneSecondOfAnchor: nearWord },
    pieceRatios: laid.map((l) => l.ratio),
  };
  fs.writeFileSync(path.join(out, "stats.json"), JSON.stringify({ ...stats, laid }, null, 1));
  console.log(JSON.stringify(stats));
  console.log(`  → ${mp3} · ${path.join(out, "pen.retimed.json")}`);
}
