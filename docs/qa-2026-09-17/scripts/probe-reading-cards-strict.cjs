#!/usr/bin/env node
/**
 * Follow-up to probe-bundle-leak-scope.cjs after the ISS-00 fix (anonymous GETs only).
 *
 * The "vocabCardsLikelyPresent" count there is loose on purpose: a card counts if
 * its Korean meaning AND its English word each appear ANYWHERE in the public JS.
 * Common pairs ("tree"/"나무") are in the free VOCA dictionary and UI text, so the
 * loose count cannot reach 0 even with no leak. This script checks the card as a
 * record, the way a bundled data file would carry it:
 *
 *   strict   = "word" + <word> + "lemma" + <lemma>   (key order of every card)
 *   reason   = the card reason text "지문 문맥 독해 핵심 어휘" (only in READING cards)
 *   keys     = the data keys readingSentences / readingVocabulary
 *
 * Pages: /reading/pr001 (free), /reading (list). Output: out/reading-cards-strict.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const flat = (s) => (s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/[^A-Za-z0-9가-힣]+/g, "");
const L = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));

(async () => {
  const urls = new Set();
  for (const p of ["/reading/pr001", "/reading"]) {
    const html = await (await fetch(BASE + p)).text();
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+\.js/g)) urls.add(m[0]);
  }
  let raw = "";
  for (const u of urls) raw += "\n" + (await (await fetch(BASE + u)).text());
  const text = flat(raw);
  let total = 0, strict = 0, loose = 0;
  const examples = [];
  for (let u = 3; u <= 256; u++) {
    const id = `pr${String(u).padStart(3, "0")}`;
    for (const v of L(id).readingVocabulary || []) {
      total++;
      if (text.includes("word" + flat(v.word) + "lemma" + flat(v.lemma))) { strict++; if (examples.length < 5) examples.push(`${id}: ${v.word}`); }
      if (text.includes(flat(v.korean)) && text.includes(flat(v.word))) loose++;
    }
  }
  const result = {
    at: new Date().toISOString(),
    publicChunks: urls.size,
    jsKB: Math.round(raw.length / 1024),
    paidCards: total,
    strictRecordMatches: strict,
    looseWordAndMeaningAnywhere: loose,
    reasonTextPresent: text.includes(flat("지문 문맥 독해 핵심 어휘")),
    readingSentencesKeyPresent: raw.includes("readingSentences"),
    readingVocabularyKeyPresent: raw.includes("readingVocabulary"),
    examples,
  };
  console.log(result);
  fs.writeFileSync(path.join(__dirname, "../out/reading-cards-strict.json"), JSON.stringify(result, null, 1));
})();
