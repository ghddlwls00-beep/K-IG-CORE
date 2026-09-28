#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 관리자 화면의 'PASS-OFF 진도' 와 STUDENT 목록이 그대로인지, 실제 브라우저(헤드리스 Edge, 데스크톱)로
 * (코드 단계 C · 그 점검 반영). 코드 단계 C 의 세션 스크래치 drive-admin.cjs 를 저장소로 옮긴 것.
 *
 * 준비는 drive-topic-lock.cjs 와 같음(버리는 시험 비밀값으로 켠 `npx next dev -p 3461`). 끝나면 data/*.json 을 지운다.
 *   node docs/pass-off-grammar/검사/drive-topic-admin.cjs --secrets <json> [--base http://localhost:3461] [--break=<아래>]
 *
 *   M1 STUDENT 목록(/student) — STUDENT 이용권: 1장 '…강과 마지막 강의를 마치면 다음 장' · 2장 '1장을 마치면 열립니다' · 자물쇠 ·
 *      줄 '앞 장을 마치면 열림'(STUDENT 문구 그대로 — 이 과정의 'TOPIC' 문구가 새지 않음). 2026-09-28 main 합친 뒤: 기준 문구는
 *      main 의 공통 틀 2(STU-U28)가 새로 짠 목록의 것 — 전의 '해금 기준 …강 + 마지막 강의' · '챕터 1 완료 후 해금' · '이전 챕터 완료 필요'
 *   M2 관리자 /admin/license — 'PASS-OFF 진도' → 'TOPIC 2까지 열림' · '완료 레슨 3/N' · 대주제 칩
 *   M3 '진도 초기화'(확인 창 두 번 — 두 번째 창에 '기기에 남은 레슨 연습 기록은 지워지지 않습니다') → TOPIC 1 · 0/N,
 *      학습자 쪽 API 도 1
 *   M4 '수동 해금' 에서 TOPIC 3까지 → 'TOPIC 3까지 열림' · 학습자 API 도 3 · 목록에 TOPIC 3 보다 낮은 칸은 없음(올리기만)
 *   M5 'STUDENT 진도' 는 그대로 열림(현재 챕터 1까지 해금)
 *   M6 LIFE 코드의 'PASS-OFF 진도' → 'LIFE — 모든 TOPIC 열림' · 칩 모두 '열림' · 수동 해금 칸 없음(점검 7)
 *   M7 콘솔 오류 · 예외 0(음성 파일 502 제외)
 *   M8 (단계 2-나 E2) '내 답도 맞아요' 신고 모아 보기: 이 이용권의 학습 기록에 올라간 신고 하나 → '신고 불러오기' → 그 문항(레슨 이름 ·
 *      한국어 · 신고 1건 · 학습자 1명 · 신고한 답) · 판정 단추 없음(보기만) · 이용권 코드는 목록 밖 어디에도 없음(이름 없는 묶음)
 *   준비의 TOPIC 2 열기는 구성도 다시 채우기 조건(단계 2-나 E2 에서 켬) 때문에 레슨 셋과 { mapRefillTopic: 1 } 을 같이 보냄
 *   깨기(각각 exit 1 이어야): --break=no-reset(초기화를 안 누름 → M3 FAIL) · --break=no-settopic(수동 해금을 안 고름 → M4 FAIL) ·
 *     --break=no-report(신고를 올리지 않음 → M8 FAIL)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const ORIGIN = arg("base", "http://localhost:3461");
const BREAK = arg("break", "");
if (BREAK && !["no-reset", "no-settopic", "no-report"].includes(BREAK)) {
  console.error(`모르는 깨기: ${BREAK} — no-reset · no-settopic · no-report`);
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN)) {
  console.error(`로컬 서버에만 씁니다 — ${ORIGIN}`);
  process.exit(2);
}
const secretsFile = arg("secrets");
if (!secretsFile || !fs.existsSync(secretsFile)) {
  console.error("--secrets <json> 가 필요합니다(서버를 켤 때 넣은 버리는 시험 비밀값)");
  process.exit(2);
}
const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
const total = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8")).lessons.length;
const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const cs = crypto.createHmac("sha256", sec.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${cs}`;
};
const results = [];
const check = (label, ok, detail) => {
  results.push({ label, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ""}`);
};
async function waitFor(tab, expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expr).catch(() => false)) return true;
    await sleep(250);
  }
  return false;
}
/** an element's row on the admin list: its nearest ancestor that shows a licence code (two codes are listed here) */
const ROW_OF = `(el) => { let x = el.parentElement; while (x && !/KIG-[A-Z0-9]+-[0-9A-F]{16}-[0-9A-F]{16}/.test(x.innerText || '')) x = x.parentElement; return x; }`;
/** the button with this label in the row of this code → click it */
const clickRowButton = (key, label) => `(() => {
  const rowOf = ${ROW_OF};
  const bs = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === ${JSON.stringify(label)});
  for (const b of bs) { const row = rowOf(b); if (row && row.innerText.includes(${JSON.stringify(key)})) { b.click(); return 'clicked'; } }
  return 'none of ' + bs.length;
})()`;
/** the PASS-OFF panel in the row of this code (its text starts with 'PASS-OFF GRAMMAR') */
const passoffPanel = (key) => `(() => {
  const rowOf = ${ROW_OF};
  const panels = [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR'));
  for (const p of panels) { const row = rowOf(p); if (row && row.innerText.includes(${JSON.stringify(key)})) return p.innerText.replace(/\\s+/g, ' '); }
  return '';
})()`;
const panelText = (start) => `(() => { const el = [...document.querySelectorAll('div.rounded-2xl')].find(d => d.innerText.trim().startsWith(${JSON.stringify(start)})); return el ? el.innerText.replace(/\\s+/g, ' ') : ''; })()`;
const activate = (key, keep) => `(async () => {
  const dev = localStorage.getItem('kig:device:id:v1');
  const r = await fetch('/api/license/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, deviceId: dev, deviceName: 'topic admin drive' }) });
  const d = await r.json();
  if (!d.success) return d.error || r.status;
  ${keep ? "localStorage.setItem('kig:license:v1', JSON.stringify({ maskedKey: d.maskedKey, licenseId: d.licenseId, plan: d.plan, activatedAt: d.activatedAt || Date.now(), expiresAt: d.expiresAt, token: d.licenseToken }));" : ""}
  return 'ok';
})()`;

(async () => {
  const profile = path.join(os.tmpdir(), `kig-drive-topic-admin-${Date.now()}`);
  const { proc, port } = await launch({ port: 9464, profile });
  const tab = await Tab.open(port);
  try {
    await tab.viewport("desktop");
    await tab.goto(ORIGIN + "/passoff-grammar", 2000);
    const key = makeKey("STU1Y");
    const lifeKey = makeKey("LIFE");
    // a LIFE code registered to this browser too (listed on the admin page) — the STUDENT pass stays the one in use
    const act = await tab.eval(activate(lifeKey, false));
    const act2 = await tab.eval(activate(key, true));
    const progress = await tab.eval(`fetch('/api/progress/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: [...['pg01-1','pg01-2','pg01-3'].map(lessonId => ({ lessonId, completed: true })), { mapRefillTopic: 1 }] }) }).then(x => x.json()).then(p => p.progress.unlockedThrough)`);
    if (act !== "ok" || act2 !== "ok" || progress !== 2) throw new Error(`setup: ${act} · ${act2} · unlockedThrough ${progress}`);
    // one "내 답도 맞아요" in this licence's learning record (the engine's shape — a report on pg01-1's first ④ sentence)
    const lessonFile = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar/pg01-1.json"), "utf8"));
    const reported = lessonFile.blocks.find((b) => b.type === "drill").produce[0];
    // an answer of this run only — the stand-in store may hold earlier runs' reports on the same item
    const reportAnswer = `Zq my own answer ${crypto.randomBytes(3).toString("hex")} is right.`;
    if (BREAK !== "no-report") {
      const day = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
      const sent = await tab.eval(`fetch('/api/learning/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: null, record: { v: 1, course: 'passoff-grammar', lessons: {}, items: {}, log: [], reports: [{ item: ${JSON.stringify(reported.id)}, answer: ${JSON.stringify(reportAnswer)}, day: ${JSON.stringify(day)}, status: 'pending' }], lastStudyDay: ${JSON.stringify(day)} } }) }).then(r => r.status)`);
      if (sent !== 200) throw new Error(`report setup: ${sent}`);
    }

    // M1 STUDENT's list, as it was
    await tab.goto(ORIGIN + "/student", 2500);
    await waitFor(tab, `(document.querySelector('main') || document.body).innerText.includes('서버에 저장됨')`);
    const s0 = await tab.eval(`document.querySelector('#section-0 button[aria-expanded]').innerText.replace(/\\s+/g, ' ')`);
    const s1 = await tab.eval(`document.querySelector('#section-1 button[aria-expanded]').innerText.replace(/\\s+/g, ' ')`);
    await tab.eval(`document.querySelector('#section-1 button[aria-expanded]').click(), true`);
    await sleep(500);
    // textContent: main's rows are content-visibility:auto, so a row below the screen has an empty innerText
    const card = await tab.eval(`(document.querySelector('#section-1 li') || {}).textContent || ''`);
    const lock1 = await tab.eval(`Boolean(document.querySelector('#section-1 button[aria-expanded] svg[aria-label="잠김"]'))`);
    check("M1 STUDENT 목록: 1장 '…강과 마지막 강의를 마치면 다음 장' · 2장 '1장을 마치면 열립니다' · 자물쇠 · 줄 '앞 장을 마치면 열림'(TOPIC 없음)",
      /\d+강과 마지막 강의를 마치면 다음 장/.test(s0) && /1장을 마치면 열립니다/.test(s1) && lock1 && card.includes("앞 장을 마치면 열림") && !`${s0} ${s1} ${card}`.includes("TOPIC"),
      { s0, s1, lock1, card: card.replace(/\s+/g, " ").slice(0, 80) });

    // M2 admin
    const login = await tab.eval(`fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: ${JSON.stringify(sec.ADMIN_PIN)} }) }).then(r => r.json()).then(d => d.success)`);
    await tab.goto(ORIGIN + "/admin/license", 2500);
    await waitFor(tab, `document.body.innerText.includes(${JSON.stringify(key)})`, 12000);
    // both confirm windows say yes; the words of each are kept
    await tab.eval(`window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return true; }; true`);
    const c1 = await tab.eval(clickRowButton(key, "PASS-OFF 진도"));
    await waitFor(tab, `${passoffPanel(key)} !== ''`);
    const p1 = await tab.eval(passoffPanel(key));
    check(`M2 관리자: 'PASS-OFF 진도' → 'TOPIC 2까지 열림' · '완료 강의 3/${total}' · TOPIC 칩`, login === true && c1 === "clicked" && p1.includes("TOPIC 2까지 열림") && p1.includes(`완료 강의 3/${total}`) && p1.includes("TOPIC 1 · 3/3 · 완료") && p1.includes("TOPIC 2 · 0/3 · 열림") && p1.includes("TOPIC 3 · 0/3 · 잠김"), p1.slice(0, 200));

    // M3 reset
    if (BREAK !== "no-reset") {
      await tab.eval(`(() => { const panels = [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR')); for (const panel of panels) { const b = [...panel.querySelectorAll('button')].find(x => x.innerText.trim() === '진도 초기화'); if (b) { b.click(); return true; } } return false; })()`);
    }
    await waitFor(tab, `${passoffPanel(key)}.includes('TOPIC 1까지 열림')`, 6000);
    const p2 = await tab.eval(passoffPanel(key));
    const learner = await tab.eval(`fetch('/api/progress/passoff-grammar', { cache: 'no-store' }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    const confirms = await tab.eval(`window.__confirms`);
    check(`M3 '진도 초기화' → TOPIC 1 · 0/${total} · 학습자 API 도 1 · 확인 창에 '기기에 남은 … 연습 기록은 지워지지 않습니다'`,
      p2.includes("TOPIC 1까지 열림") && p2.includes(`완료 강의 0/${total}`) && learner === 1 && confirms.length === 2 && confirms[1].includes("연습 기록은 지워지지 않습니다"),
      { panel: p2.slice(0, 90), learner, confirm2: (confirms[1] || "").slice(0, 80) });

    // M4 the owner's manual open — up only
    const options = await tab.eval(`(() => { for (const panel of [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR'))) { const s = panel.querySelector('select'); if (s) return [...s.options].map(o => o.value); } return null; })()`);
    if (BREAK !== "no-settopic") {
      await tab.eval(`(() => { for (const panel of [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR'))) { const s = panel.querySelector('select'); if (!s) continue; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, '3'); s.dispatchEvent(new Event('change', { bubbles: true })); return true; } return false; })()`);
    }
    await waitFor(tab, `${passoffPanel(key)}.includes('TOPIC 3까지 열림')`, 6000);
    const p3 = await tab.eval(passoffPanel(key));
    const learner3 = await tab.eval(`fetch('/api/progress/passoff-grammar', { cache: 'no-store' }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    const options3 = await tab.eval(`(() => { for (const panel of [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR'))) { const s = panel.querySelector('select'); if (s) return [...s.options].map(o => o.value); } return null; })()`);
    check("M4 '수동 해금' TOPIC 3까지 → 패널 'TOPIC 3까지 열림' · 학습자 API 3 · 그 뒤 고를 칸은 3 이상만",
      options && options[0] === "1" && p3.includes("TOPIC 3까지 열림") && learner3 === 3 && options3 && options3.every((v) => Number(v) >= 3),
      { before: options && options.join(","), after: options3 && options3.join(","), learner3 });

    // M5 STUDENT's button, as it was
    const c5 = await tab.eval(clickRowButton(key, "STUDENT 진도"));
    await waitFor(tab, `${panelText("현재 챕터")} !== ''`);
    const p5 = await tab.eval(panelText("현재 챕터"));
    check("M5 'STUDENT 진도' 그대로 — '현재 챕터 1까지 해금'", c5 === "clicked" && p5.includes("현재 챕터 1까지 해금"), p5.slice(0, 90));

    // M6 a LIFE code
    const c6 = await tab.eval(clickRowButton(lifeKey, "PASS-OFF 진도"));
    await waitFor(tab, `${passoffPanel(lifeKey)} !== ''`);
    const p6 = await tab.eval(passoffPanel(lifeKey));
    const lifeSelect = await tab.eval(`(() => { const panels = [...document.querySelectorAll('div.rounded-2xl')].filter(d => d.innerText.trim().startsWith('PASS-OFF GRAMMAR · LIFE')); return panels.length ? Boolean(panels[0].querySelector('select')) : null; })()`);
    check("M6 LIFE 코드: 'LIFE — 모든 TOPIC 열림' · 칩 모두 '열림' · 수동 해금 칸 없음", c6 === "clicked" && p6.includes("LIFE — 모든 TOPIC 열림") && !p6.includes("잠김") && lifeSelect === false, { panel: p6.slice(0, 160), lifeSelect });

    // M8 the reports, grouped by item — read only, no names
    const loadButton = await tab.eval(`(() => { const s = document.querySelector('[data-admin-learning-reports]'); const b = s && [...s.querySelectorAll('button')].find(x => x.innerText.trim() === '신고 불러오기'); if (!b) return 'no button'; b.click(); return 'clicked'; })()`);
    await waitFor(tab, `Boolean(document.querySelector('[data-admin-learning-reports] [role=status]'))`, 10000);
    const reportRow = await tab.eval(`(() => { const e = document.querySelector('[data-report-item=${JSON.stringify(reported.id)}]'); return e ? e.innerText.replace(/\\s+/g, ' ') : null; })()`);
    const section = await tab.eval(`(() => { const s = document.querySelector('[data-admin-learning-reports]'); return s ? { buttons: [...s.querySelectorAll('button')].map(b => b.innerText.trim()), text: s.innerText } : null; })()`);
    const small = await tab.eval(`[...document.querySelectorAll('[data-admin-learning-reports] button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length`);
    check(`M8 신고 모아 보기: '신고 불러오기' → ${reported.id}(1인칭 · 한국어 · 신고 N건 · 학습자 N명 · 이번에 올린 답 '${reportAnswer}') · 판정 단추 없음 · 코드 0 · 44px 미만 0`,
      loadButton === "clicked" && reportRow && reportRow.includes("1인칭") && reportRow.includes(reported.ko) && /신고 \d+건/.test(reportRow) && /학습자 \d+명/.test(reportRow) && reportRow.includes(reportAnswer) &&
        section && section.buttons.length === 1 && section.buttons[0] === "다시 불러오기" && !section.text.includes(key) && small === 0,
      { loadButton, reportRow: reportRow && reportRow.slice(0, 200), buttons: section && section.buttons, small });

    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/502|Failed to load resource/.test(e));
    check("M7 콘솔 오류 · 예외 0(음성 파일 502 제외)", errs.length === 0, errs.slice(0, 5));
  } finally {
    await tab.close();
    proc.kill();
    await sleep(800);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${results.length - bad.length}/${results.length} ok`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
