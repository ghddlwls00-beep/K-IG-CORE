// ADULT 1·4·5 단계 vs STUDENT 1·2·3 단계 — 화면 조작(data-action · 표지 · 안내 글)이 같은지
const fs = require("fs");
const dir = __dirname;
const S = JSON.parse(fs.readFileSync(`${dir}/stu-sigs.json`, "utf8"));
const A = JSON.parse(fs.readFileSync(process.env.ADULT_SIGS || `${dir}/adult-sigs.json`, "utf8"));
// UI labels only: drop tile words and sentence texts (they are the lesson's words, not controls)
const ui = (labels) => (labels || []).filter((l) => /[가-힣]/.test(l) && !/[A-Za-z]{2,}/.test(l)).filter((l) => !/^[가-힣]{1,4}$/.test(l) || /^(가림|모두|영어|해석|듣기|힌트|초기화|정답 확인|하나 빼기|우리말 힌트|영어 가리기|다음 문장|말하기|반복|읽었어요|정지)$/.test(l));
const out = [];
for (const vp of ["mobile", "desktop"]) {
  const s = Object.entries(S).filter(([k]) => k.endsWith(`:${vp}`)).map(([, v]) => v);
  const a = Object.entries(A).filter(([k]) => k.endsWith(`:${vp}`)).map(([, v]) => v);
  for (const step of ["listen", "dictation", "shadowing"]) {
    const uni = (list, f) => [...new Set(list.flatMap((x) => (x[step] ? f(x[step]) : [])))].sort();
    const sa = uni(s, (x) => x.acts), aa = uni(a, (x) => x.acts);
    const sm = uni(s, (x) => x.marks), am = uni(a, (x) => x.marks);
    const sl = uni(s, (x) => ui(x.labels)), al = uni(a, (x) => ui(x.labels));
    const sh = uni(s, (x) => [x.hint]), ah = uni(a, (x) => [x.hint]);
    const d = (p, q) => ({ onlyStudent: p.filter((x) => !q.includes(x)), onlyAdult: q.filter((x) => !p.includes(x)) });
    out.push({ vp, step, acts: d(sa, aa), marks: d(sm, am), labels: d(sl, al), hint: d(sh, ah), same: { acts: sa.filter((x) => aa.includes(x)), marks: sm.filter((x) => am.includes(x)) } });
  }
}
console.log(JSON.stringify(out, null, 1));

