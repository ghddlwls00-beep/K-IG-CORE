#!/usr/bin/env node
/**
 * 명령서 §17·§19 가 요구하는 숫자 커버리지 표.
 *
 * The command sets a hard rule: for lessons, PASS + FAIL + BLOCKED + NOT TESTED must equal
 * DISCOVERED, and nothing untested may be called PASS. This computes those numbers from the
 * recorded evidence rather than from anyone's impression, and refuses to balance the books by
 * guessing — a lesson with no record is NOT TESTED, and says so.
 *
 * Feature counts are kept separate from lesson counts, as the command also requires.
 *
 *   node build-coverage.cjs --since <ISO 시각> | --files a.jsonl,b.jsonl  [--features-dir d] [--out-dir d]
 * Output: out/coverage.json + printed tables (markdown, ready for the report)
 *
 * 7단계 7-1 m (3차 점검이 정함 · PROMPT-7단계.md 7-1 m) — 이 도구가 관문 6 · 11 숫자를 틀리게 내던 넷을 고침:
 *   ① 과정은 파일 이름이 아니라 기록의 course 로. 전에는 <과정>(-sN|-tiles|-tiles2|-step|-smoke).jsonl 이름만 받아 7단계 다시 돌림
 *     (student-tiles71b-t1 · ld-r3s1 · ld-post6 …)이 전부 빠졌다. 셀 기록은 --since(그 시각 뒤 기록) 또는 --files 로만 고르고,
 *     둘 다 없으면 exit 1 — 기본값이 옛 기록을 섞지 않게(관문 6 '옛 기록을 섞지 마라', 7-1 h 와 같은 원리).
 *   ② 강의 × 화면마다 가장 늦은 기록만 셈. 전에는 모든 기록을 합쳐 옛 FAIL · BLOCKED 가 나중 PASS 를 덮었다.
 *   ③ 도구 잘못 목록에 없는 BLOCKED 는 강의를 BLOCKED 로 + 사유(기능 · 항목 · note). 전에는 세기만 하고 판정에 안 써서 그 강의가 PASS 였다.
 *   ④ tile dictation 의 '도구 탓 · 다시 돌려야'(DICTATION-WITHDRAWN)는 받아쓰기 루틴을 고치기 전 기록에만. 전에는 note /./ 라
 *     고친 드라이버의 진짜 받아쓰기 FAIL 도 BLOCKED 로 셌다.
 *   ⑤ NA: 드라이버가 '해당 없음 — 다른 검사가 봄' 을 NA + coveredBy(그 검사 이름)로 적고, 같은 기록에 그 검사가 PASS 로 있을 때만 덮인 것으로 셈
 *     (없으면 BLOCKED 'NA 인데 대신 본 기록 없음'). 옛 기록의 'graded input · BLOCKED · tile-based answering …' 은 옛 기록에서만 NA(tile dictation) 로 읽음.
 *   ⑥ GRAMMAR 'graded input' 의 도구 탓은 판정이 없는 칸(자가 채점 · 빈칸 안내 · 제출 전 종합 평가)만 — 전에는 note /./ (아래 TOOL_ARTIFACTS).
 *   증명(깨기) scripts/prove-coverage-rules.cjs — --break=ignore-blocked | merge-all | old-dictation-rule | grammar-any-note 가 옛 동작.
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const argOf = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SINCE = argOf("--since", null);
const FILES = argOf("--files", null);
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (!SINCE && !FILES) {
  console.error("build-coverage: --since <시각> 또는 --files <목록> 이 필요합니다 — 기본값으로 옛 기록을 섞지 않습니다(7단계 7-1 m).");
  process.exit(1);
}
if (SINCE && Number.isNaN(Date.parse(SINCE))) { console.error(`build-coverage: --since 시각을 읽을 수 없음: ${SINCE}`); process.exit(1); }
if (BREAK && !["ignore-blocked", "merge-all", "old-dictation-rule", "grammar-any-note"].includes(BREAK)) { console.error(`build-coverage: 모르는 --break=${BREAK}`); process.exit(2); }
const DATA = path.join(__dirname, "../out");                       // the other audit results the item table reads
const OUT = path.resolve(argOf("--out-dir", DATA));                // where coverage.json / .md are written
const FEAT = path.resolve(argOf("--features-dir", path.join(DATA, "features")));

const COURSE_LABEL = { student: "STUDENT", phonics: "VOCA", grammar1: "GRAMMAR I", grammar2: "GRAMMAR II", ld: "LISTENING", reading: "READING" };
// The command's baseline counts main lessons only; this repo also serves script/answer pages,
// which §0 says to audit and count separately.
const BASELINE_MAIN = { student: 81, phonics: 195, grammar1: 53, grammar2: 44, ld: 276, reading: 256 };

const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); } catch { return null; } };

// ---------------------------------------------------------------- 강의 단위 커버리지
/**
 * Failures already traced to THIS AUDIT's own tooling (findings-log.md, the WITHDRAWN rows).
 * They must not be counted as product failures — but they must not be counted as passes either,
 * because the driver was fixed and those lessons have not been re-taken yet. A lesson whose only
 * failures are on this list is BLOCKED, with the reason recorded, exactly as §17 requires.
 */
/**
 * `resolved: true` means the record on disk is enough to settle the question once it is read with
 * the corrected expectations — the browser does not have to drive the page again, so the lesson
 * can still pass. `resolved: false` means the browser genuinely did the wrong thing and the page
 * must be taken again before anything can be claimed about it.
 */
/**
 * ⑥ GRAMMAR 'graded input' (3차 점검 2026-09-24, 7-1 m ④ 와 같은 종류): 전에는 note /./ 라 GRAMMAR 의 어떤 graded input FAIL 도
 * 통째로 '해결된 도구 탓' 이 됐다. 도구 탓은 판정이 없는 칸 — 정답을 넣어도 틀린 답을 넣어도 화면이 채점을 말하지 않는 칸 — 뿐이다:
 * 자가 채점 화면('자가 채점 정답률') · 빈칸 안내('빈칸에 알맞은 단어를 직접 입력하거나 [빈칸 정답 확인]') · 제출 전 종합 평가 칸
 * ('no feedback' · '[전체 채점하기]를 누르면'). -post7c 표본(90방문)의 GRAMMAR FAIL 499 = 254 · 47 · 181 + 17 이 전부 이 셋이었다.
 * correct→ 와 wrong→ 가 둘 다 이 셋일 때만 도구 탓 — 한쪽이라도 다른 글(예: 정답인데 '오답')이면 강의 FAIL 로 센다.
 */
const GRAMMAR_NO_VERDICT = "(?:자가 채점 정답률[^|]*|no feedback|[^|]*빈칸에 알맞은 단어를 직접 입력하거나[^|]*|[^|]*\\[전체 채점하기\\]를 누르면[^|]*)";
const GRAMMAR_NO_VERDICT_NOTE = new RegExp(`^correct→${GRAMMAR_NO_VERDICT}\\s*\\|\\s*wrong→${GRAMMAR_NO_VERDICT}\\s*(?:\\||$)`);
const TOOL_ARTIFACTS = [
  { courses: ["phonics"], feature: "step", note: /이 단어로 Step 2/, resolved: true,
    why: "단계 탭이 아닌 Step 1 안의 링크를 단계로 오인 — 585건 전부 같은 이름 하나이고 실제 단계 4개는 통과 (VOCA-STEP-WITHDRAWN)" },
  { courses: ["grammar1", "grammar2"], feature: "graded input", note: BREAK === "grammar-any-note" ? /./ : GRAMMAR_NO_VERDICT_NOTE, noteOnly: true, resolved: true,
    why: "판정이 없는 칸(자가 채점 · 빈칸 안내 · 제출 전 종합 평가)을 자동 채점으로 오인 — 자동 채점은 강의 282개 전수로 따로 확인함 (GRADE-EXAM-PASS)" },
  { courses: ["grammar1"], feature: "navigation", note: /./, resolved: true,
    why: "넘어가기 전 주소의 이웃과 비교했음 — 넘어간 뒤 페이지 기준으로 재평가하니 64건 전부 정상 (NAV-WITHDRAWN)" },
  { courses: ["ld", "student"], feature: "tile dictation", note: /./, resolved: false, oldTileRoutineOnly: true,
    why: "도구가 이미 놓은 타일을 다시 눌러 다른 문장을 만들었음 — 고친 도구로 재점검해야 판정 가능 (DICTATION-WITHDRAWN)" },
];
/**
 * ④ When the tile routine was fixed (7단계 7-1 b): the by-place tapping, reset-before-choosing, BLOCKED instead of a silent
 * return, the 60-word ceiling and the slash expectations were all loaded by every driver process that wrote after this moment
 * (the last process started before the final fix — the 25-word ceiling — wrote its last record at 19:42:10Z; LISTENING
 * ld-tiles71b-long-* was the first run after it). A record from then on — or one carrying `driverRev`, which drive-generic
 * writes from 7-1 m — is judged as it stands: its tile dictation FAIL is the product's FAIL, its BLOCKED keeps its own reason.
 */
const TILE_ROUTINE_FIXED_AT = "2026-09-23T19:42:30.000Z";
const isNewTileRoutine = (rec) => Boolean(rec.driverRev) || String(rec.at || "") >= TILE_ROUTINE_FIXED_AT;
// the identifying text can be in either field: "step button not clickable" is the note, while the
// control that was mistaken for a step tab is the item
const isArtifact = (course, check, rec) => TOOL_ARTIFACTS.find((a) => a.courses.includes(course) && a.feature === check.feature
  && !(a.oldTileRoutineOnly && BREAK !== "old-dictation-rule" && isNewTileRoutine(rec))
  // noteOnly: the rule describes what the SCREEN answered (the note) — the item is just the question number
  && (a.note.test(String(check.note || "")) || (!a.noteOnly && a.note.test(String(check.item || "")))));
/**
 * ⑤ 'not applicable here — another check covers it'. drive-generic writes it as status NA + coveredBy (7-1 m); records made
 * before that wrote the LISTENING/STUDENT tile pages' typed-input line as BLOCKED with this note — read as NA only there.
 */
const LEGACY_TILE_NA = /^tile-based answering — checked by grade-offline\.cjs and the tile routine/;
/**
 * NA is allowed for three things only (3차 점검, PROMPT-7단계 7-1 m c652b81):
 *   ⓐ absent  — by design not in THIS place (the record states the code evidence, `absentEvidence`) AND the same feature was checked
 *              in another place in the same record (a PASS of the same feature) — otherwise BLOCKED
 *   ⓑ sampled — bookmark/completion survive a reload, exercised on every Nth lesson (--persist-every): covered only when this selection
 *              holds at least one PASS of that reload test for the same course
 *   ⓒ covered — coveredBy names the check (the typed-input line of a tile page → tile dictation): covered only when the SAME record holds it as PASS
 * Anything else written as NA is not covered (BLOCKED 'NA 인데 대신 본 기록 없음'). The drivers before 7-1 m wrote 'no bookmark control on
 * this page' and 'no completion control' as NA: the header bookmark is on every lesson, and STUDENT completes at the end of Step 3
 * (LessonActionButtons draws the header completion button only when course !== "student") — so those are BLOCKED, with that reason.
 */
const asNa = (check, rec) => {
  if (check.status === "NA") {
    const note = String(check.note || "");
    if (check.coveredBy) return { kind: "covered", coveredBy: check.coveredBy };
    if (check.absent && check.absentEvidence) return { kind: "absent", feature: check.feature };
    if (check.sampledBy || /exercised on the sampled lessons/.test(note)) return { kind: "sampled" };
    if (/^no bookmark control/.test(note)) return { kind: "not-na", why: "북마크 단추를 못 찾음 — 머리 북마크는 모든 강의에 있어 NA 가 아님" };
    if (/^no completion control/.test(note)) return { kind: "not-na", why: rec.course === "student" ? "STUDENT 완료(3단계 '이 강의 학습 완료')를 누르지 않음 — 옛 드라이버는 첫 화면만 봄" : "완료 단추를 못 찾음" };
    return { kind: "covered", coveredBy: null };
  }
  if (!rec.driverRev && check.status === "BLOCKED" && check.feature === "graded input" && LEGACY_TILE_NA.test(String(check.note || ""))) return { kind: "covered", coveredBy: "tile dictation", legacy: true };
  return null;
};
const isReloadTest = (c) => c.status === "PASS" && ((c.feature === "bookmark" && /reload/.test(String(c.item || ""))) || (c.feature === "completion" && /reload/.test(String(c.item || ""))));

/**
 * The same for audio. LISTENING's STEP 3 "연음 & 소리 클리닉" speaks the preset phrases of
 * generateLiaisonPoints ("want to" → "wanna"), not the lesson's sentences, so the audit's list of
 * texts this lesson may speak did not contain them and 1,198 correct plays were recorded as "a
 * clip of another lesson". All 518 of those clip files exist, and the corrected expectations
 * account for every one of the 1,198 (LD-LIAISON-WITHDRAWN).
 */
const AUDIO_ARTIFACTS = [
  { courses: ["ld"], control: /연음 & 소리 클리닉/, note: /clip not in this lesson's data/, resolved: true,
    why: "연음 클리닉은 강의 문장이 아니라 발음 규칙 preset 을 말함 — 클립 518개 전부 존재하고 기록 1,198건이 모두 설명됨 (LD-LIAISON-WITHDRAWN)" },
];
const isAudioArtifact = (course, a) => AUDIO_ARTIFACTS.find((x) => x.courses.includes(course) && x.control.test(String(a.control || "")) && x.note.test(String(a.note || "")));

// ① ② which records count: --files and/or --since · the course is the record's own · the latest record per lesson × screen
const fileFilter = FILES ? new Set(FILES.split(",").map((s) => path.basename(s.trim())).filter(Boolean)) : null;
if (fileFilter) for (const f of fileFilter) if (!fs.existsSync(path.join(FEAT, f))) { console.error(`build-coverage: --files 의 ${f} 가 ${FEAT} 에 없음`); process.exit(1); }
const sinceMs = SINCE ? Date.parse(SINCE) : null;
// records written before `course` was stored fall back to the old file-name rule
const fileCourse = (f) => { const c = f.replace(/(-s\d+|-tiles2?|-step|-smoke)?\.jsonl$/, ""); return COURSE_LABEL[c] ? c : null; };
const counted = { files: 0, records: 0, beforeSince: 0, noCourse: 0 };
const latestVisit = new Map();   // course|id|viewport → the latest record
const everyVisit = [];           // --break=merge-all: the old behaviour, every record of a lesson counted
for (const f of fs.readdirSync(FEAT).filter((x) => x.endsWith(".jsonl")).sort()) {
  if (fileFilter && !fileFilter.has(f)) continue;
  counted.files++;
  for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    const course = COURSE_LABEL[r.course] ? r.course : fileCourse(f);
    if (!course) { counted.noCourse++; continue; }
    if (sinceMs !== null && !(Date.parse(r.at) >= sinceMs)) { counted.beforeSince++; continue; }
    const id = String(r.url || "").split("/").pop() || r.id;
    if (!id) continue;
    counted.records++;
    const rec = { ...r, course, id, file: f };
    if (BREAK === "merge-all") { everyVisit.push(rec); continue; }
    const k = `${course}|${id}|${r.viewport}`;
    const prev = latestVisit.get(k);
    if (!prev || String(r.at || "") >= String(prev.at || "")) latestVisit.set(k, rec);
  }
}

const perLesson = {};      // course -> id -> { viewports, fails, failWhy, blockedWhy, artifacts, mustRedo }
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").slice(0, n);
// ⑤ how the NA lines were read — per course: covered by the named check in the same record / not covered / of which the old name /
// page has no such control / sampled (reload test) — and whether the selection holds a reload-test PASS for the course
const naStats = {};
const reloadPass = {};
for (const r of BREAK === "merge-all" ? everyVisit : latestVisit.values()) {
  const { course, id } = r;
  const e = ((perLesson[course] ||= {})[id] ||= { viewports: new Set(), fails: 0, failWhy: [], blockedWhy: [], visitErrors: 0, artifacts: new Set(), mustRedo: new Set() });
  if (r.visitError) { e.visitErrors++; continue; }
  e.viewports.add(r.viewport);
  const checks = r.checks || [];
  if (checks.some(isReloadTest)) reloadPass[course] = true;
  for (const c of checks) {
    const na = asNa(c, r);
    if (na) {
      const s = (naStats[course] ||= { covered: 0, uncovered: 0, legacyName: 0, absent: 0, sampled: 0, notNa: 0 });
      if (na.kind === "not-na") { s.notNa++; e.blockedWhy.push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60), note: na.why }); continue; }
      if (na.kind === "absent") {
        // ⓐ the same feature must have been checked (PASS) in another place of the same record
        if (checks.some((x) => x !== c && x.feature === na.feature && x.status === "PASS")) { s.absent++; continue; }
        s.uncovered++;
        e.blockedWhy.push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60), note: "NA(그 자리에 없음) 인데 같은 기능을 다른 자리에서 본 기록 없음" });
        continue;
      }
      if (na.kind === "sampled") { s.sampled++; (e.sampledNa ||= []).push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60) }); continue; }
      // ⑤ covered only when the SAME record holds the covering check as PASS
      const covered = na.coveredBy && checks.some((x) => x !== c && x.feature === na.coveredBy && x.status === "PASS");
      s[covered ? "covered" : "uncovered"]++;
      if (na.legacy) s.legacyName++;
      if (!covered) e.blockedWhy.push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60), note: `NA 인데 대신 본 기록 없음 (coveredBy ${na.coveredBy || "없음"})` });
      continue;
    }
    if (c.status === "FAIL") {
      const a = isArtifact(course, c, r);
      if (a) { (a.resolved ? e.artifacts : e.mustRedo).add(a.why); continue; }
      e.fails++;
      e.failWhy.push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60), note: clip(c.note, 120) });
    } else if (c.status === "BLOCKED") {
      const a = isArtifact(course, c, r);
      if (a) (a.resolved ? e.artifacts : e.mustRedo).add(a.why);
      // ③ not on the tool-artifact list → it blocks the lesson, with its own reason (--break=ignore-blocked: the old behaviour)
      else if (BREAK !== "ignore-blocked") e.blockedWhy.push({ viewport: r.viewport, feature: c.feature, item: clip(c.item, 60), note: clip(c.note, 120) });
    }
  }
  for (const a of r.audio || []) {
    if (a.status !== "FAIL") continue;
    const art = isAudioArtifact(course, a);
    if (art) { (art.resolved ? e.artifacts : e.mustRedo).add(art.why); continue; }
    e.fails++;
    e.failWhy.push({ viewport: r.viewport, feature: "audio", item: clip(a.control, 60), note: clip(a.note, 120) });
  }
  for (const p of r.problems || []) { e.fails++; e.failWhy.push({ viewport: r.viewport, feature: "problem", item: "", note: clip(JSON.stringify(p), 160) }); }
}

const rows = [];
const blockedReasons = {};
const resolvedReasons = {};
const lessonDetail = {};   // course -> id -> { status, why[] } — 관문 6 · 11: '강의마다 사유'
const totals = { discovered: 0, main: 0, script: 0, pass: 0, fail: 0, blocked: 0, notTested: 0 };
const say = (w) => `${w.viewport} · ${w.feature}${w.item ? ` · ${w.item}` : ""} · ${w.note}`;
for (const course of E.COURSES) {
  const pages = E.pages(course);
  const idx = E.courseIndex(course).lessons || [];
  const isMain = (id) => (idx.find((l) => l.id === id) || {}).variant === "main";
  let pass = 0, fail = 0, blocked = 0, notTested = 0, main = 0, script = 0;
  for (const p of pages) {
    (isMain(p.id) ? main++ : script++);
    const e = (perLesson[course] || {})[p.id];
    const put = (status, why) => { (lessonDetail[course] ||= {})[p.id] = { status, why }; };
    // ⑤ sampled NA: the reload test must have passed on some lesson of this course in this selection
    if (e && e.sampledNa && !reloadPass[course]) for (const w of e.sampledNa) e.blockedWhy.push({ ...w, note: "NA(표본 검사) 인데 이 선택에 그 과정의 새로고침 검사 PASS 가 없음" });
    if (!e || !e.viewports.size) { notTested++; put("NOT TESTED", [e && e.visitErrors ? `방문 오류만 ${e.visitErrors}` : "셀 기록 없음"]); continue; }
    if (e.fails) { fail++; put("FAIL", e.failWhy.map(say)); }
    // the page genuinely has to be driven again before anything can be said about it
    else if (e.mustRedo.size) { blocked++; for (const w of e.mustRedo) blockedReasons[w] = (blockedReasons[w] || 0) + 1; put("BLOCKED", [...e.mustRedo]); }
    else if (e.blockedWhy.length) {
      blocked++;
      for (const w of new Set(e.blockedWhy.map((x) => `점검 BLOCKED — ${x.feature} · ${clip(x.note, 70)}`))) blockedReasons[w] = (blockedReasons[w] || 0) + 1;
      put("BLOCKED", e.blockedWhy.map(say));
    }
    else if (e.viewports.size < 3) { blocked++; blockedReasons["화면 3종 중 일부만 기록됨"] = (blockedReasons["화면 3종 중 일부만 기록됨"] || 0) + 1; put("BLOCKED", [`화면 ${[...e.viewports].sort().join(" · ")} 만 기록됨`]); }
    // failures that the record itself settles once read with the corrected expectations
    else { pass++; for (const w of e.artifacts) resolvedReasons[w] = (resolvedReasons[w] || 0) + 1; put("PASS", [...e.artifacts]); }
  }
  const discovered = pages.length;
  rows.push({
    course: COURSE_LABEL[course], baselineMain: BASELINE_MAIN[course], main, script, discovered,
    pass, fail, blocked, notTested,
    balanced: pass + fail + blocked + notTested === discovered,
  });
  totals.discovered += discovered; totals.main += main; totals.script += script;
  totals.pass += pass; totals.fail += fail; totals.blocked += blocked; totals.notTested += notTested;
}
totals.balanced = totals.pass + totals.fail + totals.blocked + totals.notTested === totals.discovered;

// ---------------------------------------------------------------- 항목 단위 커버리지 (강의 수와 섞지 않음)
const feat = read("features-summary.json");
const inv = read("audio-inventory.json");
const integ = read("data-integrity.json");
const exam = read("grammar-exam.json");
const dict = read("dictation-offline.json");
const cov = read("review-coverage.json");
const lic = read("audio-check-licensed.json");

let questions = 0;
for (const course of E.COURSES) for (const p of E.pages(course)) questions += (E.expected(course, p.id).answers || []).length;
let units = 0;
for (const course of E.COURSES) for (const p of E.pages(course)) units += (E.expected(course, p.id).texts || []).length;

const items = [
  { what: "과정 (course)", identified: E.COURSES.length, tested: E.COURSES.length, how: "6개 과정 전부" },
  // 2026-09-26 명령서 대조표가 찾음: 전에는 20 · 20 을 손으로 적어 두어 check-student-unlock 이 돌지 않아도 '20/20' 으로 나왔음 → 그 결과 파일에서 읽음(없으면 '안 잼')
  (() => { let u = null; try { u = JSON.parse(fs.readFileSync(path.join(__dirname, "../out/student-unlock.json"), "utf8")); } catch {} return { what: "챕터·스테이지 (STUDENT)", identified: u ? u.chapters.length : "안 잼", tested: u ? (u.problems.length ? `${u.chapters.length} · 지적 ${u.problems.length}` : u.chapters.length) : "안 잼", how: u ? `scripts/check-student-unlock.cjs(out/student-unlock.json ${u.at})` : "scripts/check-student-unlock.cjs — 결과 파일 없음" }; })(),
  { what: "강의 (main + script)", identified: totals.discovered, tested: totals.discovered - totals.notTested, how: "out/features/*.jsonl" },
  { what: "학습 단위 (화면에 나와야 할 문장·낱말)", identified: units, tested: feat ? feat.summary && Object.values(feat.summary).reduce((a, s) => a + (s.content ? s.content.expected : 0), 0) : "?", how: "데이터 대조" },
  { what: "VOCA 낱말", identified: integ ? integ.vocaStats.words : "?", tested: integ ? integ.vocaStats.withMeaning : "?", how: "scripts/check-data-integrity.cjs" },
  { what: "채점 문항", identified: questions, tested: (exam ? exam.lessons : 0) && questions, how: "scripts/grade-offline.cjs + check-grammar-exam.cjs" },
  { what: "딕테이션 문장", identified: dict ? dict.sentences : "?", tested: dict ? dict.sentences : "?", how: "scripts/check-dictation.cjs" },
  { what: "음성 클립", identified: inv ? inv.clips.length : "?", tested: lic ? (lic.clips || lic.results || []).length : "379 (표본 아님: 누락 후보 전수)", how: "audio-inventory + probe-missing-clips (전수는 대기열)" },
  { what: "음성 버튼 누름", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", tested: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", how: "실제 클릭" },
  { what: "기능 확인 항목", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + Object.values(s.checks).reduce((x, y) => x + y, 0), 0) : "?", tested: "동일", how: "out/features-summary.json" },
  { what: "교육 내용 검토 대상 강의", identified: cov ? cov.total : "?", tested: cov ? cov.covered : "?", how: "scripts/check-review-coverage.cjs" },
];

const selection = { since: SINCE, files: fileFilter ? [...fileFilter] : null, break: BREAK || null, ...counted };
const out = { at: new Date().toISOString(), selection, naStats, lessons: { rows, totals, blockedReasons, detail: lessonDetail }, items };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "coverage.json"), JSON.stringify(out, null, 1));

const md = [];
md.push(`셀 기록: ${SINCE ? `--since ${SINCE}` : ""}${SINCE && fileFilter ? " · " : ""}${fileFilter ? `--files ${[...fileFilter].join(", ")}` : ""} — 파일 ${counted.files} · 기록 ${counted.records}` +
  `${counted.beforeSince ? ` (그 시각 전이라 뺀 기록 ${counted.beforeSince})` : ""} · 강의 × 화면마다 가장 늦은 기록${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
if (Object.keys(naStats).length) md.push(`NA(해당 없음): ${Object.entries(naStats).map(([c, s]) => `${COURSE_LABEL[c]} — 다른 검사가 봄: 덮임 ${s.covered} · 안 덮임 ${s.uncovered}${s.legacyName ? `(옛 이름 ${s.legacyName})` : ""} · 그 자리에 없음(다른 자리 PASS) ${s.absent} · 표본 검사 ${s.sampled}${s.sampled ? (reloadPass[c] ? "(새로고침 PASS 있음)" : "(새로고침 PASS 없음 → BLOCKED)") : ""}${s.notNa ? ` · NA 가 아닌데 NA 로 적힌 것 ${s.notNa}(→ BLOCKED)` : ""}`).join(" / ")}`);
md.push("");
md.push("### 강의 커버리지 (§17: PASS + FAIL + BLOCKED + NOT TESTED = DISCOVERED)");
md.push("");
md.push("| 과정 | 명령서 기준(본강의) | 발견 본강의 | 발견 스크립트 | 발견 합계 | PASS | FAIL | BLOCKED | NOT TESTED | 합계 일치 |");
md.push("|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) md.push(`| ${r.course} | ${r.baselineMain} | ${r.main} | ${r.script} | ${r.discovered} | ${r.pass} | ${r.fail} | ${r.blocked} | ${r.notTested} | ${r.balanced ? "✔" : "✘"} |`);
md.push(`| **합계** | **905** | **${totals.main}** | **${totals.script}** | **${totals.discovered}** | **${totals.pass}** | **${totals.fail}** | **${totals.blocked}** | **${totals.notTested}** | ${totals.balanced ? "✔" : "✘"} |`);
md.push("");
if (Object.keys(blockedReasons).length) {
  md.push("**BLOCKED 사유** (§17: 점검하지 못한 것은 반드시 사유와 함께 BLOCKED 로 분류)");
  md.push("");
  for (const [why, n] of Object.entries(blockedReasons).sort((a, b) => b[1] - a[1])) md.push(`- 강의 ${n}개 — ${why}`);
  md.push("");
}
// 관문 6 · 11: 강의마다 사유 — FAIL 과 BLOCKED(화면 수만 모자란 것은 위 합계로 충분해 빼고)
const listed = [];
for (const [course, ids] of Object.entries(lessonDetail)) for (const [id, d] of Object.entries(ids)) {
  if (d.status === "FAIL" || (d.status === "BLOCKED" && !/만 기록됨$/.test(d.why[0] || ""))) listed.push(`- ${COURSE_LABEL[course]} ${id} **${d.status}** — ${d.why.slice(0, 3).join(" / ")}${d.why.length > 3 ? ` / … 외 ${d.why.length - 3}` : ""}`);
}
if (listed.length) {
  md.push(`**FAIL · BLOCKED 강의별 사유** (${listed.length}강 — 화면 수만 모자란 BLOCKED 는 위 합계에만)`);
  md.push("");
  for (const l of listed) md.push(l);
  md.push("");
}
if (Object.keys(resolvedReasons).length) {
  md.push("**PASS 로 판정했으나 감사 도구의 실패 기록이 남아 있는 강의** (기록을 고친 기준으로 다시 읽어 해소됨 — 브라우저 재실행 불필요)");
  md.push("");
  for (const [why, n] of Object.entries(resolvedReasons).sort((a, b) => b[1] - a[1])) md.push(`- 강의 ${n}개 — ${why}`);
  md.push("");
}
md.push("### 항목 커버리지 (강의 수와 별도)");
md.push("");
md.push("| 항목 | 확인 대상 | 확인함 | 방법 |");
md.push("|---|---|---|---|");
for (const i of items) md.push(`| ${i.what} | ${i.identified} | ${i.tested} | ${i.how} |`);
const text = md.join("\n");
fs.writeFileSync(path.join(OUT, "coverage.md"), text);
console.log(text);
console.log(`\nNOT TESTED ${totals.notTested} — ${totals.notTested ? "0 이 되기 전에는 감사 완료라고 말할 수 없습니다 (§17)" : "전부 점검됨"}`);
console.log(`→ ${path.join(OUT, "coverage.json")} · coverage.md`);
