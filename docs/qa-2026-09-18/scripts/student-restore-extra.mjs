#!/usr/bin/env node
/**
 * STUDENT 원본 되살리기 — 둘째 묶음(2026-09-23 밤). 첫 묶음(student-restore-apply.mjs, 14과) 뒤 원본 swf 의
 * '영어 전체 글' 단추(과 하나의 영어 글이 원본 차례대로 한 단추에 든 것)와 82과를 모두 맞춰 보다 더 찾은 셋:
 *   s3-1  차례 — 원본: I would like … / Allow me … / He/She …  (9/17 S-27 이 한 문항의 두 문장을 가르며 Allow me 를 앞에 둠)
 *   s3-2  원본 10번째 문장 'I am like this, too.' 가 빠짐 — 9/7 08b77af 가 뺌(3705523 에는 있음)
 *   s9-3  원본 5번째 문장 'My favorite T.V. shows are …' 가 빠짐 — 9/6 첫 추출부터 없음(드릴에만 있다가 9/17 드릴 고침 때 사라짐)
 * 한국어는 원본에서 그 영어와 한 단추에 묶인 줄. 되살린 글은 다른 과와 같은 기준(9/17 S-32 TV 표기 · 빈칸 ( ) 는 한국어도 빈칸 — s3-2 #3 · s1-2 와 같음).
 * 소유자 결정 2026-09-23 "원본으로 다 되살려" (기록: docs/qa-2026-09-18/STUDENT-원본-되살리기.md).
 *
 *   node student-restore-extra.mjs            # 미리보기
 *   node student-restore-extra.mjs --apply    # 씀(이미 되어 있으면 '이미' 로 건너뜀)
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../../..");
const APPLY = process.argv.includes("--apply");
const L = path.join(REPO, "content/lessons/student");

const load = (id) => {
  const raw = fs.readFileSync(path.join(L, `${id}.json`), "utf8");
  const d = JSON.parse(raw);
  if (JSON.stringify(d, null, 2) + "\n" !== raw) throw new Error(`${id}: 파일 모양이 2칸 들여쓰기 + 끝 개행이 아님 — 멈춤`);
  return d;
};
const parts = (d) => {
  const s = d.blocks.find((b) => b.type === "sentences");
  const ko = d.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko");
  if (!s || s.items.length !== ko.length) throw new Error(`${d.id}: 영어 ${s ? s.items.length : 0} · 한국어 ${ko.length} — 짝 수가 다름, 멈춤`);
  return { s, ko };
};
/** 영어 문장 · 한국어 문단을 새 차례(짝 목록)로 다시 놓음 — 한국어 문단은 문장 블록 뒤 같은 자리에 차례대로. */
const rebuild = (d, pairs) => {
  const { s } = parts(d);
  s.items = pairs.map((p, i) => ({ n: String(i + 1), text: p.en }));
  const first = d.blocks.findIndex((b) => b.type === "paragraph" && b.lang === "ko");
  const rest = d.blocks.filter((b) => !(b.type === "paragraph" && b.lang === "ko"));
  const koBlocks = pairs.map((p) => ({ type: "paragraph", text: p.ko, lang: "ko" }));
  const before = d.blocks.slice(0, first).filter((b) => !(b.type === "paragraph" && b.lang === "ko"));
  const after = rest.slice(before.length);
  d.blocks = [...before, ...koBlocks, ...after];
};

const jobs = [
  {
    id: "s3-1",
    what: "차례를 원본대로(I would like → Allow me → He/She)",
    done: (pairs) => pairs[0].en === "I would like to introduce my friend to you.",
    change: (pairs) => {
      const want = ["I would like to introduce my friend to you.", "Allow me to introduce my friend to you.", "He/She is one of my best friends."];
      const out = want.map((w) => pairs.find((p) => p.en === w));
      if (out.some((x) => !x) || pairs.length !== 3) throw new Error("s3-1: 지금 세 문장이 예상과 다름 — 멈춤");
      return out;
    },
  },
  {
    id: "s3-2",
    what: "원본 10번째 문장을 끝에 되살림",
    done: (pairs) => pairs.some((p) => p.en === "I am like this, too."),
    change: (pairs) => {
      if (pairs.length !== 9 || !pairs[8].en.startsWith("He/She likes to hang out")) throw new Error("s3-2: 마지막 문장이 예상과 다름 — 멈춤");
      return [...pairs, { en: "I am like this, too.", ko: "나도 또한 이와 비슷합니다." }];
    },
  },
  {
    id: "s9-3",
    what: "원본 5번째 문장을 4번(After dinner …) 뒤에 되살림",
    done: (pairs) => pairs.some((p) => p.en.startsWith("My favorite TV shows")),
    change: (pairs) => {
      if (pairs.length !== 9 || pairs[3].en !== "After dinner, we watch television together." || !pairs[4].en.startsWith("I start my homework")) throw new Error("s9-3: 4 · 5번 문장이 예상과 다름 — 멈춤");
      return [...pairs.slice(0, 4), { en: "My favorite TV shows are (TV show name) and (TV show name).", ko: "내가 가장 좋아하는 TV 쇼들은 (TV 쇼 이름)과 (TV 쇼 이름)입니다." }, ...pairs.slice(4)];
    },
  },
];

let wrote = 0;
for (const j of jobs) {
  const d = load(j.id);
  const { s, ko } = parts(d);
  const pairs = s.items.map((it, i) => ({ en: it.text, ko: ko[i].text }));
  if (j.done(pairs)) { console.log(`${j.id}: 이미 — ${j.what}`); continue; }
  const next = j.change(pairs);
  rebuild(d, next);
  const after = parts(d);
  console.log(`${j.id}: ${j.what} — 영어 ${pairs.length} → ${after.s.items.length}`);
  after.s.items.forEach((it, i) => console.log(`   ${it.n}. ${it.text}\n      ${after.ko[i].text}`));
  if (APPLY) { fs.writeFileSync(path.join(L, `${j.id}.json`), JSON.stringify(d, null, 2) + "\n"); wrote++; }
}
console.log(APPLY ? `\n쓴 파일 ${wrote}` : "\n(미리보기 — --apply 로 씀)");
