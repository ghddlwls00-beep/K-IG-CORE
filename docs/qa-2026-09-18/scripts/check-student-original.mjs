#!/usr/bin/env node
/**
 * STUDENT 글이 원본 교재와 같은지 — 원본과 다른 곳은 모두 기록된 예외(docs/qa-2026-09-18/student-original-exceptions.json)에 있어야 한다.
 * 생긴 까닭: 9/7 커밋 08b77af 가 STUDENT 14과의 글을 원본이 아닌 글로 바꾸고 한 과의 문장을 뺐는데 2주 동안 어떤 검사도 못 잡음
 * (소유자가 휴대폰에서 찾음, 2026-09-23 — 기록 docs/qa-2026-09-18/STUDENT-원본-되살리기.md).
 *
 * 원본 = 바탕화면 아카이브 Student/<id>.swf(읽기만, KIG_ARCHIVE 로 바꿀 수 있음) — 그 사본이 망가졌거나 없으면(s10-4 · s10-5 망가짐, s19-3 없음)
 * 같은 판의 '학생용 Lab v1.01/Files' 사본(lib/swf-stage.mjs studentSwf). swf 를 '화면에 놓인 대로' 읽음 —
 * 과마다 원본의 '영어 전체 글'(원본 차례) · '문장 단추'(영어 ↔ 한국어 짝). 견주는 규칙은 lib/student-original.mjs 머리말.
 * 예외 한 줄 = { lesson, kind(고침 · 바꿈 · 더함 · 빠짐 · 차례 · 짝 · 한국어 · 원본 없음), text, original?, why } — kind · text 가 글자까지 같아야 맞음.
 *   고침 · 바꿈: original 도 지금 원본 글과 같아야 함 · 더함에 original 이 있으면 그 글이 원본 swf 어딘가에 있어야 함.
 *   한국어(7단계 7-1 j): 영어와 한 단추에 묶인 원본 한국어와 띄어쓰기 · 문장부호를 뺀 글자가 다른 한국어 문단 — text 는 지금 한국어,
 *   original 은 그 원본 한국어(글자가 같아야 함). 전에는 한국어를 '어느 영어의 번역인지(짝)' 만 봤다.
 * 예외 목록에 있는데 지금 일어나지 않는 줄은 '낡은 예외' — 이것도 실패(목록이 실제와 어긋남).
 *
 *   node check-student-original.mjs                 # 어긋나면 exit 1
 *   node check-student-original.mjs --list          # 예외로 설명된 것까지 모두 보임
 *   node check-student-original.mjs --break=swap    # 일부러 깨기(메모리에서만): s1-4 ↔ s1-6 글 바꿈 — 실패해야 함
 *                                   --break=order   #   s8-2 의 1 · 2번 문장 차례 바꿈
 *                                   --break=drop    #   s3-2 의 마지막 문장 뺌
 *                                   --break=pair    #   s9-1 의 1 · 2번 한국어 문단 바꿈
 *                                   --break=edit    #   s4-6 의 3번 문장 한 낱말 바꿈
 *                                   --break=ko      #   s1-4 의 1번 한국어 문단에 한 낱말 더함(7-1 j)
 */
import fs from "node:fs";
import path from "node:path";
import { compareLesson, sentencesOf, koParasOf, key, koKey } from "./lib/student-original.mjs";

const REPO = path.resolve(import.meta.dirname, "../../..");
const ARCH = process.env.KIG_ARCHIVE || "C:/Users/ghddl/Desktop/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01";
const EXC_FILE = process.env.KIG_STUDENT_EXC || path.join(REPO, "docs/qa-2026-09-18/student-original-exceptions.json"); // 다른 목록으로 '낡은 예외' 깨기 시험
const LIST = process.argv.includes("--list");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (!fs.existsSync(path.join(ARCH, "Student"))) { console.log(`원본 아카이브 없음: ${ARCH}/Student — 검사할 수 없음(exit 2)`); process.exit(2); }

const L = path.join(REPO, "content/lessons/student");
const ids = fs.readdirSync(L).filter((f) => /^s\d+-\d+\.json$/.test(f)).map((f) => f.replace(".json", ""))
  .sort((a, b) => { const p = (s) => s.match(/\d+/g).map(Number); const [a1, a2] = p(a), [b1, b2] = p(b); return a1 - b1 || a2 - b2; });
const data = Object.fromEntries(ids.map((id) => { const d = JSON.parse(fs.readFileSync(path.join(L, `${id}.json`), "utf8")); return [id, { en: sentencesOf(d), ko: koParasOf(d) }]; }));

const breaks = {
  swap: () => { const t = data["s1-4"]; data["s1-4"] = data["s1-6"]; data["s1-6"] = t; },
  order: () => { const d = data["s8-2"]; [d.en[0], d.en[1]] = [d.en[1], d.en[0]]; [d.ko[0], d.ko[1]] = [d.ko[1], d.ko[0]]; },
  drop: () => { const d = data["s3-2"]; d.en.pop(); d.ko.pop(); },
  pair: () => { const d = data["s9-1"]; [d.ko[0], d.ko[1]] = [d.ko[1], d.ko[0]]; },
  edit: () => { const d = data["s4-6"]; d.en[2] = d.en[2].replace(/\b(\w{4,})\b/, "banana"); },
  ko: () => { const d = data["s1-4"]; d.ko[0] = `${d.ko[0]} 정말로`; },
};
if (BREAK) { if (!breaks[BREAK]) { console.log(`--break 는 ${Object.keys(breaks).join(" · ")} 중 하나`); process.exit(2); } breaks[BREAK](); console.log(`[일부러 깨기: ${BREAK}] 메모리에서만 바꿈 — 실패해야 맞음`); }

const exceptions = JSON.parse(fs.readFileSync(EXC_FILE, "utf8"));
const ek = (lesson, kind, text) => `${lesson}\u0000${kind}\u0000${String(text).trim()}`;
const byKey = new Map(); for (const e of exceptions) byKey.set(ek(e.lesson, e.kind, e.text), e);

let total = 0, same = 0, explained = 0, koTotal = 0, koSame = 0; const bad = [], used = new Set(), counts = {}, altCopy = [];
for (const id of ids) {
  const { en, ko } = data[id];
  total += en.length;
  const r = compareLesson(ARCH, id, en, ko);
  same += r.same;
  koTotal += r.koTotal || 0; koSame += r.koSame || 0;
  if (r.copy && r.copy !== "본사") altCopy.push(`${id} ${r.copy}`);
  for (const d of r.diffs) {
    counts[d.kind] = (counts[d.kind] || 0) + 1;
    const e = byKey.get(ek(id, d.kind, d.text));
    let why = null;
    if (!e) why = "예외 목록에 없음";
    else if ((d.kind === "고침" || d.kind === "바꿈") && key(e.original || "") !== key(d.original)) why = `예외의 원본 글이 지금 원본과 다름(예외: ${e.original})`;
    else if (d.kind === "한국어" && koKey(e.original || "") !== koKey(d.original)) why = `예외의 원본 한국어가 지금 원본과 다름(예외: ${e.original})`;
    else if (d.kind === "더함" && e.original && !r.lines.some((l) => key(l).includes(key(e.original)))) why = `예외가 말한 원본 줄이 swf 에 없음(${e.original})`;
    if (why) { bad.push(`${id} ${d.kind}${d.at ? ` #${d.at}` : ""}: ${d.text || d.order || ""}${d.original ? `\n        원본: ${d.original}` : ""}${d.closer ? `\n        더 닮은 원본 한국어: ${d.closer}` : ""}\n        → ${why}`); continue; }
    explained++; used.add(ek(id, d.kind, d.text));
    if (LIST) console.log(`  예외 ${id} ${d.kind}${d.at ? ` #${d.at}` : ""}: ${(d.text || "").slice(0, 80)}  — ${e.why}`);
  }
}
const stale = exceptions.filter((e) => !used.has(ek(e.lesson, e.kind, e.text)));
console.log(`STUDENT ${ids.length}과 · 영어 문장 ${total} · 원본과 글자까지 같음 ${same} · 한국어 문단 ${koTotal} 중 원본과 같음 ${koSame}(띄어쓰기 · 문장부호 무시) · 원본과 다른 곳 ${Object.values(counts).reduce((a, b) => a + b, 0)} (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")})`);
console.log(`  기록된 예외로 설명됨 ${explained} · 설명 없음 ${bad.length} · 낡은 예외 ${stale.length} (예외 목록 ${exceptions.length}줄)`);
if (altCopy.length) console.log(`  다른 사본으로 읽은 과 ${altCopy.length}: ${altCopy.join(" · ")}`);
for (const b of bad.slice(0, 30)) console.log(`  설명 없음 ${b}`);
if (bad.length > 30) console.log(`  … 설명 없음 ${bad.length - 30} 더`);
for (const s of stale.slice(0, 20)) console.log(`  낡은 예외 ${s.lesson} ${s.kind}: ${s.text}`);
process.exit(bad.length || stale.length ? 1 : 0);
