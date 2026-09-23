#!/usr/bin/env node
/**
 * 6-1688 · 6-1755 — 받아쓰기 낱말 타일(listeningUtils.ts generateWordBank)이 시각 '12:30' · 'a.m.' · 'p.m.' 과
 * 천 단위 쉼표 숫자 '2,000' · '$65,000' 을 한 조각으로 만드는지.
 * STUDENT 문장과 LISTENING 대본 행 가운데 시각이나 천 단위 숫자가 든 것마다 타일을 만들어:
 *   ① 문장의 시각(H:MM) · 천 단위 숫자가 타일에 통째로 있어야 하고 ② a.m. · p.m. 이 'a' · 'p' · 'm' 한 글자 타일로 쪼개지지 않아야 하며
 *   ③ 정답 차례로 타일을 누르면 맞다고 해야 한다(verifyAnyWordSequence).
 * 어긋나면 exit 1.
 *
 *   node check-dictation-times.cjs            # 지금 코드
 *   node check-dictation-times.cjs --old      # 일부러 깨기: HEAD 의 listeningUtils.ts 로 — 어긋나야 한다(exit 1)
 *
 * --old 의 HEAD 사본은 OS 임시 폴더에 씀(src/lib 안에 쓰면 같은 때 도는 tsc · next build 가 그 파일을 봄 — 3차 점검 #13).
 * listeningUtils.ts 는 import 가 없어 어느 폴더에서 불러도 같다.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const OLD = process.argv.includes("--old");
let file = path.join(REPO, "src/lib/listeningUtils.ts");
if (OLD) {
  const src = execFileSync("git", ["show", "HEAD:src/lib/listeningUtils.ts"], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });
  if (/^\s*import\s/m.test(src)) throw new Error("HEAD listeningUtils.ts 에 import 가 생김 — 임시 폴더에서 불러오면 틀릴 수 있어 멈춤");
  file = path.join(os.tmpdir(), `listeningUtils.head.${process.pid}.ts`);
  fs.writeFileSync(file, src);
}
let lu;
try { lu = loadTs(file); } finally { if (OLD) fs.unlinkSync(file); }
const PICK = /\d{1,2}:\d{2}|[ap]\.m\.|\d{1,3}(?:,\d{3})+/i;
const rows = [];
const R = path.join(REPO, "content/lessons/student");
for (const f of fs.readdirSync(R).filter((x) => /^s\d+-\d+\.json$/.test(x))) {
  const d = JSON.parse(fs.readFileSync(path.join(R, f), "utf8"));
  for (const b of d.blocks || []) if (b.type === "sentences") for (const x of b.items || []) if (PICK.test(x.text)) rows.push([`${f} #${x.n}`, x.text]);
}
const ld = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
for (const [id, list] of Object.entries(ld)) if (Array.isArray(list)) for (const r of list) if (r && PICK.test(r.en || "")) rows.push([`ld ${id} n${r.n}`, r.en]);
const bad = [];
let withTime = 0, withThousands = 0;
for (const [where, text] of rows) {
  const bank = lu.generateWordBank(text);
  const tiles = bank.correctWords;
  const times = text.match(/\d{1,2}:\d{2}/g) || [];
  const thousands = text.match(/\d{1,3}(?:,\d{3})+/g) || [];
  if (times.length || /[ap]\.m\./i.test(text)) withTime++;
  if (thousands.length) withThousands++;
  const missing = [...times, ...thousands].filter((t) => !tiles.includes(t));
  // 'a' 는 관사로도 나오므로, a.m. · p.m. 을 빼고 문장에 따로 선 a 의 수보다 a 타일이 많을 때만 조각으로 셈. p · m 은 따로 서는 낱말이 아님.
  const articleA = (text.replace(/[ap]\.m\./gi, " ").match(/(^|[^A-Za-z0-9'’.-])a(?=[^A-Za-z0-9'’-]|$)/gi) || []).length;
  const aTiles = tiles.filter((t) => /^a$/i.test(t)).length;
  const letters = [...tiles.filter((t) => /^[pm]$/i.test(t)), ...(aTiles > articleA ? Array(aTiles - articleA).fill("a") : [])];
  const ok = lu.verifyAnyWordSequence(tiles, bank.acceptedWordSequences);
  if (missing.length || letters.length || !ok) bad.push(`${where}: 통째로 없는 조각 ${missing.join(",") || "-"} · 한 글자 타일 ${letters.join(",") || "-"} · 정답 차례 ${ok ? "맞음" : "틀림"} — ${JSON.stringify(tiles)}`);
}
const st = rows.filter((r) => !r[0].startsWith("ld")).length;
console.log(`${OLD ? "[HEAD] " : ""}시각 · 천 단위 숫자 든 문장 ${rows.length}(STUDENT ${st} · LISTENING ${rows.length - st} — 시각 ${withTime} · 천 단위 ${withThousands}) · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 8)) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
