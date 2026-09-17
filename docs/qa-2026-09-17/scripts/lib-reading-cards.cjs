/**
 * Strict editor for READING vocabulary cards (ISS-10, R-00, RV-00 … RV-27).
 *
 * A lesson's 14 cards live in three places: prNNN.json (shown on the lesson page), prNNN-1.json
 * (shown on the script page — 229 lessons had older, uncorrected cards there, R-00) and
 * src/lib/readingVocabulary.json (scripts only). After a lesson is written here all three are
 * identical.
 *
 * cards(id, hash, lines): the lesson's full new card list, one "word|lemma|pos|meaning" per
 * card, or "=word" to keep that card's lemma/pos/meaning as they are. `hash` = first 10 hex of
 * the SHA-1 of the current main-page card list (rv-dump prints it).
 * Checks (the run stops, nothing written, on any failure):
 *   - exactly 14 cards, unique words and lemmas (scripts/audit-reading-voca.mjs rules)
 *   - every word occurs in the lesson's own passage (case-insensitive, whole token)
 *   - pos is one of n. v. adj. adv. prep. conj. pron.; meaning is non-empty Korean and not the
 *     old "(핵심 어휘)" placeholder
 * Kept cards keep score/reason/examTags; new cards get score 80, examTags ["독해필수"]; freq is
 * recounted from the passage for every card.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const POS = new Set(["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron."]);
const hashOf = (x) => crypto.createHash("sha1").update(JSON.stringify(x)).digest("hex").slice(0, 10);
const tokensOf = (text) => text.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [];

function createCardEditor(REPO) {
  const dir = path.join(REPO, "content/lessons/reading");
  const centralPath = path.join(REPO, "src/lib/readingVocabulary.json");
  const files = new Map();
  const problems = [];
  const done = new Map(); // id -> new card list
  const stats = { kept: 0, changed: 0, replaced: 0 };

  const formatOf = (raw) => ({ crlf: raw.includes("\r\n"), indent: (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length, trailing: /\r?\n$/.test(raw) });
  const serialize = (data, f) => {
    let s = JSON.stringify(data, null, f.indent);
    if (f.crlf) s = s.replace(/\n/g, "\r\n");
    if (f.trailing) s += f.crlf ? "\r\n" : "\n";
    return s;
  };
  const load = (file) => {
    if (files.has(file)) return files.get(file);
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    const f = formatOf(raw);
    if (serialize(data, f) !== raw) problems.push(`${path.basename(file)}: format not reproducible`);
    const e = { raw, data, f };
    files.set(file, e);
    return e;
  };

  function cards(id, hash, lines) {
    const main = load(path.join(dir, `${id}.json`)).data;
    const old = main.readingVocabulary;
    if (hashOf(old) !== hash) return problems.push(`${id}: cards hash ${hashOf(old)} ≠ ${hash} (changed since read)`);
    if (done.has(id)) return problems.push(`${id}: cards given twice`);
    const tokens = tokensOf(main.readingSentences.map((s) => s.english).join(" "));
    const count = (w) => tokens.filter((t) => t === w.toLowerCase()).length;
    const byWord = new Map(old.map((c) => [c.word, c]));
    const next = [];
    for (const raw of lines) {
      const line = raw.trim();
      let card;
      if (line.startsWith("=")) {
        const w = line.slice(1);
        const o = byWord.get(w);
        if (!o) { problems.push(`${id}: "=${w}" but no such card`); continue; }
        card = { ...o };
        stats.kept++;
      } else {
        const parts = line.split("|").map((x) => x.trim());
        if (parts.length !== 4) { problems.push(`${id}: bad card line "${line}"`); continue; }
        const [word, lemma, pos, korean] = parts;
        const o = byWord.get(word);
        if (o) {
          card = { ...o, lemma, partOfSpeech: pos, korean };
          if (o.lemma !== lemma || o.partOfSpeech !== pos || o.korean !== korean) stats.changed++; else stats.kept++;
        } else {
          card = { word, lemma, partOfSpeech: pos, korean, score: 80, reason: "지문 문맥 독해 핵심 어휘 (평가 점수: 80점)", examTags: ["독해필수"], freq: 1 };
          stats.replaced++;
        }
      }
      if (!POS.has(card.partOfSpeech)) problems.push(`${id}: ${card.word} pos "${card.partOfSpeech}"`);
      if (!/[가-힣]/.test(card.korean) || /핵심 어휘/.test(card.korean)) problems.push(`${id}: ${card.word} meaning "${card.korean}"`);
      const c = count(card.word);
      if (c === 0) problems.push(`${id}: card word "${card.word}" is not in the passage`);
      card.freq = c;
      next.push(card);
    }
    if (next.length !== 14) problems.push(`${id}: ${next.length} cards (need 14)`);
    const words = next.map((c) => c.word), lemmas = next.map((c) => c.lemma);
    if (new Set(words).size !== words.length) problems.push(`${id}: duplicate word`);
    if (new Set(lemmas).size !== lemmas.length) problems.push(`${id}: duplicate lemma ${lemmas.filter((l, i) => lemmas.indexOf(l) !== i)}`);
    done.set(id, next);
  }

  function commit({ dry = false } = {}) {
    const central = load(centralPath);
    for (const [id, next] of done) {
      load(path.join(dir, `${id}.json`)).data.readingVocabulary = next;
      load(path.join(dir, `${id}-1.json`)).data.readingVocabulary = next;
      central.data[id] = next;
    }
    if (problems.length) return { ok: false, problems };
    if (!dry) for (const [file, e] of files) {
      const out = serialize(e.data, e.f);
      if (out !== e.raw) fs.writeFileSync(file, out);
    }
    return { ok: true, lessons: done.size, stats };
  }
  return { cards, commit };
}

module.exports = { createCardEditor, hashOf, tokensOf };
