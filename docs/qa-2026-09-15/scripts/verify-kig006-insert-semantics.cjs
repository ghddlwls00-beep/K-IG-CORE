#!/usr/bin/env node
/* Ad-hoc probe: DETACHED DETERMINER rows — is the parenthesised determiner
 * treated as an OPTIONAL INSERT (bare form = primary) or a substitution? */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");

const src = fs.readFileSync(path.join(__dirname, "report-kig006.cjs"), "utf8")
  // `require` strips the shebang; `new Function` does not, so do it by hand.
  .replace(/^#!.*\n/, "")
  // cut at the section that begins emitting tables, and keep the helpers.
  .split("/* ------------------------------------------------------- prescribed repairs */")[0]
  + `
module.exports = { propose, resolveOptionalDeterminers, resolveMultiParen,
                   parseAltMarker, DETERMINER, norm, isInsertableDeterminer,
                   tokenizeParens, isDetachedDeterminer };
`;
// Evaluated IN MEMORY. This probe used to write `_engine-slice.cjs` next to the
// script and NEVER delete it, so every run left a ~78 KB file in the tree for a
// `git add -A` to pick up. `__dirname` is passed through because the engine
// resolves `evidence/` relative to it.
const _mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", src)(
  _mod,
  _mod.exports,
  require,
  __dirname
);
const E = _mod.exports;

const ROWS = [
  "All (the) boys receive a prize.",
  "(The) Palestinians and (the) Israelis must act.",
  "He is (a) Korean, isn't he?",
  "She was (an) American, wasn't she?",
  "Is that (the) car yours?",
  "Those (The) books are mine.",
  "Those (the) books are mine.",
  "We went to (the) school.",
  "He has (a) car.",
  "(A) dog is barking.",
  "I saw (the) boy.",
  "Both (the) girls came.",
  "Some (the) people left.",
  "Give me (a) pen.",
  "The CIA did not take part(participate) in that(the) raid, did it?",
  "All (the) boys receive a prize(혹은 prizes).",
  "(The) Palestinians and (the) Israelis must act.(The Palestinians and the Israelis must act.)",
];

const strip = (s) => (s || "").replace(/[.?!]\s*$/, "");

/**
 * Does this row consist ONLY of detached determiners? If so, inserting one is
 * the sole operation available, and it can only ADD a word — so an alternative
 * shorter than the primary is a genuine defect. On any other row the rule does
 * not apply:
 *   - a GLUED multi-word substitution is a phrase->phrase swap and may shorten
 *     ("take part(participate)" is one word shorter, and is correct);
 *   - a "혹은" marker is a second, independent axis whose swap may shorten
 *     ("a prize(혹은 prizes)" drops the article) and is a legitimate reading.
 * Marker rows are asserted exactly by report-kig006.cjs check (8) instead.
 */
const determinerOnly = (en) => {
  const parens = E.tokenizeParens(en).filter((t) => t.kind === "paren");
  return parens.length > 0 && parens.every((p) => E.isDetachedDeterminer(p));
};

let bad = 0;
let shortenChecked = 0;
for (const en of ROWS) {
  const p = E.propose("SUBSTITUTE", en);
  const text = p.text || "";
  const alts = p.alternatives || [];
  const flags = [];
  if (text.includes("(")) flags.push("TEXT-PAREN");
  if (alts.some((a) => a.includes("("))) flags.push("ALT-PAREN");
  // An alternative must never be shorter than the primary — determiner-only
  // rows only; see determinerOnly() above.
  if (determinerOnly(en)) {
    for (const a of alts) {
      shortenChecked++;
      const dw = a.split(/\s+/).length - text.split(/\s+/).length;
      if (dw < 0) flags.push(`SHORTER(${dw})`);
    }
  }
  if (flags.length) bad++;
  console.log((flags.length ? "FAIL " : "ok   ") + en);
  console.log("      text: " + JSON.stringify(p.text));
  console.log("      alts: " + JSON.stringify(p.alternatives));
  if (flags.length) console.log("      >>> " + flags.join(" "));
}
console.log("\nrows with problems: " + bad + " / " + ROWS.length);
console.log("shortenings checked on determiner-only rows: " + shortenChecked);
