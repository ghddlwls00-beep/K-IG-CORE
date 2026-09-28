#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 오늘 복습 한 바퀴를 실제 브라우저(헤드리스 Edge 390×844, 탭 하나)로, 이용권 없이(무료 체험 — 서버 안 씀)
 * (공통-학습-엔진.md §8-3 · 4 · 8, 단계 2-나 E1).
 *
 * 로컬 운영 빌드(`npx next build` → `npx next start -p 3471 -H 127.0.0.1`, 이용권 · R2 값 없이)에 붙는다. 기기 기록
 * (localStorage kig-learning:passoff-grammar)을 엔진 함수로 만들어 넣는다 — 어제 끝낸 pg01-2(다음 날 확인 15문항)와 사흘 전에
 * 끝내고 이틀 전에 맞힌 pg01-1 의 세 문항(오늘 복습). 그다음은 사람이 누르듯:
 *   R1 목록(과정 첫 화면): '오늘 복습 · 약 N분'(N = 엔진이 이 기록으로 짠 계획의 초 ÷ 60)
 *   R2 그 단추 → 복습 쪽: '다음 날 확인' 1 / 18 · 문항 카드(레슨 이름 '2인칭')
 *   R3 다음 날 확인 15문항을 시험처럼 — 일부러 셋 틀림(영작 둘 · 보기 하나), 답하면 결과 없이 바로 다음
 *   R4 결과를 한꺼번에: '15문항 중 12개 맞았어요' · 첫 시도 문법 정답 7 / 9 · 서술형 기준 · 목록에 맞음 12 · 틀림 3
 *   R5 '틀린 문항 다시 풀기 (3)' → 사다리: 첫 문장은 또 틀려서 '틀린 자리를 표시했어요' → 고쳐서 '맞았어요' · 나머지도 맞힘
 *   R6 오늘 복습 세 문항(pg01-1 — 영작 둘 · 짧은 칸 하나)은 문항마다 바로 결과
 *   R7 끝 화면: 오늘 푼 문항 18개 · 통과한 문장 0개 · 내일 올 문항 3개
 *   R8 기기 기록: 18문항 모두 오늘 풂 · 틀린 셋은 내일 다시(lapses 1) · 맞은 12는 이틀 뒤 · 복습 셋은 나흘 뒤 · 답 기록
 *      where "review" 22개(시험 15 · 다시 4 — 'retry' · 복습 3)
 *   R9 목록으로 돌아가면 '오늘 복습 없음'
 *   R10 화면마다(카드 · 결과 · 사다리 · 끝 · 목록): 가로 넘침 0 · 누를 것 44px 미만 0 · 12px 미만 글 0 · 입력 칸 16px 미만 0
 *   R11 콘솔 오류 · 잡히지 않은 예외 · 실패한 요청 0
 *   --secrets <json> : 이어서 이용권 쪽 한 바퀴(check-progress-live.mjs 와 같은 준비 — 버리는 시험 비밀값 {LICENSE_SALT, LICENSE_SECRET}
 *     으로 켠 `npx next dev -p 3472`, R2 값 없이). STUDENT 이용권을 등록해 그 세션 쿠키를 탭에 넣고 같은 기기 기록으로:
 *     S1 복습 쪽이 서버 판(무료 안내 없음) · '다음 날 확인 1 / 18' — 문항은 API 로 옴
 *     S2 18문항 모두 맞힘 → 결과 '15문항 중 15개' → '이어서 복습' → 끝: 오늘 푼 문항 18개 · 내일 올 문항 0개
 *     S3 서버에 남은 기록(이 이용권으로 API 에 빈 기록을 보내 받음): 18문항 모두 오늘 풂 · 기기에 이용권 표시(owner) 남음
 *   node docs/pass-off-grammar/검사/drive-review.cjs [--base http://127.0.0.1:3471] [--break=no-seed] [--secrets <json>]
 *     --break=no-seed : 기기 기록을 넣지 않음 → R1 · R2 … 가 FAIL(exit 1)이어야(드라이버가 실패할 수 있음)
 * exit 0 = 실패 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const ORIGIN = arg("base", "http://127.0.0.1:3471");
const BREAK = arg("break", "");
if (BREAK && BREAK !== "no-seed") {
  console.error(`모르는 깨기: ${BREAK} — no-seed`);
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN)) {
  console.error(`로컬 서버에만 씁니다 — ${ORIGIN}`);
  process.exit(2);
}

// --- the engine, transpiled as it is (the seed record is made by the same functions the page uses) ------------------
function loadEngine() {
  const cache = {};
  const load = (name) => {
    if (cache[name]) return cache[name].exports;
    const js = ts.transpileModule(fs.readFileSync(path.join(REPO, "src/lib/learning", `${name}.ts`), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const m = { exports: {} };
    cache[name] = m;
    new Function("require", "module", "exports", js)((spec) => load(spec.replace(/^\.\//, "")), m, m.exports);
    return m.exports;
  };
  return { E: load("engine"), D: load("day") };
}
const { E, D } = loadEngine();
const PROFILE = { course: "passoff-grammar", secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 }, elementKinds: ["select", "choice", "short"] };

const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
/** a finished lesson's review items, in the order the lesson brings them (PassoffLearningView finish: ④ · ⑤ · ③) */
function reviewItems(id) {
  const drill = lessonFile(id).blocks.filter((b) => b.type === "drill");
  return [
    ...drill.flatMap((b) => (b.produce || []).map((item) => ({ key: item.id, kind: "produce", item }))),
    ...drill.flatMap((b) => (b.transfer || []).map((item) => ({ key: item.id, kind: "transfer", item }))),
    ...drill.flatMap((b) => (b.select || []).filter((i) => !i.reserve).map((item) => ({ key: item.id, kind: item.kind, item }))),
  ];
}
const TEST = reviewItems("pg01-2");
const pg011 = reviewItems("pg01-1");
const PRACTICE = [...pg011.filter((e) => e.kind === "produce").slice(0, 2), pg011.find((e) => e.kind === "short")].filter(Boolean);
const ITEMS = new Map([...TEST, ...PRACTICE].map((e) => [e.key, e]));
// answered wrong on purpose in the check: the first two sentences and the first 'choice'
const WRONG = new Set([TEST.filter((e) => e.kind === "produce")[0].key, TEST.filter((e) => e.kind === "produce")[1].key, TEST.find((e) => e.kind === "choice").key]);

const NOW = Date.now();
const DAY_MS = 86_400_000;
const today = D.learningDay(NOW);
function seedRecord() {
  const r = E.emptyRecord("passoff-grammar");
  E.applyLessonDone(r, "pg01-1", NOW - 3 * DAY_MS, PRACTICE.map(({ key, kind }) => ({ key, kind })));
  for (const e of PRACTICE) E.applyAttempt(r, e.key, { lessonId: "pg01-1", kind: e.kind, correct: true, help: "none", mode: "typed", where: "review" }, NOW - 2 * DAY_MS, PROFILE);
  E.applyLessonDone(r, "pg01-2", NOW - DAY_MS, TEST.map(({ key, kind }) => ({ key, kind })));
  return r;
}
const seed = seedRecord();
const plan = E.planDay(seed, today, PROFILE);
const MINUTES = Math.max(1, Math.round(plan.seconds / 60));

// --- the page side ---------------------------------------------------------------------------------------------------
const KIT = `window.__kit = {
  visible(el) { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; },
  buttons(root) { return [...(root || document).querySelectorAll("button, a[href]")].filter((b) => this.visible(b)); },
  click(label, root) {
    const b = this.buttons(root || document.querySelector("main")).find((x) => x.textContent.replace(/\\s+/g, " ").trim().startsWith(label));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  },
  state() {
    const s = document.querySelector("[data-review-step]");
    const item = document.querySelector("[data-review-item]");
    return { step: s ? s.dataset.reviewStep : null, item: item ? item.dataset.reviewItem : null, mode: item ? item.dataset.reviewMode : null, text: (document.querySelector("main") || document.body).innerText.replace(/\\s+/g, " ").slice(0, 2000) };
  },
  focusAnswer() {
    const el = document.querySelector('[data-review-item] textarea[aria-label="영작 답"], [data-review-item] input[aria-label="답"]');
    if (!el) return false;
    el.focus();
    el.select();
    return true;
  },
  tokenButtons() { return [...document.querySelectorAll('[data-review-item] [aria-label="낱말 고르기"] button')]; },
  layout() {
    const main = document.querySelector("main");
    const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, small: [], tiny: [], smallInput: [] };
    for (const el of main.querySelectorAll("button, a[href], input, textarea, select")) {
      if (!this.visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.small.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30) + " " + Math.round(r.width) + "x" + Math.round(r.height));
    }
    for (const el of main.querySelectorAll("*")) {
      if (!this.visible(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (own && parseFloat(getComputedStyle(el).fontSize) < 12) out.tiny.push(el.textContent.trim().slice(0, 30));
    }
    for (const el of main.querySelectorAll("input, textarea")) if (this.visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16) out.smallInput.push(el.getAttribute("aria-label"));
    return out;
  },
};`;

const rows = [];
const check = (name, ok, detail = "") => rows.push({ ok: Boolean(ok), name, detail: String(detail).slice(0, 300) });
const layouts = [];

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "kig-review-edge-"));
  const browser = await launch({ port: 9363, profile });
  const tab = await Tab.open(browser.port);
  try {
    await tab.viewport("mobile");
    const kit = async () => tab.eval(KIT);
    const state = () => tab.eval("window.__kit.state()");
    const layout = async (where) => {
      const l = await tab.eval("window.__kit.layout()");
      layouts.push({ where, ...l });
    };
    const waitFor = async (test, ms = 10000) => {
      const end = Date.now() + ms;
      for (;;) {
        const s = await state();
        if (test(s)) return s;
        if (Date.now() > end) return s;
        await sleep(120);
      }
    };
    const type = async (text) => {
      if (!(await tab.eval("window.__kit.focusAnswer()"))) return false;
      await tab.send("Input.insertText", { text });
      await sleep(80);
      return true;
    };
    const click = async (label) => tab.eval(`window.__kit.click(${JSON.stringify(label)})`);

    // the device record, as a finished lesson and yesterday's review leave it
    await tab.goto(`${ORIGIN}/passoff-grammar`, 800);
    await tab.eval(`localStorage.removeItem("kig-learning:passoff-grammar"); localStorage.removeItem("kig:list-open:passoff-grammar"); true`);
    if (BREAK !== "no-seed") await tab.eval(`localStorage.setItem("kig-learning:passoff-grammar", ${JSON.stringify(JSON.stringify(seed))}); true`);
    tab.resetEvents();
    await tab.goto(`${ORIGIN}/passoff-grammar`, 1500);
    await kit();
    const list = await tab.eval(`(() => { const e = document.querySelector("[data-passoff-review-entry]"); return e ? { kind: e.dataset.passoffReviewEntry, text: e.innerText.replace(/\\s+/g, " ").trim(), href: (e.querySelector("a") || {}).getAttribute ? e.querySelector("a").getAttribute("href") : null } : null; })()`);
    check(`R1 목록: '오늘 복습 · 약 ${MINUTES}분'(계획 ${plan.items.length}문항 · ${plan.seconds}초) → /passoff-grammar/review`,
      list && list.kind === "due" && list.text.includes(`오늘 복습 · 약 ${MINUTES}분`) && list.href === "/passoff-grammar/review", JSON.stringify(list));
    await layout("목록");

    // R2 — into the review
    await click("오늘 복습");
    await sleep(1500);
    await kit();
    let s = await waitFor((x) => x.step === "items" || x.step === "done", 15000);
    check(`R2 복습 쪽: '다음 날 확인 1 / ${plan.items.length}' · 첫 문항 ${TEST[0].key} · 레슨 이름 '2인칭'`,
      s.step === "items" && s.item === TEST[0].key && s.mode === "test" && s.text.includes(`다음 날 확인 1 / ${plan.items.length}`) && s.text.includes("2인칭"),
      `${s.step} ${s.item} ${s.mode} · ${s.text.slice(0, 120)}`);
    await layout("다음 날 확인 카드");

    // R3 — the check, like a test
    const answerForm = async (e, right) => {
      const it = e.item;
      if (it.kind === "choice") {
        const i = right ? it.answer : (it.answer + 1) % it.options.length;
        return tab.eval(`(() => { const b = [...document.querySelectorAll('[data-review-item] [aria-label="보기"] button')][${i}]; if (!b) return false; b.click(); return true; })()`);
      }
      if (it.kind === "short") {
        await type(right ? it.answer[0] : "zzz");
        return click("확인");
      }
      // select: tap the answer tokens (the buttons are the tokens with a letter or digit, in order), then their labels
      const alnum = it.tokens.map((t, i) => ({ t, i })).filter((x) => /[A-Za-z0-9]/.test(x.t)).map((x) => x.i);
      const picks = right ? it.answer : [alnum.find((i) => !it.answer.includes(i))];
      for (const [k, tokenIndex] of picks.entries()) {
        const button = alnum.indexOf(tokenIndex);
        await tab.eval(`window.__kit.tokenButtons()[${button}].click(); true`);
        await sleep(60);
        if (it.labels && it.labels.length && right) {
          const label = Array.isArray(it.labelAnswer) ? it.labelAnswer[k] : it.labelAnswer;
          await tab.eval(`(() => { const b = [...document.querySelectorAll('[data-review-item] [aria-label="이름표 고르기"] button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); if (b) b.click(); return Boolean(b); })()`);
          await sleep(60);
        }
      }
      return click("확인");
    };
    const testLog = [];
    for (let n = 0; n < TEST.length; n++) {
      s = await state();
      const e = ITEMS.get(s.item);
      if (!e || s.mode !== "test") break;
      const right = !WRONG.has(e.key);
      if (e.kind === "produce" || e.kind === "transfer") {
        await type(right ? e.item.en : "Wrong answer on purpose.");
        await click("확인");
      } else await answerForm(e, right);
      const before = s.item;
      s = await waitFor((x) => x.item !== before || x.step !== "items", 5000);
      // a test card shows no result: straight to the next item
      testLog.push({ key: e.key, right, next: s.item || s.step, leakedResult: /맞았어요|틀린 자리를 표시했어요|정답을 확인하세요|한 번 더 해 보세요/.test(s.text) && s.step === "items" });
    }
    check(`R3 다음 날 확인 ${TEST.length}문항을 시험처럼(결과 없이 바로 다음) — 일부러 틀린 것 ${[...WRONG].join(" · ")}`,
      testLog.length === TEST.length && testLog.every((x) => !x.leakedResult) && s.step === "results",
      `답 ${testLog.length}/${TEST.length} · 결과가 먼저 보인 카드 ${testLog.filter((x) => x.leakedResult).length} · 지금 ${s.step}`);

    // R4 — the results, together
    await sleep(300);
    s = await state();
    const sentences = TEST.filter((e) => e.kind === "produce" || e.kind === "transfer");
    const sentencesRight = sentences.filter((e) => !WRONG.has(e.key)).length;
    const counts = await tab.eval(`({ right: document.querySelectorAll('#review-results ~ ul .text-success, [aria-labelledby="review-results"] ul .text-success').length, wrong: document.querySelectorAll('[aria-labelledby="review-results"] ul .text-danger').length })`);
    check(`R4 결과를 한꺼번에: '${TEST.length}문항 중 ${TEST.length - WRONG.size}개 맞았어요' · 첫 시도 문법 정답 ${sentencesRight} / ${sentences.length} · 서술형 기준 · 목록 맞음 ${TEST.length - WRONG.size} · 틀림 ${WRONG.size}`,
      s.step === "results" && s.text.includes(`${TEST.length}문항 중 ${TEST.length - WRONG.size}개 맞았어요`) && s.text.includes(`첫 시도 문법 정답 ${sentencesRight} / ${sentences.length}`) &&
        s.text.includes("서술형 기준") && counts.right === TEST.length - WRONG.size && counts.wrong === WRONG.size && s.text.includes(`틀린 문항 다시 풀기 (${WRONG.size})`),
      `${JSON.stringify(counts)} · ${s.text.slice(0, 220)}`);
    await layout("결과");

    // R5 — the missed ones once more, with the ladder
    await click("틀린 문항 다시 풀기");
    s = await waitFor((x) => x.mode === "again", 5000);
    const againLog = [];
    let ladderSeen = false;
    for (let n = 0; n < WRONG.size; n++) {
      s = await state();
      const e = ITEMS.get(s.item);
      if (!e || s.mode !== "again") break;
      if (e.kind === "produce" || e.kind === "transfer") {
        if (n === 0) {
          await type("Wrong answer on purpose.");
          await click("확인");
          await sleep(300);
          const t = (await state()).text;
          ladderSeen = t.includes("틀린 자리를 표시했어요") && t.includes("다시 풀기");
          if (n === 0) await layout("사다리(틀린 자리)");
          await type(e.item.en);
          await click("다시 확인");
        } else {
          await type(e.item.en);
          await click("확인");
        }
        await sleep(300);
        const t = (await state()).text;
        // the first one was missed again in this presentation, so the card says when it comes back
        againLog.push({ key: e.key, right: t.includes("맞았어요") && (n === 0 ? t.includes("이 문장은 내일 다시 나와요.") : !t.includes("이 문장은")) });
        await click("다음 문장");
      } else {
        await answerForm(e, true);
        await sleep(300);
        againLog.push({ key: e.key, right: (await state()).text.includes("맞았어요") });
        await click("다음");
      }
      const before = e.key;
      s = await waitFor((x) => x.item !== before || x.step !== "again" && x.step !== "items", 5000);
    }
    check(`R5 '틀린 문항 다시 풀기 (${WRONG.size})' → 첫 문장은 또 틀려 '틀린 자리를 표시했어요'(사다리 ①) → 고쳐서 맞음 · 나머지도 맞음`,
      ladderSeen && againLog.length === WRONG.size && againLog.every((x) => x.right),
      `사다리 ${ladderSeen} · ${JSON.stringify(againLog)}`);

    // R6 — today's other items: a result each at once
    const practiceLog = [];
    for (let n = 0; n < PRACTICE.length; n++) {
      s = await state();
      const e = ITEMS.get(s.item);
      if (!e || s.mode !== "practice") break;
      if (n === 0) await layout("오늘 복습 카드");
      if (e.kind === "produce" || e.kind === "transfer") {
        await type(e.item.en);
        await click("확인");
        await sleep(300);
        practiceLog.push({ key: e.key, right: (await state()).text.includes("맞았어요") });
        await click("다음 문장");
      } else {
        await answerForm(e, true);
        await sleep(300);
        practiceLog.push({ key: e.key, right: (await state()).text.includes("맞았어요") });
        await click("다음");
      }
      const before = e.key;
      s = await waitFor((x) => x.item !== before || x.step === "done", 5000);
    }
    check(`R6 오늘 복습 ${PRACTICE.length}문항(${PRACTICE.map((e) => e.key).join(" · ")}) — 문항마다 바로 '맞았어요'`,
      practiceLog.length === PRACTICE.length && practiceLog.every((x) => x.right), JSON.stringify(practiceLog));

    // R7 — the end
    s = await waitFor((x) => x.step === "done" && /내일 올 문항/.test(x.text), 8000);
    const answered = TEST.length + PRACTICE.length;
    check(`R7 끝: '오늘 복습을 마쳤어요' · 오늘 푼 문항 ${answered}개 · 통과한 문장 0개 · 내일 올 문항 ${WRONG.size}개`,
      s.step === "done" && s.text.includes("오늘 복습을 마쳤어요") && s.text.includes(`오늘 푼 문항 ${answered}개`) && s.text.includes("통과한 문장 0개") && s.text.includes(`내일 올 문항 ${WRONG.size}개`),
      s.text.slice(0, 240));
    await layout("끝");

    // R8 — the record on this device
    const rec = JSON.parse(await tab.eval(`localStorage.getItem("kig-learning:passoff-grammar")`) || "null");
    const tomorrow = D.addDays(today, 1);
    const bad = [];
    for (const e of TEST) {
      const st = rec && rec.items[e.key];
      const wrong = WRONG.has(e.key);
      const ok = st && st.reviewDay === today && (wrong
        ? st.lastCorrect === false && st.dueDay === tomorrow && st.lapses === 1
        : st.lastCorrect === true && st.dueDay === D.addDays(today, 2) && st.passDays.includes(today));
      if (!ok) bad.push(`${e.key}:${JSON.stringify(st && { r: st.reviewDay, c: st.lastCorrect, d: st.dueDay, l: st.lapses })}`);
    }
    for (const e of PRACTICE) {
      const st = rec && rec.items[e.key];
      if (!(st && st.reviewDay === today && st.lastCorrect === true && st.step === 2 && st.dueDay === D.addDays(today, 4))) bad.push(`${e.key}:${JSON.stringify(st && { r: st.reviewDay, s: st.step, d: st.dueDay })}`);
    }
    const reviewLog = rec ? rec.log.filter((x) => x.where === "review" && x.day === today) : [];
    const effects = reviewLog.reduce((m, x) => ((m[x.effect] = (m[x.effect] || 0) + 1), m), {});
    const expectRetry = 1 + WRONG.size; // the first missed sentence twice, the others once
    check(`R8 기기 기록: ${answered}문항 모두 오늘 풂 · 틀린 ${WRONG.size}은 내일(${tomorrow}) · lapses 1 · 맞은 ${TEST.length - WRONG.size}은 이틀 뒤 · 복습 ${PRACTICE.length}은 나흘 뒤 · 오늘 답 ${TEST.length + expectRetry + PRACTICE.length}개(right ${TEST.length - WRONG.size + PRACTICE.length} · wrong ${WRONG.size} · retry ${expectRetry})`,
      rec && bad.length === 0 && reviewLog.length === TEST.length + expectRetry + PRACTICE.length && effects.right === TEST.length - WRONG.size + PRACTICE.length && effects.wrong === WRONG.size && effects.retry === expectRetry,
      `어긋남 ${bad.length}${bad.length ? ` ${bad.slice(0, 2).join(" ")}` : ""} · 답 ${reviewLog.length} ${JSON.stringify(effects)}`);

    // R9 — back to the list
    await click("과정 목록으로");
    await sleep(1500);
    await kit();
    const after = await tab.eval(`(() => { const e = document.querySelector("[data-passoff-review-entry]"); return e ? e.dataset.passoffReviewEntry + " " + e.innerText.trim() : null; })()`);
    check("R9 목록으로 돌아가면 '오늘 복습 없음'", after === "none 오늘 복습 없음", after);
    await layout("목록(끝난 뒤)");

    // R10 — the screens' layout
    const layoutBad = layouts.filter((l) => l.overflow > 0 || l.small.length || l.tiny.length || l.smallInput.length);
    check(`R10 화면 ${layouts.length}곳(${layouts.map((l) => l.where).join(" · ")}): 가로 넘침 0 · 44px 미만 누를 것 0 · 12px 미만 글 0 · 16px 미만 입력 칸 0`,
      layouts.length >= 6 && layoutBad.length === 0,
      layoutBad.map((l) => `${l.where}: 넘침 ${l.overflow} · 작은 것 ${l.small.slice(0, 3).join(",")} · 작은 글 ${l.tiny.slice(0, 2).join(",")} · 입력 ${l.smallInput.join(",")}`).join(" / ") || "0");

    // R11 — console
    const ev = tab.events;
    const badResponses = ev.badResponses.filter((r) => !/\/audio\//.test(r.url));
    check("R11 콘솔 오류 · 예외 · 실패한 요청 0(음성 파일 요청 제외 — 이 빌드엔 음성 저장소 값이 없음)",
      ev.console.length === 0 && ev.exceptions.length === 0 && badResponses.length === 0,
      JSON.stringify({ console: ev.console.slice(0, 2), exceptions: ev.exceptions.slice(0, 2), bad: badResponses.slice(0, 3) }));

    // S — with a licence: the same review, from the server
    const secretsFile = arg("secrets");
    if (secretsFile) {
      const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
      const crypto = require("crypto");
      const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
      const key = `KIG-STU1Y-${nonce}-${crypto.createHmac("sha256", sec.LICENSE_SALT).update(`STU1Y:${nonce}`).digest("hex").slice(0, 16).toUpperCase()}`;
      const activated = await fetch(`${ORIGIN}/api/license/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, deviceId: `review-drive-${Date.now()}`, deviceName: "review drive" }),
      });
      const session = (activated.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).find((c) => c.startsWith("kig_license_session="));
      if (!session) throw new Error(`licence activation failed: ${activated.status}`);
      await tab.send("Network.setCookie", { name: "kig_license_session", value: session.slice("kig_license_session=".length), url: ORIGIN, httpOnly: true });
      await tab.goto(`${ORIGIN}/passoff-grammar`, 600);
      await tab.eval(`localStorage.setItem("kig-learning:passoff-grammar", ${JSON.stringify(JSON.stringify(seed))}); localStorage.removeItem("kig-learning-owner:passoff-grammar"); true`);
      tab.resetEvents();
      await tab.goto(`${ORIGIN}/passoff-grammar/review`, 1500);
      await kit();
      s = await waitFor((x) => x.step === "items" || x.step === "error" || x.step === "done", 20000);
      const serverPage = !(await tab.eval(`Boolean(document.querySelector('[data-kig-paid-extra="license"]'))`));
      const apiCalls = tab.events.requests.filter((u) => u.includes("/api/learning/passoff-grammar")).length;
      check(`S1 이용권: 서버 판(무료 안내 없음) · '다음 날 확인 1 / ${plan.items.length}' · 문항은 API 로(요청 ${apiCalls})`,
        serverPage && s.step === "items" && s.item === TEST[0].key && s.text.includes(`다음 날 확인 1 / ${plan.items.length}`) && apiCalls >= 1,
        `${serverPage} · ${s.step} ${s.item} · ${s.text.slice(0, 100)}`);
      let answeredS = 0;
      let resultsText = "";
      for (let n = 0; n < TEST.length + PRACTICE.length + 1; n++) {
        s = await state();
        if (s.step === "results") {
          resultsText = s.text;
          await click(s.text.includes("이어서 복습") ? "이어서 복습" : "복습 마치기");
          s = await waitFor((x) => x.step !== "results", 5000);
          continue;
        }
        if (s.step !== "items") break;
        const e = ITEMS.get(s.item);
        if (!e) break;
        if (e.kind === "produce" || e.kind === "transfer") {
          await type(e.item.en);
          await click("확인");
          if (s.mode === "practice") {
            await sleep(250);
            await click("다음 문장");
          }
        } else {
          await answerForm(e, true);
          if (s.mode === "practice") {
            await sleep(250);
            await click("다음");
          }
        }
        answeredS += 1;
        const before = e.key;
        s = await waitFor((x) => x.item !== before || x.step !== "items", 5000);
      }
      s = await waitFor((x) => x.step === "done" && /내일 올 문항/.test(x.text), 10000);
      check(`S2 이용권: ${answeredS}문항 모두 맞힘 → 결과 '${TEST.length}문항 중 ${TEST.length}개' → 끝: 오늘 푼 문항 ${answered}개 · 내일 올 문항 0개`,
        answeredS === answered && resultsText.includes(`${TEST.length}문항 중 ${TEST.length}개 맞았어요`) && s.text.includes(`오늘 푼 문항 ${answered}개`) && s.text.includes("내일 올 문항 0개"),
        `${answeredS} · 결과 ${resultsText.includes(`${TEST.length}문항 중 ${TEST.length}개 맞았어요`)} · ${s.text.slice(0, 200)}`);
      const owner = await tab.eval(`localStorage.getItem("kig-learning-owner:passoff-grammar")`);
      const back = await fetch(`${ORIGIN}/api/learning/passoff-grammar`, { method: "POST", headers: { "content-type": "application/json", cookie: session }, body: JSON.stringify({ record: null, owner }) });
      const kept = await back.json().catch(() => null);
      const onServer = kept && kept.record ? [...TEST, ...PRACTICE].filter((e2) => kept.record.items[e2.key] && kept.record.items[e2.key].reviewDay === today).length : -1;
      check(`S3 서버에 남은 기록: ${answered}문항 모두 오늘 풂(${today}) · 기기에 이 이용권 표시(owner id-…)`,
        back.status === 200 && onServer === answered && typeof owner === "string" && owner.startsWith("id-") && kept.owner === owner,
        `${back.status} · 서버 ${onServer}/${answered} · owner ${owner ? owner.slice(0, 5) : owner}…`);
      const evS = tab.events;
      const badS = evS.badResponses.filter((r) => !/\/audio\//.test(r.url));
      check("S4 이용권 쪽 콘솔 오류 · 예외 · 실패한 요청 0", evS.console.length === 0 && evS.exceptions.length === 0 && badS.length === 0,
        JSON.stringify({ console: evS.console.slice(0, 2), exceptions: evS.exceptions.slice(0, 2), bad: badS.slice(0, 3) }));
    }
  } catch (error) {
    check("드라이버 오류 없이 끝까지", false, error && error.stack ? error.stack.slice(0, 300) : String(error));
  } finally {
    await tab.close();
    browser.proc.kill();
    await sleep(500);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
  for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${rows.length}`);
  process.exit(failed ? 1 : 0);
})();
