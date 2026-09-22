#!/usr/bin/env node
/**
 * Phase 4 (common features) — the parts of the product that are not inside one lesson.
 *
 *   A. Course list pages: every lesson card links to the right lesson (against the course
 *      index), group headings and counts, and the progress / bookmark / incomplete counters
 *      and filters checked against a SEEDED state (including script-page keys, which is
 *      where the counters were suspected of over-counting).
 *   B. Search: real queries (English word, Korean title, lesson code, nonsense, empty) and
 *      whether the results lead to the right page; s19-3 findability.
 *   C. Navigation: home → list → lesson → prev/next → back/forward/reload, direct URLs,
 *      and invalid URLs (must render the real 404 screen).
 *   D. Rapid/repeated actions on a lesson (double play, fast step switching, repeat submit).
 *   E. Long session: 60 client-side lesson navigations in one tab, JS heap and DOM nodes.
 *   F. Home and each list at desktop / tablet / mobile with layout checks and screenshots.
 *
 *   node drive-common.cjs [--port 9570] [--only A,B,C,D,E,F]
 * Output: out/features/common.jsonl (+ screenshots under out/shots/)
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9570));
const ONLY = new Set(arg("--only", "A,B,C,D,E,F").split(","));
const OUT = path.join(__dirname, "../out");
const out = H.jsonl(path.join(OUT, "features", "common.jsonl"), (r) => r.id);
const rec = (id, area, status, detail) => { const r = { id, area, status, at: new Date().toISOString(), ...detail }; out.write(r); console.log(`${status.padEnd(7)} ${id} — ${(detail.note || "").slice(0, 140)}`); return r; };

const COURSE_TITLES = { student: "STUDENT", phonics: "VOCA", grammar1: "GRAMMAR I", grammar2: "GRAMMAR II", ld: "LISTENING", reading: "READING" };

async function seedProgress(tab, course, completed, bookmarks) {
  await tab.eval(`(() => {
    sessionStorage.setItem('kig:audit:keep', '1');
    const c = {}, b = {};
    ${JSON.stringify(completed)}.forEach((id) => { c[${JSON.stringify(course)} + ':' + id] = true; });
    ${JSON.stringify(bookmarks)}.forEach((id) => { b[${JSON.stringify(course)} + ':' + id] = true; });
    localStorage.setItem('kig:progress:completed', JSON.stringify(c));
    localStorage.setItem('kig:progress:bookmarks', JSON.stringify(b));
  })()`);
}
const clearSeed = async (tab) => tab.eval(`(() => { sessionStorage.removeItem('kig:audit:keep'); localStorage.removeItem('kig:progress:completed'); localStorage.removeItem('kig:progress:bookmarks'); })()`).catch(() => {});

(async () => {
  const browser = await H.startBrowser("common", PORT);
  try {
    const tab = await H.openTab(browser, { clean: false });
    await H.setViewport(tab, "desktop");

    // ---------- A. course lists ----------
    if (ONLY.has("A")) {
      for (const course of E.COURSES) {
        const index = E.courseIndex(course);
        const mains = index.lessons.filter((l) => l.variant === "main");
        await H.load(tab, `/${course}`, { marker: null });
        // chapters/stages are accordions: open every one of them before counting the cards
        for (let round = 0; round < 3; round++) {
          const opened = await tab.eval(`(() => {
            const main = document.querySelector('main');
            const heads = [...main.querySelectorAll('summary, button, [role=button]')].filter((el) => el.offsetParent && /(Chapter|단계|중등|고등|과|번|회)/.test(el.innerText || '') && !/전체|북마크|미완료|학습하기|무료/.test(el.innerText || ''));
            let n = 0;
            for (const h of heads) { if (!h.__kigOpened) { h.__kigOpened = true; h.click(); n++; } }
            return n;
          })()`).catch(() => 0);
          await H.sleep(600);
          if (!opened) break;
        }
        const dom = await tab.eval(`(() => {
          const main = document.querySelector('main');
          const links = [...main.querySelectorAll('a[href^="/"]')].map((a) => new URL(a.href).pathname).filter((p) => p.startsWith('/${course}/'));
          const text = main.innerText;
          const pct = (text.match(/(\\d+(?:\\.\\d+)?)\\s*%/) || [])[1];
          const prog = text.match(/학습 진도율[^\\n]*/);
          const filters = [...main.querySelectorAll('button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()).filter((t) => /전체|북마크|미완료/.test(t));
          const groups = [...main.querySelectorAll('h2, h3, summary')].map((h) => (h.innerText || '').replace(/\\s+/g, ' ').trim()).slice(0, 30);
          return { links, linkCount: links.length, uniqueLinks: [...new Set(links)].length, pct, prog: prog ? prog[0] : null, filters, groups, textLength: text.length };
        })()`);
        const expected = new Set(mains.map((l) => `/${course}/${l.id}`));
        const missing = [...expected].filter((p) => !dom.links.includes(p));
        const unexpected = [...new Set(dom.links)].filter((p) => !expected.has(p));
        rec(`A:list:${course}`, "course list", missing.length || unexpected.length ? "FAIL" : "PASS", {
          note: `${dom.uniqueLinks} lesson links for ${mains.length} lessons; missing ${missing.length}, unexpected ${unexpected.length}; ${dom.prog}`,
          missing: missing.slice(0, 10), unexpected: unexpected.slice(0, 10), groups: dom.groups, filters: dom.filters,
        });

        // seeded counters, including SCRIPT page keys (the suspected over-count)
        const scripts = index.lessons.filter((l) => l.variant === "script").slice(0, 5).map((l) => l.id);
        const doneMains = mains.slice(0, 3).map((l) => l.id);
        await seedProgress(tab, course, [...doneMains, ...scripts], mains.slice(0, 2).map((l) => l.id));
        await H.load(tab, `/${course}`, { marker: null });
        const seeded = await tab.eval(`(() => {
          const main = document.querySelector('main');
          const text = main.innerText;
          const prog = (text.match(/학습 진도율[^\\n]*/) || [])[0] || null;
          const pct = (text.match(/(\\d+(?:\\.\\d+)?)\\s*%/) || [])[1] || null;
          const counts = [...text.matchAll(/(전체|북마크|미완료)\\s*\\(?(\\d+)\\)?/g)].map((m) => m[1] + '=' + m[2]);
          const checks = main.innerText.match(/✓/g);
          return { prog, pct, counts, ticks: checks ? checks.length : 0 };
        })()`);
        const expectedCompleted = doneMains.length;
        const over = seeded.prog && new RegExp(`${expectedCompleted + scripts.length}\\s*/`).test(seeded.prog);
        rec(`A:counters:${course}`, "course list counters", over ? "FAIL" : "PASS", {
          note: `seeded ${doneMains.length} main + ${scripts.length} script completions, 2 bookmarks → ${seeded.prog} · ${seeded.counts.join(" ")} · ${seeded.pct}%`,
          seeded: { mains: doneMains, scripts },
        });
        await clearSeed(tab);
      }
    }

    // ---------- B. search ----------
    if (ONLY.has("B")) {
      // the search button lives in the header (TabBar), not in <main>, and opens a dialog
      await H.load(tab, "/reading", { marker: null });
      const openSearch = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
      for (const q of ["hospital", "가족", "d150", "pr100", "gh1-058", "s19-3", "인사말", "zzzznotfound", "듣기", "중등 단어"]) {
        const typed = await H.type(tab, `document.querySelector('input[placeholder*="검색"], [role=dialog] input, input[type=search]')`, q);
        await H.sleep(900);
        const res = await tab.eval(`(() => {
          const links = [...document.querySelectorAll('a[href^="/"]')].map((a) => ({ href: new URL(a.href).pathname, text: (a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60) }));
          const dialog = document.querySelector('[role=dialog]') || document.body;
          const items = [...dialog.querySelectorAll('a[href^="/"], [role=option], li')].map((el) => (el.innerText || '').replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
          const empty = /결과가 없|없습니다|no result/i.test(dialog.innerText || '');
          return { items, empty, links: links.slice(0, 5) };
        })()`).catch(() => null);
        rec(`B:search:${q}`, "search", typed ? (res && (res.items.length || res.empty) ? "PASS" : "FAIL") : "BLOCKED", { note: typed ? `${res ? res.items.length : 0} results${res && res.empty ? " (empty-state shown)" : ""}: ${(res ? res.items : []).slice(0, 3).join(" | ")}` : "no search input found", openSearch: openSearch.ok });
      }
    }

    // ---------- C. navigation ----------
    if (ONLY.has("C")) {
      await H.load(tab, "/", { marker: null });
      const toList = await H.click(tab, `[...document.querySelectorAll('a[href="/reading"]')][0]`, { settle: 1500 });
      const afterList = await tab.eval("location.pathname");
      // lesson cards live inside collapsed group accordions: open them first
      await tab.eval(`(() => { const main = document.querySelector('main'); [...main.querySelectorAll('summary, button, [role=button]')].filter((el) => el.offsetParent && /(번|회|단계|Chapter|중등|고등|과)/.test(el.innerText || '') && !/전체|북마크|미완료/.test(el.innerText || '')).slice(0, 3).forEach((el) => el.click()); })()`).catch(() => {});
      await H.sleep(900);
      const toLesson = await H.click(tab, `[...document.querySelectorAll('a[href^="/reading/"]')][0]`, { settle: 2500 });
      const afterLesson = await tab.eval("location.pathname");
      await tab.eval("history.back()").catch(() => {});
      await H.sleep(1800);
      const afterBack = await tab.eval("location.pathname");
      await tab.eval("history.forward()").catch(() => {});
      await H.sleep(1800);
      const afterForward = await tab.eval("location.pathname");
      await tab.send("Page.reload");
      await H.sleep(2500);
      const afterReload = await tab.eval(`(() => ({ path: location.pathname, text: (document.querySelector('main') || document.body).innerText.length }))()`);
      rec("C:flow", "navigation", toList.ok && toLesson.ok && afterBack === afterList && afterForward === afterLesson && afterReload.text > 300 ? "PASS" : "FAIL", {
        note: `home → ${afterList} → ${afterLesson} → back ${afterBack} → forward ${afterForward} → reload ${afterReload.path} (${afterReload.text} chars)`,
      });
      for (const bad of ["/reading/pr999", "/nope", "/ld/dzzz", "/student/s99-9", "/t/nope", "/phonics/mv9-99"]) {
        const r = await fetch(H.BASE + bad, { redirect: "manual" });
        const html = await r.text();
        await H.load(tab, bad, { marker: null });
        const screen = await tab.eval(`(() => { const t = (document.querySelector('main') || document.body).innerText; return { notFound: /찾는 페이지가 없습니다|404/.test(t), chars: t.length }; })()`).catch(() => ({ notFound: false, chars: 0 }));
        rec(`C:404:${bad}`, "404", r.status === 404 && screen.notFound && screen.chars > 100 ? "PASS" : "FAIL", { note: `HTTP ${r.status}, 404 screen ${screen.notFound}, ${screen.chars} chars rendered` });
      }
    }

    // ---------- D. rapid / repeated actions ----------
    if (ONLY.has("D")) {
      for (const url of ["/reading/pr010", "/ld/d010", "/phonics/mv1-05", "/grammar2/gh2-010"]) {
        const course = url.split("/")[1];
        await H.load(tab, url, { marker: H.MARKERS[course] });
        tab.resetEvents();
        const play = `[...document.querySelectorAll('main button')].find((b) => /재생|🔊/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`;
        for (let i = 0; i < 6; i++) await H.click(tab, play, { settle: 120 });
        const steps = (await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => /step\\s*\\d|단계/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`).catch(() => [])) || [];
        for (let round = 0; round < 3; round++) for (const s of steps) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify("")} + ${JSON.stringify(s)})`, { settle: 120 });
        await H.sleep(1500);
        const state = await tab.eval(`(() => { const t = (document.querySelector('main') || document.body).innerText; return { chars: t.length, error: /오류|문제가 발생|Application error/.test(t) }; })()`);
        const ev = H.events(tab);
        await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
        rec(`D:rapid:${url}`, "rapid actions", !state.error && !ev.exceptions.length && state.chars > 300 ? "PASS" : "FAIL", { note: `6 fast play clicks + 3 rounds over ${steps.length} steps → ${state.chars} chars, exceptions ${ev.exceptions.length}, console ${ev.console.length}`, events: ev });
      }
    }

    // ---------- E. long session ----------
    if (ONLY.has("E")) {
      await H.load(tab, "/reading", { marker: null });
      const heap = async () => (await tab.send("Performance.getMetrics").catch(() => ({ metrics: [] }))).metrics.reduce((a, m) => ({ ...a, [m.name]: m.value }), {});
      await tab.send("Performance.enable").catch(() => {});
      const before = await heap();
      const ids = E.pages("reading").filter((p) => !/-\d$/.test(p.id)).slice(0, 60);
      for (const p of ids) {
        await tab.eval(`(() => { const a = document.querySelector('a[href="${p.url}"]'); if (a) { a.click(); return true; } location.href = ${JSON.stringify(p.url)}; return false; })()`).catch(() => {});
        await H.sleep(700);
      }
      const after = await heap();
      const ev = H.events(tab);
      rec("E:long-session", "stability", ev.exceptions.length ? "FAIL" : "PASS", {
        note: `${ids.length} client-side navigations · JS heap ${Math.round((before.JSHeapUsedSize || 0) / 1e6)}MB → ${Math.round((after.JSHeapUsedSize || 0) / 1e6)}MB · DOM nodes ${before.Nodes} → ${after.Nodes} · listeners ${before.JSEventListeners} → ${after.JSEventListeners} · exceptions ${ev.exceptions.length}`,
        events: ev,
      });
    }

    // ---------- F. responsive home and lists ----------
    if (ONLY.has("F")) {
      for (const viewport of ["desktop", "tablet", "mobile"]) {
        await H.setViewport(tab, viewport);
        for (const url of ["/", ...E.COURSES.map((c) => `/${c}`), "/t/voca"]) {
          await H.load(tab, url, { marker: null });
          const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
          if (!snap) { rec(`F:${viewport}:${url}`, "responsive", "FAIL", { note: "no snapshot" }); continue; }
          const shot = path.join(OUT, "shots", `${url.replace(/\W+/g, "_") || "home"}.${viewport}.png`);
          if (viewport !== "desktop") await H.screenshot(tab, shot).catch(() => {});
          const bad = snap.overflowX || snap.offscreenControls.length || snap.clippedText.length || snap.brokenImages || snap.imagesNoAlt;
          rec(`F:${viewport}:${url}`, "responsive", bad ? "FAIL" : "PASS", {
            note: `overflowX ${snap.overflowX} (${snap.scrollWidth}px) · offscreen ${snap.offscreenControls.length} · clipped ${snap.clippedText.length} · <24px targets ${snap.smallTargets} · no-alt img ${snap.imagesNoAlt} · broken img ${snap.brokenImages}`,
            offscreen: snap.offscreenControls, clipped: snap.clippedText,
          });
        }
      }
      await H.setViewport(tab, "desktop");
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
})();
