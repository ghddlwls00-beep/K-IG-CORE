#!/usr/bin/env node
/**
 * VOCA follow-up found by verify-voca-fixes.cjs: apply-voca.cjs gave the corrected headword
 * `technological` (was `technologic`) the meaning 기술의, 기술적인 — identical to `technical` in
 * the same lesson hv-66, the V-04 problem again. technological = relating to technology.
 *   node apply-voca-followup.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const file = path.join(REPO, "content/voca_dictionary.json");
const raw = fs.readFileSync(file, "utf8");
const dict = JSON.parse(raw);
const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
const serialize = (d) => { let s = JSON.stringify(d, null, indent); if (raw.includes("\r\n")) s = s.replace(/\n/g, "\r\n"); return /\r?\n$/.test(raw) ? s + (raw.includes("\r\n") ? "\r\n" : "\n") : s; };
if (serialize(dict) !== raw) { console.error("STOP: dictionary format not reproducible"); process.exit(1); }
if (dict.technological?.meaning !== "기술의, 기술적인") { console.error(`STOP: technological is ${JSON.stringify(dict.technological)}`); process.exit(1); }
dict.technological.meaning = "과학 기술의";
if (!DRY) fs.writeFileSync(file, serialize(dict));
console.log(`technological → 과학 기술의 — ${DRY ? "checked (--dry-run)" : "written"}`);
