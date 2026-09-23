#!/usr/bin/env node
/**
 * LISTENING 본 페이지(dNNN.json)에 남은 'sentences' 블록 — 옛 페이지의 넘친 힌트 줄이 문장 블록으로 들어온 것 — 을 찾고,
 * --apply <lesson> 이면 그 강의의 블록을 글자 그대로 들어낸다(다시 읽어 그 블록만 빠진 모양인지 확인).
 * LISTENING 화면은 대본(ld_english_scripts.json)과 첫 hints 블록만 쓴다 — 이 블록은 어디에도 그려지지 않는 죽은 자료.
 * (6단계 6-0170: d122 의 n="0" "6 percent. North America's population 0.9% 2% immigration." — 지금 대본에 없는 수)
 *
 *   node ld-remove-stray-sentences.cjs              목록
 *   node ld-remove-stray-sentences.cjs --apply d122
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const ai = process.argv.indexOf("--apply");
const target = ai > 0 ? process.argv[ai + 1] : null;
const esc = (s) => JSON.stringify(s).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let found = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^d\d{3}\.json$/.test(f)).sort()) {
  const raw = fs.readFileSync(path.join(DIR, f), "utf8");
  const L = JSON.parse(raw.replace(/^﻿/, ""));
  const i = (L.blocks || []).findIndex((b) => b.type === "sentences");
  if (i < 0) continue;
  found++;
  const b = L.blocks[i];
  console.log(`${f}: blocks[${i}] sentences ${JSON.stringify(b.items)}`);
  if (target !== f.slice(0, -5)) continue;
  if (b.items.length !== 1) throw new Error(`${f}: 항목이 1개가 아님 — 손으로 보라`);
  const it = b.items[0];
  const re = new RegExp(`,\\s*\\{\\s*"type":\\s*"sentences",\\s*"items":\\s*\\[\\s*\\{\\s*"n":\\s*"${esc(String(it.n))}",\\s*"text":\\s*"${esc(it.text)}"\\s*\\}\\s*\\]\\s*\\}`);
  if (!re.test(raw)) throw new Error(`${f}: 블록을 글자에서 못 찾음`);
  const next = raw.replace(re, "");
  const want = JSON.parse(JSON.stringify(L));
  want.blocks.splice(i, 1);
  if (JSON.stringify(JSON.parse(next.replace(/^﻿/, ""))) !== JSON.stringify(want)) throw new Error(`${f}: 고친 뒤 모양이 기대와 다름 — 쓰지 않음`);
  fs.writeFileSync(path.join(DIR, f), next);
  console.log(`  → 들어냄`);
}
console.log(`sentences 블록이 있는 LISTENING 본 페이지: ${found}`);
