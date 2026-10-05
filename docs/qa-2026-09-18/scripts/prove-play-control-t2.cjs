/**
 * 회귀 점검 1002 T2 (2026-10-06) — the sound-control rule of drive-generic (lib/play-control.cjs), tried offline on the
 * production records (out/features/*-rc2-* · *-pd2*): every sound row's control label, with the attributes the app gives that
 * button (read from the app source — see CONTEXT below), judged by the OLD rule and by the NEW one. The page-side functions are
 * the very strings drive-generic sends to the browser (eval'd here on a small stand-in element).
 *
 *   node prove-play-control-t2.cjs [--json out/play-control-t2.json] [--break]
 *     --break   judge with the old rule as 'new' (rule(true)) — the check must then fail (exit 1)
 *
 * exit 0 = ① every RETEST row on a tile · script line · option is out of the sound candidates and ② every row of a real sound
 * control is still a candidate, except the rows listed as 'lucky' whose clip another row of the same visit played anyway.
 */
const fs = require("fs");
const path = require("path");
const PC = require("./lib/play-control.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BREAK = process.argv.includes("--break");
const FEAT = path.join(__dirname, "../out/features");
const STOP_RE = /정지|일시정지|멈춤|중지|pause|stop|⏹|⏸/i; // drive-generic STOP_RE

// ---- the page-side rule, the same source text drive-generic interpolates into NEXT_CONTROL ----
const NEW = PC.rule(BREAK);
const OLD = PC.rule(true);
// eslint-disable-next-line no-eval
const mk = (r) => ({ play: r.PLAY_RE, notPlay: eval(r.NOT_PLAY_CTX) });
const newRule = mk(NEW), oldRule = mk(OLD);
const isPlay = (rule, el, t) => rule.play.test(t) && !STOP_RE.test(t) && !rule.notPlay(el);

// a stand-in element: own attributes + ancestors' attributes; closest/matches for '[a], [b]' attribute selectors only
const attrList = (sel) => sel.split(",").map((s) => s.trim().replace(/^\[|\]$/g, ""));
function element(own, ancestors) {
  const has = (attrs, sel) => attrList(sel).some((a) => attrs.includes(a));
  return {
    matches: (sel) => has(own, sel),
    closest: (sel) => (has(own, sel) || ancestors.some((a) => has(a, sel)) ? {} : null),
  };
}

/**
 * CONTEXT — where the app puts a button with this label (app source, 2026-10-06):
 *   word-bank  STUDENT/ADULT dictation (StudentLearningView renderDictation: div[data-word-bank] > button — tile.label) and
 *              LISTENING dictation (LdLearningView renderTiles: div[data-word-bank] > button[data-tile]); a label that is ONE
 *              English word on the dictation step (STUDENT 'Step 2' · ADULT 'Step 4' · LISTENING 'Step 2').
 *   en         LISTENING Step 5 '다시 듣기 · 대본 확인' (LdLearningView ol[data-script] button[data-en] — opens the Korean line)
 *   option     LISTENING Step 1 '들은 내용 확인' (LessonQuestions button[data-option]) — label starts with ①…⑤
 *   none       everything else (a speaker, '듣기', '문장 듣기', a sentence tap with title '눌러서 듣기' …)
 */
function contextOf(course, step, ctl) {
  const oneWord = /^[A-Za-z][A-Za-z'’-]*[.,!?]?$/.test(ctl);
  const dictStep = (course === "student" && /^Step 2\b/.test(step)) || (course === "adult" && /^Step 4\b/.test(step)) || (course === "ld" && /^Step 2\b/.test(step));
  if (oneWord && dictStep) return { kind: "word-bank", el: element(course === "ld" ? ["data-tile"] : [], [["data-word-bank"]]) };
  if (course === "ld" && /^Step 5\b/.test(step) && / /.test(ctl) && !/[가-힣]|🔊|▶/.test(ctl)) return { kind: "en", el: element(["data-en"], [["data-script"]]) };
  if (course === "ld" && /^Step 1\b/.test(step) && /^[①②③④⑤]/.test(ctl)) return { kind: "option", el: element(["data-option"], [["data-lesson-questions"]]) };
  return { kind: "none", el: element([], []) };
}

const files = fs.readdirSync(FEAT).filter((f) => /-(rc2|pd2)/.test(f) && f.endsWith(".jsonl")).sort();
const rows = [];
for (const f of files) {
  for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const audio = (r.audio || []).filter((a) => typeof a.control === "string");
    const playedInVisit = new Set(audio.filter((a) => a.status === "PASS").flatMap((a) => (a.clips || []).filter((c) => c.playing > 0 || c.resolved > 0).map((c) => c.path)));
    for (const a of audio) {
      const i = a.control.indexOf(" ▶ ");
      if (i < 0) continue;
      const step = a.control.slice(0, i);
      const ctl = a.control.slice(i + 3).replace(/ #\d+$/, "");
      const c = contextOf(r.course, step, ctl);
      const old = isPlay(oldRule, c.el, ctl), now = isPlay(newRule, c.el, ctl);
      const ownClips = (a.clips || []).filter((x) => x.playing > 0 || x.resolved > 0).map((x) => x.path);
      const otherRowPlayed = ownClips.length > 0 && ownClips.every((p) => audio.some((b) => b !== a && b.status === "PASS" && (b.clips || []).some((x) => x.path === p && (x.playing > 0 || x.resolved > 0))));
      rows.push({ file: f, id: r.id, viewport: r.viewport, step, ctl, status: a.status, kind: c.kind, old, now, ownClips, otherRowPlayed, _seen: playedInVisit.size });
    }
  }
}

const notOld = rows.filter((x) => !x.old);
const dropped = rows.filter((x) => x.old && !x.now);
const retestFalse = rows.filter((x) => x.status === "RETEST" && x.kind !== "none");
const retestFalseKept = retestFalse.filter((x) => x.now);
const real = rows.filter((x) => x.kind === "none" && x.old); // rows the old rule did not take were pressed by another routine (a walk · adultChunks …) — not this rule
const realDropped = real.filter((x) => !x.now);
const lucky = realDropped.filter((x) => x.otherRowPlayed);
const realLost = realDropped.filter((x) => !x.otherRowPlayed);
const nonNoneKept = rows.filter((x) => x.kind !== "none" && x.now);
const by = (xs, k) => xs.reduce((m, x) => ((m[k(x)] = (m[k(x)] || 0) + 1), m), {});

const out = {
  rule: BREAK ? "OLD (--break)" : "NEW",
  files: files.length,
  rows: rows.length,
  otherRoutineRows: notOld.length, otherRoutineSteps: by(notOld, (x) => `${x.file.split("-")[0]} ${x.step.replace(/ \d+.*$/, "")}`),
  byKind: by(rows, (x) => x.kind),
  dropped: { n: dropped.length, byKindStatus: by(dropped, (x) => `${x.kind} ${x.status}`) },
  proof1_retestOnFalseControls: { n: retestFalse.length, stillCandidate: retestFalseKept.length, rows: retestFalse.map((x) => `${x.file} ${x.id} ${x.viewport} | ${x.step} ▶ ${x.ctl} | ${x.kind} → ${x.now ? "STILL" : "out"}`) },
  proof2_realControls: {
    n: real.length,
    stillCandidate: real.length - realDropped.length,
    droppedLucky: lucky.map((x) => `${x.file} ${x.id} ${x.viewport} | ${x.step} ▶ ${x.ctl} | ${x.status} | clip also played by another row: ${x.ownClips.join(",")}`),
    droppedLost: realLost.map((x) => `${x.file} ${x.id} ${x.viewport} | ${x.step} ▶ ${x.ctl} | ${x.status} | clips ${x.ownClips.join(",") || "-"}`),
  },
  falseControlsPassAndDropped: rows.filter((x) => x.kind !== "none" && x.status === "PASS" && !x.now).map((x) => `${x.file} ${x.id} ${x.viewport} | ${x.step} ▶ ${x.ctl} | clips ${x.ownClips.join(",")}`),
  nonNoneStillCandidate: nonNoneKept.length,
};
const ok = retestFalse.length > 0 && retestFalseKept.length === 0 && nonNoneKept.length === 0 && realLost.length === 0;
out.verdict = ok ? "PASS" : "FAIL";
const J = arg("--json", null);
if (J) fs.writeFileSync(path.resolve(J), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(ok ? 0 : 1);
