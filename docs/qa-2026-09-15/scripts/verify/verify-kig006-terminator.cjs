#!/usr/bin/env node
/**
 * KIG-006 — the source cell's terminator must survive the split.
 *
 * A cell that ends in "?" must still end in "?" after `text` / `alternatives`
 * are derived from it. Losing it silently rewrites a question as a statement on
 * screen and in the audio, and it is invisible downstream: the engine's own
 * terminator check compares each alternative against `text`, so when `text`
 * itself lost the "?" both sides read "." and it passes.
 *
 * The real case, gh1-081 #26:
 *     source "When does he return(go back) to the U.S.?"
 *     text   "When does he return to the U.S."      <- "?" gone
 * The cause was `clean()`: its "collapse a run of terminators" rule treated the
 * period of "U.S." as the sentence terminator and deleted the "?" that followed
 * it. `clean()` is now abbreviation-aware, and the writer refuses to run when
 * any cell drifts.
 *
 * This probe is the regression gate: it runs the writer in dry-run mode over
 * all 3031 lesson files and asserts that nothing drifts. Run it after touching
 * `clean()`, `terminate()`, `finishText()`, or any of the resolver lanes.
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-kig006-terminator.cjs
 *
 * Exits 1 on drift, so it is usable as a gate.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../../..");
const WRITER = path.join(ROOT, "docs/qa-2026-09-15/scripts/apply-kig006.cjs");

if (!fs.existsSync(WRITER)) {
  console.error(`writer not found: ${WRITER}`);
  process.exit(1);
}

// Dry-run only. The writer never touches content/ without --write, and the
// terminator gate blocks every write when any cell drifts.
const res = spawnSync(process.execPath, [WRITER], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

const out = (res.stdout || "") + (res.stderr || "");
const lines = out.split(/\r?\n/);

const scanned = (out.match(/sentence items\s*:\s*(\d+)/) || [])[1] || "?";
const rewritten = (out.match(/items to rewrite\s*:\s*(\d+)/) || [])[1] || "?";
const driftHeader = lines.find((l) => l.includes("TERMINATOR DRIFT"));
const driftCount = driftHeader
  ? Number((driftHeader.match(/\((\d+)\)/) || [])[1] || 0)
  : 0;
const driftRows = lines.filter((l) => /^\s{4}\S.*want ".*" got "/.test(l));

console.log(`lesson files scanned : ${(out.match(/lesson files read\s*:\s*(\d+)/) || [])[1] || "?"}`);
console.log(`sentence items       : ${scanned}`);
console.log(`items to rewrite     : ${rewritten}`);
console.log(`terminator drift     : ${driftCount}`);

for (const r of driftRows.slice(0, 25)) console.log(`  ${r.trim()}`);
if (driftRows.length > 25) console.log(`  … and ${driftRows.length - 25} more`);

// A non-zero exit from the writer means either drift or an unresolved paren.
// Both must fail this probe; anything else (e.g. a crash) does too.
if (res.status !== 0 || driftCount > 0) {
  console.log(`\nFAIL — writer exit ${res.status}, ${driftCount} terminator drift(s)`);
  process.exit(1);
}

console.log("\nPASS — every source terminator survived into text and all alternatives");
