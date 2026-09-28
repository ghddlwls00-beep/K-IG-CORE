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
 *   --selftest : 받은 HTML 에 유료 문장 하나를 넣은 사본으로 P1 이 1 을 세는지(탐침이 실패할 수 있음) — exit 1 이어야 맞음
 *   --secrets <json> : 이용권 쪽도 가짜 없이(check-progress-live.mjs 와 같은 준비 — 버리는 시험 비밀값 {LICENSE_SALT,
 *     LICENSE_SECRET} 을 넣고 켠 `npx next dev -p 3472`, R2 값 없이 → 로컬 대체 저장소 data/*.json). STUDENT 이용권을 등록해
 *     P4 이용권 복습 쪽 HTML · RSC 에 레슨 글(무료 레슨 것까지) 0 — 문항은 API 로만 옴 · 무료 안내 표시 없음
 *     P5 POST /api/learning/passoff-grammar(어제 끝낸 pg01-1 · pg01-2 · 잠긴 TOPIC 2 레슨) → 문항 열쇠 = 계획 열쇠 · 잠긴 대주제
 *        문항 0 · 계획 밖 문항의 글 0 · 계획 날짜 = 서버의 오늘
 *     끝나면 그 작업 트리의 data/license-devices.json · passoff-progress.json · learning-passoff-grammar.json 을 지운다.
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

const html = await get(`/${COURSE}/review`);
const rsc = await get(`/${COURSE}/review`, { rsc: true });
if (SELFTEST) html.body += `<p>${paidNeedles[0]}</p>`;

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
  }
}

for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${SELFTEST ? "[--selftest] " : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${rows.length} · HTML ${html.body.length}자 · RSC ${rsc.body.length}자`);
process.exit(failed ? 1 : 0);
