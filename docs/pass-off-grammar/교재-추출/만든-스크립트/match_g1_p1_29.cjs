// Find the STUDENT/MIDDLE lesson sentence that best matches each book sentence (g1 p1-29).
const fs = require('fs');
const path = require('path');
const repo = 'C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/korean-market-analysis-39e7fc';
const dirs = ['content/lessons/student', 'content/lessons/middle'];
const pool = [];
for (const d of dirs) {
  const full = path.join(repo, d);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter(x => x.endsWith('.json'))) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')); } catch (e) { continue; }
    const sents = [];
    const kos = [];
    const walk = (blocks) => {
      for (const b of blocks || []) {
        if (b.type === 'sentences') for (const it of b.items || []) sents.push(it.text || '');
        if (b.type === 'paragraph' && b.lang === 'ko') kos.push(b.text || '');
        if (b.blocks) walk(b.blocks);
      }
    };
    walk(j.blocks);
    sents.forEach((s, i) => pool.push({ id: j.id || f, i: i + 1, text: s, ko: sents.length === kos.length ? kos[i] : null }));
  }
}
const norm = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const book = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
for (const b of book) {
  const bw = new Set(norm(b));
  const scored = pool.map(p => {
    const pw = new Set(norm(p.text));
    let inter = 0; for (const w of bw) if (pw.has(w)) inter++;
    const score = inter / Math.max(1, bw.size);
    return { p, score, cover: inter / Math.max(1, pw.size) };
  }).sort((a, b) => b.score - a.score || b.cover - a.cover);
  const top = scored.slice(0, 2).filter(x => x.score >= 0.5);
  console.log('BOOK: ' + b);
  if (!top.length) console.log('   (no match >= 0.5)');
  for (const t of top) console.log(`   ${t.score.toFixed(2)} ${t.p.id}#${t.p.i}: ${t.p.text}` + (t.p.ko ? `  || ${t.p.ko}` : ''));
}
console.log('pool size', pool.length);
