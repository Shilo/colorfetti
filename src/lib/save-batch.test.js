import { afterEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';

const pause = vi.hoisted(() => vi.fn());
vi.mock('./palette-export.js', async importOriginal => ({ ...await importOriginal(), yieldExport: pause }));
import { saveAll, pngBytes, fileBytes } from './save.js';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); pause.mockReset(); });

function downloads() {
  const blobs = [], names = [];
  vi.stubGlobal('document', {
    createElement: () => ({ click() { names.push(this.download); }, remove() {} }),
    body: { append() {} },
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:test'; });
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0);
  return { blobs, names };
}
const images = ['one.png', 'two.png', 'three.png'].map((name, i) => ({
  name, w: 1, h: 1, first: '#ffffff', second: '#000000', mask: Uint8Array.of(i),
}));

describe('atomic batch export scheduling', () => {
  it('yields between files, preserving order and identical PNG content', async () => {
    const captured = downloads(), order = [];
    pause.mockImplementation(async () => { order.push('yield'); expect(captured.names).toEqual([]); });
    await saveAll(images, image => { order.push(image.name); return image; });
    expect(order).toEqual(['one.png', 'yield', 'two.png', 'yield', 'three.png']);
    expect(captured.names).toEqual(['colorfetti.zip']);
    const files = unzipSync(new Uint8Array(await captured.blobs[0].arrayBuffer()));
    expect(Object.keys(files)).toEqual(['one-colorfetti.png', 'two-colorfetti.png', 'three-colorfetti.png']);
    for (const image of images) expect(files[image.name.replace('.png', '-colorfetti.png')]).toEqual(pngBytes(image));
  });

  it('downloads nothing if a later file fails after yielding', async () => {
    const captured = downloads();
    await expect(saveAll(images, image => {
      if (image === images[1]) throw new Error('source unavailable');
      return image;
    })).rejects.toThrow('source unavailable');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(captured.names).toEqual([]);
    expect(captured.blobs).toEqual([]);
  });

  it('preserves every encoded file when formats and families share numbered basenames', async () => {
    const captured = downloads();
    // Exercise the library's shared namespace, even though a wall uses one family.
    const palette = { family: 'full-palette', colors: ['#ffffff', '#000000'], w: 1, h: 1 };
    const batch = [
      { ...images[0], name: 'same.jpg' },
      { ...palette, name: 'SAME.webp', indices: Uint16Array.of(1) },
      { ...images[1], name: 'same-2.bmp' },
      { ...images[0], name: 'same.gif', mask: undefined, loop: 3,
        frames: [{ mask: Uint8Array.of(1), delay: 70 }, { mask: Uint8Array.of(2), delay: 130 }] },
      { ...palette, name: 'SAME.gif', loop: 3,
        frames: [{ indices: Uint16Array.of(0), delay: 70 }, { indices: Uint16Array.of(1), delay: 130 }] },
    ];
    const expectedBytes = [];
    for (const image of batch) expectedBytes.push(await fileBytes(image));
    await saveAll(batch, image => image);
    expect(captured.names).toEqual(['colorfetti.zip']);
    const files = unzipSync(new Uint8Array(await captured.blobs[0].arrayBuffer()));
    const names = ['same-colorfetti.png', 'SAME-2-colorfetti.png', 'same-2-2-colorfetti.png', 'same-colorfetti.gif', 'SAME-2-colorfetti.gif'];
    expect(Object.keys(files)).toEqual(names);
    names.forEach((name, index) => expect(files[name]).toEqual(expectedBytes[index]));
  });

  it('keeps a single-file download without an extra batch yield', async () => {
    const captured = downloads();
    await saveAll(images.slice(0, 1), image => image);
    expect(captured.names).toEqual(['one-colorfetti.png']);
    expect(pause).not.toHaveBeenCalled();
  });
});
