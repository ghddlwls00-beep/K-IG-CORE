// small test: src/lib/lessonGate.ts as the STUDENT · ADULT · GRAMMAR views now use it (one gate per course:lesson, dedupe, clear)
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const G = loadTs(path.join(REPO, "src/lib/lessonGate.ts"));
const S = loadTs(path.join(REPO, "src/lib/studentPractice.ts"));
const BREAK = process.argv[2] || "";
let fails = 0;
const ok = (name, cond, note = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`); if (!cond) fails++; };

let emits = 0;
const off = G.subscribeLessonGate(() => emits++);
ok("no gate yet → null (the end bar keeps STUDENT · ADULT off)", G.getLessonGate("student", "s1-1") === null);
G.setLessonGate("student", "s1-1", { ready: false, reason: "r" });
G.setLessonGate("student", "s1-1", { ready: false, reason: "r" });
ok("same gate twice → one emit", emits === 1, `emits ${emits}`);
const snap = G.getLessonGate("student", "s1-1");
ok("snapshot stable until it changes (useSyncExternalStore)", snap === G.getLessonGate("student", "s1-1"));
G.setLessonGate("adult", "s1-1", { ready: true, reason: "r" });
ok("STUDENT and ADULT gates are separate keys", G.getLessonGate("student", "s1-1").ready === false && G.getLessonGate("adult", "s1-1").ready === true);
G.setLessonGate("student", "s1-1", { ready: true, reason: "r" });
ok("ready flips → new snapshot", G.getLessonGate("student", "s1-1") !== snap && G.getLessonGate("student", "s1-1").ready === true);
G.clearLessonGate("student", "s1-1");
ok("cleared on unmount → null", G.getLessonGate("student", "s1-1") === null);
off();

// the STUDENT · ADULT rule the view hands to the gate (unchanged): 80% dictated and 80% spoken, a completed lesson, or no sentences
const need = S.requiredCount(3);
ok("3 sentences need 3 (80% rounded up)", need === 3, `need ${need}`);
ok("not enough → not ready", S.canCompleteLesson({ total: 3, solved: 3, spoken: 2, completedHere: false }) === false);
ok("enough → ready", S.canCompleteLesson({ total: 3, solved: 3, spoken: BREAK === "rule" ? 2 : 3, completedHere: false }) === true);
ok("seen completed here → ready (STU-U26)", S.canCompleteLesson({ total: 3, solved: 0, spoken: 0, completedHere: true }) === true);
ok("no sentences → ready", S.canCompleteLesson({ total: 0, solved: 0, spoken: 0, completedHere: false }) === true);
console.log(fails ? `FAIL ${fails}` : "all PASS");
process.exit(fails ? 1 : 0);
