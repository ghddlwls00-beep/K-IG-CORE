#!/usr/bin/env node
/**
 * Draws a lecture's page with all its pen strokes (the state at the end of the lecture, or at --at <seconds>)
 * as an SVG, from the files build-lecture.mjs wrote — to look at the data without the site.
 *
 *   node scripts/lecture/render-pen.mjs <id> [--at <seconds>] [--media <folder>] [--out <file.svg>]
 *
 * Pen colours (2026-10-17, chosen to sit with the textbook's burgundy rules and the site's ink · gold — the original
 * GVA colours are not in the file): 0x43 crimson (the main pen, ~90% of strokes) · 0x33 ink blue · 0x23 forest green ·
 * 0x13 charcoal · 0x03 warm gold highlighter (wide, translucent, drawn under the text).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const id = args[0];
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const MEDIA = path.resolve(ROOT, arg("--media", ".lecture-media"));
const at = arg("--at", null);
const out = path.resolve(arg("--out", path.join(MEDIA, `${id}.svg`)));

export const PEN = {
  0x43: { color: "#C2362F", width: 2.2 },
  0x33: { color: "#2456A4", width: 2.2 },
  0x23: { color: "#2E7A4C", width: 2.2 },
  0x13: { color: "#2A2A2A", width: 2.2 },
  0x03: { color: "#E8B93A", width: 13, opacity: 0.42 },
};

const pen = JSON.parse(fs.readFileSync(path.join(MEDIA, "audio", "lecture", id, "pen.json"), "utf8"));
const limit = at === null ? Infinity : Number(at) / pen.unitSec;
// the page shown at that moment
let page = pen.pageEvents[0][1];
for (const [t, pg] of pen.pageEvents) if (t <= limit) page = pg;
const paths = [];
for (const s of pen.strokes) {
  const [t0, pg, code, x0, y0] = s;
  if (pg !== page || t0 > limit) continue;
  let t = t0, x = x0, y = y0;
  let d = `M${x} ${y}`;
  for (let i = 5; i + 2 < s.length + 1; i += 3) {
    t += s[i];
    if (t > limit) break;
    x += s[i + 1];
    y += s[i + 2];
    d += `L${x} ${y}`;
  }
  const p = PEN[code] || { color: "#ff00ff", width: 2 };
  paths.push(`<path d="${d}" fill="none" stroke="${p.color}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"${p.opacity ? ` stroke-opacity="${p.opacity}"` : ""}/>`);
}
const jpg = fs.readFileSync(path.join(MEDIA, "audio", "lecture", id, `p${String(page).padStart(3, "0")}.jpg`)).toString("base64");
// the page sits 80px right and 20px down in the pen's coordinates (the GVA window: PageNN.htm centres it under a 20px top
// margin — measured on 27 lectures, see src/components/LectureLearningView.tsx PAGE_X)
const PAGE_X = 80;
const PAGE_Y = 20;
const w = Math.max(pen.canvas.w, PAGE_X + pen.page.w);
const h = Math.max(pen.canvas.h, PAGE_Y + pen.page.h);
fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/><image href="data:image/jpeg;base64,${jpg}" x="${PAGE_X}" y="${PAGE_Y}" width="${pen.page.w}" height="${pen.page.h}"/>${paths.join("")}</svg>`);
console.log(`${id}: page ${page} · ${paths.length} strokes${at === null ? "" : ` up to ${at}s`} → ${path.relative(ROOT, out)}`);
