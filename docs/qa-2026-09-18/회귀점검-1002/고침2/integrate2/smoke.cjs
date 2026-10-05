// integrate2 scratch smoke: local `next start` (BASE) · no licence · free pages render without errors, and the paid pages
// changed in this fix (a1-6 · a6-5 · a7-2 · a7-3 · a8-3 · a5-2 · a5-4 · a6-3 · s6-2) show no new paid text to an anonymous visitor.
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const BASE = process.env.BASE || "http://localhost:3350";
const PORT = Number(process.env.PORT || 9946);
const OUT = path.join(__dirname, "smoke.jsonl");
fs.writeFileSync(OUT, "");
const rows = [];
const row = (viewport, what, ok, saw) => {
  const r = { viewport, what, verdict: ok ? "PASS" : "FAIL", saw };
  rows.push(r);
  fs.appendFileSync(OUT, JSON.stringify(r) + "\n");
  console.log(`${r.verdict}  ${viewport} · ${what} — ${JSON.stringify(saw).slice(0, 400)}`);
};

const FREE = [
  ["/adult/a1-1", /Step|단계/],
  ["/adult/a1-2", /Step|단계/],
  ["/student/s1-1", /Step|단계/],
  ["/student/s1-2", /Step|단계/],
  ["/ld/d001", /단계|Step/],
  ["/ld/d001-1", /단계|Step/],
  ["/reading/pr001", /단계|Step/],
  ["/reading/pr001-1", /단계|Step/],
  ["/passoff-grammar/pg01-1", /단계|Step/],
  ["/passoff-grammar/pg01-2", /단계|Step/],
];
// new paid texts (this fix) — must not reach an anonymous visitor's HTML or screen
const NEEDLES = [
  "한 사람 한 사람 개별적으로",
  "and they have seen us through",
  "job changes, house moves, and several family milestones.",
  "이직과 이사, 여러 가족 대소사를",
  "통일하다, 하나로 합치다",
  "(전쟁 등이) 일어나다, 발발하다",
  "~라고 불리다",
  "그분은 약 30세이십니다",
  "He/She is about 30 years old.",
];
const PAID = ["/adult/a1-6", "/adult/a6-5", "/adult/a7-2", "/adult/a7-3", "/adult/a8-3", "/adult/a5-2", "/adult/a5-4", "/adult/a6-3", "/student/s6-2"];

(async () => {
  const profile = path.join(__dirname, `edge-${PORT}`);
  const { proc } = await launch({ port: PORT, profile });
  try {
    for (const viewport of ["desktop", "mobile"]) {
      const tab = await Tab.open(PORT);
      await tab.viewport(viewport);
      try {
        for (const [url, re] of FREE) {
          tab.resetEvents();
          await tab.goto(`${BASE}${url}`, 2500);
          const seen = await tab.eval(`(() => ({ text: (document.querySelector('main')||document.body).innerText.length, steps: ${re}.test(document.body.innerText), locked: /이용권|잠김|잠겨/.test(document.querySelector('main')?.innerText.slice(0, 400) || ''), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 }))()`);
          const ev = tab.events;
          row(viewport, `무료 ${url}`, seen.text > 200 && seen.steps && !seen.overflow && !ev.exceptions.length && !ev.console.length && !ev.badResponses.length,
            { ...seen, exceptions: ev.exceptions.slice(0, 2), console: ev.console.slice(0, 2), bad: ev.badResponses.slice(0, 3) });
        }
        for (const url of PAID) {
          tab.resetEvents();
          await tab.goto(`${BASE}${url}`, 2000);
          const html = await tab.eval(`document.documentElement.outerHTML`);
          const leaks = NEEDLES.filter((n) => html.includes(n));
          const ev = tab.events;
          row(viewport, `유료(익명) ${url} — 새 유료 글 0`, leaks.length === 0 && !ev.exceptions.length, { leaks, exceptions: ev.exceptions.slice(0, 2), bad: ev.badResponses.slice(0, 2).map((b) => b.status) });
        }
        tab.resetEvents();
        await tab.goto(`${BASE}/adult`, 2000);
        const list = await tab.eval(`document.body.innerText`);
        row(viewport, "/adult 목록 열림", list.length > 500 && /7-2/.test(list), { len: list.length });
      } finally {
        await tab.eval(`localStorage.clear()`).catch(() => {});
        await tab.close();
      }
    }
  } finally {
    proc.kill();
  }
  const fail = rows.filter((r) => r.verdict === "FAIL").length;
  console.log(`\n${rows.length - fail}/${rows.length} PASS (FAIL ${fail})`);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
