#!/usr/bin/env node
/**
 * KIG-006 — spot-check the corrected proposal engine against the exact cases
 * the reviewer flagged, plus every shape the aligner has to handle.
 *
 * Verifies the three pre-approval corrections:
 *   1. every alternative is a COMPLETE sentence (no bare fragments)
 *   2. `text` is the author's OUT-OF-PAREN wording (displayed / read aloud)
 *   3. `We were workers (laborers).` -> alt "We were laborers." (synonym swap)
 *
 * Also asserts fragment inputs cannot reach an exact match.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "report-kig006.cjs");
let code = fs.readFileSync(SRC, "utf8");
// strip the shebang — new Function() cannot parse it
code = code.replace(/^#!.*\n/, "");
// expose the proposal engine without running the file's side effects
code = code.replace(
  /\/\* ---------------------------------------------------------------- write out \*\/[\s\S]*$/,
  "\nmodule.exports = { propose, parseAltMarker, substitute, findSpanStart };\n"
);
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", code)(
  mod,
  mod.exports,
  require,
  __dirname
);
const { propose, parseAltMarker } = mod.exports;

/** Category A rows carry the 혹은 marker and go through parseAltMarker. */
const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은
function proposalFor(kind, en) {
  if (en.includes(ALT_MARK)) {
    const a = parseAltMarker(en);
    if (a) return { text: a.primary, alternatives: a.altRaw ? [a.altRaw] : [] };
  }
  return propose(kind, en);
}

/* ------------------------------------------------------------------ cases */
const CASES = [
  // --- the exact examples the reviewer called out -------------------------
  ["SUBSTITUTE", "Those(They) are their pens.", "Those are their pens.", "They are their pens."],
  ["SUBSTITUTE", "Did he like it(that)?", "Did he like it?", "Did he like that?"],
  ["SUBSTITUTE", "Isn't he(Is he not) coming here?", "Isn't he coming here?", "Is he not coming here?"],
  ["APPEND", "We were workers (laborers).", "We were workers.", "We were laborers."],
  ["SUFFIX", "What do you do on Sunday(s)?", "What do you do on Sundays?", "What do you do on Sunday?"],
  ["APPEND", "How many girls were (there) in the classroom?", "How many girls were in the classroom?", "How many girls were there in the classroom?"],

  // --- substitution shapes -----------------------------------------------
  ["SUBSTITUTE", "Nobody(No one) called.", "Nobody called.", "No one called."],
  ["SUBSTITUTE", "Why were you not(weren't you) studying English?", "Why were you not studying English?", "Why weren't you studying English?"],
  ["SUBSTITUTE", "When will they(are they going to) finish their freshman year?", "When will they finish their freshman year?", "When are they going to finish their freshman year?"],
  ["SUBSTITUTE", "It will handle(deal with) redevelopment.", "It will handle redevelopment.", "It will deal with redevelopment."],
  ["SUBSTITUTE", "If I had enough money(Had I enough money), I would buy you a diamond ring.", "If I had enough money, I would buy you a diamond ring.", "Had I enough money, I would buy you a diamond ring."],
  ["SUBSTITUTE", "Should you not go, he would go. (If you should not go,) he would go.", "Should you not go, he would go.", "If you should not go, he would go."],
  ["SUBSTITUTE", "Isn't this mine(혹은 Is this not mine?)", "Isn't this mine?", "Is this not mine?"],
  ["SUBSTITUTE", "Don't I love her(Do I not ---)?", "Don't I love her?", "Do I not love her?"],

  // --- comma-separated variants ------------------------------------------
  ["SUBSTITUTE", "Should I have been(If I had been, had I been) three minutes late, I should have missed the train.", "Should I have been three minutes late, I should have missed the train.", "If I had been three minutes late, I should have missed the train."],

  // --- restatements -------------------------------------------------------
  ["SENTENCE", "Wasn't there a boy? (Was there not a boy?)", "Wasn't there a boy?", "Was there not a boy?"],
  ["SENTENCE", "This is he.(Speaking.)", "This is he.", "Speaking."],
  ["SUBSTITUTE", "I am, too.(So am I).", "I am, too.", "So am I."],

  // --- suffix -------------------------------------------------------------
  ["SUFFIX", "Weren't the other two German(s)?", "Weren't the other two Germans?", "Weren't the other two German?"],
];

/* ------------------------------------------------------------- assertions */
let pass = 0;
let fail = 0;
const failures = [];

for (const [kind, en, expText, expAlt] of CASES) {
  const p = proposalFor(kind, en);
  const okText = p.text === expText;
  const okAlt = p.alternatives.includes(expAlt);
  if (okText && okAlt) {
    pass++;
  } else {
    fail++;
    failures.push({ kind, en, expText, expAlt, gotText: p.text, gotAlts: p.alternatives });
  }
}

console.log(`=== expected-value checks: ${pass} pass / ${fail} fail ===`);
for (const f of failures) {
  console.log(`\nFAIL [${f.kind}] ${f.en}`);
  console.log(`  text  exp ${JSON.stringify(f.expText)}`);
  console.log(`        got ${JSON.stringify(f.gotText)}`);
  console.log(`  alt   exp ${JSON.stringify(f.expAlt)}`);
  console.log(`        got ${JSON.stringify(f.gotAlts)}`);
}

/* --- fragment-input guard ------------------------------------------------- */
// Typing ONLY the parenthetical fragment must never reach an exact match.
const FRAGMENTS = ["that", "they", "it", "Is he not", "dreams", "laborers", "prizes", "s", "a dream"];
let fragBad = 0;
for (const [kind, en] of CASES) {
  const p = proposalFor(kind, en);
  const accepted = [p.text, ...p.alternatives].map((s) => (s || "").trim().toLowerCase());
  for (const frag of FRAGMENTS) {
    if (accepted.includes(frag.trim().toLowerCase())) {
      fragBad++;
      console.log(`FRAGMENT ACCEPTED [${kind}] ${en} -> "${frag}"`);
    }
  }
}
console.log(`\n=== fragment guard: ${fragBad} fragment(s) wrongly accepted ===`);

process.exit(fail || fragBad ? 1 : 0);
