#!/usr/bin/env node
/**
 * KIG-008 — is the auto-generated quiz an OFF FEATURE or a DELETED one?
 *
 * WHY THIS EXISTS. The quiz was withheld by replacing the generator call with
 * an empty array literal. Every page looked right, so nothing failed — but the
 * call site was gone, and "flip a constant to bring it back" was not true of
 * that code. A withheld feature and a deleted one are indistinguishable from
 * the outside, and only one of them is reversible.
 *
 * SO THIS PROBE CHECKS BOTH DIRECTIONS. It is not enough to show the questions
 * are absent; a deleted feature is also absent. The assertion that carries the
 * weight is the other one: with SHOW_GENERATED_QUIZ = true the questions must
 * actually appear. That is what makes the flag a switch rather than a comment.
 *
 * THE FIRST DIRECTION CAN BE CHECKED OVER HTTP, THE SECOND CANNOT. LISTENING's
 * quiz sits in the default step tab, so it is in the server-rendered HTML.
 * READING's sits behind the "독해 퀴즈" tab, which is client state, so the only
 * way to see it — in either direction — is to drive a browser. Headless Edge
 * over CDP does that, and clicking the tab is what a learner does anyway.
 *
 * WHAT IT ASSERTS
 *   flag off  : no generated question text and no answered-question markers —
 *               and no "준비 중입니다" note either. The note used to be the
 *               flag-off marker; the launch audit read it as an unfinished
 *               product (CNT-08), so the withheld quiz is now not announced at
 *               all. The step still has to be reachable, which `stepMarker`
 *               (text the step carries in BOTH states) proves.
 *   flag on   : the generated questions are back, still without the note
 *
 * THE MARKER IS A STRING THE GENERATOR EMITS VERBATIM, taken from the generator
 * itself (`listeningUtils.ts:416`, `readingUtils.ts:669`) rather than from a
 * count of buttons or a stored expectation. If either generator changes, this
 * probe fails and says so, instead of quietly passing on a number.
 *
 * USAGE
 *   node verify-quiz-flag.cjs http://localhost:3210            # expect flag off
 *   node verify-quiz-flag.cjs http://localhost:3210 --expect-on # flipped build
 *
 * EXIT 0 = every assertion passed. Exit 1 = at least one failed.
 *
 * THE TWO RUNS THAT MATTER, both recorded in docs/qa-2026-09-15/PROGRESS.md:
 *   flag false -> 0 failures    (the shipped state)
 *   flag true  -> 0 failures    (the questions really do come back)
 * A probe that passes in only one of those two states would prove nothing.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");
const EXPECT_ON = process.argv.includes("--expect-on");

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = Number(process.env.QA_CDP_PORT || 9336);
const PROFILE = "C:/Users/ghddl/AppData/Local/Temp/kqedge-quizflag";

/**
 * The two question strings the generators emit verbatim, used as the marker for
 * "the generated quiz really rendered". Taken from the generators themselves —
 * `listeningUtils.ts:416` and `readingUtils.ts:669` — so this probe notices if
 * either generator is changed, and so the assertion is about CONTENT rather than
 * about a button count. A count is what the last round of verification got wrong.
 */
const GENERATED_MARKER = {
  "/ld/d001": "음성을 듣고 파악한 전체 지문의 주요 맥락과 화자는 누구인가요?",
  "/reading/pr001": "위 지문의 핵심 주제(Main Idea)로 가장 적절한 것은?",
};
const NOTE = "준비 중입니다";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Tab {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  }
  static async open() {
    const t = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    return new Tab(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rej(new Error(`timeout ${method}`));
        }
      }, 120000);
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
      timeout: 90000,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result.value;
  }
  async goto(url) {
    await this.send("Page.navigate", { url });
  }
}

/**
 * Reads the quiz step of one lesson.
 *
 * `tabLabel` is the button a learner clicks to reach the step; `stepMarker` is
 * text that only the step itself carries, and it is what proves the click
 * landed — without it a failed click would look exactly like a withheld quiz,
 * which is the mistake this probe exists to avoid.
 */
async function readQuizStep(tab, url, tabLabel, stepMarker, marker) {
  await tab.goto(url);

  /** Polls the live DOM. A fixed sleep is how a slow page turns into a false pass. */
  const waitForText = async (text, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const seen = await tab
        .eval(`(() => document.body && document.body.innerText.includes(${JSON.stringify(text)}))()`)
        .catch(() => false);
      if (seen) return true;
      await sleep(400);
    }
    return false;
  };

  let clicked = null;
  if (tabLabel) {
    const ready = await waitForText(tabLabel, 20000);
    if (!ready) {
      return {
        clicked: false,
        onStep: false,
        chars: 0,
        buttons: 0,
        answerish: 0,
        hasNote: false,
        hasGenerated: false,
        sample: `"${tabLabel}" never appeared in the DOM within 20s`,
      };
    }
    // Retried: a click that lands before hydration is a no-op, and it would be
    // indistinguishable from the feature being off.
    for (let attempt = 1; attempt <= 3; attempt++) {
      clicked = await tab.eval(`(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => (x.textContent || '').includes(${JSON.stringify(tabLabel)}));
        if (!b) return false;
        b.click();
        return true;
      })()`);
      if (!clicked) break;
      if (await waitForText(stepMarker, 8000)) break;
    }
  } else {
    await waitForText(stepMarker, 20000);
  }

  const snapshot = await tab.eval(`(() => {
    const main = document.querySelector('main');
    const text = main ? main.innerText : '';
    const buttons = [...(main ? main.querySelectorAll('button') : [])];
    // Option buttons carry the option text and, once submitted, "✓ 정답".
    const answerish = buttons.filter((b) => /✓ 정답|정답입니다|오답입니다/.test(b.textContent || '')).length;
    return {
      chars: text.length,
      buttons: buttons.length,
      answerish,
      onStep: text.includes(${JSON.stringify(stepMarker)}),
      hasNote: text.includes(${JSON.stringify(NOTE)}),
      hasGenerated: text.includes(${JSON.stringify(marker)}),
      // So a human can see what actually rendered instead of trusting a boolean.
      sample: text.replace(/\\s+/g, ' ').slice(0, 320),
    };
  })()`);

  return { clicked, ...snapshot };
}

const rows = [];
function check(name, ok, notes = [], problems = []) {
  rows.push({ name, ok, notes, problems });
}

/** LISTENING — the quiz is the default step, so the server-rendered HTML has it too. */
async function probeOverHttp(route, marker) {
  const html = await (await fetch(`${BASE}${route}`)).text();
  const body = html.match(/<body[\s\S]*?<\/body>/i);
  const text = (body ? body[0] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const problems = [];
  const hasNote = text.includes(NOTE);
  const hasGenerated = text.includes(marker);
  if (hasNote) problems.push(`server HTML carries "${NOTE}" — the note was removed in both states (CNT-08)`);
  if (EXPECT_ON && !hasGenerated) {
    problems.push(`server HTML does not carry the generated question "${marker}" with the flag on`);
  }
  if (!EXPECT_ON && hasGenerated) {
    problems.push(`server HTML carries the generated question "${marker}" with the flag off`);
  }
  check(
    `A http ${route}`,
    problems.length === 0,
    [`${text.length} chars, note=${hasNote}, generated question=${hasGenerated}`],
    problems,
  );
}

async function probeInBrowser(tab, route, tabLabel, stepMarker, marker) {
  const problems = [];
  let snap;
  try {
    snap = await readQuizStep(tab, `${BASE}${route}`, tabLabel, stepMarker, marker);
  } catch (err) {
    check(`B browser ${route}`, false, [], [`failed — ${err.message}`]);
    return;
  }

  if (tabLabel && snap.clicked === false) {
    problems.push(`the "${tabLabel}" tab button was not found`);
  }
  if (!snap.onStep) {
    problems.push(`the quiz step was never reached — "${stepMarker}" is not on screen`);
  }
  if (snap.hasNote) problems.push(`"${NOTE}" is rendered — the note was removed in both states (CNT-08)`);
  if (EXPECT_ON) {
    if (!snap.hasGenerated) {
      problems.push(`the generated question did not appear with the flag on`);
    }
  } else {
    if (snap.hasGenerated) problems.push("a generated question is rendered with the flag off");
    if (snap.answerish > 0) problems.push(`${snap.answerish} answered-question markers rendered`);
  }

  check(
    `B browser ${route}`,
    problems.length === 0,
    [
      `clicked=${snap.clicked} onStep=${snap.onStep} chars=${snap.chars} buttons=${snap.buttons}`,
      `note=${snap.hasNote} generatedQuestion=${snap.hasGenerated}`,
      `sample: ${snap.sample}`,
    ],
    problems,
  );
}

(async () => {
  console.log(`KIG-008 quiz flag probe — ${BASE}`);
  console.log(`expecting SHOW_GENERATED_QUIZ = ${EXPECT_ON ? "true (questions must render)" : "false (no questions, no note)"}\n`);

  await probeOverHttp("/ld/d001", GENERATED_MARKER["/ld/d001"]);

  const proc = spawn(EDGE, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--disable-gpu",
    "about:blank",
  ]);
  proc.on("error", (e) => console.error("edge spawn failed:", e.message));

  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(`http://127.0.0.1:${PORT}/json/version`);
        ready = true;
        break;
      } catch {
        await sleep(500);
      }
    }
    if (!ready) throw new Error("headless Edge never opened its debugging port");

    const tab = await Tab.open();
    // LISTENING's quiz is the default step; READING's is behind a tab. The step
    // markers are text each step carries whether or not the quiz is on — the
    // quiz heading itself is gone with the flag off, so it cannot be the marker.
    await probeInBrowser(tab, "/ld/d001", null, "다음: Step 2 탭-딕테이션 이동", GENERATED_MARKER["/ld/d001"]);
    await probeInBrowser(
      tab,
      "/reading/pr001",
      "독해 퀴즈",
      "클로즈(Cloze) 빈칸 완성",
      GENERATED_MARKER["/reading/pr001"],
    );
  } catch (err) {
    check("B browser", false, [], [String(err.message)]);
  } finally {
    try {
      proc.kill();
    } catch {}
  }

  let pass = 0;
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}`);
    for (const note of row.notes) console.log(`        · ${note}`);
    for (const problem of row.problems) console.log(`        ✗ ${problem}`);
    if (row.ok) pass++;
  }
  const failed = rows.length - pass;
  console.log(`\n${pass}/${rows.length} checks pass (SHOW_GENERATED_QUIZ = ${EXPECT_ON})`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, `verify-quiz-flag-${EXPECT_ON ? "on" : "off"}.json`),
    JSON.stringify({ base: BASE, expectGeneratedQuiz: EXPECT_ON, pass, total: rows.length, rows }, null, 2),
  );

  process.exit(failed === 0 ? 0 : 1);
})();
