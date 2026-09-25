// 한국어 낱말 소리 꼴(lessonSpeechForm) 고침 뒤, 운영 스윕 기록(강의×화면 가장 늦은 것)에서 그 문장들의 소리 버튼이 어느 클립을 불렀나:
// 새 꼴(경주) 클립 · 옛 꼴(Gyeongju) 클립 · 브라우저 음성(TTS)으로 넘어간 것 — 버튼(단계 ▶ 이름)마다.
//   node korean-clip-usage.cjs [--lesson student/s20-4]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const L = (rel) => { const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, (x) => (x.startsWith(".") || x.startsWith("@/") ? {} : require(x))); return m.exports; };
const SF = L("src/lib/lessonSpeechForm.ts");
const LU = L("src/lib/listeningUtils.ts");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--lesson", null);
const table = SF.LESSON_SPEECH_WORDS || {};
// 쪽마다 영어 글(학생 · 문법 · 읽기 파일의 text/english/en) 중 표의 낱말이 든 것 → 옛 꼴 · 새 꼴 클립
const pairs = []; // { lesson, text, oldKey, newKey }
const walk = (o, out) => { if (typeof o === "string") out.push(o); else if (Array.isArray(o)) o.forEach((x) => walk(x, out)); else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v, out); };
for (const lessonKey of Object.keys(table)) {
  if (ONLY && lessonKey !== ONLY) continue;
  const [course, id] = lessonKey.split("/");
  const words = table[lessonKey].map((w) => w[0]);
  let strings = [];
  const f = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (fs.existsSync(f)) walk(JSON.parse(fs.readFileSync(f, "utf8")), strings);
  if (course === "ld") { const S = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")); walk((S[id.replace(/-\d+$/, "")] || []).map((r) => r.en), strings); }
  strings = [...new Set(strings)].filter((s) => /[A-Za-z]/.test(s) && words.some((w) => s.includes(w)));
  for (const s of strings) {
    const base = course === "student" ? LU.firstSlashAlternative(s) : s;
    const spoken = SF.lessonSpeechForm(lessonKey, base);
    if (spoken === base) continue;
    pairs.push({ lesson: lessonKey, text: s, oldKey: H.expectedClip(base), newKey: H.expectedClip(spoken) });
  }
}
const oldKeys = new Map(pairs.map((p) => [p.oldKey, p])), newKeys = new Map(pairs.map((p) => [p.newKey, p]));
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
const RE = /^(student|grammar2|reading|ld)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
const latest = new Map();
for (const f of fs.readdirSync(FEAT).filter((x) => RE.test(x))) for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
  if (!l.trim()) continue; let r; try { r = JSON.parse(l); } catch { continue; }
  if (!table[`${r.course}/${r.id}`] && !table[`${r.course}/${r.id.replace(/-\d+$/, "")}`]) continue;
  if (ONLY && `${r.course}/${r.id}` !== ONLY) continue;
  const k = `${r.course}|${r.id}|${r.viewport}`; const p = latest.get(k); if (!p || new Date(p.at) < new Date(r.at)) latest.set(k, r);
}
const byControl = {};
let oldHits = 0, newHits = 0, tts = 0;
for (const r of latest.values()) for (const a of r.audio || []) {
  const ctl = String(a.control || "").replace(/ #\d+$/, "").replace(/\(\d+\/\d+\)/, "(k/n)");
  for (const c of a.clips || []) {
    const o = oldKeys.get(c.path), n = newKeys.get(c.path);
    if (!o && !n) continue;
    const k = `${r.course} ${r.viewport} · ${ctl}`;
    byControl[k] = byControl[k] || { old: 0, new: 0 };
    if (o) { byControl[k].old++; oldHits++; } else { byControl[k].new++; newHits++; }
  }
  if ((a.tts || []).some((t) => pairs.some((p) => t.includes(p.text.slice(0, 20))))) tts++;
}
console.log(`고친 소리 글 ${pairs.length}(쪽 ${new Set(pairs.map((p) => p.lesson)).size}) · 기록 ${latest.size} · 옛 꼴 클립 요청 ${oldHits} · 새 꼴 클립 요청 ${newHits} · 브라우저 음성으로 넘어간 버튼 ${tts}`);
for (const [k, v] of Object.entries(byControl).sort()) console.log(`  ${v.old ? "✘ 옛 꼴" : "  새 꼴"} ${k} — 새 ${v.new} · 옛 ${v.old}`);
if (ONLY) for (const p of pairs) console.log(`  문장: "${p.text}" → 새 ${p.newKey} · 옛 ${p.oldKey}`);
