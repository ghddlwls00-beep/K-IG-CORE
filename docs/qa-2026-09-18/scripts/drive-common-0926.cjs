#!/usr/bin/env node
/**
 * 관문 뒤 공통 기능 다시 (2026-09-26 — 사장님 "너 추천대로 하자" · "계속해").
 * 9/18 drive-common.cjs(A~F)를 지금 운영 사이트에 다시 돌린다. 9/18 판은 그대로 두고, 가짜 통과를 막으려고 이 판에서 바꾼 것:
 *   - 시작 때 이용권 사본이 살아 있는지(유료 /ld/d010 이 잠김 화면이 아닌지) — 잠겼으면 아무것도 적지 않고 멈춤.
 *   - STUDENT 진도를 서버에 쓰는 요청(POST /api/progress/student)은 막음 — 사장님 이용권 기록 보호. 막은 요청은 기록에 남김.
 *   - A 진도 숫자: 넣은 상태(본 강의 3 완료 · 대본 쪽 5 완료 · 북마크 2)와 화면 '학습 진도율 N / T개 완료 (P%)' · 전체 · 북마크 · 미완료가 꼭 같아야 PASS,
 *     못 읽으면 BLOCKED. 북마크 · 미완료 거르기를 눌러 보이는 강의가 맞는지도. STUDENT 는 진도가 서버 기록(BUG-030)이라 넣지 않고 화면 숫자끼리만.
 *   - B 검색: 번호 · 제목 검색은 결과를 눌러 그 강의로 가는지까지. 결과 수는 앱의 검색 함수(searchMatch.ts)를 같은 색인에 돌린 수와 같아야.
 *   - C 이동: 첫 쪽 → 목록 → 강의 → 뒤로 → 앞으로 → 새로고침 · 유료 강의 주소 바로 열기 + 새로고침 · 없는 주소 6개는 404 화면.
 *   - D 빠른 동작(6과정 한 쪽씩): 잠김 화면이면 BLOCKED · 재생 6번 연타 + 두 번 누르기 · 단계 빨리 바꾸기 3바퀴 → 그 뒤 '한 번 더 재생' 이 소리를 내는지 ·
 *     '다음 강의' 를 0.25초마다 6번(불러오는 중에 누르기) → 주소와 화면의 강의가 같은지 · LISTENING 받아쓰기 '정답 채점하기' 6번 연타 → STEP 2 완료 수가 한 번만 느는지.
 *   - E 오래 켜 두기: 목록 ↔ 강의 60번(화면 안 이동인지 셈) · 같은 목록 쪽에서 GC 뒤 두 번 재어 메모리 · DOM · 이벤트 수가 문턱을 넘게 늘면 FAIL.
 *   - F 화면 크기: 9/18 과 같음(첫 쪽 · 과정 목록 6 · /t/voca × 컴퓨터 · 태블릿 · 휴대폰).
 *   - --break A|B|C|D|E|F: 그 부분을 일부러 깨서 FAIL 이 나는지 — 기록은 따로 파일(common-0926-break-X.jsonl). --only 와 같이 씀.
 *
 *   KIG_PROFILE_SOURCE · KIG_CLONE_PREFIX 와 함께(lib/profile.cjs):
 *   node drive-common-0926.cjs [--only A,B,C,D,E,F] [--break X] [--port 9571] [--free]
 *   --free: 이용권 없는 새 브라우저(빈 폴더를 KIG_PROFILE_SOURCE 로) — 무료 체험 강의만 씀. 2026-09-26 04:26~04:31 TEMP 가 통째로 지워져
 *           이용권 원본(kig-audit-licensed-profile)과 사본이 없어졌기 때문(이 세션이 지운 것 아님 · 휴지통에도 없음).
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");
const ts = require(path.join(H.REPO, "node_modules/typescript"));

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9571));
const ONLY = new Set(arg("--only", "A,B,C,D,E,F").split(","));
const BREAK = arg("--break", "");
// --free: 이용권 없는 새 브라우저로 — 무료 체험 강의(과정마다 둘, license.ts FREE_PREVIEW_LESSON_IDS)만 씀. 2026-09-26 04:26~04:31 TEMP 가 지워져 이용권 원본 · 사본이 없어짐.
const FREE = process.argv.includes("--free");
const TAG = arg("--tag", "");
const OUTFILE = path.join(H.OUT, "features", BREAK ? `common-0926-break-${BREAK}${TAG}.jsonl` : `common-0926${TAG}.jsonl`);
fs.mkdirSync(path.dirname(OUTFILE), { recursive: true });
const counts = { PASS: 0, FAIL: 0, BLOCKED: 0 };
const rec = (id, area, status, detail) => {
  const r = { id, area, status, at: new Date().toISOString(), ...(BREAK ? { break: BREAK } : {}), ...detail };
  fs.appendFileSync(OUTFILE, JSON.stringify(r) + "\n");
  counts[status] = (counts[status] || 0) + 1;
  console.log(`${status.padEnd(7)} ${id} — ${(detail.note || "").slice(0, 170)}`);
  return r;
};
const brk = (x) => BREAK === x;

// 앱 코드를 그대로(타입만 지워) 불러 씀 — 검색 기대값 · 받아쓰기 낱말
const L = (rel) => { const js = ts.transpileModule(fs.readFileSync(path.join(H.REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, (x) => (x.startsWith(".") || x.startsWith("@/") ? {} : require(x))); return m.exports; };
const SEARCH = L("src/lib/searchMatch.ts");
const LU = L("src/lib/listeningUtils.ts");
const INDEX = JSON.parse(fs.readFileSync(path.join(H.REPO, "public/search-index.json"), "utf8"));
const SCRIPTS = JSON.parse(fs.readFileSync(path.join(H.REPO, "content/ld_english_scripts.json"), "utf8"));
const titleOf = (course, id) => (INDEX.find((i) => i.course === course && i.id === id) || {}).title || null;

const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
const mainText = `((document.querySelector('main') || document.body).innerText || '')`;
const PAYWALLED = `${H.PAYWALL_RE}.test(${mainText})`;

// ---- 사장님 이용권 기록 보호: STUDENT 진도 서버 쓰기(GET 말고 전부)를 막고 적어 둠
const blocked = [];
async function guardTab(tab) {
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    if (msg.method === "Fetch.requestPaused") {
      const p = msg.params;
      if (!/^(GET|HEAD|OPTIONS)$/.test(p.request.method)) {
        blocked.push({ at: new Date().toISOString(), method: p.request.method, url: p.request.url.replace(H.BASE, "") });
        tab.send("Fetch.failRequest", { requestId: p.requestId, errorReason: "BlockedByClient" }).catch(() => {});
      } else tab.send("Fetch.continueRequest", { requestId: p.requestId }).catch(() => {});
      return;
    }
    return orig(msg);
  };
  await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/progress/student*", requestStage: "Request" }] });
}
// 막은 요청 탓의 'Failed to fetch' 는 앱 결함이 아님 — 그것만 빼고 셈
const realExceptions = (ev) => ev.exceptions.filter((x) => !(blocked.length && /Failed to fetch/.test(JSON.stringify(x))));

async function openAccordions(tab) {
  // 접힌 장 머리는 aria-expanded="false"(CourseDashboard.tsx) — 글로 거르지 않음. 9/18 판의 글 거르기(/무료/ 빼기)는 이용권 없이 보면
  // 첫 장 머리에 '1·2강 무료 체험' 이 붙어 그 장을 건너뜀(2026-09-26 첫 판 A:list:student 빠짐 6 = s1-1 ~ s1-6 — 도구 탓, 이 줄로 고침)
  for (let round = 0; round < 4; round++) {
    const opened = await tab.eval(`(() => {
      const main = document.querySelector('main');
      const heads = [...main.querySelectorAll('[aria-expanded="false"]')].filter((el) => el.offsetParent);
      for (const h of heads) h.click();
      return heads.length;
    })()`).catch(() => 0);
    await H.sleep(600);
    if (!opened) break;
  }
}
const listLinks = (course) => `(() => { const main = document.querySelector('main'); return [...new Set([...main.querySelectorAll('a[href^="/"]')].map((a) => new URL(a.href).pathname).filter((p) => p.startsWith('/${course}/')))]; })()`;
const COUNTERS = `(() => { const t = ${mainText};
  const m = t.match(/학습 진도율:\\s*(\\d+)\\s*\\/\\s*(\\d+)개 완료\\s*\\((\\d+)%\\)/);
  const n = (re) => { const x = t.match(re); return x ? Number(x[1]) : null; };
  return { done: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null, pct: m ? Number(m[3]) : null, all: n(/전체\\s*\\((\\d+)\\)/), bookmarks: n(/북마크\\s*\\((\\d+)\\)/), incomplete: n(/미완료\\s*\\((\\d+)\\)/) };
})()`;
const chip = (re) => `[...document.querySelectorAll('main button')].find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ')))`;
async function seed(tab, course, completed, bookmarks) {
  await tab.eval(`(() => {
    const c = {}, b = {};
    ${JSON.stringify(completed)}.forEach((id) => { c[${JSON.stringify(course)} + ':' + id] = true; });
    ${JSON.stringify(bookmarks)}.forEach((id) => { b[${JSON.stringify(course)} + ':' + id] = true; });
    localStorage.setItem('kig:progress:completed', JSON.stringify(c));
    localStorage.setItem('kig:progress:bookmarks', JSON.stringify(b));
  })()`);
}
const clearSeed = (tab) => tab.eval(`(() => { localStorage.removeItem('kig:progress:completed'); localStorage.removeItem('kig:progress:bookmarks'); })()`).catch(() => {});

(async () => {
  const browser = await H.startBrowser(BREAK ? `common0926-break-${BREAK}` : "common0926", PORT, { fresh: true });
  try {
    const tab = await H.openTab(browser, { clean: false });
    await guardTab(tab);
    await H.setViewport(tab, "desktop");

    // ---- 이용권 사본이 살아 있나 — 잠겼으면 모든 유료 쪽 판정이 가짜가 되므로 멈춤.
    //      --free: 이용권이 없어야 맞고(유료 d010 잠김), 무료 d001 은 열려야 함 — 둘 중 하나라도 어긋나면 멈춤
    if (FREE) {
      await H.load(tab, "/ld/d010", { marker: null });
      const paidLocked = await tab.eval(PAYWALLED).catch(() => false);
      await H.load(tab, "/ld/d001", { marker: H.MARKERS.ld });
      const freeOpen = !(await tab.eval(PAYWALLED).catch(() => true));
      if (!paidLocked || !freeOpen) { console.log(`멈춤: --free 인데 유료 잠김 ${paidLocked} · 무료 열림 ${freeOpen}`); process.exitCode = 3; return; }
      console.log(`이용권 없는 브라우저 · 유료 d010 잠김 · 무료 d001 열림 확인 · 기록 → ${OUTFILE}`);
    } else {
      await H.load(tab, "/ld/d010", { marker: H.MARKERS.ld });
      if (await tab.eval(PAYWALLED).catch(() => true)) { console.log("멈춤: 이용권 사본이 잠김 화면 — KIG_PROFILE_SOURCE 확인"); process.exitCode = 3; return; }
      console.log(`이용권 사본 열림 확인(/ld/d010) · 기록 → ${OUTFILE}`);
    }

    // ---- 깨기: 그 부분의 앱 쪽에 결함을 심음(운영은 안 바뀜 — 이 브라우저 안에서만)
    if (brk("D")) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('click', () => setTimeout(() => { throw new Error('kig-break-D'); }), true);` });
    if (brk("E")) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__kigLeak = []; setInterval(() => window.__kigLeak.push(new Array(131072).fill(Math.random())), 250);` });
    if (brk("F")) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'main { min-width: 1600px !important; }'; document.head.appendChild(s); });` });

    // ---------- A. 과정 목록 · 진도 숫자 · 거르기 ----------
    if (ONLY.has("A")) {
      for (const course of E.COURSES) {
        const index = E.courseIndex(course);
        const mains = index.lessons.filter((l) => l.variant === "main");
        await clearSeed(tab);
        await H.load(tab, `/${course}`, { marker: null });
        await openAccordions(tab);
        const links = await tab.eval(listLinks(course));
        const expected = new Set(mains.map((l) => `/${course}/${l.id}`));
        if (brk("A")) expected.add(`/${course}/zz-break`);
        const missing = [...expected].filter((p) => !links.includes(p));
        const unexpected = links.filter((p) => !expected.has(p));
        rec(`A:list:${course}`, "course list", missing.length || unexpected.length ? "FAIL" : "PASS", { note: `강의 링크 ${links.length} · 목록 ${mains.length} · 빠짐 ${missing.length} · 없는 것 ${unexpected.length}`, missing: missing.slice(0, 10), unexpected: unexpected.slice(0, 10) });

        if (course === "student" && !FREE) {
          // 이용권이 있으면 진도가 서버 기록 — 넣지 않고 화면 숫자끼리만(--free 는 서버에 안 가므로 다른 과정과 같이 넣어 봄)
          const c = await tab.eval(COUNTERS);
          const readable = c.done !== null && c.all !== null && c.incomplete !== null;
          const ok = readable && c.total === mains.length && c.all === mains.length && c.incomplete === c.total - c.done && c.pct === Math.round((c.done / c.total) * 100);
          rec(`A:counters:${course}`, "course list counters", readable ? (ok ? "PASS" : "FAIL") : "BLOCKED", { note: `서버 진도(넣지 않음): 진도 ${c.done}/${c.total} (${c.pct}%) · 전체 ${c.all} · 북마크 ${c.bookmarks} · 미완료 ${c.incomplete} — 미완료 = 전체 − 완료 · 전체 = 목록 ${mains.length}`, counters: c });
          continue;
        }
        const scripts = index.lessons.filter((l) => l.variant === "script").slice(0, 5).map((l) => l.id);
        const doneMains = mains.slice(0, 3).map((l) => l.id);
        const marks = mains.slice(0, 2).map((l) => l.id);
        await seed(tab, course, [...doneMains, ...scripts], marks);
        await H.load(tab, `/${course}`, { marker: null });
        const c = await tab.eval(COUNTERS);
        const N = mains.length;
        const want = { done: brk("A") ? 4 : 3, total: N, pct: Math.round((3 / N) * 100), all: N, bookmarks: 2, incomplete: N - 3 };
        const readable = c.done !== null && c.bookmarks !== null && c.incomplete !== null;
        const diffs = Object.keys(want).filter((k) => c[k] !== want[k]);
        rec(`A:counters:${course}`, "course list counters", readable ? (diffs.length ? "FAIL" : "PASS") : "BLOCKED", { note: `넣음: 본 강의 ${doneMains.length} + 대본 쪽 ${scripts.length} 완료 · 북마크 ${marks.length} → 진도 ${c.done}/${c.total} (${c.pct}%) · 전체 ${c.all} · 북마크 ${c.bookmarks} · 미완료 ${c.incomplete}${diffs.length ? ` · 다른 칸 ${diffs.join(",")}` : ""}`, counters: c, want });

        // 북마크 거르기 → 북마크한 두 강의만
        const bm = await H.click(tab, chip("/북마크\\s*\\(/"), { settle: 900 });
        await openAccordions(tab);
        const bmLinks = await tab.eval(listLinks(course));
        const bmWant = marks.map((id) => `/${course}/${id}`);
        const bmOk = bm.ok && bmLinks.length === bmWant.length && bmWant.every((p) => bmLinks.includes(p));
        rec(`A:filter-bookmarks:${course}`, "course list filters", bm.ok ? (bmOk ? "PASS" : "FAIL") : "BLOCKED", { note: `북마크 거르기 → 강의 ${bmLinks.length}(기대 ${bmWant.length}: ${bmWant.join(" ")})`, shown: bmLinks.slice(0, 6) });
        // 미완료 거르기 → 완료한 셋은 없고 N − 3
        const inc = await H.click(tab, chip("/미완료\\s*\\(/"), { settle: 900 });
        await openAccordions(tab);
        const incLinks = await tab.eval(listLinks(course));
        const doneShown = doneMains.map((id) => `/${course}/${id}`).filter((p) => incLinks.includes(p));
        const incOk = inc.ok && incLinks.length === N - 3 && !doneShown.length;
        rec(`A:filter-incomplete:${course}`, "course list filters", inc.ok ? (incOk ? "PASS" : "FAIL") : "BLOCKED", { note: `미완료 거르기 → 강의 ${incLinks.length}(기대 ${N - 3}) · 완료한 것이 보임 ${doneShown.length}` });
        await H.click(tab, chip("/전체\\s*\\(/"), { settle: 600 });
        await clearSeed(tab);
      }
    }

    // ---------- B. 검색 ----------
    if (ONLY.has("B")) {
      const QUERIES = [
        { q: "d150", go: "/ld/d150" }, { q: "pr100", go: "/reading/pr100" }, { q: "gh1-058", go: "/grammar1/gh1-058" },
        { q: "s19-3", go: "/student/s19-3" }, { q: "mv1-05", go: "/phonics/mv1-05" }, { q: "불고기", go: "/student/s19-3" },
        { q: "인사말", pick: { course: "student", id: "s1-1" } }, { q: "중등 단어" }, { q: "듣기" },
        { q: "zzzznotfound", empty: true }, { q: "hospital", empty: true, note: "영어 낱말 검색은 만들지 않음(사장님 결정 BUG-011) — 결과 없음이 설계대로" },
      ];
      for (const t of QUERIES) {
        await H.load(tab, "/reading", { marker: null });
        const open = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
        const typed = open.ok && (await H.type(tab, `document.querySelector('[role=dialog] input')`, t.q));
        await H.sleep(1100);
        const shown = await tab.eval(`(() => { const d = document.querySelector('[role=dialog]'); if (!d) return null; return { items: [...d.querySelectorAll('li button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()), empty: /검색 결과가 없습니다/.test(d.innerText || '') }; })()`).catch(() => null);
        const expectItems = SEARCH.searchItems(INDEX, t.q);
        if (!typed || !shown) { rec(`B:search:${t.q}`, "search", "BLOCKED", { note: "검색 창 · 입력 칸을 못 찾음" }); continue; }
        let status = "PASS"; let note = `결과 ${shown.items.length}(앱 검색 함수 ${expectItems.length})${shown.empty ? " · '검색 결과가 없습니다'" : ""}`;
        if (shown.items.length !== expectItems.length) status = "FAIL";
        if (t.empty && !(shown.empty && !shown.items.length)) status = "FAIL";
        if (!t.empty && !shown.items.length) status = "FAIL";
        let landed = null;
        const target = t.go ? { course: t.go.split("/")[1], id: t.go.split("/")[2] } : t.pick;
        if (target && shown.items.length) {
          const title = titleOf(target.course, target.id);
          const idx = expectItems.findIndex((i) => i.course === target.course && i.id === target.id);
          await H.click(tab, `[...document.querySelectorAll('[role=dialog] li button')][${Math.max(0, idx)}]`, { settle: 2500 });
          landed = await tab.eval("location.pathname").catch(() => null);
          const want = brk("B") ? `/${target.course}/zz-break` : `/${target.course}/${target.id}`;
          if (idx < 0 || landed !== want) status = "FAIL";
          note += ` · '${title}' 을 눌러 → ${landed}(기대 ${want})`;
        }
        rec(`B:search:${t.q}`, "search", status, { note: note + (t.note ? ` · ${t.note}` : ""), items: shown.items.slice(0, 5) });
      }
    }

    // ---------- C. 이동 ----------
    if (ONLY.has("C")) {
      await H.load(tab, "/", { marker: null });
      const toList = await H.click(tab, `[...document.querySelectorAll('a[href="/reading"]')].find((a) => a.offsetParent) || document.querySelector('a[href="/reading"]')`, { settle: 1800 });
      const afterList = await tab.eval("location.pathname");
      await openAccordions(tab);
      const toLesson = await H.click(tab, `[...document.querySelectorAll('main a[href^="/reading/pr"]')].find((a) => a.offsetParent)`, { settle: 2500 });
      const afterLesson = await tab.eval("location.pathname");
      await tab.eval("history.back()").catch(() => {});
      await H.sleep(2000);
      const afterBack = await tab.eval("location.pathname");
      await tab.eval("history.forward()").catch(() => {});
      await H.sleep(2000);
      const afterForward = await tab.eval("location.pathname");
      await tab.send("Page.reload");
      await H.sleep(3000);
      const afterReload = await tab.eval(`({ path: location.pathname, chars: ${mainText}.length })`);
      const wantBack = brk("C") ? "/nope" : afterList;
      const reached = toList.ok && toLesson.ok && afterList === "/reading" && /^\/reading\/pr\d+$/.test(afterLesson);
      rec("C:flow", "navigation", !reached ? "BLOCKED" : afterBack === wantBack && afterForward === afterLesson && afterReload.path === afterLesson && afterReload.chars > 300 ? "PASS" : "FAIL", {
        note: `첫 쪽 → ${afterList} → ${afterLesson} → 뒤로 ${afterBack}(기대 ${wantBack}) → 앞으로 ${afterForward} → 새로고침 ${afterReload.path} (${afterReload.chars}자)`,
      });
      // 강의 주소 바로 열기 + 새로고침 → 잠기지 않고 그대로(--free: 무료 강의)
      const DIRECT = FREE ? "/ld/d001" : "/ld/d150";
      const direct = await H.load(tab, DIRECT, { marker: H.MARKERS.ld });
      const lock1 = await tab.eval(PAYWALLED).catch(() => true);
      await tab.send("Page.reload");
      await H.sleep(3500);
      const after = await tab.eval(`({ path: location.pathname, chars: ${mainText}.length, lock: ${PAYWALLED} })`);
      rec(`C:direct-reload:${DIRECT}`, "navigation", direct.rendered && !lock1 && !after.lock && after.path === DIRECT && after.chars > 300 ? "PASS" : "FAIL", { note: `주소로 바로 열기 ${direct.rendered ? "뜸" : "안 뜸"} · 잠김 ${lock1} → 새로고침 뒤 ${after.path} · ${after.chars}자 · 잠김 ${after.lock}` });
      const BAD = ["/reading/pr999", "/nope", "/ld/dzzz", "/student/s99-9", "/t/nope", "/phonics/mv9-99", ...(brk("C") ? ["/reading/pr001"] : [])];
      for (const bad of BAD) {
        const r = await fetch(H.BASE + bad, { redirect: "manual" });
        await r.text();
        await H.load(tab, bad, { marker: null });
        const screen = await tab.eval(`(() => { const t = ${mainText}; return { notFound: /찾는 페이지가 없습니다|404/.test(t), chars: t.length }; })()`).catch(() => ({ notFound: false, chars: 0 }));
        rec(`C:404:${bad}`, "404", r.status === 404 && screen.notFound && screen.chars > 100 ? "PASS" : "FAIL", { note: `HTTP ${r.status} · 404 화면 ${screen.notFound} · ${screen.chars}자` });
      }
    }

    // ---------- D. 빠르게 · 여러 번 ----------
    if (ONLY.has("D")) {
      const playExpr = `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => /재생|🔊/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')))`;
      const RAPID = FREE ? ["/reading/pr001", "/ld/d001", "/phonics/mv1-01", "/grammar2/gh2-007", "/grammar1/gh1-006", "/student/s1-1"] : ["/reading/pr010", "/ld/d010", "/phonics/mv1-05", "/grammar2/gh2-010", "/grammar1/gh1-006", "/student/s1-1"];
      for (const url of RAPID) {
        const course = url.split("/")[1];
        const loaded = await H.load(tab, url, { marker: H.MARKERS[course] });
        if (!loaded.rendered || (await tab.eval(PAYWALLED).catch(() => true))) { rec(`D:rapid:${url}`, "rapid actions", "BLOCKED", { note: loaded.rendered ? "잠김 화면" : "안 뜸" }); continue; }
        tab.resetEvents();
        // 재생 단추는 누르면 🔊 → ⏹️ 로 바뀜(ReadingLearningView 등) — 첫 판은 글로 다시 찾다가 1 ~ 2번만 누름(도구 탓).
        // 처음 찾은 단추에 표를 달아 같은 단추를 6번(재생 ↔ 정지 연타), 단추가 새로 그려지면 재생/정지 글로 다시 찾아 표를 닮
        const tagPlay = (re) => `(() => { const b = [...document.querySelectorAll('main button')].filter(${VIS}).find((x) => ${re}.test((x.getAttribute('aria-label') || '') + (x.innerText || ''))); if (!b) return false; document.querySelectorAll('[data-kig-play]').forEach((x) => x.removeAttribute('data-kig-play')); b.setAttribute('data-kig-play', '1'); return true; })()`;
        const tagged = `document.querySelector('main [data-kig-play="1"]')`;
        await tab.eval(tagPlay("/재생|🔊/")).catch(() => false);
        let clicks = 0;
        for (let i = 0; i < 6; i++) {
          if (!(await tab.eval(`Boolean(${tagged})`).catch(() => false))) await tab.eval(tagPlay("/재생|🔊|⏹|정지/")).catch(() => false);
          if ((await H.click(tab, tagged, { settle: 120 })).ok) clicks++;
        }
        // 두 번 누르기(진짜 마우스 두 번) — 같은 재생 단추
        if (!(await tab.eval(`Boolean(${tagged})`).catch(() => false))) await tab.eval(tagPlay("/재생|🔊|⏹|정지/")).catch(() => false);
        const rect = await tab.eval(`(() => { const b = ${tagged}; if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`).catch(() => null);
        if (rect) for (const [type, n] of [["mousePressed", 1], ["mouseReleased", 1], ["mousePressed", 2], ["mouseReleased", 2]]) await tab.send("Input.dispatchMouseEvent", { type, x: rect.x, y: rect.y, button: "left", clickCount: n });
        const steps = (await tab.eval(`[...document.querySelectorAll('main button')].filter(${VIS}).filter((b) => /step\\s*\\d|단계/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`).catch(() => [])) || [];
        for (let round = 0; round < 3; round++) for (const s of steps) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(s)})`, { settle: 120 });
        await H.sleep(1500);
        // 폭풍 뒤 한 번 더 — 사람처럼 앱의 '정지' 로 멈추고(켜져 있을 때까지 기다림 — 문장 사이 약 0.3초는 정지 단추가 꺼짐: BUG-034,
        // 첫 판은 그 틈에 눌러 '안 멈춤' 을 앱 탓처럼 셈) 첫 단계로 가서 재생 한 번이 새로 소리를 시작하는가
        const STOPBTN = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => (x.getAttribute('aria-label') || '') === '정지')`;
        for (let k = 0; k < 8; k++) {
          const st = await tab.eval(`(() => { const s = ${STOPBTN}; return s ? (s.disabled ? 'off' : 'on') : 'none'; })()`).catch(() => "none");
          if (st === "on") { await H.click(tab, STOPBTN, { settle: 600 }); break; }
          if (st === "none") break;
          await H.sleep(250);
        }
        await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
        await H.sleep(800);
        if (steps.length) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(steps[0])})`, { settle: 900 });
        await tab.eval(tagPlay("/재생|🔊/")).catch(() => false);
        await H.audioLog(tab, { clear: true });
        const again = await H.click(tab, tagged, { settle: 200 });
        let sound = false, audioErr = [];
        for (let i = 0; i < 25 && !sound; i++) {
          await H.sleep(200);
          const log = await H.audioLog(tab);
          sound = log.some((e) => /^(playing|play-resolved|tts\.speak)$/.test(e.ev));
          audioErr = log.filter((e) => /^(error|play-rejected|play-threw)$/.test(e.ev)).map((e) => `${e.ev}${e.name ? " " + e.name : ""}`);
        }
        await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
        const state = await tab.eval(`(() => { const t = ${mainText}; return { chars: t.length, error: /문제가 발생|Application error|오류가 발생/.test(t) }; })()`);
        const ev = H.events(tab);
        const exc = realExceptions(ev);
        // 연타가 6번 다 눌려야 연타를 본 것 — 못 누르면 BLOCKED(도구가 못 한 것), 판정은 그 뒤
        const ok = again.ok && sound && !audioErr.length && !state.error && !exc.length && state.chars > 300;
        rec(`D:rapid:${url}`, "rapid actions", clicks === 6 && rect ? (ok ? "PASS" : "FAIL") : "BLOCKED", { note: `재생 ↔ 정지 연타 ${clicks}/6 + 두 번 누르기 ${rect ? "함" : "못 함"} · 단계 ${steps.length}개 × 3바퀴 → 멈춘 뒤 한 번 더 재생: 누름 ${again.ok} · 새 소리 ${sound} · 소리 오류 ${audioErr.length} · ${state.chars}자 · 오류 글 ${state.error} · 예외 ${exc.length}${ev.exceptions.length !== exc.length ? `(막은 요청 탓 ${ev.exceptions.length - exc.length} 뺌)` : ""}`, exceptions: exc.slice(0, 3), audioErr });
      }

      // '다음 강의' 를 불러오는 중에 연달아 — 끝난 뒤 주소와 화면 강의가 같은가
      // --free: 무료 첫 강의에서 시작 — 셋째부터는 잠김 화면이지만 강의 머리(제목)는 그대로 그려짐(주소 · 화면 강의가 같은지는 그대로 봄)
      for (const start of FREE ? ["/ld/d001", "/reading/pr001"] : ["/ld/d010", "/reading/pr010"]) {
        const course = start.split("/")[1];
        await H.load(tab, start, { marker: H.MARKERS[course] });
        tab.resetEvents();
        let pressed = 0;
        for (let i = 0; i < 6; i++) {
          const r = await tab.eval(`(() => { const a = [...document.querySelectorAll('a[aria-label^="다음 강의"]')].find((x) => x.offsetParent); if (!a) return false; a.click(); return true; })()`).catch(() => false);
          if (r) pressed++;
          await H.sleep(250);
        }
        await H.sleep(3500);
        const now = await tab.eval("location.pathname");
        const id = now.split("/")[2];
        const title = titleOf(course, id) || "";
        const head = title.split(" · ")[0];
        const shown = await tab.eval(`${mainText}.includes(${JSON.stringify(head)})`).catch(() => false);
        const exc = realExceptions(H.events(tab));
        const moved = id !== start.split("/")[2];
        rec(`D:fast-next:${start}`, "rapid actions", pressed ? (moved && head && shown && !exc.length ? "PASS" : "FAIL") : "BLOCKED", { note: `'다음 강의' 0.25초마다 ${pressed}번 → ${now} · 화면에 '${head}' ${shown} · 예외 ${exc.length}` });
      }

      // 받아쓰기 '정답 채점하기' 연타 — 맞는 답을 조립한 뒤 6번 → STEP 2 완료 수가 한 번만
      {
        const id = FREE ? "d001" : "d020";
        const rows = SCRIPTS[id]; const all = rows.map((r) => r.en);
        const pool = [...new Set(all.flatMap((s) => s.split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, ""))))].filter(Boolean);
        const want = LU.generateWordBank(all[0], pool).correctWords;
        const btnBy = (re) => `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ')))`;
        const step2 = `(() => { const b = [...document.querySelectorAll('main button')].find((x) => /STEP 2/.test(x.innerText || '')); const m = b && (b.innerText || '').match(/\\((\\d+)\\s*\\/\\s*(\\d+)\\)/); return m ? Number(m[1]) : null; })()`;
        await H.load(tab, `/ld/${id}`, { marker: "STEP 2" });
        tab.resetEvents();
        await H.click(tab, `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => /STEP 2/.test(b.innerText || '') && /딕테이션/.test(b.innerText || ''))`, { settle: 800 });
        if (await tab.eval(`Boolean(${btnBy("/블록 탭 모드로 전환/")})`)) await H.click(tab, btnBy("/블록 탭 모드로 전환/"), { settle: 600 });
        await H.click(tab, `[...document.querySelectorAll('main button[aria-label]')].find((b) => /^문장 1(\\s|$)/.test(b.getAttribute('aria-label')))`, { settle: 500 });
        await H.click(tab, btnBy("/전체 초기화/"), { settle: 500 });
        const c0 = await tab.eval(step2);
        let placed = 0;
        for (const w of want) {
          const r = await H.click(tab, `(() => { const main = document.querySelector('main'); const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
            const bank = [...main.querySelectorAll('button')].filter(${VIS}).filter((b) => !/✕|✖/.test(b.innerText || '') && !/되돌리/.test(b.getAttribute('title') || '') && !b.disabled && !b.getAttribute('aria-label'));
            return bank.find((b) => norm(b.innerText || '') === norm(${JSON.stringify(w)})) || null; })()`, { settle: 150 });
          if (r.ok) placed++;
        }
        await H.click(tab, btnBy("/정답 채점하기/"), { settle: 700 });
        const c1 = await tab.eval(step2);
        for (let i = 0; i < 5; i++) await H.click(tab, btnBy("/정답 채점하기/"), { settle: 60 });
        await H.sleep(1200);
        const c2 = await tab.eval(step2);
        const fb = await tab.eval(`(() => { const m = ${mainText}.match(/정답입니다[^\\n]*|순서가 조금 다릅니다[^\\n]*/); return m ? m[0] : null; })()`);
        const exc = realExceptions(H.events(tab));
        const wantC2 = brk("D") ? c1 + 5 : c1;
        const ok = placed === want.length && /정답입니다/.test(fb || "") && c1 !== null && c2 === wantC2 && !exc.length;
        rec(`D:repeat-submit:/ld/${id}`, "rapid actions", c1 === null || placed !== want.length ? "BLOCKED" : ok ? "PASS" : "FAIL", { note: `1번 문장 낱말 ${placed}/${want.length} 조립 → 채점 1번: STEP 2 완료 ${c0} → ${c1} · 5번 더 연타 → ${c2}(기대 ${wantC2}) · 알림 '${fb}' · 예외 ${exc.length}` });
      }
    }

    // ---------- E. 오래 켜 두기 ----------
    if (ONLY.has("E")) {
      await tab.send("Performance.enable").catch(() => {});
      const metrics = async () => {
        await tab.send("HeapProfiler.collectGarbage").catch(() => {});
        await H.sleep(300);
        await tab.send("HeapProfiler.collectGarbage").catch(() => {});
        const m = (await tab.send("Performance.getMetrics").catch(() => ({ metrics: [] }))).metrics.reduce((a, x) => ({ ...a, [x.name]: x.value }), {});
        return { heapMB: Math.round((m.JSHeapUsedSize || 0) / 1e5) / 10, nodes: m.Nodes, listeners: m.JSEventListeners };
      };
      await H.load(tab, "/reading", { marker: null });
      tab.resetEvents();
      await tab.eval("window.__kigSameDoc = 1");
      // --free: 목록에 있는 무료 두 강의를 번갈아 30번(목록 ↔ 강의 60번)
      const lessons = FREE ? [...Array(30).keys()].map((i) => (i % 2 ? "/reading/pr002" : "/reading/pr001")) : E.courseIndex("reading").lessons.filter((l) => l.variant === "main").slice(0, 30).map((l) => `/reading/${l.id}`);
      // 이동마다 표를 새로 달고(첫 판은 한 번만 달아 한 번 새로 뜨면 그 뒤를 모두 '새로 뜸' 으로 셈 — 도구 탓) 목록에서는 장을 펴서 링크가 있게
      let client = 0, total = 0, arrived = 0, first = null;
      for (let i = 0; i < lessons.length; i++) {
        for (const target of [lessons[i], "/reading"]) {
          if (target !== "/reading") await openAccordions(tab);
          await tab.eval("window.__kigSameDoc = 1").catch(() => {});
          const how = await tab.eval(`(() => { const a = [...document.querySelectorAll('a[href="${target}"]')][0]; if (a) { a.click(); return 'link'; } location.href = ${JSON.stringify(target)}; return 'reload'; })()`).catch(() => "err");
          await H.sleep(900);
          total++;
          if (how === "link" && (await tab.eval("window.__kigSameDoc === 1").catch(() => false))) client++;
          if ((await tab.eval("location.pathname").catch(() => "")) === target) arrived++;
        }
        if (i === 4) first = await metrics();
      }
      await H.sleep(1000);
      const last = await metrics();
      const exc = realExceptions(H.events(tab));
      const grow = { heapMB: Math.round((last.heapMB - first.heapMB) * 10) / 10, nodes: last.nodes - first.nodes, listeners: last.listeners - first.listeners };
      const leak = grow.heapMB > 15 || grow.nodes > Math.max(300, first.nodes * 0.5) || grow.listeners > Math.max(200, first.listeners * 0.5);
      const status = client < total * 0.8 ? "BLOCKED" : exc.length || leak || arrived < total ? "FAIL" : "PASS";
      rec("E:long-session", "stability", status, { note: `목록 ↔ 강의 ${total}번(화면 안 이동 ${client} · 제자리 도착 ${arrived}) · 같은 목록 쪽 GC 뒤: 메모리 ${first.heapMB} → ${last.heapMB}MB · DOM ${first.nodes} → ${last.nodes} · 이벤트 ${first.listeners} → ${last.listeners} · 늘어남 ${JSON.stringify(grow)} · 문턱(메모리 15MB · DOM 50% · 이벤트 50%) · 예외 ${exc.length}`, first, last });
    }

    // ---------- F. 화면 크기 ----------
    if (ONLY.has("F")) {
      for (const viewport of ["desktop", "tablet", "mobile"]) {
        await H.setViewport(tab, viewport);
        for (const url of ["/", ...E.COURSES.map((c) => `/${c}`), "/t/voca"]) {
          await H.load(tab, url, { marker: null });
          const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
          if (!snap) { rec(`F:${viewport}:${url}`, "responsive", "FAIL", { note: "화면 정보 못 읽음" }); continue; }
          // 가로 넘침은 화면 폭(설정한 뷰포트)에 댐 — SNAPSHOT 의 innerWidth 비교는 태블릿 흉내에서 브라우저가 넓은 쪽을 줄여 맞추면
          // innerWidth 도 커져 넘침을 못 봄(2026-09-26 깨기 F: 태블릿 1,601px 인데 넘침 false — 이 줄로 고침)
          const wide = snap.overflowX || snap.scrollWidth > H.VIEWPORTS[viewport].width + 1;
          const bad = wide || snap.offscreenControls.length || snap.clippedText.length || snap.brokenImages || snap.imagesNoAlt;
          rec(`F:${viewport}:${url}`, "responsive", bad ? "FAIL" : "PASS", {
            note: `가로 넘침 ${wide} (${snap.scrollWidth}px / 화면 ${H.VIEWPORTS[viewport].width}px) · 화면 밖 단추 ${snap.offscreenControls.length} · 잘린 글 ${snap.clippedText.length} · 24px 안 되는 단추 ${snap.smallTargets} · alt 없는 그림 ${snap.imagesNoAlt} · 깨진 그림 ${snap.brokenImages}`,
            offscreen: snap.offscreenControls, clipped: snap.clippedText,
          });
        }
      }
      await H.setViewport(tab, "desktop");
    }
    await tab.close();
  } finally {
    browser.proc.kill();
    fs.appendFileSync(OUTFILE, JSON.stringify({ id: "Z:summary", area: "summary", at: new Date().toISOString(), ...(BREAK ? { break: BREAK } : {}), counts, blockedWrites: blocked }) + "\n");
    console.log(`\n끝 · PASS ${counts.PASS} · FAIL ${counts.FAIL} · BLOCKED ${counts.BLOCKED} · 막은 STUDENT 진도 쓰기 ${blocked.length} → ${OUTFILE}`);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
