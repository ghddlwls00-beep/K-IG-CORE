#!/usr/bin/env node
/**
 * Phase 5 — LISTENING: every round's English script beside its Korean
 * translation (content/ld_english_scripts.json), with the round's hint line.
 *
 * Mechanical checks, printed with counts:
 *   - hint word (proper noun / number) that never appears in the English script
 *   - digits in the Korean line that are missing from the English line (or vice versa)
 *   - the script page's Korean (d###-1) differing from the scripts file's Korean
 *   - Hangul in English, missing space after a period, doubled spaces
 *
 * Output: out/content/listening.tsv, out/content/listening-checks.json
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/content");
fs.mkdirSync(OUT, { recursive: true });

const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const load = (id) => {
  const f = path.join(REPO, "content/lessons/ld", `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
};
const checks = {};
const flag = (name, where) => (checks[name] ||= []).push(where);
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const digits = (s) => (s.match(/\d+/g) || []).map((d) => d.replace(/^0+(?=\d)/, "")).sort().join(",");

const lines = ["round\tn\tEN\tKO"];
for (const id of Object.keys(scripts).sort()) {
  const rows = scripts[id];
  const main = load(id);
  const hint = clean((main?.blocks || []).find((b) => b.type === "hints")?.text);
  lines.push(`${id}\thint\t${hint}\t`);
  const en = rows.map((r) => r.en || "").join(" ");
  for (const h of hint.split(/\.\s+|,\s*|;\s*/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean)) {
    const probe = h.replace(/^(Mr|Mrs|Ms|Dr)\.?\s*/i, "").split(/\s+/)[0];
    if (probe && probe.length > 2 && !en.toLowerCase().includes(probe.toLowerCase())) flag("hint word not in English script", `${id}: ${h}`);
  }
  for (const r of rows) {
    const where = `${id} #${r.n}`;
    lines.push([id, r.n, clean(r.en), clean(r.ko)].join("\t"));
    if (/[가-힣]/.test(r.en || "")) flag("Hangul in English", where);
    if (/[a-z]\.[A-Z]/.test(r.en || "") && !/\b(Mr|Mrs|Ms|Dr|St)\.[A-Z]/.test(r.en)) flag("missing space after period", where);
    if (/ {2,}/.test(r.en || "")) flag("double space in English", where);
    if (digits(r.en || "") !== digits(r.ko || "") && (/\d/.test(r.en || "") || /\d/.test(r.ko || ""))) flag("digits differ EN/KO", `${where} EN[${digits(r.en || "")}] KO[${digits(r.ko || "")}]`);
    if (!clean(r.ko)) flag("empty Korean", where);
    if (!clean(r.en)) flag("empty English", where);
  }
  // The script page's Korean must be the same text.
  const page = load(`${id}-1`);
  if (page) {
    const koPage = [
      ...(page.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text)),
      ...(page.blocks || []).filter((b) => b.type === "paragraph").map((b) => b.text),
    ].map(clean);
    const koScripts = rows.map((r) => clean(r.ko));
    if (koPage.join("|") !== koScripts.join("|")) flag("script page Korean differs from scripts file", `${id}-1 (${koPage.length} vs ${koScripts.length} rows)`);
  } else flag("missing script page", `${id}-1`);
}
fs.writeFileSync(path.join(OUT, "listening.tsv"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "listening-checks.json"), JSON.stringify(checks, null, 1));
console.log(`listening: ${Object.keys(scripts).length} rounds, ${lines.length - 1} lines`);
for (const [name, list] of Object.entries(checks)) console.log(`${String(list.length).padStart(5)}  ${name}   e.g. ${list.slice(0, 6).join(" | ")}`);
