/**
 * Browser-side helpers + CDP plumbing for the GRAMMAR I driver.
 *
 * `pageHelpers` is injected with Page.addScriptToEvaluateOnNewDocument, so it
 * survives reloads and client-side navigation. It ONLY reads the DOM and
 * returns plain data; every state change the audit makes goes through the
 * harness's trusted click / type, never through element.click().
 *
 * Two exceptions, both recorded in the driver's notes:
 *   - a fake SpeechRecognition (the mic cannot work headless) — results are
 *     reported as "UI wiring only";
 *   - navigator.clipboard.writeText is wrapped so the copy buttons can be
 *     verified; the original promise (and its rejection) is passed through
 *     unchanged, so the app's missing .catch still shows up as an unhandled
 *     rejection.
 */
const H = require("./harness.cjs");

function pageHelpers() {
  if (window.__g1) return;
  const T = (el) => (el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : null);
  const all = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const btn = (root, test) => all("button", root).find((b) => test(T(b) || "")) || null;
  const main = () => document.querySelector("main");
  const hydrated = (el) => !!el && Object.keys(el).some((k) => k.startsWith("__react"));
  const badge = (card) => all("span", card).find((s) => /rounded-full/.test(s.className) && /font-mono/.test(s.className));

  const g = {
    clip: [], clipOk: [], clipErr: [], rejections: [], stt: [],

    T,
    // --- page chrome -------------------------------------------------------
    ready() {
      const m = main();
      if (!m) return false;
      if (!(m.innerText || "").includes("Step 1 · 영작 훈련")) return false;
      return hydrated(g.actionBtn("bookmark")) && hydrated(g.pill(1));
    },
    paywall: () => /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED|순차 학습 잠금/.test(((main() || document.body).innerText) || ""),
    h1: () => T(document.querySelector("main h1")),
    title: () => document.title,
    headerCount() {
      const m = ((main() || {}).innerText || "").match(/총\s*(\d+)\s*개 문항/);
      return m ? Number(m[1]) : null;
    },
    headerTitle() {
      const m = ((main() || {}).innerText || "").match(/(Grammar [12] : [^\n]*)/);
      return m ? m[1].trim() : null;
    },
    savedAt() {
      const m = ((main() || {}).innerText || "").match(/([^\n]*?)\s*자동 저장됨/);
      return m ? m[1].trim() : null;
    },
    stepText(limit) {
      const t = ((main() || {}).innerText || "");
      return limit ? t.slice(0, limit) : t;
    },

    pills: () => all('nav[aria-label="문법 4단계 학습 모드"] button'),
    pill: (k) => g.pills()[k - 1] || null,
    pillLabels: () => g.pills().map(T),
    activeStep: () => g.pills().findIndex((b) => /bg-ink/.test(b.className)) + 1,

    batchBtn(kind) {
      const m = main();
      if (kind === "reveal") return btn(m, (t) => t.includes("전체 정답 보기"));
      if (kind === "hide") return btn(m, (t) => t.includes("전체 정답 가리기"));
      if (kind === "reset") return btn(m, (t) => t.includes("모든 작성 내용 초기화"));
      return null;
    },
    speedBtn: (r) => all("main button").find((b) => b.title === (r === 0.85 ? "음성 속도 0.85x (천천히)" : "음성 속도 1.0x")) || null,
    speedPressed() {
      const on = (r) => { const b = g.speedBtn(r); return b ? b.getAttribute("aria-pressed") === "true" : null; };
      return { "1.0": on(1), "0.85": on(0.85) };
    },
    fontBtn: (label) => all("main button").find((b) => T(b) === label) || null,
    fontPressed() {
      const out = {};
      for (const l of ["기본", "크게", "특대"]) { const b = g.fontBtn(l); out[l] = b ? b.getAttribute("aria-pressed") === "true" : null; }
      return out;
    },

    actionBtn(kind) {
      if (kind === "bookmark") return document.querySelector('button[aria-label="북마크 추가"], button[aria-label="북마크 해제"]');
      return document.querySelector('button[aria-label="학습 완료 체크"], button[aria-label="학습 완료 취소"]');
    },
    actions() {
      const b = g.actionBtn("bookmark");
      const c = g.actionBtn("complete");
      return {
        bookmarkAria: b ? b.getAttribute("aria-label") : null,
        bookmarkText: T(b),
        completeAria: c ? c.getAttribute("aria-label") : null,
        completeText: T(c),
      };
    },

    nav() {
      const prev = document.querySelector('a[aria-label^="이전 강의"]');
      const next = document.querySelector('a[aria-label^="다음 강의"]');
      const back = document.querySelector('nav[aria-label="강의 이동"] a[href="/grammar1"]');
      const stepNav = document.querySelector('nav[aria-label="학습 단계 이동"]');
      const sb = stepNav ? all("button", stepNav) : [];
      const list = stepNav ? stepNav.querySelector("a") : null;
      const link = (a) => (a ? { href: a.getAttribute("href"), aria: a.getAttribute("aria-label"), text: T(a) } : null);
      return {
        prev: link(prev),
        next: link(next),
        backHref: back ? back.getAttribute("href") : null,
        stepPrev: sb[0] ? { text: T(sb[0]), disabled: !!sb[0].disabled } : null,
        stepNext: sb[1] ? { text: T(sb[1]), disabled: !!sb[1].disabled } : null,
        listHref: list ? list.getAttribute("href") : null,
      };
    },
    stepNavBtn: (kind) => {
      const nav = document.querySelector('nav[aria-label="학습 단계 이동"]');
      const sb = nav ? all("button", nav) : [];
      return kind === "prev" ? sb[0] || null : sb[1] || null;
    },

    rules() {
      const d = document.querySelector("main details");
      if (!d) return null;
      return {
        open: d.open,
        summary: T(d.querySelector("summary")),
        items: all("li", d).map((li) => {
          const ps = all("p", li);
          return { question: T(ps[0]), answer: T(ps[1]) };
        }),
      };
    },
    rulesSummaryEl: () => { const d = document.querySelector("main details"); return d ? d.querySelector("summary") : null; },

    // --- top player --------------------------------------------------------
    playerRoot() {
      const range = document.querySelector('input[aria-label="문장 이동"]');
      if (range) return range.closest("div.rounded-3xl");
      return document.querySelector("main div.rounded-3xl");
    },
    playerBtn(kind) {
      const root = g.playerRoot();
      if (!root) return null;
      if (kind === "play") return root.querySelector('button[aria-label="재생"], button[aria-label="일시정지"]');
      if (kind === "stop") return root.querySelector('button[aria-label="정지"]');
      if (kind === "prev") return root.querySelector('button[aria-label="이전 문장"]');
      if (kind === "next") return root.querySelector('button[aria-label="다음 문장"]');
      if (kind === "range") return root.querySelector('input[aria-label="문장 이동"]');
      return all("button", root).find((b) => T(b) === kind) || null;
    },
    player() {
      const root = g.playerRoot();
      if (!root) return null;
      const play = g.playerBtn("play");
      const stop = g.playerBtn("stop");
      const range = g.playerBtn("range");
      const counter = all("span", root).find((s) => /^\d+\/\d+$/.test(T(s) || ""));
      const status = all("span", root).find((s) => /재생 버튼을 눌러|음성 읽는 중|일시정지됨/.test(T(s) || ""));
      const label = root.querySelector("p");
      return {
        label: T(label),
        playAria: play ? play.getAttribute("aria-label") : null,
        stopDisabled: stop ? !!stop.disabled : null,
        counter: T(counter),
        valuetext: range ? range.getAttribute("aria-valuetext") : null,
        max: range ? Number(range.max) : null,
        value: range ? Number(range.value) : null,
        status: T(status),
        rates: all("button", root).filter((b) => /×$/.test(T(b) || "")).map((b) => ({ label: T(b), pressed: b.getAttribute("aria-pressed") === "true" })),
        hasAudioEl: !!root.querySelector("audio"),
      };
    },
    async checkClips(paths) {
      const out = {};
      await Promise.all(paths.map(async (p) => {
        try {
          const r = await fetch(p, { headers: { Range: "bytes=0-1" }, credentials: "include" });
          out[p] = r.status;
        } catch (e) { out[p] = "ERR"; }
      }));
      return out;
    },

    // --- Step 1 ------------------------------------------------------------
    s1cards: () => all('main input[aria-label$="번 영작 답안"]').map((i) => i.closest("div.rounded-2xl")),
    s1input: (i) => all('main input[aria-label$="번 영작 답안"]')[i] || null,
    s1modelCard(i) {
      const card = g.s1cards()[i];
      if (!card) return null;
      return Array.from(card.children).find((c) => (c.textContent || "").includes("모범 답안")) || null;
    },
    s1btn(i, kind) {
      const card = g.s1cards()[i];
      if (!card) return null;
      const bs = all("button", card);
      if (kind === "play") return bs.find((b) => /영어 정답 발음/.test(T(b) || "") || T(b) === "⏹️ 정지") || null;
      if (kind === "clear") return bs.find((b) => b.title === "지우기") || null;
      if (kind === "mic") return bs.find((b) => b.title === "마이크를 누르고 영어 문장을 소리내어 말해보세요.") || null;
      if (kind === "micReset") return bs.find((b) => /다시 녹음/.test(T(b) || "")) || null;
      if (kind === "reveal") return bs.find((b) => /정답 확인|정답 가리기/.test(T(b) || "")) || null;
      if (kind === "grade") return bs.find((b) => /맞음/.test(T(b) || "")) || null;
      if (kind === "retry") return bs.find((b) => /다시 풀기/.test(T(b) || "")) || null;
      if (kind === "copy") return bs.find((b) => /문장 복사|복사됨/.test(T(b) || "")) || null;
      if (kind === "modelPlay") return bs.find((b) => /발음 듣기/.test(T(b) || "")) || null;
      return null;
    },
    s1state(i) {
      const card = g.s1cards()[i];
      if (!card) return null;
      const input = card.querySelector("input[type=text]");
      const model = g.s1modelCard(i);
      const ps = model ? all("p", model) : [];
      const korean = all("p", card).filter((p) => !model || !model.contains(p))[0];
      const txt = T(card) || "";
      const fontMatch = korean ? (korean.className.match(/text-\[([\d.]+)px\]/) || [])[1] : null;
      return {
        label: T(badge(card)),
        korean: T(korean),
        koreanFont: fontMatch ? Number(fontMatch) : null,
        value: input ? input.value : null,
        aria: input ? input.getAttribute("aria-label") : null,
        placeholder: input ? input.getAttribute("placeholder") : null,
        exact: txt.includes("🎯 정답 일치!"),
        done: txt.includes("✓ 학습 완료"),
        review: txt.includes("↺ 복습 필요"),
        border: /border-emerald-500\/50/.test(card.className) ? "emerald" : /border-amber-500\/50/.test(card.className) ? "amber" : "plain",
        clearBtn: !!g.s1btn(i, "clear"),
        revealed: !!model,
        modelText: ps[0] ? T(ps[0]) : null,
        altText: ps[1] ? T(ps[1]) : null,
        revealBtn: T(g.s1btn(i, "reveal")),
        playBtn: T(g.s1btn(i, "play")),
        copyBtn: T(g.s1btn(i, "copy")),
        micBtn: T(g.s1btn(i, "mic")),
        micPanel: (txt.match(/(\d+)점 \(([^)]*)\)/) || []).slice(1),
        micError: (txt.match(/⚠️ ([^\n]{5,120})/) || [])[1] || null,
        micTranscript: (txt.match(/인식된 내 음성: "([^"]*)"/) || [])[1] || null,
      };
    },
    s1all() { return g.s1cards().map((_, i) => g.s1state(i)); },
    s1counters() {
      const t = T(main()) || "";
      const a = t.match(/작성 진행률 (\d+) \/ (\d+) (\d+)%/);
      const b = t.match(/자가 채점 정답률 (\d+) 개 맞음 (\d+)%/);
      return {
        answered: a ? Number(a[1]) : null,
        total: a ? Number(a[2]) : null,
        percent: a ? Number(a[3]) : null,
        correct: b ? Number(b[1]) : null,
        accuracy: b ? Number(b[2]) : null,
      };
    },

    // --- Step 2 ------------------------------------------------------------
    s2cards: () => all("main button").filter((b) => /전체 문장 듣기/.test(T(b) || "")).map((b) => b.closest("div.rounded-2xl")),
    s2btn(i, kind) {
      const card = g.s2cards()[i];
      if (!card) return null;
      const bs = all("button", card);
      if (kind === "play") return bs.find((b) => /전체 문장 듣기/.test(T(b) || "")) || null;
      if (kind === "reveal") return bs.find((b) => /빈칸 정답 확인|빈칸 가리기/.test(T(b) || "")) || null;
      return null;
    },
    s2blank: (i, k) => {
      const card = g.s2cards()[i];
      return card ? all('input[placeholder="___"]', card)[k] || null : null;
    },
    s2state(i) {
      const card = g.s2cards()[i];
      if (!card) return null;
      const box = all("div", card).find((d) => /flex-wrap/.test(d.className));
      const tokens = box ? Array.from(box.children).map((ch) => {
        const inp = ch.querySelector ? ch.querySelector("input") : null;
        if (inp) {
          const mark = ch.querySelector('span[role="status"]');
          return {
            kind: "blank",
            value: inp.value,
            width: inp.style.width,
            aria: inp.getAttribute("aria-label"),
            placeholder: inp.getAttribute("placeholder"),
            mark: mark ? T(mark) : null,
            state: /border-emerald-500/.test(inp.className) ? "correct" : /border-red-500/.test(inp.className) ? "wrong" : "neutral",
          };
        }
        if (ch.className && /bg-emerald-500\/20/.test(ch.className)) return { kind: "answer", text: ch.textContent };
        return { kind: "text", text: ch.textContent };
      }) : [];
      return { label: T(badge(card)), korean: T(card.querySelector("p")), tokens, revealBtn: T(g.s2btn(i, "reveal")) };
    },
    s2all() { return g.s2cards().map((_, i) => g.s2state(i)); },
    s2blankCount: () => all('main input[placeholder="___"]').length,

    // --- Step 3 ------------------------------------------------------------
    s3cards: () => all('main button[title="문장 복사"]').map((b) => b.closest("div.rounded-2xl")),
    s3btn(i, kind) {
      const card = g.s3cards()[i];
      if (!card) return null;
      const bs = all("button", card);
      if (kind === "copy") return bs.find((b) => b.title === "문장 복사") || null;
      if (kind === "play") return bs.find((b) => b.title === "발음 듣기" || b.title === "발음 정지") || null;
      if (kind === "mic") return bs.find((b) => b.title === "마이크를 누르고 영어 문장을 소리내어 말해보세요.") || null;
      if (kind === "card") return all("p", card)[0] || null; // click target inside the card div
      return null;
    },
    s3state(i) {
      const card = g.s3cards()[i];
      if (!card) return null;
      const ps = all("p", card);
      const play = g.s3btn(i, "play");
      const copy = g.s3btn(i, "copy");
      const reps = all("span", card).find((s) => /회 연습|3회 달성/.test(T(s) || ""));
      return {
        label: T(badge(card)),
        badge: T(reps),
        english: T(ps[0]),
        korean: T(ps[1]),
        speaking: play ? play.title === "발음 정지" : null,
        copyAria: copy ? copy.getAttribute("aria-label") : null,
        micBtn: T(g.s3btn(i, "mic")),
        englishFont: ps[0] ? Number((ps[0].className.match(/text-\[([\d.]+)px\]/) || [])[1]) : null,
      };
    },
    s3all() { return g.s3cards().map((_, i) => g.s3state(i)); },

    // --- Step 4 ------------------------------------------------------------
    s4inputs: () => all('main input[aria-label$="번 시험 답안"]'),
    s4input: (i) => g.s4inputs()[i] || null,
    s4row: (i) => { const inp = g.s4input(i); return inp ? inp.closest("div.p-5") : null; },
    s4btn(i, kind) {
      const row = g.s4row(i);
      if (!row) return null;
      if (kind === "play") return all("button", row).find((b) => /발음 청취/.test(T(b) || "")) || null;
      return null;
    },
    s4state(i) {
      const row = g.s4row(i);
      if (!row) return null;
      const inp = g.s4input(i);
      const txt = T(row) || "";
      const spans = all("span", row);
      const q = spans.find((s) => /^Q.+\.$/.test(T(s) || ""));
      const ko = q ? q.parentElement.querySelectorAll("span")[1] : null;
      const modelRow = Array.from(row.children).find((c) => (c.textContent || "").includes("모범 답안:"));
      const mSpans = modelRow ? all("span", modelRow) : [];
      return {
        q: T(q),
        korean: T(ko),
        value: inp ? inp.value : null,
        aria: inp ? inp.getAttribute("aria-label") : null,
        placeholder: inp ? inp.getAttribute("placeholder") : null,
        disabled: inp ? !!inp.disabled : null,
        badge: /✓ 정답 \(100점\)/.test(txt) ? "exact" : /△ 부분 정답 \(70점\)/.test(txt) ? "partial" : /✕ 오답 \(0점\)/.test(txt) ? "incorrect" : null,
        model: mSpans[1] ? T(mSpans[1]) : null,
        alt: mSpans[2] ? T(mSpans[2]) : null,
        border: inp ? (/border-emerald-500\/60/.test(inp.className) ? "emerald" : /border-amber-500\/60/.test(inp.className) ? "amber" : /border-red-500\/60/.test(inp.className) ? "red" : "plain") : null,
      };
    },
    s4all() { return g.s4inputs().map((_, i) => g.s4state(i)); },
    s4summary() {
      const m = main();
      const txt = T(m) || "";
      const num = (re) => { const x = txt.match(re); return x ? Number(x[1]) : null; };
      const ans = txt.match(/작성 완료: (\d+) \/ (\d+) 문항/);
      const submit = btn(m, (t) => /전체 시험 채점하기/.test(t));
      const edit = btn(m, (t) => /답안 다시 수정하기/.test(t));
      return {
        score: num(/최종 획득 점수 (\d+)점/),
        exact: num(/정답 일치: (\d+)개/),
        partial: num(/부분 일치: (\d+)개/),
        answered: ans ? Number(ans[1]) : null,
        total: ans ? Number(ans[2]) : null,
        warning: /작성한 문항이 없습니다/.test(txt),
        submit: submit ? { text: T(submit), disabled: !!submit.disabled } : null,
        edit: edit ? { text: T(edit) } : null,
      };
    },
    s4submitBtn: () => btn(main(), (t) => /전체 시험 채점하기/.test(t)),
    s4editBtn: () => btn(main(), (t) => /답안 다시 수정하기/.test(t)),

    // --- storage -----------------------------------------------------------
    storage(pageId) {
      const j = (k) => { try { return JSON.parse(window.localStorage.getItem(k) || "null"); } catch (e) { return "PARSE_ERROR"; } };
      const wk = "kig:grammar:work:grammar1/" + pageId;
      return {
        workPresent: window.localStorage.getItem(wk) !== null,
        work: j(wk),
        completed: j("kig:progress:completed"),
        bookmarks: j("kig:progress:bookmarks"),
        recent: j("kig:progress:recent"),
      };
    },
    clearPageState(pageId) {
      try {
        window.localStorage.removeItem("kig:grammar:work:grammar1/" + pageId);
        for (const key of ["kig:progress:completed", "kig:progress:bookmarks"]) {
          const map = JSON.parse(window.localStorage.getItem(key) || "{}");
          if (map && typeof map === "object" && map["grammar1:" + pageId]) {
            delete map["grammar1:" + pageId];
            window.localStorage.setItem(key, JSON.stringify(map));
          }
        }
      } catch (e) { return String(e && e.message); }
      return "ok";
    },
    /** Housekeeping only: stops any playback through the player's own 정지 button. */
    stopAll() {
      const stop = g.playerBtn("stop");
      if (stop && !stop.disabled) { stop.click(); return true; }
      return false;
    },
    focusEl(el) { if (el) { el.focus(); return document.activeElement === el; } return false; },
    micSet(next) { window.__sttNext = next; return true; },
    counts() {
      return {
        s1: g.s1cards().length,
        s2: g.s2cards().length,
        s2blanks: g.s2blankCount(),
        s3: g.s3cards().length,
        s4: g.s4inputs().length,
      };
    },
  };

  // Fake speech recognition — the microphone cannot work headless.
  class KigFakeRecognition {
    constructor() { this.lang = "en-US"; this.continuous = false; this.interimResults = true; this.maxAlternatives = 1; }
    start() {
      const self = this;
      setTimeout(() => {
        try { if (self.onstart) self.onstart(); } catch (e) {}
        const next = window.__sttNext || { transcript: "", error: null };
        g.stt.push(next);
        if (next.error) {
          try { if (self.onerror) self.onerror({ error: next.error }); } catch (e) {}
        } else {
          const alt = { transcript: String(next.transcript || ""), confidence: 0.9 };
          const res = [alt];
          res.isFinal = true;
          try { if (self.onresult) self.onresult({ resultIndex: 0, results: [res] }); } catch (e) {}
        }
        try { if (self.onend) self.onend(); } catch (e) {}
      }, 20);
    }
    stop() { try { if (this.onend) this.onend(); } catch (e) {} }
    abort() {}
  }
  window.__sttNext = { transcript: "", error: null };
  try { Object.defineProperty(window, "SpeechRecognition", { value: KigFakeRecognition, writable: true, configurable: true }); } catch (e) {}
  try { Object.defineProperty(window, "webkitSpeechRecognition", { value: KigFakeRecognition, writable: true, configurable: true }); } catch (e) {}

  try {
    const nc = navigator.clipboard;
    if (nc && nc.writeText) {
      const orig = nc.writeText.bind(nc);
      nc.writeText = (text) => {
        g.clip.push(String(text));
        return orig(text).then(
          () => { g.clipOk.push(String(text)); },
          (err) => { g.clipErr.push(String((err && err.message) || err)); throw err; },
        );
      };
    }
  } catch (e) {}

  window.addEventListener("unhandledrejection", (e) => {
    g.rejections.push(String((e.reason && e.reason.message) || e.reason).slice(0, 200));
  });

  window.__g1 = g;
}

const INIT = `(${pageHelpers.toString()})()`;

/** Capture dialogs, redirects, clip statuses and the document status per tab. */
function hookTab(tab) {
  tab.dialogs = [];
  tab.dialogAccept = false;
  tab.redirects = [];
  tab.clipStatus = {};
  tab.docStatus = null;
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    try {
      const p = msg.params || {};
      if (msg.method === "Page.javascriptDialogOpening") {
        tab.dialogs.push({ type: p.type, message: p.message, accepted: !!tab.dialogAccept });
        tab.send("Page.handleJavaScriptDialog", { accept: !!tab.dialogAccept }).catch(() => {});
      } else if (msg.method === "Network.requestWillBeSent" && p.redirectResponse) {
        const h = p.redirectResponse.headers || {};
        tab.redirects.push({
          from: p.redirectResponse.url,
          status: p.redirectResponse.status,
          location: h.location || h.Location || null,
          to: (p.request || {}).url || null,
        });
      } else if (msg.method === "Network.responseReceived") {
        const url = (p.response || {}).url || "";
        if (url.includes("/audio/azure-ava/")) {
          try { tab.clipStatus[new URL(url).pathname] = p.response.status; } catch (e) {}
        }
        if (p.type === "Document") tab.docStatus = { url, status: p.response.status };
      }
    } catch (e) {
      // never let instrumentation break the session
    }
    orig(msg);
  };
  tab.resetHooks = () => {
    tab.dialogs = [];
    tab.redirects = [];
    tab.clipStatus = {};
    tab.docStatus = null;
  };
}

/** A tab with the audio hook, the page helpers, focus emulation and clipboard permission. */
async function openTab(browser, notes = []) {
  const tab = await H.openTab(browser);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: INIT });
  hookTab(tab);
  try { await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true }); } catch (e) { notes.push("focus emulation unavailable: " + e.message); }
  try {
    await tab.send("Browser.grantPermissions", { origin: H.BASE, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
    tab.clipboardGranted = true;
  } catch (e) {
    tab.clipboardGranted = false;
    notes.push("clipboard permission not granted: " + e.message);
  }
  return tab;
}

/** Press a key with a trusted event (Space needs its text to activate a button). */
async function key(tab, { key: k, code, vk, text }) {
  const base = { key: k, code, windowsVirtualKeyCode: vk || 0 };
  await tab.send("Input.dispatchKeyEvent", text ? { type: "keyDown", text, unmodifiedText: text, ...base } : { type: "rawKeyDown", ...base });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

module.exports = { INIT, openTab, hookTab, key, pageHelpers };
