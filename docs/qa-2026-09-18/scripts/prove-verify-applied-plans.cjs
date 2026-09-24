#!/usr/bin/env node
/**
 * 7단계 7-1 d · h 일부러 깨기 — verify-applied-plans.cjs 의 옛 판(034e91b)과 지금 판을 **같은 깨진 복사본**에 돌려 비교한다.
 * 임시 폴더의 복사본에만 손대고 저장소 파일은 건드리지 않는다(끝나면 임시 폴더를 지움).
 *   node docs/qa-2026-09-18/scripts/prove-verify-applied-plans.cjs
 * 기대: 깨지 않은 복사본은 둘 다 exit 0. 깬 네 가지는 옛 판 exit 0(못 잡음) · 지금 판 exit 1. 계획을 안 넘기면 옛 판 exit 0 · 지금 판 exit 1.
 * 기대와 하나라도 다르면 이 스크립트가 exit 1.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OLD_REV = "034e91b";
const REL = "docs/qa-2026-09-18/scripts";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kig-prove-vap-"));
const cp = (rel) => fs.cpSync(path.join(REPO, rel), path.join(tmp, rel), { recursive: true });
fs.mkdirSync(path.join(tmp, REL), { recursive: true });
fs.writeFileSync(path.join(tmp, REL, "old.cjs"), execFileSync("git", ["show", `${OLD_REV}:${REL}/verify-applied-plans.cjs`], { cwd: REPO, encoding: "utf8" }));
fs.copyFileSync(path.join(__dirname, "verify-applied-plans.cjs"), path.join(tmp, REL, "new.cjs"));
cp(`${REL}/plans`);
const COPY = ["content/ld_english_scripts.json", "content/lessons/ld", "content/lessons/student", "content/lessons/grammar2", "content/courses/student.json"]; // 시험 계획들이 가리키는 파일 전부
const base = () => { for (const rel of COPY) { fs.rmSync(path.join(tmp, rel), { recursive: true, force: true }); cp(rel); } };
function edit(rel, from, to) {
  const f = path.join(tmp, rel);
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes(from)) throw new Error(`깨기 자리 없음: ${rel} '${from}'`);
  fs.writeFileSync(f, t.replace(from, to));
}
const run = (tool, plans) => {
  const r = spawnSync(process.execPath, [path.join(tmp, REL, tool), ...plans.map((p) => path.join(tmp, REL, "plans", p))], { encoding: "utf8" });
  const last = (r.stdout || "").trim().split("\n").filter((x) => /계획 \d+개/.test(x)).pop() || (r.stderr || "").trim().split("\n")[0];
  return { code: r.status, last };
};
const cases = [
  { name: "깨지 않음(factual-ld-c)", plans: ["stage6-factual-ld-c.json"], want: [0, 0] },
  { name: "깨지 않음(factual-student-a · student-a · ld-number-hints-2)", plans: ["stage6-factual-student-a.json", "stage6-student-a.json", "stage6-ld-number-hints-2.json"], want: [0, 0] },
  { name: "사슬 끝 글을 몰래 바꿈 — d201 n2 KO(6-0321 → stage6-ld-q 6-0322)", plans: ["stage6-factual-ld-c.json"], want: [0, 1],
    brk: () => edit("content/ld_english_scripts.json", "기이한 형태의 처벌을 다룬다", "기이한 형태의 형벌을 다룬다") },
  { name: "지운 드릴 자료가 되살아남 — s4-4 chunkDrills(6-1651 → 7-4 c)", plans: ["stage6-factual-student-a.json"], want: [0, 1],
    brk: () => edit("content/lessons/student/s4-4.json", "{", "{\n \"chunkDrills\": [],") },
  { name: "옮겨간 글을 바꿈 — s1-5 #1 → s1-4(6-1626 movedTo)", plans: ["stage6-student-a.json"], want: [0, 1],
    brk: () => edit("content/lessons/student/s1-4.json", "나의 취미는 책 읽기, 음악 듣기, 등산, 영화 보기, 스포츠 참여입니다.", "나의 취미는 독서입니다.") },
  { name: "스크립트가 고친 지금 글을 바꿈 — d144 n4(nowText)", plans: ["stage6-ld-number-hints-2.json"], want: [0, 1],
    brk: () => edit("content/lessons/ld/d144.json", "Dr. Cooper's 2:00 appointment", "Dr. Cooper's appointment") },
  { name: "계획을 안 넘김(7-1 h)", plans: [], want: [0, 1] },
];
let wrong = 0;
for (const c of cases) {
  base();
  if (c.brk) c.brk();
  const o = run("old.cjs", c.plans), n = run("new.cjs", c.plans);
  const ok = o.code === c.want[0] && n.code === c.want[1];
  if (!ok) wrong++;
  console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${c.name}\n   옛 판 exit ${o.code} — ${o.last}\n   지금 판 exit ${n.code} — ${n.last}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${cases.length}가지 중 기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
