// LECTURE voice — step M on a local dev server: with a voice attached to lm001 (free lecture), the <audio> is the clock.
// Play · pause · bar · 1.5× · 2× · 처음부터 · end → '이 강의 학습 완료'. No autoplay. Desktop + mobile. Edge headless via CDP.
// How to run (연구-기록.md 4장): put a voice.mp3 for lm001 in .lecture-media/audio/lecture/lm001/ and list lm001 in
// docs/lecture/voice-manifest.json → node scripts/lecture/build-lecture.mjs → node scripts/buildFreeSpeechKeys.mjs →
// node scripts/lecture/voice/local-media-server.mjs (3399) → R2_PUBLIC_BASE_URL=http://127.0.0.1:3399 npx next dev -p 3391 →
// node docs/lecture/AI음성/check-site-voice.cjs   (BASE · PORT env to change; delete the edge-<PORT> profile folder after).
// 2026-10-17 with the original's own audio as a local stand-in (never uploaded): 34/34 PASS, desktop and mobile.
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const BASE = process.env.BASE || "http://localhost:3391";
const PORT = Number(process.env.PORT || 9932);
const rows = [];
const row = (vp, what, ok, saw) => { rows.push({ vp, what, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${vp} · ${what} — ${typeof saw === "string" ? saw : JSON.stringify(saw)}`); };
const A = `document.querySelector('[data-lecture-view] audio')`;
const state = (tab) => tab.eval(`(() => { const v = document.querySelector('[data-lecture-view]'); const a = ${A}; const bar = document.querySelector('input[aria-label="재생 위치"]'); const end = document.querySelector('section[aria-label="강의 마치기"] button[data-lesson-complete]'); return { load: v && v.dataset.lectureState, playing: v && v.dataset.lecturePlaying, time: (document.querySelector('[data-lecture-time]') || {}).innerText, audio: a ? { src: a.getAttribute('src'), paused: a.paused, t: +a.currentTime.toFixed(2), rate: a.playbackRate, dur: +a.duration.toFixed(3), ready: a.readyState } : null, bar: bar ? { value: bar.value, max: bar.max, disabled: bar.disabled, text: bar.getAttribute('aria-valuetext') } : null, endBtn: end ? { disabled: end.disabled, state: end.dataset.lessonComplete, name: end.getAttribute('aria-label'), reason: (end.parentElement.innerText || '').replace(/\\s+/g, ' ').slice(0, 60) } : null }; })()`);
const clickLabel = (tab, label) => tab.eval(`(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || x.textContent.trim()) === ${JSON.stringify(label)} || (x.getAttribute('aria-label') || '').startsWith(${JSON.stringify(label)})); if (!b || b.disabled) return false; b.click(); return true; })()`);
const inkPixels = (tab) => tab.eval(`(() => { const cs = [...document.querySelectorAll('[data-lecture-view] canvas')]; let n = 0; for (const c of cs) { const ctx = c.getContext('2d'); if (!ctx) continue; const d = ctx.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++; } return n; })()`);
const seekTo = (tab, v) => tab.eval(`(() => { const i = document.querySelector('input[aria-label="재생 위치"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${v}); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return i.value; })()`);
async function waitServer() {
  for (let i = 0; i < 240; i++) { try { const r = await fetch(`${BASE}/lecture`); if (r.status < 500) return; } catch {} await sleep(2000); }
  throw new Error("dev server not up");
}
(async () => {
  await waitServer();
  const { proc } = await launch({ port: PORT, profile: path.join(__dirname, `edge-${PORT}`) });
  try {
    for (const vp of ["desktop", "mobile"]) {
      const tab = await Tab.open(PORT);
      await tab.viewport(vp);
      try {
        await tab.goto(`${BASE}/lecture/lm001`, 6000);
        let s = await state(tab);
        row(vp, "열림 — 소리 있음 · 멈춰 있음 · 0:00 · 자동 재생 없음", s.audio && s.audio.src === "/audio/lecture/lm001/voice.mp3" && s.audio.paused && s.playing === "0" && /^0:00/.test(s.time || ""), s);
        await sleep(3000);
        s = await state(tab);
        row(vp, "3초 뒤에도 그대로(자동 재생 없음) · 길이 457", s.audio.paused && s.audio.t === 0 && Math.abs(s.audio.dur - 457.176) < 0.2 && s.load === "ready", { t: s.audio.t, dur: s.audio.dur, load: s.load, bar: s.bar });
        const ink0 = await inkPixels(tab);
        row(vp, "처음엔 필기 0", ink0 === 0, { ink: ink0 });
        row(vp, "재생 누름", await clickLabel(tab, "재생"), "");
        await sleep(4000);
        s = await state(tab);
        const ink1 = await inkPixels(tab);
        // lm001's first stroke is at 13.68 s (pen.json), so nothing is drawn yet at 3–4 s
        row(vp, "4초 재생 — 소리 시계 3~5초 · 재생 표시 · 필기 아직 0(첫 획 13.7초)", !s.audio.paused && s.audio.t >= 3 && s.audio.t <= 5.5 && s.playing === "1" && ink1 === 0, { t: s.audio.t, time: s.time, ink: ink1 });
        row(vp, "일시정지", await clickLabel(tab, "일시정지"), "");
        await sleep(800);
        s = await state(tab);
        const tPause = s.audio.t;
        await sleep(2000);
        s = await state(tab);
        row(vp, "멈춤 — 소리 · 표시 둘 다 멈춤", s.audio.paused && s.playing === "0" && Math.abs(s.audio.t - tPause) < 0.05, { t: s.audio.t, tPause });
        // 1.5×
        await clickLabel(tab, "빠르기 1×");
        await sleep(300);
        s = await state(tab);
        row(vp, "빠르기 단추 → 1.5× (소리 playbackRate)", s.audio.rate === 1.5, { rate: s.audio.rate });
        await clickLabel(tab, "재생");
        const t0 = (await state(tab)).audio.t;
        await sleep(4000);
        s = await state(tab);
        row(vp, "1.5× 로 4초 — 소리 시계 +5.4~6.6초", !s.audio.paused && s.audio.t - t0 >= 5.2 && s.audio.t - t0 <= 7, { from: t0, to: s.audio.t });
        await clickLabel(tab, "빠르기 1.5×");
        await sleep(300);
        s = await state(tab);
        row(vp, "→ 2×", s.audio.rate === 2, { rate: s.audio.rate });
        await clickLabel(tab, "일시정지");
        await clickLabel(tab, "빠르기 2×");
        await sleep(300);
        // the first strokes (13.68–15.12 s) appear while the voice passes them: seek 13 → play 2.5 s at 1×
        await seekTo(tab, 13);
        await sleep(600);
        const inkAt13 = await inkPixels(tab);
        await clickLabel(tab, "재생");
        await sleep(2500);
        s = await state(tab);
        const inkAt15 = await inkPixels(tab);
        await clickLabel(tab, "일시정지");
        row(vp, "13초에서 재생 → 15초: 첫 획이 소리를 따라 그려짐", inkAt13 === 0 && inkAt15 > 0 && s.audio.t >= 15 && s.audio.t <= 16.5, { t: s.audio.t, ink: [inkAt13, inkAt15] });
        // bar → 100 s
        const inkBefore = await inkPixels(tab);
        await seekTo(tab, 100);
        await sleep(1500);
        s = await state(tab);
        const inkSeek = await inkPixels(tab);
        row(vp, "막대 100초 — 소리 시계 100 · 표시 1:40 · 필기 더 그려짐", Math.abs(s.audio.t - 100) < 1 && /^1:40/.test(s.time || "") && inkSeek > inkBefore, { t: s.audio.t, time: s.time, ink: [inkBefore, inkSeek] });
        await seekTo(tab, 20);
        await sleep(1500);
        s = await state(tab);
        const inkBack = await inkPixels(tab);
        row(vp, "막대 20초 — 되감기 · 필기 줄어듦", Math.abs(s.audio.t - 20) < 1 && inkBack < inkSeek, { t: s.audio.t, ink: inkBack });
        row(vp, "완료 아직 아님", s.endBtn && s.endBtn.disabled, s.endBtn);
        // 처음부터
        await clickLabel(tab, "처음부터");
        await sleep(800);
        s = await state(tab);
        row(vp, "처음부터 — 0초 · 멈춤 · 필기 0", s.audio.t === 0 && s.audio.paused && (await inkPixels(tab)) === 0, { t: s.audio.t, paused: s.audio.paused });
        // end
        await seekTo(tab, Number((await state(tab)).bar.max));
        await sleep(2500);
        s = await state(tab);
        row(vp, "막대 끝 — 완료 단추 열림 · 시계 끝", s.endBtn && !s.endBtn.disabled && s.audio.t >= 457, { t: s.audio.t, endBtn: s.endBtn, time: s.time });
        const ev = tab.events;
        const voiceReq = ev.requests.filter((u) => u.includes("/audio/lecture/lm001/voice.mp3")).length;
        const bad = ev.badResponses.filter((b) => !/favicon/.test(b.url));
        row(vp, "소리 요청 있음 · 예외 · 콘솔 오류 · 4xx/5xx 0", voiceReq > 0 && !ev.exceptions.length && !ev.console.length && !bad.length, { voiceReq, exceptions: ev.exceptions.slice(0, 2), console: ev.console.slice(0, 3), bad: bad.slice(0, 3), failed: ev.failed.slice(0, 3) });
      } finally {
        await tab.eval("localStorage.clear()").catch(() => {});
        await tab.close();
      }
    }
  } finally {
    proc.kill();
  }
  const fail = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - fail}/${rows.length} PASS (FAIL ${fail})`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
