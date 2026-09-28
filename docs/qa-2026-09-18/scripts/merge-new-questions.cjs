#!/usr/bin/env node
/**
 * 2026-09-28 새 문제 — 묶음 사본(_staging/<묶음>/{ld,reading}/<id>.json)을 본 폴더(새-문제/{ld,reading}/)로 옮기고 검사한다.
 *   node merge-new-questions.cjs <묶음 이름 …> [--dry]
 *   예: node merge-new-questions.cjs ld-001 ld-008 rd-001      (묶음 이름은 _staging 아래 폴더 이름)
 * 하는 일(하나라도 어긋나면 옮기지 않고 exit 1):
 *   1. 묶음마다 check-new-questions --dir _staging/<묶음> PASS (그 묶음만의 치우침 검사)
 *   2. 사본 파일이 제 과정 폴더에 있고, 강의 id 가 파일 이름과 같음
 *   3. 옮긴 뒤 본 폴더 전체 · 과정별(ld · reading 따로) check-new-questions PASS
 *   --dry: 옮기지 않고 1 · 2 만 보고, 옮긴다면 무엇이 바뀌는지(새 파일 · 바뀐 파일 · 같은 파일) 셈
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const Q = path.join(REPO, "docs/qa-2026-09-18/학습법-화면-0927/새-문제");
const STAGE = path.join(Q, "_staging");
const CHECK = path.join(__dirname, "check-new-questions.cjs");
const DRY = process.argv.includes("--dry");
const batches = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!batches.length) {
  console.error("묶음 이름을 주세요 (예: ld-001 rd-001)");
  process.exit(2);
}
const check = (dir) => {
  const r = spawnSync(process.execPath, [CHECK, "--dir", dir], { encoding: "utf8" });
  const lines = `${r.stdout || ""}${r.stderr || ""}`.trim().split(/\r?\n/);
  return { ok: r.status === 0, first: lines[0] || "", tail: lines.slice(1, 6) };
};

let bad = 0;
const plan = [];
for (const b of batches) {
  const dir = path.join(STAGE, b);
  if (!fs.existsSync(dir)) { console.log(`FAIL ${b}: 폴더 없음`); bad++; continue; }
  const c = check(dir);
  console.log(`${c.ok ? "PASS" : "FAIL"} ${b}: ${c.first}`);
  if (!c.ok) { c.tail.forEach((l) => console.log(`   ${l}`)); bad++; }
  for (const course of ["ld", "reading"]) {
    const cdir = path.join(dir, course);
    if (!fs.existsSync(cdir)) continue;
    for (const f of fs.readdirSync(cdir).filter((x) => x.endsWith(".json"))) {
      const d = JSON.parse(fs.readFileSync(path.join(cdir, f), "utf8"));
      if (d.lesson !== f.replace(/\.json$/, "") || d.course !== course) { console.log(`FAIL ${b}/${course}/${f}: lesson ${d.lesson} · course ${d.course}`); bad++; continue; }
      const to = path.join(Q, course, f);
      const before = fs.existsSync(to) ? fs.readFileSync(to, "utf8") : null;
      const after = fs.readFileSync(path.join(cdir, f), "utf8");
      plan.push({ from: path.join(cdir, f), to, kind: before === null ? "새 파일" : before === after ? "같음" : "바뀜" });
    }
  }
}
const count = (k) => plan.filter((p) => p.kind === k).length;
console.log(`옮길 것 ${plan.length} — 새 파일 ${count("새 파일")} · 바뀜 ${count("바뀜")} · 같음 ${count("같음")}`);
if (bad) { console.log(`FAIL ${bad} — 옮기지 않음`); process.exit(1); }
if (DRY) { console.log("--dry: 옮기지 않음"); process.exit(0); }

for (const p of plan) {
  fs.mkdirSync(path.dirname(p.to), { recursive: true });
  if (p.kind !== "같음") fs.copyFileSync(p.from, p.to);
}
// the whole set, then each course alone (a course can hide a shortcut the other one balances out)
let after = 0;
const whole = check(Q);
console.log(`${whole.ok ? "PASS" : "FAIL"} 전체: ${whole.first}`);
if (!whole.ok) { whole.tail.forEach((l) => console.log(`   ${l}`)); after++; }
for (const course of ["ld", "reading"]) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `kig-nq-${course}-`));
  fs.mkdirSync(path.join(tmp, course));
  for (const f of fs.readdirSync(path.join(Q, course)).filter((x) => x.endsWith(".json"))) fs.copyFileSync(path.join(Q, course, f), path.join(tmp, course, f));
  const c = check(tmp);
  console.log(`${c.ok ? "PASS" : "FAIL"} ${course} 만: ${c.first}`);
  if (!c.ok) { c.tail.forEach((l) => console.log(`   ${l}`)); after++; }
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(after ? `FAIL ${after} (옮긴 뒤 검사)` : "PASS — 옮김 · 전체 · 과정별 검사 통과");
process.exit(after ? 1 : 0);
