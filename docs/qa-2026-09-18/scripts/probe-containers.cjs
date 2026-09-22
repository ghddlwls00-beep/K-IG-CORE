#!/usr/bin/env node
/**
 * lib/containers.cjs 의 읽개(reader)가 실제 화면에서 제 칸을 찾는지 확인하는 탐침.
 * 강의마다 해당 단계를 열고 읽개를 돌려, 읽힌 글자 수와 기대 글자 대비 일치 수를 적는다.
 * 기대 글자와 하나도 안 맞으면 선택자가 틀린 것이다 — 그러면 검사는 전부 "없음" 으로
 * 요란하게 실패하도록 짜여 있지만, 전수 스윕을 돌리기 전에 여기서 먼저 잡는다.
 *
 *   BASE=http://localhost:3211 node probe-containers.cjs phonics:mv1-01 grammar1:gh1-006 ...
 */
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");
const C = require("./lib/containers.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9704));
const targets = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--port");

(async () => {
  const browser = await H.startBrowser("proof-probe", PORT);
  const tab = await H.openTab(browser);
  for (const t of targets) {
    const [course, id] = t.split(":");
    const exp = E.expected(course, id);
    await H.load(tab, `/${course}/${id}`, { marker: null });
    for (const c of C.CONTAINERS[course] || []) {
      const clicked = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => ${c.step}.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))`, { settle: 900 });
      const got = (await tab.eval(C.READERS[c.id]).catch((e) => `ERR ${e.message}`)) || [];
      const want = exp.texts.filter((x) => C.containerFor(course, x) === c);
      const keys = new Set((Array.isArray(got) ? got : []).map(C.key));
      const hit = want.filter((x) => keys.has(C.key(x.text)));
      const miss = want.filter((x) => !keys.has(C.key(x.text)));
      console.log(`${course}/${id} · ${c.id} · 단계 ${clicked.ok ? "열림" : "못 엶"} · 읽은 글자 ${Array.isArray(got) ? got.length : got} · 기대 ${want.length} 중 일치 ${hit.length}`);
      for (const m of miss.slice(0, 3)) console.log(`     없음: ${JSON.stringify(m.text.slice(0, 70))}`);
      if (Array.isArray(got) && !hit.length) console.log(`     읽은 것 예: ${JSON.stringify(got.slice(0, 3))}`);
    }
  }
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
