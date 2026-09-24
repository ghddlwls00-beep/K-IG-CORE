#!/usr/bin/env node
/**
 * 힌트 칩 검사가 "실패할 수 있는 검사" 인지 확인하기 위한 대조 실험용 탐침.
 *
 * 스윕의 content 검사는 모든 단계·모든 문장의 innerText 를 한 덩어리로 합친 뒤
 * 기대 문자열이 그 안에 있는지만 본다. 그래서 칩이 화면에서 사라져도 같은 글자가
 * 다른 곳(받아쓰기 정답, 다른 문장의 힌트 상자)에 있으면 통과한다.
 *
 * 이 탐침은 힌트 상자 안의 칩만 문장별로 세어서, 앱이 실제로 무엇을 그리는지 본다.
 *
 *   BASE=http://localhost:3211 node probe-hint-chips.cjs --ids d001 [--port 9680]
 * Output: out/hint-chips.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const IDS = arg("--ids", "d001").split(",");
const PORT = Number(arg("--port", 9680));
const OUT = path.join(__dirname, "../out");

/** 힌트 상자 = "고유 명사 · 숫자 참조" 라벨을 가진 상자. 그 안의 span 이 칩이다. */
const CHIPS = `(() => {
  const box = [...document.querySelectorAll('main div')].find((d) =>
    /고유 명사 · 숫자( · 어려운 낱말)? 참조/.test(d.innerText || '') && d.querySelectorAll('p span').length);
  if (!box) return { box: false, chips: [] };
  return { box: true, chips: [...box.querySelectorAll('p span')].map((s) => s.innerText.trim()) };
})()`;

const SENTENCE_NO = `(() => {
  const m = (document.querySelector('main') || {}).innerText || '';
  const hit = m.match(/(\\d+)\\s*\\/\\s*(\\d+)\\s*문장/) || m.match(/문장\\s*(\\d+)\\s*\\/\\s*(\\d+)/);
  return hit ? hit[0] : null;
})()`;

const NEXT = `[...document.querySelectorAll('main button')].find((b) => /다음 문장/.test(b.innerText || '') && !b.disabled && (b.offsetParent || b.getClientRects().length))`;
const PREV = `[...document.querySelectorAll('main button')].find((b) => /이전 문장/.test(b.innerText || '') && !b.disabled && (b.offsetParent || b.getClientRects().length))`;

(async () => {
  const browser = await H.startBrowser("hint-chips", PORT);
  const tab = await H.openTab(browser);
  const out = [];

  for (const id of IDS) {
    const exp = E.expected("ld", id);
    const want = (exp.texts || []).filter((t) => t.kind === "hint-chip").map((t) => t.text);
    await H.load(tab, `/ld/${id}`, { marker: null });
    await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /탭-딕테이션/.test(b.innerText || '') && (b.offsetParent || b.getClientRects().length))`, { settle: 900 });
    // 1번 문장으로 되감기
    for (let i = 0; i < 40; i++) { const r = await H.click(tab, PREV, { settle: 220 }); if (!r.ok) break; }

    const rows = [];
    for (let i = 0; i < 40; i++) {
      const seen = await tab.eval(CHIPS);
      rows.push({ sentence: i + 1, label: await tab.eval(SENTENCE_NO), box: seen.box, chips: seen.chips });
      const r = await H.click(tab, NEXT, { settle: 260 });
      if (!r.ok) break;
    }

    const shown = new Set(rows.flatMap((r) => r.chips));
    const neverShown = want.filter((w) => ![...shown].some((s) => s === w));
    out.push({ id, expectedChips: want, sentencesWalked: rows.length, shown: [...shown], neverShown, rows });
    console.log(`${id} · 문장 ${rows.length}개 · 기대 칩 ${want.length} · 화면에 실제로 그려진 칩 ${shown.size} · 한 번도 안 나온 칩 ${neverShown.length}`);
    for (const r of rows) console.log(`   문장 ${String(r.sentence).padStart(2)} ${r.box ? "상자O" : "상자X"} 칩 ${String(r.chips.length).padStart(2)}  ${JSON.stringify(r.chips)}`);
    if (neverShown.length) console.log(`   ▸ 화면에 없는데 기대값에는 있는 칩: ${JSON.stringify(neverShown)}`);
  }

  fs.writeFileSync(path.join(OUT, "hint-chips.json"), JSON.stringify({ at: new Date().toISOString(), base: H.BASE, out }, null, 1));
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
