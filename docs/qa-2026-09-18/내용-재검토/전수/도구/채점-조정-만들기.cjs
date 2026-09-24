#!/usr/bin/env node
/**
 * 결정 A 조정(이 세션, 2026-09-25 02:1x) — 채점/조정.json 을 만든다. 규칙은 기록.md '결정 A 조정' 과 같음:
 *  ① 판단 필요 1(소유자 '추천대로') 범위 밖 — 날씨 · 때를 비인칭 it 으로 가르치는 강의에서 'the weather'(한국어에 '날씨' 없음) · 'Was yesterday …?' 꼴 의문문 → 뺌.
 *     (같은 꼴을 01 · 12 확인 일꾼은 뒤집고 10 · 14 확인 일꾼은 동의 — 소유자 결정 하나로 맞춤. 'Yesterday was …' 평서문은 결정대로 둠.)
 *  ② 그 문항이 가르치는 꼴을 피한 영작 → 뺌(A 기준 '만들지 말 것' — 일꾼 · 확인 일꾼이 갈린 것만 이 세션이 정함):
 *     4형식(동사 + 사람 + 물건)을 가르치는 문항의 to/for 꼴(gh2-019 · 021 · 022 · 025#6) · gh2-025 #3 ~ #5 'have … off' 의 take … off ·
 *     gh2-016 #7 ~ #10 then 묶음의 at that time · gh2-045 #9 관계부사 why 자리의 'the reason that' · gh2-050 #9 'suggestion that he 원형' 의 to 부정사.
 *     (May → Can/Could 는 'have … off' 를 지키고 두 일꾼이 70점 막힘에 동의 — 둠.)
 *  ③ 안 적음을 확인 일꾼이 '틀림으로'(대기 6) — ② 에 걸리는 둘(gh2-021 #16 · gh2-025 #5)은 뺌, 넷은 표에 올림.
 *  ④ R: 놓침 92 — 이 세션이 한국어 · 참조 · 답을 읽고 앱 채점 함수로 점수를 다시 잼(92/92 같은 점수) → ② 에 걸리는 것만 뺌, 나머지 표에 올림.
 *  ⑤ 넣으면 틀린 답이 점수를 받는 것(도구/채점-코드흠-재기.cjs 로 잼): "He's got …" 셋은 뺌('He is got' 이 만점이 됨 — 'He has got' 은 둠) ·
 *     반대말 접두어(inexpensive · impossible · inappropriate · improper) 일곱은 두되 '채점 코드 흠 ② 를 먼저 고칠 것' 을 까닭에.
 *   node 채점-조정-만들기.cjs   → 채점/조정.json (그다음 node 채점-합치기.cjs --strict)
 */
const fs = require("fs");
const path = require("path");
const C = path.resolve(__dirname, "../채점");
const J = JSON.parse(fs.readFileSync(path.join(C, "판정.json"), "utf8"));
const adj = { _설명: "결정 A 조정(이 세션 2026-09-25 02:1x) — 규칙은 도구/채점-조정-만들기.cjs 머리 · 기록.md '결정 A 조정'" };
const R1 = "판단 필요 1(소유자 2026-09-24 21:2x '추천대로')의 범위 밖 — 이 강의는 날씨 · 때를 비인칭 it 으로 가르침: 'the weather' 는 한국어에 '날씨' 가 있을 때만 · 'Was yesterday …?' 꼴 의문문은 영어로 어색해 더하지 않음(같은 꼴을 01 · 12 확인 일꾼은 뒤집고 10 · 14 는 동의 — 소유자 결정 하나로 맞춤)";
const R2 = (what) => `그 문항이 가르치는 꼴을 피한 영작(A 기준 '만들지 말 것' — 일꾼이 갈린 것을 이 세션이 정함): ${what}`;
for (const k of ["grammar1/gh1-062#11:0", "grammar1/gh1-062#19:1", "grammar1/gh1-062#20:1", "grammar1/gh1-088#11:0", "grammar1/gh1-088#19:1", "grammar1/gh1-090#20:1", "grammar1/gh1-062#19:0", "grammar1/gh1-062#20:0", "grammar1/gh1-088#11:1", "grammar1/gh1-088#19:0", "grammar1/gh1-090#20:0"]) adj[`B:${k}`] = { 결론: "표에서 뺌", 까닭: R1 };
// ⑤ 넣으면 틀린 답이 점수를 받는 것(도구/채점-코드흠-재기.cjs 로 잼) — 채점 코드 흠 ① 's got · ② 반대말 접두어
const SG = "넣으면 채점 코드 흠 ①(he's 를 he is 로만 폄) 때문에 틀린 영어 'He is got …' 이 만점이 됨(재어 봄) — 'He has got …' 만 넣고, He's got 은 채점 코드에서 's got → has got 으로 풀게 고칠 것";
for (const k of ["grammar1/gh1-010#7:1", "grammar1/gh1-054#7:0", "grammar1/gh1-054#7:1"]) adj[`B:${k}`] = { 결론: "표에서 뺌", 까닭: SG };
const AP = "주의 — 채점 코드 흠 ②(반대말 접두어 im- · in- 를 철자 실수로 봄): 이 다른 정답을 넣기 전에 채점 코드를 고칠 것. 안 고치고 넣으면 뜻이 반대인 답(expensive · appropriate · possible)이 0점에서 70점이 됨(재어 봄)";
for (const k of ["grammar1/gh1-056#3:0", "grammar1/gh1-056#5:0", "grammar1/gh1-100#115:0", "grammar1/gh1-100#115:1", "grammar1/gh1-106#26:0", "grammar1/gh1-106#26:1", "grammar1/gh1-106#26:2"]) adj[`B:${k}`] = { 결론: "표에 올림", 까닭: AP };
adj["B:grammar2/gh2-022#5:4"] = { 결론: "표에서 뺌", 까닭: R2("gh2-022 는 4형식(owe me · do me a favor · buy him …)을 가르침 — 'do a favor for me' 는 3형식으로 피함(gh2-019 · 021 일꾼이 같은 꼴을 안 적음으로 둔 것과 맞춤)") };
adj["B:grammar2/gh2-022#15:3"] = { 결론: "표에서 뺌", 까닭: R2("gh2-022 4형식 'buy him a pair of shoes' 를 'buy … for him' 3형식으로 피함") };
// ③ 안 적음 → 확인 '틀림으로'
const sKeys = [];
for (const f of fs.readdirSync(C).filter((f) => /^확인-\d+\.json$/.test(f))) {
  const V = JSON.parse(fs.readFileSync(path.join(C, f), "utf8"));
  for (const r of V.결과) if (r.key.startsWith("S:") && r.결론 === "틀림으로") sKeys.push(r.key);
}
for (const k of sKeys) {
  if (k.startsWith("S:grammar2/gh2-021#16:")) adj[k] = { 결론: "표에서 뺌", 까닭: R2("gh2-021 은 give · lend · make 의 4형식을 가르침 — 'make a new dress for you' 는 3형식으로 피함(잰 일꾼의 안 적음이 맞음)") };
  else if (k.startsWith("S:grammar2/gh2-025#5:")) adj[k] = { 결론: "표에서 뺌", 까닭: R2("gh2-025 #3 ~ #5 는 'have … off' 를 가르침 — take … off 는 그 꼴을 피함(잰 일꾼의 안 적음이 맞음)") };
  else adj[k] = { 결론: "표에 올림", 까닭: "확인 일꾼 '틀림으로' 에 이 세션이 동의 — 맞는 영어 · 한국어 뜻 그대로 · 강의 꼴 지킴 · 점수는 앱 채점 함수로 다시 잼" + (k.startsWith("S:grammar1/gh1-010#40:") ? " · 같은 까닭으로 #41 'Didn't you have dreams?' · #42 'Didn't he have dreams?' 도 0점(확인 일꾼이 잼) — 같이 넣을 것" : "") };
}
// ④ R: 놓침
const drop = [
  [/^grammar2\/gh2-016#7$/, /\bat (that|the) time\b/i, "gh2-016 #7 ~ #10 은 then 의 쓰임을 가르치는 묶음 — at that time · at the time 은 then 을 피함(Back then 은 둠)"],
  [/^grammar2\/gh2-021#12$/, /\bto you\b/i, "gh2-021 은 4형식 make + 사람 + 물건을 가르침((make) 안내 · 다른 정답 I owe you an apology 도 4형식) — 'make an apology to you' 는 피함"],
  [/^grammar2\/gh2-025#[345]$/, /\btake\b/i, "gh2-025 #3 ~ #5 는 'have … off' 를 가르침 — take … off 는 그 꼴을 피함"],
  [/^grammar2\/gh2-025#6$/, /\bfor me\b/i, "'do me a favor' 4형식 — 'do a favor for me' 는 피함(gh2-022 #5 와 같게)"],
  [/^grammar2\/gh2-045#9$/, /reason that/i, "gh2-045 는 관계부사를 가르침 — 'the reason that' 은 why 를 피함('the reason why' 는 둠)"],
  [/^grammar2\/gh2-050#9$/, /suggestion to/i, "gh2-050 #9 는 'suggestion that he + 원형'(가정법 현재)을 가르침 — to 부정사는 그 꼴을 피함"],
];
let up = 0, down = 0;
for (const m of J.놓침) {
  const k = `M:${m.id}:${m.답}`;
  const d = drop.find(([idRe, aRe]) => idRe.test(m.id) && aRe.test(m.답));
  if (d) { adj[k] = { 결론: "표에서 뺌", 까닭: R2(d[2]) }; down++; }
  else { adj[k] = { 결론: "표에 올림", 까닭: "확인 일꾼이 판정을 가린 채 재어 찾은 막힘 — 이 세션이 한국어 · 참조 · 답을 읽고 앱 채점 함수로 다시 잼(같은 점수): 맞는 영어 · 한국어 뜻 그대로 · 강의 꼴 지킴" }; up++; }
}
fs.writeFileSync(path.join(C, "조정.json"), JSON.stringify(adj, null, 1));
console.log(JSON.stringify({ 조정키: Object.keys(adj).length - 1, 날씨뺌: 11, 형식뺌_B: 2, 안적음_틀림으로: sKeys.length, 안적음_올림: sKeys.filter((k) => adj[k].결론 === "표에 올림").length, 놓침_올림: up, 놓침_뺌: down }, null, 1));
