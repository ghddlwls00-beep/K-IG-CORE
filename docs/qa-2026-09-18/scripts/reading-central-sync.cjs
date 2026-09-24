#!/usr/bin/env node
/**
 * READING 문장 사본 맞추기 — 앱은 강의 파일(prNNN.json · prNNN-1.json)의 readingSentences 를 읽지만,
 * 빌드·검사 스크립트용 중앙 파일 src/lib/readingSentences.json 에도 같은 문장이 있고
 * `npm run test:reading`(scripts/audit-reading.mjs)이 셋을 견준다(한국어 "Hover query").
 * 6단계 배치 5 의 사실 오류 고침(replace-in-lessons, 강의 파일 세 벌)이 중앙 파일을 빼먹어 이 검사가 깨졌다.
 *
 *   node reading-central-sync.cjs                 어긋난 문장 수 (지금 · 고치기 전 판 f35e8be 각각 — 고치기 전 판은 대조군, 4 여야)
 *                                                 (전에는 git HEAD 판 — 고친 것이 커밋된 뒤로는 HEAD 가 고친 판이라 0 이었다, 7-1 n)
 *   node reading-central-sync.cjs --apply         중앙 파일의 어긋난 english · korean 값을 강의 파일 값으로 — 그 글자만 바꿈
 * 바꾸는 방식: 중앙 파일 원문에서 그 문장 id 의 블록을 찾아 english/korean 값만 글자 그대로 갈아 끼움(들여쓰기·줄바꿈 그대로),
 * 다시 읽어 강의 파일과 같은지 · 다른 문장이 안 바뀌었는지 확인한 뒤 쓴다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const CENTRAL = path.join(REPO, "src/lib/readingSentences.json");
const APPLY = process.argv.includes("--apply");
const git = (rev, f) => execFileSync("git", ["show", `${rev}:${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });

function mismatches(readMain, central) {
  const out = [];
  for (let u = 1; u <= 256; u++) {
    const key = `pr${String(u).padStart(3, "0")}`;
    const main = JSON.parse(readMain(`content/lessons/reading/${key}.json`)).readingSentences || [];
    const cen = central[key] || [];
    for (const s of main) {
      const c = cen.find((x) => x.id === s.id);
      if (!c) { out.push({ key, id: s.id, missing: true }); continue; }
      if (c.english !== s.english || c.korean !== s.korean) out.push({ key, id: s.id, c, s });
    }
  }
  return out;
}

const PRE_FIX_REV = "f35e8be"; // 6단계 커밋 86d9ac9 앞 — 사실 오류 고침이 중앙 파일을 빼먹기 전
const headCentral = JSON.parse(git(PRE_FIX_REV, "src/lib/readingSentences.json"));
const atHead = mismatches((f) => git(PRE_FIX_REV, f), headCentral);
const rawCentral = fs.readFileSync(CENTRAL, "utf8");
const central = JSON.parse(rawCentral);
const now = mismatches((f) => fs.readFileSync(path.join(REPO, f), "utf8"), central);
console.log(`고치기 전 판(${PRE_FIX_REV}): 중앙 파일과 강의 파일이 다른 문장 ${atHead.length}${atHead.length ? " — " + atHead.map((m) => m.id).join(" ") : ""}`);
console.log(`지금: 다른 문장 ${now.length} (영어 다름 ${now.filter((m) => m.c && m.c.english !== m.s.english).length} · 한국어 다름 ${now.filter((m) => m.c && m.c.korean !== m.s.korean).length} · 중앙에 없음 ${now.filter((m) => m.missing).length})`);
for (const m of now.slice(0, 40)) console.log(`  ${m.id}${m.missing ? " (중앙에 없음)" : ""}`);
if (!APPLY) process.exit(now.length ? 1 : 0);

const esc = (s) => JSON.stringify(s).slice(1, -1);
let raw = rawCentral;
for (const m of now) {
  if (m.missing) throw new Error(`${m.id}: 중앙 파일에 없음 — 손으로`);
  for (const field of ["english", "korean"]) {
    if (m.c[field] === m.s[field]) continue;
    // 그 id 의 블록 안에서만 바꿈
    const idAt = raw.indexOf(`"id": ${JSON.stringify(m.id)}`);
    if (idAt < 0) throw new Error(`${m.id}: id 줄을 못 찾음`);
    const end = raw.indexOf("}", idAt);
    const block = raw.slice(idAt, end);
    const from = `"${field}": "${esc(m.c[field])}"`;
    const to = `"${field}": "${esc(m.s[field])}"`;
    if (block.split(from).length !== 2) throw new Error(`${m.id} ${field}: 블록 안에서 값이 한 번이 아님`);
    raw = raw.slice(0, idAt) + block.replace(from, to) + raw.slice(end);
  }
}
const after = JSON.parse(raw);
const left = mismatches((f) => fs.readFileSync(path.join(REPO, f), "utf8"), after);
if (left.length) throw new Error(`바꾼 뒤에도 다른 문장 ${left.length}`);
// 바뀐 문장 수 = now.length 인지 (다른 문장은 그대로)
let changed = 0;
for (const [k, arr] of Object.entries(after)) arr.forEach((s, i) => { const o = central[k][i]; if (o.english !== s.english || o.korean !== s.korean) changed++; });
if (changed !== now.length) throw new Error(`바뀐 문장 ${changed} ≠ 고칠 문장 ${now.length}`);
fs.writeFileSync(CENTRAL, raw);
console.log(`중앙 파일에 ${changed}문장 씀 (형식 그대로) — 다시 세면 0`);
