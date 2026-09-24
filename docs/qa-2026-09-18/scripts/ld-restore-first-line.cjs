#!/usr/bin/env node
/**
 * 관문 15 — LISTENING 받아쓰기 힌트 첫 줄 되살리기(결정 B 판단 필요 · 소유자 2026-09-25 '되살린다').
 *
 * 원본 교재(랩자료모음 … 본사 Lab v1.01/LD/dNNN.htm, UTF-8)의 힌트 칸은 두 줄(파일은 UTF-8) — 첫 줄 = <p> 밖 SPAN, 둘째 줄 = <p> 안 SPAN —
 * 인데 처음 옮길 때 <p> 안 SPAN 만 가져와 첫 줄이 빠졌다(100강 · 그중 23강은 힌트가 통째로 없음). 원본은 **빠진 글을 찾는 데만** 쓴다
 * (정답이 아님 — 지금 대본이 기준).
 *
 * 강의마다:
 *   1) 첫 줄을 항목으로 나눈다. 원본은 항목 사이가 띄어쓰기 한 칸이라 그대로 넣으면 여러 항목이 한 칩으로 붙는다 — 그래서 **대본 문장에
 *      이어서 나오는 가장 긴 낱말 묶음**을 한 항목으로(원본의 '.' · ',' 는 경계). 대본이 바뀐 꼴은 대본 꼴로: 수 낱말 → 숫자(ten → 10 ·
 *      nineteenth → 19th), 사이에 a · an · the 하나가 더 있는 꼴(get hold of → get a hold of), 괄호 꼴(quick(ly) → quick · quickly).
 *      대본 어디에도 없는 낱말은 뺀다(목록으로).
 *   2) 지금 힌트 줄 앞에 '. ' 경계로 붙인다(지금 칩에 이미 있는 항목은 다시 넣지 않음).
 *   3) 앱과 같은 칩 규칙(lib/expectations hintChunks · hintsForSentence)으로 문장마다 칩을 전 · 뒤로 견준다. 새 칩이 제 글(낱말 묶음)이
 *      없는 문장에 뜨면(번짐) 그 항목을 번지지 않는 가장 긴 부분으로 줄이고, 그래도 번지면 뺀다(목록으로).
 *   4) 힌트가 통째로 없던 강의는 hints 블록을 지시문 뒤에 새로 넣고 지시문을 원래 글로 되돌린다
 *      ('다음에 나오는 고유 명사, 숫자, 어려운 단어를 참조하면서 영어로 받아쓰기를 하세요.' — 힌트가 있는 강의와 같음).
 * --write 일 때만 쓴다(파일마다 지금 글이 계획의 옛 글과 같을 때만 · 서식 그대로). 기본은 미리 보기 + --out <계획.json>.
 *   node docs/qa-2026-09-18/scripts/ld-restore-first-line.cjs [--only d182,d247] [--out <json>] [--write]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ARCH = "C:/Users/ghddl/Desktop/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01/LD";
const E = require("./lib/expectations.cjs");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const ONLY = arg("--only", null) ? new Set(arg("--only", "").split(",")) : null;
const OUT = arg("--out", null);
const WRITE = argv.includes("--write");
const INSTRUCTION = "다음에 나오는 고유 명사, 숫자, 어려운 단어를 참조하면서 영어로 받아쓰기를 하세요.";
const dec = new TextDecoder("utf-8"); // 원본 LD/dNNN.htm 276개는 UTF-8(3차 점검 지적 — EUC-KR 로 읽으면 d201 여는 따옴표 한 글자가 깨짐, 영어 첫 줄은 나머지 275 같음)
const ents = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const plain = (h) => ents(h.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

function firstLine(id) {
  const f = path.join(ARCH, `${id}.htm`);
  if (!fs.existsSync(f)) return null;
  const html = dec.decode(fs.readFileSync(f));
  const a = html.indexOf("#6633CC");
  const b = a >= 0 ? html.indexOf("</td>", a) : -1;
  if (a < 0 || b < 0) return null;
  const box = html.slice(html.indexOf("</p>", a) + 4, b).replace(/<p[^>]*>[\s\S]*?<\/p>/gi, " ");
  return [...box.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => plain(m[1])).filter(Boolean).join(" ") || null;
}

// ── 대본에서 낱말 묶음 찾기
const NUM = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40", fifty: "50", hundred: "100", thousand: "1000" };
const ORD = { first: "1st", second: "2nd", third: "3rd", fourth: "4th", fifth: "5th", sixth: "6th", seventh: "7th", eighth: "8th", ninth: "9th", tenth: "10th", eleventh: "11th", twelfth: "12th", thirteenth: "13th", fourteenth: "14th", fifteenth: "15th", sixteenth: "16th", seventeenth: "17th", eighteenth: "18th", nineteenth: "19th", twentieth: "20th", twentyfirst: "21st" };
const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, "").replace(/(\d),(?=\d{3}(?!\d))/g, "$1").replace(/[^a-z0-9$'\-\s]/g, " ").replace(/\s+/g, " ").trim();
const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** 원본 낱말 하나가 대본에서 될 수 있는 꼴들(정규식 조각) — 수 낱말 → 숫자, 괄호 꼴, 어미 변화(lurk → lurked · make → making) */
const tokVariants = (t) => {
  const low = t.toLowerCase().replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  const out = new Set([esc(low)]);
  if (NUM[low]) out.add(NUM[low]);
  if (ORD[low]) out.add(ORD[low]);
  const m = low.match(/^([a-z]+)\(([a-z]+)\)$/); // quick(ly)
  if (m) { out.clear(); out.add(m[1]); out.add(m[1] + m[2]); }
  else if (/^[a-z]{3,}$/.test(low)) {
    out.add(`${low}(?:s|es|ed|d|ing|ly)`);
    if (low.endsWith("e")) out.add(`${low.slice(0, -1)}(?:ing|ed)`);
    if (low.endsWith("y")) out.add(`${low.slice(0, -1)}(?:ied|ies)`);
  }
  return [...out];
};
/** 사이에 하나 끼어도 되는 낱말(대본이 원본 항목 사이에 넣은 관사 · 소유격). and 는 넣지 않음 — 이름 둘이 한 칩으로 붙음(Cary Grant and Rita Hayworth) */
const BETWEEN = new Set(["a", "an", "the", "his", "her", "their", "its", "our", "your", "my"]);
/** 칩 앞뒤에 오면 안 되는 기능어(줄일 때) */
const FUNC = new Set([...BETWEEN, "and", "or", "of", "to", "in", "on", "at", "for", "with", "by", "from", "as",
  "it", "is", "are", "was", "were", "be", "not", "no", "i", "you", "he", "she", "we", "they", "this", "that",
  "had", "has", "have", "do", "does", "did", "will", "would", "can", "could", "should", "may", "might", "must", "shall"]);
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const normWord = (w) => String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/(\d),(?=\d{3}(?!\d))/g, "$1").replace(/^[^a-z0-9$(]+|[^a-z0-9)%]+$/g, "");
/** 원본 낱말 하나(tok)가 대본 낱말(word, 원래 꼴 raw)과 같은 낱말인가 — 수 낱말 → 숫자 · 괄호 꼴 · 어미 변화 · 이름 오타 */
const SUFFIX = "(?:s|es|ed|d|ing|ly)";
/** 같은 낱말의 어미 변화인가(한쪽이 다른 쪽 + 어미 · e 뺌 + ing/ed · y → ied/ies) — 어느 쪽이 원본이든 */
function inflected(a, b) {
  if (!/^[a-z]{3,}$/.test(a) || !/^[a-z]{3,}$/.test(b)) return false;
  const one = (x, y) => new RegExp(`^${x}${SUFFIX}$`).test(y) || (x.endsWith("e") && new RegExp(`^${x.slice(0, -1)}(?:ing|ed)$`).test(y)) || (x.endsWith("y") && new RegExp(`^${x.slice(0, -1)}(?:ied|ies)$`).test(y));
  return one(a, b) || one(b, a);
}
function tokenMatches(tok, word, raw, fuzzy = true) {
  if (!tok || !word) return false;
  if (tok === word || NUM[tok] === word || ORD[tok] === word) return true;
  if (tok.includes("-") || word.includes("-")) { if (tok.replace(/-/g, "") === word.replace(/-/g, "")) return true; } // extra-curricular = extracurricular
  const par = tok.match(/^([a-z]+)\(([a-z]+)\)$/);
  if (par) return word === par[1] || word === par[1] + par[2];
  if (inflected(tok, word)) return true;
  // 원본 오타는 대본대로(haywood → Hayward): 대본이 고유 명사(대문자)이거나 8자 이상일 때만
  if (fuzzy && /^[a-z]{5,}$/.test(tok) && /^[a-z]+$/.test(word) && (/^[A-Z]/.test(raw || "") || tok.length >= 8) && editDistance(tok, word) <= (Math.max(tok.length, word.length) >= 7 ? 2 : 1)) return true;
  return false;
}
/** 원본 낱말 여럿이 대본 한 문장에 이어서(사이에 BETWEEN 하나까지) 나오면 그 대본 글(원래 대소문자 · 부호)을 돌려준다.
 *  원본 한 낱말 = 대본 여러 낱말(hundred-dollar → hundred dollar) · 원본 두 낱말 = 대본 한 낱말(eye witness → eyewitness · three thousand → 3,000)도 받음 */
function findInScript(tokens, rows) {
  const toks = tokens.map(normWord);
  if (toks.some((t) => !t)) return null;
  const numPair = (a, b) => (NUM[a] && (b === "thousand" || b === "hundred") ? String(Number(NUM[a]) * (b === "thousand" ? 1000 : 100)) : null);
  for (const r of rows) {
    const raws = String(r.en).split(/\s+/).filter(Boolean);
    const words = raws.map(normWord);
    for (let s = 0; s < words.length; s++) {
      let i = 0, j = s;
      while (i < toks.length && j < words.length) {
        if (tokenMatches(toks[i], words[j], raws[j])) { i++; j++; continue; }
        if (i + 1 < toks.length && (toks[i] + toks[i + 1] === words[j] || numPair(toks[i], toks[i + 1]) === words[j])) { i += 2; j++; continue; }
        if (j + 1 < words.length && toks[i].replace(/-/g, "") === (words[j] + words[j + 1]).replace(/-/g, "")) { i++; j += 2; continue; } // fortuneteller → fortune teller
        const parts = toks[i].split("-").filter(Boolean);
        if (parts.length > 1 && parts.every((p, k) => j + k < words.length && tokenMatches(p, words[j + k], raws[j + k], false))) { j += parts.length; i++; continue; }
        if (i > 0 && BETWEEN.has(words[j]) && j + 1 < words.length && tokenMatches(toks[i], words[j + 1], raws[j + 1])) { j += 2; i++; continue; }
        break;
      }
      if (i === toks.length && j > s) return { text: raws.slice(s, j).join(" ").replace(/^[^A-Za-z0-9$"“]+/, "").replace(/[.,;:!?"”)]+$/, ""), n: r.n };
    }
  }
  return null;
}
function segment(line, rows) {
  // 원본의 '.' · ',' 는 경계(천 단위 쉼표 · 칭호 마침표는 빼고)
  const parts = line.split(/(?<!\b(?:Mrs?|Ms|Dr|St|[A-Z]))[.,](?!\d{3})\s+|\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  const items = [], dropped = [];
  for (const part of parts) {
    // 원본에서 붙어 버린 마침표 뒤를 가름('Dr.Raymond' → 'Dr.' 'Raymond' · '4.march' → '4.' 'march')
    const toks = part.replace(/[.,]$/, "").replace(/(?<!\b[A-Z])\.(?=[A-Za-z0-9])/g, ". ").split(/\s+/).filter(Boolean); // U.S. 같은 머리글자는 그대로
    let i = 0;
    while (i < toks.length) {
      let best = null;
      for (let j = toks.length; j > i; j--) { const f = findInScript(toks.slice(i, j), rows); if (f) { best = { ...f, j }; break; } }
      if (best) { items.push(best.text); i = best.j; } else { dropped.push(toks[i]); i++; }
    }
  }
  return { items, dropped };
}

// ── 칩 견주기(앱과 같은 규칙)
const squash = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
function chipsBySentence(hintsText, rows) {
  const chunks = E.hintChunks(hintsText || "");
  return new Map(rows.map((r) => [r.n, E.hintsForSentence(r.en, chunks)]));
}
// 칩 글이 그 문장에 낱말 경계로 이어서 있는가('last' 가 'blast' 안에 있는 것은 아님)
const wordSeq = (s) => norm(s).split(" ").filter(Boolean);
// 어미 변화는 같은 낱말로 봄('Australia' 칩이 'Australian' 문장 · 'clown' 이 'clowns' 에 뜨는 것은 번짐이 아님) — 오타 너그러움은 없음
const hasPhrase = (sentence, chip) => { const w = wordSeq(sentence), c = wordSeq(chip); if (!c.length) return false; for (let i = 0; i + c.length <= w.length; i++) if (c.every((x, k) => x === w[i + k] || inflected(x, w[i + k]) || (/^[a-z]{4,}$/.test(x) && w[i + k].startsWith(x) && w[i + k].length - x.length <= 2))) return true; return false; };
function spills(chip, rows, chunks) {
  // 이 칩이 뜨는데 칩 글이 낱말로 없는 문장(안전장치로 '전부' 가 뜨는 문장은 뺌 — 그 문장은 칩 하나하나가 아니라 목록 전체)
  const out = [];
  for (const r of rows) {
    const got = E.hintsForSentence(r.en, chunks);
    if (got === chunks && got.length > 1 && !got.some((c) => hasPhrase(r.en, c))) continue;
    if (got.includes(chip) && !hasPhrase(r.en, chip)) out.push(r.n);
  }
  return out;
}

const scripts = E.ldScripts;
const plan = [];
for (let k = 1; k <= 276; k++) {
  const id = `d${String(k).padStart(3, "0")}`;
  if (ONLY && !ONLY.has(id)) continue;
  const line = firstLine(id);
  if (!line) continue;
  const rel = `content/lessons/ld/${id}.json`;
  const d = JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8").replace(/^\uFEFF/, ""));
  const rows = (scripts[id] || []).filter((r) => r && r.en);
  const hb = d.blocks.findIndex((b) => b.type === "hints");
  const ib = d.blocks.findIndex((b) => b.type === "instruction");
  const oldHints = hb >= 0 ? d.blocks[hb].text : "";
  const have = new Set(E.hintChunks(oldHints).map(squash));
  const seg = segment(line, rows);
  // 앱이 가르는 대로 칩 단위로(한 항목에 대본의 ', ' · '. ' 가 들어 있으면 여러 칩 — 번짐은 칩마다 잰다)
  // 앞뒤의 관사 · 소유격 · 대명사는 떼고('the Trail' → 'Trail'), 기능어만 남은 항목('of the')은 버림 — 전치사는 두어 구동사('stem from')를 살림
  const EDGE = new Set(["the", "a", "an", "his", "her", "their", "its", "our", "your", "my", "it", "this", "that"]);
  const trimEdge = (x) => { const w = x.split(/\s+/); while (w.length && EDGE.has(normWord(w[0]))) w.shift(); while (w.length && EDGE.has(normWord(w[w.length - 1]))) w.pop(); return w.join(" "); };
  const items = seg.items.flatMap((it) => E.hintChunks(it)).map(trimEdge).filter((x) => x && !x.split(/\s+/).every((w) => FUNC.has(normWord(w))));
  const dropped = seg.dropped;
  let add = [...new Set(items)].filter((x) => !have.has(squash(x)));
  // 번짐 줄이기: 넣은 뒤 번지는 항목은 번지지 않는 가장 긴 부분으로, 안 되면 뺌
  const shortened = [], removed = [];
  for (let pass = 0; pass < 5; pass++) {
    const text = [...add, ...(oldHints ? [oldHints] : [])].join(". ");
    const chunks = E.hintChunks(text);
    let changed = false;
    add = add.flatMap((item) => {
      const chip = chunks.find((c) => squash(c) === squash(item));
      if (!chip) return [item];
      const bad = spills(chip, rows, chunks);
      if (!bad.length) return [item];
      changed = true;
      // 번지지 않는 부분들로 나눔: 가장 긴 부분(앞뒤가 기능어가 아닌 것)부터, 남은 내용어(5자 이상 · 대문자 · 숫자)도 제 칩으로
      const w = item.split(/\s+/);
      const clean = (x) => x.replace(/[.,;:!?"”]+$/, "");
      const okAlone = (sub) => {
        const t2 = [...add.map((x) => (x === item ? sub : x)), ...(oldHints ? [oldHints] : [])].join(". ");
        const c2 = E.hintChunks(t2);
        const ch2 = c2.find((c) => squash(c) === squash(sub));
        return ch2 && !spills(ch2, rows, c2).length && rows.some((r) => hasPhrase(r.en, sub));
      };
      const pieces = [];
      const covered = new Array(w.length).fill(false);
      for (let len = w.length - 1; len >= 1; len--) for (let s = 0; s + len <= w.length; s++) {
        if (covered.slice(s, s + len).some(Boolean)) continue;
        const ws = w.slice(s, s + len);
        if (FUNC.has(normWord(ws[0])) || FUNC.has(normWord(ws[ws.length - 1]))) continue;
        const sub = clean(ws.join(" "));
        if (squash(sub).length < 3) continue;
        if (len === 1 && !(/^[A-Z]/.test(sub) || /\d/.test(sub) || sub.replace(/[^A-Za-z]/g, "").length >= 5)) continue;
        if (okAlone(sub)) { pieces.push({ s, sub }); for (let k = s; k < s + len; k++) covered[k] = true; }
      }
      // 조각이 원래 항목 글자의 절반 넘게 남을 때만(fortune teller → teller · Believe it or not → Believe 처럼 뜻이 안 남는 조각은 뺌)
      const letters = (x) => x.replace(/[^A-Za-z0-9]/g, "").length;
      if (pieces.length && pieces.reduce((a, p) => a + letters(p.sub), 0) * 2 > letters(item)) { const out = pieces.sort((a, b) => a.s - b.s).map((p) => p.sub); shortened.push(`${item} → ${out.join(" | ")}`); return out; }
      removed.push(`${item} (번짐 ${bad.join(",")}${pieces.length ? ` · 남는 조각 ${pieces.map((p) => p.sub).join("|")} 너무 짧음` : ""})`);
      return [];
    });
    if (!changed) break;
  }
  // 줄인 뒤에도 겹침을 다시 거름: 지금 칩과 같거나(줄이다 되살아난 Bronx), 지금 칩 안에 들어가거나(occasions ⊂ occasions of great emotion),
  // 지금 칩을 거의 그대로 품는(Dr. Raymond L. Ditmars ⊃ Raymond L Ditmars) 새 칩은 넣지 않음 · 새 칩끼리 같은 것도 한 번
  const oldChips = E.hintChunks(oldHints).map(squash);
  const overlapped = [];
  const seen = new Set();
  add = add.filter((x) => {
    const q = squash(x);
    if (!q || seen.has(q)) return false;
    const hit = oldChips.find((o) => o === q || (q.length >= 3 && o.includes(q)) || (o.length >= 3 && q.includes(o) && o.length >= 0.6 * q.length));
    if (hit) { overlapped.push(`${x} ≈ 지금 칩`); return false; }
    seen.add(q);
    return true;
  });
  const newHints = [...add, ...(oldHints ? [oldHints] : [])].join(". ").replace(/\.\s*\./g, ".");
  const before = chipsBySentence(oldHints, rows), after = chipsBySentence(newHints, rows);
  const rowsChanged = rows.filter((r) => JSON.stringify(before.get(r.n)) !== JSON.stringify(after.get(r.n))).map((r) => r.n);
  // 새 칩이 문장에 없는 꼴로 뜨는지(없는 꼴) — 뜨는 문장에 칩 글이 없는 경우
  const newChunks = E.hintChunks(newHints);
  const notInSentence = [];
  for (const c of newChunks.filter((c) => !have.has(squash(c)))) { const sp = spills(c, rows, newChunks); if (sp.length) notInSentence.push(`${c}@${sp.join(",")}`); }
  plan.push({
    id, file: rel, first: line, items, add, dropped, shortened, removed, overlapped, notInSentence,
    old: { hintsIdx: hb, hints: hb >= 0 ? oldHints : null, instructionIdx: ib, instruction: ib >= 0 ? d.blocks[ib].text : null },
    new: { hints: newHints, instruction: hb >= 0 ? null : INSTRUCTION },
    rowsChanged,
  });
}

const tot = (k) => plan.reduce((a, p) => a + p[k].length, 0);
console.log(`원본 첫 줄이 있는 강의 ${plan.length} · 넣을 항목 ${tot("add")} · 대본에 없어 뺀 낱말 ${tot("dropped")} · 번짐 줄인 것 ${tot("shortened")} · 번져서 뺀 것 ${tot("removed")} · 남은 없는 꼴 ${tot("notInSentence")}`);
console.log(`힌트 블록을 새로 넣는 강의 ${plan.filter((p) => p.old.hintsIdx < 0).length} · 칩이 바뀌는 문장 ${plan.reduce((a, p) => a + p.rowsChanged.length, 0)}`);
for (const p of plan.slice(0, ONLY ? 50 : 4)) console.log(`  ${p.id}: + ${JSON.stringify(p.add)}${p.dropped.length ? ` · 뺀 낱말 ${JSON.stringify(p.dropped)}` : ""}${p.shortened.length ? ` · 줄임 ${JSON.stringify(p.shortened)}` : ""}${p.removed.length ? ` · 뺌 ${JSON.stringify(p.removed)}` : ""}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(plan, null, 1));

if (WRITE) {
  let wrote = 0;
  for (const p of plan) {
    if (!p.add.length && p.old.hintsIdx >= 0) continue;
    const f = path.join(REPO, p.file);
    const raw = fs.readFileSync(f, "utf8");
    const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
    const d = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const hb = d.blocks.findIndex((b) => b.type === "hints");
    const ib = d.blocks.findIndex((b) => b.type === "instruction");
    if (hb !== p.old.hintsIdx || (hb >= 0 && d.blocks[hb].text !== p.old.hints) || ib !== p.old.instructionIdx || (ib >= 0 && d.blocks[ib].text !== p.old.instruction)) { console.log(`STOP ${p.id}: 지금 글이 계획의 옛 글과 다름 — 아무것도 안 씀`); process.exit(1); }
    if (hb >= 0) d.blocks[hb].text = p.new.hints;
    else { if (ib < 0) { console.log(`STOP ${p.id}: 지시문 블록 없음`); process.exit(1); } d.blocks[ib].text = p.new.instruction; d.blocks.splice(ib + 1, 0, { type: "hints", text: p.new.hints }); }
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const ind = (raw.match(/\r?\n( +)\S/) || [, "  "])[1];
    let out = bom + JSON.stringify(d, null, ind).replace(/\n/g, eol);
    if (/\r?\n$/.test(raw)) out += eol;
    fs.writeFileSync(f, out);
    wrote++;
  }
  console.log(`씀 ${wrote}`);
}
