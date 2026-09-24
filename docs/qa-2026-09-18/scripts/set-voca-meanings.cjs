#!/usr/bin/env node
/**
 * VOCA 사전(content/voca_dictionary.json) 뜻풀이를 **표제어로 찾아** 바꾼다 — replace-in-lessons.cjs 는 값 글자만 찾아서
 * '행위' · '남용' 처럼 여러 항목에 들어 있는 짧은 뜻을 가려 바꿀 수 없다.
 * 계획 파일(JSON 배열) 한 줄 = { item, word, from, to }
 *   from : 지금 뜻과 **글자까지 같아야** 한다 — 다르면 아무것도 쓰지 않고 멈춤
 *   to   : 새 뜻. 기준 1(괄호 포함 30자 안쪽)을 넘거나 기준 12(뜻 안에 표제어)에 걸리면 멈춤
 * 글자 그대로 고치고(들여쓰기·줄바꿈 그대로), 다시 읽어 바꾼 항목 말고는 하나도 안 바뀌었는지 확인한 뒤 쓴다.
 *
 *   node set-voca-meanings.cjs plans/x.json             미리보기
 *   node set-voca-meanings.cjs plans/x.json --apply     씀
 *   node set-voca-meanings.cjs --check plans/a.json …   지금 뜻 = to 인지 센다
 *   node set-voca-meanings.cjs --check … --rev f35e8be     일부러 깨기: 고치기 전 판으로 세면 어긋나야 한다('--rev HEAD' 는 고친 것이 커밋된 뒤 가짜, 7-1 n)
 * 줄에 "supersededBy": "<계획 이름>[ 설명]" 이 있으면 그 계획의 같은 표제어 줄을 **사슬 끝까지** 따라가 지금 뜻 = 마지막 to 인지 센다
 *   (7단계 7-1 d 와 같은 규칙 — 전에는 "from 이 아니기만" 봐서, 뒤에 누가 무엇으로 바꿨든 통과했다). 따라갈 수 없으면 어긋남.
 * 줄에 "revertedBy" 가 있으면(뒤 계획이 그 줄의 from 으로 되돌림 — 6-0917 correctly, 3차 점검 #7 ③) 세지 않고 수만 보인다.
 *   되돌린 값은 revertedBy 가 가리키는 계획이 센다.
 * 계획을 하나도 안 넘기면 exit 1 (7-1 h — 전에는 '0개 · 0줄 · 어긋남 0' 으로 통과).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const FILE = path.join(REPO, "content/voca_dictionary.json");
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const CHECK = args.includes("--check");
const ri = args.indexOf("--rev");
const REV = ri >= 0 ? args[ri + 1] : null;
const plans = args.filter((a, i) => !a.startsWith("--") && !(ri >= 0 && i === ri + 1));
const readRaw = () => (REV
  ? execFileSync("git", ["show", `${REV}:content/voca_dictionary.json`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(FILE, "utf8"));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const readPlan = (p) => JSON.parse(fs.readFileSync(path.resolve(p), "utf8").replace(/^﻿/, ""));
const jsonStr = (s) => JSON.stringify(s).slice(1, -1); // 파일 안 글자 꼴(따옴표·역슬래시 이스케이프)
const leaks = (w, m) => /[A-Za-z]/.test(m) && new RegExp(`(?<![A-Za-z])${esc(w)}(?:s|es|ed|d|ing|ly)?(?![A-Za-z])`, "i").test(m);

if (CHECK) {
  if (!plans.length) { console.log("VOCA 계획을 하나도 안 넘김 — 센 것 0 (7-1 h). exit 1"); process.exit(1); }
  const D = JSON.parse(readRaw().replace(/^﻿/, ""));
  const PLAN_DIR = path.join(__dirname, "plans");
  const succ = (s) => {
    const n = String(s).trim().split(/\s/)[0].replace(/\.json$/, "");
    const f = path.join(PLAN_DIR, `${n}.json`);
    return { n, lines: fs.existsSync(f) ? readPlan(f) : null };
  };
  // 뒤 계획에서 같은 표제어 줄, 없으면 이 줄의 to 에서 이어지는 줄(from = to — 사이에 표제어 키가 바뀐 경우: labour → labo(u)r, 6-0911)
  const chainEnd = (l) => {
    let cur = l;
    const via = [];
    for (let hop = 0; hop < 20 && cur.supersededBy; hop++) {
      const s = succ(cur.supersededBy);
      if (!s.lines) return { problem: `뒤 계획 '${s.n}' 이 계획 폴더에 없음` };
      let next = s.lines.filter((x) => x.word === cur.word);
      if (!next.length) next = s.lines.filter((x) => x.from === cur.to);
      if (!next.length) return { problem: `뒤 계획 '${s.n}' 에 ${cur.word} 줄도, 이 뜻에서 이어지는 줄도 없음(사슬 끊김)` };
      via.push(next[next.length - 1].word === cur.word ? s.n : `${s.n}(표제어 ${next[next.length - 1].word})`);
      cur = next[next.length - 1];
    }
    if (cur.supersededBy) return { problem: "사슬이 20 단계를 넘음" };
    if (cur.revertedBy) return { problem: `사슬 끝 줄(${via[via.length - 1]})이 되돌려짐 — 끝을 다시 적어야 함` };
    return { word: cur.word, to: cur.to, via };
  };
  let lines = 0, bad = 0, reverted = 0, chained = 0;
  for (const p of plans) {
    for (const l of readPlan(p)) {
      lines++;
      if (l.revertedBy) { reverted++; continue; }
      let cur = (D[l.word] || {}).meaning;
      let ok, want;
      if (l.supersededBy) {
        chained++;
        const e = chainEnd(l);
        if (e.problem) { ok = false; want = e.problem; }
        else { cur = (D[e.word] || {}).meaning; ok = cur === e.to; want = `${e.to} (사슬 끝 ${e.via.join(" → ")})`; }
      } else { ok = cur === l.to; want = l.to; }
      if (!ok) { bad++; console.log(`  어긋남 ${path.basename(p)} #${l.item}: ${l.word} 지금 ${JSON.stringify(cur)} · 기대 ${JSON.stringify(want)}`); }
    }
  }
  console.log(`${REV ? `[${REV} 기준] ` : ""}VOCA 계획 ${plans.length}개 · ${lines}줄 · 어긋남 ${bad} · 뒤에 다시 고친 줄 ${chained}(사슬 끝까지 셈)${reverted ? ` · 되돌린 줄 ${reverted} 은 세지 않음` : ""}`);
  process.exit(bad ? 1 : 0);
}

if (REV) throw new Error("--rev 는 --check 와만");
const plan = readPlan(plans[0]);
let raw = fs.readFileSync(FILE, "utf8");
const before = JSON.parse(raw.replace(/^﻿/, ""));
for (const l of plan) {
  const cur = (before[l.word] || {}).meaning;
  if (cur !== l.from) throw new Error(`#${l.item}: ${l.word} 지금 뜻 ${JSON.stringify(cur)} ≠ from ${JSON.stringify(l.from)} — 멈춤`);
  if ([...l.to].length > 30) throw new Error(`#${l.item}: ${l.word} 새 뜻 ${[...l.to].length}자 — 기준 1(30자 안쪽) 넘음`);
  if (leaks(l.word, l.to)) throw new Error(`#${l.item}: ${l.word} 새 뜻에 표제어가 들어 있음 — 기준 12`);
  const re = new RegExp(`(\\n "${esc(jsonStr(l.word))}": \\{\\r?\\n  "meaning": ")${esc(jsonStr(l.from))}(")`, "g");
  const n = (raw.match(re) || []).length;
  if (n !== 1) throw new Error(`#${l.item}: ${l.word} 자리가 ${n}곳 — 멈춤`);
  raw = raw.replace(re, (_, a, b) => a + jsonStr(l.to) + b);
  console.log(`#${l.item}: ${l.word} ${JSON.stringify(l.from)} → ${JSON.stringify(l.to)} (${[...l.to].length}자)`);
}
// 다시 읽어 확인: 바꾼 항목의 뜻만 달라졌나
const after = JSON.parse(raw.replace(/^﻿/, ""));
const changed = new Set(plan.map((l) => l.word));
if (Object.keys(after).length !== Object.keys(before).length) throw new Error("항목 수가 달라짐 — 쓰지 않음");
for (const [w, v] of Object.entries(before)) {
  const a = after[w];
  if (changed.has(w)) { if (a.meaning !== plan.find((l) => l.word === w).to || JSON.stringify({ ...a, meaning: 0 }) !== JSON.stringify({ ...v, meaning: 0 })) throw new Error(`${w}: 기대와 다름 — 쓰지 않음`); }
  else if (JSON.stringify(a) !== JSON.stringify(v)) throw new Error(`${w}: 바꾸지 않은 항목이 바뀜 — 쓰지 않음`);
}
if (!APPLY) { console.log(`\n${plan.length}줄 미리보기 — --apply 로 씀`); process.exit(0); }
fs.writeFileSync(FILE, raw);
console.log(`\n${plan.length}항목 씀 (형식 그대로)`);
