import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const here = import.meta.dirname, root = path.resolve(here, '../../..');
const baseline = '217cb64360784c066e944f8121858d7726f0e4f2';
const raw = execFileSync('git', ['show', `${baseline}:src/lib/quantize.js`], { cwd: root, encoding: 'utf8' });
const copy = raw.replace(/from '(\.\/[^']+)'/g, (_, relative) => `from '${pathToFileURL(path.resolve(root, 'src/lib', relative)).href}'`);
const oldPath = path.join(here, 'quantize.baseline.js');
await writeFile(oldPath, copy);
// D1 is rejected/restored. Replay its retained candidate, never accidentally
// compare the production baseline with itself after the audit rolls back.
const candidatePath = process.env.CANDIDATE_SOURCE || path.join(here, 'quantize.candidate.js');
const candidateRaw = await readFile(candidatePath, 'utf8');
const candidateRuntime = path.join(here, 'quantize.candidate.runtime.js');
await writeFile(candidateRuntime, candidateRaw.replace(/from '(\.\/[^']+)'/g, (_, relative) => `from '${pathToFileURL(path.resolve(root, 'src/lib', relative)).href}'`));
const old = await import(pathToFileURL(oldPath).href), now = await import(pathToFileURL(candidateRuntime).href);
const hash = value => createHash('sha256').update(value).digest('hex');
const report = { baseline, candidatePath: path.relative(root, candidatePath), candidateStatus: 'rejected research, not production', baselineHash: hash(raw), candidateHash: hash(candidateRaw), cases: 0, sourcePixels: 0, comparedOutputPixels: 0, scalarNearestCases: 0, asyncCases: 0, cancellationChecks: 0, errors: [] };

const hex = n => '#' + n.toString(16).padStart(6, '0');
let seed = 0x413a209;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 24; };
function lab([r, g, b]) {
  [r, g, b] = [r, g, b].map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function scalar(source, colors, mw, mh, metric, alphaMode, cut) {
  const channels = colors.map(color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)));
  const points = metric === 'rgb' ? channels : channels.map(lab), result = [];
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const p = (Math.floor((y + .5) * source.height / mh) * source.width + Math.floor((x + .5) * source.width / mw)) * 4;
    const rgba = source.data.slice(p, p + 4);
    if (rgba[3] < (alphaMode === 'keep' ? 1 : cut)) { result.push(256); continue; }
    const exact = channels.findIndex(c => c.every((v, i) => v === rgba[i]));
    if (exact >= 0) { result.push(exact); continue; }
    const point = metric === 'rgb' ? rgba : lab(rgba);
    let best = Infinity, index = 0;
    for (let i = 0; i < points.length; i++) { const d = (points[i][0] - point[0]) ** 2 + (points[i][1] - point[1]) ** 2 + (points[i][2] - point[2]) ** 2; if (d < best) { best = d; index = i; } }
    result.push(index);
  }
  return result;
}

try {
  for (const [w, h] of [[1, 1], [1, 17], [19, 1], [11, 7], [31, 19]]) {
    const dimensions = [...new Map([[w, h], [w, Math.max(1, h >> 1)], [Math.max(1, w >> 1), h], [Math.max(1, w >> 1), Math.max(1, h >> 1)], [1, 1]].map(a => [a.join('x'), a])).values()];
    for (const count of [1, 2, 4, 16, 64, 256]) {
      const colors = Array.from({ length: count }, (_, i) => hex(i * 65111));
      const data = Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => i % 4 === 3 ? [0, 1, 127, 128, 129, 254, 255][Math.floor(i / 4) % 7] : random());
      // Insert exact matches among random/nonexact RGBs, including alpha boundaries.
      for (let p = 0; p < w * h; p += 11) { const c = colors[p % colors.length]; for (let k = 0; k < 3; k++) data[p * 4 + k] = parseInt(c.slice(1 + k * 2, 3 + k * 2), 16); }
      const source = { width: w, height: h, data };
      for (const [mw, mh] of dimensions) for (const metric of ['oklab', 'rgb']) for (const alphaMode of ['cut', 'keep']) for (const cut of [1, 128, 255]) for (const [dither, ditherStrength] of [['none', 50], ['2x2', 0], ['4x4', 50], ['8x8', 100]]) {
        const settings = { metric, alphaMode, dither, ditherStrength }, label = JSON.stringify({ w, h, mw, mh, count, cut, ...settings });
        const before = old.quantize(source, colors, cut, mw, mh, settings), after = now.quantize(source, colors, cut, mw, mh, settings);
        assert.deepEqual(after, before, label);
        if (dither === 'none' || ditherStrength === 0 || count === 1) { assert.deepEqual([...after.indices], scalar(source, colors, mw, mh, metric, alphaMode, cut), 'scalar ' + label); report.scalarNearestCases++; }
        if (cut === 128 && (dither === 'none' || dither === '4x4')) { assert.deepEqual(await now.quantizeAsync(source, colors, cut, mw, mh, settings), before, 'async ' + label); report.asyncCases++; }
        report.cases++; report.sourcePixels += w * h; report.comparedOutputPixels += mw * mh;
      }
    }
  }
  for (const implementation of [old, now]) for (const metric of ['oklab', 'rgb']) {
    let reads = 0; const pre = new AbortController(); pre.abort();
    await assert.rejects(implementation.quantizePreviewAsync({ width: 1, height: 1, get data() { reads++; return Uint8ClampedArray.of(1, 2, 3, 255); } }, ['#000000'], 128, undefined, undefined, { signal: pre.signal, metric }), { name: 'AbortError' });
    assert.equal(reads, 0);
    const during = new AbortController(), source = { width: 256, height: 256, data: Uint8ClampedArray.from({ length: 256 * 256 * 4 }, (_, i) => i % 4 === 3 ? 255 : i % 251) };
    await assert.rejects(implementation.quantizeAsync(source, ['#000000', '#ffffff'], 128, undefined, undefined, { signal: during.signal, metric, onProgress() { during.abort(); } }), { name: 'AbortError' });
    report.cancellationChecks += 2;
  }
} catch (error) { report.errors.push(error.stack); process.exitCode = 1; }
report.notes = ['Differential frozen baseline module imports unchanged production dependencies; candidate changes are restricted to quantize.js.', 'Independent scalar nearest matcher computes source-center coordinates and matching from arrays, without prepared tables/memos or candidate imports. Dither uses frozen differential parity, not an independent algorithm oracle.', 'Typed result equality includes every index, used flag, transparency bit, dimensions and Keep alpha byte. No performance claim follows from this correctness run.'];
await writeFile(path.join(here, 'quantize-differential-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
