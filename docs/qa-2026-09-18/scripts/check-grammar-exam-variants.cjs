#!/usr/bin/env node
/**
 * GRAMMAR '종합 평가' — 소유자 결정(2026-09-24)이 실제 화면에서 되는가. check-grammar-exam.cjs 와 같은 입력 · 읽기 방식으로
 * 강의마다 짧은 be 동사 문항 넷을 골라 넣고 [전체 시험 채점하기]:
 *   뜻 반대(be 동사 뒤 not)          → ✕ 오답(0점)
 *   뜻 반대(be 동사를 n't 로)        → ✕ 오답(0점)
 *   작은 낱말 하나 더(be 동사 뒤 a)   → △ 부분 정답(70점)
 *   모범 답안 그대로                 → ✓ 정답(100점)
 * 2026-09-24 7단계 배포 재점검에서 운영 gh1-006 4/4 기대대로(점검 세션). 이용권 프로필 사본 · 그 강의의 시험 답안 localStorage 만 바뀜
 * (logDataChange 로 남김 — 강의 화면의 ↺ 전체 초기화 로 지워짐).
 *
 *   node check-grammar-exam-variants.cjs [--course grammar1] [--ids gh1-006,gh1-010] [--port 9703] [--clone exam-variants] [--mode prefix]
 * exit 0 = 모두 기대대로.
 *
 * --mode prefix(최종 관문 2026-09-25 — 관문 15 채점 흠 ② '뜻이 반대면 0점' 고침이 운영에서 되는가): 강의마다 모범 답안의 낱말 하나를
 *   반대말 접두어 꼴로(happy → unhappy · expensive → inexpensive · …) 바꾼 답 셋까지 → ✕ 오답(0점), 'Unless …' 다른 정답이 있는 문항은
 *   'if … not' 의 not 을 뺀 답(모범이 Unless 면 If 로) → ✕ 오답(0점), 그리고 모범 답안 하나 → ✓ 정답. 고치기 전 채점기면 접두어 답이 △ 70점.
 */
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const COURSE = arg("--course", "grammar1");
const IDS = arg("--ids", "gh1-006").split(",").filter(Boolean);
const PORT = Number(arg("--port", 9703));
const FILL = (pairs) => `(() => { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; const pairs = ${JSON.stringify(pairs)}; let filled = 0, missing = []; for (const [label, value] of pairs) { const el = document.querySelector('input[aria-label=' + JSON.stringify(label + '번 시험 답안') + ']'); if (!el) { missing.push(label); continue; } set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); filled++; } return { filled, missing }; })()`;
const READ = `(() => { const out = []; for (const row of document.querySelectorAll('main div')) { const q = row.querySelector(':scope > div > div > span.font-mono'); if (!q || !/^Q.+\\.$/.test((q.innerText || '').trim())) continue; const badge = row.querySelector(':scope > div > div > span[class*="rounded-md"]'); const input = row.querySelector('input[aria-label$="번 시험 답안"]'); if (!input) continue; out.push({ n: (q.innerText || '').trim().replace(/^Q|\\.$/g, ''), verdict: badge ? (badge.innerText || '').trim() : null, typed: input.value }); } return out; })()`;
const AUX = /^(am|is|are|was|were)$/i;
const words = (a) => a.text.replace(/[.?!]$/, "").split(/\s+/);
const end = (a) => (a.text.match(/[.?!]$/) || ["."])[0];
const neg1 = (a) => { const w = words(a); return [w[0], w[1], "not", ...w.slice(2)].join(" ") + end(a); };
const neg2 = (a) => { const w = words(a); return [w[0], `${w[1]}n't`, ...w.slice(2)].join(" ").replace(/\bamn't\b/i, "am not") + end(a); };
const extraA = (a) => { const w = words(a); return [w[0], w[1], "a", ...w.slice(2)].join(" ") + end(a); };
const MODE = arg("--mode", "be");
const CLONE = arg("--clone", "exam-variants");
// 형용사 · 동사의 진짜 반대말 짝만(접두어 규칙은 grammarGrading OPPOSITE_PREFIXES — dis · non · im · in · il · ir · un)
const PAIRS = { happy: "unhappy", expensive: "inexpensive", healthy: "unhealthy", interesting: "uninteresting", comfortable: "uncomfortable", possible: "impossible", honest: "dishonest", polite: "impolite", kind: "unkind", safe: "unsafe", like: "dislike", lucky: "unlucky", necessary: "unnecessary", usual: "unusual", friendly: "unfriendly", important: "unimportant", correct: "incorrect", legal: "illegal", regular: "irregular", agree: "disagree" };
function prefixPlan(exp) {
  const plan = [];
  for (const a of exp.answers) {
    if (plan.length >= 3) break;
    for (const [w, opp] of Object.entries(PAIRS)) {
      const re = new RegExp(`\\b${w}\\b`, "i");
      if (!re.test(a.text)) continue;
      plan.push({ a, typed: a.text.replace(re, (m) => (m[0] === m[0].toUpperCase() ? opp[0].toUpperCase() + opp.slice(1) : opp)), want: /오답/, label: `반대말 접두어(${w} → ${opp})` });
      break;
    }
  }
  for (const a of exp.answers) {
    if (!(a.alternatives || []).some((x) => /^Unless\b/i.test(x)) || plan.some((p) => p.a === a)) continue;
    const typed = /^Unless\b/i.test(a.text) ? a.text.replace(/^Unless\b/i, "If") : a.text.replace(/\b(do|does|did)n't\s+|\bnot\s+/i, "");
    if (typed !== a.text) plan.push({ a, typed, want: /오답/, label: "unless(if … not) 의 not 뺌" });
  }
  const ctl = exp.answers.find((a) => !plan.some((p) => p.a === a));
  if (ctl) plan.push({ a: ctl, typed: ctl.text, want: /✓\s*정답/, label: "모범 답안" });
  return plan;
}

(async () => {
  const browser = await H.startBrowser(CLONE, PORT);
  let bad = 0, done = 0;
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    for (const id of IDS) {
      const exp = E.expected(COURSE, id);
      let plan;
      if (MODE === "prefix") {
        plan = prefixPlan(exp);
        if (plan.filter((p) => /오답/.test(String(p.want))).length === 0) { console.log(`- ${id}: 반대말 짝 · unless 문항 없음 — 건너뜀`); continue; }
      } else {
        const simple = exp.answers.filter((a) => { const w = words(a); return w.length <= 5 && w.findIndex((x) => AUX.test(x)) === 1 && !/n't|\bnot\b/i.test(a.text); });
        if (simple.length < 4) { console.log(`- ${id}: 짧은 be 동사 문항이 ${simple.length}개뿐 — 건너뜀`); continue; }
        const [a1, a2, a3, a4] = simple;
        plan = [
          { a: a1, typed: neg1(a1), want: /오답/, label: "뜻 반대(not)" },
          { a: a2, typed: neg2(a2), want: /오답/, label: "뜻 반대(n't)" },
          { a: a3, typed: extraA(a3), want: /부분/, label: "작은 낱말 하나 더" },
          { a: a4, typed: a4.text, want: /✓\s*정답/, label: "모범 답안" },
        ];
      }
      const loaded = await H.load(tab, `/${COURSE}/${id}`, { marker: H.MARKERS[COURSE] });
      if (!loaded.rendered) { console.log(`✗ ${id} 페이지가 뜨지 않음`); bad++; continue; }
      const mode = await H.click(tab, `[...document.querySelectorAll('main button, nav button')].find((b) => /종합 평가/.test(b.innerText || ''))`, { settle: 700 });
      if (!mode.ok) { console.log(`✗ ${id} 종합 평가를 열 수 없음: ${mode.reason}`); bad++; continue; }
      await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /답안 다시 수정하기/.test(b.innerText || ''))`, { settle: 400 }).catch(() => {});
      await tab.eval(FILL(plan.map((p) => [String(p.a.n), p.typed])));
      const submit = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || ''))`, { settle: 900 });
      if (!submit.ok) { console.log(`✗ ${id} 채점 버튼: ${submit.reason}`); bad++; continue; }
      const rows = (await tab.eval(READ)) || [];
      for (const p of plan) {
        const r = rows.find((x) => String(x.n) === String(p.a.n));
        const ok = r && r.verdict && p.want.test(r.verdict);
        if (!ok) bad++;
        console.log(`${ok ? "기대대로" : "✗"} ${id} Q${p.a.n} ${p.label}: 모범 "${p.a.text}" · 넣은 답 "${p.typed}" → ${r ? r.verdict : "(칸 없음)"}`);
      }
      done++;
      H.logDataChange({ what: "GRAMMAR 모의 시험 답안 · 채점 상태", where: `${COURSE}/${id} localStorage`, why: "소유자 결정(뜻 반대 0점 · 작은 낱말 70점 · 모범 100점)을 실제 화면에서", reversible: "강의 화면의 ↺ 전체 초기화 로 지워짐" });
    }
    await tab.close();
  } finally { browser.proc.kill(); }
  console.log(`강의 ${done} · 기대와 다름 ${bad}`);
  process.exit(bad || !done ? 1 : 0);
})();
