#!/usr/bin/env node
/**
 * LECTURE voice (2026-10-17) — step A: pull the ORIGINAL recording out of each .gdb so it can be studied and
 * transcribed. The recording is the '<book title>.audio' record: a 726-byte header, then an MP3 stream.
 *
 * THE STREAM IS NOT A PLAIN MP3 (found 2026-10-17 on lm001 · lm057 · lh082, then all 200): after every 6–9
 * frames (7.5 on average = one pen time unit, 0.18 s) the GVA recorder wrote a 2-byte tick marker between two
 * frames. ffmpeg's parser treats the frame before a marker as broken and drops it, so a straight decode loses
 * ~13% of the audio in 24 ms holes (lm001: 396 s of 457 s) — that is the 9월 "다 깨짐", together with the header.
 * Here the frames are walked by their headers, the markers are removed, and the clean stream is written; the
 * marker positions (audio seconds, frame counts) are kept because they ARE the pen clock: marker k is the end
 * of pen time unit k (lm001: 2,539 markers, 2,540 units in the .gdb header).
 *
 *   node scripts/lecture/voice/extract-original.mjs [--src <folder>] [--out <folder>] [--ids lm001,lh082] [--wav]
 *
 *   --out  default .lecture-media/voice (git-ignored — the original is paid content and never goes to the
 *          public repo or the site; it is never uploaded anywhere)
 *   --wav  also write <id>/orig.wav (16 kHz mono, for transcription) with ffmpeg
 *
 * Writes <out>/<id>/orig.mp3 (clean), <out>/<id>/markers.json and <out>/originals.json (one row per lecture:
 * frames, true audio length, markers, the lesson file's durationSec · lengthUnits · unitSec for comparison).
 * The lesson files' durationSec was ffprobe's bitrate estimate over the raw bytes (markers included), so it is
 * ~0.15% longer than the audio; the pen clock must be re-based on the clean audio when a voice is attached.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
// the GVA folder (lesson files' legacyPath is relative to it since the four sections — 2026-10-19)
const SRC = arg("--src", "C:/Users/ghddl/Desktop/GVA강의자료");
const OUT = path.resolve(ROOT, arg("--out", ".lecture-media/voice"));
const ONLY = arg("--ids", "").split(",").filter(Boolean);
const WAV = args.includes("--wav");
const AUDIO_HEADER = 726;
const decoder = new TextDecoder("euc-kr");

const FFDIR = "C:/Users/ghddl/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin";
export const ffmpeg = process.env.FFMPEG || path.join(FFDIR, "ffmpeg.exe");
export const ffprobe = process.env.FFPROBE || path.join(FFDIR, "ffprobe.exe");

/** The .gdb records (same reading as build-lecture.mjs; only the audio record is used here). */
function readAudio(file) {
  const buf = fs.readFileSync(file);
  let p = buf.indexOf(Buffer.from(".JPG"));
  while (p > 0 && buf[p - 1] !== 0) p--;
  p -= 15;
  const records = [];
  for (let guard = 0; guard < 1000; guard++) {
    const type = buf[p];
    if (!(type >= 0x0a && type <= 0x2f)) break; // 알파오메가's audio record is type 0x22
    const start = buf.readUInt32LE(p + 3);
    const len = buf.readUInt32LE(p + 7);
    const nul = buf.indexOf(0, p + 15);
    records.push({ start, len, name: decoder.decode(buf.subarray(p + 15, nul)) });
    p = nul + 1;
  }
  const dataStart = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), p);
  const rec = records.find((r) => /\.audio$/i.test(r.name));
  if (!rec) throw new Error(`${path.basename(file)}: no .audio record`);
  const all = buf.subarray(dataStart + rec.start, dataStart + rec.start + rec.len);
  return { header: all.subarray(0, AUDIO_HEADER), mp3: all.subarray(AUDIO_HEADER), lengthUnits: buf.readUInt16LE(172) };
}

// ---------------------------------------------------------------- MP3 frames and the tick markers
const BITRATES = { 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] };
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };
function frameHeader(buf, p) {
  if (p + 4 > buf.length) return null;
  const b2 = buf[p + 1], b3 = buf[p + 2];
  if (buf[p] !== 0xff || (b2 & 0xe0) !== 0xe0) return null;
  const verBits = (b2 >> 3) & 3, layer = (b2 >> 1) & 3;
  if (verBits === 1 || layer !== 1) return null; // layer III only
  const ver = verBits === 3 ? 1 : verBits === 2 ? 2 : 25;
  const brIdx = b3 >> 4, srIdx = (b3 >> 2) & 3, pad = (b3 >> 1) & 1;
  if (brIdx === 0 || brIdx === 15 || srIdx === 3) return null;
  const br = (ver === 1 ? BITRATES[1] : BITRATES[2])[brIdx] * 1000, sr = RATES[ver][srIdx];
  const samples = ver === 1 ? 1152 : 576;
  return { len: Math.floor((samples / 8) * br / sr) + pad, samples, sr, br, ver };
}

/** The frames of the stream's main kind (the first frame's sample rate · bit rate), markers and odd bytes removed. */
export function cleanStream(buf) {
  const first = frameHeader(buf, 0);
  if (!first) throw new Error("no MP3 frame at the start of the audio record");
  const same = (h) => h && h.sr === first.sr && h.br === first.br && h.ver === first.ver;
  const parts = [], markers = [], oddRuns = [];
  let p = 0, frames = 0, samples = 0, sinceMarker = 0;
  while (p < buf.length) {
    const h = frameHeader(buf, p);
    if (same(h)) {
      parts.push(buf.subarray(p, p + h.len));
      frames++; sinceMarker++; samples += h.samples;
      p += h.len;
      continue;
    }
    let q = p;
    while (q < buf.length && !same(frameHeader(buf, q))) q++;
    if (q - p === 2) markers.push([sinceMarker, +(samples / first.sr).toFixed(4)]);
    else oddRuns.push([p, q - p]);
    sinceMarker = 0;
    p = q;
  }
  return { mp3: Buffer.concat(parts), sampleRate: first.sr, bitRate: first.br, frames, audioSec: samples / first.sr, markers, oddRuns };
}

export function probe(file) {
  const out = execFileSync(ffprobe, ["-v", "error", "-f", "mp3", "-show_entries", "format=duration:stream=sample_rate,bit_rate,channels", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(out);
  const s = j.streams?.[0] || {};
  return { duration: Number(j.format?.duration), sampleRate: Number(s.sample_rate), bitRate: Number(s.bit_rate), channels: Number(s.channels) };
}

function lectures() {
  const dir = path.join(ROOT, "content", "lessons", "lecture");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function sourceFile(lesson) {
  const name = lesson.legacyPath;
  const direct = path.join(SRC, name);
  if (fs.existsSync(direct)) return direct;
  for (const sub of fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const f = path.join(SRC, sub.name, name);
    if (fs.existsSync(f)) return f;
  }
  throw new Error(`${lesson.id}: ${name} not found under ${SRC}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const rows = [];
  let worst = 0;
  for (const lesson of lectures()) {
    if (ONLY.length && !ONLY.includes(lesson.id)) continue;
    const { header, mp3: raw } = readAudio(sourceFile(lesson));
    const dir = path.join(OUT, lesson.id);
    fs.mkdirSync(dir, { recursive: true });
    const clean = cleanStream(raw);
    const mp3File = path.join(dir, "orig.mp3");
    fs.writeFileSync(mp3File, clean.mp3);
    fs.writeFileSync(path.join(dir, "markers.json"), JSON.stringify({ id: lesson.id, sampleRate: clean.sampleRate, frames: clean.frames, audioSec: +clean.audioSec.toFixed(4), lengthUnits: lesson.lecture.lengthUnits, markers: clean.markers }));
    const info = probe(mp3File);
    const { lengthUnits, durationSec, unitSec } = lesson.lecture;
    const diff = clean.audioSec - durationSec; // the lesson file's estimate (markers included) is the longer one
    worst = Math.max(worst, Math.abs(diff));
    if (WAV) execFileSync(ffmpeg, ["-v", "error", "-y", "-f", "mp3", "-i", mp3File, "-ac", "1", "-ar", "16000", path.join(dir, "orig.wav")]);
    const teacher = decoder.decode(header.subarray(0x44, 0x60)).replace(/\0.*$/s, "");
    const row = {
      id: lesson.id, sampleRate: clean.sampleRate, bitRate: clean.bitRate, frames: clean.frames, audioSec: +clean.audioSec.toFixed(3), probeSec: +info.duration.toFixed(3),
      rawBytes: raw.length, cleanBytes: clean.mp3.length, markers: clean.markers.length, oddRuns: clean.oddRuns,
      lengthUnits, durationSec, unitSec, unitSecFromAudio: +(clean.audioSec / lengthUnits).toFixed(6), diff: +diff.toFixed(3), teacher,
    };
    rows.push(row);
    console.log(`${lesson.id} ${clean.sampleRate} Hz ${Math.round(clean.bitRate / 1000)} kbps · frames ${clean.frames} · audio ${clean.audioSec.toFixed(2)} s (lesson ${durationSec}, diff ${diff.toFixed(3)}) · markers ${clean.markers.length} / units ${lengthUnits} · odd ${clean.oddRuns.length}`);
  }
  // merge into the table (a run with --ids must not drop the other lectures' rows)
  const file = path.join(OUT, "originals.json");
  const table = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  for (const r of rows) {
    const i = table.findIndex((x) => x.id === r.id);
    if (i > -1) table[i] = r;
    else table.push(r);
  }
  table.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(file, JSON.stringify(table, null, 1));
  const markerMismatch = rows.filter((r) => Math.abs(r.lengthUnits - r.markers) > 2);
  const odd = rows.filter((r) => r.oddRuns.length);
  console.log(`${rows.length} lectures · worst |audio − lesson| ${worst.toFixed(3)} s · markers ≠ units (±2) ${markerMismatch.length} · lectures with odd byte runs ${odd.length} → ${file}`);
  if (worst > 2 || markerMismatch.length) process.exitCode = 1;
}
