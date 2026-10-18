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
const SRC = arg("--src", "C:/Users/ghddl/Desktop/GVA강의자료/중등영어독해(1~200)");
const MEDIA = path.resolve(ROOT, arg("--media", ".lecture-media"));
const CHECK = args.includes("--check");
const UNIT_SEC_DEFAULT = 0.18025;
const PAGE = { w: 827, h: 1169 };
const decoder = new TextDecoder("euc-kr");

// ---------------------------------------------------------------- .gdb container
function readGdb(file) {
  const buf = fs.readFileSync(file);
  let p = buf.indexOf(Buffer.from(".JPG"));
  while (p > 0 && buf[p - 1] !== 0) p--;
  p -= 15;
  const records = [];
  for (let guard = 0; guard < 1000; guard++) {
    const type = buf[p];
    if (!(type >= 0x0a && type <= 0x1f)) break;
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
  if (pages.length !== 100) throw new Error(`${path.basename(file)}: ${pages.length} pages, expected 100`);
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
function listFiles() {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.gdb$/i.test(e.name)) files.push(f);
    }
  };
  walk(SRC);
  const num = (f) => Number(path.basename(f).match(/(\d{3})\.gdb$/i)?.[1]);
  files.sort((a, b) => num(a) - num(b));
  const nums = files.map(num);
  for (let n = 1; n <= 200; n++) if (!nums.includes(n)) throw new Error(`lecture ${n}: no .gdb file in ${SRC}`);
  if (files.length !== 200) throw new Error(`${files.length} .gdb files, expected 200`);
  return files.map((f) => ({ file: f, n: num(f) }));
}

const pad3 = (n) => String(n).padStart(3, "0");
const writes = new Map(); // path → Buffer | string

function main() {
  const files = listFiles();
  const lessons = [];
  const report = { lectures: 0, pages: 0, strokes: 0, segments: 0, seconds: 0, unknownRecords: 0, unit: [] };
  for (const { file, n } of files) {
    const book = n <= 100 ? "middle" : "high";
    const number = book === "middle" ? n : n - 100; // 고등 lectures count from 1 again (owner)
    const id = `${book === "middle" ? "lm" : "lh"}${pad3(number)}`;
    const g = readGdb(file);
    const pen = readPen(g.pen, number);
    if (pen.trailing > 17) throw new Error(`${id}: pen data stops ${pen.trailing} bytes early`);
    const strokes = toStrokes(pen.segments);
    const sec = audioSeconds(g.audio);
    const unitSec = sec ? sec / g.lengthUnits : UNIT_SEC_DEFAULT;
    const voice = voices[id] || null;
    const timemap = voice ? loadTimemap(id) : null;
    if (voice && !timemap && Math.abs(voice.durationSec - sec) > 0.05) throw new Error(`${id}: voice.mp3 is ${voice.durationSec} s, the recording ${sec.toFixed(3)} s — not on the same timeline, and no docs/lecture/voice/${id}.timemap.json`);
    if (timemap && Math.abs(timemap.voiceSec - voice.durationSec) > 0.05) throw new Error(`${id}: timemap voiceSec ${timemap.voiceSec} ≠ manifest durationSec ${voice.durationSec}`);
    report.unit.push(unitSec);
    const pagesUsed = [...new Set([number, ...pen.pageEvents.map(([, pg]) => pg), ...pen.segments.map((s) => s.page)])];
    // the first page shown is the lecture's own page (182 has no page record; its strokes say 82)
    const firstPage = pen.pageEvents[0]?.[1] ?? pen.segments[0]?.page ?? number;
    if (firstPage !== number) throw new Error(`${id}: starts on page ${firstPage}, expected ${number}`);
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
      pageEvents: pen.pageEvents.length ? pen.pageEvents : [[0, number]],
      scrollEvents: pen.scrollEvents,
      // [t0, page, pen, x0, y0, (dt, dx, dy)…] — t in units (× unitSec = seconds), x/y in page pixels
      strokes,
    };
    if (timemap) penDoc = retimePen(penDoc, timemap);
    const lectureSec = timemap ? voice.durationSec : null;
    writes.set(path.join(MEDIA, "audio", "lecture", id, "pen.json"), JSON.stringify(penDoc));
    const title = `${book === "middle" ? "중등" : "고등"} 영어독해 ${number}강`;
    const chapter = Math.ceil(n / 10);
    const lesson = {
      id,
      course: "lecture",
      series: book === "middle" ? "lm" : "lh",
      variant: "main",
      pairId: null,
      title,
      label: `${book === "middle" ? "중등" : "고등"} 영어독해 ${(chapter - (book === "middle" ? 1 : 11)) * 10 + 1}~${(chapter - (book === "middle" ? 1 : 11)) * 10 + 10}강`,
      menuLabel: `${number}강`,
      unit: chapter,
      part: number,
      order: n - 1,
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

  const groups = [];
  for (let c = 1; c <= 20; c++) {
    const members = lessons.filter((l) => l.unit === c);
    groups.push({ title: members[0].label, lessons: members.map((l) => l.id) });
  }
  const index = {
    course: "lecture",
    tab: "lecture",
    lessonCount: lessons.length,
    groups,
    lessons: lessons.map(({ id, title, label, series, variant, unit, part, order, menuLabel, lecture }) => ({
      id, title, label, series, variant, unit, part, order, hasAudio: false, hasVideo: false, menuLabel, durationSec: lecture.durationSec,
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
