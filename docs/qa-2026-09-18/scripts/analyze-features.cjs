#!/usr/bin/env node
/**
 * Turns the raw sweep records (out/features/<course>.jsonl) into coverage numbers and
 * grouped failures, so the report can quote counts instead of impressions.
 *
 *   node analyze-features.cjs [--course reading] [--top 25] [--features-dir <폴더>]
 * Output: out/features-summary.json + printed tables.
 *
 * 최종 관문(2026-09-25): 기본은 out/features 의 기록 전부(옛 스윕까지)이고 과정은 파일 이름에서 뽑는다. 관문 숫자는 관문 0 기록 중
 * 강의 × 화면마다 가장 늦은 것만 <과정>.jsonl 로 모은 폴더를 --features-dir 로 넘겨 센다(옛 기록 · 다시 돈 쪽의 앞 기록이 섞이지 않게).
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const DIR = path.resolve(process.argv.includes("--features-dir") ? process.argv[process.argv.indexOf("--features-dir") + 1] : path.join(OUT, "features"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--course", null);
const TOP = Number(arg("--top", 25));

const summary = {};
const clusters = {};
const cluster = (course, kind, key, sample) => {
  const c = (clusters[course] ||= {});
  const k = (c[kind] ||= {});
  const e = (k[key] ||= { count: 0, samples: [] });
  e.count++;
  if (e.samples.length < 6) e.samples.push(sample);
};

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".jsonl") && !f.includes("-smoke"))) {
  const course = file.replace(".jsonl", "").replace(/-s\d+$/, "");
  if (ONLY && course !== ONLY) continue;
  const s = (summary[course] ||= {
    records: 0, pages: new Set(), viewports: {}, loadFailures: 0, visitErrors: 0,
    checks: { PASS: 0, FAIL: 0, BLOCKED: 0, NA: 0 }, byFeature: {},
    audio: { controls: 0, pass: 0, fail: 0, ttsFallback: 0, unexpectedClip: 0, noRequest: 0 },
    content: { pagesCompared: 0, expected: 0, found: 0, pagesWithMissing: 0 },
    layout: { overflow: 0, offscreen: 0, clipped: 0, smallTargets: 0, unlabeled: 0, brokenImages: 0, noAlt: 0 },
    events: { console: 0, exceptions: 0, http: 0, failed: 0 },
    redirects: 0,
  });
  for (const line of fs.readFileSync(path.join(DIR, file), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    s.records++;
    s.pages.add(r.id);
    s.viewports[r.viewport] = (s.viewports[r.viewport] || 0) + 1;
    if (r.visitError) { s.visitErrors++; cluster(course, "visitError", r.visitError.slice(0, 80), `${r.url} ${r.viewport}`); continue; }
    if (r.redirect) s.redirects++;
    if (r.load && (!r.load.navigated || !r.load.rendered)) s.loadFailures++;
    for (const c of r.checks || []) {
      s.checks[c.status] = (s.checks[c.status] || 0) + 1;
      const f = (s.byFeature[c.feature] ||= { PASS: 0, FAIL: 0, BLOCKED: 0, NA: 0 });
      f[c.status] = (f[c.status] || 0) + 1;
      if (c.status === "FAIL") cluster(course, `check:${c.feature}`, String(c.note || "").replace(/\d+/g, "#").slice(0, 90), `${r.url} ${r.viewport} · ${c.item} · ${String(c.note || "").slice(0, 120)}`);
    }
    for (const a of r.audio || []) {
      s.audio.controls++;
      if (a.status === "PASS") s.audio.pass++;
      else {
        s.audio.fail++;
        if (/browser TTS/.test(a.note || "")) s.audio.ttsFallback++;
        if (/not in this lesson/.test(a.note || "")) s.audio.unexpectedClip++;
        if (/no audio request/.test(a.note || "")) s.audio.noRequest++;
        cluster(course, "audio", String(a.note || "").replace(/\/audio\/[^\s]+/g, "<clip>").slice(0, 90), `${r.url} ${r.viewport} · ${a.control} · ${String(a.note || "").slice(0, 120)}`);
      }
    }
    if (r.content && r.viewport === "desktop") {
      s.content.pagesCompared++;
      s.content.expected += r.content.expected;
      s.content.found += r.content.found;
      if (r.content.missingCount) {
        s.content.pagesWithMissing++;
        for (const m of r.content.missing.slice(0, 3)) cluster(course, "content-missing", m.split(":")[0], `${r.url} · ${m.slice(0, 110)}`);
      }
    }
    if (r.layout) {
      if (r.layout.overflowX) { s.layout.overflow++; cluster(course, "layout", `horizontal overflow (${r.viewport})`, `${r.url} ${r.viewport} ${r.layout.scrollWidth}px`); }
      if ((r.layout.offscreen || []).length) { s.layout.offscreen++; cluster(course, "layout", `control off-screen (${r.viewport})`, `${r.url} ${r.viewport} ${r.layout.offscreen[0]}`); }
      if ((r.layout.clipped || []).length) { s.layout.clipped++; cluster(course, "layout", `clipped text (${r.viewport})`, `${r.url} ${r.viewport} ${r.layout.clipped[0]}`); }
      if (r.layout.smallTargets) s.layout.smallTargets += r.layout.smallTargets;
      if (r.layout.unlabeledFields) { s.layout.unlabeled += r.layout.unlabeledFields; cluster(course, "a11y", `unlabeled field (${r.viewport})`, `${r.url} ${r.viewport} ${r.layout.unlabeledFields}`); }
      if (r.layout.brokenImages) s.layout.brokenImages += r.layout.brokenImages;
      if (r.layout.imagesNoAlt) s.layout.noAlt += r.layout.imagesNoAlt;
    }
    if (r.events) {
      s.events.console += (r.events.console || []).length;
      s.events.exceptions += (r.events.exceptions || []).length;
      s.events.http += (r.events.badResponses || []).length;
      s.events.failed += (r.events.failed || []).length;
      for (const e of r.events.exceptions || []) cluster(course, "exception", String(e).slice(0, 90), `${r.url} ${r.viewport}`);
      for (const e of r.events.console || []) cluster(course, "console", String(e).slice(0, 90), `${r.url} ${r.viewport}`);
      for (const e of r.events.badResponses || []) cluster(course, "http", `${e.status} ${String(e.url).replace(/\/[^/]*$/, "/…")}`, `${r.url} ${r.viewport} ${e.url}`);
    }
    for (const p of r.problems || []) cluster(course, "problem", String(p).replace(/\d+/g, "#").slice(0, 90), `${r.url} ${r.viewport} · ${p.slice(0, 120)}`);
  }
}
// After every file: LISTENING arrives as ld.jsonl + ld-s1..s3.jsonl, all one course, so the
// page set may only be counted once all of its files have been folded in.
for (const s of Object.values(summary)) s.pages = s.pages.size;

/**
 * Which of these failures should be suspected of being the AUDIT's fault rather than the site's?
 *
 * Every tool defect found on 2026-09-21 announced itself the same way: a number too large and too
 * uniform to be a real product fault. VOCA reported 585 unclickable step buttons — one distinct
 * control name repeated across all 195 lessons, and it turned out the audit had mistaken a link
 * inside Step 1 for a step tab. LISTENING reported 164 correct answers graded wrong, more failures
 * than passes, and the audit had been removing its own tiles. So the same shapes are flagged
 * automatically now, and a flagged group may not go in the report until a second, independent
 * method reproduces it.
 */
const suspects = [];
for (const [course, s] of Object.entries(summary)) {
  for (const [feature, f] of Object.entries(s.byFeature)) {
    const bad = (f.FAIL || 0) + (f.BLOCKED || 0);
    const total = bad + (f.PASS || 0);
    if (total < 20) continue;
    if (!f.PASS) suspects.push({ course, feature, why: `이 과정에서 한 번도 통과한 적이 없음 (실패 ${bad}건, 통과 0건) — 도구가 이 기능을 아예 못 읽고 있을 수 있음` });
    else if (bad / total >= 0.5) suspects.push({ course, feature, why: `실패율 ${Math.round((bad / total) * 100)}% (${bad}/${total}) — 절반을 넘으면 도구를 먼저 의심할 것` });
  }
  // a whole course's failures for one feature collapsing to a single wording
  for (const [kind, groups] of Object.entries(clusters[course] || {})) {
    if (!kind.startsWith("check:")) continue;
    const entries = Object.entries(groups);
    const count = entries.reduce((a, [, e]) => a + e.count, 0);
    if (entries.length === 1 && count >= 20) suspects.push({ course, feature: kind.slice(6), why: `${count}건이 전부 같은 문구 하나 — 서로 다른 문제가 ${entries.length}가지뿐이면 ${count}건이 아니라 1건일 수 있음: "${entries[0][0].slice(0, 60)}"` });
  }
}

const report = { at: new Date().toISOString(), summary, clusters, toolSuspects: suspects };
fs.writeFileSync(path.join(OUT, "features-summary.json"), JSON.stringify(report, null, 1));

if (suspects.length) {
  console.log(`\n${"=".repeat(78)}\n⚠ 도구 의심 ${suspects.length}건 — 두 번째 방법으로 재현되기 전에는 보고서에 올리지 말 것\n${"=".repeat(78)}`);
  for (const x of suspects) console.log(`   [${x.course}] ${x.feature}: ${x.why}`);
}
for (const [course, s] of Object.entries(summary)) {
  console.log(`\n=== ${course}: ${s.records} records over ${s.pages} pages ${JSON.stringify(s.viewports)}`);
  console.log(`   checks ${JSON.stringify(s.checks)} · per feature ${JSON.stringify(s.byFeature)}`);
  console.log(`   audio controls ${s.audio.controls} (pass ${s.audio.pass}, fail ${s.audio.fail}: TTS ${s.audio.ttsFallback}, wrong clip ${s.audio.unexpectedClip}, silent ${s.audio.noRequest})`);
  console.log(`   content (desktop) ${s.content.found}/${s.content.expected} strings on ${s.content.pagesCompared} pages; ${s.content.pagesWithMissing} pages missing something`);
  console.log(`   layout overflow ${s.layout.overflow} · offscreen ${s.layout.offscreen} · clipped ${s.layout.clipped} · small targets ${s.layout.smallTargets} · unlabeled ${s.layout.unlabeled} · broken img ${s.layout.brokenImages}`);
  console.log(`   console ${s.events.console} · exceptions ${s.events.exceptions} · HTTP errors ${s.events.http} · failed requests ${s.events.failed} · load failures ${s.loadFailures} · visit errors ${s.visitErrors} · redirects ${s.redirects}`);
  for (const [kind, groups] of Object.entries(clusters[course] || {})) {
    const top = Object.entries(groups).sort((a, b) => b[1].count - a[1].count).slice(0, TOP);
    if (!top.length) continue;
    console.log(`   -- ${kind}`);
    for (const [key, e] of top) console.log(`      ${String(e.count).padStart(5)} × ${key}\n            e.g. ${e.samples[0]}`);
  }
}
