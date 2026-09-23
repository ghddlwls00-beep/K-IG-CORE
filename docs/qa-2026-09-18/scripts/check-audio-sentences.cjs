#!/usr/bin/env node
/**
 * 6-1347 — 강의 맨 위 전체 듣기(AudioPlayer)가 읽는 영어 문장 수 = 단계 화면의 문항 수인가 (GRAMMAR I · II 주소 있는 페이지 전부).
 * src/app/[course]/[lesson]/page.tsx extractSentencesForAudio 의 GRAMMAR 길(짝 페이지 고르기 + sentences 블록)을 그대로 옮김:
 *   지금 판 = sentences 블록 **전부**를 차례로 · 옛 판(--old) = 첫 블록만(.find).
 * 짝 고르기(467-478): 이 페이지 첫 sentences 블록 첫 글이 영어면 이 페이지, 아니고 짝 페이지 첫 글이 영어면 짝 페이지.
 * 단계 화면은 블록을 펴서 모든 문항을 보이므로(6-1347 지적) 기준은 고른 페이지의 sentences 문항 전부.
 * 읽는 수가 문항 수와 다른 페이지가 하나라도 있으면 exit 1.
 *
 *   node check-audio-sentences.cjs [--old] [--list]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OLD = process.argv.includes("--old");
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const isEnglishText = (t) => { const l = (t.match(/[a-zA-Z]/g) || []).length; const h = (t.match(/[가-힣]/g) || []).length; return l > 0 && l >= h; };
const clean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const load = (course, id) => { const p = path.join(REPO, "content/lessons", course, `${id}.json`); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
let pages = 0;
const bad = [];
for (const course of ["grammar1", "grammar2"]) {
  for (const id of routes[course] || []) {
    const d = load(course, id);
    if (!d) continue;
    const pair = d.pairId ? load(course, d.pairId) : null;
    const blocks = d.blocks || [], pairBlocks = pair ? pair.blocks || [] : null;
    let target = blocks;
    const mainSent = blocks.find((b) => b.type === "sentences");
    const pairSent = pairBlocks && pairBlocks.find((b) => b.type === "sentences");
    if (pairSent && pairSent.items && pairSent.items[0] && pairSent.items[0].text) {
      const mainIsEn = Boolean(mainSent && mainSent.items && mainSent.items[0] && isEnglishText(mainSent.items[0].text));
      const pairIsEn = isEnglishText(pairSent.items[0].text);
      if (!mainIsEn && pairIsEn) target = pairBlocks;
      else if (mainIsEn) target = blocks;
    }
    const all = target.filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
    const read = OLD ? ((target.find((b) => b.type === "sentences") || {}).items || []) : all;
    pages++;
    const n = read.map((x) => clean(x.text)).filter(Boolean).length, want = all.map((x) => clean(x.text)).filter(Boolean).length;
    if (n !== want) bad.push(`${course}/${id} 읽음 ${n} / 문항 ${want}`);
  }
}
console.log(`${OLD ? "[옛 판 — 첫 블록만] " : ""}GRAMMAR 페이지 ${pages} · 전체 듣기가 문항보다 적게 읽는 페이지 ${bad.length}`);
if (process.argv.includes("--list") || OLD) for (const b of bad.slice(0, 40)) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
