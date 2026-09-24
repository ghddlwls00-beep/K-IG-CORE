#!/usr/bin/env node
/**
 * STUDENT 청크 드릴 데이터(chunkDrills)를 82과에서 지운다 — BUG-024 · 7단계 7-4 c.
 * 소유자 결정 2026-09-23 "2번 다 지워"(되살리기 / 지우기 / 두기 중 지우기). 9/7 83b007c 가 화면(탭)을 뺀 뒤 학습자에게
 * 한 번도 보이지 않던 데이터다(StudentLearningView 는 chunkDrills 를 읽지 않음). LISTENING 죽은 사본(0단계)과 같은 방식 —
 * 파일에서 지우고, 되돌리려면 git 기록(지우기 전 마지막 커밋 950417d)의 chunkDrills 를 쓴다.
 * 다른 과정에는 chunkDrills 가 없다(2026-09-23 셈: student 82 파일만).
 *
 * 파일 모양은 그대로 — 들여쓰기(대부분 2칸, s19-3 은 1칸)와 끝 개행을 읽어 같은 모양으로 다시 쓰고, 다시 쓴 글이 원문과 같은지
 * 먼저 모든 파일에서 확인한 뒤에만 쓴다(하나라도 안 맞으면 아무것도 안 씀).
 *
 *   node student-drop-chunk-drills.mjs            # 미리보기(과 · 조각 수)
 *   node student-drop-chunk-drills.mjs --apply    # 씀
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../../..");
const L = path.join(REPO, "content/lessons/student");
const APPLY = process.argv.includes("--apply");
const todo = [];
let cards = 0, already = 0;
for (const f of fs.readdirSync(L).filter((x) => /^s\d+-\d+\.json$/.test(x)).sort()) {
  const p = path.join(L, f);
  const raw = fs.readFileSync(p, "utf8");
  const d = JSON.parse(raw);
  const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const trailing = /\r?\n$/.test(raw) ? eol : "";
  const ser = (o) => JSON.stringify(o, null, indent).replace(/\n/g, eol) + trailing;
  if (ser(d) !== raw) throw new Error(`${f}: 들여쓰기 ${indent}칸으로 다시 쓰면 원문과 달라짐 — 아무것도 안 쓰고 멈춤`);
  if (!("chunkDrills" in d)) { already++; continue; }
  cards += (d.chunkDrills || []).length;
  delete d.chunkDrills;
  todo.push({ p, text: ser(d) });
}
if (APPLY) for (const t of todo) fs.writeFileSync(t.p, t.text);
console.log(`chunkDrills 를 지운 과 ${todo.length} · 조각 ${cards}${already ? ` · 이미 없던 과 ${already}` : ""}${APPLY ? "" : " (미리보기 — --apply 로 씀)"}`);
