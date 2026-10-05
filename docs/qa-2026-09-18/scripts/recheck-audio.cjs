#!/usr/bin/env node
/**
 * Isolation re-check for every play control the sweep could not settle (FAIL or RETEST) — 관문 5.
 *
 * The sweep presses dozens of controls in quick succession; a clip that is still loading
 * can be aborted by the next press, and the app then falls back to browser TTS. That is the
 * driver's pacing, not necessarily the product. Here each such control gets a clean trial:
 * fresh page load, open the step the control lives on, ONE press, up to 12 s of waiting,
 * no other interaction. Only what fails here is reported as a product defect.
 *
 * 회귀 점검 1002 단계 0 마무리 (fixes-0d, 2026-10-04) — 지난 관문의 함정 셋을 고치고 ADULT · PASS-OFF 를 읽게 함:
 *   ① --from 없이 돌면 out/features 의 옛 기록 전부와 옛 recheck-audio*.jsonl 을 섞었다(최종 관문 작업기록 66). 이제 --from 이 반드시 있어야 하고
 *      (없으면 exit 2), 그 파일들에서도 강의 × 화면마다 가장 늦은 기록만 · 깨기 기록(`break` 칸 · 이름 '-break-')과 다른 주소(base)의 기록은 뺀다.
 *      '이미 함' 은 이 실행의 출력 파일(recheck-audio<suffix>.jsonl, --suffix 필수)만 본다.
 *   ② 뺌 규칙(마이크 · 이동 · 속도)을 '단계 이름 ▶ 버튼 이름' 전체에 대어 LISTENING STEP 4 '섀도잉 & 발음 테스트' 단계의 진짜 재생 버튼 '🔊 소리 듣기' 를
 *      마이크로 뺐다(작업기록 68 — 그때 대상 뽑기 스크립트가 `titleOnlyMic` 로 되살려 씀). 이제 규칙은 **버튼 이름에만** 댄다(titleOnlyMic 이 필요 없음 —
 *      대상 파일에 그 칸이 있어도 그냥 읽음). 같은 꼴의 속도 규칙(작업기록 620 — '🔊 표준 속도' · '🔊 1.25x' · '🐢 0.85x 느리게' · '연속 청취' 1,344곳)도:
 *      버튼 이름이 🔊 · 🐢 로 시작하거나 '연속 청취' 면 재생 버튼(빼지 않음).
 *   ③ 판정이 '무엇이든 재생되면 PASS' 였다(다른 문장의 클립이어도). 이제 버튼마다 기대 클립(want)을 정해 그 클립이 재생돼야 PASS —
 *      want 는 (가) 대상 파일의 want 칸 → (나) 스윕 기록에서 그 버튼이 '기대한' 클립(clips[].expected — drive-passoff 는 그 문장의 클립,
 *      drive-generic 은 그 강의의 클립 중 재생된 것) → (다) 데이터(PASS-OFF 문항 clipOf · ADULT 낱말 say · 덩어리 · 문장). 없으면 '그 강의의 클립'.
 *      다른 클립을 부르면 FAIL. exit 1 = FAIL 또는 BLOCKED 가 있음(전에는 늘 exit 0).
 *   ④ ADULT(drive-generic) 의 2단계 '낱말 소리 · 빈칸 문장 듣기', 3단계 '덩어리 소리 N · 끊어 듣기 · 문장 듣기' 와 PASS-OFF(drive-passoff) 의
 *      '① <문항> ▶ 문장 듣기' · '④/⑤ <문항> ▶ 문장 듣기' 는 단계 이름이 탭 이름이 아니라 전에는 찾지 못했다(BLOCKED). 이제 그 자리까지 간다:
 *      ADULT — 탭 → 그 카드 · 1번 문장(빈칸은 첫 보기를 골라 판정을 띄운 뒤) / PASS-OFF — ① '영어 보기' 를 깨운 뒤 그 문장,
 *      ④ ⑤ 앞 문장들을 모범 답(레슨 철자)으로 '맞았어요' 로 넘기고 그 문장도 맞힌 뒤(스윕과 같은 일 — 감사 이용권 학습 기록에 남을 수 있음).
 *   ⑤ 브라우저를 띄우기 전 남은 메모리가 1GB 아래면 1분씩 기다림(이 기계 7.9GB · 다른 스윕과 나눠 씀).
 *
 *   node recheck-audio.cjs --from <파일,…> --suffix -x [--status RETEST,FAIL(기본) | PASS | any] [--course c1,c2] [--ids id,…]
 *        [--controls <정규식>] [--limit N] [--port 9890] [--clone rc1002-0d-recheck] [--redo] [--dry-run] [--count]
 *   --from: out/features 의 스윕 기록(drive-generic · drive-passoff · drive-reading) · 지난 재검사 결과 · 대상 파일(gen-recheck-targets 꼴).
 *           이름만 주면 out/features 에서, '*' 가 든 이름은 그 폴더에서 맞는 것 모두(예: "*-rc-*.jsonl,passoff-grammar-rc1002-g1-*.jsonl").
 *           '-pages.jsonl'(PASS-OFF 복습 · 구성도 — 소리 없음)은 건너뜀.
 *   --count: 브라우저 없이 과정별 '음성 버튼 누른 수 / PASS · FAIL · RETEST' 와 다시 볼 대상 수만 찍음(단계 1 ④). READING(drive-reading)은
 *            audio 칸에 상태가 없어 '재생됨 · 기대 클립 · 오류 없음 · TTS 없음' 으로 PASS/FAIL 을 셈 — 다시 누르기 대상에는 넣지 않음(그 판정은
 *            같은 기록의 playProbe 검사 FAIL 로 강의가 FAIL 이 됨).
 *   --dry-run: 대상 목록만 찍음(브라우저 0).
 * Output: out/recheck-audio<suffix>.jsonl (resumable) · out/recheck-audio<suffix>-skipped.json + summary.
 * exit: 0 = 다시 본 것 모두 PASS(또는 대상 0) · 1 = FAIL 또는 BLOCKED · 2 = 잘못 부름 / 읽은 기록 0
 *
 * 7단계 7-1 f: 대상마다 스윕이 그것을 본 화면 크기(t.viewports — desktop 이 있으면 desktop, 없으면 mobile · small · 본 크기)로 연다.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");

const argv = process.argv.slice(2);
const VALUE_ARGS = ["--from", "--suffix", "--status", "--course", "--ids", "--controls", "--limit", "--port", "--clone", "--rejudge"];
const FLAG_ARGS = ["--redo", "--dry-run", "--count", "--desktop-only", "--break-t8"];
const USAGE = "쓰임새: node recheck-audio.cjs --from <파일,…> --suffix -x [--status RETEST,FAIL|PASS|any] [--course …] [--ids …] [--controls <정규식>] [--limit N] [--port 9890] [--clone <사본>] [--redo] [--dry-run] [--count] [--rejudge <recheck-audio 결과.jsonl>] [--break-t8]";
const usageExit = (why) => { console.error(`recheck-audio: ${why}\n${USAGE}`); process.exit(2); };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--help" || a === "-h") usageExit("--help");
  if (!a.startsWith("--")) usageExit(`인자가 아닌 낱말 '${a}'`);
  if (VALUE_ARGS.includes(a)) { if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) usageExit(`${a} 에 값이 없음`); i++; continue; }
  if (!FLAG_ARGS.includes(a)) usageExit(`모르는 인자 ${a}`);
}
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const has = (n) => argv.includes(n);
const FROM = arg("--from", null);
if (!FROM) usageExit("--from 이 필요합니다 — 없이 돌면 out/features 의 옛 기록 전부를 섞습니다(지난 관문의 함정)");
const COUNT_ONLY = has("--count");
const DRY = has("--dry-run");
const SUFFIX = arg("--suffix", "");
if (!SUFFIX && !COUNT_ONLY && !DRY && !has("--rejudge")) usageExit("--suffix 가 필요합니다 — 이 실행의 결과 파일(recheck-audio<suffix>.jsonl)이 옛 재검사와 섞이지 않게");
const ONLY = arg("--course", null) ? new Set(arg("--course").split(",")) : null;
const IDS = arg("--ids", null) ? new Set(arg("--ids").split(",")) : null;
const CONTROLS = arg("--controls", null) ? new RegExp(arg("--controls")) : null;
const STATUS_ARG = arg("--status", "RETEST,FAIL");
const STATUSES = STATUS_ARG === "any" ? null : new Set(STATUS_ARG.split(","));
const LIMIT = Number(arg("--limit", 0)) || 0;
const PORT = Number(arg("--port", 9890));
const CLONE = arg("--clone", `recheck${SUFFIX}`);
const DESKTOP_ONLY = has("--desktop-only");
/**
 * 회귀 점검 1002 T8 (fix-tools, 2026-10-05 — 단계1/triage-voca-grammar ⑦ ⑧ ⑨ · triage-ld-reading 2 3; the run stopped at 1,051/2,291):
 *   ① a page that redirects (GRAMMAR I odd ids — 307 to the even partner, the same screen) is opened at the page it ends on: the target
 *      takes the sweep record's finalPath (and a target file's url is resolved before loading), H.load gets expectPath — it waited 46 s
 *      per target for the requested address and wrote BLOCKED 'page did not load' (97). Targets that land on the same page · step ·
 *      control are ONE target (requestedUrls keeps every address).
 *   ② VOCA word cards are found by their word ([data-word-play] · [data-word-text]) when the label the sweep saw is gone — the card's
 *      name changes with '뜻 가리기' ('<낱말> 듣기 · 뜻 보기' ↔ '<낱말> <뜻> 듣기') — BLOCKED 'control not found' 355.
 *   ③ the clip expected of a generic control is the one its own NAME speaks when that name is a text of the lesson (the phrase '…
 *      듣기', the word of a card) — the sweep's heard clip is used only when the name says nothing, and never from a press the sweep
 *      made on a covered target (its click landed on a neighbouring card: FAIL 12 'asked for … — this control's clip is …').
 *   ④ a question's answer option ('① …') is not a play control (FAIL 4).
 *   ⑤ a LISTENING step shows the line it is on: a control of another line is reached with '다음 문장' (after '그래도 보기' where the
 *      line is hidden until dictated) — BLOCKED 'control not found' 3 (d172 Step 3).
 *   ⑥ --from wildcards skip proof-run records ('-proof-' — the app copy on localhost) as they skip '-break-' (they were read, then
 *      dropped one by one as another address).
 *   --rejudge <file>: no browser — the lines of an earlier run of this tool judged again by ①~④ (what can be settled from the record);
 *      what needs pressing again is said so. --break-t8: the rules before ①~⑥ (for the proof).
 */
const BREAK_T8 = has("--break-t8");
const REJUDGE = arg("--rejudge", null);
const OUT = path.join(__dirname, "../out");
const FEAT = path.join(OUT, "features");

/**
 * Which of the sweep's unsettled audio results are worth driving again?
 *
 * The sweep's play-control matcher was too broad: it also pressed the NEXT button ("다음 ▶️"),
 * the playback-speed toggles ("🔊 1.25x", "표준 속도"), and — because it matched on the English
 * word "play" — dictation word tiles and whole sentences. None of those are supposed to request a
 * clip. The liaison clinic's preset phrases are already settled (LD-LIAISON-WITHDRAWN) and a
 * microphone control records rather than plays.
 *
 * Everything excluded here is recorded as NOT APPLICABLE with its reason, never as a pass.
 * fixes-0d ②: every rule is matched against the BUTTON's name only (the part after ' ▶ '), never the step's name.
 */
// 2026-09-27 (B01 · B04 — VoiceSpeakingTester): the mic's default name became '말하기 확인' (it was '마이크로 발음 테스트', which
// '발음 테스트' matched), and since 59fdd44 its button carries an SVG icon instead of '🎙️', so its listening and score states
// ('듣고 있는 중…', '85점 (대부분 일치)', '75점 (통과했어요)') are matched by their own words, as is GRAMMAR's own name for it
// ('따라 말하고 확인', 59fdd44). The old words stay for older sweep records.
// 2026-09-27 (B03 · speechSingleWord.ts): for a one-word target (the VOCA words) the same button says '알아들었어요' or
// "'due'로 들렸어요 — 한 번 더" instead of 'N점 (…)' — the same mic, so the same rule.
const MIC_STATES = /말하기 확인|따라 말하고 확인|듣고 있는 중|알아들었어요|로 들렸어요 — 한 번 더|알아듣지 못했어요|\d+점 \((?:모든 단어 일치|거의 모두 일치|대부분 일치|거의 맞았어요|다시 시도|통과했어요|음성 감지 안 됨)/;
// 2026-09-27 (STUDENT 학습법 · 화면 고침 · D03): STUDENT Step 3's button that opens the check is '말하기' (aria-label 'N번 문장
// 말하기'); the speed buttons read '0.7×' · '0.85×' · '1×' · '1.2×'.
const STUDENT_MIC = /문장 말하기/;
// fixes-0d ②: a speed-looking name that starts with 🔊 / 🐢 or says '연속 청취' is a PLAY button (LdLearningView playText /
// toggleWholePassage — 최종 관문 작업기록 620); the real speed pickers ('0.85x', '🥉 1.0x 표준 속도') only call setSpeedRate
const SPEED_PLAY = /^(🔊|🐢)|연속 청취/;
const NOT_PLAYBACK = [
  { re: new RegExp(`${/🎙️|발음 테스트|발음 채점|녹음|따라 말하기|섀도잉 검증|말하기 연습|내 발음/.source}|${MIC_STATES.source}|${STUDENT_MIC.source}`), why: "마이크로 학습자 발음을 녹음하는 버튼 — 소리를 내지 않는 것이 정상" },
  { re: /다음\s*▶️|◀️\s*이전|다음 문장|이전 문장/, why: "다음·이전 이동 버튼 — 음성 버튼이 아님" },
  { re: /\b\d(\.\d+)?x\b|\d(\.\d+)?×|표준 속도|배속/, unless: SPEED_PLAY, why: "재생 속도 전환 버튼 — 재생 중이 아니면 새 요청이 없는 것이 정상" },
];
const PLAY_LABEL = /🔊|🔉|🔈|▶️|▶|재생|듣기|발음|청취|speak|play control/i;
// 회귀 점검 1002 T8 (2026-10-05 — triage-ld-reading 3): a question's answer option ('① 마더 구스 동요는 … 발음과 리듬을 …' — LessonQuestions
// [data-question] [data-option], LISTENING · READING 새 문제) is not a play control; '발음 · 듣기' inside its words made it one (FAIL 4)
const ANSWER_OPTION = /^[①②③④⑤]\s/;
const skipped = [];
function worthRechecking(control, note, kind = "generic") {
  const label = String(control).split(" ▶ ").slice(1).join(" ▶ ") || String(control);
  if (kind === "generic" && ANSWER_OPTION.test(label.trim()) && !BREAK_T8) { skipped.push({ control, why: "문제의 답 보기(①~⑤) — 소리를 내지 않는 것이 정상 (T8)" }); return false; }
  for (const n of NOT_PLAYBACK) {
    if (n.re.test(label) && !(n.unless && n.unless.test(label.trim()))) { skipped.push({ control, why: n.why }); return false; }
  }
  // the liaison presets are settled; their clips all exist
  if (/연음 & 소리 클리닉/.test(control) && /clip not in this lesson/.test(String(note || ""))) {
    skipped.push({ control, why: "연음 클리닉은 발음 규칙 preset 을 말함 — 클립 전부 존재 (LD-LIAISON-WITHDRAWN)" });
    return false;
  }
  // a real play control announces itself; plain words and sentences were matched by accident — except a control the driver pressed
  // by its own selector (ADULT 낱말 · 덩어리 · 문장 · PASS-OFF 문장 듣기: kindOf ≠ generic — the chunk button's name is the chunk itself)
  if (kind === "generic" && !PLAY_LABEL.test(label)) {
    skipped.push({ control, why: "재생 버튼이 아닌 요소를 음성 컨트롤로 잘못 집었음 (단어 타일·문장 버튼 등)" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- 어느 기록을 읽나 (--from)
let proofSkipped = 0;   // T8 ⑥
function resolveFrom(spec) {
  const out = [];
  for (const raw of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (raw.includes("*")) {
      const dir = path.dirname(raw) === "." ? FEAT : path.resolve(path.dirname(raw));
      const re = new RegExp(`^${path.basename(raw).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
      // T8 ⑥: a wildcard never takes proof-run records ('-proof-' — the deliberately broken app copy on localhost); name one to read it
      const all = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).sort() : [];
      const hits = BREAK_T8 ? all : all.filter((f) => !/-proof-/.test(f));
      proofSkipped += all.length - hits.length;
      if (!hits.length) console.log(`(--from 의 ${raw} 에 맞는 파일 없음 — 건너뜀)`);
      out.push(...hits.map((f) => path.join(dir, f)));
    } else {
      const p = fs.existsSync(path.resolve(raw)) ? path.resolve(raw) : path.join(FEAT, raw);
      if (!fs.existsSync(p)) usageExit(`--from 의 ${raw} 가 없음`);
      out.push(p);
    }
  }
  return [...new Set(out)];
}
const files = resolveFrom(FROM);
const sel = { files: 0, pagesFiles: 0, breakFiles: 0, records: 0, breakRecords: 0, otherBase: 0, superseded: 0, targetLines: 0 };
const latest = new Map();          // course|id|viewport → sweep record
const targetLines = [];            // lines of a target / earlier re-check file
for (const file of files) {
  const f = path.basename(file);
  if (/-pages\.jsonl$/.test(f)) { sel.pagesFiles++; continue; }
  if (/-break-/.test(f)) { sel.breakFiles++; continue; }
  sel.files++;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.break) { sel.breakRecords++; continue; }
    if (r.base && r.base !== H.BASE) { sel.otherBase++; continue; }
    if (Array.isArray(r.audio) && r.viewport) {
      sel.records++;
      const id = r.id || String(r.url || "").split("/").pop();
      const k = `${r.course}|${id}|${r.viewport}`;
      const prev = latest.get(k);
      if (prev) sel.superseded++;
      if (!prev || String(r.at || "") >= String(prev.at || "")) latest.set(k, { ...r, id, file: f });
    } else if (r.url && r.label !== undefined) { sel.targetLines++; targetLines.push(r); }
  }
}
if (!sel.records && !sel.targetLines) usageExit(`--from 에서 읽은 기록 0 (파일 ${sel.files} · 깨기 파일 ${sel.breakFiles} · -pages ${sel.pagesFiles} · 다른 주소 ${sel.otherBase})`);

// ---------------------------------------------------------------- 과정별 셈 · 대상 고르기
const tally = {};   // course → { records, presses, PASS, FAIL, RETEST, other, reading }
const targets = new Map();
const kindOf = (course, step) => {
  if (course === "passoff-grammar") { const m = String(step).match(/^([①④⑤])\s+(\S+)$/); return m ? { kind: m[1] === "①" ? "passoff-anchor" : "passoff-compose", circled: m[1], item: m[2] } : { kind: "generic" }; }
  if (course === "adult") {
    let m;
    if ((m = String(step).match(/^Step 2 · 낱말 소리 '(.*)'$/))) return { kind: "adult-word", word: m[1] };
    if (/^Step 2 · 빈칸 문장 듣기$/.test(step)) return { kind: "adult-cloze" };
    if ((m = String(step).match(/^Step 3 · 덩어리 소리 (\d+)$/))) return { kind: "adult-chunk", n: Number(m[1]) };
    if (/^Step 3 · 끊어 듣기$/.test(step)) return { kind: "adult-chunk-run" };
    if (/^Step 3 · 문장 듣기$/.test(step)) return { kind: "adult-sentence" };
  }
  return { kind: "generic" };
};
let mergedTargets = 0;   // T8 ①
const addTarget = (t) => {
  const key = `${t.url}|${t.step}|${t.label}`;
  if (!targets.has(key)) targets.set(key, { ...t, viewports: new Set(), requestedUrls: new Set() });
  const x = targets.get(key);
  if (t.requestedUrl && !x.requestedUrls.has(t.requestedUrl) && x.requestedUrls.size) mergedTargets++;
  if (t.requestedUrl) x.requestedUrls.add(t.requestedUrl);
  for (const v of t.viewportsIn || []) x.viewports.add(v);
  if (!x.want && t.want) { x.want = t.want; x.wantSource = t.wantSource; }
};
/**
 * T8 ③: the clip a generic control's own NAME speaks — the name without its ' 듣기' / '재생' tail and ' #n', when that is one of the texts
 * this lesson speaks (expectations clipTexts); a VOCA card's name '<낱말> <뜻> 듣기' is tried by its leading words when the rest is Korean.
 */
const clipTextCache = new Map();
const normT = (s) => String(s || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase().replace(/[.!?]+$/, "");
function labelWant(course, id, label) {
  if (BREAK_T8 || course === "passoff-grammar") return null;
  let m = clipTextCache.get(`${course}|${id}`);
  if (!m) {
    m = new Map();
    try { for (const t of E.expected(course, id).clipTexts) if (!m.has(normT(t))) m.set(normT(t), E.unified.unifiedSpeechPath(t)); } catch {}
    clipTextCache.set(`${course}|${id}`, m);
  }
  const base = String(label || "").replace(/\s#\d+$/, "").replace(/^(🔊|🔉|🔈|▶️|▶)\s*/u, "").replace(/\s*(듣기|재생)(\s*·.*)?$/, "").trim();
  if (!base) return null;
  if (m.has(normT(base))) return m.get(normT(base));
  // a VOCA card: the label is its text + its aria-label ('ancestor 조상 ancestor 조상 듣기' · 'ancestor 뜻 보기 ancestor 듣기 · 뜻 보기') —
  // the word is the leading run of words up to the first Korean one
  const words = base.split(" ");
  const k = words.findIndex((w) => /[가-힣]/.test(w));
  if (k >= 1 && !words.slice(0, k).some((w) => /[가-힣]/.test(w))) {
    const head = words.slice(0, k).join(" ");
    if (m.has(normT(head))) return m.get(normT(head));
  }
  return null;
}
for (const r of latest.values()) {
  const T = (tally[r.course] ||= { records: 0, presses: 0, PASS: 0, FAIL: 0, RETEST: 0, other: 0, reading: false });
  T.records++;
  for (const a of r.audio || []) {
    T.presses++;
    if (a.status === undefined && "expected" in a && "requested" in a) {
      // drive-reading: { trigger, text, expected, requested[], playing, error, tts[] } — no status; counted, not re-pressed
      T.reading = true;
      const ok = a.playing && (a.requested || []).includes(a.expected) && !a.error && !(a.tts || []).length;
      T[ok ? "PASS" : "FAIL"]++;
      continue;
    }
    if (["PASS", "FAIL", "RETEST"].includes(a.status)) T[a.status]++; else T.other++;
    if (ONLY && !ONLY.has(r.course)) continue;
    if (IDS && !IDS.has(r.id)) continue;
    if (STATUSES && !STATUSES.has(a.status)) continue;
    if (CONTROLS && !CONTROLS.test(String(a.control))) continue;
    const [step, ...rest] = String(a.control).split(" ▶ ");
    if (!worthRechecking(a.control, a.note, kindOf(r.course, step).kind)) continue;
    const label = rest.join(" ▶ ");
    // T8 ①: the page the sweep actually drove (drive-generic's finalPath — a GRAMMAR I odd id ends on its even partner)
    const openUrl = !BREAK_T8 && r.finalPath && String(r.finalPath).startsWith("/") ? r.finalPath : r.url;
    const openId = String(openUrl).split("/").pop();
    const k = kindOf(r.course, step);
    // (나) the clip the sweep EXPECTED for this button and heard (drive-passoff: that sentence's clip; drive-generic: one of the lesson's)
    // T8 ③: not from a covered press (drive-generic -f1005 writes `covered`); a generic control's own name first
    const heard = BREAK_T8 || !a.covered ? (a.clips || []).find((c) => c.expected && (c.playing > 0 || c.resolved > 0)) || (a.clips || []).find((c) => c.expected) : null;
    const byName = k.kind === "generic" ? labelWant(r.course, openId, label) : null;
    addTarget({ course: r.course, id: openId, url: openUrl, requestedUrl: r.url, step, label, sweepStatus: a.status, sweepNote: a.note || "", viewportsIn: [r.viewport], licensed: r.licensed !== false,
      want: byName || (heard ? heard.path : null),
      wantSource: byName ? `데이터: 단추 이름의 글(T8 ③)${heard && heard.path !== byName ? ` — 스윕이 적은 클립 ${heard.path} 와 다름` : ""}` : heard ? `기록: 스윕이 이 버튼에서 기대한 클립(${r.file})` : null, ...k });
  }
}
for (const r of targetLines) {
  if (ONLY && !ONLY.has(r.course)) continue;
  if (IDS && !IDS.has(r.id)) continue;
  if (STATUSES && !STATUSES.has(r.status)) continue;
  if (CONTROLS && !CONTROLS.test(`${r.step} ▶ ${r.label}`)) continue;
  if (!worthRechecking(`${r.step} ▶ ${r.label}`, r.sweepNote, kindOf(r.course, r.step).kind)) continue;
  addTarget({ course: r.course, id: r.id, url: r.url, step: r.step, label: r.label, sweepStatus: r.status, sweepNote: r.sweepNote || "", viewportsIn: r.sweepViewports || ["desktop"], licensed: r.licensed !== false,
    want: r.want || null, wantSource: r.want ? "대상 파일의 want 칸" : null, wantFromFile: Boolean(r.want), ...kindOf(r.course, r.step) });
}

const why = {};
for (const s of skipped) why[s.why] = (why[s.why] || 0) + 1;
console.log(`읽은 기록: 파일 ${sel.files} · 강의×화면 ${latest.size}(같은 강의×화면의 앞 기록 ${sel.superseded} 뺌) · 대상 줄 ${sel.targetLines} · 뺀 것: 깨기 파일 ${sel.breakFiles} · 깨기 기록 ${sel.breakRecords} · 다른 주소(base≠${H.BASE}) ${sel.otherBase} · -pages ${sel.pagesFiles} · 증명 기록(-proof-) 파일 ${proofSkipped}`);
if (mergedTargets) console.log(`넘어가는 주소(307)를 넘어간 쪽으로 열어 같은 쪽 · 단계 · 단추와 합친 대상 ${mergedTargets} (T8 ①)`);
console.log("과정별 음성 버튼 누름 (강의×화면마다 가장 늦은 기록):");
for (const [c, T] of Object.entries(tally)) console.log(`   ${c.padEnd(16)} 기록 ${String(T.records).padStart(4)} · 누름 ${String(T.presses).padStart(6)} · PASS ${T.PASS} · FAIL ${T.FAIL} · RETEST ${T.RETEST}${T.other ? ` · 그 밖 ${T.other}` : ""}${T.reading ? " (drive-reading: 상태 칸 없음 — 재생 · 기대 클립 · 오류 · TTS 로 셈, 다시 누르기 대상 아님)" : ""}`);
console.log(`재검사에서 제외(재생 버튼 아님 — 버튼 이름으로만 판단) ${skipped.length}건`);
for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)} ${k}`);

let list = [...targets.values()];
const outFile = path.join(OUT, `recheck-audio${SUFFIX}.jsonl`);
if (has("--redo") && !DRY && !COUNT_ONLY && fs.existsSync(outFile) && fs.statSync(outFile).size) { const kept = `${outFile}.before-redo-${new Date().toISOString().replace(/[:.]/g, "-")}`; fs.renameSync(outFile, kept); console.log(`--redo: 옛 결과 → ${path.basename(kept)}`); }
const out = H.jsonl(outFile, (r) => `${r.url}|${r.step}|${r.label}`);
// only THIS run's own output counts as done — and a BLOCKED there is looked at again (7-1 f)
const done = new Set();
if (fs.existsSync(outFile)) for (const line of fs.readFileSync(outFile, "utf8").split("\n")) { try { const r = JSON.parse(line); if (r.status !== "BLOCKED") done.add(`${r.url}|${r.step}|${r.label}`); } catch {} }
const before = list.length;
list = list.filter((t) => !done.has(`${t.url}|${t.step}|${t.label}`));
const alreadyDone = before - list.length;
if (LIMIT) list = list.slice(0, LIMIT);
const byCourse = {};
for (const t of list) byCourse[`${t.course} ${t.sweepStatus}`] = (byCourse[`${t.course} ${t.sweepStatus}`] || 0) + 1;
console.log(`다시 볼 대상 ${before} (상태 ${STATUS_ARG}${CONTROLS ? ` · 버튼 ${CONTROLS}` : ""}${IDS ? ` · 강의 ${[...IDS].join(",")}` : ""}${ONLY ? ` · 과정 ${[...ONLY].join(",")}` : ""}) · 이 실행의 결과 파일에서 이미 함 ${alreadyDone} · 이번에 ${list.length}${LIMIT ? `(--limit ${LIMIT})` : ""} — ${JSON.stringify(byCourse)}`);
if (!COUNT_ONLY && !DRY) fs.writeFileSync(path.join(OUT, `recheck-audio${SUFFIX}-skipped.json`), JSON.stringify({ at: new Date().toISOString(), from: files.map((f) => path.basename(f)), total: skipped.length, why, samples: skipped.slice(0, 40) }, null, 1));
if (REJUDGE) {
  // T8 --rejudge: an earlier run's lines judged again by today's targets (①~④) — no browser. A line whose control is no longer a target
  // is '뺌'; a press that played is judged against today's expected clip; a BLOCKED of a redirected address is settled by its partner's
  // line in the same file; anything else that needs pressing again is said so (not PASS).
  const file = fs.existsSync(path.resolve(REJUDGE)) ? path.resolve(REJUDGE) : path.join(OUT, REJUDGE);
  if (!fs.existsSync(file)) usageExit(`--rejudge 의 ${REJUDGE} 가 없음`);
  const old = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
  const byRequested = new Map();
  for (const t of targets.values()) for (const u of new Set([t.url, ...(t.requestedUrls || [])])) byRequested.set(`${u}|${t.step}|${t.label}`, t);
  const lineAt = new Map(old.map((r) => [`${r.url}|${r.step}|${r.label}`, r]));
  const skippedWhy = new Map(skipped.map((s) => [s.control, s.why]));
  const tallyR = { old: {}, now: {} };
  const why = {};
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const r of old) {
    bump(tallyR.old, `${r.course} ${r.status}`);
    const t = byRequested.get(`${r.url}|${r.step}|${r.label}`);
    let now, reason;
    if (!t) { now = "뺌"; reason = skippedWhy.get(`${r.step} ▶ ${r.label}`) || "오늘 규칙으로는 다시 볼 대상이 아님"; }
    else if (r.status === "BLOCKED") {
      const partner = t.url !== r.url ? lineAt.get(`${t.url}|${r.step}|${r.label}`) : null;
      if (partner && partner.status === "PASS") { now = "PASS"; reason = `넘어간 쪽(${t.url})의 같은 단추가 PASS — 한 대상으로 합침(T8 ①)`; }
      else { now = "다시 돌려야 함"; reason = `브라우저로 다시 눌러야 판정(옛 사유: ${String(r.note).slice(0, 40)})`; }
    } else {
      const played = (r.clips || []).filter((c) => c.playing > 0).map((c) => c.path);
      const errored = (r.clips || []).some((c) => c.error > 0 || c.rejected > 0);
      if (errored || !played.length || (r.tts || []).length) { now = r.status; reason = "기록 그대로(소리 오류 · 요청 없음 · 브라우저 음성)"; }
      else if (t.want) { now = played.includes(t.want) ? "PASS" : "FAIL"; reason = `오늘 기대 클립 ${t.want} (${t.wantSource})`; }
      else { now = r.status; reason = "기대 클립 없음 — 기록 그대로"; }
    }
    bump(tallyR.now, `${r.course} ${now}`);
    bump(why, `${r.course} ${r.status} → ${now} · ${reason.replace(/\/audio\/[^ )]+/g, "<클립>").replace(/\(\/[a-z0-9/-]+\)/g, "").replace(/\([a-z0-9-]+\.jsonl\)/, "").slice(0, 90)}`);
  }
  console.log(`\n--rejudge ${path.basename(file)} (${old.length}줄):`);
  console.log(`  그때: ${JSON.stringify(tallyR.old)}`);
  console.log(`  오늘 규칙: ${JSON.stringify(tallyR.now)}`);
  for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)} ${k}`);
  process.exit(0);
}
if (COUNT_ONLY) process.exit(0);
if (DRY) { for (const t of list.slice(0, 40)) console.log(`   ${t.course} ${t.id} [${[...t.viewports].join(",")}] ${t.kind} · ${t.step} ▶ ${String(t.label).slice(0, 40)} · 스윕 ${t.sweepStatus} · want ${t.want || "(데이터/강의 클립)"}`); process.exit(0); }
if (!list.length) { console.log("다시 볼 것 없음 · exit 0"); process.exit(0); }

// ---------------------------------------------------------------- 기대 클립 (다) 데이터
let P = null;
const passoffExp = new Map();
const pexp = (id, licensed) => {
  if (!P) P = require("./lib/passoff-expect.cjs");
  const k = `${id}|${licensed}`;
  if (!passoffExp.has(k)) passoffExp.set(k, P.expectedPassoff(id, { licensed }));
  return passoffExp.get(k);
};
function dataWant(t) {
  try {
    if (t.kind === "passoff-anchor" || t.kind === "passoff-compose") {
      const x = pexp(t.id, t.licensed);
      const it = [...x.anchors, ...x.produce, ...x.transfers].find((p) => p.id === t.item);
      return it ? x.clipOf(it) : null;
    }
    const A = t.course === "adult" ? E.expected(t.course, t.id).adult : null;
    if (!A) return null;
    if (t.kind === "adult-word") { const w = A.words.find((x) => x.word === t.word) || A.words[0]; return w ? w.sayPath : null; }
    if (t.kind === "adult-chunk") return ((A.chunks[0] || [])[t.n - 1] || {}).path || null;
    if (t.kind === "adult-chunk-run") return ((A.chunks[0] || [])[0] || {}).path || null;
    if (t.kind === "adult-sentence") return A.sentencePaths[0] || null;
  } catch (e) { return null; }
  return null;
}
const lessonClips = (t) => {
  if (t.course === "passoff-grammar") { const x = pexp(t.id, t.licensed); return new Set([...x.anchors, ...x.produce, ...x.transfers].map((p) => x.clipOf(p))); }
  return E.expected(t.course, t.id).clipPaths;
};

// ---------------------------------------------------------------- 그 자리까지 가기
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const STEP = (n) => `document.querySelector('main [data-passoff-view] section[aria-labelledby="passoff-step-${n}"]')`;
const CARD = (n) => `(() => { const s = ${STEP(n)}; return s ? [...s.querySelectorAll('section')].find((x) => /rounded-card/.test(x.className) && !x.hasAttribute('aria-labelledby') && !x.hasAttribute('aria-live') && (x.querySelector('textarea, input[aria-label="답"], [aria-label="낱말 고르기"], [aria-label="보기"], [aria-label="낱말 카드"]') || [...x.querySelectorAll('button')].some((b) => /^(다음|다음 문장)$/.test((b.innerText || '').trim())))) || null : null; })()`;
const BTN_IN = (scopeExpr, re) => `(() => { const s = ${scopeExpr}; if (!s) return null; return [...s.querySelectorAll('button')].find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ').trim()) && !!(b.offsetParent || b.getClientRects().length)) || null; })()`;
const cardText = async (tab, n) => (await tab.eval(`(() => { const c = ${CARD(n)}; return c ? c.innerText : null; })()`).catch(() => null)) || "";
async function waitText(tab, n, re, ms = 3000) { const end = Date.now() + ms; let t = ""; while (Date.now() < end) { t = await cardText(tab, n); if (re.test(t)) return t; await H.sleep(120); } return t; }

/** generic: the step tab, then the control with the sweep's label (drive-generic NEXT_CONTROL: label = innerText + aria-label, first 60, ' #n') */
async function openGenericStep(tab, t) {
  if (!t.step || t.step === "(initial)") return { ok: true };
  const base = t.step.split(" · ")[0];
  const stepNo = (String(t.step).match(/^\s*step\s*(\d+)/i) || [])[1];
  const byNumber = stepNo ? `document.querySelector('main [data-step-tab="${stepNo}"]') || ` : "";
  return H.click(tab, `${byNumber}[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t.step)}) || [...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(base)})`, { settle: 900 });
}
const genericControl = (labelWithNth) => {
  const m = String(labelWithNth || "").trim().match(/^(.*?)(?: #(\d+))?$/);
  const want = m[1].trim();
  const nth = m[2] ? Number(m[2]) : 0;
  return `(() => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
    const main = document.querySelector('main') || document.body;
    const label = (el) => ((el.innerText || el.value || '').replace(/\\s+/g, ' ').trim() + ' ' + (el.getAttribute('aria-label') || '')).trim();
    const all = [...main.querySelectorAll('button, [role=button], a[href^="#"]')].filter(vis);
    const same = all.filter((b) => label(b).slice(0, 60) === ${JSON.stringify(want)});
    const prefix = all.filter((b) => ${JSON.stringify(want)}.length >= 20 && label(b).slice(0, 60).startsWith(${JSON.stringify(want)}));
    const loose = all.filter((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(want)});
    // T8 ②: a VOCA word card by its word — its name changes with '뜻 가리기' (the longest word the label starts with)
    const cards = ${BREAK_T8 ? "[]" : `[...main.querySelectorAll('[data-word-play]')].filter(vis).map((b) => ({ b, w: ((b.querySelector('[data-word-text]') || {}).innerText || '').replace(/\\s+/g, ' ').trim() })).filter((x) => x.w && (${JSON.stringify(want)} + ' ').startsWith(x.w + ' ')).sort((a, b) => b.w.length - a.w.length)`};
    const card = cards.length ? cards.filter((x) => x.w === cards[0].w).map((x) => x.b) : [];
    return same[${nth}] || same[0] || prefix[${nth}] || prefix[0] || loose[${nth}] || loose[0] || card[${nth}] || card[0] || null;
  })()`;
};
/** T8 ⑤: on a LISTENING step, walk the lines ('그래도 보기' first where the line is hidden) until the control is on screen */
async function ldWalkTo(tab, expr) {
  const found = async () => Boolean(await tab.eval(`Boolean(${expr})`).catch(() => false));
  if (BREAK_T8 || (await found()) || !(await tab.eval(`Boolean(document.querySelector('main [data-ld-view]'))`).catch(() => false))) return { walked: 0 };
  const vis = `(b) => !!b && !b.disabled && !!(b.offsetParent || b.getClientRects().length)`;
  const btn = (action) => `[...document.querySelectorAll('main [data-ld-view] [data-action="${action}"]')].find(${vis}) || null`;
  for (let k = 0; k < 60 && (await tab.eval(`Boolean(${btn("prev-line")})`).catch(() => false)); k++) await H.click(tab, btn("prev-line"), { settle: 150 });
  for (let k = 0; k < 80; k++) {
    if (await tab.eval(`Boolean(${btn("peek")})`).catch(() => false)) await H.click(tab, btn("peek"), { settle: 300 });
    if (await found()) return { walked: k, ok: true };
    if (!(await tab.eval(`Boolean(${btn("next-line")})`).catch(() => false))) break;
    await H.click(tab, btn("next-line"), { settle: 250 });
  }
  return { walked: -1, ok: await found() };
}
/** T8 ①: where an address ends (307 · 308 followed) — the page to wait for */
const finalCache = new Map();
async function finalPathOf(url) {
  if (BREAK_T8) return null;
  if (finalCache.has(url)) return finalCache.get(url);
  let cur = H.BASE + url, out = null;
  for (let hop = 0; hop < 5; hop++) {
    const r = await fetch(cur, { redirect: "manual" }).catch(() => null);
    if (!r) break;
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).href; continue; }
    out = new URL(cur).pathname;
    break;
  }
  finalCache.set(url, out);
  return out;
}
/** returns { ok, expr, note, want? } — the press target, after reaching its place */
async function reach(tab, t) {
  const tabN = (n) => H.click(tab, `document.querySelector('main [data-step-tab="${n}"]')`, { settle: 800 });
  if (t.kind === "adult-word" || t.kind === "adult-cloze") {
    const c = await tabN(2); if (!c.ok) return { ok: false, note: `2단계 탭을 못 누름 (${c.reason})` };
    const P2 = `main [data-step-panel="2"]`;
    if (!(await H.waitFor(tab, `document.querySelectorAll('${P2} li[data-vocab]').length > 0`, 5000))) return { ok: false, note: "단어 카드(li[data-vocab]) 없음" };
    if (t.kind === "adult-word") return { ok: true, expr: `(() => { const li = [...document.querySelectorAll('${P2} li[data-vocab]')].find((x) => ((x.querySelector('[data-word-text]') || {}).innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t.word)}); return li ? li.querySelector('[data-action="word-audio"]') : null; })()` };
    if (!(await H.waitFor(tab, `!!document.querySelector('${P2} [data-cloze]')`, 4000))) return { ok: false, note: "빈칸 문제([data-cloze]) 없음" };
    const order = await tab.eval(`+document.querySelector('${P2} [data-cloze]').getAttribute('data-order')`).catch(() => null);
    await H.click(tab, `document.querySelector('${P2} [data-cloze] [data-option="0"]')`, { settle: 400 });
    if (!(await H.waitFor(tab, `!!document.querySelector('${P2} [data-cloze] [data-action="cloze-listen"]')`, 3000))) return { ok: false, note: "보기를 고른 뒤 '문장 듣기' 가 안 나옴" };
    let want = null;
    try { const A = E.expected(t.course, t.id).adult; const w = A.words[order]; want = w ? A.sentencePaths[w.sentence] : null; } catch {}
    return { ok: true, expr: `document.querySelector('${P2} [data-cloze] [data-action="cloze-listen"]')`, want, wantSource: want ? `데이터: 빈칸 문제 data-order ${order} 의 문장` : null };
  }
  if (t.kind === "adult-chunk" || t.kind === "adult-chunk-run" || t.kind === "adult-sentence") {
    const c = await tabN(3); if (!c.ok) return { ok: false, note: `3단계 탭을 못 누름 (${c.reason})` };
    const P3 = `main [data-step-panel="3"]`;
    if (!(await H.waitFor(tab, `!!document.querySelector('${P3} [data-chunk-sentence]')`, 5000))) return { ok: false, note: "끊어 읽기 문장([data-chunk-sentence]) 없음" };
    // sentence 1: a number button (data-pill) PLAYS that sentence's chunks (StudentLearningView openChunkSentence(i, true)) — press it only
    // when another sentence is open, and stop that run, or the '끊어 듣기' press below only toggles the run OFF (no request — the tool's
    // doing: first production run 18:2x, a1-2 '끊어 듣기' FAIL 'no audio request')
    const at = await tab.eval(`+document.querySelector('${P3} [data-chunk-sentence]').getAttribute('data-chunk-sentence')`).catch(() => null);
    if (at !== 0) await H.click(tab, `document.querySelector('${P3} [data-pill="0"]')`, { settle: 300 });
    if (await tab.eval(`(document.querySelector('${P3} [data-action="chunk-run"]') || { getAttribute: () => null }).getAttribute('aria-pressed') === 'true'`).catch(() => false)) {
      await H.click(tab, `document.querySelector('${P3} [data-action="chunk-run"]')`, { settle: 400 });
    }
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    await H.sleep(300);
    if (t.kind === "adult-chunk") return { ok: true, expr: `document.querySelector('${P3} [data-chunk-sentence] li[data-chunk="${t.n - 1}"] button')` };
    if (t.kind === "adult-chunk-run") return { ok: true, expr: `document.querySelector('${P3} [data-action="chunk-run"]')` };
    return { ok: true, expr: `document.querySelector('${P3} [data-action="sentence"]')` };
  }
  if (t.kind === "passoff-anchor") {
    if (!(await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000))) return { ok: false, note: "[data-passoff-view] 없음" };
    const x = pexp(t.id, t.licensed);
    const i = x.anchors.findIndex((a) => a.id === t.item);
    if (i < 0) return { ok: false, note: `데이터에 ① 문항 ${t.item} 없음` };
    // the sentences open in order like a learner (the sweep's stepAnchors): '영어 보기' of sentence k wakes after the ones before it
    // (first production run 18:2x: a3 alone → '6초 안에 깨지 않음' BLOCKED)
    const liOf = (k) => `(${STEP(1)} ? ${STEP(1)}.querySelectorAll('ol > li')[${k}] : null)`;
    for (let k = 0; k <= i; k++) {
      const btnK = `(() => { const li = ${liOf(k)}; return li ? [...li.querySelectorAll('button')].find((b) => /영어 보기/.test(b.innerText || '')) : null; })()`;
      if (!(await H.waitFor(tab, `(() => { const b = ${btnK}; return !!b && b.getAttribute('aria-disabled') !== 'true'; })()`, 6000, 150))) return { ok: false, note: `${k + 1}번 문장의 '영어 보기' 가 6초 안에 깨지 않음` };
      await H.click(tab, btnK);
      await H.waitFor(tab, `(() => { const li = ${liOf(k)}; return !!li && !!li.querySelector('p[lang=en][tabindex="-1"]'); })()`, 4000);
    }
    const li = liOf(i);
    if (!(await H.waitFor(tab, `(() => { const li = ${li}; return !!li && !!li.querySelector('button[aria-label="문장 듣기"]'); })()`, 4000))) return { ok: false, note: "'영어 보기' 뒤 '문장 듣기' 단추 없음" };
    return { ok: true, expr: `(() => { const li = ${li}; return li ? li.querySelector('button[aria-label="문장 듣기"]') : null; })()` };
  }
  if (t.kind === "passoff-compose") {
    if (!(await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000))) return { ok: false, note: "[data-passoff-view] 없음" };
    const n = t.circled === "④" ? 4 : 5;
    const c = await H.click(tab, `document.querySelector('main [data-passoff-view] [data-step-tab="${n}"]')`, { settle: 600 });
    if (!c.ok) return { ok: false, note: `${t.circled} 탭을 못 누름 (${c.reason})` };
    const x = pexp(t.id, t.licensed);
    const items = n === 4 ? x.produce : x.transfers;
    const target = items.find((p) => p.id === t.item);
    if (!target) return { ok: false, note: `데이터에 ${t.circled} 문항 ${t.item} 없음` };
    const right = new Set();
    let empty = 0;
    for (let guard = 0; guard < items.length * 6 + 12; guard++) {
      const card = await tab.eval(`(() => { const c = ${CARD(n)}; if (!c) return null; return { ko: [...c.querySelectorAll('p')].map((p) => (p.innerText || '').replace(/\\s+/g, ' ').trim()), answer: !!c.querySelector('textarea'), next: [...c.querySelectorAll('button')].some((b) => (b.innerText || '').trim() === '다음 문장') }; })()`).catch(() => null);
      if (!card) {
        const stepText = await tab.eval(`(${STEP(n)} || {}).innerText || ''`).catch(() => "");
        if (n === 4 && /다음 세트/.test(stepText)) { await H.click(tab, BTN_IN(STEP(4), "/^다음 세트$/"), { settle: 400 }); continue; }
        if (++empty > 20) return { ok: false, note: `${t.circled} 카드가 안 나옴(문항 ${t.item} 까지 못 감)` };
        await H.sleep(300); continue;
      }
      const item = items.find((p) => card.ko.includes(norm(p.ko)) && (!p.promptEn || card.ko.includes(norm(x.gloss(p.promptEn)))) && !right.has(p.id))
        || items.find((p) => card.ko.includes(norm(p.ko)) && (!p.promptEn || card.ko.includes(norm(x.gloss(p.promptEn)))));
      if (!item) return { ok: false, note: `${t.circled} 모르는 카드 — 데이터에서 못 찾음` };
      if (card.answer) {
        await H.type(tab, `(${CARD(n)} || document).querySelector('textarea[aria-label="영작 답"]')`, item.en);
        await H.sleep(100);
        await H.click(tab, BTN_IN(CARD(n), "/^(다시 )?확인$/"), { settle: 200 });
        const ok = /맞았어요/.test(await waitText(tab, n, /맞았어요/, 3000));
        if (item.id === t.item) {
          if (!ok) return { ok: false, note: `${t.circled} ${t.item} 모범 답이 '맞았어요' 가 안 됨 — 소리 단추가 안 나옴` };
          return { ok: true, expr: `(${CARD(n)} || document).querySelector('button[aria-label="문장 듣기"]')` };
        }
        if (ok) right.add(item.id);
        else for (let k = 0; k < 4; k++) { if (await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 250 }).then((c2) => c2.ok)) break; await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 250 }); }
        const nx = await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 });
        if (!nx.ok) return { ok: false, note: `${t.circled} ${item.id} '다음 문장' 을 못 누름` };
      } else if (card.next) await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 });
      else { await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 250 }); await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 }); }
    }
    return { ok: false, note: `${t.circled} ${t.item} 까지 못 감(되풀이 한도)` };
  }
  const s = await openGenericStep(tab, t);
  if (!s.ok) return { ok: false, note: `단계 '${t.step}' 를 못 엶 (${s.reason})` };
  if (t.course === "ld") await ldWalkTo(tab, genericControl(t.label));
  return { ok: true, expr: genericControl(t.label) };
}

/** one press · 12 s · the verdict against `want` (or the lesson's clips) */
async function pressAndJudge(tab, expr, want, lessonSet) {
  // a control inside a closed <details> (GRAMMAR's folded top player '정답 문장 전체 듣기' — [course]/[lesson]/page.tsx 434) is opened the
  // way a learner opens it: its <summary> first (first production run 18:3x: gh2-016 '재생' pressed while covered → no request)
  await H.click(tab, `(() => { const el = (${expr}); const d = el && el.closest('details'); return d && !d.open ? d.querySelector(':scope > summary') : null; })()`, { settle: 500 }).catch(() => null);
  await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  const c = await H.click(tab, expr);
  if (!c.ok) return { clicked: false, status: "BLOCKED", note: `control not found (${c.reason})`, clips: [], tts: [] };
  // covered: the trusted click landed on another element — the control was not pressed (not a product FAIL)
  if (c.covered) return { clicked: false, pressed: { text: c.text, covered: true, coveredBy: c.coveredBy }, status: "BLOCKED", note: `control covered by ' ${c.coveredBy || "?"}' — not pressed`, clips: [], tts: [] };
  let log = [];
  for (let i = 0; i < 48; i++) {
    log = await H.audioLog(tab);
    const requested = new Set(log.filter((e) => e.ev === "play()").map((e) => e.src));
    if (log.some((e) => (requested.has(e.src) && (e.ev === "playing" || (e.ev === "error" && e.err !== 1) || (e.ev === "play-rejected" && e.name !== "AbortError"))) || (e.ev === "tts.speak" && (e.text || "").trim()))) break;
    await H.sleep(250);
  }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const clips = H.summariseAudio(log);
  const tts = (clips.__tts || []).filter((x) => x && x.trim());
  delete clips.__tts;
  const paths = Object.keys(clips);
  const played = paths.filter((p) => clips[p].playing > 0);
  const errored = paths.filter((p) => clips[p].error > 0 || clips[p].rejected > 0);
  let status, note;
  if (errored.length) { status = "FAIL"; note = `clip error ${clips[errored[0]].errCode || clips[errored[0]].rejectName || ""}`.trim(); }
  else if (want && played.includes(want) && !tts.length) { status = "PASS"; note = ""; }
  else if (want && paths.length && !paths.includes(want)) { status = "FAIL"; note = `asked for ${paths[0]} — this control's clip is ${want}`; }
  else if (!want && played.some((p) => lessonSet.has(p)) && !tts.length) { status = "PASS"; note = ""; }
  else if (!want && played.length) { status = "FAIL"; note = `clip not in this lesson's data: ${played[0]}`; }
  else if (tts.length) { status = "FAIL"; note = `browser TTS spoke: "${tts[0].slice(0, 60)}"`; }
  else { status = "FAIL"; note = !paths.length ? "no audio request in 12 s" : "requested but never played"; }
  return { clicked: true, pressed: { text: c.text, covered: false }, status, note, clips: paths.map((p) => ({ path: p, ...clips[p], expected: want ? p === want : lessonSet.has(p) })), tts: tts.slice(0, 2) };
}

(async () => {
  // ⑤ memory: wait while less than 1 GB is free (this machine shares 7.9 GB with the sweeps)
  for (let w = 0; os.freemem() < 1024 ** 3; w++) { console.log(`남은 메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1GB — 1분 기다림 (${w + 1})`); await H.sleep(60000); }
  const browser = await H.startBrowser(CLONE, PORT);
  const res = { PASS: 0, FAIL: 0, BLOCKED: 0 };
  const perCourse = {};
  try {
    const tab = await H.openTab(browser, { clean: true });
    let current = null;
    let n = 0;
    const online = async () => { try { const r = await fetch(H.BASE + "/robots.txt", { signal: AbortSignal.timeout(10000) }); return r.ok; } catch { return false; } };
    for (const t of list) {
      while (!(await online())) { console.log("offline — waiting"); await H.sleep(60000); }
      // 스윕이 그 버튼을 본 크기로(7-1 f) — 휴대폰에서만 본 버튼은 단계 이름이 다르다
      const vp = DESKTOP_ONLY || t.viewports.has("desktop") ? "desktop" : t.viewports.has("mobile") ? "mobile" : t.viewports.has("small") ? "small" : [...t.viewports][0] || "desktop";
      if (vp !== current) { await H.setViewport(tab, vp); current = vp; }
      // T8 ①: wait for the page the address ends on (a GRAMMAR I odd id is a 307 to its even partner)
      const fin = await finalPathOf(t.url);
      const loaded = await H.load(tab, t.url, { marker: H.MARKERS[t.course], expectPath: fin && fin !== t.url ? fin : null });
      let rec;
      const base = { course: t.course, id: t.id, url: t.url, ...(t.requestedUrls && t.requestedUrls.size && [...t.requestedUrls].some((u) => u !== t.url) ? { requestedUrls: [...t.requestedUrls] } : {}), ...(fin && fin !== t.url ? { finalPath: fin } : {}), step: t.step, label: t.label, kind: t.kind, sweepViewports: [...t.viewports], openedAt: vp, sweepStatus: t.sweepStatus, sweepNote: t.sweepNote, at: new Date().toISOString(), base: H.BASE };
      if (!loaded.navigated || !loaded.rendered) rec = { ...base, clicked: false, status: "BLOCKED", note: `page did not load (${loaded.href})` };
      else {
        const r = await reach(tab, t);
        // want: 대상 파일의 칸 → 지금 화면에서 정한 것(빈칸 문제는 새로 연 쪽의 data-order) → 스윕 기록이 기대한 클립 → 데이터
        const dw = dataWant(t);
        let want = null, wantSource = "없음 — 그 강의의 클립이면 PASS";
        if (t.wantFromFile && t.want) { want = t.want; wantSource = t.wantSource; }
        else if (r.want) { want = r.want; wantSource = r.wantSource; }
        else if (t.want) { want = t.want; wantSource = t.wantSource; }
        else if (dw) { want = dw; wantSource = "데이터(PASS-OFF clipOf · ADULT 낱말 say · 덩어리 · 문장)"; }
        if (!r.ok) rec = { ...base, want, wantSource, clicked: false, status: "BLOCKED", note: `could not reach: ${r.note}` };
        else {
          const j = await pressAndJudge(tab, r.expr, want, want ? new Set() : lessonClips(t));
          // 데이터로 정해지는 버튼(PASS-OFF 문항 · ADULT 낱말 · 덩어리 · 문장)은 기록의 클립이 데이터와 달라도 FAIL — 스윕이 다른 문장을 기대했다는 뜻
          if (dw && want && dw !== want && j.status === "PASS") { j.status = "FAIL"; j.note = `played ${want} (${wantSource}) — the data's clip for this control is ${dw}`; }
          rec = { ...base, want, wantSource, ...(dw && want && dw !== want ? { dataWant: dw } : {}), ...j };
        }
      }
      out.write(rec);
      res[rec.status]++;
      const pc = (perCourse[t.course] ||= { PASS: 0, FAIL: 0, BLOCKED: 0 }); pc[rec.status]++;
      n++;
      console.log(`${n}/${list.length} ${rec.status.padEnd(7)} ${t.url} [${vp}] · ${t.step} ▶ ${String(t.label).slice(0, 30)} ${rec.note || ""}${rec.status === "PASS" ? ` · ${(rec.clips || []).filter((c) => c.playing > 0).map((c) => c.path.split("/").pop()).join(",")}` : ""}`);
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  console.log(`끝: PASS ${res.PASS} · FAIL ${res.FAIL} · BLOCKED ${res.BLOCKED} — 과정별 ${JSON.stringify(perCourse)} · 결과 ${path.relative(process.cwd(), outFile)}`);
  process.exit(res.FAIL || res.BLOCKED ? 1 : 0);
})();
