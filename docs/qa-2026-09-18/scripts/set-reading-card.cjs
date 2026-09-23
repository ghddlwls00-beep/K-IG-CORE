#!/usr/bin/env node
/**
 * READING 카드 한 칸 고치기 — 카드는 강의 파일 둘(prNNN.json · prNNN-1.json)의 readingVocabulary 와
 * 중앙 파일 src/lib/readingVocabulary.json({ prNNN: [카드…] }) 에 사본이 있다. 셋을 한 번에 고친다.
 * 계획 한 줄 = { item, lessons: ["pr021", …], word, field: "partOfSpeech" | "korean" | …, from, to }
 * 파일마다 그 카드 객체({ … "word": word … }) 안에서만 `"field": "from"` 을 찾아 바꾼다(글자·들여쓰기 그대로).
 * 사본마다 정확히 한 번이 아니면 멈춤. 쓴 뒤 다시 읽어 그 칸 말고는 아무것도 안 바뀌었는지 확인.
 *
 *   node set-reading-card.cjs plans/x.json            미리보기
 *   node set-reading-card.cjs plans/x.json --apply    씀
 *   node set-reading-card.cjs --check plans/x.json …  세 사본 모두 to 인지
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const CENTRAL = "src/lib/readingVocabulary.json";
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const CHECK = args.includes("--check");
const plans = args.filter((a) => !a.startsWith("--"));
const esc = (s) => JSON.stringify(s).slice(1, -1);
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

// 한 사본(글자) 안에서 [start, end) 범위의 카드 객체를 찾아 칸을 바꾼 새 글자를 돌려줌
function editIn(raw, start, end, l, label) {
  const scope = raw.slice(start, end);
  const wordKey = `"word": "${esc(l.word)}"`;
  const at = scope.indexOf(wordKey);
  if (at < 0 || scope.indexOf(wordKey, at + 1) >= 0) throw new Error(`${label}: 카드 '${l.word}' 가 한 번이 아님`);
  const objStart = scope.lastIndexOf("{", at);
  const objEnd = scope.indexOf("}", at);
  const obj = scope.slice(objStart, objEnd);
  const from = `"${l.field}": "${esc(l.from)}"`;
  if (obj.split(from).length !== 2) throw new Error(`${label}: '${from}' 가 카드 안에 한 번이 아님`);
  const newObj = obj.replace(from, `"${l.field}": "${esc(l.to)}"`);
  return raw.slice(0, start + objStart) + newObj + raw.slice(start + objEnd);
}
function centralRange(raw, lesson) {
  const s = raw.indexOf(`"${lesson}": [`);
  if (s < 0) throw new Error(`중앙 파일에 ${lesson} 없음`);
  const next = raw.slice(s + 5).search(/\n\s*"pr\d{3}(-\d+)?": \[/);
  return [s, next < 0 ? raw.length : s + 5 + next];
}

if (CHECK) {
  let lines = 0, bad = 0;
  const central = JSON.parse(read(CENTRAL));
  for (const p of plans) {
    const planLines = JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
    // 같은 계획에서 낱말을 바꾼 카드(field "word")는 새 낱말로 찾는다
    const renamed = {};
    for (const l of planLines) if (l.field === "word") for (const lesson of l.lessons) renamed[`${lesson}:${l.from}`] = l.to;
    for (const l of planLines) for (const lesson of l.lessons) {
    lines++;
    const copies = [
      JSON.parse(read(`content/lessons/reading/${lesson}.json`)).readingVocabulary,
      JSON.parse(read(`content/lessons/reading/${lesson}-1.json`)).readingVocabulary,
      central[lesson],
    ];
    const word = renamed[`${lesson}:${l.word}`] || l.word;
    const vals = copies.map((cards) => ((cards || []).find((c) => c.word === word) || {})[l.field]);
    if (!vals.every((v) => v === l.to)) { bad++; console.log(`  어긋남 ${lesson} ${l.word}.${l.field}: ${JSON.stringify(vals)} · 기대 ${JSON.stringify(l.to)}`); }
    }
  }
  console.log(`카드 계획 ${plans.length}개 · ${lines}칸(강의별) · 어긋남 ${bad}`);
  process.exit(bad ? 1 : 0);
}

const plan = JSON.parse(fs.readFileSync(path.resolve(plans[0]), "utf8"));
const texts = new Map();
const get = (f) => { if (!texts.has(f)) texts.set(f, read(f)); return texts.get(f); };
for (const l of plan) {
  for (const lesson of l.lessons) {
    for (const f of [`content/lessons/reading/${lesson}.json`, `content/lessons/reading/${lesson}-1.json`]) {
      const raw = get(f);
      const rv = raw.indexOf('"readingVocabulary"');
      texts.set(f, editIn(raw, rv, raw.length, l, `${f}`));
    }
    const raw = get(CENTRAL);
    const [s, e] = centralRange(raw, lesson);
    texts.set(CENTRAL, editIn(raw, s, e, l, `${CENTRAL} ${lesson}`));
    console.log(`#${l.item} ${lesson}: ${l.word}.${l.field} ${JSON.stringify(l.from)} → ${JSON.stringify(l.to)} (사본 3)`);
  }
}
// 확인: 바뀐 것은 계획의 칸뿐
for (const [f, raw] of texts) {
  const before = JSON.parse(read(f));
  const after = JSON.parse(raw);
  const diff = [];
  const walk = (a, b, p) => {
    if (typeof a !== "object" || a === null) { if (a !== b) diff.push(p); return; }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b || {})])) walk(a[k], (b || {})[k], `${p}.${k}`);
  };
  walk(before, after, f);
  const allowed = diff.every((d) => plan.some((l) => d.endsWith(`.${l.field}`)));
  if (!allowed) throw new Error(`${f}: 계획 밖 칸이 바뀜 ${diff.join(" ")}`);
}
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }
for (const [f, raw] of texts) fs.writeFileSync(path.join(REPO, f), raw);
console.log(`\n${texts.size}개 파일에 씀 (형식 그대로)`);
