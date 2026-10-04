#!/usr/bin/env node
/**
 * Phase 4/5 — every in-scope lesson page, exercised with a licensed profile.
 *
 * Per page × viewport it:
 *   - loads the real production page (redirects resolved and recorded)
 *   - opens EVERY step/tab and snapshots what is rendered
 *   - presses EVERY play control and checks the clip that is actually requested is one
 *     this lesson may speak (src/lib/unifiedSpeech key of a text in its own data), that
 *     it reaches 'playing', and that the app did not silently fall back to browser TTS
 *   - types the CORRECT answer from the data into every graded input, checks the verdict,
 *     then a clearly wrong answer, then harmless variants (case / spacing / final period /
 *     curly apostrophe) and records which are accepted
 *   - clicks every other visible control once (navigation, purchase, licence and admin
 *     controls excluded) and watches for errors, dead buttons and stuck state
 *   - bookmark add → reload → remove → reload, completion toggle → reload (desktop)
 *   - prev/next links compared with the course order
 *   - compares rendered text with the lesson's own data (missing / foreign text)
 *   - records console errors, exceptions, 4xx/5xx, failed requests, overflow, clipped
 *     text, off-screen and sub-24px controls, unlabeled fields
 *
 *   node drive-generic.cjs --course reading [--ids pr001,pr002] [--limit N]
 *        [--viewports desktop,tablet,mobile] [--shard 1/4] [--suffix -v1] [--port 9500] [--resume | --redo]
 *
 * Output: out/features/<course><suffix>.jsonl, out/rendered/<course>/<id>.<viewport>.json
 *
 * 회귀 점검 1002 (2026-10-04): --course adult (ADULT 5단계 — 아래 ADULT_KNOWN · adultWords · adultChunks) · --viewports 에 small
 * (작은 휴대폰 360px). 명령서의 3화면 '휴대폰 · 작은 휴대폰 · 데스크톱' = --viewports desktop,mobile,small.
 *
 * 이미 한 방문(7단계 7-1 l — 전에는 같은 과정의 다른 기록 파일에 있는 방문을 모두 "이미 함" 으로 쳐서, 새 --suffix · --ids 로
 * 몇 강만 다시 보려 해도 "0 … visits to do (246 already done)" 를 찍고 한 강도 안 본 채 exit 0 이었다 — 2026-09-23 실제로 그렇게 됨):
 *   기본       이 기록 파일(<course><suffix>.jsonl)이 비어 있어야 하고, 다른 파일의 방문은 세지 않는다 — 부른 강의를 모두 본다.
 *              이 파일에 이미 방문이 있으면 멈춤(exit 1): 이어 하기인지 새로 하기인지 이름으로 고르게.
 *   --resume   이어 하기: 이 파일과 같은 과정의 다른 기록(<course>.jsonl · <course>-sN.jsonl)의 방문을 "이미 함" 으로(옛 기본 — 샤드 이어 하기도 이것).
 *   --redo     새로 하기: 이 파일에 있던 기록은 옆 이름(.before-redo-<시각>)으로 남기고 빈 파일에서 시작.
 *   할 일이 0 이 되면 크게 찍고 exit 1 — --resume 없이 · 또는 --ids 를 주었을 때(주었는데 볼 것이 0 이면 뭔가 잘못 부른 것).
 *   --resume 이고 --ids 가 없을 때만 "남은 방문 0 — 이미 다 함" 으로 exit 0.
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");
const C = require("./lib/containers.cjs");
const V = require("./lib/voca-page.cjs");
const LDP = require("./lib/ld-page.cjs");
const RDP = require("./lib/reading-page.cjs");
const { contentCheck } = require("./lib/content-check.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const COURSE = arg("--course", null);
const ONLY = arg("--ids", null) ? new Set(arg("--ids", "").split(",")) : null;
const LIMIT = Number(arg("--limit", 0)) || 0;
const VIEWPORTS = arg("--viewports", "desktop,tablet,mobile").split(",");
const SUFFIX = arg("--suffix", "");
const SHARD = arg("--shard", null);
const REDO = process.argv.includes("--redo");
const RESUME = process.argv.includes("--resume");
if (REDO && RESUME) throw new Error("--redo 와 --resume 은 함께 쓸 수 없음");
const PORT = Number(arg("--port", 9500));
const CLONE = arg("--clone", `gen-${COURSE}${SHARD ? `-${SHARD.split("/")[0]}` : ""}`);
// Bookmark/completion persistence needs 4 extra page loads; run it on every Nth lesson.
const PERSIST_EVERY = Number(arg("--persist-every", 10));
const TABS = Number(arg("--tabs", 1));
// VOCA lessons carry 30 word players; pressing all of them on all 195 lessons would add
// hours, so the cap is per step and the rest of the clips are covered by audio-check.cjs.
const MAX_PLAY = Number(arg("--max-play", 60));
/** 문장별 훑기에서 재생 버튼을 누를 범위: all(전 문장) · first(1번 문장만) · none */
const WALK_AUDIO = arg("--walk-audio", "all");
if (!COURSE) throw new Error("--course is required");

// 7단계: --out-root <dir> 로 기록 · 화면 스냅숏을 다른 곳에(로컬 빌드를 돌린 기록이 운영 기록 옆에 섞이지 않게). 기본은 그대로 out/.
const OUT = path.resolve(arg("--out-root", path.join(__dirname, "../out")));
const JSONL = path.join(OUT, "features", `${COURSE}${SUFFIX}.jsonl`);
// 7단계 7-1 m: stamped on every record — build-coverage reads a stamped record by today's rules (the tile routine's results are the
// product's, the typed-input line of a tile page is NA); records without it are read by the rules of their day.
// 7-1m-g15 (최종 관문 15, 2026-09-24): 힌트 상자 제목이 '✍️ 고유 명사 · 숫자 · 어려운 낱말 참조' 로 바뀜(재검토 K009) — 상자 찾기가 두 제목을
// 다 받음(HINT_CHIPS). 그 밖은 7-1m 그대로. build-coverage 는 이 값이 있는지만 본다(값은 안 봄).
// 2026-09-27 STUDENT 학습법 · 화면 고침: '-s0927' — the STUDENT tile routine reads the view's data-* marks (two parts · fixed
// blanks · data-feedback) and the completion test practises to the new 80% rule first (see solveStudentTiles · practiseStudent).
// 2026-09-27 VOCA 학습법 · 화면 고침: '-v0927' — a VOCA lesson completes after one finished Step 2 round (계획 D02 나 — lessonGate),
// so the completion test finishes a round first when the button is disabled (lib/voca-page.cjs FINISH_ROUND).
// 2026-09-27 LISTENING 학습법 · 화면 고침: '-l0927' — the LISTENING dictation is read by the view's data-* marks (빈칸 · 블록 · 쓰기,
// [data-feedback]) — solveLdTiles · typedDictation · walkDictation · HINT_CHIPS below — and a LISTENING lesson completes after one
// checked line (계획 D02 나), so the completion test checks one first when the button is disabled (lib/ld-page.cjs CHECK_ONE_LINE).
// 회귀 점검 1002 단계 0 (2026-10-04): '-a1002' — ADULT (2026-10-02 새 과정): its five steps (ADULT_KNOWN — a step the driver does not
// know is BLOCKED), Step 2 단어 (adultWords) · Step 3 끊어 읽기 (adultChunks) and their readers (lib/containers adult-words ·
// adult-chunks), no sound on a step change, the completion test at Step 5 waiting on 'kig:adult:pending:v1' (/api/progress/adult).
// STUDENT · ADULT: a Hangul word is a tile (clickStudentTile key 가-힣) and the tile words keep every sentence's place
// (lib/expectations.cjs — the sentences with a Hangul word were dropped and the rest slid one place: STUDENT 24 lessons); on the
// desktop a sentence with a Hangul tile is assembled too ('· 한글 조각'). ADULT completion is pressed only when it cannot open a
// chapter for good (lib/student-data.cjs completionWouldUnlockIn on the record GET /api/progress/adult reads).
// '--viewports … small' — the 360px phone. Other courses: unchanged.
const DRIVER_REV = "7-1m-g15-s0927-v0927-l0927-a1002";
const RENDERED = path.join(OUT, "rendered", COURSE);

// Controls that leave the page or touch money/licence/admin — never pressed by the driver.
const SKIP_CLICK = /목록|이전 강의|다음 강의|홈으로|구매|이용권|등록|로그인|로그아웃|관리자|Chrome|Safari|외부|새 창|공유|다운로드|결제/;
const PLAY_RE = /🔊|▶|재생|듣기|발음|낭독|play|전체 듣기|한 문장/i;
const STOP_RE = /정지|일시정지|멈춤|중지|pause|stop|⏹|⏸/i;
const CHECK_RE = /확인|채점|제출|정답 확인|submit/i;
const BOOKMARK_RE = /북마크/;
const COMPLETE_RE = /학습 완료|완료 체크|완료됨/;

const VIS = `(el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden'`;
const listControls = (filter) => `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main') || document.body;
  return [...main.querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')]
    .filter(vis)
    .map((el, i) => ({ i, tag: el.tagName, text: (el.innerText || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 60), aria: el.getAttribute('aria-label') || '', disabled: !!el.disabled }))
    ${filter};
})()`;
const CONTROL_AT = (i) => `[...(document.querySelector('main') || document.body).querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')].filter(${VIS})[${i}]`;
/**
 * Controls are picked fresh before every click and marked on the element itself, because
 * indexes and label counts shift the moment a click changes the DOM (a meaning is
 * revealed, a panel opens, a button renames itself). `kind` decides which controls are
 * eligible; the expression marks the one it returns so the next call takes the next one.
 */
const CONTROL_BY = (spec) => `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main') || document.body;
  const all = [...main.querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')].filter(vis);
  const same = all.filter((el) => ((el.innerText || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 60) === ${JSON.stringify(spec.text)}) && ((el.getAttribute('aria-label') || '') === ${JSON.stringify(spec.aria)}));
  return same[${spec.nth}] || null;
})()`;
const NEXT_CONTROL = (kind) => `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main') || document.body;
  const label = (el) => ((el.innerText || el.value || '').replace(/\\s+/g, ' ').trim() + ' ' + (el.getAttribute('aria-label') || '')).trim();
  const play = ${PLAY_RE}, stop = ${STOP_RE}, skip = ${SKIP_CLICK}, bookmark = ${BOOKMARK_RE}, complete = ${COMPLETE_RE};
  const all = [...main.querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')].filter(vis);
  const eligible = all.filter((el) => {
    if (el.__kigClicked || el.disabled) return false;
    const t = label(el);
    if (skip.test(t) || bookmark.test(t) || complete.test(t)) return false;
    if (/step\\s*\\d|\\d\\s*단계|단계\\s*\\d/i.test(t)) return false;
    const isPlay = play.test(t) && !stop.test(t);
    return ${JSON.stringify(kind)} === 'play' ? isPlay : !isPlay;
  });
  const el = eligible[0];
  if (!el) return null;
  el.__kigClicked = true;
  el.setAttribute('data-kig-picked', '1');
  // label BEFORE the click changes it, plus which occurrence of that label it is (#n), so a
  // later isolation re-check presses the very same card among many identical "🔊" buttons
  const same = all.filter((x) => label(x) === label(el));
  const nth = same.indexOf(el);
  el.setAttribute('data-kig-label', label(el).slice(0, 60) + (same.length > 1 ? ' #' + nth : ''));
  window.__kigLastEl = el;
  return el;
})()`;
const PICKED_LABEL = `(() => { const el = document.querySelector('[data-kig-picked="1"]'); if (!el) return null; const t = el.getAttribute('data-kig-label'); el.removeAttribute('data-kig-picked'); return t; })()`;
const COUNT_CONTROLS = (kind) => `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main') || document.body;
  const label = (el) => ((el.innerText || el.value || '').replace(/\\s+/g, ' ').trim() + ' ' + (el.getAttribute('aria-label') || '')).trim();
  const play = ${PLAY_RE}, stop = ${STOP_RE}, skip = ${SKIP_CLICK}, bookmark = ${BOOKMARK_RE}, complete = ${COMPLETE_RE};
  return [...main.querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')].filter(vis).filter((el) => {
    if (el.__kigClicked || el.disabled) return false;
    const t = label(el);
    if (skip.test(t) || bookmark.test(t) || complete.test(t)) return false;
    if (/step\\s*\\d|\\d\\s*단계|단계\\s*\\d/i.test(t)) return false;
    const isPlay = play.test(t) && !stop.test(t);
    return ${JSON.stringify(kind)} === 'play' ? isPlay : !isPlay;
  }).length;
})()`;
const FIELDS = `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main') || document.body;
  return [...main.querySelectorAll('input[type=text], input:not([type]), textarea')].filter(vis).map((el, i) => ({ i, placeholder: el.placeholder || '', aria: el.getAttribute('aria-label') || '', value: el.value }));
})()`;
const FIELD_AT = (i) => `[...(document.querySelector('main') || document.body).querySelectorAll('input[type=text], input:not([type]), textarea')].filter(${VIS})[${i}]`;
const STEP_BUTTONS = `(() => {
  const vis = ${VIS};
  const main = document.querySelector('main');
  if (!main) return [];
  return [...new Set([...main.querySelectorAll('button')].filter(vis)
    .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())
    // A STEP TAB names its step first ("📚 Step 2 · 핵심 어휘", "STEP 2 (0/11) 🧩 탭-딕테이션"),
    // so the step number is allowed to sit behind an emoji but not behind words. This keeps out
    // sentences that merely MENTION a step, such as VOCA's "이 단어로 Step 2 액티브 인출 퀴즈 풀기 →",
    // which is a link inside Step 1 and disappears as soon as the view moves on — listing it as a
    // tab made the audit report every VOCA lesson as having an unclickable step button.
    .filter((t) => /^(step\\s*\\d|\\d\\s*단계|단계\\s*\\d)/i.test(t.replace(/^[^\\p{L}\\p{N}]+/u, '')))
    .filter((t) => !/^(다음|이전|←|→)/.test(t)))].slice(0, 10);
})()`;

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
const variants = (answer) => [
  { kind: "lowercase", text: answer.toLowerCase() },
  { kind: "extra-spaces", text: answer.replace(/ /g, "  ") },
  { kind: "no-final-period", text: answer.replace(/[.!?]$/, "") },
  ...(/'/.test(answer) ? [{ kind: "curly-apostrophe", text: answer.replace(/'/g, "’") }] : []),
];

async function resolveRedirect(url) {
  for (let hop = 0, cur = H.BASE + url, chain = []; hop < 5; hop++) {
    const r = await fetch(cur, { redirect: "manual" }).catch(() => null);
    if (!r) return { finalPath: url, chain, status: -1 };
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      const next = new URL(r.headers.get("location"), cur);
      chain.push(`${r.status} ${next.pathname}`);
      cur = next.href;
      continue;
    }
    return { finalPath: new URL(cur).pathname, chain, status: r.status };
  }
  return { finalPath: url, chain: [], status: -2 };
}

async function pressAudio(tab, expr, stepLabel, exp, out) {
  await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  let c = await H.click(tab, expr);
  const picked = await tab.eval(PICKED_LABEL).catch(() => null);
  const label = `${stepLabel} ▶ ${picked || c.text || "?"}`.slice(0, 90);
  if (!c.ok) { out.push({ control: label, status: "FAIL", note: `could not click: ${c.reason}` }); return; }
  // The page-level player starts its queue only after the silent mobile-unlock primer, which
  // can take several seconds on production; waiting 2 s reported it as silent when it was not.
  // Only events of a clip requested AFTER this click count: the previous clip's late
  // pause/ended events used to end the wait before the new clip had a chance to play.
  const settled = (log) => {
    const requested = new Set(log.filter((e) => e.ev === "play()").map((e) => e.src));
    return log.some((e) => requested.has(e.src) && (e.ev === "playing" || e.ev === "play-resolved" || (e.ev === "error" && e.err !== 1) || (e.ev === "play-rejected" && e.name !== "AbortError")))
      || log.some((e) => e.ev === "tts.speak" && (e.text || "").trim());
  };
  let log = [];
  for (let i = 0; i < 30; i++) {
    log = await H.audioLog(tab);
    if (settled(log)) break;
    await H.sleep(200);
  }
  // A control that produced nothing gets one retry on the SAME element (the first gesture
  // of a page is consumed by the mobile-audio unlock primer on some views).
  // No second click: pressing a player that is still loading toggles it OFF, aborts the clip
  // and makes the app fall back to browser TTS — the driver's own doing, not the product's.
  // Anything that is not clearly good or clearly broken is marked RETEST and re-checked in
  // isolation (fresh page, single press, long wait) by recheck-audio.cjs.
  if (!settled(log)) {
    for (let i = 0; i < 20; i++) {
      log = await H.audioLog(tab);
      if (settled(log)) break;
      await H.sleep(250);
    }
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const clips = H.summariseAudio(log);
  const tts = clips.__tts ? clips.__tts.filter((t) => t && t.trim()) : [];
  delete clips.__tts;
  const paths = Object.keys(clips);
  const unexpected = paths.filter((p) => !exp.clipPaths.has(p));
  const played = paths.filter((p) => clips[p].playing > 0 || clips[p].resolved > 0);
  const errored = paths.filter((p) => clips[p].error > 0 || clips[p].rejected > 0);
  const aborted = paths.filter((p) => clips[p].aborted > 0);
  // FAIL = unambiguous: a real media error, a clip of ANOTHER text, or TTS with no abort in
  // between. RETEST = silence or an abort that the driver's own pacing can cause.
  let status, note;
  if (errored.length) { status = "FAIL"; note = `clip error ${clips[errored[0]].errCode || clips[errored[0]].rejectName || ""}`.trim(); }
  else if (unexpected.length && !played.filter((p) => exp.clipPaths.has(p)).length) { status = "FAIL"; note = `clip not in this lesson's data: ${unexpected[0]}`; }
  else if (played.length) { status = "PASS"; note = ""; }
  else if (tts.length && !aborted.length) { status = "FAIL"; note = "browser TTS fallback (missing clip?)"; }
  else { status = "RETEST"; note = !paths.length && !tts.length ? "no audio request within 10 s" : aborted.length ? "clip aborted before playing" : "no playing event"; }
  out.push({
    control: label,
    status,
    clips: paths.map((p) => ({ path: p, ...clips[p], expected: exp.clipPaths.has(p) })),
    ttsFallback: tts.slice(0, 2),
    note,
  });
}

/**
 * 7단계 7-1 m (3차 점검): a LISTENING MAIN page also takes a TYPED answer ('⌨️ 직접 키보드 타이핑 모드'), graded by
 * typedDictationMatches — which 7-4 f G1 changed — and the browser had checked it on one page (d016). On the desktop pass,
 * answer sentence 1 by typing: the right sentence must be accepted and a wrong one refused. The verdict is read from the
 * view's own banners (the generic reader would take '✓ 정답 채점하기' — the button — for a '정답' verdict).
 */
/**
 * 2026-09-27 LISTENING 학습법 · 화면 고침 (F02 · D24 나): the LISTENING dictation is read by its data-* marks, not by its words —
 * the view [data-ld-view]; the line [data-dictation] (data-index · data-mode · data-blanks); the way of dictating
 * [data-mode=blanks|blocks|typing]; a blank row li[data-blank][data-token=<the word's place in the line>] with its [data-option]
 * buttons; the bank [data-word-bank] [data-tile]; the answer box [data-assembly] [data-placed]; the typing box textarea[data-typing];
 * the buttons [data-action=check · retry · reset-tiles · next · prev-line · next-line · play-line]; the verdict [data-feedback] =
 * correct · wrong · empty · shown. The words still come from the DATA (exp.tileWordsAll — generateWordBank's correctWords, the
 * words the view's blockTiles uses) and the judges are the app's (verifyAnyWordSequence · typedDictationMatches). The way of
 * dictating is remembered on the device (kig:ld:prefs), which this driver clears between pages.
 */
const LDD = {
  view: `Boolean(document.querySelector('main [data-ld-view]'))`,
  info: `(() => { const d = document.querySelector('main [data-ld-view] [data-dictation]'); return d ? { index: +d.dataset.index, mode: d.dataset.mode, blanks: +d.dataset.blanks } : null; })()`,
  action: (name) => `document.querySelector('main [data-ld-view] [data-action="${name}"]')`,
  mode: (m) => `document.querySelector('main [data-ld-view] [data-mode="${m}"]')`,
  feedback: `(() => { const f = document.querySelector('main [data-ld-view] [data-feedback]'); return f ? { kind: f.getAttribute('data-feedback'), text: (f.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90) } : null; })()`,
  box: `[...document.querySelectorAll('main [data-ld-view] [data-assembly] [data-placed]')].map((b) => (b.textContent || '').trim())`,
};
/** On LISTENING, a finished line shows '다시 풀기' instead of '정답 확인' — press it so the same line can be answered again. */
async function ldFreshAttempt(tab) {
  if (await tab.eval(`Boolean(${LDD.action("retry")})`).catch(() => false)) await H.click(tab, LDD.action("retry"), { settle: 350 });
}

/**
 * 7단계 7-1 m (3차 점검): a LISTENING MAIN page also takes a TYPED answer, graded by typedDictationMatches — which 7-4 f G1 changed.
 * On the desktop pass, answer the line on screen by typing: a wrong one must be refused, then the right sentence accepted (in that
 * order — a line answered right is finished and its box read-only). 2026-09-27: '쓰기' is chosen by [data-mode="typing"], the box
 * is textarea[data-typing] and the verdict [data-feedback] (it was the '⌨️ 직접 키보드 타이핑 모드' switch and banners).
 */
async function typedDictation(tab, exp, checks) {
  if (!(await tab.eval(LDD.view).catch(() => false))) return false;
  if (!(await tab.eval(`Boolean(${LDD.mode("typing")})`).catch(() => false))) return false; // not the dictation step
  await H.click(tab, LDD.mode("typing"), { settle: 400 });
  await ldFreshAttempt(tab);
  const info = await tab.eval(LDD.info).catch(() => null);
  const ans = info ? (exp.answers || [])[info.index] : null;
  if (!ans) return false;
  const field = `document.querySelector('main [data-ld-view] textarea[data-typing]')`;
  const trial = async (text) => {
    const ok = await H.type(tab, field, text);
    if (!ok) return { typed: false, feedback: null };
    await H.click(tab, LDD.action("check"), { settle: 600 });
    return { typed: true, feedback: await tab.eval(LDD.feedback).catch(() => null) };
  };
  const wrong = await trial("zzz qqq xxx");
  const right = await trial(ans.text);
  const kind = (r) => (r.feedback ? r.feedback.kind : null);
  const status = !right.typed || !wrong.typed ? "BLOCKED" : kind(right) === "correct" && kind(wrong) === "wrong" ? "PASS" : "FAIL";
  checks.push({ feature: "graded input", item: `typed dictation · 문장 ${info.index + 1}`, status, note: `correct→${right.feedback ? `${kind(right)} "${right.feedback.text}"` : right.typed ? "no feedback" : "field not typable"} | wrong→${wrong.feedback ? `${kind(wrong)} "${wrong.feedback.text}"` : wrong.typed ? "no feedback" : "field not typable"}`, expected: String(ans.text).slice(0, 80) });
  return true;
}

/**
 * LISTENING 블록 and 빈칸 on the line on screen (2026-09-27): the line assembled from the data must be right and reversed wrong
 * ('tile dictation', as before); every blank answered with the line's own word must be right and with another option wrong
 * ('blank dictation' — the default way since D24 나).
 */
async function solveLdTiles(tab, exp, checks, stepLabel) {
  if (!(await tab.eval(`Boolean(${LDD.mode("blocks")})`).catch(() => false))) return; // not the dictation step
  await H.click(tab, LDD.mode("blocks"), { settle: 450 });
  await ldFreshAttempt(tab);
  let info = await tab.eval(LDD.info).catch(() => null);
  if (!info) return;
  const words = (exp.tileWordsAll || [])[info.index];
  const target = String(((exp.answers || [])[info.index] || {}).text || "");
  if (!words || !words.length) { checks.push({ feature: "tile dictation", item: `${stepLabel} · (문장 못 고름)`, status: "BLOCKED", note: `문장 ${info.index + 1} 의 낱말이 기대값(tileWordsAll)에 없음` }); return; }
  const tapTile = (word) => H.click(tab, `(() => {
    const norm = (s) => String(s).replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
    const want = norm(${JSON.stringify(String(word))});
    return [...document.querySelectorAll('main [data-ld-view] [data-word-bank] [data-tile]')].find((b) => !b.disabled && norm(b.textContent || '') === want) || null;
  })()`, { settle: 120 });
  const assemble = async (list) => {
    if (await tab.eval(`Boolean(${LDD.action("reset-tiles")}) && !${LDD.action("reset-tiles")}.disabled`).catch(() => false)) await H.click(tab, LDD.action("reset-tiles"), { settle: 250 });
    let placed = 0;
    for (const w of list) if ((await tapTile(w)).ok) placed++;
    const box = (await tab.eval(LDD.box).catch(() => [])) || [];
    await H.click(tab, LDD.action("check"), { settle: 450 });
    return { placed, box, fb: await tab.eval(LDD.feedback).catch(() => null) };
  };
  await H.waitFor(tab, `document.querySelectorAll('main [data-ld-view] [data-word-bank] [data-tile]').length > 0`, 5000);
  const good = await assemble(words);
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  await ldFreshAttempt(tab);
  const reversed = [...words].reverse();
  const same = reversed.join(" ").toLowerCase() === words.join(" ").toLowerCase();
  const bad = same ? null : await assemble(reversed);
  const norm = (s) => String(s).replace(/[^\w'’-]/g, "").toLowerCase();
  const assembledRight = good.box.map(norm).join(" ") === words.map(norm).join(" ");
  checks.push({
    feature: "tile dictation", item: `${stepLabel} · "${target.slice(0, 40)}"`,
    status: good.placed !== words.length || !assembledRight || !good.fb ? "BLOCKED" : good.fb.kind === "correct" && (!bad || (bad.fb && bad.fb.kind === "wrong")) ? "PASS" : "FAIL",
    note: `${good.placed}/${words.length} tiles placed${assembledRight ? "" : ` · ASSEMBLED "${good.box.join(" ").slice(0, 80)}"`} · correct→${good.fb ? `${good.fb.kind} "${good.fb.text}"` : "no feedback"} · reversed→${bad ? (bad.fb ? `${bad.fb.kind} "${bad.fb.text}"` : "no feedback") : "(a one-word line)"}`,
  });
  // 빈칸 — the same line
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  await H.click(tab, LDD.mode("blanks"), { settle: 450 });
  await ldFreshAttempt(tab);
  info = await tab.eval(LDD.info).catch(() => null);
  if (!info || info.mode !== "blanks" || !info.blanks) return; // a line with no blank is dictated in blocks (checked above)
  const answerRows = async (pickRight) => tab.eval(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const words = ${JSON.stringify(words)};
    const norm = (s) => String(s).toLowerCase().replace(/\\u2019/g, "'").trim();
    let answered = 0;
    for (const row of document.querySelectorAll('main [data-ld-view] [data-blank-rows] > li[data-blank]')) {
      const want = norm(words[+row.dataset.token] || '');
      const opts = [...row.querySelectorAll('[data-option]')];
      const o = opts.find((b) => (norm(b.textContent) === want) === ${pickRight ? "true" : "false"});
      if (o) { o.click(); answered++; await sleep(40); }
    }
    return answered;
  })()`).catch(() => 0);
  const rightCount = await answerRows(true);
  await H.click(tab, LDD.action("check"), { settle: 450 });
  const blankGood = await tab.eval(LDD.feedback).catch(() => null);
  await ldFreshAttempt(tab);
  const wrongCount = await answerRows(false);
  await H.click(tab, LDD.action("check"), { settle: 450 });
  const blankBad = await tab.eval(LDD.feedback).catch(() => null);
  checks.push({
    feature: "blank dictation", item: `${stepLabel} · "${target.slice(0, 40)}"`,
    status: rightCount !== info.blanks || !blankGood ? "BLOCKED" : blankGood.kind === "correct" && blankBad && blankBad.kind === "wrong" ? "PASS" : "FAIL",
    note: `${info.blanks} blanks · right options ${rightCount} → ${blankGood ? `${blankGood.kind} "${blankGood.text}"` : "no feedback"} · wrong options ${wrongCount} → ${blankBad ? `${blankBad.kind} "${blankBad.text}"` : "no feedback"}`,
  });
}

async function gradedInputs(tab, exp, checks, maxFields = 12, course = null) {
  // LISTENING main page, desktop pass: test the typed answer once (7-1 m) — the NA line below is for the rest. 2026-09-27: before
  // the field count, because the default way of dictating (빈칸, D24 나) has no text field until '쓰기' is chosen.
  if (course === "ld" && exp.variant !== "script" && maxFields === 12 && !checks.some((c) => c.feature === "graded input" && /^typed dictation/.test(String(c.item)))) {
    if (await typedDictation(tab, exp, checks)) return;
  }
  const fields = (await tab.eval(FIELDS).catch(() => [])) || [];
  if (!fields.length) return;
  // LISTENING and STUDENT are answered by tapping word TILES, not by typing: typing into
  // whatever field is on screen would be a false failure. Their grading is covered by the
  // offline grader harness and by the tile routine.
  // 7단계 7-1 l · m: not 'could not check' (BLOCKED, 9/17 ~ 9/24) but 'not applicable here — another check covers it'. build-coverage
  // counts it covered only when this SAME record holds `coveredBy` as PASS; otherwise the lesson is BLOCKED 'NA 인데 대신 본 기록 없음'.
  if (exp.tileAnswers) { checks.push({ feature: "graded input", item: "tile dictation", status: "NA", coveredBy: "tile dictation", note: "tile-based answering — answered by tapping tiles, not typing; the tile routine (tile dictation) and grade-offline.cjs check it" }); return; }
  const answers = exp.answers;
  /**
   * 2026-09-28 (학습법-화면-0927 README 도구 할 일 ② — FAIL 44/4 since 9/21): GRAMMAR grades each sentence in its own row
   * (li[data-item]) and writes the verdict there — [data-verdict] exact · partial · incorrect (GrammarLearningView renderAnswerPanel).
   * The generic reader below took the first '정답 · 다시 · 틀렸 …' line anywhere in <main> — another row's verdict, '정답 문장 전체
   * 듣기', '모범 답안' — so a row was judged by other text. Here: Enter in the row's own box (its own grading — the generic check
   * button could be another row's) and the row's own verdict. The right answer FIRST: a test row takes one answer (typed after
   * it, the box keeps the first) — a wrong answer is then checked only where the row takes new text, and a row that keeps its
   * first answer is said so, not failed (check-grammar-exam covers the test's grading).
   */
  if (course === "grammar1" || course === "grammar2") {
    // only Step 1 '영작 훈련' grades a whole typed sentence per row on Enter. Step 2 '빈칸 완성' takes one word per blank
    // (check-grammar-cloze.cjs) and Step 4 '종합 평가' grades every row at once on '제출' (check-grammar-exam.cjs) — typing whole
    // sentences there was the rest of the FAIL 44/4. Said as NA, with the tool that checks them.
    const gStep = await tab.eval(`(() => { const v = document.querySelector('main [data-grammar-view]'); return v ? v.getAttribute('data-step') : null; })()`).catch(() => null);
    if (gStep !== "1") {
      checks.push({ feature: "graded input", item: `step ${gStep}`, status: "NA", note: `GRAMMAR Step ${gStep} does not grade a typed sentence per row — Step 2 (one word per blank) is checked by check-grammar-cloze.cjs, Step 4 (all rows on '제출') by check-grammar-exam.cjs; this tool checks Step 1` });
      return;
    }
    if (checks.some((c) => c.feature === "graded input" && /the row's own \[data-verdict\]/.test(String(c.note)))) return; // Step 1 rows were checked on this visit
    const WRONG = "zzz qqq xxx";
    const rowVerdict = (i) => tab.eval(`(() => { const f = ${FIELD_AT(i)}; const row = f && f.closest('[data-item]'); const v = row && row.querySelector('[data-verdict]'); return v ? { grade: v.getAttribute('data-verdict'), text: (v.textContent || '').replace(/\\s+/g, ' ').trim() } : null; })()`).catch(() => null);
    const fieldValue = (i) => tab.eval(`(() => { const f = ${FIELD_AT(i)}; return f ? f.value : null; })()`).catch(() => null);
    const limitG = Math.min(fields.length, maxFields);
    for (let i = 0; i < limitG; i++) {
      const ans = answers[i];
      if (!ans) break;
      const trial = async (text, kind) => {
        const ok = await H.type(tab, FIELD_AT(i), text);
        const value = ok ? await fieldValue(i) : null;
        if (!ok) return { kind, typed: false, took: false, v: await rowVerdict(i) };
        await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }).catch(() => {});
        await H.sleep(500);
        return { kind, typed: true, took: String(value || "").trim() === text.trim(), v: await rowVerdict(i) };
      };
      // --break=grammar-graded: the 'right' answer typed is the row's answer with its last word dropped — the row must then
      // FAIL (proves this check reads a real verdict)
      const typedRight = process.argv.includes("--break=grammar-graded") ? ans.text.replace(/\s*\S+\s*$/, "") : ans.text;
      const correct = await trial(typedRight, "correct");
      const wrong = await trial(WRONG, "wrong");
      const kept = !wrong.took; // the row kept its first answer (a test row)
      const say = (r) => (!r.typed ? "field not typable" : !r.took ? "the row kept its first answer" : r.v ? `${r.v.grade} "${r.v.text}"` : "no verdict in the row");
      checks.push({
        feature: "graded input", item: `#${ans.n ?? i + 1}`,
        status: correct.took && correct.v && correct.v.grade === "exact" && (kept || (wrong.v && wrong.v.grade !== "exact")) ? "PASS" : "FAIL",
        note: `correct→${say(correct)} | wrong→${say(wrong)} (the row's own [data-verdict])`,
        expected: ans.text.slice(0, 80),
      });
    }
    return;
  }
  const controls = withNth((await tab.eval(listControls("")).catch(() => [])) || []);
  const checkBtn = controls.find((c) => CHECK_RE.test(c.text + c.aria) && !SKIP_CLICK.test(c.text + c.aria));
  const feedback = async () => (await tab.eval(`(() => { const m = document.querySelector('main'); const t = (m ? m.innerText : ''); const hit = t.match(/[^\\n]{0,40}(정답|맞았|틀렸|오답|다시|correct|wrong)[^\\n]{0,40}/i); return hit ? hit[0].replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null));
  const limit = Math.min(fields.length, maxFields);
  for (let i = 0; i < limit; i++) {
    const ans = answers[i];
    if (!ans) break;
    const trial = async (text, kind) => {
      const ok = await H.type(tab, FIELD_AT(i), text);
      if (!ok) return { kind, status: "BLOCKED", note: "field not focusable" };
      if (checkBtn) await H.click(tab, CONTROL_BY(checkBtn.spec), { settle: 500 });
      else await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }).catch(() => {});
      await H.sleep(500);
      return { kind, text: text.slice(0, 60), feedback: await feedback() };
    };
    const correct = await trial(ans.text, "correct");
    const wrong = await trial("zzz qqq xxx", "wrong");
    const vs = [];
    for (const v of variants(ans.text)) vs.push(await trial(v.text, v.kind));
    const accepted = (r) => !!r.feedback && /정답|맞았|correct/i.test(r.feedback) && !/틀렸|오답|wrong/i.test(r.feedback);
    checks.push({
      feature: "graded input", item: `#${ans.n ?? i + 1}`,
      status: accepted(correct) ? (accepted(wrong) ? "FAIL" : "PASS") : "FAIL",
      note: `correct→${correct.feedback || "no feedback"} | wrong→${wrong.feedback || "no feedback"} | ${vs.map((v) => `${v.kind}→${accepted(v) ? "accepted" : "rejected"}`).join(", ")}`,
      expected: ans.text.slice(0, 80),
    });
  }
}

/** Give every control a stable spec: its label plus which occurrence of that label it is. */
function withNth(list) {
  const seen = {};
  return list.map((c) => {
    const key = `${c.text}|${c.aria}`;
    const nth = (seen[key] = (seen[key] ?? -1) + 1);
    return { ...c, spec: { text: c.text, aria: c.aria, nth } };
  });
}

/**
 * 2026-09-27 STUDENT 학습법 · 화면 고침 (D02 · D16 · STU-L03 · D18) — the STUDENT dictation is read by its data-* marks, not
 * by its words: [data-dictation] carries the sentence index, the part (a sentence of 16+ words is assembled in two parts,
 * D16), the part's word range and the word positions the app places itself (a personal blank such as "(school name)" is
 * no tile, STU-L03); the bank is [data-word-bank], the placed tiles are the buttons of the answer box's visible layer
 * ([data-assembly], title '…보관함으로 되돌리기'), the buttons are [data-action=check · reset · …] and the verdict is
 * [data-feedback] = part · correct · hinted · wrong · empty. The words still come from the DATA (exp.tileWordsAll —
 * generateWordBank's first form), and the app's judge is still verifyAnyWordSequence (check-student-dictation.cjs runs the
 * same parts over all 414 sentences without a browser).
 */
const STU = {
  info: `(() => { const d = document.querySelector('main [data-dictation]'); if (!d) return null; return { index: +d.dataset.index, part: +d.dataset.part, parts: +d.dataset.parts, start: +d.dataset.partStart, end: +d.dataset.partEnd, fixed: (d.dataset.fixedPositions || '').split(',').filter(Boolean).map(Number), solved: d.dataset.solved === 'true' }; })()`,
  action: (name) => `document.querySelector('main [data-action="${name}"]')`,
  feedback: `(() => { const f = document.querySelector('main [data-feedback]'); return f ? { kind: f.getAttribute('data-feedback'), text: (f.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 90) } : null; })()`,
  box: `[...document.querySelectorAll('main [data-assembly] > div:not([aria-hidden]) button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`,
};
// 회귀 점검 1002 (2026-10-04): a Korean word written in Hangul is a tile since 2026-10-02 ('신라' · '홍길동' — studentDictation TOKEN 가-힣);
// the old key kept only [\w'’-], so every Hangul tile read '' and the first Hangul tile in the bank stood for all of them.
const clickStudentTile = (tab, word) => H.click(tab, `(() => {
  const norm = (s) => s.replace(/[^\\w'\\u2019\\uac00-\\ud7a3-]/g, '').toLowerCase();
  const want = norm(${JSON.stringify(String(word || ""))});
  return [...document.querySelectorAll('main [data-word-bank] button')].find((b) => !b.disabled && norm(b.innerText || '') === want) || null;
})()`, { settle: 180 });

/** Assemble the sentence the view is on, part by part (the first part only when `reversed` — wrecked on purpose). */
async function assembleStudent(tab, words, { reversed = false } = {}) {
  let placed = 0, needed = 0, last = null;
  const verdicts = [];
  for (let guard = 0; guard < 3; guard++) {
    const info = await tab.eval(STU.info).catch(() => null);
    if (!info) break;
    const want = [];
    for (let pos = info.start; pos < info.end; pos++) if (!info.fixed.includes(pos)) want.push(words[pos]);
    const list = reversed ? want.slice().reverse() : want;
    needed += list.length;
    for (const w of list) if ((await clickStudentTile(tab, w)).ok) placed++;
    const box = (await tab.eval(STU.box).catch(() => [])) || [];
    if (box.length !== list.length) break; // a tile that did not land — reported as BLOCKED by the caller (placed < needed)
    await H.click(tab, STU.action("check"), { settle: 450 });
    last = await tab.eval(STU.feedback).catch(() => null);
    verdicts.push(last ? last.kind : "none");
    if (reversed || !last || last.kind !== "part") break;
  }
  return { placed, needed, verdicts, last };
}

async function solveStudentTiles(tab, exp, checks, stepLabel, depth = "full") {
  const info = await tab.eval(STU.info).catch(() => null);
  if (!info) return;
  const one = async (index) => {
    await H.click(tab, STU.action("reset"), { settle: 400 }); // this sentence from its first part
    const words = (exp.tileWordsAll || [])[index];
    const tag = (words || []).some((x) => /[가-힣]/.test(x)) ? " · 한글 조각" : "";
    const target = String(((exp.answers || [])[index] || {}).text || "");
    if (!words || !words.length) { checks.push({ feature: "tile dictation", item: `${stepLabel} · (문장 못 고름)${tag}`, status: "BLOCKED", note: `문장 ${index + 1} 의 낱말이 기대값(tileWordsAll)에 없음` }); return; }
    await H.waitFor(tab, `document.querySelectorAll('main [data-word-bank] button').length > 0`, 5000);
    const good = await assembleStudent(tab, words);
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    await H.click(tab, STU.action("reset"), { settle: 400 });
    const bad = await assembleStudent(tab, words, { reversed: true });
    const accepted = !!good.last && good.last.kind === "correct";
    const refused = !!bad.last && bad.last.kind === "wrong";
    checks.push({
      feature: "tile dictation", item: `${stepLabel} · "${target.slice(0, 40)}"${tag}`,
      status: good.placed !== good.needed || !good.last || !bad.last ? "BLOCKED" : accepted && refused ? "PASS" : "FAIL",
      note: `${good.placed}/${good.needed} tiles placed in ${good.verdicts.length} part(s) · correct→${good.verdicts.join(" > ")} "${good.last ? good.last.text : "no feedback"}" · reversed part 1→${bad.last ? `${bad.last.kind} "${bad.last.text}"` : "no feedback"}${tag ? ` · tiles ${words.join(" ")}`.slice(0, 160) : ""}`,
    });
  };
  await one(info.index);
  // 회귀 점검 1002 (2026-10-04): a sentence with a Hangul word ('The 신라 Kingdom …' — a tile since 2026-10-02) — on the full depth
  // (desktop) that sentence is assembled too, from the data, when the sentence on screen has none: its tiles must be in the bank,
  // in the answer and the right order accepted (STUDENT 48 · ADULT 45 sentences)
  if (depth !== "full") return;
  const hangul = (exp.tileWordsAll || []).findIndex((w) => (w || []).some((x) => /[가-힣]/.test(x)));
  if (hangul < 0 || hangul === info.index) return;
  const opened = await H.click(tab, `document.querySelector('main [data-pill="${hangul}"]')`, { settle: 500 });
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const now = await tab.eval(STU.info).catch(() => null);
  if (!opened.ok || !now || now.index !== hangul) { checks.push({ feature: "tile dictation", item: `${stepLabel} · (한글 조각 문장 못 엶)`, status: "BLOCKED", note: `문장 ${hangul + 1} 번호 단추 ${opened.ok ? "눌렀으나 그 문장이 아님" : `못 누름: ${opened.reason}`}` }); return; }
  await one(hangul);
}

/**
 * D18 (2026-09-27): a STUDENT lesson completes when 80% of its sentences were dictated (hints for at most a third of the
 * words) and 80% spoken (microphone ≥ 70 or '읽었어요'). Practise like a learner — every sentence of Step 2 assembled from
 * the data, every '읽었어요' of Step 3 pressed — and say what was practised.
 */
// 회귀 점검 1002: which tab holds the dictation and the shadowing — STUDENT 2 · 3, ADULT 4 · 5 (1 블라인드 리스닝 · 2 단어 · 3 끊어 읽기 ·
// 4 탭 딕테이션 · 5 섀도잉 & 낭독, StudentLearningView ADULT_STEPS)
const STUDENT_TABS = { student: { dictation: 2, shadowing: 3 }, adult: { dictation: 4, shadowing: 5 } };
const isStudentView = (course) => Object.prototype.hasOwnProperty.call(STUDENT_TABS, course);

async function practiseStudent(tab, exp, course = "student") {
  const all = exp.tileWordsAll || [];
  const T = STUDENT_TABS[course] || STUDENT_TABS.student;
  let solved = 0;
  await H.click(tab, `document.querySelector('main [data-step-tab="${T.dictation}"]')`, { settle: 800 });
  for (let i = 0; i < all.length; i++) {
    await H.click(tab, `document.querySelector('main [data-pill="${i}"]')`, { settle: 400 });
    const r = await assembleStudent(tab, all[i]);
    if (r.last && r.last.kind === "correct") solved++;
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  await H.click(tab, `document.querySelector('main [data-step-tab="${T.shadowing}"]')`, { settle: 800 });
  for (let k = 0; k < 40; k++) if (!(await H.click(tab, `document.querySelector('main [data-action="said"][aria-pressed="false"]')`, { settle: 150 })).ok) break;
  const said = await tab.eval(`document.querySelectorAll('main [data-action="said"][aria-pressed="true"]').length`).catch(() => 0);
  return `practised: dictation ${solved}/${all.length} · spoken ${said}/${all.length}`;
}

/**
 * 회귀 점검 1002 단계 0 (2026-10-04) — ADULT (2026-10-02 · docs/adult/README.md '5단계'): StudentLearningView with five steps,
 *   1 블라인드 리스닝 · 2 단어 (src/components/AdultWordsStep.tsx) · 3 끊어 읽기 (renderChunks) · 4 탭 딕테이션 · 5 섀도잉 & 낭독.
 * Steps 1 · 4 · 5 are STUDENT's 1 · 2 · 3 and go through the same routines (student-cards · solveStudentTiles · the completion test).
 * Steps 2 · 3 have their own routines below. A step the driver does not know — a sixth tab, a renamed one, a panel that is not where
 * its number says — is written BLOCKED for that visit (never a silent PASS): ADULT_KNOWN names the steps and the routine each needs.
 * Every check is read from the view's data-* marks; the right answers come from the lesson data (lib/expectations.cjs adultData).
 */
const ADULT_PANEL = `(() => { const p = document.querySelector('main [data-student-view] [data-step-panel]'); return p ? { n: p.getAttribute('data-step-panel'), name: (p.getAttribute('aria-label') || '').trim() } : null; })()`;
const ADULT_KNOWN = { "블라인드 리스닝": "listen", "단어": "words", "끊어 읽기": "chunk", "탭 딕테이션": "dictation", "섀도잉 & 낭독": "shadowing" };
// 깨기 (회귀 점검 1002): --break=forget-chunk — the driver as if it did not know '끊어 읽기' (a step added after the driver was written):
// that tab must come out BLOCKED (모르는 단계) and the lesson BLOCKED in build-coverage, never a quiet PASS
if (process.argv.includes("--break=forget-chunk")) delete ADULT_KNOWN["끊어 읽기"];
const tx = (s) => String(s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const tabText = (n) => `(() => { const b = document.querySelector('main [data-step-tab="${n}"]'); return b ? (b.innerText || '').replace(/\\s+/g, ' ').trim() : null; })()`;

/** Step 2 '단어': the cards (count · '뜻 보기' → the meaning of THAT card · 몰라요 · 알아요 folds), the word's speaker, five blanks. */
async function adultWords(tab, exp, rec, stepLabel) {
  const A = exp.adult;
  const P = `main [data-step-panel="2"]`;
  const checks = rec.checks;
  const push = (item, status, note) => checks.push({ feature: "adult words", item: `${stepLabel} · ${item}`, status, note });
  const has = await H.waitFor(tab, `document.querySelectorAll('${P} li[data-vocab]').length > 0`, 4000);
  if (!A.words.length) { push("카드", has ? "FAIL" : "PASS", has ? "데이터에 낱말이 없는데 카드가 있음" : "낱말 없는 강의 — 안내문"); return true; }
  if (!has) { push("카드", "BLOCKED", "단어 단계에 카드(li[data-vocab])가 없음 — 화면이 바뀌었으면 이 드라이버를 고쳐야 함"); return false; }
  const count = await tab.eval(`document.querySelectorAll('${P} li[data-vocab]').length`).catch(() => 0);
  push("카드 수", count === A.words.length ? "PASS" : "FAIL", `카드 ${count} · 데이터 ${A.words.length}`);
  const card = (o) => `document.querySelector('${P} li[data-vocab="${o}"]')`;
  const read = (o) => tab.eval(`(() => { const li = ${card(o)}; if (!li) return null; const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : null; const w = li.querySelector('[data-word-text]'); return { word: t(w), pos: t(w && w.nextElementSibling), meaning: t(li.querySelector('[data-meaning]')), mark: li.getAttribute('data-mark'), folded: !!li.querySelector('[data-action="unfold"]'), pressed: [...li.querySelectorAll('[aria-pressed="true"]')].map((b) => b.getAttribute('data-action')) }; })()`).catch(() => null);
  // '뜻 보기' on card 0 → its own meaning; then 몰라요
  const w0 = A.words[0];
  const before = await read(0);
  await H.click(tab, `${card(0)} && ${card(0)}.querySelector('[data-action="reveal"]')`, { settle: 300 });
  const shown = await read(0);
  await H.click(tab, `${card(0)} && ${card(0)}.querySelector('[data-action="unknown"]')`, { settle: 250 });
  const unknown = await read(0);
  push("뜻 보기 · 몰라요", before && !before.meaning && shown && tx(shown.meaning) === tx(w0.meaning) && tx(shown.word) === tx(w0.word) && tx(shown.pos) === tx(w0.pos) && unknown && unknown.mark === "unknown" ? "PASS" : "FAIL",
    `카드 1 '${w0.word}' — 누르기 전 뜻 ${before && before.meaning ? "보임(가려져 있어야)" : "가림"} · 누른 뒤 '${shown ? shown.meaning : "?"}' (데이터 '${w0.meaning}') · 품사 '${shown ? shown.pos : "?"}' · 몰라요 → data-mark ${unknown ? unknown.mark : "?"}`);
  // 알아요 on card 1 folds it
  if (A.words.length > 1) {
    await H.click(tab, `${card(1)} && ${card(1)}.querySelector('[data-action="reveal"]')`, { settle: 300 });
    await H.click(tab, `${card(1)} && ${card(1)}.querySelector('[data-action="known"]')`, { settle: 300 });
    const known = await read(1);
    const summary = await tab.eval(`(() => { const s = document.querySelector('${P} [data-vocab-summary]'); return s ? s.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
    push("알아요 · 접힘 · 요약", known && known.mark === "known" && known.folded && /알아요 1 · 몰라요 1/.test(summary || "") ? "PASS" : "FAIL", `카드 2 → data-mark ${known ? known.mark : "?"} · 접힘 ${known ? known.folded : "?"} · 요약 '${summary}'`);
  }
  // the word's speaker says THIS word (its `say` clip)
  const n0 = rec.audio.length;
  await pressAudio(tab, `${card(0)} && ${card(0)}.querySelector('[data-action="word-audio"]')`, `${stepLabel} · 낱말 소리 '${w0.word}'`, exp, rec.audio);
  const a0 = rec.audio[n0];
  if (a0) push("낱말 소리 = 그 낱말", a0.status === "PASS" && (a0.clips || []).some((c) => c.path === w0.sayPath) ? "PASS" : a0.status === "RETEST" ? "BLOCKED" : "FAIL", `요청 ${(a0.clips || []).map((c) => c.path).join(", ") || "없음"} · 기대 ${w0.sayPath} · ${a0.status}${a0.note ? ` ${a0.note}` : ""}`);
  // the blanks: the set starts with the word marked 몰라요 (card 0); answer each from the data — the second one wrong on purpose
  const cloze = `(() => { const c = document.querySelector('${P} [data-cloze]'); if (!c) return null; const t = (el) => el ? (el.textContent || '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim() : null; const f = c.querySelector('[data-cloze-feedback]'); return { order: +c.getAttribute('data-order'), masked: t(c.querySelector('[data-masked]')), options: [...c.querySelectorAll('[data-option]')].map((b) => t(b)), feedback: f ? f.getAttribute('data-cloze-feedback') : null, ko: t(c.querySelector('[data-cloze-ko]')), filled: t(c.querySelector('[data-filled]')) }; })()`;
  await H.waitFor(tab, `Boolean(document.querySelector('${P} [data-cloze]'))`, 3000);
  const setSize = Math.min(5, A.words.length);
  const rows = [];
  let firstOrder = null, listened = false;
  for (let q = 0; q < setSize; q++) {
    const c = await tab.eval(cloze).catch(() => null);
    if (!c) break;
    if (q === 0) firstOrder = c.order;
    const w = A.words[c.order];
    if (!w) { rows.push({ q, why: `data-order ${c.order} 가 데이터에 없음` }); break; }
    const wantWrong = q === 1;
    const pick = wantWrong ? c.options.find((o) => o !== tx(w.answer)) : c.options.find((o) => o === tx(w.answer));
    const at = c.options.indexOf(pick);
    if (at < 0) { rows.push({ q, order: c.order, why: `보기에 ${wantWrong ? "틀린 것" : `정답 '${w.answer}'`} 없음 (${c.options.join(" / ")})` }); break; }
    await H.click(tab, `document.querySelector('${P} [data-cloze] [data-option="${at}"]')`, { settle: 300 });
    const after = await tab.eval(cloze).catch(() => null);
    rows.push({ q, order: c.order, wantWrong, got: after && after.feedback, maskedOk: tx(c.masked) === tx(w.masked), koOk: !A.ko[w.sentence] || tx(after && after.ko) === tx(A.ko[w.sentence]), filledOk: tx(after && after.filled) === tx(A.sentences[w.sentence]), options: c.options.length });
    if (!listened && after && after.feedback) {
      listened = true;
      await pressAudio(tab, `document.querySelector('${P} [data-cloze] [data-action="cloze-listen"]')`, `${stepLabel} · 빈칸 문장 듣기`, exp, rec.audio);
    }
    await H.click(tab, `document.querySelector('${P} [data-cloze] [data-action="cloze-next"]')`, { settle: 300 });
  }
  const result = await tab.eval(`(() => { const r = document.querySelector('${P} [data-cloze-result]'); return r ? r.innerText.replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
  const right = rows.filter((r) => r.got && !r.wantWrong).length;
  const rowsOk = rows.length === setSize && rows.every((r) => !r.why && r.got === (r.wantWrong ? "wrong" : "correct") && r.maskedOk && r.koOk && r.filledOk && r.options === 4);
  const resultOk = result && new RegExp(`${right} / ${setSize} 맞힘`).test(result);
  const tabNow = await tab.eval(tabText(2)).catch(() => null);
  const tabOk = new RegExp(`\\b${right}/${A.words.length}\\b`).test(tabNow || "");
  await H.click(tab, `document.querySelector('${P} [data-action="cloze-again"]')`, { settle: 400 });
  const again = await tab.eval(cloze).catch(() => null);
  push("빈칸 채우기", rows.some((r) => r.why) || rows.length < setSize ? "BLOCKED" : rowsOk && resultOk && firstOrder === 0 && again && !again.feedback && tabOk ? "PASS" : "FAIL",
    `${rows.length}/${setSize} 문제 · 첫 문제 ${firstOrder === 0 ? "몰라요 낱말" : `data-order ${firstOrder}(몰라요 낱말 0 이어야)`} · ${rows.map((r) => r.why ? `#${r.q + 1} ${r.why}` : `#${r.q + 1} ${r.wantWrong ? "틀린 보기" : "정답"}→${r.got}${r.maskedOk ? "" : " 빈칸문장≠"}${r.koOk ? "" : " 한국어≠"}${r.filledOk ? "" : " 채운문장≠"}${r.options === 4 ? "" : ` 보기${r.options}`}`).join(" · ")} · 결과 '${result}' · 탭 '${tabNow}' · 다시 풀기 → ${again ? `새 문제(data-order ${again.order})` : "없음"}`);
  return true;
}

/** Step 3 '끊어 읽기': sentence 1 — meanings hidden first, a chunk's own sound, its own meaning, every meaning → 문장 전체 해석, 끊어 듣기 · 문장 듣기. */
async function adultChunks(tab, exp, rec, stepLabel) {
  const A = exp.adult;
  const P = `main [data-step-panel="3"]`;
  const push = (item, status, note) => rec.checks.push({ feature: "adult chunks", item: `${stepLabel} · ${item}`, status, note });
  if (!(await H.waitFor(tab, `Boolean(document.querySelector('${P} [data-chunk-sentence]'))`, 4000))) { push("문장", "BLOCKED", "끊어 읽기 단계에 [data-chunk-sentence] 가 없음 — 화면이 바뀌었으면 이 드라이버를 고쳐야 함"); return false; }
  // the reader (lib/containers adult-chunks) went through every sentence and opened every meaning; back to sentence 1, meanings shut
  await H.click(tab, `document.querySelector('${P} [data-pill="0"]')`, { settle: 300 });
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  if (await tab.eval(`(() => { const b = document.querySelector('${P} [data-action="all-meanings"]'); return !!b && b.getAttribute('aria-pressed') === 'true'; })()`).catch(() => false)) await H.click(tab, `document.querySelector('${P} [data-action="all-meanings"]')`, { settle: 250 });
  const state = `(() => { const s = document.querySelector('${P} [data-chunk-sentence]'); if (!s) return null; const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : null; return { idx: +s.getAttribute('data-chunk-sentence'), chunks: [...s.querySelectorAll('li[data-chunk]')].map((li) => ({ en: t(li.querySelector('[data-en]')), ko: t(li.querySelector('[data-ko]')), closed: !!li.querySelector('[data-reveal="open"]') })), whole: (() => { const w = s.querySelector('[data-chunk-whole]'); return w ? t(w.lastElementChild) : null; })() }; })()`;
  const s0 = await tab.eval(state).catch(() => null);
  const want = A.chunks[0] || [];
  if (!s0 || s0.idx !== 0) { push("문장 1", "BLOCKED", `1번 문장으로 못 돌아감 (${s0 ? `data-chunk-sentence ${s0.idx}` : "없음"})`); return false; }
  push("덩어리 · 뜻 가림", s0.chunks.length === want.length && s0.chunks.every((c, k) => tx(c.en) === tx(want[k].en) && c.closed && !c.ko) && !s0.whole ? "PASS" : "FAIL",
    `덩어리 ${s0.chunks.length} · 데이터 ${want.length} · 영어 ${s0.chunks.every((c, k) => want[k] && tx(c.en) === tx(want[k].en)) ? "같음" : "다름"} · 뜻 가림 ${s0.chunks.filter((c) => c.closed && !c.ko).length}/${s0.chunks.length} · 전체 해석 ${s0.whole ? "보임(가려져 있어야)" : "가림"}`);
  // chunk 1's own sound
  const n0 = rec.audio.length;
  await pressAudio(tab, `document.querySelector('${P} [data-chunk-sentence] li[data-chunk="0"] button')`, `${stepLabel} · 덩어리 소리 1`, exp, rec.audio);
  const a0 = rec.audio[n0];
  if (a0 && want[0]) push("덩어리 소리 = 그 덩어리", a0.status === "PASS" && (a0.clips || []).some((c) => c.path === want[0].path) ? "PASS" : a0.status === "RETEST" ? "BLOCKED" : "FAIL", `요청 ${(a0.clips || []).map((c) => c.path).join(", ") || "없음"} · 기대 ${want[0].path} · ${a0.status}${a0.note ? ` ${a0.note}` : ""}`);
  // chunk 1's own meaning, then every meaning → the whole line, and the tab's count
  await H.click(tab, `document.querySelector('${P} [data-chunk-sentence] li[data-chunk="0"] [data-reveal="open"]')`, { settle: 250 });
  const s1 = await tab.eval(state).catch(() => null);
  const firstOk = s1 && s1.chunks[0] && tx(s1.chunks[0].ko) === tx(want[0] && want[0].ko) && s1.chunks.slice(1).every((c) => c.closed);
  const tabBefore = await tab.eval(tabText(3)).catch(() => null);
  if (want.length > 1) await H.click(tab, `document.querySelector('${P} [data-action="all-meanings"]')`, { settle: 300 });
  const s2 = await tab.eval(state).catch(() => null);
  const tabAfter = await tab.eval(tabText(3)).catch(() => null);
  const allOk = s2 && s2.chunks.length === want.length && s2.chunks.every((c, k) => tx(c.ko) === tx(want[k].ko));
  const wholeOk = !A.ko[0] || (s2 && tx(s2.whole) === tx(A.ko[0]));
  push("뜻 보기 · 문장 전체 해석", firstOk && allOk && wholeOk && /\b[1-9]\d*\//.test(tabAfter || "") ? "PASS" : "FAIL",
    `덩어리 1 뜻 '${s1 && s1.chunks[0] ? s1.chunks[0].ko : "?"}' (데이터 '${want[0] ? want[0].ko : ""}')${firstOk ? "" : " ≠ 또는 다른 덩어리도 열림"} · 모두 열기 → 뜻 ${allOk ? "모두 같음" : "다름"} · 전체 해석 '${s2 ? s2.whole : "?"}'${wholeOk ? "" : ` ≠ '${A.ko[0]}'`} · 탭 '${tabBefore}' → '${tabAfter}'`);
  // 끊어 듣기 (the chunks in turn) · 문장 듣기 (the sentence)
  const n1 = rec.audio.length;
  await pressAudio(tab, `document.querySelector('${P} [data-action="chunk-run"]')`, `${stepLabel} · 끊어 듣기`, exp, rec.audio);
  const a1 = rec.audio[n1];
  if (a1 && want[0]) push("끊어 듣기 = 첫 덩어리부터", a1.status === "PASS" && (a1.clips || []).some((c) => c.path === want[0].path) ? "PASS" : a1.status === "RETEST" ? "BLOCKED" : "FAIL", `요청 ${(a1.clips || []).map((c) => c.path).join(", ") || "없음"} · 기대 ${want[0].path} 부터 · ${a1.status}`);
  const n2 = rec.audio.length;
  await pressAudio(tab, `document.querySelector('${P} [data-action="sentence"]')`, `${stepLabel} · 문장 듣기`, exp, rec.audio);
  const a2 = rec.audio[n2];
  if (a2) push("문장 듣기 = 그 문장", a2.status === "PASS" && (a2.clips || []).some((c) => c.path === A.sentencePaths[0]) ? "PASS" : a2.status === "RETEST" ? "BLOCKED" : "FAIL", `요청 ${(a2.clips || []).map((c) => c.path).join(", ") || "없음"} · 기대 ${A.sentencePaths[0]} · ${a2.status}`);
  return true;
}

/**
 * depth: "full" (desktop — every control), "medium" (mobile — one control of each kind,
 * so touch layout and touch input are really exercised) or "light" (tablet — layout only).
 */
/**
 * LISTENING / STUDENT dictation: the answer is built by tapping word tiles. Build the
 * sentence from the DATA, press the check button, then wreck the order and press it again.
 */
async function solveTiles(tab, exp, checks, stepLabel, depth = "full") {
  // 2026-09-27: the reworked views have their own routines (above) — LISTENING (its view also marks [data-dictation]) first,
  // then STUDENT; the text-based routine below is kept for an old build
  if (await tab.eval(LDD.view).catch(() => false)) return solveLdTiles(tab, exp, checks, stepLabel);
  if (await tab.eval(`Boolean(document.querySelector('main [data-dictation]'))`).catch(() => false)) return solveStudentTiles(tab, exp, checks, stepLabel, depth);
  const target = (exp.answers[0] || {}).text;
  if (!target && !exp.tileWordsAll) return;
  // 7단계 7-1 b: is this the dictation step at all? The bank carries its own label (STUDENT "단어 보관함",
  // LISTENING "단어 블록 뱅크"). On that step, start from a clean box BEFORE choosing the sentence — s14-1 had a
  // tile already sitting in the answer box, so no sentence "fit" the bank and the routine returned without a
  // word: no PASS, no BLOCKED, the lesson simply had no dictation result.
  // 7단계 7-1 m: LISTENING can be switched to typing ('⌨️ 직접 키보드 타이핑 모드'), and this driver's own every-control loop presses
  // that switch on the initial screen — so on every LISTENING MAIN page the dictation step was in typing mode when this ran: no bank,
  // nothing assembled, nothing recorded (276 main pages, desktop: never one tile dictation record). Switch back to the tiles first.
  const toTiles = `[...document.querySelectorAll('main button')].find((b) => /블록 탭 모드로 전환/.test((b.innerText || '').replace(/\\s+/g, ' ')))`;
  if (await tab.eval(`Boolean(${toTiles})`).catch(() => false)) await H.click(tab, toTiles, { settle: 500 });
  const hasBank = await tab.eval(`/단어 보관함|단어 블록 뱅크/.test((document.querySelector('main') || document.body).innerText || '')`).catch(() => false);
  if (hasBank) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /초기화|다시 풀기|리셋/.test((b.innerText || '').replace(/\\s+/g, ' ')))`, { settle: 500 });
  // Which sentence is the drill actually on? Controls pressed earlier in this step can advance it,
  // so ask the page: take the sentence whose tiles are ALL sitting in the bank right now. Assuming
  // the first sentence left STUDENT assembling two stray words out of six.
  const candidates = exp.tileWordsAll && exp.tileWordsAll.length
    ? exp.tileWordsAll
    : [String(target).replace(/[^\w'\u2019\s-]/g, " ").split(/\s+/).filter(Boolean)];
  const blockedNoFit = (why) => { if (hasBank) checks.push({ feature: "tile dictation", item: `${stepLabel} · (문장 못 고름)`, status: "BLOCKED", note: why }); };
  const pick = await tab.eval(`(() => {
    const vis = ${VIS};
    const main = document.querySelector('main') || document.body;
    const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
    const placed = (b) => /\u2715|\u2716/.test(b.innerText || '') || /\ub418\ub3cc\ub9ac|\ubcf4\uad00\ud568\uc73c\ub85c/.test(b.getAttribute('title') || '');
    const have = [...main.querySelectorAll('button')].filter(vis).filter((b) => !placed(b)).map((b) => norm(b.innerText || ''));
    const sets = ${JSON.stringify(candidates)};
    for (let i = 0; i < sets.length; i++) {
      const need = {};
      for (const w of sets[i]) need[norm(w)] = (need[norm(w)] || 0) + 1;
      const pool = have.slice();
      let fits = true;
      for (const [k, n] of Object.entries(need)) { let c = 0; for (const h of pool) if (h === k) c++; if (c < n) { fits = false; break; } }
      if (fits) return i;
    }
    return -1;
  })()`).catch(() => -1);
  if (pick < 0) return blockedNoFit("보관함은 있는데 어느 문장의 타일도 보관함에 다 있지 않음(초기화 뒤)"); // not a dictation step → nothing recorded
  const words = candidates[pick];
  // 7단계 7-1 b: the ceiling was 25 (9/18, no reason written down) — it silently skipped STUDENT s14-1 #2 (27 words) and would skip
  // 8 STUDENT sentences (up to 29) and 236 LISTENING rows (up to 58, d237 #4). 60 covers every sentence the app builds a bank for.
  if (words.length < 2 || words.length > 60) return blockedNoFit(`고른 문장의 낱말 ${words.length}개 — 2~60 밖이라 조립하지 않음`);
  const tiles = await tab.eval(`(() => {
    const vis = ${VIS};
    const main = document.querySelector('main') || document.body;
    return [...main.querySelectorAll('button')].filter(vis)
      .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())
      .filter((t) => t && t.length <= 25 && !/\\s/.test(t) && !/[가-힣]/.test(t) && !/^[\\p{Emoji}\\p{P}]+$/u.test(t)).length;
  })()`).catch(() => 0);
  if (!tiles || tiles < words.length) return blockedNoFit(`보관함 타일 ${tiles} < 문장 낱말 ${words.length}`); // not the dictation step (or not enough tiles)
  // Only ever tap a tile that is still in the WORD BANK. A tile already placed in the assembled
  // sentence is also a button carrying the same word, and tapping it REMOVES that word
  // (LdLearningView handleRemoveTile / StudentLearningView handleRemoveTile). Picking those up
  // made the audit assemble a different sentence from the one it thought it was assembling, and
  // then report the app as marking a correct answer wrong. Both views mark a placed tile with a
  // ✕, and LISTENING also gives it title="클릭하여 되돌리기".
  /**
   * 7단계 7-1 b — a tile is chosen by its PLACE in the word bank, not by its text alone.
   * STUDENT's bank does not remove a tapped tile: it stays where it was, `disabled` and faded
   * (StudentLearningView — `disabled={isSelected}`). The old rule, "the LAST visible button with
   * this text", therefore picked the already-used tile on a word the sentence needs twice; the
   * tap did nothing, the top-up tapped the same dead tile again, and the lesson ended BLOCKED
   * (9/18: STUDENT tile dictation BLOCKED 69 of 82). LISTENING removes a tapped tile from its
   * bank (LdLearningView handleSelectTile), so there both rules agree.
   * Now: list the bank's tiles in screen order, skip every tile that is already used (disabled /
   * aria-disabled) or sits in the answer box (✕ · "되돌리기"), and tap the FIRST place that
   * holds the word. The answer box is excluded by that marker, so first vs last no longer matters.
   */
  const clickTile = async (word) => H.click(tab, `(() => {
    const vis = ${VIS};
    const main = document.querySelector('main') || document.body;
    const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
    const want = ${JSON.stringify(word)};
    const placed = (b) => /✕|✖/.test(b.innerText || '') || /되돌리|보관함으로/.test(b.getAttribute('title') || '');
    const used = (b) => b.disabled || b.getAttribute('aria-disabled') === 'true';
    const bank = [...main.querySelectorAll('button')].filter(vis).filter((b) => !placed(b));
    const place = bank.findIndex((b) => !used(b) && norm(b.innerText || '') === norm(want));
    return place >= 0 ? bank[place] : null;
  })()`, { settle: 250 });
  // Match the verdict BANNERS the two views actually render, not loose keywords: "다시" alone also
  // occurs in the Korean translation printed on the same page, which made a correct answer read
  // as a wrong one.
  const feedback = async () => (await tab.eval(`(() => {
    const m = document.querySelector('main'); const t = (m ? m.innerText : '');
    const hit = t.match(/[^\\n]{0,60}(정답입니다|훌륭한 청취력|정확히 청취|순서가 조금 다릅니다|다시 시도|오답|일치하지 않습니다)[^\\n]{0,60}/);
    return hit ? hit[0].replace(/\\s+/g, ' ').trim() : null;
  })()`).catch(() => null));
  const press = async (re) => H.click(tab, `[...document.querySelectorAll('main button')].find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ')))`, { settle: 500 });
  // start from a clean slate: earlier control clicks in this lesson may have left words in the answer box
  await press(/초기화|다시 풀기|리셋/);
  // The word bank is rendered by React a moment after the step opens; tapping into a list that is
  // still mounting dropped most of the taps (STUDENT came back with 0 of 6 placed, while the same
  // taps with a longer pause placed all six).
  for (let i = 0; i < 20; i++) {
    const ready = await tab.eval(`(() => {
      const vis = ${VIS};
      const main = document.querySelector('main') || document.body;
      const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
      const placed = (b) => /✕|✖/.test(b.innerText || '') || /되돌리|보관함으로/.test(b.getAttribute('title') || '');
      const have = [...main.querySelectorAll('button')].filter(vis).filter((b) => !placed(b)).map((b) => norm(b.innerText || ''));
      return ${JSON.stringify(words.map((w) => w))}.every((w) => have.includes(norm(w)));
    })()`).catch(() => false);
    if (ready) break;
    await H.sleep(250);
  }
  let placed = 0;
  for (const w of words) { const r = await clickTile(w); if (r.ok) placed++; }
  // Check what actually landed and top up what is missing, rather than trusting the taps. A word
  // the sentence uses twice sometimes ends up in the box once, and retrying by result is simpler
  // and safer than reasoning about which button was which.
  const readBox = () => tab.eval(`(() => {
    const main = document.querySelector('main') || document.body;
    return [...main.querySelectorAll('button')]
      .filter((b) => /\\u2715|\\u2716/.test(b.innerText || '') || /\\ub418\\ub3cc\\ub9ac|\\ubcf4\\uad00\\ud568\\uc73c\\ub85c/.test(b.getAttribute('title') || ''))
      .map((b) => (b.innerText || '').replace(/[\\u2715\\u2716]/g, '').replace(/\\s+/g, ' ').trim()).filter(Boolean);
  })()`).catch(() => []);
  for (let attempt = 0; attempt < 3; attempt++) {
    const box = (await readBox()) || [];
    const key = (s) => String(s).replace(/[^\w'’-]/g, "").toLowerCase();
    const have = box.map(key);
    const missing = [];
    const seen = {};
    for (const w of words) { const k = key(w); seen[k] = (seen[k] || 0) + 1; if (have.filter((h) => h === k).length < seen[k]) missing.push(w); }
    if (!missing.length) break;
    for (const w of missing) { const r = await clickTile(w); if (r.ok) placed++; }
  }
  // what actually ended up in the answer box, in order — so a mis-assembled attempt is reported
  // as the audit's own problem instead of as the app grading a correct answer wrong
  const assembled = await tab.eval(`(() => {
    const main = document.querySelector('main') || document.body;
    return [...main.querySelectorAll('button')]
      .filter((b) => /✕|✖/.test(b.innerText || '') || /되돌리|보관함으로/.test(b.getAttribute('title') || ''))
      .map((b) => (b.innerText || '').replace(/[✕✖×]/g, '').replace(/\\s+/g, ' ').trim()).filter(Boolean).join(' ');
  })()`).catch(() => "");
  await press(/정답 확인|확인|채점/);
  const good = await feedback();
  await press(/초기화|다시|리셋/);
  for (const w of [...words].reverse()) await clickTile(w);
  await press(/정답 확인|확인|채점/);
  const bad = await feedback();
  const accepted = (f) => !!f && /정답입니다|훌륭한 청취력|정확히 청취/.test(f) && !/순서가 조금 다릅니다|다시 시도|오답|일치하지 않습니다/.test(f);
  const norm = (s) => String(s).replace(/[^\w'’\s-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  // if the answer box does not hold the sentence the audit meant to build, the verdict says
  // nothing about the app — report it as BLOCKED with what was actually assembled
  const assembledRight = norm(assembled) === norm(words.join(" "));
  checks.push({
    feature: "tile dictation", item: `${stepLabel} · "${target.slice(0, 40)}"`,
    status: placed !== words.length || !assembledRight || (!good && !bad) ? "BLOCKED" : accepted(good) && !accepted(bad) ? "PASS" : "FAIL",
    note: `${placed}/${words.length} tiles placed${assembledRight ? "" : ` · ASSEMBLED "${String(assembled).slice(0, 80)}" but meant "${words.join(" ").slice(0, 80)}"`} · correct→${good || "no feedback"} · reversed→${bad || "no feedback"}`,
  });
}

/**
 * LD-HINTS-01 — walk the tap-dictation through EVERY sentence, recording what is on
 * screen at each one.
 *
 * The generic control pass presses each control ONCE (`__kigClicked`), so "다음 문장" moved
 * the drill by a single step and the snapshot was taken before even that: only sentence 1
 * was ever compared. The hints are computed per sentence, so checking one sentence per
 * lesson would be a sample, and this audit does not sample. Nothing is typed and nothing
 * is graded here — it only advances and reads.
 */
/**
 * The chips INSIDE the hint box, not the page's text.
 *
 * WHY THIS EXISTS. The content check concatenates the innerText of every step and
 * every sentence and asks whether the expected string is somewhere in it. For a
 * hint chip that is worthless: the driver types the correct answer into the
 * dictation, so the sentence's own words — which is what the chips are — land in
 * the snapshot no matter what the hint box renders. Measured on 2026-09-23: with
 * `hintsForSentence.slice(0, -1)` deliberately dropping the last chip, "Tom"
 * rendered nowhere on d001 and the sweep still reported content 6/6. Reading the
 * box itself is the difference between checking the screen and checking the data.
 */
// 2026-09-27 (LISTENING 학습법 · 화면 고침 — LD-U21): the line's hints are li[data-hint-chip] in the Step 2 box
// details[data-line-hints], folded in 빈칸 · 블록 — read by textContent, which a folded box still has. Step 1's list of the whole
// lesson's names and numbers (data-passage-hints, D25) is another place and not read here. The old box is read on an old build.
const HINT_CHIPS = `(() => {
  const now = [...document.querySelectorAll('main [data-step-panel="2"] [data-line-hints] [data-hint-chip]')];
  if (now.length || document.querySelector('main [data-ld-view]')) return now.map((s) => (s.textContent || '').trim()).filter(Boolean);
  const box = [...document.querySelectorAll('main div')].find((d) =>
    /고유 명사 · 숫자( · 어려운 낱말)? 참조/.test(d.innerText || '') && d.querySelectorAll('p span').length);
  return box ? [...box.querySelectorAll('p span')].map((s) => s.innerText.trim()).filter(Boolean) : [];
})()`;

async function walkDictation(tab, exp, texts, rec, stepLabel, depth) {
  if (depth === "light") return 0;
  // 일부러 깨기(7-1 e): 문장 넘기기를 끈 판 — 넘기는 깊이에서 상자를 못 읽었으니 힌트 칩은 여전히 '없음' 으로 세야 한다
  if (process.argv.includes("--break=no-walk")) return 0;
  // 회귀 점검 1002: ADULT 끊어 읽기 also has a '다음 문장' button — it is not a dictation walk (its sentences are read by
  // lib/containers adult-chunks and checked by adultChunks), so it is not walked here
  if (await tab.eval(`Boolean(document.querySelector('main [data-chunk-sentence]'))`).catch(() => false)) return 0;
  const sentences = (exp.answers || []).length;
  if (!sentences) return 0;
  const button = (label) =>
    `[...document.querySelectorAll('main button')].find((b) => /${label}/.test(b.innerText || '') && !b.disabled && (b.offsetParent || b.getClientRects().length))`;
  // 2026-09-27 (LISTENING 학습법 · 화면 고침): the line is moved by [data-action="prev-line"] · [data-action="next-line"] (icon
  // buttons, '이전 문장' · '다음 문장' only as their names) and played by [data-action="play-line"]; the walk is on the dictation step
  // only ([data-step-panel="2"] — Steps 3 and 4 share the line and its buttons). An old build keeps its text buttons.
  const ld = await tab.eval(`Boolean(document.querySelector('main [data-ld-view] [data-step-panel="2"]'))`).catch(() => false);
  if (!ld && (await tab.eval(LDD.view).catch(() => false))) return 0; // LISTENING, but not its dictation step
  const ldButton = (action) => `(() => { const b = document.querySelector('main [data-ld-view] [data-step-panel="2"] [data-action="${action}"]'); return b && !b.disabled ? b : null; })()`;
  const prevButton = ld ? ldButton("prev-line") : button("이전 문장");
  const nextButton = ld ? ldButton("next-line") : button("다음 문장");
  const playButton = ld ? ldButton("play-line") : button("표준 속도");
  const exists = async (expr) => Boolean(await tab.eval(`Boolean(${expr})`).catch(() => false));

  // Only the tap-dictation step has a sentence walk. Running this on STEP 1/3/4 pressed a
  // "표준 속도" button that is not on those screens and recorded the miss as an audio
  // failure — noise of the driver's own making.
  if (!(await exists(nextButton)) && !(await exists(prevButton))) return 0;
  const hasPlay = await exists(playButton);

  // REWIND FIRST. solveTiles has already answered several sentences by the time the step
  // loop opens this tab, so the drill sits near the END and "다음 문장" is disabled — the
  // first attempt at this walk recorded nothing for exactly that reason.
  for (let i = 0; i < sentences + 1; i++) {
    const back = await H.click(tab, prevButton, { settle: 200 });
    if (!back.ok) break;
  }

  let seen = 0;
  for (let i = 0; i < sentences; i++) {
    const where = `${stepLabel} · 문장 ${i + 1}`;
    tab.resetEvents();
    /**
     * Text on every sentence, the FULL snapshot on one.
     *
     * Running the whole snapshot on every sentence took the page from 30 s to 114 s, and
     * what it bought was a per-sentence layout check — for a box of chips that wraps, on
     * screens where the step-level check, the 552-page sweep and 170 hand-checked sentences
     * all reported zero layout problems. So the layout pass runs on the sentence with the
     * BIGGEST hint box (the fallback sentences show the entire list), which is the worst
     * case, and the rest are read as text. Console errors, 4xx and audio failures are
     * unaffected: they accumulate on the page, not on the snapshot.
     */
    const measureLayout = i === exp.hintWorstSentence;
    const shot = measureLayout
      ? await tab.eval(H.SNAPSHOT).catch(() => null)
      : await tab.eval(`(() => { const m = document.querySelector('main'); return m ? { text: m.innerText } : null; })()`).catch(() => null);
    // Read the hint box before anything else touches the sentence.
    const chips = await tab.eval(HINT_CHIPS).catch(() => []);
    rec.hintChips = [...new Set([...(rec.hintChips || []), ...chips])];
    if (shot) {
      texts.push({ step: where, text: shot.text });
      seen++;
      if (measureLayout) {
        rec.hintLayout = { sentence: i + 1, chips: exp.hintWorstSize, overflowX: Boolean(shot.overflowX), scrollWidth: shot.scrollWidth, clipped: (shot.clippedText || []).length, offscreen: (shot.offscreenControls || []).length };
        if (shot.overflowX) rec.problems.push(`horizontal overflow on ${where} (${shot.scrollWidth}px)`);
        if (shot.clippedText && shot.clippedText.length) rec.problems.push(`clipped text on ${where}: ${shot.clippedText[0]}`);
        if (shot.offscreenControls && shot.offscreenControls.length) rec.problems.push(`offscreen control on ${where}: ${shot.offscreenControls[0]}`);
        if (shot.errorScreen) rec.problems.push(`error screen on ${where}`);
      }
    }
    // The sentence's own speaker button, pressed directly (not through NEXT_CONTROL, which
    // would skip it after the first sentence because the element is marked as clicked).
    const pressThis = WALK_AUDIO === "all" || (WALK_AUDIO === "first" && i === 0);
    if (hasPlay && pressThis) await pressAudio(tab, playButton, where, exp, rec.audio);
    const ev = H.events(tab);
    if (ev.exceptions.length || ev.console.length || ev.badResponses.length) {
      rec.problems.push(
        `${where}: ${(ev.exceptions[0] || ev.console[0] || `HTTP ${ev.badResponses[0].status} ${ev.badResponses[0].url}`)}`.slice(0, 200),
      );
    }
    if (i === sentences - 1) break;
    const next = await H.click(tab, nextButton, { settle: 240 });
    if (!next.ok) break;
  }
  return seen;
}

async function visitStepControls(tab, exp, rec, stepLabel, depth = "full") {
  if (depth === "light") return true;
  // Script pages (-1/-2) duplicate their main lesson, so they get a lighter pass; the
  // clip of every one of their texts is still fetched and measured by audio-check.cjs.
  const script = exp.variant === "script";
  const maxPlay = depth === "medium" ? 1 : script ? 6 : MAX_PLAY;
  const maxOther = depth === "medium" ? 3 : script ? 10 : 60;
  for (let k = 0; k < maxPlay; k++) {
    const left = await tab.eval(COUNT_CONTROLS("play")).catch(() => 0);
    if (!left) break;
    await pressAudio(tab, NEXT_CONTROL("play"), stepLabel, exp, rec.audio);
  }
  await gradedInputs(tab, exp, rec.checks, depth === "medium" ? 1 : 12, rec.course);
  // 7단계 7-1 m: the tiles also on the phone (medium depth). Tap-to-assemble is the phone's way of answering (generateWordBank:
  // "for mobile tap-to-assemble dictation"), and the phone record's typed-input line is NA coveredBy 'tile dictation' — which
  // build-coverage counts as covered only when the same record holds that check. Until now only the desktop pass assembled.
  if (exp.tileAnswers && depth !== "light") await solveTiles(tab, exp, rec.checks, stepLabel, depth);
  // every other control: click once, look for errors and dead buttons
  for (let k = 0; k < maxOther; k++) {
    const left = await tab.eval(COUNT_CONTROLS("other")).catch(() => 0);
    if (!left) break;
    tab.resetEvents();
    const before = await tab.eval(`(() => { const m = document.querySelector('main'); return (m ? m.innerText : '').length; })()`).catch(() => 0);
    const c = await H.click(tab, NEXT_CONTROL("other"), { settle: 250 });
    const label = (await tab.eval(PICKED_LABEL).catch(() => null)) || c.text || "?";
    const after = await tab.eval(`(() => { const m = document.querySelector('main'); return { len: (m ? m.innerText : '').length, href: location.pathname }; })()`).catch(() => ({ len: 0, href: "" }));
    const ev = H.events(tab);
    const problem = ev.exceptions.length || ev.console.length || ev.badResponses.length;
    if (problem || !c.ok) {
      rec.checks.push({ feature: "control", item: `${stepLabel} · ${String(label).slice(0, 40)}`, status: "FAIL", note: !c.ok ? `not clickable: ${c.reason}` : `${ev.exceptions[0] || ev.console[0] || (ev.badResponses[0] && `HTTP ${ev.badResponses[0].status} ${ev.badResponses[0].url}`)}`.slice(0, 200) });
    } else {
      rec.checks.push({ feature: "control", item: `${stepLabel} · ${String(label).slice(0, 40)}`, status: "PASS", note: after.len === before ? "no visible change" : "" });
    }
    if (after.href !== rec.finalPath) { rec.problems.push(`control navigated away: ${String(label).slice(0, 40)} → ${after.href}`); return false; }
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  }
  return true;
}

async function visit(tab, page, viewport, neighbourMap, persist) {
  const exp = E.expected(page.course, page.id);
  const red = await resolveRedirect(page.url);
  const rec = {
    course: page.course, id: page.id, url: page.url, viewport, at: new Date().toISOString(), base: H.BASE, driverRev: DRIVER_REV,
    redirect: red.chain.length ? { chain: red.chain, finalPath: red.finalPath } : null,
    finalPath: red.finalPath, steps: [], checks: [], audio: [], problems: [], content: null, layout: null, events: null, hintChips: null, containers: null,
  };
  await H.setViewport(tab, viewport);
  const loaded = await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath });
  rec.load = loaded;
  if (!loaded.navigated || !loaded.rendered) {
    rec.problems.push(!loaded.navigated ? `never reached ${red.finalPath} (at ${loaded.href})` : `"${H.MARKERS[page.course]}" never rendered`);
    rec.events = H.events(tab);
    return rec;
  }
  const texts = [];
  const snap0 = await tab.eval(H.SNAPSHOT).catch(() => null);
  if (snap0) {
    texts.push({ step: "(initial)", text: snap0.text });
    rec.layout = { overflowX: snap0.overflowX, scrollWidth: snap0.scrollWidth, offscreen: snap0.offscreenControls, clipped: snap0.clippedText, smallTargets: snap0.smallTargets, unlabeledFields: snap0.unlabeledFields, imagesNoAlt: snap0.imagesNoAlt, brokenImages: snap0.brokenImages };
    if (snap0.paywall) rec.problems.push("paywall shown to a LIFE licence");
    if (snap0.leak) rec.problems.push(`leaked value on screen: ${snap0.leak}`);
    if (snap0.errorScreen) rec.problems.push("error screen");
    if (snap0.notFound) rec.problems.push("404 screen");
    if (snap0.placeholder) rec.problems.push("'준비 중' placeholder");
  }
  // 회귀 점검 1002: 'small' (작은 휴대폰 360px, harness VIEWPORTS) is driven as the phone is
  const depth = viewport === "desktop" ? "full" : viewport === "mobile" || viewport === "small" ? (exp.variant === "script" ? "light" : "medium") : "light";
  rec.depth = depth;
  const steps = (await tab.eval(STEP_BUTTONS).catch(() => [])) || [];
  rec.steps = steps;
  // 회귀 점검 1002: ADULT — the driver knows five steps (ADULT_KNOWN); a different number of tabs is a screen it cannot read → BLOCKED
  const adult = page.course === "adult" && exp.adult;
  const adultDone = {};
  if (adult && steps.length !== exp.adult.steps.length) rec.checks.push({ feature: "adult step", item: `tabs ${steps.length}`, status: "BLOCKED", note: `ADULT 단계 탭 ${steps.length}개 (${steps.join(" / ")}) — 드라이버는 5단계(${exp.adult.steps.join(" · ")})만 앎: 모르는 단계는 보지 못함` });
  let alive = await visitStepControls(tab, exp, rec, "(initial)", depth);
  for (const label of steps) {
    if (!alive) { await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath }); alive = true; }
    // 2026-09-27: a tab of the shared StepTabs (STUDENT) carries a count that the controls of an earlier step can change
    // ('Step 3 · 섀도잉 & 낭독 0/5' → '1/5'), so a tab with data-step-tab is found by its number; any other by its captured label.
    const stepNo = (String(label).match(/^\s*step\s*(\d+)/i) || [])[1];
    const byNumber = stepNo ? `document.querySelector('main [data-step-tab="${stepNo}"]') || ` : "";
    // ADULT: moving between steps must not start a sound (owner rule — '단계를 옮길 때는 소리 없음'): the log is emptied before the tab
    // press and read after it, before anything on the step is pressed
    if (adult) { await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {}); await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {}); }
    const clicked = await H.click(tab, `${byNumber}[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)})`, { settle: 800 });
    if (!clicked.ok) { rec.checks.push({ feature: "step", item: label, status: "FAIL", note: `step button not clickable: ${clicked.reason}` }); continue; }
    let adultMode = null;
    if (adult) {
      const plays = ((await H.audioLog(tab)) || []).filter((e) => e.ev === "play()" || (e.ev === "tts.speak" && (e.text || "").trim()));
      rec.checks.push({ feature: "adult step", item: `${label} · 옮길 때 소리 없음`, status: plays.length ? "FAIL" : "PASS", note: plays.length ? `탭을 누르자 소리: ${String(plays[0].src || plays[0].text).slice(-80)}` : "" });
      const panel = await tab.eval(ADULT_PANEL).catch(() => null);
      adultMode = panel ? ADULT_KNOWN[panel.name] || null : null;
      const at = panel ? exp.adult.steps.indexOf(panel.name) + 1 : 0;
      if (!adultMode || String(at) !== String(panel.n) || String(at) !== String(stepNo)) {
        rec.checks.push({ feature: "adult step", item: `${label} · 단계 알아봄`, status: "BLOCKED", note: `모르는 단계 — 탭 ${stepNo} · 화면 ${panel ? `data-step-panel ${panel.n} '${panel.name}'` : "없음"} (드라이버가 아는 것: ${Object.keys(ADULT_KNOWN).join(" · ")}) — 이 칸은 보지 못함` });
        adultMode = null;
      } else adultDone[adultMode] = "opened";
    }
    const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
    if (snap) {
      texts.push({ step: label, text: snap.text });
      if (snap.overflowX) rec.problems.push(`horizontal overflow on ${label} (${snap.scrollWidth}px)`);
      if (snap.leak) rec.problems.push(`leaked value on ${label}: ${snap.leak}`);
      if (snap.errorScreen) rec.problems.push(`error screen on ${label}`);
      if (snap.clippedText && snap.clippedText.length) rec.problems.push(`clipped text on ${label}: ${snap.clippedText[0]}`);
      rec.checks.push({ feature: "step", item: label, status: snap.textLength > 100 ? "PASS" : "FAIL", note: `${snap.textLength} chars` });
    }
    // The places this step owns (lib/containers.cjs), read before the driver presses anything
    // here — so neither its own answers nor another step's copy of a sentence can stand in.
    for (const c of (C.CONTAINERS[page.course] || []).filter((x) => x.step.test(label))) {
      const got = await tab.eval(C.READERS[c.id]).catch(() => null);
      rec.containers = rec.containers || {};
      rec.containers[c.id] = [...new Set([...(rec.containers[c.id] || []), ...(Array.isArray(got) ? got : [])])];
    }
    // ADULT Step 2 · 3 (회귀 점검 1002): their own routines, after the reader and before the every-control pass (which presses
    // 뜻 보기 · 알아요 · the blanks' options in its own order). Not at the layout-only depth (tablet), as every routine here.
    if (adult && depth !== "light") {
      if (adultMode === "words") adultDone.words = (await adultWords(tab, exp, rec, label)) ? "checked" : "blocked";
      if (adultMode === "chunk") adultDone.chunk = (await adultChunks(tab, exp, rec, label)) ? "checked" : "blocked";
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    }
    // AFTER the snapshot above, so sentence 1 is recorded before the drill moves on.
    await walkDictation(tab, exp, texts, rec, label, depth);
    alive = await visitStepControls(tab, exp, rec, label, depth);
  }
  // ADULT: every one of the five steps was opened and recognised — a step never reached is BLOCKED, not a quiet pass
  if (adult) for (const [name, mode] of Object.entries(ADULT_KNOWN)) if (!adultDone[mode]) rec.checks.push({ feature: "adult step", item: `${name} · 열림`, status: "BLOCKED", note: `'${name}' 단계를 열지 못함(탭 ${steps.join(" / ")}) — 이 칸은 보지 못함` });

  if (viewport === "desktop" && persist) {
    // Persistence tests must survive a reload, so stop wiping storage between reloads
    // (the audit clears it before every OTHER page so lessons never inherit answers).
    await tab.eval(`sessionStorage.setItem('kig:audit:keep', '1')`).catch(() => {});
    // bookmark: add → reload → persists → remove → reload → gone
    const bm = `[...document.querySelectorAll('main button, header button')].find((b) => /북마크/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')))`;
    const bmState = `(() => { const b = ${bm}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim() : null; })()`;
    const before = await tab.eval(bmState).catch(() => null);
    if (before) {
      await H.click(tab, bm, { settle: 400 });
      const afterClick = await tab.eval(bmState).catch(() => null);
      await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath });
      const afterReload = await tab.eval(bmState).catch(() => null);
      await H.click(tab, bm, { settle: 400 });
      await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath });
      const afterRemove = await tab.eval(bmState).catch(() => null);
      rec.checks.push({ feature: "bookmark", item: "add→reload→remove→reload", status: afterClick !== before && afterReload === afterClick && afterRemove === before ? "PASS" : "FAIL", note: `${before} → ${afterClick} → reload ${afterReload} → removed ${afterRemove}` });
    // 7단계 7-1 m (3차 점검): the header bookmark is on every lesson — not finding it is 'could not check', never NA
    } else rec.checks.push({ feature: "bookmark", item: "control", status: "BLOCKED", note: "bookmark control not found (the header bookmark is on every lesson)" });

    // completion toggle (STUDENT writes to the server — logged)
    // 7단계 7-1 m (3차 점검): STUDENT has no header completion button (LessonActionButtons draws it only when course !== "student").
    // A STUDENT lesson completes at the END OF STEP 3 — '이 강의 학습 완료' (aria-label 학습 완료 체크 / 학습 완료 취소), enabled (since
    // 2026-09-27, D18) after 80% of the sentences are dictated and 80% spoken; once completed it shows '✓ 완료한 강의' and a small
    // '완료 취소' (aria-label 학습 완료 취소, STU-U26). This test used to look only at the first screen and wrote 'no completion
    // control' NA for every STUDENT lesson — the completion that drives the progress rate and the next chapter's unlock was never pressed.
    // 회귀 점검 1002: ADULT completes the same way at the end of ITS LAST step (Step 5 · 섀도잉 & 낭독) — STUDENT_TABS.shadowing
    const studentView = isStudentView(page.course);
    const lastTab = studentView ? STUDENT_TABS[page.course].shadowing : 3;
    const step3 = studentView ? (rec.steps || []).find((s) => new RegExp(`Step\\s*${lastTab}(?!\\d)`, "i").test(s)) : null;
    // 2026-09-27: the STUDENT tab carries a count ('Step 3 · 섀도잉 & 낭독 2/5') that changes while the test practises — it is
    // found by data-step-tab (StepTabs), and by its captured label only on a page without that mark
    const openStep3 = async () => { if (step3) await H.click(tab, `document.querySelector('main [data-step-tab="${lastTab}"]') || [...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(step3)})`, { settle: 800 }); };
    const cm = studentView
      ? `[...document.querySelectorAll('main button')].find((b) => /^학습 완료 (체크|취소)$/.test(b.getAttribute('aria-label') || ''))`
      : `[...document.querySelectorAll('main button')].find((b) => /학습 완료|완료 체크/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')))`;
    const cmState = `(() => { const b = ${cm}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '') + (b.disabled ? '|disabled' : '')).replace(/\\s+/g, ' ').trim() : null; })()`;
    // BUG-030 (2026-09-24): a STUDENT completion is saved on the server (ProgressProvider queues it in
    // 'kig:student:pending:v1' and posts it 650 ms later), and the server's answer can take it back. The state
    // used to be read 700 ms after the press — before that answer — and the reload then cut the save off. Wait
    // for the queue to empty (the server answered) before reading or reloading; other courses save locally.
    // 회귀 점검 1002: ADULT has its own queue 'kig:adult:pending:v1' → /api/progress/adult (ProgressProvider ADULT_PENDING_KEY)
    const pendingKey = page.course === "adult" ? "kig:adult:pending:v1" : "kig:student:pending:v1";
    const serverSaved = async () => !studentView || (page.course === "adult" && adultServer === false) || H.waitFor(tab, `(() => { try { const v = localStorage.getItem(${JSON.stringify(pendingKey)}); return !v || v === '[]'; } catch (e) { return true; } })()`, 10000);
    // which progress API the saves went to (ADULT must post to its own — never STUDENT's record)
    const progressPosts = () => tab.eval(`(() => { const e = performance.getEntriesByType('resource').map((x) => x.name); return { adult: e.filter((n) => /\\/api\\/progress\\/adult/.test(n)).length, student: e.filter((n) => /\\/api\\/progress\\/student/.test(n)).length }; })()`).catch(() => null);
    await openStep3();
    // 2026-09-27 (VOCA · LISTENING · D02 나): the completion button's gate is registered by the view after it read its record — read after that
    if (page.course === "phonics" && (await H.waitFor(tab, V.VIEW_READY, 8000))) await H.sleep(300);
    if (page.course === "ld" && (await H.waitFor(tab, LDP.VIEW_READY, 8000))) await H.sleep(300);
    let c0 = await tab.eval(cmState).catch(() => null);
    let practiceNote = "";
    // 회귀 점검 1002 (2026-10-04, 운영 STUDENT s1-1 에서 실제로 일어남): a lesson that is ALREADY completed on the licence's record
    // ('학습 완료 취소') was un-completed by the toggle, and after the reload the button was disabled (the view keeps a completed
    // lesson completable only on the screen it was seen on — STU-U26 — and nothing had been practised), so the untoggle could not put
    // it back: the test FAILed and LEFT THE LESSON UN-COMPLETED on the server. Practise first (as for a disabled button), so the
    // completion can be pressed again after the reload and the record ends as it began.
    if (studentView && c0 && /취소/.test(c0)) {
      practiceNote = `${await practiseStudent(tab, exp, page.course)} (already completed — practised first so it can be completed again after the reload)`;
      await openStep3();
      c0 = await tab.eval(cmState).catch(() => null);
    }
    if (studentView && c0 && /\|disabled$/.test(c0)) {
      // 2026-09-27 D18: one practised sentence (FUN-02) no longer completes a lesson — 80% dictated and 80% spoken do.
      // Practise that much like a learner (practiseStudent), then read the button again; the note says what was practised.
      practiceNote = await practiseStudent(tab, exp, page.course);
      await openStep3();
      c0 = await tab.eval(cmState).catch(() => null);
    }
    if (page.course === "phonics" && c0 && /\|disabled$/.test(c0)) {
      // 2026-09-27 (VOCA · 계획 D02 나): '이 강의 학습 완료' opens after one finished Step 2 round — finish one like a learner
      // (lib/voca-page.cjs FINISH_ROUND answers every question), then read the button again; the note says what was done.
      const r = await tab.eval(V.FINISH_ROUND).catch((e) => ({ ok: false, why: String(e && e.message ? e.message : e).slice(0, 80) }));
      practiceNote = r && r.ok ? `practised: one Step 2 round (${r.answered} answers)` : `could not finish a Step 2 round: ${(r && r.why) || "?"}`;
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      c0 = await tab.eval(cmState).catch(() => null);
    }
    if (page.course === "ld" && c0 && /\|disabled$/.test(c0)) {
      // 2026-09-27 (LISTENING · 계획 D02 나): '이 강의 학습 완료' opens once a dictation line was checked — check one like a learner
      // (lib/ld-page.cjs CHECK_ONE_LINE: the first option of every blank, then '정답 확인'), then read the button again.
      const r = await tab.eval(LDP.CHECK_ONE_LINE).catch((e) => ({ ok: false, why: String(e && e.message ? e.message : e).slice(0, 80) }));
      practiceNote = r && r.ok ? `practised: one dictation line checked (${r.verdict})` : `could not check a dictation line: ${(r && r.why) || "?"}`;
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      await H.sleep(200);
      c0 = await tab.eval(cmState).catch(() => null);
    }
    if (page.course === "reading" && c0 && /\|disabled$/.test(c0)) {
      // 2026-09-27 (READING · 계획 D02 나): '이 강의 학습 완료' opens after one timed reading — read once like a learner
      // (lib/reading-page.cjs MEASURE_ONCE), then read the button again. (READING's own driver is drive-reading.cjs.)
      // 2026-09-28 (READING 순서 바꿈 — D31 다): the timed reading is Step 4 '다시 읽고 재기' now; MEASURE_ONCE opens Step 4.
      const r = await tab.eval(RDP.MEASURE_ONCE).catch((e) => ({ ok: false, why: String(e && e.message ? e.message : e).slice(0, 80) }));
      practiceNote = r && r.ok ? "practised: one timed reading (Step 4)" : `could not time a reading: ${(r && r.why) || "?"}`;
      await H.sleep(200);
      c0 = await tab.eval(cmState).catch(() => null);
    }
    // 회귀 점검 1002: ADULT — press completion only when it cannot open a chapter for good (adultProgress keeps unlockedThrough with
    // Math.max): the licence's ADULT record is read (GET /api/progress/adult — read only) and judged by lib/student-data.cjs
    // adultServer: true = the licence's ADULT record was read (the save must reach /api/progress/adult) · false = no licence session
    // (401 · 403 — a local dev server, a free lesson): nothing is saved on a server, the completion stays on this device
    let unlockRisk = null, adultServer = null;
    if (page.course === "adult" && c0 && !/\|disabled$/.test(c0)) {
      const res = await tab.eval(`fetch('/api/progress/adult', { credentials: 'same-origin', cache: 'no-store' }).then(async (r) => ({ status: r.status, body: r.ok ? await r.json() : null })).catch(() => null)`).catch(() => null);
      const lessons = res && res.body && res.body.progress && res.body.progress.lessons;
      if (res && (res.status === 401 || res.status === 403)) adultServer = false;
      else if (!lessons) unlockRisk = `ADULT 기록을 못 읽음(GET /api/progress/adult ${res ? res.status : "오류"}) — 장이 열릴지 몰라 누르지 않음`;
      else {
        adultServer = true;
        if (!/취소/.test(c0) && require("./lib/student-data.cjs").completionWouldUnlockIn("adult", page.id, lessons)) unlockRisk = "완료를 누르면 그 장이 끝나 다음 장이 열림(되돌릴 수 없음 — unlockedThrough 는 Math.max) — 누르지 않음";
      }
    }
    if (unlockRisk) rec.checks.push({ feature: "completion", item: `Step ${lastTab} · control`, status: "BLOCKED", note: `${unlockRisk}${practiceNote ? ` · ${practiceNote}` : ""}` });
    else if (c0 && !/\|disabled$/.test(c0)) {
      // (the resource-timing buffer holds 250 entries and a lesson's clips fill it — emptied first so the save is counted)
      await tab.eval("performance.clearResourceTimings(); performance.setResourceTimingBufferSize(2000)").catch(() => {});
      const posts0 = await progressPosts();
      await H.click(tab, cm, { settle: 700 });
      const saved1 = await serverSaved();
      const posts1 = await progressPosts();
      const c1 = await tab.eval(cmState).catch(() => null);
      await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath });
      await openStep3();
      if (page.course === "phonics" && (await H.waitFor(tab, V.VIEW_READY, 8000))) await H.sleep(300);
      if (page.course === "ld" && (await H.waitFor(tab, LDP.VIEW_READY, 8000))) await H.sleep(300);
      const c2 = await tab.eval(cmState).catch(() => null);
      await H.click(tab, cm, { settle: 700 });
      const saved3 = await serverSaved();
      const c3 = await tab.eval(cmState).catch(() => null);
      const saveNote = studentView ? ` · server answered ${saved1 && saved3 ? "both" : `${saved1 ? "" : "not "}after toggle, ${saved3 ? "" : "not "}after untoggle`}` : "";
      // ADULT: the toggle must have posted to /api/progress/adult and not to STUDENT's record (counts of this page load, before the reload)
      const adultSave = page.course !== "adult" || adultServer === false || (saved1 && saved3 && posts0 && posts1 && posts1.adult > posts0.adult && posts1.student === posts0.student);
      const postNote = page.course === "adult" ? (adultServer === false ? " · 이용권 세션 없음(401/403) — 이 기기에만 저장, 서버 저장은 안 봄" : ` · /api/progress/adult +${posts0 && posts1 ? posts1.adult - posts0.adult : "?"} · /api/progress/student +${posts0 && posts1 ? posts1.student - posts0.student : "?"}`) : "";
      rec.checks.push({ feature: "completion", item: step3 ? `Step ${lastTab} · toggle→reload→untoggle` : "toggle→reload→untoggle", status: c1 !== c0 && c2 === c1 && c3 === c0 && adultSave ? "PASS" : "FAIL", note: `${c0} → ${c1} → reload ${c2} → untoggle ${c3}${saveNote}${postNote}${practiceNote ? ` · ${practiceNote}` : ""}` });
      if (studentView) H.logDataChange({ course: page.course, id: page.id, action: `completion toggled on and off via the lesson UI (Step ${lastTab})`, detail: `${c0} → ${c1} → ${c3}` });
    } else if (c0) rec.checks.push({ feature: "completion", item: step3 ? `Step ${lastTab} · control` : "control", status: "FAIL", note: `completion control stays disabled after practising${practiceNote ? ` (${practiceNote})` : " a sentence"}: ${c0}` });
    else rec.checks.push({ feature: "completion", item: "control", status: "BLOCKED", note: step3 ? `Step ${lastTab} completion control not found` : "completion control not found" });

    await tab.eval(`(() => { sessionStorage.removeItem('kig:audit:keep'); try { const keep = new Set(${JSON.stringify(["kig:license:v1", "kig:device:id:v1", "kig:device:name:v1", "kig:theme", "kig:lang"])}); for (const k of Object.keys(localStorage)) if (!keep.has(k)) localStorage.removeItem(k); } catch (e) {} })()`).catch(() => {});
  }
  if (viewport === "desktop") {
    if (!persist) rec.checks.push({ feature: "bookmark/completion", item: "persistence", status: "NA", sampledBy: "reload test (--persist-every)", note: "exercised on the sampled lessons of this course (see --persist-every)" });
    // prev/next links vs the course order
    const nav = await tab.eval(`(() => { const as = [...document.querySelectorAll('main a[href], header a[href]')]; const pick = (re) => { const a = as.find((x) => re.test((x.innerText || '') + (x.getAttribute('aria-label') || ''))); return a ? new URL(a.href).pathname : null; }; return { prev: pick(/이전 강의|◀|←\\s*이전/), next: pick(/다음 강의|▶|다음\\s*→/) }; })()`).catch(() => ({ prev: null, next: null }));
    // Compare against the neighbours of the page that ACTUALLY rendered. GRAMMAR I redirects an
    // odd id to its even partner (/grammar1/gh1-007-1 → /grammar1/gh1-006-1), and judging the
    // rendered page by the requested id's neighbours reported 63 lessons as having wrong
    // prev/next links when the links were right for the page the learner is on.
    const navId = String(red.finalPath || page.url).split("/").pop();
    const nb = neighbourMap[navId] || neighbourMap[page.id] || { prev: null, next: null };
    const want = (x) => (x ? `/${page.course}/${x}` : null);
    rec.checks.push({ feature: "navigation", item: "prev/next", status: nav.prev === want(nb.prev) && nav.next === want(nb.next) ? "PASS" : "FAIL", note: `${navId !== page.id ? `(${page.id} → ${navId}) ` : ""}prev ${nav.prev} (course order ${want(nb.prev)}), next ${nav.next} (course order ${want(nb.next)})` });
  }

  // content comparison against the lesson's own data — lib/content-check.cjs (hint chips at a depth that
  // never walks the sentences are counted as "not seen at this depth", not as missing — 7단계 7-1 e)
  const { missing, notSeen, via, seenChips } = contentCheck({ course: page.course, exp, texts, rec });
  rec.content = { expected: exp.texts.length, found: exp.texts.length - missing.length - notSeen.length, missing: missing.slice(0, 25).map((m) => `${m.kind}: ${m.text.slice(0, 60)}`), missingCount: missing.length, notSeenAtDepth: notSeen.length, notSeenKinds: [...new Set(notSeen.map((m) => m.kind))], chipsFromBox: seenChips ? seenChips.size : null, viaContainer: via.container, viaPageText: via.pageText, containersRead: rec.containers ? Object.fromEntries(Object.entries(rec.containers).map(([k, v]) => [k, v.length])) : null };
  rec.events = H.events(tab);
  fs.mkdirSync(RENDERED, { recursive: true });
  fs.writeFileSync(path.join(RENDERED, `${page.id}.${viewport}.json`), JSON.stringify(texts, null, 1));
  return rec;
}

(async () => {
  let list = E.pages(COURSE).filter((p) => !ONLY || ONLY.has(p.id));
  if (SHARD) {
    const [i, n] = SHARD.split("/").map(Number);
    list = list.filter((_, k) => k % n === i - 1);
  }
  if (LIMIT) list = list.slice(0, LIMIT);
  const neighbourMap = E.neighbours(COURSE);
  const queue = list.flatMap((p) => VIEWPORTS.map((v) => [p, v]));
  if (!queue.length) { console.log(`!!! ${COURSE}: 부른 강의가 0 (--ids · --shard · --limit 확인) — 볼 것이 없음 · exit 1`); process.exit(1); }
  // --redo: 이 파일의 옛 기록은 옆 이름으로 남기고 빈 파일에서(지우지 않음)
  if (REDO && fs.existsSync(JSONL) && fs.statSync(JSONL).size) {
    const kept = `${JSONL}.before-redo-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.renameSync(JSONL, kept);
    console.log(`--redo: 옛 기록을 ${path.basename(kept)} 로 옮기고 새로 시작`);
  }
  const out = H.jsonl(JSONL, (r) => `${r.url}|${r.viewport}`);
  if (!RESUME && out.done.size) {
    console.log(`!!! ${path.basename(JSONL)} 에 이미 방문 ${out.done.size} — 이어 하려면 --resume, 새로 보려면 --redo(옛 기록은 옆 이름으로 남김) 또는 다른 --suffix · exit 1`);
    process.exit(1);
  }
  // --resume: 샤드(--suffix -s1, -s2 …)로 나누기 전에 일부를 이미 돌렸으면 같은 과정의 다른 기록도 "이미 함" 으로 — 이어 하기일 때만
  const featDir = path.join(OUT, "features");
  let fromOther = 0;
  for (const f of RESUME ? fs.readdirSync(featDir).filter((x) => x.startsWith(COURSE) && x.endsWith(".jsonl") && !x.includes("smoke") && path.join(featDir, x) !== JSONL) : []) {
    const base = f.replace(/\.jsonl$/, "");
    if (base !== COURSE && !base.startsWith(`${COURSE}-s`)) continue;
    for (const line of fs.readFileSync(path.join(featDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (!r.visitError && r.load && r.load.navigated && !out.done.has(`${r.url}|${r.viewport}`)) { out.done.add(`${r.url}|${r.viewport}`); fromOther++; } } catch {}
    }
  }
  const todo = queue.filter(([p, v]) => !out.done.has(`${p.url}|${v}`));
  console.log(`${COURSE}: ${todo.length} page×viewport visits to do (${out.done.size} already done${RESUME ? ` — --resume: 다른 기록에서 ${fromOther}` : ""}), clone ${CLONE} port ${PORT}`);
  if (!todo.length) {
    if (RESUME && !ONLY) { console.log(`${COURSE}: --resume — 남은 방문 0, 이미 다 함`); process.exit(0); }
    console.log(`!!! ${COURSE}: 할 일이 0 — ${ONLY ? "--ids 로 부른 강의가 모두 이미 기록됨(다시 보려면 --redo 또는 새 --suffix)" : "모두 이미 기록됨"} · 한 강도 안 봄 · exit 1`);
    process.exit(1);
  }
  if (process.argv.includes("--dry-run")) { console.log(`--dry-run: 방문할 것 ${todo.length} (${todo.slice(0, 6).map(([p, v]) => `${p.id}.${v}`).join(" · ")}${todo.length > 6 ? " …" : ""}) — 브라우저 열지 않음`); process.exit(0); }
  const browser = await H.startBrowser(CLONE, PORT);
  const started = Date.now();
  let cursor = 0;
  let n = 0;
  try {
    // Tabs share the clone's localStorage, so with more than one tab the persistence
    // tests (bookmark/completion survive a reload) are left to a single-tab run.
    // The internet is only available for limited windows: a visit made while offline would be
    // recorded as a broken lesson and then skipped as "done". Never record while offline — wait.
    const online = async () => {
      for (let i = 0; i < 3; i++) {
        try { const r = await fetch(H.BASE + "/robots.txt", { signal: AbortSignal.timeout(10000) }); if (r.ok) return true; } catch {}
        await H.sleep(2000);
      }
      return false;
    };
    const waitOnline = async () => { while (!(await online())) { console.log(`offline — waiting (${new Date().toISOString()})`); await H.sleep(60000); } };
    const worker = async () => {
      let tab = null;
      for (let a = 0; a < 4 && !tab; a++) { try { tab = await H.openTab(browser, { clean: true }); } catch (e) { console.log(`tab open retry: ${e.message}`); await H.sleep(5000); } }
      if (!tab) throw new Error("could not open a tab");
      for (;;) {
        const k = cursor++;
        if (k >= todo.length) break;
        const [page, viewport] = todo[k];
        const idx = list.findIndex((p) => p.id === page.id);
        const persist = TABS === 1 && (idx % PERSIST_EVERY === 0 || idx === list.length - 1);
        let rec;
        for (;;) {
          await waitOnline();
          try {
            rec = await visit(tab, page, viewport, neighbourMap, persist);
          } catch (err) {
            rec = { course: page.course, id: page.id, url: page.url, viewport, at: new Date().toISOString(), base: H.BASE, driverRev: DRIVER_REV, visitError: String(err && err.message).slice(0, 300) };
          }
          const failedToLoad = rec.visitError || (rec.load && !rec.load.navigated);
          if (failedToLoad && !(await online())) { console.log(`went offline during ${page.url} — will redo it`); continue; }
          break;
        }
        out.write(rec);
        n++;
        const fails = (rec.checks || []).filter((c) => c.status === "FAIL").length + (rec.audio || []).filter((a) => a.status === "FAIL").length + (rec.problems || []).length;
        const rate = (Date.now() - started) / n;
        console.log(`${n}/${todo.length} ${page.url} ${viewport} — ${fails} problem(s), content ${rec.content ? `${rec.content.found}/${rec.content.expected}` : "-"} · eta ${Math.round(((todo.length - n) * rate) / 60000)} min`);
      }
      await tab.close();
    };
    await Promise.all(Array.from({ length: TABS }, worker));
  } finally {
    browser.proc.kill();
  }
})();
