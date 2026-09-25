// L-74 · L-84(9/17 감사 — 불쾌할 수 있는 표현) · 머리가죽(d215) · pr054(R-30) · pr078(R-32)가 지금 내용에 어떻게 남았나 — 문장 그대로.
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const S = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const show = (id, ns) => { for (const r of S[id] || []) if (!ns || ns.includes(Number(r.n))) console.log(`  ${id} n${r.n}\n    EN ${r.en}\n    KO ${r.ko}`); };
console.log("== L-74 d194 #6 · d196 #2 #4 (9/17: freaks · pathetic · fat lady · 기형아)"); show("d194", [6]); show("d196", [2, 4]);
console.log("== L-84 d232 #3 (uncivilized tribes)"); show("d232", [3]);
console.log("== L-84 d234 (minstrel show)"); show("d234");
console.log("== L-84 d255 #7 (primitive tribes)"); show("d255", [7]);
console.log("== L-84 d256 · d257 (Indian medicine man)"); show("d256"); show("d257");
console.log("== L-80 d215 #3 (scalp)"); show("d215", [1, 2, 3, 4]);
const words = /freak|pathetic|fat lady|기형|uncivilized|미개|primitive|원시|minstrel|민스트럴|outlandish|weird|scalp|머리가죽|savage|야만/i;
console.log("== 온 LISTENING 대본에서 같은 말 찾기");
for (const [id, rows] of Object.entries(S)) for (const r of rows || []) { const t = `${r.en} || ${r.ko}`; if (words.test(t)) console.log(`  ${id} n${r.n}: ${t.slice(0, 260)}`); }
for (const f of ["pr054", "pr078"]) {
  const p = path.join(REPO, "content/lessons/reading", `${f}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`== READING ${f} — ${j.title || ""} · 문장 ${(j.readingSentences || []).length}`);
  for (const s of j.readingSentences || []) console.log(`  ${s.id || ""}\n    EN ${s.english}\n    KO ${s.korean}`);
}
