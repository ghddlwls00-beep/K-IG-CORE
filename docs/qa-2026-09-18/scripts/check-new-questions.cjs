#!/usr/bin/env node
/**
 * 2026-09-28 새 문제(LISTENING 실전 · READING 이해 — 학습법-화면-0927/새-문제-설계.md) 기계 검사.
 * 문제 파일: docs/qa-2026-09-18/학습법-화면-0927/새-문제/{ld,reading}/<id>.json (시범은 새-문제/pilot/…)
 *   {"v":1,"lesson":"d001","course":"ld","questions":[{id,type,prompt,options[4],answer,evidence[],note}]}
 * 보는 것(하나라도 걸리면 exit 1):
 *   모양(보기 4 · 서로 다름 · answer 0~3 · 근거 줄이 글 안 · 문항 수 = 설계 규칙) · 보기가 영어 줄을 그대로 옮김 0 ·
 *   정답이 혼자 가장 긴 비율 ≤ 35%(시범 64% — 가장 긴 것만 골라도 맞던 치우침) · 정답 자리 A~D 각 15 ~ 35% ·
 *   정답의 길이 순위(가장 긴 것 · 두 번째 · 세 번째 · 가장 짧은 것 — 같은 길이는 나눔) 각 15 ~ 35% ·
 *   오답 하나만 나머지보다 5자 이상 긴 문항 ≤ 10% ·
 *   겹침 요령 — '다른 보기와 가장 많이 겹치는 것 고르기'(오답을 정답의 한 부분만 바꿔 만들면 정답이 가운데가 됨) ·
 *   '가장 덜 겹치는 것 고르기' · '물음과 가장 많이 겹치는 것 고르기'(두 글자 묶음 겹침 · 같으면 나눔) 각 15 ~ 35% ·
 *   물음 끝맺음은 '…것은?' / '…은?' 꼴(‘…요?’ 0) · 문장 보기 끝 마침표 0 · 같은 강의 안 같은 물음 0
 *   LISTENING 칩 숫자: 1단계는 듣기 전에 강의의 '미리 알아 둘 이름 · 숫자' 칩(강의 파일 hints — 화면과 같은 방법으로 나눔)을
 *   보여 줌. 정답 보기의 숫자가 모두 칩에 있는데 칩 숫자만으로 된 보기가 4개보다 적으면(칩에 맞춰 고르면 좁혀짐) 걸림 —
 *   이름 · 장소 · 직업 같은 낱말 칩은 기계로 못 봄(영어 칩 ↔ 한국어 보기) — 대조 일꾼 몫.
 *   (자리 · 길이 순위 · 튀는 보기는 문항 12개 이상일 때 — 묶음 하나(16 ~ 21문항)에도 걸림)
 *   2026-09-28 길이 순위 · 튀는 보기 · 겹침 요령 더함: 묶음 1(327문항)이 '혼자 가장 긴 것' 0% 로 통과했지만 쓰는 일꾼이 오답 하나를 늘려
 *   정답을 두 번째로 긴 보기로 만든 문항이 45% — '두 번째로 긴 것 고르기'가 찍기(25%)보다 훨씬 잘 맞던 것을 이 검사가 못 봤음.
 *   같은 때 READING 128문항에서 '다른 보기와 가장 많이 겹치는 것 고르기'가 42%.
 *   같은 날 화면에 붙여 보니 LISTENING 표본 20문항 중 6문항이 칩만 보고 맞힐 수 있었음(1825년 · 17마일 · 60세 · 10,000달러 ·
 *   'dentist' · 아침 메뉴) — 칩 숫자 검사를 더함.
 *   node check-new-questions.cjs [--dir <폴더>] [--break length|shape|evidence|rank|outlier|converge|chips]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DIR = path.resolve(REPO, arg("--dir", "docs/qa-2026-09-18/학습법-화면-0927/새-문제"));
const BREAK = arg("--break", "");
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const ldLines = (id) => {
  const v = scripts[id] || scripts[id.replace(/-1$/, "")];
  return Array.isArray(v) ? v : v && Array.isArray(v.rows) ? v.rows : [];
};
// LISTENING Step 1's chips — LdLearningView hintChunks, the same split
const ldChips = (id) => {
  const f = path.join(REPO, "content/lessons/ld", `${id}.json`);
  if (!fs.existsSync(f)) return [];
  const hints = (JSON.parse(fs.readFileSync(f, "utf8")).blocks || []).find((b) => b.type === "hints");
  if (!hints || !hints.text) return [];
  return hints.text
    .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
    .map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
    .filter((c, i, all) => c && all.indexOf(c) === i);
};
const numbersOf = (s) => (String(s).replace(/(\d),(?=\d{3}(?!\d))/g, "$1").match(/\d+/g) || []).map((n) => String(Number(n)));
const rdLines = (id) => {
  const f = path.join(REPO, "content/lessons/reading", `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).readingSentences || [] : [];
};
const problems = [];
const bad = (where, what) => problems.push(`${where}: ${what}`);
// 겹침 요령: 두 글자 묶음(띄어쓰기 뺌)의 자카드 겹침 — 사람이 '보기끼리 같은 말이 많다'고 느끼는 것을 대신 잼
const grams = (s) => {
  const t = String(s).replace(/\s+/g, "");
  const g = new Set();
  for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
  return g;
};
const jac = (a, b) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
};
// 가장 큰(작은) 값의 보기를 고를 때 맞힐 몫 — 같은 값이 k개면 1/k
const pickShare = (vals, answer, want) => {
  const best = want === "max" ? Math.max(...vals) : Math.min(...vals);
  const idx = vals.map((v, i) => [v, i]).filter(([v]) => Math.abs(v - best) < 1e-9).map(([, i]) => i);
  return idx.includes(answer) ? 1 / idx.length : 0;
};
const tricks = { central: 0, odd: 0, echo: 0 };
let questions = 0, longest = 0, outliers = 0;
const pos = [0, 0, 0, 0];
const rank = [0, 0, 0, 0]; // 정답의 길이 순위(0 = 가장 긴 것) — 같은 길이 k개면 그 자리들에 1/k 씩
for (const course of ["ld", "reading"]) {
  const dir = path.join(DIR, course);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const lines = course === "ld" ? ldLines(d.lesson) : rdLines(d.lesson);
    const n = lines.length;
    const want = course === "ld" ? (n <= 6 ? 2 : 3) : 2;
    if (!n) bad(d.lesson, "글을 찾지 못함");
    if ((d.questions || []).length !== want) bad(d.lesson, `문항 ${d.questions.length}(기대 ${want})`);
    const english = new Set(lines.map((l) => String(l.en || l.english || "").trim().toLowerCase()).filter(Boolean));
    const chipNumbers = new Set(course === "ld" ? ldChips(d.lesson).flatMap(numbersOf) : []);
    const prompts = new Set();
    for (const q of d.questions || []) {
      questions++;
      const where = `${d.lesson} ${q.id}`;
      const opts = BREAK === "shape" && questions === 1 ? q.options.slice(0, 3) : q.options;
      if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts).size !== 4) bad(where, "보기 4개 · 서로 다름 아님");
      if (!(q.answer >= 0 && q.answer <= 3)) bad(where, `answer ${q.answer}`);
      const ev = BREAK === "evidence" && questions === 1 ? [n + 5] : q.evidence || [];
      if (!ev.length || ev.some((e) => !(e >= 1 && e <= n))) bad(where, `근거 줄 ${JSON.stringify(ev)} (글 ${n}줄)`);
      if (opts.some((o) => english.has(String(o).trim().toLowerCase()))) bad(where, "보기가 영어 줄을 그대로 옮김");
      if (/요\?\s*$/.test(q.prompt)) bad(where, "물음 끝이 '…요?'");
      if (opts.some((o) => /[.。]\s*$/.test(String(o)))) bad(where, "보기 끝 마침표");
      if (prompts.has(q.prompt)) bad(where, "같은 강의 안 같은 물음");
      prompts.add(q.prompt);
      if (course === "ld") {
        // an option 'matches the chips' when it has a number and every number in it is a chip number
        const chipMatch = (o) => {
          const ns = numbersOf(o);
          return ns.length > 0 && ns.every((n) => chipNumbers.has(n));
        };
        const matching = opts.filter(chipMatch).length;
        const giveaway = chipMatch(opts[q.answer]) && matching < opts.length;
        if (giveaway || (BREAK === "chips" && questions === 1)) bad(where, `칩 숫자로 좁혀짐 — 정답 '${opts[q.answer]}'의 숫자가 칩에 있고 칩 숫자 보기는 ${matching}/${opts.length}개 (칩: ${[...chipNumbers].join(" ") || "-"})`);
      }
      pos[q.answer] = (pos[q.answer] || 0) + 1;
      const lens = opts.map((o) => String(o).length);
      const a = lens[q.answer];
      const strictlyLongest = lens.every((l, i) => i === q.answer || l < a);
      if (strictlyLongest || (BREAK === "length" && questions % 2 === 0)) longest++;
      const longer = lens.filter((l, i) => i !== q.answer && l > a).length;
      const tied = lens.filter((l) => l === a).length;
      if (BREAK === "rank") rank[1]++; // 깨기: 모든 문항의 정답이 두 번째로 긴 보기인 것처럼
      else for (let r = longer; r < longer + tied; r++) rank[r] += 1 / tied;
      const sorted = [...lens].sort((x, y) => y - x);
      if (sorted[0] - sorted[1] >= 5 || (BREAK === "outlier" && questions % 5 === 0)) outliers++;
      const g = opts.map(grams);
      const sim = g.map((x, i) => g.reduce((s, y, j) => (i === j ? s : s + jac(x, y)), 0));
      tricks.central += BREAK === "converge" ? 1 : pickShare(sim, q.answer, "max"); // 깨기: 정답이 늘 가운데인 것처럼
      tricks.odd += pickShare(sim, q.answer, "min");
      const pg = grams(q.prompt);
      tricks.echo += pickShare(g.map((x) => jac(x, pg)), q.answer, "max");
    }
  }
}
const share = questions ? longest / questions : 0;
if (questions && share > 0.35) bad("전체", `정답이 혼자 가장 긴 문항 ${longest}/${questions} (${Math.round(share * 100)}% — 35% 넘음)`);
const RANKS = ["가장 긴 것", "두 번째로 긴 것", "세 번째로 긴 것", "가장 짧은 것"];
for (let i = 0; i < 4; i++) {
  const s = questions ? pos[i] / questions : 0;
  if (questions >= 12 && (s < 0.15 || s > 0.35)) bad("전체", `정답 자리 ${"ABCD"[i]} ${Math.round(s * 100)}%`);
  const r = questions ? rank[i] / questions : 0;
  if (questions >= 12 && (r < 0.15 || r > 0.35)) bad("전체", `정답이 ${RANKS[i]}인 문항 ${Math.round(r * 100)}% (15 ~ 35% 밖 — ${r > 0.35 ? `'${RANKS[i]}만 고르기'` : `'${RANKS[i]}은 빼고 찍기'`}가 찍기보다 잘 맞음)`);
}
const outShare = questions ? outliers / questions : 0;
if (questions >= 12 && outShare > 0.1) bad("전체", `보기 하나만 나머지보다 5자 이상 긴 문항 ${outliers}/${questions} (${Math.round(outShare * 100)}% — 10% 넘음)`);
const TRICKS = { central: "'다른 보기와 가장 많이 겹치는 것 고르기'", odd: "'가장 덜 겹치는 것 고르기'", echo: "'물음과 가장 많이 겹치는 것 고르기'" };
for (const [k, label] of Object.entries(TRICKS)) {
  const s = questions ? tricks[k] / questions : 0;
  if (questions >= 12 && (s < 0.15 || s > 0.35)) bad("전체", `${label} ${Math.round(s * 100)}% (15 ~ 35% 밖 — ${s > 0.35 ? "그렇게 고르면" : "그 보기를 빼고 찍으면"} 찍기보다 잘 맞음)`);
}
const pct = (x) => `${Math.round((x / (questions || 1)) * 100)}%`;
console.log(`${path.relative(REPO, DIR)} · 문항 ${questions} · 정답이 혼자 가장 긴 것 ${longest}(${Math.round(share * 100)}%) · 자리 A ${pos[0]} B ${pos[1]} C ${pos[2]} D ${pos[3]} · 길이 순위 ${rank.map(pct).join("/")} · 튀게 긴 보기 ${outliers} · 겹침 가운데 ${pct(tricks.central)} 외톨이 ${pct(tricks.odd)} 물음 ${pct(tricks.echo)}${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
for (const p of problems.slice(0, 30)) console.log("  - " + p);
if (problems.length > 30) console.log(`  … ${problems.length - 30} 더`);
console.log(problems.length ? `FAIL ${problems.length}` : "PASS");
process.exit(problems.length ? 1 : 0);
