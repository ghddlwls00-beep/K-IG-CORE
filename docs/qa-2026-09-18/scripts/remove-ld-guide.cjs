#!/usr/bin/env node
/**
 * BUG-013 (2026-09-23) — LISTENING 한글 대본 페이지(dNNN-1)의 안내문 블록
 * `{ "type": "instruction", "text": "한글 대본을 보면서 말하고 영작해보세요." }` 을 데이터에서 뺀다.
 *
 * 왜 빼는가 (표시하지 않고): 대본 페이지는 본문 페이지와 **같은 5단계**(블라인드 → 탭 딕테이션 → 연음 →
 * 섀도잉 → 1.5배속 대조)를 보여 주고, 한국어를 보고 영작하는 단계는 없다. 안내문을 띄우면 페이지에 없는
 * 활동을 시키게 된다. 이 블록은 어디에서도 쓰이지 않는다 — LdLearningView.tsx:145 는 이 문구를 일부러
 * 걸러 내고, 상단 플레이어(page.tsx:439)는 LISTENING 에서 영어 대본을 쓴다.
 *
 *   node remove-ld-guide.cjs --dry-run   바꿀 것만 센다
 *   node remove-ld-guide.cjs             쓴다
 *
 * 안전장치: 파일마다 (1) 원문을 같은 방식으로 다시 쓰면 바이트까지 같아야 하고(형식 CRLF·끝 개행 없음
 * 보존), (2) 그 안내문 블록이 정확히 1개여야 한다. 하나라도 어긋나면 아무 파일도 쓰지 않고 멈춘다.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const GUIDE = "한글 대본을 보면서 말하고 영작해보세요.";
const dryRun = process.argv.includes("--dry-run");

const serialize = (obj, eol, trailing) => JSON.stringify(obj, null, 2).replace(/\n/g, eol) + (trailing ? eol : "");
const files = fs.readdirSync(DIR).filter((f) => /^d\d{3}-1\.json$/.test(f)).sort();
const plan = [];
const problems = [];
let already = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const trailing = /\r?\n$/.test(text);
  const d = JSON.parse(text);
  if (serialize(d, eol, trailing) !== text) { problems.push(`${f}: 다시 쓰면 원문과 달라짐 (형식 보존 불가)`); continue; }
  const idx = (d.blocks || []).map((b, i) => (b.type === "instruction" && String(b.text).trim() === GUIDE ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) { already++; continue; }
  if (idx.length !== 1) { problems.push(`${f}: 안내문 블록 ${idx.length}개`); continue; }
  const next = { ...d, blocks: d.blocks.filter((_, i) => i !== idx[0]) };
  const out = serialize(next, eol, trailing);
  // 바뀐 것이 그 블록 하나뿐인지: 블록 수가 하나 줄고, 나머지 블록은 순서까지 같다
  const same = JSON.stringify(next.blocks) === JSON.stringify(d.blocks.filter((_, i) => i !== idx[0])) && JSON.stringify({ ...d, blocks: null }) === JSON.stringify({ ...next, blocks: null });
  if (!same) { problems.push(`${f}: 블록 말고 다른 것이 바뀜`); continue; }
  plan.push({ f, out, before: d.blocks.length, after: next.blocks.length });
}
console.log(`대본 페이지 ${files.length}개 · 뺄 곳 ${plan.length} · 이미 없음 ${already} · 문제 ${problems.length}`);
if (problems.length) { console.log(problems.slice(0, 20).join("\n")); console.log("문제가 있어 아무 파일도 쓰지 않음"); process.exit(1); }
if (dryRun) { console.log("--dry-run: 쓰지 않음"); process.exit(0); }
for (const p of plan) fs.writeFileSync(path.join(DIR, p.f), p.out, "utf8");
console.log(`썼음 ${plan.length}개 (블록 ${plan[0] ? `${plan[0].before} → ${plan[0].after}` : "-"} 형태)`);
