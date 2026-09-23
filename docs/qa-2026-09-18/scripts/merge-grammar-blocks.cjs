#!/usr/bin/env node
/**
 * GRAMMAR 강의 파일의 옮기기 찌꺼기 정리 — 6-1366 · 6-1374: 두 sentences 블록 사이에 번호가 붙은 paragraph 조각
 * ('20그것들은 책들이지?' · '113He doesn't love me, does he?.')이 끼어 문항 목록을 두 블록으로 가른 것.
 * 그 paragraph 를 지우고, 그래서 이웃하게 된 sentences 블록을 하나로 합친다.
 * 지우는 조건: 앞뒤에 sentences 블록이 있고 글이 숫자로 시작하는 paragraph. 화면은 paragraph 를 그리지 않고(GRAMMAR) 문항은
 * 블록을 펴서 보이므로, **편 문항 목록(n · text · alternatives)이 전후 한 글자도 같아야** 쓴다 — 아니면 멈춤.
 * 파일 형식(줄바꿈 · 들여쓰기 · 끝 개행)은 왕복이 바이트까지 같을 때만 다룬다.
 * --contained (6-1399 gh1-069): 번호 없는 paragraph 도, 글이 같은 파일 **어느 문항 글 안에 통째로 들어 있으면**(문항의 찌꺼기 사본 ·
 * 잘린 꼬리 — 'received a prize, did he?') 지운다. 문항 글 안에 없는 paragraph(교재의 다른 답 · 잘린 문장의 나머지)는 이 조건으로
 * 지워지지 않는다 — 그런 것은 잃는 것이 있으니 번호마다 따로 본다.
 *
 * --drop-text=<글> (6-1452 gh1-100 '않았니)?'): 글이 정확히 이것인 paragraph 하나를 지운다 — 지적이 '문항 #N 의 찌꺼기' 라고 짚었고
 * 사람이 그 문항 글을 보고 잃는 것이 없음을 확인한 때만 쓴다(문항 글과 글자가 조금 달라 --contained 로는 안 잡히는 조각).
 * 여러 번 줄 수 있고(6-1613 · 6-1620), 글을 정확히 짚은 것이므로 마지막 sentences 블록 **뒤에** 남은 조각도 지운다(6-1620 gh2-050).
 *
 *   node merge-grammar-blocks.cjs <과정/파일.json> … [--contained] [--drop-text=<글>] [--apply]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const CONTAINED = process.argv.includes("--contained");
const DROP_TEXTS = process.argv.filter((a) => a.startsWith("--drop-text=")).map((a) => a.slice("--drop-text=".length)).filter(Boolean);
const flat = (d) => JSON.stringify(d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items));
let changed = 0;
for (const rel of files) {
  const file = path.join(REPO, "content/lessons", rel);
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const trailing = /\r?\n$/.test(raw);
  const ser = (o) => JSON.stringify(o, null, 2).replace(/\n/g, eol) + (trailing ? eol : "");
  const d = JSON.parse(raw);
  if (ser(d) !== raw) throw new Error(`${rel}: 다시 쓰면 원문과 달라짐 — 형식 보존 불가`);
  const before = flat(d);
  const bl = d.blocks;
  const drop = [];
  const texts = bl.filter((b) => b.type === "sentences").flatMap((b) => b.items.map((x) => x.text));
  const isLeftover = (t) => /^\s*\d+\S/.test(t) || (CONTAINED && t.trim() !== "" && texts.some((x) => x.includes(t.trim())));
  const named = (t) => DROP_TEXTS.includes(String(t || "").trim());
  bl.forEach((b, i) => {
    if (b.type !== "paragraph" || !bl.slice(0, i).some((x) => x.type === "sentences")) return;
    if (named(b.text) || (isLeftover(b.text || "") && bl.slice(i + 1).some((x) => x.type === "sentences"))) drop.push(i);
  });
  const missingNamed = DROP_TEXTS.filter((t) => !bl.some((b) => b.type === "paragraph" && String(b.text || "").trim() === t));
  if (missingNamed.length) throw new Error(`${rel}: 짚은 글이 paragraph 에 없음 — ${JSON.stringify(missingNamed)}`);
  const kept = bl.filter((_, i) => !drop.includes(i));
  const merged = [];
  for (const b of kept) {
    const last = merged[merged.length - 1];
    if (b.type === "sentences" && last && last.type === "sentences") last.items = [...last.items, ...b.items];
    else merged.push(b.type === "sentences" ? { ...b, items: [...b.items] } : b);
  }
  d.blocks = merged;
  if (flat(d) !== before) throw new Error(`${rel}: 편 문항 목록이 달라짐 — 멈춤`);
  const sBefore = bl.filter((b) => b.type === "sentences").length, sAfter = merged.filter((b) => b.type === "sentences").length;
  console.log(`${rel}: 지운 paragraph ${drop.map((i) => JSON.stringify(bl[i].text)).join(", ") || "없음"} · sentences 블록 ${sBefore} → ${sAfter} · 블록 ${bl.length} → ${merged.length} · 문항 목록 같음`);
  if (drop.length) { changed++; if (APPLY) fs.writeFileSync(file, ser(d)); }
}
console.log(APPLY ? `${changed}개 파일에 씀 (형식 그대로)` : "(미리보기 — --apply 로 씀)");
