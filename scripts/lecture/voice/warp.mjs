/**
 * LECTURE voice — word-level time-warp of a synthesised piece onto the teacher's timeline (사장님 10-17: "기존 필기와 속도 ·
 * 싱크가 맞을까?" → 문장 시작뿐 아니라 낱말 단위까지).
 *
 * anchors: [[origSec, synthSec], …] — the same word said by the teacher (whisper word time, piece-relative) and by the
 * synthesiser (ElevenLabs alignment, piece-relative). Between consecutive anchors the synth audio is stretched or
 * compressed (atempo — pitch kept) so each anchor lands exactly on the teacher's time; the piece ends at targetSec.
 * An anchor whose neighbouring segments would need a ratio outside 0.8–1.25 is dropped (the worst first) until every
 * segment is inside, so the voice never sounds rushed or dragged between two words; with no usable anchors the piece
 * is fitted as a whole (fit.mjs).
 *
 * warpPiece(synthWav, targetSec, anchors, outWav) → { anchorsUsed, anchorsDropped, segments: [{ratio}], method }
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { decode, ffmpeg } from "./vad.mjs";
import { writeWav } from "./fit.mjs";

const SR = 24000;
const MIN_RATIO = 0.8, MAX_RATIO = 1.25;

function tempo(samples, ratio) {
  // atempo = input/output: ratio > 1 compresses (speeds up)
  if (Math.abs(ratio - 1) < 0.002 || samples.length < SR * 0.05) return samples;
  const r = Math.min(2, Math.max(0.5, ratio));
  const raw = execFileSync(ffmpeg, ["-v", "error", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", "-", "-af", `atempo=${r.toFixed(6)}`, "-f", "f32le", "-"], { input: Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

export function warpPiece(synthWav, targetSec, anchors, outWav) {
  const s = decode(synthWav, { sr: SR });
  const synthSec = s.length / SR;
  // knots: piece start and end are always anchors
  let knots = [[0, 0], ...anchors.filter(([o, y]) => o > 0.05 && o < targetSec - 0.05 && y > 0.05 && y < synthSec - 0.05).sort((a, b) => a[0] - b[0]), [targetSec, synthSec]];
  // monotonic in both: drop any anchor that steps back
  knots = knots.filter((k, i, arr) => i === 0 || (k[0] > arr[i - 1][0] + 0.02 && k[1] > arr[i - 1][1] + 0.02));
  const given = knots.length - 2;
  // drop the anchor with the worst segment ratio until all segments are inside the range
  for (;;) {
    const ratios = knots.slice(1).map((k, i) => (k[1] - knots[i][1]) / (k[0] - knots[i][0]));
    let worst = -1, worstScore = 0;
    for (let i = 0; i < ratios.length; i++) {
      const r = ratios[i];
      const score = r < MIN_RATIO ? MIN_RATIO / r : r > MAX_RATIO ? r / MAX_RATIO : 0;
      if (score > worstScore) { worstScore = score; worst = i; }
    }
    if (worst < 0 || knots.length <= 2) break;
    // the segment i runs from knot i to knot i+1: remove the inner knot nearer the middle of the piece
    const cand = [i2(worst), i2(worst + 1)].filter((k) => k > 0 && k < knots.length - 1);
    if (!cand.length) break;
    knots.splice(cand[0], 1);
  }
  function i2(k) { return k; }
  const segments = [];
  const out = new Float32Array(Math.round(targetSec * SR));
  for (let i = 0; i + 1 < knots.length; i++) {
    const [o0, y0] = knots[i], [o1, y1] = knots[i + 1];
    const ratio = (y1 - y0) / (o1 - o0);
    const piece = tempo(s.subarray(Math.round(y0 * SR), Math.round(y1 * SR)), ratio);
    const at = Math.round(o0 * SR), len = Math.round((o1 - o0) * SR);
    const n = Math.min(len, piece.length, out.length - at);
    out.set(piece.subarray(0, n), at);
    segments.push({ origFrom: +o0.toFixed(3), origTo: +o1.toFixed(3), ratio: +ratio.toFixed(3) });
  }
  const fade = Math.min(240, out.length);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  writeWav(outWav, out, SR);
  const used = knots.length - 2;
  return { anchorsGiven: anchors.length, anchorsUsed: used, anchorsDropped: given - used, segments, method: used ? "warp" : "whole", synthSec: +synthSec.toFixed(3), outSec: +targetSec.toFixed(3) };
}
void fs; void os; void path;
