#!/usr/bin/env node
/**
 * 배포 확인 (로그인이 필요한 것만) — 2026-09-23 배포 f35e8be.
 *
 *   1. 이번에 올린 클립 114개(plans/clips-0923.json: 1차 72 + 2차 42)를 **앱이 요청하는 그 주소**
 *      (`/audio/azure-ava/v1/<키>.mp3`, src/lib/unifiedSpeech.ts)로, 감사용 이용권 프로필 세션에서 받는다.
 *      200 · audio/mpeg · 바이트 수가 로컬 파일과 같은가. 하나라도 어긋나면 2번을 하지 않고 멈춘다.
 *   2. 과정마다 이번에 바뀐 유료 강의 1곳을 열어, 고친 글이 **그 자리에** 보이는가(lib/containers.cjs 와 같은 칸).
 *      배포가 나갔는지 보는 확인이다 — 전수는 최종 관문 0.
 *
 * 브라우저는 1개만 쓴다(3차 점검이 1개를 쓰는 중). 이용권·기기 등록·관리자 기능은 건드리지 않는다 —
 * 이미 등록된 감사용 프로필의 복제본으로 페이지를 열고 파일을 받기만 한다.
 *
 *   node probe-prod-deploy.cjs [--port 9731]
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const C = require("./lib/containers.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", "9731"));
/**
 * --control: 이 확인이 실패할 수 있는지 보는 대조군. 없는 클립 키 3개와 **고치기 전** 글을 찾는다 —
 * 전부 "실패 / 안 보임" 이어야 정상이다. (운영은 건드리지 않고 읽기만 한다.)
 */
const CONTROL = process.argv.includes("--control");
const CLIPS = CONTROL
  ? ["zz-0000000000000000", "zz-1111111111111111", "zz-2222222222222222"].map((key) => ({ round: "대조", key, bytes: 1, text: "없는 키" }))
  : JSON.parse(fs.readFileSync(path.join(__dirname, "plans/clips-0923.json"), "utf8"));
const OUTFILE = path.join(H.OUT, CONTROL ? "prod-deploy-0923-control.json" : "prod-deploy-0923.json");

const STEP_BTN = (n) => `[...document.querySelectorAll('main button')].find((b) => /\\bstep ${n}(?!\\d)/i.test((b.innerText || '').replace(/\\s+/g, ' ')))`;

/** 대조군: 같은 자리에서 **고치기 전** 글을 찾는다 (커밋 f35e8be 이전 값). */
const LESSONS_BEFORE = [
  { course: "phonics", id: "hv-51", step: 1, reader: "voca-meanings", want: [["plea", "항변"]] },
  { course: "grammar1", id: "gh1-068", step: 1, reader: "grammar-ko", want: ["각(each) 소년이 한 상을 받지는 않았죠?"],
    also: { step: 3, reader: "grammar-en", want: ["Each boy didn't receive a prize, did he?"] } },
  { course: "grammar2", id: "gh2-034-1", step: 1, reader: "grammar-ko", want: ["그는 나에게 다시 오겠다고 약속했다."] },
  { course: "ld", id: "d256", step: 5, reader: "ld-script-ko", want: ["치료를 행하는 인디언 주술사의 광경은 정말로 기억할 만한 어떤 것이다."],
    alsoText: ["The sight of an Indian medicine man performing a cure is really something to be remembered."] },
  { course: "reading", id: "pr091", step: 1, reader: "reading-passage", want: ["For example, according to American law, if someone is accused of a crime, he is considered innocent until the court proves that the person is guilty."] },
  { course: "student", id: "s6-3", step: 1, reader: "student-cards", want: ["I think he/she likes the color blue (green, red, black, purple, etc.) because he/she always wears a (red tie, black suit, purple dress).", "제 생각에 그는/그녀는 파란색(초록, 빨강, 검정, 보라, 등)을 좋아하십니다. 왜냐하면 그는/그녀는 항상 (빨강 타이, 검정 정장, 보라색 드레스)을 입기 때문입니다."] },
];

/** 과정마다 한 곳 — 무엇을 어느 칸에서 찾는가. */
const LESSONS_AFTER = [
  { course: "phonics", id: "hv-51", step: 1, reader: "voca-meanings", want: [["plea", "간청, 탄원; (법정의) 답변"]] },
  { course: "grammar1", id: "gh1-068", step: 1, reader: "grammar-ko", want: ["모든 사람이(everybody) 한 상을 받지는 않았죠?"],
    also: { step: 3, reader: "grammar-en", want: ["Not everybody received a prize, did they?"] } },
  { course: "grammar2", id: "gh2-034-1", step: 1, reader: "grammar-ko", want: ["그는 다시 오겠다고 약속했다."] },
  { course: "ld", id: "d256", step: 5, reader: "ld-script-ko", want: ["치료를 행하는 전통 치료사의 광경은 정말로 기억할 만한 어떤 것이다."],
    alsoText: ["The sight of a traditional healer performing a cure is really something to be remembered."] },
  { course: "reading", id: "pr091", step: 1, reader: "reading-passage", want: ["For example, according to American law, if someone is accused of a crime, he is considered innocent until he is proven guilty in court."] },
  { course: "student", id: "s6-3", step: 1, reader: "student-cards", want: ["I think he/she likes the color black because he/she always wears a black suit.", "제 생각에 그는/그녀는 검은색을 좋아하십니다. 왜냐하면 그는/그녀는 항상 검은 정장을 입기 때문입니다. (다른 예: 빨간색과 빨간 넥타이, 보라색과 보라색 드레스)"] },
];
const LESSONS = CONTROL ? LESSONS_BEFORE : LESSONS_AFTER;

/** VOCA STEP 1 카드의 [낱말, 뜻] — voca-grid 읽개와 같은 칸, 뜻 줄까지. */
const VOCA_MEANINGS = `(async () => {
  const main = document.querySelector('main'); if (!main) return [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (re) => [...main.querySelectorAll('button')].find((b) => re.test((b.innerText || '').replace(/\\s+/g, ' ').trim()));
  const open = btn(/^전체 \\d+단어 펼쳐보기$/);
  if (open) { open.click(); await sleep(500); }
  const cards = [...main.querySelectorAll('div')].filter((d) => /(^|\\s)min-h-\\[96px\\](\\s|$)/.test(d.className) && d.children.length >= 3);
  const out = cards.map((c) => [(c.children[1].innerText || '').trim(), (c.children[2].innerText || '').replace(/\\s+/g, ' ').trim()]);
  if (open) { const close = btn(/전체 펼쳐보기 닫기/); if (close) { close.click(); await sleep(300); } }
  return out;
})()`;

(async () => {
  const result = { at: new Date().toISOString(), base: H.BASE, clips: null, lessons: [] };
  const browser = await H.startBrowser("prod-deploy-0923", PORT);
  try {
    const tab = await H.openTab(browser);

    // 세션 확인: 유료 강의가 이용권 화면이 아니라 강의로 열려야 한다
    const first = await H.load(tab, "/phonics/hv-51", { marker: H.MARKERS.phonics });
    const firstText = await tab.eval("(document.querySelector('main') || document.body).innerText").catch(() => "");
    const paywall = H.PAYWALL_RE.test(firstText);
    result.session = { rendered: first.rendered, paywall };
    console.log(`세션: hv-51 ${first.rendered ? "열림" : "안 열림"} · 이용권 화면 ${paywall ? "뜸 (멈춤)" : "안 뜸"}`);
    if (!first.rendered || paywall) throw new Error("감사용 프로필 세션으로 유료 강의가 열리지 않음 — 멈춤");

    // 1. 클립 114개
    const keys = CLIPS.map((c) => c.key);
    const got = await tab.eval(`(async () => {
      const keys = ${JSON.stringify(keys)};
      const out = {};
      let i = 0;
      async function worker() {
        for (;;) {
          const k = keys[i++]; if (!k) return;
          try {
            const r = await fetch('/audio/azure-ava/v1/' + k + '.mp3', { cache: 'no-store', credentials: 'include' });
            const buf = await r.arrayBuffer();
            out[k] = { status: r.status, type: r.headers.get('content-type'), bytes: buf.byteLength };
          } catch (e) { out[k] = { status: -1, type: null, bytes: 0, error: String(e) }; }
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      return out;
    })()`, { awaitPromise: true, timeout: 300000 }).catch((e) => ({ __error: e.message }));
    if (got.__error) throw new Error(`클립 요청 실패: ${got.__error}`);
    const rows = CLIPS.map((clip) => {
      const g = got[clip.key] || { status: null, type: null, bytes: null };
      return { round: clip.round, key: clip.key, text: clip.text, local: clip.bytes, status: g.status, type: g.type, bytes: g.bytes };
    });
    const ok200 = rows.filter((r) => r.status === 200).length;
    const okType = rows.filter((r) => /^audio\/mpeg/.test(r.type || "")).length;
    const sameSize = rows.filter((r) => r.bytes === r.local).length;
    const allOk = rows.filter((r) => r.status === 200 && /^audio\/mpeg/.test(r.type || "") && r.bytes === r.local);
    result.clips = { total: rows.length, status200: ok200, audioMpeg: okType, sameBytes: sameSize, allThree: allOk.length,
      byRound: Object.fromEntries(["1차", "2차"].map((k) => [k, { total: rows.filter((r) => r.round === k).length, ok: allOk.filter((r) => r.round === k).length }])),
      failures: rows.filter((r) => !allOk.includes(r)).map((r) => ({ ...r, text: r.text.slice(0, 60) })) };
    console.log(`클립: ${rows.length}개 중 200 ${ok200} · audio/mpeg ${okType} · 바이트 같음 ${sameSize} · 셋 다 ${allOk.length} (1차 ${result.clips.byRound["1차"].ok}/${result.clips.byRound["1차"].total} · 2차 ${result.clips.byRound["2차"].ok}/${result.clips.byRound["2차"].total})`);
    if (allOk.length !== rows.length) {
      for (const f of result.clips.failures.slice(0, 10)) console.log(`  실패 ${f.round} ${f.key} · ${f.status} · ${f.type} · 받은 ${f.bytes} / 로컬 ${f.local} 바이트 · ${f.text}`);
      if (!CONTROL) { console.log("클립이 하나라도 실패 — 강의 확인은 하지 않고 멈춤"); return; }
      console.log("(대조군: 실패가 정상 — 강의 확인으로 넘어감)");
    }

    // 2. 과정마다 바뀐 유료 강의 1곳
    for (const L of LESSONS) {
      const r = await H.load(tab, `/${L.course}/${L.id}`, { marker: H.MARKERS[L.course] });
      const text = await tab.eval("(document.querySelector('main') || document.body).innerText").catch(() => "");
      const rec = { course: L.course, id: L.id, rendered: r.rendered, paywall: H.PAYWALL_RE.test(text), checks: [] };
      const readAt = async (step, reader) => {
        if (step !== 1 || L.course === "ld") {
          const clicked = await H.click(tab, STEP_BTN(step), { settle: 1000 });
          if (!clicked.ok) return { error: `Step ${step} 버튼 못 누름` };
        }
        const expr = reader === "voca-meanings" ? VOCA_MEANINGS : C.READERS[reader];
        return { got: await tab.eval(expr, { awaitPromise: true, timeout: 30000 }).catch(() => null) };
      };
      const first = await readAt(L.step, L.reader);
      for (const w of L.want) {
        let seen;
        if (Array.isArray(w)) seen = (first.got || []).some(([word, meaning]) => word === w[0] && meaning === w[1]);
        else seen = (first.got || []).some((g) => C.key(g) === C.key(w));
        rec.checks.push({ where: `Step ${L.step} ${L.reader}`, want: Array.isArray(w) ? `${w[0]} = ${w[1]}` : w, seen, error: first.error || null });
      }
      if (L.alsoText) {
        const page = await tab.eval("(document.querySelector('main') || document.body).innerText").catch(() => "");
        for (const w of L.alsoText) rec.checks.push({ where: `Step ${L.step} 화면 글자`, want: w, seen: page.replace(/\s+/g, " ").includes(w) });
      }
      if (L.also) {
        const second = await readAt(L.also.step, L.also.reader);
        for (const w of L.also.want) rec.checks.push({ where: `Step ${L.also.step} ${L.also.reader}`, want: w, seen: (second.got || []).some((g) => C.key(g) === C.key(w)), error: second.error || null });
      }
      result.lessons.push(rec);
      console.log(`${L.course}/${L.id}: ${r.rendered ? "열림" : "안 열림"} · 이용권 화면 ${rec.paywall ? "뜸" : "없음"} · ${rec.checks.filter((c) => c.seen).length}/${rec.checks.length} 보임`);
      for (const c of rec.checks) console.log(`   ${c.seen ? "보임" : "안 보임"} [${c.where}] ${c.want.slice(0, 70)}${c.error ? ` (${c.error})` : ""}`);
    }
  } finally {
    fs.mkdirSync(H.OUT, { recursive: true });
    fs.writeFileSync(OUTFILE, JSON.stringify(result, null, 1));
    browser.proc.kill();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
