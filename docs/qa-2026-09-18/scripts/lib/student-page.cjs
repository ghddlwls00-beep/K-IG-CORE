/**
 * STUDENT driver — browser-side helpers and CDP utilities.
 *
 * `PAGE_HELPERS` is written as a real function and stringified, so the browser
 * code is ordinary (lint-able, no escaped regexes) and is injected with
 * Page.addScriptToEvaluateOnNewDocument, which means it survives every reload.
 *
 * Nothing here edits the product; it only reads the DOM, waits for the audio
 * hook's events, and records what the network did.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------------------------------------------------------------------------
// Browser side
// ---------------------------------------------------------------------------
/* eslint-disable */
function PAGE_HELPERS() {
  if (window.__S) return;
  const tc = (e) => (e ? (e.textContent || "").replace(/\s+/g, " ").trim() : "");
  const it = (e) => (e ? (e.innerText || "").replace(/[ \t]+/g, " ").trim() : "");
  const vis = (el) => !!(el && (el.offsetParent || el.getClientRects().length));
  const pathOf = (src) => {
    if (!src) return null;
    try {
      return new URL(src, location.href).pathname;
    } catch (e) {
      return src;
    }
  };

  const S = {
    tc,
    it,
    main: () => document.querySelector("main"),
    all: (sel, root) => [].slice.call((root || document).querySelectorAll(sel)),
    text: () => it(document.querySelector("main")),
    buttons: (root) => S.all("button", root || document.querySelector("main") || document),
    btn: (txt, root) => S.buttons(root).find((b) => tc(b).indexOf(txt) >= 0) || null,
    btnExact: (txt, root) => S.buttons(root).find((b) => tc(b) === txt) || null,
    btnTitle: (title, root) => S.buttons(root).find((b) => (b.getAttribute("title") || "") === title) || null,
    aria: (label) =>
      S.all("[aria-label]").find((e) => e.getAttribute("aria-label") === label) || null,

    // --- generic waiting ---------------------------------------------------
    until(src, timeout) {
      const fn = new Function("S", "return (" + src + ")(S);");
      const t0 = Date.now();
      return new Promise((res) => {
        const tick = () => {
          let v = null;
          try {
            v = fn(S);
          } catch (e) {
            v = null;
          }
          if (v) return res({ ok: true, value: v, ms: Date.now() - t0 });
          if (Date.now() - t0 > timeout) return res({ ok: false, value: null, ms: Date.now() - t0 });
          setTimeout(tick, 60);
        };
        tick();
      });
    },

    // --- audio -------------------------------------------------------------
    clearAudio() {
      if (window.__kigAudio) window.__kigAudio.length = 0;
      return true;
    },
    audioSummary() {
      const log = window.__kigAudio || [];
      const out = { paths: [], playing: [], ended: [], errors: [], rejected: [], tts: [], rates: {}, dur: {} };
      for (const e of log) {
        if (e.ev === "tts.speak") {
          out.tts.push(String(e.text || "").slice(0, 120));
          continue;
        }
        const p = pathOf(e.src);
        if (!p || p.indexOf("data:") === 0) continue;
        if (out.paths.indexOf(p) < 0) out.paths.push(p);
        if (e.ev === "playing" && out.playing.indexOf(p) < 0) out.playing.push(p);
        if (e.ev === "ended") out.ended.push(p);
        if (e.ev === "error") out.errors.push(p + ":" + e.err);
        if (e.ev === "play-rejected") out.rejected.push(p + ":" + e.name);
        if (e.ev === "play()" && e.rate != null) (out.rates[p] = out.rates[p] || []).push(e.rate);
        if (e.dur) out.dur[p] = e.dur;
      }
      return out;
    },
    /** Resolve as soon as `expected` (or any clip, when null) reaches 'playing'. */
    waitAudio(expected, timeout) {
      const t0 = Date.now();
      return new Promise((res) => {
        const tick = () => {
          const s = S.audioSummary();
          const hit = expected ? s.playing.indexOf(expected) >= 0 : s.playing.length > 0;
          const bad = s.errors.length || s.rejected.length || s.tts.length;
          const wrong = expected && !hit && s.playing.length > 0;
          if (hit || bad || wrong || Date.now() - t0 > timeout) {
            s.ms = Date.now() - t0;
            s.hit = !!hit;
            return res(s);
          }
          setTimeout(tick, 60);
        };
        tick();
      });
    },
    /** How many times a clip ENDED (for the loop-repeat proof). */
    endedCount(p) {
      return S.audioSummary().ended.filter((x) => x === p).length;
    },

    // --- page shell --------------------------------------------------------
    shell() {
      const nav = document.querySelector('nav[aria-label="강의 이동"]');
      const links = nav ? S.all("a[href]", nav) : [];
      const link = (aria) => links.find((a) => (a.getAttribute("aria-label") || "").indexOf(aria) === 0) || null;
      const prev = link("이전 강의");
      const next = link("다음 강의");
      const back = links.find((a) => (a.getAttribute("href") || "") === "/student") || null;
      const bookmark = nav ? S.buttons(nav).find((b) => (b.getAttribute("aria-label") || "").indexOf("북마크") >= 0) : null;
      const bottom = document.querySelector('nav[aria-label="학습 단계 이동"]');
      const view = document.querySelector('nav[aria-label="학습 단계"]');
      const h2 = view ? (view.closest("div.rounded-2xl") || document).querySelector("h2") : null;
      const full = S.btn("전체 본문 듣기") || S.btn("전체 정지");
      return {
        h1: it(document.querySelector("h1")),
        h2: it(h2),
        backHref: back ? back.getAttribute("href") : null,
        backText: tc(back),
        prev: prev ? { href: prev.getAttribute("href"), aria: prev.getAttribute("aria-label"), text: it(prev) } : null,
        next: next ? { href: next.getAttribute("href"), aria: next.getAttribute("aria-label"), text: it(next) } : null,
        bookmarkAria: bookmark ? bookmark.getAttribute("aria-label") : null,
        bookmarkText: tc(bookmark),
        fullPlayText: tc(full),
        speedPills: S.all("button").filter((b) => /^(0\.85|1|1\.2)x$/.test(tc(b))).map((b) => ({
          t: tc(b),
          active: /font-bold/.test(b.className),
        })),
        transport: ["이전 문장", "일시정지", "이어 듣기", "다음 문장"].filter((a) => !!S.aria(a)),
        counter: (() => {
          const span = S.all("main span").find((s) => /^\d+\/\d+$/.test(tc(s)));
          return span ? tc(span) : null;
        })(),
        stepLabels: S.steps().map(tc),
        activeStep: S.activeStep(),
        bottom: bottom
          ? {
              prevDisabled: !!S.buttons(bottom).find((b) => tc(b).indexOf("이전 Step") >= 0 && b.disabled),
              nextDisabled: !!S.buttons(bottom).find((b) => tc(b).indexOf("다음 Step") >= 0 && b.disabled),
              listHref: (S.all("a[href]", bottom)[0] || {}).getAttribute
                ? S.all("a[href]", bottom)[0].getAttribute("href")
                : null,
            }
          : null,
        paywall: !!document.querySelector("[data-kig-paywall]") || /STUDENT PASS ONLY|순차 학습 잠금|ALL-PASS ONLY/.test(S.text()),
      };
    },
    steps: () => S.all('nav[aria-label="학습 단계"] button'),
    activeStep() {
      const i = S.steps().findIndex((b) => /text-primary/.test(b.className));
      return i + 1;
    },

    // --- step 1 ------------------------------------------------------------
    filters() {
      return S.buttons().filter((b) => /모두 가림|영어만|해석만|전체 보기/.test(tc(b))).map((b) => ({
        t: tc(b),
        active: /bg-primary/.test(b.className),
      }));
    },
    filterBtn: (frag) => S.btn(frag),
    cards() {
      return S.all("main span")
        .filter((s) => /^Sentence #\d+$/.test(tc(s)))
        .map((s) => s.closest(".rounded-2xl"))
        .filter(Boolean);
    },
    card: (i) => S.cards()[i] || null,
    cardInfo(i) {
      const c = S.card(i);
      if (!c) return null;
      return {
        text: it(c),
        ps: S.all("p", c).map(it),
        badge: tc(S.all("span", c)[0]),
        buttons: S.buttons(c).map((b) => ({
          t: tc(b),
          aria: b.getAttribute("aria-label"),
          title: b.getAttribute("title"),
          disabled: !!b.disabled,
        })),
        highlighted: /ring-2/.test(c.className),
        placeholder: it(c).indexOf("귀로 먼저 듣고") >= 0,
        micOpen: !!S.btn("따라 말하기", c),
      };
    },
    cardBtn(i, kind) {
      const c = S.card(i);
      if (!c) return null;
      if (kind === "play") return S.buttons(c).find((b) => /듣기|정지/.test(tc(b)) && !/해석|반복/.test(tc(b))) || null;
      if (kind === "loop") return S.buttons(c).find((b) => /반복|정지/.test(b.getAttribute("aria-label") || "")) || null;
      if (kind === "ko") return S.buttons(c).find((b) => /해석/.test(tc(b))) || null;
      if (kind === "reveal") return S.buttons(c).find((b) => /확인|가림/.test(tc(b))) || null;
      if (kind === "check") return S.buttons(c).find((b) => /낭독 완료 체크|완료 해제/.test(b.getAttribute("title") || "")) || null;
      if (kind === "mic") return S.btnTitle("마이크로 발음 테스트", c);
      if (kind === "speak") return S.btn("따라 말하기", c) || S.btn("듣고 있는 중", c) || S.btn("점 (", c);
      if (kind === "again") return S.btn("다시 녹음", c);
      if (kind === "placeholder") return S.all("div", c).find((d) => tc(d).indexOf("귀로 먼저 듣고") >= 0 && !d.querySelector("div")) || null;
      return null;
    },

    // --- step 2 ------------------------------------------------------------
    dropzone() {
      const label = S.all("main span").find((s) => tc(s).indexOf("조립된 문장") === 0);
      return label && label.parentElement ? label.parentElement.nextElementSibling : null;
    },
    pool() {
      const label = S.all("main span").find((s) => tc(s) === "단어 보관함 (단어를 탭하세요):");
      return label ? label.nextElementSibling : null;
    },
    poolTile(word) {
      const pool = S.pool();
      if (!pool) return null;
      return S.buttons(pool).find((b) => !b.disabled && tc(b) === word) ||
        S.buttons(pool).find((b) => !b.disabled && tc(b).toLowerCase() === String(word).toLowerCase()) || null;
    },
    dropTile(i) {
      const zone = S.dropzone();
      if (!zone) return null;
      return S.buttons(zone)[i] || null;
    },
    dictation() {
      const head = S.all("main span").find((s) => /^문장 \d+ \/ \d+$/.test(tc(s)));
      const solved = S.all("main span").find((s) => /^완료: \d+개$/.test(tc(s)));
      const label = S.all("main span").find((s) => tc(s).indexOf("조립된 문장") === 0);
      const counter = label && label.nextElementSibling ? tc(label.nextElementSibling) : null;
      const zone = S.dropzone();
      const pool = S.pool();
      const status = document.querySelector("main div[role=status]");
      const alert = document.querySelector("main div[role=alert]");
      const ko = S.all("main p").find((p) => {
        const prev = p.parentElement && p.parentElement.previousElementSibling;
        return false;
      });
      const koLabel = S.all("main span").find((s) => tc(s) === "우리말 상황 맥락");
      const koText = koLabel && koLabel.parentElement ? it(S.all("p", koLabel.parentElement)[0]) : null;
      return {
        header: tc(head),
        solvedBadge: tc(solved),
        counter,
        koText,
        drop: zone ? S.buttons(zone).map(tc) : null,
        dropEmptyHint: zone ? it(zone).indexOf("아래 단어 블록을 탭하여") >= 0 : false,
        pool: pool ? S.buttons(pool).map((b) => ({ t: tc(b), disabled: !!b.disabled })) : null,
        feedback: status ? { role: "status", text: it(status) } : alert ? { role: "alert", text: it(alert) } : null,
        nextInFeedback: !!(status && S.btn("다음 문장으로", status)),
        replayInFeedback: !!(alert && S.btn("다시 듣기", alert)),
        prevDisabled: (() => {
          const b = S.btn("◀️ 이전");
          return b ? !!b.disabled : null;
        })(),
        nextDisabled: (() => {
          const b = S.btn("다음 ▶️");
          return b ? !!b.disabled : null;
        })(),
        pills: S.buttons()
          .filter((b) => /^문장 #\d+$/.test(b.getAttribute("title") || ""))
          .map((b) => ({ title: b.getAttribute("title"), t: tc(b), current: /bg-primary/.test(b.className) })),
        stepLabels: S.steps().map(tc),
      };
    },
    pill: (n) => S.buttons().find((b) => (b.getAttribute("title") || "") === "문장 #" + n) || null,

    // --- step 3 ------------------------------------------------------------
    shadowing() {
      const doneBox = S.all("main span").find((s) => tc(s) === "완료도");
      const complete = S.aria("학습 완료 체크") || S.aria("학습 완료 취소");
      const status = S.all("main p[role=status]").map(it);
      const summary = S.all("main p").map(it).find((t) => t.indexOf("문장 연습") === 0) || null;
      return {
        doneCount: doneBox && doneBox.nextElementSibling ? tc(doneBox.nextElementSibling) : null,
        summary,
        status,
        completion: complete
          ? { aria: complete.getAttribute("aria-label"), t: tc(complete), disabled: !!complete.disabled }
          : null,
        cards: S.cards().map((c, i) => ({
          checked: tc(S.cardBtn(i, "check")) === "✓",
          micOpen: !!S.btn("따라 말하기", c) || !!S.btn("듣고 있는 중", c) || !!S.btn("점 (", c),
        })),
      };
    },
    micResult(i) {
      const c = S.card(i);
      if (!c) return null;
      const speak = S.btn("따라 말하기", c) || S.btn("듣고 있는 중", c) || S.buttons(c).find((b) => /점 \(/.test(tc(b)));
      return {
        button: tc(speak),
        text: it(c),
        unsupported: it(c).indexOf("지원되지 않는 브라우저") >= 0,
        match: (it(c).match(/단어 일치 \d+\/\d+/) || [null])[0],
        error: (it(c).match(/음성 인식 오류: [^\n]*|마이크 접근 권한이[^\n]*|음성이 감지되지 않았습니다[^\n]*/) || [null])[0],
      };
    },
    /** A fake recogniser: UI wiring + scoring only, never real speech. */
    installFakeRecognition() {
      window.__fakeSR = window.__fakeSR || { transcript: "", error: null };
      const Fake = function () {};
      Fake.prototype.start = function () {
        const self = this;
        setTimeout(function () {
          if (self.onstart) self.onstart();
          if (window.__fakeSR.error) {
            if (self.onerror) self.onerror({ error: window.__fakeSR.error });
            if (self.onend) self.onend();
            return;
          }
          const alt = { transcript: window.__fakeSR.transcript, confidence: 1 };
          const res = [alt];
          res.isFinal = true;
          res.length = 1;
          const results = [res];
          results.length = 1;
          if (self.onresult) self.onresult({ resultIndex: 0, results: results });
          if (self.onend) self.onend();
        }, 30);
      };
      Fake.prototype.stop = function () {};
      Fake.prototype.abort = function () {};
      window.__realSR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      window.SpeechRecognition = Fake;
      window.webkitSpeechRecognition = Fake;
      return true;
    },
    hasRealRecognition: () => !!(window.__realSR || window.SpeechRecognition || window.webkitSpeechRecognition),

    // --- storage -----------------------------------------------------------
    practice(id) {
      try {
        return JSON.parse(localStorage.getItem("kig:student:practice:student/" + id) || "null");
      } catch (e) {
        return null;
      }
    },
    storage(id) {
      const read = (k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null");
        } catch (e) {
          return null;
        }
      };
      const completed = read("kig:progress:completed") || {};
      const bookmarks = read("kig:progress:bookmarks") || {};
      const recent = read("kig:progress:recent");
      return {
        completed: !!completed["student:" + id],
        bookmarked: !!bookmarks["student:" + id],
        recentId: recent ? recent.lessonId : null,
        recentCourse: recent ? recent.course : null,
        pending: (read("kig:student:pending:v1") || []).length,
        practice: S.practice(id),
      };
    },
    clearPractice(id) {
      try {
        localStorage.removeItem("kig:student:practice:student/" + id);
        return true;
      } catch (e) {
        return false;
      }
    },
  };
  window.__S = S;
}
/* eslint-enable */

const PAGE_HELPERS_SOURCE = `(${PAGE_HELPERS.toString()})()`;

// ---------------------------------------------------------------------------
// Node side
// ---------------------------------------------------------------------------

/** Install the helpers so they survive reloads, and in the current document. */
async function installHelpers(tab) {
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: PAGE_HELPERS_SOURCE });
  await tab.eval(PAGE_HELPERS_SOURCE).catch(() => {});
}

/**
 * Records requests/responses this audit cares about, with the response BODY of
 * the progress API, which is the server's own account of what it stored.
 */
function netCapture(tab) {
  const store = { audio: [], api: [], other: [] };
  const wanted = /\/api\/progress\/student|\/api\/student\/chapter-audio/;
  const byId = new Map();
  const original = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    try {
      const p = msg.params || {};
      if (msg.method === "Network.requestWillBeSent") {
        const url = (p.request && p.request.url) || "";
        if (/\/audio\//.test(url)) store.audio.push({ url, at: Date.now() });
        else if (wanted.test(url)) {
          const entry = {
            url,
            method: p.request.method,
            body: p.request.postData || null,
            at: Date.now(),
            status: null,
            response: null,
          };
          byId.set(p.requestId, entry);
          store.api.push(entry);
        }
      } else if (msg.method === "Network.responseReceived") {
        const entry = byId.get(p.requestId);
        if (entry) entry.status = p.response && p.response.status;
      } else if (msg.method === "Network.loadingFinished") {
        const entry = byId.get(p.requestId);
        if (entry && entry.response === null) {
          tab
            .send("Network.getResponseBody", { requestId: p.requestId })
            .then((r) => {
              try {
                entry.response = JSON.parse(r.body);
              } catch (e) {
                entry.response = { raw: String(r.body).slice(0, 400) };
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      /* never let capture break the driver */
    }
    original(msg);
  };
  return {
    store,
    reset() {
      store.audio.length = 0;
      store.api.length = 0;
      byId.clear();
    },
    audioRequests: () => store.audio.map((a) => a.url),
    apiCalls: (re) => store.api.filter((a) => (re ? re.test(a.url) : true)),
    /** The most recent progress POST whose body matches `test`. */
    async findPost(test, { timeout = 9000 } = {}) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const hit = store.api.filter(
          (a) => a.method === "POST" && /\/api\/progress\/student/.test(a.url) && test(a),
        );
        const withBody = hit.find((h) => h.response !== null);
        if (withBody) return withBody;
        await sleep(150);
      }
      return (
        store.api.filter((a) => a.method === "POST" && /\/api\/progress\/student/.test(a.url) && test(a)).pop() || null
      );
    },
    lastGet: () =>
      store.api
        .filter((a) => a.method === "GET" && /\/api\/progress\/student/.test(a.url) && a.response)
        .pop() || null,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Clears this lesson's practice state BEFORE the app's scripts run, once per
 * run stamp, so a resumed run starts from "완료: 0개" without an extra reload.
 * Local storage of the audit clone only.
 */
async function armPracticeClear(tab, id, stamp) {
  const source = `(() => { try {
    if (location.pathname !== ${JSON.stringify(`/student/${id}`)}) return;
    const flag = ${JSON.stringify(`kig:audit:cleared:${id}:${stamp}`)};
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    localStorage.removeItem(${JSON.stringify(`kig:student:practice:student/${id}`)});
  } catch (e) {} })()`;
  const { identifier } = await tab.send("Page.addScriptToEvaluateOnNewDocument", { source });
  return identifier;
}
async function disarm(tab, identifier) {
  if (identifier) await tab.send("Page.removeScriptToEvaluateOnNewDocument", { identifier }).catch(() => {});
}

// --- cross-shard lock -------------------------------------------------------
/**
 * STUDENT progress is ONE server record shared by every clone, and the server
 * merges a POST by reading and rewriting that record. Two shards writing at the
 * same moment can lose one of the writes (and, worse, two completions in the
 * same chapter at once could complete a chapter and raise `unlockedThrough`,
 * which only the forbidden admin reset can undo). Every section of the driver
 * that writes server progress takes this lock first.
 */
const LOCK_DIR = path.join(os.tmpdir(), "kig-audit-locks");
async function withLock(name, fn, { timeout = 600000, stale = 300000 } = {}) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const file = path.join(LOCK_DIR, `${name}.lock`);
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const end = Date.now() + timeout;
  let held = false;
  while (Date.now() < end && !held) {
    try {
      fs.writeFileSync(file, token, { flag: "wx" });
      held = true;
    } catch (e) {
      try {
        const age = Date.now() - fs.statSync(file).mtimeMs;
        if (age > stale) fs.rmSync(file, { force: true });
      } catch (e2) {
        /* raced with the holder */
      }
      if (!held) await sleep(400);
    }
  }
  if (!held) throw new Error(`could not take the ${name} lock`);
  try {
    return await fn();
  } finally {
    try {
      if (fs.readFileSync(file, "utf8") === token) fs.rmSync(file, { force: true });
    } catch (e) {
      /* already gone */
    }
  }
}

module.exports = { PAGE_HELPERS_SOURCE, installHelpers, netCapture, armPracticeClear, disarm, withLock, sleep };
