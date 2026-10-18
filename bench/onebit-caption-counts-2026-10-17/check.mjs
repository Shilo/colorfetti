import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { analyze, mask } from '../../src/lib/recolor.js';
import { STYLE_SETTINGS, defaults } from '../../src/lib/settings.js';
import { analysisKey } from '../../src/lib/image-reanalysis.js';
import { maskRoles, rememberOneBitMask, collectOneBitUsage } from '../../src/lib/onebit-usage.js';

function source(size, sparse = false, offset = 0) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (sparse && (x % 128 >= 24 || y % 128 >= 24)) continue;
    const v = (x * 13 + y * 7 + offset) % 256;
    data.set([v, v, v, 255], (y * size + x) * 4);
  }
  const original = { width: size, height: size, data }, img = analyze(original);
  return { img, original, by: analysisKey(img.soft), delay: 50 };
}
const sheet = source(2048, true), rows = [];
for (const style of Object.keys(STYLE_SETTINGS)) {
  const set = defaults(style), started = performance.now();
  const value = mask(sheet.img, style, set), masked = performance.now();
  const roles = maskRoles(value), counted = performance.now();
  rememberOneBitMask(sheet.img, style, set, value);
  const cachedStart = performance.now();
  const result = await collectOneBitUsage(sheet, { style, set, first: '#000000', second: '#ffffff' });
  rows.push({ style, maskMs: masked - started, roleScanMs: counted - masked, cachedTotalMs: performance.now() - cachedStart, roles, count: result.count });
}
const frames = Array.from({ length: 32 }, (_, i) => source(256, false, i));
const clip = { ...frames[0], frames }, animation = [];
for (const style of ['solid', 'cutout', 'bayer', 'atkinson', 'stencil']) {
  const set = defaults(style), started = performance.now();
  const result = await collectOneBitUsage(clip, { style, set, first: '#000000', second: '#ffffff' });
  const countMs = performance.now() - started, baseline = performance.now();
  for (const frame of frames) mask(frame.img, style, set);
  animation.push({ style, countMs, allFrameMasksMs: performance.now() - baseline, count: result.count, reportedFrames: result.frames });
}
const result = { note: 'Node host timings, not phone or browser FPS. Cold structural preparation can block within one mask; no loop was changed.', sheetSize: 2048, sheet: rows, animationSize: 256, animationFrames: 32, animation };
writeFileSync(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
