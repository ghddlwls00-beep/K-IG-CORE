#!/usr/bin/env node
/**
 * 최종 관문 15 — 고친 글을 6단계 계획의 사슬(verify-applied-plans.cjs 'supersededBy')에 잇는다.
 *
 * 관문 15(내용 재검토 · 전수 읽기 고침)가 6단계 계획이 고친 칸을 다시 고치면, 그 계획 줄의 to 가 파일에서 사라져
 * verify-applied-plans 가 '어긋남' 을 낸다(작업 트리에서 잼: 117). 도구가 정한 길은 뒤에 고친 계획을 이름으로 잇는 것이다.
 *   1) 관문 15 기준 판(--base, 기본 d2b50ca = 배포된 글)과 지금 파일을 칸마다 대조해 바뀐 글(옛 → 새)을 모두 뽑아
 *      plans/gate15-fixes.json(바꾸기 꼴 { item, files, from, to, expect })을 만든다 — 사람이 고른 것이 아니라 파일 차이 그대로.
 *   2) verify-applied-plans 를 돌려 어긋나는 6단계 줄마다 사슬 끝 줄(뒤를 이은 계획이 있으면 그 끝)을 찾고, 그 끝 글에 gate15-fixes 의
 *      한 줄이 걸치면(verify 의 applyStep 과 같은 규칙) 그 끝 줄에 "supersededBy": "gate15-fixes …" 를 적는다. 걸치지 않으면 적지 않고 목록으로.
 *   3) 다시 verify — 줄어든 만큼 되풀이(사슬이 여러 계획을 지나는 줄). 적은 줄 · 못 적은 줄을 찍는다.
 * 계획 파일은 줄 하나를 글자로 고친다(그 줄의 "item" 바로 뒤에 한 칸 넣음) — 파일 서식 그대로, 고친 뒤 JSON 이 되는지 · 한 줄만 바뀌었는지 확인.
 *
 *   node link-gate15-plans.cjs [--base d2b50ca] [--write]      기본은 미리 보기
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BASE = arg("--base", "d2b50ca");
const WRITE = argv.includes("--write");
const PLANS = path.join(__dirname, "plans");
const NAME = "gate15-fixes";
const git = (a) => { const r = spawnSync("git", a, { cwd: REPO, maxBuffer: 1 << 30 }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.toString("utf8"); };

// ---------------------------------------------------------------- 1) 바뀐 글 뽑기
const changedFiles = git(["-c", "core.quotePath=false", "diff", "--name-only", BASE, "--", "content", "src/lib"]).split("\n").filter((f) => f.endsWith(".json"));
const pairs = new Map(); // "from\0to" → { from, to, files: Set, n }
const notes = [];
function walk(a, b, file, where) {
  if (typeof a === "string" && typeof b === "string") { if (a !== b) { const k = `${a}\u0000${b}`; const e = pairs.get(k) || pairs.set(k, { from: a, to: b, files: new Set(), n: 0 }).get(k); e.files.add(file); e.n++; } return; }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === b.length) { a.forEach((x, i) => walk(x, b[i], file, `${where}[${i}]`)); return; }
    // 길이가 다른 글 배열(대체 답 더하기 · 빼기): 빠진 글만 적어 둠(더한 글은 옛 계획을 깨지 않음)
    if (a.every((x) => typeof x === "string") && b.every((x) => typeof x === "string")) { for (const x of a) if (!b.includes(x)) notes.push({ file, where, removed: x }); return; }
    const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) walk(a[i], b[i], file, `${where}[${i}]`); return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (k in a && k in b) walk(a[k], b[k], file, `${where}.${k}`); else if (k in a && Array.isArray(a[k])) for (const x of a[k]) if (typeof x === "string") notes.push({ file, where: `${where}.${k}`, removed: x }); } }
}
for (const f of changedFiles) {
  let a; try { a = JSON.parse(git(["show", `${BASE}:${f}`]).replace(/^﻿/, "")); } catch { continue; }
  const b = JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8").replace(/^﻿/, ""));
  walk(a, b, f, "");
}
const plan = [...pairs.values()].map((p, i) => ({ item: `관문 15 #${i + 1}`, files: [...p.files].sort(), from: p.from, to: p.to, expect: 1 }));
const planFile = path.join(PLANS, `${NAME}.json`);
const planText = "[\n" + plan.map((l) => " " + JSON.stringify(l)).join(",\n") + "\n]\n";
console.log(`기준 ${BASE} → 지금: 바뀐 JSON 파일 ${changedFiles.length} · 바뀐 글(옛→새 짝) ${plan.length} · 칸 ${[...pairs.values()].reduce((a, p) => a + p.n, 0)} · 빠진 대체 답 ${notes.length}`);
if (WRITE) fs.writeFileSync(planFile, planText);

// ---------------------------------------------------------------- 2) 어긋나는 6단계 줄을 사슬에 잇기
const stage6 = fs.readdirSync(PLANS).filter((f) => /^stage6-.*\.json$/.test(f)).map((f) => `plans/${f}`);
function verify(extraPlanText) {
  // 미리 보기에서도 gate15-fixes 를 따라가게 — 임시 계획 폴더에 지금 계획 + (미리 보기면) gate15 계획을 둔다
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "g15plans-"));
  for (const f of fs.readdirSync(PLANS)) if (f.endsWith(".json")) fs.copyFileSync(path.join(PLANS, f), path.join(tmp, f));
  if (extraPlanText) fs.writeFileSync(path.join(tmp, `${NAME}.json`), extraPlanText);
  const r = spawnSync(process.execPath, [path.join(__dirname, "verify-applied-plans.cjs"), ...stage6.map((p) => path.join(tmp, path.basename(p))), "--plans-dir", tmp], { cwd: __dirname, maxBuffer: 1 << 28 });
  const out = r.stdout.toString("utf8");
  fs.rmSync(tmp, { recursive: true, force: true });
  // 줄 이름(item)에 ': ' 이 들어 있을 수 있어, 계획 파일의 이름들 가운데 '#<item>: ' 로 시작하는 것을 찾아 가른다
  const bad = [...out.matchAll(/^  어긋남 (\S+) (#.*)$/gm)].map((m) => {
    const file = m[1], rest = m[2];
    const names = fs.existsSync(path.join(PLANS, file)) ? loadPlan(file).map((l) => l.item) : [];
    const item = names.filter((n) => rest.startsWith(`#${n}: `)).sort((a, b) => b.length - a.length)[0];
    return item ? { file, item, why: rest.slice(item.length + 3) } : { file, item: rest.slice(1), why: "(줄 이름을 계획에서 못 찾음)" };
  });
  const sum = (out.match(/계획 \d+개 · \d+줄 · 어긋남 \d+[^\n]*/) || [""])[0];
  return { bad, sum };
}
const MIN_OVERLAP = 5;
const touches = (cur, from) => cur.includes(from) || from.includes(cur) || [...Array(Math.max(0, Math.min(cur.length, from.length) - MIN_OVERLAP)).keys()].some((d) => { const k = Math.min(cur.length, from.length) - 1 - d; return cur.endsWith(from.slice(0, k)) || from.endsWith(cur.slice(0, k)); });
const esc = (s) => JSON.stringify(s).slice(1, -1);
/** 계획 파일에서 item 이 이것인 줄의 사슬 끝 줄(파일 · item · 글)을 찾는다 — supersededBy 를 따라 계획 폴더에서 */
const loadPlan = (f) => JSON.parse(fs.readFileSync(path.join(PLANS, f), "utf8"));
const fileText = (f) => { try { return fs.readFileSync(path.join(REPO, f), "utf8"); } catch { return ""; } };
/** 같은 이름(item)의 줄이 여럿일 수 있다(한 항목의 문장마다 한 줄) — 지금 to 가 파일에 없는(어긋난) 줄만 */
function mismatchingLines(fileBase, item) {
  return loadPlan(fileBase).filter((l) => l.item === item && !l.revertedBy).filter((l) => {
    if (l.supersededBy || l.nowText !== undefined || l.gone) return true; // 사슬 줄 — 끝에서 판단
    const files = l.movedTo ? [l.movedTo] : l.files;
    return files.reduce((n, f) => n + fileText(f).split(esc(l.to)).length - 1, 0) < (l.expect || 1);
  });
}
function terminal(fileBase, item, start) {
  let f = fileBase, line = start || loadPlan(f).find((l) => l.item === item);
  for (let hop = 0; line && hop < 20; hop++) {
    // 사슬 끝이 줄에 적힌 글(nowText · gone)이면 이름을 이어도 소용없다(verify 는 적힌 글을 먼저 봄) — 손으로 그 글을 새 글로
    if (line.nowText !== undefined || line.gone) return { f, line, written: true };
    if (!line.supersededBy) break;
    const name = String(line.supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
    if (name === NAME) return null; // 이미 이어짐
    const succF = `${name}.json`;
    if (!fs.existsSync(path.join(PLANS, succF))) return { f, line }; // 계획이 아닌 것(nowText 등) — 그대로
    const succ = loadPlan(succF);
    const hit = [...succ].reverse().find((s) => (s.files || [s.file]).some((x) => (line.files || []).includes(x) || (line.movedTo === x)) && s.from && touches(line.to, s.from));
    if (!hit) return { f, line };
    f = succF; line = hit;
  }
  return line ? { f, line } : null;
}
function addSuperseded(f, line) {
  const p = path.join(PLANS, f);
  const text = fs.readFileSync(p, "utf8");
  const needle = `"item":${text.includes(`"item": "`) ? " " : ""}${JSON.stringify(line.item)}`;
  // 같은 이름이 여러 곳이면 그 줄의 to 글이 뒤따르는 곳(다음 "item" 전까지)
  const spots = [];
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) spots.push(i);
  const toJson = JSON.stringify(line.to);
  const hits = spots.filter((i) => { const nextItem = text.indexOf(`"item"`, i + needle.length); const seg = text.slice(i, nextItem < 0 ? undefined : nextItem); return seg.includes(toJson); });
  if (hits.length !== 1) return `item 을 글자로 한 곳만 찾지 못함(${f} #${line.item} · 같은 이름 ${spots.length} · to 가 맞는 곳 ${hits.length})`;
  const at = hits[0];
  const ins = `${needle},${text.includes(`"item": "`) ? " " : ""}"supersededBy":${text.includes(`"item": "`) ? " " : ""}"${NAME} 관문 15(2026-09-24) — 내용 재검토 · 전수 읽기 고침"`;
  const next = text.slice(0, at) + ins + text.slice(at + needle.length);
  const a = JSON.parse(text), b = JSON.parse(next);
  const diff = a.filter((x, i) => JSON.stringify(x) !== JSON.stringify(b[i])).length;
  if (diff !== 1 || a.length !== b.length) return `고친 뒤 바뀐 줄이 ${diff}개(1이어야 함)`;
  if (WRITE) fs.writeFileSync(p, next);
  return null;
}
let round = 0, linked = 0;
const cannot = [];
const extra = WRITE ? null : planText;
let v = verify(extra);
console.log(`잇기 전: ${v.sum}`);
const seen = new Set();
while (v.bad.length && round < 6) {
  round++;
  let progress = 0;
  for (const b of v.bad) {
    const key0 = `${b.file}#${b.item}`;
    if (seen.has(key0)) continue;
    seen.add(key0);
    const starts = mismatchingLines(b.file, b.item);
    if (!starts.length) { cannot.push(`${key0} — 어긋난 줄을 계획에서 못 찾음`); continue; }
    for (const s0 of starts) {
      const key = `${key0} (to: ${String(s0.to).slice(0, 30)})`;
      const t = terminal(b.file, b.item, s0);
      if (!t) continue; // 이미 gate15 로 이어짐
      if (t.written) { cannot.push(`${key} — 사슬 끝이 ${t.f} #${t.line.item} 의 적힌 글(nowText · gone): 손으로 그 글을 관문 15 뒤 글로 고칠 것`); continue; }
      // 사슬 끝 줄의 to 가 지금도 있어도 잇는다 — 어긋난 것은 사슬이 이어 붙인 앞 글(끝 줄 to 보다 긴 글)이고, 관문 15 가 그 글을
      // 고쳤으면 끝 줄에서 관문 15 줄로 넘어가야 verify 가 새 글을 센다. 전에는 여기서 말없이 건너뛰어 d083 두 줄이 남았다(2026-09-24).
      const tFiles = t.line.movedTo ? [t.line.movedTo] : (t.line.files || [t.line.file]);
      const hitG15 = plan.some((g) => g.files.some((x) => tFiles.includes(x)) && (touches(esc(t.line.to), esc(g.from)) || touches(t.line.to, g.from)));
      if (!hitG15) { cannot.push(`${key} — 관문 15 고침과 걸치지 않음(${b.why.slice(0, 80)})`); continue; }
      const err = addSuperseded(t.f, t.line);
      if (err) { cannot.push(`${key} — ${err}`); continue; }
      linked++; progress++;
    }
  }
  if (!WRITE) break; // 미리 보기는 한 바퀴만(파일을 안 바꿔 되풀이해도 같음)
  v = verify(null);
  if (!progress) break;
}
// ---------------------------------------------------------------- 4) VOCA 뜻 계획(set-voca-meanings --check 가 보는 것) — 같은 표제어 사슬
// 6단계 VOCA 뜻 계획 줄 { item, word, from, to } 의 사슬은 뒤 계획의 '같은 표제어 줄' 을 따라간다(set-voca-meanings.cjs chainEnd).
// 관문 15 전후 사전(content/voca_dictionary.json)의 뜻이 바뀐 표제어로 gate15-voca.json 을 만들고, 어긋나는 줄의 사슬 끝에 이름을 적는다.
const VNAME = "gate15-voca";
const vOld = JSON.parse(git(["show", `${BASE}:content/voca_dictionary.json`]).replace(/^﻿/, ""));
const vNew = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const vplan = Object.keys(vNew).filter((w) => vOld[w] && vOld[w].meaning !== vNew[w].meaning).map((w) => ({ item: `관문 15 ${w}`, word: w, from: vOld[w].meaning, to: vNew[w].meaning }));
const vplanText = "[\n" + vplan.map((l) => " " + JSON.stringify(l)).join(",\n") + "\n]\n";
if (WRITE) fs.writeFileSync(path.join(PLANS, `${VNAME}.json`), vplanText);
const vocaPlans = fs.readdirSync(PLANS).filter((f) => /^stage6-voca-.*\.json$/.test(f) && !/-sw|-cookie|-dining|-pebble|-labour|voca-a\.json$/.test(f));
function vcheck() {
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "g15voca-"));
  // set-voca-meanings 는 계획 폴더를 도구 옆 plans/ 로 고정 — 미리 보기는 계획 폴더를 건드리지 않으려고 사슬을 여기서 직접 따라감
  fs.rmSync(tmp, { recursive: true, force: true });
  const bad = [];
  for (const f of vocaPlans) for (const l of loadPlan(f)) {
    if (l.revertedBy) continue;
    let cur = l, hops = 0;
    while (cur.supersededBy && hops++ < 20) {
      const n = String(cur.supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
      const lines = n === VNAME ? vplan : fs.existsSync(path.join(PLANS, `${n}.json`)) ? loadPlan(`${n}.json`) : null;
      if (!lines) break;
      let next = lines.filter((x) => x.word === cur.word);
      if (!next.length) next = lines.filter((x) => x.from === cur.to);
      if (!next.length) break;
      cur = { ...next[next.length - 1], _file: n === VNAME ? null : `${n}.json` };
    }
    const now = (vNew[cur.word] || {}).meaning;
    if (now !== cur.to) bad.push({ f, l, end: cur });
  }
  return bad;
}
let vlinked = 0;
const vcannot = [];
const vdone = new Set(); // 여러 줄이 같은 사슬 끝을 가리키면 한 번만(예: associate 두 줄 → zzc 한 줄)
for (const b of vcheck()) {
  const endFile = b.end._file || b.f;
  const endLine = b.end._file ? loadPlan(b.end._file).find((x) => x.item === b.end.item && x.word === b.end.word) : b.l;
  const ekey = `${endFile}#${endLine.item}#${endLine.word}`;
  if (vdone.has(ekey)) continue;
  vdone.add(ekey);
  const g = vplan.find((x) => x.word === endLine.word && x.from === endLine.to);
  if (!g) { vcannot.push(`${b.f} #${b.l.item} — 관문 15 뜻 고침의 옛 뜻이 사슬 끝 뜻과 다름(사슬 끝 ${endFile}: '${endLine.to}' · 지금 '${(vNew[endLine.word] || {}).meaning}')`); continue; }
  const err = addSupersededV(endFile, endLine);
  if (err) vcannot.push(`${b.f} #${b.l.item} — ${err}`); else vlinked++;
}
function addSupersededV(f, line) {
  const p = path.join(PLANS, f);
  const text = fs.readFileSync(p, "utf8");
  if (line.supersededBy) return `사슬 끝 줄에 이미 supersededBy(${line.supersededBy})`;
  const sp = text.includes(`"item": "`) ? " " : "";
  const needle = `"item":${sp}${JSON.stringify(line.item)},${sp}"word":${sp}${JSON.stringify(line.word)}`;
  const at = text.indexOf(needle);
  if (at < 0 || text.indexOf(needle, at + 1) >= 0) return `item · word 를 글자로 한 곳만 찾지 못함(${f} #${line.item})`;
  const next = text.slice(0, at) + `${needle},${sp}"supersededBy":${sp}"${VNAME} 관문 15(2026-09-24) — 내용 재검토 · 전수 읽기 고침"` + text.slice(at + needle.length);
  const a = JSON.parse(text), b = JSON.parse(next);
  if (a.length !== b.length || a.filter((x, i) => JSON.stringify(x) !== JSON.stringify(b[i])).length !== 1) return "고친 뒤 바뀐 줄이 1개가 아님";
  if (WRITE) fs.writeFileSync(p, next);
  return null;
}
console.log(`VOCA: 관문 15 로 뜻이 바뀐 표제어 ${vplan.length} · ${WRITE ? "적은" : "적을"} supersededBy ${vlinked} · 못 이은 것 ${vcannot.length}`);
for (const c of vcannot) console.log(`   ${c}`);

console.log(`${WRITE ? "적은" : "적을"} supersededBy ${linked} · 못 이은 줄 ${cannot.length}`);
for (const c of cannot.slice(0, 40)) console.log(`   ${c}`);
if (WRITE) console.log(`잇기 뒤: ${v.sum}`);
for (const nt of notes.slice(0, 10)) console.log(`   (참고) 빠진 대체 답 ${nt.file}${nt.where}: ${nt.removed.slice(0, 70)}`);
// 잇고도 남은 어긋남은 말없이 두지 않는다 — 줄마다 찍고 exit 1
if (WRITE && v.bad.length) {
  console.log(`남은 어긋남 ${v.bad.length}:`);
  for (const b of v.bad) console.log(`   ${b.file} #${b.item} — ${b.why.slice(0, 120)}`);
  process.exitCode = 1;
}
