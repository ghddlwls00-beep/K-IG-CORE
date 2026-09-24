#!/usr/bin/env node
/**
 * VOCA 끝 할 일 ④ (3차 점검 #8) — 발음 표시 '(뜻에 따라 발음이 다름)' · '(동사는 뒤 강세)' 가 퀴즈·스피드 화면에 뜨는지.
 * 표시는 카드 공부 화면용이다. 퀴즈에서는 답을 짚는다: 사전 3,904 중 30항목에만 있어 표시 붙은 보기가 거의 늘 정답.
 * src/lib/vocaUtils.ts quizMeaning 이 퀴즈·스피드 글에서 표시를 뗀다. 이 검사는 생성기를 195강 전부에 돌려
 * 화면에 뜨는 글(한→영 문제 글 · 영→한 보기 · 스피드 뜻)에 표시가 든 문항을 센다. 0 이 아니면 exit 1.
 *
 *   node check-voca-quiz-notes.cjs [--runs 5] [--seed 1]
 *   node check-voca-quiz-notes.cjs --old     일부러 깨기: 떼기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞) 생성기에 지금 사전 — 0 이 아니어야 함
 *                                           (전에는 git HEAD — 뗀 생성기가 커밋된 뒤로는 HEAD 가 뗀 판이라 0 · 0 이었다, 7-1 n)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const argv = process.argv.slice(2);
const RUNS = Number(argv.includes("--runs") ? argv[argv.indexOf("--runs") + 1] : 5);
const SEED = Number(argv.includes("--seed") ? argv[argv.indexOf("--seed") + 1] : 1);
const OLD = argv.includes("--old");

let state = SEED >>> 0;
Math.random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const src = OLD
  ? execSync("git show f35e8be:src/lib/vocaUtils.ts", { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
  : fs.readFileSync(path.join(REPO, "src/lib/vocaUtils.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)(require, mod, mod.exports);
const V = mod.exports;

const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const dictMap = {};
for (const [k, v] of Object.entries(dict)) dictMap[k] = { meaning: v.meaning };
// 검사 쪽 판정은 생성기와 따로: 표시 글자 자체를 찾는다
const NOTE = /뜻에 따라 발음이 다름|동사는 뒤 강세/;
const withNote = Object.values(dict).filter((v) => NOTE.test(v.meaning || "")).length;

const dir = path.join(REPO, "content/lessons/phonics");
const lessons = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (j.blocks || []).find((b) => b.type === "wordgrid");
  return { id: f.replace(/\.json$/, ""), words: g ? g.rows.flat().map((w) => String(w).trim()).filter(Boolean) : [] };
});

let q = 0, qBad = 0, s = 0, sBad = 0;
const ex = [];
for (let r = 0; r < RUNS; r++) {
  for (const L of lessons) {
    for (const it of V.generateActiveRecallQuizzes(L.words, dictMap)) {
      q++;
      const shown = [it.questionPrompt, ...(it.questionType === "en-to-ko" ? it.options : [])];
      if (shown.some((t) => NOTE.test(t))) { qBad++; if (ex.length < 4) ex.push(`${L.id} ${it.questionType} "${it.word}": ${shown.find((t) => NOTE.test(t))}`); }
    }
    for (const it of V.generateSpeedDrillItems(L.words, dictMap)) {
      s++;
      if (NOTE.test(it.displayedMeaning)) { sBad++; if (ex.length < 4) ex.push(`${L.id} 스피드 "${it.word}": ${it.displayedMeaning}`); }
    }
  }
}
console.log(`${OLD ? "[떼기 전 생성기(f35e8be)] " : ""}사전에 발음 표시 든 항목 ${withNote} · 퀴즈 문항 ${q} 중 표시가 뜬 것 ${qBad} · 스피드 ${s} 중 ${sBad}`);
for (const e of ex) console.log(`  예: ${e}`);
// --old 도 찾으면 exit 1 — 일부러 깨기가 정말 깨졌는지 종료 코드로도 보이게(3차 점검 #8 확인)
process.exit(qBad + sBad ? 1 : 0);
