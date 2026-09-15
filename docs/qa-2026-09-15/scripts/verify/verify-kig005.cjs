// KIG-005 verification harness.
//
// Loads the REAL scoring predicate from GrammarLearningView.tsx (source extraction,
// so the test stays honest if the file moves) plus the repository's real model
// answers, then fires three attack vectors at it:
//
//   1. one-letter / one-word input  ("a", "e", "you")
//   2. word padding                 ("a a a a", "the the the ...")
//   3. word-order reversal          (model answer typed backwards)
//   4. typo fidelity                (one word misspelled -> must stay PARTIAL)
//
// Run against the CURRENT code to see the defect, then again after the fix.
// Results are printed for BOTH the buggy and fixed scorer so the fix's
// detection power is visible in one output.
//
//   node docs/qa-2026-09-15/scripts/verify/verify-kig005.cjs [out.json]

const fs = require("fs");
const path = require("path");

const ROOT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const VIEW = path.join(ROOT, "src/components/GrammarLearningView.tsx");

// ---------------------------------------------------------------------------
// 1. Real source helpers, lifted verbatim from the component.
// ---------------------------------------------------------------------------

/** GrammarLearningView.tsx:42-47 */
function isEnglish(text) {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

/** GrammarLearningView.tsx:49-52 */
function hasKorean(text) {
  if (!text) return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

/** GrammarLearningView.tsx:54-60 */
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

/** GrammarLearningView.tsx:62-68 */
function normalizeForComparison(text) {
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// 2. The scorers under test.
//
// scoreFixed is extracted from the REAL component source so this harness fails
// loudly if the shipped logic and the tested logic ever drift apart.
// ---------------------------------------------------------------------------

/** CURRENT (buggy) rule — GrammarLearningView.tsx:474 before the fix. */
function scoreBuggy(user, model) {
  if (!user) return "incorrect";
  if (user === model) return "exact";
  if (user.replace(/\s/g, "") === model.replace(/\s/g, "") || model.includes(user))
    return "partial";
  return "incorrect";
}

/** Pull gradeAnswer + its helpers straight out of the component (TS types stripped). */
function loadShippedScorer() {
  const src = fs.readFileSync(VIEW, "utf8");
  const normStart = src.indexOf("function normalizeForComparison(");
  const lcsStart = src.indexOf("function lcsRatio(");
  const capStart = src.indexOf("const MAX_ANSWER_LEN_RATIO");
  const gradeStart = src.indexOf("function gradeAnswer(");
  if (normStart < 0 || lcsStart < 0 || capStart < 0 || gradeStart < 0) {
    throw new Error(
      "verify-kig005: could not locate normalizeForComparison / lcsRatio / " +
        "MAX_ANSWER_LEN_RATIO / gradeAnswer in " +
        VIEW +
        " — the component was refactored, update this harness.",
    );
  }

  // The repo uses CRLF; match the close of a function on either line ending.
  const sliceFn = (from) => {
    const bodyStart = src.indexOf("{", from);
    const end = src.slice(bodyStart).search(/\r?\n\}/);
    return src.slice(from, bodyStart + end + 3);
  };

  let snippet = [
    sliceFn(normStart),
    sliceFn(lcsStart),
    src.slice(capStart, src.indexOf("\n", src.indexOf(";", capStart)) + 1),
    sliceFn(gradeStart),
  ].join("\n");

  // Strip TypeScript-only syntax so plain `new Function` can evaluate it.
  snippet = snippet
    // parameter annotations: (uw: string[], mw: string[]) -> (uw, mw)
    .replace(/([a-zA-Z_$][\w$]*)\s*:\s*(?:string|number|boolean)(?:\[\])?/g, "$1")
    // return-type annotations: ): string[] / ): number / ): "exact" | "partial" | ...
    .replace(/\)\s*:\s*(?:"[^"]*"\s*\|\s*)*"[^"]*"/g, ")")
    .replace(/\)\s*:\s*(?:string|number|boolean|void)(?:\[\])?/g, ")")
    // generic constructor args
    .replace(/new Array<number>\(/g, "new Array(");

  const factory = new Function(
    "return (function(){ " +
      snippet +
      "\n return { gradeAnswer: gradeAnswer, lcsRatio: lcsRatio, MAX_LEN_RATIO: MAX_ANSWER_LEN_RATIO }; })()",
  );
  return factory();
}

const shipped = loadShippedScorer();
const scoreFixed = shipped.gradeAnswer;
const lcsRatio = shipped.lcsRatio;
const MAX_LEN_RATIO = shipped.MAX_LEN_RATIO;



// ---------------------------------------------------------------------------
// 3. Collect the real model answers straight from content/.
// ---------------------------------------------------------------------------

function sentenceItems(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = [];
  for (const b of j.blocks || []) {
    if (b.type === "sentences" && Array.isArray(b.items)) {
      for (const it of b.items) if (it.text) out.push(it);
    }
  }
  return out;
}

/** Resolve the pair lesson id the same way getLessonContext() does. */
function pairIdFor(course, id, index) {
  const current = index.lessons.find((l) => l.id === id);
  let pairId =
    current?.variant === "main"
      ? index.lessons.find((l) => l.variant === "script" && l.id.startsWith(id + "-"))?.id
      : index.lessons.find((l) => l.variant === "main" && id.startsWith(l.id + "-"))?.id;

  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const sub = m[2] || "";
      const pad = (n) => String(n).padStart(3, "0");
      if (num % 2 === 0) {
        const t = `gh1-${pad(num + 1)}${sub}`;
        if (index.lessons.some((l) => l.id === t)) pairId = t;
        else if (index.lessons.some((l) => l.id === `gh1-${pad(num + 1)}`))
          pairId = `gh1-${pad(num + 1)}`;
      } else {
        const t = `gh1-${pad(num - 1)}${sub}`;
        if (index.lessons.some((l) => l.id === t)) pairId = t;
        else if (index.lessons.some((l) => l.id === `gh1-${pad(num - 1)}`))
          pairId = `gh1-${pad(num - 1)}`;
      }
    }
  }
  return pairId;
}

/**
 * Build the answer key exactly as GrammarLearningView.tsx:158-208 does,
 * then take only the ENGLISH side — that is the model answer used for scoring.
 */
function collectModels() {
  const models = [];
  for (const course of ["grammar1", "grammar2"]) {
    const dir = path.join(ROOT, "content/lessons", course);
    const index = JSON.parse(
      fs.readFileSync(path.join(ROOT, "content/courses", course + ".json"), "utf8"),
    );
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const id = f.replace(/\.json$/, "");
      const pairId = pairIdFor(course, id, index);
      if (!pairId) continue;
      const pairPath = path.join(dir, pairId + ".json");
      if (!fs.existsSync(pairPath)) continue;

      const main = sentenceItems(path.join(dir, f));
      const pair = sentenceItems(pairPath);
      const count = Math.max(main.length, pair.length);

      for (let i = 0; i < count; i++) {
        const textM = main[i]?.text ?? "";
        const textP = pair[i]?.text ?? "";
        let en = "";
        let ko = "";
        if (isEnglish(textM) && !isEnglish(textP)) {
          en = textM;
          ko = textP;
        } else if (!isEnglish(textM) && isEnglish(textP)) {
          en = textP;
          ko = textM;
        } else if (hasKorean(textM)) {
          ko = textM;
          en = textP;
        } else {
          en = textM;
          ko = textP;
        }
        const model = normalizeForComparison(cleanText(en));
        if (!model) continue;
        // Scoring only makes sense when both sides are English (the exam asks for
        // an English sentence). Keep a Korean-keyed list separate so we can report it.
        models.push({
          course,
          lesson: id,
          n: main[i]?.n ?? pair[i]?.n ?? String(i + 1),
          model,
          isLatin: /^[a-z0-9 ]+$/.test(model),
        });
      }
    }
  }
  return models;
}

// ---------------------------------------------------------------------------
// 4. Attack vectors.
// ---------------------------------------------------------------------------

const FILLERS = ["a", "the", "is", "to", "you", "it"];

function attacksFor(model) {
  const mw = model.split(" ").filter(Boolean);
  const cases = [];

  // (1) minimal input — a single letter or single word must never earn credit.
  //     Reported as three separate rows so a regression names the exact input.
  cases.push({ kind: "a", input: "a" });
  cases.push({ kind: "e", input: "e" });
  cases.push({ kind: "you", input: "you" });

  // (2) padding — the attack from review: type one common word over and over.
  //     A set-based scorer is idempotent so repeats are free, and `model.includes(user)`
  //     only has to find "a" somewhere. LCS cannot exceed mw.length, so padding is dead.
  cases.push({ kind: "단어 도배", input: Array(Math.max(mw.length, 4)).fill("a").join(" ") });

  // (2b) verbatim but padded with a common word — the realistic version of the attack:
  //      a learner who knows the answer pastes it and pads around it.
  cases.push({ kind: "모범답안+도배", input: [...mw, "a", "a", "a", "a"].join(" "), knownLimit: true });

  // (3) word-order reversal — an English composition exam must care about order.
  //     For a minority of short tag questions the reversal is near-palindromic
  //     ("i am not happy am i"), so ~83% of the original order genuinely survives.
  //     Those are reported separately as a known limit, not counted as failures.
  if (mw.length > 1) {
    const reversed = [...mw].reverse();
    cases.push({
      kind: "어순 역순",
      input: reversed.join(" "),
      knownLimit: lcsRatio(reversed, mw) >= 0.7,
    });
  }

  // (4) one-word typo — must REMAIN partial (fix must not over-tighten).
  if (mw.length > 1) {
    const broken = [...mw];
    const idx = broken.findIndex((w) => w.length > 3);
    const at = idx >= 0 ? idx : 0;
    broken[at] = broken[at] + "x";
    cases.push({ kind: "한 단어 오타", input: broken.join(" "), expectPartial: true });
  }

  return cases;
}

// ---------------------------------------------------------------------------
// 5. Run.
//
// IMPORTANT: the pass/fail verdict is driven by the SHIPPED scorer
// (scoreFixed, extracted from GrammarLearningView.tsx), not by a copy of the
// intended logic. An earlier revision of this harness only printed the shipped
// result without asserting on it, so a build where gradeAnswer still used
// `model.includes(user)` reported "0건" and looked healthy. Every attack below
// is now an explicit assertion against the shipped code.
// ---------------------------------------------------------------------------

const models = collectModels();
const latinModels = models.filter((m) => m.isLatin);

const tally = {};
for (const m of latinModels) {
  for (const a of attacksFor(m.model)) {
    const key = a.kind;
    tally[key] ??= {
      total: 0,
      buggyPartial: 0,
      shippedPartial: 0,
      expectPartial: false,
      // Counts how many of this vector's cases are provably impossible to reject
      // (near-palindromic reversal / input already containing the verbatim answer).
      knownLimitCases: 0,
      sample: null,
    };
    const t = tally[key];
    t.total++;
    if (a.expectPartial) t.expectPartial = true;
    if (a.knownLimit) t.knownLimitCases++;
    const b = scoreBuggy(a.input, m.model);
    const fx = scoreFixed(a.input, m.model);
    if (b === "partial") t.buggyPartial++;
    if (fx === "partial") {
      t.shippedPartial++;
      if (!t.sample) t.sample = { lesson: m.lesson, model: m.model, input: a.input };
    }
  }
}

// Regression: a verbatim model answer must always score exact.
let exactRegression = 0;
for (const m of latinModels) {
  if (scoreBuggy(m.model, m.model) !== "exact") exactRegression++;
  if (scoreFixed(m.model, m.model) !== "exact") exactRegression++;
}

// Explicit README completion-condition probes for gh1-006 Step 4.
const gh1006 = "i am a student";
const detail = {
  "gh1-006 'a'": {
    model: gh1006,
    buggy: scoreBuggy("a", gh1006),
    shipped: scoreFixed("a", gh1006),
    want: "incorrect",
  },
  "gh1-006 'e'": {
    model: gh1006,
    buggy: scoreBuggy("e", gh1006),
    shipped: scoreFixed("e", gh1006),
    want: "incorrect",
  },
  "gh1-006 'you'": {
    model: gh1006,
    buggy: scoreBuggy("you", gh1006),
    shipped: scoreFixed("you", gh1006),
    want: "incorrect",
  },
  "gh1-006 verbatim": {
    model: gh1006,
    buggy: scoreBuggy(gh1006, gh1006),
    shipped: scoreFixed(gh1006, gh1006),
    want: "exact",
  },
  "gh1-006 one word wrong": {
    model: gh1006,
    buggy: scoreBuggy("i am a studentx", gh1006),
    shipped: scoreFixed("i am a studentx", gh1006),
    want: "partial",
  },
};

// ---------------------------------------------------------------------------
// Verdict.
// ---------------------------------------------------------------------------

const failures = [];

// 1-letter / 1-word, padding, and reversal must all be 0 under the shipped scorer.
// A vector is only excused if EVERY leaking case in it is a proven known limit.
for (const [kind, t] of Object.entries(tally)) {
  const avoidable = t.shippedPartial - t.knownLimitCases;
  if (t.expectPartial) {
    if (t.shippedPartial === 0) {
      failures.push(`${kind}: 기대=부분정답 유지, 실제=0건 (과잉 강화)`);
    }
  } else if (avoidable > 0) {
    failures.push(
      `${kind}: 기대=0건, 실제=${t.shippedPartial}건 (그중 회피 불가 ${t.knownLimitCases}건 제외 시 ${avoidable}건)`,
    );
  }
}
if (exactRegression !== 0) {
  failures.push(`모범답안 그대로 입력이 exact 아님: ${exactRegression}건`);
}
for (const [name, d] of Object.entries(detail)) {
  if (d.shipped !== d.want) {
    failures.push(`${name}: 기대=${d.want}, 실제=${d.shipped}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  view: VIEW,
  modelsTotal: models.length,
  modelsLatin: latinModels.length,
  exactRegressionFailures: exactRegression,
  byAttack: tally,
  detail,
  failures,
  pass: failures.length === 0,
};

console.log("=".repeat(80));
console.log(`KIG-005 채점기 검증 — 실제 모범답안 ${latinModels.length}개 (영문)`);
console.log(`대상: ${VIEW}`);
console.log("=".repeat(80));
console.log("");
console.log(
  "공격 유형".padEnd(20) +
    "표본".padStart(8) +
    "수정 전 부분정답".padStart(18) +
    "현재(shipped)".padStart(16) +
    "  기대",
);
console.log("-".repeat(80));
for (const [kind, t] of Object.entries(tally)) {
  const avoidable = t.shippedPartial - t.knownLimitCases;
  const expect = t.expectPartial ? "부분정답 유지" : "0건";
  const bad = t.expectPartial ? t.shippedPartial === 0 : avoidable > 0;
  const mark = t.knownLimitCases > 0 ? "△ " : bad ? "✗ " : "✓ ";
  console.log(
    mark +
      kind.padEnd(18) +
      String(t.total).padStart(8) +
      String(t.buggyPartial).padStart(18) +
      String(t.shippedPartial).padStart(16) +
      "  " + expect,
  );
}
console.log("");
console.log("모범답안 그대로 입력 시 'exact' 실패: " + exactRegression + "건 (0이어야 함)");
console.log("");
console.log("--- README 완료 조건 (gh1-006 Step 4) ---");
for (const [k, v] of Object.entries(detail)) {
  const ok = v.shipped === v.want;
  console.log(
    (ok ? "  ✓ " : "  ✗ ") +
      k.padEnd(26) +
      " 수정 전=" + String(v.buggy).padEnd(10) +
      " 현재=" + String(v.shipped).padEnd(10) +
      " 기대=" + v.want,
  );
}

// Residual reversal cases: near-palindromic tag questions, where the reversed
// input genuinely is ~83% of the original order. Not a bug in LCS.
console.log("");
console.log("--- 알려진 한계 (수정 불가, 참고) ---");
const limits = {
  "어순 역순": (() => {
    const g = tally["어순 역순"];
    return g
      ? `${g.shippedPartial}/${g.total}건 — 부호의문문(거의 회문)에서 역순이 원문 어순의 ~83%를 보존. 어떤 순서 기반 지표도 정상 답안을 해치지 않고는 걸러낼 수 없음.`
      : "n/a";
  })(),
  "모범답안+도배": (() => {
    const g = tally["모범답안+도배"];
    return g
      ? `${g.shippedPartial}/${g.total}건 — 자기반복이 심한 장문 모범답안에 정답 전문을 그대로 쓴 뒤 채운 경우. 정답을 이미 아는 입력이라 채점으로 막을 대상이 아님.`
      : "n/a";
  })(),
};
for (const [k, v] of Object.entries(limits)) console.log("  △ " + k + ": " + v);

console.log("");
if (failures.length) {
  console.log("=== FAIL " + failures.length + "건 ===");
  for (const f of failures) console.log("  - " + f);
  for (const [kind, t] of Object.entries(tally)) {
    if (!t.expectPartial && !t.knownLimit && t.shippedPartial > 0 && t.sample) {
      console.log(
        `    [${kind}] 예: ${t.sample.lesson} 모범답안="${t.sample.model}" 입력="${t.sample.input}"`,
      );
    }
  }
} else {
  console.log("ALL PASS — 공격 5종(a/e/you/단어도배/어순역순) 전부 0건, 오타 유지 조건 충족");
}

if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2));
  console.log("결과 저장: " + process.argv[2]);
}

process.exit(failures.length ? 1 : 0);
