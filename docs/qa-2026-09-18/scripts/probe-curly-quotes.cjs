#!/usr/bin/env node
/**
 * 운영 재점검 #2 / A-5 — 둥근따옴표(GRADE-01) 를 운영 화면에서 직접 타이핑해 본다.
 *
 * 아이폰·맥 기본 키보드가 넣는 “ ” 로 정답을 써서, 화면의 채점기가 정답으로 처리하는지
 * 본다. 비교를 위해 곧은 " 도 같이 친다. 이미 등록된 감사용 프로필을 쓰고, 상태를
 * 바꾸는 API 는 부르지 않는다.
 *
 *   node probe-curly-quotes.cjs [--port 9580]
 * Output: out/curly-quotes-prod.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9580));
const OUT = path.join(__dirname, "../out");
const REPO = H.REPO;

/** 큰따옴표가 든 모범 답안을 데이터에서 찾는다 */
function itemsWithQuotes() {
  const found = [];
  for (const course of ["grammar2", "grammar1"]) {
    const dir = path.join(REPO, "content/lessons", course);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      for (const b of d.blocks || []) {
        if (b.type !== "sentences") continue;
        for (const it of b.items || []) {
          if (typeof it.text === "string" && /"/.test(it.text) && /[A-Za-z]/.test(it.text)) {
            found.push({ course, id: f.replace(/\.json$/, ""), n: String(it.n), text: it.text });
          }
        }
      }
    }
  }
  return found;
}

const all = itemsWithQuotes();
const targets = all.slice(0, 4);

const curly = (s) => {
  let open = true;
  return s.replace(/"/g, () => (open = !open) ? "”" : "“");
};

(async () => {
  console.log(`큰따옴표가 든 모범 답안: ${all.length}문항 — 그중 ${targets.length}문항을 운영에서 직접 타이핑\n`);
  const browser = await H.startBrowser("probe-curly", PORT);
  const tab = await H.openTab(browser);
  const rows = [];

  for (const t of targets) {
    await H.load(tab, `/${t.course}/${t.id}`, { marker: null });
    const paywalled = await tab.eval(`/${H.PAYWALL_RE.source}/.test((document.querySelector('main')||{}).innerText||'')`);
    if (paywalled) { rows.push({ ...t, paywalled: true }); console.log(`${t.id} #${t.n}: 잠금 화면`); continue; }

    for (const [label, answer] of [["곧은 따옴표", t.text], ["둥근 따옴표", curly(t.text)]]) {
      // 해당 번호의 입력칸을 찾아 답을 넣고 채점시킨다
      const verdict = await tab.eval(`(async () => {
        const inputs = [...document.querySelectorAll('input[type=text], textarea')].filter((i) => i.offsetParent);
        const box = inputs[${Number(t.n) - 1}] || inputs[0];
        if (!box) return { error: 'no input' };
        const setter = Object.getOwnPropertyDescriptor(box.constructor.prototype, 'value').set;
        setter.call(box, ${JSON.stringify(answer)});
        box.dispatchEvent(new Event('input', { bubbles: true }));
        box.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 400));
        const row = box.closest('li, div');
        const submit = [...document.querySelectorAll('button')].find((b) => /채점|확인|정답/.test(b.innerText || '') && b.offsetParent);
        if (submit) { submit.click(); await new Promise((r) => setTimeout(r, 900)); }
        const scope = (row && row.innerText) || document.querySelector('main').innerText;
        return { text: scope.slice(0, 400) };
      })()`);
      const text = String(verdict.text || "");
      const grade = /✓\s*정답|100점/.test(text) ? "정답" : /부분/.test(text) ? "부분점수" : /오답|✗/.test(text) ? "오답" : "판정 못 읽음";
      rows.push({ ...t, variant: label, typed: answer, grade, seen: text.replace(/\s+/g, " ").slice(0, 120) });
      console.log(`${t.course}/${t.id} #${t.n}  ${label.padEnd(8)} → ${grade}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "curly-quotes-prod.json"), JSON.stringify({ at: new Date().toISOString(), totalItemsWithQuotes: all.length, rows }, null, 1));
  const curls = rows.filter((r) => r.variant === "둥근 따옴표");
  console.log(`\n둥근따옴표 ${curls.length}회 시도 · 정답 ${curls.filter((r) => r.grade === "정답").length} · 부분점수 ${curls.filter((r) => r.grade === "부분점수").length} · 오답 ${curls.filter((r) => r.grade === "오답").length} · 판정 못 읽음 ${curls.filter((r) => r.grade === "판정 못 읽음").length}`);
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
