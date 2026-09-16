#!/usr/bin/env node
/**
 * Launch audit (2026-09-16) — every browser-reproducible finding, reproduced.
 *
 * Runs the SAME steps the audit took, in a real (headless Edge) browser, and
 * records what actually happened. Point it at production to see the original
 * problems; point it at a build with the fixes to see them gone. Each check
 * prints the observed value, not just a verdict, so a person can read what the
 * page did.
 *
 *   node verify-launch-audit.cjs https://k-ig-core.vercel.app
 *   node verify-launch-audit.cjs http://localhost:3210
 *
 * Read-only against production: nothing is submitted to a server. The licence
 * form's error path is only exercised on localhost, because submitting it
 * calls /api/license/activate.
 *
 * PASS means "the fixed behaviour is present". Items the owner deferred
 * (textbook wording, legal, payment, CNN, admin/login policy) are recorded as
 * INFO with the observed value and never counted as failures.
 */
const fs = require("fs");
const path = require("path");
const { REPO } = require("../tsload.cjs");
const { launch, Tab, sleep } = require("./cdp.cjs");

const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const rows = [];
function record(id, name, pass, observed, info = false) {
  rows.push({ id, name, status: info ? "INFO" : pass ? "PASS" : "FAIL", observed });
}

/* ---------- in-page helpers (strings evaluated inside the page) ---------- */
const H = `
  window.__k = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    norm: (s) => (s || '').replace(/\\s+/g, ' ').trim(),
    btns: () => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent),
    btn: (pred) => window.__k.btns().find((b) => pred(window.__k.norm(b.innerText))),
    // Waits for the button: learning views are loaded with next/dynamic, so a
    // step tab can still be a skeleton when the page's load event has fired.
    click: async (pred, ms = 10000) => {
      const end = Date.now() + ms;
      for (;;) {
        const b = window.__k.btn(pred);
        if (b) { b.click(); return b; }
        if (Date.now() > end) throw new Error('button not found: ' + pred.toString().slice(0, 80));
        await new Promise((r) => setTimeout(r, 200));
      }
    },
    setVal: (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    text: () => document.body.innerText,
  };
`;

async function page(tab, url, { clear = true, settle = 1800 } = {}) {
  if (clear) {
    await tab.goto(`${BASE}/`, 200).catch(() => {});
    await tab.eval("try { localStorage.clear(); } catch (e) {}").catch(() => {});
  }
  tab.resetEvents();
  await tab.goto(`${BASE}${url}`, settle);
  await tab.eval(H);
}

async function run(tab, id, name, fn) {
  try {
    await fn();
  } catch (err) {
    record(id, name, false, `error: ${String(err.message).slice(0, 200)}`);
  }
}

/* --------------------------------- checks --------------------------------- */
async function student(tab) {
  await run(tab, "CNT-01 / FUN-05", "s1-1 dictation: sir alone, ma'am alone, both, empty", async () => {
    await page(tab, "/student/s1-1");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      await k.click((t) => t.includes('Step 2. 탭 딕테이션')); await k.sleep(400);
      const pool = () => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent && /px-3\\.5 py-2 text-\\[14px\\]/.test(b.className));
      const tap = (w) => { const b = pool().find((x) => x.innerText.trim() === w && !x.disabled); if (!b) throw new Error('tile ' + w); b.click(); };
      const reset = async () => { await k.click((t) => t.includes('초기화')); await k.sleep(150); };
      const check = async () => { await k.click((t) => t.includes('정답 확인')); await k.sleep(300);
        const t = k.text(); return t.includes('정답입니다!') ? 'correct' : t.includes('어순이나 단어가 일치하지 않습니다') ? 'wrong' : t.includes('단어를 먼저 배열하세요') ? 'hint' : 'none'; };
      const out = {};
      out.empty = await check();
      const words = pool().map((b) => b.innerText.trim());
      const maam = words.find((w) => /^ma.am$/.test(w));
      for (const w of ['Nice','to','meet','you','sir', maam]) { tap(w); await k.sleep(40); }
      out.both = await check(); await reset();
      for (const w of ['Nice','to','meet','you', maam]) { tap(w); await k.sleep(40); }
      out.maam = await check(); await reset();
      for (const w of ['Nice','to','meet','you','sir']) { tap(w); await k.sleep(40); }
      out.sir = await check();
      out.label = k.norm(k.btn((t) => t.includes('Step 2. 탭 딕테이션')).innerText);
      return out;
    })()`);
    record("CNT-01", "sir alone and ma'am alone accepted, both rejected", r.sir === "correct" && r.maam === "correct" && r.both === "wrong",
      `sir=${r.sir} ma'am=${r.maam} both=${r.both}`);
    record("FUN-05", "empty dictation submit shows guidance, not 'wrong'", r.empty === "hint", `empty=${r.empty}`);

    // FUN-01: after solving sentence 1, reload and read the step label.
    tab.resetEvents();
    await tab.goto(`${BASE}/student/s1-1`, 1800);
    await tab.eval(H);
    const label = await tab.eval(`window.__k.norm(window.__k.btn((t) => t.includes('Step 2. 탭 딕테이션')).innerText)`);
    record("FUN-01", "dictation progress survives reload", /\(1\/3\)/.test(label), `before reload: ${r.label}; after reload: ${label}`);
  });

  await run(tab, "FUN-02", "s1-2 completion needs practice", async () => {
    await page(tab, "/student/s1-2");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      await k.click((t) => t.includes('Step 3. 섀도잉')); await k.sleep(400);
      const done = () => [...document.querySelectorAll('main button')].find((b) => (b.getAttribute('aria-label') || '').includes('학습 완료'));
      const before = done().disabled;
      [...document.querySelectorAll('main button')].find((b) => b.getAttribute('title') === '낭독 완료 체크').click(); await k.sleep(300);
      return { before, after: done().disabled };
    })()`);
    record("FUN-02", "STUDENT 'complete' disabled with 0 practice, enabled after 1", r.before === true && r.after === false,
      `disabled before practice=${r.before}, after one check=${r.after}`);
  });
}

async function grammar(tab) {
  const exam = async (url, answers) => {
    await page(tab, url);
    return tab.eval(`(async () => {
      const k = window.__k;
      await k.click((t) => t.includes('Step 4 · 종합 평가')); await k.sleep(500);
      const inputs = [...document.querySelectorAll('main .divide-y > div')];
      const answers = ${JSON.stringify(answers)};
      const out = { savedOnLoad: k.text().includes('자동 저장됨') };
      const gradeBtn = () => k.btn((t) => t.includes('전체 시험 채점하기'));
      out.emptyDisabled = gradeBtn() ? gradeBtn().disabled : null;
      for (const [n, v] of Object.entries(answers)) {
        const row = inputs.find((r) => (r.querySelector('span.font-mono')?.innerText || '').trim() === 'Q' + n + '.');
        k.setVal(row.querySelector('input'), v);
      }
      await k.sleep(300);
      gradeBtn().click(); await k.sleep(500);
      for (const n of Object.keys(answers)) {
        const row = [...document.querySelectorAll('main .divide-y > div')].find((r) => (r.querySelector('span.font-mono')?.innerText || '').trim() === 'Q' + n + '.');
        out['Q' + n] = k.norm(row.querySelector('span.rounded-md')?.innerText);
        out['model' + n] = k.norm((row.innerText.match(/모범 답안:[^\\n]*/) || [''])[0]);
      }
      return out;
    })()`);
  };

  await run(tab, "CNT-02", "gh1-006 exam grading", async () => {
    const r = await exam("/grammar1/gh1-006", { 1: "I'm Korean.", 2: "He's Japanese." });
    record("CNT-02", "'I'm Korean.' / 'He's Japanese.' graded 100", /100/.test(r.Q1) && /100/.test(r.Q2), `Q1=${r.Q1} Q2=${r.Q2}`);
    record("FUN-07", "no '자동 저장됨' before any input (gh1-006)", r.savedOnLoad === false, `shown on first load=${r.savedOnLoad}`);
    record("FUN-05", "empty exam cannot be graded (gh1-006)", r.emptyDisabled === true, `grade button disabled while empty=${r.emptyDisabled}`);
  });
  await run(tab, "CNT-02", "gh2-008 exam grading", async () => {
    const r = await exam("/grammar2/gh2-008", { 1: "Even if I have to walk all the way, I will go there.", 2: "Even though I failed, I will try again.", 4: "He folded the napkin into a banana." });
    record("CNT-02", "'I will' for model 'I'll' graded 100", /100/.test(r.Q1), `Q1=${r.Q1}`);
    record("CNT-02", "content word replaced by 'banana' graded 0", /0점/.test(r.Q4) && !/70/.test(r.Q4), `Q4=${r.Q4}`);
    record("CNT-03", "'will' for key 'would' (answer key = owner decision)", true, `Q2=${r.Q2}; ${r.model2}`, true);
  });
  await run(tab, "CNT-03", "gh2-007 / gh1-008 answer-key spellings", async () => {
    const a = await exam("/grammar2/gh2-007", { 7: "Though I love you, I cannot do this.", 3: "Unless you study harder, you will never pass the examination." });
    record("CNT-03", "'cannot' for key 'can not' graded 100", /100/.test(a.Q7), `Q7=${a.Q7}; ${a.model7}`);
    record("CNT-03", "'study' for key 'work' (answer key = owner decision)", true, `Q3=${a.Q3}; ${a.model3}`, true);
    const b = await exam("/grammar1/gh1-008", { 25: "Was she your girlfriend?", 3: "You were happy." });
    record("CNT-03", "'girlfriend' for key 'girl friend' graded 100", /100/.test(b.Q25), `Q25=${b.Q25}; ${b.model25}`);
    record("CNT-03", "'You were happy.' with period graded 100", /100/.test(b.Q3), `Q3=${b.Q3}; ${b.model3}`);
  });
  await run(tab, "FUN-06 / UX-02", "gh1-006 cloze wrong mark and retry", async () => {
    await page(tab, "/grammar1/gh1-006");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      await k.click((t) => t.includes('Step 2 · 빈칸 완성')); await k.sleep(400);
      const blank = () => [...document.querySelectorAll('main input')].find((i) => i.offsetParent);
      const b = blank(); k.setVal(b, 'zz'); b.blur(); await k.sleep(250);
      const wrap = blank().parentElement;
      const wrongShown = /✗/.test(wrap.innerText) || /border-red-500/.test(blank().className);
      await k.click((t) => t.includes('Step 1 · 영작 훈련')); await k.sleep(400);
      const first = [...document.querySelectorAll('main input')].find((i) => i.offsetParent);
      k.setVal(first, 'I am Korean.'); await k.sleep(150);
      const card = first.closest('.rounded-2xl');
      [...card.querySelectorAll('button')].find((x) => x.innerText.includes('다시 풀기')).click(); await k.sleep(250);
      const after = [...document.querySelectorAll('main input')].find((i) => i.offsetParent).value;
      return { wrongShown, after };
    })()`);
    record("FUN-06", "wrong cloze answer is marked", r.wrongShown === true, `wrong mark shown=${r.wrongShown}`);
    record("UX-02", "'다시 풀기' clears the typed answer", r.after === "", `input after retry=${JSON.stringify(r.after)}`);
  });
}

async function voca(tab) {
  await run(tab, "CNT-04 / CNT-09 / FUN-03 / FUN-04", "mv1-02", async () => {
    await page(tab, "/phonics/mv1-02");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      const out = { claims: ['뇌과학', 'AI 발음', '뇌신경'].filter((s) => k.text().includes(s)) };
      await k.click((t) => t.includes('전체 30단어 펼쳐보기')); await k.sleep(300);
      const cards = [...document.querySelectorAll('main div')].filter((d) => /min-h-\\[96px\\]/.test(d.className));
      const card = (w) => cards.find((d) => d.querySelector('span.font-mono')?.innerText.trim() === w || d.innerText.split('\\n').map((x) => x.trim()).includes(w));
      out.miss = k.norm(card('Miss')?.innerText).replace(/[✓🔊]/g, '').trim();
      card('well').click(); await k.sleep(300);
      out.template = k.text().includes('발음 음소 규칙');
      await k.click((t) => t.includes('이 단어로 Step 2')); await k.sleep(400);
      out.jumped = (k.text().match(/QUESTION #\\d+ \\/ \\d+/i) || [''])[0];
      out.prompt = k.norm(document.querySelector('main .font-mono.text-\\\\[32px\\\\]')?.innerText || '');
      for (let i = 0; i < 40; i++) {
        if (!/QUESTION #\\d+ \\/ \\d+/i.test(k.text())) break;
        const opts = k.btns().filter((b) => /^[ABCD]\\./.test(k.norm(b.innerText)));
        opts[0].click(); await k.sleep(60);
        const next = k.btn((t) => /다음 문제 풀기|결과 보기/.test(t));
        if (!next) break;
        next.click(); await k.sleep(80);
      }
      out.afterLast = /문항 완료|문항 풀이 완료/.test(k.text()) ? 'results screen' : (k.text().match(/QUESTION #\\d+ \\/ \\d+/i) || ['?'])[0];
      return out;
    })()`);
    record("CNT-04", "'Miss' shown as the honorific", /경칭/.test(r.miss) && !/그리워하다/.test(r.miss), `card: ${r.miss}`);
    record("CNT-09", "no template 'etymology' sentence", r.template === false, `template shown=${r.template}`);
    record("FUN-04", "'이 단어로 Step 2' opens that word's question", r.prompt === "well" || /well/.test(r.prompt), `${r.jumped} prompt=${r.prompt}`);
    record("FUN-03", "quiz ends with a results screen", r.afterLast === "results screen", `after last question: ${r.afterLast}`);
    record("CNT-07", "no brain-science / AI claims on VOCA", r.claims.length === 0, `found: ${r.claims.join(", ") || "none"}`);
  });
}

async function listening(tab) {
  await run(tab, "CNT-07 / CNT-08 / FUN-02", "d001", async () => {
    await page(tab, "/ld/d001");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      let all = k.text();
      const steps = k.btns().filter((b) => /^STEP \\d/.test(k.norm(b.innerText))).map((b) => k.norm(b.innerText));
      let banner = null;
      for (const s of steps) {
        await k.click((t) => t === s); await k.sleep(450);
        all += '\\n' + k.text();
        if (/^STEP 5/.test(s)) banner = k.text().includes('코스웨어 완료!');
      }
      return {
        claims: ['AI가', '대원칙', '뇌 청각', '뇌 트레이닝', '억양이 완벽'].filter((c) => all.includes(c)),
        preparing: all.includes('준비 중'),
        banner,
      };
    })()`);
    record("CNT-07", "no 'AI grades intonation' / 'principle of linguistics' claims (LISTENING)", r.claims.length === 0, `found: ${r.claims.join(", ") || "none"}`);
    record("CNT-08", "no '준비 중' placeholder (LISTENING)", r.preparing === false, `shown=${r.preparing}`);
    record("FUN-02", "no 'complete!' banner before any dictation", r.banner === false, `banner at 0/6=${r.banner}`);
  });
}

async function reading(tab) {
  await run(tab, "CNT-06 / CNT-07 / CNT-08 / CNT-10 / FUN-07 / FUN-08", "pr002", async () => {
    await tab.viewport("desktop");
    await page(tab, "/reading/pr002");
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      const out = { savedOnLoad: k.text().includes('자동 저장됨'), claims: ['하버드', 'Evelyn', '뇌인지'].filter((c) => k.text().includes(c)) };
      await k.click((t) => t.includes('Step 2 · 핵심 어휘')); await k.sleep(400);
      const show = k.btn((t) => t.includes('전체 뜻 보기')); if (show) { show.click(); await k.sleep(300); }
      out.poorer = k.norm((k.text().match(/poorer[\\s\\S]{0,40}/) || [''])[0]);
      await k.click((t) => t.includes('Step 3 · 독해 퀴즈')); await k.sleep(400);
      out.preparing = k.text().includes('준비 중');
      out.foreign = ['communication', 'respect', 'problems'].filter((w) => k.text().includes(w));
      await k.click((t) => t.includes('Step 4 · 원문 대조')); await k.sleep(400);
      const sec = document.querySelector('main section[aria-label="Side-by-Side Dual Reading"]');
      const panelVisible = (label) => [...sec.querySelectorAll('div')].some((d) => (d.firstElementChild?.firstElementChild?.textContent || '').includes(label) && d.getBoundingClientRect().width > 0);
      // The original bug: at 1366px the toggle is not rendered at all.
      const toggle = k.btn((t) => t === '영어만');
      if (!toggle) { out.enOnly = { toggle: false, en: panelVisible('English Passage'), ko: panelVisible('Korean Interpretation') }; return out; }
      toggle.click(); await k.sleep(300);
      out.enOnly = { toggle: true, en: panelVisible('English Passage'), ko: panelVisible('Korean Interpretation') };
      return out;
    })()`);
    record("CNT-06", "pr002 'poorer' card is a comparative adjective", /adj|비교급|더 나쁜/.test(r.poorer) && !/가난한/.test(r.poorer), `card: ${r.poorer}`);
    record("CNT-07", "no 'Harvard / Evelyn Wood' claim (READING)", r.claims.length === 0, `found: ${r.claims.join(", ") || "none"}`);
    record("CNT-08", "no '준비 중' placeholder (READING)", r.preparing === false, `shown=${r.preparing}`);
    record("CNT-10", "pr002 cloze options not borrowed from pr001", r.foreign.length === 0, `pr001 words present: ${r.foreign.join(", ") || "none"}`);
    record("FUN-07", "no '자동 저장됨' before any input (READING)", r.savedOnLoad === false, `shown on first load=${r.savedOnLoad}`);
    record("FUN-08", "'영어만' hides the Korean panel at 1366px", r.enOnly.toggle && r.enOnly.en === true && r.enOnly.ko === false,
      `toggle rendered=${r.enOnly.toggle} EN visible=${r.enOnly.en} KO visible=${r.enOnly.ko}`);
  });
}

async function global(tab) {
  await run(tab, "UX-01", "course page lock label", async () => {
    // The STUDENT course is the one that labelled locked lessons "수강권 열람";
    // the labels are client-rendered, so wait for a locked row to appear.
    await page(tab, "/student", { settle: 2500 });
    const t = await tab.eval(`(async () => { for (let i = 0; i < 40; i++) { if (document.body.innerText.includes('🔒')) break; await new Promise((r) => setTimeout(r, 200)); } return document.body.innerText; })()`);
    const locks = (t.match(/🔒/g) || []).length;
    record("UX-01", "no '수강권 열람' on the STUDENT course page", locks > 0 && !t.includes("수강권 열람"), `'수강권 열람' present=${t.includes("수강권 열람")}, locked rows=${locks}`);
  });

  await run(tab, "A11Y-01", "licence dialog keyboard behaviour", async () => {
    await page(tab, "/reading/pr001");
    const opener = await tab.eval(`(() => { const b = [...document.querySelectorAll('header button')].find((x) => x.innerText.includes('이용권 등록')); b.focus(); return !!b; })()`);
    await tab.key("Enter");
    await sleep(700);
    const opened = await tab.eval(`(() => { const d = document.querySelector('[role=dialog][aria-modal=true]'); const a = document.activeElement; return { open: !!d, focus: a.id || a.tagName, labelFor: !!document.querySelector('label[for="license-code"]'), placeholder: d?.querySelector('input')?.placeholder || null }; })()`);
    const inside = [];
    for (let i = 0; i < 4; i++) {
      await tab.key("Tab");
      await sleep(120);
      inside.push(await tab.eval("!!document.activeElement.closest('[role=dialog]')"));
    }
    await tab.key("Escape");
    await sleep(400);
    const closed = await tab.eval(`(() => ({ open: !!document.querySelector('[role=dialog][aria-modal=true]'), focusOnOpener: (document.activeElement.innerText || '').includes('이용권 등록') }))()`);
    record("A11Y-01", "Escape closes the dialog", opener && opened.open && !closed.open, `opened=${opened.open} open after Escape=${closed.open}`);
    record("A11Y-01", "Tab stays inside the dialog", inside.every(Boolean), `inside after each Tab: ${inside.join(",")}`);
    record("A11Y-01", "focus returns to the opener", closed.focusOnOpener, `focus on opener=${closed.focusOnOpener}`);
    record("A11Y-01", "code field has a real label", opened.labelFor, `label[for=license-code]=${opened.labelFor}, initial focus=${opened.focus}`);
    record("UX-01", "placeholder matches issued key format", /^KIG-1Y-X{16}-X{16}$/.test(opened.placeholder || ""), `placeholder=${opened.placeholder}`);
  });

  await run(tab, "FUN-09", "search", async () => {
    await page(tab, "/reading/pr001");
    await tab.eval(`document.querySelector('header button[aria-label^="검색"]').click()`);
    await sleep(1500);
    const r = await tab.eval(`(async () => {
      const k = window.__k;
      const input = document.querySelector('[role=dialog] input');
      const rows = () => [...document.querySelectorAll('[role=dialog] ul li button')].map((b) => k.norm(b.innerText));
      k.setVal(input, '1강'); await k.sleep(300); const one = rows();
      k.setVal(input, 'd150'); await k.sleep(300); const locked = rows();
      return { one: one.length, oneTitles: one.map((t) => (t.match(/\\d+강/) || [''])[0]).join(','), locked: locked[0] || '' };
    })()`);
    record("FUN-09", "'1강' matches lesson 01 only", r.one === 1, `${r.one} result(s): ${r.oneTitles}`);
    record("FUN-09", "locked lesson shows a lock badge", /🔒/.test(r.locked), `d150 row: ${r.locked.slice(0, 80)}`);
  });

  await run(tab, "A11Y-02 / PERF-01", "home", async () => {
    await tab.viewport("mobile");
    await page(tab, "/");
    const r = await tab.eval(`(() => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue('--ink-faint').trim();
      const lum = (h) => { const c = [1,3,5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      const ratio = (Math.max(lum(hex), lum(bg)) + 0.05) / (Math.min(lum(hex), lum(bg)) + 0.05);
      const imgs = [...document.querySelectorAll('main img, body img')].filter((i) => !i.src.startsWith('data:'));
      return { main: !!document.querySelector('main'), inkFaint: hex, ratio: Math.round(ratio * 100) / 100,
        first: imgs[0] ? (imgs[0].currentSrc || imgs[0].src).split('/').pop() : null,
        secondLoading: imgs[1] ? imgs[1].loading : null };
    })()`);
    record("A11Y-02", "home has a <main> landmark", r.main, `<main>=${r.main}`);
    record("A11Y-02", "secondary text contrast >= 4.5:1", r.ratio >= 4.5, `--ink-faint ${r.inkFaint} = ${r.ratio}:1`);
    record("PERF-01", "first section photo is WebP, the rest lazy", /\.webp$/.test(r.first || "") && r.secondLoading === "lazy", `first=${r.first} second loading=${r.secondLoading}`);
    await tab.viewport("desktop");
  });

  await run(tab, "RE-006 / mobile audio", "CSP silent-primer on first tap", async () => {
    await tab.viewport("mobile");
    await page(tab, "/student/s1-1");
    // Listen for the violation itself, and record what the shared <audio>
    // element was asked to load, so "0 violations" can be told apart from
    // "the primer never ran" — an empty console proves nothing on its own.
    await tab.eval(`(() => {
      window.__csp = []; window.__loads = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + String(e.blockedURI).slice(0, 30)));
      const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: desc.get,
        set(v) { window.__loads.push(String(v).slice(0, 30)); return desc.set.call(this, v); } });
    })()`);
    const pt = await tab.eval(`(() => { const r = document.querySelector('main h1').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; })()`);
    await tab.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
    await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(1500);
    const r = await tab.eval("({ csp: window.__csp, loads: window.__loads })");
    const primerRan = r.loads.some((s) => s.startsWith("data:audio"));
    // INFO, not PASS/FAIL: headless Edge does not report this violation even on
    // production, where a headed Chromium does. The verdict for this item comes
    // from the headed browser check recorded in launch-audit-2026-09-16.md.
    record("RE-006", "silent primer on first tap (headless — not conclusive, see doc)", true,
      `primer loaded=${primerRan}; violations seen by headless: ${r.csp.join(" | ") || "none"}`, true);
    await tab.viewport("desktop");
  });
}

async function http() {
  const get = async (u) => {
    const res = await fetch(`${BASE}${u}`, { redirect: "manual" });
    return { status: res.status, headers: res.headers, body: await res.text() };
  };
  const sm = await get("/sitemap.xml");
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https:\/\/k-ig-core\.vercel\.app/, BASE));
  const non200 = [];
  for (const u of locs) {
    const r = await fetch(u, { redirect: "manual" });
    await r.arrayBuffer();
    if (r.status !== 200) non200.push(`${r.status} ${u}`);
  }
  record("SEO-01", "every sitemap URL answers 200", non200.length === 0, `${locs.length} URLs, non-200: ${non200.slice(0, 3).join(" | ") || "none"}`);
  const variant = await get("/reading/pr001-1");
  const canonical = (variant.body.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  record("SEO-01", "script page canonical points at main lesson", /\/reading\/pr001$/.test(canonical || ""), `/reading/pr001-1 canonical=${canonical}`);
  const home = await get("/");
  const ogW = (home.body.match(/og:image:width" content="(\d+)"/) || [])[1];
  const ogH = (home.body.match(/og:image:height" content="(\d+)"/) || [])[1];
  const ogUrl = (home.body.match(/og:image" content="([^"]*)"/) || [])[1] || "";
  record("SEO-01", "og:image declared size = real size", ogW === "1000" && ogH === "525" && /\/images\/og\//.test(ogUrl), `declared ${ogW}x${ogH} ${ogUrl.replace(/^https?:\/\/[^/]+/, "")}`);
  const admin = await get("/admin/license");
  const robots = (admin.body.match(/<meta name="robots" content="([^"]*)"/) || [])[1];
  record("SEC-03", "admin PIN page is noindex", /noindex/.test(robots || ""), `robots=${robots}`);
  for (const p of ["/pricing", "/terms", "/privacy"]) {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    await r.arrayBuffer();
    record(p === "/pricing" ? "COM-01" : "COM-02", `${p} (owner/legal)`, true, `status ${r.status}`, true);
  }
  record("COM-03", "CNN course in sitemap (owner decision)", true, `${locs.filter((u) => /cnn/.test(u)).length} CNN URLs listed`, true);
}

(async () => {
  console.log(`launch-audit reproduction — ${BASE}\n`);
  const browser = await launch({ port: 9360 });
  const tab = await Tab.open(browser.port);
  await tab.viewport("desktop");
  try {
    await student(tab);
    await grammar(tab);
    await voca(tab);
    await listening(tab);
    await reading(tab);
    await global(tab);
  } finally {
    await tab.close();
    browser.proc.kill();
  }
  await http();

  let pass = 0;
  let fail = 0;
  for (const r of rows) {
    console.log(`${r.status.padEnd(4)}  ${r.id.padEnd(8)} ${r.name}\n        ${r.observed}`);
    if (r.status === "PASS") pass++;
    if (r.status === "FAIL") fail++;
  }
  console.log(`\n${pass} PASS, ${fail} FAIL, ${rows.length - pass - fail} INFO`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const name = LOCAL ? "local" : "production";
  fs.writeFileSync(path.join(OUT_DIR, `launch-audit-${name}.json`), JSON.stringify({ base: BASE, pass, fail, rows }, null, 1));
  process.exitCode = fail ? 1 : 0;
})();
