#!/usr/bin/env node
/**
 * VOCA 한→영 퀴즈가 문제에 답을 보여 주는 항목 — 사전 뜻풀이 안에 표제어(영어)가 낱말로 든 것 (6단계 기준 12).
 * 문제 글은 뜻을 괄호째 그대로 쓴다: src/lib/vocaUtils.ts `[ ${correctMeaning} ] 에 해당하는 올바른 영단어를 고르세요.`
 * 표제어 뒤에 -s/-es/-ed/-d/-ing/-ly 가 붙은 꼴도 센다.
 * 소리 표시도 센다 — 대괄호([테어]) · 빗금 발음(/tɪr/). 한글로 옮긴 소리도 답을 알려 준다(배치 18 에서 tear · bow 에
 * 넣었다가 되돌림). 둘 중 하나라도 0 이 아니면 exit 1.
 *
 *   node check-voca-answer-leak.cjs                지금 파일
 *   node check-voca-answer-leak.cjs --rev f35e8be     일부러 깨기: 고치기 전 판(accordance · few 가 걸려야 함 — '--rev HEAD' 는 고친 것이 커밋된 뒤 가짜, 7-1 n)
 *   node check-voca-answer-leak.cjs --file <json>  사전 사본으로
 *   node check-voca-answer-leak.cjs --break        일부러 깨기: 메모리에서 tear 에 '[테어]' · bow 에 '/baʊ/' 를 넣음(소리 표시 2 여야 함)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ri = process.argv.indexOf("--rev");
const REV = ri > 0 ? process.argv[ri + 1] : null;
const fi = process.argv.indexOf("--file");
const FILE = fi > 0 ? path.resolve(process.argv[fi + 1]) : null;
const raw = REV
  ? execFileSync("git", ["show", `${REV}:content/voca_dictionary.json`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(FILE || path.join(REPO, "content/voca_dictionary.json"), "utf8");
const D = JSON.parse(raw.replace(/^﻿/, ""));
const BREAK = process.argv.includes("--break");
if (BREAK) {
  D.tear = { ...D.tear, meaning: "찢다 [테어]; 눈물 [티어]" };
  D.bow = { ...D.bow, meaning: "절하다 /baʊ/; 활 /boʊ/" };
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hits = [];
const sound = [];
for (const [w, v] of Object.entries(D)) {
  const m = String((v && v.meaning) || "");
  if (/\[[^\]]*\]|\/[A-Za-zɪʊəɛæɔʌɑθðʃʒŋˈˌː]+\//.test(m)) sound.push(`${w} = ${m}`);
  if (!/[A-Za-z]/.test(m)) continue;
  if (new RegExp(`(?<![A-Za-z])${esc(w)}(?:s|es|ed|d|ing|ly)?(?![A-Za-z])`, "i").test(m)) hits.push(`${w} = ${m}`);
}
const src = (REV ? `[${REV} 기준] ` : FILE ? `[${path.basename(FILE)} 기준] ` : "") + (BREAK ? "[일부러 깨기] " : "");
console.log(`${src}VOCA 사전 ${Object.keys(D).length}항목 중 뜻풀이에 표제어가 든 항목 ${hits.length}${hits.length ? "\n  " + hits.join("\n  ") : ""}`);
console.log(`${src}소리 표시(대괄호 · 빗금 발음)가 든 항목 ${sound.length}${sound.length ? "\n  " + sound.join("\n  ") : ""}`);
process.exit(hits.length || sound.length ? 1 : 0);
