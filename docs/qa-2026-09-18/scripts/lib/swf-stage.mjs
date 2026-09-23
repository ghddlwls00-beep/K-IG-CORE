/**
 * 원본 STUDENT swf 에서 '화면에 놓인 대로' 글을 읽음 — 글 조각이 저장된 차례(scripts/swf-text.mjs 의 차례)는 원본 문장 차례가 아니다
 * (예: s1-5 는 저장 차례가 과목 · 매일 · 재미 · 3년 이지만 화면은 과목 · 매일 · 3년 · 재미). 그래서 무대(sprite 0)에 놓인 단추마다
 * 안에 든 글과 놓인 자리를 읽는다.
 *
 *   passage : '영어 전체 글' 단추 — 과 하나의 영어 문장들이 원본 차례대로 한 단추에 든 것(한 줄에 두 문장이면 나눔). 없는 과도 있음.
 *   units   : '문장 단추' — 한국어 한 줄 + 영어 한 줄이 한 단추에 묶인 것(원본의 영어 ↔ 한국어 짝), 화면 위 → 아래 차례.
 *             영어 없이 한국어만 든 단추(드릴 조각의 머리 등)도 en: null 로 넣음.
 *   lines   : swf 안의 모든 글 줄(검사가 '원본에 따로 있는 줄' 을 확인할 때 씀).
 *
 * SWF 구조: DefineText(11/33) 글 · DefineSprite(39) 무비클립(안에 자기 장면) · DefineButton/2(7/34) 단추 · PlaceObject/2/3(4/26/70) 놓기.
 * 글자 풀기는 scripts/swf-text.mjs 와 같은 방법(글꼴 CodeTable) — 참고: SWF File Format Specification v19.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const { inflate } = await import(pathToFileURL(path.join(REPO, "scripts/swf-audio.mjs")).href);

class Bits {
  constructor(buf, pos = 0) { this.buf = buf; this.pos = pos; this.bit = 0; }
  align() { if (this.bit) { this.bit = 0; this.pos++; } }
  ub(n) { let v = 0; for (let i = 0; i < n; i++) { if (this.pos >= this.buf.length) return v; v = v * 2 + ((this.buf[this.pos] >> (7 - this.bit)) & 1); if (++this.bit === 8) { this.bit = 0; this.pos++; } } return v; }
  sb(n) { const v = this.ub(n); return v >= 2 ** (n - 1) ? v - 2 ** n : v; }
  rect() { const n = this.ub(5); this.ub(n * 4); this.align(); }
  matrix() { if (this.ub(1)) { const n = this.ub(5); this.ub(n * 2); } if (this.ub(1)) { const n = this.ub(5); this.ub(n * 2); } const n = this.ub(5); const x = this.sb(n), y = this.sb(n); this.align(); return { x, y }; }
  cxform(alpha) { const add = this.ub(1), mul = this.ub(1), n = this.ub(4); this.ub(n * ((mul ? (alpha ? 4 : 3) : 0) + (add ? (alpha ? 4 : 3) : 0))); this.align(); }
}

/** 태그를 차례로 돌며 visit(type, body, ctx) — 무비클립 안의 태그는 ctx.sprite 가 그 무비클립 번호. */
function walk(raw, start, end, visit, ctx) {
  let pos = start;
  while (pos < end - 1) {
    const cl = raw.readUInt16LE(pos); pos += 2;
    const type = cl >> 6; let len = cl & 0x3f;
    if (len === 0x3f) { len = raw.readUInt32LE(pos); pos += 4; }
    if (pos + len > end) break;
    const body = raw.subarray(pos, pos + len);
    visit(type, body, ctx);
    if (type === 39) walk(body, 4, body.length, visit, { sprite: body.readUInt16LE(0), frame: 0 });
    pos += len;
    if (type === 0) break;
  }
}

function fontTables(tags) {
  const fonts = new Map();
  for (const { type, body: b } of tags) {
    if (type !== 48 && type !== 75) continue;
    try {
      let p = 0; const id = b.readUInt16LE(p); p += 2; const fl = b[p]; p += 2; const nl = b[p]; p += 1 + nl;
      const ng = b.readUInt16LE(p); p += 2; if (!ng) continue;
      const wideOff = !!(fl & 8), wideCode = !!(fl & 4); const table = p; p += ng * (wideOff ? 4 : 2);
      let cp = table + (wideOff ? b.readUInt32LE(p) : b.readUInt16LE(p));
      const map = new Map(); for (let i = 0; i < ng; i++) { map.set(i, wideCode ? b.readUInt16LE(cp) : b[cp]); cp += wideCode ? 2 : 1; }
      fonts.set(id, map);
    } catch { /* 망가진 글꼴 표 — 그 글꼴의 글자만 못 풂 */ }
  }
  return fonts;
}

function textOf(body, isText2, fonts) {
  const r = new Bits(body, 2); r.rect(); r.matrix();
  const glyphBits = body[r.pos], advanceBits = body[r.pos + 1]; r.pos += 2; r.bit = 0;
  let out = "", font = null;
  for (;;) {
    if (r.pos >= body.length) break;
    const f = body[r.pos++]; if (f === 0) break;
    if (f & 0x80) { if (f & 8) { font = body.readUInt16LE(r.pos); r.pos += 2; } if (f & 4) r.pos += isText2 ? 4 : 3; if (f & 1) r.pos += 2; if (f & 2) r.pos += 2; if (f & 8) r.pos += 2; continue; }
    const n = f & 0x7f; r.bit = 0; const map = fonts.get(font);
    for (let i = 0; i < n; i++) { const g = r.ub(glyphBits); r.sb(advanceBits); const c = map && map.get(g); if (c) out += String.fromCharCode(c); }
    r.align();
  }
  return out.replace(/\s+/g, " ").trim();
}

function buttonChars(b, type) {
  const out = []; let p = type === 34 ? 5 : 2;
  try {
    for (let k = 0; k < 64; k++) {
      const f = b[p]; if (!f) break; p += 1;
      const char = b.readUInt16LE(p); p += 4; // 글자 번호 · 깊이
      const r = new Bits(b, p); r.matrix(); if (type === 34) r.cxform(true); p = r.pos;
      if (type === 34 && (f & 0x10)) { out.push(char); break; } // 필터 목록 — 여기서 멈춤(STUDENT swf 에는 없음)
      if (type === 34 && (f & 0x20)) p += 1;
      out.push(char);
    }
  } catch { /* 끝까지 못 읽은 단추 — 읽은 데까지 */ }
  return out;
}

/** 한 swf 의 무대 — { texts: Map(글 번호 → 글), places: [{sprite, char, depth, x, y}], buttons: Map(단추 → 안의 글 번호들) } */
export function readTimeline(file) {
  const raw = inflate(fs.readFileSync(file));
  let pos = 8; const nbits = raw[pos] >> 3; pos += Math.ceil((5 + nbits * 4) / 8) + 4;
  const flat = []; walk(raw, pos, raw.length, (type, body) => flat.push({ type, body }), { sprite: 0, frame: 0 });
  const fonts = fontTables(flat);
  const texts = new Map(), places = [], buttons = new Map();
  walk(raw, pos, raw.length, (type, b, ctx) => {
    if (type === 1) { ctx.frame++; return; }
    if (type === 11 || type === 33) { try { texts.set(b.readUInt16LE(0), textOf(b, type === 33, fonts)); } catch { /* 못 푼 글 */ } return; }
    if (type === 7 || type === 34) { buttons.set(b.readUInt16LE(0), buttonChars(b, type)); return; }
    if (type === 4) { places.push({ sprite: ctx.sprite, char: b.readUInt16LE(0), depth: b.readUInt16LE(2), x: null, y: null }); return; }
    if (type === 26 || type === 70) {
      const f = b[0]; let p = 1, f2 = 0; if (type === 70) { f2 = b[1]; p = 2; }
      const depth = b.readUInt16LE(p); p += 2;
      if (type === 70 && ((f2 & 0x08) || ((f2 & 0x10) && (f & 0x02)))) { while (b[p++] !== 0); }
      if (!(f & 0x02)) return;
      const char = b.readUInt16LE(p); p += 2;
      let x = null, y = null;
      if (f & 0x04) { try { const r = new Bits(b, p); ({ x, y } = r.matrix()); } catch { /* 자리 없음 */ } }
      places.push({ sprite: ctx.sprite, char, depth, x, y });
    }
  }, { sprite: 0, frame: 0 });
  return { texts, places, buttons };
}

const HANGUL = /[가-힣]/;
const ABBR = /\b(Mt|Mr|Mrs|Ms|Dr|St|T\.V|p\.m|a\.m)\.$/i;
/** 한 줄에 든 여러 문장을 나눔 — 'Mt. Halla' · 인용 안의 '!'(“Mom! I’m home,”) 은 나누지 않음. */
export function splitSentences(line) {
  const out = []; let start = 0;
  const re = /[.?!]["'”’)]?\s+(?=[A-Z“"])/g; let m;
  while ((m = re.exec(line))) {
    const end = m.index + m[0].trimEnd().length;
    const head = line.slice(start, end);
    const opens = (line.slice(0, end).match(/[“]/g) || []).length, closes = (line.slice(0, end).match(/[”]/g) || []).length;
    if (ABBR.test(head.trim()) || opens > closes) continue;
    out.push(head.trim()); start = m.index + m[0].length;
  }
  out.push(line.slice(start).trim());
  return out.filter(Boolean);
}

/** swf 의 압축이 끝까지 풀리는가 — 망가진 사본은 앞부분만 읽히거나(s10-4) 하나도 안 읽힘(s10-5) */
export function isDamaged(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("latin1", 0, 3) !== "CWS") return false;
  try { zlib.inflateSync(buf.subarray(8)); return false; } catch { return true; }
}

/**
 * 원본 과 하나의 swf 경로 — 기준은 <뿌리>/Student/<id>.swf(본사 Lab v1.01). 그 사본이 없거나 망가졌으면 같은 판의 다른 사본
 * '학생용 Lab v1.01/Files'(79과에서 본사 사본과 무대 글이 글자까지 같음을 확인, 2026-09-23). 본사 사본은 s10-4 · s10-5 가 망가졌고 s19-3 이 없다.
 */
export function studentSwf(archiveRoot, id) {
  const main = path.join(archiveRoot, "Student", `${id}.swf`);
  if (fs.existsSync(main) && !isDamaged(main)) return { file: main, copy: "본사" };
  const alt = path.join(archiveRoot, "..", "학생용 Lab v1.01", "Files", `${id}.swf`);
  if (fs.existsSync(alt) && !isDamaged(alt)) return { file: alt, copy: fs.existsSync(main) ? "학생용(본사 사본 망가짐)" : "학생용(본사 사본 없음)" };
  return fs.existsSync(main) ? { file: main, copy: "본사(망가짐 — 다른 사본 없음)" } : null;
}

/** 원본 과 하나 — { passage: [영어 문장…] | null, units: [{en, ko, x, y}], lines: [모든 글 줄], copy } · swf 가 없으면 null */
export function readStudentOriginal(archiveRoot, id) {
  const src = studentSwf(archiveRoot, id);
  if (!src) return null;
  const file = src.file;
  const t = readTimeline(file);
  const kids = (c) => [...t.places.filter((p) => p.sprite === c).map((p) => p.char), ...(t.buttons.get(c) || [])];
  const inside = (c, d = 0) => (t.texts.has(c) ? [t.texts.get(c)] : d > 3 ? [] : [...new Set(kids(c))].flatMap((k) => inside(k, d + 1)));
  const lists = [], units = [];
  for (const p of t.places.filter((q) => q.sprite === 0)) {
    const tx = [...new Set(inside(p.char).filter(Boolean).map((s) => s.trim()))];
    const en = tx.filter((s) => !HANGUL.test(s) && /[A-Za-z]{2}/.test(s) && !/^\//.test(s) && !/^chapter\s*\d/i.test(s));
    const ko = tx.filter((s) => HANGUL.test(s) && !/[A-Za-z]{3}/.test(s.replace(/\([^)]*\)/g, "")) && !/^\//.test(s));
    if (en.length >= 2 && !ko.length) lists.push({ y: p.y, en });
    else if (en.length === 1 && ko.length === 1) units.push({ en: en[0], ko: ko[0], x: p.x, y: p.y });
    else if (!en.length && ko.length === 1 && tx.length <= 2) units.push({ en: null, ko: ko[0], x: p.x, y: p.y });
  }
  units.sort((a, b) => (Math.abs(a.y - b.y) > 300 ? a.y - b.y : a.x - b.x));
  lists.sort((a, b) => b.en.length - a.en.length);
  const passage = lists.length ? lists[0].en.flatMap(splitSentences) : null;
  return { passage, units, lines: [...new Set(t.texts.values())].filter(Boolean), copy: src.copy };
}
