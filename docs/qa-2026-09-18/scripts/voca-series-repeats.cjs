#!/usr/bin/env node
/**
 * VOCA 한 시리즈(mv1 · mv2 · mv3 · hv) 안에서 두 강의 이상에 나오는 낱말 — 보류 G6(6-0829 · 6-0831 · 6-0845) 의 숫자.
 * 낱말은 사전 항목 하나를 같이 쓰므로 뜻은 같다. 되풀이를 복습으로 둘지는 소유자 몫이라 이 도구는 세기만 한다.
 *
 *   node voca-series-repeats.cjs mv1        목록까지
 *   node voca-series-repeats.cjs --all      시리즈마다 한 줄
 *   node voca-series-repeats.cjs --cross mv1 mv2 [11 20]
 *        mv2 칸 중 낱말이 mv1 에도 나오는 칸 (강의 번호 범위를 주면 그 강의만 — 6-0875 는 mv2-11 ~ mv2-20)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/phonics");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

function load(series) {
  return files.filter((f) => f.startsWith(series + "-")).map((f) => {
    const L = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const g = (L.blocks || []).find((b) => b.type === "wordgrid");
    return { id: f.slice(0, -5), words: g ? g.rows.flat().filter(Boolean).map((x) => x.toLowerCase().trim()) : [] };
  });
}

const ci = process.argv.indexOf("--cross");
if (ci > 0) {
  const [a, b, lo, hi] = process.argv.slice(ci + 1);
  const inA = new Set(load(a).flatMap((l) => l.words));
  const num = (id) => Number(id.replace(/^.*-/, ""));
  const B = load(b).filter((l) => !lo || (num(l.id) >= Number(lo) && num(l.id) <= Number(hi)));
  const cells = B.flatMap((l) => l.words);
  const hit = cells.filter((w) => inA.has(w));
  const pct = cells.length ? Math.round((hit.length / cells.length) * 100) : 0;
  console.log(`${b}${lo ? `-${lo}~${hi}` : ""} 강의 ${B.length} · 칸 ${cells.length} 중 ${a} 에도 나오는 낱말 칸 ${hit.length} (${pct}%)`);
  process.exit(0);
}

function count(series) {
  const lessons = load(series);
  const where = {};
  for (const l of lessons) for (const w of new Set(l.words)) (where[w] = where[w] || []).push(l.id);
  const rep = Object.entries(where).filter(([, ls]) => ls.length > 1);
  return {
    lessons: lessons.length,
    cells: lessons.reduce((n, l) => n + l.words.length, 0),
    rep,
    repCells: rep.reduce((n, [, ls]) => n + ls.length, 0),
  };
}

const all = process.argv.includes("--all");
const seriesList = all
  ? [...new Set(files.map((f) => f.replace(/-.*$/, "")))].sort()
  : [process.argv[2] || "mv1"];
for (const s of seriesList) {
  const r = count(s);
  console.log(`${s}: 강의 ${r.lessons} · 칸 ${r.cells} · 두 강의 이상 낱말 ${r.rep.length} · 그 칸 ${r.repCells}`);
  if (!all) for (const [w, ls] of r.rep) console.log(`  ${w}: ${ls.join(" · ")}`);
}
