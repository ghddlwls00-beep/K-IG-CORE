#!/usr/bin/env node
/**
 * 과정 목록(content/courses/<과정>.json)에서 강의 한 칸의 자리를 옮긴다 — 6-1353 gh1-016-1 이 목록 맨 끝에 있어
 * 앞뒤 이동(src/lib/content.ts getLessonContext — 목록의 **배열 차례**로 prev/next 를 정함)이 '123강' 으로 가고 다음이 없던 것.
 * order 칸은 앱이 쓰지 않아(src 에서 types.ts 정의뿐) 건드리지 않는다.
 * 쓰기 전에 고치지 않은 상태의 왕복(parse → stringify)이 원문과 바이트까지 같은지 확인한다.
 *
 *   node move-course-index-entry.cjs <과정> <강의 id> --after <강의 id> [--apply]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const [course, id] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const after = process.argv[process.argv.indexOf("--after") + 1];
const APPLY = process.argv.includes("--apply");
const file = path.join(REPO, "content/courses", `${course}.json`);
const raw = fs.readFileSync(file, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const trailing = /\r?\n$/.test(raw);
const indentMatch = raw.match(/\n( +)"/);
const indent = indentMatch ? indentMatch[1].length : 2;
const ser = (o) => JSON.stringify(o, null, indent).replace(/\n/g, eol) + (trailing ? eol : "");
const d = JSON.parse(raw);
if (ser(d) !== raw) throw new Error("다시 쓰면 원문과 달라짐 — 형식 보존 불가");
const L = d.lessons;
const from = L.findIndex((l) => l.id === id);
if (from < 0) throw new Error(`${id} 없음`);
const [entry] = L.splice(from, 1);
const at = L.findIndex((l) => l.id === after);
if (at < 0) throw new Error(`${after} 없음`);
L.splice(at + 1, 0, entry);
const around = (x) => { const i = L.findIndex((l) => l.id === x); return `${(L[i - 1] || {}).id || "-"} ← ${x} → ${(L[i + 1] || {}).id || "-"}`; };
console.log(`${course}: ${id} 자리 ${from} → ${at + 1} (목록 ${L.length}칸)\n  ${around(id)}`);
if (!APPLY) { console.log("(미리보기 — --apply 로 씀)"); process.exit(0); }
fs.writeFileSync(file, ser(d));
console.log("씀 (형식 그대로)");
