#!/usr/bin/env node
/**
 * 빌드는 레슨 파일을 쓰지 않는다 — scripts/buildPassoffIndex.mjs --index-only 시험 (점검 2026-09-27).
 *
 * prebuild · predev 가 떼기(무료 체험 레슨의 paidStudent 문항 → content/private)를 쓰기 모드로 돌려, 누가 개발 서버를 켜기만 해도
 * 내용 세션이 고치던 레슨 파일을 다시 썼다. 이제 빌드는 --index-only 로 과정 목록만 쓰고 떼기는 검사만 한다.
 * 이 시험은 레슨 · 보충 · 과정 목록 사본(임시 폴더)으로 그 흐름을 돌린다:
 *   1. 그대로인 사본 → --index-only 가 exit 0, 파일 셋 그대로
 *   2. 내용 세션이 pg01-1 에 p2 를 paidStudent: true 로 다시 넣은 사본 → --index-only 가 exit 1(무료 레슨에 유료 문항이 남음),
 *      파일 셋 그대로, 멈춘 까닭에 내용 세션이 돌릴 명령
 *   3. 그냥 돌리면(내용 세션) 떼어 냄 — 보충의 ④ 순서 그대로(p2 제자리), p2 는 새 글
 *   4. 떼어 낸 뒤 --index-only 가 exit 0
 *
 *   node docs/pass-off-grammar/검사/index-only.cjs
 *   node docs/pass-off-grammar/검사/index-only.cjs --break=plain   일부러 깨기: 2 를 --index-only 없이(예전 빌드처럼) → 2 가 FAIL 이어야
 * 저장소 파일은 읽기만 한다. exit 1 on any failure.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "plain") throw new Error(`모르는 --break=${BREAK}`);

const T = fs.mkdtempSync(path.join(os.tmpdir(), "passoff-index-only-"));
const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f)); };
copyDir(path.join(REPO, "content/lessons/passoff-grammar"), path.join(T, "lessons/passoff-grammar"));
copyDir(path.join(REPO, "content/private/passoff-grammar"), path.join(T, "private/passoff-grammar"));
fs.mkdirSync(path.join(T, "courses"), { recursive: true });
fs.copyFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), path.join(T, "courses/passoff-grammar.json"));

const run = (...args) => spawnSync(process.execPath, [path.join(REPO, "scripts/buildPassoffIndex.mjs"), ...args, "--content", T], { cwd: REPO, encoding: "utf8" });
const FILES = ["lessons/passoff-grammar/pg01-1.json", "private/passoff-grammar/pg01-1.paid.json", "courses/passoff-grammar.json"];
const snap = () => JSON.stringify(FILES.map((r) => fs.readFileSync(path.join(T, r), "utf8")));
const rows = [];
const check = (name, ok, detail = "") => rows.push({ name, ok, detail });
const lastLine = (s) => String(s || "").trim().split(/\r?\n/).slice(-1)[0];

try {
  // 1
  let before = snap();
  let r = run("--index-only");
  check("1. 그대로인 사본 --index-only → exit 0", r.status === 0, lastLine(r.stdout));
  check("1. 파일 셋 그대로", before === snap());

  // 2 — p2 (보충에 있는 유료 문항) 를 고쳐서 paidStudent: true 로 레슨 파일에 다시 넣음
  const lf = path.join(T, "lessons/passoff-grammar/pg01-1.json");
  const sup = JSON.parse(fs.readFileSync(path.join(T, "private/passoff-grammar/pg01-1.paid.json"), "utf8"));
  const p2 = (sup.items || []).find((e) => e.item && e.item.id === "pg01-1:p2");
  if (!p2) throw new Error("보충에 pg01-1:p2 가 없음 — 이 시험의 전제가 바뀜");
  const lesson = JSON.parse(fs.readFileSync(lf, "utf8"));
  lesson.blocks.find((b) => b.type === "drill").produce.unshift({ ...p2.item, accept: [...(p2.item.accept || []), "I see my friends often."] });
  fs.writeFileSync(lf, JSON.stringify(lesson, null, 2) + "\n");
  before = snap();
  r = BREAK === "plain" ? run() : run("--index-only");
  if (BREAK) console.log("[일부러 깸] 2 를 --index-only 없이 돌림(예전 prebuild · predev 와 같음)");
  check("2. 유료 문항이 다시 든 사본 --index-only → exit 1", r.status === 1, (r.stderr || "").trim().split(/\r?\n/)[1] || "");
  check("2. 레슨 · 보충 · 목록 파일 그대로(빌드는 쓰지 않음)", before === snap());
  check("2. 멈춘 까닭에 내용 세션이 돌릴 명령", /node scripts\/buildPassoffIndex\.mjs/.test(r.stderr || ""));

  if (!BREAK) {
    // 3
    r = run();
    const lesson3 = fs.readFileSync(lf, "utf8");
    const sup3 = JSON.parse(fs.readFileSync(path.join(T, "private/passoff-grammar/pg01-1.paid.json"), "utf8"));
    const heldProduce = sup.items.filter((e) => e.list === "produce").map((e) => e.item.id).join(" ");
    const order = sup3.items.filter((e) => e.list === "produce").map((e) => e.item.id).join(" ");
    check("3. 그냥 돌리면(내용 세션) 떼어 냄 → exit 0", r.status === 0, lastLine(r.stdout));
    check("3. 무료 레슨 파일에 paidStudent: true 없음", !/"paidStudent":\s*true/.test(lesson3));
    check("3. 보충의 ④ 순서 그대로(p2 제자리)", order === heldProduce, order);
    check("3. p2 는 새 글(accept 하나 더)", (sup3.items.find((e) => e.item.id === "pg01-1:p2").item.accept || []).includes("I see my friends often."));
    // 4
    r = run("--index-only");
    check("4. 떼어 낸 뒤 --index-only → exit 0", r.status === 0);
  }
} finally {
  fs.rmSync(T, { recursive: true, force: true });
}

console.log(`빌드는 레슨 파일을 쓰지 않음 — buildPassoffIndex --index-only 시험${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
for (const row of rows) console.log(`  ${row.ok ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
const fails = rows.filter((x) => !x.ok).length;
console.log(`${fails ? "FAIL" : "PASS"} — ${rows.length - fails}/${rows.length}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
process.exit(fails ? 1 : 0);
