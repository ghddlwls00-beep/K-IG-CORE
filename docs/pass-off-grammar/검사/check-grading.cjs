#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 채점 회귀 (설계 §8 · 코드 단계 B).
 *
 * src/lib/passoffGrading.ts 를 그대로(단독 트랜스파일 — import 없는 파일) 불러, 레슨 파일 전부의 문항을 채점해 본다.
 * **기대는 레슨 파일에서, 채점은 휴대폰이 받는 문항으로**: 무료 체험 레슨이 떼어 둔 유료 보충 문항(content/private/…/<id>.paid.json)
 * 을 앱과 같은 함수(src/lib/passoffSupplement.ts attachPaidItems)로 붙이고, 페이지가 화면에 넘기는 모양
 * (src/lib/passoffView.ts viewBlocks — 기록용 칸 · reserve 문항을 뺀 것)으로 바꾼 문항을 채점기에 넣는다.
 * 그래서 페이지가 accept · targets 를 잘못 빼면 여기서 드러난다.
 *
 *   V. 화면에 넘기는 문항: 기록용 칸(bookRef · fix · source · koSource · note · challengeNote · paidStudent · tags ·
 *      challengeTags) 0 · reserve 문항 0 · 레슨의 나머지 문항은 모두 있음.
 *   A. ④ 영작 · ⑤ 처음 보는 문장의 모범 답(en)과 허용 답(accept)이 전부 '정답'(오타 표시 없이) · 모두 목표형을 가짐.
 *      A2 문항마다 목표형(targets) 묶음이 1개 이상 — 채점기는 목표 낱말만 엄격히 보므로(한 글자도 오타로 봐주지 않음).
 *   B. 교재 원문 오류 문장(fix.from — 영어를 고친 것 가운데 영어 문장인 것)이 전부 '오답'. 정답이 되는 것은 까닭이
 *      채점 규칙에 있을 때만 따로 센다(문장부호 · 대소문자만 다름 / 축약형만 다름 / 띄어쓰기만 다름 / 내용 세션이 허용 답으로
 *      둔 덜 자연스러운 글) — 까닭 없이 정답이면 FAIL.
 *   C. 틀린 대조가 전부 '오답' (레슨 파일에서 만듦):
 *      C1 부정 뒤집기 — 첫 be동사 · 조동사 뒤에 not 을 넣거나(부정문이면) 뺌
 *      C2 목표형 빠짐 — 모범 답에서 목표 낱말(targets 묶음의 꼴)을 지움
 *      C3 목표 낱말 한 글자 — 5글자 이상 목표 낱말의 가운데 한 글자를 바꿈(목표 낱말은 오타로 봐주지 않음 — 설계 §8)
 *   D. 오타 — 목표 · 기능어가 아닌 5글자 이상 낱말의 가운데 한 글자를 바꾼 모범 답이 '맞음(오타)'(너무 엄격하지 않은지).
 *   E. literal 오답 패턴(데이터-형식 v1.2)이 '오답'이고 그 힌트가 붙음 · 보통 오답 패턴의 글이 패턴에 걸림.
 *   F. ③ 형태 찾기: select 정답 토큰(+라벨) → 정답, 하나 빠뜨림 · 엉뚱한 토큰 더함 · 라벨 틀림 → 오답, optional 은 골라도 정답 /
 *      choice 정답 → 정답, 다른 보기 → 오답 / short 정답 → 정답.
 *   G. 한글 섞인 답 → 'hangul' · 고정 표본(접두 반의어 예외 interesting · invaluable, 서술형 두 줄 점수, 아포스트로피, 어미, 마이크 숫자).
 *
 *   node docs/pass-off-grammar/검사/check-grading.cjs
 *   node docs/pass-off-grammar/검사/check-grading.cjs --list              따로 센 것 · 실패 전부
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=targets     일부러 깨기: 화면에 넘기는 한 문항에서 targets 묶음 하나를
 *                                                                         지운 사본(메모리) → 레슨 파일로 만든 C3 이 FAIL 이어야
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=targets-all 일부러 깨기: 레슨 파일 사본의 한 문항 targets 를 모두 지움 → A2 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=fix         일부러 깨기: fix.from 에 한 글자 오타 꼴을 넣은 사본 → B FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=accept      일부러 깨기: accept 에 부정 뒤집은 답을 넣은 사본 → C1 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=view        일부러 깨기: 화면 문항에서 accept 를 뺀 사본 → A FAIL
 * exit 1 on any failure. 레슨 파일은 읽기만 한다.
 *
 * 같은 AI 계열이 채점기와 이 검사를 함께 만들었다 — 독립 검수가 아니다. 이 검사가 보증하는 것은 '레슨 파일에 적힌 답'에 대한
 * 판정뿐이다: 학습자가 쓸 수 있는 다른 맞는 답을 얼마나 받아 주는지(설계 §8 증거 2 '가린 인정률')는 여기서 재지 않는다.
 * 레슨 파일에서 targets 묶음 하나만 지워진 경우(다른 묶음이 남음)는 이 검사가 알 수 없다 — 기대도 같은 파일에서 나오므로.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const LESSON_DIR = path.join(REPO, "content/lessons/passoff-grammar");
const PRIVATE_DIR = path.join(REPO, "content/private/passoff-grammar");
const LIST = process.argv.includes("--list");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const BREAKS = ["targets", "targets-all", "fix", "accept", "view"];
if (BREAK && !BREAKS.includes(BREAK)) throw new Error(`모르는 --break=${BREAK} (${BREAKS.join(" · ")})`);

function loadTsAlone(rel) {
  const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  // no require: these files must stand alone (import-free, 설계 §8 — a type-only import is erased)
  new Function("module", "exports", js)(mod, mod.exports);
  return mod.exports;
}
const G = loadTsAlone("src/lib/passoffGrading.ts");
const { attachPaidItems } = loadTsAlone("src/lib/passoffSupplement.ts");
const { viewBlocks } = loadTsAlone("src/lib/passoffView.ts");
for (const name of ["gradeProduce", "isCorrect", "gradeSelect", "gradeChoice", "gradeShort", "missingTargets", "typoEligible", "writingIssues", "twoLineScore", "isPrefixedOpposite", "expectedLabel", "normalizeForComparison"]) {
  if (typeof G[name] !== "function") throw new Error(`${name} 를 passoffGrading.ts 에서 못 찾음 — 이 검사가 아무것도 안 봄`);
}
if (typeof viewBlocks !== "function" || typeof attachPaidItems !== "function") throw new Error("viewBlocks · attachPaidItems 를 못 찾음");

// ── 도우미
const clone = (x) => JSON.parse(JSON.stringify(x));
const bare = (t) => String(t).replace(/^[("“‘'[]+/, "").replace(/[.,?!;:)"”’'\]]+$/, "");
const tokensOf = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const hasHangul = (s) => /[가-힣ㄱ-ㆎ]/.test(String(s || ""));
const flipNegation = (en) => {
  const toks = tokensOf(en);
  const AUX = /^(am|is|are|was|were|do|does|did|can|could|will|would|should|must|may|might|have|has|had)$/i;
  const neg = toks.findIndex((t) => /n['’]t$/i.test(bare(t)) || /^not$/i.test(bare(t)));
  if (neg >= 0) {
    const t = toks[neg];
    if (/^not$/i.test(bare(t))) toks.splice(neg, 1);
    else toks[neg] = t.replace(/^(can|won|shan)['’]t/i, (m, a) => ({ can: "can", won: "will", shan: "shall" })[a.toLowerCase()] || a).replace(/n['’]t/i, "");
    return toks.join(" ");
  }
  const aux = toks.findIndex((t) => AUX.test(bare(t)));
  if (aux < 0) return null;
  toks.splice(aux + 1, 0, "not");
  return toks.join(" ");
};
const midSwap = (w) => {
  // the middle letter changed to another letter (never the first letter or the last two — an ending is grammar)
  const i = Math.max(1, Math.min(w.length - 3, Math.floor(w.length / 2)));
  const to = w[i].toLowerCase() === "x" ? "q" : "x";
  return w.slice(0, i) + (w[i] === w[i].toUpperCase() ? to.toUpperCase() : to) + w.slice(i + 1);
};
const replaceToken = (en, index, next) => {
  const toks = tokensOf(en);
  const t = toks[index];
  toks[index] = next === "" ? t.replace(bare(t), "").trim() : t.replace(bare(t), next);
  return toks.filter(Boolean).join(" ");
};
const longTargetAt = (p) => {
  // [group index, token index] of a target word of five letters or more written in the model answer
  const toks = tokensOf(p.en);
  for (const [g, group] of (p.targets || []).entries()) {
    const at = toks.findIndex((t) => /^[A-Za-z]{5,}$/.test(bare(t)) && group.some((f) => bare(t).toLowerCase() === String(f).toLowerCase()));
    if (at >= 0) return [g, at];
  }
  return null;
};

// ── 레슨: 파일(유료 보충을 제자리에) → 화면에 넘기는 모양
const lessons = fs
  .readdirSync(LESSON_DIR)
  .filter((f) => /^pg\d{2}-\d+\.json$/.test(f))
  .sort()
  .map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, f), "utf8"));
    const sup = path.join(PRIVATE_DIR, `${data.id}.paid.json`);
    const held = fs.existsSync(sup) ? JSON.parse(fs.readFileSync(sup, "utf8")).items || [] : [];
    return { id: data.id, file: held.length ? attachPaidItems(data.blocks, held) : data.blocks, held: held.length };
  });
if (!lessons.length) throw new Error("레슨 파일 0 — 이 검사가 아무것도 안 봄");
const drillOf = (blocks) => blocks.find((b) => b && b.type === "drill") || {};
const writeItems = (blocks) => [...(drillOf(blocks).produce || []), ...(drillOf(blocks).transfer || [])];
const formItems = (blocks) => drillOf(blocks).select || [];

// ── 일부러 깨기(메모리 사본 — 파일은 그대로). 파일 쪽을 깨면 view 도 거기서 만든다; view 쪽 깨기는 view 만.
let broken = null;
const breakFile = (L) => {
  for (const p of writeItems(L.file)) {
    if (BREAK === "targets-all" && (p.targets || []).length) {
      p.targets = [];
      return `${p.id} targets 를 모두 지움(레슨 파일 사본)`;
    }
    if (BREAK === "fix" && !p.fix) {
      // an "old sentence" the grader takes as right for no design reason (a one-letter slip → '맞음(오타)')
      const toks = tokensOf(p.en);
      const at = toks.findIndex((t, i) => i > 0 && /^[A-Za-z]{5,}$/.test(bare(t)) && G.typoEligible(bare(t), p.targets));
      if (at < 0) continue;
      p.fix = { from: replaceToken(p.en, at, midSwap(bare(toks[at]))), kind: "english_grammar", why: "깨기" };
      return `${p.id} fix.from = "${p.fix.from}"(레슨 파일 사본)`;
    }
    if (BREAK === "accept" && flipNegation(p.en)) {
      p.accept = [...(p.accept || []), flipNegation(p.en)];
      return `${p.id} accept += "${flipNegation(p.en)}"(레슨 파일 사본)`;
    }
  }
  return null;
};
const breakView = (L) => {
  for (const p of writeItems(L.view)) {
    if (BREAK === "targets") {
      const hit = longTargetAt(p);
      if (!hit || p.targets.length < 1) continue;
      const [g] = hit;
      const gone = p.targets[g];
      p.targets = p.targets.filter((_, i) => i !== g);
      return `${p.id} 화면 문항의 targets 묶음 하나 ${JSON.stringify(gone)} 지움(남은 묶음 ${p.targets.length})`;
    }
    if (BREAK === "view" && (p.accept || []).length) {
      delete p.accept;
      return `${p.id} 화면 문항에서 accept 를 뺌`;
    }
  }
  return null;
};
for (const L of lessons) {
  if (BREAK && ["targets-all", "fix", "accept"].includes(BREAK)) {
    L.file = clone(L.file);
    if (!broken) broken = breakFile(L);
  }
  L.view = clone(viewBlocks(L.file));
  if (BREAK && ["targets", "view"].includes(BREAK) && !broken) broken = breakView(L);
}
if (BREAK && !broken) throw new Error(`--break=${BREAK}: 깰 문항을 못 찾음`);
if (BREAK) console.log(`(깨기 시험 --break=${BREAK} — ${broken})`);

// ── 검사
const fails = [];
const notes = [];
const counts = {};
const count = (k, n = 1) => (counts[k] = (counts[k] || 0) + n);
const fail = (section, msg) => fails.push(`${section} ${msg}`);
const HIDDEN = ["bookRef", "fix", "source", "koSource", "note", "challengeNote", "paidStudent", "tags", "challengeTags"];
const ENGLISH_FIX = new Set(["english_grammar", "english_unnatural", "grammar_explanation_wrong", "layout_or_extraction"]);
/** the old ENGLISH sentence of a fix: the "en: … / ko: …" part, or the part of "… / …" without Korean, without "(1과)" marks */
function oldEnglish(from) {
  let s = String(from || "");
  const en = s.match(/(?:^|\/\s*)en:\s*(.*?)(?:\s*\/\s*ko:|$)/);
  if (en) s = en[1];
  else s = s.split(/\s+\/\s+/).find((part) => !hasHangul(part)) || "";
  s = s.replace(/\s*\((?:\d+과|= ?\w+|가주어|yes|no)\)\s*/gi, " ").replace(/\s+/g, " ").trim();
  if (!s || hasHangul(s) || !/[A-Za-z]/.test(s) || /^\d+\./.test(s) || /[:;]\s*$/.test(s)) return null;
  // a list of words (단수=복수 : …) or a task ("(인칭대명사에 …)") is not a sentence a learner types
  if (/^[(（]/.test(s) || /\s:\s/.test(s)) return null;
  return s;
}
const marksOff = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
/** Why an old textbook sentence is graded right — each is a rule the grader follows on purpose; anything else is a FAIL. */
function whyAccepted(old, p) {
  if (marksOff(old) === marksOff(p.en)) return "문장부호 · 대소문자만 다름(설계 §8 — 채점에 안 씀)";
  const accepted = (p.accept || []).find((a) => marksOff(a) === marksOff(old) || G.normalizeForComparison(a) === G.normalizeForComparison(old));
  if (accepted) return `내용 세션이 허용 답으로 둠("${accepted}") — 틀린 문장이 아니라 덜 자연스러운 글`;
  if (G.normalizeForComparison(p.en) === G.normalizeForComparison(old)) return "축약형만 다름(양쪽을 펴서 비교 — GRAMMAR I·II 와 같음)";
  if (G.normalizeForComparison(p.en).replace(/ /g, "") === G.normalizeForComparison(old).replace(/ /g, "")) return "띄어쓰기만 다름(GRAMMAR I·II 와 같은 규칙)";
  return null;
}

for (const L of lessons) {
  // V
  const viewById = new Map();
  for (const b of L.view) for (const list of ["items", "select", "produce", "transfer"]) for (const it of b[list] || []) viewById.set(it.id, it);
  for (const b of L.file) for (const list of ["items", "select", "produce", "transfer"]) for (const it of b[list] || []) {
    count("V 화면에 넘기는 문항(reserve 빼고)", it.reserve ? 0 : 1);
    const v = viewById.get(it.id);
    if (it.reserve) { if (v) fail("V", `${it.id} reserve 문항이 화면에 감`); continue; }
    if (!v) { fail("V", `${it.id} 화면에 안 감`); continue; }
    const leaked = HIDDEN.filter((k) => k in v);
    if (leaked.length) fail("V", `${it.id} 기록용 칸이 화면에 감: ${leaked.join(" · ")}`);
  }
  if (!L.view.some((b) => b.type === "rule") || !L.view.some((b) => b.type === "frame")) fail("V", `${L.id} 규칙 · 내 문장 블록이 화면에 안 감`);

  // A–E: expectations from the file item p, graded with the item the view receives (q)
  for (const p of writeItems(L.file)) {
    const q = viewById.get(p.id);
    if (!q) continue; // V has reported it
    const refs = [p.en, ...(p.accept || [])].filter((s) => typeof s === "string" && s.trim());
    // A
    for (const r of refs) {
      count("A 정답(모범 답 · 허용 답)");
      const res = G.gradeProduce(r, q);
      if (res.verdict !== "correct") fail("A", `${p.id} "${r}" → ${res.verdict}${res.missingTargets.length ? ` (목표형 없음 ${JSON.stringify(res.missingTargets)})` : ""}`);
      const miss = G.missingTargets(r, p.targets);
      if (miss.length) fail("A", `${p.id} "${r}" 에 목표형이 없음 ${JSON.stringify(miss)}`);
    }
    count("A2 목표형 묶음이 있는 문항");
    if (!(p.targets || []).some((g) => Array.isArray(g) && g.length)) fail("A2", `${p.id} 목표형(targets) 묶음이 없음 — 문법 낱말의 한 글자 틀림도 오타로 봐줄 수 있음`);
    // B
    if (p.fix && p.fix.from && (ENGLISH_FIX.has(p.fix.kind) || /en/.test(String(p.fix.field || "")))) {
      const old = oldEnglish(p.fix.from);
      if (!old) count("B 영어 문장이 아닌 고침(건너뜀)");
      else {
        const res = G.gradeProduce(old, q);
        if (!G.isCorrect(res)) count("B 원문 오류 문장 → 오답");
        else {
          const why = whyAccepted(old, p);
          if (!why) fail("B", `${p.id} 교재 원문 "${old}" → ${res.verdict}(오류 문장이 정답 처리됨) · 고친 글 "${p.en}"`);
          else {
            count(`B 따로 셈 · ${why.replace(/\(.*$/, "").trim()}`);
            notes.push(`B ${p.id} [${p.fix.kind}] "${old}" → ${res.verdict} — ${why} · 고친 글 "${p.en}"`);
          }
        }
      }
    }
    // C1
    const flipped = flipNegation(p.en);
    if (flipped) {
      count("C1 부정 뒤집기");
      const res = G.gradeProduce(flipped, q);
      if (G.isCorrect(res)) fail("C1", `${p.id} "${flipped}" → ${res.verdict}(뜻이 반대인 답이 정답)`);
    }
    // C2 · C3
    const toks = tokensOf(p.en);
    for (const group of p.targets || []) {
      const at = toks.findIndex((t) => group.some((f) => bare(t).toLowerCase() === String(f).toLowerCase()));
      if (at < 0) continue;
      const removed = replaceToken(p.en, at, "");
      count("C2 목표형 빠짐");
      const r2 = G.gradeProduce(removed, q);
      if (G.isCorrect(r2)) fail("C2", `${p.id} "${removed}" → ${r2.verdict}(목표형을 지운 답이 정답)`);
      const word = bare(toks[at]);
      if (/^[A-Za-z]{5,}$/.test(word)) {
        const mutated = replaceToken(p.en, at, midSwap(word));
        count("C3 목표 낱말 한 글자");
        const r3 = G.gradeProduce(mutated, q);
        if (G.isCorrect(r3)) fail("C3", `${p.id} "${mutated}" → ${r3.verdict}(목표 낱말 "${word}" 의 한 글자 틀림을 오타로 봐줌)`);
      }
    }
    // D
    const di = toks.findIndex((t, i) => i > 0 && /^[A-Za-z]{5,}$/.test(bare(t)) && G.typoEligible(bare(t), p.targets) && toks.filter((x) => bare(x).toLowerCase() === bare(t).toLowerCase()).length === 1);
    if (di >= 0) {
      const typo = replaceToken(p.en, di, midSwap(bare(toks[di])));
      count("D 오타 한 글자");
      const res = G.gradeProduce(typo, q);
      if (res.verdict !== "typo") fail("D", `${p.id} "${typo}" → ${res.verdict}(한 글자 오타를 봐주지 않음)`);
    }
    // E
    for (const e of p.errorPatterns || []) {
      const res = G.gradeProduce(e.match, q);
      if (e.literal) {
        count("E literal 오답");
        if (res.verdict !== "wrong" || !res.pattern || res.pattern.hint !== e.hint) fail("E", `${p.id} literal "${e.match}" → ${res.verdict} · 힌트 ${res.pattern ? res.pattern.hint : "없음"}`);
      } else {
        count("E 보통 오답 패턴");
        if (G.isCorrect(res)) fail("E", `${p.id} 오답 패턴 글 "${e.match}" 이 정답 처리됨`);
        else if (!res.pattern) fail("E", `${p.id} 오답 패턴 글 "${e.match}" 이 어떤 패턴에도 안 걸림(낱말 경계 · 정규화)`);
      }
    }
    // G
    count("G 한글 답");
    if (G.gradeProduce(`${p.en} 입니다`, q).verdict !== "hangul") fail("G", `${p.id} 한글 섞인 답이 hangul 이 아님`);
  }

  // F — the view's items against the file's answers (a reserve item never reaches the page: graded as filed,
  // for the cross-day review that will ask it)
  for (const s of formItems(L.file)) {
    const v = s.reserve ? s : viewById.get(s.id);
    if (!v) continue; // V has reported it
    if (s.kind === "select") {
      const labels = {};
      for (const i of s.answer) { const l = G.expectedLabel(s, i); if (l) labels[i] = l; }
      count("F select");
      if (!G.gradeSelect(v, s.answer, labels).correct) fail("F", `${s.id} select 정답 토큰이 오답`);
      if (G.gradeSelect(v, s.answer.slice(1), labels).correct) fail("F", `${s.id} select 하나 빠뜨려도 정답`);
      const other = s.tokens.findIndex((t, i) => !s.answer.includes(i) && !(s.optional || []).includes(i) && /[A-Za-z]/.test(t));
      if (other >= 0 && G.gradeSelect(v, [...s.answer, other], labels).correct) fail("F", `${s.id} select 엉뚱한 토큰 "${s.tokens[other]}" 을 더해도 정답`);
      if ((s.optional || []).length && !G.gradeSelect(v, [...s.answer, ...s.optional], labels).correct) fail("F", `${s.id} select optional 을 골랐더니 오답`);
      if (s.labels && s.labels.length > 1) {
        const wrong = { ...labels, [s.answer[0]]: s.labels.find((l) => l !== labels[s.answer[0]]) };
        if (G.gradeSelect(v, s.answer, wrong).correct) fail("F", `${s.id} select 라벨이 틀려도 정답`);
      }
    } else if (s.kind === "choice") {
      count("F choice");
      if (!G.gradeChoice(v, s.answer)) fail("F", `${s.id} choice 정답이 오답`);
      s.options.forEach((_, i) => { if (i !== s.answer && G.gradeChoice(v, i)) fail("F", `${s.id} choice 보기 ${i} 가 정답`); });
    } else if (s.kind === "short") {
      count("F short");
      for (const a of s.answer) if (G.gradeShort(v, a) !== "correct") fail("F", `${s.id} short "${a}" → ${G.gradeShort(v, a)}`);
      if (G.gradeShort(v, "가나다") !== "hangul") fail("F", `${s.id} short 한글이 hangul 이 아님`);
    } else fail("F", `${s.id} 모르는 kind ${s.kind}`);
  }
}

// G — 고정 표본
const expect = (label, got, want) => { count("G 고정 표본"); if (JSON.stringify(got) !== JSON.stringify(want)) fail("G", `${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
expect("possible ↔ impossible 은 반대말", G.isPrefixedOpposite("possible", "impossible"), true);
expect("happy ↔ unhappy 은 반대말", G.isPrefixedOpposite("happy", "unhappy"), true);
expect("teresting ↔ interesting 은 반대말 아님(과민 예외)", G.isPrefixedOpposite("teresting", "interesting"), false);
expect("valuable ↔ invaluable 은 반대말 아님(과민 예외)", G.isPrefixedOpposite("valuable", "invaluable"), false);
const sample = { en: "I am eleven years old.", accept: ["I'm eleven years old."], targets: [["am", "'m"]], errorPatterns: [] };
const graded = ["I am eleven years old.", "i am eleven years old.", "I am eleven years old", "I am elevan years old.", "I is eleven years old."].map((a) => ({ answer: a, result: G.gradeProduce(a, sample) }));
expect("서술형 두 줄 점수", G.twoLineScore(graded), { total: 5, grammar: 4, written: 1, capital: 1, punctuation: 1, spelling: 1 });
expect("축약형 아포스트로피를 빼면 오타(철자)", G.gradeProduce("Im eleven years old.", sample).verdict, "typo");
expect("its ≠ it's(아포스트로피를 더한 것은 봐주지 않음)", G.isCorrect(G.gradeProduce("It's tail is long.", { en: "Its tail is long." })), false);
expect("walk ↔ walks 는 오타가 아님(어미)", G.gradeProduce("He walk to school.", { en: "He walks to school." }).verdict, "wrong");
expect("마이크 답의 숫자(11 = eleven)", G.gradeProduce("I am 11 years old", { ...sample, accept: [] }, { spoken: true }).verdict, "correct");
expect("타이핑한 숫자는 그대로(11 ≠ eleven)", G.gradeProduce("I am 11 years old", { ...sample, accept: [] }).verdict, "wrong");

// ── 결과
const items = lessons.reduce((n, L) => n + writeItems(L.file).length, 0);
const forms = lessons.reduce((n, L) => n + formItems(L.file).length, 0);
console.log(`check-grading — 레슨 ${lessons.length} (유료 보충을 붙인 레슨 ${lessons.filter((L) => L.held).length}) · ④⑤ 문항 ${items} · ③ 문항 ${forms}(reserve 포함)`);
for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(40)} ${v}`);
if (notes.length) {
  console.log(`\n따로 센 것 ${notes.length} (실패 아님 — 까닭이 채점 규칙에 있음):`);
  for (const n of notes.slice(0, LIST ? notes.length : 8)) console.log(`  ${n}`);
  if (!LIST && notes.length > 8) console.log(`  … (--list 로 전부)`);
}
if (fails.length) {
  console.log(`\nFAIL ${fails.length}:`);
  for (const f of fails.slice(0, LIST ? fails.length : 30)) console.log(`  ${f}`);
  if (!LIST && fails.length > 30) console.log(`  … (--list 로 전부)`);
  if (BREAK) console.log(`\n(깨기 --break=${BREAK}: FAIL 이 나야 맞음 — 검사가 실패할 수 있음을 보임)`);
  process.exit(1);
}
console.log("\nPASS");
