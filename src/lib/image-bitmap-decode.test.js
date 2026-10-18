import { afterEach, describe, expect, it, vi } from 'vitest';
import { inflateSync, crc32 } from 'node:zlib';
import { decodeStraightBitmap } from './image-bitmap-decode.js';
import { decodeImageFile } from './image-decode.js';

afterEach(() => vi.unstubAllGlobals());
const control = Uint8Array.of(0, 0, 0, 0, 29, 43, 83, 1, 231, 107, 57, 2, 63, 151, 219, 64,
  184, 79, 143, 127, 57, 203, 111, 128, 209, 143, 37, 254, 91, 67, 173, 255);
const source = Uint8ClampedArray.of(29, 43, 83, 1, 184, 79, 143, 127, 57, 203, 111, 128, 0, 0, 0, 0);
function setup({ probePixels = control, bitmapHook, frameHook, copyHook } = {}) {
  const file = { name: 'sprite.png', type: 'image/png', stream: () => new ReadableStream() }, bitmaps = [], frames = [];
  const bitmap = vi.fn(async (input, options) => {
    const value = { kind: input === file ? 'source' : 'probe', input, width: input === file ? 2 : 4,
      height: 2, close: vi.fn() };
    bitmaps.push(value);
    if (bitmapHook) return bitmapHook(value, options);
    return value;
  });
  const Frame = vi.fn(function (input, options) {
    const frame = { input, displayWidth: input.width, displayHeight: input.height,
      visibleRect: { width: input.width, height: input.height }, close: vi.fn(),
      copyTo: vi.fn(async (data, settings) => {
        if (copyHook) return copyHook(frame, data, settings);
        data.set(input.kind === 'probe' ? probePixels : source); return settings.layout;
      }) };
    frames.push(frame); frameHook?.(frame, options); return frame;
  });
  vi.stubGlobal('createImageBitmap', bitmap); vi.stubGlobal('VideoFrame', Frame);
  vi.stubGlobal('ImageDecoder', undefined);
  vi.stubGlobal('ImageData', class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } });
  const canvas = vi.fn(() => { throw Error('Unexpected canvas fallback'); });
  vi.stubGlobal('document', { createElement: canvas });
  return { file, bitmap, Frame, bitmaps, frames, canvas, checkDimensions: vi.fn() };
}
const options = state => ({ checkDimensions: state.checkDimensions });
const closed = state => {
  for (const item of [...state.bitmaps, ...state.frames]) expect(item.close).toHaveBeenCalledOnce();
};

describe('verified straight-alpha ImageBitmap acquisition', () => {
  it('keeps artwork admission failures authoritative after the verified probe', async () => {
    const state = setup(), error = Object.assign(new Error('Artwork budget'), { code: 'ARTWORK_MEMORY_LIMIT' });
    await expect(decodeImageFile(state.file, { admit() { throw error; } })).rejects.toBe(error);
    expect(state.bitmap).toHaveBeenCalledTimes(2); expect(state.canvas).not.toHaveBeenCalled();
    expect(state.frames).toHaveLength(1); closed(state);
  });
  it('decodes a real tagged PNG probe with independently checked CRC, geometry and RGBA', async () => {
    const state = setup(); await decodeStraightBitmap(state.file, options(state));
    const blob = state.bitmaps[0].input, png = Buffer.from(await blob.arrayBuffer());
    expect(blob.type).toBe('image/png'); expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    const payload = []; let srgb = false;
    for (let at = 8; at < png.length;) {
      const length = png.readUInt32BE(at), body = png.subarray(at + 4, at + 8 + length), tag = body.toString('ascii', 0, 4), data = body.subarray(4);
      expect(crc32(body)).toBe(png.readUInt32BE(at + 8 + length));
      if (tag === 'IHDR') expect([...data]).toEqual([0, 0, 0, 4, 0, 0, 0, 2, 8, 6, 0, 0, 0]);
      if (tag === 'sRGB') { expect([...data]).toEqual([0]); srgb = true; }
      if (tag === 'IDAT') payload.push(data);
      at += length + 12;
    }
    expect(srgb).toBe(true);
    const raw = inflateSync(Buffer.concat(payload)); expect(raw[0]).toBe(0); expect(raw[17]).toBe(0);
    expect(Buffer.concat([raw.subarray(1, 17), raw.subarray(18)])).toEqual(Buffer.from(control));
  });
  it('copies every source byte without canvas, retaining color management and exact layout', async () => {
    const state = setup(), image = await decodeStraightBitmap(state.file, options(state));
    expect(image).toEqual({ data: source, width: 2, height: 2 });
    expect(state.checkDimensions).toHaveBeenCalledExactlyOnceWith(2, 2);
    for (const call of state.bitmap.mock.calls) expect(call[1]).toEqual({ premultiplyAlpha: 'none', colorSpaceConversion: 'default' });
    expect(state.frames[1].copyTo).toHaveBeenCalledWith(image.data, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: 8 }] });
    expect(state.canvas).not.toHaveBeenCalled(); closed(state);
  });
  it.each([4, 7, 19, 28])('rejects a changed visible probe color/alpha byte at %i before decoding artwork', async offset => {
    const altered = control.slice(); altered[offset] ^= 1; const state = setup({ probePixels: altered });
    expect(await decodeStraightBitmap(state.file, options(state))).toBeNull();
    expect(state.bitmap).toHaveBeenCalledOnce(); expect(state.checkDimensions).not.toHaveBeenCalled(); closed(state);
  });
  it('does not require hidden RGB in completely transparent probe pixels', async () => {
    const altered = control.slice(); altered[0] = 255; const state = setup({ probePixels: altered });
    expect((await decodeStraightBitmap(state.file, options(state))).data).toEqual(source); closed(state);
  });
  it.each(['VideoFrame', 'createImageBitmap'])('declines missing %s capability without starting work', async name => {
    const state = setup(); vi.stubGlobal(name, undefined);
    expect(await decodeStraightBitmap(state.file, options(state))).toBeNull(); expect(state.Frame).not.toHaveBeenCalled();
  });
  it('checks source limits before constructing its VideoFrame', async () => {
    const state = setup(), problem = new Error('Pixel limit'); state.checkDimensions.mockImplementation(() => { throw problem; });
    await expect(decodeStraightBitmap(state.file, options(state))).rejects.toBe(problem);
    expect(state.frames).toHaveLength(1); closed(state);
  });
  it.each(['probe', 'source'])('closes resources after a %s copy rejection', async kind => {
    const state = setup({ copyHook: async (frame, data, settings) => {
      if (frame.input.kind === kind) throw Error('Copy failed'); data.set(control); return settings.layout;
    } });
    await expect(decodeStraightBitmap(state.file, options(state))).rejects.toThrow('Copy failed'); closed(state);
  });
  it.each(['probe', 'source'])('rejects unexpected %s geometry instead of applying orientation twice', async kind => {
    const state = setup({ frameHook: frame => { if (frame.input.kind === kind) frame.rotation = 90; } });
    await expect(decodeStraightBitmap(state.file, options(state))).rejects.toThrow(/presentation/); closed(state);
  });
  it('rejects unexpected packed layout', async () => {
    const state = setup({ copyHook: async () => [{ offset: 4, stride: 16 }] });
    await expect(decodeStraightBitmap(state.file, options(state))).rejects.toThrow(/layout/); closed(state);
  });
  it('cancels before starting any probe work', async () => {
    const state = setup(), controller = new AbortController(); controller.abort();
    await expect(decodeStraightBitmap(state.file, { ...options(state), signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(state.bitmap).not.toHaveBeenCalled();
  });
  it.each(['probe', 'source'])('cancels a pending %s bitmap and closes its eventual result', async kind => {
    let release, started; const ready = new Promise(resolve => started = resolve), pending = new Promise(resolve => release = resolve);
    const state = setup({ bitmapHook: async bitmap => { if (bitmap.kind === kind) { started(); await pending; } return bitmap; } });
    const controller = new AbortController(), result = decodeStraightBitmap(state.file, { ...options(state), signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await ready; controller.abort(); release(); await rejected; closed(state);
  });
  it.each(['probe', 'source'])('cancels a pending %s copy, closes once and cannot poison a later request', async kind => {
    let release, started; const ready = new Promise(resolve => started = resolve), pending = new Promise(resolve => release = resolve);
    const state = setup({ copyHook: async (frame, data, settings) => {
      if (frame.input.kind === kind) { started(); await pending; }
      data.set(frame.input.kind === 'probe' ? control : source); return settings.layout;
    } });
    const controller = new AbortController(), result = decodeStraightBitmap(state.file, { ...options(state), signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await ready; controller.abort(); release(); await rejected; closed(state);
    const next = setup(); expect((await decodeStraightBitmap(next.file, options(next))).data).toEqual(source); closed(next);
  });
  it('is used by shared still acquisition when ImageDecoder is absent', async () => {
    const state = setup(); expect((await decodeImageFile(state.file)).data).toEqual(source);
    expect(state.canvas).not.toHaveBeenCalled(); closed(state);
  });
  it('replaces all-null premultiplied native frames instead of copying their damaged pixels', async () => {
    const state = setup(), nativeFrame = { displayWidth: 2, displayHeight: 2, visibleRect: { width: 2, height: 2 },
      format: 'BGRA', colorSpace: { primaries: null, transfer: null, matrix: null, fullRange: null }, copyTo: vi.fn(), close: vi.fn() };
    const decoder = { decode: vi.fn(async () => ({ image: nativeFrame })), close: vi.fn() };
    const Native = vi.fn(function () { return decoder; }); Native.isTypeSupported = vi.fn(async () => true);
    vi.stubGlobal('ImageDecoder', Native);
    const image = await decodeImageFile(state.file);
    expect(image.data).toEqual(source); expect(nativeFrame.copyTo).not.toHaveBeenCalled();
    expect(nativeFrame.close).toHaveBeenCalledOnce(); expect(decoder.close).toHaveBeenCalledOnce();
    expect(state.canvas).not.toHaveBeenCalled(); closed(state);
  });
  it('retains the legacy browser route if the precision probe fails', async () => {
    const altered = control.slice(); altered[4] ^= 1; const state = setup({ probePixels: altered });
    const rounded = { data: source.slice(), width: 2, height: 2 }; rounded.data[0] = 0;
    const canvas = { getContext: () => ({ drawImage() {}, getImageData: () => rounded }) }; state.canvas.mockReturnValue(canvas);
    expect(await decodeImageFile(state.file)).toBe(rounded);
    expect(state.bitmap).toHaveBeenCalledTimes(2); expect(state.bitmap.mock.calls[1]).toEqual([state.file]);
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0); closed(state);
  });
  it('closes a decoded bitmap if the VideoFrame constructor rejects it', async () => {
    const state = setup(); state.Frame.mockImplementation(() => { throw Error('Unsupported constructor'); });
    await expect(decodeStraightBitmap(state.file, options(state))).rejects.toThrow('Unsupported constructor'); closed(state);
  });
  it('preserves the shared pixel-limit error instead of falling back to canvas', async () => {
    const state = setup();
    await expect(decodeImageFile(state.file, { maxPixels: 3, limitMessage: 'Too large for palette' })).rejects.toThrow('Too large for palette');
    expect(state.canvas).not.toHaveBeenCalled(); closed(state);
  });
});
