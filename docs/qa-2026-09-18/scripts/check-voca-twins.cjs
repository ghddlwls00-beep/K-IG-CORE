#!/usr/bin/env node
/**
 * VOCA 사전의 "쌍둥이" 항목 — 괄호 표제어(dialog(ue) · neighbo(u)r …)와, 그 괄호 표제어를 앱이 말하는 꼴(vocaSpeech.ts
 * VOCA_SPEECH_FORMS)의 따로 선 항목(dialogue · neighbor …)은 같은 낱말이므로 뜻풀이가 같아야 한다 (6단계 6-0658).
 * 강의마다 표제어를 달리 적어(mv3-14 'dialog(ue)' · hv-06 'dialogue') 항목이 둘이 된 것 — 한쪽만 고치면 어긋난다.
 * 다르면 exit 1.
 *
 *   node check-voca-twins.cjs            지금 사전
 *   node check-voca-twins.cjs --break    일부러 깨기: 메모리에서 첫 쌍의 한쪽 뜻을 바꿔 돌림 → 1 이 나와야 함
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const D = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const sp = fs.readFileSync(path.join(REPO, "src/lib/vocaSpeech.ts"), "utf8");
const block = sp.slice(sp.indexOf("VOCA_SPEECH_FORMS"), sp.indexOf("};", sp.indexOf("VOCA_SPEECH_FORMS")));
const forms = [...block.matchAll(/"([^"]+)": "([^"]+)"/g)].map((x) => [x[1], x[2]]);
const pairs = forms.filter(([k, v]) => D[k] && D[v]);
if (process.argv.includes("--break") && pairs.length) D[pairs[0][1]] = { ...D[pairs[0][1]], meaning: D[pairs[0][1]].meaning + " (깨기)" };
const bad = pairs.filter(([k, v]) => D[k].meaning !== D[v].meaning);
console.log(`괄호 표제어 ${forms.length} · 따로 선 쌍둥이 항목이 있는 것 ${pairs.length} (${pairs.map(([k, v]) => `${k}/${v}`).join(" · ")}) · 뜻이 다른 쌍 ${bad.length}`);
for (const [k, v] of bad) console.log(`  ${k} = ${D[k].meaning}  ≠  ${v} = ${D[v].meaning}`);
process.exit(bad.length ? 1 : 0);
