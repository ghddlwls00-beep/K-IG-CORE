#!/usr/bin/env node
/**
 * 회귀 점검 1002 · 단계 0 보충 (2026-10-04) — LISTENING 새 문제(content/questions/ld/*.json · 276강 756문항)를 운영에서 강의마다 실제로 푸는 검사.
 * 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
 *
 * 앱이 하는 대로: 서버가 content.ts getLessonQuestions(course "ld", id, ld_english_scripts 줄 수)로 강의에 붙이고
 * src/components/LdLearningView.tsx 1단계(블라인드 리스닝) 플레이어 아래 '들은 내용 확인'(src/components/LessonQuestions.tsx)이 그린다.
 * 채점은 picked === q.answer, 이 기기 기록은 localStorage `kig-questions:ld/<본 id>`(src/lib/lessonQuestions.ts questionsStorageKey).
 * 기대값은 같은 함수(getLessonQuestions)로 읽은 파일 — 모양 검사로 빠진 문항이 있으면 그것도 '파일 문항 수' 와 견줘 적는다.
 *
 * 강의마다(이용권 프로필 사본 — lib/harness.cjs startBrowser, 이름 rc1002-ld-questions-<조각>):
 *   H  이용권 없이 받은 HTML(쿠키 없는 fetch): 유료 강의는 잠금 표시 · 문제 글(물음 · 보기) 0 / 무료(d001 · d002)는 문제 글 있음.
 *      유료 강의의 문제 글이 이용권 없이 보이면 '멈춤' — 그 줄만 찍고 exit 3.
 *   S  1단계 자리: [data-step-panel="1"] 안 · 플레이어([data-ld-passage]) 아래 · 처음에 '0 / N' · 판정 0
 *   T  글: 물음 N개가 파일과 같은 차례 · 같은 글('k. 물음') · 보기 4개가 파일과 같은 순서 · 같은 글(①~④ 표시 빼고)
 *   W  문항마다 일부러 틀린 보기 하나(정답 다음 자리부터 돌아가며) → data-verdict wrong · '정답은 ②번이에요.' · 보기 4개 잠김 ·
 *      정답 보기에 맞음 표시(text-success) · 고른 보기에 틀림 표시(text-danger) · 근거 버튼 줄 = 파일 근거(대본에 있는 줄만)
 *      → 다 풀면 'N문제 중 0개 맞힘' · '다시 풀기'
 *   A  '다시 풀기' → 판정 0 · '0 / N'
 *   R  문항마다 정답 보기 → right · '맞았어요.' · 잠김 · 정답 보기 맞음 표시 · 틀림 표시 0 → 'N문제 중 N개 맞힘' · 이 기기 기록 picks = 정답
 *
 *   node docs/qa-2026-09-18/scripts/check-ld-questions-1004.cjs [--ids d001,d050] [--shard 1/4] [--from d001 --to d069]
 *        [--break answer|text] [--port 9870] [--clone rc1002-ld-questions] [--viewport mobile|desktop|small] [--fresh] [--limit N]
 *   --break answer: 정답 차례에 틀린 보기를 누르고 '맞음' 을 기대 → FAIL 이 나야 맞음(exit 1)
 *   --break text  : 기대 물음 글 하나(강의마다 1번 물음)를 바꿈 → '없음' FAIL 이 나야 맞음(exit 1)
 *   --break keep  : 앞 방문의 답(모든 문항 ①)을 쪽 스크립트보다 먼저 써 두고 지우지 않음 → 처음부터 답이 붙어 'S start' FAIL 이 나야 맞음
 *   --dirty       : 같은 앞 방문의 답을 써 두고 그 뒤에 지움 → PASS 여야 맞음(지우기가 실제로 듣는지 — keep 의 되돌림)
 *   (같은 사본을 다시 써도 앞 실행의 기록은 남지 않았다 — 브라우저를 끌 때 localStorage 가 디스크에 안 써짐. 그래서 기록을 직접 써 둔다)
 *   결과: docs/qa-2026-09-18/out/ld-questions-1004/<조각>-<화면>.jsonl(강의 한 줄 — 이어 돌리기 됨, --fresh 면 그 화면 것만 새로) · <조각>-<화면>-summary.json
 *         (2026-10-05 T10 전 기록은 <조각>.jsonl — 그때 기본 화면 mobile) · --dry-run: 쓸 파일 이름만 찍고 끝(브라우저 0)
 *
 * 지킨 것: 이용권 코드 · PIN 타이핑 0. /api/license/ · /api/admin/ 를 이 도구가 부르지 않음(쪽이 열릴 때 앱이 스스로 부르는 것은 주소만
 * 세어 적음 — 본문 · 쿠키 · localStorage 의 이용권 값은 읽지도 찍지도 않음). 원본 프로필은 열지 않음(사본만). 브라우저는 하나,
 * 띄우기 전 남은 메모리 1GB 아래면 1분씩 기다림. 문제 고르기는 이 사본의 localStorage 에만 쌓임(LISTENING 강의 쪽은 학습 기록을
 * 서버로 보내지 않음 — src/lib/learning/sync.ts 를 부르는 곳은 PASS-OFF · 오답노트뿐; 그래도 요청 주소를 세어 확인).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const H = require("./lib/harness.cjs");
process.chdir(H.REPO); // content.ts 는 process.cwd() 의 content/ 를 읽는다

const argv = process.argv.slice(2);
const argOf = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BREAK = argOf("--break", "");
if (BREAK && !["answer", "text", "keep"].includes(BREAK)) {
  console.error(`--break ${BREAK}: answer · text · keep 만`);
  process.exit(2);
}
const PORT = Number(argOf("--port", 9870));
const VIEW = argOf("--viewport", "mobile");
const SHARD = argOf("--shard", "1/1");
const [shardK, shardN] = SHARD.split("/").map(Number);
const CLONE = argOf("--clone", `rc1002-ld-questions-${shardK}of${shardN}`);
const LIMIT = Number(argOf("--limit", 0));

const content = H.loadTs(path.join(H.REPO, "src/lib/content.ts"));
const { isFreePreviewLesson } = (() => { try { return H.loadTs(path.join(H.REPO, "src/lib/license.ts")); } catch { return {}; } })();
const MARKS = ["①", "②", "③", "④"];
const J = JSON.stringify;
const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 강의 목록: 문제 파일이 있는 본 강의(content/questions/ld/<id>.json) ──
const QDIR = path.join(H.REPO, "content/questions/ld");
let ids = fs.readdirSync(QDIR).filter((f) => /^d\d{3}\.json$/.test(f)).map((f) => f.slice(0, -5)).sort();
const ALL = ids.length;
if (argOf("--ids", "")) { const want = argOf("--ids", "").split(",").map((s) => s.trim()).filter(Boolean); ids = want; }
if (argOf("--from", "")) ids = ids.filter((id) => id >= argOf("--from", ""));
if (argOf("--to", "")) ids = ids.filter((id) => id <= argOf("--to", ""));
if (shardN > 1) ids = ids.filter((_, i) => i % shardN === shardK - 1);
if (LIMIT) ids = ids.slice(0, LIMIT);

const OUT = path.join(H.OUT, "ld-questions-1004");
fs.mkdirSync(OUT, { recursive: true });
// 회귀 점검 1002 T10 (2026-10-05): the screen is part of the name — '<조각>-<화면>.jsonl'. It was '<조각>.jsonl' for every --viewport,
// so a desktop run resumed on the phone's lessons ('이미 함') and --fresh deleted the other screen's record (단계 1: copied away and
// put back by hand). Records written before this keep their old name (shardNofM.jsonl = mobile, the default then).
// --dry-run: print the file this call would write (and whether --fresh would empty it) and stop — no browser.
const tag = `${BREAK ? `break-${BREAK}-` : ""}${argOf("--ids", "") ? "ids-" + ids.slice(0, 6).join("_") + (ids.length > 6 ? `_${ids.length}` : "") : `shard${shardK}of${shardN}`}-${VIEW}`;
const FILE = path.join(OUT, `${tag}.jsonl`);
if (argv.includes("--dry-run")) {
  const others = fs.readdirSync(OUT).filter((f) => f.endsWith(".jsonl") && path.join(OUT, f) !== FILE).length;
  console.log(`--dry-run: 화면 ${VIEW} · 결과 ${path.relative(H.REPO, FILE)}${fs.existsSync(FILE) ? " (있음" + (argv.includes("--fresh") ? " — --fresh 면 이 파일만 비움)" : " — 이어 하기)") : " (새로)"} · 같은 폴더의 다른 파일 ${others}개는 건드리지 않음 · 강의 ${ids.length}`);
  process.exit(0);
}
if (argv.includes("--fresh") && fs.existsSync(FILE)) fs.unlinkSync(FILE);
const out = H.jsonl(FILE, (r) => r.id);

/** what the file says (the app's own reader) */
function expected(id) {
  const lines = content.getLdEnglishScript(id) || [];
  const qs = content.getLessonQuestions("ld", id, lines.length) || [];
  let raw = 0;
  try { raw = (JSON.parse(fs.readFileSync(path.join(QDIR, `${id}.json`), "utf8")).questions || []).length; } catch {}
  return { lines, qs, raw };
}

const PANEL = '[data-ld-view] [data-step-panel="1"]';
const QSEL = `${PANEL} [data-lesson-questions]`;
const state = (tab) => tab.eval(`(() => {
  const s = document.querySelector(${J(QSEL)});
  if (!s) return null;
  const p = document.querySelector(${J(`${PANEL} [data-ld-passage]`)});
  const r = s.getBoundingClientRect();
  return {
    visible: r.width > 0 && r.height > 0,
    belowPlayer: !!(p && (p.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)),
    step: document.querySelector('[data-ld-view]')?.getAttribute('data-step') || null,
    heading: (s.querySelector('h3')?.textContent || '').trim(),
    counter: (s.querySelector('h3')?.nextElementSibling?.textContent || '').trim(),
    answered: Number(s.getAttribute('data-answered')), right: Number(s.getAttribute('data-right')),
    again: !!s.querySelector('[data-action="questions-again"]'),
    items: [...s.querySelectorAll('[data-question]')].map((li) => ({
      id: li.getAttribute('data-question'),
      verdict: li.getAttribute('data-verdict'),
      prompt: (li.querySelector('p')?.textContent || '').replace(/\\s+/g, ' ').trim(),
      options: [...li.querySelectorAll('[data-option]')].map((b) => ({
        i: Number(b.getAttribute('data-option')),
        mark: (b.querySelector('span[aria-hidden]')?.textContent || '').trim(),
        text: ((b.querySelector('span.min-w-0') || b).textContent || '').replace(/\\s+/g, ' ').trim(),
        disabled: b.disabled,
        success: /\\btext-success\\b/.test(b.className),
        danger: /\\btext-danger\\b/.test(b.className),
        sr: (b.querySelector('.sr-only')?.textContent || '').trim(),
      })),
      result: (li.querySelector('[data-question-result] > p')?.textContent || '').trim(),
      lines: [...li.querySelectorAll('[data-action="play-evidence"]')].map((b) => Number(b.getAttribute('data-line'))),
    })),
  };
})()`).catch(() => null);

const picksOf = (tab, id) => tab.eval(`(() => { try { return (JSON.parse(localStorage.getItem(${J(`kig-questions:ld/${id}`)}) || 'null') || {}).picks || null; } catch (e) { return null; } })()`).catch(() => null);

// before any page script: this lesson's question record and its practice record start empty (src/lib/lessonQuestions.ts · ldLearning.ts)
const CLEAR_KEYS = `(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('kig-questions:ld/') || k.startsWith('kig:ld:mastery:')) localStorage.removeItem(k); } catch (e) {} })()`;
// --dirty · --break keep: an earlier visit's answers left on the device (every question of the lesson answered ①) — written before
// CLEAR_KEYS runs, so --dirty proves the clearing works and --break keep (no clearing) proves a left record would be caught (S start)
const DIRTY = `(() => { try { const m = location.pathname.match(/^\\/ld\\/(d\\d{3})$/); if (!m) return; const p = {}; for (let i = 1; i <= 4; i++) p[m[1] + '-q' + i] = 0; localStorage.setItem('kig-questions:ld/' + m[1], JSON.stringify({ v: 1, picks: p, first: p })); } catch (e) {} })()`;

async function freeMemoryGate() {
  // the order's own measure: Win32_OperatingSystem FreePhysicalMemory (KB) — os.freemem() counts standby memory as free
  const freeNow = () => {
    try {
      const kb = Number(require("child_process").execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim());
      if (kb > 0) return kb * 1024;
    } catch {}
    return os.freemem();
  };
  for (;;) {
    const free = freeNow();
    if (free >= 1024 * 1024 * 1024) return free;
    console.log(`  남은 메모리 ${(free / 1048576).toFixed(0)}MB < 1GB — 1분 기다림`);
    await sleep(60000);
  }
}

async function clickWait(tab, qid, oi, wantAnswered) {
  const sel = `${QSEL} [data-question="${qid}"] [data-option="${oi}"]`;
  const r = await H.click(tab, `document.querySelector(${J(sel)})`);
  const ok = await H.waitFor(tab, `document.querySelector(${J(`${QSEL} [data-question="${qid}"]`)})?.hasAttribute('data-verdict') && Number(document.querySelector(${J(QSEL)})?.getAttribute('data-answered')) === ${wantAnswered}`, 3000, 60);
  return { ok: r.ok && ok, reason: r.ok ? (ok ? "" : "판정 안 붙음") : r.reason };
}

async function lesson(tab, id) {
  const t0 = Date.now();
  const E = expected(id);
  const rec = { id, at: new Date().toISOString(), viewport: VIEW, fileQuestions: E.raw, questions: E.qs.length, checks: [], fails: 0 };
  const ck = (key, ok, want, got) => { rec.checks.push({ key, ok: !!ok, want, got }); if (!ok) rec.fails++; };
  const free = typeof isFreePreviewLesson === "function" ? isFreePreviewLesson("ld", id) : ["d001", "d002"].includes(id);
  rec.free = free;
  ck("file", E.qs.length > 0 && E.qs.length === E.raw, `파일 문항 ${E.raw} 모두 모양 검사 통과`, `${E.qs.length}`);

  // H — logged-out HTML
  try {
    const res = await fetch(`${H.BASE}/ld/${id}`, { redirect: "manual", headers: { "cache-control": "no-cache" } });
    const html = await res.text();
    const needles = E.qs.flatMap((x) => [x.prompt, ...x.options]).filter((t) => t.length >= 4);
    const found = needles.filter((t) => html.includes(t) || html.includes(J(t).slice(1, -1)));
    rec.anon = { status: res.status, paywall: H.PAYWALL_RE.test(html), found: found.length, needles: needles.length };
    if (free) ck("H anon free", res.status === 200 && found.length > 0, "무료: 문제 글 있음", `HTTP ${res.status} · 문제 글 ${found.length}/${needles.length}`);
    else {
      ck("H anon locked", H.PAYWALL_RE.test(html) && found.length === 0, "유료: 잠금 표시 · 문제 글 0", `HTTP ${res.status} · 잠금 ${H.PAYWALL_RE.test(html)} · 문제 글 ${found.length}/${needles.length}`);
      if (found.length > 0) rec.STOP = `유료 강의 /ld/${id} 의 문제 글 ${found.length}개가 이용권 없이 받은 HTML 에 있음 (예: ${found[0].slice(0, 40)})`;
    }
  } catch (e) {
    ck("H anon", false, "HTML 받음", `예외 ${e.message}`);
  }
  if (rec.STOP) return rec;

  // open the lesson with the licence copy
  const ld = await H.load(tab, `/ld/${id}`, { marker: H.MARKERS.ld });
  const ready = ld.rendered && (await H.waitFor(tab, `Boolean(document.querySelector(${J(QSEL)}))`, 15000));
  const s0 = await state(tab);
  const page = await tab.eval(`(() => { const t = (document.querySelector('main')?.innerText || ''); return { paywall: ${H.PAYWALL_RE}.test(t), href: location.href }; })()`).catch(() => ({}));
  ck("open", ready && !page.paywall, "이용권으로 열림 · 문제 있음", `rendered ${ld.rendered} · 잠금 ${page.paywall} · 문제 ${!!s0}`);
  if (!s0) { rec.sec = (Date.now() - t0) / 1000; return rec; }

  // S — place and start
  ck("S place", s0.visible && s0.belowPlayer && s0.step === "1" && s0.heading === "들은 내용 확인", "1단계 · 플레이어 아래 · '들은 내용 확인'", `step ${s0.step} · 아래 ${s0.belowPlayer} · 보임 ${s0.visible} · '${s0.heading}'`);
  ck("S start", s0.counter === `0 / ${E.qs.length}` && s0.items.every((x) => !x.verdict), `0 / ${E.qs.length} · 판정 0`, `'${s0.counter}' · 판정 ${s0.items.filter((x) => x.verdict).length}`);

  // T — the text: prompts and options in the file's order
  const wantPrompts = E.qs.map((x, i) => norm(`${i + 1}. ${BREAK === "text" && i === 0 ? x.prompt + " (깨기)" : x.prompt}`));
  ck("T count", s0.items.length === E.qs.length && J(s0.items.map((x) => x.id)) === J(E.qs.map((x) => x.id)), `${E.qs.length}문항 ${E.qs.map((x) => x.id).join(",")}`, `${s0.items.length} ${s0.items.map((x) => x.id).join(",")}`);
  rec.text = { want: 0, same: 0, missing: [] };
  E.qs.forEach((q, i) => {
    const it = s0.items[i];
    rec.text.want++;
    const okP = !!it && it.prompt === wantPrompts[i];
    const okO = !!it && it.options.length === 4 && it.options.every((o, k) => o.i === k && o.mark === MARKS[k] && o.text === norm(q.options[k]));
    if (okP && okO) rec.text.same++;
    else rec.text.missing.push({ q: q.id, prompt: okP ? null : { want: wantPrompts[i], got: it ? it.prompt : null }, options: okO ? null : { want: q.options, got: it ? it.options.map((o) => `${o.mark}${o.text}`) : null } });
    ck(`T q${i + 1}`, okP && okO, `${wantPrompts[i].slice(0, 60)} | ${q.options.join(" / ").slice(0, 80)}`, it ? `${okP ? "물음 같음" : "물음 다름: " + it.prompt.slice(0, 60)} · ${okO ? "보기 같음" : "보기 다름: " + it.options.map((o) => o.mark + o.text).join(" / ").slice(0, 80)}` : "없음");
  });

  // W — a wrong option for every question (the position after the answer, turning with the question number)
  rec.wrong = { want: E.qs.length, shown: 0 };
  for (let i = 0; i < E.qs.length; i++) {
    const q = E.qs[i];
    const w = (q.answer + 1 + (i % 3)) % 4;
    const c = await clickWait(tab, q.id, w, i + 1);
    if (!c.ok) ck(`W q${i + 1} click`, false, `보기 ${w} 누름`, c.reason);
  }
  const sW = await state(tab);
  E.qs.forEach((q, i) => {
    const w = (q.answer + 1 + (i % 3)) % 4;
    const it = sW && sW.items.find((x) => x.id === q.id);
    const want = E.lines.length ? q.evidence.filter((n) => E.lines[n - 1] && E.lines[n - 1].en) : q.evidence;
    const ok = !!it && it.verdict === "wrong" && it.result === `정답은 ${MARKS[q.answer]}번이에요.` && it.options.every((o) => o.disabled)
      && it.options[q.answer].success && it.options[w].danger && it.options.filter((o) => o.success).length === 1 && it.options.filter((o) => o.danger).length === 1
      && it.options[q.answer].sr === "정답" && it.options[w].sr === "고른 답";
    if (ok) rec.wrong.shown++;
    ck(`W q${i + 1}`, ok, `wrong · '정답은 ${MARKS[q.answer]}번이에요.' · 잠김 4 · 정답 ${MARKS[q.answer]} 맞음 표시 · 고른 ${MARKS[w]} 틀림 표시`,
      it ? `${it.verdict} · '${it.result}' · 잠김 ${it.options.filter((o) => o.disabled).length} · 맞음 표시 ${it.options.filter((o) => o.success).map((o) => MARKS[o.i]).join("")} · 틀림 표시 ${it.options.filter((o) => o.danger).map((o) => MARKS[o.i]).join("")}` : "없음");
    ck(`E q${i + 1}`, !!it && J(it.lines) === J(want), `근거 줄 ${J(want)}`, it ? J(it.lines) : "없음");
  });
  ck("W count", !!sW && sW.counter === `${E.qs.length}문제 중 0개 맞힘` && sW.again && sW.right === 0, `${E.qs.length}문제 중 0개 맞힘 · 다시 풀기`, sW ? `'${sW.counter}' · 다시 풀기 ${sW.again}` : "없음");

  // A — '다시 풀기'
  await H.click(tab, `document.querySelector(${J(`${QSEL} [data-action="questions-again"]`)})`);
  await H.waitFor(tab, `Number(document.querySelector(${J(QSEL)})?.getAttribute('data-answered')) === 0`, 3000, 60);
  const sA = await state(tab);
  ck("A again", !!sA && sA.counter === `0 / ${E.qs.length}` && sA.items.every((x) => !x.verdict && x.options.every((o) => !o.disabled)), `0 / ${E.qs.length} · 판정 0 · 다시 누를 수 있음`, sA ? `'${sA.counter}' · 판정 ${sA.items.filter((x) => x.verdict).length}` : "없음");

  // R — the right option for every question (--break answer: a wrong one, expecting 'right')
  rec.right = { want: E.qs.length, shown: 0 };
  for (let i = 0; i < E.qs.length; i++) {
    const q = E.qs[i];
    const pick = BREAK === "answer" ? (q.answer + 1) % 4 : q.answer;
    const c = await clickWait(tab, q.id, pick, i + 1);
    if (!c.ok) ck(`R q${i + 1} click`, false, `보기 ${pick} 누름`, c.reason);
  }
  const sR = await state(tab);
  E.qs.forEach((q, i) => {
    const it = sR && sR.items.find((x) => x.id === q.id);
    const ok = !!it && it.verdict === "right" && it.result === "맞았어요." && it.options.every((o) => o.disabled) && it.options[q.answer].success
      && it.options.filter((o) => o.success).length === 1 && it.options.every((o) => !o.danger) && it.options[q.answer].sr === "정답";
    if (ok) rec.right.shown++;
    ck(`R q${i + 1}`, ok, `right · '맞았어요.' · 잠김 4 · ${MARKS[q.answer]} 맞음 표시 · 틀림 표시 0${BREAK === "answer" ? " (깨기 answer: 틀린 보기를 눌렀음 — FAIL 이 맞음)" : ""}`,
      it ? `${it.verdict} · '${it.result}' · 잠김 ${it.options.filter((o) => o.disabled).length} · 맞음 표시 ${it.options.filter((o) => o.success).map((o) => MARKS[o.i]).join("")} · 틀림 표시 ${it.options.filter((o) => o.danger).map((o) => MARKS[o.i]).join("")}` : "없음");
  });
  ck("R count", !!sR && sR.counter === `${E.qs.length}문제 중 ${E.qs.length}개 맞힘` && sR.right === E.qs.length, `${E.qs.length}문제 중 ${E.qs.length}개 맞힘`, sR ? `'${sR.counter}'` : "없음");
  const picks = await picksOf(tab, id);
  ck("R saved", !!picks && E.qs.every((q) => picks[q.id] === q.answer), `kig-questions:ld/${id} picks = 정답`, J(picks));

  // the API paths the page itself asked for (paths only — never a body)
  const ev = H.events(tab);
  const reqs = [...(tab.visitEvents.requests || []), ...(tab.events.requests || [])];
  const api = {};
  for (const u of reqs) { try { const p = new URL(u).pathname; if (p.startsWith("/api/")) api[p] = (api[p] || 0) + 1; } catch {} }
  rec.api = api;
  rec.bad = ev.badResponses.map((r) => `${r.status} ${(() => { try { return new URL(r.url).pathname; } catch { return r.url; } })()}`);
  rec.exceptions = ev.exceptions.length;
  rec.sec = Math.round((Date.now() - t0) / 100) / 10;
  return rec;
}

(async () => {
  console.log(`LISTENING 새 문제 검사 1004 · ${H.BASE} · 문제 파일 ${ALL}강 · 이번 ${ids.length}강 (${SHARD}) · 화면 ${VIEW} · 포트 ${PORT}${BREAK ? ` · --break ${BREAK} (FAIL 이 나야 맞음)` : ""}`);
  const todo = ids.filter((id) => !out.done.has(id));
  if (todo.length < ids.length) console.log(`  이어 돌리기: ${ids.length - todo.length}강 이미 있음 (${path.relative(H.REPO, FILE)})`);
  let browser = null, tab = null;
  let stop = null;
  const startTab = async () => {
    await freeMemoryGate();
    browser = await H.startBrowser(CLONE, PORT);
    tab = await H.openTab(browser);
    if (BREAK === "keep" || argv.includes("--dirty")) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: DIRTY });
    if (BREAK !== "keep") await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: CLEAR_KEYS });
    await H.setViewport(tab, VIEW);
  };
  try {
    if (todo.length) await startTab();
    for (const id of todo) {
      let rec;
      try {
        rec = await lesson(tab, id);
      } catch (e) {
        rec = { id, visitError: String(e && e.message || e).slice(0, 200), fails: 1, checks: [] };
        // a dead tab: start again once
        try { await tab.close(); } catch {}
        try { browser.proc.kill(); } catch {}
        await sleep(1500);
        await startTab();
      }
      out.write(rec);
      const fl = rec.checks.filter((c) => !c.ok);
      console.log(`${rec.fails ? "FAIL" : "PASS"}  ${id} — 문항 ${rec.questions ?? "?"} · 글 같음 ${rec.text ? `${rec.text.same}/${rec.text.want}` : "?"} · 틀림 표시 ${rec.wrong ? `${rec.wrong.shown}/${rec.wrong.want}` : "?"} · 맞음 ${rec.right ? `${rec.right.shown}/${rec.right.want}` : "?"} · ${rec.sec ?? "?"}초${rec.visitError ? ` · 예외 ${rec.visitError}` : ""}${fl.length ? ` · 틀린 칸 ${fl.slice(0, 3).map((c) => `${c.key}: ${String(c.got).slice(0, 90)}`).join(" | ")}` : ""}`);
      if (rec.STOP) { stop = rec.STOP; break; }
    }
  } finally {
    if (tab) await tab.close().catch(() => {});
    if (browser) browser.proc.kill();
  }

  // summary over this run's file (resumed runs included)
  const recs = new Map();
  for (const line of fs.readFileSync(FILE, "utf8").split("\n")) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (ids.includes(r.id)) recs.set(r.id, r); } catch {} }
  const all = [...recs.values()];
  const sum = (f) => all.reduce((a, r) => a + (f(r) || 0), 0);
  const S = {
    at: new Date().toISOString(), base: H.BASE, break: BREAK || null, shard: SHARD, viewport: VIEW, lessons: all.length, planned: ids.length,
    questions: sum((r) => r.questions), right: `${sum((r) => r.right && r.right.shown)}/${sum((r) => r.right && r.right.want)}`,
    wrongShown: `${sum((r) => r.wrong && r.wrong.shown)}/${sum((r) => r.wrong && r.wrong.want)}`, textSame: `${sum((r) => r.text && r.text.same)}/${sum((r) => r.text && r.text.want)}`,
    anonLocked: `${all.filter((r) => !r.free && r.anon && r.anon.paywall && r.anon.found === 0).length}/${all.filter((r) => !r.free).length}`,
    failedLessons: all.filter((r) => r.fails).map((r) => r.id), visitErrors: all.filter((r) => r.visitError).map((r) => r.id),
    secPerLesson: Math.round((sum((r) => r.sec) / Math.max(1, all.filter((r) => r.sec).length)) * 10) / 10,
    api: all.reduce((a, r) => { for (const [k, v] of Object.entries(r.api || {})) a[k] = (a[k] || 0) + v; return a; }, {}),
    bad: [...new Set(all.flatMap((r) => r.bad || []))].slice(0, 20), exceptions: sum((r) => r.exceptions),
    stop,
  };
  fs.writeFileSync(FILE.replace(/\.jsonl$/, "-summary.json"), J(S, null, 2));
  if (stop) { console.log(`\n멈춤: ${stop}`); process.exit(3); }
  console.log(`\n강의 ${S.lessons}/${S.planned} · 문항 ${S.questions} · 맞음 ${S.right} · 틀림 표시 ${S.wrongShown} · 글 같음 ${S.textSame} · 이용권 없이 잠김 ${S.anonLocked} · 강의당 ${S.secPerLesson}초`);
  console.log(`FAIL 강의 ${S.failedLessons.length}${S.failedLessons.length ? `: ${S.failedLessons.slice(0, 20).join(", ")}` : ""} · 앱이 부른 API ${J(S.api)} · 4xx/5xx ${S.bad.length} · 예외 ${S.exceptions}`);
  if (BREAK) console.log(`(--break ${BREAK}: FAIL 이 나야 맞음 — exit 1 이면 검사가 깨짐을 잡음)`);
  const missing = ids.length - S.lessons;
  process.exit(S.failedLessons.length || missing ? 1 : 0);
})();
