#!/usr/bin/env node
/**
 * STUDENT 원본 되살리기의 과정 목록 맞추기 — content/courses/student.json 에서 과 번호로 항목을 찾아 제목 · menuLabel 을
 * 강의 파일(content/lessons/student/<id>.json)과 같게. 파일 형식(들여쓰기 1칸 · 끝 개행 없음)이 그대로인지 먼저 확인.
 *   node student-restore-courselist.mjs [--apply]
 */
import fs from "node:fs";
import path from "node:path";
const REPO = path.resolve(import.meta.dirname, "../../..");
const FILE = path.join(REPO, "content/courses/student.json");
const IDS = ["s1-4", "s1-5", "s1-6", "s11-1"];
const raw = fs.readFileSync(FILE, "utf8");
const data = JSON.parse(raw);
const fmt = (d) => JSON.stringify(d, null, 1) + (raw.endsWith("\n") ? "\n" : "");
if (fmt(data) !== raw) { console.log("멈춤 — student.json 형식이 JSON.stringify(…, null, 1) 과 다름"); process.exit(1); }
let changed = 0; const seen = {};
(function walk(v) {
  if (Array.isArray(v)) return v.forEach(walk);
  if (!v || typeof v !== "object") return;
  if (typeof v.id === "string" && IDS.includes(v.id)) {
    const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", `${v.id}.json`), "utf8"));
    seen[v.id] = (seen[v.id] || 0) + 1;
    for (const k of ["title", "menuLabel"]) if (k in v && v[k] !== lesson[k]) { console.log(`${v.id} ${k}: '${v[k]}' → '${lesson[k]}'`); v[k] = lesson[k]; changed++; }
  }
  Object.values(v).forEach(walk);
})(data);
for (const id of IDS) if (!seen[id]) console.log(`${id}: 목록에서 못 찾음`);
if (process.argv.includes("--apply") && changed) fs.writeFileSync(FILE, fmt(data));
console.log(`${process.argv.includes("--apply") ? "씀" : "미리 보기"} · 바꾼 칸 ${changed}`);
