#!/usr/bin/env node
/**
 * LECTURE voice — a SECOND transcript of the noisy lectures (사장님 10-18 "그것도 넣어"): OpenAI gpt-4o-transcribe, piece
 * group by piece group, so the correctors see two independent hearings side by side and spend their care where they
 * differ.
 *
 *   node scripts/lecture/voice/transcribe-openai.mjs --ids lh001,…|high|noisy [--concurrency 6] [--force]
 *
 *   high  = every lh lecture; noisy = high + the middle-school lectures with speech-to-noise under 23 dB (noise.json)
 *
 * Groups: consecutive pieces of segments.json up to 15 s of speech; the clip is cut from orig.mp3 from 0.1 s before the
 * first piece's speech to 0.1 s after the last's. Output <voice>/<id>/second.json: [{ from, to, start, end, text }]
 * (from/to = piece indices). Cost: $0.006 per minute of audio. Key: OPENAI_API_KEY. Paid content: stays in .lecture-media.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { ffmpeg } from "./vad.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("OPENAI_API_KEY is required");
const FORCE = args.includes("--force");
const CONCURRENCY = Math.max(1, Number(arg("--concurrency", 6)) || 6);
const idsArg = arg("--ids", "");
const lectures = fs.readdirSync(VOICE).filter((d) => /^l[mh]\d{3}$/.test(d)).sort();
let ids;
if (idsArg === "high") ids = lectures.filter((d) => d.startsWith("lh"));
else if (idsArg === "noisy") {
  const noise = JSON.parse(fs.readFileSync(path.join(VOICE, "noise.json"), "utf8"));
  ids = lectures.filter((d) => d.startsWith("lh") || noise.some((r) => r.id === d && r.snr < 23));
} else ids = idsArg.split(",").filter(Boolean);

const PROMPT = "한국어로 영어 독해를 가르치는 강의입니다. 선생님이 한국어로 설명하면서 영어 지문의 낱말과 문장을 영어로 읽습니다. 영어는 영어 철자로, 한국어는 한글로 적으세요.";

async function transcribe(buf, attempt = 1) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "audio/mpeg" }), "clip.mp3");
  form.append("model", "gpt-4o-transcribe");
  form.append("response_format", "json");
  form.append("prompt", PROMPT);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
  if (res.ok) return (await res.json()).text || "";
  const detail = (await res.text()).slice(0, 200);
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise((r) => setTimeout(r, 4000 * attempt));
    return transcribe(buf, attempt + 1);
  }
  throw new Error(`OpenAI transcribe ${res.status}: ${detail}`);
}

const jobs = [];
for (const id of ids) {
  const out = path.join(VOICE, id, "second.json");
  if (fs.existsSync(out) && !FORCE) continue;
  const seg = JSON.parse(fs.readFileSync(path.join(VOICE, id, "segments.json"), "utf8"));
  const groups = [];
  for (const [i, p] of seg.pieces.entries()) {
    const last = groups.at(-1);
    if (last && p.speechEnd - last.start <= 15) { last.to = i; last.end = p.speechEnd; }
    else groups.push({ from: i, to: i, start: p.speechStart, end: p.speechEnd });
  }
  jobs.push({ id, out, groups });
}
const totalMin = jobs.reduce((n, j) => n + j.groups.reduce((m, g) => m + (g.end - g.start + 0.2), 0), 0) / 60;
console.log(`lectures ${jobs.length} · groups ${jobs.reduce((n, j) => n + j.groups.length, 0)} · ${totalMin.toFixed(0)} min · ≈ $${(totalMin * 0.006).toFixed(2)}`);

// one queue over all groups of all lectures
const tasks = jobs.flatMap((j) => j.groups.map((g) => ({ j, g })));
let next = 0, done = 0;
const failed = [];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
  for (;;) {
    const t = tasks[next++];
    if (!t) return;
    try {
      const clip = execFileSync(ffmpeg, ["-v", "error", "-f", "mp3", "-i", path.join(VOICE, t.j.id, "orig.mp3"), "-ss", String(Math.max(0, t.g.start - 0.1)), "-to", String(t.g.end + 0.1), "-ac", "1", "-ar", "16000", "-b:a", "48k", "-f", "mp3", "-"], { maxBuffer: 1 << 26 });
      t.g.text = (await transcribe(clip)).trim();
    } catch (e) {
      t.g.text = null;
      failed.push(`${t.j.id} #${t.g.from}: ${e.message}`);
    }
    done++;
    if (done % 200 === 0) console.log(`— ${done}/${tasks.length}`);
  }
}));
for (const j of jobs) {
  if (j.groups.some((g) => g.text === null)) continue; // not written: a re-run fills it
  fs.writeFileSync(j.out, JSON.stringify(j.groups.map((g) => ({ ...g, start: +g.start.toFixed(2), end: +g.end.toFixed(2) })), null, 1));
}
console.log(`done ${done} · failed ${failed.length}`);
for (const f of failed.slice(0, 10)) console.log("  " + f);
if (failed.length) process.exitCode = 1;
