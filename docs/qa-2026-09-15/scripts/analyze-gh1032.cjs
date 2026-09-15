#!/usr/bin/env node
/**
 * KIG-006 — gh1-032 / gh1-033 numbering misalignment analysis.
 *
 * `gh1-033` (the English answer sheet paired with the Korean prompts in
 * `gh1-032`) has had its cells shifted: the #36 cell swallowed #37's sentence,
 * the #37 cell swallowed #38 and #39, and every cell after that is two numbers
 * behind. The last two English sentences were re-appended at the bottom with
 * their ORIGINAL numbers (#24, #25), which is why they look like duplicates.
 *
 * This script pairs the two sides by their printed numbers and prints the
 * realignment proposal. READ-ONLY: it does not touch content/.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const KO = path.join(ROOT, "content/lessons/grammar1/gh1-032.json");
const EN = path.join(ROOT, "content/lessons/grammar1/gh1-033.json");

const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8"))
    .blocks.filter((b) => b.type === "sentences")
    .flatMap((b) => b.items);

const ko = read(KO);
const en = read(EN);

// The English sheet, in printed order (its `n` values are the printed numbers)
const enBySlot = en.map((it, i) => ({ slot: i, n: it.n, text: it.text }));

console.log(`Korean prompts : ${ko.length} items  (#${ko[0].n} .. #${ko[ko.length - 1].n})`);
console.log(`English answers: ${en.length} items  (printed #${enBySlot.map((x) => x.n).join(", ")})`);
console.log("");

/* --------------------------------------------------- split the merged cells */
// Three cells hold more than one sentence. Pull them apart so each printed
// number regains its own sentence.
const SPLIT = [
  { n: "36", text: "Don't I love her(Do I not ---)? 37.This is mine." },
  { n: "37", text: "It is yours. 39.Those(They) are theirs." },
];

const recovered = [];
for (const cell of enBySlot) {
  if (cell.n === "36") {
    // "Don't I love her(Do I not ---)?"  +  "37.This is mine."
    const m = cell.text.match(/^(.*?)\s+(\d+)\.\s*(.*)$/);
    if (m) {
      recovered.push({ n: "36", text: m[1].trim() });
      recovered.push({ n: m[2], text: m[3].trim() });
      continue;
    }
  }
  if (cell.n === "37") {
    // "It is yours."  +  "39.Those(They) are theirs."
    const m = cell.text.match(/^(.*?)\s+(\d+)\.\s*(.*)$/);
    if (m) {
      recovered.push({ n: "37", text: m[1].trim() });
      recovered.push({ n: m[2], text: m[3].trim() });
      continue;
    }
  }
  recovered.push({ n: cell.n, text: cell.text });
}

/* ------------------------------------------- restore the printable sequence */
// After the split, the natural order is #26..#35, #36, #37, #38(from #39 cell),
// #39(from the next cell), ... i.e. every slot from the "#38" cell onward holds
// the sentence belonging to the number TWO higher. Rebuild by walking the
// Korean numbers and taking the English sentence in that same positional order.
console.log("=== recovered English entries (printed # -> text) ===");
recovered.forEach((r, i) => console.log(`  [${i}] #${r.n} :: ${r.text}`));
console.log("");

// The English sheet's POSITIONAL order should map 1:1 onto the Korean order.
// Build that mapping explicitly and show it next to the Korean prompt.
console.log("=== positional realignment (Korean # <-> English sentence at same index) ===");
const maxLen = Math.max(ko.length, recovered.length);
let mismatches = 0;
for (let i = 0; i < maxLen; i++) {
  const k = ko[i];
  const e = recovered[i];
  const koNum = k ? k.n : "—";
  const enNum = e ? e.n : "—";
  const flag = k && e && koNum !== enNum ? "  <<< NUMBER MISMATCH" : "";
  if (flag) mismatches++;
  console.log(
    `  idx ${String(i).padStart(2)} | ko#${String(koNum).padStart(3)} | ${(k ? k.text : "").padEnd(34)} | en#${String(enNum).padStart(3)} | ${e ? e.text : ""}${flag}`
  );
}
console.log("");
console.log(`number mismatches after positional pairing: ${mismatches}`);
