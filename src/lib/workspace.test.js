import { describe, it, expect } from 'vitest';
import { fitImageWall, IMAGE_GAP } from './workspace.js';

const squares = count => Array.from({ length: count }, () => ({ w: 100, h: 100 }));

function checkGeometry(images, width, height, touch) {
  const fit = fitImageWall(images, width, height, touch);
  expect(fit.tiles).toHaveLength(images.length);
  expect(fit.width).toBe(Math.max(1, Math.floor(width)));
  expect(fit.scroll).toBe(fit.height > Math.max(0, Math.floor(height)));
  let previous = null;
  for (const tile of fit.tiles) {
    for (const value of Object.values(tile)) expect(Number.isInteger(value)).toBe(true);
    expect(tile.width).toBeGreaterThanOrEqual(Math.min(fit.width, touch ? 164 : 180));
    expect(tile.height).toBeGreaterThanOrEqual(56);
    expect(tile.x).toBeGreaterThanOrEqual(0);
    expect(tile.y).toBeGreaterThanOrEqual(0);
    expect(tile.x + tile.width).toBeLessThanOrEqual(fit.width);
    expect(tile.y + tile.height + fit.extra).toBeLessThanOrEqual(fit.height);
    if (previous) {
      expect(tile.y).toBeGreaterThanOrEqual(previous.y);
      if (tile.y === previous.y) {
        expect(tile.height).toBe(previous.height);
        expect(tile.x).toBe(previous.x + previous.width + IMAGE_GAP);
      } else {
        expect(tile.y).toBe(previous.y + previous.height + fit.extra + IMAGE_GAP);
      }
    }
    previous = tile;
  }
  for (const y of new Set(fit.tiles.map(tile => tile.y))) {
    const row = fit.tiles.filter(tile => tile.y === y);
    const left = row[0].x;
    const right = fit.width - row.at(-1).x - row.at(-1).width;
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  }
  return fit;
}

describe('readable image-wall layout', () => {
  it('preserves the separate compact mouse and stacked touch caption allowances', () => {
    const images = [{ w: 256, h: 1 }, ...squares(3)];
    const mouse = fitImageWall(images, 1400, 730, false);
    const touch = fitImageWall(images, 1400, 730, true);
    expect(mouse.extra).toBe(35);
    expect(touch.extra).toBe(62);
    expect(mouse.tiles[1].y).toBe(56 + 35 + IMAGE_GAP);
    expect(touch.tiles[1].y).toBe(56 + 62 + IMAGE_GAP);
  });
  it('reserves a complete caption and scrolls instead of squeezing short rows', () => {
    const fit = checkGeometry(squares(6), 616, 100, true);
    expect(fit.scroll).toBe(true);
    expect(fit.extra).toBeGreaterThanOrEqual(44 + 6 + 2 + 8);
  });
  it('fits six phone images without reserving a redundant action row', () => {
    const fit = checkGeometry(squares(6), 358, 642, true);
    expect(fit.stackCaptions).toBe(false);
    expect(fit.scroll).toBe(false);
    expect(fit.tiles.every(tile => tile.height >= 140)).toBe(true);
    expect(new Set(fit.tiles.map(tile => tile.y)).size).toBe(3);
  });
  it('centers an incomplete final square row at the same scale', () => {
    const fit = checkGeometry(squares(3), 400, 420, true);
    expect(fit.scroll).toBe(false);
    expect(fit.tiles[0].y).toBe(fit.tiles[1].y);
    expect(fit.tiles[2].y).toBeGreaterThan(fit.tiles[0].y);
    expect(new Set(fit.tiles.map(tile => tile.height)).size).toBe(1);
  });
  it('balances desktop square rows instead of leaving a large orphan', () => {
    const fit = checkGeometry(squares(6), 1400, 730, false);
    expect(fit.scroll).toBe(false);
    expect(fit.tiles.filter(tile => tile.y === 0)).toHaveLength(3);
    expect(new Set(fit.tiles.map(tile => tile.height)).size).toBe(1);
    expect(fit.tiles[0].height).toBeGreaterThanOrEqual(290);
  });
  it('uses a compact full-width frame for the supplied 256:1 strip', () => {
    for (const width of [320, 390, 820, 1406]) {
      const fit = checkGeometry([{ w: 256, h: 1 }], width, 700, width < 900);
      expect(fit.tiles[0]).toMatchObject({ x: 0, width, height: 56 });
      expect(fit.height).toBe(56 + fit.extra);
      expect(fit.scroll).toBe(false);
    }
  });
  it('keeps ultra-wide strips compact at the beginning, middle and end of mixed walls', () => {
    const normal = [1, 4 / 3, 3 / 4, 16 / 9, 9 / 16, 3].map(w => ({ w, h: 1 }));
    for (const index of [0, 2, 3, 6]) {
      const images = [...normal.slice(0, index), { w: 256, h: 1 }, ...normal.slice(index)];
      const fit = checkGeometry(images, 1400, 730, false);
      expect(fit.scroll).toBe(false);
      expect(fit.tiles[index]).toMatchObject({ x: 0, width: 1400, height: 56 });
      expect(fit.tiles.filter(tile => tile.y === fit.tiles[index].y)).toHaveLength(1);
      // A strip's deliberately shallow height must not shrink normal neighbors.
      expect(fit.tiles.filter((_, i) => i !== index).every(tile => tile.height >= 140)).toBe(true);
    }
  });
  it('preserves compact ordered rows for consecutive and all-strip collections', () => {
    for (const touch of [false, true]) {
      for (const width of [358, 1400]) {
        const ratios = [256, 128, 32, 16];
        const fit = checkGeometry(ratios.map(w => ({ w, h: 1 })), width, 730, touch);
        expect(fit.scroll).toBe(false);
        expect(fit.tiles.every(tile => tile.x === 0 && tile.width === width)).toBe(true);
        expect(fit.tiles.map(tile => tile.height)).toEqual(ratios.map(ratio => Math.max(56, Math.floor(width / ratio))));
        expect(fit.height).toBe(fit.tiles.reduce((sum, tile) => sum + tile.height + fit.extra, 0) + 3 * IMAGE_GAP);
      }
    }
    const mixed = checkGeometry([1, 256, 128, 1].map(w => ({ w, h: 1 })), 1400, 730, false);
    expect(mixed.tiles[1]).toMatchObject({ width: 1400, height: 56 });
    expect(mixed.tiles[2]).toMatchObject({ width: 1400, height: 56 });
    expect(mixed.scroll).toBe(false);
  });
  it('keeps ordinary 8:1 panoramas in normal rows to avoid unnecessary scroll', () => {
    const fit = checkGeometry([8, 1, 4 / 3].map(w => ({ w, h: 1 })), 1400, 730, false);
    expect(fit.tiles[0].width).toBeLessThan(1400);
    const mixed = checkGeometry([256, 1, 4 / 3, 8, 3 / 4, 16 / 9, 9 / 16, 3].map(w => ({ w, h: 1 })), 1400, 730, false);
    expect(mixed.scroll).toBe(false);
    expect(new Set(mixed.tiles.map(tile => tile.y)).size).toBe(3);
    expect(mixed.tiles[3].y).toBe(mixed.tiles[1].y);
    expect(mixed.tiles[3].width).toBeLessThan(1400);
  });
  it('fits portraits vertically while keeping filenames readable', () => {
    for (const image of [{ w: 1, h: 256 }, { w: 600, h: 1200 }, { w: 800, h: 1200 }]) {
      const fit = checkGeometry([image], 390, 700, true);
      expect(fit.tiles[0].height).toBe(Math.floor(Math.min(638, 390 * image.h / image.w)));
      expect(fit.scroll).toBe(false);
    }
  });
  it('keeps medium collections readable by scrolling instead of making postage stamps', () => {
    for (const touch of [false, true]) {
      const fit = checkGeometry(squares(40), touch ? 390 : 1440, 700, touch);
      expect(fit.scroll).toBe(true);
      expect(fit.tiles.every(tile => tile.height >= 180)).toBe(true);
    }
  });
  it('preserves import order through mixed portrait, landscape and extreme shapes', () => {
    const images = [{ w: 100, h: 200 }, { w: 400, h: 100 }, { w: 100, h: 100 }, { w: 100, h: 200 }];
    const fit = checkGeometry(images, 1400, 700, false);
    expect(fit.tiles[1].width).toBeGreaterThan(fit.tiles[0].width);
    expect(fit.tiles[2].width).toBeGreaterThanOrEqual(fit.tiles[3].width);
  });
  it('returns no phantom row for an empty wall', () => {
    expect(fitImageWall([], 390, 700, true)).toEqual({ tiles: [], width: 390, height: 0, scroll: false, stackCaptions: false, extra: 62 });
  });
  it('is deterministic and does not mutate source dimensions', () => {
    const images = Object.freeze([Object.freeze({ w: 200, h: 100 }), Object.freeze({ w: 100, h: 300 })]);
    expect(fitImageWall(images, 800, 600)).toEqual(fitImageWall(images, 800, 600));
  });
  it('handles invalid and transitional viewport sizes without nonfinite geometry', () => {
    for (const size of [0, -1, NaN, Infinity]) {
      const fit = fitImageWall([{ w: 0, h: 0 }, { w: NaN, h: Infinity }], size, size);
      expect(fit.width).toBe(1);
      expect(fit.tiles.every(tile => Object.values(tile).every(Number.isFinite))).toBe(true);
      expect(fit.tiles.every(tile => tile.x === 0 && tile.width === 1)).toBe(true);
    }
  });
  it('maintains nonoverlapping pixel geometry across the ratio and viewport matrix', () => {
    const ratios = [[1, 1], [4, 3], [3, 4], [16, 9], [9, 16], [2, 1], [1, 2], [4, 1], [1, 4], [256, 1], [1, 256]];
    const viewports = [[1, 1], [96, 40], [280, 520], [320, 568], [358, 642], [390, 700], [616, 100], [820, 200], [1024, 768], [1400, 730], [1920, 1000]];
    for (const touch of [false, true]) {
      for (const [width, height] of viewports) {
        for (let length = 1; length <= 18; length++) {
          const images = Array.from({ length }, (_, i) => {
            const [w, h] = ratios[(i * 7 + length) % ratios.length];
            return { w, h };
          });
          checkGeometry(images, width, height, touch);
        }
        for (const [w, h] of ratios) checkGeometry(Array.from({ length: 8 }, () => ({ w, h })), width, height, touch);
      }
    }
  });
  it('handles every ordered triple of the key aspect ratios on phone and desktop', () => {
    const ratios = [1 / 256, .5, 1, 16 / 9, 4, 256];
    for (const a of ratios) for (const b of ratios) for (const c of ratios) {
      const images = [a, b, c].map(w => ({ w, h: 1 }));
      checkGeometry(images, 358, 642, true);
      checkGeometry(images, 1400, 730, false);
    }
  });
  it('lays out a large collection without a quadratic candidate search', () => {
    const fit = fitImageWall(Array.from({ length: 5000 }, (_, i) => ({ w: i % 3 ? 100 : 400, h: 100 })), 1400, 730);
    expect(fit.tiles).toHaveLength(5000);
    expect(fit.scroll).toBe(true);
    expect(fit.tiles.at(-1).y).toBeGreaterThan(100000);
  });
});
