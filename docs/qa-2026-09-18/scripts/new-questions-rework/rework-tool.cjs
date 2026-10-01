#!/usr/bin/env node
// One rework batch, start to finish (2026-10-01 cloud session). A worker uses only this tool and check-new-questions.cjs:
//   node rework-tool.cjs stage  --course ld|reading --lessons d169,d170 --dir <staging>   copy the served files to <staging>/<course>/ and
//                                                                                          print the brief (lines · chips · questions)
//   node rework-tool.cjs brief  --dir <staging>                 print the brief again from the staged (edited) files
//   node rework-tool.cjs packet --dir <staging> --out <file>     blind packet (no answers, no text) of the staged questions
//   node rework-tool.cjs finish --dir <staging> [--dry]          guard (ids · types · counts · evidence unchanged, absolute-word cue,
//                                                                 check-new-questions PASS) → write content/questions + docs copy
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO, SERVED, RECORD, chipsOf, ABS } = require("./lib.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const cmd = process.argv[2];
const DIR = path.resolve(arg("--dir", ""));
const CHECK = path.join(REPO, "docs/qa-2026-09-18/scripts/check-new-questions.cjs");
const scripts = () => JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const linesOf = (course, id, sc) =>
  course === "ld"
    ? (Array.isArray(sc[id]) ? sc[id] : (sc[id] && sc[id].rows) || []).map((r) => r.en)
    : (JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8")).readingSentences || []).map((r) => r.english);
const staged = () => {
  const out = [];
  for (const course of ["ld", "reading"]) {
    const d = path.join(DIR, course);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json")).sort()) out.push({ course, file: f, data: JSON.parse(fs.readFileSync(path.join(d, f), "utf8")) });
  }
  return out;
};
const absCue = (q) => {
  const f = q.options.map((o) => ABS.test(o));
  return !f[q.answer] && f.some((x, i) => x && i !== q.answer);
};

const brief = () => {
  const sc = scripts();
  for (const { course, file, data: d } of staged()) {
    const id = d.lesson;
    console.log(`\n===== ${id} (${course}) — ${path.join(DIR, course, file)}`);
    linesOf(course, id, sc).forEach((en, i) => console.log(`${i + 1}. ${en}`));
    if (course === "ld") console.log(`CHIPS (on screen before listening): ${chipsOf(id).join(" | ") || "(none)"}`);
    for (const q of d.questions) {
      console.log(`- ${q.id} [${q.type}] ${q.prompt}  (answer ${"ABCD"[q.answer]} · evidence ${q.evidence.join(",")})${absCue(q) ? "  ⚠ absolute word only in wrong options" : ""}`);
      q.options.forEach((o, i) => console.log(`    ${"ABCD"[i]}${i === q.answer ? "*" : " "} ${o}`));
    }
  }
};
if (cmd === "stage") {
  const course = arg("--course");
  const lessons = arg("--lessons", "").split(",").filter(Boolean);
  fs.mkdirSync(path.join(DIR, course), { recursive: true });
  for (const id of lessons) fs.copyFileSync(path.join(SERVED, course, `${id}.json`), path.join(DIR, course, `${id}.json`));
  brief();
} else if (cmd === "brief") {
  brief();
} else if (cmd === "packet") {
  const items = [];
  for (const { course, data } of staged())
    for (const q of data.questions) items.push({ id: q.id, ...(course === "ld" ? { chips: chipsOf(data.lesson) } : {}), prompt: q.prompt, options: q.options });
  fs.writeFileSync(path.resolve(arg("--out")), JSON.stringify({ items }, null, 1));
  console.log(`packet: ${items.length} questions → ${path.resolve(arg("--out"))}`);
} else if (cmd === "finish") {
  const errs = [];
  const files = staged();
  if (!files.length) errs.push("nothing staged");
  for (const { course, file, data } of files) {
    const orig = JSON.parse(fs.readFileSync(path.join(SERVED, course, file), "utf8"));
    if (data.lesson !== orig.lesson || data.course !== orig.course || data.v !== orig.v) errs.push(`${file}: v/lesson/course changed`);
    if (data.questions.length !== orig.questions.length) errs.push(`${file}: question count ${orig.questions.length} → ${data.questions.length}`);
    orig.questions.forEach((o, i) => {
      const q = data.questions[i];
      if (!q) return;
      if (q.id !== o.id || q.type !== o.type) errs.push(`${o.id}: id/type changed`);
      if (JSON.stringify([...q.evidence].sort((a, b) => a - b)) !== JSON.stringify([...o.evidence].sort((a, b) => a - b))) errs.push(`${o.id}: evidence changed`);
      if (absCue(q)) errs.push(`${o.id}: absolute word (만 · 모든 · 전혀 · 항상 …) only in wrong options — use none, or put one in the answer too`);
    });
  }
  let line = "";
  try {
    line = execFileSync("node", [CHECK, "--dir", DIR], { encoding: "utf8" }).trim().split("\n").slice(-2).join(" / ");
  } catch (e) {
    errs.push(`check-new-questions FAIL:\n${String(e.stdout || e.message).trim().split("\n").slice(-25).join("\n")}`);
  }
  if (errs.length) {
    console.log(`NOT WRITTEN — fix and run finish again:\n${errs.join("\n")}`);
    process.exit(1);
  }
  if (!process.argv.includes("--dry"))
    for (const { course, file, data } of files) {
      const text = JSON.stringify(data, null, 2) + "\n";
      fs.writeFileSync(path.join(SERVED, course, file), text);
      fs.writeFileSync(path.join(RECORD, course, file), text);
    }
  console.log(`${process.argv.includes("--dry") ? "DRY OK" : "WRITTEN"} ${files.length} lessons · ${line}`);
} else {
  console.log("usage: stage | packet | finish (see the head of this file)");
  process.exit(2);
}
