#!/usr/bin/env node
/**
 * Phase 5 — READING vocabulary cards, one line per card with the passage context
 * the learner sees the word in, so each gloss can be judged in its sense.
 *
 * Also counts part-of-speech labels that contradict the card's own Korean gloss
 * (the card shows the POS badge next to the word — ReadingLearningView.tsx):
 *   - gloss ends in a verb/adjective form (…다) but POS is n.
 *   - gloss ends in an adnominal form (…한/…인/…운/…른/…는/…은/…던/…적인) but POS is n. or v.
 *   - gloss is a bare noun (no …다 / adnominal / adverb ending) but POS is v.
 *   - word ends in -ly (adverb forms) and POS is not adv., or gloss is adnominal
 * These are heuristics: every flagged card is listed so it can be read, not trusted.
 *
 * Output: out/content/reading-vocab-context.tsv, out/content/reading-vocab-pos.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });
const R = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

const first = (ko) => clean(String(ko).split(/[;,(]/)[0]);
const isPredicate = (g) => /다$/.test(g);
const isAdnominal = (g) => /(한|인|운|른|는|은|던|적인|된|진|쁜|픈|큰|많은|없는|있는|같은)$/.test(g) && !/(인간|기인|원인|개인|부인|시인|노인|죽음|이 은)$/.test(g);
const isAdverbish = (g) => /(게|히|이|로|도|리|께|금|상|시|래|만|저|마|직|히|듯|록|서|면|대신|멀리|함께|아주|너무|매우|항상|이미|곧|다시|아직|정말|가끔|거의|보통|결코|마치|오직|단지|그저|조차|자주|종종|언제나|늘|또한|그러나|하지만|그래서|따라서)$/.test(g);
const LY_NOT_ADV = /^(only|family|early|daily|lovely|friendly|likely|lonely|ugly|silly|holy|elderly|monthly|weekly|yearly|costly|deadly|orderly|supply|reply|apply|rely|fly|july|italy|belly|bully|jelly|ally|rally|assembly|anomaly|monopoly|melancholy|folly|lily|butterfly|curly|chilly|hilly|oily|lively|lowly|timely|kindly|manly|scholarly|cowardly|worldly|unlikely|homely|comely|sickly|jolly|bodily|fly|imply|comply|multiply|underly|firefly|dragonfly|anomaly|italy|ply|sly|wily)$/i;

const pos = { "gloss …다 but n.": [], "gloss adnominal but n./v.": [], "gloss bare noun but v.": [], "-ly adverb form but not adv.": [], "-ly adverb glossed as adjective": [] };
const lines = ["lesson\tword\tpos\tkorean\tcontext"];
let cards = 0;
for (let u = 1; u <= 256; u++) {
  const id = `pr${String(u).padStart(3, "0")}`;
  const main = R(id);
  const sentences = (main.readingSentences || []).map((s) => clean(s.english));
  for (const v of main.readingVocabulary || []) {
    cards++;
    const g = first(v.korean);
    const tag = `${id} ${v.word} (${v.partOfSpeech} ${clean(v.korean)})`;
    if (v.partOfSpeech === "n." && isPredicate(g)) pos["gloss …다 but n."].push(tag);
    else if ((v.partOfSpeech === "n." || v.partOfSpeech === "v.") && isAdnominal(g)) pos["gloss adnominal but n./v."].push(tag);
    else if (v.partOfSpeech === "v." && !isPredicate(g) && !isAdnominal(g) && !/(하는|되는|하기|기|음|함|됨)$/.test(g)) pos["gloss bare noun but v."].push(tag);
    if (/ly$/i.test(v.word) && !LY_NOT_ADV.test(v.word)) {
      if (v.partOfSpeech !== "adv.") pos["-ly adverb form but not adv."].push(tag);
      else if (isAdnominal(g) || /^[A-Za-z가-힣]+$/.test(g) && /(드|트|크)$/.test(g)) pos["-ly adverb glossed as adjective"].push(tag);
    }
    // context: ±7 words around the first occurrence of the word (case-insensitive, word boundary)
    const re = new RegExp(`\\b${v.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    let ctx = "";
    for (const s of sentences) {
      const m = s.match(re);
      if (!m) continue;
      const before = s.slice(0, m.index).split(" ").slice(-7).join(" ");
      const after = s.slice(m.index + m[0].length).split(" ").slice(0, 7).join(" ");
      ctx = `${before}[${m[0]}]${after}`;
      break;
    }
    lines.push([id, v.word, v.partOfSpeech, clean(v.korean), ctx || "(not in passage)"].join("\t"));
  }
}
fs.writeFileSync(path.join(OUT, "reading-vocab-context.tsv"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "reading-vocab-pos.json"), JSON.stringify(pos, null, 1));
console.log(`cards: ${cards}`);
let flagged = new Set();
for (const [k, list] of Object.entries(pos)) {
  console.log(`${String(list.length).padStart(5)}  ${k}   e.g. ${list.slice(0, 4).join(" | ")}`);
  list.forEach((t) => flagged.add(t));
}
console.log(`cards with a POS badge that contradicts their own gloss (heuristic, union): ${flagged.size}`);
