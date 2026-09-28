#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 대주제 순서 잠금의 순수 판정 함수 단위 시험 (설계 §5 · 코드 단계 C).
 *
 * src/lib/passoffUnlock.ts 를 단독 트랜스파일해서 부른다(import 는 공통 엔진의 src/lib/learning/day.ts 하나 —
 * 이것도 같이 트랜스파일). 기대값은 이 파일이 따로 계산한다(80% 는 정수 식 ceil(4n/5) = floor((4n+4)/5)).
 *   U1  80% 경계 — 대주제 크기 1~12 × 완료 수 0~n × 마지막 레슨 포함/제외, 실제 과정 목록의 대주제(3 · 4 · 5개)
 *   U2  마지막 레슨 — 80% 를 넘겨도 마지막 레슨이 없으면 잠김
 *   U3  LIFE — 모든 대주제 열림 · 어느 대주제 기록이든 받음(아니면 거절)
 *   U4  줄지 않음 — 저장된 unlockedThrough 아래로 안 내려감 · 레슨이 늘어 앞 대주제가 미완료가 돼도 그대로 ·
 *       저장값에서 사슬을 이어 감(STUDENT 는 1장부터 세어 저장값의 장을 마쳐도 다음 장이 안 열림 — 그 버릇은 안 옮김)
 *   U5  도달 불가 대주제 기록 거부 — 잠긴 대주제의 완료 · 구성도 기록 거절, 레슨 29개를 한 번에 보내도 한 요청에 한 대주제만,
 *       모르는 id · 완료가 아닌 기록 거절, 한 요청 100개까지
 *   U6  날짜 경계 — 날은 서버 시각의 한국시간 오전 4시 경계(03:59:59.999 KST = 전날, 04:00 = 그날) · 브라우저 시각은
 *       날을 정하지 않음 · 첫 완료 날 유지 · 브라우저 시각은 서버 시각 + 60초까지만
 *   U7  구성도 다시 채우기 설정 — 켠 판과 끈 판 둘 다 · 출시 설정값(0.8 · 구성도 조건 켬 — 단계 2-나 E2 에서 켬) · 스위치는
 *       양쪽으로 묶임: src/ 에서 진도 파일 밖이 구성도 기록(recordPassoffMapRefill · mapRefillTopic)을 부르면 requireMapRefill 이
 *       true 여야, 아무도 안 부르면 false 여야(코드 단계 C 점검 10) · 출시 판(기본 규칙)으로 레슨을 다 마쳐도 구성도가 없으면 잠김
 *   U1 ~ U5 · U11 · U13 은 레슨 조건을 보는 칸이라 기록에 모든 대주제의 구성도를 넣고(recordWith 기본값) 쓰기 길에는 구성도 기록을
 *   같이 보낸다 — 출시 판(구성도 켬) 규칙 그대로 레슨 조건을 잰다
 *   U8  저장된 기록 다듬기 — 망가진 값 · 모르는 id · 범위 밖 대주제 · 없는 날짜('2026-02-30' · '2026-13-99') 버림
 *   U9  과정 목록 → 대주제 — 실제 content/courses/passoff-grammar.json 을 이 파일이 따로 묶은 것과 같게
 *   U10 필요 레슨 수 — 0.8·15 같은 곱이 올림으로 튀지 않음
 *   U11 브라우저에 주는 모양 — 레슨마다 completed · updatedAt · day 만 · LIFE 는 모든 대주제 unlocked
 *   U12 대주제 번호 뒤 조사 — TOPIC 1~20 을 한국어로 읽은 끝소리(이 파일이 따로 적은 '일 이 삼 …')로 을/를 · 이/가 · 은/는
 *   U13 관리자 수동 해금 — 올리기만 · 목록에 있는 대주제만 · 이미 끝난 대주제면 다음까지 · 시각
 *
 *   node docs/pass-off-grammar/검사/check-unlock.cjs                    # exit 0 = 모두 PASS
 *   node docs/pass-off-grammar/검사/check-unlock.cjs --break=ratio70    # 0.8 → 0.7 로 바꾼 사본 — FAIL(exit 1)이어야
 *   node docs/pass-off-grammar/검사/check-unlock.cjs --prove-breaks     # 아래 깨기 전부가 exit 1 이고 안 깬 판은 exit 0 인지
 *
 * 깨기(사본만 바꿈 — 저장소 파일은 그대로): ratio70 · no-last · reach · decrease · life · day0 · client-clock · map-ignored ·
 * chain-from-1 · shape-day(날짜 모양만 봄 — 점검 전 판) · particle(0 을 받침 없음으로) · raise-down(수동 해금이 내림) ·
 * life-unlocked(LIFE 모양에서 잠김) · map-no-caller(구성도 기록을 부르는 곳이 없어진 것처럼 — 스위치는 켜진 채) ·
 * map-off(부르는 곳이 있는데 스위치를 끔 — 단계 2-나 E2 전의 판). E2 전의 map-caller · map-on 은 스위치를 켠 뒤 뜻이 없어져
 * 이 둘로 바꿈
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const MODULE = path.join(REPO, "src", "lib", "passoffUnlock.ts");
const DAY_MODULE = path.join(REPO, "src", "lib", "learning", "day.ts");
const INDEX = path.join(REPO, "content", "courses", "passoff-grammar.json");

const BREAKS = {
  ratio70: { file: "unlock", from: /ratio: 0\.8,/, to: "ratio: 0.7," },
  "no-last": { file: "unlock", from: /(\n\s*)lastLessonCompleted &&(\r?\n)/, to: "$1true &&$2" },
  reach: { file: "unlock", from: /else if \(topic > ceiling\) refused\.push\(\{ what: lessonId/, to: "else if (false) refused.push({ what: lessonId" },
  decrease: {
    file: "unlock",
    from: /record\.unlockedThrough = Math\.max\(clampPassoffTopic\(record\.unlockedThrough\), judgePassoffTopics\(record, topics, rule\)\.unlockedThrough\);/,
    to: "record.unlockedThrough = judgePassoffTopics({ ...record, unlockedThrough: 1 }, topics, rule).unlockedThrough;",
  },
  life: { file: "unlock", from: /const ceiling = everyTopicOpen \? Number\.POSITIVE_INFINITY : /, to: "const ceiling = " },
  day0: { file: "day", from: /const SHIFT_MS = \(9 - 4\) \* 3_600_000;/, to: "const SHIFT_MS = 9 * 3_600_000;" },
  "client-clock": { file: "unlock", from: /const day = learningDay\(now\);/, to: "const day = learningDay(Number(updates[0]?.clientUpdatedAt) || now);" },
  "map-ignored": { file: "unlock", from: /\(!rule\.requireMapRefill \|\| mapRefilled\)/, to: "true" },
  "chain-from-1": {
    file: "unlock",
    from: /let open = Math\.max\(topics\.length \? topics\[0\]\.topic : 1, clampPassoffTopic\(record\.unlockedThrough\)\);/,
    to: "let open = topics.length ? topics[0].topic : 1;",
  },
  // the check's version before 점검 8: the shape of a date only
  "shape-day": {
    file: "unlock",
    from: /import \{ isDay, learningDay \} from "\.\/learning\/day";/,
    to: 'import { learningDay } from "./learning/day";\nconst isDay = (value: unknown): value is string => typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(value);',
  },
  particle: { file: "unlock", from: /\[1, 3, 6, 7, 8, 0\]\.includes\(lastDigit\)/, to: "[1, 3, 6, 7, 8].includes(lastDigit)" },
  "raise-down": { file: "unlock", from: /if \(topic <= before\) return false;/, to: "if (topic === before) return false;" },
  "life-unlocked": { file: "unlock", from: /unlocked: everyTopicOpen \|\| t\.topic <= unlockedThrough/, to: "unlocked: t.topic <= unlockedThrough" },
  "map-no-caller": { file: "scan" },
  "map-off": { file: "unlock", from: /requireMapRefill: true,/, to: "requireMapRefill: false," },
};

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=").slice(1).join("=");

if (process.argv.includes("--prove-breaks")) {
  const rows = [];
  const run = (extra) => spawnSync(process.execPath, [__filename, ...extra], { encoding: "utf8" });
  const clean = run([]);
  rows.push({ run: "(깨지 않음)", exit: clean.status, want: 0, ok: clean.status === 0, last: lastLine(clean.stdout) });
  for (const name of Object.keys(BREAKS)) {
    const r = run([`--break=${name}`]);
    rows.push({ run: `--break=${name}`, exit: r.status, want: 1, ok: r.status === 1, last: lastLine(r.stdout || r.stderr) });
  }
  console.table(rows);
  const bad = rows.filter((r) => !r.ok);
  console.log(bad.length ? `FAIL — 기대와 다른 판 ${bad.length}` : `PASS — 안 깬 판 exit 0 · 깨기 ${rows.length - 1}가지 모두 exit 1`);
  process.exit(bad.length ? 1 : 0);
}

function lastLine(text) {
  return String(text || "").trim().split(/\r?\n/).pop();
}

// ---- load the module (and, for a break, a changed copy) ------------------------------------------
const breakName = arg("break");
if (breakName && !BREAKS[breakName]) {
  console.error(`모르는 깨기: ${breakName} — ${Object.keys(BREAKS).join(" · ")}`);
  process.exit(2);
}
function sourceOf(which) {
  const text = fs.readFileSync(which === "day" ? DAY_MODULE : MODULE, "utf8");
  const b = BREAKS[breakName];
  if (!b || b.file !== which) return text;
  const changed = text.replace(b.from, b.to);
  if (changed === text) {
    console.error(`깨기 ${breakName} 가 적용되지 않음 — 원본 글이 바뀌었으면 이 파일의 BREAKS 를 고칠 것`);
    process.exit(2);
  }
  return changed;
}
function load(text, fileName, requireFn) {
  const js = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName,
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, requireFn);
  return mod.exports;
}
const dayModule = load(sourceOf("day"), DAY_MODULE, () => ({}));
const U = load(sourceOf("unlock"), MODULE, (spec) => {
  if (spec === "./learning/day") return dayModule;
  throw new Error(`passoffUnlock.ts 가 새 import 를 가짐: ${spec} — 이 검사는 단독 트랜스파일을 전제로 함`);
});

// ---- helpers ----------------------------------------------------------------------------------------
const NOW = Date.UTC(2026, 8, 27, 3, 0, 0); // 2026-09-27 12:00 KST
const pad = (n) => String(n).padStart(2, "0");
const topicOf = (t, n) => ({ topic: t, label: `TOPIC ${t}`, lessonIds: Array.from({ length: n }, (_, i) => `pg${pad(t)}-${i + 1}`) });
const needed = (n) => Math.max(1, Math.floor((4 * n + 4) / 5)); // ceil(0.8·n), in integers
/** every topic's "구성도 다시 채우기" done — the cases about the lessons keep the release rule (map refill on) and judge the lessons */
const allMaps = () => Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), { at: new Date(NOW).toISOString(), day: "2026-09-27" }]));
function recordWith(ids, extra = {}) {
  const r = U.emptyPassoffRecord(NOW);
  r.mapRefills = allMaps();
  for (const id of ids) r.lessons[id] = { completed: true, updatedAt: NOW, at: new Date(NOW).toISOString(), day: "2026-09-27" };
  return Object.assign(r, extra);
}
/** the map refills of these topics, as the browser sends them (the write path) */
const mapUpdates = (topics) => topics.map((t) => ({ mapRefillTopic: t.topic }));
const lessonsOnly = (accepted) => accepted.filter((what) => !what.startsWith("map:"));
const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const REAL = U.passoffTopicsFromGroups(index.groups);
const realTopic = (t) => REAL.find((x) => x.topic === t);

/**
 * Code in src/ that records a map refill — calls recordPassoffMapRefill or sends mapRefillTopic — outside the files
 * that define and carry the record (the rules, the store, the progress API). "path:line" each.
 */
function mapRefillCallers() {
  const carriers = new Set(
    ["src/lib/passoffUnlock.ts", "src/lib/passoffProgress.ts", "src/app/api/progress/passoff-grammar/route.ts"].map((p) => path.join(REPO, p)),
  );
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name) && !carriers.has(full)) {
        fs.readFileSync(full, "utf8").split(/\r?\n/).forEach((line, i) => {
          if (/\brecordPassoffMapRefill\b|\bmapRefillTopic\b/.test(line)) found.push(`${path.relative(REPO, full).replace(/\\/g, "/")}:${i + 1}`);
        });
      }
    }
  };
  walk(path.join(REPO, "src"));
  return found;
}

const groups = [];
let current = null;
function group(name) {
  current = { name, cases: 0, fails: [] };
  groups.push(current);
}
function check(ok, what) {
  current.cases++;
  if (!ok) current.fails.push(what);
}

// ---- U1 80% 경계 --------------------------------------------------------------------------------------
group("U1 80% 경계");
for (let n = 1; n <= 12; n++) {
  const topics = [topicOf(1, n), topicOf(2, 3)];
  const ids = topics[0].lessonIds;
  const last = ids[ids.length - 1];
  const others = ids.slice(0, -1);
  check(U.passoffRequiredCount(n) === needed(n), `n=${n}: requiredCount ${U.passoffRequiredCount(n)} ≠ ${needed(n)}`);
  for (let k = 0; k <= n; k++) {
    // k lessons done, the last among them
    if (k >= 1) {
      const done = [last, ...others.slice(0, k - 1)];
      const j = U.judgePassoffTopics(recordWith(done), topics);
      const want = k >= needed(n);
      check(j.unlockedThrough === (want ? 2 : 1) && j.topics[0].complete === want, `n=${n} k=${k} 마지막 포함: unlockedThrough ${j.unlockedThrough} (기대 ${want ? 2 : 1})`);
    }
    // k lessons done, the last NOT among them
    if (k <= n - 1) {
      const j = U.judgePassoffTopics(recordWith(others.slice(0, k)), topics);
      check(j.unlockedThrough === 1 && !j.topics[0].complete, `n=${n} k=${k} 마지막 빠짐: unlockedThrough ${j.unlockedThrough} (기대 1)`);
    }
  }
}
// the real course's topics (book 1: 3, 4 and 5 lessons)
for (const size of [3, 4, 5]) {
  const t = REAL.find((x) => x.lessonIds.length === size);
  if (!t) {
    check(false, `실제 과정 목록에 레슨 ${size}개인 대주제가 없음`);
    continue;
  }
  const next = REAL.find((x) => x.topic > t.topic);
  const last = t.lessonIds[t.lessonIds.length - 1];
  const below = [last, ...t.lessonIds.slice(0, needed(size) - 2)]; // one short of 80%, the last included
  const at = [last, ...t.lessonIds.slice(0, needed(size) - 1)];
  const reached = recordWith(at, { unlockedThrough: t.topic });
  const short = recordWith(below, { unlockedThrough: t.topic });
  const jBelow = U.judgePassoffTopics(short, REAL);
  const jAt = U.judgePassoffTopics(reached, REAL);
  check(jBelow.unlockedThrough === t.topic, `TOPIC ${t.topic}(${size}개): ${below.length}개면 잠김이어야 — ${jBelow.unlockedThrough}`);
  check(!next || jAt.unlockedThrough === next.topic, `TOPIC ${t.topic}(${size}개): ${at.length}개(마지막 포함)면 TOPIC ${next && next.topic} 열림이어야 — ${jAt.unlockedThrough}`);
}

// ---- U2 마지막 레슨 ---------------------------------------------------------------------------------------
group("U2 마지막 레슨");
{
  const t = realTopic(4) || topicOf(4, 5);
  const topics = [realTopic(1) || topicOf(1, 3), realTopic(2) || topicOf(2, 3), realTopic(3) || topicOf(3, 3), t, realTopic(5) || topicOf(5, 4)];
  const allButLast = t.lessonIds.slice(0, -1);
  const j1 = U.judgePassoffTopics(recordWith(allButLast, { unlockedThrough: 4 }), topics);
  check(j1.unlockedThrough === 4 && !j1.topics[3].complete && j1.topics[3].completedCount === allButLast.length, `TOPIC 4 에서 마지막 빼고 ${allButLast.length}/${t.lessonIds.length}: 잠김이어야 — ${j1.unlockedThrough}`);
  check(j1.topics[3].lastLessonId === t.lessonIds[t.lessonIds.length - 1] && j1.topics[3].lastLessonCompleted === false, "마지막 레슨 id · 미완료 표시");
  const j2 = U.judgePassoffTopics(recordWith(t.lessonIds, { unlockedThrough: 4 }), topics);
  check(j2.unlockedThrough === 5 && j2.topics[3].complete, `마지막까지 하면 TOPIC 5 열림이어야 — ${j2.unlockedThrough}`);
  const big = [topicOf(1, 10), topicOf(2, 2)];
  const j3 = U.judgePassoffTopics(recordWith(big[0].lessonIds.slice(0, 9)), big);
  check(j3.unlockedThrough === 1, `10개 중 9개(마지막 빠짐)는 잠김이어야 — ${j3.unlockedThrough}`);
  // through the write path too
  const r = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r, allButLast.map((lessonId) => ({ lessonId, completed: true })), topics, { now: NOW, everyTopicOpen: true });
  check(U.judgePassoffTopics(r, topics).unlockedThrough === 1, "LIFE 로 TOPIC 4 를 마지막 빼고 기록해도 사슬은 TOPIC 1 부터 — 1 이어야");
}

// ---- U3 LIFE ------------------------------------------------------------------------------------------
group("U3 LIFE");
{
  const lastTopic = REAL[REAL.length - 1];
  const deep = lastTopic.lessonIds[lastTopic.lessonIds.length - 1];
  const r = U.emptyPassoffRecord(NOW);
  const res = U.applyPassoffUpdates(r, [{ lessonId: deep, completed: true }], REAL, { now: NOW, everyTopicOpen: true });
  check(res.accepted.includes(deep) && r.lessons[deep] && r.lessons[deep].completed, `LIFE: ${deep} 기록 받음이어야 — ${JSON.stringify(res)}`);
  check(U.isPassoffLessonOpen(deep, U.emptyPassoffRecord(NOW), REAL, { everyTopicOpen: true }), `LIFE: 빈 기록에서 ${deep} 열림이어야`);
  check(!U.isPassoffLessonOpen(deep, U.emptyPassoffRecord(NOW), REAL), `LIFE 아님: 빈 기록에서 ${deep} 잠김이어야`);
  const r2 = U.emptyPassoffRecord(NOW);
  const res2 = U.applyPassoffUpdates(r2, [{ lessonId: deep, completed: true }], REAL, { now: NOW });
  check(!r2.lessons[deep] && res2.refused.some((x) => x.what === deep && x.why === "locked"), `LIFE 아님: ${deep} 거절이어야 — ${JSON.stringify(res2)}`);
  const snap = U.passoffSnapshot(U.emptyPassoffRecord(NOW), REAL, { everyTopicOpen: true });
  check(snap.everyTopicOpen === true && snap.unlockedThrough === 1, "LIFE 의 브라우저용 모양: everyTopicOpen true · unlockedThrough 는 기록 그대로(1)");
  // …and every topic says open (the admin panel showed a LIFE code as 'TOPIC 1까지 열림' — 점검 7)
  check(snap.topics.length > 1 && snap.topics.every((t) => t.unlocked), `LIFE 의 모양: 대주제 ${snap.topics.length}개 모두 unlocked — 잠김 ${snap.topics.filter((t) => !t.unlocked).length}`);
  const notLife = U.passoffSnapshot(U.emptyPassoffRecord(NOW), REAL);
  check(notLife.topics.filter((t) => t.unlocked).length === 1, `LIFE 아님: 빈 기록이면 TOPIC 1 만 unlocked — ${notLife.topics.filter((t) => t.unlocked).length}`);
  check(U.isPassoffLessonOpen("pg99-1", U.emptyPassoffRecord(NOW), REAL, { everyTopicOpen: true }) === false, "LIFE 여도 목록에 없는 레슨은 안 열림");
}

// ---- U4 줄지 않음 -------------------------------------------------------------------------------------------
group("U4 줄지 않음");
{
  const topics = [topicOf(1, 3), topicOf(2, 3), topicOf(3, 4), topicOf(4, 3)];
  const r = recordWith([], { unlockedThrough: 3 });
  check(U.judgePassoffTopics(r, topics).unlockedThrough === 3 && U.recalculatePassoffUnlock(r, topics) === 3, "저장 3 · 완료 0: 3 그대로");
  check(U.isPassoffLessonOpen("pg03-1", r, topics) && !U.isPassoffLessonOpen("pg04-1", r, topics), "저장 3: TOPIC 3 열림 · 4 잠김");
  // finish TOPIC 1 → 2, then a completion disappears (a record edited by hand, a lesson id retired)
  const r2 = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r2, [...topics[0].lessonIds.map((lessonId) => ({ lessonId, completed: true })), ...mapUpdates([topics[0]])], topics, { now: NOW });
  check(r2.unlockedThrough === 2, `TOPIC 1 을 마치면 2 — ${r2.unlockedThrough}`);
  delete r2.lessons["pg01-1"];
  check(U.recalculatePassoffUnlock(r2, topics) === 2, "완료 하나가 사라져도 2 그대로");
  // a lesson added to TOPIC 1 later: TOPIC 1 is no longer complete, TOPIC 2 stays open
  const grown = [topicOf(1, 4), ...topics.slice(1)];
  const r3 = recordWith(topics[0].lessonIds, { unlockedThrough: 2 });
  check(U.judgePassoffTopics(r3, grown).unlockedThrough === 2 && !U.judgePassoffTopics(r3, grown).topics[0].complete, "TOPIC 1 에 레슨이 늘어도 2 그대로(TOPIC 1 은 미완료로 보임)");
  // the chain goes on from the stored value: TOPIC 1 not complete, TOPIC 3 (open by the stored value) complete → 4
  const r4 = recordWith(topics[2].lessonIds, { unlockedThrough: 3 });
  check(U.judgePassoffTopics(r4, topics).unlockedThrough === 4, `저장 3 · TOPIC 3 완료 · TOPIC 1 미완료 → 4 이어야 — ${U.judgePassoffTopics(r4, topics).unlockedThrough}`);
  const r5 = U.sanitizePassoffRecord({ lessons: {}, unlockedThrough: 0 }, NOW);
  const r6 = U.sanitizePassoffRecord({ lessons: {}, unlockedThrough: 99 }, NOW);
  const r7 = U.sanitizePassoffRecord({ lessons: {}, unlockedThrough: "abc" }, NOW);
  check(r5.unlockedThrough === 1 && r6.unlockedThrough === U.PASSOFF_TOPIC_MAX && r7.unlockedThrough === 1, `범위: 0→1 · 99→${U.PASSOFF_TOPIC_MAX} · 글자→1`);
}

// ---- U5 도달 불가 대주제 기록 거부 ----------------------------------------------------------------------------------
group("U5 도달 불가 대주제 기록 거부");
{
  const second = REAL[1];
  const r = U.emptyPassoffRecord(NOW);
  const res = U.applyPassoffUpdates(r, [{ lessonId: second.lessonIds[0], completed: true }], REAL, { now: NOW });
  check(!res.changed && Object.keys(r.lessons).length === 0 && res.refused[0] && res.refused[0].why === "locked", `빈 기록에 TOPIC ${second.topic} 완료: 거절 · 바뀐 것 없음이어야 — ${JSON.stringify(res)}`);
  // every lesson id at once, with every topic's map refill: one topic per request
  const all = [...REAL.flatMap((t) => t.lessonIds).map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: NOW })), ...mapUpdates(REAL)];
  const r2 = U.emptyPassoffRecord(NOW);
  const a = U.applyPassoffUpdates(r2, all, REAL, { now: NOW });
  const firstIds = REAL[0].lessonIds;
  check(lessonsOnly(a.accepted).length === firstIds.length && lessonsOnly(a.accepted).every((id) => firstIds.includes(id)) && Object.keys(r2.mapRefills).join() === String(REAL[0].topic),
    `모두 한 번에(${all.length}): TOPIC 1 의 ${firstIds.length}개와 그 구성도만 받아야 — ${a.accepted.length} · 구성도 ${Object.keys(r2.mapRefills).join(",")}`);
  check(r2.unlockedThrough === (REAL[1] ? REAL[1].topic : REAL[0].topic), `첫 요청 뒤 unlockedThrough ${r2.unlockedThrough}`);
  check(Object.keys(r2.lessons).every((id) => firstIds.includes(id)), "TOPIC 2 이후 기록 0");
  const b = U.applyPassoffUpdates(r2, all, REAL, { now: NOW + 1000 });
  const secondIds = REAL[1] ? REAL[1].lessonIds : [];
  check(lessonsOnly(b.accepted).filter((id) => secondIds.includes(id)).length === secondIds.length && Object.keys(r2.lessons).length === firstIds.length + secondIds.length, `두 번째 요청: TOPIC 2 까지만 — 저장 ${Object.keys(r2.lessons).length}`);
  check(r2.unlockedThrough === (REAL[2] ? REAL[2].topic : r2.unlockedThrough), `두 번째 요청 뒤 unlockedThrough ${r2.unlockedThrough}`);
  // unknown ids, not a completion
  const r3 = recordWith(["pg01-1"]);
  const c = U.applyPassoffUpdates(r3, [
    { lessonId: "pg99-1", completed: true },
    { lessonId: "s1-1", completed: true },
    { lessonId: "../pg01-1", completed: true },
    { lessonId: "pg01-1", completed: false },
    { lessonId: "pg01-2" },
  ], REAL, { now: NOW });
  check(c.refused.filter((x) => x.why === "unknown").length === 3 && c.refused.filter((x) => x.why === "not-a-completion").length === 2, `모르는 id 3 · 완료 아님 2 거절이어야 — ${JSON.stringify(c.refused)}`);
  check(r3.lessons["pg01-1"].completed === true && !r3.lessons["pg01-2"] && !c.changed, "completed:false 는 완료를 지우지 않음 · 바뀐 것 없음");
  // map refills: a locked topic refused, the open one taken once (first date kept)
  const r4 = U.emptyPassoffRecord(NOW);
  const d = U.applyPassoffUpdates(r4, [{ mapRefillTopic: REAL[2] ? REAL[2].topic : 3 }, { mapRefillTopic: 1 }, { mapRefillTopic: 42 }, { mapRefillTopic: 1.5 }], REAL, { now: NOW });
  check(r4.mapRefills["1"] && !r4.mapRefills[String(REAL[2] ? REAL[2].topic : 3)] && d.refused.length === 3, `구성도: 잠긴 대주제 · 없는 대주제 · 소수 거절, TOPIC 1 받음 — ${JSON.stringify(d)}`);
  const firstAt = r4.mapRefills["1"].at;
  U.applyPassoffUpdates(r4, [{ mapRefillTopic: 1 }], REAL, { now: NOW + 86_400_000 });
  check(r4.mapRefills["1"].at === firstAt, "구성도 두 번째: 첫 날짜 그대로");
  // the lesson gate's own question
  check(!U.isPassoffLessonOpen(second.lessonIds[0], U.emptyPassoffRecord(NOW), REAL), "빈 기록: TOPIC 2 레슨 안 열림");
  check(U.isPassoffLessonOpen(REAL[0].lessonIds[REAL[0].lessonIds.length - 1], U.emptyPassoffRecord(NOW), REAL), "빈 기록: TOPIC 1 마지막 레슨 열림");
  check(!U.isPassoffLessonOpen("pg01-9", U.emptyPassoffRecord(NOW), REAL), "목록에 없는 pg01-9 는 안 열림");
  // no more than 100 records a request
  const junk = Array.from({ length: 100 }, (_, i) => ({ lessonId: `pg99-${i + 1}`, completed: true }));
  const r5 = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r5, [...junk, { lessonId: "pg01-1", completed: true }], REAL, { now: NOW });
  check(!r5.lessons["pg01-1"], "101번째 기록은 안 봄(한 요청 100개)");
}

// ---- U6 날짜 경계 ------------------------------------------------------------------------------------------
group("U6 날짜 경계");
{
  const before4 = Date.UTC(2026, 8, 27, 18, 59, 59, 999); // 2026-09-28 03:59:59.999 KST
  const at4 = Date.UTC(2026, 8, 27, 19, 0, 0, 0); // 2026-09-28 04:00:00.000 KST
  const r = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r, [{ lessonId: "pg01-1", completed: true, clientUpdatedAt: before4 }], REAL, { now: before4 });
  U.applyPassoffUpdates(r, [{ lessonId: "pg01-2", completed: true, clientUpdatedAt: at4 }], REAL, { now: at4 });
  check(r.lessons["pg01-1"].day === "2026-09-27", `03:59:59.999 KST → 전날 2026-09-27 이어야 — ${r.lessons["pg01-1"].day}`);
  check(r.lessons["pg01-2"].day === "2026-09-28", `04:00 KST → 2026-09-28 이어야 — ${r.lessons["pg01-2"].day}`);
  check(r.lessons["pg01-1"].at === new Date(before4).toISOString(), "at = 서버 시각");
  // the first completion's day is kept; finishing again writes nothing
  const again = U.applyPassoffUpdates(r, [{ lessonId: "pg01-1", completed: true }], REAL, { now: at4 + 3 * 86_400_000 });
  check(r.lessons["pg01-1"].day === "2026-09-27" && !again.changed, "다시 마쳐도 첫 날 그대로 · 쓸 것 없음");
  // the browser's clock never sets the day
  const r2 = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r2, [{ lessonId: "pg01-1", completed: true, clientUpdatedAt: Date.UTC(2026, 0, 1) }], REAL, { now: at4 });
  check(r2.lessons["pg01-1"].day === "2026-09-28", `브라우저 시각(1월 1일)이 아니라 서버 시각의 날 — ${r2.lessons["pg01-1"].day}`);
  // …and is only an ordering hint, capped at the server's clock + 60 s
  const r3 = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r3, [{ lessonId: "pg01-1", completed: true, clientUpdatedAt: at4 + 10 * 86_400_000 }, { lessonId: "pg01-2", completed: true, clientUpdatedAt: -5 }], REAL, { now: at4 });
  check(r3.lessons["pg01-1"].updatedAt === at4 + 60_000 && r3.lessons["pg01-2"].updatedAt === 0, `앞선 시각은 +60초까지 · 음수는 0 — ${r3.lessons["pg01-1"].updatedAt - at4} · ${r3.lessons["pg01-2"].updatedAt}`);
  const r4 = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r4, [{ mapRefillTopic: 1 }], REAL, { now: before4 });
  check(r4.mapRefills["1"].day === "2026-09-27", `구성도 기록도 같은 경계 — ${r4.mapRefills["1"].day}`);
  // the engine's own function agrees at the boundary
  check(dayModule.learningDay(before4) === "2026-09-27" && dayModule.learningDay(at4) === "2026-09-28", "learning/day.ts 도 같은 경계");
}

// ---- U7 구성도 다시 채우기 설정 --------------------------------------------------------------------------------------
group("U7 구성도 다시 채우기 설정");
{
  // the release setting (단계 2-나 E2 turned the map refill on — the topic-end map page records it)
  check(
    U.PASSOFF_UNLOCK_RULE.ratio === 0.8 && U.PASSOFF_UNLOCK_RULE.requireMapRefill === true,
    `출시 설정 ratio 0.8 · 구성도 조건 켬 — ${U.PASSOFF_UNLOCK_RULE.ratio} · ${U.PASSOFF_UNLOCK_RULE.requireMapRefill}`,
  );
  // the switch is tied both ways to who records a map refill: the progress files that carry it are not callers
  const callers = mapRefillCallers();
  if (breakName === "map-no-caller") callers.length = 0;
  check(
    U.PASSOFF_UNLOCK_RULE.requireMapRefill === callers.length > 0,
    callers.length
      ? `구성도 기록을 부르는 곳 ${callers.length}(${callers.slice(0, 3).join(" · ")}) — requireMapRefill 을 true 로 켜야 함(설계 §5 해금 조건)`
      : "구성도 기록을 부르는 곳 0 — requireMapRefill 은 false 여야 함(켜면 아무도 TOPIC 2 를 못 엶)",
  );
  const topics = [topicOf(1, 3), topicOf(2, 3), topicOf(3, 3)];
  const ON = { ratio: 0.8, requireMapRefill: true };
  // the OFF setting named, not the default
  const OFF = { ratio: 0.8, requireMapRefill: false };
  const done = recordWith(topics[0].lessonIds, { mapRefills: {} });
  // the release rule itself (the default): every lesson of TOPIC 1 finished, no map refill — still TOPIC 1
  check(U.judgePassoffTopics(done, topics).unlockedThrough === 1 && !U.isPassoffLessonOpen("pg02-1", done, topics), "출시 판: 레슨을 다 마쳐도 구성도가 없으면 TOPIC 2 잠김");
  const viaApi = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(viaApi, topics[0].lessonIds.map((lessonId) => ({ lessonId, completed: true })), topics, { now: NOW });
  const beforeMap = viaApi.unlockedThrough;
  U.applyPassoffUpdates(viaApi, mapUpdates([topics[0]]), topics, { now: NOW + 1000 });
  check(beforeMap === 1 && viaApi.unlockedThrough === 2, `출시 판 · 쓰기: 레슨만 1 → 구성도 기록 뒤 2 — ${beforeMap} → ${viaApi.unlockedThrough}`);
  check(U.judgePassoffTopics(done, topics, OFF).unlockedThrough === 2, "꺼짐: 레슨만 마치면 2");
  check(U.judgePassoffTopics(done, topics, ON).unlockedThrough === 1, "켬: 구성도 없으면 1");
  done.mapRefills["1"] = { at: new Date(NOW).toISOString(), day: "2026-09-27" };
  check(U.judgePassoffTopics(done, topics, ON).unlockedThrough === 2, "켬: 구성도 1번이면 2");
  const onlyMap = recordWith([topics[0].lessonIds[2]], { mapRefills: {} });
  onlyMap.mapRefills["1"] = { at: new Date(NOW).toISOString(), day: "2026-09-27" };
  check(U.judgePassoffTopics(onlyMap, topics, ON).unlockedThrough === 1, "켬: 구성도만 하고 레슨이 모자라면 1");
  // through the write path with the setting on
  const r = U.emptyPassoffRecord(NOW);
  U.applyPassoffUpdates(r, topics[0].lessonIds.map((lessonId) => ({ lessonId, completed: true })), topics, { now: NOW, rule: ON });
  check(r.unlockedThrough === 1, `켬 · 쓰기: 레슨만으로는 1 — ${r.unlockedThrough}`);
  U.applyPassoffUpdates(r, [{ mapRefillTopic: 1 }], topics, { now: NOW, rule: ON });
  check(r.unlockedThrough === 2, `켬 · 쓰기: 구성도 뒤 2 — ${r.unlockedThrough}`);
  check(
    U.passoffSnapshot(r, topics, { rule: ON }).mapRefillRequired === true &&
      U.passoffSnapshot(r, topics, { rule: OFF }).mapRefillRequired === false &&
      U.passoffSnapshot(r, topics).mapRefillRequired === U.PASSOFF_UNLOCK_RULE.requireMapRefill,
    "브라우저용 모양의 mapRefillRequired 가 설정을 따름",
  );
}

// ---- U8 저장된 기록 다듬기 ---------------------------------------------------------------------------------------
group("U8 저장된 기록 다듬기");
{
  for (const junk of [null, undefined, 42, "x", [], { lessons: "x" }, { lessons: [] }]) {
    const r = U.sanitizePassoffRecord(junk, NOW);
    check(r.version === 1 && Object.keys(r.lessons).length === 0 && r.unlockedThrough === 1, `망가진 값 ${JSON.stringify(junk)} → 빈 기록`);
  }
  // JSON.parse, so "__proto__" is an own key as it would be in a stored file
  const r = U.sanitizePassoffRecord(JSON.parse(JSON.stringify({
    lessons: {
      "pg01-1": { completed: true, updatedAt: 5, at: "2026-09-27T01:00:00.000Z", day: "2026-09-27" },
      "pg01-2": { completed: "yes", updatedAt: 5 },
      "pg01-3": { completed: true, updatedAt: "soon" },
      "s1-1": { completed: true, updatedAt: 5 },
      "pg1-1": { completed: true, updatedAt: 5 },
      "pg21-1": { completed: true, updatedAt: 5 },
      "pg02-1": { completed: true, updatedAt: 5, at: "not a date", day: "2026-13-99x" },
      // the shape of a day, but no such day (점검 8)
      "pg02-2": { completed: true, updatedAt: 5, day: "2026-13-99" },
      "pg02-3": { completed: true, updatedAt: 5, day: "2026-02-30" },
      "pg03-1": { completed: true, updatedAt: 5, day: "2028-02-29" },
    },
    mapRefills: {
      "1": { at: "2026-09-27T01:00:00.000Z", day: "2026-09-27" },
      "21": { at: "2026-09-27T01:00:00.000Z", day: "2026-09-27" },
      x: {},
      "2": { at: "bad", day: "2026-09-27" },
      "3": { at: "2026-09-27T01:00:00.000Z", day: "2026-02-30" },
    },
    unlockedThrough: 2,
    updatedAt: 7,
  }).replace('"lessons":{', '"lessons":{"__proto__":{"completed":true,"updatedAt":5},')), NOW);
  check(Object.getPrototypeOf(r.lessons) === Object.prototype, "__proto__ 열쇠가 기록의 원형을 바꾸지 않음");
  check(Object.keys(r.lessons).sort().join() === "pg01-1,pg02-1,pg02-2,pg02-3,pg03-1", `남는 레슨 pg01-1 · pg02-1~3 · pg03-1 — ${Object.keys(r.lessons).join(",")}`);
  check(r.lessons["pg02-1"].at === null && r.lessons["pg02-1"].day === null, "틀린 날짜 · 시각은 null");
  check(r.lessons["pg02-2"].day === null && r.lessons["pg02-3"].day === null, `없는 날 '2026-13-99' · '2026-02-30' 은 null — ${r.lessons["pg02-2"].day} · ${r.lessons["pg02-3"].day}`);
  check(r.lessons["pg03-1"].day === "2028-02-29" && r.lessons["pg01-1"].day === "2026-09-27", "있는 날(윤년 2028-02-29 포함)은 그대로");
  check(Object.keys(r.mapRefills).join() === "1" && r.unlockedThrough === 2 && r.updatedAt === 7, `구성도 1 만(없는 날의 3 도 버림) · unlockedThrough 2 · updatedAt 7 — ${Object.keys(r.mapRefills).join(",")}`);
}

// ---- U9 과정 목록 → 대주제 --------------------------------------------------------------------------------------
group("U9 과정 목록 → 대주제");
{
  // grouped here on our own, by the id: pgNN-M
  const expected = new Map();
  for (const l of index.lessons) {
    const m = /^pg(\d{2})-\d+$/.exec(l.id);
    if (!m) continue;
    const t = Number(m[1]);
    if (!expected.has(t)) expected.set(t, []);
    expected.get(t).push(l.id);
  }
  check(REAL.length > 0 && REAL.length === expected.size, `대주제 수 ${REAL.length} = ${expected.size}`);
  for (const t of REAL) {
    const want = expected.get(t.topic) || [];
    check(JSON.stringify(t.lessonIds) === JSON.stringify(want), `TOPIC ${t.topic}: ${t.lessonIds.join(" ")} ≠ ${want.join(" ")}`);
    check(new RegExp(`^TOPIC ${t.topic}\\b`).test(t.label), `TOPIC ${t.topic} 이름 "${t.label}"`);
  }
  check(REAL.every((t, i) => i === 0 || REAL[i - 1].topic < t.topic), "대주제 번호 순서");
  // a group listing the wrong topic's lesson, doubles, an unknown id, groups out of order
  const odd = U.passoffTopicsFromGroups([
    { label: "TOPIC 2. B", lessons: ["pg02-1", "pg02-2", "pg01-3", "pg02-2", "x-1"] },
    { label: "TOPIC 1. A", lessons: ["pg01-1", "pg01-2"] },
  ]);
  check(odd.map((t) => `${t.topic}:${t.lessonIds.join(",")}`).join(" ") === "1:pg01-3,pg01-1,pg01-2 2:pg02-1,pg02-2", `섞인 목록 → ${odd.map((t) => `${t.topic}:${t.lessonIds.join(",")}`).join(" ")}`);
}

// ---- U10 필요 레슨 수 ---------------------------------------------------------------------------------------------
group("U10 필요 레슨 수");
for (const n of [0, 1, 5, 10, 15, 20, 25, 30, 45, 50]) check(U.passoffRequiredCount(n) === needed(n), `n=${n}: ${U.passoffRequiredCount(n)} ≠ ${needed(n)}`);

// ---- U11 브라우저에 주는 모양 ----------------------------------------------------------------------------------------
group("U11 브라우저에 주는 모양");
{
  const r = recordWith(REAL[0].lessonIds);
  U.recalculatePassoffUnlock(r, REAL);
  const s = U.passoffSnapshot(r, REAL);
  const fields = [...new Set(Object.values(s.lessons).flatMap((x) => Object.keys(x)))].sort().join();
  check(fields === "completed,day,updatedAt", `레슨 칸 ${fields}`);
  check(s.topics.length === REAL.length && s.topics[0].complete && (!s.topics[1] || s.topics[1].unlocked), "대주제 수 · TOPIC 1 완료 · TOPIC 2 열림");
  check(s.requiredRatio === 0.8 && s.version === 1 && s.everyTopicOpen === false, "비율 · 판 · LIFE 아님");
}

// ---- U12 대주제 번호 뒤 조사 ---------------------------------------------------------------------------------------
group("U12 대주제 번호 뒤 조사");
{
  // how each number is read in Korean, written out here — the particle follows the last syllable's final consonant
  const READ = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구", "십", "십일", "십이", "십삼", "십사", "십오", "십육", "십칠", "십팔", "십구", "이십"];
  const hasFinal = (word) => (word.charCodeAt(word.length - 1) - 0xac00) % 28 !== 0;
  for (let n = 1; n <= 20; n++) {
    const f = hasFinal(READ[n]);
    const want = { "을/를": f ? "을" : "를", "이/가": f ? "이" : "가", "은/는": f ? "은" : "는" };
    for (const [pair, particle] of Object.entries(want)) {
      const got = U.topicWithParticle(n, pair);
      check(got === `TOPIC ${n}${particle}`, `${n}(${READ[n]}) ${pair}: ${got} — 'TOPIC ${n}${particle}' 이어야`);
    }
  }
}

// ---- U13 관리자 수동 해금 ------------------------------------------------------------------------------------------------
group("U13 관리자 수동 해금");
{
  const topics = [topicOf(1, 3), topicOf(2, 3), topicOf(3, 4), topicOf(4, 3)];
  const r = U.emptyPassoffRecord(NOW);
  check(U.raisePassoffUnlock(r, 3, topics, NOW + 5) === true && r.unlockedThrough === 3 && r.updatedAt === NOW + 5, `1 → 3 올림 · 시각 — ${r.unlockedThrough}`);
  check(U.raisePassoffUnlock(r, 2, topics, NOW + 6) === false && r.unlockedThrough === 3 && r.updatedAt === NOW + 5, `3 → 2 는 안 내림 — ${r.unlockedThrough}`);
  check(U.raisePassoffUnlock(r, 3, topics, NOW + 7) === false && r.updatedAt === NOW + 5, "같은 3 은 바뀐 것 없음");
  for (const bad of [9, 0, 2.5, NaN, -1]) {
    check(U.raisePassoffUnlock(r, bad, topics, NOW + 8) === false && r.unlockedThrough === 3, `목록에 없는 대주제 ${bad} 는 안 받음`);
  }
  // a topic already complete opens the next one when the owner opens it
  const r2 = recordWith(topics[1].lessonIds);
  check(U.raisePassoffUnlock(r2, 2, topics, NOW) === true && r2.unlockedThrough === 3, `TOPIC 2 를 다 마친 기록에서 2 로 열면 3 까지 — ${r2.unlockedThrough}`);
  // then the lock follows it
  check(U.isPassoffLessonOpen("pg03-1", r, topics) && !U.isPassoffLessonOpen("pg04-1", r, topics), "수동으로 3 까지: pg03-1 열림 · pg04-1 잠김");
}

// ---- report ------------------------------------------------------------------------------------------
const total = groups.reduce((n, g) => n + g.cases, 0);
const failed = groups.reduce((n, g) => n + g.fails.length, 0);
for (const g of groups) {
  console.log(`${g.fails.length ? "FAIL" : "PASS"}  ${g.name} — ${g.cases - g.fails.length}/${g.cases}`);
  for (const f of g.fails.slice(0, 5)) console.log(`        ${f}`);
  if (g.fails.length > 5) console.log(`        … 외 ${g.fails.length - 5}`);
}
console.log(`${breakName ? `[--break=${breakName}] ` : ""}${failed ? "FAIL" : "PASS"} — ${total - failed}/${total} (대주제 ${REAL.length}개 · 레슨 ${REAL.reduce((n, t) => n + t.lessonIds.length, 0)}개 목록 기준)`);
process.exit(failed ? 1 : 0);
