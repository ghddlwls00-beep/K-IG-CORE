#!/usr/bin/env node
/**
 * 6단계 — "dNNN-1 대본 페이지의 한국어 사본" 을 가리키는 LISTENING 지적의 증거를 항목마다 모은다.
 * 사본은 8114912(2026-09-22, 0단계 "LD 죽은 instruction 사본 제거 (dNNN-1.json 276강분)")에서 지워졌고,
 * 화면은 그 사본을 그리지 않았다(LdLearningView 는 ld_english_scripts.json 을 그림). 그래서 항목마다 다음을 잰다:
 *   (1) 그 회차 -1 파일에 남은 한국어 글 블록 수 (제목·보기·받아쓰기 칸 제외) — 0 이어야
 *   (2) 지적한 원문 문장이 화면용 데이터(ld_english_scripts.json 영어·한국어)의 그 회차에 있나 — 없어야
 *   (3) 지적이 말한 틀린 낱말(패턴 파일)이 화면용 데이터(대본 파일 그 회차 + content/lessons/ld/그 회차*.json)에 몇 곳 — 0 이어야
 * 판정은 사람이 한다: --ids 로 준 번호(사람이 읽고 고른 것)만 증거를 쓰고, 셋 중 하나라도 어긋나면 exit 1.
 *
 *   node stage6-neg1-copies.cjs --ids <번호 파일(JSON 배열)> --pats <패턴 파일…> --out <증거 JSON>
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const strip = (s) => String(s).replace(/^﻿/, "");
const L = new Map(JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-목록.json"), "utf8")).items.map((x) => [x.id, x]));
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
const ids = JSON.parse(fs.readFileSync(arg("--ids"), "utf8"));
const pats = (arg("--pats") || "").split(",").filter(Boolean).flatMap((f) => fs.readFileSync(f, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
const squash = (s) => String(s).replace(/[\s.,!?'"“”‘’()·…\-–—:;]/g, "");
const LD = path.join(REPO, "content/lessons/ld");
const lessonJson = (f) => JSON.parse(strip(fs.readFileSync(path.join(LD, f), "utf8")));
const neg1KoBlocks = (id) => {
  const f = `${id}-1.json`;
  if (!fs.existsSync(path.join(LD, f))) return null;
  return (lessonJson(f).blocks || []).filter((b) => !["heading", "choice", "dictation"].includes(b.type) && /[가-힣]/.test(JSON.stringify(b))).length;
};
const shown = (id) => { // 화면용 글: 대본 파일 그 회차 + 그 회차 강의 파일(받아쓰기 칸 제외)
  const rows = S[id] || [];
  const files = fs.readdirSync(LD).filter((f) => f === `${id}.json` || f === `${id}-1.json`);
  const lessonText = files.map((f) => { const d = lessonJson(f); return JSON.stringify((d.blocks || []).filter((b) => b.type !== "dictation")) + JSON.stringify({ title: d.title, label: d.label, menuLabel: d.menuLabel }); }).join("\n");
  return { script: rows.map((r) => `${r.en}\n${r.ko}`).join("\n"), lesson: lessonText };
};
const out = [];
let bad = 0;
for (const id of ids) {
  const x = L.get(id);
  const lessons = [...new Set([...`${x.file} ${x.locator} ${x.lesson} ${x.original}`.matchAll(/\bd(\d{3})(?=-1\b|\b)/g)].map((m) => `d${m[1]}`))];
  const left = lessons.map((l) => [l, neg1KoBlocks(l)]);
  const pieces = String(x.original).split(/\s*[|…/]\s*|블록\d+:|"\s+"|  +/).map((p) => p.replace(/^["“'\s]+|["”'\s]+$/g, "")).filter((p) => squash(p).length >= 8);
  const shownAll = lessons.map(shown);
  const origHits = pieces.filter((p) => shownAll.some((t) => squash(t.script).includes(squash(p))));
  const text = `${x.original} ${x.problem}`;
  const toks = pats.filter((p) => new RegExp(p, "u").test(text));
  const tokHits = toks.map((p) => [p, shownAll.reduce((n, t) => n + (t.script.match(new RegExp(p, "gu")) || []).length + (t.lesson.match(new RegExp(p, "gu")) || []).length, 0)]);
  const ok = left.every(([, n]) => n === 0) && !origHits.length && tokHits.every(([, n]) => n === 0);
  if (!ok) bad++;
  out.push({ id, lessons, neg1KoBlocksNow: left, originalSentencesInShownData: origHits.length, wrongTokensChecked: tokHits, ok });
}
fs.writeFileSync(arg("--out"), JSON.stringify({ made: new Date().toISOString(), commit: "8114912", count: out.length, bad, items: out }, null, 1) + "\n");
console.log(`항목 ${out.length} · 셋 다 통과 ${out.length - bad} · 어긋남 ${bad} · 틀린 낱말을 잰 항목 ${out.filter((o) => o.wrongTokensChecked.length).length} (낱말 ${out.reduce((n, o) => n + o.wrongTokensChecked.length, 0)}개)`);
for (const o of out.filter((o) => !o.ok)) console.log(`  어긋남 ${o.id} ${JSON.stringify(o)}`);
process.exit(bad ? 1 : 0);
