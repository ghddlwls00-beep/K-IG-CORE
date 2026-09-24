#!/usr/bin/env node
/**
 * 최종 관문 15 — '손으로' 남은 고침을 **명시적 조작 목록**으로 적용한다(apply-content-fixes.cjs 가 한 칸 바꾸기로 못 한 것:
 * 대체 답 더하기 · 빼기 · 모범 답 바꾸기 · 여러 칸 · '고칠 곳' 에 적힌 다른 칸). 조작마다 옛 값이 적힌 그대로일 때만 바꾸고,
 * 하나라도 안 맞으면 아무것도 쓰지 않고 멈춘다(부분 적용 없음). 파일 서식(들여쓰기 · CRLF · 끝 줄바꿈)은 그대로.
 *
 *   node apply-ops.cjs --ops <조작.json> --root <작업 트리> [--write] [--out <기록.json>]
 *
 * 조작.json: [ { "id": "M1 grammar1-a/F:C02984", "why": "…", "op": …, "file": "content/…json", … } ]
 *   op "set"        : path · old · new                  — 글 칸 하나(old 와 정확히 같아야)
 *   op "addAlts"    : item · add[]                      — 문항(item 경로)의 alternatives 에 없는 것만 뒤에 더함(있던 것은 그대로)
 *   op "removeAlts" : item · remove[]                   — alternatives 에서 뺌(모두 있어야). 비면 칸을 지움(앱은 없음 = [] 로 봄)
 *   op "setItem"    : item · oldText · newText · oldAlts(없으면 null) · newAlts — 모범 답과 대체 답을 함께(소유자 결정 3 등)
 * 경로 문법은 apply-content-fixes.cjs 와 같다(.a[3].b[n=5].c · [id=…] · [word=…]).
 */
const fs = require("fs");
const path = require("path");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const OPS = arg("--ops", null);
const ROOT = arg("--root", null);
const WRITE = argv.includes("--write");
const OUTF = arg("--out", null);
if (!OPS || !ROOT) { console.error("사용: --ops <조작.json> --root <작업 트리> [--write] [--out 기록.json]"); process.exit(2); }

function parsePath(p) {
  const toks = [];
  const re = /\.([^.[\]]+)|\[(\d+)\]|\[(id|n|word)=([^\]]*)\]/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[1] !== undefined) toks.push({ k: m[1] });
    else if (m[2] !== undefined) toks.push({ i: +m[2] });
    else toks.push({ key: m[3], val: m[4] });
  }
  return toks;
}
function resolve(root, p) {
  const toks = parsePath(p);
  if (!toks.length) throw new Error(`경로를 못 읽음: ${p}`);
  let cur = root, parent = null, key = null;
  for (const t of toks) {
    if (cur === null || typeof cur !== "object") throw new Error(`경로 중간이 값이 아님: ${p}`);
    parent = cur;
    if (t.k !== undefined) key = t.k;
    else if (t.i !== undefined) key = t.i;
    else {
      if (!Array.isArray(cur)) throw new Error(`[${t.key}=…] 인데 배열이 아님: ${p}`);
      const hits = cur.map((x, i) => [x, i]).filter(([x]) => x && typeof x === "object" && String(x[t.key]) === t.val);
      if (hits.length !== 1) throw new Error(`[${t.key}=${t.val}] 가 ${hits.length}곳: ${p}`);
      key = hits[0][1];
    }
    cur = parent[key];
  }
  return { parent, key };
}
const files = new Map();
function load(rel) {
  if (files.has(rel)) return files.get(rel);
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const bom = raw.charCodeAt(0) === 0xfeff;
  const body = raw.replace(/^﻿/, "");
  const e = { rel, raw, json: JSON.parse(body), fmt: { bom, crlf: body.includes("\r\n"), ind: (body.match(/\r?\n( +|\t)\S/) || [, "  "])[1], endNl: /\r?\n$/.test(body) }, dirty: false };
  e.roundtrip = serialize(e) === raw;
  files.set(rel, e);
  return e;
}
function serialize(e) {
  let out = JSON.stringify(e.json, null, e.fmt.ind);
  if (e.fmt.crlf) out = out.replace(/\n/g, "\r\n");
  if (e.fmt.endNl) out += e.fmt.crlf ? "\r\n" : "\n";
  return (e.fmt.bom ? "﻿" : "") + out;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ops = JSON.parse(fs.readFileSync(OPS, "utf8").replace(/^﻿/, ""));
const log = [];
const fail = [];
for (const o of ops) {
  try {
    const f = load(o.file);
    if (!f.roundtrip) throw new Error(`${o.file} 는 읽고 다시 쓰면 서식이 달라짐`);
    if (o.op === "set") {
      const r = resolve(f.json, o.path);
      if (r.parent[r.key] !== o.old) throw new Error(`옛 값이 다름 — 지금 ${JSON.stringify(r.parent[r.key])}`);
      r.parent[r.key] = o.new;
      log.push({ id: o.id, op: o.op, file: o.file, where: o.path, old: o.old, new: o.new });
    } else if (o.op === "addAlts" || o.op === "removeAlts" || o.op === "setItem") {
      const r = resolve(f.json, o.item);
      const it = r.parent[r.key];
      if (!it || typeof it !== "object" || typeof it.text !== "string") throw new Error(`문항이 아님: ${o.item}`);
      const before = { text: it.text, alternatives: it.alternatives === undefined ? null : [...it.alternatives] };
      if (o.op === "addAlts") {
        const cur = it.alternatives || [];
        const add = o.add.filter((x) => !cur.includes(x) && x !== it.text);
        if (!add.length) throw new Error("더할 것이 모두 이미 있음");
        it.alternatives = [...cur, ...add];
      } else if (o.op === "removeAlts") {
        const cur = it.alternatives || [];
        const missing = o.remove.filter((x) => !cur.includes(x));
        if (missing.length) throw new Error(`뺄 것이 없음: ${missing.join(" · ")}`);
        const left = cur.filter((x) => !o.remove.includes(x));
        if (left.length) it.alternatives = left; else delete it.alternatives;
      } else {
        if (it.text !== o.oldText) throw new Error(`모범 답이 다름 — 지금 ${JSON.stringify(it.text)}`);
        if (!same(before.alternatives, o.oldAlts)) throw new Error(`대체 답이 다름 — 지금 ${JSON.stringify(before.alternatives)}`);
        it.text = o.newText;
        if (o.newAlts && o.newAlts.length) it.alternatives = [...o.newAlts]; else delete it.alternatives;
      }
      log.push({ id: o.id, op: o.op, file: o.file, where: o.item, before, after: { text: it.text, alternatives: it.alternatives === undefined ? null : [...it.alternatives] } });
    } else throw new Error(`모르는 op ${o.op}`);
    f.dirty = true;
  } catch (e) {
    fail.push({ id: o.id, file: o.file, why: e.message });
  }
}
console.log(`조작 ${ops.length} · 맞음 ${log.length} · 안 맞음 ${fail.length} · 바뀔 파일 ${[...files.values()].filter((e) => e.dirty).length}`);
for (const x of fail) console.log(`   ✘ ${x.id} ${x.file}: ${x.why}`);
if (fail.length) { console.log("하나라도 안 맞으면 아무것도 쓰지 않음"); process.exit(1); }
if (WRITE) {
  for (const e of files.values()) {
    if (!e.dirty) continue;
    fs.writeFileSync(path.join(ROOT, e.rel), serialize(e));
    const back = JSON.parse(fs.readFileSync(path.join(ROOT, e.rel), "utf8").replace(/^﻿/, ""));
    if (!same(back, e.json)) { console.error(`STOP: 되읽은 ${e.rel} 가 쓴 것과 다름`); process.exit(1); }
  }
  console.log(`씀 ${[...files.values()].filter((e) => e.dirty).length}`);
} else console.log("(미리 보기 — 안 씀)");
if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ops: OPS, root: ROOT, write: WRITE, log }, null, 1));
