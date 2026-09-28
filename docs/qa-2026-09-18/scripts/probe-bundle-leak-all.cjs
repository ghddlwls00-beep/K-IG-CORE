#!/usr/bin/env node
/**
 * Phase 3 — does ANY public (anonymous) JavaScript or public JSON carry paid lesson text?
 * Anonymous GETs only.
 *
 * Wider than docs/qa-2026-09-17/scripts/probe-bundle-leak-scope.cjs (one free page
 * per course, 3 strings per lesson):
 *   1. Chunk URLs are collected from the anonymous HTML AND RSC payload of EVERY
 *      in-scope route (home, tabs, course lists, all 1,623 lesson routes, admin).
 *   2. Every unique chunk is downloaded and normalised (letters/digits/Hangul only).
 *   3. EVERY string of every PAID lesson (flat length >= 20) is searched — English
 *      and Korean, LISTENING script lines, READING sentences, READING vocabulary
 *      records, VOCA word-grid rows as ordered runs — minus strings that also exist
 *      in FREE lessons or in the anonymous home HTML (not a leak).
 *   4. The same needles are searched in /search-index.json and any other public
 *      JSON the pages reference.
 * Output: out/bundle-leak-all.json · exit 1 when anything leaks (inJs · inJson > 0) or a chunk could not be read.
 *
 * 7단계 7-1 k: a lesson's own title-type fields (title · label · menuLabel · series · variant) that the
 * ANONYMOUS course list page (/student, /phonics, …) already shows are not a leak — they were counted as
 * one (2026-09-23 after 950417d: STUDENT inJson 145 · 79 lessons, every one a list title, real leaks 0).
 * They are left out like the home HTML and counted apart (skippedOnList). Only title-type fields are
 * excused: lesson BODY text that showed up on a list page would still count as a leak.
 *
 * 점검 2026-09-27(PASS-OFF GRAMMAR 단계 A): a paid needle whose letters are ALSO app code that was there before the lesson —
 * the JS carries the code, not the lesson. pg06-3 (기수·서수) lists "one, two, three, … ten", and LISTENING's hint-chip code
 * (src/components/LdLearningView.tsx NUMBER_WORDS, since 2026-09-25) holds the same words in the same order, so the chunk that
 * ships the LISTENING view matched four pg06-3 lines. Such a needle is counted apart (inAppCode, with the file and line as
 * evidence) — neither clean nor a leak — only when ALL of these hold (see appCodeEvidence):
 *   - it is a JS hit (a JSON file is data, never code);
 *   - its letters are in a src/ .ts/.tsx file (not src/lib/generated) AS IT WAS at APP_CODE_REV, the commit before PASS-OFF
 *     GRAMMAR was registered — read from git, so no code written after the lessons can excuse a line;
 *   - its lesson (or held-back) file did not exist at APP_CODE_REV, so that code cannot be a copy of it.
 *   node probe-bundle-leak-all.cjs
 *   node probe-bundle-leak-all.cjs --break=index      일부러 깨기: 유료 강의 본문 한 문장을 /search-index.json 사본(메모리)에 넣음 → inJson 1 · exit 1
 *   node probe-bundle-leak-all.cjs --break=js         일부러 깨기: 유료 PASS-OFF 레슨 문장 하나를 JS 사본(메모리)에 넣음 → 앱 코드 예외가 있어도 inJs 1 · exit 1
 *   node probe-bundle-leak-all.cjs --break=app-code   일부러 깨기: 앱 코드 예외를 끔 → 그 바늘들이 다시 유출로 셈 · exit 1
 *   node probe-bundle-leak-all.cjs --break=question   (2026-09-28 새 문제) 유료 강의 문제 물음 하나를 같은 사본에 넣음 → inJson 1 · exit 1
 *   2026-09-28: LISTENING · READING 의 바늘에 그 강의 새 문제(content/questions/<과정>/<본 id>.json)의 물음 · 보기(12글자 이상)도 들어감.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");
const COURSES = ["student", "passoff-grammar", "phonics", "grammar1", "grammar2", "ld", "reading"];
const vr = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = {};
{
  // a key may be quoted — "passoff-grammar" (2026-09-27): the unquoted-only pattern skipped it and made its free lessons paid
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(/^\s*"?([a-z0-9-]+)"?:\s*\[/);
    if (m) { cur = m[1]; FREE[cur] = new Set(); }
    if (cur) for (const x of (m ? line.slice(line.indexOf("[")) : line).matchAll(/"([a-z0-9-]+)"/g)) FREE[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
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
const flat = (s) => (s || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/[^A-Za-z0-9가-힣]+/g, "");
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));

function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}
const META_KEYS = ["title", "label", "menuLabel", "series", "variant"];
function lessonNeedles(course, id) {
  const file = path.join(REPO, "content/lessons", course, `${id}.json`);
  if (!fs.existsSync(file)) return [];
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = [];
  collectStrings(d, out);
  if (course === "ld") for (const r of scripts[id.replace(/-1$/, "")] || []) out.push(r.en, r.ko);
  const meta = new Set(META_KEYS.map((k) => d[k]).filter((v) => typeof v === "string").map(flat));
  const needles = out.filter((s) => typeof s === "string").map((s) => ({ kind: "text", raw: s, f: flat(s), meta: meta.has(flat(s)) })).filter((n) => n.f.length >= 20);
  if (course === "reading") for (const v of d.readingVocabulary || []) needles.push({ kind: "vocab-record", raw: v.word, f: "word" + flat(v.word) + "lemma" + flat(v.lemma) });
  for (const b of d.blocks || []) if (b.type === "wordgrid") for (const row of b.rows || []) { const f = flat(row.join(" ")); if (f.length >= 20) needles.push({ kind: "grid-row", raw: row.join(" "), f }); }
  // 2026-09-28 새 문제: the lesson's comprehension questions (content/questions/<course>/<main id>.json) — prompts and options of
  // 12+ letters (Korean is dense: 12 letters is already a specific phrase)
  const qFile = path.join(REPO, "content/questions", course, `${id.replace(/-\d+$/, "")}.json`);
  if ((course === "ld" || course === "reading") && fs.existsSync(qFile)) {
    for (const q of JSON.parse(fs.readFileSync(qFile, "utf8")).questions || []) {
      for (const t of [q.prompt, ...(q.options || [])]) {
        const f = flat(t);
        if (f.length >= 12) needles.push({ kind: "question", raw: t, f });
      }
    }
  }
  return needles;
}

// PASS-OFF GRAMMAR (2026-09-27): a free preview's paid STUDENT items are held in
// content/private/passoff-grammar/<id>.paid.json — no lesson file holds them, so they are a paid "lesson" of their own.
function heldNeedles(course) {
  const dir = path.join(REPO, "content/private", course);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".paid.json")).map((f) => {
    const strings = [];
    for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).items || []) collectStrings(e.item, strings);
    const needles = strings.filter((s) => typeof s === "string").map((s) => ({ kind: "held-back", raw: s, f: flat(s), meta: false })).filter((n) => n.f.length >= 20);
    return { id: `${f.replace(/\.paid\.json$/, "")} (held back)`, needles };
  });
}

// ── app code before the lessons (see the header) — read from git once, only when a JS hit asks
const APP_CODE_REV = "4bc17f3^"; // 4bc17f3 = "PASS-OFF GRAMMAR 코드 단계 A: 과정 등록 …"
let appCode = null; // [{ file, flat, lineAt }]
const existedAtRev = new Map(); // "course/id" → boolean
function gitBatch(specs) {
  const { spawnSync } = require("child_process");
  const res = spawnSync("git", ["cat-file", "--batch"], { cwd: REPO, input: specs.join("\n") + "\n", maxBuffer: 1 << 30 });
  if (res.status !== 0) throw new Error(`git cat-file 실패 — 앱 코드 예외를 판정할 수 없음: ${String(res.stderr)}`);
  const out = new Map();
  let at = 0;
  for (const spec of specs) {
    const nl = res.stdout.indexOf(0x0a, at);
    const header = res.stdout.slice(at, nl).toString("utf8");
    at = nl + 1;
    const m = header.match(/^\S+ blob (\d+)$/);
    if (!m) { out.set(spec, null); continue; }
    out.set(spec, res.stdout.slice(at, at + Number(m[1])).toString("utf8"));
    at += Number(m[1]) + 1;
  }
  return out;
}
function loadAppCode() {
  if (appCode) return appCode;
  const { execFileSync } = require("child_process");
  const files = execFileSync("git", ["-c", "core.quotepath=false", "ls-tree", "-r", "--name-only", APP_CODE_REV, "--", "src"], { cwd: REPO, encoding: "utf8" })
    .split(/\r?\n/).filter((f) => /\.(ts|tsx)$/.test(f) && !f.startsWith("src/lib/generated/"));
  if (files.length < 50) throw new Error(`${APP_CODE_REV} 의 src 파일이 ${files.length}개 — 앱 코드를 못 읽음`);
  const texts = gitBatch(files.map((f) => `${APP_CODE_REV}:${f}`));
  appCode = files.map((file) => {
    let flatText = "";
    const lineAt = [];
    String(texts.get(`${APP_CODE_REV}:${file}`) || "").split(/\r?\n/).forEach((line, i) => {
      const f = flat(line);
      flatText += f;
      for (let k = 0; k < f.length; k++) lineAt.push(i + 1);
    });
    return { file, flat: flatText, lineAt };
  });
  return appCode;
}
/** "file:line" of app code at APP_CODE_REV holding the needle's letters — or null (see the header for the three conditions) */
function appCodeEvidence(course, id, n) {
  const key = `${course}/${id}`;
  if (!existedAtRev.has(key)) {
    const rel = / \(held back\)$/.test(id) ? `content/private/${course}/${id.replace(/ \(held back\)$/, "")}.paid.json` : `content/lessons/${course}/${id}.json`;
    existedAtRev.set(key, gitBatch([`${APP_CODE_REV}:${rel}`]).get(`${APP_CODE_REV}:${rel}`) !== null);
  }
  if (existedAtRev.get(key)) return null; // the lesson was there first — the code could be a copy of it
  for (const c of loadAppCode()) {
    const at = c.flat.indexOf(n.f);
    if (at >= 0) return `${c.file}:${c.lineAt[at]} (${APP_CODE_REV})`;
  }
  return null;
}

async function get(url, headers = {}) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers, redirect: "manual" });
      const t = await r.text();
      if (r.status < 500 && r.status !== 429) return { status: r.status, text: t };
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (a + 1)));
  }
  return { status: -1, text: "" };
}

/** 익명으로 모든 공개 페이지 · 청크 · JSON 을 받아 평문(글자만)으로. --cache <파일> 을 주면 있으면 읽고, 없으면 받은 뒤 저장. */
async function crawl() {
  const ci0 = process.argv.indexOf("--cache");
  // --cache 바로 뒤가 경로여야 — 전에는 `--cache --break=index` 가 '--break=index' 라는 파일을 scripts/ 에 만들었다(7단계 7-8 에서 찾아 치움)
  if (ci0 >= 0 && (!process.argv[ci0 + 1] || process.argv[ci0 + 1].startsWith("--"))) throw new Error("--cache 다음에 캐시 파일 경로를 주어야 함");
  const cacheFile = ci0 >= 0 ? path.resolve(process.argv[ci0 + 1]) : null;
  if (cacheFile && fs.existsSync(cacheFile)) {
    const c = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    if (c.base !== BASE) throw new Error(`캐시(${c.base})와 BASE(${BASE})가 다름`);
    console.log(`캐시에서 읽음(${c.at}) — 운영에 다시 요청하지 않음`);
    return c;
  }
  const pages = ["/", "/admin/license", ...((vr.tabs || []).map((t) => `/t/${t}`)), ...COURSES.map((c) => `/${c}`), ...COURSES.flatMap((c) => (vr.lessons[c] || []).map((id) => `/${c}/${id}`))];
  const chunkUrls = new Set();
  const jsonUrls = new Set(["/search-index.json"]);
  let pi = 0;
  const homeHtml = (await get(BASE + "/")).text;
  async function pageWorker() {
    for (;;) {
      const k = pi++;
      if (k >= pages.length) return;
      for (const headers of [{}, { RSC: "1" }]) {
        const { text } = await get(BASE + pages[k], headers);
        for (const m of text.matchAll(/\/?_next\/static\/[^"'\s)\\]+?\.js/g)) chunkUrls.add("/" + m[0].replace(/^\//, ""));
        for (const m of text.matchAll(/["'](\/[^"'\s]+?\.json)["']/g)) jsonUrls.add(m[1]);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, pageWorker));
  console.log(`pages ${pages.length}, unique chunks ${chunkUrls.size}, json ${jsonUrls.size}`);

  let js = "";
  let jsBytes = 0;
  const chunkList = [...chunkUrls];
  let ci = 0;
  const bodies = [];
  async function chunkWorker() {
    for (;;) {
      const k = ci++;
      if (k >= chunkList.length) return;
      const { status, text } = await get(BASE + chunkList[k]);
      bodies.push({ url: chunkList[k], status, bytes: text.length, text });
    }
  }
  await Promise.all(Array.from({ length: 8 }, chunkWorker));
  for (const b of bodies) { jsBytes += b.bytes; js += "\n" + flat(b.text); }
  const jsonBodies = [];
  for (const u of jsonUrls) { const r = await get(BASE + u); jsonBodies.push({ url: u, status: r.status, bytes: r.text.length, flat: flat(r.text) }); }
  // what the anonymous course list pages show (HTML + RSC) — a lesson title there is not a leak (7-1 k)
  let listFlat = "";
  for (const c of COURSES) for (const headers of [{}, { RSC: "1" }]) listFlat += "\n" + flat((await get(BASE + `/${c}`, headers)).text);
  const c = { at: new Date().toISOString(), base: BASE, pages: pages.length, chunkList, badChunks: bodies.filter((b) => b.status !== 200).map((b) => `${b.status} ${b.url}`), js, jsBytes, jsonBodies, homeFlat: flat(homeHtml), listFlat };
  if (cacheFile) { fs.writeFileSync(cacheFile, JSON.stringify(c)); console.log(`캐시에 씀: ${cacheFile}`); }
  return c;
}

(async () => {
  const crawled = await crawl();
  const { pages, chunkList, badChunks, jsBytes, jsonBodies, homeFlat, listFlat } = crawled;
  let js = crawled.js;

  // free strings (not a leak if they also exist in free lessons or home HTML)
  const freeFlat = new Set();
  for (const c of COURSES) for (const id of vr.lessons[c] || []) if (isFree(c, id)) for (const n of lessonNeedles(c, id)) freeFlat.add(n.f);
  const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
  let planted = null;
  if (BREAK === "index") {
    // one paid lesson body sentence into an in-memory copy of the search index
    const idx = jsonBodies.find((j) => j.url === "/search-index.json");
    outer: for (const c of COURSES) for (const id of vr.lessons[c] || []) {
      if (isFree(c, id)) continue;
      for (const n of lessonNeedles(c, id)) if (!n.meta && /^[A-Z][^()]*[.?!]$/.test(n.raw.trim()) && !freeFlat.has(n.f) && !homeFlat.includes(n.f)) { planted = { course: c, id, text: n.raw.slice(0, 80) }; idx.flat += n.f; break outer; }
    }
    console.log(`[일부러 깸] /search-index.json 사본에 유료 본문 한 문장: ${JSON.stringify(planted)}`);
  } else if (BREAK === "js") {
    // one paid PASS-OFF GRAMMAR lesson sentence into an in-memory copy of the JS — the app-code exception must not hide it
    outer: for (const id of vr.lessons["passoff-grammar"] || []) {
      if (isFree("passoff-grammar", id)) continue;
      for (const n of lessonNeedles("passoff-grammar", id)) if (!n.meta && /^[A-Z][^()]*[.?!]$/.test(n.raw.trim()) && !freeFlat.has(n.f) && !homeFlat.includes(n.f) && !js.includes(n.f)) { planted = { course: "passoff-grammar", id, text: n.raw.slice(0, 80) }; js += "\n" + n.f; break outer; }
    }
    if (!planted) throw new Error("--break=js: 심을 유료 PASS-OFF 문장이 없음 — 이 깨기는 아무것도 증명하지 못함");
    console.log(`[일부러 깸] JS 사본에 유료 PASS-OFF 레슨 한 문장: ${JSON.stringify(planted)}`);
  } else if (BREAK === "app-code") {
    console.log("[일부러 깸] 앱 코드 예외를 끔 — 앱 코드와 글자가 같은 바늘도 유출로 셈");
  } else if (BREAK === "question") {
    // 2026-09-28: one paid lesson's question prompt into the in-memory copy — proves the question needles are searched
    const idx = jsonBodies.find((j) => j.url === "/search-index.json");
    outer: for (const c of ["ld", "reading"]) for (const id of vr.lessons[c] || []) {
      if (isFree(c, id)) continue;
      for (const n of lessonNeedles(c, id)) if (n.kind === "question" && !freeFlat.has(n.f) && !homeFlat.includes(n.f)) { planted = { course: c, id, text: n.raw.slice(0, 80) }; idx.flat += n.f; break outer; }
    }
    console.log(`[일부러 깸] /search-index.json 사본에 유료 문제 물음 하나: ${JSON.stringify(planted)}`);
  } else if (BREAK) throw new Error(`모르는 --break=${BREAK}`);

  const result = { at: new Date().toISOString(), base: BASE, pages, chunks: chunkList.length, jsKB: Math.round(jsBytes / 1024), badChunks, json: jsonBodies.map((j) => ({ url: j.url, status: j.status, kb: Math.round(j.bytes / 1024) })), courses: {} };
  for (const c of COURSES) {
    const stat = { paidLessons: 0, needles: 0, skippedAlsoFree: 0, skippedOnList: 0, inJs: 0, inJson: 0, inAppCode: 0, lessonsWithLeak: 0, examples: [], appCodeExamples: [] };
    const paidSets = (vr.lessons[c] || []).filter((id) => !isFree(c, id)).map((id) => ({ id, needles: lessonNeedles(c, id) }));
    for (const { id, needles } of [...paidSets, ...heldNeedles(c)]) {
      stat.paidLessons++;
      let leaked = false;
      const seen = new Set();
      for (const n of needles) {
        if (seen.has(n.f)) continue;
        seen.add(n.f);
        if (freeFlat.has(n.f) || homeFlat.includes(n.f)) { stat.skippedAlsoFree++; continue; }
        if (n.meta && listFlat.includes(n.f)) { stat.skippedOnList++; continue; }
        stat.needles++;
        const inJs = js.includes(n.f);
        const inJson = jsonBodies.filter((j) => j.flat.includes(n.f)).map((j) => j.url);
        // app code that was there before the lesson (header) — JS only, counted apart with its file:line
        const evidence = inJs && !inJson.length && BREAK !== "app-code" ? appCodeEvidence(c, id, n) : null;
        if (evidence) {
          stat.inAppCode++;
          if (stat.appCodeExamples.length < 15) stat.appCodeExamples.push({ id, text: n.raw.slice(0, 80), code: evidence });
          continue;
        }
        if (inJs) stat.inJs++;
        if (inJson.length) stat.inJson++;
        if (inJs || inJson.length) {
          leaked = true;
          if (stat.examples.length < 15) stat.examples.push({ id, kind: n.kind, text: n.raw.slice(0, 80), inJs, inJson });
        }
      }
      if (leaked) stat.lessonsWithLeak++;
    }
    result.courses[c] = stat;
    console.log(c, JSON.stringify({ ...stat, examples: stat.examples.slice(0, 3), appCodeExamples: stat.appCodeExamples.slice(0, 4) }));
  }
  fs.mkdirSync(OUT, { recursive: true });
  if (!BREAK) fs.writeFileSync(path.join(OUT, "bundle-leak-all.json"), JSON.stringify(result, null, 1));
  console.log(`bad chunks: ${result.badChunks.length}; json: ${JSON.stringify(result.json)}`);
  const leaks = Object.values(result.courses).reduce((s, x) => s + x.inJs + x.inJson, 0);
  const onList = Object.values(result.courses).reduce((s, x) => s + x.skippedOnList, 0);
  const inAppCode = Object.values(result.courses).reduce((s, x) => s + x.inAppCode, 0);
  console.log(`유출 ${leaks} (JS · JSON) · 익명 과정 목록에 이미 보이는 제목이라 뺀 것 ${onList} · 레슨보다 먼저 있던 앱 코드와 글자가 같아 따로 센 것 ${inAppCode}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
  for (const [c, x] of Object.entries(result.courses)) for (const e of x.appCodeExamples) console.log(`  (앱 코드) ${c}/${e.id} "${e.text}" ← ${e.code}`);
  if (result.badChunks.length) console.log(`!!! 받지 못한 청크 ${result.badChunks.length} — 이 판정은 그 청크를 못 본 것 · exit 1`);
  process.exit(leaks || result.badChunks.length ? 1 : 0);
})();
