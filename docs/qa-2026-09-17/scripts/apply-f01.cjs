#!/usr/bin/env node
/**
 * F-01 — lesson data that points at audio which cannot be served. Found by the licensed sweep
 * (phase4-functional.md): 3,228 of 3,233 references answered 206; these did not.
 *  - STUDENT s10-4, s10-5 → /audio/middle/p104.mp3, p105.mp3: another course's folder (the gate
 *    answers 403 to a STUDENT licence). They were also the only STUDENT lessons with exactly one
 *    track, which is why only these two showed an extra "전체 듣기" bar above the lesson.
 *  - GRAMMAR I gh1-020 → gh1-020.mp3 + gh1-021.mp3, gh1-021 → gh1-021.mp3: not in storage (404);
 *    gh1-022 … gh1-029 are.
 * Every course except CNN plays the lesson with the Ava voice (unifiedSpeech.ts), so no learner
 * heard these files. The references are removed; the files themselves are not touched (the
 * owner keeps the original recordings, and p104/p105 stay in storage). GRAMMAR I pages without
 * a track still get the "전체 듣기" voice player (page.tsx fallback).
 *   node apply-f01.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const EXPECT = {
  "student/s10-4": ["/audio/middle/p104.mp3"],
  "student/s10-5": ["/audio/middle/p105.mp3"],
  "grammar1/gh1-020": ["/audio/grammar1/gh1-020.mp3", "/audio/grammar1/gh1-021.mp3"],
  "grammar1/gh1-021": ["/audio/grammar1/gh1-021.mp3"],
};
const writes = [];
for (const [rel, srcs] of Object.entries(EXPECT)) {
  const file = path.join(REPO, "content/lessons", `${rel}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
  const crlf = raw.includes("\r\n");
  const ser = (d) => { let s = JSON.stringify(d, null, indent); if (crlf) s = s.replace(/\n/g, "\r\n"); return /\r?\n$/.test(raw) ? s + (crlf ? "\r\n" : "\n") : s; };
  if (ser(data) !== raw) { console.error(`STOP ${rel}: format not reproducible`); process.exit(1); }
  const now = (data.audio || []).map((a) => a.src);
  if (JSON.stringify(now) !== JSON.stringify(srcs)) { console.error(`STOP ${rel}: audio is ${JSON.stringify(now)}`); process.exit(1); }
  data.audio = [];
  writes.push([file, ser(data)]);
}
if (!DRY) for (const [file, out] of writes) fs.writeFileSync(file, out);
console.log(`${writes.length} lessons: dead audio references removed — ${DRY ? "checked (--dry-run)" : "written"}`);
