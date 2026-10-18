import { afterEach, describe, expect, it, vi } from 'vitest';
import omggif from 'omggif';
import * as colorfetti from './recolor.js';
import { convertedAnimation } from './converted-animation.js';
import { encodeGif, encodeGifAsync } from './gif.js';
import { STYLES } from './presets.js';
import { defaults } from './settings.js';

afterEach(() => vi.restoreAllMocks());
function item() {
  const frames = [70, 120, 250].map((delay, frame) => {
    const data = Uint8ClampedArray.from({ length: 8 * 6 * 4 }, (_, at) => at % 4 === 3
      ? ((at >> 2) + frame) % 7 ? 255 : 0 : (at * 13 + frame * 31) % 256);
    return { img: colorfetti.analyze({ width: 8, height: 6, data }), delay };
  });
  colorfetti.unify(frames.map(frame => frame.img));
  return { name: 'captured.gif', img: frames[0].img, frames, loop: 3 };
}

// The encoder may now choose a smaller rectangle; use omggif's independent
// decoder rather than Colorfetti's custom LZW decoder for pixel equivalence.
function expectGifParity(output, reference) {
  const actual = new omggif.GifReader(output), expected = new omggif.GifReader(reference);
  expect([actual.width, actual.height, actual.numFrames(), actual.loopCount()])
    .toEqual([expected.width, expected.height, expected.numFrames(), expected.loopCount()]);
  let allFull = true;
  for (let i = 0; i < actual.numFrames(); i++) {
    const info = actual.frameInfo(i), before = expected.frameInfo(i);
    expect([info.delay, info.disposal, info.transparent_index]).toEqual([before.delay, before.disposal, before.transparent_index]);
    const a = new Uint8Array(actual.width * actual.height * 4), b = new Uint8Array(a.length);
    // Both exporters use disposal 2 and independent composited frames. Clear
    // each full logical canvas, then decode its current bounded rectangle.
    actual.decodeAndBlitFrameRGBA(i, a); expected.decodeAndBlitFrameRGBA(i, b);
    for (let p = 0; p < a.length; p += 4) {
      expect(a[p + 3]).toBe(b[p + 3]);
      if (b[p + 3]) expect(a.subarray(p, p + 3)).toEqual(b.subarray(p, p + 3));
    }
    allFull &&= info.x === 0 && info.y === 0 && info.width === actual.width && info.height === actual.height;
  }
  expect(output.length).toBeLessThanOrEqual(reference.length);
  if (allFull) expect(output).toEqual(reference); // preserve unchanged full-frame bytes
}
describe('captured lazy 1-bit animation masks', () => {
  it('creates no masks up front and snapshots scalar settings, frame analysis and metadata', () => {
    const source = item(), asked = { first: '#222323', second: '#f0f6f0', style: 'solid', set: { threshold: 100 } };
    const expected = source.frames.map(frame => ({ mask: colorfetti.mask(frame.img, asked.style, asked.set), delay: frame.delay }));
    const spy = vi.spyOn(colorfetti, 'mask'), image = convertedAnimation(source, asked);
    expect(spy).not.toHaveBeenCalled(); expect(image.frames).toBeUndefined(); expect(image.frameCount).toBe(3);
    source.frames[0].img = source.frames[1].img;
    source.frames[0].delay = 900; source.frames.reverse(); source.img = { w: 99, h: 99 }; source.loop = 0; source.name = 'changed';
    asked.style = 'noise'; asked.set.threshold = 1; asked.first = null; asked.second = '#000000';
    expect(image).toMatchObject({ name: 'captured.gif', w: 8, h: 6, loop: 3, first: '#222323', second: '#f0f6f0' });
    expect(image.getFrame(0)).toEqual(expected[0]); expect(spy).toHaveBeenCalledOnce();
    expect(image.getFrame(1)).toEqual(expected[1]); expect(spy).toHaveBeenCalledTimes(2);
    expect(() => image.getFrame(-1)).toThrow('index'); expect(() => image.getFrame(3)).toThrow('index');
  });
  it('checks cancellation before and after a mask and never prepares later frames', () => {
    const source = item(), asked = { style: 'cutout', set: defaults('cutout') }, controller = new AbortController();
    const image = convertedAnimation(source, asked, { signal: controller.signal });
    const original = colorfetti.mask;
    const spy = vi.spyOn(colorfetti, 'mask').mockImplementation((...args) => { const result = original(...args); controller.abort(); return result; });
    expect(() => image.getFrame(0)).toThrow(expect.objectContaining({ name: 'AbortError' }));
    expect(() => image.getFrame(1)).toThrow(expect.objectContaining({ name: 'AbortError' }));
    expect(spy).toHaveBeenCalledOnce();
  });
  it.each(STYLES.map(([style]) => style))('preserves %s animation pixels and metadata for either None color and loop variants', async style => {
    for (const loop of [null, 0, 3]) for (const none of [0, 1, 2]) {
      const source = item(), reference = item(); source.loop = reference.loop = loop;
      const asked = { style, set: defaults(style), first: none === 1 ? null : '#222323', second: none === 2 ? null : '#f0f6f0' };
      const sync = { name: source.name, w: source.img.w, h: source.img.h, loop, first: asked.first, second: asked.second,
        frames: reference.frames.map(frame => ({ mask: colorfetti.mask(frame.img, style, asked.set), delay: frame.delay })) };
      expectGifParity(await encodeGifAsync(convertedAnimation(source, asked)), encodeGif(sync));
    }
  });
  it.each(['stencil', 'icon'])('first cold %s save preserves output and retains reusable preparation on published analyses', async style => {
    const source = item(), reference = item(), asked = { style, set: defaults(style), first: '#222323', second: '#f0f6f0' };
    const prepared = img => style === 'stencil' ? img.sprites : img.icons?.[asked.set.border ?? 'auto'];
    expect(source.frames.every(frame => prepared(frame.img) === undefined)).toBe(true);
    const first = await encodeGifAsync(convertedAnimation(source, asked));
    const cached = source.frames.map(frame => prepared(frame.img));
    expect(cached.every(value => value !== undefined)).toBe(true);
    const expected = encodeGif({ w: reference.img.w, h: reference.img.h, loop: reference.loop,
      first: asked.first, second: asked.second,
      frames: reference.frames.map(frame => ({ mask: colorfetti.mask(frame.img, style, asked.set), delay: frame.delay })) });
    expectGifParity(first, expected);
    const second = await encodeGifAsync(convertedAnimation(source, asked));
    expect(second).toEqual(first); // warm preparation must preserve encoded bytes too
    source.frames.forEach((frame, index) => expect(prepared(frame.img)).toBe(cached[index]));
  });
});
