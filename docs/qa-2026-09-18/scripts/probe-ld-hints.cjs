#!/usr/bin/env node
/**
 * 운영 재점검 #2 / A-3 — 받아쓰기 힌트 상자가 운영 화면에 실제로 뜨는가.
 *
 * 강의마다 STEP 2 로 들어가 문장을 하나씩 넘기며, 힌트 상자가 떴는지와 그 내용이
 * "문장별 짝짓기" 인지 "안전장치(강의 힌트 전체)" 인지 센다. 무료 강의만 보면 유료가
 * 검증되지 않으므로 유료 강의도 포함한다 — 이미 등록된 감사용 프로필을 쓰고, 새 기기를
 * 등록하거나 이용권 코드를 입력하지 않는다.
 *
 * 함께 확인: 힌트가 없어 지시문을 바꾼 23강에서 그 지시문이 화면에 나오는가.
 *
 *   node probe-ld-hints.cjs [--ids d001,d002] [--port 9578]
 * Output: out/ld-hints-prod.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9578));
const OUT = path.join(__dirname, "../out");
const REPO = H.REPO;

const DEFAULT_IDS = [
  // 무료
  "d001", "d002",
  // 유료 — 힌트 있음
  "d006", "d007", "d019", "d024", "d058", "d100", "d150", "d192", "d193", "d200", "d250", "d270",
  // 유료 — 힌트 없음(지시문을 바꾼 23강 중 5개 이상)
  "d177", "d180", "d183", "d186", "d187", "d191",
];
const IDS = arg("--ids", null) ? arg("--ids", "").split(",") : DEFAULT_IDS;

const lessonOf = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));

/** 화면에서 읽은 힌트 조각들이 강의 힌트 '전체' 인지(=안전장치) 판단하려면 전체 목록이 필요하다 */
const chunksOf = (text) =>
  String(text || "").split(/,|\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/[.,]+$/, "").trim()).filter(Boolean);

const READ_STEP2 = `(() => {
  const main = document.querySelector('main');
  if (!main) return { error: 'no main' };
  const text = main.innerText;
  // 라벨 span 바로 다음의 <p> 안에 칩이 들어 있다. 바깥 div 를 집으면 카드 전체의
  // span 을 다 끌어와 개수가 틀어지므로, 라벨을 가진 span 에서 형제 <p> 로 간다.
  const label = [...main.querySelectorAll('span')].find((s) => /고유 명사\\s*·\\s*숫자 참조/.test(s.innerText || ''));
  const chips = label && label.parentElement ? label.parentElement.querySelector('p') : null;
  const box = Boolean(label);
  let items = [];
  if (chips) items = [...chips.children].map((s) => (s.innerText || '').trim()).filter(Boolean);
  const counter = (text.match(/SENTENCE\\s+(\\d+)\\s+OF\\s+(\\d+)/i) || []);
  return { hasBox: box, items, index: Number(counter[1] || 0), total: Number(counter[2] || 0), instructionShown: /고유 명사, 숫자, 어려운 단어를 참조하면서|잘 듣고 영어로 받아쓰기를 하세요/.test(text) };
})()`;

(async () => {
  const browser = await H.startBrowser("probe-ld-hints", PORT);
  const tab = await H.openTab(browser);
  const rows = [];

  for (const id of IDS) {
    const lesson = lessonOf(id);
    const hintsBlock = (lesson.blocks || []).find((b) => b.type === "hints" && String(b.text || "").trim());
    const allChunks = hintsBlock ? chunksOf(hintsBlock.text) : [];
    const rowCount = (scripts[id] || []).length;

    await H.load(tab, `/ld/${id}`, { marker: null });
    const paywalled = await tab.eval(`/${H.PAYWALL_RE.source}/.test(document.querySelector('main') ? document.querySelector('main').innerText : '')`);
    if (paywalled) { rows.push({ id, paywalled: true }); console.log(`${id}: 잠금 화면`); continue; }

    // STEP 2 로 이동
    const wentStep2 = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /탭-딕테이션/.test(b.innerText || '') && b.offsetParent)`, { settle: 1200 });
    const first = await tab.eval(READ_STEP2);

    const sentences = [];
    let guard = 0;
    for (let i = 0; i < rowCount && guard < 40; i++) {
      guard++;
      const view = await tab.eval(READ_STEP2);
      if (view.error) break;
      const isFallback = view.hasBox && allChunks.length > 0 && view.items.length === allChunks.length;
      sentences.push({ n: view.index || i + 1, hasBox: view.hasBox, count: view.items.length, fallback: isFallback, items: view.items.slice(0, 6) });
      const next = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /다음 문장/.test(b.innerText || '') && b.offsetParent && !b.disabled)`, { settle: 700 });
      if (!next) break;
    }

    const withBox = sentences.filter((s) => s.hasBox).length;
    const fallback = sentences.filter((s) => s.fallback).length;
    rows.push({ id, hasHintsData: Boolean(hintsBlock), hintChunks: allChunks.length, rowCount, seen: sentences.length, withBox, matched: withBox - fallback, fallback, instructionShown: first.instructionShown, wentStep2, sentences });
    console.log(`${id}  힌트데이터 ${hintsBlock ? "있음" : "없음"} · 본 문장 ${sentences.length}/${rowCount} · 상자 ${withBox} (짝짓기 ${withBox - fallback} · 안전장치 ${fallback}) · 지시문 화면표시 ${first.instructionShown ? "예" : "아니오"}`);
  }

  const withData = rows.filter((r) => r.hasHintsData && !r.paywalled);
  const noBoxAtAll = withData.filter((r) => r.withBox === 0);
  const summary = {
    lessonsProbed: rows.filter((r) => !r.paywalled).length,
    paywalled: rows.filter((r) => r.paywalled).length,
    sentencesSeen: rows.reduce((s, r) => s + (r.seen || 0), 0),
    sentencesWithBox: rows.reduce((s, r) => s + (r.withBox || 0), 0),
    sentencesMatched: rows.reduce((s, r) => s + (r.matched || 0), 0),
    sentencesFallback: rows.reduce((s, r) => s + (r.fallback || 0), 0),
    lessonsWithHintsButNoBox: noBoxAtAll.length,
    lessonsWithHintsButNoBoxIds: noBoxAtAll.map((r) => r.id),
    instructionShownAnywhere: rows.filter((r) => r.instructionShown).length,
  };
  fs.writeFileSync(path.join(OUT, "ld-hints-prod.json"), JSON.stringify({ at: new Date().toISOString(), summary, rows }, null, 1));
  console.log(`\n${JSON.stringify(summary, null, 1)}`);
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
