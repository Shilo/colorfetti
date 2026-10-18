import { describe, it, expect } from 'vitest';
import { gifFrameBounds } from './gif-frame-bounds.js';

describe('transparent GIF frame bounds', () => {
  it('leaves the opaque path and complete bounds on the original buffer', () => {
    const indices = Uint8Array.of(1, 0, 0, 1);
    expect(gifFrameBounds(indices, 2, 2, null)).toEqual({ x: 0, y: 0, w: 2, h: 2, indices });
    expect(gifFrameBounds(indices, 2, 2, null).indices).toBe(indices);
    expect(gifFrameBounds(indices, 2, 2, 0).indices).toBe(indices);
  });
  it('crops only transparent margins and preserves transparent interior pixels', () => {
    const indices = Uint8Array.of(0,0,0,0,0, 0,2,0,3,0, 0,0,4,0,0, 0,0,0,0,0);
    const before = indices.slice();
    expect(gifFrameBounds(indices, 5, 4, 0)).toEqual({ x: 1, y: 1, w: 3, h: 2, indices: Uint8Array.of(2,0,3,0,4,0) });
    expect(indices).toEqual(before);
  });
  it.each([[0,0],[4,0],[0,3],[4,3]])('retains a one-pixel frame at edge %j', (x, y) => {
    const indices = new Uint8Array(20); indices[y * 5 + x] = 1;
    expect(gifFrameBounds(indices, 5, 4, 0)).toEqual({ x, y, w: 1, h: 1, indices: Uint8Array.of(1) });
  });
  it.each([0,1,255])('uses one transparent pixel for a fully empty frame with index %s', transparent => {
    const indices = new Uint8Array(20).fill(transparent);
    expect(gifFrameBounds(indices, 5, 4, transparent)).toEqual({ x: 0, y: 0, w: 1, h: 1, indices: Uint8Array.of(transparent) });
  });
  it('does not treat black/index zero as transparent when a different index is empty', () => {
    const indices = Uint8Array.of(255,255,255, 255,0,255, 255,255,255);
    expect(gifFrameBounds(indices, 3, 3, 255)).toEqual({ x: 1, y: 1, w: 1, h: 1, indices: Uint8Array.of(0) });
  });
  it('keeps the original buffer when candidate area exceeds its allocation budget', () => {
    const indices = Uint8Array.of(0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0);
    expect(gifFrameBounds(indices,4,4,0,11).indices).toBe(indices);
    expect(gifFrameBounds(indices,4,4,0,12)).toMatchObject({x:1,y:0,w:3,h:4});
  });
  it('agrees with an independent exhaustive 4×3 bounding-box reference', () => {
    for (let bits = 0; bits < 4096; bits++) {
      const indices = Uint8Array.from({ length: 12 }, (_, p) => bits >> p & 1);
      const positions = [...indices.keys()].filter(p => indices[p]);
      const left = positions.length ? Math.min(...positions.map(p => p % 4)) : 0;
      const right = positions.length ? Math.max(...positions.map(p => p % 4)) : 0;
      const top = positions.length ? Math.min(...positions.map(p => Math.floor(p / 4))) : 0;
      const bottom = positions.length ? Math.max(...positions.map(p => Math.floor(p / 4))) : 0;
      const result = gifFrameBounds(indices, 4, 3, 0);
      expect([result.x,result.y,result.w,result.h]).toEqual([left,top,right-left+1,bottom-top+1]);
      const expected = [];
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) expected.push(indices[y * 4 + x]);
      expect([...result.indices]).toEqual(expected);
    }
  });
  it.each([
    [new Uint8Array(0), 0, 1, 0], [new Uint8Array(1), 1, 0, 0],
    [new Uint8Array(1), 1.5, 1, 0], [new Uint8Array(1), 65536, 1, 0],
    [new Uint8Array(2), 1, 1, 0], [new Uint16Array(1), 1, 1, 0],
    [new Uint8Array(1), 1, 1, -1], [new Uint8Array(1), 1, 1, 256],
    [new Uint8Array(1), 1, 1, undefined],
  ])('rejects malformed helper input before scanning or copying', (indices, w, h, transparent) => {
    expect(() => gifFrameBounds(indices, w, h, transparent)).toThrow('Invalid GIF frame bounds.');
  });
});
