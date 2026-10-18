#!/usr/bin/env node
/**
 * LECTURE — builds the section's data from the 200 GVA lecture files (.gdb).
 *
 *   node scripts/lecture/build-lecture.mjs [--src <folder>] [--media <folder>] [--check]
 *
 *   --src    the folder holding '중등영어 독해001.gdb' … and the subfolder with '고등영어 독해101.gdb' …
 *            (default: the owner's desktop copy, C:\Users\ghddl\Desktop\GVA강의자료\중등영어독해(1~200))
 *   --media  where the page images and pen files are written, laid out as their R2 keys
 *            (default: .lecture-media/ at the repo root — git-ignored; upload with upload-lecture-r2.mjs)
 *   --check  write nothing; fail if content/ differs from what the .gdb files give
 *
 * Writes:
 *   content/courses/lecture.json            index: 20 chapters × 10 lectures
 *   content/lessons/lecture/<id>.json       one per lecture: title, page(s), timeline length — no paid data
 *   <media>/audio/lecture/<id>/p<NN>.jpg    the textbook page(s) the lecture shows     (paid, R2 only)
 *   <media>/audio/lecture/<id>/pen.json     the teacher's pen strokes with their times (paid, R2 only)
 *
 * Owner decisions (2026-10-17, docs/lecture/README.md): ids lm001–lm100 '중등 영어독해 N강' and lh001–lh100
 * '고등 영어독해 N강' (the files 101–200 hold the 고등 book; lecture 101 shows its page 1); no audio — the
 * owner will add an AI voice per lecture later, so the pen timeline keeps the ORIGINAL timing.
 *
 * THE .gdb FORMAT (worked out 2026-10-17; nothing documents it):
 *   - Header: offset 172 holds u16 = the lecture's length in pen-time units.
 *   - A table of records `type(1) 00 00 start(u32 LE) len(u32 LE) 00 00 00 00 name\0`, `start` relative to
 *     the first byte of data (the FF D8 of the first JPEG, after two 16-byte filler rows).
 *     Names: 100 × '…NNNN.JPG' (the whole book, identical in every file of a book), 100 × 'PageNN.htm'
 *     (unused here), '<book title>.audio' (726-byte header, then MP3) and '<book title>.text' (the pen).
 *   - Pen ('.text'): 64-byte header, then records `t_lo 00 len kind page …` of 12 or 20 bytes. The time's
 *     HIGH byte is the LAST byte of the record before (the first record's is 0). kind 10 = show page
 *     <page>; kind 33 = viewport scroll (payload bytes 0–1, big-endian); kind 2 = one pen segment:
 *     payload [scroll u16 BE, 00, 00, flag, p1(3), pen, p2(3), 00, 00, hi-of-next], a point (a b c) being
 *     x = (a >> 4) << 8 | b, y = (a & 15) << 8 | c in the GVA WINDOW's pixels (the scroll is already in y),
 *     flag 0xd3 = pen down. The window showed the page centred under a 20px top margin (PageNN.htm:
 *     `<body topmargin="20"><center><img>`) — so page x = pen x − 80, page y = pen y − 20 (fitted on 27 lectures,
 *     ±2px; the window was ~987px wide). pen.json keeps the window numbers; the views place the page at (80, 20).
 *   - One time unit = audio length / header length. The audio record's MP3 carries a 2-byte tick marker after
 *     every ~7.5 frames (voice/extract-original.mjs); ffprobe's bitrate estimate over the raw bytes counted those
 *     markers as audio, so until 2026-10-17 the unit came out 0.18005–0.18042 s. The frames themselves give
 *     0.17952–0.18000 s (mean 0.17983) — the clock a voice file follows, so that is what is written now.
 *   - Lecture N shows page N of its book; 57 also turns to pages 59, 60 and 58; 182 starts with no page
 *     record (its strokes carry page 82).
 *
 * THE VOICE (2026-10-17, docs/lecture/AI음성/): when docs/lecture/voice-manifest.json lists a lecture
 * ({ "<id>": { "src": "/audio/lecture/<id>/voice.mp3", "durationSec": … } }), its lesson file gets
 * `lecture.audio = { src, durationSec }` and the view uses that <audio> as the clock. The manifest holds paths
 * and lengths only (no lecture text); the mp3 itself is private R2 (upload-lecture-r2.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { cleanStream } from "./voice/extract-original.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
// the GVA folder holding one subfolder per section (영어독해: 중등영어독해(1~200), with 고등 in its subfolder)
const SRC = arg("--src", "C:/Users/ghddl/Desktop/GVA강의자료");
const MEDIA = path.resolve(ROOT, arg("--media", ".lecture-media"));
const CHECK = args.includes("--check");
const UNIT_SEC_DEFAULT = 0.18025;
const PAGE = { w: 827, h: 1169 };
const decoder = new TextDecoder("euc-kr");

// ---------------------------------------------------------------- .gdb container
function readGdb(file, expectPages = 100) {
  const buf = fs.readFileSync(file);
  let p = buf.indexOf(Buffer.from(".JPG"));
  while (p > 0 && buf[p - 1] !== 0) p--;
  p -= 15;
  const records = [];
  for (let guard = 0; guard < 1000; guard++) {
    // record types 0a–1f in the 영어독해 files; 알파오메가's audio and pen records are 0x22 · 0x21 (2026-10-19)
    const type = buf[p];
    if (!(type >= 0x0a && type <= 0x2f)) break;
    const start = buf.readUInt32LE(p + 3);
    const len = buf.readUInt32LE(p + 7);
    const nul = buf.indexOf(0, p + 15);
    records.push({ start, len, name: decoder.decode(buf.subarray(p + 15, nul)) });
    p = nul + 1;
  }
  const dataStart = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), p);
  const slice = (r) => buf.subarray(dataStart + r.start, dataStart + r.start + r.len);
  const pages = records.filter((r) => /\.jpg$/i.test(r.name)).map(slice);
  const audioRec = records.find((r) => /\.audio$/i.test(r.name));
  const textRec = records.find((r) => /\.text/i.test(r.name));
  if (expectPages !== null && pages.length !== expectPages) throw new Error(`${path.basename(file)}: ${pages.length} pages, expected ${expectPages}`);
  for (const [i, jpg] of pages.entries()) {
    if (!(jpg[0] === 0xff && jpg[1] === 0xd8 && jpg[jpg.length - 2] === 0xff && jpg[jpg.length - 1] === 0xd9)) {
      throw new Error(`${path.basename(file)}: page ${i + 1} is not a whole JPEG`);
    }
  }
  if (!audioRec || !textRec) throw new Error(`${path.basename(file)}: no .audio or .text record`);
  return { lengthUnits: buf.readUInt16LE(172), pages, audio: slice(audioRec), pen: slice(textRec) };
}

// ---------------------------------------------------------------- pen
const point = (a, b, c) => [((a >> 4) << 8) | b, ((a & 15) << 8) | c];

function readPen(buf, defaultPage) {
  // the first record: the first offset ≥ 0x40 whose len/kind look like a record
  let p = -1;
  for (let i = 0x40; i < 0x80; i++) {
    if ((buf[i + 2] === 0x0c && [0x0a, 0x21, 0x16].includes(buf[i + 3])) || (buf[i + 2] === 0x14 && buf[i + 3] === 0x02)) { p = i; break; }
  }
  if (p < 0) throw new Error("pen: no first record");
  const hiBefore = buf[p - 1];
  const out = { pageEvents: [], scrollEvents: [], segments: [], unknown: 0 };
  let hi = hiBefore;
  let page = defaultPage;
  while (p + 5 <= buf.length) {
    const lo = buf[p];
    const len = buf[p + 2];
    const kind = buf[p + 3];
    const pg = buf[p + 4];
    if ((len !== 0x0c && len !== 0x14) || p + len > buf.length) break;
    const t = lo + 256 * hi;
    const pay = buf.subarray(p + 5, p + len);
    if (kind === 0x0a) {
      page = pg;
      out.pageEvents.push([t, pg]);
    } else if (kind === 0x21) {
      out.scrollEvents.push([t, pay.readUInt16BE(0)]);
    } else if (kind === 0x02) {
      if (pg !== page && out.pageEvents.length === 0) page = pg; // 182: no page record — the strokes carry it
      const [x1, y1] = point(pay[5], pay[6], pay[7]);
      const [x2, y2] = point(pay[9], pay[10], pay[11]);
      out.segments.push({ t, page: pg, down: pay[4] === 0xd3, pen: pay[8], x1, y1, x2, y2 });
    } else {
      out.unknown += 1;
    }
    hi = buf[p + len - 1];
    p += len;
  }
  out.trailing = buf.length - p;
  return out;
}

/** Segments → strokes: [t0, page, pen, x0, y0, (dt, dx, dy)…] — a new stroke at pen-down or a jump. */
function toStrokes(segments) {
  const strokes = [];
  let cur = null;
  let last = null;
  for (const s of segments) {
    const joins = cur && !s.down && last.page === s.page && last.pen === s.pen && last.x2 === s.x1 && last.y2 === s.y1;
    if (!joins) {
      cur = [s.t, s.page, s.pen, s.x1, s.y1];
      strokes.push(cur);
      cur.lastT = s.t;
      cur.lastX = s.x1;
      cur.lastY = s.y1;
    }
    cur.push(s.t - cur.lastT, s.x2 - cur.lastX, s.y2 - cur.lastY);
    cur.lastT = s.t;
    cur.lastX = s.x2;
    cur.lastY = s.y2;
    last = s;
  }
  return strokes.map((s) => s.slice());
}

// ---------------------------------------------------------------- audio length (for the time unit)
const AUDIO_HEADER = 726;
/** The recording's true length: its MP3 frames counted, the recorder's tick markers left out (no decoder needed). */
function audioSeconds(audio) {
  return cleanStream(audio.subarray(AUDIO_HEADER)).audioSec;
}

// ---------------------------------------------------------------- the voices made so far
const MANIFEST = path.join(ROOT, "docs", "lecture", "voice-manifest.json");
const voicesAll = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8").replace(/^﻿/, "")) : {};
// LECTURE_VOICE_ONLY=lm001,lh082 — a local preview while the voice run is still going: only these lectures get their voice
const ONLY_VOICES = (process.env.LECTURE_VOICE_ONLY || "").split(",").filter(Boolean);
const voices = ONLY_VOICES.length ? Object.fromEntries(Object.entries(voicesAll).filter(([id]) => ONLY_VOICES.includes(id))) : voicesAll;
for (const [id, v] of Object.entries(voices)) {
  if (v.src !== `/audio/lecture/${id}/voice.mp3` || !(v.durationSec > 0)) throw new Error(`voice-manifest ${id}: expected { src: "/audio/lecture/${id}/voice.mp3", durationSec > 0 } (no query — the build adds the version)`);
}
/**
 * A voice READ at its own pace (scripts/lecture/voice/read-and-retime.mjs, 사장님 2026-10-17) has its own timeline: the pen
 * is moved onto it through the lecture's TIME MAP, docs/lecture/voice/<id>.timemap.json — anchors [original time unit,
 * new seconds], monotonic, numbers only. The original pen stays what the .gdb says; this build applies the map every
 * time (no hand-edited pen copies). unitSec is unchanged (units × unitSec = seconds still holds in the views);
 * lengthUnits and durationSec become the voice's. Strokes past the voice's end are kept (never drawn — the clock
 * stops at the voice's length); a sample voice therefore shows only its own stretch.
 */
function loadTimemap(id) {
  const file = path.join(ROOT, "docs", "lecture", "voice", `${id}.timemap.json`);
  if (!fs.existsSync(file)) return null;
  const m = JSON.parse(fs.readFileSync(file, "utf8"));
  const a = m.anchors;
  if (!Array.isArray(a) || a.length < 2) throw new Error(`${id}.timemap.json: needs ≥ 2 anchors`);
  for (let i = 1; i < a.length; i++) if (!(a[i][0] > a[i - 1][0] && a[i][1] > a[i - 1][1])) throw new Error(`${id}.timemap.json: anchors must rise in both columns (at ${i})`);
  return m;
}
/** Units → units through the map (piecewise linear; outside the anchors the nearest segment continues at slope 1). */
function mapUnits(m, unitSec) {
  const a = m.anchors;
  return (t) => {
    let sec;
    if (t <= a[0][0]) sec = a[0][1] + (t - a[0][0]) * unitSec;
    else {
      sec = null;
      for (let i = 0; i + 1 < a.length; i++) {
        if (t <= a[i + 1][0]) {
          const r = (a[i + 1][1] - a[i][1]) / ((a[i + 1][0] - a[i][0]) * unitSec);
          sec = a[i][1] + (t - a[i][0]) * unitSec * r;
          break;
        }
      }
      if (sec === null) sec = a.at(-1)[1] + (t - a.at(-1)[0]) * unitSec;
    }
    // a whole lecture's voice: what the teacher drew after his last word (lm068, 2.3 s after) is drawn by the voice's end —
    // past it the player has stopped and those strokes would never appear
    if (!m.sample) sec = Math.min(sec, m.voiceSec - 0.1);
    return Math.round(sec / unitSec);
  };
}
/** A short version tag for a media URL: changes whenever the object it names changes. */
function version(obj) {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(obj)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return (h >>> 0).toString(36);
}
function retimePen(penDoc, m) {
  const f = mapUnits(m, penDoc.unitSec);
  const strokes = penDoc.strokes.map((s) => {
    const [t0, page, pen, x0, y0, ...rest] = s;
    const times = [t0];
    let t = t0;
    for (let i = 0; i + 2 < rest.length; i += 3) { t += rest[i]; times.push(t); }
    const mapped = times.map(f);
    const out = [mapped[0], page, pen, x0, y0];
    for (let i = 0; i + 2 < rest.length; i += 3) out.push(Math.max(0, mapped[i / 3 + 1] - mapped[i / 3]), rest[i + 1], rest[i + 2]);
    return out;
  });
  return { ...penDoc, lengthUnits: Math.ceil(m.voiceSec / penDoc.unitSec), pageEvents: penDoc.pageEvents.map(([t, pg]) => [f(t), pg]), scrollEvents: penDoc.scrollEvents.map(([t, y]) => [f(t), y]), strokes, retimed: { anchors: m.anchors.length, voiceSec: m.voiceSec, madeAt: m.madeAt } };
}

// ---------------------------------------------------------------- main
/**
 * THE SECTIONS (사장님 2026-10-19): LECTURE shows four, in this order — 뼈대세우기 · 문장구조론 · 알파오메가 · 영어독해
 * (중등 · 고등 inside). The first three are each their own folder of GVA files; every lecture of them is one long class
 * (20–35 min) and they open one by one (a lecture opens when the one before it is finished — `gate: "lesson"`), 1·2강
 * free. 영어독해 keeps its 20 chapters of 10 (`gate: "chapter"`, the chapter record of lectureProgress.ts).
 *   문장구조론: the folder has no 06; its file 03 holds a lecture on the 뼈대세우기 book (3 pages) — kept as it is (owner).
 *   알파오메가 1강: the book's cover (page 1 — author, the teacher's name and e-mail) is left out: its page, its strokes and
 *   its page turns are dropped (owner 10-19 "이거는 삭제해서 안나오게"); the voice leaves out the words about it.
 */
const NEW_SECTIONS = [
  { key: "lb", title: "뼈대세우기", dir: "뼈대세우기", number: (f) => Number(f.match(/(\d+)\.gdb$/i)?.[1]), expect: [1, 2, 3, 4] },
  { key: "ls", title: "문장구조론", dir: "문장구조론", number: (f) => Number(f.match(/(\d+)\.gdb$/i)?.[1]), expect: [1, 2, 3, 4, 5, 7, 8, 9, 10] },
  { key: "la", title: "알파오메가", dir: "알파오메가지비에이", number: (f) => Number(f.match(/_(\d+)강\.gdb$/i)?.[1]), expect: Array.from({ length: 20 }, (_, i) => i + 1), dropPages: { 1: [1] } },
];
const READING_DIR = "중등영어독해(1~200)";

function listFiles() {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.gdb$/i.test(e.name)) files.push(f);
    }
  };
  walk(path.join(SRC, READING_DIR));
  const num = (f) => Number(path.basename(f).match(/(\d{3})\.gdb$/i)?.[1]);
  files.sort((a, b) => num(a) - num(b));
  const nums = files.map(num);
  for (let n = 1; n <= 200; n++) if (!nums.includes(n)) throw new Error(`lecture ${n}: no .gdb file in ${SRC}`);
  if (files.length !== 200) throw new Error(`${files.length} .gdb files, expected 200`);
  return files.map((f) => ({ file: f, n: num(f) }));
}
function listSection(s) {
  const dir = path.join(SRC, s.dir);
  const files = fs.readdirSync(dir).filter((f) => /\.gdb$/i.test(f)).map((f) => ({ file: path.join(dir, f), n: s.number(f) })).sort((a, b) => a.n - b.n);
  const got = files.map((f) => f.n).join(",");
  if (got !== s.expect.join(",")) throw new Error(`${s.title}: lectures ${got}, expected ${s.expect.join(",")}`);
  return files;
}

const pad3 = (n) => String(n).padStart(3, "0");

/**
 * The printed head and foot the view covers (사장님 2026-10-18 "제일 위 사이트랑 안어울림 · 제일 아래 줄 필요 없음"), per book —
 * the book is known by its page count; rows measured on every page image (2026-10-18 · 19):
 *   영어독해 (100 pages): red double rule '고·등·영·어·독·해' 59–97 → a label; red rule + page number 1137–1150 → blank
 *   문장구조론 (45): red double rule '감·각·영·어·/·문·장·구·조·론' 82–121 → a label; the content box's bottom is the red rule
 *     1062–1066 (box sides black at x 80 · 745 down to 1067) → blank with a black edge where the box ends; page number 1080–1096
 *   알파오메가 (88): no printed head; the page number '- n -' 1112–1128 inside the black double frame → blank
 *   뼈대세우기 (3 blank pages — also 문장구조론 3강): nothing
 */
function frameOf(bookPages, book) {
  if (bookPages === 100) return { head: { top: 48, bottom: 104, left: 118, right: 733, label: book === "high" ? "고등 영어독해" : "중등 영어독해" }, foot: [{ top: 1128, bottom: 1169, left: 0, right: 827 }] };
  if (bookPages === 45) return { head: { top: 74, bottom: 126, left: 100, right: 728, label: "문장구조론" }, foot: [{ top: 1061, bottom: 1069, left: 80, right: 746, edge: "#000" }, { top: 1069, bottom: 1104, left: 0, right: 827 }] };
  if (bookPages === 88) return { foot: [{ top: 1106, bottom: 1134, left: 370, right: 470 }] };
  return null;
}
const writes = new Map(); // path → Buffer | string

function main() {
  const lessons = [];
  const report = { lectures: 0, pages: 0, strokes: 0, segments: 0, seconds: 0, unknownRecords: 0, unit: [] };
  // the three new sections first (their lectures come first in the list and in 이전/다음), then 영어독해
  const jobs = [];
  for (const s of NEW_SECTIONS) {
    for (const { file, n } of listSection(s)) jobs.push({ file, section: s.key, sectionTitle: s.title, book: s.key, number: n, id: `${s.key}${pad3(n)}`, dropPages: s.dropPages?.[n] || [] });
  }
  for (const { file, n } of listFiles()) {
    const book = n <= 100 ? "middle" : "high";
    const number = book === "middle" ? n : n - 100; // 고등 lectures count from 1 again (owner)
    jobs.push({ file, n, section: "reading", sectionTitle: "영어독해", book, number, id: `${book === "middle" ? "lm" : "lh"}${pad3(number)}`, dropPages: [] });
  }
  for (const job of jobs) {
    const { file, n, book, number, id, section } = job;
    const reading = section === "reading";
    const g = readGdb(file, reading ? 100 : null);
    const pen = readPen(g.pen, reading ? number : 1);
    if (pen.trailing > 17) throw new Error(`${id}: pen data stops ${pen.trailing} bytes early`);
    if (job.dropPages.length) {
      // pages left out (알파오메가 1강's cover): their strokes and page turns go too; the screen starts on the next page
      pen.segments = pen.segments.filter((s) => !job.dropPages.includes(s.page));
      pen.pageEvents = pen.pageEvents.filter(([, pg]) => !job.dropPages.includes(pg));
    }
    if (!reading && pen.segments.length && (!pen.pageEvents.length || pen.segments[0].t < pen.pageEvents[0][0]) && pen.segments[0].page !== pen.pageEvents[0]?.[1]) {
      // written on before the first page turn: that page is the one on screen from the start
      pen.pageEvents.unshift([0, pen.segments[0].page]);
    }
    const sec = audioSeconds(g.audio);
    const unitSec = sec ? sec / g.lengthUnits : UNIT_SEC_DEFAULT;
    const voice = voices[id] || null;
    const timemap = voice ? loadTimemap(id) : null;
    if (voice && !timemap && Math.abs(voice.durationSec - sec) > 0.05) throw new Error(`${id}: voice.mp3 is ${voice.durationSec} s, the recording ${sec.toFixed(3)} s — not on the same timeline, and no docs/lecture/voice/${id}.timemap.json`);
    if (timemap && Math.abs(timemap.voiceSec - voice.durationSec) > 0.05) throw new Error(`${id}: timemap voiceSec ${timemap.voiceSec} ≠ manifest durationSec ${voice.durationSec}`);
    report.unit.push(unitSec);
    // 영어독해 lecture N shows page N of its book; a new section's lecture shows the pages it turns to and writes on
    // (a page number the book does not have — a stray record — is left out)
    const pagesUsed = [...new Set([...(reading ? [number] : []), ...pen.pageEvents.map(([, pg]) => pg), ...pen.segments.map((s) => s.page)])].filter((pg) => pg >= 1 && pg <= g.pages.length && !job.dropPages.includes(pg));
    if (!pagesUsed.length) pagesUsed.push(1);
    // the first page shown is the lecture's own page (182 has no page record; its strokes say 82)
    const firstPage = pen.pageEvents[0]?.[1] ?? pen.segments[0]?.page ?? (reading ? number : pagesUsed[0]);
    if (reading && firstPage !== number) throw new Error(`${id}: starts on page ${firstPage}, expected ${number}`);
    pen.pageEvents = pen.pageEvents.filter(([, pg]) => pagesUsed.includes(pg));
    pen.segments = pen.segments.filter((s) => pagesUsed.includes(s.page));
    const strokes = toStrokes(pen.segments);
    const maxX = Math.max(PAGE.w, ...pen.segments.flatMap((s) => [s.x1, s.x2]));
    const maxY = Math.max(PAGE.h, ...pen.segments.flatMap((s) => [s.y1, s.y2]));
    const pageSrc = (pg) => `/audio/lecture/${id}/p${pad3(pg)}.jpg`;
    for (const pg of pagesUsed) writes.set(path.join(MEDIA, pageSrc(pg).slice(1)), g.pages[pg - 1]);
    let penDoc = {
      v: 1,
      id,
      unitSec: Math.round(unitSec * 1e6) / 1e6,
      lengthUnits: g.lengthUnits,
      page: PAGE,
      canvas: { w: Math.ceil(maxX / 10) * 10 + 10, h: Math.ceil(maxY / 10) * 10 },
      pageEvents: pen.pageEvents.length ? pen.pageEvents : [[0, reading ? number : pagesUsed[0]]],
      scrollEvents: pen.scrollEvents,
      // [t0, page, pen, x0, y0, (dt, dx, dy)…] — t in units (× unitSec = seconds), x/y in page pixels
      strokes,
    };
    if (timemap) penDoc = retimePen(penDoc, timemap);
    const lectureSec = timemap ? voice.durationSec : null;
    writes.set(path.join(MEDIA, "audio", "lecture", id, "pen.json"), JSON.stringify(penDoc));
    const title = reading ? `${book === "middle" ? "중등" : "고등"} 영어독해 ${number}강` : `${job.sectionTitle} ${number}강`;
    // 영어독해: chapter of 10 (1–20). A new section has no chapters (its lectures open one by one) — unit 1.
    const chapter = reading ? Math.ceil(n / 10) : 1;
    const lesson = {
      id,
      course: "lecture",
      series: reading ? (book === "middle" ? "lm" : "lh") : section,
      section,
      variant: "main",
      pairId: null,
      title,
      label: reading ? `${book === "middle" ? "중등" : "고등"} 영어독해 ${(chapter - (book === "middle" ? 1 : 11)) * 10 + 1}~${(chapter - (book === "middle" ? 1 : 11)) * 10 + 10}강` : job.sectionTitle,
      menuLabel: `${number}강`,
      unit: chapter,
      part: number,
      order: lessons.length,
      audio: [],
      video: [],
      blocks: [],
      lecture: {
        book,
        number,
        durationSec: lectureSec ? Math.round(lectureSec * 10) / 10 : Math.round(g.lengthUnits * unitSec * 10) / 10,
        lengthUnits: penDoc.lengthUnits,
        unitSec: penDoc.unitSec,
        pages: pagesUsed.map((pg) => ({ page: pg, src: pageSrc(pg) })),
        // a voiced lecture's pen and voice carry a version in the query (the browser keeps these for a year — MEDIA-02
        // mediaRoute: free objects immutable, paid ones an hour — so a re-made voice or re-timed pen at the same path
        // would play against the old one: lh082 preview 2026-10-17). The media gate and keys use the path only.
        pen: { src: `/audio/lecture/${id}/pen.json${timemap ? `?v=${version(timemap)}` : ""}`, strokes: strokes.length, segments: pen.segments.length },
        ...(frameOf(g.pages.length, book) ? { frame: frameOf(g.pages.length, book) } : {}),
        // the AI voice, once made (voice-manifest.json) — the view's clock; absent until then
        ...(voice ? { audio: { src: `${voice.src}?v=${version(voice)}`, durationSec: voice.durationSec } } : {}),
      },
      legacyPath: path.relative(SRC, file).split(path.sep).join("/"),
      legacyEncoding: "euc-kr",
    };
    lessons.push(lesson);
    writes.set(path.join(ROOT, "content", "lessons", "lecture", `${id}.json`), `${JSON.stringify(lesson, null, 2)}\n`);
    report.lectures += 1;
    report.pages += pagesUsed.length;
    report.strokes += strokes.length;
    report.segments += pen.segments.length;
    report.seconds += lesson.lecture.durationSec;
    report.unknownRecords += pen.unknown;
  }

  // `groups` stay 영어독해's 20 chapters — their numbers ARE the chapter record (lectureProgress.ts: unlockedThrough), so
  // nothing in front of them may shift them. The four sections, in the order shown, are in `sections`.
  const readingLessons = lessons.filter((l) => l.section === "reading");
  const groups = [];
  for (let c = 1; c <= 20; c++) {
    const members = readingLessons.filter((l) => l.unit === c);
    groups.push({ title: members[0].label, lessons: members.map((l) => l.id) });
  }
  const sections = [
    ...NEW_SECTIONS.map((s) => ({ key: s.key, title: s.title, gate: "lesson", lessons: lessons.filter((l) => l.section === s.key).map((l) => l.id) })),
    { key: "reading", title: "영어독해", gate: "chapter", lessons: readingLessons.map((l) => l.id) },
  ];
  const index = {
    course: "lecture",
    tab: "lecture",
    lessonCount: lessons.length,
    sections,
    groups,
    lessons: lessons.map(({ id, title, label, series, section, variant, unit, part, order, menuLabel, lecture }) => ({
      id, title, label, series, section, variant, unit, part, order, hasAudio: false, hasVideo: false, menuLabel, durationSec: lecture.durationSec,
    })),
  };
  writes.set(path.join(ROOT, "content", "courses", "lecture.json"), `${JSON.stringify(index, null, 2)}\n`);

  let changed = 0;
  for (const [file, body] of writes) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
    const same = fs.existsSync(file) && fs.readFileSync(file).equals(buf);
    if (same) continue;
    changed += 1;
    if (CHECK) {
      if (file.startsWith(ROOT + path.sep + "content")) console.error(`differs: ${path.relative(ROOT, file)}`);
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
  }
  const u = report.unit;
  console.log(`lectures ${report.lectures} · pages ${report.pages} · strokes ${report.strokes.toLocaleString("en-US")} · segments ${report.segments.toLocaleString("en-US")} · ${(report.seconds / 3600).toFixed(1)} h · unknown pen records ${report.unknownRecords}`);
  console.log(`time unit ${Math.min(...u).toFixed(5)}–${Math.max(...u).toFixed(5)} s · voices ${Object.keys(voices).length}`);
  console.log(`${CHECK ? "would change" : "written"} ${changed} files (media → ${path.relative(ROOT, MEDIA)})`);
  if (CHECK) {
    const contentChanged = [...writes.keys()].filter((f) => f.startsWith(path.join(ROOT, "content")) && (!fs.existsSync(f) || !fs.readFileSync(f).equals(Buffer.from(writes.get(f)))));
    if (contentChanged.length) process.exitCode = 1;
  }
}

main();
