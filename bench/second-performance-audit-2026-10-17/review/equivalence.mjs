// Strict equivalence: frozen originals vs candidates on the real sheets/sprites and edge cases.
// node equivalence.mjs   (exits non-zero on the first difference)
import assert from 'node:assert/strict';
import { index, load, edgeCases } from './fixtures-lib.mjs';
const O = await import('./frozen/recolor.js'), N = await import('./candidate/recolor.js');
const same = (a, b, what) => { assert.equal(a.length, b.length, what); assert.ok(Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength)), what); };
const FIELDS = ['w', 'h', 'cut', 'hasAlpha', 'soft', 'lo', 'hi', 'auto', 'autoLine', 'autoTone', 'autoSeam'];
const cases = Object.entries(edgeCases());
for (const { file } of index) cases.push([file, load(file)]);
// The repository's own Icon fixtures (read only): 65 inventory sprites and the opening stress cases.
import { readFileSync } from 'node:fs';
const lib = new URL('../../../src/lib/fixtures/', import.meta.url);
for (const f of JSON.parse(readFileSync(new URL('ai-inventory.json', lib)))) cases.push(['ai-' + f.id, { width: f.w, height: f.h, data: Uint8ClampedArray.from([...Buffer.from(f.indices, 'base64')].flatMap(i => f.palette[i])) }]);
for (const c of JSON.parse(readFileSync(new URL('icon-opening-stress.json', lib)))) cases.push(['stress-' + c.sample, { width: 16, height: 16, data: Uint8ClampedArray.from(Buffer.from(c.rgba, 'base64')) }]);
// Inventory sprites tiled 3x3 with no gutter and with a 1px gutter: components touching the canvas
// edge, merged sprites over 1024 px or a 64 px box, and the interior/edge flood branches.
for (const gap of [0, 1]) {
  const tiles = cases.filter(([n]) => n.startsWith('ai-')).slice(0, 9).map(([, s]) => s), tw = 16 + gap, w = tw * 3, data = new Uint8ClampedArray(w * w * 4);
  tiles.forEach((t, k) => { for (let y = 0; y < t.height; y++) data.set(t.data.subarray(y * t.width * 4, (y + 1) * t.width * 4), (((k / 3 | 0) * tw + y) * w + (k % 3) * tw) * 4); });
  cases.push(['ai-tiled-gap' + gap, { width: w, height: w, data }]);
}
let checks = 0, pixels = 0;
const compare = (a, b, name) => {
  for (const f of FIELDS) assert.equal(b[f], a[f], `${name} ${f}`);
  for (const f of ['lum', 'right', 'down', 'hist', 'edges']) same(a[f], b[f], `${name} ${f}`);
  const sa = O.spritesOf(a), sb = N.spritesOf(b);
  for (const f of ['level', 'auto', 'body']) same(sa[f], sb[f], `${name} sprites.${f}`);
  assert.deepEqual(sb.cuts, sa.cuts, `${name} sprites.cuts`);
  for (const border of ['auto', 'keep', 'trim']) {
    const ia = O.iconOf(a, border), ib = N.iconOf(b, border);
    same(ia.ink, ib.ink, `${name} icon ${border} ink`); same(ia.detail, ib.detail, `${name} icon ${border} detail`);
    for (const detail of [0, 30, 50, 75, 100]) same(O.mask(a, 'icon', { border, detail }), N.mask(b, 'icon', { border, detail }), `${name} icon mask ${border} ${detail}`);
  }
  for (const set of [null, { cuts: 0 }, { cuts: 40 }, { outline: 'trim', edges: 50 }]) same(O.mask(a, 'stencil', set), N.mask(b, 'stencil', set), `${name} stencil ${JSON.stringify(set)}`);
  same(O.mask(a, 'cutout'), N.mask(b, 'cutout'), `${name} cutout`);
  checks++; pixels += a.w * a.h;
};
for (const [name, src] of cases) for (const source of ['luma', 'value', 'red', 'green', 'blue']) for (const cut of [128, 1, 255]) {
  if (src.width * src.height > 1100000 && (cut !== 128 || !['luma', 'value'].includes(source))) continue; // keep the 2048 runs bounded
  compare(O.analyze(src, source, cut), N.analyze(src, source, cut), `${name} ${source} ${cut}`);
}
// Animations: unify / unifyAsync share addSeams across frames.
const sprites16 = index.filter(e => e.width === 16).map(e => load(e.file));
for (const source of ['luma', 'value']) {
  const fa = O.unify(sprites16.map(s => O.analyze(s, source))), fb = N.unify(sprites16.map(s => N.analyze(s, source)));
  fa.forEach((a, i) => compare(a, fb[i], `unify ${source} ${i}`));
  const ga = await O.unifyAsync(sprites16.map(s => O.analyze(s, source))), gb = await N.unifyAsync(sprites16.map(s => N.analyze(s, source)));
  ga.forEach((a, i) => compare(a, gb[i], `unifyAsync ${source} ${i}`));
}
console.log(`identical: ${checks} analysis/sprites/icon(3 borders x 5 details)/stencil(4)/cutout comparisons, ${pixels} source pixels, ${cases.length} images`);
