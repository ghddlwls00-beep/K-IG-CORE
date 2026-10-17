#!/usr/bin/env node
/**
 * LECTURE voice — step J: does a made voice sit on the ORIGINAL recording's timeline? (numbers, per lecture)
 *
 *   node scripts/lecture/voice/check-voice.mjs --id lm001 --new <file.mp3|wav> [--orig <file>] [--shift 0.5] [--json <out>]
 *
 *   --orig   the clean original (default .lecture-media/voice/<id>/orig.mp3 — extract-original.mjs)
 *   --shift  BREAK TEST: play the new file this many seconds late (silence put in front) — ① and ② must then FAIL
 *
 * Checks (the 지시문's J):
 *   ① length: |new − original| ≤ 0.05 s
 *   ② timing: the two energy envelopes (20 ms frames) are compared in 5 s windows, each window's best lag searched
 *      within ±1 s — ≥ 95% of windows must sit within ±0.3 s and their median correlation be ≥ 0.8. (Speech onsets
 *      are reported too, but a changed voice carries breath and room tone at a different level, so pauses merge or
 *      split and onset counting alone misjudged a perfectly aligned sample — 2026-10-17, lm001 Hyuk: lag 0 ms in
 *      every window, correlation 0.97–0.99, yet 14 of 20 onsets "missed".)
 *   ③ stretch ratios: if <new>.segments.json exists beside the file (synth step), none outside 0.8–1.25
 *   ④ noise where the original is silent: inside the original's silences (≥ 0.5 s long, 0.1 s guard at both ends)
 *      no new-voice frame above −40 dBFS that is also louder than the original's own frame there + 3 dB
 *      (the original is a noisy room recording with the odd click — the new voice must not ADD sounds)
 *   ⑤ pen sync: at ≥ 5 writing bursts spread over the lecture (pen.json), the energy envelopes of the two files
 *      within ±3 s agree (correlation ≥ 0.8) — the words said while writing are said at the same time
 *   Both files are decoded with ffmpeg to 16 kHz mono float. PASS/FAIL per check and overall; exit 1 on FAIL.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { decode, energyDb, speechMask, runs, SR, HOP } from "./vad.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const ID = arg("--id");
const NEW = arg("--new");
if (!ID || !NEW) throw new Error("--id <lecture> --new <file> are required");
const ORIG = arg("--orig", path.join(ROOT, ".lecture-media", "voice", ID, "orig.mp3"));
const SHIFT = Number(arg("--shift", 0)) || 0;
const JSON_OUT = arg("--json", null);

function corr(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 1;
}

const orig = decode(ORIG);
const made = decode(NEW, { shiftSec: SHIFT });
const report = { id: ID, new: NEW, shift: SHIFT, checks: {} };
const sec = (frames) => +(frames * HOP / SR).toFixed(2);

// ① length
const lenO = orig.length / SR, lenN = made.length / SR;
report.checks.length = { origSec: +lenO.toFixed(3), newSec: +lenN.toFixed(3), diff: +(lenN - lenO).toFixed(3), pass: Math.abs(lenN - lenO) <= 0.05 };

// ② timing: envelope lag per 5 s window
const dbO = energyDb(orig), dbN = energyDb(made);
const mO = speechMask(dbO), mN = speechMask(dbN);
const n = Math.min(dbO.length, dbN.length);
const WIN = 250, MAX_LAG = 50; // frames: 5 s windows, ±1 s
const windows = [];
for (let s = 0; s + WIN <= n; s += WIN) {
  let best = 0, bestC = -2;
  for (let lag = -MAX_LAG; lag <= MAX_LAG; lag++) {
    let sab = 0, saa = 0, sbb = 0;
    for (let i = s; i < s + WIN; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      const x = dbO[i] - mO.floor, y = dbN[j] - mN.floor;
      sab += x * y; saa += x * x; sbb += y * y;
    }
    const c = saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
    if (c > bestC) { bestC = c; best = lag; }
  }
  windows.push({ at: sec(s), lagMs: best * 20, corr: +bestC.toFixed(3) });
}
const within = windows.filter((w) => Math.abs(w.lagMs) <= 300).length;
const corrs = windows.map((w) => w.corr).sort((a, b) => a - b);
const medianCorr = corrs.length ? corrs[Math.floor(corrs.length / 2)] : 0;
const worst = windows.slice().sort((a, b) => Math.abs(b.lagMs) - Math.abs(a.lagMs)).slice(0, 5);
const onsetsO = runs(mO.mask, 1).map(([s]) => s), onsetsN = runs(mN.mask, 1).map(([s]) => s);
const matched = onsetsO.filter((o) => onsetsN.some((x) => Math.abs(x - o) * HOP / SR <= 0.3)).length;
report.checks.timing = {
  windows: windows.length, within300ms: within, rate: +(within / Math.max(1, windows.length)).toFixed(3), medianCorr, worstLags: worst,
  onsets: { orig: onsetsO.length, new: onsetsN.length, matched },
  pass: windows.length > 0 && within / windows.length >= 0.95 && medianCorr >= 0.8,
};

// ③ stretch ratios (from the synth step's segments file, when there is one)
const segFile = NEW.replace(/\.(mp3|wav)$/i, "") + ".segments.json";
if (fs.existsSync(segFile)) {
  const segs = JSON.parse(fs.readFileSync(segFile, "utf8"));
  const ratios = (segs.segments || segs).map((s) => s.stretch).filter((r) => typeof r === "number");
  const out = ratios.filter((r) => r < 0.8 || r > 1.25);
  report.checks.stretch = { segments: ratios.length, outside: out.length, min: ratios.length ? +Math.min(...ratios).toFixed(3) : null, max: ratios.length ? +Math.max(...ratios).toFixed(3) : null, pass: out.length === 0 };
} else report.checks.stretch = { segments: null, note: "no segments file — not a synthesised voice, or the synth step did not write one", pass: true };

// ④ noise in the original's silences
const silences = runs(mO.mask, 0).filter(([s, e]) => e - s >= 25);
let loud = 0;
const loudAt = [];
for (const [s, e] of silences) {
  for (let f = s + 5; f < e - 5 && f < dbN.length; f++) {
    if (dbN[f] > -40 && dbN[f] > dbO[f] + 3) { loud++; if (loudAt.length < 10) loudAt.push(sec(f)); }
  }
}
report.checks.silence = { origSilences: silences.length, loudFrames: loud, firstAt: loudAt, pass: loud === 0 };

// ⑤ pen sync at writing bursts
const penFile = path.join(ROOT, ".lecture-media", "audio", "lecture", ID, "pen.json");
if (fs.existsSync(penFile)) {
  const pen = JSON.parse(fs.readFileSync(penFile, "utf8"));
  const unitSec = (lenO / pen.lengthUnits) || pen.unitSec; // the clean audio's own unit
  const starts = pen.strokes.map((s) => s[0] * unitSec).sort((a, b) => a - b);
  // bursts: ≥ 5 strokes within 4 s; pick the first burst in each of 6 equal parts of the lecture
  const bursts = [];
  for (let part = 0; part < 6; part++) {
    const lo = (lenO * part) / 6, hi = (lenO * (part + 1)) / 6;
    const inPart = starts.filter((t) => t >= lo && t < hi);
    for (let i = 0; i + 4 < inPart.length; i++) {
      if (inPart[i + 4] - inPart[i] <= 4) { bursts.push(+inPart[i].toFixed(2)); break; }
    }
  }
  const rows = bursts.map((t) => {
    const a = Math.max(0, Math.round((t - 3) * SR / HOP)), b = Math.min(dbO.length, dbN.length, Math.round((t + 3) * SR / HOP));
    const c = corr(dbO.subarray(a, b), dbN.subarray(a, b));
    return { at: t, corr: +c.toFixed(3), speechOrig: sec(mO.mask.subarray(a, b).reduce((x, y) => x + y, 0)), speechNew: sec(mN.mask.subarray(a, b).reduce((x, y) => x + y, 0)) };
  });
  const bad = rows.filter((r) => r.corr < 0.8);
  report.checks.pen = { bursts: rows, pass: rows.length >= 5 && bad.length === 0 };
} else report.checks.pen = { note: `${penFile} missing — run build-lecture.mjs`, pass: false };

report.pass = Object.values(report.checks).every((c) => c.pass);
for (const [name, c] of Object.entries(report.checks)) {
  const { pass, ...rest } = c;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${JSON.stringify(rest).slice(0, 220)}`);
}
console.log(`${report.pass ? "PASS" : "FAIL"} ${ID}${SHIFT ? ` (break test: shifted ${SHIFT} s)` : ""}`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
process.exit(report.pass ? 0 : 1);
