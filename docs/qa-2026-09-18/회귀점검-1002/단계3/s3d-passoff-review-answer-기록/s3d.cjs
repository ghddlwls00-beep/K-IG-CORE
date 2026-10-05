// 회귀 점검 1002 단계 3 보충 3 (rc1002-s3d) — PASS-OFF 오늘 복습에 실제로 답하기 · 오답노트 '지금 다시 풀기' (감사 이용권 사본 rc1002-s3b)
// 같은 AI 계열이 만들고 점검함 — 독립 검수 아님. 스크래치 대본(저장소 도구는 require 만 · 바꾸지 않음).
// 따라 한 도구: docs/pass-off-grammar/검사/drive-review.cjs R3~R6 · N2~N3 (이용권 없는 로컬 판) → 여기서는 운영 · 이용권 판.
//   node s3d.cjs state  --port 9980 --out <jsonl> [--viewports desktop] [--label 복습 전]
//   node s3d.cjs review --port 9981 --out <jsonl> --viewport desktop --wrong pg01-1:p3,pg01-1:p13,pg01-1:s4 [--reload-after 2] [--help] [--speak]
//   node s3d.cjs notes  --port 9982 --out <jsonl> --viewport mobile [--lesson pg01-1] [--miss-first]
// 읽기: GET /api/progress/passoff-grammar(요약) · 기기 학습 기록 요약(이용권 id · 토큰 · 쿠키 · 요청 본문 출력 0).
// 쓰기(사장님 2026-10-05 허락 — 감사 이용권 학습 기록에 답을 남겨도 됨): 복습 · 오답노트 화면이 앱 스스로 보내는 POST /api/learning/passoff-grammar 뿐.
//   강의 완료 · /api/progress 쓰기 · /api/license · /api/admin 0. '내 답도 맞아요'(신고)는 누르지 않음(사장님 판정 줄에 들어가므로).
//   바꾼 것은 data-changes.jsonl 에 by "rc1002-s3d".
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const S = path.join(REPO, "docs/qa-2026-09-18/scripts");
const H = require(path.join(S, "lib/harness.cjs"));
const P = require(path.join(S, "lib/passoff-expect.cjs"));

const argv = process.argv.slice(2);
const MODE = argv[0];
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes(n);
const PORT = Number(arg("--port", 9980));
if (PORT < 9980 || PORT > 9984) { console.error("port 9980~9984 only"); process.exit(2); }
const OUTF = arg("--out", path.join(__dirname, `s3d-${MODE}.jsonl`));
const VIEWPORTS = arg("--viewports", "desktop").split(",");
const VIEWPORT = arg("--viewport", "desktop");
const LABEL = arg("--label", "");
const WRONG = new Set((arg("--wrong", "") || "").split(",").filter(Boolean));
const RELOAD_AFTER = Number(arg("--reload-after", 0));
const HELP = flag("--help");
const SPEAK = flag("--speak");
const NOTES_LESSON = arg("--lesson", null);
const MISS_FIRST = flag("--miss-first");
const CLONE = "rc1002-s3b"; // 앞 일꾼들의 사본 그대로(원본 프로필 안 건드림)
const BY = "rc1002-s3d";
const COURSE = "passoff-grammar";
const LESSONS = ["pg01-1", "pg01-2", "pg01-3"];
const TITLES = { "pg01-1": "1인칭", "pg01-2": "2인칭", "pg01-3": "3인칭" };
const tx = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const FAKE = /\b(hows|whens|buts|wheres|saids|alway|untils|veries|ands|evens|withs|abouts|throughs|becauses|sinces|quicklies|nevers|wents|tooks|gots|whats|whos|whys)\b/i;
const NET_HOOK = `(() => { if (window.__s3bNet) return; window.__s3bNet = []; const of = window.fetch; window.fetch = function (input, init) { const url = typeof input === 'string' ? input : (input && input.url) || ''; const method = (init && init.method) || (input && input.method) || 'GET'; const p = of.apply(this, arguments); if (/\\/api\\//.test(url)) p.then((r) => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: r.status, t: Date.now() }), () => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: -1, t: Date.now() })); return p; }; })()`;

// the items as a licensed learner has them (paid supplement put back) — keys → data, to answer like a learner who knows them
const EXP = {};
const ITEMS = new Map();
for (const id of LESSONS) {
  const e = P.expectedPassoff(id, { licensed: true });
  EXP[id] = e;
  for (const it of e.produce) ITEMS.set(it.id, { lessonId: id, kind: "produce", item: it, e });
  for (const it of e.transfers) ITEMS.set(it.id, { lessonId: id, kind: "transfer", item: it, e });
  for (const it of e.forms) ITEMS.set(it.id, { lessonId: id, kind: it.kind, item: it, e });
}
const isSentence = (x) => x.kind === "produce" || x.kind === "transfer";
/** the answer as the screen draws it — a Korean word in Hangul ('I live in 서울.') — else the lesson's spelling */
const hangulForm = (x) => (isSentence(x) ? x.e.answerForms(x.item.en).hangul : null);
const wrongTextFor = (x) => {
  // a wrong answer with the screen's Hangul in it (pg01-1:p13 'I lives in 서울.') — so the ladder and '내 답' must keep it in Hangul
  const h = hangulForm(x);
  if (h) return h.replace(/\bI live\b/, "I lives").replace(/\bHe is\b/, "He are");
  return "Wrong answer on purpose.";
};

const rows = [];
function row(r) { rows.push(r); fs.appendFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(`${String(r.verdict).padEnd(7)} ${r.viewport} · ${r.screen} · ${r.what} — ${String(r.saw).slice(0, 500)}`); }

async function freeMemOk() {
  const { execFileSync } = require("child_process");
  for (;;) {
    const kb = Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim());
    if (kb / 1024 / 1024 >= 0.9) { console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB`); return (kb / 1024 / 1024).toFixed(2); }
    console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB < 0.9 — waiting 60 s`);
    await H.sleep(60000);
  }
}

async function progressGet(tab) {
  return await tab.eval(`fetch('/api/progress/passoff-grammar', { credentials: 'same-origin', cache: 'no-store' }).then(async (r) => {
    if (!r.ok) return { status: r.status };
    const b = await r.json(); const p = b.progress || {};
    const lessons = p.lessons || {};
    return { status: r.status, completed: Object.keys(lessons).filter((k) => lessons[k] && lessons[k].completed) };
  }).catch((e) => ({ status: -1, error: String(e) }))`).catch((e) => ({ error: e.message }));
}

// this licence's record on the device (the copy the server sent back) — summary only, no licence id
const RECORD = `(() => {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('kig-learning:passoff-grammar'));
  return keys.map((k) => { let r = null; try { r = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    if (!r) return { which: k.includes('@') ? 'licence' : 'free', parsed: false };
    const items = Object.entries(r.items || {});
    const byLesson = {}; const due = {}; const reviewed = {}; let wrong = 0, lapses = 0; const wrongKeys = []; const per = {};
    for (const [key, s] of items) { byLesson[s.lessonId] = (byLesson[s.lessonId] || 0) + 1; due[s.dueDay] = (due[s.dueDay] || 0) + 1; if (s.reviewDay) reviewed[s.reviewDay] = (reviewed[s.reviewDay] || 0) + 1;
      if (s.lastCorrect === false) { wrong++; wrongKeys.push(key); } if (s.lapses > 0) lapses++;
      per[key] = [s.dueDay, s.step, s.lastCorrect, s.lapses, s.reviewDay, (s.passDays || []).length, s.pending ? 'P' : ''].join('|'); }
    const logBy = {}; for (const l of r.log || []) { const kk = (l.where || '?') + ':' + (l.effect || '?'); logBy[kk] = (logBy[kk] || 0) + 1; }
    return { which: k.includes('@') ? 'licence' : 'free', lessons: Object.fromEntries(Object.entries(r.lessons || {}).map(([id, v]) => [id, v && v.day])), items: items.length, byLesson, dueDays: due, reviewDays: reviewed, wrongNow: wrong, wrongKeys, withLapses: lapses, log: (r.log || []).length, logBy, reports: (r.reports || []).length, lastStudyDay: r.lastStudyDay || null, per };
  });
})()`;

const ENTRY = `(() => { const e = document.querySelector('[data-passoff-review-entry]'); const n = document.querySelector('[data-passoff-notes-entry]');
  return { review: e ? { kind: e.dataset.passoffReviewEntry, text: e.innerText.replace(/\\s+/g, ' ').trim(), href: (e.querySelector('a') || {}).getAttribute ? e.querySelector('a').getAttribute('href') : null } : null,
    notes: n ? { text: n.innerText.replace(/\\s+/g, ' ').trim(), href: n.getAttribute('href') } : null }; })()`;

const ST = `(() => { const s = document.querySelector('[data-review-step]') || document.querySelector('[data-notes-step]'); const it = document.querySelector('[data-review-item]'); const m = document.querySelector('main');
  const pb = document.querySelector('main [role=progressbar]'); const pl = pb ? pb.parentElement.querySelector('p') : null;
  return { path: location.pathname + location.search, step: s ? (s.dataset.reviewStep || s.dataset.notesStep) : null, item: it ? it.dataset.reviewItem : null, mode: it ? it.dataset.reviewMode : null,
    progress: pl ? pl.innerText.replace(/\\s+/g, ' ').trim() : null, bar: pb ? pb.getAttribute('aria-valuenow') + '/' + pb.getAttribute('aria-valuemax') : null,
    card: it ? it.innerText.replace(/\\s+/g, ' ').trim().slice(0, 900) : null, focus: document.activeElement ? (document.activeElement === document.body ? 'BODY' : document.activeElement.hasAttribute('data-review-item') ? 'item:' + document.activeElement.dataset.reviewItem : (document.activeElement.id || document.activeElement.tagName)) : null,
    text: m ? m.innerText.replace(/\\s+/g, ' ').trim().slice(0, 4000) : '' }; })()`;
const state = (tab) => tab.eval(ST).catch((e) => ({ error: e.message, text: "" }));

const LAYOUT = `(() => { const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const main = document.querySelector('main'); const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, small: [], tiny: [], smallInput: [] };
  for (const el of main.querySelectorAll('button, a[href], input, textarea, select')) { if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) out.small.push((el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  for (const el of main.querySelectorAll('*')) { if (!vis(el)) continue; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(el).fontSize) < 12) out.tiny.push(el.textContent.trim().slice(0, 30)); }
  for (const el of main.querySelectorAll('input, textarea')) if (vis(el) && parseFloat(getComputedStyle(el).fontSize) < 16) out.smallInput.push(el.getAttribute('aria-label'));
  return out; })()`;
const layouts = [];
async function layout(tab, where) {
  const l = await tab.eval(LAYOUT).catch((e) => ({ error: e.message, small: [], tiny: [], smallInput: [] }));
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  layouts.push({ where, ...l, leak: snap && snap.leak, errorScreen: snap && snap.errorScreen, clipped: snap ? snap.clippedText : [], text: snap ? snap.text : "" });
}

/** a visible, enabled button (or link) in `scope` whose words are `label` (exact) or start with it */
const BTN = (label, scope = "main", starts = false) => `[...document.querySelectorAll(${JSON.stringify(`${scope} button, ${scope} a[href]`)})].find((b) => { const r = b.getBoundingClientRect(); const t = (b.innerText || '').replace(/\\s+/g, ' ').trim(); return r.width > 0 && r.height > 0 && !b.disabled && (${starts} ? t.startsWith(${JSON.stringify(label)}) : t === ${JSON.stringify(label)}); })`;
const press = (tab, label, scope, starts) => H.click(tab, BTN(label, scope, starts), { settle: 250 });
const CARD_TEXT = `((document.querySelector('[data-review-item]') || {}).innerText || '').replace(/\\s+/g, ' ').trim()`;
async function waitCard(tab, re, ms = 4000) {
  const end = Date.now() + ms; let t = "";
  while (Date.now() < end) { t = await tab.eval(CARD_TEXT).catch(() => ""); if (re.test(t)) return t; await H.sleep(120); }
  return t;
}
async function waitMove(tab, from, ms = 6000) {
  const end = Date.now() + ms; let s = null;
  while (Date.now() < end) { s = await state(tab); if (s.item !== from.item || s.step !== from.step || s.mode !== from.mode) return s; await H.sleep(120); }
  return s;
}

function romanAll(text) {
  const out = [];
  for (const k of ["passoff-grammar/__none__", ...LESSONS.map((l) => `passoff-grammar/${l}`)]) for (const h of P.romanOnScreen(k, text)) if (!out.some((o) => o.text === h.text)) out.push(h);
  return out;
}
function common(name, viewport, tab, texts) {
  const ev = H.events(tab);
  const allText = texts.join("\n");
  const roman = romanAll(allText);
  const fake = allText.match(new RegExp(FAKE.source, "gi")) || [];
  const bad = ev.badResponses || [];
  row({ viewport, screen: name, what: "4xx/5xx · 콘솔 오류 · 예외 · 실패한 요청", expect: "모두 0", saw: `4xx/5xx ${bad.length}${bad.length ? " " + bad.slice(0, 4).map((r) => `${r.status} ${String(r.url).replace(H.BASE, "").split("?")[0]}`).join(" · ") : ""} · 콘솔 ${ev.console.length}${ev.console.length ? " " + JSON.stringify(ev.console.slice(0, 2)).slice(0, 240) : ""} · 예외 ${ev.exceptions.length}${ev.exceptions.length ? " " + String(ev.exceptions[0]).slice(0, 200) : ""} · 실패 ${ev.failed.length}${ev.failed.length ? " " + ev.failed.slice(0, 2).join(",") : ""}`, verdict: !bad.length && !ev.exceptions.length && !ev.failed.length ? (ev.console.length ? "INFO" : "PASS") : "FAIL" });
  row({ viewport, screen: name, what: "로마자 한국어 낱말 · 'Busan(부산)' 꼴 · 가짜 낱말(whens 등)", expect: "0", saw: `로마자 ${roman.length}${roman.length ? " " + roman.slice(0, 3).map((r) => r.text).join(" · ") : ""} · 가짜 낱말 ${fake.length}${fake.length ? " " + fake.join(",") : ""}`, verdict: roman.length || fake.length ? "FAIL" : "PASS" });
}
function layoutRow(viewport, screen) {
  const bad = layouts.filter((l) => l.overflow > 0 || l.small.length || l.tiny.length || l.smallInput.length || l.leak || l.errorScreen || (l.clipped || []).length);
  row({ viewport, screen, what: `화면 ${layouts.length}곳(${layouts.map((l) => l.where).join(" · ")}): 가로 넘침 · 44px 미만 누를 것 · 12px 미만 글 · 16px 미만 입력 칸 · 잘린 글 · 새 글(undefined 등) · 오류 화면`, expect: "0",
    saw: bad.length ? bad.map((l) => `${l.where}: 넘침 ${l.overflow} · 작은 것 ${l.small.slice(0, 3).join(",")} · 작은 글 ${l.tiny.slice(0, 2).join(",")} · 입력 ${l.smallInput.join(",")} · 잘림 ${(l.clipped || []).join(",")} · 새 글 ${l.leak} · 오류 ${l.errorScreen}`).join(" / ") : "0",
    verdict: bad.length ? "FAIL" : "PASS" });
}

// ── answering one card ──
async function typeInto(tab, sel, text) { return H.type(tab, `document.querySelector(${JSON.stringify(sel)})`, text); }
const SENT_BOX = '[data-review-item] textarea[aria-label="영작 답"]';
const SHORT_BOX = '[data-review-item] input[aria-label="답"]';

/** returns { given, warnedHangul } */
async function answerCard(tab, x, right, { again = false } = {}) {
  const it = x.item;
  if (isSentence(x)) {
    const h = hangulForm(x);
    const text = right ? h || it.en : wrongTextFor(x);
    await typeInto(tab, SENT_BOX, text);
    await H.sleep(200);
    const warnedHangul = /한글이 섞여 있어요/.test(await tab.eval(CARD_TEXT).catch(() => ""));
    const c = await press(tab, again ? "다시 확인" : "확인", "[data-review-item]");
    return { given: text, hangulTyped: /[가-힣]/.test(text), warnedHangul, clicked: c.ok };
  }
  if (it.kind === "choice") {
    const i = right ? it.answer : (it.answer + 1) % it.options.length;
    const c = await H.click(tab, `document.querySelector('[data-review-item] [aria-label="보기"] button[data-option="${i}"]')`, { settle: 200 });
    return { given: `option ${i}`, clicked: c.ok };
  }
  if (it.kind === "short") {
    const text = right ? it.answer[0] : "zzz";
    await typeInto(tab, SHORT_BOX, text);
    await H.sleep(150);
    const c = await press(tab, "확인", "[data-review-item]");
    return { given: text, clicked: c.ok };
  }
  // select: the answer tokens (buttons are the tokens with a letter or digit), then their labels
  const alnum = it.tokens.map((t, i) => ({ t, i })).filter((o) => /[A-Za-z0-9]/.test(o.t)).map((o) => o.i);
  const picks = right ? it.answer : [alnum.find((i) => !it.answer.includes(i))];
  const shownTokens = await tab.eval(`[...document.querySelectorAll('[data-review-item] [aria-label="낱말 고르기"] button')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`).catch(() => []);
  for (const [k, tokenIndex] of picks.entries()) {
    const b = alnum.indexOf(tokenIndex);
    await H.click(tab, `document.querySelectorAll('[data-review-item] [aria-label="낱말 고르기"] button')[${b}]`, { settle: 120 });
    if (it.labels && it.labels.length && right) {
      const label = Array.isArray(it.labelAnswer) ? it.labelAnswer[k] : it.labelAnswer;
      await H.click(tab, `[...document.querySelectorAll('[data-review-item] [aria-label="이름표 고르기"] button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)})`, { settle: 120 });
    }
  }
  const c = await press(tab, "확인", "[data-review-item]");
  return { given: `tokens ${picks.join(",")}`, shownTokens, clicked: c.ok };
}

/** the sentence's speak button after a right answer: the clip it asks for and whether it played */
async function speak(tab, x) {
  await H.audioLog(tab, { clear: true });
  const c = await H.click(tab, `document.querySelector('[data-review-item] button[aria-label="문장 듣기"]')`, { settle: 100 });
  let log = [];
  const end = Date.now() + 6000;
  while (Date.now() < end) { log = await H.audioLog(tab); if (log.some((e) => e.ev === "playing" || e.ev === "ended" || e.ev === "error" || e.ev === "play-rejected")) break; await H.sleep(150); }
  await H.sleep(400);
  log = await H.audioLog(tab);
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const clip = x.e.clipOf(x.item);
  const plays = log.filter((e) => e.ev === "play()");
  const src = plays.length ? plays[0].src : null;
  const played = log.some((e) => e.ev === "playing" || e.ev === "ended");
  const err = log.filter((e) => e.ev === "error" || (e.ev === "play-rejected" && e.name !== "AbortError"));
  const tts = log.filter((e) => e.ev === "tts.speak" && (e.text || "").trim());
  const clipName = String(clip || "").split("/").pop();
  return { clicked: c.ok, src: src ? (() => { try { return new URL(src).pathname; } catch { return src; } })() : null, expected: clip, sameClip: !!(src && clipName && src.includes(clipName)), played, errors: err.length, tts: tts.length };
}

// ── today's review, driven like a learner ──
async function reviewMode(tab, viewport) {
  const screen = `오늘 복습(${viewport})`;
  await H.setViewport(tab, viewport);
  await tab.eval("window.__s3bNet && (window.__s3bNet.length = 0)").catch(() => {});
  // 1. the list's entry
  await H.load(tab, "/passoff-grammar", { marker: null });
  await H.waitFor(tab, `!!document.querySelector('[data-passoff-review-entry]')`, 15000);
  await H.sleep(1500);
  await tab.eval("sessionStorage.setItem('kig:audit:keep', '1')"); // from here on the device keeps its storage, as a learner's does
  const ent = await tab.eval(ENTRY).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "목록 /passoff-grammar", what: "오늘 복습 입구 · 오답노트 입구", expect: "'오늘 복습 · 약 N분' → /passoff-grammar/review", saw: JSON.stringify(ent), verdict: ent.review && ent.review.kind === "due" && /오늘 복습 · 약 \d+분/.test(ent.review.text) && ent.review.href === "/passoff-grammar/review" ? "PASS" : "FAIL" });
  await layout(tab, "목록");
  const texts = [];
  // 2. into the review (the entry's link — in-app)
  await H.click(tab, `document.querySelector('[data-passoff-review-entry] a')`, { settle: 300 });
  await H.waitFor(tab, `!!document.querySelector('[data-review-step="items"], [data-review-step="done"], [data-review-step="error"]')`, 20000);
  await H.sleep(800);
  let s = await state(tab);
  const intro = /(어제|지난번에) 배운 강의의 문항이에요/.test(s.text);
  const firstX = ITEMS.get(s.item);
  row({ viewport, screen, what: "열기: 진행 줄 · 안내 · 강의 이름 · 첫 문항", expect: "'다음 날 확인 1 / N' · '어제 배운 강의의 문항이에요 …' · 강의 이름", saw: JSON.stringify({ path: s.path, step: s.step, progress: s.progress, bar: s.bar, item: s.item, mode: s.mode, lesson: firstX && TITLES[firstX.lessonId], intro, head: s.text.slice(0, 160) }),
    verdict: s.step === "items" && s.mode === "test" && /^다음 날 확인 1 \/ \d+$/.test(s.progress || "") && intro && firstX && s.text.includes(TITLES[firstX.lessonId]) ? "PASS" : s.step === "done" ? "INFO" : "FAIL" });
  await layout(tab, "다음 날 확인 첫 카드");
  texts.push(s.text);

  const log = []; // every answer this page took
  const testLog = []; // the test segment's answers (since the last reload)
  let reloaded = false;
  let resultsSeen = 0;
  let helpDone = false, speakDone = 0;
  const againLog = [];
  const practiceLog = [];
  let doneInfo = null;
  for (let guard = 0; guard < 300; guard++) {
    s = await state(tab);
    if (s.step === "items" && s.mode === "test") {
      const x = ITEMS.get(s.item);
      if (!x) { row({ viewport, screen, what: `모르는 문항 ${s.item}`, expect: "pg01-1~3 문항", saw: s.card && s.card.slice(0, 100), verdict: "FAIL" }); break; }
      const right = !WRONG.has(s.item);
      const before = s;
      const a = await answerCard(tab, x, right);
      const after = await waitMove(tab, before);
      await H.sleep(80);
      const leaked = after.step === "items" && after.item === before.item;
      const focusOk = after.step === "items" ? after.focus === `item:${after.item}` : after.step === "results" ? after.focus === "review-results" : true;
      const entry = { key: s.item, kind: x.kind, right, ...a, progress: before.progress, next: after.item || after.step, stuck: leaked, focusOk, focus: after.focus, resultShown: /맞았어요|틀린 자리를 표시했어요|정답을 확인하세요|한 번 더 해 보세요/.test(after.card || "") && after.step === "items" && after.mode === "test" };
      testLog.push(entry); log.push({ where: "test", ...entry });
      texts.push(before.text);
      if (a.hangulTyped) row({ viewport, screen, what: `화면대로 한글로 쓴 답 ${s.item}(${right ? "맞는 답" : "일부러 틀린 답"})`, expect: right ? "받아들여 다음으로(결과는 끝에서) · 입력 중 경고는 기록" : "틀림으로 받아 다음으로", saw: JSON.stringify({ given: a.given, warnedWhileTyping: a.warnedHangul, next: entry.next }), verdict: !leaked ? "PASS" : "FAIL" });
      if (x.kind === "select" && (a.shownTokens || []).some((t) => /[가-힣]/.test(t))) row({ viewport, screen, what: `낱말 고르기 카드의 한국어 낱말 ${s.item}`, expect: "한글로 보임", saw: JSON.stringify(a.shownTokens), verdict: (a.shownTokens || []).some((t) => /대한|서울|홍길동/.test(t)) ? "PASS" : "FAIL" });
      if (testLog.length === 1) await layout(tab, "다음 날 확인 둘째 카드");
      if (RELOAD_AFTER && !reloaded && testLog.length === RELOAD_AFTER && after.step === "items") {
        reloaded = true;
        const answered = testLog.map((t) => t.key);
        const pre = { progress: after.progress, item: after.item };
        await tab.send("Page.reload");
        await H.sleep(1500);
        await H.waitFor(tab, `!!document.querySelector('[data-review-step="items"], [data-review-step="done"], [data-review-step="error"]')`, 20000);
        await H.sleep(800);
        const r = await state(tab);
        row({ viewport, screen, what: `답 ${answered.length}개(${answered.join(" · ")}) 뒤 새로고침`, expect: "답한 문항은 다시 안 나옴 · 남은 문항부터 이어서('다음 날 확인 1 / 남은 수')", saw: JSON.stringify({ before: pre, after: { step: r.step, progress: r.progress, item: r.item, mode: r.mode } }),
          verdict: r.step === "items" && !answered.includes(r.item) && /^다음 날 확인 1 \/ \d+$/.test(r.progress || "") ? "PASS" : "FAIL" });
        testLog.length = 0; // the results after a reload show this page's test only
        texts.push(r.text);
      }
      continue;
    }
    if (s.step === "results") {
      resultsSeen++;
      await H.sleep(300);
      const R = await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="review-results"]'); if (!sec) return null; const T = (e) => (e ? e.innerText : '').replace(/\\s+/g, ' ').trim();
        return { head: T(sec.querySelector('#review-results')), status: T(sec.querySelector('p[role=status]')), score: sec.querySelector('dl') ? T(sec.querySelector('dl')) : null,
          rows: [...sec.querySelectorAll('[data-review-result]')].map((li) => ({ key: li.dataset.reviewResult, ok: /^맞음/.test(((li.querySelector('.sr-only') || {}).textContent || '').trim()), mine: ((li.innerText.match(/내 답: ([^\\n]*)/) || [])[1] || null), report: !!li.querySelector('[data-my-answer-report="button"]') })),
          buttons: [...sec.querySelectorAll('button')].map(T).filter((t) => !/내 답도 맞아요/.test(t)), caption: T(sec).includes('틀린 문항은 내일 다시 나와요.'),
          focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null }; })()`).catch((e) => ({ error: e.message }));
      const answered = testLog.length;
      const rightN = testLog.filter((t) => t.right).length;
      const wrongKeys = testLog.filter((t) => !t.right).map((t) => t.key);
      const sents = testLog.filter((t) => t.kind === "produce" || t.kind === "transfer");
      const sentRight = sents.filter((t) => t.right).length;
      const okRows = R && R.rows && R.rows.length === answered && R.rows.every((r) => r.ok === !WRONG.has(r.key)) && R.rows.filter((r) => !r.ok).every((r) => r.report);
      const mineHangul = R && R.rows ? R.rows.filter((r) => r.mine && /[가-힣]/.test(r.mine)).map((r) => `${r.key}: ${r.mine}`) : [];
      row({ viewport, screen, what: `다음 날 확인 결과(답 ${answered} · 일부러 틀림 ${wrongKeys.join(" · ") || "0"})`, expect: `'${answered}문항 중 ${rightN}개 맞았어요.' · 첫 시도 문법 정답 ${sentRight} / ${sents.length} · 서술형 기준 · 줄마다 맞음/틀림 · 틀린 줄에 '내 답' · '내 답도 맞아요' · ${wrongKeys.length ? `'틀린 문항 다시 풀기 (${wrongKeys.length})' · '다시 풀지 않고 …' · '틀린 문항은 내일 다시 나와요.'` : "'이어서 복습' 또는 '복습 마치기'"} · 결과 제목에 초점`,
        saw: JSON.stringify({ head: R && R.head, status: R && R.status, score: R && R.score, rows: R && R.rows && R.rows.map((r) => `${r.key}${r.ok ? "○" : "×"}${r.mine ? " 내 답 " + r.mine : ""}${r.report ? " [신고 단추]" : ""}`), buttons: R && R.buttons, caption: R && R.caption, focus: R && R.focus }),
        verdict: R && R.status === `${answered}문항 중 ${rightN}개 맞았어요.` && (!sents.length || (R.score || "").includes(`첫 시도 문법 정답 ${sentRight} / ${sents.length}`)) && (!sents.length || (R.score || "").includes("서술형 기준")) && okRows && R.focus === "review-results" &&
          (wrongKeys.length ? R.buttons.some((b) => b === `틀린 문항 다시 풀기 (${wrongKeys.length})`) && R.buttons.some((b) => /^다시 풀지 않고 (이어서|마치기)$/.test(b)) && R.caption : R.buttons.some((b) => /^(이어서 복습|복습 마치기)$/.test(b))) ? "PASS" : "FAIL" });
      if (mineHangul.length || wrongKeys.some((k) => hangulForm(ITEMS.get(k)))) row({ viewport, screen, what: "결과의 '내 답'(한글로 쓴 틀린 답)", expect: "쓴 그대로 한글(로마자로 바뀌지 않음)", saw: JSON.stringify(mineHangul), verdict: mineHangul.length && mineHangul.every((m) => !/Seoul|Daehan|Hong/.test(m)) ? "PASS" : "FAIL" });
      const fl = testLog.filter((t) => !t.focusOk);
      const leaks = testLog.filter((t) => t.resultShown || t.stuck);
      row({ viewport, screen, what: `시험처럼: 답 ${testLog.length}개 — 답하면 결과 없이 바로 다음 · 초점은 새 문항(마지막엔 결과 제목)`, expect: "결과 먼저 보임 0 · 멈춤 0 · 초점 어긋남 0", saw: `결과 먼저 ${leaks.length} · 초점 어긋남 ${fl.length}${fl.length ? " " + JSON.stringify(fl.slice(0, 3).map((f) => `${f.key}→${f.focus}`)) : ""}`, verdict: !leaks.length && !fl.length ? "PASS" : "FAIL" });
      await layout(tab, `결과 ${resultsSeen}`);
      texts.push(s.text);
      if (testLog.length) H.logDataChange({ course: COURSE, id: `review:${[...new Set(testLog.map((t) => ITEMS.get(t.key).lessonId))].join(",")}`, action: `rc1002-s3d: PASS-OFF 오늘 복습 다음 날 확인에 답함(${viewport}) — ${testLog.length}문항 · 맞는 답 ${rightN} · 일부러 틀린 답 ${wrongKeys.length}(${wrongKeys.join(" · ") || "없음"}) · 한글로 쓴 답 ${testLog.filter((t) => t.hangulTyped).map((t) => t.key).join(" · ") || "없음"} — 학습 기록(복습 일정 · 틀린 문항은 내일 다시 · lapses +1) 바뀜`, by: BY, detail: `결과 화면 '${R && R.status}'` });
      testLog.length = 0;
      const again = R && R.buttons && R.buttons.find((b) => /^틀린 문항 다시 풀기/.test(b));
      await press(tab, again || (R.buttons.find((b) => /^(이어서 복습|복습 마치기)$/.test(b)) || "복습 마치기"), "section[aria-labelledby='review-results']");
      await H.sleep(500);
      continue;
    }
    if (s.step === "again" || (s.step === "items" && s.mode === "practice")) {
      const x = ITEMS.get(s.item);
      if (!x) { row({ viewport, screen, what: `모르는 문항 ${s.item}`, expect: "pg01-1~3 문항", saw: "", verdict: "FAIL" }); break; }
      const again = s.step === "again";
      const before = s;
      const rec = { key: s.item, kind: x.kind, mode: s.mode, progress: s.progress };
      if (again && isSentence(x)) {
        const box = await tab.eval(`(document.querySelector(${JSON.stringify(SENT_BOX)}) || {}).value ?? null`);
        rec.opened = box === wrongTextFor(x) && /틀린 자리를 표시했어요/.test(s.card || "") && /다시 확인/.test(s.card || "") && /도움 받기/.test(s.card || "");
        rec.box = box;
        rec.cardRoman = romanAll(s.card || "").map((h) => h.text);
        rec.cardHasHangul = hangulForm(x) ? /서울|대한|홍길동/.test(s.card || "") : null;
        if (againLog.length === 0) await layout(tab, "다시 풀기(틀린 자리)");
        texts.push(s.text);
        if (HELP && !helpDone) {
          helpDone = true;
          const c = await press(tab, "도움 받기", "[data-review-item]");
          const t = await waitCard(tab, /낱말의 첫 글자/, 3000);
          rec.help = { clicked: c.ok, clue: /단서/.test(t), rule: /문법 설명:/.test(t), firstLetters: (t.match(/낱말의 첫 글자 ([^가-힣]*?)(?= 내 답도|$| [가-힣])/) || [])[1] || null, roman: romanAll(t).map((h) => h.text) };
          texts.push(t);
          await layout(tab, "다시 풀기(도움 받기 뒤)");
        }
        const a = await answerCard(tab, x, true, { again: true });
        const t = await waitCard(tab, /맞았어요|틀린 자리를 표시했어요|낱말이나 순서가 달라요/, 4000);
        rec.answer = a.given; rec.right = /맞았어요/.test(t); rec.comeback = /이 문장은 내일 다시 나와요\./.test(t);
        rec.shownAnswerHangul = hangulForm(x) ? /서울|대한|홍길동/.test(t) && !/Seoul|Daehan/.test(t) : null;
        texts.push(t);
        if (SPEAK && rec.right) { rec.sound = await speak(tab, x); speakDone++; }
        await press(tab, "다음 문장", "[data-review-item]");
      } else if (again) {
        const it = x.item;
        if (it.kind === "choice") {
          const wrongPick = (it.answer + 1) % it.options.length;
          const struck = await tab.eval(`Boolean((document.querySelector('[data-review-item] [aria-label="보기"] button[data-option="${wrongPick}"]') || {}).disabled)`);
          rec.opened = /한 번 더 해 보세요\./.test(s.card || "") && struck;
        } else rec.opened = /한 번 더 해 보세요\./.test(s.card || "");
        await answerCard(tab, x, true, { again: true });
        const t = await waitCard(tab, /맞았어요|정답을 확인하세요|한 번 더/, 3000);
        rec.right = /맞았어요/.test(t);
        texts.push(t);
        await press(tab, "다음", "[data-review-item]");
      } else {
        // practice (an item already past its next-day check): the result at once
        const a = await answerCard(tab, x, !WRONG.has(s.item));
        const t = await waitCard(tab, /맞았어요|틀린 자리를 표시했어요|한 번 더 해 보세요|정답을 확인하세요/, 4000);
        rec.answer = a.given; rec.right = /맞았어요/.test(t);
        if (SPEAK && rec.right && isSentence(x) && speakDone < 2) { rec.sound = await speak(tab, x); speakDone++; }
        texts.push(t);
        await press(tab, isSentence(x) ? "다음 문장" : "다음", "[data-review-item]");
        practiceLog.push(rec);
      }
      if (again) againLog.push(rec);
      log.push({ where: s.step, ...rec });
      await waitMove(tab, before);
      continue;
    }
    if (s.step === "done") {
      await H.waitFor(tab, `!/기록을 저장하고 있어요/.test((document.querySelector('section[aria-labelledby="review-done"]') || {}).innerText || '')`, 15000);
      await H.sleep(600);
      doneInfo = await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="review-done"]'); if (!sec) return null; const T = (e) => (e ? e.innerText : '').replace(/\\s+/g, ' ').trim();
        return { head: T(sec.querySelector('h2')), dl: [...sec.querySelectorAll('dt')].map((dt) => T(dt) + ' ' + T(dt.nextElementSibling)), notes: sec.querySelector('a[href]') ? { text: T(sec.querySelector('a[href]')), href: sec.querySelector('a[href]').getAttribute('href') } : null, focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null }; })()`).catch((e) => ({ error: e.message }));
      texts.push((await state(tab)).text);
      await layout(tab, "끝");
      break;
    }
    if (s.step === "error") { row({ viewport, screen, what: "오류 화면", expect: "없음", saw: s.text.slice(0, 200), verdict: "FAIL" }); break; }
    await H.sleep(300);
  }
  if (againLog.length) {
    row({ viewport, screen, what: `'틀린 문항 다시 풀기' ${againLog.length}문항 — 영작은 시험 답이 칸에 든 채 '틀린 자리를 표시했어요'(사다리 ①)로 열림 · 보기는 '한 번 더' · 고른 보기 꺼짐 → 고쳐서 맞힘`, expect: "모두 그렇게 열림 · 모두 맞았어요 · 영작은 '이 문장은 내일 다시 나와요.'",
      saw: JSON.stringify(againLog.map((r) => ({ key: r.key, opened: r.opened, right: r.right, comeback: r.comeback, cardRoman: r.cardRoman, cardHasHangul: r.cardHasHangul, shownAnswerHangul: r.shownAnswerHangul }))),
      verdict: againLog.every((r) => r.opened && r.right && (!isSentence(ITEMS.get(r.key)) || r.comeback) && !(r.cardRoman || []).length && r.cardHasHangul !== false && r.shownAnswerHangul !== false) ? "PASS" : "FAIL" });
    const h = againLog.find((r) => r.help);
    if (HELP) row({ viewport, screen, what: "다시 풀기 영작에서 '도움 받기' 한 번", expect: "단서 · 문법 설명 줄 · 낱말의 첫 글자", saw: JSON.stringify(h ? { key: h.key, ...h.help } : null), verdict: h && h.help.clicked && h.help.clue && h.help.rule && h.help.firstLetters && !h.help.roman.length ? "PASS" : "FAIL" });
    H.logDataChange({ course: COURSE, id: "review:again", action: `rc1002-s3d: PASS-OFF 오늘 복습 '틀린 문항 다시 풀기'(${viewport}) — ${againLog.map((r) => r.key).join(" · ")}${HELP ? " · 도움 받기 1번" : ""} — 같은 날 두 번째 답(retry, 일정 안 바뀜)이 학습 기록 log 에 남음`, by: BY, detail: againLog.map((r) => `${r.key} ${r.right ? "맞음" : "틀림"}`).join(" · ") });
  }
  if (practiceLog.length) {
    row({ viewport, screen, what: `복습(다음 날 확인이 아닌 문항) ${practiceLog.length}문항 — 문항마다 바로 결과`, expect: "맞았어요", saw: JSON.stringify(practiceLog.map((r) => ({ key: r.key, right: r.right }))), verdict: practiceLog.every((r) => r.right === !WRONG.has(r.key)) ? "PASS" : "FAIL" });
    H.logDataChange({ course: COURSE, id: "review:practice", action: `rc1002-s3d: PASS-OFF 오늘 복습(다음 날 확인 아닌 문항)에 답함(${viewport}) — ${practiceLog.length}문항`, by: BY, detail: practiceLog.map((r) => r.key).join(" · ") });
  }
  const sounds = log.filter((r) => r.sound).map((r) => ({ key: r.key, ...r.sound }));
  if (SPEAK) row({ viewport, screen, what: `소리 단추('문장 듣기') ${sounds.length}번 — 맞힌 영작 카드`, expect: "강의와 같은 녹음 파일(clipOf) · 재생됨 · 오류 0 · 기계 음성(TTS) 0", saw: JSON.stringify(sounds.map((x) => ({ key: x.key, src: x.src, sameClip: x.sameClip, played: x.played, errors: x.errors, tts: x.tts }))), verdict: sounds.length && sounds.every((x) => x.clicked && x.sameClip && x.played && !x.errors && !x.tts) ? "PASS" : "FAIL" });
  const net = ((await tab.eval("window.__s3bNet || []").catch(() => [])) || []).map((x) => `${x.method} ${x.path} ${x.status}`);
  const posts = net.filter((x) => /^POST \/api\/learning/.test(x));
  // 고침(첫 데스크톱 실행 뒤): 쪽을 열 때 앱이 스스로 부르는 POST /api/license/verify(LicenseProvider.tsx:199) · POST /api/progress/student
  // (ProgressProvider.tsx:348 — 저장소의 완료 목록을 '옛 기록'으로 한 번 보냄, 이미 완료면 건너뜀 studentProgress.ts:413)는 대본이 부른 것이 아님 —
  // 판정에서 빼고 보이게만 적음. PASS-OFF 진도 쓰기(POST /api/progress/passoff-grammar) · /api/admin 은 0 이어야.
  row({ viewport, screen, what: "학습 기록 저장 요청(앱이 보낸 것)", expect: "POST /api/learning/passoff-grammar 모두 200 · POST /api/progress/passoff-grammar · /api/admin 0 (쪽 열 때 앱의 license/verify · progress/student 옛 기록 보내기는 적기만)", saw: `${posts.length}번: ${[...new Set(posts)].join(" · ")} · 그 밖 ${[...new Set(net.filter((x) => !/^POST \/api\/learning/.test(x)))].join(" · ") || "0"}`, verdict: posts.length && posts.every((x) => / 200$/.test(x)) && !net.some((x) => /^POST \/api\/(progress\/passoff-grammar|admin)/.test(x)) && !net.some((x) => / (4|5)\d\d$| -1$/.test(x)) ? "PASS" : "FAIL" });
  if (doneInfo) {
    const totalAnswered = log.filter((l) => l.where === "test" || l.where === "items").length;
    row({ viewport, screen, what: "끝 화면", expect: "'오늘 복습을 마쳤어요' · 오늘 푼 문항 · 통과한 문장 · 내일 올 문항 · (틀린 문항 있으면) '오답노트 보기 N문항'", saw: JSON.stringify({ ...doneInfo, answeredOnThisPage: log.filter((l) => l.where === "test").length + practiceLog.length }), verdict: doneInfo.head === "오늘 복습을 마쳤어요" && doneInfo.dl.some((d) => /^오늘 푼 문항 \d+개$/.test(d)) && doneInfo.dl.some((d) => /^통과한 문장 \d+개$/.test(d)) && doneInfo.dl.some((d) => /^내일 올 문항 \d+개$/.test(d)) ? "PASS" : "FAIL" });
    // back to the list
    await press(tab, "과정 목록으로", "main");
    await H.waitFor(tab, `location.pathname === '/passoff-grammar' && !!document.querySelector('[data-passoff-review-entry]')`, 15000);
    await H.sleep(1500);
    const after = await tab.eval(ENTRY).catch((e) => ({ error: e.message }));
    row({ viewport, screen: "목록(복습 끝난 뒤)", what: "'과정 목록으로' → 오늘 복습 입구 · 오답노트 입구", expect: "남은 오늘 문항이 있으면 '오늘 복습 · 약 N분', 없으면 '오늘 복습 없음' · 틀린 문항이 있으면 '오답노트 · N문항'", saw: JSON.stringify(after), verdict: "INFO" });
    await layout(tab, "목록(끝난 뒤)");
    texts.push((await state(tab)).text);
  } else row({ viewport, screen, what: "끝 화면", expect: "닿음", saw: "닿지 못함", verdict: "FAIL" });
  layoutRow(viewport, screen);
  common(screen, viewport, tab, [...texts, ...layouts.map((l) => l.text)]);
  fs.appendFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), answerLog: log.map((l) => ({ ...l, given: l.given && /^option|^tokens|zzz|Wrong answer/.test(l.given) ? l.given : l.hangulTyped ? l.given : "(정답 문장)" })) }) + "\n");
}

// ── the wrong-answer list ──
async function notesMode(tab, viewport) {
  const screen = `오답노트(${viewport})`;
  await H.setViewport(tab, viewport);
  await tab.eval("window.__s3bNet && (window.__s3bNet.length = 0)").catch(() => {});
  await H.load(tab, "/passoff-grammar", { marker: null });
  await H.waitFor(tab, `!!document.querySelector('[data-passoff-review-entry]')`, 15000);
  await H.sleep(1500);
  await tab.eval("sessionStorage.setItem('kig:audit:keep', '1')");
  const texts = [];
  const ent = await tab.eval(ENTRY).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "목록 /passoff-grammar", what: "오답노트 입구", expect: "'오답노트 · N문항' → /passoff-grammar/review?notes=1", saw: JSON.stringify(ent), verdict: ent.notes && /오답노트 · \d+문항/.test(ent.notes.text) && ent.notes.href === "/passoff-grammar/review?notes=1" ? "PASS" : "FAIL" });
  const recBefore = (await tab.eval(RECORD).catch(() => [])).find((r) => r.which === "licence") || null;
  await H.click(tab, `document.querySelector('[data-passoff-notes-entry]')`, { settle: 300 });
  await H.waitFor(tab, `!!document.querySelector('[data-notes-step="list"], [data-notes-step="error"]')`, 20000);
  await H.sleep(800);
  let s = await state(tab);
  const lessonsRows = await tab.eval(`[...document.querySelectorAll('[data-notes-lesson]')].map((li) => ({ id: li.dataset.notesLesson, text: li.querySelector('button').innerText.replace(/\\s+/g, ' ').trim() }))`).catch(() => []);
  const wantByLesson = {};
  for (const k of (recBefore && recBefore.wrongKeys) || []) { const x = ITEMS.get(k); if (x) wantByLesson[x.lessonId] = (wantByLesson[x.lessonId] || 0) + 1; }
  row({ viewport, screen, what: "목록: h1 · 안내 · 강의별 줄('N문항')", expect: `기기 기록의 틀린 문항과 같은 강의 · 수 ${JSON.stringify(wantByLesson)}`, saw: JSON.stringify({ path: s.path, step: s.step, h1: await tab.eval("(document.querySelector('h1') || {}).innerText || null"), intro: (s.text.match(/틀린 적 있는 문항 \d+개를[^.]*\./) || [])[0] || null, lessons: lessonsRows }),
    verdict: s.step === "list" && lessonsRows.length === Object.keys(wantByLesson).length && lessonsRows.every((l) => l.text.includes(TITLES[l.id]) && l.text.includes(`${wantByLesson[l.id]}문항`)) ? "PASS" : "FAIL" });
  await layout(tab, "오답노트 목록");
  texts.push(s.text);
  const target = NOTES_LESSON || (lessonsRows[0] && lessonsRows[0].id);
  // open the lesson (its items' words come from the server now)
  await H.click(tab, `document.querySelector('[data-notes-lesson="${target}"] button')`, { settle: 300 });
  await H.waitFor(tab, `document.querySelectorAll('[data-notes-lesson="${target}"] [data-notes-item]').length > 0 || /불러오지 못했어요/.test(document.querySelector('main').innerText)`, 15000);
  await H.sleep(500);
  const items = await tab.eval(`[...document.querySelectorAll('[data-notes-lesson="${target}"] [data-notes-item]')].map((li) => ({ key: li.dataset.notesItem, mine: ((li.innerText.match(/내 답: ([^\\n]*)/) || [])[1] || null), count: ((li.innerText.match(/틀림 \\d+번|도움 받아 맞힘/) || [])[0] || null), last: /지난번엔 맞힘/.test(li.innerText), waits: !!li.querySelector('[data-notes-waits]'), notFound: /문항을 찾지 못했어요/.test(li.innerText) }))`).catch(() => []);
  const runBtn = await tab.eval(`!!(${BTN("지금 다시 풀기", `[data-notes-lesson="${target}"]`, true)})`).catch(() => false);
  const wantKeys = ((recBefore && recBefore.wrongKeys) || []).filter((k) => ITEMS.get(k) && ITEMS.get(k).lessonId === target).sort();
  row({ viewport, screen, what: `강의 '${TITLES[target]}' 펼침 — 문항마다 문제 · 내 답 · '틀림 N번' · '지금 다시 풀기'`, expect: `틀린 문항 ${wantKeys.join(" · ")} · 문항 찾음 · 단추 있음`, saw: JSON.stringify({ items: items.map((i) => `${i.key}: 내 답 ${i.mine} · ${i.count}${i.last ? " · 지난번엔 맞힘" : ""}${i.waits ? " · 복습할 차례" : ""}${i.notFound ? " · 못 찾음" : ""}`), runBtn }),
    verdict: items.length === wantKeys.length && items.every((i) => wantKeys.includes(i.key) && !i.notFound && /틀림 \d+번/.test(i.count || "") && i.mine) && runBtn ? "PASS" : "FAIL" });
  const mineHangul = items.filter((i) => i.mine && /[가-힣]/.test(i.mine));
  if (items.some((i) => hangulForm(ITEMS.get(i.key) || {}))) row({ viewport, screen, what: "오답노트의 '내 답'(한글로 쓴 틀린 답)", expect: "쓴 그대로 한글", saw: JSON.stringify(mineHangul.map((i) => `${i.key}: ${i.mine}`)), verdict: mineHangul.length && mineHangul.every((i) => !/Seoul|Daehan/.test(i.mine)) ? "PASS" : "FAIL" });
  await layout(tab, "오답노트 강의 펼침");
  texts.push((await state(tab)).text);
  // run it
  await press(tab, "지금 다시 풀기", `[data-notes-lesson="${target}"]`, true);
  await H.waitFor(tab, `!!document.querySelector('[data-review-mode="notes"]')`, 8000);
  const runLog = [];
  let speakDone = 0;
  for (let guard = 0; guard < 40; guard++) {
    s = await state(tab);
    if (s.step !== "run" || s.mode !== "notes") break;
    const x = ITEMS.get(s.item);
    if (!x) break;
    const before = s;
    const rec = { key: s.item, kind: x.kind, progress: s.progress, practiceNote: /연습이라 여기서 맞히거나 틀려도 복습 일정은 그대로예요/.test(s.text) };
    if (runLog.length === 0) await layout(tab, "다시 풀기 카드");
    const missFirst = MISS_FIRST && runLog.length === 0;
    if (missFirst) {
      await answerCard(tab, x, false);
      const t = await waitCard(tab, /틀린 자리를 표시했어요|한 번 더 해 보세요/, 4000);
      rec.missed = { ladder: /틀린 자리를 표시했어요|한 번 더 해 보세요/.test(t), noComebackLine: !/이 문장은 내일 다시 나와요/.test(t), report: /내 답도 맞아요/.test(t) };
      texts.push(t);
    }
    const a = await answerCard(tab, x, true, { again: missFirst && isSentence(x) });
    const t = await waitCard(tab, /맞았어요/, 4000);
    rec.answer = a.given; rec.right = /맞았어요/.test(t); rec.noComebackLine = !/이 문장은 내일 다시 나와요/.test(t);
    texts.push(t);
    if (SPEAK && rec.right && isSentence(x) && speakDone < 1) { rec.sound = await speak(tab, x); speakDone++; }
    await press(tab, isSentence(x) ? "다음 문장" : "다음", "[data-review-item]");
    runLog.push(rec);
    await waitMove(tab, before);
  }
  s = await state(tab);
  const ranText = s.text;
  const firstRight = runLog.filter((r) => !r.missed).length;
  row({ viewport, screen, what: `'지금 다시 풀기' ${runLog.length}문항${MISS_FIRST ? "(첫 문항은 일부러 한 번 틀린 뒤 맞힘)" : ""}`, expect: `강의 카드 그대로 · '연습이라 … 그대로예요' · 맞았어요 · '내일 다시 나와요' 줄 없음 · 끝 '${TITLES[target]} ${runLog.length}문항 중 ${firstRight}개를 처음에 맞혔어요.'`,
    saw: JSON.stringify({ run: runLog.map((r) => ({ key: r.key, right: r.right, missed: r.missed, noComebackLine: r.noComebackLine, practiceNote: r.practiceNote })), end: (ranText.match(/다시 풀기를 마쳤어요.*?그대로예요/) || [ranText.slice(0, 200)])[0] }),
    verdict: runLog.length === wantKeys.length && runLog.every((r) => r.right && r.noComebackLine) && runLog[0].practiceNote && s.step === "ran" && ranText.includes(`${TITLES[target]} ${runLog.length}문항 중 ${firstRight}개를 처음에 맞혔어요.`) && ranText.includes("연습이라 복습 일정은 그대로예요") && (!MISS_FIRST || (runLog[0].missed && runLog[0].missed.ladder && runLog[0].missed.noComebackLine)) ? "PASS" : "FAIL" });
  const snd = runLog.find((r) => r.sound);
  if (SPEAK) row({ viewport, screen, what: "다시 풀기 카드의 소리 단추('문장 듣기')", expect: "강의와 같은 녹음 · 재생 · 오류 0", saw: JSON.stringify(snd ? { key: snd.key, ...snd.sound } : null), verdict: snd && snd.sound.sameClip && snd.sound.played && !snd.sound.errors && !snd.sound.tts ? "PASS" : snd ? "FAIL" : "NA" });
  await layout(tab, "다시 풀기 끝");
  texts.push(ranText);
  H.logDataChange({ course: COURSE, id: `notes:${target}`, action: `rc1002-s3d: PASS-OFF 오답노트 '지금 다시 풀기'(${viewport}) — ${TITLES[target]} ${runLog.length}문항${MISS_FIRST ? " · 첫 문항 일부러 한 번 틀림" : ""} — 연습 답(effect practice)이 학습 기록 log 에 남음 · 일정 · 틀린 횟수는 그대로(설계)`, by: BY, detail: runLog.map((r) => r.key).join(" · ") });
  // back to the list: does a right answer take the item out?
  await press(tab, "오답노트로", "main");
  await H.waitFor(tab, `!!document.querySelector('[data-notes-step="list"]')`, 5000);
  await H.sleep(400);
  const back = await tab.eval(`[...document.querySelectorAll('[data-notes-lesson]')].map((li) => ({ id: li.dataset.notesLesson, text: li.querySelector('button').innerText.replace(/\\s+/g, ' ').trim() }))`).catch(() => []);
  await H.sleep(1500);
  const recAfter = (await tab.eval(RECORD).catch(() => [])).find((r) => r.which === "licence") || null;
  const same = wantKeys.filter((k) => recBefore && recAfter && recBefore.per[k] === recAfter.per[k]);
  const newLog = recAfter && recBefore ? Object.entries(recAfter.logBy).map(([k, v]) => [k, v - (recBefore.logBy[k] || 0)]).filter(([, v]) => v) : null;
  row({ viewport, screen, what: "맞힌 뒤 '오답노트로' — 문항이 빠지는가 · 기기 기록", expect: "설계: 빠지지 않음(practice.ts applyPractice 는 문항 상태를 안 바꿈 · engine.ts wrongList 는 lapses>0 이면 남김) · 일정 · 틀린 횟수 그대로 · log 에 practice 더해짐",
    saw: JSON.stringify({ lessons: back, unchangedItems: `${same.length}/${wantKeys.length}`, logDelta: newLog, per: Object.fromEntries(wantKeys.map((k) => [k, recAfter && recAfter.per[k]])) }),
    verdict: back.some((l) => l.id === target && l.text.includes(`${wantKeys.length}문항`)) && same.length === wantKeys.length ? "PASS" : "FAIL" });
  // a fresh page (storage cleared — the server's copy)
  await tab.eval("sessionStorage.removeItem('kig:audit:keep')");
  await H.load(tab, "/passoff-grammar/review?notes=1", { marker: null });
  await H.waitFor(tab, `!!document.querySelector('[data-notes-step="list"], [data-notes-step="error"]')`, 20000);
  await H.sleep(800);
  const fresh = await tab.eval(`[...document.querySelectorAll('[data-notes-lesson]')].map((li) => ({ id: li.dataset.notesLesson, text: li.querySelector('button').innerText.replace(/\\s+/g, ' ').trim() }))`).catch(() => []);
  const recFresh = (await tab.eval(RECORD).catch(() => [])).find((r) => r.which === "licence") || null;
  row({ viewport, screen: `오답노트 새로 열기(저장소 비운 새 쪽 · ${viewport})`, what: "서버 판 — 다시 풀기 뒤에도 같은 목록 · 연습 답이 서버에 올라갔는지", expect: "같은 강의 · 같은 수 · 서버 기록 log 에 practice", saw: JSON.stringify({ lessons: fresh, logBy: recFresh && recFresh.logBy }), verdict: fresh.some((l) => l.id === target && l.text.includes(`${wantKeys.length}문항`)) && recFresh && (recFresh.logBy["review:practice"] || 0) >= runLog.length ? "PASS" : "FAIL" });
  texts.push((await state(tab)).text);
  const net = ((await tab.eval("window.__s3bNet || []").catch(() => [])) || []).map((x) => `${x.method} ${x.path} ${x.status}`);
  row({ viewport, screen, what: "요청", expect: "POST /api/learning/passoff-grammar 200 · POST /api/progress/passoff-grammar · /api/admin 0 (쪽 열 때 앱의 license/verify · progress/student 는 적기만)", saw: [...new Set(net)].join(" · "), verdict: net.some((x) => /^POST \/api\/learning\/passoff-grammar 200/.test(x)) && !net.some((x) => / (4|5)\d\d$| -1$/.test(x)) && !net.some((x) => /^POST \/api\/(progress\/passoff-grammar|admin)/.test(x)) ? "PASS" : "FAIL" });
  layoutRow(viewport, screen);
  common(screen, viewport, tab, [...texts, ...layouts.map((l) => l.text)]);
}

async function stateMode(tab, viewport, label) {
  await H.setViewport(tab, viewport);
  await H.load(tab, "/passoff-grammar", { marker: null });
  await H.waitFor(tab, `!!document.querySelector('[data-passoff-review-entry]') || /이용권/.test((document.querySelector('main') || {}).innerText || '')`, 15000);
  await H.sleep(2500);
  const ent = await tab.eval(ENTRY).catch((e) => ({ error: e.message }));
  const prog = await progressGet(tab);
  const rec = await tab.eval(RECORD).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "목록 /passoff-grammar", what: `${label}: 오늘 복습 · 오답노트 입구`, expect: "—", saw: JSON.stringify(ent), verdict: "INFO" });
  row({ viewport, screen: "GET /api/progress/passoff-grammar", what: `${label}: 완료 강의(읽기만)`, expect: "pg01-1~3 그대로(강의 더 완료 0)", saw: JSON.stringify(prog), verdict: prog && prog.completed && prog.completed.length === 3 ? "PASS" : "FAIL" });
  row({ viewport, screen: "기기 학습 기록(서버에서 받은 사본 · 저장소 비운 새 쪽)", what: `${label}: 요약(읽기만)`, expect: "—", saw: JSON.stringify(rec), verdict: "INFO" });
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  common("목록", viewport, tab, [snap ? snap.text : ""]);
}

(async () => {
  const mem = await freeMemOk();
  const browser = await H.startBrowser(CLONE, PORT);
  let tab;
  try {
    tab = await H.openTab(browser, { clean: true });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: NET_HOOK });
    console.log(`port ${PORT} · free ${mem} GB · ${new Date().toISOString()}`);
    if (MODE === "state") { for (const vp of VIEWPORTS) await stateMode(tab, vp, LABEL || "상태"); }
    else if (MODE === "review") await reviewMode(tab, VIEWPORT);
    else if (MODE === "notes") await notesMode(tab, VIEWPORT);
    else { console.error("mode?"); process.exit(2); }
  } finally {
    if (tab) await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const t = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  console.log("끝:", JSON.stringify(t));
})();
