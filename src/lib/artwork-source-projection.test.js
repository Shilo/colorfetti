import { describe, expect, it } from 'vitest';
import { artworkIdentity, originalArtworkItem } from './artwork-source-projection.js';
import { getLimitedPalette } from './palette-limit-client.js';
import { getPaletteCleanup } from './palette-cleanup-client.js';
import { preparePalette } from './quantize.js';

function fixture() {
  const original = { width: 3, height: 3, data: Uint8ClampedArray.from(Array.from({ length: 9 }, (_, i) => [i & 1 ? 255 : 0, 0, 0, 255]).flat()) };
  const frame = { original, img: { lum: new Uint8Array(9) }, delay: 100 };
  return { id: 1, name: 'test.gif', ...frame, frames: [frame, { ...frame, img: {} }], loop: 3 };
}
function contains(root, unwanted, seen = new Set()) {
  if (unwanted.has(root)) return true;
  if (!root || typeof root !== 'object' || seen.has(root) || ArrayBuffer.isView(root)) return false;
  seen.add(root); return Object.values(root).some(value => contains(value, unwanted, seen));
}
describe('original-only asynchronous source captures', () => {
  it('retains exact originals and stable identities without any legacy wrapper or analysis', () => {
    const item = fixture(), projection = originalArtworkItem(item), again = originalArtworkItem(projection);
    const unwanted = new Set([item, item.frames, item.img, ...item.frames, ...item.frames.map(frame => frame.img)]);
    expect(contains(projection, unwanted)).toBe(false); expect(contains(again, unwanted)).toBe(false);
    expect(again.identity).toBe(projection.identity); expect(again.framesIdentity).toBe(projection.framesIdentity);
    expect(again.frames[0].identity).toBe(projection.frames[0].identity);
    expect(again.original).toBe(item.original); expect(again.frames[1].original).toBe(item.frames[1].original);
    expect(artworkIdentity(projection.identity)).toBe(projection.identity);
  });
  it('preserves shared limiter/cleanup results through repeated projections and invalidates changed frame wrappers', async () => {
    const item = fixture(), palette = preparePalette(['#000000', '#ffffff', '#ff0000']);
    const first = await getLimitedPalette(item, palette, 128, 'rgb', 2);
    expect(await getLimitedPalette(originalArtworkItem(item), palette, 128, 'rgb', 2)).toBe(first);
    const clean = await getPaletteCleanup(item, palette, 128, 'rgb');
    expect(await getPaletteCleanup(originalArtworkItem(originalArtworkItem(item)), palette, 128, 'rgb')).toBe(clean);
    item.frames = item.frames.map(frame => ({ ...frame }));
    expect(await getLimitedPalette(item, palette, 128, 'rgb', 2)).not.toBe(first);
    expect(await getPaletteCleanup(item, palette, 128, 'rgb')).not.toBe(clean);
  });
});
