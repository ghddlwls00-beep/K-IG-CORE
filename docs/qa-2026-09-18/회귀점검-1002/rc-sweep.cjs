#!/usr/bin/env node
/**
 * 회귀 점검 1002 단계 1 — 운영 전 쪽 × 3화면(휴대폰 mobile · 작은 휴대폰 small · 데스크톱 desktop) 스윕 순서표.
 * 최종 관문의 gate0-sweep.cjs(스크래치)와 같은 생각: 과정 × 화면을 조각으로 나누고, 긴 것부터 빈 자리가 가져간다.
 *
 *   node rc-sweep.cjs --plan            조각 목록과 어림 시간만 찍음
 *   node rc-sweep.cjs --run             돌림(상태 out/rc1002/state.json · 기록 out/rc1002/sweep.log)
 *
 * 조종(돌리는 중에 바꿔도 됨 — 30초마다 다시 읽음): out/rc1002/control.json
 *   { "maxParallel": 2, "courses": ["student","phonics",…], "paused": false }
 *   maxParallel 만큼만 브라우저 작업을 띄움 · courses 에 없는 과정은 시작하지 않음(돌던 것은 끝까지).
 *
 * 기록 파일: out/features/<과정>-rc-<화면>-<i>of<n>[-r<k>].jsonl (drive-generic) ·
 *            out/features/reading-rc-<i>of<n>.jsonl (drive-reading — 조각마다 3화면, 같은 파일로 이어 하기)
 * 끊긴 조각: drive-generic 은 그 조각 파일들에서 본 강의를 뺀 나머지를 --ids 로 새 이름(-r<k>) 파일에(옛 기록과 안 섞음 —
 *            관문 0 에서 --resume 이 옛 전수 기록을 '이미 함' 으로 센 함정 때문). drive-reading 은 같은 파일 이어 하기(기본 resume).
 *            한 조각 3번까지 다시.
 * 이 기계를 재우지 않음: 돌리는 동안 PowerShell 자식이 SetThreadExecutionState(ES_CONTINUOUS|ES_SYSTEM_REQUIRED)를 붙잡음 — 끝나면 풀림.
 * 운영에 대해 읽기만: 드라이버들이 하는 일 그대로(이용권 사본 · 바꾸는 것은 사본의 localStorage 와 STUDENT · ADULT 완료 눌렀다 되돌리기뿐).
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "docs/qa-2026-09-18/scripts");
const OUT = path.join(REPO, "docs/qa-2026-09-18/out");
// 고친 배포 뒤 두 번째 스윕(2026-10-05): RC_TAG=rc2 → 상태 폴더 out/rc1002-rc2 · 기록 이름 <과정>-rc2-… (첫 스윕 기록과 안 섞임)
const TAG = process.env.RC_TAG || "rc";
const DIR = path.join(OUT, TAG === "rc" ? "rc1002" : `rc1002-${TAG}`);
// RC_COURSES=adult,student,… (계획에 넣을 과정 — 없으면 전부) · RC_SAMPLE=ld:10,reading:10 (그 과정은 N 강마다 하나)
const ONLY_COURSES = process.env.RC_COURSES ? new Set(process.env.RC_COURSES.split(",")) : null;
const SAMPLE = Object.fromEntries((process.env.RC_SAMPLE || "").split(",").filter(Boolean).map((s) => s.split(":")).map(([c, n]) => [c, Number(n)]));
const FEAT = path.join(OUT, "features");
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(FEAT, { recursive: true });
const STATE = path.join(DIR, "state.json");
const CONTROL = path.join(DIR, "control.json");
const LOG = path.join(DIR, "sweep.log");
const log = (m) => { const l = `${new Date().toISOString()} ${m}`; console.log(l); fs.appendFileSync(LOG, l + "\n"); };

const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const VPS = ["desktop", "mobile", "small"];
// 쪽당 초 어림(지난 관문 기록의 가운데 값 — 작업기록 14:3x; small 은 mobile 과 같게; ADULT · PASS-OFF · READING 은 단계 0 실측으로 고침)
const PACE = {
  student: { desktop: 211, mobile: 32, small: 32 },
  adult: { desktop: 177, mobile: 35, small: 34 },
  "passoff-grammar": { desktop: 200, mobile: 60, small: 60 },
  phonics: { desktop: 46, mobile: 23, small: 23 },
  grammar1: { desktop: 177, mobile: 6, small: 6 },
  grammar2: { desktop: 280, mobile: 28, small: 28 },
  ld: { desktop: 67, mobile: 8, small: 8 },
  reading: { desktop: 60, mobile: 30, small: 30 },
};
try { Object.assign(PACE, JSON.parse(fs.readFileSync(path.join(DIR, "pace.json"), "utf8"))); } catch {}
const TARGET_MIN = Number(process.env.RC_TARGET_MIN || 75);
// 한 이용권의 서버 진도를 두 브라우저가 같이 쓰지 않게: STUDENT · ADULT 데스크톱(완료 저장 시험)은 나누지 않음
const NO_SPLIT = new Set(["student|desktop", "adult|desktop"]);
const DRIVER = { reading: "drive-reading.cjs", "passoff-grammar": "drive-passoff.cjs" };
// 한 프로세스가 3화면을 다 도는 드라이버(조각 = 강의 묶음)
const MULTI_VP = new Set(["reading", "passoff-grammar"]);

function plan() {
  const shards = [];
  for (const [course, allIds] of Object.entries(routes)) {
    if (course === "cnn" || course === "gva") continue; // 폐지
    if (ONLY_COURSES && !ONLY_COURSES.has(course)) continue;
    const ids = SAMPLE[course] ? allIds.filter((_, i) => i % SAMPLE[course] === 0) : allIds;
    if (course === "reading" && TAG === "rc") {
      const perPage = VPS.reduce((s, v) => s + PACE.reading[v], 0);
      const n = Math.max(1, Math.round((ids.length * perPage) / 60 / TARGET_MIN));
      for (let i = 1; i <= n; i++) shards.push({ key: `reading|all|${i}of${n}`, course, viewport: "all", i, n, ids: null, estMin: (ids.length / n) * perPage / 60 });
      continue;
    }
    if (MULTI_VP.has(course)) {
      const perPage = VPS.reduce((s, v) => s + PACE[course][v], 0);
      const n = Math.max(1, Math.round((ids.length * perPage) / 60 / TARGET_MIN));
      const size = Math.ceil(ids.length / n);
      for (let i = 1; i <= n; i++) {
        const part = ids.slice((i - 1) * size, i * size);
        if (part.length) shards.push({ key: `${course}|all|${i}of${n}`, course, viewport: "all", i, n, ids: part, estMin: (part.length * perPage) / 60 });
      }
      continue;
    }
    for (const vp of VPS) {
      const sec = PACE[course][vp];
      const n = NO_SPLIT.has(`${course}|${vp}`) ? 1 : Math.max(1, Math.round((ids.length * sec) / 60 / TARGET_MIN));
      const size = Math.ceil(ids.length / n);
      for (let i = 1; i <= n; i++) {
        const part = ids.slice((i - 1) * size, i * size);
        if (part.length) shards.push({ key: `${course}|${vp}|${i}of${n}`, course, viewport: vp, i, n, ids: part, estMin: (part.length * sec) / 60 });
      }
    }
  }
  return shards.sort((a, b) => b.estMin - a.estMin);
}

const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
function doneIds(sh, st) {
  const files = (st.files[sh.key] || []).map((f) => path.join(FEAT, f));
  const done = new Set();
  for (const f of files) for (const r of readJsonl(f)) if (r.id && (sh.viewport === "all" || r.viewport === sh.viewport)) done.add(sh.viewport === "all" ? `${r.id}|${r.viewport}` : r.id);
  return done;
}

function argsFor(sh, st, slot) {
  const tries = (st.tries[sh.key] || 0);
  if (MULTI_VP.has(sh.course) && sh.ids) {
    const sfx = `-${TAG}-${sh.i}of${sh.n}`;
    st.files[sh.key] = [`${sh.course}${sfx}.jsonl`];
    const a = [path.join(SCRIPTS, DRIVER[sh.course]), "--ids", sh.ids.join(","), "--viewports", VPS.join(","), "--suffix", sfx, "--clone", `${TAG}-slot${slot}`, "--port", String(9800 + slot)];
    if (sh.course === "passoff-grammar" && tries) a.push("--resume");
    return a;
  }
  if (sh.course === "reading") {
    const file = `reading-rc-${sh.i}of${sh.n}.jsonl`;
    st.files[sh.key] = [file];
    return [path.join(SCRIPTS, DRIVER.reading), "--shard", `${sh.i}/${sh.n}`, "--viewports", VPS.join(","), "--suffix", `-rc-${sh.i}of${sh.n}`];
  }
  const done = doneIds(sh, st);
  const left = sh.ids.filter((id) => !done.has(id));
  if (!left.length) return null;
  const suffix = `-${TAG}-${sh.viewport}-${sh.i}of${sh.n}${tries ? `-r${tries}` : ""}`;
  (st.files[sh.key] ||= []).push(`${sh.course}${suffix}.jsonl`);
  const drv = DRIVER[sh.course] || "drive-generic.cjs";
  return [path.join(SCRIPTS, drv), "--course", sh.course, "--ids", left.join(","), "--viewports", sh.viewport, "--suffix", suffix, "--port", String(9800 + slot), "--clone", `${TAG}-slot${slot}`];
}

// drive-generic 조각: 부른 강의가 모두 그 조각 파일들에 있으면 끝.
// drive-reading 조각은 드라이버가 --shard 로 쪽을 나누므로 exit 로 판단 — FAIL 이 있어 exit 1 이면 한 번 더 부르고,
// 그때는 이어 하기(기본 resume)로 남은 방문이 0 이라 바로 exit 0 이 됨.
function complete(sh, st) {
  return sh.ids.every((id) => doneIds(sh, st).has(id));
}

function keepAwake() {
  const ps = spawn("powershell.exe", ["-NoProfile", "-Command",
    `Add-Type -Namespace W -Name P -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'; [W.P]::SetThreadExecutionState(0x80000001) | Out-Null; while ($true) { Start-Sleep -Seconds 60; [W.P]::SetThreadExecutionState(0x80000001) | Out-Null }`],
    { stdio: "ignore", windowsHide: true });
  process.on("exit", () => { try { ps.kill(); } catch {} });
  return ps;
}

async function run() {
  const shards = plan();
  const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { started: new Date().toISOString(), files: {}, tries: {}, exit: {}, done: {}, timing: {} };
  const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 1));
  if (!fs.existsSync(CONTROL)) fs.writeFileSync(CONTROL, JSON.stringify({ maxParallel: 2, courses: ["student", "phonics", "grammar1", "grammar2", "ld", "reading"], paused: false }, null, 1));
  keepAwake();
  log(`run begin — ${shards.length} shards`);
  const running = new Map(); // key -> {proc, slot}
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (;;) {
    const ctl = JSON.parse(fs.readFileSync(CONTROL, "utf8"));
    const todo = shards.filter((s) => !st.done[s.key] && !running.has(s.key) && (st.tries[s.key] || 0) < 4);
    const busyCourseDesk = new Set([...running.keys()].filter((k) => /\|desktop\|/.test(k)).map((k) => k.split("|")[0]));
    if (!todo.length && !running.size) break;
    if (!ctl.paused && running.size < ctl.maxParallel) {
      const next = todo.find((s) => ctl.courses.includes(s.course) && !(NO_SPLIT.has(`${s.course}|${s.viewport}`) && busyCourseDesk.has(s.course)));
      if (next) {
        const used = new Set([...running.values()].map((r) => r.slot));
        let slot = 1; while (used.has(slot)) slot++;
        const a = argsFor(next, st, slot);
        if (!a) { st.done[next.key] = true; save(); continue; }
        const lf = path.join(DIR, `job-${next.key.replace(/\|/g, "_")}-t${st.tries[next.key] || 0}.log`);
        const out = fs.openSync(lf, "a");
        const proc = spawn(process.execPath, a, { cwd: REPO, stdio: ["ignore", out, out], windowsHide: true });
        running.set(next.key, { proc, slot });
        st.timing[next.key] = st.timing[next.key] || { start: new Date().toISOString() };
        save();
        log(`start ${next.key} slot ${slot} (est ${next.estMin.toFixed(0)}m, try ${st.tries[next.key] || 0}) pid ${proc.pid}`);
        proc.on("exit", (code) => {
          running.delete(next.key);
          st.exit[next.key] = code;
          st.tries[next.key] = (st.tries[next.key] || 0) + 1;
          const ok = MULTI_VP.has(next.course) ? code === 0 : complete(next, st);
          if (ok) { st.done[next.key] = true; st.timing[next.key].end = new Date().toISOString(); }
          save();
          log(`exit ${next.key} code ${code} → ${ok ? "DONE" : "will retry"}`);
        });
        await sleep(25000); // 두 Edge 가 같이 뜨면 시간 초과가 났던 일(run-queue.ps1) — 사이를 둠
        continue;
      }
    }
    await sleep(30000);
  }
  log(`run end — done ${Object.keys(st.done).length}/${shards.length}`);
}

if (process.argv.includes("--plan")) {
  const s = plan();
  const tot = s.reduce((a, b) => a + b.estMin, 0);
  for (const x of s) console.log(`${x.key.padEnd(34)} ${String(x.ids ? x.ids.length : "-").padStart(4)} pages  ~${x.estMin.toFixed(0)}m`);
  console.log(`shards ${s.length} · total ~${(tot / 60).toFixed(1)} worker-hours · /2 ${(tot / 120).toFixed(1)}h · /3 ${(tot / 180).toFixed(1)}h`);
} else if (process.argv.includes("--run")) run();
else console.log("--plan | --run");
