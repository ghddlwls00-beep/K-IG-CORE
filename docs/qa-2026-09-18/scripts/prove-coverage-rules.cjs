#!/usr/bin/env node
/**
 * 7단계 7-1 m 깨기 — build-coverage.cjs 가 관문 6 · 11 숫자를 바르게 내는가. 만든 기록(실제 강의 id · 화면 3종)을 임시 폴더에 쓰고
 * 같은 도구를 지금 규칙과 옛 동작(--break=…)으로 돌려 강의 판정을 비교한다. 운영 · 브라우저를 건드리지 않음.
 *
 *   A  목록에 없는 BLOCKED 하나(데스크톱 control BLOCKED)        → 지금 BLOCKED(그 사유) · --break=ignore-blocked 는 PASS(옛 동작)
 *   B  옛 FAIL(09-20) + 같은 화면 새 PASS(09-24)                  → 지금 PASS · --break=merge-all 은 FAIL(옛 동작)
 *   C  --since · --files 둘 다 없이                                → exit 1
 *   D  고친 받아쓰기 루틴의 tile dictation FAIL(driverRev 있음)     → 지금 FAIL · --break=old-dictation-rule 은 BLOCKED(옛 동작)
 *   E  coveredBy 없는 NA                                           → BLOCKED 'NA 인데 대신 본 기록 없음'
 *   F  NA coveredBy tile dictation + 같은 기록에 tile PASS         → PASS
 *   G  옛 기록(driverRev 없음)의 'graded input · BLOCKED · tile-based answering' + tile PASS → PASS(옛 이름은 NA 로 읽음)
 *   H  같은 옛 이름이 새 기록(driverRev 있음)에 있으면            → BLOCKED(새 기록에서는 NA 로 안 읽음)
 *   I  새 기록의 tile dictation BLOCKED '(문장 못 고름)'           → BLOCKED 그대로(사유 '문장 못 고름')
 *   J  --since 가 옛 기록을 뺌(09-20 FAIL 만 있는 강의, --since 09-22) → NOT TESTED
 *   K  옛 드라이버의 'no bookmark control' NA                      → BLOCKED(머리 북마크는 모든 강의에 있음 — NA 아님)
 *   K2 그 자리에 없음(absentEvidence) + 같은 기록에 같은 기능 PASS  → PASS(ⓐ)
 *   K3 그 자리에 없음(absentEvidence) + 다른 자리 기록 없음         → BLOCKED
 *   K4 옛 STUDENT 'no completion control'                          → BLOCKED(3단계 '이 강의 학습 완료' 를 안 누름)
 *   L  표본 NA(새로고침 검사는 N강마다) + 같은 과정 다른 강의에 새로고침 PASS → PASS
 *   M  표본 NA + 그 과정 어디에도 새로고침 PASS 없음                → BLOCKED
 *   N  GRAMMAR graded input FAIL 넷 — 판정 없는 칸(자가 채점 · 빈칸 안내 · no feedback · [전체 채점하기]) → PASS(도구 탓 ⑥)
 *   O  GRAMMAR graded input FAIL 이 다른 문구(정답인데 '오답입니다')   → FAIL · --break=grammar-any-note 는 PASS(옛 동작 — 진짜 FAIL 을 삼킴)
 *   P  한쪽만 판정 없음(correct→no feedback · wrong→'정답입니다')     → FAIL
 * exit 0 = 모두 기대대로.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const TOOL = path.join(__dirname, "build-coverage.cjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kig-cov-proof-"));
const FEAT = path.join(dir, "features");
fs.mkdirSync(FEAT);

const VPS = ["desktop", "tablet", "mobile"];
const OLD = "2026-09-20T01:00:00.000Z", NEW = "2026-09-24T01:00:00.000Z";
const pass = (feature, item = "x") => ({ feature, item, status: "PASS", note: "" });
const rec = (course, id, viewport, at, checks, extra = {}) => ({ course, id, url: `/${course}/${id}`, viewport, at, steps: [], checks, audio: [], problems: [], ...extra });
const lines = [];
const all3 = (course, id, at, desktopChecks, extra = {}) => VPS.map((v) => rec(course, id, v, at, v === "desktop" ? desktopChecks : [pass("step")], extra));
// A — student s1-1
lines.push(...all3("student", "s1-1", NEW, [pass("step"), { feature: "control", item: "y", status: "BLOCKED", note: "A: 목록에 없는 막힘" }], { driverRev: "7-1m" }));
// B — student s1-2: old FAIL, then new PASS on the same screen
lines.push(rec("student", "s1-2", "desktop", OLD, [{ feature: "control", item: "z", status: "FAIL", note: "B: 옛 실패" }]));
lines.push(...all3("student", "s1-2", NEW, [pass("step")], { driverRev: "7-1m" }));
// D — student s1-3: fixed routine's tile FAIL
lines.push(...all3("student", "s1-3", NEW, [{ feature: "tile dictation", item: "t", status: "FAIL", note: "D: 정답을 오답으로" }], { driverRev: "7-1m" }));
// E — ld d001-1: NA without coveredBy
lines.push(...all3("ld", "d001-1", NEW, [pass("tile dictation"), { feature: "graded input", item: "tile dictation", status: "NA", note: "E" }], { driverRev: "7-1m" }));
// F — ld d002-1: NA coveredBy + tile PASS (this record also carries LISTENING's reload-test PASS, for L)
lines.push(...all3("ld", "d002-1", NEW, [pass("tile dictation"), { feature: "graded input", item: "tile dictation", status: "NA", coveredBy: "tile dictation", note: "F" }, { feature: "bookmark", item: "add→reload→remove→reload", status: "PASS", note: "" }], { driverRev: "7-1m" }));
// K — student s1-6: the old driver's 'no bookmark control' NA (the header bookmark is on every lesson — never NA)
lines.push(...all3("student", "s1-6", NEW, [pass("step"), { feature: "bookmark", item: "control", status: "NA", absent: true, note: "no bookmark control on this page" }], { driverRev: "7-1m" }));
// K2 — student s2-1: absent here WITH code evidence, and the same feature PASS elsewhere in the record → NA
lines.push(...all3("student", "s2-1", NEW, [pass("step"), { feature: "completion", item: "header", status: "NA", absent: true, absentEvidence: "LessonActionButtons: course !== 'student'", note: "no header completion button on STUDENT" }, { feature: "completion", item: "Step 3 · toggle→reload→untoggle", status: "PASS", note: "" }], { driverRev: "7-1m" }));
// K3 — student s2-2: absent with evidence but the same feature was never checked elsewhere → BLOCKED
lines.push(...all3("student", "s2-2", NEW, [pass("step"), { feature: "completion", item: "header", status: "NA", absent: true, absentEvidence: "LessonActionButtons: course !== 'student'", note: "no header completion button on STUDENT" }], { driverRev: "7-1m" }));
// K4 — student s2-3: an OLD record's 'no completion control' NA → BLOCKED (STUDENT completes at the end of Step 3)
lines.push(...all3("student", "s2-3", "2026-09-23T10:00:00.000Z", [pass("step"), { feature: "completion", item: "control", status: "NA", note: "no completion control" }]));
// L — ld d005-1: sampled NA, and LISTENING has a reload-test PASS in this selection (d002-1)
lines.push(...all3("ld", "d005-1", NEW, [pass("step"), { feature: "bookmark/completion", item: "persistence", status: "NA", sampledBy: "reload test (--persist-every)", note: "exercised on the sampled lessons of this course (see --persist-every)" }], { driverRev: "7-1m" }));
// M — reading pr001: sampled NA, and READING has NO reload-test PASS anywhere in this selection
lines.push(...all3("reading", "pr001", NEW, [pass("step"), { feature: "bookmark/completion", item: "persistence", status: "NA", sampledBy: "reload test (--persist-every)", note: "exercised on the sampled lessons of this course (see --persist-every)" }], { driverRev: "7-1m" }));
// G — ld d003-1: legacy label in an OLD record (no driverRev) + tile PASS
const LEGACY = { feature: "graded input", item: "tile dictation", status: "BLOCKED", note: "tile-based answering — checked by grade-offline.cjs and the tile routine, not by typing" };
lines.push(...all3("ld", "d003-1", "2026-09-23T10:00:00.000Z", [pass("tile dictation"), LEGACY]));
// H — ld d004-1: the same legacy label in a NEW record
lines.push(...all3("ld", "d004-1", NEW, [pass("tile dictation"), LEGACY], { driverRev: "7-1m" }));
// I — student s1-4: new record, tile BLOCKED '(문장 못 고름)'
lines.push(...all3("student", "s1-4", NEW, [{ feature: "tile dictation", item: "Step 2 · (문장 못 고름)", status: "BLOCKED", note: "보관함은 있는데 어느 문장의 타일도 보관함에 다 있지 않음" }], { driverRev: "7-1m" }));
// J — student s1-5: only an old record
lines.push(...all3("student", "s1-5", OLD, [{ feature: "control", item: "w", status: "FAIL", note: "J: 옛 기록만" }]));
// N — grammar1 gh1-006: the four judgment-less GRAMMAR cells the -post7c sweep recorded (notes copied from it)
const gi = (item, note) => ({ feature: "graded input", item, status: "FAIL", note });
lines.push(...all3("grammar1", "gh1-006", NEW, [pass("step"),
  gi("#1", "correct→자가 채점 정답률 | wrong→자가 채점 정답률 | lowercase→accepted, extra-spaces→accepted, no-final-period→accepted"),
  gi("#2", "correct→문맥과 우리말 뜻을 보고 빈칸에 알맞은 단어를 직접 입력하거나 [빈칸 정답 확인]을 눌러보세요. | wrong→문맥과 우리말 뜻을 보고 빈칸에 알맞은 단어를 직접 입력하거나 [빈칸 정답 확인]을 눌러보세요. | lowercase→accepted, extra-spaces→accepted, no-final-period→accepted"),
  gi("#3", "correct→no feedback | wrong→no feedback | lowercase→rejected, extra-spaces→rejected, no-final-period→rejected"),
  gi("#4", "correct→. 모든 문항 작성 후 [전체 채점하기]를 누르면 자동으로 점수와 상세 오답 분석이 제공됩니다. | wrong→no feedback | lowercase→rejected, extra-spaces→rejected, no-final-period→rejected"),
], { driverRev: "7-1m" }));
// O — grammar2 gh2-007: a graded input FAIL with any OTHER wording (a correct answer marked wrong) — the product's FAIL
lines.push(...all3("grammar2", "gh2-007", NEW, [pass("step"), gi("#5", "correct→오답입니다 | wrong→오답입니다 | lowercase→rejected, extra-spaces→rejected, no-final-period→rejected")], { driverRev: "7-1m" }));
// P — grammar1 gh1-058: one side judgment-less, the other a verdict (a wrong answer accepted)
lines.push(...all3("grammar1", "gh1-058", NEW, [pass("step"), gi("#6", "correct→no feedback | wrong→정답입니다 | lowercase→rejected, extra-spaces→rejected, no-final-period→rejected")], { driverRev: "7-1m" }));
fs.writeFileSync(path.join(FEAT, "fixture.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");

function run(label, args) {
  const out = path.join(dir, label);
  const r = spawnSync(process.execPath, [TOOL, "--features-dir", FEAT, "--out-dir", out, ...args], { encoding: "utf8" });
  let detail = null;
  try { detail = JSON.parse(fs.readFileSync(path.join(out, "coverage.json"), "utf8")).lessons.detail; } catch {}
  return { status: r.status, detail, stderr: (r.stderr || "").trim().split("\n").slice(-1)[0] };
}
const st = (res, course, id) => ((res.detail || {})[course] || {})[id] || { status: "(없음)", why: [] };

const now = run("now", ["--files", "fixture.jsonl"]);
const noBlocked = run("ignore-blocked", ["--files", "fixture.jsonl", "--break=ignore-blocked"]);
const merged = run("merge-all", ["--files", "fixture.jsonl", "--break=merge-all"]);
const oldRule = run("old-dictation-rule", ["--files", "fixture.jsonl", "--break=old-dictation-rule"]);
const grammarOld = run("grammar-any-note", ["--files", "fixture.jsonl", "--break=grammar-any-note"]);
const noSel = run("no-selection", []);
const since = run("since", ["--since", "2026-09-22T00:00:00Z"]);

const cases = [
  ["A 목록에 없는 BLOCKED → BLOCKED", st(now, "student", "s1-1").status === "BLOCKED" && /A: 목록에 없는 막힘/.test(st(now, "student", "s1-1").why.join(" ")), `지금 ${st(now, "student", "s1-1").status}`],
  ["A 깨기 ignore-blocked → PASS(옛 동작)", st(noBlocked, "student", "s1-1").status === "PASS", `깨기 ${st(noBlocked, "student", "s1-1").status}`],
  ["B 옛 FAIL + 새 PASS → PASS", st(now, "student", "s1-2").status === "PASS", `지금 ${st(now, "student", "s1-2").status}`],
  ["B 깨기 merge-all → FAIL(옛 동작)", st(merged, "student", "s1-2").status === "FAIL", `깨기 ${st(merged, "student", "s1-2").status}`],
  ["C --since · --files 없이 → exit 1", noSel.status === 1, `exit ${noSel.status} · ${noSel.stderr}`],
  ["D 고친 루틴의 tile FAIL → FAIL", st(now, "student", "s1-3").status === "FAIL", `지금 ${st(now, "student", "s1-3").status}`],
  ["D 깨기 old-dictation-rule → BLOCKED(옛 동작)", st(oldRule, "student", "s1-3").status === "BLOCKED", `깨기 ${st(oldRule, "student", "s1-3").status}`],
  ["E coveredBy 없는 NA → BLOCKED", st(now, "ld", "d001-1").status === "BLOCKED" && /NA 인데 대신 본 기록 없음/.test(st(now, "ld", "d001-1").why.join(" ")), `지금 ${st(now, "ld", "d001-1").status} · ${st(now, "ld", "d001-1").why[0] || ""}`],
  ["F NA + 같은 기록 tile PASS → PASS", st(now, "ld", "d002-1").status === "PASS", `지금 ${st(now, "ld", "d002-1").status}`],
  ["G 옛 기록의 옛 이름 → NA(PASS)", st(now, "ld", "d003-1").status === "PASS", `지금 ${st(now, "ld", "d003-1").status}`],
  ["H 새 기록의 옛 이름 → BLOCKED", st(now, "ld", "d004-1").status === "BLOCKED", `지금 ${st(now, "ld", "d004-1").status}`],
  ["I 새 기록 '(문장 못 고름)' → BLOCKED 그대로", st(now, "student", "s1-4").status === "BLOCKED" && /문장 못 고름/.test(st(now, "student", "s1-4").why.join(" ")), `지금 ${st(now, "student", "s1-4").status} · ${st(now, "student", "s1-4").why[0] || ""}`],
  ["J --since 가 옛 기록을 뺌 → NOT TESTED", st(since, "student", "s1-5").status === "NOT TESTED" && st(since, "student", "s1-2").status === "PASS", `since s1-5 ${st(since, "student", "s1-5").status} · s1-2 ${st(since, "student", "s1-2").status}`],
  ["K 옛 'no bookmark control' NA → BLOCKED(머리 북마크는 모든 강의에)", st(now, "student", "s1-6").status === "BLOCKED" && /북마크 단추를 못 찾음/.test(st(now, "student", "s1-6").why.join(" ")), `지금 ${st(now, "student", "s1-6").status} · ${st(now, "student", "s1-6").why[0] || ""}`],
  ["K2 그 자리에 없음(코드 근거) + 같은 기능 다른 자리 PASS → PASS", st(now, "student", "s2-1").status === "PASS", `지금 ${st(now, "student", "s2-1").status}`],
  ["K3 그 자리에 없음(코드 근거)인데 다른 자리 기록 없음 → BLOCKED", st(now, "student", "s2-2").status === "BLOCKED", `지금 ${st(now, "student", "s2-2").status} · ${st(now, "student", "s2-2").why[0] || ""}`],
  ["K4 옛 STUDENT 'no completion control' → BLOCKED(3단계 완료 안 누름)", st(now, "student", "s2-3").status === "BLOCKED" && /3단계/.test(st(now, "student", "s2-3").why.join(" ")), `지금 ${st(now, "student", "s2-3").status} · ${st(now, "student", "s2-3").why[0] || ""}`],
  ["L 표본 NA + 같은 과정 새로고침 PASS → PASS", st(now, "ld", "d005-1").status === "PASS", `지금 ${st(now, "ld", "d005-1").status}`],
  ["M 표본 NA + 그 과정 새로고침 PASS 없음 → BLOCKED", st(now, "reading", "pr001").status === "BLOCKED" && /표본 검사/.test(st(now, "reading", "pr001").why.join(" ")), `지금 ${st(now, "reading", "pr001").status} · ${st(now, "reading", "pr001").why[0] || ""}`],
  ["N GRAMMAR 판정 없는 칸 넷 → PASS(도구 탓)", st(now, "grammar1", "gh1-006").status === "PASS", `지금 ${st(now, "grammar1", "gh1-006").status}`],
  ["O GRAMMAR 다른 문구의 FAIL → FAIL", st(now, "grammar2", "gh2-007").status === "FAIL", `지금 ${st(now, "grammar2", "gh2-007").status}`],
  ["O 깨기 grammar-any-note → PASS(옛 동작 — 진짜 FAIL 을 삼킴)", st(grammarOld, "grammar2", "gh2-007").status === "PASS", `깨기 ${st(grammarOld, "grammar2", "gh2-007").status}`],
  ["P 한쪽만 판정 없음(wrong→'정답입니다') → FAIL", st(now, "grammar1", "gh1-058").status === "FAIL", `지금 ${st(now, "grammar1", "gh1-058").status}`],
];
let wrong = 0;
for (const [what, ok, got] of cases) { if (!ok) wrong++; console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${what} — ${got}`); }
console.log(`\n기대와 다름 ${wrong} (임시 폴더 ${dir})`);
process.exit(wrong ? 1 : 0);
