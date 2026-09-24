// 워크플로우 스크립트 모의 실행 — 가짜 agent 로: 일꾼 수 · 파일이 조각마다 빠짐없이 한 번씩 · 동시 6 을 넘지 않음 ·
// 확인은 그 조각의 읽기가 다 끝난 뒤 · 빈자리는 확인 먼저 · 읽기는 긴 몫부터. 어림 분을 ms 로 줄여 흉내.
const fs = require("fs");
const path = require("path");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const SRC = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/full-read-workflow.js");
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/읽을거리");
let s = fs.readFileSync(SRC, "utf8");
if (/\r/.test(s)) console.log("주의: 스크립트에 CR 이 있음(권한 검사가 막음)");
s = s.replace("export const meta", "const meta");
const AF = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AF("args", "agent", "parallel", "pipeline", "phase", "log", s);
let running = 0, peak = 0, t = 0;
const events = [];
const prompts = [];
const agent = (p, o) => {
  running++; peak = Math.max(peak, running);
  const isRead = o.label.startsWith("read:");
  const m = /\*\*([0-9.md ·]+)\*\*/.exec(p);
  const est = isRead ? Number((/어림/.test(p), 0)) : 0;
  prompts.push({ label: o.label, p, files: isRead && m ? m[1].split(" · ") : null });
  events.push(`${String(events.length).padStart(2)} 시작 ${o.label} (동시 ${running})`);
  const dur = isRead ? 20 + (o.label.length % 7) * 3 : 15;
  return new Promise((res) => setTimeout(() => { running--; events.push(`   끝 ${o.label}`); res(isRead ? { sub: o.label, groups_done: 1, groups_total: 1, my_files_done: true, notes: "" } : { chunk: o.label, targets: 1, done: 1, status_exit0: true, notes: "" }); }, dur));
};
const parallel = async (thunks) => Promise.all(thunks.map((th) => th().catch(() => null)));
const logs = [];
fn({ wt: WT, sp: "SP" }, agent, parallel, null, () => {}, (m) => logs.push(m)).then((r) => {
  console.log(`결과 ${r.length} · 일꾼 ${prompts.length}(읽기 ${prompts.filter((x) => x.files).length} · 확인 ${prompts.filter((x) => !x.files).length}) · 동시 최대 ${peak}`);
  // 파일 덮음
  let ok = true;
  for (const ch of fs.readdirSync(B).sort()) {
    const want = Object.keys(JSON.parse(fs.readFileSync(path.join(B, ch, "ids.json"), "utf8")).batches).sort();
    const got = prompts.filter((x) => x.files && (x.label === `read:${ch}` || x.label.startsWith(`read:${ch}#`))).flatMap((x) => x.files).sort();
    const same = JSON.stringify(want) === JSON.stringify(got);
    if (!same) ok = false;
    console.log(`${ch.padEnd(11)} 파일 ${want.length} · 일꾼들이 맡은 파일 ${got.length} ${same ? "✔ 빠짐 · 겹침 없음" : "✘ " + JSON.stringify({ want, got })}`);
  }
  // 확인이 그 조각 읽기 뒤에
  const order = events.filter((e) => /시작|끝/.test(e));
  let bad = 0;
  for (const x of prompts.filter((x) => !x.files)) {
    const ch = x.label.slice(7);
    const vi = order.findIndex((e) => e.includes(`시작 ${x.label} `));
    const lastRead = Math.max(...order.map((e, i) => (e.includes(`끝 read:${ch}`) && (e.endsWith(`read:${ch}`) || e.includes(`read:${ch}#`)) ? i : -1)));
    if (!(vi > lastRead)) bad++;
  }
  console.log(`확인이 그 조각 읽기가 다 끝난 뒤 시작: ${bad ? "✘ " + bad : "✔ 10/10"} · 파일 덮음 ${ok ? "✔" : "✘"}`);
  console.log(`처음 여섯 시작: ${order.filter((e) => e.includes("시작")).slice(0, 6).map((e) => e.split("시작 ")[1].split(" (")[0]).join(" · ")}`);
  console.log(logs[0]);
  const rp = prompts.find((x) => x.label === "read:ld-a#3").p;
  console.log("--- read:ld-a#3 머리 ---\n" + rp.split("\n")[0]);
  console.log("방법 3:", rp.split("\n").find((l) => l.startsWith("3.")));
  console.log("방법 6:", rp.split("\n").find((l) => l.startsWith("6.")));
  const vp = prompts.find((x) => x.label === "verify:voca-b").p;
  console.log("--- verify:voca-b 머리 ---\n" + vp.split("\n").slice(0, 2).join("\n"));
  const g2 = prompts.find((x) => x.label === "read:grammar2").p;
  console.log(`풀이 11 · 원본 그대로(10) · 칩 ㉠ 들어감: ${/11\. 내용 재검토 결과의 '소유자 답'/.test(g2)} · ${/10\. \*\*원본 그대로/.test(g2)} · ${/㉠ 칭호 약어/.test(prompts.find((x) => x.label === "read:ld-b#2").p)}`);
});
