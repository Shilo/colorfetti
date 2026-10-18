// H-B6 probe: icon-glyph.js glyphComponent with module-level scratch buffers (reset to the
// same initial values) instead of ~22 typed-array allocations per small component.
// Differs from the rejected Icon patch (floods/crease hoists/level skip): allocation only.
import path from 'node:path';
import { load, index } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const mod = (d, p) => import('file:///' + path.join(repo, '.tmp/source-review-B', d, p).replace(/\\/g, '/'));
const H = await mod('frozen', 'recolor.js'), P = await mod('pooled', 'recolor.js');
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const files = index.filter(e => !e.gif).map(e => e.file).concat(['kenney-motion-256.gif.3', 'real-magic.gif.2']);
const report = { cases: 0, identical: true, timing: {} };
for (const file of files) for (const source of ['luma', 'value']) for (const cut of [1, 128]) for (const outline of ['auto', 'keep', 'trim']) {
  const img = load(file), a = H.iconOf(H.analyze(img, source, cut), outline), b = P.iconOf(P.analyze(img, source, cut), outline);
  if (!eq(a.ink, b.ink) || !eq(a.detail, b.detail)) throw new Error(`${file} ${source} ${cut} ${outline}`);
  report.cases++;
}
for (const file of ['kenney-sheet-1024.png', 'kenney-sheet-2048.png']) {
  const img = load(file), ha = H.analyze(img), pa = P.analyze(img), th = [], tp = [];
  for (let i = 0; i < 7; i++) {
    delete ha.icons; let s = performance.now(); H.iconOf(ha, 'auto'); th.push(performance.now() - s);
    delete pa.icons; s = performance.now(); P.iconOf(pa, 'auto'); tp.push(performance.now() - s);
  }
  const med = a => +[...a].sort((x, y) => x - y)[3].toFixed(1);
  report.timing[file] = { headMs: med(th), pooledMs: med(tp), headAll: th.map(v => +v.toFixed(0)), pooledAll: tp.map(v => +v.toFixed(0)) };
}
console.log(JSON.stringify(report, null, 1));
