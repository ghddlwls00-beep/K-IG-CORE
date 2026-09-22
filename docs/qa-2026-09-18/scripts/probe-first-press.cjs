#!/usr/bin/env node
/**
 * RETEST 276건의 정체 — 받아쓰기 단계의 "🔊 표준 속도" 첫 누름이 실제로 소리를 내는가.
 *
 * 스윕의 판정은 "오디오 요청이 있었나"(네트워크)라서 둘을 구분하지 못한다.
 *   (가) 클립이 이미 캐시에 있어 요청이 안 나감 → 소리는 정상
 *   (나) 첫 누름이 먹지 않음 → 276강 전부에서 학습자가 소리를 못 들음
 *
 * 그래서 네트워크가 아니라 **오디오 요소 자체**를 본다: play()/playing 이벤트,
 * paused, currentTime 이 실제로 흐르는지, readyState.
 *
 *   node probe-first-press.cjs [--ids d001,d100,d250] [--port 9650]
 * Output: out/first-press.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const IDS = arg("--ids", "d001,d100,d250").split(",");
const PORT = Number(arg("--port", 9650));
const OUT = path.join(__dirname, "../out");

/** 페이지의 모든 audio 요소를 감시한다. 앱은 공유 audio 하나를 쓰지만 확인은 전부. */
const WATCH = `(() => {
  window.__fp = { events: [], els: [] };
  const track = (el) => {
    if (el.__fpWatched) return;
    el.__fpWatched = true;
    window.__fp.els.push(el);
    for (const ev of ["play", "playing", "pause", "ended", "error", "loadstart", "canplay", "timeupdate"]) {
      el.addEventListener(ev, () => {
        if (ev === "timeupdate") {
          const last = window.__fp.events[window.__fp.events.length - 1];
          if (last && last.ev === "timeupdate") { last.t = el.currentTime; last.n = (last.n || 1) + 1; return; }
        }
        window.__fp.events.push({ ev, t: el.currentTime, src: (el.currentSrc || "").split("/").pop(), at: Date.now() });
      });
    }
  };
  document.querySelectorAll("audio").forEach(track);
  const origPlay = window.HTMLMediaElement.prototype.play;
  window.HTMLMediaElement.prototype.play = function (...a) {
    track(this);
    window.__fp.events.push({ ev: "play() 호출", t: this.currentTime, src: (this.currentSrc || this.src || "").split("/").pop(), at: Date.now() });
    return origPlay.apply(this, a);
  };
  new MutationObserver(() => document.querySelectorAll("audio").forEach(track)).observe(document.documentElement, { childList: true, subtree: true });
  return true;
})()`;

const STATE = `(() => {
  const els = (window.__fp && window.__fp.els) || [...document.querySelectorAll("audio")];
  return {
    events: (window.__fp ? window.__fp.events : []).slice(0, 40),
    elements: els.map((e) => ({ paused: e.paused, currentTime: Number(e.currentTime.toFixed(2)), duration: Number((e.duration || 0).toFixed(2)), readyState: e.readyState, src: (e.currentSrc || "").split("/").pop() })),
  };
})()`;

(async () => {
  const browser = await H.startBrowser("first-press", PORT);
  const tab = await H.openTab(browser);
  const rows = [];

  for (const id of IDS) {
    await H.load(tab, `/ld/${id}`, { marker: null });
    await tab.eval(WATCH);
    // 받아쓰기 단계로 이동 (단계 버튼은 재생 버튼이 아니므로 오디오와 무관)
    await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /탭-딕테이션/.test(b.innerText || '') && (b.offsetParent || b.getClientRects().length))`, { settle: 1200 });
    await tab.eval(`window.__fp.events.length = 0`);

    const before = await tab.eval(STATE);
    // 첫 누름 — 딱 한 번만
    const click = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /표준 속도/.test(b.innerText || '') && (b.offsetParent || b.getClientRects().length))`, { settle: 0 });
    // 8 초 동안 오디오가 실제로 흐르는지 본다
    let progressed = false;
    for (let i = 0; i < 40; i++) {
      await H.sleep(200);
      const s = await tab.eval(STATE);
      if (s.elements.some((e) => !e.paused && e.currentTime > 0.15)) { progressed = true; break; }
    }
    const after = await tab.eval(STATE);
    const evs = after.events.map((e) => e.ev);
    const row = {
      id,
      clicked: click.ok,
      소리남: progressed,
      playCalled: evs.includes("play() 호출"),
      playingEvent: evs.includes("playing"),
      errorEvent: evs.includes("error"),
      maxCurrentTime: Math.max(0, ...after.elements.map((e) => e.currentTime)),
      elements: after.elements,
      events: after.events.slice(0, 12),
    };
    rows.push(row);
    console.log(`${id}: 클릭 ${click.ok ? "성공" : "실패"} · play() ${row.playCalled ? "호출됨" : "없음"} · playing ${row.playingEvent ? "발생" : "없음"} · currentTime 최대 ${row.maxCurrentTime}s → ${progressed ? "소리 남 (가)" : "소리 안 남 (나)"}`);
    for (const e of after.events.slice(0, 8)) console.log(`     ${e.ev.padEnd(12)} t=${Number(e.t || 0).toFixed(2)} ${e.src || ""}`);
  }

  fs.writeFileSync(path.join(OUT, "first-press.json"), JSON.stringify({ at: new Date().toISOString(), rows }, null, 1));
  const bad = rows.filter((r) => !r.소리남);
  console.log(`\n${rows.length}강 중 첫 누름에 소리가 난 강의 ${rows.length - bad.length} · 안 난 강의 ${bad.length}`);
  console.log(bad.length ? "→ (나) 의심: 첫 누름이 먹지 않음" : "→ (가): 요청만 없었을 뿐 소리는 정상");
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
