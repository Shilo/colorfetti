import { describe, it, expect } from 'vitest';
import { analyze, mask, colorize } from './recolor.js';
import { defaults, STYLE_SETTINGS } from './settings.js';
import { analysisKey } from './image-reanalysis.js';
import { artworkCost, createArtworkAdmission } from './artwork-admission.js';
import { capturedAnalysisAdmission } from './artwork-analysis-capture.js';
import { maskRoles, oneBitColors, rememberOneBitMask, rememberOneBitSample, collectOneBitUsage, ONEBIT_INSPECTION_PIXELS } from './onebit-usage.js';

function source(values, width = values.length) {
  const original = { width, height: values.length / width, data: Uint8ClampedArray.from(values.flatMap(v => v === null ? [0, 0, 0, 0] : [v, v, v, 255])) };
  const img = analyze(original);
  return { original, img, by: analysisKey(img.soft) };
}
function oracle(value, first, second) {
  const rgba = colorize(value, first, second), colors = new Set();
  for (let p = 0; p < rgba.length; p += 4) if (rgba[p + 3]) colors.add([...rgba.subarray(p, p + 3)].join(','));
  return colors.size;
}
describe('actual 1-bit used-color metadata', () => {
  it('charges queued input and replacement analyses separately, while no-ink exits need neither', async () => {
    const item = source([0, 255]), bytes = artworkCost(2, 1), budget = createArtworkAdmission(bytes);
    item.admission = budget.reserve(bytes);
    const asked = { style: 'solid', set: { source: 'red', threshold: 127 }, first: '#000000', second: '#ffffff' };
    const blocked = capturedAnalysisAdmission.reserve(capturedAnalysisAdmission.limit);
    await expect(collectOneBitUsage(item, asked)).rejects.toMatchObject({ code: 'ARTWORK_MEMORY_LIMIT' });
    blocked.release();
    expect(budget.used).toBe(bytes);
    expect((await collectOneBitUsage(item, { ...asked, first: null, second: null })).count).toBe(0);
    expect(capturedAnalysisAdmission.used).toBe(0);
    const matching = collectOneBitUsage(item, { ...asked, set: { source: 'luma', threshold: 127 } });
    expect(capturedAnalysisAdmission.used).toBe(2054);
    expect((await matching).count).toBe(2); expect(capturedAnalysisAdmission.used).toBe(0);
    const changed = collectOneBitUsage(item, asked); expect(capturedAnalysisAdmission.used).toBe(4108);
    expect((await changed).count).toBe(2); expect(capturedAnalysisAdmission.used).toBe(0);
    item.admission.release(); expect(budget.used).toBe(0);
  });
  it('distinguishes empty, solid, both roles, None and duplicate RGB inks', () => {
    for (const values of [[], [0, 0], [1, 1], [2, 2], [0, 1, 2]]) {
      const value = Uint8Array.from(values), roles = maskRoles(value);
      for (const [first, second] of [['#000000', '#ffffff'], [null, '#ffffff'], ['#000000', null], [null, null], ['#aAbBcC', '#aabbcc']])
        expect(oneBitColors(roles, first, second).length).toBe(oracle(value, first, second));
    }
  });
  it('does not accept a sampled mask as complete source metadata', () => {
    const { img } = source([0, 255, 0, 255]);
    expect(rememberOneBitMask(img, 'solid', {}, Uint8Array.of(1))).toBeNull();
  });
  it('reuses immutable mask role metadata across ink and None changes', async () => {
    const item = source([0, 255]), set = { threshold: 127 };
    rememberOneBitMask(item.img, 'solid', set, mask(item.img, 'solid', set));
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Mask recomputed'); } });
    expect((await collectOneBitUsage(item, { style: 'solid', set, first: '#aabbcc', second: '#AABBCC' })).count).toBe(1);
    expect((await collectOneBitUsage(item, { style: 'solid', set, first: null, second: '#ffffff' })).count).toBe(1);
  });
  it('agrees with full converted RGBA for every style, opaque, None and duplicate inks', async () => {
    const item = source(Array.from({ length: 256 }, (_, i) => i % 13 ? (i * 19) % 256 : null), 16);
    for (const style of Object.keys(STYLE_SETTINGS)) {
      const set = defaults(style), value = mask(item.img, style, set);
      rememberOneBitMask(item.img, style, set, value);
      for (const [first, second] of [['#123456', '#fedcba'], [null, '#fedcba'], ['#123456', null], ['#123456', '#123456']]) {
        const result = await collectOneBitUsage(item, { style, set, first, second });
        expect(result.count, style).toBe(oracle(value, first, second));
        expect(result.frames).toBe(1);
      }
    }
  });
  it('unions the complete animation rather than counting only its current frame', async () => {
    const a = source([0, null]), b = source([255, null]);
    const item = { ...a, frames: [a, b] };
    const result = await collectOneBitUsage(item, { style: 'solid', set: { threshold: 127 }, first: '#000000', second: '#ffffff' });
    expect(result).toEqual({ colors: ['#000000', '#ffffff'], count: 2, frames: 2 });
  });
  it('stops before later frames when every possible visible color is found', async () => {
    const a = source([0, 255]);
    const frames = [a];
    Object.defineProperty(frames, 1, { get() { throw new Error('Unneeded frame inspected'); } });
    const result = await collectOneBitUsage({ ...a, frames }, { style: 'solid', set: { threshold: 127 }, first: '#000000', second: '#ffffff' });
    expect(result).toEqual({ colors: ['#000000', '#ffffff'], count: 2, frames: 2 });
  });
  it('zero enabled inks needs no conversion; solid silhouette uses one actual ink', async () => {
    const item = source([0, 255]);
    expect((await collectOneBitUsage(item, { style: 'icon', set: {}, first: null, second: null })).count).toBe(0);
    expect((await collectOneBitUsage(item, { style: 'silhouette', set: {}, first: '#000000', second: '#ffffff' })).count).toBe(1);
  });
  it('honors cancellation before work and after the scheduled first mask', async () => {
    const item = source([0, 255]), asked = { style: 'solid', set: {}, first: '#000000', second: '#ffffff' };
    const a = new AbortController(); a.abort();
    await expect(collectOneBitUsage(item, asked, { signal: a.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const b = new AbortController();
    const pending = collectOneBitUsage(item, asked, { signal: b.signal }); b.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('serializes missing masks and removes canceled queued jobs before preparation', async () => {
    const a = source([0, 255]), b = source([0, 255]), canceled = source([0, 255]);
    const events = [], asked = { style: 'solid', set: {}, first: '#000000', second: '#ffffff' };
    for (const [name, item] of [['a', a], ['b', b], ['canceled', canceled]]) {
      const lum = item.img.lum;
      Object.defineProperty(item.img, 'lum', { get() { events.push(name); return lum; } });
    }
    const controller = new AbortController();
    const first = collectOneBitUsage(a, asked), second = collectOneBitUsage(b, asked);
    const removed = collectOneBitUsage(canceled, asked, { signal: controller.signal });
    const rejected = expect(removed).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    await Promise.all([first, second]);
    expect(events).toEqual(['a', 'b']);
  });
  it('pointwise sampled pixels exactly match their source-coordinate full mask', () => {
    const item = source(Array.from({ length: 40 * 32 }, (_, p) => p % 17 < 3 ? null : (p * 37) % 256), 40);
    const choices = {
      cutout: [{}, { threshold: 90, seams: 40, rim: false }],
      solid: [{}, { threshold: 190 }],
      lines: [{}, { thickness: 2, darks: 30 }, { thickness: 3, threshold: 50 }],
      stencil: [{}, { outline: 'trim', cuts: 20, edges: 80 }],
      icon: [{}, { border: 'trim', detail: 75 }, { border: 'keep', detail: 0 }],
      silhouette: [{}],
    };
    for (const [style, settings] of Object.entries(choices)) for (const set of settings) {
      const full = mask(item.img, style, set);
      for (const [w, h] of [[7, 5], [21, 27], [39, 31]]) {
        const sampled = mask(item.img, style, set, w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const sx = Math.floor((x + 0.5) * 40 / w), sy = Math.floor((y + 0.5) * 32 / h);
          expect(sampled[y * w + x], `${style} ${JSON.stringify(set)} ${w}x${h}`).toBe(full[sy * 40 + sx]);
        }
      }
    }
  });
  it('never computes a missing large full mask and does not mistake partial presence for an exact count', async () => {
    const item = source([0, 255]), size = Math.ceil(Math.sqrt(ONEBIT_INSPECTION_PIXELS + 1));
    item.img.w = item.img.h = size;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Large mask computed'); } });
    const asked = { style: 'solid', set: {}, first: '#000000', second: '#ffffff' };
    expect(await collectOneBitUsage(item, asked)).toBeNull();
    rememberOneBitSample(item.img, 'solid', {}, Uint8Array.of(1), 1, 1);
    expect(await collectOneBitUsage(item, asked)).toBeNull();
    rememberOneBitSample(item.img, 'solid', {}, Uint8Array.of(2), 1, 1);
    expect((await collectOneBitUsage(item, asked)).count).toBe(2);
    expect((await collectOneBitUsage(item, { ...asked, first: null })).count).toBe(1);
  });
  it('pattern and diffusion samples cannot certify large output colors', async () => {
    const item = source([0, 255]), size = Math.ceil(Math.sqrt(ONEBIT_INSPECTION_PIXELS + 1));
    item.img.w = item.img.h = size;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Large mask computed'); } });
    for (const style of ['hatch', 'checker', 'bayer', 'noise', 'atkinson']) {
      expect(rememberOneBitSample(item.img, style, {}, Uint8Array.of(1, 2), 2, 1)).toBeNull();
      expect(await collectOneBitUsage(item, { style, set: {}, first: '#000000', second: '#ffffff' })).toBeNull();
    }
  });
  it('large exact cached roles remain countable and mismatched large analyses are not regenerated', async () => {
    const item = source([0, 255]), size = Math.ceil(Math.sqrt(ONEBIT_INSPECTION_PIXELS + 1));
    item.img.w = item.img.h = size;
    const value = new Uint8Array(size * size); value[0] = 1;
    rememberOneBitMask(item.img, 'solid', {}, value);
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Large mask computed'); } });
    expect((await collectOneBitUsage(item, { style: 'solid', set: {}, first: '#000000', second: '#ffffff' })).count).toBe(1);
    expect(await collectOneBitUsage(item, { style: 'solid', set: { source: 'red' }, first: '#000000', second: '#ffffff' })).toBeNull();
    expect((await collectOneBitUsage(item, { style: 'icon', set: { source: 'red' }, first: null, second: null })).count).toBe(0);
  });
  it('Silhouette can only use its first ink, including with a large sampled source', async () => {
    const item = source([0, 255]), size = Math.ceil(Math.sqrt(ONEBIT_INSPECTION_PIXELS + 1));
    item.img.w = item.img.h = size;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Large mask computed'); } });
    const asked = { style: 'silhouette', set: {}, first: '#000000', second: '#ffffff' };
    expect((await collectOneBitUsage(item, { ...asked, first: null })).count).toBe(0);
    expect(await collectOneBitUsage(item, asked)).toBeNull();
    rememberOneBitSample(item.img, 'silhouette', {}, Uint8Array.of(1), 1, 1);
    expect((await collectOneBitUsage(item, asked)).count).toBe(1);
  });
});
