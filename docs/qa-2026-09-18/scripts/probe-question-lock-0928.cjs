#!/usr/bin/env node
/**
 * 2026-09-28 새 문제 — 잠금 탐침. LISTENING · READING 의 모든 강의 쪽(본 쪽 + 대본 쪽 -1)을 로그아웃으로 받는다(HTML 과 RSC 두 가지).
 *   유료 쪽: 잠금 화면 표시가 있고, 그 강의 문제 글(물음 · 보기 — content/questions/<과정>/<본 id>.json)이 하나도 없어야 한다.
 *   무료 쪽: 그 강의 문제의 물음이 모두 있어야 한다 — 이 탐침이 진짜 쪽에서 문제 글을 찾을 수 있다는 증명.
 * 문제 파일이 없는 강의는 센다(아직 안 붙은 강의).
 *
 *   $env:BASE = "http://localhost:3210"; node probe-question-lock-0928.cjs [--break=free]
 *   --break=free : 무료 쪽도 유료로 보고 잼 → 문제 글이 '새어' FAIL · exit 1 이 나야 맞음.
 * 운영에 돌려도 읽기만 한다(로그아웃 GET).
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "free") throw new Error(`모르는 --break=${BREAK}`);
const PAYWALL_RE = /ALL-PASS ONLY|STUDENT PASS ONLY|VIP ALL-PASS REQUIRED|순차 학습 잠금/;

// the free-preview list, read from the app's own source (like probe-bundle-leak-all)
const FREE = {};
{
  const src = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
  const block = src.slice(src.indexOf("FREE_PREVIEW_LESSON_IDS"));
  let cur = null;
  for (const line of block.split("\n").slice(1)) {
    const m = line.match(/^\s*([a-z0-9]+):\s*\[/);
    if (m) { cur = m[1]; FREE[cur] = new Set(); }
    if (cur) for (const x of line.matchAll(/"([a-z0-9-]+)"/g)) FREE[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
    if (/^\};/.test(line)) break;
  }
}
const isFree = (course, id) => FREE[course] && (FREE[course].has(id) || FREE[course].has(id.replace(/-\d+$/, "")));
const questionsOf = (course, id) => {
  const f = path.join(REPO, "content/questions", course, `${id.replace(/-\d+$/, "")}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).questions || [] : null;
};
const pagesOf = (course) => (JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", `${course}.json`), "utf8")).lessons || []).map((l) => l.id);

// the RSC payload: Next 16 answers an RSC request with a 307 to the same page plus its `_rsc` key — followed once, same headers
const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%22%22%2C%7B%7D%5D" };
async function get(url, headers = {}) {
  for (let a = 0; a < 4; a++) {
    try {
      let r = await fetch(url, { headers, redirect: "manual" });
      if (headers.RSC && r.status === 307 && /[?&]_rsc=/.test(r.headers.get("location") || "")) r = await fetch(new URL(r.headers.get("location"), url), { headers, redirect: "manual" });
      const t = await r.text();
      if (r.status < 500 && r.status !== 429) return { status: r.status, text: t };
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (a + 1)));
  }
  return { status: -1, text: "" };
}
const has = (text, s) => text.includes(s) || text.includes(JSON.stringify(s).slice(1, -1));

(async () => {
  const jobs = [];
  for (const course of ["ld", "reading"]) for (const id of pagesOf(course)) jobs.push({ course, id });
  const stat = { pages: jobs.length, withQuestions: 0, withoutFile: 0, paid: 0, paidLeaks: 0, paidNoLock: 0, free: 0, freeMissing: 0, badStatus: 0 };
  const problems = [];
  let k = 0;
  async function worker() {
    for (;;) {
      const job = jobs[k++];
      if (!job) return;
      const qs = questionsOf(job.course, job.id);
      if (!qs || !qs.length) { stat.withoutFile++; continue; }
      stat.withQuestions++;
      const free = isFree(job.course, job.id) && BREAK !== "free";
      for (const headers of [{}, RSC_HEADERS]) {
        const { status, text } = await get(`${BASE}/${job.course}/${job.id}`, headers);
        const where = `${job.course}/${job.id}${headers.RSC ? " (RSC)" : ""}`;
        if (status !== 200) { stat.badStatus++; problems.push(`${where}: HTTP ${status}`); continue; }
        if (free) {
          stat.free++;
          const missing = qs.filter((q) => !has(text, q.prompt));
          if (missing.length) { stat.freeMissing++; problems.push(`${where}: 무료인데 물음 ${missing.length}/${qs.length} 없음`); }
        } else {
          stat.paid++;
          const texts = qs.flatMap((q) => [q.prompt, ...q.options]).filter((t) => t.replace(/\s+/g, "").length >= 4);
          const leaked = texts.filter((t) => has(text, t));
          if (leaked.length) { stat.paidLeaks++; problems.push(`${where}: 유료인데 문제 글 ${leaked.length}개 — 예: ${leaked[0].slice(0, 40)}`); }
          if (!headers.RSC && !PAYWALL_RE.test(text)) { stat.paidNoLock++; problems.push(`${where}: 잠금 화면 표시 없음`); }
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`${BASE} · 쪽 ${stat.pages}(문제 파일 있음 ${stat.withQuestions} · 없음 ${stat.withoutFile}) · 받은 것: 유료 ${stat.paid} · 무료 ${stat.free}`);
  console.log(`유료에 문제 글 ${stat.paidLeaks} · 유료인데 잠금 표시 없음 ${stat.paidNoLock} · 무료인데 물음 없음 ${stat.freeMissing} · HTTP 200 아님 ${stat.badStatus}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
  for (const p of problems.slice(0, 20)) console.log("  - " + p);
  if (problems.length > 20) console.log(`  … ${problems.length - 20} 더`);
  const bad = stat.paidLeaks + stat.paidNoLock + stat.freeMissing + stat.badStatus + (stat.free === 0 ? 1 : 0);
  console.log(bad ? `FAIL ${bad}` : "PASS");
  process.exit(bad ? 1 : 0);
})();
