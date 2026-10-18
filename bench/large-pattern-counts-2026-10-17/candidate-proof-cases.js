import { describe, it, expect } from 'vitest';
import { analyze, mask, patternRoleBounds, unify } from './candidate-recolor.js';
import { collectOneBitUsage, maskRoles } from './candidate-onebit-usage.js';
import { analysisKey } from '../../src/lib/image-reanalysis.js';

const styles = ['checker', 'bayer', 'hatch', 'noise', 'atkinson'];
function source(values, width = values.length, cut = 128) {
  const original = { width, height: values.length / width,
    data: Uint8ClampedArray.from(values.flatMap(v => Array.isArray(v) ? v : [v, v, v, 255])) };
  const img = analyze(original, 'luma', cut);
  return { original, img, by: analysisKey(img.soft, { alphaCut: cut }) };
}
describe('histogram proofs for actual full-source pattern roles', () => {
  it('bounds every actual full mask over thresholds, patterns, alpha and narrow geometry', () => {
    for (const width of [1, 3, 8, 17]) {
      const item = source(Array.from({ length: width * 9 }, (_, p) => [p * 37 % 256, p * 19 % 256, p * 83 % 256, p % 7 ? 255 : 0]), width);
      for (const style of styles) for (const threshold of [null, 0, 1, 127, 254, 255]) for (const shading of [0, 1, 50, 100]) {
        const set = { threshold, shading, matrix: [2, 4, 8][width % 3], scale: width % 4 + 1, direction: ['/', '\\', '-', '|'][width % 4], spacing: width % 4 + 3 };
        const proof = patternRoleBounds(item.img, style, set);
        if (!proof) continue;
        const expected = maskRoles(mask(item.img, style, set));
        expect(proof.lower & expected).toBe(proof.lower);
        expect(proof.upper | expected).toBe(proof.upper);
        if (proof.lower === proof.upper) expect(proof.lower).toBe(expected);
      }
    }
  });
  it('keeps midpoint phase ambiguous and proves empty and endpoint-only roles', () => {
    const middle = source([127, 127]);
    middle.img.lo = 0; middle.img.hi = 254; middle.img.autoTone = 127;
    for (const style of styles) {
      const proof = patternRoleBounds(middle.img, style);
      if (style === 'atkinson') expect(proof).toBeNull();
      else expect(proof).toEqual({ lower: 0, upper: 3 });
      expect(patternRoleBounds(source([[0, 0, 0, 0]]).img, style)).toEqual({ lower: 0, upper: 0 });
      expect(patternRoleBounds(source([0, 255]).img, style)).toEqual({ lower: 3, upper: 3 });
    }
  });
  it('uses each frame histogram under unified animation brightness ranges', () => {
    const frames = [source([0, 0]), source([127, 127]), source([255, 255])];
    unify(frames.map(f => f.img));
    for (const style of styles) for (const frame of frames) {
      const proof = patternRoleBounds(frame.img, style);
      if (!proof) continue;
      const expected = maskRoles(mask(frame.img, style));
      expect(proof.lower & expected).toBe(proof.lower);
      expect(proof.upper | expected).toBe(proof.upper);
    }
  });
  it('refuses nonfinite occupied tone evidence instead of certifying absence', () => {
    const { img } = source([255]);
    img.hi = NaN;
    for (const style of styles) expect(patternRoleBounds(img, style, { threshold: 127 })).toBeNull();
  });
  it('counts large images without reading or allocating source-size masks', async () => {
    const item = source([0, 255]);
    item.img.w = item.img.h = 2048;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Unexpected source-size mask'); } });
    Object.defineProperty(item.img, 'data', { get() { throw new Error('Unexpected source pixels'); } });
    for (const style of styles) for (const [first, second, count] of [
      ['#000000', '#ffffff', 2], [null, '#ffffff', 1], ['#000000', null, 1], ['#aabbcc', '#AABBCC', 1], [null, null, 0],
    ]) expect((await collectOneBitUsage(item, { style, set: {}, first, second })).count).toBe(count);
  });
  it('preserves unknown for large ambiguous phases and general error diffusion', async () => {
    const item = source([127, 127]);
    item.img.w = item.img.h = 2048; item.img.lo = 0; item.img.hi = 254; item.img.autoTone = 127;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Unexpected mask'); } });
    for (const style of styles)
      expect(await collectOneBitUsage(item, { style, set: {}, first: '#000000', second: '#ffffff' })).toBeNull();
  });
  it('can prove an actual RGB count without falsely caching uncertain role absence', async () => {
    const item = source([0, 127]);
    item.img.w = item.img.h = 2048; item.img.lo = 0; item.img.hi = 254; item.img.autoTone = 127;
    Object.defineProperty(item.img, 'lum', { get() { throw new Error('Unexpected mask'); } });
    for (const style of ['checker', 'bayer', 'hatch', 'noise']) {
      expect(patternRoleBounds(item.img, style)).toEqual({ lower: 1, upper: 3 });
      expect((await collectOneBitUsage(item, { style, set: {}, first: '#123456', second: null })).count).toBe(1);
      expect((await collectOneBitUsage(item, { style, set: {}, first: '#123456', second: '#123456' })).count).toBe(1);
      expect(await collectOneBitUsage(item, { style, set: {}, first: '#123456', second: '#ffffff' })).toBeNull();
      expect(await collectOneBitUsage(item, { style, set: {}, first: null, second: '#ffffff' })).toBeNull();
    }
  });
  it('withholds a genuinely phase-dependent large image count instead of guessing absence', async () => {
    for (const brightX of [0, 1]) {
      const width = 513, data = new Uint8ClampedArray(width * width * 4);
      for (let p = 3; p < data.length; p += 4) data[p] = 255;
      data.set([127, 127, 127, 255], brightX * 4);
      const original = { width, height: width, data }, img = analyze(original);
      const item = { original, img, by: analysisKey(img.soft) }, set = { threshold: 200 };
      expect(patternRoleBounds(img, 'checker', set)).toEqual({ lower: 1, upper: 3 });
      expect(maskRoles(mask(img, 'checker', set))).toBe(brightX === 0 ? 3 : 1);
      expect(await collectOneBitUsage(item, { style: 'checker', set, first: '#000000', second: '#ffffff' })).toBeNull();
    }
  });
});
