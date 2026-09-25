#!/usr/bin/env node
/**
 * 보고서 자체를 점검한다.
 *
 * The report is what the owner decides on, and it is written by the same agent that ran the audit
 * and got ten things wrong along the way. So every figure it states is checked here against the
 * evidence files, mechanically, and the check fails loudly rather than quietly.
 *
 * What it catches:
 *   - a number in the report that no longer matches the evidence (the usual failure: a figure
 *     written before a job finished and never updated)
 *   - a finding that was WITHDRAWN as this audit's own error being presented as a product defect
 *   - a missing section of the structure the command requires (§22 A-I)
 *   - a GO verdict while any of the command's blocking conditions still holds
 *   - lessons still NOT TESTED while the report claims the audit is complete (§17, §20)
 *
 *   node verify-report.cjs
 * Exit code 1 if anything fails, so it can gate the delivery.
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const DOC = path.join(__dirname, "..");
const REPORT = path.join(DOC, "K-IG_Commercial_Release_Readiness_Report.md");

const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { return null; } };
const text = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, "utf8") : null;
const problems = [];
const passes = [];
const fail = (what, detail) => problems.push({ what, detail });
const ok = (what, detail) => passes.push({ what, detail });

if (!text) {
  console.log("보고서 파일이 없습니다: " + REPORT);
  process.exit(1);
}

// numbers as written in the report, with or without thousands separators
const saysNumber = (n) => {
  const plain = String(n);
  const grouped = plain.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return new RegExp(`(^|[^\\d,])(${plain}|${grouped})([^\\d,]|$)`).test(text);
};

// ---------------------------------------------------------------- 1. 핵심 수치가 증거와 맞는가
const cov = read("coverage.json");
const miss = read("missing-clips-licensed.json");
const comp = read("completeness.json");
const integ = read("data-integrity.json");
// 최종 관문(2026-09-25): 채점 코드가 바뀐 두 번째 관문 15 배포(bf3f4b6) 뒤에 다시 돈 시험 전수(--tag deploy3)가 있으면 그것 — 세 번째 배포(397f1e8)는
// 채점 코드를 건드리지 않음(GrammarLearningView 의 소리 내는 글만). 없으면 예전 결과.
const exam = read("grammar-exam-deploy3.json") || read("grammar-exam.json");
const dict = read("dictation-offline.json");
const ent = read("entitlement-all.json");
const reviewCov = read("review-coverage.json");

let survived = 0, refuted = 0, unverified = 0, total = 0;
const bySev = {};
try {
  for (const f of fs.readdirSync(OUT).filter((x) => /^content-review-.*\.json$/.test(x))) {
    const j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
    for (const x of j.findings || []) {
      total++;
      const votes = (x.verification && x.verification.votes) || [];
      if (!x.verification || !votes.length) { unverified++; continue; }
      if (x.verification.survives) { survived++; const s = x.verification.severity || x.severity; bySev[s] = (bySev[s] || 0) + 1; }
      else refuted++;
    }
  }
} catch {}

const CLAIMS = [
  { label: "점검한 주소 수", value: ent ? ent.results.length : null },
  // Count the PAID routes that are locked, not every route. 28 of the 1,623 are free-preview
  // lessons that open by design; folding them in let the report say "all 1,623 are locked", which
  // is not true and which this check waved through.
  { label: "이용권 없이 잠긴 유료 주소", value: ent ? ent.results.filter((r) => !r.free && r.locked !== false).length : null },
  { label: "무료 체험 주소", value: ent ? ent.results.filter((r) => r.free).length : null },
  { label: "발견 강의 합계", value: cov ? cov.lessons.totals.discovered : null },
  { label: "강의 PASS", value: cov ? cov.lessons.totals.pass : null },
  { label: "강의 FAIL", value: cov ? cov.lessons.totals.fail : null },
  { label: "강의 BLOCKED", value: cov ? cov.lessons.totals.blocked : null },
  { label: "운영에서 404 인 클립", value: miss ? miss.missing.length : null },
  { label: "404 클립의 영향 강의", value: miss ? Object.keys(miss.byLesson).length : null },
  { label: "교육내용 지적 보고", value: total || null },
  { label: "교육내용 검증 통과", value: survived || null },
  { label: "교육내용 기각", value: refuted || null },
  { label: "딕테이션 문장", value: dict ? dict.sentences : null },
  { label: "GRAMMAR 종합평가 응시 강의", value: exam ? exam.lessons : null },
  { label: "VOCA 낱말", value: integ ? integ.vocaStats.words : null },
  // the two totals the report quotes for scale — they moved as the sweeps finished and were stale
  { label: "확인 항목", value: (() => { const f = read("features-summary.json"); return f ? Object.values(f.summary).reduce((a, s) => a + Object.values(s.checks).reduce((x, y) => x + y, 0), 0) : null; })() },
  { label: "음성 버튼 누름", value: (() => { const f = read("features-summary.json"); return f ? Object.values(f.summary).reduce((a, s) => a + s.audio.controls, 0) : null; })() },
  // categories the owner decides on, which the report had understated.
  // (최종 관문 2026-09-25: '검증 통과 저작권 지적' 항목은 뺐다 — 소유자 지시 "법정 표시·결제 연결·저작권 검토는 내가 변호사와 직접 하니
  //  건드리지 말고 언급도 하지 마". 보고서에 그 숫자를 쓰지 않으므로 여기서도 요구하지 않는다.)
  { label: "검증 통과 사실 오류", value: (() => { let n = 0; try { for (const f of fs.readdirSync(OUT).filter((x) => /^content-review-.*\.json$/.test(x))) for (const x of JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")).findings || []) { const v = x.verification; if (v && v.survives && (v.votes || []).length && x.category === "factual") n++; } } catch {} return n || null; })() },
];
for (const c of CLAIMS) {
  if (c.value === null) { fail("근거 파일 없음", `${c.label} — 해당 출력 파일이 아직 없습니다`); continue; }
  if (saysNumber(c.value)) ok("수치 일치", `${c.label} = ${c.value}`);
  else fail("수치가 증거와 다름(또는 낡음)", `${c.label} 의 현재 값은 ${c.value} 인데 보고서에 그 숫자가 없습니다`);
}

// ---------------------------------------------------------------- 2. 철회한 오탐이 되살아나지 않았는가
const WITHDRAWN = [
  { id: "GRAMMAR-FREEZE", needle: /멈춤[^\n]{0,40}2,?568|timeout Emulation/, why: "확인창에 도구가 답하지 않은 것" },
  { id: "GRAMMAR-PAIR", needle: /영어 답란에 한국어/, why: "짝 강의를 낡은 pairId 로 잡은 것" },
  { id: "DICTATION", needle: /딕테이션[^\n]{0,30}164/, why: "도구가 자기 타일을 다시 눌러 뺀 것" },
  { id: "VOCA-STEP", needle: /585\s*건[^\n]{0,30}(버튼|단계)/, why: "단계 탭이 아닌 링크였던 것" },
  { id: "LD-KO-SCRIPT", needle: /한글 대본[^\n]{0,20}(557|누락 557)/, why: "죽은 사본과 비교한 것" },
  { id: "LEGACY-AUDIO", needle: /3,?224/, why: "내 체크아웃에만 없던 것" },
  { id: "WRONG-CLIP", needle: /(1,?121|1,?106|1,?198|1,?299)\s*건[^\n]{0,30}(음성|클립)/, why: "연음·연어 preset 문구였던 것" },
  { id: "NAV", needle: /이전\/?다음[^\n]{0,30}(64|63)\s*건/, why: "넘어가기 전 주소로 비교한 것" },
  { id: "GRADE-03", needle: /문항 번호[^\n]{0,40}(0점|오답)/, why: "앱이 번호를 떼고 채점하는 것" },
  { id: "VOCA-QUIZ", needle: /카드는[^\n]{0,30}퀴즈는/, why: "앱이 강의별 사전을 다시 만드는 것" },
];
for (const w of WITHDRAWN) {
  // allowed when the sentence is explicitly about the withdrawal itself
  const hit = w.needle.exec(text);
  if (!hit) { ok("철회분 재등장 없음", w.id); continue; }
  // Judge by the SECTION the mention sits in, not by a character window: the withdrawal table is
  // long, so a row in the middle of it can be further than 260 characters from the word 철회 and
  // was being read as a live defect.
  const before = text.slice(0, hit.index);
  const heading = (before.match(/^#{1,4} .*$/gm) || []).pop() || "";
  const around = text.slice(Math.max(0, hit.index - 400), hit.index + 400);
  const inWithdrawalSection = /철회|오탐|도구|스스로 저지른|WITHDRAWN/.test(heading);
  if (inWithdrawalSection || /철회|오탐|도구 (오류|결함)|WITHDRAWN|제품 결함이 아/.test(around)) ok("철회분이 철회로만 언급됨", `${w.id} (절: ${heading.slice(0, 40)})`);
  else fail("철회한 오탐이 제품 결함처럼 적혀 있음", `${w.id} — ${w.why}. 절: ${heading.slice(0, 40)} · 문맥: ${around.replace(/\s+/g, " ").slice(340, 520)}`);
}

// ---------------------------------------------------------------- 3. 명령서 §22 의 절이 다 있는가
const SECTIONS = [
  { key: "A 요약", re: /요약|Executive Summary/ },
  { key: "B 커버리지", re: /커버리지|Coverage/ },
  { key: "C 내용 완전성", re: /내용 완전성|Content Completeness/ },
  { key: "D 기능별 결과", re: /기능별|Feature Results/ },
  { key: "E 버그 목록", re: /버그 목록|Bug Report|P0|P1/ },
  { key: "F 누락 내용", re: /누락 내용|Missing Content/ },
  { key: "G 출시 차단", re: /출시 차단|Release Blockers/ },
  { key: "H 학습자 경험 한계", re: /학습자 경험|Learner Experience/ },
  { key: "I 최종 판정", re: /최종 판정|Final Verdict|COMMERCIAL RELEASE/ },
];
for (const s of SECTIONS) (s.re.test(text) ? ok("필수 절 존재", s.key) : fail("필수 절 없음", `${s.key} — 명령서 §22 가 요구합니다`));

// ---------------------------------------------------------------- 4. GO 라고 쓸 자격이 있는가
// "NO-GO" contains a word boundary before GO, so the verdict has to be matched with the NO
// explicitly excluded — otherwise a correct NO-GO report is read as claiming GO.
const saysGo = /COMMERCIAL RELEASE:\s*(?!NO-)GO\b/.test(text) || /판정[^\n]{0,20}(?<![A-Z-])GO\b/.test(text);
const blockers = [];
if (miss && miss.missing.length) blockers.push(`음성 클립 404 ${miss.missing.length}건`);
if (cov && cov.lessons.totals.notTested) blockers.push(`미점검 강의 ${cov.lessons.totals.notTested}개 (§17: 0 이어야 함)`);
if (bySev.Critical) blockers.push(`사실 오류(심각) ${bySev.Critical}건`);
if (ent && ent.results.filter((r) => r.locked === false).length) blockers.push("이용권 없이 열리는 유료 주소 존재");
if (dict && dict.correctOrderRejected) blockers.push(`정답인데 오답 처리 ${dict.correctOrderRejected}건`);
if (comp) {
  const sum = (k) => Object.values(comp.totals).reduce((a, t) => a + (t[k] || 0), 0);
  if (sum("missing-file")) blockers.push("강의 데이터 파일 누락");
}
if (saysGo && blockers.length) fail("GO 라고 쓸 수 없음", blockers.join(" · "));
else if (saysGo) ok("GO 조건 충족", "차단 조건 없음");
else ok("판정", `GO 로 적지 않음 (남은 차단 조건 ${blockers.length}건: ${blockers.join(" · ") || "없음"})`);

// ---------------------------------------------------------------- 5. 완료라고 말할 자격이 있는가
if (cov && cov.lessons.totals.notTested > 0 && /감사 완료|점검 완료|전부 점검|모두 점검/.test(text)) {
  fail("완료 선언 부적절", `미점검 ${cov.lessons.totals.notTested}개가 남아 있는데 완료라고 적혀 있습니다 (§17)`);
} else ok("완료 선언", cov ? `미점검 ${cov.lessons.totals.notTested}개` : "커버리지 미산출");

// ---------------------------------------------------------------- 6. 밝혀야 할 한계가 적혀 있는가
const MUST_SAY = [
  { key: "자체 검수임을 밝힘", re: /(제가|내가|같은 에이전트).{0,40}(검수|점검).{0,40}(아닙니다|아니라|독립)|독립적인 제3자 검토가 아/ },
  { key: "실제 기기 미확인을 밝힘", re: /(아이폰|안드로이드|실제 기기).{0,60}(확인.{0,10}없|확인하지 않)/ },
  { key: "도구 오류를 밝힘", re: /도구.{0,20}(오류|결함).{0,20}\d+건|철회/ },
];
for (const m of MUST_SAY) (m.re.test(text) ? ok("한계 명시", m.key) : fail("한계가 적혀 있지 않음", m.key));

// ---------------------------------------------------------------- 결과
console.log(`보고서 점검 — 통과 ${passes.length} · 문제 ${problems.length}\n`);
for (const p of problems) console.log(`  ✘ ${p.what}: ${p.detail}`);
if (!problems.length) for (const p of passes.slice(0, 8)) console.log(`  ✔ ${p.what}: ${p.detail}`);
fs.writeFileSync(path.join(OUT, "report-verification.json"), JSON.stringify({ at: new Date().toISOString(), passes, problems }, null, 1));
console.log(`\n→ ${path.join(OUT, "report-verification.json")}`);
process.exit(problems.length ? 1 : 0);
