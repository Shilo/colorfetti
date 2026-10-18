import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fullPaletteImage } from '../../src/lib/palette-state.js';

// Research evidence only. Run the actual export pipeline, without a browser or
// a counterfactual UI feature. No production source is changed by this probe.
function image(rgb, width = 8, height = 8) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...rgb, 255], i * 4);
  return { width, height, data };
}
const palette = ['#000000', '#ffffff', '#ff0000'];
const item = { name: 'flat-midgray.png', original: image([128, 128, 128]) };
const base = { family: 'full-palette', colors: palette, metric: 'oklab',
  alphaCut: 128, alphaMode: 'cut', cleanup: false, ditherStrength: 100 };
const count = result => result.colors.filter((_, i) => result.used[i]).length;
const observations = [];
for (const dither of ['none', '4x4']) {
  const all = await fullPaletteImage(item, { ...base, maxColors: 0, dither });
  const capped = await fullPaletteImage(item, { ...base, maxColors: 2, dither });
  const samePixels = all.indices.every((index, p) => all.colors[index] === capped.colors[capped.indices[p]]);
  observations.push({ dither, paletteCapacity: palette.length,
    allCount: count(all), cap: 2, cappedCount: count(capped), samePixels,
    allColors: all.colors.filter((_, i) => all.used[i]),
    cappedColors: capped.colors.filter((_, i) => capped.used[i]) });
}
assert.equal(observations[0].allCount, 1);
assert.equal(observations[0].samePixels, true);
assert.equal(observations[1].allCount, 2);
assert.equal(observations[1].cappedCount, 1);
assert.equal(observations[1].samePixels, false);
const report = { purpose: 'Test whether All used count is a safe no-effect slider threshold',
  source: 'Owned opaque 8×8 flat sRGB midgray; three-color black/white/red target',
  observations,
  conclusion: 'No. With 4×4 dithering, All uses two colors, but cap=2 changes pixels and uses one color. The limiter prepares a nearest-based subset before dithering.' };
await writeFile(fileURLToPath(new URL('./result.json', import.meta.url)), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
