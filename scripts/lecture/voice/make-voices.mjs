#!/usr/bin/env node
/**
 * LECTURE voice — the 200-lecture run of the owner-approved recipe (2026-10-18, lh082; docs/lecture/AI음성/연구-기록.md 기준):
 * per lecture, read-and-retime.mjs with the fixed settings below, then the pronunciation check's failures re-read (their
 * cached pieces deleted, at most 2 more rounds), then the voice copied to .lecture-media/audio/lecture/<id>/voice.mp3 and
 * listed in docs/lecture/voice-manifest.json (its time map is already in docs/lecture/voice/).
 *
 *   node scripts/lecture/voice/make-voices.mjs --ids lm001,…|all [--concurrency 3]
 *
 * Needs segments.edited.json (the checked text) for every lecture it makes — lectures without one are skipped and listed.
 * Results: .lecture-media/voice/make-voices.json (per lecture: seconds, anchors, word anchors, pronunciation, rounds).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const MEDIA = path.join(ROOT, ".lecture-media", "audio", "lecture");
const MANIFEST = path.join(ROOT, "docs", "lecture", "voice-manifest.json");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const idsArg = arg("--ids", "");
const all = fs.readdirSync(VOICE).filter((d) => /^l[mh]\d{3}$/.test(d)).sort();
const ids = idsArg === "all" ? all : idsArg.split(",").filter(Boolean);
const CONCURRENCY = Math.max(1, Number(arg("--concurrency", 3)) || 3);

// THE RECIPE (사장님 2026-10-18 "이정도면 만족한다") — change only with the owner
export const RECIPE = {
  engine: "openai", voice: "echo", speed: "1.04", groupSec: "12", align: "scribe", penLead: "0", maxGap: "1.2",
  style: "You are a warm, experienced Korean English teacher talking to a student sitting right next to you — not reading, talking. Speak like a real person: natural rhythm, small breaths and pauses where a speaker would take them, emphasis on the key words you are explaining, a little rise and fall in the voice, a friendly smile in the tone. Brisk, never rushed. Korean is Korean; English words and phrases are pronounced in clear, natural English. Say exactly what is written, nothing added.",
};
const recipeArgs = ["--engine", RECIPE.engine, "--voice", RECIPE.voice, "--speed", RECIPE.speed, "--group-sec", RECIPE.groupSec, "--align", RECIPE.align, "--pen-lead", RECIPE.penLead, "--max-gap", RECIPE.maxGap, "--style", RECIPE.style];
const OUT_DIR = (id) => path.join(VOICE, id, `retime-openai-${RECIPE.voice}-s${Number(RECIPE.speed)}`);

const resultsFile = path.join(VOICE, "make-voices.json");
const results = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : {};
const skipped = ids.filter((id) => !fs.existsSync(path.join(VOICE, id, "segments.edited.json")));

async function one(id) {
  let stats = null;
  const complete = new Set();
  // round 1: as is · round 2: the failed readings read afresh · rounds 3–4: read with the short "every word to the end"
  // instruction (the long style line is what makes gpt-4o-mini-tts drop its last words now and then — lh082 #15 "with the
  // jeweler", #11 "wish", 2026-10-18). What still fails after round 4 is listed for a person.
  for (let round = 1; round <= 4; round++) {
    const extra = complete.size ? ["--complete", [...complete].join(",")] : [];
    await run("node", [path.join(import.meta.dirname, "read-and-retime.mjs"), "--ids", id, ...recipeArgs, ...extra], { env: process.env, maxBuffer: 1 << 26 });
    stats = JSON.parse(fs.readFileSync(path.join(OUT_DIR(id), "stats.json"), "utf8"));
    stats.round = round;
    const failed = (stats.pronunciationDetail || []).filter((x) => x.fail);
    if (!failed.length || round === 4) break;
    for (const x of failed) {
      for (const ext of ["pcm", "alignment.json"]) fs.rmSync(path.join(OUT_DIR(id), `r-${x.cacheKey}.${ext}`), { force: true });
      if (round >= 2) for (const m of x.members) complete.add(m);
    }
  }
  const ungroup = complete; // (kept for the results field name)
  fs.mkdirSync(path.join(MEDIA, id), { recursive: true });
  fs.copyFileSync(path.join(OUT_DIR(id), "voice.mp3"), path.join(MEDIA, id, "voice.mp3"));
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8").replace(/^﻿/, "")) : {};
  manifest[id] = { src: `/audio/lecture/${id}/voice.mp3`, durationSec: stats.voiceSec };
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
  results[id] = { voiceSec: stats.voiceSec, origSpan: stats.origSpan, anchors: stats.anchors, wordAnchors: stats.wordAnchors, perFiveSec: +((stats.wordAnchors / stats.voiceSec) * 5).toFixed(2), pronunciationBelow: stats.pronunciation?.below || [], missingEnglish: stats.pronunciation?.missingEnglish || [], pronunciationMin: stats.pronunciation?.min ?? null, rounds: stats.round, ungrouped: [...ungroup] };
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 1));
  return `${id}: ${stats.voiceSec.toFixed(1)} s · word anchors ${stats.wordAnchors} (${results[id].perFiveSec}/5 s) · pronunciation below 0.9: ${results[id].pronunciationBelow.length} · rounds ${stats.round}`;
}

const todo = ids.filter((id) => !skipped.includes(id));
console.log(`make ${todo.length} · skipped (no checked text) ${skipped.length}${skipped.length ? `: ${skipped.slice(0, 20).join(" ")}` : ""}`);
let next = 0;
const failed = [];
// the manifest is rewritten by each worker: serialise its writes by running them in the same tick order
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, async () => {
  for (;;) {
    const id = todo[next++];
    if (!id) return;
    try { console.log(await one(id)); } catch (e) { failed.push(`${id}: ${String(e.stderr || e.message).replace(/sk-[A-Za-z0-9_-]+/g, "<key>").slice(-300)}`); console.log(`FAIL ${id}`); }
  }
}));
console.log(`done ${todo.length - failed.length}/${todo.length} · failed ${failed.length}`);
for (const f of failed) console.log("  " + f);
if (failed.length) process.exitCode = 1;
