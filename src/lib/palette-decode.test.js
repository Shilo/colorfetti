import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import omggif from 'omggif';
import { decodePaletteFile, extractPaletteImage, MAX_IMAGE_BYTES } from './palette-decode.js';
import { decodeGif, encodePaletteGif } from './gif.js';
import { captureGeneratedSources } from './palette-generated-sources.js';
import { generatePaletteAsync } from './palette-generated.js';
import { preparePalette, quantizeAsync } from './quantize.js';

afterEach(() => vi.unstubAllGlobals());
const fixture = () => readFileSync(new URL('./fixtures/palette-import/palette.ase', import.meta.url));
const file = (name, bytes = fixture()) => ({ name, size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

describe('palette file routing and cancellation', () => {
  it.each(['palette.ase', 'palette.aseprite', 'PALETTE.ASE', 'PALETTE.ASEPRITE'])('imports %s without an image decoder', async name => {
    const bitmap = vi.fn(); vi.stubGlobal('createImageBitmap', bitmap);
    const result = await decodePaletteFile(file(name));
    expect(result.colors).toHaveLength(255);
    expect(result.colors[0]).toBe('#ff494b');
    expect(result.colors[254]).toBe('#f6f4f4');
    expect(result).toMatchObject({ image: null, total: 255, partialAlpha: false, firstFrame: false, source: { kind: 'aseprite' } });
    expect(bitmap).not.toHaveBeenCalled();
  });
  it('enforces the byte limit before reading or decoding', async () => {
    const input = { name: 'oversize.ase', size: MAX_IMAGE_BYTES + 1, arrayBuffer: vi.fn() };
    await expect(decodePaletteFile(input)).rejects.toThrow(/32 MiB/);
    expect(input.arrayBuffer).not.toHaveBeenCalled();
  });
  it('rejects canceled work before reading and after a pending read', async () => {
    const canceled = new AbortController(); canceled.abort();
    const input = { ...file('canceled.ase'), arrayBuffer: vi.fn() };
    await expect(decodePaletteFile(input, { signal: canceled.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(input.arrayBuffer).not.toHaveBeenCalled();
    let release, notify;
    const started = new Promise(resolve => notify = resolve);
    const pending = new Promise(resolve => release = resolve), controller = new AbortController();
    const bytes = fixture();
    const result = decodePaletteFile({ ...file('pending.ase'), arrayBuffer: () => { notify(); return pending; } }, { signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await started; controller.abort(); release(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    await rejected;
  });
  it('rejects Adobe ASE and unsupported extensions through useful errors', async () => {
    await expect(decodePaletteFile(file('adobe.ase', Buffer.from('ASEF')))).rejects.toThrow(/Aseprite/);
    await expect(decodePaletteFile({ name: 'palette.aco', size: 0 })).rejects.toThrow(/Aseprite palette file/);
  });
  it('keeps cancellation authoritative when a pending Aseprite read fails', async () => {
    let rejectRead, notify;
    const started = new Promise(resolve => notify = resolve);
    const pending = new Promise((resolve, reject) => rejectRead = reject), controller = new AbortController();
    const result = decodePaletteFile({ name: 'pending.ase', size: 2055, arrayBuffer: () => { notify(); return pending; } }, { signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await started; controller.abort(); rejectRead(new Error('Late read failure'));
    await rejected;
  });
  it('preserves a read failure when the import was not canceled', async () => {
    const problem = new Error('Palette file could not be read');
    await expect(decodePaletteFile({ name: 'unreadable.ase', size: 2055, arrayBuffer: async () => { throw problem; } })).rejects.toBe(problem);
  });
  it.each([
    ['hex', '#123456 #abcdef #123456'], ['txt', '#123456 #abcdef'],
    ['gpl', 'GIMP Palette\n18 52 86\n171 205 239'],
    ['pal', 'JASC-PAL\n0100\n2\n18 52 86\n171 205 239'],
  ])('retains existing %s text routing', async (extension, text) => {
    const read = vi.fn(async () => text), buffer = vi.fn();
    const result = await decodePaletteFile({ name: 'palette.' + extension, size: text.length, text: read, arrayBuffer: buffer });
    expect(result.colors).toEqual(['#123456', '#abcdef']);
    expect(result.source.kind).toBe(extension === 'txt' ? 'hex' : extension);
    expect(buffer).not.toHaveBeenCalled();
  });
  it('retains image extraction and bitmap cleanup', async () => {
    const image = { width: 2, height: 1, data: Uint8ClampedArray.of(18, 52, 86, 255, 171, 205, 239, 127) };
    const bitmap = { width: 2, height: 1, close: vi.fn() }, context = { drawImage: vi.fn(), getImageData: vi.fn(() => image) };
    const canvas = { getContext: vi.fn(() => context) };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    const result = await decodePaletteFile({ name: 'palette.webp', type: 'image/webp', size: 10 });
    expect(result).toMatchObject({ colors: ['#123456', '#abcdef'], firstFrame: false, partialAlpha: true, source: { kind: 'image' } });
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
});

function gifFile(frames, { width = 3, height = 3, name = 'palette.gif', type = 'image/gif' } = {}) {
  const bytes = new Uint8Array(1024 * 128);
  const writer = new omggif.GifWriter(bytes, width, height, { palette: [0x00ff00, 0x123456, 0xabcdef, 0], loop: 3 });
  for (const frame of frames) writer.addFrame(frame.x ?? 0, frame.y ?? 0, frame.width ?? width, frame.height ?? height,
    frame.indices ?? new Uint8Array(width * height).fill(1), { delay: 7, transparent: 0, ...frame.options });
  return file(name, bytes.subarray(0, writer.end()));
}

describe('exact whole-animation GIF palette import', () => {
  it.each(['palette.gif', 'PALETTE.GIF', 'no-extension'])('reads %s without canvas or native image decoding', async name => {
    const bitmap = vi.fn(() => { throw Error('Canvas must not supply GIF palette colors'); });
    vi.stubGlobal('createImageBitmap', bitmap);
    const input = { ...gifFile([
      { indices: Uint8Array.of(0, 1, 2, 1, 1, 1, 1, 1, 1), options: { disposal: 2 } },
      { options: { palette: [0, 0x334455, 0xabcdef, 0x778899], disposal: 2 } },
    ], { name }), type: name === 'no-extension' ? 'image/gif' : '' };
    const result = await decodePaletteFile(input);
    expect(result).toMatchObject({ colors: ['#123456', '#abcdef', '#334455'], total: 3, frameCount: 2, firstFrame: false, partialAlpha: false });
    expect(result.image.gifBytes).toBeInstanceOf(Uint8Array);
    expect(result.image.data).toBeUndefined(); // No expanded animation kept by the editor.
    expect(bitmap).not.toHaveBeenCalled();
    expect((await extractPaletteImage(result.image, { solid: true })).colors).toEqual(['#334455']);
    expect((await extractPaletteImage(result.image)).colors).toEqual(result.colors);
  });
  it('uses composited frames with keep, clear, restore, local palettes and temporal reading order', async () => {
    const input = gifFile([
      { options: { disposal: 1 } },
      { x: 1, y: 1, width: 1, height: 1, indices: [2], options: { disposal: 3 } },
      { x: 0, y: 0, width: 1, height: 1, indices: [1], options: { palette: [0, 0x445566], disposal: 2 } },
      { x: 2, y: 2, width: 1, height: 1, indices: [2] },
    ]);
    const progress = [], result = await decodePaletteFile(input, { onProgress: p => progress.push(p) });
    expect(result.colors).toEqual(['#123456', '#abcdef', '#445566']);
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((v, i) => v >= 0 && v <= 1 && (!i || v >= progress[i - 1]))).toBe(true);
    expect((await extractPaletteImage(result.image, { solid: true })).colors).toEqual(['#123456']);
  });
  it('matches Auto and exact exported pixels across different frame tables', async () => {
    const input = gifFile([
      { indices: Uint8Array.of(0, 1, 2, 1, 1, 2, 2, 1, 0), options: { disposal: 2 } },
      { options: { palette: [0x00ff00, 0x654321, 0x112233, 0], disposal: 2 } },
    ]);
    const source = decodeGif(new Uint8Array(await input.arrayBuffer()));
    const imported = await decodePaletteFile(input);
    const auto = await generatePaletteAsync(captureGeneratedSources([{ frames: source.frames.map(f => ({
      original: { width: source.width, height: source.height, data: f.data }, delay: f.delay,
    })) }]));
    expect([...imported.colors].sort()).toEqual([...auto.colors].sort());
    const prepared = preparePalette(auto.colors);
    const converted = await Promise.all(source.frames.map(async f => ({ ...await quantizeAsync({ width: source.width, height: source.height, data: f.data }, prepared), delay: f.delay })));
    const encoded = await encodePaletteGif({ w: source.width, h: source.height, colors: auto.colors, frames: converted, loop: source.loop });
    expect(decodeGif(encoded)).toEqual(source);
    const again = await decodePaletteFile(file('roundtrip.gif', encoded));
    expect(again.colors).toEqual(imported.colors);
  });
  it('counts a >4096-color union exactly while retaining only4096 review entries', async () => {
    const frames = Array.from({ length: 17 }, (_, f) => ({
      indices: Uint8Array.from({ length: 256 }, (_, i) => i),
      options: { transparent: undefined, palette: Array.from({ length: 256 }, (_, i) => f * 256 + i) },
    }));
    const result = await decodePaletteFile(gifFile(frames, { width: 16, height: 16 }));
    expect(result).toMatchObject({ total: 4352, overLimit: true, truncated: true, frameCount: 17 });
    expect(result.colors).toHaveLength(4096);
    expect(new Set(result.colors).size).toBe(4096);
    expect((await extractPaletteImage(result.image, { solid: true })).total).toBe(0);
  });
  it('cancels after reads and between frames and enforces byte/pixel limits before decoding pixels', async () => {
    const input = gifFile([{}, {}]), original = new Uint8Array(await input.arrayBuffer());
    const huge = original.slice(); huge.set([255, 255, 255, 255], 6);
    await expect(decodePaletteFile(file('huge.gif', huge))).rejects.toThrow(/16 megapixels/);
    await expect(decodePaletteFile({ name: 'huge.gif', size: MAX_IMAGE_BYTES + 1, arrayBuffer: () => { throw Error('Do not read'); } })).rejects.toThrow(/32 MiB/);
    const controller = new AbortController();
    await expect(decodePaletteFile(input, { signal: controller.signal, onProgress: () => controller.abort() })).rejects.toMatchObject({ name: 'AbortError' });
    const canceled = new AbortController();
    const pending = decodePaletteFile({ ...input, arrayBuffer: async () => { canceled.abort(); throw Error('Late failure'); } }, { signal: canceled.signal });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('rejects malformed, empty and truncated GIFs without falling back to canvas', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn());
    for (const bytes of [Buffer.from('bad'), Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00\x3b'), new Uint8Array(await gifFile([{}]).arrayBuffer()).slice(0, -4)]) {
      await expect(decodePaletteFile(file('bad.gif', bytes))).rejects.toThrow();
    }
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
