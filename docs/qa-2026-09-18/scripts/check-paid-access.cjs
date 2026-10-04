#!/usr/bin/env node
/**
 * Quick proof that the licensed audit clone opens PAID lessons in every in-scope course:
 * no paywall marker, the course marker renders, and lesson text from the data is on screen
 * (clicking through the lesson's step buttons until the needle appears, since some courses
 * show a sentence only in a later step).
 *   node check-paid-access.cjs [cloneName] [--port 9402]
 *
 * 회귀 점검 1002 단계 0 (2026-10-04): ADULT(2026-10-02)의 유료 강의가 없었다 — 마지막 강의 a12-3 을 더함(STUDENT 화면 — 1단계에
 *   영어 문장). 판정을 숫자로 내고 하나라도 못 열면 exit 1(전에는 표만 찍고 0). --port 로 디버깅 포트를 고름.
 *   node check-paid-access.cjs <clone> --break=adult-needle   깨기: ADULT 줄의 바늘을 다른 강의(a2-1)의 문장으로 바꿈 → a12-3 에서 못 찾음 · exit 1
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const argv = process.argv.slice(2);
const PORT = argv.includes("--port") ? Number(argv[argv.indexOf("--port") + 1]) : 9402;
const BREAK = (argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "adult-needle") { console.error(`모르는 --break=${BREAK} (adult-needle)`); process.exit(2); }
const CLONE = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--port") || "probe";
const sentences = (d) => (d.blocks || []).flatMap((b) => (b.items || []).map((i) => i.text)).filter(Boolean);
// PASS-OFF GRAMMAR's lessons are still being written: its last paid lesson on disk, and the first
// example's Korean (step ① shows it before anything is pressed)
const PASSOFF_PAID = (() => {
  const { isFreePreviewLesson } = H.loadTs(path.join(H.REPO, "src/lib/license.ts"));
  const ids = (JSON.parse(fs.readFileSync(path.join(H.REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons["passoff-grammar"] || [])
    .filter((id) => !isFreePreviewLesson("passoff-grammar", id));
  return ids[ids.length - 1] || null;
})();
const adultFirst = (id) => sentences(JSON.parse(fs.readFileSync(path.join(H.REPO, "content/lessons/adult", `${id}.json`), "utf8"))).find((t) => t.length > 15);
const PAGES = [
  ["student", "s20-5", (d) => sentences(d).find((t) => t.length > 15)],
  // ADULT 의 마지막 유료 강의 — 1단계(블라인드 리스닝)에 영어 문장이 보인다(STUDENT 화면)
  ["adult", "a12-3", (d) => (BREAK === "adult-needle" ? adultFirst("a2-1") : sentences(d).find((t) => t.length > 15))],
  ...(PASSOFF_PAID ? [["passoff-grammar", PASSOFF_PAID, (d) => ((d.blocks.find((b) => b.type === "anchors") || { items: [] }).items[0] || {}).ko]] : []),
  ["phonics", "hv-75", (d) => (d.blocks.find((b) => b.type === "wordgrid") || { rows: [[]] }).rows.flat().find((w) => w && w.length > 6)],
  ["grammar1", "gh1-122", (d) => sentences(d).find((t) => t.length > 8)],
  ["grammar2", "gh2-050", (d) => sentences(d).find((t) => t.length > 15)],
  // 회귀 점검 1002: 9/27 화면 고침 뒤 LISTENING 대본 영어는 2단계에서 줄을 확인해야 보인다 — 1단계의 내용 문제(9/29 새 문제, 유료)의 물음으로
  ["ld", "d276", () => {
    const q = path.join(H.REPO, "content/questions/ld/d276.json");
    return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, "utf8")).questions[0].prompt : JSON.parse(fs.readFileSync(path.join(H.REPO, "content/ld_english_scripts.json"), "utf8")).d276[0].en;
  }],
  ["reading", "pr256", (d) => d.readingSentences[0].english],
];
(async () => {
  if (BREAK) console.log("[일부러 깸] ADULT a12-3 에서 찾을 글을 a2-1 의 문장으로 바꿈 — a12-3 화면에는 없으므로 FAIL 이어야 함");
  const browser = await H.startBrowser(CLONE, PORT);
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    for (const [course, id, pick] of PAGES) {
      const d = JSON.parse(fs.readFileSync(path.join(H.REPO, "content/lessons", course, `${id}.json`), "utf8"));
      const needle = String(pick(d) || "").slice(0, 30);
      const l = await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
      const has = `(() => { const t = document.body.innerText; return { paywall: ${H.PAYWALL_RE}.test(t), found: t.includes(${JSON.stringify(needle)}) }; })()`;
      let r = await tab.eval(has);
      let step = "(initial)";
      const labels = (await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => b.offsetParent && /step\\s*\\d|STEP\\s*\\d|단계/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).slice(0, 8)`)) || [];
      for (const label of labels) {
        if (r.found) break;
        await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => b.innerText.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)})`, { settle: 1200 });
        r = await tab.eval(has);
        step = label;
      }
      rows.push({ url: `/${course}/${id}`, loaded: l.navigated && l.rendered, paywall: r.paywall, found: r.found, foundAt: r.found ? step : "-", needle });
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  console.table(rows);
  const bad = rows.filter((r) => !r.loaded || r.paywall || !r.found);
  console.log(`유료 강의 ${rows.length}과정 중 열림(잠김 없음 · 강의 글 보임) ${rows.length - bad.length} · 실패 ${bad.length}${bad.length ? ` (${bad.map((r) => r.url).join(", ")})` : ""}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""} → exit ${bad.length ? 1 : 0}`);
  process.exitCode = bad.length ? 1 : 0;
})();
