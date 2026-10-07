// tools-c (2026-10-08 고침3): run one audit tool against the LOCAL next start (3384) with an EMPTY browser profile (no licence) and this
// worker's own profile-copy prefix. The debugging port (9980~9984) is the tool's own --port. Waits while free memory < 1.2 GB.
//   node run.cjs <log name> [--break-app] -- node <tool> <args…>
// --break-app sets KIG_BREAK_APP=1008 (docs/qa-2026-09-18/scripts/lib/ui-1008.cjs: every page put back as the app before 10-08).
// Log: docs/qa-2026-09-18/out/ui-1007/c-tools-c/logs/<log name>.log (stdout + stderr, then the exit line)
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const LOGS = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/c-tools-c/logs");
const argv = process.argv.slice(2);
const name = argv.shift();
const brk = argv[0] === "--break-app" ? (argv.shift(), true) : false;
if (argv[0] === "--") argv.shift();
if (!name || !argv.length) { console.error("node run.cjs <log name> [--break-app] -- <cmd> <args…>"); process.exit(2); }
fs.mkdirSync(LOGS, { recursive: true });
const empty = path.join(os.tmpdir(), "kig-toolsc-empty-profile");
fs.mkdirSync(empty, { recursive: true });
const freeGb = () => Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim()) / 1024 / 1024;
for (let i = 0; i < 30; i++) {
  const f = freeGb();
  if (f >= 1.2) break;
  console.log(`free memory ${f.toFixed(2)} GB < 1.2 — waiting 60 s`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000);
}
const env = { ...process.env, BASE: "http://localhost:3384", KIG_PROFILE_SOURCE: empty, KIG_CLONE_PREFIX: "kig-toolsc-" };
if (brk) env.KIG_BREAK_APP = "1008"; else delete env.KIG_BREAK_APP;
const t0 = Date.now();
const r = spawnSync(argv[0] === "node" ? process.execPath : argv[0], argv.slice(1), { cwd: REPO, env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const log = path.join(LOGS, `${name}.log`);
fs.writeFileSync(log, `${r.stdout || ""}${r.stderr ? `\n[stderr]\n${r.stderr}` : ""}\n[exit ${r.status} · KIG_BREAK_APP=${env.KIG_BREAK_APP || "-"} · ${Math.round((Date.now() - t0) / 1000)} s · ${new Date().toISOString()} · ${argv.join(" ")}]\n`);
console.log(`exit ${r.status} → ${log}`);
process.exit(r.status == null ? 1 : r.status);
