// compare-shared-code --expect 허용 목록을 비교 전에 적는다 — 소리 꼴 둘째 판(발음 기호, 소유자 '라' 2026-09-26)으로 바뀌어야 할 것:
// 표에 든 쪽마다, 쪽이 소리 내는 글 가운데 397f1e8 의 표(한글 꼴)로 돈 글 → 지금 표(발음 기호 꼴)로 돈 글. 그 밖(제목 · 단계 · 어원 · 빗금 · 다른 쪽)은 바뀜 0 이어야.
//   node make-ipa-allow.cjs <out.json>
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const ts = require(path.join(REPO, "node_modules/typescript"));
const fromSrc = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, require); return m.exports; };
const L = (rel) => fromSrc(fs.readFileSync(path.join(REPO, rel), "utf8"));
const { spokenTexts, pairIdOf } = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const vs = L("src/lib/vocaSpeech.ts"), vu = L("src/lib/vocaUtils.ts"), lu = L("src/lib/listeningUtils.ts"), la = L("src/lib/lessonAudioText.ts"), us = L("src/lib/unifiedSpeech.ts");
const now = L("src/lib/lessonSpeechForm.ts");
const then = fromSrc(execFileSync("git", ["show", "397f1e8:src/lib/lessonSpeechForm.ts"], { cwd: REPO, encoding: "utf8" }));
const base = { vocaSpeechForm: vs.vocaSpeechForm, getCollocation: vu.getCollocation, generateLiaisonPoints: lu.generateLiaisonPoints, extractSentencesForAudio: la.extractSentencesForAudio, firstSlashAlternative: lu.firstSlashAlternative, vocaWordSpeech: vs.vocaWordSpeech, readingWordSpeech: vs.readingWordSpeech };
const clean = (t) => us.normalizeUnifiedSpeechText(vs.vocaSpeechForm(String(t)));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
const ldScripts = readJson("content/ld_english_scripts.json"), dictionary = readJson("content/voca_dictionary.json");
const pages = new Set([...Object.keys(now.LESSON_SPEECH_WORDS), ...Object.keys(then.LESSON_SPEECH_WORDS)]);
const out = [];
for (const pageKey of [...pages].sort()) {
  const [course, id] = pageKey.split("/");
  const f = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(f)) continue;
  const index = readJson(`content/courses/${course}.json`).lessons || [];
  const pid = pairIdOf(course, id, index);
  const pf = pid && path.join(REPO, "content/lessons", course, `${pid}.json`);
  const pair = pid ? { id: pid, ...(fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")) : {}) } : null;
  const lesson = JSON.parse(fs.readFileSync(f, "utf8"));
  const run = (sf) => new Set(spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns: { ...base, lessonSpeechForm: sf.lessonSpeechForm } }).map(clean).filter(Boolean));
  const a = run(then), b = run(now);
  const removed = [...a].filter((t) => !b.has(t)), added = [...b].filter((t) => !a.has(t));
  if (removed.length || added.length) out.push({ course, id, kind: "소리 글", added, removed });
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const by = {}; for (const o of out) by[o.course] = (by[o.course] || 0) + 1;
console.log(`허용 ${out.length}쪽 ${JSON.stringify(by)} · 글 +${out.reduce((n, o) => n + o.added.length, 0)} −${out.reduce((n, o) => n + o.removed.length, 0)} → ${process.argv[2]}`);
