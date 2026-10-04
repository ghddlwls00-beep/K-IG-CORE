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
 *   node build-coverage.cjs --since <ISO 시각> | --files a.jsonl,b.jsonl  [--features-dir d] [--out-dir d] [--screens desktop,mobile,small]
 *   (회귀 점검 1002: 과정 목록은 아래 COURSE_TABLE 하나 — ADULT · PASS-OFF GRAMMAR 더함)
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
 *
 * 회귀 점검 1002 단계 0 마무리 (fixes-0d, 2026-10-04) — 셋을 더 고침(깨기는 같은 prove-coverage-rules 의 X · Y · Z 사례):
 *   ⑦ READING '실제 마이크 인식' BLOCKED(headless 불가)는 강의 BLOCKED 가 아니라 표 아래 '실기기 몫' 한 줄(DEVICE_ONLY) — --break=device-only-blocks 가 옛 동작
 *   ⑧ 깨기 기록(`break` 칸 · 파일 이름 '-break-')과 로컬 기록(base localhost — proof 의 깨뜨린 앱 사본)은 셈에서 빼고 몇 건인지만 적음
 *     — --break=count-break-records 가 옛 동작
 *   ⑨ '학습 단위 · 확인함' 은 이 표가 센 기록(강의마다 데스크톱 가장 늦은 기록의 content)에서 — 과정별(PASS-OFF 포함)로 적음.
 *     전에는 다른 묶음(out/features-summary.json)에서 읽어 없으면 '?' — --break=units-from-summary 가 옛 동작
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
// fixes-0d (회귀 점검 1002 단계 0 마무리, 2026-10-04): device-only-blocks · count-break-records · units-from-summary 가 고치기 전 동작
if (BREAK && !["ignore-blocked", "merge-all", "old-dictation-rule", "grammar-any-note", "no-adult", "no-passoff", "device-only-blocks", "count-break-records", "units-from-summary"].includes(BREAK)) { console.error(`build-coverage: 모르는 --break=${BREAK}`); process.exit(2); }
const DATA = path.join(__dirname, "../out");                       // the other audit results the item table reads
const OUT = path.resolve(argOf("--out-dir", DATA));                // where coverage.json / .md are written
const FEAT = path.resolve(argOf("--features-dir", path.join(DATA, "features")));

/**
 * The courses this table counts — ONE list (회귀 점검 1002 단계 0, 2026-10-04). It used to be E.COURSES for the rows and COURSE_LABEL
 * for which records count, two lists that drifted: ADULT (2026-10-02) was in neither, so its records were dropped as 'no course' and
 * the table had no ADULT row at all; PASS-OFF GRAMMAR (2026-09-28) was in E.COURSES but not in the labels, so its 67 pages were counted
 * NOT TESTED under the label 'undefined' while its records were thrown away.
 * `baselineMain` is the command's count of main lessons (this repo also serves script/answer pages, counted separately — §0).
 * To add a course: one line here. A course of E.COURSES that is not here is printed under the table as '아직 세지 않음', never left
 * out silently.
 * PASS-OFF GRAMMAR (회귀 점검 1002 단계 0 · proof, 2026-10-04): its records come from drive-passoff.cjs (one line per lesson × screen,
 * the same shape as drive-generic — course 'passoff-grammar', checks/audio/problems, a 'content' check that FAILs on a missing text).
 * Its '학습 단위' count comes from lib/passoff-expect.cjs (expectations.cjs has no PASS-OFF branch — it would count 0).
 * --break=no-adult / no-passoff: the list without that course (before 10-04) — proves that the row comes from this list.
 */
const COURSE_TABLE = [
  { slug: "student", label: "STUDENT", baselineMain: 81 },
  { slug: "adult", label: "ADULT", baselineMain: 55 },
  { slug: "passoff-grammar", label: "PASS-OFF GRAMMAR", baselineMain: 67 },
  { slug: "phonics", label: "VOCA", baselineMain: 195 },
  { slug: "grammar1", label: "GRAMMAR I", baselineMain: 53 },
  { slug: "grammar2", label: "GRAMMAR II", baselineMain: 44 },
  { slug: "ld", label: "LISTENING", baselineMain: 276 },
  { slug: "reading", label: "READING", baselineMain: 256 },
].filter((c) => !(BREAK === "no-adult" && c.slug === "adult") && !(BREAK === "no-passoff" && c.slug === "passoff-grammar"));
const COURSES = COURSE_TABLE.map((c) => c.slug);
const COURSE_LABEL = Object.fromEntries(COURSE_TABLE.map((c) => [c.slug, c.label]));
const BASELINE_MAIN = Object.fromEntries(COURSE_TABLE.map((c) => [c.slug, c.baselineMain]));
const NOT_COUNTED = E.COURSES.filter((c) => !COURSES.includes(c));
// --screens desktop,mobile,small: the screens every lesson must have a record of (회귀 점검 1002 — '휴대폰 · 작은 휴대폰 · 데스크톱').
// Without it, any three screens (the rule before).
const SCREENS = argOf("--screens", null) ? argOf("--screens", "").split(",").map((s) => s.trim()).filter(Boolean) : null;

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
// 2026-09-27 (GRAMMAR 학습법 · 화면 고침 — GRM-L03 ④ · U05 · U18): the three texts above left the screen (the stats card, the
// Step 2 and Step 4 guides). The generic driver reads the FIRST line of <main> holding 정답|다시|… after it types an answer
// (drive-generic.cjs feedback()), and on every GRAMMAR step that is now the folded top player's label '정답 문장 전체 듣기'
// ([course]/[lesson]/page.tsx, above the course view) — a button name, not a verdict. The old texts stay for old records.
// A real verdict ('✓ 정답', '✕ 오답 — …', '오답입니다') matches none of these, so it is still counted.
const GRAMMAR_NO_VERDICT = "(?:자가 채점 정답률[^|]*|no feedback|[^|]*빈칸에 알맞은 단어를 직접 입력하거나[^|]*|[^|]*\\[전체 채점하기\\]를 누르면[^|]*|[^|]*정답 문장 전체 듣기[^|]*)";
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
 * 실기기 몫 (fixes-0d, 2026-10-04 — reading-driver.md 3) 의 안): headless 브라우저에는 마이크도 인식 서비스도 없어 드라이버가 '실제 마이크 인식'
 * 을 BLOCKED 로 적는다. 그 칸은 이 점검(헤드리스)이 끝내 볼 수 없는 것이라 강의를 BLOCKED 로 세면 READING 512강이 모두 BLOCKED 가 되고
 * (PASS 0) 다른 BLOCKED 가 묻힌다. 그래서 강의 판정에서는 빼고 표 아래에 '실기기 몫 N기록' 으로 따로 센다(단계 3 · 실제 휴대폰 몫).
 * 넓게 잡지 않음: 기록에 실제로 있는 꼴 하나만 — drive-reading.cjs:1229 ck(rec, "step3", "mic", …, "BLOCKED", "BLOCKED (real microphone) — must be
 * checked on a real device"). 2026-10-04 에 이 작업 트리 out/features 51파일 · 본 폴더 out/features 288파일의 BLOCKED 를 마이크 · 인식 낱말로
 * 찾았을 때 이 꼴 말고는 0 (LISTENING lib/ld-fake-stt.js 주석의 'Step 4 BLOCKED (real microphone)' 는 지금 드라이버가 쓰지 않아 기록에 없음 —
 * 생기면 기록을 보고 한 줄 더함). 화면 배선(가짜 인식기로 점수 PASS)은 같은 기록의 다른 칸이 따로 본다.
 * --break=device-only-blocks: 옛 동작(강의 BLOCKED 로 셈).
 */
const DEVICE_ONLY = [
  { courses: ["reading"], feature: "step3", item: /^mic$/, note: /^BLOCKED \(real microphone\)/, why: "READING 3단계 실제 마이크 인식 — headless 불가, 단계 3 · 실제 휴대폰 몫" },
];
const deviceOnlyOf = (course, c) => BREAK === "device-only-blocks" ? null
  : DEVICE_ONLY.find((d) => d.courses.includes(course) && d.feature === c.feature && d.item.test(String(c.item || "")) && d.note.test(String(c.note || ""))) || null;
const deviceOnly = {};   // why → { records, lessons:Set, viewports:Set }
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
const counted = { files: 0, records: 0, beforeSince: 0, noCourse: 0, notCounted: 0, breakRecords: 0, breakFiles: [], localRecords: 0 };
const latestVisit = new Map();   // course|id|viewport → the latest record
const everyVisit = [];           // --break=merge-all: the old behaviour, every record of a lesson counted
/**
 * 깨기 기록은 세지 않음 (fixes-0d, 2026-10-04 — reading-driver.md 3) 의 안 2): 깨기 증명 실행은 일부러 FAIL 을 만든 기록을 같은 out/features 에
 * 남긴다(drive-reading `reading<suffix>-break-<모드>.jsonl` — 줄마다 `break: "<모드>"`). 강의 × 화면마다 가장 늦은 기록이 이기므로 --since 로 세면
 * 스윕 뒤에 돌린 깨기가 진짜 기록을 덮어 그 강의가 FAIL 이 됐다. 이제 `break` 칸이 있는 줄과 파일 이름에 '-break-' 가 든 파일은 셈에서 빼고
 * 몇 건 뺐는지만 적는다(--files 로 이름을 대도 뺌). --break=count-break-records: 옛 동작(셈에 넣음).
 */
const isBreakFile = (f) => /-break-/.test(f);
for (const f of fs.readdirSync(FEAT).filter((x) => x.endsWith(".jsonl")).sort()) {
  if (fileFilter && !fileFilter.has(f)) continue;
  counted.files++;
  let brokeHere = 0;
  for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (BREAK !== "count-break-records" && (r.break || isBreakFile(f))) { counted.breakRecords++; brokeHere++; continue; }
    // 로컬 기록(base 가 localhost — 깨뜨린 앱 사본에 대고 돈 proof-run 의 *-proof-rc-fixed/after 등)도 운영 셈이 아님(작업기록 '기준': 로컬 결과는
    // 근거가 아님). --since 로 세면 같은 날의 proof 기록이 섞여 아직 스윕 안 된 강의가 PASS(또는 깨진 앱의 FAIL)로 나왔다 → 빼고 수만 적음.
    if (BREAK !== "count-break-records" && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(String(r.base || ""))) { counted.localRecords = (counted.localRecords || 0) + 1; continue; }
    const course = COURSE_LABEL[r.course] ? r.course : fileCourse(f);
    if (!course) { if (NOT_COUNTED.includes(r.course)) counted.notCounted++; else counted.noCourse++; continue; }
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
  if (brokeHere) counted.breakFiles.push(`${f} ${brokeHere}`);
}
// 학습 단위 '확인함' 에 쓰는 것: 강의마다 데스크톱의 가장 늦은 기록(--break=merge-all 일 때도 같은 규칙 — 표의 강의 판정과는 따로)
const desktopLatest = new Map();   // course|id → record
for (const r of BREAK === "merge-all" ? everyVisit : latestVisit.values()) {
  if (r.viewport !== "desktop" || r.visitError) continue;
  const k = `${r.course}|${r.id}`;
  const prev = desktopLatest.get(k);
  if (!prev || String(r.at || "") >= String(prev.at || "")) desktopLatest.set(k, r);
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
      // 실기기 몫(DEVICE_ONLY): 강의 BLOCKED 로 세지 않고 따로 셈
      const dev = deviceOnlyOf(course, c);
      if (dev) { const d = (deviceOnly[dev.why] ||= { records: 0, lessons: new Set(), viewports: new Set(), courses: new Set() }); d.records++; d.lessons.add(`${course}|${id}`); d.viewports.add(r.viewport); d.courses.add(course); continue; }
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
for (const course of COURSES) {
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
    else if (SCREENS ? SCREENS.some((v) => !e.viewports.has(v)) : e.viewports.size < 3) { blocked++; blockedReasons["화면 3종 중 일부만 기록됨"] = (blockedReasons["화면 3종 중 일부만 기록됨"] || 0) + 1; put("BLOCKED", [`화면 ${[...e.viewports].sort().join(" · ")} 만 기록됨${SCREENS ? ` (필요: ${SCREENS.join(" · ")})` : ""}`]); }
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
for (const course of COURSES) for (const p of E.pages(course)) questions += (E.expected(course, p.id).answers || []).length;
// PASS-OFF GRAMMAR: expectations.cjs has no branch for it (texts 0) — its expected texts come from the sweep driver's own module
// (the licensed page, as the sweep runs it). If that module cannot load, the count says so instead of a silent 0.
let passoffExpect = null, passoffExpectError = null;
const passoffTexts = (id) => {
  if (!passoffExpect && !passoffExpectError) { try { passoffExpect = require("./lib/passoff-expect.cjs"); } catch (e) { passoffExpectError = String(e.message || e).slice(0, 80); } }
  return passoffExpect ? passoffExpect.expectedPassoff(id, { licensed: true }).texts.length : 0;
};
let units = 0;
for (const course of COURSES) for (const p of E.pages(course)) units += course === "passoff-grammar" ? passoffTexts(p.id) : (E.expected(course, p.id).texts || []).length;
if (passoffExpectError) units = `${units} (PASS-OFF 못 셈: ${passoffExpectError})`;
/**
 * 학습 단위 '확인함' (fixes-0d, 2026-10-04): 전에는 out/features-summary.json(analyze-features.cjs — out/features 의 기록 전부를 파일 이름의
 * 과정으로 묶은 것)에서 읽어, 이 표가 고른 기록(--files · --since)과 다른 묶음의 숫자였고 그 파일이 없으면 '?' 였다. PASS-OFF 기록이 그 요약에
 * 들어가는지도 증명되지 않았다(proof.md). 이제 이 표가 센 기록에서 바로: 강의마다 데스크톱의 가장 늦은 기록의 content(기대 · 있음)를 더한다
 * (drive-generic · drive-passoff · drive-reading 모두 content{expected, found} 를 적음 — 휴대폰은 얕게 돌아 기대가 달라 데스크톱만, 전과 같은 기준).
 * 데스크톱 기록에 content 가 없는 강의는 셈에서 빠지고 그 수를 적는다. --break=units-from-summary: 옛 동작.
 */
const unitsByCourse = {};
for (const course of COURSES) {
  const u = (unitsByCourse[course] = { lessons: 0, expected: 0, found: 0, noContent: 0 });
  for (const p of E.pages(course)) {
    const r = desktopLatest.get(`${course}|${p.id}`);
    if (!r) continue;
    if (!r.content || typeof r.content.expected !== "number") { u.noContent++; continue; }
    u.lessons++; u.expected += r.content.expected; u.found += Number(r.content.found) || 0;
  }
}
const unitsChecked = Object.values(unitsByCourse).reduce((a, u) => ({ lessons: a.lessons + u.lessons, expected: a.expected + u.expected, found: a.found + u.found, noContent: a.noContent + u.noContent }), { lessons: 0, expected: 0, found: 0, noContent: 0 });
const unitsRow = BREAK === "units-from-summary"
  ? { what: "학습 단위 (화면에 나와야 할 문장·낱말)", identified: units, tested: feat ? feat.summary && Object.values(feat.summary).reduce((a, s) => a + (s.content ? s.content.expected : 0), 0) : "?", how: "데이터 대조 (깨기 units-from-summary: 옛 features-summary.json)" }
  : { what: "학습 단위 (화면에 나와야 할 문장·낱말)", identified: units,
      tested: unitsChecked.lessons ? `${unitsChecked.found} (기대 ${unitsChecked.expected} 중 있음 · 데스크톱 기록 ${unitsChecked.lessons}강)` : "셈 안 함 — 이 선택에 데스크톱 content 기록 없음",
      how: `이 표가 센 기록 — 강의마다 데스크톱 가장 늦은 기록의 content: ${COURSES.map((c) => { const u = unitsByCourse[c]; return `${COURSE_LABEL[c]} ${u.lessons ? `${u.found}/${u.expected}(${u.lessons}강)${u.noContent ? ` · content 없는 기록 ${u.noContent}강` : ""}` : u.noContent ? `셈 안 함(데스크톱 기록 ${u.noContent}강에 content 없음)` : "셈 안 함(데스크톱 기록 없음)"}`; }).join(" · ")}` };

const items = [
  { what: "과정 (course)", identified: E.COURSES.length, tested: COURSES.length, how: `${COURSES.map((c) => COURSE_LABEL[c]).join(" · ")}${NOT_COUNTED.length ? ` — 아직 세지 않음: ${NOT_COUNTED.join(" · ")}` : ""}` },
  // 2026-09-26 명령서 대조표가 찾음: 전에는 20 · 20 을 손으로 적어 두어 check-student-unlock 이 돌지 않아도 '20/20' 으로 나왔음 → 그 결과 파일에서 읽음(없으면 '안 잼')
  (() => { let u = null; try { u = JSON.parse(fs.readFileSync(path.join(__dirname, "../out/student-unlock.json"), "utf8")); } catch {} return { what: "챕터·스테이지 (STUDENT)", identified: u ? u.chapters.length : "안 잼", tested: u ? (u.problems.length ? `${u.chapters.length} · 지적 ${u.problems.length}` : u.chapters.length) : "안 잼", how: u ? `scripts/check-student-unlock.cjs(out/student-unlock.json ${u.at})` : "scripts/check-student-unlock.cjs — 결과 파일 없음" }; })(),
  { what: "강의 (main + script)", identified: totals.discovered, tested: totals.discovered - totals.notTested, how: "out/features/*.jsonl" },
  unitsRow,
  { what: "VOCA 낱말", identified: integ ? integ.vocaStats.words : "?", tested: integ ? integ.vocaStats.withMeaning : "?", how: "scripts/check-data-integrity.cjs" },
  { what: "채점 문항", identified: questions, tested: (exam ? exam.lessons : 0) && questions, how: "scripts/grade-offline.cjs + check-grammar-exam.cjs" },
  { what: "딕테이션 문장", identified: dict ? dict.sentences : "?", tested: dict ? dict.sentences : "?", how: "scripts/check-dictation.cjs" },
  { what: "음성 클립", identified: inv ? inv.clips.length : "?", tested: lic ? (lic.clips || lic.results || []).length : "379 (표본 아님: 누락 후보 전수)", how: "audio-inventory + probe-missing-clips (전수는 대기열)" },
  { what: "음성 버튼 누름", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", tested: feat ? Object.values(feat.summary).reduce((a, s) => a + s.audio.controls, 0) : "?", how: "실제 클릭" },
  { what: "기능 확인 항목", identified: feat ? Object.values(feat.summary).reduce((a, s) => a + Object.values(s.checks).reduce((x, y) => x + y, 0), 0) : "?", tested: "동일", how: "out/features-summary.json" },
  { what: "교육 내용 검토 대상 강의", identified: cov ? cov.total : "?", tested: cov ? cov.covered : "?", how: "scripts/check-review-coverage.cjs" },
];

const selection = { since: SINCE, files: fileFilter ? [...fileFilter] : null, break: BREAK || null, ...counted };
const deviceOnlyOut = Object.fromEntries(Object.entries(deviceOnly).map(([why, d]) => [why, { records: d.records, lessons: d.lessons.size, viewports: [...d.viewports].sort(), courses: [...d.courses] }]));
const out = { at: new Date().toISOString(), selection, naStats, lessons: { rows, totals, blockedReasons, detail: lessonDetail }, deviceOnly: deviceOnlyOut, unitsByCourse, items };
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
md.push(`| **합계** | **${COURSE_TABLE.reduce((a, c) => a + c.baselineMain, 0)}** | **${totals.main}** | **${totals.script}** | **${totals.discovered}** | **${totals.pass}** | **${totals.fail}** | **${totals.blocked}** | **${totals.notTested}** | ${totals.balanced ? "✔" : "✘"} |`);
if (NOT_COUNTED.length) md.push(`\n**이 표가 아직 세지 않는 과정**: ${NOT_COUNTED.join(" · ")} — 그 과정의 기록 ${counted.notCounted}건은 셈에서 뺌(build-coverage COURSE_TABLE 에 한 줄 더하면 셈)`);
// fixes-0d: 표 아래 한 줄씩 — 실기기 몫(강의 BLOCKED 로 안 셈) · 깨기 기록(셈에서 뺌)
md.push(`\n**실기기 몫(강의 판정에 안 셈)**: ${Object.keys(deviceOnlyOut).length ? Object.entries(deviceOnlyOut).map(([why, d]) => `${why} — 기록 ${d.records}(강의 ${d.lessons} · 화면 ${d.viewports.join("·")})`).join(" / ") : "0"}${BREAK === "device-only-blocks" ? " (깨기 device-only-blocks: 옛 동작 — 강의 BLOCKED 로 셈)" : ""}`);
md.push(`**깨기 기록(셈에서 뺌)**: ${BREAK === "count-break-records" ? "깨기 count-break-records — 옛 동작: 셈에 넣음" : `${counted.breakRecords}건${counted.breakFiles.length ? ` (${counted.breakFiles.join(", ")})` : ""} · 로컬(localhost) 기록 ${counted.localRecords || 0}건`}`);
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
