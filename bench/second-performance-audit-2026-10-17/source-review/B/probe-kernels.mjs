// Source reviewer B kernel probes. Frozen HEAD modules (.tmp/source-review-B/frozen) versus
// probe-local variants; every variant is checked byte-for-byte before it is timed.
// Run: node bench/second-performance-audit-2026-10-17/source-review/B/probe-kernels.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { load } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const frozen = p => import('file:///' + path.join(repo, '.tmp/source-review-B/frozen', p).replace(/\\/g, '/'));
const sharp = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const decodePng = async file => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length).slice() };
};
globalThis.MessageChannel ??= undefined;
const { quantize, preparePalette, colorize } = await frozen('quantize.js');
const { FULL_PRESETS } = await frozen('palette-library.js');
const fixtures = {
  sheet1024: load('kenney-sheet-1024.png'), sheet2048: load('kenney-sheet-2048.png'),
  motion256f0: load('kenney-motion-256.gif.0'),
  entropy512: await decodePng(path.join(repo, 'bench/second-performance-audit-2026-10-17/android/fixtures/entropy512.png')),
  glow64: await decodePng(path.join(repo, 'bench/second-performance-audit-2026-10-17/android/fixtures/partial-glow64.png')),
};
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1];
function time(fn, runs = 7) { fn(); const t = []; for (let i = 0; i < runs; i++) { const s = performance.now(); fn(); t.push(performance.now() - s); } return +median(t).toFixed(3); }
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const out = {};

// P1 scanSummary: HEAD Map loop vs u32 word read + identical-word run skip.
function scanHead(data) {
  const colors = new Map();
  for (let p = 0; p < data.length; p += 4) {
    const alpha = data[p + 3]; if (!alpha) continue;
    const rgb = data[p] << 16 | data[p + 1] << 8 | data[p + 2], previous = colors.get(rgb);
    if (previous === undefined) { if (colors.size === 4096) return null; colors.set(rgb, alpha); } else if (alpha > previous) colors.set(rgb, alpha);
  }
  return colors;
}
function scanRun(data) {
  const colors = new Map(), words = new Uint32Array(data.buffer, data.byteOffset, data.length >> 2);
  let last = -1;
  for (let i = 0; i < words.length; i++) {
    const v = words[i];
    if (v === last) continue; // identical RGBA word: Map state already includes it
    last = v;
    const alpha = v >>> 24; if (!alpha) continue;
    const rgb = (v & 255) << 16 | (v >>> 8 & 255) << 8 | (v >>> 16 & 255), previous = colors.get(rgb);
    if (previous === undefined) { if (colors.size === 4096) return null; colors.set(rgb, alpha); } else if (alpha > previous) colors.set(rgb, alpha);
  }
  return colors;
}
out.scanSummary = {};
for (const [name, img] of Object.entries(fixtures)) {
  const a = scanHead(img.data), b = scanRun(img.data);
  const same = a === null ? b === null : b !== null && eq([...a.entries()].flat(), [...b.entries()].flat());
  if (!same) throw new Error('scan mismatch ' + name);
  out.scanSummary[name] = { exact: same, colors: a?.size ?? '>4096', headMs: time(() => scanHead(img.data)), runSkipMs: time(() => scanRun(img.data)) };
}

// P2 BGRA swap: HEAD byte swap vs one 32-bit word swap (little-endian guard in production).
function swapHead(p) { for (let i = 0; i < p.length; i += 4) { const r = p[i]; p[i] = p[i + 2]; p[i + 2] = r; } }
function swapWord(p) { const w = new Uint32Array(p.buffer, p.byteOffset, p.length >> 2); for (let i = 0; i < w.length; i++) { const v = w[i]; w[i] = v & 0xff00ff00 | (v & 255) << 16 | v >>> 16 & 255; } }
{
  const src = fixtures.sheet2048.data, a = src.slice(), b = src.slice(); swapHead(a); swapWord(b);
  if (!eq(a, b)) throw new Error('swap mismatch');
  const s1 = src.slice(), s2 = src.slice();
  out.swapRedBlue2048 = { exact: true, headMs: time(() => swapHead(s1)), wordMs: time(() => swapWord(s2)) };
}

// P3 quantize.colorize: HEAD four byte stores vs one Uint32 table word per pixel.
function colorizeWord(result, prepared) {
  const words = new Uint32Array(257), bytes = new Uint8Array(words.buffer);
  for (let i = 0; i < prepared.size; i++) { const c = parseInt(prepared.colors[i].slice(1), 16); bytes.set([c >>> 16, c >>> 8 & 255, c & 255, 255], i * 4); }
  const out32 = new Uint32Array(result.w * result.h), { indices } = result, alpha = result.alpha;
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (index === 256) continue;
    if (index >= prepared.size) throw new Error('The result does not match this palette.');
    out32[i] = alpha ? (words[index] & 0x00ffffff | alpha[i] << 24) >>> 0 : words[index];
  }
  return new Uint8ClampedArray(out32.buffer);
}
out.colorize = {};
for (const [name, mode] of [['sheet2048', 'cut'], ['sheet2048', 'keep'], ['entropy512', 'cut']]) {
  const palette = preparePalette(FULL_PRESETS[0].colors), r = quantize(fixtures[name], palette, 128, undefined, undefined, { alphaMode: mode });
  if (!eq(colorize(r, palette).data, colorizeWord(r, palette))) throw new Error('colorize mismatch');
  out.colorize[name + '-' + mode] = { exact: true, headMs: time(() => colorize(r, palette)), wordMs: time(() => colorizeWord(r, palette)) };
}
console.log(JSON.stringify(out, null, 1));
