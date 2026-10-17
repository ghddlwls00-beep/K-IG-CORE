#!/usr/bin/env node
/**
 * LECTURE voice — a local stand-in for the media bucket, for checking a voice on the site WITHOUT uploading it:
 * serves .lecture-media/ (the same keys as R2: audio/lecture/<id>/p<NN>.jpg · pen.json · voice.mp3) with Range
 * support, so a local `next dev` started with R2_PUBLIC_BASE_URL=http://127.0.0.1:<port> (and no R2 credentials in
 * its environment) reads from here through its own /audio/… gate — same origin, same licence check, same CSP.
 *
 *   node scripts/lecture/voice/local-media-server.mjs [--port 3399] [--media .lecture-media]
 *
 * Listens on 127.0.0.1 only. Never for deployment.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg("--port", 3399));
const MEDIA = path.resolve(ROOT, arg("--media", ".lecture-media"));
const TYPES = { ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg", ".wav": "audio/wav" };

http.createServer((req, res) => {
  const key = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const file = path.join(MEDIA, key);
  if (key.includes("..") || !file.startsWith(MEDIA) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end("not found");
    return;
  }
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) {
    let start = range[1] ? Number(range[1]) : null, end = range[2] ? Number(range[2]) : null;
    if (start === null) { start = Math.max(0, size - end); end = size - 1; } else if (end === null || end >= size) end = size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`local media ${MEDIA} on http://127.0.0.1:${PORT}`));
