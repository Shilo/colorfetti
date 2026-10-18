// Recreates .tmp/source-review-B/{frozen,variant,clean,pooled} used by the B probes.
// frozen = HEAD Git objects; variant/clean = H-B2 dither prune (counting / timed);
// pooled = H-B6 glyph scratch reuse. Run from the repo root.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const root = '.tmp/source-review-B';
const files = ['quantize', 'palette-dither', 'palette-dither-settings', 'palette-alpha', 'palette-library', 'storage-migration', 'palette-lospec-url',
  'source-color-summary', 'image-decode', 'recolor', 'icon', 'icon-glyph', 'palette-limit', 'palette-generated', 'palette-generated-sources',
  'save', 'palette-export', 'gif', 'palette-state', 'palette-limit-client'];
for (const dir of ['frozen', 'variant', 'clean', 'pooled']) {
  mkdirSync(`${root}/${dir}`, { recursive: true });
  for (const f of files) writeFileSync(`${root}/${dir}/${f}.js`, execSync(`git show HEAD:src/lib/${f}.js`));
}
const patch = (file, from, to) => { const s = readFileSync(file, 'utf8'); if (!s.includes(from)) throw new Error('anchor missing in ' + file); writeFileSync(file, s.replace(from, to)); };
const ditherFrom = `      const t = weight / cells;
      lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, mixed, 0);
      const error = (tl - mixed[0]) ** 2 + (ta - mixed[1]) ** 2 + (tblue - mixed[2]) ** 2
        + penalty * (pointErrors[a] * (1 - t) + pointErrors[b] * t);`;
const ditherTo = count => `      const t = weight / cells;
      // Exact skip: the mixture term is a nonnegative sum, so error >= pen >= best.
      const pen = penalty * (pointErrors[a] * (1 - t) + pointErrors[b] * t);
      if (pen >= best) ${count ? '{ globalThis.__pruned = (globalThis.__pruned || 0) + 1; continue; }' : 'continue;'}${count ? '\n      globalThis.__labs = (globalThis.__labs || 0) + 1;' : ''}
      lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, mixed, 0);
      const error = (tl - mixed[0]) ** 2 + (ta - mixed[1]) ** 2 + (tblue - mixed[2]) ** 2
        + pen;`;
patch(`${root}/variant/palette-dither.js`, ditherFrom, ditherTo(true));
patch(`${root}/clean/palette-dither.js`, ditherFrom, ditherTo(false));
const g = `${root}/pooled/icon-glyph.js`;
patch(g, `  const source = new Uint8Array(size), lum = new Uint8Array(size), rim = new Uint8Array(size), free = new Uint8Array(size);
  const kind = new Uint8Array(size), onset = new Uint8Array(size).fill(255), ink = new Uint8Array(size);
  const seen = new Uint8Array(size), queue = new Int32Array(size), before = new Uint8Array(size), trial = new Uint8Array(size), keptInk = new Uint8Array(size);
  const rowMin = new Int16Array(h).fill(w), rowMax = new Int16Array(h).fill(-1), colMin = new Int16Array(w).fill(h), colMax = new Int16Array(w).fill(-1);
  const all = new Uint32Array(256), inner = new Uint32Array(256);`,
`  const u8 = k => P8.subarray(k * 4356, k * 4356 + size).fill(0);
  const source = u8(0), lum = u8(1), rim = u8(2), free = u8(3);
  const kind = u8(4), onset = u8(5).fill(255), ink = u8(6);
  const seen = u8(7), queue = PQ.subarray(0, size).fill(0), before = u8(8), trial = u8(9), keptInk = u8(10);
  const rowMin = P16.subarray(0, h).fill(w), rowMax = P16.subarray(66, 66 + h).fill(-1), colMin = P16.subarray(132, 132 + w).fill(h), colMax = P16.subarray(198, 198 + w).fill(-1);
  const all = PH.subarray(0, 256).fill(0), inner = PH.subarray(256, 512).fill(0);`);
patch(g, `  const paths = new Int32Array(128 * 64), lengths = new Uint8Array(128), active = new Uint8Array(256);`, `  const paths = PP.fill(0), lengths = PL.fill(0), active = PA.fill(0);`);
patch(g, `export function glyphComponent(`, `const P8 = new Uint8Array(4356 * 11), PQ = new Int32Array(4356), P16 = new Int16Array(264), PH = new Uint32Array(512), PP = new Int32Array(128 * 64), PL = new Uint8Array(128), PA = new Uint8Array(256);
export function glyphComponent(`);
console.log('variants written under', root);
