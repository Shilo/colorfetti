// Run from the repository root. SHARP_MODULE may point to a supplied Sharp.
// Generated reference module / image bytes stay under ignored task temp paths.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { palettePngBytes, pngBytes } from '../../../src/lib/save.js';
import { keepFixture, boundaryFixture, legacyFixture, rgbaOf, sizeGateFixture } from './fixtures.mjs';
import { readPng, taggedLegacyReference } from './png-oracle.mjs';
const sharpLocation = process.env.SHARP_MODULE ?? 'sharp';
const sharp = (await import(isAbsolute(sharpLocation) ? pathToFileURL(sharpLocation) : sharpLocation)).default;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let reference = execFileSync('git', ['show', 'cdca311:src/lib/save.js'], { encoding: 'utf8' });
const referenceHash = sha(reference);
reference = reference.replace(/from '(\.\/[^']+)'/g, (_, path) => `from '${pathToFileURL(resolve('src/lib', path)).href}'`);
const referenceFile = resolve('.tmp/m8-save-reference.mjs'); writeFileSync(referenceFile, reference);
const old = await import(pathToFileURL(referenceFile));
const keep400k = keepFixture(); keep400k.w = 800; keep400k.h = 500;
keep400k.indices = Uint16Array.from({ length: 400000 }, (_, p) => keep400k.indices[p % 262144]);
keep400k.alpha = Uint8Array.from({ length: 400000 }, (_, p) => keep400k.alpha[p % 262144]);
const binary = { ...keepFixture(), alpha: undefined };
const flat = { w: 512, h: 512, colors: ['#a1b2c3'], indices: new Uint16Array(262144), alpha: new Uint8Array(262144).fill(127) };
const tiny = { w: 1, h: 1, colors: ['#c1482e'], indices: Uint16Array.of(0), alpha: Uint8Array.of(128) };
const workloads = [['keep128-262K', keepFixture()], ['keep128-400K', keep400k], ['keep256-odd', boundaryFixture(256)],
  ['keep257-fallback', boundaryFixture(257)], ['flatKeep', flat], ['tinyKeep', tiny], ['compressedCandidateLoses', sizeGateFixture()], ['binaryPalette', binary],
  ['legacyOpaque', legacyFixture()], ['legacyNone', legacyFixture('none')], ['legacyThree', legacyFixture('three')],
  ['legacyTinyThree', { w: 3, h: 1, mask: Uint8Array.of(0, 1, 2), first: '#f6dfa4', second: '#0b0a0c' }]];
const results = [];
for (const [id, image] of workloads) {
  const before = image.colors ? old.palettePngBytes : old.pngBytes, after = image.colors ? palettePngBytes : pngBytes;
  const b = before(image), a = after(image), decoded = readPng(a), expected = readPng(b).pixels;
  const partial = image.alpha?.some(value => value > 0 && value < 255);
  assert.deepEqual(decoded.pixels, expected, id + ' stored RGBA');
  const independent = await sharp(a).ensureAlpha().raw().toBuffer(); assert.deepEqual(new Uint8Array(independent), expected, id + ' Sharp RGBA');
  if (partial) assert.deepEqual(decoded.pixels, rgbaOf(image), id + ' authored RGBA');
  const sizeBaseline = image.colors ? b : taggedLegacyReference(image);
  assert.ok(a.length <= sizeBaseline.length, id + ' size gate');
  const raw = { before: [], after: [] };
  for (let pass = 0; pass < 12; pass++) for (const name of pass % 2 ? ['after', 'before'] : ['before', 'after']) {
    const start = performance.now(); (name === 'before' ? before : after)(image);
    if (pass >= 3) raw[name].push(performance.now() - start);
  }
  const median = values => [...values].sort((x, y) => x - y)[values.length >> 1];
  results.push({ id, width: image.w, height: image.h, beforeBytes: b.length, taggedBaselineBytes: sizeBaseline.length,
    afterBytes: a.length, depth: decoded.depth, type: decoded.type, exactStoredRGBA: true, sharpRGBA: true,
    beforeSha256: sha(b), afterSha256: sha(a), timingMs: raw,
    mediansMs: { before: median(raw.before), after: median(raw.after), ratio: median(raw.after) / median(raw.before) },
    logicalArrays: image.colors ? { baselineRows: readPng(b).raw.length,
      candidateRowsUpperBound: partial && b.length > 104 ? (image.w + 1) * image.h : 0, stateLookupAndTables: partial && b.length > 104 ? 132354 : 0,
      retainedBetweenPasses: 'only encoded baseline plus state tables; raw rows explicitly cleared' }
      : { baselineRows: (Math.ceil(image.w / 4) + 1) * image.h, candidateRows: (Math.ceil(image.w / 8) + 1) * image.h } });
}
const receipt = { referenceCommit: 'cdca311', referenceSourceSha256: referenceHash, sourceSha256: sha(readFileSync('src/lib/save.js')),
  stateHelperSha256: sha(readFileSync('src/lib/png-alpha-states.js')), node: process.version, compressor: 'same installed fflate zlibSync level3',
  memoryNote: 'Logical arrays, not whole heap: compressed payload/chunk/result copies coexist during PNG assembly. Raw row buffers serialize; no per-pixel state-index allocation.', results };
writeFileSync('bench/conversion-fixes-2026-10-18/m8/probe-results.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(results.map(({ id, beforeBytes, afterBytes, mediansMs }) => ({ id, beforeBytes, afterBytes, ratio: mediansMs.ratio })), null, 2));
