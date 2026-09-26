#!/usr/bin/env node
/**
 * 2026-09-26 밤 — 사장님이 점검용 브라우저(%USERPROFILE%\KIG-audit-licensed-profile)에 이용권을 다시 넣은 뒤, 이용권이 있어야 볼 수 있는 것.
 * (이 도구는 이용권 값을 읽거나 적지 않음 — 화면과 소리만 봄. STUDENT 진도를 서버에 쓰는 요청은 막음.)
 *   L 이용권이 살아 있나: 유료 /ld/d010 이 잠김 화면이 아닌가 · STUDENT 마지막 장(s20-1)이 열리나(평생 이용권이면 모든 장이 열림 — BUG-030)
 *   Q LISTENING 수수께끼 '정답 보기'(d171 · d177 · d180 · d183 · d187 · d191): STEP 5 에서 누르기 전엔 답이 안 보이고, 누르면 대본의 답이 그대로 보이나
 *   --break Q : 기대하는 답 글을 바꿔 FAIL 이 나는지
 *   node licensed-checks-0926.cjs [--only L,Q] [--break Q] [--port 9579]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = new Set(arg("--only", "L,Q").split(","));
const BREAK = arg("--break", "");
const OUT = path.join(H.OUT, "features", BREAK ? `licensed-0926-break-${BREAK}.jsonl` : "licensed-0926.jsonl");
const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, INFO: 0 };
const rec = (id, status, note, extra = {}) => { fs.appendFileSync(OUT, JSON.stringify({ id, status, note, at: new Date().toISOString(), ...(BREAK ? { break: BREAK } : {}), ...extra }) + "\n"); counts[status]++; console.log(`${status.padEnd(7)} ${id} — ${note.slice(0, 200)}`); };
const S = JSON.parse(fs.readFileSync(path.join(H.REPO, "content/ld_english_scripts.json"), "utf8"));
const mainText = `((document.querySelector('main') || document.body).innerText || '')`;
const PAYWALLED = `${H.PAYWALL_RE}.test(${mainText})`;
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
(async () => {
  const browser = await H.startBrowser(BREAK ? `lic0926-break-${BREAK}` : "lic0926", Number(arg("--port", 9579)), { fresh: true });
  try {
    const tab = await H.openTab(browser);
    // STUDENT 진도 서버 쓰기 막기(사장님 이용권 기록 보호)
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => { if (msg.method === "Fetch.requestPaused") { const p = msg.params; if (!/^(GET|HEAD|OPTIONS)$/.test(p.request.method)) tab.send("Fetch.failRequest", { requestId: p.requestId, errorReason: "BlockedByClient" }).catch(() => {}); else tab.send("Fetch.continueRequest", { requestId: p.requestId }).catch(() => {}); return; } return orig(msg); };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/progress/student*", requestStage: "Request" }] });
    await H.setViewport(tab, "desktop");

    if (ONLY.has("L")) {
      const a = await H.load(tab, "/ld/d010", { marker: H.MARKERS.ld });
      const paid = !(await tab.eval(PAYWALLED).catch(() => true));
      rec("L:paid-open:/ld/d010", a.rendered && paid ? "PASS" : "FAIL", `유료 LISTENING d010 — ${paid ? "열림(이용권 살아 있음)" : "잠김 화면"}`);
      const b = await H.load(tab, "/student/s20-1", { marker: null });
      const t = await tab.eval(mainText).catch(() => "");
      const seqLock = /순차 학습 잠금/.test(t);
      rec("L:student-last-chapter:/student/s20-1", "INFO", seqLock ? "마지막 장이 '순차 학습 잠금' — 장이 차례로 열리는 이용권(이 이용권으로 순서 열림을 볼 수 있음)" : H.PAYWALL_RE.test(t) ? "잠김 화면(이용권 종류가 STUDENT 를 안 덮음)" : "마지막 장이 바로 열림 — 모든 장이 열리는 이용권(평생 — BUG-030). 장이 차례로 열리는지는 이 이용권으로 볼 수 없음");
    }

    if (ONLY.has("Q")) {
      for (const id of ["d171", "d177", "d180", "d183", "d187", "d191"]) {
        const want = (S[id] || []).filter((r) => r && r.answer).map((r) => (BREAK === "Q" ? r.answer + " (깨기)" : r.answer));
        const l = await H.load(tab, `/ld/${id}`, { marker: H.MARKERS.ld });
        if (!l.rendered || (await tab.eval(PAYWALLED).catch(() => true))) { rec(`Q:riddle:${id}`, "BLOCKED", "잠김 화면이거나 안 뜸"); continue; }
        await H.click(tab, `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => /STEP 5/.test(b.innerText || ''))`, { settle: 1000 });
        const before = await tab.eval(`(() => { const ds = [...document.querySelectorAll('main details')].filter((d) => /정답 보기/.test((d.querySelector('summary') || {}).innerText || '')); return { n: ds.length, open: ds.filter((d) => d.open).length, shown: ds.map((d) => { const p = d.querySelector('p'); if (!p) return false; return typeof p.checkVisibility === 'function' ? p.checkVisibility() : p.getBoundingClientRect().height > 0; }).filter(Boolean).length }; })()`);
        // (첫 판은 닫힌 details 안 글의 크기로 '보임' 을 재 FAIL 6 — 요즘 크롬은 닫힌 details 안도 상자 크기가 남음. checkVisibility 로 고침)
        const n = before.n;
        for (let i = 0; i < n; i++) await H.click(tab, `[...document.querySelectorAll('main details')].filter((d) => /정답 보기/.test((d.querySelector('summary') || {}).innerText || ''))[${i}].querySelector('summary')`, { settle: 300 });
        const after = await tab.eval(`[...document.querySelectorAll('main details')].filter((d) => /정답 보기/.test((d.querySelector('summary') || {}).innerText || '')).map((d) => ({ open: d.open, text: ((d.querySelector('p') || {}).innerText || '').trim() }))`);
        const norm = (s) => String(s).replace(/\s+/g, " ").trim();
        const matched = want.filter((w) => after.some((a) => a.open && norm(a.text) === norm(w))).length;
        const ok = n === want.length && before.open === 0 && before.shown === 0 && matched === want.length;
        rec(`Q:riddle:${id}`, ok ? "PASS" : "FAIL", `STEP 5 '정답 보기' ${n}개(대본의 답 ${want.length}) · 누르기 전 열림 ${before.open} · 보이는 답 ${before.shown} → 누른 뒤 대본 답과 같은 것 ${matched}/${want.length}`);
      }
    }
    await tab.close();
  } finally {
    browser.proc.kill();
    console.log(`\n끝 · PASS ${counts.PASS} · FAIL ${counts.FAIL} · BLOCKED ${counts.BLOCKED} · INFO ${counts.INFO} → ${OUT}`);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
