#!/usr/bin/env node
/**
 * LECTURE voice — steps H · I: put the made parts back on the original's timeline and encode ONE mp3 of exactly
 * the original's length.
 *
 *   node scripts/lecture/voice/assemble.mjs --id lm001 --parts <parts.json> --out <voice.mp3> [--no-loudnorm]
 *
 * parts.json: [{ "start": <seconds on the original timeline>, "file": <wav|mp3 of that part> }, …] — every part
 * is laid at its start sample over silence; parts may not overlap, and the last may not run past the end by
 * more than 0.05 s (it is cut there). Working rate 24 kHz mono float; the mp3 is 24 kHz mono 48 kbps (LAME, with
 * its gapless tag, so a decoder returns exactly the samples put in — checked here by decoding the result back).
 * Loudness: ffmpeg loudnorm to −16 LUFS · −1 dBTP (off with --no-loudnorm, e.g. for round-trip tests).
 *
 * Prints the part count, overlaps rejected, and the decoded length of the mp3 against the target; exit 1 when the
 * decoded length is off by more than 0.05 s.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { decode, ffmpeg } from "./vad.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const ID = arg("--id");
const PARTS = arg("--parts");
const OUT = arg("--out");
const LOUDNORM = !args.includes("--no-loudnorm");
if (!ID || !PARTS || !OUT) throw new Error("--id --parts --out are required");
const WORK_SR = 24000;

const orig = JSON.parse(fs.readFileSync(path.join(ROOT, ".lecture-media", "voice", ID, "markers.json"), "utf8"));
const target = Math.round(orig.audioSec * WORK_SR);
const parts = JSON.parse(fs.readFileSync(PARTS, "utf8").replace(/^﻿/, "")).slice().sort((a, b) => a.start - b.start);
const track = new Float32Array(target);
let placed = 0, cutTail = 0, lastEnd = 0;
for (const p of parts) {
  const at = Math.round(p.start * WORK_SR);
  if (at < lastEnd) throw new Error(`part at ${p.start}s overlaps the one before (ends ${(lastEnd / WORK_SR).toFixed(3)}s): ${p.file}`);
  const s = decode(p.file, { sr: WORK_SR });
  let n = s.length;
  if (at + n > target) {
    if (at + n - target > WORK_SR * 0.05) throw new Error(`part at ${p.start}s runs ${((at + n - target) / WORK_SR).toFixed(3)}s past the end: ${p.file}`);
    cutTail += at + n - target;
    n = target - at;
  }
  track.set(s.subarray(0, n), at);
  lastEnd = at + n;
  placed++;
}
// encode: raw float → mp3 (LAME writes the Xing/LAME gapless header, so decoders drop the encoder delay)
const filters = LOUDNORM ? ["-af", "loudnorm=I=-16:TP=-1:LRA=11"] : [];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ar", String(WORK_SR), "-ac", "1", "-i", "-", ...filters, "-c:a", "libmp3lame", "-b:a", "48k", "-ar", String(WORK_SR), OUT], { input: Buffer.from(track.buffer), maxBuffer: 1 << 30 });
const back = decode(OUT, { sr: WORK_SR });
const diff = (back.length - target) / WORK_SR;
console.log(`${ID}: parts ${placed} · tail cut ${(cutTail / WORK_SR).toFixed(3)} s · target ${(target / WORK_SR).toFixed(3)} s · mp3 decodes to ${(back.length / WORK_SR).toFixed(3)} s (diff ${diff.toFixed(3)}) · ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB → ${OUT}`);
if (Math.abs(diff) > 0.05) process.exit(1);
