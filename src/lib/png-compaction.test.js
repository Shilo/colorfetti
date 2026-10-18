import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { palettePngBytes, palettePngBytesAsync, pngBytes } from './save.js';
import { createAlphaStates, addAlphaStates, minimumAlphaPngBytes } from './png-alpha-states.js';
import { readPng, taggedLegacyReference, pairedReference } from '../../bench/conversion-fixes-2026-10-18/m8/png-oracle.mjs';
import { boundaryFixture, keepFixture, legacyFixture, rgbaOf, sourcePng, sizeGateFixture, legacyGateFixture } from '../../bench/conversion-fixes-2026-10-18/m8/fixtures.mjs';

describe('exact PNG compaction', () => {
  it.each([2, 3, 4, 5, 16, 17, 256])('packs %i partial-alpha states at minimum depth without changing any RGBA byte', async count => {
    // All states use the same RGB, including many different alpha values; empty
    // occupies its own slot. Odd width exercises every final-byte boundary.
    const image = boundaryFixture(count), baseline = sourcePng(image);
    const sync = palettePngBytes(image), async = await palettePngBytesAsync(image), decoded = readPng(sync);
    expect(async).toEqual(sync); expect(decoded.pixels).toEqual(rgbaOf(image));
    expect(sync.length).toBeLessThanOrEqual(baseline.length);
    expect(decoded.type).toBe(3);
    expect(decoded.depth).toBe(count <= 2 ? 1 : count <= 4 ? 2 : count <= 16 ? 4 : 8);
    expect(decoded.chunks.get('sRGB')).toEqual(Uint8Array.of(0));
  });

  it('leaves all-empty binary Keep on its existing indexed path and hidden RGB convention', async () => {
    const image = boundaryFixture(1), bytes = palettePngBytes(image), decoded = readPng(bytes);
    expect(await palettePngBytesAsync(image)).toEqual(bytes);
    expect(decoded.type).toBe(3); expect(decoded.depth).toBe(1);
    expect([...decoded.pixels.subarray(0, 4)]).toEqual([193, 72, 46, 0]);
    for (let p = 3; p < decoded.pixels.length; p += 4) expect(decoded.pixels[p]).toBe(0);
  });

  it('counts only used RGBA states even when the selected target palette has256colors', async () => {
    const image = { w: 257, h: 11, colors: Array.from({ length: 256 }, (_, p) => '#' + (p * 65536 + 0xaabb).toString(16).padStart(6, '0')),
      indices: new Uint16Array(257 * 11).fill(200), alpha: new Uint8Array(257 * 11).fill(129) };
    const bytes = palettePngBytes(image), decoded = readPng(bytes);
    expect(decoded.type).toBe(3); expect(decoded.depth).toBe(1);
    expect(decoded.chunks.get('PLTE').length).toBe(3); expect(decoded.chunks.get('tRNS')).toEqual(Uint8Array.of(129));
    expect(decoded.pixels).toEqual(rgbaOf(image)); expect(await palettePngBytesAsync(image)).toEqual(bytes);
  });

  it('keeps 257 actual RGBA states losslessly in byte-identical RGBA8', async () => {
    const image = boundaryFixture(257), baseline = sourcePng(image);
    for (const bytes of [palettePngBytes(image), await palettePngBytesAsync(image)]) {
      expect(bytes).toEqual(baseline); expect(readPng(bytes).type).toBe(6);
      expect(readPng(bytes).pixels).toEqual(rgbaOf(image));
    }
  });

  it.each([2, 3, 5, 17])('resumes %i-state async packing mid-row and mid-byte across its65536pixelbatch', async states => {
    const w = 259, h = 257, indices = new Uint16Array(w * h), alpha = new Uint8Array(w * h); let seed = 91;
    for (let p = 0; p < indices.length; p++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const state = (seed >>> 16) % states;
      indices[p] = state ? 0 : 256; alpha[p] = state;
    }
    const image = { w, h, colors: ['#c1482e'], indices, alpha }, sync = palettePngBytes(image);
    expect(await palettePngBytesAsync(image)).toEqual(sync);
    expect(Buffer.from(readPng(sync).pixels).equals(Buffer.from(rgbaOf(image)))).toBe(true);
    expect(readPng(sync).depth).toBe(states === 2 ? 1 : states === 3 ? 2 : states === 5 ? 4 : 8);
  });

  it('keeps tiny Keep RGBA when indexed metadata would grow the complete file', async () => {
    const image = { w: 1, h: 1, colors: ['#a1b2c3'], indices: Uint16Array.of(0), alpha: Uint8Array.of(128) };
    expect(palettePngBytes(image)).toEqual(sourcePng(image));
    expect(await palettePngBytesAsync(image)).toEqual(sourcePng(image));
    expect(readPng(palettePngBytes(image)).type).toBe(6);
  });

  it('compacts the realistic 128-state workload and retains exact RGB and alpha', () => {
    const image = keepFixture(), baseline = sourcePng(image), bytes = palettePngBytes(image);
    expect(bytes.length).toBeLessThan(baseline.length * 0.7);
    expect(readPng(bytes).pixels).toEqual(rgbaOf(image));
  });

  it('rejects a genuinely encoded candidate that passes metadata floors but grows109 to118bytes', async () => {
    const image = sizeGateFixture(), baseline = sourcePng(image), candidate = pairedReference(image);
    expect(baseline.length).toBe(109); expect(candidate.length).toBe(118);
    expect(readPng(candidate).pixels).toEqual(rgbaOf(image));
    expect(palettePngBytes(image)).toEqual(baseline); expect(await palettePngBytesAsync(image)).toEqual(baseline);
  });

  it('validates late malformed alpha and indices beyond the 257-state overflow', async () => {
    const image = boundaryFixture(257);
    for (const change of [one => { one.indices[one.indices.length - 1] = 256; one.alpha[one.alpha.length - 1] = 128; },
      one => { one.indices[one.indices.length - 1] = 77; }]) {
      const one = { ...image, indices: image.indices.slice(), alpha: image.alpha.slice() }; change(one);
      expect(() => palettePngBytes(one)).toThrow(); await expect(palettePngBytesAsync(one)).rejects.toThrow();
    }
  });

  it('uses a dedicated empty slot and stores the 256th slot without wrapping', () => {
    const image = boundaryFixture(256), states = createAlphaStates(Uint32Array.of(0xc1482e, 0x267ae1));
    addAlphaStates(image.indices, image.alpha, states, 0, image.indices.length);
    expect(states.count).toBe(256); expect(states.overflow).toBe(false);
    expect(states.map[65536]).toBe(1); expect(states.map[255]).toBe(256);
    expect(states.table[0]).toBe(0); expect(states.alpha[0]).toBe(0);
    expect(minimumAlphaPngBytes(states)).toBeLessThan(palettePngBytes(image).length);
    expect(states.map.byteLength + states.table.byteLength + states.alpha.byteLength).toBe(132354);
  });

  it.each(['opaque', 'none', 'three'])('preserves all legacy %s RGBA including hidden RGB and never grows versus its tagged reference', kind => {
    const image = legacyFixture(kind, 259, 65), baseline = taggedLegacyReference(image), bytes = pngBytes(image);
    expect(readPng(bytes).pixels).toEqual(readPng(baseline).pixels);
    expect(bytes.length).toBeLessThanOrEqual(baseline.length);
    expect(readPng(bytes).depth).toBe(kind === 'three' ? 2 : 1);
    expect(readPng(bytes).chunks.get('sRGB')).toEqual(Uint8Array.of(0));
  });

  it('deduplicates equal legacy inks by actual RGBA while keeping empty transparent', () => {
    const image = { w: 97, h: 10, first: '#acbeef', second: '#acbeef', mask: Uint8Array.from({ length: 970 }, (_, p) => p % 3) };
    const bytes = pngBytes(image); expect(readPng(bytes).depth).toBe(1);
    expect(readPng(bytes).pixels).toEqual(readPng(taggedLegacyReference(image)).pixels);
  });

  it.each([262143, 262144, 262145])('bounds optional synchronous legacy compaction at262144pixels: %i', count => {
    const image = legacyFixture('opaque', count, 1), baseline = taggedLegacyReference(image), bytes = pngBytes(image);
    expect(readPng(bytes).depth).toBe(count <= 262144 ? 1 : 2);
    expect(Buffer.from(readPng(bytes).pixels).equals(Buffer.from(readPng(baseline).pixels))).toBe(true);
    if (count > 262144) expect(bytes).toEqual(baseline);
    else expect(bytes.length).toBeLessThan(baseline.length);
  });

  it.each([[false, 296, 297], [true, 738, 738]])('retains the tagged legacy baseline for a real losing/tied compact candidate: %s', (tie, fullSize, compactSize) => {
    const image = legacyGateFixture(tie), baseline = taggedLegacyReference(image);
    const candidate = pairedReference({ w: image.w, h: image.h, colors: [image.second], indices: new Uint16Array(image.mask.length),
      alpha: Uint8Array.from(image.mask, role => role ? 255 : 0) });
    expect(baseline.length).toBe(fullSize); expect(candidate.length).toBe(compactSize);
    expect(readPng(candidate).pixels).toEqual(readPng(baseline).pixels);
    expect(pngBytes(image)).toEqual(baseline);
  });

  it('rejects malformed legacy geometry, masks and both-None inks', () => {
    const valid = legacyFixture('opaque', 3, 1);
    for (const bad of [{ w: 0 }, { w: 2 }, { mask: Uint8Array.of(1, 2, 3) }, { first: null, second: null }])
      expect(() => pngBytes({ ...valid, ...bad })).toThrow();
  });

  it('retains frozen pre-M8 binary Palette PNG bytes with and without binary Keep alpha', async () => {
    const image = { w: 7, h: 2, colors: ['#123456', '#abcdef', '#445566'], indices: Uint16Array.of(256, 1, 2, 0, 1, 2, 0, 2, 0, 256, 1, 2, 1, 0) };
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    // Captured independently from git cdca311:src/lib/save.js, fflate level3.
    const expected = 'e77426f15dc5aa014f259fa45212658aab3ff63d2ab88286a8d8d6853f8b250f';
    expect(digest(palettePngBytes(image))).toBe(expected);
    const keep = { ...image, alpha: Uint8Array.from(image.indices, index => index === 256 ? 0 : 255) };
    expect(digest(palettePngBytes(keep))).toBe(expected);
    expect(digest(await palettePngBytesAsync(keep))).toBe(expected);
  });
});
