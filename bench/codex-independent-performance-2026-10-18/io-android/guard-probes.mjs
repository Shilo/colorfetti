import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { sourceColorSummary, summaryHistogram } from '../../../src/lib/source-color-summary.js';
import { palettePngBytes, palettePngBytesAsync } from '../../../src/lib/save.js';
import { decode, compare } from '../../claude-audit-2026-10-15/device/audit-lib.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const rows = [], image = (count, offset = 0, alpha = 255) => ({ width: count, height: 1,
  data: Uint8ClampedArray.from({ length: count * 4 }, (_, p) => p % 4 === 3 ? alpha : ((Math.floor(p / 4) + offset) >>> ((2 - p % 4) * 8)) & 255) });
const rawHistogram = frames => {
  const map = new Map();
  for (const { original, weight } of frames) for (let p = 0; p < original.data.length; p += 4) {
    if (!original.data[p + 3]) continue;
    const rgb = original.data[p] * 65536 + original.data[p + 1] * 256 + original.data[p + 2];
    map.set(rgb, (map.get(rgb) || 0) + weight);
  }
  return map;
};
const full = image(4096), next = image(1, 4096), partial = image(3, 0, 254), empty = image(3, 0, 0);
for (const original of [full, next, partial, empty]) await sourceColorSummary(original);
for (const count of [1, 16, 17]) {
  const frames = Array.from({ length: count }, (_, i) => ({ original: full, weight: i + 1 }));
  const got = summaryHistogram(frames);
  assert.equal(got !== null, count <= 16);
  if (got) {
    const expected = rawHistogram(frames), actual = new Map();
    for (let p = 0; p < got.weights.length; p++) actual.set(got.data[p * 4] * 65536 + got.data[p * 4 + 1] * 256 + got.data[p * 4 + 2], got.weights[p]);
    assert.deepEqual(actual, expected);
  }
  rows.push({ case: `summary entries ${count * 4096}`, fastPath: got !== null, exactWeights: got ? true : undefined });
}
for (const [name, frames] of [
  ['union4097', [{ original: full, weight: 1 }, { original: next, weight: 1 }]],
  ['partialalpha', [{ original: partial, weight: 1 }]],
  ['fractionaldelay', [{ original: full, weight: 1.5 }]],
  ['unsafetotal', [{ original: full, weight: 2 ** 52 }]],
  ['missing', [{ original: image(1), weight: 1 }]],
]) { assert.equal(summaryHistogram(frames), null); rows.push({ case: name, fallback: true }); }
assert.equal(summaryHistogram([{ original: empty, weight: 1 }]).data.length, 0);
rows.push({ case: 'empty', exactEmpty: true });

const colors = Array.from({ length: 256 }, (_, i) => '#' + (i * 65793).toString(16).padStart(6, '0'));
for (const [name, w, h, partialAlpha] of [['indexed65535', 254, 257, false], ['indexed65536', 255, 256, false], ['rgba65537', 16384, 1, true], ['indexedAbove', 256, 256, false]]) {
  const indices = Uint16Array.from({ length: w * h }, (_, p) => p % 256), alpha = partialAlpha ? Uint8Array.from({ length: w * h }, (_, p) => p % 254 + 1) : undefined;
  const input = { w, h, colors, indices, ...(alpha ? { alpha } : {}) };
  const sync = palettePngBytes(input), async = await palettePngBytesAsync(input);
  assert.deepEqual(async, sync);
  const chunks = []; for (let at = 8; at < async.length;) { const size = new DataView(async.buffer, async.byteOffset + at, 4).getUint32(0); if (Buffer.from(async.subarray(at + 4, at + 8)).toString() === 'IDAT') chunks.push(async.subarray(at + 8, at + 8 + size)); at += size + 12; }
  const filtered = inflateSync(Buffer.concat(chunks));
  const filteredBytes = ((partialAlpha ? w * 4 : w) + 1) * h;
  assert.equal(filtered.length, filteredBytes);
  const decoded = await decode(async), expected = new Uint8Array(w * h * 4);
  for (let p = 0; p < indices.length; p++) { expected[p * 4] = expected[p * 4 + 1] = expected[p * 4 + 2] = indices[p]; expected[p * 4 + 3] = alpha ? alpha[p] : 255; }
  assert.deepEqual(compare(decoded.frames[0], expected), { alphaMismatch: 0, rgbMismatch: 0, first: null });
  rows.push({ case: name, w, h, filteredBytes, branch: filteredBytes <= 65536 ? 'synchronous' : 'worker', byteEqual: true, independentlyDecodedEqual: true, sha256: sha(async) });
}
await writeFile(new URL('./guard-probes.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), rows, productionEdits: false }, null, 2) + '\n');
console.log(JSON.stringify({ passed: rows.length, rows }));
