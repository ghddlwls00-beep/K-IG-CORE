#!/usr/bin/env node
/**
 * BUG-024 자료 — STUDENT 강의의 청크 드릴(chunkDrills) 데이터 규모와 모양. 고치지 않는다.
 *   node student-chunk-drills.cjs [--json]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/student");
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => /^s\d+-\d+\.json$/.test(x))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const drills = d.chunkDrills || [];
  const sentences = [];
  for (const b of d.blocks || []) if (b.type === "sentences") for (const it of b.items || []) if (it && it.text) sentences.push(norm(it.text));
  const joined = ` ${sentences.join(" | ")} `;
  const inLesson = drills.filter((c) => c.en && joined.includes(` ${norm(c.en)} `) || joined.includes(norm(c.en))).length;
  rows.push({ id: d.id || f.replace(/\.json$/, ""), drills: drills.length, inLesson, sample: drills.slice(0, 3) });
}
rows.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
const total = rows.reduce((s, r) => s + r.drills, 0);
const withDrills = rows.filter((r) => r.drills > 0).length;
const inLesson = rows.reduce((s, r) => s + r.inLesson, 0);
const counts = rows.map((r) => r.drills).sort((a, b) => a - b);
if (process.argv.includes("--json")) { console.log(JSON.stringify({ lessons: rows.length, withDrills, total, inLesson, rows }, null, 1)); process.exit(0); }
console.log(`STUDENT 강의 ${rows.length}개 · 청크 드릴이 있는 강의 ${withDrills}개 · 드릴 ${total}개 (강의당 최소 ${counts[0]} · 중앙 ${counts[Math.floor(counts.length / 2)]} · 최대 ${counts[counts.length - 1]})`);
console.log(`드릴의 영어가 그 강의 문장 안에 그대로 있는 것: ${inLesson}/${total} (${((100 * inLesson) / total).toFixed(0)}%)`);
for (const r of rows.slice(0, 3)) console.log(`  ${r.id} (${r.drills}개): ${r.sample.map((c) => `${c.ko} = ${c.en}`).join(" · ")}`);
