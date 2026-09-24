#!/usr/bin/env node
/**
 * GRAMMAR I 강의 부제목의 단계(src/lib/curriculumPresentation.ts formatLessonPresentation) = 과정 목록의 단계 묶음인가 — 6-1372.
 * 과정 목록(content/courses/grammar1.json groups)은 한국어 문제 쪽(짝수) 강의로 단계를 묶는다. 영어 답 쪽(홀수)과 분할본(-1 · -2)은
 * 그 짝 한국어 강의의 단계여야 한다. 주소 있는 grammar1 페이지 전부에서 부제목의 '제 N단계' 와 목록 단계가 다른 페이지를 센다.
 *
 *   node check-grammar1-stages.cjs [--old] [--list]
 *   --old : 고치기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞)의 curriculumPresentation.ts 로 (경계 5곳의 영어 답 쪽이 다음 단계로 나와
 *           0 이 아니어야 정상, exit 1). 전에는 git HEAD 였는데 고친 것이 커밋된 뒤로는 HEAD 가 고친 판이라 0 이었다(7-1 n).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const OLD = process.argv.includes("--old");
const PRE_FIX_REV = "f35e8be";
const src = OLD ? execSync(`git show ${PRE_FIX_REV}:src/lib/curriculumPresentation.ts`, { cwd: REPO, encoding: "utf8" }) : fs.readFileSync(path.join(REPO, "src/lib/curriculumPresentation.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, (m) => require(m.startsWith("@/") ? path.join(REPO, "src", m.slice(2)) : m));
const { formatLessonPresentation } = mod.exports;
const idx = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/grammar1.json"), "utf8"));
const stageOfKo = new Map();
idx.groups.forEach((g) => { const s = Number((g.label.match(/(\d+)/) || [])[1]); for (const id of g.lessons) stageOfKo.set(id, s); });
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons.grammar1 || [];
const bad = [];
let n = 0;
for (const id of routes) {
  const entry = idx.lessons.find((l) => l.id === id) || { id };
  const num = parseInt(id.slice(4, 7), 10);
  const ko = `gh1-${String(num % 2 ? num - 1 : num).padStart(3, "0")}`;
  const want = stageOfKo.get(ko);
  if (!want) continue;
  n++;
  const got = Number((formatLessonPresentation("grammar1", entry).subtitle.match(/제 (\d+)단계/) || [])[1]);
  if (got !== want) bad.push(`${id} 부제목 ${got}단계 · 목록 ${want}단계`);
}
console.log(`${OLD ? `[고치기 전 ${PRE_FIX_REV}] ` : ""}grammar1 페이지 ${n} · 부제목 단계가 목록 단계와 다른 페이지 ${bad.length}`);
if (process.argv.includes("--list") || OLD) for (const b of bad) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
