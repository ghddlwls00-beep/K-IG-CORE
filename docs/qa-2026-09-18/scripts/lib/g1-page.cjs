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
  /*
   * 2026-09-27 (GRAMMAR 학습법 · 화면 고침 — GRM-U02 · U04 · U05 · U11 · U12 · L01 · L08): the view was rebuilt, so every
   * finder below keys on the data-* attributes the view now carries instead of the classes, emoji and words that left the
   * screen (div.rounded-2xl cards, span.rounded-full.font-mono numbers, '🎯 정답 일치!', '영어 정답 발음', '문장 복사',
   * '자가 채점 정답률', '모든 작성 내용 초기화', '답안 다시 수정하기', '정답 일치: N개'):
   *   an item          li[data-item="N"] inside section[data-step-panel="k"] (Step 4: li[data-exam-row])
   *   its number       [data-q] · Korean [data-ko] · Step 3 English [data-en]
   *   Step 1           [data-check] 확인 · [data-hint] · [data-mic] · [data-answer-panel] (after 확인) with [data-verdict],
   *                    [data-diff], [data-model], [data-alts], [data-play], [data-grade="correct|retry"] · [data-badge]
   *   Step 2           input[data-blank] (aria-label 'N번 문장 빈칸 (k/개수)') · [data-cloze-check] · [data-cloze-reveal] ·
   *                    [data-mark="correct|wrong"] (only after 확인 — GRM-L14) · [data-answer] once shown
   *   Step 3           [data-play] · [data-said] · [data-reps data-count]
   *   Step 4           [data-badge="exact|partial|incorrect"] (words unchanged) · [data-exam-summary data-score …] ·
   *                    [data-exam-submit] · [data-exam-action="new|retry-wrong"]
   *   the summary line [data-summary] with data-answered/total/correct/retry/accuracy (Step 1)
   *   '⋯ 더보기'       details[data-more] — open it (moreSummary) before pressing [data-action=…], [data-font], [data-speed]
   *   bundles          Steps 1–3 show ten items (ol[data-set]; the rest are hidden, not removed) — setNext / setPrev / bundleOf
   *   top player       folded in details[data-answer-player] in GRAMMAR (GRM-L03 ④) — open it (playerSummary) first; since 2026-10-08
 *                    (UI검토-1007 4장 7) at the end of Step 3 and of Step 4 after grading only — the view's [data-grammar-view] one
   */
  const panel = (k) => document.querySelector('main [data-step-panel="' + k + '"]');
  const itemsIn = (k) => { const p = panel(k); return p ? all("[data-item]", p) : []; };
  const badge = (card) => (card ? card.querySelector("[data-q]") : null);
  const more = () => { const p = document.querySelector("main [data-step-panel]"); return p ? p.querySelector("details[data-more]") : null; };
  const visible = (el) => !!el && !!(el.offsetParent || el.getClientRects().length);
  const FONT_KEY = { "기본": "normal", "크게": "large", "특대": "xlarge" };

  const g = {
    clip: [], clipOk: [], clipErr: [], rejections: [], stt: [],

    T,
    // --- page chrome -------------------------------------------------------
    ready() {
      const m = main();
      if (!m) return false;
      // textContent: on a phone the other steps' names are hidden, and the page may reopen on the step it was left on (GRM-U26)
      const first = g.pill(1);
      if (!first || !/Step\s*1/.test(first.textContent || "")) return false;
      return hydrated(g.actionBtn("bookmark")) && hydrated(first);
    },
    paywall: () => /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED|순차 학습 잠금/.test(((main() || document.body).innerText) || ""),
    h1: () => T(document.querySelector("main h1")),
    subtitle: () => T(document.querySelector("main header p")), // GRAMMAR only (GRM-U22)
    title: () => document.title,
    // the header box ('Grammar 1 : …' · '총 N개 문항') was removed on purpose (GRM-U05); the count is the summary's data-total
    headerCount() {
      const s = document.querySelector("main [data-summary][data-total]");
      return s ? Number(s.dataset.total) : null;
    },
    headerTitle() {
      return null;
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
    pillLabels: () => g.pills().map((b) => (b.textContent || "").replace(/\s+/g, " ").trim()),
    activeStep: () => g.pills().findIndex((b) => b.getAttribute("aria-pressed") === "true") + 1,

    moreSummary: () => { const d = more(); return d ? d.querySelector("summary") : null; },
    batchBtn(kind) {
      if (kind === "reveal") return document.querySelector('main [data-action="reveal-all"]');
      if (kind === "hide") return document.querySelector('main [data-action="hide-all"]');
      if (kind === "reset") return document.querySelector('main [data-action="reset"]');
      if (kind === "resetConfirm") return document.querySelector('main [data-action="reset-confirm"]'); // no window.confirm any more (GRM-U20)
      if (kind === "newRun") return document.querySelector('main [data-action="new-run"]');
      return null;
    },
    speedBtn: (r) => document.querySelector('main [data-speed="' + (r === 0.85 ? "0.85" : "1") + '"]'),
    speedPressed() {
      const on = (r) => { const b = g.speedBtn(r); return b ? b.getAttribute("aria-pressed") === "true" : null; };
      return { "1.0": on(1), "0.85": on(0.85) };
    },
    fontBtn: (label) => document.querySelector('main [data-font="' + (FONT_KEY[label] || label) + '"]'),
    fontPressed() {
      const out = {};
      for (const l of ["기본", "크게", "특대"]) { const b = g.fontBtn(l); out[l] = b ? b.getAttribute("aria-pressed") === "true" : null; }
      return out;
    },

    actionBtn(kind) {
      if (kind === "bookmark") return document.querySelector('button[aria-label="북마크 추가"], button[aria-label="북마크 해제"]');
      // UI검토-1007 59 (2026-10-08): named by its visible words — it was '학습 완료 체크' / '학습 완료 취소'
      return document.querySelector('button[aria-label="이 강의 학습 완료"], button[aria-label="학습 완료함 · 취소하려면 누르세요"]');
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
      const d = document.querySelector("main details[data-rule-summary]");
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
    rulesSummaryEl: () => { const d = document.querySelector("main details[data-rule-summary]"); return d ? d.querySelector("summary") : null; },

    // --- top player --------------------------------------------------------
    // UI검토-1007 4장 7 (2026-10-08): the page-level player above the step tabs stays in the DOM but hidden (display:none); the view
    // draws its own at the end of Step 3 (data-answer-player-step="3") and of Step 4 once graded ("4"). Open Step 3 first (pill(3)).
    // It used to be the first `main details[data-answer-player]` — now that is the hidden one.
    playerDetails: () => document.querySelector("main [data-grammar-view] details[data-answer-player]"),
    playerSummary: () => { const d = g.playerDetails(); return d ? d.querySelector("summary") : null; },
    // true when a details[data-answer-player] is on screen (Step 1 · 2 and Step 4 before grading: none)
    playerOnScreen: () => all("main details[data-answer-player]").some((d) => d.getClientRects().length > 0),
    playerRoot() {
      const d = g.playerDetails();
      const range = (d && d.querySelector('input[aria-label="문장 이동"]')) || document.querySelector('[data-grammar-view] input[aria-label="문장 이동"]');
      if (range) return range.closest("div.rounded-card, div.rounded-3xl");
      return document.querySelector("main div.rounded-card, main div.rounded-3xl");
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
      const details = g.playerDetails();
      return {
        folded: details ? !details.open : false,
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

    // --- bundles of ten (Steps 1–3, GRM-L08) --------------------------------
    setInfo() {
      const s = document.querySelector("main [data-set-nav]");
      return s ? { index: Number(s.dataset.setIndex), count: Number(s.dataset.setCount), text: T(s.querySelector("p")) } : null;
    },
    setNext: () => all("main [data-set-next]").find(visible) || null,
    setPrev: () => all("main [data-set-prev]").find(visible) || null,
    bundleOf(n) {
      const li = document.querySelector('main [data-step-panel] [data-item="' + n + '"]');
      const ol = li ? li.closest("[data-set]") : null;
      return ol ? Number(ol.dataset.set) : null;
    },

    // --- Step 1 ------------------------------------------------------------
    s1cards: () => itemsIn(1),
    s1input: (i) => all('main [data-step-panel="1"] [aria-label$="번 영작 답안"]')[i] || null,
    s1modelCard(i) {
      const card = g.s1cards()[i];
      return card ? card.querySelector("[data-answer-panel]") : null;
    },
    s1btn(i, kind) {
      const card = g.s1cards()[i];
      if (!card) return null;
      const q = (sel) => card.querySelector(sel);
      if (kind === "play" || kind === "modelPlay") return q("[data-answer-panel] [data-play]"); // only after 확인 (GRM-L03 ①)
      if (kind === "check" || kind === "reveal") return q("[data-check]");
      if (kind === "hint") return q("[data-hint]");
      if (kind === "mic") return q("[data-mic]");
      if (kind === "micUndo") return q("[data-mic-undo]");
      if (kind === "grade") return q('[data-grade="correct"]');
      if (kind === "retry") return q('[data-grade="retry"]');
      if (kind === "next") return q("[data-next]");
      return null; // clear (GRM-U19) · copy (GRM-U12) · micReset: removed
    },
    s1state(i) {
      const card = g.s1cards()[i];
      if (!card) return null;
      const input = card.querySelector('[aria-label$="번 영작 답안"]');
      const model = g.s1modelCard(i);
      const korean = card.querySelector("[data-ko]");
      const b = card.querySelector("[data-badge]");
      const verdict = card.querySelector("[data-verdict]");
      const micLine = card.querySelector("[data-mic-line]");
      const micGrade = card.querySelector("[data-mic-grade]");
      const alts = model ? model.querySelector("[data-alts]") : null;
      const play = g.s1btn(i, "play");
      const mic = g.s1btn(i, "mic");
      return {
        label: T(badge(card)),
        korean: T(korean),
        koreanFont: korean ? parseFloat(getComputedStyle(korean).fontSize) : null,
        value: input ? input.value : null,
        aria: input ? input.getAttribute("aria-label") : null,
        placeholder: input ? input.getAttribute("placeholder") : null,
        visible: visible(card),
        verdict: verdict ? verdict.dataset.verdict : null,
        exact: !!verdict && verdict.dataset.verdict === "exact",
        done: !!b && b.dataset.badge === "done",
        review: !!b && b.dataset.badge === "review",
        hinted: !!b && b.dataset.badge === "hint",
        border: "plain", // items carry no coloured border now (GRM-U11) — read badge / verdict
        clearBtn: false,
        revealed: !!model,
        modelText: model ? T(model.querySelector("[data-model]")) : null,
        altText: alts ? T(alts) : null,
        diff: model ? T(model.querySelector("[data-diff]")) : null,
        revealBtn: T(g.s1btn(i, "check")),
        playBtn: play ? play.getAttribute("aria-label") : null,
        copyBtn: null,
        micBtn: mic ? mic.getAttribute("aria-label") : null,
        micPanel: micGrade ? [micGrade.dataset.micGrade] : [],
        micError: T(card.querySelector("[data-mic-error]")),
        micTranscript: micLine ? ((T(micLine) || "").match(/들은 문장: “([^”]*)”/) || [])[1] || null : null,
      };
    },
    s1all() { return g.s1cards().map((_, i) => g.s1state(i)); },
    s1counters() {
      const s = document.querySelector('main [data-step-panel="1"] [data-summary]');
      if (!s) return { answered: null, total: null, percent: null, correct: null, retry: null, accuracy: null };
      const d = s.dataset;
      const answered = Number(d.answered);
      const total = Number(d.total);
      return {
        answered,
        total,
        percent: total ? Math.round((answered / total) * 100) : 0,
        correct: Number(d.correct),
        retry: Number(d.retry),
        accuracy: d.accuracy === "" ? null : Number(d.accuracy), // 맞음 ÷ (맞음 + 다시 풀기) — GRM-U13
      };
    },

    // --- Step 2 ------------------------------------------------------------
    s2cards: () => itemsIn(2),
    s2btn(i, kind) {
      const card = g.s2cards()[i];
      if (!card) return null;
      if (kind === "play") return card.querySelector("[data-play]"); // only once right or shown (GRM-L03 ⑤)
      if (kind === "check") return card.querySelector("[data-cloze-check]");
      if (kind === "reveal") return card.querySelector("[data-cloze-reveal]");
      if (kind === "retry") return card.querySelector("[data-cloze-retry]");
      return null;
    },
    s2blank: (i, k) => {
      const card = g.s2cards()[i];
      return card ? all("input[data-blank]", card)[k] || null : null;
    },
    s2state(i) {
      const card = g.s2cards()[i];
      if (!card) return null;
      const line = card.querySelector("[data-cloze]");
      const tokens = line ? Array.from(line.childNodes).map((ch) => {
        if (ch.nodeType === 3) return { kind: "text", text: ch.textContent };
        const inp = ch.querySelector ? ch.querySelector("input") : null;
        if (inp) {
          const mark = ch.querySelector("[data-mark]");
          return {
            kind: "blank",
            value: inp.value,
            width: getComputedStyle(inp).width,
            aria: inp.getAttribute("aria-label"),
            placeholder: inp.getAttribute("placeholder"),
            mark: mark ? T(mark) : null,
            state: mark ? (mark.dataset.mark === "correct" ? "correct" : "wrong") : "neutral",
          };
        }
        if (ch.hasAttribute && ch.hasAttribute("data-answer")) return { kind: "answer", text: ch.textContent };
        return { kind: "text", text: ch.textContent };
      }) : [];
      return {
        label: T(badge(card)),
        korean: T(card.querySelector("[data-ko]")),
        tokens,
        verdict: T(card.querySelector("[data-cloze-verdict]")),
        checkBtn: T(g.s2btn(i, "check")),
        revealBtn: T(g.s2btn(i, "reveal")),
      };
    },
    s2all() { return g.s2cards().map((_, i) => g.s2state(i)); },
    s2blankCount: () => all('main [data-step-panel="2"] input[data-blank]').length,

    // --- Step 3 ------------------------------------------------------------
    s3cards: () => itemsIn(3),
    s3btn(i, kind) {
      const card = g.s3cards()[i];
      if (!card) return null;
      if (kind === "play") return card.querySelector("[data-play]"); // aria-label '문장 듣기' / '정지' (was title '발음 듣기')
      if (kind === "said") return card.querySelector("[data-said]"); // '따라 말했어요' (GRM-L04)
      if (kind === "mic") return all("button", card).find((b) => b.title === "마이크를 누르고 영어 문장을 소리내어 말해보세요.") || null;
      return null; // copy (GRM-U12) · card (tapping the card no longer counts — GRM-L04)
    },
    s3state(i) {
      const card = g.s3cards()[i];
      if (!card) return null;
      const en = card.querySelector("[data-en]");
      const play = g.s3btn(i, "play");
      const reps = card.querySelector("[data-reps]");
      return {
        label: T(badge(card)),
        badge: T(reps),
        repeats: reps ? Number(reps.dataset.count) : null,
        english: T(en),
        korean: T(card.querySelector("[data-ko]")),
        speaking: play ? play.getAttribute("aria-label") === "정지" : null,
        copyAria: null,
        micBtn: T(g.s3btn(i, "mic")),
        englishFont: en ? parseFloat(getComputedStyle(en).fontSize) : null,
      };
    },
    s3all() { return g.s3cards().map((_, i) => g.s3state(i)); },

    // --- Step 4 ------------------------------------------------------------
    s4inputs: () => all('main [data-exam-row] [aria-label$="번 시험 답안"]'),
    s4input: (i) => g.s4inputs()[i] || null,
    s4row: (i) => { const inp = g.s4input(i); return inp ? inp.closest("[data-exam-row]") : null; },
    s4btn(i, kind) {
      const row = g.s4row(i);
      if (!row) return null;
      if (kind === "play") return row.querySelector("[data-play]"); // after grading
      return null;
    },
    s4state(i) {
      const row = g.s4row(i);
      if (!row) return null;
      const inp = g.s4input(i);
      const b = row.querySelector("[data-badge]");
      const alts = row.querySelector("[data-alts]");
      return {
        q: T(row.querySelector("[data-q]")),
        korean: T(row.querySelector("[data-ko]")),
        value: inp ? inp.value : null,
        aria: inp ? inp.getAttribute("aria-label") : null,
        placeholder: inp ? inp.getAttribute("placeholder") : null,
        disabled: inp ? !!inp.readOnly : null, // a graded sheet is read-only (was disabled)
        badge: b ? b.dataset.badge : null, // exact · partial · incorrect (words: ✓ 정답 (100점) · △ 부분 정답 (70점) · ✕ 오답 (0점))
        model: T(row.querySelector("[data-model]")),
        alt: alts ? T(alts) : null,
        diff: T(row.querySelector("[data-diff]")),
        border: null,
      };
    },
    s4all() { return g.s4inputs().map((_, i) => g.s4state(i)); },
    s4summary() {
      const sum = document.querySelector("main [data-exam-summary]");
      const line = document.querySelector('main [data-step-panel="4"] [data-summary]');
      const submit = g.s4submitBtn();
      const again = g.s4editBtn();
      return {
        score: sum ? Number(sum.dataset.score) : null,
        exact: sum ? Number(sum.dataset.exact) : null,
        partial: sum ? Number(sum.dataset.partial) : null,
        incorrect: sum ? Number(sum.dataset.incorrect) : null,
        answered: line ? Number(line.dataset.answered) : null,
        total: line ? Number(line.dataset.total) : null,
        warning: !!document.querySelector("main [data-exam-notice]"), // shown only after pressing with nothing written (GRM-U08)
        submit: submit ? { text: T(submit), disabled: submit.getAttribute("aria-disabled") === "true" } : null,
        edit: again ? { text: T(again) } : null,
      };
    },
    s4submitBtn: () => document.querySelector("main [data-exam-submit]"),
    s4editBtn: () => document.querySelector('main [data-exam-action="new"]'), // '새 시험' (was '답안 다시 수정하기' — GRM-L01)
    s4retryWrongBtn: () => document.querySelector('main [data-exam-action="retry-wrong"]'),

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
