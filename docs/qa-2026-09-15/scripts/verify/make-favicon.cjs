// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// Generates src/app/icon.svg and src/app/favicon.ico for K-IG CORE.
// Design mirrors the header mark: obsidian tile, champagne-gold dot.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const INK = [0x12, 0x13, 0x16];
const GOLD = [0xa8, 0x82, 0x4b];
const PAPER = [0xfa, 0xf8, 0xf5];

// ---- icon.svg --------------------------------------------------------------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="K-IG 교육">
  <rect width="64" height="64" rx="14" fill="#121316"/>
  <path d="M18 18h6v12.4L34.6 18H42L30.6 31.2 42.4 46h-7.6l-8.4-11.2H24V46h-6z" fill="#FAF8F5"/>
  <circle cx="47" cy="43" r="4.6" fill="#A8824B"/>
</svg>
`;
fs.writeFileSync(path.join(REPO, "src/app/icon.svg"), svg);

// ---- favicon.ico (32x32, 32-bit BGRA + AND mask) ---------------------------
const S = 32;
const px = Buffer.alloc(S * S * 4);
function set(x, y, [r, g, b], a = 255) {
  // BMP rows are stored bottom-up.
  const o = ((S - 1 - y) * S + x) * 4;
  px[o] = b;
  px[o + 1] = g;
  px[o + 2] = r;
  px[o + 3] = a;
}
const rRect = 7; // rounded corners
function inRounded(x, y) {
  const cx = Math.min(Math.max(x, rRect), S - 1 - rRect);
  const cy = Math.min(Math.max(y, rRect), S - 1 - rRect);
  return (x - cx) ** 2 + (y - cy) ** 2 <= rRect * rRect + 1;
}
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) set(x, y, inRounded(x, y) ? INK : PAPER, inRounded(x, y) ? 255 : 0);
}
// "K" stem + diagonals, drawn as simple strokes.
function stroke(x0, y0, x1, y1, w) {
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    for (let dx = -w; dx <= w; dx++)
      for (let dy = -w; dy <= w; dy++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && xx < S && yy >= 0 && yy < S && dx * dx + dy * dy <= w * w + 1)
          set(xx, yy, PAPER);
      }
  }
}
stroke(10, 9, 10, 22, 1);
stroke(10, 16, 17, 9, 1);
stroke(10, 16, 17, 23, 1);
// gold dot
const dcx = 23.5,
  dcy = 21.5,
  dr = 2.6;
for (let y = 0; y < S; y++)
  for (let x = 0; x < S; x++)
    if ((x - dcx) ** 2 + (y - dcy) ** 2 <= dr * dr) set(x, y, GOLD);

const xor = px;
const andMask = Buffer.alloc((S * S) / 8, 0); // all opaque
const header = Buffer.alloc(40);
header.writeUInt32LE(40, 0);
header.writeInt32LE(S, 4);
header.writeInt32LE(S * 2, 8); // height doubled: XOR + AND
header.writeUInt16LE(1, 12);
header.writeUInt16LE(32, 14);
header.writeUInt32LE(0, 16);
header.writeUInt32LE(xor.length + andMask.length, 20);

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(S, 0);
entry.writeUInt8(S, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(header.length + xor.length + andMask.length, 8);
entry.writeUInt32LE(6 + 16, 12);

const ico = Buffer.concat([dir, entry, header, xor, andMask]);
fs.writeFileSync(path.join(REPO, "src/app/favicon.ico"), ico);
console.log("icon.svg", svg.length, "bytes");
console.log("favicon.ico", ico.length, "bytes");
