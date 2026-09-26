#!/usr/bin/env node
/**
 * 2026-09-26 — 명령서 대조표 part-1 이 '없음 · 부분' 으로 적은 것 가운데 빨리 볼 수 있는 것 (운영 · 이용권 없음 · 무료 강의).
 *   M 휴대폰 · 태블릿 ☰ 메뉴: 열림 → 과정 링크마다 눌러 그 과정 목록으로 · 닫기 · 바깥 누르면 닫힘            (§4 inaccessible menus)
 *   S 영어 제목 검색: 'Greeting' · 'Traditional Food' · 'Passage 100' → 결과 수 = 앱 검색 함수 · 눌러 그 강의로   (§4 English input)
 *   P 화면에서 '완료 체크' → 목록 진도 1 / N · 미완료 N − 1 → '완료 취소' → 0 / N                           (§4 progress after completion)
 *   R 가만히 두기: 쪽을 연 뒤 5초와 30초의 요청 수 — 저절로 계속 느는 요청이 있나                           (§2 repeated or endless requests)
 *   W 콘솔 경고: 같은 쪽들의 console warning(스윕 기록 도구는 error · assert 만 적음)                        (§2 console warnings — 기록만)
 *   O 글 겹침: 첫 쪽 · 과정 목록 × 세 화면 — 보이는 글 조각끼리 30% 넘게 겹치는 쌍                          (§4 overlapping text)
 *   --break M|S|P|R|O : 일부러 깨서 FAIL 이 나는지(이 브라우저 안에서만). KIG_PROFILE_SOURCE(빈 폴더) · KIG_CLONE_PREFIX 와 같이.
 *   node gap-checks-0926.cjs [--only M,S,P,R,W,O] [--break X] [--port 9576]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const ts = require(path.join(H.REPO, "node_modules/typescript"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = new Set(arg("--only", "M,S,P,R,W,O").split(","));
const BREAK = arg("--break", "");
const OUT = path.join(H.OUT, "features", BREAK ? `gap-0926-break-${BREAK}.jsonl` : "gap-0926.jsonl");
const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, INFO: 0 };
const rec = (id, status, note, extra = {}) => { fs.appendFileSync(OUT, JSON.stringify({ id, status, note, at: new Date().toISOString(), ...(BREAK ? { break: BREAK } : {}), ...extra }) + "\n"); counts[status]++; console.log(`${status.padEnd(7)} ${id} — ${note.slice(0, 190)}`); };
const L = (rel) => { const js = ts.transpileModule(fs.readFileSync(path.join(H.REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, (x) => (x.startsWith(".") || x.startsWith("@/") ? {} : require(x))); return m.exports; };
const SEARCH = L("src/lib/searchMatch.ts");
const INDEX = JSON.parse(fs.readFileSync(path.join(H.REPO, "public/search-index.json"), "utf8"));
const mainText = `((document.querySelector('main') || document.body).innerText || '')`;
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;

(async () => {
  const browser = await H.startBrowser(BREAK ? `gap0926-break-${BREAK}` : "gap0926", Number(arg("--port", 9576)), { fresh: true });
  const warnings = [];
  try {
    const tab = await H.openTab(browser);
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => { if (msg.method === "Runtime.consoleAPICalled" && msg.params && msg.params.type === "warning") warnings.push({ page: tab.__page || "", text: (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200) }); return orig(msg); };
    if (BREAK === "M") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'aside { display: none !important; }'; document.head.appendChild(s); });` });
    if (BREAK === "R") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `setInterval(() => fetch('/robots.txt?kig=' + Date.now()).catch(() => {}), 1000);` });
    if (BREAK === "O") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'main h1, main h2 { margin-bottom: -40px !important; position: relative; }'; document.head.appendChild(s); });` });
    if (BREAK === "T") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '[data-sentence-id] { pointer-events: none !important; }'; document.head.appendChild(s); });` });
    if (BREAK === "Z") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && /전체 초기화/.test(b.innerText || '')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);` });
    // K · X 깨기: 사이트의 CSP(connect-src 'self' · script-src nonce + strict-dynamic)가 심은 바깥 요청 · 인라인 코드를 막아(첫 깨기 PASS)
    // 검사가 '못 보는' 것인지 '막혀서 없는' 것인지 가를 수 없음 → 검사의 판정 자리를 깸: K 는 이 사이트 자신을 '밖' 으로, X 는 심은 코드가 곧바로 표를 올림
    if (BREAK === "X") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('input', (e) => { if (!e.target || !e.target.closest || !e.target.closest('[role=dialog]')) return; if (/[<>]/.test(e.target.value)) window.__kigXss = 'break'; }, true);` });
    // 요청이 가는 곳(K) — 쪽마다 요청 주소의 호스트를 모음
    const hosts = new Map();
    const orig2 = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => { if (msg.method === "Network.requestWillBeSent" && msg.params && msg.params.request) { try { const h = new URL(msg.params.request.url).host; if (h) hosts.set(h, (hosts.get(h) || 0) + 1); } catch {} } return orig2(msg); };
    await tab.send("Network.enable").catch(() => {});

    // ---------- M. ☰ 메뉴 ----------
    if (ONLY.has("M")) {
      for (const vp of ["mobile", "tablet"]) {
        await H.setViewport(tab, vp);
        // 첫 쪽(LandingPage)은 ☰ 이 없는 설계(과정 카드 넘기기 · 'Section Navigation') — 첫 판은 "/" 에서 찾다 FAIL 2(도구 기대 잘못). 과정 목록 · 강의 쪽으로
        for (const start of ["/reading", "/reading/pr001"]) {
          await H.load(tab, start, { marker: null });
          const open = await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 800 });
          const links = await tab.eval(`[...document.querySelectorAll('aside nav a[href]')].filter(${VIS}).map((a) => ({ href: new URL(a.href).pathname, text: (a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 30) }))`).catch(() => []);
          if (!open.ok || !links.length) { rec(`M:${vp}:${start}:open`, "FAIL", `메뉴 열기 ${open.ok} · 보이는 과정 링크 ${links.length}`); continue; }
          // 닫기 단추 · 바깥(배경) 누르기
          await H.click(tab, `document.querySelector('aside button[aria-label="닫기"]')`, { settle: 500 });
          const closed1 = !(await tab.eval(`Boolean([...document.querySelectorAll('aside')].find(${VIS}))`).catch(() => true));
          await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 700 });
          const r = await tab.eval(`(() => { return { x: 20, y: Math.round(window.innerHeight / 2) }; })()`);
          for (const type of ["mousePressed", "mouseReleased"]) await tab.send("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
          await H.sleep(500);
          const closed2 = !(await tab.eval(`Boolean([...document.querySelectorAll('aside')].find(${VIS}))`).catch(() => true));
          rec(`M:${vp}:${start}:open-close`, closed1 && closed2 ? "PASS" : "FAIL", `열림 · 과정 링크 ${links.length}(${links.map((l) => l.href).join(" ")}) · 닫기 단추 ${closed1} · 바깥 누르기 ${closed2}`, { links });
          // 링크마다: 메뉴를 열고 그 링크를 눌러 도착 · 화면 그려짐
          let ok = 0; const bad = [];
          for (const l of links) {
            await H.load(tab, start, { marker: null });
            await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 700 });
            await H.click(tab, `[...document.querySelectorAll('aside nav a[href]')].find((a) => new URL(a.href).pathname === ${JSON.stringify(l.href)})`, { settle: 1800 });
            const at = await tab.eval(`({ p: location.pathname, chars: ${mainText}.length, drawer: Boolean([...document.querySelectorAll('aside')].find(${VIS})) })`).catch(() => ({ p: null, chars: 0, drawer: true }));
            if (at.p === l.href && at.chars > 200 && !at.drawer) ok++; else bad.push(`${l.href} → ${at.p} (${at.chars}자 · 메뉴 남음 ${at.drawer})`);
          }
          rec(`M:${vp}:${start}:links`, ok === links.length ? "PASS" : "FAIL", `과정 링크 ${ok}/${links.length} 도착 · 메뉴 닫힘${bad.length ? " · 어긋남 " + bad.join(" | ") : ""}`);
        }
      }
      await H.setViewport(tab, "desktop");
    }

    // ---------- S. 영어 제목 검색 ----------
    if (ONLY.has("S")) {
      await H.setViewport(tab, "desktop");
      for (const t of [{ q: "Greeting", go: "/student/s1-1" }, { q: "Traditional Food", go: "/student/s19-3" }, { q: "Passage 100", go: "/reading/pr100" }]) {
        await H.load(tab, "/reading", { marker: null });
        const open = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
        const typed = open.ok && (await H.type(tab, `document.querySelector('[role=dialog] input')`, t.q));
        await H.sleep(1100);
        const items = await tab.eval(`[...document.querySelectorAll('[role=dialog] li button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`).catch(() => []);
        const want = SEARCH.searchItems(INDEX, t.q);
        const idx = want.findIndex((i) => `/${i.course}/${i.id}` === t.go);
        let landed = null;
        if (items.length && idx >= 0) { await H.click(tab, `[...document.querySelectorAll('[role=dialog] li button')][${idx}]`, { settle: 2500 }); landed = await tab.eval("location.pathname").catch(() => null); }
        const expect = BREAK === "S" ? "/student/zz-break" : t.go;
        rec(`S:search:${t.q}`, typed && items.length === want.length && landed === expect ? "PASS" : typed ? "FAIL" : "BLOCKED", `결과 ${items.length}(앱 검색 함수 ${want.length}) · 눌러 → ${landed}(기대 ${expect})`, { items: items.slice(0, 4) });
      }
    }

    // ---------- P. 화면에서 완료 체크 → 목록 진도 ----------
    if (ONLY.has("P")) {
      await H.setViewport(tab, "desktop");
      await tab.eval(`(() => { localStorage.removeItem('kig:progress:completed'); localStorage.removeItem('kig:progress:bookmarks'); })()`).catch(() => {});
      const COUNTERS = `(() => { const t = ${mainText}; const m = t.match(/학습 진도율:\\s*(\\d+)\\s*\\/\\s*(\\d+)개 완료/); const i = t.match(/미완료\\s*\\((\\d+)\\)/); return { done: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null, incomplete: i ? Number(i[1]) : null }; })()`;
      for (const [course, id] of [["reading", "pr001"], ["ld", "d001"], ["phonics", "mv1-01"]]) {
        await H.load(tab, `/${course}`, { marker: null });
        const c0 = await tab.eval(COUNTERS);
        await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
        const mark = await H.click(tab, `document.querySelector('button[aria-label="학습 완료 체크"]')`, { settle: 800 });
        const shown = await tab.eval(`Boolean(document.querySelector('button[aria-label="학습 완료 취소"]'))`).catch(() => false);
        await H.load(tab, `/${course}`, { marker: null });
        const c1 = await tab.eval(COUNTERS);
        await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
        const unmark = await H.click(tab, `document.querySelector('button[aria-label="학습 완료 취소"]')`, { settle: 800 });
        await H.load(tab, `/${course}`, { marker: null });
        const c2 = await tab.eval(COUNTERS);
        const want1 = BREAK === "P" ? c0.done + 2 : c0.done + 1;
        const ok = mark.ok && shown && unmark.ok && c1.done === want1 && c1.incomplete === c1.total - c1.done && c2.done === c0.done;
        rec(`P:complete:${course}/${id}`, mark.ok ? (ok ? "PASS" : "FAIL") : "BLOCKED", `완료 체크 전 ${c0.done}/${c0.total} → 체크 뒤 ${c1.done}/${c1.total}(기대 ${want1}) · 미완료 ${c1.incomplete} → 취소 뒤 ${c2.done}/${c2.total}`);
      }
    }

    // ---------- R. 가만히 두기(저절로 느는 요청) · W. 콘솔 경고 ----------
    if (ONLY.has("R") || ONLY.has("W")) {
      await H.setViewport(tab, "desktop");
      for (const p of ["/", "/reading", "/reading/pr001", "/ld/d001", "/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007"]) {
        tab.__page = p;
        const course = p.split("/")[1];
        await H.load(tab, p, { marker: p.split("/").length > 2 ? H.MARKERS[course] : null });
        await H.sleep(5000);
        const n5 = H.events(tab).requests;
        await H.sleep(25000);
        const n30 = H.events(tab).requests;
        const grow = n30 - n5;
        if (ONLY.has("R")) rec(`R:idle:${p}`, grow <= 3 ? "PASS" : "FAIL", `연 뒤 5초 요청 ${n5} → 30초 ${n30} (가만히 있는 25초 동안 +${grow} · 문턱 3)`);
      }
      tab.__page = "";
      if (ONLY.has("W")) rec("W:console-warnings", warnings.length ? "INFO" : "PASS", `위 8쪽을 열고 30초씩 두는 동안 콘솔 경고 ${warnings.length}${warnings.length ? ": " + [...new Set(warnings.map((w) => `${w.page} ${w.text}`))].slice(0, 6).join(" | ") : ""}`, { warnings: warnings.slice(0, 20) });
    }

    // ---------- O. 글 겹침 ----------
    if (ONLY.has("O")) {
      const OVERLAP = `(() => {
        const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05; };
        const leaves = [...document.querySelectorAll('main *')].filter((el) => el.children.length === 0 && (el.innerText || '').trim().length > 0 && vis(el));
        const rects = leaves.map((el) => ({ el, r: el.getBoundingClientRect() }));
        const pairs = [];
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].r, b = rects[j].r;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w <= 0 || h <= 0) continue;
          const small = Math.min(a.width * a.height, b.width * b.height);
          if ((w * h) / small > 0.3 && !rects[i].el.contains(rects[j].el) && !rects[j].el.contains(rects[i].el)) pairs.push([(rects[i].el.innerText || '').trim().slice(0, 20), (rects[j].el.innerText || '').trim().slice(0, 20)]);
          if (pairs.length > 20) break;
        }
        return { leaves: leaves.length, pairs };
      })()`;
      for (const vp of ["desktop", "tablet", "mobile"]) {
        await H.setViewport(tab, vp);
        for (const p of ["/", "/student", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading"]) {
          await H.load(tab, p, { marker: null });
          const o = await tab.eval(OVERLAP).catch(() => ({ leaves: 0, pairs: [] }));
          rec(`O:${vp}:${p}`, o.pairs.length ? "FAIL" : "PASS", `보이는 글 조각 ${o.leaves} · 30% 넘게 겹친 쌍 ${o.pairs.length}${o.pairs.length ? ": " + o.pairs.slice(0, 3).map((x) => `'${x[0]}'×'${x[1]}'`).join(" ") : ""}`, { pairs: o.pairs.slice(0, 10) });
        }
      }
      await H.setViewport(tab, "desktop");
    }
    // ---------- T. READING 문장을 눌러 그 문장 소리 ----------
    if (ONLY.has("T")) {
      await H.setViewport(tab, "desktop");
      for (const id of ["pr001", "pr002"]) {
        await H.load(tab, `/reading/${id}`, { marker: H.MARKERS.reading });
        const steps = (await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => /step\\s*\\d/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`).catch(() => [])) || [];
        let found = false;
        for (const s of steps) {
          await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(s)})`, { settle: 900 });
          if (await tab.eval(`document.querySelectorAll('main [data-sentence-id]').length`).catch(() => 0)) { found = s; break; }
        }
        if (!found) { rec(`T:reading-sentence:${id}`, "BLOCKED", `문장 누르기 자리(data-sentence-id)를 못 찾음 · 단계 ${steps.length}`); continue; }
        const srcs = [];
        for (let k = 0; k < 3; k++) {
          await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
          await H.sleep(400);
          await H.audioLog(tab, { clear: true });
          await H.click(tab, `[...document.querySelectorAll('main [data-sentence-id]')][${k}]`, { settle: 200 });
          let src = null;
          for (let i = 0; i < 25 && !src; i++) { await H.sleep(200); const e = (await H.audioLog(tab)).find((x) => /^(playing|play-resolved)$/.test(x.ev) && x.src); if (e) src = String(e.src).split("/").pop(); }
          srcs.push(src);
        }
        await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
        const distinct = new Set(srcs.filter(Boolean)).size;
        rec(`T:reading-sentence:${id}`, distinct === 3 ? "PASS" : "FAIL", `${found} 에서 문장 1 · 2 · 3 을 차례로 누름 → 소리 ${srcs.map((s) => s || "없음").join(" · ")} (서로 다른 소리 ${distinct}/3)`);
      }
    }

    // ---------- Z. LISTENING 받아쓰기 '↺ 전체 초기화' ----------
    if (ONLY.has("Z")) {
      await H.setViewport(tab, "desktop");
      const btnBy = (re) => `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ')))`;
      const PLACED = `[...document.querySelectorAll('main button')].filter((b) => /✕|✖/.test(b.innerText || '') || /되돌리/.test(b.getAttribute('title') || '')).length`;
      const BANK = `(() => { const m = ${mainText}.match(/단어 블록 뱅크 \\(총 (\\d+)개\\)/); return m ? Number(m[1]) : null; })()`;
      for (const id of ["d001", "d002"]) {
        await H.load(tab, `/ld/${id}`, { marker: "STEP 2" });
        await H.click(tab, `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => /STEP 2/.test(b.innerText || '') && /딕테이션/.test(b.innerText || ''))`, { settle: 800 });
        if (await tab.eval(`Boolean(${btnBy("/블록 탭 모드로 전환/")})`)) await H.click(tab, btnBy("/블록 탭 모드로 전환/"), { settle: 600 });
        await H.click(tab, btnBy("/전체 초기화/"), { settle: 500 });
        const bank0 = await tab.eval(BANK);
        for (let i = 0; i < 3; i++) await H.click(tab, `(() => { const main = document.querySelector('main'); return [...main.querySelectorAll('button')].filter(${VIS}).filter((b) => !/✕|✖/.test(b.innerText || '') && !b.disabled && !b.getAttribute('aria-label') && /^[A-Za-z'’-]+[.,!?]?$/.test((b.innerText || '').trim()))[0] || null; })()`, { settle: 200 });
        const placed1 = await tab.eval(PLACED); const bank1 = await tab.eval(BANK);
        await H.click(tab, btnBy("/전체 초기화/"), { settle: 600 });
        const placed2 = await tab.eval(PLACED); const bank2 = await tab.eval(BANK);
        const ok = placed1 === 3 && placed2 === 0 && bank2 === bank0 && bank1 === bank0 - 3;
        rec(`Z:ld-reset:${id}`, placed1 === 3 ? (ok ? "PASS" : "FAIL") : "BLOCKED", `보관함 ${bank0} → 3개 놓음: 놓인 ${placed1} · 보관함 ${bank1} → '↺ 전체 초기화': 놓인 ${placed2} · 보관함 ${bank2}`);
      }
    }

    // ---------- E. 검색 엔진에 보이는 기본(robots · sitemap · 제목 · 설명) ----------
    if (ONLY.has("E")) {
      const get = async (u) => { const r = await fetch(H.BASE + u, { redirect: "manual" }); return { status: r.status, text: await r.text() }; };
      const robots = await get("/robots.txt");
      const sm = await get("/sitemap.xml");
      const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const cnnInSitemap = locs.filter((u) => /\/cnn(\/|$)/.test(u)).length;
      // 설계(src/app/sitemap.ts RE-008 · SEO-01 · BUG-016): 첫 쪽 1 + 과정 6 + 소개 쪽 6 + 무료 체험 강의 12 = 25 — 잠긴 유료 쪽은 넣지 않음.
      // 첫 판은 '100 넘게' 를 기대해 FAIL(도구 기대 잘못) → 설계대로 꼭 그 25곳인지로
      const paths = locs.map((u) => new URL(u).pathname);
      const courses = ["/student", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading"];
      const free = ["/student/s1-1", "/student/s1-2", "/phonics/mv1-01", "/phonics/mv1-02", "/grammar1/gh1-006", "/grammar1/gh1-008", "/grammar2/gh2-007", "/grammar2/gh2-008", "/ld/d001", "/ld/d002", "/reading/pr001", "/reading/pr002"];
      const want = [...(BREAK === "E" ? ["/zz-break"] : []), "/", ...courses, ...free];
      const missing = want.filter((p) => !paths.includes(p));
      const smOk = sm.status === 200 && locs.length === 25 && !cnnInSitemap && !missing.length;
      rec("E:robots-sitemap", robots.status === 200 && /sitemap/i.test(robots.text) && smOk ? "PASS" : "FAIL", `robots.txt ${robots.status} · Sitemap 줄 ${/sitemap/i.test(robots.text)} · sitemap.xml ${sm.status} · 주소 ${locs.length}(설계 25) · CNN 주소 ${cnnInSitemap} · 빠진 기대 주소 ${missing.length}${missing.length ? ": " + missing.join(" ") : ""}`);
      for (const p of ["/", "/reading", "/student", "/reading/pr001"]) {
        const h = await get(p);
        const title = (h.text.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
        const desc = (h.text.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
        const og = /<meta property="og:title"/.test(h.text);
        const lang = (h.text.match(/<html[^>]*lang="([^"]+)"/) || [])[1] || "";
        rec(`E:meta:${p}`, h.status === 200 && title && desc && lang ? "PASS" : "FAIL", `HTTP ${h.status} · 제목 '${title.slice(0, 40)}' · 설명 ${desc.length}자 · og:title ${og} · lang ${lang}`);
      }
    }

    // ---------- K. 밖으로 가는 요청(추적 도구) ----------
    if (ONLY.has("K")) {
      await H.setViewport(tab, "desktop");
      hosts.clear();
      for (const p of ["/", "/reading", "/reading/pr001", "/ld/d001", "/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007"]) { await H.load(tab, p, { marker: null }); await H.sleep(3000); }
      const own = BREAK === "K" ? "kig-break.invalid" : new URL(H.BASE).host;
      const outside = [...hosts.entries()].filter(([h]) => h !== own).sort((a, b) => b[1] - a[1]);
      rec("K:third-party-hosts", outside.length ? "FAIL" : "PASS", `8쪽을 여는 동안 요청 호스트 ${hosts.size}곳 — 이 사이트 밖: ${outside.length ? outside.map(([h, n]) => `${h} ×${n}`).join(" · ") : "없음"}${BREAK === "K" ? " [깨기 — 이 사이트를 밖으로 셈]" : ""} · CSP connect-src 'self'`, { hosts: [...hosts.entries()] });
    }

    // ---------- X. 검색 칸에 코드를 넣어도 실행되지 않는가 ----------
    if (ONLY.has("X")) {
      await H.setViewport(tab, "desktop");
      for (const payload of [`<img src=x onerror="window.__kigXss=1">`, `"><svg onload="window.__kigXss=2">`]) {
        await H.load(tab, "/reading", { marker: null });
        await tab.eval("delete window.__kigXss").catch(() => {});
        await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
        const typed = await H.type(tab, `document.querySelector('[role=dialog] input')`, payload);
        await H.sleep(1500);
        const ran = await tab.eval("window.__kigXss || null").catch(() => null);
        const shownLiteral = await tab.eval(`((document.querySelector('[role=dialog]') || {}).innerText || '').includes(${JSON.stringify(payload.slice(0, 12))})`).catch(() => false);
        rec(`X:search-input:${payload.slice(0, 14)}`, typed ? (!ran && shownLiteral ? "PASS" : "FAIL") : "BLOCKED", `검색 칸에 넣음 → 실행됨 ${ran ? "예(" + ran + ")" : "아니오"} · 글자 그대로 보임 ${shownLiteral}`);
      }
      // 주소 뒤 물음표 값이 쪽에 그대로 박히는가
      const probe = `kigprobe<b>x</b>`;
      const r = await fetch(`${H.BASE}/reading?q=${encodeURIComponent(probe)}`);
      const html = await r.text();
      rec("X:url-reflection:/reading?q=", html.includes(probe) ? "FAIL" : "PASS", `HTTP ${r.status} · 넣은 글이 쪽에 그대로 ${html.includes(probe) ? "있음" : "없음"}`);
    }

    await tab.close();
  } finally {
    browser.proc.kill();
    console.log(`\n끝 · PASS ${counts.PASS} · FAIL ${counts.FAIL} · BLOCKED ${counts.BLOCKED} · INFO ${counts.INFO} → ${OUT}`);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
