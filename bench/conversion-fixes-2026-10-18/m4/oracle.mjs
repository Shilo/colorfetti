import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { unzipSync } from 'fflate';
import { fixture } from './fixtures.mjs';
import { decodeGif, encodeGifAsync, encodePaletteGif } from '../../../src/lib/gif.js';
const require = createRequire(import.meta.url);
const modulePath = process.env.SHARP_MODULE ?? 'sharp';
const sharp = require(modulePath), report = { node: process.version, oracle: sharp.versions, cases: [], actualUI: [] };
const raw = bytes => sharp(bytes, { animated: true }).ensureAlpha().raw().toBuffer();
const total = repeat => repeat === 0 ? 0 : (repeat ?? 0) + 1;
for (const identifier of ['NETSCAPE2.0', 'ANIMEXTS1.0']) for (const repeat of [null, 0, 1, 2, 65535]) {
  const bytes = fixture({ identifier, repeat }), decoded = decodeGif(bytes), metadata = await sharp(bytes, { animated: true }).metadata();
  assert.equal(decoded.loop, repeat); assert.equal(metadata.loop, total(repeat));
  assert.deepEqual(metadata.delay, decoded.frames.map(f => f.delay));
  const frames = decoded.frames.map(f => ({ indices: Uint16Array.from({ length: 2 }, (_, p) => f.data[p * 4] ? 1 : 0), delay: f.delay }));
  const palette = await encodePaletteGif({ w: 2, h: 1, colors: ['#000000', '#ffffff'], frames, loop: decoded.loop });
  const onebit = await encodeGifAsync({ w: 2, h: 1, first: '#000000', second: '#ffffff', loop: decoded.loop,
    frames: frames.map(f => ({ mask: Uint8Array.from(f.indices, n => n + 1), delay: f.delay })) });
  for (const saved of [palette, onebit]) {
    const savedMetadata = await sharp(saved, { animated: true }).metadata();
    assert.equal(savedMetadata.loop, metadata.loop); assert.deepEqual(savedMetadata.delay, metadata.delay);
    assert.deepEqual(await raw(saved), await raw(bytes));
  }
  report.cases.push({ identifier, inputRepeat: repeat, independentTotalPlays: metadata.loop, delays: metadata.delay, exactAllRGBA: true });
}
const path = name => new URL(name, import.meta.url);
const expected = fixture(), expectedMetadata = await sharp(expected, { animated: true }).metadata(), expectedRGBA = await raw(expected);
async function checkUI(name, bytes) {
  const metadata = await sharp(bytes, { animated: true }).metadata();
  assert.equal(metadata.loop, 3); assert.equal(metadata.pages, 2); assert.equal(metadata.width, 2); assert.equal(metadata.pageHeight, 1);
  assert.deepEqual(metadata.delay, [100, 200]); assert.deepEqual(await raw(bytes), expectedRGBA);
  report.actualUI.push({ name, bytes: bytes.length, repeats: decodeGif(bytes).loop, independentTotalPlays: metadata.loop,
    pages: metadata.pages, width: metadata.width, frameHeight: metadata.pageHeight, delays: metadata.delay, exactAllRGBA: true });
}
await checkUI('Individual Palette Save', readFileSync(path('after-ui-animexts-finite-colorfetti.gif')));
const zip = unzipSync(readFileSync(path('after-ui-colorfetti.zip')));
assert.deepEqual(Object.keys(zip), ['animexts-finite-colorfetti.gif', 'animexts-finite-2-colorfetti.gif']);
for (const [name, bytes] of Object.entries(zip)) await checkUI('Save all ZIP: ' + name, bytes);
assert.equal(expectedMetadata.loop, 3);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
report.sourceSHA256 = Object.fromEntries(['src/lib/gif.js', 'src/lib/gif-loop.test.js',
  'bench/conversion-fixes-2026-10-18/m4/browser.mjs'].map(path => [path, hash(path)]));
report.buildSHA256 = {};
for (const phase of ['before', 'after']) {
  const root = `.tmp/conversion-fixes-m4-${phase}`, hashes = {};
  function visit(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name); if (entry.isDirectory()) visit(path);
    else hashes[relative(root, path).replaceAll('\\', '/')] = hash(path);
  } }
  visit(root); report.buildSHA256[phase] = hashes;
}
writeFileSync(path('oracle-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: report.cases, actualUI: report.actualUI }, null, 2));
