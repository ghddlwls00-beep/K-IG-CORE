#!/usr/bin/env node
/**
 * replace-in-lessons.cjs 로 적용한 계획 파일이 **지금 파일에 정말 들어가 있는지** 센다 — 적용한 AI 의 보고를 믿지 않고
 * 다시 세기 위한 것. 계획의 한 줄 { item, files, from, to, expect } 마다:
 *   to   가 그 파일들에 expect 번 이상 있어야 하고,
 *   from 은 0번이어야 한다 (to 가 from 을 품고 있으면 from 은 세지 않음).
 * 하나라도 어긋나면 exit 1.
 *
 * 뒤에 다시 고친 줄 (7단계 7-1 d — 전에는 "supersededBy" 줄에서 from 0 만 보고, to 가 from 을 품으면 아무것도 세지 않아
 * 어느 판에서도 통과했다: 3차 점검 #4 지적 factual-ld-c #22 · d245 hints, 6단계 LISTENING 20줄을 점검 세션이 손으로 따라감):
 *   - "supersededBy": "<계획 이름>[.json][ 설명]" 이 계획 폴더의 계획이면 그 계획에서 이 줄의 to 를 다시 고친 줄을 찾아 **사슬 끝까지**
 *     따라가고(뒤 줄의 from 이 to 안에 있으면 그 자리만 바꾸고, to 가 뒤 줄 from 안에 있으면 뒤 줄 to 로, 둘이 5글자 이상
 *     걸쳐 겹치면 겹친 만큼 이어 붙여서), 끝 글이 지금 파일에 있어야 한다. 뒤 계획이 GRAMMAR 문항 꼴({file, n, text: {from, to}})이어도 따라간다.
 *   - 계획이 아닌 것이 다시 고친 줄(커밋 · 스크립트 · 원본 되살리기 · 드릴 지우기)은 그 줄에 적어 둔 것으로 센다:
 *       "nowText": 지금 글 — **파일에 적힌 그대로**(JSON 이스케이프 · 따옴표까지 넣으면 값 하나를 통째로 고정). 글 하나, 글 목록,
 *                  또는 {"text", "n"}(n 곳 이상) 목록. 모두 있어야 한다.
 *       "gone": true — 이 줄이 쓴 글이 지워짐: to 가 0번이어야 한다. "gone": "<표시 글>" — 그 글을 담던 자료가 통째로 지워짐:
 *                  그 표시 글(파일에 적힌 그대로, 예 "\"chunkDrills\"")이 0번이어야 한다(조각 글은 문장 안에 남을 수 있어 to 로 세지 않음).
 *     둘 다 없으면 어긋남 — 적으라는 뜻.
 *   - "movedTo": "<파일>" 이면(원본 되살리기로 글이 다른 과로 옮겨감) 그 파일에서 센다. 뒤를 이은 것이 계획이 아니고 nowText · gone 도
 *     없으면, 옮겨간 파일에 to 가 expect 번 이상 그대로 있어야 한다(옮기기만 하고 고치지 않음).
 * "revertedBy": 소유자 결정으로 일부러 되돌린 줄 — 세지 않고 따로 적는다.
 * 센 계획이 0개면 exit 1 (7-1 h — 계획 파일을 안 넘기면 '0개 · 0줄 · 어긋남 0' 으로 통과하던 것).
 *
 *   node verify-applied-plans.cjs plans/stage6-factual-reading-c.json [다른 계획 …]
 *   node verify-applied-plans.cjs plans/….json --rev f35e8be            일부러 깨기: 고치기 전 판으로 세면 어긋나야 한다('--rev HEAD' 는 고친 것이 커밋된 뒤 가짜, 7-1 n)
 *   node verify-applied-plans.cjs plans/….json --plans-dir <폴더>     사슬을 따라갈 계획 폴더(기본: 이 도구 옆 plans/)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const REV = opt("--rev");
const PLANS_DIR = path.resolve(opt("--plans-dir") || path.join(__dirname, "plans"));
const valueFlags = new Set(["--rev", "--plans-dir"]);
const plans = args.filter((a, i) => !a.startsWith("--") && !valueFlags.has(args[i - 1]));
const esc = (s) => JSON.stringify(s).slice(1, -1);
const cache = new Map();
function text(f) {
  if (!cache.has(f)) {
    let t = "";
    try {
      t = REV
        ? execFileSync("git", ["show", `${REV}:${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] })
        : fs.readFileSync(path.join(REPO, f), "utf8");
    } catch { t = ""; }
    cache.set(f, t);
  }
  return cache.get(f);
}
const count = (files, s) => files.reduce((n, f) => n + text(f).split(s).length - 1, 0);
const isReplacePlan = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.from === "string" && typeof l.to === "string" && Array.isArray(l.files));

// 사슬을 따라갈 때 쓰는 계획들(이름 → 줄들, 바꾸기 꼴로 맞춤)
const planCache = new Map();
function successorLines(name) {
  if (planCache.has(name)) return planCache.get(name);
  const file = path.join(PLANS_DIR, `${name}.json`);
  let lines = null;
  if (fs.existsSync(file)) {
    try {
      const a = JSON.parse(fs.readFileSync(file, "utf8"));
      if (isReplacePlan(a)) lines = a;
      else if (Array.isArray(a) && a.every((l) => l && l.text && typeof l.file === "string")) {
        // GRAMMAR 문항 꼴 — 파일 하나 · 글(따옴표 이스케이프는 바꾸기 꼴처럼)
        lines = a.map((l) => ({ ...l, files: [l.file], from: l.text.from, to: l.text.to }));
      }
    } catch { lines = null; }
  }
  planCache.set(name, lines);
  return lines;
}
const nameOf = (supersededBy) => String(supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
const filesOf = (l) => (l.movedTo ? [l.movedTo] : l.files);
const raw = (l, s) => (l.raw ? s : esc(s));

/** 지금 글 cur 에 뒤 줄(from → to)을 입힘. 걸치지 않으면 null */
const MIN_OVERLAP = 5;
function applyStep(cur, from, to) {
  if (cur.includes(from)) return cur.split(from).join(to);
  if (from.includes(cur)) return to;
  for (let k = Math.min(cur.length, from.length) - 1; k >= MIN_OVERLAP; k--) {
    if (cur.endsWith(from.slice(0, k))) return cur.slice(0, cur.length - k) + to; // cur 꼬리 = from 머리
    if (from.endsWith(cur.slice(0, k))) return to + cur.slice(k); // from 꼬리 = cur 머리
  }
  return null;
}
/** 줄에 적어 둔 사슬 끝(nowText · gone). 없으면 null */
function writtenEnd(l, via) {
  if (l.nowText !== undefined) {
    const checks = [].concat(l.nowText).map((x) => (typeof x === "string" ? { text: x, n: 1 } : x));
    return { checks, files: filesOf(l), via: [...via, "지금 글"] };
  }
  if (l.gone) return { gone: typeof l.gone === "string" ? l.gone : raw(l, l.to), marker: typeof l.gone === "string", files: filesOf(l), via: [...via, "지움"] };
  return null;
}
/** 뒤에 고친 줄을 따라가 지금 있어야 할 것. { checks: [{text, n}], files, via } · { gone, marker, files, via } · { problem } */
function chainEnd(line) {
  let cur = raw(line, line.to), files = filesOf(line);
  const via = [];
  let l = line;
  for (let hop = 0; hop < 20; hop++) {
    const w = writtenEnd(l, via);
    if (w) return w;
    if (!l.supersededBy) return { checks: [{ text: cur, n: 1 }], files, via };
    const name = nameOf(l.supersededBy);
    const succ = successorLines(name);
    if (!succ) {
      if (l.movedTo && l === line) return { checks: [{ text: cur, n: l.expect ?? 1 }], files, via: ["옮겨감"] };
      return { problem: `뒤를 이은 '${name}' 은 따라갈 계획이 아님 — 그 줄에 nowText(지금 글) 또는 gone 을 적어야 함` };
    }
    const hits = [];
    for (const s of succ) {
      if (!filesOf(s).some((f) => files.includes(f))) continue;
      const t = applyStep(cur, raw(s, s.from), raw(s, s.to));
      if (t !== null) { cur = t; hits.push(s); }
    }
    if (!hits.length) return { problem: `뒤 계획 '${name}' 에서 이 글을 다시 고친 줄을 못 찾음(사슬 끊김)` };
    via.push(name);
    l = hits[hits.length - 1]; // 여러 줄이 걸치면 마지막 줄의 뒤를 따라감
    files = filesOf(l);
  }
  return { problem: "사슬이 20 단계를 넘음" };
}

let lines = 0, bad = 0, reverted = 0, chained = 0, counted = 0;
for (const p of plans) {
  const plan = JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
  if (!isReplacePlan(plan)) {
    console.log(`${path.basename(p)}: 바꾸기 계획 파일이 아님 — 건너뜀`);
    continue;
  }
  counted++;
  let pb = 0;
  for (const l of plan) {
    lines++;
    if (l.revertedBy) { reverted++; continue; }
    const from = raw(l, l.from), to = raw(l, l.to);
    const files = filesOf(l);
    const fromFiles = [...new Set([...l.files, ...files])];
    const nFrom = to.includes(from) ? 0 : count(fromFiles, from);
    let ok, why;
    if (l.supersededBy || l.nowText !== undefined || l.gone) {
      chained++;
      const end = chainEnd(l);
      if (end.problem) { ok = false; why = end.problem; }
      else if (end.gone !== undefined) {
        // 자료를 통째로 지운 줄(표시 글)은 from 을 세지 않음 — 조각 글은 남은 문장 안에 있을 수 있음
        const n = count(end.files, end.gone);
        ok = n === 0 && (end.marker || nFrom === 0);
        why = end.marker ? `지운 자료 표시 ${end.gone} ${n}곳(기대 0)` : `지운 글 to ${n}곳(기대 0) · from ${nFrom}곳(기대 0)`;
      } else {
        const got = end.checks.map((c) => ({ ...c, got: count(end.files, c.text) }));
        ok = nFrom === 0 && got.every((c) => c.got >= c.n);
        why = `사슬 끝(${end.via.join(" → ") || "—"}) ` + got.map((c) => `${c.got}곳(기대 ${c.n} 이상)`).join(" · ") + ` · from ${nFrom}곳(기대 0)`;
      }
    } else {
      const nTo = count(files, to);
      ok = nFrom === 0 && nTo >= l.expect;
      why = `to ${nTo}곳(기대 ${l.expect}) · from ${nFrom}곳(기대 0)`;
    }
    if (!ok) { pb++; bad++; console.log(`  어긋남 ${path.basename(p)} #${l.item}: ${why}`); }
  }
  console.log(`${path.basename(p)}: ${plan.length}줄 중 어긋남 ${pb}`);
}
console.log(`${REV ? `[${REV} 기준] ` : ""}계획 ${counted}개 · ${lines}줄 · 어긋남 ${bad} · 뒤에 다시 고친 줄 ${chained}(사슬 끝까지 셈)${reverted ? ` · 되돌린 줄 ${reverted} 은 세지 않음` : ""}`);
if (counted === 0) { console.log("센 계획이 0개 — 계획 파일을 넘겨라(7-1 h). exit 1"); process.exit(1); }
process.exit(bad ? 1 : 0);
