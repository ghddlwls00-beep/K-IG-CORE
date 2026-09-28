// Checks the common learning engine (src/lib/learning — design docs/pass-off-grammar/공통-학습-엔진.md v1).
//   node scripts/check-learning-engine.cjs                 unit cases + 90-day simulation of three learners
//   node scripts/check-learning-engine.cjs --break=<name>  runs on a deliberately broken copy (must exit 1)
//   node scripts/check-learning-engine.cjs --prove-breaks  the normal run exits 0 AND every break exits 1
// The engine files are transpiled in memory with the project's TypeScript; nothing in src/ is changed.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src", "lib", "learning");
const argv = process.argv.slice(2);
const BREAK = (argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length) || null;

// Each break turns off one rule the design depends on; the named cases must then fail.
const BREAKS = {
  boundary: { file: "day.ts", from: "(9 - 4) * 3_600_000", to: "9 * 3_600_000", why: "day turns at 00:00 instead of 04:00" },
  help: { file: "engine.ts", from: 'input.correct && input.help === "none" ? "right" : "wrong"', to: 'input.correct ? "right" : "wrong"', why: "a helped answer counts as a pass" },
  lesson: { file: "engine.ts", from: 'if (input.where === "lesson") effect', to: 'if (input.where === "never") effect', why: "answers inside a lesson count" },
  lessonState: { file: "engine.ts", from: 'if (state && input.where === "review")', to: "if (state)", why: "(paired with lesson)" },
  wrongwins: { file: "engine.ts", from: "else if (x.lastCorrect === false && y.lastCorrect !== false) pick = x;", to: "else if (false) pick = x;", why: "a right answer beats a wrong one on the same day" },
  gap: { file: "engine.ts", from: ">= rule.minGapFromFirstDay", to: ">= 0", why: "no day at least 6 days after the first is needed" },
  budget: { file: "engine.ts", from: "      if (items.length && used + cost > budget) break;\n      items.push(toItem(entry));", to: "      items.push(toItem(entry));", why: "the daily amount is not limited" },
};
const BREAK_SETS = { lesson: ["lesson", "lessonState"] };

function load(breakName) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kig-learning-"));
  const active = breakName ? (BREAK_SETS[breakName] || [breakName]).map((n) => BREAKS[n]) : [];
  if (breakName && active.some((b) => !b)) throw new Error(`unknown break ${breakName}`);
  for (const file of ["types.ts", "day.ts", "engine.ts"]) {
    // a Windows checkout may hand back CRLF; the break texts are written with LF
    let source = fs.readFileSync(path.join(SRC, file), "utf8").replace(/\r\n/g, "\n");
    for (const b of active.filter((x) => x.file === file)) {
      if (!source.includes(b.from)) throw new Error(`break text not found in ${file}: ${b.from}`);
      source = source.split(b.from).join(b.to);
    }
    const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    fs.writeFileSync(path.join(dir, file.replace(/\.ts$/, ".js")), out.outputText);
  }
  return { engine: require(path.join(dir, "engine.js")), day: require(path.join(dir, "day.js")), dir };
}

if (argv.includes("--prove-breaks")) {
  const run = (args) => spawnSync(process.execPath, [__filename, ...args], { encoding: "utf8" });
  const normal = run([]);
  const rows = [["(none)", normal.status, normal.status === 0 ? "PASS" : "FAIL"]];
  for (const name of Object.keys(BREAKS).filter((n) => n !== "lessonState")) {
    const r = run([`--break=${name}`]);
    const failed = (r.stdout.match(/^FAIL .*/gm) || []).map((l) => l.slice(5, 45));
    // caught only when a named case failed — a crash (break text not found, exit 1 with no FAIL line) is not a catch
    const caught = r.status === 1 && failed.length > 0;
    rows.push([name, caught ? 1 : `${r.status}*`, caught ? `caught (${failed.length}: ${failed.slice(0, 3).join(" | ")})` : `NOT CAUGHT${r.stderr ? ` — ${r.stderr.trim().split("\n")[0].slice(0, 120)}` : ""}`]);
  }
  for (const [name, status, verdict] of rows) console.log(`${name.padEnd(10)} exit ${status}  ${verdict}`);
  const ok = rows[0][1] === 0 && rows.slice(1).every((r) => r[1] === 1);
  console.log(ok ? "prove-breaks: PASS" : "prove-breaks: FAIL");
  process.exit(ok ? 0 : 1);
}

const { engine: E, day: D } = load(BREAK);
const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL ${name} — ${error.message}`);
  }
}
// key order does not matter (a record read back from storage lists fields in its own order)
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
function eq(actual, expected, what) {
  const a = JSON.stringify(canon(actual));
  const b = JSON.stringify(canon(expected));
  if (a !== b) throw new Error(`${what}: ${a} ≠ ${b}`);
}

// 10:00 KST on a learning day
const at = (day, hour = 10) => Date.parse(`${day}T00:00:00Z`) + (hour - 9) * 3_600_000;
const PROFILE = { course: "test", secondsPerKind: { produce: 25, select: 8 }, elementKinds: ["select"] };
const D1 = "2026-10-01";
const d = (n) => D.addDays(D1, n - 1); // d(1) = D1
const review = (correct, extra = {}) => ({ lessonId: "L1", kind: "produce", correct, help: "none", mode: "typed", where: "review", ...extra });
function oneItem(kind = "produce") {
  const r = E.emptyRecord("test");
  E.applyLessonDone(r, "L1", at(D1), [{ key: "L1:p1", kind }]);
  return r;
}

check("day: the learning day turns at 04:00 KST", () => {
  eq(D.learningDay(Date.UTC(2026, 8, 26, 18, 59, 59)), "2026-09-26", "03:59:59 KST");
  eq(D.learningDay(Date.UTC(2026, 8, 26, 19, 0, 0)), "2026-09-27", "04:00:00 KST");
  eq(D.learningDay(Date.UTC(2026, 8, 26, 15, 0, 0)), "2026-09-26", "00:00 KST is still the day before");
  eq(D.addDays("2028-02-28", 1), "2028-02-29", "leap day");
  eq(D.addDays("2026-12-31", 1), "2027-01-01", "year end");
  eq(D.daysBetween("2026-09-27", "2026-10-04"), 7, "daysBetween");
  eq([D.isDay("2026-02-30"), D.isDay("2026-02-28"), D.isDay("x")], [false, true, false], "isDay");
});

check("schedule: next day → +2 → +4 → passed on day 8, upkeep +21", () => {
  const r = oneItem();
  eq(r.items["L1:p1"].dueDay, d(2), "due after the lesson");
  eq(E.applyAttempt(r, "L1:p1", review(true), at(d(2)), PROFILE), "right", "day 2");
  eq(r.items["L1:p1"].dueDay, d(4), "due after day 2");
  E.applyAttempt(r, "L1:p1", review(true), at(d(4)), PROFILE);
  eq(r.items["L1:p1"].dueDay, d(8), "due after day 4");
  E.applyAttempt(r, "L1:p1", review(true), at(d(8)), PROFILE);
  eq([r.items["L1:p1"].stage, r.items["L1:p1"].dueDay], ["passed", d(29)], "after day 8");
  E.applyAttempt(r, "L1:p1", review(true), at(d(29)), PROFILE);
  eq(r.items["L1:p1"].dueDay, D.addDays(d(29), 60), "second upkeep");
});

check("help: a right answer after a hint is not a pass and comes back tomorrow", () => {
  const r = oneItem();
  eq(E.applyAttempt(r, "L1:p1", review(true, { help: "hint" }), at(d(2)), PROFILE), "wrong", "effect");
  const s = r.items["L1:p1"];
  eq([s.passDays, s.dueDay, s.lapses, s.lastCorrect], [[], d(3), 0, false], "state");
});

check("lesson: answers inside a lesson never count, even on a due day", () => {
  const r = oneItem();
  E.applyAttempt(r, "L1:p1", review(true), at(d(2)), PROFILE);
  eq(E.applyAttempt(r, "L1:p1", { ...review(true), where: "lesson", firstTry: true }, at(d(4)), PROFILE), "lesson", "effect");
  eq([r.items["L1:p1"].passDays, r.items["L1:p1"].dueDay], [[d(2)], d(4)], "state");
});

check("retry: a second answer on the same day changes nothing", () => {
  const r = oneItem();
  eq(E.applyAttempt(r, "L1:p1", review(false, { answer: "She are tired." }), at(d(2)), PROFILE), "wrong", "first");
  eq(E.applyAttempt(r, "L1:p1", review(true), at(d(2), 11), PROFILE), "retry", "second");
  const s = r.items["L1:p1"];
  eq([s.dueDay, s.lapses, s.lastWrong, s.passDays], [d(3), 1, "She are tired.", []], "state");
});

check("practice: an item answered before it is due keeps its schedule", () => {
  const r = oneItem();
  E.applyAttempt(r, "L1:p1", review(true), at(d(2)), PROFILE);
  eq(E.applyAttempt(r, "L1:p1", review(true), at(d(3)), PROFILE), "practice", "effect");
  eq([r.items["L1:p1"].passDays, r.items["L1:p1"].dueDay], [[d(2)], d(4)], "state");
});

check("pass rule: 3 days (elements 2), one ≥ 6 days after the first, last answer right", () => {
  const rule = E.DEFAULT_RULE;
  const s = (passDays, lastCorrect = true) => ({ firstDay: D1, passDays, lastCorrect });
  eq(E.isPassed(s([d(2), d(3), d(4)]), rule, false), false, "three days but all within 6");
  eq(E.isPassed(s([d(2), d(3), d(7)]), rule, false), true, "third on day 7");
  eq(E.isPassed(s([d(2), d(7)]), rule, false), false, "two days for a sentence");
  eq(E.isPassed(s([d(2), d(7)]), rule, true), true, "two days for an element");
  eq(E.isPassed(s([d(2), d(3)]), rule, true), false, "element within 6 days");
  eq(E.isPassed(s([d(2), d(4), d(8)], false), rule, false), false, "last answer wrong");
  eq(E.isPassed(s([D1, d(2), d(8)]), rule, false), false, "the first day never counts");
});

check("upkeep: a passed item answered wrong goes back to the next-day check", () => {
  const r = oneItem();
  for (const n of [2, 4, 8]) E.applyAttempt(r, "L1:p1", review(true), at(d(n)), PROFILE);
  E.applyAttempt(r, "L1:p1", review(false), at(d(29)), PROFILE);
  const s = r.items["L1:p1"];
  eq([s.stage, s.step, s.dueDay, s.passDays, s.lapses], ["learning", 0, d(30), [], 1], "state");
});

check("report: '내 답도 맞아요' is neither right nor wrong and comes back tomorrow", () => {
  const r = oneItem();
  eq(E.applyAttempt(r, "L1:p1", review(false, { pending: true, answer: "She's tired." }), at(d(2)), PROFILE), "pending", "effect");
  const s = r.items["L1:p1"];
  eq([s.dueDay, s.step, s.lapses, s.pending, r.reports.length, r.reports[0].status], [d(3), 0, 0, true, 1, "pending"], "state");
});

function lessonItems(lessonId, n, kind = "produce") {
  return Array.from({ length: n }, (_, i) => ({ key: `${lessonId}:p${i + 1}`, kind }));
}

check("daily amount: whole next-day checks first, then about 10 minutes", () => {
  const r = E.emptyRecord("test");
  E.applyLessonDone(r, "L1", at(D1), lessonItems("L1", 30));
  E.applyLessonDone(r, "L2", at(D1, 11), lessonItems("L2", 30));
  const p = E.planDay(r, d(2), PROFILE);
  eq([p.items.length, p.seconds, p.leftOver, p.items.every((i) => i.lessonId === "L1")], [30, 750, 30, true], "two lessons: only the first check fits");
  const q = E.emptyRecord("test");
  E.applyLessonDone(q, "L3", at(D1), lessonItems("L3", 10));
  for (let i = 0; i < 40; i += 1) {
    E.applyLessonDone(q, `R${i}`, at(D.addDays(D1, -3)), [{ key: `R${i}:p1`, kind: "produce" }]);
    Object.assign(q.items[`R${i}:p1`], { step: 1, dueDay: d(2), lastDay: D1, lastCorrect: true });
  }
  q.lastStudyDay = D1;
  const plan = E.planDay(q, d(2), PROFILE);
  eq([plan.items.length, plan.seconds, plan.leftOver], [24, 600, 26], "check + mixed review within 600 s");
  const mixed = plan.items.slice(10).map((i) => i.lessonId);
  if (new Set(mixed).size < mixed.length) throw new Error("review items not mixed across lessons");
});

check("comeback and review-first", () => {
  const r = E.emptyRecord("test");
  E.applyLessonDone(r, "L1", at(D1), lessonItems("L1", 30));
  const p = E.planDay(r, d(5), PROFILE);
  eq([p.comeback, p.items.length], [true, 10], "four days later");
  E.applyLessonDone(r, "L2", at(D1), lessonItems("L2", 31));
  eq(E.planDay(r, d(2), PROFILE).reviewFirst, true, "61 due");
});

check("merge: same day, a wrong answer wins; otherwise the later answer wins", () => {
  const a = oneItem();
  const b = JSON.parse(JSON.stringify(a));
  E.applyAttempt(a, "L1:p1", review(true), at(d(2)), PROFILE);
  E.applyAttempt(b, "L1:p1", review(false), at(d(2)), PROFILE);
  const m = E.mergeRecords(a, b);
  eq([m.items["L1:p1"].lastCorrect, m.items["L1:p1"].dueDay], [false, d(3)], "same day");
  const m2 = E.mergeRecords(b, a);
  eq(m2.items["L1:p1"].lastCorrect, false, "same day, other order");
  E.applyAttempt(a, "L1:p1", review(true), at(d(4)), PROFILE);
  eq(E.mergeRecords(a, b).items["L1:p1"].lastDay, d(4), "later day");
  eq(E.mergeRecords(a, b).lessons.L1.day, D1, "first completion kept");
});

check("sanitize: broken input is dropped, a good record survives a round trip", () => {
  const r = oneItem();
  E.applyAttempt(r, "L1:p1", review(false, { answer: "x" }), at(d(2)), PROFILE);
  eq(E.sanitizeRecord(JSON.parse(JSON.stringify(r)), "test"), r, "round trip");
  eq(E.sanitizeRecord({ v: 1, course: "other", items: {} }, "test").items, {}, "other course");
  const bad = JSON.parse(JSON.stringify(r));
  bad.items["L1:p2"] = { lessonId: "L1", kind: "produce", stage: "done", firstDay: D1, dueDay: "2026-13-40" };
  bad.lessons.L9 = "yes";
  const s = E.sanitizeRecord(bad, "test");
  eq([Object.keys(s.items), Object.keys(s.lessons)], [["L1:p1"], ["L1"]], "dropped");
  eq(E.importUndatedDone(E.emptyRecord("test"), ["L7"]).lessons.L7, { at: null, day: null }, "old true");
});

// ---- 90 days, three learners: 60 lessons × (12 sentences + 3 elements); first-try accuracy 80% / 90%
function simulate(name, studies) {
  const r = E.emptyRecord("sim");
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let next = 1;
  const days = [];
  let overBudget = 0;
  for (let n = 1; n <= 90; n += 1) {
    const day = d(n);
    if (!studies(n)) continue;
    const plan = E.planDay(r, day, PROFILE);
    const firstGroupOnly = plan.items.length > 0 && plan.items.every((i) => i.reason === "next-day" && i.lessonId === plan.items[0].lessonId);
    if (plan.seconds > 600 && !firstGroupOnly) overBudget += 1;
    for (const item of plan.items) {
      const right = rand() < (item.kind === "select" ? 0.9 : 0.8);
      E.applyAttempt(r, item.key, { lessonId: item.lessonId, kind: item.kind, correct: right, help: "none", mode: "typed", where: "review" }, at(day), PROFILE);
    }
    if (!plan.reviewFirst && next <= 60) {
      E.applyLessonDone(r, `S${next}`, at(day, 20), [...lessonItems(`S${next}`, 12), ...lessonItems(`S${next}e`, 3, "select")]);
      next += 1;
    }
    days.push({ n, seconds: plan.seconds, due: plan.dueTotal, left: plan.leftOver });
  }
  const states = Object.values(r.items);
  const passed = states.filter((s) => s.stage === "passed");
  const old = states.filter((s) => D.daysBetween(s.firstDay, d(90)) >= 30);
  const oldPassed = old.filter((s) => s.stage === "passed" || s.passDays.length > 0);
  const maxSec = Math.max(...days.map((x) => x.seconds));
  const lastDue = days.slice(-10).map((x) => x.due);
  return { name, lessons: next - 1, items: states.length, passed: passed.length, overBudget, maxMinutes: +(maxSec / 60).toFixed(1), dueLast10: `${Math.min(...lastDue)}~${Math.max(...lastDue)}`, oldMoving: `${oldPassed.length}/${old.length}` };
}
check("simulation: 90 days, three learners — the daily amount holds and items pass", () => {
  const rows = [
    simulate("daily", () => true),
    simulate("3x/week", (n) => [0, 2, 4].includes(n % 7)),
    simulate("7-day break", (n) => n < 30 || n > 36),
  ];
  for (const row of rows) console.log(`     ${JSON.stringify(row)}`);
  for (const row of rows) {
    if (row.overBudget) throw new Error(`${row.name}: ${row.overBudget} days over 10 minutes`);
    if (row.passed === 0) throw new Error(`${row.name}: nothing passed`);
    if (row.maxMinutes > 13) throw new Error(`${row.name}: a day of ${row.maxMinutes} min`);
  }
  return "no day over the amount except one whole next-day check";
});

const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} PASS${BREAK ? ` (break: ${BREAK} — ${(BREAKS[BREAK] || {}).why})` : ""}`);
process.exit(failed ? 1 : 0);
