// Print a compact per-topic inventory from the seven reader summaries.
const fs = require("fs");
const d = process.argv[2] + "/p1";
const order = [1, 0, 4, 5, 6, 2, 3]; // g1 p1-29, g1 p30-63, g2 p1-27, g2 p28-51, g2 p52-71, g3 p1-29, g3 p30-57
const total = { passOff: 0, application: 0, reviewTasks: 0, reviewItems: 0, tables: 0, subtopics: 0, topics: 0 };
const mode = process.argv[3] || "topics";
for (const i of order) {
  const b = JSON.parse(fs.readFileSync(`${d}/book${i}.json`, "utf8"));
  if (mode === "topics") {
    console.log(`## ${b.range} | review items ${b.answerKey.reviewItems}, linked ${b.answerKey.linkedToBookSentence}, new ${b.answerKey.needsNewAnswer} | issues ${b.issues.total} (high ${b.issues.high})`);
    for (const t of b.topics) {
      console.log(`  ${t.printedLabel} ${t.title} p${t.pages} | ${t.subtopics.length} subs: ${t.subtopics.join(" / ")} | PO ${t.passOffSentences} AP ${t.applicationSentences} RT ${t.reviewTasks} RI ${t.reviewItems} TB ${t.tables}`);
      total.passOff += t.passOffSentences;
      total.application += t.applicationSentences;
      total.reviewTasks += t.reviewTasks;
      total.reviewItems += t.reviewItems;
      total.tables += t.tables;
      total.subtopics += t.subtopics.length;
      total.topics += 1;
    }
  } else if (mode === "explain") {
    console.log(`## ${b.range}`);
    for (const t of b.topics) console.log(`  ${t.title}: ${t.explanationText}`);
  } else if (mode === "exercises") {
    console.log(`## ${b.range}`);
    for (const e of b.exerciseTypes) console.log(`  [${e.itemCount}] ${e.type} | ${e.instructionExample} | web: ${e.webIdea}`);
  } else if (mode === "notes") {
    console.log(`## ${b.range}`);
    console.log("  answerKey: " + b.answerKey.notes);
    for (const p of b.pedagogyObservations) console.log("  P: " + p);
    for (const w of b.webConversionNotes) console.log("  W: " + w);
    console.log("  selfCheck: " + b.selfCheck);
  } else if (mode === "issues") {
    console.log(`## ${b.range} total ${b.issues.total} high ${b.issues.high}`);
    for (const x of b.issues.examples) console.log(`  p${x.page} ${x.text} => ${x.fix} (${x.problem})`);
  }
}
if (mode === "topics") console.log(JSON.stringify(total));
