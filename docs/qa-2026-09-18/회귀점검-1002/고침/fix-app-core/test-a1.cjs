// A1 test: GRAMMAR II '틀린 곳 표시' (DiffLine) draws Korean words in Hangul.
// node test-a1.cjs            → new code (src/components/GrammarDiffLine.tsx) — expect 0 roman
// node test-a1.cjs --old      → HEAD's DiffLine (extracted from GrammarLearningView.tsx at HEAD) — expect roman (break proof)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../../../..");
process.env.KIG_REPO = REPO;
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const E = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
const P = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/passoff-expect.cjs"));
const KG = loadTs(path.join(REPO, "src/lib/koreanGloss.ts"));
const GG = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const React = require(require.resolve("react", { paths: [REPO] }));
const { renderToStaticMarkup } = require(require.resolve("react-dom/server", { paths: [REPO] }));

const OLD = process.argv.includes("--old");
let DL;
if (OLD) {
  const src = execSync("git show HEAD:src/components/GrammarLearningView.tsx", { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }).split(/\r?\n/);
  const start = src.findIndex((l) => l.startsWith("/** The learner's words with the marks"));
  const end = src.findIndex((l, i) => i > start && l.startsWith("function focusInto"));
  const body = src.slice(start, end).join("\n").replace("function DiffLine", "export function DiffLine");
  const file = path.join(require("os").tmpdir(), "kig-a1-old-diffline.tsx");
  fs.writeFileSync(file, `import { Fragment } from "react";\nimport type { DiffToken } from "@/lib/grammarGrading";\n${body}\n`);
  DL = loadTs(file);
} else {
  DL = loadTs(path.join(REPO, "src/components/GrammarDiffLine.tsx"));
}
if (typeof DL.DiffLine !== "function") { console.error("DiffLine not loaded"); process.exit(1); }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const spellingsOf = (key) => (KG.KOREAN_GLOSS_PAGES[key] || []).map(([w]) => w).sort((a, b) => b.length - a.length);
const hasSpelling = (key, text) => KG.koreanOnScreen(key, text) !== text;
const replaceKorean = (key, text, by) => text.replace(new RegExp(`(^|[^A-Za-z0-9])(${spellingsOf(key).map(esc).join("|")})(?![A-Za-z0-9])`, "g"), (_m, b) => `${b}${by}`);
const right = (key, text, refs) => GG.gradeAgainstReferences(KG.romanForGrading(key, text), refs) === "exact";

// the same answer forms as check-wrongspot-hangul-1004.cjs: ① Korean word → Tokyo · ② Hangul answer with one English word left out
// + ③ extra forms: the learner writes the Korean name in English spelling but gets another word wrong
function formsOf(key, base, refs) {
  const hangul = KG.koreanOnScreen(key, base);
  const wrongEn = replaceKorean(key, base, "Tokyo");
  const toks = hangul.split(" ");
  let wrongHangul = null;
  for (let k = toks.length - 1; k >= 0 && !wrongHangul; k--) {
    if (!/[A-Za-z]{2,}/.test(toks[k]) || /[가-힣]/.test(toks[k])) continue;
    const punct = (toks[k].match(/[.?!]+$/) || [""])[0];
    const rest = toks.filter((_, i) => i !== k);
    if (punct && k === toks.length - 1 && rest.length) rest[rest.length - 1] = rest[rest.length - 1].replace(/[.?!,]*$/, "") + punct;
    const cand = rest.join(" ");
    if (!right(key, cand, refs)) wrongHangul = cand;
  }
  // ③: English spelling kept, first English word (not Korean) replaced by "zzz"
  const btoks = base.split(" ");
  let wrongOther = null;
  for (let k = 0; k < btoks.length && !wrongOther; k++) {
    if (hasSpelling(key, btoks[k]) || !/[A-Za-z]{2,}/.test(btoks[k])) continue;
    const cand = btoks.map((t, i) => (i === k ? "zzz" : t)).join(" ");
    if (!right(key, cand, refs)) wrongOther = cand;
  }
  return { "①": wrongEn, "②": wrongHangul, "③": wrongOther };
}

const strip = (html) => html.replace(/<span class="sr-only">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
let rows = 0, roman = 0, rowsRoman = 0, partName = 0;
const samples = [];
for (const p of E.pages("grammar2")) {
  const key = `grammar2/${p.id}`;
  if (!KG.KOREAN_GLOSS_PAGES[key]) continue;
  const exp = E.expected("grammar2", p.id);
  for (const a of exp.answers) {
    const refs = [a.text, ...(a.alternatives || [])];
    const base = refs.find((t) => hasSpelling(key, t));
    if (!base) continue;
    const forms = formsOf(key, base, refs);
    for (const [f, value] of Object.entries(forms)) {
      if (!value) continue;
      const diff = GG.diffAgainstReferences(KG.romanForGrading(key, value), refs);
      if (diff.grade === "exact") continue;
      const html = renderToStaticMarkup(React.createElement(DL.DiffLine, { tokens: diff.tokens, show: (t) => KG.koreanOnScreen(key, t) }));
      const text = strip(html);
      const hits = P.romanOnScreen(key, text);
      rows++;
      if (hits.length) { rowsRoman++; roman += hits.length; }
      // a name drawn in halves (한 River · Han 강) counts as a failure too
      if (/한 River|Han 강|Mr 김\b/.test(text) && key.includes("gh2-012")) partName++;
      if (/gh2-012$|gh2-033$|gh2-045$|gh2-029$/.test(p.id) && samples.length < 12) samples.push(`${p.id}#${a.n} ${f} 「${value}」 → ${text}`);
    }
  }
}
console.log(`${OLD ? "HEAD(고치기 전)" : "고친 뒤"} DiffLine · GRAMMAR II 줄 ${rows} · 로마자 있는 줄 ${rowsRoman} · 로마자 ${roman}번 · 이름 반쪽(한 River) ${partName}`);
for (const s of samples) console.log("  " + s);
process.exit(rows > 0 && rowsRoman === 0 && partName === 0 ? 0 : 1);
