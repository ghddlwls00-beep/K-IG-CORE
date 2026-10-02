#!/usr/bin/env node
/**
 * STUDENT 원본 대조 예외 목록(student-original-exceptions.json)을 2026-10-02 '원래 낱말로 되살리기'(scripts/restore-sample-words.mjs)에
 * 맞춘다 — 되살린 문장의 옛 예외(빈칸 판)는 빼고, 그 문장이 지금 원본과 다른 곳은 사유와 함께 새로 적는다. 다른 문장의 예외는 건드리지 않는다.
 * 한 번 돌리면 check-student-original.mjs 가 '설명 없음 0 · 낡은 예외 0' 이어야 한다.
 *   node docs/qa-2026-09-18/scripts/update-exceptions-sample-words.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { compareLesson, sentencesOf, koParasOf } from "./lib/student-original.mjs";
import { RESTORE } from "../../../scripts/restore-sample-words.mjs";

const REPO = path.resolve(import.meta.dirname, "../../..");
const ARCH = process.env.KIG_ARCHIVE || "C:/Users/ghddl/Desktop/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01";
const EXC_FILE = path.join(REPO, "docs/qa-2026-09-18/student-original-exceptions.json");
const WHY = "사장님 2026-10-02 '원래 낱말로 되살리기' · '이렇게 오류 있는거 다 찾아서 변경해' — 9/17 · 6단계가 빈칸 표시로 바꾼 교재의 예시 낱말을 되살림(scripts/restore-sample-words.mjs)";

const req = createRequire(import.meta.url);
const ts = req(path.join(REPO, "node_modules", "typescript"));
const mod = { exports: {} };
new Function("module", "exports", ts.transpileModule(fs.readFileSync(path.join(REPO, "src/lib/lessonSpeechForm.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(mod, mod.exports);
const { romanizedForm } = mod.exports;

const exceptions = JSON.parse(fs.readFileSync(EXC_FILE, "utf8"));
let removed = 0, added = 0;
for (const [page, sentences] of Object.entries(RESTORE)) {
  const [course, id] = page.split("/");
  if (course !== "student") continue;
  const at = new Set(Object.keys(sentences).map(Number));
  const oldTexts = new Set(Object.values(sentences).flatMap(({ en, ko }) => [romanizedForm(page, en[0]), en[0], ko[0]]));
  for (let i = exceptions.length - 1; i >= 0; i--) {
    const e = exceptions[i];
    if (e.lesson === id && (oldTexts.has(e.text) || oldTexts.has(e.en))) { exceptions.splice(i, 1); removed++; }
  }
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", `${id}.json`), "utf8"));
  const r = compareLesson(ARCH, id, sentencesOf(d).map((t) => romanizedForm(page, t)), koParasOf(d));
  for (const diff of r.diffs) {
    if (!at.has(diff.at)) continue;
    if (exceptions.some((e) => e.lesson === id && e.kind === diff.kind && e.text === diff.text)) continue;
    const row = { lesson: id, kind: diff.kind, text: diff.text, original: diff.original };
    if (diff.en) row.en = diff.en;
    row.why = WHY;
    exceptions.push(row);
    added++;
  }
}
fs.writeFileSync(EXC_FILE, JSON.stringify(exceptions, null, 1) + "\n", "utf8");
console.log(`예외 뺌 ${removed} · 더함 ${added} · 지금 ${exceptions.length}줄`);
