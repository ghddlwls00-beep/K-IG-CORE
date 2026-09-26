// Cross-check out/g1-p1-29.json against the PDF text layer (g1.txt), both directions.
// 1) every extracted raw/prompt/label/instruction must occur on its page's text layer;
// 2) every non-boilerplate text-layer line on pages 5-29 must be covered by something extracted.
// Exit code 1 on any mismatch.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const txt = fs.readFileSync(path.join(dir, 'g1.txt'), 'utf8');
const doc = JSON.parse(fs.readFileSync(process.argv[2] || path.join(dir, 'out', 'g1-p1-29.json'), 'utf8'));
const pages = {};
let cur = null;
for (const line of txt.split(/\r?\n/)) {
  const m = line.match(/^===== g1 PAGE (\d+) =====$/);
  if (m) { cur = +m[1]; pages[cur] = []; continue; }
  if (cur) pages[cur].push(line);
}
const norm = s => s.replace(/\s+/g, ' ').trim();
const pageText = p => norm((pages[p] || []).join(' '));
let fail = 0;
const covered = {}; // page -> array of normalized strings extracted
const add = (p, s) => { (covered[p] = covered[p] || []).push(norm(s)); };
const mustFind = (p, s, what) => {
  const n = norm(s.replace(/\n/g, ' '));
  if (!pageText(p).includes(n)) { fail++; console.log(`NOT IN TEXT LAYER p${p} [${what}]: ${n}`); }
};
for (const t of doc.topics) {
  for (const s of t.sections) {
    if (s.groups) for (const g of s.groups) {
      const gp = g.items[0].page;
      mustFind(gp, g.label, 'group label'); add(gp, g.label);
      for (const it of g.items) {
        mustFind(it.page, it.raw, 'raw'); add(it.page, it.raw.replace(/\n/g, ' '));
        for (const part of it.raw.split('\n')) add(it.page, part);
        if (it.tag) add(it.page, it.tag);
        // en must be a substring of raw (after normalization)
        if (!norm(it.raw.replace(/\n/g, ' ')).includes(norm(it.en))) { fail++; console.log(`EN NOT IN RAW p${it.page}: ${it.en} || ${it.raw}`); }
      }
    }
    if (s.tasks) for (const k of s.tasks) {
      mustFind(k.page, (k.no ? k.no + ' ' : '') + k.instruction, 'instruction'); add(k.page, (k.no ? k.no + ' ' : '') + k.instruction);
      for (const it of k.items) {
        mustFind(it.page, it.prompt, 'prompt'); add(it.page, it.prompt);
      }
    }
  }
}
// boilerplate / headings that are not content lines
const boiler = [/^The Revolution of English Education$/, /^\d+$/, /^Pass-Off English$/, /^TOPIC \d$/, /^인\s*칭$/, /^동사의 현재형$/, /^문장의 기초$/, /^\d\. (Pass-Off|Application) Sentences$/, /^Review$/, /^_+\s*\(\s*\)$/, /^(명사|대명사|동사|형용사|부사|전치사|감탄사|접속사):$/];
for (let p = 5; p <= 29; p++) {
  const cov = covered[p] || [];
  for (const raw of pages[p]) {
    let l = norm(raw);
    if (!l) continue;
    if (boiler.some(r => r.test(l))) continue;
    // numbered review prompts: strip leading "N)" or "N." for matching
    const l2 = l.replace(/^\d+[.)]\s*/, '');
    const hit = cov.some(c => c.includes(l) || c.includes(l2));
    if (!hit) { fail++; console.log(`TEXT LINE NOT EXTRACTED p${p}: ${l}`); }
  }
}
console.log(fail ? `FAIL: ${fail} mismatches` : 'PASS: every extracted string is on its page and every content line on p5-29 is extracted');
process.exit(fail ? 1 : 0);
