#!/usr/bin/env node
/**
 * 고친 것 다시 읽기(2026-09-25) — GRAMMAR 글 가운데 앱이 **적힌 것과 다르게** 보이는 글이 있는지 센다.
 * GrammarLearningView 의 cleanText(문항 · 모범 · 다른 정답 모두 거침)는 앞 번호 '1.' 을 떼고 빗금 '/' 을 빈칸으로 바꾼다 —
 * 그래서 'his/her' 다른 정답은 화면에 'his her' 로 보이고 'his/her' 로 치면 0점(수정 세션 e886d88 이 6개 뺌).
 * 이 다시 읽기의 읽을거리는 이 바꿈을 거치지 않은 글을 보여 줘서 일꾼이 놓쳤다 → 같은 종류가 남았는지 앱 규칙으로 전부 센다.
 * cleanText 정규식은 그 판의 GrammarLearningView.tsx 에서 읽어 온다(베껴 두지 않음).
 *   node check-cleantext.cjs [판=main]          바뀌어 보이는 글이 있으면 exit 1
 *   node check-cleantext.cjs [판] --break        읽은 글 하나에 'his/her' 를 몰래 넣어 잡는지(못 잡으면 exit 1)
 */
const L = require("./lib.cjs");
const argv = process.argv.slice(2);
const rev = argv.find((a) => !a.startsWith("--")) || "main";
const brk = argv.includes("--break");
const view = L.git(["show", `${rev}:src/components/GrammarLearningView.tsx`]).toString();
const body = (view.match(/function cleanText\(text: string\): string \{([\s\S]*?)\n\}/) || [])[1];
if (!body) { console.error("GrammarLearningView.tsx 에서 cleanText 를 못 찾음 — 앱 코드가 바뀜, 이 도구를 고칠 것"); process.exit(1); }
const res = [...body.matchAll(/\.replace\((\/(?:\\\/|[^/])+\/[gimsuy]*),\s*"([^"]*)"\)/g)].map((m) => [eval(m[1]), m[2]]);
if (res.length !== 2) { console.error(`cleanText 의 replace 가 ${res.length}개 — 2개(앞 번호 · 빗금)가 아님, 이 도구를 고칠 것`); process.exit(1); }
const cleanText = (t) => (t ? res.reduce((s, [re, to]) => s.replace(re, to), String(t)).trim() : "");
const files = L.git(["ls-tree", "-r", "--name-only", rev, "--", "content/lessons/grammar1", "content/lessons/grammar2"]).toString().trim().split("\n").filter((f) => f.endsWith(".json"));
const texts = [];
L.catFiles(files.map((f) => `${rev}:${f}`)).forEach((raw, i) => {
  const d = JSON.parse(raw);
  for (const b of d.blocks || []) if (b.type === "sentences") for (const it of b.items || []) {
    texts.push({ where: `${files[i].replace(/^content\/lessons\//, "")} #${it.n} 글`, t: it.text });
    (it.alternatives || []).forEach((a, k) => texts.push({ where: `${files[i].replace(/^content\/lessons\//, "")} #${it.n} 다른 정답 ${k}`, t: a }));
  }
});
if (brk) texts[Math.floor(texts.length / 2)].t = "Each student has his/her own idea.";
const bad = texts.filter((x) => typeof x.t === "string" && cleanText(x.t) !== x.t.trim());
console.log(`${rev}: GRAMMAR 파일 ${files.length} · 글(문항 · 모범 · 다른 정답) ${texts.length} · 앱이 바꿔 보이는 글 ${bad.length}${brk ? " (깨기: 하나를 일부러 넣음)" : ""}`);
for (const x of bad.slice(0, 20)) console.log(`  ${x.where}: ${JSON.stringify(x.t)} → 화면 ${JSON.stringify(cleanText(x.t))}`);
if (brk) process.exit(bad.length >= 1 ? 0 : 1);
process.exit(bad.length ? 1 : 0);
