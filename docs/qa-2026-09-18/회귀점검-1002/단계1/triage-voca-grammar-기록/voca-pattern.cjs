// For every VOCA RETEST audio line in the sweep: is it (a) the first word card right after a row '이어 듣기', or (b) a phrase button of '어원 · 쓰임 보기'?
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const F = REPO + "/docs/qa-2026-09-18/out/features";
const files = fs.readdirSync(F).filter((f) => /^phonics-rc-(desktop|mobile|small)-\d+of\d+\.jsonl$/.test(f));
const latest = {};
for (const f of files) for (const l of fs.readFileSync(path.join(F, f), "utf8").split("\n").filter(Boolean)) {
  const r = JSON.parse(l); const k = r.id + "|" + r.viewport;
  if (!latest[k] || latest[k].at < r.at) latest[k] = r;
}
// phrases from the app data (collocations)
const vu = fs.readFileSync(REPO + "/src/lib/vocaUtils.ts", "utf8");
const phrases = new Set([...vu.matchAll(/phrase:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]));
const res = { total: 0, afterRow: 0, phrase: 0, other: 0, otherEx: [], byVp: {}, recheckPhrase: 0 };
const rowRe = /▶ (듣기 )?\d+–\d+번 이어 듣기$/;
for (const r of Object.values(latest)) {
  const a = r.audio || [];
  a.forEach((x, i) => {
    if (x.status === "PASS") return;
    res.total++;
    res.byVp[r.viewport + "|" + x.status] = (res.byVp[r.viewport + "|" + x.status] || 0) + 1;
    const lab = x.control.replace(/^.*?▶ /, "").replace(/ 듣기$/, "");
    const prev = a[i - 1];
    if (phrases.has(lab)) { res.phrase++; return; }
    if (prev && rowRe.test(prev.control) && prev.status === "PASS") { res.afterRow++; return; }
    res.other++; if (res.otherEx.length < 15) res.otherEx.push(r.id + " " + r.viewport + " " + x.control.slice(0, 80) + " | prev: " + (prev ? prev.control.slice(0, 50) + " " + prev.status : "-"));
  });
}
res.phrasesKnown = phrases.size;
fs.writeFileSync(path.join(__dirname, "voca-pattern.json"), JSON.stringify(res, null, 1));
