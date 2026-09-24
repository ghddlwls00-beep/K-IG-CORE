// add-lock.cjs 시험 — 가짜 조각 zz-test 에 두 배치를 '같은 때' 적는다. 잠금 없이(add-full.cjs 바로)면 한 배치가 사라질 수 있고,
// 잠금으로는 늘 둘 다 남아야 한다. 끝나면 시험 파일을 모두 치운다(진짜 조각은 건드리지 않음).
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const ADD = path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/add-full.cjs");
const LOCK = path.join(__dirname, "add-lock.cjs");
const dir = path.join(B, "읽을거리", "zz-test");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "ids.json"), JSON.stringify({ groups: { "t/g1": 1, "t/g2": 1, "t/g3": 1 }, batches: { "01.md": ["t/g1"], "02.md": ["t/g2"], "03.md": ["t/g3"] } }));
const bf = (n) => path.join(B, "work", `zz-b${n}.json`);
for (const n of [1, 2, 3]) fs.writeFileSync(bf(n), JSON.stringify({ 파일: `0${n}.md`, 묶음: [{ 묶음: `t/g${n}`, "읽은 글": 1, 틀림: [] }] }));
const OUT = path.join(B, "판정-zz-test.json"), LOG = path.join(B, "기록-zz-test.md");
const run = (args) => new Promise((res) => { const p = spawn(process.execPath, args, { cwd: WT, stdio: "ignore" }); p.on("exit", res); });
async function trial(lock) {
  for (const f of [OUT, LOG]) if (fs.existsSync(f)) fs.unlinkSync(f);
  await Promise.all([1, 2, 3].map((n) => run(lock ? [LOCK, "zz-test", bf(n)] : [ADD, "zz-test", bf(n)])));
  return JSON.parse(fs.readFileSync(OUT, "utf8")).묶음.length;
}
(async () => {
  const a = [], b = [];
  for (let i = 0; i < 8; i++) a.push(await trial(false));
  for (let i = 0; i < 8; i++) b.push(await trial(true));
  // 끝 줄(--note-file)도 잠금으로 더해지는지
  const note = path.join(__dirname, "zz-note.md");
  fs.writeFileSync(note, "- 끝(zz-test#1 · 파일 01.md): 시험");
  await run([LOCK, "zz-test", "--note-file", note]);
  const noteOk = fs.readFileSync(LOG, "utf8").includes("- 끝(zz-test#1 · 파일 01.md): 시험");
  console.log(`잠금 없이 add-full 셋을 같은 때(8번): 남은 묶음 = ${a.join(",")} (3 이 아니면 배치가 사라진 것)`);
  console.log(`잠금으로 같은 때(8번):              남은 묶음 = ${b.join(",")}`);
  console.log(`--note-file 로 기록에 끝 줄: ${noteOk ? "✔" : "✘"}`);
  // 치우기
  for (const f of [OUT, LOG, note, ...[1, 2, 3].map(bf)]) if (fs.existsSync(f)) fs.unlinkSync(f);
  fs.rmSync(dir, { recursive: true, force: true });
  const left = [OUT, LOG, dir, path.join(B, "work", ".lock-zz-test")].filter((f) => fs.existsSync(f));
  console.log(`시험 파일 치움: ${left.length ? "남음 " + left.join(" ") : "✔"}`);
})();
