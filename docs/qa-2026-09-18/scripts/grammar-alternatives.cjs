#!/usr/bin/env node
/**
 * GRAMMAR 영어 문항에 대체 답안을 더하고, 앱의 실제 채점기로 전·후를 잰다 (4단계 내용 수정용).
 *
 * 계획 파일(JSON 배열)의 한 줄 = { item, base, n, add: [...], wrong: [...] }
 *   base  : 영어 쪽 강의 id (예: gh1-069). base.json · base-1.json · base-2.json 중
 *           같은 n 에 **같은 모범 답안**이 든 파일을 전부 찾아 똑같이 고친다 (분할본 누락 방지).
 *   add   : 더할 대체 답안 — 넣은 뒤 exact 여야 한다.
 *   wrong : 틀린 대조 — 넣은 뒤에도 exact 가 아니어야 한다 (채점이 헐거워지지 않았는지).
 *
 * 파일을 쓰기 전에, 고치지 않은 상태의 왕복(parse → stringify)이 원본과 바이트까지 같은지 확인한다.
 * 기대와 다른 결과(더한 답이 exact 가 아님 · 틀린 대조가 exact)가 하나라도 나오면 exit 1.
 *
 *   node grammar-alternatives.cjs <plan.json>            # 미리보기: 넣기 전 채점만
 *   node grammar-alternatives.cjs <plan.json> --apply    # 넣고, 넣은 뒤 다시 채점
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const E = require("./lib/expectations.cjs");

const [planPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const DIR = (course) => path.join(REPO, "content/lessons", course);
// A plan line may name its course ("grammar2"); GRAMMAR I is the default.
let COURSE = "grammar1";

const refsOf = (id, n) => {
  const it = E.itemsOf(E.lesson(COURSE, id)).find((x) => String(x.n) === String(n));
  return it ? [it.text, ...it.alternatives] : null;
};
const grade = (answer, refs) => grading.gradeAgainstReferences(answer, refs);

// every file that carries the same item (same n and same model text as the main file)
const copies = (base, n) => {
  const main = JSON.parse(fs.readFileSync(path.join(DIR(COURSE), `${base}.json`), "utf8"));
  const model = main.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items).find((x) => String(x.n) === n)?.text;
  if (!model) throw new Error(`${base} n=${n} 없음`);
  return fs.readdirSync(DIR(COURSE)).filter((f) => f === `${base}.json` || new RegExp(`^${base}-\\d+\\.json$`).test(f))
    .filter((f) => JSON.parse(fs.readFileSync(path.join(DIR(COURSE), f), "utf8")).blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items)
      .some((x) => String(x.n) === n && x.text === model));
};

/**
 * Write a document back in the file's OWN layout. Lesson files come in two: LF with a final
 * newline, and CRLF with none (72 of the 88 GRAMMAR II files). A single fixed layout would
 * rewrite every line of the second kind; the round-trip check below refuses to write unless
 * the unmodified document comes back byte-identical in its own layout.
 */
function serialize(d, raw) {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const tail = raw.endsWith("\n") ? eol : "";
  return JSON.stringify(d, null, 2).replace(/\n/g, eol) + tail;
}

let bad = 0;
const report = (label) => {
  console.log(`\n=== ${label}`);
  for (const p of plan) {
    COURSE = p.course || "grammar1";
    const refs = refsOf(p.base, p.n);
    const cells = [...p.add.map((a) => ["더함", a]), ...(p.wrong || []).map((w) => ["틀림", w])].map(([k, a]) => {
      const g = grade(a, refs);
      if (label === "넣은 뒤" && ((k === "더함" && g !== "exact") || (k === "틀림" && g === "exact"))) bad++;
      return `${k}:${g}`;
    });
    console.log(`#${p.item} ${p.base} n=${p.n.padEnd(3)} ${cells.join(" · ")}`);
  }
};

report("넣기 전");
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }

const touched = new Map(); // "course/file" → { d: parsed document, raw: original text }
for (const p of plan) {
  COURSE = p.course || "grammar1";
  for (const f of copies(p.base, p.n)) {
    const key = `${COURSE}/${f}`;
    if (!touched.has(key)) {
      const raw = fs.readFileSync(path.join(DIR(COURSE), f), "utf8");
      const d = JSON.parse(raw);
      if (serialize(d, raw) !== raw) throw new Error(`${f}: 왕복이 원본과 다름 — 형식이 바뀔 수 있어 멈춤`);
      touched.set(key, { d, raw });
    }
    const it = touched.get(key).d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items).find((x) => String(x.n) === p.n);
    const before = [...(it.alternatives || [])];
    const next = [...before, ...p.add.filter((a) => a !== it.text && !before.includes(a))];
    if (next.length !== before.length) it.alternatives = next;
  }
}
for (const [key, { d, raw }] of touched) fs.writeFileSync(path.join(REPO, "content/lessons", key), serialize(d, raw));
console.log(`\n고친 파일 ${touched.size}개: ${[...touched.keys()].join(", ")}`);
report("넣은 뒤");
console.log(bad ? `\n기대와 다른 결과 ${bad}건` : `\n기대와 다른 결과 0건 — 더한 답은 전부 exact, 틀린 대조는 전부 exact 아님`);
process.exit(bad ? 1 : 0);
