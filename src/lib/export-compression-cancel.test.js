import { expect, it, vi } from 'vitest';
const control = vi.hoisted(() => ({ codec: vi.fn() }));
vi.mock('fflate', async original => ({ ...await original(), zlib: (...args) => control.codec(...args) }));
import { palettePngBytesAsync } from './save.js';

it('terminates pending PNG compression and ignores a late callback after cancellation', async () => {
  let callback; const terminate = vi.fn();
  control.codec.mockImplementation((rows, options, done) => { callback = done; return terminate; });
  const controller = new AbortController();
  // Larger than one 64 KiB packing batch, so it is compressed off the main thread.
  const indices = new Uint16Array(1024 * 300); indices[1] = 1; indices[2] = 256;
  const pending = palettePngBytesAsync({ colors: ['#000000', '#ffffff'], w: 1024, h: 300, indices }, { signal: controller.signal });
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(callback).toBeTypeOf('function'));
  controller.abort(); await rejected;
  callback(null, Uint8Array.of(1));
  expect(terminate).toHaveBeenCalledOnce();
});

it('compresses rows that fit one packing batch without starting the codec worker', async () => {
  control.codec.mockClear();
  const bytes = await palettePngBytesAsync({ colors: ['#000000', '#ffffff'], w: 3, h: 1, indices: Uint16Array.of(0, 1, 256) });
  expect(bytes[1]).toBe(0x50);
  expect(control.codec).not.toHaveBeenCalled();
});
