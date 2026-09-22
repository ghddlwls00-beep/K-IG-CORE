/**
 * In-page helpers for the LISTENING driver (docs/qa-2026-09-18/scripts/drive-listening.cjs).
 *
 * Injected with Page.addScriptToEvaluateOnNewDocument BEFORE hydration, next to the
 * harness' audio hook, so the driver can address LdLearningView controls by their real
 * labels instead of by CSS classes. Everything here READS the page or returns an element
 * for the harness' trusted click; nothing here clicks or types on its own.
 *
 * Read with textContent, never innerText: several LD labels sit in `uppercase` CSS
 * ("Step 1", "Sentence 1 of 6", "속도:") and innerText would return them upper-cased.
 */
(() => {
  if (window.__ld) return;

  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const vis = (el) =>
    !!el && !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== "hidden";
  const main = () => document.querySelector("main") || document.body;
  const buttons = () => [...main().querySelectorAll("button")].filter(vis);
  const pathOf = (src) => {
    try {
      return new URL(src, location.href).pathname;
    } catch {
      return src || "";
    }
  };

  const api = {
    norm,
    vis,
    txt: (el) => norm(el && el.textContent),

    // ---------- generic finders (return an Element for harness click/type) ----------
    btn(text, nth = 0) {
      return buttons().filter((b) => norm(b.textContent).includes(text))[nth] || null;
    },
    btnExact(text) {
      return buttons().find((b) => norm(b.textContent) === text) || null;
    },
    btnTitle(title) {
      return buttons().find((b) => b.title === title) || null;
    },
    btnAria(label) {
      return buttons().find((b) => b.getAttribute("aria-label") === label) || null;
    },
    linkAria(label) {
      return [...main().querySelectorAll("a[href]")].find((a) => a.getAttribute("aria-label") === label) || null;
    },
    stepTab(n) {
      return buttons().find((b) => new RegExp("^Step\\s*" + n + "\\b").test(norm(b.textContent))) || null;
    },
    /** Every visible button as {text, aria, title, disabled} — used for control inventories. */
    controls() {
      return buttons().map((b) => ({
        text: norm(b.textContent).slice(0, 48),
        aria: b.getAttribute("aria-label"),
        title: b.title || null,
        disabled: !!b.disabled,
      }));
    },
    disabled(text) {
      const b = api.btn(text);
      return b ? !!b.disabled : null;
    },
    has(text) {
      return norm(main().textContent).includes(text);
    },
    stepLabels() {
      return [1, 2, 3, 4, 5].map((n) => {
        const b = api.stepTab(n);
        return b ? norm(b.textContent) : null;
      });
    },
    activeStep() {
      for (const n of [1, 2, 3, 4, 5]) {
        const b = api.stepTab(n);
        if (b && b.className.includes("bg-ink")) return n;
      }
      return null;
    },

    // ---------- page shell ----------
    shell() {
      const h1 = document.querySelector("h1");
      const canonical = document.querySelector('link[rel="canonical"]');
      const prev = [...main().querySelectorAll("a[href]")].find((a) =>
        (a.getAttribute("aria-label") || "").startsWith("이전 강의"),
      );
      const next = [...main().querySelectorAll("a[href]")].find((a) =>
        (a.getAttribute("aria-label") || "").startsWith("다음 강의"),
      );
      const bookmark = buttons().find((b) => /북마크/.test(b.getAttribute("aria-label") || ""));
      const complete = buttons().find((b) => /학습 완료/.test(b.getAttribute("aria-label") || ""));
      const bottomNav = main().querySelector('nav[aria-label="학습 단계 이동"]');
      return {
        h1: norm(h1 && h1.textContent),
        title: document.title,
        canonical: canonical ? canonical.getAttribute("href") : null,
        description: (document.querySelector('meta[name="description"]') || {}).content || null,
        prev: prev ? { href: prev.getAttribute("href"), aria: prev.getAttribute("aria-label") } : null,
        next: next ? { href: next.getAttribute("href"), aria: next.getAttribute("aria-label") } : null,
        bookmark: bookmark ? { aria: bookmark.getAttribute("aria-label"), text: norm(bookmark.textContent) } : null,
        complete: complete ? { aria: complete.getAttribute("aria-label"), text: norm(complete.textContent) } : null,
        backLink: (() => {
          const a = [...main().querySelectorAll("a[href]")].find((x) => norm(x.textContent).includes("목록"));
          return a ? { href: a.getAttribute("href"), text: norm(a.textContent) } : null;
        })(),
        bottomNav: bottomNav
          ? {
              prevDisabled: !!bottomNav.querySelector("button:first-of-type").disabled,
              nextDisabled: !!bottomNav.querySelectorAll("button")[1].disabled,
              listHref: (bottomNav.querySelector("a[href]") || {}).getAttribute
                ? bottomNav.querySelector("a[href]").getAttribute("href")
                : null,
            }
          : null,
        audioElements: document.querySelectorAll("audio").length,
        courseware: (norm(main().textContent).match(/(\d+)개 문장 완성 코스웨어/) || [])[1] || null,
        stepBadge: (norm(main().textContent).match(/Step 2 \((\d+)\/(\d+)\)/) || []).slice(1),
        paywall: !!document.querySelector("[data-kig-paywall]"),
        quizText: /블라인드 리스닝 맥락 진단 퀴즈|(^|\s)Q1\./.test(norm(main().textContent)),
        stepLabels: api.stepLabels(),
      };
    },

    // ---------- top AudioPlayer ----------
    player() {
      const playBtn =
        api.btnAria("재생") || api.btnAria("일시정지") || api.btnAria("Play") || api.btnAria("Pause");
      const stopBtn = api.btnAria("정지");
      const slider = main().querySelector('input[type="range"][aria-label="문장 이동"]');
      const counterEl = [...main().querySelectorAll("span")].find((s) => /^\d+\/\d+$/.test(norm(s.textContent)));
      const statusEl = [...main().querySelectorAll("span")].find((s) =>
        /재생 버튼을 눌러 전체 듣기|음성 읽는 중|일시정지됨/.test(norm(s.textContent)),
      );
      return {
        exists: !!playBtn,
        playAria: playBtn ? playBtn.getAttribute("aria-label") : null,
        stopDisabled: stopBtn ? !!stopBtn.disabled : null,
        counter: counterEl ? norm(counterEl.textContent) : null,
        status: statusEl ? norm(statusEl.textContent) : null,
        sliderValue: slider ? Number(slider.value) : null,
        sliderMax: slider ? Number(slider.max) : null,
        sliderText: slider ? slider.getAttribute("aria-valuetext") : null,
        rates: [...main().querySelectorAll("button")]
          .filter((b) => /^[\d.]+×$/.test(norm(b.textContent)))
          .map((b) => ({ label: norm(b.textContent), pressed: b.getAttribute("aria-pressed") === "true" })),
      };
    },
    setSlider(index) {
      const slider = main().querySelector('input[type="range"][aria-label="문장 이동"]');
      if (!slider) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(slider, String(index));
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      slider.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      return true;
    },

    // ---------- Step 1 / Step 5 whole-passage ----------
    passage() {
      const big =
        api.btn("전체 본문 듣기") || api.btn("배속 연속 청취") || api.btn("⏹️ 정지");
      const pills = buttons()
        .filter((b) => /^[\d.]+x$/.test(norm(b.textContent)))
        .map((b) => ({ label: norm(b.textContent), active: b.className.includes("bg-primary") }));
      const speedPills = buttons()
        .filter((b) => /배속|표준 속도|초고속 청취|실전 회화 속도/.test(norm(b.textContent)) && norm(b.textContent).length < 30)
        .map((b) => ({ label: norm(b.textContent), active: b.className.includes("bg-ink") }));
      return { label: big ? norm(big.textContent) : null, pills, speedPills };
    },

    // ---------- Step 2 ----------
    step2() {
      const sent = [...main().querySelectorAll("span")].find((s) => /^Sentence \d+ of \d+$/.test(norm(s.textContent)));
      const numBadge = [...main().querySelectorAll("span")].find((s) => /^#\d+$/.test(norm(s.textContent)));
      const koP = numBadge
        ? (numBadge.parentElement.parentElement.querySelector("p") || null)
        : null;
      const dots = [...main().querySelectorAll("button")].filter((b) =>
        /^문장 \d+( \(완료\))?$/.test(b.getAttribute("aria-label") || ""),
      );
      const bankLabel = [...main().querySelectorAll("span")].find((s) =>
        norm(s.textContent).startsWith("단어 블록 뱅크"),
      );
      const details = main().querySelector("details");
      const input = main().querySelector('input[placeholder="들리는 영문장을 직접 입력하세요..."]');
      const correct = [...main().querySelectorAll("p")].find((p) =>
        norm(p.textContent).startsWith("정답입니다!"),
      );
      const wrong = [...main().querySelectorAll("p")].find((p) =>
        norm(p.textContent).startsWith("순서가 조금 다릅니다"),
      );
      return {
        sentence: sent ? norm(sent.textContent) : null,
        num: numBadge ? norm(numBadge.textContent) : null,
        ko: koP ? norm(koP.textContent) : null,
        riddle: details
          ? { summary: norm(details.querySelector("summary").textContent), open: details.open, answer: norm((details.querySelector("p") || {}).textContent) }
          : null,
        dots: dots.map((b) => ({
          aria: b.getAttribute("aria-label"),
          current: b.getAttribute("aria-current") === "step",
          done: /\(완료\)$/.test(b.getAttribute("aria-label") || ""),
        })),
        prevDisabled: (() => {
          const b = api.btn("← 이전 문장");
          return b ? !!b.disabled : null;
        })(),
        nextDisabled: (() => {
          const b = api.btn("다음 문장 →");
          return b ? !!b.disabled : null;
        })(),
        typingMode: !!input,
        typed: input ? input.value : null,
        modeToggle: (() => {
          const b = api.btn("타이핑 모드") || api.btn("블록 탭 모드로 전환");
          return b ? norm(b.textContent) : null;
        })(),
        bankLabel: bankLabel ? norm(bankLabel.textContent) : null,
        bankCount: api.bankTiles().length,
        bank: api.bankTiles().map((b) => norm(b.textContent)),
        assembled: api.assembled().map((b) => norm(b.textContent).replace(/\s*✕$/, "")),
        placeholder: norm(main().textContent).includes("아래의 단어 블록을 클릭하여 문장을 만드세요"),
        emptyBank: norm(main().textContent).includes("모든 단어를 배치했습니다!"),
        status: correct ? "correct" : wrong ? "incorrect" : "idle",
        correctSentence: correct ? norm(correct.parentElement.querySelectorAll("p")[1].textContent) : null,
        hasNextDrill: !!api.btn("다음 문장 풀기"),
      };
    },
    bankTiles() {
      const label = [...main().querySelectorAll("span")].find((s) =>
        norm(s.textContent).startsWith("단어 블록 뱅크"),
      );
      if (!label) return [];
      const header = label.parentElement;
      const box = header && header.nextElementSibling;
      return box ? [...box.querySelectorAll("button")] : [];
    },
    bankTile(word, skip = 0) {
      const tiles = api.bankTiles();
      let seen = 0;
      for (const t of tiles) {
        if (norm(t.textContent) === word) {
          if (seen++ === skip) return t;
        }
      }
      for (const t of tiles) {
        if (norm(t.textContent).toLowerCase() === String(word).toLowerCase()) return t;
      }
      return null;
    },
    /** A bank tile that is NOT one of `words` (a distractor) — for the "extra word" case. */
    bankTileNotIn(words) {
      const lower = words.map((w) => String(w).toLowerCase());
      const counts = {};
      for (const w of lower) counts[w] = (counts[w] || 0) + 1;
      for (const t of api.bankTiles()) {
        const w = norm(t.textContent).toLowerCase();
        if (!counts[w]) return t;
      }
      return null;
    },
    assembled() {
      return [...main().querySelectorAll('button[title="클릭하여 되돌리기"]')];
    },
    assembledTile(word) {
      return api.assembled().find((b) => norm(b.textContent).replace(/\s*✕$/, "") === word) || null;
    },
    typingInput() {
      return main().querySelector('input[placeholder="들리는 영문장을 직접 입력하세요..."]');
    },

    // ---------- Step 3 ----------
    liaisonSelect() {
      return main().querySelector('select[aria-label="소리 클리닉 문장 선택"]');
    },
    setLiaison(index) {
      const sel = api.liaisonSelect();
      if (!sel) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
      setter.call(sel, String(index));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    step3() {
      const sel = api.liaisonSelect();
      const head = [...main().querySelectorAll("span")].find((s) => /^Sentence #\d+$/.test(norm(s.textContent)));
      const card = head ? head.closest("div").parentElement : null;
      const ps = card ? [...card.querySelectorAll("p")] : [];
      const details = card ? card.querySelector("details") : null;
      const h3 = [...main().querySelectorAll("h3")].find((h) =>
        norm(h.textContent).includes("핵심 소리 변이 현상"),
      );
      return {
        selectValue: sel ? Number(sel.value) : null,
        options: sel ? [...sel.options].map((o) => norm(o.textContent)) : [],
        head: head ? norm(head.textContent) : null,
        en: ps[0] ? norm(ps[0].textContent) : null,
        ko: ps[1] ? norm(ps[1].textContent) : null,
        riddle: details ? { summary: norm(details.querySelector("summary").textContent), answer: norm((details.querySelector("p") || {}).textContent) } : null,
        heading: h3 ? norm(h3.textContent) : null,
        headingCount: h3 ? Number((norm(h3.textContent).match(/\((\d+)개\)/) || [])[1]) : null,
        emptyState: norm(main().textContent).includes("이 문장은 단어들이 비교적 독립적인 음소로"),
        cards: api.liaisonCards(),
      };
    },
    liaisonCards() {
      const out = [];
      for (const btn of buttons().filter((b) => norm(b.textContent).includes("소리 청취"))) {
        let root = btn;
        while (root && !norm(root.textContent).includes("원문 스펠링:")) root = root.parentElement;
        if (!root) continue;
        const spans = [...root.querySelectorAll("span")];
        const origLabel = spans.find((s) => norm(s.textContent) === "원문 스펠링:");
        const soundLabel = spans.find((s) => norm(s.textContent) === "실제 들리는 소리:");
        const soundEl = soundLabel ? soundLabel.nextElementSibling : null;
        const phoneticEl = soundEl ? soundEl.querySelector("span") : null;
        const ps = [...root.querySelectorAll("p")];
        out.push({
          typeLabel: norm(btn.parentElement.querySelector("span").textContent),
          original: origLabel ? norm(origLabel.nextElementSibling.textContent) : null,
          koreanSound: soundEl ? norm(soundEl.textContent.replace(phoneticEl ? phoneticEl.textContent : "", "")) : null,
          phonetic: phoneticEl ? norm(phoneticEl.textContent) : null,
          rule: ps.length ? norm(ps[ps.length - 1].textContent) : null,
        });
      }
      return out;
    },
    cardPlayButton(index) {
      return buttons().filter((b) => norm(b.textContent).includes("소리 청취"))[index] || null;
    },

    // ---------- Step 4 ----------
    step4() {
      const head = [...main().querySelectorAll("span")].find((s) =>
        /^Sentence #\d+ Shadowing Target$/.test(norm(s.textContent)),
      );
      const card = head ? head.parentElement : null;
      const ps = card ? [...card.querySelectorAll("p")] : [];
      const details = card ? card.querySelector("details") : null;
      const counter = [...main().querySelectorAll("span")].find((s) => /^\d+ \/ \d+$/.test(norm(s.textContent)));
      const mic = api.btnTitle("마이크를 누르고 영어 문장을 소리내어 말해보세요.");
      const best = [...main().querySelectorAll("span")].find((s) => norm(s.textContent).startsWith("내 최고 점수"));
      const matched = [...main().querySelectorAll("span")].find((s) => norm(s.textContent).startsWith("단어 일치"));
      const transcript = [...main().querySelectorAll("p")].find((p) => /^".*"$/.test(norm(p.textContent)));
      const scoreBadge = [...main().querySelectorAll("span")].find((s) => /^\d+점$/.test(norm(s.textContent)));
      const err = [...main().querySelectorAll("span")].find((s) =>
        /음성이 감지되지 않았습니다|마이크 접근 권한|음성 인식 오류|지원되지 않는/.test(norm(s.textContent)),
      );
      return {
        head: head ? norm(head.textContent) : null,
        counter: counter ? norm(counter.textContent) : null,
        en: ps[0] ? norm(ps[0].textContent) : null,
        ko: ps[1] ? norm(ps[1].textContent) : null,
        riddle: details ? norm((details.querySelector("p") || {}).textContent) : null,
        prevDisabled: (() => {
          const b = api.btn("← 이전");
          return b ? !!b.disabled : null;
        })(),
        nextDisabled: (() => {
          const b = api.btnExact("다음 →");
          return b ? !!b.disabled : null;
        })(),
        micLabel: mic ? norm(mic.textContent) : null,
        micExists: !!mic,
        retry: !!api.btn("다시 녹음"),
        best: best ? norm(best.textContent) : null,
        matched: matched ? norm(matched.textContent) : null,
        transcript: transcript ? norm(transcript.textContent) : null,
        scoreBadge: scoreBadge ? norm(scoreBadge.textContent) : null,
        error: err ? norm(err.textContent) : null,
        wordChips: (() => {
          const label = [...main().querySelectorAll("span")].find((s) => norm(s.textContent) === "단어별 발음 일치도:");
          if (!label) return [];
          const box = label.nextElementSibling;
          return box ? [...box.querySelectorAll("span")].map((s) => ({ word: norm(s.textContent), matched: s.title === "정확히 일치한 발음" })) : [];
        })(),
      };
    },
    micButton() {
      return api.btnTitle("마이크를 누르고 영어 문장을 소리내어 말해보세요.");
    },
    setTranscript(text) {
      window.__fakeTranscript = text;
      return true;
    },

    // ---------- Step 5 ----------
    step5() {
      const h3 = [...main().querySelectorAll("h3")].find((h) => norm(h.textContent).includes("원문 & 완역"));
      const notes = main().querySelector('textarea[aria-label="스마트 청취 노트"]');
      const mastery = [...main().querySelectorAll("span")].find((s) =>
        /마스터리 코스웨어 완료|받아쓰기 \d+\/\d+ 완료/.test(norm(s.textContent)),
      );
      return {
        heading: h3 ? norm(h3.textContent) : null,
        headingCount: h3 ? Number((norm(h3.textContent).match(/\((\d+)문장\)/) || [])[1]) : null,
        rows: api.step5Rows(),
        notes: notes ? notes.value : null,
        notesPlaceholder: notes ? notes.placeholder : null,
        mastery: mastery ? norm(mastery.textContent) : null,
        masteryRole: mastery ? (mastery.closest("[role=status]") ? "status" : null) : null,
      };
    },
    step5Rows() {
      return [...main().querySelectorAll('button[title="개별 문장 청취"]')].map((btn) => {
        const card = btn.parentElement.parentElement;
        const ps = [...card.querySelectorAll("p")];
        const details = card.querySelector("details");
        const numEl = card.querySelector("span");
        return {
          num: norm(numEl && numEl.textContent),
          en: ps[0] ? norm(ps[0].textContent) : null,
          ko: ps[1] ? norm(ps[1].textContent) : null,
          answer: details ? norm((details.querySelector("p") || {}).textContent) : null,
          playLabel: norm(btn.textContent),
          highlighted: /border-primary/.test(card.className),
        };
      });
    },
    step5PlayButton(index) {
      return [...main().querySelectorAll('button[title="개별 문장 청취"]')][index] || null;
    },
    notesArea() {
      return main().querySelector('textarea[aria-label="스마트 청취 노트"]');
    },

    // ---------- text capture ----------
    stepText() {
      return norm(main().textContent);
    },

    // ---------- audio ----------
    audioClear() {
      if (window.__kigAudio) window.__kigAudio.length = 0;
      return true;
    },
    audioSummary() {
      const log = (window.__kigAudio || []).filter((e) => !/^data:/.test(e.src || ""));
      return log.map((e) => ({ ev: e.ev, path: pathOf(e.src), rate: e.rate, dur: e.dur, err: e.err, text: e.text }));
    },
    /**
     * Resolves as soon as the outcome of a play trigger is known: the expected clip is
     * playing, another clip is playing, the clip errored, or the app fell back to browser
     * TTS (which would hide a missing clip). `expected` may be null to accept any clip.
     */
    audioWait(expected, ms) {
      return new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          const log = (window.__kigAudio || []).filter((e) => !/^data:/.test(e.src || ""));
          const requested = [...new Set(log.filter((e) => e.ev === "play()").map((e) => pathOf(e.src)))];
          const playing = log.find((e) => e.ev === "playing" && (!expected || pathOf(e.src) === expected));
          const other = expected ? log.find((e) => e.ev === "playing" && pathOf(e.src) !== expected) : null;
          const tts = log.filter((e) => e.ev === "tts.speak").map((e) => e.text);
          const bad = log.find((e) => e.ev === "error" || e.ev === "play-rejected" || e.ev === "play-threw");
          const timedOut = performance.now() - t0 > ms;
          if (playing || other || tts.length || bad || timedOut) {
            const ended = log.find((e) => e.ev === "ended" && (!expected || pathOf(e.src) === expected));
            resolve({
              waited: Math.round(performance.now() - t0),
              requested,
              playing: playing ? { path: pathOf(playing.src), rate: playing.rate, dur: playing.dur } : null,
              otherPlaying: other ? pathOf(other.src) : null,
              tts,
              error: bad ? bad.ev + (bad.err != null ? ":" + bad.err : "") + (bad.name ? ":" + bad.name : "") : null,
              ended: !!ended,
              timedOut,
            });
            return;
          }
          setTimeout(tick, 25);
        };
        tick();
      });
    },
    /** Wait for the given clip to end (short clips) — resolves true/false. */
    endedWait(expected, ms) {
      return new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          const log = (window.__kigAudio || []).filter((e) => !/^data:/.test(e.src || ""));
          if (log.find((e) => (e.ev === "ended" || e.ev === "pause") && (!expected || pathOf(e.src) === expected))) {
            resolve(true);
            return;
          }
          if (performance.now() - t0 > ms) {
            resolve(false);
            return;
          }
          setTimeout(tick, 25);
        };
        tick();
      });
    },
    /** True when a clip is currently audible (the shared element is playing). */
    stillPlaying(expected) {
      const log = (window.__kigAudio || []).filter((e) => !/^data:/.test(e.src || ""));
      let on = false;
      for (const e of log) {
        if (!expected || pathOf(e.src) === expected) {
          if (e.ev === "playing") on = true;
          if (e.ev === "ended" || e.ev === "pause" || e.ev === "error") on = false;
        }
      }
      return on;
    },
  };

  window.__ld = api;
})();
