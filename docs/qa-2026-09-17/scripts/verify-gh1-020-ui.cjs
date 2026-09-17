#!/usr/bin/env node
/**
 * GRAMMAR I 07강 (gh1-020 / gh1-021) and the R-01 replacement passages, in a real (headless Edge)
 * browser against an ISOLATED `next dev` (port 3217): durable storage blanked, random LICENSE_* /
 * ADMIN_SESSION_SECRET, no PIN; stops before any write unless the admin list starts empty.
 *
 *  gh1-020 (07강) — owner: must teach like the other GRAMMAR lessons
 *   - exactly the same four study steps as its neighbour gh1-022 (08강)
 *   - 24 Korean prompts with one answer box each (was 16 Korean Q&A items); 전체 정답 보기 shows the
 *     24 English answers; Step 2 has blanks; the page player requests the English clip
 *     "I am a boy." and never a Korean one
 *   - the 8 be-verb rule Q&A are a folded summary (closed at first), not offered as answers
 *  pr012, pr251 (new passages): every English sentence and the 14 cards of the data on screen
 *  screenshot: docs/qa-2026-09-17/out/gh1-020-steps.png
 *
 *   node verify-gh1-020-ui.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const PORT = 3217;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "../out");
const DATA_FILES = ["data/license-devices.json", "data/student-progress.json"].map((f) => path.join(REPO, f));
for (const f of DATA_FILES) if (fs.existsSync(f)) { console.error(`STOP: ${f} exists`); process.exit(2); }

const secrets = { LICENSE_SALT: crypto.randomBytes(24).toString("hex"), LICENSE_SECRET: crypto.randomBytes(24).toString("hex"), ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex") };
const childEnv = { ...process.env, ...secrets, NODE_ENV: "development", PORT: String(PORT) };
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"]) childEnv[k] = " ";
delete childEnv.VERCEL;
Object.assign(process.env, secrets);
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const adminAuth = loadTs(path.join(REPO, "src/lib/adminAuth.ts"));
const serverLicense = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const { unifiedSpeechKey } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const adminCookie = `${adminAuth.ADMIN_COOKIE_NAME}=${adminAuth.createAdminSessionToken()}`;

const g21 = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/grammar1/gh1-021.json"), "utf8"));
const answers = [];
const lines = g21.blocks.filter((b) => b.type === "instruction").map((b) => b.text);
lines.forEach((l, i) => { if (/^\(\d+\)/.test(l)) answers.push(lines[i + 1].replace(/^답:\s*/, "")); });
const examplesEn = g21.blocks.find((b) => b.type === "sentences").items.map((s) => s.text);
const reading = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail });
const clickText = (tab, selector, text) => tab.eval(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`);
const squash = (s) => String(s).replace(/\s+/g, " ").trim();

async function open(tab, url, readyText, state) {
  await tab.send("Page.navigate", { url });
  let s = "";
  for (let i = 0; i < 240 && !s; i++) {
    await sleep(500);
    s = await tab.eval(`document.querySelector('[data-kig-paywall="license"]') ? 'paywall' : (document.body.innerText.includes(${JSON.stringify(readyText)}) ? 'open' : '')`).catch(() => "");
  }
  if (s === "paywall" && !state.registered) {
    await sleep(1500);
    await clickText(tab, "[data-kig-paywall] button", "이용권 코드 등록");
    for (let i = 0; i < 20 && !(await tab.eval("!!document.querySelector('#license-code')").catch(() => false)); i++) await sleep(250);
    const key = serverLicense.generateLicenseKey("1Y");
    await tab.eval(`(() => { const el = document.querySelector('#license-code'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(key)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.form.requestSubmit(); })()`);
    state.registered = true;
    s = "";
    for (let i = 0; i < 120 && s !== "open"; i++) { await sleep(500); s = await tab.eval(`!document.querySelector('[data-kig-paywall="license"]') && document.body.innerText.includes(${JSON.stringify(readyText)}) ? 'open' : ''`).catch(() => ""); }
  }
  await sleep(1200);
  return s;
}

(async () => {
  const next = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORT)], { cwd: REPO, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  next.stdout.on("data", (d) => (log += d));
  next.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/api/admin/check`)).ok) break; } catch {} await sleep(1000); }
    const guard = await fetch(`${BASE}/api/license/status`, { headers: { cookie: adminCookie } });
    const gbody = await guard.json().catch(() => ({}));
    const isolated = guard.status === 200 && gbody.records && Object.keys(gbody.records).length === 0;
    check("isolated server (admin list starts empty)", isolated, `status ${guard.status}`);
    if (!isolated) throw new Error("not isolated — stopping before any write");

    browser = await launch({ port: 9382 });
    const tab = await Tab.open(browser.port);
    await tab.viewport("desktop");
    const state = { registered: false };

    // ── gh1-022 (08강), the neighbour: which steps does a GRAMMAR I lesson have? ──
    const steps = () => tab.eval(`[...document.querySelectorAll('nav[aria-label="문법 4단계 학습 모드"] button')].map((b) => b.innerText.replace(/\\s+/g, " ").trim())`);
    const s2 = await open(tab, `${BASE}/grammar1/gh1-022`, "Step 1 · 영작 훈련", state);
    check("gh1-022 (08강) opens", s2 === "open");
    const neighbourSteps = await steps();

    // ── gh1-020 (07강) ──
    const s1 = await open(tab, `${BASE}/grammar1/gh1-020`, "Step 1 · 영작 훈련", state);
    check("gh1-020 (07강) opens with the test licence", s1 === "open", s1 || "timeout");
    const ownSteps = await steps();
    check(`gh1-020: the same four study steps as 08강 (${neighbourSteps.join(" / ")})`, neighbourSteps.length === 4 && JSON.stringify(ownSteps) === JSON.stringify(neighbourSteps), JSON.stringify(ownSteps));
    let text = squash(await tab.eval("document.body.innerText"));
    check(`gh1-020: 총 ${examplesEn.length}개 문항 (was 16 Korean Q&A items), first prompt 나는 소년이다.`, text.includes(`총 ${examplesEn.length}개 문항`) && text.includes("나는 소년이다.") && text.includes("우리는 학생이다."), "");
    const composeBoxes = await tab.eval(`document.querySelectorAll('main input[type=text]').length`);
    check(`gh1-020: one answer box per sentence (${examplesEn.length})`, composeBoxes === examplesEn.length, String(composeBoxes));

    const rules = await tab.eval(`(() => { const d = [...document.querySelectorAll('main details')].find((x) => x.innerText.includes('문법 확인')); return d ? { open: d.open, items: d.querySelectorAll('li').length } : null; })()`);
    check("gh1-020: the 8 be-verb rule Q&A kept as a folded summary (closed at first)", rules && rules.items === 8 && rules.open === false, JSON.stringify(rules));
    check("gh1-020: no Korean rule answer is offered as an English answer", !text.includes(answers[0]), answers[0]);

    await clickText(tab, "main button", "전체 정답 보기");
    await sleep(500);
    text = squash(await tab.eval("document.body.innerText"));
    check("gh1-020: 전체 정답 보기 shows the English answers (I am a boy. … Aren't I your friend?)", examplesEn.every((e) => text.includes(e)), examplesEn.filter((e) => !text.includes(e)).join(" | "));
    await tab.eval(`[...document.querySelectorAll('main details')].find((x) => x.innerText.includes('문법 확인')).open = true`);
    await sleep(300);
    text = squash(await tab.eval("document.body.innerText"));
    check("gh1-020: opening the summary shows all 8 rule answers", answers.every((a) => text.includes(squash(a))), "");
    await tab.eval(`window.scrollTo(0, 0)`);
    await sleep(300);
    const shot = await tab.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, "gh1-020-steps.png"), Buffer.from(shot.data, "base64"));

    await clickText(tab, "nav button", "Step 2 · 빈칸 완성");
    await sleep(600);
    const blanks = await tab.eval(`document.querySelectorAll('main input').length`);
    check("gh1-020: Step 2 빈칸 완성 has blanks to fill (am / is / are …)", blanks >= examplesEn.length, String(blanks));

    tab.resetEvents();
    await tab.eval(`document.querySelector('button[aria-label="재생"]')?.click()`);
    await sleep(3000);
    const firstKey = unifiedSpeechKey("I am a boy.");
    const koKeys = ["문법 확인 문제", "(1)평서문(나는 소년이다 등등)일 때 영어의 문장순서는?", "나는 소년이다."].map(unifiedSpeechKey);
    const clipReqs = tab.events.requests.filter((u) => u.includes("azure-ava"));
    check("gh1-020: the page player reads the English sentences (first clip 'I am a boy.'), no Korean clip", clipReqs.some((u) => u.includes(`${firstKey}.mp3`)) && !clipReqs.some((u) => koKeys.some((k) => u.includes(`${k}.mp3`))), clipReqs.join(" | "));
    await tab.eval(`document.querySelector('button[aria-label="정지"]')?.click()`).catch(() => {});

    // ── new READING passages ──
    for (const id of ["pr012", "pr251"]) {
      const data = reading(id);
      const s = await open(tab, `${BASE}/reading/${id}`, "Step 2 · 핵심 어휘", state);
      if (s !== "open") { check(`${id} opens`, false, s); continue; }
      await clickText(tab, "nav button", "Step 1");
      await sleep(600);
      const t1 = squash(await tab.eval("document.body.innerText"));
      const missing = data.readingSentences.find((x) => !t1.includes(squash(x.english)));
      check(`${id}: every sentence of the new passage on screen (${data.readingSentences.length})`, !missing, missing ? missing.english : "");
      await clickText(tab, "nav button", "Step 2");
      await sleep(600);
      await clickText(tab, "section[aria-label='Key Vocabulary'] button", "전체 뜻 보기");
      await sleep(400);
      const shown = await tab.eval(`[...document.querySelectorAll("section[aria-label='Key Vocabulary'] div.rounded-2xl")].filter((c) => [...c.querySelectorAll('span')].some((s) => /^#\\d\\d$/.test(s.textContent.trim()))).map((c) => { const sp = [...c.querySelectorAll('span')]; const m = sp.find((s) => s.className.includes('text-[13.5px]')); return [sp[0]?.textContent.trim(), sp[1]?.textContent.trim(), m ? m.textContent.trim() : null].join('|'); })`);
      const expected = data.readingVocabulary.map((c) => [c.partOfSpeech, c.word, c.korean].join("|"));
      check(`${id}: the 14 new cards on screen as in the data`, J(shown) === J(expected), `${shown.length} shown`);
    }

    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/Download the React DevTools|HMR|Fast Refresh|eval\(\) is not supported in this environment|Failed to load resource.*(403|404)|Server rejected license/.test(e));
    check("no unexpected console errors", errs.length === 0, errs.slice(0, 3).join(" | "));
    await tab.close();
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    next.kill();
    await sleep(1500);
    for (const f of DATA_FILES) fs.rmSync(f, { force: true });
    fs.writeFileSync(path.join(OUT, "gh1-020-ui-server.log"), log.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted]"));
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
function J(x) { return JSON.stringify(x); }
