#!/usr/bin/env node
/**
 * "일부러 깨뜨리기" 시험의 한 단계를 돌린다 — 과정별 검사가 실패를 잡는지 확인하기 위한 것.
 *
 * 드라이버는 **평소 스윕과 똑같은 기본값**으로 돌린다 (세 화면 크기, 문장 걷기·재생·정답 입력·
 * 타일 조립·지속성 시험 전부). 가벼운 실행으로 시험하면 다른 화면에 같은 글자가 덜 나와서
 * 가짜 검사도 "실패를 잡는다" 로 보일 수 있다 — 그러면 시험 자체가 가짜가 된다.
 * 바꾸는 것은 대상 강의(--ids)·기록 이름(--suffix)·포트·프로필 복제본 이름뿐이다.
 *
 * 각 실행이 끝나면 단계별 화면 글자(out/rendered/...)를 out/proof/<phase>/ 로 복사한다.
 * 같은 강의를 다시 돌리면 덮어쓰이는 파일이라, 어느 글자가 검사를 통과시켰는지 나중에
 * 찾으려면 단계마다 따로 남겨야 한다.
 *
 *   BASE=http://localhost:3211 node proof-run.cjs --phase base --port 9701 --clone proof-a \
 *        phonics:mv1-01 grammar1:gh1-007
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PHASE = arg("--phase", null);
const PORT = arg("--port", "9701");
const CLONE = arg("--clone", "proof-a");
if (!PHASE) throw new Error("--phase is required");
if (!/^http:\/\/localhost:/.test(process.env.BASE || "")) throw new Error("BASE must point at the local dev server");

const flagged = new Set(["--phase", "--port", "--clone"]);
const targets = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !flagged.has(all[i - 1]));
const OUT = path.join(__dirname, "../out");
const DEST = path.join(OUT, "proof", PHASE);
fs.mkdirSync(DEST, { recursive: true });

for (const t of targets) {
  const [course, id] = t.split(":");
  const started = Date.now();
  const r = spawnSync(process.execPath, [
    path.join(__dirname, "drive-generic.cjs"),
    "--course", course, "--ids", id,
    "--suffix", `-proof-${PHASE}`, "--port", PORT, "--clone", CLONE, "--redo",
  ], { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const tail = String(r.stdout || "").trim().split(/\r?\n/).slice(-3).join(" | ");
  console.log(`[${PHASE}] ${course} ${id} · ${Math.round((Date.now() - started) / 1000)}s · exit ${r.status} · ${tail}`);
  if (r.status !== 0) console.log(String(r.stderr || "").slice(-800));
  for (const vp of ["desktop", "tablet", "mobile"]) {
    const src = path.join(OUT, "rendered", course, `${id}.${vp}.json`);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DEST, `${course}-${id}.${vp}.json`));
  }
}
