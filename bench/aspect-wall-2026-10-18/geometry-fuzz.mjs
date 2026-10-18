import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { fitImageWall, IMAGE_GAP } from '../../src/lib/workspace.js';

// Reproduce with: node bench/aspect-wall-2026-10-18/geometry-fuzz.mjs
const INITIAL_SEED = 237953;
const CASE_COUNT = 10_000;
let seed = INITIAL_SEED;
const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let imageCount = 0, stripCount = 0, scrollingCases = 0, touchCases = 0;
const started = performance.now();

for (let caseIndex = 0; caseIndex < CASE_COUNT; caseIndex++) {
  const width = 1 + Math.floor(random() * 3000);
  const height = Math.floor(random() * 1600);
  const count = 1 + Math.floor(random() * 60);
  const touch = random() < .5;
  const images = Array.from({ length: count }, () => ({ w: 2 ** (-8 + random() * 16), h: 1 }));
  const fit = fitImageWall(images, width, height, touch);
  const context = `case=${caseIndex}, viewport=${width}x${height}, images=${count}, touch=${touch}`;
  assert.equal(fit.tiles.length, count, context);
  assert.equal(fit.width, width, context);
  assert.equal(fit.extra, touch ? 62 : 35, context);
  assert.equal(fit.scroll, fit.height > height, context);
  assert.ok(Number.isInteger(fit.height) && fit.height > 0, context);
  let rowStart = 0;
  for (let index = 0; index < count; index++) {
    const tile = fit.tiles[index];
    const previous = fit.tiles[index - 1];
    const detail = `${context}, image=${index}, ratio=${images[index].w}`;
    assert.ok(Object.values(tile).every(Number.isInteger), detail);
    assert.ok(tile.x >= 0 && tile.y >= 0, detail);
    assert.ok(tile.width >= Math.min(width, touch ? 164 : 180), detail);
    assert.ok(tile.height >= 56, detail);
    if (count === 1 || images[index].w < 12) {
      const ratio = count === 1 ? images[index].w : Math.max(.5, Math.min(4, images[index].w));
      const expectedWidth = Math.max(1, Math.floor(Math.min(width, Math.max(Math.min(width, touch ? 164 : 180), tile.height * ratio))));
      assert.equal(tile.width, expectedWidth, detail);
    }
    assert.ok(tile.x + tile.width <= width, detail);
    assert.ok(tile.y + tile.height + fit.extra <= fit.height, detail);
    if (previous) {
      if (tile.y === previous.y) {
        assert.equal(tile.height, previous.height, detail);
        assert.equal(tile.x, previous.x + previous.width + IMAGE_GAP, detail);
      } else {
        assert.equal(tile.y, previous.y + previous.height + fit.extra + IMAGE_GAP, detail);
        const rightMargin = width - previous.x - previous.width;
        assert.ok(Math.abs(fit.tiles[rowStart].x - rightMargin) <= 1, detail);
        rowStart = index;
      }
    }
    // Breakout is the multi-image wall policy. A singleton separately fits its
    // natural shape to the available viewport height, retaining readable captions.
    if (count > 1 && images[index].w >= 12) {
      assert.equal(tile.x, 0, detail);
      assert.equal(tile.width, width, detail);
      assert.equal(tile.height, Math.max(56, Math.floor(width / images[index].w)), detail);
      if (previous) assert.ok(tile.y > previous.y, detail);
      const next = fit.tiles[index + 1];
      if (next) assert.ok(next.y > tile.y, detail);
      stripCount++;
    }
  }
  const finalTile = fit.tiles.at(-1);
  assert.equal(fit.height, finalTile.y + finalTile.height + fit.extra, context);
  assert.ok(Math.abs(fit.tiles[rowStart].x - (width - finalTile.x - finalTile.width)) <= 1, context);
  imageCount += count;
  scrollingCases += Number(fit.scroll);
  touchCases += Number(touch);
}

const result = {
  status: 'passed',
  seed: INITIAL_SEED,
  cases: CASE_COUNT,
  images: imageCount,
  multiImageStrips: stripCount,
  scrollingCases,
  touchCases,
  desktopCases: CASE_COUNT - touchCases,
  inputs: { width: '1–3000', height: '0–1599', images: '1–60', aspectRatio: '1:256–256:1 (log-uniform)' },
  assertions: [
    'Exact image count and import order',
    'Finite positive integer tile dimensions and nonnegative integer positions',
    'Readable caption width and minimum 56px art height',
    'Horizontal and vertical bounds, including complete captions',
    'Equal art heights in a row, exact 12px row/column gaps, no tile overlap',
    'Each row centered within one rounding pixel',
    'Container height ends at the final caption and scroll matches viewport overflow',
    'Every multi-image source >=12:1 occupies a separate full-width row with max(56,floor(width/ratio)) art height',
  ],
  elapsedMs: Math.round((performance.now() - started) * 100) / 100,
};
const output = new URL('./geometry-fuzz.json', import.meta.url);
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Saved ${fileURLToPath(output)}`);
