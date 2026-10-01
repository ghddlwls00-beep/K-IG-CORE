#!/usr/bin/env node
// Blind-guess packets: every question (or only --ids a,b,c) WITHOUT its answer and WITHOUT the lesson text — LISTENING with the chips
// the learner sees before listening, READING with the prompt and options only. The answer key goes to a separate file OUTSIDE the
// packet folder, so guessers who read only their packet cannot see it.
//   node blind-packets.cjs --out <packet dir> --key <key.json> [--ids file.json] [--per 60]
const fs = require("fs");
const path = require("path");
const { chipsOf, allQuestions } = require("./lib.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const OUT = path.resolve(arg("--out", "blind-packets"));
const KEY = path.resolve(arg("--key", "blind-key.json"));
const PER = Number(arg("--per", 60));
const only = arg("--ids", null) ? new Set(JSON.parse(fs.readFileSync(arg("--ids"), "utf8"))) : null;
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^part-\d+\.json$/.test(f)) fs.unlinkSync(path.join(OUT, f));
const key = {};
const parts = [];
for (const course of ["ld", "reading"]) {
  const items = allQuestions()
    .filter((x) => x.course === course && (!only || only.has(x.q.id)))
    .map(({ lesson, q }) => {
      key[q.id] = q.answer;
      return { id: q.id, ...(course === "ld" ? { chips: chipsOf(lesson) } : {}), prompt: q.prompt, options: q.options };
    });
  for (let i = 0; i < items.length; i += PER) parts.push({ course, items: items.slice(i, i + PER) });
}
parts.forEach((p, i) => fs.writeFileSync(path.join(OUT, `part-${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(p, null, 1)));
fs.writeFileSync(KEY, JSON.stringify(key));
console.log(`${parts.length} parts · ${Object.keys(key).length} questions → ${OUT} · key ${KEY}`);
