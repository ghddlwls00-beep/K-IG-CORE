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
 *
 * 2026-09-27 (LISTENING 학습법 · 화면 고침 — 계획 F01–F05 · D24–D29): the view is read by its data-* marks now — the root
 * [data-ld-view] (data-step · data-ready · data-owns-passage-player), the shared StepTabs [data-step-tab="N"] (aria-pressed), a step
 * panel [data-step-panel="N"], the line nav [data-action="prev-line" | "next-line"] with [data-line-no], Step 1's hints
 * [data-passage-hints] [data-hint-chip] and the page's player inside [data-ld-passage], Step 2's line [data-dictation] (data-index ·
 * data-mode · data-blanks · data-checked · data-solved), its ways [data-mode], blank rows [data-blank-rows] > li[data-blank]
 * [data-token] [data-option], tiles [data-word-bank] [data-tile] · [data-assembly] [data-placed], the typing box
 * textarea[data-typing], the verdict [data-feedback], the line's hints [data-line-hints] [data-hint-chip]; Step 3's cards
 * [data-cards] [data-card] (and [data-no-cards]); Step 4's line and the shared microphone tester; Step 5's rows [data-script]
 * li[data-line] ([data-en] · [data-ko] · [data-line-mark]), the memo textarea[aria-label="청취 메모"] and [data-mastery]; a line not
 * yet dictated shows [data-before-dictation] with [data-action="dictate-first" | "peek"]. The old texts ('전체 본문 듣기' · '단어 블록
 * 뱅크' · 'Sentence #N' · '스마트 청취 노트' …) are gone — each reader below says what it reads.
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
      return main().querySelector(`[data-ld-view] [data-step-tab="${n}"]`) || buttons().find((b) => new RegExp("^Step\\s*" + n + "\\b").test(norm(b.textContent))) || null;
    },
    /** the view's own marks: the step on screen, the record read, whether it plays the page's whole-lesson player */
    view() {
      const v = main().querySelector("[data-ld-view]");
      return v ? { step: Number(v.getAttribute("data-step")), ready: v.hasAttribute("data-ready"), ownsPlayer: v.hasAttribute("data-owns-passage-player") } : null;
    },
    panel(n) {
      return main().querySelector(`[data-ld-view] [data-step-panel="${n}"]`);
    },
    action(name, n = 0) {
      return [...main().querySelectorAll(`[data-ld-view] [data-action="${name}"]`)].filter(vis)[n] || null;
    },
    lineNo() {
      const el = main().querySelector("[data-ld-view] [data-line-no]");
      return el ? Number(norm(el.textContent)) : null;
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
      // StepTabs marks the step on screen with aria-pressed (the old bar painted it bg-ink)
      for (const n of [1, 2, 3, 4, 5]) {
        const b = api.stepTab(n);
        if (b && (b.getAttribute("aria-pressed") === "true" || b.className.includes("bg-ink"))) return n;
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
        // 2026-09-27: the banner ('N개 문장 완성 코스웨어') and the tab count ('Step 2 (n/N)') are gone — the lines are the
        // Step 5 rows or the line nav's 'N / M', the right lines Step 2's data-solved-lines
        courseware: null,
        stepBadge: (() => {
          const p = api.panel(2);
          return p ? [p.getAttribute("data-solved-lines")] : [];
        })(),
        topPlayerHidden: (() => {
          const top = document.querySelector("main [data-passage-player]");
          return top ? getComputedStyle(top).display === "none" : null;
        })(),
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

    // ---------- Step 1 · whole lesson ----------
    // 2026-09-27: Step 1 plays the page's own player ([data-ld-passage] — the AudioPlayer, read by player() above) under the lesson's
    // names and numbers ([data-passage-hints] — two lines, [data-action="more-hints"] for the rest). The big '전체 본문 듣기' button
    // and the speed pills are gone; the one speed button is the player's (0.75× · 1.0× · 1.25× · 1.5×).
    passage() {
      const hints = main().querySelector("[data-ld-view] [data-passage-hints]");
      return {
        player: !!main().querySelector("[data-ld-view] [data-ld-passage] input[aria-label='문장 이동'], [data-ld-view] [data-ld-passage] button"),
        hints: hints ? [...hints.querySelectorAll("[data-hint-chip]")].map((c) => norm(c.textContent)) : [],
        moreHints: api.action("more-hints") ? norm(api.action("more-hints").textContent) : null,
        label: null,
        pills: [],
        speedPills: [],
      };
    },

    // ---------- Step 2 ----------
    step2() {
      const d = main().querySelector("[data-ld-view] [data-dictation]");
      if (!d) return null;
      const fb = d.querySelector("[data-feedback]");
      const ko = d.querySelector("[data-ko-line] [data-ko]");
      const details = d.querySelector("[data-ko-line] details");
      const hints = d.querySelector("[data-line-hints]");
      const mode = [...main().querySelectorAll("[data-ld-view] [data-mode]")].find((b) => b.tagName === "BUTTON" && b.getAttribute("aria-pressed") === "true");
      return {
        index: Number(d.dataset.index),
        line: api.lineNo(),
        mode: d.dataset.mode, // the way on screen (a line without blanks is dictated in blocks)
        chosenMode: mode ? mode.getAttribute("data-mode") : null,
        blanksCount: Number(d.dataset.blanks),
        checked: d.dataset.checked === "true",
        solved: d.dataset.solved === "true",
        solvedLines: api.panel(2) ? Number(api.panel(2).getAttribute("data-solved-lines")) : null,
        ko: ko ? norm(ko.textContent) : null,
        riddle: details
          ? { summary: norm(details.querySelector("summary").textContent), open: details.open, answer: norm((details.querySelector("p") || {}).textContent) }
          : null,
        hints: hints ? { open: hints.open, chips: [...hints.querySelectorAll("[data-hint-chip]")].map((c) => norm(c.textContent)) } : null,
        blanks: [...d.querySelectorAll("[data-blank-rows] > li[data-blank]")].map((li) => ({
          blank: Number(li.dataset.blank),
          token: Number(li.dataset.token),
          mark: li.dataset.mark || null,
          options: [...li.querySelectorAll("[data-option]")].map((b) => ({ word: norm(b.textContent), picked: b.getAttribute("aria-pressed") === "true" })),
          typed: (li.querySelector("input") || {}).value ?? null,
        })),
        gaps: [...d.querySelectorAll("[data-cloze] [data-gap]")].map((g) => norm(g.textContent)),
        typingMode: !!d.querySelector("textarea[data-typing]"),
        typed: (d.querySelector("textarea[data-typing]") || {}).value ?? null,
        bankCount: api.bankTiles().length,
        bank: api.bankTiles().map((b) => norm(b.textContent)),
        assembled: api.assembled().map((b) => norm(b.textContent)),
        status: fb ? fb.getAttribute("data-feedback") : null, // none · empty · correct · wrong · shown
        feedback: fb ? norm(fb.textContent) : null,
        answer: norm((d.querySelector("[data-answer]") || {}).textContent) || null,
        buttons: ["check", "next", "reveal", "retry", "undo", "reset-tiles", "play-line", "play-slow"].filter((a) => !!d.querySelector(`[data-action="${a}"]`)),
      };
    },
    bankTiles() {
      return [...main().querySelectorAll("[data-ld-view] [data-word-bank] [data-tile]")].filter(vis);
    },
    bankTile(word, skip = 0) {
      const tiles = api.bankTiles();
      let seen = 0;
      for (const t of tiles) {
        if (norm(t.textContent).toLowerCase() === String(word).toLowerCase()) {
          if (seen++ === skip) return t;
        }
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
      return [...main().querySelectorAll("[data-ld-view] [data-assembly] [data-placed]")];
    },
    assembledTile(word) {
      return api.assembled().find((b) => norm(b.textContent).toLowerCase() === String(word).toLowerCase()) || null;
    },
    typingInput() {
      return main().querySelector("[data-ld-view] textarea[data-typing]");
    },
    /** the option button of blank `blank` whose word is `word` */
    blankOption(blank, word) {
      const li = main().querySelector(`[data-ld-view] [data-blank-rows] > li[data-blank="${blank}"]`);
      return li ? [...li.querySelectorAll("[data-option]")].find((b) => norm(b.textContent).toLowerCase() === String(word).toLowerCase()) || null : null;
    },

    // ---------- Step 3 ----------
    // 2026-09-27: the line is chosen with the shared line nav (the select is gone); a card is li[data-card] (its sound
    // [data-action="play-card"], the heard form [data-heard] — 'author‿in'); a line without cards shows [data-no-cards] with
    // '보통 1×' · '느리게 0.75×'; a line not yet dictated shows [data-before-dictation] instead of its English.
    liaisonSelect() {
      return null;
    },
    setLiaison() {
      return false;
    },
    step3() {
      const p = api.panel(3);
      if (!p) return null;
      const line = p.querySelector("[data-line]");
      const details = line ? line.querySelector("details") : null;
      return {
        line: api.lineNo(),
        hiddenBeforeDictation: !!p.querySelector("[data-before-dictation]"),
        en: line ? norm((line.querySelector("[data-en]") || {}).textContent) : null,
        ko: line ? norm((line.querySelector("[data-ko]") || {}).textContent) : null,
        riddle: details ? { summary: norm(details.querySelector("summary").textContent), answer: norm((details.querySelector("p") || {}).textContent) } : null,
        noCards: !!p.querySelector("[data-no-cards]"),
        cards: api.liaisonCards(),
      };
    },
    liaisonCards() {
      return [...main().querySelectorAll("[data-ld-view] [data-cards] [data-card]")].map((li) => {
        const ps = [...li.querySelectorAll("p")];
        const phrase = ps[1] || null;
        const enEl = phrase ? phrase.querySelector("[lang='en']") : null;
        const heard = phrase ? phrase.querySelector("[data-heard]") : null;
        const phonetic = phrase ? [...phrase.querySelectorAll("span")].find((s) => s !== enEl && s !== heard && !s.getAttribute("aria-hidden")) : null;
        return {
          typeLabel: ps[0] ? norm(ps[0].textContent) : null,
          original: enEl ? norm(enEl.textContent) : null,
          koreanSound: heard ? norm(heard.textContent) : null,
          phonetic: phonetic ? norm(phonetic.textContent) : null,
          rule: ps[2] ? norm(ps[2].textContent) : null,
        };
      });
    },
    cardPlayButton(index) {
      return [...main().querySelectorAll("[data-ld-view] [data-action='play-card']")].filter(vis)[index] || null;
    },

    // ---------- Step 4 ----------
    step4() {
      const p = api.panel(4);
      if (!p) return null;
      const en = p.querySelector("[data-en]");
      const ko = p.querySelector("[data-ko]");
      const mic = api.btnTitle("마이크를 누르고 영어 문장을 소리내어 말해보세요.");
      const best = p.querySelector("[data-best]");
      const matched = [...p.querySelectorAll("span")].find((s) => norm(s.textContent).startsWith("단어 일치"));
      const transcript = [...p.querySelectorAll("p")].find((pp) => /^".*"$/.test(norm(pp.textContent)));
      const scoreBadge = [...p.querySelectorAll("span")].find((s) => /^\d+점$/.test(norm(s.textContent)));
      const err = [...p.querySelectorAll("span")].find((s) =>
        /음성이 감지되지 않았습니다|마이크 접근 권한|음성 인식 오류|지원되지 않는/.test(norm(s.textContent)),
      );
      const hide = p.querySelector("[data-action='hide-text']");
      return {
        line: api.lineNo(),
        counter: api.lineNo(),
        en: en ? norm(en.textContent) : null,
        ko: ko ? norm(ko.textContent) : null,
        hiddenBeforeDictation: !!p.querySelector("[data-before-dictation]"),
        hideText: hide ? hide.getAttribute("aria-checked") === "true" : null,
        prevDisabled: api.action("prev-line") ? !!api.action("prev-line").disabled : null,
        nextDisabled: api.action("next-line") ? !!api.action("next-line").disabled : null,
        micLabel: mic ? norm(mic.textContent) : null,
        micExists: !!mic,
        retry: !!api.btn("다시 녹음"),
        best: best ? norm(best.textContent) : null,
        matched: matched ? norm(matched.textContent) : null,
        transcript: transcript ? norm(transcript.textContent) : null,
        scoreBadge: scoreBadge ? norm(scoreBadge.textContent) : null,
        error: err ? norm(err.textContent) : null,
        // the shared tester's word row: '알아들은 낱말:' and a chip per word with data-matched (GRM-U27)
        wordChips: (() => {
          const label = [...p.querySelectorAll("span")].find((s) => /^(단어별 발음 일치도|알아들은 낱말):$/.test(norm(s.textContent)));
          if (!label) return [];
          const box = label.nextElementSibling;
          return box
            ? [...box.querySelectorAll("span")].map((s) => ({
                word: norm(s.textContent),
                matched: s.dataset.matched ? s.dataset.matched === "true" : s.title === "정확히 일치한 발음" || s.title === "인식됨",
              }))
            : [];
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
    // 2026-09-27: one list of rows ([data-script] li[data-line]); the English is a button ([data-en]) that shows the Korean
    // ([data-ko]) — or '해석 모두 보기' ([data-action="show-all-ko"]); a row's own sound is [data-action="play-row"]; the line the
    // player is on carries data-current; a dictation mark is [data-line-mark] (right · wrong · helped). The memo is folded
    // (details[data-notes], textarea[aria-label="청취 메모"]); the end line is [data-mastery].
    step5() {
      const p = api.panel(5);
      if (!p) return null;
      const notes = api.notesArea();
      const mastery = p.querySelector("[data-mastery]");
      const all = p.querySelector("[data-action='show-all-ko']");
      return {
        heading: null,
        headingCount: api.step5Rows().length,
        hiddenBeforeDictation: !!p.querySelector("[data-before-dictation]"),
        allKo: all ? all.getAttribute("aria-checked") === "true" : null,
        rows: api.step5Rows(),
        notes: notes ? notes.value : null,
        notesOpen: !!(p.querySelector("details[data-notes]") || {}).open,
        notesPlaceholder: notes ? notes.placeholder : null,
        mastery: mastery ? norm(mastery.textContent) : null,
        masteryRole: mastery ? mastery.getAttribute("role") : null,
      };
    },
    step5Rows() {
      return [...main().querySelectorAll("[data-ld-view] [data-script] > li[data-line]")].map((li) => {
        const details = li.querySelector("details");
        const mark = li.querySelector("[data-line-mark]");
        const play = li.querySelector("[data-action='play-row']");
        return {
          num: norm((li.querySelector("span") || {}).textContent),
          en: norm((li.querySelector("[data-en]") || {}).textContent) || null,
          ko: norm((li.querySelector("[data-ko]") || {}).textContent) || null,
          answer: details ? norm((details.querySelector("p") || {}).textContent) : null,
          mark: mark ? mark.getAttribute("data-line-mark") : null,
          playLabel: play ? play.getAttribute("aria-label") : null,
          highlighted: li.hasAttribute("data-current"),
        };
      });
    },
    step5PlayButton(index) {
      return [...main().querySelectorAll("[data-ld-view] [data-action='play-row']")][index] || null;
    },
    notesArea() {
      return main().querySelector('textarea[aria-label="청취 메모"]');
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
