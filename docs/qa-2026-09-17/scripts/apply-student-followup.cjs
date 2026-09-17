#!/usr/bin/env node
/**
 * STUDENT follow-up found by verify-student-fixes.cjs after apply-student.cjs:
 *  - s10-1 chunk "just as busy as my daily one." is not what the sentence says ("daily schedule")
 *  - s3-2 / s4-5 chunk cards had the Korean sample names inside the English
 *    ("My best friend is (대한),", "is my oldest uncle, (길동).") while the sentences use the
 *    blanks "(name)" / "(uncle’s name)"; the Korean prompts now use the same blanks.
 */
const fs = require("fs");
const path = require("path");
const { formatOf, serialize } = require("./lib-lesson-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/student");
const problems = [];
const edits = {
  "s10-1": { chunks: [["just as busy as my daily one.", "just as busy as my daily schedule.", null]], ko: [] },
  "s3-2": {
    chunks: [["My best friend is (대한),", "My best friend is (name),", "나의 가장 친한 친구는 (이름)입니다."]],
    ko: [[3, "그들의 이름은 대한, 민국 입니다.", "그들의 이름은 (이름들)입니다."], [5, "저의 가장 친한 친구는 대한 이고 나는 그를/그녀를 3년 동안 알아왔습니다.", "저의 가장 친한 친구는 (이름)이고 나는 그를/그녀를 3년 동안 알아 왔습니다."]],
  },
  "s4-5": {
    chunks: [["is my oldest uncle, (길동).", "is my oldest uncle, (uncle’s name).", "나의 큰삼촌 (삼촌 이름)입니다."]],
    ko: [[1, "나의 가장 좋아하는 친척은 나의 가장 나이 많은 삼촌 길동입니다.", "나의 가장 좋아하는 친척은 나의 큰삼촌 (삼촌 이름)입니다."]],
  },
};
const out = [];
for (const [id, e] of Object.entries(edits)) {
  const file = path.join(dir, `${id}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const d = JSON.parse(raw);
  const f = formatOf(raw);
  for (const [from, to, ko] of e.chunks) {
    const hit = (d.chunkDrills || []).filter((c) => c.en === from);
    if (hit.length !== 1) { problems.push(`${id} chunk ${from} ×${hit.length}`); continue; }
    hit[0].en = to;
    if (ko) hit[0].ko = ko;
  }
  const kos = d.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko");
  for (const [n, from, to] of e.ko) {
    if (kos[n - 1]?.text !== from) { problems.push(`${id} KO #${n} is ${JSON.stringify(kos[n - 1]?.text)}`); continue; }
    kos[n - 1].text = to;
  }
  out.push([file, serialize(d, f)]);
}
if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
for (const [file, text] of out) fs.writeFileSync(file, text);
console.log(`STUDENT follow-up: ${out.length} lessons`);
