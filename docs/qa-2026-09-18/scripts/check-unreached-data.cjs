#!/usr/bin/env node
/**
 * 7단계 7-1 c — 강의 파일에 있는데 학습자 화면(또는 소리)에 한 번도 닿지 않는 데이터를 **규칙으로** 찾는다.
 * 생긴 까닭: BUG-024(STUDENT 청크 드릴 1,103조각 — 9/7 83b007c 가 화면에서 뺀 뒤에도 파일에 남음)는 감사가 잡았고,
 * LISTENING 죽은 사본(dNNN-1 의 대본 블록 — BUG-013 에서 뺌)은 놓쳤다. 사람 눈이 아니라 코드와 데이터를 대어 본다.
 *
 * 1. 화면 코드에서 뽑는 것 (TypeScript 구문 트리):
 *    - LessonBody.tsx 의 과정 분기(`if (course === "…") return <XLearningView … />`) → 과정마다 화면 부품과 넘기는 속성.
 *    - 그 부품 파일과 그것이 부르는(import) src 안 파일 전부 → 읽는 칸 이름(obj.name · obj["name"] · 구조 분해)과
 *      블록 종류(`.type === "…"` · `!==` · switch · [..].includes(x.type)).
 *    - page.tsx LessonPage 본문이 읽는 칸 이름(LessonBody 로 넘기기만 하는 속성은 빼고).
 *    - 위 '전체 듣기' 가 소리 내는 글: page.tsx 의 **실제 extractSentencesForAudio 를 강의마다 돌려**(구문 트리에서 꺼내 옮겨 실행)
 *      나온 문장이 든 블록을 '닿음' 으로 친다 — 앞에서 돌려준 것이 있으면 뒤 길은 안 쓰이는 차례까지 코드 그대로.
 *      짝 강의는 content.ts getLessonContext 의 짝 규칙(본문 ↔ '-N' 대본 · GRAMMAR I 짝수 ↔ 홀수)을 옮긴 것으로 — 그 코드 자리도 확인.
 * 2. 데이터에서 뽑는 것: 과정마다 강의 파일의 맨 위 칸(메타 칸 빼고) · 블록 종류 · 블록 안 칸 · 문항(items/rows) 안 칸 ·
 *    READING 문장 · 카드 칸 · LISTENING 대본(content/ld_english_scripts.json) 칸.
 * 3. 코드가 읽기는 하지만 **다른 데이터가 있으면 버려지는 길**(대체 길)은 규칙 목록 FALLBACKS 에 코드 자리(정규식)와 함께 적는다 —
 *    그 자리가 코드에서 사라지면 이 검사가 멈춘다(규칙을 다시 보라는 뜻). 지금 규칙: LISTENING 의 instruction · paragraph · sentences 블록은
 *    대본(ld_english_scripts)이 없을 때만 쓰임(LdLearningView koSentences · page.tsx extractSentencesForAudio 의 ld 분기).
 * 4. 결과: 과정마다 '아무 화면도 읽지 않는 것'. 이미 알고 결정을 기다리는 것은 unreached-data-known.json(과정 · 종류 · 등록부 번호 · 결정)에 —
 *    거기 없는 새 것이 있거나, 거기 있는데 지금 없는(낡은) 줄이 있으면 exit 1.
 * 주소가 있는 6개 과정만 본다(src/lib/generated/validRoutes.json). CNN · GVA · basics · middle 은 대상 아님.
 *
 *   node check-unreached-data.cjs                 지금 데이터
 *   node check-unreached-data.cjs --rev 034e91b   그 커밋의 데이터(코드는 지금 화면) — 깨기: STUDENT chunkDrills 가 나와야 함
 *   node check-unreached-data.cjs --rev 8325e10   BUG-013 전 LISTENING 대본 사본이 나와야 함
 *   node check-unreached-data.cjs --list          과정마다 읽는 블록 종류 · 칸 이름까지 보임
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const argv = process.argv;
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const REV = opt("--rev");
const LIST = argv.includes("--list");
const KNOWN_FILE = process.env.KIG_UNREACHED_KNOWN || path.join(REPO, "docs/qa-2026-09-18/unreached-data-known.json");
const VR = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"].filter((c) => (VR.lessons[c] || []).length);
const META = new Set(["id", "course", "series", "variant", "pairId", "title", "label", "menuLabel", "unit", "part", "order", "legacyPath", "legacyEncoding", "audio", "video"]);

// ── 코드 ──────────────────────────────────────────────────────────────────────────────
const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const parse = (rel) => ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest, true, /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
function resolveImport(fromRel, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(fromRel), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    const abs = path.join(REPO, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return c.replace(/\\/g, "/");
  }
  return null;
}
const isTypeProp = (e) => e && (ts.isPropertyAccessExpression(e) || ts.isPropertyAccessChain?.(e)) && e.name && e.name.text === "type";
/** 노드 아래에서 읽는 칸 이름 · 블록 종류를 모음. skip(node) 가 참이면 그 아래는 건너뜀 */
function collect(root, acc, skip = () => false) {
  const visit = (n) => {
    if (skip(n)) return;
    if (ts.isPropertyAccessExpression(n)) acc.names.add(n.name.text);
    else if (ts.isElementAccessExpression(n) && n.argumentExpression && ts.isStringLiteralLike(n.argumentExpression)) acc.names.add(n.argumentExpression.text);
    else if (ts.isBindingElement(n)) { const k = n.propertyName || n.name; if (k && (ts.isIdentifier(k) || ts.isStringLiteralLike(k))) acc.names.add(k.text); }
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind)) {
      const lit = [n.left, n.right].find((e) => ts.isStringLiteralLike(e));
      if (lit && [n.left, n.right].some(isTypeProp)) acc.types.add(lit.text);
    }
    if (ts.isSwitchStatement(n) && isTypeProp(n.expression)) for (const c of n.caseBlock.clauses) if (ts.isCaseClause(c) && ts.isStringLiteralLike(c.expression)) acc.types.add(c.expression.text);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "includes" && ts.isArrayLiteralExpression(n.expression.expression) && n.arguments[0] && isTypeProp(n.arguments[0])) {
      for (const e of n.expression.expression.elements) if (ts.isStringLiteralLike(e)) acc.types.add(e.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
}
function reachable(startRel) {
  const seen = new Set();
  const queue = [startRel];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    const sf = parse(f);
    const visit = (n) => {
      if (ts.isImportDeclaration(n) && !(n.importClause && n.importClause.isTypeOnly)) { const r = resolveImport(f, n.moduleSpecifier.text); if (r) queue.push(r); }
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) { const r = resolveImport(f, n.arguments[0].text); if (r) queue.push(r); }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return [...seen];
}
const coursesIn = (expr) => {
  const out = new Set();
  const visit = (n) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
      const [a, b] = [n.left, n.right];
      if (ts.isIdentifier(a) && a.text === "course" && ts.isStringLiteralLike(b)) out.add(b.text);
      if (ts.isIdentifier(b) && b.text === "course" && ts.isStringLiteralLike(a)) out.add(a.text);
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "includes" && ts.isArrayLiteralExpression(n.expression.expression) && n.arguments[0] && ts.isIdentifier(n.arguments[0]) && n.arguments[0].text === "course") {
      for (const e of n.expression.expression.elements) if (ts.isStringLiteralLike(e)) out.add(e.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(expr);
  return [...out];
};
/** LessonBody 의 과정 분기 → { course: { view, file, props } } */
function lessonBodyMap() {
  const rel = "src/components/LessonBody.tsx";
  const sf = parse(rel);
  const dyn = {};
  const findDyn = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === "dynamic") {
      const imp = (function first(m) { if (ts.isCallExpression(m) && m.expression.kind === ts.SyntaxKind.ImportKeyword) return m; let r = null; ts.forEachChild(m, (c) => { if (!r) r = first(c); }); return r; })(n.initializer);
      if (imp && ts.isStringLiteralLike(imp.arguments[0])) dyn[n.name.text] = resolveImport(rel, imp.arguments[0].text);
    }
    ts.forEachChild(n, findDyn);
  };
  findDyn(sf);
  let fn = null;
  const findFn = (n) => { if (ts.isFunctionDeclaration(n) && n.name && n.name.text === "LessonBody") fn = n; else ts.forEachChild(n, findFn); };
  findFn(sf);
  if (!fn) throw new Error("LessonBody 함수를 못 찾음 — 이 검사를 다시 보라");
  const map = {};
  for (const st of fn.body.statements) {
    if (!ts.isIfStatement(st)) continue;
    const courses = coursesIn(st.expression);
    if (!courses.length) continue;
    let el = null;
    const findJsx = (n) => { if (el) return; if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) el = n; else ts.forEachChild(n, findJsx); };
    findJsx(st.thenStatement);
    if (!el) continue;
    const view = el.tagName.getText(sf);
    const props = el.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText(sf));
    for (const c of courses) if (!map[c]) map[c] = { view, file: dyn[view] || null, props };
  }
  return map;
}
const PAGE_REL = "src/app/[course]/[lesson]/page.tsx";
// 7단계 7-2: 위 '전체 듣기' 의 함수는 page.tsx 에서 src/lib/lessonAudioText.ts 로 글자 그대로 옮겼다
const AUDIO_TEXT_REL = "src/lib/lessonAudioText.ts";
// 7단계 7-3(BUG-023): page.tsx 가 쓰이는 과정의 화면을 직접 그린다 — LessonBody 처럼 넘기기만 하는 속성이므로 뺀다(화면이 읽는 칸은 화면 쪽에서 셈)
const PASS_THROUGH_TAGS = new Set(["LessonBody", "LessonSpeechGuard", "LdLearningView", "ReadingLearningView", "GrammarLearningView", "PhonicsLearningView", "StudentLearningView"]);
/** page.tsx LessonPage 본문이 읽는 칸 이름(LessonBody · 과정 화면에 넘기기만 하는 속성은 뺌) — 블록 종류는 아래 실제 실행으로 */
function pageReads() {
  const sf = parse(PAGE_REL);
  const acc = { names: new Set(), types: new Set() };
  let found = 0;
  const visit = (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === "LessonPage") {
      found++;
      collect(n, acc, (m) => (ts.isJsxSelfClosingElement(m) || ts.isJsxOpeningElement(m)) && PASS_THROUGH_TAGS.has(m.tagName.getText(sf)));
    } else ts.forEachChild(n, visit);
  };
  visit(sf);
  if (found !== 1) throw new Error("page.tsx 에서 LessonPage 를 못 찾음 — 이 검사를 다시 보라");
  return { names: acc.names, types: new Set() };
}
/** 위 '전체 듣기' 의 extractSentencesForAudio(와 그것이 부르는 cleanText · isEnglishText)를 꺼내 JS 로 옮겨 실행할 수 있게 */
function loadExtractor() {
  const sf = parse(AUDIO_TEXT_REL);
  const want = ["extractSentencesForAudio", "cleanText", "isEnglishText"];
  const parts = [];
  const visit = (n) => { if (ts.isFunctionDeclaration(n) && n.name && want.includes(n.name.text)) parts.push(n.getText(sf)); else ts.forEachChild(n, visit); };
  visit(sf);
  if (parts.length !== want.length) throw new Error(`${AUDIO_TEXT_REL} 에서 ${want.join(" · ")} 를 다 못 찾음(${parts.length}) — 이 검사를 다시 보라`);
  const js = ts.transpileModule(parts.join("\n\n"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  // lessonAudioText.ts 의 함수는 export 가 붙어 있어 옮긴 코드가 exports 를 찾는다 — 빈 것을 넘김
  return new Function("exports", `${js}\nreturn extractSentencesForAudio;`)({});
}
/** content.ts getLessonContext 의 짝 규칙을 옮긴 것 — 코드 자리를 먼저 확인 */
const PAIR_ANCHORS = [
  /l\.variant === "script" && l\.id\.startsWith\(`\$\{id\}-`\)/,
  /l\.variant === "main" && id\.startsWith\(`\$\{l\.id\}-`\)/,
  /if \(course === "grammar1"\) \{\s*const m = id\.match\(\/\^gh1-\(\\d\+\)\(-\\d\+\)\?\$\/\);/,
  /if \(num % 2 === 0\) \{\s*const target = `gh1-\$\{pad\(num \+ 1\)\}\$\{sub\}`;/,
];
function pairOf(course, id, index) {
  const current = index.find((l) => l.id === id);
  let pairId = current && current.variant === "main"
    ? (index.find((l) => l.variant === "script" && l.id.startsWith(`${id}-`)) || {}).id
    : (index.find((l) => l.variant === "main" && id.startsWith(`${l.id}-`)) || {}).id;
  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10), sub = m[2] || "", pad = (n) => String(n).padStart(3, "0");
      const other = num % 2 === 0 ? num + 1 : num - 1;
      if (index.some((l) => l.id === `gh1-${pad(other)}${sub}`)) pairId = `gh1-${pad(other)}${sub}`;
      else if (index.some((l) => l.id === `gh1-${pad(other)}`)) pairId = `gh1-${pad(other)}`;
    }
  }
  return pairId || null;
}

/** 코드가 읽지만 다른 데이터가 있으면 버려지는 길 — 코드 자리를 함께 적고 확인한다 */
const FALLBACKS = [
  {
    course: "ld",
    types: ["instruction", "paragraph", "sentences"],
    deadWhen: (ctx) => ctx.hasScript,
    why: "LISTENING 은 대본(ld_english_scripts)을 먼저 씀 — 이 블록들은 대본이 없을 때의 대체 길(LdLearningView koSentences · page.tsx extractSentencesForAudio ld 분기)",
    anchors: [
      ["src/components/LdLearningView.tsx", /if \(ldEnglishScript && ldEnglishScript\.length > 0\) \{\s*return ldEnglishScript;\s*\}\s*return koSentences\.map/],
      ["src/components/LdLearningView.tsx", /const scriptBlocks = isScript \? blocks : \(pairBlocks \|\| \[\]\);/],
      ["src/components/LdLearningView.tsx", /for \(const b of scriptBlocks\) \{\s*if \(b\.type === "instruction"\)/],
      [AUDIO_TEXT_REL, /if \(course === "ld"\) \{\s*if \(ldEnglishScript && ldEnglishScript\.length > 0\) \{\s*const enList = [^\n]*\n\s*if \(enList\.length > 0\) return enList;/],
    ],
  },
];
for (const f of FALLBACKS) for (const [file, re] of f.anchors) if (!re.test(read(file))) {
  console.log(`!!! 대체 길 규칙의 코드 자리가 사라짐: ${file} ${re} — 코드가 바뀌었으니 FALLBACKS 를 다시 보라 · exit 1`);
  process.exit(1);
}
for (const re of PAIR_ANCHORS) if (!re.test(read("src/lib/content.ts"))) {
  console.log(`!!! 짝 규칙의 코드 자리가 사라짐: src/lib/content.ts ${re} — getLessonContext 가 바뀌었으니 pairOf 를 다시 보라 · exit 1`);
  process.exit(1);
}

const LB = lessonBodyMap();
const PAGE = pageReads();
const extract = loadExtractor();
const codeFor = {};
for (const c of COURSES) {
  const m = LB[c];
  if (!m || !m.file) throw new Error(`${c}: LessonBody 에서 화면 부품을 못 찾음 — 이 검사를 다시 보라`);
  const files = reachable(m.file);
  const acc = { names: new Set(PAGE.names), types: new Set() };
  for (const f of files) collect(parse(f), acc);
  // LessonBody 가 그 부품에 넘기는 속성 이름(데이터 맨 위 칸이 부품에 가는 길)
  for (const p of m.props) acc.names.add(p);
  codeFor[c] = { ...m, files, names: acc.names, types: acc.types };
}

// ── 데이터 ────────────────────────────────────────────────────────────────────────────
const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const listLessons = (c) => (REV ? git(["ls-tree", "--name-only", `${REV}:content/lessons/${c}`]).split(/\r?\n/) : fs.readdirSync(path.join(REPO, "content/lessons", c))).filter((f) => f.endsWith(".json"));
const loadJson = (rel) => JSON.parse(REV ? git(["show", `${REV}:${rel}`]) : read(rel));
const ldScripts = loadJson("content/ld_english_scripts.json");

// 위 '전체 듣기' 가 소리 내는 블록 — 강의 쪽(주소)마다 실제 extractSentencesForAudio 를 돌려 나온 문장이 든 블록
const lessonsOf = {};
const spoken = new Set(); // `${course}/${id}#${블록 번호}`
const clean = (s) => String(s || "").replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const blockTexts = (b) => [b.text, ...(Array.isArray(b.items) ? b.items.map((it) => it && it.text) : []), ...(Array.isArray(b.rows) ? b.rows.flat() : [])].filter((t) => typeof t === "string" && t.trim()).map(clean);
let pagesRun = 0;
for (const c of COURSES) {
  lessonsOf[c] = {};
  for (const f of listLessons(c)) lessonsOf[c][f.replace(/\.json$/, "")] = loadJson(`content/lessons/${c}/${f}`);
  const index = loadJson(`content/courses/${c}.json`).lessons || [];
  for (const id of VR.lessons[c] || []) {
    const d = lessonsOf[c][id];
    if (!d || !(d.blocks || []).length) continue;
    const pid = pairOf(c, id, index);
    const pair = pid ? lessonsOf[c][pid] : null;
    // 위 플레이어가 뜨는 쪽만: STUDENT 는 녹음이 하나일 때만(page.tsx topLevelAudio · 둘 이상이면 [] 이고 fallback 줄도 안 보임)
    const audio = (d.audio || []).filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
    if (c === "student" && audio.length !== 1) continue;
    const script = (ldScripts[id.replace(/-1$/, "")] || (pid ? ldScripts[pid.replace(/-1$/, "")] : null)) || null;
    const out = new Set(extract(d.blocks, pair ? pair.blocks : null, d.variant === "script", c, c === "ld" ? script : null, d.readingSentences ?? (pair ? pair.readingSentences : null)));
    pagesRun++;
    if (!out.size) continue;
    for (const [lid, lesson] of [[id, d], [pid, pair]]) {
      if (!lesson) continue;
      (lesson.blocks || []).forEach((b, i) => {
        const texts = blockTexts(b);
        if (texts.some((t) => out.has(t) || [...out].some((s) => s.length >= 3 && t.includes(s)))) spoken.add(`${c}/${lid}#${i}`);
      });
    }
  }
}

const found = []; // { course, kind, what, lessons:Set, count, why? }
const add = (course, kind, what, lesson, n = 1, why) => {
  const k = `${course}|${kind}|${what}`;
  let f = found.find((x) => x.key === k);
  if (!f) { f = { key: k, course, kind, what, lessons: new Set(), count: 0, why }; found.push(f); }
  f.lessons.add(lesson); f.count += n;
};
const keysOf = (objs) => { const s = new Set(); for (const o of objs) if (o && typeof o === "object" && !Array.isArray(o)) for (const k of Object.keys(o)) s.add(k); return s; };
const summary = {};
for (const c of COURSES) {
  const code = codeFor[c];
  const ids = Object.keys(lessonsOf[c]);
  summary[c] = { lessons: ids.length, blocks: 0, spoken: 0 };
  for (const id of ids) {
    const d = lessonsOf[c][id];
    for (const k of Object.keys(d)) {
      if (META.has(k) || k === "blocks") continue;
      if (!code.names.has(k)) add(c, "맨 위 칸", k, id, Array.isArray(d[k]) ? d[k].length : 1);
      else if (Array.isArray(d[k])) for (const inner of keysOf(d[k])) if (!code.names.has(inner)) add(c, `${k} 안 칸`, inner, id);
    }
    // LISTENING: 대본이 있는 강의 짝인지(대체 길 규칙)
    const base = id.replace(/-\d+$/, "");
    const ctx = { hasScript: Array.isArray(ldScripts[base]) && ldScripts[base].length > 0 };
    for (const [i, b] of (d.blocks || []).entries()) {
      summary[c].blocks++;
      const isSpoken = spoken.has(`${c}/${id}#${i}`);
      if (isSpoken) summary[c].spoken++;
      const fb = FALLBACKS.find((x) => x.course === c && x.types.includes(b.type) && x.deadWhen(ctx));
      if (fb && !isSpoken) { add(c, "블록(대체 길만)", `${b.type} (${d.variant === "script" ? "대본 쪽" : "본문 쪽"})`, id, 1, fb.why); continue; }
      if (!code.types.has(b.type) && !isSpoken) { add(c, "블록", b.type, id); continue; }
      if (!code.types.has(b.type)) continue; // 소리로만 닿는 블록 — 안 칸은 extractSentencesForAudio 가 쓰는 text · items · rows 뿐
      for (const k of Object.keys(b)) {
        if (k === "type") continue;
        if (!code.names.has(k)) add(c, `${b.type} 블록 안 칸`, k, id);
        else if (Array.isArray(b[k])) for (const inner of keysOf(b[k])) if (!code.names.has(inner)) add(c, `${b.type}.${k} 안 칸`, inner, id);
      }
    }
  }
  if (c === "ld") for (const rows of Object.values(ldScripts)) for (const inner of keysOf(rows)) if (!code.names.has(inner)) add(c, "대본 줄 안 칸", inner, "(ld_english_scripts)");
}

// ── 알고 있는 것과 대조 ───────────────────────────────────────────────────────────────
const known = fs.existsSync(KNOWN_FILE) ? JSON.parse(fs.readFileSync(KNOWN_FILE, "utf8")) : [];
const kk = (x) => `${x.course}|${x.kind}|${x.what}`;
const knownKeys = new Set(known.map(kk));
const fresh = found.filter((f) => !knownKeys.has(f.key));
const stale = known.filter((k) => !found.some((f) => f.key === kk(k)));
console.log(`${REV ? `[데이터 ${REV} · 코드 지금] ` : ""}과정 ${COURSES.length} · 대체 길 규칙 ${FALLBACKS.length} · 짝 규칙(코드 자리 확인됨) · '전체 듣기' 를 돌린 강의 쪽 ${pagesRun}`);
for (const c of COURSES) {
  const code = codeFor[c];
  const mine = found.filter((f) => f.course === c);
  console.log(`\n== ${c} — 강의 ${summary[c].lessons} · 블록 ${summary[c].blocks}(위 '전체 듣기' 로 소리 나는 블록 ${summary[c].spoken}) · 화면 ${code.view} (코드 파일 ${code.files.length})`);
  if (LIST) console.log(`   읽는 블록 종류: ${[...code.types].sort().join(" · ")}`);
  if (!mine.length) console.log("   아무 화면도 읽지 않는 것: 없음");
  for (const f of mine) console.log(`   ${knownKeys.has(f.key) ? "알고 있음" : "새로 찾음"} · ${f.kind} ${f.what} — ${f.lessons.size}과 · ${f.count}개${f.why ? ` (${f.why})` : ""}`);
}
const jsonOut = opt("--json");
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(found.map((f) => ({ course: f.course, kind: f.kind, what: f.what, lessons: f.lessons.size, count: f.count })), null, 1));
console.log(`\n아무 화면도 읽지 않는 것 ${found.length}가지 · 그중 알고 있는 것(unreached-data-known.json) ${found.length - fresh.length} · 새로 찾음 ${fresh.length} · 낡은 줄 ${stale.length}`);
for (const s of stale) console.log(`  낡은 줄(지금 없음): ${s.course} ${s.kind} ${s.what}`);
process.exit(fresh.length || stale.length ? 1 : 0);
