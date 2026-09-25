// 발음 기호 꼴(소유자 '라')로 새로 만든 소리 글과 클립 — 쪽 · 글 · 새 키(발음 기호) · 지금 운영 키(397f1e8 한글 꼴) · 고치기 전 키(영어식) · 파일이 있는지.
//   node ipa-clips-list.cjs <out.json>
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
const plain = { ...base, lessonSpeechForm: (_k, t) => t };
const clean = (t) => us.normalizeUnifiedSpeechText(vs.vocaSpeechForm(String(t)));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
const ldScripts = readJson("content/ld_english_scripts.json"), dictionary = readJson("content/voca_dictionary.json");
const A = path.join(REPO, "public/audio/azure-ava/v1");
const seen = new Map();
for (const pageKey of Object.keys(now.LESSON_SPEECH_WORDS)) {
  const [course, id] = pageKey.split("/");
  if (course === "ld") continue;
  const f = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(f)) continue;
  const index = readJson(`content/courses/${course}.json`).lessons || [];
  const pid = pairIdOf(course, id, index);
  const pf = pid && path.join(REPO, "content/lessons", course, `${pid}.json`);
  const pair = pid ? { id: pid, ...(fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")) : {}) } : null;
  const lesson = JSON.parse(fs.readFileSync(f, "utf8"));
  const texts = (sf) => spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns: { ...base, lessonSpeechForm: sf } });
  const a = texts(now.lessonSpeechForm), b = texts(then.lessonSpeechForm), c = texts(plain.lessonSpeechForm);
  a.forEach((t, i) => {
    const n = clean(t);
    if (!/⟨/.test(n) || seen.has(n)) return;
    const hangul = clean(b[i] ?? ""), english = clean(c[i] ?? "");
    const key = us.unifiedSpeechKey(n), hk = us.unifiedSpeechKey(hangul), ek = us.unifiedSpeechKey(english);
    seen.set(n, { page: pageKey, text: n, written: english, key, file: fs.existsSync(path.join(A, `${key}.mp3`)), hangulKey: hk, hangulFile: fs.existsSync(path.join(A, `${hk}.mp3`)), englishKey: ek, englishFile: fs.existsSync(path.join(A, `${ek}.mp3`)) });
  });
}
const list = [...seen.values()];
fs.writeFileSync(process.argv[2], JSON.stringify(list, null, 1));
console.log(`새 꼴 글 ${list.length} · 새 파일 있음 ${list.filter((x) => x.file).length} · 지금 운영(한글 꼴) 파일 있음 ${list.filter((x) => x.hangulFile).length} · 고치기 전 파일 있음 ${list.filter((x) => x.englishFile).length}`);
