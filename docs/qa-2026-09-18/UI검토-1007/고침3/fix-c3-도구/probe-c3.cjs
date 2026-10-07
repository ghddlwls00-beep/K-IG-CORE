#!/usr/bin/env node
// fix-c3(고침3 · 2026-10-08) — 공통 부품 고침을 로컬 dev 3383 · 이용권 없는 빈 프로필로 확인하고 뒤 사진을 찍는다.
//   ① 59 끝 막대 '이 강의 학습 완료' 단추 이름 = 보이는 글 · aria-pressed 없음 · data-lesson-complete(todo/done)
//        VOCA mv1-01(꺼짐 · 이유 줄) · 이 기기 완료 기록을 넣은 VOCA mv1-01(완료 → '학습 완료함 · 취소하려면 누르세요') · STUDENT s1-1(꺼짐)
//   ② 17 PASS-OFF pg01-1 Step 2 'Step 1에서 …' · 'Step 1로'(Enter → 초점 Step 1 탭) · 화면 글에 'N단계' 0
//   ③ 42 어둠: STUDENT s1-1 고른 칩('모두' · '1×') · PASS-OFF 글자 크기 · 문장 속도 고른 칩에 ring(StepTabs 와 같은 색)
//   사진: 390 · 1366 × 밝음 · 어둠 — STUDENT s1-1 Step 1 · PASS-OFF pg01-1 Step 2 · PASS-OFF 설정 칩 · 끝 막대
//   node probe-c3.cjs [--break]   (--break: 읽기 직전에 DOM 을 옛 모양으로 되돌려(aria-label '학습 완료 체크' · aria-pressed ·
//                                   ring 없음 · '1단계로') 모든 칸이 FAIL 하는지 — 검사가 실패할 수 있음을 보임)
// 앱 · 점검 도구는 바꾸지 않음. GET 아닌 /api/ 요청은 막음(이용권 · 진도 쓰기 0). 이 기기 완료 기록은 빈 프로필 사본에만 씀.
const fs = require("fs");
const os = require("os");
const path = require("path");
const empty = path.join(os.tmpdir(), "fixc3-empty-profile-src");
fs.mkdirSync(empty, { recursive: true });
process.env.KIG_PROFILE_SOURCE = empty;
process.env.KIG_CLONE_PREFIX = "kig-fixc3-free-";
process.env.BASE = process.env.BASE || "http://localhost:3383";
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const BREAK = process.argv.includes("--break");
const OUT = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/c-fix-c3", BREAK ? "break" : "뒤");
const res = { at: new Date().toISOString(), break: BREAK, checks: [], shots: [] };
const ok = (name, pass, detail) => { res.checks.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name} ${JSON.stringify(detail).slice(0, 400)}`); };

const VIEWS = { phone: [390, 844, true], desktop: [1366, 900, false] };
async function view(tab, kind) {
  const [w, h, mobile] = VIEWS[kind];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const theme = (tab, t) => tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: t }] });
async function shot(tab, rel) {
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  const file = path.join(OUT, rel + ".jpg");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  res.shots.push(path.relative(path.join(REPO, "docs/qa-2026-09-18/out/ui-1007"), file).replace(/\\/g, "/"));
}
const key = async (tab, k, code, vk) => {
  await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k === "Enter" ? "\r" : undefined });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
  await H.sleep(120);
};
const scrollTo = (tab, sel) => tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; })()`);

// --break: the old DOM, put back just before a read
const OLD_BUTTON = `(() => { const b = document.querySelector('section[aria-label="강의 마치기"] button'); if (b) { const done = b.getAttribute('data-lesson-complete') === 'done'; b.setAttribute('aria-label', done ? '학습 완료 취소' : '학습 완료 체크'); b.setAttribute('aria-pressed', String(done)); } return true; })()`;
const OLD_CHIPS = `(() => { document.querySelectorAll('[aria-pressed="true"]').forEach((b) => { b.classList.remove('dark:ring-1', 'dark:ring-line-input'); }); return true; })()`;
const OLD_STEP1 = `(() => { const b = [...document.querySelectorAll('section:not([hidden]) button')].find((x) => x.innerText.trim() === 'Step 1로'); if (b) b.innerText = '1단계로'; return true; })()`;

const END_BUTTON = `(() => { const s = document.querySelector('section[aria-label="강의 마치기"]'); if (!s) return null; const b = s.querySelector('button'); if (!b) return { button: null, text: s.innerText.replace(/\\s+/g, ' ') };
  const visible = b.innerText.replace(/\\s+/g, ' ').trim().replace(/\\s*·\\s*/g, ' · ');
  const reason = b.getAttribute('aria-describedby') ? (document.getElementById(b.getAttribute('aria-describedby')) || {}).innerText || null : null;
  return { name: b.getAttribute('aria-label'), visible, pressed: b.getAttribute('aria-pressed'), mark: b.getAttribute('data-lesson-complete'), disabled: b.disabled, reason }; })()`;
const nameOk = (b) => !!b && !!b.name && b.name === b.visible && b.pressed === null;
const RING = (sel) => `(() => [...document.querySelectorAll(${JSON.stringify(sel)})].filter((b) => b.offsetParent).map((b) => ({ t: b.innerText.trim(), ring: getComputedStyle(b).boxShadow })))()`;
const hasRing = (list) => list.length > 0 && list.every((c) => /rgb\(110, 106, 101\) 0px 0px 0px 1px/.test(c.ring));

(async () => {
  const need = 1.2 * 1024 ** 3;
  for (let i = 0; i < 30 && os.freemem() < need; i++) { console.log(`남은 메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1.2 — 1분`); await H.sleep(60000); }
  res.freeGB = +(os.freemem() / 1024 ** 3).toFixed(2);
  const browser = await H.startBrowser("fixc3-probe", 9976, { fresh: true });
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params; let p = ""; try { p = new URL(q.request.url).pathname; } catch {}
        const pass = /^(GET|HEAD|OPTIONS)$/.test(q.request.method) || (q.request.method === "POST" && /^\/api\/license\/(verify|session)$/.test(p));
        if (pass) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
        else { res.blocked = (res.blocked || 0) + 1; tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });

    // ① 59 — VOCA (gate closed), VOCA completed on this device, STUDENT (gate closed)
    await theme(tab, "light");
    await view(tab, "phone");
    await H.load(tab, "/phonics/mv1-01", { settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('section[aria-label="강의 마치기"] button')`, 20000);
    await H.sleep(800);
    if (BREAK) await tab.eval(OLD_BUTTON);
    const v0 = await tab.eval(END_BUTTON);
    ok("59 VOCA mv1-01 꺼짐: 이름 = 보이는 글 '이 강의 학습 완료' · aria-pressed 없음 · data-lesson-complete=todo · 이유 줄 그대로",
      nameOk(v0) && v0.name === "이 강의 학습 완료" && v0.mark === "todo" && v0.disabled === true && !!v0.reason, v0);
    await tab.eval(`(() => { const k = 'kig:progress:completed'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o['phonics:mv1-01'] = true; localStorage.setItem(k, JSON.stringify(o)); return true; })()`);
    await H.load(tab, "/phonics/mv1-01", { settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('section[aria-label="강의 마치기"] button[data-lesson-complete="done"]')`, 20000);
    if (BREAK) await tab.eval(OLD_BUTTON);
    const v1 = await tab.eval(END_BUTTON);
    ok("59 VOCA mv1-01 완료(이 기기): 이름 = 보이는 글 '학습 완료함 · 취소하려면 누르세요' · aria-pressed 없음 · done · 켜짐",
      nameOk(v1) && v1.name === "학습 완료함 · 취소하려면 누르세요" && v1.mark === "done" && v1.disabled === false, v1);
    for (const t of ["light", "dark"]) for (const vp of ["phone", "desktop"]) {
      // the theme is applied when the page loads — load it again for each look
      await theme(tab, t); await view(tab, vp);
      await H.load(tab, "/phonics/mv1-01", { settle: 1200 });
      await H.waitFor(tab, `!!document.querySelector('section[aria-label="강의 마치기"] button[data-lesson-complete="done"]')`, 20000);
      await scrollTo(tab, 'section[aria-label="강의 마치기"]'); await H.sleep(300);
      await shot(tab, `${t === "light" ? "밝음" : "어둠"}/${vp}/voca_mv1-01_endbar-done`);
    }
    await tab.eval(`(() => { localStorage.removeItem('kig:progress:completed'); return true; })()`);
    await theme(tab, "light"); await view(tab, "phone");
    await H.load(tab, "/student/s1-1", { settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('section[aria-label="강의 마치기"] button')`, 20000);
    await H.sleep(800);
    if (BREAK) await tab.eval(OLD_BUTTON);
    const s0 = await tab.eval(END_BUTTON);
    ok("59 STUDENT s1-1 꺼짐: 이름 = 보이는 글 · aria-pressed 없음 · todo · 이유 줄('탭 딕테이션과 섀도잉을 각각 …')",
      nameOk(s0) && s0.name === "이 강의 학습 완료" && s0.mark === "todo" && s0.disabled === true && /탭 딕테이션과 섀도잉/.test(s0.reason || ""), s0);
    if (BREAK) await tab.eval(`(() => { const n = document.querySelector('[data-step-tab]').closest('nav'); n.setAttribute('aria-label', 'STUDENT 3단계 학습'); return true; })()`);
    const navName = await tab.eval(`(() => { const t = document.querySelector('[data-step-tab]'); return t ? t.closest('nav').getAttribute('aria-label') : null; })()`);
    ok("17 STUDENT 단계 탭 이름 '학습 단계'(옛 'STUDENT 3단계 학습')", navName === "학습 단계", { navName });

    // ③ 42 STUDENT chips + shots
    for (const t of ["light", "dark"]) for (const vp of ["phone", "desktop"]) {
      await theme(tab, t); await view(tab, vp);
      await H.load(tab, "/student/s1-1", { settle: 1200 });
      await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
      await H.sleep(400);
      if (t === "dark" && vp === "phone") {
        if (BREAK) await tab.eval(OLD_CHIPS);
        const chips = await tab.eval(RING('main [role=group] button[aria-pressed="true"]'));
        ok("42 STUDENT 어둠 고른 칩('모두' · '1×')에 ring(StepTabs 와 같은 --line-input)", hasRing(chips) && chips.length >= 2, chips);
      }
      await shot(tab, `${t === "light" ? "밝음" : "어둠"}/${vp}/student_s1-1_step1`);
      await scrollTo(tab, 'section[aria-label="강의 마치기"]'); await H.sleep(300);
      await shot(tab, `${t === "light" ? "밝음" : "어둠"}/${vp}/student_s1-1_endbar`);
    }

    // ② 17 PASS-OFF Step 2 + ③ settings chips
    for (const t of ["light", "dark"]) for (const vp of ["phone", "desktop"]) {
      await theme(tab, t); await view(tab, vp);
      await H.load(tab, "/passoff-grammar/pg01-1", { settle: 1200 });
      await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
      await H.click(tab, `document.querySelector('[data-step-tab="2"]')`, { settle: 700 });
      if (t === "light" && vp === "phone") {
        if (BREAK) await tab.eval(OLD_STEP1);
        const text = await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-2"]').innerText`);
        const nDan = (text.match(/\d+\s*단계/g) || []);
        res.endBarReason = await tab.eval(`(() => { const s = document.querySelector('section[aria-label="강의 마치기"]'); return s ? s.innerText.replace(/\\s+/g, ' ') : null; })()`);
        ok("17 PASS-OFF Step 2: 'Step 1에서 먼저 떠올린 문장만 …' · 'Step 1로' · 그 단계 글에 'N단계' 0",/Step 1에서 먼저 떠올린 문장만 영어로 보여요/.test(text) && /(^|\n)Step 1로($|\n)/.test(text) && nDan.length === 0, { nDan });
        const focused = await tab.eval(`(() => { const b = [...document.querySelectorAll('section:not([hidden]) button')].find((x) => x.innerText.trim() === 'Step 1로'); if (!b) return false; b.focus(); return document.activeElement === b; })()`);
        await key(tab, "Enter", "Enter", 13);
        await H.sleep(500);
        const after = await tab.eval(`(() => { const a = document.activeElement; return { tab: a && a.getAttribute('data-step-tab'), pressed: a && a.getAttribute('aria-pressed'), step: document.querySelector('[data-passoff-view]').getAttribute('data-step') }; })()`);
        ok("14 · 17 PASS-OFF 'Step 1로'(Enter) → 초점이 Step 1 탭(14 동작 그대로)", focused === true && after.tab === "1" && after.pressed === "true" && after.step === "1", { focused, after });
        await H.click(tab, `document.querySelector('[data-step-tab="2"]')`, { settle: 700 });
      }
      await tab.eval(`window.scrollTo(0, 0)`); await H.sleep(200);
      await shot(tab, `${t === "light" ? "밝음" : "어둠"}/${vp}/passoff_pg01-1_step2`);
      await H.click(tab, `document.querySelector('button[aria-label="글자 크기 · 문장 속도"]')`, { settle: 500 });
      if (t === "dark" && vp === "phone") {
        if (BREAK) await tab.eval(OLD_CHIPS);
        const chips = await tab.eval(RING('main [role=group] button[aria-pressed="true"]'));
        ok("42 PASS-OFF 어둠 고른 칩('기본' · '1.0×')에 ring", hasRing(chips) && chips.length >= 2, chips);
      }
      await shot(tab, `${t === "light" ? "밝음" : "어둠"}/${vp}/passoff_pg01-1_settings`);
    }
  } catch (e) {
    ok("실행", false, String(e && e.stack || e));
  } finally {
    try { browser.proc.kill(); } catch {}
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "probe-c3.json"), JSON.stringify(res, null, 2));
    const fails = res.checks.filter((c) => !c.pass).length;
    console.log(`${res.checks.length - fails}/${res.checks.length} PASS · 막은 쓰기 ${res.blocked || 0} · 사진 ${res.shots.length}`);
    process.exit(BREAK ? (fails === res.checks.length ? 0 : 1) : fails ? 1 : 0);
  }
})();
