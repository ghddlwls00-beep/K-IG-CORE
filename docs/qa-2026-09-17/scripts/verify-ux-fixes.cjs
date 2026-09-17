#!/usr/bin/env node
/**
 * UX-02 / UX-03 / UX-05 / UX-06 — the audit's own measurements (small-targets.cjs,
 * a11y-templates.cjs) run again, unchanged, against a LOCAL production build (`next start`,
 * port 3216, storage variables blanked), and compared with what they measured on the live site
 * during the audit (out/small-targets.json, out/a11y-templates.json). Run `pnpm build` first.
 *
 *  - UX-05/06: none of the controls the audit named is under 24 px any more (sentence dots,
 *    speed chips, 이전/다음, 🔊 발음, 다음 Box로 승급, 💡 뜻 확인하기, 📋, 기본/크게/특대)
 *  - UX-05: the sentence slider is one 24 px control and moves the player to the chosen
 *    sentence with the keyboard (/ld/d001, 390 px)
 *  - UX-02: light-theme contrast failures on the 9 audited pages — none of the texts the audit
 *    listed, and the total is lower than on the live site
 *  - UX-03: no control named only by an emoji
 *
 *   node verify-ux-fixes.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3216;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "../out");
const env = { ...process.env, NODE_ENV: "production", PORT: String(PORT), LICENSE_SALT: crypto.randomBytes(24).toString("hex"), LICENSE_SECRET: crypto.randomBytes(24).toString("hex"), ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex") };
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"]) env[k] = " ";
delete env.VERCEL;

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const NAMED = /문장으로 이동|문장 이동|^0\.8×$|^1×$|^1\.2×$|^이전$|^다음$|이전 문장|다음 문장|발음$|다음 Box로 승급|뜻 확인하기|📋|문장 복사|^기본$|^크게$|^특대$|^보통$/;
const UX02_TEXTS = ["STAGE", "CURRICULUM", "클릭하여 보기 👁️", "Step 1. 블라인드 리스닝", "K-IG VOCA COGNITIVE MASTERY", "Step 2", "Step 3", "Step 4", "Word Cluster #", "Acoustic Cognitive System", "총", "0", "전체 본문 듣기", "🙈 모두 가림 (순수 리스닝)", "🎧 BLIND AUDIO", "자막 없이 소리에만 귀 기울이기", "1"];

(async () => {
  const server = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { cwd: REPO, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    let up = false;
    for (let i = 0; i < 90 && !up; i++) { try { up = (await fetch(`${BASE}/`)).ok; } catch {} if (!up) await sleep(1000); }
    check("local production build is serving", up);
    if (!up) throw new Error("server did not start");

    const run = (script) => spawnSync(process.execPath, [path.join(__dirname, script)], { env: { ...process.env, BASE, OUT_SUFFIX: "-local" }, encoding: "utf8", timeout: 900000 });
    run("small-targets.cjs");
    run("a11y-templates.cjs");

    // UX-05 / UX-06 — small targets
    const flat = (file) => Object.values(JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8")).result).flat().flatMap((s) => s.items || []);
    const before = flat("small-targets.json"), after = flat("small-targets-local.json");
    const namedBefore = before.filter((i) => NAMED.test(i.label)), namedAfter = after.filter((i) => NAMED.test(i.label));
    check(`UX-05/06: controls the audit named that are under 24 px — live ${namedBefore.length} → local ${namedAfter.length}`, namedBefore.length > 0 && namedAfter.length === 0, [...new Set(namedAfter.map((i) => `${i.label} ${i.w}×${i.h}`))].join(" | "));
    check(`UX-05/06: all controls under 24 px on the 6 lesson templates (all steps) — live ${before.length} → local ${after.length}`, after.length < before.length, [...new Set(after.map((i) => `${i.label} ${i.w}×${i.h}`))].slice(0, 12).join(" | "));

    // UX-02 / UX-03 — contrast and names
    const a11y = (file) => JSON.parse(fs.readFileSync(path.join(OUT, file), "utf8")).results;
    const lightFails = (rows) => rows.filter((r) => r.scheme === "light" && r.audit && r.audit.contrast).flatMap((r) => r.audit.contrast.samples.map((s) => ({ url: r.url, ...s })));
    const countLight = (rows) => rows.filter((r) => r.scheme === "light" && r.audit && r.audit.contrast).reduce((n, r) => n + r.audit.contrast.failCount, 0);
    const countDark = (rows) => rows.filter((r) => r.scheme === "dark" && r.audit && r.audit.contrast).reduce((n, r) => n + r.audit.contrast.failCount, 0);
    const aBefore = a11y("a11y-templates.json"), aAfter = a11y("a11y-templates-local.json");
    const listed = lightFails(aAfter).filter((s) => UX02_TEXTS.includes(s.text) && s.ratio < 4.5 && s.url !== "/cnn/cnn001");
    check("UX-02: none of the light-theme texts the audit listed fails 4.5:1", listed.length === 0, listed.map((s) => `${s.url} "${s.text}" ${s.ratio}`).slice(0, 8).join(" | "));
    check(`UX-02: light-theme contrast failures, 9 pages × 2 widths — live ${countLight(aBefore)} → local ${countLight(aAfter)}`, countLight(aAfter) < countLight(aBefore), lightFails(aAfter).map((s) => `${s.url} "${s.text}" ${s.ratio}`).slice(0, 8).join(" | "));
    check(`dark theme not made worse — live ${countDark(aBefore)} → local ${countDark(aAfter)}`, countDark(aAfter) <= countDark(aBefore));
    const darkOnGold = aAfter.filter((r) => r.scheme === "dark" && r.audit && r.audit.contrast).flatMap((r) => r.audit.contrast.samples.filter((s) => s.ratio < 3 && r.url !== "/cnn/cnn001").map((s) => `${r.url} "${s.text}" ${s.ratio}`));
    check("dark theme: no text under 3:1 outside CNN (white on gold was 2.1:1 on STUDENT and LISTENING)", darkOnGold.length === 0, darkOnGold.join(" | "));
    const symbols = aAfter.flatMap((r) => ((r.audit && r.audit.symbolOnly) || []).map((x) => `${r.url} ${JSON.stringify(x)}`));
    check("UX-03: no control named only by an emoji (was STUDENT 🔁)", symbols.length === 0, symbols.join(" | "));

    // UX-05 — the slider works (keyboard) on a free lesson at phone width
    browser = await launch({ port: 9381 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("mobile");
    await tab.send("Page.navigate", { url: `${BASE}/ld/d001` });
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { await sleep(500); ready = await tab.eval(`!!document.querySelector('input[aria-label="문장 이동"]')`).catch(() => false); }
    const box = ready ? await tab.eval(`(() => { const r = document.querySelector('input[aria-label="문장 이동"]').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), max: document.querySelector('input[aria-label="문장 이동"]').max }; })()`) : null;
    check("UX-05: one sentence slider, at least 24 px tall, spanning the bar", box && box.h >= 24 && box.w >= 50, JSON.stringify(box));
    if (ready) {
      await tab.eval(`document.querySelector('input[aria-label="문장 이동"]').focus()`);
      await tab.key("ArrowRight"); await sleep(150); await tab.key("ArrowRight"); await sleep(1200);
      const state = await tab.eval(`(() => { const el = document.querySelector('input[aria-label="문장 이동"]'); const counter = [...document.querySelectorAll('span')].map((s) => s.textContent.trim()).find((t) => /^\\d+\\/\\d+$/.test(t)); return { value: el.value, valuetext: el.getAttribute('aria-valuetext'), counter }; })()`);
      check("UX-05: two ArrowRight presses select sentence 3 and the player moves there", state.valuetext && state.valuetext.startsWith("3번째") && state.counter && state.counter.startsWith("3/"), JSON.stringify(state));
      const shot = await tab.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT, "ux-player-slider-d001.png"), Buffer.from(shot.data, "base64"));
    }
    await tab.close();
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    server.kill();
    await sleep(1000);
    fs.writeFileSync(path.join(OUT, "ux-fixes-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
