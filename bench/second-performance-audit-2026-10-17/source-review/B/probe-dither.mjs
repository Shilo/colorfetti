// H-B2 probe: exact penalty lower-bound skip in palette-dither.js mixturePlan.
// frozen = HEAD, variant = counting copy, clean = timed copy (.tmp/source-review-B/*).
import { createRequire } from 'node:module';
import path from 'node:path';
import { load } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const mod = (dir, p) => import('file:///' + path.join(repo, '.tmp/source-review-B', dir, p).replace(/\\/g, '/'));
const sharp = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const png = async f => { const { data, info } = await sharp(path.join(repo, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) }; };
const H = await mod('frozen', 'quantize.js'), V = await mod('variant', 'quantize.js'), C = await mod('clean', 'quantize.js');
const { FULL_PRESETS } = await mod('frozen', 'palette-library.js');
const images = {
  entropy512: await png('bench/second-performance-audit-2026-10-17/android/fixtures/entropy512.png'),
  sheet1024: load('kenney-sheet-1024.png'), motion256f0: load('kenney-motion-256.gif.0'),
  glow64: await png('bench/second-performance-audit-2026-10-17/android/fixtures/partial-glow64.png'),
  boundary4097: await png('bench/second-performance-audit-2026-10-17/android/fixtures/boundary4097.png'),
};
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
let cases = 0;
const report = { exactness: null, counts: {}, timing: {} };
// Exactness: every image x 5 palettes x metric x dither x strength x alphaMode, plus sampled sizes.
for (const [name, img] of Object.entries(images)) for (const preset of FULL_PRESETS.slice(0, 10)) for (const metric of ['oklab', 'rgb'])
  for (const dither of ['2x2', '4x4', '8x8']) for (const ditherStrength of [1, 50, 100]) for (const alphaMode of ['cut', 'keep']) {
    if (name === 'sheet1024' && (ditherStrength !== 50 || alphaMode !== 'cut')) continue; // bound runtime
    const mw = name === 'sheet1024' ? 333 : undefined, mh = name === 'sheet1024' ? 271 : undefined;
    const o = { metric, dither, ditherStrength, alphaMode }, p = H.preparePalette(preset.colors);
    const a = H.quantize(img, p, 128, mw, mh, o), b = V.quantize(img, V.preparePalette(preset.colors), 128, mw, mh, o);
    if (!eq(a.indices, b.indices) || !eq(a.used, b.used) || a.hasTransparency !== b.hasTransparency || (a.alpha && !eq(a.alpha, b.alpha))) throw new Error(`mismatch ${name} ${preset.id} ${JSON.stringify(o)}`);
    cases++;
  }
report.exactness = { cases, identical: true };
for (const [name, img] of Object.entries(images)) for (const id of ['preset-res64', 'preset-edg32', 'preset-pico8', 'preset-edg8']) {
  const preset = FULL_PRESETS.find(p => p.id === id);
  for (const ditherStrength of [50, 100]) {
    globalThis.__pruned = globalThis.__labs = 0;
    V.quantize(img, V.preparePalette(preset.colors), 128, undefined, undefined, { dither: '4x4', ditherStrength });
    const total = globalThis.__pruned + globalThis.__labs;
    report.counts[`${name} ${id} s${ditherStrength}`] = { weightTrials: total, pruned: globalThis.__pruned, share: total ? +(globalThis.__pruned / total).toFixed(3) : 0 };
  }
}
for (const name of ['entropy512', 'boundary4097', 'sheet1024']) for (const id of ['preset-res64', 'preset-edg32', 'preset-edg8']) {
  const img = images[name], colors = FULL_PRESETS.find(p => p.id === id).colors, o = { dither: '8x8', ditherStrength: 50 };
  const pa = H.preparePalette(colors), pc = C.preparePalette(colors), ta = [], tc = [];
  for (let i = 0; i < 9; i++) { // alternate order
    let s = performance.now(); H.quantize(img, pa, 128, undefined, undefined, o); ta.push(performance.now() - s);
    s = performance.now(); C.quantize(img, pc, 128, undefined, undefined, o); tc.push(performance.now() - s);
  }
  report.timing[`${name} ${id}`] = { headMs: +median(ta.slice(1)).toFixed(2), pruneMs: +median(tc.slice(1)).toFixed(2), headRange: [Math.min(...ta.slice(1)), Math.max(...ta.slice(1))].map(v => +v.toFixed(1)), pruneRange: [Math.min(...tc.slice(1)), Math.max(...tc.slice(1))].map(v => +v.toFixed(1)) };
}
console.log(JSON.stringify(report, null, 1));
