#!/usr/bin/env node
/**
 * STUDENT 14과 원본 되살리기 — 소유자 결정 2026-09-23 "원본으로 다 되살려" (기록: docs/qa-2026-09-18/STUDENT-원본-되살리기.md).
 *
 * 원인: 9/7 커밋 08b77af 가 1-4 에 다른 과정의 'Shy Person' 을 끼우고 취미 · 과목을 한 칸씩 밀어 원본 1-6 'Helping hand' 를 없앴고,
 *       11과의 글을 원본 어디에도 없는 글로 바꿈.
 * 원본: 바탕화면 아카이브 Student/<id>.swf(읽기만) + 첫 커밋 3705523(같은 원본에서 뽑은 것). 두 벌의 영어 문장이 글자까지 같아야 진행.
 *
 * 무엇을 쓰나(과 파일마다 — 녹음 연결 · 다른 칸은 지금 그대로):
 *   1장 s1-4 ← 지금 s1-5 의 글(원본 s1-4 취미 — 9/7 에 밀려 있던 것, 그 뒤 교정 포함) · 제목 Hobby
 *       s1-5 ← 지금 s1-6 의 글(원본 s1-5 과목 — 4·5단계 소유자 기준 9 '3 years' 포함)      · 제목 Favorite Subject
 *       s1-6 ← 원본 s1-6(Helping hand)                                                      · 제목 Helping Hand & Volunteering
 *   11과  ← 원본 영어 · 한국어(원본 swf 의 드릴 조각 · 한국어 줄 차례 = 바른 차례, 아래 ORDER 에 과마다 적음)
 *   드릴(chunkDrills — 화면에 안 나옴, BUG-024) ← 첫 커밋 3705523 의 드릴(원본 추출본)
 *   s11-1 제목 ← 원본 'Saturday Afternoon (토요일 오후)'(6단계 6-1701 이 바뀐 글을 보고 고친 것을 되돌림)
 *
 *   node student-restore-apply.mjs            # 미리 보기
 *   node student-restore-apply.mjs --apply    # 씀
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "../../..");
const APPLY = process.argv.includes("--apply");
const { readArchive } = await import(pathToFileURL(path.join(REPO, "docs/qa-2026-09-18/scripts/student-restore-from-archive.mjs")).href);
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });
const FIRST = "3705523";
const key = (s) => String(s).replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const LESSON = (id) => path.join(REPO, "content/lessons/student", `${id}.json`);
const readNow = (id) => JSON.parse(fs.readFileSync(LESSON(id), "utf8"));
const readFirst = (id) => JSON.parse(git("show", `${FIRST}:content/lessons/student/${id}.json`).replace(/^﻿/, ""));
const sentencesOf = (d) => (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []).map((x) => x.text);
const koOf = (d) => (d.blocks || []).filter((b) => b.type === "paragraph").map((b) => b.text);

/**
 * 과마다 바른 차례: e = 첫 커밋(원본 swf 차례) 영어의 번호, k = 원본 swf 한국어 줄의 번호. 사람이 원본 드릴 조각 · 한국어 줄로 맞춘 것
 * (docs/qa-2026-09-18/STUDENT-원본-되살리기.md '차례 근거' 표).
 */
const ORDER = {
  "s1-6": { e: [3, 2, 0, 1], k: [0, 1, 2, 3] },
  "s4-2": { e: [0], k: [0] },
  "s4-6": { e: [4, 3, 0, 1, 2, 5], k: [0, 1, 2, 3, 4, 5] },
  "s5-5": { e: [4, 3, 0, 1, 2], k: [0, 1, 2, 3, 4] },
  "s7-3": { e: [8, 6, 0, 1, 2, 9, 7, 3, 4, 5, 10], k: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  "s8-2": { e: [4, 3, 0, 1, 2], k: [0, 1, 2, 3, 4] },
  "s9-1": { e: [8, 6, 0, 1, 2, 9, 7, 3, 4, 5], k: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  "s9-2": { e: [5, 3, 0, 1, 2, 6, 4], k: [0, 1, 2, 3, 4, 5, 6] },
  "s11-1": { e: [6, 4, 0, 1, 2, 7, 5, 3], k: [0, 1, 2, 3, 4, 5, 6, 7] },
  "s11-3": { e: [7, 5, 0, 1, 2, 8, 6, 3, 4], k: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  "s11-4": { e: [4, 3, 0, 1, 2], k: [0, 1, 2, 3, 4] },
  "s12-3": { e: [4, 3, 0, 1, 2], k: [0, 1, 2, 3, 4] },
};
const TITLES = {
  "s1-4": { en: "Hobby", ko: "취미" },
  "s1-5": { en: "Favorite Subject", ko: "좋아하는 과목" },
  "s1-6": { en: "Helping Hand & Volunteering", ko: "봉사활동과 남 돕기" },
  "s11-1": { en: "Saturday Afternoon", ko: "토요일 오후" },
};

const plan = {}; // id → { title?, en[], ko[], drills[] }
const problems = [];
// 1장 옮기기: 지금 s1-5 → s1-4, 지금 s1-6 → s1-5 (그 글이 원본 s1-4 · s1-5 인지 원본 swf 로 확인)
for (const [to, from, origin] of [["s1-4", "s1-5", "s1-4"], ["s1-5", "s1-6", "s1-5"]]) {
  const src = readNow(from);
  const en = sentencesOf(src), ko = koOf(src);
  const arch = readArchive(origin);
  const archText = key([...arch.en, ...arch.chunks.map((c) => c.en)].join(" "));
  const notInOrigin = en.filter((s) => !archText.includes(key(s).slice(0, 25)));
  if (notInOrigin.length > 1) problems.push(`${to}: 옮길 글(지금 ${from}) 중 원본 ${origin} 에 없는 문장 ${notInOrigin.length} — ${notInOrigin.join(" | ")}`);
  plan[to] = { title: TITLES[to], en, ko, drills: readFirst(origin).chunkDrills || [], note: `지금 ${from} 의 글(원본 ${origin}) 옮김` };
}
// 원본에서 되살리기
for (const [id, o] of Object.entries(ORDER)) {
  const first = readFirst(id);
  const fe = sentencesOf(first);
  const arch = readArchive(id);
  if (!arch) { problems.push(`${id}: 원본 swf 없음`); continue; }
  // 두 벌 대조: 첫 커밋 영어 = 원본 swf 영어(모음 · 글자)
  const same = fe.length === arch.en.length && fe.every((s) => arch.en.some((x) => key(x) === key(s)));
  if (!same) problems.push(`${id}: 첫 커밋 영어와 원본 swf 영어가 다름 — 첫 커밋 ${fe.length} · swf ${arch.en.length}`);
  if (o.e.length !== fe.length || new Set(o.e).size !== fe.length) problems.push(`${id}: 차례 표가 영어 ${fe.length} 개를 다 쓰지 않음`);
  const en = o.e.map((i) => fe[i]);
  const ko = o.k.map((i) => arch.ko[i]);
  if (ko.some((k) => !k)) problems.push(`${id}: 한국어 줄 번호가 원본에 없음`);
  plan[id] = { title: TITLES[id] || null, en, ko, drills: first.chunkDrills || [], note: "원본 swf · 첫 커밋에서 되살림" };
}
if (problems.length) { console.log(`멈춤 — 어긋남 ${problems.length}`); for (const p of problems) console.log("  " + p); process.exit(1); }

// 파일 만들기(지금 파일의 다른 칸은 그대로)
let wrote = 0;
for (const [id, p] of Object.entries(plan)) {
  const now = readNow(id);
  const next = { ...now };
  const chapterLabel = now.label; // "Chapter 1. Self-introduction (자기소개)"
  if (p.title) {
    next.title = `${p.title.en} (${p.title.ko})`;
    next.menuLabel = `${now.unit}-${now.part}. ${p.title.en}`;
  }
  const instruction = (now.blocks || []).find((b) => b.type === "instruction");
  const blocks = [];
  blocks.push({ ...(instruction || { type: "instruction" }), text: `${chapterLabel} - ${next.title}` });
  blocks.push({ type: "sentences", items: p.en.map((t, i) => ({ n: String(i + 1), text: t })) });
  for (const k of p.ko) blocks.push({ type: "paragraph", text: k, lang: "ko" });
  next.blocks = blocks;
  next.chunkDrills = p.drills;
  const raw = fs.readFileSync(LESSON(id), "utf8");
  const out = JSON.stringify(next, null, 2) + (raw.endsWith("\n") ? "\n" : "");
  console.log(`\n=== ${id} · ${p.note} · 제목 '${next.title}' · 영어 ${p.en.length} · 한국어 ${p.ko.length} · 드릴 ${p.drills.length}`);
  p.en.forEach((t, i) => console.log(`  ${i + 1}. ${t}\n     ${p.ko[i] || "(한국어 없음)"}`));
  if (APPLY && out !== raw) { fs.writeFileSync(LESSON(id), out); wrote++; }
}
console.log(`\n${APPLY ? `씀 ${wrote}개` : "미리 보기(--apply 로 씀)"} · 과 ${Object.keys(plan).length}`);
