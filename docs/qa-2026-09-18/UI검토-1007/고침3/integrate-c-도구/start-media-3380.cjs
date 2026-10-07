// integrate-c (2026-10-08 고침3): copy of 고침2/integrate-b-도구/start-media-3380.cjs (unchanged — port 3380).
// integrate-b (2026-10-07 고침2): copy of 고침/integrate-도구/integrate-start-media.cjs, port 3380. local `next start` with ONLY the four media-read variables from the main checkout's
// .env.local (R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_BUCKET_NAME), so /audio/* answers locally.
// No R2_LICENSE_BUCKET · LICENSE_STORAGE_SECRET · LICENSE_SECRET → licence · progress storage stays OFF (no real record touched).
// Values are never printed.
const fs = require("fs");
const { spawn } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const ENV_FILE = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.env.local";
const WANT = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(R2_|LICENSE_|AZURE_|ADMIN_)/.test(k)) delete env[k];
let n = 0;
for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m || !WANT.includes(m[1])) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
  n++;
}
console.log(`media vars set: ${n}/4 (values not shown)`);
const child = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", "3380"], { cwd: REPO, env, stdio: "inherit" });
child.on("exit", (c) => process.exit(c ?? 0));
