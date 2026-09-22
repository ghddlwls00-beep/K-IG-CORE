#!/usr/bin/env node
/**
 * Every number the final report is allowed to quote, read straight out of the evidence files.
 *
 * The report must not contain a figure I typed from memory. This prints each one with the file it
 * came from, so any claim in the report can be traced to an output on disk, and re-running it
 * after the overnight queue finishes shows immediately which figures have moved.
 *
 * A missing input is printed as MISSING rather than skipped — a report that quietly drops a
 * section is worse than one that says the work is not done.
 *
 *   node report-facts.cjs [--json]
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const JSON_ONLY = process.argv.includes("--json");
const facts = {};

const read = (f) => {
  try { return JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { return null; }
};
const say = (label, value, source) => {
  facts[label] = { value, source };
  if (!JSON_ONLY) console.log(`${String(value).padStart(9)}  ${label.padEnd(52)} ${source}`);
};
const head = (t) => { if (!JSON_ONLY) console.log(`\n== ${t}`); };

head("점검 범위");
const ent = read("entitlement-all.json");
say("점검한 주소 수", ent ? ent.results.length : "MISSING", "entitlement-all.json");
say("이용권 없이 잠긴 주소", ent ? ent.results.filter((r) => r.locked !== false).length : "MISSING", "entitlement-all.json");

const cov = read("review-coverage.json");
say("교육내용 검토가 덮은 강의", cov ? `${cov.covered}/${cov.total}` : "MISSING", "review-coverage.json");

// sweep coverage, counted the same way check-integrity does
const FEAT = path.join(OUT, "features");
let sweepOk = 0, sweepErr = 0;
const perCourse = {};
try {
  for (const f of fs.readdirSync(FEAT).filter((x) => x.endsWith(".jsonl"))) {
    const course = f.replace(/(-s\d+|-tiles2?|-step|-smoke)?\.jsonl$/, "");
    for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (r.visitError) { sweepErr++; continue; }
      sweepOk++;
      (perCourse[course] ||= new Set()).add(`${r.url}|${r.viewport}`);
    }
  }
} catch {}
say("기능점검 기록 (정상)", sweepOk, "out/features/*.jsonl");
say("기능점검 기록 (오류)", sweepErr, "out/features/*.jsonl");
for (const [c, s] of Object.entries(perCourse)) say(`  ${c} 페이지×화면`, s.size, "out/features");

head("기능 점검 결과");
const feat = read("features-summary.json");
if (feat) {
  const tot = { PASS: 0, FAIL: 0, BLOCKED: 0, NA: 0 };
  let audio = 0, audioPass = 0;
  for (const s of Object.values(feat.summary)) {
    for (const k of Object.keys(tot)) tot[k] += s.checks[k] || 0;
    audio += s.audio.controls; audioPass += s.audio.pass;
  }
  say("확인 항목 합계", tot.PASS + tot.FAIL + tot.BLOCKED + tot.NA, "features-summary.json");
  say("  통과", tot.PASS, "features-summary.json");
  say("  실패", tot.FAIL, "features-summary.json");
  say("  막힘", tot.BLOCKED, "features-summary.json");
  say("음성 버튼 누른 횟수", audio, "features-summary.json");
  say("  소리가 난 것", audioPass, "features-summary.json");
  say("도구 의심 경고", (feat.toolSuspects || []).length, "features-summary.json");
  for (const t of feat.toolSuspects || []) say(`  [${t.course}] ${t.feature}`, "의심", t.why.slice(0, 70));
} else say("기능 점검 집계", "MISSING — analyze-features.cjs 를 돌릴 것", "features-summary.json");

head("음성");
const inv = read("audio-inventory.json");
say("강의가 필요로 하는 클립", inv ? inv.clips.length : "MISSING", "audio-inventory.json");
const miss = read("missing-clips-licensed.json");
say("운영에서 404 인 클립", miss ? miss.missing.length : "MISSING", "missing-clips-licensed.json");
say("  영향받는 강의", miss ? Object.keys(miss.byLesson).length : "MISSING", "missing-clips-licensed.json");
const lic = read("audio-check-licensed.json");
say("이용권으로 전수 확인한 클립", lic ? (lic.clips || lic.results || []).length : "MISSING — 대기열 3번", "audio-check-licensed.json");

head("누락 · 데이터");
const comp = read("completeness.json");
if (comp) {
  const t = comp.totals;
  const sum = (kind) => Object.values(t).reduce((a, k) => a + (k[kind] || 0), 0);
  say("강의 데이터 파일 누락", sum("missing-file"), "completeness.json");
  say("목차↔주소 불일치", sum("index-without-route") + sum("route-without-index"), "completeness.json");
  say("강의 번호 빠짐", sum("lesson-number-gap"), "completeness.json");
  say("제목 없음", sum("missing-title"), "completeness.json");
  say("목차 표시 이름 없음", sum("missing-menu-label"), "completeness.json");
  say("READING 해석·뜻 누락", sum("sentence-missing-ko") + sum("vocab-missing-meaning"), "completeness.json");
  say("LISTENING 대본 누락", sum("script-missing-en") + sum("script-missing-ko"), "completeness.json");
} else say("누락 점검", "MISSING", "completeness.json");
const hyg = read("data-hygiene.json");
if (hyg) {
  for (const [k, v] of Object.entries(hyg.totals)) say(`위생: ${k}`, v.count, `data-hygiene.json (${v.severity})`);
} else say("데이터 위생", "MISSING", "data-hygiene.json");
const dup = read("ld-duplicate-script.json");
say("LISTENING 한글 대본 사본 불일치 문단", dup ? dup.differingParagraphs : "MISSING", "ld-duplicate-script.json");
say("  영향받는 강의", dup ? dup.lessonsAffected : "MISSING", "ld-duplicate-script.json");

head("채점");
const go = read("grade-offline.json");
if (go) {
  // grade-offline tries each item as the model answer plus harmless variants (case, spacing,
  // curly apostrophe, declared alternatives …); count the attempts, and how many were not accepted
  let tried = 0, notExact = 0, items = 0;
  for (const course of Object.values(go.grammar || {})) {
    items += course.items || 0;
    for (const v of Object.values(course.byVariant || {})) { tried += v.tried || 0; notExact += (v.partial || 0) + (v.incorrect || 0); }
  }
  say("오프라인 채점: 문항", items, "grade-offline.json");
  say("오프라인 채점: 시도 (정답+변형)", tried, "grade-offline.json");
  say("  정답으로 인정되지 않음", notExact, "grade-offline.json");
} else say("오프라인 채점", "MISSING", "grade-offline.json");
const ex = read("grammar-exam.json");
if (ex) {
  say("GRAMMAR 종합평가 실제 응시 강의", ex.lessons, "grammar-exam.json");
  say("  통과", ex.counts.PASS || 0, "grammar-exam.json");
  say("  모범답안이 정답 처리 안 됨", ex.problems.filter((p) => p.kind !== "alternative").length, "grammar-exam.json");
  say("  대체답안이 정답 처리 안 됨", ex.problems.filter((p) => p.kind === "alternative").length, "grammar-exam.json");
} else say("GRAMMAR 종합평가", "MISSING", "grammar-exam.json");
const dict = read("dictation-offline.json");
say("딕테이션 문장 (앱 로직 직접 검사)", dict ? dict.sentences : "MISSING", "dictation-offline.json");
say("  정답 순서인데 오답 처리", dict ? dict.correctOrderRejected : "MISSING", "dictation-offline.json");

head("교육 내용 지적");
let all = 0, survived = 0, refuted = 0, unverified = 0;
const bySev = {};
try {
  for (const f of fs.readdirSync(OUT).filter((x) => /^content-review-.*\.json$/.test(x))) {
    const j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
    for (const x of j.findings || []) {
      all++;
      const votes = (x.verification && x.verification.votes) || [];
      if (!x.verification || !votes.length) { unverified++; continue; }
      if (x.verification.survives) { survived++; const s = x.verification.severity || x.severity; bySev[s] = (bySev[s] || 0) + 1; }
      else refuted++;
    }
  }
} catch {}
say("검토자 보고", all, "content-review-*.json");
say("  검증 통과", survived, "content-review-*.json");
say("  기각", refuted, "content-review-*.json");
say("  미검증", unverified, "content-review-*.json");
for (const [s, n] of Object.entries(bySev)) say(`  통과분 ${s}`, n, "content-review-*.json");

head("보안 · 상업 · 접근성 · 속도");
const sec = read("security-probe.json");
say("보안 점검 항목", sec ? sec.results.length : "MISSING", "security-probe.json");
say("  통과", sec ? sec.results.filter((r) => r.status === "PASS" || r.pass === true).length : "MISSING", "security-probe.json");
const leak = read("bundle-leak-all.json");
say("공개 JS 에서 유료 본문 유출", leak ? (leak.leaks ? leak.leaks.length : 0) : "MISSING", "bundle-leak-all.json");
const a11y = read("a11y.json");
say("접근성 점검 기록", a11y ? (a11y.results || a11y.pages || []).length : "MISSING", "a11y.json");
const perf = read("perf-licensed.json");
say("속도 측정 기록 (이용권)", perf ? perf.results.length : "MISSING", "perf-licensed.json");

head("감사가 바꾼 데이터");
let dc = 0;
try { dc = fs.readFileSync(path.join(OUT, "data-changes.jsonl"), "utf8").split("\n").filter((l) => l.trim()).length; } catch {}
say("기록된 데이터 변경", dc, "data-changes.jsonl");

if (JSON_ONLY) console.log(JSON.stringify(facts, null, 1));
else {
  const missing = Object.entries(facts).filter(([, v]) => String(v.value).startsWith("MISSING"));
  console.log(`\n아직 근거 파일이 없는 항목: ${missing.length}${missing.length ? " — " + missing.map(([k]) => k).join(", ") : ""}`);
}
