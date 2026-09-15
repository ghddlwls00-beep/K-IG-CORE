#!/usr/bin/env node
/**
 * KIG-006 — classification PROPOSAL for the parenthetical patterns.
 *
 * IMPORTANT: this script is READ-ONLY. It does not touch content/. It walks the
 * unique parenthetical model answers that actually reach a student's screen and
 * proposes, for each one, which of four kinds it is, together with the `text`
 * and `alternatives` a later (approved) migration would produce.
 *
 *   SUBSTITUTE  A(B) — B replaces A.        Did he like it(that)?        -> A only
 *   APPEND      A(B) — B is inserted after A.  girls were (there) in     -> A, AB
 *   SUFFIX      A(s) — inflectional suffix.  son(s), daughter(s)         -> A, AB
 *   SENTENCE    paren holds a whole second sentence.  X? (Y?)            -> A + alt sentence
 *   POLLUTED    the cell mixes in a stray sentence number / note          -> needs manual repair
 *
 * Output: a markdown table on stdout. Nothing is written into content/.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const EXPOSURE = path.join(ROOT, "docs/qa-2026-09-15/evidence/kig006-exposure.json");
const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은
const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF]/;

const rows = JSON.parse(fs.readFileSync(EXPOSURE, "utf8"));

/** Unique English answer texts that carry at least one parenthetical. */
const seen = new Map();
for (const r of rows) {
  if (!r.en || !/\([^)]*\)/.test(r.en)) continue;
  if (r.en.includes(ALT_MARK)) continue; // those are category A, handled separately
  if (!seen.has(r.en)) seen.set(r.en, r);
}
const items = [...seen.values()];
console.log(`Unique parenthetical model answers: ${items.length}\n`);

/**
 * Classify one text. Returns { kind, text, alternatives, note }.
 *
 * Heuristics, in priority order — each keyed off a real example from the data:
 *  1. a bare sentence number glued in ("39.Those...")            -> POLLUTED
 *  2. two+ parens, where one is not a simple substitution        -> POLLUTED (manual)
 *  3. one or more single-token parens                            -> SUBSTITUTE
 *  4. paren is a lone inflection like (s) / (ing) / (es)         -> SUFFIX
 *  5. the paren sits in a gap (space before, no space after)     -> APPEND
 *  6. paren is multi-word and capitalised                        -> SENTENCE
 *  7. otherwise                                                  -> SUBSTITUTE (default)
 */
function classify(text) {
  const parens = text.match(/\([^)]*\)/g) || [];

  // 1. stray sentence number / "N." glued inside the cell
  if (/\d+\.\s*[A-Z]/.test(text) && (text.match(/\(/g) || []).length >= 1) {
    return { kind: "POLLUTED", note: "stray sentence number inside the cell" };
  }

  // 2. two or more parens
  if (parens.length > 1) {
    // A pure substitution of every paren is still safe to treat as SUBSTITUTE,
    // but mixed shapes need a human.
    const allSingle = parens.every((p) => !/\s/.test(p.slice(1, -1).trim()));
    if (!allSingle) {
      return { kind: "POLLUTED", note: `${parens.length} parens, mixed shape — needs manual review` };
    }
  }

  // 3/4. inspect each paren
  const kinds = [];
  for (const p of parens) {
    const trimmed = p.slice(1, -1).trim();

    // 4. bare inflectional suffix in the paren
    if (/^(s|es|ing|ed|d)$/i.test(trimmed)) {
      kinds.push("SUFFIX");
      continue;
    }
    // 5. a gap: " (word) " — a space BEFORE the "(" plus a word that can simply
    //    be OMITTED, leaving a still-grammatical sentence. That is what makes it
    //    an insertion rather than a substitution:
    //      "were (there) in the classroom"  -> "were in the classroom"   APPLIES
    //      "Those (The) books"              -> "Those books"  (meaning shifts)  NO
    //      "Which (What) book"              -> "Which book"   (meaning shifts)  NO
    //    A substituted word is one of a closed set of determiners/pronouns that
    //    only ever REPLACE a sibling token, so exclude those.
    const SUBSTITUTION_ONLY = new Set([
      "the", "a", "an", "this", "that", "these", "those", "they", "it", "he",
      "she", "we", "you", "his", "her", "its", "their", "our", "my", "your",
      "which", "what", "who", "some", "any", "every", "each", "all", "no",
    ]);
    const at = text.indexOf(p);
    const before = text[at - 1];
    const gapForm = before === " ";
    if (gapForm && !/\s/.test(trimmed) && !SUBSTITUTION_ONLY.has(trimmed.toLowerCase())) {
      kinds.push("APPEND");
      continue;
    }
    // 6. a whole second sentence in the paren
    if (/^[A-Z]/.test(trimmed) && /\s/.test(trimmed) && /[.?!]$/.test(trimmed)) {
      kinds.push("SENTENCE");
      continue;
    }
    kinds.push("SUBSTITUTE");
  }

  const uniq = [...new Set(kinds)];
  if (uniq.length > 1) {
    return { kind: "POLLUTED", note: `mixed shapes (${uniq.join(" + ")}) — needs manual review` };
  }
  return { kind: uniq[0], note: "" };
}

const buckets = { SUBSTITUTE: [], APPEND: [], SUFFIX: [], SENTENCE: [], POLLUTED: [] };
for (const r of items) {
  const c = classify(r.en);
  buckets[c.kind].push({ ...r, ...c });
}

for (const k of ["SUBSTITUTE", "APPEND", "SUFFIX", "SENTENCE", "POLLUTED"]) {
  console.log(`## ${k} — ${buckets[k].length}`);
  for (const r of buckets[k].slice(0, 400)) {
    console.log(`  [${r.page}/${r.n}] ${r.en}`);
    console.log(`      ${r.note}`);
  }
  console.log("");
}

console.log("SUMMARY");
for (const k of Object.keys(buckets)) console.log(`  ${k}: ${buckets[k].length}`);

// machine-readable dump for the next step
fs.writeFileSync(
  path.join(ROOT, "docs/qa-2026-09-15/evidence/kig006-classification.json"),
  JSON.stringify(buckets, null, 1)
);
