#!/usr/bin/env node
/**
 * 7단계 7-1 b 깨기 — 받아쓰기 보관함이 화면에 있는데 드라이버가 조립할 문장을 못 고르면, 말없이 돌아가지 않고 BLOCKED 를 남기는가.
 * 9/24 새벽 s14-1 은 tile dictation 기록이 아예 없었다(PASS 도 BLOCKED 도 아님 — BLOCKED 수에 안 잡히는 빠짐).
 * 같은 drive-generic.cjs 를 두 번 돌린다(운영 · 이용권 프로필 복사본 · 데스크톱 · 기본 s14-1):
 *   깨기 — 메모리에서 후보 문장을 '보관함에 없는 낱말' 로 바꿈(문장을 못 고르는 상황을 일부러 만듦) → tile dictation BLOCKED '(문장 못 고름)' 이어야
 *   그대로 — 지금 파일 → tile dictation PASS 여야
 * 둘 다 기대대로면 exit 0. 깨기 판에 기록이 없으면(= 예전처럼 말없이 돌아감) 실패.
 *   node docs/qa-2026-09-18/scripts/prove-tile-no-silence.cjs [--ids s14-1]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const OUT = path.join(HERE, "../out/features");
const argOf = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const IDS = argOf("--ids", "s14-1").split(",").filter(Boolean);

const CANDIDATES = "  const candidates = exp.tileWordsAll && exp.tileWordsAll.length";
function brokenSource() {
  const src = fs.readFileSync(path.join(HERE, "drive-generic.cjs"), "utf8");
  const a = src.indexOf(CANDIDATES);
  if (a < 0) throw new Error("drive-generic.cjs 의 candidates 자리를 못 찾음 — 이 증명을 고쳐야 함");
  // 원래 줄 앞에 '보관함에 없는 낱말' 후보를 끼우고 원래 선언은 이름만 바꿔 살려 둠(문법 그대로)
  return src.slice(0, a) + `  const candidates = [["zqxv", "vqzx", "qqzz"]]; // 깨기: 보관함에 없는 낱말\n  const __unused_candidates = exp.tileWordsAll && exp.tileWordsAll.length` + src.slice(a + CANDIDATES.length);
}

function run(label, suffix, broken) {
  const file = path.join(OUT, `student${suffix}.jsonl`);
  if (fs.existsSync(file)) fs.renameSync(file, `${file}.before-${Date.now()}`);
  const args = ["--course", "student", "--ids", IDS.join(","), "--viewports", "desktop", "--suffix", suffix, "--port", "9642", "--max-play", "4", "--clone", `proof71bsilent${broken ? "break" : "real"}`];
  // 소스는 표준입력으로 넘겨 메모리에서 컴파일(디스크에 쓰지 않음 · -e 는 Windows 명령줄 한도 — prove-tile-by-place 와 같은 방법)
  const BOOT = `let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",(d)=>s+=d);process.stdin.on("end",()=>{const {src,file,dir,args}=JSON.parse(s);const Module=require("module");const m=new Module(file,null);m.filename=file;m.paths=Module._nodeModulePaths(dir);process.argv=[process.argv[0],file,...args];m._compile(src,file);});`;
  try {
    if (broken) execFileSync(process.execPath, ["-e", BOOT], { cwd: path.join(HERE, "../../.."), input: JSON.stringify({ src: brokenSource(), file: path.join(HERE, "__prove71b-silent-drive-generic.cjs"), dir: HERE, args }), stdio: ["pipe", "inherit", "inherit"], timeout: 20 * 60 * 1000 });
    else execFileSync(process.execPath, [path.join(HERE, "drive-generic.cjs"), ...args], { cwd: path.join(HERE, "../../.."), stdio: "inherit", timeout: 20 * 60 * 1000 });
  } catch (e) { console.log(`(${label} 실행이 exit ${e.status}${e.code ? ` · ${e.code}` : ""} — 기록은 아래에서 읽음)`); }
  const out = {};
  if (fs.existsSync(file)) for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const t = (r.checks || []).filter((c) => c.feature === "tile dictation");
    out[r.url.split("/").pop()] = t.length ? t.map((c) => ({ status: c.status, item: c.item, note: String(c.note || "").slice(0, 150) })) : [];
  }
  return out;
}

const brk = run("깨기", "-proof71b-silent-break", true);
const real = run("그대로", "-proof71b-silent-real", false);
let wrong = 0;
for (const id of IDS) {
  const b = brk[id], r = real[id];
  const okB = Array.isArray(b) && b.some((c) => c.status === "BLOCKED" && /문장 못 고름/.test(c.item));
  const okR = Array.isArray(r) && r.length > 0 && r.every((c) => c.status === "PASS");
  if (!okB || !okR) wrong++;
  const show = (x) => (x === undefined ? "강의 기록 없음" : x.length ? x.map((c) => `${c.status} · ${c.item} · ${c.note}`).join(" / ") : "tile dictation 기록 없음(말없이 돌아감)");
  console.log(`${okB && okR ? "기대대로" : "!! 기대와 다름"} · ${id}\n    깨기: ${show(b)}\n    그대로: ${show(r)}`);
}
console.log(`\n기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
