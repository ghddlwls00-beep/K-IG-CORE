#!/usr/bin/env node
/**
 * KIG-006 — gh1-032 / gh1-033 realignment PROPOSAL (read-only).
 *
 * Diagnosis
 * ---------
 * `gh1-033` is the English answer sheet paired with the Korean prompts in
 * `gh1-032` (variant=main, pairId=gh1-033). Two of its cells were glued
 * together during migration; the sheet then drifted two numbers behind, and the
 * last two sentences were re-appended at the bottom still carrying their
 * ORIGINAL numbers (#24, #25) — which is why they duplicate #49/#50 content.
 *
 * Raw sheet order (printed n -> text):
 *   #26..#35  fine
 *   #36  "Don't I love her(Do I not ---)? 37.This is mine."   <- GLUED
 *   #38  "It is yours. 39.Those(They) are theirs."            <- GLUED (no #37 slot)
 *   #40  "These are his."   <- really #38's answer
 *   #41  "It is hers."      <- really #39's answer
 *   ...  (2-number drift continues)
 *   #50  "Aren't these his?(Are these not his)?"
 *   #24  "Aren't they yours?"     <- really #49's answer
 *   #25  "Aren't these his?"      <- really #50's answer
 *
 * The embedded "NN." inside a glued cell marks the sentence that FOLLOWS it, so
 * splitting yields, in order:
 *   [#36] Don't I love her(Do I not ---)?
 *   [#37] This is mine.
 *   [#38] It is yours.
 *   [#39] Those(They) are theirs.
 *
 * After that split the 25 English sentences line up 1:1, in order, with the 25
 * Korean prompts (#26..#50). Nothing is discarded.
 *
 * Nothing here writes to content/. It prints the proposed table and saves a
 * machine-readable proposal for the apply step.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const read = (f) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "content/lessons/grammar1", f), "utf8"))
    .blocks.filter((b) => b.type === "sentences")
    .flatMap((b) => b.items);

const ko = read("gh1-032.json");
const en = read("gh1-033.json");

/* --- step 1: split the glued cells ------------------------------------- */
// An embedded "NN." inside a cell introduces the sentence that follows it.
const pulled = [];
for (const it of en) {
  const m = it.text.match(/^(.*?)\s+(\d{2})\.\s*(.+)$/);
  if (m) {
    pulled.push({ text: m[1].trim(), printedN: it.n });
    pulled.push({ text: m[3].trim(), printedN: m[2], recovered: true });
  } else {
    pulled.push({ text: it.text, printedN: it.n });
  }
}

console.log("### recovered English sentence order (index :: printedN :: text)");
pulled.forEach((p, i) =>
  console.log(`  ${String(i).padStart(2)} :: #${p.printedN} :: ${p.text}`)
);
console.log("");

/* --- step 2: sanity — count must equal the Korean side ------------------ */
console.log(`korean items = ${ko.length} ; english after split = ${pulled.length}`);
console.log("");

/* --- step 3: proposed realignment -------------------------------------- */
console.log("### proposed realignment");
console.log("");
console.log("| # | Korean prompt | current English | proposed English |");
console.log("|---|---|---|---|");
const proposal = [];
for (let i = 0; i < ko.length; i++) {
  const k = ko[i];
  const current = en[i] ? en[i].text : "";
  const proposed = pulled[i] ? pulled[i].text : "";
  const changed = current !== proposed;
  proposal.push({
    n: k.n,
    korean: k.text,
    currentText: current,
    proposedText: proposed,
    changed,
  });
  console.log(`| ${k.n} | ${k.text} | ${current} | ${proposed} |`);
}
const changed = proposal.filter((p) => p.changed).length;
console.log("");
console.log(`cells whose content changes: ${changed} / ${ko.length}`);

const out = path.join(ROOT, "docs/qa-2026-09-15/evidence/kig006-gh1032-realign.json");
fs.writeFileSync(out, JSON.stringify(proposal, null, 1));
console.log("wrote " + path.relative(ROOT, out));
