#!/usr/bin/env node
/**
 * Phase 5 — STUDENT content for reading every item: each lesson's English
 * sentences beside the Korean paragraphs in the same order, then its chunk
 * drills (Korean chunk → English chunk), then any other blocks.
 *
 * Mechanical checks printed with counts:
 *   - English sentence count ≠ Korean paragraph count
 *   - chunk drills whose English chunks, joined, do not reproduce the lesson's
 *     sentences (a drill that teaches a different sentence than the lesson)
 *   - placeholder / extraction residue ("PASS-OFF", "undefined", doubled spaces)
 *   - lessons on disk that the course index does not list
 *
 * Output: out/content/student.txt, out/content/student-checks.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });

const dir = path.join(REPO, "content/lessons/student");
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/student.json"), "utf8"));
const listed = new Set(index.lessons.map((l) => l.id));
const order = (id) => id.replace(/^s/, "").split("-").map((n) => n.padStart(3, "0")).join("-");
const ids = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort((a, b) => order(a).localeCompare(order(b)));

const checks = {};
const flag = (name, where) => (checks[name] ||= []).push(where);
const norm = (s) => (s || "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

const out = [];
for (const id of ids) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8"));
  const blocks = L.blocks || [];
  const en = blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
  const ko = blocks.filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text);
  const other = blocks.filter((b) => b.type !== "sentences" && !(b.type === "paragraph" && b.lang === "ko"));
  out.push(`\n=== ${id}${listed.has(id) ? "" : "  [NOT IN COURSE INDEX]"} | ${L.menuLabel || ""} | ${L.title || ""} | ${L.label || ""}`);
  if (!listed.has(id)) flag("lesson file not in course index", id);
  if (en.length && ko.length && en.length !== ko.length) flag("English sentences ≠ Korean paragraphs", `${id} ${en.length} vs ${ko.length}`);
  const rows = Math.max(en.length, ko.length);
  for (let i = 0; i < rows; i++) {
    out.push(`${id} #${en[i]?.n ?? i + 1}\tEN ${en[i]?.text ?? "∅"}\n\t\tKO ${ko[i] ?? "∅"}`);
  }
  for (const b of other) out.push(`${id} [${b.type}${b.lang ? ":" + b.lang : ""}] ${b.text ?? JSON.stringify(b.items ?? "")}`);
  const drills = L.chunkDrills || [];
  if (drills.length) {
    out.push(`${id} drills: ` + drills.map((d) => `${d.ko} → ${d.en}`).join(" ¦ "));
    const joined = norm(drills.map((d) => d.en).join(" "));
    for (const s of en) {
      const t = norm((s.text || "").replace(/\s*\([^)]*\)/g, ""));
      if (t && !joined.includes(t.replace(/[.?!]$/, ""))) flag("sentence not reproduced by chunk drills", `${id} #${s.n}`);
    }
  }
  const all = JSON.stringify(L);
  if (/PASS-OFF|undefined|lorem/i.test(all)) flag("placeholder text", id);
  if (/ {2,}/.test(en.map((s) => s.text).join("|"))) flag("double space in English", id);
}
fs.writeFileSync(path.join(OUT, "student.txt"), out.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "student-checks.json"), JSON.stringify(checks, null, 1));
console.log(`student: ${ids.length} lesson files, ${out.length} lines`);
for (const [name, list] of Object.entries(checks)) console.log(`${String(list.length).padStart(5)}  ${name}   e.g. ${list.slice(0, 8).join(" | ")}`);
