#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 이용권 판정 검사 (설계 §6 · D3).
 *
 * 1. 표: 요금제 7개 × 과정 7개를 src/lib/license.ts 의 planOpensCourse 로 돌려 기대와 대조한다.
 *    STUDENT 이용권(STU · STU1M · STU1Y · STULIFE) → STUDENT · PASS-OFF GRAMMAR 만 열림, GRAMMAR I·II · VOCA · LISTENING · READING 잠김.
 *    올패스(1M · 1Y · LIFE) → 모두 열림.
 * 2. 부르는 곳: 판정이 흩어져 있던 자리(설계 §6 목록)가 모두 planOpensCourse(또는 STUDENT_PASS_COURSES)를 쓰고,
 *    옛 판정 꼴(`isStudentOnlyPlan(...) ? course === "student"` 등)이 남지 않았는지 코드 글자로 본다.
 *    LicenseProvider 의 SERVER_GATED_LESSON_PATH 에 새 slug 가 있는지도. 이용권이 여는 과정을 말하는 문구
 *    (내 이용권 창 · 잠금 화면 · 관리자 요금제)가 'STUDENT 전용' 이 아니라 license.ts 의 STUDENT_PASS_SCOPE 를 쓰는지도(점검 2026-09-27).
 * 3. 이름: license.ts 의 STUDENT_PASS_SCOPE("STUDENT · PASS-OFF GRAMMAR")가 courses.ts 의 STUDENT_PASS_COURSES 과정 이름과 같은지
 *    (license.ts 는 import 가 없어야 해서 이름을 글로 적어 둠 — 과정을 더하거나 이름을 바꾸면 여기서 멈춤).
 *
 *   node docs/pass-off-grammar/검사/plan-access.cjs
 *   node docs/pass-off-grammar/검사/plan-access.cjs --break=drop-passoff   일부러 깨기: STUDENT_PASS_COURSES 에서 passoff-grammar 를 뺀 license.ts(메모리) → 표 · 이름 FAIL
 *   node docs/pass-off-grammar/검사/plan-access.cjs --break=old-gate       일부러 깨기: page.tsx 판정을 옛 꼴로 되돌린 글(메모리) → 부르는 곳 FAIL
 *   node docs/pass-off-grammar/검사/plan-access.cjs --break=old-copy       일부러 깨기: 내 이용권 창 문구를 옛 'STUDENT 전용 회원' 으로(메모리) → 부르는 곳 FAIL
 *
 * LECTURE (2026-10-17 · docs/lecture/도구-기록.md): 사장님 '올패스로만'(docs/lecture/README.md 1장) — 표에 lecture(STU… 잠김 · 올패스 열림)와,
 *   빠져 있던 adult(사장님 2026-10-02 'STUDENT 이용권도 열기' — license.ts STUDENT_PASS_COURSES)를 더함. 부르는 곳에 LECTURE 의 서버 잠금
 *   (src/app/lecture/[lesson]/page.tsx · api/progress/lecture)과 LicenseProvider 길 목록의 lecture 를 더함.
 *   drop-passoff 깨기는 STUDENT_PASS_COURSES 가 ["student", "passoff-grammar"] 꼴일 때만 바꿨다 — ADULT 가 들어온 뒤(10-02)로는 아무것도
 *   안 바꾸고 PASS(exit 0)였다(10-17 확인). 이제 목록 안의 "passoff-grammar" 를 꼴과 상관없이 빼고, 못 빼면 exit 2.
 *   node docs/pass-off-grammar/검사/plan-access.cjs --break=lecture-student  일부러 깨기: STUDENT_PASS_COURSES 에 lecture 를 더한 license.ts(메모리)
 *                                                                          → 표(STU… × lecture 열림) · 이름 FAIL
 *   node docs/pass-off-grammar/검사/plan-access.cjs --break=lecture-path     일부러 깨기: LicenseProvider 길 목록에서 lecture 를 뺀 글(메모리) → 부르는 곳 FAIL
 * exit 1 on any failure.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["drop-passoff", "old-gate", "old-copy", "lecture-student", "lecture-path"].includes(BREAK)) throw new Error(`모르는 --break=${BREAK}`);

const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const load = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, require);
  return mod.exports;
};
let licenseSrc = read("src/lib/license.ts");
if (BREAK === "drop-passoff" || BREAK === "lecture-student") {
  // 목록 꼴과 상관없이(머리말 LECTURE) — 바꾸지 못하면 이 깨기는 아무것도 증명 못 함
  const before = licenseSrc;
  licenseSrc = BREAK === "drop-passoff"
    ? licenseSrc.replace(/(STUDENT_PASS_COURSES: readonly string\[\] = \[[^\]]*?)"passoff-grammar",?\s*/, "$1")
    : licenseSrc.replace(/(STUDENT_PASS_COURSES: readonly string\[\] = \[[^\]]*?)\]/, '$1, "lecture"]');
  if (licenseSrc === before) { console.log(`!!! --break=${BREAK}: license.ts 의 STUDENT_PASS_COURSES 를 못 바꿈 — 아무것도 증명 못 함 · exit 2`); process.exit(2); }
  console.log(`[일부러 깸] ${BREAK}: ${licenseSrc.match(/STUDENT_PASS_COURSES: readonly string\[\] = \[[^\]]*\]/)[0]}`);
}
const { planOpensCourse, STUDENT_PASS_COURSES, STUDENT_PASS_SCOPE } = load(licenseSrc);
if (typeof planOpensCourse !== "function") throw new Error("planOpensCourse 를 license.ts 에서 못 찾음 — 이 검사가 아무것도 안 봄");
// courses.ts 는 타입만 import 하므로 혼자 옮겨 돌릴 수 있음
const { COURSE_BY_SLUG } = load(read("src/lib/courses.ts"));
if (!COURSE_BY_SLUG || typeof COURSE_BY_SLUG.get !== "function") throw new Error("COURSE_BY_SLUG 를 courses.ts 에서 못 찾음");

const PLANS = ["1M", "1Y", "LIFE", "STU", "STU1M", "STU1Y", "STULIFE"];
// 기대는 사장님 결정에서(코드에서 읽지 않음): STUDENT 패스 = STUDENT · PASS-OFF GRAMMAR(D3 09-27) · ADULT(10-02), LECTURE 는 올패스만(10-17)
const COURSES = ["student", "passoff-grammar", "adult", "grammar1", "grammar2", "phonics", "ld", "reading", "lecture"];
const STUDENT_OPENS = new Set(["student", "passoff-grammar", "adult"]);
let fails = 0;
const rows = [];
for (const plan of PLANS) {
  const row = { plan };
  for (const course of COURSES) {
    const want = plan.startsWith("STU") ? STUDENT_OPENS.has(course) : true;
    const got = planOpensCourse(plan, course);
    row[course] = got === want ? (got ? "열림" : "잠김") : `틀림(${got ? "열림" : "잠김"})`;
    if (got !== want) fails++;
  }
  rows.push(row);
}
console.log(`1. 표 — 요금제 ${PLANS.length} × 과정 ${COURSES.length}${BREAK === "drop-passoff" ? " [일부러 깸: drop-passoff]" : ""}`);
console.table(rows);

// 2. 부르는 곳
const SITES = [
  { file: "src/app/[course]/[lesson]/page.tsx", must: [/planOpensCourse\(session\.payload\.plan, course\)/], mustNot: [/isStudentOnlyPlan\(/] },
  { file: "src/lib/mediaAccess.ts", must: [/planOpensCourse\(session\.payload\.plan, course\)/], mustNot: [/isStudentOnlyPlan\(/] },
  {
    file: "src/components/LicenseProvider.tsx",
    must: [
      /return planOpensCourse\(plan, course\);/, /return planOpensCourse\(stored\.plan, courseSlug\);/, /\|student\|passoff-grammar\)\\\/\[\^\/\]\+\$\//,
      // LECTURE: 서버가 잠그는 강의 길 목록에 lecture(브라우저가 잠긴 강의를 다시 그리지 않게)
      /SERVER_GATED_LESSON_PATH =\s*\/\^\\\/\((?:[a-z0-9-]+\|)*lecture(?:\|[a-z0-9-]+)*\)/,
    ],
    mustNot: [/!isStudentOnlyPlan\(plan\) \|\| course === "student"/, /return courseSlug === "student";/],
  },
  // LECTURE (2026-10-17): 자기 길의 서버 잠금 · 진도 API 가 같은 판정을 씀
  { file: "src/app/lecture/[lesson]/page.tsx", must: [/planOpensCourse\(session\.payload\.plan, "lecture"\)/], mustNot: [/isStudentOnlyPlan\(/] },
  { file: "src/app/api/progress/lecture/route.ts", must: [/planOpensCourse\(session\.payload\.plan, "lecture"\)/], mustNot: [/isStudentOnlyPlan\(/] },
  { file: "src/components/CourseDashboard.tsx", must: [/hasActiveLicense && planOpensCourse\(licenseInfo\?\.plan, courseSlug\)/], mustNot: [/!licenseInfo\?\.isStudentOnly \|\| courseSlug === "student"/] },
  {
    file: "src/components/LessonPaywall.tsx",
    must: [/planOpensCourse\(licenseInfo\?\.plan, courseSlug\)/, /STUDENT_PASS_COURSES\.includes\(courseSlug\)/, /\{STUDENT_PASS_SCOPE\}/],
    mustNot: [/STUDENT 전용/],
  },
  { file: "src/components/LicenseModal.tsx", must: [/\$\{STUDENT_PASS_SCOPE\}/], mustNot: [/STUDENT 전용/] },
  {
    file: "src/app/admin/license/page.tsx",
    must: [/import \{[^}]*STUDENT_PASS_SCOPE[^}]*\} from "@\/lib\/license"/, /\$\{STUDENT_PASS_SCOPE\}/, /\{STUDENT_PASS_SCOPE\}/],
    mustNot: [/"30일간 STUDENT 전 강의 열람"/, /STUDENT 전용/],
  },
];
console.log(`\n2. 부르는 곳 — ${SITES.length}개 파일${BREAK === "old-gate" || BREAK === "old-copy" || BREAK === "lecture-path" ? ` [일부러 깸: ${BREAK}]` : ""}`);
for (const s of SITES) {
  let text = read(s.file);
  if (BREAK === "old-gate" && s.file.endsWith("[lesson]/page.tsx")) {
    text = text.replace(/accessAllowed = planOpensCourse\(session\.payload\.plan, course\);/, 'accessAllowed = isStudentOnlyPlan(session.payload.plan) ? course === "student" : true;');
  }
  if (BREAK === "old-copy" && s.file.endsWith("LicenseModal.tsx")) text = text.replace(/"STUDENT 패스 회원"/, '"STUDENT 전용 회원"');
  if (BREAK === "lecture-path" && s.file.endsWith("LicenseProvider.tsx")) text = text.replace("|lecture|", "|");
  const missing = (s.must || []).filter((re) => !re.test(text)).map(String);
  const left = (s.mustNot || []).filter((re) => re.test(text)).map(String);
  const ok = !missing.length && !left.length;
  if (!ok) fails++;
  console.log(`   ${ok ? "PASS" : "FAIL"} ${s.file}${missing.length ? ` · 없음 ${missing.join(" ")}` : ""}${left.length ? ` · 옛 꼴 남음 ${left.join(" ")}` : ""}`);
}

// 3. 이름 — 문구의 과정 이름이 판정 목록과 같은가
const namesFromCourses = (STUDENT_PASS_COURSES || []).map((slug) => (COURSE_BY_SLUG.get(slug) || {}).title || `(courses.ts 에 없음: ${slug})`).join(" · ");
const namesOk = typeof STUDENT_PASS_SCOPE === "string" && STUDENT_PASS_SCOPE === namesFromCourses;
if (!namesOk) fails++;
console.log(`\n3. 이름 — license.ts STUDENT_PASS_SCOPE "${STUDENT_PASS_SCOPE}" · courses.ts 이름 "${namesFromCourses}" → ${namesOk ? "PASS" : "FAIL"}`);
console.log(`\n${fails ? "FAIL" : "PASS"} — 틀린 칸 · 파일 ${fails}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
process.exit(fails ? 1 : 0);
