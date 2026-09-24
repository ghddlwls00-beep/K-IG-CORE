#!/usr/bin/env node
/**
 * GRAMMAR 채점기 시험 — 6단계 G11(결정표 2번 '기능어 하나 더 → 70점')과 7단계 7-4 f ②(소유자 결정 2026-09-23 '뜻이 반대면 0점').
 * 모든 GRAMMAR 영어 문항(모범 답안 · 대체 답안)에 학습자가 흔히 치는 꼴을 만들어 앱 채점기(src/lib/grammarGrading.ts
 * gradeAgainstReferences)로 채점하고 숫자를 낸다:
 *   ① 기능어 하나 더(the · very)를 문장 안 여러 자리에 — 짧은 문장(6낱말 이하)에서 0점이던 것이 70점이 되어야
 *   ② 내용어 하나 더(banana) — 길이 한도를 넘으면 전처럼 0점
 *   ③ 기능어 둘 더 — 한도를 넘으면 전처럼 0점(하나만 풀어 줌)
 *   ④ 모범 답안 그대로 — 전부 만점(exact) 그대로
 *   ⑤ 부정어 하나 더(not · never · 줄임꼴 n't) — 뜻이 반대 → 모두 0점. (길이 한도를 넘는 꼴의 수는 참고로만 찍는다.)
 *   ⑥ 부정어 뺀 꼴(부정문 모범에서 첫 부정어를 뺌, 꼬리는 그대로) — 뜻이 반대 → 모두 0점
 *   ⑦ 대답말 "No," 만 다른 꼴(있는 모범에서 뺌 · 모든 모범에 더함) — 전과 같은 점수
 *   ⑧ 부가의문문 꼬리의 긍정 · 부정만 틀림 — 뜻이 반대가 아니라 문법 실수 → 전과 같은 점수
 *   ⑨ 부가의문문의 본문 긍정 · 부정을 뒤집음(꼬리도 맞춰 뒤집음) — 뜻이 반대 → 모두 0점
 * --rev <커밋> 을 주면 그 커밋의 채점기를 나란히 돌려 칸마다 견준다(결정 밖 변화가 있으면 exit 1):
 *   생겨도 되는 변화는 ① 0 → 70 과 ⑤ ⑥ ⑨ 70 → 0 뿐. ② ③ ④ ⑦ ⑧ 은 한 칸도 달라지면 안 된다.
 * 일부러 깨기(채점기 복사본만 바꿈) — 셋 다 exit 1 이어야 한다:
 *   --break=polarity           ② 판단(flipsNegation)을 끔 → ⑤ ⑥ ⑨ 에 70점. 이때 ⑤ 가 G11 전 채점과 같으면(0 → 70 없음)
 *                              ① 의 부정어 막기가 혼자서도 선다는 뜻(3차 점검 ①).
 *   --break=negation           ① 의 부정어 막기를 끔 → ⑤ ⑥ ⑨ 는 ② 가 막아 0 그대로지만, 짧은 문장의 대답말 "No," · 꼬리 실수가
 *                              0 → 70 (결정 밖 변화) — ① 이 '전과 같은 점수' 를 지킨다.
 *   --break=negation,polarity  둘 다 끔 → ⑤ 가 0 → 70 까지.
 *
 *   node check-grammar-extra-word.cjs --rev 034e91b
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const BREAKS = new Set((process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length).split(",").filter(Boolean));
const GRADER = path.join(REPO, "src/lib/grammarGrading.ts");
const temps = [];
process.on("exit", () => { for (const f of temps) try { fs.rmSync(f, { force: true }); } catch {} });
const graderFrom = (src, label) => {
  const f = path.join(os.tmpdir(), `kig-grader-${label}-${process.pid}.ts`);
  fs.writeFileSync(f, src);
  temps.push(f);
  return loadTs(f);
};
let now = loadTs(GRADER);
if (BREAKS.size) {
  let src = fs.readFileSync(GRADER, "utf8");
  const patch = (from, to) => { if (!src.includes(from)) throw new Error(`깨기 자리(${from}) 없음`); src = src.replace(from, to); };
  for (const b of BREAKS) {
    if (b === "negation") patch("!NEGATIONS.has(surplus[0])", "true");
    else if (b === "polarity") patch("if (flipsNegation(", "if (false && flipsNegation(");
    else throw new Error(`모르는 --break=${b}`);
  }
  now = graderFrom(src, "break");
  console.log(`[일부러 깸: ${[...BREAKS].join(" · ")}] 채점기 복사본으로 돌림`);
}
const REV = arg("--rev");
const old = REV ? graderFrom(execFileSync("git", ["show", `${REV}:src/lib/grammarGrading.ts`], { cwd: REPO, encoding: "utf8" }), "rev") : null;
const { gradeAgainstReferences, normalizeForComparison } = now;
const nWords = (s) => normalizeForComparison(s).split(" ").filter(Boolean).length;

const items = [];
for (const dir of ["grammar1", "grammar2"]) {
  const d = path.join(REPO, "content/lessons", dir);
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
    for (const b of j.blocks || []) if (b.type === "sentences") for (const it of b.items || []) {
      if (!/[A-Za-z]{2}/.test(it.text || "") || /[가-힣]/.test(it.text || "")) continue;
      items.push({ key: `${f.replace(".json", "")}#${it.n}`, refs: [it.text, ...(it.alternatives || [])] });
    }
  }
}
const words = (s) => s.replace(/[.?!]+$/, "").split(/\s+/);
const join = (w, end) => w.join(" ") + end;
const CONTRACT = { will: "won't", can: "can't", shall: "shan't" };
const AUX = /^(is|are|was|were|am|do|does|did|can|could|will|would|should|shall|has|have|had|must)$/i;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// 부가의문문 꼬리: ", isn't he?" · ", is he?" · ", are they not?" · ", won't you?"
const TAG = /^(.*\S),\s*([A-Za-z]+?)(n['’]t)?\s+(I|you|he|she|it|we|they|there|one)(\s+not)?\s*\?\s*$/i;
const tagOf = (m) => {
  const t = m.match(TAG);
  if (!t || words(t[1]).length < 2) return null;
  return { main: t[1], aux: t[2], neg: Boolean(t[3] || t[5]), subj: t[4] };
};
const BASE = { ca: "can", wo: "will", sha: "shall" };
const flipTag = (t) => {
  const aux = BASE[t.aux.toLowerCase()] || t.aux;
  if (t.neg) return `${t.subj === "I" && /^are$/i.test(aux) ? "am" : aux} ${t.subj}?`;
  if (/^am$/i.test(aux)) return `aren't ${t.subj}?`;
  return `${CONTRACT[aux.toLowerCase()] || `${aux}n't`} ${t.subj}?`;
};
// 본문의 첫 부정어를 뺌(or not 은 부정이 아님). 없으면 null
function dropNegation(main) {
  const m = main.match(/\b(can['’]t|cannot|won['’]t|shan['’]t|[A-Za-z]+n['’]t|never|not|no)\b(?!-)/i); // no-confidence 는 한 낱말
  if (!m) return null;
  const at = m.index, w = m[1], low = w.toLowerCase().replace("’", "'");
  if (low === "not" && /\bor\s+$/i.test(main.slice(0, at))) return null;
  if (low === "no" && (at === 0 || /\bno\s+(matter|sooner|doubt)\b/i.test(main.slice(at)))) return null;
  const repl = { "can't": "can", cannot: "can", "won't": "will", "shan't": "shall" }[low] ?? (/n't$/.test(low) ? w.replace(/n['’]t$/i, "") : "");
  return (main.slice(0, at) + repl + main.slice(at + w.length)).replace(/\s{2,}/g, " ").replace(/^\s+/, "");
}
// 본문에 부정어를 넣음(첫 조동사 뒤 not). 없으면 null
function addNegation(main) {
  const w = main.split(/\s+/);
  const ai = w.findIndex((x) => AUX.test(x));
  if (ai < 0) return null;
  return [...w.slice(0, ai + 1), "not", ...w.slice(ai + 1)].join(" ");
}
const results = {};
const oldResults = {};
const blank = () => ({ tried: 0, exact: 0, partial: 0, incorrect: 0 });
const T = { items: items.length, short: 0, exactModel: 0, negWhether: 0, oneFn: blank(), oneFnShort: { tried: 0, partial: 0, incorrect: 0 }, content: blank(), twoFn: blank(), neg: blank(), negOver: blank(), drop: blank(), answerNo: blank(), wrongTag: blank(), flipMain: blank() };
const grade = (it, kind, text, bucket) => {
  const g = gradeAgainstReferences(text, it.refs);
  results[`${it.key}|${kind}`] = g;
  if (old) oldResults[`${it.key}|${kind}`] = old.gradeAgainstReferences(text, it.refs);
  if (bucket) { bucket.tried++; bucket[g]++; }
  return g;
};
for (const it of items) {
  const model = it.refs[0];
  const end = (model.match(/[.?!]+$/) || [""])[0];
  const w = words(model);
  const short = w.length <= 6;
  if (short) T.short++;
  if (grade(it, "model", model) === "exact") T.exactModel++;
  // ① 기능어 하나 더
  const spots = [...new Set([0, Math.min(1, w.length), Math.floor(w.length / 2), w.length - 1])];
  for (const fw of ["the", "very"]) for (const at of spots) {
    const g = grade(it, `+${fw}@${at}`, join([...w.slice(0, at), fw, ...w.slice(at)], end), T.oneFn);
    if (short) { T.oneFnShort.tried++; if (g === "partial") T.oneFnShort.partial++; if (g === "incorrect") T.oneFnShort.incorrect++; }
  }
  // ② 내용어 하나 더 · ③ 기능어 둘 더
  grade(it, "+banana", join([...w, "banana"], end), T.content);
  grade(it, "+the+very", join(["the", ...w, "very"], end), T.twoFn);
  // ⑤ 부정어 하나 더 — 부가의문문은 본문 자리에만(꼬리에 넣은 것은 ⑧ 의 꼬리 실수)
  const tag0 = tagOf(model);
  const mainLen = tag0 ? words(tag0.main).length : w.length;
  const negSpots = [...new Set([0, Math.min(1, mainLen), Math.floor(mainLen / 2), mainLen - 1])];
  const negForms = [];
  for (const neg of ["not", "never"]) for (const at of negSpots) negForms.push([`+${neg}@${at}`, join([...w.slice(0, at), neg, ...w.slice(at)], end)]);
  const ai = w.slice(0, mainLen).findIndex((x) => AUX.test(x) && !/^am$/i.test(x));
  if (ai >= 0) { const t = [...w]; t[ai] = CONTRACT[t[ai].toLowerCase()] || `${t[ai]}n't`; negForms.push(["+n't", join(t, end)]); }
  // 'whether … or not' 절 안에 넣은 부정어는 뺌(관문 15, 2026-09-25): 채점이 whether 뒤 'or not' 을 부정으로 세지 않듯(negatesAt)
  // 그 절에 not 을 더해도 뜻이 뒤집히지 않는다 — 'whether not to go' ≈ 'whether to go', 'or not not' 은 말이 안 되는 꼴.
  // 결정 C 로 'whether or not …' 다른 정답이 들어온 뒤 이 꼴이 낱말 차례로 70점이 되어 드러남(gh2-032 #3 · gh2-045 #15). 뺀 수는 따로 찍는다.
  // 뺄 자리는 whether 뒤부터 그 절의 'or not' 의 not 까지만(3차 점검 권고 — 뒤에 다른 절이 붙어도 그 절의 부정어는 그대로 잼)
  const wi = w.findIndex((x) => /^whether$/i.test(x));
  let ni = -1;
  if (wi >= 0) for (let i = wi + 1; i + 1 < w.length + 1; i++) if (/^or$/i.test(w[i - 1] || "") && /^not[.,]?$/i.test(w[i] || "")) { ni = i; break; }
  for (const [kind, text] of negForms) {
    const at = Number((kind.match(/@(\d+)$/) || [])[1]);
    if (ni > wi && at > wi && at <= ni) { T.negWhether++; continue; }
    const g = grade(it, kind, text, T.neg);
    const n = nWords(text);
    if (it.refs.every((r) => n > nWords(r) * 1.15)) { T.negOver.tried++; T.negOver[g]++; }
  }
  // ⑥ 부정어 뺀 꼴(꼬리는 그대로)
  const tag = tagOf(model);
  const main = tag ? tag.main : model.replace(/[.?!]+$/, "");
  const dropped = dropNegation(main);
  if (dropped && dropped !== main) grade(it, "-neg", tag ? `${dropped}, ${tag.neg ? model.slice(model.lastIndexOf(",") + 1).trim() : model.slice(model.lastIndexOf(",") + 1).trim()}` : `${dropped}${end}`, T.drop);
  // ⑦ 대답말 No, 만 다름
  const noM = model.match(/^No,\s*(.+)$/i);
  if (noM) grade(it, "-No,", cap(noM[1]), T.answerNo);
  else if (!/^(yes|no)\b/i.test(model)) grade(it, "+No,", `No, ${model.charAt(0).toLowerCase()}${model.slice(1)}`, T.answerNo);
  // ⑧ ⑨ 부가의문문
  if (tag) {
    grade(it, "tag-wrong", `${tag.main}, ${flipTag(tag)}`, T.wrongTag);
    const flipped = tag.neg ? dropNegation(tag.main) : addNegation(tag.main);
    if (flipped && flipped !== tag.main) grade(it, "tag-main-flip", `${flipped}, ${flipTag(tag)}`, T.flipMain);
  }
}
const line = (label, b, extra = "") => console.log(`  ${label} ${b.tried}: 만점 ${b.exact} · 70점 ${b.partial} · 0점 ${b.incorrect}${extra}`);
console.log(`GRAMMAR 영어 문항 ${T.items}(6낱말 이하 ${T.short}) · 모범 답안 그대로 만점 ${T.exactModel}/${T.items}`);
line("① 기능어 하나 더", T.oneFn, `  (6낱말 이하만 ${T.oneFnShort.tried}: 70점 ${T.oneFnShort.partial} · 0점 ${T.oneFnShort.incorrect})`);
line("② 내용어 하나 더", T.content);
line("③ 기능어 둘 더", T.twoFn);
line("⑤ 부정어 하나 더", T.neg, `  (참고: 길이 한도를 넘는 꼴 ${T.negOver.tried} 중 70점 ${T.negOver.partial} · 만점 ${T.negOver.exact} · 'whether … or not' 절 안이라 뺀 꼴 ${T.negWhether})`);
line("⑥ 부정어 뺀 꼴", T.drop);
line("⑦ 대답말 No, 만 다름", T.answerNo);
line("⑧ 꼬리 긍정·부정만 틀림", T.wrongTag);
line("⑨ 본문 긍정·부정 뒤집음", T.flipMain);
let fail = false;
const must = (ok, msg) => { if (!ok) { fail = true; console.log(`  ✗ ${msg}`); } };
must(T.exactModel === T.items, `④ 모범 답안 그대로 만점 아님 ${T.items - T.exactModel}`);
must(T.neg.partial + T.neg.exact === 0, `⑤ 부정어 넣은 꼴이 0점 아님 ${T.neg.partial + T.neg.exact} (② 판단)`);
must(T.drop.partial + T.drop.exact === 0, `⑥ 부정어 뺀 꼴이 0점 아님 ${T.drop.partial + T.drop.exact}`);
must(T.flipMain.partial + T.flipMain.exact === 0, `⑨ 본문을 뒤집은 꼴이 0점 아님 ${T.flipMain.partial + T.flipMain.exact}`);
const compare = (base, label) => {
  const moves = {};
  for (const [k, g] of Object.entries(results)) {
    const was = base[k];
    if (was && was !== g) { const kind = k.split("|")[1].replace(/@\d+$/, ""); const m = `${kind} ${was}→${g}`; moves[m] = (moves[m] || 0) + 1; }
  }
  console.log(`  ${label}와 달라진 채점: ${Object.keys(moves).length ? Object.entries(moves).map(([m, n]) => `${m} ${n}`).join(" · ") : "없음"}`);
  const allowed = /^(\+(the|very) incorrect→partial|\+(not|never|n't) partial→incorrect|-neg partial→incorrect|tag-main-flip partial→incorrect)$/;
  const bad = Object.keys(moves).filter((m) => !allowed.test(m));
  must(!bad.length, `결정 밖의 변화: ${bad.join(" · ")}`);
};
if (old) compare(oldResults, `${REV} 채점기`);
const out = arg("--json"); if (out) fs.writeFileSync(out, JSON.stringify(results));
const before = arg("--before");
if (before) compare(JSON.parse(fs.readFileSync(before, "utf8")), `--before ${path.basename(before)}`);
const list = arg("--list");
if (list) for (const [k, g] of Object.entries(results)) if (k.includes(`|${list}`) && g !== "incorrect") console.log(`    ${k} → ${g}`);
process.exit(fail ? 1 : 0);
