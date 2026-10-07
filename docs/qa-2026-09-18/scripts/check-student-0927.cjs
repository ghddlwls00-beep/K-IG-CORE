#!/usr/bin/env node
/**
 * 2026-09-27 STUDENT 학습법 · 화면 고침(학습법-화면-0927/README.md 'STUDENT 계획') — 새 화면을 실제로 눌러 보는 검사.
 * 로컬 운영 빌드의 무료 강의(s1-1 · s1-2)와 GRAMMAR gh1-006 을 로그아웃 브라우저로 연다 — 이용권이 없으니 서버 진도 쓰기도 없다.
 * 마이크는 가짜 인식기(lib/ld-fake-stt.js)라 배선만 본다(진짜 마이크 · 아이폰은 아무도 안 봄).
 *
 *   $env:BASE = "http://localhost:3210"; $env:KIG_PROFILE_SOURCE = "<빈 폴더>"; node check-student-0927.cjs [--break lock|complete|engine|mic]
 *   --break: 기대값 하나를 일부러 뒤집어 이 검사가 FAIL 을 낼 수 있는지 본다(exit 1 이 나야 맞음).
 *
 * 보는 것
 *   L  1단계: 처음엔 모든 문장이 '먼저 듣기'(잠김) → 한 문장을 끝까지 들으면 그 문장만 '눌러서 보기' → 보기 · 가리기 → 보기 방식을 바꾸면 연 카드가 닫힘
 *   D  2단계: 단계를 옮겨도 소리 없음(09-28) · '듣기'로 재생 · 우리말은 힌트 뒤 · 틀리게 조립 → 틀린 자리 · '여기부터 다시' · 우리말이 보임 → 바르게 → 정답 · 힌트로만 채우면 '힌트로 완성'(정답으로 안 셈)
 *   M  3단계 마이크(가짜): 'nice to meet you sir' → 100점 빨강 0 · 앞 세 낱말 되풀이 → 85점 이상 빨강 0 · 70~79점은 '통과했어요' · 반복 재생 중 마이크를 켜면 반복이 멈춤
 *   C  완료: 연습 전에는 완료 단추가 꺼짐 → 받아쓰기 · 말하기 80% 뒤 켜짐 → 완료 → '완료한 강의' · '다음 강의: Ch 1-2 · …' · 공통 엔진 기록(kig-learning:student) 강의 날짜 · 문장 3개
 *      (2026-10-07 UI검토-1007 2장 1번부터 완료 단추 · '학습 완료함' · '다음 강의' 는 강의 끝 막대(section '강의 마치기') 것 — 그곳을 읽음)
 *   I  s1-2 내 정보: 넣은 값이 3단계 문장에 보이고, 듣기는 모범 문장 클립 그대로(브라우저 음성 0), 마이크는 내 정보로 말해도 100점
 *   G  GRAMMAR gh1-006: 1번을 틀리게 쓰고 확인 → 강의 끝 막대의 완료 → kig-learning:grammar1 에 강의 날짜와 1번만(안 푼 2번은 없음)
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const BREAK = process.argv.includes("--break") ? process.argv[process.argv.indexOf("--break") + 1] : "";
// Made for the LOCAL build with a logged-out profile (it completes lessons and seeds storage) — anything but localhost stops
// here, so a run without BASE can never reach the live site with the licensed profile's copy (2026-09-27).
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(H.BASE) && !process.argv.includes("--allow-remote")) {
  console.error(`멈춤: BASE=${H.BASE} — 이 검사는 로컬 운영 빌드(http://localhost:3210)와 빈 브라우저용입니다. 다른 곳이면 --allow-remote.`);
  process.exit(2);
}
const PORT = 9594;
const FAKE_STT = fs.readFileSync(path.join(__dirname, "lib/ld-fake-stt.js"), "utf8");
const OUT = path.join(H.OUT, "student-0927");
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const rows = [];
function check(id, ok, note) {
  rows.push({ id, ok, note });
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${note}`);
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const count = (tab, sel) => tab.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`).catch(() => -1);
const text = (tab, sel) => tab.eval(`(() => { const e = ${q(sel)}; return e ? (e.innerText || e.textContent || '').replace(/\\s+/g, ' ').trim() : null; })()`).catch(() => null);
const attr = (tab, sel, a) => tab.eval(`(() => { const e = ${q(sel)}; return e ? e.getAttribute(${JSON.stringify(a)}) : null; })()`).catch(() => null);
const click = (tab, sel, settle = 250) => H.click(tab, q(sel), { settle });
const store = (tab, key) => tab.eval(`(() => { try { return JSON.parse(localStorage.getItem(${JSON.stringify(key)}) || 'null'); } catch (e) { return null; } })()`).catch(() => null);
const learningDay = (ms) => { const d = new Date(ms + 9 * 3600e3 - 4 * 3600e3); return d.toISOString().slice(0, 10); };

/** press the bank tiles for these words in this order (case-insensitive; the first free tile with that label) */
async function place(tab, words) {
  for (const w of words) {
    const expr = `[...document.querySelectorAll('[data-word-bank] button:not([disabled])')].find((b) => (b.innerText || '').trim().toLowerCase() === ${JSON.stringify(w.toLowerCase())})`;
    const r = await H.click(tab, expr, { settle: 120 });
    if (!r.ok) return { ok: false, word: w };
  }
  return { ok: true };
}

/** fake microphone: open card idx's tester, say `said`, wait for the score line */
async function speak(tab, idx, said) {
  const card = `[data-step-panel="3"] [data-sentence="${idx}"]`;
  if ((await attr(tab, `${card} [data-action="speak"]`, "aria-expanded")) !== "true") await click(tab, `${card} [data-action="speak"]`, 300);
  await tab.eval(`window.__fakeTranscript = ${JSON.stringify(said)}`);
  const start = `[...document.querySelectorAll(${JSON.stringify(card + " button")})].find((b) => /말하기 확인|다시 녹음/.test(b.innerText || ''))`;
  const pressed = await H.click(tab, start, { settle: 200 });
  const got = await H.waitFor(tab, `/\\d+점/.test((${q(card)} || {}).innerText || '')`, 8000);
  const info = await tab.eval(`(() => { const c = ${q(card)}; const t = (c.innerText || '').replace(/\\s+/g, ' '); const m = t.match(/(\\d+)점 \\(([^)]*)\\)/); return { score: m ? +m[1] : null, label: m ? m[2] : null, red: c.querySelectorAll('[data-matched="false"]').length, green: c.querySelectorAll('[data-matched="true"]').length, pass: /통과했어요/.test(t), said: c.querySelector('[data-action="said"]') ? c.querySelector('[data-action="said"]').getAttribute('aria-pressed') : null }; })()`);
  return { pressed: pressed.ok, got, ...info };
}

(async () => {
  const browser = await H.startBrowser("stu0927", PORT);
  const tab = await H.openTab(browser);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE_STT });
  await H.setViewport(tab, "mobile");
  try {
    // ------------------------------------------------------------------ L. Step 1 lock
    await H.load(tab, "/student/s1-1", { marker: H.MARKERS.student });
    await tab.eval("localStorage.clear(); sessionStorage.clear()");
    await H.load(tab, "/student/s1-1", { marker: H.MARKERS.student });
    const locked0 = await count(tab, '[data-step-panel="1"] [data-reveal="locked"]');
    const open0 = await count(tab, '[data-step-panel="1"] [data-reveal="open"]');
    check("L1 처음엔 모두 잠김", locked0 === 3 && open0 === 0, `잠김 ${locked0} · 볼 수 있음 ${open0}(기대 3 · 0)`);
    await H.audioLog(tab, { clear: true });
    await click(tab, '[data-step-panel="1"] [data-sentence="0"] [data-reveal="locked"]', 200);
    const unlocked = await H.waitFor(tab, `Boolean(${q('[data-step-panel="1"] [data-sentence="0"] [data-reveal="open"]')})`, 20000);
    const log = await H.audioLog(tab);
    const played = log.filter((e) => e.ev === "playing" || e.ev === "ended").map((e) => (e.src || "").split("/").pop());
    const stillLocked1 = await count(tab, '[data-step-panel="1"] [data-sentence="1"] [data-reveal="locked"]');
    // a browser-voice call with text would mean a missing clip; the audio unlock (unlockMobileAudio) speaks an empty utterance
    const ttsTexts = log.filter((e) => e.ev === "tts.speak").map((e) => e.text || "");
    check("L2 끝까지 들으면 그 문장만 열림", unlocked && (BREAK === "lock" ? stillLocked1 === 0 : stillLocked1 === 1) && ttsTexts.every((t) => !t.trim()), `1번 열림 ${unlocked} · 2번 아직 잠김 ${stillLocked1 === 1} · 소리 ${[...new Set(played)].slice(0, 2).join(",") || "없음"} · 브라우저 음성 ${ttsTexts.length}(글 있는 것 ${ttsTexts.filter((t) => t.trim()).length}: ${ttsTexts.filter((t) => t.trim()).join(" | ").slice(0, 80)})`);
    await click(tab, '[data-step-panel="1"] [data-sentence="0"] [data-reveal="open"]');
    const en0 = await text(tab, '[data-step-panel="1"] [data-sentence="0"] [data-en]');
    await click(tab, '[data-step-panel="1"] [data-sentence="0"] [data-hide]');
    const hidden0 = !(await text(tab, '[data-step-panel="1"] [data-sentence="0"] [data-en]'));
    check("L3 보기 · 가리기", en0 === "Nice to meet you (sir/ma’am)." && hidden0, `보인 글 '${en0}' · 가린 뒤 영어 없음 ${hidden0}`);
    await click(tab, '[data-filter="all"]');
    const allEn = await count(tab, '[data-step-panel="1"] [data-en]');
    await click(tab, '[data-sentence="0"] [data-reveal="open"]').catch(() => null);
    await click(tab, '[data-filter="hidden"]');
    const afterHidden = await count(tab, '[data-step-panel="1"] [data-en]');
    check("L4 '모두' → '가림'이면 연 카드도 닫힘", allEn === 3 && afterHidden === 0, `모두 ${allEn} · 가림으로 돌린 뒤 영어 ${afterHidden}`);

    // ------------------------------------------------------------------ D. Step 2
    // 2026-09-28 (사장님 "1단계에서 2단계로 넘어가는데 음성이 나와 이거 해결해"): a step change never starts sound — Step 2 opens
    // silent and the learner's own '듣기' plays the sentence (the first version of this check expected the auto-play)
    await H.audioLog(tab, { clear: true });
    await click(tab, '[data-step-tab="2"]', 1500);
    const log2 = await H.audioLog(tab);
    const autoPlayed = log2.some((e) => e.ev === "play()" || e.ev === "playing" || (e.ev === "tts.speak" && (e.text || "").trim()));
    await H.audioLog(tab, { clear: true });
    await click(tab, '[data-step-panel="2"] [data-action="replay"]', 1200);
    const pressedPlays = (await H.audioLog(tab)).some((e) => e.ev === "play()" || e.ev === "playing");
    await click(tab, '[data-step-panel="2"] [data-action="replay"]', 300); // stop it again
    const koHidden = (await count(tab, "[data-dictation] [data-ko]")) === 0 && (await count(tab, '[data-action="ko-hint"]')) === 1;
    check("D1 단계를 옮겨도 소리 없음 · '듣기'로 재생 · 우리말은 힌트 뒤", (BREAK === "autoplay" ? autoPlayed : !autoPlayed) && pressedPlays && koHidden, `들어갈 때 소리 ${autoPlayed} · '듣기' 누르면 소리 ${pressedPlays} · 우리말 숨김 ${koHidden}`);
    const lower = await tab.eval(`[...document.querySelectorAll('[data-word-bank] button')].map((b) => (b.innerText || '').trim())`);
    // every tile must be a word of this lesson (a distractor comes from its other sentences — 'with' is fine when s1-1 #2 has it;
    // the first version of this check banned the old fixed list outright and failed on a legitimate 'with', 2026-09-27)
    const lessonWords = new Set(JSON.parse(fs.readFileSync(path.join(H.REPO, "content/lessons/student/s1-1.json"), "utf8")).blocks.find((b) => b.type === "sentences").items.flatMap((it) => it.text.toLowerCase().replace(/[()/.,!?]/g, " ").split(/\s+/)).filter(Boolean));
    const foreign = lower.filter((w) => !lessonWords.has(w.toLowerCase()));
    check("D2 첫 낱말 타일은 소문자 · 방해 낱말도 이 강의 낱말", lower.includes("nice") && !lower.includes("Nice") && foreign.length === 0, `타일 ${lower.join(" · ")}${foreign.length ? ` · 강의 밖 ${foreign.join(",")}` : ""}`);
    await place(tab, ["to", "nice", "meet", "you", "sir"]);
    await click(tab, '[data-action="check"]', 400);
    const fb1 = await attr(tab, "[data-feedback]", "data-feedback");
    const retry = await count(tab, '[data-action="retry-from"]');
    const koShown = await count(tab, "[data-dictation] [data-ko]");
    check("D3 틀리면 틀린 자리 · '여기부터 다시' · 우리말", fb1 === "wrong" && retry === 1 && koShown === 1, `판정 ${fb1} · 여기부터 다시 ${retry} · 우리말 ${koShown}`);
    await click(tab, '[data-action="retry-from"]', 300);
    const cnt1 = await text(tab, "[data-count]");
    await place(tab, ["nice", "to", "meet", "you", "sir"]);
    await click(tab, '[data-action="check"]', 600);
    const fb2 = await attr(tab, "[data-feedback]", "data-feedback");
    const pill0 = await attr(tab, '[data-pill="0"]', "data-state");
    check("D4 여기부터 다시 → 바르게 → 정답", /내 문장 0\//.test(cnt1 || "") && fb2 === "correct" && pill0 === "solved", `되돌린 뒤 '${cnt1}' · 판정 ${fb2} · 번호 ${pill0}`);
    // sentence 2 by hints only
    await click(tab, '[data-action="next"]', 1200);
    for (let i = 0; i < 12; i++) {
      const done = await tab.eval(`(() => { const c = document.querySelector('[data-count]'); const m = c && c.innerText.match(/(\\d+)\\/(\\d+)/); return !!m && +m[1] >= +m[2]; })()`);
      if (done) break;
      await click(tab, '[data-action="hint"]', 150);
    }
    await click(tab, '[data-action="check"]', 600);
    const fb3 = await attr(tab, "[data-feedback]", "data-feedback");
    const pill1 = await attr(tab, '[data-pill="1"]', "data-state");
    check("D5 힌트로만 채우면 '힌트로 완성'(정답으로 안 셈)", fb3 === "hinted" && pill1 === "hinted", `판정 ${fb3} · 번호 ${pill1}`);

    // ------------------------------------------------------------------ M. Step 3 microphone (fake)
    await click(tab, '[data-step-tab="3"]', 800);
    const m1 = await speak(tab, 0, "nice to meet you sir");
    check("M1 'Nice to meet you sir' → 100점 빨강 0", m1.score === 100 && m1.red === 0, `${m1.score}점 (${m1.label}) · 빨강 ${m1.red} · 초록 ${m1.green} · 읽었어요 ${m1.said}`);
    const m2 = await speak(tab, 2, "first of all first of all thank you for giving me a chance to introduce myself");
    check("M2 앞 세 낱말 되풀이 → 85점 이상 빨강 0", m2.score >= 85 && m2.red === 0, `${m2.score}점 (${m2.label}) · 빨강 ${m2.red}`);
    const m3 = await speak(tab, 2, "first thank you for giving me chance to introduce myself");
    check("M3 70~79점은 '통과했어요'(완료와 '다시'가 같이 나오지 않음)", m3.score >= 70 && m3.score < 80 && m3.pass && m3.said === "true" && (BREAK === "mic" ? m3.score === 100 : true), `${m3.score}점 (${m3.label}) · 통과 문구 ${m3.pass} · 읽었어요 ${m3.said}`);
    await click(tab, '[data-step-panel="3"] [data-sentence="1"] [data-action="loop"]', 900);
    const loopOn = await attr(tab, '[data-step-panel="3"] [data-sentence="1"] [data-action="loop"]', "aria-pressed");
    const m4 = await speak(tab, 1, "it is a pleasure to be with you today");
    const loopAfter = await attr(tab, '[data-step-panel="3"] [data-sentence="1"] [data-action="loop"]', "aria-pressed");
    check("M4 반복 재생 중 마이크를 켜면 반복이 멈춤", loopOn === "true" && loopAfter === "false", `반복 켜짐 ${loopOn} → 마이크 뒤 ${loopAfter} · 점수 ${m4.score}`);

    // ------------------------------------------------------------------ C. completion (80% rule) + engine
    // 2026-10-07 (UI검토-1007 2장 1번): the completion is the shared end bar's (section '강의 마치기') — no longer a box in Step 3
    const END = 'section[aria-label="강의 마치기"]';
    const completeSel = `${END} button[aria-label="학습 완료 체크"]`;
    const disabledBefore = await tab.eval(`(() => { const b = ${q(completeSel)}; return b ? b.disabled : null; })()`);
    // dictation 3/3: sentence 2 (hinted) again without hints, sentence 3
    await click(tab, '[data-step-tab="2"]', 800);
    await click(tab, '[data-pill="1"]', 900);
    await click(tab, '[data-action="reset"]', 200);
    await place(tab, ["it’s", "a", "pleasure", "to", "be", "with", "you", "today"]);
    await click(tab, '[data-action="check"]', 600);
    const fbS2 = await attr(tab, "[data-feedback]", "data-feedback");
    await click(tab, '[data-pill="2"]', 900);
    await place(tab, ["first", "of", "all", "thank", "you", "for", "giving", "me", "a", "chance", "to", "introduce", "myself"]);
    await click(tab, '[data-action="check"]', 600);
    const fbS3 = await attr(tab, "[data-feedback]", "data-feedback");
    await click(tab, '[data-step-tab="3"]', 800);
    for (const i of [0, 1, 2]) if ((await attr(tab, `[data-step-panel="3"] [data-sentence="${i}"] [data-action="said"]`, "aria-pressed")) !== "true") await click(tab, `[data-step-panel="3"] [data-sentence="${i}"] [data-action="said"]`, 200);
    const disabledAfter = await tab.eval(`(() => { const b = ${q(completeSel)}; return b ? b.disabled : null; })()`);
    check("C1 연습 전에는 완료가 꺼지고 80% 뒤 켜짐", disabledBefore === true && disabledAfter === false, `전 disabled ${disabledBefore} · 뒤 disabled ${disabledAfter} · 받아쓰기 2번 ${fbS2} · 3번 ${fbS3}`);
    const t0 = Date.now();
    if (BREAK !== "complete") await click(tab, completeSel, 900);
    const doneText = await text(tab, END);
    const nextAria = await attr(tab, `${END} a[aria-label^="다음 강의"]`, "aria-label");
    check("C2 완료 → '학습 완료함' · 다음 강의 Ch 1-2", /학습 완료함/.test(doneText || "") && /^다음 강의: Ch 1-2 · /.test(nextAria || "") && (await count(tab, `${END} button[aria-label="학습 완료 취소"]`)) === 1, `${(doneText || "").replace(/\s+/g, " ").slice(0, 90)} · ${nextAria}`);
    const rec = await store(tab, "kig-learning:student");
    const day = learningDay(t0);
    const items = rec ? Object.keys(rec.items || {}) : [];
    const lessonDone = rec && rec.lessons && rec.lessons["s1-1"];
    const wantItems = BREAK === "engine" ? ["s1-1#1", "s1-1#2"] : ["s1-1#1", "s1-1#2", "s1-1#3"];
    check("C3 공통 엔진: 강의 날짜 {at, day} · 문장 3개가 내일부터 복습", !!lessonDone && lessonDone.day === day && typeof lessonDone.at === "string" && JSON.stringify(items.sort()) === JSON.stringify(wantItems) && items.every((k) => rec.items[k].firstDay === day), `lessons.s1-1 ${JSON.stringify(lessonDone)} · items ${items.join(",")} · 기록 ${rec ? rec.log.length : 0}건`);
    await H.load(tab, "/student/s1-1", { marker: H.MARKERS.student });
    await click(tab, '[data-step-tab="3"]', 800);
    const persisted = await count(tab, `${END} button[aria-label="학습 완료 취소"]`);
    check("C4 새로 고침 뒤에도 완료 · 받아쓰기 기록 그대로", persisted === 1, `완료 취소 단추 ${persisted}`);
    await H.click(tab, `document.querySelector('${END} a[aria-label^="다음 강의"]')`, { settle: 2500 });
    const went = await tab.eval("location.pathname");
    check("C5 '다음 강의' → s1-2(이용권 없음 — 기다릴 저장 없음)", went === "/student/s1-2", `→ ${went}`);

    // ------------------------------------------------------------------ I. s1-2 my info
    await H.load(tab, "/student/s1-2", { marker: H.MARKERS.student });
    await click(tab, '[data-step-tab="3"]', 800);
    await click(tab, "[data-my-info] > summary", 300);
    const inputs = await count(tab, "[data-my-info] input");
    await H.type(tab, `document.querySelectorAll('[data-my-info] input')[0]`, "Minjun Kim");
    await H.type(tab, `document.querySelectorAll('[data-my-info] input')[1]`, "Busan");
    await H.sleep(400);
    const s0 = await text(tab, '[data-step-panel="3"] [data-sentence="0"] [data-en]');
    check("I1 내 정보가 3단계 문장에 보임", inputs >= 5 && /Minjun Kim/.test(s0 || "") && /Busan/.test(s0 || ""), `칸 ${inputs} · 1번 문장 '${s0}'`);
    await H.audioLog(tab, { clear: true });
    await click(tab, '[data-step-panel="3"] [data-sentence="0"] [data-action="play"]', 2500);
    const log3 = await H.audioLog(tab);
    const clips = [...new Set(log3.filter((e) => e.ev === "play()").map((e) => new URL(e.src).pathname))];
    // the clip the view has always asked for: spokenEn = lessonSpeechForm(lesson, firstSlashAlternative(model sentence))
    const s12 = JSON.parse(fs.readFileSync(path.join(H.REPO, "content/lessons/student/s1-2.json"), "utf8")).blocks.find((b) => b.type === "sentences").items[0].text;
    const speechForm = H.loadTs(path.join(H.REPO, "src/lib/lessonSpeechForm.ts")).lessonSpeechForm;
    const firstForm = H.loadTs(path.join(H.REPO, "src/lib/listeningUtils.ts")).firstSlashAlternative;
    const want = new URL(H.expectedClip(speechForm("student/s1-2", firstForm(s12))), "http://x").pathname;
    const ttsWithText = log3.filter((e) => e.ev === "tts.speak" && (e.text || "").trim()).length;
    check("I2 듣기는 모범 문장 클립 그대로 · 브라우저 음성 0", clips.length === 1 && clips[0] === want && ttsWithText === 0, `클립 ${clips.join(",")} · 모범 문장의 클립 ${want} · 같음 ${clips[0] === want} · 글 있는 브라우저 음성 ${ttsWithText}`);
    const i3 = await speak(tab, 0, "my name is minjun kim and i live in busan");
    check("I3 내 정보로 말해도 100점", i3.score === 100 && i3.red === 0, `${i3.score}점 (${i3.label}) · 빨강 ${i3.red}`);

    // ------------------------------------------------------------------ G. GRAMMAR engine
    await H.load(tab, "/grammar1/gh1-006", { marker: H.MARKERS.grammar1 });
    await H.type(tab, `document.querySelector('textarea[aria-label="1번 영작 답안"]')`, "I is a student.");
    await H.click(tab, `(() => { const box = document.querySelector('textarea[aria-label="1번 영작 답안"]'); const row = box && box.closest('[data-item], li'); return row ? row.querySelector('[data-check]') : null; })()`, { settle: 500 });
    const g1log = await store(tab, "kig-learning:grammar1");
    const gAttempt = g1log && g1log.log.find((e) => e.item === "gh1-006#1");
    await H.click(tab, q('main button[aria-label="학습 완료 체크"]'), { settle: 900 });
    const g = await store(tab, "kig-learning:grammar1");
    const gItems = g ? Object.keys(g.items || {}) : [];
    const gOk = !!g && !!g.lessons["gh1-006"] && g.lessons["gh1-006"].day === learningDay(Date.now()) && gItems.includes("gh1-006#1") && !gItems.includes("gh1-006#2");
    check("G1 GRAMMAR: 틀린 1번 기록 · 완료 → 강의 날짜 · 1번만 복습(안 푼 2번 없음)", gOk && !!gAttempt && gAttempt.correct === false, `시도 ${gAttempt ? `${gAttempt.item} correct=${gAttempt.correct} help=${gAttempt.help}` : "없음"} · lessons ${JSON.stringify(g && g.lessons["gh1-006"])} · items ${gItems.join(",")}`);
    await H.click(tab, q('main button[aria-label="학습 완료 취소"]'), { settle: 600 });
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
