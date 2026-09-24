/**
 * 학습 내용 재검토 — 도구들이 같이 쓰는 것.
 *  - 두 판(기준 9d6e15d · 지금 2a80bba)의 파일을 git cat-file --batch 로 읽기
 *  - 감사 도구 expectations.cjs 를 **이 작업 트리**로 불러오기: 그 도구가 부르는 docs/qa-2026-09-15/scripts/tsload.cjs 는
 *    REPO 가 본 저장소 경로로 박혀 있어(옆 세션이 쓰는 작업 트리) 그대로 부르면 이 작업 트리가 아닌 곳의 글을 읽는다.
 *    tsload.cjs 의 글을 읽어 REPO 한 줄만 이 작업 트리로 바꿔 require 캐시에 넣는다 — 다른 줄은 한 글자도 안 바꿈.
 *  - 목록 한 줄의 경로(.blocks[3].items[n=5].text · [was 2] …)를 풀기
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { spawnSync } = require("child_process");

// 고친 것 다시 읽기(2026-09-25)를 위해 바꿔 끼울 수 있게: KIG_WT = 화면 코드 · 감사 도구를 불러올 폴더(고친 판을 풀어 둔 곳),
// KIG_SUB = 결과 폴더(내용-재검토/<KIG_SUB>), KIG_BASE · KIG_HEAD = 견줄 두 판. 없으면 내용 재검토 그대로(9d6e15d ↔ 2a80bba).
const GIT_CWD = path.resolve(__dirname, "../../../..");
const WT = process.env.KIG_WT ? path.resolve(process.env.KIG_WT) : GIT_CWD;
const DIR = process.env.KIG_SUB ? path.resolve(__dirname, "..", process.env.KIG_SUB) : path.resolve(__dirname, "..");
const revParse = (r) => spawnSync("git", ["rev-parse", r], { cwd: GIT_CWD }).stdout.toString().trim();
const BASE = process.env.KIG_BASE ? revParse(process.env.KIG_BASE) : "9d6e15d748fc4a16832b26643a3c2f7e5614612d";
const HEAD = process.env.KIG_HEAD ? revParse(process.env.KIG_HEAD) : "2a80bbaa087acda2570cb15cb24f6d0ff9285a00";

function git(argv, input) {
  const r = spawnSync("git", argv, { cwd: GIT_CWD, input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`git ${argv.join(" ")} 실패: ${r.stderr}`);
  return r.stdout;
}

/** rev:path 여럿을 한 번에 — 없는 파일은 null */
function catFiles(specs) {
  if (!specs.length) return [];
  const buf = git(["cat-file", "--batch"], specs.join("\n") + "\n");
  const out = [];
  let pos = 0;
  for (const spec of specs) {
    const nl = buf.indexOf(10, pos);
    const header = buf.slice(pos, nl).toString();
    if (/ missing$/.test(header)) { out.push(null); pos = nl + 1; continue; }
    const size = Number(header.split(" ")[2]);
    out.push(buf.slice(nl + 1, nl + 1 + size).toString("utf8").replace(/^﻿/, ""));
    pos = nl + 1 + size + 1;
  }
  return out;
}

const jsonCache = new Map();
/** 여러 파일의 두 판 JSON 을 한 번에 읽어 캐시 */
function preloadJson(files) {
  const need = [];
  for (const f of files) for (const rev of [BASE, HEAD]) { const k = `${rev}:${f}`; if (!jsonCache.has(k)) need.push(k); }
  const got = catFiles(need);
  need.forEach((k, i) => jsonCache.set(k, got[i] == null ? undefined : (k.endsWith(".json") ? JSON.parse(got[i]) : got[i])));
}
function jsonAt(rev, file) {
  const k = `${rev}:${file}`;
  if (!jsonCache.has(k)) preloadJson([file]);
  return jsonCache.get(k);
}

/** expectations.cjs 를 이 작업 트리 기준으로 */
let _E = null;
function loadExpectations() {
  if (_E) return _E;
  const tsloadPath = path.join(WT, "docs/qa-2026-09-15/scripts/tsload.cjs");
  const src = fs.readFileSync(tsloadPath, "utf8");
  const line = /const REPO = "[^"]+";/;
  if (!line.test(src)) throw new Error("tsload.cjs 의 REPO 줄 모양이 바뀜 — 이 도구를 다시 볼 것");
  const patched = src.replace(line, `const REPO = ${JSON.stringify(WT.replace(/\\/g, "/"))};`);
  const m = new Module(tsloadPath, module);
  m.filename = tsloadPath;
  m.paths = Module._nodeModulePaths(path.dirname(tsloadPath));
  m._compile(patched, tsloadPath);
  m.loaded = true;
  require.cache[tsloadPath] = m;
  if (m.exports.REPO.replace(/\\/g, "/") !== WT.replace(/\\/g, "/")) throw new Error("REPO 바꾸기 실패");
  _E = require(path.join(WT, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
  return _E;
}
function loadTsModule(rel) {
  loadExpectations();
  const { loadTs } = require(path.join(WT, "docs/qa-2026-09-15/scripts/tsload.cjs"));
  return loadTs(path.join(WT, rel));
}

/** 경로 → 토큰 */
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

const readJsonl = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const cleanItemText = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();

/** 고정 씨앗 난수(mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 글자열 → 0..1 (확인 표본을 id 로 고르는 데 씀 — 씨앗 고정) */
function hash01(s, salt = "") {
  let h = 2166136261 >>> 0;
  for (const ch of salt + s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h / 4294967296;
}

module.exports = { WT, DIR, BASE, HEAD, git, catFiles, preloadJson, jsonAt, loadExpectations, loadTsModule, parsePath, readJsonl, clean, cleanItemText, rng, hash01 };
