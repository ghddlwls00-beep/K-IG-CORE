#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 공통 학습 엔진 단계 2-나 E2(공통-학습-엔진.md §8-5 · 6 · 7)를 진짜 코드로, 로컬 대체 저장소로.
 *
 * check-learning-api.cjs 와 같은 방법: 진짜 route(src/app/api/learning/[course]/route.ts · src/app/api/admin/learning-reports/route.ts)
 * 와 엔진 · 저장 · 과정 어댑터를 트랜스파일해서 부른다. 가짜는 넷뿐 — 이용권 확인(요청마다 넣는 세션) · 관리자 확인 · 'server-only' ·
 * next/headers. 기록은 임시 폴더의 data/*.json 에만 쓴다. 서버 시각은 Date.now 를 바꿔 정한다(D = 2026-10-05 한국 10시).
 * R2 환경값이 하나라도 있거나 NODE_ENV=production 이면 아무것도 안 하고 멈춘다(exit 2). 이용권 비밀값은 이 실행만의 버리는 값.
 *   E1 연습(지금 다시 풀기 — practice.ts applyPractice): 오늘 낼 차례인 문항을 맞혀도 · 틀려도 일정 그대로(effect practice) — 같은
 *      답을 엔진 applyAttempt 로 넣으면 일정이 바뀌는 것과 대조 · 연습 중 '내 답도 맞아요'는 신고(pending)만 남고 일정 그대로
 *   E1b (E2 수정) 오늘 낼 차례이고 오늘 복습에서 아직 안 푼 문항은 연습에 안 나옴(practiceWaits) — 연습에서 정답을 보고 같은 날 복습에서
 *      답하면 그 답이 통과 날로 세어지는 것(엔진으로 보임)을 막는 칸. 오늘 복습에서 푼 뒤 · 낼 차례가 아닌 날은 연습 가능
 *   E2 앞으로 당기기(applyBringForward — E2 수정): 그 레슨의 배우는 중 문항만 '내일' 낼 차례(오늘이 아님 — 오늘 복습에서 이미 푼
 *      문항이 오늘 계획에 되돌아오지 않고, 아직 안 푼 문항도 오늘로 당겨 간격이 줄지 않음) · 내일까지 낼 차례인 문항 · 오늘 처음 배운
 *      문항 · 통과한 문항 · 다른 레슨 그대로 · 내일 계획에 들어감 · forwardedItems 가 내일까지 나올 수를 셈
 *   E3 '내 답도 맞아요'가 그날 첫 답이면(복습 화면이 틀린 첫 답을 붙잡아 두었다가 신고로 바꿈) 맞음도 틀림도 아님 — lapses 0 ·
 *      통과한 날 그대로 · 내일 다시 · 신고 1(엔진 reportMyAnswer 그대로)
 *   E4 API view "notes"(레슨 없이): 오답노트 = 열린 레슨의 틀린 문항만(열쇠 · 종류 · 내 답) · 문항 글 0(모든 레슨의 문항 글 중 응답에
 *      있는 것 0) · items 비어 있음
 *   E5 API view "notes" + lesson: 그 레슨의 틀린 문항 데이터만(열쇠 = 목록의 그 레슨 열쇠) · 다른 문항 글 0
 *   E6 다시 잠긴 대주제(관리자 초기화 뒤)의 저장된 틀린 문항 → 목록에 없음 · 그 레슨을 물어도 데이터 0
 *   E7 API forward: 열린 레슨만 서버 기록에서 내일로 당김 · 잠긴 레슨은 무시 · 응답 forwarded = 내일까지 나올 그 레슨 문항 수 · 그 뒤
 *      옛 기기 기록이 올라와도(합치기 — 같은 날이면 서버 것) 당긴 날 그대로 · 기기 기록이 다른 이용권 것이라 안 받을 때(taken false)도
 *      forward 는 이 이용권의 요청이라 서버 기록에 함(E2 수정 — 전에는 안 당기고 '기록했어요')
 *   E8 관리자 신고 모아 보기(/api/admin/learning-reports): 관리자 아님 401 · 두 이용권의 신고를 문항별로 묶음(건수 · 학습자 수 ·
 *      같은 답은 대소문자 · 띄어쓰기 무시하고 하나로) · 문항의 한국어 · 정답(레슨 파일) · 많이 신고된 순 · 코드는 응답에 없음
 *   E8b (E2 수정) 한 번에 기록 하나씩(limit 1 · after = 받은 next) 쪽을 넘겨 받아 합친 것(review.ts mergeReportGroups) = 한 번에 받은 것 ·
 *      쪽마다 기록 수 1 이하 · 마지막 쪽 next 없음
 *   E9 구성도(passoffMap.ts · passoffReview.ts passoffMapData): TOPIC 마다 레슨 순서 · 규칙 제목 · 첫 예문이 레슨 파일과 같음 · 칩 순서는
 *      정답 순서가 아님 · 같은 대주제면 같은 순서 · 보기(놓은 레슨 것)에 그 레슨 문장이 있음 · 다 맞히면 틀린 칸 0 · 칩을 바꾸면 그 두
 *      레슨 · 규칙 · 문장이 틀리면 그 레슨 · (E2 수정) 칩을 바꾸고 놓은 레슨의 규칙 · 문장을 고르면 그 두 칸은 레슨만 틀림(칸 화면이 묻는
 *      것 — 놓은 레슨 — 기준)
 *   E10 API view "record"(레슨 완료 · 신고 · 연습 · 구성도 뒤에 기록만 맞출 때): 기록은 받고 돌려주되 items 0 · 문항 글 0 — 같은 때
 *      보통 요청은 오늘 계획 문항 데이터를 줌(비교)
 *   node docs/pass-off-grammar/검사/check-learning-e2.cjs [--break=<아래 하나>] [--prove-breaks]
 *     깨기는 사본만 바꿈 — 각각 이름 붙은 FAIL(exit 1)이어야: practice-moves(연습이 일정을 바꿈) · forward-all(다른 레슨까지 당김) ·
 *     forward-today(당긴 날이 오늘 — 점검 전 판처럼) · notes-all-items(물은 레슨 밖 문항도 보냄) · notes-locked(잠긴 대주제 문항도 목록에) ·
 *     forward-locked(잠긴 레슨도 당김) · report-case(대소문자가 다르면 다른 답으로) · admin-open(관리자 확인 없음) ·
 *     map-grade(규칙이 틀려도 맞은 칸) · record-items(view "record" 에도 계획 문항 데이터를 보냄) ·
 *     (E2 수정) practice-early(낼 차례인 문항도 연습에 냄) · forward-not-sent(기기 기록을 안 받으면 forward 도 안 함 — 점검 전 판) ·
 *     map-by-box(규칙을 놓은 레슨이 아니라 칸의 레슨으로 채점 — 점검 전 판) · reports-no-page(관리자 신고가 after 를 무시)
 * exit 0 = 실패 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const Module = require("module");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const ROUTE_FILE = path.join(REPO, "src/app/api/learning/[course]/route.ts");
const ADMIN_FILE = path.join(REPO, "src/app/api/admin/learning-reports/route.ts");
const PRACTICE_FILE = path.join(REPO, "src/lib/learning/practice.ts");
const REVIEW_FILE = path.join(REPO, "src/lib/learning/review.ts");
const STORE_FILE = path.join(REPO, "src/lib/learning/serverStore.ts");
const MAP_FILE = path.join(REPO, "src/lib/passoffMap.ts");
const BREAKS = {
  "practice-moves": [PRACTICE_FILE, /if \(record\.log\.length > LOG_LIMIT\) record\.log\.splice\(0, record\.log\.length - LOG_LIMIT\);/, "if (record.log.length > LOG_LIMIT) record.log.splice(0, record.log.length - LOG_LIMIT); if (record.items[itemKey]) record.items[itemKey].dueDay = addDays(day, 2);"],
  "forward-all": [PRACTICE_FILE, /if \(!lessons\.has\(state\.lessonId\) \|\| state\.stage !== "learning"\) continue;/, 'if (state.stage !== "learning") continue;'],
  // the first occurrence: applyBringForward's (forwardedItems below keeps tomorrow)
  "forward-today": [PRACTICE_FILE, /const due = addDays\(learningDay\(atMs\), 1\);/, "const due = learningDay(atMs);"],
  "notes-all-items": [ROUTE_FILE, /notes\.find\(\(lesson\) => lesson\.lessonId === body\.lesson\)\?\.items\.map\(\(item\) => item\.key\) \?\? \[\]/, "notes.flatMap((lesson) => lesson.items.map((item) => item.key))"],
  // 합친 판(E1 점검 반영 × E2): the route's open-lessons record is `reviewable` (E1's name — check-learning-api's
  // no-plan-restrict breaks that line), and "no item data" is `planOnly` (E1) or view "record" (E2) on one line
  "notes-locked": [ROUTE_FILE, /const notes = body\.view === "notes" \? wrongList\(reviewable\) : null;/, 'const notes = body.view === "notes" ? wrongList(record) : null;'],
  "record-items": [ROUTE_FILE, /body\.planOnly === true \|\| body\.view === "record"/, "body.planOnly === true"],
  "forward-locked": [ROUTE_FILE, /typeof id === "string" && access\.lessonOpen\(id\)/, 'typeof id === "string"'],
  "report-case": [REVIEW_FILE, /const sameWords = \(answer: string\) => answer\.trim\(\)\.replace\(\/\\s\+\/g, " "\)\.toLowerCase\(\);/, "const sameWords = (answer: string) => answer;"],
  "admin-open": [ADMIN_FILE, /if \(!verifyAdminSession\(request\)\) \{/, "if (false) {"],
  "map-grade": [MAP_FILE, /const ruleOk = placed !== null && picks\.rules\[box\] === placed\.id;/, "const ruleOk = true;"],
  // E2 수정
  "practice-early": [PRACTICE_FILE, /return state !== undefined && daysBetween\(state\.dueDay, today\) >= 0 && state\.reviewDay !== today;/, "return false;"],
  "forward-not-sent": [ROUTE_FILE, /if \(!forward\.length\) return \{ record: stored, changed: false \};/, "return { record: stored, changed: false };"],
  "map-by-box": [MAP_FILE, /const ruleOk = placed !== null && picks\.rules\[box\] === placed\.id;/, "const ruleOk = picks.rules[box] === lesson.id;"],
  "reports-no-page": [STORE_FILE, /const start = after !== null && \/\^\\d\+\$\/\.test\(after\) \? Number\(after\) : 0;/, "const start = 0;"],
};

if (process.argv.includes("--prove-breaks")) {
  const run = (args) => spawnSync(process.execPath, [__filename, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const normal = run([]);
  const rows = [["(깨지 않음)", normal.status, normal.status === 0 ? "PASS" : `FAIL ${(normal.stdout.match(/^FAIL {2}(E\d+[a-z]?)/gm) || []).join(" ")}`]];
  for (const name of Object.keys(BREAKS)) {
    const r = run([`--break=${name}`]);
    const named = (r.stdout.match(/^FAIL {2}(E\d+[a-z]?)/gm) || []).map((l) => l.slice(6));
    rows.push([name, r.status, r.status === 1 && named.length ? `잡힘 — FAIL ${named.join(" · ")}` : `안 잡힘(exit ${r.status}) ${r.stderr.slice(0, 200)}`]);
  }
  for (const [name, status, verdict] of rows) console.log(`${name.padEnd(16)} exit ${status}  ${verdict}`);
  const ok = rows[0][1] === 0 && rows.slice(1).every((r) => r[1] === 1 && r[2].startsWith("잡힘"));
  console.log(ok ? "prove-breaks: PASS" : "prove-breaks: FAIL");
  process.exit(ok ? 0 : 1);
}
if (BREAK && !BREAKS[BREAK]) {
  console.error(`모르는 깨기: ${BREAK} — ${Object.keys(BREAKS).join(" · ")}`);
  process.exit(2);
}

// --- never the real store ---
const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"];
const present = R2_ENV.filter((k) => process.env[k]);
if (present.length || process.env.NODE_ENV === "production") {
  console.error(`멈춤: ${[...present, process.env.NODE_ENV === "production" ? "NODE_ENV=production" : ""].filter(Boolean).join(", ")} 가 설정돼 있어 진짜 저장소에 쓸 수 있음`);
  process.exit(2);
}
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");

// --- the server's clock ---
const realNow = Date.now.bind(Date);
let NOW = null;
Date.now = () => (NOW === null ? realNow() : NOW);
const kst = (day, hour = 10) => Date.parse(`${day}T00:00:00Z`) + (hour - 9) * 3_600_000;
const D = "2026-10-05";

// --- loading the source as it is ---
const ts = require(path.join(REPO, "node_modules/typescript"));
let SESSION = null;
let ADMIN = true;
const OVERRIDES = {
  "server-only": {},
  "@/lib/licenseSession": {
    verifyLicenseSession: async () => SESSION,
    verifyLicenseSessionToken: async () => SESSION,
    LICENSE_SESSION_COOKIE_NAME: "kig_license_session",
  },
  "@/lib/adminAuth": { verifyAdminSession: () => ADMIN },
  "next/headers": { cookies: async () => ({ get: () => undefined }) },
};
function makeLoader(transforms) {
  const cache = new Map();
  const resolveSpec = (spec, fromDir) => {
    let p;
    if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
    else if (spec.startsWith(".")) p = path.join(fromDir, spec);
    else return null;
    for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    return p;
  };
  const load = (file) => {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    let text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    for (const [target, pattern, replacement] of transforms) {
      if (path.resolve(target) !== file) continue;
      const changed = text.replace(pattern, replacement);
      if (changed === text) {
        console.error(`바꾸기가 적용되지 않음 — ${path.relative(REPO, file)} 글이 바뀌었으면 이 파일을 고칠 것: ${pattern}`);
        process.exit(2);
      }
      text = changed;
    }
    const out = ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
      fileName: file,
    }).outputText;
    const m = { exports: {} };
    cache.set(file, m);
    const dir = path.dirname(file);
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(OVERRIDES, spec)) return OVERRIDES[spec];
      const r = resolveSpec(spec, dir);
      if (r) return load(r);
      return Module.createRequire(path.join(REPO, "package.json"))(spec);
    };
    new Function("require", "module", "exports", "__filename", "__dirname", out)(req, m, m.exports, file, dir);
    return m.exports;
  };
  return load;
}

process.chdir(REPO);
const load = makeLoader(BREAK ? [BREAKS[BREAK]] : []);
const route = load(ROUTE_FILE);
const admin = load(ADMIN_FILE);
const E = load(path.join(REPO, "src/lib/learning/engine.ts"));
const Day = load(path.join(REPO, "src/lib/learning/day.ts"));
const P = load(PRACTICE_FILE);
const R = load(REVIEW_FILE);
const progress = load(path.join(REPO, "src/lib/passoffProgress.ts"));
const M = load(MAP_FILE);
const { passoffMapData } = load(path.join(REPO, "src/lib/passoffReview.ts"));
const { viewBlocks } = load(path.join(REPO, "src/lib/passoffView.ts"));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kig-learning-e2-"));
process.chdir(TMP);

const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const checksum = crypto.createHmac("sha256", process.env.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${checksum}`;
};
let seq = 0;
const sessionFor = (plan) => ({ payload: { key: makeKey(plan), plan, deviceId: `e2-check-${++seq}`, expiresAt: null, iat: realNow() } });
async function call(handler, session, course, body) {
  SESSION = session;
  const init = { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) };
  const res = await handler(new Request(`http://local/api/learning/${course}`, init), { params: Promise.resolve({ course }) });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { status: res.status, text, data };
}
const sync = (session, body) => call(route.POST, session, "passoff-grammar", body);
const STORE = path.join(TMP, "data", "learning-passoff-grammar.json");
const stored = (key) => (fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8"))[key] || null : null);

// --- the course's lessons, read here on their own ---
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const topics = index.groups.map((g) => g.lessons);
const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
function reviewItemsOf(id) {
  const out = [];
  for (const b of lessonFile(id).blocks) {
    if (b.type !== "drill") continue;
    for (const it of b.select || []) if (!it.reserve) out.push({ key: it.id, kind: it.kind, item: it });
    for (const it of b.produce || []) out.push({ key: it.id, kind: "produce", item: it });
    for (const it of b.transfer || []) out.push({ key: it.id, kind: "transfer", item: it });
  }
  return out;
}
const textsOf = (it) =>
  [it.en, it.ko, it.promptEn, it.instruction, it.sentence, it.why, ...(it.accept || []), ...(it.options || []), Array.isArray(it.tokens) ? JSON.stringify(it.tokens) : null]
    .filter((s) => typeof s === "string" && s.trim().length >= 10);
const inBody = (body, text) => body.includes(text) || body.includes(JSON.stringify(text).slice(1, -1));
const PROFILE = { course: "passoff-grammar", secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 }, elementKinds: ["select", "choice", "short"] };
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const review = (lessonId, kind, correct, extra = {}) => ({ lessonId, kind, correct, help: "none", mode: "typed", where: "review", ...extra });

/** a record: these lessons finished at `atMs` */
function recordOf(lessons, atMs) {
  const r = E.emptyRecord("passoff-grammar");
  for (const id of lessons) E.applyLessonDone(r, id, atMs, reviewItemsOf(id).map(({ key, kind }) => ({ key, kind })));
  return r;
}
/** a unique wrong answer — never a lesson's words */
const junk = (i) => `zq wrong answer ${i} xv`;

const results = [];
const check = (name, ok, note) => results.push({ name, ok: Boolean(ok), note: String(note ?? "").slice(0, 400) });

(async () => {
  const [t1, t2] = topics;
  const day = (n) => Day.addDays(D, n);

  // ---- E1 practice ----------------------------------------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const r = recordOf([t1[0]], kst(day(-3), 9));
    const key = reviewItemsOf(t1[0]).find((e) => e.kind === "produce").key;
    const beforeState = JSON.parse(JSON.stringify(r.items[key]));
    const due = Day.daysBetween(r.items[key].dueDay, D) >= 0;
    const effect = P.applyPractice(r, key, review(t1[0], "produce", true), NOW);
    const effectWrong = P.applyPractice(r, key, review(t1[0], "produce", false, { answer: junk(1) }), NOW + 1000);
    const stateSame = same(r.items[key], beforeState);
    const logged = r.log.slice(-2).map((e) => e.effect).join();
    // the same right answer through the engine's own function moves it
    const r2 = recordOf([t1[0]], kst(day(-3), 9));
    const engineEffect = E.applyAttempt(r2, key, review(t1[0], "produce", true), NOW, PROFILE);
    const reportEffect = P.applyPractice(r, key, review(t1[0], "produce", false, { pending: true, answer: junk(2) }), NOW + 2000);
    check(`E1 연습: 낼 차례인 ${key} 를 맞혀도 · 틀려도 일정 그대로(practice) — 엔진 applyAttempt 면 ${engineEffect} · 연습 중 신고는 pending(신고 1 · 일정 그대로)`,
      due && effect === "practice" && effectWrong === "practice" && stateSame && logged === "practice,practice" && engineEffect === "right" && r2.items[key].dueDay !== beforeState.dueDay &&
        reportEffect === "pending" && r.reports.length === 1 && r.reports[0].status === "pending" && same(r.items[key], beforeState) && r.lastStudyDay === D,
      `due ${due} · ${effect}/${effectWrong} · 상태 같음 ${stateSame} · 기록 ${logged} · 엔진 ${engineEffect} ${beforeState.dueDay}→${r2.items[key].dueDay} · 신고 ${reportEffect} ${r.reports.length}`);
  }

  // ---- E1b practice waits for today's review (E2 수정) -----------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const r = recordOf([t1[0]], kst(day(-3), 9));
    const [a, b, c] = reviewItemsOf(t1[0]).map((e) => e.key);
    // a: its next-day check two days late, not asked today · b: asked in today's review (wrong → tomorrow) · c: due in two days
    Object.assign(r.items[c], { step: 1, dueDay: day(2), lastDay: day(-1), lastCorrect: true, reviewDay: day(-1) });
    E.applyAttempt(r, b, review(t1[0], r.items[b].kind, false, { answer: junk(9) }), NOW, PROFILE);
    const waitsA = P.practiceWaits(r.items[a], D);
    const waitsB = P.practiceWaits(r.items[b], D);
    const waitsC = P.practiceWaits(r.items[c], D);
    const overdue = P.practiceWaits({ ...r.items[a], dueDay: day(-2), reviewDay: day(-2) }, D);
    // what the gate is for — the engine alone: a practised with the answer shown, then today's review answer counts
    const r2 = JSON.parse(JSON.stringify(r));
    P.applyPractice(r2, a, review(t1[0], r2.items[a].kind, true, { help: "reveal" }), NOW);
    const leak = E.applyAttempt(r2, a, review(t1[0], r2.items[a].kind, true), NOW + 60_000, PROFILE);
    // once today's review has asked it, a can be practised
    E.applyAttempt(r, a, review(t1[0], r.items[a].kind, true), NOW, PROFILE);
    const afterReview = P.practiceWaits(r.items[a], D);
    check(`E1b 낼 차례이고 오늘 복습에서 아직 안 푼 문항은 연습에 안 나옴(practiceWaits — 엔진만으로는 연습 뒤 같은 날 복습 답이 '${leak}') · 오늘 복습에서 푼 문항 · 낼 차례가 아닌 문항은 연습 가능 · 밀린 문항도 기다림 · 오늘 복습에서 푼 뒤에는 연습 가능`,
      waitsA === true && waitsB === false && waitsC === false && overdue === true && afterReview === false,
      `a ${waitsA} · b(오늘 풂) ${waitsB} · c(모레) ${waitsC} · 밀림 ${overdue} · 엔진만 ${leak} · 복습 뒤 ${afterReview}`);
  }

  // ---- E2 bring forward (E2 수정: tomorrow, never today) ------------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const r = recordOf([t1[0], t1[1]], kst(day(-10), 9));
    // everything answered right twice: step 2, due in 4 days
    for (const e of reviewItemsOf(t1[0]).concat(reviewItemsOf(t1[1]))) {
      Object.assign(r.items[e.key], { step: 2, dueDay: day(4), lastDay: day(-2), lastCorrect: true, reviewDay: day(-2), passDays: [day(-8), day(-2)] });
    }
    const t0 = reviewItemsOf(t1[0]).map((e) => e.key);
    // one of the moved lesson's items has passed
    const passedKey = t0[1];
    Object.assign(r.items[passedKey], { stage: "passed", step: 0, dueDay: day(20) });
    // one due today and answered in today's review (right: now due later) — it must not come back today
    const todayKey = t0[0];
    Object.assign(r.items[todayKey], { dueDay: D, passDays: [] }); // still learning after today's right answer
    const todayEffect = E.applyAttempt(r, todayKey, review(t1[0], r.items[todayKey].kind, true), NOW, PROFILE);
    const todayDueBefore = r.items[todayKey].dueDay;
    // one due tomorrow already — it stays
    const soonKey = t0[2];
    r.items[soonKey].dueDay = day(1);
    // a lesson first seen today
    E.applyLessonDone(r, t1[2], NOW, reviewItemsOf(t1[2]).map(({ key, kind }) => ({ key, kind })));
    const moved = P.applyBringForward(r, [t1[0], t1[2]], NOW);
    const learningT0 = t0.filter((k) => k !== passedKey);
    const allTomorrow = learningT0.every((k) => r.items[k].dueDay === day(1));
    const passedKept = r.items[passedKey].dueDay === day(20);
    const otherKept = reviewItemsOf(t1[1]).every((e) => r.items[e.key].dueDay === day(4));
    const todayKept = reviewItemsOf(t1[2]).every((e) => r.items[e.key].dueDay === day(1));
    const planToday = E.planDay(r, D, PROFILE);
    const notToday = !planToday.items.some((i) => i.lessonId === t1[0]);
    // the day's answer stays the day's: a second answer today would be a retry that moves nothing
    const againToday = E.applyAttempt(JSON.parse(JSON.stringify(r)), todayKey, review(t1[0], r.items[todayKey].kind, true), NOW + 60_000, PROFILE);
    const counted = P.forwardedItems(r, [t1[0]], NOW);
    check(`E2 앞으로 당기기: ${t1[0]} 의 배우는 중 문항 ${learningT0.length}개 모두 내일(${day(1)}) — 오늘 복습에서 푼 문항(${todayDueBefore} 였음)도 오늘이 아니라 내일 · 오늘 계획에 없음 · 이미 내일인 문항은 안 옮김 · 통과한 문항 · ${t1[1]} · 오늘 배운 ${t1[2]} 그대로 · forwardedItems ${learningT0.length}`,
      todayEffect === "right" && moved === learningT0.length - 1 && allTomorrow && passedKept && otherKept && todayKept && notToday && againToday === "retry" && counted === learningT0.length,
      `오늘 답 ${todayEffect} · 옮김 ${moved}/${learningT0.length - 1} · 내일 ${allTomorrow} · 통과 ${passedKept} · 다른 레슨 ${otherKept} · 오늘 배운 ${todayKept} · 오늘 계획에 없음 ${notToday} · 같은 날 두 번째 ${againToday} · 셈 ${counted}`);
  }

  // ---- E3 a report as the day's first answer -------------------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const r = recordOf([t1[1]], kst(day(-9), 9));
    const key = reviewItemsOf(t1[1]).find((e) => e.kind === "produce").key;
    Object.assign(r.items[key], { step: 2, dueDay: D, lastDay: day(-2), lastCorrect: true, reviewDay: day(-2), passDays: [day(-6), day(-2)] });
    const effect = E.applyAttempt(r, key, review(t1[1], "produce", false, { pending: true, answer: junk(3) }), NOW, PROFILE);
    const s = r.items[key];
    check(`E3 '내 답도 맞아요'가 그날 첫 답(복습 화면이 틀린 첫 답 대신 넣음) → pending · lapses 0 · 통과한 날 2개 그대로 · step 그대로 · 내일(${day(1)}) 다시 · 신고 1`,
      effect === "pending" && s.lapses === 0 && s.passDays.length === 2 && s.step === 2 && s.dueDay === day(1) && s.pending === true && r.reports.length === 1,
      `${effect} · lapses ${s.lapses} · passDays ${s.passDays.length} · step ${s.step} · due ${s.dueDay} · 신고 ${r.reports.length}`);
  }

  // ---- E4 · E5 · E6 the wrong-answer list through the API --------------------------------------------------------------
  const stu = sessionFor("STU1Y");
  {
    NOW = kst(D, 10);
    // open TOPIC 2 for this licence (the owner's manual open), so pg02-1's items are taken and stored
    await progress.setPassoffTopic(stu.payload.key, 2);
    const dev = recordOf([t1[0], t1[1], t2[0]], kst(day(-3), 9));
    const wrongKeys = { [t1[0]]: [], [t1[1]]: [], [t2[0]]: [] };
    let i = 0;
    for (const id of [t1[0], t1[1], t2[0]]) {
      for (const e of reviewItemsOf(id).slice(0, 2)) {
        E.applyAttempt(dev, e.key, review(id, e.kind, false, { answer: junk(++i) }), kst(day(-2), 10), PROFILE);
        wrongKeys[id].push(e.key);
      }
    }
    const first = await sync(stu, { record: dev, owner: null });
    const storedLocked = Object.keys((stored(stu.payload.key) || { items: {} }).items).filter((k) => k.startsWith(`${t2[0]}:`)).length;
    // the owner resets the licence: TOPIC 2 is locked again, its stored items stay in the learning record
    await progress.resetPassoffProgress(stu.payload.key);
    const owner = first.data && first.data.owner;
    const r4 = await sync(stu, { record: null, owner, view: "notes" });
    const notes = (r4.data && r4.data.notes) || [];
    const noteLessons = notes.map((l) => l.lessonId).sort();
    const noteKeys = notes.flatMap((l) => l.items.map((x) => x.key)).sort();
    const expected = [...wrongKeys[t1[0]], ...wrongKeys[t1[1]]].sort();
    const everything = index.lessons.flatMap((l) => reviewItemsOf(l.id));
    const allTexts = [...new Set(everything.flatMap((e) => textsOf(e.item)))];
    const leaked4 = allTexts.filter((t) => inBody(r4.text, t));
    const lastWrongShown = notes.flatMap((l) => l.items).every((x) => typeof x.lastWrong === "string" && x.lastWrong.startsWith("zq wrong answer"));
    check(`E4 view "notes": 열린 레슨(${t1[0]} · ${t1[1]})의 틀린 문항 ${expected.length}개만 · 열쇠 · 종류 · 내 답 · 문항 글 ${allTexts.length}개 중 응답에 0 · items 비어 있음`,
      r4.status === 200 && storedLocked > 0 && same(noteLessons, [t1[0], t1[1]].sort()) && same(noteKeys, expected) && Object.keys(r4.data.items).length === 0 && leaked4.length === 0 && lastWrongShown,
      `${r4.status} · 저장된 ${t2[0]} 문항 ${storedLocked} · 레슨 ${noteLessons.join(",")} · 열쇠 ${noteKeys.length}/${expected.length} · items ${r4.data && Object.keys(r4.data.items).length} · 글 ${leaked4.length}${leaked4.length ? ` (${leaked4[0]})` : ""}`);

    const r5 = await sync(stu, { record: null, owner, view: "notes", lesson: t1[1] });
    const keys5 = Object.keys((r5.data && r5.data.items) || {}).sort();
    const others = everything.filter((e) => !wrongKeys[t1[1]].includes(e.key));
    const mine = everything.filter((e) => wrongKeys[t1[1]].includes(e.key)).flatMap((e) => textsOf(e.item));
    const otherTexts = [...new Set(others.flatMap((e) => textsOf(e.item)))].filter((t) => !mine.some((m) => m.includes(t)));
    const leaked5 = otherTexts.filter((t) => inBody(r5.text, t));
    const seen5 = mine.filter((t) => inBody(r5.text, t)).length;
    check(`E5 view "notes" + lesson ${t1[1]}: 그 레슨의 틀린 문항 ${wrongKeys[t1[1]].length}개 데이터만 · 다른 문항 글 ${otherTexts.length}개 중 0 · 그 문항 글은 있음`,
      r5.status === 200 && same(keys5, [...wrongKeys[t1[1]]].sort()) && leaked5.length === 0 && seen5 > 0,
      `${r5.status} · 열쇠 ${keys5.join(",")} · 다른 글 ${leaked5.length}${leaked5.length ? ` (${leaked5[0]})` : ""} · 그 문항 글 ${seen5}`);

    const r6 = await sync(stu, { record: null, owner, view: "notes", lesson: t2[0] });
    const t2Texts = reviewItemsOf(t2[0]).flatMap((e) => textsOf(e.item));
    const leaked6 = t2Texts.filter((t) => inBody(r6.text, t));
    check(`E6 다시 잠긴 TOPIC 2(관리자 초기화) — 저장된 ${t2[0]} 틀린 문항: 목록에 없음 · 그 레슨을 물어도 데이터 0 · 글 0`,
      r6.status === 200 && !(r6.data.notes || []).some((l) => l.lessonId === t2[0]) && Object.keys(r6.data.items).length === 0 && leaked6.length === 0,
      `${r6.status} · 목록 ${(r6.data.notes || []).map((l) => l.lessonId).join(",")} · items ${Object.keys(r6.data.items).length} · 글 ${leaked6.length}`);

    // E10 view "record" — a lesson page keeping the record in step: the record back, no item's words (today's plan has items)
    const due = recordOf([t1[2]], kst(day(-1), 9));
    const r10 = await sync(stu, { record: due, owner, view: "record" });
    const plain = await sync(stu, { record: null, owner });
    const leaked10 = allTexts.filter((t) => inBody(r10.text, t));
    check(`E10 view "record": 기록만 돌아옴 — 오늘 계획 ${plain.data && plain.data.plan.items.length}문항이 있어도 items 0 · 문항 글 0 · ${t1[2]} 기록은 서버에 남음`,
      r10.status === 200 && Object.keys(r10.data.items).length === 0 && leaked10.length === 0 && Boolean(r10.data.record.lessons[t1[2]]) &&
        plain.data.plan.items.length > 0 && Object.keys(plain.data.items).length > 0,
      `${r10.status} · items ${Object.keys(r10.data.items).length} · 글 ${leaked10.length} · 계획 ${plain.data.plan.items.length} · 계획 데이터(보통 요청) ${Object.keys(plain.data.items).length}`);
  }

  // ---- E7 forward -----------------------------------------------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const a = sessionFor("1Y");
    await progress.setPassoffTopic(a.payload.key, 2);
    const dev = recordOf([t1[0], t2[0]], kst(day(-10), 9));
    // 합친 판: the state the engine itself leaves after right answers on day -8 and day -2 — step 2, due 4 days after the last
    // answer (learning [2, 4, 4]). E1's server re-judging (review.ts settleItem) brings a due day further off than the step
    // gives back to it, so the E2 판's hand-written 'due in 4 days' (day +4) would have arrived as day +2 before any forward
    for (const id of [t1[0], t2[0]]) {
      for (const e of reviewItemsOf(id)) Object.assign(dev.items[e.key], { step: 2, dueDay: day(2), lastDay: day(-2), lastCorrect: true, reviewDay: day(-2), passDays: [day(-8), day(-2)] });
    }
    const first = await sync(a, { record: dev, owner: null });
    const owner = first.data.owner;
    // TOPIC 2 locked again, then the device asks to bring both lessons forward
    await progress.resetPassoffProgress(a.payload.key);
    const r7 = await sync(a, { record: dev, owner, forward: [t1[0], t2[0], "pg99-9", 42] });
    const s7 = stored(a.payload.key);
    const openMoved = reviewItemsOf(t1[0]).every((e) => s7.items[e.key].dueDay === day(1));
    const lockedKept = reviewItemsOf(t2[0]).every((e) => s7.items[e.key].dueDay === day(2));
    const notToday = !r7.data.plan.items.some((i) => i.lessonId === t1[0]);
    const counted = r7.data.forwarded === reviewItemsOf(t1[0]).length;
    // an old copy comes up later without `forward` — the merge keeps the stored (same day) item
    await sync(a, { record: dev, owner });
    const s7b = stored(a.payload.key);
    const survived = reviewItemsOf(t1[0]).every((e) => s7b.items[e.key].dueDay === day(1));
    // E2 수정: the device's record last kept for another licence (owner differs) is not taken — but the forward is this
    // licence's own request (its map page), so it is made on the stored record
    const b = sessionFor("1Y");
    const devB = recordOf([t1[1]], kst(day(-10), 9));
    // (합친 판: the same engine-made state as above — with its pass days, which step 2 needs to stand under settleItem)
    for (const e of reviewItemsOf(t1[1])) Object.assign(devB.items[e.key], { step: 2, dueDay: day(2), lastDay: day(-2), lastCorrect: true, reviewDay: day(-2), passDays: [day(-8), day(-2)] });
    const firstB = await sync(b, { record: devB, owner: null });
    const foreignDevice = recordOf([t1[1], t1[2]], kst(day(-10), 9));
    const foreign = await sync(b, { record: foreignDevice, owner: "id-0000000000000000", forward: [t1[1]] });
    const sB = stored(b.payload.key);
    const foreignForward = firstB.status === 200 && foreign.status === 200 && foreign.data.taken === false &&
      reviewItemsOf(t1[1]).every((e) => sB.items[e.key].dueDay === day(1)) && foreign.data.forwarded === reviewItemsOf(t1[1]).length &&
      !Object.keys(sB.items).some((k) => k.startsWith(`${t1[2]}:`));
    check(`E7 forward: 열린 ${t1[0]} 만 서버에서 내일(${day(1)})로 · 잠긴 ${t2[0]} · 없는 레슨 무시 · 오늘 계획에 없음 · forwarded ${reviewItemsOf(t1[0]).length} · 옛 기기 기록이 올라와도 그대로 · 다른 이용권 기기 기록(taken false)이어도 forward 는 이 이용권 기록에 함(그 기기 기록은 안 받음)`,
      r7.status === 200 && openMoved && lockedKept && notToday && counted && survived && foreignForward,
      `당김 ${openMoved} · 잠긴 것 그대로 ${lockedKept} · 오늘 계획에 없음 ${notToday} · forwarded ${r7.data.forwarded} · 합친 뒤 ${survived} · 다른 이용권 기기 ${foreignForward}(taken ${foreign.data && foreign.data.taken} · forwarded ${foreign.data && foreign.data.forwarded})`);
  }

  // ---- E8 the owner's report list ---------------------------------------------------------------------------------------
  {
    NOW = kst(D, 10);
    const item = reviewItemsOf(t1[1]).find((e) => e.kind === "produce");
    const other = reviewItemsOf(t1[0]).find((e) => e.kind === "produce");
    const x = sessionFor("STU1Y");
    const y = sessionFor("1Y");
    const devX = recordOf([t1[1], t1[0]], kst(day(-1), 9));
    E.applyAttempt(devX, item.key, review(t1[1], "produce", false, { pending: true, answer: "You're  a student." }), NOW, PROFILE);
    E.applyAttempt(devX, other.key, review(t1[0], "produce", false, { pending: true, answer: "zq only once" }), NOW, PROFILE);
    const devY = recordOf([t1[1]], kst(day(-1), 9));
    E.applyAttempt(devY, item.key, review(t1[1], "produce", false, { pending: true, answer: "you're a student." }), NOW, PROFILE);
    await sync(x, { record: devX, owner: null });
    await sync(y, { record: devY, owner: null });
    ADMIN = false;
    const denied = await call(admin.POST, null, "passoff-grammar", { course: "passoff-grammar" });
    ADMIN = true;
    const r8 = await call(admin.POST, null, "passoff-grammar", { course: "passoff-grammar" });
    const groups = (r8.data && r8.data.items) || [];
    const g = groups.find((it) => it.item === item.key);
    const g2 = groups.find((it) => it.item === other.key);
    const codes = [x, y, stu].map((s) => s.payload.key).filter((k) => r8.text.includes(k));
    check(`E8 관리자 신고: 관리자 아님 401 · ${item.key} 신고 2건 · 학습자 2명 · 같은 답(대소문자 · 띄어쓰기) 하나로 · 한국어 · 정답이 레슨 파일 것 · 많이 신고된 것이 먼저 · 코드 0`,
      denied.status === 401 && r8.status === 200 && g && g.count === 2 && g.learners === 2 && g.answers.length === 1 && g.answers[0].count === 2 &&
        g.about && g.about.prompt.includes(item.item.ko) && g.about.answers[0] === item.item.en && g.about.lessonTitle === index.lessons.find((l) => l.id === t1[1]).title &&
        g2 && g2.count === 1 && groups.indexOf(g) < groups.indexOf(g2) && codes.length === 0,
      `${denied.status} · ${r8.status} · ${g && `${g.count}건/${g.learners}명/답 ${g.answers.length}(${g.answers.map((a) => `${a.answer}×${a.count}`).join(" | ")})`} · ${g && g.about && g.about.lessonTitle} · 순서 ${groups.indexOf(g)}<${groups.indexOf(g2)} · 코드 ${codes.length}`);

    // E8b (E2 수정) a page of one record at a time, joined as the screen joins them = the one look above
    const pages = [];
    let after = null;
    for (let n = 0; n < 40; n++) {
      const p = await call(admin.POST, null, "passoff-grammar", { course: "passoff-grammar", after, limit: 1 });
      pages.push(p);
      after = p.data && p.data.next;
      if (!after) break;
    }
    const joined = pages.reduce((acc, p) => R.mergeReportGroups(acc, (p.data && p.data.items) || []), []);
    const shape = (list) => list.map((x) => ({ item: x.item, count: x.count, learners: x.learners, pending: x.pending, lastDay: x.lastDay, answers: x.answers }));
    const recordsSum = pages.reduce((sum, p) => sum + ((p.data && p.data.records) || 0), 0);
    check(`E8b 관리자 신고를 기록 하나씩 ${pages.length}쪽으로(after = 받은 next): 합친 묶음 = 한 번에 받은 묶음 · 읽은 기록 ${recordsSum} = ${r8.data.records} · 쪽마다 기록 1 이하 · 마지막 쪽 next 없음`,
      pages.length > 1 && pages.every((p) => p.status === 200 && p.data.records <= 1) && !after && recordsSum === r8.data.records && same(shape(joined), shape(groups)),
      `쪽 ${pages.length} · 기록 ${recordsSum}/${r8.data.records} · 끝 next ${after} · 묶음 ${joined.length}/${groups.length} · 같음 ${same(shape(joined), shape(groups))}`);
  }

  // ---- E9 the topic map -----------------------------------------------------------------------------------------------------
  {
    const bad = [];
    let checked = 0;
    for (const [n, lessons] of topics.entries()) {
      const topicNumber = n + 1;
      const data = passoffMapData({ topic: topicNumber, label: index.groups[n].label, lessonIds: lessons });
      if (!data) {
        bad.push(`TOPIC ${topicNumber}: 데이터 없음`);
        continue;
      }
      checked += 1;
      // the lesson files, read here on their own
      for (const [i, id] of lessons.entries()) {
        const blocks = viewBlocks(lessonFile(id).blocks);
        const rule = blocks.find((b) => b.type === "rule");
        const anchor = blocks.find((b) => b.type === "anchors").items[0];
        const l = data.lessons[i];
        if (!l || l.id !== id || l.ruleTitle !== rule.title || l.sentence.id !== anchor.id || l.sentence.en !== anchor.en) bad.push(`TOPIC ${topicNumber} 칸 ${i + 1}: ${JSON.stringify(l)}`);
      }
      const chips = M.mapChips(data).map((c) => c.id);
      if (lessons.length > 1 && same(chips, lessons)) bad.push(`TOPIC ${topicNumber}: 칩 순서가 정답 순서`);
      if (!same(chips, M.mapChips(data).map((c) => c.id))) bad.push(`TOPIC ${topicNumber}: 칩 순서가 매번 다름`);
      if (!same([...chips].sort(), [...lessons].sort())) bad.push(`TOPIC ${topicNumber}: 칩이 레슨과 다름`);
      const rules = M.mapRuleOptions(data).map((o) => o.lessonId);
      if (!same([...rules].sort(), [...lessons].sort())) bad.push(`TOPIC ${topicNumber}: 규칙 보기`);
      // the sentences to pick from are the PLACED lesson's (E2 수정): its own sentence among them, the same wherever it is placed
      for (const lesson of data.lessons) {
        const options = M.mapSentenceOptions(data, lesson.id);
        if (!options.some((o) => o.id === lesson.sentence.id) || options.length !== Math.min(3, lessons.length) || new Set(options.map((o) => o.id)).size !== options.length) {
          bad.push(`TOPIC ${topicNumber} ${lesson.id}: 문장 보기`);
        }
        if (!same(options, M.mapSentenceOptions(data, lesson.id))) bad.push(`TOPIC ${topicNumber} ${lesson.id}: 문장 보기 순서가 매번 다름`);
      }
      const right = { boxes: lessons, rules: lessons, sentences: data.lessons.map((l) => l.sentence.id) };
      if (M.mapMissedLessons(M.gradeMap(data, right)).length) bad.push(`TOPIC ${topicNumber}: 다 맞혔는데 틀린 칸`);
      if (lessons.length >= 2) {
        const swapped = { ...right, boxes: [lessons[1], lessons[0], ...lessons.slice(2)] };
        if (!same(M.mapMissedLessons(M.gradeMap(data, swapped)), [lessons[0], lessons[1]])) bad.push(`TOPIC ${topicNumber}: 칩 바꿈`);
        // the chips swapped, and each box's rule and sentence picked for the lesson placed in it — the two boxes wrong by the
        // lesson only (the box screen asked about the placed lesson)
        const placedPicks = {
          boxes: swapped.boxes,
          rules: swapped.boxes,
          sentences: swapped.boxes.map((id) => data.lessons.find((l) => l.id === id).sentence.id),
        };
        const pg = M.gradeMap(data, placedPicks);
        if (!same(M.mapMissedLessons(pg), [lessons[0], lessons[1]]) || !(pg[0].ruleOk && pg[0].sentenceOk && !pg[0].lessonOk && pg[0].placedId === lessons[1]) || !(pg[1].ruleOk && pg[1].sentenceOk && !pg[1].lessonOk)) {
          bad.push(`TOPIC ${topicNumber}: 놓은 레슨 기준`);
        }
        const wrongRule = { ...right, rules: [lessons[1], ...lessons.slice(1)] };
        if (!same(M.mapMissedLessons(M.gradeMap(data, wrongRule)), [lessons[0]])) bad.push(`TOPIC ${topicNumber}: 규칙 틀림`);
        const wrongSentence = { ...right, sentences: [data.lessons[1].sentence.id, ...right.sentences.slice(1)] };
        if (!same(M.mapMissedLessons(M.gradeMap(data, wrongSentence)), [lessons[0]])) bad.push(`TOPIC ${topicNumber}: 문장 틀림`);
      }
    }
    check(`E9 구성도: 대주제 ${topics.length}개 모두 — 레슨 순서 · 규칙 제목 · 첫 예문이 레슨 파일과 같음 · 칩은 정답 순서 아님 · 같은 순서 · 보기(놓은 레슨 것)에 그 문장 · 다 맞히면 0 · 칩 바꿈 · 규칙 · 문장 틀림은 그 레슨 · 칩을 바꾸고 놓은 레슨의 규칙 · 문장을 고르면 레슨만 틀림`,
      checked === topics.length && bad.length === 0, `${checked}/${topics.length} · 어긋남 ${bad.length}${bad.length ? ` (${bad.slice(0, 3).join(" | ")})` : ""}`);
  }

  for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name}  — ${x.note}`);
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${results.length}`);
  process.chdir(REPO);
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  try {
    process.chdir(REPO);
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {}
  process.exit(2);
});
