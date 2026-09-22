#!/usr/bin/env node
/**
 * CNT-02 / CNT-03 — the GRAMMAR exam grader, graded on the audit's own inputs.
 *
 * Loads `src/lib/grammarGrading.ts` (the module the component imports — not a
 * copy) and the real lesson files, and asserts the exact cases the launch
 * audit typed into production, plus the regressions the new rules must not
 * introduce (typos keep partial credit; single words and padding do not).
 *
 *   node verify-grammar-grading.cjs
 *
 * EXIT 0 = every case graded as expected. Exit 1 = at least one did not, with
 * the input, the reference and both grades printed.
 */

const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");

const { gradeAnswer, gradeAgainstReferences, normalizeForComparison } = loadTs(
  path.join(REPO, "src/lib/grammarGrading.ts"),
);

function lessonSentence(course, id, n) {
  const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", course, `${id}.json`), "utf8"));
  for (const block of lesson.blocks) {
    if (block.type !== "sentences") continue;
    const item = block.items.find((s) => s.n === String(n));
    if (item) return { text: item.text.replace(/^\s*\d+[.)]\s*/, ""), alternatives: item.alternatives || [] };
  }
  throw new Error(`${course}/${id} #${n} not found`);
}

const cases = [];
function expect(label, input, references, want) {
  const refs = Array.isArray(references) ? references : [references];
  const got = gradeAgainstReferences(input, refs);
  cases.push({ label, input, references: refs, want, got, ok: got === want });
}
/** A guard: the only requirement is that a wrong form never reaches full marks. */
function expectBelowExact(label, input, references) {
  const refs = Array.isArray(references) ? references : [references];
  const got = gradeAgainstReferences(input, refs);
  cases.push({ label, input, references: refs, want: "partial or incorrect", got, ok: got !== "exact" });
}

// --- the audit's inputs (CNT-02) ---------------------------------------------
expect("contraction I'm", "I'm Korean.", "I am Korean.", "exact");
expect("contraction He's", "He's Japanese.", "He is Japanese.", "exact");
expect("contraction It's + o'clock", "It's seven o'clock.", "It is seven o'clock.", "exact");
expect("contraction isn't", "No, it isn't cold.", "No, it is not cold.", "exact");
expect("contraction wasn't", "No, it wasn't cold yesterday.", "No, it was not cold yesterday.", "exact");
expect("expanded I will vs model I'll", "I will go there", "I'll go there.", "exact");
expect("cannot vs textbook can not", "Though I love you, I cannot do this.", "Though I love you, I can not do this.", "exact");
expect("content substitution: banana", "He folded the napkin into a banana.", "He folded the napkin into a triangle.", "incorrect");
expect(
  "content substitution: left banana",
  "She has been working in a bank since she left banana.",
  "She has been working in a bank since she left school.",
  "incorrect",
);

// --- the audit's answer-key cases against the REAL lesson files (CNT-03) -----
// Owner decision, 2026-09-17: gh2-007 Q3 and gh2-008 Q2 take the wording the
// Korean prompt asks for ("공부하지" → study, "할 것이다" → will); gh1-009 #3 and
// #25 keep the textbook's spelling and are handled by the grader alone.
const gh2007q7 = lessonSentence("grammar2", "gh2-007", 7);
expect("gh2-007 Q7 cannot vs textbook 'can not'", "Though I love you, I cannot do this.", [gh2007q7.text, ...gh2007q7.alternatives], "exact");
const gh1009q25 = lessonSentence("grammar1", "gh1-009", 25);
expect("gh1-008 Q25 girlfriend vs textbook 'girl friend'", "Was she your girlfriend?", [gh1009q25.text, ...gh1009q25.alternatives], "exact");
const gh1009q3 = lessonSentence("grammar1", "gh1-009", 3);
expect("gh1-008 Q3 with period vs textbook without", "You were happy.", [gh1009q3.text, ...gh1009q3.alternatives], "exact");
const gh2008q2 = lessonSentence("grammar2", "gh2-008", 2);
expect("gh2-008 Q2 'will' (key changed by owner)", "Even though I failed, I will try again.", [gh2008q2.text, ...gh2008q2.alternatives], "exact");
const gh2007q3 = lessonSentence("grammar2", "gh2-007", 3);
expect("gh2-007 Q3 'study' (key changed by owner)", "Unless you study harder, you will never pass the examination.", [gh2007q3.text, ...gh2007q3.alternatives], "exact");

// --- BUG-010 (2026-09-23): 'd is "would" or "had"; the next word decides ------
// The four items the 09-18 audit found (learner spells out the model's I'd like).
for (const [id, n, typed] of [
  ["gh2-022", 20, "I would like to open a savings account."],
  ["gh2-029", 7, "Operator, I would like to call New York, collect."],
  ["gh2-029", 8, "I would like to know a phone number in Seoul, Korea."],
  ["gh2-037", 13, "I would like to have a phone installed in my apartment."],
]) {
  const s = lessonSentence("grammar2", id, n);
  expect(`BUG-010 ${id} #${n} spelled out 'I would like'`, typed, [s.text, ...s.alternatives], "exact");
}
// The other direction: the model spells it out, the learner contracts it (68 answers had this).
const gh2023q10 = lessonSentence("grammar2", "gh2-023", 10);
expect("BUG-010 gh2-023 #10 I'd like for 'I would like'", "I'd like to take your measurements.", [gh2023q10.text, ...gh2023q10.alternatives], "exact");
const gh2048q3 = lessonSentence("grammar2", "gh2-048", 3);
expect("BUG-010 gh2-048 #3 If I'd known ... I'd have", "If I'd known your phone number, I'd have called you.", [gh2048q3.text, ...gh2048q3.alternatives], "exact");
const gh2015q17 = lessonSentence("grammar2", "gh2-015", 17);
expect("BUG-010 gh2-015 #17 I'd been (had)", "I'd been studying English.", [gh2015q17.text, ...gh2015q17.alternatives], "exact");
expect("BUG-010 You'd better (had)", "You'd better hurry.", "You had better hurry.", "exact");
expect("BUG-010 I'd rather (would)", "I would rather stay home.", "I'd rather stay home.", "exact");
expect("BUG-010 I'd read: learner's ambiguous 'd matches 'had'", "I'd read the book before.", "I had read the book before.", "exact");
expect("BUG-010 I'd read: learner's ambiguous 'd matches 'would'", "I'd read the book if I could.", "I would read the book if I could.", "exact");
// Guards: the rule must not turn a wrong form into a right one. They pass on the old grader
// too (it expanded nothing); what they catch is a rule that expands 'd too freely — shown
// in the work log by running them against the naive "try both everywhere" rule.
const gh1011q9 = lessonSentence("grammar1", "gh1-011", 9);
expectBelowExact("BUG-010 guard: main-verb had has no contraction ('I'd a dream')", "I'd a dream.", [gh1011q9.text, ...gh1011q9.alternatives]);
const gh2009q5 = lessonSentence("grammar2", "gh2-009", 5);
expectBelowExact("BUG-010 guard: 'He'd lunch' for 'He had lunch'", "He'd lunch on the plane.", [gh2009q5.text, ...gh2009q5.alternatives]);
expectBelowExact("BUG-010 guard: I had like (model I'd like = would)", "I had like to open a savings account.", [lessonSentence("grammar2", "gh2-022", 20).text]);
expectBelowExact("BUG-010 guard: I would gone (model I'd gone = had)", "I would gone home.", "I'd gone home.");
expectBelowExact("BUG-010 guard: model's ambiguous 'd is not guessed", "I would read the book.", "I'd read the book.");

// --- spacing-only differences --------------------------------------------------
expect("closed compound = open compound", "Was she your girlfriend?", "Was she your girl friend?", "exact");
expect("open compound = closed compound", "Was she your girl friend?", "Was she your girlfriend?", "exact");
expect("maybe for 'may be' keeps a penalty", "It maybe true.", "It may be true.", "partial");
expect("everyday for 'every day' keeps a penalty", "I study English everyday.", "I study English every day.", "partial");

// --- what must not regress ----------------------------------------------------
expect("typo keeps partial: triangel", "He folded the napkin into a triangel.", "He folded the napkin into a triangle.", "partial");
expect("transposition typo: teh", "He folded teh napkin into a triangle.", "He folded the napkin into a triangle.", "partial");
expect("missing article: partial", "He folded napkin into a triangle.", "He folded the napkin into a triangle.", "partial");
expect("wrong preposition (function word): partial", "He folded the napkin in a triangle.", "He folded the napkin into a triangle.", "partial");
expect("single word: incorrect", "a", "He folded the napkin into a triangle.", "incorrect");
expect("cloze single word without apostrophe (review finding)", "dont", "don't", "exact");
expect("cloze single word wrong", "does", "don't", "incorrect");
expect("empty: incorrect", "", "He folded the napkin into a triangle.", "incorrect");
expect("padding past 1.15: incorrect", "He folded the napkin into a triangle and then he went home again.", "He folded the napkin into a triangle.", "incorrect");
expect("unrelated sentence: incorrect", "I have no interest in music.", "He folded the napkin into a triangle.", "incorrect");

// --- normalisation itself -----------------------------------------------------
const norm = [
  ["I'm", "i am"],
  ["don't", "do not"],
  ["can't", "can not"],
  ["cannot", "can not"],
  ["won't", "will not"],
  ["I’ll", "i will"],
  ["let's go", "let us go"],
  ["mother's counsel", "mothers counsel"],
  ["I'd like it", "i would like it"],
  ["She'd never seen it", "she had never seen it"],
  ["I'd", "id"],
  ["What'd you say", "whatd you say"],
];
for (const [input, want] of norm) {
  const got = normalizeForComparison(input);
  cases.push({ label: `normalize ${input}`, input, references: [], want, got, ok: got === want });
}

let pass = 0;
for (const c of cases) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.label}`);
  if (!c.ok) {
    console.log(`        input : ${JSON.stringify(c.input)}`);
    for (const r of c.references) console.log(`        ref   : ${JSON.stringify(r)}`);
    console.log(`        want ${c.want}, got ${c.got}`);
  }
  if (c.ok) pass++;
}
console.log(`\n${pass}/${cases.length} cases pass (gradeAnswer direct: ${typeof gradeAnswer})`);
process.exit(pass === cases.length ? 0 : 1);
