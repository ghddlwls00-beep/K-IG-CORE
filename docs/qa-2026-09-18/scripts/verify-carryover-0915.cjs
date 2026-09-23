#!/usr/bin/env node
/**
 * 9/15 이월 대조의 숫자를 **원 자료에서 곧바로** 다시 센다 — carryover-0915.cjs 의 증거·판정 파일을 쓰지 않는다.
 * 기대값과 하나라도 다르면 exit 1.
 *
 *   node docs/qa-2026-09-18/scripts/verify-carryover-0915.cjs              지금 파일 (기대: 전부 통과)
 *   node docs/qa-2026-09-18/scripts/verify-carryover-0915.cjs --rev 3705523   9/15 상태 (기대: 실패 — 이 검사가 실패를 잡는다는 증거)
 *
 * 읽는 것: docs/qa-2026-09-15/evidence/textbook-defects.json 의 행(코드·강의·낱말·번호만), content/ 의 파일.
 * VOCA 뜻은 앱과 같은 순서로 찾는다 — 쓴 그대로 먼저, 없으면 소문자 (src/lib/content.ts getVocaDictionaryForWords).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ri = process.argv.indexOf("--rev");
const REV = ri > 0 ? process.argv[ri + 1] : null;
const strip = (s) => String(s).replace(/^﻿/, "");
const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });
const read = (f) => { try { return JSON.parse(strip(REV ? git(["show", `${REV}:${f}`]) : fs.readFileSync(path.join(REPO, f), "utf8"))); } catch { return null; } };
const ls = (dir) => REV ? git(["ls-tree", "--name-only", REV, `${dir}/`]).split("\n").filter(Boolean).map((p) => p.split("/").pop()) : fs.readdirSync(path.join(REPO, dir));

const rows = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-15/evidence/textbook-defects.json"), "utf8")).rows;
const END = /[.?!]["'”’)]*\s*$/;
const cut = (s) => String(s || "").trim() && !END.test(String(s).trim());
const results = [];
const check = (name, got, want) => results.push({ name, got, want, ok: got === want });

// 1·2. LISTENING 영어 끝 부호 없음 — 전체 276강, 9/15 목록 116강
const S = read("content/ld_english_scripts.json") || {};
const allRows = Object.values(S).flat();
check("LISTENING 영어 끝 부호 없는 행 (276강 전체)", allRows.filter((r) => cut(r.en)).length, 0);
const tLessons = [...new Set(rows.filter((r) => r.code === "SENTENCE_TRUNCATED").map((r) => r.lesson))];
check("SENTENCE_TRUNCATED 116강의 영어 끝 부호 없는 행", tLessons.flatMap((id) => S[id] || []).filter((r) => cut(r.en)).length, 0);
check("LISTENING 한국어 끝 부호 없는 행 (정보: 6E 7 + 6단계 목록 3)", allRows.filter((r) => cut(r.ko)).length, 10);

// 3. GRAMMAR I 영어 답안 속 한글 — 78행
const G1 = "content/lessons/grammar1";
const g1files = ls(G1);
let hangul = 0;
for (const r of rows.filter((x) => x.code === "KOREAN_IN_ANSWER")) {
  for (const f of g1files.filter((f) => f === `${r.lesson}.json` || (f.startsWith(`${r.lesson}-`) && f.endsWith(".json")))) {
    for (const b of read(`${G1}/${f}`)?.blocks || []) if (b.type === "sentences") for (const it of b.items || []) {
      if (String(it.n) !== String(r.n)) continue;
      if (/[가-힣]/.test(String(it.text || ""))) hangul++;
      for (const a of it.alternatives || []) if (/[가-힣]/.test(a)) hangul++;
    }
  }
}
check("KOREAN_IN_ANSWER 78행의 문항에 남은 한글", hangul, 0);

// 4. VOCA 뜻 376행 — 9/15 뜻이 그대로인 행, 사전에서 빠진 낱말
const D = read("content/voca_dictionary.json") || {};
const look = (w) => { const k = String(w).trim(); const e = D[k] ?? D[k.toLowerCase()]; return e ? e.meaning : undefined; };
const M = rows.filter((r) => /^MEANING_/.test(r.code));
check("VOCA 뜻 행 수", M.length, 376);
check("VOCA 뜻 376행 중 9/15 뜻이 그대로 (billion·sophomore·decade·월 이름 12)", M.filter((r) => look(r.word) === (r.shown ?? r.meaning)).length, 15);
check("VOCA 뜻 376행 중 사전에서 빠진 낱말 (calender·ancesto)", M.filter((r) => look(r.word) === undefined).length, 2);

// 5. 괄호 철자 표제어 14행 — 격자에 그대로 남은 것
const PH = "content/lessons/phonics";
const gridWords = new Set();
for (const f of ls(PH).filter((x) => x.endsWith(".json"))) {
  const g = (read(`${PH}/${f}`)?.blocks || []).find((b) => b.type === "wordgrid");
  for (const w of g ? g.rows.flat() : []) if (w) gridWords.add(String(w).trim());
}
check("WORD_MALFORMED 14행 중 격자에 그대로 (13 = 6단계 7 + 6E 6)", rows.filter((r) => r.code === "WORD_MALFORMED" && gridWords.has(String(r.word))).length, 13);

// 6. READING pr231-1 깨진 문자
check("pr231-1 의 U+FFFD", (JSON.stringify(read("content/lessons/reading/pr231-1.json") || {}).match(/�/g) || []).length, 0);

// 7. 이월 결과 파일 (지금 상태에서만)
if (!REV) {
  const carry = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-이월.json"), "utf8"));
  // 이월 대조에서 나온 것만 센다 — 6단계 작업 중 새로 찾은 것(source "6단계 중 발견", stage6-add-finding.cjs)은 뒤에 붙는다
  const fromCarry = carry.items.filter((x) => x.source === "9/15 이월" || x.source === "대조 중 발견");
  check("6단계-이월.json 의 6E 개수 (이월 대조분)", fromCarry.length, 17);
  const prog = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-진행.json"), "utf8")).items;
  check("6단계-진행.json 에 칸이 있는 6E (이월 대조분)", fromCarry.filter((x) => prog[x.id]).length, 17);
  check("6단계-진행.json 에 칸이 없는 6E (전체)", carry.items.filter((x) => !prog[x.id]).length, 0);
  check("6단계-진행.json 의 6단계 번호 칸", Object.keys(prog).filter((k) => /^6-\d{4}$/.test(k)).length, 1759);
}

for (const r of results) console.log(`${r.ok ? "통과" : "실패"}  ${r.name}: ${r.got} (기대 ${r.want})`);
const bad = results.filter((r) => !r.ok).length;
console.log(`${REV ? `@${REV} ` : ""}${results.length}개 중 ${results.length - bad}개 통과 · ${bad}개 실패`);
process.exit(bad ? 1 : 0);
