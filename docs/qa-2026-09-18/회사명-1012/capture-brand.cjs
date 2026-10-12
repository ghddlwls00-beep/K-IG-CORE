// 회사명 바꿈(2026-10-12 'K-IG 교육' → '홍세일 | 음절연구소') 전 · 뒤 사진.
//   node capture-brand.cjs <base> <tag>      예) node capture-brand.cjs https://k-ig-core.vercel.app before
//                                                node capture-brand.cjs http://localhost:3391 after
// 이용권 없는 빈 프로필 · 브라우저 하나 · 사진은 docs/qa-2026-09-18/out/brand-1012/<tag>/ (git 밖).
// 머리줄 로고 자리의 글 · 크기 · 글꼴 · 탭 제목 · 공유 제목도 재서 facts.json 으로 남긴다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const BASE = (process.argv[2] || "http://localhost:3391").replace(/\/$/, "");
const TAG = process.argv[3] || "after";
const PORT = Number(process.env.PORT_CDP || 9990);
const OUT = path.join(__dirname, "..", "out", "brand-1012", TAG);
const EDGE = process.env.QA_EDGE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  ["home", "/"],
  ["student-list", "/student"],
  ["student-lesson", "/student/s1-1"],
  ["passoff-list", "/passoff-grammar"],
  ["locked", "/adult/a2-1"],
  ["notfound", "/nope"],
];
const VIEWS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false },
};

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const waiting = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && waiting.has(m.id)) {
        const { ok, no } = waiting.get(m.id);
        waiting.delete(m.id);
        m.error ? no(new Error(m.error.message)) : ok(m.result);
      }
    };
    ws.onerror = () => reject(new Error("CDP socket error"));
    ws.onopen = () => resolve({ send: (method, params = {}) => new Promise((ok, no) => { waiting.set(++id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); }), close: () => ws.close() });
  });
}

const MEASURE = `(() => {
  const el = document.querySelector('[data-brand-mark]') || document.querySelector('header a[href="/"]') || document.querySelector('main header h1');
  const r = el ? el.getBoundingClientRect() : null;
  const cs = el ? getComputedStyle(el) : null;
  const meta = (s) => (document.querySelector(s) || {}).content || null;
  return {
    brandText: el ? el.innerText.replace(/\\s+/g, ' ').trim() : null,
    brandBox: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
    brandFont: cs ? cs.fontSize + ' · ' + cs.fontFamily.split(',')[0] : null,
    headerOverflow: document.documentElement.scrollWidth - window.innerWidth,
    title: document.title,
    ogTitle: meta('meta[property="og:title"]'),
    ogSite: meta('meta[property="og:site_name"]'),
    description: meta('meta[name="description"]'),
    oldNameOnScreen: (document.body.innerText.match(/K[-\\u2011]IG[^\\n]{0,20}/g) || []).slice(0, 5),
  };
})()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "brand1012-"));
  const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-extensions", "--disable-gpu", "--mute-audio", "about:blank"], { stdio: "ignore" });
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch {}
      if (!target) await sleep(500);
    }
    if (!target) throw new Error("브라우저가 뜨지 않음");
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    const facts = {};
    for (const scheme of ["light", "dark"]) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      for (const [view, v] of Object.entries(VIEWS)) {
        await cdp.send("Emulation.setDeviceMetricsOverride", v);
        for (const [name, p] of PAGES) {
          await cdp.send("Page.navigate", { url: BASE + p });
          for (let i = 0; i < 40; i++) {
            await sleep(250);
            const ready = await cdp.send("Runtime.evaluate", { expression: "document.readyState === 'complete' && !!document.querySelector('main')", returnByValue: true }).catch(() => null);
            if (ready && ready.result.value) break;
          }
          await sleep(1500);
          const key = `${scheme}/${view}/${name}`;
          facts[key] = (await cdp.send("Runtime.evaluate", { expression: MEASURE, returnByValue: true })).result.value;
          const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
          const dir = path.join(OUT, scheme, view);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${name}.jpg`), Buffer.from(shot.data, "base64"));
          // 로고만 크게(휴대폰 · 데스크톱 머리줄 왼쪽 위)
          const clip = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: Math.min(v.width, 420), height: 72, scale: v.mobile ? 2 : 3 } });
          fs.writeFileSync(path.join(dir, `${name}-logo.png`), Buffer.from(clip.data, "base64"));
          console.log(key, JSON.stringify(facts[key].brandText), facts[key].brandBox, facts[key].title);
        }
      }
    }
    fs.writeFileSync(path.join(OUT, "facts.json"), JSON.stringify(facts, null, 2));
    cdp.close();
  } finally {
    proc.kill();
    await sleep(800);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
