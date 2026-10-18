// LZW dictionary representation and code-width timing adapted from omggif.
// Copyright (c) Dean McNamee <dean@gmail.com>, 2013.
// https://github.com/deanm/omggif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

function invalid(reason) {
  const problem = new Error(`Invalid GIF ${reason}.`);
  problem.code = 'GIF_INVALID';
  throw problem;
}

// GifReader supplies framing metadata; its private LZW decoder only warns on
// short/long streams and reads out-of-table indices as RGB from unrelated bytes.
// Decode once, validating every emitted index before copying exact palette RGB.
// The dictionary and reversed-string stack remain bounded at 4096 entries.
// A caller must discard the unpublished canvas if a later code is invalid.
export function decodeGifFrame(bytes, info, canvas, logicalWidth) {
  const { width, height, x, y, palette_offset: palette, palette_size: paletteSize,
    data_offset: offset, data_length: length, transparent_index: transparent, interlaced } = info;
  const end = offset + length, count = width * height;
  if (![width, height, logicalWidth].every(n => Number.isSafeInteger(n) && n > 0)
    || !Number.isSafeInteger(x) || x < 0 || !Number.isSafeInteger(y) || y < 0
    || x + width > logicalWidth || (y + height) * logicalWidth * 4 > canvas.length
    || !Number.isSafeInteger(palette) || palette < 0 || !Number.isInteger(paletteSize) || paletteSize < 2 || paletteSize > 256
    || palette + paletteSize * 3 > bytes.length || !Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(length) || length < 3 || end > bytes.length) invalid('frame bounds');
  const minimum = bytes[offset];
  if (minimum < 2 || minimum > 8) invalid('LZW minimum code size');

  let cursor = offset + 1, remaining = 0, accumulator = 0, available = 0;
  const clear = 1 << minimum, eoi = clear + 1, firstFree = eoi + 1;
  let next = firstFree, size = minimum + 1, previous = -1, first = 0, output = 0, widened = false;
  const dictionary = new Int32Array(4096), stack = new Uint8Array(4096);
  let column = 0, row = 0, pass = 0, step = interlaced ? 8 : 1;
  let destination = (y * logicalWidth + x) * 4;

  while (true) {
    let shortEoi = false;
    while (available < size) {
      if (!remaining) {
        if (cursor >= end) invalid('LZW block termination');
        remaining = bytes[cursor++];
        if (!remaining) {
          // omggif's writer emits EOI at the old width when the final literal
          // grows the dictionary. Accept only that exact terminal pattern,
          // after every expected pixel has already passed palette validation.
          if (widened && output === count && available === size - 1 && accumulator === eoi) {
            shortEoi = true; break;
          }
          invalid('LZW stream without an end code');
        }
        if (cursor + remaining > end) invalid('LZW block bounds');
      }
      accumulator |= bytes[cursor++] << available;
      available += 8; remaining--;
    }
    const code = shortEoi ? eoi : accumulator & ((1 << size) - 1);
    if (!shortEoi) { accumulator >>>= size; available -= size; }
    if (code === clear) {
      next = firstFree; size = minimum + 1; previous = -1; widened = false;
      continue;
    }
    if (code === eoi) {
      if (output !== count) invalid('LZW pixel count');
      if (shortEoi) {
        if (cursor !== end) invalid('LZW block termination');
        return;
      }
      // Remaining payload after EOI is ignored, as in native GIF decoders, but
      // every sub-block still needs to stay within this frame and terminate.
      cursor += remaining;
      while (cursor < end) {
        const block = bytes[cursor++];
        if (!block) {
          if (cursor !== end) invalid('LZW block termination');
          return;
        }
        if (cursor + block > end) invalid('LZW block bounds');
        cursor += block;
      }
      invalid('LZW block termination');
    }
    if (code > next || (code === next && previous < 0)) invalid('LZW dictionary code');
    let chase = code, top = 0;
    if (code === next) { stack[top++] = first; chase = previous; }
    while (chase >= clear) {
      if (chase < firstFree || chase >= next || top >= stack.length) invalid('LZW dictionary chain');
      const entry = dictionary[chase];
      stack[top++] = entry & 255;
      const prefix = entry >>> 8;
      if (prefix >= chase) invalid('LZW dictionary chain');
      chase = prefix;
    }
    first = chase;
    if (top >= stack.length) invalid('LZW dictionary chain');
    stack[top++] = first;
    if (output + top > count) invalid('LZW pixel count');
    output += top;
    while (top) {
      const index = stack[--top];
      if (index >= paletteSize) invalid('palette index');
      if (index !== transparent) {
        const color = palette + index * 3;
        canvas[destination] = bytes[color];
        canvas[destination + 1] = bytes[color + 1];
        canvas[destination + 2] = bytes[color + 2];
        canvas[destination + 3] = 255;
      }
      destination += 4;
      if (++column === width) {
        column = 0; row += step;
        if (interlaced) while (row >= height && pass < 3) {
          pass++;
          row = pass === 1 ? 4 : pass === 2 ? 2 : 1;
          step = pass === 3 ? 2 : pass === 2 ? 4 : 8;
        }
        destination = ((y + row) * logicalWidth + x) * 4;
      }
    }
    widened = false;
    if (previous >= 0 && next < 4096) {
      dictionary[next++] = previous << 8 | first;
      if (next === 1 << size && size < 12) { size++; widened = true; }
    }
    previous = code;
  }
}
