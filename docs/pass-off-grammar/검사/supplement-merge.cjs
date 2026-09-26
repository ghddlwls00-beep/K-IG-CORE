#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 무료 체험 보충 — 떼고 다시 붙인 순서 시험 (설계 §7, 점검 2026-09-27).
 *
 * scripts/buildPassoffIndex.mjs 와 같은 흐름을 src/lib/passoffSupplement.ts 의 함수 그대로 돌린다:
 *   레슨 파일 → splitPaidItems → mergePaidEntries(보관된 것, 새로 뗀 것, 무료로 남은 id) → attachPaidItems(무료 블록, 보충)
 * 그리고 이용권이 보는 순서(붙인 뒤)가 기대한 순서인지 본다.
 *
 * 점검이 찾은 경우: 보충에 p1 · p2 · p3(유료), 레슨에 p4 · p5(무료). 내용 세션이 p2 하나만 고치려고 레슨 파일에
 * paidStudent: true 로 다시 넣으면, 옛 합치기는 p2 를 "떼어 낸 뒤의 파일" 기준 자리(맨 앞)로 보충 끝에 붙여서
 * 이용권 화면이 p2 p1 p4 p3 p5 가 됐다(기대 p1 p2 p3 p4 p5).
 *
 *   node docs/pass-off-grammar/검사/supplement-merge.cjs
 *   node docs/pass-off-grammar/검사/supplement-merge.cjs --break=old-merge   일부러 깨기: 옛 합치기(메모리) → 부분 갱신 칸이 FAIL 이어야
 * exit 1 on any failure.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "old-merge") throw new Error(`모르는 --break=${BREAK}`);

const js = ts.transpileModule(fs.readFileSync(path.join(REPO, "src/lib/passoffSupplement.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const { splitPaidItems, attachPaidItems, itemIdsOf } = mod.exports;
let { mergePaidEntries } = mod.exports;
for (const [name, fn] of Object.entries({ splitPaidItems, attachPaidItems, itemIdsOf, mergePaidEntries })) {
  if (typeof fn !== "function") throw new Error(`${name} 를 passoffSupplement.ts 에서 못 찾음 — 이 시험이 아무것도 안 봄`);
}
if (BREAK === "old-merge") {
  // 4bc17f3 의 합치기 그대로: 같은 id 는 보관된 것을 빼고 새 항목(새로 잰 자리)을 끝에 붙임
  mergePaidEntries = (stored, fresh, freeIds) => {
    const freshIds = new Set(fresh.map((e) => e.item.id));
    return [...stored.filter((e) => !freshIds.has(e.item.id) && !freeIds.has(e.item.id)), ...fresh];
  };
}

// ── 한 번 빌드하는 흐름(buildPassoffIndex.mjs 1단계와 같음)
function build(fileBlocks, stored) {
  const { blocks, entries } = splitPaidItems(fileBlocks);
  const supplement = mergePaidEntries(stored, entries, itemIdsOf(blocks));
  return { free: blocks, supplement, licensed: attachPaidItems(blocks, supplement) };
}
const it = (id, paid = false, v = 1) => ({ id, en: `${id} v${v}`, ...(paid ? { paidStudent: true } : {}) });
const drill = (produce, extra = {}) => [{ type: "anchors", items: extra.anchors || [] }, { type: "drill", produce, transfer: extra.transfer || [] }];
const order = (blocks, list = "produce", type = "drill") => ((blocks.find((b) => b.type === type) || {})[list] || []).map((x) => `${x.id}${x.en.endsWith("v2") ? "'" : ""}`).join(" ");
// 처음 빌드: 전체 파일(p1 p2 p3 유료 + p4 p5 무료)을 뗀다
const first = build(drill([it("p1", true), it("p2", true), it("p3", true), it("p4"), it("p5")]), []);

const cases = [];
const check = (name, got, want) => cases.push({ name, ok: got === want, got, want });

check("처음 빌드 — 무료 파일", order(first.free), "p4 p5");
check("처음 빌드 — 이용권 화면", order(first.licensed), "p1 p2 p3 p4 p5");

// A. 부분 갱신: p2 하나만 고쳐 다시 넣음(떼어 낸 뒤 파일의 맨 앞에)
{
  const r = build(drill([it("p2", true, 2), it("p4"), it("p5")]), first.supplement);
  check("A. p2 만 다시 넣음(맨 앞) — 이용권 화면", order(r.licensed), "p1 p2' p3 p4 p5");
  check("A. p2 만 다시 넣음 — 무료 파일", order(r.free), "p4 p5");
}
// A2. 부분 갱신: p2 를 무료 문항 사이에 다시 넣음 — 그래도 보관된 자리
{
  const r = build(drill([it("p4"), it("p2", true, 2), it("p5")]), first.supplement);
  check("A2. p2 만 다시 넣음(p4 뒤) — 이용권 화면", order(r.licensed), "p1 p2' p3 p4 p5");
}
// B. 전부 다시 넣음(03:23 의 실제 갱신과 같은 꼴)
{
  const r = build(drill([it("p1", true, 2), it("p2", true, 2), it("p3", true, 2), it("p4"), it("p5")]), first.supplement);
  check("B. 셋 다 다시 넣음 — 이용권 화면", order(r.licensed), "p1' p2' p3' p4 p5");
}
// C. 보충에 없던 새 유료 문항 q 를 p4 와 p5 사이에
{
  const r = build(drill([it("p4"), it("q", true), it("p5")]), first.supplement);
  check("C. 새 유료 문항 q(p4 뒤) — 이용권 화면", order(r.licensed), "p1 p2 p3 p4 q p5");
}
// D. p3 을 무료로 되돌림(paidStudent 없이 레슨 파일 맨 앞에) — 보충에서 빠지고 파일 자리대로
{
  const r = build(drill([it("p3", false, 2), it("p4"), it("p5")]), first.supplement);
  check("D. p3 무료로 되돌림 — 보충 문항 수", String(r.supplement.length), "2");
  check("D. p3 무료로 되돌림 — 이용권 화면", order(r.licensed), "p1 p2 p3' p4 p5");
}
// E. 두 목록(① 예문 · ④ 영작)에 보관된 문항 — 예문 하나만 다시 넣어도 ④ 는 그대로
{
  const full = drill([it("p1", true), it("p2", true), it("p4")], { anchors: [it("a1", true), it("a2", true), it("a3")] });
  const f = build(full, []);
  const r = build(drill([it("p4")], { anchors: [it("a2", true, 2), it("a3")] }), f.supplement);
  check("E. 예문 a2 만 다시 넣음 — ① 순서", order(r.licensed, "items", "anchors"), "a1 a2' a3");
  check("E. 예문 a2 만 다시 넣음 — ④ 순서", order(r.licensed), "p1 p2 p4");
}
// F. 다른 목록으로 옮긴 문항은 새 자리(④ → ⑤). (그 뒤에 있던 p3 은 앞 문항을 잃어 보관된 번호 자리로 간다 —
//    attachPaidItems 의 원래 규칙. 목록을 옮기는 일은 드물어 순서까지는 보지 않음)
{
  const r = build(drill([it("p4"), it("p5")], { transfer: [it("p2", true, 2)] }), first.supplement);
  check("F. p2 를 ⑤ 로 옮김 — ④ 에 p2 가 없음", order(r.licensed).split(" ").includes("p2") || order(r.licensed).split(" ").includes("p2'") ? "있음" : "없음", "없음");
  check("F. p2 를 ⑤ 로 옮김 — ⑤ 순서", order(r.licensed, "transfer"), "p2'");
}
// G. 떼고 붙이면 글자까지 같음(왕복)
{
  const full = drill([it("p1", true), it("p4"), it("p2", true), it("p5"), it("p3", true)], { anchors: [it("a1"), it("a2", true)] });
  const f = build(full, []);
  check("G. 왕복(떼고 붙임) — 글자까지 같음", JSON.stringify(f.licensed) === JSON.stringify(full) ? "같음" : "다름", "같음");
}

console.log(`보충 떼기 · 다시 붙이기 순서 시험 — ${cases.length}칸${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
for (const c of cases) console.log(`  ${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.got}${c.ok ? "" : ` (기대 ${c.want})`}`);
const fails = cases.filter((c) => !c.ok).length;
console.log(`${fails ? "FAIL" : "PASS"} — 틀린 칸 ${fails}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
process.exit(fails ? 1 : 0);
