#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 레슨 연습 상태(src/lib/passoffLesson.ts) — 답한 순간 남긴 결과를 새로 고친 뒤 이어 가는지 (코드 단계 B 점검 반영 7).
 *
 * 점검 2026-09-27: ④ 에서 '정답 보기' 뒤(또는 틀린 뒤) 새로 고치면 같은 문장이 새 카드로 나와, 방금 본 답이 '첫 시도 정답'이 되고
 * 다시 나오지 않았다(설계 §3 ④ '세트의 모든 문장을 스스로 맞혀야 끝' 우회). ③ 도 같았다. 이제 화면은 첫 시도의 결과(open)와 받은 도움(help)을
 * 답한 순간 남기고, 레슨을 다시 열면 settleOpen 이 '다음' 을 누른 것처럼 넘긴다. 이 검사는 그 순수 함수를 사본 상태에 돌려 본다:
 *   S1 ④ 첫 시도 틀림(open missed) → 다시 열면 다시 나옴(requeues 1) · 4문장 뒤로(남은 문장이 적으면 맨 뒤)
 *   S2 ④ 첫 시도 맞음(open right) → 다시 열면 끝남(done) · 줄에서 빠짐
 *   S3 ④ 세 번 다시 나온 뒤 또 틀림 → '내일 1순위'(tomorrow) · 줄에서 빠짐
 *   S4 ⑤ 처음 보는 문장도 같은 규칙(transferQueue)
 *   S5 ③ 첫 시도 틀림 → 끝에서 한 번 더(requeued) · 두 번째 판에서 틀려도 끝남
 *   S6 저장된 모양 검사(sanitizeWork): open · help 는 아는 값만 남고, 옛 저장(두 칸 없음)은 null · "none"
 *   S7 넘길 것이 없으면 아무것도 안 바꿈(false)
 *
 *   node docs/pass-off-grammar/검사/check-lesson-state.cjs
 *   node docs/pass-off-grammar/검사/check-lesson-state.cjs --break=settle   일부러 깨기: settleOpen 이 아무것도 안 함(점검 전) → FAIL
 * exit 1 on any failure. 같은 AI 계열이 만든 검사 — 독립 검수가 아니다.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "settle") throw new Error(`모르는 --break=${BREAK} (settle)`);

let src = fs.readFileSync(path.join(REPO, "src/lib/passoffLesson.ts"), "utf8");
if (BREAK === "settle") {
  const from = "export function settleOpen(w: PassoffWork, lists: { forms: readonly string[]; composeSet: readonly string[]; transfers: readonly string[] }): boolean {\n";
  if (src.split(from).length !== 2) throw new Error("--break=settle: settleOpen 을 못 찾음 — 깨기가 안 먹음");
  src = src.replace(from, `${from}  if (w) return false;\n`);
}
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
// type-only imports are erased: the file stands alone
new Function("module", "exports", js)(mod, mod.exports);
const L = mod.exports;
for (const name of ["emptyWork", "sanitizeWork", "settleOpen", "composeItemDone", "formItemDone", "queueOf", "newComposeState", "newFormState"]) {
  if (typeof L[name] !== "function") throw new Error(`${name} 를 passoffLesson.ts 에서 못 찾음 — 이 검사가 아무것도 안 봄`);
}

const fails = [];
let checks = 0;
const expect = (label, got, want) => {
  checks++;
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
};
const SET = ["p1", "p2", "p3", "p4", "p5", "p6"];
const TRANSFERS = ["t1", "t2"];
const FORMS = ["s1", "s2", "s3"];
const lists = { forms: FORMS, composeSet: SET, transfers: TRANSFERS };
const withCompose = (id, patch, queue = SET) => {
  const w = L.emptyWork();
  w.composeQueue = [...queue];
  w.compose[id] = { ...L.newComposeState(), ...patch };
  return w;
};

// S1
{
  const w = withCompose("p1", { open: "missed", help: "reveal", first: { answer: "I lives in Seoul", verdict: "wrong", reference: "I live in Seoul." } });
  expect("S1 반환", L.settleOpen(w, lists), true);
  expect("S1 다시 나옴(requeues)", w.compose.p1.requeues, 1);
  expect("S1 끝나지 않음", w.compose.p1.done, false);
  expect("S1 4문장 뒤", w.composeQueue, ["p2", "p3", "p4", "p5", "p1", "p6"]);
  expect("S1 넘긴 뒤 open 비움", w.compose.p1.open, null);
  expect("S1 받은 도움은 남음", w.compose.p1.help, "reveal");
  expect("S1 첫 시도 답은 남음(세트 두 줄 점수)", w.compose.p1.first.verdict, "wrong");
  const short = withCompose("p5", { open: "missed" }, ["p5", "p6"]);
  L.settleOpen(short, lists);
  expect("S1 남은 문장이 적으면 맨 뒤", short.composeQueue, ["p6", "p5"]);
}
// S2
{
  const w = withCompose("p1", { open: "right" });
  L.settleOpen(w, lists);
  expect("S2 끝남", w.compose.p1.done, true);
  expect("S2 줄에서 빠짐", w.composeQueue, ["p2", "p3", "p4", "p5", "p6"]);
}
// S3
{
  const w = withCompose("p2", { open: "missed", requeues: 3 }, ["p2", "p3"]);
  L.settleOpen(w, lists);
  expect("S3 내일 1순위", [w.compose.p2.done, w.compose.p2.tomorrow], [true, true]);
  expect("S3 줄에서 빠짐", w.composeQueue, ["p3"]);
}
// S4
{
  const w = L.emptyWork();
  w.transferQueue = ["t1", "t2"];
  w.compose.t1 = { ...L.newComposeState(), open: "missed" };
  L.settleOpen(w, lists);
  expect("S4 ⑤ 다시 나옴", [w.compose.t1.requeues, w.transferQueue], [1, ["t2", "t1"]]);
  expect("S4 ④ 줄은 그대로", w.composeQueue, null);
}
// S5
{
  const w = L.emptyWork();
  w.form.s1 = { ...L.newFormState(), open: "missed", help: "reveal" };
  L.settleOpen(w, lists);
  expect("S5 끝에서 한 번 더", [w.form.s1.requeued, w.form.s1.done, w.formQueue], [true, false, ["s2", "s3", "s1"]]);
  w.form.s1.open = "missed";
  L.settleOpen(w, lists);
  expect("S5 두 번째 판은 틀려도 끝남", [w.form.s1.done, w.formQueue], [true, ["s2", "s3"]]);
  const right = L.emptyWork();
  right.form.s2 = { ...L.newFormState(), open: "right" };
  L.settleOpen(right, lists);
  expect("S5 첫 시도 맞음 → 끝남", [right.form.s2.done, right.form.s2.requeued, right.formQueue], [true, false, ["s1", "s3"]]);
}
// S6
{
  const ids = { anchors: [], forms: FORMS, compose: [...SET, ...TRANSFERS] };
  const raw = {
    v: 1,
    form: { s1: { done: false, requeued: false, open: "missed", help: "reveal" }, s2: { done: false, open: "bogus", help: "hint" } },
    compose: {
      p1: { done: false, requeues: 1, tomorrow: false, first: null, open: "right", help: "tiles" },
      p2: { done: false, requeues: 0, tomorrow: false, first: null },
      p3: { open: 7, help: "everything" },
    },
  };
  const w = L.sanitizeWork(raw, ids);
  expect("S6 ③ 아는 값", [w.form.s1.open, w.form.s1.help], ["missed", "reveal"]);
  expect("S6 ③ 모르는 값", [w.form.s2.open, w.form.s2.help], [null, "none"]);
  expect("S6 ④ 아는 값", [w.compose.p1.open, w.compose.p1.help], ["right", "tiles"]);
  expect("S6 옛 저장(두 칸 없음)", [w.compose.p2.open, w.compose.p2.help], [null, "none"]);
  expect("S6 ④ 모르는 값", [w.compose.p3.open, w.compose.p3.help], [null, "none"]);
}
// S7
{
  const w = withCompose("p1", {});
  const before = JSON.stringify(w);
  expect("S7 넘길 것 없음 → false", L.settleOpen(w, lists), false);
  expect("S7 그대로", JSON.stringify(w) === before, true);
}

console.log(`check-lesson-state — ${checks}칸${BREAK ? ` (깨기 --break=${BREAK})` : ""}`);
if (fails.length) {
  console.log(`\nFAIL ${fails.length}:`);
  for (const f of fails) console.log(`  ${f}`);
  if (BREAK) console.log(`\n(깨기 --break=${BREAK}: FAIL 이 나야 맞음 — 검사가 실패할 수 있음을 보임)`);
  process.exit(1);
}
console.log("PASS");
