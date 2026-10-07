// fix-list 2nd batch small test: grammar2 titles (44), STUDENT/ADULT names (16), PASS-OFF row code (33).
// --break=pad puts the old padStart title back in memory and must FAIL.
const fs = require("fs");
const path = require("path");
const REPO = process.argv[2];
const BREAK = process.argv.includes("--break=pad");
const ts = require(path.join(REPO, "node_modules/typescript"));
let src = fs.readFileSync(path.join(REPO, "src/lib/curriculumPresentation.ts"), "utf8");
if (BREAK) src = src.replace("${Number(lessonNum) || lessonNum}과 · 패턴", "${lessonNum}과 · 패턴");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const P = mod.exports;
let fail = 0;
const ck = (name, ok, saw) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — saw ${JSON.stringify(saw)}`}`); if (!ok) fail++; };

// 44 — every grammar2 lesson title and group title agree on '제 N과' (no leading zero)
const idx = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/grammar2.json"), "utf8"));
const lessons = idx.lessons || [];
const titles = lessons.map((l) => P.formatLessonPresentation("grammar2", l).title);
ck("44 grammar2 lessons found", lessons.length > 40, lessons.length);
ck("44 no '제 0N과' title", titles.every((t) => !/제 0\d+과/.test(t)), titles.filter((t) => /제 0\d+과/.test(t)).slice(0, 3));
const g7 = lessons.find((l) => l.id === "gh2-007");
ck("44 gh2-007 = '제 7과 · 패턴 영작 훈련'", g7 && P.formatLessonPresentation("grammar2", g7).title === "제 7과 · 패턴 영작 훈련", g7 && P.formatLessonPresentation("grammar2", g7).title);
const g44 = lessons.find((l) => l.id === "gh2-044");
ck("44 gh2-044 era note kept", g44 && /1996년/.test(P.formatLessonPresentation("grammar2", g44).subtitle), g44 && P.formatLessonPresentation("grammar2", g44).subtitle);
const groups = (idx.groups || []).map((g) => P.formatGroupTitle("grammar2", g.label || g.title || ""));
ck("44 group heads '제 N과 ~ 제 M과'", groups.length > 0 && groups.every((g) => !/제 0\d/.test(g)), groups.slice(0, 2));

// 16 — the two helpers' rule, on real STUDENT / ADULT presentations
const nameOutsideChapter = (slug, pres) => (slug === "student" || slug === "adult" ? `${pres.code} · ${pres.title.replace(/^Part \d+ · /, "")}` : pres.title);
const freeLessonName = (slug, l) => { if (slug !== "student" && slug !== "adult") return l.title; const m = l.href.match(/\/[sa](\d+)-(\d+)$/); return m ? `Ch ${m[1]}-${m[2]} · ${l.title.replace(/^Part \d+ · /, "")}` : l.title; };
for (const [slug, id] of [["adult", "a2-1"], ["adult", "a1-1"], ["student", "s1-1"], ["student", "s12-1"]]) {
  const ci = JSON.parse(fs.readFileSync(path.join(REPO, `content/courses/${slug}.json`), "utf8"));
  const l = ci.lessons.find((x) => x.id === id);
  if (!l) { ck(`16 ${slug}/${id} exists`, false, null); continue; }
  const pres = P.formatLessonPresentation(slug, l);
  const a = nameOutsideChapter(slug, pres);
  const b = freeLessonName(slug, { href: `/${slug}/${id}`, title: pres.title });
  ck(`16 ${id}: '${a}' starts with the chapter code and both helpers agree`, a.startsWith(`Ch ${id.slice(1)} · `) && a === b && !/Part \d+ ·/.test(a), { a, b });
}
const a21 = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/adult.json"), "utf8")).lessons;
const n21 = nameOutsideChapter("adult", P.formatLessonPresentation("adult", a21.find((x) => x.id === "a2-1")));
const n11 = nameOutsideChapter("adult", P.formatLessonPresentation("adult", a21.find((x) => x.id === "a1-1")));
ck("16 a2-1 and a1-1 no longer read the same", n21 !== n11, { n21, n11 });
ck("16 other courses unchanged", nameOutsideChapter("ld", { code: "Round 001", title: "001회 · 실전 듣기 평가" }) === "001회 · 실전 듣기 평가", null);

// 33 — PASS-OFF row number
const po = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8")).lessons;
const codes = po.filter((l) => l.variant === "main").map((l) => P.formatLessonPresentation("passoff-grammar", l).code.replace(/^(?:Ch|Topic)\s*/, ""));
ck("33 PASS-OFF row numbers 'T-L' (≤ 5 chars)", codes.length > 60 && codes.every((c) => /^\d{1,2}-\d{1,2}$/.test(c)), codes.filter((c) => !/^\d{1,2}-\d{1,2}$/.test(c)).slice(0, 3));
ck("33 first row '1-1'", codes[0] === "1-1", codes[0]);

console.log(fail ? `FAIL ${fail}` : "ALL PASS");
process.exit(fail ? 1 : 0);
