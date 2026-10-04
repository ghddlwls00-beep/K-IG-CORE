#!/usr/bin/env node
/**
 * 회귀 점검 1002 단계 0 (2026-10-04) — 저장된 스윕 기록의 '화면에 있어야 할 글자' 를 다시 센다(브라우저 없이).
 *
 * drive-generic 이 방문마다 남긴 것 — 기록(jsonl)의 담는 곳 글(rec.containers) · 힌트 칩 · 깊이와, 단계별 화면 글
 * (out/rendered/<과정>/<id>.<화면>.json) — 을 지금(또는 --expectations 로 고른) 기대 글과 lib/content-check.cjs 로 다시 대조한다.
 * 쓰임: ① 기대 글을 고친 뒤 운영 기록을 다시 돌리지 않고 다시 셈 ② 깨기 — 기대 글 하나를 바꾼 expectations 사본으로 셈하면
 * '없음' 이 나와야 한다(나오지 않으면 이 대조는 기대 글을 보지 않는 것).
 *
 *   node recount-content.cjs --files adult-rc1002-adultsweep.jsonl[,…] [--expectations lib/expectations.cjs] [--course adult]
 * exit 0 = 없음 0 · exit 1 = 없음이 있음(목록을 찍음) · exit 2 = 부를 것이 잘못됨
 *
 * 화면 글 파일은 같은 강의 · 화면을 다시 돌리면 덮인다 — 기록의 시각보다 새 파일이면 '화면 글 새것' 으로 적는다(담는 곳 글은 기록 안에 있어 안 덮임).
 */
const fs = require("fs");
const path = require("path");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const FILES = arg("--files", null);
if (!FILES) { console.error("recount-content: --files <기록 jsonl,…> 필요"); process.exit(2); }
const OUT = path.resolve(arg("--out-root", path.join(__dirname, "../out")));
const FEAT = path.join(OUT, "features");
const EXP = path.resolve(__dirname, arg("--expectations", "lib/expectations.cjs"));
const ONLY_COURSE = arg("--course", null);
const E = require(EXP);
const { contentCheck } = require("./lib/content-check.cjs");

const latest = new Map();
for (const f of FILES.split(",").map((s) => s.trim()).filter(Boolean)) {
  const file = path.isAbsolute(f) ? f : path.join(FEAT, f);
  if (!fs.existsSync(file)) { console.error(`recount-content: ${file} 없음`); process.exit(2); }
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.visitError || !r.content || (ONLY_COURSE && r.course !== ONLY_COURSE)) continue;
    const k = `${r.course}|${r.id}|${r.viewport}`;
    if (!latest.has(k) || String(r.at) >= String(latest.get(k).at)) latest.set(k, r);
  }
}
if (!latest.size) { console.error("recount-content: 셀 기록 0"); process.exit(2); }

let expected = 0, found = 0, missingAll = 0, differs = 0;
console.log(`기대 글: ${path.relative(process.cwd(), EXP)} · 기록 ${latest.size}`);
for (const r of [...latest.values()].sort((a, b) => `${a.course}${a.id}${a.viewport}`.localeCompare(`${b.course}${b.id}${b.viewport}`))) {
  const exp = E.expected(r.course, r.id);
  const shot = path.join(OUT, "rendered", r.course, `${r.id}.${r.viewport}.json`);
  let texts = [];
  let note = "";
  if (fs.existsSync(shot)) {
    texts = JSON.parse(fs.readFileSync(shot, "utf8"));
    if (fs.statSync(shot).mtimeMs > Date.parse(r.at) + 15 * 60 * 1000) note = " (화면 글 파일이 기록보다 새것 — 다른 실행이 덮음)";
  } else note = " (화면 글 파일 없음 — 담는 곳 글로만)";
  const { missing, notSeen } = contentCheck({ course: r.course, exp, texts, rec: r });
  const f = exp.texts.length - missing.length - notSeen.length;
  expected += exp.texts.length; found += f; missingAll += missing.length;
  const was = r.content ? `${r.content.found}/${r.content.expected}` : "?";
  if (r.content && (r.content.found !== f || r.content.expected !== exp.texts.length)) differs++;
  console.log(`${r.course} ${r.id} ${r.viewport}: 있음 ${f}/${exp.texts.length} · 없음 ${missing.length}${notSeen.length ? ` · 이 깊이에서 안 봄 ${notSeen.length}` : ""} · 기록 당시 ${was}${note}`);
  for (const m of missing.slice(0, 8)) console.log(`    없음 ${m.kind}: ${String(m.text).slice(0, 110)}`);
}
console.log(`\n합계 기대 ${expected} · 있음 ${found} · 없음 ${missingAll} · 기록 당시와 다른 기록 ${differs}`);
process.exit(missingAll ? 1 : 0);
