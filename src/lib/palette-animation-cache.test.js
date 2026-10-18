import { describe, expect, it, vi } from 'vitest';
import { createAnimationCache } from './palette-animation-cache.js';
import { preparePalette, quantize, colorize } from './quantize.js';
import { nativeInspectionQueue } from './viewer-inspection.js';
const source = () => ({ width: 2, height: 1, data: new Uint8Array(8) });
const result = () => ({ w: 2, h: 1, indices: new Uint16Array([0, 256]), used: new Uint8Array(256), hasTransparency: true });
const options = () => ({ sources: [source(), source()], palette: { colors: ['#000000'] }, width: 2, height: 1, alphaCut: 128, metric: 'oklab' });

describe('bounded animation preview cache', () => {
  it('bypasses stills and oversized clips without allocating or evicting', () => {
    const cache = createAnimationCache(600), args = options(), small = cache.acquire(args);
    expect(cache.acquire({ ...args, sources: [args.sources[0]] })).toBeNull();
    expect(cache.acquire({ ...args, width: 1000 })).toBeNull();
    expect(cache.stats()).toEqual({ bytes: 520, clips: 1 });
    small.release(); expect(cache.stats()).toEqual({ bytes: 0, clips: 0 });
  });
  it('fills lazily and shares identical frame work and results across consumers', async () => {
    const cache = createAnimationCache(), args = options(), a = cache.acquire(args), b = cache.acquire({ ...args, palette: { colors: ['#000000'] } });
    const produce = vi.fn(async () => result());
    const [x, y] = await Promise.all([a.getFrame(0, produce), b.getFrame(0, produce)]);
    expect(x).toBe(y); expect(await a.getFrame(0, produce)).toBe(x); expect(produce).toHaveBeenCalledTimes(1);
    a.release(); expect(cache.stats().clips).toBe(1); b.release(); expect(cache.stats().bytes).toBe(0);
  });
  it('keeps keys separate for dimensions, ordered colors, metric, cut, cleanup, dithering and source buffers', () => {
    const cache = createAnimationCache(), args = options(), handles = [cache.acquire(args)];
    for (const change of [{ width: 1 }, { metric: 'rgb' }, { alphaCut: 100 }, { cleanup: {} },
      { dither: '2x2' }, { dither: '4x4' }, { dither: '8x8' }, { ditherStrength: 0 }, { ditherStrength: 100 },
      { palette: { colors: ['#ffffff', '#000000'] } }, { sources: [source(), source()] }]) handles.push(cache.acquire({ ...args, ...change }));
    expect(cache.stats().clips).toBe(12); handles.forEach(h => h.release()); expect(cache.stats().bytes).toBe(0);
  });
  it('one cancellation preserves another consumer, while the last cancellation aborts production', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()), a = new AbortController(), b = new AbortController();
    let resolve, producerSignal;
    const produce = signal => { producerSignal = signal; return new Promise(r => { resolve = r; }); };
    const first = handle.getFrame(0, produce, { signal: a.signal }), second = handle.getFrame(0, produce, { signal: b.signal });
    await Promise.resolve(); a.abort(); await expect(first).rejects.toHaveProperty('name', 'AbortError');
    expect(producerSignal.aborted).toBe(false); resolve(result()); await expect(second).resolves.toHaveProperty('w', 2);
    const last = handle.getFrame(1, produce, { signal: b.signal }); await Promise.resolve(); b.abort();
    await expect(last).rejects.toHaveProperty('name', 'AbortError'); expect(producerSignal.aborted).toBe(true);
    resolve(result()); handle.release();
  });
  it('holds source ownership synchronously until an aborted last producer actually settles', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()), controller = new AbortController();
    let complete, leases = 0;
    const release = vi.fn(() => leases--), hold = vi.fn(() => { leases++; return release; });
    const pending = handle.getFrame(0, () => new Promise(resolve => { complete = resolve; }), { signal: controller.signal, hold });
    expect(leases).toBe(1); // ownership precedes the deferred producer start
    await Promise.resolve(); controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    handle.release(); expect(leases).toBe(1); expect(release).not.toHaveBeenCalled();
    complete(result()); await new Promise(resolve => setTimeout(resolve, 0));
    expect(leases).toBe(0); expect(release).toHaveBeenCalledTimes(1); expect(hold).toHaveBeenCalledTimes(1);
  });
  it('reports the same actual producer settlement to a joined viewer and blocks native scratch after subscriber abort', async () => {
    const cache = createAnimationCache(), args = options(), wall = cache.acquire(args), viewer = cache.acquire(args);
    const wallAbort = new AbortController(), viewerAbort = new AbortController();
    const wallSettlement = vi.fn(), viewerSettlement = vi.fn(), viewerProduce = vi.fn();
    let complete, barrier = Promise.resolve();
    const first = wall.getFrame(0, () => new Promise(resolve => { complete = resolve; }), { signal: wallAbort.signal, onSettlement: wallSettlement });
    const joined = viewer.getFrame(0, viewerProduce, { signal: viewerAbort.signal, onSettlement: work => {
      viewerSettlement(work); barrier = work.then(() => {}, () => {});
    } });
    expect(wallSettlement).toHaveBeenCalledTimes(1); expect(viewerSettlement).toHaveBeenCalledTimes(1);
    expect(viewerSettlement.mock.calls[0][0]).toBe(wallSettlement.mock.calls[0][0]);
    await Promise.resolve();
    const firstRejected = expect(first).rejects.toHaveProperty('name', 'AbortError');
    const joinedRejected = expect(joined).rejects.toHaveProperty('name', 'AbortError');
    wallAbort.abort(); viewerAbort.abort(); await Promise.all([firstRejected, joinedRejected]);
    wall.release(); viewer.release();
    const queue = nativeInspectionQueue(), render = vi.fn();
    let started;
    const entered = new Promise(resolve => { started = resolve; });
    const native = queue.run(async () => { started(); await barrier; render(); });
    // The queue has started, but the aborted subscribers do not settle their
    // producer or permit the next full-frame allocation.
    await entered;
    expect(render).not.toHaveBeenCalled(); expect(viewerProduce).not.toHaveBeenCalled();
    complete(result()); await native; expect(render).toHaveBeenCalledTimes(1);
  });
  it('reports an already completed frame to cache-hit subscribers without starting new work', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()), produce = vi.fn(async () => result());
    const ready = await handle.getFrame(0, produce), onSettlement = vi.fn();
    expect(await handle.getFrame(0, produce, { onSettlement })).toBe(ready);
    expect(onSettlement).toHaveBeenCalledTimes(1); await expect(onSettlement.mock.calls[0][0]).resolves.toBe(ready);
    expect(produce).toHaveBeenCalledTimes(1); handle.release();
  });
  it('releases reservations and rejects late completion after invalidation', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()); let resolve;
    const pending = handle.getFrame(0, () => new Promise(r => { resolve = r; })); await Promise.resolve();
    handle.release(); resolve(result()); await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(cache.stats()).toEqual({ bytes: 0, clips: 0 });
  });
  it('does not exceed the global budget with multiple different clips', () => {
    const cache = createAnimationCache(600), handle = cache.acquire(options());
    expect(cache.acquire(options())).toBeNull(); handle.release(); expect(cache.acquire(options())).not.toBeNull();
  });
  it('rejects malformed produced buffers without retaining a frame', async () => {
    const cache = createAnimationCache(), h = cache.acquire(options());
    await expect(h.getFrame(0, async () => ({ ...result(), indices: new Uint8Array(2) }))).rejects.toThrow('Invalid cached');
    await expect(h.getFrame(0, async () => result())).resolves.toHaveProperty('w', 2); h.release();
  });
  it('returns fresh pixel-identical results across setting, subset, order and source changes', async () => {
    const image = data => ({ width: 3, height: 2, data: Uint8ClampedArray.from(data) });
    const first = image([5,52,82,255,7,5,12,255,240,90,20,255,220,230,240,127,40,180,90,180,0,0,0,0]);
    const second = image([240,90,20,255,5,52,82,255,7,5,12,255,40,180,90,180,220,230,240,127,0,0,0,0]);
    const base = { sources: [first, second], width: 3, height: 2, alphaCut: 128, metric: 'oklab',
      palette: preparePalette(['#000000', '#ffffff', '#1d2b53', '#ffec27']) };
    const cache = createAnimationCache();
    const cases = [base, { ...base, metric: 'rgb' }, { ...base, alphaCut: 181 },
      { ...base, dither: '2x2', ditherStrength: 100 }, { ...base, dither: '4x4', ditherStrength: 100 },
      { ...base, dither: '8x8', ditherStrength: 70 }, { ...base, dither: '8x8', ditherStrength: 0 },
      { ...base, palette: preparePalette([...base.palette.colors].reverse()) },
      { ...base, palette: preparePalette(['#000000', '#ffffff']) },
      { ...base, width: 2, height: 1 }, { ...base, sources: [second, first] }];
    const handles = [];
    for (const args of cases) {
      const handle = cache.acquire(args); handles.push(handle);
      const produce = vi.fn(async () => quantize(args.sources[0], args.palette, args.alphaCut, args.width, args.height, args));
      const actual = await handle.getFrame(0, produce), warm = await handle.getFrame(0, produce);
      const expected = quantize(args.sources[0], args.palette, args.alphaCut, args.width, args.height, args);
      expect(actual.indices).toEqual(expected.indices);
      expect(colorize(actual, args.palette).data).toEqual(colorize(expected, args.palette).data);
      expect(warm).toBe(actual); expect(produce).toHaveBeenCalledTimes(1);
    }
    expect(cache.stats().clips).toBe(cases.length);
    handles.forEach(handle => handle.release()); expect(cache.stats().bytes).toBe(0);
  });
  it('a canceled old producer cannot overwrite a replacement frame in the same clip', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()), controller = new AbortController();
    let completeOld;
    const old = handle.getFrame(0, () => new Promise(resolve => { completeOld = resolve; }), { signal: controller.signal });
    await Promise.resolve(); const rejected = expect(old).rejects.toHaveProperty('name', 'AbortError');
    controller.abort(); await rejected;
    const fresh = { ...result(), indices: new Uint16Array([256, 0]) };
    expect(await handle.getFrame(0, async () => fresh)).toBe(fresh);
    completeOld(result()); await Promise.resolve(); await Promise.resolve();
    expect(await handle.getFrame(0, () => { throw Error('Cached frame lost'); })).toBe(fresh);
    handle.release(); expect(cache.stats().bytes).toBe(0);
  });
});
