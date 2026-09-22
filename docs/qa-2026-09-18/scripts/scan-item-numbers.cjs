#!/usr/bin/env node
/**
 * BUG-020 조사·검증 — GRAMMAR 문항 글(text·alternatives) 앞에 남은 문항 번호("1. ", "12) ")를 전부 찾는다.
 * 앱은 보여 주고·읽고·채점하기 전에 이 번호를 떼므로(GrammarLearningView.tsx cleanText) 지금은 화면에 안 나오지만,
 * 떼는 규칙이 바뀌는 순간 오채점이 된다.
 *   node scan-item-numbers.cjs          목록 (있으면 exit 1)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const NUM = /^\s*\d+[.)]\s*/;
const hits = [];
for (const course of ["grammar1", "grammar2"]) {
  const dir = path.join(REPO, "content/lessons", course);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const b of d.blocks || []) {
      if (b.type !== "sentences") continue;
      for (const it of b.items || []) {
        if (!it) continue;
        const fields = [["text", it.text], ...(it.alternatives || []).map((a, i) => [`alternatives[${i}]`, a])];
        for (const [field, value] of fields) {
          if (typeof value === "string" && NUM.test(value)) {
            hits.push({ file: `${course}/${f}`, n: it.n, field, value, lang: /[가-힣]/.test(value) ? "ko" : "en" });
          }
        }
      }
    }
  }
}
const en = hits.filter((h) => h.lang === "en");
console.log(`번호가 붙은 문항 글 ${hits.length}곳 (영어 ${en.length} · 한국어 ${hits.length - en.length})`);
for (const h of hits) console.log(`  ${h.file} #${h.n} ${h.field} [${h.lang}]: ${JSON.stringify(h.value.slice(0, 70))}`);
process.exit(hits.length ? 1 : 0);
