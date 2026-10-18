import { describe, it, expect, vi } from 'vitest';
import { decodeGif, decodeGifAsync, visitGifFrames, encodeGifAsync, encodePaletteGif } from './gif.js';
import { decodePaletteFile } from './palette-decode.js';
import { outNames, zipBytes } from './save.js';
import { unzipSync } from 'fflate';

const loop = (identifier, count) => [0x21, 0xff, 11, ...new TextEncoder().encode(identifier), 3, 1, count & 255, count >> 8, 0];
const patch = index => [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 4 | index << 3 | 1 << 6, 1, 0];
const control = [0x21, 0xf9, 4, 9, 20, 0, 0, 0]; // clear, transparent red, delay 200ms
const gif = blocks => Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0,
  255, 0, 0, 0, 0, 255, ...blocks.flat(), 0x3b]);
const file = bytes => ({ name: 'loops.gif', type: 'image/gif', size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

describe('GIF repeat metadata aliases', () => {
  it.each(['NETSCAPE2.0', 'ANIMEXTS1.0'])('retains absent, infinite and finite repeats for %s on all shared decoder paths', async identifier => {
    for (const count of [null, 0, 1, 2, 65535]) {
      const bytes = gif([...(count === null ? [] : [loop(identifier, count)]), patch(0), patch(1)]);
      const decoded = decodeGif(bytes);
      expect(decoded.loop).toBe(count);
      expect(await decodeGifAsync(bytes)).toEqual(decoded);
      const frames = [];
      const metadata = await visitGifFrames(bytes, f => frames.push({ data: f.data.slice(), delay: f.delay }));
      expect(metadata.loop).toBe(count); expect(frames).toEqual(decoded.frames);
      const palette = await decodePaletteFile(file(bytes));
      expect(palette.colors).toEqual(['#ff0000', '#0000ff']); expect(palette.frameCount).toBe(2);
      expect([...palette.image.gifBytes]).toEqual([...bytes]);
    }
  });

  it.each([
    ['before images', [loop('ANIMEXTS1.0', 2), patch(0), patch(1)], 2],
    ['between images', [patch(0), loop('ANIMEXTS1.0', 3), patch(1)], 3],
    ['after images', [patch(0), patch(1), loop('ANIMEXTS1.0', 4)], 4],
    ['repeated aliases', [loop('ANIMEXTS1.0', 2), loop('ANIMEXTS1.0', 5), patch(0)], 5],
    ['mixed Netscape last', [loop('ANIMEXTS1.0', 2), patch(0), loop('NETSCAPE2.0', 7), patch(1)], 7],
    ['mixed alias last', [loop('NETSCAPE2.0', 7), patch(0), loop('ANIMEXTS1.0', 2), patch(1)], 2],
    ['later Netscape behavior retained', [loop('NETSCAPE2.0', 7), patch(0), loop('NETSCAPE2.0', 2)], 2],
  ])('uses the last valid framed extension: %s', async (_, blocks, expected) => {
    const bytes = gif(blocks);
    expect(decodeGif(bytes).loop).toBe(expected);
    expect((await decodeGifAsync(bytes)).loop).toBe(expected);
    expect((await visitGifFrames(bytes, () => {})).loop).toBe(expected);
  });

  it('ignores identifiers inside comments, unrelated application payload and bytes after the trailer', () => {
    const fake = loop('ANIMEXTS1.0', 3);
    const comment = [0x21, 0xfe, fake.length, ...fake, 0];
    const unrelated = [0x21, 0xff, 11, ...new TextEncoder().encode('TESTAPP0001'), fake.length, ...fake, 0];
    const bytes = Uint8Array.from([...gif([comment, unrelated, patch(0)]), ...fake]);
    expect(decodeGif(bytes).loop).toBe(null);
  });

  it('does not scan a global color table or an image data sub-block for loop-like bytes', () => {
    const decoy = loop('ANIMEXTS1.0', 3), table = new Uint8Array(768);
    table.set(decoy);
    const image = patch(1);
    // A separate, framed image-data sub-block after EOI is deliberately ignored
    // by the LZW decoder, while remaining within the image's data bounds.
    image.splice(image.length - 1, 0, decoy.length, ...decoy);
    const bytes = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 135, 0, 0,
      ...table, ...image, 0x3b]);
    const decoded = decodeGif(bytes);
    expect(decoded.loop).toBe(null); expect(decoded.frames).toHaveLength(1);
    expect([...decoded.frames[0].data]).toEqual([...table.slice(3, 6), 255]);
  });

  it('reads an initial extension with no global table and a first-image local table', async () => {
    const image = patch(1); image[9] = 0x80;
    image.splice(10, 0, 255, 0, 0, 0, 0, 255);
    const bytes = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0,
      ...loop('ANIMEXTS1.0', 2), ...image, 0x3b]);
    expect(decodeGif(bytes).loop).toBe(2);
    expect([...decodeGif(bytes).frames[0].data]).toEqual([0, 0, 255, 255]);
    expect((await visitGifFrames(bytes, () => {})).loop).toBe(2);
  });

  it.each(['NETSCAPE2.0', 'ANIMEXTS1.0'])('ignores well-framed split/unknown payloads for %s without erasing earlier valid repeats', identifier => {
    const header = [0x21, 0xff, 11, ...new TextEncoder().encode(identifier)];
    for (const payload of [[2, 1, 9, 1, 0, 0], [3, 2, 9, 0, 0], [4, 1, 9, 0, 0, 0], [0]]) {
      expect(decodeGif(gif([loop(identifier, 4), [...header, ...payload], patch(0)])).loop).toBe(4);
    }
  });

  it('does not let a loop extension inherit or synthesize graphic-control state', () => {
    const bytes = gif([control, patch(1), loop('ANIMEXTS1.0', 2), patch(0)]);
    const result = decodeGif(bytes);
    expect(result.frames.map(f => [...f.data])).toEqual([[0, 0, 255, 255], [255, 0, 0, 255]]);
    expect(result.frames.map(f => f.delay)).toEqual([200, 100]);
    expect(result.loop).toBe(2);
  });

  it('rejects truncated sub-block framing without publishing a completed result', async () => {
    const bytes = gif([patch(0), loop('ANIMEXTS1.0', 2)]).slice(0, -3);
    expect(() => decodeGif(bytes)).toThrow();
    await expect(decodeGifAsync(bytes)).rejects.toMatchObject({ code: 'GIF_INVALID' });
    await expect(visitGifFrames(bytes, vi.fn())).rejects.toMatchObject({ code: 'GIF_INVALID' });
    await expect(decodePaletteFile(file(bytes))).rejects.toMatchObject({ code: 'GIF_INVALID' });
  });

  it('retains loop metadata in the raw decoder for a single-frame GIF', () => {
    const decoded = decodeGif(gif([loop('ANIMEXTS1.0', 2), patch(0)]));
    expect(decoded.loop).toBe(2); expect(decoded.frames).toHaveLength(1);
    // Artwork acquisition, tested in the browser, deliberately publishes this
    // as a still without loop/delay so it saves as PNG.
  });

  it.each([null, 0, 2, 65535])('preserves repeat %s in Palette and 1-bit Save and exact ZIP bytes', async count => {
    const source = decodeGif(gif([...(count === null ? [] : [loop('ANIMEXTS1.0', count)]), patch(0), patch(1)]));
    const palette = await encodePaletteGif({ w: 1, h: 1, loop: source.loop, colors: ['#ff0000', '#0000ff'],
      frames: source.frames.map((f, i) => ({ indices: Uint16Array.of(i), delay: f.delay })) });
    const onebit = await encodeGifAsync({ w: 1, h: 1, loop: source.loop, first: '#ff0000', second: '#0000ff',
      frames: source.frames.map((f, i) => ({ mask: Uint8Array.of(i + 1), delay: f.delay })) });
    expect(decodeGif(palette).loop).toBe(count); expect(decodeGif(onebit).loop).toBe(count);
    const names = outNames(['palette.gif', 'onebit.gif'], ['gif', 'gif']), entries = unzipSync(zipBytes(names, [palette, onebit]));
    expect(entries[names[0]]).toEqual(palette); expect(entries[names[1]]).toEqual(onebit);
  });
});
