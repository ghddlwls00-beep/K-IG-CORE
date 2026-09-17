#!/usr/bin/env node
/**
 * Phase 5 — READING: every passage sentence (English + Korean) and every
 * vocabulary card, for reading item by item.
 *
 * Mechanical checks (printed with counts):
 *   - sentences: main page vs script page (-1) vs src/lib/readingSentences.json differ
 *   - vocabulary: main vs script page vs src/lib/readingVocabulary.json differ (per field)
 *   - card word not found in its passage
 *   - card POS contradicts its own gloss / word form (same rules as the 3,584-card scan)
 *   - Korean with a PDF line-break space inside a word (e.g. "세 계")
 *   - digits in English missing from Korean or vice versa
 *
 * Output: out/content/reading-sentences.tsv, out/content/reading-vocab.tsv,
 *         out/content/reading-checks.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });
const R = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
const centralS = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/readingSentences.json"), "utf8"));
const centralV = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/readingVocabulary.json"), "utf8"));

const checks = {};
const flag = (name, where) => (checks[name] ||= []).push(where);
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const digits = (s) => (s.match(/\d+/g) || []).sort().join(",");
const words = (s) => (s || "").toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);

const posRules = {
  "gloss -하다/-되다 but n.": (v) => v.partOfSpeech === "n." && /(하다|되다|시키다)$/.test(clean(v.korean.split(/[,;(]/)[0])),
  "gloss -한/-적인 but n.": (v) => v.partOfSpeech === "n." && /(한|적인|스러운|로운)$/.test(clean(v.korean.split(/[,;(]/)[0])),
  "-ly word not adv.": (v) => /ly$/i.test(v.word) && !/^(only|family|early|daily|lovely|friendly|likely|lonely|ugly|silly|holy|elderly|monthly|weekly|yearly|costly|deadly|orderly|supply|reply|apply|rely|fly|july|italy|belly|bully|jelly|ally|rally|assembly|anomaly|monopoly|melancholy|folly|lily|italy|july|butterfly|curly|chilly|hilly|oily|lively|lowly|timely|kindly|manly|scholarly|cowardly|worldly|unlikely|underly)$/i.test(v.word) && v.partOfSpeech !== "adv.",
  "comparative/superlative glossed without 더/가장": (v) => /(er|est)$/i.test(v.word) && v.lemma && v.lemma !== v.word && v.word.toLowerCase().startsWith(v.lemma.toLowerCase().replace(/e$/, "")) && /^(adj\.|adv\.|n\.)$/.test(v.partOfSpeech) && !/(더|가장|최)/.test(v.korean) && v.lemma.length >= 3,
};

const sLines = ["lesson\tn\tEN\tKO"];
const vLines = ["lesson\tword\tlemma\tpos\tkorean\tinPassage\tscriptPageKorean"];
for (let u = 1; u <= 256; u++) {
  const id = `pr${String(u).padStart(3, "0")}`;
  const main = R(id);
  const script = R(`${id}-1`);
  const ms = main.readingSentences || [];
  const ss = script.readingSentences || [];
  const cs = centralS[id] || [];
  if (JSON.stringify(ms) !== JSON.stringify(ss)) flag("sentences main≠script page", id);
  if (JSON.stringify(ms) !== JSON.stringify(cs)) flag("sentences main≠central", id);
  ms.forEach((s, i) => {
    sLines.push([id, i + 1, clean(s.english), clean(s.korean)].join("\t"));
    if (/[가-힣] [가-힣](?=[가-힣]*[다요]\b)/.test(s.korean) && /[가-힣]{1,2} [가-힣]{1,2}(에서|의|은|는|이|가|을|를)/.test(s.korean)) flag("Korean PDF space inside word (heuristic)", `${id} #${i + 1}`);
    if (digits(s.english) !== digits(s.korean) && (/\d/.test(s.english) || /\d/.test(s.korean))) flag("digits differ EN/KO", `${id} #${i + 1}`);
    if (!clean(s.korean)) flag("empty Korean", `${id} #${i + 1}`);
  });
  const passage = words(ms.map((s) => s.english).join(" "));
  const mv = main.readingVocabulary || [];
  const sv = script.readingVocabulary || [];
  const cv = centralV[id] || [];
  mv.forEach((v, i) => {
    const onPage = passage.includes(v.word.toLowerCase());
    if (!onPage) flag("card word not in passage", `${id} ${v.word}`);
    for (const [name, rule] of Object.entries(posRules)) if (rule(v)) flag(name, `${id} ${v.word} (${v.partOfSpeech} ${v.korean})`);
    const s = sv[i] || {};
    const c = cv[i] || {};
    for (const f of ["word", "lemma", "partOfSpeech", "korean"]) {
      if (s[f] !== v[f]) flag(`vocab main≠script page: ${f}`, `${id} ${v.word}`);
      if (c[f] !== v[f]) flag(`vocab main≠central: ${f}`, `${id} ${v.word}`);
    }
    vLines.push([id, v.word, v.lemma, v.partOfSpeech, clean(v.korean), onPage ? "" : "NOT-IN-PASSAGE", s.korean !== v.korean ? clean(s.korean) : ""].join("\t"));
  });
}
fs.writeFileSync(path.join(OUT, "reading-sentences.tsv"), sLines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "reading-vocab.tsv"), vLines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "reading-checks.json"), JSON.stringify(checks, null, 1));
console.log(`reading: ${sLines.length - 1} sentences, ${vLines.length - 1} cards`);
for (const [name, list] of Object.entries(checks)) console.log(`${String(list.length).padStart(5)}  ${name}   e.g. ${list.slice(0, 5).join(" | ")}`);
