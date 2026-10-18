import { expect, it, vi } from 'vitest';
import omggif from 'omggif';
import { decodeGif, decodeGifAsync, visitGifFrames } from './gif.js';

it.each([6, 8])('rejects zero GIF logical dimension at offset %s as invalid data, independently of a size limit', async offset => {
  const buffer = new Uint8Array(256), writer = new omggif.GifWriter(buffer, 1, 1, { palette: [0, 0xffffff] });
  writer.addFrame(0, 0, 1, 1, [1]);
  const bytes = buffer.slice(0, writer.end()); bytes[offset] = bytes[offset + 1] = 0;
  expect(() => decodeGif(bytes)).toThrow('Invalid GIF logical dimensions.');
  await expect(decodeGifAsync(bytes)).rejects.toMatchObject({ code: 'GIF_INVALID' });
  const visitor = vi.fn();
  await expect(visitGifFrames(bytes, visitor, { maxPixels: 0, limitMessage: 'limit only' }))
    .rejects.toMatchObject({ code: 'GIF_INVALID', message: 'Invalid GIF logical dimensions.' });
  expect(visitor).not.toHaveBeenCalled();
});
