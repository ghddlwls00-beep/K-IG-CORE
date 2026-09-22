#!/usr/bin/env node
/**
 * LISTENING keeps the Korean translation TWICE:
 *   - content/ld_english_scripts.json  → what the page actually renders
 *     (src/lib/content.ts getLdEnglishScript, used by LdLearningView)
 *   - content/lessons/ld/dNNN-1.json  → `instruction` blocks, a second copy nothing displays
 *
 * They have drifted apart ("다양한 가스" on screen, "다양한 개스" in the lesson file). This counts
 * where, because a correction applied to the copy nobody sees would look done and change nothing.
 *
 *   node check-ld-duplicate-script.cjs
 * Output: out/ld-duplicate-script.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");

// compare meaning, not typography: quotes, spacing and trailing punctuation differ harmlessly
const norm = (s) => String(s || "")
  .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
  .replace(/\s+/g, "")
  .replace(/[.,!?;:"'()]/g, "")
  .trim();

const lessonsWithCopy = [];
const differing = [];
let comparedLessons = 0, comparedParagraphs = 0;

for (const p of E.pages("ld")) {
  if (!/-1$/.test(p.id)) continue;            // the Korean-script page
  const base = p.id.replace(/-1$/, "");
  const rows = E.ldScripts[base] || [];
  if (!rows.length) continue;
  const d = E.lesson("ld", p.id);
  const blocks = (d.blocks || []).filter((b) => b.type === "instruction" && E.isKo(b.text)).map((b) => E.clean(b.text));
  // the first instruction is the page's guidance line, not part of the script
  const copy = blocks.filter((t) => !/대본을 보면서|영작해보세요|들으면서|따라 말해/.test(t));
  if (!copy.length) continue;
  lessonsWithCopy.push(p.id);
  comparedLessons++;

  const shown = rows.map((r) => E.clean(r.ko));
  const shownAll = norm(shown.join(" "));
  for (const para of copy) {
    comparedParagraphs++;
    if (!shownAll.includes(norm(para))) {
      // find the closest shown paragraph, to show what the learner sees instead
      let best = "", bestScore = 0;
      for (const s of shown) {
        const a = norm(para), b = norm(s);
        let hit = 0;
        for (let i = 0; i + 8 <= a.length; i += 8) if (b.includes(a.slice(i, i + 8))) hit++;
        const score = hit / Math.max(1, Math.floor(a.length / 8));
        if (score > bestScore) { bestScore = score; best = s; }
      }
      differing.push({ lesson: p.id, inLessonFile: para, onScreen: bestScore > 0.3 ? best : "(대응하는 문단을 찾지 못함)", similarity: Number(bestScore.toFixed(2)) });
    }
  }
}

const out = {
  at: new Date().toISOString(),
  lessonsWithSecondCopy: lessonsWithCopy.length,
  comparedParagraphs,
  differingParagraphs: differing.length,
  lessonsAffected: [...new Set(differing.map((d) => d.lesson))].length,
  differing: differing.slice(0, 200),
};
fs.writeFileSync(path.join(OUT, "ld-duplicate-script.json"), JSON.stringify(out, null, 1));

console.log(`한글 대본 사본을 가진 강의 ${out.lessonsWithSecondCopy}개 · 대조한 문단 ${comparedParagraphs}개`);
console.log(`화면에 나오는 것과 다른 문단: ${out.differingParagraphs}개 (강의 ${out.lessonsAffected}개)`);
for (const d of differing.slice(0, 8)) {
  console.log(`\n  ${d.lesson} (유사도 ${d.similarity})`);
  console.log(`    강의 파일: ${d.inLessonFile.slice(0, 110)}`);
  console.log(`    화면     : ${String(d.onScreen).slice(0, 110)}`);
}
console.log(`\n→ ${path.join(OUT, "ld-duplicate-script.json")}`);
