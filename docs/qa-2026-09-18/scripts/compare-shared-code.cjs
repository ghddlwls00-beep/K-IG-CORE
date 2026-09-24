#!/usr/bin/env node
/**
 * 관문 15 셋째 길 ③ (소유자 2026-09-24 '셋째 길로') — 여러 과정이 함께 쓰는 코드를 고친 뒤, **그 코드 때문에** 화면 글이나
 * 소리 글이 달라진 쪽을 모두 적는다. 같은 내용(지금 content/ 와 src 의 .json)을 두 코드로 돌려 견준다:
 *   (가) 바탕 커밋(--base)의 코드 — src/ · scripts/lib/ 에서 바탕과 다른 코드 파일(.ts · .tsx · .cjs · .js · .mjs)만 바탕 글로 읽음
 *   (나) 지금 코드 — 작업 트리 그대로
 * 내용은 둘 다 지금 것이므로 다른 것은 코드 때문이다(내용 고침으로 바뀐 쪽은 expect-diff 와 관문 0 순서표가 따로 다룬다).
 *
 * 보는 것 — 주소가 있는 6개 과정(src/lib/generated/validRoutes.json 의 lessons)의 모든 쪽:
 *   ① 강의 쪽 제목 · 부제 · 뱃지 · 코드 — formatLessonPresentation(과정, 강의 파일)
 *      ([course]/[lesson]/page.tsx · student/[lesson]/page.tsx 가 부르는 꼴)
 *   ② 과정 목록 · 검색의 제목 · 부제 — formatLessonPresentation(과정, 과정 색인 content/courses/<과정>.json 의 .lessons 항목)
 *      ([course]/page.tsx · scripts/buildSearchIndex.ts 가 부르는 꼴)
 *   ③ 과정 목록의 단계 이름 — formatGroupTitle(과정, 묶음 label) ([course]/page.tsx)
 *   ④ 쪽이 소리 내는 글 → 클립 키 — scripts/lib/spoken-texts.cjs spokenTexts(생성기 · 무료 소리 키 · 감사와 같은 한 정의 —
 *      VOCA 낱말 단추 vocaWordSpeech · READING 낱말 카드 readingWordSpeech · 위 '전체 듣기' 까지) → unifiedSpeechKey
 *   ⑤ VOCA 격자 낱말마다 어원 카드 — analyzeEtymology(PhonicsLearningView 의 낱말 카드 · 퀴즈 어원 힌트)
 *   ⑥ STUDENT 문장 · LISTENING 대본 영어마다 빗금 나누기 — expandSlashAlternatives(낱말 조각 정답 차례 · 첫 꼴 소리, 결정 B 둘1)
 * 화면 부품(.tsx 컴포넌트)이 그리는 모양은 이 도구가 보지 못한다 — 그런 코드가 바뀐 과정은 관문 0 이 전부 다시 돈다.
 *
 * --expect <json>: 허용된 바뀜 [{course, id, kind, added?, removed?}] — 실제 바뀜이 허용과 **꼭 같아야** exit 0
 *   (허용 밖 바뀜이 하나라도 있거나, 허용된 바뀜이 하나라도 안 나타나면 exit 1). --expect 가 없으면 바뀜 0 이어야 exit 0.
 * --break=presentation | speech | missing : 깨기 시험(파일은 그대로, 메모리 안에서만) — 모두 exit 1 이 나와야 이 도구를 믿는다.
 *   presentation: (나)의 formatGroupTitle 이 LISTENING 단계 이름 끝에 ' ·' 를 붙임 → ③ 이 허용 밖으로 늘어야
 *   speech:       (나)의 VOCA 발음 표에 격자 첫 낱말(표에 없는 것)을 더함 → ④ 가 허용 밖으로 늘어야
 *   missing:      (나)의 VOCA 발음 표에서 complement 를 뺌 → 허용된 hv-50 소리 바뀜이 안 나타나야
 *   slash:        (나)의 빗금 나누기를 '모든 꼴 끝 마침표 허용' 으로 → 문장 끝 'him/her.' 문장이 허용 밖으로 바뀌어야
 *
 *   node docs/qa-2026-09-18/scripts/compare-shared-code.cjs --base <커밋> [--expect <json>] [--out <json>] [--break=…]
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BASE = arg("--base", null);
const EXPECT = arg("--expect", null);
const OUT = arg("--out", null);
const BREAK = (argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (!BASE) { console.error("사용: --base <커밋> [--expect <json>] [--out <json>] [--break=presentation|speech|missing]"); process.exit(2); }
if (BREAK && !["presentation", "speech", "missing", "slash"].includes(BREAK)) { console.error(`--break=${BREAK} 는 없다`); process.exit(2); }
const ts = require(path.join(REPO, "node_modules/typescript"));
const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 256 << 20 });
const lines = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const isCode = (rel) => /\.(ts|tsx|cjs|js|mjs)$/.test(rel);

// ── (가) 에서 바탕 글로 읽을 코드 파일
const changedCode = lines(git(["diff", "--name-only", BASE, "--", "src", "scripts/lib"])).filter(isCode);
const newCode = lines(git(["ls-files", "--others", "--exclude-standard", "--", "src", "scripts/lib"])).filter(isCode);
const baseText = new Map();
for (const rel of changedCode) { try { baseText.set(rel, git(["show", `${BASE}:${rel}`])); } catch { baseText.set(rel, null); } }
for (const rel of newCode) baseText.set(rel, null);

function makeLoader(name, useBase) {
  const cache = new Map();
  const relOf = (abs) => path.relative(REPO, abs).split(path.sep).join("/");
  const resolveSpec = (spec, fromDir) => {
    let p;
    if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
    else if (spec.startsWith(".")) p = path.join(fromDir, spec);
    else return null;
    for (const cand of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    return p;
  };
  const load = (file) => {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
      const m = { exports: data };
      m.exports.default = data;
      cache.set(file, m);
      return data;
    }
    const rel = relOf(file);
    let src;
    if (useBase && baseText.has(rel)) {
      src = baseText.get(rel);
      if (src == null) throw new Error(`${name}: ${rel} 은 바탕(${BASE})에 없는 코드 — 부르는 쪽도 바탕에서는 그것을 안 불러야 함`);
    } else src = fs.readFileSync(file, "utf8");
    const out = /\.tsx?$/.test(file)
      ? ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true }, fileName: file }).outputText
      : src;
    const m = { exports: {} };
    cache.set(file, m);
    const dir = path.dirname(file);
    const req = (spec) => {
      if (spec === "server-only") return {};
      const r = resolveSpec(spec, dir);
      if (r) return load(r);
      return Module.createRequire(path.join(REPO, "package.json"))(spec);
    };
    new Function("require", "module", "exports", "__filename", "__dirname", out)(req, m, m.exports, file, dir);
    return m.exports;
  };
  const L = (rel) => load(path.join(REPO, rel));
  const cp = L("src/lib/curriculumPresentation.ts");
  const vs = L("src/lib/vocaSpeech.ts");
  const vu = L("src/lib/vocaUtils.ts");
  const lu = L("src/lib/listeningUtils.ts");
  const la = L("src/lib/lessonAudioText.ts");
  const us = L("src/lib/unifiedSpeech.ts");
  const st = L("scripts/lib/spoken-texts.cjs");
  return {
    name, cp, vs, vu, us, st, lu,
    fns: {
      vocaSpeechForm: vs.vocaSpeechForm, getCollocation: vu.getCollocation, generateLiaisonPoints: lu.generateLiaisonPoints,
      extractSentencesForAudio: la.extractSentencesForAudio, firstSlashAlternative: lu.firstSlashAlternative,
      vocaWordSpeech: vs.vocaWordSpeech, readingWordSpeech: vs.readingWordSpeech,
    },
  };
}
const A = makeLoader("(가) 바탕 코드", true);
const B = makeLoader("(나) 지금 코드", false);

// ── 내용(둘 다 지금 것)
const readJson = (rel) => { const f = path.join(REPO, rel); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")) : null; };
const routes = readJson("src/lib/generated/validRoutes.json");
const ldScripts = readJson("content/ld_english_scripts.json") || {};
const dictionary = readJson("content/voca_dictionary.json") || {};
const COURSES = B.st.SPOKEN_COURSES;
const gridWords = (d) => {
  const g = ((d && d.blocks) || []).find((b) => b && b.type === "wordgrid");
  return g && Array.isArray(g.rows) ? g.rows.flat().map((w) => String(w || "").trim()).filter(Boolean) : [];
};

// ── 깨기 시험(메모리 안에서만 (나)를 바꿈)
let breakNote = "";
if (BREAK === "presentation") {
  const orig = B.cp.formatGroupTitle;
  B.cp.formatGroupTitle = (s, l) => (s === "ld" ? `${orig(s, l)} ·` : orig(s, l));
  breakNote = "(나)의 formatGroupTitle 이 LISTENING 단계 이름 끝에 ' ·' 를 붙임";
} else if (BREAK === "speech") {
  const first = readJson("content/lessons/phonics/mv1-01.json");
  const w = gridWords(first).find((x) => !B.vs.VOCA_PRONUNCIATIONS[x]);
  B.vs.VOCA_PRONUNCIATIONS[w] = "ˈbreɪk";
  breakNote = `(나)의 VOCA 발음 표에 '${w}' 를 더함`;
} else if (BREAK === "missing") {
  delete B.vs.VOCA_PRONUNCIATIONS.complement;
  breakNote = "(나)의 VOCA 발음 표에서 complement 를 뺌";
} else if (BREAK === "slash") {
  // 결정 B 둘1 이 경고한 쉬운 고침 — 모든 꼴 끝의 마침표를 꼴에 넣음 → 문장 끝 'him/her.' 가 깨져야(허용 밖)
  const naive = /\(?([A-Za-z'’]+\.?(?:\/[A-Za-z'’]+\.?)+)\)?/g;
  B.lu.expandSlashAlternatives = (s) => {
    const groups = [...String(s).matchAll(naive)].map((m) => ({ whole: m[0], options: m[1].split("/").filter(Boolean) }));
    if (!groups.length) return [s];
    let v = [s];
    for (const g of groups) v = v.flatMap((x) => g.options.map((o) => x.replace(g.whole, o)));
    return [...new Set(v)];
  };
  breakNote = "(나)의 빗금 나누기를 '모든 꼴 끝 마침표 허용' 으로 바꿈";
}

const isSpeakable = (t) => /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(t);
const keysOf = (S, texts) => {
  const out = new Map();
  for (const value of texts) {
    const clean = S.us.normalizeUnifiedSpeechText(S.fns.vocaSpeechForm(String(value)));
    if (clean && isSpeakable(clean)) { const k = S.us.unifiedSpeechKey(clean); if (!out.has(k)) out.set(k, clean); }
  }
  return out;
};
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

const rows = [];
const counts = {};
const seen = (kind) => { counts[kind] = (counts[kind] || 0) + 1; };
for (const course of COURSES) {
  const index = readJson(`content/courses/${course}.json`) || {};
  const idx = index.lessons || [];
  // ③ 단계 이름
  for (const g of index.groups || []) {
    const label = g.label || g.title || "Group";
    const b = A.cp.formatGroupTitle(course, label), a = B.cp.formatGroupTitle(course, label);
    seen("단계 이름");
    if (b !== a) rows.push({ course, id: `묶음 ${label}`, kind: "단계 이름", before: b, after: a });
  }
  // ② 과정 목록 · 검색
  for (const l of idx) {
    const b = A.cp.formatLessonPresentation(course, l), a = B.cp.formatLessonPresentation(course, l);
    seen("목록·검색 제목");
    if (!same(b, a)) rows.push({ course, id: l.id, kind: "목록·검색 제목", before: b, after: a });
  }
  for (const id of (routes.lessons || {})[course] || []) {
    const lesson = readJson(`content/lessons/${course}/${id}.json`);
    if (!lesson) continue;
    // ① 강의 쪽
    const pb = A.cp.formatLessonPresentation(course, lesson), pa = B.cp.formatLessonPresentation(course, lesson);
    seen("강의 쪽 제목");
    if (!same(pb, pa)) rows.push({ course, id, kind: "강의 쪽 제목", before: pb, after: pa });
    // ④ 소리 내는 글
    const pid = B.st.pairIdOf(course, id, idx);
    const pair = pid ? { id: pid, ...(readJson(`content/lessons/${course}/${pid}.json`) || {}) } : null;
    const kb = keysOf(A, A.st.spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns: A.fns }));
    const ka = keysOf(B, B.st.spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns: B.fns }));
    seen("소리 글");
    const added = [...ka].filter(([k]) => !kb.has(k)).map(([, t]) => t).sort();
    const removed = [...kb].filter(([k]) => !ka.has(k)).map(([, t]) => t).sort();
    if (added.length || removed.length) rows.push({ course, id, kind: "소리 글", added, removed });
    // ⑥ 빗금 나누기(expandSlashAlternatives — 받아쓰기 낱말 조각의 정답 차례 · 첫 꼴 소리): STUDENT 문장 · LISTENING 대본 영어
    const slashTexts = course === "student"
      ? ((lesson.blocks || []).filter((b) => b && b.type === "sentences").flatMap((b) => b.items || []).map((it) => [it.n, it.text]))
      : course === "ld" && !/-\d+$/.test(id) ? (ldScripts[id] || []).map((r) => [r.n, r.en]) : [];
    for (const [n, t] of slashTexts) {
      if (typeof t !== "string") continue;
      const xb = A.lu.expandSlashAlternatives(t), xa = B.lu.expandSlashAlternatives(t);
      seen("빗금 나누기");
      if (!same(xb, xa)) rows.push({ course, id, kind: "빗금 나누기", word: `n${n}`, before: xb, after: xa });
    }
    // ⑤ VOCA 어원 카드
    if (course === "phonics") for (const w of new Set(gridWords(lesson))) {
      const eb = A.vu.analyzeEtymology(w), ea = B.vu.analyzeEtymology(w);
      seen("어원");
      if (!same(eb, ea)) rows.push({ course, id, kind: "어원", word: w, before: eb && eb.explanation, after: ea && ea.explanation });
    }
  }
}

// ── 허용과 견주기
const expected = EXPECT ? JSON.parse(fs.readFileSync(EXPECT, "utf8").replace(/^﻿/, "")) : [];
const keyOf = (r) => `${r.course}/${r.id}/${r.kind}${r.word ? `/${r.word}` : ""}`;
const want = new Map(expected.map((e) => [keyOf(e), e]));
const got = new Map(rows.map((r) => [keyOf(r), r]));
const extra = [...got.keys()].filter((k) => !want.has(k));
const missing = [...want.keys()].filter((k) => !got.has(k));
const detailBad = [];
for (const [k, e] of want) {
  const r = got.get(k);
  if (!r) continue;
  if (e.added && !same([...e.added].sort(), r.added)) detailBad.push(`${k}: 더해진 소리 글 ${JSON.stringify(r.added)} ≠ 허용 ${JSON.stringify(e.added)}`);
  if (e.removed && !same([...e.removed].sort(), r.removed)) detailBad.push(`${k}: 빠진 소리 글 ${JSON.stringify(r.removed)} ≠ 허용 ${JSON.stringify(e.removed)}`);
  if (e.after !== undefined && !same(e.after, r.after)) detailBad.push(`${k}: 바뀐 뒤 ${JSON.stringify(r.after)} ≠ 허용 ${JSON.stringify(e.after)}`);
}

// ── 보고
console.log(`바탕 ${BASE} 와 다른 코드 파일 ${changedCode.length + newCode.length}: ${[...changedCode, ...newCode].join(" · ") || "없음"}`);
if (BREAK) console.log(`(깨기 시험 --break=${BREAK} — ${breakNote})`);
console.log(`견준 것: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`코드 때문에 달라진 것 ${rows.length} (허용 ${expected.length} · 허용 밖 ${extra.length} · 허용인데 안 나타남 ${missing.length} · 내용이 허용과 다름 ${detailBad.length})`);
for (const r of rows) {
  const mark = want.has(keyOf(r)) ? "허용" : "**허용 밖**";
  const what = r.kind === "소리 글" ? `+${JSON.stringify(r.added)} −${JSON.stringify(r.removed)}`
    : r.kind === "어원" ? `${r.word}: ${JSON.stringify(r.before)} → ${JSON.stringify(r.after)}`
    : `${JSON.stringify(r.before)} → ${JSON.stringify(r.after)}`;
  console.log(`  [${mark}] ${r.course}/${r.id} ${r.kind} — ${what}`);
}
for (const k of missing) console.log(`  **허용인데 안 나타남** ${k}`);
for (const d of detailBad) console.log(`  **내용이 허용과 다름** ${d}`);
const pages = [...new Set(rows.map((r) => (r.kind === "단계 이름" ? `/${r.course}` : r.kind === "목록·검색 제목" ? `/${r.course} (목록 · 검색)` : `/${r.course}/${r.id}`)))].sort();
console.log(`다시 돌릴 쪽 ${pages.length}: ${pages.join(" · ") || "없음"}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ base: BASE, break: BREAK || null, changedCode: [...changedCode, ...newCode], counts, rows, extra, missing, detailBad, pages }, null, 1));
const ok = extra.length === 0 && missing.length === 0 && detailBad.length === 0;
console.log(ok ? "결과: 허용과 꼭 같음 (exit 0)" : "결과: 허용과 다름 (exit 1)");
process.exit(ok ? 0 : 1);
