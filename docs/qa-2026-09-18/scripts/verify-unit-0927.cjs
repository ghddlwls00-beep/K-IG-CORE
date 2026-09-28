#!/usr/bin/env node
/**
 * 2026-09-27 — 학습법 · 화면 고침(사장님 01:45 "섹션 하나씩, 문장 · 번역 · 음성은 그대로")의 섹션 하나가 끝날 때마다 돌리는 불변 검사.
 * 고친 것이 글 · 번역 · 소리를 건드리지 않았고 빌드가 되는지를 기계로 본다. 하나라도 어긋나면 exit 1.
 *
 *   1. 글 · 번역 그대로: content/ · src/lib/readingSentences.json · src/lib/readingVocabulary.json 이 기준 커밋과 같은가(git diff)
 *      — 2026-09-28 새 문제 폴더 content/questions/ 만 빼고 따로 셈(새-문제-설계.md §2)
 *   2. 소리 정의 그대로: scripts/lib/spoken-texts.cjs · src/lib/lessonSpeechForm.ts · src/lib/vocaSpeech.ts · src/lib/unifiedSpeech.ts 가 같은가
 *   3. 소리 낼 글 수 그대로 · 새로 만들 클립 0: generate-azure-ava --dry-run 의 과정별 items 가 기준(2026-09-27 01:5x)과 같고 pending 0
 *   4. prove-spoken-definition exit 0 · check-completeness missing-clip 0
 *   5. npx tsc --noEmit exit 0 · (--build) prebuild 셋 + npx next build exit 0
 *
 *   node verify-unit-0927.cjs [--base <커밋, 기본 8bfc512>] [--build] [--tag frame] [--break content|spoken|items|items-passoff]
 *   --break: 검사가 실패를 잡는지 — 임시로 어긋난 값을 넣은 것처럼 판정만 바꿔 exit 1 이 나는지 본다(파일은 건드리지 않음).
 * 결과: out/unit-0927/<tag>.json
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BASE_COMMIT = arg("--base", "8bfc512");
const BUILD = process.argv.includes("--build");
const TAG = arg("--tag", "unit");
const BREAK = arg("--break", "");
const OUT = path.join(REPO, "docs/qa-2026-09-18/out/unit-0927");
fs.mkdirSync(OUT, { recursive: true });

// 기준: 고치기 전(2026-09-27 01:5x, 앱 29d527a · 기록 8bfc512) generate-azure-ava --dry-run 의 과정별 items
// 2026-09-27 LISTENING F03(계획 D26 가 · LD-L15 — 사장님 "검토 결과대로"): 소리 클리닉에서 틀린 카드만 뺌(have one · 동사 아닌 말 앞의
// going to · 문장부호를 넘는 짝 · 축약 조각 · 자음 소리로 시작하는 낱말 앞 · -aw 뒤). 남은 카드의 글은 그대로라 새 클립 0 · 늘어난 글 0,
// LISTENING 이 더는 소리 내지 않는 구절 347개만 빠져 ld 5,499 → 5,152. 빠진 구절 목록: docs/qa-2026-09-18/학습법-화면-0927/
// ld-clinic-removed-phrases.json (check-ld-dictation-0927.cjs --write-removed 가 만듦 — 바탕 f2a1b2d 의 함수와 견줌). 다른 과정은 그대로.
// 2026-09-29 PASS-OFF GRAMMAR(09-28 출시 aa1cd8a): 1,281. 아래 정규식이 (\w+) 라 이름의 하이픈을 못 읽어 이 과정은 한 번도 세지 않았음
// (올리기 전 확인 97d936d 가 찾음) — ([\w-]+) 로 고치고 기준값을 넣음. --break items-passoff 로 잡히는지 봄.
const BASELINE_ITEMS = { student: 828, phonics: 3906, grammar1: 1454, grammar2: 795, ld: 5152, reading: 3873, "passoff-grammar": 1281 };
const CONTENT_PATHS = ["content", "src/lib/readingSentences.json", "src/lib/readingVocabulary.json"];
const SPOKEN_PATHS = ["scripts/lib/spoken-texts.cjs", "src/lib/lessonSpeechForm.ts", "src/lib/vocaSpeech.ts", "src/lib/unifiedSpeech.ts"];

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`); };
const run = (cmd, args, opts = {}) => {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, secs: Math.round((Date.now() - t0) / 1000) };
};

// 1 · 2 — git diff 가 비었는가
const diffNames = (paths) => run("git", ["-c", "core.quotepath=false", "diff", "--name-only", BASE_COMMIT, "--", ...paths]).out.split(/\r?\n/).filter(Boolean);
// 2026-09-28 새 문제(사장님 "아니 나로 해" — 새-문제-설계.md §2): content/questions/ 는 새 폴더(LISTENING · READING 문제)라
// '기존 글 · 번역 그대로'에서 빼고 따로 셈 — 그 밖의 content 는 전과 같이 한 글자도 달라지면 안 됨
const QUESTION_DIR = "content/questions/";
const allContentDiff = diffNames(CONTENT_PATHS);
let contentDiff = allContentDiff.filter((f) => !f.startsWith(QUESTION_DIR));
const questionDiff = allContentDiff.filter((f) => f.startsWith(QUESTION_DIR));
let spokenDiff = diffNames(SPOKEN_PATHS);
if (BREAK === "content") contentDiff = ["(깨기) content/lessons/ld/d001.json"];
console.log(`(새 문제 폴더 ${QUESTION_DIR} 바뀐 파일 ${questionDiff.length} — '글 · 번역 그대로'에서 뺌)`);
if (BREAK === "spoken") spokenDiff = ["(깨기) scripts/lib/spoken-texts.cjs"];
check("글 · 번역 그대로", contentDiff.length === 0, contentDiff.length ? `바뀐 파일 ${contentDiff.length}: ${contentDiff.join(", ")}` : `기준 ${BASE_COMMIT} 과 같음`);
check("소리 정의 그대로", spokenDiff.length === 0, spokenDiff.length ? `바뀐 파일: ${spokenDiff.join(", ")}` : "같음");

// 3 — 과정별 소리 낼 글 수 · pending
const gen = run("node", ["scripts/generate-azure-ava.mjs", "--dry-run"]);
const items = {};
for (const m of gen.out.matchAll(/^\s*([\w-]+)\s*: items ([\d,]+) · pending ([\d,]+)/gm)) items[m[1]] = { items: +m[2].replace(/,/g, ""), pending: +m[3].replace(/,/g, "") };
if (BREAK === "items" && items.ld) items.ld.items += 1;
if (BREAK === "items-passoff" && items["passoff-grammar"]) items["passoff-grammar"].items += 1;
const itemBad = Object.entries(BASELINE_ITEMS).filter(([c, n]) => !items[c] || items[c].items !== n || items[c].pending !== 0);
check("소리 낼 글 수 그대로 · 새 클립 0", gen.code === 0 && itemBad.length === 0, itemBad.length ? itemBad.map(([c, n]) => `${c} 기준 ${n} → ${items[c] ? `${items[c].items} · pending ${items[c].pending}` : "없음"}`).join(" | ") : Object.entries(items).map(([c, v]) => `${c} ${v.items}/${v.pending}`).join(" · "));

// 4
const prove = run("node", ["docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs"]);
check("소리 정의 증명", prove.code === 0, `exit ${prove.code} · ${prove.secs}s`);
const comp = run("node", ["docs/qa-2026-09-18/scripts/check-completeness.cjs"]);
const mc = comp.out.match(/missing-clip (\d+)/);
check("빠진 클립 0", comp.code === 0 && mc && +mc[1] === 0, mc ? `missing-clip ${mc[1]}` : `exit ${comp.code} · 줄 못 찾음`);

// 5
const tsc = run("npx", ["tsc", "--noEmit"]);
check("타입 검사", tsc.code === 0, `exit ${tsc.code} · ${tsc.secs}s${tsc.code ? " · " + tsc.out.split(/\r?\n/).filter((l) => /error TS/.test(l)).slice(0, 3).join(" | ") : ""}`);
if (BUILD) {
  const pre = run("node", ["scripts/buildValidRoutes.mjs"]);
  const pre2 = run("node", ["scripts/buildFreeSpeechKeys.mjs"]);
  const pre3 = run("node", ["scripts/buildSearchIndex.mjs"]);
  check("prebuild 셋", pre.code === 0 && pre2.code === 0 && pre3.code === 0, `validRoutes ${pre.code} · freeSpeechKeys ${pre2.code} · searchIndex ${pre3.code}`);
  const build = run("npx", ["next", "build"]);
  check("next build", build.code === 0, `exit ${build.code} · ${build.secs}s${build.code ? " · " + build.out.slice(-400).replace(/\s+/g, " ") : ""}`);
}

const ok = results.every((r) => r.ok);
const file = path.join(OUT, `${TAG}${BREAK ? "-break-" + BREAK : ""}.json`);
fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), base: BASE_COMMIT, head: run("git", ["rev-parse", "--short", "HEAD"]).out.trim(), break: BREAK || null, ok, results }, null, 1));
console.log(`\n${ok ? "모두 통과" : "어긋남 있음"} → ${path.relative(REPO, file)}`);
process.exitCode = ok ? 0 : 1;
