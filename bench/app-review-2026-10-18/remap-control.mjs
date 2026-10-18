// A task-level comparison: editing an allowed color set versus keeping assignments.
// This is a research reference only; it does not change the application.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { quantize, colorize } from '../../src/lib/quantize.js';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE ?? 'sharp');
const w = 64, h = 64, data = new Uint8ClampedArray(w * h * 4);
const sourcePalette = ['#b00000', '#d00000'];
const editedPalette = ['#00ff00', '#d00000'];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const dark = x >= 16 && x < 48 && y >= 16 && y < 48;
  data.set([dark ? 176 : 208, 0, 0, 255], (y * w + x) * 4);
}
const source = { width: w, height: h, data };
const before = quantize(source, sourcePalette);
const current = quantize(source, editedPalette);
const frozen = colorize(before, editedPalette);
assert.equal(new Set(before.indices).size, 2);
assert.equal(new Set(current.indices).size, 1);
assert.ok(current.indices.every(value => value === 1));
const results = {
  sourcePalette, editedPalette, sourceColors: 2, currentOutputColors: 1,
  currentOutput: [...new Set(current.indices)].map(i => editedPalette[i]),
  currentEditedGreenPixels: current.indices.filter(i => i === 0).length,
  frozenReferenceGreenPixels: before.indices.filter(i => i === 0).length,
  interpretation: 'Current behavior correctly requantizes against an allowed set. Frozen assignments model a separate explicit remapping workflow, not a superior nearest metric.'
};
writeFileSync(new URL('remap-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
const panels = [data, colorize(current, editedPalette).data, frozen.data];
const images = await Promise.all(panels.map(pixels => sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } }).resize(224, 224, { kernel: 'nearest' }).png().toBuffer()));
const title = Buffer.from('<svg width="792" height="360"><rect width="100%" height="100%" fill="#f7f7f3"/><g font-family="Arial" fill="#182330"><text x="24" y="32" font-size="21" font-weight="bold">Editing a palette does not preserve source assignments</text><g font-size="15"><text x="24" y="61">Source</text><text x="284" y="61">Current target palette edit</text><text x="544" y="61">Frozen mapping reference</text></g><g font-size="13"><text x="24" y="320">Two authored red regions</text><text x="284" y="320">Both regions choose #d00000</text><text x="544" y="320">Only the dark region becomes green</text><text x="24" y="346">Allowed colors after edit: #00ff00 and #d00000. Reference illustrates a separate proposed workflow.</text></g></g></svg>');
await sharp(title).composite(images.map((input, i) => ({ input, left: 24 + i * 260, top: 77 }))).png().toFile(new URL('remap-comparison.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log(JSON.stringify(results));
