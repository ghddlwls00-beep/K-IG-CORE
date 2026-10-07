#!/usr/bin/env node
/**
 * tools-c (2026-10-08 UI검토-1007 고침3) — the words the fixed tools now EXPECT, checked against the app's SOURCE (no browser).
 * For the tools that cannot run on the local build without a licence (docs/pass-off-grammar/검사/drive-topic-lock.cjs ·
 * drive-topic-admin.cjs · check-progress-live.mjs — they need a licensed local server or the live site) this is the only check
 * before the deploy: every word they wait for must be what the app draws, made the way the app makes it (the app's own
 * curriculumPresentation.ts functions, the component's own template), and none of the old words may be left in a tool's code.
 *   node static-check.cjs            → the working tree's app (must PASS)
 *   node static-check.cjs --break    → the app at HEAD (dc68238e — before 고침3; must FAIL: the tools' new words are not there yet)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../../../..");
const BREAK = process.argv.includes("--break");
const src = (rel) => (BREAK ? execFileSync("git", ["show", `HEAD:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) : fs.readFileSync(path.join(REPO, rel), "utf8"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const loadSrc = (rel) => { const js = ts.transpileModule(src(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, () => ({})); return m.exports; };
const PRES = loadSrc("src/lib/curriculumPresentation.ts");
// --break reads the tools at HEAD too (before this worker's fixes — the old words must be found there)
const tool = (rel) => (BREAK ? execFileSync("git", ["show", `HEAD:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) : fs.readFileSync(path.join(REPO, rel), "utf8"));
const code = (t) => t.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join("\n"); // comments out
const rows = [];
const check = (id, ok, note) => { rows.push({ id, ok: !!ok, note }); console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${note}`); };
const has = (rel, s) => src(rel).includes(s);
const safe = (f) => { try { return f(); } catch (e) { return `ERR ${e.message}`; } };

const DASH = "src/components/CourseDashboard.tsx";
const END = "src/components/LessonEndBar.tsx";
const WRAP = "src/components/passoff/WrapUpStep.tsx";
const MAP = "src/app/passoff-grammar/map/page.tsx";
const PLESSON = "src/app/passoff-grammar/[lesson]/page.tsx";

// 59
check("59 LessonEndBar: '이 강의 학습 완료' · '학습 완료함 · 취소하려면 누르세요' are the names (drive-topic-lock END_BAR · pressComplete · D3d · D3f)", has(END, 'const TODO_NAME = "이 강의 학습 완료"') && has(END, 'const DONE_NAME = "학습 완료함 · 취소하려면 누르세요"') && has(END, "aria-label={completed ? DONE_NAME : TODO_NAME}") && !has(END, "aria-pressed={completed}"), END);
// 17
check("17 WrapUpStep: 'Step 1~5를 모두 마쳤어요' (drive-topic-lock D3a · drive-passoff · dp.cjs · wrongspot)", has(WRAP, "Step 1~5를 모두 마쳤어요") && !has(WRAP, "5단계를 모두 마쳤어요"), WRAP);
check("17 WrapUpStep: '대주제 {n} 마무리' (drive-topic-lock D3g)", /대주제 \{[^}]+\} 마무리/.test(src(WRAP)) && !/TOPIC \{[^}]+\} 마무리/.test(src(WRAP)), WRAP);
// 41 · 8 — the list
check("41 CourseDashboard: '진도 저장됨' · '진도를 맞추는 중…' (drive-topic-lock D2a · D8a · drive-topic-admin)", has(DASH, '"진도 저장됨"') && has(DASH, '"진도를 맞추는 중…"') && !has(DASH, '&& "서버에 저장됨"'), DASH);
check("41 CourseDashboard: '이용권 등록 후 열려요' (drive-topic-lock D1)", has(DASH, "이용권 등록 후 열려요"), DASH);
const p1 = safe(() => PRES.passoffTopicWithParticle(1, "을/를"));
check("8 · 41 '대주제 1을 마치면 열려요' (topic line) · '대주제 1을 마치면 열림' (row) — passoffTopicWithParticle + CourseDashboard (D2c · D2d · D9a)", p1 === "대주제 1을" && has(DASH, "${passoffPrevious} 마치면 열려요") && has(DASH, "${passoffPrevious} 마치면 열림"), `passoffTopicWithParticle(1) = ${p1}`);
const p2 = safe(() => PRES.passoffTopicWithParticle(2, "이/가"));
check("8 '대주제 2가 열렸어요.' (drive-topic-lock D4a)", p2 === "대주제 2가" && has(DASH, '{passoffTopicWithParticle(passoffNotice, "이/가")} 열렸어요.'), `passoffTopicWithParticle(2, 이/가) = ${p2}`);
check("41 STUDENT '1장을 마치면 열려요' (drive-topic-admin M1)", has(DASH, "`${sectionIndex}장을 마치면 열려요`"), DASH);
const p3 = safe(() => PRES.passoffTopicWithParticle(3, "은/는"));
check("8 map page '대주제 3은 아직 열리지 않았어요' (check-progress-live L14c)", p3 === "대주제 3은" && has(MAP, "passoffTopicWithParticle") && has(MAP, "아직 열리지 않았어요"), `passoffTopicWithParticle(3, 은/는) = ${p3}`);
const g2 = safe(() => PRES.formatGroupTitle("passoff-grammar", "TOPIC 2. 동사의 현재형"));
check("8 lock screen's current topic = formatGroupTitle (drive-topic-lock D6a)", g2 === "대주제 2 · 동사의 현재형" && has(PLESSON, "formatGroupTitle"), `formatGroupTitle = ${g2}`);
const s12 = safe(() => PRES.formatLessonPresentation("student", JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student/s1-2.json"), "utf8"))).title);
check("8 STUDENT neighbour '1-2 · …' (check-student-0927 C2)", typeof s12 === "string" && s12.startsWith("1-2 · "), `title = ${s12}`);
const h16 = safe(() => PRES.formatGroupTitle("student", "Chapter 16. 또 다른 장래 희망 (통역사) (My Other Dream Job (Interpreter))"));
check("8 STUDENT list head '16장 · …' (check-student-titles-live marker)", h16 === "16장 · 또 다른 장래 희망 (통역사)", `formatGroupTitle = ${h16}`);
// 7 · 6
check("7 GrammarLearningView: data-answer-player-step · data-owns-answer-player (g1-page · g2-driver · drive-common-0926 · check-top-player)", has("src/components/GrammarLearningView.tsx", "data-answer-player-step") && has("src/components/GrammarLearningView.tsx", "data-owns-answer-player"), "GrammarLearningView.tsx");
check("6 ReadingLearningView: data-comprehension=\"waiting\" (drive-reading · check-lesson-questions-0928)", has("src/components/ReadingLearningView.tsx", 'data-comprehension="waiting"'), "ReadingLearningView.tsx");
// 25
check("25 lesson page: a script page's neighbours = canonicalLessonId (lib/expectations · g2-driver · drive-reading)", has("src/app/[course]/[lesson]/page.tsx", "canonicalLessonId(course, id)") && has("src/app/[course]/[lesson]/page.tsx", "getLessonContext(course, neighboursOf)"), "[course]/[lesson]/page.tsx");

// the tools themselves: no old word left in their CODE (comments may tell the history)
const OLD = [/학습 완료 체크/, /학습 완료 취소/, /aria-label\^="학습 완료"/, /5단계를 모두 마쳤어요(?!.*Step 1~5)/, /서버에 저장됨/, /진도를 서버와 맞추는 중/, /TOPIC 1을 마치면 열림/, /1장을 마치면 열립니다/, /TOPIC 1 마무리/, /TOPIC 2가 열렸어요\.'/, /다음 강의: Ch /, /학습 완료 \(체크\|취소\)/];
const TOOLS = [
  "docs/qa-2026-09-18/scripts/check-student-0927.cjs", "docs/qa-2026-09-18/scripts/check-voca-0927.cjs", "docs/qa-2026-09-18/scripts/gap-checks-0926.cjs", "docs/qa-2026-09-18/scripts/drive-reading.cjs",
  "docs/qa-2026-09-18/scripts/drive-generic.cjs", "docs/qa-2026-09-18/scripts/drive-passoff.cjs", "docs/qa-2026-09-18/scripts/lib/g1-page.cjs",
  "docs/qa-2026-09-18/scripts/lib/g2-driver.cjs", "docs/qa-2026-09-18/scripts/lib/student-page.cjs",
  "docs/qa-2026-09-18/회귀점검-1002/단계3/s3b-passoff-review-기록/dp.cjs", "docs/qa-2026-09-18/회귀점검-1002/단계3/s3c-passoff-map-기록/dp.cjs",
  "docs/pass-off-grammar/검사/drive-topic-lock.cjs", "docs/pass-off-grammar/검사/drive-topic-admin.cjs", "docs/pass-off-grammar/검사/check-progress-live.mjs",
];
for (const t of TOOLS) {
  const c = code(tool(t)).split("\n");
  const left = c.filter((l) => OLD.some((re) => re.test(l)) && !/\|5단계를 모두 마쳤어요/.test(l) && !/OLD|REVERT|kept for an old build/.test(l));
  check(`tool code has no old word: ${path.basename(t)}`, left.length === 0, left.length ? left.map((l) => l.trim().slice(0, 100)).join(" ┃ ") : "0");
}

const out = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/c-tools-c");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `static-check${BREAK ? "-break" : ""}.json`), JSON.stringify({ at: new Date().toISOString(), app: BREAK ? "HEAD" : "working tree", rows }, null, 1));
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} PASS (app: ${BREAK ? "HEAD — must FAIL" : "working tree"})`);
process.exit(rows.every((r) => r.ok) ? 0 : 1);
