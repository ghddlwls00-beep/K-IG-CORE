// Absolute-word cue (설계 세션 검수 유형 ②): questions where a limiting/absolute word ('만 · 모든 · 전혀 · 항상 …') sits only in wrong options —
// "cross out the options with absolute words" then wins.
const fs = require("fs");
const path = require("path");
const B = path.resolve(__dirname, "../학습법-화면-0927/새-문제");
const RE = /(^|[^가-힣])(모든|모두|항상|언제나|절대|절대로|전혀|반드시|오직|결코|아무|아무도|아무것도)(?=[^가-힣]|$)|[가-힣]만(?=[ ,]|$|을|이|은|으로|의|에)|뿐/;
let n = 0, only = 0, both = 0, answerOnly = 0;
const hits = { ld: [], reading: [] };
for (const course of ["ld", "reading"]) {
  for (const f of fs.readdirSync(path.join(B, course)).filter((x) => x.endsWith(".json"))) {
    for (const q of JSON.parse(fs.readFileSync(path.join(B, course, f), "utf8")).questions) {
      n++;
      const flags = q.options.map((o) => RE.test(o));
      const inAnswer = flags[q.answer];
      const inWrong = flags.filter((x, i) => x && i !== q.answer).length;
      if (inWrong && !inAnswer) { only++; hits[course].push(q.id); }
      else if (inWrong && inAnswer) both++;
      else if (inAnswer) answerOnly++;
    }
  }
}
console.log(`문항 ${n} · 극단적인 말이 오답에만 ${only}(${Math.round((only / n) * 100)}%) — LD ${hits.ld.length} · RD ${hits.reading.length} · 정답과 오답 둘 다 ${both} · 정답에만 ${answerOnly}`);
console.log("예:", hits.ld.slice(0, 8).join(" "), "|", hits.reading.slice(0, 8).join(" "));
fs.writeFileSync(path.join(require("os").tmpdir(), "kig-absolute-words-hits.json"), JSON.stringify(hits));
