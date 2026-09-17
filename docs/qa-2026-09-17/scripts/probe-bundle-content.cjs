#!/usr/bin/env node
/**
 * Phase 3/8 — does PAID lesson text ship inside the public JavaScript?
 * probe-entitlement-all.cjs checked the HTML and the RSC payload of every lesson;
 * this checks the /_next/static JS chunks that any visitor (no cookie) downloads
 * from the home page, every course list and one free lesson of every course.
 * Needles: distinctive strings from PAID lessons of each course.
 * Output: out/bundle-content.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const L = (c, id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", c, `${id}.json`), "utf8"));
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const firstLong = (arr) => arr.find((t) => t && t.length > 40).slice(0, 40);
const sentencesOf = (d) => d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text));

const needles = {
  "reading pr100 sentence": L("reading", "pr100").readingSentences[1].english.slice(0, 40),
  "reading pr200 sentence": L("reading", "pr200").readingSentences[0].english.slice(0, 40),
  "reading pr200 vocab gloss": (() => { const v = L("reading", "pr200").readingVocabulary.find((x) => x.korean.length > 6); return `"${v.word}"`; })(),
  "ld d150 script": firstLong(scripts.d150.map((r) => r.en)),
  "grammar2 gh2-030 answer": firstLong(sentencesOf(L("grammar2", "gh2-030"))),
  "grammar1 gh1-059 answer": firstLong(sentencesOf(L("grammar1", "gh1-059"))),
  "student s10-1 sentence": firstLong(sentencesOf(L("student", "s10-1"))),
};

(async () => {
  const pages = ["/", "/reading", "/ld", "/grammar1", "/grammar2", "/student", "/phonics", "/reading/pr001", "/ld/d001", "/grammar1/gh1-006", "/grammar2/gh2-007", "/student/s1-1", "/phonics/mv1-01"];
  const chunks = new Map();
  for (const p of pages) {
    const html = await (await fetch(BASE + p)).text();
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+\.js/g)) {
      if (!chunks.has(m[0])) chunks.set(m[0], new Set());
      chunks.get(m[0]).add(p);
    }
  }
  const hits = {};
  const sizes = [];
  for (const [c, from] of chunks) {
    const js = await (await fetch(BASE + c)).text();
    sizes.push({ kb: Math.round(js.length / 1024), chunk: c, loadedBy: [...from] });
    for (const [name, n] of Object.entries(needles)) if (js.includes(n)) (hits[name] ||= []).push({ chunk: c, kb: Math.round(js.length / 1024), loadedBy: [...from] });
  }
  sizes.sort((a, b) => b.kb - a.kb);
  const out = { at: new Date().toISOString(), needles, chunks: chunks.size, largest: sizes.slice(0, 8), hits };
  fs.writeFileSync(path.join(__dirname, "../out/bundle-content.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
