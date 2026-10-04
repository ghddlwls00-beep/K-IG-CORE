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
 *   N2 (2026-09-27) GRAMMAR 새 화면의 접힌 위 플레이어 이름 '정답 문장 전체 듣기' → PASS(도구 탓 ⑥)
 *   O2 (2026-09-27) GRAMMAR 새 1단계 판정 글 '✕ 오답 — …'          → FAIL(진짜 판정은 그대로 셈)
 *   Q~W (회귀 점검 1002) ADULT · PASS-OFF 줄 · --screens · 기록 지운 판 · no-adult · no-passoff — 아래 주석
 *   X · X2 · Y · Z (fixes-0d) 실기기 몫(마이크) · 깨기 기록 빼기 · 학습 단위 확인함 — 아래 주석
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
// N2 — 2026-09-27 (GRAMMAR 학습법 · 화면 고침): the reworked page's first 정답-line is the folded top player '정답 문장 전체 듣기' — a
// button name, not a verdict → judgment-less, like the four in N
lines.push(...all3("grammar1", "gh1-008", NEW, [pass("step"), gi("#1", "correct→정답 문장 전체 듣기 | wrong→정답 문장 전체 듣기 | lowercase→accepted, extra-spaces→accepted, no-final-period→accepted")], { driverRev: "7-1m" }));
// O2 — the reworked Step 1 verdict wording ('✕ 오답 — …' on a correct answer) is the product's FAIL, not swallowed by N2's text
lines.push(...all3("grammar2", "gh2-008", NEW, [pass("step"), gi("#1", "correct→✕ 오답 — 모범 답안과 견주어 보세요 | wrong→✕ 오답 — 모범 답안과 견주어 보세요 | lowercase→rejected, extra-spaces→rejected, no-final-period→rejected")], { driverRev: "7-1m" }));
// 회귀 점검 1002 (2026-10-04) — ADULT in the course list (COURSE_TABLE):
//   Q  ADULT a1-1, three screens, PASS                    → PASS in an ADULT row of 55 pages (balanced)
//   R  ADULT a1-3 desktop · mobile · small + --screens desktop,mobile,small → PASS; a1-4 desktop · mobile · tablet → BLOCKED (small 없음)
//   S  the same fixture with a1-1's records taken out ('ADULT 기록 하나를 지운 판')  → a1-1 NOT TESTED
//   T  --break=no-adult (the list before 10-04)          → no ADULT row; its records go uncounted (notCounted) — the old blind spot
//   U  (proof worker, 10-04 — PASS-OFF GRAMMAR now in COURSE_TABLE) a PASS-OFF record set (drive-passoff shape: pg01-1 three screens
//      PASS, pg01-2 with a 'content' FAIL) → PASS-OFF row of 67 pages, balanced, pg01-1 PASS · pg01-2 FAIL
//   V  the same fixture with pg01-1's records taken out                → pg01-1 NOT TESTED (the ADULT 'S' break, for PASS-OFF)
//   W  --break=no-passoff (the list before 10-04)                     → no PASS-OFF row; its 6 records uncounted and said so
lines.push(...all3("adult", "a1-1", NEW, [pass("step"), pass("adult words"), pass("adult chunks"), pass("tile dictation")], { driverRev: "7-1m-a1002" }));
lines.push(...["desktop", "mobile", "small"].map((v) => rec("adult", "a1-3", v, NEW, [pass("step")], { driverRev: "7-1m-a1002" })));
lines.push(...["desktop", "mobile", "tablet"].map((v) => rec("adult", "a1-4", v, NEW, [pass("step")], { driverRev: "7-1m-a1002" })));
lines.push(...all3("passoff-grammar", "pg01-1", NEW, [pass("step"), pass("content"), pass("grading")], { driverRev: "passoff-1002a" }));
lines.push(...all3("passoff-grammar", "pg01-2", NEW, [pass("step"), { feature: "content", item: "화면 글 기대 대비", status: "FAIL", note: "기대 97 · 있음 96 · 없음 1 — 2:rule-kodiff" }], { driverRev: "passoff-1002a" }));
// 회귀 점검 1002 단계 0 마무리 (fixes-0d, 2026-10-04) — build-coverage ⑦ ⑧ ⑨:
//   X  READING pr002 데스크톱 'step3 · mic · BLOCKED (real microphone) — must be checked on a real device'(drive-reading 이 쓰는 그대로)
//      → PASS · 실기기 몫 1기록 · --break=device-only-blocks(옛 동작) → BLOCKED
//   X2 READING pr003 데스크톱 같은 칸이 다른 글('tester did not open') → BLOCKED 그대로(넓게 잡지 않음)
//   Y  STUDENT s3-1 PASS + 파일 이름에 '-break-' 가 든 더 늦은 FAIL 기록 · s3-2 PASS + 같은 파일 안의 더 늦은 `break` 칸 FAIL 기록
//      → 둘 다 PASS · 뺀 깨기 2건 · --break=count-break-records(옛 동작) → 둘 다 FAIL
//   Z  학습 단위 '확인함' = 이 선택의 데스크톱 기록 content(PASS-OFF pg01-1 114/114 · ADULT a1-1 19/19 · pg01-2 는 content 없음)
//      → 과정별 숫자가 그대로 · --break=units-from-summary(옛 동작 — features-summary.json) → 이 선택의 숫자가 아님
const MIC = { feature: "step3", item: "mic", status: "BLOCKED", note: "BLOCKED (real microphone) — must be checked on a real device" };
lines.push(...all3("reading", "pr002", NEW, [pass("step"), MIC], { driverRev: "rd-0928-q1004" }));
lines.push(...all3("reading", "pr003", NEW, [pass("step"), { ...MIC, note: "tester did not open" }], { driverRev: "rd-0928-q1004" }));
const LATER = "2026-09-25T01:00:00.000Z";
lines.push(...all3("student", "s3-1", NEW, [pass("step")], { driverRev: "7-1m" }));
lines.push(...all3("student", "s3-2", NEW, [pass("step")], { driverRev: "7-1m" }));
lines.push(rec("student", "s3-2", "desktop", LATER, [{ feature: "content", item: "x", status: "FAIL", note: "Y: 깨기 기록(break 칸)" }], { driverRev: "7-1m", break: "text" }));
// Y2 — student s3-3: 운영 PASS + 더 늦은 로컬(localhost — 깨뜨린 앱 사본에 대고 돈 proof-run) FAIL 기록 → PASS · 로컬 기록 1건 뺌
lines.push(...all3("student", "s3-3", NEW, [pass("step")], { driverRev: "7-1m", base: "https://k-ig-core.vercel.app" }));
lines.push(rec("student", "s3-3", "desktop", LATER, [{ feature: "content", item: "x", status: "FAIL", note: "Y2: 로컬 증명 기록" }], { driverRev: "7-1m", base: "http://localhost:3311" }));
for (const l of lines) {
  if (l.course === "passoff-grammar" && l.id === "pg01-1" && l.viewport === "desktop") l.content = { expected: 114, found: 114, missingCount: 0 };
  if (l.course === "adult" && l.id === "a1-1" && l.viewport === "desktop") l.content = { expected: 19, found: 19, missingCount: 0 };
}
fs.writeFileSync(path.join(FEAT, "fixture-break-y.jsonl"), JSON.stringify(rec("student", "s3-1", "desktop", LATER, [{ feature: "content", item: "x", status: "FAIL", note: "Y: 깨기 파일(-break-)" }], { driverRev: "7-1m" })) + "\n");
fs.writeFileSync(path.join(FEAT, "fixture.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
fs.writeFileSync(path.join(FEAT, "fixture-no-a1-1.jsonl"), lines.filter((l) => !(l.course === "adult" && l.id === "a1-1")).map((l) => JSON.stringify(l)).join("\n") + "\n");
fs.writeFileSync(path.join(FEAT, "fixture-no-pg01-1.jsonl"), lines.filter((l) => !(l.course === "passoff-grammar" && l.id === "pg01-1")).map((l) => JSON.stringify(l)).join("\n") + "\n");

function run(label, args) {
  const out = path.join(dir, label);
  const r = spawnSync(process.execPath, [TOOL, "--features-dir", FEAT, "--out-dir", out, ...args], { encoding: "utf8" });
  let detail = null, rows = null, selection = null, deviceOnly = null, items = null;
  try { const j = JSON.parse(fs.readFileSync(path.join(out, "coverage.json"), "utf8")); detail = j.lessons.detail; rows = j.lessons.rows; selection = j.selection; deviceOnly = j.deviceOnly || null; items = j.items; } catch {}
  return { status: r.status, detail, rows, selection, deviceOnly, items, stderr: (r.stderr || "").trim().split("\n").slice(-1)[0] };
}
const st = (res, course, id) => ((res.detail || {})[course] || {})[id] || { status: "(없음)", why: [] };

const now = run("now", ["--files", "fixture.jsonl"]);
const noBlocked = run("ignore-blocked", ["--files", "fixture.jsonl", "--break=ignore-blocked"]);
const merged = run("merge-all", ["--files", "fixture.jsonl", "--break=merge-all"]);
const oldRule = run("old-dictation-rule", ["--files", "fixture.jsonl", "--break=old-dictation-rule"]);
const grammarOld = run("grammar-any-note", ["--files", "fixture.jsonl", "--break=grammar-any-note"]);
const noSel = run("no-selection", []);
const since = run("since", ["--since", "2026-09-22T00:00:00Z"]);
const screens = run("screens", ["--files", "fixture.jsonl", "--screens", "desktop,mobile,small"]);
const dropped = run("no-a1-1", ["--files", "fixture-no-a1-1.jsonl"]);
const noAdult = run("no-adult", ["--files", "fixture.jsonl", "--break=no-adult"]);
const droppedPg = run("no-pg01-1", ["--files", "fixture-no-pg01-1.jsonl"]);
const noPassoff = run("no-passoff", ["--files", "fixture.jsonl", "--break=no-passoff"]);
const devOld = run("device-only-blocks", ["--files", "fixture.jsonl", "--break=device-only-blocks"]);
const withBreak = run("with-break-files", ["--files", "fixture.jsonl,fixture-break-y.jsonl"]);
const countBreak = run("count-break-records", ["--files", "fixture.jsonl,fixture-break-y.jsonl", "--break=count-break-records"]);
const unitsOld = run("units-from-summary", ["--files", "fixture.jsonl", "--break=units-from-summary"]);
const row = (res, label) => (res.rows || []).find((r) => r.course === label) || null;
const unitsOf = (res) => ((res.items || []).find((i) => /^학습 단위/.test(i.what)) || {});

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
  ["N2 (09-27) 접힌 위 플레이어 이름 '정답 문장 전체 듣기' → PASS(도구 탓)", st(now, "grammar1", "gh1-008").status === "PASS", `지금 ${st(now, "grammar1", "gh1-008").status}`],
  ["O2 (09-27) 새 1단계 판정 글 '✕ 오답 — …' → FAIL", st(now, "grammar2", "gh2-008").status === "FAIL", `지금 ${st(now, "grammar2", "gh2-008").status}`],
  ["Q ADULT a1-1 세 화면 PASS → PASS · ADULT 줄 55쪽 · 합계 일치", st(now, "adult", "a1-1").status === "PASS" && row(now, "ADULT") && row(now, "ADULT").discovered === 55 && row(now, "ADULT").balanced && row(now, "ADULT").notTested === 55 - 3, `지금 ${st(now, "adult", "a1-1").status} · ADULT 줄 ${JSON.stringify(row(now, "ADULT"))}`],
  ["R --screens desktop,mobile,small: a1-3(그 셋) PASS · a1-4(small 없음) BLOCKED", st(screens, "adult", "a1-3").status === "PASS" && st(screens, "adult", "a1-4").status === "BLOCKED" && /필요: desktop · mobile · small/.test(st(screens, "adult", "a1-4").why.join(" ")), `a1-3 ${st(screens, "adult", "a1-3").status} · a1-4 ${st(screens, "adult", "a1-4").status} ${st(screens, "adult", "a1-4").why[0] || ""}`],
  ["S ADULT 기록 하나(a1-1)를 지운 판 → a1-1 NOT TESTED", st(dropped, "adult", "a1-1").status === "NOT TESTED" && st(dropped, "adult", "a1-3").status === "PASS", `a1-1 ${st(dropped, "adult", "a1-1").status} · a1-3 ${st(dropped, "adult", "a1-3").status}`],
  ["T 깨기 no-adult(10-04 전 목록) → ADULT 줄 없음 · 그 기록은 안 셈(옛 사각지대)", !row(noAdult, "ADULT") && !(noAdult.detail || {}).adult && noAdult.selection && noAdult.selection.notCounted >= 9, `ADULT 줄 ${row(noAdult, "ADULT") ? "있음" : "없음"} · 안 센 기록 ${noAdult.selection ? noAdult.selection.notCounted : "?"}`],
  ["U PASS-OFF 기록 → PASS-OFF 줄 67쪽 · 합계 일치 · pg01-1 PASS · pg01-2(content FAIL) FAIL · 안 센 기록 0", row(now, "PASS-OFF GRAMMAR") && row(now, "PASS-OFF GRAMMAR").discovered === 67 && row(now, "PASS-OFF GRAMMAR").balanced && row(now, "PASS-OFF GRAMMAR").notTested === 65 && st(now, "passoff-grammar", "pg01-1").status === "PASS" && st(now, "passoff-grammar", "pg01-2").status === "FAIL" && now.selection && now.selection.notCounted === 0, `pg01-1 ${st(now, "passoff-grammar", "pg01-1").status} · pg01-2 ${st(now, "passoff-grammar", "pg01-2").status} · 줄 ${JSON.stringify(row(now, "PASS-OFF GRAMMAR"))} · 안 센 기록 ${now.selection ? now.selection.notCounted : "?"}`],
  ["V PASS-OFF 기록 하나(pg01-1)를 지운 판 → pg01-1 NOT TESTED", st(droppedPg, "passoff-grammar", "pg01-1").status === "NOT TESTED" && st(droppedPg, "passoff-grammar", "pg01-2").status === "FAIL" && row(droppedPg, "PASS-OFF GRAMMAR").notTested === 66, `pg01-1 ${st(droppedPg, "passoff-grammar", "pg01-1").status} · pg01-2 ${st(droppedPg, "passoff-grammar", "pg01-2").status} · NOT TESTED ${row(droppedPg, "PASS-OFF GRAMMAR") ? row(droppedPg, "PASS-OFF GRAMMAR").notTested : "?"}`],
  ["W 깨기 no-passoff(10-04 전 목록) → PASS-OFF 줄 없음 · 그 기록 6건 안 셈 · 그렇게 적힘", !row(noPassoff, "PASS-OFF GRAMMAR") && !row(noPassoff, undefined) && !(noPassoff.detail || {})["passoff-grammar"] && noPassoff.selection && noPassoff.selection.notCounted === 6, `PASS-OFF 줄 ${row(noPassoff, "PASS-OFF GRAMMAR") ? "있음" : "없음"} · 안 센 기록 ${noPassoff.selection ? noPassoff.selection.notCounted : "?"}`],
  ["X READING 데스크톱 '실제 마이크' BLOCKED → PASS · 실기기 몫 1기록(강의 1)", st(now, "reading", "pr002").status === "PASS" && now.deviceOnly && Object.values(now.deviceOnly).some((d) => d.records === 1 && d.lessons === 1), `pr002 ${st(now, "reading", "pr002").status} · 실기기 몫 ${JSON.stringify(now.deviceOnly)}`],
  ["X 깨기 device-only-blocks → BLOCKED(옛 동작) · 실기기 몫 0", st(devOld, "reading", "pr002").status === "BLOCKED" && /real microphone/.test(st(devOld, "reading", "pr002").why.join(" ")) && devOld.deviceOnly && !Object.keys(devOld.deviceOnly).length, `깨기 pr002 ${st(devOld, "reading", "pr002").status} · ${st(devOld, "reading", "pr002").why[0] || ""}`],
  ["X2 같은 mic 칸이 다른 글('tester did not open') → BLOCKED 그대로(넓게 잡지 않음)", st(now, "reading", "pr003").status === "BLOCKED" && /tester did not open/.test(st(now, "reading", "pr003").why.join(" ")), `pr003 ${st(now, "reading", "pr003").status} · ${st(now, "reading", "pr003").why[0] || ""}`],
  ["Y 깨기 기록(-break- 파일 · break 칸)이 더 늦어도 → s3-1 · s3-2 PASS · 뺀 깨기 2건", st(withBreak, "student", "s3-1").status === "PASS" && st(withBreak, "student", "s3-2").status === "PASS" && withBreak.selection && withBreak.selection.breakRecords === 2, `s3-1 ${st(withBreak, "student", "s3-1").status} · s3-2 ${st(withBreak, "student", "s3-2").status} · 뺀 깨기 ${withBreak.selection ? withBreak.selection.breakRecords : "?"}`],
  ["Y 깨기 count-break-records → s3-1 · s3-2 FAIL(옛 동작 — 깨기가 진짜 기록을 덮음)", st(countBreak, "student", "s3-1").status === "FAIL" && st(countBreak, "student", "s3-2").status === "FAIL", `깨기 s3-1 ${st(countBreak, "student", "s3-1").status} · s3-2 ${st(countBreak, "student", "s3-2").status}`],
  ["Y2 더 늦은 로컬(localhost) 기록 → s3-3 PASS · 로컬 기록 1건 뺌 / 깨기 count-break-records → FAIL", st(now, "student", "s3-3").status === "PASS" && now.selection && now.selection.localRecords === 1 && st(countBreak, "student", "s3-3").status === "FAIL", `지금 s3-3 ${st(now, "student", "s3-3").status} · 로컬 기록 ${now.selection ? now.selection.localRecords : "?"} · 깨기 ${st(countBreak, "student", "s3-3").status}`],
  ["Z 학습 단위 '확인함' = 이 선택의 데스크톱 content — PASS-OFF 114/114(1강) · content 없는 1강 · ADULT 19/19(1강)", /PASS-OFF GRAMMAR 114\/114\(1강\) · content 없는 기록 1강/.test(String(unitsOf(now).how)) && /ADULT 19\/19\(1강\)/.test(String(unitsOf(now).how)) && /^133 \(기대 133 중 있음/.test(String(unitsOf(now).tested)), `확인함 '${unitsOf(now).tested}' · ${String(unitsOf(now).how).slice(0, 140)}`],
  ["Z 깨기 units-from-summary → 이 선택의 숫자가 아님(옛 동작 — 다른 묶음 또는 '?')", String(unitsOf(unitsOld).tested) !== String(unitsOf(now).tested) && !/PASS-OFF GRAMMAR 114/.test(String(unitsOf(unitsOld).how)), `깨기 확인함 '${unitsOf(unitsOld).tested}' · ${unitsOf(unitsOld).how}`],
];
let wrong = 0;
for (const [what, ok, got] of cases) { if (!ok) wrong++; console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${what} — ${got}`); }
console.log(`\n기대와 다름 ${wrong} (임시 폴더 ${dir})`);
process.exit(wrong ? 1 : 0);
