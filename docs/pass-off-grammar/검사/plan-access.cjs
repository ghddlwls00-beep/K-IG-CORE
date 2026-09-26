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
 * exit 1 on any failure.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["drop-passoff", "old-gate", "old-copy"].includes(BREAK)) throw new Error(`모르는 --break=${BREAK}`);

const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const load = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, require);
  return mod.exports;
};
let licenseSrc = read("src/lib/license.ts");
if (BREAK === "drop-passoff") licenseSrc = licenseSrc.replace(/STUDENT_PASS_COURSES: readonly string\[\] = \["student", "passoff-grammar"\]/, 'STUDENT_PASS_COURSES: readonly string[] = ["student"]');
const { planOpensCourse, STUDENT_PASS_COURSES, STUDENT_PASS_SCOPE } = load(licenseSrc);
if (typeof planOpensCourse !== "function") throw new Error("planOpensCourse 를 license.ts 에서 못 찾음 — 이 검사가 아무것도 안 봄");
// courses.ts 는 타입만 import 하므로 혼자 옮겨 돌릴 수 있음
const { COURSE_BY_SLUG } = load(read("src/lib/courses.ts"));
if (!COURSE_BY_SLUG || typeof COURSE_BY_SLUG.get !== "function") throw new Error("COURSE_BY_SLUG 를 courses.ts 에서 못 찾음");

const PLANS = ["1M", "1Y", "LIFE", "STU", "STU1M", "STU1Y", "STULIFE"];
const COURSES = ["student", "passoff-grammar", "grammar1", "grammar2", "phonics", "ld", "reading"];
const STUDENT_OPENS = new Set(["student", "passoff-grammar"]);
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
    must: [/return planOpensCourse\(plan, course\);/, /return planOpensCourse\(stored\.plan, courseSlug\);/, /\|student\|passoff-grammar\)\\\/\[\^\/\]\+\$\//],
    mustNot: [/!isStudentOnlyPlan\(plan\) \|\| course === "student"/, /return courseSlug === "student";/],
  },
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
console.log(`\n2. 부르는 곳 — ${SITES.length}개 파일${BREAK === "old-gate" || BREAK === "old-copy" ? ` [일부러 깸: ${BREAK}]` : ""}`);
for (const s of SITES) {
  let text = read(s.file);
  if (BREAK === "old-gate" && s.file.endsWith("[lesson]/page.tsx")) {
    text = text.replace(/accessAllowed = planOpensCourse\(session\.payload\.plan, course\);/, 'accessAllowed = isStudentOnlyPlan(session.payload.plan) ? course === "student" : true;');
  }
  if (BREAK === "old-copy" && s.file.endsWith("LicenseModal.tsx")) text = text.replace(/"STUDENT 패스 회원"/, '"STUDENT 전용 회원"');
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
