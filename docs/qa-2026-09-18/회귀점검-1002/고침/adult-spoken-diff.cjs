#!/usr/bin/env node
/**
 * 성인반(ADULT) 소리 글 바뀜 — 회귀 점검 1002 고침(fix-adult-content, 2026-10-05).
 * 커밋된 판(HEAD)과 지금 판의 content/lessons/adult/*.json 마다 앱이 소리 내는 글(scripts/lib/spoken-texts.cjs — 생성기와 같은
 * 한 정의)을 세어, 지금만 있는 글(= 새로 만들 클립)과 HEAD 에만 있던 글(= 더는 안 쓰는 클립)을 찍는다. 네트워크 · R2 안 씀.
 *
 *   node docs/qa-2026-09-18/회귀점검-1002/고침/adult-spoken-diff.cjs [--json]
 *   … --break=choice   지금 판 a2-3 의 빈칸 보기 하나를 메모리에서만 바꿈 → 소리 글 바뀜 0 이어야(보기는 소리를 안 냄)
 *   … --break=ko       지금 판 a2-3 한국어 줄 하나를 메모리에서만 바꿈 → 새 글 1 늘어야(한국어 줄은 소리를 냄)
 * 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");
const { spokenTexts } = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const { unifiedSpeechKey, normalizeUnifiedSpeechText } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const vocaSpeech = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const fns = {
  vocaSpeechForm: vocaSpeech.vocaSpeechForm,
  getCollocation: loadTs(path.join(REPO, "src/lib/vocaUtils.ts")).getCollocation,
  generateLiaisonPoints: loadTs(path.join(REPO, "src/lib/listeningUtils.ts")).generateLiaisonPoints,
  extractSentencesForAudio: loadTs(path.join(REPO, "src/lib/lessonAudioText.ts")).extractSentencesForAudio,
  firstSlashAlternative: loadTs(path.join(REPO, "src/lib/listeningUtils.ts")).firstSlashAlternative,
  vocaWordSpeech: vocaSpeech.vocaWordSpeech,
  readingWordSpeech: vocaSpeech.readingWordSpeech,
  lessonSpeechForm: loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts")).lessonSpeechForm,
};
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", "-c", "core.safecrlf=false", ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 });
const DIR = "content/lessons/adult";
const ids = fs.readdirSync(path.join(REPO, DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
const keyOf = (t) => unifiedSpeechKey(normalizeUnifiedSpeechText(fns.vocaSpeechForm(t)));

const added = [];
const removed = [];
const pages = [];
for (const id of ids) {
  const rel = `${DIR}/${id}.json`;
  const now = JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
  let head = null;
  try { head = JSON.parse(git(["show", `HEAD:${rel}`])); } catch { head = null; }
  if (BREAK && id === "a2-3") {
    if (BREAK === "choice") now.blocks.find((b) => b.type === "sentences").items[0].words[0].choices[0] = "break-test choice";
    if (BREAK === "ko") { const b = now.blocks.find((x) => x.type === "paragraph"); b.text = `${b.text} (깨기 시험)`; }
  }
  const nowT = spokenTexts({ course: "adult", id, lesson: now, fns });
  const headT = head ? spokenTexts({ course: "adult", id, lesson: head, fns }) : [];
  const headKeys = new Set(headT.map(keyOf));
  const nowKeys = new Set(nowT.map(keyOf));
  const a = [...new Set(nowT)].filter((t) => !headKeys.has(keyOf(t)));
  const r = [...new Set(headT)].filter((t) => !nowKeys.has(keyOf(t)));
  if (a.length || r.length) pages.push(id);
  for (const t of a) added.push({ id, text: t, key: keyOf(t) });
  for (const t of r) removed.push({ id, text: t, key: keyOf(t) });
}
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ added, removed }, null, 2));
} else {
  console.log(`ADULT ${ids.length}쪽 — 소리 글이 바뀐 쪽 ${pages.length} (${pages.join(" · ")})`);
  console.log(`새 소리 글(클립 새로 만들 것) ${added.length}:`);
  for (const x of added) console.log(`  + ${x.id} ${x.key}  ${x.text}`);
  console.log(`없어진 소리 글(더는 안 쓰는 클립) ${removed.length}:`);
  for (const x of removed) console.log(`  - ${x.id} ${x.key}  ${x.text}`);
}
