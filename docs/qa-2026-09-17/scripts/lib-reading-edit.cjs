/**
 * Strict editor for READING passages, used by the apply-reading-*.cjs fixes.
 *
 * A READING lesson keeps its passage in three places that must stay identical:
 *   content/lessons/reading/prNNN.json    readingSentences (+ instruction block = English passage)
 *   content/lessons/reading/prNNN-1.json  readingSentences (+ instruction block = Korean passage)
 *   src/lib/readingSentences.json         central copy (scripts only)
 * The page renders readingSentences; the instruction blocks are only a fallback, so for every
 * lesson this editor changes they are rewritten from the sentences.
 * Sentence ids are renumbered reading-NNN-s001… (nothing is saved per sentence id — the view
 * stores only reading speed and notes per lesson).
 *
 *  - sentences(id, hash, pairs): replace the whole passage. `hash` = first 10 hex of the SHA-1 of
 *    the current readingSentences JSON (rd-show prints it) — if the passage changed since it was
 *    read, the run stops.
 *  - en(id, n, from, to) / ko(id, n, from, to): replace a substring that occurs exactly once.
 *  - every file keeps its own format; nothing is written if any problem is found.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const hashOf = (sentences) => crypto.createHash("sha1").update(JSON.stringify(sentences)).digest("hex").slice(0, 10);

function createReadingEditor(REPO) {
  const dir = path.join(REPO, "content/lessons/reading");
  const centralPath = path.join(REPO, "src/lib/readingSentences.json");
  const files = new Map(); // abs path -> { raw, data }
  const problems = [];
  const touched = new Set();
  const log = [];

  const formatOf = (raw) => ({
    crlf: raw.includes("\r\n"),
    indent: (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length,
    trailing: /\r?\n$/.test(raw),
  });
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
  const main = (id) => load(path.join(dir, `${id}.json`)).data;
  const current = new Map(); // id -> working copy of sentences [{english, korean}]
  const work = (id) => {
    if (!current.has(id)) current.set(id, main(id).readingSentences.map((s) => ({ english: s.english, korean: s.korean })));
    return current.get(id);
  };

  function sentences(id, hash, pairs, note = "") {
    const cur = main(id).readingSentences;
    if (hashOf(cur) !== hash) return problems.push(`${id}: passage hash ${hashOf(cur)} ≠ ${hash} (changed since it was read)`);
    if (touched.has(id)) return problems.push(`${id}: whole-passage replacement must come before substring edits`);
    for (const [e, k] of pairs) if (!e || !k || typeof e !== "string" || typeof k !== "string") return problems.push(`${id}: empty sentence in replacement`);
    current.set(id, pairs.map(([english, korean]) => ({ english, korean })));
    touched.add(id);
    log.push(`${id}: passage replaced (${cur.length} → ${pairs.length} sentences)${note ? " — " + note : ""}`);
  }
  function edit(field, id, n, from, to) {
    const s = work(id)[n - 1];
    if (!s) return problems.push(`${id} #${n} not found`);
    const k = s[field].split(from).length - 1;
    if (k !== 1) return problems.push(`${id} #${n} ${field}: "${from}" occurs ${k}× in ${JSON.stringify(s[field])}`);
    s[field] = s[field].replace(from, () => to);
    touched.add(id);
  }
  const en = (id, n, from, to) => edit("english", id, n, from, to);
  const ko = (id, n, from, to) => edit("korean", id, n, from, to);
  /** Rewrite a lesson's instruction blocks from its sentences without changing a sentence. */
  const touch = (id) => { work(id); touched.add(id); };

  /** Apply a function to every sentence of every lesson (global passes). Returns hit count. */
  function everySentence(fn) {
    let hits = 0;
    for (const f of fs.readdirSync(dir).filter((x) => /^pr\d{3}\.json$/.test(x))) {
      const id = f.slice(0, 5);
      for (const s of work(id)) {
        const before = JSON.stringify(s);
        fn(s, id);
        if (JSON.stringify(s) !== before) { hits++; touched.add(id); }
      }
    }
    return hits;
  }

  /**
   * collapseTextBlocks: replace ALL instruction/hints blocks of a touched lesson with ONE
   * instruction block holding the passage (at the position of the first one). 94 of the 512
   * files kept the PDF passage split over several instruction blocks plus a hints block with
   * exam notes ("*ligament: 인대"); only the first was rewritten before, the rest still carried
   * the uncorrected text into the page data.
   */
  function commit({ dry = false, collapseTextBlocks = false } = {}) {
    const central = load(centralPath);
    for (const id of touched) {
      const n = id.slice(2);
      const next = current.get(id).map((s, i) => ({ id: `reading-${n}-s${String(i + 1).padStart(3, "0")}`, english: s.english, korean: s.korean }));
      const m = main(id);
      const script = load(path.join(dir, `${id}-1.json`)).data;
      if (JSON.stringify(m.readingSentences) !== JSON.stringify(script.readingSentences)) problems.push(`${id}: main and script page sentences differed before the change`);
      if (JSON.stringify(m.readingSentences) !== JSON.stringify(central.data[id])) problems.push(`${id}: main and central sentences differed before the change`);
      // a change may not ADD these (a later step may still be the one that removes old ones)
      const hadHangul = m.readingSentences.some((s) => /[가-힣]/.test(s.english));
      for (const s of next) {
        if (/\s{2,}|\n/.test(s.english) || /\s{2,}|\n/.test(s.korean)) problems.push(`${id}: whitespace left in ${JSON.stringify(s)}`);
        if (!hadHangul && /[가-힣]/.test(s.english)) problems.push(`${id}: Hangul in English ${JSON.stringify(s.english)}`);
      }
      m.readingSentences = next;
      script.readingSentences = next;
      central.data[id] = next;
      const setPassage = (doc, text) => {
        const isText = (b) => b.type === "instruction" || b.type === "hints" || b.type === "paragraph";
        const first = doc.blocks.findIndex(isText);
        if (first < 0) return;
        if (collapseTextBlocks) {
          const before = doc.blocks.slice(0, first), after = doc.blocks.slice(first).filter((b) => !isText(b));
          doc.blocks = [...before, { type: "instruction", text }, ...after];
        } else {
          const im = doc.blocks.find((b) => b.type === "instruction");
          if (im) im.text = text;
        }
      };
      setPassage(m, next.map((s) => s.english).join(" "));
      setPassage(script, next.map((s) => s.korean).join(" "));
    }
    if (problems.length) return { ok: false, problems, log };
    if (!dry) for (const [file, e] of files) {
      const out = serialize(e.data, e.f);
      if (out !== e.raw) fs.writeFileSync(file, out);
    }
    return { ok: true, problems, log, lessons: touched.size };
  }

  return { sentences, en, ko, touch, everySentence, commit, hashOf, main, work };
}

module.exports = { createReadingEditor, hashOf };
