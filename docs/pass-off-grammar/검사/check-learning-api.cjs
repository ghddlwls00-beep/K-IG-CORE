#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 공통 학습 엔진의 서버 쪽(공통-학습-엔진.md §8-1 · 2 · 단계 2-나 E1)을 로컬 대체 저장소로.
 *
 * 진짜 src/app/api/learning/[course]/route.ts 의 POST 를 부른다(check-progress-api.cjs 와 같은 방법). 가짜는 셋뿐 — 이용권
 * 확인(licenseSession: 요청마다 넣는 세션), 'server-only', next/headers(쓰지 않는 쿠키 읽기). 기록 받기 · 합치기 · 저장 ·
 * 계획 · 문항 꺼내기 · 순서 잠금은 모두 진짜 코드(learning/* · passoffReview.ts · passoffProgress.ts · content.ts)이고, 기록은
 * 임시 폴더의 data/learning-passoff-grammar.json 에만 쓴다. 서버 시각은 Date.now 를 바꿔 정한다(D = 2026-10-05 한국 10시).
 * R2 환경값이 하나라도 있거나 NODE_ENV=production 이면 아무것도 안 하고 멈춘다(exit 2). 이용권 비밀값은 이 실행만의 버리는 값.
 *   L1 이용권 없음 → 401          L2 서버에 두지 않는 과정 → 404 · 망가진 JSON → 400 · 너무 큰 본문 → 413
 *   L3 다른 과정 이용권 → 403(지금은 PASS-OFF 만 서버 저장 — D04 로 grammar1 이 더해진 사본을 STUDENT 이용권으로 부름)
 *   L4 새 STUDENT 이용권(TOPIC 1 만 열림): 기기 기록에 어제 끝낸 pg01-1 · pg01-2 · TOPIC 2 레슨 → 계획 · 문항 · 저장에 잠긴
 *      대주제 문항 0 · 계획 날짜 = 서버의 오늘
 *   L5 plan 밖 문항 데이터 0: 문항 열쇠 = 계획 열쇠 · 계획 밖 문항(모든 레슨)의 글이 응답에 0 · 계획 안 글은 있음(탐침이 봄)
 *   L6 이용권이면 무료 레슨의 유료 STUDENT 문장이 붙은 판(pg01-1 보충 문항 데이터 있음)
 *   L7 LIFE: 맨 끝 대주제 레슨 문항이 나옴 / STULIFE: 안 나옴(LIFE 만 모두 열림 — 강의 쪽 문과 같음)
 *   L8 합치기: 같은 날 두 기기 — 맞음 뒤 틀림 · 틀림 뒤 맞음 모두 틀린 쪽(다음 날 다시)
 *   L9 날짜는 서버 시각: 시계가 3일 빠른 기기의 기록 → 저장된 날 중 서버의 오늘 뒤 0 · 계획 날짜 = 서버의 오늘 · 오지 않은 날 0
 *   L10 바뀐 때만 저장: 빈 기록 → 안 씀 · 같은 기록 두 번째 → 안 씀
 *   L11 다른 이용권이 마지막으로 쓴 기기 기록(owner 다름) → 받지 않음(taken false, 서버 기록 그대로)
 *   L12 한 기기 1분에 120번까지 · 121번째 429(STUDENT 와 같음)
 *   L13 임시 폴더 data/learning-passoff-grammar.json 에 코드별 한 칸 · 저장소 data/ 에 쓴 것 없음
 *   L14 무료 복습 쪽 문항(passoffFreeReviewItems — 이용권 없는 복습 쪽이 받는 것): 무료 두 레슨의 문항만 · 유료 보충 0 ·
 *       기록용 칸(bookRef · source · note …) 0
 *   node docs/pass-off-grammar/검사/check-learning-api.cjs [--break=<아래 하나>] [--prove-breaks]
 *   L15 과정에 없는 문항 열쇠(없는 문항 · 없는 레슨 · 이상한 글)와 문항의 레슨 · 종류를 기기가 바꿔 적은 것 → 과정의 것만 저장
 *   ── E1 점검 반영(09-28)에서 더함 ──
 *   L9b 서버가 다시 판정: 시계가 12일 빠른 기기가 기기의 날 +1 · +3 · +7 에 맞혀 '통과'한 문항 → 서버는 learning(다음 복습이
 *       내일) · 손으로 적은 'passed'(답한 적 없음) → learning · 올바른 시계로 쌓은 통과 · 중간 단계는 그대로(정직한 기록은 안 바뀜)
 *   L16 다시 잠긴 대주제: TOPIC 2 를 연 STUDENT 이용권이 TOPIC 2 레슨 기록을 저장 → 관리자 초기화(resetPassoffProgress) → 계획 ·
 *       문항 데이터 · 내일 수에 TOPIC 2 가 0(route 겹) · 어댑터 itemData 에 잠긴 열쇠를 직접 넘겨도 데이터 0(adapter 겹)
 *   L17 문항 API(/api/learning/<과정>/items — 기기가 짠 계획의 열쇠만): 이용권 없음 401 · 어댑터 없는 과정 404 · 열쇠 201개 ·
 *       배열 아님 400 · 준 열쇠 중 열린 대주제 것만 데이터(잠긴 TOPIC 2 · 없는 열쇠 0) · 묻지 않은 문항의 글 0
 *   기기 쪽(진짜 record.ts · sync.ts · passoffLearning.ts 를 가짜 localStorage · fetch → 진짜 route 로):
 *   L18 이용권 A 가 쓰던 기기에서 B 가 레슨을 마침 → B 의 서버 기록에 B 레슨 · A 레슨 0 / A 의 서버 기록에 B 레슨 0 · 기기에
 *       A · B 칸이 따로
 *   L19 첫 동기화 전(오프라인)에 A · B 가 한 기기에서 레슨 → B 가 올리면 B 서버에 A 레슨 0 · A 가 올리면 A 서버에 B 레슨 0
 *   L19b 세션이 다른 이용권(M)인데 기기가 L 칸을 보냄 → taken false · M 서버에 L 레슨 0 · 기기의 L 칸 그대로 · M 답은 M 칸에
 *   L20 이용권 없이 한 무료 레슨 → 처음 올린 이용권 A 에 합쳐짐 · 무료 칸 비워짐 · 그 뒤 B 에는 안 감
 *   L21 이용권으로 레슨을 마치면 바로 서버에(목록 · 복습을 안 열어도) → 빈 새 기기가 다음 날 같은 이용권으로 물으면 계획에
 *       그 레슨 문항(문항 데이터 없이 — planOnly)
 *   L22 무료 계산은 무료 복습 문항 열쇠로: pg01-1 의 유료 보충 문항이 든 기기 기록 → 무료 계획 · 내일 수에 유료 문항 0
 *     깨기는 사본만 바꿈 — 각각 이름 붙은 FAIL(exit 1)이어야: no-lock(잠금 검사를 뺌) · all-items(plan 밖 문항까지 넣음) ·
 *     any-key(과정에 없는 문항도 받음) · whole-lesson(문항에 레슨 블록을 통째로 붙임) · future-days(오지 않은 날을 그대로 받음) ·
 *     device-day(기기의 날로 계획) · replace(합치지 않고 기기 기록으로 덮음) · no-owner(다른 이용권의 기기 기록도 받음) ·
 *     no-rejudge(기기의 stage · step · dueDay 를 그대로) · no-plan-restrict(계획을 열린 대주제로 거르지 않음) ·
 *     no-itemdata-lock(어댑터가 잠금을 안 봄) · items-no-cap(문항 API 열쇠 수 제한 없음) · one-record(기기 기록을 이용권별로 안 나눔) ·
 *     taken-overwrite(다른 이용권 답을 이 칸에 씀) · no-adopt(무료 칸을 안 합침) · no-lesson-sync(레슨을 마쳐도 안 올림) ·
 *     free-by-lesson(무료 계산을 레슨 id 로만 거름)
 *     --prove-breaks: 깨지 않은 판 exit 0 + 깨기마다 exit 1 을 한 번에 확인
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
const ITEMS_ROUTE_FILE = path.join(REPO, "src/app/api/learning/[course]/items/route.ts");
const REVIEW_FILE = path.join(REPO, "src/lib/learning/review.ts");
const RECORD_FILE = path.join(REPO, "src/lib/learning/record.ts");
const SYNC_FILE = path.join(REPO, "src/lib/learning/sync.ts");
const PASSOFF_LEARNING_FILE = path.join(REPO, "src/lib/passoffLearning.ts");
const ADAPTER_FILE = path.join(REPO, "src/lib/passoffReview.ts");
const STORE_FILE = path.join(REPO, "src/lib/learning/serverStore.ts");
const BREAKS = {
  "no-lock": [ADAPTER_FILE, /return \{ lessonOpen: \(lessonId\) => isPassoffLessonUnlocked\(lessonId, progress, \{ everyTopicOpen \}\) \};/, "return { lessonOpen: (lessonId: string) => /^pg\\d{2}-\\d+$/.test(lessonId) };"],
  "all-items": [ROUTE_FILE, /plan\.items\.map\(\(item\) => item\.key\)/, "Object.keys(record.items)"],
  "any-key": [ADAPTER_FILE, /return found \? \{ lessonId, kind: found\.kind \} : null;/, 'return found ? { lessonId, kind: found.kind } : /^pg\\d{2}-\\d+$/.test(lessonId) ? { lessonId, kind: "produce" } : null;'],
  "whole-lesson": [ADAPTER_FILE, /table\.set\(item\.id, \{ lessonId, kind, lessonTitle, \.\.\.\(ruleTitle \? \{ ruleTitle \} : \{\}\), item \}\);/, "table.set(item.id, { lessonId, kind, lessonTitle, ...(ruleTitle ? { ruleTitle } : {}), item, blocks } as PassoffReviewItem);"],
  "future-days": [REVIEW_FILE, /const ahead = \(day: Day \| null\) => day !== null && daysBetween\(today, day\) > 0;/, "const ahead = (day: Day | null) => day === null && daysBetween(today, today) > 0;"],
  "device-day": [ROUTE_FILE, /const today = learningDay\(now\);/, 'const sentDay = (body.record as { lastStudyDay?: unknown } | null)?.lastStudyDay; const today = typeof sentDay === "string" && sentDay > learningDay(now) ? sentDay : learningDay(now);'],
  replace: [ROUTE_FILE, /const merged = mergeRecords\(stored, sent\);/, "const merged = mergeRecords(sent, sent);"],
  "no-owner": [ROUTE_FILE, /const taken = typeof body\.owner !== "string" \|\| body\.owner === owner;/, "const taken = true;"],
  "no-rejudge": [REVIEW_FILE, /out\.items\[key\] = settleItem\(/, "out.items[key] = ((s: ItemState, _p: CourseProfile) => s)("],
  "no-plan-restrict": [ROUTE_FILE, /const reviewable = restrictRecord\(record, open, access\.lessonOpen\);/, "const reviewable = record;"],
  "no-itemdata-lock": [ADAPTER_FILE, /if \(!access\.lessonOpen\(lessonId\)\) continue;/, ""],
  "items-no-cap": [ITEMS_ROUTE_FILE, /keys\.length > MAX_KEYS \|\|/, ""],
  "one-record": [RECORD_FILE, /return learner \? `\$\{PREFIX\}\$\{course\}@\$\{learner\}` : PREFIX \+ course;/, "return PREFIX + course;"],
  "taken-overwrite": [SYNC_FILE, /const owner = data\.taken \? learner : typeof data\.owner === "string" && data\.owner \? data\.owner : null;/, "const owner = learner;"],
  "no-adopt": [SYNC_FILE, /if \(isEmpty\(free\)\) return;/, "return;"],
  "no-lesson-sync": [PASSOFF_LEARNING_FILE, /if \(learner\) void syncLearnerRecord\(PASSOFF_COURSE, learner, \{ planOnly: true \}\);/, ""],
  "free-by-lesson": [PASSOFF_LEARNING_FILE, /\(key\) => freeKeys\.has\(key\)/, "(key) => PASSOFF_FREE_LESSONS.includes(passoffLessonOfItem(key))"],
};

if (process.argv.includes("--prove-breaks")) {
  const run = (args) => spawnSync(process.execPath, [__filename, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const normal = run([]);
  const rows = [["(깨지 않음)", normal.status, normal.status === 0 ? "PASS" : "FAIL"]];
  for (const name of Object.keys(BREAKS)) {
    const r = run([`--break=${name}`]);
    const named = (r.stdout.match(/^FAIL {2}(L\d+[a-z]?)/gm) || []).map((l) => l.slice(6));
    rows.push([name, r.status, r.status === 1 && named.length ? `잡힘 — FAIL ${named.join(" · ")}` : `안 잡힘(exit ${r.status}) ${r.stderr.slice(0, 200)}`]);
  }
  for (const [name, status, verdict] of rows) console.log(`${name.padEnd(12)} exit ${status}  ${verdict}`);
  const ok = rows[0][1] === 0 && rows.slice(1).every((r) => r[1] === 1 && r[2].startsWith("잡힘"));
  console.log(ok ? "prove-breaks: PASS" : "prove-breaks: FAIL");
  process.exit(ok ? 0 : 1);
}
if (BREAK && !BREAKS[BREAK]) {
  console.error(`모르는 깨기: ${BREAK} — ${Object.keys(BREAKS).join(" · ")}`);
  process.exit(2);
}

// --- never the real store: stop when R2 values are around ---
const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"];
const present = R2_ENV.filter((k) => process.env[k]);
if (present.length || process.env.NODE_ENV === "production") {
  console.error(`멈춤: ${[...present, process.env.NODE_ENV === "production" ? "NODE_ENV=production" : ""].filter(Boolean).join(", ")} 가 설정돼 있어 진짜 저장소에 쓸 수 있음`);
  process.exit(2);
}
// the owner id (licenseIdFor) is an HMAC under LICENSE_SECRET — a throwaway one, in this process only
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");

// --- the server's clock -------------------------------------------------------------------------------------------
const realNow = Date.now.bind(Date);
let NOW = null;
Date.now = () => (NOW === null ? realNow() : NOW);
/** `hour` o'clock Korea time on `day` */
const kst = (day, hour = 10) => Date.parse(`${day}T00:00:00Z`) + (hour - 9) * 3_600_000;
const D = "2026-10-05";

// --- loading the source as it is (a transform changes one file's text, in this process only) ----------------------
const ts = require(path.join(REPO, "node_modules/typescript"));
let SESSION = null;
const OVERRIDES = {
  "server-only": {},
  "@/lib/licenseSession": {
    verifyLicenseSession: async () => SESSION,
    verifyLicenseSessionToken: async () => SESSION,
    LICENSE_SESSION_COOKIE_NAME: "kig_license_session",
  },
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

// content.ts reads process.cwd()/content when loaded; the store writes process.cwd()/data when called —
// load from the repository, then call from a temporary folder: nothing lands in the repository's data/.
process.chdir(REPO);
const load = makeLoader(BREAK ? [BREAKS[BREAK]] : []);
const route = load(ROUTE_FILE);
const E = load(path.join(REPO, "src/lib/learning/engine.ts"));
const Day = load(path.join(REPO, "src/lib/learning/day.ts"));
const { attachPaidItems } = load(path.join(REPO, "src/lib/passoffSupplement.ts"));
const { passoffFreeReviewItems, PASSOFF_SERVER_LEARNING } = load(ADAPTER_FILE);
const itemsRoute = load(ITEMS_ROUTE_FILE);
const Progress = load(path.join(REPO, "src/lib/passoffProgress.ts"));
const { licenseIdFor } = load(path.join(REPO, "src/lib/serverLicense.ts"));
// the device side, as the browser runs it (a stand-in localStorage and fetch are set up before L18)
const Rec = load(RECORD_FILE);
const Sync = load(SYNC_FILE);
const PL = load(PASSOFF_LEARNING_FILE);
const Review = load(REVIEW_FILE);
// a copy of the route in which D04 has added GRAMMAR I to the server-kept courses (L3)
const loadWithGrammar = makeLoader([[STORE_FILE, /\["passoff-grammar"\]/, '["passoff-grammar", "grammar1"]']]);
const routeWithGrammar = loadWithGrammar(ROUTE_FILE);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kig-learning-api-"));
process.chdir(TMP);

// --- writes to the stand-in store are counted (L10) ---------------------------------------------------------------
let storeWrites = 0;
const realWrite = fs.writeFileSync;
fs.writeFileSync = function (file, ...rest) {
  if (String(file).includes(`${path.sep}data${path.sep}learning-`)) storeWrites += 1;
  return realWrite.call(this, file, ...rest);
};
const STORE = path.join(TMP, "data", "learning-passoff-grammar.json");
const stored = (key) => {
  if (!fs.existsSync(STORE)) return null;
  return JSON.parse(fs.readFileSync(STORE, "utf8"))[key] || null;
};

// --- licences, requests ---------------------------------------------------------------------------------------------
const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const checksum = crypto.createHmac("sha256", process.env.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${checksum}`;
};
let seq = 0;
const sessionFor = (plan) => ({ payload: { key: makeKey(plan), plan, deviceId: `learning-check-${++seq}`, expiresAt: null, iat: realNow() } });
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
const sync = (session, record, owner = null) => call(route.POST, session, "passoff-grammar", { record, owner });

// --- the course's lessons, read here on their own (not through the code under test) --------------------------------
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const topics = index.groups.map((g) => g.lessons);
const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
const supplementOf = (id) => {
  const file = path.join(REPO, "content/private/passoff-grammar", `${id}.paid.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};
/** a finished lesson's review items (PassoffLearningView finish): ③ not reserve · ④ · ⑤ — with a licence's paid ones */
function reviewItemsOf(id, withPaid) {
  let blocks = lessonFile(id).blocks;
  const sup = withPaid ? supplementOf(id) : null;
  if (sup) blocks = attachPaidItems(blocks, sup.items);
  const out = [];
  for (const b of blocks) {
    if (b.type !== "drill") continue;
    for (const it of b.select || []) if (!it.reserve) out.push({ key: it.id, kind: it.kind, item: it });
    for (const it of b.produce || []) out.push({ key: it.id, kind: "produce", item: it });
    for (const it of b.transfer || []) out.push({ key: it.id, kind: "transfer", item: it });
  }
  return out;
}
/** an item's words as they would stand in a JSON answer — ③'s tokens as the array itself */
const textsOf = (it) =>
  [it.en, it.ko, it.promptEn, it.instruction, it.sentence, it.why, ...(it.accept || []), ...(it.options || []), Array.isArray(it.tokens) ? JSON.stringify(it.tokens) : null]
    .filter((s) => typeof s === "string" && s.trim().length >= 10);
const inBody = (body, text) => body.includes(text) || body.includes(JSON.stringify(text).slice(1, -1));

/** a device's record: these lessons finished at `atMs` (their review items in, due the next day) */
function deviceRecord(lessons, atMs, withPaid = true) {
  const r = E.emptyRecord("passoff-grammar");
  for (const id of lessons) E.applyLessonDone(r, id, atMs, reviewItemsOf(id, withPaid).map(({ key, kind }) => ({ key, kind })));
  return r;
}
const PROFILE = { course: "passoff-grammar", secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 }, elementKinds: ["select", "choice", "short"] };
const reviewAnswer = (lessonId, kind, correct) => ({ lessonId, kind, correct, help: "none", mode: "typed", where: "review", ...(correct ? {} : { answer: "wrong on purpose" }) });

const results = [];
const check = (name, ok, note) => results.push({ name, ok: Boolean(ok), note: String(note ?? "").slice(0, 400) });

(async () => {
  const t0 = realNow();
  const [t1, t2] = topics;
  const last = topics[topics.length - 1];
  const deepest = last[last.length - 1];
  NOW = kst(D, 10);
  /** the day before D, 09:00 Korea time — a lesson finished then comes back on D */
  const yesterday = kst(D, 9) - 86_400_000;

  // L1
  const n1 = await sync(null, deviceRecord([t1[0]], yesterday));
  check("L1 이용권 없음 → 401", n1.status === 401, n1.status);

  // L2
  const stu = sessionFor("STU1Y");
  const unknownA = await call(route.POST, stu, "grammar1", { record: null });
  const unknownB = await call(route.POST, stu, "..%2Fdata", { record: null });
  const badJson = await call(route.POST, sessionFor("1Y"), "passoff-grammar", "{not json");
  const big = await call(route.POST, sessionFor("1Y"), "passoff-grammar", JSON.stringify({ record: null, pad: "x".repeat(2_100_000) }));
  check("L2 서버에 두지 않는 과정(grammar1 · 이상한 이름) → 404 · 망가진 JSON → 400 · 2MB 넘는 본문 → 413",
    unknownA.status === 404 && unknownB.status === 404 && badJson.status === 400 && big.status === 413,
    `${unknownA.status} · ${unknownB.status} · ${badJson.status} · ${big.status}`);

  // L3 — a STUDENT pass on a course it does not open, once GRAMMAR I keeps its record on the server too
  const other = await call(routeWithGrammar.POST, sessionFor("STU1Y"), "grammar1", { record: null });
  const allPass = await call(routeWithGrammar.POST, sessionFor("1Y"), "grammar1", { record: null });
  check("L3 다른 과정 이용권(STUDENT 이용권으로 grammar1 — D04 사본) → 403 · 올패스는 403 아님", other.status === 403 && allPass.status !== 403, `${other.status} · 올패스 ${allPass.status}`);

  // L4 · L5 · L6 — a new STUDENT pass: TOPIC 1 open only
  const dev = deviceRecord([t1[0], t1[1], t2[0]], yesterday);
  const r4 = await sync(stu, dev);
  const plan4 = r4.data && r4.data.plan;
  const items4 = (r4.data && r4.data.items) || {};
  const locked = (key) => t2.concat(...topics.slice(2)).some((id) => key.startsWith(`${id}:`));
  const planKeys = plan4 ? plan4.items.map((i) => i.key) : [];
  const store4 = stored(stu.payload.key);
  const lockedStored = store4 ? Object.keys(store4.items).filter(locked).length + Object.keys(store4.lessons).filter((id) => !t1.includes(id)).length : -1;
  check(
    `L4 새 STUDENT 이용권: 어제 끝낸 ${t1[0]} · ${t1[1]} · ${t2[0]}(잠긴 TOPIC 2) → 계획 · 문항 · 저장된 기록에 잠긴 대주제 것 0 · 계획 날짜 = 서버의 오늘 ${D}`,
    r4.status === 200 && plan4 && plan4.day === D && planKeys.length > 0 && planKeys.filter(locked).length === 0 && Object.keys(items4).filter(locked).length === 0 && lockedStored === 0,
    `${r4.status} day=${plan4 && plan4.day} 계획 ${planKeys.length}(잠긴 ${planKeys.filter(locked).length}) · 문항 데이터 잠긴 ${Object.keys(items4).filter(locked).length} · 저장 잠긴 ${lockedStored}`,
  );

  const planSet = new Set(planKeys);
  const itemKeys = Object.keys(items4);
  const sameKeys = itemKeys.length === planSet.size && itemKeys.every((k) => planSet.has(k));
  // every item of every lesson (with the paid ones), outside today's plan — its words must not be in the answer
  const everything = index.lessons.flatMap((l) => reviewItemsOf(l.id, true));
  const planTexts = everything.filter((e) => planSet.has(e.key)).flatMap((e) => textsOf(e.item));
  const needles = [...new Set(everything.filter((e) => !planSet.has(e.key)).flatMap((e) => textsOf(e.item)))].filter((t) => !planTexts.some((p) => p.includes(t)));
  const leaked = needles.filter((t) => inBody(r4.text, t));
  const seen = planTexts.filter((t) => inBody(r4.text, t)).length;
  check(
    `L5 plan 밖 문항 데이터 0 — 문항 열쇠 = 계획 열쇠(${planSet.size}) · 계획 밖 문항의 글 ${needles.length}개(레슨 ${index.lessons.length}개 전부) 중 응답에 있는 것 0 · 계획 안 글은 응답에 있음`,
    r4.status === 200 && sameKeys && leaked.length === 0 && seen > 0 && planSet.size < reviewItemsOf(t1[0], true).length + reviewItemsOf(t1[1], true).length,
    `열쇠 같음 ${sameKeys} · 새어 나간 글 ${leaked.length}${leaked.length ? ` (${leaked.slice(0, 2).join(" | ")})` : ""} · 계획 안 글 보임 ${seen}/${planTexts.length} · 계획 ${planSet.size} < 두 레슨 문항 ${reviewItemsOf(t1[0], true).length + reviewItemsOf(t1[1], true).length}`,
  );

  // the rest of a lesson (① 예문 · ② 규칙 설명 · ⑤ 내 문장 틀) never goes out here — of any lesson, today's included; only a
  // planned lesson's rule TITLE does (ladder ②'s clue)
  const ruleTitles = new Set(Object.values(items4).map((d) => d.ruleTitle).filter(Boolean));
  const otherTexts = index.lessons.flatMap((l) => {
    const blocks = lessonFile(l.id).blocks;
    const sup2 = supplementOf(l.id);
    const all = sup2 ? attachPaidItems(blocks, sup2.items) : blocks;
    return all.flatMap((b) =>
      b.type === "anchors" ? b.items.flatMap((a) => [a.en, a.ko, a.promptEn])
        : b.type === "rule" ? [b.title, ...(b.points || []), b.koDiff, ...((b.discovery && [b.discovery.question, ...(b.discovery.options || [])]) || []), ...((b.check && [b.check.question]) || [])]
          : b.type === "frame" ? [b.template, b.ko] : [],
    );
  }).filter((s) => typeof s === "string" && s.trim().length >= 10 && !ruleTitles.has(s) && !planTexts.some((p) => p.includes(s)));
  const otherLeaked = [...new Set(otherTexts)].filter((t) => inBody(r4.text, t));
  check(`L5b 레슨의 다른 글(① 예문 · ② 규칙 설명 · 내 문장 틀 — 레슨 ${index.lessons.length}개, 오늘 레슨 것도) ${new Set(otherTexts).size}개 중 응답에 있는 것 0 — 규칙 제목만 나감`,
    otherLeaked.length === 0 && new Set(otherTexts).size > 0,
    `새어 나간 글 ${otherLeaked.length}${otherLeaked.length ? ` (${otherLeaked.slice(0, 2).join(" | ")})` : ""} · 규칙 제목 ${ruleTitles.size}`);

  const sup = supplementOf(t1[0]);
  const paidIds = sup ? sup.items.map((e) => e.item.id).filter((id) => reviewItemsOf(t1[0], true).some((x) => x.key === id)) : [];
  const paidShown = paidIds.filter((id) => items4[id]);
  const paidPlanned = paidIds.filter((id) => planSet.has(id));
  check(`L6 이용권: ${t1[0]} 의 유료 STUDENT 보충 문항 ${paidIds.length}개가 복습에 들어오고, 오늘 계획에 든 것은 데이터가 붙음`,
    paidIds.length > 0 && paidPlanned.length > 0 && paidShown.length === paidPlanned.length && paidShown.every((id) => typeof items4[id].item.en === "string" || typeof items4[id].item.instruction === "string"),
    `보충 ${paidIds.length} · 계획에 ${paidPlanned.length} · 데이터 ${paidShown.length}`);

  // L7 — LIFE opens every topic, STULIFE does not
  const life = sessionFor("LIFE");
  const stulife = sessionFor("STULIFE");
  const deep = deviceRecord([deepest], yesterday);
  const r7 = await sync(life, deep);
  const r7b = await sync(stulife, deep);
  const deepKeys = (r) => Object.keys((r.data && r.data.items) || {}).filter((k) => k.startsWith(`${deepest}:`)).length;
  const kept7 = stored(stulife.payload.key);
  const kept7count = kept7 ? Object.keys(kept7.items).length + Object.keys(kept7.lessons).length : 0;
  check(`L7 LIFE: 맨 끝 레슨 ${deepest} 문항이 나옴 / STULIFE: 문항 · 저장된 문항과 레슨 0(강의 쪽 문과 같은 LIFE 규칙)`,
    r7.status === 200 && deepKeys(r7) > 0 && r7b.status === 200 && deepKeys(r7b) === 0 && (r7b.data.plan.items || []).length === 0 && kept7count === 0,
    `LIFE ${deepKeys(r7)} · STULIFE ${deepKeys(r7b)} · STULIFE 저장 문항+레슨 ${kept7count}`);

  // L8 — two devices, the same day: a wrong answer wins either way
  const base = deviceRecord([t1[1]], yesterday);
  const firstItem = reviewItemsOf(t1[1], true)[0];
  const answered = (correct, hour) => {
    const r = JSON.parse(JSON.stringify(base));
    E.applyAttempt(r, firstItem.key, reviewAnswer(t1[1], firstItem.kind, correct), kst(D, hour), PROFILE);
    return r;
  };
  const a1 = sessionFor("1Y");
  NOW = kst(D, 11);
  await sync(a1, answered(true, 10));
  const r8 = await sync(a1, answered(false, 10.5));
  const a2 = sessionFor("1Y");
  await sync(a2, answered(false, 10));
  const r8b = await sync(a2, answered(true, 10.5));
  const stateOf = (r) => r.data && r.data.record.items[firstItem.key];
  const tomorrow = Day.addDays(D, 1);
  const s8 = stateOf(r8);
  const s8b = stateOf(r8b);
  const stored8b = stored(a2.payload.key);
  check(`L8 합치기: 같은 날 두 기기(${firstItem.key}) — 맞음 뒤 틀림 · 틀림 뒤 맞음 모두 틀린 쪽 · 다음 날(${tomorrow}) 다시 · 저장도 같음`,
    s8 && s8.lastCorrect === false && s8.dueDay === tomorrow && s8b && s8b.lastCorrect === false && s8b.dueDay === tomorrow && stored8b && stored8b.items[firstItem.key].lastCorrect === false,
    `맞음→틀림 ${s8 && s8.lastCorrect}/${s8 && s8.dueDay} · 틀림→맞음 ${s8b && s8b.lastCorrect}/${s8b && s8b.dueDay} · 저장 ${stored8b && stored8b.items[firstItem.key].lastCorrect}`);

  // L9 — a device whose clock runs three days ahead
  NOW = kst(D, 10);
  const ahead = (n) => kst(D, 10) + n * 86_400_000;
  const fast = deviceRecord([t1[1]], ahead(2));
  E.applyAttempt(fast, firstItem.key, reviewAnswer(t1[1], firstItem.kind, true), ahead(3), PROFILE);
  const a3 = sessionFor("1Y");
  const r9 = await sync(a3, fast);
  const s9 = stored(a3.payload.key);
  const daysIn = (rec) => {
    if (!rec) return ["(없음)"];
    const days = [rec.lastStudyDay, ...Object.values(rec.lessons).map((l) => l.day), ...rec.log.map((e) => e.day), ...rec.reports.map((x) => x.day)];
    for (const s of Object.values(rec.items)) days.push(s.firstDay, s.lastDay, s.reviewDay, ...s.passDays);
    return days.filter((d) => typeof d === "string");
  };
  const later = daysIn(s9).filter((d) => d > D);
  check(`L9 날짜는 서버 시각: 시계가 3일 빠른 기기 → 저장된 날 중 서버의 오늘(${D}) 뒤 0 · 계획 날짜 ${D} · 아직 오지 않은 문항 0`,
    r9.status === 200 && s9 && later.length === 0 && r9.data.plan.day === D && r9.data.plan.items.length === 0,
    `${r9.status} 뒤의 날 ${later.length}${later.length ? `(${[...new Set(later)].slice(0, 3).join(",")})` : ""} · day=${r9.data && r9.data.plan.day} · 계획 ${r9.data && r9.data.plan.items.length}`);

  // L10 — written only when something changed
  const a4 = sessionFor("1Y");
  let before = storeWrites;
  await sync(a4, E.emptyRecord("passoff-grammar"));
  const emptyWrites = storeWrites - before;
  const rec10 = deviceRecord([t1[0]], yesterday);
  before = storeWrites;
  await sync(a4, rec10);
  const firstWrites = storeWrites - before;
  before = storeWrites;
  await sync(a4, rec10);
  const againWrites = storeWrites - before;
  check("L10 바뀐 때만 저장: 빈 기록 0번 · 새 레슨 1번 · 같은 기록 다시 0번", emptyWrites === 0 && firstWrites === 1 && againWrites === 0, `${emptyWrites} · ${firstWrites} · ${againWrites}`);

  // L11 — a record last kept for another licence on this device is not taken
  const a5 = sessionFor("1Y");
  const own = await sync(a5, deviceRecord([t1[0]], yesterday));
  const owner = own.data && own.data.owner;
  const foreign = await sync(a5, deviceRecord([t1[1]], yesterday), "id-0000000000000000");
  const mine = await sync(a5, deviceRecord([t1[1]], yesterday), owner);
  const has = (r, id) => Object.keys((r.data && r.data.record.items) || {}).some((k) => k.startsWith(`${id}:`));
  check("L11 다른 이용권이 마지막으로 쓴 기기 기록 → 받지 않음(taken false · 서버 기록 그대로) / 같은 이용권 → 받음",
    typeof owner === "string" && owner.startsWith("id-") && foreign.data.taken === false && !has(foreign, t1[1]) && has(foreign, t1[0]) && mine.data.taken === true && has(mine, t1[1]),
    `owner ${owner} · 다른 이용권 taken=${foreign.data && foreign.data.taken} ${t1[1]} ${has(foreign, t1[1])} · 같은 이용권 taken=${mine.data && mine.data.taken} ${has(mine, t1[1])}`);

  // L15 — keys the course does not have, and an item's lesson or kind written differently by the device
  const a6 = sessionFor("1Y");
  const forged = deviceRecord([t1[1]], yesterday);
  const realKey = reviewItemsOf(t1[1], true)[0];
  const fakeState = { ...forged.items[realKey.key] };
  forged.items[`${t1[1]}:zz99`] = { ...fakeState };
  forged.items["pg99-9:p1"] = { ...fakeState, lessonId: "pg99-9" };
  forged.items["../../x"] = { ...fakeState };
  forged.items[realKey.key] = { ...forged.items[realKey.key], lessonId: t2[0], kind: realKey.kind === "produce" ? "short" : "produce" };
  const r15 = await sync(a6, forged);
  const s15 = stored(a6.payload.key);
  const keys15 = s15 ? Object.keys(s15.items) : [];
  const real15 = s15 && s15.items[realKey.key];
  check(`L15 과정에 없는 문항 열쇠(${t1[1]}:zz99 · pg99-9:p1 · ../../x) 0 · 기기가 바꿔 적은 레슨 · 종류는 과정의 것(${realKey.key} → ${t1[1]} · ${realKey.kind})`,
    r15.status === 200 && s15 && !keys15.includes(`${t1[1]}:zz99`) && !keys15.includes("pg99-9:p1") && !keys15.includes("../../x") && real15 && real15.lessonId === t1[1] && real15.kind === realKey.kind && keys15.length === reviewItemsOf(t1[1], true).length,
    `저장 ${keys15.length}/${reviewItemsOf(t1[1], true).length} · 가짜 ${keys15.filter((k) => !reviewItemsOf(t1[1], true).some((e) => e.key === k)).join(",") || "0"} · ${realKey.key} ${real15 && `${real15.lessonId}/${real15.kind}`}`);

  // L12 — rate limit
  const busy = sessionFor("STU1Y");
  let lastOk = 0;
  let limited = null;
  for (let i = 1; i <= 125; i++) {
    const x = await call(route.POST, busy, "passoff-grammar", { record: null });
    if (x.status === 200) lastOk = i;
    else if (x.status === 429 && limited === null) limited = i;
  }
  check("L12 한 기기 1분에 120번까지 · 121번째 429", lastOk === 120 && limited === 121, `마지막 200 = ${lastOk}번째 · 첫 429 = ${limited}번째`);

  // L13 — the stand-in store
  const all = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : {};
  // STULIFE is among them: its lesson was refused, but the day it studied (lastStudyDay) was taken
  const writers = [stu, life, stulife, a1, a2, a3, a4, a5, a6].map((s) => s.payload.key);
  const repoFile = path.join(REPO, "data", "learning-passoff-grammar.json");
  const repoTouched = fs.existsSync(repoFile) && fs.statSync(repoFile).mtimeMs >= t0;
  check(`L13 임시 폴더 data/learning-passoff-grammar.json 에 코드별 한 칸(쓴 코드 ${writers.length}개 — 요청만 보낸 기기 · 빈 기록은 바뀐 게 없어 안 씀) · 저장소 data/ 에 쓴 것 없음`,
    Object.keys(all).length === writers.length && writers.every((k) => all[k]) && !repoTouched, `칸 ${Object.keys(all).length} · 저장소 ${repoTouched ? "바뀜" : "그대로"}`);

  // L14 — what the free review page gets
  NOW = null;
  const free = passoffFreeReviewItems();
  const freeLessons = index.groups[0].lessons.slice(0, 2);
  const expected = freeLessons.flatMap((id) => reviewItemsOf(id, false).map((e) => e.key));
  const freeKeys = Object.keys(free);
  const paidAll = fs.readdirSync(path.join(REPO, "content/private/passoff-grammar")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(REPO, "content/private/passoff-grammar", f), "utf8")).items.map((e) => e.item.id));
  const hidden = ["bookRef", "fix", "source", "koSource", "note", "challengeNote", "paidStudent", "tags", "challengeTags"];
  const hiddenFound = freeKeys.filter((k) => hidden.some((h) => Object.prototype.hasOwnProperty.call(free[k].item, h)));
  check(`L14 무료 복습 쪽 문항: ${freeLessons.join(" · ")} 의 복습 문항만(${expected.length}) · 유료 보충 ${paidAll.length}개 중 0 · 기록용 칸 0`,
    freeKeys.length === expected.length && expected.every((k) => free[k]) && freeKeys.filter((k) => paidAll.includes(k)).length === 0 && hiddenFound.length === 0,
    `${freeKeys.length}/${expected.length} · 유료 ${freeKeys.filter((k) => paidAll.includes(k)).length} · 기록용 칸 ${hiddenFound.length}`);

  // ── E1 점검 반영 ─────────────────────────────────────────────────────────────────────────────────────────────────
  const COURSE = "passoff-grammar";
  const items12 = reviewItemsOf(t1[1], true);
  const [sent1, sent2, sent3] = items12.filter((e) => e.kind === "produce");

  // L9b — the server judges again: a pass made on days still to come, or written in by hand, is not a pass
  NOW = kst(D, 10);
  const deviceDay = (n) => kst(D, 10) + (12 + n) * 86_400_000; // a clock twelve days ahead
  const fastPass = E.emptyRecord(COURSE);
  E.applyLessonDone(fastPass, t1[1], deviceDay(0), items12.map(({ key, kind }) => ({ key, kind })));
  for (const n of [1, 3, 7]) E.applyAttempt(fastPass, sent1.key, reviewAnswer(t1[1], "produce", true), deviceDay(n), PROFILE);
  const passedOnDevice = fastPass.items[sent1.key].stage === "passed";
  fastPass.items[sent2.key] = { ...fastPass.items[sent2.key], stage: "passed", step: 2, dueDay: "2027-06-01" };
  // an honest record kept with a right clock: one item passed (days D-9 · D-7 · D-3), one half way (D-9 · D-7)
  const honest = E.emptyRecord(COURSE);
  E.applyLessonDone(honest, t1[0], kst(D, 10) - 10 * 86_400_000, reviewItemsOf(t1[0], true).map(({ key, kind }) => ({ key, kind })));
  const [h1, h2] = reviewItemsOf(t1[0], true).filter((e) => e.kind === "produce");
  for (const n of [9, 7, 3]) E.applyAttempt(honest, h1.key, reviewAnswer(t1[0], "produce", true), kst(D, 10) - n * 86_400_000, PROFILE);
  for (const n of [9, 7]) E.applyAttempt(honest, h2.key, reviewAnswer(t1[0], "produce", true), kst(D, 10) - n * 86_400_000, PROFILE);
  const a7 = sessionFor("1Y");
  const r9b = await sync(a7, fastPass);
  const a8 = sessionFor("1Y");
  await sync(a8, honest);
  const s9b = stored(a7.payload.key);
  const k1 = s9b && s9b.items[sent1.key];
  const k2 = s9b && s9b.items[sent2.key];
  const kept = stored(a8.payload.key);
  const sameState = (a, b) => Boolean(a && b) && Review.sameRecord({ items: { x: a } }, { items: { x: b } });
  check(`L9b 서버가 다시 판정: 시계가 12일 빠른 기기가 '통과'시킨 ${sent1.key} → learning · 다음 복습 ${Day.addDays(D, 2)} 전 / 손으로 적은 'passed'(${sent2.key}) → learning · 내일 / 올바른 시계로 쌓은 통과 · 중간 단계는 그대로`,
    passedOnDevice && r9b.status === 200 && k1 && k1.stage === "learning" && k1.dueDay <= Day.addDays(D, 2) && k1.step <= k1.passDays.length &&
      k2 && k2.stage === "learning" && k2.dueDay <= Day.addDays(D, 1) &&
      kept && kept.items[h1.key].stage === "passed" && sameState(kept.items[h1.key], honest.items[h1.key]) && sameState(kept.items[h2.key], honest.items[h2.key]),
    `기기 통과 ${passedOnDevice} · ${sent1.key} ${k1 && `${k1.stage}/${k1.step}/${k1.dueDay}`} · ${sent2.key} ${k2 && `${k2.stage}/${k2.dueDay}`} · 정직한 통과 ${kept && kept.items[h1.key].stage} 같음 ${kept && sameState(kept.items[h1.key], honest.items[h1.key])} · 중간 같음 ${kept && sameState(kept.items[h2.key], honest.items[h2.key])}`);

  // L16 — a topic locked again after its record was kept (the owner's reset)
  const re = sessionFor("STU1Y");
  await Progress.setPassoffTopic(re.payload.key, 2);
  const t2Items = reviewItemsOf(t2[0], true);
  const openRun = await sync(re, deviceRecord([t2[0]], yesterday));
  const t2Planned = ((openRun.data && openRun.data.plan.items) || []).filter((i) => i.key.startsWith(`${t2[0]}:`)).length;
  await Progress.resetPassoffProgress(re.payload.key);
  const lockedRun = await sync(re, E.emptyRecord(COURSE));
  const lockedPlan = ((lockedRun.data && lockedRun.data.plan.items) || []).filter((i) => i.key.startsWith(`${t2[0]}:`)).length;
  const lockedData = Object.keys((lockedRun.data && lockedRun.data.items) || {}).filter((k) => k.startsWith(`${t2[0]}:`)).length;
  const reAccess = await PASSOFF_SERVER_LEARNING.access({ key: re.payload.key, plan: "STU1Y" });
  const direct = PASSOFF_SERVER_LEARNING.itemData([...t2Items.map((e) => e.key), items12[0].key], reAccess);
  const directLocked = Object.keys(direct).filter((k) => k.startsWith(`${t2[0]}:`)).length;
  check(`L16 다시 잠긴 대주제: ${t2[0]} 기록 저장(열렸을 때 계획 ${t2Planned}) → 관리자 초기화 → 계획 · 문항 데이터 · 내일 수에 TOPIC 2 가 0(route) · 어댑터에 잠긴 열쇠 ${t2Items.length}개를 직접 넘겨도 데이터 0(adapter) · 열린 문항은 데이터 있음`,
    t2Planned > 0 && lockedRun.status === 200 && lockedPlan === 0 && lockedData === 0 && lockedRun.data.tomorrow === 0 && directLocked === 0 && Boolean(direct[items12[0].key]),
    `열렸을 때 계획 ${t2Planned} · 잠긴 뒤 계획 ${lockedPlan} · 데이터 ${lockedData} · 내일 ${lockedRun.data && lockedRun.data.tomorrow} · 어댑터 잠긴 ${directLocked} · 열린 ${Boolean(direct[items12[0].key])}`);

  // L17 — the items API (a plan made on the device asks for those items' data only)
  const askItems = (session, course, body) => call(itemsRoute.POST, session, course, body);
  const it = sessionFor("STU1Y");
  const wanted = [items12[0].key, items12[1].key, t2Items[0].key, "pg99-9:p1", "../x"];
  const noLicence = await askItems(null, COURSE, { keys: wanted });
  const noAdapter = await askItems(it, "grammar1", { keys: wanted });
  const tooMany = await askItems(it, COURSE, { keys: Array.from({ length: 201 }, (_, i) => `${t1[1]}:p${i}`) });
  const notList = await askItems(it, COURSE, { keys: "pg01-2:p1" });
  const okItems = await askItems(it, COURSE, { keys: wanted });
  const gotKeys = Object.keys((okItems.data && okItems.data.items) || {}).sort();
  const unasked = items12.filter((e) => !wanted.includes(e.key)).flatMap((e) => textsOf(e.item)).filter((t) => !textsOf(items12[0].item).concat(textsOf(items12[1].item)).some((p) => p.includes(t)));
  const unaskedSeen = unasked.filter((t) => inBody(okItems.text, t));
  check(`L17 문항 API: 이용권 없음 401 · 어댑터 없는 과정 404 · 열쇠 201개 400 · 배열 아님 400 · 준 5개 중 열린 ${items12[0].key} · ${items12[1].key} 만 데이터(잠긴 TOPIC 2 · 없는 열쇠 0) · 묻지 않은 문항 글 ${unasked.length}개 중 0`,
    noLicence.status === 401 && noAdapter.status === 404 && tooMany.status === 400 && notList.status === 400 && okItems.status === 200 &&
      gotKeys.join(",") === [items12[0].key, items12[1].key].sort().join(",") && unaskedSeen.length === 0 && unasked.length > 0,
    `${noLicence.status} · ${noAdapter.status} · ${tooMany.status} · ${notList.status} · ${okItems.status} [${gotKeys.join(",")}] · 묻지 않은 글 ${unaskedSeen.length}`);

  // ── the device side: record.ts · sync.ts · passoffLearning.ts on a stand-in localStorage, fetch into the real routes ──
  const box = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (box.has(k) ? box.get(k) : null),
      setItem: (k, v) => void box.set(k, String(v)),
      removeItem: (k) => void box.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  global.CustomEvent = class {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  };
  let deviceSession = null;
  let offline = false;
  global.fetch = async (url, init = {}) => {
    if (offline) throw new TypeError("offline");
    const p = new URL(url, "http://local").pathname;
    const m = p.match(/^\/api\/learning\/([^/]+)(\/items)?$/);
    if (!m) throw new Error(`fetch outside the learning API: ${p}`);
    SESSION = deviceSession;
    const request = new Request(`http://local${p}`, { method: init.method || "GET", headers: init.headers, body: init.body });
    return (m[2] ? itemsRoute.POST : route.POST)(request, { params: Promise.resolve({ course: decodeURIComponent(m[1]) }) });
  };
  const entriesOf = (id) => reviewItemsOf(id, true).map(({ key, kind }) => ({ key, kind }));
  const lessonsIn = (rec) => Object.keys((rec && rec.lessons) || {});
  const itemsFrom = (rec, id) => Object.keys((rec && rec.items) || {}).filter((k) => k.startsWith(`${id}:`)).length;
  const settle = async (test, ms = 3000) => {
    const end = realNow() + ms;
    while (!test() && realNow() < end) await new Promise((r) => setTimeout(r, 20));
    return test();
  };
  const device = (learner) => Rec.readLearnerRecord(COURSE, learner);
  NOW = kst(D, 10);

  // L18 — one device: licence A studies and syncs, then licence B finishes a lesson there
  box.clear();
  const A = sessionFor("1Y");
  const B = sessionFor("1Y");
  const idA = licenseIdFor(A.payload.key);
  const idB = licenseIdFor(B.payload.key);
  deviceSession = A;
  PL.notePassoffLessonDone(t1[0], entriesOf(t1[0]), [], idA);
  await settle(() => lessonsIn(stored(A.payload.key)).includes(t1[0]));
  deviceSession = B;
  PL.notePassoffLessonDone(t1[1], entriesOf(t1[1]), [], idB);
  await settle(() => lessonsIn(stored(B.payload.key)).includes(t1[1]));
  const sA = stored(A.payload.key);
  const sB = stored(B.payload.key);
  check(`L18 A 가 쓰던 기기에서 B 가 ${t1[1]} 를 마침 → B 서버에 ${t1[1]} 있음 · ${t1[0]}(A 것) 0 / A 서버에 ${t1[1]} 0 · 기기에 A · B 칸 따로`,
    lessonsIn(sB).includes(t1[1]) && itemsFrom(sB, t1[0]) === 0 && lessonsIn(sA).includes(t1[0]) && itemsFrom(sA, t1[1]) === 0 &&
      itemsFrom(device(idA), t1[0]) > 0 && itemsFrom(device(idA), t1[1]) === 0 && itemsFrom(device(idB), t1[1]) > 0 && itemsFrom(device(idB), t1[0]) === 0,
    `B 서버 레슨 [${lessonsIn(sB).join(",")}] A 문항 ${itemsFrom(sB, t1[0])} · A 서버 레슨 [${lessonsIn(sA).join(",")}] B 문항 ${itemsFrom(sA, t1[1])} · 기기 A ${itemsFrom(device(idA), t1[0])}/${itemsFrom(device(idA), t1[1])} · B ${itemsFrom(device(idB), t1[1])}/${itemsFrom(device(idB), t1[0])}`);

  // L19 — before any sync (offline), A and B each finish a lesson on one device; then each goes up
  box.clear();
  const C = sessionFor("1Y");
  const G = sessionFor("1Y");
  const idC = licenseIdFor(C.payload.key);
  const idG = licenseIdFor(G.payload.key);
  offline = true;
  PL.notePassoffLessonDone(t1[0], entriesOf(t1[0]), [], idC);
  PL.notePassoffLessonDone(t1[1], entriesOf(t1[1]), [], idG);
  await new Promise((r) => setTimeout(r, 50));
  offline = false;
  deviceSession = G;
  await Sync.syncLearnerRecord(COURSE, idG);
  deviceSession = C;
  await Sync.syncLearnerRecord(COURSE, idC);
  const sG = stored(G.payload.key);
  const sC = stored(C.payload.key);
  check(`L19 첫 동기화 전 한 기기에서 C 는 ${t1[0]} · G 는 ${t1[1]} → G 서버에 ${t1[0]} 0 · C 서버에 ${t1[1]} 0 · 각자 자기 레슨은 있음`,
    itemsFrom(sG, t1[1]) > 0 && itemsFrom(sG, t1[0]) === 0 && itemsFrom(sC, t1[0]) > 0 && itemsFrom(sC, t1[1]) === 0,
    `G 서버 ${itemsFrom(sG, t1[1])}/${itemsFrom(sG, t1[0])} · C 서버 ${itemsFrom(sC, t1[0])}/${itemsFrom(sC, t1[1])}`);

  // L19b — the session is another licence (M) than the record the device sends (L)
  box.clear();
  const L = sessionFor("1Y");
  const M = sessionFor("1Y");
  const idL = licenseIdFor(L.payload.key);
  deviceSession = M;
  await sync(M, deviceRecord([t1[1]], yesterday), licenseIdFor(M.payload.key)); // M's own record on the server
  offline = true;
  PL.notePassoffLessonDone(t1[0], entriesOf(t1[0]), [], idL);
  offline = false;
  const cross = await Sync.syncLearnerRecord(COURSE, idL);
  const sM = stored(M.payload.key);
  check(`L19b 세션은 M 인데 기기가 L 칸(${t1[0]})을 보냄 → taken false · M 서버에 ${t1[0]} 0 · 기기 L 칸 그대로(${t1[1]} 안 섞임) · M 의 답은 M 칸에`,
    cross.ok && cross.answer.taken === false && itemsFrom(sM, t1[0]) === 0 && itemsFrom(device(idL), t1[0]) > 0 && itemsFrom(device(idL), t1[1]) === 0 &&
      itemsFrom(device(licenseIdFor(M.payload.key)), t1[1]) > 0,
    `taken ${cross.ok && cross.answer.taken} · M 서버 ${t1[0]} ${itemsFrom(sM, t1[0])} · L 칸 ${itemsFrom(device(idL), t1[0])}/${itemsFrom(device(idL), t1[1])} · M 칸 ${itemsFrom(device(licenseIdFor(M.payload.key)), t1[1])}`);

  // L20 — a free lesson studied with no licence goes with the first licence only
  box.clear();
  const F1 = sessionFor("STU1Y");
  const F2 = sessionFor("STU1Y");
  PL.notePassoffLessonDone(t1[1], reviewItemsOf(t1[1], false).map(({ key, kind }) => ({ key, kind })), [], null);
  deviceSession = F1;
  await Sync.syncLearnerRecord(COURSE, licenseIdFor(F1.payload.key));
  deviceSession = F2;
  await Sync.syncLearnerRecord(COURSE, licenseIdFor(F2.payload.key));
  const f1 = stored(F1.payload.key);
  const f2 = stored(F2.payload.key);
  check(`L20 이용권 없이 마친 ${t1[1]} → 처음 올린 이용권에 합쳐짐 · 무료 칸 비움 · 다음 이용권에는 안 감`,
    itemsFrom(f1, t1[1]) > 0 && itemsFrom(device(null), t1[1]) === 0 && itemsFrom(f2, t1[1]) === 0,
    `첫 이용권 ${itemsFrom(f1, t1[1])} · 무료 칸 ${itemsFrom(device(null), t1[1])} · 다음 이용권 ${itemsFrom(f2, t1[1])}`);

  // L21 — a lesson finished with a licence goes up at once; a new, empty device gets its review the next day
  box.clear();
  const N = sessionFor("1Y");
  const idN = licenseIdFor(N.payload.key);
  deviceSession = N;
  PL.notePassoffLessonDone(t1[1], entriesOf(t1[1]), [], idN);
  const upNow = await settle(() => itemsFrom(stored(N.payload.key), t1[1]) > 0);
  box.clear(); // another phone
  NOW = kst(Day.addDays(D, 1), 10);
  const otherPhone = await Sync.syncLearnerRecord(COURSE, idN, { planOnly: true });
  const nextPlan = otherPhone.ok ? otherPhone.answer.plan.items.filter((i) => i.key.startsWith(`${t1[1]}:`)).length : -1;
  check(`L21 이용권으로 ${t1[1]} 를 마치면 바로 서버에 · 빈 새 기기가 다음 날 물으면 계획에 그 문항 ${items12.length}개 중 ${nextPlan}개(문항 데이터 없이)`,
    upNow && otherPhone.ok && nextPlan > 0 && Object.keys(otherPhone.answer.items).length === 0 && itemsFrom(device(idN), t1[1]) > 0,
    `바로 올라감 ${upNow} · 다음 날 계획 ${nextPlan} · 데이터 ${otherPhone.ok && Object.keys(otherPhone.answer.items).length} · 새 기기 칸 ${itemsFrom(device(idN), t1[1])}`);

  // L22 — the free list line counts the free review's items alone (a device whose licence ended)
  const withPaid = E.emptyRecord(COURSE);
  E.applyLessonDone(withPaid, t1[0], yesterday, entriesOf(t1[0]));
  const freeSet = new Set(Object.keys(free));
  const freeRec = PL.passoffFreeRecord(withPaid, freeSet);
  const planFree = E.planDay(freeRec, D, PROFILE);
  const paidInPlan = planFree.items.filter((i) => paidAll.includes(i.key)).length;
  const paidTomorrow = E.planDay(freeRec, Day.addDays(D, 1), PROFILE).items.filter((i) => paidAll.includes(i.key)).length;
  const paidIn = Object.keys(withPaid.items).filter((k) => paidAll.includes(k)).length;
  check(`L22 무료 계산: 유료 보충 문항 ${paidIn}개가 든 ${t1[0]} 기록 → 무료 계획 ${planFree.items.length}개 중 유료 0 · 내일 수에도 0`,
    paidIn > 0 && planFree.items.length > 0 && paidInPlan === 0 && paidTomorrow === 0 && planFree.items.every((i) => freeSet.has(i.key)),
    `기록의 유료 ${paidIn} · 계획 ${planFree.items.length} 중 유료 ${paidInPlan} · 내일 유료 ${paidTomorrow}`);
  NOW = null;

  for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name}  — ${x.note}`);
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${results.length}`);
  process.chdir(REPO); // Windows cannot remove the folder it is in
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
