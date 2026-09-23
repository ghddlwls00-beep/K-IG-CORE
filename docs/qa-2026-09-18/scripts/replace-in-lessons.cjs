#!/usr/bin/env node
/**
 * 강의 파일의 글자를 원본 파일 안에서 그대로 바꾼다 — 파일의 줄바꿈·들여쓰기·끝 개행을 한 글자도 건드리지 않는다.
 * READING 처럼 같은 문장이 여러 벌(readingSentences 두 파일 + 영어·한국어 지문 블록) 있는 과정에서
 * 한 벌만 고쳐 사본끼리 어긋나는 일을 막기 위한 것.
 *
 * 계획 파일(JSON 배열)의 한 줄 = { item, files: [...], from, to, expect }
 *   from/to : 바꿀 글자(JSON 안의 값 그대로 — 따옴표 이스케이프는 도구가 한다)
 *   expect  : 이 파일들 전체에서 from 이 나와야 하는 횟수. 다르면 아무것도 쓰지 않고 멈춘다.
 *   raw     : true 면 from/to 를 파일 글자 그대로 찾는다(따옴표 이스케이프 없이) — 사전 키 이름을 바꾸는 것처럼
 *             JSON 구조를 짚어야 할 때만(6-0911 labour → labo(u)r). expect 가 1 이상이라 틀리게 적으면 0번으로 멈춘다.
 * 줄은 차례로 적용된다 — 뒤 줄은 앞 줄이 바꾼 글자에서 센다.
 * 바꾼 뒤 파일이 여전히 올바른 JSON 인지 확인한다.
 *
 *   node replace-in-lessons.cjs <plan.json> [--apply]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const [planPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const esc = (s) => JSON.stringify(s).slice(1, -1);

const texts = new Map(); // file → current raw text
const load = (f) => { if (!texts.has(f)) texts.set(f, fs.readFileSync(path.join(REPO, f), "utf8")); return texts.get(f); };

for (const p of plan) {
  // expect 0 이면 아무것도 바꾸지 않고 조용히 통과한다 — 계획 줄을 잘못 적은 것(예: JSON 따옴표째 적은 from)을 가린다(6단계에서 두 번).
  if (!(Number.isInteger(p.expect) && p.expect >= 1)) throw new Error(`#${p.item}: expect 는 1 이상의 정수여야 함 (${p.expect}) — 멈춤`);
  if (!p.raw && /^"[a-z]+": "/.test(p.from)) throw new Error(`#${p.item}: from 이 JSON 키째 적혀 있음 — 값만 적어라 (구조를 짚어야 하면 raw: true)`);
  const from = p.raw ? p.from : esc(p.from), to = p.raw ? p.to : esc(p.to);
  let count = 0;
  for (const f of p.files) count += load(f).split(from).length - 1;
  if (count !== p.expect) throw new Error(`#${p.item}: "${p.from.slice(0, 40)}…" 가 ${count}번 나옴 (기대 ${p.expect}) — 멈춤`);
  for (const f of p.files) texts.set(f, load(f).split(from).join(to));
  console.log(`#${p.item} ${count}곳: ${JSON.stringify(p.from).slice(0, 70)} → ${JSON.stringify(p.to).slice(0, 70)}`);
}
for (const [f, raw] of texts) JSON.parse(raw); // still valid JSON
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }
// 두 단계로 쓴다 — 먼저 모든 파일을 .tmp 로 쓰고, 하나라도 실패하면 .tmp 를 지우고 아무것도 안 바꾼 채 멈춘다.
// (2026-09-23 READING 대시 계획: 중앙 파일 쓰기가 Windows 'UNKNOWN open' 으로 한 번 실패해 앞 두 파일만 바뀐 채 멈춘 일이 있었다)
const tmps = [];
try {
  for (const [f, raw] of texts) {
    const tmp = path.join(REPO, f) + ".tmp-replace";
    fs.writeFileSync(tmp, raw);
    tmps.push([tmp, path.join(REPO, f)]);
  }
} catch (e) {
  for (const [tmp] of tmps) fs.rmSync(tmp, { force: true });
  throw new Error(`쓰기 실패 — 아무 파일도 안 바뀜: ${e.message}`);
}
for (const [tmp, real] of tmps) fs.renameSync(tmp, real);
console.log(`\n${texts.size}개 파일에 씀 (형식 그대로)`);
