// Deliberate-break test: each mutation must make build_g2_p1_27.cjs exit non-zero.
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const dir = __dirname;
const builder = path.join(dir, 'build_g2_p1_27.cjs');
const tmp = path.join(dir, 'breaktest_tmp_g2.cjs');
const tmpOut = path.join(dir, 'breaktest_g2.json');
let src = fs.readFileSync(builder, 'utf8');
const outExpr = "path.join(SP, 'out', 'g2-p1-27.json')";
if (!src.includes(outExpr)) throw new Error('cannot redirect output');
src = src.replace(outExpr, JSON.stringify(tmpOut));
const muts = [
  ['typo in an application line', "[7, 'Jinna is diligent.', ['diligent'], 1]", "[7, 'Jinna is dilligent.', ['dilligent'], 1]"],
  ['wrong bold span', "['cheaper than'], { analysisNote: '-er than' }", "['cheaper then'], { analysisNote: '-er than' }"],
  ['wrong page number on a prompt', "[13, '나의 삼촌은 파일럿이다.', 44]", "[14, '나의 삼촌은 파일럿이다.', 44]"],
  ['wrong table row expectation', 'const expectTable = { 15: 17,', 'const expectTable = { 15: 16,'],
  ['wrong review verb count', 'const expectRev = { 24: 29,', 'const expectRev = { 24: 30,'],
  ['intro text altered', '560여 문장에 대한', '600여 문장에 대한'],
  ['dropped a Korean prompt', "  [23, '그는 그의 딸이 아름답다고 믿는다.'],\n", ''],
  ['passOff sentence missing from application', "[9, 'He took me by the hand.', ['by the hand'], 4],", "[9, 'He took me by his hand.', ['by his hand'], 4],"],
];
let missed = 0;
for (const [name, a, b] of muts) {
  if (!src.includes(a)) { console.log('MUTATION NOT APPLIED: ' + name); missed++; continue; }
  fs.writeFileSync(tmp, src.replace(a, b));
  const r = cp.spawnSync(process.execPath, [tmp], { encoding: 'utf8' });
  const firstErr = (r.stderr || '').split('\n').filter(Boolean)[1] || (r.stderr || '').split('\n')[0];
  if (r.status === 0) missed++;
  console.log(`${r.status !== 0 ? 'CAUGHT' : 'MISSED'} ${name} (exit ${r.status}) :: ${String(firstErr).slice(0, 160)}`);
}
fs.unlinkSync(tmp);
if (fs.existsSync(tmpOut)) { console.log('note: a mutated build wrote output (removed)'); fs.unlinkSync(tmpOut); }
console.log(missed ? `FAIL: ${missed} mutation(s) not caught` : 'ALL MUTATIONS CAUGHT');
process.exit(missed ? 1 : 0);
