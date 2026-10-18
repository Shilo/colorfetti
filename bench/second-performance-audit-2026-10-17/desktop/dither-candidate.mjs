// Hypothesis check only (no production edit): in mixturePlan, the Oklab of each candidate
// pair mixture depends only on (ordered pair, weight, grid), not on the pixel. A per-job
// lazy cache of those Oklab triples should give bit-identical plans with far fewer cbrt calls.
// Materializes patched copies under .tmp and compares quantize() indices exactly.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {decode} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../../src/lib/palette-library.js';
const src = path.resolve(import.meta.dirname, '../../../src/lib'), tmp = path.resolve('.tmp/second-audit-2026-10-17/dither-candidate');
mkdirSync(tmp, {recursive: true});
const rewrite = s => s.replace(/from '\.\/(palette-library|palette-dither-settings|palette-alpha)\.js'/g, (_, m) => `from '${pathToFileURL(path.join(src, m + '.js')).href}'`);
let dither = readFileSync(path.join(src, 'palette-dither.js'), 'utf8');
const before = `      lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, mixed, 0);
      const error = (tl - mixed[0]) ** 2 + (ta - mixed[1]) ** 2 + (tblue - mixed[2]) ** 2`;
const after = `      // Candidate: pair-mixture Oklab is pixel-independent; cache per ordered pair/weight.
      let row = d.mix.get(ai * 256 + bi), o = weight * 3;
      if (row === undefined && d.mix.size < 4096) d.mix.set(ai * 256 + bi, row = new Float64Array(cells * 3).fill(NaN));
      const out = row ?? mixed; if (!row) o = 0;
      if (!row || row[o] !== row[o]) lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, out, o);
      const error = (tl - out[o]) ** 2 + (ta - out[o + 1]) ** 2 + (tblue - out[o + 2]) ** 2`;
if (!dither.includes(before)) throw Error('patch anchor missing');
dither = dither.replace(before, after).replace('pointErrors: new Float64Array(4), mixed: new Float64Array(3) };', 'pointErrors: new Float64Array(4), mixed: new Float64Array(3), mix: new Map() };');
for (const [dir, d] of [['base', readFileSync(path.join(src, 'palette-dither.js'), 'utf8')], ['cand', dither]]) {
  mkdirSync(path.join(tmp, dir), {recursive: true});
  writeFileSync(path.join(tmp, dir, 'palette-dither.js'), d);
  writeFileSync(path.join(tmp, dir, 'quantize.js'), rewrite(readFileSync(path.join(src, 'quantize.js'), 'utf8')));
}
const base = await import(pathToFileURL(path.join(tmp, 'base/quantize.js')).href), cand = await import(pathToFileURL(path.join(tmp, 'cand/quantize.js')).href);
const img = async f => { const d = await decode(readFileSync(f)); return {width: d.w, height: d.h, data: new Uint8ClampedArray(d.frames[0])}; };
const images = {entropy512: await img(path.join(import.meta.dirname, 'fixtures/entropy512.png')), sheet1024: await img('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-1024.png')};
const diag = JSON.parse(readFileSync(path.join(import.meta.dirname, 'diagnostic-manifest.json'), 'utf8'));
const palettes = {res64: FULL_PRESETS.find(p => p.id === 'preset-res64').colors, pico8: FULL_PRESETS.find(p => p.id === 'preset-pico8')?.colors ?? FULL_PRESETS[3].colors, p256: diag.palette256};
const rows = [];
let cases = 0, mismatches = 0;
for (const [iname, image] of Object.entries(images)) for (const [pname, colors] of Object.entries(palettes)) {
  const pb = base.preparePalette(colors), pc = cand.preparePalette(colors);
  for (const dither of ['2x2', '4x4', '8x8']) for (const metric of ['oklab', 'rgb']) for (const ditherStrength of [1, 50, 100]) {
    const o = {metric, dither, ditherStrength};
    const a = base.quantize(image, pb, 128, undefined, undefined, o), b = cand.quantize(image, pc, 128, undefined, undefined, o);
    cases++; let diff = 0; for (let i = 0; i < a.indices.length; i++) if (a.indices[i] !== b.indices[i]) diff++;
    if (diff || a.used.some((v, i) => v !== b.used[i])) mismatches++;
    if (iname === 'entropy512' && pname === 'res64' && ditherStrength === 50 || iname === 'sheet1024' && pname === 'res64' && dither === '4x4' && ditherStrength === 50) {
      const time = q => { const t = []; for (let k = 0; k < 5; k++) { const s = performance.now(); q.quantize(image, q === base ? pb : pc, 128, undefined, undefined, o); t.push(performance.now() - s); } return t.sort((x, y) => x - y)[2]; };
      rows.push({image: iname, palette: pname, dither, metric, strength: ditherStrength, baseMedianMs: +time(base).toFixed(1), candMedianMs: +time(cand).toFixed(1), diffPixels: diff});
    }
  }
}
const result = {hypothesis: 'mixturePlan pair-mixture Oklab cache per ordered (ai,bi,weight); bounded 4096 pairs per job, else direct compute', cases, mismatches, exact: mismatches === 0, note: 'Node, host shared with another agent: timings indicative only; not a browser or phone measurement', rows};
writeFileSync(path.join(import.meta.dirname, 'dither-candidate.json'), JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(result, null, 1));
