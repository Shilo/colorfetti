// Test-only independent format reader/reference. Never imported by the app.
import assert from 'node:assert/strict';
import { crc32, inflateSync } from 'node:zlib';
import { zlibSync } from 'fflate';

export function readPng(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks = new Map();
  let end = 8;
  for (; end < bytes.length;) {
    const size = view.getUint32(end), body = bytes.subarray(end + 4, end + 8 + size);
    assert.equal(crc32(body), view.getUint32(end + 8 + size));
    chunks.set(String.fromCharCode(...body.subarray(0, 4)), body.subarray(4));
    end += size + 12;
  }
  assert.equal(end, bytes.length);
  const header = chunks.get('IHDR'), hv = new DataView(header.buffer, header.byteOffset);
  const w = hv.getUint32(0), h = hv.getUint32(4), depth = header[8], type = header[9];
  assert.ok(type === 3 || type === 6); assert.equal(header[12], 0);
  const raw = inflateSync(chunks.get('IDAT')), stride = 1 + Math.ceil(w * (type === 6 ? 32 : depth) / 8);
  assert.equal(raw.length, stride * h);
  const pixels = new Uint8Array(w * h * 4), palette = chunks.get('PLTE'), alpha = chunks.get('tRNS');
  for (let y = 0, p = 0; y < h; y++) {
    assert.equal(raw[y * stride], 0);
    for (let x = 0; x < w; x++, p++) {
      const row = y * stride + 1;
      if (type === 6) pixels.set(raw.subarray(row + x * 4, row + x * 4 + 4), p * 4);
      else {
        const bit = x * depth, index = raw[row + (bit >> 3)] >> (8 - depth - (bit & 7)) & ((1 << depth) - 1);
        assert.ok(index * 3 + 2 < palette.length);
        // Preserve stored RGB even at alpha zero, unlike canvas/native surfaces.
        pixels.set([palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2], alpha?.[index] ?? 255], p * 4);
      }
    }
  }
  return { w, h, depth, type, pixels, chunks, raw };
}

function chunk(type, data) {
  const result = new Uint8Array(data.length + 12), view = new DataView(result.buffer);
  view.setUint32(0, data.length); result.set(new TextEncoder().encode(type), 4); result.set(data, 8);
  view.setUint32(data.length + 8, crc32(result.subarray(4, data.length + 8))); return result;
}
// Independent Map-based candidate used only for compressed-size counterexamples.
// Production deliberately uses a fixed lookup and no per-pixel index array.
export function pairedReference(image) {
  const colors = [], opacity = [], mapped = [], seen = new Map();
  for (let p = 0; p < image.indices.length; p++) {
    const index = image.indices[p], rgb = index === 256 ? 0 : parseInt(image.colors[index].slice(1), 16), alpha = image.alpha[p];
    const key = rgb * 256 + alpha;
    if (!seen.has(key)) { seen.set(key, colors.length); colors.push(rgb); opacity.push(alpha); }
    mapped.push(seen.get(key));
  }
  assert.ok(colors.length <= 256);
  const depth = colors.length <= 2 ? 1 : colors.length <= 4 ? 2 : colors.length <= 16 ? 4 : 8;
  const head = new Uint8Array(13), view = new DataView(head.buffer);
  view.setUint32(0, image.w); view.setUint32(4, image.h); head.set([depth, 3, 0, 0, 0], 8);
  const stride = Math.ceil(image.w * depth / 8) + 1, rows = new Uint8Array(stride * image.h);
  for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
    const bit = x * depth; rows[y * stride + 1 + (bit >> 3)] |= mapped[y * image.w + x] << (8 - depth - (bit & 7));
  }
  while (opacity.at(-1) === 255) opacity.pop();
  const plte = Uint8Array.from(colors.flatMap(rgb => [rgb >> 16, rgb >> 8 & 255, rgb & 255]));
  const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', head), chunk('sRGB', Uint8Array.of(0)), chunk('PLTE', plte)];
  if (opacity.length) parts.push(chunk('tRNS', Uint8Array.from(opacity)));
  parts.push(chunk('IDAT', zlibSync(rows, { level: 3 })), chunk('IEND', new Uint8Array(0)));
  const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0)); let at = 0;
  for (const part of parts) { bytes.set(part, at); at += part.length; } return bytes;
}
export function taggedLegacyReference(image) {
  const { w, h, first, second, mask } = image;
  const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const a = rgb(first ?? second), b = rgb(second ?? first), colors = [...(first && second ? [0, 0, 0] : a), ...a, ...b];
  const transparency = first ? second ? [0] : [0, 255, 0] : [0, 0];
  const head = new Uint8Array(13), view = new DataView(head.buffer);
  view.setUint32(0, w); view.setUint32(4, h); head.set([2, 3, 0, 0, 0], 8);
  const stride = Math.ceil(w / 4) + 1, rows = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows[y * stride + 1 + (x >> 2)] |= mask[y * w + x] << (6 - (x & 3) * 2);
  const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', head), chunk('sRGB', Uint8Array.of(0)),
    chunk('PLTE', Uint8Array.from(colors)), chunk('tRNS', Uint8Array.from(transparency)), chunk('IDAT', zlibSync(rows, { level: 3 })), chunk('IEND', new Uint8Array(0))];
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let at = 0;
  for (const part of parts) { result.set(part, at); at += part.length; } return result;
}
