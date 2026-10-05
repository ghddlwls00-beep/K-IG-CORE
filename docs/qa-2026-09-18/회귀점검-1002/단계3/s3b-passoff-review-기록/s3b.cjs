// 회귀 점검 1002 단계 3 보충 (rc1002-s3b) — PASS-OFF 완료 전/뒤 상태 읽기 · 오늘 복습 · 오답노트 · 구성도 (스크래치 대본, 저장소 도구는 require 만)
// 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
//   node s3b.cjs <pre|post|pages> --port 9970 --out <jsonl> [--viewports desktop,mobile]
// 읽기만: GET /api/progress/passoff-grammar · 기기 저장소의 학습 기록(요약만 — 이용권 id · 토큰 · 쿠키 출력 0). 쓰기 요청은 앱이 쪽을 열 때 스스로 보내는 것뿐.
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const S = path.join(REPO, "docs/qa-2026-09-18/scripts");
const H = require(path.join(S, "lib/harness.cjs"));
const P = require(path.join(S, "lib/passoff-expect.cjs"));

const argv = process.argv.slice(2);
const MODE = argv[0];
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(arg("--port", 9970));
if (PORT < 9970 || PORT > 9974) { console.error("port 9970~9974 only"); process.exit(2); }
const OUTF = arg("--out", path.join(__dirname, `s3b-${MODE}.jsonl`));
const VIEWPORTS = arg("--viewports", "desktop,mobile").split(",");
const CLONE = "rc1002-s3b";
const tx = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const FAKE = /\b(hows|whens|buts|wheres|saids|alway|untils|veries|ands|evens|withs|abouts|throughs|becauses|sinces|quicklies|nevers|wents|tooks|gots|whats|whos|whys)\b/i;
const NET_HOOK = `(() => { if (window.__s3bNet) return; window.__s3bNet = []; const of = window.fetch; window.fetch = function (input, init) { const url = typeof input === 'string' ? input : (input && input.url) || ''; const method = (init && init.method) || (input && input.method) || 'GET'; const p = of.apply(this, arguments); if (/\\/api\\//.test(url)) p.then((r) => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: r.status }), () => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: -1 })); return p; }; })()`;

const rows = [];
function row(r) { rows.push(r); fs.appendFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(`${r.verdict.padEnd(7)} ${r.viewport} · ${r.screen} · ${r.what} — ${String(r.saw).slice(0, 300)}`); }

async function freeMemOk() {
  const { execFileSync } = require("child_process");
  for (;;) {
    const kb = Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim());
    if (kb / 1024 / 1024 >= 0.9) { console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB`); return; }
    console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB < 0.9 — waiting 60 s`);
    await H.sleep(60000);
  }
}

/** GET /api/progress/passoff-grammar — summary only */
async function progressGet(tab) {
  return await tab.eval(`fetch('/api/progress/passoff-grammar', { credentials: 'same-origin', cache: 'no-store' }).then(async (r) => {
    if (!r.ok) return { status: r.status };
    const b = await r.json(); const p = b.progress || {};
    const lessons = p.lessons || {};
    const done = Object.keys(lessons).filter((k) => lessons[k] && lessons[k].completed);
    const t1 = (p.topics || []).find((t) => t.topic === 1) || null;
    return { status: r.status, completed: done, completedAt: done.map((k) => lessons[k].completedAt || lessons[k].updatedAt || null),
      keys: Object.keys(p), everyTopicOpen: p.everyTopicOpen, mapRefillRequired: p.mapRefillRequired,
      topic1: t1 && { lessonIds: t1.lessonIds, completedCount: t1.completedCount, requiredCount: t1.requiredCount, lastLessonId: t1.lastLessonId, lastLessonCompleted: t1.lastLessonCompleted, mapRefilled: t1.mapRefilled, unlocked: t1.unlocked } };
  }).catch((e) => ({ status: -1, error: String(e) }))`).catch((e) => ({ error: e.message }));
}

/** the learning record this device holds for the licence (synced from the server by the page) — summary, no licence id */
const RECORD = `(() => {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('kig-learning:passoff-grammar'));
  return keys.map((k) => { let r = null; try { r = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    if (!r) return { which: k.includes('@') ? 'licence' : 'free', parsed: false };
    const items = Object.entries(r.items || {});
    const byLesson = {}; const due = {}; let wrong = 0, lapses = 0;
    for (const [key, s] of items) { byLesson[s.lessonId] = (byLesson[s.lessonId] || 0) + 1; due[s.dueDay] = (due[s.dueDay] || 0) + 1; if (s.lastCorrect === false) wrong++; if (s.lapses > 0) lapses++; }
    const logBy = {}; for (const l of r.log || []) { const kk = (l.where || '?') + ':' + (l.effect || '?'); logBy[kk] = (logBy[kk] || 0) + 1; }
    return { which: k.includes('@') ? 'licence' : 'free', lessons: Object.fromEntries(Object.entries(r.lessons || {}).map(([id, v]) => [id, v && v.day])), items: items.length, byLesson, dueDays: due, wrongNow: wrong, withLapses: lapses, reports: (r.reports || []).length, log: (r.log || []).length, logBy, lastStudyDay: r.lastStudyDay || null };
  });
})()`;

async function page(tab, url, viewport) {
  await H.setViewport(tab, viewport);
  const ld = await H.load(tab, url, { marker: null });
  await H.waitFor(tab, `(() => { const m = document.querySelector('main'); return !!m && !/불러오고 있어요/.test(m.innerText || '') && (m.innerText || '').length > 40; })()`, 15000);
  await H.sleep(3000); // the licence's server record arrives after the first paint
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  return { ld, snap, text: snap ? tx(snap.text) : "" };
}
function common(name, viewport, snap, tab) {
  const ev = H.events(tab);
  const roman = snap ? P.romanOnScreen("passoff-grammar/__none__", snap.text) : [];
  const fake = snap ? (snap.text.match(FAKE) || []) : [];
  const bad = ev.badResponses || [];
  row({ viewport, screen: name, what: "4xx/5xx · 콘솔 오류 · 예외 · 넘침 · 오류 화면", expect: "모두 0", saw: `4xx/5xx ${bad.length}${bad.length ? " " + bad.slice(0, 3).map((r) => `${r.status} ${String(r.url).replace(H.BASE, "")}`).join(" · ") : ""} · 콘솔 ${ev.console.length}${ev.console.length ? " " + JSON.stringify(ev.console.slice(0, 2)).slice(0, 200) : ""} · 예외 ${ev.exceptions.length}${ev.exceptions.length ? " " + String(ev.exceptions[0]).slice(0, 160) : ""} · 넘침 ${snap && snap.overflowX} · 오류 화면 ${snap && snap.errorScreen}`, verdict: !bad.length && !ev.exceptions.length && snap && !snap.overflowX && !snap.errorScreen ? (ev.console.length ? "INFO" : "PASS") : "FAIL" });
  row({ viewport, screen: name, what: "로마자 한국어 낱말 · 'Busan(부산)' 꼴 · 가짜 낱말(whens 등)", expect: "0", saw: `로마자 ${roman.length}${roman.length ? " " + roman.slice(0, 2).map((r) => r.text).join(" · ") : ""} · 가짜 낱말 ${fake.length}${fake.length ? " " + fake.join(",") : ""}`, verdict: roman.length || fake.length ? "FAIL" : "PASS" });
}

async function readAll(tab, viewport, label) {
  // the course list: progress line, pg01-1 row, review / notes entries
  const L = await page(tab, "/passoff-grammar", viewport);
  await tab.eval(`(() => { for (const b of document.querySelectorAll('main [id^="section-"] > button[aria-expanded="false"]')) b.click(); })()`).catch(() => {});
  await H.sleep(800);
  const list = await tab.eval(`(() => { const m = document.querySelector('main'); const t = (m.innerText || '').replace(/\\s+/g, ' ');
    const pr = t.match(/학습 진도율[^%]{0,40}%?/); const li = document.querySelector('main [data-lesson-id="pg01-1"]') || [...document.querySelectorAll('main li, main a')].find((x) => /pg01-1|1인칭/.test(x.getAttribute('href') || '') );
    const a = document.querySelector('main a[href="/passoff-grammar/pg01-1"]'); const row = (li && li.closest('li')) || (a && a.closest('li')) || a;
    const rv = document.querySelector('[data-passoff-review-entry]'); const nt = document.querySelector('[data-passoff-notes-entry]');
    const doneRows = [...document.querySelectorAll('main li')].filter((l) => /완료/.test(l.textContent) && l.querySelector('a[href^="/passoff-grammar/pg"]')).map((l) => (l.querySelector('a[href^="/passoff-grammar/pg"]').getAttribute('href') || '').split('/').pop());
    return { progressLine: pr ? pr[0] : null, row: row ? row.textContent.replace(/\\s+/g, ' ').trim().slice(0, 160) : null, rowDone: row ? /완료/.test(row.textContent) : null, doneRows, review: rv ? { kind: rv.dataset.passoffReviewEntry, text: rv.innerText.replace(/\\s+/g, ' ').trim() } : null, notes: nt ? { text: nt.innerText.replace(/\\s+/g, ' ').trim(), href: nt.getAttribute('href') } : null, head: t.slice(0, 400) }; })()`).catch((e) => ({ error: e.message }));
  const prog = await progressGet(tab);
  const rec = await tab.eval(RECORD).catch((e) => ({ error: e.message }));
  const net = (await tab.eval("window.__s3bNet || []").catch(() => [])) || [];
  row({ viewport, screen: "목록 /passoff-grammar", what: `${label}: 진행률 줄 · pg01-1 줄 · 오늘 복습 · 오답노트 입구`, expect: "—", saw: JSON.stringify(list), verdict: "INFO" });
  row({ viewport, screen: "GET /api/progress/passoff-grammar", what: `${label}: 서버 진도(읽기만)`, expect: "—", saw: JSON.stringify(prog), verdict: "INFO" });
  row({ viewport, screen: "기기 학습 기록(서버에서 받은 사본)", what: `${label}: 학습 기록 요약(읽기만)`, expect: "—", saw: JSON.stringify(rec), verdict: "INFO" });
  row({ viewport, screen: "목록 /passoff-grammar", what: `${label}: 쪽이 스스로 보낸 /api 요청(상태만)`, expect: "—", saw: net.map((x) => `${x.method} ${x.path} ${x.status}`).join(" · "), verdict: "INFO" });
  common("목록 /passoff-grammar", viewport, L.snap, tab);
  // the map of topic 1
  const M = await page(tab, "/passoff-grammar/map?topic=1", viewport);
  const mapInfo = await tab.eval(`(() => { const m = document.querySelector('main'); const t = (m.innerText || '').replace(/\\s+/g, ' ').trim(); const btns = [...m.querySelectorAll('button, a[href]')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 20); const frac = t.match(/\\d+\\s*\\/\\s*\\d+/g); return { text: t.slice(0, 500), fractions: frac, buttons: btns }; })()`).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "구성도 /passoff-grammar/map?topic=1", what: `${label}: 구성도 화면(읽기만)`, expect: "—", saw: JSON.stringify(mapInfo), verdict: "INFO" });
  common("구성도", viewport, M.snap, tab);
  return { list, prog, rec, mapInfo };
}

async function reviewPages(tab, viewport) {
  // 오늘 복습
  const R = await page(tab, "/passoff-grammar/review", viewport);
  const rv = await tab.eval(`(() => { const m = document.querySelector('main'); const s = document.querySelector('[data-review-step]'); const item = document.querySelector('[data-review-item]'); return { step: s ? s.dataset.reviewStep : null, item: item ? item.dataset.reviewItem : null, mode: item ? item.dataset.reviewMode : null, text: (m.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 700), buttons: [...m.querySelectorAll('button, a[href]')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 15) }; })()`).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "오늘 복습 /passoff-grammar/review", what: "열기 — 항목이 있는지", expect: "pg01-1 문항(오늘이 복습일이면) 또는 '오늘 복습 없음' + 다음 복습 때", saw: JSON.stringify(rv), verdict: rv && rv.item ? "PASS" : "INFO" });
  common("오늘 복습", viewport, R.snap, tab);
  // 오답노트
  const N = await page(tab, "/passoff-grammar/review?notes=1", viewport);
  const nt = await tab.eval(`(() => { const m = document.querySelector('main'); const s = document.querySelector('[data-notes-step]'); const lessons = [...document.querySelectorAll('[data-notes-lesson]')].map((e) => ({ id: e.dataset.notesLesson, text: e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 120) })); return { step: s ? s.dataset.notesStep : null, lessons, again: [...m.querySelectorAll('button')].some((b) => /지금 다시 풀기/.test(b.innerText || '')), text: (m.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 600) }; })()`).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "오답노트 /passoff-grammar/review?notes=1", what: "열기 — 틀린 문항 · '지금 다시 풀기'", expect: "틀린 문항이 있으면 강의별 목록 · 다시 풀기 단추", saw: JSON.stringify(nt), verdict: nt && nt.lessons && nt.lessons.length ? "PASS" : "INFO" });
  common("오답노트", viewport, N.snap, tab);
  return { rv, nt };
}

async function lessonReload(tab, viewport) {
  const ld = await H.load(tab, "/passoff-grammar/pg01-1", { marker: H.MARKERS["passoff-grammar"] });
  await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000);
  await H.sleep(3000);
  const END = `(() => { const s = document.querySelector('main section[aria-label="강의 마치기"]'); if (!s) return null; const b = s.querySelector('button[aria-label^="학습 완료"]'); const st = s.querySelector('[role=status]'); return { btn: b ? { label: b.getAttribute('aria-label'), disabled: b.disabled, text: (b.innerText || '').trim() } : null, status: st ? st.innerText.trim() : null, text: (s.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 300) }; })()`;
  const e = await tab.eval(END).catch(() => null);
  const ls = await tab.eval(`Object.keys(localStorage).filter((k) => /passoff/.test(k)).map((k) => k.replace(/@.*/, '@<id>'))`).catch(() => []);
  row({ viewport, screen: "강의 /passoff-grammar/pg01-1", what: "새로고침(이 기기 저장소를 비운 새 쪽) 뒤 끝 칸", expect: "'학습 완료함'(서버 완료에서) — 누를 단추 없음 · 되돌림 없음", saw: `${JSON.stringify(e)} · 쪽을 연 뒤 저장소 키 ${JSON.stringify(ls)} · navigated ${ld.navigated}`, verdict: e && (/학습 완료함/.test(e.status || "") || /학습 완료함/.test(e.text || "")) && !(e.btn && /취소/.test(e.btn.label || "")) ? "PASS" : "FAIL" });
  common("강의 pg01-1(새로고침)", viewport, await tab.eval(H.SNAPSHOT).catch(() => null), tab);
}

(async () => {
  await freeMemOk();
  const browser = await H.startBrowser(CLONE, PORT);
  let tab;
  try {
    tab = await H.openTab(browser, { clean: true });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: NET_HOOK });
    if (MODE === "pre") {
      await readAll(tab, "desktop", "완료 전");
    } else if (MODE === "post") {
      for (const vp of VIEWPORTS) {
        await lessonReload(tab, vp);
        await readAll(tab, vp, "완료 뒤");
        await reviewPages(tab, vp);
      }
    } else if (MODE === "endbar") {
      // is the end bar's 'not done' a timing artefact? (a) direct load, 15 s wait (b) from the list by its own link (in-app navigation)
      for (const vp of VIEWPORTS) {
        await H.setViewport(tab, vp);
        const END = `(() => { const s = document.querySelector('main section[aria-label="강의 마치기"]'); if (!s) return null; return (s.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 200); })()`;
        await H.load(tab, "/passoff-grammar/pg01-1", { marker: H.MARKERS["passoff-grammar"] });
        const seen = [];
        for (const t of [2, 5, 10, 15]) { await H.sleep(t === 2 ? 2000 : t === 5 ? 3000 : 5000); seen.push(`${t}s: ${await tab.eval(END).catch(() => null)}`); }
        const st = await tab.eval(`(() => { const s = document.querySelector('main [data-passoff-view] [data-step-tab]'); return [...document.querySelectorAll('main [data-passoff-view] [data-step-tab]')].map((b) => b.getAttribute('aria-label') || b.textContent.replace(/\\s+/g, ' ').trim()).join(' | '); })()`).catch(() => null);
        row({ viewport: vp, screen: "강의 pg01-1(새 쪽으로 직접 열기)", what: "끝 칸을 2 · 5 · 10 · 15초에 읽음", expect: "'학습 완료함'(서버 완료)", saw: `${seen.join(" ┃ ")} ┃ 단계 탭 ${st}`, verdict: seen.some((s) => /학습 완료함/.test(s)) ? "PASS" : "FAIL" });
        await H.load(tab, "/passoff-grammar", { marker: null });
        await H.sleep(4000);
        const c = await H.click(tab, `document.querySelector('main a[href="/passoff-grammar/pg01-1"]')`, { settle: 0 });
        await H.waitFor(tab, `location.pathname === "/passoff-grammar/pg01-1" && !!document.querySelector('main section[aria-label="강의 마치기"]')`, 15000);
        await H.sleep(6000);
        const e2 = await tab.eval(END).catch(() => null);
        row({ viewport: vp, screen: "목록 → pg01-1(목록의 링크 — 앱 안 이동)", what: "목록에서 '1인칭 완료' 줄을 눌러 들어간 뒤 끝 칸(6초)", expect: "'학습 완료함'", saw: `눌림 ${c.ok} · ${e2}`, verdict: /학습 완료함/.test(e2 || "") ? "PASS" : "FAIL" });
        common("강의 pg01-1(끝 칸 다시)", vp, await tab.eval(H.SNAPSHOT).catch(() => null), tab);
      }
    } else if (MODE === "pages") {
      for (const vp of VIEWPORTS) await reviewPages(tab, vp);
    } else { console.error("mode?"); process.exit(2); }
  } finally {
    if (tab) await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const t = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  console.log("끝:", JSON.stringify(t));
})();
