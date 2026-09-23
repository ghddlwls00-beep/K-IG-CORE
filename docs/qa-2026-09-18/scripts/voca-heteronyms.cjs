#!/usr/bin/env node
/**
 * VOCA 끝에 할 일 ③ — 뜻(품사)에 따라 발음이 다른 낱말. 카드는 표제어 하나를 한 클립으로 읽으므로(vocaSpeech.ts),
 * 뜻풀이에 두 쪽 뜻이 다 있으면 한쪽은 늘 다른 소리와 짝지어진다(6-0854 tear · 6-0859 bow · 6-0864 present).
 * 아래 목록은 영어 사전의 잘 알려진 동형이음어·강세 이동 짝(사람이 적은 것 — 빠진 낱말이 있을 수 있음)이고,
 * 도구는 그중 VOCA 강의에 나오는 낱말과 지금 뜻풀이, 발음 표시가 붙었는지를 보인다. 판단은 사람이 한다.
 *
 *   node voca-heteronyms.cjs
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const D = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const dir = path.join(REPO, "content/lessons/phonics");
const inLessons = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (L.blocks || []).find((b) => b.type === "wordgrid");
  for (const w of g ? g.rows.flat().filter(Boolean) : []) {
    const k = w.toLowerCase().trim();
    if (!inLessons.has(k)) inLessons.set(k, []);
    inLessons.get(k).push(f.slice(0, -5));
  }
}
// 종류: 소리(뜻마다 다른 소리) · 강세(명사·형용사 앞 / 동사 뒤) · 유성(명사·형용사 /s/ / 동사 /z/) · 어미(-ate 형용사·명사 /ət/ / 동사 /eɪt/)
const LIST = {
  소리: ["tear", "bow", "sow", "row", "lead", "wind", "live", "wound", "minute", "bass", "dove", "does", "polish", "number", "entrance", "sewer", "resume", "close", "used"],
  강세: ["present", "record", "object", "project", "progress", "produce", "increase", "decrease", "export", "import", "protest", "rebel", "subject", "suspect", "conflict", "contrast", "permit", "refuse", "conduct", "contract", "insult", "survey", "extract", "desert", "content", "perfect", "invalid", "compact", "digest", "frequent", "console", "convict", "transport", "transfer", "upset", "address", "combat", "concert", "conscript", "consort", "contest", "converse", "convert", "defect", "discount", "escort", "exploit", "ferment", "impact", "incline", "insert", "intern", "object", "offset", "outlaw", "overflow", "present", "reject", "segment", "torment", "update", "upgrade"],
  유성: ["use", "excuse", "abuse", "house", "close", "advice", "belief", "grief", "proof", "mouth", "bath", "breath", "cloth"],
  어미: ["separate", "estimate", "duplicate", "graduate", "moderate", "associate", "alternate", "appropriate", "approximate", "delegate", "advocate", "articulate", "deliberate", "elaborate", "intimate", "degenerate", "certificate", "predicate", "subordinate", "coordinate", "aggregate", "affiliate", "animate", "desolate", "legitimate", "precipitate"],
};
const MARK = /뜻에 따라 발음이 다름|동사는 뒤 강세|발음/;
let n = 0;
for (const [kind, words] of Object.entries(LIST)) {
  const seen = new Set();
  const rows = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    if (!inLessons.has(w) || !D[w]) continue;
    rows.push(`  ${MARK.test(D[w].meaning) ? "[표시 있음]" : "[표시 없음]"} ${w} = ${D[w].meaning}  (${inLessons.get(w).join(" ")})`);
  }
  n += rows.length;
  console.log(`${kind} — 강의에 있는 것 ${rows.length}`);
  for (const r of rows) console.log(r);
}
console.log(`\n합 ${n} (목록 ${Object.values(LIST).flat().length} 중 강의에 있는 것)`);
