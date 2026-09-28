#!/usr/bin/env node
/**
 * 2026-09-27 VOCA 학습법 · 화면 고침(학습법-화면-0927/README.md 'VOCA 계획') — 새 화면을 실제로 눌러 보는 검사.
 * 로컬 운영 빌드의 무료 강의 /phonics/mv1-01 을 로그아웃 브라우저로 연다(이용권 없음 — 서버 쓰기 없음). 마이크는 가짜 인식기(lib/ld-fake-stt.js).
 *
 *   $env:BASE = "http://localhost:3210"; $env:KIG_PROFILE_SOURCE = "<빈 폴더>"; node check-voca-0927.cjs [--break gate|engine|migrate|word|autoplay]
 *   --break: 기대값 하나를 일부러 뒤집어 FAIL 이 나는지 본다(exit 1 이 나야 맞음).
 *
 *   P  플레이어는 하나: 위 플레이어(data-passage-player)는 숨고 1단계 목록 머리의 것(data-voca-player)만 보임(A10 · D01)
 *   G  완료 조건(D02): 2단계 한 회차 전에는 끝 막대의 완료가 꺼지고 이유 한 줄 → 한 회차 뒤 켜짐
 *   Q  2단계 한 회차에 '듣고 뜻 고르기' 문항이 있음(D20) · 틀린 낱말이 회차 끝에 다시 나옴
 *   W  3단계 한 낱말 판정(B03): 카드 낱말을 말하면 '알아들었어요' · 다른 낱말은 ''…'로 들렸어요 — 한 번 더' · 점수 숫자 없음
 *   S  4단계: 누를 때마다 맞음/틀림 표시(data-flash) · 끝난 뒤 틀린 짝 줄 수 = 틀리게 누른 수
 *   V  단계를 옮겨도 소리 없음(2026-09-28 사장님 "고쳐" — STUDENT 060705c 와 같은 규칙. 옛 화면은 2단계에 들어갈 때 '듣고 뜻 고르기'
 *      문항을 저절로 들려줬음): 1→2(탭, 처음) · 풀지 않은 '듣고 뜻 고르기' 문항을 두고 1단계에 갔다가 아래 '다음 Step' 으로 2단계 ·
 *      2→3 · 3→4 · 4→1 — 옮길 때마다 오디오 기록에 play()/playing(과 글 있는 브라우저 음성) 0, 그 문항의 '듣기'를 누르면 소리.
 *      2단계 안에서 '다음' · '한 회차 더' 가 가져온 듣기 문항이 들리는 것은 학습자가 누른 것이라 그대로(이 검사는 보지 않음).
 *   E  완료 → 공통 엔진 기록 kig-learning:phonics: 강의 날짜 {at, day} · 낱말 30개(kind word)
 *   M  옛 기록(모든 카드 box1 · streak0 · 같은 순간 + 한 장만 뒤에 틀림)을 넣고 다시 열면 '새 단어 29 · 틀림 1'
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const V = require("./lib/voca-page.cjs");

const BREAK = process.argv.includes("--break") ? process.argv[process.argv.indexOf("--break") + 1] : "";
// This check completes and un-completes a lesson and seeds this browser's storage — made for the LOCAL build with a
// logged-out profile. 2026-09-27: a run without BASE went to the live site with the licensed profile's copy (no server
// write — VOCA progress is on the device — but not what the check is for), so anything but localhost now stops here.
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(H.BASE) && !process.argv.includes("--allow-remote")) {
  console.error(`멈춤: BASE=${H.BASE} — 이 검사는 로컬 운영 빌드(http://localhost:3210)와 빈 브라우저용입니다. 다른 곳이면 --allow-remote.`);
  process.exit(2);
}
const FAKE_STT = fs.readFileSync(path.join(__dirname, "lib/ld-fake-stt.js"), "utf8");
const OUT = path.join(H.OUT, "voca-0927");
fs.mkdirSync(OUT, { recursive: true });
const URL_ = "/phonics/mv1-01";
const KEY = "kig:voca:leitner:phonics/mv1-01";

let fails = 0;
const rows = [];
const check = (id, ok, note) => { rows.push({ id, ok, note }); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${note}`); };
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const visibleCount = (tab, sel) => tab.eval(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }).length`).catch(() => -1);
const text = (tab, sel) => tab.eval(`(() => { const e = ${q(sel)}; return e ? (e.innerText || '').replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
const store = (tab, key) => tab.eval(`(() => { try { return JSON.parse(localStorage.getItem(${JSON.stringify(key)}) || 'null'); } catch (e) { return null; } })()`).catch(() => null);
const learningDay = (ms) => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10);
const completeBtn = `[...document.querySelectorAll('main button')].find((b) => /^학습 완료 (체크|취소)$/.test(b.getAttribute('aria-label') || ''))`;
const btnState = (tab) => tab.eval(`(() => { const b = ${completeBtn}; return b ? { label: b.getAttribute('aria-label'), disabled: b.disabled } : null; })()`).catch(() => null);

// ---- V2 (2026-09-28): a step change never starts sound ----
// a sound in the log: a clip asked for or playing, or the browser voice with words (the audio unlock plays a data: clip, which
// H.audioLog leaves out, and speaks an empty primer)
const sounded = (log) => log.some((e) => e.ev === "play()" || e.ev === "playing" || (e.ev === "tts.speak" && (e.text || "").trim()));
const ENTER_WAIT = 1500; // the old view's sound started a tick after the press (playSoon); STUDENT D1 waits as long
const NEXT_STEP = `[...document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')].find((b) => /다음 Step/.test(b.textContent || '') && !b.disabled)`;
const stepOn = (tab) => tab.eval(`(() => { const v = document.querySelector('main [data-voca-view]'); return v ? v.getAttribute('data-step') : null; })()`).catch(() => null);

/** Press a way into Step n with an empty audio log: true = a sound on the way in, false = silent, a string = it did not get there. */
async function enterStep(tab, n, expr = q(`[data-step-tab="${n}"]`)) {
  await H.audioLog(tab, { clear: true });
  const c = await H.click(tab, expr, { settle: ENTER_WAIT });
  const log = await H.audioLog(tab);
  const on = await stepOn(tab);
  if (!c.ok || on !== String(n)) return `안 옮겨짐(${c.ok ? `${on}단계` : c.reason})`;
  return sounded(log);
}

/**
 * A heard question is on screen, not answered yet: to Step 1, then back by the '다음 Step' button under the lesson
 * (LessonStepNavigation presses the Step 2 tab). The old view played this question again on the way in. Its '듣기' must then
 * play it — proof that this log does see a sound when there is one.
 */
async function awayAndBack(tab) {
  await H.click(tab, q('[data-step-tab="1"]'), { settle: 600 });
  const sound = await enterStep(tab, 2, NEXT_STEP);
  if (typeof sound === "string") await H.click(tab, q('[data-step-tab="2"]'), { settle: 600 }); // keep the round going; V2 fails
  const waiting = (await tab.eval(`Boolean(document.querySelector('[data-step-panel="2"] [data-question][data-kind="listen"]') && document.querySelector('[data-step-panel="2"] [data-option]:not([disabled])'))`).catch(() => false)) === true;
  await H.audioLog(tab, { clear: true });
  await H.click(tab, q('[data-step-panel="2"] [data-action="listen"]'), { settle: 1200 });
  const pressed = sounded(await H.audioLog(tab));
  return { sound, waiting, pressed };
}
const heard = (v) => (v === true ? "소리 남" : v === false ? "조용" : String(v));

async function open(tab) {
  await H.load(tab, URL_, { marker: H.MARKERS.phonics });
  await H.waitFor(tab, V.VIEW_READY, 15000);
}

(async () => {
  const browser = await H.startBrowser("voca0927", 9603);
  const tab = await H.openTab(browser);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE_STT });
  await H.setViewport(tab, "mobile");
  try {
    await open(tab);
    await tab.eval("localStorage.clear(); sessionStorage.clear()");
    await open(tab);

    // P — one player
    const topShown = await visibleCount(tab, "main [data-passage-player]");
    const ownShown = await visibleCount(tab, "main [data-voca-player]");
    check("P1 전체 듣기는 1단계 목록 머리 하나만", topShown === 0 && ownShown === 1, `위 플레이어 보임 ${topShown} · 1단계 것 ${ownShown}`);

    // G — gate before a round
    const before = await btnState(tab);
    const reason = await tab.eval(`(() => { const t = (document.querySelector('main') || {}).innerText || ''; return /2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요/.test(t); })()`);
    const words = await tab.eval(`[...document.querySelectorAll('[data-step-panel="1"] [data-word-text]')].map((e) => (e.innerText || '').trim())`);

    // Q — one Step 2 round (first option every time → some wrong words come back)
    // V2 (2026-09-28): the way in is listened to — the log was cleared here before, but the first version never read it
    const kinds = new Set();
    const asked = [];
    const moves = { "1→2 탭": await enterStep(tab, 2), "1→2 다음 Step": null, "2→3": null, "3→4": null, "4→1": null };
    const firstKind = await tab.eval(`(() => { const e = document.querySelector('[data-step-panel="2"] [data-question]'); return e ? e.getAttribute('data-kind') : null; })()`).catch(() => null);
    let back = null;
    for (let i = 0; i < 400; i++) {
      const st = await tab.eval(`(() => { const p = document.querySelector('[data-step-panel="2"]'); if (!p) return { none: true }; if (p.querySelector('[data-round-result]')) return { done: true }; const qn = p.querySelector('[data-question]'); const nx = p.querySelector('[data-action="next"]'); return { kind: qn ? qn.getAttribute('data-kind') : null, prompt: qn ? (qn.innerText || '').replace(/\\s+/g, ' ').slice(0, 60) : null, next: !!(nx && !nx.disabled), option: !!p.querySelector('[data-option]:not([disabled])') }; })()`);
      if (st.none || st.done) break;
      if (st.next) { await H.click(tab, q('[data-step-panel="2"] [data-action="next"]'), { settle: 120 }); continue; }
      // V2: the first heard question still waiting for its answer — away to Step 1 and back, then answered as usual below
      if (st.kind === "listen" && st.option && !back) back = await awayAndBack(tab);
      if (st.kind) kinds.add(st.kind);
      // only questions that show their word: every heard ('listen') question reads the same '듣고 알맞은 뜻을 고르세요',
      // so counting them made 'a missed word comes back' pass whenever a round had two heard questions (2026-09-28)
      if (st.prompt && st.kind !== "listen") asked.push(st.prompt);
      if (st.option) await H.click(tab, q('[data-step-panel="2"] [data-option]:not([disabled])'), { settle: 150 });
    }
    moves["1→2 다음 Step"] = !back ? "풀지 않은 듣고 고르기 문항을 못 만남" : !back.waiting ? "돌아왔을 때 듣고 고르기 문항이 없음" : back.sound;
    const roundDone = (await tab.eval(`Boolean(document.querySelector('[data-step-panel="2"] [data-round-result]'))`)) === true;
    const repeats = asked.length - new Set(asked).size;
    check("Q1 한 회차: 듣고 뜻 고르기 문항 있음 · 틀린 낱말이 다시 나옴", roundDone && kinds.has("listen") && repeats > 0, `끝남 ${roundDone} · 문항 종류 ${[...kinds].join(",")} · 문항 ${asked.length} · 다시 나온 것 ${repeats}`);
    const after = await btnState(tab);
    check("G1 한 회차 전 완료 꺼짐 + 이유 한 줄 → 한 회차 뒤 켜짐", before && before.disabled === (BREAK === "gate" ? false : true) && reason && after && after.disabled === false, `전 ${JSON.stringify(before)} · 이유 줄 ${reason} · 뒤 ${JSON.stringify(after)}`);

    // W — Step 3 single-word verdict on the first practice card (V2: the way in is listened to)
    moves["2→3"] = await enterStep(tab, 3);
    await H.click(tab, q('[data-action="start-practice"]'), { settle: 500 }).catch(() => null);
    let verdict = null, verdict2 = null, cardWord = null;
    for (let i = 0; i < 12 && !verdict; i++) {
      const stage = await tab.eval(`(() => { const c = document.querySelector('[data-practice] [data-stage], [data-stage]'); return c ? c.getAttribute('data-stage') : null; })()`);
      const mic = await tab.eval(`(() => { const b = [...document.querySelectorAll('[data-step-panel="3"] button')].find((x) => /말하기 확인|다시 녹음/.test(x.innerText || '')); return !!b; })()`);
      if (mic) {
        // the practice card shows its word as <p lang="en"> in the 'say' stage (PhonicsLearningView renderPractice)
        cardWord = await tab.eval(`(() => { const t = document.querySelector('[data-step-panel="3"] [data-practice] p[lang="en"]'); return t ? (t.innerText || '').trim() : null; })()`);
        const say = BREAK === "word" ? "zzzz" : cardWord;
        await tab.eval(`window.__fakeTranscript = ${JSON.stringify(say)}`);
        await H.click(tab, `[...document.querySelectorAll('[data-step-panel="3"] button')].find((x) => /말하기 확인|다시 녹음/.test(x.innerText || ''))`, { settle: 700 });
        verdict = await text(tab, '[data-step-panel="3"] [aria-live="polite"]');
        await tab.eval(`window.__fakeTranscript = "purple"`);
        await H.click(tab, `[...document.querySelectorAll('[data-step-panel="3"] button')].find((x) => /말하기 확인|다시 녹음|한 번 더|알아들었어요/.test(x.innerText || ''))`, { settle: 700 });
        verdict2 = await text(tab, '[data-step-panel="3"] [aria-live="polite"]');
        break;
      }
      // advance: reveal / next stage buttons in the practice card
      const adv = await H.click(tab, `[...document.querySelectorAll('[data-step-panel="3"] [data-action]')].find((b) => /reveal|listen|next-card|said/.test(b.getAttribute('data-action')) && !b.disabled)`, { settle: 400 });
      if (!adv.ok) break;
      void stage;
    }
    check("W1 한 낱말 판정: 카드 낱말 → '알아들었어요' · 다른 말 → '…로 들렸어요 — 한 번 더' · 점수 숫자 없음", /알아들었어요/.test(verdict || "") && /로 들렸어요 — 한 번 더/.test(verdict2 || "") && !/\d+점/.test(`${verdict} ${verdict2}`), `낱말 '${cardWord}' → '${verdict}' · 'purple' → '${verdict2}'`);

    // S — Step 4 game: flash per press and missed-pair rows (V2: the way in is listened to)
    moves["3→4"] = await enterStep(tab, 4);
    await H.click(tab, q('[data-action="start-game"]'), { settle: 500 });
    let wrong = 0, presses = 0, flashes = 0;
    for (let i = 0; i < 14; i++) {
      const b = await tab.eval(`(() => { const g = document.querySelector('[data-game]'); if (!g) return null; const bs = [...g.querySelectorAll('button')].filter((x) => !x.disabled); return bs.length ? bs.length : null; })()`);
      if (!b) break;
      await H.click(tab, `[...document.querySelectorAll('[data-game] button')].filter((x) => !x.disabled)[${i % 2}]`, { settle: 60 });
      presses++;
      const f = await tab.eval(`(() => { const g = document.querySelector('[data-game]'); return g ? g.getAttribute('data-flash') : null; })()`);
      if (f) flashes++;
      if (f === "wrong") wrong++;
      await H.sleep(450);
    }
    // let the 60 s run out quickly is not possible — end by waiting for the game-over screen
    await H.waitFor(tab, `Boolean(document.querySelector('[data-game-over]'))`, 65000);
    const missedRows = await tab.eval(`document.querySelectorAll('[data-game-over] [data-missed-pair], [data-missed-pair]').length`);
    check("S1 4단계: 누를 때마다 표시 · 틀린 짝 줄 수 = 틀리게 누른 수", presses > 0 && flashes === presses && missedRows === wrong, `누름 ${presses} · 표시 ${flashes} · 틀림 ${wrong} · 틀린 짝 줄 ${missedRows}`);

    // V — 2026-09-28 (사장님 "고쳐" — the rule of STUDENT 060705c): a step change never starts sound. The old view played a heard
    // Step 2 question by itself on the way in (PhonicsLearningView switchStep → playSoon); a heard question now waits for its
    // '듣기'. Every move above was listened to; the last one, back to Step 1 from the finished game, is here.
    moves["4→1"] = await enterStep(tab, 1);
    const moved = Object.values(moves);
    const measured = moved.every((v) => typeof v === "boolean");
    const silent = moved.every((v) => v === false);
    check(
      "V2 단계를 옮겨도 소리 없음 — 2단계 '듣고 뜻 고르기'는 '듣기'를 눌러야 소리",
      measured && !!(back && back.pressed) && (BREAK === "autoplay" ? !silent : silent),
      `옮길 때: ${Object.entries(moves).map(([k, v]) => `${k} ${heard(v)}`).join(" · ")} (1→2 첫 문항 ${firstKind}) · 풀지 않은 듣고 고르기 문항의 '듣기' 누르면 ${back ? heard(back.pressed) : "못 봄"}`,
    );

    // E — completion → engine record
    const t0 = Date.now();
    await H.click(tab, completeBtn, { settle: 900 });
    const rec = await store(tab, "kig-learning:phonics");
    const items = rec ? Object.keys(rec.items || {}).filter((k) => k.startsWith("mv1-01#")) : [];
    const want = BREAK === "engine" ? 29 : 30;
    const lesson = rec && rec.lessons ? rec.lessons["mv1-01"] : null;
    check("E1 완료 → 엔진: 강의 날짜 · 낱말 30개(kind word)", !!lesson && lesson.day === learningDay(t0) && items.length === want && items.every((k) => rec.items[k].kind === "word"), `lessons ${JSON.stringify(lesson)} · 낱말 ${items.length} · 기록 ${rec ? rec.log.length : 0}건`);
    await H.click(tab, completeBtn, { settle: 600 });

    // M — old record migration
    const t = Date.now() - 3 * 86400e3;
    const old = {};
    words.forEach((w, i) => { old[w] = { word: w, meaning: "", box: 1, lastTestedAt: i === 0 ? t + 10000 : t, streak: 0 }; });
    await tab.eval(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(old))})`);
    await open(tab);
    await H.click(tab, q('[data-step-tab="3"]'), { settle: 600 });
    const counts = await text(tab, "[data-box-counts]");
    const wantNew = BREAK === "migrate" ? 30 : words.length - 1;
    check("M1 옛 기록: 같은 순간 box1 = 새 단어 · 뒤에 틀린 한 장 = 틀림", new RegExp(`새 단어 ${wantNew}`).test(counts || "") && /틀림 1/.test(counts || ""), `낱말 ${words.length} · '${counts}'`);
  } catch (e) {
    check("RUN", false, `예외 ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  } finally {
    fs.writeFileSync(path.join(OUT, `result${BREAK ? "-break-" + BREAK : ""}.json`), JSON.stringify({ at: new Date().toISOString(), base: H.BASE, break: BREAK || null, rows }, null, 2));
    await tab.close().catch(() => {});
    browser.proc.kill();
  }
  console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} PASS${BREAK ? ` (--break ${BREAK}: FAIL 이 나야 맞음)` : ""}`);
  process.exit(fails ? 1 : 0);
})();
