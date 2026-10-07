#!/usr/bin/env node
/**
 * UI검토-1007 고침3 fix-c2 — 4장 8(구간 머리 한글 하나) · 16 · 12 를 앱의 함수 그대로 돌려 봄(브라우저 없음 · 읽기만).
 *   A 8과정 구간 머리(formatGroupTitle)에 영어 머리(Chapter · TOPIC · Section · Series · Stage) 0 · 'N장 ·' 'N대주제 ·' 꼴
 *   B STUDENT · ADULT · PASS-OFF · VOCA · GRAMMAR I 강의의 구간 줄(subtitle, 과정 색인 · 강의 파일 둘 다) = 그 강의가 든 구간 머리
 *   C STUDENT · ADULT 제목 '<장>-<강> · …' · code '<장>-<강>' · 'Part ' · 'Ch ' 0 — 잠긴 a2-1 ≠ 무료 a1-1
 *   D 대주제 조사(을/를 · 이/가 · 은/는) 1~20
 *   E public/search-index.json: badge 0 · '발음' 으로 찾히는 것 0 · '직독직해' 0 · subtitle = 구간 머리(8과정 모두)
 *   --break=english : formatGroupTitle 이 옛 꼴 '(Stage N)' · 'Section N ·' 를 붙이게 메모리에서 바꿔 A · B 가 FAIL 하는지
 *   --break=badge   : 색인 항목에 badge '🎙️ 발음 채점' 을 메모리에서 되살려 E 가 FAIL 하는지
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) || "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const ts = require(path.join(REPO, "node_modules", "typescript"));
const src = fs.readFileSync(path.join(REPO, "src/lib/curriculumPresentation.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const P = mod.exports;
if (BREAK === "english") {
  const orig = P.formatGroupTitle;
  P.formatGroupTitle = (c, l) => (c === "grammar1" ? `${orig(c, l)} (Stage 1)` : c === "ld" ? `Section 1 · ${orig(c, l)}` : orig(c, l));
}
let fail = 0, pass = 0;
const ck = (name, ok, detail) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name}${detail ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); } };
const ENGLISH_HEAD = /\b(Chapter|TOPIC|Topic|Section|Series|Stage|Part|Ch)\b/;
const COURSES = ["student", "adult", "passoff-grammar", "ld", "reading", "phonics", "grammar1", "grammar2"];
const SECTION_LINE = new Set(["student", "adult", "passoff-grammar", "phonics", "grammar1"]);
const heads = {};
for (const c of COURSES) {
  const idx = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", c + ".json"), "utf8"));
  const sectionOf = new Map();
  idx.groups.forEach((g, i) => {
    const head = P.formatGroupTitle(c, g.label || g.title || "");
    ck(`A ${c} 구간 ${i + 1} 영어 머리 없음`, !ENGLISH_HEAD.test(head) && !/\(MV\d|\(HV/.test(head), head);
    if (c === "student" || c === "adult") ck(`A ${c} 구간 ${i + 1} 'N장 · ' 꼴`, new RegExp(`^${i + 1}장 · [가-힣]`).test(head), head);
    if (c === "passoff-grammar") ck(`A ${c} 구간 ${i + 1} '대주제 N · ' 꼴`, new RegExp(`^대주제 ${i + 1} · `).test(head), head);
    for (const id of g.lessons) sectionOf.set(id, head);
  });
  heads[c] = sectionOf;
  for (const l of idx.lessons.filter((x) => x.variant === "main")) {
    const fromIndex = P.formatLessonPresentation(c, l);
    const file = path.join(REPO, "content/lessons", c, l.id + ".json");
    const fromFile = fs.existsSync(file) ? P.formatLessonPresentation(c, JSON.parse(fs.readFileSync(file, "utf8"))) : null;
    if (SECTION_LINE.has(c)) {
      for (const [where, pres] of [["색인", fromIndex], ["파일", fromFile]]) {
        if (!pres) continue;
        ck(`B ${c}/${l.id} 구간 줄(${where}) = 구간 머리`, pres.subtitle.split(" · 2002년")[0] === sectionOf.get(l.id), { sub: pres.subtitle, head: sectionOf.get(l.id) });
      }
    }
    if (c === "student" || c === "adult") {
      const code = l.id.replace(/^[sa]/, "");
      ck(`C ${c}/${l.id} 제목 · code`, fromIndex.code === code && fromIndex.title.startsWith(`${code} · `) && !/\b(Part|Ch)\b/.test(fromIndex.title) && fromIndex.name && fromIndex.title === `${code} · ${fromIndex.name}`, fromIndex);
      if (fromFile) ck(`C ${c}/${l.id} 색인 제목 = 파일 제목`, fromFile.title === fromIndex.title, [fromIndex.title, fromFile.title]);
    }
    if (c === "passoff-grammar") ck(`C ${c}/${l.id} code 'T-L'`, /^\d+-\d+$/.test(fromIndex.code), fromIndex.code);
  }
}
{
  const a = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/adult.json"), "utf8")).lessons;
  const t = (id) => P.formatLessonPresentation("adult", a.find((x) => x.id === id)).title;
  ck("C 잠긴 a2-1 제목 ≠ 무료 a1-1 제목", t("a2-1") !== t("a1-1") && t("a2-1").startsWith("2-1 · ") && t("a1-1").startsWith("1-1 · "), [t("a2-1"), t("a1-1")]);
}
const READ = { 1: "을이은", 2: "를가는", 3: "을이은", 4: "를가는", 5: "를가는", 6: "을이은", 7: "을이은", 8: "을이은", 9: "를가는", 10: "을이은", 11: "을이은", 12: "를가는", 13: "을이은", 14: "를가는", 15: "를가는", 16: "을이은", 17: "을이은", 18: "을이은", 19: "를가는", 20: "을이은" };
for (let n = 1; n <= 20; n++) {
  const got = ["을/를", "이/가", "은/는"].map((p) => P.passoffTopicWithParticle(n, p).replace(`대주제 ${n}`, "")).join("");
  ck(`D 대주제 ${n} 조사`, got === READ[n], got);
}
const index = JSON.parse(fs.readFileSync(path.join(REPO, "public/search-index.json"), "utf8"));
if (BREAK === "badge") index.filter((i) => i.course === "phonics").forEach((i) => { i.badge = "🎙️ 발음 채점"; i.searchText += " 🎙️ 발음 채점"; });
ck("E 색인 badge 0", index.every((i) => !i.badge), index.find((i) => i.badge));
ck("E '발음' 으로 찾히는 강의 0", index.filter((i) => i.searchText.includes("발음")).length === 0, index.filter((i) => i.searchText.includes("발음")).length);
ck("E '직독직해' 0", index.filter((i) => i.searchText.includes("직독직해")).length === 0);
for (const i of index) {
  const want = heads[i.course] && heads[i.course].get(i.id);
  if (want !== undefined) ck(`E ${i.course}/${i.id} 색인 subtitle = 구간 머리`, i.subtitle === want, [i.subtitle, want]);
  ck(`E ${i.course}/${i.id} 색인 제목 · 구간 영어 머리 없음`, !ENGLISH_HEAD.test(`${i.title} ${i.subtitle}`.replace(/Greeting|[A-Za-z]+ \(/g, "")) || !/\b(Chapter|TOPIC|Section|Series|Stage)\b/.test(`${i.title} ${i.subtitle}`), i);
}
console.log(`${BREAK ? `[--break=${BREAK}] ` : ""}PASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
