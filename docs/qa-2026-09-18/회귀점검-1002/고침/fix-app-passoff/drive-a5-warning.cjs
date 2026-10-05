// 회귀 점검 1002 고침 A5 — 화면에서: PASS-OFF ④ 영작 칸에 화면대로 한글로 쓴 답('I live in 서울.')을 치면 '영어 자판으로 바꿔
// 주세요' 경고가 없어야 하고, 표에 없는 한글('가나다')이면 있어야 한다. 한글 조합 중(ㅅ → 서 → 서울)에는 경고가 켜지지 않고,
// 조합이 끝난 뒤 표에 없는 한글이면 켜져야 한다. 로컬 개발 서버의 무료 pg01-1(이용권 없음) · 휴대폰 화면.
//   BASE=http://localhost:3322 node drive-a5-warning.cjs [--port 9906] [--label after|before]
// 깨기: 고치기 전 ComposeCard.tsx(HEAD 판)로 바꿔 띄운 앱에 같은 명령 → 첫 줄(서울)이 FAIL 이어야.
// 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
const path = require("path");
const H = require(path.resolve(__dirname, "../../../scripts/lib/harness.cjs"));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(arg("--port", "9906"));
const LABEL = arg("--label", "after");
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(H.BASE)) { console.error("로컬 BASE 만 — 운영에 대고 돌리지 않음"); process.exit(2); }

const WARN = "한글이 섞여 있어요";
const FIELD = `document.querySelector('textarea[aria-label="영작 답"]')`;
const warned = (tab) => tab.eval(`document.body.innerText.includes(${JSON.stringify(WARN)})`);

(async () => {
  const browser = await H.startBrowser("fix-app-passoff-a5", PORT, { fresh: true });
  const rows = [];
  let bad = 0;
  try {
    const tab = await H.openTab(browser, { clean: true });
    await H.setViewport(tab, "mobile");
    const r = await H.load(tab, "/passoff-grammar/pg01-1", { marker: H.MARKERS["passoff-grammar"] });
    if (!r.rendered) throw new Error("pg01-1 이 뜨지 않음");
    // Step 4 · 영작 탭
    const tabBtn = `document.querySelector('main [data-passoff-view] [data-step-tab="4"]') || document.querySelector('main [data-passoff-view] [data-step-tab="3"]')`;
    const c = await H.click(tab, tabBtn, { settle: 800 });
    if (!c.ok) throw new Error(`Step 4 탭을 못 누름: ${c.reason}`);
    if (!(await H.waitFor(tab, `!!${FIELD}`, 10000))) {
      // ④ 는 세트 시작 단추가 먼저일 수 있음
      const start = `[...document.querySelectorAll('button')].find((b) => /시작/.test(b.innerText || ''))`;
      await H.click(tab, start, { settle: 800 });
      if (!(await H.waitFor(tab, `!!${FIELD}`, 10000))) throw new Error("영작 칸을 못 찾음");
    }
    const check = async (name, expectWarn, act) => {
      await act();
      await H.sleep(300);
      const w = await warned(tab);
      const ok = w === expectWarn;
      if (!ok) bad++;
      rows.push({ name, expectWarn, warned: w, status: ok ? "PASS" : "FAIL" });
      console.log(`${ok ? "PASS" : "FAIL"}  ${name} — 경고 ${w ? "있음" : "없음"}(기대 ${expectWarn ? "있음" : "없음"})`);
    };
    // 1 화면대로 한글로 쓴 맞는 답(표의 낱말 서울)
    await check("한글 꼴 'I live in 서울.' 붙여 넣기", false, () => H.type(tab, FIELD, "I live in 서울."));
    // 2 표에 없는 한글
    await check("표에 없는 한글 'I live in 가나다.'", true, () => H.type(tab, FIELD, "I live in 가나다."));
    // 3 다시 영어만 — 경고가 꺼져야
    await check("영어만 'I live in Seoul.'", false, () => H.type(tab, FIELD, "I live in Seoul."));
    // 4 한글 조합 중(ㅅ · 서 · 서우): 경고가 켜지지 않아야 — 조합을 끝내 '서울' 이 되면 없음
    await H.type(tab, FIELD, "I live in ");
    await check("조합 중 'ㅅ'", false, () => tab.send("Input.imeSetComposition", { text: "ㅅ", selectionStart: 1, selectionEnd: 1 }));
    await check("조합 중 '서우'", false, () => tab.send("Input.imeSetComposition", { text: "서우", selectionStart: 2, selectionEnd: 2 }));
    await check("조합 끝 '서울'", false, () => tab.send("Input.insertText", { text: "서울" }));
    // 5 조합으로 친 표에 없는 한글 — 조합이 끝나면 경고
    await H.type(tab, FIELD, "I live in ");
    await check("조합 끝 '가나'(표에 없음)", true, async () => {
      await tab.send("Input.imeSetComposition", { text: "가", selectionStart: 1, selectionEnd: 1 });
      await tab.send("Input.insertText", { text: "가나" });
    });
    // 6 한글 꼴로 '확인' — 채점은 정답(맞았어요)이 아니어도 됨(첫 문장이 이 문장이 아닐 수 있음): '한글' 판정으로 거절되지 않는지만
    await H.type(tab, FIELD, "I live in 서울.");
    const btn = `[...document.querySelectorAll('main section[aria-labelledby="passoff-step-4"] button')].find((b) => (b.innerText || '').trim() === '확인')`;
    await H.click(tab, btn, { settle: 800 });
    const after = await tab.eval(`(() => { const t = document.body.innerText; return { warn: t.includes(${JSON.stringify(WARN)}), graded: /맞았어요|틀린 자리를 표시했어요/.test(t) }; })()`);
    const ok6 = !after.warn && after.graded;
    if (!ok6) bad++;
    rows.push({ name: "한글 꼴로 확인 → 채점됨 · 경고 없음", ...after, status: ok6 ? "PASS" : "FAIL" });
    console.log(`${ok6 ? "PASS" : "FAIL"}  한글 꼴로 '확인' → 채점됨 ${after.graded} · 경고 ${after.warn}`);
  } catch (e) {
    bad++;
    console.log(`BLOCKED ${e.message}`);
  } finally {
    try { browser.proc.kill(); } catch {}
  }
  require("fs").writeFileSync(path.join(__dirname, `drive-a5-warning-${LABEL}.json`), JSON.stringify({ base: H.BASE, at: new Date().toISOString(), label: LABEL, rows }, null, 1));
  console.log(bad ? `FAIL ${bad}` : "PASS");
  process.exit(bad ? 1 : 0);
})();
