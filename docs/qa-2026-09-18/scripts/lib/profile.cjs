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

const SOURCE = path.join(os.tmpdir(), "kig-audit-licensed-profile");
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
  const dest = path.join(os.tmpdir(), `kig-audit-0918-${name}`);
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
