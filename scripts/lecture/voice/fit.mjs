/**
 * LECTURE voice — fit a made piece to the length it must have on the original timeline.
 *
 * fitToLength(inFile, targetSec, outWav, { sr }) → { inSec, outSec, stretch, method }
 *   |in − target| ≤ 0.04 s  → copied, then padded/trimmed to the exact sample count ("pad")
 *   otherwise               → ffmpeg atempo (pitch kept) by in/target, then padded/trimmed ("atempo")
 * The caller decides what a stretch outside 0.8–1.25 means (check-voice.mjs ③ fails it).
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { decode, ffmpeg } from "./vad.mjs";

export function writeWav(file, samples, sr) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

export function fitToLength(inFile, targetSec, outWav, { sr = 24000, tolerance = 0.04 } = {}) {
  const input = decode(inFile, { sr });
  const inSec = input.length / sr;
  const target = Math.round(targetSec * sr);
  let samples = input, method = "pad";
  const stretch = inSec / targetSec;
  if (Math.abs(inSec - targetSec) > tolerance && inSec > 0.05) {
    // atempo accepts 0.5–100 per filter; chain two for anything outside (never expected here)
    const r = stretch;
    const chain = r >= 0.5 && r <= 2 ? `atempo=${r.toFixed(6)}` : `atempo=${Math.sqrt(r).toFixed(6)},atempo=${Math.sqrt(r).toFixed(6)}`;
    const raw = execFileSync(ffmpeg, ["-v", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "-", "-af", chain, "-f", "f32le", "-"], { input: Buffer.from(input.buffer, input.byteOffset, input.byteLength), maxBuffer: 1 << 30 });
    samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    method = "atempo";
  }
  const out = new Float32Array(target);
  out.set(samples.subarray(0, Math.min(target, samples.length)));
  // a short fade at a cut end so a trimmed tail does not click
  const fade = Math.min(240, target);
  for (let i = 0; i < fade; i++) out[target - 1 - i] *= i / fade;
  writeWav(outWav, out, sr);
  return { inSec: +inSec.toFixed(3), outSec: +(target / sr).toFixed(3), stretch: +stretch.toFixed(4), method };
}
