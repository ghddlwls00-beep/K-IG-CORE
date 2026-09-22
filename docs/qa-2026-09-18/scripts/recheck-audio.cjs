#!/usr/bin/env node
/**
 * Isolation re-check for every play control the sweep could not settle (FAIL or RETEST).
 *
 * The sweep presses dozens of controls in quick succession; a clip that is still loading
 * can be aborted by the next press, and the app then falls back to browser TTS. That is the
 * driver's pacing, not necessarily the product. Here each such control gets a clean trial:
 * fresh page load, open the step the control lives on, ONE press, up to 12 s of waiting,
 * no other interaction. Only what fails here is reported as a product defect.
 *
 *   node recheck-audio.cjs [--course reading] [--limit N] [--port 9600]
 * Output: out/recheck-audio.jsonl (resumable) + summary.
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
// --course accepts a comma-separated list, and --suffix gives each parallel run its own output
// file, so the re-check can be split across the three browser slots this machine can hold.
const ONLY = arg("--course", null) ? new Set(arg("--course", "").split(",")) : null;
const SUFFIX = arg("--suffix", "");
const LIMIT = Number(arg("--limit", 0)) || 0;
const PORT = Number(arg("--port", 9600));
const OUT = path.join(__dirname, "../out");

/**
 * Which of the sweep's unsettled audio results are worth driving again?
 *
 * The sweep's play-control matcher was too broad: it also pressed the NEXT button ("다음 ▶️"),
 * the playback-speed toggles ("🔊 1.25x", "표준 속도"), and — because it matched on the English
 * word "play" — dictation word tiles and whole sentences. None of those are supposed to request a
 * clip, so waiting twelve seconds on each measured nothing and turned a re-check that should take
 * an hour into a two-day job. The liaison clinic's preset phrases are already settled
 * (LD-LIAISON-WITHDRAWN) and a microphone control records rather than plays.
 *
 * Everything excluded here is recorded as NOT APPLICABLE with its reason, never as a pass.
 */
const NOT_PLAYBACK = [
  { re: /🎙️|발음 테스트|발음 채점|녹음|따라 말하기|섀도잉 검증|말하기 연습|내 발음/, why: "마이크로 학습자 발음을 녹음하는 버튼 — 소리를 내지 않는 것이 정상" },
  { re: /다음\s*▶️|◀️\s*이전|다음 문장|이전 문장/, why: "다음·이전 이동 버튼 — 음성 버튼이 아님" },
  { re: /\b\d(\.\d+)?x\b|표준 속도|배속/, why: "재생 속도 전환 버튼 — 재생 중이 아니면 새 요청이 없는 것이 정상" },
];
const skipped = [];
function worthRechecking(a) {
  const control = String(a.control || "");
  const label = control.split(" ▶ ")[1] || control;
  for (const n of NOT_PLAYBACK) {
    if (n.re.test(control)) { skipped.push({ control, why: n.why }); return false; }
  }
  // the liaison presets are settled; their clips all exist
  if (/연음 & 소리 클리닉/.test(control) && /clip not in this lesson/.test(String(a.note || ""))) {
    skipped.push({ control, why: "연음 클리닉은 발음 규칙 preset 을 말함 — 클립 전부 존재 (LD-LIAISON-WITHDRAWN)" });
    return false;
  }
  // a real play control announces itself; plain words and sentences were matched by accident
  if (!/🔊|🔉|🔈|▶️|▶|재생|듣기|발음|청취|speak|play control/i.test(label)) {
    skipped.push({ control, why: "재생 버튼이 아닌 요소를 음성 컨트롤로 잘못 집었음 (단어 타일·문장 버튼 등)" });
    return false;
  }
  return true;
}

const targets = new Map();
for (const f of fs.readdirSync(path.join(OUT, "features")).filter((x) => x.endsWith(".jsonl") && !x.includes("smoke") && x !== "common.jsonl")) {
  for (const line of fs.readFileSync(path.join(OUT, "features", f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (ONLY && !ONLY.has(r.course)) continue;
    for (const a of r.audio || []) {
      if (a.status === "PASS") continue;
      if (!worthRechecking(a)) continue;
      const [step, label] = String(a.control).split(" ▶ ");
      const key = `${r.url}|${step}|${label}`;
      if (!targets.has(key)) targets.set(key, { course: r.course, id: r.id, url: r.url, step, label, sweepNote: a.note || "", viewports: new Set() });
      targets.get(key).viewports.add(r.viewport);
    }
  }
}
let list = [...targets.values()];
if (LIMIT) list = list.slice(0, LIMIT);
const out = H.jsonl(path.join(OUT, `recheck-audio${SUFFIX}.jsonl`), (r) => `${r.url}|${r.step}|${r.label}`);
// every recheck-audio*.jsonl counts as done, so parallel runs never repeat each other's work
const alreadyDone = new Set(out.done);
for (const f of fs.readdirSync(OUT).filter((x) => /^recheck-audio.*\.jsonl$/.test(x) && x !== `recheck-audio${SUFFIX}.jsonl`)) {
  for (const line of fs.readFileSync(path.join(OUT, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); alreadyDone.add(`${r.url}|${r.step}|${r.label}`); } catch {}
  }
}
list = list.filter((t) => !alreadyDone.has(`${t.url}|${t.step}|${t.label}`));
{
  const why = {};
  for (const s of skipped) why[s.why] = (why[s.why] || 0) + 1;
  fs.writeFileSync(path.join(OUT, "recheck-audio-skipped.json"), JSON.stringify({ at: new Date().toISOString(), total: skipped.length, why, samples: skipped.slice(0, 40) }, null, 1));
  console.log(`재검사에서 제외 (기록: out/recheck-audio-skipped.json) — ${skipped.length}건`);
  for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)} ${k}`);
}
console.log(`re-checking ${list.length} controls in isolation`);

(async () => {
  // one profile directory per parallel run — two Edge instances cannot share a user-data-dir, and
  // the second one silently failed to open its debugging port
  const browser = await H.startBrowser(`recheck${SUFFIX}`, PORT);
  try {
    const tab = await H.openTab(browser, { clean: true });
    await H.setViewport(tab, "desktop");
    let n = 0;
    const online = async () => { try { const r = await fetch(H.BASE + "/robots.txt", { signal: AbortSignal.timeout(10000) }); return r.ok; } catch { return false; } };
    for (const t of list) {
      while (!(await online())) { console.log("offline — waiting"); await H.sleep(60000); }
      const exp = E.expected(t.course, t.id);
      await H.load(tab, t.url, { marker: H.MARKERS[t.course] });
      if (t.step && t.step !== "(initial)") {
        await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t.step)})`, { settle: 900 });
      }
      await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
      // labels recorded by the sweep may end in " #n" = the n-th control with that same label
      const m = (t.label || "").trim().match(/^(.*?)(?: #(\d+))?$/);
      const want = m[1].trim();
      const nth = m[2] ? Number(m[2]) : 0;
      const c = await H.click(tab, `(() => {
        const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
        const all = [...document.querySelectorAll('main button, main [role=button], main a[href^="#"]')].filter((b) => b.offsetParent);
        const same = all.filter((b) => norm(norm(b.innerText) + ' ' + (b.getAttribute('aria-label') || '')) === ${JSON.stringify(want)});
        const loose = all.filter((b) => norm(b.innerText) === ${JSON.stringify(want)});
        return same[${nth}] || loose[${nth}] || same[0] || loose[0] || null;
      })()`);
      let log = [];
      for (let i = 0; i < 48; i++) {
        log = await H.audioLog(tab);
        if (log.some((e) => e.ev === "playing" || (e.ev === "error" && e.err !== 1) || (e.ev === "play-rejected" && e.name !== "AbortError") || (e.ev === "tts.speak" && (e.text || "").trim()))) break;
        await H.sleep(250);
      }
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      const clips = H.summariseAudio(log);
      const tts = (clips.__tts || []).filter((x) => x && x.trim());
      delete clips.__tts;
      const paths = Object.keys(clips);
      const played = paths.filter((p) => clips[p].playing > 0);
      const errored = paths.filter((p) => clips[p].error > 0 || clips[p].rejected > 0);
      const status = !c.ok ? "BLOCKED" : played.length && !tts.length ? "PASS" : errored.length || tts.length || !paths.length ? "FAIL" : "FAIL";
      const rec = {
        course: t.course, id: t.id, url: t.url, step: t.step, label: t.label, sweepViewports: [...t.viewports], sweepNote: t.sweepNote,
        clicked: c.ok, status,
        note: !c.ok ? `control not found (${c.reason})` : played.length && !tts.length ? "" : errored.length ? `clip error ${clips[errored[0]].errCode || clips[errored[0]].rejectName || ""}` : tts.length ? `browser TTS spoke: "${tts[0].slice(0, 60)}"` : !paths.length ? "no audio request in 12 s" : "requested but never played",
        clips: paths.map((p) => ({ path: p, ...clips[p], expected: exp.clipPaths.has(p) })),
        tts: tts.slice(0, 2),
        at: new Date().toISOString(),
      };
      out.write(rec);
      n++;
      console.log(`${n}/${list.length} ${rec.status.padEnd(7)} ${t.url} · ${t.step} ▶ ${String(t.label).slice(0, 30)} ${rec.note}`);
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
})();
