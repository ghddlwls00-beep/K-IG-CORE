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
 *        [--viewports desktop,tablet,mobile] [--shard 1/4] [--suffix -v1] [--port 9500]
 *
 * Output: out/features/<course><suffix>.jsonl (resumable), out/rendered/<course>/<id>.<viewport>.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const COURSE = arg("--course", null);
const ONLY = arg("--ids", null) ? new Set(arg("--ids", "").split(",")) : null;
const LIMIT = Number(arg("--limit", 0)) || 0;
const VIEWPORTS = arg("--viewports", "desktop,tablet,mobile").split(",");
const SUFFIX = arg("--suffix", "");
const SHARD = arg("--shard", null);
const REDO = process.argv.includes("--redo");
const PORT = Number(arg("--port", 9500));
const CLONE = arg("--clone", `gen-${COURSE}${SHARD ? `-${SHARD.split("/")[0]}` : ""}`);
// Bookmark/completion persistence needs 4 extra page loads; run it on every Nth lesson.
const PERSIST_EVERY = Number(arg("--persist-every", 10));
const TABS = Number(arg("--tabs", 1));
// VOCA lessons carry 30 word players; pressing all of them on all 195 lessons would add
// hours, so the cap is per step and the rest of the clips are covered by audio-check.cjs.
const MAX_PLAY = Number(arg("--max-play", 60));
if (!COURSE) throw new Error("--course is required");

const OUT = path.join(__dirname, "../out");
const JSONL = path.join(OUT, "features", `${COURSE}${SUFFIX}.jsonl`);
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

async function gradedInputs(tab, exp, checks, maxFields = 12) {
  const fields = (await tab.eval(FIELDS).catch(() => [])) || [];
  if (!fields.length) return;
  // LISTENING and STUDENT are answered by tapping word TILES, not by typing: typing into
  // whatever field is on screen would be a false failure. Their grading is covered by the
  // offline grader harness and by the tile routine.
  if (exp.tileAnswers) { checks.push({ feature: "graded input", item: "tile dictation", status: "BLOCKED", note: "tile-based answering — checked by grade-offline.cjs and the tile routine, not by typing" }); return; }
  const answers = exp.answers;
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
 * depth: "full" (desktop — every control), "medium" (mobile — one control of each kind,
 * so touch layout and touch input are really exercised) or "light" (tablet — layout only).
 */
/**
 * LISTENING / STUDENT dictation: the answer is built by tapping word tiles. Build the
 * sentence from the DATA, press the check button, then wreck the order and press it again.
 */
async function solveTiles(tab, exp, checks, stepLabel) {
  const target = (exp.answers[0] || {}).text;
  if (!target && !exp.tileWordsAll) return;
  // Which sentence is the drill actually on? Controls pressed earlier in this step can advance it,
  // so ask the page: take the sentence whose tiles are ALL sitting in the bank right now. Assuming
  // the first sentence left STUDENT assembling two stray words out of six.
  const candidates = exp.tileWordsAll && exp.tileWordsAll.length
    ? exp.tileWordsAll
    : [String(target).replace(/[^\w'\u2019\s-]/g, " ").split(/\s+/).filter(Boolean)];
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
  if (pick < 0) return;                      // this step is not showing a tile bank we can solve
  const words = candidates[pick];
  if (words.length < 2 || words.length > 25) return;
  const tiles = await tab.eval(`(() => {
    const vis = ${VIS};
    const main = document.querySelector('main') || document.body;
    return [...main.querySelectorAll('button')].filter(vis)
      .map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())
      .filter((t) => t && t.length <= 25 && !/\\s/.test(t) && !/[가-힣]/.test(t) && !/^[\\p{Emoji}\\p{P}]+$/u.test(t)).length;
  })()`).catch(() => 0);
  if (!tiles || tiles < words.length) return; // not the dictation step (or not enough tiles)
  // Only ever tap a tile that is still in the WORD BANK. A tile already placed in the assembled
  // sentence is also a button carrying the same word, and tapping it REMOVES that word
  // (LdLearningView handleRemoveTile / StudentLearningView handleRemoveTile). Picking those up
  // made the audit assemble a different sentence from the one it thought it was assembling, and
  // then report the app as marking a correct answer wrong. Both views mark a placed tile with a
  // ✕, and LISTENING also gives it title="클릭하여 되돌리기".
  const clickTile = async (word) => H.click(tab, `(() => {
    const vis = ${VIS};
    const main = document.querySelector('main') || document.body;
    const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
    const want = ${JSON.stringify(word)};
    // Identify the ANSWER BOX by its own label and exclude everything inside it, instead of
    // guessing from a ✕ in the button text. A word the sentence needs twice was being taken as
    // already placed on its second turn, so every repeated word went missing.
    const placed = (b) => /✕|✖/.test(b.innerText || '') || /되돌리|보관함으로/.test(b.getAttribute('title') || '');
    // Take the LAST match, not the first: the answer box is rendered above the word bank, so on a
    // word the sentence uses twice the first match could still be the tile already placed and the
    // tap removed it again (the count oscillated instead of settling).
    const hits = [...main.querySelectorAll('button')].filter(vis).filter((b) => !placed(b) && norm((b.innerText || '')) === norm(want));
    return hits.length ? hits[hits.length - 1] : null;
  })()`, { settle: 250 });
  // Match the verdict BANNERS the two views actually render, not loose keywords: "다시" alone also
  // occurs in the Korean translation printed on the same page, which made a correct answer read
  // as a wrong one.
  const feedback = async () => (await tab.eval(`(() => {
    const m = document.querySelector('main'); const t = (m ? m.innerText : '');
    const hit = t.match(/[^\\n]{0,60}(정답입니다|훌륭한 청취력|정확히 청취|순서가 조금 다릅니다|다시 시도|오답)[^\\n]{0,60}/);
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
  const accepted = (f) => !!f && /정답입니다|훌륭한 청취력|정확히 청취/.test(f) && !/순서가 조금 다릅니다|다시 시도|오답/.test(f);
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
  await gradedInputs(tab, exp, rec.checks, depth === "medium" ? 1 : 12);
  if (exp.tileAnswers && depth === "full") await solveTiles(tab, exp, rec.checks, stepLabel);
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
    course: page.course, id: page.id, url: page.url, viewport, at: new Date().toISOString(),
    redirect: red.chain.length ? { chain: red.chain, finalPath: red.finalPath } : null,
    finalPath: red.finalPath, steps: [], checks: [], audio: [], problems: [], content: null, layout: null, events: null,
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
  const depth = viewport === "desktop" ? "full" : viewport === "mobile" ? (exp.variant === "script" ? "light" : "medium") : "light";
  rec.depth = depth;
  const steps = (await tab.eval(STEP_BUTTONS).catch(() => [])) || [];
  rec.steps = steps;
  let alive = await visitStepControls(tab, exp, rec, "(initial)", depth);
  for (const label of steps) {
    if (!alive) { await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath }); alive = true; }
    const clicked = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(label)})`, { settle: 800 });
    if (!clicked.ok) { rec.checks.push({ feature: "step", item: label, status: "FAIL", note: `step button not clickable: ${clicked.reason}` }); continue; }
    const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
    if (snap) {
      texts.push({ step: label, text: snap.text });
      if (snap.overflowX) rec.problems.push(`horizontal overflow on ${label} (${snap.scrollWidth}px)`);
      if (snap.leak) rec.problems.push(`leaked value on ${label}: ${snap.leak}`);
      if (snap.errorScreen) rec.problems.push(`error screen on ${label}`);
      if (snap.clippedText && snap.clippedText.length) rec.problems.push(`clipped text on ${label}: ${snap.clippedText[0]}`);
      rec.checks.push({ feature: "step", item: label, status: snap.textLength > 100 ? "PASS" : "FAIL", note: `${snap.textLength} chars` });
    }
    alive = await visitStepControls(tab, exp, rec, label, depth);
  }

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
    } else rec.checks.push({ feature: "bookmark", item: "control", status: "NA", note: "no bookmark control on this page" });

    // completion toggle (STUDENT writes to the server — logged)
    const cm = `[...document.querySelectorAll('main button')].find((b) => /학습 완료|완료 체크/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')))`;
    const cmState = `(() => { const b = ${cm}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim() : null; })()`;
    const c0 = await tab.eval(cmState).catch(() => null);
    if (c0) {
      await H.click(tab, cm, { settle: 700 });
      const c1 = await tab.eval(cmState).catch(() => null);
      await H.load(tab, page.url, { marker: H.MARKERS[page.course], expectPath: red.finalPath });
      const c2 = await tab.eval(cmState).catch(() => null);
      await H.click(tab, cm, { settle: 700 });
      const c3 = await tab.eval(cmState).catch(() => null);
      rec.checks.push({ feature: "completion", item: "toggle→reload→untoggle", status: c1 !== c0 && c2 === c1 && c3 === c0 ? "PASS" : "FAIL", note: `${c0} → ${c1} → reload ${c2} → untoggle ${c3}` });
      if (page.course === "student") H.logDataChange({ course: page.course, id: page.id, action: "completion toggled on and off via the lesson UI", detail: `${c0} → ${c1} → ${c3}` });
    } else rec.checks.push({ feature: "completion", item: "control", status: "NA", note: "no completion control" });

    await tab.eval(`(() => { sessionStorage.removeItem('kig:audit:keep'); try { const keep = new Set(${JSON.stringify(["kig:license:v1", "kig:device:id:v1", "kig:device:name:v1", "kig:theme", "kig:lang"])}); for (const k of Object.keys(localStorage)) if (!keep.has(k)) localStorage.removeItem(k); } catch (e) {} })()`).catch(() => {});
  }
  if (viewport === "desktop") {
    if (!persist) rec.checks.push({ feature: "bookmark/completion", item: "persistence", status: "NA", note: "exercised on the sampled lessons of this course (see --persist-every)" });
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

  // content comparison against the lesson's own data
  const all = texts.map((t) => t.text).join("\n");
  const flat = norm(all);
  const missing = exp.texts.filter((t) => !flat.includes(norm(t.text).slice(0, 60)));
  rec.content = { expected: exp.texts.length, found: exp.texts.length - missing.length, missing: missing.slice(0, 25).map((m) => `${m.kind}: ${m.text.slice(0, 60)}`), missingCount: missing.length };
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
  const out = H.jsonl(JSONL, (r) => `${r.url}|${r.viewport}`);
  // A course may be split into shards (--suffix -s1, -s2 …) after part of it already ran
  // unsharded: every JSONL of this course counts as done, so no visit is repeated.
  // --redo ignores what is already recorded: used when a fix to this driver means the existing
  // records for those pages cannot be trusted and have to be taken again.
  const featDir = path.join(OUT, "features");
  for (const f of REDO ? [] : fs.readdirSync(featDir).filter((x) => x.startsWith(COURSE) && x.endsWith(".jsonl") && !x.includes("smoke") && path.join(featDir, x) !== JSONL)) {
    const base = f.replace(/\.jsonl$/, "");
    if (base !== COURSE && !base.startsWith(`${COURSE}-s`)) continue;
    for (const line of fs.readFileSync(path.join(featDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (!r.visitError && r.load && r.load.navigated) out.done.add(`${r.url}|${r.viewport}`); } catch {}
    }
  }
  const todo = queue.filter(([p, v]) => !out.done.has(`${p.url}|${v}`));
  console.log(`${COURSE}: ${todo.length} page×viewport visits to do (${out.done.size} already done), clone ${CLONE} port ${PORT}`);
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
            rec = { course: page.course, id: page.id, url: page.url, viewport, at: new Date().toISOString(), visitError: String(err && err.message).slice(0, 300) };
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
