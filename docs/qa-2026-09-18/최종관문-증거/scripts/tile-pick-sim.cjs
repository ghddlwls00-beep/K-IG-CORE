// 관문 0 스윕의 LISTENING 타일 받아쓰기 FAIL(d078) 이 앱 탓인지 도구 탓인지 — 앱 코드(listeningUtils generateWordBank · verifyWordSequence)를 그대로 불러
// 강의마다 문장 k 의 단어 블록(타일 + 보기 낱말 2 — 보기 고르기는 섞기 전이라 늘 같음)을 만들고, 드라이버 solveTiles 의 '어느 문장인가' 고르기
// (후보 문장 차례대로, 그 문장 낱말이 화면 버튼에 다 있으면 그 문장)를 흉내 내 **다른 문장을 고르는 칸**을 모두 찾는다.
//   node tile-pick-sim.cjs [--ids d078,d001] [--course ld]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const ts = require(path.join(REPO, "node_modules/typescript"));
const L = (rel) => { const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, (x) => (x.startsWith(".") || x.startsWith("@/") ? {} : require(x))); return m.exports; };
const U = L("src/lib/listeningUtils.ts");
const S = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--ids", null) ? new Set(arg("--ids").split(",")) : null;
const norm = (s) => s.replace(/[^\w'\u2019-]/g, "").toLowerCase();
let lessons = 0, cells = 0, wrongPick = 0, verifyOk = 0;
const hits = [];
for (const [id, rows] of Object.entries(S)) {
  if (ONLY && !ONLY.has(id)) continue;
  if (!Array.isArray(rows) || !rows.length) continue;
  lessons++;
  const all = rows.map((r) => r.en || "");
  // LdLearningView allWordsPool: every English sentence split on spaces, letters only
  const pool = [...new Set(all.flatMap((s) => s.split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, ""))))].filter(Boolean);
  const cand = all.map((s) => U.generateWordBank(s, pool).correctWords);
  for (let k = 0; k < all.length; k++) {
    cells++;
    const bank = U.generateWordBank(all[k], pool);
    const have = bank.allTiles.map((t) => norm(t.word));
    if (U.verifyWordSequence(bank.correctWords, bank.correctWords)) verifyOk++;
    // the driver's pick: first candidate whose words all sit among the buttons
    let pick = -1;
    for (let i = 0; i < cand.length && pick < 0; i++) {
      const need = {}; for (const w of cand[i]) need[norm(w)] = (need[norm(w)] || 0) + 1;
      let fits = true; for (const [w, n] of Object.entries(need)) if (have.filter((h) => h === w).length < n) { fits = false; break; }
      if (fits) pick = i;
    }
    if (pick !== k) { wrongPick++; hits.push(`${id} 문장 ${k + 1} 화면인데 도구는 문장 ${pick + 1} 을 고름 — 보기 낱말 ${bank.allTiles.filter((t) => /^distractor-/.test(t.id)).map((t) => t.word).join(", ")} · 앱 판정(그 문장을 조립): ${pick >= 0 ? U.verifyWordSequence(cand[pick], bank.correctWords) : "-"}`); }
  }
}
for (const h of hits.slice(0, 40)) console.log("  " + h);
console.log(`강의 ${lessons} · 문장 칸 ${cells} · 앱이 맞는 순서를 정답으로 봄 ${verifyOk}/${cells} · 도구가 다른 문장을 고를 칸 ${wrongPick}`);
