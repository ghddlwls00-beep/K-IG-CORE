/**
 * Small, strict editor for lesson JSON files used by the apply-*.cjs content fixes.
 *
 *  - keeps each file's own format (indent, CRLF/LF, trailing newline) and refuses to
 *    write a file whose format it cannot reproduce byte for byte
 *  - every change states the CURRENT value; if it differs, the whole run stops before
 *    anything is written (so a fix list can never half-apply or hit the wrong item)
 *  - an item change is applied to the page AND to its split pages (-1, -2) when they
 *    carry the same item with the same current value
 */
const fs = require("fs");
const path = require("path");

/**
 * @param {object} [opts]
 * @param {string[]} [opts.splits] suffixes of split copies of a page (GRAMMAR I: -1/-2). GRAMMAR II
 *   uses "-1" for the KOREAN page, not a copy, so it passes [].
 */
function createEditor(REPO, course, opts = {}) {
  const splits = opts.splits ?? ["-1", "-2"];
  const dir = path.join(REPO, "content/lessons", course);
  const cache = new Map(); // id -> { raw, data, format }
  const touched = new Set();
  const log = [];
  const problems = [];

  function formatOf(raw) {
    const crlf = raw.includes("\r\n");
    const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
    const trailing = /\r?\n$/.test(raw);
    return { crlf, indent, trailing };
  }
  function serialize(data, f) {
    let s = JSON.stringify(data, null, f.indent);
    if (f.crlf) s = s.replace(/\n/g, "\r\n");
    if (f.trailing) s += f.crlf ? "\r\n" : "\n";
    return s;
  }
  function load(id) {
    if (cache.has(id)) return cache.get(id);
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    const format = formatOf(raw);
    if (serialize(data, format) !== raw) problems.push(`${id}: format not reproducible, refusing to edit`);
    const entry = { file, raw, data, format };
    cache.set(id, entry);
    return entry;
  }
  const pagesOf = (id) => [id, ...splits.map((s) => `${id}${s}`)].map((p) => [p, load(p)]).filter(([, e]) => e);
  const findItem = (entry, n) => {
    for (const b of entry.data.blocks || []) {
      if (b.type !== "sentences") continue;
      const it = (b.items || []).find((x) => x.n === String(n));
      if (it) return { block: b, item: it };
    }
    return null;
  };
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  /** Change an item's text and/or alternatives. `from` must match on the main page. */
  function item(id, n, from, to, note = "") {
    const pages = pagesOf(id);
    const main = pages.find(([p]) => p === id);
    if (!main) return problems.push(`${id} not found`);
    const hit = findItem(main[1], n);
    if (!hit) return problems.push(`${id} #${n} not found`);
    for (const k of Object.keys(from)) {
      if (!same(hit.item[k], from[k])) return problems.push(`${id} #${n} ${k} is ${JSON.stringify(hit.item[k])}, expected ${JSON.stringify(from[k])}`);
    }
    for (const [p, entry] of pages) {
      const h = findItem(entry, n);
      if (!h) continue;
      if (p !== id && !Object.keys(from).every((k) => same(h.item[k], from[k]))) {
        // A split page that already differs is reported, not overwritten blindly.
        problems.push(`${p} #${n} differs from ${id} before the change: ${JSON.stringify(h.item)}`);
        continue;
      }
      for (const [k, v] of Object.entries(to)) {
        if (v === undefined || (Array.isArray(v) && v.length === 0)) delete h.item[k];
        else h.item[k] = v;
      }
      touched.add(p);
      log.push(`${p} #${n}${note ? ` (${note})` : ""}`);
    }
  }

  /** Set a split page's item to the main page's current item (after other edits). */
  function syncSplit(id, split, n) {
    const main = load(id);
    const part = load(split);
    const m = main && findItem(main, n);
    const s = part && findItem(part, n);
    if (!m || !s) return problems.push(`sync ${id}/${split} #${n} missing`);
    s.item.text = m.item.text;
    if (m.item.alternatives) s.item.alternatives = [...m.item.alternatives];
    else delete s.item.alternatives;
    touched.add(split);
    log.push(`${split} #${n} = ${id} #${n}`);
  }

  /** Insert a new item right after item `afterN` in the same sentences block (page + splits that have afterN). */
  function insertAfter(id, afterN, newItem) {
    for (const [p, entry] of pagesOf(id)) {
      const h = findItem(entry, afterN);
      if (!h) continue;
      if (findItem(entry, newItem.n)) { problems.push(`${p} #${newItem.n} already exists`); continue; }
      const i = h.block.items.indexOf(h.item);
      h.block.items.splice(i + 1, 0, JSON.parse(JSON.stringify(newItem)));
      touched.add(p);
      log.push(`${p} + #${newItem.n}`);
    }
  }

  /** Replace a non-sentence block's text (by exact current text) on a page and its splits. */
  function blockText(id, fromText, toText) {
    let found = 0;
    for (const [p, entry] of pagesOf(id)) {
      for (const b of entry.data.blocks || []) {
        if (b.type !== "sentences" && b.text === fromText) {
          b.text = toText;
          touched.add(p);
          found++;
        }
      }
    }
    if (!found) problems.push(`${id}: block text not found: ${fromText.slice(0, 50)}`);
    else log.push(`${id} block text (${found})`);
  }

  /** Remove non-sentence blocks whose text matches exactly (page + splits). */
  function removeBlocks(id, texts) {
    let removed = 0;
    for (const [p, entry] of pagesOf(id)) {
      const before = entry.data.blocks.length;
      entry.data.blocks = entry.data.blocks.filter((b) => b.type === "sentences" || !texts.includes(b.text));
      if (entry.data.blocks.length !== before) { removed += before - entry.data.blocks.length; touched.add(p); }
    }
    if (!removed) problems.push(`${id}: blocks to remove not found: ${texts.join(" / ").slice(0, 60)}`);
    else log.push(`${id} removed ${removed} block(s)`);
  }

  function field(id, key, from, to) {
    const e = load(id);
    if (!e) return problems.push(`${id} not found`);
    if (e.data[key] !== from) return problems.push(`${id}.${key} is ${JSON.stringify(e.data[key])}`);
    e.data[key] = to;
    touched.add(id);
    log.push(`${id}.${key}`);
  }

  function commit() {
    if (problems.length) {
      console.error("STOP — nothing written:\n  " + problems.join("\n  "));
      process.exit(1);
    }
    for (const id of touched) {
      const e = cache.get(id);
      fs.writeFileSync(e.file, serialize(e.data, e.format));
    }
    return { files: touched.size, changes: log.length, log };
  }

  return { item, syncSplit, insertAfter, blockText, removeBlocks, field, commit, load };
}

module.exports = { createEditor };
