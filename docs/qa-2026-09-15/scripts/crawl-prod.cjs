// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Production HTTP crawl: every in-scope lesson route, section pages, invalid routes,
// search index, and HTML-level access-control check. Read-only GET requests.
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const SITE = "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "out");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const L = (c, id) => readJson(`${REPO}/content/lessons/${c}/${id}.json`);
const license = { student: ["s1-1", "s1-2"], phonics: ["mv1-01", "mv1-02"], grammar1: ["gh1-006", "gh1-007", "gh1-008", "gh1-009"], grammar2: ["gh2-007", "gh2-007-1", "gh2-008", "gh2-008-1"], ld: ["d001", "d001-1", "d002", "d002-1"], reading: ["pr001", "pr001-1", "pr002", "pr002-1"] };

const targets = [];
const add = (course, id, kind, probe) => targets.push({ course, id, kind, probe, url: course === "student" ? `${SITE}/student/${id}` : `${SITE}/${course}/${id}` });
const htmlEsc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

for (const g of readJson(`${REPO}/content/courses/student.json`).groups) for (const id of g.lessons) {
  const s = L("student", id).blocks.find((b) => b.type === "sentences")?.items?.[0]?.text;
  add("student", id, "main", s);
}
for (const g of readJson(`${REPO}/content/courses/phonics.json`).groups) for (const id of g.lessons) {
  const grid = L("phonics", id).blocks.find((b) => b.type === "wordgrid").rows.flat();
  add("phonics", id, "main", grid[grid.length - 1]);
}
for (const g of readJson(`${REPO}/content/courses/grammar1.json`).groups) for (const id of g.lessons) {
  add("grammar1", id, "main", L("grammar1", id).blocks.find((b) => b.type === "sentences")?.items?.at(-1)?.text);
  const odd = `gh1-${String(parseInt(id.slice(4), 10) + 1).padStart(3, "0")}`;
  add("grammar1", odd, "answer-page-redirect", null);
}
for (let i = 7; i <= 50; i++) {
  const id = `gh2-${String(i).padStart(3, "0")}`;
  add("grammar2", id, "main", L("grammar2", id).blocks.find((b) => b.type === "sentences")?.items?.at(-1)?.text);
  add("grammar2", `${id}-1`, "script", null);
}
const ldScripts = readJson(`${REPO}/content/ld_english_scripts.json`);
for (let i = 1; i <= 276; i++) {
  const id = `d${String(i).padStart(3, "0")}`;
  add("ld", id, "main", ldScripts[id]?.at(-1)?.en);
  add("ld", `${id}-1`, "script", null);
}
for (let i = 1; i <= 256; i++) {
  const id = `pr${String(i).padStart(3, "0")}`;
  const l = L("reading", id);
  add("reading", id, "main", (l.readingSentences || [])?.at(-1)?.english);
  add("reading", `${id}-1`, "script", null);
}
const pages = ["/", "/t/students", "/t/voca", "/t/grammar1", "/t/grammar2", "/t/ld", "/t/reading", "/student", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading", "/search-index.json", "/sitemap.xml", "/robots.txt"];
const invalid = ["/student/s19-3", "/student/s21-1", "/student/s0-1", "/phonics/mv1-41", "/phonics/mv4-01", "/phonics/hv-76", "/grammar1/gh1-018", "/grammar1/gh1-124", "/grammar2/gh2-006", "/grammar2/gh2-051", "/ld/d000", "/ld/d277", "/reading/pr000", "/reading/pr257", "/ld/..%2f..%2fetc", "/not-a-course", "/students", "/voca", "/t/unknown", "/basics", "/middle", "/man", "/woman", "/adults", "/chinese"];

async function get(url, opts = {}) {
  const t0 = Date.now();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "KIG-QA-Audit/1.0 (read-only)", ...(opts.headers || {}) } });
      const body = opts.noBody ? "" : await r.text();
      return { status: r.status, location: r.headers.get("location"), ms: Date.now() - t0, body, headers: Object.fromEntries(r.headers) };
    } catch (e) {
      if (attempt === 3) return { status: 0, error: String(e.cause?.code || e.message), ms: Date.now() - t0, body: "" };
      await new Promise((res) => setTimeout(res, 800 * attempt));
    }
  }
}
async function pool(items, n, fn) {
  let i = 0;
  const out = new Array(items.length);
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

(async () => {
  const results = { pages: [], lessons: [], invalid: [] };
  results.pages = await pool(pages, 4, async (p) => {
    const r = await get(SITE + p);
    const m = r.body.match(/총 (\d+)개 정규 레슨/);
    const tabCount = [...r.body.matchAll(/tabular-nums text-ink-faint">(\d+)</g)].map((x) => x[1]);
    return { path: p, status: r.status, ms: r.ms, location: r.location, lessonsHeader: m?.[1], tabCourseCount: tabCount, bytes: r.body.length, xfo: r.headers?.["x-frame-options"], cacheControl: r.headers?.["cache-control"], age: r.headers?.age, xvc: r.headers?.["x-vercel-cache"], body: p === "/search-index.json" || p === "/sitemap.xml" || p === "/robots.txt" ? r.body : undefined };
  });
  let done = 0;
  results.lessons = await pool(targets, 6, async (t) => {
    const r = await get(t.url);
    done++;
    if (done % 100 === 0) process.stdout.write(`${done}/${targets.length}\n`);
    const title = r.body.match(/<title>([^<]*)<\/title>/)?.[1];
    const h1 = r.body.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1];
    let probeInHtml = null;
    if (t.probe) {
      const needle = t.probe.slice(0, 40);
      probeInHtml = r.body.includes(needle) || r.body.includes(htmlEsc(needle)) || r.body.includes(JSON.stringify(needle).slice(1, -1));
    }
    const free = (license[t.course] || []).includes(t.id);
    const paywallSSR = /LessonPaywall|수강권|이용권 등록|올패스/.test(r.body) && /잠금|🔒/.test(r.body);
    return { ...t, free, status: r.status, location: r.location, ms: r.ms, bytes: r.body.length, title, h1, probeInHtml, paywallText: paywallSSR, notFound: /404|찾을 수 없/.test(title || "") || r.status === 404, xvc: r.headers?.["x-vercel-cache"], error: r.error };
  });
  results.invalid = await pool(invalid, 4, async (p) => {
    const r = await get(SITE + p);
    return { path: p, status: r.status, location: r.location, title: r.body.match(/<title>([^<]*)<\/title>/)?.[1], h1: r.body.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] };
  });
  fs.writeFileSync(path.join(OUT, "prod-crawl.json"), JSON.stringify(results, null, 1));
  const byStatus = {};
  for (const x of results.lessons) byStatus[`${x.course}:${x.kind}:${x.status}`] = (byStatus[`${x.course}:${x.kind}:${x.status}`] || 0) + 1;
  console.log("pages", results.pages.map((p) => `${p.path} ${p.status} ${p.ms}ms hdr=${p.lessonsHeader ?? ""} tab=${p.tabCourseCount.join("/")} ${p.xvc || ""}`).join("\n"));
  console.log("lessons by status", byStatus);
  const leak = results.lessons.filter((x) => x.kind === "main" && !x.free && x.probeInHtml === true);
  const gated = results.lessons.filter((x) => x.kind === "main" && !x.free && x.probeInHtml === false);
  const byCourseLeak = {};
  leak.forEach((x) => (byCourseLeak[x.course] = (byCourseLeak[x.course] || 0) + 1));
  const byCourseGated = {};
  gated.forEach((x) => (byCourseGated[x.course] = (byCourseGated[x.course] || 0) + 1));
  console.log("locked lessons whose content IS in anonymous HTML:", byCourseLeak, "locked lessons with content absent:", byCourseGated);
  console.log("slow (>3s):", results.lessons.filter((x) => x.ms > 3000).length, "max ms", Math.max(...results.lessons.map((x) => x.ms)));
  console.log("invalid", results.invalid.map((x) => `${x.path} ${x.status} ${x.location || ""} ${x.title || ""}`).join("\n"));
})();
