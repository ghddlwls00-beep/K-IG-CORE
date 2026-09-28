// Score the blind-guess test: node blind-score.cjs <workflow journal.jsonl>
const fs = require("fs");
const path = require("path");
const key = JSON.parse(fs.readFileSync(path.join(require("os").tmpdir(), "kig-blind-key.json"), "utf8"));
const abs = JSON.parse(fs.readFileSync(path.join(require("os").tmpdir(), "kig-absolute-words-hits.json"), "utf8"));
const absSet = new Set([...abs.ld, ...abs.reading]);
const items = [];
for (const l of fs.readFileSync(process.argv[2], "utf8").split(/\n/).filter(Boolean)) {
  const o = JSON.parse(l);
  if (o.type === "result" && o.result && Array.isArray(o.result.items)) items.push(...o.result.items);
}
const byCourse = { ld: [], reading: [] };
for (const it of items) if (key[it.id] !== undefined) byCourse[it.id.startsWith("pr") ? "reading" : "ld"].push({ ...it, right: it.pick === key[it.id] });
const flagged = new Set();
for (const [c, list] of Object.entries(byCourse)) {
  const n = list.length || 1;
  const right = list.filter((x) => x.right).length;
  const sureRight = list.filter((x) => x.right && x.confidence === "sure").length;
  const likelyRight = list.filter((x) => x.right && x.confidence === "likely").length;
  const sureWrong = list.filter((x) => !x.right && x.confidence === "sure").length;
  const narrow = list.filter((x) => x.right && x.remaining <= 2).length;
  console.log(`${c}: 받음 ${list.length}/${Object.keys(key).filter((k) => (c === "reading") === k.startsWith("pr")).length} · 맞힘 ${right}(${Math.round((right / n) * 100)}%) · 'sure'로 맞힘 ${sureRight} · 'likely'로 맞힘 ${likelyRight} · 'sure'인데 틀림 ${sureWrong} · 둘 이하로 좁혀 맞힘 ${narrow}(${Math.round((narrow / n) * 100)}%)`);
  for (const x of list) if (x.right && (x.confidence === "sure" || x.confidence === "likely" || x.remaining <= 2)) flagged.add(x.id);
}
const withAbs = [...flagged].filter((id) => absSet.has(id)).length;
const union = new Set([...flagged, ...absSet]);
console.log(`눈치로 풀림(맞힘 + sure/likely 또는 둘 이하로 좁힘) ${flagged.size} · 그중 극단적인 말도 걸린 것 ${withAbs} · 극단적인 말만 ${absSet.size - withAbs} · 둘을 합친 문항 ${union.size}`);
const lessons = new Set([...union].map((id) => id.split("-")[0]));
console.log(`합친 문항이 있는 강의 ${lessons.size} (LD ${[...lessons].filter((x) => !x.startsWith("pr")).length} · RD ${[...lessons].filter((x) => x.startsWith("pr")).length})`);
fs.writeFileSync(path.join(require("os").tmpdir(), "kig-guessable.json"), JSON.stringify({ flagged: [...flagged], absolute: [...absSet], union: [...union] }));
