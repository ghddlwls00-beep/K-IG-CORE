#!/usr/bin/env node
/**
 * GRAMMAR II fixes (apply-grammar2.cjs) — graded with the shipped grader
 * (src/lib/grammarGrading.ts gradeAgainstReferences) against the REAL lesson files
 * (gh2-NNN: model answer + "다른 정답"), plus content scans over every GRAMMAR II page.
 *
 *   node verify-grammar2-fixes.cjs     exit 0 = every case as expected
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { gradeAgainstReferences } = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const dir = path.join(REPO, "content/lessons/grammar2");
const itemOf = (id, n) => {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8"));
  for (const b of lesson.blocks) if (b.type === "sentences") { const it = b.items.find((x) => x.n === String(n)); if (it) return it; }
  throw new Error(`${id} #${n} not found`);
};
const refs = (id, n) => { const it = itemOf(id, n); return [it.text.replace(/^\s*\d+[.)]\s*/, ""), ...(it.alternatives || [])]; };
const results = [];
const accept = (g, id, n, input) => { const got = gradeAgainstReferences(input, refs(id, n)); results.push({ g, what: `${id} #${n} accepts "${input}"`, ok: got === "exact", got }); };
const reject = (g, id, n, input) => { const got = gradeAgainstReferences(input, refs(id, n)); results.push({ g, what: `${id} #${n} no full marks for "${input}"`, ok: got !== "exact", got }); };
const koIs = (g, id, n, re) => { const t = itemOf(`${id}-1`, n).text; results.push({ g, what: `${id}-1 #${n} Korean ${re}`, ok: re.test(t), got: t }); };

// High
accept("G2-06", "gh2-020", 21, "I will remember to see you tomorrow.");
reject("G2-06", "gh2-020", 21, "I remember to see you tomorrow.");
accept("G2-23", "gh2-027", 12, "He got a \"C\" average on his report card, but I am sure he will get better grades next year.");
accept("G2-23", "gh2-045", 1, "The exact time when the murder had been committed was never discovered.");
accept("G2-23", "gh2-046", 3, "Let me know the time of your arrival so that I can meet you at the station.");
accept("G2-23", "gh2-048", 3, "If I had known your phone number, I would have called you.");
accept("G2-23", "gh2-048", 3, "Had I known your phone number, I would have called you.");
accept("G2-23", "gh2-048", 9, "If they had had the ability to make money, they would have had food and clothing.");
accept("G2-23", "gh2-048", 11, "If the blood products had been heat-treated, they could not have been infected with HIV.");
accept("G2-23", "gh2-050", 9, "I know the president accepted the Secretary's suggestion that he convene the summit in Washington.");
accept("G2-23", "gh2-050", 10, "Japan's officials sought to protect drug companies from competition, failing to prevent the spread of HIV among hemophiliacs.");
koIs("G2-23", "gh2-027", 12, /확신한다\.$/);
koIs("G2-23", "gh2-050", 9, /받아들였다는 것을 안다\.$/);
accept("G2-24", "gh2-048", 15, "Had I been three minutes late, I would have missed the train.");
accept("G2-24", "gh2-048", 15, "If I had been three minutes late, I would have missed the train.");
reject("G2-24", "gh2-048", 15, "Should I have been three minutes late, I should have missed the train.");
accept("G2-25", "gh2-048", 16, "Should you not go, he would go.");
accept("G2-25", "gh2-048", 16, "If you should not go, he would go.");
accept("G2-26", "gh2-036", 2, "Though he did his best, he could not succeed.");
reject("G2-26", "gh2-036", 2, "To do his best, he could not succeed.");
accept("G2-27", "gh2-037", 3, "This is so heavy that I cannot carry it.");
reject("G2-27", "gh2-037", 3, "This is so heavy that I can not carry.");
accept("G2-28", "gh2-031", 11, "He likes reading fiction very much.");
accept("G2-28", "gh2-031", 11, "He likes to read fiction very much.");
reject("G2-28", "gh2-031", 11, "He likes it very much to read fictions.");
accept("G2-29", "gh2-028", 20, "Do you recognize me?");
reject("G2-29", "gh2-028", 20, "Can you see me?");
// Medium
accept("G2-02", "gh2-011", 15, "The office is in the North Texas city of Dallas.");
reject("G2-02", "gh2-011", 15, "The office is in the southern Texas city of Dallas.");
koIs("G2-02", "gh2-011", 15, /북부/);
koIs("G2-03", "gh2-013", 3, /기독교인으로서/);
koIs("G2-03", "gh2-018", 8, /수상으로서/);
accept("G2-04", "gh2-013", 13, "It will be fine tomorrow.");
accept("G2-05", "gh2-013", 15, "He will be fifteen tomorrow.");
accept("G2-07", "gh2-017", 13, "They are not both good.");
koIs("G2-10", "gh2-024", 4, /괜찮으시겠습니까\?$/);
accept("G2-11", "gh2-024", 5, "No, not at all. Go ahead.");
accept("G2-11", "gh2-024", 5, "No, I don't mind. Go ahead.");
accept("G2-12", "gh2-024", 22, "We are going to have a three-day weekend.");
accept("G2-13", "gh2-025", 2, "I worked at a factory by day and studied at a library by night.");
accept("G2-14", "gh2-025", 9, "He sounded the alarm.");
accept("G2-15", "gh2-025", 10, "Don't take it personally.");
reject("G2-30", "gh2-029", 12, "You have the right number.");
accept("G2-31", "gh2-031", 1, "Their original plan was for the balloon to fly across the Arctic Ocean.");
accept("G2-31", "gh2-047", 10, "More than 24 seamen were killed and 35 more were wounded.");
accept("G2-32", "gh2-033", 14, "Since I was in a hurry, I thought I had no choice but to step on it.");
reject("G2-32", "gh2-033", 14, "Since I was in a hurry, I thought I had no choice but step on it.");
accept("G2-33", "gh2-048", 10, "He would be in high school now if he had not flunked a grade.");
accept("G2-34", "gh2-050", 7, "He said, \"Alexander conquered the Persian Empire.\"");
reject("G2-34", "gh2-050", 8, "He said that Alexander conquered most of Europe.");
accept("G2-35", "gh2-039", 9, "I remember the girl he helped.");
koIs("G2-36", "gh2-039", 8, /산 책이다/);
koIs("G2-37", "gh2-038", 6, /시간을 잘 지키는/);
koIs("G2-38", "gh2-042", 8, /드러났다\.$/);
koIs("G2-38", "gh2-046", 7, /마스터하지 못할 것이다\.$/);
accept("G2-39", "gh2-042", 9, "The question is who will get there first.");
reject("G2-39", "gh2-042", 9, "The question is who will reach there first.");
accept("G2-40", "gh2-027", 2, "Are you going to breast-feed your baby as you did before?");
accept("G2-40", "gh2-027", 3, "No, I am going to bottle-feed my baby.");
reject("G2-41", "gh2-037", 16, "I had a little a few alterations made.");
accept("G2-41", "gh2-037", 16, "I had a few alterations made.");
// Low (answer additions)
accept("G2-01", "gh2-007", 7, "Though I love you, I cannot do this.");
accept("G2-08", "gh2-017", 15, "Either is good.");
accept("G2-09", "gh2-018", 14, "The plant grows fast.");
accept("G2-16", "gh2-009", 11, "As soon as I arrived home, I discovered the burglary.");
accept("G2-17", "gh2-016", 25, "I didn't see anyone.");
accept("G2-17", "gh2-021", 22, "I felt guilty.");
accept("G2-18", "gh2-013", 23, "You don't need to study English.");
accept("G2-18", "gh2-017", 4, "He has just arrived.");
accept("G2-22", "gh2-011", 9, "He traveled through China.");
accept("G2-22", "gh2-011", 20, "You can go to prison for drunk driving.");
accept("G2-42", "gh2-029", 10, "May I speak to Mr. Kim?");
accept("G2-43", "gh2-028", 4, "It's my treat.");
accept("G2-43", "gh2-034", 14, "This is the wrong place for him to announce the news.");
accept("G2-45", "gh2-036", 11, "She rose to deliver a 40-minute speech.");

// Scans over every GRAMMAR II page
const leftovers = [];
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const isKo = /-1\.json$/.test(f);
  for (const b of d.blocks) {
    if (b.type !== "sentences") continue;
    for (const it of b.items) for (const t of [it.text, ...(it.alternatives || [])]) {
      if (!isKo && (/[가-힣]/.test(t) || /,\.$/.test(t) || /[a-z]\.[A-Z]/.test(t) || /\b(bynight|theArctic|\d+seamen|don t)\b/.test(t) || !/[.?!"”]$/.test(t.trim()))) leftovers.push(`${f} #${it.n}: ${t}`);
      // "으로써" is right for a means ("사임함으로써" = by resigning); only the role nouns G2-03 fixed are checked.
      if (isKo && (/(기독교인|군인|수상)으로써/.test(t) || /(이 다|어 요|없 었다|범 법자|안들 립니다|것으 로|무찌 를)/.test(t))) leftovers.push(`${f} #${it.n}: ${t}`);
    }
  }
}
results.push({ g: "scan", what: "GRAMMAR II: no Hangul/cut/glued words in English, every English answer ends a sentence, no 으로써 or split-word Korean", ok: leftovers.length === 0, got: leftovers.slice(0, 6).join(" | ") });

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.g}  ${r.what}${r.ok ? "" : `  → ${r.got}`}`);
console.log(`\n${results.length - failed.length}/${results.length} as expected`);
process.exit(failed.length ? 1 : 0);
