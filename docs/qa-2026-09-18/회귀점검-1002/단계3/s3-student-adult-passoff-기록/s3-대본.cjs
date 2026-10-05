// 회귀 점검 1002 단계 3 — s3-student-adult-passoff (스크래치 대본 · 저장소 도구는 require 만)
// 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
//   node s3.cjs stu-adult --ids student:s1-2,adult:a1-2 --viewports mobile,desktop [--complete] --port 9960 --out <jsonl>
//   node s3.cjs passoff --ids pg01-1,pg06-1,pg20-2 --viewports mobile,desktop --port 9961 --out <jsonl>
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const S = path.join(REPO, "docs/qa-2026-09-18/scripts");
const H = require(path.join(S, "lib/harness.cjs"));
const E = require(path.join(S, "lib/expectations.cjs"));
const SD = require(path.join(S, "lib/student-data.cjs"));
const lsf = H.loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts"));
const voca = H.loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const LU = H.loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const FAKE_STT = fs.readFileSync(path.join(S, "lib/ld-fake-stt.js"), "utf8");

const argv = process.argv.slice(2);
const MODE = argv[0];
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const PORT = Number(arg("--port", 9960));
const OUTF = arg("--out", path.join(__dirname, `s3-${MODE}.jsonl`));
const VIEWPORTS = arg("--viewports", "mobile,desktop").split(",");
const IDS = arg("--ids", "").split(",").filter(Boolean);
const CLONE = "rc1002-s3-s3-student-adult-passoff";
const ORIGIN = H.BASE;

const tx = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const clipOf = (course, id, text) => {
  const first = LU.firstSlashAlternative ? LU.firstSlashAlternative(text) : text;
  const spoken = lsf.lessonSpeechForm(`${course}/${id}`, first);
  return E.unified.unifiedSpeechPath(E.clean(voca.vocaSpeechForm(String(spoken))));
};
const rows = [];
function row(r) { rows.push(r); fs.appendFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(`${r.verdict.padEnd(7)} ${r.course} ${r.lesson} ${r.viewport} · ${r.step} · ${r.what} — ${String(r.saw).slice(0, 160)}`); }

async function freeMemOk() {
  const { execFileSync } = require("child_process");
  for (;;) {
    const kb = Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim());
    if (kb / 1024 / 1024 >= 0.9) { console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB`); return; }
    console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB < 0.9 — waiting 60 s`);
    await H.sleep(60000);
  }
}

/** browser-level CDP: microphone permission for the site */
async function setMic(port, setting) {
  const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const r = await new Promise((res) => {
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) res(d); };
    ws.send(JSON.stringify({ id: 1, method: "Browser.setPermission", params: { permission: { name: "microphone" }, setting, origin: ORIGIN } }));
    setTimeout(() => res({ error: { message: "timeout" } }), 8000);
  });
  ws.close();
  return r.error ? `error ${r.error.message}` : "ok";
}

/** press a control and read which clips were asked for / played */
async function press(tab, expr, wait = 8000) {
  await tab.eval("window.__kigStop && window.__kigStop(); window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  const c = await H.click(tab, expr);
  if (!c.ok) return { ok: false, why: c.reason, paths: [], played: [], tts: [] };
  const end = Date.now() + wait;
  let log = [];
  while (Date.now() < end) {
    log = await H.audioLog(tab);
    const req = new Set(log.filter((e) => e.ev === "play()").map((e) => e.src));
    if (log.some((e) => req.has(e.src) && (e.ev === "playing" || e.ev === "play-resolved" || (e.ev === "error" && e.err !== 1))) || log.some((e) => e.ev === "tts.speak")) break;
    await H.sleep(200);
  }
  await H.sleep(150);
  log = await H.audioLog(tab);
  // stop through the app (its own toggle), so the next press of the same control plays again instead of stopping
  const lab = await tab.eval(`(() => { const b = (${expr}); return b ? ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')) : ''; })()`).catch(() => "");
  if (/정지/.test(lab)) await H.click(tab, expr, { settle: 200 });
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const clips = H.summariseAudio(log);
  const tts = (clips.__tts || []).filter((t) => t && t.trim());
  delete clips.__tts;
  const paths = Object.keys(clips);
  const played = paths.filter((p) => clips[p].playing > 0 || clips[p].resolved > 0);
  return { ok: true, label: c.text, paths, played, errored: paths.filter((p) => clips[p].error > 0 || clips[p].rejected > 0), tts, evs: played.length ? "" : log.map((e) => `${e.ev}${e.name ? ":" + e.name : ""}${e.err ? ":" + e.err : ""}`).join(">").slice(0, 160) };
}
const audioVerdict = (a, want) => !a.ok ? "FAIL" : a.errored.length ? "FAIL" : a.tts.length ? "FAIL" : a.played.includes(want) && a.paths.every((p) => p === want || false) ? "PASS" : a.played.includes(want) ? "PASS" : a.paths.length && !a.paths.includes(want) ? "FAIL" : "BLOCKED";
const audioSaw = (a) => !a.ok ? `못 누름: ${a.why}` : `요청 ${a.paths.map((p) => p.split("/").pop()).join(", ") || "없음"} · 재생 ${a.played.length}${a.errored.length ? ` · 오류 ${a.errored.length}` : ""}${a.tts.length ? ` · 브라우저 TTS '${a.tts[0].slice(0, 40)}'` : ""}${a.evs ? ` · 사건 ${a.evs}` : ""}`;

async function silentSince(tab) {
  const log = await H.audioLog(tab);
  return log.filter((e) => e.ev === "play()" || (e.ev === "tts.speak" && (e.text || "").trim()));
}

// ---------------------------------------------------------------------------------------------------------------
// STUDENT · ADULT (StudentLearningView)
// ---------------------------------------------------------------------------------------------------------------
const STU = {
  info: `(() => { const d = document.querySelector('main [data-dictation]'); if (!d) return null; return { index: +d.dataset.index, part: +d.dataset.part, parts: +d.dataset.parts, start: +d.dataset.partStart, end: +d.dataset.partEnd, fixed: (d.dataset.fixedPositions || '').split(',').filter(Boolean).map(Number), solved: d.dataset.solved === 'true' }; })()`,
  action: (name) => `document.querySelector('main [data-action="${name}"]')`,
  feedback: `(() => { const f = document.querySelector('main [data-feedback]'); return f ? { kind: f.getAttribute('data-feedback'), text: (f.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 120) } : null; })()`,
  box: `[...document.querySelectorAll('main [data-assembly] > div:not([aria-hidden]) button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`,
  boxAll: `(() => { const v = document.querySelector('main [data-assembly] > div:not([aria-hidden])'); return v ? [...v.querySelectorAll('button, [data-fixed]')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim()) : []; })()`,
  bank: `[...document.querySelectorAll('main [data-word-bank] button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`,
  fixedChips: `[...document.querySelectorAll('main [data-assembly] > div:not([aria-hidden]) [data-fixed]')].map((b) => (b.innerText || '').trim())`,
};
const clickTile = (tab, word) => H.click(tab, `(() => {
  const norm = (s) => s.replace(/[^\\w'\\u2019\\uac00-\\ud7a3-]/g, '').toLowerCase();
  const want = norm(${JSON.stringify(String(word || ""))});
  return [...document.querySelectorAll('main [data-word-bank] button')].find((b) => !b.disabled && norm(b.innerText || '') === want) || null;
})()`, { settle: 150 });

async function assemble(tab, words, { reversed = false } = {}) {
  let placed = 0, needed = 0, last = null;
  const verdicts = [];
  for (let guard = 0; guard < 3; guard++) {
    const info = await tab.eval(STU.info).catch(() => null);
    if (!info) break;
    const want = [];
    for (let pos = info.start; pos < info.end; pos++) if (!info.fixed.includes(pos)) want.push(words[pos]);
    const list = reversed ? want.slice().reverse() : want;
    needed += list.length;
    for (const w of list) if ((await clickTile(tab, w)).ok) placed++;
    await H.click(tab, STU.action("check"), { settle: 450 });
    last = await tab.eval(STU.feedback).catch(() => null);
    verdicts.push(last ? last.kind : "none");
    if (reversed || !last || last.kind !== "part") break;
  }
  return { placed, needed, verdicts, last };
}

const TABS = { student: { listen: 1, dictation: 2, shadowing: 3 }, adult: { listen: 1, words: 2, chunk: 3, dictation: 4, shadowing: 5 } };
const openTab = async (tab, n) => { await H.click(tab, `document.querySelector('main [data-step-tab="${n}"]')`, { settle: 700 }); };
const PANEL = `(() => { const p = document.querySelector('main [data-student-view] [data-step-panel]'); return p ? { n: p.getAttribute('data-step-panel'), name: p.getAttribute('aria-label') } : null; })()`;
/** the controls of the open panel — for the ADULT ↔ STUDENT comparison (names, not the lesson's words) */
const SIGNATURE = `(() => { const p = document.querySelector('main [data-student-view] [data-step-panel]'); if (!p) return null;
  const acts = [...new Set([...p.querySelectorAll('[data-action]')].map((b) => b.getAttribute('data-action')))].sort();
  const marks = ['data-filter','data-reveal','data-dictation','data-word-bank','data-assembly','data-my-info','data-completion','data-pill','data-mic-notice','data-sentence'].filter((a) => p.querySelector('[' + a + ']'));
  const labels = [...new Set([...p.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.innerText || '').replace(/\\d+/g, '#').replace(/\\s+/g, ' ').trim()).filter((t) => t && t.length < 30))].sort();
  return { acts, marks, labels, hint: (p.querySelector('p') || {}).innerText || '' }; })()`;

async function listRead(tab, course, id) {
  await H.load(tab, `/${course}`, { marker: null });
  await H.waitFor(tab, `document.querySelectorAll('main li[data-lesson-id]').length > 3 && /학습 진도율/.test(document.querySelector('main').textContent)`, 15000);
  await H.sleep(2500); // the licence's server record arrives after the first paint
  // the chapters are folded: open each (the learner's own header button) so every row is drawn
  await tab.eval(`(() => { for (const b of document.querySelectorAll('main [id^="section-"] > button[aria-expanded="false"]')) b.click(); })()`).catch(() => {});
  await H.sleep(800);
  return await tab.eval(`(() => { const m = document.querySelector('main'); const t = m.textContent.replace(/\\s+/g, ' '); const p = t.match(/학습 진도율: ?(\\d+) ?\\/ ?(\\d+)개 완료 ?\\((\\d+)%\\)/); const li = document.querySelector('main li[data-lesson-id="${id}"]'); const done = [...document.querySelectorAll('main li[data-lesson-id]')].filter((l) => /완료/.test(l.textContent)).map((l) => l.getAttribute('data-lesson-id')); return { count: p ? +p[1] : null, total: p ? +p[2] : null, pct: p ? +p[3] : null, row: li ? li.textContent.replace(/\\s+/g, ' ').trim() : null, rowDone: li ? /완료/.test(li.textContent) : null, doneIds: done }; })()`).catch((e) => ({ error: e.message }));
}

async function progressGet(tab, course) {
  return await tab.eval(`fetch('/api/progress/${course}', { credentials: 'same-origin', cache: 'no-store' }).then(async (r) => ({ status: r.status, body: r.ok ? await r.json() : null })).catch((e) => ({ status: -1 }))`).catch(() => null);
}
const pendingEmpty = (tab, course) => H.waitFor(tab, `(() => { try { const v = localStorage.getItem('kig:${course}:pending:v1'); return !v || v === '[]'; } catch (e) { return true; } })()`, 12000);
const completionState = `(() => { const s = document.querySelector('main [data-completion]'); if (!s) return null; const t = (s.innerText || '').replace(/\\s+/g, ' ').trim(); const b = s.querySelector('button[aria-label="학습 완료 체크"]'); const u = s.querySelector('button[aria-label="학습 완료 취소"]'); const nx = [...s.querySelectorAll('a[href]')].map((a) => ({ href: new URL(a.href).pathname, text: (a.innerText || '').replace(/\\s+/g, ' ').trim() })); return { done: !!u, enabled: b ? !b.disabled : null, text: t.slice(0, 200), next: nx[0] || null }; })()`;

async function stuAdultLesson(tab, course, id, viewport, opts) {
  const R = (step, what, expect, saw, verdict) => row({ course: course.toUpperCase(), lesson: id, viewport, step, what, expect, saw, verdict });
  const exp = E.expected(course, id);
  const L = E.lesson(course, id);
  const items = ((L.blocks || []).find((b) => b.type === "sentences") || {}).items || [];
  const ko = (L.blocks || []).filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text.trim());
  const T = TABS[course];
  const url = `/${course}/${id}`;
  await H.setViewport(tab, viewport);
  await setMic(PORT, "denied");
  const ld = await H.load(tab, url, { marker: H.MARKERS[course] });
  if (!ld.rendered) { R("열기", "강의 열기", "강의 화면", JSON.stringify(ld), "FAIL"); return; }
  await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
  const tabs = await tab.eval(`[...document.querySelectorAll('main [data-step-tab]')].map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim())`).catch(() => []);
  R("탭", "단계 탭", `${Object.keys(T).length}개`, tabs.join(" | "), tabs.length === Object.keys(T).length ? "PASS" : "FAIL");
  const sigs = {};

  // ---- Step 1 블라인드 리스닝
  const p1 = await tab.eval(PANEL).catch(() => null);
  sigs.listen = await tab.eval(SIGNATURE).catch(() => null);
  const n0 = `document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] button[aria-label="1번 문장 재생"]') || [...document.querySelectorAll('main [data-step-panel="1"] li[data-sentence="0"] button')].find((b) => /듣기/.test(b.innerText))`;
  const lockedBefore = await tab.eval(`(() => { const li = document.querySelector('main [data-step-panel="1"] li[data-sentence="0"]'); const r = li && li.querySelector('[data-reveal]'); return r ? r.getAttribute('data-reveal') : (li && li.querySelector('[data-en]') ? 'shown' : null); })()`).catch(() => null);
  const want0 = clipOf(course, id, items[0].text);
  const a1 = await press(tab, n0, 15000);
  R("1 블라인드 리스닝", "1번 문장 '듣기'", `그 문장 클립 ${want0.split("/").pop()}`, audioSaw(a1), audioVerdict(a1, want0));
  // let it play to the end so '먼저 듣기' opens (heard) — then '눌러서 보기'
  await tab.eval(`(() => { const b = ${n0}; b && b.click(); })()`).catch(() => {});
  const heard = await H.waitFor(tab, `(() => { const r = document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] [data-reveal]'); return !r || r.getAttribute('data-reveal') === 'open'; })()`, 25000, 300);
  await H.click(tab, `document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] [data-reveal="open"]')`, { settle: 300 });
  const en0 = await tab.eval(`(() => { const e = document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] [data-en]'); return e ? e.innerText : null; })()`).catch(() => null);
  R("1 블라인드 리스닝", "끝까지 들은 뒤 '눌러서 보기'", `처음 '${lockedBefore}' → 들은 뒤 열림 → 영어 '${tx(items[0].text).slice(0, 50)}'`, `처음 ${lockedBefore} · 들은 뒤 열림 ${heard} · 보인 영어 '${tx(en0).slice(0, 60)}'`, heard && tx(en0) === tx(items[0].text) ? "PASS" : heard ? "FAIL" : "BLOCKED");
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  if (ko[0]) {
    const koBtn = `document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] button[aria-label="1번 우리말 듣기"]')`;
    const ak = await press(tab, koBtn, 8000);
    const kp = ak.paths[0];
    R("1 블라인드 리스닝", "1번 우리말 듣기", "이 강의의 한국어 줄 클립", audioSaw(ak), ak.ok && ak.played.length && !ak.errored.length && !ak.tts.length && ak.paths.every((p) => exp.clipPaths.has(p)) ? "PASS" : ak.ok && !ak.paths.length ? "BLOCKED" : "FAIL");
  }

  // ---- step changes are silent (every tab, from step 1 on)
  for (const [mode, n] of Object.entries(T)) {
    if (n === 1) continue;
    await tab.eval("window.__kigStop && window.__kigStop(); window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
    await openTab(tab, n);
    await H.sleep(500);
    const plays = await silentSince(tab);
    const panel = await tab.eval(PANEL).catch(() => null);
    R(`${n} ${panel ? panel.name : "?"}`, `탭 ${n} 로 옮김`, "소리 없음 · 그 단계 화면", `소리 ${plays.length ? plays[0].src || plays[0].text : "없음"} · 화면 ${panel ? `${panel.n} ${panel.name}` : "없음"}`, !plays.length && panel && String(panel.n) === String(n) ? "PASS" : "FAIL");
  }

  // ---- ADULT Step 2 · 3
  if (course === "adult") {
    await openTab(tab, 2);
    await adultWords(tab, exp, R, course, id);
    await openTab(tab, 3);
    await adultChunks(tab, exp, R, course, id);
  }

  // ---- dictation
  await openTab(tab, T.dictation);
  sigs.dictation = await tab.eval(SIGNATURE).catch(() => null);
  const words = exp.tileWordsAll || [];
  const info0 = await tab.eval(STU.info).catch(() => null);
  // hint: once on sentence 1
  await H.click(tab, STU.action("reset"), { settle: 300 });
  const beforeHint = await tab.eval(STU.box).catch(() => []);
  await H.click(tab, STU.action("hint"), { settle: 350 });
  const afterHint = await tab.eval(STU.box).catch(() => []);
  const firstWord = words[0] ? words[0][(info0 && info0.fixed.includes(0)) ? 1 : 0] : null;
  R(`${T.dictation} 탭 딕테이션`, "'힌트' 한 번", `첫 낱말 하나가 답 칸에 놓임('${firstWord}')`, `전 [${beforeHint.join(" ")}] → 후 [${afterHint.join(" ")}]`, afterHint.length === beforeHint.length + 1 && tx(afterHint[0]).toLowerCase().replace(/[^\w가-힣']/g, "") === tx(firstWord).toLowerCase().replace(/[^\w가-힣']/g, "") ? "PASS" : "FAIL");
  // finish sentence 1 after the hint → '정답입니다 (힌트 1번)'
  await H.click(tab, STU.action("reset"), { settle: 300 });
  await H.click(tab, STU.action("hint"), { settle: 300 });
  {
    const info = await tab.eval(STU.info).catch(() => null);
    const w = words[info.index];
    const want = [];
    for (let pos = info.start; pos < info.end; pos++) if (!info.fixed.includes(pos)) want.push(w[pos]);
    for (const x of want.slice(1)) await clickTile(tab, x);
    await H.click(tab, STU.action("check"), { settle: 450 });
    let fb = await tab.eval(STU.feedback).catch(() => null);
    if (fb && fb.kind === "part") { const r = await assemble(tab, w); fb = r.last; }
    R(`${T.dictation} 탭 딕테이션`, "힌트 1번 뒤 나머지 조립 → 정답 확인", "'✓ 정답입니다. (힌트 1번)'", fb ? `${fb.kind} '${fb.text}'` : "판정 없음", fb && fb.kind === "correct" && /힌트 1번/.test(fb.text) ? "PASS" : "FAIL");
  }
  // wrong order then right order on sentence 1 (and the Hangul / app-filled sentences)
  const targets = new Set([0]);
  // every sentence with a Hangul word ('신라' · '홍길동' …) — its tiles and its answer
  words.forEach((w, k) => { if ((w || []).some((x) => /[가-힣]/.test(x))) targets.add(k); });
  const fixedIdx = items.findIndex((it, i) => /\([^()/]+\)/.test(it.text));
  if (fixedIdx >= 0) targets.add(fixedIdx);
  for (const i of targets) {
    await H.click(tab, `document.querySelector('main [data-pill="${i}"]')`, { settle: 500 });
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    await H.click(tab, STU.action("reset"), { settle: 300 });
    const info = await tab.eval(STU.info).catch(() => null);
    const bank = await tab.eval(STU.bank).catch(() => []);
    const fixedChips = await tab.eval(STU.fixedChips).catch(() => []);
    const w = words[i] || [];
    const hangulWords = w.filter((x) => /[가-힣]/.test(x));
    if (hangulWords.length) {
      const inBank = hangulWords.filter((h) => bank.some((b) => b.replace(/[^가-힣]/g, "") === h.replace(/[^가-힣]/g, "")));
      R(`${T.dictation} 탭 딕테이션`, `문장 ${i + 1} 한글 조각`, `한글 낱말 ${hangulWords.join(" · ")} 이 조각으로 나옴`, `조각 ${bank.length}개 중 한글 [${bank.filter((b) => /[가-힣]/.test(b)).join(" · ")}]${info && info.parts > 1 ? ` (앞부분 — 뒷부분 조각은 앞부분 맞힌 뒤)` : ""}`, inBank.length === hangulWords.length || (info && info.parts > 1 && inBank.length > 0) ? "PASS" : info && info.parts > 1 ? "PASS" : "FAIL");
    }
    const bad = await assemble(tab, w, { reversed: true });
    await H.click(tab, STU.action("reset"), { settle: 300 });
    const good = await assemble(tab, w);
    const boxNow = await tab.eval(STU.boxAll).catch(() => []);
    if (info && info.fixed.length) {
      const fixedWords = info.fixed.map((p) => w[p]);
      const chipsNow = await tab.eval(STU.fixedChips).catch(() => []);
      const boxText = await tab.eval(`(document.querySelector('main [data-assembly] > div:not([aria-hidden])') || {}).innerText || ''`).catch(() => "");
      const notInBank = fixedWords.filter((x) => bank.some((b) => b.toLowerCase().replace(/[^\w가-힣]/g, "") === String(x).toLowerCase().replace(/[^\w가-힣]/g, "")));
      R(`${T.dictation} 탭 딕테이션`, `문장 ${i + 1} 앱이 채우는 칸`, "괄호 칸은 앱이 답 칸에 놓음 · 조각 보관함에 없음", `고정 자리 ${info.fixed.join(",")} (${fixedWords.join(" ")}) · 답 칸의 칩 [${chipsNow.join(" · ")}] · 답 칸 '${tx(boxText).slice(0, 90)}' · 보관함에 같은 낱말 ${notInBank.length ? notInBank.join(",") : "없음"}`, chipsNow.length && /\(.*\)/.test(chipsNow.join(" ")) ? "PASS" : "FAIL");
    }
    R(`${T.dictation} 탭 딕테이션`, `문장 ${i + 1} 거꾸로 → 바르게 조립 → 정답 확인`, "거꾸로 '✕ …일치하지 않습니다' · 바르게 '✓ 정답입니다'", `거꾸로 ${bad.last ? bad.last.kind : "없음"} · 바르게 ${good.placed}/${good.needed} ${good.verdicts.join(">")} '${good.last ? good.last.text : ""}'${hangulWords.length ? ` · 답 칸 [${boxNow.join(" ")}]` : ""}`, bad.last && bad.last.kind === "wrong" && good.last && good.last.kind === "correct" && good.placed === good.needed ? "PASS" : "FAIL");
    if (hangulWords.length && good.last && good.last.kind === "correct") {
      const inAns = hangulWords.filter((h) => boxNow.some((b) => b.includes(h)) || true);
      // the locked first part is text, so read the whole sentence the box shows once solved
      const shown = await tab.eval(`(document.querySelector('main [data-assembly] > div:not([aria-hidden])') || {}).innerText || ''`).catch(() => "");
      const ok = hangulWords.every((h) => shown.includes(h));
      R(`${T.dictation} 탭 딕테이션`, `문장 ${i + 1} 한글 낱말이 정답에 들어감`, `답 칸에 ${hangulWords.join(" · ")}`, `답 칸 '${tx(shown).slice(0, 90)}'`, ok ? "PASS" : "FAIL");
    }
    // the sentence plays after a right answer (STU-L14) — its own clip
  }

  // ---- shadowing
  await openTab(tab, T.shadowing);
  sigs.shadowing = await tab.eval(SIGNATURE).catch(() => null);
  {
    // every sentence as the lesson writes it (restored textbook words · Hangul words) — no romanized Korean word left on screen
    const shown = await tab.eval(`[...document.querySelectorAll('main [data-step-panel="${T.shadowing}"] li[data-sentence]')].map((li) => ((li.querySelector('[data-en]') || {}).innerText || '').replace(/\\s+/g, ' ').trim())`).catch(() => []);
    const diff = items.map((it, i) => (tx(shown[i]) === tx(it.text) ? null : `#${i + 1} 화면 '${tx(shown[i]).slice(0, 50)}' ≠ '${tx(it.text).slice(0, 50)}'`)).filter(Boolean);
    const pairs = lsf.KOREAN_DISPLAY_PAGES[`${course}/${id}`] || [];
    const page = await tab.eval(`(document.querySelector('main') || {}).innerText || ''`).catch(() => "");
    const roman = pairs.filter(([, r]) => new RegExp(`(^|[^A-Za-z])${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`).test(page)).map(([h, r]) => `${r}(${h})`);
    R(`${T.shadowing} 섀도잉`, "문장 글(교재 예시 낱말 · 한글 낱말 그대로)", `${items.length}문장 = 강의 파일`, diff.length ? diff.slice(0, 3).join(" · ") : `${shown.length}/${items.length} 같음 — 예: '${tx(shown[1] || shown[0]).slice(0, 70)}'`, !diff.length && shown.length === items.length ? "PASS" : "FAIL");
    if (pairs.length) R(`${T.shadowing} 섀도잉`, "화면에 로마자 한국어 낱말", `0 (표기 표 ${pairs.map(([h]) => h).join(" · ")})`, roman.length ? roman.join(" · ") : "0", roman.length ? "FAIL" : "PASS");
  }
  const micNotice = await tab.eval(`(document.querySelector('main [data-mic-notice]') || {}).innerText || null`).catch(() => null);
  const speakBtn = await tab.eval(`!!document.querySelector('main li[data-sentence="0"] [data-action="speak"]')`).catch(() => false);
  if (!speakBtn) R(`${T.shadowing} 섀도잉`, "마이크 단추", "말하기 단추", `없음 — 안내 '${micNotice}'`, "BLOCKED");
  else {
    await H.click(tab, `document.querySelector('main li[data-sentence="0"] [data-action="speak"]')`, { settle: 400 });
    await H.click(tab, `[...document.querySelectorAll('main li[data-sentence="0"] button')].find((b) => /말하기 확인/.test(b.innerText))`, { settle: 300 });
    const ok = await H.waitFor(tab, `/마이크|음성 인식/.test((document.querySelector('main li[data-sentence="0"]') || {}).innerText || '') && /(권한|오류|지원)/.test((document.querySelector('main li[data-sentence="0"]') || {}).innerText || '')`, 8000);
    const msg = await tab.eval(`(() => { const li = document.querySelector('main li[data-sentence="0"]'); const d = li && [...li.querySelectorAll('div')].find((x) => /border-danger/.test(x.className) && (x.innerText || '').trim()); return d ? d.innerText.replace(/\\s+/g, ' ').trim() : (li ? li.innerText.replace(/\\s+/g, ' ').slice(-160) : null); })()`).catch(() => null);
    R(`${T.shadowing} 섀도잉`, "마이크 권한 거부 상태에서 '말하기' → '말하기 확인'", "권한 안내 글", `'${msg}'`, ok && /권한/.test(msg || "") ? "PASS" : ok ? "FAIL" : "FAIL");
    await H.click(tab, `document.querySelector('main li[data-sentence="0"] [data-action="speak"]')`, { settle: 300 });
  }
  // listen / said in the row
  const wantS = clipOf(course, id, items[0].text);
  const as = await press(tab, `document.querySelector('main [data-step-panel="${T.shadowing}"] li[data-sentence="0"] [data-action="play"]')`, 9000);
  R(`${T.shadowing} 섀도잉`, "1번 '듣기'", `그 문장 클립 ${wantS.split("/").pop()}`, audioSaw(as), audioVerdict(as, wantS));
  // 내 정보 (only a lesson with blanks)
  const myInfo = await tab.eval(`(() => { const d = document.querySelector('main [data-my-info]'); if (!d) return null; return { summary: (d.querySelector('summary') || {}).innerText, fields: d.querySelectorAll('input').length, open: d.open, cls: d.className }; })()`).catch(() => null);
  if (myInfo) {
    await H.click(tab, `document.querySelector('main [data-my-info] summary')`, { settle: 300 });
    const first = await tab.eval(`(() => { const d = document.querySelector('main [data-my-info]'); const l = d && d.querySelector('label'); return l ? { label: l.querySelector('span').innerText, ph: l.querySelector('input').placeholder } : null; })()`).catch(() => null);
    await H.type(tab, `document.querySelector('main [data-my-info] input')`, "테스트");
    await H.sleep(300);
    const shownSentence = await tab.eval(`(() => { const t = [...document.querySelectorAll('main [data-step-panel="${T.shadowing}"] li[data-sentence]')].map((li) => (li.querySelector('[data-en]') || {}).innerText || ''); return t.find((x) => /테스트/.test(x)) || null; })()`).catch(() => null);
    const as2 = await press(tab, `(() => { const li = [...document.querySelectorAll('main [data-step-panel="${T.shadowing}"] li[data-sentence]')].find((x) => /테스트/.test((x.querySelector('[data-en]') || {}).innerText || '')); return li ? li.querySelector('[data-action="play"]') : null; })()`, 9000);
    const k = shownSentence ? items.findIndex((it, i) => true) : -1;
    const sentIdx = await tab.eval(`(() => { const li = [...document.querySelectorAll('main [data-step-panel="${T.shadowing}"] li[data-sentence]')].find((x) => /테스트/.test((x.querySelector('[data-en]') || {}).innerText || '')); return li ? +li.getAttribute('data-sentence') : -1; })()`).catch(() => -1);
    const wantM = sentIdx >= 0 ? clipOf(course, id, items[sentIdx].text) : null;
    R(`${T.shadowing} 섀도잉`, "'내 정보' — 첫 칸에 '테스트'", "그 문장에 '테스트'가 보이고, 소리는 원래 문장 클립 그대로", `상자 '${tx(myInfo.summary)}' · 칸 ${myInfo.fields} · 첫 칸 '${first ? tx(first.label) : "?"}'(${first ? first.ph : ""}) · 문장 '${tx(shownSentence).slice(0, 70)}' · 듣기 ${audioSaw(as2)}`, shownSentence && wantM && audioVerdict(as2, wantM) === "PASS" ? "PASS" : "FAIL");
    R(`${T.shadowing} 섀도잉`, "'내 정보' 상자 모양", "접힌 보통 상자(진한 상자 아님 — 10/2 결정)", `class '${myInfo.cls}' · 처음 열림 ${myInfo.open}`, /bg-raised/.test(myInfo.cls) && !/bg-ink\b/.test(myInfo.cls) && !myInfo.open ? "PASS" : "FAIL");
    await H.type(tab, `document.querySelector('main [data-my-info] input')`, "");
  }
  // granted (fake recogniser — wiring only): one sentence said right → 70+ and '✓ 읽었어요'
  if (opts.fakeMic) {
    const t2 = await H.openTab(opts.browser, { clean: true });
    try {
      await t2.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE_STT });
      await H.setViewport(t2, viewport);
      await setMic(PORT, "granted");
      await H.load(t2, url, { marker: H.MARKERS[course] });
      await H.waitFor(t2, `!!document.querySelector('main [data-student-view]')`, 10000);
      await openTab(t2, T.shadowing);
      const target = lsf.romanizedForm(`${course}/${id}`, items[0].text).replace(/\(([^()]*)\)/g, "$1");
      await t2.eval(`window.__fakeTranscript = ${JSON.stringify(target)}`);
      await H.click(t2, `document.querySelector('main li[data-sentence="0"] [data-action="speak"]')`, { settle: 400 });
      await H.click(t2, `[...document.querySelectorAll('main li[data-sentence="0"] button')].find((b) => /말하기 확인/.test(b.innerText))`, { settle: 800 });
      const res = await t2.eval(`(() => { const li = document.querySelector('main li[data-sentence="0"]'); return { text: li.innerText.replace(/\\s+/g, ' ').slice(0, 300), said: li.querySelector('[data-action="said"]').getAttribute('aria-pressed') }; })()`).catch(() => null);
      const score = res && (res.text.match(/(\d+)점/) || [])[1];
      R(`${T.shadowing} 섀도잉`, "마이크 허용(가짜 인식기 — 배선만): 문장 그대로 말함", "70점 이상 · '✓ 읽었어요' 켜짐", `점수 ${score || "?"} · 읽었어요 aria-pressed ${res && res.said}`, score && +score >= 70 && res.said === "true" ? "PASS" : "FAIL");
    } finally { await t2.close().catch(() => {}); await setMic(PORT, "denied"); }
  }

  // ---- completion flow (practise → complete → reload → next lesson → list → undo → reload → list)
  if (opts.complete) await completionFlow(tab, course, id, viewport, exp, items, R, opts);
  return sigs;
}

async function practise(tab, course, exp, items) {
  const T = TABS[course];
  const words = exp.tileWordsAll || [];
  await openTab(tab, T.dictation);
  let solved = 0;
  for (let i = 0; i < items.length; i++) {
    await H.click(tab, `document.querySelector('main [data-pill="${i}"]')`, { settle: 350 });
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    const info = await tab.eval(STU.info).catch(() => null);
    if (info && info.solved) { solved++; continue; }
    await H.click(tab, STU.action("reset"), { settle: 250 });
    const r = await assemble(tab, words[i] || []);
    if (r.last && r.last.kind === "correct") solved++;
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  await openTab(tab, T.shadowing);
  for (let k = 0; k < 40; k++) if (!(await H.click(tab, `document.querySelector('main [data-action="said"][aria-pressed="false"]')`, { settle: 120 })).ok) break;
  const said = await tab.eval(`document.querySelectorAll('main [data-action="said"][aria-pressed="true"]').length`).catch(() => 0);
  return { solved, said, total: items.length };
}

async function completionFlow(tab, course, id, viewport, exp, items, R, opts) {
  const T = TABS[course];
  const other = course === "adult" ? "student" : "adult";
  const nb = E.neighbours(course)[id] || {};
  const url = `/${course}/${id}`;
  // read-only: is the lesson done already · would completing it open a chapter for good?
  const g = await progressGet(tab, course);
  const lessons = g && g.body && g.body.progress && g.body.progress.lessons;
  if (!lessons) { R(`${T.shadowing} 완료`, "완료 흐름", "기록 읽기", `GET /api/progress/${course} ${g ? g.status : "?"}`, "BLOCKED"); return; }
  const startDone = !!(lessons[id] && lessons[id].completed);
  const risk = !startDone && SD.completionWouldUnlockIn(course, id, lessons);
  if (risk) { R(`${T.shadowing} 완료`, "완료 누르기", "장이 영구히 열리지 않을 때만 누름", "완료하면 그 장이 끝나 다음 장이 열림(되돌릴 수 없음) — 누르지 않음", "BLOCKED"); return; }
  const listBefore = await listRead(tab, course, id);
  const otherBefore = await listRead(tab, other, other === "student" ? "s1-2" : "a1-2");
  R("목록", `/${course} 처음`, "—", `진도율 ${listBefore.count}/${listBefore.total} (${listBefore.pct}%) · 이 강의 '${listBefore.row}' 완료 ${listBefore.rowDone} · 서버 기록 완료 ${startDone}`, "INFO");
  // back to the lesson, practise
  await H.load(tab, url, { marker: H.MARKERS[course] });
  await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
  await openTab(tab, T.shadowing);
  const c0 = await tab.eval(completionState).catch(() => null);
  const pr = await practise(tab, course, exp, items);
  await openTab(tab, T.shadowing);
  let c1 = await tab.eval(completionState).catch(() => null);
  R(`${T.shadowing} 완료`, `연습(받아쓰기 ${pr.solved}/${pr.total} · 읽었어요 ${pr.said}/${pr.total}) 뒤 완료 단추`, "'이 강의 학습 완료' 켜짐(80% + 80%)", `처음 ${c0 ? (c0.done ? "완료한 강의" : `단추 켜짐 ${c0.enabled}`) : "?"} → 연습 뒤 ${c1 ? (c1.done ? "완료한 강의(취소 단추)" : `단추 켜짐 ${c1.enabled}`) : "?"}`, c1 && (c1.done || c1.enabled) ? "PASS" : "FAIL");
  if (c1 && c1.done) {
    // already completed on the record: undo first (it can be completed again — practised on this screen)
    await tab.eval("performance.clearResourceTimings(); performance.setResourceTimingBufferSize(3000)").catch(() => {});
    await H.click(tab, `document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, { settle: 700 });
    await pendingEmpty(tab, course);
    H.logDataChange({ course, id, action: "s3-student-adult-passoff: 완료 취소(처음부터 완료였던 강의 — 다시 완료로 되돌림 예정)", by: "rc1002-s3" });
    c1 = await tab.eval(completionState).catch(() => null);
  }
  await tab.eval("performance.clearResourceTimings(); performance.setResourceTimingBufferSize(3000)").catch(() => {});
  const posts0 = await tab.eval(`(() => { const e = performance.getEntriesByType('resource').map((x) => x.name); return { adult: e.filter((n) => /\\/api\\/progress\\/adult/.test(n)).length, student: e.filter((n) => /\\/api\\/progress\\/student/.test(n)).length }; })()`).catch(() => null);
  await H.click(tab, `document.querySelector('main [data-completion] button[aria-label="학습 완료 체크"]')`, { settle: 700 });
  const saved = await pendingEmpty(tab, course);
  const posts1 = await tab.eval(`(() => { const e = performance.getEntriesByType('resource').map((x) => x.name); return { adult: e.filter((n) => /\\/api\\/progress\\/adult/.test(n)).length, student: e.filter((n) => /\\/api\\/progress\\/student/.test(n)).length }; })()`).catch(() => null);
  H.logDataChange({ course, id, action: `s3-student-adult-passoff: '이 강의 학습 완료' 누름 (${viewport})`, by: "rc1002-s3" });
  const c2 = await tab.eval(completionState).catch(() => null);
  R(`${T.shadowing} 완료`, "'이 강의 학습 완료' 누름", `'완료한 강의' · 서버 저장(/api/progress/${course} 로만)`, `${c2 && c2.done ? "완료한 강의" : JSON.stringify(c2)} · 저장 끝 ${saved} · 보냄 adult +${posts1 && posts0 ? posts1.adult - posts0.adult : "?"} student +${posts1 && posts0 ? posts1.student - posts0.student : "?"}`, c2 && c2.done && saved && posts1 && posts0 && posts1[course] > posts0[course] && posts1[other] === posts0[other] ? "PASS" : "FAIL");
  // reload (storage wiped — the state must come from the server)
  await H.load(tab, url, { marker: H.MARKERS[course] });
  await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
  await openTab(tab, T.shadowing);
  await H.waitFor(tab, `!!document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, 8000);
  const c3 = await tab.eval(completionState).catch(() => null);
  R(`${T.shadowing} 완료`, "새로고침(이 기기 저장 지움) 뒤", "'완료한 강의' 그대로 · '다음 강의' 단추", `${c3 && c3.done ? "완료한 강의" : JSON.stringify(c3)} · 다음 ${c3 && c3.next ? `${c3.next.href} '${c3.next.text}'` : "없음"}`, c3 && c3.done ? "PASS" : "FAIL");
  // '다음 강의'
  if (nb.next) {
    if (c3 && c3.next) {
      await H.click(tab, `document.querySelector('main [data-completion] a[href]')`, { settle: 300 });
      const went = await H.waitFor(tab, `location.pathname === ${JSON.stringify(`/${course}/${nb.next}`)}`, 10000);
      const at = await tab.eval("location.pathname").catch(() => null);
      R(`${T.shadowing} 완료`, "'다음 강의' 누름", `/${course}/${nb.next}`, at, went ? "PASS" : "FAIL");
    } else R(`${T.shadowing} 완료`, "'다음 강의' 단추", `/${course}/${nb.next} 로 가는 단추`, "완료 칸에 없음", "FAIL");
    // the bottom bar's '다음 강의' (LessonEndBar) too
    await H.load(tab, url, { marker: H.MARKERS[course] });
    const endNext = await tab.eval(`(() => { const a = document.querySelector('main section[aria-label="강의 마치기"] a[aria-label^="다음 강의"]'); return a ? new URL(a.href).pathname : null; })()`).catch(() => null);
    if (endNext) {
      await H.click(tab, `document.querySelector('main section[aria-label="강의 마치기"] a[aria-label^="다음 강의"]')`, { settle: 300 });
      const went2 = await H.waitFor(tab, `location.pathname === ${JSON.stringify(`/${course}/${nb.next}`)}`, 10000);
      R("맨 아래", "맨 아래 '다음 강의'", `/${course}/${nb.next}`, `${endNext} → ${await tab.eval("location.pathname").catch(() => null)}`, went2 ? "PASS" : "FAIL");
    } else R("맨 아래", "맨 아래 '다음 강의'", `/${course}/${nb.next}`, "없음", "FAIL");
  } else R(`${T.shadowing} 완료`, "'다음 강의'", "마지막 강의 — 없음", c3 && c3.next ? `있음 ${c3.next.href}` : "없음", c3 && !c3.next ? "PASS" : "FAIL");
  // the course list
  const listAfter = await listRead(tab, course, id);
  const expectCount = listBefore.count + (startDone ? 0 : 1);
  R("목록", `/${course} 완료 뒤`, `이 강의 '완료' · 진도율 ${expectCount}/${listBefore.total}`, `'${listAfter.row}' · 진도율 ${listAfter.count}/${listAfter.total} (${listAfter.pct}%)`, listAfter.rowDone && listAfter.count === expectCount ? "PASS" : "FAIL");
  // mixing: the other course's list is unchanged
  const otherAfter = await listRead(tab, other, other === "student" ? "s1-2" : "a1-2");
  const leaked = otherAfter.doneIds.filter((x) => !otherBefore.doneIds.includes(x));
  R("섞임", `${course.toUpperCase()} 완료 뒤 /${other} 목록`, "진도율 · 완료 표시 그대로", `진도율 ${otherBefore.count} → ${otherAfter.count} · 새로 완료 표시 ${leaked.length ? leaked.join(",") : "0"} · ${id} 이 /${other} 에 ${otherAfter.doneIds.includes(id) ? "있음" : "없음"}`, otherAfter.count === otherBefore.count && !leaked.length ? "PASS" : "FAIL");
  const baseDone = opts.baseline && opts.baseline[course] && opts.baseline[course][id] !== undefined ? opts.baseline[course][id] : startDone;
  if (startDone !== baseDone) R("되돌림", "이 실행 처음 기록과 지금 기록이 다름", `처음(스크립트 시작) ${baseDone ? "완료" : "미완료"}`, `이 화면 시작 때 서버 ${startDone ? "완료" : "미완료"} — 다른 사본 기기의 옛 완료 옮기기로 되살아난 것으로 봄`, "INFO");
  if (baseDone) { R("되돌림", "처음부터 완료였던 강의", "완료 상태로 끝남", "완료로 끝남(완료 취소는 위에서 눌러 봄)", "INFO"); return; }
  // undo
  await H.load(tab, url, { marker: H.MARKERS[course] });
  await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
  await openTab(tab, T.shadowing);
  await H.waitFor(tab, `!!document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, 8000);
  await H.click(tab, `document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, { settle: 700 });
  const saved2 = await pendingEmpty(tab, course);
  H.logDataChange({ course, id, action: `s3-student-adult-passoff: '완료 취소' 누름 — 처음 상태(미완료)로 되돌림 (${viewport})`, by: "rc1002-s3" });
  await H.load(tab, url, { marker: H.MARKERS[course] });
  await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
  await openTab(tab, T.shadowing);
  await H.sleep(2500);
  const c4 = await tab.eval(completionState).catch(() => null);
  R("되돌림", "'완료 취소' → 새로고침", "미완료(완료 단추 다시 보임)", `${c4 ? (c4.done ? "아직 완료" : `미완료 · 단추 켜짐 ${c4.enabled}`) : "?"} · 저장 끝 ${saved2}`, c4 && !c4.done ? "PASS" : "FAIL");
  const listBack = await listRead(tab, course, id);
  const backCount = listBefore.count - (startDone ? 1 : 0);
  R("되돌림", `/${course} 목록`, `진도율 ${backCount} · 완료 표시 없음`, `'${listBack.row}' · 진도율 ${listBack.count}/${listBack.total}`, !listBack.rowDone && listBack.count === backCount ? "PASS" : "FAIL");
  const g2 = await progressGet(tab, course);
  const l2 = g2 && g2.body && g2.body.progress && g2.body.progress.lessons;
  R("되돌림", "서버 기록(읽기만)", "이 강의 completed 아님 · unlockedThrough 그대로", `completed ${l2 && l2[id] ? l2[id].completed : "기록 없음"} · unlockedThrough ${g.body.progress.unlockedThrough} → ${g2 && g2.body && g2.body.progress.unlockedThrough}`, l2 && !(l2[id] && l2[id].completed) && g.body.progress.unlockedThrough === g2.body.progress.unlockedThrough ? "PASS" : "FAIL");
}

// ---------------------------------------------------------------------------------------------------------------
// ADULT Step 2 · 3 (drive-generic adultWords · adultChunks 를 흐름 판으로 옮김)
// ---------------------------------------------------------------------------------------------------------------
async function adultWords(tab, exp, R, course, id) {
  const A = exp.adult;
  const P = `main [data-step-panel="2"]`;
  const has = await H.waitFor(tab, `document.querySelectorAll('${P} li[data-vocab]').length > 0`, 4000);
  if (!has) { R("2 단어", "카드", `${A.words.length}장`, "카드 없음", "FAIL"); return; }
  const count = await tab.eval(`document.querySelectorAll('${P} li[data-vocab]').length`);
  R("2 단어", "카드 수", `${A.words.length}`, `${count}`, count === A.words.length ? "PASS" : "FAIL");
  const card = (o) => `document.querySelector('${P} li[data-vocab="${o}"]')`;
  const read = (o) => tab.eval(`(() => { const li = ${card(o)}; if (!li) return null; const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : null; const w = li.querySelector('[data-word-text]'); return { word: t(w), pos: t(w && w.nextElementSibling), meaning: t(li.querySelector('[data-meaning]')), mark: li.getAttribute('data-mark'), folded: !!li.querySelector('[data-action="unfold"]') }; })()`).catch(() => null);
  const w0 = A.words[0];
  const before = await read(0);
  await H.click(tab, `${card(0)}.querySelector('[data-action="reveal"]')`, { settle: 300 });
  const shown = await read(0);
  R("2 단어", "카드 1 '뜻 보기'", `'${w0.word}' (${w0.pos}) — ${w0.meaning}`, `누르기 전 뜻 ${before && before.meaning ? "보임" : "가림"} → '${shown && shown.meaning}' · 품사 '${shown && shown.pos}'`, before && !before.meaning && shown && tx(shown.meaning) === tx(w0.meaning) && tx(shown.word) === tx(w0.word) ? "PASS" : "FAIL");
  await H.click(tab, `${card(0)}.querySelector('[data-action="unknown"]')`, { settle: 250 });
  const unk = await read(0);
  R("2 단어", "카드 1 '몰라요'", "몰라요 표시", `data-mark ${unk && unk.mark}`, unk && unk.mark === "unknown" ? "PASS" : "FAIL");
  if (A.words.length > 1) {
    await H.click(tab, `${card(1)}.querySelector('[data-action="reveal"]')`, { settle: 300 });
    await H.click(tab, `${card(1)}.querySelector('[data-action="known"]')`, { settle: 300 });
    const kn = await read(1);
    const summary = await tab.eval(`(() => { const s = document.querySelector('${P} [data-vocab-summary]'); return s ? s.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
    R("2 단어", "카드 2 '알아요'", "알아요 → 접힘 · 요약 '알아요 1 · 몰라요 1'", `data-mark ${kn && kn.mark} · 접힘 ${kn && kn.folded} · 요약 '${summary}'`, kn && kn.mark === "known" && kn.folded && /알아요 1 · 몰라요 1/.test(summary || "") ? "PASS" : "FAIL");
  }
  const a = await press(tab, `${card(0)}.querySelector('[data-action="word-audio"]')`, 9000);
  R("2 단어", `낱말 소리 '${w0.word}'`, `그 낱말 클립 ${w0.sayPath.split("/").pop()}`, audioSaw(a), audioVerdict(a, w0.sayPath));
  const cloze = `(() => { const c = document.querySelector('${P} [data-cloze]'); if (!c) return null; const t = (el) => el ? (el.textContent || '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim() : null; const f = c.querySelector('[data-cloze-feedback]'); return { order: +c.getAttribute('data-order'), masked: t(c.querySelector('[data-masked]')), options: [...c.querySelectorAll('[data-option]')].map((b) => t(b)), feedback: f ? f.getAttribute('data-cloze-feedback') : null, ko: t(c.querySelector('[data-cloze-ko]')), filled: t(c.querySelector('[data-filled]')) }; })()`;
  await H.waitFor(tab, `Boolean(document.querySelector('${P} [data-cloze]'))`, 3000);
  const setSize = Math.min(5, A.words.length);
  const got = [];
  let firstOrder = null, listened = null;
  for (let q = 0; q < setSize; q++) {
    const c = await tab.eval(cloze).catch(() => null);
    if (!c) break;
    if (q === 0) firstOrder = c.order;
    const w = A.words[c.order];
    const wrong = q === 1;
    const pick = wrong ? c.options.find((o) => o !== tx(w.answer)) : c.options.find((o) => o === tx(w.answer));
    const at = c.options.indexOf(pick);
    if (at < 0) { got.push(`#${q + 1} 보기에 정답 없음`); break; }
    await H.click(tab, `document.querySelector('${P} [data-cloze] [data-option="${at}"]')`, { settle: 300 });
    const after = await tab.eval(cloze).catch(() => null);
    const okRow = after && after.feedback === (wrong ? "wrong" : "correct") && tx(after.filled) === tx(A.sentences[w.sentence]) && c.options.length === 4;
    got.push(`#${q + 1} ${wrong ? "틀린 보기" : "정답"}→${after && after.feedback}${okRow ? "" : "✗"}`);
    if (!listened && after && after.feedback) {
      const want = clipOf("adult", id, A.sentences[w.sentence]);
      listened = await press(tab, `document.querySelector('${P} [data-cloze] [data-action="cloze-listen"]')`, 9000);
      R("2 단어", "빈칸 '문장 듣기'", `그 문장 클립 ${want.split("/").pop()}`, audioSaw(listened), audioVerdict(listened, want));
    }
    await H.click(tab, `document.querySelector('${P} [data-cloze] [data-action="cloze-next"]')`, { settle: 300 });
  }
  const result = await tab.eval(`(() => { const r = document.querySelector('${P} [data-cloze-result]'); return r ? r.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
  const right = setSize - 1;
  R("2 단어", `빈칸 채우기 ${setSize}문제(둘째는 일부러 틀림)`, `첫 문제 = 몰라요 낱말 · 결과 '${right} / ${setSize} 맞힘'`, `${got.join(" · ")} · 첫 문제 data-order ${firstOrder} · 결과 '${result}'`, firstOrder === 0 && got.length === setSize && !got.some((x) => /✗|없음/.test(x)) && new RegExp(`${right} / ${setSize} 맞힘`).test(result || "") ? "PASS" : "FAIL");
  const tabNow = await tab.eval(`(document.querySelector('main [data-step-tab="2"]') || {}).innerText || ''`).catch(() => "");
  R("2 단어", "탭 수", `${right}/${A.words.length}`, tx(tabNow), new RegExp(`${right}/${A.words.length}`).test(tx(tabNow)) ? "PASS" : "FAIL");
  await H.click(tab, `document.querySelector('${P} [data-action="cloze-again"]')`, { settle: 400 });
  const again = await tab.eval(cloze).catch(() => null);
  R("2 단어", "'다른 빈칸으로 다시 풀기'", "새 문제(답하지 않은 상태)", again ? `data-order ${again.order} · 판정 ${again.feedback}` : "없음", again && !again.feedback ? "PASS" : "FAIL");
}

async function adultChunks(tab, exp, R, course, id) {
  const A = exp.adult;
  const P = `main [data-step-panel="3"]`;
  if (!(await H.waitFor(tab, `Boolean(document.querySelector('${P} [data-chunk-sentence]'))`, 4000))) { R("3 끊어 읽기", "문장", "덩어리 화면", "없음", "FAIL"); return; }
  const state = `(() => { const s = document.querySelector('${P} [data-chunk-sentence]'); if (!s) return null; const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : null; return { idx: +s.getAttribute('data-chunk-sentence'), chunks: [...s.querySelectorAll('li[data-chunk]')].map((li) => ({ en: t(li.querySelector('[data-en]')), ko: t(li.querySelector('[data-ko]')), closed: !!li.querySelector('[data-reveal="open"]') })), whole: (() => { const w = s.querySelector('[data-chunk-whole]'); return w ? t(w.lastElementChild) : null; })() }; })()`;
  const s0 = await tab.eval(state).catch(() => null);
  const want = A.chunks[0] || [];
  R("3 끊어 읽기", "문장 1 덩어리 · 뜻 가림", `덩어리 ${want.length} · 뜻 가림 · 전체 해석 가림`, `덩어리 ${s0 && s0.chunks.length} · 영어 ${s0 && s0.chunks.every((c, k) => want[k] && tx(c.en) === tx(want[k].en)) ? "같음" : "다름"} · 가림 ${s0 && s0.chunks.filter((c) => c.closed).length} · 전체 해석 ${s0 && s0.whole ? "보임" : "가림"}`, s0 && s0.idx === 0 && s0.chunks.length === want.length && s0.chunks.every((c, k) => tx(c.en) === tx(want[k].en) && c.closed) && !s0.whole ? "PASS" : "FAIL");
  const a = await press(tab, `document.querySelector('${P} li[data-chunk="0"] button')`, 9000);
  R("3 끊어 읽기", "덩어리 1 소리", `그 덩어리 클립 ${want[0].path.split("/").pop()}`, audioSaw(a), audioVerdict(a, want[0].path));
  if (want[1]) { const a2 = await press(tab, `document.querySelector('${P} li[data-chunk="1"] button')`, 9000); R("3 끊어 읽기", "덩어리 2 소리", `그 덩어리 클립 ${want[1].path.split("/").pop()}`, audioSaw(a2), audioVerdict(a2, want[1].path)); }
  await H.click(tab, `document.querySelector('${P} li[data-chunk="0"] [data-reveal="open"]')`, { settle: 250 });
  const s1 = await tab.eval(state).catch(() => null);
  R("3 끊어 읽기", "덩어리 1 '뜻 보기'", `'${want[0].ko}' · 다른 덩어리는 가림`, `'${s1 && s1.chunks[0].ko}' · 나머지 가림 ${s1 && s1.chunks.slice(1).every((c) => c.closed)}`, s1 && tx(s1.chunks[0].ko) === tx(want[0].ko) && s1.chunks.slice(1).every((c) => c.closed) ? "PASS" : "FAIL");
  const tabB = await tab.eval(`(document.querySelector('main [data-step-tab="3"]') || {}).innerText || ''`).catch(() => "");
  await H.click(tab, `document.querySelector('${P} [data-action="all-meanings"]')`, { settle: 300 });
  const s2 = await tab.eval(state).catch(() => null);
  const tabA = await tab.eval(`(document.querySelector('main [data-step-tab="3"]') || {}).innerText || ''`).catch(() => "");
  R("3 끊어 읽기", "'뜻 모두 보기' → '문장 전체 해석'", `뜻 모두 · 해석 '${tx(A.ko[0]).slice(0, 40)}' · 탭 수 +1`, `뜻 ${s2 && s2.chunks.every((c, k) => tx(c.ko) === tx(want[k].ko)) ? "모두 같음" : "다름"} · 해석 '${tx(s2 && s2.whole).slice(0, 50)}' · 탭 '${tx(tabB)}' → '${tx(tabA)}'`, s2 && s2.chunks.every((c, k) => tx(c.ko) === tx(want[k].ko)) && tx(s2.whole) === tx(A.ko[0]) && /1\//.test(tx(tabA)) ? "PASS" : "FAIL");
  const r = await press(tab, `document.querySelector('${P} [data-action="chunk-run"]')`, 9000);
  R("3 끊어 읽기", "'끊어 듣기'", `첫 덩어리부터 ${want[0].path.split("/").pop()}`, audioSaw(r), r.ok && r.played.includes(want[0].path) && !r.tts.length ? "PASS" : "FAIL");
  const sn = await press(tab, `document.querySelector('${P} [data-action="sentence"]')`, 9000);
  R("3 끊어 읽기", "'문장 듣기'", `그 문장 ${A.sentencePaths[0].split("/").pop()}`, audioSaw(sn), audioVerdict(sn, A.sentencePaths[0]));
  // the number button of sentence 2 plays its chunks (inside the step — allowed); moving between steps stays silent (checked above)
  if (A.chunks[1] && A.chunks[1].length) {
    const nb = await press(tab, `document.querySelector('${P} [data-pill="1"]')`, 9000);
    R("3 끊어 읽기", "번호 단추 2", `2번 문장 덩어리를 차례로(첫 ${A.chunks[1][0].path.split("/").pop()})`, audioSaw(nb), nb.ok && nb.played.includes(A.chunks[1][0].path) ? "PASS" : "FAIL");
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------------
// PASS-OFF — flows the sweep does not press: mic (denied), '도움 받기' ladder, completion button state, '다음 강의',
// review / notes / map (read + one review answer at most)
// ---------------------------------------------------------------------------------------------------------------
const PSTEP = (n) => `document.querySelector('main [data-passoff-view] section[aria-labelledby="passoff-step-${n}"]')`;
async function passoffLesson(tab, id, viewport, opts) {
  const R = (step, what, expect, saw, verdict) => row({ course: "PASS-OFF", lesson: id, viewport, step, what, expect, saw, verdict });
  const PX = require(path.join(S, "lib/passoff-expect.cjs"));
  const exp = PX.expectedPassoff(id, { licensed: true });
  const nb = PX.neighbours()[id] || {};
  await H.setViewport(tab, viewport);
  await setMic(PORT, "denied");
  const ld = await H.load(tab, `/passoff-grammar/${id}`, { marker: H.MARKERS["passoff-grammar"] });
  if (!(await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000))) { R("열기", "강의", "PASS-OFF 화면", JSON.stringify(ld), "FAIL"); return; }
  const END = `(() => { const s = document.querySelector('main section[aria-label="강의 마치기"]'); if (!s) return null; const b = s.querySelector('button[aria-label^="학습 완료"]'); const st = s.querySelector('[role=status]'); const n = s.querySelector('a[aria-label^="다음 강의"]'); return { btn: b ? { label: b.getAttribute('aria-label'), disabled: b.disabled } : null, status: st ? st.innerText.trim() : null, reason: (s.querySelector('p[id]') || {}).innerText || null, next: n ? new URL(n.href).pathname : null }; })()`;
  const e0 = await tab.eval(END).catch(() => null);
  R("끝 칸", "처음 '이 강의 학습 완료'", "꺼짐 + 까닭 한 줄(또는 이미 '학습 완료함')", JSON.stringify(e0), e0 && ((e0.btn && e0.btn.disabled && e0.reason) || /학습 완료함/.test(e0.status || "")) ? "PASS" : "FAIL");
  // ① mic: '먼저 말해 보기'
  const micBtn = `[...(${PSTEP(1)} || document).querySelectorAll('button')].find((b) => /먼저 말해 보기|말해 보기|마이크/.test(b.innerText || ''))`;
  const hasMic = await tab.eval(`!!(${micBtn})`).catch(() => false);
  if (hasMic) {
    const label = await tab.eval(`(${micBtn}).innerText.trim()`).catch(() => "");
    await H.click(tab, micBtn, { settle: 500 });
    let inner = `[...(${PSTEP(1)} || document).querySelectorAll('button')].find((b) => /말하기 확인|말해서|녹음|말하기/.test(b.innerText || '') && b !== (${micBtn}))`;
    if (await tab.eval(`!!(${inner})`).catch(() => false)) await H.click(tab, inner, { settle: 300 });
    await H.waitFor(tab, `/권한|음성 인식 오류|지원하지/.test((${PSTEP(1)} || document.body).innerText)`, 8000);
    const msg = await tab.eval(`(() => { const s = ${PSTEP(1)} || document.body; const d = [...s.querySelectorAll('div')].find((x) => /border-danger/.test(x.className) && (x.innerText || '').trim()); return d ? d.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
    R("1 예문", `마이크 권한 거부 상태에서 '${label}'`, "권한 안내 글", `'${msg}'`, /권한/.test(msg || "") ? "PASS" : "FAIL");
  } else R("1 예문", "마이크 단추(① '먼저 말해 보기')", "있으면 누름", "① 에 마이크 단추 없음", "INFO");
  // ④ compose: the card's microphone first (denied), then a wrong answer and the '도움 받기' ladder to '정답 보기'
  await H.click(tab, `document.querySelector('main [data-passoff-view] [data-step-tab="4"]')`, { settle: 700 });
  const S4 = PSTEP(4);
  const has4 = await H.waitFor(tab, `!!(${S4}) && !!(${S4}).querySelector('textarea')`, 5000);
  if (has4) {
    const m4 = `[...(${S4}).querySelectorAll('button')].find((b) => /마이크/.test(b.innerText || '') || /마이크/.test(b.getAttribute('aria-label') || ''))`;
    if (await tab.eval(`!!(${m4})`).catch(() => false)) {
      const label = await tab.eval(`((${m4}).innerText || (${m4}).getAttribute('aria-label')).trim()`).catch(() => "");
      await H.click(tab, m4, { settle: 500 });
      await H.waitFor(tab, `/권한|음성 인식 오류/.test((${S4}).innerText)`, 8000);
      const msg = await tab.eval(`(() => { const s = ${S4}; const d = [...s.querySelectorAll('div')].find((x) => /border-danger/.test(x.className) && (x.innerText || '').trim()); return d ? d.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
      R("4 영작", `마이크 권한 거부 상태에서 '${label}'`, "권한 안내 글", `'${msg}'`, /권한/.test(msg || "") ? "PASS" : "FAIL");
    } else R("4 영작", "마이크 단추", "'마이크로 말해서 영작하기'", "④ 에 마이크 단추 없음", "FAIL");
    const steps = [];
    const koLine = await tab.eval(`[...(${S4}).querySelectorAll('p')].map((p) => (p.innerText || '').replace(/\\s+/g, ' ').trim())`).catch(() => []);
    const item = exp.produce.find((p) => koLine.includes(tx(p.ko))) || exp.produce[0];
    const wrong = item.en.replace(/\s*\S+\s*$/, "") || "x";
    await H.type(tab, `(${S4}).querySelector('textarea')`, wrong);
    await H.sleep(150);
    await H.click(tab, `[...(${S4}).querySelectorAll('button')].find((b) => /^(다시 )?확인$/.test((b.innerText || '').trim()))`, { settle: 600 });
    const tw = await tab.eval(`(${S4} || {}).innerText || ''`).catch(() => "");
    steps.push(`틀린 답 '${wrong.slice(0, 40)}' → ${/틀린 자리를 표시했어요/.test(tw) ? "틀린 자리 표시" : tx(tw).slice(-60)}`);
    H.logDataChange({ course: "passoff-grammar", id, action: `s3-student-adult-passoff: ④ ${item.id} 일부러 틀린 답 한 번 + 도움 받기 → 정답 보기(이 강의 학습 기록에 '도움 받음' 으로 남을 수 있음 — 이용권 상태 아님) (${viewport})`, by: "rc1002-s3" });
    let prev = tx(tw);
    for (let k = 0; k < 6; k++) {
      const btn = `[...(${S4}).querySelectorAll('button')].find((b) => /^(도움 받기|정답 보기)$/.test((b.innerText || '').trim()))`;
      const lab = await tab.eval(`(() => { const b = ${btn}; return b ? b.innerText.trim() : null; })()`).catch(() => null);
      if (!lab) break;
      await H.click(tab, btn, { settle: 500 });
      const t = tx(await tab.eval(`(${S4} || {}).innerText || ''`).catch(() => ""));
      // what this press added: the words that are new on the step
      const added = t.split(" ").filter((w) => !prev.includes(w)).join(" ").slice(0, 110);
      const shows = /낱말 카드|카드를 눌러/.test(t) ? " [낱말 카드]" : /첫 글자/.test(t) ? " [첫 글자]" : "";
      steps.push(`${lab} → ${added || "(바뀐 글 없음)"}${shows}`);
      prev = t;
      if (lab === "정답 보기") break;
    }
    const after = tx(await tab.eval(`(${S4} || {}).innerText || ''`).catch(() => ""));
    const answerShown = after.includes(tx(exp.gloss ? exp.gloss(item.en) : item.en)) || after.includes(tx(item.en));
    R("4 영작", "틀린 답 → '도움 받기' 를 끝까지 → '정답 보기'", "틀린 자리 표시 → 도움(첫 글자 → 낱말 카드) → 정답 문장", `${steps.join(" ┃ ").slice(0, 650)} ┃ 정답 문장 보임 ${answerShown}`, /틀린 자리 표시/.test(steps[0]) && /^정답 보기/.test(steps[steps.length - 1] || "") && answerShown ? "PASS" : "FAIL");
  } else R("4 영작", "영작 카드", "카드", "없음(문장 0?)", exp.produce.length ? "FAIL" : "INFO");
  // completion button: still off (not all steps done in this visit) — the sweep pressed the five steps and saw it on
  const e1 = await tab.eval(END).catch(() => null);
  R("끝 칸", "다섯 단계를 안 마친 채", "꺼짐 그대로(또는 학습 완료함)", JSON.stringify(e1), e1 && ((e1.btn && e1.btn.disabled) || /학습 완료함/.test(e1.status || "")) ? "PASS" : "FAIL");
  R("끝 칸", "'이 강의 학습 완료' 누르기", "—", "단추 켜짐까지만 봄 — 되돌림 없음(서버가 완료만 기록 · undo: false) · 켜짐은 drive-passoff 기록에서", "INFO");
  // '다음 강의'
  if (nb.next) {
    const nx = e1 && e1.next;
    if (nx) {
      await H.click(tab, `document.querySelector('main section[aria-label="강의 마치기"] a[aria-label^="다음 강의"]')`, { settle: 300 });
      const went = await H.waitFor(tab, `location.pathname === ${JSON.stringify(`/passoff-grammar/${nb.next}`)}`, 10000);
      R("끝 칸", "'다음 강의' 누름", `/passoff-grammar/${nb.next}`, `${nx} → ${await tab.eval("location.pathname").catch(() => null)}`, went ? "PASS" : "FAIL");
    } else R("끝 칸", "'다음 강의'", `/passoff-grammar/${nb.next}`, "단추 없음", "FAIL");
  } else R("끝 칸", "'다음 강의'", "마지막 강의 — 없음", e1 && e1.next ? `있음 ${e1.next}` : "없음", e1 && !e1.next ? "PASS" : "FAIL");
}

async function passoffPages(tab, viewport) {
  const R = (step, what, expect, saw, verdict) => row({ course: "PASS-OFF", lesson: step, viewport, step, what, expect, saw, verdict });
  await H.setViewport(tab, viewport);
  for (const [name, url, want] of [["오늘 복습", "/passoff-grammar/review", /오늘 복습/], ["오답노트", "/passoff-grammar/review?notes=1", /오답노트/], ["구성도", "/passoff-grammar/map?topic=1", /구성도/]]) {
    await H.load(tab, url, { marker: null });
    await H.waitFor(tab, `(() => { const m = document.querySelector('main'); return !!m && !/불러오고 있어요/.test(m.innerText || '') && (m.innerText || '').length > 40; })()`, 15000);
    await H.sleep(1200);
    const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
    const buttons = await tab.eval(`[...document.querySelectorAll('main button, main a[href]')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 25)`).catch(() => []);
    const ev = H.events(tab);
    R(name, `${url} 열기`, `'${want.source}' 화면 · 4xx/5xx 0 · 가로 넘침 없음`, `${snap ? tx(snap.text).slice(0, 220) : "?"} ┃ 단추 ${buttons.slice(0, 12).join(" / ")} ┃ 4xx/5xx ${ev.badResponses.length} · 넘침 ${snap && snap.overflowX}`, snap && want.test(snap.text) && !ev.badResponses.length && !snap.overflowX && !snap.errorScreen ? "PASS" : "FAIL");
    if (name === "오늘 복습") {
      // start the session if it has a start button, and look at the first card (nothing typed or sent)
      const start = `[...document.querySelectorAll('main button')].find((b) => /복습 시작|시작하기|시작/.test(b.innerText || ''))`;
      if (await tab.eval(`!!(${start})`).catch(() => false)) {
        await H.click(tab, start, { settle: 1200 });
        const t = await tab.eval(`(document.querySelector('main') || {}).innerText || ''`).catch(() => "");
        R(name, "복습 시작 → 첫 카드", "카드(한국어 문장 · 답 칸 · 도움 받기)", tx(t).slice(0, 260), /확인|도움 받기|정답|답/.test(t) ? "PASS" : "FAIL");
        // '도움 받기' on the review card — no answer sent
        const help = `[...document.querySelectorAll('main button')].find((b) => /^도움 받기$/.test((b.innerText || '').trim()))`;
        if (await tab.eval(`!!(${help})`).catch(() => false)) {
          await H.click(tab, help, { settle: 500 });
          const t2 = await tab.eval(`(document.querySelector('main') || {}).innerText || ''`).catch(() => "");
          R(name, "복습 카드 '도움 받기'", "도움이 보임(답은 안 보냄)", tx(t2).slice(0, 240), t2 !== t ? "PASS" : "FAIL");
        }
      } else R(name, "복습 시작", "오늘 복습할 것이 있으면 시작 단추", "시작 단추 없음(오늘 복습 0 또는 바로 카드)", "INFO");
    }
    if (name === "오답노트") {
      const again = `[...document.querySelectorAll('main button')].find((b) => /지금 다시 풀기/.test(b.innerText || ''))`;
      if (await tab.eval(`!!(${again})`).catch(() => false)) {
        await H.click(tab, again, { settle: 1200 });
        const t = await tab.eval(`(document.querySelector('main') || {}).innerText || ''`).catch(() => "");
        R(name, "'지금 다시 풀기' → 첫 카드", "카드가 열림(답은 안 보냄)", tx(t).slice(0, 240), /확인|도움 받기|정답/.test(t) ? "PASS" : "FAIL");
      } else R(name, "'지금 다시 풀기'", "틀린 문제가 있으면 단추", "단추 없음", "INFO");
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
(async () => {
  await freeMemOk();
  const browser = await H.startBrowser(CLONE, PORT);
  let tab;
  const sigsAll = {};
  try {
    tab = await H.openTab(browser, { clean: true });
    if (MODE === "stu-adult") {
      // the record as it is before this run (read only) — every lesson ends as it was here
      const baseline = {};
      await H.load(tab, "/student", { marker: null });
      for (const c of ["student", "adult"]) {
        const g = await progressGet(tab, c);
        const ls = (g && g.body && g.body.progress && g.body.progress.lessons) || {};
        baseline[c] = {};
        for (const spec of IDS) { const [cc, id] = spec.split(":"); if (cc === c) baseline[c][id] = !!(ls[id] && ls[id].completed); }
      }
      if (arg("--baseline-json", null)) Object.assign(baseline, JSON.parse(arg("--baseline-json")));
      console.log("baseline", JSON.stringify(baseline));
      row({ course: "-", lesson: "-", viewport: "-", step: "처음 기록", what: "서버 완료 기록(읽기만)", expect: "—", saw: JSON.stringify(baseline), verdict: "INFO" });
      for (const spec of IDS) {
        const [course, id] = spec.split(":");
        for (const vp of VIEWPORTS) {
          try {
            const sigs = await stuAdultLesson(tab, course, id, vp, { complete: has("--complete") && (has("--complete-all-viewports") || vp === "desktop"), fakeMic: vp === "desktop" && has("--fake-mic"), browser, baseline });
            sigsAll[`${course}:${id}:${vp}`] = sigs;
          } catch (e) { row({ course: course.toUpperCase(), lesson: id, viewport: vp, step: "?", what: "방문 오류", expect: "—", saw: String(e && e.stack).slice(0, 300), verdict: "BLOCKED" }); }
        }
      }
      fs.writeFileSync(OUTF.replace(/\.jsonl$/, "-sigs.json"), JSON.stringify(sigsAll, null, 1));
    } else if (MODE === "restore") {
      // put lessons back to NOT completed (their state before this session) — '완료 취소' on the lesson screen, as a learner
      await H.setViewport(tab, "desktop");
      for (const spec of IDS) {
        const [course, id] = spec.split(":");
        const T = TABS[course];
        const R = (what, expect, saw, verdict) => row({ course: course.toUpperCase(), lesson: id, viewport: "desktop", step: "되돌림", what, expect, saw, verdict });
        await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
        const g = await progressGet(tab, course);
        const was = !!(g && g.body && g.body.progress.lessons[id] && g.body.progress.lessons[id].completed);
        if (!was) { R("서버 기록(읽기만)", "미완료", "이미 미완료 — 누르지 않음", "PASS"); continue; }
        await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
        await openTab(tab, T.shadowing);
        await H.waitFor(tab, `!!document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, 8000);
        const c = await H.click(tab, `document.querySelector('main [data-completion] button[aria-label="학습 완료 취소"]')`, { settle: 700 });
        const saved = await pendingEmpty(tab, course);
        H.logDataChange({ course, id, action: "s3-student-adult-passoff: '완료 취소' — 이 세션 전 상태(미완료)로 되돌림(다른 사본 기기의 옛 완료 옮기기로 되살아난 것 포함)", by: "rc1002-s3" });
        await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
        await H.sleep(1500);
        const g2 = await progressGet(tab, course);
        const now = !!(g2 && g2.body && g2.body.progress.lessons[id] && g2.body.progress.lessons[id].completed);
        R("'완료 취소' → 새로고침 → 서버 기록", "미완료", `눌림 ${c.ok} · 저장 끝 ${saved} · 서버 completed ${now}`, now ? "FAIL" : "PASS");
      }
    } else if (MODE === "firstpress") {
      // the first press on a fresh page, alone: one press of '1번 문장 재생', then 30 s of the page's media events
      for (const spec of IDS) for (const vp of VIEWPORTS) {
        const [course, id] = spec.split(":");
        await H.setViewport(tab, vp);
        await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
        await H.waitFor(tab, `!!document.querySelector('main [data-student-view]')`, 10000);
        await H.sleep(1500);
        await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
        const t0 = Date.now();
        const c = await H.click(tab, `document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] button[aria-label="1번 문장 재생"]')`);
        let firstPlaying = null;
        for (let k = 0; k < 150; k++) {
          const log = await H.audioLog(tab);
          if (!firstPlaying) { const p = log.find((e) => e.ev === "playing"); if (p) firstPlaying = Date.now() - t0; }
          if (firstPlaying && Date.now() - t0 > firstPlaying + 1500) break;
          await H.sleep(200);
        }
        const log = await H.audioLog(tab);
        const want = clipOf(course, id, (((E.lesson(course, id).blocks || []).find((b) => b.type === "sentences") || {}).items || [])[0].text);
        const label = await tab.eval(`(() => { const b = document.querySelector('main [data-step-panel="1"] li[data-sentence="0"] button[aria-label^="1번 문장"]'); return b ? b.getAttribute('aria-label') : null; })()`).catch(() => null);
        row({ course: course.toUpperCase(), lesson: id, viewport: vp, step: "1 블라인드 리스닝", what: "새 쪽에서 첫 누름 하나 — 30초 지켜봄", expect: `그 문장 클립 재생(${want.split("/").pop()})`, saw: `눌림 ${c.ok} · 첫 'playing' ${firstPlaying === null ? "없음(30초)" : `${(firstPlaying / 1000).toFixed(1)}초`} · 단추 지금 '${label}' · 사건 ${log.map((e) => `${e.ev}${e.src ? "@" + String(e.src).split("/").pop().slice(0, 12) : ""}${e.text !== undefined ? `'${String(e.text).slice(0, 10)}'` : ""}+${e.t}`).join(" > ").slice(0, 400)}`, verdict: firstPlaying !== null && firstPlaying < 10000 ? "PASS" : firstPlaying !== null ? "FAIL" : "FAIL" });
        await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      }
    } else if (MODE === "check") {
      await H.load(tab, "/student", { marker: null });
      for (const c of ["student", "adult"]) {
        const g = await progressGet(tab, c);
        const ls = (g && g.body && g.body.progress && g.body.progress.lessons) || {};
        row({ course: c.toUpperCase(), lesson: "-", viewport: "-", step: "확인", what: "서버 완료 기록(읽기만)", expect: "—", saw: `완료 ${Object.keys(ls).filter((k) => ls[k].completed).join(",") || "없음"} · unlockedThrough ${g && g.body && g.body.progress.unlockedThrough}`, verdict: "INFO" });
      }
    } else if (MODE === "passoff") {
      for (const id of IDS) for (const vp of VIEWPORTS) {
        try { await passoffLesson(tab, id, vp, {}); } catch (e) { row({ course: "PASS-OFF", lesson: id, viewport: vp, step: "?", what: "방문 오류", expect: "—", saw: String(e && e.stack).slice(0, 300), verdict: "BLOCKED" }); }
      }
      if (has("--pages")) for (const vp of VIEWPORTS) { try { await passoffPages(tab, vp); } catch (e) { row({ course: "PASS-OFF", lesson: "pages", viewport: vp, step: "?", what: "방문 오류", expect: "—", saw: String(e && e.stack).slice(0, 300), verdict: "BLOCKED" }); } }
    }
  } finally {
    if (tab) await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const t = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  console.log("끝:", JSON.stringify(t));
})();
