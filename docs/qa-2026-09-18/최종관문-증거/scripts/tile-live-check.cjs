// LISTENING 타일 받아쓰기를 운영에서 문장마다 직접 — 스윕 FAIL(d078 · d197)이 앱 탓인지 도구 탓인지 가리는 증거.
// 강의를 열고(이용권 사본) STEP 2 → 블록 탭 모드 → 문장 점(aria-label '문장 k')을 눌러 그 문장으로 → 전체 초기화 → 그 문장 낱말(앱 generateWordBank 의
// correctWords — 섞기와 상관없음)을 보관함에서 차례로 탭 → 조립된 칸이 그 문장인지 → '✓ 정답 채점하기' → 알림 글.
// 기대: 모든 문장 '정답입니다'. --break: 마지막 문장 화면에서 1번 문장을 조립(스윕 도구가 한 일) → '순서가 조금 다릅니다' 여야 하고, 도구는 exit 1.
//   KIG_PROFILE_SOURCE · KIG_CLONE_PREFIX 와 함께: node tile-live-check.cjs --ids d078,d197 [--viewport desktop|mobile] [--port 9663] [--break]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const L = (rel) => { const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, (x) => (x.startsWith(".") || x.startsWith("@/") ? {} : require(x))); return m.exports; };
const U = L("src/lib/listeningUtils.ts");
const S = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const IDS = arg("--ids", "d078,d197").split(",");
const VP = arg("--viewport", "desktop");
const BREAK = process.argv.includes("--break");
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
const PLACED = `(b) => /✕|✖/.test(b.innerText || '') || /되돌리/.test(b.getAttribute('title') || '')`;
const btnBy = (reSrc) => `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => ${reSrc}.test((b.innerText || '').replace(/\\s+/g, ' ')))`;
(async () => {
  const browser = await H.startBrowser(`tile-live-${VP}${BREAK ? "-break" : ""}`, Number(arg("--port", 9663)));
  const out = [];
  let bad = 0;
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, VP);
    for (const id of IDS) {
      // 대본 쪽(dNNN-1)도 같은 강의의 대본 문장으로 받아쓰기를 함 — 대본 파일의 열쇠는 dNNN
      const rows = S[id] || S[id.replace(/-\d+$/, "")]; const all = rows.map((r) => r.en);
      const pool = [...new Set(all.flatMap((s) => s.split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, ""))))].filter(Boolean);
      const words = all.map((s) => U.generateWordBank(s, pool).correctWords);
      const loaded = await H.load(tab, `/ld/${id}`, { marker: "STEP 2" });
      if (!loaded.rendered) { out.push({ id, error: "안 뜸" }); bad++; continue; }
      await H.click(tab, `[...document.querySelectorAll('main button')].filter(${VIS}).find((b) => /STEP 2/.test(b.innerText || '') && /딕테이션/.test(b.innerText || ''))`, { settle: 800 });
      if (await tab.eval(`Boolean(${btnBy("/블록 탭 모드로 전환/")})`)) await H.click(tab, btnBy("/블록 탭 모드로 전환/"), { settle: 600 });
      const n = await tab.eval(`[...document.querySelectorAll('main button[aria-label]')].filter((b) => /^문장 \\d+/.test(b.getAttribute('aria-label'))).length`);
      const ks = BREAK ? [n] : [...Array(n).keys()].map((i) => i + 1);
      for (const k of ks) {
        await H.click(tab, `[...document.querySelectorAll('main button[aria-label]')].find((b) => new RegExp('^문장 ' + ${k} + '(\\\\s|$)').test(b.getAttribute('aria-label')))`, { settle: 500 });
        const cur = await tab.eval(`(() => { const b = document.querySelector('main button[aria-current="step"]'); return b ? b.getAttribute('aria-label') : null; })()`);
        await H.click(tab, btnBy("/전체 초기화/"), { settle: 500 });
        const want = BREAK ? words[0] : words[k - 1];
        let placed = 0;
        for (const w of want) {
          const r = await H.click(tab, `(() => { const main = document.querySelector('main'); const norm = (s) => s.replace(/[^\\w'\\u2019-]/g, '').toLowerCase();
            const bank = [...main.querySelectorAll('button')].filter(${VIS}).filter((b) => !(${PLACED})(b) && !b.disabled && !b.getAttribute('aria-label'));
            return bank.find((b) => norm(b.innerText || '') === norm(${JSON.stringify(w)})) || null; })()`, { settle: 200 });
          if (r.ok) placed++;
        }
        const assembled = await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => (${PLACED})(b)).map((b) => (b.innerText || '').replace(/[✕✖]/g, '').replace(/\\s+/g, ' ').trim()).join(' ')`);
        const norm = (s) => String(s).replace(/[^\w'’\s-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        const assembledRight = norm(assembled) === norm(want.join(" "));
        await H.click(tab, btnBy("/정답 채점하기/"), { settle: 600 });
        const fb = await tab.eval(`(() => { const t = (document.querySelector('main') || document.body).innerText || ''; const m = t.match(/정답입니다[^\\n]*|순서가 조금 다릅니다[^\\n]*/); return m ? m[0] : null; })()`);
        const accepted = !!fb && /정답입니다/.test(fb);
        // the same verdict in both modes — --break only feeds the wrong sentence, so exit 1 there means the check really caught it
        const pass = accepted && assembledRight && placed === want.length;
        if (!pass) bad++;
        out.push({ id, viewport: VP, sentence: k, onScreen: cur, built: BREAK ? 1 : k, words: want.length, placed, assembledRight, feedback: fb, pass });
        console.log(`${pass ? "정답" : "✘ 정답 아님"} ${id} ${VP} 화면 ${cur} · 조립 문장 ${BREAK ? 1 : k} · 낱말 ${placed}/${want.length}${assembledRight ? "" : ` · 조립 '${assembled.slice(0, 60)}'`} → ${fb || "알림 없음"}`);
      }
    }
  } finally { browser.proc.kill(); }
  const f = path.join(__dirname, `tile-live-check-${VP}${BREAK ? "-break" : ""}.json`);
  fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), ids: IDS, viewport: VP, break: BREAK, results: out }, null, 1));
  const ok = out.filter((r) => r.pass).length;
  console.log(`${BREAK ? "[일부러 깸 — 마지막 문장 화면에서 1번 문장 조립 · 정답 아님이어야]" : ""} 문장 ${out.length} · 정답 ${ok} · 정답 아님 ${out.length - ok} · → ${f}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
