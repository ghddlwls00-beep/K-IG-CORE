#!/usr/bin/env node
/**
 * KIG-006 — multi-paren resolver verification.
 *
 * Prints the resolved `text` / `alternatives` for every unique answer carrying
 * two or more parentheticals, and asserts the three rules the reviewer set:
 *
 *   (1) EXHAUSTION  — no "(" / ")" / 혹은 may survive in text or alternatives
 *   (2) COUPLING    — auxiliaries may not be crossed ("could … can't")
 *   (3) WHOLE PHRASE — "take part(participate)" replaces the whole phrase
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "report-kig006.cjs");
let code = fs.readFileSync(SRC, "utf8").replace(/^#!.*\n/, "");
code = code.replace(
  /\/\* ---------------------------------------------------------------- write out \*\/[\s\S]*$/,
  "\nmodule.exports = { propose, parseAltMarker, resolveMultiParen, auxiliariesAgree, tokenizeParens };\n"
);
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", code)(
  mod,
  mod.exports,
  require,
  __dirname
);
const { propose, resolveMultiParen, auxiliariesAgree } = mod.exports;

const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은
const ROOT = path.resolve(__dirname, "../../..");
const EV = path.join(ROOT, "docs/qa-2026-09-15/evidence");
const exposure = JSON.parse(fs.readFileSync(path.join(EV, "kig006-exposure.json"), "utf8"));

/** Expected values for the cases the reviewer named. */
const EXPECT = {
  "It could(can) be improved, couldn't(can't) it?": {
    text: "It could be improved, couldn't it?",
    alts: ["It can be improved, can't it?"],
    forbid: ["It can be improved, couldn't it?", "It could be improved, can't it?"],
  },
  "The CIA did not take part(participate) in that(the) raid, did it?": {
    text: "The CIA did not take part in that raid, did it?",
    alts: ["The CIA did not participate in that raid, did it?"],
    forbid: ["The CIA did not take participate in that raid, did it?"],
  },
  "That(It) is your car, isn't that(it)?": {
    text: "That is your car, isn't that?",
    alts: ["It is your car, isn't it?"],
    forbid: [],
  },
  "(The) Palestinians and (the) Israelis must act.": {
    text: "The Palestinians and the Israelis must act.",
    alts: ["Palestinians and Israelis must act."],
    forbid: [],
  },
  "All (the) boys receive a prize(혹은 prizes).": {
    text: "All the boys receive a prize.",
    alts: ["All the boys receive prizes."],
    forbid: [],
  },
  "Those(they) are books, aren't they(혹은 ---, are they not)?": {
    text: "Those are books, aren't they?",
    alts: ["They are books, are they not?", "Those are books, are they not?"],
    forbid: [],
  },
  "We are going to(will) do that another time (some other time).": {
    text: "We are going to do that another time.",
    alts: ["We will do that another time.", "We are going to do that some other time."],
    forbid: [],
  },
  "Are(Were) you mad (angry)?": {
    text: "Are you mad?",
    alts: ["Were you mad?"],
    forbid: [],
  },
  "Aren't they(those) yours(Are they not yours)?": {
    text: "Aren't they yours?",
    alts: ["Are they not yours?"],
    forbid: ["Aren't theyAre they not yours?", "Aren't they are they not yours?"],
  },
  "Do your son(s) and daughter(s) have a dream (dreams)?": {
    text: "Do your son and daughter have a dream?",
    alts: ["Do your sons and daughters have a dream?"],
    forbid: ["Do your son ands have a dream?", "Do yours ands have a dream?"],
  },
};

/* ---------------------------------------------------------------- collect */
const seen = new Map();
for (const r of exposure) {
  if ((r.en.match(/\(/g) || []).length < 2) continue;
  if (!seen.has(r.en)) seen.set(r.en, r.en);
}
const rows = [...seen.values()].sort();

let pass = 0;
let fail = 0;
const lines = [];

lines.push("| # | current text | proposed text | proposed alternatives |");
lines.push("|---|---|---|---|");
rows.forEach((en, i) => {
  const p = en.includes(ALT_MARK)
    ? (() => {
        const m = mod.exports.parseAltMarker(en);
        return { text: m.primary, alternatives: m.altAll || (m.altRaw ? [m.altRaw] : []) };
      })()
    : propose("SUBSTITUTE", en);
  const e = en.replace(/\|/g, "\\|");
  const t = (p.text || "—").replace(/\|/g, "\\|");
  const a = p.alternatives.length ? p.alternatives.join(" / ").replace(/\|/g, "\\|") : "—";
  lines.push(`| ${i + 1} | ${e} | ${t} | ${a} |`);

  // rule 1: exhaustion — no "(" / ")" / 혹은 may survive anywhere
  for (const s of [p.text, ...p.alternatives]) {
    if (!s) continue;
    if (s.includes("(") || s.includes(")") || s.includes(ALT_MARK)) {
      fail++;
      console.log(`RESIDUE  ${en}\n      -> "${s}"`);
      return;
    }
  }
  // rule 1b: terminator preservation — the primary's final . ? ! must survive
  // in every alternative, or a question silently becomes a statement.
  const term = (s) => (s.match(/[.?!]\s*$/) || [""])[0];
  const expectTerm = term(p.text);
  if (expectTerm && expectTerm !== ".") {
    for (const a2 of p.alternatives) {
      if (term(a2) !== expectTerm) {
        fail++;
        console.log(`TERMINATOR ${en}\n      "${a2}" ends ${JSON.stringify(term(a2))}, want ${JSON.stringify(expectTerm)}`);
        return;
      }
    }
  }
  // rule 1c: every alternative is a complete sentence, not a fragment
  const wc = (s) => (s.match(/\S+/g) || []).length;
  for (const a2 of p.alternatives) {
    if (wc(a2) < wc(p.text) * 0.6) {
      fail++;
      console.log(`FRAGMENT ${en}\n      "${a2}" (${wc(a2)} words vs ${wc(p.text)})`);
      return;
    }
  }
  // rule 2: coupling
  const bad = p.alternatives.filter((x) => !auxiliariesAgree(x));
  if (bad.length) {
    fail++;
    console.log(`COUPLING ${en}\n      -> ${bad.join(" | ")}`);
    return;
  }
  // expectations
  if (EXPECT[en]) {
    const ex = EXPECT[en];
    if (p.text !== ex.text) {
      fail++;
      console.log(`TEXT     ${en}\n   exp "${ex.text}"\n   got "${p.text}"`);
      return;
    }
    for (const a2 of ex.alts) {
      if (!p.alternatives.includes(a2)) {
        fail++;
        console.log(`ALT MISS ${en}\n   want "${a2}"\n   got  ${JSON.stringify(p.alternatives)}`);
        return;
      }
    }
    for (const f of ex.forbid) {
      if (p.alternatives.includes(f) || p.text === f) {
        fail++;
        console.log(`FORBIDDEN ${en}\n   "${f}" was accepted`);
        return;
      }
    }
  }
  pass++;
});

console.log(lines.join("\n"));
console.log(`\n=== multi-paren rows: ${rows.length}, pass ${pass}, fail ${fail} ===`);
process.exit(fail ? 1 : 0);
