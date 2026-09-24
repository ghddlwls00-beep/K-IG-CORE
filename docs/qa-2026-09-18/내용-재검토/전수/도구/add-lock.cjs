#!/usr/bin/env node
/**
 * 전수 읽기 — 한 조각을 여러 일꾼이 나눠 읽을 때, add-full.cjs 가 조각마다 한 번에 하나만 돌게 하는 잠금.
 * add-full.cjs 는 판정-<조각>.json 을 읽고-고치고-쓰므로 두 일꾼이 같은 때 적으면 먼저 적은 배치가 사라질 수 있다.
 * add-full.cjs 는 한 글자도 바꾸지 않고 잠금 안에서 그대로 부른다(출력 · exit 그대로).
 *
 *   node add-lock.cjs <조각> <배치.json> [--replace]   add-full.cjs <조각> <배치.json> 를 잠금 안에서
 *   node add-lock.cjs <조각> --note-file <글.md>        기록-<조각>.md 끝에 그 글(일꾼의 '끝' 줄)을 잠금 안에서 더함
 * 잠금 파일: 전수/work/.lock-<조각> (60초 넘게 남은 잠금은 죽은 것으로 보고 치움 · 120초 못 잡으면 exit 4)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const SCRIPTS = path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts");
const BASE = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const TARGET = process.env.ADD_LOCK_TARGET || path.join(SCRIPTS, "add-full.cjs"); // 시험 때만 바꿈

const [chunk, ...rest] = process.argv.slice(2);
if (!chunk || !rest.length) { console.error("쓰는 법: node add-lock.cjs <조각> <배치.json> [--replace] | --note-file <글.md>"); process.exit(2); }
if (!fs.existsSync(path.join(BASE, "읽을거리", chunk, "ids.json"))) { console.error(`조각 이름이 틀림: ${chunk}`); process.exit(2); }

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const lock = path.join(BASE, "work", `.lock-${chunk}`);
fs.mkdirSync(path.dirname(lock), { recursive: true });
let fd = null;
const t0 = Date.now();
while (fd === null) {
  try { fd = fs.openSync(lock, "wx"); fs.writeSync(fd, String(process.pid)); }
  catch (e) {
    if (e.code !== "EEXIST") throw e;
    try { if (Date.now() - fs.statSync(lock).mtimeMs > 60000) { fs.unlinkSync(lock); continue; } } catch { continue; }
    if (Date.now() - t0 > 120000) { console.error(`잠금을 120초 동안 못 잡음: ${lock}`); process.exit(4); }
    sleep(150);
  }
}
let status = 0;
try {
  if (rest[0] === "--note-file") {
    const f = rest[1];
    if (!f) { console.error("--note-file 뒤에 글 파일"); status = 2; }
    else {
      let text = fs.readFileSync(path.resolve(f), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
      const LOG = path.join(BASE, `기록-${chunk}.md`);
      if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 전수 기록 — 조각 ${chunk}\n\n배치마다 한 줄(add-full.cjs 가 적음). 압축되면 이 파일과 \`node add-full.cjs ${chunk} --status\` 부터.\n\n`);
      fs.appendFileSync(LOG, text + "\n");
      console.log(`기록-${chunk}.md 에 더함: ${text.split("\n")[0].slice(0, 120)}`);
    }
  } else {
    const r = spawnSync(process.execPath, [TARGET, chunk, ...rest], { cwd: WT, stdio: "inherit" });
    status = r.status == null ? 1 : r.status;
  }
} finally {
  fs.closeSync(fd);
  try { fs.unlinkSync(lock); } catch {}
}
process.exit(status);
