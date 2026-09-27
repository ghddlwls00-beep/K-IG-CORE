#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 대주제 순서 잠금을 실제 서버(로컬 `next dev`)에 HTTP 로 확인 (설계 §5 · 코드 단계 C).
 *
 * check-progress-api.cjs 는 이용권 확인을 가짜로 바꿔 route 함수를 부른다. 이것은 가짜 없이 끝까지 간다:
 * 이용권 코드를 만들어 /api/license/activate 로 등록 → 받은 세션 쿠키로 레슨 쪽 · 진도 API · 관리자 API 를 부른다.
 *
 * 준비(버리는 시험 비밀값으로만 — 운영 값 금지; R2 값이 없어야 로컬 대체 저장소 data/*.json 에 씀):
 *   1) 비밀값 JSON {LICENSE_SALT, LICENSE_SECRET, ADMIN_PIN, ADMIN_SESSION_SECRET} — 각 32자 이상(ADMIN_PIN 10자 이상)
 *   2) 그 값을 환경에 넣고 이 작업 트리에서 `npx next dev -p 3461` (운영 빌드 `next start` 는 로컬 이용권 저장소를 거절함)
 *   3) node docs/pass-off-grammar/검사/check-progress-live.mjs --secrets <json> [--base http://localhost:3461] [--break=life-cookie]
 *   4) 끝나면 이 작업 트리의 data/license-devices.json · data/passoff-progress.json · data/student-progress.json 을 지운다
 *      (.gitignore 에 있지만 남겨 두지 않는다)
 *   --break=life-cookie : 잠금이어야 하는 곳에 LIFE 쿠키를 보냄 — 잠금 칸들이 FAIL(exit 1)이어야(검사가 실패할 수 있음)
 * exit 0 = 실패 0
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const BASE = arg("base", "http://localhost:3461");
const BREAK = arg("break", "");
const REPO = path.resolve(import.meta.dirname, "../../..");
const secretsFile = arg("secrets");
if (!secretsFile || !fs.existsSync(secretsFile)) {
  console.error("--secrets <json> 가 필요합니다(서버를 켤 때 넣은 버리는 시험 비밀값)");
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`로컬 서버에만 씁니다 — ${BASE}`);
  process.exit(2);
}
const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));

const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const checksum = crypto.createHmac("sha256", sec.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${checksum}`;
};
async function activate(plan) {
  const key = makeKey(plan);
  const r = await fetch(`${BASE}/api/license/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, deviceId: `stagec-${plan.toLowerCase()}-${Date.now()}`, deviceName: "stage C live check" }),
  });
  const cookie = (r.headers.getSetCookie?.() || []).map((s) => s.split(";")[0]).filter((s) => s.startsWith("kig_license_session=")).join("; ");
  const j = await r.json();
  if (!j.success || !cookie) throw new Error(`activate ${plan} failed: ${r.status} ${j.error || ""}`);
  return { key, cookie };
}
const visible = (html) =>
  html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ").trim();
async function page(p, cookie = null, { rsc = false } = {}) {
  const r = await fetch(BASE + p, { headers: { ...(cookie ? { cookie } : {}), ...(rsc ? { RSC: "1" } : {}) }, redirect: "manual" });
  const body = await r.text();
  return { status: r.status, body, text: rsc ? body : visible(body) };
}
async function api(method, p, cookie, body) {
  const r = await fetch(BASE + p, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, data: await r.json().catch(() => null), setCookie: r.headers.getSetCookie?.() || [] };
}
const complete = (cookie, ids) => api("POST", "/api/progress/passoff-grammar", cookie, { updates: ids.map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() })) });

const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
/** the lesson's own words — none may reach a locked page */
function needles(id) {
  const d = lessonFile(id);
  const a = (d.blocks.find((b) => b.type === "anchors") || { items: [] }).items;
  const p = (d.blocks.find((b) => b.type === "drill") || { produce: [] }).produce || [];
  return [...new Set([a[0]?.en, a[0]?.ko, a[1]?.en, p[p.length - 1]?.en].filter((t) => typeof t === "string" && t.length >= 8))];
}
const PAYWALL = /ALL-PASS ONLY|STUDENT PASS ONLY|STUDENT PASS · ALL-PASS|VIP ALL-PASS REQUIRED|순차 학습 잠금/;
const LESSON = "예문 떠올리기"; // step ①'s heading — the lesson view is on the page
const rows = [];
const check = (name, ok, detail = "") => rows.push({ ok: ok ? "PASS" : "FAIL", name, detail: String(detail).slice(0, 120) });
const found = (res, list) => list.filter((n) => res.body.includes(n) || res.body.includes(JSON.stringify(n).slice(1, -1)));

const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const T = index.groups.map((g) => g.lessons);
const [t1, t2, t3] = T;
const deepest = T[T.length - 1][T[T.length - 1].length - 1];

const stu = await activate("STU1Y");
const all = await activate("1Y");
const life = await activate("LIFE");
const stulife = await activate("STULIFE");
/** where a lock is expected: the licence under test — or, broken on purpose, a LIFE one */
const lockCookie = (c) => (BREAK === "life-cookie" ? life.cookie : c);

// --- no licence: exactly as before this stage -------------------------------------------------
{
  const r = await page(`/passoff-grammar/${t2[0]}`);
  const leak = found(r, needles(t2[0]));
  check(`L1 이용권 없음: ${t2[0]} 이용권 잠금('STUDENT PASS · ALL-PASS') · 본문 0 · data-kig-paywall="license"`, r.status === 200 && r.text.includes("STUDENT PASS · ALL-PASS") && leak.length === 0 && r.body.includes('data-kig-paywall="license"'), leak.join(" · ") || r.status);
  const f = await page(`/passoff-grammar/${t1[0]}`);
  check(`L2 이용권 없음: 무료 ${t1[0]} 열림`, f.status === 200 && !PAYWALL.test(f.text) && f.text.includes(LESSON), f.status);
}

// --- a STUDENT pass, from TOPIC 1 --------------------------------------------------------------
{
  const r = await page(`/passoff-grammar/${t2[0]}`, lockCookie(stu.cookie));
  const rsc = await page(`/passoff-grammar/${t2[0]}`, lockCookie(stu.cookie), { rsc: true });
  const leak = [...found(r, needles(t2[0])), ...found(rsc, needles(t2[0]))];
  check(`L3 STUDENT 이용권(새것): ${t2[0]} 대주제 잠금 '순차 학습 잠금' · 'TOPIC 1을 마치면 열려요' · 본문 0(HTML · RSC)`,
    r.status === 200 && r.text.includes("순차 학습 잠금") && r.text.includes("TOPIC 1을 마치면 열려요") && !r.text.includes(LESSON) && leak.length === 0, leak.join(" · ") || r.text.match(/순차 학습 잠금.{0,60}/)?.[0]);
  check("L3b 잠금 화면은 data-kig-paywall=\"progress\"(이용권 다시 불러오기 고리 없음)", r.body.includes('data-kig-paywall="progress"') && !r.body.includes('data-kig-paywall="license"'), r.body.match(/data-kig-paywall="[a-z]+"/)?.[0]);
  check("L3c 잠금 화면에 지금 대주제의 조건(TOPIC 1 · 레슨 3개 · 마지막 레슨 이름)", r.text.includes(index.groups[0].label) && r.text.includes(`레슨 ${Math.ceil(t1.length * 0.8)}개 이상`) && r.text.includes(lessonFile(t1[t1.length - 1]).title), r.text.match(/지금 학습할 대주제.{0,120}/)?.[0]);
  // 점검 1: the lessons the server has not counted, each a link into the open topic
  const recorded = r.text.match(/아직 기록되지 않은 레슨.{0,120}/)?.[0] || "";
  check("L3d 잠금 화면에 '아직 기록되지 않은 레슨' — TOPIC 1 의 레슨마다 이름 · 그 레슨으로 가는 링크",
    t1.every((id) => recorded.includes(lessonFile(id).title) && r.body.includes(`href="/passoff-grammar/${id}"`)), recorded);
  const open = await page(`/passoff-grammar/${t1[t1.length - 1]}`, stu.cookie);
  check(`L4 STUDENT 이용권: TOPIC 1 의 유료 ${t1[t1.length - 1]} 열림`, open.status === 200 && !PAYWALL.test(open.text) && open.text.includes(LESSON), open.status);
  const g = await api("GET", "/api/progress/passoff-grammar", stu.cookie);
  check("L5 진도 API: unlockedThrough 1 · 대주제 수 = 과정 목록", g.status === 200 && g.data.progress.unlockedThrough === 1 && g.data.progress.topics.length === T.length, JSON.stringify(g.data && g.data.progress && { u: g.data.progress.unlockedThrough, t: g.data.progress.topics.length }));
  const early = await complete(stu.cookie, [t2[0]]);
  check(`L5b 잠긴 ${t2[0]} 완료를 보내도 안 남음`, early.status === 200 && !early.data.progress.lessons[t2[0]], JSON.stringify(early.data.progress.lessons));
  const done = await complete(stu.cookie, t1);
  check("L6 TOPIC 1 세 레슨 완료 → unlockedThrough 2", done.status === 200 && done.data.progress.unlockedThrough === 2, done.data && done.data.progress && done.data.progress.unlockedThrough);
  const now2 = await page(`/passoff-grammar/${t2[0]}`, stu.cookie);
  check(`L6b 이제 ${t2[0]} 레슨이 열림`, now2.status === 200 && !PAYWALL.test(now2.text) && now2.text.includes(LESSON), now2.status);
  if (t3) {
    const l3 = await page(`/passoff-grammar/${t3[0]}`, lockCookie(stu.cookie));
    check(`L6c ${t3[0]} 은 'TOPIC 2를 마치면 열려요'(2 는 받침 없음 — 점검 3)`, l3.text.includes("순차 학습 잠금") && l3.text.includes("TOPIC 2를 마치면 열려요") && found(l3, needles(t3[0])).length === 0, l3.text.match(/순차 학습 잠금.{0,40}/)?.[0]);
  }
}

// --- other passes ----------------------------------------------------------------------------------
{
  const l = await page(`/passoff-grammar/${deepest}`, life.cookie);
  check(`L7 LIFE: 맨 끝 ${deepest} 바로 열림`, l.status === 200 && !PAYWALL.test(l.text) && l.text.includes(LESSON), l.status);
  const s = await page(`/passoff-grammar/${deepest}`, lockCookie(stulife.cookie));
  check(`L8 STULIFE: ${deepest} 대주제 잠금(LIFE 만 모두 열림 — STUDENT 와 같음)`, s.text.includes("순차 학습 잠금") && !s.text.includes(LESSON), s.text.match(/순차 학습 잠금.{0,40}/)?.[0]);
  const a = await page(`/passoff-grammar/${t2[0]}`, lockCookie(all.cookie));
  check(`L9 올패스 1Y: ${t2[0]} 대주제 잠금`, a.text.includes("순차 학습 잠금") && !a.text.includes(LESSON), a.text.match(/순차 학습 잠금.{0,40}/)?.[0]);
  const g1 = await page("/grammar1/gh1-010", all.cookie);
  check("L9b 올패스 1Y: GRAMMAR I 유료 gh1-010 은 그대로 열림", g1.status === 200 && !PAYWALL.test(g1.text), g1.status);
}

// --- STUDENT's own lock, unchanged -------------------------------------------------------------------
// 2026-09-28 main 합친 뒤: STUDENT 잠금 문구는 main 의 공통 틀 2(STU-U28)가 '챕터 2은 이전 챕터 완료 후 열립니다' →
// '2장은 앞 장을 마치면 열립니다' 로 바꾼 것이 기준(이 과정이 바꾼 것 아님 — LessonPaywall.tsx 의 progress 문구 그대로)
{
  const s2 = await page("/student/s2-1", stu.cookie);
  check("L10 STUDENT 이용권: /student/s2-1 은 STUDENT 순서 잠금 문구 그대로(main 판 '2장은 앞 장을 마치면 열립니다')", s2.text.includes("순차 학습 잠금") && s2.text.includes("2장은 앞 장을 마치면 열립니다"), s2.text.match(/순차 학습 잠금.{0,50}/)?.[0]);
  const s1 = await page("/student/s1-3", stu.cookie);
  check("L10b STUDENT 이용권: /student/s1-3 열림", s1.status === 200 && !PAYWALL.test(s1.text), s1.status);
}

// --- admin --------------------------------------------------------------------------------------------
{
  const login = await api("POST", "/api/admin/login", null, { pin: sec.ADMIN_PIN });
  const adminCookie = login.setCookie.map((s) => s.split(";")[0]).filter((s) => s.startsWith("kig_admin_session=")).join("; ");
  const noAuth = await api("POST", "/api/admin/passoff-progress", null, { key: stu.key });
  const view = await api("POST", "/api/admin/passoff-progress", adminCookie, { key: stu.key });
  check("L11 관리자: 인증 없이 401 · 보기 = TOPIC 2 까지 · 완료 3", noAuth.status === 401 && view.status === 200 && view.data.progress.unlockedThrough === 2 && view.data.progress.completedLessons === t1.length, JSON.stringify(view.data && view.data.progress && { u: view.data.progress.unlockedThrough, c: view.data.progress.completedLessons }));
  const reset = await api("POST", "/api/admin/passoff-progress", adminCookie, { key: stu.key, action: "reset" });
  const again = await page(`/passoff-grammar/${t2[0]}`, lockCookie(stu.cookie));
  check(`L11b 관리자 초기화 → TOPIC 1 만 · ${t2[0]} 다시 잠김`, reset.data.progress.unlockedThrough === 1 && reset.data.progress.completedLessons === 0 && again.text.includes("순차 학습 잠금"), `${reset.data.progress.unlockedThrough}/${reset.data.progress.completedLessons}`);
  const stuAdmin = await api("POST", "/api/admin/student-progress", adminCookie, { key: stu.key });
  check("L11c 관리자 STUDENT 진도 API 는 그대로 동작", stuAdmin.status === 200 && stuAdmin.data.progress.unlockedThrough === 1, stuAdmin.status);
  // 점검 1 · 7: the owner gives a topic back by hand; a LIFE code shows every topic open
  const set = await api("POST", "/api/admin/passoff-progress", adminCookie, { key: stu.key, action: "setTopic", topic: 2 });
  const back = await page(`/passoff-grammar/${t2[0]}`, stu.cookie);
  check(`L11d 관리자 수동 해금 TOPIC 2 → ${t2[0]} 다시 열림`, set.status === 200 && set.data.progress.unlockedThrough === 2 && !PAYWALL.test(back.text) && back.text.includes(LESSON), `${set.status}/${set.data && set.data.progress && set.data.progress.unlockedThrough}`);
  const lifeView = await api("POST", "/api/admin/passoff-progress", adminCookie, { key: life.key });
  check("L11e 관리자: LIFE 코드는 '모든 TOPIC 열림'(everyTopicOpen · 대주제 모두 열림)", lifeView.status === 200 && lifeView.data.progress.everyTopicOpen === true && lifeView.data.progress.topics.every((t) => t.unlocked), JSON.stringify(lifeView.data && lifeView.data.progress && { e: lifeView.data.progress.everyTopicOpen, open: lifeView.data.progress.topics.filter((t) => t.unlocked).length }));
}

// --- the page around it --------------------------------------------------------------------------------
{
  const paid = await page(`/passoff-grammar/${t2[0]}`);
  const free = await page(`/passoff-grammar/${t1[0]}`);
  const canon = (b) => b.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || "";
  check("L12 메타: 유료는 noindex · canonical /passoff-grammar/<id> · 무료는 noindex 없음", /noindex/.test(paid.body) && canon(paid.body).endsWith(`/passoff-grammar/${t2[0]}`) && !/noindex/.test(free.body) && canon(free.body).endsWith(`/passoff-grammar/${t1[0]}`), `${canon(paid.body)} · ${canon(free.body)}`);
  const missing = await page("/passoff-grammar/pg99-9");
  check("L13 없는 레슨 404", missing.status === 404, missing.status);
}

console.table(rows);
const fails = rows.filter((r) => r.ok !== "PASS").length;
console.log(`${BREAK ? `[--break=${BREAK}] ` : ""}${fails ? "FAIL" : "PASS"} — ${rows.length - fails}/${rows.length}`);
process.exit(fails ? 1 : 0);
