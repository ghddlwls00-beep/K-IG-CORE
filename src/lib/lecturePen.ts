/**
 * LECTURE (2026-10-17) — the pen file of one lecture (audio/lecture/<id>/pen.json, a private R2 object written by
 * scripts/lecture/build-lecture.mjs) and the timeline the lecture view draws from it.
 *
 * The file: { v, id, unitSec, lengthUnits, page: {w: 827, h: 1169}, canvas: {w, h}, pageEvents: [[t, page]…],
 * scrollEvents: [[t, y]…], strokes: [[t0, page, pen, x0, y0, (dt, dx, dy)…]…] } — t in time units (× unitSec = seconds),
 * x · y in textbook-page pixels (notes beside the page reach x ≈ 1010, so canvas.w is up to 1020). The scroll events are the
 * old player's viewport; the points already carry the page position, so they are not needed to draw.
 *
 * Import-free (the check script transpiles it alone).
 */

export interface LecturePenFile {
  v: number;
  id: string;
  unitSec: number;
  lengthUnits: number;
  page: { w: number; h: number };
  canvas: { w: number; h: number };
  pageEvents: [number, number][];
  scrollEvents?: [number, number][];
  strokes: number[][];
}

/** One stroke as absolute points: point 0 is where the pen came down, point i (i ≥ 1) is reached at t[i]. */
export interface LectureStroke {
  page: number;
  pen: number;
  t: number[];
  x: number[];
  y: number[];
}

export interface LectureTimeline {
  unitSec: number;
  /** [time unit, page] in time order — the page shown from that time on */
  pageEvents: [number, number][];
  strokes: LectureStroke[];
  /**
   * Every drawn segment in time order: segment k is stroke segStroke[k] from point segPoint[k] − 1 to point segPoint[k],
   * reached at segT[k] (time units). The view draws k = 0, 1, … while segT[k] ≤ now.
   */
  segStroke: Int32Array;
  segPoint: Int32Array;
  segT: Float64Array;
}

/** Throws on a file that is not a pen file, so the view shows its error line instead of a half-drawn page. */
export function buildLectureTimeline(file: LecturePenFile): LectureTimeline {
  if (!file || !Array.isArray(file.strokes) || !Array.isArray(file.pageEvents) || !(file.unitSec > 0)) {
    throw new Error("not a lecture pen file");
  }
  const strokes: LectureStroke[] = [];
  const order: { t: number; s: number; p: number }[] = [];
  for (const raw of file.strokes) {
    if (!Array.isArray(raw) || raw.length < 8) continue;
    const [t0, page, pen, x0, y0] = raw;
    const stroke: LectureStroke = { page, pen, t: [t0], x: [x0], y: [y0] };
    let t = t0;
    let x = x0;
    let y = y0;
    for (let i = 5; i + 2 < raw.length; i += 3) {
      t += raw[i];
      x += raw[i + 1];
      y += raw[i + 2];
      stroke.t.push(t);
      stroke.x.push(x);
      stroke.y.push(y);
    }
    const s = strokes.length;
    strokes.push(stroke);
    for (let p = 1; p < stroke.t.length; p++) order.push({ t: stroke.t[p], s, p });
  }
  // stable: segments at the same time keep the file's order (Array.prototype.sort is stable)
  order.sort((a, b) => a.t - b.t);
  const segStroke = new Int32Array(order.length);
  const segPoint = new Int32Array(order.length);
  const segT = new Float64Array(order.length);
  order.forEach((o, k) => {
    segStroke[k] = o.s;
    segPoint[k] = o.p;
    segT[k] = o.t;
  });
  const pageEvents = file.pageEvents
    .filter((e) => Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1]))
    .slice()
    .sort((a, b) => a[0] - b[0]);
  return { unitSec: file.unitSec, pageEvents, strokes, segStroke, segPoint, segT };
}

/** The page shown at `units`: the last page event at or before it — before the first one, the first one's page. */
export function lecturePageAt(timeline: LectureTimeline, units: number, fallback: number): number {
  const events = timeline.pageEvents;
  if (events.length === 0) return fallback;
  let page = events[0][1];
  for (const [t, p] of events) {
    if (t <= units) page = p;
    else break;
  }
  return page;
}

/** How many segments are reached at `units` (segT is sorted): the k with segT[k] ≤ units are 0 … result − 1. */
export function lectureSegmentsAt(timeline: LectureTimeline, units: number): number {
  const a = timeline.segT;
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] <= units) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
