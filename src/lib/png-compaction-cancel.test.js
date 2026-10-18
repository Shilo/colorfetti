import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const control = vi.hoisted(() => ({ codec: vi.fn(), yields: 0, abortAt: 0, controller: null, collections: 0 }));
vi.mock('fflate', async original => ({ ...await original(), zlib: (...args) => control.codec(...args) }));
vi.mock('./palette-export.js', async original => ({ ...await original(), yieldExport: async () => {
  if (++control.yields === control.abortAt) control.controller.abort();
} }));
vi.mock('./png-alpha-states.js', async original => {
  const actual = await original(); return { ...actual, createAlphaStates: (...args) => { control.collections++; return actual.createAlphaStates(...args); } };
});
import { zlibSync } from 'fflate';
import { palettePngBytes, palettePngBytesAsync } from './save.js';
import { boundaryFixture, sizeGateFixture } from '../../bench/conversion-fixes-2026-10-18/m8/fixtures.mjs';

beforeEach(() => {
  control.yields = 0; control.abortAt = 0; control.collections = 0; control.controller = new AbortController();
  control.codec.mockReset().mockImplementation((rows, options, done) => {
    queueMicrotask(() => done(null, zlibSync(rows, options))); return vi.fn();
  });
});
afterEach(() => vi.restoreAllMocks());

it.each([[1, 0], [2, 0], [3, 1], [4, 1]])('cancels at bounded yield %i even inside a very wide single row', async (abortAt, codecCount) => {
  const w = 65539, image = { w, h: 1, colors: ['#c1482e'], indices: new Uint16Array(w), alpha: Uint8Array.from({ length: w }, (_, p) => 20 + (p % 2) * 100) };
  control.abortAt = abortAt;
  await expect(palettePngBytesAsync(image, { signal: control.controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(control.yields).toBe(abortAt); expect(control.codec).toHaveBeenCalledTimes(codecCount);
});

it('terminates the second compression and ignores its late callback rather than returning baseline on cancellation', async () => {
  const callbacks = [], terminators = [];
  control.codec.mockImplementation((rows, options, done) => {
    callbacks.push(done); const terminate = vi.fn(); terminators.push(terminate);
    if (callbacks.length === 1) queueMicrotask(() => done(null, zlibSync(rows, options)));
    return terminate;
  });
  const pending = palettePngBytesAsync(boundaryFixture(16), { signal: control.controller.signal });
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(callbacks).toHaveLength(2)); control.controller.abort(); await rejected;
  callbacks[1](null, Uint8Array.of(1));
  expect(terminators[0]).not.toHaveBeenCalled(); expect(terminators[1]).toHaveBeenCalledOnce();
});

it('starts one compressor for binary, overflow and metadata-floor rejection; two only for a viable candidate', async () => {
  const tiny = { w: 1, h: 1, colors: ['#abcdef'], indices: Uint16Array.of(0), alpha: Uint8Array.of(128) };
  palettePngBytes(tiny); expect(control.collections).toBe(0);
  for (const [image, expected, collections] of [[boundaryFixture(1), 1, 0], [boundaryFixture(257), 1, 1], [tiny, 1, 0], [boundaryFixture(16), 2, 1], [sizeGateFixture(), 2, 1]]) {
    control.codec.mockClear(); control.collections = 0; await palettePngBytesAsync(image);
    expect(control.codec).toHaveBeenCalledTimes(expected);
    expect(control.collections).toBe(collections);
  }
});

it('rejects all late source validation errors before starting either compressor', async () => {
  const image = boundaryFixture(257); image.indices[image.indices.length - 1] = 256; image.alpha[image.alpha.length - 1] = 33;
  await expect(palettePngBytesAsync(image)).rejects.toThrow(/alpha/);
  expect(control.codec).not.toHaveBeenCalled();
});
