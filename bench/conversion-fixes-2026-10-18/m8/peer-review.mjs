// Independent read-only M8 peer audit. Run from repository root; SHARP_MODULE may name an installed Sharp directory.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateSync, crc32 } from 'node:zlib';
import assert from 'node:assert/strict';
import { palettePngBytes, palettePngBytesAsync, pngBytes } from '../../../src/lib/save.js';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE ?? 'sharp');
const sourceBase = new URL('../../../src/lib/save.js', import.meta.url);
const referenceCommit = '8a84b6c';
const referenceSource = execFileSync('git', ['show', referenceCommit + ':src/lib/save.js'], { encoding: 'utf8' });
const oldSource = referenceSource
  .replace(/from '([^']+)'/g, (_, path) => `from '${path === 'fflate' ? import.meta.resolve('fflate') : new URL(path, sourceBase).href}'`);
const old = await import('data:text/javascript;base64,' + Buffer.from(oldSource).toString('base64'));

function unpack(bytes) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks = new Map();
  let at = 8;
  while (at < bytes.length) {
    const n = data.getUint32(at), type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    assert.equal(crc32(bytes.subarray(at + 4, at + 8 + n)), data.getUint32(at + 8 + n));
    chunks.set(type, bytes.subarray(at + 8, at + 8 + n)); at += 12 + n;
  }
  assert.equal(at, bytes.length);
  const head = chunks.get('IHDR'), view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const w = view.getUint32(0), h = view.getUint32(4), depth = head[8], type = head[9];
  const raw = inflateSync(chunks.get('IDAT')), rgba = new Uint8Array(w * h * 4);
  const stride = 1 + Math.ceil(w * (type === 6 ? 32 : depth) / 8);
  assert.equal(raw.length, stride * h);
  const table = chunks.get('PLTE'), alpha = chunks.get('tRNS');
  assert.ok(type === 3 || type === 6);
  if (type === 3) {
    assert.ok([1, 2, 4, 8].includes(depth));
    assert.ok(table.length >= 3 && table.length % 3 === 0 && table.length <= 3 * 2 ** depth);
    assert.ok(!alpha || alpha.length <= table.length / 3);
  }
  for (let y = 0, p = 0; y < h; y++) {
    assert.equal(raw[y * stride], 0);
    for (let x = 0; x < w; x++, p++) {
      if (type === 6) rgba.set(raw.subarray(y * stride + 1 + x * 4, y * stride + 5 + x * 4), p * 4);
      else {
        const bit = x * depth, index = raw[y * stride + 1 + Math.floor(bit / 8)] >> (8 - depth - bit % 8) & ((1 << depth) - 1);
        assert.ok(index < table.length / 3);
        rgba.set([table[index * 3], table[index * 3 + 1], table[index * 3 + 2], alpha?.[index] ?? 255], p * 4);
      }
    }
  }
  return { rgba, w, h, depth, type, entries: table?.length / 3, chunks: [...chunks.keys()] };
}

let seed = 0xfedcba98;
const rand = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 2 ** 32 * max); };
const colors = Array.from({ length: 256 }, (_, n) => '#' + (n * 65536 + (255 - n) * 256 + ((n * 73) & 255)).toString(16).padStart(6, '0'));
function fixture(count, w, h, offset = false) {
  // Every pair is emitted at least once. Alpha zero uses dedicated empty index.
  const pairs = Array.from({ length: count }, (_, i) => i === 0 ? count > 1 ? [256, 0] : [255, 128]
    : [255 - Math.floor((i - 1) / 255), 1 + ((i - 1) % 255)]);
  const indices = new Uint16Array(new ArrayBuffer((w * h + (offset ? 3 : 0)) * 2), offset ? 6 : 0, w * h);
  const alpha = new Uint8Array(new ArrayBuffer(w * h + (offset ? 5 : 0)), offset ? 5 : 0, w * h);
  for (let p = 0; p < indices.length; p++) [indices[p], alpha[p]] = pairs[p < count ? p : rand(count)];
  return { colors, w, h, indices, alpha };
}

const receipts = [];
for (const count of [1, 2, 3, 4, 5, 15, 16, 17, 127, 128, 255, 256, 257]) {
  for (const w of [3, 7, 17, 257]) {
    const h = Math.max(3, Math.ceil(16384 / w)), image = fixture(count, w, h, (count & 1) === 1);
    const expected = old.palettePngBytes(image), before = unpack(expected), now = palettePngBytes(image), actual = unpack(now);
    assert.deepEqual(actual.rgba, before.rgba, `stored RGBA states=${count} w=${w}`);
    assert.ok(now.length <= expected.length, `size gate states=${count} w=${w}`);
    const independent = await sharp(now).ensureAlpha().raw().toBuffer();
    assert.deepEqual(independent, Buffer.from(actual.rgba), `Sharp stored RGBA states=${count} w=${w}`);
    if (count <= 256 && actual.type === 3) assert.equal(actual.depth, count <= 2 ? 1 : count <= 4 ? 2 : count <= 16 ? 4 : 8);
    if (count === 257) assert.equal(actual.type, 6);
    if ([1, 2, 3, 16, 17, 256, 257].includes(count) && w === 17) assert.deepEqual(await palettePngBytesAsync(image), now, 'async bytes');
    receipts.push({ count, w, h, before: expected.length, after: now.length, type: actual.type, depth: actual.depth, entries: actual.entries });
  }
}

for (const first of [null, '#000000', '#e1a583']) for (const second of [null, '#000000', '#e1a583']) {
  if (first === null && second === null) continue;
  for (const roles of [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]]) {
    const w = 257, h = 3, mask = Uint8Array.from({ length: w * h }, (_, p) => roles[p % roles.length]);
    const image = { w, h, mask, first, second }, bytes = pngBytes(image), prior = old.pngBytes(image);
    assert.deepEqual(unpack(bytes).rgba, unpack(prior).rgba, 'legacy stored hidden RGB');
    const independent = await sharp(bytes).ensureAlpha().raw().toBuffer();
    assert.deepEqual(independent, Buffer.from(unpack(bytes).rgba), 'legacy Sharp hidden RGB');
    receipts.push({ legacy: true, first, second, roles, before: prior.length, after: bytes.length, depth: bytes[24] });
  }
}

for (const [w, h] of [[262143, 1], [512, 512], [262145, 1], [513, 512]]) {
  const image = { w, h, first: '#e1a583', second: '#004477',
    mask: Uint8Array.from({ length: w * h }, () => 1 + rand(2)) };
  const bytes = pngBytes(image), before = old.pngBytes(image), actual = unpack(bytes);
  assert.deepEqual(actual.rgba, unpack(before).rgba, 'exact cap-boundary stored RGBA');
  assert.deepEqual(await sharp(bytes).ensureAlpha().raw().toBuffer(), Buffer.from(actual.rgba), 'cap-boundary Sharp');
  assert.equal(actual.depth, w * h <= 262144 ? 1 : 2);
  if (w * h > 262144) assert.equal(bytes.length, before.length + 13, 'large tagged baseline only');
  receipts.push({ legacyCap: true, w, h, pixels: w * h, before: before.length, after: bytes.length, depth: actual.depth });
}

for (const image of [
  { w: 33, h: 9, colors: ['#000000'], indices: Uint16Array.from({ length: 297 }, (_, p) => p % 5 ? 0 : 256),
    alpha: Uint8Array.from({ length: 297 }, (_, p) => p % 5 ? [0, 1, 127, 254, 255][p % 5] : 0) },
  { w: 257, h: 11, colors, indices: Uint16Array.from({ length: 2827 }, (_, p) => p % 257 === 256 ? 0 : p % 257),
    alpha: Uint8Array.from({ length: 2827 }, (_, p) => p % 257 === 256 ? 128 : 255) },
]) {
  const before = old.palettePngBytes(image), bytes = palettePngBytes(image), actual = unpack(bytes);
  assert.deepEqual(actual.rgba, unpack(before).rgba, 'black entries / all256 RGB + one partial state');
  assert.deepEqual(await sharp(bytes).ensureAlpha().raw().toBuffer(), Buffer.from(actual.rgba));
  assert.deepEqual(await palettePngBytesAsync(image), bytes);
  assert.ok(bytes.length <= before.length);
  receipts.push({ special: image.colors.length === 1 ? 'black-alpha-states' : '256opaque-plus-partial', before: before.length, after: bytes.length, type: actual.type, depth: actual.depth });
}

for (const bad of ['empty-with-alpha', 'visible-zero', 'index257']) {
  const image = fixture(257, 263, 3), p = image.indices.length - 1;
  if (bad === 'empty-with-alpha') { image.indices[p] = 256; image.alpha[p] = 1; }
  if (bad === 'visible-zero') { image.indices[p] = 255; image.alpha[p] = 0; }
  if (bad === 'index257') { image.indices[p] = 257; image.alpha[p] = 1; }
  assert.throws(() => palettePngBytes(image));
  await assert.rejects(palettePngBytesAsync(image));
}
const wide = fixture(5, 65539, 1);
assert.deepEqual(unpack(await palettePngBytesAsync(wide)).rgba, unpack(old.palettePngBytes(wide)).rgba, 'wide cooperative packing');
const aborted = new AbortController(); aborted.abort();
await assert.rejects(palettePngBytesAsync(wide, { signal: aborted.signal }), { name: 'AbortError' });
const sha = value => createHash('sha256').update(value).digest('hex');
const result = { referenceCommit, referenceSourceSha256: sha(referenceSource), sourceSha256: sha(readFileSync(sourceBase)), stateHelperSha256: sha(readFileSync(new URL('../../../src/lib/png-alpha-states.js', import.meta.url))), node: process.version, cases: receipts.length, checks: ['Complete stored RGBA including hidden RGB at alpha0', 'Independent Node inflate/CRC and Sharp decode', 'Palette complete PNG size <= frozen baseline', 'State thresholds and minimum packed depths', '256/257-state boundary', 'High source indices and offset buffer views', '65539-wide async packing', 'Late invalid alpha/index rejection after overflow', 'Pre-abort'], receipts, passed: true };
writeFileSync(new URL('./peer-review-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cases: receipts.length, passed: true }));
