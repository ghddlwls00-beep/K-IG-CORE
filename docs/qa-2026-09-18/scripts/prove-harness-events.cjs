#!/usr/bin/env node
/**
 * 7단계 7-1 a 일부러 깨기 — 방문 중에 생긴 404 가 동작 사이 resetEvents() 뒤에도 기록에 남는가.
 * 옛 판(034e91b lib/harness.cjs)과 지금 판을 같은 헤드리스 Edge(감사 프로필 복사본 — 원본은 읽기만) 의 두 탭에서:
 *   홈을 연다 → 페이지 안에서 없는 주소를 fetch(404) → 드라이버가 동작마다 하듯 tab.resetEvents() → events(tab)
 * 옛 판은 404 가 사라지고(badResponses 0), 지금 판은 남아야 한다(1). 이용권 · 관리자 호출 없음, 익명 GET 하나.
 *   node docs/qa-2026-09-18/scripts/prove-harness-events.cjs
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OLD_REV = "034e91b";
const oldFile = path.join(__dirname, "lib", `_old-${OLD_REV}-harness.cjs`);
fs.writeFileSync(oldFile, execFileSync("git", ["show", `${OLD_REV}:docs/qa-2026-09-18/scripts/lib/harness.cjs`], { cwd: REPO, encoding: "utf8" }));
const HOLD = require(oldFile);
const H = require("./lib/harness.cjs");
const PROBE = `/qa-7-1a-no-such-path-${Date.now()}`;

(async () => {
  let browser = null, wrong = 0;
  try {
    browser = await H.startBrowser("proof71a", 9631);
    for (const [label, M, want] of [["옛 판", HOLD, 0], ["지금 판", H, 1]]) {
      const tab = await M.openTab(browser);
      await M.load(tab, "/", { marker: null, settle: 400 });
      const status = await tab.eval(`fetch(${JSON.stringify(PROBE)}).then((r) => r.status).catch(() => -1)`);
      await M.sleep(800);
      const before = tab.events.badResponses.filter((r) => r.url.includes(PROBE)).length;
      tab.resetEvents(); // 드라이버가 동작마다 하는 것
      await tab.eval("1 + 1");
      const got = M.events(tab).badResponses.filter((r) => r.url.includes(PROBE)).length;
      const ok = got === want;
      if (!ok) wrong++;
      console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${label}: fetch ${PROBE} → ${status} · 비우기 전 기록 ${before} · 비운 뒤 events() 의 404 ${got} (기대 ${want})`);
      await tab.close().catch(() => {});
    }
  } finally {
    if (browser) browser.proc.kill();
    fs.rmSync(oldFile, { force: true });
  }
  console.log(`\n기대와 다름 ${wrong}`);
  process.exit(wrong ? 1 : 0);
})().catch((e) => { console.error(e); fs.rmSync(oldFile, { force: true }); process.exit(1); });
