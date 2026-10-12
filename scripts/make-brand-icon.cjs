// Draws the site icon for '홍세일 | 음절연구소' (2026-10-12 — the icon used to be the 'K' of K-IG).
//
//   node scripts/make-brand-icon.cjs            writes src/app/icon.svg and src/app/favicon.ico
//   node scripts/make-brand-icon.cjs --preview <dir>   also writes icon-16/32/48/256.png there, to look at
//
// The mark is the syllable '음' (the first syllable of 음절) built from its three strokes — a ring (ㅇ),
// a bar (ㅡ) and a box (ㅁ) — on the same obsidian tile as before. The bar is the header mark's gold
// hairline turned on its side; the other two strokes are the paper colour. No font is involved: an
// SVG <text> would be drawn in whatever Korean font the visitor's system has, and the .ico needs
// pixels anyway. Both files come from the one shape list below, so they cannot drift apart.
// No dependencies (the repo has no image library): shapes are sampled 8×8 per pixel.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const INK = [0x12, 0x13, 0x16];
const PAPER = [0xfa, 0xf8, 0xf5];
const GOLD = [0xa8, 0x82, 0x4b];

// ---- the mark, in a 64 × 64 box ---------------------------------------------
const TILE_R = 14;
const STROKE = 4.8;
const RING = { cx: 32, cy: 18.6, r: 9 }; //            ㅇ  9.6 … 27.6
const BAR = { x: 14, y: 31.1, w: 36, h: STROKE }; //    ㅡ 31.1 … 35.9
const BOX = { x: 20.5, y: 39.4, w: 23, h: 15, r: 2 }; // ㅁ 39.4 … 54.4

const inRoundRect = (x, y, bx, by, bw, bh, r) => {
  if (x < bx || x > bx + bw || y < by || y > by + bh) return false;
  const cx = Math.min(Math.max(x, bx + r), bx + bw - r);
  const cy = Math.min(Math.max(y, by + r), by + bh - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

/** The colour at a point of the 64-box, or null outside the tile. */
function sample(x, y) {
  if (!inRoundRect(x, y, 0, 0, 64, 64, TILE_R)) return null;
  const d = Math.hypot(x - RING.cx, y - RING.cy);
  if (d <= RING.r && d >= RING.r - STROKE) return PAPER;
  if (inRoundRect(x, y, BAR.x, BAR.y, BAR.w, BAR.h, 0)) return GOLD;
  if (
    inRoundRect(x, y, BOX.x, BOX.y, BOX.w, BOX.h, BOX.r) &&
    !inRoundRect(x, y, BOX.x + STROKE, BOX.y + STROKE, BOX.w - 2 * STROKE, BOX.h - 2 * STROKE, 0)
  )
    return PAPER;
  return INK;
}

/** size × size RGBA, top row first, 8×8 samples per pixel. */
function raster(size) {
  const N = 8;
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          const c = sample(((px + (sx + 0.5) / N) * 64) / size, ((py + (sy + 0.5) / N) * 64) / size);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
        }
      const o = (py * size + px) * 4;
      if (a) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round((a / (N * N)) * 255);
    }
  return out;
}

// ---- icon.svg ---------------------------------------------------------------
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const n = (v) => String(Math.round(v * 100) / 100);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="홍세일 | 음절연구소">
  <rect width="64" height="64" rx="${TILE_R}" fill="${hex(INK)}"/>
  <circle cx="${n(RING.cx)}" cy="${n(RING.cy)}" r="${n(RING.r - STROKE / 2)}" fill="none" stroke="${hex(PAPER)}" stroke-width="${n(STROKE)}"/>
  <rect x="${n(BAR.x)}" y="${n(BAR.y)}" width="${n(BAR.w)}" height="${n(BAR.h)}" fill="${hex(GOLD)}"/>
  <path fill-rule="evenodd" fill="${hex(PAPER)}" d="M${n(BOX.x + BOX.r)} ${n(BOX.y)}h${n(BOX.w - 2 * BOX.r)}a${BOX.r} ${BOX.r} 0 0 1 ${BOX.r} ${BOX.r}v${n(BOX.h - 2 * BOX.r)}a${BOX.r} ${BOX.r} 0 0 1 -${BOX.r} ${BOX.r}h-${n(BOX.w - 2 * BOX.r)}a${BOX.r} ${BOX.r} 0 0 1 -${BOX.r} -${BOX.r}v-${n(BOX.h - 2 * BOX.r)}a${BOX.r} ${BOX.r} 0 0 1 ${BOX.r} -${BOX.r}zM${n(BOX.x + STROKE)} ${n(BOX.y + STROKE)}v${n(BOX.h - 2 * STROKE)}h${n(BOX.w - 2 * STROKE)}v-${n(BOX.h - 2 * STROKE)}z"/>
</svg>
`;

// ---- favicon.ico (16 · 32 · 48, 32-bit BGRA, rows bottom-up, + AND mask) -----
function icoImage(size) {
  const rgba = raster(size);
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = ((size - 1 - y) * size + x) * 4;
      xor[d] = rgba[s + 2]; xor[d + 1] = rgba[s + 1]; xor[d + 2] = rgba[s]; xor[d + 3] = rgba[s + 3];
    }
  const maskRow = Math.ceil(size / 32) * 4; // rows padded to 32 bits; all 0 — the alpha channel decides
  const and = Buffer.alloc(maskRow * size, 0);
  const head = Buffer.alloc(40);
  head.writeUInt32LE(40, 0);
  head.writeInt32LE(size, 4);
  head.writeInt32LE(size * 2, 8);
  head.writeUInt16LE(1, 12);
  head.writeUInt16LE(32, 14);
  head.writeUInt32LE(xor.length + and.length, 20);
  return Buffer.concat([head, xor, and]);
}
function ico(sizes) {
  const images = sizes.map(icoImage);
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((size, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(images[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return e;
  });
  return Buffer.concat([dir, ...entries, ...images]);
}

// ---- png (preview only) -----------------------------------------------------
function png(size) {
  const rgba = raster(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const table = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const v of buf) c = table[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const previewAt = process.argv.indexOf("--preview");
if (previewAt > -1) {
  const dir = process.argv[previewAt + 1];
  fs.mkdirSync(dir, { recursive: true });
  for (const size of [16, 32, 48, 256]) fs.writeFileSync(path.join(dir, `icon-${size}.png`), png(size));
  console.log("preview →", dir);
}
fs.writeFileSync(path.join(ROOT, "src/app/icon.svg"), svg);
const icoFile = ico([16, 32, 48]);
fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), icoFile);
console.log("icon.svg", svg.length, "bytes · favicon.ico", icoFile.length, "bytes (16 · 32 · 48)");
