import { ARTWORK_FRAMES, ARTWORK_BYTES, artworkCost, artworkLimit, gifDecodeHold } from './artwork-admission.js';
import { checkCanceled, yieldTask } from './quantize.js';

function invalid() { const error = new Error('Invalid GIF framing or dimensions.'); error.code = 'GIF_INVALID'; throw error; }

// Constant metadata storage: skip framed payloads, never search their bytes for
// image markers. Run before GifReader creates its per-frame metadata array.
function* steps(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 13
    || !['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.subarray(0, 6)))) invalid();
  const word = p => bytes[p] | bytes[p + 1] << 8;
  const width = word(6), height = word(8);
  if (!width || !height) invalid();
  artworkCost(width, height);
  let cursor = 13, count = 0, nextYield = 131072;
  const skip = size => { if (cursor + size > bytes.length) invalid(); cursor += size; };
  const blocks = function* () {
    while (true) {
      if (cursor >= bytes.length) invalid();
      const size = bytes[cursor++]; if (!size) return;
      skip(size);
      if (cursor >= nextYield) { nextYield = cursor + 131072; yield; }
    }
  };
  const global = !!(bytes[10] & 128);
  if (global) skip(3 * (1 << ((bytes[10] & 7) + 1)));
  while (cursor < bytes.length) {
    const block = bytes[cursor++];
    if (block === 0x3b) break;
    if (block === 0x21) {
      if (cursor >= bytes.length) invalid();
      const label = bytes[cursor++];
      if (![0xf9, 0xfe, 0xff].includes(label)) invalid();
      if (label === 0xf9 && (bytes[cursor] !== 4 || cursor + 6 > bytes.length || bytes[cursor + 5] !== 0)) invalid();
      // GifReader uses a fixed-size application-header skip. Only the GIF
      // format's11-byte header keeps its parsing aligned with this preflight.
      if (label === 0xff && bytes[cursor] !== 11) invalid();
      yield* blocks();
    } else if (block === 0x2c) {
      if (cursor + 9 > bytes.length) invalid();
      const x = word(cursor), y = word(cursor + 2), w = word(cursor + 4), h = word(cursor + 6), packed = bytes[cursor + 8];
      if (!w || !h || x + w > width || y + h > height) invalid();
      cursor += 9;
      if (packed & 128) skip(3 * (1 << ((packed & 7) + 1))); else if (!global) invalid();
      skip(1); // LZW minimum code size; the strict decoder validates its codes.
      yield* blocks();
      if (++count > ARTWORK_FRAMES) throw artworkLimit();
    } else invalid();
    if (cursor >= nextYield) { nextYield = cursor + 131072; yield; }
  }
  if (!count) invalid();
  const retained = artworkCost(width, height, count);
  if (retained + gifDecodeHold(width * height, bytes.length) > ARTWORK_BYTES) throw artworkLimit();
  return { width, height, count, retained };
}
export function preflightArtworkGif(bytes) {
  const scan = steps(bytes); let result;
  do { result = scan.next(); } while (!result.done);
  return result.value;
}
export async function preflightArtworkGifAsync(bytes, signal) {
  checkCanceled(signal);
  const scan = steps(bytes); let result;
  do {
    checkCanceled(signal); result = scan.next();
    if (!result.done) await yieldTask();
  } while (!result.done);
  return result.value;
}
