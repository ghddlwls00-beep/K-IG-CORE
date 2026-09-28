#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 점검 18(접근성): 누른 단추가 사라지는 자리에서 포커스가 어디로 가는지 · 같은 글의 단추가 제 이름을 갖는지를 실제
 * 브라우저(헤드리스 Edge 390×844, 탭 하나)로. 단추는 자판을 쓰는 사람처럼 누른다 — 그 단추에 포커스를 두고 Enter(CDP 의 진짜 키).
 *
 * 이용권 없이(로컬 운영 빌드 `npx next build` → `npx next start -p 3661 -H 127.0.0.1`, 이용권 · R2 값 없이 — 기기 기록을 엔진 함수로 만들어 넣음):
 *   F1 오늘 복습 — 다음 날 확인 한 문장을 틀린 뒤 결과 줄의 '내 답도 맞아요'(Enter) → 활성 요소 = 그 줄의 안내 문단
 *      (data-my-answer-report="sent" · role=status · '신고했어요') — BODY 가 아님
 *   F2 이어서 오늘 복습 카드 — 문장을 틀린 뒤 카드의 '내 답도 맞아요'(Enter) → 활성 요소 = 그 카드 안 안내 문단
 *   F3 오답노트 — 레슨 둘을 차례로 펼쳐 '지금 다시 풀기'의 접근 이름(브라우저가 계산한 것 — CDP Accessibility.getPartialAXTree)이
 *      '지금 다시 풀기 (레슨 이름)' · 두 레슨이 다름
 *   F5 콘솔 오류 · 예외 0(음성 파일 요청 제외 — 이 빌드엔 음성 저장소 값이 없음)
 * --secrets <json> 이면 구성도도(버리는 시험 비밀값 {LICENSE_SALT, LICENSE_SECRET} 을 환경에 넣고 이 작업 트리에서 켠
 * `npx next dev -p 3662 -H 127.0.0.1`, R2 값 없이 — 로컬 대체 저장소 data/*.json. 비밀값 파일은 커밋하지 않는다):
 *   F4 새 STUDENT 이용권 · TOPIC 1 레슨을 진도 API 로 마친 뒤 /passoff-grammar/map?topic=1 — 단계를 옮길 때마다(Enter) 활성 요소 = 새
 *      단계의 제목: 칩을 놓고 '다음' → '1.' 칸 제목 · '이전' → '레슨 놓기'(화면 읽기용 제목) · '다음' → '1.' · '다음 칸' → '2.' ·
 *      '이전' → '1.' · … · '결과 보기' → '구성도 결과' · '다시 하기' → '레슨 놓기'
 *   끝나면(서버를 끈 뒤) 그 작업 트리의 data/license-devices.json · passoff-progress.json · learning-passoff-grammar.json 을 지운다.
 * 깨기(각각 exit 1 이어야 — 검사가 실패할 수 있음):
 *   --break=no-focus  : 쪽의 문단 · 제목(p · h1~h6)이 포커스를 받지 못하게 함(고치기 전처럼 포커스가 옮겨 가지 않는 판) → F1 · F2 · F4 FAIL
 *   --break=same-name : 화면 읽기 전용 글(.sr-only)을 지운 뒤 이름을 잼(레슨 이름이 없는 판) → F3 FAIL
 *   node docs/pass-off-grammar/검사/drive-focus.cjs [--base http://127.0.0.1:3661] [--secrets <json>] [--break=no-focus|same-name]
 * exit 0 = 실패 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const ORIGIN = arg("base", "http://127.0.0.1:3661");
const BREAK = arg("break", "");
const secretsFile = arg("secrets");
if (BREAK && BREAK !== "no-focus" && BREAK !== "same-name") {
  console.error(`모르는 깨기: ${BREAK} — no-focus · same-name`);
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN)) {
  console.error(`로컬 서버에만 씁니다 — ${ORIGIN}`);
  process.exit(2);
}
if (secretsFile && !fs.existsSync(secretsFile)) {
  console.error(`--secrets 파일이 없음 — ${secretsFile}`);
  process.exit(2);
}

// --- the engine, transpiled as it is (the seed records are made by the functions the page uses) -------------------------
function loadEngine() {
  const cache = {};
  const load = (name) => {
    if (cache[name]) return cache[name].exports;
    const js = ts.transpileModule(fs.readFileSync(path.join(REPO, "src/lib/learning", `${name}.ts`), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const m = { exports: {} };
    cache[name] = m;
    new Function("require", "module", "exports", js)((spec) => load(spec.replace(/^\.\//, "")), m, m.exports);
    return m.exports;
  };
  return { E: load("engine") };
}
const { E } = loadEngine();
const PROFILE = { course: "passoff-grammar", secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 }, elementKinds: ["select", "choice", "short"] };
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const titleOf = (id) => (index.lessons.find((l) => l.id === id) || {}).title || id;
const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
const produceOf = (id) => lessonFile(id).blocks.filter((b) => b.type === "drill").flatMap((b) => b.produce || []);

const NOW = Date.now();
const DAY_MS = 86_400_000;
const [T] = produceOf("pg01-2"); // tomorrow's check: pg01-2 finished yesterday
const [P] = produceOf("pg01-1"); // today's review: pg01-1 finished three days ago, right two days ago
const review = (lessonId, correct, extra = {}) => ({ lessonId, kind: "produce", correct, help: "none", mode: "typed", where: "review", ...extra });
function seedReview() {
  const r = E.emptyRecord("passoff-grammar");
  E.applyLessonDone(r, "pg01-1", NOW - 3 * DAY_MS, [{ key: P.id, kind: "produce" }]);
  E.applyAttempt(r, P.id, review("pg01-1", true), NOW - 2 * DAY_MS, PROFILE);
  E.applyLessonDone(r, "pg01-2", NOW - DAY_MS, [{ key: T.id, kind: "produce" }]);
  return r;
}
/** both sentences answered wrong in today's review a minute ago: listed, and not waiting for today's review */
function seedNotes() {
  const r = seedReview();
  E.applyAttempt(r, T.id, review("pg01-2", false, { answer: "zq wrong one" }), NOW - 60_000, PROFILE);
  E.applyAttempt(r, P.id, review("pg01-1", false, { answer: "zq wrong two" }), NOW - 60_000, PROFILE);
  return r;
}

// --- page snippets ---------------------------------------------------------------------------------------------------------
/** where the focus is, told plainly */
const ACTIVE = `(() => {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { tag: "BODY" };
  const stage = a.closest("[data-passoff-map-stage]");
  const row = a.closest("[data-review-result]");
  const item = a.closest("[data-review-item]");
  return {
    tag: a.tagName,
    id: a.id || null,
    sent: a.getAttribute("data-my-answer-report") === "sent",
    role: a.getAttribute("role"),
    text: (a.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
    stage: stage ? stage.dataset.passoffMapStage : null,
    row: row ? row.dataset.reviewResult : null,
    item: item ? item.dataset.reviewItem : null,
  };
})()`;
/** the page's paragraphs and headings cannot take the focus — as before the fix (--break=no-focus) */
const NO_FOCUS = `(() => { for (const C of [HTMLParagraphElement, HTMLHeadingElement]) C.prototype.focus = function () {}; return true; })()`;

const rows = [];
const check = (name, ok, detail = "") => rows.push({ ok: Boolean(ok), name, detail: String(detail).slice(0, 400) });

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "kig-focus-edge-"));
  const browser = await launch({ port: 9371, profile });
  const tab = await Tab.open(browser.port);
  try {
    await tab.viewport("mobile");
    await tab.send("Accessibility.enable").catch(() => {});
    const waitFor = async (expr, ms = 15000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await tab.eval(expr).catch(() => false)) return true;
        await sleep(150);
      }
      return false;
    };
    /** a keyboard press: the focus on the button (in `root`) whose words are `label`, then Enter */
    const press = async (label, root = "main", exact = true) => {
      const found = await tab.eval(`(() => {
        const b = [...document.querySelectorAll(${JSON.stringify(`${root} button`)})].find((x) => {
          const t = x.textContent.replace(/\\s+/g, " ").trim();
          return (${exact} ? t === ${JSON.stringify(label)} : t.startsWith(${JSON.stringify(label)})) && !x.disabled;
        });
        if (!b) return false;
        b.focus();
        return document.activeElement === b;
      })()`);
      if (!found) return false;
      await tab.key("Enter");
      await sleep(400);
      return true;
    };
    const typeInto = async (selector, text) => {
      const ok = await tab.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); el.select && el.select(); return true; })()`);
      if (!ok) return false;
      await tab.send("Input.insertText", { text });
      await sleep(120);
      return true;
    };
    const active = () => tab.eval(ACTIVE);

    // ---- F1 · F2: "내 답도 맞아요" on the review's results and on a card -------------------------------------------------------
    await tab.goto(`${ORIGIN}/passoff-grammar`, 800);
    await tab.eval(`localStorage.setItem("kig-learning:passoff-grammar", ${JSON.stringify(JSON.stringify(seedReview()))}); localStorage.removeItem("kig-learning-held:passoff-grammar"); true`);
    tab.resetEvents();
    await tab.goto(`${ORIGIN}/passoff-grammar/review`, 1500);
    if (BREAK === "no-focus") await tab.eval(NO_FOCUS);
    const testShown = await waitFor(`Boolean(document.querySelector('[data-review-item="${T.id}"][data-review-mode="test"]'))`);
    await typeInto('[data-review-item] textarea[aria-label="영작 답"]', "Wrong answer on purpose.");
    await press("확인", "[data-review-item]");
    const resultsShown = await waitFor(`Boolean(document.querySelector('[data-review-result="${T.id}"] [data-my-answer-report="button"]'))`, 8000);
    const pressed1 = await press("내 답도 맞아요", `[data-review-result="${T.id}"]`);
    const f1 = await active();
    check(`F1 오늘 복습 결과: ${T.id} 를 틀린 뒤 '내 답도 맞아요'(자판 Enter) → 포커스는 그 줄의 안내 문단(role=status · '신고했어요') — BODY 아님`,
      testShown && resultsShown && pressed1 && f1.tag === "P" && f1.sent && f1.role === "status" && f1.row === T.id && f1.text.includes("신고했어요"),
      `문항 ${testShown} · 결과 ${resultsShown} · 누름 ${pressed1} · 활성 ${JSON.stringify(f1)}`);

    // on to today's review: the reported item is not "missed", so the results' button goes on
    await press("이어서 복습");
    const cardShown = await waitFor(`Boolean(document.querySelector('[data-review-item="${P.id}"][data-review-mode="practice"]'))`, 8000);
    await typeInto('[data-review-item] textarea[aria-label="영작 답"]', "Wrong answer on purpose.");
    await press("확인", "[data-review-item]");
    const cardReport = await waitFor(`Boolean(document.querySelector('[data-review-item="${P.id}"] [data-my-answer-report="button"]'))`, 8000);
    const pressed2 = await press("내 답도 맞아요", `[data-review-item="${P.id}"]`);
    const f2 = await active();
    check(`F2 오늘 복습 카드: ${P.id} 를 틀린 뒤 카드의 '내 답도 맞아요'(자판 Enter) → 포커스는 카드 안 안내 문단 — BODY 아님`,
      cardShown && cardReport && pressed2 && f2.tag === "P" && f2.sent && f2.role === "status" && f2.item === P.id && f2.text.includes("신고했어요"),
      `카드 ${cardShown} · 단추 ${cardReport} · 누름 ${pressed2} · 활성 ${JSON.stringify(f2)}`);

    // ---- F3: the wrong-answer list's '지금 다시 풀기' — a name of its own for each lesson --------------------------------------
    await tab.eval(`localStorage.setItem("kig-learning:passoff-grammar", ${JSON.stringify(JSON.stringify(seedNotes()))}); localStorage.removeItem("kig-learning-held:passoff-grammar"); true`);
    await tab.goto(`${ORIGIN}/passoff-grammar/review?notes=1`, 1500);
    const listShown = await waitFor(`document.querySelector('[data-notes-step]') && document.querySelector('[data-notes-step]').dataset.notesStep === "list"`);
    if (BREAK === "same-name") await tab.eval(`document.querySelectorAll(".sr-only").forEach((e) => e.remove()), true`);
    const names = [];
    for (const lessonId of ["pg01-1", "pg01-2"]) {
      await tab.eval(`(() => { const b = document.querySelector('[data-notes-lesson="${lessonId}"] button[aria-expanded]'); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); return Boolean(b); })()`);
      await sleep(400);
      if (BREAK === "same-name") await tab.eval(`document.querySelectorAll(".sr-only").forEach((e) => e.remove()), true`);
      const found = await tab.send("Runtime.evaluate", {
        expression: `[...document.querySelectorAll('[data-notes-lesson="${lessonId}"] button')].find((b) => b.textContent.trim().startsWith("지금 다시 풀기")) || null`,
        returnByValue: false,
      });
      let name = null;
      if (found.result && found.result.objectId) {
        const ax = await tab.send("Accessibility.getPartialAXTree", { objectId: found.result.objectId, fetchRelatives: false });
        const node = (ax.nodes || []).find((n) => n.name && n.name.value) || null;
        name = node ? node.name.value : null;
      }
      names.push({ lessonId, title: titleOf(lessonId), name });
    }
    check(`F3 오답노트 '지금 다시 풀기'의 접근 이름(브라우저 계산): 레슨마다 '지금 다시 풀기 (레슨 이름)' · 두 레슨이 다름 — ${names.map((n) => n.title).join(" · ")}`,
      listShown && names.length === 2 && names.every((n) => n.name === `지금 다시 풀기 (${n.title})`) && names[0].name !== names[1].name,
      `목록 ${listShown} · ${JSON.stringify(names)}`);

    const ev = tab.events;
    const bad = ev.badResponses.filter((r) => !/\/audio\//.test(r.url));
    check("F5 복습 · 오답노트 쪽 콘솔 오류 · 예외 · 실패한 요청 0(음성 파일 요청 제외)", ev.console.length === 0 && ev.exceptions.length === 0 && bad.length === 0,
      JSON.stringify({ console: ev.console.slice(0, 2), exceptions: ev.exceptions.slice(0, 2), bad: bad.slice(0, 3) }));

    // ---- F4: the topic map's stages, with a licence (a dev server with throwaway secrets) --------------------------------------
    if (secretsFile) {
      const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
      const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
      const key = `KIG-STU1Y-${nonce}-${crypto.createHmac("sha256", sec.LICENSE_SALT).update(`STU1Y:${nonce}`).digest("hex").slice(0, 16).toUpperCase()}`;
      const activated = await fetch(`${ORIGIN}/api/license/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, deviceId: `focus-drive-${Date.now()}`, deviceName: "focus drive" }),
      });
      const session = (activated.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).find((c) => c.startsWith("kig_license_session="));
      if (!session) throw new Error(`licence activation failed: ${activated.status}`);
      await tab.send("Network.setCookie", { name: "kig_license_session", value: session.slice("kig_license_session=".length), url: ORIGIN, httpOnly: true });
      const topic1 = index.groups[0].lessons;
      const done = await fetch(`${ORIGIN}/api/progress/passoff-grammar`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: session },
        body: JSON.stringify({ updates: topic1.map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() })) }),
      });
      await tab.goto(`${ORIGIN}/passoff-grammar/map?topic=1`, 2500);
      if (BREAK === "no-focus") await tab.eval(NO_FOCUS);
      const placeShown = await waitFor(`Boolean(document.querySelector('[data-passoff-map-stage="place"]'))`, 30000);
      // the chips into the boxes (the order does not matter here — only where the focus goes)
      for (let i = 0; i < topic1.length; i++) {
        await tab.eval(`(() => { const b = document.querySelector('[aria-label="강의 칩"] button'); if (b) b.click(); return Boolean(b); })()`);
        await sleep(150);
      }
      const moves = [];
      const move = async (label, expect) => {
        const pressed = await press(label);
        const at = await active();
        const ok = pressed && at.tag === "H2" && expect(at);
        moves.push({ press: label, ok, at: `${at.tag}${at.id ? "#" + at.id : ""}${at.stage ? ` ${at.stage}` : ""}${at.text ? ` '${at.text}'` : ""}` });
      };
      const pickBox = async () => {
        await tab.eval(`(() => { const r = document.querySelector('[aria-labelledby="map-rule"] button'); const s = document.querySelector('[aria-labelledby="map-sentence"] button'); if (r) r.click(); if (s) s.click(); return Boolean(r && s); })()`);
        await sleep(200);
      };
      const isPlace = (at) => at.stage === "place" && at.text === "강의 놓기";
      const isBox = (n) => (at) => at.stage === "pick" && at.text.startsWith(`${n}.`);
      await move("다음", isBox(1));
      await move("이전", isPlace);
      await move("다음", isBox(1));
      await pickBox();
      await move("다음 칸", isBox(2));
      await move("이전", isBox(1));
      await move("다음 칸", isBox(2));
      for (let box = 2; box <= topic1.length; box++) {
        await pickBox();
        if (box < topic1.length) await move("다음 칸", isBox(box + 1));
        else await move("결과 보기", (at) => at.stage === "result" && at.id === "map-result");
      }
      await sleep(800);
      await move("다시 하기", isPlace);
      check(`F4 구성도(이용권 · TOPIC 1 레슨 ${topic1.length}개 마친 뒤): 단계를 옮길 때마다(자판 Enter) 포커스는 새 단계 제목 — ${moves.length}번 모두 · BODY 0`,
        activated.ok && done.ok && placeShown && moves.length >= 9 && moves.every((m) => m.ok),
        `등록 ${activated.status} · 진도 ${done.status} · 놓기 ${placeShown} · ${moves.map((m) => `${m.ok ? "O" : "X"} ${m.press} → ${m.at}`).join(" | ")}`);
      const ev4 = tab.events;
      const bad4 = ev4.badResponses.filter((r) => !/\/audio\//.test(r.url));
      check("F6 구성도 쪽 콘솔 오류 · 예외 · 실패한 요청 0(음성 파일 요청 제외)", ev4.console.length === 0 && ev4.exceptions.length === 0 && bad4.length === 0,
        JSON.stringify({ console: ev4.console.slice(0, 2), exceptions: ev4.exceptions.slice(0, 2), bad: bad4.slice(0, 3) }));
    }
  } catch (e) {
    check("드라이버 예외", false, e && e.stack ? e.stack : String(e));
  } finally {
    await tab.close();
    browser.proc.kill();
  }
  for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${rows.length}`);
  process.exit(failed ? 1 : 0);
})();
