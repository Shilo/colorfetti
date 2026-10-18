import { zipSync, zlibSync, zlib } from 'fflate';
import { hexToRgb } from './recolor.js';
import { exportPalette, markUsed, markUsedAsync, compactTable, EMPTY_INDEX, yieldExport } from './palette-export.js';
import { checkCanceled } from './quantize.js';
import { paletteAlpha, inspectAlphaPixel } from './palette-alpha.js';
import { createAlphaStates, addAlphaStates, alphaTableLength, minimumAlphaPngBytes, MINIMUM_ALPHA_PNG_BYTES } from './png-alpha-states.js';

// Portable single-component names, shared by Save, ZIP and drag. Keep source
// display names separate. Reserve the actual suffix/ordinal before truncating
// at whole code points: 255 UTF-8 bytes also fits Windows' UTF-16 component cap.
const MAX_NAME_BYTES = 255;
const forbiddenName = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\uD800-\uDFFF\p{Bidi_Control}]/gu;
const deviceName = /^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]) *(\.|$)/iu;
const nameKey = name => name.normalize('NFC').toUpperCase();
function namePrefix(name, budget) {
  let prefix = '', bytes = 0;
  for (const point of name) {
    const code = point.codePointAt(0), size = code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
    if (bytes + size > budget) break;
    bytes += size; prefix += point;
  }
  return prefix.replace(/[ .]+$/g, '');
}
function portableName(base, ext, ordinal) {
  const tail = `${ordinal === 1 ? '' : '-' + ordinal}-colorfetti.${ext}`;
  let prefix = namePrefix(base, MAX_NAME_BYTES - tail.length) || 'image';
  // CON-colorfetti.png is valid; CON.note-colorfetti.png still targets a DOS
  // device. Check the final first-dot stem, not merely the original basename.
  if (deviceName.test(prefix + tail)) prefix = namePrefix('image-' + base, MAX_NAME_BYTES - tail.length);
  return prefix + tail;
}

// The extension follows encoded output, independent of the source extension.
// Sanitize before resolving case-insensitive and truncation-created collisions.
export function outNames(names, kinds = []) {
  const taken = new Set(), next = new Map();
  return names.map((name, n) => {
    const ext = kinds[n] === 'gif' ? 'gif' : 'png';
    const base = String(name ?? '').normalize('NFC').replace(/\.[^./\\]+$/, '')
      .replace(forbiddenName, '-').trim().replace(/[ .]+$/g, '') || 'image';
    const group = nameKey(portableName(base, ext, 1));
    let ordinal = next.get(group) ?? 1, out = portableName(base, ext, ordinal);
    while (taken.has(nameKey(out))) out = portableName(base, ext, ++ordinal);
    next.set(group, ordinal + 1); taken.add(nameKey(out));
    return out;
  });
}

// PNGs are already compressed, so entries are stored as they are.
export function zipBytes(names, files) {
  return zipSync(Object.fromEntries(names.map((name, i) => [name, files[i]])), { level: 0 });
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n;
});
function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set([...type].map(ch => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function chunkAsync(type, data, signal) {
  checkCanceled(signal);
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set([...type].map(ch => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  let crc = ~0;
  const end = 8 + data.length, batch = 262144;
  for (let start = 4; start < end; start += batch) {
    checkCanceled(signal);
    for (let at = start, stop = Math.min(end, start + batch); at < stop; at++) crc = CRC_TABLE[(crc ^ out[at]) & 255] ^ (crc >>> 8);
    if (start + batch < end) await yieldExport();
  }
  view.setUint32(end, ~crc >>> 0);
  return out;
}

// Legacy masks keep their exact role RGBA, including RGB underneath None/empty
// pixels. Both encodings declare sRGB; only a strictly smaller compact 1-bit
// encoding replaces the tagged 2-bit reference. Double encoding is limited to
// small sprites; larger synchronous exports pack/compress their baseline once.
const LEGACY_COMPACTION_PIXELS = 262144;
export function pngBytes(image) {
  if (image.colors) return palettePngBytes(image);
  const { mask, w, h, first, second } = image;
  if (!Number.isInteger(w) || w < 1 || !Number.isInteger(h) || h < 1
    || !Number.isSafeInteger(w * h) || !(mask instanceof Uint8Array) || mask.length !== w * h)
    throw new Error('Invalid 1-bit image pixels.');
  if (!first && !second) throw new Error('A 1-bit image needs at least one ink.');
  const firstRgb = hexToRgb(first ?? second), secondRgb = hexToRgb(second ?? first);
  const colors = [first && second ? [0, 0, 0] : firstRgb, firstRgb, secondRgb];
  const alpha = first ? (second ? [0, 255, 255] : [0, 255, 0]) : [0, 0, 255];
  const trns = first ? (second ? [0] : [0, 255, 0]) : [0, 0];
  const roles = mask.length <= LEGACY_COMPACTION_PIXELS ? { used: 0 } : null;
  const baseline = encodeLegacyPng(image, colors, trns, 2, null, roles);
  if (!roles) return baseline;
  const used = roles.used;
  const compact = [], opacity = [], map = new Uint8Array(3), states = new Map();
  for (let role = 0; role < 3; role++) if (used & 1 << role) {
    const rgb = colors[role], key = ((rgb[0] * 65536 + rgb[1] * 256 + rgb[2]) * 256) + alpha[role];
    if (!states.has(key)) { states.set(key, compact.length); compact.push(rgb); opacity.push(alpha[role]); }
    map[role] = states.get(key);
  }
  if (compact.length > 2) return baseline;
  while (opacity.at(-1) === 255) opacity.pop();
  const candidate = encodeLegacyPng(image, compact, opacity, 1, map);
  return candidate.length < baseline.length ? candidate : baseline;
}

function encodeLegacyPng(image, colors, alpha, depth, map, roles = null) {
  const { mask, w, h } = image;
  const head = new Uint8Array(13);
  new DataView(head.buffer).setUint32(0, w);
  new DataView(head.buffer).setUint32(4, h);
  head.set([depth, 3, 0, 0, 0], 8);
  const stride = Math.ceil(w * depth / 8) + 1, rows = new Uint8Array(stride * h);
  if (map) {
    for (let y = 0, p = 0; y < h; y++) for (let x = 0, at = y * stride + 1; x < w; x++, p++)
      rows[at + (x >> 3)] |= map[mask[p]] << (7 - (x & 7));
  } else if (roles) {
    let used = 0;
    for (let y = 0, p = 0; y < h; y++) for (let x = 0, at = y * stride + 1; x < w; x++, p++) {
      const role = mask[p]; if (role > 2) throw new Error('Invalid 1-bit mask role.');
      used |= 1 << role; rows[at + (x >> 2)] |= role << (6 - 2 * (x & 3));
    }
    roles.used = used;
  } else {
    for (let y = 0, p = 0; y < h; y++) for (let x = 0, at = y * stride + 1; x < w; x++, p++) {
      const role = mask[p]; if (role > 2) throw new Error('Invalid 1-bit mask role.');
      rows[at + (x >> 2)] |= role << (6 - 2 * (x & 3));
    }
  }
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', head),
    chunk('sRGB', Uint8Array.of(0)),
    chunk('PLTE', Uint8Array.from(colors.flat())),
  ];
  if (alpha.length) parts.push(chunk('tRNS', Uint8Array.from(alpha)));
  return assemblePng([...parts, chunk('IDAT', zlibSync(rows, { level: 3 })), chunk('IEND', new Uint8Array(0))]);
}

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

function assemblePng(parts) {
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function palettePngLayout(image, state, partialAlpha, alphaStates = null) {
  const compact = alphaStates ? null : compactTable(state);
  const table = alphaStates ? Array.from(alphaStates.table.subarray(0, alphaStates.count)) : compact.table;
  const map = alphaStates ? alphaStates.map : compact.map;
  const rgba = table.length > 256 || partialAlpha && !alphaStates;
  const depth = rgba ? 8 : table.length <= 2 ? 1 : table.length <= 4 ? 2 : table.length <= 16 ? 4 : 8;
  const stride = (rgba ? image.w * 4 : Math.ceil(image.w * depth / 8)) + 1;
  const head = new Uint8Array(13), view = new DataView(head.buffer);
  view.setUint32(0, image.w); view.setUint32(4, image.h);
  head.set([depth, rgba ? 6 : 3, 0, 0, 0], 8);
  const parts = [PNG_SIGNATURE, chunk('IHDR', head), chunk('sRGB', Uint8Array.of(0))];
  if (!rgba) {
    const plte = new Uint8Array(table.length * 3);
    for (let i = 0; i < table.length; i++) {
      plte[i * 3] = table[i] >> 16; plte[i * 3 + 1] = table[i] >> 8; plte[i * 3 + 2] = table[i];
    }
    parts.push(chunk('PLTE', plte));
    if (alphaStates) {
      const length = alphaTableLength(alphaStates);
      if (length) parts.push(chunk('tRNS', alphaStates.alpha.slice(0, length)));
    } else if (compact.transparent !== null) parts.push(chunk('tRNS', Uint8Array.of(0)));
  }
  return { ...state, map, rgba, paired: !!alphaStates, depth, stride, parts, rows: new Uint8Array(stride * image.h) };
}

function packPalettePixels(image, layout, start, end) {
  const { w, indices, alpha } = image;
  const { rgba, paired, rgb, map, depth, stride, rows } = layout;
  let x = start % w, offset = Math.floor(start / w) * stride + 1;
  for (let p = start; p < end; p++) {
    const index = indices[p];
    if (rgba) {
      if (index !== EMPTY_INDEX) {
        const at = offset + x * 4;
        const color = rgb[index];
        rows[at] = color >> 16; rows[at + 1] = color >> 8; rows[at + 2] = color; rows[at + 3] = alpha ? alpha[p] : 255;
      }
    } else {
      const bit = x * depth, slot = paired ? map[index === EMPTY_INDEX ? 65536 : index * 256 + alpha[p]] : map[index] + 1;
      if (!slot) throw new Error('The image changed while it was being exported.');
      rows[offset + (bit >> 3)] |= (slot - 1) << (8 - depth - (bit & 7));
    }
    if (++x === w) { x = 0; offset += stride; }
  }
}

// Only used colors take a table slot. 256 opaque colors plus empty need RGBA;
// those bytes are written directly, with the same exact palette membership.
export function palettePngBytes(image) {
  const state = exportPalette(image); markUsed(image.indices, state);
  const alpha = paletteAlpha(image); let partial = false;
  if (alpha) for (let p = 0; p < alpha.length; p++) if (inspectAlphaPixel(alpha, image.indices, p)) partial = true;
  const baseline = encodePalettePng(image, palettePngLayout(image, state, partial));
  if (!partial || baseline.length <= MINIMUM_ALPHA_PNG_BYTES) return baseline;
  const states = createAlphaStates(state.rgb); addAlphaStates(image.indices, alpha, states, 0, alpha.length);
  if (states.overflow || baseline.length <= minimumAlphaPngBytes(states)) return baseline;
  const candidate = encodePalettePng(image, palettePngLayout(image, state, true, states));
  return candidate.length < baseline.length ? candidate : baseline;
}

function encodePalettePng(image, layout) {
  packPalettePixels(image, layout, 0, image.w * image.h);
  const compressed = zlibSync(layout.rows, { level: 3 });
  layout.rows = null; // no raw baseline rows remain reachable before the next candidate
  return assemblePng([...layout.parts, chunk('IDAT', compressed), chunk('IEND', new Uint8Array(0))]);
}

// New-family jobs pack bounded row batches and compress in fflate's worker.
// Legacy pngBytes remains synchronous. Partial Keep candidates serialize their
// row buffers/compressors; only the encoded baseline survives between passes.
export async function palettePngBytesAsync(image, { signal } = {}) {
  checkCanceled(signal);
  const state = exportPalette(image);
  await markUsedAsync(image.indices, state, { signal });
  const alpha = paletteAlpha(image); let partialAlpha = false;
  if (alpha) for (let start = 0; start < alpha.length; start += 65536) {
    checkCanceled(signal);
    for (let p = start, end = Math.min(start + 65536, alpha.length); p < end; p++) if (inspectAlphaPixel(alpha, image.indices, p)) partialAlpha = true;
    if (start + 65536 < alpha.length) await yieldExport();
  }
  const baseline = await encodePalettePngAsync(image, palettePngLayout(image, state, partialAlpha), signal);
  checkCanceled(signal);
  if (!partialAlpha || baseline.length <= MINIMUM_ALPHA_PNG_BYTES) return baseline;
  const states = createAlphaStates(state.rgb);
  for (let start = 0; start < alpha.length && !states.overflow; start += 65536) {
    checkCanceled(signal);
    addAlphaStates(image.indices, alpha, states, start, Math.min(alpha.length, start + 65536));
    if (start + 65536 < alpha.length && !states.overflow) await yieldExport();
  }
  checkCanceled(signal);
  if (states.overflow || baseline.length <= minimumAlphaPngBytes(states)) return baseline;
  const candidate = await encodePalettePngAsync(image, palettePngLayout(image, state, true, states), signal);
  return candidate.length < baseline.length ? candidate : baseline;
}

async function encodePalettePngAsync(image, layout, signal) {
  for (let start = 0, count = image.w * image.h; start < count; start += 65536) {
    checkCanceled(signal);
    packPalettePixels(image, layout, start, Math.min(count, start + 65536));
    if (start + 65536 < count) await yieldExport();
  }
  checkCanceled(signal);
  const compressed = await new Promise((resolve, reject) => {
    let terminate, settled = false;
    const finish = (error, data) => {
      if (settled) return; settled = true;
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(data);
    };
    const cancel = () => {
      if (settled) return;
      terminate?.(); finish(new DOMException('The export was canceled.', 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      terminate = zlib(layout.rows, { level: 3, consume: true }, (error, data) => {
        if (signal?.aborted) { cancel(); return; }
        finish(error, data);
      });
    } catch (error) { finish(error); }
  });
  layout.rows = null;
  const idat = await chunkAsync('IDAT', compressed, signal);
  checkCanceled(signal);
  return assemblePng([...layout.parts, idat, chunk('IEND', new Uint8Array(0))]);
}

function download(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// A still image here is { name, w, h, first, second, mask }: the original file name, the two
// colors and the image's mask. An animation has { loop, frames: [{ mask, delay }] } in place of mask.
// Full palettes use { family, colors, indices } instead of the pair and mask;
// an animation may expose replayable { frameCount, getFrame(index), loop }.
const kind = image => (image.frames || image.getFrame ? 'gif' : 'png');
// The filename offered to the browser for one image; shared with the toast so its text matches the download.
export const downloadName = image => outNames([image.name], [kind(image)])[0];
// The GIF code is loaded only when an animation is saved, which keeps it out of the first download.
export const fileBytes = async (image, { signal } = {}) => {
  checkCanceled(signal);
  if (kind(image) === 'gif') {
    const gif = await import('./gif.js');
    checkCanceled(signal);
    return image.colors ? gif.encodeGif(image, { signal }) : gif.encodeGifAsync(image, { signal });
  }
  return image.colors ? palettePngBytesAsync(image, { signal }) : pngBytes(image);
};

export async function saveOne(image) {
  download(new Blob([await fileBytes(image)], { type: 'image/' + kind(image) }), downloadName(image));
}

// A still image as a PNG file in memory. Full palettes return a promise of its
// Blob, because row packing/checksums yield and compression runs in a worker.
export const pngBlob = image => image.colors
  ? palettePngBytesAsync(image).then(bytes => new Blob([bytes], { type: 'image/png' }))
  : new Blob([pngBytes(image)], { type: 'image/png' });

// Puts a PNG, as `pngBlob` makes it, on the clipboard. Browsers accept no GIFs there.
// The write starts at once, with nothing awaited first, as Safari only allows it during a click or a key press.
// `png` may be a promise of the PNG, for a caller that needs a moment before making it: the
// clipboard is promised it now and given it when it is ready.
export function copyOne(png) {
  const image = Promise.resolve(png);
  // Own a later encoder rejection even if platform lookup, item construction or
  // write fails before the clipboard consumes it. Keep the original rejecting
  // promise as the item value so conversion failure still fails the real copy.
  image.catch(() => {});
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
}

// One image saves as itself; a zip of one file would only be an extra step to open.
// `image` turns an item into what `fileBytes` takes. It is called for one item at a time, so
// that only one full-size mask is in memory at once however many photos are being saved.
// It may be asynchronous. No download occurs unless every file encoded successfully.
export async function saveAll(items, image) {
  if (items.length === 1) return saveOne(await image(items[0]));
  const kinds = [], names = [], files = [];
  for (const [index, item] of items.entries()) {
    const one = await image(item);
    kinds.push(kind(one));
    names.push(one.name);
    files.push(await fileBytes(one));
    // A batch of synchronous 1-bit stills must give input and rendering a turn
    // between files. Keep final ZIP assembly and download atomic.
    if (index + 1 < items.length) await yieldExport();
  }
  download(new Blob([zipBytes(outNames(names, kinds), files)], { type: 'application/zip' }), 'colorfetti.zip');
}
