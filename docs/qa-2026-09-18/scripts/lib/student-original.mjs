/**
 * STUDENT 과 하나를 원본 swf 와 견줌 — check-student-original.mjs 와 예외 목록 초안 도구가 같이 씀.
 *
 * 기준 문장 = 원본의 '영어 전체 글'(원본 차례) — 그것이 문장 단추보다 적으면(s1-2 처럼 예시 두 줄만 든 과) 문장 단추의 영어(화면 차례).
 * 문장 단추의 영어가 '영어 전체 글' 과 조금 다르면(s14-3 'So I must go …') 그것도 같은 문장의 원본 판으로 셈.
 * '글자까지 같음' 은 대소문자 · 띄어쓰기 · 문장부호 · 곧은/굽은 따옴표를 무시하고 견줌(schoolteacher = school teacher).
 * 지금 문장마다: 글자까지 같은 기준 문장 → '같음', 낱말이 반 이상 겹치는 기준 문장 → '고침', 앞뒤 짝 사이에 하나씩 남은 것끼리 → '바꿈',
 * 짝 없는 지금 문장 → '더함', 짝 없는 기준 문장 → '빠짐', 짝들의 기준 자리가 거꾸로 가면 → '차례'.
 * 영어 ↔ 한국어 짝: 지금 문장 i 의 한국어 문단이 원본에서 그 영어와 한 단추에 묶인 한국어보다 다른 문장의 한국어를 뚜렷이 더 닮으면 → '짝'.
 * 한국어 글자(7단계 7-1 j — 전에는 어느 영어의 번역인지만 봄): 지금 문장 i 의 영어와 한 단추에 묶인 원본 한국어와 견줘, 띄어쓰기 ·
 * 문장부호를 뺀 글자가 다르면 → '한국어'(원본 한국어를 original 로). '짝' 으로 나온 줄은 '한국어' 로 또 세지 않는다.
 */
import { readStudentOriginal } from "./swf-stage.mjs";

export const key = (s) => String(s).replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9]/g, "");
/** 한국어 글자 — 띄어쓰기 · 문장부호 · 따옴표를 뺀 한글 · 숫자 · 영문자 */
export const koKey = (s) => String(s).toLowerCase().replace(/[^가-힣0-9a-z]/g, "");
const words = (s) => String(s).replace(/\([^)]*\)/g, " ").replace(/[’‘]/g, "'").toLowerCase().match(/[a-z0-9']+/g) || [];
export const sim = (a, b) => {
  const A = words(a), B = words(b); if (!A.length || !B.length) return 0;
  const bs = new Set(B), as = new Set(A);
  return Math.min(A.filter((w) => bs.has(w)).length / A.length, B.filter((w) => as.has(w)).length / B.length);
};
const bigrams = (s) => { const k = String(s).replace(/[^가-힣0-9]/g, ""); const o = new Set(); for (let i = 0; i < k.length - 1; i++) o.add(k.slice(i, i + 2)); return o; };
export const dice = (a, b) => { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return (2 * n) / (A.size + B.size); };

export const sentencesOf = (d) => (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []).map((x) => x.text);
export const koParasOf = (d) => (d.blocks || []).filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text);

/** 과 하나 → { ref: {from, list} | null, diffs: [{kind, text, original?, at?}], same, lines } */
export function compareLesson(archiveRoot, id, en, ko) {
  const o = readStudentOriginal(archiveRoot, id);
  if (!o) return { ref: null, diffs: [{ kind: "원본 없음", text: "", why0: "원본 swf 없음" }], same: 0, lines: [] };
  const unitEn = o.units.filter((u) => u.en).map((u) => u.en);
  const ref = o.passage && o.passage.length >= unitEn.length ? { from: "영어 전체 글", list: o.passage } : unitEn.length ? { from: "문장 단추", list: unitEn } : null;
  if (!ref) return { ref: null, diffs: [{ kind: "원본 없음", text: "", why0: "원본 swf 에서 영어 문장이 나오지 않음" }], same: 0, lines: o.lines };
  const P = ref.list;
  // 원본 안의 다른 판: '영어 전체 글' 과 문장 단추가 조금 다른 과가 있음(s14-3 'I must go' / 'So I must go' ·
  // s1-2 빈칸판 'My name is (name) …' / 예시판 'My name is Hong Gil Dong …') — 둘 다 원본
  const other = ref.from === "영어 전체 글" ? unitEn : o.passage || [];
  const alts = P.map((p) => [p, ...other.filter((u) => sim(u, p) >= 0.6)]);
  const closest = (s, k) => alts[k].reduce((a, b) => (sim(s, b) > sim(s, a) ? b : a));
  const used = new Set(); const match = en.map(() => -1); const kind = en.map(() => null);
  en.forEach((s, i) => { const j = P.findIndex((p, k) => !used.has(k) && alts[k].some((a) => key(a) === key(s))); if (j >= 0) { match[i] = j; used.add(j); kind[i] = "같음"; } });
  en.forEach((s, i) => {
    if (match[i] !== -1) return;
    let best = -1, bv = 0; P.forEach((p, k) => { if (used.has(k)) return; const v = Math.max(...alts[k].map((a) => sim(s, a))); if (v > bv) { bv = v; best = k; } });
    if (bv >= 0.5) { match[i] = best; used.add(best); kind[i] = "고침"; }
  });
  // 바꿈: 앞뒤 짝 사이에 남은 지금 문장과 기준 문장이 같은 수면 차례대로 짝지음(사실 고침으로 문장이 통째로 바뀐 것)
  for (let i = 0; i < en.length; i++) {
    if (match[i] !== -1) continue;
    let j = i; while (j < en.length && match[j] === -1) j++;
    const lo = i > 0 ? match[i - 1] : -1, hi = j < en.length ? match[j] : P.length;
    const free = []; for (let k = lo + 1; k < hi; k++) if (!used.has(k)) free.push(k);
    if (lo < hi && free.length === j - i) free.forEach((k, t) => { match[i + t] = k; used.add(k); kind[i + t] = "바꿈"; });
    i = j;
  }
  const diffs = []; let same = 0;
  en.forEach((s, i) => {
    if (kind[i] === "같음") { same++; return; }
    if (kind[i] === "고침" || kind[i] === "바꿈") diffs.push({ kind: kind[i], text: s, original: closest(s, match[i]), at: i + 1 });
    else diffs.push({ kind: "더함", text: s, at: i + 1 });
  });
  // 원본 문장 단추가 '영어 전체 글' 의 두 문장을 한 문항으로 묶은 과(s19-3 'Bulgogi … kimchi. I like them both.')는
  // 지금 문장 하나에 원본 두 문장이 다 들어 있음 — 빠진 것이 아님
  const covered = (p) => en.some((s) => key(s).includes(key(p)) && key(s) !== key(p));
  P.forEach((p, k) => { if (!used.has(k) && !covered(p)) diffs.push({ kind: "빠짐", text: p, at: k + 1 }); });
  const seq = match.filter((v) => v !== -1);
  if (seq.some((v, t) => t > 0 && v < seq[t - 1])) diffs.push({ kind: "차례", text: "", order: match.map((v) => (v === -1 ? "-" : v + 1)).join(",") });
  // 영어 ↔ 한국어 짝 · 한국어 글자
  const U = o.units.filter((u) => u.en);
  let koSame = 0, koTotal = 0;
  en.forEach((s, i) => {
    let own = null, ov = 0; for (const u of U) { const v = sim(s, u.en); if (v > ov) { ov = v; own = u; } }
    if (!own || ov < 0.5 || ko[i] == null) return;
    const dOwn = dice(ko[i], own.ko);
    let dOther = 0, other = null; for (const u of U) { if (u === own) continue; const v = dice(ko[i], u.ko); if (v > dOther) { dOther = v; other = u; } }
    if (dOther > dOwn + 0.1 && dOwn < 0.5) { diffs.push({ kind: "짝", text: s, ko: ko[i], original: own.ko, closer: other.ko, at: i + 1 }); return; }
    if (!own.ko) return;
    koTotal++;
    if (koKey(ko[i]) === koKey(own.ko)) koSame++;
    else diffs.push({ kind: "한국어", text: ko[i], original: own.ko, en: s, at: i + 1 });
  });
  return { ref, diffs, same, koSame, koTotal, lines: o.lines, copy: o.copy };
}
