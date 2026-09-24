#!/usr/bin/env node
/**
 * 7단계 7-5 — LISTENING 받아쓰기 힌트 칩: 여러 항목이 한 칩으로 붙은 곳에 항목 경계(". ")를 제안 · 넣는다.
 *
 * 칩은 강의 힌트 글(본 페이지 첫 hints 블록)을 쉼표 · 마침표에서 잘라 만든다(앱 LdLearningView hintChunks — lib/expectations.cjs 가
 * 같은 규칙). 교재 힌트 목록은 항목 사이를 띄어쓰기로만 갈라서, 여러 항목이 칩 하나로 붙어 뜬다(예 d009 「Helen Andrews' Keith
 * photographer national magazine Anne translator interpreter African countries」). 칩은 그 안의 낱말 하나만 문장에 있어도 통째로
 * 뜨므로(pickHintsFor), 긴 칩은 그 행과 상관없는 낱말까지 보여 준다.
 *
 * 경계 판정(칩 안에서 이웃한 두 낱말 a · b). 낱말 맞추기는 꼴 바꿈을 받는다(climb ~ climbing · empty ~ emptied · row ~ rowing ·
 * celebrations ~ celebration — 대본 낱말이 힌트 낱말로 시작하고 4글자 안쪽으로 더 길거나, y→i, 복수 s):
 *   - 대본(ld_english_scripts 의 그 강의 영어, 행마다)에 a b 가 **바로 이어져** 나오면 한 항목 → 붙여 둠(ld-merge-junctions 의 "대본에 이어짐").
 *   - 대본에서 a 와 b 사이에 **관사 · 소유어만** 한두 개(the · a · an · his · her · their · my · your · our · its · it · all) 끼어 나오면
 *     한 구절에서 그 낱말만 뺀 압축 → 붙여 둠('lost balance' ← 'lost his balance', 'empty trash' ← 'empty the trash').
 *     단, 대본 쪽 a 가 's 로 끝나면(keith's a photographer = Keith is a …) 서로 다른 항목 → 경계.
 *   - 사이에 and · or · 전치사 · be 동사가 끼면(corn and wheat · Gibson from Toronto · Anne is a translator) 서로 다른 항목 → 경계.
 *     (처음 판은 이것도 모두 '사람이 정할 것' 183쌍으로 냈다 — 읽어 보니 위 두 가지로 갈렸다.)
 *   - 둘 다 대본에 있는데 이어지지도 않으면 → 경계.
 *   - 둘 중 하나라도 대본에 없으면(km ← kilometers · come ← came) → '사람이 정할 것'.
 *   정한 것은 plans/stage7-ld-chip-decisions.json({"d0NN": {"a|b": {"do": "split" | "keep", "why": "…"}}}).
 * 힌트 낱말 자체는 바꾸지 않고, 경계 자리에 ". " 만 넣는다(띄어쓰기 한 칸 → ". "). 힌트는 소리 내지 않으므로 클립 영향 없음.
 *
 *   node ld-chip-boundaries.cjs              제안 · 숫자(파일 안 고침)
 *   node ld-chip-boundaries.cjs --list       제안 전부 · 사람이 정할 것 전부
 *   node ld-chip-boundaries.cjs --apply      경계를 넣음(정할 것이 남아 있으면 멈춤) — 앞뒤 숫자 · 행 비교는 ld-chips.cjs --all
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const DECISIONS_FILE = path.join(__dirname, "plans/stage7-ld-chip-decisions.json");
const APPLY = process.argv.includes("--apply");
const LIST = process.argv.includes("--list");
const strip = (s) => String(s).replace(/^﻿/, "");
const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
const decisions = fs.existsSync(DECISIONS_FILE) ? JSON.parse(fs.readFileSync(DECISIONS_FILE, "utf8")) : {};
const norm = (w) => String(w).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, "").replace(/^'+|'+$/g, "");
const LONG = 5; // 낱말 5개 이상 칩 = 긴 칩(명령서)
const wordsOf = (chip) => chip.split(/\s+/).filter(Boolean);
/** 힌트 낱말 h 와 대본 낱말 s 가 같은 낱말인가(꼴 바꿈 받음) */
function same(h, s) {
  if (!h || !s) return false;
  if (h === s) return true;
  if (h.length >= 3 && s.startsWith(h) && s.length - h.length <= 4) return true; // climb ~ climbing · tie ~ tied
  if (h.length >= 4 && h.endsWith("e") && s.startsWith(h.slice(0, -1)) && s.length - h.length <= 3) return true; // move ~ moving
  if (h.length >= 4 && h.endsWith("y") && s.startsWith(h.slice(0, -1) + "i") && s.length - h.length <= 3) return true; // empty ~ emptied
  if (h.length >= 4 && h.endsWith("s") && s === h.slice(0, -1)) return true; // celebrations ~ celebration
  if (h.length >= 5 && h.endsWith("es") && s === h.slice(0, -2)) return true;
  return false;
}
// all 도 명사구 안에 들어가는 한정어 — d016 'empty trash' ← 대본 'emptied all the trash'(없으면 empty | trash 로 잘못 나뉨)
const DETERMINER = new Set(["the", "a", "an", "his", "her", "their", "my", "your", "our", "its", "it", "all"]);
/** 앱 pickHintsFor(LdLearningView · lib/expectations.cjs hintsForSentence)의 낱말 규칙에 드는 낱말이 조각에 있는가 */
const showable = (words) => words.some((token) => {
  const bare = token.replace(/[^A-Za-z0-9'’.]/g, "").replace(/[.'’]+$/, "");
  if (/^\d{2,}$/.test(bare)) return true;
  const letters = bare.replace(/[^A-Za-z]/g, "");
  return letters.length >= (/^[A-Z]/.test(bare) ? 3 : 5);
});

const firstHints = (d) => (d.blocks || []).find((b) => b.type === "hints");
let lessonsLong = 0, longBefore = 0, longAfter = 0, splits = 0;
const toDecide = [], kept = [], splitList = [], changedFiles = [], merged = [], rowMerged = [];
const FUNCTION_WORDS = new Set("a an the of in on at to for from by with into onto and or but nor as is are was were be been it its his her their our your my him them this that these those up out off down over".split(" "));
for (const f of fs.readdirSync(DIR).filter((x) => /^d\d{3}\.json$/.test(x)).sort()) {
  const id = f.slice(0, 4);
  const file = path.join(DIR, f);
  const raw = strip(fs.readFileSync(file, "utf8"));
  const d = JSON.parse(raw);
  const hb = firstHints(d);
  if (!hb || !String(hb.text || "").trim()) continue;
  const rows = S[id] || [];
  // 대본 낱말 순서(행마다 따로 — 행 경계를 넘는 이어짐은 이어짐 아님)
  const seq = rows.map((r) => String(r.en || "").split(/\s+/).map(norm).filter(Boolean));
  const flat = seq.flat();
  const inScript = { has: (h) => flat.some((s) => same(h, s)) };
  const adjacent = (a, b) => seq.some((ws) => ws.some((w, i) => same(a, w) && i + 1 < ws.length && same(b, ws[i + 1])));
  // a … b 사이에 관사 · 소유어만 1~2개 = 한 구절의 압축 → 그 대본 구절을 돌려줌(a 가 's 로 끝나는 꼴은 빼고)
  const compressed = (a, b) => {
    for (const ws of seq) for (let i = 0; i < ws.length; i++) {
      if (!same(a, ws[i]) || (/'s$/.test(ws[i]) && !/'s$/.test(a))) continue;
      for (let gap = 1; gap <= 2 && i + gap + 1 < ws.length; gap++) {
        const mid = ws.slice(i + 1, i + 1 + gap);
        if (mid.every((m) => DETERMINER.has(m)) && same(b, ws[i + 1 + gap])) return ws.slice(i, i + gap + 2).join(" ");
      }
    }
    return null;
  };
  const chunks = E.hintChunks(hb.text);
  const long = chunks.filter((c) => wordsOf(c).length >= LONG);
  if (!long.length) continue;
  lessonsLong++;
  longBefore += long.length;
  const states = []; // 긴 칩마다 { chip, ws, cut }
  for (const chip of long) {
    const ws = wordsOf(chip);
    const cut = []; // 경계를 넣을 자리(ws[i] 와 ws[i+1] 사이)
    states.push({ chip, ws, cut });
    for (let i = 0; i < ws.length - 1; i++) {
      const a = norm(ws[i]), b = norm(ws[i + 1]);
      const key = `${ws[i]}|${ws[i + 1]}`;
      const dec = decisions[id] && decisions[id][key];
      if (dec) { if (dec.do === "split") cut.push(i); else kept.push(`${id} 「${ws[i]} ${ws[i + 1]}」 붙여 둠(정함): ${dec.why}`); continue; }
      if (!a || !b) continue;
      if (inScript.has(a) && inScript.has(b)) {
        if (adjacent(a, b)) continue; // 대본에서 한 구절
        const c = compressed(a, b);
        if (c) { kept.push(`${id} 「${ws[i]} ${ws[i + 1]}」 붙여 둠 — 대본 '${c}'(관사 · 소유어만 뺀 한 구절)`); continue; }
        cut.push(i);
      } else {
        toDecide.push({ id, key, chip, why: `대본에 없음: ${[ws[i], ws[i + 1]].filter((w) => !inScript.has(norm(w))).join(", ")}` });
      }
    }
    // 혼자서는 뜰 수 없는 조각(앱 pickHintsFor 의 낱말 규칙 — 5글자 이상 · 대문자로 시작하는 3글자 이상 · 두 자리 이상 수 — 에 드는
    // 낱말이 하나도 없는 조각, 예 'beer ads' · 'put on' · '2%')은 나누지 않고 앞 조각에(첫 조각이면 뒤 조각에) 붙인다.
    // 나누면 그 조각이 그 행 문장에 있어도 칩으로 안 떠서, 전에는 긴 칩에 섞여 보이던 힌트 낱말이 사라진다(첫 적용에서 67행 — 되돌림).
    const piecesOf = () => { const out = []; let s = 0; for (const i of [...cut, ws.length - 1]) { out.push(ws.slice(s, i + 1)); s = i + 1; } return out; };
    for (let guard = 0; guard < 50; guard++) {
      const ps = piecesOf();
      const bad = ps.findIndex((p) => !showable(p));
      if (bad < 0 || ps.length < 2) break;
      const drop = bad > 0 ? bad - 1 : 0; // 앞 조각과의 경계(첫 조각이면 뒤 조각과의 경계)를 없앰
      merged.push(`${id} 「${ps[bad].join(" ")}」 혼자 못 뜸 → ${bad > 0 ? "앞" : "뒤"} 조각에 붙임`);
      cut.splice(drop, 1);
    }
  }
  /** 경계를 넣은 힌트 글 — 칩 자리마다 경계 자리의 띄어쓰기를 ". " 로(칩 글자는 그대로) */
  const build = () => {
    let text = hb.text;
    for (const { chip, ws, cut } of states) {
      if (!cut.length) continue;
      const at = text.indexOf(chip);
      if (at < 0) throw new Error(`${id}: 칩 「${chip}」 를 힌트 글에서 못 찾음`);
      let rebuilt = "";
      for (let i = 0; i < ws.length; i++) rebuilt += ws[i] + (i === ws.length - 1 ? "" : cut.includes(i) ? ". " : " ");
      // 칩 원래 글의 띄어쓰기가 한 칸이 아닐 수 있음 — 낱말 사이를 정규식으로 맞춤
      const re = new RegExp(ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
      const m = text.slice(at).match(re);
      if (!m || m.index !== 0) throw new Error(`${id}: 칩 「${chip}」 자리 맞추기 실패`);
      text = text.slice(0, at) + rebuilt + text.slice(at + m[0].length);
    }
    return text;
  };
  /**
   * 행마다 앱 규칙(hintsForSentence)을 그대로 돌려 봄: 전에는 그 행에 뜨던 칩의 **내용어**가 그 행 문장에 있는데, 경계를 넣은 뒤
   * 그 낱말이 든 조각이 안 뜨면(짧은 낱말만 문장에 있는 조각 — 'beer' · 'land') 그 조각의 경계 하나를 뺀다(그 행에 뜨는 이웃 조각
   * 쪽을 먼저). 빠짐이 0 이 될 때까지. 기능어(관사 · 전치사 …)는 힌트 항목이 아니라 이음새라 세지 않는다(ld-chips --diff 와 같은 목록).
   */
  const chunksBefore = E.hintChunks(hb.text);
  const k = (w) => String(w).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, "");
  for (let guard = 0; guard < 400; guard++) {
    const chunksAfter = E.hintChunks(build());
    let fixed = false;
    for (const r of rows) {
      const sentence = new Set(wordsOf(r.en || "").map(k));
      const before = E.hintsForSentence(String(r.en || ""), chunksBefore);
      const after = E.hintsForSentence(String(r.en || ""), chunksAfter);
      const afterWords = new Set(after.flatMap(wordsOf).map(k));
      const lostWord = [...new Set(before.flatMap(wordsOf).map(k))].find((w) => w && !FUNCTION_WORDS.has(w) && sentence.has(w) && !afterWords.has(w));
      if (!lostWord) continue;
      // 그 낱말이 든 조각(그 행에 전에 뜨던 긴 칩 안에서)을 찾아 경계 하나를 뺀다
      for (const st of states) {
        if (!st.cut.length || !before.includes(st.chip)) continue;
        const ps = []; let s = 0; for (const i of [...st.cut, st.ws.length - 1]) { ps.push([s, i]); s = i + 1; }
        const pi = ps.findIndex(([a, b]) => st.ws.slice(a, b + 1).some((w) => k(w) === lostWord));
        if (pi < 0) continue;
        const shown = (j) => j >= 0 && j < ps.length && after.includes(st.ws.slice(ps[j][0], ps[j][1] + 1).join(" "));
        const leftCut = pi > 0 ? pi - 1 : -1, rightCut = pi < ps.length - 1 ? pi : -1;
        const drop = shown(pi - 1) && leftCut >= 0 ? leftCut : shown(pi + 1) && rightCut >= 0 ? rightCut : leftCut >= 0 ? leftCut : rightCut;
        rowMerged.push(`${id}:${r.n} 「${st.ws.slice(ps[pi][0], ps[pi][1] + 1).join(" ")}」 — 그 행 문장의 '${lostWord}' 가 칩에서 빠져 경계 하나 뺌`);
        st.cut.splice(drop, 1);
        fixed = true;
        break;
      }
      if (fixed) break;
      throw new Error(`${id}:${r.n} '${lostWord}' 가 빠지는데 뺄 경계를 못 찾음`);
    }
    if (!fixed) break;
  }
  const text = build();
  for (const { chip, ws, cut } of states) {
    const pieces = []; let s = 0; for (const i of [...cut, ws.length - 1]) { pieces.push(ws.slice(s, i + 1).join(" ")); s = i + 1; }
    // 경계를 넣은 뒤에도 5낱말 이상으로 남는 조각 = 대본에서 한 구절이거나, 나누면 힌트가 빠지는 곳(사유와 함께 남김)
    for (const p of pieces) if (wordsOf(p).length >= LONG) kept.push(`${id} 「${p}」 — 대본에서 이어지는 한 구절이거나 나누면 그 행 힌트가 빠짐`);
    if (cut.length) { splits += cut.length; splitList.push(`${id} 「${chip}」 → ${pieces.map((p) => `「${p}」`).join(" ")}`); }
  }
  longAfter += E.hintChunks(text).filter((c) => wordsOf(c).length >= LONG).length;
  if (text !== hb.text) {
    changedFiles.push(id);
    if (APPLY) {
      // 파일 글자에서 그 hints 블록의 text 값만 바꿈(나머지 모양은 그대로) · Windows 일시 잠금(UNKNOWN -4094)이면 몇 번 다시
      const oldJson = JSON.stringify(hb.text), newJson = JSON.stringify(text);
      const n = raw.split(oldJson).length - 1;
      if (n !== 1) throw new Error(`${id}: 힌트 글이 파일에 ${n}번 — 한 번이어야 함`);
      for (let t = 0; ; t++) {
        try { fs.writeFileSync(file, raw.replace(oldJson, () => newJson)); break; } catch (e) {
          if (t >= 8) throw e;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
        }
      }
    }
  }
}
const undecided = toDecide.filter((t) => !(decisions[t.id] && decisions[t.id][t.key]));
console.log(`긴 칩(${LONG}낱말 이상) ${longBefore}개 · ${lessonsLong}강 → 경계 넣으면 ${longAfter}개 · 넣을 경계 ${splits}곳 · 고칠 강의 ${changedFiles.length} · 사람이 정할 것 ${undecided.length} · 혼자 못 떠 붙인 조각 ${merged.length} · 행 힌트가 빠져 뺀 경계 ${rowMerged.length}`);
if (LIST) {
  console.log("\n[나눈 곳]"); for (const s of splitList) console.log("  " + s);
  console.log("\n[남긴 긴 칩 · 붙여 둔 곳]"); for (const s of kept) console.log("  " + s);
  console.log("\n[혼자 못 떠 붙인 조각]"); for (const s of merged) console.log("  " + s);
  console.log("\n[행 힌트가 빠져 뺀 경계]"); for (const s of rowMerged) console.log("  " + s);
}
console.log(`\n[사람이 정할 것 ${undecided.length}] (기능어가 빠진 압축 후보 · 대본에 없는 낱말 — 기계로 못 가림)`);
for (const t of undecided.slice(0, LIST ? 1000 : 25)) console.log(`  ${t.id} 「${t.key.replace("|", " ")}」 ← 칩 「${t.chip}」 · ${t.why}`);
if (APPLY) {
  if (undecided.length) { console.log("!! 정할 것이 남아 있어 멈춤 — 파일은 이미 바뀐 강의만 바뀜"); process.exit(1); }
  console.log(`힌트 글을 고친 강의 ${changedFiles.length}: ${changedFiles.join(" ")}`);
}
