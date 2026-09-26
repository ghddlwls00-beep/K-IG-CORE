// Read-only: search STUDENT/MIDDLE lesson JSON for sentences matching given regexes.
// usage: node find_student_g2_p52_71.cjs <repoRoot> <regex1> [<regex2> ...]
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const pats = process.argv.slice(3).map((p) => new RegExp(p, 'i'));
const dirs = ['content/lessons/student', 'content/lessons/middle'];
function walk(v, cb, trail) {
  if (typeof v === 'string') return cb(v, trail);
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, cb, trail.concat(i)));
  if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], cb, trail.concat(k));
}
for (const d of dirs) {
  const full = path.join(root, d);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'));
    walk(j, (s, trail) => {
      for (const p of pats) {
        if (p.test(s)) {
          console.log(`${d.split('/').pop()}/${f} :: ${trail.join('.')} :: ${s.replace(/\s+/g, ' ').slice(0, 400)}`);
          break;
        }
      }
    }, []);
  }
}
