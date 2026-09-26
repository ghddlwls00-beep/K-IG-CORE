/**
 * Clone of the owner-registered audit profile, so several drivers can run at once.
 *
 * %TEMP%\kig-audit-licensed-profile holds a LIFE licence the owner typed in by hand.
 * One Edge process may use a user-data-dir at a time, and drivers that clear or write
 * localStorage (bookmarks, answers) would disturb each other in a shared profile.
 * A copy carries the SAME licence token, cookie and device id — no new device is
 * registered and nothing is typed. The server keeps no concurrent-use check
 * (src/lib/deviceStorage.ts only refreshes lastSeenAt).
 *
 * Caches are skipped (the source profile is ~700 MB, mostly cache). Never reads,
 * prints or copies the licence value itself into any file other than the profile copy.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 최종 관문(2026-09-25 04:4x): 원본의 운영 사이트 저장소에서 이용권 기록(kig:license:v1)이 빠진 것을 찾음 — 원본 폴더를 02:27 에 어떤 Edge 가 직접 열었고
// 그 뒤 원본에서 새로 뜬 사본은 잠김 화면(/api/license/session 만 부르고 verify 없음). 관문 0 사본(g0-w1 · 9/24 16:12 복사)은 그 기록이 있어 열림.
// 원본은 건드리지 않고(되살리려면 코드를 다시 쳐야 함 — 소유자만) 복사할 곳 · 사본 이름 앞머리를 바꿀 수 있게 함:
//   KIG_PROFILE_SOURCE=<이용권이 살아 있는 사본 폴더>  KIG_CLONE_PREFIX=<새 앞머리>  — 둘 다 없으면 전과 같음.
// 2026-09-26: 04:26 ~ 04:31 에 TEMP 가 통째로 지워져 원본(%TEMP%\kig-audit-licensed-profile)이 없어짐 → 사장님이 같은 날 밤 코드를 다시 넣은 원본은
// TEMP 밖 `%USERPROFILE%\KIG-audit-licensed-profile` 에 둠. 그것이 있으면 먼저 씀(없으면 옛 TEMP 자리).
const DURABLE = path.join(os.homedir(), "KIG-audit-licensed-profile");
const SOURCE = process.env.KIG_PROFILE_SOURCE || (fs.existsSync(DURABLE) ? DURABLE : path.join(os.tmpdir(), "kig-audit-licensed-profile"));
const PREFIX = process.env.KIG_CLONE_PREFIX || "kig-audit-0918-";
const SKIP_DIRS = ["Cache", "Code Cache", "GPUCache", "DawnGraphiteCache", "DawnWebGPUCache", "GrShaderCache", "ShaderCache", "Crashpad", "BrowserMetrics", "component_crx_cache", "optimization_guide_model_store", "Service Worker", "EdgeWallet", "EdgeCoupons", "Edge Shopping", "AutofillAiModelCache", "EntityExtraction", "Edge Entity Extraction"];

function edgeUsing(dir) {
  try {
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${dir.replace(/'/g, "''")}*' } | Measure-Object | Select-Object -ExpandProperty Count`], { encoding: "utf8" });
    return Number(out.trim()) > 0;
  } catch {
    return false;
  }
}

/** Returns the path of a fresh (or existing, if !fresh) copy named `name`. */
function cloneProfile(name, { fresh = false } = {}) {
  const dest = path.join(os.tmpdir(), `${PREFIX}${name}`);
  if (fs.existsSync(dest) && !fresh) return dest;
  if (edgeUsing(SOURCE)) throw new Error("the source audit profile is in use by Edge — close it before cloning");
  if (fs.existsSync(dest)) {
    if (edgeUsing(dest)) throw new Error(`${dest} is in use by Edge`);
    fs.rmSync(dest, { recursive: true, force: true });
  }
  try {
    execFileSync("robocopy", [SOURCE, dest, "/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/XD", ...SKIP_DIRS, "/XF", "SingletonLock", "SingletonCookie", "SingletonSocket", "lockfile", "LOCK"], { stdio: "ignore" });
  } catch (e) {
    // robocopy exit codes 0-7 are success variants
    if (typeof e.status !== "number" || e.status >= 8) throw e;
  }
  return dest;
}

module.exports = { cloneProfile, SOURCE };
