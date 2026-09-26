// Match g2 p1-27 sentences against all lesson JSON files (read-only).
const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\ghddl\\.gemini\\antigravity\\scratch\\K-IG-CORE\\.claude\\worktrees\\korean-market-analysis-39e7fc\\content\\lessons';

const mine = [
  // 형용사 pass-off + application (unique)
  "It's a nice day.", "The weather is nice today.", "What book is this?", "Which book is yours?",
  "You look tired.", "It sounds interesting.", "Jane's job is boring.", "Jane is bored.",
  "It is an exciting time to learn.", "We were excited to watch the baseball game.",
  "It's cheaper than that one.", "The exam was easier than we expected.",
  "I know him well-probably better than anybody else does.", "She is more talented than me.",
  "The warmer the weather, the better I feel.", "Yesterday was the hottest day of the year.",
  "It was the most boring movie I've ever seen.", "That church is the oldest building in the town.",
  "My grandmother lives with my mother's eldest brother.", "What was the happiest day of your life?",
  "I had a sandwich and an apple for lunch.", "The sandwich wasn't very good, but the apple was delicious.",
  "The earth goes around the sun.", "Your sweater is the same color as mine.", "What did you have for breakfast?",
  "Claudia is at school and her mother wants to see her teacher at the school.", "He took me by the hand.",
  "The brick hit John in the face.", "He is hired by the day.", "We can buy strawberry by the pound.",
  "The only person who can do this is Zeus.", "Who's going to do the cooking?", "Who's going to do the shopping?",
  "She has a big cat.", "Have a wonderful day!", "Danny is a tall, young, interesting person.",
  "The rabbit has long black ears.", "I have an old, round, wooden table.", "Jinna is diligent.",
  "These fish are alive.", "The kids are afraid of the dark.", "He is fast asleep.",
  "You can see a shining face on the mirror.", "Are you satisfied?",
  "He stood astonished at the sight of the huge robot.", "Peter is older than John.", "Rachael is prettier than Leah.",
  "You are fatter than her.", "Unfortunately her illness was more serious than we thought at first.",
  "My room is smaller than my brother's.", "Which is the taller of the two?",
  "It was the most beautiful summer of their lives.", "The wisest man may sometimes make a mistake.",
  "You must make the most of your chance.", "My uncle is a pilot.", "I study English for an hour every evening.",
  "It's a scientific novel book and the book is very thick.", "Look at the sky.", "The rainbow is over there.",
  "He can play the guitar and he can play all kinds of sports, too.",
  // 동사
  "There are many jobs in the world.", "The cookie smells good.", "I want to become an interpreter.",
  "He always gives me candy when I visit him.", "They also tell me that I need to love children and serve them.",
  "I want to be able to help others learn and grow, too.", "The cat jumped out of the window.",
  "Mom is out in the garage.", "He stayed in bed.", "Is there a bank next to the office?",
  "You must keep quiet during working with them.", "It is getting warmer and warmer.",
  "He grew older after the great success of his business.", "I bought a new computer.", "Tom sold his car last week.",
  "Can you explain the situation?", "I informed him of her success.", "They robbed the lady of her bag.",
  "Tim helped me with my report.", "He owed his success to his father.", "He bought his wife an expensive car.",
  "Will you teach me how to go to Seoul?", "I can make you an amazing steak.", "They ask him a lot of questions.",
  "His gift made his wife happy.", "Age has turns his hair gray.", "We will call the girl Bobby.",
  "She thought him innocent.", "He believes his daughter beautiful."
];

const norm = s => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = s => norm(s).split(' ').filter(Boolean);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}
const files = walk(root, []);
const corpus = [];
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const ko = (j.blocks || []).filter(b => b.type === 'paragraph' && b.lang === 'ko').map(b => b.text);
  for (const b of (j.blocks || [])) {
    if (b.type === 'sentences' && Array.isArray(b.items)) {
      b.items.forEach((it, idx) => { if (it && typeof it.text === 'string') corpus.push({ f: rel, n: it.n, text: it.text, ko: ko[idx] || null }); });
    } else if (typeof b.text === 'string' && b.lang !== 'ko' && /[a-zA-Z]{3,}/.test(b.text)) {
      corpus.push({ f: rel, n: b.type, text: b.text, ko: null });
    }
  }
}
console.log('files', files.length, 'corpus', corpus.length);
for (const m of mine) {
  const nm = norm(m);
  const mt = new Set(toks(m));
  const hits = [];
  for (const c of corpus) {
    const nc = norm(c.text);
    if (!nc) continue;
    let kind = null, score = 0;
    if (nc === nm) { kind = 'EXACT'; score = 1; }
    else if (nc.includes(nm)) { kind = 'CONTAINS'; score = 0.95; }
    else if (nm.length > 12 && nm.includes(nc) && nc.split(' ').length >= 4) { kind = 'INSIDE'; score = 0.9; }
    else {
      const ct = new Set(toks(c.text));
      let inter = 0; for (const t of mt) if (ct.has(t)) inter++;
      const s = inter / Math.max(mt.size, 1);
      const s2 = inter / Math.max(ct.size, 1);
      if (s >= 0.75 && s2 >= 0.5 && mt.size >= 4) { kind = 'FUZZY'; score = Math.min(s, s2) * 0.85; }
    }
    if (kind) hits.push({ kind, score, ...c });
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 6);
  console.log('\n## ' + m + (top.length ? '' : '   -- NO MATCH'));
  for (const h of top) console.log(`   ${h.kind} ${h.f}#${h.n}: ${h.text}${h.ko ? '  || KO: ' + h.ko : ''}`);
}
