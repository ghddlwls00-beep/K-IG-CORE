#!/usr/bin/env node
/**
 * READING readingSentences 의 줄 나눔 고치기 — 한 줄에 두 문장이 붙었거나(6-1072 pr040 s002) 인용 한가운데서
 * 줄이 끊긴 것(6-1131 pr080 s004 · s005)을 다시 나눈다. 이어진 줄 몇 개(ids)를 새 줄 몇 개(rows)로 바꾸고,
 * 사본 셋 — prNNN.json · prNNN-1.json 의 readingSentences 와 중앙 src/lib/readingSentences.json 의 prNNN 부분 — 에서
 * 같은 일을 한 뒤 뒤 줄 id 를 늘어난(줄어든) 만큼 민다. 지문 블록(prNNN.json instruction = 영어 문장 이음 ·
 * prNNN-1.json instruction = 한국어 문장 이음)은 글이 그대로면 건드릴 것이 없다.
 * 새 줄들을 공백 하나로 이은 글이 옛 줄들을 이은 글과 같아야 한다(영어 · 한국어 모두) — 아니면 멈춤.
 *
 *   node split-reading-row.cjs plans/x.json [--apply]
 *   계획 한 줄 = { item, ids: ["reading-080-s004", "reading-080-s005"], rows: [{ en, ko }, …] }
 *   (예전 꼴 { item, id, en: [앞, 뒤], ko: [앞, 뒤] } 은 한 줄을 둘로)
 *   koRewrite: true — 옛 한국어가 두 영어 문장을 한 문장으로 녹여 쪼갤 수 없을 때(6-1139 pr087 s004)만. 영어 이음 확인은
 *   그대로 하고 한국어는 새로 쓴 것을 받는다(한국어 이음 확인만 건너뜀 — 출력에 적음). 이때 -1 쪽 한국어 지문 블록 안의
 *   옛 한국어도 새 글로 바꾼다(2026-09-23 — 전에는 안 바꿔 pr087-1 블록이 문장과 어긋난 채 남았음).
 * 끝에 손댄 강의마다 지문 블록이 문장 이음과 같은지 확인한다(다르면 멈춤).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const [planPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), "utf8")).map((l) =>
  l.ids ? l : { item: l.item, ids: [l.id], rows: [{ en: l.en[0], ko: l.ko[0] }, { en: l.en[1], ko: l.ko[1] }] });
const esc = (s) => JSON.stringify(s);
const texts = new Map();
const get = (f) => { if (!texts.has(f)) texts.set(f, fs.readFileSync(path.join(REPO, f), "utf8")); return texts.get(f); };

for (const l of plan) {
  const [, unit, num] = l.ids[0].match(/^reading-(\d{3})-s(\d{3})$/);
  const lesson = `pr${unit}`;
  const first = Number(num);
  const m = l.ids.length, n = l.rows.length, shift = n - m;
  const pad = (k) => `reading-${unit}-s${String(k).padStart(3, "0")}`;
  l.ids.forEach((id, i) => { if (id !== pad(first + i)) throw new Error(`${id}: ids 가 이어진 줄이 아님`); });
  const targets = [
    { f: `content/lessons/reading/${lesson}.json`, scope: (raw) => [raw.indexOf('"readingSentences"'), raw.length] },
    { f: `content/lessons/reading/${lesson}-1.json`, scope: (raw) => [raw.indexOf('"readingSentences"'), raw.length] },
    { f: "src/lib/readingSentences.json", scope: (raw) => {
      const s = raw.indexOf(`"${lesson}": [`);
      const rest = raw.slice(s + 5).search(/\n\s*"pr\d{3}(-\d+)?": \[/);
      return [s, rest < 0 ? raw.length : s + 5 + rest];
    } },
  ];
  for (const t of targets) {
    let raw = get(t.f);
    const [s, e] = t.scope(raw);
    let scope = raw.slice(s, e);
    const count = (scope.match(new RegExp(`"id": "reading-${unit}-s\\d{3}"`, "g")) || []).length;
    // 옛 줄들의 글 덩어리(첫 줄 { 부터 끝 줄 } 까지)
    const at0 = scope.indexOf(`"id": "${l.ids[0]}"`);
    const blockStart = scope.lastIndexOf("{", at0);
    const atN = scope.indexOf(`"id": "${l.ids[m - 1]}"`);
    const blockEnd = scope.indexOf("}", atN) + 1;
    const block = scope.slice(blockStart, blockEnd);
    const olds = JSON.parse(`[${block}]`);
    const join = (arr, k) => arr.map((x) => x[k]).join(" ");
    if (join(olds, "english") !== l.rows.map((r) => r.en).join(" ")) throw new Error(`${t.f}: 새 줄 영어를 이으면 옛 글과 다름`);
    if (!l.koRewrite && join(olds, "korean") !== l.rows.map((r) => r.ko).join(" ")) throw new Error(`${t.f}: 새 줄 한국어를 이으면 옛 글과 다름`);
    if (l.koRewrite) console.log(`  (koRewrite — 한국어는 새로 씀: 옛 '${join(olds, "korean").slice(0, 40)}…')`);
    // 뒤 줄 id 밀기 — 늘면 큰 번호부터, 줄면 작은 번호부터
    const after = [];
    for (let k = first + m; k <= count; k++) after.push(k);
    if (shift > 0) after.reverse();
    for (const k of after) scope = scope.replace(`"id": "${pad(k)}"`, `"id": "${pad(k + shift)}"`);
    const firstObj = block.slice(0, block.indexOf("}") + 1);
    const indent = (firstObj.match(/\n(\s*)"id"/) || [])[1] || "      ";
    const closeIndent = (firstObj.match(/\n(\s*)\}$/) || [])[1] || "    ";
    const make = (id, en, ko) => `{\n${indent}"id": ${esc(id)},\n${indent}"english": ${esc(en)},\n${indent}"korean": ${esc(ko)}\n${closeIndent}}`;
    const newBlock = l.rows.map((r, i) => make(pad(first + i), r.en, r.ko)).join(`,\n${closeIndent}`);
    const at2 = scope.indexOf(block);
    scope = scope.slice(0, at2) + newBlock + scope.slice(at2 + block.length);
    raw = raw.slice(0, s) + scope + raw.slice(e);
    if (l.koRewrite && t.f.endsWith("-1.json")) {
      // -1 쪽 한국어 지문 블록(readingSentences 앞의 blocks) 안의 옛 한국어 → 새 한국어, 정확히 한 번
      const oldKo = esc(join(olds, "korean")).slice(1, -1);
      const newKo = esc(l.rows.map((r) => r.ko).join(" ")).slice(1, -1);
      const cut = raw.indexOf('"readingSentences"');
      const head = raw.slice(0, cut);
      const k = head.split(oldKo).length - 1;
      if (k !== 1) throw new Error(`${t.f}: 한국어 지문 블록에서 옛 한국어가 ${k}번`);
      raw = head.replace(oldKo, () => newKo) + raw.slice(cut);
      console.log(`  (koRewrite — ${t.f} 한국어 지문 블록도 새 한국어로)`);
    }
    JSON.parse(raw);
    texts.set(t.f, raw);
    console.log(`#${l.item} ${t.f}: ${count} → ${count + shift}줄`);
  }
}
// 확인: 영어 · 한국어 전체가 같은 차례로 그대로 · id 차례
for (const l of plan) {
  const [, unit] = l.ids[0].match(/^reading-(\d{3})-/);
  const lesson = `pr${unit}`;
  for (const f of [`content/lessons/reading/${lesson}.json`, `content/lessons/reading/${lesson}-1.json`]) {
    const before = JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")).readingSentences;
    const after = JSON.parse(texts.get(f)).readingSentences;
    const keys = plan.some((p) => p.koRewrite && p.ids[0].startsWith(`reading-${unit}-`)) ? ["english"] : ["english", "korean"];
    for (const k of keys) if (before.map((x) => x[k]).join(" ") !== after.map((x) => x[k]).join(" ")) throw new Error(`${f}: ${k} 전체가 달라짐`);
    if (after.some((x, i) => x.id !== `reading-${unit}-s${String(i + 1).padStart(3, "0")}`)) throw new Error(`${f}: id 차례가 어긋남`);
    const ins = (JSON.parse(texts.get(f)).blocks || []).find((b) => b.type === "instruction");
    const want = after.map((x) => (f.endsWith("-1.json") ? x.korean : x.english)).join(" ");
    if (!ins || ins.text !== want) throw new Error(`${f}: 지문 블록이 문장 이음과 다름`);
  }
}
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }
for (const [f, raw] of texts) fs.writeFileSync(path.join(REPO, f) + ".tmp-split", raw);
for (const [f] of texts) fs.renameSync(path.join(REPO, f) + ".tmp-split", path.join(REPO, f));
console.log(`\n${texts.size}개 파일에 씀`);
