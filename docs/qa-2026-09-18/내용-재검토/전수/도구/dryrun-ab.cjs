// A · B 워크플로우 모의 실행 — 가짜 agent: 일꾼 수 · 동시 최대 · 확인이 그 읽기 뒤 · 프롬프트의 경로와 규칙.
const fs = require("fs");
const path = require("path");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
let s = fs.readFileSync(path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/decisions-ab-workflow.js"), "utf8");
if (/\r/.test(s)) console.log("주의: CR 있음");
s = s.replace("export const meta", "const meta");
const AF = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AF("args", "agent", "parallel", "pipeline", "phase", "log", s);
let running = 0, peak = 0;
const ev = [], P = [];
const agent = (p, o) => {
  running++; peak = Math.max(peak, running);
  P.push({ label: o.label, p });
  ev.push(`시작 ${o.label}`);
  const dur = /^grade:|^read2:/.test(o.label) ? 20 + (o.label.length % 5) * 4 : 10;
  return new Promise((res) => setTimeout(() => {
    running--; ev.push(`끝 ${o.label}`);
    if (o.label.startsWith("grade:")) res({ packet: o.label, items_done: 1, items_total: 1, status_exit0: true, notes: "" });
    else if (o.label.startsWith("read2:")) res({ sub: o.label, groups_done: 1, groups_total: 1, my_files_done: true, notes: "" });
    else res({ chunk: o.label, packet: o.label, targets: 1, done: 1, status_exit0: true, notes: "" });
  }, dur));
};
const parallel = async (th) => Promise.all(th.map((t) => t().catch((e) => { console.log("thunk 오류", e.message); return null; })));
const logs = [];
fn({ wt: WT, sp: "SP" }, agent, parallel, null, () => {}, (m) => logs.push(m)).then((r) => {
  const n = (re) => P.filter((x) => re.test(x.label)).length;
  console.log(`결과 ${r.length} · 일꾼 ${P.length}(A 재기 ${n(/^grade:/)} · A 확인 ${n(/^grade-check:/)} · B 읽기 ${n(/^read2:/)} · B 확인 ${n(/^check2:/)}) · 동시 최대 ${peak}`);
  let bad = 0;
  for (const x of P.filter((x) => x.label.startsWith("grade-check:"))) { const nn = x.label.split(":")[1]; if (ev.indexOf(`시작 ${x.label}`) < ev.indexOf(`끝 grade:${nn}`)) bad++; }
  for (const x of P.filter((x) => x.label.startsWith("check2:"))) { const b = x.label.split(":")[1]; const last = Math.max(...ev.map((e, i) => (e.startsWith(`끝 read2:${b}2`) ? i : -1))); if (ev.indexOf(`시작 ${x.label}`) < last) bad++; }
  console.log(`확인이 그 읽기 뒤: ${bad ? "✘ " + bad : "✔"}`);
  console.log(`처음 여섯: ${ev.filter((e) => e.startsWith("시작")).slice(0, 6).map((e) => e.slice(3)).join(" · ")}`);
  console.log(logs[0]);
  const a = P.find((x) => x.label === "grade:16").p, av = P.find((x) => x.label === "grade-check:16").p, b = P.find((x) => x.label === "read2:ld-a2#3").p, bv = P.find((x) => x.label === "check2:ld-b").p;
  console.log("A 머리:", a.split("\n")[0].slice(0, 160));
  console.log("A --try 줄:", (a.split("\n").find((l) => l.includes("--try")) || "").slice(0, 200));
  console.log("A 확인 R 먼저:", /R:\(가린 채 스스로 재기\)를 맨 먼저/.test(av), "· B 머리:", b.split("\n")[0].slice(0, 260));
  console.log("B 적기 줄:", (b.split("\n").find((l) => l.includes("add-lock.cjs")) || "").slice(0, 200));
  console.log("B 확인 --pick:", (bv.split("\n").find((l) => l.includes("--pick")) || "").slice(0, 160));
  console.log("소유자 답 4 · 원본 그대로 · 칩 ㉠ 들어감:", /소유자 답 4/.test(a), /10\. \*\*원본 그대로/.test(b), /㉠ 칭호 약어/.test(b));
});
