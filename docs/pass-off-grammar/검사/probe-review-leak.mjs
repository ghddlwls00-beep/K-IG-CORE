#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 복습 쪽(/passoff-grammar/review)이 보내는 HTML · RSC 에 유료 글이 있는지(공통-학습-엔진.md §8-8 유출 탐침).
 *
 * 로컬 운영 빌드(`npx next build` → `npx next start -p 3471 -H 127.0.0.1`, 이용권 · R2 값 없이)에 이용권 없이 묻는다 — 운영
 * 빌드는 로컬 이용권 저장소를 거절하므로 이용권 있는 쪽은 여기서 못 보고, 그쪽은 check-learning-api.cjs(쪽에 글 0 · API 는
 * 계획 안 문항만)가 본다. 이용권 없는 복습 쪽은 무료 두 레슨의 복습 문항을 싣는다(무료 레슨 쪽과 같은 글).
 *   P1 HTML · RSC 에 유료 레슨(무료 두 레슨 밖 전부)의 글 0 — 문항 · ① 예문 · ② 규칙 · ⑤ 틀, 무료 레슨에도 있는 같은 글은 뺌
 *   P2 pg01-1 의 유료 STUDENT 보충(content/private) 글 0
 *   P3 무료 레슨의 복습 문항 글은 RSC 에 있음(탐침이 글을 볼 수 있다는 증거) · 쪽이 200 · 제목 '오늘 복습'
 *   --selftest : 받은 HTML 에 유료 글 하나씩을 심은 사본으로 심은 칸마다 FAIL 이 나는지(탐침이 실패할 수 있음) — 심는 곳: P1(복습 쪽) ·
 *     P6(오답노트 쪽) · P7(구성도 TOPIC 1 쪽 — 점검 17) · --secrets 면 P8(이용권 오답노트 쪽 — 점검 17). 심은 칸이 모두 FAIL 이면
 *     exit 1(맞음), 심은 칸 하나라도 PASS 거나 심지 못했으면(--secrets 인데 이용권 등록 실패 등) exit 2 — 탐침을 믿을 수 없음
 *   --secrets <json> : 이용권 쪽도 가짜 없이(check-progress-live.mjs 와 같은 준비 — 버리는 시험 비밀값 {LICENSE_SALT,
 *     LICENSE_SECRET} 을 넣고 켠 `npx next dev -p 3472`, R2 값 없이 → 로컬 대체 저장소 data/*.json). STUDENT 이용권을 등록해
 *     P4 이용권 복습 쪽 HTML · RSC 에 레슨 글(무료 레슨 것까지) 0 — 문항은 API 로만 옴 · 무료 안내 표시 없음
 *     P5 POST /api/learning/passoff-grammar(어제 끝낸 pg01-1 · pg01-2 · 잠긴 TOPIC 2 레슨) → 문항 열쇠 = 계획 열쇠 · 잠긴 대주제
 *        문항 0 · 계획 밖 문항의 글 0 · 계획 날짜 = 서버의 오늘
 *     끝나면 그 작업 트리의 data/license-devices.json · passoff-progress.json · learning-passoff-grammar.json 을 지운다.
 *   단계 2-나 E2 — 오답노트(/passoff-grammar/review?notes=1)와 구성도(/passoff-grammar/map?topic=N)도 같은 기준으로:
 *   P6 이용권 없이 오답노트 쪽 HTML · RSC 에 유료 레슨 글 · 보충 글 0 · 무료 레슨 문항 글은 있음(무료 복습 쪽과 같은 것) · 제목 '오답노트'
 *   P7 이용권 없이 구성도 쪽(TOPIC 1 · 2 · 20) HTML · RSC 에 레슨 글(무료 레슨 것까지) 0 · 안내 한 줄
 *   --secrets 일 때:
 *     P8 이용권 오답노트 쪽 HTML · RSC 에 레슨 글(무료 레슨 것까지) 0 — 목록은 API 로만
 *     P9 API view "notes"(틀린 문항: 열린 pg01-1 · pg01-2 · 잠긴 TOPIC 2): 목록은 열린 레슨 것만 · 레슨 없이 물으면 문항 글 0 ·
 *        lesson=pg01-2 면 그 레슨 틀린 문항 글만(다른 문항 글 0) · 잠긴 레슨을 물으면 0
 *     P10 이용권 구성도 쪽: 열린 TOPIC 1 은 그 레슨들의 규칙 제목 · 첫 예문이 있음 · 다른 대주제 레슨 글 0 · 잠긴 TOPIC 2 는 레슨 글 0
 *     P10a (E2 수정 — 구성도는 대주제 끝) TOPIC 1 레슨 전에는 '대주제의 레슨을 마친 뒤' 한 줄 · 레슨 글 0 → 진도 API 로 TOPIC 1 레슨을
 *        마친 뒤 P10
 *   node docs/pass-off-grammar/검사/probe-review-leak.mjs [--base http://127.0.0.1:3471] [--selftest] [--secrets <json>]
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
const BASE = arg("base", "http://127.0.0.1:3471");
const SELFTEST = process.argv.includes("--selftest");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`로컬 서버에만 묻습니다 — ${BASE}`);
  process.exit(2);
}
const REPO = path.resolve(import.meta.dirname, "../../..");
const COURSE = "passoff-grammar";
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", `${COURSE}.json`), "utf8"));
const FREE = index.groups[0].lessons.slice(0, 2); // FREE_PREVIEW_LESSON_IDS — the first two cards (license.ts)
const lessonFile = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", COURSE, `${id}.json`), "utf8"));

/** every string of a lesson a page could carry: items, anchors, the rule card, the frame (length ≥ 10) */
function textsOfBlocks(blocks) {
  const out = [];
  const add = (v) => {
    if (typeof v === "string" && v.trim().length >= 10) out.push(v);
    else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === "object") Object.values(v).forEach(add);
  };
  for (const b of blocks) {
    if (b.type === "anchors") for (const a of b.items || []) add([a.en, a.ko, a.promptEn]);
    if (b.type === "rule") add([b.title, b.points, b.koDiff, b.worked, b.mistakes, b.discovery, b.check, b.table]);
    if (b.type === "frame") add([b.template, b.ko]);
    if (b.type === "drill") {
      for (const list of ["select", "produce", "transfer"]) {
        for (const it of b[list] || []) {
          add([it.en, it.ko, it.promptEn, it.instruction, it.sentence, it.why, it.accept, it.options, it.condition]);
          if (Array.isArray(it.tokens)) out.push(it.tokens.join(" "), JSON.stringify(it.tokens));
        }
      }
    }
  }
  return out.filter((t) => t.trim().length >= 10);
}

const freeTexts = FREE.flatMap((id) => textsOfBlocks(lessonFile(id).blocks));
const paidLessons = index.lessons.map((l) => l.id).filter((id) => !FREE.includes(id));
const notFree = (t) => !freeTexts.some((f) => f.includes(t));
const paidNeedles = [...new Set(paidLessons.flatMap((id) => textsOfBlocks(lessonFile(id).blocks)))].filter(notFree);
const privateDir = path.join(REPO, "content/private", COURSE);
const supplementNeedles = [
  ...new Set(
    fs.readdirSync(privateDir).flatMap((f) => textsOfBlocks([{ type: "drill", produce: JSON.parse(fs.readFileSync(path.join(privateDir, f), "utf8")).items.map((e) => e.item) }])),
  ),
].filter(notFree);

/** a string as the body may hold it: as is, JSON-escaped (RSC), escaped twice (the flight data inside HTML <script>) */
const forms = (t) => {
  const once = JSON.stringify(t).slice(1, -1);
  return [...new Set([t, once, JSON.stringify(once).slice(1, -1)])];
};
const found = (body, needles) => needles.filter((n) => forms(n).some((f) => body.includes(f)));

async function get(p, { rsc = false, cookie = null } = {}) {
  const headers = { ...(rsc ? { RSC: "1" } : {}), ...(cookie ? { cookie } : {}) };
  let r = await fetch(BASE + p, { headers, redirect: "manual" });
  // an RSC request without the router's cache-busting `_rsc` is sent (307) to the URL that has it — follow it once
  const location = r.headers.get("location");
  if (rsc && r.status === 307 && location && /[?&]_rsc(=|&|$)/.test(location)) r = await fetch(new URL(location, BASE), { headers, redirect: "manual" });
  return { status: r.status, body: await r.text(), type: r.headers.get("content-type") || "" };
}

const rows = [];
const check = (name, ok, detail = "") => rows.push({ ok, name, detail: String(detail).slice(0, 300) });
/** --selftest: the checks a paid string was planted for (each must FAIL) */
const planted = new Set();
const plant = (id, body, needle) => {
  planted.add(id);
  return `${body}<p>${needle}</p>`;
};

const html = await get(`/${COURSE}/review`);
const rsc = await get(`/${COURSE}/review`, { rsc: true });
if (SELFTEST) html.body = plant("P1", html.body, paidNeedles[0]);

const p1 = [...new Set([...found(html.body, paidNeedles), ...found(rsc.body, paidNeedles)])];
check(`P1 이용권 없이 복습 쪽 HTML · RSC 에 유료 레슨 ${paidLessons.length}개의 글 ${paidNeedles.length}개 중 0`, p1.length === 0, p1.slice(0, 3).join(" | ") || "0");
const p2 = [...new Set([...found(html.body, supplementNeedles), ...found(rsc.body, supplementNeedles)])];
check(`P2 유료 STUDENT 보충 글 ${supplementNeedles.length}개 중 0`, p2.length === 0 && supplementNeedles.length > 0, p2.slice(0, 3).join(" | ") || "0");
const freeItemTexts = FREE.flatMap((id) => {
  const drill = lessonFile(id).blocks.filter((b) => b.type === "drill");
  return drill.flatMap((b) => [...(b.produce || []), ...(b.transfer || [])].map((it) => it.en));
}).filter((t) => typeof t === "string" && t.length >= 10);
const seenRsc = freeItemTexts.filter((t) => forms(t).some((f) => rsc.body.includes(f)));
const seenHtml = freeItemTexts.filter((t) => forms(t).some((f) => html.body.includes(f)));
check(
  `P3 쪽 200 · 제목 '오늘 복습' · RSC 는 text/x-component · 무료 레슨 ④ · ⑤ 문장 ${freeItemTexts.length}개가 HTML · RSC 에 있음(탐침이 글을 봄)`,
  html.status === 200 && rsc.status === 200 && rsc.type.includes("text/x-component") && html.body.includes("오늘 복습") &&
    seenRsc.length === freeItemTexts.length && seenHtml.length === freeItemTexts.length,
  `${html.status} · ${rsc.status} ${rsc.type} · HTML ${seenHtml.length}/${freeItemTexts.length} · RSC ${seenRsc.length}/${freeItemTexts.length}`,
);

// --- 단계 2-나 E2: the wrong-answer list and the topic map, without a licence --------------------------------------------------
const notesHtml = await get(`/${COURSE}/review?notes=1`);
const notesRsc = await get(`/${COURSE}/review?notes=1`, { rsc: true });
if (SELFTEST) notesHtml.body = plant("P6", notesHtml.body, supplementNeedles[0]);
const p6 = [...new Set([...found(notesHtml.body, [...paidNeedles, ...supplementNeedles]), ...found(notesRsc.body, [...paidNeedles, ...supplementNeedles])])];
const seenNotes = freeItemTexts.filter((t) => forms(t).some((f) => notesRsc.body.includes(f)));
check(`P6 이용권 없이 오답노트 쪽 HTML · RSC 에 유료 레슨 글 · 보충 글 ${paidNeedles.length + supplementNeedles.length}개 중 0 · 무료 레슨 문항 글 ${freeItemTexts.length}개는 있음 · 제목 '오답노트'`,
  notesHtml.status === 200 && notesRsc.status === 200 && p6.length === 0 && seenNotes.length === freeItemTexts.length && notesHtml.body.includes("오답노트"),
  `${notesHtml.status} · ${notesRsc.status} · 유료 ${p6.length}${p6.length ? ` (${p6[0]})` : ""} · 무료 ${seenNotes.length}/${freeItemTexts.length}`);
const allLessonNeedles = [...new Set([...paidNeedles, ...supplementNeedles, ...freeTexts])];
const lastTopic = index.groups.length;
let p7 = [];
const p7Pages = [];
for (const topic of [1, 2, lastTopic]) {
  const h = await get(`/${COURSE}/map?topic=${topic}`);
  const r = await get(`/${COURSE}/map?topic=${topic}`, { rsc: true });
  // 점검 17: a paid string planted in TOPIC 1's map page must make P7 fail
  if (SELFTEST && topic === 1) h.body = plant("P7", h.body, paidNeedles[1]);
  p7Pages.push(`${topic}:${h.status}/${r.status}${h.body.includes("이용권이 있으면") ? "" : "(안내 없음)"}`);
  p7 = [...p7, ...found(h.body, allLessonNeedles), ...found(r.body, allLessonNeedles)];
  if (h.status !== 200 || r.status !== 200 || !h.body.includes("이용권이 있으면")) p7.push(`TOPIC ${topic} 쪽 ${h.status}`);
}
check(`P7 이용권 없이 구성도 쪽(TOPIC 1 · 2 · ${lastTopic}) HTML · RSC 에 레슨 글 ${allLessonNeedles.length}개(무료 레슨 것까지) 중 0 · 안내 한 줄`,
  p7.length === 0, `${p7Pages.join(" ")} · ${[...new Set(p7)].slice(0, 2).join(" | ") || 0}`);

// --- with a licence (a dev server with throwaway secrets) --------------------------------------------------------------
const secretsFile = arg("secrets");
if (secretsFile) {
  const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
  const makeKey = (plan) => {
    const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
    const checksum = crypto.createHmac("sha256", sec.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
    return `KIG-${plan}-${nonce}-${checksum}`;
  };
  const activated = await fetch(`${BASE}/api/license/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: makeKey("STU1Y"), deviceId: `review-probe-${Date.now()}`, deviceName: "review leak probe" }),
  });
  const cookie = (activated.headers.getSetCookie?.() || []).map((s) => s.split(";")[0]).filter((s) => s.startsWith("kig_license_session=")).join("; ");
  const act = await activated.json().catch(() => ({}));
  if (!act.success || !cookie) {
    check("P4 이용권 등록", false, `${activated.status} ${act.error || ""}`);
  } else {
    const lh = await get(`/${COURSE}/review`, { cookie });
    const lr = await get(`/${COURSE}/review`, { rsc: true, cookie });
    const allNeedles = [...new Set([...paidNeedles, ...supplementNeedles, ...freeTexts])];
    const p4 = [...new Set([...found(lh.body, allNeedles), ...found(lr.body, allNeedles)])];
    check(`P4 이용권(STUDENT) 복습 쪽 HTML · RSC 에 레슨 글 ${allNeedles.length}개(무료 레슨 것까지) 중 0 · 무료 안내 없음 · 제목 '오늘 복습'`,
      lh.status === 200 && lr.status === 200 && p4.length === 0 && !lh.body.includes('data-kig-paid-extra="license"') && lh.body.includes("오늘 복습"),
      `${lh.status} · ${lr.status} · 글 ${p4.length}${p4.length ? ` (${p4.slice(0, 2).join(" | ")})` : ""} · 무료 안내 ${lh.body.includes('data-kig-paid-extra="license"')}`);

    // a device record: pg01-1 · pg01-2 and a locked TOPIC 2 lesson finished yesterday (the engine's shape, written out)
    const yesterday = new Date(Date.now() - 86_400_000);
    const learningDay = (ms) => new Date(ms + 5 * 3_600_000).toISOString().slice(0, 10);
    const dayBefore = learningDay(yesterday.getTime());
    const next = learningDay(yesterday.getTime() + 86_400_000);
    const record = { v: 1, course: COURSE, lessons: {}, items: {}, log: [], reports: [], lastStudyDay: dayBefore };
    const second = index.groups[1].lessons[0];
    for (const id of [...FREE, second]) {
      record.lessons[id] = { at: yesterday.toISOString(), day: dayBefore };
      const drill = lessonFile(id).blocks.filter((b) => b.type === "drill");
      const entries = [
        ...drill.flatMap((b) => (b.produce || []).map((i) => [i.id, "produce"])),
        ...drill.flatMap((b) => (b.transfer || []).map((i) => [i.id, "transfer"])),
        ...drill.flatMap((b) => (b.select || []).filter((i) => !i.reserve).map((i) => [i.id, i.kind])),
      ];
      for (const [key, kind] of entries) {
        record.items[key] = { lessonId: id, kind, stage: "learning", firstDay: dayBefore, dueDay: next, step: 0, passDays: [], lastDay: null, lastCorrect: null, reviewDay: null, lapses: 0 };
      }
    }
    const api = await fetch(`${BASE}/api/learning/${COURSE}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ record, owner: null }) });
    const text = await api.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {}
    const planKeys = data && data.plan ? data.plan.items.map((i) => i.key) : [];
    const itemKeys = data && data.items ? Object.keys(data.items) : [];
    const lockedKeys = [...planKeys, ...itemKeys].filter((k) => !FREE.some((id) => k.startsWith(`${id}:`)));
    const planSet = new Set(planKeys);
    const everyItem = index.lessons.flatMap((l) => {
      const drill = lessonFile(l.id).blocks.filter((b) => b.type === "drill");
      return drill.flatMap((b) => [...(b.produce || []), ...(b.transfer || []), ...(b.select || [])]);
    });
    const planWords = everyItem.filter((i) => planSet.has(i.id)).flatMap((i) => textsOfBlocks([{ type: "drill", produce: [i] }]));
    const outside = [...new Set(everyItem.filter((i) => !planSet.has(i.id)).flatMap((i) => textsOfBlocks([{ type: "drill", produce: [i] }])))].filter((t) => !planWords.some((p) => p.includes(t)));
    const p5 = found(text, outside);
    check(`P5 API(이용권 · 시계는 이 서버): 문항 열쇠 = 계획 열쇠(${planSet.size}) · 잠긴 ${second} 문항 0 · 계획 밖 문항의 글 ${outside.length}개 중 0 · 계획 날짜 = 서버의 오늘`,
      api.status === 200 && data && data.success && planSet.size > 0 && itemKeys.length === planSet.size && itemKeys.every((k) => planSet.has(k)) && lockedKeys.length === 0 && p5.length === 0 && data.plan.day === learningDay(Date.now()),
      `${api.status} 계획 ${planSet.size} · 문항 ${itemKeys.length} · 잠긴 ${lockedKeys.length} · 새어 나간 글 ${p5.length} · day ${data && data.plan && data.plan.day}`);

    // ---- 단계 2-나 E2 with a licence ----
    const nh = await get(`/${COURSE}/review?notes=1`, { cookie });
    const nr = await get(`/${COURSE}/review?notes=1`, { rsc: true, cookie });
    // 점검 17: a paid string planted in the licensed wrong-answer list's page must make P8 fail
    if (SELFTEST) nh.body = plant("P8", nh.body, paidNeedles[2]);
    const p8 = [...new Set([...found(nh.body, allNeedles), ...found(nr.body, allNeedles)])];
    check(`P8 이용권(STUDENT) 오답노트 쪽 HTML · RSC 에 레슨 글 ${allNeedles.length}개(무료 레슨 것까지) 중 0 · 무료 안내 없음 · 제목 '오답노트'`,
      nh.status === 200 && nr.status === 200 && p8.length === 0 && !nh.body.includes('data-kig-paid-extra="license"') && nh.body.includes("오답노트"),
      `${nh.status} · ${nr.status} · 글 ${p8.length}${p8.length ? ` (${p8.slice(0, 2).join(" | ")})` : ""}`);

    // the wrong-answer list: two items of each lesson (the free two and the locked TOPIC 2 one) answered wrong yesterday
    const wrongRecord = JSON.parse(JSON.stringify(record));
    const wrongBy = {};
    for (const id of [...FREE, second]) {
      wrongBy[id] = Object.keys(wrongRecord.items).filter((k) => k.startsWith(`${id}:`)).slice(0, 2);
      for (const key of wrongBy[id]) Object.assign(wrongRecord.items[key], { lastDay: dayBefore, lastCorrect: false, reviewDay: dayBefore, lapses: 1, lastWrong: "zq probe answer", dueDay: next });
    }
    const owner = data && data.owner;
    const notesCall = async (extra) => {
      const res = await fetch(`${BASE}/api/learning/${COURSE}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ record: wrongRecord, owner, view: "notes", ...extra }) });
      const body = await res.text();
      let json = null;
      try {
        json = JSON.parse(body);
      } catch {}
      return { status: res.status, body, json };
    };
    const itemWords = (keys) => everyItem.filter((i) => keys.includes(i.id)).flatMap((i) => textsOfBlocks([{ type: "drill", produce: [i] }]));
    const n0 = await notesCall({});
    const listed = n0.json && n0.json.notes ? n0.json.notes.map((l) => l.lessonId).sort() : [];
    const n0Leak = found(n0.body, [...new Set(everyItem.flatMap((i) => textsOfBlocks([{ type: "drill", produce: [i] }])))]);
    const n1 = await notesCall({ lesson: FREE[1] });
    const mine = itemWords(wrongBy[FREE[1]]);
    const notMine = [...new Set(everyItem.filter((i) => !wrongBy[FREE[1]].includes(i.id)).flatMap((i) => textsOfBlocks([{ type: "drill", produce: [i] }])))].filter((t) => !mine.some((m) => m.includes(t)));
    const n1Leak = found(n1.body, notMine);
    const n1Keys = n1.json && n1.json.items ? Object.keys(n1.json.items).sort() : [];
    const n2 = await notesCall({ lesson: second });
    const n2Leak = found(n2.body, itemWords(Object.keys(record.items).filter((k) => k.startsWith(`${second}:`))));
    check(`P9 API view "notes": 목록은 열린 ${FREE.join(" · ")} 것만(잠긴 ${second} 없음) · 레슨 없이 물으면 문항 글 0 · lesson=${FREE[1]} 이면 그 레슨 틀린 문항 ${wrongBy[FREE[1]].length}개만(다른 문항 글 ${notMine.length}개 중 0) · 잠긴 ${second} 을 물으면 0`,
      n0.status === 200 && JSON.stringify(listed) === JSON.stringify([...FREE].sort()) && Object.keys(n0.json.items).length === 0 && n0Leak.length === 0 &&
        n1.status === 200 && JSON.stringify(n1Keys) === JSON.stringify([...wrongBy[FREE[1]]].sort()) && n1Leak.length === 0 && found(n1.body, mine).length > 0 &&
        n2.status === 200 && Object.keys(n2.json.items).length === 0 && n2Leak.length === 0,
      `목록 ${listed.join(",")} · 글 ${n0Leak.length} · ${FREE[1]} 열쇠 ${n1Keys.join(",")} · 다른 글 ${n1Leak.length}${n1Leak.length ? ` (${n1Leak[0]})` : ""} · ${second} ${n2.json && Object.keys(n2.json.items).length}/${n2Leak.length}`);

    // the topic map: TOPIC 1 open, TOPIC 2 locked for this new licence
    const mapWordsOf = (ids) => ids.flatMap((id) => {
      const blocks = lessonFile(id).blocks;
      const rule = blocks.find((b) => b.type === "rule");
      const anchor = (blocks.find((b) => b.type === "anchors") || { items: [] }).items[0];
      return [rule && rule.title, anchor && anchor.en].filter((t) => typeof t === "string" && t.length >= 8);
    });
    const topic1 = index.groups[0].lessons;
    // E2 수정: the map is the topic's END — before TOPIC 1's lessons the page has the line and none of their words
    const m0h = await get(`/${COURSE}/map?topic=1`, { cookie });
    const m0r = await get(`/${COURSE}/map?topic=1`, { rsc: true, cookie });
    const m0Leak = [...found(m0h.body, allNeedles), ...found(m0r.body, allNeedles)];
    check(`P10a 이용권 구성도(TOPIC 1 레슨 전): '대주제의 강의를 마친 뒤' · 레슨 글 ${allNeedles.length}개 중 0(HTML · RSC)`,
      m0h.status === 200 && m0h.body.includes("대주제의 강의를 마친 뒤") && m0Leak.length === 0, `${m0h.status} · 글 ${m0Leak.length}${m0Leak.length ? ` (${m0Leak[0]})` : ""}`);
    await fetch(`${BASE}/api/progress/${COURSE}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ updates: topic1.map((lessonId) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() })) }),
    });
    const m1h = await get(`/${COURSE}/map?topic=1`, { cookie });
    const m1r = await get(`/${COURSE}/map?topic=1`, { rsc: true, cookie });
    const m1Seen = mapWordsOf(topic1).filter((t) => forms(t).some((f) => m1h.body.includes(f)));
    const otherLessons = index.lessons.map((l) => l.id).filter((id) => !topic1.includes(id));
    const otherWords = [...new Set(otherLessons.flatMap((id) => textsOfBlocks(lessonFile(id).blocks)))].filter((t) => !mapWordsOf(topic1).some((m) => m.includes(t)));
    const m1Leak = [...found(m1h.body, otherWords), ...found(m1r.body, otherWords)];
    const m2h = await get(`/${COURSE}/map?topic=2`, { cookie });
    const m2r = await get(`/${COURSE}/map?topic=2`, { rsc: true, cookie });
    const m2Leak = [...found(m2h.body, allNeedles), ...found(m2r.body, allNeedles)];
    check(`P10 이용권 구성도: 열린 TOPIC 1 — 레슨 ${topic1.length}개의 규칙 제목 · 첫 예문 ${mapWordsOf(topic1).length}개가 있음 · 다른 대주제 레슨 글 ${otherWords.length}개 중 0 / 잠긴 TOPIC 2 — 레슨 글 0 · '아직 열리지 않았어요'`,
      m1h.status === 200 && m1Seen.length === mapWordsOf(topic1).length && m1Leak.length === 0 && m2h.status === 200 && m2Leak.length === 0 && m2h.body.includes("아직 열리지 않았어요"),
      `TOPIC 1 ${m1Seen.length}/${mapWordsOf(topic1).length} · 다른 글 ${m1Leak.length}${m1Leak.length ? ` (${m1Leak[0]})` : ""} · TOPIC 2 글 ${m2Leak.length}`);
  }
}

for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${SELFTEST ? "[--selftest] " : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${rows.length} · HTML ${html.body.length}자 · RSC ${rsc.body.length}자`);
if (SELFTEST) {
  // every check a string was planted for must FAIL; one planned but not planted (P8 with --secrets and no licence) or planted
  // and still PASS means the probe cannot be trusted there — exit 2, not the 1 a working self-test gives
  const expected = ["P1", "P6", "P7", ...(secretsFile ? ["P8"] : [])];
  const caught = expected.filter((id) => planted.has(id) && rows.some((r) => !r.ok && r.name.startsWith(`${id} `)));
  const notPlanted = expected.filter((id) => !planted.has(id));
  const missed = expected.filter((id) => planted.has(id) && !caught.includes(id));
  console.log(
    `[--selftest] 심은 칸 ${[...planted].join(" · ")} → FAIL 로 잡힘 ${caught.join(" · ") || "없음"}` +
      (missed.length ? ` · 못 잡음 ${missed.join(" · ")}` : "") +
      (notPlanted.length ? ` · 심지 못함 ${notPlanted.join(" · ")}` : "") +
      (secretsFile ? "" : " (P8 은 --secrets 일 때 — 이용권 쪽)"),
  );
  process.exit(missed.length || notPlanted.length ? 2 : 1);
}
process.exit(failed ? 1 : 0);
