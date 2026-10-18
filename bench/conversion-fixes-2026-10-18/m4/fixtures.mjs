import omggif from 'omggif';

export const loopExtension = (identifier, repeat) => [0x21, 0xff, 11,
  ...new TextEncoder().encode(identifier), 3, 1, repeat & 255, repeat >> 8, 0];

export function fixture({ identifier = 'ANIMEXTS1.0', repeat = 2, single = false } = {}) {
  const storage = new Uint8Array(4096);
  const writer = new omggif.GifWriter(storage, 2, 1, { palette: [0, 0xffffff],
    ...(repeat == null ? {} : { loop: repeat }) });
  writer.addFrame(0, 0, 2, 1, Uint8Array.of(0, 1), { delay: 10, disposal: 2 });
  if (!single) writer.addFrame(0, 0, 2, 1, Uint8Array.of(1, 0), { delay: 20, disposal: 2 });
  const bytes = storage.slice(0, writer.end());
  if (repeat != null) bytes.set(new TextEncoder().encode(identifier), 22);
  return bytes;
}
