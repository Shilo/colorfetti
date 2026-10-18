import { describe, expect, it } from 'vitest';
import omggif from 'omggif';
import { decodeGifFrame } from './gif-decode.js';

function pack(codes) {
  const out = []; let bits = 0, value = 0;
  for (const [code, size] of codes) {
    value |= code << bits; bits += size;
    while (bits >= 8) { out.push(value & 255); value >>>= 8; bits -= 8; }
  }
  if (bits) out.push(value & 255);
  return out;
}
function stream(codes, { count = 1, minimum = 2, palette = [0x112233, 0xabcdef], split = 255 } = {}) {
  const rgb = palette.flatMap(c => [c >>> 16, c >>> 8 & 255, c & 255]);
  const payload = pack(codes), blocks = [minimum];
  for (let p = 0; p < payload.length; p += split) {
    const part = payload.slice(p, p + split); blocks.push(part.length, ...part);
  }
  blocks.push(0);
  return { bytes: Uint8Array.from([...rgb, ...blocks]), info: { x: 0, y: 0, width: count, height: 1,
    palette_offset: 0, palette_size: palette.length, data_offset: rgb.length, data_length: blocks.length,
    transparent_index: null, interlaced: false }, canvas: new Uint8ClampedArray(count * 4), width: count };
}
const run = ({ bytes, info, canvas, width }) => { decodeGifFrame(bytes, info, canvas, width); return canvas; };
const codes = (...values) => values.map(c => [c, 3]);
function reject(input) {
  let caught;
  try { run(input); } catch (problem) { caught = problem; }
  expect(caught).toBeInstanceOf(Error);
  expect(caught.code).toBe('GIF_INVALID');
}
function encoded(indices, width, height, palette, options = {}) {
  const bytes = new Uint8Array(indices.length * 3 + 4096);
  const writer = new omggif.GifWriter(bytes, width, height, { palette });
  writer.addFrame(0, 0, width, height, indices, options);
  const result = bytes.subarray(0, writer.end());
  return { bytes: result, info: new omggif.GifReader(result).frameInfo(0), canvas: new Uint8ClampedArray(width * height * 4), width };
}

describe('strict exact GIF frame decoding', () => {
  it('copies exact RGB without requiring an initial clear code', () => {
    expect([...run(stream(codes(1, 1, 5), { count: 2 }))]).toEqual([171, 205, 239, 255, 171, 205, 239, 255]);
  });
  it('handles repeated clears, KwKwK strings and the first code-width transition', () => {
    const input = stream([...codes(4, 4, 1, 6, 7), [5, 4]], { count: 6 });
    expect([...run(input)]).toEqual(Array.from({ length: 6 }, () => [171, 205, 239, 255]).flat());
  });
  it('accepts omggif final EOI encoded at the immediately previous width', () => {
    const input = encoded(Uint8Array.of(0, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 3, 3, 3, 1, 1, 1), 3, 6, [0x112233, 0xabcdef, 0x00ff00, 0x334455]);
    expect([...input.bytes.slice(input.info.data_offset)]).toEqual([2, 6, 132, 47, 25, 59, 189, 81, 0, 59]);
    expect(run(input).filter((_, p) => p % 4 === 3).every(alpha => alpha === 255)).toBe(true);
    // The only accepted short code is EOI. Neighbouring bit patterns, missing
    // output and a missing terminator must not receive the same tolerance.
    for (const terminal of [0x41, 0x61]) {
      const bad = { ...input, bytes: input.bytes.slice(), canvas: input.canvas.slice() };
      bad.bytes[bad.info.data_offset + 7] = terminal;
      reject(bad);
    }
    reject({ ...input, info: { ...input.info, height: 7 }, canvas: new Uint8ClampedArray(3 * 7 * 4) });
    reject({ ...input, bytes: input.bytes.slice(0, -2), info: { ...input.info, data_length: input.info.data_length - 1 } });
  });
  it('handles a frozen full dictionary, deferred clear, 12-bit codes and one-byte sub-blocks', () => {
    const sequence = [[256, 9]];
    // Literal-only codes add one dictionary entry after each first literal.
    // These are explicit GIF width boundaries, independent of the decoder.
    for (let n = 0; n < 5000; n++) sequence.push([n & 1, n < 255 ? 9 : n < 767 ? 10 : n < 1791 ? 11 : 12]);
    sequence.push([256, 12], [1, 9], [257, 9]);
    const input = stream(sequence, { count: 5001, minimum: 8, split: 1 });
    const actual = run(input);
    for (let n = 0; n < 5001; n++) expect([...actual.slice(n * 4, n * 4 + 4)]).toEqual(n === 5000 || n & 1 ? [171, 205, 239, 255] : [17, 34, 51, 255]);
  });
  it('keeps existing canvas pixels for transparent indices', () => {
    const input = stream(codes(4, 0, 1, 5), { count: 2 });
    input.info.transparent_index = 0; input.canvas.set([11, 22, 33, 255]);
    expect([...run(input)]).toEqual([11, 22, 33, 255, 171, 205, 239, 255]);
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16])('places interlaced rows correctly at height %i', height => {
    const width = 3, rows = [];
    for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let row = start; row < height; row += step) rows.push(row);
    const input = encoded(Uint8Array.from(rows.flatMap(row => [row & 3, row & 3, row & 3])), width, height, [0x112233, 0xabcdef, 0x00ff00, 0x334455]);
    input.info.interlaced = true;
    const actual = run(input), table = [[17, 34, 51, 255], [171, 205, 239, 255], [0, 255, 0, 255], [51, 68, 85, 255]];
    for (let p = 0; p < width * height; p++) expect([...actual.slice(p * 4, p * 4 + 4)]).toEqual(table[Math.floor(p / width) & 3]);
  });
  it('matches independently known opaque indices through repeated dictionary growth and reset', () => {
    let seed = 734711;
    const indices = Uint8Array.from({ length: 65536 }, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed >>> 24; });
    const palette = Array.from({ length: 256 }, (_, i) => i * 0x010101);
    const input = encoded(indices, 256, 256, palette), actual = run(input);
    for (let p = 0; p < indices.length; p++) {
      const offset = p * 4;
      if (actual[offset] !== indices[p] || actual[offset + 1] !== indices[p] || actual[offset + 2] !== indices[p] || actual[offset + 3] !== 255) throw Error(`Wrong pixel ${p}`);
    }
  });
  it.each([
    ['short pixel stream', () => stream(codes(4, 5), { count: 9 })],
    ['long pixel stream', () => stream(codes(4, 1, 1, 5))],
    ['missing EOI', () => stream(codes(4, 1))],
    ['unknown dictionary code', () => stream(codes(4, 1, 7, 5), { count: 2 })],
    ['dictionary code before any literal', () => stream(codes(4, 6, 5))],
    ['opaque index outside table', () => stream(codes(4, 3, 5))],
    ['transparent index outside table', () => { const input = stream(codes(4, 3, 5)); input.info.transparent_index = 3; return input; }],
    ['minimum code size 1', () => stream(codes(4, 1, 5), { minimum: 1 })],
    ['minimum code size 9', () => stream(codes(4, 1, 5), { minimum: 9 })],
    ['missing block terminator', () => { const input = stream(codes(4, 1, 5)); input.bytes = input.bytes.slice(0, -1); input.info.data_length--; return input; }],
    ['sub-block exceeds frame bytes', () => { const input = stream(codes(4, 1, 5)); input.bytes[input.info.data_offset + 1] = 255; return input; }],
    ['palette exceeds file bytes', () => { const input = stream(codes(4, 1, 5)); input.info.palette_size = 256; return input; }],
    ['patch exceeds canvas', () => { const input = stream(codes(4, 1, 5)); input.info.x = 1; return input; }],
  ])('rejects %s with a classified integrity error', (_, make) => reject(make()));
  it('accepts framed payload padding after EOI without interpreting it as pixels', () => {
    const input = stream(codes(4, 1, 5));
    const offset = input.info.data_offset;
    input.bytes = Uint8Array.from([...input.bytes.slice(0, -1), 2, 255, 255, 0]);
    input.info.data_length = input.bytes.length - offset;
    expect([...run(input)]).toEqual([171, 205, 239, 255]);
  });
});
