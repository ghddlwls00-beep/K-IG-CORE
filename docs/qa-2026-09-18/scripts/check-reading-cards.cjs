#!/usr/bin/env node
/**
 * READING 어휘 카드 — 강의마다(본 파일 · -1 파일) 카드 낱말이 그 강의 지문(readingSentences 영어)에 온전한 토큰으로 있는지,
 * 두 파일 카드가 같은지, 14장인지. 규칙은 9/17 의 docs/qa-2026-09-17/scripts/lib-reading-cards.cjs 와 같다(tokensOf).
 * 문장을 고쳐 카드 낱말이 지문에서 빠지는 일을 잡는다. 하나라도 어긋나면 exit 1.
 *
 *   node check-reading-cards.cjs            전부
 *   node check-reading-cards.cjs --break    일부러 깨기: pr004 첫 카드 낱말을 지문에 없는 낱말로 바꿔 잰다(파일은 안 바꿈)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const { tokensOf } = require(path.join(REPO, "docs/qa-2026-09-17/scripts/lib-reading-cards.cjs"));
const dir = path.join(REPO, "content/lessons/reading");
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, ""));
const BREAK = process.argv.includes("--break");
const ids = fs.readdirSync(dir).filter((f) => /^pr\d+\.json$/.test(f)).map((f) => f.slice(0, -5));
const problems = [];
let cards = 0;
for (const id of ids) {
  const main = load(`${id}.json`);
  const script = fs.existsSync(path.join(dir, `${id}-1.json`)) ? load(`${id}-1.json`) : null;
  const vocab = (main.readingVocabulary || []).map((c) => ({ ...c }));
  if (BREAK && id === "pr004" && vocab[0]) vocab[0].word = "zzzqqq";
  const tokens = tokensOf((main.readingSentences || []).map((s) => s.english).join(" "));
  if (vocab.length !== 14) problems.push(`${id}: 카드 ${vocab.length}장`);
  for (const c of vocab) { cards++; if (!tokens.includes(String(c.word).toLowerCase())) problems.push(`${id}: 카드 "${c.word}" 가 지문에 없음`); }
  if (script && JSON.stringify(script.readingVocabulary) !== JSON.stringify(main.readingVocabulary)) problems.push(`${id}: -1 파일 카드가 본 파일과 다름`);
}
console.log(`강의 ${ids.length} · 카드 ${cards} · 어긋남 ${problems.length}`);
for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
process.exit(problems.length ? 1 : 0);
