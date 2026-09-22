#!/usr/bin/env node
/**
 * GRAMMAR 한국어 문제 문구를 고친다 (4단계 — 기준 8 의 "문제에 그 구문을 표시").
 *
 * 계획 파일(JSON 배열)의 한 줄 = { item, course, base, n, from, to }
 *   base : 한국어 쪽 강의 id (예: gh2-007-1). base.json 과, 같은 n 에 같은 문구가 든 분할본(base-N.json)을 함께 고친다.
 *   from : 지금 문구 — 파일과 한 글자라도 다르면 아무것도 쓰지 않고 멈춘다.
 *
 * 파일마다 원래 줄바꿈(LF/CRLF)·끝 개행 여부를 그대로 지키고, 고치지 않은 상태의 왕복이 원본과 바이트까지
 * 같을 때만 쓴다. 한국어 문구는 앱이 소리 내어 읽지 않으므로(GRAMMAR 는 영어만 읽음) 클립과 무관하다.
 *
 *   node grammar-prompts.cjs <plan.json> [--apply]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const [planPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

const serialize = (d, raw) => {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  return JSON.stringify(d, null, 2).replace(/\n/g, eol) + (raw.endsWith("\n") ? eol : "");
};
const itemsOf = (d) => d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);

const docs = new Map();
for (const p of plan) {
  const dir = path.join(REPO, "content/lessons", p.course);
  const files = fs.readdirSync(dir).filter((f) => f === `${p.base}.json` || new RegExp(`^${p.base}-\\d+\\.json$`).test(f));
  let hit = 0;
  for (const f of files) {
    const key = `${p.course}/${f}`;
    if (!docs.has(key)) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const d = JSON.parse(raw);
      if (serialize(d, raw) !== raw) throw new Error(`${key}: 왕복이 원본과 다름 — 멈춤`);
      docs.set(key, { d, raw, changed: false });
    }
    const it = itemsOf(docs.get(key).d).find((x) => String(x.n) === String(p.n));
    if (!it || it.text !== p.from) continue;
    it.text = p.to;
    docs.get(key).changed = true;
    hit++;
    console.log(`#${p.item} ${key} n=${p.n}: ${JSON.stringify(p.from)} → ${JSON.stringify(p.to)}`);
  }
  if (!hit) throw new Error(`#${p.item} ${p.course}/${p.base} n=${p.n}: 지금 문구가 ${JSON.stringify(p.from)} 인 문항을 찾지 못함 — 멈춤`);
}
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }
for (const [key, { d, raw, changed }] of docs) if (changed) fs.writeFileSync(path.join(REPO, "content/lessons", key), serialize(d, raw));
console.log(`\n고친 파일 ${[...docs.values()].filter((x) => x.changed).length}개`);
