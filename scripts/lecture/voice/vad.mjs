/**
 * LECTURE voice — shared audio helpers: decode with ffmpeg, 20 ms frame energy, a simple speech/silence mask.
 * Used by check-voice.mjs (the checks), segments.mjs (where to cut) and assemble.mjs (placing the parts).
 */
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const FFDIR = "C:/Users/ghddl/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin";
export const ffmpeg = process.env.FFMPEG || path.join(FFDIR, "ffmpeg.exe");
export const ffprobe = process.env.FFPROBE || path.join(FFDIR, "ffprobe.exe");
export const SR = 16000;
export const HOP = 320; // 20 ms at 16 kHz

/** The file as mono float samples at `sr` (default 16 kHz); `shiftSec` of silence in front when asked (break tests). */
export function decode(file, { sr = SR, shiftSec = 0 } = {}) {
  const fmt = /\.mp3$/i.test(file) ? ["-f", "mp3"] : [];
  const raw = execFileSync(ffmpeg, ["-v", "error", ...fmt, "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  if (!shiftSec) return samples;
  const out = new Float32Array(samples.length + Math.round(shiftSec * sr));
  out.set(samples, Math.round(shiftSec * sr));
  return out;
}

/** Frame energy in dBFS, 20 ms hop (16 kHz samples). */
export function energyDb(samples) {
  const n = Math.floor(samples.length / HOP);
  const db = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) s += samples[i] * samples[i];
    db[f] = 10 * Math.log10(s / HOP + 1e-12);
  }
  return db;
}

/** Speech frames: energy ≥ noise floor (10th percentile) + 12 dB; silences < 0.3 s bridged, speech blips < 0.1 s dropped. */
export function speechMask(db, { bridgeFrames = 15, blipFrames = 5 } = {}) {
  const sorted = Float32Array.from(db).sort();
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const thr = Math.max(floor + 12, -50);
  const mask = new Uint8Array(db.length);
  for (let i = 0; i < db.length; i++) mask[i] = db[i] >= thr ? 1 : 0;
  const fill = (value, maxRun) => {
    let i = 0;
    while (i < mask.length) {
      if (mask[i] !== value) { i++; continue; }
      let j = i;
      while (j < mask.length && mask[j] === value) j++;
      if (j - i < maxRun && i > 0 && j < mask.length) for (let k = i; k < j; k++) mask[k] = 1 - value;
      i = j;
    }
  };
  fill(0, bridgeFrames);
  fill(1, blipFrames);
  return { mask, floor, thr };
}

/** [start, end) frame runs where mask === value. */
export function runs(mask, value) {
  const out = [];
  let i = 0;
  while (i < mask.length) {
    if (mask[i] !== value) { i++; continue; }
    let j = i;
    while (j < mask.length && mask[j] === value) j++;
    out.push([i, j]);
    i = j;
  }
  return out;
}

export const frameSec = (f) => (f * HOP) / SR;
