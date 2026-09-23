#!/usr/bin/env node
/**
 * LISTENING 힌트에 칭호·머리글자를 붙여 쓴 곳(Dr.Smith · Mrs.Wenger · D.W.Griffith · P.Hickman) — 대본은 'Dr. Smith' 로 띄어 쓴다.
 * 입력 채점(normalizeTyped)은 기호를 지운 뒤 비교하므로, 칩을 보고 'Dr.Smith' 라고 치면 'drsmith' ≠ 'dr smith' 로 **틀림**이 된다.
 * 힌트를 대본과 같게 띄어 쓰면 칩이 'Dr' / 'Smith …' 로 갈라지는데(마침표+공백에서 자름), 'Dr' 칩은 두 글자라 행에 붙지 않고
 * 이름 칩만 뜬다 — 학습자는 소리대로 'Dr. Smith' 를 쳐서 맞는다.
 *
 *   node ld-hint-glued-titles.cjs            목록 + 대본에 띄어 쓴 꼴이 있는지
 *   node ld-hint-glued-titles.cjs --apply    대본에 띄어 쓴 꼴이 있는 것만 띄어 씀
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DIR = path.join(REPO, "content/lessons/ld");
const S = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const APPLY = process.argv.includes("--apply");
const esc = (s) => JSON.stringify(s).slice(1, -1);
// 마침표 뒤에 공백 없이 대문자가 오는 곳: Dr.Smith · D.W.Griffith · P.Hickman · Mr.and
const GLUED = /\b([A-Z][a-z]{0,3}|[A-Z])\.(?=[A-Z]|and\b)/g;
let lessons = 0, spots = 0, fixed = 0, noScript = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^d\d{3}\.json$/.test(f)).sort()) {
  const id = f.slice(0, -5);
  const raw = fs.readFileSync(path.join(DIR, f), "utf8");
  const L = JSON.parse(raw);
  const h = (L.blocks || []).find((b) => b.type === "hints");
  if (!h || !GLUED.test(h.text)) continue;
  GLUED.lastIndex = 0;
  lessons++;
  const script = (S[id] || []).map((r) => r.en).join(" ");
  const next = h.text.replace(GLUED, (m, word, off) => {
    spots++;
    const spaced = `${word}. `;
    // 대본에 이 칭호를 띄어 쓴 꼴이 있을 때만(예: 'Dr. ' 가 대본에 있음)
    if (script.includes(`${word}. `)) { fixed++; return spaced; }
    noScript++;
    return m;
  });
  console.log(`${id}: ${h.text.match(GLUED).join(" ")}  →  ${next === h.text ? "(그대로 — 대본에 띄어 쓴 꼴 없음)" : next}`);
  if (APPLY && next !== h.text) {
    const from = `"text": "${esc(h.text)}"`;
    if (raw.split(from).length !== 2) throw new Error(`${id}: hints 글이 한 번이 아님`);
    const out = raw.replace(from, () => `"text": "${esc(next)}"`);
    const want = JSON.parse(JSON.stringify(L));
    want.blocks.find((b) => b.type === "hints").text = next;
    if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(want)) throw new Error(`${id}: 모양이 기대와 다름`);
    fs.writeFileSync(path.join(DIR, f), out);
  }
}
console.log(`\n강의 ${lessons} · 붙여 쓴 곳 ${spots} · 대본에 띄어 쓴 꼴이 있어 고칠 곳 ${fixed} · 대본에 없음 ${noScript}${APPLY ? " — 씀" : " (미리보기)"}`);
