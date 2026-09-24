#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 이번 재검토가 덮은 양: 과정마다 학습자가 보고 듣는 글(표본과 같은 단위 — sample.cjs unitsOf)을
 * 모든 강의 쪽(주소 1,623)에서 세어, 같은 강의의 같은 글은 한 번만(본문 · 대본 쪽이 같은 문장을 보여 주는 것 · VOCA 는 여러 강의의 같은 낱말) 센다.
 * 그 글을 ① 9/18 뒤 바뀐 글(1부에서 전부 판정) ② 안 바뀐 글 중 표본 86쪽에서 읽은 것(2부) ③ 둘 다 아닌 것(표본으로만 어림)으로 나눈다.
 *   node coverage.cjs
 */
const L = require("./lib.cjs");
const S = require("./sample.cjs");
const Rn = require("./render.cjs");
const E = Rn.E;

const NAMES = { student: "STUDENT", phonics: "VOCA", grammar1: "GRAMMAR I", grammar2: "GRAMMAR II", ld: "LISTENING", reading: "READING" };
const rows = [];
const all = { 쪽: 0, 글: 0, 바뀐: 0, 표본: 0, 남음: 0 };
for (const c of ["student", "phonics", "grammar1", "grammar2", "ld", "reading"]) {
  const sampled = new Set(S.picked[c]);
  const units = new Map(); // key → { changed, sampled }
  const pg = S.pages(c);
  for (const id of pg) {
    const g = S.groupOf(c, id) || c;
    for (const u of S.unitsOf(c, id)) {
      const key = `${g}|${c === "phonics" ? u.kind + "|" : ""}${L.clean(u.text)}`;
      const cur = units.get(key) || { changed: false, sampled: false };
      if (/9\/18 뒤 바뀜/.test(u.line)) cur.changed = true;
      if (sampled.has(id)) cur.sampled = true;
      units.set(key, cur);
    }
  }
  const v = [...units.values()];
  const r = { 과정: NAMES[c], 쪽: pg.length, 글: v.length, 바뀐: v.filter((x) => x.changed).length, 표본: v.filter((x) => !x.changed && x.sampled).length };
  r.남음 = r.글 - r.바뀐 - r.표본;
  r["남음%"] = `${Math.round((r.남음 / r.글) * 100)}%`;
  rows.push(r);
  for (const k of ["쪽", "글", "바뀐", "표본", "남음"]) all[k] += r[k];
}
console.table(rows);
console.log(`합: 쪽 ${all.쪽} · 글 ${all.글} · 바뀐 글(1부 전부 판정) ${all.바뀐} · 안 바뀐 글 중 표본에서 읽음 ${all.표본} · 둘 다 아님 ${all.남음} (${Math.round((all.남음 / all.글) * 100)}%)`);
