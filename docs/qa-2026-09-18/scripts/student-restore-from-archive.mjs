#!/usr/bin/env node
/**
 * STUDENT 원본 되살리기 — 원본 아카이브 swf 에서 과의 영어 문장 · 한국어 번역 · 드릴 조각을 꺼내 바른 차례로 짝지음.
 * 소유자 결정 2026-09-23 "원본으로 다 되살려" (기록: docs/qa-2026-09-18/STUDENT-원본-되살리기.md).
 *
 * 원본 = 바탕화면 아카이브 Student/<id>.swf(읽기만) — 첫 커밋 3705523(9/6) 이 같은 원본에서 뽑은 것이라 두 벌을 대조한다.
 * 차례: swf 안 영어 문장은 거꾸로 저장돼 있어 쓰지 않고, 드릴 조각(한국어+영어 짝)의 차례 = 한국어 줄 차례를 따른다
 *       (이 과정의 다른 과들이 9/7 에 이미 그 차례로 놓임 — 예: s1-3).
 *
 *   node student-restore-from-archive.mjs s1-6 [s4-6 …]          # 읽기만 — 제안을 보임(9/6 판과 대조)
 *   node student-restore-from-archive.mjs --json s1-6 …           # 제안을 JSON 으로
 * 쓰기는 하지 않는다(쓰는 것은 따로, 소유자 결정 뒤 계획 파일로).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = path.resolve(import.meta.dirname, "../../..");
const ARCH = process.env.KIG_ARCHIVE || "C:/Users/ghddl/Desktop/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01";
const { extractSwfText, textBlocks } = await import(pathToFileURL(path.join(REPO, "scripts/swf-text.mjs")).href);
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });

const HANGUL = /[\uAC00-\uD7A3]/;
const norm = (s) => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const key = (s) => norm(s).toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const clean = (s) => norm(String(s).replace(/^\/\s*/, ""));

export function readArchive(id) {
  const f = path.join(ARCH, "Student", `${id}.swf`);
  if (!fs.existsSync(f)) return null;
  const blocks = textBlocks(extractSwfText(fs.readFileSync(f)));
  const lines = blocks.flatMap((b) => (b.items ? b.items.map((x) => x.text) : [b.text])).filter(Boolean).map((t) => String(t).trim());
  const chrome = (t) => /PASS-OFF|K-IG|<font|한\/영|^Chapter\s+\d/i.test(t) || /:\s*$/.test(t);
  const body = lines.filter((t) => !chrome(t));
  // 드릴 조각: '<한국어><영어>' 가 한 줄에 붙은 것('/' 로 시작하는 이어진 조각 포함), 원본 차례대로
  const chunks = [];
  for (const t of body) {
    const s = clean(t);
    const m = s.match(/^([^A-Za-z]*?[\uAC00-\uD7A3][^A-Za-z]*?)\s*([A-Za-z(].*)$/);
    if (m && HANGUL.test(m[1]) && /[A-Za-z]{2}/.test(m[2])) chunks.push({ ko: norm(m[1]).replace(/\s*[,/]\s*$/, ""), en: norm(m[2]), cont: /^\//.test(t) });
  }
  // 과 제목: '<장 이름> :' 바로 다음 줄(예: 'What do I do in the morning?') — 물음표로 끝나도 문장이 아님
  const title = lines.find((t, i) => /:\s*$/.test(lines[i - 1] || "")) || null;
  // 온전한 영어 문장: 한글이 없고 끝이 . ? ! 인 줄(제목 줄은 뺌)
  const en = []; for (const t of body) { const s = clean(t); if (title && key(s) === key(title)) continue; if (!HANGUL.test(s) && /[A-Za-z]/.test(s) && /[.?!]["')]?$/.test(s) && s.split(" ").length >= 3 && !en.some((x) => key(x) === key(s))) en.push(s); }
  // 온전한 한국어 문장: 영어가 없고 '/' 로 시작하지 않는 줄 — 드릴 조각의 한국어(앞 조각)와 같은 짧은 줄은 뺌
  const koAll = []; for (const t of body) { const s = clean(t); if (HANGUL.test(s) && !/[A-Za-z]{3}/.test(s.replace(/\([^)]*\)/g, "")) && !/^\//.test(t) && !koAll.some((x) => key(x) === key(s))) koAll.push(s); }
  const ko = koAll.filter((k) => !chunks.some((c) => key(c.ko) === key(k)) || k.length >= 18);
  return { en, ko, chunks, title };
}

/** 영어 문장마다 짝 한국어 · 차례 자리를 드릴 조각으로 정함. */
export function align(a) {
  const posOf = (s) => { // 이 문장에 든 드릴 조각 중 맨 앞 조각의 자리
    let best = Infinity; a.chunks.forEach((c, i) => { if (key(s).includes(key(c.en))) best = Math.min(best, i); }); return best;
  };
  const koFor = (s) => { // 조각 짝으로 점수 — 이 영어에 든 조각의 한국어를 가장 많이 품은 한국어 문장
    let best = null, bestScore = 0;
    for (const k of a.ko) { let sc = 0; for (const c of a.chunks) if (key(s).includes(key(c.en)) && key(k).includes(key(c.ko).slice(0, Math.max(2, Math.floor(key(c.ko).length * 0.6))))) sc++; if (sc > bestScore) { bestScore = sc; best = k; } }
    return { ko: best, score: bestScore };
  };
  const rows = a.en.map((s) => ({ en: s, pos: posOf(s), ...koFor(s), koPos: -1 }));
  for (const r of rows) r.koPos = r.ko ? a.ko.indexOf(r.ko) : -1;
  // 차례: 드릴 조각 자리가 있으면 그것, 없으면 한국어 줄 자리
  rows.sort((x, y) => (isFinite(x.pos) && isFinite(y.pos) ? x.pos - y.pos : (x.koPos - y.koPos)));
  return rows;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const ids = isMain ? process.argv.slice(2).filter((x) => !x.startsWith("--")) : [];
const asJson = process.argv.includes("--json");
const out = {};
for (const id of ids) {
  const a = readArchive(id);
  let old = null; try { old = JSON.parse(git("show", `3705523:content/lessons/student/${id}.json`).replace(/^\uFEFF/, "")); } catch {}
  const oldEn = old ? (old.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []).map((x) => norm(x.text)) : [];
  const oldKo = old ? (old.blocks || []).filter((b) => b.type === "paragraph").map((b) => norm(b.text)) : [];
  if (!a) { out[id] = { error: "원본 swf 없음" }; if (!asJson) console.log(`=== ${id}: 원본 swf 없음`); continue; }
  const rows = align(a);
  const sameSet = oldEn.length === a.en.length && oldEn.every((s) => a.en.some((x) => key(x) === key(s)));
  out[id] = { title: a.title, rows, chunks: a.chunks, koLines: a.ko, oldTitle: old && old.title, oldEn, oldKo, sameSetAs0906: sameSet };
  if (asJson) continue;
  console.log(`\n=== ${id} · 원본 제목 '${a.title}' · 9/6 판 제목 '${old && old.title}' · 영어 ${a.en.length} (9/6 판 ${oldEn.length}, 같은 문장 모음 ${sameSet ? "예" : "아니오"}) · 한국어 줄 ${a.ko.length} · 드릴 조각 ${a.chunks.length}`);
  rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.en}\n     ${r.ko || "(짝 한국어 못 찾음)"}   [조각 자리 ${isFinite(r.pos) ? r.pos : "-"} · 짝 점수 ${r.score}]`));
  const unusedKo = a.ko.filter((k) => !rows.some((r) => r.ko === k));
  if (unusedKo.length) console.log(`  (짝 안 된 한국어 줄: ${unusedKo.join(" | ")})`);
}
if (isMain && asJson) console.log(JSON.stringify(out));
