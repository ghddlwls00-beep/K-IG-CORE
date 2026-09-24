#!/usr/bin/env node
/**
 * 7단계 7-2 깨기 — 감사 쪽(lib/expectations.cjs clipTexts → audio-inventory · check-completeness)이 '앱이 소리 내는 글' 한 정의를 쓰는가.
 *   사본 A: READING pr001-1 의 한국어 한 문장을 바꿈 → 그 쪽이 요구하는 클립이 **하나도 늘지 않아야** 한다(READING 한국어는 소리 안 냄).
 *   사본 B: STUDENT s1-1 의 한국어 해석 한 줄을 바꿈 → 새로 요구하는 클립 1 · 그 클립이 이 컴퓨터에도 R2 에도 **없음 1** 이어야 한다.
 * 사본은 메모리 안에서만 만든다(fs.readFileSync 가 그 한 파일에 바꾼 글을 돌려주게) — 저장소 파일은 건드리지 않는다.
 *   node docs/qa-2026-09-18/scripts/prove-clip-definition-break.cjs      두 사본이 기대대로면 exit 0
 */
const fs = require("fs");
const path = require("path");
const { REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { r2ClipKeys, LOCAL_ONLY_WARNING } = require("./lib/r2-keys.cjs");
const E = require("./lib/expectations.cjs");

const realRead = fs.readFileSync;
const CASES = [
  {
    name: "A READING 한국어 한 줄", course: "reading", id: "pr001-1",
    edit: (d) => { const s = (d.readingSentences || []).find((x) => x && x.korean); s.korean = `${s.korean} (깨기 시험 한 줄)`; return s.korean; },
    want: { added: 0, missing: 0 },
  },
  {
    name: "B STUDENT 한국어 한 줄", course: "student", id: "s1-1",
    edit: (d) => { const b = (d.blocks || []).find((x) => x && x.type === "paragraph" && x.lang === "ko"); b.text = `${b.text} (깨기 시험 한 줄)`; return b.text; },
    want: { added: 1, missing: 1 },
  },
];

(async () => {
  const bucket = await r2ClipKeys();
  if (!bucket) console.warn(LOCAL_ONLY_WARNING);
  const onDisk = new Set(fs.readdirSync(path.join(REPO, "public/audio/azure-ava/v1")).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)));
  const keyOf = (t) => E.unified.unifiedSpeechKey(t);
  let ok = true;
  for (const c of CASES) {
    const file = path.join(REPO, "content/lessons", c.course, `${c.id}.json`);
    const before = new Set(E.expected(c.course, c.id).clipTexts);
    const copy = JSON.parse(realRead(file, "utf8"));
    const changedLine = c.edit(copy);
    fs.readFileSync = function (p, ...rest) {
      if (path.resolve(String(p)) === path.resolve(file)) return JSON.stringify(copy);
      return realRead.call(fs, p, ...rest);
    };
    let after;
    try { after = new Set(E.expected(c.course, c.id).clipTexts); } finally { fs.readFileSync = realRead; }
    const added = [...after].filter((t) => !before.has(t));
    const missing = added.filter((t) => { const k = keyOf(t); return !onDisk.has(k) && !(bucket && bucket.has(k)); });
    const pass = added.length === c.want.added && missing.length === c.want.missing;
    if (!pass) ok = false;
    console.log(`${pass ? "PASS" : "FAIL"} 사본 ${c.name} (${c.course}/${c.id}) — 바꾼 줄 ${JSON.stringify(changedLine.slice(0, 40))}… · 요구 클립 ${before.size} → ${after.size} · 새로 요구 ${added.length}(기대 ${c.want.added}) · 클립 없음 ${missing.length}(기대 ${c.want.missing})`);
    for (const t of added) console.log(`    새로 요구: ${keyOf(t)} ${JSON.stringify(t.slice(0, 60))}`);
  }
  console.log(`파일은 그대로(메모리 사본) · R2 ${bucket ? `${bucket.size}개와 함께 봄` : "못 봄"}`);
  process.exit(ok ? 0 : 1);
})();
