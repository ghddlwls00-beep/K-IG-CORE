/**
 * 뜻이 겹치는 낱말(또는 동의어 묶음의 짝)을 오답으로 내보내지 않게 했을 때의 파급 범위.
 * 새로 막히는 쌍이 몇이고, 오답 후보가 3개 미만으로 모자라는 문항이 생기는지.
 * 규칙은 src/lib/vocaUtils.ts 의 sharesSense · SYNONYM_GROUPS 와 같게 옮겨 적었다 (묶음을
 * 바꾸면 여기 GROUPS 도 같이 바꿀 것).
 *
 *   node voca-overlap-pairs.cjs
 *
 * 2026-09-23 4단계 1~20번 작업 중 만들었다 (작업기록 4-5단계-작업기록.md, 기준 4).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));

const strip = (s) => String(s).replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ");
const senses = (m) => strip(m).split(/[;,/·]|\s+또는\s+/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
const overlap = (a, b) => { const A = new Set(senses(a)); return senses(b).some((s) => A.has(s)); };
const GROUPS = [["ancestor", "forefather"], ["anticipate", "predict", "foresee"], ["precious", "priceless"]];
const grouped = (a, b) => GROUPS.some((g) => g.includes(a) && g.includes(b));
const lc = (w) => String(w).toLowerCase().trim();
const mean = (w) => dict[lc(w)]?.meaning || "";

const dir = path.join(REPO, "content/lessons/phonics");
const lessons = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const grid = (data.blocks || []).find((b) => b.type === "wordgrid");
  if (!grid) continue;
  const valid = grid.rows.flat().map((w) => String(w).trim()).filter((w) => w && mean(w));
  if (valid.length) lessons.push({ id: f.replace(/\.json$/, ""), words: valid });
}
console.log(`낱말표가 있는 강의 ${lessons.length} · 낱말 ${lessons.reduce((s, l) => s + l.words.length, 0)}`);

let pairsSame = 0, pairsSeg = 0, pairsGroup = 0;
const newPairs = [];
const thin = [];
for (const L of lessons) {
  for (const w of L.words) {
    const others = L.words.filter((o) => lc(o) !== lc(w));
    const newLeft = others.filter((o) => !overlap(mean(o), mean(w)) && !grouped(lc(o), lc(w)));
    if (newLeft.length < 3) thin.push(`${L.id} ${w} → 남는 오답 ${newLeft.length}`);
    for (const o of others) {
      const same = mean(o) === mean(w);
      const seg = overlap(mean(o), mean(w));
      const grp = grouped(lc(o), lc(w));
      if (same) pairsSame++;
      if (seg) pairsSeg++;
      if (grp && !seg) pairsGroup++;
      if ((seg || grp) && !same && w < o) newPairs.push(`${L.id}  ${w} (${mean(w)})  ×  ${o} (${mean(o)})${grp && !seg ? "  [묶음]" : ""}`);
    }
  }
}
console.log(`\n옛 규칙(문자열 완전 일치)이 막는 쌍 : ${pairsSame / 2}`);
console.log(`뜻 조각 겹침으로 막는 쌍         : ${pairsSeg / 2}`);
console.log(`동의어 묶음으로만 막는 쌍        : ${pairsGroup / 2}`);
console.log(`새로 막히는 쌍 합계              : ${newPairs.length}`);
console.log(`\n오답 후보가 3개 미만이 되는 문항 : ${thin.length}`);
for (const t of thin.slice(0, 20)) console.log(`   ${t}`);
console.log(`\n=== 새로 막히는 쌍 전부`);
for (const p of [...new Set(newPairs)].sort()) console.log(`  ${p}`);
