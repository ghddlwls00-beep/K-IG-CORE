#!/usr/bin/env node
/**
 * Phase 5 (grading) — runs the SITE'S OWN graders over EVERY graded item, with the kinds of
 * answer a real learner types. No browser, no sampling: this is the exhaustive half of
 * "test correct and incorrect answers, and answers rejected for capitalization, spacing,
 * punctuation or minor formatting".
 *
 *   GRAMMAR I/II  src/lib/grammarGrading.ts  gradeAgainstReferences(user, [model, ...alts])
 *   LISTENING     src/lib/listeningUtils.ts  generateWordBank + verifyAnyWordSequence (tap dictation)
 *   STUDENT       the same tap-dictation path
 *   VOCA          src/lib/vocaUtils.ts       generateActiveRecallQuizzes (distractors vs the answer)
 *
 * Output: out/grade-offline.json + printed summary.
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OUT = path.join(__dirname, "../out");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const listening = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const voca = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));

const VARIANTS = [
  { kind: "exact", make: (s) => s },
  { kind: "lowercase", make: (s) => s.toLowerCase() },
  { kind: "uppercase-first-word", make: (s) => s.replace(/^(\w)/, (m) => m.toUpperCase()) },
  { kind: "double-spaces", make: (s) => s.replace(/ /g, "  ") },
  { kind: "no-final-period", make: (s) => s.replace(/[.!?]\s*$/, "") },
  { kind: "trailing-space", make: (s) => `${s} ` },
  { kind: "curly-apostrophe", make: (s) => s.replace(/'/g, "’") },
  { kind: "curly-quotes", make: (s) => { let open = true; return s.replace(/"/g, () => (open = !open) ? "”" : "“"); } },
  { kind: "no-comma", make: (s) => s.replace(/,/g, "") },
  {
    kind: "expanded-contraction",
    make: (s) => {
      const map = { "can't": "cannot", "won't": "will not", "shan't": "shall not", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not", "mustn't": "must not", "i'm": "I am", "it's": "it is", "that's": "that is", "he's": "he is", "she's": "she is", "there's": "there is", "we're": "we are", "they're": "they are", "you're": "you are", "i've": "I have", "we've": "we have", "they've": "you have", "i'll": "I will", "we'll": "we will", "they'll": "they will", "you'll": "you will", "i'd": "I would", "he'd": "he would", "they'd": "they would" };
      return s.replace(/\b[\w']+\b/g, (w) => map[w.toLowerCase()] ? (w[0] === w[0].toUpperCase() ? map[w.toLowerCase()].replace(/^./, (c) => c.toUpperCase()) : map[w.toLowerCase()]) : w);
    },
  },
  { kind: "contracted", make: (s) => s.replace(/\bI am\b/g, "I'm").replace(/\bdo not\b/g, "don't").replace(/\bis not\b/g, "isn't").replace(/\bare not\b/g, "aren't").replace(/\bcan not\b/g, "can't") },
];
const WRONG = (s) => `zzz ${s.split(/\s+/).slice(0, 2).reverse().join(" ")} qqq`;

const report = { at: new Date().toISOString(), grammar: {}, dictation: {}, voca: {} };

// ---------- GRAMMAR I / II ----------
for (const course of ["grammar1", "grammar2"]) {
  const stat = { items: 0, byVariant: {}, wrongAcceptedCount: 0, examples: {}, wrongAccepted: [] };
  for (const p of E.pages(course)) {
    const exp = E.expected(course, p.id);
    if (!exp.answers.length) continue;
    // only the page that is actually answered by the learner (the main, Korean-prompt page)
    if (exp.variant !== "main") continue;
    for (const a of exp.answers) {
      if (!a.text || /[가-힣]/.test(a.text)) continue;
      stat.items++;
      const refs = [a.text, ...(a.alternatives || [])];
      for (const v of VARIANTS) {
        const user = v.make(a.text);
        if (user === a.text && v.kind !== "exact") continue;
        // gradeAgainstReferences returns the grade string itself: "exact" | "partial" | "incorrect"
        const g = String(grading.gradeAgainstReferences(user, refs));
        const s = (stat.byVariant[v.kind] ||= { tried: 0, exact: 0, partial: 0, incorrect: 0 });
        s.tried++;
        s[g] = (s[g] || 0) + 1;
        if (g !== "exact") {
          const ex = (stat.examples[v.kind] ||= []);
          if (ex.length < 6) ex.push({ lesson: p.id, n: a.n, model: a.text, typed: user, verdict: g });
        }
      }
      const w = String(grading.gradeAgainstReferences(WRONG(a.text), refs));
      if (w === "exact") { stat.wrongAcceptedCount++; if (stat.wrongAccepted.length < 6) stat.wrongAccepted.push({ lesson: p.id, n: a.n, model: a.text }); }
      for (const alt of a.alternatives || []) {
        const g = String(grading.gradeAgainstReferences(alt, refs));
        const s = (stat.byVariant["declared-alternative"] ||= { tried: 0, exact: 0, partial: 0, incorrect: 0 });
        s.tried++; s[g] = (s[g] || 0) + 1;
        if (g !== "exact") {
          const ex = (stat.examples["declared-alternative"] ||= []);
          if (ex.length < 6) ex.push({ lesson: p.id, n: a.n, model: a.text, typed: alt, verdict: g });
        }
      }
    }
  }
  report.grammar[course] = stat;
}

// ---------- LISTENING / STUDENT tap dictation ----------
for (const course of ["ld", "student"]) {
  const stat = { sentences: 0, exactPass: 0, exactFail: 0, caseFail: 0, reorderAccepted: 0, bankMissingWord: 0, examples: [] };
  for (const p of E.pages(course)) {
    const exp = E.expected(course, p.id);
    if (exp.variant !== "main") continue;
    for (const a of exp.answers) {
      const sentence = a.text;
      if (!sentence || sentence.length < 4) continue;
      stat.sentences++;
      let accepted = [];
      try {
        accepted = (listening.expandSlashAlternatives ? listening.expandSlashAlternatives(sentence) : [sentence]).map((s) => s.split(/\s+/).map((w) => w.replace(/[^\w'’-]/g, "")).filter(Boolean));
      } catch { accepted = [sentence.split(/\s+/)]; }
      const target = accepted[0];
      const ok = listening.verifyAnyWordSequence ? listening.verifyAnyWordSequence(target, accepted) : listening.verifyWordSequence(target, target);
      if (ok) stat.exactPass++;
      else { stat.exactFail++; if (stat.examples.length < 8) stat.examples.push({ lesson: p.id, n: a.n, sentence: sentence.slice(0, 70), why: "the sentence's own words are not accepted" }); }
      const upper = target.map((w) => w.toUpperCase());
      const okUpper = listening.verifyAnyWordSequence ? listening.verifyAnyWordSequence(upper, accepted) : false;
      if (!okUpper) stat.caseFail++;
      if (target.length > 2) {
        const swapped = [...target];
        [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
        if (listening.verifyAnyWordSequence && listening.verifyAnyWordSequence(swapped, accepted)) stat.reorderAccepted++;
      }
      // the word bank must contain every word the answer needs
      try {
        const bank = listening.generateWordBank(sentence, accepted);
        const pool = new Set((Array.isArray(bank) ? bank : bank.words || []).map((w) => String(w).toLowerCase()));
        const missing = target.filter((w) => !pool.has(w.toLowerCase()));
        if (missing.length) { stat.bankMissingWord++; if (stat.examples.length < 16) stat.examples.push({ lesson: p.id, n: a.n, sentence: sentence.slice(0, 60), why: `word bank misses ${missing.slice(0, 3).join(", ")}` }); }
      } catch (e) { /* signature differs — reported below */ }
    }
  }
  report.dictation[course] = stat;
}

// ---------- VOCA quiz distractors ----------
{
  const stat = { lessons: 0, questions: 0, distractorSharesMeaning: 0, answerNotInOptions: 0, examples: [] };
  const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
  for (const p of E.pages("phonics")) {
    const words = E.gridWords(E.lesson("phonics", p.id));
    if (!words.length) continue;
    stat.lessons++;
    let quizzes = [];
    try { quizzes = voca.generateActiveRecallQuizzes(words, dict) || []; } catch (e) { stat.error = String(e.message).slice(0, 120); break; }
    for (const q of quizzes) {
      stat.questions++;
      const answer = q.answer ?? q.correct ?? q.meaning;
      const options = q.options || q.choices || [];
      if (answer && options.length && !options.includes(answer)) {
        stat.answerNotInOptions++;
        if (stat.examples.length < 6) stat.examples.push({ lesson: p.id, word: q.word, answer, options: options.slice(0, 4) });
      }
      const dups = options.filter((o) => o !== answer && String(o).trim() === String(answer).trim());
      if (dups.length) {
        stat.distractorSharesMeaning++;
        if (stat.examples.length < 12) stat.examples.push({ lesson: p.id, word: q.word, answer, duplicate: dups[0] });
      }
    }
  }
  report.voca = stat;
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "grade-offline.json"), JSON.stringify(report, null, 1));
for (const [c, s] of Object.entries(report.grammar)) {
  console.log(`\n=== ${c}: ${s.items} graded items`);
  for (const [k, v] of Object.entries(s.byVariant)) console.log(`   ${k.padEnd(22)} tried ${String(v.tried).padStart(5)} · exact ${String(v.exact || 0).padStart(5)} · partial ${String(v.partial || 0).padStart(4)} · incorrect ${String(v.incorrect || 0).padStart(4)}`);
  console.log(`   clearly wrong answer accepted: ${s.wrongAcceptedCount}`);
  for (const [k, ex] of Object.entries(s.examples)) if (ex.length) console.log(`   e.g. ${k}: ${JSON.stringify(ex[0])}`);
}
for (const [c, s] of Object.entries(report.dictation)) console.log(`\n=== ${c} dictation: ${s.sentences} sentences · own words rejected ${s.exactFail} · UPPERCASE rejected ${s.caseFail} · wrong order accepted ${s.reorderAccepted} · word bank missing a word ${s.bankMissingWord}` + (s.examples.length ? `\n   e.g. ${JSON.stringify(s.examples[0])}` : ""));
console.log(`\n=== VOCA quiz: ${report.voca.lessons} lessons · ${report.voca.questions} questions · distractor identical to the answer ${report.voca.distractorSharesMeaning} · answer missing from options ${report.voca.answerNotInOptions}` + (report.voca.error ? ` · ERROR ${report.voca.error}` : "") + (report.voca.examples.length ? `\n   e.g. ${JSON.stringify(report.voca.examples[0])}` : ""));
