#!/usr/bin/env node
/**
 * 전수 읽기 GRAMMAR 일꾼용 — 앱 채점 함수(src/lib/grammarGrading.ts gradeAgainstReferences)를 그대로 불러
 * 앱과 같은 참조 [정답, ...다른 정답](GrammarLearningView.tsx 474 · 752)으로 잰다. 저장소 파일은 읽기만(쓰지 않음).
 *
 *   node grade.cjs <cases.json>
 *   cases.json = [ { "묶음": "grammar1/gh1-064", "번호": "12", "답": ["He is tall.", "…"] },
 *                  { "참조": ["It is a triangle.", "…"], "답": ["…"] } ]
 *   - 묶음 · 번호로 찾으면 읽을거리와 같은 함수(render.cjs grammarPair · expectations pairOf)로 그 문항의 정답 · 다른 정답을 쓴다.
 *   - 찾은 문항마다 '정답 자체 → 만점' 을 같이 찍는다(찾기가 맞았다는 확인). 번호가 두 쪽에 있으면 둘 다 찍는다.
 *   - 시작할 때 도구 확인: 같은 글 → 만점 · 다른 글 → 0점 · 기능어 하나 더 → 70점 이 아니면 멈춘다(늘 한쪽만 내는 도구가 아님).
 */
const fs = require("fs");
const path = require("path");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const E = L.loadExpectations();
const Rn = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/render.cjs"));
const G = L.loadTsModule("src/lib/grammarGrading.ts");

const NAME = { exact: "만점", partial: "70점", incorrect: "0점" };
// 앱의 cleanText(GrammarLearningView.tsx 60~66) — 앞 번호를 떼고 빗금을 띄어 쓴 뒤에 채점 · 표시한다
const cleanText = (t) => (t ? String(t).replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
const grade = (answer, refs) => G.gradeAgainstReferences(String(answer), refs.map(cleanText).filter(Boolean));

// 도구 확인 — 이 셋이 다르면 도구가 틀린 것
const ctl = [
  ["It is a triangle.", ["It is a triangle."], "exact"],
  ["It is a banana.", ["It is a triangle."], "incorrect"],
  ["He finished the work.", ["He finished work."], "partial"],
];
for (const [a, r, want] of ctl) {
  const got = grade(a, r);
  if (got !== want) { console.error(`도구 확인 실패: ${JSON.stringify(a)} vs ${JSON.stringify(r)} → ${got} (기대 ${want})`); process.exit(3); }
}
console.log("도구 확인 ✔ 같은 글 → 만점 · 다른 낱말 → 0점 · 기능어 하나 더 → 70점");

const file = process.argv[2];
if (!file) { console.error("쓰는 법: node grade.cjs <cases.json>"); process.exit(2); }
const cases = JSON.parse(fs.readFileSync(path.resolve(file), "utf8").replace(/^\uFEFF/, ""));

function pagesOfGroup(group) {
  const m = /^(grammar1|grammar2)\/gh([12])-(\d{3})$/.exec(group);
  if (!m) return null;
  const course = m[1];
  const n = parseInt(m[3], 10);
  const pad = (x) => String(x).padStart(3, "0");
  const re = course === "grammar1" ? new RegExp(`^gh1-(${pad(n)}|${pad(n + 1)})(-\\d+)?$`) : new RegExp(`^gh2-${pad(n)}(-\\d+)?$`);
  return { course, pages: E.pages(course).map((p) => p.id).filter((id) => re.test(id)) };
}

for (const [i, c] of cases.entries()) {
  const answers = Array.isArray(c.답) ? c.답 : [c.답];
  let refsets = [];
  if (Array.isArray(c.참조)) refsets.push({ where: "직접 준 참조", refs: c.참조 });
  else {
    const g = pagesOfGroup(String(c.묶음 || ""));
    if (!g) { console.log(`#${i + 1} 묶음 이름이 틀림: ${c.묶음} (예: grammar1/gh1-064 · grammar2/gh2-011)`); continue; }
    const seen = new Set();
    for (const p of g.pages) {
      const pr = Rn.grammarPair(L.HEAD, g.course, p, E.pairOf(g.course, p));
      if (!pr) continue;
      for (const r of pr.rows) {
        if (String(r.label) !== String(c.번호)) continue;
        const key = JSON.stringify([r.en, r.alts]);
        if (seen.has(key)) continue;
        seen.add(key);
        refsets.push({ where: `${p} 번호 ${r.label} · KO ${JSON.stringify(r.ko)}`, refs: [r.en, ...r.alts] });
      }
    }
    if (!refsets.length) { console.log(`#${i + 1} ${c.묶음} 번호 ${c.번호} 를 못 찾음 — 읽을거리의 [번호 N] 을 그대로`); continue; }
  }
  for (const s of refsets) {
    console.log(`#${i + 1} ${s.where}`);
    console.log(`   정답 ${JSON.stringify(cleanText(s.refs[0]))}${s.refs.length > 1 ? ` · 다른 정답 ${s.refs.length - 1}: ${s.refs.slice(1).map((x) => JSON.stringify(cleanText(x))).join(" / ")}` : ""}`);
    const self = grade(cleanText(s.refs[0]), s.refs);
    console.log(`   찾기 확인: 정답 자체 → ${NAME[self]}${self === "exact" ? " ✔" : " ✘(찾기가 틀림)"}`);
    for (const a of answers) console.log(`   ${JSON.stringify(a)} → ${NAME[grade(a, s.refs)]}`);
  }
}
