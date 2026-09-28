#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 진도 API 가 로컬 대체 저장소로 기록 · 해금을 도는지 (설계 §5 · 코드 단계 C).
 *
 * 진짜 src/app/api/progress/passoff-grammar/route.ts 와 src/app/api/admin/passoff-progress/route.ts 의 GET · POST 를
 * 부른다(docs/qa-2026-09-18/scripts/prove-life-completion.cjs 와 같은 방법). 가짜는 셋뿐 — 이용권 확인
 * (licenseSession: 요청마다 넣는 세션), 관리자 확인(adminAuth), 'server-only'. 진도 저장 · 판정 · 과정 목록 읽기는
 * 모두 진짜 코드(passoffProgress.ts · passoffUnlock.ts · content.ts)이고, 진도는 임시 폴더의 data/passoff-progress.json
 * 에만 쓴다. R2 환경값이 하나라도 있거나 NODE_ENV=production 이면 아무것도 안 하고 멈춘다(exit 2).
 *   A1 이용권 없음 → 401            A2 새 STUDENT 이용권: TOPIC 1 만 · 대주제 수 = 과정 목록
 *   A3 잠긴 TOPIC 2 완료 → 안 남음   A3b (E2 수정) 레슨 전 구성도 → 안 남음   A4 TOPIC 1 두 개 → 남음 · 아직 1
 *   A5 마지막 레슨 → 아직 1(구성도 조건 — 단계 2-나 E2 에서 켬) → 구성도 다시 채우기 { mapRefillTopic: 1 } → TOPIC 2 열림
 *   A6 이제 TOPIC 2 완료 → 남음      A7 레슨 전부 + 구성도 전부 한 번에 → TOPIC 1 것만 · unlockedThrough 2
 *   A8 LIFE: 맨 끝 레슨 → 남음 · everyTopicOpen    A9 STULIFE: 맨 끝 레슨 → 안 남음(LIFE 만 모두 열림 — STUDENT 와 같음)
 *   A10 한 기기 1분에 120번 넘게 쓰면 429          A11 망가진 JSON → 400
 *   A12 같은 코드를 소문자로 → 같은 기록 · 저장소 data/ 에 쓴 것 없음 · 임시 파일에 코드별 한 칸
 *   A13 강의 쪽 문(page.tsx) · API · 관리자 API 의 LIFE 규칙 글자가 같음(바꾸면 모두)
 *   A14 강의 쪽 문이 쓰는 판정: 잠긴 레슨 · 잠금 화면 정보(지금 대주제 · 그 레슨마다 서버가 센 것)
 *   A15 관리자: 인증 없으면 401 · 보기 · 초기화 뒤 TOPIC 1 만 · 수동 해금(올리기만 · 없는 TOPIC 400) · LIFE 코드는
 *       '모든 TOPIC 열림'(코드 단계 C 점검 1 · 7)
 *   node docs/pass-off-grammar/검사/check-progress-api.cjs [--break=<아래 하나>]
 *     깨기는 사본만 바꿈 — 각각 FAIL(exit 1)이어야: life-as-1y(LIFE 칸에 1Y) · no-guard(잠긴 대주제 거절을 뺀 판정) ·
 *     stulife-opens(API 가 STULIFE 도 모두 여는 판) · admin-life-off(관리자가 LIFE 를 모름 — 점검 전 판) ·
 *     settopic-down(수동 해금이 내림) · map-early(레슨 전 구성도도 받음 — E2 점검 전 판)
 * exit 0 = 실패 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const Module = require("module");

const REPO = path.resolve(__dirname, "../../..");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const BREAKS = ["life-as-1y", "no-guard", "stulife-opens", "admin-life-off", "settopic-down", "map-early"];
if (BREAK && !BREAKS.includes(BREAK)) {
  console.error(`모르는 깨기: ${BREAK} — ${BREAKS.join(" · ")}`);
  process.exit(2);
}

// --- never the real store: stop when R2 values are around ---
const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"];
const present = R2_ENV.filter((k) => process.env[k]);
if (present.length || process.env.NODE_ENV === "production") {
  console.error(`멈춤: ${[...present, process.env.NODE_ENV === "production" ? "NODE_ENV=production" : ""].filter(Boolean).join(", ")} 가 설정돼 있어 진짜 진도 저장소에 쓸 수 있음`);
  process.exit(2);
}
// the admin route checks a code's checksum with LICENSE_SALT — a throwaway one, in this process only
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");

// --- the route files as they are, the licence and admin checks swapped ---
const ts = require(path.join(REPO, "node_modules/typescript"));
let SESSION = null;
let ADMIN = true;
const OVERRIDES = {
  "server-only": {},
  "@/lib/licenseSession": { verifyLicenseSession: async () => SESSION },
  "@/lib/adminAuth": { verifyAdminSession: () => ADMIN },
};
// a break changes the text of one file, in this process only
const TRANSFORM = {
  "no-guard": [path.join(REPO, "src/lib/passoffUnlock.ts"), /else if \(topic > ceiling\) refused\.push\(\{ what: lessonId/, "else if (false) refused.push({ what: lessonId"],
  "stulife-opens": [path.join(REPO, "src/app/api/progress/passoff-grammar/route.ts"), /const everyTopicOpen = session\.payload\.plan === "LIFE";/g, 'const everyTopicOpen = session.payload.plan.endsWith("LIFE");'],
  "admin-life-off": [path.join(REPO, "src/app/api/admin/passoff-progress/route.ts"), /const everyTopicOpen = checked\.plan === "LIFE";/, "const everyTopicOpen = false;"],
  "settopic-down": [path.join(REPO, "src/lib/passoffUnlock.ts"), /if \(topic <= before\) return false;/, "if (topic === before) return false;"],
  "map-early": [path.join(REPO, "src/lib/passoffUnlock.ts"), /else if \(!lessonsDone\(topic\)\) refused\.push\(\{ what, why: "not-ready" \}\);/, ""],
}[BREAK];
const cache = new Map();
function resolveSpec(spec, fromDir) {
  let p;
  if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
  else if (spec.startsWith(".")) p = path.join(fromDir, spec);
  else return null;
  for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  return p;
}
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  let text = fs.readFileSync(file, "utf8");
  if (TRANSFORM && path.resolve(TRANSFORM[0]) === file) {
    const changed = text.replace(TRANSFORM[1], TRANSFORM[2]);
    if (changed === text) {
      console.error(`깨기 ${BREAK} 가 적용되지 않음 — ${path.relative(REPO, file)} 글이 바뀌었으면 이 파일을 고칠 것`);
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
}

// content.ts takes process.cwd()/content when loaded; the store writes process.cwd()/data when called —
// load from the repository, then call from a temporary folder: nothing lands in the repository's data/.
process.chdir(REPO);
const route = load(path.join(REPO, "src/app/api/progress/passoff-grammar/route.ts"));
const admin = load(path.join(REPO, "src/app/api/admin/passoff-progress/route.ts"));
const lib = load(path.join(REPO, "src/lib/passoffProgress.ts"));
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kig-passoff-progress-"));
process.chdir(TMP);

// a code shaped like a real one, its checksum made with this run's salt
const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const checksum = crypto.createHmac("sha256", process.env.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${checksum}`;
};
let seq = 0;
const sessionFor = (plan, key = makeKey(plan)) => {
  const effective = BREAK === "life-as-1y" && plan === "LIFE" ? "1Y" : plan;
  return { payload: { key, plan: effective, deviceId: `check-${++seq}`, expiresAt: null, iat: Date.now() } };
};
async function call(handler, session, body) {
  SESSION = session;
  const init = body === undefined ? { method: "GET" } : { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) };
  const res = await handler(new Request("http://local/api/progress/passoff-grammar", init));
  return { status: res.status, data: await res.json() };
}
const get = (session) => call(route.GET, session);
const post = (session, updates) => call(route.POST, session, { updates: updates.map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() })) });
/** a topic's "구성도 다시 채우기" (단계 2-나 E2 — the map page sends it; since then the topic's last condition) */
const postMap = (session, topics) => call(route.POST, session, { updates: topics.map((mapRefillTopic) => ({ mapRefillTopic })) });

const results = [];
const check = (name, ok, note) => results.push({ name, ok: Boolean(ok), note });

(async () => {
  const t0 = Date.now();
  const topics = index.groups.map((g) => g.lessons);
  const allIds = topics.flat();
  const firstTopic = topics[0];
  const secondTopic = topics[1];
  const lastTopic = topics[topics.length - 1];
  const deepest = lastTopic[lastTopic.length - 1];

  // A1
  const n1 = await get(null);
  const n2 = await call(route.POST, null, { updates: [{ lessonId: firstTopic[0], completed: true }] });
  check("A1 이용권 없음 → 401 (GET · POST)", n1.status === 401 && n2.status === 401, `${n1.status} · ${n2.status}`);

  // A2 ~ A6: one STUDENT pass, lesson by lesson
  const stu = sessionFor("STU1Y");
  let r = await get(stu);
  check("A2 새 STUDENT 이용권: TOPIC 1 만 · 대주제 수 = 과정 목록", r.status === 200 && r.data.progress.unlockedThrough === 1 && r.data.progress.topics.length === topics.length && r.data.progress.everyTopicOpen === false,
    `${r.status} unlockedThrough=${r.data.progress && r.data.progress.unlockedThrough} 대주제 ${r.data.progress && r.data.progress.topics.length}/${topics.length}`);
  r = await post(stu, [secondTopic[0]]);
  check(`A3 잠긴 TOPIC 2 의 ${secondTopic[0]} 완료 → 안 남음`, r.status === 200 && !r.data.progress.lessons[secondTopic[0]] && r.data.progress.unlockedThrough === 1, `${secondTopic[0]}=${JSON.stringify(r.data.progress.lessons[secondTopic[0]] || null)}`);
  // A3b (E2 수정) the map is the topic's end: sent before TOPIC 1's lessons it is not taken
  r = await postMap(stu, [1]);
  check("A3b 레슨 전 구성도 다시 채우기 { mapRefillTopic: 1 } → 안 남음(TOPIC 1 레슨을 마친 뒤에만)", r.status === 200 && r.data.progress.topics[0].mapRefilled === false && r.data.progress.unlockedThrough === 1,
    `mapRefilled=${r.data.progress && r.data.progress.topics[0].mapRefilled} · unlockedThrough=${r.data.progress && r.data.progress.unlockedThrough}`);
  r = await post(stu, firstTopic.slice(0, -1));
  check(`A4 TOPIC 1 의 ${firstTopic.length - 1}개 → 남음 · 아직 TOPIC 1`, firstTopic.slice(0, -1).every((id) => r.data.progress.lessons[id] && r.data.progress.lessons[id].completed) && r.data.progress.unlockedThrough === 1,
    `남은 ${Object.keys(r.data.progress.lessons).length} · unlockedThrough=${r.data.progress.unlockedThrough}`);
  r = await post(stu, [firstTopic[firstTopic.length - 1]]);
  const beforeMap = r.data.progress.unlockedThrough;
  const mapRequired = r.data.progress.mapRefillRequired;
  r = await postMap(stu, [1]);
  check("A5 TOPIC 1 마지막 레슨 → 아직 TOPIC 1(구성도 조건 켬) → 구성도 다시 채우기 → TOPIC 2 열림",
    mapRequired === true && beforeMap === 1 && r.data.progress.unlockedThrough === 2 && r.data.progress.topics[0].complete && r.data.progress.topics[0].mapRefilled && r.data.progress.topics[1].unlocked,
    `구성도 조건 ${mapRequired} · 레슨만 ${beforeMap} → 구성도 뒤 unlockedThrough=${r.data.progress.unlockedThrough}`);
  r = await post(stu, [secondTopic[0]]);
  check(`A6 이제 ${secondTopic[0]} 완료 → 남음`, Boolean(r.data.progress.lessons[secondTopic[0]] && r.data.progress.lessons[secondTopic[0]].completed), JSON.stringify(r.data.progress.lessons[secondTopic[0]] || null));

  // A7 every id at once, and every topic's map refill
  const y = sessionFor("1Y");
  r = await call(route.POST, y, {
    updates: [
      ...allIds.map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() })),
      ...topics.map((_, i) => ({ mapRefillTopic: i + 1 })),
    ],
  });
  const beyond = Object.keys(r.data.progress.lessons).filter((id) => !firstTopic.includes(id));
  const mapsTaken = r.data.progress.topics.filter((t) => t.mapRefilled).map((t) => t.topic);
  check(`A7 레슨 ${allIds.length}개 + 구성도 ${topics.length}개 한 번에 → TOPIC 1 것만 남음 · unlockedThrough 2`,
    r.data.progress.unlockedThrough === 2 && beyond.length === 0 && mapsTaken.join() === "1",
    `unlockedThrough=${r.data.progress.unlockedThrough} · TOPIC 2 이후 ${beyond.length} · 구성도 ${mapsTaken.join(",")}`);

  // A8 LIFE · A9 STULIFE
  const life = sessionFor("LIFE");
  r = await post(life, [deepest]);
  const lifeGet = await get(life);
  check(`A8 LIFE: ${deepest} → 남음 · everyTopicOpen`, Boolean(r.data.progress.lessons[deepest]) && lifeGet.data.progress.everyTopicOpen === true, `${deepest}=${JSON.stringify(r.data.progress.lessons[deepest] || null)} everyTopicOpen=${lifeGet.data.progress.everyTopicOpen}`);
  const stulife = sessionFor("STULIFE");
  r = await post(stulife, [deepest]);
  check(`A9 STULIFE: ${deepest} → 안 남음`, !r.data.progress.lessons[deepest] && r.data.progress.everyTopicOpen === false, `${deepest}=${JSON.stringify(r.data.progress.lessons[deepest] || null)}`);

  // A10 rate limit
  const busy = sessionFor("STU1Y");
  let lastOk = 0;
  let limited = null;
  for (let i = 1; i <= 125; i++) {
    const x = await call(route.POST, busy, { updates: [] });
    if (x.status === 200) lastOk = i;
    else if (x.status === 429 && limited === null) limited = i;
  }
  check("A10 한 기기 1분에 120번까지 · 121번째 429", lastOk === 120 && limited === 121, `마지막 200 = ${lastOk}번째 · 첫 429 = ${limited}번째`);

  // A11
  const bad = await call(route.POST, sessionFor("STU1Y"), "{not json");
  check("A11 망가진 JSON → 400", bad.status === 400, bad.status);

  // A12 one record per code — the same code in lower case is the same record
  const lower = { payload: { ...stu.payload, key: stu.payload.key.toLowerCase(), deviceId: "check-lower" } };
  r = await get(lower);
  check("A12a 같은 코드를 소문자로 → 같은 기록(unlockedThrough 2)", r.data.progress.unlockedThrough === 2, `unlockedThrough=${r.data.progress.unlockedThrough}`);
  const file = path.join(TMP, "data", "passoff-progress.json");
  const stored = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  check("A12b 임시 폴더 data/passoff-progress.json 에 코드별 한 칸(STU1Y · 1Y · LIFE — STULIFE · 요청만 보낸 기기는 바뀐 게 없어 안 씀)", Object.keys(stored).length === 3 && Boolean(stored[stu.payload.key]), `칸 ${Object.keys(stored).length}`);
  const repoFile = path.join(REPO, "data", "passoff-progress.json");
  const leak = fs.existsSync(repoFile) && fs.statSync(repoFile).mtimeMs >= t0;
  check("A12c 저장소 data/ 에 쓴 것 없음", !leak, leak ? "저장소의 data/passoff-progress.json 이 이번에 바뀜" : "임시 폴더에만 씀");

  // A13 the lesson route, the API and the admin API open everything for the same plan
  const gate = fs.readFileSync(path.join(REPO, "src/app/passoff-grammar/[lesson]/page.tsx"), "utf8");
  const api = fs.readFileSync(path.join(REPO, "src/app/api/progress/passoff-grammar/route.ts"), "utf8");
  const adminSource = fs.readFileSync(path.join(REPO, "src/app/api/admin/passoff-progress/route.ts"), "utf8");
  const RULE = 'const everyTopicOpen = session.payload.plan === "LIFE";';
  const ADMIN_RULE = 'const everyTopicOpen = checked.plan === "LIFE";';
  const apiCount = api.split(RULE).length - 1;
  check("A13 강의 쪽 문 · API · 관리자 API 의 LIFE 규칙 글자 같음", gate.includes(RULE) && apiCount === 2 && adminSource.includes(ADMIN_RULE),
    `page.tsx ${gate.includes(RULE) ? "있음" : "없음"} · route.ts ${apiCount}/2 · 관리자 ${adminSource.includes(ADMIN_RULE) ? "있음" : "없음"} — 한쪽을 바꾸면 모두`);

  // A14 what the lesson route asks
  const rec = await lib.getPassoffProgress(stu.payload.key);
  const third = topics[2] ? topics[2][0] : null;
  const info = third ? lib.passoffLockInfo(third, rec) : null;
  check("A14a 강의 쪽 문: TOPIC 2 열림 · TOPIC 3 잠김", lib.isPassoffLessonUnlocked(secondTopic[1] || secondTopic[0], rec) && (!third || !lib.isPassoffLessonUnlocked(third, rec)), third || "(TOPIC 3 없음)");
  const cur = info && info.current;
  check(
    "A14b 잠금 화면 정보: TOPIC 3 은 TOPIC 2 를 마치면 · 지금 대주제 TOPIC 2 — 레슨마다 제목 · 서버가 센 것(첫 레슨만 셈 · 마지막 미완료)",
    !info ||
      (info.topic === 3 && info.previousTopic === 2 && cur && cur.topic === 2 && cur.sectionIndex === 1 &&
        cur.lessons.map((l) => l.id).join() === secondTopic.join() &&
        cur.lessons.every((l) => typeof l.title === "string" && l.title && l.title !== l.id) &&
        cur.lessons.map((l) => l.completed).join() === secondTopic.map((id, i) => i === 0).join() &&
        cur.requiredCount === Math.ceil(secondTopic.length * 0.8)),
    JSON.stringify(cur && { topic: cur.topic, need: cur.requiredCount, lessons: cur.lessons.map((l) => `${l.id}:${l.completed ? "셈" : "아직"}:${l.title}`) }),
  );

  // A15 admin
  ADMIN = false;
  const a0 = await call(admin.POST, null, { key: stu.payload.key });
  ADMIN = true;
  const a1 = await call(admin.POST, null, { key: stu.payload.key });
  const a2 = await call(admin.POST, null, { key: stu.payload.key, action: "reset" });
  const after = await get(stu);
  const a3 = await call(admin.POST, null, { key: "KIG-STU1Y-0000000000000000-0000000000000000" });
  check("A15a 관리자 인증 없음 → 401 · 틀린 코드 → 400", a0.status === 401 && a3.status === 400, `${a0.status} · ${a3.status}`);
  check("A15b 관리자 보기: TOPIC 2 까지 · 완료 4 · 대주제 표", a1.status === 200 && a1.data.progress.unlockedThrough === 2 && a1.data.progress.completedLessons === firstTopic.length + 1 && a1.data.progress.topics.length === topics.length && a1.data.progress.totalLessons === allIds.length,
    JSON.stringify(a1.data.progress && { u: a1.data.progress.unlockedThrough, c: a1.data.progress.completedLessons, t: a1.data.progress.totalLessons, last: a1.data.progress.lastLessonId }));
  check("A15c 관리자 초기화 → TOPIC 1 만 · 완료 0 · 학습자 쪽도 1", a2.data.progress.unlockedThrough === 1 && a2.data.progress.completedLessons === 0 && after.data.progress.unlockedThrough === 1 && Object.keys(after.data.progress.lessons).length === 0,
    `admin ${a2.data.progress.unlockedThrough}/${a2.data.progress.completedLessons} · 학습자 ${after.data.progress.unlockedThrough}`);

  // A15d the owner's manual open (점검 1 — to give back what a reset or a lost write took): up only, listed topics only
  const up = await call(admin.POST, null, { key: stu.payload.key, action: "setTopic", topic: 3 });
  const learnerUp = await get(stu);
  const down = await call(admin.POST, null, { key: stu.payload.key, action: "setTopic", topic: 2 });
  const learnerDown = await get(stu);
  const unknown = await call(admin.POST, null, { key: stu.payload.key, action: "setTopic", topic: 99 });
  const rec3 = await lib.getPassoffProgress(stu.payload.key);
  check(
    "A15d 관리자 수동 해금: TOPIC 3 까지 → 학습자도 3 · pg03 열림 · 2 로 내리기는 안 됨(3 그대로) · 없는 TOPIC 99 → 400",
    up.status === 200 && up.data.progress.unlockedThrough === 3 && learnerUp.data.progress.unlockedThrough === 3 &&
      (!third || lib.isPassoffLessonUnlocked(third, rec3)) &&
      down.status === 200 && down.data.progress.unlockedThrough === 3 && learnerDown.data.progress.unlockedThrough === 3 &&
      unknown.status === 400,
    `올림 ${up.status}/${up.data.progress && up.data.progress.unlockedThrough} · 학습자 ${learnerUp.data.progress.unlockedThrough} · 내림 ${down.data.progress && down.data.progress.unlockedThrough} · 학습자 ${learnerDown.data.progress.unlockedThrough} · 99 → ${unknown.status}`,
  );

  // A15e a LIFE code on the admin panel: every topic open (it said 'TOPIC 1까지 열림' — 점검 7)
  const lifeView = await call(admin.POST, null, { key: life.payload.key });
  const stuView = await call(admin.POST, null, { key: stulife.payload.key });
  check(
    "A15e 관리자 보기: LIFE 코드는 everyTopicOpen · 모든 대주제 열림 / STULIFE 는 아님(TOPIC 1 만)",
    lifeView.status === 200 && lifeView.data.progress.everyTopicOpen === true && lifeView.data.progress.topics.every((t) => t.unlocked) &&
      stuView.data.progress.everyTopicOpen === false && stuView.data.progress.topics.filter((t) => t.unlocked).length === 1,
    `LIFE ${lifeView.data.progress && lifeView.data.progress.everyTopicOpen} · 열림 ${lifeView.data.progress && lifeView.data.progress.topics.filter((t) => t.unlocked).length}/${topics.length} · STULIFE ${stuView.data.progress && stuView.data.progress.topics.filter((t) => t.unlocked).length}`,
  );

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
