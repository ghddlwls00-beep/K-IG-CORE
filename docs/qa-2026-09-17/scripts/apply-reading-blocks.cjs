#!/usr/bin/env node
/**
 * READING — found by verify-reading-ui.cjs: the page data of pr237 still carried "*ligament: 인대"
 * and "(b)little" although no sentence does. 94 of the 512 lesson files keep the old PDF passage
 * split over several `instruction` blocks, some with a `hints` block of exam notes; the passage
 * fixes rewrote only the first instruction block, so the rest still held the uncorrected text.
 *
 * The READING page never shows or speaks these blocks (it renders readingSentences; the blocks
 * are only a fallback when a lesson has no sentences, and all 256 have them — page.tsx
 * extractSentencesForAudio also reads readingSentences), but they are sent with the licensed
 * page and read by the clip inventory. Every lesson (lesson page and script page) now has ONE
 * instruction block = its corrected passage (English / Korean), in the place of the first one.
 * heading, choice and dictation blocks are left as they are. No sentence changes.
 *   node apply-reading-blocks.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);

const dir = path.join(REPO, "content/lessons/reading");
const ids = fs.readdirSync(dir).filter((f) => /^pr\d{3}\.json$/.test(f)).map((f) => f.slice(0, 5));
const textBlocks = (id) => ["", "-1"].map((s) => JSON.parse(fs.readFileSync(path.join(dir, `${id}${s}.json`), "utf8")).blocks.filter((b) => b.type === "instruction" || b.type === "hints").length);
const before = ids.filter((id) => textBlocks(id).some((n) => n > 1));
for (const id of ids) ed.touch(id);

const r = ed.commit({ dry: DRY, collapseTextBlocks: true });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${before.length} lessons had more than one instruction/hints block (${before.slice(0, 12).join(" ")} …)`);
console.log(`${r.lessons} lessons rewritten to one instruction block — ${DRY ? "checked (--dry-run)" : "written"}`);
