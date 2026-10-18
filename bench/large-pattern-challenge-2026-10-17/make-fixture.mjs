import { writeFile } from 'node:fs/promises';
import { sharp } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const width = 769, height = 513, data = Buffer.alloc(width * height * 4);
for (let y = 0, p = 0; y < height; y++) for (let x = 0; x < width; x++, p++) {
  const v = (x * 13 + y * 7) % 201;
  data.set([v, v, v, (x + y) % 2 ? 255 : 0], p * 4);
}
await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(new URL('./ambiguous-alpha-grid.png', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const expected = {
  width, height, style: 'bayer', settings: { matrix: 4, scale: 1, shading: 100, threshold: 254, source: 'luma', alpha: 128 },
  first: '#112233', second: '#aabbcc', exactOutputCount: 1, expectedAutomaticCaption: 'unknown is correct',
  independentProof: 'Only odd x+y pixels are visible. Every odd-parity Bayer4 cut is >= 0.53125. Visible grayscale range is 0..200; threshold254 maps it to 0..100/254 <0.394. Thus every visible full-source pixel selects first ink. The histogram loses alpha/grid phase and must remain ambiguous.'
};
await writeFile(new URL('./ambiguous-alpha-grid.json', import.meta.url), JSON.stringify(expected, null, 2) + '\n');
console.log(JSON.stringify(expected));
