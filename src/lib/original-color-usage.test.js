import { describe, expect, it } from 'vitest';
import { collectOriginalUsage, peekOriginalUsage } from './original-color-usage.js';

const source = values => ({ width: values.length, height: 1, data: Uint8ClampedArray.from(values.flat()) });

describe('cached exact Original caption counts', () => {
  it('counts visible RGB independently of alpha variants, target palette and opacity cut', async () => {
    const original = source([[10,20,30,1], [10,20,30,255], [99,1,2,0], [255,0,0,128], [0,255,0,255]]);
    const item = { original };
    expect(peekOriginalUsage(item)).toBe(null);
    expect(await collectOriginalUsage(item, { maxColors: 2, alphaCut: 255 })).toEqual({ count: 3, frames: 1 });
    expect(Object.isFrozen(peekOriginalUsage(item))).toBe(true);
  });
  it('reports zero for a transparent source', async () => {
    expect(await collectOriginalUsage({ original: source([[5,9,8,0]]) })).toEqual({ count: 0, frames: 1 });
  });
  it('unions a whole clip and keeps different clip identities separate', async () => {
    const first = source([[1,2,3,255]]), second = source([[4,5,6,255], [1,2,3,100]]);
    const clip = { frames: [{ original: first }, { original: second }] };
    const result = await collectOriginalUsage(clip);
    expect(result).toEqual({ count: 2, frames: 2 });
    expect(peekOriginalUsage({ frames: [{ original: first }, { original: second }], img: {} })).toBe(result);
    expect(peekOriginalUsage({ original: first })).toBe(null);
    expect(await collectOriginalUsage({ original: first })).toEqual({ count: 1, frames: 1 });
    expect(peekOriginalUsage({ frames: [{ original: first }, { original: first }] })).toBe(null);
  });
  it('retains only settled scalar metadata and reuses it without accessing source bytes again', async () => {
    const original = source([[1,2,3,255], [4,5,6,255]]), item = { original };
    const result = await collectOriginalUsage(item);
    Object.defineProperty(original, 'data', { get() { throw new Error('Unexpected rescan'); } });
    expect(await collectOriginalUsage({ original, img: {} })).toBe(result);
    expect(Object.keys(result)).toEqual(['count', 'frames']);
  });
  it('counts more than 4096 RGB exactly using the bounded fallback', async () => {
    const data = new Uint8ClampedArray(12000 * 4);
    for (let i = 0; i < 12000; i++) { data[i*4] = i >>> 16; data[i*4+1] = i >>> 8 & 255; data[i*4+2] = i & 255; data[i*4+3] = i < 10000 ? 255 : 0; }
    expect(await collectOriginalUsage({ original: { width: 12000, height: 1, data } })).toEqual({ count: 10000, frames: 1 });
  });
  it('promotes a low-color per-frame union above 4096 without losing previous colors', async () => {
    const frames = Array.from({ length: 3 }, (_, f) => ({ original: source(Array.from({ length: 3000 }, (_, p) => [(f*2000+p) >>> 16, (f*2000+p) >>> 8 & 255, (f*2000+p) & 255, 255])) }));
    expect(await collectOriginalUsage({ frames })).toEqual({ count: 7000, frames: 3 });
  });
  it('shares a pending scan while allowing one subscriber to cancel independently', async () => {
    const item = { original: source([[1,2,3,255]]) }, controller = new AbortController();
    const canceled = collectOriginalUsage(item, { signal: controller.signal });
    const joined = collectOriginalUsage(item);
    controller.abort();
    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' });
    await expect(joined).resolves.toEqual({ count: 1, frames: 1 });
  });
  it('cancels queued work before reading pixels, and retries safely', async () => {
    let reads = 0;
    const original = source([[1,2,3,255]]), data = original.data;
    Object.defineProperty(original, 'data', { get() { reads++; return data; } });
    const controller = new AbortController(), item = { original };
    const pending = collectOriginalUsage(item, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(reads).toBe(0); expect(peekOriginalUsage(item)).toBe(null);
    await expect(collectOriginalUsage(item)).resolves.toEqual({ count: 1, frames: 1 });
  });
  it('honors cancellation before a cached result', async () => {
    const item = { original: source([[1,2,3,255]]) };
    await collectOriginalUsage(item);
    const controller = new AbortController(); controller.abort();
    await expect(collectOriginalUsage(item, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('rejects invalid or failed sources without blocking later queued counts', async () => {
    await expect(collectOriginalUsage({})).rejects.toThrow('Original image');
    await expect(collectOriginalUsage({ original: { width: 2, height: 2, data: new Uint8Array(1) } })).rejects.toThrow('Invalid image');
    expect(await collectOriginalUsage({ original: source([[1,2,3,255]]) })).toEqual({ count: 1, frames: 1 });
  });
});
