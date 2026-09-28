#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 채점 회귀 (설계 §8 · 코드 단계 B).
 *
 * src/lib/passoffGrading.ts 를 그대로(단독 트랜스파일 — import 없는 파일) 불러, 레슨 파일 전부의 문항을 채점해 본다.
 * **기대는 레슨 파일에서, 채점은 휴대폰이 받는 문항으로**: 무료 체험 레슨이 떼어 둔 유료 보충 문항(content/private/…/<id>.paid.json)
 * 을 앱과 같은 함수(src/lib/passoffSupplement.ts attachPaidItems)로 붙이고, 페이지가 화면에 넘기는 모양
 * (src/lib/passoffView.ts viewBlocks — 기록용 칸 · reserve 문항을 뺀 것)으로 바꾼 뒤, 서버가 붙이는 낱말 꼴
 * (src/lib/passoffWordForms.ts attachWordForms — 불규칙 동사 · 복수 표에서 그 문항 답이 만날 낱말만, 2026-09-28 유출 고침)까지
 * 붙인 문항을 채점기에 넣는다. 그래서 페이지가 accept · targets 를 잘못 빼거나 낱말 꼴을 안 붙이면 여기서 드러난다.
 * 앞 G 고정 표본의 손으로 만든 문항에도 같은 함수로 낱말 꼴을 붙인다(served).
 *
 *   V. 화면에 넘기는 문항: 기록용 칸(bookRef · fix · source · koSource · note · challengeNote · paidStudent · tags ·
 *      challengeTags) 0 · reserve 문항 0 · 레슨의 나머지 문항은 모두 있음.
 *   A. ④ 영작 · ⑤ 처음 보는 문장의 모범 답(en)과 허용 답(accept)이 전부 '정답'(오타 표시 없이) · 모두 목표형을 가짐.
 *      A2 문항마다 목표형(targets) 묶음이 1개 이상 — 채점기는 목표 낱말만 엄격히 보므로(한 글자도 오타로 봐주지 않음).
 *      A3 줄표로 나눈 답(go - went - gone)을 빗금으로(go/went/gone · go / went / gone) 쓴 답도 '정답'(할 일 2).
 *   B. 교재 원문 오류 문장(fix.from — 영어를 고친 것 가운데 영어 문장인 것)이 전부 '오답'. 정답이 되는 것은 까닭이
 *      채점 규칙에 있을 때만 따로 센다(문장부호 · 대소문자만 다름 / 메모만 뗌 / 축약형만 다름 / 띄어쓰기만 다름 / 내용 세션이
 *      허용 답으로 둔 덜 자연스러운 글) — 까닭 없이 정답이면 FAIL. '(=oldest)' · '(4과)' 같은 메모를 떼어서 같아진 것은
 *      '메모만 뗌'(할 일 8) — '문장부호 · 대소문자만 다름'이라고 적힌 것은 메모를 떼기 전 글로도 같아야 함(아니면 FAIL).
 *   C. 틀린 대조가 전부 '오답' (레슨 파일에서 만듦):
 *      C1 부정 뒤집기 — 첫 be동사 · 조동사 뒤에 not 을 넣거나(부정문이면) 뺌
 *      C2 목표형 빠짐 — 모범 답에서 목표 낱말(targets 묶음의 꼴)을 지움
 *      C3 목표 낱말 한 글자 — 5글자 이상 목표 낱말의 가운데 한 글자를 바꿈(목표 낱말은 오타로 봐주지 않음 — 설계 §8)
 *      C4 아포스트로피 — 모범 답 · 허용 답의 축약형 · 소유격에서 아포스트로피만 뺀 답(점검 2026-09-27). 뺀 꼴이 그 자체로 낱말이거나
 *         (its · were · well · Ill · lets · Id …) 소유격이면(ones · peoples · Buddhas …) '오답'. 다른 낱말이 아닌 축약형(dont · Im …)은
 *         '정답'이 아님(목표형이 아니면 '맞음(오타)', 목표형이면 '오답'). 같은 답을 마이크 답으로 넣으면 맞음(인식기는 아포스트로피를 못 들음).
 *         소유격 's(명사 뒤 — 문항이 is/has 로 풀어 쓴 답을 따로 두지 않은 것)의 아포스트로피만 뺀 타이핑 답에는 채점기의 소유격 힌트가
 *         붙고(정답을 말하지 않음), 축약형의 것 · 마이크 답에는 안 붙음(할 일 9 · 31).
 *      C5 같은 낱말의 다른 꼴 · 비슷한 다른 낱말 — 모범 답의 5글자 이상 낱말을 한 글자 차이인 짝(forget/forgot · broke/broken ·
 *         woman/women · bought/brought · later/latter …, 이 검사의 목록 — 채점기의 목록과 따로 둠)으로 바꾼 답이 '맞음(오타)'가 아님.
 *      C6 소유격 's 를 is 로 — 문항이 풀어 쓰지 않은 명사 's(my brother's · mother's eldest)를 "X is" 로 바꾼 답이 '정답'이 아님
 *         (학습자의 명사 's 만 두 가지로 읽고, 모범 답 · 허용 답의 소유격은 그대로 읽는지 — 할 일 1).
 *   D. 오타 — 목표 · 기능어가 아닌 5글자 이상 낱말의 가운데 한 글자를 바꾼 모범 답이 '맞음(오타)'(너무 엄격하지 않은지).
 *   E. literal 오답 패턴(데이터-형식 v1.2)이 '오답'이고 그 힌트가 붙음 · 보통 오답 패턴의 글이 패턴에 걸림.
 *   F. ③ 형태 찾기: select 정답 토큰(+라벨) → 정답, 하나 빠뜨림 · 엉뚱한 토큰 더함 · 라벨 틀림 → 오답, optional 은 골라도 정답 /
 *      choice 정답 → 정답, 다른 보기 → 오답 / short 정답 → 정답.
 *   M. 마이크 답만(할 일 3 — 타이핑 답은 그대로):
 *      M1 동음 — 모범 답의 낱말 하나를 소리가 같은 낱말(이 검사의 목록: red→read · no→know · new→knew · eight→ate …)로 바꾼 답이
 *         마이크로는 '정답', 타이핑으로는 '정답' 아님.
 *      M2 띄어쓰기 — 모범 답 · 허용 답의 every day ↔ everyday 같은 붙여 쓰기 · 띄어 쓰기(뜻이 바뀌는 낱말 포함)만 다른 답이 마이크로는
 *         '정답', 타이핑으로는 '정답' 아님(뜻이 바뀌는 붙여 쓰기).
 *      M3 띄어쓰기 오답 패턴(everyday)이 있는 문항: 붙여 쓰고 목표형도 뺀 마이크 답 → '오답'이지만 띄어쓰기 힌트는 안 뜸
 *         (학습자가 쓰지 않은 띄어쓰기) · 붙여 쓰기만 한 타이핑 답에는 그 힌트가 뜸.
 *   N. 명사 's(할 일 1 · 10): 허용 답이 명사 's 를 is/has 로 푼 다른 답과 같은 것('우회 허용 답' — Peter's older than John. …)과 목표형의
 *      명사 's 꼴(Mom's · door's been painted …)을 뺀 문항 사본으로 그 답을 채점 → 타이핑 · 마이크 모두 '정답'(채점기가 명사 's 를
 *      is/has 로도 읽는지). N2 절 끝의 "X is" · "X has"(Peter is older than John is.)를 "X's" 로 쓴 답은 '정답' 아님(소유격으로만 읽음).
 *   G. 한글 섞인 답 → 'hangul' · 고정 표본(접두 반의어 예외 interesting · invaluable, 서술형 두 줄 점수, 아포스트로피, 어미, 마이크 숫자,
 *      's = is/has — "She is been" 오답, 같은 낱말의 다른 꼴, 명사 's — Tom's book 정답 · It is Tom is book 오답 · G7 #6 답, 빗금,
 *      마이크 동음 · 띄어쓰기, 소유격 힌트, 마이크 서수 1st~100th).
 *   W. 낱말 꼴(2026-09-28 — 표가 채점기에서 서버로): 모범 답 · 허용 답 낱말(또는 그 끝)이 표의 낱말이고 그 자리에 한 글자 차이인 표의
 *      낱말을 넣을 수 있을 때(학습자가 쓸 수 있는 다른 꼴 — 이 검사의 낱말 자르기 · osa 로 찾음)
 *      W1 그 두 낱말이 화면 문항의 wordForms 에 있음 · wordForms 는 표 안의 낱말만
 *      W2 그런 짝마다 답 하나를 타이핑 · 마이크로 — 화면 문항으로 채점한 결과가 표 전체(ALL_WORD_FORMS — 고치기 전 채점기가 알던 것)를
 *         준 사본으로 채점한 것과 같음.
 *
 *   node docs/pass-off-grammar/검사/check-grading.cjs
 *   node docs/pass-off-grammar/검사/check-grading.cjs --list              따로 센 것 · 실패 전부
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=targets     일부러 깨기: 화면에 넘기는 한 문항에서 targets 묶음 하나를
 *                                                                         지운 사본(메모리) → 레슨 파일로 만든 C3 이 FAIL 이어야
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=targets-all 일부러 깨기: 레슨 파일 사본의 한 문항 targets 를 모두 지움 → A2 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=fix         일부러 깨기: fix.from 에 한 글자 오타 꼴을 넣은 사본 → B FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=accept      일부러 깨기: accept 에 부정 뒤집은 답을 넣은 사본 → C1 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=view        일부러 깨기: 화면 문항에서 accept 를 뺀 사본 → A FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=word-forms  일부러 깨기: 서버가 낱말 꼴을 안 붙인 판(화면 문항 · 고정 표본 모두)
 *                                                                         → C5 · G · W1 · W2 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=word-forms-near 일부러 깨기: passoffWordForms.ts 가 답의 낱말 꼴만 붙이고 한 글자
 *                                                                         차이인 표의 낱말은 안 붙임(메모리 사본 — 답 낱말 자신만 붙이는 판)
 *                                                                         → W1 · W2 · C5 · G FAIL(forget/forgot · bought/brought 같은 것)
 *   아래는 채점기 글(메모리 사본)을 한 곳 바꿔 옛 동작으로 되돌림 — 바꿀 글을 못 찾으면 멈춤(깨기가 조용히 안 먹는 일 없게). 줄 끝은
 *   LF 로 맞춘 뒤 찾음(윈도 체크아웃의 CRLF 에서는 '\n' 이 든 깨기 글을 못 찾아 FAIL 이 아니라 멈춤으로 끝났음 — 2026-09-28 고침):
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=apostrophe  타이핑한 답도 아포스트로피를 모두 지움(점검 전) → C4 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=inflection  같은 낱말의 다른 꼴 · 비슷한 낱말도 한 글자 오타로 봐줌 → C5 FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=is-has      's been 을 has 로 읽지 않음(점검 전: 늘 is) → G FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=ref-reading 허용 답의 's 를 다른 답으로 풀지 않음 → G FAIL("He is gone home")
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=noun-s      학습자의 명사 's 를 is/has 로 읽지 않음(고치기 전) → N · G FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=noun-s-end  절 끝의 명사 's 도 is 로 읽음 → N2 · G FAIL("Yes, Tom's.")
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=slash       빗금을 낱말 경계로 보지 않음(고치기 전) → A3 · G FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=heard-as    마이크 답을 참조 답의 철자로 맞추지 않음(고치기 전) → M · G FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=possessive-hint 소유격 힌트를 붙이지 않음(고치기 전) → C4 · G FAIL
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=ref-noun-s  모범 답 · 허용 답의 명사 's 도 is/has 로 읽음(하면 안 되는 것) → C6 FAIL
 *   이 검사 자신의 깨기:
 *   node docs/pass-off-grammar/검사/check-grading.cjs --break=memo-reason B 까닭을 메모를 뗀 글로만 정함(고치기 전) → B FAIL
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
/** breaks of the grader itself: [the text in passoffGrading.ts, what it becomes] — the old behaviour, in memory only */
const CODE_BREAKS = {
  apostrophe: ['const apostrophes: Apostrophes = spoken ? "drop" : "keep";', 'const apostrophes: Apostrophes = "drop";'],
  inflection: ["  if (differentWord(typed, expected, known)) return false;\n", ""],
  "is-has": ['  if (S_HAS.has(word)) return "has";\n', ""],
  "ref-reading": ["const plain = new Set(asIs.filter((form, i) => form === asHas[i]));", "const plain = new Set<string>();"],
  // 2026-09-28 (작업기록 할 일 1 · 2 · 3 · 9)
  "noun-s": ["const nounMasks = nounReadings(answer);", "const nounMasks = [0];"],
  "noun-s-end": ["    // at a clause's end it is a possessive (\"It's Tom's.\") — \"Yes, Tom is.\" never shortens to \"Yes, Tom's.\"\n    if (!WORD_AFTER.test(rest)) return match;\n", ""],
  slash: ['.replace(/[-‐‑‒–—―/]/g, " ");', '.replace(/[-‐‑‒–—―]/g, " ");'],
  "heard-as": ["const graded = spoken ? heardAs(spokenNumbersAsWords(answer), refs) : answer;", "const graded = spoken ? spokenNumbersAsWords(answer) : answer;"],
  "possessive-hint": ["const possessive = spoken ? null : possessiveSlipIn(graded, refs, models);", "const possessive = null;"],
  "ref-noun-s": [
    '  const asIs = refs.map((r) => normalizeForComparison(r, { s: "is", apostrophes }));\n  const asHas = refs.map((r) => normalizeForComparison(r, { s: "has", apostrophes }));',
    '  const asIs = refs.map((r) => normalizeForComparison(r, { s: "is", apostrophes, nouns: 15 }));\n  const asHas = refs.map((r) => normalizeForComparison(r, { s: "has", apostrophes, nouns: 15 }));',
  ],
};
/** breaks of the server's word forms (src/lib/passoffWordForms.ts): [its text, what it becomes] — in memory only */
const FORMS_BREAKS = {
  "word-forms-near": ["  for (const other of ALL_WORD_FORMS) if (other !== end && Math.abs(other.length - end.length) <= 1 && editDistance(start + other, word) === 1) out.push(other);\n", ""],
};
/** breaks of this check itself (its own old behaviour) */
const CHECK_BREAKS = ["memo-reason"];
const BREAKS = ["targets", "targets-all", "fix", "accept", "view", "word-forms", ...Object.keys(CODE_BREAKS), ...Object.keys(FORMS_BREAKS), ...CHECK_BREAKS];
if (BREAK && !BREAKS.includes(BREAK)) throw new Error(`모르는 --break=${BREAK} (${BREAKS.join(" · ")})`);

/**
 * A source file transpiled on its own. `imports`: what its require() may return — the grader's pure files have none
 * (import-free, 설계 §8 — a type-only import is erased); the server's word forms import the grader and "server-only".
 */
function loadTsAlone(rel, patch = null, imports = null) {
  // line ends as LF: a Windows checkout has CRLF, where a break text with "\n" was never found (the run stopped
  // instead of failing — so --break=inflection · is-has had not been shown to FAIL there)
  let src = fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
  if (patch) {
    if (src.split(patch[0]).length !== 2) throw new Error(`--break=${BREAK}: ${rel} 에서 바꿀 글을 한 곳에서 못 찾음 — 깨기가 안 먹음`);
    src = src.replace(patch[0], patch[1]);
  }
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const req = (spec) => {
    if (imports && Object.prototype.hasOwnProperty.call(imports, spec)) return imports[spec];
    throw new Error(`${rel} 가 ${spec} 를 불러옴 — 이 검사가 모르는 import`);
  };
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  return mod.exports;
}
const G = loadTsAlone("src/lib/passoffGrading.ts", CODE_BREAKS[BREAK] || null);
const { attachPaidItems } = loadTsAlone("src/lib/passoffSupplement.ts");
const { viewBlocks } = loadTsAlone("src/lib/passoffView.ts");
// the server's word forms, graded by the same (possibly broken) grader the page's phone runs
const W = loadTsAlone("src/lib/passoffWordForms.ts", FORMS_BREAKS[BREAK] || null, { "server-only": {}, "./passoffGrading": G });
for (const name of ["gradeProduce", "isCorrect", "gradeSelect", "gradeChoice", "gradeShort", "missingTargets", "typoEligible", "writingIssues", "twoLineScore", "isPrefixedOpposite", "expectedLabel", "normalizeForComparison"]) {
  if (typeof G[name] !== "function") throw new Error(`${name} 를 passoffGrading.ts 에서 못 찾음 — 이 검사가 아무것도 안 봄`);
}
if (typeof G.POSSESSIVE_HINT !== "string" || !G.POSSESSIVE_HINT.includes("소유격")) throw new Error("POSSESSIVE_HINT 를 passoffGrading.ts 에서 못 찾음 — 소유격 힌트 검사가 아무것도 안 봄");
if (typeof viewBlocks !== "function" || typeof attachPaidItems !== "function") throw new Error("viewBlocks · attachPaidItems 를 못 찾음");
if (typeof W.attachWordForms !== "function" || typeof W.wordFormsOf !== "function" || !Array.isArray(W.ALL_WORD_FORMS) || W.ALL_WORD_FORMS.length < 300) {
  throw new Error("attachWordForms · wordFormsOf · ALL_WORD_FORMS 를 passoffWordForms.ts 에서 못 찾음 — 낱말 꼴 검사가 아무것도 안 봄");
}
const ALL_FORMS = new Set(W.ALL_WORD_FORMS);
/** what the server hands out: the view blocks with the word forms (passoffContent.ts) — without them for --break=word-forms */
const served = (blocks) => (BREAK === "word-forms" ? blocks : W.attachWordForms(blocks));
/** a hand-made item as the server would hand it out (G): its word forms attached the same way */
const servedItem = (item) => served([{ type: "drill", produce: [item] }])[0].produce[0];

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
/** optimal-string-alignment distance (a swap of two letters is one) — this check's own, not the grader's */
const osa = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
};
const matchCase = (like, word) => (like[0] === like[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word);
/** C4: a contraction without its apostrophe that is no other word — this check's own list */
const BARE_ONLY = new Set(
  "im ive youre youve youll youd hes shes thats whats theres heres weve theyre theyve theyll theyd itll dont doesnt didnt isnt arent wasnt werent hasnt havent hadnt cant couldnt wouldnt shouldnt mustnt wont".split(" "),
);
/**
 * C5: words a learner writes for one another — forms of one word (irregular verbs · plurals) and look-alike words.
 * Kept here, apart from the grader's own lists, so that a word the grader forgets shows up as a FAIL.
 */
const PARTNER_GROUPS = [
  "forget forgot forgotten", "break broke broken", "speak spoke spoken", "choose chose chosen", "freeze froze frozen",
  "steal stole stolen", "wake woke woken", "take took taken", "give gave given", "drive drove driven", "rise rose risen",
  "write wrote written", "ride rode ridden", "begin began begun", "drink drank drunk", "swim swam swum", "sing sang sung",
  "ring rang rung", "know knew known", "grow grew grown", "throw threw thrown", "blow blew blown", "draw drew drawn",
  "show showed shown", "mean meant", "build built", "spend spent", "send sent", "learn learnt learned", "burn burnt burned",
  "dream dreamt dreamed", "spell spelt", "smell smelt", "arise arose arisen", "lose lost", "leave left",
  "woman women", "man men", "fireman firemen", "policeman policemen", "child children",
  "buy bought", "bring brought", "teach taught", "catch caught", "think thought", "fight fought", "seek sought",
  "better bitter", "later latter", "quiet quite", "lose loose", "desert dessert", "tired tried", "diary dairy",
  "angle angel", "board bored", "price prize", "glass grass", "flight fright", "fresh flesh", "steal steel", "wonder wander",
];
const PARTNERS = new Map();
for (const group of PARTNER_GROUPS) {
  const ws = group.split(" ");
  for (const w of ws) PARTNERS.set(w, [...new Set([...(PARTNERS.get(w) || []), ...ws.filter((x) => x !== w)])]);
}
/**
 * M1: a word of the model answer → words a recogniser may write for it, said the same way — this check's own list,
 * apart from the grader's HEARD_AS, so that a pair the grader forgets shows up as a FAIL. ("red" for the past "read" is
 * the one the task names — pg10-2:p71.)
 */
const HEARD_FOR = {
  read: ["red"], know: ["no"], knew: ["new"], ate: ["eight"], see: ["sea"], seen: ["scene"], meet: ["meat"], buy: ["by", "bye"],
  hear: ["here"], heard: ["herd"], blew: ["blue"], threw: ["through"], thrown: ["throne"], won: ["one"], write: ["right"],
  break: ["brake"], sent: ["cent"], flew: ["flu"], grown: ["groan"], made: ["maid"], rode: ["road"], rose: ["rows"], steal: ["steel"],
  there: ["their"], their: ["there"], to: ["too", "two"], too: ["to"], two: ["to"], your: ["you're"], "you're": ["your"], whose: ["who's"],
};
/** M2: joined words that are another expression split (grammarGrading MEANING_CHANGING_JOINS — this check's own copy), and their halves */
const JOINS = {
  everyday: "every day", maybe: "may be", sometime: "some time", sometimes: "some times", anyone: "any one", anybody: "any body",
  someone: "some one", somebody: "some body", everyone: "every one", everybody: "every body", into: "in to", onto: "on to",
  anyway: "any way", someday: "some day", nobody: "no body", apart: "a part", awhile: "a while", whatever: "what ever",
  whenever: "when ever", however: "how ever", nowhere: "no where", somewhat: "some what",
};
const SPLITS = new Map(Object.entries(JOINS).map(([joined, split]) => [split, joined]));
/** N · C6 · C4: a noun's or name's 's (a pronoun's and let's aside) — this check's own reading, not the grader's */
const PRONOUN_S = new Set("he she it that this there what who where here how when let".split(" "));
const nounSOf = (text) => {
  const out = [];
  String(text).replace(/\b([A-Za-z]+)['’]s\b/g, (m, w, at) => {
    if (!PRONOUN_S.has(w.toLowerCase())) out.push({ at, len: m.length, word: w });
    return m;
  });
  return out;
};
const spellOut = (text, hit, aux) => text.slice(0, hit.at) + `${hit.word} ${aux}` + text.slice(hit.at + hit.len);

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
  L.view = clone(served(viewBlocks(L.file)));
  if (BREAK && ["targets", "view"].includes(BREAK) && !broken) broken = breakView(L);
}
if (CODE_BREAKS[BREAK]) broken = `passoffGrading.ts 의 "${CODE_BREAKS[BREAK][0].trim()}" 을 바꾼 사본(메모리)`;
if (FORMS_BREAKS[BREAK]) broken = `passoffWordForms.ts 의 "${FORMS_BREAKS[BREAK][0].trim()}" 을 지운 사본(메모리)`;
if (BREAK === "word-forms") broken = "화면 문항 · 고정 표본에 낱말 꼴(wordForms)을 붙이지 않음";
if (BREAK === "memo-reason") broken = "이 검사의 B 까닭을 메모를 뗀 글로만 정함(고치기 전 동작)";
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
/**
 * the old ENGLISH sentence of a fix: the "en: … / ko: …" part, or the part of "… / …" without Korean, without "(1과)" ·
 * "(=oldest)" notes (`sentence`) — and that part before its notes were taken off (`withNotes`)
 */
function oldEnglish(from) {
  let s = String(from || "");
  const en = s.match(/(?:^|\/\s*)en:\s*(.*?)(?:\s*\/\s*ko:|$)/);
  if (en) s = en[1];
  else s = s.split(/\s+\/\s+/).find((part) => !hasHangul(part)) || "";
  const withNotes = s.replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\((?:\d+과|= ?\w+|가주어|yes|no)\)\s*/gi, " ").replace(/\s+/g, " ").trim();
  if (!s || hasHangul(s) || !/[A-Za-z]/.test(s) || /^\d+\./.test(s) || /[:;]\s*$/.test(s)) return null;
  // a list of words (단수=복수 : …) or a task ("(인칭대명사에 …)") is not a sentence a learner types
  if (/^[(（]/.test(s) || /\s:\s/.test(s)) return null;
  return { sentence: s, withNotes };
}
const marksOff = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const MARKS_ONLY = "문장부호 · 대소문자만 다름(설계 §8 — 채점에 안 씀)";
/**
 * Why an old textbook sentence is graded right — each is a rule the grader follows on purpose; anything else is a FAIL.
 * `withNotes`: the old text before "(=oldest)" · "(4과)" were taken off — when only taking them off made it the fixed
 * sentence, the reason is the notes, not the marks (pg09-3:p3, 작업기록 할 일 8).
 */
function whyAccepted(old, p, withNotes = old) {
  if (marksOff(old) === marksOff(p.en)) {
    if (BREAK === "memo-reason" || marksOff(withNotes) === marksOff(p.en)) return MARKS_ONLY;
    return "메모만 뗌(교재 글 끝의 '(=oldest)' · '(4과)' 같은 표시를 떼면 고친 글과 같음 — 영어 문장은 그대로)";
  }
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
    // A3 — a dash-separated answer (go - went - gone) written with slashes (작업기록 할 일 2)
    for (const r of refs) {
      if (!/\s[-–—]\s/.test(r)) continue;
      for (const sep of ["/", " / "]) {
        const answer = r.replace(/\s*[-–—]\s*/g, sep);
        count("A3 줄표 대신 빗금(/)으로 나눈 답 → 정답");
        const res = G.gradeProduce(answer, q);
        if (res.verdict !== "correct") fail("A3", `${p.id} "${answer}" → ${res.verdict}(빗금을 낱말 경계로 안 봄 — "${r}" 와 같은 답)`);
      }
    }
    // B
    if (p.fix && p.fix.from && (ENGLISH_FIX.has(p.fix.kind) || /en/.test(String(p.fix.field || "")))) {
      const oldParts = oldEnglish(p.fix.from);
      const old = oldParts && oldParts.sentence;
      if (!old) count("B 영어 문장이 아닌 고침(건너뜀)");
      else {
        const res = G.gradeProduce(old, q);
        if (!G.isCorrect(res)) count("B 원문 오류 문장 → 오답");
        else {
          const why = whyAccepted(old, p, oldParts.withNotes);
          if (!why) fail("B", `${p.id} 교재 원문 "${old}" → ${res.verdict}(오류 문장이 정답 처리됨) · 고친 글 "${p.en}"`);
          else {
            count(`B 따로 셈 · ${why.replace(/\(.*$/, "").trim()}`);
            notes.push(`B ${p.id} [${p.fix.kind}] "${old}" → ${res.verdict} — ${why} · 고친 글 "${p.en}"`);
            // the reason must be true of the old text as the textbook has it: "marks only" is not "notes taken off"
            if (why === MARKS_ONLY && marksOff(oldParts.withNotes) !== marksOff(p.en)) {
              fail("B", `${p.id} 까닭 글이 틀림: 교재 글 "${oldParts.withNotes}" 은 메모를 떼야 고친 글과 같음 — '문장부호 · 대소문자만 다름'이 아님`);
            }
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
    // C4 — one apostrophe left out of a contraction or a possessive, in each reference
    const asTyped = new Set(refs.map((r) => marksOff(r)));
    for (const r of refs) {
      const rt = tokensOf(r);
      rt.forEach((t, i) => {
        const m = t.match(/^([("“]*)([A-Za-z]+)['’]([A-Za-z]+)(.*)$/);
        if (!m) return;
        const without = `${m[2]}${m[3]}`;
        const answer = rt.map((x, k) => (k === i ? `${m[1]}${without}${m[4]}` : x)).join(" ");
        if (asTyped.has(marksOff(answer))) return; // the item lists it as right
        const res = G.gradeProduce(answer, q);
        if (BARE_ONLY.has(without.toLowerCase())) {
          count("C4 아포스트로피만 뺀 축약형(dont · Im …) → 정답 아님");
          if (res.verdict === "correct") fail("C4", `${p.id} "${answer}" → correct(아포스트로피를 뺀 축약형을 깨끗한 정답으로 봄)`);
        } else {
          count("C4 뺀 꼴이 다른 낱말 · 소유격 → 오답");
          if (res.verdict !== "wrong") fail("C4", `${p.id} "${answer}" → ${res.verdict}("${m[2]}'${m[3]}" 대신 다른 낱말 "${without}" — 문법이 틀린 답)`);
        }
        // the possessive hint (할 일 9 · 31): a noun's 's the item does not spell out as is/has is a possessive → the
        // grader's hint; a contraction's apostrophe (its · were · Jills seen for Jill has seen) → no such hint
        const nounS = m[3].toLowerCase() === "s" && !PRONOUN_S.has(m[2].toLowerCase());
        const spelled = ["is", "has"].map((aux) => rt.map((x, k) => (k === i ? `${m[1]}${m[2]} ${aux}${m[4]}` : x)).join(" "));
        if (nounS && !spelled.some((s) => asTyped.has(marksOff(s)))) {
          count("C4 소유격 's 의 아포스트로피만 뺀 타이핑 답 → 소유격 힌트");
          if (!res.possessive || res.possessive.hint !== G.POSSESSIVE_HINT) fail("C4", `${p.id} "${answer}" → ${res.verdict} · 소유격 힌트 없음("${m[2]}'s" 의 아포스트로피만 빠짐)`);
          else if (res.possessive.typed !== without.toLowerCase()) fail("C4", `${p.id} "${answer}" → 소유격 힌트가 다른 낱말을 가리킴("${res.possessive.typed}" — "${without}" 이어야)`);
        } else {
          count("C4 축약형 · 대명사의 아포스트로피를 뺀 답 → 소유격 힌트 없음");
          if (res.possessive) fail("C4", `${p.id} "${answer}" → 소유격 힌트가 붙음("${m[2]}'${m[3]}" 은 소유격이 아님)`);
        }
        count("C4 같은 답을 마이크로 → 맞음");
        const heard = G.gradeProduce(answer, q, { spoken: true });
        if (!G.isCorrect(heard)) fail("C4", `${p.id} 마이크 답 "${answer}" → ${heard.verdict}(인식기는 아포스트로피를 못 들음 — 봐줘야 함)`);
      });
    }
    // C5 — one word of the model answer swapped for another form of it, or a look-alike word, one letter apart
    toks.forEach((t, i) => {
      const word = bare(t);
      if (!/^[A-Za-z]{5,}$/.test(word)) return;
      for (const partner of PARTNERS.get(word.toLowerCase()) || []) {
        if (osa(word.toLowerCase(), partner) !== 1) continue;
        const answer = replaceToken(p.en, i, matchCase(word, partner));
        if (refs.some((r) => G.normalizeForComparison(r) === G.normalizeForComparison(answer))) continue; // the item lists it
        count("C5 같은 낱말의 다른 꼴 · 비슷한 낱말 → 오타 아님");
        const res = G.gradeProduce(answer, q);
        if (G.isCorrect(res)) fail("C5", `${p.id} "${answer}" → ${res.verdict}("${word}" 대신 "${partner}" — 문법이거나 다른 낱말인데 봐줌)`);
      }
    });
    // C6 — a reference's possessive 's (one the item does not spell out as is/has) written "X is" is not right: only the
    // learner's noun 's is read both ways (할 일 1)
    for (const r of refs) {
      for (const hit of nounSOf(r)) {
        if (["is", "has"].some((aux) => asTyped.has(marksOff(spellOut(r, hit, aux))))) continue; // a contraction the item spells out
        const answer = spellOut(r, hit, "is");
        if (refs.some((x) => marksOff(x) === marksOff(answer) || G.normalizeForComparison(x) === G.normalizeForComparison(answer))) continue;
        count("C6 소유격 's 를 is 로 쓴 답 → 정답 아님");
        const res = G.gradeProduce(answer, q);
        if (G.isCorrect(res)) fail("C6", `${p.id} "${answer}" → ${res.verdict}(소유격 "${hit.word}'s" 를 is 로 바꾼 답이 정답)`);
      }
    }
    // N — noun 's (할 일 1 · 10): the accepted answers that are another reference with a noun's 's spelt out (the
    // "detours" lessons added — "Peter's older than John.") and the noun-'s target forms (Mom's · door's been painted)
    // taken off a copy of the item; graded with that copy, each detour answer is right, typed and by microphone
    const detours = (p.accept || []).filter((a) => nounSOf(a).some((hit) => ["is", "has"].some((aux) => asTyped.has(marksOff(spellOut(a, hit, aux))))));
    if (detours.length) {
      const bareItem = clone(q);
      bareItem.accept = (q.accept || []).filter((a) => !detours.includes(a));
      bareItem.targets = (q.targets || []).map((g) => {
        const kept = g.filter((f) => !nounSOf(f).length);
        return kept.length ? kept : g;
      });
      count("N 우회 허용 답이 있는 문항", 1);
      for (const a of detours) {
        count("N 명사 's 우회 답 — 우회 없는 사본에서 타이핑 → 정답");
        const typed = G.gradeProduce(a, bareItem);
        if (typed.verdict !== "correct") fail("N", `${p.id} "${a}" → ${typed.verdict}${typed.missingTargets.length ? ` (목표형 없음 ${JSON.stringify(typed.missingTargets)})` : ""} — 우회 허용 답 없이는 명사 's 를 is/has 로 못 읽음`);
        count("N 명사 's 우회 답 — 우회 없는 사본에서 마이크 → 정답");
        const heard = G.gradeProduce(a, bareItem, { spoken: true });
        if (heard.verdict !== "correct") fail("N", `${p.id} 마이크 "${a}" → ${heard.verdict}${heard.missingTargets.length ? ` (목표형 없음 ${JSON.stringify(heard.missingTargets)})` : ""} — 우회 허용 답 없이는 명사 's 를 is/has 로 못 읽음`);
      }
    }
    // N2 — a clause's last "X is" · "X has" written "X's" is not right: there it is a possessive ("Yes, Tom's." ≠ "Yes, Tom is.")
    for (const r of refs) {
      r.replace(/\b([A-Za-z]+) (is|has)(?=\s*(?:[.,!?;:"”)]|$))/g, (m, w, aux, at) => {
        if (PRONOUN_S.has(w.toLowerCase())) return m;
        const answer = `${r.slice(0, at)}${w}'s${r.slice(at + m.length)}`;
        if (asTyped.has(marksOff(answer))) return m;
        count("N2 절 끝의 is · has 를 's 로 쓴 답 → 정답 아님");
        const res = G.gradeProduce(answer, q);
        if (G.isCorrect(res)) fail("N2", `${p.id} "${answer}" → ${res.verdict}(절 끝의 "${w} ${aux}" 는 's 로 줄지 않음)`);
        return m;
      });
    }
    // M1 — a word of the model answer written as a word said the same way (this check's list): right by microphone
    // (the recogniser's spelling), not when typed (할 일 3)
    toks.forEach((t, i) => {
      const word = bare(t);
      for (const sound of HEARD_FOR[word.toLowerCase()] || []) {
        const answer = replaceToken(p.en, i, matchCase(word, sound));
        count("M1 마이크: 소리가 같은 낱말 → 정답");
        const heard = G.gradeProduce(answer, q, { spoken: true });
        if (!G.isCorrect(heard)) fail("M1", `${p.id} 마이크 "${answer}" → ${heard.verdict}${heard.pattern ? ` · 힌트 "${heard.pattern.match}"` : ""}("${sound}" 는 "${word}" 와 소리가 같음 — 인식기의 철자)`);
        if (refs.some((r) => marksOff(r) === marksOff(answer))) continue; // the item lists it
        // typed as before: never a clean 'correct'; a one-letter slip of a long word stays the old typo rule (herd/heard)
        count("M1 같은 답을 타이핑 → 깨끗한 정답 아님(그대로)");
        const typed = G.gradeProduce(answer, q);
        if (typed.verdict === "correct") fail("M1", `${p.id} 타이핑 "${answer}" → correct(타이핑 답은 소리가 같은 낱말을 봐주지 않음)`);
        else if (typed.verdict === "typo") count("M1 · 그 가운데 타이핑이 한 글자 오타 규칙으로 '맞음(오타)'(전과 같음)");
      }
    });
    // M2 — spacing only (every day ↔ everyday — a meaning-changing join too): right by microphone, not when typed
    const edges = (t) => {
      const b = bare(t);
      const at = t.indexOf(b);
      return [t.slice(0, at), b, t.slice(at + b.length)];
    };
    const spacedAnswers = [];
    for (const r of refs) {
      const rt = tokensOf(r);
      for (let i = 0; i < rt.length; i++) {
        const [lead, word, trail] = edges(rt[i]);
        const split = JOINS[word.toLowerCase()];
        if (split) spacedAnswers.push({ r, answer: [...rt.slice(0, i), `${lead}${matchCase(word, split)}${trail}`, ...rt.slice(i + 1)].join(" "), what: `${word} → ${split}` });
        if (i + 1 < rt.length) {
          const [lead2, word2, trail2] = edges(rt[i + 1]);
          const joined = SPLITS.get(`${word.toLowerCase()} ${word2.toLowerCase()}`);
          if (joined && !trail && !lead2) spacedAnswers.push({ r, answer: [...rt.slice(0, i), `${lead}${matchCase(word, joined)}${trail2}`, ...rt.slice(i + 2)].join(" "), what: `${word} ${word2} → ${joined}` });
        }
      }
    }
    for (const { answer, what } of spacedAnswers) {
      count("M2 마이크: 붙여 쓰기 · 띄어 쓰기만 다름 → 정답");
      const heard = G.gradeProduce(answer, q, { spoken: true });
      if (!G.isCorrect(heard)) fail("M2", `${p.id} 마이크 "${answer}" → ${heard.verdict}${heard.pattern ? ` · 힌트 "${heard.pattern.match}"` : ""}(${what} — 인식기의 띄어쓰기)`);
      if (refs.some((x) => marksOff(x) === marksOff(answer))) continue; // the item lists it
      count("M2 같은 답을 타이핑 → 정답 아님(뜻이 바뀌는 붙여 쓰기)");
      const typed = G.gradeProduce(answer, q);
      if (G.isCorrect(typed)) fail("M2", `${p.id} 타이핑 "${answer}" → ${typed.verdict}(${what} — 타이핑 답은 그대로 틀려야)`);
    }
    // M3 — an error pattern that is a join the model answer writes split ("everyday"): a microphone answer with the join
    // and a target left out is wrong but gets no spacing hint (the learner typed no spacing); the join typed gets it
    for (const e of p.errorPatterns || []) {
      if (e.literal) continue;
      const split = JOINS[marksOff(e.match)];
      if (!split) continue;
      const joined = spacedAnswers.find((s) => s.r === p.en && s.what.toLowerCase().endsWith(`→ ${marksOff(e.match)}`));
      if (!joined) continue;
      count("M3 타이핑: 붙여 쓰기만 → 그 띄어쓰기 힌트");
      const typed = G.gradeProduce(joined.answer, q);
      if (G.isCorrect(typed) || !typed.pattern || typed.pattern.match !== e.match) fail("M3", `${p.id} 타이핑 "${joined.answer}" → ${typed.verdict} · 힌트 ${typed.pattern ? `"${typed.pattern.match}"` : "없음"}("${e.match}" 힌트여야)`);
      const jt = tokensOf(joined.answer);
      const at = jt.findIndex((t) => (p.targets || []).some((g) => g.some((f) => bare(t).toLowerCase() === String(f).toLowerCase())));
      if (at < 0) continue;
      const wrongAnswer = replaceToken(joined.answer, at, "");
      count("M3 마이크: 붙여 쓰기 + 목표형 빠짐 → 오답 · 띄어쓰기 힌트 없음");
      const heard = G.gradeProduce(wrongAnswer, q, { spoken: true });
      if (G.isCorrect(heard)) fail("M3", `${p.id} 마이크 "${wrongAnswer}" → ${heard.verdict}(목표형을 뺀 답이 정답)`);
      else if (heard.pattern && heard.pattern.match === e.match) fail("M3", `${p.id} 마이크 "${wrongAnswer}" → 띄어쓰기 힌트 "${e.match}"(학습자가 쓰지 않은 띄어쓰기)`);
    }
    // D
    const di = toks.findIndex((t, i) => i > 0 && /^[A-Za-z]{5,}$/.test(bare(t)) && G.typoEligible(bare(t), p.targets) && toks.filter((x) => bare(x).toLowerCase() === bare(t).toLowerCase()).length === 1);
    if (di >= 0) {
      const typo = replaceToken(p.en, di, midSwap(bare(toks[di])));
      count("D 오타 한 글자");
      const res = G.gradeProduce(typo, q);
      if (res.verdict !== "typo") fail("D", `${p.id} "${typo}" → ${res.verdict}(한 글자 오타를 봐주지 않음)`);
    }
    // W — the word forms (2026-09-28): an answer word — or its end (overtaken · firemen) — that is a table word, and a table
    // word one letter away put in its place (what a learner may type). W1: both are in the view item's wordForms (this
    // check's own tokens and osa, not the server's). W2: one answer per such pair, graded typed and by microphone with the
    // view item and with a copy that knows the whole table (what the grader knew before the table moved to the server) —
    // the same result.
    const itemForms = new Set(q.wordForms || []);
    for (const f of itemForms) if (!ALL_FORMS.has(f)) fail("W1", `${p.id} wordForms 에 표에 없는 낱말 "${f}"`);
    const pairs = new Map();
    for (const r of refs) {
      tokensOf(r).forEach((t, i) => {
        const word = bare(t);
        if (!/^[A-Za-z]+$/.test(word)) return;
        const lower = word.toLowerCase();
        for (let cut = 0; cut < lower.length; cut++) {
          const end = lower.slice(cut);
          if (!ALL_FORMS.has(end)) continue;
          for (const other of W.ALL_WORD_FORMS) {
            const swapped = lower.slice(0, cut) + other;
            if (osa(swapped, lower) !== 1 || pairs.has(`${lower}>${swapped}`)) continue;
            pairs.set(`${lower}>${swapped}`, { end, other, word, swapped, answer: replaceToken(r, i, matchCase(word, swapped)) });
          }
        }
      });
    }
    const whole = { ...q, wordForms: W.ALL_WORD_FORMS };
    for (const { end, other, word, swapped, answer } of pairs.values()) {
      count("W1 답 낱말(끝) · 한 글자 차이인 표의 낱말이 wordForms 에 있음");
      if (!itemForms.has(end) || !itemForms.has(other)) fail("W1", `${p.id} "${word}" → "${swapped}": wordForms 에 ${[end, other].filter((w) => !itemForms.has(w)).join(" · ")} 없음`);
      for (const spoken of [false, true]) {
        count("W2 그 답 — 표 전체로 채점한 것과 같음(타이핑 · 마이크)");
        const got = G.gradeProduce(answer, q, { spoken });
        const want = G.gradeProduce(answer, whole, { spoken });
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          fail("W2", `${p.id} ${spoken ? "마이크" : "타이핑"} "${answer}" → ${got.verdict}${got.typo ? ` (오타 ${got.typo.typed})` : ""} · 표 전체로는 ${want.verdict}("${word}" 대신 "${swapped}")`);
        }
      }
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
// the hand-made items are handed out as the server would: their word forms attached (servedItem — 2026-09-28)
const gradeServed = (answer, item, options) => G.gradeProduce(answer, servedItem(item), options);
const expect = (label, got, want) => { count("G 고정 표본"); if (JSON.stringify(got) !== JSON.stringify(want)) fail("G", `${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
expect("possible ↔ impossible 은 반대말", G.isPrefixedOpposite("possible", "impossible"), true);
expect("happy ↔ unhappy 은 반대말", G.isPrefixedOpposite("happy", "unhappy"), true);
expect("teresting ↔ interesting 은 반대말 아님(과민 예외)", G.isPrefixedOpposite("teresting", "interesting"), false);
expect("valuable ↔ invaluable 은 반대말 아님(과민 예외)", G.isPrefixedOpposite("valuable", "invaluable"), false);
const sample = { en: "I am eleven years old.", accept: ["I'm eleven years old."], targets: [["am", "'m"]], errorPatterns: [] };
const graded = ["I am eleven years old.", "i am eleven years old.", "I am eleven years old", "I am elevan years old.", "I is eleven years old."].map((a) => ({ answer: a, result: gradeServed(a, sample) }));
expect("서술형 두 줄 점수", G.twoLineScore(graded), { total: 5, grammar: 4, written: 1, capital: 1, punctuation: 1, spelling: 1 });
// apostrophes (점검 2026-09-27 · 설계 §8): a slip only in a contraction that is no other word and is not the target
expect("목표형 'm 을 아포스트로피 없이(Im) → 오답(목표 낱말은 엄격)", gradeServed("Im eleven years old.", sample).verdict, "wrong");
expect("목표가 아닌 축약형의 아포스트로피를 뺌(dont) → 오타(철자)", gradeServed("I dont know what he said.", { en: "I don't know what he said.", targets: [["what"]] }).verdict, "typo");
const were = { en: "We're good friends.", accept: ["We are good friends."], targets: [["are", "'re"]] };
expect("We're → Were(다른 낱말) → 오답", gradeServed("Were good friends.", were).verdict, "wrong");
const itsDog = { en: "It's a dog and its hair is gray.", accept: ["It is a dog and its hair is gray."], targets: [["It's", "It is"], ["its"]] };
expect("It's → Its → 오답", gradeServed("Its a dog and its hair is gray.", itsDog).verdict, "wrong");
expect("마이크 답의 its(인식기가 쓴 철자) → 오타로 봐줌", gradeServed("its a dog and its hair is gray", itsDog, { spoken: true }).verdict, "typo");
expect("소유격 one's → ones → 오답", gradeServed("One should obey ones parents.", { en: "One should obey one's parents." }).verdict, "wrong");
expect("its ≠ it's(아포스트로피를 더한 것은 봐주지 않음)", G.isCorrect(gradeServed("It's tail is long.", { en: "Its tail is long." })), false);
expect("walk ↔ walks 는 오타가 아님(어미)", gradeServed("He walk to school.", { en: "He walks to school." }).verdict, "wrong");
// two forms of one word · two look-alike words are never a one-letter typo
expect("forget → forgot 는 오타가 아님", gradeServed("Don't forgot it.", { en: "Don't forget it." }).verdict, "wrong");
expect("bought → brought 는 오타가 아님", gradeServed("He brought the book.", { en: "He bought the book." }).verdict, "wrong");
expect("woman → women 은 오타가 아님", gradeServed("The women was his wife.", { en: "The woman was his wife." }).verdict, "wrong");
expect("later → latter 는 오타가 아님", gradeServed("Two months latter, it was gone.", { en: "Two months later, it was gone." }).verdict, "wrong");
expect("그래도 진짜 한 글자 오타는 봐줌(Englisj)", gradeServed("He studies Englisj every morning.", { en: "He studies English every morning." }).verdict, "typo");
// 's = is or has (점검 2026-09-27)
const been = { en: "She has been to Paris.", accept: ["She's been to Paris."] };
expect("She is been → 오답('s been = has been)", gradeServed("She is been to Paris.", been).verdict, "wrong");
expect("She's been → 정답(허용 답 없이도)", gradeServed("She's been to Paris.", { en: "She has been to Paris." }).verdict, "correct");
expect("모범 답이 She's been 뿐이어도 She is been → 오답", gradeServed("She is been to Paris.", { en: "She's been to Paris." }).verdict, "wrong");
expect("모범 답이 She's been 뿐이어도 She has been → 정답", gradeServed("She has been to Paris.", { en: "She's been to Paris." }).verdict, "correct");
const gone = { en: "He has gone home.", accept: ["He's gone home."] };
expect("He is gone home → 오답(허용 답의 's 는 모범 답대로 has)", gradeServed("He is gone home.", gone).verdict, "wrong");
expect("He's gone home → 정답", gradeServed("He's gone home.", gone).verdict, "correct");
expect("It's made of wood → 정답(is + 분사)", gradeServed("It's made of wood.", { en: "It is made of wood." }).verdict, "correct");
expect("모범 답이 It's made 뿐이어도 It is made → 정답", gradeServed("It is made of wood.", { en: "It's made of wood." }).verdict, "correct");
expect("She is tired → 정답(모범 답 She's tired)", gradeServed("She is tired today.", { en: "She's tired today." }).verdict, "correct");
expect("Where's he gone → 정답(Where has he gone)", gradeServed("Where's he gone?", { en: "Where has he gone?" }).verdict, "correct");
expect("마이크 답의 숫자(11 = eleven)", gradeServed("I am 11 years old", { ...sample, accept: [] }, { spoken: true }).verdict, "correct");
expect("타이핑한 숫자는 그대로(11 ≠ eleven)", gradeServed("I am 11 years old", { ...sample, accept: [] }).verdict, "wrong");
// microphone ordinals (2026-09-28 — made from the cardinal words by rule, no list): the recogniser's "12th" is "twelfth"
const suffixOf = (n) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
for (const [n, word] of [[1, "first"], [2, "second"], [3, "third"], [4, "fourth"], [5, "fifth"], [8, "eighth"], [9, "ninth"], [11, "eleventh"], [12, "twelfth"], [19, "nineteenth"], [20, "twentieth"], [21, "twenty-first"], [40, "fortieth"], [52, "fifty-second"], [99, "ninety-ninth"], [100, "one hundredth"]]) {
  expect(`마이크 서수 ${n}${suffixOf(n)} = ${word}`, gradeServed(`It is the ${n}${suffixOf(n)} day`, { en: `It is the ${word} day.` }, { spoken: true }).verdict, "correct");
}
expect("마이크 서수 12th ≠ eleventh", gradeServed("It is the 12th day", { en: "It is the eleventh day." }, { spoken: true }).verdict, "wrong");
// a noun's 's (작업기록 할 일 1 — 2026-09-28): the learner's is read both ways, a reference's possessive as written
const tomBeen = { en: "Tom has been here.", targets: [["has"]] };
expect("Tom's been here → 정답(Tom has been here)", gradeServed("Tom's been here.", tomBeen).verdict, "correct");
expect("마이크 Tom's been here → 정답", gradeServed("Tom's been here", tomBeen, { spoken: true }).verdict, "correct");
expect("Tom is been here → 오답('s been = has been)", gradeServed("Tom is been here.", tomBeen).verdict, "wrong");
const tomBook = { en: "Tom's book is red." };
expect("Tom's book is red → 정답(소유격 그대로)", gradeServed("Tom's book is red.", tomBook).verdict, "correct");
expect("Toms book is red → 타이핑 오답(그대로)", gradeServed("Toms book is red.", tomBook).verdict, "wrong");
expect("마이크 Toms book is red → 정답(그대로)", gradeServed("Toms book is red", tomBook, { spoken: true }).verdict, "correct");
expect("It is Tom is book → 오답(모범 답의 소유격은 is 가 아님)", gradeServed("It is Tom is book.", { en: "It is Tom's book." }).verdict, "wrong");
expect("Yes, Tom's. → 오답(절 끝의 's 는 소유격 — Yes, Tom is.)", gradeServed("Yes, Tom's.", { en: "Yes, Tom is." }).verdict, "wrong");
/** the item the page receives, and the same item without its detour accepts and noun-'s target forms (N) */
const viewItem = (id) => {
  for (const L of lessons) for (const b of L.view) for (const list of ["produce", "transfer"]) for (const it of b[list] || []) if (it.id === id) return it;
  return null;
};
const withoutDetours = (it) => {
  const keys = new Set([it.en, ...(it.accept || [])].map(marksOff));
  const detour = (a) => nounSOf(a).some((hit) => ["is", "has"].some((aux) => keys.has(marksOff(spellOut(a, hit, aux)))));
  return {
    ...it,
    accept: (it.accept || []).filter((a) => !detour(a)),
    targets: (it.targets || []).map((g) => (g.filter((f) => !nounSOf(f).length).length ? g.filter((f) => !nounSOf(f).length) : g)),
  };
};
// G7 첫 점검 #6 and the answers the task names, on the lesson's item without its detour accepts
for (const [id, a] of [
  ["pg09-2:p1", "Peter's older than John."],
  ["pg09-2:p4", "Rachael's more beautiful than Leah."],
  ["pg09-1:p5", "Danny's a young, tall, interesting person."],
  ["pg09-2:p7", "My room's smaller than my brother's room."],
  ["pg09-4:p11", "Claudia's at school and her mom wants to see her teacher at the school."],
  ["pg09-4:p9", "Your sweater's the same colour as mine."],
  ["pg10-1:p3", "Mom's in the garage."],
  ["pg12-1:p6", "Jill's seen a rainbow."],
  ["pg14-2:p11", "The door's been painted."],
  ["pg12-3:p1", "Bob's working this week."],
  ["pg12-4:p9", "The road's being repaired now."],
  ["pg12-4:t1", "Professor McCarthy's going to give a difficult examination."],
  ["pg15-1:p3", 'Tom said, "Jim\'s sick."'],
]) {
  const it = viewItem(id);
  if (!it) {
    fail("G", `${id} 문항을 못 찾음 — 고정 표본이 아무것도 안 봄`);
    continue;
  }
  const bareItem = withoutDetours(it);
  expect(`${id} "${a}" 타이핑(우회 허용 답 없이) → 정답`, gradeServed(a, bareItem).verdict, "correct");
  expect(`${id} "${a}" 마이크(우회 허용 답 없이) → 정답`, gradeServed(a, bareItem, { spoken: true }).verdict, "correct");
}
expect("pg09-2:p1 Peter is older than John's → 오답(절 끝)", G.isCorrect(gradeServed("Peter is older than John's.", viewItem("pg09-2:p1") || { en: "x" })), false);
// a slash is a word break (할 일 2)
const goItem = viewItem("pg10-2:p41") || { en: "go - went - gone", targets: [["went"], ["gone"]] };
expect("pg10-2:p41 go/went/gone → 정답", gradeServed("go/went/gone", goItem).verdict, "correct");
expect("pg10-2:p41 go / went / gone → 정답", gradeServed("go / went / gone", goItem).verdict, "correct");
expect("pg10-2:p41 go/went/goed → 오답", gradeServed("go/went/goed", goItem).verdict, "wrong");
// microphone: words said the same way · spacing (할 일 3) — typed answers as before
const readItem = viewItem("pg10-2:p71") || { en: "read - read - read", targets: [["read"]], errorPatterns: [{ match: "red", hint: "x" }] };
expect("pg10-2:p71 마이크 read red red → 정답", gradeServed("read red red", readItem, { spoken: true }).verdict, "correct");
expect("pg10-2:p71 타이핑 read red red → 오답 + red 힌트(그대로)", ((r) => [r.verdict, r.pattern && r.pattern.match])(gradeServed("read red red", readItem)), ["wrong", "red"]);
expect("pg10-2:p71 마이크 read reed reed → 오답(reed 는 목록에 없음)", gradeServed("read reed reed", readItem, { spoken: true }).verdict, "wrong");
const walkItem = viewItem("pg11-2:p4") || { en: "She walks to school with my brother every day.", targets: [["walks"]] };
expect("pg11-2:p4 마이크 …brother everyday → 정답", gradeServed("She walks to school with my brother everyday", walkItem, { spoken: true }).verdict, "correct");
expect("pg11-2:p4 타이핑 …brother everyday. → 오답 + everyday 힌트(그대로)", ((r) => [r.verdict, r.pattern && r.pattern.match])(gradeServed("She walks to school with my brother everyday.", walkItem)), ["wrong", "everyday"]);
expect("pg11-2:p4 마이크 She walk to … everyday → 오답, 힌트는 She walk to", ((r) => [r.verdict, r.pattern && r.pattern.match])(gradeServed("She walk to school with my brother everyday", walkItem, { spoken: true })), ["wrong", "She walk to"]);
expect("pg11-2:p5 마이크 …an hour everyday → 정답", gradeServed("Nick reads the Bible for an hour everyday", viewItem("pg11-2:p5") || walkItem, { spoken: true }).verdict, "correct");
// the possessive hint (할 일 9 · 31)
const roomItem = viewItem("pg09-2:p7") || { en: "My room is smaller than my brother's." };
expect("pg09-2:p7 My room is smaller than my brothers. → 오답 + 소유격 힌트", ((r) => [r.verdict, r.possessive && r.possessive.hint])(gradeServed("My room is smaller than my brothers.", roomItem)), ["wrong", G.POSSESSIVE_HINT]);
expect("pg09-2:p7 마이크 my room is smaller than my brothers → 정답 · 힌트 없음", ((r) => [r.verdict, r.possessive])(gradeServed("my room is smaller than my brothers", roomItem, { spoken: true })), ["correct", null]);
expect("소유격 힌트는 정답 낱말(…'s)을 말하지 않음", /[A-Za-z]['’]s\b/.test(G.POSSESSIVE_HINT), false);
expect("Its a dog … → 소유격 힌트 없음(it's 는 축약형)", gradeServed("Its a dog and its hair is gray.", itsDog).possessive, null);
expect("It's tail is long → 소유격 힌트 없음(아포스트로피를 더함)", gradeServed("It's tail is long.", { en: "Its tail is long." }).possessive, null);

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
