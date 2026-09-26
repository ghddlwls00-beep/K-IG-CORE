const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const iss = j.issues;
const count = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
let n = 0, link = 0, fix = 0, pf = 0, slotOnly = 0, proposed = 0;
const perTopic = {};
for (const t of j.topics) {
  const pt = perTopic[t.printedLabel] = { passOff: 0, application: 0, tasks: 0, reviewItems: 0 };
  for (const s of t.sections) {
    if (s.kind === 'passOff') pt.passOff = s.groups.reduce((a, g) => a + g.items.length, 0);
    if (s.kind === 'application') pt.application = s.groups.reduce((a, g) => a + g.items.length, 0);
    if (s.kind !== 'review') continue;
    pt.tasks = s.tasks.length;
    for (const k of s.tasks) for (const it of k.items) {
      n++; pt.reviewItems++;
      if (it.answerFromBook) link++;
      if (it.answerFix) fix++;
      if (it.promptFix) pf++;
      if (it.proposedAnswer) proposed++;
      if (!it.answerFromBook && it.extraSlotAnswer) slotOnly++;
    }
  }
}
// no empty strings anywhere
let empty = 0;
(function walk(o) {
  if (o === '') empty++;
  else if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') Object.values(o).forEach(walk);
})(j);
console.log(JSON.stringify({ perTopic, reviewItems: n, linkedToBookSentence: link, slotOnlyAnswers: slotOnly,
  proposed, answerFix: fix, promptFix: pf, issues: iss.length,
  byConfidence: count(iss, i => i.confidence), byType: count(iss, i => i.type), emptyStrings: empty }, null, 1));
