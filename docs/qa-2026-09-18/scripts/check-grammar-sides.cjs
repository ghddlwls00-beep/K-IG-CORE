#!/usr/bin/env node
/**
 * 9/15 NEXT-SESSION §A-4 — "GRAMMAR 의 한국어 문제가 영어 칸으로 올라간다" 가 지금도 일어나는가.
 *
 * GrammarLearningView.tsx:42-52 의 isEnglish · hasKorean 과 :183-199 의 칸 고르기를 그대로 옮겨,
 * 짝이 있는 GRAMMAR 페이지 전부(짝 찾기는 expectations.cjs 의 pairOf = getLessonContext)에서
 * 문항마다 어느 글이 영어 칸·한국어 칸으로 가는지 계산한다.
 *
 * 2026-09-23 첫 측정 (3차 점검): 비교 6,594 (양방향) · 단순 규칙(latin>=hangul)이 한국어 문제를
 * "영어" 라 부르는 것 42 · 그래도 화면에서 칸이 틀어지는 것 **0**. isEnglish 자체는 §A-4 가
 * 틀렸다고 한 그대로지만, 둘 다 "영어" 일 때 한글이 든 쪽을 한국어로 보내는 보정(191-194)이 받는다.
 *
 * 칸이 틀어지는 문항이 하나라도 있으면 exit 1.
 * 실패를 잡는지 확인하려면: --naive 로 보정 없이 isEnglish 만 쓰는 옛 규칙을 돌린다(대조군 — 0 이 아니어야 정상).
 */
const path = require("path");
const E = require(path.join(__dirname, "lib/expectations.cjs"));
const NAIVE = process.argv.includes("--naive");

const isEnglish = (t) => { if (!t) return false; const l = (t.match(/[a-zA-Z]/g) || []).length; const h = (t.match(/[가-힯ᄀ-ᇿ]/g) || []).length; return l >= h && l > 0; };
const hasKorean = (t) => !!t && /[가-힯ᄀ-ᇿ]/.test(t);

let pages = 0, items = 0, atRisk = 0;
const wrong = new Map();
for (const course of ["grammar1", "grammar2"]) {
  for (const p of E.pages(course)) {
    const pairId = E.pairOf(course, p.id);
    if (!pairId || !E.hasLesson(course, pairId)) continue;
    pages++;
    const mine = E.itemsOf(E.lesson(course, p.id));
    const theirs = E.itemsOf(E.lesson(course, pairId));
    for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
      const textM = mine[i]?.text ?? "", textP = theirs[i]?.text ?? "";
      items++;
      const koSide = [textM, textP].find((t) => hasKorean(t));
      if (koSide && isEnglish(koSide)) atRisk++;
      let en, ko;
      if (NAIVE) { if (isEnglish(textM)) { en = textM; ko = textP; } else { en = textP; ko = textM; } }
      else if (isEnglish(textM) && !isEnglish(textP)) { en = textM; ko = textP; }
      else if (!isEnglish(textM) && isEnglish(textP)) { en = textP; ko = textM; }
      else if (hasKorean(textM)) { ko = textM; en = textP; }
      else { en = textM; ko = textP; }
      if (hasKorean(en)) {
        const key = `${course}:${[p.id, pairId].sort().join("|")}#${i + 1}`;
        if (!wrong.has(key)) wrong.set(key, { course, page: p.id, pair: pairId, n: i + 1, en: en.slice(0, 70), ko: ko.slice(0, 70) });
      }
    }
  }
}
console.log(`규칙: ${NAIVE ? "대조군 — isEnglish 만 (보정 없음)" : "앱과 같음 (GrammarLearningView.tsx:183-199)"}`);
console.log(`짝이 있는 페이지 ${pages} · 비교한 문항(양방향) ${items}`);
console.log(`단순 규칙이 한국어 문제를 '영어' 라 부르는 것: ${atRisk} (양방향 중복 포함)`);
console.log(`영어 칸에 한글이 들어간 문항 (중복 제거): ${wrong.size}`);
for (const w of [...wrong.values()].slice(0, 10)) console.log(`  ${w.course} ${w.page}↔${w.pair} #${w.n}\n     영어칸: ${JSON.stringify(w.en)}\n     한국어칸: ${JSON.stringify(w.ko)}`);
process.exit(wrong.size ? 1 : 0);
