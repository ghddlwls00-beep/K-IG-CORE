// 발음 기호 꼴 새 클립 56 — MP3 조각이 온전한지(끝 조각 덜 참 · 싱크 깨짐 · 조각 0) · 길이 · 안쪽 멈춤(ffmpeg silencedetect −35dB ≥0.2초, 앞뒤 0.2초 밖)을
// 지금 운영(397f1e8 한글 꼴) · 고치기 전(영어식) 클립과 나란히. 깨기 --break: 첫 파일의 끝 300바이트를 메모리에서 자름 → '덜 참' 이 잡혀야.
//   node ipa-clips-check.cjs <ipa-clips.json> [--break]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const A = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/public/audio/azure-ava/v1";
const BREAK = process.argv.includes("--break");
const list = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).filter((x) => /\s/.test(x.text.replace(/\s*⟨[^⟩]*⟩\s*$/, "")));
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SR = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };
function parse(buf) {
  let i = 0, s = 0, frames = 0, sync = 0, partial = false, last = 0;
  if (buf.toString("latin1", 0, 3) === "ID3") i = last = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { sync++; i++; continue; }
    const vb = (buf[i + 1] >> 3) & 3, lb = (buf[i + 1] >> 1) & 3; const ver = vb === 3 ? 1 : vb === 2 ? 2 : vb === 0 ? 2.5 : null;
    const bri = (buf[i + 2] >> 4) & 15, sri = (buf[i + 2] >> 2) & 3, pad = (buf[i + 2] >> 1) & 1;
    if (!ver || lb !== 1 || !bri || bri === 15 || sri === 3) { sync++; i++; continue; }
    const kbps = (ver === 1 ? BR1 : BR2)[bri], sr = SR[ver][sri], n = ver === 1 ? 1152 : 576;
    const len = Math.floor(((n / 8) * kbps * 1000) / sr) + pad;
    if (i + len > buf.length) { partial = true; break; }
    s += n / sr; frames++; i += len; last = i;
  }
  return { seconds: +s.toFixed(2), frames, sync, partial, trailing: buf.length - last };
}
const FF = execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-Command ffmpeg).Source"], { encoding: "utf8" }).trim();
// ffmpeg 는 silencedetect 결과를 표준 오류로 냄 — 표준 출력만 읽으면 멈춤이 늘 0 으로 나온다(처음 판이 그랬음 · 한글판에서 따로 잰 0.25초 멈춤으로 잡음)
const { spawnSync } = require("child_process");
function pauses(file) {
  const r = spawnSync(FF, ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.2", "-f", "null", "-"], { encoding: "utf8" });
  const all = String(r.stderr || "") + String(r.stdout || "");
  const dur = parse(fs.readFileSync(file)).seconds;
  const res = [...all.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => ({ end: +m[1], len: +m[2], start: +m[1] - +m[2] }));
  return res.filter((p) => p.start > 0.2 && p.end < dur - 0.2).map((p) => +p.len.toFixed(2));
}
let bad = 0, innerNew = 0, innerHangul = 0, innerEnglish = 0;
const rows = [];
list.forEach((x, idx) => {
  const f = path.join(A, `${x.key}.mp3`);
  let buf = fs.readFileSync(f);
  if (BREAK && idx === 0) buf = buf.subarray(0, buf.length - 300);
  const p = parse(buf);
  const words = (x.text.replace(/⟨[^⟩]*⟩/g, "").match(/[A-Za-z0-9’']+/g) || []).length;
  const ok = !p.partial && p.trailing === 0 && p.sync === 0 && p.frames > 0 && p.seconds >= 0.6 + words * 0.15;
  if (!ok) bad++;
  const pn = pauses(f), ph = x.hangulFile ? pauses(path.join(A, `${x.hangulKey}.mp3`)) : [], pe = x.englishFile ? pauses(path.join(A, `${x.englishKey}.mp3`)) : [];
  innerNew += pn.length; innerHangul += ph.length; innerEnglish += pe.length;
  rows.push(`${ok ? "온전" : "✗"} ${p.seconds}초(한글판 ${x.hangulFile ? parse(fs.readFileSync(path.join(A, `${x.hangulKey}.mp3`))).seconds : "-"} · 영어식 ${x.englishFile ? parse(fs.readFileSync(path.join(A, `${x.englishKey}.mp3`))).seconds : "-"}) · 안쪽 멈춤 새 ${pn.join("/") || 0} · 한글판 ${ph.join("/") || 0} · 영어식 ${pe.join("/") || 0} · ${x.page} "${x.written.slice(0, 60)}"`);
});
for (const r of rows) console.log(r);
console.log(`${BREAK ? "[깨기 — 첫 파일 끝 300B 자름] " : ""}새 클립 ${list.length} · 온전 ${list.length - bad} · 문제 ${bad} · 안쪽 멈춤(≥0.2초) 합 — 새 ${innerNew} · 한글판(지금 운영) ${innerHangul} · 영어식(고치기 전) ${innerEnglish}`);
process.exit(bad ? 1 : 0);
