#!/usr/bin/env node
/**
 * 최종 관문 15 — GRAMMAR 문항 계획(check-grammar-item-plans.cjs 가 보는 { item, file, n, text?, alternatives? } 꼴)의 사슬 잇기.
 * link-gate15-plans.cjs 의 짝(그것은 글자 바꾸기 꼴 계획만 본다).
 *   1) 기준 판(--base, 기본 d2b50ca)과 지금 GRAMMAR I · II 강의 파일을 문항 번호(n)마다 견주어, 글이나 대체 답안이 바뀐 문항마다 한 줄 —
 *      plans/gate15-grammar-items.json. 사람이 고른 것이 아니라 파일 차이 그대로. 뺀 대체 답안은 그 줄의 wrong 에도 넣는다
 *      (check-grammar-item-plans 가 지금 채점기로 '만점 아님' 을 다시 본다 — 빼기만 하고 채점은 그대로 만점이면 잡힘).
 *   2) check-grammar-item-plans 를 돌려 어긋나는 줄마다 그 줄의 사슬 끝(supersededBy 를 따라간 마지막 줄)에, 같은 파일 · 같은 번호의
 *      gate15 줄이 있으면 "supersededBy": "gate15-grammar-items …" 를 적는다. 없거나 한 곳으로 못 정하면 적지 않고 목록으로.
 *   3) 다시 돌려 남은 어긋남을 줄마다 찍고, 남으면 exit 1.
 * 계획 파일은 줄 하나만 글자로 고친다(그 줄의 "n" 바로 뒤에 한 칸) — 고친 뒤 JSON 인지 · 바뀐 줄이 하나인지 확인.
 *
 *   node link-gate15-grammar-items.cjs [--base d2b50ca] [--write]      기본은 미리 보기
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BASE = arg("--base", "d2b50ca");
const WRITE = argv.includes("--write");
const PLANS = path.join(__dirname, "plans");
const NAME = "gate15-grammar-items";
const NOTE = `${NAME} 관문 15(2026-09-24) — 내용 재검토 · 전수 읽기 고침`;
const git = (a) => { const r = spawnSync("git", a, { cwd: REPO, maxBuffer: 1 << 30 }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.toString("utf8"); };
const parse = (s) => JSON.parse(String(s).replace(/^﻿/, ""));
const itemsOf = (d) => ((d && d.blocks) || []).filter((b) => b && b.type === "sentences").flatMap((b) => b.items || []);
const altsOf = (it) => (Array.isArray(it.alternatives) ? it.alternatives : []);

// ---------------------------------------------------------------- 1) 바뀐 문항
const files = git(["-c", "core.quotePath=false", "diff", "--name-only", BASE, "--", "content/lessons/grammar1", "content/lessons/grammar2"]).split("\n").map((s) => s.trim()).filter((f) => f.endsWith(".json"));
const plan = [];
for (const f of files) {
  let a; try { a = parse(git(["show", `${BASE}:${f}`])); } catch { continue; }
  const b = parse(fs.readFileSync(path.join(REPO, f), "utf8"));
  const before = new Map(itemsOf(a).map((it) => [String(it.n), it]));
  for (const it of itemsOf(b)) {
    const old = before.get(String(it.n));
    if (!old) continue;
    const line = { item: `관문 15 ${path.basename(f, ".json")} #${it.n}`, file: f, n: String(it.n) };
    if (old.text !== it.text) line.text = { from: old.text, to: it.text };
    const fa = altsOf(old), ta = altsOf(it);
    if (JSON.stringify(fa) !== JSON.stringify(ta)) {
      line.alternatives = { from: fa, to: ta };
      const removed = fa.filter((x) => !ta.includes(x));
      if (removed.length) line.wrong = removed;
    }
    if (line.text || line.alternatives) plan.push(line);
  }
}
const planText = "[\n" + plan.map((l) => " " + JSON.stringify(l)).join(",\n") + "\n]\n";
console.log(`기준 ${BASE} → 지금: 바뀐 GRAMMAR 파일 ${files.length} · 바뀐 문항 ${plan.length}(글 ${plan.filter((l) => l.text).length} · 대체 답안 ${plan.filter((l) => l.alternatives).length} · 뺀 답이 있는 문항 ${plan.filter((l) => l.wrong).length})`);

// ---------------------------------------------------------------- 2) 어긋나는 줄을 사슬 끝에서 잇기
function check(extraText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "g15items-"));
  for (const f of fs.readdirSync(PLANS)) if (f.endsWith(".json")) fs.copyFileSync(path.join(PLANS, f), path.join(tmp, f));
  if (extraText) fs.writeFileSync(path.join(tmp, `${NAME}.json`), extraText);
  const r = spawnSync(process.execPath, [path.join(__dirname, "check-grammar-item-plans.cjs"), "--plans-dir", tmp], { cwd: __dirname, maxBuffer: 1 << 28 });
  fs.rmSync(tmp, { recursive: true, force: true });
  const out = r.stdout.toString("utf8") + r.stderr.toString("utf8");
  const bad = [...out.matchAll(/^  (\S+\.json): (content\/\S+\.json) #(\S+) (.*)$/gm)].map((m) => ({ plan: m[1], file: m[2], n: m[3], why: m[4] }));
  const sum = (out.match(/계획 \d+개 · 줄 \d+[^\n]*/) || [""])[0];
  return { bad, sum, code: r.status };
}
const readPlan = (f) => parse(fs.readFileSync(path.join(PLANS, f), "utf8"));
const sameItem = (l, file, n) => l.file === file && String(l.n) === String(n);
/** 계획 f 의 file#n 줄에서 supersededBy 를 따라간 끝 — { f, line } · 이미 gate15 로 이어졌으면 null */
function terminal(f, file, n) {
  let cf = f;
  let lines = readPlan(cf).filter((l) => sameItem(l, file, n));
  if (lines.length !== 1) return { problem: `${cf} 에 ${file} #${n} 줄이 ${lines.length}개 — 한 곳으로 못 정함` };
  let line = lines[0];
  for (let hop = 0; hop < 20 && line.supersededBy; hop++) {
    const name = String(line.supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
    if (name === NAME) return null;
    cf = `${name}.json`;
    if (!fs.existsSync(path.join(PLANS, cf))) return { problem: `뒤 계획 ${cf} 없음` };
    const next = readPlan(cf).filter((l) => sameItem(l, file, n));
    if (!next.length) return { problem: `뒤 계획 ${cf} 에 ${file} #${n} 없음` };
    line = next[next.length - 1];
  }
  return { f: cf, line };
}
function addSuperseded(f, line) {
  const p = path.join(PLANS, f);
  const text = fs.readFileSync(p, "utf8");
  const sp = /"file": "/.test(text) ? " " : "";
  const needle = `"file":${sp}${JSON.stringify(line.file)},${sp}"n":${sp}${JSON.stringify(line.n)}`;
  const spots = [];
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) spots.push(i);
  if (spots.length !== 1) return `${f} 에서 ${needle} 를 한 곳만 찾지 못함(${spots.length})`;
  const next = text.slice(0, spots[0]) + `${needle},${sp}"supersededBy":${sp}${JSON.stringify(NOTE)}` + text.slice(spots[0] + needle.length);
  const a = JSON.parse(text), b = JSON.parse(next);
  if (a.length !== b.length || a.filter((x, i) => JSON.stringify(x) !== JSON.stringify(b[i])).length !== 1) return `${f} 고친 뒤 바뀐 줄이 1개가 아님`;
  if (WRITE) fs.writeFileSync(p, next);
  return null;
}
if (WRITE) fs.writeFileSync(path.join(PLANS, `${NAME}.json`), planText);
let v = check(WRITE ? null : planText);
console.log(`잇기 전: ${v.sum}`);
const g15 = new Set(plan.map((l) => `${l.file}#${l.n}`));
let linked = 0;
const cannot = [];
const done = new Set();
for (const b of v.bad) {
  const key = `${b.plan} ${b.file}#${b.n}`;
  if (done.has(key)) continue;
  done.add(key);
  if (b.plan === `${NAME}.json`) { cannot.push(`${key} — 관문 15 줄 자체가 어긋남: ${b.why}`); continue; }
  const t = terminal(b.plan, b.file, b.n);
  if (!t) continue;
  if (t.problem) { cannot.push(`${key} — ${t.problem}`); continue; }
  if (!g15.has(`${b.file}#${b.n}`)) { cannot.push(`${key} — 관문 15 가 이 문항을 바꾸지 않음(다른 까닭): ${b.why}`); continue; }
  const err = addSuperseded(t.f, t.line);
  if (err) { cannot.push(`${key} — ${err}`); continue; }
  linked++;
}
console.log(`${WRITE ? "적은" : "적을"} supersededBy ${linked} · 못 이은 줄 ${cannot.length}`);
for (const c of cannot) console.log(`   ${c}`);
if (WRITE) {
  v = check(null);
  console.log(`잇기 뒤: ${v.sum}`);
  if (v.bad.length || v.code !== 0) {
    console.log(`남은 어긋남 ${v.bad.length}:`);
    for (const b of v.bad) console.log(`   ${b.plan} ${b.file} #${b.n} ${b.why.slice(0, 120)}`);
    process.exitCode = 1;
  }
}
