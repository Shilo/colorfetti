import { it, expect } from 'vitest';
import omggif from 'omggif';
import { preflightArtworkGif, preflightArtworkGifAsync } from './artwork-gif-preflight.js';
import { decodeGif } from './gif.js';

function gif(count = 1) {
  const bytes = new Uint8Array(100000), writer = new omggif.GifWriter(bytes, 1, 1, { palette: [0, 0xffffff] });
  for (let i = 0; i < count; i++) writer.addFrame(0, 0, 1, 1, [i % 2]);
  return bytes.slice(0, writer.end());
}
it('counts framed images without mistaking comment/application payload markers for frames', async () => {
  const source = gif(2), extra = Uint8Array.of(0x21, 0xfe, 5, 0x2c, 0x2c, 0x3b, 0x21, 0xff, 0);
  const bytes = Uint8Array.from([...source.subarray(0, 19), ...extra, ...source.subarray(19)]);
  expect(preflightArtworkGif(bytes)).toMatchObject({ count: 2, width: 1, height: 1, retained: 8212 });
  expect(await preflightArtworkGifAsync(bytes)).toEqual(preflightArtworkGif(bytes));
  expect(decodeGif(bytes, { artwork: true }).frames).toHaveLength(2);
});
it('bounds tiny frame metadata before GifReader can allocate its frame array', () => {
  expect(preflightArtworkGif(gif(4096)).count).toBe(4096);
  expect(() => preflightArtworkGif(gif(4097))).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
});
it.each([1, 255])('rejects a non-11-byte application header before payload markers can desynchronize GifReader (%s)', size => {
  const source = gif(), app = [0x21, 0xff, size, ...new Array(size).fill(0x2c), 0];
  const bytes = Uint8Array.from([...source.subarray(0, 19), ...app, ...source.subarray(19)]);
  expect(() => preflightArtworkGif(bytes)).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
  expect(() => decodeGif(bytes, { artwork: true })).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
});
it('separates invalid geometry/framing from a valid oversized logical canvas', () => {
  const zero = gif(); zero[6] = 0;
  expect(() => preflightArtworkGif(zero)).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
  const large = gif(); large.set([1, 16, 0, 16], 6); // 4097x4096 logical screen, tiny legal patch.
  expect(() => preflightArtworkGif(large)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
  const outside = gif(); outside[20] = 1;
  expect(() => preflightArtworkGif(outside)).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
  const short = gif().subarray(0, 21);
  expect(() => preflightArtworkGif(short)).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
});
it('retains existing no-trailer framing acceptance, and strict LZW validation remains authoritative', () => {
  const bytes = gif();
  expect(preflightArtworkGif(bytes.subarray(0, bytes.length - 1)).count).toBe(1);
  const bad = Buffer.from('R0lGODlhAwADAIAAABEiM6vN7ywAAAAAAwADAAACASwAOw==', 'base64');
  expect(preflightArtworkGif(bad).count).toBe(1);
  expect(() => decodeGif(bad, { artwork: true })).toThrow(expect.objectContaining({ code: 'GIF_INVALID' }));
});
