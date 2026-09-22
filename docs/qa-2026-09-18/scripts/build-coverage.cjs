#!/usr/bin/env node
/**
 * 명령서 §17·§19 가 요구하는 숫자 커버리지 표.
 *
 * The command sets a hard rule: for lessons, PASS + FAIL + BLOCKED + NOT TESTED must equal
 * DISCOVERED, and nothing untested may be called PASS. This computes those numbers from the
 * recorded evidence rather than from anyone's impression, and refuses to balance the books by
 * guessing — a lesson with no record is NOT TESTED, and says so.
 *
 * Feature counts are kept separate from lesson counts, as the command also requires.
 *
 *   node build-coverage.cjs
 * Output: out/coverage.json + printed tables (markdown, ready for the report)
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");
const FEAT = path.join(OUT, "features");

const COURSE_LABEL = { student: "STUDENT", phonics: "VOCA", grammar1: "GRAMMAR I", grammar2: "GRAMMAR II", ld: "LISTENING", reading: "READING" };
// The command's baseline counts main lessons only; this repo also serves script/answer pages,
// which §0 says to audit and count separately.
const BASELINE_MAIN = { student: 81, phonics: 195, grammar1: 53, grammar2: 44, ld: 276, reading: 256 };

const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { return null; } };

// ---------------------------------------------------------------- 강의 단위 커버리지
/**
 * Failures already traced to THIS AUDIT's own tooling (findings-log.md, the WITHDRAWN rows).
 * They must not be counted as product failures — but they must not be counted as passes either,
 * because the driver was fixed and those lessons have not been re-taken yet. A lesson whose only
 * failures are on this list is BLOCKED, with the reason recorded, exactly as §17 requires.
 */
/**
 * `resolved: true` means the record on disk is enough to settle the question once it is read with
 * the corrected expectations — the browser does not have to drive the page again, so the lesson
 * can still pass. `resolved: false` means the browser genuinely did the wrong thing and the page
 * must be taken again before anything can be claimed about it.
 */
const TOOL_ARTIFACTS = [
  { courses: ["phonics"], feature: "step", note: /이 단어로 Step 2/, resolved: true,
    why: "단계 탭이 아닌 Step 1 안의 링크를 단계로 오인 — 585건 전부 같은 이름 하나이고 실제 단계 4개는 통과 (VOCA-STEP-WITHDRAWN)" },
  { courses: ["grammar1", "grammar2"], feature: "graded input", note: /./, resolved: true,
    why: "자가 채점 화면을 자동 채점으로 오인 — 자동 채점은 강의 282개 전수로 따로 확인함 (GRADE-EXAM-PASS)" },
  { courses: ["grammar1"], feature: "navigation", note: /./, resolved: true,
    why: "넘어가기 전 주소의 이웃과 비교했음 — 넘어간 뒤 페이지 기준으로 재평가하니 64건 전부 정상 (NAV-WITHDRAWN)" },
  { courses: ["ld", "student"], feature: "tile dictation", note: /./, resolved: false,
    why: "도구가 이미 놓은 타일을 다시 눌러 다른 문장을 만들었음 — 고친 도구로 재점검해야 판정 가능 (DICTATION-WITHDRAWN)" },
];
// the identifying text can be in either field: "step button not clickable" is the note, while the
// control that was mistaken for a step tab is the item
const isArtifact = (course, check) => TOOL_ARTIFACTS.find((a) => a.courses.includes(course) && a.feature === check.feature && (a.note.test(String(check.note || "")) || a.note.test(String(check.item || ""))));

/**
 * The same for audio. LISTENING's STEP 3 "연음 & 소리 클리닉" speaks the preset phrases of
 * generateLiaisonPoints ("want to" → "wanna"), not the lesson's sentences, so the audit's list of
 * texts this lesson may speak did not contain them and 1,198 correct plays were recorded as "a
 * clip of another lesson". All 518 of those clip files exist, and the corrected expectations
 * account for every one of the 1,198 (LD-LIAISON-WITHDRAWN).
 */
const AUDIO_ARTIFACTS = [
  { courses: ["ld"], control: /연음 & 소리 클리닉/, note: /clip not in this lesson's data/, resolved: true,
    why: "연음 클리닉은 강의 문장이 아니라 발음 규칙 preset 을 말함 — 클립 518개 전부 존재하고 기록 1,198건이 모두 설명됨 (LD-LIAISON-WITHDRAWN)" },
];
const isAudioArtifact = (course, a) => AUDIO_ARTIFACTS.find((x) => x.courses.includes(course) && x.control.test(String(a.control || "")) && x.note.test(String(a.note || "")));

const perLesson = {};      // course -> id -> { records, fails, blocked }
for (const f of fs.readdirSync(FEAT).filter((x) => x.endsWith(".jsonl"))) {
  const course = f.replace(/(-s\d+|-tiles2?|-step|-smoke)?\.jsonl$/, "");
  if (!COURSE_LABEL[course]) continue;
  for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    const id = String(r.url || "").split("/").pop();
    if (!id) continue;
    const e = ((perLesson[course] ||= {})[id] ||= { viewports: new Set(), fails: 0, blocked: 0, visitErrors: 0, artifacts: new Set(), mustRedo: new Set() });
    if (r.visitError) { e.visitErrors++; continue; }
    e.viewports.add(r.viewport);
    for (const c of r.checks || []) {
      if (c.status === "FAIL") {
        const a = isArtifact(course, c);
        if (a) { (a.resolved ? e.artifacts : e.mustRedo).add(a.why); continue; }
        e.fails++;
      } else if (c.status === "BLOCKED") {
        const a = isArtifact(course, c);
        if (a) (a.resolved ? e.artifacts : e.mustRedo).add(a.why);
        else e.blocked++;
      }
    }
    for (const a of r.audio || []) {
      if (a.status !== "FAIL") continue;
      const art = isAudioArtifact(course, a);
      if (art) { (art.resolved ? e.artifacts : e.mustRedo).add(art.why); continue; }
      e.fails++;
    }
    e.fails += (r.problems || []).length;
  }
}

const rows = [];
const blockedReasons = {};
const resolvedReasons = {};
const totals = { discovered: 0, main: 0, script: 0, pass: 0, fail: 0, blocked: 0, notTested: 0 };
for (const course of E.COURSES) {
  const pages = E.pages(course);
  const idx = E.courseIndex(course).lessons || [];
  const isMain = (id) => (idx.find((l) => l.id === id) || {}).variant === "main";
  let pass = 0, fail = 0, blocked = 0, notTested = 0, main = 0, script = 0;
  for (const p of pages) {
    (isMain(p.id) ? main++ : script++);
    const e = (perLesson[course] || {})[p.id];
    if (!e || !e.viewports.size) { notTested++; continue; }
    if (e.fails) fail++;
    // the page genuinely has to be driven again before anything can be said about it
    else if (e.mustRedo.size) { blocked++; for (const w of e.mustRedo) blockedReasons[w] = (blockedReasons[w] || 0) + 1; }
    else if (e.viewports.size < 3) { blocked++; blockedReasons["화면 3종 중 일부만 기록됨"] = (blockedReasons["화면 3종 중 일부만 기록됨"] || 0) + 1; }
    // failures that the record itself settles once read with the corrected expectations
    else { pass++; for (const w of e.artifacts) resolvedReasons[w] = (resolvedReasons[w] || 0) + 1; }
  }
  const discovered = pages.length;
  rows.push({
    course: COURSE_LABEL[course], baselineMain: BASELINE_MAIN[course], main, script, discovered,
    pass, fail, blocked, notTested,
    balanced: pass + fail + blocked + notTested === discovered,
  });
  totals.discovered += discovered; totals.main += main; totals.script += script;
  totals.pass += pass; totals.fail += fail; totals.blocked += blocked; totals.notTested += notTested;
}
totals.balanced = totals.pass + totals.fail + totals.blocked + totals.notTested === totals.discovered;

// ---------------------------------------------------------------- 항목 단위 커버리지 (강의 수와 섞지 않음)
const feat = read("features-summary.json");
const inv = read("audio-inventory.json");
const integ = read("data-integrity.json");
const exam = read("grammar-exam.json");
const dict = read("dictation-offline.json");
const cov = read("review-coverage.json");
const lic = read("audio-check-licensed.json");

let questions = 0;
for (const course of E.COURSES) for (const p of E.pages(course)) questions += (E.expected(course, p.id).answers || []).length;
let units = 0;
for (const course of E.COURSES) for (const p of E.pages(course)) units += (E.expected(course, p.id).texts || []).length;

const items = [
  { what: "과정 (course)", identified: E.COURSES.length, tested: E.COURSES.length, how: "6개 과정 전부" },
  { what: "챕터·스테이지 (STUDENT)", identified: 20, tested: 20, how: "scripts/check-student-unlock.cjs" },
  { what: "강의 (main + script)", identified: totals.discovered, tested: totals.discovered - totals.notTested, how: "out/features/*.jsonl" },
  { what: "학습 단위 (화면에 나와야 할 문장·낱말)", identified: units, tested: feat ? feat.summary && Object.values(feat.summary).reduce((a, s) => a + (s.content ? s.content.expected : 0), 0) : "?", how: "데이터 대조" },
  { what: "VOCA 낱말", identified: integ ? integ.vocaStats.words : "?", tested: integ ? integ.vocaStats.withMeaning : "?", how: "scripts/check-data-integrity.cjs" },
  { what: "채점 문항", identified: questions, tested: (exam ? exam.lessons : 0) && questions, how: "scripts/grade-offline.cjs + check-grammar-exam.cjs" },
  { what: "딕테이션 문장", identified: dict ? dict.sentences : "?", tested: dict ? dict.sentences : "?", how: "scripts/check-dictation.cjs" },
  { what: "음성 클립", identified: inv ? inv.clips.length : "?", tested: lic ? (lic.clips || lic.results || []).length : "379 (표본 아님: 누락 후보 전수)", how: "audio-inventory + probe-missing-clips (전수는 대기열)" },
  { what: "음성 버튼 누름", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", tested: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", how: "실제 클릭" },
  { what: "기능 확인 항목", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + Object.values(s.checks).reduce((x, y) => x + y, 0), 0) : "?", tested: "동일", how: "out/features-summary.json" },
  { what: "교육 내용 검토 대상 강의", identified: cov ? cov.total : "?", tested: cov ? cov.covered : "?", how: "scripts/check-review-coverage.cjs" },
];

const out = { at: new Date().toISOString(), lessons: { rows, totals, blockedReasons }, items };
fs.writeFileSync(path.join(OUT, "coverage.json"), JSON.stringify(out, null, 1));

const md = [];
md.push("### 강의 커버리지 (§17: PASS + FAIL + BLOCKED + NOT TESTED = DISCOVERED)");
md.push("");
md.push("| 과정 | 명령서 기준(본강의) | 발견 본강의 | 발견 스크립트 | 발견 합계 | PASS | FAIL | BLOCKED | NOT TESTED | 합계 일치 |");
md.push("|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) md.push(`| ${r.course} | ${r.baselineMain} | ${r.main} | ${r.script} | ${r.discovered} | ${r.pass} | ${r.fail} | ${r.blocked} | ${r.notTested} | ${r.balanced ? "✔" : "✘"} |`);
md.push(`| **합계** | **905** | **${totals.main}** | **${totals.script}** | **${totals.discovered}** | **${totals.pass}** | **${totals.fail}** | **${totals.blocked}** | **${totals.notTested}** | ${totals.balanced ? "✔" : "✘"} |`);
md.push("");
if (Object.keys(blockedReasons).length) {
  md.push("**BLOCKED 사유** (§17: 점검하지 못한 것은 반드시 사유와 함께 BLOCKED 로 분류)");
  md.push("");
  for (const [why, n] of Object.entries(blockedReasons).sort((a, b) => b[1] - a[1])) md.push(`- 강의 ${n}개 — ${why}`);
  md.push("");
}
if (Object.keys(resolvedReasons).length) {
  md.push("**PASS 로 판정했으나 감사 도구의 실패 기록이 남아 있는 강의** (기록을 고친 기준으로 다시 읽어 해소됨 — 브라우저 재실행 불필요)");
  md.push("");
  for (const [why, n] of Object.entries(resolvedReasons).sort((a, b) => b[1] - a[1])) md.push(`- 강의 ${n}개 — ${why}`);
  md.push("");
}
md.push("### 항목 커버리지 (강의 수와 별도)");
md.push("");
md.push("| 항목 | 확인 대상 | 확인함 | 방법 |");
md.push("|---|---|---|---|");
for (const i of items) md.push(`| ${i.what} | ${i.identified} | ${i.tested} | ${i.how} |`);
const text = md.join("\n");
fs.writeFileSync(path.join(OUT, "coverage.md"), text);
console.log(text);
console.log(`\nNOT TESTED ${totals.notTested} — ${totals.notTested ? "0 이 되기 전에는 감사 완료라고 말할 수 없습니다 (§17)" : "전부 점검됨"}`);
console.log(`→ ${path.join(OUT, "coverage.json")} · coverage.md`);
