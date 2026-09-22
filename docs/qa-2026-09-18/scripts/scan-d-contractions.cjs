#!/usr/bin/env node
/**
 * BUG-010 조사·검증: GRAMMAR 모범 답안·대체 답안 중 `'d` 축약이 든 문장을 전부 찾아,
 * 학습자가 그것을 풀어 쓴 두 형태(would / had)를 앱의 실제 채점기(src/lib/grammarGrading.ts)로 채점한다.
 * 반대 방향(모범 답안이 풀어 쓴 would/had 인데 학습자가 'd 로 줄여 씀)도 함께 센다.
 *
 *   node scan-d-contractions.cjs            사람이 읽는 표
 *   node scan-d-contractions.cjs --json     기계용
 *
 * 문장은 앱이 쓰는 그대로 정리한다(expectations.cjs 의 cleanItemText — 앞 번호 떼기·빗금 합치기).
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));

const cleanItemText = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const D_RE = /\b([A-Za-z]+)['’]d\b/g;
const FULL_RE = /\b(I|you|he|she|it|we|they|there|that|who|what|where)\s+(would|had)\b/gi;

const rows = [];
for (const course of ["grammar1", "grammar2"]) {
  const dir = path.join(REPO, "content/lessons", course);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const b of d.blocks || []) {
      if (b.type !== "sentences") continue;
      for (const it of b.items || []) {
        if (!it || typeof it.text !== "string") continue;
        const refs = [cleanItemText(it.text), ...(it.alternatives || []).map(cleanItemText)];
        if (/[가-힣]/.test(refs[0])) continue; // 한국어 문항은 채점 기준이 아니다
        refs.forEach((ref, ri) => {
          // (가) 모범/대체 답안에 'd 가 있다 → 학습자가 풀어 쓴 두 형태
          for (const m of ref.matchAll(D_RE)) {
            const after = ref.slice(m.index + m[0].length).trim().split(/\s+/).slice(0, 3).join(" ");
            const asWould = ref.replace(m[0], `${m[1]} would`);
            const asHad = ref.replace(m[0], `${m[1]} had`);
            rows.push({
              dir: "ref-has-'d", file: `${course}/${f}`, n: it.n, ref: ri === 0 ? "모범" : `대체${ri}`, text: ref, token: m[0], after,
              would: grading.gradeAgainstReferences(asWould, refs), had: grading.gradeAgainstReferences(asHad, refs),
            });
          }
          // (나) 답안이 would/had 를 풀어 씀 → 학습자가 'd 로 줄인 형태
          for (const m of ref.matchAll(FULL_RE)) {
            const contracted = ref.replace(m[0], `${m[1]}'d`);
            rows.push({
              dir: "ref-has-full", file: `${course}/${f}`, n: it.n, ref: ri === 0 ? "모범" : `대체${ri}`, text: ref, token: m[0],
              after: ref.slice(m.index + m[0].length).trim().split(/\s+/).slice(0, 3).join(" "),
              contracted: grading.gradeAgainstReferences(contracted, refs),
            });
          }
        });
      }
    }
  }
}
if (process.argv.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
const a = rows.filter((r) => r.dir === "ref-has-'d");
const b = rows.filter((r) => r.dir === "ref-has-full");
console.log(`(가) 답안에 'd 가 있는 곳 ${a.length}`);
for (const r of a) console.log(`  ${r.file} #${r.n} ${r.ref} · ${r.token} + "${r.after}" · 풀어 쓰면 would → ${r.would} / had → ${r.had}\n      ${r.text}`);
const bad = b.filter((r) => r.contracted !== "exact");
console.log(`(나) 답안이 would/had 를 풀어 쓴 곳 ${b.length} · 학습자가 'd 로 줄이면 exact 아님 ${bad.length}`);
for (const r of bad) console.log(`  ${r.file} #${r.n} ${r.ref} · ${r.token} + "${r.after}" → ${r.contracted}\n      ${r.text}`);
