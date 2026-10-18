// H-B4 / H-B7 probes (frozen HEAD gif.js, save.js, quantize.js; Node has no global Worker, so
// encodePaletteGif uses its existing in-thread writer, which is the no-Worker production path).
// H-B7: encodePaletteGif converts every frame twice (used-table pass, then encode pass).
//       Compare HEAD replayable getFrame with a probe getFrame that memoizes pass-one results.
// H-B4: fflate's async zlib runs zlibSync in a fresh worker per call; confirm bytes match.
import path from 'node:path';
import { zlibSync, zlib } from 'fflate';
import { load, index } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const mod = p => import('file:///' + path.join(repo, '.tmp/source-review-B/frozen', p).replace(/\\/g, '/'));
const { encodePaletteGif } = await mod('gif.js');
const { quantizeAsync, preparePalette } = await mod('quantize.js');
const { FULL_PRESETS } = await mod('palette-library.js');
const median = a => +[...a].sort((x, y) => x - y)[a.length >> 1].toFixed(2);
const clip = name => index.filter(e => e.gif === name).sort((a, b) => +a.file.split('.').pop() - +b.file.split('.').pop()).map(e => load(e.file));
const report = { gif: {}, zlib: {} };
for (const name of ['kenney-motion-128.gif', 'kenney-motion-256.gif', 'real-magic.gif']) for (const dither of ['none', '4x4']) {
  const frames = clip(name), palette = preparePalette(FULL_PRESETS[1].colors), w = frames[0].width, h = frames[0].height;
  let conversions = 0, quantMs = 0;
  const convert = async i => { conversions++; const s = performance.now(); const r = await quantizeAsync(frames[i], palette, 128, undefined, undefined, { dither }); quantMs += performance.now() - s; return { ...r, delay: 100 }; };
  const image = getFrame => ({ colors: palette.colors, w, h, loop: 0, frameCount: frames.length, getFrame });
  const head = [], memo = [], quant = []; let bytesA, bytesB, headConversions, memoConversions;
  for (let run = 0; run < 5; run++) {
    conversions = 0; quantMs = 0; let s = performance.now(); bytesA = await encodePaletteGif(image(convert)); head.push(performance.now() - s); headConversions = conversions; quant.push(quantMs);
    const kept = new Map(); conversions = 0;
    s = performance.now(); bytesB = await encodePaletteGif(image(async i => kept.get(i) ?? (kept.set(i, await convert(i)), kept.get(i)))); memo.push(performance.now() - s); memoConversions = conversions;
  }
  if (bytesA.length !== bytesB.length || !bytesA.every((v, i) => v === bytesB[i])) throw new Error('gif bytes differ ' + name);
  report.gif[`${name} ${dither}`] = { frames: frames.length, size: `${w}x${h}`, identicalBytes: true, headConversions, retainedConversions: memoConversions,
    retainedIndexBytes: frames.length * w * h * 2, headMs: median(head), retainedMs: median(memo), headQuantizeMs: median(quant) };
}
// zlib: byte identity of async (worker) and sync for representative packed rows.
for (const [label, size] of [['tiny 32x32 4-bit', 33 * 32 / 2], ['sprite 256x256 8-bit', 257 * 256], ['sheet 2048 4-bit', 1025 * 2048]]) {
  const rows = new Uint8Array(size); let s = 9; for (let i = 0; i < size; i++) rows[i] = (s = (s * 1103515245 + 12345) >>> 0) % 7 < 5 ? 0 : s & 255;
  const sync = zlibSync(rows, { level: 3 });
  const t0 = performance.now();
  const asyncBytes = await new Promise((resolve, reject) => zlib(rows.slice(), { level: 3, consume: true }, (e, d) => e ? reject(e) : resolve(d)));
  const asyncMs = performance.now() - t0, t1 = performance.now(); zlibSync(rows, { level: 3 }); const syncMs = performance.now() - t1;
  report.zlib[label] = { identical: sync.length === asyncBytes.length && sync.every((v, i) => v === asyncBytes[i]), syncMs: +syncMs.toFixed(2), asyncWorkerRoundTripMs: +asyncMs.toFixed(2) };
}
console.log(JSON.stringify(report, null, 1));
process.exit(0);
