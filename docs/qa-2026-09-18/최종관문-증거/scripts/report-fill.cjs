// 최종 보고서 표 · 줄 만들기 — 스윕 뒤 증거 파일(gate-count-final.json · out/coverage.json · out/features-summary.json)에서.
// 손으로 옮겨 적지 않게: 여기서 나온 글을 report-final.md 의 {{…}} 자리에 그대로 넣는다(verify-report 가 숫자를 증거와 다시 대 봄).
//   node report-fill.cjs > report-fill.txt
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const OUT = path.join(REPO, "docs/qa-2026-09-18/out");
const S = __dirname;
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const n = (x) => (typeof x === "number" ? x.toLocaleString("en-US") : String(x));
const gc = J(path.join(S, "gate-count-final.json"));
const cov = J(path.join(OUT, "coverage.json"));
const fs2 = J(path.join(OUT, "features-summary.json"));
const say = (s = "") => console.log(s);

// ── 관문 0
const files = gc.files || [];
const allAfter = files.every((f) => f.beforeDeploy === 0);
const notProd = files.reduce((a, f) => a + f.notProd, 0);
const records = files.reduce((a, f) => a + f.records, 0);
const covSum = Object.values(gc.coverage).reduce((a, c) => a + c.desktop + c.tablet + c.mobile, 0);
const pagesAll = Object.values(gc.coverage).reduce((a, c) => a + c.pages, 0);
say("{{G0}}");
say(`관문 0 기록 파일 ${files.length}개 · 기록 ${n(records)} · 모두 첫 배포 기준 시각 뒤 ${allAfter ? "예" : "**아니오**"} · 운영 아닌 기록 ${notProd} · 강의×화면 ${n(covSum)} / ${n(pagesAll * 3)}(안 본 것 ${gc.notVisited.length}) · ` +
  `다시 볼 쪽: 첫 관문 15 배포 ${n(gc.redo2.need)} 중 그 뒤 ${n(gc.redo2.after)} · 두 번째 ${n(gc.redo3.need)} 중 ${n(gc.redo3.after)} · 채점 바뀐 쪽 ${n(gc.redoGrading3.need)} 중 ${n(gc.redoGrading3.after)} · 세 번째 ${n(gc.redo4.need)} 중 ${n(gc.redo4.after)}`);
say();
say("{{REDO_LINES}}");
say(`첫 관문 15 배포(1ef7d36 · ${gc.deploy2}) — LISTENING · VOCA · GRAMMAR I · II 전부 + 기대 글이 바뀐 쪽 × 3화면 ${n(gc.redo2.need)} · 그 배포 뒤 기록 ${n(gc.redo2.after)} · 아닌 것 ${gc.redo2.before} ·` +
  ` 두 번째(bf3f4b6 · ${gc.deploy3}) — LISTENING 전부 + 칩이 바뀐 쪽 ${n(gc.redo3.need)} · ${n(gc.redo3.after)} · ${gc.redo3.before} · 채점이 바뀐 쪽(짝 · 딸린 쪽 30 × 3) ${n(gc.redoGrading3.need)} · ${n(gc.redoGrading3.after)} · ${gc.redoGrading3.before} ·` +
  ` 세 번째(397f1e8 · ${gc.deploy4}) — 소리 글이 바뀐 44쪽 × 3 ${n(gc.redo4.need)} · ${n(gc.redo4.after)} · ${gc.redo4.before}`);
say();
// ── 관문 5
const a = gc.audio;
const fails = Object.entries(a.byStatus).filter(([k]) => !/PASS|NA/.test(k)).reduce((x, [, v]) => x + v, 0);
say("{{G5}}");
say(`누른 횟수 ${n(a.pressed)} · 상태 ${Object.entries(a.byStatus).map(([k, v]) => `${k} ${n(v)}`).join(" · ")}`);
say();
// ── 관문 6 · 11
const t = cov.lessons.totals;
say("{{G6_G11}}");
say(`강의 ${n(t.discovered)}(본 쪽 ${n(t.main)} · 대본 쪽 ${n(t.script)}) · PASS ${n(t.pass)} · FAIL ${n(t.fail)} · BLOCKED ${n(t.blocked)} · NOT TESTED ${n(t.notTested)} · 셈 맞음 ${t.balanced ? "예" : "아니오"}`);
say(`BLOCKED 사유: ${Object.entries(cov.lessons.blockedReasons || {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "없음"}`);
say();
say("{{COVERAGE_TABLE}}");
say("| 과정 | 강의(본 · 대본) | PASS | FAIL | BLOCKED | NOT TESTED | 강의×화면(데스크톱 · 태블릿 · 휴대폰) |");
say("|---|---|---|---|---|---|---|");
const courseKey = { STUDENT: "student", VOCA: "phonics", "GRAMMAR I": "grammar1", "GRAMMAR II": "grammar2", LISTENING: "ld", READING: "reading" };
for (const r of cov.lessons.rows) {
  const k = courseKey[r.course] || r.course.toLowerCase();
  const c = gc.coverage[k] || {};
  say(`| ${r.course} | ${n(r.discovered)}(${n(r.main)} · ${n(r.script)}) | ${n(r.pass)} | ${n(r.fail)} | ${n(r.blocked)} | ${n(r.notTested)} | ${c.pages ? `${n(c.desktop)} · ${n(c.tablet)} · ${n(c.mobile)} / ${n(c.pages)}` : "-"} |`);
}
say();
// ── 관문 9
const net = gc.net;
const cls = (s) => (s >= 500 ? "5xx" : s >= 400 ? "4xx" : "그 밖");
const by = {};
for (const b of net.bad) by[cls(b.status)] = (by[cls(b.status)] || 0) + 1;
say("{{G9}}");
say(`요청 기록이 있는 쪽 ${n(net.withRequests)} / ${n(net.records)} · 요청 기록 없는 쪽 ${net.noRequests.length} · 4xx ${by["4xx"] || 0} · 5xx ${by["5xx"] || 0} · 쪽당 10개 상한에 닿은 쪽 ${net.truncatedBad} · 연결 실패 ${net.failed.length} · 예외 ${net.exceptions.length} · 콘솔 오류 ${net.console.length} · 방문 오류 ${net.visitErrors.length}`);
for (const [k, v] of Object.entries(net.badBy || {}).sort((x, y) => y[1] - x[1]).slice(0, 12)) say(`  - ${v} × ${k}`);
say();
// ── 관문 10
const ct = gc.content;
say("{{CONTENT_COUNTS}}");
say(`기록 ${n(ct.records)} · 기대 ${n(ct.expected)} · 있음 ${n(ct.found)} · 없음 ${n(ct.missing)} · 깊이 탓에 못 본 것(notSeenAtDepth) ${n(ct.notSeenAtDepth)}`);
for (const m of (ct.rows || []).slice(0, 30)) say(`  - ${m.course}/${m.id} ${m.viewport}: ${String(m.text).slice(0, 120)}`);
say();
// ── 기능별(analyze-features)
say("{{FEATURE_TABLE}}");
say("| 과정(기록) | 쪽 | 확인 PASS · FAIL · BLOCKED · NA | 음성 누름 · PASS · 실패 · 브라우저 음성으로 넘어감 | 글자 기대 · 있음 | 가로 넘침 · 잘린 글 | 예외 · HTTP 오류 |");
say("|---|---|---|---|---|---|---|");
let checksAll = 0, audioAll = 0;
for (const [c, s] of Object.entries(fs2.summary)) {
  const ch = s.checks; checksAll += Object.values(ch).reduce((x, y) => x + y, 0); audioAll += s.audio.controls;
  say(`| ${c}(${n(s.records)}) | ${n(s.pages)} | ${n(ch.PASS)} · ${n(ch.FAIL)} · ${n(ch.BLOCKED)} · ${n(ch.NA)} | ${n(s.audio.controls)} · ${n(s.audio.pass)} · ${n(s.audio.fail)} · ${n(s.audio.ttsFallback)} | ${n(s.content.expected)} · ${n(s.content.found)} | ${n(s.layout.overflow)} · ${n(s.layout.clipped)} | ${n(s.events.exceptions)} · ${n(s.events.http)} |`);
}
say(`확인 항목 합 ${n(checksAll)} · 음성 버튼 누름 합 ${n(audioAll)}`);
