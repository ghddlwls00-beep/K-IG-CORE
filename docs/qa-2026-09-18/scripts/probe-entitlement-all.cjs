#!/usr/bin/env node
/**
 * Phase 3 — EVERY in-scope lesson route with NO cookies, READ-ONLY (plain GET).
 * Adapted from docs/qa-2026-09-17/scripts/probe-entitlement-all.cjs:
 *   - CNN excluded (retired, owner rule)
 *   - each route is fetched twice: the HTML document AND the RSC flight payload
 *     (header `RSC: 1`) a client-side navigation would receive
 *
 *   paid lesson → paywall marker present, none of the lesson's own text
 *   free lesson → no paywall, lesson's own text present
 *
 * "Own text" = up to three distinctive strings from the data file. Strings that
 * also appear on the home page (site chrome) are dropped and recorded.
 *
 * Output: out/entitlement-all.json + printed summary · exit 1 when any route fails (회귀 점검 1002 — 전에는 FAIL 을 찍고도 exit 0).
 *
 * 회귀 점검 1002 단계 0 (2026-10-04): ADULT(2026-10-02 · 55강의)가 과정 목록에 없어 a2-1~a12-3 을 한 번도 열어 보지 않았다.
 *   과정 목록은 이제 validRoutes.json 의 과정 전부(폐지 CNN 만 뺌) — 새 과정이 생기면 저절로 들어오고, 아래 KNOWN 에 없는 과정이면
 *   멈춘다(바늘을 뽑는 법을 모르는 과정을 '바늘 0' 으로 통과시키지 않게). ADULT 의 바늘: 문장 · 한국어 줄(paragraph ko) · 덩어리 · 낱말 뜻.
 *   ADULT 잠김 표시는 'STUDENT PASS · ALL-PASS'(src/app/adult/[lesson]/page.tsx → LessonPaywall studentPassCourse).
 *   깨기(운영 상태는 안 바꿈 — 이 도구의 판정만 일부러 틀리게):
 *     --break=adult-free   유료 ADULT a2-1 을 무료 목록 사본(메모리)에 넣음 → 운영은 잠김 화면 → 그 주소 FAIL · exit 1
 *     --break=adult-leak   유료 ADULT a2-1 의 받은 HTML · RSC 사본(메모리)에 그 강의 바늘 하나를 심음 → 유출로 FAIL · exit 1
 *                          (심을 바늘이 없으면 exit 2 — 아무것도 증명 못 함)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["adult-free", "adult-leak"].includes(BREAK)) { console.error(`모르는 --break=${BREAK} (adult-free · adult-leak)`); process.exit(2); }
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
// 회귀 점검 1002: validRoutes 의 과정 전부(CNN 폐지) — 바늘 뽑는 법을 아는 과정만(KNOWN), 모르는 과정이 생기면 멈춤
const KNOWN = ["student", "adult", "passoff-grammar", "phonics", "grammar1", "grammar2", "ld", "reading"];
const RETIRED = new Set(["cnn"]);
const COURSES = Object.keys(routes).filter((c) => !RETIRED.has(c));
{
  const unknown = COURSES.filter((c) => !KNOWN.includes(c));
  if (unknown.length) { console.error(`!!! validRoutes 에 이 도구가 모르는 과정: ${unknown.join(", ")} — 바늘 뽑는 법을 넣고 다시 · exit 2`); process.exit(2); }
}
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = {};
// a key may be quoted — "passoff-grammar" (2026-09-27): the unquoted-only pattern skipped it and made its free lessons paid
const KEY = /^\s*"?([a-z0-9-]+)"?:\s*\[/;
for (const line of freeBlock.split("\n")) {
  const m = line.match(KEY);
  if (m) FREE[m[1]] = new Set();
}
{
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(KEY);
    if (m) cur = m[1];
    if (cur) for (const x of (m ? line.slice(line.indexOf("[")) : line).matchAll(/"([a-z0-9-]+)"/g)) FREE[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
if (!FREE.adult || !FREE.adult.size) { console.error("!!! license.ts FREE_PREVIEW_LESSON_IDS 에서 adult 무료 강의를 못 읽음 · exit 2"); process.exit(2); }
if (BREAK === "adult-free") { FREE.adult.add("a2-1"); console.log("[일부러 깸] 유료 ADULT a2-1 을 무료 목록 사본에 넣음 — 운영은 잠김 화면이므로 a2-1 이 FAIL 이어야 함"); }
const isFree = (course, id) => {
  const set = FREE[course];
  if (!set) return false;
  let x = id;
  for (;;) {
    if (set.has(x)) return true;
    const s = x.replace(/-\d+$/, "");
    if (s === x) return false;
    x = s;
  }
};
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
// "STUDENT PASS · ALL-PASS" — PASS-OFF GRAMMAR's paywall (either pass opens it, LessonPaywall.tsx)
const PAYWALL = /ALL-PASS ONLY|STUDENT PASS ONLY|STUDENT PASS · ALL-PASS|VIP ALL-PASS REQUIRED/;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const jsonEsc = (s) => JSON.stringify(s).slice(1, -1);

function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}

function needles(course, id) {
  const file = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(file)) return [];
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  if (course === "adult") return adultNeedles(d);
  let c = [];
  if (course === "ld") c.push(...(scripts[id.replace(/-1$/, "")] || []).map((r) => r.en));
  collectStrings(d.blocks || d, c);
  if (course === "reading") c.push(...(d.readingSentences || []).map((s) => s.english));
  c = c.filter((t) => typeof t === "string").map((t) => t.trim())
    .filter((t) => !/^(https?:|\/)/.test(t))
    // lesson code titles like "[ mv1-03 ]" / "[ Page 042-1 ]" are shown on the paywall on purpose
    .filter((t) => !/^\[\s*[^\]]{1,20}\s*\]$/.test(t))
    .filter((t) => t.length >= 14 || (course === "phonics" && t.length >= 9));
  return [...new Set(c)].sort((a, b) => b.length - a.length).slice(0, 3).map((t) => t.slice(0, 32));
}

/**
 * ADULT (회귀 점검 1002): 네 종류에서 하나씩 — 가장 긴 영어 문장 · 가장 긴 한국어 줄(paragraph ko) · 가장 긴 한국어 덩어리 ·
 * 가장 긴 낱말 뜻. 전처럼 '가장 긴 셋' 이면 셋 다 영어 문장이라 한국어 줄 · 덩어리 · 뜻이 새는 것을 못 본다.
 * (덩어리 · 뜻은 짧아 잠김 화면의 글과 우연히 겹칠 수 있어 8 · 6글자 이상만.)
 */
function adultNeedles(d) {
  const items = (d.blocks || []).filter((b) => b && b.type === "sentences").flatMap((b) => b.items || []);
  const longest = (arr, min) => arr.filter((t) => typeof t === "string" && t.trim().length >= min).map((t) => t.trim()).sort((a, b) => b.length - a.length)[0] || null;
  const picks = [
    longest(items.map((it) => it.text), 14),
    longest((d.blocks || []).filter((b) => b && b.type === "paragraph" && b.lang === "ko").map((b) => b.text), 10),
    longest(items.flatMap((it) => (it.chunks || []).map((c) => c && c.ko)), 8),
    longest(items.flatMap((it) => (it.words || []).map((w) => w && w.meaning)), 6),
  ].filter(Boolean);
  return [...new Set(picks)].map((t) => t.slice(0, 32));
}

// PASS-OFF GRAMMAR (2026-09-27): a free preview's paid STUDENT items live in
// content/private/passoff-grammar/<id>.paid.json and are added on the server for a licence only —
// an anonymous request must carry none of them, in the HTML or in the RSC payload.
function heldBack(course, id) {
  const file = path.join(REPO, "content/private", course, `${id}.paid.json`);
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const e of JSON.parse(fs.readFileSync(file, "utf8")).items || []) {
    for (const t of [e.item && e.item.en, e.item && e.item.ko]) if (typeof t === "string" && t.trim()) out.push(t.trim().slice(0, 32));
  }
  return [...new Set(out)];
}

async function get1(url, headers) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers, redirect: "manual" });
      const text = await r.text();
      if (r.status < 500 && r.status !== 429) return { status: r.status, text, location: r.headers.get("location") };
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  return { status: -1, text: "", location: null };
}
// Follows redirects by hand so the chain is recorded (e.g. /grammar1/gh1-031 → /grammar1/gh1-030).
async function get(url, headers) {
  const chain = [];
  let cur = url;
  for (let hop = 0; hop < 5; hop++) {
    const r = await get1(cur, headers);
    if (r.status >= 300 && r.status < 400 && r.location) {
      chain.push(`${r.status} ${new URL(r.location, cur).pathname}`);
      cur = new URL(r.location, cur).href;
      continue;
    }
    return { ...r, chain, finalPath: new URL(cur).pathname };
  }
  return { status: -2, text: "", chain, finalPath: new URL(cur).pathname };
}

(async () => {
  const chrome = await (await fetch(`${BASE}/`)).text();
  const inChrome = (n) => chrome.includes(n) || chrome.includes(esc(n)) || chrome.includes(jsonEsc(n));
  const list = COURSES.flatMap((course) => (routes[course] || []).map((id) => ({ course, id })));
  const results = [];
  let i = 0;
  async function worker() {
    for (;;) {
      const k = i++;
      if (k >= list.length) return;
      const { course, id } = list[k];
      const free = isFree(course, id);
      const all = needles(course, id);
      const ns = all.filter((n) => !inChrome(n));
      const chromeNeedles = all.filter(inChrome);
      const held = free ? heldBack(course, id) : [];
      const url = `${BASE}/${course}/${id}`;
      const html = await get(url, {});
      const rsc = await get(url, { RSC: "1" });
      if (BREAK === "adult-leak" && course === "adult" && id === "a2-1") {
        if (!ns.length) { console.log("!!! --break=adult-leak: a2-1 에 심을 바늘이 없음 — 아무것도 증명 못 함 · exit 2"); process.exit(2); }
        // 한국어 줄 바늘(있으면) — 영어 문장만 보는 옛 바늘로는 못 잡는 것
        const plant = ns.find((n) => /[가-힣]/.test(n)) || ns[0];
        html.text += `<div>${esc(plant)}</div>`;
        rsc.text += JSON.stringify(plant);
        console.log(`[일부러 깸] a2-1 의 받은 HTML · RSC 사본에 그 강의 바늘을 심음: ${JSON.stringify(plant)}`);
      }
      // HTML: paid → paywall marker in server HTML and no lesson text; free → no paywall and lesson text.
      // RSC: the paywall is a client component, so its marker text is not in the flight payload;
      //      paid → no lesson text; free → recorded only (lesson text may arrive as client props).
      const judge = (res, kind) => {
        const body = kind === "html" ? res.text.replace(/<script[\s\S]*?<\/script>/g, "") : res.text;
        const paywall = PAYWALL.test(body);
        const found = ns.filter((n) => res.text.includes(n) || res.text.includes(esc(n)) || res.text.includes(jsonEsc(n)));
        const heldFound = held.filter((n) => res.text.includes(n) || res.text.includes(esc(n)) || res.text.includes(jsonEsc(n)));
        let pass;
        if (kind === "html") pass = res.status === 200 && (free ? !paywall && (ns.length === 0 || found.length > 0) : paywall && found.length === 0);
        else pass = res.status === 200 && (free ? true : found.length === 0);
        pass = pass && heldFound.length === 0;
        return { status: res.status, chain: res.chain, finalPath: res.finalPath, paywall, found, ...(held.length ? { heldBack: held.length, heldFound } : {}), pass, bytes: res.text.length };
      };
      const h = judge(html, "html");
      const r = judge(rsc, "rsc");
      results.push({ course, id, free, needles: ns, ...(chromeNeedles.length ? { chromeNeedles } : {}), html: h, rsc: r, pass: h.pass && r.pass });
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  results.sort((a, b) => (a.course + a.id).localeCompare(b.course + b.id));
  fs.mkdirSync(OUT, { recursive: true });
  // 깨기 결과는 진짜 결과 파일을 덮지 않는다
  fs.writeFileSync(path.join(OUT, BREAK ? `entitlement-all-break-${BREAK}.json` : "entitlement-all.json"), JSON.stringify({ at: new Date().toISOString(), base: BASE, ...(BREAK ? { break: BREAK } : {}), results }, null, 1));
  const by = {};
  for (const r of results) {
    const key = `${r.course} ${r.free ? "free" : "paid"}`;
    by[key] ||= { total: 0, pass: 0, htmlPass: 0, rscPass: 0, noNeedle: 0, redirected: 0 };
    by[key].total++;
    if (r.html.chain.length) by[key].redirected++;
    if (r.pass) by[key].pass++;
    if (r.html.pass) by[key].htmlPass++;
    if (r.rsc.pass) by[key].rscPass++;
    if (!r.needles.length) by[key].noNeedle++;
  }
  console.table(by);
  const fails = results.filter((r) => !r.pass);
  console.log(`${results.length} routes: ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  for (const f of fails.slice(0, 60)) console.log(JSON.stringify({ course: f.course, id: f.id, free: f.free, html: { ...f.html }, rsc: { ...f.rsc }, needles: f.needles }));
  // 명령서 ① · ② 의 숫자(과정마다): 유료 — 잠김(HTML 잠김 표시 + 바늘 0, RSC 바늘 0) / 열림 · 무료 — 열림 / 전체
  const per = {};
  for (const r of results) {
    const p = (per[r.course] ||= { routes: 0, paid: 0, paidLocked: 0, paidOpenOrLeak: 0, free: 0, freeOpen: 0, noNeedle: 0 });
    p.routes++;
    if (!r.needles.length) p.noNeedle++;
    if (r.free) { p.free++; if (r.pass) p.freeOpen++; } else { p.paid++; if (r.pass) p.paidLocked++; else p.paidOpenOrLeak++; }
  }
  for (const [c, p] of Object.entries(per)) console.log(`  ${c.padEnd(16)} 주소 ${p.routes} · 유료 잠김 ${p.paidLocked}/${p.paid} (열림 · 유출 ${p.paidOpenOrLeak}) · 무료 열림 ${p.freeOpen}/${p.free} · 바늘 없는 주소 ${p.noNeedle}`);
  console.log(`과정 ${Object.keys(per).length}개(${Object.keys(per).join(" · ")})${BREAK ? ` [일부러 깸: ${BREAK}]` : ""} → exit ${fails.length ? 1 : 0}`);
  process.exitCode = fails.length ? 1 : 0;
})();
