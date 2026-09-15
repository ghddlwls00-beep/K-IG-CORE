// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
const fs = require("fs");
const O = (f) => JSON.parse(fs.readFileSync(`C:/Users/ghddl/AppData/Local/Temp/kq/out/${f}`, "utf8"));
const data = O("data-audit.json");
const div = O("reading-divergence.json");
const ldq = O("ld-transcript-quality.json");
const voca = O("voca-meaning-defects.json");
const media = O("media-check.json");
const crawl = O("prod-crawl.json");
const ui = fs.readFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/ui-LIFE.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const verify = fs.readFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/play-verify.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const ldScripts = JSON.parse(fs.readFileSync("C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/content/ld_english_scripts.json", "utf8"));
const posFlags = fs.readFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/reading-pos-flags.txt", "utf8").trim().split("\n");

const expected = O("expected.json");
const lessons = {};
for (const e of expected) lessons[`${e.section}|${e.id}`] = { section: e.section, id: e.id, defects: [] };
const add = (sec, id, sev, code, note) => { const k = `${sec}|${id}`; if (lessons[k]) lessons[k].defects.push({ sev, code, note }); };

// STUDENT
add("STUDENT", "s1-2", "P2", "KO_IN_EN", "영어 문장에 한글 자리표시 텍스트: 'I live at 한국Apartment.' / '한국 Elementary School'");
add("STUDENT", "s19-4", "P2", "SEQUENCE_GAP", "Chapter 19에 s19-3 없음 → 'Part 4'가 3번째 레슨으로 표시");
add("STUDENT", "s13-2", "P3", "KO_IN_EN", "'General Soon-Shin Lee (이순신)' 영어 문장 내 한글");
// VOCA
for (const v of voca) for (const id of v.lessons) add("VOCA", id, v.class === "INAPPROPRIATE" || v.class === "MALFORMED" ? "P1" : "P1", "MEANING_" + v.class, `${v.word} → '${v.shown}' (권장: ${v.suggested})`);
for (const i of data.issues.filter((x) => x.section === "VOCA" && ["AMBIGUOUS_QUIZ", "DUPLICATE_WORD_IN_LESSON", "SAME_MEANING_MULTIPLE_WORDS"].includes(x.code))) add("VOCA", i.lesson, i.code === "AMBIGUOUS_QUIZ" ? "P2" : "P3", i.code, i.detail);
add("VOCA", "hv-62", "P1", "MEANING_MALFORMED", "단어 셀이 '\"insistence,-cy\"' (따옴표·접미사 표기가 그대로 노출, 발음·퀴즈 대상 단어 깨짐)");
// GRAMMAR
for (const i of data.issues.filter((x) => (x.section === "GRAMMAR I" || x.section === "GRAMMAR II") && ["ANSWER_HAS_KOREAN", "EMPTY_MODEL_ANSWER"].includes(x.code))) add(i.section, i.lesson, i.code === "EMPTY_MODEL_ANSWER" ? "P1" : "P2", i.code, i.detail);
add("GRAMMAR II", "gh2-046", "P2", "PROMPT_UNUSABLE", "문항 7 한국어 문제가 '마찬가지.' 한 단어 → 영작 문제로 성립 불가");
// LISTENING
for (const r of ldq) {
  const s = ldScripts[r.id] || [];
  const unterm = s.map((x, i) => ({ i, t: x.en.trim() })).filter((x) => !/[.?!\u201d\u2019"')]$/.test(x.t));
  if (unterm.length) add("LISTENING", r.id, "P1", "TRANSCRIPT_SEGMENT_BROKEN", `${unterm.length}개 딕테이션 문장이 문장 중간에서 끊김 (예: #${unterm[0].i + 1} '…${unterm[0].t.slice(-45)}')`);
  if (r.hintMissRatio >= 0.5) add("LISTENING", r.id, "P1", "TRANSCRIPT_VS_ORIGINAL", `원본 레슨 어휘 힌트 ${r.hintMissing.length}/${r.hintWords}개가 영어 스크립트에 없음 (${r.hintMissing.slice(0, 5).join(", ")})`);
}
// READING
for (const r of div.filter((x) => x.kind !== "MINOR_TEXT_DIFF")) add("READING", r.id, "P1", "WRONG_PASSAGE", `화면 지문 '${r.alignedStart.slice(0, 60)}…' ≠ 원본 지문 '${r.legacyStart.slice(0, 60)}…' (영문 유사도 ${Math.round(r.dEn * 100)}%, 번역 유사도 ${Math.round(r.dKo * 100)}%)`);
for (const i of data.issues.filter((x) => x.section === "READING" && ["DUPLICATE_LESSON_CONTENT", "CLOZE_NOT_MASKED", "VOCAB_NOT_IN_PASSAGE"].includes(x.code))) add("READING", i.lesson, i.code === "VOCAB_NOT_IN_PASSAGE" ? "P3" : "P2", i.code, i.detail);
const posBy = {};
for (const l of posFlags) { const id = l.split(" ")[0]; (posBy[id] ||= []).push(l.slice(id.length + 1)); }
for (const [id, arr] of Object.entries(posBy)) add("READING", id, "P2", "VOCAB_POS_MEANING", `${arr.length}개 핵심어휘 품사/뜻 불일치 (예: ${arr[0].split(" :: ")[0]})`);

// Quiz answer keys — manual full review of every Q1 "correct" option against its passage/transcript
const RQ_OK = "001 002 003 004 005 007 008 010 012 017 031 052 065 076 079 080 082 091 093 096 111 124 130 132 145 152 153 155 159 163 166 185 186 187 189 192 195 196 197 199 207 216 223 231 236 238 248 249".split(" ").map((n) => `pr${n}`);
const RQ_FALLBACK = fs.readFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/reading-q1.txt", "utf8").trim().split("\n").filter((l) => l.split("|")[1] === "FALLBACK").map((l) => l.split("|")[0]);
for (let i = 1; i <= 256; i++) { const id = `pr${String(i).padStart(3, "0")}`; if (RQ_FALLBACK.includes(id)) add("READING", id, "P2", "QUIZ_Q1_GARBLED", "Q1 정답 보기가 '첫 문장 + 의 중요성 및 실천적 의미' 비문"); else if (!RQ_OK.includes(id)) add("READING", id, "P1", "QUIZ_Q1_WRONG_KEY", "Q1 '정답'이 지문 주제와 무관 (키워드 부분일치 규칙)"); }
const LQ_OK = "001 002 003 004 009 010 020 022 024 045 087 095 111 128 134 207 208 220 221 222 223 229".split(" ").map((n) => `d${n}`);
for (let i = 1; i <= 276; i++) { const id = `d${String(i).padStart(3, "0")}`; if (!LQ_OK.includes(id)) add("LISTENING", id, "P1", "QUIZ_Q1_WRONG_KEY", "Step 1 Q1 '정답'이 스크립트 내용과 무관 (기본값/키워드 규칙)"); }

// UI results
const uiBy = Object.fromEntries(ui.map((r) => [`${r.section}|${r.id}`, r]));
const verified = new Set(verify.filter((v) => v.attempts.includes("playing")).map((v) => `${v.section}|${v.id}`));
const sections = ["STUDENT", "VOCA", "GRAMMAR I", "GRAMMAR II", "LISTENING", "READING"];
const exp = { STUDENT: 81, VOCA: 195, "GRAMMAR I": 53, "GRAMMAR II": 44, LISTENING: 276, READING: 256 };
const coverage = {};
for (const s of sections) {
  const ls = Object.values(lessons).filter((l) => l.section === s);
  let pass = 0, fail = 0, blocked = 0, notTested = 0, uiOk = 0, playOk = 0;
  for (const l of ls) {
    const u = uiBy[`${s}|${l.id}`];
    const rendered = u && !u.err && u.res?.ready;
    if (rendered) uiOk++;
    if (u?.res?.play?.ok || verified.has(`${s}|${l.id}`)) playOk++;
    if (!u) { notTested++; continue; }
    if (!rendered) { blocked++; continue; }
    const hard = l.defects.filter((d) => d.sev !== "P3");
    if (hard.length) fail++; else pass++;
  }
  coverage[s] = { expected: exp[s], found: ls.length, tested: uiOk, pass, fail, blocked, notTested, playbackVerified: playOk };
}
const total = Object.values(coverage).reduce((a, c) => { for (const k in c) a[k] = (a[k] || 0) + c[k]; return a; }, {});
const out = { coverage, total, lessons: Object.values(lessons).filter((l) => l.defects.length), media: { audioStatus: media.audioStatus, avaStatus: media.avaStatus, audioMissing: media.audioMissing.map((x) => x.src), avaMissingBy: media.avaMissing.reduce((m, x) => ((m[`${x.section}:${x.via || "content"}`] = (m[`${x.section}:${x.via || "content"}`] || 0) + 1), m), {}), avaMissingSamples: media.avaMissing.filter((x) => x.via !== "liaison-card").map((x) => `${x.lesson}: ${x.text}`) }, uiErrors: ui.filter((r) => r.exc.length || (r.res?.errs || []).length).map((r) => r.id) };
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/report-data.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ coverage, total, uiErrors: out.uiErrors.length }, null, 1));
const failCodes = {};
for (const l of out.lessons) for (const d of l.defects) { const k = `${l.section} ${d.sev} ${d.code}`; failCodes[k] = failCodes[k] || new Set(); failCodes[k].add(l.id); }
console.log(Object.entries(failCodes).map(([k, v]) => `${k}: ${v.size} lessons`).join("\n"));
