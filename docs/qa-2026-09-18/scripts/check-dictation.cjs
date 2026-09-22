#!/usr/bin/env node
/**
 * The sweep reported 164 tap-dictation items where placing the tiles in the CORRECT order was
 * still marked wrong. That could be the audit driver ordering the tiles badly, so this asks the
 * app's own modules instead of the live page: build each sentence's word bank exactly as
 * LdLearningView does, assemble the tiles in the order the bank itself calls correct, and run the
 * same check the 정답 확인 button runs.
 *
 * It also assembles each ALTERNATIVE sequence the bank hands out extra tiles for (the "He/She",
 * "sir/ma'am" slash forms), because LdLearningView checks with verifyWordSequence against the
 * first sequence only, while verifyAnyWordSequence — which accepts the alternatives — exists and
 * is not used there.
 *
 *   node check-dictation.cjs
 * Output: out/dictation-offline.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const L = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const OUT = path.join(__dirname, "../out");

const failCorrect = [];
const failAlternative = [];
let sentences = 0, withAlternatives = 0;

for (const [lesson, rows] of Object.entries(E.ldScripts)) {
  for (const r of rows || []) {
    const en = String(r.en || "").trim();
    if (!en) continue;
    sentences++;
    let bank;
    try { bank = L.generateWordBank(en, []); } catch (e) { failCorrect.push({ lesson, n: r.n, en, why: `word bank could not be built: ${e.message}` }); continue; }
    const accepted = bank.acceptedWordSequences || [bank.correctWords];

    // 1. the order the bank itself calls correct must pass the button's own check
    if (!L.verifyWordSequence(bank.correctWords, bank.correctWords)) {
      failCorrect.push({ lesson, n: r.n, en, why: "정답 순서인데 오답 처리", words: bank.correctWords });
    }
    // 2. every tile must be placeable: the correct words must all exist in the tile list
    const pool = (bank.allTiles || []).map((t) => String(t.word).toLowerCase());
    for (const w of bank.correctWords) {
      const i = pool.indexOf(String(w).toLowerCase());
      if (i < 0) { failCorrect.push({ lesson, n: r.n, en, why: `타일에 "${w}" 가 없어 정답을 만들 수 없음`, words: bank.correctWords }); break; }
      pool.splice(i, 1);
    }
    // 3. alternatives the bank hands out tiles for, but the check does not accept
    if (accepted.length > 1) {
      withAlternatives++;
      for (const alt of accepted.slice(1)) {
        if (!L.verifyWordSequence(alt, bank.correctWords)) {
          failAlternative.push({ lesson, n: r.n, en, accepted: alt.join(" "), onlyAccepted: bank.correctWords.join(" ") });
        }
      }
    }
  }
}

const byLesson = (list) => [...new Set(list.map((x) => x.lesson))];
const out = {
  at: new Date().toISOString(),
  sentences,
  withAlternatives,
  correctOrderRejected: failCorrect.length,
  correctOrderRejectedLessons: byLesson(failCorrect).length,
  alternativeRejected: failAlternative.length,
  alternativeRejectedLessons: byLesson(failAlternative).length,
  failCorrect: failCorrect.slice(0, 50),
  failAlternative: failAlternative.slice(0, 50),
};
fs.writeFileSync(path.join(OUT, "dictation-offline.json"), JSON.stringify(out, null, 1));

console.log(`딕테이션 문장 ${sentences}개 (대체 표현이 있는 문장 ${withAlternatives}개)`);
console.log(`정답 순서인데 오답 처리: ${failCorrect.length}건 (강의 ${byLesson(failCorrect).length}개)`);
for (const f of failCorrect.slice(0, 5)) console.log(`   ${f.lesson} #${f.n} — ${f.why}: "${String(f.en).slice(0, 70)}"`);
console.log(`타일은 주는데 정답으로 인정하지 않는 대체 표현: ${failAlternative.length}건 (강의 ${byLesson(failAlternative).length}개)`);
for (const f of failAlternative.slice(0, 5)) console.log(`   ${f.lesson} #${f.n} — 인정 안 됨 "${f.accepted.slice(0, 60)}" · 유일한 정답 "${f.onlyAccepted.slice(0, 60)}"`);
console.log(`\n→ ${path.join(OUT, "dictation-offline.json")}`);
