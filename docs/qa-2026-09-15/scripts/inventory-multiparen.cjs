#!/usr/bin/env node
/**
 * KIG-006 — inventory every unique English model answer carrying 2+ parens.
 *
 * The classifier only ever inspected the FIRST parenthetical, so sentences with
 * two or more were half-processed: a paren could survive into `text`, and the
 * two parens could be turned into independent variants even when they are
 * grammatically coupled ("could(can) … couldn't(can't)").
 *
 * This script prints the raw text of each such answer grouped by the page it
 * is exposed on, so the multi-paren rewrite can be designed against real data.
 * Read-only.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const EV = path.join(ROOT, "docs/qa-2026-09-15/evidence");
const exposure = JSON.parse(fs.readFileSync(path.join(EV, "kig006-exposure.json"), "utf8"));
const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은

const base = (p) => p.replace(/-\d+$/, "");
const allPages = (en) =>
  [...new Set(exposure.filter((r) => r.en === en).map((r) => r.page))].sort();

const seen = new Map();
for (const r of exposure) {
  const parenCount = (r.en.match(/\(/g) || []).length;
  if (parenCount < 2) continue;
  if (!seen.has(r.en)) seen.set(r.en, { en: r.en, parenCount, pages: allPages(r.en) });
}

const rows = [...seen.values()];
console.log(`unique answers with 2+ parens: ${rows.length}\n`);
for (const x of rows) {
  console.log(`[${x.parenCount}] ${x.pages.join(", ")}`);
  console.log(`     ${x.en}`);
}
