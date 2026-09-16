#!/usr/bin/env node
/**
 * CNT-01 / CNT-14 — the tap-dictation word bank, on the real STUDENT sentences.
 *
 * Loads `src/lib/listeningUtils.ts` itself and asserts:
 *   - "(sir/ma'am)" accepts either word alone, not both
 *   - pronoun slashes agree by gender, including s6-3 #7 where the options are
 *     written in opposite order ("He/She … her/him") — found in independent review
 *   - independent slashes ("brother/sister") combine with either referent
 *   - EVERY slashed STUDENT sentence can be assembled from its own tiles, in
 *     every accepted form
 *   - no distractor tile sounds like a correct word ("Im" beside "I'm")
 *
 *   node verify-dictation-alternatives.cjs
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");
const { expandSlashAlternatives, generateWordBank, verifyAnyWordSequence } = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));

const rows = [];
const check = (name, ok, detail) => rows.push({ name, ok, detail });
const words = (s) => s.match(/[a-zA-Z0-9'’\-]+/g) || [];
const accepts = (sentence, attempt) => verifyAnyWordSequence(words(attempt), generateWordBank(sentence).acceptedWordSequences);

const s11 = "Nice to meet you (sir/ma’am).";
check("s1-1 sir alone accepted", accepts(s11, "Nice to meet you sir"));
check("s1-1 ma'am alone accepted", accepts(s11, "Nice to meet you ma’am"));
check("s1-1 both rejected", !accepts(s11, "Nice to meet you sir ma’am"));

const s637 = "He/She is very kind, and I like her/him a lot.";
check("s6-3 #7 He … him accepted", accepts(s637, "He is very kind and I like him a lot"));
check("s6-3 #7 She … her accepted", accepts(s637, "She is very kind and I like her a lot"));
check("s6-3 #7 He … her rejected", !accepts(s637, "He is very kind and I like her a lot"));

const s635 = "He/She has a habit of touching his/her nose when he/she teaches.";
check("pronouns agree: He … his … he", accepts(s635, "He has a habit of touching his nose when he teaches"));
check("pronouns agree: mixed rejected", !accepts(s635, "He has a habit of touching her nose when she teaches"));

const mixed = "He/She plays with his/her brother/sister.";
const mixedForms = expandSlashAlternatives(mixed);
check("independent group combines with each referent (4 forms)", mixedForms.length === 4, mixedForms.join(" | "));

// Every slashed STUDENT sentence, every accepted form, buildable from its tiles.
const dir = path.join(REPO, "content/lessons/student");
let slashed = 0;
const unbuildable = [];
for (const f of fs.readdirSync(dir)) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const block of lesson.blocks || []) {
    if (block.type !== "sentences") continue;
    for (const item of block.items || []) {
      if (!(item.text || "").includes("/")) continue;
      slashed++;
      const bank = generateWordBank(item.text);
      const tiles = bank.allTiles.map((t) => t.word.toLowerCase());
      for (const seq of bank.acceptedWordSequences) {
        const pool = [...tiles];
        const ok = seq.every((w) => {
          const i = pool.indexOf(w.toLowerCase());
          if (i < 0) return false;
          pool.splice(i, 1);
          return true;
        });
        if (!ok) unbuildable.push(`${lesson.id} #${item.n}: ${seq.join(" ")}`);
      }
    }
  }
}
check(`all ${slashed} slashed STUDENT sentences buildable in every form`, unbuildable.length === 0, unbuildable.slice(0, 3).join(" | "));

// CNT-14: sound-alike distractors across every LISTENING script sentence.
const ld = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const soundForm = (w) => w.toLowerCase().replace(/['’]/g, "").replace(/s$/, "");
let banks = 0;
let alike = 0;
for (const rowsOf of Object.values(ld)) {
  if (!Array.isArray(rowsOf)) continue;
  const pool = [...new Set(rowsOf.flatMap((r) => (r.en || "").split(/\s+/)).map((w) => w.replace(/[^a-zA-Z]/g, "")).filter(Boolean))];
  for (const r of rowsOf) {
    if (!r.en) continue;
    const bank = generateWordBank(r.en, pool);
    banks++;
    const correct = new Set(bank.acceptedWordSequences.flat().map((w) => w.toLowerCase()));
    const forms = new Set(bank.acceptedWordSequences.flat().map(soundForm));
    for (const t of bank.allTiles) if (!correct.has(t.word.toLowerCase()) && forms.has(soundForm(t.word))) alike++;
  }
}
check(`no sound-alike distractor tiles across ${banks} LISTENING banks`, alike === 0, `${alike} found`);

let pass = 0;
for (const r of rows) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `\n        ${r.detail}` : ""}`);
  if (r.ok) pass++;
}
console.log(`\n${pass}/${rows.length} checks pass`);
process.exitCode = pass === rows.length ? 0 : 1;
