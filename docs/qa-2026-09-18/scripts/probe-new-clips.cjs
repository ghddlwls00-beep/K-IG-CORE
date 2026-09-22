#!/usr/bin/env node
/**
 * 운영 재점검 #2 / A-1 — 2026-09-22 에 새로 만든 클립이 운영에서 실제로 소리가 나는가.
 *
 * "파일이 있는가" 가 아니라 "앱이 요청하는 바로 그 주소가 오디오를 돌려주는가" 를 본다.
 * 클립 키는 하드코딩하지 않고 app 의 unifiedSpeechKey 로 콘텐츠에서 다시 계산하므로,
 * 텍스트와 키가 어긋나면 그 자체가 드러난다.
 *
 * 이용권이 있어야 하는 유료 강의 클립이므로, probe-missing-clips.cjs 와 같은 방식으로
 * 이미 등록된 감사용 프로필의 페이지 안에서 fetch 한다 — 새 기기를 등록하지 않고
 * 이용권 코드를 입력하지 않는다. 상태를 바꾸는 API 는 부르지 않는다.
 *
 *   node probe-new-clips.cjs [--port 9575]
 * Output: out/new-clips-prod.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9575));
const OUT = path.join(__dirname, "../out");
const REPO = H.REPO;

const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const lesson = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
const rowOf = (id, n) => (scripts[id] || []).find((r) => String(r.n) === String(n));

/** 이번에 바뀐 영어 문장들 — 데이터에서 그대로 읽는다 */
const targets = [];
const push = (label, text) => targets.push({ label, text, key: H.expectedClip(text).split("/").pop().replace(/\.mp3$/, ""), url: H.expectedClip(text) });

push("d024 n=9", rowOf("d024", 9).en);
push("d058 n=1", rowOf("d058", 1).en);
push("d058 힌트", (lesson("d058").blocks.find((b) => b.type === "hints") || {}).text);
for (const n of [2, 3, 4, 5, 6]) push(`d192 n=${n}`, rowOf("d192", n).en);
push("d193 n=2", rowOf("d193", 2).en);
// 힌트가 없는 23강이 함께 쓰는 새 지시문
const guide = (lesson("d177").blocks.find((b) => b.type === "instruction") || {}).text;
push("지시문(23강 공용)", guide);

const CLIPS = path.join(REPO, "public/audio/azure-ava/v1");
for (const t of targets) {
  const local = path.join(CLIPS, `${t.key}.mp3`);
  t.localBytes = fs.existsSync(local) ? fs.statSync(local).size : null;
}

(async () => {
  const browser = await H.startBrowser("probe-new-clips", PORT);
  const tab = await H.openTab(browser);
  // 이용권 쿠키가 실리도록 유료 강의 페이지 안에서 요청한다 (쿠키 값은 읽지 않는다)
  await H.load(tab, "/ld/d192", { marker: null });
  const href = await tab.eval("location.href");
  console.log(`asking from ${href}\n`);

  const results = await tab.eval(`(async () => {
    const urls = ${JSON.stringify(targets.map((t) => t.url))};
    const out = [];
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        const buf = await r.arrayBuffer();
        out.push({ url: u, status: r.status, type: r.headers.get("content-type") || "", bytes: buf.byteLength, cache: r.headers.get("cache-control") || "" });
      } catch (e) { out.push({ url: u, status: 0, type: "network error: " + e.message, bytes: 0, cache: "" }); }
    }
    return out;
  })()`);

  const rows = targets.map((t) => {
    const r = results.find((x) => x.url === t.url) || {};
    return {
      label: t.label,
      text: t.text,
      key: t.key,
      status: r.status,
      type: r.type,
      prodBytes: r.bytes,
      localBytes: t.localBytes,
      match: r.status === 200 && /audio\/mpeg/.test(r.type || "") && r.bytes === t.localBytes,
      cache: r.cache,
    };
  });

  fs.writeFileSync(path.join(OUT, "new-clips-prod.json"), JSON.stringify({ at: new Date().toISOString(), base: H.BASE, rows }, null, 1));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad("강의/문장", 20)}${pad("상태", 6)}${pad("Content-Type", 14)}${pad("운영 바이트", 13)}${pad("로컬 바이트", 13)}일치`);
  for (const r of rows) {
    console.log(`${pad(r.label, 20)}${pad(r.status, 6)}${pad(r.type.split(";")[0], 14)}${pad(r.prodBytes, 13)}${pad(r.localBytes, 13)}${r.match ? "예" : "아니오"}`);
  }
  const bad = rows.filter((r) => !r.match);
  console.log(`\n${rows.length}개 중 ${rows.length - bad.length}개 일치 · 불일치 ${bad.length}개`);
  for (const b of bad) console.log(`   불일치: ${b.label} — status ${b.status}, type ${b.type}, ${b.prodBytes} vs ${b.localBytes}`);
  browser.proc.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
