// 앱이 채우는 칸(받아쓰기에서 앱이 스스로 놓는 '(…)' 자리) 세기 — studentBlanks.ts dictationBlanks 그대로
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const B = loadTs(path.join(REPO, "src/lib/studentBlanks.ts"));
for (const course of ["student", "adult"]) {
  const idx = JSON.parse(fs.readFileSync(path.join(REPO, `content/courses/${course}.json`), "utf8"));
  const ids = idx.lessons.map((l) => l.id);
  const fixed = [], written = [];
  for (const id of ids) {
    const f = path.join(REPO, `content/lessons/${course}/${id}.json`);
    if (!fs.existsSync(f)) continue;
    const L = JSON.parse(fs.readFileSync(f, "utf8"));
    const block = (L.blocks || []).find((b) => b.type === "sentences");
    ((block && block.items) || []).forEach((it, i) => {
      const bl = B.blanksOf(id, i, it.text);
      for (const b of (process.argv.includes("--break") ? bl : B.dictationBlanks(bl))) fixed.push(`${id} #${i + 1} ${b.text}`);
      for (const b of bl.filter((x) => x.written)) written.push(`${id} #${i + 1} ${b.text}`);
    });
  }
  console.log(`${course}: 앱이 채우는 칸 ${fixed.length}`);
  for (const x of fixed) console.log("  " + x);
  console.log(`${course}: 내 정보(쓴 낱말 — 조각으로 나옴) ${written.length}`);
  for (const x of written) console.log("  " + x);
}

