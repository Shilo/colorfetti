// C-B5 exactness: HEAD 0c61dd0 `analyze` (frozen via git archive into .tmp/c-b5/frozen) against
// the candidate's `analyze` and `analyzeAsync`. Every field, key order and identity of `data`.
// Async runs twice: with the real clock (natural 8 ms bands) and with a clock that jumps 9 ms
// per call, so every band is exactly one step of ceil(8192 / w) rows and band seams are hit
// at every row count from 1 upwards (widths up to 9000).
// node bench/second-performance-audit-2026-10-17/c-b5/differential.mjs > differential.result.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { index, load, edgeCases } from '../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../..');
const O = await import(pathToFileURL(path.join(repo, '.tmp/c-b5/frozen/src/lib/recolor.js')));
const N = await import(pathToFileURL(path.join(repo, 'src/lib/recolor.js')));
const SOURCES = ['luma', 'value', 'red', 'green', 'blue', 'unknown'];
const ARRAYS = ['lum', 'right', 'down', 'hist', 'edges'], SCALARS = ['w', 'h', 'cut', 'hasAlpha', 'soft', 'lo', 'hi', 'auto', 'autoLine', 'autoTone', 'autoSeam'];
const realNow = performance.now.bind(performance);
let fake = 0;
const jumpy = () => (fake += 9);
function same(a, b, where) {
  const ka = Object.keys(a).join(), kb = Object.keys(b).join();
  if (ka !== kb) throw new Error(`${where}: keys ${ka} vs ${kb}`);
  if (a.data !== b.data) throw new Error(`${where}: data`);
  for (const k of SCALARS) if (!Object.is(a[k], b[k])) throw new Error(`${where}: ${k} ${a[k]} vs ${b[k]}`);
  for (const k of ARRAYS) {
    if (a[k].constructor !== b[k].constructor || a[k].length !== b[k].length) throw new Error(`${where}: ${k} type/length`);
    for (let i = 0; i < a[k].length; i++) if (a[k][i] !== b[k][i]) throw new Error(`${where}: ${k}[${i}]`);
  }
}
const report = { randomImages: 0, fixtureFrames: 0, comparisons: 0, identical: true };
async function check(img, source, cut, where) {
  const a = O.analyze(img, source, cut);
  same(a, N.analyze(img, source, cut), where + ' sync');
  performance.now = realNow;
  same(a, await N.analyzeAsync(img, source, cut), where + ' async');
  performance.now = jumpy;
  same(a, await N.analyzeAsync(img, source, cut), where + ' async one-step bands');
  performance.now = realNow;
  report.comparisons += 3;
}
let s = 2026;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function random(n) {
  const wide = n % 3 === 0, w = wide ? 1 + Math.floor(rnd() * 9000) : Math.floor(rnd() * 70), h = wide ? Math.floor(rnd() * 12) : Math.floor(rnd() * 70);
  const data = new Uint8ClampedArray(w * h * 4), levels = [2, 3, 16, 256][n % 4], mode = n % 5;
  const q = v => Math.floor(Math.floor(v * levels * 0.999) * (255 / (levels - 1 || 1)));
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const base = mode === 0 ? rnd() : ((x >> 2) + (y >> 1)) % 4 / 3;
    data[i] = q(base); data[i + 1] = q(rnd() < 0.3 ? rnd() : base); data[i + 2] = q(rnd() < 0.2 ? rnd() : base * 0.7);
    data[i + 3] = mode === 1 ? 255 : mode === 2 ? (rnd() < 0.2 ? 0 : 255) : mode === 3 ? Math.floor(rnd() * 256) : (rnd() < 0.5 ? 255 : [0, 1, 127, 128, 254][Math.floor(rnd() * 5)]);
  }
  return { width: w, height: h, data };
}
const shapes = [[0, 0], [0, 5], [5, 0], [1, 1], [1, 9000], [9000, 1], [1, 300], [300, 1], [8192, 2], [8193, 3], [4097, 4]];
for (const [w, h] of shapes) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 2654435761) >>> 24;
  for (const source of SOURCES) for (const cut of [1, 128, 255]) await check({ width: w, height: h, data }, source, cut, `shape ${w}x${h} ${source} ${cut}`);
  report.randomImages++;
}
for (let n = 0; n < 3000; n++) {
  const img = random(n), source = SOURCES[n % SOURCES.length], cut = [1, 128, 255, 0, 256, 64][Math.floor(n / 6) % 6];
  await check(img, source, cut, `random ${n} ${img.width}x${img.height} ${source} ${cut}`);
  report.randomImages++;
}
for (const [name, img] of Object.entries(edgeCases())) for (const source of SOURCES) for (const cut of [1, 128, 255]) await check(img, source, cut, `edge ${name} ${source} ${cut}`);
for (const { file } of index) {
  const img = load(file);
  for (const source of SOURCES) for (const cut of [1, 128, 255]) await check(img, source, cut, `fixture ${file} ${source} ${cut}`);
  report.fixtureFrames++;
}
console.log(JSON.stringify(report, null, 1));
