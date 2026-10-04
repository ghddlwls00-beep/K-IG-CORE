#!/usr/bin/env node
/**
 * 회귀 점검 1002 · 단계 0 (already-fixed) — 화면대로 한글로 베낀 답이 정답인가, 앱의 채점 함수 그대로(브라우저 없이) 전부.
 * 커밋 11a46e38 의 '한글로 베낀 답 487 모두 정답' 은 저장소에 남은 도구가 없어(커밋 메시지에만) 같은 것을 다시 세는 도구.
 *
 *   GRAMMAR II 종합 평가: E.expected 의 모범 · 다른 정답 가운데 koreanOnScreen 이 바꾸는 것(한글 꼴)을
 *     romanForGrading 에 넣어 grammarGrading.gradeAgainstReferences(그 문항의 모범 + 다른 정답) → 'exact' 이어야 함.
 *   PASS-OFF 영작(④ · ⑤ produce): 강의 파일(+ content/private 의 유료 보충)의 문항마다 referencesOf(item) 의 한글 꼴 →
 *     romanForGrading → passoffGrading.gradeProduce → isCorrect. 짧은 답(③ short — item.answer[]): 한글 꼴 → gradeShort 'correct'.
 *   (GRAMMAR I 은 한국어 낱말 문항 0 — koreanGloss.ts 표에 없음.)
 *
 *   node docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs                  # 모두 정답이면 exit 0
 *   node docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs --break=no-roman  # romanForGrading 없이(11a46e38 전) → 정답 0 · exit 1
 * 화면(브라우저)에서의 같은 확인은 check-grammar-exam.cjs --hangul (GRAMMAR II). 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../../..");
const E = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const K = loadTs(path.join(REPO, "src/lib/koreanGloss.ts"));
const GG = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const PG = loadTs(path.join(REPO, "src/lib/passoffGrading.ts"));
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "no-roman") throw new Error(`모르는 --break=${BREAK}`);
const asWritten = (key, t) => (BREAK === "no-roman" ? t : K.romanForGrading(key, t));
const stat = { g2: { forms: 0, ok: 0, bad: [] }, produce: { forms: 0, ok: 0, bad: [] }, short: { forms: 0, ok: 0, bad: [] } };
let g2Questions = 0;

for (const p of E.pages("grammar2")) {
  const key = `grammar2/${p.id}`;
  if (!K.KOREAN_GLOSS_PAGES[key]) continue;
  for (const a of E.expected("grammar2", p.id).answers) {
    const refs = [a.text, ...(a.alternatives || [])];
    let hit = false;
    for (const t of refs) {
      const h = K.koreanOnScreen(key, t);
      if (h === t) continue;
      hit = true;
      stat.g2.forms++;
      const g = GG.gradeAgainstReferences(asWritten(key, h), refs);
      if (g === "exact") stat.g2.ok++;
      else stat.g2.bad.push(`${key} Q${a.n} "${h}" → ${g}`);
    }
    if (hit) g2Questions++;
  }
}

function walk(v, out) {
  if (Array.isArray(v)) v.forEach((x) => walk(x, out));
  else if (v && typeof v === "object") {
    if (typeof v.en === "string" && Array.isArray(v.targets)) out.push({ kind: "produce", item: v });
    else if (Array.isArray(v.answer) && v.answer.every((x) => typeof x === "string")) out.push({ kind: "short", item: v });
    for (const x of Object.values(v)) walk(x, out);
  }
  return out;
}
let shortItems = 0;
for (const key of Object.keys(K.KOREAN_GLOSS_PAGES).filter((k) => k.startsWith("passoff-grammar/"))) {
  const id = key.split("/")[1];
  const files = [path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), path.join(REPO, "content/private/passoff-grammar", `${id}.paid.json`)].filter((f) => fs.existsSync(f));
  for (const f of files) {
    for (const { kind, item } of walk(JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")), [])) {
      if (kind === "short") shortItems++;
      const refs = kind === "produce" ? PG.referencesOf(item) : item.answer;
      for (const t of refs) {
        const h = K.koreanOnScreen(key, t);
        if (h === t) continue;
        stat[kind].forms++;
        if (kind === "produce") {
          const r = PG.gradeProduce(asWritten(key, h), item);
          if (PG.isCorrect(r)) stat.produce.ok++;
          else stat.produce.bad.push(`${key} ${item.id} "${h}" → ${r.verdict}`);
        } else {
          const v = PG.gradeShort(item, asWritten(key, h));
          if (v === "correct") stat.short.ok++;
          else stat.short.bad.push(`${key} ${item.id} "${h}" → ${v}`);
        }
      }
    }
  }
}
const total = stat.g2.forms + stat.produce.forms + stat.short.forms;
const ok = stat.g2.ok + stat.produce.ok + stat.short.ok;
console.log(`${BREAK ? `(깨기 --break=${BREAK} — romanForGrading 없이) ` : ""}한글 꼴 ${total} · 정답 ${ok} — GRAMMAR II 시험 ${stat.g2.ok}/${stat.g2.forms}(문항 ${g2Questions}) · PASS-OFF 영작 ${stat.produce.ok}/${stat.produce.forms} · 짧은 답 ${stat.short.ok}/${stat.short.forms}(한글 꼴이 있는 짧은 답 문항 없음 — 이 강의들의 짧은 답 ${shortItems})`);
for (const k of Object.keys(stat)) for (const b of stat[k].bad.slice(0, 5)) console.log("  " + b);
const pass = total > 0 && ok === total;
console.log(pass ? "PASS" : `FAIL ${total - ok}`);
process.exitCode = pass ? 0 : 1;
