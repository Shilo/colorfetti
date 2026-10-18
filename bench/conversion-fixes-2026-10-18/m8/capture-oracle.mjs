// Independent verification of bytes captured only at actual App download transport.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipSync } from 'fflate';
import { keepFixture, rgbaOf } from './fixtures.mjs';
import { readPng } from './png-oracle.mjs';
const location = process.env.SHARP_MODULE ?? 'sharp', sharp = (await import(isAbsolute(location) ? pathToFileURL(location) : location)).default;
const dir = resolve('bench/conversion-fixes-2026-10-18/m8'), sha = bytes => createHash('sha256').update(bytes).digest('hex'), expected = rgbaOf(keepFixture());
const captures = [], pixels = new Map(), largeLegacy = new Map();
for (const phase of ['before', 'after']) {
  const manifest = JSON.parse(readFileSync(join(dir, `${phase}-captures.json`))), pngs = [];
  for (const capture of manifest) {
    assert.match(capture.artifact, /^(before|after)-capture-\d+\.bin$/);
    const bytes = new Uint8Array(readFileSync(join(dir, capture.artifact)));
    assert.equal(bytes.length, capture.bytes);
    if (/^legacy(?:4m)?-/.test(capture.name)) { largeLegacy.set(phase, { ...capture, data: bytes }); continue; }
    if (!capture.name.startsWith('keep-')) continue;
    if (capture.name.endsWith('.zip')) {
      const entries = unzipSync(bytes); assert.equal(Object.keys(entries).length, 2);
      for (const [name, data] of Object.entries(entries)) pngs.push({ transport: 'actual App Save all ZIP', name, bytes: data });
    } else { assert.ok(capture.name.endsWith('.png')); pngs.push({ transport: 'actual App Save', name: capture.name, bytes }); }
    captures.push({ phase, transportName: capture.name, bytes: bytes.length, sha256: sha(bytes) });
  }
  assert.equal(pngs.length, 3);
  for (const one of pngs) {
    const decoded = readPng(one.bytes), independent = new Uint8Array(await sharp(one.bytes).ensureAlpha().raw().toBuffer());
    assert.deepEqual(decoded.pixels, expected, `${phase}/${one.name} independent chunks authored RGBA`);
    assert.deepEqual(independent, expected, `${phase}/${one.name} Sharp authored RGBA`);
    pixels.set(phase, sha(independent));
    captures.push({ phase, transport: one.transport, name: one.name, bytes: one.bytes.length, sha256: sha(one.bytes),
      width: decoded.w, height: decoded.h, depth: decoded.depth, type: decoded.type, exactStoredRgba: true, sharpRgba: true });
  }
}
assert.equal(pixels.get('before'), pixels.get('after'));
if (largeLegacy.size) {
  assert.equal(largeLegacy.size, 2, 'both actual large legacy captures are required');
  const before = largeLegacy.get('before'), after = largeLegacy.get('after'), a = readPng(before.data), b = readPng(after.data);
  assert.equal(a.w, 2048); assert.equal(a.h, 2048); assert.equal(a.depth, 2); assert.equal(b.depth, 2);
  assert.ok(!a.chunks.has('sRGB')); assert.deepEqual(b.chunks.get('sRGB'), Uint8Array.of(0));
  assert.deepEqual(a.pixels, b.pixels); assert.equal(after.bytes, before.bytes + 13);
  const parts = [after.data.subarray(0, 8)];
  for (let at = 8; at < after.data.length;) {
    const size = new DataView(after.data.buffer, after.data.byteOffset + at).getUint32(0), type = String.fromCharCode(...after.data.subarray(at + 4, at + 8));
    if (type !== 'sRGB') parts.push(after.data.subarray(at, at + size + 12)); at += size + 12;
  }
  assert.deepEqual(Buffer.concat(parts), Buffer.from(before.data), 'large legacy changes only the13B sRGB chunk');
  for (const [phase, one] of largeLegacy) {
    const independent = new Uint8Array(await sharp(one.data).ensureAlpha().raw().toBuffer()); assert.deepEqual(independent, a.pixels);
    captures.push({ phase, transport: 'actual App large legacy Save', name: one.name, bytes: one.bytes, sha256: sha(one.data),
      width: 2048, height: 2048, depth: 2, exactStoredRgba: true, sharpRgba: true, onlyAddedSrgbChunk: true });
  }
}
const builds = {};
for (const phase of ['before', 'after']) {
  const root = resolve(`.tmp/conversion-fixes-m8-${phase === 'after' ? 'after-v4' : phase}`), files = [];
  function visit(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name); if (entry.isDirectory()) visit(path); else { const bytes = readFileSync(path); files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }); }
  } }
  visit(root); files.sort((a, b) => a.path.localeCompare(b.path)); builds[phase] = { treeSha256: sha(JSON.stringify(files)), files };
}
const report = { verifiedAt: new Date().toISOString(), exactAuthoredRgbaSha256: sha(expected), captures, builds,
  saveSourceSha256: sha(readFileSync('src/lib/save.js')), helperSha256: sha(readFileSync('src/lib/png-alpha-states.js')),
  note: 'Native browser receipt verifies visible RGB and every alpha byte; these separate independent chunk/Sharp checks include hidden RGB. Build directories remained immutable during their in-memory frozen servers.' };
writeFileSync(join(dir, 'capture-oracle-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, images: captures.filter(one => one.exactStoredRgba).length, captures: captures.filter(one => one.transportName) }, null, 2));
