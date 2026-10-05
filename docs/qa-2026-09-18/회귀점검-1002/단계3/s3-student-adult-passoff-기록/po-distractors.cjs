// PASS-OFF ④⑤ '낱말 카드' 방해 낱말 — contrastPool 의 앞 둘이 실제 영어 낱말인지(가짜 -s 꼴) 세기
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const L = loadTs(path.join(REPO, "src/lib/passoffLesson.ts"));
const PX = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/passoff-expect.cjs"));
// known English words: every word in the site's English (lessons of all courses) + the VOCA dictionary
const known = new Set();
const addText = (s) => { for (const w of String(s).toLowerCase().match(/[a-z]+/g) || []) known.add(w); };
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) addText(fs.readFileSync(p, "utf8")); } };
walk(path.join(REPO, "content"));
const out = new Map();
let items = 0, withFake = 0;
for (const pg of PX.pages()) {
  const exp = PX.expectedPassoff(pg.id, { licensed: true });
  for (const it of [...(exp.produce || []), ...(exp.transfers || [])]) {
    items++;
    const raw = it.raw || it;
    const pool = L.contrastPool({ en: it.en, errorPatterns: raw.errorPatterns, targets: raw.targets }).slice(0, 2);
    const fake = pool.filter((w) => /^[A-Za-z]+$/.test(w) && !known.has(w.toLowerCase()));
    if (fake.length) { withFake++; for (const w of fake) { const e = out.get(w) || { n: 0, ex: [] }; e.n++; if (e.ex.length < 2) e.ex.push(`${pg.id}:${it.id} '${it.en.slice(0, 50)}'`); out.set(w, e); } }
  }
}
console.log(`문항 ${items} · 사이트 영어에 없는 방해 낱말이 든 문항 ${withFake}`);
for (const [w, e] of [...out].sort((a, b) => b[1].n - a[1].n)) console.log(`${w} ×${e.n} — ${e.ex.join(" · ")}`);

