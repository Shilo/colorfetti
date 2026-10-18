import { describe, expect, it, vi } from 'vitest';
import { collectPaletteUsage } from './palette-usage.js';
import { fullPaletteImage } from './palette-state.js';
import { EMPTY_INDEX } from './quantize.js';

const source = values => ({ width: values.length, height: 1, data: Uint8ClampedArray.from(values.flat()) });
const snapshot = { family: 'full-palette', colors: ['#ffffff', '#000000', '#ff0000', '#00ff00'], alphaCut: 128, metric: 'oklab', maxColors: 0 };
describe('full-source output palette inspection', () => {
  it('unions every animation frame, excluding empty pixels and keeping target order', async () => {
    const first = source([[0,0,0,255], [0,255,0,0]]), next = source([[255,0,0,255], [255,255,255,255]]);
    const item = { original: first, frames: [{ original: first, delay: 40 }, { original: next, delay: 90 }] };
    const result = await collectPaletteUsage(item, snapshot);
    expect(result).toEqual({ count: 3, colors: ['#ffffff', '#000000', '#ff0000'], frames: 2 });
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.colors)).toBe(true);
    expect((await collectPaletteUsage({original: first}, snapshot)).count).toBe(1);
  });
  it('reports an all-transparent fixed-palette image as zero colors', async () => {
    expect(await collectPaletteUsage({ original: source([[0,255,0,0]]) }, snapshot)).toEqual({ colors: [], count: 0, frames: 1 });
  });
  it('preserves opacity validation even when no source pixels survive', async () => {
    const original=source([[0,0,0,0]]);
    for(const alphaCut of [0,256,1.5,'128']) await expect(collectPaletteUsage({original},{...snapshot,alphaCut})).rejects.toThrow('Opacity cut');
  });
  it('stops at proven palette saturation while preserving the complete clip frame total', async () => {
    const first = source([[0,0,0,255],[255,255,255,255]]);
    let laterReads = 0;
    const later = { width: 1, height: 1, get data() { laterReads++; throw new Error('Later frame must not be converted'); } };
    const item = { original: first, frames: [{ original: first, delay: 40 }, { original: later, delay: 90 }] };
    for (const dither of ['none','4x4']) {
      const result = await collectPaletteUsage(item, {...snapshot, colors:['#000000','#ffffff'],dither});
      expect(result).toEqual({count:2,colors:['#000000','#ffffff'],frames:2});
    }
    expect(laterReads).toBe(0);
  });
  it('does not cap Original RGBs before nearest matching or miss later frame colors', async () => {
    const original = source([[170,10,20,255]]), next = source([[0,255,0,255]]);
    const item = {original,frames:[{original,delay:40},{original:next,delay:40}]};
    expect(await collectPaletteUsage(item,{...snapshot,colors:['#ff0000','#00ff00']})).toEqual({count:2,colors:['#ff0000','#00ff00'],frames:2});
  });
  it('matches full converted clip unions for alpha, matching, cap, Cleanup and effective dithering', async () => {
    const first = source(Array.from({length:96},(_,p)=>[p%7*35,p%5*50,p%3*90,p%4*85]));
    const next = source(Array.from({length:96},(_,p)=>[p%5*50,p%3*90,p%7*35,p%3*127]));
    const item = {original:first,frames:[{original:first,delay:40},{original:next,delay:80}]};
    for (const metric of ['oklab','rgb']) for (const alphaMode of ['cut','keep']) for (const maxColors of [0,2]) for (const mode of ['nearest','cleanup','dither','zero-strength']) {
      const asked={...snapshot,metric,alphaMode,maxColors,cleanup:mode==='cleanup',dither:mode==='dither'||mode==='zero-strength'?'4x4':'none',ditherStrength:mode==='zero-strength'?0:100};
      const full=await fullPaletteImage(item,asked), actual=new Set();
      for(let i=0;i<full.frameCount;i++)for(const index of (await full.getFrame(i)).indices)if(index!==EMPTY_INDEX)actual.add(full.colors[index]);
      const usage=await collectPaletteUsage(item,asked);
      expect(usage).toEqual({colors:full.colors.filter(c=>actual.has(c)),count:actual.size,frames:2});
    }
  });
  it('falls back exactly for more than 4096 visible source RGBs', async () => {
    const original=source(Array.from({length:4097},(_,p)=>[p>>>8,p&255,p*71&255,255]));
    const full=await fullPaletteImage({original},snapshot), expected=new Set([...full.indices].filter(i=>i!==EMPTY_INDEX).map(i=>full.colors[i]));
    expect((await collectPaletteUsage({original},snapshot)).colors).toEqual(full.colors.filter(c=>expected.has(c)));
  });
  it('matches final full-source indices under cap, Cleanup, matching and dithering', async () => {
    const original = { width: 12, height: 12, data: Uint8ClampedArray.from(Array.from({ length: 144 }, (_, p) => [p % 7 * 40, p % 5 * 50, p % 3 * 90, p % 11 ? 255 : 0]).flat()) };
    for (const metric of ['rgb', 'oklab']) for (const cleanup of [false, true]) for (const dither of ['none', '4x4']) {
      const asked = { ...snapshot, metric, cleanup, dither, ditherStrength: 100, maxColors: 2 };
      const full = await fullPaletteImage({ original }, asked);
      const actual = new Set([...full.indices].filter(i => i !== EMPTY_INDEX).map(i => full.colors[i]));
      const usage = await collectPaletteUsage({ original }, asked);
      expect(usage.colors).toEqual(full.colors.filter(c => actual.has(c)));
      expect(usage.count).toBe(actual.size);
    }
  });
  it('rejects canceled work and non-Palette requests', async () => {
    const controller = new AbortController(); controller.abort();
    const item = { original: source([[0,0,0,255]]) };
    await expect(collectPaletteUsage(item, snapshot, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(collectPaletteUsage(item, { family: 'two-color' })).rejects.toThrow('Palette mode');
  });
  it('cancels between animation frames without publishing partial union metadata', async () => {
    const original = source([[0,0,0,255]]), controller = new AbortController();
    let framesRead = 0;
    const frames = Array.from({length: 100}, () => ({ get original() { framesRead++; return original; }, delay: 40 }));
    const pending = collectPaletteUsage({original, frames}, snapshot, {signal: controller.signal});
    // Capture happens synchronously, then each animation frame yields a task.
    await vi.waitFor(() => expect(framesRead).toBeGreaterThan(0));
    controller.abort();
    await expect(pending).rejects.toMatchObject({name: 'AbortError'});
  });
});
