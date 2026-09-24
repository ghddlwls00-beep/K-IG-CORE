#!/usr/bin/env node
/**
 * 7단계 7-1 g 일부러 깨기 — check-completeness.cjs 의 missing-clip 을 네 가지로 센다(저장소 파일은 건드리지 않음):
 *   옛 판(034e91b, 이 컴퓨터 파일만)                       → 6단계 끝과 같은 가짜 '없음'(R2 에 있는 클립)
 *   지금 판(이 컴퓨터 + R2)                               → 0 이어야
 *   지금 판 + --break=missing-clip(없는 클립 이름 하나)     → 1 이어야
 *   지금 판, 자격 없음(KIG_ENV_LOCAL 을 없는 파일로)        → "로컬만 봄" 경고 + 옛 판과 같은 수
 *   node docs/qa-2026-09-18/scripts/prove-completeness-r2.cjs
 * 셸에 R2_* 환경변수가 이미 있으면 '자격 없음' 칸은 셀 수 없다 — 그때는 그렇다고 찍고 기대와 다름으로 센다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OLD_REV = "034e91b";
const oldHere = path.join(__dirname, `_old-${OLD_REV}-check-completeness.cjs`);
const run = (file, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [file, ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26, env: { ...process.env, ...env } });
  const out = r.stdout || "";
  const n = out.split(/\r?\n/).filter((l) => /× missing-clip/.test(l)).reduce((s, l) => s + Number(l.trim().split(/\s+/)[0]), 0);
  return { code: r.status, n, warned: /R2 자격.*없어/.test(out), r2: /R2 \d+개와 함께 봄/.test(out) };
};
let wrong = 0;
const expect = (label, ok, detail) => { if (!ok) wrong++; console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${label} — ${detail}`); };
try {
  fs.writeFileSync(oldHere, execFileSync("git", ["show", `${OLD_REV}:docs/qa-2026-09-18/scripts/check-completeness.cjs`], { cwd: REPO, encoding: "utf8" }));
  const old = run(oldHere);
  const now = run(path.join(__dirname, "check-completeness.cjs"));
  const brk = run(path.join(__dirname, "check-completeness.cjs"), ["--break=missing-clip"]);
  const shellHasR2 = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].some((k) => (process.env[k] || "").trim());
  const none = run(path.join(__dirname, "check-completeness.cjs"), [], { KIG_ENV_LOCAL: path.join(REPO, "no-such-env-file") });
  expect("옛 판(이 컴퓨터만)", old.n > 0, `missing-clip ${old.n}`);
  expect("지금 판(이 컴퓨터 + R2)", now.r2 && now.n === 0, `missing-clip ${now.n}${now.r2 ? "" : " — R2 를 못 봄"}`);
  expect("지금 판 + 없는 클립 하나", brk.n === now.n + 1, `missing-clip ${brk.n}`);
  expect("지금 판, 자격 없음", !shellHasR2 && none.warned && none.n === old.n, shellHasR2 ? "셸에 R2_* 가 있어 셀 수 없음" : `경고 ${none.warned ? "찍음" : "없음"} · missing-clip ${none.n}`);
} finally {
  fs.rmSync(oldHere, { force: true });
}
console.log(`\n4가지 중 기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
