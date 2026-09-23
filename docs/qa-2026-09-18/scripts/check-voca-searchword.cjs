#!/usr/bin/env node
/**
 * VOCA 괄호 표제어(colo(u)r · gray(grey) …)의 searchWord 가 앱이 말하는 꼴(src/lib/vocaSpeech.ts VOCA_SPEECH_FORMS)과 같은지 — 6단계 6-0633.
 * searchWord 는 소리에는 안 쓰이지만(앱은 VOCA_SPEECH_FORMS 의 꼴을 요청) 어울림(collocation) 카드 열쇠로 쓰인다
 * (PhonicsLearningView.tsx 425–433 → vocaUtils.getCollocation(word, searchWord)). 다르면 exit 1.
 *
 *   node check-voca-searchword.cjs              지금 사전
 *   node check-voca-searchword.cjs --rev f35e8be   일부러 깨기: 6단계 전 판 → 11/13 이 달라야 함
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ri = process.argv.indexOf("--rev");
const REV = ri > 0 ? process.argv[ri + 1] : null;
const raw = REV
  ? execFileSync("git", ["show", `${REV}:content/voca_dictionary.json`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8");
const D = JSON.parse(raw.replace(/^﻿/, ""));
const sp = fs.readFileSync(path.join(REPO, "src/lib/vocaSpeech.ts"), "utf8");
const block = sp.slice(sp.indexOf("VOCA_SPEECH_FORMS"), sp.indexOf("};", sp.indexOf("VOCA_SPEECH_FORMS")));
const forms = [...block.matchAll(/"([^"]+)": "([^"]+)"/g)].map((x) => [x[1], x[2]]);
const bad = forms.filter(([k, v]) => D[k] && D[k].searchWord !== v);
console.log(`${REV ? `[${REV} 기준] ` : ""}괄호 표제어 ${forms.length} · searchWord 가 말하는 꼴과 다른 것 ${bad.length}/${forms.length}`);
for (const [k, v] of bad) console.log(`  ${k}: searchWord ${JSON.stringify(D[k].searchWord)} · 말하는 꼴 ${JSON.stringify(v)}`);
process.exit(bad.length ? 1 : 0);
