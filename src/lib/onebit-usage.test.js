import { describe, it, expect } from 'vitest';
import { analyze, mask, colorize } from './recolor.js';
import { defaults, STYLE_SETTINGS } from './settings.js';
import { analysisKey } from './image-reanalysis.js';
import { maskRoles, oneBitColors, rememberOneBitMask, collectOneBitUsage } from './onebit-usage.js';

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
});
