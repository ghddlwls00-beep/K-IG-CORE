#!/usr/bin/env node
/**
 * 7단계 7-1 b 깨기 — STUDENT 받아쓰기: 같은 낱말이 두 번 든 문장을 드라이버가 조립하는가.
 * 옛 규칙(글자가 같은 버튼 중 마지막 것 — STUDENT 는 쓴 타일이 disabled 로 제자리에 남아 두 번째에 그것을 누름)과
 * 지금 규칙(보관함의 자리 순서대로, 아직 누를 수 있는 첫 자리)을 **같은 drive-generic.cjs** 로 돌린다 — 옛 규칙 판은 지금 파일에서
 * clickTile 한 덩어리만 옛 글로 바꿔 메모리에서 컴파일(디스크에 쓰지 않음, 상대 require 가 맞게 scripts 폴더 이름으로).
 * 대상(운영 · 이용권 프로필 복사본 — 원본은 읽기만 · 데스크톱): 9/23 기록에서 조립할 문장의 두 번째 겹침 낱말이 빠져 BLOCKED 였던
 * s10-1('as … as my') · s3-1('to … to you') · s8-2('I … I can'), 그리고 소유자가 손으로 '정답' 을 본 s1-4. (--dup · --ref 로 바꿈)
 * 기대: 옛 규칙은 겹치는 강의에서 tile dictation 이 PASS 가 아님 · 지금 규칙은 모두 PASS(정답 배너) · 옛 규칙 기록이 없으면 실패. exit 0 = 기대대로.
 *   node docs/qa-2026-09-18/scripts/prove-tile-by-place.cjs [--dup s10-1,s3-1,s8-2] [--ref s1-4]
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const OUT = path.join(HERE, "../out/features");
// --dup a,b,c : 드라이버가 조립할 문장에 같은 낱말이 두 번 든 강의(옛 규칙이 PASS 가 아니어야) · --ref x : 겹침 없는 기준 강의(소유자 확인 s1-4)
// 처음 판은 '1번 문장에 겹침' 인 s1-3 · s2-1 · s2-5 를 골랐는데 옛 규칙도 PASS — 드라이버가 실제로 조립한 문장이 그 문장이 아니었다.
// 그래서 9/23 기록(student-restore0923)에서 두 번째 겹침 낱말이 빠져 BLOCKED 였던 강의를 쓴다(기본값).
const argOf = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DUP = new Set(argOf("--dup", "s10-1,s3-1,s8-2").split(",").filter(Boolean));
const REF = argOf("--ref", "s1-4").split(",").filter(Boolean);
const IDS = [...DUP, ...REF];

const NEW_CLICK_START = "  const clickTile = async (word) => H.click(tab, `(() => {";
const OLD_CLICK = `  const clickTile = async (word) => H.click(tab, \`(() => {
    const vis = \${VIS};
    const main = document.querySelector('main') || document.body;
    const norm = (s) => s.replace(/[^\\\\w'\\\\u2019-]/g, '').toLowerCase();
    const want = \${JSON.stringify(word)};
    const placed = (b) => /✕|✖/.test(b.innerText || '') || /되돌리|보관함으로/.test(b.getAttribute('title') || '');
    const hits = [...main.querySelectorAll('button')].filter(vis).filter((b) => !placed(b) && norm((b.innerText || '')) === norm(want));
    return hits.length ? hits[hits.length - 1] : null;
  })()\`, { settle: 250 });`;

function oldSource() {
  const src = fs.readFileSync(path.join(HERE, "drive-generic.cjs"), "utf8");
  const a = src.indexOf(NEW_CLICK_START);
  const b = src.indexOf("{ settle: 250 });", a);
  if (a < 0 || b < 0) throw new Error("drive-generic.cjs 의 clickTile 자리를 못 찾음 — 이 증명을 고쳐야 함");
  return src.slice(0, a) + OLD_CLICK + src.slice(b + "{ settle: 250 });".length);
}

function run(label, suffix, useOld) {
  const file = path.join(OUT, `student${suffix}.jsonl`);
  if (fs.existsSync(file)) fs.renameSync(file, `${file}.before-${Date.now()}`);
  const args = ["--course", "student", "--ids", IDS.join(","), "--viewports", "desktop", "--suffix", suffix, "--port", "9641", "--clone", `proof71b${useOld ? "old" : "new"}`];
  // 옛 규칙 판은 표준입력으로 넘겨 메모리에서 컴파일한다 — 처음 판은 -e 로 소스 전체를 넘겨 Windows 명령줄 한도를 넘었고(실행 안 됨),
  // 기록 없음을 '옛 규칙 실패' 로 쳐서 '기대대로' 라고 적었다(가짜 통과). 이제 옛 기록이 없으면 실패로 센다(아래).
  const BOOT = `let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",(d)=>s+=d);process.stdin.on("end",()=>{const {src,file,dir,args}=JSON.parse(s);const Module=require("module");const m=new Module(file,null);m.filename=file;m.paths=Module._nodeModulePaths(dir);process.argv=[process.argv[0],file,...args];m._compile(src,file);});`;
  try {
    if (useOld) execFileSync(process.execPath, ["-e", BOOT], { cwd: path.join(HERE, "../../.."), input: JSON.stringify({ src: oldSource(), file: path.join(HERE, "__prove71b-old-drive-generic.cjs"), dir: HERE, args }), stdio: ["pipe", "inherit", "inherit"], timeout: 20 * 60 * 1000 });
    else execFileSync(process.execPath, [path.join(HERE, "drive-generic.cjs"), ...args], { cwd: path.join(HERE, "../../.."), stdio: "inherit", timeout: 20 * 60 * 1000 });
  } catch (e) { console.log(`(${label} 실행이 exit ${e.status}${e.code ? ` · ${e.code}` : ""} — 기록은 아래에서 읽음)`); }
  const out = {};
  if (fs.existsSync(file)) for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const t = (r.checks || []).find((c) => c.feature === "tile dictation");
    out[r.url.split("/").pop()] = t ? { status: t.status, note: String(t.note || "").slice(0, 150) } : { status: "없음", note: "tile dictation 기록 없음" };
  }
  return out;
}

const oldR = run("옛 규칙", "-proof71b-old", true);
const newR = run("지금 규칙", "-proof71b-new", false);
let wrong = 0;
for (const id of IDS) {
  const o = oldR[id] || { status: "없음" }, n = newR[id] || { status: "없음" };
  // 옛 규칙이 실제로 돌아 기록을 남겼어야 한다(없음 = 증명 실패). 겹치는 셋은 PASS 가 아니어야, s1-4 는 무엇이든(겹침 없음).
  const ran = ["PASS", "FAIL", "BLOCKED"].includes(o.status);
  const okOld = ran && (DUP.has(id) ? o.status !== "PASS" : true);
  const okNew = n.status === "PASS";
  if (!okOld || !okNew) wrong++;
  console.log(`${okOld && okNew ? "기대대로" : "!! 기대와 다름"} · ${id}${DUP.has(id) ? " (같은 낱말 두 번)" : " (소유자 확인 강의)"} — 옛 ${o.status} · 지금 ${n.status}\n    옛: ${o.note}\n    지금: ${n.note}`);
}
console.log(`\n기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
