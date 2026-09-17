#!/usr/bin/env node
/**
 * GRAMMAR I fixes (apply-grammar1.cjs) — graded with the shipped grader
 * (src/lib/grammarGrading.ts gradeAgainstReferences) against the REAL lesson files:
 * the model answer + "다른 정답" of each item, exactly what the lesson component grades with.
 *
 * For every High/Medium fix: the standard English a learner should write is "exact", and the
 * wrong form the lesson used to teach (or the broken alternative it used to accept) is not.
 *
 *   node verify-grammar1-fixes.cjs     exit 0 = every case as expected
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { gradeAgainstReferences } = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));

const answerPage = (koPage) => `gh1-${String(parseInt(koPage.slice(4), 10) + 1).padStart(3, "0")}`;
function refs(koPage, n) {
  const id = answerPage(koPage);
  const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/grammar1", `${id}.json`), "utf8"));
  for (const b of lesson.blocks) {
    if (b.type !== "sentences") continue;
    const it = b.items.find((x) => x.n === String(n));
    if (it) return [it.text.replace(/^\s*\d+[.)]\s*/, ""), ...(it.alternatives || [])];
  }
  throw new Error(`${id} #${n} not found`);
}
const results = [];
const accept = (id, koPage, n, input) => {
  const got = gradeAgainstReferences(input, refs(koPage, n));
  results.push({ id, what: `${koPage} #${n} accepts "${input}"`, ok: got === "exact", got });
};
const reject = (id, koPage, n, input) => {
  const got = gradeAgainstReferences(input, refs(koPage, n));
  results.push({ id, what: `${koPage} #${n} no longer full marks for "${input}"`, ok: got !== "exact", got });
};

// G1-09 this/these → it/they
for (const [p, n, good, bad] of [
  ["gh1-014", 13, "This is your book, isn't it?", "This is your book, isn't this?"],
  ["gh1-038", 5, "This is a pen, isn't it?", "This is a pen, isn't this?"],
  ["gh1-038", 7, "These are pens, aren't they?", "These are pens, aren't these?"],
  ["gh1-046", 100, "This is not a pen, is it?", "This is not a pen, is this?"],
  ["gh1-046", 102, "These are not pens, are they?", "These are not pens, are these?"],
  ["gh1-058", 12, "That is your car, isn't it?", "That is your car, isn't that?"],
  ["gh1-078", 7, "This is a very important problem, isn't it?", "This is a very important problem, isn't this?"],
  ["gh1-112", 110, "This is a homemade bomb, isn't it?", "This is a homemade bomb, isn't this?"],
]) { accept("G1-09", p, n, good); reject("G1-09", p, n, bad); }
// G1-17 aren't I
for (const [p, n, good, bad] of [
  ["gh1-038", 1, "I am a boy, aren't I?", "I am a boy, ain't I?"],
  ["gh1-046", 84, "I am in Korea, aren't I?", "I am in Korea, ain't I?"],
  ["gh1-108", 57, "I am extremely tall, aren't I?", "I am extremely tall, ain't I?"],
  ["gh1-024", 41, "Aren't I a boy?", "Ain't I a boy?"],
]) { accept("G1-17", p, n, good); reject("G1-17", p, n, bad); }
// G1-20 split items, answers restored
accept("G1-20", "gh1-032", 36, "Don't I love her?");
accept("G1-20", "gh1-032", 37, "This is mine.");
accept("G1-20", "gh1-032", 38, "It is yours.");
accept("G1-20", "gh1-032", 39, "They are theirs.");
accept("G1-20", "gh1-032", 39, "Those are theirs.");
// G1-23 statement + "?" is not a tag question
reject("G1-23", "gh1-038", 1, "I am a boy?");
reject("G1-23", "gh1-038", 5, "This is a pen?");
reject("G1-23", "gh1-046", 81, "It is a book?");
// G1-25 answers match the Korean prompts
accept("G1-25", "gh1-040", 26, "You are not in Korea, are you?");
accept("G1-25", "gh1-040", 26, "You aren't in Korea, are you?");
reject("G1-25", "gh1-040", 26, "I love you, don't I?");
accept("G1-25", "gh1-040", 33, "This is not a pen, is it?");
accept("G1-25", "gh1-040", 39, "You love my sister, don't you?");
accept("G1-25", "gh1-040", 40, "He loves me, doesn't he?");
accept("G1-26", "gh1-046", 103, "Those are not books, are they?");
accept("G1-27", "gh1-046", 111, "He loves her sister, doesn't he?");
reject("G1-27", "gh1-046", 111, "He loves her sister, doesn't she?");
accept("G1-33", "gh1-068", 80, "Not every boy received a prize, did he?");
accept("G1-42", "gh1-080", 6, "The police arrested 15 people, didn't they?");
// Medium
reject("G1-03", "gh1-008", 19, "family name: last name");
accept("G1-08", "gh1-014", 11, "What book do you want?");
reject("G1-08", "gh1-014", 11, "Which What book do you want?");
accept("G1-10", "gh1-014", 23, "She is beautiful, isn't she?");
accept("G1-10", "gh1-014", 23, "She looks beautiful, doesn't she?");
accept("G1-13", "gh1-016", 5, "Not all boys receive a prize.");
accept("G1-13", "gh1-016", 5, "All boys do not receive a prize.");
accept("G1-13", "gh1-016", 7, "Not all of them came.");
accept("G1-14", "gh1-016", 32, "How many days were you in the USA?");
accept("G1-14", "gh1-016", 32, "How many days were you in the United States?");
accept("G1-28", "gh1-050", 32, "Is that mine?");
reject("G1-28", "gh1-050", 32, "Is it that mine?");
accept("G1-31", "gh1-062", 11, "Is it warm today?");
accept("G1-34", "gh1-068", 82, "Not all of them come.");
accept("G1-34", "gh1-068", 82, "All of them don't come.");
accept("G1-34", "gh1-118", 57, "What do you want?");
accept("G1-34", "gh1-118", 57, "What would you like?");
reject("G1-41", "gh1-080", 2, "Is your a rich man?");
accept("G1-41", "gh1-080", 2, "Is your father a rich man?");
reject("G1-41", "gh1-094", 74, "All the boys Each boy, Every boy ignored the advice.");
accept("G1-41", "gh1-094", 74, "Every boy ignored the advice.");
accept("G1-41", "gh1-118", 41, "The team could obtain numerous samples, couldn't it?");
accept("G1-43", "gh1-082", 15, "They didn't spend any time on an island, did they?");
accept("G1-45", "gh1-092", 48, "Why do they buy it on the black market?");
accept("G1-48", "gh1-094", 71, "Every boy gets a tour of the center.");
accept("G1-48", "gh1-094", 71, "Each boy gets a tour of the center.");
accept("G1-49", "gh1-100", 131, "When did you let her into your strange little world?");
accept("G1-50", "gh1-120", 17, "Secretary of State Colin Powell is returning home from his Middle East trip.");
accept("G1-51", "gh1-116", 7, "The currently available vaccine is effective, isn't it?");
accept("G1-52", "gh1-110", 107, "Did you arrive there on time?");
reject("G1-52", "gh1-110", 107, "Did you reach there on time?");
// Low (answer additions)
accept("G1-11", "gh1-014", 16, "He wants a lot of money, doesn't he?");
accept("G1-30", "gh1-060", 7, "He has more money than I do.");
accept("G1-32", "gh1-066", 76, "Every boy received a prize, didn't they?");
accept("G1-37", "gh1-078", 1, "Why did you hit him?");
accept("G1-38", "gh1-078", 19, "We haven't seen each other for a long time, have we?");
accept("G1-40", "gh1-078", 40, "I am a busy woman.");
accept("G1-44", "gh1-082", 31, "Are officials canceling ski races?");
reject("G1-53", "gh1-098", 110, "He is not a Japanese, is he?");
accept("G1-55", "gh1-102", 146, "Haven't they emerged yet?");
accept("G1-56", "gh1-106", 10, "Who was killed and captured?");

// No Korean or notes left inside English answers, no "ain't"/"isn't this" anywhere in GRAMMAR I answers
const dir = path.join(REPO, "content/lessons/grammar1");
let leftovers = [];
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const odd = parseInt(f.slice(4, 7), 10) % 2 === 1;
  if (!odd) continue;
  for (const b of d.blocks) {
    if (b.type !== "sentences") continue;
    for (const it of b.items) for (const t of [it.text, ...(it.alternatives || [])]) {
      // A tag question follows a comma ("…, isn't this?"); "Whose pen is this?" is an ordinary question.
      if (/[가-힣]/.test(t) || /\bain't\b/i.test(t) || /,\s*(isn't|aren't|is|are)(\s+not)?\s+(this|that|these|those)(\s+not)?\?/i.test(t)) leftovers.push(`${f} #${it.n}: ${t}`);
    }
  }
}
results.push({ id: "scan", what: "GRAMMAR I answers: no Hangul, no ain't, no tag with this/that/these/those", ok: leftovers.length === 0, got: leftovers.slice(0, 5).join(" | ") });

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id}  ${r.what}${r.ok ? "" : `  → ${r.got}`}`);
console.log(`\n${results.length - failed.length}/${results.length} as expected`);
process.exit(failed.length ? 1 : 0);
