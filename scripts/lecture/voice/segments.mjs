#!/usr/bin/env node
/**
 * LECTURE voice — step D: where the original recording can be cut. From the clean original's speech/silence mask:
 *
 *   speech  — every speech run [start, end) in seconds (pauses ≥ 0.3 s separate runs)
 *   chunks  — the lecture cut into pieces of at most --max seconds (default 280, under a voice changer's 5-minute
 *             limit) at the LONGEST pause in the last third of each piece, never inside speech; each chunk keeps
 *             the silence around it so a converted chunk can be put back at exactly its start time
 *   pieces  — the same for short pieces (--piece, default 8 s) used when a voice is synthesised per phrase
 *
 *   node scripts/lecture/voice/segments.mjs --ids lm001[,…] [--max 280] [--piece 8]
 *
 * Writes .lecture-media/voice/<id>/segments.json. Transcript words (azure-fast.json / whisper.json), when present,
 * are attached to each piece by time so the text to synthesise is known (step E edits it).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { decode, energyDb, speechMask, runs, frameSec, SR, HOP } from "./vad.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const VOICE = path.resolve(ROOT, arg("--voice", ".lecture-media/voice"));
const IDS = arg("--ids", "").split(",").filter(Boolean);
const MAX = Number(arg("--max", 280));
const PIECE = Number(arg("--piece", 8));
if (!IDS.length) throw new Error("--ids lm001[,…] is required");

/** Cut [from, to) frames into pieces ≤ maxFrames, each cut at the middle of the longest silence in the last third. */
function cut(silences, from, to, maxFrames) {
  const out = [];
  let start = from;
  while (to - start > maxFrames) {
    const lo = start + Math.floor(maxFrames * 0.6), hi = start + maxFrames;
    const candidates = silences.filter(([s, e]) => e > lo && s < hi).map(([s, e]) => [Math.max(s, lo), Math.min(e, hi)]).filter(([s, e]) => e > s);
    if (!candidates.length) {
      // no silence at all in the window — cut at the quietest frame later (rare: a very long unbroken stretch)
      out.push([start, hi]);
      start = hi;
      continue;
    }
    const best = candidates.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    const at = Math.floor((best[0] + best[1]) / 2);
    out.push([start, at]);
    start = at;
  }
  out.push([start, to]);
  return out;
}

function wordsOf(dir) {
  const azure = path.join(dir, "azure-fast.json"), whisper = path.join(dir, "whisper.json");
  if (fs.existsSync(azure)) {
    const j = JSON.parse(fs.readFileSync(azure, "utf8"));
    return { source: "azure-fast", words: (j.phrases || []).flatMap((p) => (p.words || []).map((w) => ({ t: w.offsetMilliseconds / 1000, d: w.durationMilliseconds / 1000, w: w.text, locale: p.locale }))) };
  }
  if (fs.existsSync(whisper)) {
    const j = JSON.parse(fs.readFileSync(whisper, "utf8"));
    return { source: "whisper", words: (j.segments || []).flatMap((s) => (s.words || []).map((w) => ({ t: w.start, d: +(w.end - w.start).toFixed(3), w: w.word.trim(), p: w.probability }))) };
  }
  return { source: null, words: [] };
}

for (const id of IDS) {
  const dir = path.join(VOICE, id);
  const samples = decode(path.join(dir, "orig.mp3"));
  const total = samples.length / SR;
  const { mask, floor, thr } = speechMask(energyDb(samples));
  const speech = runs(mask, 1), silences = runs(mask, 0);
  const maxFrames = Math.round((MAX * SR) / HOP), pieceFrames = Math.round((PIECE * SR) / HOP);
  const chunks = cut(silences, 0, mask.length, maxFrames).map(([s, e]) => ({ start: +frameSec(s).toFixed(3), end: +frameSec(e).toFixed(3) }));
  // pieces: one per speech run, long runs cut further; the silence before each run belongs to it
  const pieces = [];
  for (let i = 0; i < speech.length; i++) {
    const [s, e] = speech[i];
    const lead = i === 0 ? 0 : speech[i - 1][1];
    for (const [a, b] of cut(silences, s, e, pieceFrames)) pieces.push({ speechStart: +frameSec(a).toFixed(3), speechEnd: +frameSec(b).toFixed(3), start: +frameSec(a === s ? lead : a).toFixed(3) });
  }
  for (let i = 0; i < pieces.length; i++) pieces[i].end = i + 1 < pieces.length ? pieces[i + 1].start : +total.toFixed(3);
  const { source, words } = wordsOf(dir);
  if (words.length) {
    for (const p of pieces) {
      const inside = words.filter((w) => w.t >= p.start && w.t < p.end);
      p.words = inside.map((w) => w.w);
      // [start sec, duration sec, word] — the anchors for word-level time-warp (synth-elevenlabs.mjs)
      p.wordsT = inside.map((w) => [w.t, w.d, w.w]);
    }
  }
  const doc = { id, totalSec: +total.toFixed(3), noiseFloorDb: +floor.toFixed(1), speechThresholdDb: +thr.toFixed(1), speechSec: +(speech.reduce((n, [s, e]) => n + (e - s), 0) * HOP / SR).toFixed(1), speech: speech.map(([s, e]) => [+frameSec(s).toFixed(2), +frameSec(e).toFixed(2)]), chunks, pieces, transcript: source };
  fs.writeFileSync(path.join(dir, "segments.json"), JSON.stringify(doc, null, 1));
  const longest = Math.max(...pieces.map((p) => p.speechEnd - p.speechStart));
  console.log(`${id}: ${total.toFixed(1)} s · speech ${doc.speechSec} s in ${speech.length} runs · chunks ${chunks.length} (${chunks.map((c) => (c.end - c.start).toFixed(0)).join("/")} s) · pieces ${pieces.length} (longest speech ${longest.toFixed(1)} s) · words ${words.length}${source ? ` (${source})` : ""}`);
}
