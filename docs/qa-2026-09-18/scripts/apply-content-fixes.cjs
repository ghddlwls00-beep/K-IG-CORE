#!/usr/bin/env node
/**
 * 최종 관문 15 — 학습 내용 재검토 · 전수 읽기의 '틀림 표' 를 내용 파일에 적용한다(2026-09-24).
 *
 * 판정마다 **'지금' 글이 그 강의 파일의 한 칸과 정확히 같을 때만** '고칠 글' 로 바꾼다. 칸을 못 찾거나, 여러 곳이 맞거나,
 * '고칠 글' 이 한 칸의 값이 아니면(여러 칸을 한 줄에 · 대체 답 더하기 · 코드 규칙) 바꾸지 않고 '손으로' 목록에 까닭과 함께 남긴다.
 * 추측으로 고치지 않는다 — 표의 글은 다른 세션(같은 AI 계열)이 쓴 것이고, 그대로 옮기는 것만 이 도구가 한다.
 *
 *   node apply-content-fixes.cjs --ref <가지> --verdicts <가지 안 판정.json> [--list <가지 안 목록.jsonl>] [--root <작업 트리>]
 *                                [--write] [--out <계획.json>] [--only key1,key2] [--skip key1,key2]
 *   기본은 미리 보기(아무것도 안 씀). --write 일 때만 --root 의 파일을 바꾼다.
 *
 * 파일 서식: 들여쓰기(공백 1 · 2) · 줄바꿈(CRLF · LF) · 끝 줄바꿈을 파일마다 읽어 그대로 다시 쓴다. 바꾸기 전에 '읽고 그대로 다시 쓰면
 * 한 글자도 안 다른가' 를 보고(3,050 파일 중 3,046 이 같음), 다르면 그 파일은 손으로. 쓴 뒤에는 되읽어 바꾼 칸만 달라졌는지 본다.
 *
 * 판정 파일의 꼴(내용-재검토/scripts/merge.cjs · full-merge.cjs): { 찾은것: [ { key, 상태, 출처, ids, 쪽, 최종: { 지금, 고칠 글, 고칠 곳, 종류, 심각도, 새 음성 클립 } } ] }
 *   상태 '표에 올림' 만 적용 대상. ids(C…)가 있으면 목록.jsonl 의 file · path · after(지금 판 값)로 칸을 찾고, 없으면 '고칠 곳' 에 적힌 파일에서
 *   '지금' 과 같은 칸을 찾는다.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const REF = arg("--ref", null);
const VERDICTS = arg("--verdicts", null);
const LIST = arg("--list", null);
const ROOT = path.resolve(arg("--root", REPO));
const WRITE = argv.includes("--write");
const OUTF = arg("--out", null);
const ONLY = arg("--only", null) ? new Set(arg("--only", "").split(",")) : null;
const SKIP = arg("--skip", null) ? new Set(arg("--skip", "").split(",")) : new Set();
if (!REF || !VERDICTS) { console.error("사용: --ref <가지> --verdicts <가지 안 판정.json 경로> [--list <목록.jsonl>] [--root <작업 트리>] [--write]"); process.exit(2); }
if (WRITE && ROOT === REPO) {
  // 관문 0 이 도는 동안 본 폴더의 content/ 는 안 바꾼다(명령서) — 본 폴더에 쓰려면 --root 를 본 폴더로 일부러 적는다.
  if (!argv.includes("--root")) { console.error("STOP: --write 는 --root 를 적어야 함(본 폴더에 쓸 때도 일부러 적을 것)"); process.exit(2); }
}

function gitShow(spec) {
  const r = spawnSync("git", ["show", spec], { cwd: REPO, maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error(`STOP: git show ${spec} — ${String(r.stderr).trim()}`); process.exit(2); }
  return r.stdout.toString("utf8").replace(/^﻿/, "");
}
// --ref file: 커밋 전 초안을 미리 볼 때만(파일 경로로 읽음). 실제 적용은 가지(커밋된 결과)에서.
const readSrc = (p) => (REF === "file" ? fs.readFileSync(p, "utf8").replace(/^﻿/, "") : gitShow(`${REF}:${p}`));

// ---------------------------------------------------------------- 경로 풀기 (.a[3].b[n=5].c · [id=…] · [word=…] · [was N])
function parsePath(p) {
  const toks = [];
  const re = /\.([^.[\]]+)|\[was (\d+)\]|\[(\d+)\]|\[(id|n|word)=([^\]]*)\]/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[1] !== undefined) toks.push({ k: m[1] });
    else if (m[2] !== undefined) toks.push({ was: +m[2] });
    else if (m[3] !== undefined) toks.push({ i: +m[3] });
    else toks.push({ key: m[4], val: m[5] });
  }
  return toks;
}
/** returns { parent, key } of the addressed slot, or { error } */
function resolve(root, p) {
  const toks = parsePath(p);
  if (!toks.length) return { error: `경로를 못 읽음: ${p}` };
  let cur = root, parent = null, key = null;
  for (const t of toks) {
    if (cur === null || typeof cur !== "object") return { error: `경로 중간이 값이 아님: ${p}` };
    parent = cur;
    if (t.k !== undefined) key = t.k;
    else if (t.i !== undefined) key = t.i;
    else if (t.was !== undefined) return { error: `옛 자리([was ${t.was}])로 적힌 경로 — 지금 자리를 모름: ${p}` };
    else {
      if (!Array.isArray(cur)) return { error: `[${t.key}=…] 인데 배열이 아님: ${p}` };
      const hits = cur.map((x, i) => [x, i]).filter(([x]) => x && typeof x === "object" && String(x[t.key]) === t.val);
      if (hits.length !== 1) return { error: `[${t.key}=${t.val}] 가 ${hits.length}곳: ${p}` };
      key = hits[0][1];
    }
    cur = parent[key];
  }
  return { parent, key };
}

// ---------------------------------------------------------------- 파일 읽기 · 서식 그대로 쓰기
const files = new Map(); // rel → { json, fmt, dirty, roundtrip }
function load(rel) {
  if (files.has(rel)) return files.get(rel);
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { files.set(rel, null); return null; }
  const raw = fs.readFileSync(abs, "utf8");
  const bom = raw.charCodeAt(0) === 0xfeff;
  const body = raw.replace(/^﻿/, "");
  const crlf = body.includes("\r\n");
  const ind = (body.match(/\r?\n( +|\t)\S/) || [, "  "])[1];
  const endNl = /\r?\n$/.test(body);
  const json = JSON.parse(body);
  const fmt = { bom, crlf, ind, endNl };
  const e = { rel, json, fmt, dirty: false, raw };
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
/** every string slot in a JSON value equal to text: [{ parent, key, where }] */
function findString(node, text, where = "", out = []) {
  if (Array.isArray(node)) node.forEach((x, i) => (typeof x === "string" ? x === text && out.push({ parent: node, key: i, where: `${where}[${i}]` }) : findString(x, text, `${where}[${i}]`, out)));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) (typeof v === "string" ? v === text && out.push({ parent: node, key: k, where: `${where}.${k}` }) : findString(v, text, `${where}.${k}`, out));
  return out;
}

// ---------------------------------------------------------------- 판정 읽기
const verdicts = JSON.parse(readSrc(VERDICTS));
const list = LIST ? new Map(readSrc(LIST).split("\n").filter(Boolean).map((l) => { const x = JSON.parse(l); return [x.id, x]; })) : new Map();
// --ref file 은 초안 미리 보기용 — 쓰려면 그 파일을 만든 커밋된 출처를 --derived-from <커밋> 으로 적어야 함(예: 전수 읽기 판정.json + 결과.md '더한 틀림' 표를 합친 파일)
const DERIVED = arg("--derived-from", null);
if (REF === "file" && WRITE) {
  if (!DERIVED) { console.error("STOP: --ref file(초안)로는 쓰지 않음 — 커밋된 가지의 결과로만 적용(합친 파일이면 --derived-from <커밋>)"); process.exit(2); }
  const r = spawnSync("git", ["cat-file", "-e", `${DERIVED}^{commit}`], { cwd: REPO });
  if (r.status !== 0) { console.error(`STOP: --derived-from ${DERIVED} 가 커밋이 아님`); process.exit(2); }
}
// 전수 읽기(full-merge.cjs) 판정은 꼴이 다르다: { 표: [{ ch(조각), c(과정), g(묶음 'ld/d010'), x(최종), how }] } — 재검토 꼴로 맞춤
if (!verdicts["찾은것"] && Array.isArray(verdicts["표"])) {
  verdicts["찾은것"] = verdicts["표"].map((r) => ({ key: `F:${r.g}:${r.x && r.x.T}`, 상태: "표에 올림", 출처: `전수(${r.how || ""})`, 조각: r.ch, ids: [], 쪽: `/${r.g}`, 묶음: r.g, 최종: r.x || {} }));
}
const table = (verdicts["찾은것"] || []).filter((f) => f["상태"] === "표에 올림");
// 곁글 key(X:<n>)는 조각마다 0 부터라 과정 사이에 겹친다 — 조각을 붙여 하나로
const uid = (f) => `${f["조각"] || "-"}/${f.key}`;
{ const seen = new Map(); for (const f of table) { const u = uid(f); seen.set(u, (seen.get(u) || 0) + 1); } const dup = [...seen].filter(([, n]) => n > 1); if (dup.length) { console.error(`STOP: 같은 조각/key 가 둘 이상: ${dup.map(([u]) => u).join(", ")}`); process.exit(2); } }
// '새 음성 클립' 은 판정 파일에 true 또는 "true"/"false"(글자)로 적혀 있다
const clipFlag = (v) => v === true || v === "true";
const plan = [];
const say = (f, status, why, extra = {}) => plan.push({ uid: uid(f), key: f.key, status, why, 출처: f["출처"], 종류: f["최종"]["종류"], 심각도: f["최종"]["심각도"], 새클립: clipFlag(f["최종"]["새 음성 클립"]), 지금: f["최종"]["지금"], 고칠글: f["최종"]["고칠 글"], ...extra });

// '고칠 글' 이 한 칸의 값이 아닌 꼴(여러 칸을 한 줄에 · 더하기 · 괄호로 덧붙인 목록) — 손으로
const COMPOSITE = [/blocks\[\d+\]\s*:/, /\(그리고 /, /\s\/\s*blocks\[/, /^\s*n\d+\s*[:[]/];
const WHERE_MANUAL = [/더함|더하기|더한다|추가|빼기|뺌|지움|코드|LdLearningView|src\//];
// 한 줄 값이 아니라 여러 칸을 적은 '고칠 곳'(예: 'blocks[6] · blocks[8]')
const MULTI_SLOT = /blocks\[\d+\][^\n]*blocks\[\d+\]/;

function filesFromWhere(where, page) {
  const out = new Set();
  const re = /content\/[\w./-]+\.json/g;
  let m, dir = null;
  while ((m = re.exec(where || ""))) { out.add(m[0]); dir = path.posix.dirname(m[0]); }
  // '· gh1-058-2.json' 처럼 폴더를 뺀 옆 파일
  if (dir) for (const s of (where || "").match(/(?<![\w/])[a-z]+\d*-[\w-]+\.json/g) || []) out.add(`${dir}/${s}`);
  if (!out.size && page) for (const f of groupFiles(page)) out.add(f);
  return [...out];
}
/** 묶음(쪽) 하나가 글을 들고 있는 파일들 — 전수 읽기는 '고칠 곳' 에 파일 경로를 안 적기도 한다(묶음 'ld/d010' 만) */
function groupFiles(page) {
  const [, course, id] = String(page).split("/");
  if (!course || !id) return [];
  const dir = `content/lessons/${course}`;
  const base = id.replace(/-\d+$/, "");
  const sibs = (b) => { try { return fs.readdirSync(path.join(ROOT, dir)).filter((n) => new RegExp(`^${b}(-\\d+)?\\.json$`).test(n)).map((n) => `${dir}/${n}`); } catch { return []; } };
  const out = sibs(base);
  if (course === "ld") out.push("content/ld_english_scripts.json");
  if (course === "phonics") out.push("content/voca_dictionary.json");
  if (course === "grammar1") { const n = Number((base.match(/(\d+)$/) || [])[1]); if (n) for (const k of [n - 1, n + 1]) out.push(...sibs(`gh1-${String(k).padStart(3, "0")}`)); }
  if (course === "student") out.push("content/courses/student.json");
  return [...new Set(out)];
}

// ---------------------------------------------------------------- 1단계: 판정마다 바꿀 칸과 새 값을 정한다(아직 안 바꿈)
// 같은 칸을 여러 판정이 고치기도 한다(예: LISTENING 표본 칩 판정 여럿이 1부의 힌트 줄 고침과 같은 글을 제안). 칸마다 모아서
// 새 값이 모두 같을 때만 한 번 바꾸고, 다르면 그 칸의 판정 모두 '손으로'.
const asArray = (s) => { if (!/^\s*\[/.test(s)) return null; try { const a = JSON.parse(s); return Array.isArray(a) && a.every((x) => typeof x === "string") ? a : null; } catch { return null; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const slots = new Map(); // "file path" → { file, parent, key, where, before, props: [{ uid, value, expectOld | ANY }] }
const ANY = Symbol("칩 설명 — 지금 글 대조 없음");
const findingSlots = new Map(); // uid → [slot keys]
const manual = new Map(); // uid → why
function slotOf(file, parent, key, where) {
  const k = `${file} ${where}`;
  if (!slots.has(k)) slots.set(k, { file, parent, key, where, before: parent[key], props: [] });
  return k;
}
/** a finding proposes value for the slot; arrays only as additions (no entry of the present list may go) */
function propose(f, file, parent, key, where, value, expectOld) {
  const w = (f["최종"] || {})["고칠 곳"];
  const fileJson = (load(file) || {}).json;
  if (!pathAgrees(where, w, fileJson, parent, key)) return `'고칠 곳' 의 칸(${wherePaths(w).join(" · ")})이 바꾸려는 칸(${where})과 다름`;
  const cur = parent[key];
  if (Array.isArray(value)) {
    if (cur !== undefined && !Array.isArray(cur)) return `배열로 고치려는데 칸이 배열이 아님 ${file} ${where}`;
    const lost = (cur || []).filter((x) => !value.includes(x));
    if (lost.length) return `대체 답을 빼는 고침(${lost.map((x) => `'${x.slice(0, 40)}'`).join(" · ")}) — 손으로`;
  } else if (typeof cur !== "string") return `칸이 글이 아님(${Array.isArray(cur) ? "배열" : typeof cur}) ${file} ${where}`;
  const k = slotOf(file, parent, key, where);
  slots.get(k).props.push({ uid: uid(f), value, expectOld });
  (findingSlots.get(uid(f)) || findingSlots.set(uid(f), []).get(uid(f))).push(k);
  return null;
}
// '고칠 곳' 적는 법 맞추기(전수 읽기에서 봄): 'items[5] (n=6) .alternatives' · 'json blocks[3].items(n=37).alternatives' · '… · 분할본 gh1-007-1.json …'
const normWhere = (w) => String(w || "")
  .replace(/\.json\s+blocks\[/g, ".json .blocks[")
  .replace(/\.json\s+readingSentences/g, ".json .readingSentences")
  .replace(/items\(n=(\d+)\)/g, "items[n=$1]")
  .replace(/\s*\(n=\d+\)\s*(?=\.)/g, "")
  .replace(/\]\s+\.(?=[A-Za-z])/g, "].");
const PATH_RE = "((?:\\.[^\\s.[\\]()·—]+|\\[[^\\]]+\\])+)";
const pathInWhere = (w) => { const m = normWhere(w).match(new RegExp(`(content\\/[\\w./-]+\\.json)\\s+${PATH_RE}`)); return m ? { file: m[1], path: m[2] } : null; };
/** '고칠 곳' 에 적힌 (파일, 칸) 모두 — 첫 파일과 같은 폴더의 '분할본 gh1-007-1.json .blocks[…]' 처럼 폴더를 뺀 파일도. 칸을 안 적은 옆 파일은 첫 칸과 같은 칸으로 */
function pathsInWhere(w) {
  const first = pathInWhere(w);
  if (!first) return [];
  const out = [first];
  const dir = path.posix.dirname(first.file);
  const re = new RegExp(`(?<![\\w/])((?:gh[12]|pr|d|s|mv|hv)[\\w-]*\\.json)(?:\\s+${PATH_RE})?`, "g");
  const t = normWhere(w);
  let m;
  while ((m = re.exec(t))) {
    const file = `${dir}/${m[1]}`;
    if (file === first.file || out.some((x) => x.file === file)) continue;
    out.push({ file, path: m[2] || first.path });
  }
  return out;
}
// '고칠 곳' 에 JSON 칸(.commonplace.meaning 같은)이 적혔는데 바꾸려는 칸과 다르면 손으로 — 판정 줄(ids)은 '읽다 본 줄' 이고 고칠 칸은 다른 곳일 수 있다
// (2026-09-24 미리 보기에서 잡음: C02694 는 바뀐 줄 common 을 읽다 commonplace 를 고치라는 판정인데, 도구가 common 을 바꿈).
const wherePaths = (w) => [...normWhere(w).matchAll(/(?:^|[\s·(,])(\.[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*|\[[^\]]+\])*)/g)].map((m) => m[1]);
/** 같은 칸인가 — '고칠 곳' 의 경로를 그 파일에서 풀어 같은 자리(parent · key)를 가리키면 같음([n=13] 과 [12] 처럼 적는 법만 다를 수 있음).
 *  풀리지 않는 조각 경로(.alternatives 같은)는 글자로 끝이 맞는지만 본다. */
/** node 안(자기 자신 포함)에 target 객체가 있나 — '고칠 곳' 이 바꾸려는 칸의 윗자리를 적은 경우 */
const contains = (node, target) => node === target || (node !== null && typeof node === "object" && Object.values(node).some((v) => contains(v, target)));
const pathAgrees = (slotPath, w, json, parent, key) => {
  const ps = wherePaths(w);
  if (!ps.length) return true;
  const s = String(slotPath).replace(/\s+/g, "");
  return ps.some((p) => {
    // 끝 칸이 없는(undefined) 풀이는 '못 풂' 으로 — 맨 위에서 '.text' 를 풀면 오류 없이 없는 칸이 나온다
    // 적힌 칸이 바꾸려는 칸이거나, 그 칸을 품은 자리(.readingSentences[0] → 그 문장의 .korean · 문항 → 그 .alternatives)면 같음
    if (json) { const r = resolve(json, p); if (!r.error && r.parent && r.parent[r.key] !== undefined) return (r.parent === parent && r.key === key) || contains(r.parent[r.key], parent); }
    return s.endsWith(p) || p.endsWith(s);
  });
};

for (const f of table) {
  if (ONLY && !ONLY.has(uid(f))) continue;
  if (SKIP.has(uid(f))) { say(f, "건너뜀", "--skip"); continue; }
  const fin = f["최종"] || {};
  const fix = fin["고칠 글"];
  const where = fin["고칠 곳"] || "";
  const now = fin["지금"];
  const no = (why) => manual.set(uid(f), why);
  if (typeof fix !== "string" || !fix.trim()) { no("'고칠 글' 이 없음"); continue; }
  // '고칠 글' 이 '지금' 과 같으면 이 칸은 그대로이고 고칠 것은 '고칠 곳' 에 글로 적힌 다른 칸 · 코드다(예: C05873 '이 줄은 그대로. 같은 파일의 네 줄을 …')
  if (typeof now === "string" && fix === now) { no(`'고칠 글' 이 '지금' 과 같음 — 고칠 것은 '고칠 곳' 에 적힌 다른 칸 · 코드: ${where.slice(0, 80)}`); continue; }
  const arr = asArray(fix);
  const value = arr || fix;
  if (!arr && COMPOSITE.some((r) => r.test(fix))) { no("'고칠 글' 이 여러 칸 · 목록 꼴"); continue; }
  // 여러 칸 표시는 한 파일 안의 여러 칸일 때만 손으로 — '… · 분할본 gh1-007-1.json 같은 칸' 은 파일마다 한 칸(pathsInWhere)
  const multiFile = new Set(pathsInWhere(where).map((t) => t.file)).size > 1;
  if (WHERE_MANUAL.some((r) => r.test(where)) || (MULTI_SLOT.test(where) && !multiFile)) { no(`'고칠 곳' 이 한 칸 바꾸기가 아님: ${where.slice(0, 80)}`); continue; }
  const ids = (f.ids || []).filter((id) => list.has(id));
  let why = null;
  if (ids.length) {
    // 1부: 목록 줄의 file · path · after(지금 판 값)
    for (const id of ids) {
      const e = list.get(id);
      const file = load(e.file);
      if (!file) { why = `파일 없음 ${e.file}`; break; }
      // 배열 고침이면 목록 줄이 가리키는 한 칸(…alternatives[0])이 아니라 배열 전체
      let p = e.path.replace(/\s*\(.*\)\s*$/, "");
      if (arr) p = p.replace(/\[\d+\]$/, "");
      const r = resolve(file.json, p);
      if (r.error) { why = r.error; break; }
      const expect = arr ? ANY : now !== undefined ? now : e.after;
      if (!arr && r.parent[r.key] !== expect) { why = `칸의 지금 글이 판정의 '지금' 과 다름 ${e.file} ${p}`; break; }
      why = propose(f, e.file, r.parent, r.key, p, value, expect);
      if (why) break;
    }
  } else if (fin["파일"] && fin["칸"] && /^\s*[.[]/.test(fin["칸"])) {
    // 곁글(1부 문맥): 판정에 파일 · 칸(JSON 경로 + 괄호 풀이)
    const file = load(fin["파일"]);
    const p = String(fin["칸"]).replace(/\s*\(.*$/s, "").trim();
    if (!file) why = `파일 없음 ${fin["파일"]}`;
    else {
      const r = resolve(file.json, p);
      if (r.error) why = r.error;
      else if (!arr && r.parent[r.key] !== now) why = `칸의 지금 글이 판정의 '지금' 과 다름 ${fin["파일"]} ${p}`;
      else why = propose(f, fin["파일"], r.parent, r.key, p, value, arr ? ANY : now);
    }
  } else if (pathInWhere(where)) {
    // '고칠 곳' 에 파일과 JSON 경로가 적힘(표본 판정 · 전수 읽기) — 분할본 등 여러 파일이면 파일마다 같은 고침
    for (const { file: rel, path: p0 } of pathsInWhere(where)) {
      const file = load(rel);
      if (!file) { why = `파일 없음 ${rel}`; break; }
      let p = p0;
      let r = resolve(file.json, p);
      if (r.error) { why = r.error; break; }
      // 대체 답 배열 고침인데 적힌 칸이 문항(글 · n 이 있는 것)이면 그 문항의 alternatives(없으면 새로)
      if (arr && r.parent[r.key] && typeof r.parent[r.key] === "object" && !Array.isArray(r.parent[r.key]) && typeof r.parent[r.key].text === "string") {
        r = { parent: r.parent[r.key], key: "alternatives" }; p = `${p}.alternatives`;
      }
      // 문항 번호를 적었으면(n=6) 그 칸의 문항이 그 번호인지 — 분할본은 블록 순서가 다를 수 있어 같은 [2].items[5] 가 딴 문항일 수 있음
      if (arr) {
        const nm = String(where).match(/\bn=(\d+)/);
        if (nm && r.parent && r.parent.n !== undefined && String(r.parent.n) !== nm[1]) { why = `${rel} ${p} 의 문항 번호 ${r.parent.n} ≠ 적힌 n=${nm[1]}`; break; }
      }
      // 글 고침인데 적힌 칸이 문장 · 문항이면(.readingSentences[0]) — '지금' 과 같은 글 칸이 그 안에 하나일 때만
      if (!arr && r.parent[r.key] && typeof r.parent[r.key] === "object" && typeof now === "string") {
        const hits = findString(r.parent[r.key], now, p);
        if (hits.length !== 1) { why = `${rel} ${p} 안에 '지금' 과 같은 칸이 ${hits.length}곳`; break; }
        r = { parent: hits[0].parent, key: hits[0].key }; p = hits[0].where;
      }
      const cur = r.parent[r.key];
      // LISTENING 표본 판정은 '지금' 에 칩 모양('[Mrs] [Watson]')을 적고 힌트 줄 전체를 고칠 글로 준다 — 그 칸이 hints 블록일 때만 대조 없이 받음
      const isHints = r.parent && r.parent.type === "hints" && r.key === "text";
      if (!arr && typeof now === "string" && cur === now) why = propose(f, rel, r.parent, r.key, p, value, now);
      else if (arr) why = propose(f, rel, r.parent, r.key, p, value, ANY);
      else if (isHints && typeof now === "string" && /^\s*\[/.test(now)) why = propose(f, rel, r.parent, r.key, p, value, ANY);
      else why = `칸의 지금 글이 판정의 '지금' 과 다름 ${rel} ${p}`;
      if (why) break;
    }
  } else {
    if (typeof now !== "string" || !now) { no("'지금' 글이 없음(칸을 찾을 수 없음)"); continue; }
    const cands = filesFromWhere(`${where} ${fin["파일"] || ""}`, f["쪽"]);
    if (!cands.length) { no(`'고칠 곳' 에서 파일을 못 읽음: ${where.slice(0, 80)}`); continue; }
    // LISTENING 대본(ld_english_scripts.json)은 파일 하나에 276강 — 그 강의(dNNN) 칸 안에서만
    const ldLesson = ((f["쪽"] || "") + " " + where + " " + (fin["까닭"] || "")).match(/\bd(\d{3})\b/);
    let found = 0;
    for (const c of cands) {
      const file = load(c);
      if (!file) { why = `파일 없음 ${c}`; break; }
      let scope = file.json, prefix = "";
      if (/ld_english_scripts\.json$/.test(c)) {
        if (!ldLesson) { why = "LISTENING 대본인데 강의 번호를 못 읽음"; break; }
        scope = file.json[`d${ldLesson[1]}`]; prefix = `.d${ldLesson[1]}`;
        if (!scope) { why = `대본에 d${ldLesson[1]} 없음`; break; }
      }
      const hits = findString(scope, now, prefix);
      if (hits.length > 1) { why = `${c} 안에 '지금' 과 같은 칸이 ${hits.length}곳 — 어느 것인지 모름`; break; }
      for (const h of hits) { found++; why = propose(f, c, h.parent, h.key, h.where, value, now); if (why) break; }
      if (why) break;
    }
    // 적힌 파일에 없으면 묶음의 다른 파일(대본 · 짝 · 사전)에서 한 번 더 — 전수 읽기는 '고칠 곳' 이 강의 파일만 말하기도 한다
    if (!why && !found && f["쪽"]) {
      for (const c of groupFiles(f["쪽"]).filter((x) => !cands.includes(x))) {
        const file = load(c);
        if (!file) continue;
        let scope = file.json, prefix = "";
        if (/ld_english_scripts\.json$/.test(c)) { if (!ldLesson) continue; scope = file.json[`d${ldLesson[1]}`]; prefix = `.d${ldLesson[1]}`; if (!scope) continue; }
        if (/voca_dictionary\.json$/.test(c)) { /* 사전은 크다 — 뜻 칸만 */ }
        const hits = findString(scope, now, prefix);
        if (hits.length > 1) { why = `${c} 안에 '지금' 과 같은 칸이 ${hits.length}곳 — 어느 것인지 모름`; break; }
        for (const h of hits) { found++; why = propose(f, c, h.parent, h.key, h.where, value, now); if (why) break; }
        if (why) break;
      }
    }
    if (!why && !found) why = `'지금' 과 같은 칸이 적힌 파일(${cands.join(" · ")})에 없음`;
  }
  if (why) no(why);
}

// ---------------------------------------------------------------- 2단계: 칸마다 — 새 값이 하나로 모이고 지금 글이 맞을 때만. 한 판정의 칸 하나라도 안 되면 그 판정 전부 안 함
const slotOk = (s) => {
  const vals = new Set(s.props.map((p) => JSON.stringify(p.value)));
  if (vals.size > 1) return "같은 칸에 서로 다른 고칠 글";
  const bad = s.props.find((p) => p.expectOld !== ANY && !same(s.before, p.expectOld));
  if (bad) return "칸의 지금 글이 판정과 다름";
  if (!load(s.file).roundtrip) return `${s.file} 는 읽고 다시 쓰면 서식이 달라짐 — 글자로 직접 고칠 것`;
  return null;
};
// 칸이 안 되면 그 칸을 제안한 판정 모두 손으로 → 그 판정들의 다른 칸도 → … 더 바뀌지 않을 때까지(반만 고친 판정이 없게)
for (;;) {
  let changed = false;
  for (const s of slots.values()) {
    const live = s.props.filter((p) => !manual.has(p.uid));
    if (!live.length) continue;
    let why = slotOk(s);
    if (!why && live.length !== s.props.length) why = "같은 칸을 고치는 다른 판정이 손으로 남음";
    if (why) { for (const p of live) manual.set(p.uid, `${why} (${s.file} ${s.where})`); changed = true; }
  }
  if (!changed) break;
}
let slotsChanged = 0;
for (const s of slots.values()) {
  const live = s.props.filter((p) => !manual.has(p.uid));
  if (!live.length || live.length !== s.props.length) continue;
  const v = live[0].value;
  if (same(s.before, v)) continue;
  s.parent[s.key] = Array.isArray(v) ? [...v] : v;
  load(s.file).dirty = true;
  slotsChanged++;
}
for (const f of table) {
  if (ONLY && !ONLY.has(uid(f))) continue;
  if (SKIP.has(uid(f))) continue;
  const u = uid(f);
  if (manual.has(u)) { say(f, "손으로", manual.get(u)); continue; }
  const ks = findingSlots.get(u) || [];
  say(f, "적용", "", { 칸: ks, 옛글: ks.length ? slots.get(ks[0]).before : undefined });
}

// ---------------------------------------------------------------- 같은 강의 묶음의 사본에 옛 글이 남았나
// 본문 · 분할본(-1 · -2 …)이 같은 글을 따로 들고 있다(예: READING pr004 · pr004-1). 판정이 한 파일만 적었으면 사본에 옛 글이 남는다 —
// 바꾸지 않고 목록으로(사본도 같이 고칠지는 사람이 봄).
const leftovers = [];
for (const p of plan.filter((x) => x.status === "적용" && typeof x.옛글 === "string")) {
  const touched = new Set(p.칸.map((c) => c.split(" ")[0]));
  for (const rel of touched) {
    const dir = path.posix.dirname(rel);
    const base = path.posix.basename(rel, ".json").replace(/-\d+$/, "");
    let names = [];
    try { names = fs.readdirSync(path.join(ROOT, dir)).filter((n) => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(-\\d+)?\\.json$`).test(n)); } catch {}
    for (const n of names) {
      const sib = `${dir}/${n}`;
      if (touched.has(sib)) continue;
      const e = load(sib);
      if (!e) continue;
      const hits = findString(e.json, p.옛글);
      for (const h of hits) leftovers.push({ uid: p.uid, file: sib, where: h.where, 옛글: String(p.옛글).slice(0, 80) });
    }
  }
}

// ---------------------------------------------------------------- 쓰기 · 되읽어 확인
let wrote = 0;
if (WRITE) {
  for (const e of files.values()) {
    if (!e || !e.dirty) continue;
    const out = serialize(e);
    fs.writeFileSync(path.join(ROOT, e.rel), out);
    const back = JSON.parse(fs.readFileSync(path.join(ROOT, e.rel), "utf8").replace(/^﻿/, ""));
    if (JSON.stringify(back) !== JSON.stringify(e.json)) { console.error(`STOP: 되읽은 ${e.rel} 가 쓴 것과 다름`); process.exit(1); }
    wrote++;
  }
}
const count = {};
for (const p of plan) count[p.status] = (count[p.status] || 0) + 1;
const manualWhy = {};
for (const p of plan.filter((x) => x.status === "손으로")) { const k = p.why.replace(/content\/\S+/g, "…").replace(/\d+곳/g, "N곳").slice(0, 70); manualWhy[k] = (manualWhy[k] || 0) + 1; }
console.log(`표에 오름 ${table.length} · ${JSON.stringify(count)} · 바뀐 칸 ${slotsChanged} · 바뀐 파일 ${[...files.values()].filter((e) => e && e.dirty).length}${WRITE ? ` (씀 ${wrote})` : " (미리 보기 — 안 씀)"} · 새 클립 표시 ${plan.filter((p) => p.status === "적용" && p.새클립).length}`);
for (const [k, v] of Object.entries(manualWhy).sort((a, b) => b[1] - a[1])) console.log(`   손으로 ${String(v).padStart(4)}  ${k}`);
console.log(`같은 강의 묶음의 사본에 옛 글이 남은 곳 ${leftovers.length}${leftovers.length ? " — " + leftovers.slice(0, 8).map((l) => `${l.uid} ${l.file}${l.where}`).join(" · ") + (leftovers.length > 8 ? " …" : "") : ""}`);
if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ref: REF, verdicts: VERDICTS, root: ROOT, write: WRITE, count, plan, leftovers }, null, 1));
