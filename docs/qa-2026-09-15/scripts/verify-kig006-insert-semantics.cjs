#!/usr/bin/env node
/* Ad-hoc probe: DETACHED DETERMINER rows — is the parenthesised determiner
 * treated as an OPTIONAL INSERT (bare form = primary) or a substitution? */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");

const src = fs.readFileSync(path.join(__dirname, "report-kig006.cjs"), "utf8")
  // cut at the section that begins emitting tables, and keep the helpers.
  .split("/* ------------------------------------------------------- prescribed repairs */")[0]
  + `
module.exports = { propose, resolveOptionalDeterminers, resolveMultiParen,
                   parseAltMarker, DETERMINER, norm, isInsertableDeterminer,
                   tokenizeParens, isDetachedDeterminer };
`;
fs.writeFileSync(path.join(__dirname, "_engine-slice.cjs"), src);
const E = require("./_engine-slice.cjs");

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
let bad = 0;
for (const en of ROWS) {
  const p = E.propose("SUBSTITUTE", en);
  const text = p.text || "";
  const alts = p.alternatives || [];
  const flags = [];
  if (text.includes("(")) flags.push("TEXT-PAREN");
  if (alts.some((a) => a.includes("("))) flags.push("ALT-PAREN");
  // An alternative must never be shorter than the primary.
  for (const a of alts) {
    const dw = a.split(/\s+/).length - text.split(/\s+/).length;
    if (dw < 0) flags.push(`SHORTER(${dw})`);
  }
  if (flags.length) bad++;
  console.log((flags.length ? "FAIL " : "ok   ") + en);
  console.log("      text: " + JSON.stringify(p.text));
  console.log("      alts: " + JSON.stringify(p.alternatives));
  if (flags.length) console.log("      >>> " + flags.join(" "));
}
console.log("\nrows with problems: " + bad + " / " + ROWS.length);
