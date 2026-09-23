#!/usr/bin/env node
/**
 * student-original-exceptions.json 초안 — check-student-original 이 찾는 '원본과 다른 곳' 마다, 그 글을 들인 커밋과
 * 그 커밋의 근거(9/17 감사 apply-student*.cjs 의 S-항목 · 6단계/되살리기 계획 파일의 항목)를 찾아 이유(why)로 적는다.
 * 사람이 읽고 고칠 초안이다 — 이유를 찾지 못한 줄은 why 가 '근거 못 찾음' 으로 남아 눈에 띈다.
 *
 *   node student-original-exceptions-draft.mjs            # 보임
 *   node student-original-exceptions-draft.mjs --write    # 예외 파일에 씀(기존 파일의 사람이 고친 why 는 같은 줄이면 남김)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { compareLesson, sentencesOf, koParasOf, sim } from "./lib/student-original.mjs";

const REPO = path.resolve(import.meta.dirname, "../../..");
const ARCH = process.env.KIG_ARCHIVE || "C:/Users/ghddl/Desktop/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01";
const EXC_FILE = path.join(REPO, "docs/qa-2026-09-18/student-original-exceptions.json");
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });
const esc = (s) => JSON.stringify(s).slice(1, -1);

// 9/17 감사 고침(apply-student.cjs): S(id, n, 원래 영어, 고친 영어) · sub([ids], 조각, 고친 조각) 줄 → 바로 위의 머리('// ==== High — facts (S-01…)' · '// S-32 notation')
const s917 = [];
{
  const f = "docs/qa-2026-09-17/scripts/apply-student.cjs";
  let head = "";
  const lits = (line) => [...line.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
  for (const line of fs.readFileSync(path.join(REPO, f), "utf8").split(/\r?\n/)) {
    const sec = line.match(/^\s*\/\/\s*=+\s*(.+)$/); if (sec) { head = sec[1].trim(); continue; }
    const sh = line.match(/^\s*\/\/\s*(S-\d+.*)$/); if (sh) { head = sh[1].trim(); continue; }
    if (/^\s*S\(/.test(line)) { const l = lits(line); s917.push({ head, kind: "S", id: l[0], from: l[1], to: l[2] }); }
    else if (/^\s*sub\(/.test(line)) { const inner = line.replace(/^\s*sub\(\s*\[[^\]]*\]\s*,/, ""); const l = lits(inner); const ids = lits(line.match(/\[[^\]]*\]/)?.[0] || ""); s917.push({ head, kind: "sub", ids, from: l[0], to: l[1] }); }
  }
}
// 계획 파일(6단계 · 4·5단계 · 되살리기)
const plans = [];
for (const dir of ["docs/qa-2026-09-18/scripts/plans"]) {
  for (const f of fs.readdirSync(path.join(REPO, dir)).filter((x) => x.endsWith(".json"))) {
    let arr; try { arr = JSON.parse(fs.readFileSync(path.join(REPO, dir, f), "utf8")); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const p of arr) if (p && typeof p.to === "string" && (p.files || []).some((x) => /content\/lessons\/student\//.test(x))) {
      const val = (s) => (p.raw ? s.replace(/^"text": "/, "").replace(/"$/, "") : esc(s));
      plans.push({ file: f, item: p.item + (p.movedTo ? ` (되살리기로 ${p.movedTo} 로 옮김)` : ""), to: val(p.to), from: val(p.from), dead: !!p.revertedBy || (!!p.supersededBy && !p.movedTo) });
    }
  }
}
const firstCommit = (text) => {
  try { return git("log", "--format=%h|%ad|%s", "--date=format:%m-%d", "--reverse", "-S", esc(text), "--", "content/lessons/student").trim().split(/\r?\n/)[0] || ""; } catch { return ""; }
};
const lastCommit = (text) => {
  try { return git("log", "--format=%h|%ad|%s", "--date=format:%m-%d", "-S", esc(text), "--", "content/lessons/student").trim().split(/\r?\n/)[0] || ""; } catch { return ""; }
};
const planFor = (text, useFrom = false) => {
  const e = esc(text);
  const hits = plans.filter((p) => !p.dead && (useFrom ? e.includes(p.from) || p.from.includes(e) : e.includes(p.to)) && (useFrom ? p.from : p.to).length >= 6);
  hits.sort((a, b) => (useFrom ? b.from.length - a.from.length : b.to.length - a.to.length));
  return hits[0] || null;
};
/** 9/17 감사의 어느 줄이 이 차이를 만들었나 — S() 는 고친 영어(또는 원래 영어)가 같으면, sub() 는 원본에 조각이 있고 지금에 고친 조각이 있으면 */
const s917For = (id, current, original) => {
  const k = (s) => String(s || "").replace(/[’‘]/g, "'").trim();
  const hits = s917.filter((x) => x.kind === "S"
    ? x.id === id && (k(x.to) === k(current) || (original && k(x.from) === k(original)) || (current && k(x.from) === k(current)))
    : x.ids.includes(id) && original && k(original).includes(k(x.from)) && k(current).includes(k(x.to)));
  return hits.length ? [...new Set(hits.map((h) => h.head))].join(" · ") : null;
};

const L = path.join(REPO, "content/lessons/student");
const ids = fs.readdirSync(L).filter((f) => /^s\d+-\d+\.json$/.test(f)).map((f) => f.replace(".json", ""))
  .sort((a, b) => { const p = (s) => s.match(/\d+/g).map(Number); const [a1, a2] = p(a), [b1, b2] = p(b); return a1 - b1 || a2 - b2; });
const old = fs.existsSync(EXC_FILE) ? JSON.parse(fs.readFileSync(EXC_FILE, "utf8")) : [];
const out = [];
for (const id of ids) {
  const d = JSON.parse(fs.readFileSync(path.join(L, `${id}.json`), "utf8"));
  const r = compareLesson(ARCH, id, sentencesOf(d), koParasOf(d));
  for (const x of r.diffs) {
    const row = { lesson: id, kind: x.kind, text: x.text };
    if (x.original && x.kind !== "짝") row.original = x.original;
    const kept = old.find((o) => o.lesson === id && o.kind === x.kind && o.text === x.text && o.why && !/근거 못 찾음/.test(o.why));
    if (kept) { row.why = kept.why; if (kept.original && x.kind === "더함") row.original = kept.original; out.push(row); continue; }
    let why = "";
    if (x.kind === "빠짐") {
      const c = lastCommit(x.text); const s = s917For(id, null, x.text); const p = planFor(x.text, true);
      why = `원본 문장이 사라짐 — ${c ? `커밋 ${c.split("|")[0]} (${c.split("|")[1]}) ${c.split("|")[2].slice(0, 60)}` : "첫 추출부터 없음"}${s ? ` · 9/17 감사 ${s}` : ""}${p ? ` · 계획 ${p.file} '${p.item}'` : ""}`;
    } else if (x.kind === "원본 없음") {
      why = x.why0;
    } else if (x.kind === "차례") {
      why = `차례 ${x.order} — 근거 못 찾음`;
    } else {
      if (x.kind === "더함") { // 원본 swf 에 따로 있는 줄(소개 문장 등)이면 그 줄을 original 로
        let best = null, bv = 0; for (const l of r.lines) { const v = sim(x.text, l); if (v > bv) { bv = v; best = l; } }
        if (best && bv >= 0.4) row.original = best;
      }
      const c = firstCommit(x.text); const p = planFor(x.text); const s = s917For(id, x.text, row.original);
      const src = c ? `커밋 ${c.split("|")[0]} (${c.split("|")[1]}) ${c.split("|")[2].slice(0, 60)}` : "아직 커밋 전(작업 트리)";
      const basis = p ? `계획 ${p.file} '${p.item}'` : s ? `9/17 감사 ${s}` : "";
      why = `${src}${basis ? ` · ${basis}` : " · 근거 못 찾음"}`;
    }
    row.why = why; out.push(row);
  }
}
if (process.argv.includes("--write")) { fs.writeFileSync(EXC_FILE, JSON.stringify(out, null, 1) + "\n"); console.log(`예외 ${out.length}줄 씀 → ${path.relative(REPO, EXC_FILE)}`); }
const noBasis = out.filter((o) => /근거 못 찾음/.test(o.why));
console.log(`예외 초안 ${out.length} · 근거 못 찾음 ${noBasis.length}`);
for (const o of out) console.log(`${o.lesson} ${o.kind}: ${(o.text || "").slice(0, 70)}\n     ${o.original ? `원본: ${o.original.slice(0, 70)}\n     ` : ""}이유: ${o.why}`);
